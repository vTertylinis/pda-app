import { afterEach, beforeEach, describe, expect, it, type MockedObject, vi } from "vitest";
import { TestBed } from '@angular/core/testing';
import { AlertController, ModalController } from '@ionic/angular';
import { Subject, defer, of, throwError } from 'rxjs';
import { CartService } from '../../services/cart.service';
import { TableService } from '../../services/table.service';
import { TableManagementModalComponent } from './table-management-modal.component';

describe('Tablet cart modal synchronization', () => {
    let component: TableManagementModalComponent;
    let cart: MockedObject<Pick<CartService, 'getCart' | 'deleteItemFromTable' | 'addItemToCart'>>;
    let updates: Subject<any>;
    let refresh: Subject<void>;
    let confirmations: any[];
    let modal: any;
    const items = [{ name: 'Coffee', price: 3 }, { name: 'Water', price: 1 }, { name: 'Coffee', price: 3 }];

    beforeEach(() => {
        confirmations = [];
        updates = new Subject();
        refresh = new Subject();
        cart = {
            getCart: vi.fn().mockName("CartService.getCart"),
            deleteItemFromTable: vi.fn().mockName("CartService.deleteItemFromTable"),
            addItemToCart: vi.fn().mockName("CartService.addItemToCart")
        };
        cart.getCart.mockReturnValue(of(items));
        cart.deleteItemFromTable.mockReturnValue(of({}));
        modal = { dismiss: vi.fn(), create: vi.fn() };
        TestBed.configureTestingModule({ providers: [
                { provide: CartService, useValue: cart },
                { provide: TableService, useValue: { cartUpdates$: updates, refreshRequired$: refresh } },
                { provide: ModalController, useValue: modal },
                { provide: AlertController, useValue: { create: async (options: any) => {
                            confirmations.push(options);
                            return { present: async () => { } };
                        } } }
            ] });
        component = TestBed.runInInjectionContext(() => new TableManagementModalComponent());
        component.table = '1';
        component.ngOnInit();
    });
    afterEach(() => component.ngOnDestroy());

    it('invalidates a pending removal confirmation after a remote change', async () => {
        component.toggleSelectAll();
        await component.askToRemovePaidItems();
        const confirmation = confirmations[0];
        updates.next({ tableId: '1' });
        confirmation.buttons[1].handler();
        expect(cart.deleteItemFromTable).not.toHaveBeenCalled();
        expect(component.hasSelection).toBe(false);
    });

    it('ignores unrelated changes and clears stale selection after reconnect', () => {
        component.toggleSelectAll();
        updates.next({ tableId: '2' });
        expect(component.hasSelection).toBe(true);
        refresh.next();
        expect(component.hasSelection).toBe(false);
    });

    it('stops sequential deletion on failure and reloads the remaining cart', async () => {
        const removed: number[] = [];
        cart.deleteItemFromTable.mockImplementation((_table, index) => defer(() => {
            removed.push(index);
            return index === 1 ? throwError(() => new Error('offline')) : of({});
        }));
        component.toggleSelectAll();
        await component.askToRemovePaidItems();
        confirmations[0].buttons[1].handler();
        expect(removed).toEqual([2, 1]);
        expect(cart.getCart).toHaveBeenCalledTimes(2);
    });

    it('adds multiple copies sequentially and refreshes only after the last write', async () => {
        modal.create.mockResolvedValue({
            present: async () => { },
            onDidDismiss: async () => ({ data: { finalItem: { name: 'Coffee', price: 3 }, quantity: 2 } })
        });
        const first = new Subject<object>();
        let writes = 0;
        cart.addItemToCart.mockImplementation(() => defer(() => {
            writes++;
            return writes === 1 ? first : of({});
        }));
        await (component as any).openItemDetailModal({ name: 'Coffee' }, 'Coffee');
        expect(writes).toBe(1);
        expect(cart.getCart).toHaveBeenCalledTimes(1);
        first.next({});
        first.complete();
        expect(writes).toBe(2);
        expect(cart.getCart).toHaveBeenCalledTimes(2);
    });
});
