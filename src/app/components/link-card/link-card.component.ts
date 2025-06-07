import { Component, Input, Output, EventEmitter, OnInit, ViewChild, ElementRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';

// PrimeNG Imports
import { MenuItem } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { MenuModule, Menu } from 'primeng/menu';

import { Link } from '../../models/data.model';
import { MenuService } from '../../services/menu.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-link-card',
  standalone: true,
  imports: [
    CommonModule,
    ButtonModule,
    MenuModule
  ],
  providers: [],
  templateUrl: './link-card.component.html',
  styleUrl: './link-card.component.scss'
})
export class LinkCardComponent implements OnInit, OnDestroy {
  @Input() link!: Link;
  @Output() editLink = new EventEmitter<Link>();
  @Output() deleteLinkRequest = new EventEmitter<{ id: string, target: HTMLElement }>();

  @ViewChild('deleteButton') deleteButton!: ElementRef;
  @ViewChild('menu') menu!: Menu;

  menuItems: MenuItem[] = [];
  private menuSubscription: Subscription = new Subscription();

  constructor(private menuService: MenuService) { }

  ngOnInit(): void {
    this.menuItems = [
      { label: 'Open Link', icon: 'pi pi-external-link', command: () => this.onView() },
      { label: 'Edit', icon: 'pi pi-pencil', command: (event) => { if (event.originalEvent) event.originalEvent.stopPropagation(); this.onEdit(); } },
      { label: 'Delete', icon: 'pi pi-trash', command: (event) => { if (event.originalEvent) event.originalEvent.stopPropagation(); this.onDeleteRequest(); } }
    ];

    this.menuSubscription = this.menuService.menuOpened$.subscribe(openedMenuId => {
      if (openedMenuId !== this.link.id && this.menu.visible) {
        this.menu.hide();
      }
    });
  }

  ngOnDestroy(): void {
    this.menuSubscription.unsubscribe();
  }

  onView(): void {
    window.open(this.link.url, '_blank');
  }

  onEdit(): void {
    this.editLink.emit(this.link);
  }

  onDeleteRequest(): void {
    this.deleteLinkRequest.emit({ id: this.link.id!, target: this.deleteButton.nativeElement });
  }

  onMenuToggle(event: Event): void {
    event.stopPropagation();
    if (!this.menu.visible) {
      this.menuService.openMenu(this.link.id!);
    }
    this.menu.toggle(event);
  }
}
