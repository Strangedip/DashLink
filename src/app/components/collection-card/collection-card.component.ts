import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

// PrimeNG Imports
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { MenuModule } from 'primeng/menu';
import { MenuItem } from 'primeng/api';
import { ConfirmPopupModule } from 'primeng/confirmpopup';
import { ConfirmationService } from 'primeng/api';

import { Collection } from '../../models/data.model';

@Component({
  selector: 'app-collection-card',
  standalone: true,
  imports: [
    CommonModule,
    CardModule,
    ButtonModule,
    MenuModule,
    ConfirmPopupModule
  ],
  providers: [ConfirmationService],
  templateUrl: './collection-card.component.html',
  styleUrl: './collection-card.component.scss'
})
export class CollectionCardComponent {
  @Input() collection!: Collection;
  @Output() viewCollection = new EventEmitter<string>();
  @Output() editCollection = new EventEmitter<Collection>();
  @Output() deleteCollection = new EventEmitter<string>();

  menuItems: MenuItem[] = [];

  constructor(private confirmationService: ConfirmationService) { }

  ngOnInit(): void {
    console.log("&&", this.collection)
    this.menuItems = [
      { label: 'Edit', icon: 'pi pi-pencil', command: () => this.onEdit() },
      { label: 'Delete', icon: 'pi pi-trash', command: (event) => this.confirmDelete(event) }
    ];
  }

  onView(): void {
    this.viewCollection.emit(this.collection.id);
  }

  onEdit(): void {
    this.editCollection.emit(this.collection);
  }

  confirmDelete(event: any): void {
    this.confirmationService.confirm({
      target: event.target,
      message: 'Are you sure you want to delete this collection?',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.deleteCollection.emit(this.collection.id);
      },
      reject: () => {
        // Do nothing on reject
      }
    });
  }
}
