import { Component, OnInit, Inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { DynamicDialogRef, DynamicDialogConfig } from 'primeng/dynamicdialog';
import { ButtonModule } from 'primeng/button';
import { AvatarModule } from 'primeng/avatar';
import { RatingModule } from 'primeng/rating';
import { FormsModule } from '@angular/forms';
import { WorkspaceNode, WorkspaceNodeField } from '../../../models/workspace.model';
import { CloudinaryService } from '../../../services/cloudinary.service';

@Component({
  selector: 'app-view-workspace-node-dialog',
  standalone: true,
  imports: [CommonModule, ButtonModule, AvatarModule, RatingModule, FormsModule],
  providers: [DatePipe],
  templateUrl: './view-workspace-node-dialog.component.html',
  styleUrl: './view-workspace-node-dialog.component.scss'
})
export class ViewWorkspaceNodeDialogComponent implements OnInit {
  node!: WorkspaceNode;
  imageUrl: string | null = null;
  displayFields: WorkspaceNodeField[] = [];

  constructor(
    public ref: DynamicDialogRef,
    @Inject(DynamicDialogConfig) public config: DynamicDialogConfig,
    private datePipe: DatePipe,
    private cloudinaryService: CloudinaryService
  ) {}

  ngOnInit(): void {
    if (this.config.data?.node) {
      this.node = this.config.data.node;
      this.processFields();
    }
  }

  private processFields(): void {
    if (!this.node.fields) return;
    for (const field of this.node.fields) {
      if (field.fieldType === 'image-upload' && field.value && !this.imageUrl) {
        this.imageUrl = field.value;
      }
      if (field.value !== null && field.value !== undefined && field.value !== '') {
        this.displayFields.push(field);
      }
    }
  }

  get creatorInitial(): string {
    return (this.node.creatorName || 'U').charAt(0).toUpperCase();
  }

  getBannerUrl(imageUrl: string): string {
    return this.cloudinaryService.getHeroUrl(imageUrl);
  }

  getDetailImageUrl(imageUrl: string): string {
    return this.cloudinaryService.getDetailUrl(imageUrl);
  }

  getThumbnailUrl(imageUrl: string): string {
    return this.cloudinaryService.getThumbnailUrl(imageUrl);
  }

  get createdDate(): string {
    return this.formatTimestamp(this.node.createdAt);
  }

  get updatedDate(): string {
    return this.formatTimestamp(this.node.updatedAt);
  }

  formatTimestamp(ts: any): string {
    if (!ts) return '';
    if (typeof ts === 'object' && 'toDate' in ts && typeof ts.toDate === 'function') {
      return this.datePipe.transform(ts.toDate(), 'MMM d, y, h:mm a') || '';
    }
    if (ts instanceof Date) {
      return this.datePipe.transform(ts, 'MMM d, y, h:mm a') || '';
    }
    return String(ts);
  }

  formatFieldDate(value: any): string {
    if (!value) return '';
    if (typeof value === 'object' && 'toDate' in value && typeof value.toDate === 'function') {
      return this.datePipe.transform(value.toDate(), 'MMM d, y') || '';
    }
    if (value instanceof Date) {
      return this.datePipe.transform(value, 'MMM d, y') || '';
    }
    return String(value);
  }

  formatFieldDateTime(value: any): string {
    if (!value) return '';
    if (typeof value === 'object' && 'toDate' in value && typeof value.toDate === 'function') {
      return this.datePipe.transform(value.toDate(), 'MMM d, y, h:mm a') || '';
    }
    if (value instanceof Date) {
      return this.datePipe.transform(value, 'MMM d, y, h:mm a') || '';
    }
    return String(value);
  }

  getFieldIcon(type: string): string {
    const icons: Record<string, string> = {
      'text': 'pi pi-align-left',
      'long-text': 'pi pi-align-justify',
      'number': 'pi pi-hashtag',
      'url': 'pi pi-link',
      'email': 'pi pi-envelope',
      'phone': 'pi pi-phone',
      'date': 'pi pi-calendar',
      'datetime': 'pi pi-clock',
      'image-upload': 'pi pi-upload',
      'checkbox': 'pi pi-check-square',
      'dropdown': 'pi pi-list',
      'color': 'pi pi-palette',
      'rating': 'pi pi-star',
    };
    return icons[type] || 'pi pi-tag';
  }

  onClose(): void {
    this.ref.close();
  }
}
