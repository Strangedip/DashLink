import { Injectable, signal } from '@angular/core';

export type ToastSeverity = 'success' | 'info' | 'warn' | 'error';

export interface ToastMessage {
  id: number;
  severity: ToastSeverity;
  summary: string;
  detail: string;
  actionLabel?: string;
  onAction?: () => void;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  private nextId = 0;
  readonly messages = signal<ToastMessage[]>([]);

  showSuccess(summary: string, detail: string): void {
    this.push('success', summary, detail);
  }

  showInfo(summary: string, detail: string): void {
    this.push('info', summary, detail);
  }

  showWarn(summary: string, detail: string): void {
    this.push('warn', summary, detail);
  }

  showError(summary: string, detail: string): void {
    this.push('error', summary, detail);
  }

  showUndo(summary: string, detail: string, onUndo: () => void): void {
    this.push('info', summary, detail, 'Undo', onUndo, 6500);
  }

  dismiss(id: number): void {
    this.messages.update(list => list.filter(item => item.id !== id));
  }

  runAction(toast: ToastMessage): void {
    this.dismiss(toast.id);
    toast.onAction?.();
  }

  private push(
    severity: ToastSeverity,
    summary: string,
    detail: string,
    actionLabel?: string,
    onAction?: () => void,
    durationMs = 4200
  ): void {
    const id = ++this.nextId;
    this.messages.update(list => [...list, { id, severity, summary, detail, actionLabel, onAction }]);
    window.setTimeout(() => this.dismiss(id), durationMs);
  }
}
