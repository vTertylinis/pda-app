import { Component, Input, OnInit, inject } from '@angular/core';
import { ModalController, IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EXTRALIST, EXTRALISTSWEET } from 'src/app/models/categories';

@Component({
  selector: 'app-item-detail-modal',
  templateUrl: './item-detail-modal.component.html',
  styleUrls: ['./item-detail-modal.component.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule]
})
export class ItemDetailModalComponent implements OnInit {
  private modalCtrl = inject(ModalController);

  @Input() item: any;
  @Input() editMode: any;
  @Input() categoryName?: string;
  coffeeSize: 'single' | 'double' = 'single';
  coffeePreference: string = '';
  decaf = false;
  takeaway = false;
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
  searchTerm: string = '';
  extraList = EXTRALIST.map((extra) => ({ ...extra, quantity: 1 }));
  extraListSweet = EXTRALISTSWEET.map((extra) => ({ ...extra, quantity: 1 }));
  quantity = 1;

  ngOnInit() {
    if (this.editMode) {
      this.coffeePreference = this.item?.coffeePreference;
      this.decaf = this.item?.decaf === true;
      this.takeaway = this.item?.takeaway === true;
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
        const validPotoOptions = ['Pink Soda', 'Φυσικός Πορτοκάλι', 'Red Bull'];
        const premium = parts.find(part => validPotoOptions.includes(part));
        this.potoMixOption = this.item.potoMixOption || premium || '';
        this._editPotoMixOption = this.potoMixOption;
        this.comments = parts.filter(part => part !== premium).join(' - ');
        // Restore generated chips while preserving unrecognized free text.
        const commentParts = String(this.comments || '').split(' - ');
        let rest = commentParts.shift() || '';
        const consume = (options: string[]) => {
          const match = [...options].sort((a, b) => b.length - a.length)
            .find(option => rest === option || rest.startsWith(option + ' '));
          if (match) rest = rest.slice(match.length).trim();
          return match || '';
        };
        this.potoLiquor = consume(this.potoLiquorOptions);
        this.potoMixer = consume(this.potoMixerOptions);
        let prep: string;
        while ((prep = consume(this.potoAllPrepOptions))) this.potoPrep.push(prep);
        this.comments = [rest, ...commentParts].filter(Boolean).join(' - ');
      }
      this.selectMatchingItems(
        this.extraList,
        this.extraListSweet,
        (this.item.extras || []).map((extra: any) => {
          const match = extra.name.match(/^(.*?)\s[×x](\d+)$/);
          return { ...extra, name: match ? match[1] : extra.name,
            quantity: extra.quantity || (match ? Number(match[2]) : 1) };
        })
      );
    }
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
       if (
        itemsToSelect.some(
          (sel) => sel.name === obj.name && sel.price === obj.price
        )
      ) {
        obj.selected = true;
        obj.quantity = itemsToSelect.find(sel => sel.name === obj.name)?.quantity || 1;
      }
    });
  }

  close() {
    this.modalCtrl.dismiss({});
  }

  get supportsTakeaway(): boolean {
    const category = this.categoryName || this.item?.category;
    return ['Καφέδες', 'Χυμοί', 'Αναψυκτικά', 'Cocktails', 'Μπύρες', 'Ούζο-Μεζέδες'].includes(category)
      && !['Νερό Μικρό', 'Νερό Μεγάλο', 'Παγωτό', 'Μεζέδες', 'Μπακαλιαράκια', 'Γάμπαρι'].includes(this.item?.name);
  }

  computeFinalPrice(): number {
    let finalPrice = this.item.price;
    // Undo the previous discount before applying the current selection.
    if (this.editMode && this.item.takeaway === true) finalPrice += 1;
    // In edit mode, revert previously added values to get base price
    if (this.editMode) {
      // Remove previous extras
      if (Array.isArray(this.item.extras)) {
        this.item.extras.forEach((extra: { price: number }) => {
          finalPrice -= extra.price * ((extra as any).quantity || Number((extra as any).name?.match(/\s[×x](\d+)$/)?.[1]) || 1);
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
    this.getSelectedExtras().forEach((extra) => {
      finalPrice += extra.price * extra.quantity;
    });
    if (this.supportsTakeaway && this.takeaway) finalPrice -= 1;
    return Math.max(0, Math.round(finalPrice * 100) / 100);
  }

  get liveTotal(): number {
    return this.computeFinalPrice() * (this.editMode ? 1 : this.quantity);
  }

  private getSelectedExtras() {
    const extras = this.extraList.some(extra => extra.selected) ? this.extraList : this.extraListSweet;
    return extras.filter(extra => extra.selected);
  }

  submit() {
    const finalPrice = this.computeFinalPrice();
    const selectedExtras = this.getSelectedExtras();

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
      takeaway: this.supportsTakeaway && this.takeaway,
      coffeePreference:
        this.categoryName === 'Καφέδες' ? this.coffeePreference : null,
      decaf: this.categoryName === 'Καφέδες' && this.decaf,
      coffeeSize:
        this.categoryName === 'Καφέδες' && this.supportsSingleOrDouble
          ? this.coffeeSize
          : null,
      extras:
        selectedExtras.length > 0
          ? selectedExtras.map((extra) => ({
              name: extra.quantity > 1 ? `${extra.name} x${extra.quantity}` : extra.name,
              price: extra.price,
              quantity: extra.quantity,
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
      potoMixOption: this.isPotoOptionTarget ? this.potoMixOption : this.item?.potoMixOption,
      comments: this.composeComments(),
    };

    this.modalCtrl.dismiss({ finalItem, quantity: this.editMode ? 1 : this.quantity });
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
      this.removeDiacritics(extra.name.toLowerCase()).includes(term)
    );
  }

  onExtraSelectionChange(extra: { selected?: boolean }) {
  
  }

  // Reuse this helper function
  removeDiacritics(text: string): string {
    return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\u03c2/g, '\u03c3');
  }

  increment() {
    if (this.editMode) return;
    this.quantity = Math.min(this.quantity + 1, 100);
  }

  decrement() {
    if (this.editMode) return;
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
      'Haig', 'Famous Grouse', 'Τζόνι', 'Κάτι Σαρκ', 'Μπακάρντι', 'Τζακ',
    ],
    'Ποτό Σπέσιαλ': [
      'Τζόνι Μαύρο', 'Τζιν', 'Σίβας', 'Τζακ', 'Τζακ Honey', 'Βότκα',
      'Αβάνα', 'Ντιπλοματικό', 'Μπόμπεϊ', 'Ταγκερέι',
    ],
    'Ποτό Πρίμιουμ': [
      'Μπελβεντέρε', 'Γκρέι Γκουζ', 'Μπλακ Μπάρελ', 'Ντιπλοματικό',
      'Ζακάπα', 'Μακάλαν', 'Τζιν',
    ],
  };

  private static readonly POTO_MIXERS: string[] = [
    'Τόνικ', 'Λεμονάδα', 'Κόλα', 'Σόδα', 'Πορτοκάλι', 'Βύσσινο', 'Σπράιτ',
  ];

  readonly potoPrepGroups = [
    { label: 'Πάγος', options: ['Πάγο', 'Χωρίς πάγο', '1 παγάκι', '2 παγάκια', '3 παγάκια', 'Ice ball'], exclusive: true },
    { label: 'Ποτήρι', options: ['Χαμηλό', 'Ψηλό'], exclusive: true },
    { label: 'Σερβίρισμα', options: ['Στημένο', 'Σκέτο', 'Διπλό'], exclusive: false },
  ];

  private get potoAllPrepOptions(): string[] {
    return this.potoPrepGroups.flatMap(group => group.options);
  }

  get potoLiquorOptions(): string[] {
    return ItemDetailModalComponent.POTO_LIQUORS[this.item?.name] ?? [];
  }

  get potoMixerOptions(): string[] {
    return ItemDetailModalComponent.POTO_MIXERS;
  }

  selectPotoLiquor(option: string) {
    this.potoLiquor = this.potoLiquor === option ? '' : option;
  }

  selectPotoMixer(option: string) {
    this.potoMixer = this.potoMixer === option ? '' : option;
  }

  togglePotoMixOption(option: string) {
    this.potoMixOption = this.potoMixOption === option ? '' : option;
  }

  togglePotoPrep(option: string) {
    const i = this.potoPrep.indexOf(option);
    if (i > -1) {
      this.potoPrep.splice(i, 1);
    } else {
      const group = this.potoPrepGroups.find(group => group.options.includes(option));
      if (!group) return;
      if (group.exclusive) {
        this.potoPrep = this.potoPrep.filter(prep => !group.options.includes(prep));
      }
      this.potoPrep.push(option);
    }
  }

  isPotoPrepSelected(option: string): boolean {
    return this.potoPrep.includes(option);
  }

  // Order matters for readability on the printed ticket: liquor, mixer, prep.
  private potoChipString(): string {
    const prep = this.potoAllPrepOptions.filter(option => this.potoPrep.includes(option));
    return [this.potoLiquor, this.potoMixer, ...prep]
      .filter(Boolean)
      .join(' ');
  }

  get potoChipPreview(): string {
    return [this.potoChipString(), this.comments].filter(Boolean).join(' ');
  }

}

interface ItemWithSelected {
  name: string;
  price: number;
  quantity: number;
  selected: boolean;
}

interface Item {
  quantity?: number;
  name: string;
  price: number;
}
