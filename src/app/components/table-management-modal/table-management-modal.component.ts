import { Component, Input, OnInit, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { AlertController, ModalController, IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { CartService } from 'src/app/services/cart.service';
import { ItemDetailModalComponent } from '../item-detail-modal/item-detail-modal.component';
import { SelectTableComponent } from '../select-table/select-table.component';
import { ItemSelectionModalComponent } from '../item-selection-modal/item-selection-modal.component';
import { CATEGORIES } from 'src/app/models/categories';
import { concat } from 'rxjs';
import { finalize } from 'rxjs/operators';

@Component({
  selector: 'app-table-management-modal',
  templateUrl: './table-management-modal.component.html',
  styleUrls: ['./table-management-modal.component.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TableManagementModalComponent implements OnInit {
  @Input() table: any;
  @Input() tableName: string = '';
  cartItems: any[] = [];
  groupedItems: any[] = [];
  totalPrice: any;
  categories = CATEGORIES;
  selectedItems: Set<any> = new Set();
  selectionMode: boolean = false;

  constructor(
    private modalCtrl: ModalController,
    private cartService: CartService,
    private alertController: AlertController,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.loadTable();
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
          indices: []
        };
      }
      
      grouped[key].quantity++;
      grouped[key].indices.push(index);
    });

    return Object.values(grouped);
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
    this.modalCtrl.dismiss({});
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

  async editItem(groupedItem: any, categoryName: any) {
    // Edit the first item in the group
    const indexToEdit = groupedItem.indices[0];
    const item = this.cartItems[indexToEdit];

    const modal = await this.modalCtrl.create({
      component: ItemDetailModalComponent,
      componentProps: { item, categoryName, editMode: true },
    });
    await modal.present();

    const { data } = await modal.onDidDismiss();

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
      await quantityAlert.present();
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
      await alert.present();
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

  loadTable(fromDeleteMethod?: any) {
    this.cartService.getCart(this.table).subscribe({
      next: (res) => {
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
    next: async (res: any) => {  // If needed, use a proper interface instead of 'any'
      console.log(res);

      const message = res.status
        ? `${res.status}. Items printed: ${res.printedCount ?? 0}`
        : res.error || 'Unknown response';

      await this.alertModal(message);
    },
    error: (err) => {
      console.error('Failed to send items to backend:', err);
    },
  });
}

async alertModal(message: string) {
  const alert = await this.alertController.create({
    header: 'Backend Response',
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
      await modal.present();
      const { data } = await modal.onDidDismiss();
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

    await alert.present();
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
    await modal.present();
    const { data } = await modal.onDidDismiss();
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

  trackByIndex(index: number): number {
    return index;
  }

}
