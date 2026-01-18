import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';


@Injectable({ providedIn: 'root' })
export class CartService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {
  }

  getCart(tableId: any) {
    return this.http.get(`${this.apiUrl}/cart/${tableId}`);
  }

  addItemToCart(tableId: any, item: any) {
    return this.http.post(`${this.apiUrl}/cart/${tableId}`, item);
  }

  clearCart(tableId: any) {
    return this.http.delete(`${this.apiUrl}/cart/${tableId}`);
  }

  deleteItemFromTable(tableId: any, index: any) {
    return this.http.delete(`${this.apiUrl}/cart/${tableId}/item/${index}`);
  }

  getActiveTables() {
    return this.http.get<{ [tableId: string]: any[] }>(`${this.apiUrl}/cart`);
  }

  editItem(tableId: any, index: any, item: any) {
    return this.http.put(`${this.apiUrl}/cart/${tableId}/item/${index}`, item);
  }

  printItems(tableId: any, request: any) {
    return this.http.post(`${this.apiUrl}/print-unprinted/${tableId}`, request);
  }

  moveTable(request: any) {
    return this.http.post(`${this.apiUrl}/move-table-items`, request);
  }


}
