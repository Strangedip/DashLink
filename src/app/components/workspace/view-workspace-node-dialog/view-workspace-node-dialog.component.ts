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
import { LinkPreviewService } from '../../../services/link-preview.service';

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
  sharing = false;
  canShare = true;

  constructor(
    public ref: DynamicDialogRef,
    @Inject(DynamicDialogConfig) public config: DynamicDialogConfig,
    private datePipe: DatePipe,
    private cloudinaryService: CloudinaryService,
    private shareService: ShareService,
    private linkPreview: LinkPreviewService
  ) {}

  ngOnInit(): void {
    if (this.config.data?.node) {
      this.node = this.config.data.node;
      this.canShare = this.config.data.canShare !== false;
      this.primaryUrl = this.shareService.primaryUrlFromWorkspaceNode(this.node);
      this.processFields();
      this.linkPreview.displayImage(this.imageUrl, this.primaryUrl).subscribe(url => {
        this.imageUrl = url;
      });
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

  get createdDate(): string {
    return this.formatTimestamp(this.node.createdAt, 'MMM d, y');
  }

  get updatedDate(): string {
    return this.formatTimestamp(this.node.updatedAt, 'MMM d, y');
  }

  fieldHref(value: unknown): string | null {
    return this.shareService.hrefFromValue(value);
  }

  formatTimestamp(ts: any, format = 'MMM d, y'): string {
    if (!ts) return '';
    if (typeof ts === 'object' && 'toDate' in ts && typeof ts.toDate === 'function') {
      return this.datePipe.transform(ts.toDate(), format) || '';
    }
    if (ts instanceof Date) {
      return this.datePipe.transform(ts, format) || '';
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

  async shareLink(): Promise<void> {
    if (!this.canShare || this.sharing) {
      return;
    }
    this.sharing = true;
    try {
      await this.shareService.shareDashLink({
        kind: 'node',
        origin: 'workspace',
        title: this.node.name,
        text: this.node.description || this.node.name,
        workspaceId: this.node.workspaceId,
        collectionId: this.node.collectionId || null,
        nodeId: this.node.id
      });
    } finally {
      this.sharing = false;
    }
  }
}
