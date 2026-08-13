import { Component, OnInit, Inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { DynamicDialogRef, DynamicDialogConfig } from '../../../ui/dialog';
import { BtnComponent } from '../../../ui/btn.component';
import { AvatarComponent } from '../../../ui/avatar.component';
import { RatingComponent } from '../../../ui/rating.component';
import { IconComponent } from '../../../ui/icon.component';
import { FormsModule } from '@angular/forms';
import { WorkspaceNode, WorkspaceNodeField } from '../../../models/workspace.model';
import { CloudinaryService } from '../../../services/cloudinary.service';
import { ShareService } from '../../../services/share.service';
import { ToastService } from '../../../services/toast.service';

@Component({
    selector: 'app-view-workspace-node-dialog',
    imports: [CommonModule, BtnComponent, AvatarComponent, RatingComponent, IconComponent, FormsModule],
    providers: [DatePipe],
    templateUrl: './view-workspace-node-dialog.component.html',
    changeDetection: ChangeDetectionStrategy.Eager,
    styleUrl: './view-workspace-node-dialog.component.scss'
})
export class ViewWorkspaceNodeDialogComponent implements OnInit {
  node!: WorkspaceNode;
  imageUrl: string | null = null;
  displayFields: WorkspaceNodeField[] = [];
  primaryUrl: string | null = null;

  constructor(
    public ref: DynamicDialogRef,
    @Inject(DynamicDialogConfig) public config: DynamicDialogConfig,
    private datePipe: DatePipe,
    private cloudinaryService: CloudinaryService,
    private shareService: ShareService,
    private toastService: ToastService
  ) {}

  ngOnInit(): void {
    if (this.config.data?.node) {
      this.node = this.config.data.node;
      this.primaryUrl = this.shareService.primaryUrlFromWorkspaceNode(this.node);
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
      'text': 'align-left',
      'long-text': 'align-justify',
      'number': 'hashtag',
      'url': 'link',
      'email': 'envelope',
      'phone': 'phone',
      'date': 'calendar',
      'datetime': 'clock',
      'image-upload': 'upload',
      'checkbox': 'check-square',
      'dropdown': 'list',
      'color': 'palette',
      'rating': 'star',
    };
    return icons[type] || 'tag';
  }

  onClose(): void {
    this.ref.close();
  }

  openLink(): void {
    if (this.primaryUrl) {
      this.shareService.open(this.primaryUrl);
    }
  }

  async shareLink(): Promise<void> {
    const result = await this.shareService.share({
      title: this.node.name,
      text: this.node.description || this.node.name,
      url: this.primaryUrl || undefined
    });
    if (result === 'copied') {
      this.toastService.showSuccess('Copied', 'Link copied to clipboard.');
    }
  }
}
