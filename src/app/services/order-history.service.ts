import { HttpClient } from '@angular/common/http';
import { DestroyRef, Injectable, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Observable, Subject, catchError, debounceTime, defer, filter, finalize, map, merge, of, shareReplay, startWith, switchMap, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { TableService } from './table.service';

export type HistoryKind = 'orders' | 'cancelled-orders' | 'self-orders';
export interface HistoryState { data?: any[]; loading: boolean; error?: unknown }
interface CacheEntry {
  generation: number;
  data?: any[];
  loadedAt: number;
  request?: { generation: number; stream: Observable<any[]> };
}

@Injectable({ providedIn: 'root' })
export class OrderHistoryService {
  private http = inject(HttpClient);
  private tables = inject(TableService);
  private destroyRef = inject(DestroyRef);
  private entries = new Map<HistoryKind, CacheEntry>();
  private changes = new Subject<HistoryKind>();
  // Also bounds staleness when connected to an older server without history events.
  private maxAge = 30_000;

  constructor() {
    this.tables.historyUpdates$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(kind => {
      if (kind === 'orders' || kind === 'cancelled-orders' || kind === 'self-orders') this.refresh(kind);
    });
    this.tables.refreshRequired$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      for (const kind of this.entries.keys()) this.refresh(kind);
    });
  }

  private entry(kind: HistoryKind): CacheEntry {
    if (!this.entries.has(kind)) this.entries.set(kind, { generation: 0, loadedAt: 0 });
    return this.entries.get(kind)!;
  }

  refresh(kind: HistoryKind) {
    const entry = this.entry(kind);
    entry.generation++;
    entry.data = undefined;
    this.changes.next(kind);
  }

  get(kind: HistoryKind): Observable<any[]> {
    return defer(() => {
      const entry = this.entry(kind);
      if (entry.data && Date.now() - entry.loadedAt < this.maxAge && this.tables.isConnected()) return of(entry.data);
      if (entry.request?.generation === entry.generation) return entry.request.stream;
      const generation = entry.generation;
      const stream = this.http.get<any[]>(`${environment.apiUrl}/${kind}/last-100`).pipe(
        tap(data => {
          if (generation === entry.generation) {
            entry.data = data;
            entry.loadedAt = Date.now();
          }
        }),
        finalize(() => { if (entry.request?.generation === generation) entry.request = undefined; }),
        shareReplay({ bufferSize: 1, refCount: true })
      );
      entry.request = { generation, stream };
      return stream;
    });
  }

  // Subscribe only while the Ionic view is visible, so hidden history tabs
  // become dirty without making HTTP requests in the background.
  watch(kind: HistoryKind): Observable<HistoryState> {
    return merge(of(kind), this.changes.pipe(filter(changed => changed === kind), debounceTime(100))).pipe(
      switchMap(() => this.get(kind).pipe(
        map(data => ({ data, loading: false } as HistoryState)),
        catchError(error => of({ loading: false, error } as HistoryState)),
        startWith({ loading: true } as HistoryState)
      ))
    );
  }
}
