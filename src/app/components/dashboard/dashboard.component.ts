import { Component, OnInit, DestroyRef, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FirebaseService } from '../../services/firebase.service';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';
import { LoggerService } from '../../services/logger.service';
import { WorkspaceService } from '../../services/workspace.service';
import { Collection, Node } from '../../models/data.model';
import { Workspace, WorkspaceMember } from '../../models/workspace.model';
import { CollectionCardComponent } from '../collection-card/collection-card.component';
import { NodeCardComponent } from '../node-card/node-card.component';
import { WorkspaceCardComponent } from '../workspace/workspace-card/workspace-card.component';
import { AddCollectionDialogComponent } from '../add-collection-dialog/add-collection-dialog.component';
import { AddNodeDialogComponent } from '../add-node-dialog/add-node-dialog.component';
import { ViewNodeDialogComponent } from '../view-node-dialog/view-node-dialog.component';
import { BulkUploadDialogComponent } from '../bulk-upload-dialog/bulk-upload-dialog.component';
import { CreateWorkspaceDialogComponent } from '../workspace/create-workspace-dialog/create-workspace-dialog.component';
import { BehaviorSubject, combineLatest, Observable, of, switchMap, take, map, tap, filter, debounceTime, distinctUntilChanged, startWith, lastValueFrom, catchError } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { MenuItem } from '../../ui/menu-item';
import { DialogService } from '../../ui/dialog';
import { BtnComponent } from '../../ui/btn.component';
import { BreadcrumbComponent } from '../../ui/breadcrumb.component';
import { IconComponent } from '../../ui/icon.component';
import { SelectComponent } from '../../ui/select.component';
import { PreferencesService, RecentItem } from '../../services/preferences.service';
import { compareItems, ITEM_SORT_OPTIONS, ItemSort } from '../../utils/item-sort';

@Component({
    selector: 'app-dashboard',
    imports: [
        CommonModule,
        ReactiveFormsModule,
        CollectionCardComponent,
        NodeCardComponent,
        WorkspaceCardComponent,
        BtnComponent,
        BreadcrumbComponent,
        IconComponent,
        SelectComponent,
        FormsModule
    ],
    providers: [],
    templateUrl: './dashboard.component.html',
    changeDetection: ChangeDetectionStrategy.Eager,
    styleUrl: './dashboard.component.scss'
})
export class DashboardComponent implements OnInit {
  private currentUserIdSubject = new BehaviorSubject<string | null>(null);
  private currentCollectionIdSubject = new BehaviorSubject<string | null>(null);
  private isGlobalSearchSubject = new BehaviorSubject<boolean>(false);

  currentUserId: string | null = null;
  currentCollectionId: string | null = null;
  isGlobalSearch: boolean = false;
  isLoading: boolean = false;

  currentCollection: Collection | undefined;
  additionalMenuItems: MenuItem[] = [];
  addSheetOpen = false;
  dashboardItems$: Observable<((Collection & { type: 'collection' }) | (Node & { type: 'node' }))[]> | undefined;
  showBackButton: boolean = false;

  searchControl = new FormControl('');
  private _searchFilter: string = '';

  breadcrumbItems: MenuItem[] = [];
  home: MenuItem | undefined;

  workspaces: Workspace[] = [];
  workspacesReady = false;
  activeTab: 'personal' | 'workspaces' = 'personal';
  joinDialogVisible = false;
  joinCode = '';
  readonly sortOptions = ITEM_SORT_OPTIONS;
  private latestItems: ((Collection & { type: 'collection' }) | (Node & { type: 'node' }))[] = [];
  private pendingOpenNode: string | null = null;

  constructor(
    private firebaseService: FirebaseService,
    private authService: AuthService,
    private workspaceService: WorkspaceService,
    private route: ActivatedRoute,
    private router: Router,
    private dialogService: DialogService,
    private toastService: ToastService,
    private destroyRef: DestroyRef,
    private logger: LoggerService,
    readonly prefs: PreferencesService
  ) { }

  ngOnInit(): void {
    const inCollection = !!this.route.snapshot.paramMap.get('collectionId');
    const queryTab = this.route.snapshot.queryParamMap.get('tab');
    if (inCollection) {
      this.activeTab = 'personal';
    } else if (queryTab === 'teams' || queryTab === 'workspaces') {
      this.activeTab = 'workspaces';
      this.prefs.setDashboardTab('workspaces');
      void this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { tab: null },
        queryParamsHandling: 'merge',
        replaceUrl: true
      });
    } else {
      this.activeTab = this.prefs.dashboardTab();
    }
    this.updateMenuItems();

    this.authService.user$.pipe(
      map(user => user?.uid || null),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(uid => {
      this.currentUserId = uid;
      this.currentUserIdSubject.next(uid);
    });

    this.currentUserIdSubject.pipe(
      filter((uid): uid is string => !!uid),
      switchMap(uid => this.workspaceService.getWorkspaces(uid)),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(list => {
      this.workspaces = list;
      this.workspacesReady = true;
    });

    this.home = { icon: 'home', routerLink: '/' };

    this.route.paramMap.pipe(
      switchMap(params => this.isGlobalSearchSubject.pipe(
        switchMap(isGlobal => {
          if (isGlobal) {
            return of(null);
          } else {
            const routeCollectionId = params.get('collectionId');
            if (routeCollectionId) {
              return this.currentUserIdSubject.pipe(
                filter(uid => !!uid),
                take(1),
                switchMap(uid => this.firebaseService.getCollection(uid!, routeCollectionId).pipe(
                  take(1),
                  tap(collection => {
                    this.currentCollection = collection;
                    this.showBackButton = !!this.currentCollection.parentCollectionId && this.currentCollection.parentCollectionId !== '';
                  }),
                  map(collection => routeCollectionId)
                ))
              );
            } else {
              return this.currentUserIdSubject.pipe(
                filter(uid => !!uid),
                take(1),
                switchMap(async uid => {
                  const defaultCollection = await this.firebaseService.ensureDefaultUserCollection(uid!);
                  if (defaultCollection) {
                    this.currentCollection = defaultCollection;
                    this.router.navigate(['/collections', defaultCollection.id], { replaceUrl: true });
                    this.logger.debug('Current Collection (default/root):', this.currentCollection);
                    this.showBackButton = false;
                    this.logger.debug('showBackButton (default/root):', this.showBackButton);
                    return defaultCollection.id!;
                  } else {
                    this.currentCollection = undefined;
                    this.showBackButton = false;
                    return null;
                  }
                })
              );
            }
          }
        })
      )),
      tap(collectionId => {
        this.currentCollectionId = collectionId;
        this.currentCollectionIdSubject.next(collectionId);
        this.updateBreadcrumbs();
      }),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe();

    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(params => {
      this.pendingOpenNode = params.get('openNode');
      this.tryOpenPendingNode();
    });

    this.dashboardItems$ = combineLatest([
      this.currentUserIdSubject.pipe(filter(uid => !!uid)),
      this.currentCollectionIdSubject,
      this.searchControl.valueChanges.pipe(startWith(''), debounceTime(300), distinctUntilChanged()),
      this.isGlobalSearchSubject,
      this.prefs.pins$,
      this.prefs.sort$,
      this.prefs.recents$
    ]).pipe(
      tap(() => this.isLoading = true),
      switchMap(([userId, collectionId, searchTerm, isGlobal, _pins, sort, recents]) => {
        this._searchFilter = searchTerm || '';

        let collectionsObs: Observable<Collection[]>;
        let nodesObs: Observable<Node[]>;

        if (isGlobal) {
          collectionsObs = this.firebaseService.getCollections(userId!);
          nodesObs = this.firebaseService.getAllNodes(userId!);
        } else {
          collectionsObs = this.firebaseService.getCollections(userId!).pipe(
            map(all => {
              const isRootView = !collectionId || !this.currentCollection?.parentCollectionId;
              const children = all.filter(item => this.sameParent(item.parentCollectionId, collectionId));
              if (!isRootView) {
                return children;
              }
              const extras = all.filter(item =>
                this.sameParent(item.parentCollectionId, null) && item.id && item.id !== collectionId
              );
              const seen = new Set(children.map(child => child.id));
              return [...extras.filter(item => !seen.has(item.id)), ...children];
            })
          );

          nodesObs = collectionId
            ? this.firebaseService.getNodes(userId!, collectionId)
            : of([]);
        }

        return combineLatest([collectionsObs, nodesObs]).pipe(
          map(([collections, nodes]) => {
            const combined = [
              ...collections.map(c => ({ ...c, type: 'collection' as const })),
              ...nodes.map(n => ({ ...n, type: 'node' as const }))
            ];
            return combined.sort((a, b) => compareItems(
              a,
              b,
              sort,
              recents,
              new Set(this.prefs.pins())
            )).filter(item => {
              if (!this._searchFilter) return true;
              const lowerCaseSearchFilter = this._searchFilter.toLowerCase();

              if (item.type === 'collection') {
                return (item.name && item.name.toLowerCase().includes(lowerCaseSearchFilter)) ||
                  (item.description && item.description.toLowerCase().includes(lowerCaseSearchFilter));
              } else { // item.type === 'node'
                const node = item as Node;
                let matches = (node.name && node.name.toLowerCase().includes(lowerCaseSearchFilter)) ||
                  (node.description && node.description.toLowerCase().includes(lowerCaseSearchFilter));

                if (!matches && Array.isArray(node.customFields)) {
                  for (const field of node.customFields) {
                    let searchableFieldValue: string | number | undefined;

                    if (field.fieldValue && typeof field.fieldValue.toDate === 'function') {
                      try {
                        const date = field.fieldValue.toDate();
                        searchableFieldValue = date.toLocaleDateString(); // Convert to a locale-specific date string for search
                      } catch (e) {
                        this.logger.error("Error converting Timestamp to Date for search:", e);
                        searchableFieldValue = field.fieldValue; // Fallback
                      }
                    } else {
                      searchableFieldValue = field.fieldValue;
                    }

                    const fieldName = field.fieldName;

                    if (typeof searchableFieldValue === 'string' && searchableFieldValue.toLowerCase().includes(lowerCaseSearchFilter)) {
                      matches = true;
                      break;
                    } else if (typeof searchableFieldValue === 'number' && searchableFieldValue.toString().includes(lowerCaseSearchFilter)) {
                      matches = true;
                      break;
                    } else if (typeof fieldName === 'string' && fieldName.toLowerCase().includes(lowerCaseSearchFilter)) {
                      matches = true;
                      break;
                    }
                  }
                }
                return matches;
              }
            });
          }),
          tap((items) => {
            this.latestItems = items;
            this.isLoading = false;
            this.tryOpenPendingNode();
          }),
          catchError((error: unknown) => {
            this.logger.error('Error loading dashboard items:', error);
            this.isLoading = false;
            return of([]);
          })
        );
      }),
      takeUntilDestroyed(this.destroyRef)
    );
  }

  private sameParent(value: string | null | undefined, expected: string | null): boolean {
    const normalized = value == null || value === '' ? null : value;
    return normalized === expected;
  }

  async updateBreadcrumbs(): Promise<void> {
    if (!this.currentCollectionId || !this.currentUserId || this.isGlobalSearch) {
      this.breadcrumbItems = [];
      return;
    }

    let path: MenuItem[] = [];
    let currentId: string | null | undefined = this.currentCollectionId;
    let tempCollection: Collection | undefined = this.currentCollection;

    while (currentId) {
      if (!tempCollection || tempCollection.id !== currentId) {
        try {
          tempCollection = await lastValueFrom(this.firebaseService.getCollection(this.currentUserId, currentId).pipe(take(1)));
        } catch (error) {
          break;
        }
      }

      if (tempCollection) {
        if (tempCollection.name === 'My Collections' && tempCollection.parentCollectionId === null) {
          currentId = null;
          continue;
        }

        const item: MenuItem = {
          label: tempCollection.name,
          routerLink: `/collections/${tempCollection.id}`
        };
        path.unshift(item);

        currentId = tempCollection.parentCollectionId;
        tempCollection = undefined;
      } else {
        break;
      }
    }
    this.breadcrumbItems = path;
  }

  trackByItemId(index: number, item: any): string {
    if (!item || !item.id) {
      return index.toString();
    }
    return item.id;
  }

  goToCollection(collectionId: string): void {
    if (this.isGlobalSearch) {
      this.isGlobalSearchSubject.next(false);
    }
    const collection = this.latestItems.find(item => item.type === 'collection' && item.id === collectionId);
    this.prefs.addRecent({
      id: collectionId,
      type: 'collection',
      name: collection?.name || 'Collection',
      path: `/collections/${collectionId}`
    });
    this.router.navigate(['/collections', collectionId]);
  }

  goBack(): void {
    if (this.currentCollection && this.currentCollection.parentCollectionId) {
      this.router.navigate(['/collections', this.currentCollection.parentCollectionId]);
    } else {
      this.router.navigate(['/dashboard']);
    }
  }

  openAddCollectionDialog(): void {
    if (this.isGlobalSearch) {
      this.toastService.showInfo('Information', 'Cannot add collection in global search mode. Please navigate to a specific collection.');
      return;
    }
    if (!this.currentUserId) {
      this.toastService.showError('Error', 'No user ID available to add collection.');
      return;
    }
    const ref = this.dialogService.open(AddCollectionDialogComponent, {
      header: 'Add New Collection',
      width: '450px',
      style: { 'max-width': '90vw' },
      data: { parentCollectionId: this.currentCollectionId }
    });

    ref?.onClose.pipe(take(1)).subscribe((newCollectionData: Collection) => {
      if (newCollectionData) {
        const dataToAdd: Omit<Collection, 'id' | 'createdAt' | 'updatedAt'> = {
          name: newCollectionData.name,
          userId: this.currentUserId!,
          parentCollectionId: newCollectionData.parentCollectionId,
          ...(newCollectionData.description !== null && newCollectionData.description !== undefined ? { description: newCollectionData.description } : {})
        };
        this.firebaseService.addCollection(this.currentUserId!, dataToAdd).then(() => {
          this.toastService.showSuccess('Collection Added', 'Collection added successfully!');
        }).catch(error => this.toastService.showError('Add Collection Failed', `Error adding collection: ${error.message}`));
      }
    });
  }

  openAddNodeDialog(): void {
    if (this.isGlobalSearch) {
      this.toastService.showInfo('Information', 'Cannot add node in global search mode. Please navigate to a specific collection.');
      return;
    }
    if (!this.currentCollectionId || !this.currentUserId) {
      this.toastService.showError('Error', 'Please navigate into a collection and ensure you are logged in to add a node.');
      return;
    }

    const dialogRef = this.dialogService.open(AddNodeDialogComponent, {
      header: 'Add New Node',
      width: '700px',
      style: { 'max-width': '90vw' },
      data: { collectionId: this.currentCollectionId }
    });

    dialogRef?.onClose.pipe(take(1)).subscribe((newNodeData: Node) => {
      if (newNodeData) {
        const dataToAdd: Omit<Node, 'id' | 'createdAt' | 'updatedAt'> = {
          name: newNodeData.name,
          collectionId: this.currentCollectionId!,
          userId: this.currentUserId!,
          ...(newNodeData.description !== null && newNodeData.description !== undefined ? { description: newNodeData.description } : {}),
          ...(newNodeData.customFields ? { customFields: newNodeData.customFields } : {})
        };
        this.firebaseService.addNode(this.currentUserId!, this.currentCollectionId!, dataToAdd).then(() => {
          this.toastService.showSuccess('Success', 'Node added successfully!');
        }).catch((error: any) => this.toastService.showError('Error', `Error adding node: ${error.message}`));
      }
    });
  }

  editCollection(collection: Collection): void {
    if (!this.currentUserId) {
      this.toastService.showError('Error', 'No user ID available for edit.');
      return;
    }
    if (!collection.id) {
      this.toastService.showError('Error', 'Collection ID is missing for edit.');
      return;
    }
    const ref = this.dialogService.open(AddCollectionDialogComponent, {
      header: 'Edit Collection',
      width: '450px',
      style: { 'max-width': '90vw' },
      data: { collection, parentCollectionId: collection.parentCollectionId }
    });

    ref?.onClose.pipe(take(1)).subscribe((updatedCollectionData: Collection) => {
      if (updatedCollectionData) {
        const dataToUpdate: Partial<Collection> = {
          name: updatedCollectionData.name,
          parentCollectionId: updatedCollectionData.parentCollectionId,
          ...(updatedCollectionData.description !== null && updatedCollectionData.description !== undefined ? { description: updatedCollectionData.description } : {})
        };
        this.firebaseService.updateCollection(this.currentUserId!, collection.id as string, dataToUpdate).then(() => {
          this.toastService.showSuccess('Collection Updated', 'Collection updated successfully!');
        }).catch(error => this.toastService.showError('Update Failed', `Error updating collection: ${error.message}`));
      }
    });
  }

  editNode(node: Node): void {
    if (!this.currentUserId) {
      this.toastService.showError('Error', 'No user ID available for edit.');
      return;
    }
    if (!node.id || !node.collectionId) {
      this.toastService.showError('Error', 'Node ID or Collection ID is missing for edit.');
      return;
    }
    const dialogRef = this.dialogService.open(AddNodeDialogComponent, {
      header: 'Edit Node',
      width: '700px',
      style: { 'max-width': '90vw' },
      data: { node: node, collectionId: this.currentCollectionId }
    });

    dialogRef?.onClose.pipe(take(1)).subscribe((updatedNodeData: Node) => {
      if (updatedNodeData) {
        const dataToUpdate: Partial<Node> = {
          name: updatedNodeData.name,
          description: updatedNodeData.description !== null && updatedNodeData.description !== undefined ? updatedNodeData.description : null,
          customFields: updatedNodeData.customFields || []
        };
        this.firebaseService.updateNode(this.currentUserId!, this.currentCollectionId!, node.id!, dataToUpdate).then(() => {
          this.toastService.showSuccess('Success', 'Node updated successfully!');
        }).catch(error => this.toastService.showError('Error', `Error updating node: ${error.message}`));
      }
    });
  }

  openViewNodeDialog(node: Node): void {
    this.prefs.addRecent({
      id: node.id!,
      type: 'node',
      name: node.name,
      path: `/collections/${node.collectionId}`,
      collectionId: node.collectionId
    });
    this.dialogService.open(ViewNodeDialogComponent, {
      header: node.name ?? 'Node Details',
      width: '32rem',
      flush: true,
      dismissableMask: true,
      data: { node: node }
    });
  }

  openBulkUploadDialog(): void {
    const ref = this.dialogService.open(BulkUploadDialogComponent, {
      header: 'Bulk Upload Collections & Nodes',
      width: '700px',
      style: { 
        'max-width': '96vw'
      },
      dismissableMask: true,
      data: { 
        userId: this.currentUserId,
        parentCollectionId: this.currentCollectionId 
      }
    });

    ref?.onClose.subscribe((success: boolean) => {
      if (success) {
        this.currentCollectionIdSubject.next(this.currentCollectionId);
      }
    });
  }

  confirmDeleteItem(id: string, type: 'collection' | 'node', target: HTMLElement): void {
    if (this.isGlobalSearch) {
      this.toastService.showInfo('Information', 'Cannot delete items in global search mode. Please navigate to a specific collection or item.');
      return;
    }
    const item = this.latestItems.find(entry => entry.id === id && (type === 'collection' ? entry.type === 'collection' : entry.type === 'node'));
    if (!item || !this.currentUserId) {
      this.toastService.showError('Error', 'Could not find that item.');
      return;
    }

    const snapshot = { ...item };
    this.isLoading = true;
    const finish = () => { this.isLoading = false; };

    if (type === 'collection') {
      const { type: _type, ...collection } = snapshot as Collection & { type: 'collection' };
      this.firebaseService.deleteCollection(this.currentUserId, id).then(() => {
        this.prefs.remove(id);
        this.toastService.showUndo('Collection deleted', 'Tap Undo if that was a mistake.', () => {
          void this.firebaseService.restoreCollection(this.currentUserId!, collection as Collection);
        });
      }).catch((error: unknown) => {
        this.toastService.showError('Error', 'Failed to delete collection.');
        this.logger.error('Error deleting collection:', error);
      }).finally(finish);
    } else if (this.currentCollectionId) {
      const { type: _type, ...node } = snapshot as Node & { type: 'node' };
      this.firebaseService.deleteNode(this.currentUserId, this.currentCollectionId, id).then(() => {
        this.prefs.remove(id);
        this.toastService.showUndo('Node deleted', 'Tap Undo if that was a mistake.', () => {
          void this.firebaseService.restoreNode(this.currentUserId!, this.currentCollectionId!, node as Node);
        });
      }).catch((error: unknown) => {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        this.toastService.showError('Error', `Error deleting node: ${errorMessage}`);
        this.logger.error('Error deleting node:', error);
      }).finally(finish);
    } else {
      this.toastService.showError('Error', 'Cannot delete node: current collection ID is missing.');
      finish();
    }
  }

  toggleSearchMode(newValue: boolean): void {
    if (this.isGlobalSearch === newValue) {
      return;
    }
    this.isGlobalSearch = newValue;
    this.isGlobalSearchSubject.next(newValue);

    if (newValue) {
      this.currentCollectionIdSubject.next(null);
    }

    this.searchControl.setValue('');
  }

  openCreateWorkspaceDialog(): void {
    if (!this.currentUserId) return;

    const dialogRef = this.dialogService.open(CreateWorkspaceDialogComponent, {
      header: 'New workspace',
      width: '600px',
      style: { 'max-width': '96vw' }
    });

    dialogRef?.onClose.pipe(take(1)).subscribe(async (result: any) => {
      if (!result) return;
      try {
        const user = await lastValueFrom(this.authService.user$.pipe(take(1)));
        const ownerName = user?.displayName || user?.email || 'User';

        const ownerMember: WorkspaceMember = {
          userId: this.currentUserId!,
          displayName: ownerName,
          email: user?.email || '',
          photoURL: user?.photoURL || '',
          role: 'owner',
          joinedAt: new Date(),
          banned: false
        };

        const workspaceId = await this.workspaceService.createWorkspace({
          name: result.name,
          description: result.description,
          ownerId: this.currentUserId!,
          ownerName,
          memberLimit: result.memberLimit || 12,
          memberIds: [this.currentUserId!],
          members: [ownerMember],
          schema: result.schema,
          useCustomSchema: result.useCustomSchema,
          metadata: result.metadata,
          aiApiKey: result.aiApiKey || ''
        });

        this.prefs.setDashboardTab('workspaces');
        this.toastService.showSuccess('Created', 'Workspace created successfully!');
        this.router.navigate(['/workspaces', workspaceId]);
      } catch (error: unknown) {
        this.toastService.showError('Error', 'Failed to create workspace.');
        this.logger.error('Error creating workspace:', error);
      }
    });
  }

  goToWorkspace(workspace: Workspace): void {
    this.prefs.addRecent({
      id: workspace.id!,
      type: 'workspace',
      name: workspace.name,
      path: `/workspaces/${workspace.id}`,
      workspaceId: workspace.id
    });
    this.router.navigate(['/workspaces', workspace.id]);
  }

  setActiveTab(tab: 'personal' | 'workspaces'): void {
    this.activeTab = tab;
    this.prefs.setDashboardTab(tab);
    this.searchControl.setValue('');
    if (tab === 'workspaces' && this.isGlobalSearch) {
      this.isGlobalSearch = false;
      this.isGlobalSearchSubject.next(false);
    }
    this.updateMenuItems();
  }

  updateMenuItems(): void {
    if (this.activeTab === 'workspaces') {
      this.additionalMenuItems = [
        { label: 'Create workspace', icon: 'users', command: () => this.openCreateWorkspaceDialog() },
        { label: 'Join with code', icon: 'sign-in', command: () => this.openJoinDialog() }
      ];
      return;
    }

    this.additionalMenuItems = [
      { label: 'Add collection', icon: 'folder-open', command: () => this.openAddCollectionDialog() },
      { label: 'Add node', icon: 'link', command: () => this.openAddNodeDialog() },
      { separator: true },
      { label: 'Bulk upload', icon: 'upload', command: () => this.openBulkUploadDialog() }
    ];
  }

  filteredWorkspaces(workspaces: Workspace[] | null | undefined): Workspace[] {
    const list = workspaces || [];
    const query = (this.searchControl.value || '').trim().toLowerCase();
    const filtered = !query || this.activeTab !== 'workspaces'
      ? list
      : list.filter(workspace =>
        workspace.name?.toLowerCase().includes(query) ||
        workspace.description?.toLowerCase().includes(query) ||
        workspace.metadata?.category?.toLowerCase().includes(query) ||
        workspace.metadata?.purpose?.toLowerCase().includes(query) ||
        workspace.metadata?.goal?.toLowerCase().includes(query)
      );
    const recents = this.prefs.recents();
    return [...filtered].sort((a, b) => compareItems(
      { ...a, type: 'workspace' },
      { ...b, type: 'workspace' },
      this.prefs.sort(),
      recents
    ));
  }

  onSortChange(value: string): void {
    this.prefs.setSort(value as ItemSort);
  }

  openJoinDialog(): void {
    this.joinCode = '';
    this.joinDialogVisible = true;
  }

  submitJoinCode(): void {
    const code = this.joinCode.trim();
    if (!code) {
      this.toastService.showInfo('Invite code needed', 'Paste the code from your teammate.');
      return;
    }
    this.joinDialogVisible = false;
    this.router.navigate(['/workspaces/join', code]);
  }

  openAddMenu(event?: Event): void {
    event?.preventDefault();
    event?.stopPropagation();
    this.addSheetOpen = true;
  }

  runAddMenuItem(item: MenuItem): void {
    this.addSheetOpen = false;
    item.command?.();
  }

  togglePin(collectionId: string): void {
    this.prefs.togglePin(collectionId);
  }

  openRecent(item: RecentItem): void {
    if (item.type === 'workspace') {
      this.router.navigate(['/workspaces', item.workspaceId || item.id]);
      return;
    }
    if (item.type === 'collection') {
      this.router.navigate(['/collections', item.id]);
      return;
    }
    if (item.collectionId) {
      this.router.navigate(['/collections', item.collectionId], { queryParams: { openNode: item.id } });
    }
  }

  private tryOpenPendingNode(): void {
    if (!this.pendingOpenNode) {
      return;
    }
    const node = this.latestItems.find(item => item.type === 'node' && item.id === this.pendingOpenNode);
    if (node && node.type === 'node') {
      this.pendingOpenNode = null;
      this.router.navigate([], { queryParams: { openNode: null }, queryParamsHandling: 'merge', replaceUrl: true });
      this.openViewNodeDialog(node);
    }
  }
}