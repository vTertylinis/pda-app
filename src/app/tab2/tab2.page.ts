import { Component, OnInit, OnDestroy } from '@angular/core';
import { CartService } from '../services/cart.service';
import { TableService } from '../services/table.service';
import { AlertController, ModalController, IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TableManagementModalComponent } from '../components/table-management-modal/table-management-modal.component';

@Component({
  selector: 'app-tab2',
  templateUrl: './tab2.page.html',
  styleUrls: ['./tab2.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule]
})
export class Tab2Page implements OnInit, OnDestroy {
  activeTables: string[] = [];
  tableMetadata: { [tableId: string]: { name: string; isCustom: boolean } } = {};
  private customTablesSub: any;
  private cartUpdatesSub: any;

  constructor(
    private cartService: CartService,
    private tableService: TableService,
    private modalCtrl: ModalController,
    private alertController: AlertController
  ) {}

  ngOnInit() {
    this.loadTables();

    // react to custom table changes from other clients
    this.customTablesSub = this.tableService.getCustomTables().subscribe({
      next: () => {
        // reload list whenever any custom table is added/updated/deleted
        this.loadTables();
      },
      error: (err) => {
        console.error('Error subscribing to custom tables updates:', err);
      }
    });

    // also listen for cart/active-table updates
    this.cartUpdatesSub = this.tableService.cartUpdates$.subscribe({
      next: (data) => {
        console.log('received cart update event', data);
        this.loadTables();
      },
      error: (err) => {
        console.error('Error subscribing to cart updates:', err);
      }
    });
  }

  ionViewWillEnter() {
    this.loadTables();
  }

  loadTables() {
    this.cartService.getActiveTables().subscribe({
      next: (res) => {
        // store metadata first so the sort callback can reference it
        this.tableMetadata = res.tableMetadata;

        // sort keys so that non-custom tables come first (numeric/natural order),
        // and any custom/uuid-based tables are pushed to the bottom.
        this.activeTables = Object.keys(res.carts).sort((a, b) => {
          const aCustom = this.tableMetadata[a]?.isCustom;
          const bCustom = this.tableMetadata[b]?.isCustom;

          // If one is custom and the other is not, the custom one should be later
          if (aCustom !== bCustom) {
            return aCustom ? 1 : -1;
          }

          // otherwise sort by the id/name in a natural, numeric-aware manner
          return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
        });
      },
      error: async (err) => {
        console.error('Failed to load active tables:', err);
        await this.alertModal(
          'Could not load active tables. Please check your connection or try again later.'
        );
      },
    });
  }

  getTableDisplayName(tableId: string): string {
    return this.tableMetadata[tableId]?.name || tableId;
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
    this.loadTables();

    if (data?.finalItem) {
      console.log('Received from modal:', data.finalItem);
    }
  }

  onSelectTable(tableName: string) {
    // this.selectedTableName = tableName;
  }

  async deleteItem(table: any) {
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
            this.cartService.clearCart(table).subscribe({
              next: (res) => {
                console.log('deleted cart:', res);

                // If it's a custom table, also delete it from the service
                if (isCustom) {
                  this.tableService.deleteCustomTable(table).subscribe({
                    next: () => {
                      console.log('Custom table deleted successfully');
                      this.loadTables();
                    },
                    error: (err) => {
                      console.error('Failed to delete custom table:', err);
                      this.loadTables();
                    }
                  });
                } else {
                  this.loadTables();
                }
              },
              error: (err) => {
                console.error('Delete cart failed:', err);
                this.loadTables();
              },
            });
          },
        },
      ],
    });

    await alert.present();
  }

  ngOnDestroy() {
    if (this.customTablesSub) {
      this.customTablesSub.unsubscribe();
    }
    if (this.cartUpdatesSub) {
      this.cartUpdatesSub.unsubscribe();
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
            console.log('Error alert dismissed');
          },
        },
      ],
    });

    await alert.present();
  }
}
