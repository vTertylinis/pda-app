import { Component, OnInit } from '@angular/core';
import { AlertController, ModalController } from '@ionic/angular';
import { ItemDetailModalComponent } from '../components/item-detail-modal/item-detail-modal.component';
import { CartService } from '../services/cart.service';
import { CATEGORIES } from '../models/categories';

@Component({
  selector: 'app-tab1',
  templateUrl: './tab1.page.html',
  styleUrls: ['./tab1.page.scss'],
  standalone: false,
})
export class Tab1Page implements OnInit {
  tables = [
    ...Array.from({ length: 40 }, (_, i) => ({ name: (i + 1).toString() })),
    { name: 'bar1' },
    { name: 'bar2' },
    { name: 'extra1' },
    { name: 'extra2' },
  ];
  categories = CATEGORIES;
  selectedTableName: string | null = null;
  selectedCategory: any = null;
  searchQuery: string = '';
  filteredItems: any[] = [];

  constructor(
    private modalCtrl: ModalController,
    private cartService: CartService,
    private alertController: AlertController
  ) {}

  ngOnInit() {}

  ionViewWillEnter() {
    this.selectedTableName = null;
    this.selectedCategory = null;
    this.searchQuery = '';
    this.filteredItems = [];
  }

  onSelectTable(tableName: string) {
    this.selectedTableName = tableName;
  }

  onBack() {
    this.selectedTableName = null;
    this.selectedCategory = null;
    this.searchQuery = '';
    this.filteredItems = [];
  }

  onSelectCategory(category: any) {
    this.selectedCategory = category;
  }

  onBackToCategories() {
    this.selectedCategory = null;
    this.searchQuery = '';
    this.filteredItems = [];
  }

  onSearch(event: any) {
    const query = event.detail.value.trim().toLowerCase();
    this.searchQuery = query;

    if (!query) {
      this.filteredItems = [];
      return;
    }

    // Normalize and remove diacritics from query
    const normalizedQuery = this.removeDiacritics(query);

    this.filteredItems = [];
    this.categories.forEach((category) => {
      category.items.forEach((item) => {
        const normalizedItemName = this.removeDiacritics(
          item.name.toLowerCase()
        );
        if (normalizedItemName.includes(normalizedQuery)) {
          this.filteredItems.push({
            ...item,
            categoryName: category.name,
          });
        }
      });
    });
  }

  // Helper function to remove diacritics
  removeDiacritics(text: string): string {
    return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }

  async openItemModal(item: any, categoryName?: string) {
    const modal = await this.modalCtrl.create({
      component: ItemDetailModalComponent,
      componentProps: { item, categoryName },
    });
    await modal.present();

    const { data } = await modal.onDidDismiss();

    if (data?.finalItem) {
      const quantity = data.quantity || 1;
      for (let i = 0; i < quantity; i++) {
        this.cartService
          .addItemToCart(this.selectedTableName, data.finalItem)
          .subscribe({
            next: (res) => console.log(`Item #${i + 1} added to cart:`, res),
            error: async (err) => {
              console.error(`Add to cart failed on item #${i + 1}:`, err);
              await this.alertModal(
                `Failed to add item #${i + 1} to cart. Error: ${
                  err.message || err
                }`
              );
            },
          });
      }
    }
  }
  async alertModal(message: string) {
    const alert = await this.alertController.create({
      header: 'Error',
      message: message,
      buttons: [
        {
          text: 'OK',
          role: 'cancel',
          handler: () => {
            console.log('Error alert dismissed');
          },
        },
      ],
    });

    await alert.present();
  }
}
