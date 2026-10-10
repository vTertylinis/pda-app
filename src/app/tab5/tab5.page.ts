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
      this.error = state.error ? 'Δεν ήταν δυνατή η φόρτωση των ακυρωμένων παραγγελιών.' : null;
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
        order.item?.extras?.map((e: any) => {
          const name = String(e.name || '');
          const baseName = name.replace(/\s[×x]\d+$/, '');
          const quantity = e.quantity || Number(name.match(/\s[×x](\d+)$/)?.[1]) || 1;
          return quantity > 1 ? `${baseName} x${quantity}` : baseName;
        }).join(', ') || '',
    }));
  }

  loadCancelledOrders() {
    this.history.refresh('cancelled-orders');
  }

  refreshOrders() {
    this.loadCancelledOrders();
  }

  getItemPrice(item: any): number {
    // PDA prices already include extras and other customization charges.
    return Number(item?.price) || 0;
  }

  trackByCancelledAt(index: number, order: any): string {
    return order.cancelledAt;
  }
}
