import { AppUpdateService } from './app-update.service';
import { HttpClient } from '@angular/common/http';
import { DestroyRef, Injectable, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { BehaviorSubject, EMPTY, Observable, Subject, catchError, defer, filter, finalize, ignoreElements, map, merge, of, shareReplay, take, takeUntil, tap, throwError } from 'rxjs';
import { environment } from '../../environments/environment';
import { NetworkDiagnosticsService } from './network-diagnostics.service';
import { TableService } from './table.service';

export interface CartSnapshot {
  epoch?: string;
  revision?: number;
  carts: { [tableId: string]: any[] };
  tableMetadata: { [tableId: string]: { name: string; isCustom: boolean } };
}


@Injectable({ providedIn: 'root' })
export class CartService {
  private http = inject(HttpClient);
  private updates = inject(AppUpdateService);
  private networkDiagnostics = inject(NetworkDiagnosticsService);
  private tables = inject(TableService);
  private destroyRef = inject(DestroyRef);
  private state = new BehaviorSubject<CartSnapshot | null>(null);
  private valid = false;
  private inFlight?: Observable<CartSnapshot>;
  private pending: CartSnapshot[] = [];
  private tableRevisions = new Map<string, number>();
  private cancelSync = new Subject<void>();

  private apiUrl = environment.apiUrl;

  constructor() {
    this.tables.connectionChanges$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(connected => {
      if (!connected) this.valid = false;
    });
    this.tables.cartUpdates$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(update => {
      if (update.carts) this.applyUpdate(update);
      else this.refresh(); // Compatibility with ID-only events from older servers.
    });
    this.tables.refreshRequired$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.refresh());
    this.tables.getCustomTables().pipe(takeUntilDestroyed(this.destroyRef)).subscribe(tables => {
      const current = this.state.value;
      if (!current) return;
      const tableMetadata = { ...current.tableMetadata };
      for (const id of Object.keys(current.carts)) {
        tableMetadata[id] = { name: tables[id]?.name || id, isCustom: !!tables[id] };
      }
      this.state.next({ ...current, tableMetadata });
    });
  }

  watchActiveTables(): Observable<CartSnapshot> {
    return defer(() => merge(
      this.ensureSnapshot(!this.tables.isConnected()).pipe(
        ignoreElements(),
        catchError(error => {
          console.error('Failed to load carts:', error);
          return EMPTY;
        })
      ),
      // Keep views subscribed even if startup fails; recovery updates the store.
      this.state.pipe(filter((value): value is CartSnapshot => value !== null))
    ));
  }

  refresh() {
    this.valid = false;
    // A recovery request supersedes any snapshot started before reconnect.
    this.cancelSync.next();
    this.ensureSnapshot().subscribe({ error: error => console.error('Failed to sync carts:', error) });
  }

  private ensureSnapshot(force = false): Observable<CartSnapshot> {
    if (this.inFlight) return this.inFlight;
    if (!force && this.valid && this.state.value) return of(this.state.value);
    this.pending = [];
    this.inFlight = this.http.get<CartSnapshot>(`${this.apiUrl}/cart`).pipe(
      tap(snapshot => {
        this.tableRevisions.clear();
        this.state.next(snapshot);
        this.valid = true;
        const pending = this.pending;
        this.pending = [];
        // A late HTTP snapshot must not overwrite newer socket data.
        for (const update of pending) {
          if (update.epoch === snapshot.epoch && (update.revision || 0) > (snapshot.revision || 0)) {
            this.applyUpdate(update);
          }
        }
        this.networkDiagnostics.notifyRequestSucceeded();
      }),
      map(() => this.state.value!),
      takeUntil(this.cancelSync),
      finalize(() => { this.inFlight = undefined; this.pending = []; }),
      shareReplay({ bufferSize: 1, refCount: false })
    );
    return this.inFlight;
  }

  private applyUpdate(update: CartSnapshot) {
    if (this.inFlight) this.pending.push(update);
    const current = this.state.value;
    if (!current || current.epoch !== update.epoch) return;
    const carts = { ...current.carts };
    const tableMetadata = { ...current.tableMetadata };
    let changed = false;
    for (const [id, items] of Object.entries(update.carts)) {
      const lastRevision = this.tableRevisions.get(id) ?? current.revision ?? -1;
      if ((update.revision ?? 0) <= lastRevision) continue;
      this.tableRevisions.set(id, update.revision!);
      if (items.length) {
        carts[id] = items;
        tableMetadata[id] = update.tableMetadata[id];
      } else {
        delete carts[id];
        delete tableMetadata[id];
      }
      changed = true;
    }
    if (changed) this.state.next({ ...current, carts, tableMetadata });
  }

  private mutation<T>(request: Observable<T>): Observable<T> {
    return this.updates.trackWrite(request).pipe(
      tap((response: any) => {
        if (response.cartUpdate) {
          if (this.state.value?.epoch !== response.cartUpdate.epoch) this.valid = false;
          this.applyUpdate(response.cartUpdate);
        } else this.refresh();
      }),
      catchError(error => {
        // A write may have reached the server even when its response was lost.
        // The caller's next read must verify it; never automatically retry writes.
        this.valid = false;
        if (error.status === 409) this.refresh();
        return throwError(() => error);
      })
    );
  }

  getCart(tableId: any) {
    const url = `${this.apiUrl}/cart`;

    return defer(() => {
      const request = this.networkDiagnostics.createCartRequest(tableId, url);
      return this.ensureSnapshot(!this.tables.isConnected()).pipe(
        map(snapshot => structuredClone(snapshot.carts[String(tableId)] || [])),
        catchError((error: unknown) => {
          this.networkDiagnostics.recordCartFailure(request, error);
          return throwError(() => error);
        })
      );
    });
  }

  addItemToCart(tableId: any, item: any, quantity = 1) {
    return this.mutation(this.http.post(`${this.apiUrl}/cart/${tableId}/items`, { item, quantity }));
  }

  repeatItems(tableId: any, expectedItems: any[]) {
    return this.mutation(this.http.post(`${this.apiUrl}/cart/${tableId}/items/repeat`, { expectedItems }));
  }

  clearCart(tableId: any, items: any[]) {
    return this.mutation(this.http.post(`${this.apiUrl}/cart/${tableId}/items/remove`, { expectedItems: items, wholeTable: true }));
  }

  deleteItemFromTable(tableId: any, items: any[]) {
    return this.mutation(this.http.post(`${this.apiUrl}/cart/${tableId}/items/remove`, { expectedItems: items }));
  }

  cancelItem(tableId: any, items: any[]) {
    return this.mutation(this.http.post(`${this.apiUrl}/cart/${tableId}/items/cancel`, { expectedItems: items }));
  }

  getActiveTables() {
    return defer(() => this.ensureSnapshot(!this.tables.isConnected())).pipe(take(1));
  }

  editItem(tableId: any, expectedItem: any, item: any) {
    return this.mutation(this.http.post(`${this.apiUrl}/cart/${tableId}/items/edit`, { expectedItems: [expectedItem], item }));
  }

  printItems(tableId: any, request: any) {
    return this.mutation(this.http.post(`${this.apiUrl}/print-unprinted/${tableId}`, request));
  }

  moveTable(request: any) {
    return this.mutation(this.http.post(`${this.apiUrl}/cart/items/move`, request));
  }

  moveTableItems(request: any) {
    return this.mutation(this.http.post(`${this.apiUrl}/cart/items/move`, request));
  }

}
