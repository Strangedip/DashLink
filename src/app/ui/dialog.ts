import {
  Injectable,
  Injector,
  Type,
  inject,
  signal,
  Component,
  ChangeDetectionStrategy
} from '@angular/core';
import { NgComponentOutlet } from '@angular/common';
import { Subject } from 'rxjs';
import { IconComponent } from './icon.component';

export class DynamicDialogRef<T = any> {
  readonly onClose = new Subject<T | undefined>();

  constructor(private readonly destroy: () => void) {}

  close(result?: T): void {
    this.onClose.next(result);
    this.onClose.complete();
    this.destroy();
  }
}

export class DynamicDialogConfig<T = any> {
  header?: string;
  width?: string;
  style?: Record<string, string>;
  data?: T;
  modal?: boolean;
  dismissableMask?: boolean;
  contentStyle?: Record<string, string>;
}

export interface OpenDialog {
  id: number;
  component: Type<unknown>;
  injector: Injector;
  config: DynamicDialogConfig;
  ref: DynamicDialogRef;
}

@Injectable({ providedIn: 'root' })
export class DialogService {
  private readonly parent = inject(Injector);
  private nextId = 0;
  readonly dialogs = signal<OpenDialog[]>([]);

  open(component: Type<unknown>, config: DynamicDialogConfig = {}): DynamicDialogRef {
    const id = ++this.nextId;
    const ref = new DynamicDialogRef(() => this.dismiss(id));
    const injector = Injector.create({
      parent: this.parent,
      providers: [
        { provide: DynamicDialogRef, useValue: ref },
        { provide: DynamicDialogConfig, useValue: config }
      ]
    });
    this.dialogs.update(list => [...list, { id, component, injector, config, ref }]);
    document.body.style.overflow = 'hidden';
    return ref;
  }

  private dismiss(id: number): void {
    this.dialogs.update(list => list.filter(item => item.id !== id));
    if (this.dialogs().length === 0) {
      document.body.style.overflow = '';
    }
  }
}

@Component({
  selector: 'app-dialog-host',
  imports: [NgComponentOutlet, IconComponent],
  template: `
    @for (dialog of dialogs(); track dialog.id) {
      <div class="dl-overlay" (click)="onMask(dialog)">
        <section
          class="dl-sheet"
          [style.--dl-sheet-width]="dialog.config.width || '32rem'"
          (click)="$event.stopPropagation()"
          role="dialog"
          aria-modal="true">
          <div class="dl-sheet-handle"></div>
          @if (dialog.config.header) {
            <header class="dl-sheet-head">
              <h2>{{ dialog.config.header }}</h2>
              <button type="button" class="dl-icon-btn" (click)="dialog.ref.close()" aria-label="Close">
                <app-icon name="times" />
              </button>
            </header>
          }
          <div class="dl-sheet-body">
            <ng-container [ngComponentOutlet]="dialog.component" [ngComponentOutletInjector]="dialog.injector" />
          </div>
        </section>
      </div>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DialogHostComponent {
  private readonly dialogsService = inject(DialogService);
  readonly dialogs = this.dialogsService.dialogs;

  onMask(dialog: OpenDialog): void {
    if (dialog.config.dismissableMask !== false) {
      dialog.ref.close();
    }
  }
}
