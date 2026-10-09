import { afterEach, beforeEach, describe, expect, it, type MockedObject, vi } from "vitest";
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { TABLET_SOCKET_FACTORY, TableService, OnlineOrder } from './table.service';
import { environment } from '../../environments/environment';

describe('Tablet socket and online order recovery', () => {
    let service: TableService;
    let http: HttpTestingController;
    let handlers: Record<string, (data?: any) => void>;
    let socket: any;
    let latest: OnlineOrder[];
    let router: MockedObject<Pick<Router, 'navigate'>>;
    const url = `${environment.apiUrl}/online-orders/last-20`;

    beforeEach(() => {
        vi.useFakeTimers();
        handlers = {};
        socket = {
            connected: false,
            on: (name: string, callback: (data?: any) => void) => { handlers[name] = callback; return socket; },
            once: (name: string, callback: (data?: any) => void) => { handlers[name] = callback; return socket; },
            emit: vi.fn(), connect: vi.fn(), disconnect: vi.fn()
        };
        router = {
            navigate: vi.fn().mockName("Router.navigate")
        };
        TestBed.configureTestingModule({ providers: [
                provideHttpClient(), provideHttpClientTesting(),
                { provide: TABLET_SOCKET_FACTORY, useValue: () => socket },
                { provide: Router, useValue: router }
            ] });
        service = TestBed.inject(TableService);
        http = TestBed.inject(HttpTestingController);
        service.onlineOrders$.subscribe(orders => latest = orders);
    });

    afterEach(() => {
        http.verify();
        TestBed.resetTestingModule();
        vi.useRealTimers();
    });

    it('shares history requests and reuses loaded online orders', () => {
        service.loadOnlineOrders().subscribe();
        service.loadOnlineOrders().subscribe();
        http.expectOne(url).flush([{ orderId: '1' }]);
        service.loadOnlineOrders().subscribe();
        http.expectNone(url);
        service.loadOnlineOrders(true).subscribe();
        http.expectOne(url).flush([{ orderId: '2' }]);
        expect(latest[0].orderId).toBe('2');
    });

    it('preserves live arrival and automatic routing during a delayed GET', () => {
        service.loadOnlineOrders().subscribe();
        handlers['online-order:new']({ orderId: 'live', cart: [{ name: 'Coffee' }] });
        http.expectOne(url).flush([{ orderId: 'old' }]);
        expect(latest.map(order => order.orderId)).toEqual(['live', 'old']);
        expect(router.navigate).toHaveBeenCalledWith(['/tabs/tab3']);
    });

    it('does not overwrite live order data with an older history response', () => {
        service.loadOnlineOrders().subscribe();
        handlers['online-order:new']({ orderId: '1', total: 12 });
        http.expectOne(url).flush([{ orderId: '1', total: 10 }]);
        expect(latest[0].total).toBe(12);
    });

    it('reconnect replaces an old pending request and recovers missed orders', () => {
        service.loadOnlineOrders().subscribe();
        const old = http.expectOne(url);
        handlers['disconnect']();
        expect(old.cancelled).toBe(true);
        socket.connected = true;
        handlers['connect']();
        vi.advanceTimersByTime(101);
        http.expectOne(url).flush([{ orderId: 'missed' }]);
        expect(latest[0].orderId).toBe('missed');
    });

    it('refreshes custom tables through the socket on foreground recovery', () => {
        socket.connected = true;
        service.reconnect();
        expect(socket.emit).toHaveBeenCalledWith('tables:request-sync');
        vi.advanceTimersByTime(101);
        http.expectOne(url).flush([]);
        http.expectNone(`${environment.apiUrl}/custom-tables`);
    });

    it('updates the initiating device from custom-table write responses', () => {
        const table = { id: 'custom', name: 'Garden', isCustom: true, active: true, createdAt: '' };
        service.createCustomTable('Garden').subscribe();
        http.expectOne(`${environment.apiUrl}/custom-tables`).flush({ success: true, table });
        expect(service.getCustomTablesSync()['custom'].name).toBe('Garden');
        service.deleteCustomTable('custom').subscribe();
        http.expectOne(`${environment.apiUrl}/custom-tables/custom`).flush({ success: true });
        expect(service.getCustomTablesSync()['custom']).toBeUndefined();
    });
});
