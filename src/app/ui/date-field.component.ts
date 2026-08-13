import { Component, Input, forwardRef } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

@Component({
  selector: 'app-date-field',
  template: `
    <input
      class="dl-input w-full"
      [type]="showTime ? 'datetime-local' : 'date'"
      [value]="display"
      [disabled]="disabled"
      [id]="inputId"
      (change)="onInput($event)"
      (blur)="onTouched()">
  `,
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => DateFieldComponent), multi: true }]
})
export class DateFieldComponent implements ControlValueAccessor {
  @Input() showTime = false;
  @Input() inputId = '';
  display = '';
  disabled = false;
  private onChange: (value: Date | null) => void = () => {};
  onTouched: () => void = () => {};

  writeValue(value: unknown): void {
    this.display = this.toInput(value);
  }
  registerOnChange(fn: (value: Date | null) => void): void { this.onChange = fn; }
  registerOnTouched(fn: () => void): void { this.onTouched = fn; }
  setDisabledState(isDisabled: boolean): void { this.disabled = isDisabled; }

  onInput(event: Event): void {
    const raw = (event.target as HTMLInputElement).value;
    this.display = raw;
    this.onChange(raw ? new Date(raw) : null);
  }

  private toInput(value: unknown): string {
    if (!value) return '';
    let date: Date | null = null;
    if (value instanceof Date) {
      date = value;
    } else if (typeof value === 'object' && value && 'toDate' in (value as object)) {
      date = (value as { toDate: () => Date }).toDate();
    } else if (typeof value === 'string' || typeof value === 'number') {
      date = new Date(value);
    }
    if (!date || Number.isNaN(date.getTime())) return '';
    const pad = (n: number) => String(n).padStart(2, '0');
    const day = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
    if (!this.showTime) return day;
    return `${day}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }
}
