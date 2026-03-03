import { Component, OnInit, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup, FormControl, Validators, FormBuilder, FormArray } from '@angular/forms';
import { DynamicDialogRef, DynamicDialogConfig } from 'primeng/dynamicdialog';
import { InputTextModule } from 'primeng/inputtext';
import { Textarea } from 'primeng/inputtextarea';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import { SelectModule } from 'primeng/select';
import { InputNumberModule } from 'primeng/inputnumber';
import { CalendarModule } from 'primeng/calendar';
import { CheckboxModule } from 'primeng/checkbox';
import { ColorPickerModule } from 'primeng/colorpicker';
import { RatingModule } from 'primeng/rating';
import { TooltipModule } from 'primeng/tooltip';
import { urlValidator } from '../../../validators/url.validator';
import {
  WorkspaceFieldSchema, WorkspaceNodeField, WorkspaceNode,
  WORKSPACE_FIELD_TYPES, WorkspaceFieldTypeOption, generateFieldId
} from '../../../models/workspace.model';

@Component({
  selector: 'app-add-workspace-node-dialog',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, InputTextModule, Textarea,
    ButtonModule, MessageModule, SelectModule, InputNumberModule,
    CalendarModule, CheckboxModule, ColorPickerModule, RatingModule,
    TooltipModule
  ],
  templateUrl: './add-workspace-node-dialog.component.html',
  styleUrl: './add-workspace-node-dialog.component.scss'
})
export class AddWorkspaceNodeDialogComponent implements OnInit {
  nodeForm!: FormGroup;
  schema: WorkspaceFieldSchema[] = [];
  useCustomSchema: boolean = true;
  fieldTypes: WorkspaceFieldTypeOption[] = WORKSPACE_FIELD_TYPES;

  isEditMode = false;
  existingNode: WorkspaceNode | null = null;
  workspaceId: string = '';
  collectionId: string | null = null;

  constructor(
    public ref: DynamicDialogRef,
    @Inject(DynamicDialogConfig) public config: DynamicDialogConfig,
    private fb: FormBuilder
  ) {}

  ngOnInit(): void {
    this.schema = this.config.data?.schema || [];
    this.useCustomSchema = this.config.data?.useCustomSchema ?? true;
    this.workspaceId = this.config.data?.workspaceId || '';
    this.collectionId = this.config.data?.collectionId || null;

    this.nodeForm = this.fb.group({
      name: ['', Validators.required],
      description: [null as string | null],
      schemaFields: this.fb.array([]),
      customFields: this.fb.array([])
    });

    if (this.useCustomSchema && this.schema.length > 0) {
      this.initSchemaFields();
    }

    if (this.config.data?.node) {
      this.isEditMode = true;
      this.existingNode = this.config.data.node;
      this.populateFromNode(this.existingNode!);
    }
  }

  private initSchemaFields(): void {
    const sorted = [...this.schema].sort((a, b) => a.order - b.order);
    sorted.forEach(field => {
      const validators = field.mandatory ? [Validators.required] : [];
      if (field.fieldType === 'url' || field.fieldType === 'image-url') {
        validators.push(urlValidator());
      }
      if (field.fieldType === 'email') {
        validators.push(Validators.email);
      }

      this.schemaFields.push(this.fb.group({
        fieldId: [field.fieldId],
        fieldName: [field.fieldName],
        fieldType: [field.fieldType],
        mandatory: [field.mandatory],
        options: [field.options || []],
        value: [this.getDefaultValue(field.fieldType), validators]
      }));
    });
  }

  private populateFromNode(node: WorkspaceNode): void {
    this.nodeForm.patchValue({ name: node.name, description: node.description || null });

    if (this.useCustomSchema && node.fields) {
      this.schemaFields.controls.forEach(ctrl => {
        const group = ctrl as FormGroup;
        const fieldId = group.get('fieldId')?.value;
        const existing = node.fields.find(f => f.fieldId === fieldId);
        if (existing) {
          group.get('value')?.setValue(existing.value);
        }
      });
    }
  }

  get schemaFields(): FormArray {
    return this.nodeForm.get('schemaFields') as FormArray;
  }

  get customFields(): FormArray {
    return this.nodeForm.get('customFields') as FormArray;
  }

  getSchemaFieldGroup(index: number): FormGroup {
    return this.schemaFields.at(index) as FormGroup;
  }

  getDropdownOptions(index: number): { label: string; value: string }[] {
    const opts = this.getSchemaFieldGroup(index).get('options')?.value || [];
    return opts.map((o: string) => ({ label: o, value: o }));
  }

  private getDefaultValue(fieldType: string): any {
    switch (fieldType) {
      case 'checkbox': return false;
      case 'number': case 'rating': return null;
      case 'date': case 'datetime': return null;
      default: return '';
    }
  }

  addCustomField(): void {
    this.customFields.push(this.fb.group({
      fieldId: [generateFieldId()],
      fieldName: ['', Validators.required],
      fieldType: [null, Validators.required],
      value: ['']
    }));

    const newGroup = this.customFields.at(this.customFields.length - 1) as FormGroup;
    newGroup.get('fieldType')?.valueChanges.subscribe((type: string) => {
      const valueCtrl = newGroup.get('value');
      if (type === 'url' || type === 'image-url') {
        valueCtrl?.setValidators([urlValidator()]);
      } else if (type === 'email') {
        valueCtrl?.setValidators([Validators.email]);
      } else {
        valueCtrl?.clearValidators();
      }
      valueCtrl?.updateValueAndValidity();
    });
  }

  removeCustomField(index: number): void {
    this.customFields.removeAt(index);
  }

  onSubmit(): void {
    if (!this.nodeForm.valid) return;

    const fields: WorkspaceNodeField[] = [];

    if (this.useCustomSchema) {
      this.schemaFields.controls.forEach(ctrl => {
        const g = ctrl as FormGroup;
        fields.push({
          fieldId: g.get('fieldId')?.value,
          fieldName: g.get('fieldName')?.value,
          fieldType: g.get('fieldType')?.value,
          value: g.get('value')?.value ?? null
        });
      });
    }

    this.customFields.controls.forEach(ctrl => {
      const g = ctrl as FormGroup;
      if (g.get('fieldName')?.value && g.get('fieldType')?.value) {
        fields.push({
          fieldId: g.get('fieldId')?.value,
          fieldName: g.get('fieldName')?.value,
          fieldType: g.get('fieldType')?.value,
          value: g.get('value')?.value ?? null
        });
      }
    });

    this.ref.close({
      name: this.nodeForm.value.name,
      description: this.nodeForm.value.description || null,
      fields
    });
  }

  onCancel(): void {
    this.ref.close();
  }
}
