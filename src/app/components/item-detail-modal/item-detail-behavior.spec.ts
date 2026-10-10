import { describe, expect, it } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { DialogRef } from '../../ui/dialog.service';
import { ItemDetailModalComponent } from './item-detail-modal.component';
import { EXTRALIST } from '../../models/categories';

describe('Customization totals and search', () => {
  function create() {
    let saved: any;
    TestBed.configureTestingModule({ providers: [{ provide: DialogRef, useValue: {
      dismiss: (data: any) => { saved = data; },
    } }] });
    const component = TestBed.runInInjectionContext(() => new ItemDetailModalComponent());
    return { component, saved: () => saved };
  }
  it('previews exactly the amount added including extras and quantity', () => {
    const { component, saved } = create();
    component.item = { name: 'Food', price: 5, materials: true };
    component.ngOnInit();
    component.extraList[0].selected = true;
    component.quantity = 3;
    expect(component.liveTotal).toBe((5 + EXTRALIST[0].price) * 3);
    component.submit();
    expect(saved().finalItem.price * saved().quantity).toBe(component.liveTotal);
  });
  it('edits one copy regardless of an old quantity value', () => {
    const { component, saved } = create();
    component.item = { name: 'Espresso', price: 3, coffeePreference: 'Σκέτο', coffeeSize: 'single', extras: null };
    component.categoryName = 'Καφέδες';
    component.editMode = true;
    component.ngOnInit();
    component.increment();
    expect(component.quantity).toBe(1);
    component.quantity = 3;
    expect(component.liveTotal).toBe(3);
    component.submit();
    expect(saved().quantity).toBe(1);
    expect(saved().finalItem.price).toBe(3);
  });
  it('matches accents and either Greek sigma in extra searches', () => {
    const { component } = create();
    expect(component.removeDiacritics('καφές')).toBe(component.removeDiacritics('καφεσ'));
  });
});
