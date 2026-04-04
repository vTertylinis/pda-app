import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CartService } from '../services/cart.service';
import { TableService } from '../services/table.service';
import { AlertController, ModalController, IonicModule, ViewWillLeave } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TableManagementModalComponent } from '../components/table-management-modal/table-management-modal.component';
import { Subject, EMPTY } from 'rxjs';
import { debounceTime, takeUntil, switchMap, catchError } from 'rxjs/operators';

@Component({
  selector: 'app-tab2',
  templateUrl: './tab2.page.html',
  styleUrls: ['./tab2.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class Tab2Page implements OnInit, OnDestroy, ViewWillLeave {
  activeTables: string[] = [];
  tableMetadata: { [tableId: string]: { name: string; isCustom: boolean } } = {};
  private destroy$ = new Subject<void>();
  private loadTrigger$ = new Subject<void>();

  constructor(
    private cartService: CartService,
    private tableService: TableService,
    private modalCtrl: ModalController,
    private alertController: AlertController,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    // Debounce all load triggers, use switchMap to cancel in-flight requests
    this.loadTrigger$.pipe(
      debounceTime(300),
      switchMap(() =>
        this.cartService.getActiveTables().pipe(
          catchError((err) => {
            console.error('Failed to load active tables:', err);
            return EMPTY;
          })
        )
      ),
      takeUntil(this.destroy$)
    ).subscribe((res) => {
      this.tableMetadata = res.tableMetadata;

      this.activeTables = Object.keys(res.carts).sort((a, b) => {
        const aCustom = this.tableMetadata[a]?.isCustom;
        const bCustom = this.tableMetadata[b]?.isCustom;

        if (aCustom !== bCustom) {
          return aCustom ? 1 : -1;
        }

        return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
      });

      this.cdr.markForCheck();
    });

    this.loadTrigger$.next();

    // react to custom table changes from other clients
    this.tableService.getCustomTables().pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: () => {
        this.loadTrigger$.next();
      },
      error: (err) => {
        console.error('Error subscribing to custom tables updates:', err);
      }
    });

    // also listen for cart/active-table updates
    this.tableService.cartUpdates$.pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: () => {
        this.loadTrigger$.next();
      },
      error: (err) => {
        console.error('Error subscribing to cart updates:', err);
      }
    });
  }

  ionViewWillLeave() {
    this.activeTables = [];
    this.tableMetadata = {};
  }

  ionViewWillEnter() {
    this.loadTrigger$.next();
  }

  refresh() {
    this.loadTrigger$.next();
  }

  getTableDisplayName(tableId: string): string {
    return this.tableMetadata[tableId]?.name || tableId;
  }

  async openTableModal(table: any) {
    const displayName = this.getTableDisplayName(table);
    const modal = await this.modalCtrl.create({
      component: TableManagementModalComponent,
      componentProps: { table, tableName: displayName },
    });
    await modal.present();

    const { data } = await modal.onDidDismiss();
    this.loadTrigger$.next();

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
                      this.loadTrigger$.next();
                    },
                    error: (err) => {
                      console.error('Failed to delete custom table:', err);
                      this.loadTrigger$.next();
                    }
                  });
                } else {
                  this.loadTrigger$.next();
                }
              },
              error: (err) => {
                console.error('Delete cart failed:', err);
                this.loadTrigger$.next();
              },
            });
          },
        },
      ],
    });

    await alert.present();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  trackByTable(index: number, table: string): string {
    return table;
  }
}
