import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DynamicDialogRef, DynamicDialogConfig } from 'primeng/dynamicdialog';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ButtonModule
  ],
  template: `
    <div class="flex flex-column gap-3">
      <p>{{ message }}</p>
      <div class="flex justify-content-end gap-2">
        <p-button label="No" icon="pi pi-times" styleClass="p-button-text" (click)="onCancel()"></p-button>
        <p-button label="Yes" icon="pi pi-check" (click)="onConfirm()"></p-button>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }
  `]
})
export class ConfirmDialogComponent {
  message: string = '';

  constructor(public ref: DynamicDialogRef, public config: DynamicDialogConfig) { }

  ngOnInit(): void {
    if (this.config.data && this.config.data.message) {
      this.message = this.config.data.message;
    }
  }

  onConfirm(): void {
    this.ref.close(true);
  }

  onCancel(): void {
    this.ref.close(false);
  }
} 