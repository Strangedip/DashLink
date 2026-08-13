import { ChangeDetectionStrategy, Component, HostBinding, Input } from '@angular/core';
import { IconComponent } from './icon.component';

export type BtnVariant = 'primary' | 'outline' | 'ghost' | 'ghost-danger' | 'danger' | 'warn' | 'secondary';
export type BtnSize = 'sm' | 'md';

@Component({
  selector: 'app-btn',
  imports: [IconComponent],
  template: `
    <button
      [attr.type]="type"
      [disabled]="disabled || loading"
      [class]="classes"
      [attr.title]="title || null"
      [attr.aria-label]="ariaLabel || label || title || null">
      @if (loading) {
        <app-icon name="spinner" />
      } @else if (icon && iconPos !== 'right') {
        <app-icon [name]="icon" />
      }
      @if (label) {
        <span>{{ label }}</span>
      }
      <ng-content />
      @if (!loading && icon && iconPos === 'right') {
        <app-icon [name]="icon" />
      }
    </button>
  `,
  styles: [`
    :host { display: inline-flex; vertical-align: middle; max-width: 100%; min-height: 3rem; }
    :host.w-full { width: 100%; }
    :host.size-sm { min-height: 2.75rem; }
    :host.icon-only { width: 3rem; height: 3rem; min-height: 3rem; flex-shrink: 0; }
    :host.icon-only.size-sm { width: 2.75rem; height: 2.75rem; min-height: 2.75rem; }
    button {
      font: inherit;
      width: 100%;
      min-height: inherit;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }
    button app-icon { font-size: 1.15rem; }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BtnComponent {
  @Input() label = '';
  @Input() icon = '';
  @Input() iconPos: 'left' | 'right' = 'left';
  @Input() type: 'button' | 'submit' | 'reset' = 'button';
  @Input() variant: BtnVariant = 'primary';
  @Input() size: BtnSize = 'md';
  @Input() disabled = false;
  @Input() loading = false;
  @Input() rounded = false;
  @Input() title = '';
  @Input() ariaLabel = '';
  @Input() block = false;

  @HostBinding('class.w-full')
  get fullWidth(): boolean {
    return this.block;
  }

  @HostBinding('class.icon-only')
  get iconOnly(): boolean {
    return !!this.icon && !this.label;
  }

  @HostBinding('class.size-sm')
  get sizeSm(): boolean {
    return this.size === 'sm';
  }

  get classes(): string {
    const iconOnly = !!this.icon && !this.label;
    const base = 'inline-flex items-center justify-center gap-2 font-semibold transition-colors disabled:opacity-45 disabled:pointer-events-none cursor-pointer select-none';
    const sizing = iconOnly
      ? (this.size === 'sm' ? 'h-11 w-11' : 'h-12 w-12')
      : (this.size === 'sm' ? 'h-11 px-3.5 text-sm' : 'h-12 px-4 text-[0.95rem]');
    const radius = this.rounded || iconOnly ? 'rounded-full' : 'rounded-xl';
    const variants: Record<BtnVariant, string> = {
      primary: 'bg-dl-accent text-white hover:bg-green-600',
      outline: 'border border-dl-border bg-transparent text-dl-text hover:bg-white/5',
      ghost: 'bg-transparent text-dl-muted hover:bg-white/6 hover:text-dl-text',
      'ghost-danger': 'bg-transparent text-red-400 hover:bg-red-500/10',
      secondary: 'bg-white/6 text-dl-text hover:bg-white/10',
      danger: 'bg-red-600 text-white hover:bg-red-500',
      warn: 'bg-amber-600 text-white hover:bg-amber-500'
    };
    return `${base} ${sizing} ${radius} ${variants[this.variant]}`;
  }
}
