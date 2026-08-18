import { Component, Input, Output, EventEmitter, OnInit, OnChanges, ViewChild, ElementRef, OnDestroy, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MenuItem } from '../../ui/menu-item';
import { BtnComponent } from '../../ui/btn.component';
import { MenuComponent } from '../../ui/menu.component';
import { IconComponent } from '../../ui/icon.component';
import { Collection } from '../../models/data.model';
import { MenuService } from '../../services/menu.service';
import { ShareService } from '../../services/share.service';
import { Subscription } from 'rxjs';

@Component({
    selector: 'app-collection-card',
    imports: [CommonModule, BtnComponent, MenuComponent, IconComponent],
    templateUrl: './collection-card.component.html',
    changeDetection: ChangeDetectionStrategy.Eager,
    styleUrl: './collection-card.component.scss'
})
export class CollectionCardComponent implements OnInit, OnChanges, OnDestroy {
  @Input() collection!: Pick<Collection, 'id' | 'name'> & { description?: string | null };
  @Input() showPin = false;
  @Input() pinned = false;
  @Input() canShare = true;
  @Input() workspaceId: string | null = null;
  @Output() viewCollection = new EventEmitter<string | undefined>();
  @Output() editCollection = new EventEmitter<Pick<Collection, 'id' | 'name'> & { description?: string | null }>();
  @Output() deleteCollectionRequest = new EventEmitter<{ id: string, target: HTMLElement }>();
  @Output() pinToggle = new EventEmitter<string>();

  @ViewChild('deleteButton', { read: ElementRef }) deleteButton!: ElementRef<HTMLElement>;
  @ViewChild('menu') menu!: MenuComponent;

  menuItems: MenuItem[] = [];
  sharing = false;
  private menuSubscription: Subscription = new Subscription();

  constructor(
    private menuService: MenuService,
    private shareService: ShareService
  ) { }

  ngOnInit(): void {
    this.menuSubscription = this.menuService.menuOpened$.subscribe(openedMenuId => {
      if (openedMenuId !== this.collection.id && this.menu?.visible) {
        this.menu.hide();
      }
    });
  }

  ngOnChanges(): void {
    this.rebuildMenu();
  }

  ngOnDestroy(): void {
    this.menuSubscription.unsubscribe();
  }

  onView(): void {
    this.viewCollection.emit(this.collection.id);
  }

  onEdit(): void {
    this.editCollection.emit(this.collection);
  }

  onDeleteRequest(): void {
    this.deleteCollectionRequest.emit({ id: this.collection.id!, target: this.deleteButton.nativeElement });
  }

  onPin(event: Event): void {
    event.stopPropagation();
    if (this.collection.id) {
      this.pinToggle.emit(this.collection.id);
    }
  }

  async shareCollection(event?: Event): Promise<void> {
    event?.stopPropagation();
    if (!this.canShare || !this.collection.id || this.sharing) {
      return;
    }
    this.sharing = true;
    try {
      await this.shareService.shareDashLink({
        kind: 'collection',
        origin: this.workspaceId ? 'workspace' : 'personal',
        title: this.collection.name,
        text: this.collection.description || this.collection.name,
        collectionId: this.collection.id,
        workspaceId: this.workspaceId
      });
    } finally {
      this.sharing = false;
    }
  }

  onMenuToggle(event: Event): void {
    event.stopPropagation();
    if (!this.menu?.visible) {
      this.menuService.openMenu(this.collection.id!);
    }
    this.menu.toggle(event);
  }

  private rebuildMenu(): void {
    this.menuItems = [
      ...(this.canShare ? [{
        label: 'Share',
        icon: 'share-alt',
        command: (event?: { originalEvent?: Event }) => {
          event?.originalEvent?.stopPropagation();
          void this.shareCollection();
        }
      }] : []),
      { label: 'Edit', icon: 'pencil', command: (event?: { originalEvent?: Event }) => { event?.originalEvent?.stopPropagation(); this.onEdit(); } },
      { label: 'Delete', icon: 'trash', command: (event?: { originalEvent?: Event }) => { event?.originalEvent?.stopPropagation(); this.onDeleteRequest(); } }
    ];
  }
}
