import { Component, OnInit, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { switchMap, take, filter, map } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { AuthService } from '../../../services/auth.service';
import { WorkspaceService } from '../../../services/workspace.service';
import { ToastService } from '../../../services/toast.service';
import { Workspace, WorkspaceMember } from '../../../models/workspace.model';

@Component({
  selector: 'app-join-workspace',
  standalone: true,
  imports: [CommonModule, ButtonModule, ProgressSpinnerModule],
  templateUrl: './join-workspace.component.html',
  styleUrl: './join-workspace.component.scss'
})
export class JoinWorkspaceComponent implements OnInit {
  isLoading = true;
  isJoining = false;
  workspace: Workspace | null = null;
  inviteCode: string = '';
  error: string = '';
  alreadyMember = false;
  isBanned = false;
  isFull = false;

  private currentUserId: string | null = null;
  private currentUserEmail: string = '';
  private currentUserName: string = '';
  private currentUserPhoto: string = '';

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
        return this.workspaceService.getWorkspace(invite.workspaceId);
      }),
      take(1),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: (workspace) => {
        this.workspace = workspace;
        this.isLoading = false;

        if (!workspace) {
          this.error = 'Workspace not found.';
          return;
        }

        if (workspace.memberIds?.includes(this.currentUserId!)) {
          this.alreadyMember = true;
        }

        const member = workspace.members?.find(m => m.userId === this.currentUserId);
        if (member?.banned) {
          this.isBanned = true;
        }

        const activeMembers = workspace.members?.filter(m => !m.banned).length || 0;
        if (activeMembers >= workspace.memberLimit) {
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

  get activeMemberCount(): number {
    return this.workspace?.members?.filter(m => !m.banned).length || 0;
  }

  async joinWorkspace(): Promise<void> {
    if (!this.workspace?.id || !this.currentUserId || this.isJoining) return;

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

      await this.workspaceService.joinWorkspace(this.workspace.id, newMember);
      this.toastService.showSuccess('Joined!', `You have joined "${this.workspace.name}".`);
      this.router.navigate(['/workspaces', this.workspace.id]);
    } catch (error: unknown) {
      this.toastService.showError('Failed', 'Could not join workspace. Please try again.');
      this.isJoining = false;
    }
  }

  goToWorkspace(): void {
    if (this.workspace?.id) {
      this.router.navigate(['/workspaces', this.workspace.id]);
    }
  }

  goToDashboard(): void {
    this.router.navigate(['/dashboard']);
  }
}
