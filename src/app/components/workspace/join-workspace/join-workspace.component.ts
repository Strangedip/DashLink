import { Component, OnInit, DestroyRef, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { switchMap, take, filter, of, catchError } from 'rxjs';
import { BtnComponent } from '../../../ui/btn.component';
import { IconComponent } from '../../../ui/icon.component';
import { AuthService } from '../../../services/auth.service';
import { WorkspaceService } from '../../../services/workspace.service';
import { ToastService } from '../../../services/toast.service';
import { Workspace, WorkspaceInvite, WorkspaceMember, workspacePurpose, workspaceBadge } from '../../../models/workspace.model';

@Component({
    selector: 'app-join-workspace',
    imports: [CommonModule, BtnComponent, IconComponent],
    templateUrl: './join-workspace.component.html',
    changeDetection: ChangeDetectionStrategy.Eager,
    styleUrl: './join-workspace.component.scss'
})
export class JoinWorkspaceComponent implements OnInit {
  isLoading = true;
  isJoining = false;
  workspace: Workspace | null = null;
  invite: WorkspaceInvite | null = null;
  inviteCode = '';
  error = '';
  alreadyMember = false;
  isBanned = false;
  isFull = false;

  private currentUserId: string | null = null;
  private currentUserEmail = '';
  private currentUserName = '';
  private currentUserPhoto = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService,
    private workspaceService: WorkspaceService,
    private toastService: ToastService,
    private destroyRef: DestroyRef
  ) {}

  ngOnInit(): void {
    this.authService.user$.pipe(
      filter(user => !!user),
      take(1),
      switchMap(user => {
        this.currentUserId = user!.uid;
        this.currentUserEmail = user!.email || '';
        this.currentUserName = user!.displayName || user!.email || 'User';
        this.currentUserPhoto = user!.photoURL || '';

        this.inviteCode = this.route.snapshot.paramMap.get('inviteCode') || '';
        if (!this.inviteCode) {
          this.error = 'Invalid invite link.';
          this.isLoading = false;
          throw new Error('No invite code');
        }

        return this.workspaceService.getInvite(this.inviteCode);
      }),
      take(1),
      switchMap(invite => {
        if (!invite || !invite.active) {
          this.error = 'This invite link is invalid or has been deactivated.';
          this.isLoading = false;
          throw new Error('Invalid invite');
        }
        this.invite = invite;
        return this.workspaceService.getWorkspace(invite.workspaceId).pipe(
          take(1),
          catchError(() => of(null))
        );
      }),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: (workspace) => {
        this.workspace = workspace;
        this.isLoading = false;

        if (workspace?.memberIds?.includes(this.currentUserId!)) {
          this.alreadyMember = true;
        }

        const member = workspace?.members?.find(m => m.userId === this.currentUserId);
        if (member?.banned) {
          this.isBanned = true;
        }

        const activeMembers = workspace?.members?.filter(m => !m.banned).length
          ?? this.invite?.memberCount
          ?? 0;
        const limit = workspace?.memberLimit ?? this.invite?.memberLimit ?? 12;
        if (activeMembers >= limit && !this.alreadyMember) {
          this.isFull = true;
        }
      },
      error: () => {
        this.isLoading = false;
        if (!this.error) {
          this.error = 'Failed to load workspace information.';
        }
      }
    });
  }

  get previewName(): string {
    return this.workspace?.name || this.invite?.workspaceName || 'Workspace';
  }

  get previewDescription(): string {
    return this.workspace?.description || this.invite?.description || '';
  }

  get previewGoal(): string {
    return workspacePurpose(this.workspace?.metadata) || this.invite?.purpose || this.invite?.goal || '';
  }

  get previewCategory(): string {
    return workspaceBadge(this.workspace?.metadata) || this.invite?.category || '';
  }

  get previewOwner(): string {
    return this.workspace?.ownerName || this.invite?.ownerName || '';
  }

  get activeMemberCount(): number {
    return this.workspace?.members?.filter(m => !m.banned).length || this.invite?.memberCount || 0;
  }

  get memberLimit(): number {
    return this.workspace?.memberLimit || this.invite?.memberLimit || 12;
  }

  async joinWorkspace(): Promise<void> {
    const workspaceId = this.workspace?.id || this.invite?.workspaceId;
    if (!workspaceId || !this.currentUserId || this.isJoining) return;

    this.isJoining = true;
    try {
      const newMember: WorkspaceMember = {
        userId: this.currentUserId,
        displayName: this.currentUserName,
        email: this.currentUserEmail,
        photoURL: this.currentUserPhoto,
        role: 'member',
        joinedAt: new Date(),
        banned: false
      };

      await this.workspaceService.joinWorkspace(workspaceId, newMember);
      this.toastService.showSuccess('Joined!', `You have joined "${this.previewName}".`);
      this.router.navigate(['/workspaces', workspaceId]);
    } catch {
      this.toastService.showError('Failed', 'Could not join workspace. Please try again.');
      this.isJoining = false;
    }
  }

  goToWorkspace(): void {
    const workspaceId = this.workspace?.id || this.invite?.workspaceId;
    if (workspaceId) {
      this.router.navigate(['/workspaces', workspaceId]);
    }
  }

  goToDashboard(): void {
    this.router.navigate(['/dashboard']);
  }
}
