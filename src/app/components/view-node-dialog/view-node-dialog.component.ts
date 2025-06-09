import { Component, OnInit, Inject } from '@angular/core';
import { CommonModule, KeyValuePipe, DatePipe } from '@angular/common';
import { DynamicDialogRef, DynamicDialogConfig } from 'primeng/dynamicdialog';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { ImageModule } from 'primeng/image';

import { Node, CustomField } from '../../models/data.model';

@Component({
  selector: 'app-view-node-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ButtonModule,
    CardModule,
    KeyValuePipe,
    ImageModule
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

  formatDate(timestamp: any): string | null {
    if (timestamp && typeof timestamp.toDate === 'function') {
      const date = timestamp.toDate();
      return this.datePipe.transform(date, 'MM/dd/yyyy');
    }
    return timestamp;
  }

  onClose(): void {
    this.ref.close();
  }
} 