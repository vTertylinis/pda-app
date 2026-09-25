import { Component, Input, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef, inject } from '@angular/core';
import { DialogRef, PromptService, DialogService } from '../../ui/dialog.service';

import { CartService } from '../../services/cart.service';
import { TableService, CustomTable } from '../../services/table.service';
import { TableGridComponent, TableOption, TableActivity } from '../table-grid/table-grid.component';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-select-table',
  templateUrl: './select-table.component.html',
  styleUrls: ['./select-table.component.scss'],
  standalone: true,
  imports: [TableGridComponent],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SelectTableComponent implements OnInit, OnDestroy {
  private modalCtrl = inject(DialogService);
  private dialogRef = inject(DialogRef);
  private cartService = inject(CartService);
  private tableService = inject(TableService);
  private alertController = inject(PromptService);
  private cdr = inject(ChangeDetectorRef);

  @Input() table: any;
  @Input() selectedItems: any[] = [];
  @Input() cartItems: any[] = [];

  customTables: { [key: string]: CustomTable } = {};
  activity: { [tableId: string]: TableActivity } = {};
  toTable: string | null = null;
  toTableDisplayName: string | null = null;

  private destroy$ = new Subject<void>();

  ngOnInit() {
    this.tableService.getCustomTables().pipe(
      takeUntil(this.destroy$)
    ).subscribe(customTables => {
      this.customTables = customTables;
      this.cdr.markForCheck();
    });

    // Show which target tables already have orders (helps when merging tables)
    this.cartService.getActiveTables().pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (res) => {
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
        this.cdr.markForCheck();
      },
      error: (err) => console.error('Failed to load table activity:', err)
    });
  }

  close() {
    this.dialogRef.dismiss({});
  }

  async onSelectTable(table: TableOption) {
    this.toTable = table.name;
    this.toTableDisplayName = table.displayName;

    const merging = (this.activity[table.name]?.count || 0) > 0;

    const alert = await this.alertController.create({
      header: 'Επιβεβαίωση',
      message: merging
        ? `Το τραπέζι ${this.toTableDisplayName} έχει ήδη παραγγελίες. Οι παραγγελίες θα συγχωνευθούν. Συνέχεια;`
        : `Είστε σίγουροι ότι θέλετε να μεταφέρετε τις παραγγελίες στο τραπέζι ${this.toTableDisplayName};`,
      buttons: [
        { text: 'Όχι', role: 'cancel' },
        {
          text: 'Ναι',
          handler: () => {
            this.movetable();
          },
        },
      ],
    });

    await alert.open();
  }

  async movetable() {
    let request: any = {
      fromTable: this.table,
      toTable: this.toTable,
    };

    // If specific items were selected, calculate their indices and move only those
    if (this.selectedItems.length > 0 && this.cartItems.length > 0) {
      const indicesToMove: number[] = [];

      // For each selected item, find its indices in cartItems
      for (const selectedItem of this.selectedItems) {
        // Get all indices that match this grouped item
        const matchingIndices = selectedItem.indices || [];
        indicesToMove.push(...matchingIndices);
      }

      request.indicesToMove = indicesToMove.sort((a, b) => b - a); // Sort descending to avoid index shifting

      this.cartService.moveTableItems(request).subscribe({
        next: (res) => {
          this.dialogRef.dismiss({ res });
        },
        error: async (err) => {
          console.error(`Move Failed`, err);
          await this.alertModal(`Αποτυχία μεταφοράς προϊόντων`);
        },
      });
    } else {
      // Move all items (backward compatibility)
      this.cartService.moveTable(request).subscribe({
        next: (res) => {
          this.dialogRef.dismiss({ res });
        },
        error: async (err) => {
          console.error(`Move Failed`, err);
          await this.alertModal(`Αποτυχία μεταφοράς τραπεζιού`);
        },
      });
    }
  }

  async alertModal(message: string) {
    const alert = await this.alertController.create({
      header: 'Σφάλμα',
      message: message,
      buttons: [{ text: 'OK', role: 'cancel' }],
    });

    await alert.open();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
