import { Component, Output, EventEmitter, Input, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';

// PrimeNG Imports
import { DynamicDialogRef, DynamicDialogConfig } from 'primeng/dynamicdialog';
import { InputTextModule } from 'primeng/inputtext';
import { InputTextarea } from 'primeng/inputtextarea';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { MessageModule } from 'primeng/message';

import { Collection } from '../../models/data.model';

@Component({
  selector: 'app-add-collection-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    InputTextModule,
    InputTextarea,
    ButtonModule,
    CardModule,
    MessageModule
  ],
  templateUrl: './add-collection-dialog.component.html',
  styleUrl: './add-collection-dialog.component.scss'
})
export class AddCollectionDialogComponent implements OnInit {
  @Input() parentCollectionId: string | null = null;
  @Output() closeDialog = new EventEmitter<void>(); // This might not be needed with DynamicDialogRef
  @Output() addCollection = new EventEmitter<{ name: string; description: string | null; parentCollectionId: string | null }>();

  collectionForm = new FormGroup({
    name: new FormControl('', Validators.required),
    description: new FormControl(null as string | null)
  });

  constructor(
    public ref: DynamicDialogRef,
    @Inject(DynamicDialogConfig) public config: DynamicDialogConfig
  ) { }

  ngOnInit(): void {
    if (this.config.data && this.config.data.collection) {
      this.collectionForm.patchValue({
        name: this.config.data.collection.name,
        description: this.config.data.collection.description || null
      });
    }
    // Assign parentCollectionId from config data if available
    if (this.config.data && this.config.data.parentCollectionId !== undefined) {
      this.parentCollectionId = this.config.data.parentCollectionId;
    }
  }

  onSubmit(): void {
    if (this.collectionForm.valid) {
      this.ref.close({
        name: this.collectionForm.value.name as string,
        description: this.collectionForm.value.description as string | null,
        parentCollectionId: this.parentCollectionId
      });
    }
  }

  onCancel(): void {
    this.ref.close();
  }
}
