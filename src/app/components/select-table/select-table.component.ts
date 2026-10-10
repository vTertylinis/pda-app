import { Component, Input, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef, inject } from '@angular/core';
import { DialogRef, PromptService, DialogService } from '../../ui/dialog.service';

import { CartService } from '../../services/cart.service';
import { TableService, CustomTable } from '../../services/table.service';
import { TableGridComponent, TableOption, TableActivity } from '../table-grid/table-grid.component';
import { Subject } from 'rxjs';
import { finalize, takeUntil } from 'rxjs/operators';

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
  @Input() wholeTable = true;

  customTables: { [key: string]: CustomTable } = {};
  activity: { [tableId: string]: TableActivity } = {};
  isMoving = false;
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
    this.cartService.watchActiveTables().pipe(
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
    if (this.isMoving) return;
    this.dialogRef.dismiss({});
  }

  async onSelectTable(table: TableOption) {
    if (this.isMoving) return;
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
    if (this.isMoving || !this.toTable || !this.cartItems.length) return;
    const expectedItems = structuredClone(this.cartItems);
    const request = {
      fromTable: String(this.table), toTable: this.toTable,
      expectedItems, wholeTable: this.wholeTable,
    };
    this.isMoving = true;
    this.cartService.moveTable(request).pipe(
      finalize(() => { this.isMoving = false; }),
    ).subscribe({
      next: res => { this.dialogRef.dismiss({ res }); },
      error: err => {
        if (err.status !== 409) this.cartService.refresh();
        void this.alertModal(err.status === 409
          ? 'Το τραπέζι άλλαξε. Κλείστε αυτό το παράθυρο και επιλέξτε ξανά τα είδη.'
          : 'Δεν επιβεβαιώθηκε η μεταφορά. Ελέγξτε και τα δύο τραπέζια πριν δοκιμάσετε ξανά.');
      },
    });
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
