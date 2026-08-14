import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  Injectable,
  Input,
  OnDestroy,
  effect,
  inject,
  signal
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { IconComponent } from './icon.component';
import { MenuItem } from './menu-item';

interface OpenMenu {
  id: number;
  items: MenuItem[];
  top: number;
  left: number;
  width: number;
}

@Injectable({ providedIn: 'root' })
export class MenuOverlayService {
  readonly menu = signal<OpenMenu | null>(null);
  private nextId = 0;
  private onOwnerClose: (() => void) | null = null;

  open(config: Omit<OpenMenu, 'id'>, onOwnerClose: () => void): number {
    this.onOwnerClose?.();
    const id = ++this.nextId;
    this.onOwnerClose = onOwnerClose;
    this.menu.set({ id, ...config });
    return id;
  }

  close(id?: number): void {
    const current = this.menu();
    if (!current || (id != null && current.id !== id)) {
      return;
    }
    this.menu.set(null);
    const ownerClose = this.onOwnerClose;
    this.onOwnerClose = null;
    ownerClose?.();
  }

  run(item: MenuItem, event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    if (item.disabled) {
      return;
    }
    item.command?.({ originalEvent: event });
    this.close();
  }
}

@Component({
  selector: 'app-menu-host',
  imports: [IconComponent, RouterLink],
  template: `
    @if (overlay.menu(); as menu) {
      <div
        class="dl-menu"
        [style.top.px]="menu.top"
        [style.left.px]="menu.left"
        [style.width.px]="menu.width"
        role="menu"
        (click)="$event.stopPropagation()">
        @for (item of menu.items; track $index) {
          @if (item.separator) {
            <div class="dl-menu-sep"></div>
          } @else if (item.routerLink) {
            <a
              role="menuitem"
              class="dl-menu-item"
              [class.active]="item.active"
              [routerLink]="item.routerLink"
              (click)="overlay.run(item, $event)">
              @if (item.icon) {
                <app-icon [name]="item.icon" />
              } @else if (hasIcons(menu.items)) {
                <span class="dl-menu-ico-spacer"></span>
              }
              {{ item.label }}
            </a>
          } @else {
            <button
              type="button"
              role="menuitem"
              class="dl-menu-item"
              [class.active]="item.active"
              [disabled]="item.disabled"
              (click)="overlay.run(item, $event)">
              @if (item.icon) {
                <app-icon [name]="item.icon" />
              } @else if (hasIcons(menu.items)) {
                <span class="dl-menu-ico-spacer"></span>
              }
              {{ item.label }}
            </button>
          }
        }
      </div>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MenuHostComponent implements OnDestroy {
  readonly overlay = inject(MenuOverlayService);
  private readonly host = inject(ElementRef<HTMLElement>);
  private removeListeners: (() => void) | null = null;

  constructor() {
    effect(onCleanup => {
      const menu = this.overlay.menu();
      this.unbind();
      if (!menu) {
        return;
      }
      const timer = window.setTimeout(() => {
        if (this.overlay.menu()?.id !== menu.id) {
          return;
        }
        const onDoc = (event: Event) => {
          const node = event.target;
          if (node instanceof Node && this.host.nativeElement.contains(node)) {
            return;
          }
          this.overlay.close(menu.id);
        };
        const onReposition = () => this.overlay.close(menu.id);
        document.addEventListener('click', onDoc);
        window.addEventListener('scroll', onReposition, true);
        window.addEventListener('resize', onReposition);
        this.removeListeners = () => {
          document.removeEventListener('click', onDoc);
          window.removeEventListener('scroll', onReposition, true);
          window.removeEventListener('resize', onReposition);
        };
      }, 0);
      onCleanup(() => {
        window.clearTimeout(timer);
        this.unbind();
      });
    });
  }

  hasIcons(items: MenuItem[]): boolean {
    return items.some(item => !!item.icon);
  }

  ngOnDestroy(): void {
    this.unbind();
  }

  private unbind(): void {
    this.removeListeners?.();
    this.removeListeners = null;
  }
}

@Component({
  selector: 'app-menu',
  template: '',
  styles: [`:host { display: contents; }`]
})
export class MenuComponent implements OnDestroy {
  private readonly overlay = inject(MenuOverlayService);
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly cdr = inject(ChangeDetectorRef);
  @Input() items: MenuItem[] = [];
  @Input() align: 'start' | 'end' = 'end';
  @Input() matchTrigger = false;
  visible = false;
  private overlayId = 0;

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
    const width = this.matchTrigger
      ? Math.max(rect.width, 168)
      : 220;
    const menuWidth = Math.min(width, window.innerWidth - 16);
    const count = this.items.filter(item => !item.separator).length || 3;
    const approxHeight = Math.min(count * 44 + 12, window.innerHeight * 0.7);
    const below = rect.bottom + 8;
    const top = below + approxHeight > window.innerHeight - 12
      ? Math.max(8, rect.top - approxHeight - 8)
      : below;
    const start = this.align === 'start' ? rect.left : rect.right - menuWidth;
    const left = Math.min(Math.max(8, start), window.innerWidth - menuWidth - 8);
    this.visible = true;
    this.overlayId = this.overlay.open(
      { items: this.items, top, left, width: menuWidth },
      () => {
        this.visible = false;
        this.cdr.markForCheck();
      }
    );
  }

  hide(): void {
    this.overlay.close(this.overlayId);
    this.visible = false;
  }

  ngOnDestroy(): void {
    this.hide();
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
}
