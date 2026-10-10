import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CartService } from '../services/cart.service';
import { TableService } from '../services/table.service';
import { AlertController, ModalController, IonicModule } from '@ionic/angular';

import { FormsModule } from '@angular/forms';
import { TableManagementModalComponent } from '../components/table-management-modal/table-management-modal.component';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-tab2',
  templateUrl: './tab2.page.html',
  styleUrls: ['./tab2.page.scss'],
  standalone: true,
  imports: [IonicModule, FormsModule]
})
export class Tab2Page implements OnInit, OnDestroy {
  private cartService = inject(CartService);
  private tableService = inject(TableService);
  private modalCtrl = inject(ModalController);
  private alertController = inject(AlertController);

  activeTables: string[] = [];
  tableMetadata: { [tableId: string]: { name: string; isCustom: boolean } } = {};
  tableCarts: { [tableId: string]: any[] } = {};
  private destroy$ = new Subject<void>();

  ngOnInit() {
    this.cartService.watchActiveTables().pipe(
      takeUntil(this.destroy$)
    ).subscribe((res) => {
      this.tableMetadata = res.tableMetadata;
      this.tableCarts = res.carts;

      this.activeTables = Object.keys(res.carts).sort((a, b) => {
        const aCustom = this.tableMetadata[a]?.isCustom;
        const bCustom = this.tableMetadata[b]?.isCustom;

        if (aCustom !== bCustom) {
          return aCustom ? 1 : -1;
        }

        return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
      });
    });
  }

  refresh() {
    this.cartService.refresh();
  }

  getTableDisplayName(tableId: string): string {
    return this.tableMetadata[tableId]?.name || tableId;
  }

  getTableTotal(tableId: string): number {
    const cart = this.tableCarts[tableId] || [];
    return cart.reduce((sum, item) => sum + (item?.price || 0), 0);
  }

  getTableItemCount(tableId: string): number {
    return (this.tableCarts[tableId] || []).length;
  }

  /** Items added but not yet sent to the printers. */
  getTableUnprinted(tableId: string): number {
    return (this.tableCarts[tableId] || []).filter((item) => !item?.printed).length;
  }

  async openTableModal(table: any) {
    const displayName = this.getTableDisplayName(table);
    const modal = await this.modalCtrl.create({
      component: TableManagementModalComponent,
      componentProps: { table, tableName: displayName },
      cssClass: 'big-modal'
    });
    await modal.present();

    const { data } = await modal.onDidDismiss();

    if (data?.finalItem) {
      console.log('Received from modal:', data.finalItem);
    }
  }

  onSelectTable(tableName: string) {
    // this.selectedTableName = tableName;
  }

  async deleteItem(table: any) {
    const expectedItems = structuredClone(this.tableCarts[table] || []);
    const isCustom = this.tableMetadata[table]?.isCustom || false;
    const tableName = this.getTableDisplayName(table);

    const alert = await this.alertController.create({
      header: 'Επιβεβαίωση Διαγραφής',
      message: `Είστε σίγουροι ότι θέλετε να διαγράψετε αυτό το τραπέζι${isCustom ? ' "' + tableName + '"' : ''}?`,
      buttons: [
        {
          text: 'Οχι',
          role: 'cancel',
          handler: () => {
            console.log('Deletion cancelled');
          },
        },
        {
          text: 'Ναι',
          handler: () => {
            this.cartService.clearCart(table, expectedItems).subscribe({
              next: (res) => {
                console.log('deleted cart:', res);

                // If it's a custom table, also delete it from the service
                if (isCustom) {
                  this.tableService.deleteCustomTable(table, true).subscribe({
                    next: () => {
                      console.log('Custom table deleted successfully');
                    },
                    error: (err) => {
                      console.error('Failed to delete custom table:', err);
                      if (err.status !== 409) this.cartService.refresh();
                      void this.reportDeleteError(err);
                    }
                  });
                }
              },
              error: (err) => {
                console.error('Delete cart failed:', err);
                if (err.status !== 409) this.cartService.refresh();
                void this.reportDeleteError(err);
              },
            });
          },
        },
      ],
    });

    await alert.present();
  }

  private async reportDeleteError(error: { status?: number }) {
    const alert = await this.alertController.create({
      header: 'Διαγραφή τραπεζιού',
      message: error.status === 409
        ? 'Το τραπέζι άλλαξε σε άλλη συσκευή. Ελέγξτε τα είδη και δοκιμάστε ξανά.'
        : 'Δεν επιβεβαιώθηκε η διαγραφή. Ελέγξτε το τραπέζι πριν δοκιμάσετε ξανά.',
      buttons: [{ text: 'OK', role: 'cancel' }],
    });
    await alert.present();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
