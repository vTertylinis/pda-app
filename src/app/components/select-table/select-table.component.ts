import { Component, Input, OnInit, OnDestroy, inject } from '@angular/core';
import { AlertController, ModalController, IonicModule } from '@ionic/angular';

import { CartService } from 'src/app/services/cart.service';
import { TableService, CustomTable } from 'src/app/services/table.service';
import { TableGridComponent, TableOption, TableActivity } from '../table-grid/table-grid.component';
import { Subject } from 'rxjs';
import { finalize, takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-select-table',
  templateUrl: './select-table.component.html',
  styleUrls: ['./select-table.component.scss'],
  standalone: true,
  imports: [IonicModule, TableGridComponent]
})
export class SelectTableComponent implements OnInit, OnDestroy {
  private modalCtrl = inject(ModalController);
  private cartService = inject(CartService);
  private tableService = inject(TableService);
  private alertController = inject(AlertController);

  @Input() table: any;
  @Input() cartItems: any[] = [];

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
      },
      error: (err) => console.error('Failed to load table activity:', err)
    });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  close() {
    if (this.isMoving) return;
    this.modalCtrl.dismiss({});
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

    await alert.present();
  }

  async movetable() {
    if (this.isMoving || !this.toTable) return;
    const expectedItems = structuredClone(this.cartItems);
    const request = {
      fromTable: String(this.table), toTable: this.toTable,
      expectedItems, wholeTable: expectedItems.length === this.cartItems.length,
    };
    this.isMoving = true;
    this.cartService.moveTable(request).pipe(
      finalize(() => { this.isMoving = false; }),
    ).subscribe({
      next: res => { this.modalCtrl.dismiss({ res }); },
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

    await alert.present();
  }
}
