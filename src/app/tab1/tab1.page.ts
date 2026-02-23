import { Component, OnInit } from '@angular/core';
import { AlertController, ModalController, IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ItemDetailModalComponent } from '../components/item-detail-modal/item-detail-modal.component';
import { CartService } from '../services/cart.service';
import { TableService, CustomTable } from '../services/table.service';
import { CATEGORIES } from '../models/categories';

@Component({
  selector: 'app-tab1',
  templateUrl: './tab1.page.html',
  styleUrls: ['./tab1.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule]
})
export class Tab1Page implements OnInit {
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
  categories = CATEGORIES;
  selectedTableName: string | null = null;
  selectedCategory: any = null;
  searchQuery: string = '';
  filteredItems: any[] = [];
  customTables: { [key: string]: CustomTable } = {};
  newTableName: string = '';
  showNewTableInput: boolean = false;

  constructor(
    private modalCtrl: ModalController,
    private cartService: CartService,
    private tableService: TableService,
    private alertController: AlertController
  ) {
    this.initializeTables();
  }

  ngOnInit() {
    // Subscribe to custom tables updates
    this.tableService.getCustomTables().subscribe(customTables => {
      this.customTables = customTables;
      this.updateTablesList();
    });
  }

  ionViewWillEnter() {
    this.selectedTableName = null;
    this.selectedCategory = null;
    this.searchQuery = '';
    this.filteredItems = [];
    this.showNewTableInput = false;
  }

  // Initialize tables - merge predefined and custom
  initializeTables() {
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

  // Create a new custom table
  async createNewTable() {
    if (!this.newTableName.trim()) {
      await this.alertModal('Please enter a table name');
      return;
    }

    this.tableService.createCustomTable(this.newTableName.trim()).subscribe({
      next: (response) => {
        if (response.success) {
          this.newTableName = '';
          this.showNewTableInput = false;
          this.alertModal(`Table "${response.table.name}" created successfully!`);
        }
      },
      error: async (err) => {
        console.error('Failed to create table:', err);
        await this.alertModal(`Failed to create table. ${err.error?.message || err.message}`);
      }
    });
  }

  // Delete a custom table
  async deleteCustomTable(tableId: string) {
    const customTable = this.customTables[tableId];
    if (!customTable) return;

    const alert = await this.alertController.create({
      header: 'Επιβεβαίωση Διαγραφής',
      message: `Είστε σίγουροι ότι θέλετε να διαγράψετε το προσωρινό τραπέζι "${customTable.name}"?`,
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Delete',
          role: 'destructive',
          handler: () => {
            this.tableService.deleteCustomTable(tableId).subscribe({
              next: () => {
                this.alertModal('Table deleted successfully');
              },
              error: async (err) => {
                console.error('Failed to delete table:', err);
                await this.alertModal(`Failed to delete table. ${err.error?.message || err.message}`);
              }
            });
          }
        }
      ]
    });

    await alert.present();
  }

  onSelectTable(tableName: string) {
    this.selectedTableName = tableName;
  }

  onBack() {
    this.selectedTableName = null;
    this.selectedCategory = null;
    this.searchQuery = '';
    this.filteredItems = [];
  }

  onSelectCategory(category: any) {
    this.selectedCategory = category;
  }

  onBackToCategories() {
    this.selectedCategory = null;
    this.searchQuery = '';
    this.filteredItems = [];
  }

  onSearch(event: any) {
    const query = event.detail.value.trim().toLowerCase();
    this.searchQuery = query;

    if (!query) {
      this.filteredItems = [];
      return;
    }

    // Normalize and remove diacritics from query
    const normalizedQuery = this.removeDiacritics(query);

    this.filteredItems = [];
    this.categories.forEach((category) => {
      category.items.forEach((item) => {
        const normalizedItemName = this.removeDiacritics(
          item.name.toLowerCase()
        );
        if (normalizedItemName.includes(normalizedQuery)) {
          this.filteredItems.push({
            ...item,
            categoryName: category.name,
          });
        }
      });
    });
  }

  // Helper function to remove diacritics
  removeDiacritics(text: string): string {
    return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }

  async openItemModal(item: any, categoryName?: string) {
    const modal = await this.modalCtrl.create({
      component: ItemDetailModalComponent,
      componentProps: { item, categoryName },
    });
    await modal.present();

    const { data } = await modal.onDidDismiss();

    if (data?.finalItem) {
      const quantity = data.quantity || 1;
      for (let i = 0; i < quantity; i++) {
        this.cartService
          .addItemToCart(this.selectedTableName, data.finalItem)
          .subscribe({
            next: (res) => console.log(`Item #${i + 1} added to cart:`, res),
            error: async (err) => {
              console.error(`Add to cart failed on item #${i + 1}:`, err);
              await this.alertModal(
                `Failed to add item #${i + 1} to cart. Error: ${
                  err.message || err
                }`
              );
            },
          });
      }
    }
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
            console.log('Alert dismissed');
          },
        },
      ],
    });

    await alert.present();
  }
}
