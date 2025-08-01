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
  totalPrice: any;

  constructor(
    private modalCtrl: ModalController,
    private cartService: CartService,
    private alertController: AlertController
  ) {}

  ngOnInit() {
    this.loadTable();
  }

  close() {
    this.modalCtrl.dismiss({});
  }

  async editItem(item: any, categoryName: any, index: any) {
    const modal = await this.modalCtrl.create({
      component: ItemDetailModalComponent,
      componentProps: { item, categoryName, editMode: true },
    });
    await modal.present();

    const { data } = await modal.onDidDismiss();

    if (data?.finalItem) {
      this.cartService.editItem(this.table, index, data.finalItem).subscribe({
        next: (res) => {
          console.log('Item edit to cart:', res);
          this.loadTable();
        },
        error: (err) => console.error('Edit to cart failed:', err),
      });
    }
  }

  async deleteItem(index: any) {
    const alert = await this.alertController.create({
      header: 'Confirm Deletion',
      message: 'Are you sure you want to delete this item?',
      buttons: [
        {
          text: 'No',
          role: 'cancel',
          handler: () => {
            console.log('Deletion cancelled');
          },
        },
        {
          text: 'Yes',
          handler: () => {
            this.cartService.deleteItemFromTable(this.table, index).subscribe({
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
