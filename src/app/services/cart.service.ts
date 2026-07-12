import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { catchError, defer, tap, throwError } from 'rxjs';
import { environment } from '../../environments/environment';
import { NetworkDiagnosticsService } from './network-diagnostics.service';


@Injectable({ providedIn: 'root' })
export class CartService {
  private http = inject(HttpClient);
  private networkDiagnostics = inject(NetworkDiagnosticsService);

  private apiUrl = environment.apiUrl;

  getCart(tableId: any) {
    const url = `${this.apiUrl}/cart/${encodeURIComponent(String(tableId))}`;

    return defer(() => {
      const request = this.networkDiagnostics.createCartRequest(tableId, url);
      const headers = new HttpHeaders({ 'X-Client-Request-Id': request.requestId });

      return this.http.get(url, { headers }).pipe(
        tap(() => this.networkDiagnostics.notifyRequestSucceeded()),
        catchError((error: unknown) => {
          this.networkDiagnostics.recordCartFailure(request, error);
          return throwError(() => error);
        })
      );
    });
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

  cancelItem(tableId: any, index: any) {
    return this.http.delete(`${this.apiUrl}/cancel-item/${tableId}/item/${index}`);
  }

  getActiveTables() {
    return this.http.get<{ 
      carts: { [tableId: string]: any[] };
      tableMetadata: { [tableId: string]: { name: string; isCustom: boolean } }
    }>(`${this.apiUrl}/cart`);
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

  moveTableItems(request: any) {
    return this.http.post(`${this.apiUrl}/move-table-items-selected`, request);
  }

}
