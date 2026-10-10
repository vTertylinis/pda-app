import { AppUpdateService } from './app-update.service';
import { DestroyRef, Injectable, InjectionToken, NgZone, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, Subject, defer, of } from 'rxjs';
import { switchMap, delay, distinctUntilChanged, shareReplay, debounceTime, finalize, map, takeUntil, tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { io, Socket } from 'socket.io-client';

export const TABLET_SOCKET_FACTORY = new InjectionToken<typeof io>('Tablet socket factory', {
  providedIn: 'root', factory: () => io
});

export interface CustomTable {
  id: string;
  name: string;
  createdAt: string;
  active: boolean;
  isCustom: true;
}

export interface OnlineOrder {
  orderId?: string;
  address?: any;
  cart?: any[];
  total?: number;
  timestamp?: string;
  [key: string]: any;
}

@Injectable({
  providedIn: 'root'
})
export class TableService {
  private http = inject(HttpClient);
  private updates = inject(AppUpdateService);
  private destroyRef = inject(DestroyRef);
  private ngZone = inject(NgZone);
  private router = inject(Router);
  private createSocket = inject(TABLET_SOCKET_FACTORY);

  private apiUrl = environment.apiUrl;
  private socket: Socket | null = null;
  private customTablesSubject = new BehaviorSubject<{ [key: string]: CustomTable }>({});
  public customTables$ = this.customTablesSubject.asObservable();

  // emit when carts/active tables change on the server
  private cartUpdatesSubject = new Subject<any>();
  public cartUpdates$ = this.cartUpdatesSubject.asObservable();
  private refreshSubject = new Subject<void>();
  public refreshRequired$ = this.refreshSubject.pipe(debounceTime(100));
  private historyUpdatesSubject = new Subject<string>();
  public historyUpdates$ = this.historyUpdatesSubject.asObservable();

  // Socket connection state. Disconnects are debounced 5s before being shown,
  // so short WiFi blips don't flash the offline banner.
  private connectedSubject = new BehaviorSubject<boolean>(false);
  public connectionChanges$ = this.connectedSubject.asObservable();
  public connected$ = this.connectedSubject.pipe(
    switchMap(connected => connected
      ? of(true)
      : of(false).pipe(delay(5000))
    ),
    distinctUntilChanged(),
    shareReplay(1)
  );

  // Stateful list of online orders, kept alive for the whole app so it
  // survives tab switches. Live arrivals are merged in; responses persist.
  private onlineOrdersSubject = new BehaviorSubject<OnlineOrder[]>([]);
  public onlineOrders$ = this.onlineOrdersSubject.asObservable();
  private onlineOrdersLoaded = false;
  private onlineOrdersRequest?: Observable<OnlineOrder[]>;
  private cancelOnlineSync = new Subject<void>();
  private onlineChanges = new Map<string, Partial<OnlineOrder>>();

  constructor() {
    this.initializeSocket();
    const resume = () => {
      if (document.visibilityState === 'visible') this.ngZone.run(() => this.reconnect());
    };
    document.addEventListener('visibilitychange', resume);
    window.addEventListener('pageshow', resume);
    window.addEventListener('online', resume);
    this.refreshRequired$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.onlineOrdersLoaded = false;
      this.cancelOnlineSync.next();
      this.loadOnlineOrders().subscribe({ error: err => console.error('Failed to sync online orders:', err) });
    });
    this.destroyRef.onDestroy(() => {
      document.removeEventListener('visibilitychange', resume);
      window.removeEventListener('pageshow', resume);
      window.removeEventListener('online', resume);
      this.socket?.disconnect();
    });
  }

  isConnected(): boolean { return !!this.socket?.connected; }

  reconnect() {
    if (this.socket?.connected) this.socket.emit('app:request-version');
    if (this.socket?.connected) this.socket.emit('tables:request-sync');
    else {
      this.socket?.connect();
      this.loadCustomTables().subscribe({ error: () => {} });
    }
    this.refreshSubject.next();
  }

  // Initialize Socket.io connection
  private initializeSocket() {
    this.ngZone.runOutsideAngular(() => {
      this.socket = this.createSocket(this.apiUrl, {
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        // Never give up — a dead socket would miss live orders and the
        // tablet:reload signal after a server restart or WiFi blip.
        reconnectionAttempts: Infinity
      });

      // Listen for initial sync
      this.socket.on('tables:sync', (tables: { [key: string]: CustomTable }) => {
        console.log('Received table sync:', tables);
        this.ngZone.run(() => this.customTablesSubject.next(tables));
      });

      // Listen for new table creation
      this.socket.on('table:created', (table: CustomTable) => {
        console.log('New table created:', table);
        this.ngZone.run(() => {
          const current = this.customTablesSubject.value;
          current[table.id] = table;
          this.customTablesSubject.next({ ...current });
        });
      });

      // Listen for table deletion
      this.socket.on('table:deleted', (data: { id: string }) => {
        console.log('Table deleted:', data.id);
        this.ngZone.run(() => {
          const current = this.customTablesSubject.value;
          delete current[data.id];
          this.customTablesSubject.next({ ...current });
        });
      });

      // Listen for table updates
      this.socket.on('table:updated', (table: CustomTable) => {
        console.log('Table updated:', table);
        this.ngZone.run(() => {
          const current = this.customTablesSubject.value;
          current[table.id] = table;
          this.customTablesSubject.next({ ...current });
        });
      });

      // Listen for cart activities (active tables changed)
      this.socket.on('carts:updated', (data: any) => {
        console.log('Carts updated event received:', data);
        this.ngZone.run(() => this.cartUpdatesSubject.next(data));
      });

      // Listen for new incoming online orders
      this.socket.on('online-order:new', (order: OnlineOrder) => {
        console.log('New online order received:', order);
        this.ngZone.run(() => {
          this.prependOnlineOrder(order);
          // Jump straight to the Online Orders tab so the cashier sees it
          this.router.navigate(['/tabs/tab3']);
        });
      });

      // Server emits this after a new tablet build is deployed — reload to pick it up
      this.socket.on('tablet:reload', (data?: { version?: string }) => {
        if (data?.version) this.updates.checkVersion(data.version);
        else this.updates.requestReload();
      });
      this.socket.on('app:versions', (versions: { phone?: string; tablet?: string }) => {
        this.updates.checkVersion(versions.tablet);
      });

      this.socket.on('connect', () => {
        console.log('Connected to server');
        this.ngZone.run(() => {
          this.connectedSubject.next(true);
          this.socket?.emit('app:request-version');
          this.refreshSubject.next();
        });
      });

      this.socket.on('history:updated', (data: { kind: string }) => {
        this.ngZone.run(() => this.historyUpdatesSubject.next(data.kind));
      });
      this.socket.once('connect_error', () => {
        this.ngZone.run(() => this.loadCustomTables().subscribe({ error: () => {} }));
      });

      this.socket.on('disconnect', () => {
        console.log('Disconnected from server');
        this.ngZone.run(() => {
          this.connectedSubject.next(false);
          this.onlineOrdersLoaded = false;
          this.cancelOnlineSync.next();
        });
      });
    });
  }

  // Load custom tables from API
  loadCustomTables(): Observable<{ [key: string]: CustomTable }> {
    return this.http.get<{ [key: string]: CustomTable }>(`${this.apiUrl}/custom-tables`).pipe(
      tap(tables => this.customTablesSubject.next(tables))
    );
  }

  // Create a new custom table
  createCustomTable(name: string): Observable<{ success: boolean; table: CustomTable }> {
    return this.updates.trackWrite(this.http.post<{ success: boolean; table: CustomTable }>(
      `${this.apiUrl}/custom-tables`,
      { name }
    )).pipe(tap(response => this.customTablesSubject.next({
      ...this.customTablesSubject.value, [response.table.id]: response.table
    })));
  }

  // Delete a custom table
  deleteCustomTable(tableId: string, requireEmpty = false): Observable<{ success: boolean; message: string }> {
    return this.updates.trackWrite(this.http.delete<{ success: boolean; message: string }>(
      `${this.apiUrl}/custom-tables/${tableId}`
    )).pipe(tap(() => {
      const tables = { ...this.customTablesSubject.value };
      delete tables[tableId];
      this.customTablesSubject.next(tables);
    }));
  }

  // Update a custom table
  updateCustomTable(tableId: string, updates: Partial<CustomTable>): Observable<{ success: boolean; table: CustomTable }> {
    return this.updates.trackWrite(this.http.put<{ success: boolean; table: CustomTable }>(
      `${this.apiUrl}/custom-tables/${tableId}`,
      updates
    )).pipe(tap(response => this.customTablesSubject.next({
      ...this.customTablesSubject.value, [response.table.id]: response.table
    })));
  }

  // Get custom tables as Observable
  getCustomTables(): Observable<{ [key: string]: CustomTable }> {
    return this.customTables$;
  }

  // Get custom tables synchronously (current value)
  getCustomTablesSync(): { [key: string]: CustomTable } {
    return this.customTablesSubject.value;
  }

  // === Online orders state ===

  private emitOnlineOrders(orders: OnlineOrder[]) {
    this.onlineOrdersSubject.next(orders);
  }

  // Initial/recovery history is shared with the live socket list.
  loadOnlineOrders(force = false): Observable<OnlineOrder[]> {
    return defer(() => {
      if (this.onlineOrdersRequest) return this.onlineOrdersRequest;
      if (!force && this.onlineOrdersLoaded) return of(this.onlineOrdersSubject.value);
      this.onlineChanges.clear();
      this.onlineOrdersRequest = this.http.get<OnlineOrder[]>(`${this.apiUrl}/online-orders/last-20`).pipe(
        tap(data => {
          const orders = (data || []).map(order => ({
            ...order, ...this.onlineChanges.get(order.orderId || '')
          }));
          const ids = new Set(orders.map(order => order.orderId));
          // Preserve live arrivals received during the HTTP request, even when
          // the history snapshot was taken before they were saved.
          const liveOnly = this.onlineOrdersSubject.value.filter(order =>
            order.orderId && this.onlineChanges.has(order.orderId) && !ids.has(order.orderId)
          );
          this.emitOnlineOrders([...liveOnly, ...orders].slice(0, 20));
          this.onlineOrdersLoaded = true;
        }),
        map(() => this.onlineOrdersSubject.value),
        takeUntil(this.cancelOnlineSync),
        finalize(() => { this.onlineOrdersRequest = undefined; this.onlineChanges.clear(); }),
        shareReplay({ bufferSize: 1, refCount: false })
      );
      return this.onlineOrdersRequest;
    });
  }

  // Add a freshly arrived order to the top of the list (dedupe by orderId).
  private prependOnlineOrder(order: OnlineOrder) {
    if (order.orderId && this.onlineOrdersRequest) {
      this.onlineChanges.set(order.orderId, { ...this.onlineChanges.get(order.orderId), ...order });
    }
    const current = this.onlineOrdersSubject.value.filter(
      (o) => !o.orderId || o.orderId !== order.orderId
    );
    this.emitOnlineOrders([order, ...current].slice(0, 20));
  }

  // Disconnect socket
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
    }
  }
}
