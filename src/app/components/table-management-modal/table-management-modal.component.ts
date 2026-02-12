import { Component, Input, OnInit } from '@angular/core';
import { AlertController, ModalController } from '@ionic/angular';
import { CartService } from 'src/app/services/cart.service';
import { ItemDetailModalComponent } from '../item-detail-modal/item-detail-modal.component';
import { SelectTableComponent } from '../select-table/select-table.component';

@Component({
  selector: 'app-table-management-modal',
  templateUrl: './table-management-modal.component.html',
  styleUrls: ['./table-management-modal.component.scss'],
  standalone: false,
})
export class TableManagementModalComponent implements OnInit {
  @Input() table: any;
  cartItems: any[] = [];
  groupedItems: any[] = [];
  totalPrice: any;

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
    const alert = await this.alertController.create({
      header: 'Επιβεβαίωση Διαγραφής',
      message: groupedItem.quantity > 1 
        ? `Είστε σίγουροι ότι θέλετε να διαγράψετε ένα από τα ${groupedItem.quantity} "${groupedItem.name}" προϊόντα;`
        : `Είστε σίγουροι ότι θέλετε να διαγράψετε το προϊόν "${groupedItem.name}"?`,
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
            // Delete the first occurrence of this item
            const indexToDelete = groupedItem.indices[0];
            this.cartService.deleteItemFromTable(this.table, indexToDelete).subscribe({
              next: (res) => {
                console.log('Item deleted from cart:', res);
                this.loadTable(true);
              },
              error: (err) => console.error('Delete from cart failed:', err),
            });
          },
        },
      ],
    });

    await alert.present();
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
    const modal = await this.modalCtrl.create({
      component: SelectTableComponent,
      componentProps: { table:this.table },
    });
    await modal.present();
        const { data } = await modal.onDidDismiss();
        if(data&& data.res&&data.res.success){
          this.close()
        }
  }


}
