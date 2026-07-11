import { Component, inject } from '@angular/core';

import { IonicModule, ViewWillEnter, ViewWillLeave } from '@ionic/angular';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

@Component({
  selector: 'app-tab6',
  templateUrl: './tab6.page.html',
  styleUrls: ['./tab6.page.scss'],
  standalone: true,
  imports: [IonicModule],
})
export class Tab6Page implements ViewWillEnter, ViewWillLeave {
  private http = inject(HttpClient);

  selfOrders: any[] = [];
  loading: boolean = true;
  error: string | null = null;
  private apiUrl = environment.apiUrl;

  ionViewWillEnter() {
    this.loadSelfOrders();
  }

  ionViewWillLeave() {
    this.selfOrders = [];
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

  loadSelfOrders() {
    this.loading = true;
    this.error = null;

    this.http.get<any[]>(`${this.apiUrl}/self-orders/last-100`).subscribe({
      next: (data) => {
        this.selfOrders = (data || []).map((order) => ({
          ...order,
          timestampDisplay: this.formatOrderDate(order.timestamp),
          items: (order.items || []).map((item: any) => ({
            ...item,
            extrasDisplay:
              item.extras?.map((e: any) => e.name).join(', ') || '',
          })),
        }));

        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading self-orders:', err);
        this.error = 'Αποτυχία φόρτωσης self-orders';
        this.loading = false;
      },
    });
  }

  refreshOrders() {
    this.loadSelfOrders();
  }

  /** Order total: items carry their final price (extras included). */
  getOrderTotal(order: any): number {
    return (order.items || []).reduce(
      (sum: number, item: any) => sum + (Number(item.price) || 0),
      0,
    );
  }

  trackByTimestamp(index: number, order: any): string {
    return order.timestamp;
  }
}
