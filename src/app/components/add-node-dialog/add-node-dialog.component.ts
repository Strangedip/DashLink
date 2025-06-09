import { Component, OnInit, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup, FormControl, Validators, FormBuilder, FormArray } from '@angular/forms';

// PrimeNG Imports
import { DynamicDialogRef, DynamicDialogConfig } from 'primeng/dynamicdialog';
import { InputTextModule } from 'primeng/inputtext';
import { InputTextarea } from 'primeng/inputtextarea';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { MessageModule } from 'primeng/message';
import { SelectModule } from 'primeng/select';
import { InputNumberModule } from 'primeng/inputnumber';
import { CalendarModule } from 'primeng/calendar';

import { Node, CustomField } from '../../models/data.model';

interface FieldType {
  name: string;
  code: string;
}

@Component({
  selector: 'app-add-node-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    InputTextModule,
    InputTextarea,
    ButtonModule,
    CardModule,
    MessageModule,
    SelectModule,
    InputNumberModule,
    CalendarModule
  ],
  templateUrl: './add-node-dialog.component.html',
  styleUrl: './add-node-dialog.component.scss'
})
export class AddNodeDialogComponent implements OnInit {
  collectionId!: string;
  nodeForm!: FormGroup;
  fieldTypes: FieldType[] = [
    { name: 'Text', code: 'text' },
    { name: 'URL', code: 'url' },
    { name: 'Number', code: 'number' },
    { name: 'Date', code: 'date' },
    { name: 'Image URL', code: 'imageUrl' }
  ];

  constructor(
    public ref: DynamicDialogRef,
    @Inject(DynamicDialogConfig) public config: DynamicDialogConfig,
    private fb: FormBuilder
  ) { }

  ngOnInit(): void {
    this.nodeForm = this.fb.group({
      name: ['', Validators.required],
      description: [null as string | null],
      customFields: this.fb.array([])
    });

    if (this.config.data && this.config.data.node) {
      const node: Node = this.config.data.node;
      this.nodeForm.patchValue({
        name: node.name,
        description: node.description || null
      });

      if (node.customFields) {
        node.customFields.forEach(field => {
          this.addExistingField(field);
        });
      }
    }

    if (this.config.data && this.config.data.collectionId) {
      this.collectionId = this.config.data.collectionId;
    }
  }

  get customFields(): FormArray {
    return this.nodeForm.get('customFields') as FormArray;
  }

  addCustomField(): void {
    this.customFields.push(this.fb.group({
      fieldName: ['', Validators.required],
      fieldType: [null, Validators.required],
      fieldValue: ['']
    }));
  }

  addExistingField(field: CustomField): void {
    let initialFieldValue: any;
    if (field.fieldValue === undefined || field.fieldValue === null) {
      if (field.fieldType === 'text' || field.fieldType === 'url' || field.fieldType === 'imageUrl') {
        initialFieldValue = '';
      } else {
        initialFieldValue = null;
      }
    } else {
      initialFieldValue = field.fieldValue;
    }

    this.customFields.push(this.fb.group({
      fieldName: [field.fieldName, Validators.required],
      fieldType: [field.fieldType, Validators.required],
      fieldValue: [initialFieldValue]
    }));
  }

  removeCustomField(index: number): void {
    this.customFields.removeAt(index);
  }

  onSubmit(): void {
    if (this.nodeForm.valid) {
      const customFieldsData: CustomField[] = [];

      this.customFields.controls.forEach(control => {
        const fieldName = control.get('fieldName')?.value;
        const fieldType = control.get('fieldType')?.value;
        let rawFieldValue = control.get('fieldValue')?.value;

        // Determine the value to be sent to Firebase
        let firebaseValue: any;

        if (rawFieldValue === undefined || rawFieldValue === null) {
          if (fieldType === 'text' || fieldType === 'url' || fieldType === 'imageUrl') {
            firebaseValue = ''; // Send empty string for text/url/imageUrl if undefined or null
          } else {
            firebaseValue = null; // Send null for number/date if undefined or null
          }
        } else {
          firebaseValue = rawFieldValue;
        }

        if (fieldName && fieldType) {
          customFieldsData.push({
            fieldName: fieldName,
            fieldType: fieldType,
            fieldValue: firebaseValue
          });
        }
      });

      this.ref.close({
        name: this.nodeForm.value.name as string,
        description: this.nodeForm.value.description as string | null,
        collectionId: this.collectionId,
        customFields: customFieldsData
      });
    }
  }

  onCancel(): void {
    this.ref.close();
  }
}
