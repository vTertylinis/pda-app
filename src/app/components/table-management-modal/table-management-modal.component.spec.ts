import { afterEach, beforeEach, describe, expect, it, type MockedObject, vi } from "vitest";
import { ChangeDetectorRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActionMenuService, PromptService, DialogRef } from '../../ui/dialog.service';
import { defer, of, Subject, throwError } from 'rxjs';
import { CartService } from '../../services/cart.service';
import { TableService } from '../../services/table.service';
import { TableManagementModalComponent } from './table-management-modal.component';

describe('Table item selection', () => {
    let component: TableManagementModalComponent;
    let cart: MockedObject<Pick<CartService, 'getCart' | 'repeatItems' | 'deleteItemFromTable'>>;
    let updates: Subject<any>;
    let confirmation: any;
    let modal: MockedObject<Pick<DialogRef, 'dismiss'>>;
    const items = [
        { name: 'Coffee', price: 3.5 },
        { name: 'Water', price: 1 },
        { name: 'Coffee', price: 3.5 },
        { name: 'Coffee', price: 3.5 },
    ];

    beforeEach(() => {
        updates = new Subject();
        cart = {
            getCart: vi.fn().mockName("CartService.getCart"),
            repeatItems: vi.fn().mockReturnValue(of({})),
            deleteItemFromTable: vi.fn().mockName("CartService.deleteItemFromTable")
        };
        cart.getCart.mockReturnValue(of(items));
        cart.deleteItemFromTable.mockReturnValue(of({}));
        modal = {
            dismiss: vi.fn().mockName("DialogRef.dismiss")
        };
        TestBed.configureTestingModule({
            providers: [
                { provide: CartService, useValue: cart },
                { provide: TableService, useValue: { cartUpdates$: updates, refreshRequired$: new Subject<void>() } },
                { provide: ChangeDetectorRef, useValue: { markForCheck: () => { } } },
                { provide: DialogRef, useValue: modal },
                { provide: ActionMenuService, useValue: {} },
                { provide: PromptService, useValue: {
                        create: async (options: any) => {
                            confirmation = options;
                            return { open: async () => { } };
                        }
                    } },
            ]
        });
        component = TestBed.runInInjectionContext(() => new TableManagementModalComponent());
        component.table = '1';
        component.ngOnInit();
        component.startRemovalSelection();
    });

    afterEach(() => component.ngOnDestroy());

    it('repeats selected units once after confirmation and waits for the pending write', async () => {
        const pending = new Subject<object>();
        cart.repeatItems.mockReturnValue(pending);
        component.setSelectedQuantity(component.groupedItems[0], 1);
        await component.repeatSelectedItems();
        expect(cart.repeatItems).not.toHaveBeenCalled();
        confirmation.buttons[1].handler();
        confirmation.buttons[1].handler();
        expect(cart.repeatItems).toHaveBeenCalledTimes(1);
        expect(cart.repeatItems).toHaveBeenCalledWith('1', [items[0]]);
        expect(component.isRepeating).toBe(true);
        expect(component.removalMode).toBe(true);
        pending.next({});
        pending.complete();
        expect(component.isRepeating).toBe(false);
        expect(component.removalMode).toBe(false);
        expect(component.selectionMode).toBe(false);
        expect(component.selectedItems.size).toBe(0);
        expect(component.unprintedCount).toBeGreaterThan(0);
    });
    it('keeps selection mode and shows a notice when repetition fails', async () => {
        cart.repeatItems.mockReturnValue(throwError(() => new Error('offline')));
        component.setSelectedQuantity(component.groupedItems[0], 1);
        await component.repeatSelectedItems();
        confirmation.buttons[1].handler();
        expect(component.removalMode).toBe(true);
        expect(component.isRepeating).toBe(false);
        expect(component.selectionNotice).not.toBe('');
    });
    it('does not repeat a selection changed remotely while confirmation is open', async () => {
        component.setSelectedQuantity(component.groupedItems[0], 1);
        await component.repeatSelectedItems();
        updates.next({ tableId: '1' });
        confirmation.buttons[1].handler();
        expect(cart.repeatItems).not.toHaveBeenCalled();
    });
    it('passes only selected copies to the move modal as a partial source snapshot', async () => {
        component.selectionMode = true; component.removalMode = false;
        component.setSelectedQuantity(component.groupedItems[0], 1);
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

    it('totals partial quantities and toggles all without changing the move selection', () => {
        component.setSelectedQuantity(component.groupedItems[0], 2);
        expect(component.selectedCount).toBe(2);
        expect(component.selectedTotal).toBe(7);
        expect(component.selectedItems.size).toBe(0);
        component.toggleAllRemovalItems();
        expect(component.selectedCount).toBe(4);
        expect(component.selectedTotal).toBe(11.5);
        component.toggleAllRemovalItems();
        expect(component.selectedTotal).toBe(0);
        component.setSelectedQuantity(component.groupedItems[0], 99);
        expect(component.selectedCount).toBe(3);
        component.setSelectedQuantity(component.groupedItems[0], -1);
        expect(component.selectedCount).toBe(0);
    });

    it('waits for confirmation and removes only selected copies in one request', async () => {
        const deleted: any[][] = [];
        cart.deleteItemFromTable.mockImplementation((_table, selected) => defer(() => {
            deleted.push(selected);
            return of({});
        }));
        component.setSelectedQuantity(component.groupedItems[0], 2);
        await component.removeSelectedItems();
        expect(deleted).toEqual([]);
        expect(confirmation.message).toContain('7.00');
        confirmation.buttons[1].handler();
        expect(deleted).toEqual([[items[2], items[0]]]);
        expect(component.isRemoving).toBe(false);
        expect(component.selectedCount).toBe(0);
    });

    it('invalidates a pending confirmation when another device changes the table', async () => {
        component.toggleAllRemovalItems();
        await component.removeSelectedItems();
        updates.next({ tableId: '1' });
        confirmation.buttons[1].handler();
        expect(cart.deleteItemFromTable).not.toHaveBeenCalled();
        expect(component.selectedCount).toBe(0);
        expect(component.selectionNotice).toContain('Επιλέξτε ξανά');
    });

    it('ignores unrelated updates and prevents duplicate deletion requests', async () => {
        const pending = new Subject<object>();
        cart.deleteItemFromTable.mockReturnValue(pending);
        component.setSelectedQuantity(component.groupedItems[1], 1);
        updates.next({ tableId: '2' });
        expect(component.selectedCount).toBe(1);
        await component.removeSelectedItems();
        confirmation.buttons[1].handler();
        await component.removeSelectedItems();
        component.close();
        updates.next({ tableId: '1' });
        expect(cart.deleteItemFromTable).toHaveBeenCalledTimes(1);
        expect(modal.dismiss).not.toHaveBeenCalled();
        expect(cart.getCart).toHaveBeenCalledTimes(1);
        pending.complete();
        expect(cart.getCart).toHaveBeenCalledTimes(2);
    });

    it('stops on a failed delete, reloads remaining items and reports the failure', async () => {
        const deleted: any[][] = [];
        cart.deleteItemFromTable.mockImplementation((_table, index) => defer(() => {
            deleted.push(index);
            return throwError(() => new Error('offline'));
        }));
        component.toggleAllRemovalItems();
        await component.removeSelectedItems();
        confirmation.buttons[1].handler();
        expect(deleted).toEqual([[items[3], items[2], items[1], items[0]]]);
        expect(component.selectionNotice).toContain('δεν ολοκληρώθηκε');
        expect(cart.getCart).toHaveBeenCalledTimes(2);
        expect(component.selectedCount).toBe(0);
        expect(component.isRemoving).toBe(false);
    });

    it('closes the table when the last selected items have been removed', async () => {
        component.toggleAllRemovalItems();
        cart.getCart.mockReturnValue(of([]));
        await component.removeSelectedItems();
        confirmation.buttons[1].handler();
        expect(modal.dismiss).toHaveBeenCalled();
    });
});
