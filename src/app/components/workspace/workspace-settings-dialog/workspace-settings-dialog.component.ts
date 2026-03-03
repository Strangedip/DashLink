import { Component, OnInit, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DynamicDialogRef, DynamicDialogConfig } from 'primeng/dynamicdialog';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { AvatarModule } from 'primeng/avatar';
import { TooltipModule } from 'primeng/tooltip';
import { TabsModule } from 'primeng/tabs';
import { Workspace, WorkspaceMember } from '../../../models/workspace.model';
import { WorkspaceService } from '../../../services/workspace.service';
import { ToastService } from '../../../services/toast.service';

@Component({
  selector: 'app-workspace-settings-dialog',
  standalone: true,
  imports: [
    CommonModule, FormsModule, ButtonModule, InputTextModule,
    InputNumberModule, AvatarModule, TooltipModule, TabsModule
  ],
  templateUrl: './workspace-settings-dialog.component.html',
  styleUrl: './workspace-settings-dialog.component.scss'
})
export class WorkspaceSettingsDialogComponent implements OnInit {
  workspace!: Workspace;
  isOwner = false;
  inviteLink: string = '';
  copied = false;
  activeTab: string = '0';
  editingMemberLimit = false;
  memberLimitValue: number = 12;
  confirmDelete = false;

  constructor(
    public ref: DynamicDialogRef,
    @Inject(DynamicDialogConfig) public config: DynamicDialogConfig,
    private workspaceService: WorkspaceService,
    private toastService: ToastService
  ) {}

  ngOnInit(): void {
    this.workspace = this.config.data?.workspace;
    this.isOwner = this.config.data?.isOwner || false;
    this.memberLimitValue = this.workspace.memberLimit || 12;
    this.buildInviteLink();
  }

  private buildInviteLink(): void {
    const baseUrl = window.location.origin;
    this.inviteLink = `${baseUrl}/workspaces/join/${this.workspace.inviteCode}`;
  }

  get activeMembers(): WorkspaceMember[] {
    return this.workspace.members?.filter(m => !m.banned) || [];
  }

  get bannedMembers(): WorkspaceMember[] {
    return this.workspace.members?.filter(m => m.banned) || [];
  }

  getMemberInitial(member: WorkspaceMember): string {
    return (member.displayName || member.email || 'U').charAt(0).toUpperCase();
  }

  async copyInviteLink(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.inviteLink);
      this.copied = true;
      this.toastService.showSuccess('Copied', 'Invite link copied to clipboard.');
      setTimeout(() => this.copied = false, 2000);
    } catch {
      this.toastService.showError('Error', 'Failed to copy link.');
    }
  }

  async regenerateInvite(): Promise<void> {
    if (!this.isOwner) return;
    try {
      const newCode = await this.workspaceService.regenerateInviteCode(
        this.workspace.id!, this.workspace.name, this.workspace.ownerName, this.workspace.inviteCode
      );
      this.workspace.inviteCode = newCode;
      this.buildInviteLink();
      this.toastService.showSuccess('Regenerated', 'New invite link generated.');
    } catch {
      this.toastService.showError('Error', 'Failed to regenerate invite link.');
    }
  }

  async banMember(member: WorkspaceMember): Promise<void> {
    if (!this.isOwner || member.role === 'owner') return;
    try {
      await this.workspaceService.banMember(this.workspace.id!, this.workspace, member.userId);
      member.banned = true;
      this.toastService.showSuccess('Banned', `${member.displayName} has been banned.`);
    } catch {
      this.toastService.showError('Error', 'Failed to ban member.');
    }
  }

  async unbanMember(member: WorkspaceMember): Promise<void> {
    if (!this.isOwner) return;
    try {
      await this.workspaceService.unbanMember(this.workspace.id!, this.workspace, member.userId);
      member.banned = false;
      this.toastService.showSuccess('Unbanned', `${member.displayName} has been unbanned.`);
    } catch {
      this.toastService.showError('Error', 'Failed to unban member.');
    }
  }

  async removeMember(member: WorkspaceMember): Promise<void> {
    if (!this.isOwner || member.role === 'owner') return;
    try {
      await this.workspaceService.removeMember(this.workspace.id!, this.workspace, member.userId);
      this.workspace.members = this.workspace.members.filter(m => m.userId !== member.userId);
      this.workspace.memberIds = this.workspace.memberIds.filter(id => id !== member.userId);
      this.toastService.showSuccess('Removed', `${member.displayName} has been removed.`);
    } catch {
      this.toastService.showError('Error', 'Failed to remove member.');
    }
  }

  toggleEditMemberLimit(): void {
    if (this.editingMemberLimit) {
      this.saveMemberLimit();
    }
    this.editingMemberLimit = !this.editingMemberLimit;
  }

  async saveMemberLimit(): Promise<void> {
    const clamped = Math.min(32, Math.max(this.activeMembers.length, this.memberLimitValue || 2));
    this.memberLimitValue = clamped;
    try {
      await this.workspaceService.updateWorkspace(this.workspace.id!, { memberLimit: clamped });
      this.workspace.memberLimit = clamped;
      this.toastService.showSuccess('Updated', `Member limit set to ${clamped}.`);
    } catch {
      this.toastService.showError('Error', 'Failed to update member limit.');
    }
  }

  async deleteWorkspace(): Promise<void> {
    if (!this.isOwner) return;
    try {
      await this.workspaceService.deleteWorkspace(this.workspace.id!);
      this.toastService.showSuccess('Deleted', 'Workspace has been deleted.');
      this.ref.close({ action: 'deleted' });
    } catch {
      this.toastService.showError('Error', 'Failed to delete workspace.');
    }
  }

  openEditWorkspace(): void {
    this.ref.close({ action: 'edit' });
  }

  onClose(): void {
    this.ref.close();
  }
}
