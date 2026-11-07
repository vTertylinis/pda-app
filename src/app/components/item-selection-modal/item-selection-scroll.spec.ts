import { describe, expect, it } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { DialogRef } from '../../ui/dialog.service';
import { ItemSelectionModalComponent } from './item-selection-modal.component';

describe('Item selection scrolling', () => {
  it('starts at the top when opening a category and returning to categories', async () => {
    TestBed.configureTestingModule({ providers: [{ provide: DialogRef, useValue: {} }] });
    const fixture = TestBed.createComponent(ItemSelectionModalComponent);
    fixture.componentRef.setInput('categories', Array.from({ length: 30 }, (_, index) => ({
      name: `Category ${index}`,
      items: Array.from({ length: 30 }, (_, itemIndex) => ({
        name: `Item ${itemIndex}`, price: 5,
      })),
    })));
    await fixture.whenStable();

    const content: HTMLElement = fixture.nativeElement.querySelector('main');
    content.style.cssText = 'display: block; height: 200px; flex: none; overflow: auto';
    content.scrollTop = content.scrollHeight;
    expect(content.scrollTop).toBeGreaterThan(0);

    const categories = content.querySelectorAll<HTMLElement>('.ui-item');
    categories[categories.length - 1].click();
    await fixture.whenStable();

    expect(content.scrollTop).toBe(0);
    expect(content.querySelector('.ui-list-header')?.textContent).toContain('Category 29');
    expect(content.querySelector('h3')?.textContent).toBe('Item 0');

    content.scrollTop = content.scrollHeight;
    expect(content.scrollTop).toBeGreaterThan(0);
    content.querySelector<HTMLButtonElement>('button[aria-label="Back"]')!.click();
    await fixture.whenStable();

    expect(content.scrollTop).toBe(0);
    expect(content.querySelector('input[type="search"]')).not.toBeNull();
  });
});
