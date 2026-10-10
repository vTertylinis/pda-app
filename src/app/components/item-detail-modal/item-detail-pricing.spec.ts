import { describe, expect, it } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { ModalController } from '@ionic/angular';
import { EXTRALIST } from '../../models/categories';
import { ItemDetailModalComponent } from './item-detail-modal.component';

describe('Tablet editing of phone orders', () => {
  it('preserves decaf and the coffee price through repeated edits', () => {
    let saved: any;
    TestBed.configureTestingModule({ providers: [{ provide: ModalController, useValue: { dismiss: (data: any) => saved = data.finalItem } }] });
    const create = (item: any) => {
      const component = TestBed.runInInjectionContext(() => new ItemDetailModalComponent());
      component.categoryName = 'Καφέδες';
      component.item = item;
      component.editMode = true;
      component.ngOnInit();
      return component;
    };
    const component = create({ name: 'Espresso', price: 3, coffeeSize: 'double', coffeePreference: 'Σκέτο', decaf: true, extras: null });
    expect(component.decaf).toBe(true);
    component.submit();
    expect(saved.decaf).toBe(true);
    expect(saved.price).toBe(3);
    const second = create(saved);
    second.submit();
    expect(saved.decaf).toBe(true);
    expect(saved.price).toBe(3);
    second.decaf = false;
    second.submit();
    expect(saved.decaf).toBe(false);
    expect(saved.price).toBe(3);
  });

  it('treats legacy coffee without a decaf flag as regular coffee', () => {
    let saved: any;
    TestBed.configureTestingModule({ providers: [{ provide: ModalController, useValue: { dismiss: (data: any) => saved = data.finalItem } }] });
    const component = TestBed.runInInjectionContext(() => new ItemDetailModalComponent());
    component.categoryName = 'Καφέδες';
    component.item = { name: 'Espresso', price: 2.5, coffeePreference: 'Σκέτο', extras: null };
    component.editMode = true;
    component.ngOnInit();
    component.submit();
    expect(saved.decaf).toBe(false);
    expect(saved.price).toBe(2.5);
  });

  it('preserves premium mixer metadata and price without extras', () => {
    let saved: any;
    TestBed.configureTestingModule({ providers: [{ provide: ModalController, useValue: { dismiss: (data: any) => saved = data.finalItem } }] });
    const component = TestBed.runInInjectionContext(() => new ItemDetailModalComponent());
    component.categoryName = 'Ποτά - Κρασιά';
    component.item = { name: 'Ποτό Απλό', price: 6, comments: 'Τζιν - Red Bull', potoMixOption: 'Red Bull', extras: null };
    component.editMode = true;
    component.ngOnInit();
    component.submit();
    expect(saved.price).toBe(6);
    expect(saved.potoMixOption).toBe('Red Bull');
  });
  it('keeps an extra quantity of two through repeated edits', () => {
    let saved: any;
    TestBed.configureTestingModule({ providers: [{ provide: ModalController, useValue: { dismiss: (data: any) => saved = data.finalItem } }] });
    const extra = EXTRALIST[0];
    const create = (item: any) => {
      const component = TestBed.runInInjectionContext(() => new ItemDetailModalComponent());
      component.item = item;
      component.editMode = true;
      component.ngOnInit();
      component.submit();
    };
    const price = 5 + extra.price * 2;
    create({ name: 'Food', price, extras: [{ ...extra, name: `${extra.name} x2`, quantity: 2 }] });
    expect(saved.price).toBe(price);
    expect(saved.extras[0].quantity).toBe(2);
    create(saved);
    expect(saved.price).toBe(price);
    expect(saved.extras[0].quantity).toBe(2);
  });
});
