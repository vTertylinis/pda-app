import { Injectable, inject } from '@angular/core';
import { OrderHistoryService } from './order-history.service';


@Injectable({ providedIn: 'root' })
export class CancelledOrdersService {
  private history = inject(OrderHistoryService);

  getLastCancelledOrders() {
    return this.history.get('cancelled-orders');
  }
}
