import { Component, Input, OnInit } from '@angular/core';
import { AlertController, ModalController, IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { CartService } from 'src/app/services/cart.service';
import { TableService, CustomTable } from 'src/app/services/table.service';

@Component({
  selector: 'app-select-table',
  templateUrl: './select-table.component.html',
  styleUrls: ['./select-table.component.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule]
})
export class SelectTableComponent implements OnInit {
  @Input() table: any;

  predefinedTables = [
    ...Array.from({ length: 40 }, (_, i) => ({ name: (i + 1).toString(), isCustom: false })),
    { name: 'bar1', isCustom: false },
    { name: 'bar2', isCustom: false },
    { name: 'bar3', isCustom: false },
    { name: 'bar4', isCustom: false }
  ];

  tables: any[] = [];
  predefinedTablesList: any[] = [];
  customTablesList: any[] = [];
  customTables: { [key: string]: CustomTable } = {};
  toTable: string | null = null;
  toTableDisplayName: string | null = null;

  constructor(
    private modalCtrl: ModalController,
    private cartService: CartService,
    private tableService: TableService,
    private alertController: AlertController
  ) {}

  ngOnInit() {
    // Subscribe to custom tables updates
    this.tableService.getCustomTables().subscribe(customTables => {
      this.customTables = customTables;
      this.updateTablesList();
    });
    this.updateTablesList();
  }

  // Update the combined tables list
  updateTablesList() {
    // Start with predefined tables
    this.predefinedTablesList = this.predefinedTables.map(t => ({
      name: t.name,
      isCustom: false
    }));

    // Add custom tables
    this.customTablesList = Object.values(this.customTables)
      .filter(ct => ct.active)
      .map(customTable => ({
        name: customTable.id,
        displayName: customTable.name,
        isCustom: true,
        customTableId: customTable.id
      }));

    // Combine for reference
    this.tables = [...this.predefinedTablesList, ...this.customTablesList];
  }

  close() {
    this.modalCtrl.dismiss({});
  }

  async onSelectTable(table: any) {
    this.toTable = table.name;
    this.toTableDisplayName = table.displayName || table.name;

    const alert = await this.alertController.create({
      header: 'Επιβεβαίωση',
      message: `Είστε σίγουροι ότι θέλετε να μεταφέρετε τις παραγγελίες στο τραπέζι ${this.toTableDisplayName};`,
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
        this.modalCtrl.dismiss({ res });
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
