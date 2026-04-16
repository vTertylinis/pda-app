import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';


@Injectable({ providedIn: 'root' })
export class CancelledOrdersService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {
  }

  getLastCancelledOrders() {
    return this.http.get<any[]>(`${this.apiUrl}/cancelled-orders/last-100`);
  }
}
