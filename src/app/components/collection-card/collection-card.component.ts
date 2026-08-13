import { Component, Input, Output, EventEmitter, OnInit, ViewChild, ElementRef, OnDestroy, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MenuItem } from '../../ui/menu-item';
import { BtnComponent } from '../../ui/btn.component';
import { MenuComponent } from '../../ui/menu.component';
import { IconComponent } from '../../ui/icon.component';
import { Collection } from '../../models/data.model';
import { MenuService } from '../../services/menu.service';
import { Subscription } from 'rxjs';

@Component({
    selector: 'app-collection-card',
    imports: [CommonModule, BtnComponent, MenuComponent, IconComponent],
    templateUrl: './collection-card.component.html',
    changeDetection: ChangeDetectionStrategy.Eager,
    styleUrl: './collection-card.component.scss'
})
export class CollectionCardComponent implements OnInit, OnDestroy {
  @Input() collection!: Pick<Collection, 'id' | 'name'> & { description?: string | null };
  @Input() showPin = false;
  @Input() pinned = false;
  @Output() viewCollection = new EventEmitter<string | undefined>();
  @Output() editCollection = new EventEmitter<Pick<Collection, 'id' | 'name'> & { description?: string | null }>();
  @Output() deleteCollectionRequest = new EventEmitter<{ id: string, target: HTMLElement }>();
  @Output() pinToggle = new EventEmitter<string>();

  @ViewChild('deleteButton', { read: ElementRef }) deleteButton!: ElementRef<HTMLElement>;
  @ViewChild('menu') menu!: MenuComponent;

  menuItems: MenuItem[] = [];
  private menuSubscription: Subscription = new Subscription();

  constructor(private menuService: MenuService) { }

  ngOnInit(): void {
    this.menuItems = [
      { label: 'Edit', icon: 'pencil', command: (event) => { event?.originalEvent?.stopPropagation(); this.onEdit(); } },
      { label: 'Delete', icon: 'trash', command: (event) => { event?.originalEvent?.stopPropagation(); this.onDeleteRequest(); } }
    ];

    this.menuSubscription = this.menuService.menuOpened$.subscribe(openedMenuId => {
      if (openedMenuId !== this.collection.id && this.menu?.visible) {
        this.menu.hide();
      }
    });
  }

  ngOnDestroy(): void {
    this.menuSubscription.unsubscribe();
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

  onPin(event: Event): void {
    event.stopPropagation();
    if (this.collection.id) {
      this.pinToggle.emit(this.collection.id);
    }
  }

  onMenuToggle(event: Event): void {
    event.stopPropagation();
    if (!this.menu?.visible) {
      this.menuService.openMenu(this.collection.id!);
    }
    this.menu.toggle(event);
  }
}
