import { Component, OnInit, DestroyRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, NavigationEnd } from '@angular/router';
import { FirebaseService } from '../../services/firebase.service';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';
import { Collection, Link } from '../../models/data.model';
import { CollectionCardComponent } from '../collection-card/collection-card.component';
import { LinkCardComponent } from '../link-card/link-card.component';
import { AddCollectionDialogComponent } from '../add-collection-dialog/add-collection-dialog.component';
import { AddLinkDialogComponent } from '../add-link-dialog/add-link-dialog.component';
import { ConfirmDialogComponent } from '../confirm-dialog/confirm-dialog.component';
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
    LinkCardComponent,
    AddCollectionDialogComponent,
    AddLinkDialogComponent,
    ConfirmDialogComponent,
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
  dashboardItems$: Observable<(Collection | Link)[]> | undefined;
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
      { label: 'Add Link', icon: 'pi pi-link', command: () => this.openAddLinkDialog() }
    ];

    this.authService.user$.pipe(
      tap(user => console.log('Auth user changed:', user?.uid)),
      map(user => user?.uid || null),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(uid => {
      this.currentUserId = uid;
      this.currentUserIdSubject.next(uid);
    });

    this.home = { icon: 'pi pi-home', routerLink: '/' };

    this.route.paramMap.pipe(
      tap(params => console.log('Route paramMap changed:', params.get('collectionId'))),
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
                    console.log('Current Collection (with routeId):', this.currentCollection);
                    this.showBackButton = !!this.currentCollection.parentCollectionId && this.currentCollection.parentCollectionId !== '';
                    console.log('showBackButton (with routeId):', this.showBackButton);
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
                    console.log('showBackButton (no collection):', this.showBackButton);
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
      tap(([userId, collectionId, searchTerm, isGlobal]) => console.log('Combining for data fetch with search:', { userId, collectionId, searchTerm, isGlobalSearch: isGlobal })),
      switchMap(([userId, collectionId, searchTerm, isGlobal]) => {
        this._searchFilter = searchTerm || '';

        let collectionsObs: Observable<Collection[]>;
        let linksObs: Observable<Link[]>;

        if (isGlobal) {
          collectionsObs = this.firebaseService.getCollections(userId!);
          linksObs = this.firebaseService.getAllLinks(userId!);
        } else {
          collectionsObs = collectionId
            ? this.firebaseService.getSubCollections(userId!, collectionId)
            : this.firebaseService.getSubCollections(userId!, null);

          linksObs = collectionId
            ? this.firebaseService.getLinks(userId!, collectionId)
            : of([]);
        }

        return combineLatest([collectionsObs, linksObs]).pipe(
          map(([collections, links]) => {
            const combined = [
              ...collections.map(c => ({ ...c, type: 'collection' as const })),
              ...links.map(l => ({ ...l, type: 'link' as const }))
            ];
            return combined.sort((a, b) => {
              if (a.type === 'collection' && b.type === 'link') return -1;
              if (a.type === 'link' && b.type === 'collection') return 1;
              return (a.name || '').localeCompare(b.name || '');
            });
          }),
          map(items => {
            if (!this._searchFilter) {
              return items;
            }
            const filter = this._searchFilter.toLowerCase();
            return items.filter(item => {
              if (item.type === 'collection') {
                return (item.name && item.name.toLowerCase().includes(filter)) ||
                       (item.description && item.description.toLowerCase().includes(filter)) ||
                       (item.tag && item.tag.toLowerCase().includes(filter));
              } else {
                return (item.name && item.name.toLowerCase().includes(filter)) ||
                       (item.url && item.url.toLowerCase().includes(filter)) ||
                       (item.description && item.description.toLowerCase().includes(filter)) ||
                       (item.tag && item.tag.toLowerCase().includes(filter));
              }
            });
          }),
          tap(data => console.log('Dashboard items for rendering (after combined and filtered):', data)),
          finalize(() => this.isLoading = false)
        );
      }),
      takeUntilDestroyed(this.destroyRef)
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
          console.error('Error fetching collection for breadcrumb:', error);
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
      console.warn('trackByItemId: Item or item.id is undefined/null', item);
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

  openAddLinkDialog(): void {
    if (this.isGlobalSearch) {
      this.toastService.showInfo('Information', 'Cannot add link in global search mode. Please navigate to a specific collection.');
      return;
    }
    if (!this.currentCollectionId || !this.currentUserId) {
      this.toastService.showError('Error', 'Please navigate into a collection and ensure you are logged in to add a link.');
      return;
    }

    const ref = this.dialogService.open(AddLinkDialogComponent, {
      header: 'Add New Link',
      width: '400px',
      data: { collectionId: this.currentCollectionId }
    });

    ref.onClose.pipe(take(1)).subscribe((newLinkData: Link) => {
      if (newLinkData) {
        const dataToAdd: Omit<Link, 'id' | 'createdAt' | 'updatedAt'> = {
          name: newLinkData.name,
          url: newLinkData.url,
          collectionId: this.currentCollectionId!,
          userId: this.currentUserId!,
          ...(newLinkData.description !== null && newLinkData.description !== undefined ? { description: newLinkData.description } : {})
        };
        this.firebaseService.addLink(this.currentUserId!, this.currentCollectionId!, dataToAdd).then(() => {
          this.toastService.showSuccess('Link Added', 'Link added successfully!');
        }).catch(error => this.toastService.showError('Add Link Failed', `Error adding link: ${error.message}`));
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

  editLink(link: Link): void {
    if (!this.currentUserId) {
      this.toastService.showError('Error', 'No user ID available for edit.');
      return;
    }
    if (!link.id || !link.collectionId) {
      this.toastService.showError('Error', 'Link ID or Collection ID is missing for edit.');
      return;
    }
    const ref = this.dialogService.open(AddLinkDialogComponent, {
      header: 'Edit Link',
      width: '400px',
      data: { link, collectionId: link.collectionId }
    });

    ref.onClose.pipe(take(1)).subscribe((updatedLinkData: Link) => {
      if (updatedLinkData) {
        const dataToUpdate: Partial<Link> = {
          name: updatedLinkData.name,
          url: updatedLinkData.url,
          ...(updatedLinkData.description !== null && updatedLinkData.description !== undefined ? { description: updatedLinkData.description } : {})
        };
        this.firebaseService.updateLink(this.currentUserId!, link.collectionId as string, link.id as string, dataToUpdate).then(() => {
          this.toastService.showSuccess('Link Updated', 'Link updated successfully!');
        }).catch(error => this.toastService.showError('Update Failed', `Error updating link: ${error.message}`));
      }
    });
  }

  confirmDeleteItem(id: string, type: 'collection' | 'link', target: HTMLElement): void {
    if (this.isGlobalSearch) {
      this.toastService.showInfo('Information', 'Cannot delete items in global search mode. Please navigate to a specific collection or item.');
      return;
    }
    const header = type === 'collection' ? 'Delete Collection' : 'Delete Link';
    const message = type === 'collection'
      ? 'Are you sure you want to delete this collection and all its sub-collections and links?'
      : 'Are you sure you want to delete this link?';

    const ref = this.dialogService.open(ConfirmDialogComponent, {
      header: header,
      width: '350px',
      contentStyle: { "max-height": "350px", "overflow": "auto" },
      baseZIndex: 10000,
      data: { message: message }
    });

    ref.onClose.pipe(take(1)).subscribe((result) => {
      if (result && this.currentUserId) {
        if (type === 'collection') {
          this.firebaseService.deleteCollection(this.currentUserId, id).then(() => {
            this.toastService.showSuccess('Deleted', 'Collection deleted successfully!');
          }).catch(error => this.toastService.showError('Deletion Failed', `Error deleting collection: ${error.message}`));
        } else {
          if (this.currentCollectionId) {
            this.firebaseService.deleteLink(this.currentUserId, this.currentCollectionId, id).then(() => {
              this.toastService.showSuccess('Deleted', 'Link deleted successfully!');
            }).catch(error => this.toastService.showError('Deletion Failed', `Error deleting link: ${error.message}`));
          } else {
            this.toastService.showError('Error', 'Cannot delete link: current collection ID is missing.');
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