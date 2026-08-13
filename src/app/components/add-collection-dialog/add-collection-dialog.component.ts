import { Component, Input, Inject, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';

import { DynamicDialogRef, DynamicDialogConfig } from '../../ui/dialog';
import { BtnComponent } from '../../ui/btn.component';

import { Collection } from '../../models/data.model';

@Component({
    selector: 'app-add-collection-dialog',
    imports: [
        CommonModule,
        ReactiveFormsModule,
        BtnComponent
    ],
    templateUrl: './add-collection-dialog.component.html',
    changeDetection: ChangeDetectionStrategy.Eager,
    styleUrl: './add-collection-dialog.component.scss'
})
export class AddCollectionDialogComponent implements OnInit {
  @Input() parentCollectionId: string | null = null;

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
