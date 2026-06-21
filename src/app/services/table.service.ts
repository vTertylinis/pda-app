import { Injectable, NgZone, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { environment } from '../../environments/environment';
import { io, Socket } from 'socket.io-client';
import { AlertSoundService } from './alert-sound.service';

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
  // Cashier's reply, persisted so it survives tab switches / reloads
  respondedWaitingTime?: number | null;
  responding?: boolean;
  // True only for orders that arrived live this session and still require a
  // response. Drives the mandatory looping alarm; historical orders are false.
  needsResponse?: boolean;
  [key: string]: any;
}

const RESPONSES_KEY = 'online-order-responses-v1';

@Injectable({
  providedIn: 'root'
})
export class TableService {
  private http = inject(HttpClient);
  private ngZone = inject(NgZone);
  private router = inject(Router);
  private alertSound = inject(AlertSoundService);

  private apiUrl = environment.apiUrl;
  private socket: Socket | null = null;
  private customTablesSubject = new BehaviorSubject<{ [key: string]: CustomTable }>({});
  public customTables$ = this.customTablesSubject.asObservable();

  // emit when carts/active tables change on the server
  private cartUpdatesSubject = new Subject<any>();
  public cartUpdates$ = this.cartUpdatesSubject.asObservable();

  // Stateful list of online orders, kept alive for the whole app so it
  // survives tab switches. Live arrivals are merged in; responses persist.
  private onlineOrdersSubject = new BehaviorSubject<OnlineOrder[]>([]);
  public onlineOrders$ = this.onlineOrdersSubject.asObservable();
  // Saved waiting-time responses keyed by orderId, so a selection isn't lost
  private responses: { [orderId: string]: number } = this.loadResponses();

  constructor() {
    this.initializeSocket();
    this.loadCustomTables();
  }

  // Initialize Socket.io connection
  private initializeSocket() {
    this.ngZone.runOutsideAngular(() => {
      this.socket = io(this.apiUrl, {
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: 5
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

      this.socket.on('connect', () => {
        console.log('Connected to server');
      });

      this.socket.on('disconnect', () => {
        console.log('Disconnected from server');
      });
    });
  }

  // Load custom tables from API
  loadCustomTables(): Observable<{ [key: string]: CustomTable }> {
    return new Observable(observer => {
      this.http.get<{ [key: string]: CustomTable }>(`${this.apiUrl}/custom-tables`)
        .subscribe({
          next: (tables) => {
            this.customTablesSubject.next(tables);
            observer.next(tables);
            observer.complete();
          },
          error: (err) => {
            console.error('Failed to load custom tables:', err);
            observer.error(err);
          }
        });
    });
  }

  // Create a new custom table
  createCustomTable(name: string): Observable<{ success: boolean; table: CustomTable }> {
    return this.http.post<{ success: boolean; table: CustomTable }>(
      `${this.apiUrl}/custom-tables`,
      { name }
    );
  }

  // Delete a custom table
  deleteCustomTable(tableId: string): Observable<{ success: boolean; message: string }> {
    return this.http.delete<{ success: boolean; message: string }>(
      `${this.apiUrl}/custom-tables/${tableId}`
    );
  }

  // Update a custom table
  updateCustomTable(tableId: string, updates: Partial<CustomTable>): Observable<{ success: boolean; table: CustomTable }> {
    return this.http.put<{ success: boolean; table: CustomTable }>(
      `${this.apiUrl}/custom-tables/${tableId}`,
      updates
    );
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

  // Push a new list to subscribers and (re)evaluate the looping alert.
  // The alarm plays while ANY live order still requires a response.
  private emitOnlineOrders(orders: OnlineOrder[]) {
    this.onlineOrdersSubject.next(orders);
    const hasUnanswered = orders.some(
      (o) => o.needsResponse && o.respondedWaitingTime == null
    );
    if (hasUnanswered) {
      this.alertSound.start();
    } else {
      this.alertSound.stop();
    }
  }

  // Decorate a raw order with display + response fields
  private decorateOnlineOrder(order: OnlineOrder): OnlineOrder {
    const saved = order.orderId ? this.responses[order.orderId] : undefined;
    return {
      ...order,
      respondedWaitingTime: order.respondedWaitingTime ?? saved ?? null,
      responding: false,
    };
  }

  // Load the recent online orders from the server (history), merged with saved responses
  loadOnlineOrders(): Observable<OnlineOrder[]> {
    return new Observable((observer) => {
      this.http.get<OnlineOrder[]>(`${this.apiUrl}/online-orders/last-20`).subscribe({
        next: (data) => {
          const decorated = (data || []).map((o) => this.decorateOnlineOrder(o));
          // Keep any live orders already in memory that aren't in the history yet
          const existing = this.onlineOrdersSubject.value;
          const historyIds = new Set(decorated.map((o) => o.orderId));
          const liveOnly = existing.filter(
            (o) => o.orderId && !historyIds.has(o.orderId)
          );
          this.emitOnlineOrders([...liveOnly, ...decorated]);
          observer.next(this.onlineOrdersSubject.value);
          observer.complete();
        },
        error: (err) => observer.error(err),
      });
    });
  }

  // Add a freshly arrived order to the top of the list (dedupe by orderId).
  // Live arrivals require a response (mandatory alarm) unless already answered.
  private prependOnlineOrder(order: OnlineOrder) {
    const decorated = this.decorateOnlineOrder(order);
    decorated.needsResponse = decorated.respondedWaitingTime == null;
    const current = this.onlineOrdersSubject.value.filter(
      (o) => !o.orderId || o.orderId !== decorated.orderId
    );
    this.emitOnlineOrders([decorated, ...current]);
  }

  // Respond to an online order with an estimated waiting time (minutes)
  respondToOnlineOrder(orderId: string, waitingTime: number): Observable<{ success: boolean; status: any }> {
    return this.http.post<{ success: boolean; status: any }>(
      `${this.apiUrl}/online-order/${orderId}/respond`,
      { waitingTime }
    );
  }

  // Persist the selected waiting time and update the in-memory list
  setOnlineOrderResponse(orderId: string, waitingTime: number | null) {
    if (waitingTime == null) {
      delete this.responses[orderId];
    } else {
      this.responses[orderId] = waitingTime;
    }
    this.saveResponses();
    const updated = this.onlineOrdersSubject.value.map((o) =>
      o.orderId === orderId
        ? { ...o, respondedWaitingTime: waitingTime, responding: false, needsResponse: waitingTime == null ? o.needsResponse : false }
        : o
    );
    this.emitOnlineOrders(updated);
  }

  // Mark an order as in-flight (spinner) without changing its saved response
  setOnlineOrderResponding(orderId: string, responding: boolean) {
    const updated = this.onlineOrdersSubject.value.map((o) =>
      o.orderId === orderId ? { ...o, responding } : o
    );
    this.onlineOrdersSubject.next(updated);
  }

  private loadResponses(): { [orderId: string]: number } {
    try {
      const raw = localStorage.getItem(RESPONSES_KEY);
      return raw ? JSON.parse(raw) || {} : {};
    } catch {
      return {};
    }
  }

  private saveResponses() {
    try {
      localStorage.setItem(RESPONSES_KEY, JSON.stringify(this.responses));
    } catch {}
  }

  // Disconnect socket
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
    }
  }
}