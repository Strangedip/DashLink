import { Component, Input, Output, EventEmitter, OnInit, ViewChild, ElementRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';

// PrimeNG Imports
import { MenuItem } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { MenuModule, Menu } from 'primeng/menu';
import { TooltipModule } from 'primeng/tooltip';

import { Node } from '../../models/data.model';
import { MenuService } from '../../services/menu.service';
import { CloudinaryService } from '../../services/cloudinary.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-node-card',
  standalone: true,
  imports: [
    CommonModule,
    ButtonModule,
    MenuModule,
    TooltipModule
  ],
  providers: [],
  templateUrl: './node-card.component.html',
  styleUrl: './node-card.component.scss'
})
export class NodeCardComponent implements OnInit, OnDestroy {
  @Input() node!: Node;
  @Output() editNode = new EventEmitter<Node>();
  @Output() deleteNodeRequest = new EventEmitter<{ id: string, target: HTMLElement }>();
  @Output() nodeClicked = new EventEmitter<Node>();

  @ViewChild('deleteButton') deleteButton!: ElementRef;
  @ViewChild('menu') menu!: Menu;

  menuItems: MenuItem[] = [];
  nodeImageUrl: string | null = null;
  private menuSubscription: Subscription = new Subscription();

  constructor(
    private menuService: MenuService,
    private cloudinaryService: CloudinaryService
  ) { }

  ngOnInit(): void {
    this.menuItems = [
      { label: 'Edit', icon: 'pi pi-pencil', command: (event) => { if (event.originalEvent) event.originalEvent.stopPropagation(); this.onEdit(); } },
      { label: 'Delete', icon: 'pi pi-trash', command: (event) => { if (event.originalEvent) event.originalEvent.stopPropagation(); this.onDeleteRequest(); } }
    ];

    this.extractNodeImage();

    this.menuSubscription = this.menuService.menuOpened$.subscribe(openedMenuId => {
      if (openedMenuId !== this.node.id && this.menu.visible) {
        this.menu.hide();
      }
    });
  }

  /** Extract the first image URL from custom fields */
  private extractNodeImage(): void {
    if (this.node.customFields && this.node.customFields.length > 0) {
      const imageField = this.node.customFields.find(field => field.fieldType === 'imageUrl');
      if (imageField && typeof imageField.fieldValue === 'string' && imageField.fieldValue) {
        this.nodeImageUrl = imageField.fieldValue;
      }
    }
  }

  /** Get thumbnail URL for Cloudinary image (optimized for card display) */
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

  onMenuToggle(event: Event): void {
    event.stopPropagation();
    if (!this.menu.visible) {
      this.menuService.openMenu(this.node.id!);
    }
    this.menu.toggle(event);
  }
}
