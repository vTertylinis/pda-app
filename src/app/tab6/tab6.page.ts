import { Component, OnDestroy, inject } from '@angular/core';

import { IonicModule, ViewWillEnter, ViewWillLeave } from '@ionic/angular';
import { Subscription } from 'rxjs';
import { OrderHistoryService } from '../services/order-history.service';

@Component({
  selector: 'app-tab6',
  templateUrl: './tab6.page.html',
  styleUrls: ['./tab6.page.scss'],
  standalone: true,
  imports: [IonicModule],
})
export class Tab6Page implements ViewWillEnter, ViewWillLeave, OnDestroy {
  private history = inject(OrderHistoryService);
  private viewSubscription?: Subscription;

  selfOrders: any[] = [];
  loading: boolean = true;
  error: string | null = null;

  ionViewWillEnter() {
    this.viewSubscription?.unsubscribe();
    this.viewSubscription = this.history.watch('self-orders').subscribe(state => {
      this.loading = state.loading;
      this.error = state.error ? 'Δεν ήταν δυνατή η φόρτωση των παραγγελιών αυτοεξυπηρέτησης.' : null;
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
    this.selfOrders = (data || []).map((order) => ({
      ...order,
      timestampDisplay: this.formatOrderDate(order.timestamp),
      items: (order.items || []).map((item: any) => ({
        ...item,
        extrasDisplay:
          item.extras?.map((e: any) => e.name).join(', ') || '',
      })),
    }));
  }

  loadSelfOrders() {
    this.history.refresh('self-orders');
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
