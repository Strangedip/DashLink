import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IconComponent } from './icon.component';
import { MenuItem } from './menu-item';

@Component({
  selector: 'app-breadcrumb',
  imports: [RouterLink, IconComponent],
  template: `
    <nav class="-mx-1 flex flex-nowrap items-center gap-1 overflow-x-auto px-1 text-sm text-dl-muted [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" aria-label="Breadcrumb">
      @if (home) {
        <a [routerLink]="home.routerLink || '/dashboard'" class="inline-flex min-h-10 shrink-0 items-center text-dl-muted hover:text-dl-text" aria-label="Home">
          <app-icon name="home" />
        </a>
      }
      @for (item of items; track $index) {
        <app-icon name="chevron-right" class="shrink-0 text-xs opacity-60" />
        <a [routerLink]="item.routerLink" class="min-h-10 inline-flex shrink-0 items-center whitespace-nowrap text-dl-text hover:underline">{{ item.label }}</a>
      }
    </nav>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BreadcrumbComponent {
  @Input() items: MenuItem[] = [];
  @Input() home: MenuItem | undefined;
}
