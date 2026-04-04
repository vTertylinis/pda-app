import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { AlertController, ModalController, IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { CartService } from 'src/app/services/cart.service';

@Component({
  selector: 'app-developer-info',
  templateUrl: './developer-info.component.html',
  styleUrls: ['./developer-info.component.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DeveloperInfoComponent implements OnInit {
  currentMonth = new Date().toISOString().slice(0, 7);
  stats?: OrderStats;
  loading = false;
  showPopularItems = true;

  constructor(
    private modalCtrl: ModalController,
    private cartService: CartService,
    private alertController: AlertController,
    private cdr: ChangeDetectorRef
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

  trackByItemName(index: number, item: MostPopularItem): string {
    return item.name;
  }

  trackByDay(index: number, day: DailyRevenueEntry): string {
    return day.day;
  }

  fetchStats() {
    this.loading = true;
    this.cartService.getOrderStats(this.currentMonth).subscribe({
      next: (res: OrderStats) => {
        this.stats = res;
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.loading = false;
        this.cdr.markForCheck();
        console.error('Failed to load stats', err);
      },
    });
  }
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

