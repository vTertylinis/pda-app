import { Component, Input, OnInit, ChangeDetectionStrategy, inject } from '@angular/core';
import { ModalController, IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EXTRALIST, EXTRALISTSWEET } from '../../models/categories';

@Component({
  selector: 'app-item-detail-modal',
  templateUrl: './item-detail-modal.component.html',
  styleUrls: ['./item-detail-modal.component.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ItemDetailModalComponent implements OnInit {
  private modalCtrl = inject(ModalController);

  @Input() item: any;
  @Input() editMode: any;
  @Input() categoryName?: string;
  coffeeSize: 'single' | 'double' = 'single';
  coffeePreference: string = '';
  comments: any;
  drinkCommentOption: string = '';
  potoMixOption: string = '';
  private _editPotoMixOption: string = '';

  // Structured quick-pick selections for Ποτό items. Built from the most
  // common free-text comments in the order history (liquor + mixer + prep),
  // so staff tap instead of type. The free-text `comments` field is appended
  // for anything not covered by the chips.
  potoLiquor: string = '';
  potoMixer: string = '';
  potoPrep: string[] = [];
  private _searchTerm: string = '';
  cachedFilteredExtras: ItemWithSelected[] = [];
  extraList: ItemWithSelected[] = EXTRALIST.map((extra) => ({ ...extra, quantity: 1, selected: false }));
  extraListSweet: ItemWithSelected[] = EXTRALISTSWEET.map((extra) => ({ ...extra, quantity: 1, selected: false }));
  quantity = 1;

  get searchTerm(): string { return this._searchTerm; }
  set searchTerm(value: string) {
    this._searchTerm = value;
    this.updateFilteredExtras();
  }

  ngOnInit() {
    if (this.editMode) {
      this.coffeePreference = this.item?.coffeePreference;
      this.comments = this.item?.comments;
      this.coffeeSize = this.item?.coffeeSize;
      // Preserve structured comment option when available
      if ((this.isOuzoOptionTarget || this.isKarafakiOptionTarget) && typeof this.comments === 'string') {
        const parts = this.comments.split(' - ');
        const candidate = parts[0];
        const validCandidates = ['Με', 'Χωρίς', 'Ημίγλυκο', 'Ξηρό'];
        if (validCandidates.includes(candidate)) {
          this.drinkCommentOption = candidate;
          parts.shift();
          this.comments = parts.join(' - ');
        }
      }
      if (this.isPotoOptionTarget && typeof this.comments === 'string') {
        const parts = this.comments.split(' - ');
        const candidate = parts[0];
        const validPotoOptions = ['Pink Soda', 'Φυσικός Πορτοκάλι', 'Red Bull'];
        if (validPotoOptions.includes(candidate)) {
          this.potoMixOption = candidate;
          this._editPotoMixOption = candidate;
          parts.shift();
          this.comments = parts.join(' - ');
        }
      }
      // Parse formatted extra names (e.g., "cheese ×2" → "cheese", quantity: 2).
      // Accept both the Unicode "×" and the ASCII "x" separator: submit() writes
      // the quantity suffix as "x{qty}", so a second edit must be able to parse it
      // back, otherwise the quantity (and its surcharge) is silently lost.
      let extrasToSelect = this.item.extras;
      if (extrasToSelect) {
        extrasToSelect = extrasToSelect.map((extra: any) => {
          const match = extra.name.match(/^(.*?)\s[×x](\d+)$/);
          if (match) {
            return {
              name: match[1],
              price: extra.price,
              quantity: parseInt(match[2], 10),
            };
          }
          return extra;
        });
      }
      this.selectMatchingItems(
        this.extraList,
        this.extraListSweet,
        extrasToSelect
      );
    }
    this.updateFilteredExtras();
  }

  selectMatchingItems(
    arr1: ItemWithSelected[],
    arr2: ItemWithSelected[],
    itemsToSelect: Item[]
  ): void {
    const containsAll = (arr: ItemWithSelected[], items: Item[]) =>
      items.every((item) =>
        arr.some((el) => el.name === item.name && el.price === item.price)
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
      const matched = itemsToSelect.find(
        (sel) => sel.name === obj.name && sel.price === obj.price
      );
      if (matched) {
        obj.selected = true;
        obj.quantity = (matched as any).quantity || 1;
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
      // Remove previous extras (including their quantity)
      if (Array.isArray(this.item.extras)) {
        this.item.extras.forEach((extra: { price: number; quantity?: number }) => {
          const qty = extra.quantity || 1;
          finalPrice -= extra.price * qty;
        });
      }

      // Remove double coffee surcharge if previously applied
      if (this.supportsSingleOrDouble && this.item.coffeeSize === 'double') {
        finalPrice -= 0.5;
      }

      // Remove previously applied poto mix surcharge
      if (this.isPotoOptionTarget && this._editPotoMixOption) {
        finalPrice -= 1;
      }

    }

    if (this.supportsSingleOrDouble && this.coffeeSize === 'double') {
      finalPrice += 0.5;
    }

    if (this.isPotoOptionTarget && this.potoMixOption) {
      finalPrice += 1;
    }

    const hasSelectedExtras = this.extraList?.some((extra) => extra.selected);
    const extrasSource = hasSelectedExtras
      ? this.extraList
      : this.extraListSweet;
    const selectedExtras =
      extrasSource?.filter((extra) => extra.selected) || [];

    selectedExtras.forEach((extra) => {
      const qty = extra.quantity || 1;
      finalPrice += extra.price * qty;
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
        category === exception.category && itemName === exception.name
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
          ? selectedExtras.map((extra) => {
              const qty = extra.quantity || 1;
              return {
                name: qty > 1 ? `${extra.name} x${qty}` : extra.name,
                price: extra.price,
                quantity: qty,
              };
            })
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
    let combined: string | undefined;
    if (this.isOuzoOptionTarget || this.isKarafakiOptionTarget) {
      combined = [this.drinkCommentOption, this.comments].filter((value) => !!value).join(' - ');
    } else if (this.isPotoOptionTarget) {
      // Order on the ticket: chip selection (liquor/mixer/prep), then the paid
      // premium mixer, then any free-text the user still typed.
      combined = [this.potoChipString(), this.potoMixOption, this.comments]
        .filter((value) => !!value)
        .join(' - ');
    } else {
      combined = this.comments;
    }
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
        (extra) => extra.selected
      );
      const anySelectedInExtraListSweet = this.extraListSweet.some(
        (extra) => extra.selected
      );

      if (!anySelectedInExtraList && !anySelectedInExtraListSweet) {
        return false;
      }
    }

    return true;
  }

  filteredExtraList(): ItemWithSelected[] {
    return this.cachedFilteredExtras;
  }

  private updateFilteredExtras() {
    const term = this.removeDiacritics(this._searchTerm?.toLowerCase() || '');
    let extrasSource: ItemWithSelected[] = [];

    if (this.item?.materials) {
      extrasSource = this.extraList ?? [];
    } else if (this.item?.materialsSweet) {
      extrasSource = this.extraListSweet ?? [];
    }

    this.cachedFilteredExtras = extrasSource.filter((extra) =>
      this.removeDiacritics(extra.name.toLowerCase()).includes(term)
    );
  }

  onExtraSelectionChange(extra: { selected?: boolean; quantity?: number }) {
    if (extra.selected && (!extra.quantity || extra.quantity < 1)) {
      extra.quantity = 1;
    }
    console.log('Extra selection changed:', extra);
  }

  incrementExtra(extra: { selected?: boolean; quantity?: number }) {
    if (!extra.selected) {
      extra.selected = true;
      extra.quantity = 1;
    } else {
      extra.quantity = Math.min((extra.quantity || 1) + 1, 2);
    }
  }

  decrementExtra(extra: { selected?: boolean; quantity?: number }) {
    if (!extra.selected) return;
    extra.quantity = Math.max((extra.quantity || 1) - 1, 1);
    if (extra.quantity === 0) {
      extra.selected = false;
      extra.quantity = 1;
    }
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

  get potoLivePreview(): string {
    return [this.potoChipString(), this.potoMixOption, this.comments]
      .filter(Boolean)
      .join(' ');
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
    return this.categoryName === 'Ούζο-Μεζέδες' && ouzoOptions.includes(this.item?.name);
  }

  get isKarafakiOptionTarget(): boolean {
    return this.categoryName === 'Ούζο-Μεζέδες' && this.item?.name === 'Καραφάκι Κρασί 1/2';
  }

  get isPotoOptionTarget(): boolean {
    const potoItems = ['Ποτό Απλό', 'Ποτό Σπέσιαλ', 'Ποτό Πρίμιουμ'];
    return this.categoryName === 'Ποτά - Κρασιά' && potoItems.includes(this.item?.name);
  }

  // --- Ποτό quick-pick chips -------------------------------------------------
  // Liquor lists are ordered by real frequency in the order history, per item.
  private static readonly POTO_LIQUORS: Record<string, string[]> = {
    'Ποτό Απλό': [
      'Τζιν', 'Βότκα', 'Τζέιμσον', 'Καμπάρι', 'Τουλαμόρ',
      'Τζόνι', 'Κάτι Σαρκ', 'Μπακάρντι', 'Τζακ',
    ],
    'Ποτό Σπέσιαλ': [
      'Τζόνι Μαύρο', 'Τζιν', 'Σίβας', 'Τζακ', 'Βότκα',
      'Αβάνα', 'Ντιπλοματικό', 'Μπόμπεϊ', 'Ταγκερέι', 'Καμπάρι',
    ],
    'Ποτό Πρίμιουμ': [
      'Μπελβεντέρε', 'Γκρέι Γκουζ', 'Μπλακ Μπάρελ', 'Ντιπλοματικό',
      'Ζακάπα', 'Μακάλαν', 'Τζιν',
    ],
  };

  private static readonly POTO_MIXERS: string[] = [
    'Τόνικ', 'Λεμονάδα', 'Κόλα', 'Σόδα', 'Πορτοκάλι', 'Βύσσινο', 'Σπράιτ',
  ];

  private static readonly POTO_PREP: string[] = [
    'Πάγο', 'Χωρίς πάγο', 'Στημένο', 'Σκέτο', 'Διπλό',
  ];

  get potoLiquorOptions(): string[] {
    return ItemDetailModalComponent.POTO_LIQUORS[this.item?.name] ?? [];
  }

  get potoMixerOptions(): string[] {
    return ItemDetailModalComponent.POTO_MIXERS;
  }

  get potoPrepOptions(): string[] {
    return ItemDetailModalComponent.POTO_PREP;
  }

  selectPotoLiquor(option: string) {
    this.potoLiquor = this.potoLiquor === option ? '' : option;
  }

  selectPotoMixer(option: string) {
    this.potoMixer = this.potoMixer === option ? '' : option;
  }

  togglePotoPrep(option: string) {
    const i = this.potoPrep.indexOf(option);
    if (i > -1) {
      this.potoPrep.splice(i, 1);
    } else {
      // "Πάγο" and "Χωρίς πάγο" are mutually exclusive
      if (option === 'Πάγο') this.removePrep('Χωρίς πάγο');
      if (option === 'Χωρίς πάγο') this.removePrep('Πάγο');
      this.potoPrep.push(option);
    }
  }

  private removePrep(option: string) {
    const i = this.potoPrep.indexOf(option);
    if (i > -1) this.potoPrep.splice(i, 1);
  }

  isPotoPrepSelected(option: string): boolean {
    return this.potoPrep.includes(option);
  }

  // Order matters for readability on the printed ticket: liquor, mixer, prep.
  private potoChipString(): string {
    return [this.potoLiquor, this.potoMixer, ...this.potoPrep]
      .filter(Boolean)
      .join(' ');
  }

  get potoChipPreview(): string {
    return [this.potoChipString(), this.comments].filter(Boolean).join(' ');
  }

  trackByExtraName(index: number, extra: ItemWithSelected): string {
    return extra.name;
  }

  trackByValue(index: number, option: string): string {
    return option;
  }
}

interface ItemWithSelected {
  name: string;
  price: number;
  selected: boolean;
  quantity: number;
}

interface Item {
  name: string;
  price: number;
  quantity?: number;
}
