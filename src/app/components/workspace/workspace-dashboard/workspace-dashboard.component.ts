import { Component, OnInit, DestroyRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { BehaviorSubject, combineLatest, Observable, of, switchMap, take, map, tap, filter, debounceTime, distinctUntilChanged, startWith } from 'rxjs';
import { FormControl, ReactiveFormsModule, FormsModule } from '@angular/forms';

import { MenuItem } from 'primeng/api';
import { DialogService } from 'primeng/dynamicdialog';
import { ButtonModule } from 'primeng/button';
import { MenuModule, Menu } from 'primeng/menu';
import { TooltipModule } from 'primeng/tooltip';
import { DataViewModule } from 'primeng/dataview';
import { BreadcrumbModule } from 'primeng/breadcrumb';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { InputTextModule } from 'primeng/inputtext';
import { AvatarModule } from 'primeng/avatar';
import { AvatarGroupModule } from 'primeng/avatargroup';

import { AuthService } from '../../../services/auth.service';
import { WorkspaceService } from '../../../services/workspace.service';
import { ToastService } from '../../../services/toast.service';
import { LoggerService } from '../../../services/logger.service';
import { Workspace, WorkspaceNode, WorkspaceCollection, WorkspaceMember } from '../../../models/workspace.model';
import { CollectionCardComponent } from '../../collection-card/collection-card.component';
import { WorkspaceNodeCardComponent } from '../workspace-node-card/workspace-node-card.component';
import { AddWorkspaceNodeDialogComponent } from '../add-workspace-node-dialog/add-workspace-node-dialog.component';
import { AddCollectionDialogComponent } from '../../add-collection-dialog/add-collection-dialog.component';
import { ViewWorkspaceNodeDialogComponent } from '../view-workspace-node-dialog/view-workspace-node-dialog.component';
import { WorkspaceSettingsDialogComponent } from '../workspace-settings-dialog/workspace-settings-dialog.component';
import { CreateWorkspaceDialogComponent } from '../create-workspace-dialog/create-workspace-dialog.component';
import { ConfirmDialogComponent } from '../../confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-workspace-dashboard',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, FormsModule,
    ButtonModule, MenuModule, TooltipModule, DataViewModule,
    BreadcrumbModule, ProgressSpinnerModule, InputTextModule,
    AvatarModule, AvatarGroupModule,
    CollectionCardComponent, WorkspaceNodeCardComponent
  ],
  templateUrl: './workspace-dashboard.component.html',
  styleUrl: './workspace-dashboard.component.scss'
})
export class WorkspaceDashboardComponent implements OnInit {
  private workspaceIdSubject = new BehaviorSubject<string | null>(null);
  private collectionIdSubject = new BehaviorSubject<string | null>(null);

  workspace: Workspace | null = null;
  currentUserId: string | null = null;
  currentUserName: string = '';
  currentUserEmail: string = '';
  currentUserPhoto: string = '';

  workspaceId: string | null = null;
  collectionId: string | null = null;
  currentCollection: WorkspaceCollection | undefined;
  isLoading = false;
  showBackButton = false;

  dashboardItems$: Observable<(WorkspaceCollection | WorkspaceNode)[]> | undefined;
  searchControl = new FormControl('');
  private _searchFilter = '';

  breadcrumbItems: MenuItem[] = [];
  home: MenuItem | undefined;
  additionalMenuItems: MenuItem[] = [];

  @ViewChild('additionalMenu') additionalMenu!: Menu;

  constructor(
    private workspaceService: WorkspaceService,
    private authService: AuthService,
    private route: ActivatedRoute,
    private router: Router,
    private dialogService: DialogService,
    private toastService: ToastService,
    private destroyRef: DestroyRef,
    private logger: LoggerService
  ) {}

  get isOwner(): boolean {
    return this.workspace?.ownerId === this.currentUserId;
  }

  get isBanned(): boolean {
    return this.workspace?.members?.find(m => m.userId === this.currentUserId)?.banned || false;
  }

  get activeMembers(): WorkspaceMember[] {
    return this.workspace?.members?.filter(m => !m.banned) || [];
  }

  getMemberInitial(member: WorkspaceMember): string {
    return (member.displayName || 'U').charAt(0).toUpperCase();
  }

  ngOnInit(): void {
    this.authService.user$.pipe(
      filter(user => !!user),
      take(1),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(user => {
      this.currentUserId = user!.uid;
      this.currentUserName = user!.displayName || user!.email || 'User';
      this.currentUserEmail = user!.email || '';
      this.currentUserPhoto = user!.photoURL || '';
    });

    this.route.paramMap.pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(params => {
      const wsId = params.get('workspaceId');
      const colId = params.get('collectionId') || null;

      this.workspaceId = wsId;
      this.collectionId = colId;
      this.showBackButton = !!colId;

      this.workspaceIdSubject.next(wsId);
      this.collectionIdSubject.next(colId);
    });

    this.workspaceIdSubject.pipe(
      filter(id => !!id),
      switchMap(id => this.workspaceService.getWorkspace(id!)),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(ws => {
      this.workspace = ws;
      this.buildMenuItems();
      this.home = {
        icon: 'pi pi-home',
        command: () => this.router.navigate(['/workspaces', this.workspaceId])
      };
      this.updateBreadcrumbs();
    });

    this.dashboardItems$ = combineLatest([
      this.workspaceIdSubject.pipe(filter(id => !!id)),
      this.collectionIdSubject,
      this.searchControl.valueChanges.pipe(startWith(''), debounceTime(300), distinctUntilChanged())
    ]).pipe(
      tap(() => this.isLoading = true),
      switchMap(([workspaceId, collectionId, searchTerm]) => {
        this._searchFilter = searchTerm || '';

        const collectionsObs = this.workspaceService.getWorkspaceCollections(workspaceId!, collectionId);
        const nodesObs = this.workspaceService.getWorkspaceNodes(workspaceId!, collectionId);

        return combineLatest([collectionsObs, nodesObs]).pipe(
          map(([collections, nodes]) => {
            const combined: any[] = [
              ...collections.map(c => ({ ...c, type: 'collection' as const })),
              ...nodes.map(n => ({ ...n, type: 'workspace-node' as const }))
            ];
            return combined
              .sort((a, b) => {
                if (a.type === 'collection' && b.type !== 'collection') return -1;
                if (a.type !== 'collection' && b.type === 'collection') return 1;
                return (a.name || '').localeCompare(b.name || '');
              })
              .filter(item => {
                if (!this._searchFilter) return true;
                const term = this._searchFilter.toLowerCase();
                const nameMatch = item.name?.toLowerCase().includes(term);
                const descMatch = item.description?.toLowerCase().includes(term);
                if (item.type === 'workspace-node') {
                  const fieldMatch = (item as WorkspaceNode).fields?.some(
                    (f: any) => String(f.value || '').toLowerCase().includes(term) ||
                      f.fieldName?.toLowerCase().includes(term)
                  );
                  return nameMatch || descMatch || fieldMatch;
                }
                return nameMatch || descMatch;
              });
          }),
          tap(() => this.isLoading = false)
        );
      }),
      takeUntilDestroyed(this.destroyRef)
    );
  }

  private buildMenuItems(): void {
    this.additionalMenuItems = [
      { label: 'Add Node', icon: 'pi pi-file-edit', command: () => this.openAddNodeDialog() },
      { label: 'Add Collection', icon: 'pi pi-folder-open', command: () => this.openAddCollectionDialog() },
    ];
  }

  private updateBreadcrumbs(): void {
    if (!this.collectionId) {
      this.breadcrumbItems = [];
      return;
    }
    this.breadcrumbItems = [{ label: this.currentCollection?.name || 'Collection' }];
  }

  trackByItemId(index: number, item: any): string {
    return item?.id || index.toString();
  }

  goToCollection(collectionId: string): void {
    this.router.navigate(['/workspaces', this.workspaceId, 'collections', collectionId]);
  }

  goBack(): void {
    this.router.navigate(['/workspaces', this.workspaceId]);
  }

  goToDashboard(): void {
    this.router.navigate(['/dashboard']);
  }

  openAddNodeDialog(existingNode?: WorkspaceNode): void {
    if (this.isBanned) {
      this.toastService.showError('Banned', 'You have been banned from this workspace.');
      return;
    }

    const dialogRef = this.dialogService.open(AddWorkspaceNodeDialogComponent, {
      header: existingNode ? 'Edit Node' : 'Add Node',
      width: '700px',
      style: { 'max-width': '96vw' },
      data: {
        schema: this.workspace?.schema || [],
        useCustomSchema: this.workspace?.useCustomSchema ?? false,
        workspaceId: this.workspaceId,
        collectionId: this.collectionId,
        node: existingNode || null
      }
    });

    dialogRef.onClose.pipe(take(1)).subscribe((result: any) => {
      if (!result) return;

      if (existingNode?.id) {
        this.workspaceService.updateWorkspaceNode(
          this.workspaceId!, this.collectionId, existingNode.id,
          { name: result.name, description: result.description, fields: result.fields }
        ).then(() => {
          this.toastService.showSuccess('Updated', 'Node updated successfully.');
        }).catch(() => this.toastService.showError('Error', 'Failed to update node.'));
      } else {
        const nodeData: Omit<WorkspaceNode, 'id' | 'createdAt' | 'updatedAt'> = {
          workspaceId: this.workspaceId!,
          collectionId: this.collectionId,
          creatorId: this.currentUserId!,
          creatorName: this.currentUserName,
          creatorEmail: this.currentUserEmail,
          creatorPhotoURL: this.currentUserPhoto,
          name: result.name,
          description: result.description,
          fields: result.fields
        };
        this.workspaceService.addWorkspaceNode(this.workspaceId!, this.collectionId, nodeData).then(() => {
          this.toastService.showSuccess('Added', 'Node added successfully.');
        }).catch(() => this.toastService.showError('Error', 'Failed to add node.'));
      }
    });
  }

  openAddCollectionDialog(): void {
    if (this.isBanned) {
      this.toastService.showError('Banned', 'You have been banned from this workspace.');
      return;
    }

    const dialogRef = this.dialogService.open(AddCollectionDialogComponent, {
      header: 'Add Collection',
      width: '450px',
      style: { 'max-width': '90vw' },
      data: { parentCollectionId: this.collectionId }
    });

    dialogRef.onClose.pipe(take(1)).subscribe((result: any) => {
      if (!result) return;
      this.workspaceService.addWorkspaceCollection(this.workspaceId!, {
        name: result.name,
        description: result.description || '',
        workspaceId: this.workspaceId!,
        parentCollectionId: this.collectionId || null,
        createdBy: this.currentUserId!
      }).then(() => {
        this.toastService.showSuccess('Added', 'Collection added successfully.');
      }).catch(() => this.toastService.showError('Error', 'Failed to add collection.'));
    });
  }

  editCollection(collection: WorkspaceCollection): void {
    const dialogRef = this.dialogService.open(AddCollectionDialogComponent, {
      header: 'Edit Collection',
      width: '450px',
      style: { 'max-width': '90vw' },
      data: { collection, parentCollectionId: collection.parentCollectionId }
    });

    dialogRef.onClose.pipe(take(1)).subscribe((result: any) => {
      if (!result) return;
      this.workspaceService.updateWorkspaceCollection(this.workspaceId!, collection.id!, {
        name: result.name,
        description: result.description || ''
      }).then(() => {
        this.toastService.showSuccess('Updated', 'Collection updated.');
      }).catch(() => this.toastService.showError('Error', 'Failed to update collection.'));
    });
  }

  openViewNodeDialog(node: WorkspaceNode): void {
    this.dialogService.open(ViewWorkspaceNodeDialogComponent, {
      header: node.name ?? 'Node Details',
      width: '550px',
      style: { 'max-width': '96vw' },
      dismissableMask: true,
      data: { node }
    });
  }

  editNode(node: WorkspaceNode): void {
    this.openAddNodeDialog(node);
  }

  confirmDeleteItem(id: string, type: 'collection' | 'workspace-node'): void {
    if (!this.isOwner) {
      this.toastService.showError('Permission Denied', 'Only the workspace owner can delete items.');
      return;
    }

    const dialogRef = this.dialogService.open(ConfirmDialogComponent, {
      header: `Delete ${type === 'collection' ? 'Collection' : 'Node'}`,
      width: '400px',
      style: { 'max-width': '90vw' },
      data: { message: `Are you sure you want to delete this ${type === 'collection' ? 'collection' : 'node'}?` }
    });

    dialogRef.onClose.pipe(take(1)).subscribe(result => {
      if (!result) return;
      this.isLoading = true;
      if (type === 'collection') {
        this.workspaceService.deleteWorkspaceCollection(this.workspaceId!, id).then(() => {
          this.toastService.showSuccess('Deleted', 'Collection deleted.');
        }).catch(() => this.toastService.showError('Error', 'Failed to delete.')).finally(() => this.isLoading = false);
      } else {
        this.workspaceService.deleteWorkspaceNode(this.workspaceId!, this.collectionId, id).then(() => {
          this.toastService.showSuccess('Deleted', 'Node deleted.');
        }).catch(() => this.toastService.showError('Error', 'Failed to delete.')).finally(() => this.isLoading = false);
      }
    });
  }

  openOverview(): void {
    this.router.navigate(['/workspaces', this.workspaceId, 'overview']);
  }

  openSettings(): void {
    const dialogRef = this.dialogService.open(WorkspaceSettingsDialogComponent, {
      header: 'Workspace Settings',
      width: '550px',
      style: { 'max-width': '96vw' },
      data: { workspace: this.workspace, isOwner: this.isOwner }
    });

    dialogRef.onClose.pipe(take(1)).subscribe((result: any) => {
      if (result?.action === 'edit') {
        this.openEditWorkspaceDialog();
      } else if (result?.action === 'deleted') {
        this.router.navigate(['/dashboard']);
      }
    });
  }

  private openEditWorkspaceDialog(): void {
    const dialogRef = this.dialogService.open(CreateWorkspaceDialogComponent, {
      header: 'Edit Workspace',
      width: '600px',
      style: { 'max-width': '96vw' },
      data: { workspace: this.workspace }
    });

    dialogRef.onClose.pipe(take(1)).subscribe(async (result: any) => {
      if (!result) return;
      try {
        const oldSchema = this.workspace?.schema || [];
        await this.workspaceService.updateWorkspace(this.workspaceId!, {
          name: result.name,
          description: result.description,
          memberLimit: result.memberLimit || this.workspace?.memberLimit || 12,
          metadata: result.metadata,
          schema: result.schema,
          useCustomSchema: result.useCustomSchema
        });

        if (result.useCustomSchema && result.schema.length > 0 && oldSchema.length > 0) {
          await this.workspaceService.migrateWorkspaceNodes(this.workspaceId!, oldSchema, result.schema);
        }

        this.toastService.showSuccess('Updated', 'Workspace updated successfully.');
      } catch {
        this.toastService.showError('Error', 'Failed to update workspace.');
      }
    });
  }
}
