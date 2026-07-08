import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef, inject } from '@angular/core';
import { CartService } from '../services/cart.service';
import { TableService } from '../services/table.service';
import { AlertController, ModalController, IonicModule, ViewWillLeave } from '@ionic/angular';
import { DecimalPipe } from '@angular/common';

import { FormsModule } from '@angular/forms';
import { TableManagementModalComponent } from '../components/table-management-modal/table-management-modal.component';
import { Subject, EMPTY } from 'rxjs';
import { debounceTime, takeUntil, switchMap, catchError } from 'rxjs/operators';

interface TableSummary {
  id: string;
  name: string;
  isCustom: boolean;
  itemCount: number;
  total: number;
  unprinted: number;
}

@Component({
  selector: 'app-tab2',
  templateUrl: './tab2.page.html',
  styleUrls: ['./tab2.page.scss'],
  standalone: true,
  imports: [IonicModule, FormsModule, DecimalPipe],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class Tab2Page implements OnInit, OnDestroy, ViewWillLeave {
  private cartService = inject(CartService);
  private tableService = inject(TableService);
  private modalCtrl = inject(ModalController);
  private alertController = inject(AlertController);
  private cdr = inject(ChangeDetectorRef);

  tableSummaries: TableSummary[] = [];
  private destroy$ = new Subject<void>();
  private loadTrigger$ = new Subject<void>();

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
      const metadata = res.tableMetadata || {};

      this.tableSummaries = Object.keys(res.carts)
        .map((tableId) => {
          const items = res.carts[tableId] || [];
          return {
            id: tableId,
            name: metadata[tableId]?.name || tableId,
            isCustom: metadata[tableId]?.isCustom || false,
            itemCount: items.length,
            total: items.reduce((sum: number, item: any) => sum + (Number(item.price) || 0), 0),
            unprinted: items.filter((item: any) => !item.printed).length
          };
        })
        .sort((a, b) => {
          if (a.isCustom !== b.isCustom) {
            return a.isCustom ? 1 : -1;
          }
          return a.id.localeCompare(b.id, undefined, { numeric: true, sensitivity: 'base' });
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
    this.tableSummaries = [];
  }

  ionViewWillEnter() {
    this.loadTrigger$.next();
  }

  refresh() {
    this.loadTrigger$.next();
  }

  async openTableModal(summary: TableSummary) {
    const modal = await this.modalCtrl.create({
      component: TableManagementModalComponent,
      componentProps: { table: summary.id, tableName: summary.name },
    });
    await modal.present();

    await modal.onDidDismiss();
    this.loadTrigger$.next();
  }

  async deleteTable(summary: TableSummary, event: Event) {
    event.stopPropagation();

    const alert = await this.alertController.create({
      header: 'Επιβεβαίωση Διαγραφής',
      message: `Είστε σίγουροι ότι θέλετε να διαγράψετε το τραπέζι "${summary.name}";`,
      buttons: [
        { text: 'Όχι', role: 'cancel' },
        {
          text: 'Ναι',
          role: 'destructive',
          handler: () => {
            this.cartService.clearCart(summary.id).subscribe({
              next: () => {
                // If it's a custom table, also delete it from the service
                if (summary.isCustom) {
                  this.tableService.deleteCustomTable(summary.id).subscribe({
                    next: () => this.loadTrigger$.next(),
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

  trackByTableId(index: number, summary: TableSummary): string {
    return summary.id;
  }
}
