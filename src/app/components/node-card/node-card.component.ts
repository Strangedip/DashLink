import { Component, Input, Output, EventEmitter, OnInit, ViewChild, ElementRef, OnDestroy, ChangeDetectionStrategy, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { MenuItem } from '../../ui/menu-item';
import { BtnComponent } from '../../ui/btn.component';
import { MenuComponent } from '../../ui/menu.component';
import { IconComponent } from '../../ui/icon.component';
import { Node } from '../../models/data.model';
import { MenuService } from '../../services/menu.service';
import { CloudinaryService } from '../../services/cloudinary.service';
import { ShareService } from '../../services/share.service';
import { LinkPreviewService } from '../../services/link-preview.service';
import { Subscription } from 'rxjs';

@Component({
    selector: 'app-node-card',
    imports: [CommonModule, BtnComponent, MenuComponent, IconComponent],
    templateUrl: './node-card.component.html',
    changeDetection: ChangeDetectionStrategy.Eager,
    styleUrl: './node-card.component.scss'
})
export class NodeCardComponent implements OnInit, OnDestroy {
  @Input() node!: Node;
  @Output() editNode = new EventEmitter<Node>();
  @Output() deleteNodeRequest = new EventEmitter<{ id: string, target: HTMLElement }>();
  @Output() nodeClicked = new EventEmitter<Node>();

  @ViewChild('deleteButton', { read: ElementRef }) deleteButton!: ElementRef<HTMLElement>;
  @ViewChild('menu') menu!: MenuComponent;

  menuItems: MenuItem[] = [];
  nodeImageUrl: string | null = null;
  primaryUrl: string | null = null;
  sharing = false;
  private destroyRef = inject(DestroyRef);
  private menuSubscription: Subscription = new Subscription();

  constructor(
    private menuService: MenuService,
    private cloudinaryService: CloudinaryService,
    private shareService: ShareService,
    private linkPreview: LinkPreviewService
  ) { }

  ngOnInit(): void {
    this.primaryUrl = this.shareService.primaryUrlFromNode(this.node);
    this.menuItems = [
      ...(this.primaryUrl ? [{
        label: 'Open link',
        icon: 'external-link',
        command: (event: { originalEvent?: Event } | undefined) => { event?.originalEvent?.stopPropagation(); this.openLink(); }
      }] : []),
      {
        label: 'Share',
        icon: 'share-alt',
        command: (event: { originalEvent?: Event } | undefined) => { event?.originalEvent?.stopPropagation(); void this.shareLink(); }
      },
      { label: 'Edit', icon: 'pencil', command: (event) => { event?.originalEvent?.stopPropagation(); this.onEdit(); } },
      { label: 'Delete', icon: 'trash', command: (event) => { event?.originalEvent?.stopPropagation(); this.onDeleteRequest(); } }
    ];

    this.extractNodeImage();
    this.linkPreview.displayImage(this.nodeImageUrl, this.primaryUrl)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(url => { this.nodeImageUrl = url; });

    this.menuSubscription = this.menuService.menuOpened$.subscribe(openedMenuId => {
      if (openedMenuId !== this.node.id && this.menu?.visible) {
        this.menu.hide();
      }
    });
  }

  private extractNodeImage(): void {
    if (this.node.customFields && this.node.customFields.length > 0) {
      const imageField = this.node.customFields.find(field => field.fieldType === 'imageUrl');
      if (imageField && typeof imageField.fieldValue === 'string' && imageField.fieldValue) {
        this.nodeImageUrl = imageField.fieldValue;
      }
    }
  }

  getThumbnailUrl(imageUrl: string): string {
    return this.cloudinaryService.getThumbnailUrl(imageUrl);
  }

  ngOnDestroy(): void {
    this.menuSubscription.unsubscribe();
  }

  onView(): void {
    this.nodeClicked.emit(this.node);
  }

  onEdit(): void {
    this.editNode.emit(this.node);
  }

  onDeleteRequest(): void {
    this.deleteNodeRequest.emit({ id: this.node.id!, target: this.deleteButton.nativeElement });
  }

  openLink(event?: Event): void {
    event?.stopPropagation();
    if (this.primaryUrl) {
      this.shareService.open(this.primaryUrl);
    }
  }

  async shareLink(event?: Event): Promise<void> {
    event?.stopPropagation();
    if (this.sharing) {
      return;
    }
    this.sharing = true;
    try {
      await this.shareService.shareDashLink({
        kind: 'node',
        origin: 'personal',
        title: this.node.name,
        text: this.node.description || this.node.name,
        collectionId: this.node.collectionId,
        nodeId: this.node.id
      });
    } finally {
      this.sharing = false;
    }
  }

  onMenuToggle(event: Event): void {
    event.stopPropagation();
    if (!this.menu?.visible) {
      this.menuService.openMenu(this.node.id!);
    }
    this.menu.toggle(event);
  }
}
