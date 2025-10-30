import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DynamicDialogRef, DynamicDialogConfig } from 'primeng/dynamicdialog';
import { ButtonModule } from 'primeng/button';
import { InputTextarea } from 'primeng/inputtextarea';
import { FirebaseService } from '../../services/firebase.service';
import { ToastService } from '../../services/toast.service';
import { LoggerService } from '../../services/logger.service';
import type { Collection, Node, CustomField } from '../../models/data.model';

interface BulkUploadData {
  collections?: BulkCollection[];
  nodes?: BulkNode[];
}

interface BulkCollection {
  name: string;
  description?: string;
  nodes?: BulkNode[];
  subCollections?: BulkCollection[];
}

interface BulkNode {
  name: string;
  description?: string;
  customFields?: CustomField[];
}

@Component({
  selector: 'app-bulk-upload-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    InputTextarea
  ],
  providers: [],
  templateUrl: './bulk-upload-dialog.component.html',
  styleUrls: ['./bulk-upload-dialog.component.scss']
})
export class BulkUploadDialogComponent implements OnInit {
  private ref = inject(DynamicDialogRef);
  private config = inject(DynamicDialogConfig);
  private firebaseService = inject(FirebaseService);
  private toastService = inject(ToastService);
  private logger = inject(LoggerService);

  userId!: string;
  parentCollectionId?: string;
  
  jsonInput = '';
  isProcessing = false;
  showHelp = false;
  validationError = '';

  exampleJson = `{
  "collections": [
    {
      "name": "My Collection",
      "description": "A sample collection",
      "nodes": [
        {
          "name": "Sample Node",
          "description": "Node description",
          "customFields": [
            {
              "fieldName": "Image URL",
              "fieldType": "imageUrl",
              "fieldValue": "https://example.com/image.jpg"
            },
            {
              "fieldName": "Website",
              "fieldType": "url",
              "fieldValue": "https://example.com"
            },
            {
              "fieldName": "Date",
              "fieldType": "date",
              "fieldValue": "2024-01-01"
            }
          ]
        }
      ],
      "subCollections": [
        {
          "name": "Nested Collection",
          "description": "Inside parent collection",
          "nodes": []
        }
      ]
    }
  ],
  "nodes": [
    {
      "name": "Standalone Node",
      "description": "Not inside any collection"
    }
  ]
}`;

  ngOnInit(): void {
    this.userId = this.config.data?.userId;
    this.parentCollectionId = this.config.data?.parentCollectionId;
  }

  toggleHelp(): void {
    this.showHelp = !this.showHelp;
  }

  validateJson(): boolean {
    this.validationError = '';

    if (!this.jsonInput.trim()) {
      this.validationError = 'Please enter JSON data';
      return false;
    }

    try {
      const data = JSON.parse(this.jsonInput) as BulkUploadData;

      if (!data.collections && !data.nodes) {
        this.validationError = 'JSON must contain at least "collections" or "nodes" array';
        return false;
      }

      // Validate collections structure
      if (data.collections && !Array.isArray(data.collections)) {
        this.validationError = '"collections" must be an array';
        return false;
      }

      // Validate nodes structure
      if (data.nodes && !Array.isArray(data.nodes)) {
        this.validationError = '"nodes" must be an array';
        return false;
      }

      // Validate each collection has a name
      if (data.collections) {
        for (const collection of data.collections) {
          if (!collection.name) {
            this.validationError = 'All collections must have a "name" field';
            return false;
          }
        }
      }

      // Validate each node has a name
      if (data.nodes) {
        for (const node of data.nodes) {
          if (!node.name) {
            this.validationError = 'All nodes must have a "name" field';
            return false;
          }
        }
      }

      return true;
    } catch (error: unknown) {
      if (error instanceof Error) {
        this.validationError = `Invalid JSON: ${error.message}`;
      } else {
        this.validationError = 'Invalid JSON format';
      }
      return false;
    }
  }

  async processUpload(): Promise<void> {
    if (!this.validateJson()) {
      this.toastService.showError('Validation Error', this.validationError);
      return;
    }

    this.isProcessing = true;

    try {
      const data = JSON.parse(this.jsonInput) as BulkUploadData;
      let collectionsCreated = 0;
      let nodesCreated = 0;

      // Process collections
      if (data.collections) {
        for (const collection of data.collections) {
          const result = await this.createCollectionRecursively(
            collection,
            this.parentCollectionId
          );
          collectionsCreated += result.collections;
          nodesCreated += result.nodes;
        }
      }

      // Process standalone nodes (only if we have a parent collection)
      if (data.nodes && this.parentCollectionId) {
        for (const node of data.nodes) {
          await this.createNode(node, this.parentCollectionId);
          nodesCreated++;
        }
      } else if (data.nodes && !this.parentCollectionId) {
        this.toastService.showWarn(
          'Warning', 
          'Standalone nodes require a parent collection. They were skipped.'
        );
      }

      this.toastService.showSuccess(
        'Upload Successful',
        `Created ${collectionsCreated} collection(s) and ${nodesCreated} node(s)`
      );
      this.ref.close(true);
    } catch (error: unknown) {
      this.logger.error('Error processing bulk upload:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      this.toastService.showError('Upload Failed', errorMessage);
    } finally {
      this.isProcessing = false;
    }
  }

  private async createCollectionRecursively(
    bulkCollection: BulkCollection,
    parentId?: string
  ): Promise<{ collections: number; nodes: number }> {
    let collectionsCount = 1;
    let nodesCount = 0;

    // Create the collection
    const newCollection: Omit<Collection, 'id' | 'createdAt' | 'updatedAt'> = {
      name: bulkCollection.name,
      description: bulkCollection.description || '',
      userId: this.userId,
      parentCollectionId: parentId
    };

    const collectionDoc = await this.firebaseService.addCollection(this.userId, newCollection);
    const collectionId = (collectionDoc as any).id as string;

    // Create nodes within this collection
    if (bulkCollection.nodes && bulkCollection.nodes.length > 0) {
      for (const node of bulkCollection.nodes) {
        await this.createNode(node, collectionId);
        nodesCount++;
      }
    }

    // Create sub-collections recursively
    if (bulkCollection.subCollections && bulkCollection.subCollections.length > 0) {
      for (const subCollection of bulkCollection.subCollections) {
        const result = await this.createCollectionRecursively(subCollection, collectionId);
        collectionsCount += result.collections;
        nodesCount += result.nodes;
      }
    }

    return { collections: collectionsCount, nodes: nodesCount };
  }

  private async createNode(bulkNode: BulkNode, collectionId?: string): Promise<void> {
    if (!collectionId) {
      throw new Error('Collection ID is required to create a node');
    }

    const newNode: Omit<Node, 'id' | 'createdAt' | 'updatedAt'> = {
      name: bulkNode.name,
      description: bulkNode.description || '',
      userId: this.userId,
      collectionId: collectionId,
      customFields: bulkNode.customFields || []
    };

    await this.firebaseService.addNode(this.userId, collectionId, newNode);
  }

  copyExample(): void {
    navigator.clipboard.writeText(this.exampleJson).then(() => {
      this.toastService.showInfo('Copied', 'Example JSON copied to clipboard');
    }).catch(() => {
      this.toastService.showError('Error', 'Failed to copy to clipboard');
    });
  }

  onCancel(): void {
    this.ref.close();
  }
}
