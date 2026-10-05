import { TestBed } from '@angular/core/testing';
import { ItemDetailModalComponent } from './item-detail-modal.component';
import { DialogRef } from '../../ui/dialog.service';

describe('Native item customization controls', () => {
  it('binds coffee radio selection and quantity to the submitted order', async () => {
    const ref = jasmine.createSpyObj('DialogRef', ['dismiss']);
    await TestBed.configureTestingModule({
      imports: [ItemDetailModalComponent], providers: [{ provide: DialogRef, useValue: ref }]
    }).compileComponents();
    const fixture = TestBed.createComponent(ItemDetailModalComponent);
    fixture.componentRef.setInput('item', { name: 'Espresso', price: 3 });
    fixture.componentRef.setInput('categoryName', 'Καφέδες');
    fixture.detectChanges();
    await fixture.whenStable();
    const radio = fixture.nativeElement.querySelector('input[name="coffeePreference"]') as HTMLInputElement;
    radio.click();
    fixture.componentInstance.increment();
    fixture.detectChanges();
    fixture.componentInstance.submit();
    expect(ref.dismiss).toHaveBeenCalledWith(jasmine.objectContaining({
      quantity: 2, finalItem: jasmine.objectContaining({ coffeePreference: 'Σκέτο', decaf: false, price: 3 })
    }));
  });

  it('submits the optional Decaf checkbox without changing the coffee price', async () => {
    const ref = jasmine.createSpyObj('DialogRef', ['dismiss']);
    await TestBed.configureTestingModule({
      imports: [ItemDetailModalComponent], providers: [{ provide: DialogRef, useValue: ref }]
    }).compileComponents();
    const fixture = TestBed.createComponent(ItemDetailModalComponent);
    fixture.componentRef.setInput('item', { name: 'Espresso', price: 3 });
    fixture.componentRef.setInput('categoryName', 'Καφέδες');
    fixture.detectChanges();
    await fixture.whenStable();
    const checkbox = fixture.nativeElement.querySelector('input[name="decaf"]') as HTMLInputElement;
    expect(checkbox.checked).toBeFalse();
    checkbox.click();
    fixture.nativeElement.querySelector('input[name="coffeePreference"]').click();
    fixture.componentInstance.submit();
    expect(ref.dismiss).toHaveBeenCalledWith(jasmine.objectContaining({
      finalItem: jasmine.objectContaining({ decaf: true, price: 3 })
    }));
  });

  it('restores Decaf when editing and allows it to be removed', async () => {
    const ref = jasmine.createSpyObj('DialogRef', ['dismiss']);
    await TestBed.configureTestingModule({
      imports: [ItemDetailModalComponent], providers: [{ provide: DialogRef, useValue: ref }]
    }).compileComponents();
    const fixture = TestBed.createComponent(ItemDetailModalComponent);
    fixture.componentRef.setInput('item', { name: 'Espresso', price: 3, decaf: true, coffeePreference: 'Σκέτο', coffeeSize: 'single' });
    fixture.componentRef.setInput('categoryName', 'Καφέδες');
    fixture.componentRef.setInput('editMode', true);
    fixture.detectChanges();
    await fixture.whenStable();
    const checkbox = fixture.nativeElement.querySelector('input[name="decaf"]') as HTMLInputElement;
    expect(checkbox.checked).toBeTrue();
    checkbox.click();
    fixture.componentInstance.submit();
    expect(ref.dismiss).toHaveBeenCalledWith(jasmine.objectContaining({
      finalItem: jasmine.objectContaining({ decaf: false, price: 3 })
    }));
  });
});
