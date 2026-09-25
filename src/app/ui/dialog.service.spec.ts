import { Component, OnDestroy, inject, ChangeDetectionStrategy } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { DialogRef, DialogService, PromptService } from './dialog.service';

@Component({ selector: 'app-test-dialog', changeDetection: ChangeDetectionStrategy.Eager,
 template: '<button (click)="ref.dismiss({ saved: true })">Save</button>' })
class TestDialogComponent implements OnDestroy {
  ref = inject(DialogRef);
  static destroyed = 0;
  ngOnDestroy() { TestDialogComponent.destroyed++; }
}

describe('Angular dialogs', () => {
  let dialogs: DialogService;
  const refs: DialogRef[] = [];
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [TestDialogComponent] });
    dialogs = TestBed.inject(DialogService);
    TestDialogComponent.destroyed = 0;
  });
  afterEach(async () => {
    for (const ref of refs.splice(0)) { await ref.dismiss(); }
  });

  it('closes only the nested dialog and returns its result, then destroys both views', async () => {
    const parent = await dialogs.create({ component: TestDialogComponent });
    refs.push(parent);
    await parent.open();
    const child = await dialogs.create({ component: TestDialogComponent });
    refs.push(child);
    await child.open();
    const elements = document.querySelectorAll<HTMLDialogElement>('dialog');
    elements[1].querySelector('button')!.click();
    expect((await child.afterClosed()).data).toEqual({ saved: true });
    expect(document.querySelectorAll('dialog').length).toBe(1);
    expect(dialogs.hasOpenDialog).toBeTrue();
    expect(TestDialogComponent.destroyed).toBe(1);
    await parent.dismiss();
    expect(TestDialogComponent.destroyed).toBe(2);
    expect(dialogs.hasOpenDialog).toBeFalse();
  });

  it('keeps validation failures open and sends native input values to the handler', async () => {
    const handler = jasmine.createSpy('confirm').and.returnValue(false);
    const ref = await TestBed.inject(PromptService).create({
      header: 'Quantity', inputs: [{ name: 'quantity', type: 'number', min: '1', max: '3', value: '1' }],
      buttons: [{ text: 'Save', handler }, { text: 'Cancel', role: 'cancel' }]
    });
    refs.push(ref);
    await ref.open();
    const element = document.querySelector('dialog')!;
    const input = element.querySelector('input')!;
    input.value = '9';
    input.dispatchEvent(new Event('input'));
    element.querySelector('button')!.click();
    await Promise.resolve();
    expect(handler).not.toHaveBeenCalled();
    input.value = '2';
    input.dispatchEvent(new Event('input'));
    element.querySelector('button')!.click();
    await Promise.resolve();
    expect(handler).toHaveBeenCalledWith({ quantity: '2' });
    expect(element.open).toBeTrue();
    handler.and.returnValue(true);
    element.querySelector('button')!.click();
    expect((await ref.afterClosed()).data).toEqual({ quantity: '2' });
  });
});
