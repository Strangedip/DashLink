import { ChangeDetectorRef, Component, EventEmitter, HostBinding, Input, Output, forwardRef, inject } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { IconComponent } from './icon.component';
import { MenuComponent } from './menu.component';
import { MenuItem } from './menu-item';

export interface SelectOption {
  value: string;
  label: string;
}

@Component({
  selector: 'app-select',
  imports: [IconComponent, MenuComponent],
  template: `
    @if (label) {
      <span class="dl-select-caption">{{ label }}</span>
    }
    <button
      type="button"
      class="dl-select-trigger"
      [class.chip]="variant === 'chip'"
      [disabled]="disabled"
      [id]="inputId"
      [attr.aria-label]="ariaLabel || label || placeholder"
      [attr.aria-haspopup]="'listbox'"
      (click)="menu.toggle($event)">
      <span class="dl-select-value" [class.placeholder]="!currentLabel">{{ currentLabel || placeholder }}</span>
      <app-icon name="chevron-down"></app-icon>
    </button>
    <app-menu #menu [items]="menuItems" align="start" [matchTrigger]="variant === 'field'"></app-menu>
  `,
  styles: [`
    :host { display: block; width: 100%; position: relative; }
    :host.chip { display: inline-flex; align-items: center; gap: 0.45rem; width: auto; max-width: 100%; }
  `],
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => SelectComponent), multi: true }]
})
export class SelectComponent implements ControlValueAccessor {
  private readonly cdr = inject(ChangeDetectorRef);

  @Input() options: SelectOption[] = [];
  @Input() variant: 'field' | 'chip' = 'field';
  @Input() label = '';
  @Input() placeholder = 'Select';
  @Input() ariaLabel = '';
  @Input() inputId = '';
  @Input() set value(v: string | null | undefined) {
    this.inner = v ?? '';
    this.cdr.markForCheck();
  }
  get value(): string {
    return this.inner;
  }
  @Output() valueChange = new EventEmitter<string>();

  disabled = false;
  private inner = '';
  private onChange: (value: string) => void = () => {};
  private onTouched: () => void = () => {};

  @HostBinding('class.dl-select-host') hostClass = true;
  @HostBinding('class.chip')
  get chipHost(): boolean {
    return this.variant === 'chip';
  }

  get currentLabel(): string {
    return this.options.find(option => option.value === this.inner)?.label || '';
  }

  get menuItems(): MenuItem[] {
    return this.options.map(option => ({
      label: option.label,
      icon: option.value === this.inner ? 'check' : undefined,
      active: option.value === this.inner,
      command: () => this.set(option.value)
    }));
  }

  writeValue(value: string | null): void {
    this.inner = value ?? '';
    this.cdr.markForCheck();
  }
  registerOnChange(fn: (value: string) => void): void { this.onChange = fn; }
  registerOnTouched(fn: () => void): void { this.onTouched = fn; }
  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
    this.cdr.markForCheck();
  }

  private set(value: string): void {
    this.inner = value;
    this.onChange(value);
    this.onTouched();
    this.valueChange.emit(value);
    this.cdr.markForCheck();
  }
}
