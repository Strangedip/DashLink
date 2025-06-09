import { Component, OnInit, DestroyRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, NavigationEnd } from '@angular/router';
import { FirebaseService } from '../../services/firebase.service';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';
import { Collection, Node } from '../../models/data.model';
import { CollectionCardComponent } from '../collection-card/collection-card.component';
import { NodeCardComponent } from '../node-card/node-card.component';
import { AddCollectionDialogComponent } from '../add-collection-dialog/add-collection-dialog.component';
import { AddNodeDialogComponent } from '../add-node-dialog/add-node-dialog.component';
import { ConfirmDialogComponent } from '../confirm-dialog/confirm-dialog.component';
import { ViewNodeDialogComponent } from '../view-node-dialog/view-node-dialog.component';
import { BehaviorSubject, combineLatest, Observable, of, switchMap, take, map, tap, filter, debounceTime, distinctUntilChanged, startWith, lastValueFrom, finalize } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { InputTextModule } from 'primeng/inputtext';
import { FormControl, ReactiveFormsModule, FormsModule } from '@angular/forms';

// PrimeNG Imports
import { MenuItem } from 'primeng/api';
import { DialogService } from 'primeng/dynamicdialog';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { MenuModule } from 'primeng/menu';
import { TooltipModule } from 'primeng/tooltip';
import { DataViewModule } from 'primeng/dataview';
import { BreadcrumbModule } from 'primeng/breadcrumb';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { ToggleSwitchModule } from 'primeng/toggleswitch';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    CollectionCardComponent,
    NodeCardComponent,
    AddCollectionDialogComponent,
    AddNodeDialogComponent,
    ConfirmDialogComponent,
    ViewNodeDialogComponent,
    ButtonModule,
    CardModule,
    MenuModule,
    TooltipModule,
    DataViewModule,
    InputTextModule,
    BreadcrumbModule,
    ProgressSpinnerModule,
    ToggleSwitchModule,
    FormsModule
  ],
  providers: [],
  templateUrl: './dashboard.component.html',
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
  dashboardItems$: Observable<(Collection | Node)[]> | undefined;
  showBackButton: boolean = false;

  searchControl = new FormControl('');
  private _searchFilter: string = '';

  breadcrumbItems: MenuItem[] = [];
  home: MenuItem | undefined;

  @ViewChild('additionalMenu') additionalMenu: any;

  constructor(
    private firebaseService: FirebaseService,
    private authService: AuthService,
    private route: ActivatedRoute,
    private router: Router,
    private dialogService: DialogService,
    private toastService: ToastService,
    private destroyRef: DestroyRef
  ) { }

  ngOnInit(): void {
    this.additionalMenuItems = [
      { label: 'Add Collection', icon: 'pi pi-folder-open', command: () => this.openAddCollectionDialog() },
      { label: 'Add Node', icon: 'pi pi-link', command: () => this.openAddNodeDialog() }
    ];

    this.authService.user$.pipe(
      map(user => user?.uid || null),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(uid => {
      this.currentUserId = uid;
      this.currentUserIdSubject.next(uid);
    });

    this.home = { icon: 'pi pi-home', routerLink: '/' };

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
                    console.log('Current Collection (default/root):', this.currentCollection);
                    this.showBackButton = false;
                    console.log('showBackButton (default/root):', this.showBackButton);
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

    this.dashboardItems$ = combineLatest([
      this.currentUserIdSubject.pipe(filter(uid => !!uid)),
      this.currentCollectionIdSubject,
      this.searchControl.valueChanges.pipe(startWith(''), debounceTime(300), distinctUntilChanged()),
      this.isGlobalSearchSubject
    ]).pipe(
      tap(() => this.isLoading = true),
      switchMap(([userId, collectionId, searchTerm, isGlobal]) => {
        this._searchFilter = searchTerm || '';

        let collectionsObs: Observable<Collection[]>;
        let nodesObs: Observable<Node[]>;

        if (isGlobal) {
          collectionsObs = this.firebaseService.getCollections(userId!);
          nodesObs = this.firebaseService.getAllNodes(userId!);
        } else {
          collectionsObs = collectionId
            ? this.firebaseService.getSubCollections(userId!, collectionId)
            : this.firebaseService.getSubCollections(userId!, null);

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
            return combined.sort((a, b) => {
              if (a.type === 'collection' && b.type === 'node') return -1;
              if (a.type === 'node' && b.type === 'collection') return 1;
              return (a.name || '').localeCompare(b.name || '');
            }).filter(item => {
              if (!this._searchFilter) return true;
              const lowerCaseSearchFilter = this._searchFilter.toLowerCase();

              if (item.type === 'collection') {
                return (item.name && item.name.toLowerCase().includes(lowerCaseSearchFilter)) ||
                  (item.description && item.description.toLowerCase().includes(lowerCaseSearchFilter));
              } else { // item.type === 'node'
                const node = item as Node;
                let matches = (node.name && node.name.toLowerCase().includes(lowerCaseSearchFilter)) ||
                  (node.description && node.description.toLowerCase().includes(lowerCaseSearchFilter));

                if (!matches && node.customFields) {
                  for (const field of node.customFields) {
                    const fieldValue = field.fieldValue;
                    if (typeof fieldValue === 'string' && fieldValue.toLowerCase().includes(lowerCaseSearchFilter)) {
                      matches = true;
                      break;
                    } else if (typeof fieldValue === 'number' && fieldValue.toString().includes(lowerCaseSearchFilter)) {
                      matches = true;
                      break;
                    }
                  }
                }
                return matches;
              }
            });
          }),
          tap(() => this.isLoading = false),
          takeUntilDestroyed(this.destroyRef)
        );
      })
    );
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
      width: '400px',
      data: { parentCollectionId: this.currentCollectionId }
    });

    ref.onClose.pipe(take(1)).subscribe((newCollectionData: Collection) => {
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
      data: { collectionId: this.currentCollectionId }
    });

    dialogRef.onClose.pipe(take(1)).subscribe((newNodeData: Node) => {
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
      width: '400px',
      data: { collection, parentCollectionId: collection.parentCollectionId }
    });

    ref.onClose.pipe(take(1)).subscribe((updatedCollectionData: Collection) => {
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
      data: { node: node, collectionId: this.currentCollectionId }
    });

    dialogRef.onClose.pipe(take(1)).subscribe((updatedNodeData: Node) => {
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
    this.dialogService.open(ViewNodeDialogComponent, {
      header: node.name ?? 'Node Details',
      width: '50%',
      data: { node: node }
    });
  }

  confirmDeleteItem(id: string, type: 'collection' | 'node', target: HTMLElement): void {
    if (this.isGlobalSearch) {
      this.toastService.showInfo('Information', 'Cannot delete items in global search mode. Please navigate to a specific collection or item.');
      return;
    }
    const dialogRef = this.dialogService.open(ConfirmDialogComponent, {
      header: `Confirm Delete ${type === 'collection' ? 'Collection' : 'Node'}`,
      width: '400px',
      data: { message: `Are you sure you want to delete this ${type === 'collection' ? 'collection' : 'node'}?` },
      style: { 'max-width': '90vw' }
    });

    dialogRef.onClose.pipe(take(1)).subscribe(result => {
      if (result) {
        this.isLoading = true;
        if (type === 'collection') {
          this.firebaseService.deleteCollection(this.currentUserId!, id).then(() => {
            this.toastService.showSuccess('Success', 'Collection deleted successfully!');
          }).catch((error: any) => {
            this.toastService.showError('Error', 'Failed to delete collection.');
            console.error('Error deleting collection:', error);
          }).finally(() => {
            this.isLoading = false;
          });
        } else {
          if (this.currentCollectionId) {
            this.firebaseService.deleteNode(this.currentUserId!, this.currentCollectionId, id).then(() => {
              this.toastService.showSuccess('Success', 'Node deleted successfully!');
            }).catch((error: any) => this.toastService.showError('Error', `Error deleting node: ${error.message}`));
          } else {
            this.toastService.showError('Error', 'Cannot delete node: current collection ID is missing.');
          }
        }
      }
    });
  }

  toggleSearchMode(newValue: boolean): void {
    this.isGlobalSearchSubject.next(newValue);

    if (newValue) {
      this.currentCollectionIdSubject.next(null);
    }

    this.searchControl.setValue('');
  }
}