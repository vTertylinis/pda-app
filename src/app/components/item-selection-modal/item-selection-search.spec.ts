import { describe, expect, it } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { DialogRef } from '../../ui/dialog.service';
import { ItemSelectionModalComponent } from './item-selection-modal.component';

describe('Greek menu search', () => {
  it('finds the same product with accents or either sigma', () => {
    TestBed.configureTestingModule({ providers: [{ provide: DialogRef, useValue: {} }] });
    const component = TestBed.runInInjectionContext(() => new ItemSelectionModalComponent());
    component.categories = [{ name: 'Καφέδες', items: [{ name: 'Καφές φίλτρου', price: 3.5 }] }];
    for (const query of ['καφές', 'καφεσ', 'καφες']) {
      component.onSearch({ target: { value: query } });
      expect(component.filteredItems.map(item => item.name)).toEqual(['Καφές φίλτρου']);
    }
    component.onSearch({ target: { value: '' } });
    expect(component.filteredItems).toEqual([]);
  });
});
