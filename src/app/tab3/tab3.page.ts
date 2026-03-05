import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';


@Component({
  selector: 'app-tab3',
  templateUrl: './tab3.page.html',
  styleUrls: ['./tab3.page.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule],
})
export class Tab3Page implements OnInit {
  onlineOrders: any[] = [];
  loading: boolean = true;
  error: string | null = null;
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.loadOnlineOrders();
  }

  loadOnlineOrders() {
    this.loading = true;
    this.error = null;

    this.http.get<any[]>(`${this.apiUrl}/online-orders/last-100`).subscribe({
      next: (data) => {
        this.onlineOrders = data;
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading online orders:', err);
        this.error = 'Failed to load online orders';
        this.loading = false;
      },
    });
  }

  refreshOrders() {
    this.loadOnlineOrders();
  }

  getItemsDisplay(order: any): string {
    if (!order.cart || order.cart.length === 0) {
      return 'No items';
    }
    return order.cart
      .map((item: any) => `${item.quantity}x ${item.name}`)
      .join(', ');
  }

  getOrderDate(timestamp: string): string {
    try {
      return new Date(timestamp).toLocaleString('el-GR');
    } catch {
      return timestamp;
    }
  }

  getIngredientNames(ingredients: any[]): string {
    return ingredients?.map((ing) => ing.name).join(', ');
  }

  openInGoogleMaps(order: any) {
  const loc = order?.address?.location;
  if (!loc || typeof loc.lat !== 'number' || typeof loc.lng !== 'number') return;

  const url = `https://www.google.com/maps?q=${loc.lat},${loc.lng}`;
  window.open(url, '_blank'); // opens in browser / system
}
}
