import { Component, Input, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';

@Component({
  selector: 'app-item-selection-modal',
  templateUrl: './item-selection-modal.component.html',
  styleUrls: ['./item-selection-modal.component.scss'],
  standalone: false,
})
export class ItemSelectionModalComponent implements OnInit {
  @Input() categories: any[] = [];
  selectedCategory: any = null;
  searchQuery: string = '';
  filteredItems: any[] = [];

  constructor(private modalCtrl: ModalController) {}

  ngOnInit() {}

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
      category.items.forEach((item: any) => {
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

  selectItem(item: any, categoryName?: string) {
    this.modalCtrl.dismiss({
      item,
      categoryName: categoryName || this.selectedCategory?.name,
    });
  }

  close() {
    this.modalCtrl.dismiss({});
  }
}
