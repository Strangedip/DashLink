import { Component, Input, Output, EventEmitter, OnInit, ViewChild, OnDestroy, ChangeDetectionStrategy } from '@angular/core';
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
import { ToastService } from '../../../services/toast.service';
import { Subscription } from 'rxjs';

@Component({
    selector: 'app-workspace-node-card',
    imports: [CommonModule, BtnComponent, MenuComponent, AvatarComponent, IconComponent],
    providers: [DatePipe],
    templateUrl: './workspace-node-card.component.html',
    changeDetection: ChangeDetectionStrategy.Eager,
    styleUrl: './workspace-node-card.component.scss'
})
export class WorkspaceNodeCardComponent implements OnInit, OnDestroy {
  @Input() node!: WorkspaceNode;
  @Input() isOwner: boolean = false;
  @Input() currentUserId: string = '';
  @Output() nodeClicked = new EventEmitter<WorkspaceNode>();
  @Output() editNode = new EventEmitter<WorkspaceNode>();
  @Output() deleteNodeRequest = new EventEmitter<{ id: string }>();

  @ViewChild('menu') menu!: MenuComponent;

  menuItems: MenuItem[] = [];
  primaryUrl: string | null = null;
  private menuSubscription: Subscription = new Subscription();

  constructor(
    private menuService: MenuService,
    private datePipe: DatePipe,
    private cloudinaryService: CloudinaryService,
    private shareService: ShareService,
    private toastService: ToastService
  ) {}

  ngOnInit(): void {
    this.buildMenuItems();
    this.menuSubscription = this.menuService.menuOpened$.subscribe(openedMenuId => {
      if (openedMenuId !== this.node.id && this.menu?.visible) {
        this.menu.hide();
      }
    });
  }

  ngOnDestroy(): void {
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
    return this.menuItems.length > 0 || !!this.primaryUrl;
  }

  get imageUrl(): string | null {
    const imageField = this.node.fields?.find(f =>
      f.fieldType === 'image-upload' && f.value
    );
    return imageField?.value || null;
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
    const result = await this.shareService.share({
      title: this.node.name,
      text: this.node.description || this.node.name,
      url: this.primaryUrl || undefined
    });
    if (result === 'copied') {
      this.toastService.showSuccess('Copied', 'Link copied to clipboard.');
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
