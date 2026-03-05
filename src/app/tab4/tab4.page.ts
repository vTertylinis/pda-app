import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, ViewWillEnter, ViewWillLeave } from '@ionic/angular';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

@Component({
  selector: 'app-tab4',
  templateUrl: './tab4.page.html',
  styleUrls: ['./tab4.page.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule],
})
export class Tab4Page implements OnInit, ViewWillEnter, ViewWillLeave {
  printedOrders: any[] = [];
  loading: boolean = true;
  error: string | null = null;
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  ngOnInit() {
  }

  ionViewWillEnter() {
    this.loadPrintedOrders();
  }

  ionViewWillLeave() {
    this.printedOrders = [];
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

  loadPrintedOrders() {
    this.loading = true;
    this.error = null;

    this.http.get<any[]>(`${this.apiUrl}/orders/last-100`).subscribe({
      next: (data) => {
        this.printedOrders = (data || []).map((order) => ({
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
        console.error('Error loading printed orders:', err);
        this.error = 'Failed to load printed orders';
        this.loading = false;
      },
    });
  }

  refreshOrders() {
    this.loadPrintedOrders();
  }

  getItemsDisplay(order: any): string {
    if (!order.items || order.items.length === 0) {
      return 'No items';
    }
    return order.items.map((item: any) => `${item.name}`).join(', ');
  }

  getItemPrice(item: any): number {
    let price = item.basePrice || 0;
    if (item.extras && item.extras.length > 0) {
      price += item.extras.reduce(
        (sum: number, extra: any) => sum + (extra.price || 0),
        0,
      );
    }
    return price;
  }

  trackByTimestamp(index: number, order: any): string {
    return order.timestamp;
  }
}
