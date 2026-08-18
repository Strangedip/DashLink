import { Component, OnInit, Inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { DynamicDialogRef, DynamicDialogConfig } from '../../ui/dialog';
import { BtnComponent } from '../../ui/btn.component';
import { IconComponent } from '../../ui/icon.component';

import { Node, CustomField } from '../../models/data.model';
import { CloudinaryService } from '../../services/cloudinary.service';
import { ShareService } from '../../services/share.service';
import { LinkPreviewService } from '../../services/link-preview.service';

@Component({
    selector: 'app-view-node-dialog',
    imports: [
        CommonModule,
        BtnComponent,
        IconComponent
    ],
    providers: [DatePipe],
    templateUrl: './view-node-dialog.component.html',
    changeDetection: ChangeDetectionStrategy.Eager,
    styleUrl: './view-node-dialog.component.scss'
})
export class ViewNodeDialogComponent implements OnInit {
  node!: Node;
  imageUrl: string | null = null;
  displayCustomFields: CustomField[] = [];
  primaryUrl: string | null = null;
  sharing = false;

  constructor(
    public ref: DynamicDialogRef,
    @Inject(DynamicDialogConfig) public config: DynamicDialogConfig,
    private datePipe: DatePipe,
    private cloudinaryService: CloudinaryService,
    private shareService: ShareService,
    private linkPreview: LinkPreviewService
  ) { }

  ngOnInit(): void {
    if (this.config.data && this.config.data.node) {
      this.node = this.config.data.node;
      this.primaryUrl = this.shareService.primaryUrlFromNode(this.node);
      this.processCustomFields();
      this.linkPreview.displayImage(this.imageUrl, this.primaryUrl).subscribe(url => {
        this.imageUrl = url;
      });
    }
  }

  private processCustomFields(): void {
    if (this.node.customFields) {
      this.node.customFields.forEach(field => {
        this.displayCustomFields.push(field);

        if (field.fieldType === 'imageUrl' && typeof field.fieldValue === 'string' && (field.fieldValue.startsWith('http://') || field.fieldValue.startsWith('https://'))) {
          if (!this.imageUrl) {
            this.imageUrl = field.fieldValue;
          }
        }
      });
    }
  }

  formatDate(timestamp: unknown): string | null {
    if (timestamp && typeof timestamp === 'object' && 'toDate' in timestamp && typeof timestamp.toDate === 'function') {
      const date = (timestamp as any).toDate();
      return this.datePipe.transform(date, 'MM/dd/yyyy');
    }
    return timestamp as string;
  }

  isHtmlContent(content: unknown): boolean {
    if (typeof content !== 'string') return false;
    return /<\/?[a-z][\s\S]*>/i.test(content);
  }

  getBannerUrl(imageUrl: string): string {
    return this.cloudinaryService.getHeroUrl(imageUrl);
  }

  getDetailImageUrl(imageUrl: string): string {
    return this.cloudinaryService.getDetailUrl(imageUrl);
  }

  fieldHref(value: unknown): string | null {
    return this.shareService.hrefFromValue(value);
  }

  onClose(): void {
    this.ref.close();
  }

  async shareLink(): Promise<void> {
    if (this.sharing) {
      return;
    }
    this.sharing = true;
    try {
      await this.shareService.shareDashLink({
        kind: 'node',
        origin: 'personal',
        title: this.node.name,
        text: this.node.description || this.node.name,
        collectionId: this.node.collectionId,
        nodeId: this.node.id
      });
    } finally {
      this.sharing = false;
    }
  }
}
