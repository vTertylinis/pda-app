import { Component, OnDestroy, inject } from '@angular/core';

import { IonicModule, ViewWillEnter, ViewWillLeave } from '@ionic/angular';
import { Subscription } from 'rxjs';
import { OrderHistoryService } from '../services/order-history.service';

@Component({
  selector: 'app-tab4',
  templateUrl: './tab4.page.html',
  styleUrls: ['./tab4.page.scss'],
  standalone: true,
  imports: [IonicModule],
})
export class Tab4Page implements ViewWillEnter, ViewWillLeave, OnDestroy {
  private history = inject(OrderHistoryService);
  private viewSubscription?: Subscription;

  printedOrders: any[] = [];
  loading: boolean = true;
  error: string | null = null;

  ionViewWillEnter() {
    this.viewSubscription?.unsubscribe();
    this.viewSubscription = this.history.watch('orders').subscribe(state => {
      this.loading = state.loading;
      this.error = state.error ? 'Δεν ήταν δυνατή η φόρτωση των εκτυπωμένων παραγγελιών.' : null;
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
    this.printedOrders = (data || []).map((order) => ({
      ...order,
      timestampDisplay: this.formatOrderDate(order.timestamp),
      items: (order.items || []).map((item: any) => ({
        ...item,
        extrasDisplay:
          item.extras?.map((e: any) => e.name).join(', ') || '',
      })),
    }));
  }

  loadPrintedOrders() {
    this.history.refresh('orders');
  }

  refreshOrders() {
    this.loadPrintedOrders();
  }

  getItemsDisplay(order: any): string {
    if (!order.items || order.items.length === 0) {
      return 'Χωρίς είδη';
    }
    return order.items.map((item: any) => `${item.name}`).join(', ');
  }

  /** Order total: PDA items carry their final price (extras included). */
  getOrderTotal(order: any): number {
    return (order.items || []).reduce(
      (sum: number, item: any) => sum + (Number(item.price) || 0),
      0,
    );
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
