import { Component, OnInit, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup, FormControl, Validators, FormBuilder, FormArray } from '@angular/forms';
import { urlValidator } from '../../validators/url.validator';

// PrimeNG Imports
import { DynamicDialogRef, DynamicDialogConfig } from 'primeng/dynamicdialog';
import { InputTextModule } from 'primeng/inputtext';
import { Textarea } from 'primeng/inputtextarea';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { MessageModule } from 'primeng/message';
import { SelectModule } from 'primeng/select';
import { InputNumberModule } from 'primeng/inputnumber';
import { CalendarModule } from 'primeng/calendar';
import { TooltipModule } from 'primeng/tooltip';

import { Node, CustomField } from '../../models/data.model';

// ─── Cloudinary widget type declaration ───────────────────────────────────────
declare global {
  interface Window { cloudinary: any; }
}

const CLOUD_NAME = 'dkubkgfre';        
const UPLOAD_PRESET = 'Dashlink'; 
// ──────────────────────────────────────────────────────────────────────────────

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
    Textarea,
    ButtonModule,
    CardModule,
    MessageModule,
    SelectModule,
    InputNumberModule,
    CalendarModule,
    TooltipModule
  ],
  templateUrl: './add-node-dialog.component.html',
  styleUrl: './add-node-dialog.component.scss'
})
export class AddNodeDialogComponent implements OnInit {
  collectionId!: string;
  nodeForm!: FormGroup;
  uploadingFieldIndex: number | null = null; // Track which field is being uploaded

  fieldTypes: FieldType[] = [
    { name: 'Text',         code: 'text'     },
    { name: 'URL',          code: 'url'      },
    { name: 'Number',       code: 'number'   },
    { name: 'Date',         code: 'date'     },
    { name: 'Image Upload', code: 'imageUrl' }
  ];

  constructor(
    public ref: DynamicDialogRef,
    @Inject(DynamicDialogConfig) public config: DynamicDialogConfig,
    private fb: FormBuilder
  ) { }

  ngOnInit(): void {
    this.nodeForm = this.fb.group({
      name:         ['', Validators.required],
      description:  [null as string | null],
      customFields: this.fb.array([])
    });

    if (this.config.data?.node) {
      const node: Node = this.config.data.node;
      this.nodeForm.patchValue({
        name:        node.name,
        description: node.description || null
      });

      node.customFields?.forEach(field => this.addExistingField(field));
    }

    if (this.config.data?.collectionId) {
      this.collectionId = this.config.data.collectionId;
    }
  }

  // ─── Form Array Helpers ─────────────────────────────────────────────────────

  get customFields(): FormArray {
    return this.nodeForm.get('customFields') as FormArray;
  }

  addCustomField(): void {
    const newFieldGroup = this.fb.group({
      fieldName:  ['', Validators.required],
      fieldType:  ['', Validators.required], // Empty string instead of null to avoid initial validation issues
      fieldValue: ['']
    });
    
    this.customFields.push(newFieldGroup);
    
    // Subscribe after a tick to avoid timing issues
    setTimeout(() => {
      this._subscribeToFieldTypeChanges(newFieldGroup);
    }, 0);
  }

  addExistingField(field: CustomField): void {
    let initialFieldValue: unknown;

    if (field.fieldValue == null) {
      initialFieldValue = (field.fieldType === 'text' || field.fieldType === 'url' || field.fieldType === 'imageUrl')
        ? '' : null;
    } else {
      initialFieldValue = field.fieldValue;
    }

    // imageUrl: no urlValidator — value always comes from Cloudinary, never typed manually
    const validators = field.fieldType === 'url' ? [urlValidator()] : [];

    const fieldGroup = this.fb.group({
      fieldName:  [field.fieldName,  Validators.required],
      fieldType:  [field.fieldType || '', Validators.required], // Ensure non-null initial value
      fieldValue: [initialFieldValue, validators]
    });
    
    this.customFields.push(fieldGroup);
    
    // Subscribe after a tick
    setTimeout(() => {
      this._subscribeToFieldTypeChanges(fieldGroup);
    }, 0);
  }

  removeCustomField(index: number): void {
    this.customFields.removeAt(index);
  }

  // ─── Cloudinary ─────────────────────────────────────────────────────────────

  /** Opens the Cloudinary Upload Widget and patches secure_url into fieldValue */
  openImageUpload(index: number): void {
    this.uploadingFieldIndex = index;
    
    const widget = window.cloudinary.createUploadWidget(
      {
        cloudName:    CLOUD_NAME,
        uploadPreset: UPLOAD_PRESET,
        sources:      ['local', 'camera', 'url'],
        multiple:     false,
        resourceType: 'image',
        maxFileSize:  5_000_000, // 5 MB
        folder:       'nodes',
        maxFiles:     1,
        showSkipCropButton: false,
        cropping: true,
        croppingAspectRatio: 4 / 3,
        showCompletedButton: true,
        styles: {
          palette: {
            window:      '#FFFFFF',
            windowBorder:'#DDDDDD',
            tabIcon:     '#0E4CAF',
            menuIcons:   '#5A616A',
            textDark:    '#000000',
            textLight:   '#FFFFFF',
            link:        '#0E4CAF',
            action:      '#0E4CAF',
            inactiveTabIcon: '#69778A',
            error:       '#F44235',
            inProgress:  '#0E4CAF',
            complete:    '#20B832',
            sourceBg:    '#E4EBF1'
          }
        }
      },
      (error: any, result: any) => {
        if (error) {
          console.error('Cloudinary upload error:', error);
          this.uploadingFieldIndex = null;
          return;
        }
        if (result?.event === 'success') {
          this.customFields.at(index).get('fieldValue')?.setValue(result.info.secure_url);
          this.uploadingFieldIndex = null;
          widget.close();
        }
      }
    );
    widget.open();
  }

  /** Clears the image URL from the form control */
  clearImage(index: number): void {
    this.customFields.at(index).get('fieldValue')?.setValue('');
  }

  // ─── Submit / Cancel ────────────────────────────────────────────────────────

  onSubmit(): void {
    if (!this.nodeForm.valid) return;

    const customFieldsData: CustomField[] = this.customFields.controls
      .filter(control => control.get('fieldName')?.value && control.get('fieldType')?.value)
      .map(control => {
        const fieldType  = control.get('fieldType')?.value;
        const rawValue   = control.get('fieldValue')?.value;

        let firebaseValue: unknown;
        if (rawValue == null) {
          firebaseValue = (fieldType === 'text' || fieldType === 'url' || fieldType === 'imageUrl')
            ? '' : null;
        } else {
          firebaseValue = rawValue;
        }

        return {
          fieldName:  control.get('fieldName')?.value,
          fieldType,
          fieldValue: firebaseValue
        };
      });

    this.ref.close({
      name:         this.nodeForm.value.name        as string,
      description:  this.nodeForm.value.description as string | null,
      collectionId: this.collectionId,
      customFields: customFieldsData
    });
  }

  onCancel(): void {
    this.ref.close();
  }

  // ─── Private ────────────────────────────────────────────────────────────────

  /** Adds URL validator dynamically when user switches field type to 'url'.
   *  imageUrl is excluded — value is always set by Cloudinary. */
  private _subscribeToFieldTypeChanges(fieldGroup: FormGroup): void {
    fieldGroup.get('fieldType')?.valueChanges.subscribe((fieldType: string) => {
      const ctrl = fieldGroup.get('fieldValue');
      if (fieldType === 'url') {
        ctrl?.setValidators([urlValidator()]);
      } else {
        ctrl?.clearValidators();
      }
      ctrl?.updateValueAndValidity();
    });
  }
}