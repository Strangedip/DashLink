import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

// PrimeNG Imports
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { MenuModule } from 'primeng/menu';
import { MenuItem } from 'primeng/api';
import { ConfirmPopupModule } from 'primeng/confirmpopup';
import { ConfirmationService } from 'primeng/api';

import { Link } from '../../models/data.model';

@Component({
  selector: 'app-link-card',
  standalone: true,
  imports: [
    CommonModule,
    CardModule,
    ButtonModule,
    MenuModule,
    ConfirmPopupModule
  ],
  providers: [ConfirmationService],
  templateUrl: './link-card.component.html',
  styleUrl: './link-card.component.scss'
})
export class LinkCardComponent {
  @Input() link!: Link;
  @Output() editLink = new EventEmitter<Link>();
  @Output() deleteLink = new EventEmitter<string>();

  menuItems: MenuItem[] = [];

  constructor(private confirmationService: ConfirmationService) { }

  ngOnInit(): void {
    this.menuItems = [
      { label: 'Open Link', icon: 'pi pi-external-link', command: () => this.onView() },
      { label: 'Edit', icon: 'pi pi-pencil', command: () => this.onEdit() },
      { label: 'Delete', icon: 'pi pi-trash', command: (event:any) => this.confirmDelete(event) }
    ];
  }

  onView(): void {
    window.open(this.link.url, '_blank');
  }

  onEdit(): void {
    this.editLink.emit(this.link);
  }

  confirmDelete(event: any): void {
    this.confirmationService.confirm({
      target: event.target,
      message: 'Are you sure you want to delete this link?',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.deleteLink.emit(this.link.id);
      },
      reject: () => {
        // Do nothing on reject
      }
    });
  }
}
