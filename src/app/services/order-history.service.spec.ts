import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Subject } from 'rxjs';
import { OrderHistoryService, HistoryState } from './order-history.service';
import { TableService } from './table.service';
import { environment } from '../../environments/environment';

describe('Tablet history cache', () => {
    let service: OrderHistoryService;
    let http: HttpTestingController;
    let updates: Subject<string>;
    let recovery: Subject<void>;
    let latest: HistoryState;
    const url = `${environment.apiUrl}/orders/last-100`;

    beforeEach(() => {
        vi.useFakeTimers();
        updates = new Subject();
        recovery = new Subject();
        TestBed.configureTestingModule({ providers: [
                provideHttpClient(), provideHttpClientTesting(),
                { provide: TableService, useValue: { historyUpdates$: updates, refreshRequired$: recovery, isConnected: () => true } }
            ] });
        service = TestBed.inject(OrderHistoryService);
        http = TestBed.inject(HttpTestingController);
    });
    afterEach(() => {
        http.verify();
        TestBed.resetTestingModule();
        vi.useRealTimers();
    });

    it('reuses the cached list on repeated tab entries and shares simultaneous requests', () => {
        const first = service.watch('orders').subscribe(value => latest = value);
        service.get('orders').subscribe();
        http.expectOne(url).flush([{ timestamp: '1' }]);
        first.unsubscribe();
        service.watch('orders').subscribe(value => latest = value);
        expect(latest.data?.[0].timestamp).toBe('1');
        http.expectNone(url);
    });

    it('does no background GET for a hidden tab, then reloads after invalidation', () => {
        const view = service.watch('orders').subscribe();
        http.expectOne(url).flush([]);
        view.unsubscribe();
        updates.next('orders');
        http.expectNone(url);
        service.watch('orders').subscribe(value => latest = value);
        http.expectOne(url).flush([{ timestamp: '2' }]);
        expect(latest.data?.[0].timestamp).toBe('2');
    });

    it('refreshes only the visible relevant history, coalescing a burst', () => {
        service.watch('orders').subscribe(value => latest = value);
        http.expectOne(url).flush([]);
        updates.next('cancelled-orders');
        vi.advanceTimersByTime(101);
        http.expectNone(url);
        updates.next('orders');
        updates.next('orders');
        vi.advanceTimersByTime(101);
        http.expectOne(url).flush([{ timestamp: '2' }]);
        expect(latest.data?.[0].timestamp).toBe('2');
    });

    it('recovery cancels a stale request and replaces it with a fresh one', () => {
        service.watch('orders').subscribe(value => latest = value);
        const old = http.expectOne(url);
        recovery.next();
        vi.advanceTimersByTime(101);
        expect(old.cancelled).toBe(true);
        http.expectOne(url).flush([{ timestamp: 'new' }]);
        expect(latest.data?.[0].timestamp).toBe('new');
    });

    it('recovers from failure through manual refresh without losing the view subscription', () => {
        service.watch('orders').subscribe(value => latest = value);
        http.expectOne(url).flush('offline', { status: 503, statusText: 'Unavailable' });
        expect(latest.error).toBeTruthy();
        service.refresh('orders');
        vi.advanceTimersByTime(101);
        http.expectOne(url).flush([]);
        expect(latest.error).toBeUndefined();
    });

    it('expires the cache on a later visit without polling while hidden', () => {
        service.get('orders').subscribe();
        http.expectOne(url).flush([]);
        vi.advanceTimersByTime(30001);
        http.expectNone(url);
        service.get('orders').subscribe(data => expect(data[0].timestamp).toBe('new'));
        http.expectOne(url).flush([{ timestamp: 'new' }]);
    });
});
