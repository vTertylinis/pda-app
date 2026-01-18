import { CommonModule } from '@angular/common';
import { Component, Input, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ModalController, IonicModule } from '@ionic/angular';
import { EXTRALIST, EXTRALISTSWEET } from 'src/app/models/categories';

@Component({
  selector: 'app-item-detail-modal',
  templateUrl: './item-detail-modal.component.html',
  styleUrls: ['./item-detail-modal.component.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule],
})
export class ItemDetailModalComponent implements OnInit {
  @Input() item: any;
  @Input() editMode: any;
  @Input() categoryName?: string;
  coffeeSize: 'single' | 'double' = 'single';
  coffeePreference: string = '';
  comments: any;
  drinkCommentOption: 'Με' | 'Χωρίς' | '' = '';
  searchTerm: string = '';
  extraList = EXTRALIST.map((extra) => ({ ...extra }));
  extraListSweet = EXTRALISTSWEET.map((extra) => ({ ...extra }));
  quantity = 1;

  constructor(private modalCtrl: ModalController) {}

  ngOnInit() {
    if (this.editMode) {
      this.coffeePreference = this.item?.coffeePreference;
      this.comments = this.item?.comments;
      this.coffeeSize = this.item?.coffeeSize;
      // Preserve structured comment option when available
      if (this.isOuzoOptionTarget && typeof this.comments === 'string') {
        const parts = this.comments.split(' - ');
        const candidate = parts[0];
        if (candidate === 'Με' || candidate === 'Χωρίς') {
          this.drinkCommentOption = candidate as 'Με' | 'Χωρίς';
          parts.shift();
          this.comments = parts.join(' - ');
        }
      }
      this.selectMatchingItems(
        this.extraList,
        this.extraListSweet,
        this.item.extras,
      );
    }
  }

  selectMatchingItems(
    arr1: ItemWithSelected[],
    arr2: ItemWithSelected[],
    itemsToSelect: Item[],
  ): void {
    const containsAll = (arr: ItemWithSelected[], items: Item[]) =>
      items.every((item) =>
        arr.some((el) => el.name === item.name && el.price === item.price),
      );

    let targetArray: ItemWithSelected[] | null = null;
    if (containsAll(arr1, itemsToSelect)) {
      targetArray = arr1;
    } else if (containsAll(arr2, itemsToSelect)) {
      targetArray = arr2;
    }

    if (!targetArray) {
      console.warn('No matching array found for the given items');
      return;
    }

    targetArray.forEach((obj) => {
      if (
        itemsToSelect.some(
          (sel) => sel.name === obj.name && sel.price === obj.price,
        )
      ) {
        obj.selected = true;
      }
    });
  }

  close() {
    this.modalCtrl.dismiss({});
  }

  submit() {
    let finalPrice = this.item.price;
    // In edit mode, revert previously added values to get base price
    if (this.editMode) {
      // Remove previous extras
      if (Array.isArray(this.item.extras)) {
        this.item.extras.forEach((extra: { price: number }) => {
          finalPrice -= extra.price;
        });
      }

      // Remove double coffee surcharge if previously applied
      if (this.supportsSingleOrDouble && this.item.coffeeSize === 'double') {
        finalPrice -= 0.5;
      }
    }

    if (this.supportsSingleOrDouble && this.coffeeSize === 'double') {
      finalPrice += 0.5;
    }
    const hasSelectedExtras = this.extraList?.some((extra) => extra.selected);
    const extrasSource = hasSelectedExtras
      ? this.extraList
      : this.extraListSweet;
    const selectedExtras =
      extrasSource?.filter((extra) => extra.selected) || [];

    selectedExtras.forEach((extra) => {
      finalPrice += extra.price;
    });

    const barCategories = [
      'Καφέδες',
      'Χυμοί',
      'Ούζο-Μεζέδες',
      'Αναψυκτικά',
      'Ποτά - Κρασιά',
      'Cocktails',
      'Μπύρες',
    ];

    const category = this.categoryName ?? '';
    const itemName = this.item?.name ?? '';

    // define the special case (you can add more later if needed)
    const kitchenExceptions = [
      {
        category: 'Ούζο-Μεζέδες',
        name: 'Μεζέδες',
      },
      {
        category: 'Ούζο-Μεζέδες',
        name: 'Μπακαλιαράκια',
      },
      {
        category: 'Ούζο-Μεζέδες',
        name: 'Γάμπαρι',
      },
    ];

    const isBarCategory = barCategories.includes(category);

    // check if the item is the exception
    const isKitchenException = kitchenExceptions.some(
      (exception) =>
        category === exception.category && itemName === exception.name,
    );

    const finalItem = {
      name: this.item?.name,
      price: finalPrice,
      category: this.categoryName,
      coffeePreference:
        this.categoryName === 'Καφέδες' ? this.coffeePreference : null,
      coffeeSize:
        this.categoryName === 'Καφέδες' && this.supportsSingleOrDouble
          ? this.coffeeSize
          : null,
      extras:
        selectedExtras.length > 0
          ? selectedExtras.map((extra) => ({
              name: extra.name,
              price: extra.price,
            }))
          : null,
      materials: this.item?.materials,
      materialsSweet: this.item?.materialsSweet,
      printer: isKitchenException
        ? 'kitchen'
        : isBarCategory
          ? 'bar'
          : category === 'Τοστ - Κρέπες'
            ? 'crepe'
            : 'kitchen',
      comments: this.composeComments(),
    };

    this.modalCtrl.dismiss({ finalItem, quantity: this.quantity });
  }

  private composeComments(): string | undefined {
    const combined = this.isOuzoOptionTarget
      ? [this.drinkCommentOption, this.comments]
          .filter((value) => !!value)
          .join(' - ')
      : this.comments;
    return combined === '' ? undefined : combined;
  }

  isFormValid(): boolean {
    // Example: Ensure sweetness is selected for coffee
    if (this.categoryName === 'Καφέδες' && !this.coffeePreference) {
      return false;
    }

    // New validation for Τοστ - Κρέπες category
    if (this.categoryName === 'Τοστ - Κρέπες') {
      const anySelectedInExtraList = this.extraList.some(
        (extra) => extra.selected,
      );
      const anySelectedInExtraListSweet = this.extraListSweet.some(
        (extra) => extra.selected,
      );

      if (!anySelectedInExtraList && !anySelectedInExtraListSweet) {
        return false;
      }
    }

    return true;
  }

  filteredExtraList() {
    const term = this.removeDiacritics(this.searchTerm?.toLowerCase() || '');
    let extrasSource: { name: string; price: number; selected?: boolean }[] =
      [];

    if (this.item?.materials) {
      extrasSource = this.extraList ?? [];
    } else if (this.item?.materialsSweet) {
      extrasSource = this.extraListSweet ?? [];
    }

    return extrasSource.filter((extra) =>
      this.removeDiacritics(extra.name.toLowerCase()).includes(term),
    );
  }

  onExtraSelectionChange(extra: { selected?: boolean }) {
    console.log('Extra selection changed:', extra);
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
    const namesWithOption = [
      'Ελληνικός',
      'Espresso',
      'Cappuccino',
      'Macchiato',
    ];
    return namesWithOption.includes(this.item?.name);
  }

  get isOuzoOptionTarget(): boolean {
    const ouzoOptions = [
      'Ούζο ποτήρι',
      'Τσίπουρο ποτήρι',
      'Μπουκάλι Ούζο',
      'Αποστολάκι',
      'Ηδωνικό',
    ];
    return (
      this.categoryName === 'Ούζο-Μεζέδες' &&
      ouzoOptions.includes(this.item?.name)
    );
  }
}

interface ItemWithSelected {
  name: string;
  price: number;
  selected: boolean;
}

interface Item {
  name: string;
  price: number;
}
