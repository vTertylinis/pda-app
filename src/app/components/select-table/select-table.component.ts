import { Component, Input, OnInit } from '@angular/core';
import { AlertController, ModalController } from '@ionic/angular';
import { CartService } from 'src/app/services/cart.service';

@Component({
  selector: 'app-select-table',
  templateUrl: './select-table.component.html',
  styleUrls: ['./select-table.component.scss'],
  standalone: false,
})
export class SelectTableComponent implements OnInit {
  @Input() table: any;
  tables = Array.from({ length: 40 }, (_, i) => ({ name: (i + 1).toString() }));
  toTable: string | null = null;

  constructor(
    private modalCtrl: ModalController,
    private cartService: CartService,
    private alertController: AlertController
  ) {}

  ngOnInit() {}

  close() {
    this.modalCtrl.dismiss({});
  }

  async onSelectTable(tableName: string) {
    this.toTable = tableName;

    const alert = await this.alertController.create({
      header: 'Επιβεβαίωση',
      message: `Είστε σίγουροι ότι θέλετε να μεταφέρετε τις παραγγελίες στο τραπέζι ${this.toTable};`,
      buttons: [
        {
          text: 'Όχι',
          role: 'cancel',
          handler: () => {
            console.log('Μεταφορά ακυρώθηκε');
          },
        },
        {
          text: 'Ναι',
          handler: () => {
            this.movetable();
          },
        },
      ],
    });

    await alert.present();
  }

  async movetable() {
    const request = {
      fromTable: this.table,
      toTable: this.toTable,
    };
    this.cartService.moveTable(request).subscribe({
      next: (res) => {
        this.modalCtrl.dismiss({res});
      },
      error: async (err) => {
        console.error(`Move Failed`, err);
        await this.alertModal(`Failed to move Table`);
      },
    });
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
