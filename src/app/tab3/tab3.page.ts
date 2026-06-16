import { Component, inject } from '@angular/core';

import { IonicModule, ViewWillEnter, ViewWillLeave } from '@ionic/angular';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

@Component({
  selector: 'app-tab3',
  templateUrl: './tab3.page.html',
  styleUrls: ['./tab3.page.scss'],
  standalone: true,
  imports: [IonicModule],
})
export class Tab3Page implements ViewWillEnter, ViewWillLeave {
  private http = inject(HttpClient);

  onlineOrders: any[] = [];
  loading: boolean = true;
  error: string | null = null;
  private apiUrl = environment.apiUrl;

  ionViewWillEnter() {
    this.loadOnlineOrders();
  }

  ionViewWillLeave() {
    this.onlineOrders = [];
    this.error = null;
  }

  private formatOrderDate(timestamp: any): string {
    try {
      if (!timestamp) return '';
      return new Date(timestamp).toLocaleString('el-GR');
    } catch {
      return String(timestamp ?? '');
    }
  }

  loadOnlineOrders() {
    this.loading = true;
    this.error = null;

    this.http.get<any[]>(`${this.apiUrl}/online-orders/last-20`).subscribe({
      next: (data) => {
        this.onlineOrders = (data || []).map((order) => ({
          ...order,
          timestampDisplay: this.formatOrderDate(order.timestamp),
          items: (order.items || []).map((item: any) => ({
            ...item,
            ingredientsDisplay:
              item.ingredients?.map((ing: any) => ing.name).join(', ') || '',
          })),
        }));

        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading online orders:', err);
        this.error = 'Failed to load online orders';
        this.loading = false;
      },
    });
  }

  refreshOrders() {
    this.loadOnlineOrders();
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

  trackByTimestamp(index: number, order: any): string {
    return order.timestamp;
  }
}
