import { Component, Input, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { EXTRALIST, EXTRALISTSWEET } from 'src/app/models/categories';

@Component({
  selector: 'app-item-detail-modal',
  templateUrl: './item-detail-modal.component.html',
  styleUrls: ['./item-detail-modal.component.scss'],
  standalone: false,
})
export class ItemDetailModalComponent implements OnInit {
  @Input() item: any;
  @Input() editMode: any;
  @Input() categoryName?: string;
  coffeeSize: 'single' | 'double' = 'single';
  coffeePreference: string = '';
  comments: any;
  searchTerm: string = '';
  extraList = EXTRALIST.map(extra => ({ ...extra }));
  extraListSweet = EXTRALISTSWEET.map(extra => ({ ...extra }));
  quantity = 1;

  constructor(private modalCtrl: ModalController) { }

  ngOnInit() {
    if (this.editMode) {
      this.coffeePreference = this.item.coffeePreference;
      this.comments = this.item.comments;
    }
  }

  close() {
    this.modalCtrl.dismiss({
    });
  }

  submit() {
    let finalPrice = this.item.price;

    if (this.supportsSingleOrDouble && this.coffeeSize === 'double') {
      finalPrice += 0.5;
    }
    const hasSelectedExtras = this.extraList?.some(extra => extra.selected);
    const extrasSource = hasSelectedExtras ? this.extraList : this.extraListSweet;
    const selectedExtras = extrasSource?.filter(extra => extra.selected) || [];

    selectedExtras.forEach(extra => {
      finalPrice += extra.price;
    });

    const barCategories = [
      'Καφέδες',
      'Χυμοί',
      'Αναψυκτικά',
      'Ποτά - Κρασιά',
      'Cocktails',
      'Μπύρες',
    ];
    const category = this.categoryName ?? '';


    const finalItem = {
      name: this.item?.name,
      price: finalPrice,
      category: this.categoryName,
      coffeePreference: this.categoryName === 'Καφέδες' ? this.coffeePreference : null,
      coffeeSize: this.categoryName === 'Καφέδες' && this.supportsSingleOrDouble ? this.coffeeSize : null,
      extras: selectedExtras.length > 0 ? selectedExtras.map(extra => ({ name: extra.name, price: extra.price })) : null,
      materials: this.item?.materials,
      materialsSweet: this.item?.materialsSweet,
      printer: barCategories.includes(category)
        ? 'bar'
        : category === 'Τοστ - Κρέπες'
        ? 'crepe'
        : 'kitchen',
      comments: this.comments
    };

    this.modalCtrl.dismiss({ finalItem, quantity: this.quantity });
  }

  isFormValid(): boolean {
    // Example: Ensure sweetness is selected for coffee
    if (this.categoryName === 'Καφέδες' && !this.coffeePreference) {
      return false;
    }

    return true;
  }

  filteredExtraList() {
  const term = this.removeDiacritics(this.searchTerm?.toLowerCase() || '');
  let extrasSource: { name: string; price: number; selected?: boolean }[] = [];

  if (this.item?.materials) {
    extrasSource = this.extraList ?? [];
  } else if (this.item?.materialsSweet) {
    extrasSource = this.extraListSweet ?? [];
  }

  return extrasSource.filter(extra =>
    this.removeDiacritics(extra.name.toLowerCase()).includes(term)
  );
}

// Reuse this helper function
removeDiacritics(text: string): string {
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}


  increment() {
    this.quantity++;
  }

  decrement() {
    if (this.quantity > 1) {
      this.quantity--;
    }
  }

  get supportsSingleOrDouble(): boolean {
    const namesWithOption = ["Ελληνικός", "Espresso", "Cappuccino", "Macchiato"];
    return namesWithOption.includes(this.item?.name);
  }

}
