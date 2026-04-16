import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, ViewWillEnter, ViewWillLeave } from '@ionic/angular';
import { CancelledOrdersService } from '../services/cancelled-orders.service';

@Component({
  selector: 'app-tab5',
  templateUrl: './tab5.page.html',
  styleUrls: ['./tab5.page.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule],
})
export class Tab5Page implements OnInit, ViewWillEnter, ViewWillLeave {
  cancelledOrders: any[] = [];
  loading: boolean = true;
  error: string | null = null;

  constructor(private cancelledOrdersService: CancelledOrdersService) {}

  ngOnInit() {
  }

  ionViewWillEnter() {
    this.loadCancelledOrders();
  }

  ionViewWillLeave() {
    this.cancelledOrders = [];
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

  loadCancelledOrders() {
    this.loading = true;
    this.error = null;

    this.cancelledOrdersService.getLastCancelledOrders().subscribe({
      next: (data) => {
        this.cancelledOrders = (data || []).map((order) => ({
          ...order,
          cancelledAtDisplay: this.formatOrderDate(order.cancelledAt),
          item: (order.item || {}),
          extrasDisplay:
            order.item?.extras?.map((e: any) => `${e.name}${e.quantity > 1 ? ' x' + e.quantity : ''}`).join(', ') || '',
        }));

        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading cancelled orders:', err);
        this.error = 'Failed to load cancelled orders';
        this.loading = false;
      },
    });
  }

  refreshOrders() {
    this.loadCancelledOrders();
  }

  getItemPrice(item: any): number {
    let price = item.price || 0;
    if (item.extras && item.extras.length > 0) {
      price += item.extras.reduce(
        (sum: number, extra: any) => sum + (extra.price || 0),
        0,
      );
    }
    return price;
  }

  trackByCancelledAt(index: number, order: any): string {
    return order.cancelledAt;
  }
}
