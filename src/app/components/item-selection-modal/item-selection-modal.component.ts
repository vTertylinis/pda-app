import { MenuFavoritesComponent, FavoriteToggleComponent } from '../menu-favorites.component';
import { Component, Input, ChangeDetectionStrategy, ElementRef, Injector, afterNextRender, inject, viewChild } from '@angular/core';
import { DialogRef } from '../../ui/dialog.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-item-selection-modal',
  templateUrl: './item-selection-modal.component.html',
  styleUrls: ['./item-selection-modal.component.scss'],
  standalone: true,
  imports: [MenuFavoritesComponent, FavoriteToggleComponent, CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ItemSelectionModalComponent {
  private dialogRef = inject(DialogRef);
  private readonly injector = inject(Injector);
  private readonly content = viewChild.required<ElementRef<HTMLElement>>('content');

  @Input() categories: any[] = [];
  selectedCategory: any = null;
  searchQuery: string = '';
  filteredItems: any[] = [];

  onSelectCategory(category: any) {
    this.selectedCategory = category;
    this.resetScroll();
  }

  onBackToCategories() {
    this.selectedCategory = null;
    this.searchQuery = '';
    this.filteredItems = [];
    this.resetScroll();
  }

  private resetScroll() {
    // Reset after the new list renders so the previous list's offset is not reused.
    afterNextRender({
      write: () => this.content().nativeElement.scrollTo({ top: 0, behavior: 'instant' }),
    }, { injector: this.injector });
  }

  onSearch(event: any) {
    const query = event.target.value.trim().toLowerCase();
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
    return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\u03c2/g, '\u03c3');
  }

  selectItem(item: any, categoryName?: string) {
    this.dialogRef.dismiss({
      item,
      categoryName: categoryName || this.selectedCategory?.name,
    });
  }

  close() {
    this.dialogRef.dismiss({});
  }

  trackByName(index: number, item: any): string {
    return item.name;
  }

  trackByCategoryName(index: number, category: any): string {
    return category.name;
  }
}
