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
import { Observable, switchMap, of, take } from 'rxjs';

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
  currentUserId: string | null = null;
  currentCollectionId: string | null = null;
  collections$: Observable<Collection[]> | undefined;
  links$: Observable<Link[]> | undefined;
  currentCollection: Collection | undefined;
  showAddMenu: boolean = false;
  menuItems: MenuItem[] = [];

  constructor(
    private firebaseService: FirebaseService,
    private authService: AuthService,
    private route: ActivatedRoute,
    private router: Router,
    private dialogService: DialogService,
    private confirmationService: ConfirmationService
  ) { }

  ngOnInit(): void {
    this.authService.user$.pipe(
      take(1) // Only take the first user emission
    ).subscribe(async user => {
      if (user && user.uid) {
        this.currentUserId = user.uid;
        const defaultCollection = await this.firebaseService.ensureDefaultUserCollection(this.currentUserId);

        // Set up initial collection based on route or default
        this.route.paramMap.pipe(
          take(1)
        ).subscribe(params => {
          const routeCollectionId = params.get('collectionId');
          if (routeCollectionId) {
            this.currentCollectionId = routeCollectionId;
            this.firebaseService.getCollection(this.currentUserId!, this.currentCollectionId).pipe(take(1)).subscribe(collection => {
              this.currentCollection = collection;
            });
          } else if (defaultCollection) {
            this.currentCollectionId = defaultCollection.id!;
            this.currentCollection = defaultCollection;
            // Redirect to the default collection URL if at root and default exists
            this.router.navigate(['/collections', this.currentCollectionId], { replaceUrl: true });
          }
          this.refreshData(); // Initial data load
        });

        // Subscribe to route changes to refresh data when navigating between collections
        this.route.paramMap.subscribe(params => {
          const newCollectionId = params.get('collectionId');
          // Only refresh if collection ID actually changed and user is logged in
          if (this.currentUserId && newCollectionId !== this.currentCollectionId) {
            this.currentCollectionId = newCollectionId;
            if (this.currentCollectionId) {
              this.firebaseService.getCollection(this.currentUserId, this.currentCollectionId).pipe(take(1)).subscribe(collection => {
                this.currentCollection = collection;
              });
            } else {
              this.currentCollection = undefined; // At root level
            }
            this.refreshData();
          }
        });
      } else {
        this.currentUserId = null;
        // Potentially handle not logged in state, e.g., redirect to login
      }
    });

    this.menuItems = [
      { label: 'Add Collection', icon: 'pi pi-folder-open', command: () => this.openAddCollectionDialog() },
      { label: 'Add Link', icon: 'pi pi-link', command: () => this.openAddLinkDialog() }
    ];
  }

  goToCollection(collectionId: string): void {
    this.router.navigate(['/collections', collectionId]);
  }

  goBack(): void {
    if (this.currentCollection && this.currentCollection.parentCollectionId) {
      this.router.navigate(['/collections', this.currentCollection.parentCollectionId]);
    } else {
      this.router.navigate(['/dashboard']); // Go to root dashboard
    }
  }

  toggleAddMenu(event: Event): void {
    this.showAddMenu = !this.showAddMenu;
  }

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
        const dataToAdd: Omit<Collection, 'id' | 'createdAt' | 'updatedAt'> = {
          name: newCollectionData.name,
          userId: this.currentUserId!,
          parentCollectionId: newCollectionData.parentCollectionId,
          ...(newCollectionData.description !== null && newCollectionData.description !== undefined ? { description: newCollectionData.description } : {})
        };
        this.firebaseService.addCollection(this.currentUserId!, dataToAdd).then(() => {
          console.log('Collection added successfully!');
          this.refreshData();
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
        const dataToAdd: Omit<Link, 'id' | 'createdAt' | 'updatedAt'> = {
          name: newLinkData.name,
          url: newLinkData.url,
          collectionId: this.currentCollectionId!,
          userId: this.currentUserId!,
          ...(newLinkData.description !== null && newLinkData.description !== undefined ? { description: newLinkData.description } : {})
        };
        this.firebaseService.addLink(this.currentUserId!, this.currentCollectionId!, dataToAdd).then(() => {
          console.log('Link added successfully!');
          this.refreshData();
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
          this.refreshData();
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
          this.refreshData();
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
          this.refreshData();
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
          this.refreshData();
        }).catch(error => console.error('Error deleting link:', error));
      },
      reject: () => {
        // Do nothing on reject
      }
    });
  }

  private refreshData(): void {
    if (this.currentUserId) {
      const userId = this.currentUserId; // Introduce local constant for type narrowing
      if (this.currentCollectionId) {
        const collectionId = this.currentCollectionId; // Introduce local constant for type narrowing
        this.collections$ = this.firebaseService.getSubCollections(userId, collectionId);
        this.links$ = this.firebaseService.getLinks(userId, collectionId);
      } else {
        // If at root, show only top-level collections
        this.collections$ = this.firebaseService.getSubCollections(userId, null);
        this.links$ = of([]); // No links at the root level
      }
    }
  }
}
