import { Component, Input, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef, inject } from '@angular/core';
import { DialogRef, ActionMenuService, PromptService, DialogService } from '../../ui/dialog.service';
import { CommonModule } from '@angular/common';
import { CartService } from '../../services/cart.service';
import { TableService } from '../../services/table.service';
import { ItemDetailModalComponent } from '../item-detail-modal/item-detail-modal.component';
import { SelectTableComponent } from '../select-table/select-table.component';
import { ItemSelectionModalComponent } from '../item-selection-modal/item-selection-modal.component';
import { CATEGORIES } from '../../models/categories';
import { concat, Subject } from 'rxjs';
import { finalize, takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-table-management-modal',
  templateUrl: './table-management-modal.component.html',
  styleUrls: ['./table-management-modal.component.scss'],
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TableManagementModalComponent implements OnInit, OnDestroy {
  private modalCtrl = inject(DialogService);
  private dialogRef = inject(DialogRef);
  private cartService = inject(CartService);
  private tableService = inject(TableService);
  private alertController = inject(PromptService);
  private actionSheetController = inject(ActionMenuService);
  private cdr = inject(ChangeDetectorRef);

  @Input() table: any;
  @Input() tableName: string = '';
  cartItems: any[] = [];
  groupedItems: any[] = [];
  totalPrice: any;
  categories = CATEGORIES;
  selectedItems: Set<any> = new Set();
  selectionMode: boolean = false;
  removalMode = false;
  isRemoving = false;
  isPrinting = false;
  selectionNotice = '';
  isLoading = true;
  loadError = '';
  private destroy$ = new Subject<void>();
  private loadSequence = 0;

  ngOnInit() {
    this.loadTable();
    this.tableService.refreshRequired$.pipe(takeUntil(this.destroy$)).subscribe(() => {
      // Both pending operations refresh on completion. Don't race their writes.
      if (this.isRemoving || this.isPrinting) return;
      if (this.selectionMode || this.removalMode) {
        this.selectionMode = false;
        this.removalMode = false;
        this.selectionNotice = 'Η σύνδεση ανανεώθηκε. Επιλέξτε ξανά τα είδη.';
      }
      this.loadTable();
    });

    // React to cart changes pushed from the server (e.g. another device edits
    // this table). The socket lives in TableService; tab2 already listens the
    // same way. Refresh only when the event concerns THIS table.
    this.tableService.cartUpdates$.pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (data: any) => {
        if (!this.isUpdateForThisTable(data)) {
          return;
        }
        if (this.isRemoving) {
          return;
        }
        if (this.removalMode) {
          this.selectionNotice = 'Το τραπέζι ενημερώθηκε. Επιλέξτε ξανά τα είδη.';
          this.loadTable();
          return;
        }
        // Skip while the user is selecting items to move: loadTable() rebuilds
        // groupedItems with new object references, which would orphan the
        // selectedItems Set and break the in-progress flow.
        if (this.selectionMode || this.selectedItems.size > 0) {
          return;
        }
        this.loadTable();
      },
      error: (err) => console.error('Error subscribing to cart updates:', err),
    });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * The server emits { tableId } for cart edits and { fromTable, toTable } for
   * moves. Treat any of those matching our table as relevant.
   */
  private isUpdateForThisTable(data: any): boolean {
    if (!data) {
      return false;
    }
    const table = String(this.table);
    return (
      String(data.tableId) === table ||
      String(data.fromTable) === table ||
      String(data.toTable) === table
    );
  }

  /**
   * Groups identical items together by their properties
   * Returns an array of grouped items with quantity and indices
   */
  groupCartItems(): any[] {
    const grouped: { [key: string]: any } = {};

    this.cartItems.forEach((item, index) => {
      const key = this.getItemKey(item);

      if (!grouped[key]) {
        grouped[key] = {
          ...item,
          quantity: 0,
          unprintedCount: 0,
          indices: [],
          selectedQuantity: 0
        };
      }

      grouped[key].quantity++;
      if (!item.printed) {
        grouped[key].unprintedCount++;
      }
      grouped[key].indices.push(index);
    });

    return Object.values(grouped);
  }

  /** Items not yet sent to the printers. */
  get unprintedCount(): number {
    return this.cartItems.filter((item) => !item.printed).length;
  }

  /**
   * Creates a unique key for an item based on its properties
   */
  private getItemKey(item: any): string {
    return JSON.stringify({
      name: item.name,
      price: item.price,
      coffeeSize: item.coffeeSize || '',
      coffeePreference: item.coffeePreference || '',
      extras: item.extras?.map((e: any) => e.name).sort().join(',') || '',
      comments: item.comments || ''
    });
  }

  close() {
    if (this.isRemoving || this.isPrinting) return;
    this.dialogRef.dismiss({});
  }

  get selectedCount(): number {
    return this.groupedItems.reduce((sum, item) => sum + item.selectedQuantity, 0);
  }

  get selectedTotal(): number {
    return this.groupedItems.reduce(
      (sum, item) => sum + item.selectedQuantity * (Number(item.price) || 0), 0
    );
  }

  startRemovalSelection() {
    this.selectedItems.clear();
    this.selectionMode = false;
    this.removalMode = true;
    this.selectionNotice = '';
    this.cdr.markForCheck();
  }

  endSelection() {
    if (this.isRemoving) return;
    this.removalMode = false;
    this.selectionMode = false;
    this.selectedItems.clear();
    this.selectionNotice = '';
    this.loadTable();
  }

  setSelectedQuantity(item: any, quantity: number) {
    if (this.isRemoving || this.isLoading) return;
    item.selectedQuantity = Math.max(0, Math.min(item.quantity, Math.trunc(quantity)));
    this.cdr.markForCheck();
  }

  toggleRemovalSelection(item: any) {
    this.setSelectedQuantity(item, item.selectedQuantity > 0 ? 0 : item.quantity);
  }

  get allSelected(): boolean {
    return this.groupedItems.length > 0 &&
      this.groupedItems.every(item => item.selectedQuantity === item.quantity);
  }

  toggleAllRemovalItems() {
    const selectAll = !this.allSelected;
    this.groupedItems.forEach(item => this.setSelectedQuantity(item, selectAll ? item.quantity : 0));
  }

  async removeSelectedItems() {
    if (this.isRemoving || this.isLoading || this.loadError || !this.selectedCount) return;
    const sequence = this.loadSequence;
    const indices = this.groupedItems.flatMap(item => item.indices.slice(0, item.selectedQuantity))
      .sort((a: number, b: number) => b - a);
    const alert = await this.alertController.create({
      header: 'Αφαίρεση επιλεγμένων',
      message: `Να αφαιρεθούν ${this.selectedCount} είδη αξίας ${this.selectedTotal.toFixed(2)} € από το τραπέζι;`,
      buttons: [
        { text: 'Άκυρο', role: 'cancel' },
        {
          text: 'Αφαίρεση',
          role: 'destructive',
          handler: () => {
            // A server update may have changed indices while the alert was open.
            if (sequence !== this.loadSequence || this.isRemoving) return;
            this.isRemoving = true;
            this.cdr.markForCheck();
            // Sequential, descending deletes keep the remaining indices valid.
            concat(...indices.map(index => this.cartService.deleteItemFromTable(this.table, index))).pipe(
              finalize(() => {
                this.isRemoving = false;
                this.loadTable(true);
              })
            ).subscribe({
              error: () => {
                this.selectionNotice = 'Η αφαίρεση δεν ολοκληρώθηκε. Ελέγξτε τα είδη που απομένουν πριν δοκιμάσετε ξανά.';
              }
            });
          }
        }
      ]
    });
    await alert.open();
  }

  toggleItemSelection(item: any) {
    if (this.selectedItems.has(item)) {
      this.selectedItems.delete(item);
    } else {
      this.selectedItems.add(item);
    }
    this.cdr.markForCheck();
  }

  isItemSelected(item: any): boolean {
    return this.selectedItems.has(item);
  }

  /**
   * Opens a bottom action sheet with the per-item actions, so each row only
   * needs a single trigger button and the full item info stays visible.
   */
  async openItemActions(item: any, event?: Event) {
    event?.stopPropagation();

    const actionSheet = await this.actionSheetController.create({
      header: item.name,
      cssClass: 'item-actions-sheet',
      buttons: [
        {
          text: 'Duplicate',
          icon: 'copy-outline',
          handler: () => { this.duplicateItem(item); },
        },
        {
          text: 'Edit',
          icon: 'create-outline',
          handler: () => { this.editItem(item, item.category); },
        },
        {
          text: 'Cancel order',
          icon: 'close-circle-outline',
          handler: () => { this.cancelItem(item); },
        },
        {
          text: 'Delete',
          role: 'destructive',
          icon: 'trash-outline',
          handler: () => { this.deleteItem(item); },
        },
        {
          text: 'Close',
          role: 'cancel',
          icon: 'close',
        },
      ],
    });

    await actionSheet.open();
  }

  async editItem(groupedItem: any, categoryName: any) {
    // Edit the first item in the group
    const indexToEdit = groupedItem.indices[0];
    const item = this.cartItems[indexToEdit];

    const modal = await this.modalCtrl.create({
      component: ItemDetailModalComponent,
      componentProps: { item, categoryName, editMode: true },
    });
    await modal.open();

    const { data } = await modal.afterClosed();

    if (data?.finalItem) {
      this.cartService.editItem(this.table, indexToEdit, data.finalItem).subscribe({
        next: (res) => {
          console.log('Item edit to cart:', res);
          this.loadTable();
        },
        error: (err) => console.error('Edit to cart failed:', err),
      });
    }
  }

  async duplicateItem(groupedItem: any) {
    const alert = await this.alertController.create({
      header: 'Επιβεβαίωση',
      message: `Είστε σίγουρος ότι θέλετε να ξαναφτιάξετε το ίδιο προϊόν "${groupedItem.name}";`,
      buttons: [
        {
          text: 'Όχι',
          role: 'cancel',
          handler: () => {
            console.log('Duplication cancelled');
          },
        },
        {
          text: 'Ναι',
          handler: () => {
            // Use the first item in the group as the template to duplicate
            const itemToDuplicate = this.cartItems[groupedItem.indices[0]];
            const duplicatedItem = { ...itemToDuplicate };
            
            this.cartService.addItemToCart(this.table, duplicatedItem).subscribe({
              next: (res: any) => {
                console.log('Item duplicated:', res);
                this.loadTable();
              },
              error: (err: any) => console.error('Duplicate item failed:', err),
            });
          },
        },
      ],
    });

    await alert.open();
  }

  async deleteItem(groupedItem: any) {
    // If there are multiple items, ask user how many to delete
    if (groupedItem.quantity > 1) {
      const quantityAlert = await this.alertController.create({
        header: 'Πόσα να διαγραφούν;',
        message: `Έχετε ${groupedItem.quantity} "${groupedItem.name}" προϊόντα. Πόσα θέλετε να διαγράψετε;`,
        inputs: [
          {
            name: 'quantity',
            type: 'number',
            placeholder: 'Ποσότητα (1-' + groupedItem.quantity + ')',
            min: '1',
            max: String(groupedItem.quantity),
            value: '1'
          }
        ],
        buttons: [
          {
            text: 'Άκυρο',
            role: 'cancel',
            handler: () => {
              console.log('Deletion cancelled');
            },
          },
          {
            text: 'Διαγραφή',
            handler: (data) => {
              const quantity = parseInt(data.quantity, 10);
              if (isNaN(quantity) || quantity < 1 || quantity > groupedItem.quantity) {
                console.error('Invalid quantity');
                return;
              }
              this.performDelete(groupedItem, quantity);
            },
          },
        ],
      });
      await quantityAlert.open();
    } else {
      // Single item - show simple confirmation
      const alert = await this.alertController.create({
        header: 'Επιβεβαίωση Διαγραφής',
        message: `Είστε σίγουροι ότι θέλετε να διαγράψετε το προϊόν "${groupedItem.name}"?`,
        buttons: [
          {
            text: 'Όχι',
            role: 'cancel',
            handler: () => {
              console.log('Deletion cancelled');
            },
          },
          {
            text: 'Ναι',
            handler: () => {
              this.performDelete(groupedItem, 1);
            },
          },
        ],
      });
      await alert.open();
    }
  }

  private performDelete(groupedItem: any, quantity: number) {
    // Delete items in reverse order to avoid index shifting
    const indicesToDelete = groupedItem.indices.slice(0, quantity).sort((a: number, b: number) => b - a);

    const deleteOps = indicesToDelete.map((index: number) =>
      this.cartService.deleteItemFromTable(this.table, index)
    );

    concat(...deleteOps).pipe(
      finalize(() => {
        console.log(`Deleted ${quantity} item(s) from cart`);
        this.loadTable(true);
      })
    ).subscribe({
      next: (res) => console.log('Item deleted from cart:', res),
      error: (err) => console.error('Delete from cart failed:', err)
    });
  }

  async cancelItem(groupedItem: any) {
    if (groupedItem.quantity > 1) {
      const quantityAlert = await this.alertController.create({
        header: 'Πόσα να ακυρωθούν;',
        message: `Έχετε ${groupedItem.quantity} "${groupedItem.name}" προϊόντα. Πόσα θέλετε να ακυρώσετε;`,
        inputs: [
          {
            name: 'quantity',
            type: 'number',
            placeholder: 'Ποσότητα (1-' + groupedItem.quantity + ')',
            min: '1',
            max: String(groupedItem.quantity),
            value: '1'
          }
        ],
        buttons: [
          { text: 'Άκυρο', role: 'cancel' },
          {
            text: 'Ακύρωση',
            handler: (data) => {
              const quantity = parseInt(data.quantity, 10);
              if (isNaN(quantity) || quantity < 1 || quantity > groupedItem.quantity) return;
              this.performCancel(groupedItem, quantity);
            }
          }
        ],
      });
      await quantityAlert.open();
    } else {
      const wasPrinted = this.cartItems[groupedItem.indices[0]]?.printed;
      const alert = await this.alertController.create({
        header: 'Ακύρωση Παραγγελίας',
        message: wasPrinted
          ? `Ακύρωση "${groupedItem.name}"; Επειδή έχει ήδη εκτυπωθεί, θα σταλεί ειδοποίηση ακύρωσης στο αντίστοιχο σταθμό.`
          : `Ακύρωση "${groupedItem.name}";`,
        buttons: [
          { text: 'Όχι', role: 'cancel' },
          {
            text: 'Ναι, Ακύρωση',
            handler: () => this.performCancel(groupedItem, 1)
          }
        ],
      });
      await alert.open();
    }
  }

  private performCancel(groupedItem: any, quantity: number) {
    const indicesToCancel = groupedItem.indices.slice(0, quantity).sort((a: number, b: number) => b - a);

    const cancelOps = indicesToCancel.map((index: number) =>
      this.cartService.cancelItem(this.table, index)
    );

    concat(...cancelOps).pipe(
      finalize(() => {
        console.log(`Cancelled ${quantity} item(s)`);
        this.loadTable(true);
      })
    ).subscribe({
      next: (res) => console.log('Item cancelled:', res),
      error: (err) => console.error('Cancel failed:', err)
    });
  }

  loadTable(fromDeleteMethod?: any) {
    this.selectedItems.clear();
    const sequence = ++this.loadSequence;
    this.isLoading = true;
    this.loadError = '';
    this.cdr.markForCheck();

    this.cartService.getCart(this.table).subscribe({
      next: (res) => {
        if (sequence !== this.loadSequence) {
          return;
        }
        this.cartItems = res as any[];
        this.groupedItems = this.groupCartItems();
        this.totalPrice = this.cartItems.reduce(
          (sum, item) => sum + item.price,
          0
        );
        this.cdr.markForCheck();
        if (this.cartItems?.length === 0 && fromDeleteMethod) {
          this.close();
        }
      },
      error: (err) => {
        if (sequence !== this.loadSequence) {
          return;
        }
        this.isLoading = false;
        this.loadError = this.cartLoadErrorMessage(err);
        this.cdr.markForCheck();
        console.error('Failed to load cart:', err);
      },
      complete: () => {
        if (sequence === this.loadSequence) {
          this.isLoading = false;
          this.cdr.markForCheck();
        }
      },
    });
  }

  private cartLoadErrorMessage(error: any): string {
    if (!navigator.onLine) {
      return 'The phone is offline. Check Wi-Fi and try again.';
    }
    if (error?.name === 'TimeoutError') {
      return 'The local server did not respond in time! The connection may be switching between mesh routers.';
    }
    if (error?.status === 0) {
      return 'The phone is connected to Wi-Fi, but the local server cannot be reached.';
    }
    if (error?.status >= 500) {
      return `The local server returned an error (${error.status}).`;
    }
    return 'The table could not be loaded. Please try again.';
  }

async submit() {
  if (this.isPrinting || this.isRemoving || this.isLoading || this.loadError ||
      this.selectionMode || this.removalMode || this.unprintedCount === 0) return;
  this.isPrinting = true;
  this.cdr.markForCheck();
  const request = {
    table: this.table,
    tableName: this.tableName || String(this.table),
    items: this.cartItems
  };

  this.cartService.printItems(this.table, request).pipe(
    takeUntil(this.destroy$),
    finalize(() => {
      this.isPrinting = false;
      this.cdr.markForCheck();
    })
  ).subscribe({
    next: async (res: any) => {  // If needed, use a proper interface instead of 'any'
      console.log(res);

      const message = res.status
        ? `${res.status}. Items printed: ${res.printedCount ?? 0}`
        : res.error || 'Unknown response';

      // Refresh so the "new" badges and print button reflect the printed flags
      this.loadTable();

      await this.alertModal(message);
    },
    error: (err) => {
      console.error('Failed to send items to backend:', err);
      // The server may have accepted the request before the response was lost.
      // Refresh its flags, but never automatically repeat a print POST.
      this.loadTable();
      void this.alertModal(
        'Δεν επιβεβαιώθηκε η αποστολή για εκτύπωση. Ελέγξτε αν βγήκε το χαρτάκι πριν δοκιμάσετε ξανά. ' +
        'Αν υπάρχει πρόβλημα σύνδεσης, κλείστε και ξανανοίξτε το Wi-Fi και περιμένετε να συνδεθεί στο δίκτυο του καταστήματος.'
      );
    },
  });
}

async alertModal(message: string) {
  const alert = await this.alertController.create({
    header: 'Εκτύπωση',
    message: message,
    buttons: [
      {
        text: 'OK',
        role: 'ok',
        handler: () => {
          console.log('Alert dismissed');
        },
      }
    ],
  });

  await alert.open();
}

async moveTable() {
    // If already in selection mode, proceed to table selection
    if (this.selectionMode) {
      // If no items selected in selection mode, select all
      if (this.selectedItems.size === 0) {
        this.groupedItems.forEach(item => this.selectedItems.add(item));
      }

      const modal = await this.modalCtrl.create({
        component: SelectTableComponent,
        componentProps: { 
          table: this.table,
          selectedItems: Array.from(this.selectedItems),
          cartItems: this.cartItems
        },
      });
      await modal.open();
      const { data } = await modal.afterClosed();
      if(data && data.res && data.res.success){
        this.close()
      }
      return;
    }

    // Show move options alert
    const alert = await this.alertController.create({
      header: 'Μετακίνηση αντικειμένων',
      message: 'Πώς θα θέλατε να προχωρήσουμε;',
      cssClass: 'move-options-alert',
      buttons: [
        {
          text: 'Ακύρωση',
          role: 'cancel',
          cssClass: 'alert-button-cancel',
          handler: () => {
            console.log('Move cancelled');
          },
        },
        {
          text: 'Όλα',
          cssClass: 'alert-button-all',
          handler: () => {
            // Select all items and proceed to table selection
            this.groupedItems.forEach(item => this.selectedItems.add(item));
            this.proceedToTableSelection();
          },
        },
        {
          text: 'Μερικά',
          cssClass: 'alert-button-select',
          handler: () => {
            // Enable selection mode so user can select specific items
            this.selectionMode = true;
            this.cdr.markForCheck();
          },
        },
      ],
    });

    await alert.open();
  }

  private async proceedToTableSelection() {
    const modal = await this.modalCtrl.create({
      component: SelectTableComponent,
      componentProps: { 
        table: this.table,
        selectedItems: Array.from(this.selectedItems),
        cartItems: this.cartItems
      },
    });
    await modal.open();
    const { data } = await modal.afterClosed();
    if(data && data.res && data.res.success){
      this.close()
    }
  }

  async addNewItem() {
    // Show a simple category/item selection interface
    const modal = await this.modalCtrl.create({
      component: ItemSelectionModalComponent,
      componentProps: { categories: this.categories },
    });
    await modal.open();

    const { data } = await modal.afterClosed();

    if (data?.item) {
      // Open the item detail modal with the selected item
      await this.openItemDetailModal(data.item, data.categoryName);
    }
  }

  private async openItemDetailModal(item: any, categoryName: string) {
    const modal = await this.modalCtrl.create({
      component: ItemDetailModalComponent,
      componentProps: { item, categoryName },
    });
    await modal.open();

    const { data } = await modal.afterClosed();

    if (data?.finalItem) {
      const quantity = data.quantity || 1;
      const requests = Array.from({ length: quantity }, () =>
        this.cartService.addItemToCart(this.table, data.finalItem)
      );

      concat(...requests).pipe(
        finalize(() => this.loadTable())
      ).subscribe({
        next: (res) => console.log('Item added to cart:', res),
        error: (err) => {
          console.error('Add to cart failed:', err);
          this.alertModal('Failed to add item(s) to cart.');
        },
        complete: () => console.log(`All ${quantity} items added to cart`)
      });
    }
  }

}
