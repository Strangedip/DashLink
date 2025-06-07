import { Component, Input, Output, EventEmitter, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';

// PrimeNG Imports
import { MenuItem } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { MenuModule } from 'primeng/menu';

import { Link } from '../../models/data.model';

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
export class LinkCardComponent implements OnInit {
  @Input() link!: Link;
  @Output() editLink = new EventEmitter<Link>();
  @Output() deleteLinkRequest = new EventEmitter<{ id: string, target: HTMLElement }>();

  @ViewChild('deleteButton') deleteButton!: ElementRef;

  menuItems: MenuItem[] = [];

  constructor() { }

  ngOnInit(): void {
    this.menuItems = [
      { label: 'Open Link', icon: 'pi pi-external-link', command: () => this.onView() },
      { label: 'Edit', icon: 'pi pi-pencil', command: (event) => { if (event.originalEvent) event.originalEvent.stopPropagation(); this.onEdit(); } },
      { label: 'Delete', icon: 'pi pi-trash', command: (event) => { if (event.originalEvent) event.originalEvent.stopPropagation(); this.onDeleteRequest(); } }
    ];
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
}
