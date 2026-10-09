import { Component, OnDestroy, inject } from '@angular/core';

import { IonicModule, ViewWillEnter, ViewWillLeave } from '@ionic/angular';
import { Subscription } from 'rxjs';
import { OrderHistoryService } from '../services/order-history.service';

@Component({
  selector: 'app-tab5',
  templateUrl: './tab5.page.html',
  styleUrls: ['./tab5.page.scss'],
  standalone: true,
  imports: [IonicModule],
})
export class Tab5Page implements ViewWillEnter, ViewWillLeave, OnDestroy {
  private history = inject(OrderHistoryService);
  private viewSubscription?: Subscription;

  cancelledOrders: any[] = [];
  loading: boolean = true;
  error: string | null = null;

  ionViewWillEnter() {
    this.viewSubscription?.unsubscribe();
    this.viewSubscription = this.history.watch('cancelled-orders').subscribe(state => {
      this.loading = state.loading;
      this.error = state.error ? 'Failed to load cancelled orders' : null;
      if (state.data) this.applyOrders(state.data);
    });
  }

  ionViewWillLeave() {
    this.viewSubscription?.unsubscribe();
  }

  ngOnDestroy() {
    this.viewSubscription?.unsubscribe();
  }

  private formatOrderDate(timestamp: any): string {
    try {
      if (!timestamp) return '';
      return new Date(timestamp).toLocaleString('el-GR');
    } catch {
      return String(timestamp ?? '');
    }
  }

  private applyOrders(data: any[]) {
    this.cancelledOrders = (data || []).map((order) => ({
      ...order,
      cancelledAtDisplay: this.formatOrderDate(order.cancelledAt),
      item: (order.item || {}),
      extrasDisplay:
        order.item?.extras?.map((e: any) => `${e.name}${e.quantity > 1 ? ' x' + e.quantity : ''}`).join(', ') || '',
    }));
  }

  loadCancelledOrders() {
    this.history.refresh('cancelled-orders');
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
