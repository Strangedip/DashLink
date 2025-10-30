import { Component, OnInit, Inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { DynamicDialogRef, DynamicDialogConfig } from 'primeng/dynamicdialog';
import { ButtonModule } from 'primeng/button';

import { Node, CustomField } from '../../models/data.model';

@Component({
  selector: 'app-view-node-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ButtonModule
  ],
  providers: [DatePipe],
  templateUrl: './view-node-dialog.component.html',
  styleUrl: './view-node-dialog.component.scss'
})
export class ViewNodeDialogComponent implements OnInit {
  node!: Node;
  imageUrl: string | null = null;
  displayCustomFields: CustomField[] = [];

  constructor(
    public ref: DynamicDialogRef,
    @Inject(DynamicDialogConfig) public config: DynamicDialogConfig,
    private datePipe: DatePipe
  ) { }

  ngOnInit(): void {
    if (this.config.data && this.config.data.node) {
      this.node = this.config.data.node;
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
    // Basic sanitization - you might want to use DomSanitizer for production
    return html;
  }

  onClose(): void {
    this.ref.close();
  }
} 