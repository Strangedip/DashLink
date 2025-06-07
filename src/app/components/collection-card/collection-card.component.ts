import { Component, Input, Output, EventEmitter, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';

// PrimeNG Imports
import { MenuItem } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { MenuModule } from 'primeng/menu';

import { Collection } from '../../models/data.model';

@Component({
  selector: 'app-collection-card',
  standalone: true,
  imports: [
    CommonModule,
    ButtonModule,
    MenuModule
  ],
  providers: [],
  templateUrl: './collection-card.component.html',
  styleUrl: './collection-card.component.scss'
})
export class CollectionCardComponent implements OnInit {
  @Input() collection!: Collection;
  @Output() viewCollection = new EventEmitter<string>();
  @Output() editCollection = new EventEmitter<Collection>();
  @Output() deleteCollectionRequest = new EventEmitter<{ id: string, target: HTMLElement }>();

  @ViewChild('deleteButton') deleteButton!: ElementRef;

  menuItems: MenuItem[] = [];

  constructor() { }

  ngOnInit(): void {
    this.menuItems = [
      { label: 'Edit', icon: 'pi pi-pencil', command: (event) => { if (event.originalEvent) event.originalEvent.stopPropagation(); this.onEdit(); } },
      { label: 'Delete', icon: 'pi pi-trash', command: (event) => { if (event.originalEvent) event.originalEvent.stopPropagation(); this.onDeleteRequest(); } }
    ];
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
}
