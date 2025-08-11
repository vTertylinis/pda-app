import { Component, OnInit } from '@angular/core';
import { AlertController, ModalController } from '@ionic/angular';
import { CartService } from 'src/app/services/cart.service';

@Component({
  selector: 'app-developer-info',
  templateUrl: './developer-info.component.html',
  styleUrls: ['./developer-info.component.scss'],
  standalone: false,
})
export class DeveloperInfoComponent implements OnInit {
  currentMonth = new Date().toISOString().slice(0, 7);
  stats?: OrderStats;
  loading = false;
  showPopularItems = true;

  constructor(
    private modalCtrl: ModalController,
    private cartService: CartService,
    private alertController: AlertController
  ) {}

  ngOnInit() {
    this.fetchStats();
  }

  close() {
    this.modalCtrl.dismiss({});
  }
  togglePopularItems() {
    this.showPopularItems = !this.showPopularItems;
  }
  fetchStats() {
    this.loading = true;
    this.cartService.getOrderStats(this.currentMonth).subscribe({
      next: (res: OrderStats) => {
        this.stats = res;
        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
        console.error('Failed to load stats', err);
      },
    });
  }
}

export interface MostPopularItem {
  name: string;
  count: number;
  revenue: string; // string because backend formats toFixed(2)
}

export interface DailyRevenueEntry {
  day: string;      // date in "YYYY-MM-DD"
  revenue: string;  // revenue for that day (formatted string)
  orders: number;   // number of orders for that day
}

export interface MostPopularItem {
  name: string;
  count: number;
  revenue: string; // revenue for this item (formatted string)
}

export interface OrderStats {
  yearMonth: string;           // "YYYY-MM"
  totalOrders: number;
  totalRevenue: string;        // formatted as string
  averageOrderValue: string;   // formatted as string
  mostPopularItems: MostPopularItem[];
  dailyRevenue: DailyRevenueEntry[];
}

