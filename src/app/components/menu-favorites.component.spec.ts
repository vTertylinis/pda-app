import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, describe, expect, it } from 'vitest';
import { FavoriteToggleComponent, MenuFavoritesComponent } from './menu-favorites.component';
import { MenuFavoritesService } from '../services/menu-favorites.service';

@Component({ standalone: true, imports: [FavoriteToggleComponent],
  template: `<div (click)="opened = opened + 1"><app-favorite-toggle [item]="item" category="Drinks" /></div>` })
class ProductRow {
  item = { name: 'Coffee', price: 3 };
  opened = 0;
}
describe('Favorite menu interactions', () => {
  afterEach(() => { localStorage.removeItem('restaurant.menu-favorites.v1'); TestBed.resetTestingModule(); });
  it('toggling a star does not open its product and favorite selection retains catalogue options', () => {
    localStorage.removeItem('restaurant.menu-favorites.v1');
    const row = TestBed.createComponent(ProductRow);
    row.detectChanges();
    row.nativeElement.querySelector('button').click();
    expect(row.componentInstance.opened).toBe(0);
    expect(TestBed.inject(MenuFavoritesService).has(row.componentInstance.item, 'Drinks')).toBe(true);
    const panel = TestBed.createComponent(MenuFavoritesComponent);
    const product = { name: 'Coffee', price: 4, materials: true };
    panel.componentRef.setInput('categories', [{ name: 'Drinks', items: [product] }]);
    let selected: any;
    panel.componentInstance.itemSelected.subscribe(item => selected = item);
    panel.detectChanges();
    panel.nativeElement.querySelector('.favorite-product').click();
    expect(selected).toEqual({ ...product, categoryName: 'Drinks' });
    panel.nativeElement.querySelector('.favorite-star').click();
    panel.detectChanges();
    expect(panel.nativeElement.querySelector('.favorite-product')).toBeNull();
  });
});
