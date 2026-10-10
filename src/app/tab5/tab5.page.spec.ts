import { describe, expect, it } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { OrderHistoryService } from '../services/order-history.service';
import { Tab5Page } from './tab5.page';

describe('Cancelled order display', () => {
  it('uses the final price and formats legacy and structured extra quantities once', () => {
    TestBed.configureTestingModule({ providers: [{ provide: OrderHistoryService, useValue: {
      watch: () => of({ loading: false, data: [{ item: { price: 5, extras: [
        { name: 'Τυρί x2', price: 1, quantity: 2 },
        { name: 'Σάλτσα', price: 0.5, quantity: 2 },
        { name: 'Μπέικον ×2', price: 1 },
      ] } }] }),
    } }] });
    const page = TestBed.runInInjectionContext(() => new Tab5Page());
    page.ionViewWillEnter();
    expect(page.getItemPrice(page.cancelledOrders[0].item)).toBe(5);
    expect(page.cancelledOrders[0].extrasDisplay).toBe('Τυρί x2, Σάλτσα x2, Μπέικον x2');
    page.ngOnDestroy();
  });
});
