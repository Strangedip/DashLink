import { Component, Input, forwardRef } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { IconComponent } from './icon.component';

@Component({
  selector: 'app-rating',
  imports: [IconComponent],
  template: `
    <div class="inline-flex items-center gap-1" [class.pointer-events-none]="readonly">
      @for (star of stars; track star) {
        <button type="button" class="inline-flex h-11 w-11 items-center justify-center text-dl-muted" [class.text-amber-400]="star <= (value || 0)" (click)="set(star)" [disabled]="readonly">
          <app-icon [name]="star <= (value || 0) ? 'star-fill' : 'star'" />
        </button>
      }
    </div>
  `,
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => RatingComponent), multi: true }]
})
export class RatingComponent implements ControlValueAccessor {
  @Input() readonly = false;
  readonly stars = [1, 2, 3, 4, 5];
  value = 0;
  private onChange: (value: number) => void = () => {};
  private onTouched: () => void = () => {};

  writeValue(value: number): void { this.value = Number(value) || 0; }
  registerOnChange(fn: (value: number) => void): void { this.onChange = fn; }
  registerOnTouched(fn: () => void): void { this.onTouched = fn; }

  set(star: number): void {
    if (this.readonly) return;
    this.value = star;
    this.onChange(star);
    this.onTouched();
  }
}
