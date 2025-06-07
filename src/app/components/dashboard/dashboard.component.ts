import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FirebaseService } from '../../services/firebase.service';
import { AuthService } from '../../services/auth.service';
import { Collection, Link } from '../../models/data.model';
import { CollectionCardComponent } from '../collection-card/collection-card.component';
import { LinkCardComponent } from '../link-card/link-card.component';
import { AddCollectionDialogComponent } from '../add-collection-dialog/add-collection-dialog.component';
import { AddLinkDialogComponent } from '../add-link-dialog/add-link-dialog.component';
import { BehaviorSubject, combineLatest, Observable, of, switchMap, take, map, tap, filter } from 'rxjs'; // Added BehaviorSubject, filter

// PrimeNG Imports
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { DialogService, DynamicDialog } from 'primeng/dynamicdialog';
import { MenuModule } from 'primeng/menu';
import { MenuItem } from 'primeng/api';
import { ConfirmPopupModule } from 'primeng/confirmpopup';
import { ConfirmationService } from 'primeng/api';
import { TooltipModule } from 'primeng/tooltip';
import { DataViewModule } from 'primeng/dataview';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, CollectionCardComponent, LinkCardComponent, ButtonModule, CardModule, DynamicDialog, MenuModule, ConfirmPopupModule, TooltipModule, DataViewModule],
  providers: [DialogService, ConfirmationService],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent implements OnInit {
  // Use BehaviorSubject to hold the current state of userId and collectionId
  // This allows us to trigger new data fetches reactively
  private currentUserIdSubject = new BehaviorSubject<string | null>(null);
  private currentCollectionIdSubject = new BehaviorSubject<string | null>(null);

  currentUserId: string | null = null; // Still good for template access
  currentCollectionId: string | null = null; // Still good for template access

  currentCollection: Collection | undefined;
  showAddMenu: boolean = false; // This property is not used directly in your HTML for p-menu toggle, but fine if used elsewhere
  menuItems: MenuItem[] = [];
  dashboardItems$: Observable<(Collection | Link)[]> | undefined;

  constructor(
    private firebaseService: FirebaseService,
    private authService: AuthService,
    private route: ActivatedRoute,
    private router: Router,
    private dialogService: DialogService,
    private confirmationService: ConfirmationService
  ) { }

  ngOnInit(): void {
    // 1. Initialize menu items
    this.menuItems = [
      { label: 'Add Collection', icon: 'pi pi-folder-open', command: () => this.openAddCollectionDialog() },
      { label: 'Add Link', icon: 'pi pi-link', command: () => this.openAddLinkDialog() }
    ];

    // 2. Drive the currentUserId from AuthService
    this.authService.user$.pipe(
      tap(user => console.log('Auth user changed:', user?.uid)), // Debug log
      map(user => user?.uid || null) // Map user object to uid or null
    ).subscribe(uid => {
      this.currentUserId = uid; // Update public property for template access
      this.currentUserIdSubject.next(uid); // Emit the new userId to our Subject
    });

    // 3. Drive the currentCollectionId from ActivatedRoute
    this.route.paramMap.pipe(
      tap(params => console.log('Route paramMap changed:', params.get('collectionId'))), // Debug log
      switchMap(params => {
        const routeCollectionId = params.get('collectionId');
        // If there's a route collection ID, get its details
        if (routeCollectionId) {
          // Ensure currentUserId is available before fetching collection details
          return this.currentUserIdSubject.pipe(
            filter(uid => !!uid), // Only proceed if userId is not null
            take(1), // Take current userId
            switchMap(uid => this.firebaseService.getCollection(uid!, routeCollectionId).pipe(
              take(1),
              map(collection => {
                this.currentCollection = collection;
                return routeCollectionId; // Emit the collectionId
              })
            ))
          );
        } else {
          // If at root, check for default collection
          return this.currentUserIdSubject.pipe(
            filter(uid => !!uid), // Only proceed if userId is not null
            take(1), // Take current userId
            switchMap(async uid => {
              const defaultCollection = await this.firebaseService.ensureDefaultUserCollection(uid!);
              if (defaultCollection) {
                this.currentCollection = defaultCollection;
                this.router.navigate(['/collections', defaultCollection.id], { replaceUrl: true });
                return defaultCollection.id!; // Emit the default collectionId
              } else {
                this.currentCollection = undefined;
                return null; // Emit null if no specific or default collection
              }
            })
          );
        }
      })
    ).subscribe(collectionId => {
      this.currentCollectionId = collectionId; // Update public property for template access
      this.currentCollectionIdSubject.next(collectionId); // Emit the new collectionId to our Subject
    });


    // 4. Combine `currentUserIdSubject` and `currentCollectionIdSubject` to drive `dashboardItems$`
    // This is the single source of truth for your data rendering
    this.dashboardItems$ = combineLatest([
      this.currentUserIdSubject.pipe(filter(uid => !!uid)), // Wait for userId to be set
      this.currentCollectionIdSubject // Can be null for root
    ]).pipe(
      tap(([userId, collectionId]) => console.log('Combining for data fetch:', { userId, collectionId })), // Debug log
      switchMap(([userId, collectionId]) => {
        const collectionsObs: Observable<Collection[]> = collectionId
          ? this.firebaseService.getSubCollections(userId!, collectionId)
          : this.firebaseService.getSubCollections(userId!, null); // Root collections

        const linksObs: Observable<Link[]> = collectionId
          ? this.firebaseService.getLinks(userId!, collectionId)
          : of([]); // No links at the root level

        return combineLatest([collectionsObs, linksObs]).pipe(
          map(([collections, links]) => {
            const combined = [
              ...collections.map(c => ({ ...c, type: 'collection' as const })), // Add 'as const' for better type inference
              ...links.map(l => ({ ...l, type: 'link' as const }))
            ];
            return combined.sort((a, b) => {
              if (a.type === 'collection' && b.type === 'link') return -1;
              if (a.type === 'link' && b.type === 'collection') return 1;
              return (a.name || '').localeCompare(b.name || '');
            });
          }),
          tap(data => console.log('Dashboard items for rendering (after combined):', data)) // Final data log
        );
      })
    );
  }

  trackByItemId(index: number, item: any): string {
    // Add defensive check for item.id
    if (!item || !item.id) {
      console.warn('trackByItemId: Item or item.id is undefined/null', item);
      return index.toString(); // Fallback to index if ID is missing
    }
    return item.id;
  }

  goToCollection(collectionId: string): void {
    this.router.navigate(['/collections', collectionId]);
    // The ngOnInit paramMap subscription will handle updating currentCollectionIdSubject
  }

  goBack(): void {
    if (this.currentCollection && this.currentCollection.parentCollectionId) {
      this.router.navigate(['/collections', this.currentCollection.parentCollectionId]);
    } else {
      this.router.navigate(['/dashboard']); // Go to root dashboard
    }
    // The ngOnInit paramMap subscription will handle updating currentCollectionIdSubject
  }

  // --- Dialog and CRUD methods remain largely the same, but ensure they trigger `refreshData` if needed ---
  // The `refreshData` method itself will now just emit a new value on the Subjects,
  // which will naturally trigger the dashboardItems$ observable chain.

  openAddCollectionDialog(): void {
    this.showAddMenu = false;
    if (!this.currentUserId) { console.warn('No user ID available.'); return; }
    const ref = this.dialogService.open(AddCollectionDialogComponent, {
      header: 'Add New Collection',
      width: '400px',
      data: { parentCollectionId: this.currentCollectionId }
    });

    ref.onClose.pipe(take(1)).subscribe((newCollectionData: Collection) => {
      if (newCollectionData) {
        console.log('Attempting to add new collection with parentCollectionId:', newCollectionData.parentCollectionId);
        const dataToAdd: Omit<Collection, 'id' | 'createdAt' | 'updatedAt'> = {
          name: newCollectionData.name,
          userId: this.currentUserId!,
          parentCollectionId: newCollectionData.parentCollectionId,
          ...(newCollectionData.description !== null && newCollectionData.description !== undefined ? { description: newCollectionData.description } : {})
        };
        this.firebaseService.addCollection(this.currentUserId!, dataToAdd).then(() => {
          console.log('Collection added successfully!');
          // No direct refreshData() needed here. Firestore observable will update automatically.
          // If FirebaseService's methods update data via snapshot listeners, this will be reactive.
          // If not, and you're fetching static data, you might need to manually trigger refresh:
          // this.currentCollectionIdSubject.next(this.currentCollectionId); // Or just next userIdSubject
        }).catch(error => console.error('Error adding collection:', error));
      }
    });
  }

  openAddLinkDialog(): void {
    this.showAddMenu = false;
    if (!this.currentCollectionId || !this.currentUserId) {
      console.warn('Cannot add a link without a collection ID or user ID.');
      alert('Please navigate into a collection and ensure you are logged in to add a link.');
      return;
    }

    const ref = this.dialogService.open(AddLinkDialogComponent, {
      header: 'Add New Link',
      width: '400px',
      data: { collectionId: this.currentCollectionId }
    });

    ref.onClose.pipe(take(1)).subscribe((newLinkData: Link) => {
      if (newLinkData) {
        console.log('Attempting to add new link with collectionId:', newLinkData.collectionId);
        const dataToAdd: Omit<Link, 'id' | 'createdAt' | 'updatedAt'> = {
          name: newLinkData.name,
          url: newLinkData.url,
          collectionId: this.currentCollectionId!,
          userId: this.currentUserId!,
          ...(newLinkData.description !== null && newLinkData.description !== undefined ? { description: newLinkData.description } : {})
        };
        this.firebaseService.addLink(this.currentUserId!, this.currentCollectionId!, dataToAdd).then(() => {
          console.log('Link added successfully!');
          // No direct refreshData() needed, same as above.
        }).catch(error => console.error('Error adding link:', error));
      }
    });
  }

  editCollection(collection: Collection): void {
    if (!this.currentUserId) { console.warn('No user ID available for edit.'); return; }
    if (!collection.id) { console.warn('Collection ID is missing for edit.'); return; }
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
          console.log('Collection updated successfully!');
          // No direct refreshData() needed.
        }).catch(error => console.error('Error updating collection:', error));
      }
    });
  }

  deleteCollection(collectionId: string): void {
    if (!this.currentUserId) { console.warn('No user ID available for delete.'); return; }
    this.confirmationService.confirm({
      message: 'Are you sure you want to delete this collection and all its contents?',
      header: 'Confirmation',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.firebaseService.deleteCollection(this.currentUserId!, collectionId).then(() => {
          console.log('Collection deleted successfully!');
          // No direct refreshData() needed.
        }).catch(error => console.error('Error deleting collection:', error));
      },
      reject: () => {
        // Do nothing on reject
      }
    });
  }

  editLink(link: Link): void {
    if (!this.currentUserId) { console.warn('No user ID available for link edit.'); return; }
    if (!link.collectionId) { console.warn('Link collection ID is missing for edit.'); return; }
    if (!link.id) { console.warn('Link ID is missing for edit.'); return; }

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
        this.firebaseService.updateLink(this.currentUserId!, link.collectionId as string, link.id, dataToUpdate).then(() => {
          console.log('Link updated successfully!');
          // No direct refreshData() needed.
        }).catch(error => console.error('Error updating link:', error));
      }
    });
  }

  deleteLink(linkId: string): void {
    if (!this.currentUserId || !this.currentCollectionId) { console.warn('No user ID or collection ID available for link delete.'); return; }
    this.confirmationService.confirm({
      message: 'Are you sure you want to delete this link?',
      header: 'Confirmation',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.firebaseService.deleteLink(this.currentUserId!, this.currentCollectionId!, linkId).then(() => {
          console.log('Link deleted successfully!');
          // No direct refreshData() needed.
        }).catch(error => console.error('Error deleting link:', error));
      },
      reject: () => {
        // Do nothing on reject
      }
    });
  }

  // refreshData is no longer a separate function that gets called.
  // Instead, the `dashboardItems$` observable now reacts to changes in
  // `currentUserIdSubject` and `currentCollectionIdSubject`.
  // If your FirebaseService methods (getSubCollections, getLinks) return
  // observables that are connected to Firestore snapshot changes, then
  // any add/update/delete operations will automatically trigger new emissions
  // on those observables, which will in turn cause `dashboardItems$` to update.
  // private refreshData(): void { /* ... removed ... */ }
}