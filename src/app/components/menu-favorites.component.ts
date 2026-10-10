import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MenuFavoritesService } from '../services/menu-favorites.service';

@Component({
  selector: 'app-favorite-toggle', standalone: true, changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<button type="button" class="favorite-star" [class.active]="favorites.has(item, category)"
    [attr.aria-pressed]="favorites.has(item, category)" [attr.aria-label]="'Αγαπημένο: ' + item.name"
    (keydown)="$event.stopPropagation()" (click)="$event.stopPropagation(); favorites.toggle(item, category)">
    {{ favorites.has(item, category) ? '★' : '☆' }}</button>`,
  styles: [`.favorite-star{background:none;border:0;color:#69758a;font-size:28px;min-width:44px;min-height:44px;cursor:pointer}.active{color:#2861ff}`]
})
export class FavoriteToggleComponent {
  favorites = inject(MenuFavoritesService);
  @Input() item: any;
  @Input() category = '';
}

@Component({
  selector: 'app-menu-favorites', standalone: true, imports: [CommonModule, FavoriteToggleComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<section aria-label="Αγαπημένα προϊόντα"><h3>★ Αγαπημένα <small>Σε αυτή τη συσκευή</small></h3>
    @if (favorites.resolve(categories).length) {
      <div class="favorite-grid">@for (item of favorites.resolve(categories); track item.categoryName + ':' + item.name) {
        <div class="favorite-card"><button type="button" class="favorite-product" (click)="itemSelected.emit(item)">
          <strong>{{ item.name }}</strong><span>{{ item.price | number:'1.2-2' }} €</span>
        </button><app-favorite-toggle [item]="item" [category]="item.categoryName" /></div>
      }</div>
    } @else { <p>Πάτησε ☆ δίπλα σε ένα προϊόν για να το βάλεις εδώ.</p> }
  </section>`,
  styles: [`section{padding:8px 12px 16px}h3{font-size:17px;margin:8px 0}small{display:block;font-size:12px;font-weight:normal;color:#69758a;margin-top:4px}p{font-size:13px;color:#69758a}.favorite-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:8px}.favorite-card{display:flex;align-items:center;border:1px solid #e1e6ef;border-radius:10px;background:var(--ion-card-background,var(--app-item-background,#fff))}.favorite-product{flex:1;min-width:0;min-height:70px;border:0;background:none;text-align:left;padding:12px;cursor:pointer;color:var(--ion-text-color,var(--app-text-color,#132344))}.favorite-product strong,.favorite-product span{display:block}.favorite-product span{color:#2861ff;margin-top:6px}`]
})
export class MenuFavoritesComponent {
  favorites = inject(MenuFavoritesService);
  @Input() categories: any[] = [];
  @Output() itemSelected = new EventEmitter<any>();
}
