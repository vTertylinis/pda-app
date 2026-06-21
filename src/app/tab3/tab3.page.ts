import { Component, NgZone, OnDestroy, OnInit, inject } from '@angular/core';

import { AlertController, IonicModule, ToastController } from '@ionic/angular';
import { Subscription } from 'rxjs';
import { TableService } from '../services/table.service';

@Component({
  selector: 'app-tab3',
  templateUrl: './tab3.page.html',
  styleUrls: ['./tab3.page.scss'],
  standalone: true,
  imports: [IonicModule],
})
export class Tab3Page implements OnInit, OnDestroy {
  private tableService = inject(TableService);
  private toastCtrl = inject(ToastController);
  private alertCtrl = inject(AlertController);
  private ngZone = inject(NgZone);

  onlineOrders: any[] = [];
  loading: boolean = true;
  error: string | null = null;
  // Quick-response presets (minutes)
  readonly waitingPresets = [10, 15, 20, 30, 45, 60];
  private sub?: Subscription;

  ngOnInit() {
    // The service holds the persistent list — just subscribe to it
    this.sub = this.tableService.onlineOrders$.subscribe((orders) => {
      this.onlineOrders = orders.map((o) => ({
        ...o,
        timestampDisplay: this.formatOrderDate(o.timestamp),
        cart: (o.cart || []).map((item: any) => ({
          ...item,
          ingredientsDisplay:
            item.ingredients?.map((ing: any) => ing.name).join(', ') || '',
        })),
      }));
    });
    this.refreshOrders();
  }

  ngOnDestroy() {
    this.sub?.unsubscribe();
  }

  get pendingResponseCount(): number {
    return this.onlineOrders.filter(
      (o) => o.needsResponse && o.respondedWaitingTime == null
    ).length;
  }

  private formatOrderDate(timestamp: any): string {
    try {
      if (!timestamp) return '';
      return new Date(timestamp).toLocaleString('el-GR');
    } catch {
      return String(timestamp ?? '');
    }
  }

  refreshOrders() {
    this.loading = true;
    this.error = null;
    this.tableService.loadOnlineOrders().subscribe({
      next: () => (this.loading = false),
      error: (err) => {
        console.error('Error loading online orders:', err);
        this.error = 'Failed to load online orders';
        this.loading = false;
      },
    });
  }

  // Send the estimated waiting time back to the customer
  respond(order: any, minutes: number) {
    if (!order?.orderId) {
      this.showToast('Αυτή η παραγγελία δεν υποστηρίζει απάντηση', 'warning');
      return;
    }
    const orderId = order.orderId;
    this.tableService.setOnlineOrderResponding(orderId, true);
    this.tableService.respondToOnlineOrder(orderId, minutes).subscribe({
      next: () => {
        this.ngZone.run(() => this.tableService.setOnlineOrderResponse(orderId, minutes));
        this.showToast(`Στάλθηκε: ${minutes} λεπτά`, 'success');
      },
      error: (err) => {
        console.error('Failed to respond to online order:', err);
        this.ngZone.run(() => this.tableService.setOnlineOrderResponding(orderId, false));
        this.showToast('Αποτυχία αποστολής', 'danger');
      },
    });
  }

  // Clear a sent response so the cashier can pick a different waiting time
  changeResponse(order: any) {
    if (order?.orderId) {
      this.tableService.setOnlineOrderResponse(order.orderId, null);
    }
  }

  // Store rejects an order (too busy) — confirm first
  async rejectOrder(order: any) {
    if (!order?.orderId) return;
    const orderId = order.orderId;
    const alert = await this.alertCtrl.create({
      header: 'Απόρριψη παραγγελίας;',
      message: `Σίγουρα θέλετε να απορρίψετε την παραγγελία του ${order.address?.name || ''};`,
      buttons: [
        { text: 'Όχι', role: 'cancel' },
        {
          text: 'Απόρριψη',
          role: 'destructive',
          handler: () => {
            this.tableService.setOnlineOrderResponding(orderId, true);
            this.tableService.rejectOnlineOrder(orderId).subscribe({
              next: () => {
                this.ngZone.run(() => this.tableService.setOnlineOrderRejected(orderId));
                this.showToast('Η παραγγελία απορρίφθηκε', 'medium');
              },
              error: (err) => {
                console.error('Failed to reject online order:', err);
                this.ngZone.run(() => this.tableService.setOnlineOrderResponding(orderId, false));
                this.showToast('Αποτυχία απόρριψης', 'danger');
              },
            });
          },
        },
      ],
    });
    await alert.present();
  }

  private async showToast(message: string, color: string) {
    const toast = await this.toastCtrl.create({
      message,
      duration: 2500,
      color,
      position: 'top',
    });
    await toast.present();
  }

  getItemsDisplay(order: any): string {
    if (!order.cart || order.cart.length === 0) {
      return 'No items';
    }
    return order.cart
      .map((item: any) => `${item.quantity}x ${item.name}`)
      .join(', ');
  }

  openInGoogleMaps(order: any) {
    const loc = order?.address?.location;
    if (!loc || typeof loc.lat !== 'number' || typeof loc.lng !== 'number')
      return;

    const url = `https://www.google.com/maps?q=${loc.lat},${loc.lng}`;
    window.open(url, '_blank'); // opens in browser / system
  }

  trackByOrder(index: number, order: any): string {
    return order.orderId || order.timestamp;
  }
}
