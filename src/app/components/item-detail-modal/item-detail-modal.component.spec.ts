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
      quantity: 2, finalItem: jasmine.objectContaining({ coffeePreference: 'Σκέτο', price: 3 })
    }));
  });
});
