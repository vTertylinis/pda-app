import { describe, expect, it } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { DialogRef } from '../../ui/dialog.service';
import { ItemDetailModalComponent } from './item-detail-modal.component';

describe('Takeaway drinks', () => {
  function setup(item: any, category: string, edit = false) {
    let saved: any;
    TestBed.configureTestingModule({ providers: [{ provide: DialogRef, useValue: { dismiss: (data: any) => saved = data } }] });
    const component = TestBed.runInInjectionContext(() => new ItemDetailModalComponent());
    component.item = item;
    component.categoryName = category;
    component.editMode = edit;
    component.ngOnInit();
    return { component, result: () => saved };
  }
  it('discounts each unit and keeps the flag through repeated edits and removal', () => {
    const {component, result} = setup({name:'Cappuccino', price:3.5}, 'Καφέδες');
    component.coffeePreference = 'Σκέτο';
    component.takeaway = true;
    component.quantity = 3;
    expect(component.liveTotal).toBe(7.5);
    component.submit();
    expect(result().quantity).toBe(3);
    expect(result().finalItem.takeaway).toBe(true);
    let item = result().finalItem;
    for (let i=0; i<3; i++) {
      TestBed.resetTestingModule();
      const edit = setup(item, 'Καφέδες', true);
      expect(edit.component.takeaway).toBe(true);
      expect(edit.component.computeFinalPrice()).toBe(2.5);
      edit.component.submit();
      item = edit.result().finalItem;
    }
    TestBed.resetTestingModule();
    const edit = setup(item, 'Καφέδες', true);
    edit.component.takeaway = false;
    expect(edit.component.computeFinalPrice()).toBe(3.5);
  });
  it.each([
    ['Χυμοί','Φυσικός Χυμός',true], ['Μπύρες','Βαρέλι',true],
    ['Ποτά - Κρασιά','Φιάλη Απλή',false], ['Cocktails','Mojito',true],
    ['Ούζο-Μεζέδες','Ούζο ποτήρι',true], ['Αναψυκτικά','Coca Cola',true],
    ['Αναψυκτικά','Νερό Μικρό',false], ['Αναψυκτικά','Νερό Μεγάλο',false],
    ['Αναψυκτικά','Παγωτό',false], ['Ούζο-Μεζέδες','Μεζέδες',false],
    ['Ούζο-Μεζέδες','Μπακαλιαράκια',false], ['Ούζο-Μεζέδες','Γάμπαρι',false],
    ['Τοστ - Κρέπες','Τοστ',false],
  ])('limits the option to beverages: %s / %s', (category, name, eligible) => {
    const {component} = setup({name, price:3.5},category);
    expect(component.supportsTakeaway).toBe(eligible);
    component.takeaway = true;
    expect(component.computeFinalPrice()).toBe(eligible ? 2.5 : 3.5);
  });
  it('combines takeaway with double coffee and restores the surcharge on edit', () => {
    const {component} = setup({name:'Espresso',price:2.5,takeaway:true,coffeeSize:'double',extras:null}, 'Καφέδες',true);
    expect(component.computeFinalPrice()).toBe(2.5);
    component.coffeeSize = 'single';
    expect(component.computeFinalPrice()).toBe(2);
    component.takeaway = false;
    expect(component.computeFinalPrice()).toBe(3);
  });
  it('clears the old takeaway discount when editing a drink with a paid mixer', () => {
    const { component, result } = setup({
      name: '\u03a0\u03bf\u03c4\u03cc \u0391\u03c0\u03bb\u03cc', price: 7, takeaway: true,
      comments: 'Pink Soda', potoMixOption: 'Pink Soda',
    }, '\u03a0\u03bf\u03c4\u03ac - \u039a\u03c1\u03b1\u03c3\u03b9\u03ac', true);
    expect(component.supportsTakeaway).toBe(false);
    expect(component.computeFinalPrice()).toBe(8);
    component.submit();
    expect(result().finalItem.takeaway).toBe(false);
    expect(result().finalItem.price).toBe(8);
    expect(result().finalItem.potoMixOption).toBe('Pink Soda');
  });

});
