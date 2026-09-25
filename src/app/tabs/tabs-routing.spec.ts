import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { of, Subject } from 'rxjs';
import { routes } from '../app-routing.module';
import { CartService } from '../services/cart.service';
import { TableService } from '../services/table.service';
import { Tab1Page } from '../tab1/tab1.page';

describe('Angular tab routing', () => {
  it('destroys the previous page and returns to a fresh table picker', async () => {
    const updates = new Subject<void>();
    await TestBed.configureTestingModule({
      providers: [provideRouter(routes),
        { provide: TableService, useValue: {
          getCustomTables: () => of({}), cartUpdates$: updates, connected$: of(true)
        } },
        { provide: CartService, useValue: { getActiveTables: () => of({ carts: {} }) } }
      ]
    }).compileComponents();
    const destroy = spyOn(Tab1Page.prototype, 'ngOnDestroy').and.callThrough();
    const harness = await RouterTestingHarness.create('/tabs/tab1');
    const first = harness.routeDebugElement!.query(By.directive(Tab1Page)).componentInstance as Tab1Page;
    first.onSelectTable({ name: '1', displayName: '1', isCustom: false });
    await harness.navigateByUrl('/tabs/tab2');
    expect(destroy).toHaveBeenCalled();
    await harness.navigateByUrl('/tabs/tab1');
    const second = harness.routeDebugElement!.query(By.directive(Tab1Page)).componentInstance as Tab1Page;
    expect(second).not.toBe(first);
    expect(second.selectedTable).toBeNull();
    expect(harness.routeNativeElement!.querySelectorAll('.table-cell').length).toBe(44);
  });
});
