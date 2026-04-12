import { Component, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { AlertController, ModalController, IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { concat, Subscription } from 'rxjs';
import { debounceTime } from 'rxjs/operators';

import { ItemDetailModalComponent } from '../components/item-detail-modal/item-detail-modal.component';
import { TableManagementModalComponent } from '../components/table-management-modal/table-management-modal.component';
import { CartService } from '../services/cart.service';
import { TableService, CustomTable } from '../services/table.service';
import { CATEGORIES } from '../models/categories';

@Component({
  selector: 'app-tab1',
  templateUrl: './tab1.page.html',
  styleUrls: ['./tab1.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class Tab1Page implements OnDestroy {
  private customTablesSub?: Subscription;

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
    private alertController: AlertController,
    private cdr: ChangeDetectorRef
  ) {
    this.initializeTables();
  }

  ionViewWillEnter() {
    this.selectedTableName = null;
    this.selectedCategory = null;
    this.searchQuery = '';
    this.filteredItems = [];
    this.showNewTableInput = false;

    // Re-subscribe every time page becomes active
    if (!this.customTablesSub || this.customTablesSub.closed) {
      this.customTablesSub = this.tableService.getCustomTables().pipe(
        debounceTime(300)
      ).subscribe(customTables => {
        this.customTables = customTables;
        this.updateTablesList();
        this.cdr.markForCheck();
      });
    }
  }

  ionViewWillLeave() {
    this.filteredItems = [];

    // Unsubscribe when leaving the tab
    if (this.customTablesSub) {
      this.customTablesSub.unsubscribe();
      this.customTablesSub = undefined;
    }
  }

  initializeTables() {
    this.updateTablesList();
  }

  updateTablesList() {
    this.predefinedTablesList = this.predefinedTables.map(t => ({
      name: t.name,
      isCustom: false
    }));

    this.customTablesList = Object.values(this.customTables)
      .filter(ct => ct.active)
      .map(customTable => ({
        name: customTable.id,
        displayName: customTable.name,
        isCustom: true,
        customTableId: customTable.id
      }));

    this.tables = [...this.predefinedTablesList, ...this.customTablesList];
  }

  async createNewTable() {
    if (!this.newTableName.trim()) {
      await this.alertModal('Please enter a table name', 'Error');
      return;
    }

    this.tableService.createCustomTable(this.newTableName.trim()).subscribe({
      next: (response) => {
        if (response.success) {
          this.newTableName = '';
          this.showNewTableInput = false;
          this.cdr.markForCheck();
          this.alertModal(`Table "${response.table.name}" created successfully!`, 'Success');
        }
      },
      error: async (err) => {
        console.error('Failed to create table:', err);
        await this.alertModal(`Failed to create table. ${err.error?.message || err.message}`, 'Error');
      }
    });
  }

  async deleteCustomTable(tableId: string) {
    const customTable = this.customTables[tableId];
    if (!customTable) {
      await this.alertModal('Table not found', 'Error');
      return;
    }

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
                this.alertModal('Table deleted successfully', 'Success');
              },
              error: async (err) => {
                console.error('Failed to delete table:', err);
                await this.alertModal(`Failed to delete table. ${err.error?.message || err.message}`, 'Error');
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

    const normalizedQuery = this.removeDiacritics(query);

    this.filteredItems = [];
    this.categories.forEach((category) => {
      category.items.forEach((item) => {
        const normalizedItemName = this.removeDiacritics(item.name.toLowerCase());
        if (normalizedItemName.includes(normalizedQuery)) {
          this.filteredItems.push({
            ...item,
            categoryName: category.name,
          });
        }
      });
    });
  }

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
      const requests = Array.from({ length: quantity }, () =>
        this.cartService.addItemToCart(this.selectedTableName, data.finalItem)
      );

      concat(...requests).subscribe({
        next: (res) => console.log('Item added to cart:', res),
        error: async (err) => {
          console.error('Add to cart failed:', err);
          await this.alertModal(
            `Failed to add item to cart. Error: ${err.message || err}`,
            'Error'
          );
        },
        complete: () => {
          console.log(`All ${quantity} items added to cart`);
          if (this.selectedTableName) {
            this.openTableManagementModal(this.selectedTableName);
          }
        }
      });
    }
  }

  private async openTableManagementModal(tableName: string) {
    const modal = await this.modalCtrl.create({
      component: TableManagementModalComponent,
      componentProps: {
        table: tableName,
        tableName,
      },
    });

    await modal.present();

    const { data } = await modal.onDidDismiss();
    if (data?.finalItem) {
      console.log('Returned from table management modal with item:', data.finalItem);
    }
  }

  ngOnDestroy() {
    if (this.customTablesSub) {
      this.customTablesSub.unsubscribe();
    }
  }

  trackByName(index: number, item: any): string {
    return item.name;
  }

  trackByCategoryName(index: number, category: any): string {
    return category.name;
  }

  async alertModal(message: string, header: string = 'Notification') {
    const alert = await this.alertController.create({
      header,
      message,
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