import { Component, OnInit } from '@angular/core';
import { CartService } from '../services/cart.service';
import { AlertController, IonicModule, ModalController } from '@ionic/angular';
import { TableManagementModalComponent } from '../components/table-management-modal/table-management-modal.component';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-tab2',
  templateUrl: './tab2.page.html',
  styleUrls: ['./tab2.page.scss'],
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
  ],
})
export class Tab2Page implements OnInit {
  activeTables: string[] = [];

  constructor(
    private cartService: CartService,
    private modalCtrl: ModalController,
    private alertController: AlertController
  ) {}

  ngOnInit() {
    this.loadTables();
  }

  ionViewWillEnter() {
    this.loadTables();
  }

  loadTables() {
    this.cartService.getActiveTables().subscribe({
      next: (res) => {
        this.activeTables = Object.keys(res);
      },
      error: async (err) => {
        console.error('Failed to load active tables:', err);
        await this.alertModal(
          'Could not load active tables. Please check your connection or try again later.'
        );
      },
    });
  }

  async openTableModal(table: any) {
    const modal = await this.modalCtrl.create({
      component: TableManagementModalComponent,
      componentProps: { table },
    });
    await modal.present();

    const { data } = await modal.onDidDismiss();
    this.loadTables();

    if (data?.finalItem) {
      console.log('Received from modal:', data.finalItem);
    }
  }

  onSelectTable(tableName: string) {
    // this.selectedTableName = tableName;
  }

  async deleteItem(table: any) {
    const alert = await this.alertController.create({
      header: 'Confirm Deletion',
      message: 'Are you sure you want to delete this table?',
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
            this.cartService.clearCart(table).subscribe({
              next: (res) => {
                console.log('deleted  cart:', res);
                this.loadTables();
              },
              error: (err) => console.error('Delete cart failed:', err),
            });
          },
        },
      ],
    });

    await alert.present();
  }

  async alertModal(message: string) {
    const alert = await this.alertController.create({
      header: 'Error',
      message: message,
      buttons: [
        {
          text: 'OK',
          role: 'cancel',
          handler: () => {
            console.log('Error alert dismissed');
          },
        },
      ],
    });

    await alert.present();
  }
}
