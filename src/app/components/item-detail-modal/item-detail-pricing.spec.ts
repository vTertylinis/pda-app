import { describe, expect, it } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { ModalController } from '@ionic/angular';
import { EXTRALIST } from '../../models/categories';
import { ItemDetailModalComponent } from './item-detail-modal.component';

describe('Tablet editing of phone orders', () => {
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
