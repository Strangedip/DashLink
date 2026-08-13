import { Component, ChangeDetectionStrategy } from '@angular/core';
import { DynamicDialogRef, DynamicDialogConfig } from '../../ui/dialog';
import { BtnComponent, BtnVariant } from '../../ui/btn.component';

@Component({
    selector: 'app-confirm-dialog',
    imports: [BtnComponent],
    template: `
    <div class="confirm-body">
      <p>{{ message }}</p>
      <div class="confirm-actions">
        <app-btn [label]="cancelLabel" icon="times" variant="ghost" (click)="onCancel()"></app-btn>
        <app-btn [label]="confirmLabel" [icon]="confirmIcon" [variant]="confirmVariant" (click)="onConfirm()"></app-btn>
      </div>
    </div>
  `,
    changeDetection: ChangeDetectionStrategy.OnPush,
    styles: [`
    :host { display: block; }
    p { margin: 0; line-height: 1.5; color: var(--dl-text); font-size: 1rem; }
    .confirm-actions {
      display: flex;
      gap: 0.65rem;
      justify-content: flex-end;
      margin-top: 1.15rem;
    }
    @media (max-width: 768px) {
      .confirm-actions { flex-direction: column-reverse; }
      .confirm-actions app-btn { width: 100%; display: flex; }
    }
  `]
})
export class ConfirmDialogComponent {
  message = '';
  confirmLabel = 'Delete';
  cancelLabel = 'Cancel';
  confirmIcon = 'check';
  confirmVariant: BtnVariant = 'danger';

  constructor(public ref: DynamicDialogRef, public config: DynamicDialogConfig) {
    const data = this.config.data || {};
    this.message = data.message || '';
    this.confirmLabel = data.confirmLabel || 'Delete';
    this.cancelLabel = data.cancelLabel || 'Cancel';
    this.confirmIcon = data.confirmIcon || 'check';
    this.confirmVariant = data.confirmVariant || 'danger';
  }

  onConfirm(): void {
    this.ref.close(true);
  }

  onCancel(): void {
    this.ref.close(false);
  }
}
