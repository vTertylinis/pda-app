import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { IonicModule } from '@ionic/angular';
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
  onlineOrders: any[] = [];
  loading: boolean = true;
  error: string | null = null;
  private sub?: Subscription;

  ngOnInit() {
    // The service holds the persistent list — just subscribe to it
    this.sub = this.tableService.onlineOrders$.subscribe((orders) => {
      this.loading = false;
      this.error = null;
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
    this.refreshOrders(false);
  }

  ngOnDestroy() {
    this.sub?.unsubscribe();
  }

  private formatOrderDate(timestamp: any): string {
    try {
      if (!timestamp) return '';
      return new Date(timestamp).toLocaleString('el-GR');
    } catch {
      return String(timestamp ?? '');
    }
  }

  refreshOrders(force = true) {
    this.loading = true;
    this.error = null;
    this.sub?.add(this.tableService.loadOnlineOrders(force).subscribe({
      next: () => (this.loading = false),
      error: (err) => {
        console.error('Error loading online orders:', err);
        this.error = 'Δεν ήταν δυνατή η φόρτωση των online παραγγελιών.';
        this.loading = false;
      },
    }));
  }

  getItemsDisplay(order: any): string {
    if (!order.cart || order.cart.length === 0) {
      return 'Χωρίς είδη';
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
