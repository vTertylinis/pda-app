import { afterEach, beforeEach, describe, expect, it, type MockedObject, vi } from "vitest";
import { TestBed } from '@angular/core/testing';
import { AlertController, ModalController } from '@ionic/angular';
import { Subject, defer, of, throwError } from 'rxjs';
import { CartService } from '../../services/cart.service';
import { TableService } from '../../services/table.service';
import { TableManagementModalComponent } from './table-management-modal.component';

describe('Tablet cart modal synchronization', () => {
    let component: TableManagementModalComponent;
    let cart: MockedObject<Pick<CartService, 'getCart' | 'repeatItems' | 'deleteItemFromTable' | 'addItemToCart'>>;
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
            repeatItems: vi.fn().mockReturnValue(of({})),
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

    it('repeats selected units once after confirmation and waits for the pending write', async () => {
        const pending = new Subject<object>();
        cart.repeatItems.mockReturnValue(pending);
        component.groupedItems[0].selectedQuantity = 1; component.updateSelectedTotal();
        await component.repeatSelectedItems();
        expect(cart.repeatItems).not.toHaveBeenCalled();
        confirmations[0].buttons[1].handler();
        confirmations[0].buttons[1].handler();
        expect(cart.repeatItems).toHaveBeenCalledTimes(1);
        expect(cart.repeatItems).toHaveBeenCalledWith('1', [items[0]]);
        expect(component.isRepeating).toBe(true);
        pending.complete();
        expect(component.isRepeating).toBe(false);
    });
    it('does not repeat a selection changed remotely while confirmation is open', async () => {
        component.groupedItems[0].selectedQuantity = 1; component.updateSelectedTotal();
        await component.repeatSelectedItems();
        updates.next({ tableId: '1' });
        confirmations[0].buttons[1].handler();
        expect(cart.repeatItems).not.toHaveBeenCalled();
    });
    it('passes only selected copies to the move modal as a partial source snapshot', async () => {

        component.groupedItems[0].selectedQuantity = 1; component.updateSelectedTotal();
        const controller = (component as any).modalCtrl;
        const create = vi.spyOn(controller, 'create').mockResolvedValue({
            open: async () => {}, present: async () => {},
            afterClosed: async () => ({ data: null }), onDidDismiss: async () => ({ data: null })
        } as any);
        await component.moveTable();
        const props = (create.mock.calls[0][0] as any).componentProps;
        expect(props.cartItems).toEqual([items[0]]);
        expect(props.wholeTable).toBe(false);
    });

    it('keeps decaf copies separate from regular coffee when selecting items', () => {
        const regular = { id: 'regular', name: 'Espresso', price: 2.5, coffeePreference: 'Σκέτο' };
        const decaf = { ...regular, id: 'decaf', decaf: true };
        component.cartItems = [regular, decaf, { ...decaf, id: 'decaf-2' }];
        component.groupedItems = component.groupCartItems();
        expect(component.groupedItems).toHaveLength(2);
        expect(component.groupedItems[0].quantity).toBe(1);
        expect(component.groupedItems[1].quantity).toBe(2);
        component.groupedItems[1].selectedQuantity = 2;
        expect(component.getSelectedItems().map(item => item.id)).toEqual(['decaf', 'decaf-2']);
    });

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

    it('sends removal once on failure and reloads the remaining cart', async () => {
        const removed: any[][] = [];
        cart.deleteItemFromTable.mockImplementation((_table, selected) => defer(() => {
            removed.push(selected);
            return throwError(() => new Error('offline'));
        }));
        component.toggleSelectAll();
        await component.askToRemovePaidItems();
        confirmations[0].buttons[1].handler();
        expect(removed).toEqual([[items[2], items[1], items[0]]]);
        expect(cart.getCart).toHaveBeenCalledTimes(2);
    });

    it('adds quantity once and refreshes after the response', async () => {
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
        expect(writes).toBe(1);
        expect(cart.addItemToCart).toHaveBeenCalledWith('1', { name: 'Coffee', price: 3 }, 2);
        expect(cart.getCart).toHaveBeenCalledTimes(2);
    });
});
