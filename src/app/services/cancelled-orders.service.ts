import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environment } from '../../environments/environment';


@Injectable({ providedIn: 'root' })
export class CancelledOrdersService {
  private http = inject(HttpClient);

  private apiUrl = environment.apiUrl;

  getLastCancelledOrders() {
    return this.http.get<any[]>(`${this.apiUrl}/cancelled-orders/last-100`);
  }
}
