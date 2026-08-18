import { Component, Input, Output, EventEmitter, OnInit, OnChanges, ViewChild, OnDestroy, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { MenuItem } from '../../../ui/menu-item';
import { BtnComponent } from '../../../ui/btn.component';
import { MenuComponent } from '../../../ui/menu.component';
import { AvatarComponent } from '../../../ui/avatar.component';
import { IconComponent } from '../../../ui/icon.component';
import { WorkspaceNode } from '../../../models/workspace.model';
import { MenuService } from '../../../services/menu.service';
import { CloudinaryService } from '../../../services/cloudinary.service';
import { ShareService } from '../../../services/share.service';
import { LinkPreviewService } from '../../../services/link-preview.service';
import { Subscription } from 'rxjs';

@Component({
    selector: 'app-workspace-node-card',
    imports: [CommonModule, BtnComponent, MenuComponent, AvatarComponent, IconComponent],
    providers: [DatePipe],
    templateUrl: './workspace-node-card.component.html',
    changeDetection: ChangeDetectionStrategy.Eager,
    styleUrl: './workspace-node-card.component.scss'
})
export class WorkspaceNodeCardComponent implements OnInit, OnChanges, OnDestroy {
  @Input() node!: WorkspaceNode;
  @Input() isOwner: boolean = false;
  @Input() currentUserId: string = '';
  @Input() canShare = true;
  @Output() nodeClicked = new EventEmitter<WorkspaceNode>();
  @Output() editNode = new EventEmitter<WorkspaceNode>();
  @Output() deleteNodeRequest = new EventEmitter<{ id: string }>();

  @ViewChild('menu') menu!: MenuComponent;

  menuItems: MenuItem[] = [];
  primaryUrl: string | null = null;
  imageUrl: string | null = null;
  sharing = false;
  private menuSubscription: Subscription = new Subscription();
  private previewSub?: Subscription;

  constructor(
    private menuService: MenuService,
    private datePipe: DatePipe,
    private cloudinaryService: CloudinaryService,
    private shareService: ShareService,
    private linkPreview: LinkPreviewService
  ) {}

  ngOnInit(): void {
    this.menuSubscription = this.menuService.menuOpened$.subscribe(openedMenuId => {
      if (openedMenuId !== this.node.id && this.menu?.visible) {
        this.menu.hide();
      }
    });
  }

  ngOnChanges(): void {
    if (this.node) {
      this.buildMenuItems();
      const uploaded = this.node.fields?.find(field => field.fieldType === 'image-upload' && field.value)?.value || null;
      this.previewSub?.unsubscribe();
      this.previewSub = this.linkPreview.displayImage(uploaded, this.primaryUrl)
        .subscribe(url => { this.imageUrl = url; });
    }
  }

  ngOnDestroy(): void {
    this.previewSub?.unsubscribe();
    this.menuSubscription.unsubscribe();
  }

  private buildMenuItems(): void {
    this.primaryUrl = this.shareService.primaryUrlFromWorkspaceNode(this.node);
    const canEdit = this.isOwner || this.node.creatorId === this.currentUserId;
    const canDelete = this.isOwner;

    this.menuItems = [];
    if (this.primaryUrl) {
      this.menuItems.push({
        label: 'Open link', icon: 'external-link',
        command: (event) => { event?.originalEvent?.stopPropagation(); this.openLink(); }
      });
    }
    if (this.canShare) {
      this.menuItems.push({
        label: 'Share', icon: 'share-alt',
        command: (event) => { event?.originalEvent?.stopPropagation(); void this.shareLink(); }
      });
    }
    if (canEdit) {
      this.menuItems.push({
        label: 'Edit', icon: 'pencil',
        command: (event) => { event?.originalEvent?.stopPropagation(); this.editNode.emit(this.node); }
      });
    }
    if (canDelete) {
      this.menuItems.push({
        label: 'Delete', icon: 'trash',
        command: (event) => { event?.originalEvent?.stopPropagation(); this.deleteNodeRequest.emit({ id: this.node.id! }); }
      });
    }
  }

  get hasActions(): boolean {
    return this.menuItems.length > 0 || !!this.primaryUrl || this.canShare;
  }

  getThumbnailUrl(imageUrl: string): string {
    return this.cloudinaryService.getThumbnailUrl(imageUrl);
  }

  get createdDate(): string {
    return this.formatTimestamp(this.node.createdAt);
  }

  get creatorInitial(): string {
    return (this.node.creatorName || 'U').charAt(0).toUpperCase();
  }

  private formatTimestamp(ts: any): string {
    if (!ts) return '';
    if (typeof ts === 'object' && 'toDate' in ts) {
      return this.datePipe.transform(ts.toDate(), 'MMM d, y') || '';
    }
    if (ts instanceof Date) {
      return this.datePipe.transform(ts, 'MMM d, y') || '';
    }
    return '';
  }

  onClick(): void {
    this.nodeClicked.emit(this.node);
  }

  openLink(event?: Event): void {
    event?.stopPropagation();
    if (this.primaryUrl) {
      this.shareService.open(this.primaryUrl);
    }
  }

  async shareLink(event?: Event): Promise<void> {
    event?.stopPropagation();
    if (!this.canShare || this.sharing) {
      return;
    }
    this.sharing = true;
    try {
      await this.shareService.shareDashLink({
        kind: 'node',
        origin: 'workspace',
        title: this.node.name,
        text: this.node.description || this.node.name,
        workspaceId: this.node.workspaceId,
        collectionId: this.node.collectionId || null,
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
