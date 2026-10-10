import { MenuFavoritesComponent, FavoriteToggleComponent } from '../components/menu-favorites.component';
import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { AlertController, ModalController, ToastController, IonicModule } from '@ionic/angular';
import { DecimalPipe } from '@angular/common';

import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { ItemDetailModalComponent } from '../components/item-detail-modal/item-detail-modal.component';
import { TableManagementModalComponent } from '../components/table-management-modal/table-management-modal.component';
import { TableGridComponent, TableOption, TableActivity } from '../components/table-grid/table-grid.component';
import { CartService } from '../services/cart.service';
import { TableService, CustomTable } from '../services/table.service';
import { CATEGORIES } from '../models/categories';

@Component({
  selector: 'app-tab1',
  templateUrl: './tab1.page.html',
  styleUrls: ['./tab1.page.scss'],
  standalone: true,
  imports: [MenuFavoritesComponent, FavoriteToggleComponent, IonicModule, FormsModule, DecimalPipe, TableGridComponent]
})
export class Tab1Page implements OnInit, OnDestroy {
  private modalCtrl = inject(ModalController);
  private cartService = inject(CartService);
  private tableService = inject(TableService);
  private alertController = inject(AlertController);
  private toastController = inject(ToastController);

  categories = CATEGORIES;
  customTables: { [key: string]: CustomTable } = {};
  activity: { [tableId: string]: TableActivity } = {};

  selectedTable: TableOption | null = null;
  selectedCategory: any = null;
  searchQuery: string = '';
  filteredItems: any[] = [];
  newTableName: string = '';
  showNewTableInput: boolean = false;

  private destroy$ = new Subject<void>();

  ngOnInit() {
    this.tableService.getCustomTables().pipe(
      takeUntil(this.destroy$)
    ).subscribe(customTables => {
      this.customTables = customTables;
    });

    this.cartService.watchActiveTables().pipe(
      takeUntil(this.destroy$)
    ).subscribe((res) => {
      const activity: { [tableId: string]: TableActivity } = {};
      for (const tableId of Object.keys(res.carts)) {
        const items = res.carts[tableId] || [];
        activity[tableId] = {
          count: items.length,
          total: items.reduce((sum: number, item: any) => sum + (Number(item.price) || 0), 0),
          unprinted: items.filter((item: any) => !item.printed).length
        };
      }
      this.activity = activity;
    });
  }

  ionViewWillEnter() {
    this.resetSelection();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private resetSelection() {
    this.selectedTable = null;
    this.selectedCategory = null;
    this.searchQuery = '';
    this.filteredItems = [];
    this.showNewTableInput = false;
    this.newTableName = '';
  }

  /** Activity for the currently selected table (drives the cart summary bar). */
  get selectedActivity(): TableActivity | null {
    if (!this.selectedTable) {
      return null;
    }
    return this.activity[this.selectedTable.name] || null;
  }

  createNewTable() {
    const name = this.newTableName.trim();
    if (!name) {
      this.showToast('Δώστε ένα όνομα τραπεζιού', 'warning');
      return;
    }

    this.tableService.createCustomTable(name).subscribe({
      next: (response) => {
        if (response.success) {
          this.newTableName = '';
          this.showNewTableInput = false;
          this.showToast(`Το τραπέζι "${response.table.name}" δημιουργήθηκε`, 'success');
          // Jump straight into ordering on the new table
          this.onSelectTable({
            name: response.table.id,
            displayName: response.table.name,
            isCustom: true,
            customTableId: response.table.id
          });
        }
      },
      error: (err) => {
        console.error('Failed to create table:', err);
        this.showToast(`Αποτυχία δημιουργίας τραπεζιού. ${err.error?.message || err.message}`, 'danger');
      }
    });
  }

  async deleteCustomTable(tableId: string) {
    const customTable = this.customTables[tableId];
    if (!customTable) {
      return;
    }

    const alert = await this.alertController.create({
      header: 'Επιβεβαίωση Διαγραφής',
      message: `Είστε σίγουροι ότι θέλετε να διαγράψετε το προσωρινό τραπέζι "${customTable.name}";`,
      buttons: [
        { text: 'Άκυρο', role: 'cancel' },
        {
          text: 'Διαγραφή',
          role: 'destructive',
          handler: () => {
            this.tableService.deleteCustomTable(tableId).subscribe({
              next: () => this.showToast('Το τραπέζι διαγράφηκε', 'success'),
              error: (err) => {
                console.error('Failed to delete table:', err);
                this.showToast(`Αποτυχία διαγραφής. ${err.error?.message || err.message}`, 'danger');
              }
            });
          }
        }
      ]
    });

    await alert.present();
  }

  onSelectTable(table: TableOption) {
    this.selectedTable = table;
  }

  onBack() {
    this.resetSelection();
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
    const query = (event.detail.value || '').trim().toLowerCase();
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
    return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\u03c2/g, '\u03c3');
  }

  async openItemModal(item: any, categoryName?: string) {
    const modal = await this.modalCtrl.create({
      component: ItemDetailModalComponent,
      componentProps: { item, categoryName },
    });
    await modal.present();

    const { data } = await modal.onDidDismiss();

    if (data?.finalItem && this.selectedTable) {
      const quantity = data.quantity || 1;
      this.cartService.addItemToCart(this.selectedTable!.name, data.finalItem, quantity).subscribe({
        error: (err) => {
          console.error('Add to cart failed:', err);
          this.showToast(`Αποτυχία προσθήκης. ${err.message || err}`, 'danger');
        },
        complete: () => {
          this.showToast(
            quantity > 1
              ? `Προστέθηκαν ${quantity}× ${data.finalItem.name}`
              : `Προστέθηκε: ${data.finalItem.name}`,
            'success'
          );
        }
      });
    }
  }

  /** Open the current table's order (review / print) without leaving the tab. */
  async openCurrentTableOrder() {
    if (!this.selectedTable) {
      return;
    }
    const modal = await this.modalCtrl.create({
      component: TableManagementModalComponent,
      componentProps: {
        table: this.selectedTable.name,
        tableName: this.selectedTable.displayName
      },
      cssClass: 'big-modal'
    });
    await modal.present();
    await modal.onDidDismiss();
  }

  private async showToast(message: string, color: 'success' | 'warning' | 'danger') {
    const toast = await this.toastController.create({
      message,
      duration: 1800,
      position: 'bottom',
      color,
    });
    await toast.present();
  }

  trackByName(index: number, item: any): string {
    return item.name;
  }

  trackByCategoryName(index: number, category: any): string {
    return category.name;
  }
}
