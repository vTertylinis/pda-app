import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { BehaviorSubject, Subject } from 'rxjs';
import { CartService, CartSnapshot } from './cart.service';
import { TableService } from './table.service';
import { NetworkDiagnosticsService } from './network-diagnostics.service';
import { environment } from '../../environments/environment';

describe('Shared cart synchronization', () => {
    let service: CartService;
    let http: HttpTestingController;
    let updates: Subject<any>;
    let refresh: Subject<void>;
    let connections: BehaviorSubject<boolean>;
    let customTables: BehaviorSubject<any>;
    let latest: CartSnapshot;
    const url = `${environment.apiUrl}/cart`;
    const snapshot = (revision = 0, carts: Record<string, any[]> = {}, epoch = 'server-1'): CartSnapshot => ({
        epoch, revision, carts,
        tableMetadata: Object.fromEntries(Object.keys(carts).map(id => [id, { name: id, isCustom: false }]))
    });

    beforeEach(() => {
        updates = new Subject();
        refresh = new Subject();
        connections = new BehaviorSubject(true);
        customTables = new BehaviorSubject({});
        TestBed.configureTestingModule({ providers: [
                provideHttpClient(), provideHttpClientTesting(),
                { provide: TableService, useValue: {
                        cartUpdates$: updates, refreshRequired$: refresh, connectionChanges$: connections,
                        getCustomTables: () => customTables, isConnected: () => connections.value
                    } },
                { provide: NetworkDiagnosticsService, useValue: {
                        createCartRequest: () => ({}), recordCartFailure: () => { }, notifyRequestSucceeded: () => { }
                    } }
            ] });
        service = TestBed.inject(CartService);
        http = TestBed.inject(HttpTestingController);
    });

    afterEach(() => http.verify());

    const watch = () => service.watchActiveTables().subscribe(value => latest = value);

    it('shares the initial request and reuses the store across page and modal opens', () => {
        watch();
        watch();
        http.expectOne(url).flush(snapshot(0, { 1: [{ price: 3 }] }));
        watch();
        service.getCart('1').subscribe(items => expect(items[0].price).toBe(3));
        service.getActiveTables().subscribe(value => expect(value.carts['1'].length).toBe(1));
        http.expectNone(url);
    });

    it('applies a burst for different tables without GETs or dropping events', () => {
        watch();
        http.expectOne(url).flush(snapshot());
        updates.next(snapshot(1, { 1: [{ price: 3 }] }));
        updates.next(snapshot(2, { 2: [{ price: 5 }] }));
        expect(Object.keys(latest.carts)).toEqual(['1', '2']);
        http.expectNone(url);
    });

    it('replays updates received while a snapshot is in flight', () => {
        watch();
        updates.next(snapshot(2, { 1: [{ price: 5 }] }));
        http.expectOne(url).flush(snapshot(1, { 1: [{ price: 3 }] }));
        expect(latest.carts['1'][0].price).toBe(5);
    });

    it('does not replay changes older than the returned snapshot', () => {
        watch();
        updates.next(snapshot(1, { 1: [{ price: 3 }] }));
        http.expectOne(url).flush(snapshot(2, { 1: [{ price: 5 }] }));
        expect(latest.carts['1'][0].price).toBe(5);
    });

    it('deduplicates HTTP and socket updates per table, including reversed arrival', () => {
        watch();
        http.expectOne(url).flush(snapshot());
        service.editItem('1', { id: 'a' }, {}).subscribe();
        updates.next(snapshot(2, { 1: [{ price: 7 }] }));
        http.expectOne(`${url}/1/items/edit`).flush({ cartUpdate: snapshot(1, { 1: [{ price: 3 }] }) });
        updates.next(snapshot(1, { 2: [{ price: 5 }] }));
        expect(latest.carts['1'][0].price).toBe(7);
        expect(latest.carts['2'][0].price).toBe(5);
        http.expectNone(url);
    });

    it('updates the initiating device from the write response before its callback', () => {
        watch();
        http.expectOne(url).flush(snapshot(0, { 1: [{ price: 3 }] }));
        service.clearCart('1', [{ id: 'a' }]).subscribe(() => expect(latest.carts['1']).toBeUndefined());
        http.expectOne(`${url}/1/items/remove`).flush({ cartUpdate: snapshot(1, { 1: [] }) });
        http.expectNone(url);
    });

    it('removes the source and updates the destination atomically on a move', () => {
        watch();
        http.expectOne(url).flush(snapshot(0, { 1: [{ price: 3 }] }));
        updates.next(snapshot(1, { 1: [], 2: [{ price: 3 }] }));
        expect(latest.carts['1']).toBeUndefined();
        expect(latest.carts['2'][0].price).toBe(3);
    });

    it('supersedes a pending snapshot on reconnect and accepts a restarted server', () => {
        watch();
        const old = http.expectOne(url);
        refresh.next();
        expect(old.cancelled).toBe(true);
        http.expectOne(url).flush(snapshot(0, {}, 'server-2'));
        updates.next(snapshot(1, { 2: [{ price: 5 }] }, 'server-2'));
        updates.next(snapshot(99, { 1: [{ price: 3 }] }));
        expect(Object.keys(latest.carts)).toEqual(['2']);
    });

    it('keeps views subscribed after startup failure and recovers on refresh', () => {
        watch();
        http.expectOne(url).flush('offline', { status: 503, statusText: 'Unavailable' });
        refresh.next();
        http.expectOne(url).flush(snapshot(0, { 1: [{ price: 3 }] }));
        expect(latest.carts['1'][0].price).toBe(3);
    });

    it('fetches fresh data on a modal read when the socket is disconnected', () => {
        watch();
        http.expectOne(url).flush(snapshot());
        connections.next(false);
        service.getCart('1').subscribe(items => expect(items[0].price).toBe(3));
        http.expectOne(url).flush(snapshot(1, { 1: [{ price: 3 }] }));
    });

    it('verifies server state after an uncertain write failure without retrying the write', () => {
        watch();
        http.expectOne(url).flush(snapshot(0, { 1: [{ price: 3 }] }));
        service.printItems('1', {}).subscribe({ error: () => {
                service.getCart('1').subscribe(items => expect(items[0].printed).toBe(true));
            } });
        http.expectOne(`${environment.apiUrl}/print-unprinted/1`).flush('lost response', {
            status: 503, statusText: 'Unavailable'
        });
        http.expectOne(url).flush(snapshot(1, { 1: [{ price: 3, printed: true }] }));
        http.expectNone(`${environment.apiUrl}/print-unprinted/1`);
    });

    it('applies printed flags from the response without a follow-up GET', () => {
        watch();
        http.expectOne(url).flush(snapshot(0, { 1: [{ printed: false }] }));
        service.printItems('1', {}).subscribe(() => {
            service.getCart('1').subscribe(items => expect(items[0].printed).toBe(true));
        });
        http.expectOne(`${environment.apiUrl}/print-unprinted/1`).flush({
            cartUpdate: snapshot(1, { 1: [{ printed: true }] })
        });
        http.expectNone(url);
    });

    it('updates custom names without a GET and isolates modal item mutations', () => {
        watch();
        http.expectOne(url).flush(snapshot(0, { custom: [{ price: 3 }] }));
        customTables.next({ custom: { name: 'Garden' } });
        expect(latest.tableMetadata['custom'].name).toBe('Garden');
        service.getCart('custom').subscribe(items => items[0].price = 99);
        expect(latest.carts['custom'][0].price).toBe(3);
        http.expectNone(url);
    });

    it('refreshes after a conflicting edit without retrying the write', () => {
        watch();
        http.expectOne(url).flush(snapshot(0, { 1: [{ id: 'a', price: 3 }] }));
        service.editItem('1', { id: 'a', price: 3 }, { name: 'Coffee', price: 4 })
            .subscribe({ error: error => expect(error.status).toBe(409) });
        http.expectOne(url + '/1/items/edit').flush('changed', { status: 409, statusText: 'Conflict' });
        http.expectOne(url).flush(snapshot(1, { 1: [{ id: 'a', price: 5 }] }));
        expect(latest.carts['1'][0].price).toBe(5);
        http.expectNone(url + '/1/items/edit');
    });

    it('posts quantity once and includes expected IDs for bulk removal', () => {
        service.addItemToCart('1', { name: 'Coffee', price: 3 }, 5).subscribe();
        const add = http.expectOne(url + '/1/items');
        expect(add.request.method).toBe('POST');
        expect(add.request.body.quantity).toBe(5);
        add.flush({ cartUpdate: snapshot(1, {}) });
        service.deleteItemFromTable('1', [{ id: 'a', price: 3 }]).subscribe();
        const removal = http.expectOne(url + '/1/items/remove');
        expect(removal.request.body.expectedItems).toEqual([{ id: 'a', price: 3 }]);
        removal.flush({ cartUpdate: snapshot(2, {}) });
    });
});
