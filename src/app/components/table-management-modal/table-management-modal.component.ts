import { Component, Input, OnInit, OnDestroy, inject } from '@angular/core';
import { AlertController, ModalController, IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { CartService } from 'src/app/services/cart.service';
import { TableService } from 'src/app/services/table.service';
import { ItemDetailModalComponent } from '../item-detail-modal/item-detail-modal.component';
import { SelectTableComponent } from '../select-table/select-table.component';
import { ItemSelectionModalComponent } from '../item-selection-modal/item-selection-modal.component';
import { CATEGORIES } from 'src/app/models/categories';
import { Subject } from 'rxjs';
import { finalize, takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-table-management-modal',
  templateUrl: './table-management-modal.component.html',
  styleUrls: ['./table-management-modal.component.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule]
})
export class TableManagementModalComponent implements OnInit, OnDestroy {
  private modalCtrl = inject(ModalController);
  private cartService = inject(CartService);
  private tableService = inject(TableService);
  private alertController = inject(AlertController);

  @Input() table: any;
  @Input() tableName: string = '';
  cartItems: any[] = [];
  groupedItems: any[] = [];
  totalPrice: any;
  selectedTotal: number = 0;
  categories = CATEGORIES;
  private destroy$ = new Subject<void>();
  private loadSequence = 0;
  private selectionVersion = 0;
  private isDeleting = false;
  private destroyed = false;

  ngOnInit() {
    this.loadTable();
    this.tableService.refreshRequired$.pipe(takeUntil(this.destroy$)).subscribe(() => {
      if (!this.isDeleting) this.loadTable();
    });

    // React to cart changes pushed from the server (e.g. another device edits
    // this table). The socket lives in TableService; tab2 already listens the
    // same way. A changed cart invalidates selections based on item indices;
    // our own batch deletion refreshes once it completes.
    this.tableService.cartUpdates$.pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (data: any) => {
        if (!this.isUpdateForThisTable(data)) {
          return;
        }
        if (this.isDeleting) return;
        this.loadTable();
      },
      error: (err) => console.error('Error subscribing to cart updates:', err),
    });
  }

  ngOnDestroy() {
    this.destroyed = true;
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
          members: [],
          selectedQuantity: 0
        };
      }

      grouped[key].quantity++;
      if (!item.printed) {
        grouped[key].unprintedCount++;
      }
      grouped[key].indices.push(index);
      grouped[key].members.push(structuredClone(item));
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
      decaf: item.decaf === true,
      extras: item.extras?.map((e: any) => e.name).sort().join(',') || '',
      comments: item.comments || ''
    });
  }

  close() {
    this.modalCtrl.dismiss({});
  }

  /**
   * Toggles selection when tapping anywhere on a row.
   * Single-quantity items toggle on/off; multi-quantity items toggle
   * between none selected and all selected.
   */
  onRowToggle(groupedItem: any) {
    if (groupedItem.quantity === 1) {
      groupedItem.selectedQuantity = groupedItem.selectedQuantity === 1 ? 0 : 1;
    } else {
      const allSelected = (groupedItem.selectedQuantity || 0) >= groupedItem.quantity;
      groupedItem.selectedQuantity = allSelected ? 0 : groupedItem.quantity;
    }

    this.updateSelectedTotal();
  }

  onSelectedQuantityChange(groupedItem: any, event: any) {
    const value = Number(event?.detail?.value ?? 0);

    if (isNaN(value) || value < 0) {
      groupedItem.selectedQuantity = 0;
    } else if (value > groupedItem.quantity) {
      groupedItem.selectedQuantity = groupedItem.quantity;
    } else {
      groupedItem.selectedQuantity = value;
    }

    this.updateSelectedTotal();
  }

  updateSelectedTotal() {
    this.selectedTotal = this.groupedItems.reduce((sum, item) => {
      return sum + ((item.selectedQuantity || 0) * item.price);
    }, 0);
  }

  clearSelection() {
    this.groupedItems.forEach(item => {
      item.selectedQuantity = 0;
    });

    this.updateSelectedTotal();
  }

  toggleSelectAll() {
    const hasAnyUnselected = this.groupedItems.some(
      item => (item.selectedQuantity || 0) < item.quantity
    );

    this.groupedItems.forEach(item => {
      item.selectedQuantity = hasAnyUnselected ? item.quantity : 0;
    });

    this.updateSelectedTotal();
  }

  get hasSelection(): boolean {
    return this.groupedItems.some(item => (item.selectedQuantity || 0) > 0);
  }

  getSelectedItems(): any[] {
    const selectedItems: any[] = [];

    this.groupedItems.forEach(groupedItem => {
      const quantityToPay = groupedItem.selectedQuantity || 0;

      if (quantityToPay > 0) {
        const selectedIndices = groupedItem.indices.slice(0, quantityToPay);

        selectedIndices.forEach((index: number) => {
          const item = this.cartItems[index];
          if (item) {
            selectedItems.push(item);
          }
        });
      }
    });

    return selectedItems;
  }

  getSelectedIndices(): number[] {
    const selectedIndices: number[] = [];

    this.groupedItems.forEach(groupedItem => {
      const quantityToRemove = groupedItem.selectedQuantity || 0;

      if (quantityToRemove > 0) {
        selectedIndices.push(...groupedItem.indices.slice(0, quantityToRemove));
      }
    });

    return selectedIndices.sort((a, b) => b - a);
  }

  async editItem(groupedItem: any, categoryName: any) {
    // Edit the first item in the group
    const item = groupedItem.members[0];
    const expectedItem = structuredClone(item);

    const modal = await this.modalCtrl.create({
      component: ItemDetailModalComponent,
      componentProps: { item, categoryName, editMode: true },
    });
    await modal.present();

    const { data } = await modal.onDidDismiss();

    if (data?.finalItem) {
      this.cartService.editItem(this.table, expectedItem, data.finalItem).subscribe({
        next: (res) => {
          console.log('Item edit to cart:', res);
          this.loadTable();
        },
        error: (err) => {
          this.loadTable();
          void this.alertModal(err.status === 409
            ? 'Το είδος άλλαξε σε άλλη συσκευή. Επιλέξτε το ξανά.'
            : 'Δεν επιβεβαιώθηκε η αλλαγή. Ελέγξτε την παραγγελία πριν δοκιμάσετε ξανά.');
        },
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
            const itemToDuplicate = groupedItem.members[0];
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

    await alert.present();
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
          },
          {
            text: 'Διαγραφή',
            handler: (data) => {
              const quantity = parseInt(data.quantity, 10);
              if (isNaN(quantity) || quantity < 1 || quantity > groupedItem.quantity) {
                return false;
              }

              this.performDelete(groupedItem, quantity);
              return true;
            },
          },
        ],
      });
      await quantityAlert.present();
    } else {
      const alert = await this.alertController.create({
        header: 'Επιβεβαίωση Διαγραφής',
        message: `Είστε σίγουροι ότι θέλετε να διαγράψετε το προϊόν "${groupedItem.name}"?`,
        buttons: [
          {
            text: 'Όχι',
            role: 'cancel',
          },
          {
            text: 'Ναι',
            handler: () => {
              this.performDelete(groupedItem, 1);
            },
          },
        ],
      });
      await alert.present();
    }
  }

  private performDelete(groupedItem: any, quantity: number) {
    if (!this.groupedItems.includes(groupedItem)) {
      void this.alertModal('Το τραπέζι ενημερώθηκε. Επιλέξτε ξανά τα είδη.');
      return;
    }
    this.deleteItems(groupedItem.members.slice(0, quantity));
  }

  private deleteItems(expectedItems: any[]) {
    if (this.isDeleting) return;
    this.isDeleting = true;
    this.cartService.deleteItemFromTable(this.table, expectedItems).pipe(
      takeUntil(this.destroy$),
      finalize(() => {
        this.isDeleting = false;
        if (!this.destroyed) this.loadTable(true);
      })
    ).subscribe({
      error: err => {
        console.error('Delete from cart failed:', err);
        void this.alertModal('Η αφαίρεση δεν ολοκληρώθηκε. Ελέγξτε τα είδη πριν δοκιμάσετε ξανά.');
      }
    });
  }

  loadTable(fromDeleteMethod?: any) {
    const sequence = ++this.loadSequence;
    this.selectionVersion++;
    this.cartService.getCart(this.table).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res) => {
        if (sequence !== this.loadSequence) return;
        this.cartItems = res as any[];
        this.groupedItems = this.groupCartItems();
        this.totalPrice = this.cartItems.reduce(
          (sum, item) => sum + item.price,
          0
        );
        this.selectedTotal = 0;

        if (this.cartItems?.length === 0 && fromDeleteMethod) {
          this.close();
        }
      },
      error: (err) => {
        console.error('Failed to load active tables:', err);
      },
    });
  }

  async submit() {
    const request = {
      table: this.table,
      items: this.cartItems
    };

    this.cartService.printItems(this.table, request).subscribe({
      next: async (res: any) => {
        console.log(res);

        const message = this.printResponseMessage(res);

        // Refresh so the "new" badges and print button reflect the printed flags
        this.loadTable();

        await this.alertModal(message);
      },
      error: (err) => {
        console.error('Failed to send items to backend:', err);
      },
    });
  }

  private printResponseMessage(response: any): string {
    if (response.status === 'No new items to print') return 'Δεν υπάρχουν νέα είδη για εκτύπωση.';
    if (response.status === 'Printed new items') {
      return `Στάλθηκαν για εκτύπωση ${response.printedCount ?? 0} είδη.`;
    }
    return 'Δεν επιβεβαιώθηκε η αποστολή για εκτύπωση. Ελέγξτε την παραγγελία.';
  }

  async paySelectedItems() {
    const selectedItems = this.getSelectedItems();

    if (!selectedItems.length) {
      await this.alertModal('Επιλέξτε τουλάχιστον ένα είδος.');
      return;
    }

    const request = {
      table: this.table,
      items: selectedItems
    };

    this.cartService.printItems(this.table, request).subscribe({
      next: async (res: any) => {
        console.log(res);

        const message = this.printResponseMessage(res);

        await this.alertModal(message);

        if (res?.status) {
          await this.askToRemovePaidItems();
        }
      },
      error: (err) => {
        console.error('Failed to send selected items to backend:', err);
      },
    });
  }

  async handleSelectedItems() {
  if (!this.hasSelection) {
    await this.alertModal('Επιλέξτε τουλάχιστον ένα είδος.');
    return;
  }

  await this.askToRemovePaidItems();
}

 async askToRemovePaidItems() {
    const selectionVersion = this.selectionVersion;
    const selectedIndices = this.getSelectedIndices();
    const expectedItems = selectedIndices.map(index => structuredClone(this.cartItems[index]));

    if (!selectedIndices.length) {
      return;
    }

    const alert = await this.alertController.create({
      header: `Αφαίρεση αντικειμένων (€${this.selectedTotal.toFixed(2)})`,
      message: `Θέλετε να αφαιρέσετε τα επιλεγμένα είδη αξίας ${this.selectedTotal.toFixed(2)} € από το τραπέζι;`,
      buttons: [
        {
          text: 'Όχι',
          role: 'cancel',
        },
        {
          text: 'Ναι',
          handler: () => {
            if (selectionVersion !== this.selectionVersion) {
              void this.alertModal('Το τραπέζι ενημερώθηκε. Επιλέξτε ξανά τα είδη.');
              return;
            }
            this.deleteItems(expectedItems);
          },
        },
      ],
    });

    await alert.present();
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

    await alert.present();
  }

  async moveTable() {
    const modal = await this.modalCtrl.create({
      component: SelectTableComponent,
      componentProps: { table: this.table, cartItems: structuredClone(this.cartItems) },
    });
    await modal.present();

    const { data } = await modal.onDidDismiss();
    if (data && data.res && data.res.success) {
      this.close();
    }
  }

  async addNewItem() {
    // Show a simple category/item selection interface
    const modal = await this.modalCtrl.create({
      component: ItemSelectionModalComponent,
      componentProps: { categories: this.categories },
    });
    await modal.present();

    const { data } = await modal.onDidDismiss();

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
    await modal.present();

    const { data } = await modal.onDidDismiss();

    if (data?.finalItem) {
      const quantity = data.quantity || 1;
      this.cartService.addItemToCart(this.table, data.finalItem, quantity).pipe(
        takeUntil(this.destroy$),
        finalize(() => { if (!this.destroyed) this.loadTable(); })
      ).subscribe({
        error: err => {
          console.error('Add to cart failed:', err);
          void this.alertModal('Δεν επιβεβαιώθηκε η προσθήκη. Ελέγξτε την παραγγελία πριν δοκιμάσετε ξανά.');
        }
      });
    }
  }
}
