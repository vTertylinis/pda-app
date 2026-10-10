import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef, inject } from '@angular/core';
import { CartService } from '../services/cart.service';
import { TableService } from '../services/table.service';
import { PromptService, DialogService } from '../ui/dialog.service';
import { DecimalPipe } from '@angular/common';

import { FormsModule } from '@angular/forms';
import { TableManagementModalComponent } from '../components/table-management-modal/table-management-modal.component';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

interface TableSummary {
  id: string;
  name: string;
  isCustom: boolean;
  itemCount: number;
  total: number;
  unprinted: number;
  items: any[];
}

@Component({
  selector: 'app-tab2',
  templateUrl: './tab2.page.html',
  styleUrls: ['./tab2.page.scss'],
  standalone: true,
  imports: [FormsModule, DecimalPipe],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class Tab2Page implements OnInit, OnDestroy {
  private cartService = inject(CartService);
  private tableService = inject(TableService);
  private modalCtrl = inject(DialogService);
  private alertController = inject(PromptService);
  private cdr = inject(ChangeDetectorRef);

  tableSummaries: TableSummary[] = [];
  private destroy$ = new Subject<void>();

  ngOnInit() {
    this.cartService.watchActiveTables().pipe(
      takeUntil(this.destroy$)
    ).subscribe((res) => {
      const metadata = res.tableMetadata || {};

      this.tableSummaries = Object.keys(res.carts)
        .map((tableId) => {
          const items = res.carts[tableId] || [];
          return {
            id: tableId,
            items: structuredClone(items),
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
  }


  refresh() {
    this.cartService.refresh();
  }

  async openTableModal(summary: TableSummary) {
    const modal = await this.modalCtrl.create({
      component: TableManagementModalComponent,
      componentProps: { table: summary.id, tableName: summary.name },
    });
    await modal.open();

    await modal.afterClosed();
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
            this.cartService.clearCart(summary.id, summary.items).subscribe({
              next: () => {
                // If it's a custom table, also delete it from the service
                if (summary.isCustom) {
                  this.tableService.deleteCustomTable(summary.id, true).subscribe({
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

    await alert.open();
  }

  private async reportDeleteError(error: { status?: number }) {
    const alert = await this.alertController.create({
      header: 'Διαγραφή τραπεζιού',
      message: error.status === 409
        ? 'Το τραπέζι άλλαξε σε άλλη συσκευή. Ελέγξτε τα είδη και δοκιμάστε ξανά.'
        : 'Δεν επιβεβαιώθηκε η διαγραφή. Ελέγξτε το τραπέζι πριν δοκιμάσετε ξανά.',
      buttons: [{ text: 'OK', role: 'cancel' }],
    });
    await alert.open();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  trackByTableId(index: number, summary: TableSummary): string {
    return summary.id;
  }
}
