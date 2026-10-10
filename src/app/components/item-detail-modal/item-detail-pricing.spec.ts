import { describe, expect, it } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { DialogRef } from '../../ui/dialog.service';
import { ItemDetailModalComponent } from './item-detail-modal.component';

describe('Premium mixer editing', () => {
  it('restores chips and charges the premium once across repeated edits', () => {
    let saved: any;
    TestBed.configureTestingModule({ providers: [{ provide: DialogRef, useValue: { dismiss: (data: any) => saved = data.finalItem } }] });
    const create = (item: any) => {
      const component = TestBed.runInInjectionContext(() => new ItemDetailModalComponent());
      component.categoryName = 'Ποτά - Κρασιά';
      component.item = item;
      component.editMode = true;
      component.ngOnInit();
      return component;
    };
    const first = create({ name: 'Ποτό Απλό', price: 6, comments: 'Τζιν Τόνικ Πάγο - Red Bull - λίγο πάγο', extras: null });
    expect(first.potoMixOption).toBe('Red Bull');
    expect(first.potoLiquor).toBe('Τζιν');
    expect(first.computeFinalPrice()).toBe(6);
    first.submit();
    const second = create(saved);
    expect(second.computeFinalPrice()).toBe(6);
    second.potoMixOption = 'Pink Soda';
    expect(second.computeFinalPrice()).toBe(6);
    second.potoMixOption = '';
    expect(second.computeFinalPrice()).toBe(5);
    expect(second.comments).toBe('λίγο πάγο');
  });
});
