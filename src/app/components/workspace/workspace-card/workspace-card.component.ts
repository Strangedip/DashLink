import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { Workspace } from '../../../models/workspace.model';

@Component({
  selector: 'app-workspace-card',
  standalone: true,
  imports: [CommonModule, ButtonModule, TooltipModule],
  templateUrl: './workspace-card.component.html',
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
