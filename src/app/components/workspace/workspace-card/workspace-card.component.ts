import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IconComponent } from '../../../ui/icon.component';
import { Workspace } from '../../../models/workspace.model';

@Component({
    selector: 'app-workspace-card',
    imports: [CommonModule, IconComponent],
    templateUrl: './workspace-card.component.html',
    changeDetection: ChangeDetectionStrategy.Eager,
    styleUrl: './workspace-card.component.scss'
})
export class WorkspaceCardComponent {
  @Input() workspace!: Workspace;
  @Input() currentUserId: string = '';
  @Output() openWorkspace = new EventEmitter<Workspace>();

  get isOwner(): boolean {
    return this.workspace.ownerId === this.currentUserId;
  }

  get memberCount(): number {
    return this.workspace.members?.filter(m => !m.banned).length || 0;
  }

  onClick(): void {
    this.openWorkspace.emit(this.workspace);
  }
}
