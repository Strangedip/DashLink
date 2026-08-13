import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

@Component({
  selector: 'app-avatar',
  template: `
    @if (image) {
      <img [src]="image" alt="" [style.width.px]="size" [style.height.px]="size" class="rounded-full object-cover bg-dl-surface" />
    } @else {
      <span
        class="inline-flex items-center justify-center rounded-full font-semibold uppercase"
        [style.width.px]="size"
        [style.height.px]="size"
        [style.fontSize.px]="Math.max(10, size * 0.38)"
        [style.background]="bg"
        [style.color]="color">
        {{ label || '?' }}
      </span>
    }
  `,
  styles: [`
    :host { display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; line-height: 0; vertical-align: middle; }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AvatarComponent {
  @Input() image = '';
  @Input() label = '';
  @Input() size = 32;
  @Input() bg = 'rgba(76,175,80,0.2)';
  @Input() color = '#81c784';
  readonly Math = Math;
}
