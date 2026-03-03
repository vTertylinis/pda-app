import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
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
  private apiUrl = environment.apiUrl;
  private socket: Socket | null = null;
  private customTablesSubject = new BehaviorSubject<{ [key: string]: CustomTable }>({});
  public customTables$ = this.customTablesSubject.asObservable();

  // emit when carts/active tables change on the server
  private cartUpdatesSubject = new Subject<any>();
  public cartUpdates$ = this.cartUpdatesSubject.asObservable();

  constructor(private http: HttpClient) {
    this.initializeSocket();
    this.loadCustomTables();
  }

  // Initialize Socket.io connection
  private initializeSocket() {
    this.socket = io(this.apiUrl, {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5
    });

    // Listen for initial sync
    this.socket.on('tables:sync', (tables: { [key: string]: CustomTable }) => {
      console.log('Received table sync:', tables);
      this.customTablesSubject.next(tables);
    });

    // Listen for new table creation
    this.socket.on('table:created', (table: CustomTable) => {
      console.log('New table created:', table);
      const current = this.customTablesSubject.value;
      current[table.id] = table;
      this.customTablesSubject.next({ ...current });
    });

    // Listen for table deletion
    this.socket.on('table:deleted', (data: { id: string }) => {
      console.log('Table deleted:', data.id);
      const current = this.customTablesSubject.value;
      delete current[data.id];
      this.customTablesSubject.next({ ...current });
    });

    // Listen for table updates
    this.socket.on('table:updated', (table: CustomTable) => {
      console.log('Table updated:', table);
      const current = this.customTablesSubject.value;
      current[table.id] = table;
      this.customTablesSubject.next({ ...current });
    });

    // Listen for cart activities (active tables changed)
    this.socket.on('carts:updated', (data: any) => {
      console.log('Carts updated event received:', data);
      this.cartUpdatesSubject.next(data);
    });

    this.socket.on('connect', () => {
      console.log('Connected to server');
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from server');
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

  // Disconnect socket
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
    }
  }
}
