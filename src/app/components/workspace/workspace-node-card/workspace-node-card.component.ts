import { Component, Input, Output, EventEmitter, OnInit, ViewChild, OnDestroy } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { MenuItem } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { MenuModule, Menu } from 'primeng/menu';
import { TooltipModule } from 'primeng/tooltip';
import { AvatarModule } from 'primeng/avatar';
import { WorkspaceNode } from '../../../models/workspace.model';
import { MenuService } from '../../../services/menu.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-workspace-node-card',
  standalone: true,
  imports: [CommonModule, ButtonModule, MenuModule, TooltipModule, AvatarModule],
  providers: [DatePipe],
  templateUrl: './workspace-node-card.component.html',
  styleUrl: './workspace-node-card.component.scss'
})
export class WorkspaceNodeCardComponent implements OnInit, OnDestroy {
  @Input() node!: WorkspaceNode;
  @Input() isOwner: boolean = false;
  @Input() currentUserId: string = '';
  @Output() nodeClicked = new EventEmitter<WorkspaceNode>();
  @Output() editNode = new EventEmitter<WorkspaceNode>();
  @Output() deleteNodeRequest = new EventEmitter<{ id: string }>();

  @ViewChild('menu') menu!: Menu;

  menuItems: MenuItem[] = [];
  private menuSubscription: Subscription = new Subscription();

  constructor(private menuService: MenuService, private datePipe: DatePipe) {}

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
    const canEdit = this.isOwner || this.node.creatorId === this.currentUserId;
    const canDelete = this.isOwner;

    this.menuItems = [];
    if (canEdit) {
      this.menuItems.push({
        label: 'Edit', icon: 'pi pi-pencil',
        command: (event) => { event.originalEvent?.stopPropagation(); this.editNode.emit(this.node); }
      });
    }
    if (canDelete) {
      this.menuItems.push({
        label: 'Delete', icon: 'pi pi-trash',
        command: (event) => { event.originalEvent?.stopPropagation(); this.deleteNodeRequest.emit({ id: this.node.id! }); }
      });
    }
  }

  get hasActions(): boolean {
    return this.menuItems.length > 0;
  }

  get imageUrl(): string | null {
    const imageField = this.node.fields?.find(f =>
      f.fieldType === 'image-url' && f.value
    );
    return imageField?.value || null;
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

  onMenuToggle(event: Event): void {
    event.stopPropagation();
    if (!this.menu.visible) {
      this.menuService.openMenu(this.node.id!);
    }
    this.menu.toggle(event);
  }
}
