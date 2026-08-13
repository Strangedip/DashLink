import { Component, Input, forwardRef } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

@Component({
  selector: 'app-check',
  template: `
    <label class="inline-flex min-h-11 items-center gap-2 text-sm">
      <input
        type="checkbox"
        class="h-4 w-4 accent-dl-accent"
        [checked]="!!value"
        [disabled]="disabled"
        [id]="inputId"
        (change)="set(($any($event.target)).checked)">
      <ng-content />
    </label>
  `,
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => CheckComponent), multi: true }]
})
export class CheckComponent implements ControlValueAccessor {
  @Input() inputId = '';
  value = false;
  disabled = false;
  private onChange: (value: boolean) => void = () => {};
  private onTouched: () => void = () => {};

  writeValue(value: boolean): void { this.value = !!value; }
  registerOnChange(fn: (value: boolean) => void): void { this.onChange = fn; }
  registerOnTouched(fn: () => void): void { this.onTouched = fn; }
  setDisabledState(isDisabled: boolean): void { this.disabled = isDisabled; }

  set(value: boolean): void {
    this.value = value;
    this.onChange(value);
    this.onTouched();
  }
}
