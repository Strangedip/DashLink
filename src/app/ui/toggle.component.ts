import { Component, Input, forwardRef } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

@Component({
  selector: 'app-toggle',
  template: `
    <button
      type="button"
      role="switch"
      class="relative h-7 w-12 rounded-full transition-colors"
      [class.bg-dl-accent]="value"
      [class.bg-white/15]="!value"
      [disabled]="disabled"
      [attr.aria-checked]="value"
      (click)="toggle()">
      <span class="absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white transition-transform" [class.translate-x-5]="value"></span>
    </button>
  `,
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => ToggleComponent), multi: true }]
})
export class ToggleComponent implements ControlValueAccessor {
  @Input() disabled = false;
  value = false;
  private onChange: (value: boolean) => void = () => {};
  private onTouched: () => void = () => {};

  writeValue(value: boolean): void { this.value = !!value; }
  registerOnChange(fn: (value: boolean) => void): void { this.onChange = fn; }
  registerOnTouched(fn: () => void): void { this.onTouched = fn; }
  setDisabledState(isDisabled: boolean): void { this.disabled = isDisabled; }

  toggle(): void {
    if (this.disabled) return;
    this.value = !this.value;
    this.onChange(this.value);
    this.onTouched();
  }
}
