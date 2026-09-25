import { ApplicationRef, Component, EnvironmentInjector, Injectable, Injector, Input, Type, createComponent, inject, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';

export class DialogRef {
  private resolve!: (result: { data: any }) => void;
  private readonly result = new Promise<{ data: any }>(resolve => this.resolve = resolve);
  private closed = false;
  constructor(private readonly dispose: () => void, private readonly show: () => void) {}
  async open() { if (!this.closed) { this.show(); } }
  afterClosed() { return this.result; }
  async dismiss(data?: any) {
    if (this.closed) { return; }
    this.closed = true;
    this.dispose();
    this.resolve({ data });
  }
}

@Injectable({ providedIn: 'root' })
export class DialogService {
  private readonly app = inject(ApplicationRef);
  private readonly environment = inject(EnvironmentInjector);
  private readonly injector = inject(Injector);
  private readonly stack: DialogRef[] = [];

  async create(options: { component: Type<any>; componentProps?: Record<string, any>; cssClass?: string; compact?: boolean }): Promise<DialogRef> {
    const element = document.createElement('dialog');
    element.className = options.compact ? 'app-dialog compact-dialog' : 'app-dialog';
    if (options.cssClass) { element.classList.add(...options.cssClass.split(' ')); }
    element.setAttribute('aria-label', options.componentProps?.['options']?.header || 'Λεπτομέρειες παραγγελίας');
    const previousFocus = document.activeElement as HTMLElement | null;
    const ref = new DialogRef(() => {
      element.close();
      this.app.detachView(component.hostView);
      component.destroy();
      element.remove();
      const index = this.stack.indexOf(ref);
      if (index >= 0) { this.stack.splice(index, 1); }
      if (previousFocus?.isConnected) { previousFocus.focus(); }
    }, () => {
      if (element.open) { return; }
      document.body.appendChild(element);
      this.stack.push(ref);
      element.showModal();
    });
    const component = createComponent(options.component, {
      environmentInjector: this.environment,
      elementInjector: Injector.create({ parent: this.injector, providers: [{ provide: DialogRef, useValue: ref }] })
    });
    for (const [key, value] of Object.entries(options.componentProps || {})) { component.setInput(key, value); }
    element.appendChild(component.location.nativeElement);
    this.app.attachView(component.hostView);
    component.changeDetectorRef.detectChanges();
    // Explicit buttons own dismissal, so a pending destructive request cannot be
    // abandoned by an accidental backdrop tap or Android back press.
    element.addEventListener('cancel', event => event.preventDefault());
    return ref;
  }

  get hasOpenDialog() { return this.stack.length > 0; }
}

interface PromptInput {
  name: string; type?: string; placeholder?: string; value?: string | number;
  min?: string; max?: string; attributes?: Record<string, string>;
}
interface PromptButton {
  text: string; role?: string; cssClass?: string; icon?: string;
  handler?: (data: any) => unknown;
}
interface PromptOptions {
  header?: string; message?: string; cssClass?: string;
  inputs?: PromptInput[]; buttons: (PromptButton | string)[];
}

@Component({
  selector: 'app-prompt',
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <form #form (submit)="$event.preventDefault()">
      <h2>{{ options.header }}</h2>
      @if (options.message) { <p>{{ options.message }}</p> }
      @for (input of options.inputs || []; track input.name) {
        <label class="prompt-input">{{ input.placeholder || input.name }}
          <input [type]="input.type || 'text'" [name]="input.name"
            [(ngModel)]="values[input.name]" [attr.min]="input.min" [attr.max]="input.max"
            [attr.autocapitalize]="input.attributes?.['autocapitalize']" required>
        </label>
      }
      @if (error) { <p role="alert">{{ error }}</p> }
      <div class="prompt-actions">
        @for (button of buttons; track $index) {
          <button type="button" class="ui-button" [attr.data-color]="button.role === 'destructive' ? 'danger' : 'primary'"
            [disabled]="busy" (click)="choose(button, form)">{{ button.text }}</button>
        }
      </div>
    </form>`
})
export class PromptComponent {
  private readonly ref = inject(DialogRef);
  values: Record<string, any> = {};
  buttons: PromptButton[] = [];
  busy = false;
  error = '';
  private config!: PromptOptions;
  @Input() set options(value: PromptOptions) {
    this.config = value;
    this.buttons = value.buttons.map(button => typeof button === 'string' ? { text: button } : button);
    for (const input of value.inputs || []) { this.values[input.name] = input.value ?? ''; }
  }
  get options() { return this.config; }
  async choose(button: PromptButton, form: HTMLFormElement) {
    if (this.busy || (button.role !== 'cancel' && !form.reportValidity())) { return; }
    this.busy = true;
    try {
      const result = await button.handler?.(this.values);
      if (result !== false) { await this.ref.dismiss(this.values); }
    } catch (error) {
      console.error(error);
      this.error = 'Η ενέργεια δεν ολοκληρώθηκε. Δοκιμάστε ξανά.';
    } finally { this.busy = false; }
  }
}

@Injectable({ providedIn: 'root' })
export class PromptService {
  private readonly dialogs = inject(DialogService);
  create(options: PromptOptions) {
    return this.dialogs.create({ component: PromptComponent, componentProps: { options }, compact: true });
  }
}

@Injectable({ providedIn: 'root' })
export class ActionMenuService extends PromptService {}

@Injectable({ providedIn: 'root' })
export class NotificationService {
  async create(options: { message: string; duration: number; position?: string; color?: string }) {
    return { open: async () => {
      const toast = document.createElement('div');
      toast.className = 'app-toast';
      toast.setAttribute('role', 'status');
      toast.textContent = options.message;
      toast.dataset['color'] = options.color || 'primary';
      document.body.appendChild(toast);
      window.setTimeout(() => toast.remove(), options.duration);
    } };
  }
}
