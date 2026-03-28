import { Component, Input, OnInit } from '@angular/core';
import { AlertController, ModalController, IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { CartService } from 'src/app/services/cart.service';
import { ItemDetailModalComponent } from '../item-detail-modal/item-detail-modal.component';
import { SelectTableComponent } from '../select-table/select-table.component';
import { ItemSelectionModalComponent } from '../item-selection-modal/item-selection-modal.component';
import { CATEGORIES } from 'src/app/models/categories';

@Component({
  selector: 'app-table-management-modal',
  templateUrl: './table-management-modal.component.html',
  styleUrls: ['./table-management-modal.component.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule]
})
export class TableManagementModalComponent implements OnInit {
  @Input() table: any;
  @Input() tableName: string = '';
  cartItems: any[] = [];
  groupedItems: any[] = [];
  totalPrice: any;
  selectedTotal: number = 0;
  categories = CATEGORIES;

  constructor(
    private modalCtrl: ModalController,
    private cartService: CartService,
    private alertController: AlertController
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
          indices: [],
          selectedQuantity: 0
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
    // Delete items in reverse order to avoid index shifting
    const indicesToDelete = groupedItem.indices
      .slice(0, quantity)
      .sort((a: number, b: number) => b - a);

    this.deleteItemsByIndices(indicesToDelete);
  }

  private deleteItemsByIndices(indicesToDelete: number[]) {
    let deleteCount = 0;

    const deleteNext = () => {
      if (deleteCount >= indicesToDelete.length) {
        console.log(`Deleted ${indicesToDelete.length} item(s) from cart`);
        this.loadTable(true);
        return;
      }

      const indexToDelete = indicesToDelete[deleteCount];
      deleteCount++;

      this.cartService.deleteItemFromTable(this.table, indexToDelete).subscribe({
        next: (res) => {
          console.log('Item deleted from cart:', res);
          deleteNext();
        },
        error: (err) => {
          console.error('Delete from cart failed:', err);
          deleteNext();
        },
      });
    };

    deleteNext();
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

  async paySelectedItems() {
    const selectedItems = this.getSelectedItems();

    if (!selectedItems.length) {
      await this.alertModal('Please select at least one item.');
      return;
    }

    const request = {
      table: this.table,
      items: selectedItems
    };

    this.cartService.printItems(this.table, request).subscribe({
      next: async (res: any) => {
        console.log(res);

        const message = res.status
          ? `${res.status}. Items printed: ${res.printedCount ?? 0}`
          : res.error || 'Unknown response';

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
    await this.alertModal('Please select at least one item.');
    return;
  }

  await this.askToRemovePaidItems();
}

 async askToRemovePaidItems() {
    const selectedIndices = this.getSelectedIndices();

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
            this.deleteItemsByIndices(selectedIndices);
          },
        },
      ],
    });

    await alert.present();
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
    const modal = await this.modalCtrl.create({
      component: SelectTableComponent,
      componentProps: { table: this.table },
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
      let successCount = 0;
      let failureCount = 0;

      for (let i = 0; i < quantity; i++) {
        this.cartService
          .addItemToCart(this.table, data.finalItem)
          .subscribe({
            next: (res) => {
              successCount++;
              console.log(`Item #${successCount} added to cart:`, res);

              if (i === quantity - 1 || successCount + failureCount === quantity) {
                this.loadTable();
              }
            },
            error: (err) => {
              failureCount++;
              console.error(`Add to cart failed on item #${i + 1}:`, err);

              if (i === quantity - 1 || successCount + failureCount === quantity) {
                this.loadTable();
                if (failureCount > 0) {
                  this.alertModal(
                    `${failureCount} item(s) failed to add to cart. ${successCount} item(s) added successfully.`
                  );
                }
              }
            },
          });
      }
    }
  }
}