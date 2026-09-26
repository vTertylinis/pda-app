import { DestroyRef, Injectable, NgZone, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, Subject, of } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap, shareReplay, delay, tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { io, Socket } from 'socket.io-client';

export interface CustomTable {
  id: string;
  name: string;
  createdAt: string;
  active: boolean;
  isCustom: true;
}

@Injectable({
  providedIn: 'root'
})
export class TableService {
  private http = inject(HttpClient);
  private ngZone = inject(NgZone);
  private destroyRef = inject(DestroyRef);

  private apiUrl = environment.apiUrl;
  private socket: Socket | null = null;
  private customTablesSubject = new BehaviorSubject<{ [key: string]: CustomTable }>({});
  public customTables$ = this.customTablesSubject.asObservable();
  private cartUpdatesSubject = new Subject<any>();
  public cartUpdates$ = this.cartUpdatesSubject.asObservable().pipe(debounceTime(500));
  private refreshSubject = new Subject<void>();
  // Kept separate from cart events so a following table-specific event cannot
  // debounce away the refresh of every open view after a missed connection.
  public refreshRequired$ = this.refreshSubject.pipe(debounceTime(100));
  private connectedSubject = new BehaviorSubject<boolean>(false);
  public connected$ = this.connectedSubject.pipe(
    switchMap(connected => connected
      ? of(true)
      : of(false).pipe(delay(5000))
    ),
    distinctUntilChanged(),
    shareReplay(1)
  );

  constructor() {
    this.initializeSocket();
    this.refreshCustomTables();
    const resume = () => {
      if (document.visibilityState === 'visible') {
        this.ngZone.run(() => this.reconnect());
      }
    };
    document.addEventListener('visibilitychange', resume);
    window.addEventListener('pageshow', resume);
    window.addEventListener('online', resume);
    this.destroyRef.onDestroy(() => {
      document.removeEventListener('visibilitychange', resume);
      window.removeEventListener('pageshow', resume);
      window.removeEventListener('online', resume);
      this.socket?.disconnect();
    });
  }

  // Initialize Socket.io connection
  private initializeSocket() {
    this.ngZone.runOutsideAngular(() => {
      this.socket = io(this.apiUrl, {
        reconnection: true,
        reconnectionDelay: 300,
        reconnectionDelayMax: 3000,
        reconnectionAttempts: Infinity,
        timeout: 20000,
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

      // Server emits this after a new build is deployed — reload to pick it up
      this.socket.on('app:reload', () => {
        window.location.reload();
      });

      this.socket.on('connect', () => {
        console.log('Connected to server');
        this.ngZone.run(() => {
          this.connectedSubject.next(true);
          this.refreshSubject.next();
        });
      });

      this.socket.on('disconnect', () => {
        console.log('Disconnected from server');
        this.ngZone.run(() => this.connectedSubject.next(false));
      });
    });
  }

  // Load custom tables from API
  loadCustomTables(): Observable<{ [key: string]: CustomTable }> {
    return this.http.get<{ [key: string]: CustomTable }>(`${this.apiUrl}/custom-tables`).pipe(
      tap({
        next: (tables) => this.customTablesSubject.next(tables),
        error: (err) => console.error('Failed to load custom tables:', err)
      })
    );
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

  // Disconnect socket
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
    }
  }

  // Reconnect socket (e.g. after app resume)
  reconnect() {
    if (this.socket && !this.socket.connected) {
      this.socket.connect();
    }
    // A suspended browser may still report a connected socket. Always fetch
    // current data on return; don't wait for heartbeat failure detection.
    this.refreshSubject.next();
    this.refreshCustomTables();
  }

  private refreshCustomTables() {
    this.loadCustomTables().subscribe({ error: () => {
      // Already logged by loadCustomTables; reconnect/foreground retries later.
    } });
  }
}
