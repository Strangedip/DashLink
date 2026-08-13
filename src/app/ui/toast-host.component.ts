import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ToastService, ToastSeverity } from '../services/toast.service';
import { IconComponent } from './icon.component';

@Component({
  selector: 'app-toast-host',
  imports: [IconComponent],
  template: `
    <div class="pointer-events-none fixed top-[max(0.75rem,env(safe-area-inset-top))] left-1/2 z-[220] flex w-[min(92vw,22rem)] -translate-x-1/2 flex-col gap-2">
      @for (toast of toasts(); track toast.id) {
        <article class="pointer-events-auto rounded-xl border border-dl-border bg-dl-card px-3 py-2.5 shadow-dl" [class]="tone(toast.severity)">
          <div class="flex items-start gap-2">
            <app-icon [name]="icon(toast.severity)" class="mt-0.5" />
            <div class="min-w-0 flex-1">
              <p class="m-0 text-sm font-semibold">{{ toast.summary }}</p>
              <p class="m-0 text-xs text-dl-muted">{{ toast.detail }}</p>
              @if (toast.actionLabel) {
                <button type="button" class="mt-2 min-h-11 rounded-lg bg-dl-accent px-3 text-sm font-semibold text-white" (click)="toastService.runAction(toast)">
                  {{ toast.actionLabel }}
                </button>
              }
            </div>
            <button type="button" class="dl-icon-btn" (click)="toastService.dismiss(toast.id)" aria-label="Dismiss">
              <app-icon name="times" />
            </button>
          </div>
        </article>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ToastHostComponent {
  readonly toastService = inject(ToastService);
  readonly toasts = this.toastService.messages;

  icon(severity: ToastSeverity): string {
    if (severity === 'success') return 'check-circle';
    if (severity === 'error') return 'times-circle';
    if (severity === 'warn') return 'exclamation-triangle';
    return 'info-circle';
  }

  tone(severity: ToastSeverity): string {
    if (severity === 'success') return 'text-green-400';
    if (severity === 'error') return 'text-red-400';
    if (severity === 'warn') return 'text-amber-400';
    return 'text-sky-400';
  }
}
