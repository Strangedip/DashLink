import { ChangeDetectorRef, Component, ElementRef, Input, OnDestroy, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IconComponent } from './icon.component';
import { MenuItem } from './menu-item';

@Component({
  selector: 'app-menu',
  imports: [IconComponent, RouterLink],
  template: `
    @if (visible) {
      <div
        class="dl-menu"
        [style.top.px]="top"
        [style.left.px]="left"
        role="menu"
        (click)="$event.stopPropagation()">
        @for (item of items; track $index) {
          @if (item.separator) {
            <div class="dl-menu-sep"></div>
          } @else if (item.routerLink) {
            <a
              role="menuitem"
              class="dl-menu-item"
              [routerLink]="item.routerLink"
              (click)="run(item, $event)">
              @if (item.icon) { <app-icon [name]="item.icon" /> }
              {{ item.label }}
            </a>
          } @else {
            <button
              type="button"
              role="menuitem"
              class="dl-menu-item"
              [disabled]="item.disabled"
              (click)="run(item, $event)">
              @if (item.icon) { <app-icon [name]="item.icon" /> }
              {{ item.label }}
            </button>
          }
        }
      </div>
    }
  `
})
export class MenuComponent implements OnDestroy {
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly cdr = inject(ChangeDetectorRef);
  @Input() items: MenuItem[] = [];
  visible = false;
  top = 0;
  left = 0;
  private removeDocListener: (() => void) | null = null;

  toggle(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    if (this.visible) {
      this.hide();
      return;
    }
    this.show(event);
  }

  show(event: Event): void {
    const target = this.triggerFrom(event);
    const rect = target.getBoundingClientRect();
    const width = 198;
    const count = this.items.filter(item => !item.separator).length || 3;
    const approxHeight = Math.min(count * 44 + 12, window.innerHeight * 0.7);
    const below = rect.bottom + 8;
    this.top = below + approxHeight > window.innerHeight - 12
      ? Math.max(8, rect.top - approxHeight - 8)
      : below;
    this.left = Math.min(Math.max(8, rect.right - width), window.innerWidth - width - 8);
    this.visible = true;
    this.cdr.detectChanges();
    this.bindDocClose();
  }

  hide(): void {
    this.visible = false;
    this.unbindDocClose();
    this.cdr.detectChanges();
  }

  run(item: MenuItem, event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    if (item.disabled) {
      return;
    }
    item.command?.({ originalEvent: event });
    this.hide();
  }

  ngOnDestroy(): void {
    this.unbindDocClose();
  }

  private triggerFrom(event: Event): HTMLElement {
    const current = event.currentTarget;
    if (current instanceof HTMLElement) {
      return current;
    }
    const target = event.target;
    if (target instanceof HTMLElement) {
      return target.closest('button, a, [role="button"]') || target;
    }
    return this.host.nativeElement;
  }

  private bindDocClose(): void {
    this.unbindDocClose();
    // Register after the opening click finishes so the same tap cannot close it.
    window.setTimeout(() => {
      if (!this.visible) {
        return;
      }
      const onDoc = (event: Event) => {
        const node = event.target;
        if (node instanceof Node && this.host.nativeElement.contains(node)) {
          return;
        }
        this.hide();
      };
      document.addEventListener('click', onDoc);
      this.removeDocListener = () => document.removeEventListener('click', onDoc);
    }, 0);
  }

  private unbindDocClose(): void {
    this.removeDocListener?.();
    this.removeDocListener = null;
  }
}
