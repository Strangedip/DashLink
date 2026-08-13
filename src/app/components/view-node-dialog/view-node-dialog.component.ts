import { Component, OnInit, Inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { DynamicDialogRef, DynamicDialogConfig } from '../../ui/dialog';
import { BtnComponent } from '../../ui/btn.component';
import { IconComponent } from '../../ui/icon.component';

import { Node, CustomField } from '../../models/data.model';
import { CloudinaryService } from '../../services/cloudinary.service';
import { ShareService } from '../../services/share.service';
import { ToastService } from '../../services/toast.service';

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

  constructor(
    public ref: DynamicDialogRef,
    @Inject(DynamicDialogConfig) public config: DynamicDialogConfig,
    private datePipe: DatePipe,
    private cloudinaryService: CloudinaryService,
    private shareService: ShareService,
    private toastService: ToastService
  ) { }

  ngOnInit(): void {
    if (this.config.data && this.config.data.node) {
      this.node = this.config.data.node;
      this.primaryUrl = this.shareService.primaryUrlFromNode(this.node);
      this.processCustomFields();
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
    const htmlRegex = /<\/?[a-z][\s\S]*>/i;
    return htmlRegex.test(content);
  }

  getDescriptionHtml(): string {
    return this.sanitizeHtml(this.node.description);
  }

  getCustomFieldHtml(value: unknown): string {
    return this.sanitizeHtml(value as string);
  }

  private sanitizeHtml(html: string | undefined | null): string {
    if (!html) return '';
    return html;
  }

  getBannerUrl(imageUrl: string): string {
    return this.cloudinaryService.getHeroUrl(imageUrl);
  }

  getDetailImageUrl(imageUrl: string): string {
    return this.cloudinaryService.getDetailUrl(imageUrl);
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
