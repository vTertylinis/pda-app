import { describe, expect, it } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { DialogRef } from '../../ui/dialog.service';
import { ItemDetailModalComponent } from './item-detail-modal.component';

describe('Drink quick picks', () => {
  it('connects the visible drink, ice and glass buttons to the submitted order', async () => {
    let saved: any;
    TestBed.configureTestingModule({ imports: [ItemDetailModalComponent], providers: [{
      provide: DialogRef, useValue: { dismiss: (data: any) => { saved = data; } },
    }] });
    const fixture = TestBed.createComponent(ItemDetailModalComponent);
    fixture.componentRef.setInput('item', { name: 'Ποτό Απλό', price: 7 });
    fixture.componentRef.setInput('categoryName', 'Ποτά - Κρασιά');
    await fixture.whenStable();
    const chip = (label: string) => Array.from(
      fixture.nativeElement.querySelectorAll('.ui-chip') as NodeListOf<HTMLButtonElement>
    ).find(button => button.textContent?.trim() === label)!;
    chip('Haig').click();
    chip('2 παγάκια').click();
    chip('Χαμηλό').click();
    await fixture.whenStable();
    expect(chip('2 παγάκια').getAttribute('aria-pressed')).toBe('true');
    chip('Ice ball').click();
    await fixture.whenStable();
    expect(chip('2 παγάκια').getAttribute('aria-pressed')).toBe('false');
    expect(chip('Ice ball').getAttribute('aria-pressed')).toBe('true');
    fixture.nativeElement.querySelector('footer button').click();
    expect(saved.finalItem.comments).toBe('Haig Ice ball Χαμηλό');
    expect(saved.finalItem.price).toBe(7);
  });

  function create(name = 'Ποτό Απλό', item: Record<string, unknown> = {}, edit = false) {
    let saved: any;
    TestBed.configureTestingModule({ providers: [{ provide: DialogRef, useValue: {
      dismiss: (data: any) => { saved = data; },
    } }] });
    const component = TestBed.runInInjectionContext(() => new ItemDetailModalComponent());
    component.item = { name, price: 7, ...item };
    component.categoryName = 'Ποτά - Κρασιά';
    component.editMode = edit;
    component.ngOnInit();
    return { component, saved: () => saved };
  }

  it('replaces conflicting ice and glass choices while preserving other instructions', () => {
    const { component } = create();
    component.togglePotoPrep('Πάγο');
    component.togglePotoPrep('2 παγάκια');
    component.togglePotoPrep('Χαμηλό');
    component.togglePotoPrep('Στημένο');
    component.togglePotoPrep('Ψηλό');
    expect(component.potoPrep).toEqual(['2 παγάκια', 'Στημένο', 'Ψηλό']);
    component.togglePotoPrep('Ice ball');
    expect(component.potoPrep).not.toContain('2 παγάκια');
    component.togglePotoPrep('Χωρίς πάγο');
    expect(component.potoPrep).not.toContain('Ice ball');
    component.togglePotoPrep('Χωρίς πάγο');
    expect(component.potoPrep).toEqual(['Στημένο', 'Ψηλό']);
  });

  it.each(['Haig', 'Famous Grouse'])('saves %s with preparation and restores it for editing', (liquor) => {
    const { component, saved } = create();
    component.selectPotoLiquor(liquor);
    component.togglePotoPrep('Χαμηλό');
    component.togglePotoPrep('2 παγάκια');
    component.comments = 'φέτα λεμόνι - χωριστά';
    component.submit();
    const first = saved().finalItem;
    expect(first.comments).toBe(`${liquor} 2 παγάκια Χαμηλό - φέτα λεμόνι - χωριστά`);
    expect(first.price).toBe(7);
    component.item = first;
    component.editMode = true;
    component.potoLiquor = '';
    component.potoPrep = [];
    component.ngOnInit();
    expect(component.potoLiquor).toBe(liquor);
    expect(component.potoPrep).toEqual(['2 παγάκια', 'Χαμηλό']);
    expect(component.comments).toBe('φέτα λεμόνι - χωριστά');
    component.submit();
    expect(saved().finalItem).toEqual(first);
  });

  it('parses Jack Honey before Jack and keeps a paid mixer surcharge stable when editing', () => {
    const { component, saved } = create('Ποτό Σπέσιαλ', {
      price: 9, comments: 'Τζακ Honey Κόλα Ice ball Χαμηλό - Pink Soda - φέτα λεμόνι',
      potoMixOption: 'Pink Soda',
    }, true);
    expect(component.potoLiquor).toBe('Τζακ Honey');
    expect(component.potoMixer).toBe('Κόλα');
    expect(component.potoPrep).toEqual(['Ice ball', 'Χαμηλό']);
    expect(component.comments).toBe('φέτα λεμόνι');
    component.submit();
    expect(saved().finalItem.price).toBe(9);
    component.potoMixOption = '';
    component.submit();
    expect(saved().finalItem.price).toBe(8);
    expect(saved().finalItem.comments).not.toContain('Pink Soda');
  });

  it('preserves legacy chips, surcharge and free text without consuming free-text instructions', () => {
    const { component, saved } = create('Ποτό Απλό', {
      price: 8, comments: 'Τζιν Τόνικ Πάγο Στημένο - Red Bull - Χαμηλό παρακαλώ',
    }, true);
    expect(component.potoPrep).toEqual(['Πάγο', 'Στημένο']);
    expect(component.comments).toBe('Χαμηλό παρακαλώ');
    component.submit();
    expect(saved().finalItem.price).toBe(8);
    expect(saved().finalItem.comments).toBe('Τζιν Τόνικ Πάγο Στημένο - Red Bull - Χαμηλό παρακαλώ');
  });

  it('restores preparation even when no liquor was selected', () => {
    const { component } = create('Ποτό Πρίμιουμ', {
      price: 12, comments: '3 παγάκια Ψηλό - ειδική οδηγία',
    }, true);
    expect(component.potoLiquor).toBe('');
    expect(component.potoPrep).toEqual(['3 παγάκια', 'Ψηλό']);
    expect(component.comments).toBe('ειδική οδηγία');
  });
});
