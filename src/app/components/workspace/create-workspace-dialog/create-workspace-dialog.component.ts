import { Component, OnInit, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule, FormGroup, FormControl, Validators, FormBuilder, FormArray } from '@angular/forms';
import { DynamicDialogRef, DynamicDialogConfig } from 'primeng/dynamicdialog';
import { InputTextModule } from 'primeng/inputtext';
import { Textarea } from 'primeng/inputtextarea';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import { SelectModule } from 'primeng/select';
import { CheckboxModule } from 'primeng/checkbox';
import { ChipModule } from 'primeng/chip';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { StepperModule } from 'primeng/stepper';
import { TooltipModule } from 'primeng/tooltip';
import {
  Workspace, WorkspaceFieldSchema, WorkspaceMetadata,
  WORKSPACE_FIELD_TYPES, WorkspaceFieldTypeOption,
  generateFieldId
} from '../../../models/workspace.model';

@Component({
  selector: 'app-create-workspace-dialog',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, FormsModule, InputTextModule, Textarea,
    ButtonModule, MessageModule, SelectModule, CheckboxModule,
    ChipModule, ToggleSwitchModule, StepperModule, TooltipModule
  ],
  templateUrl: './create-workspace-dialog.component.html',
  styleUrl: './create-workspace-dialog.component.scss'
})
export class CreateWorkspaceDialogComponent implements OnInit {
  activeStep: number = 0;
  fieldTypes: WorkspaceFieldTypeOption[] = WORKSPACE_FIELD_TYPES;

  basicForm!: FormGroup;
  metadataForm!: FormGroup;
  schemaFields: FormArray = new FormArray<FormGroup>([]);
  useCustomSchema: boolean = true;
  tagInput: string = '';
  tags: string[] = [];

  isEditMode = false;
  existingWorkspace: Workspace | null = null;

  constructor(
    public ref: DynamicDialogRef,
    @Inject(DynamicDialogConfig) public config: DynamicDialogConfig,
    private fb: FormBuilder
  ) {}

  ngOnInit(): void {
    this.basicForm = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(50)]],
      description: ['', Validators.maxLength(200)],
    });

    this.metadataForm = this.fb.group({
      goal: ['', Validators.required],
      rules: [''],
      duration: [''],
      penalty: [''],
      category: [''],
    });

    if (this.config.data?.workspace) {
      this.isEditMode = true;
      this.existingWorkspace = this.config.data.workspace;
      this.populateFromWorkspace(this.existingWorkspace!);
    }
  }

  private populateFromWorkspace(ws: Workspace): void {
    this.basicForm.patchValue({ name: ws.name, description: ws.description });
    this.metadataForm.patchValue({
      goal: ws.metadata?.goal || '',
      rules: ws.metadata?.rules || '',
      duration: ws.metadata?.duration || '',
      penalty: ws.metadata?.penalty || '',
      category: ws.metadata?.category || '',
    });
    this.tags = ws.metadata?.tags ? [...ws.metadata.tags] : [];
    this.useCustomSchema = ws.useCustomSchema;

    if (ws.schema) {
      ws.schema.forEach(field => this.addSchemaFieldFromExisting(field));
    }
  }

  get schemaFieldControls(): FormGroup[] {
    return this.schemaFields.controls as FormGroup[];
  }

  addSchemaField(): void {
    this.schemaFields.push(this.fb.group({
      fieldId: [generateFieldId()],
      fieldName: ['', Validators.required],
      fieldType: [null, Validators.required],
      mandatory: [false],
      options: [''],
      order: [this.schemaFields.length]
    }));
  }

  addSchemaFieldFromExisting(field: WorkspaceFieldSchema): void {
    this.schemaFields.push(this.fb.group({
      fieldId: [field.fieldId],
      fieldName: [field.fieldName, Validators.required],
      fieldType: [field.fieldType, Validators.required],
      mandatory: [field.mandatory],
      options: [field.options?.join(', ') || ''],
      order: [field.order]
    }));
  }

  removeSchemaField(index: number): void {
    this.schemaFields.removeAt(index);
    this.reorderFields();
  }

  moveFieldUp(index: number): void {
    if (index <= 0) return;
    const current = this.schemaFields.at(index);
    this.schemaFields.removeAt(index);
    this.schemaFields.insert(index - 1, current);
    this.reorderFields();
  }

  moveFieldDown(index: number): void {
    if (index >= this.schemaFields.length - 1) return;
    const current = this.schemaFields.at(index);
    this.schemaFields.removeAt(index);
    this.schemaFields.insert(index + 1, current);
    this.reorderFields();
  }

  private reorderFields(): void {
    this.schemaFields.controls.forEach((ctrl, i) => {
      (ctrl as FormGroup).get('order')?.setValue(i);
    });
  }

  addTag(): void {
    const tag = this.tagInput.trim();
    if (tag && !this.tags.includes(tag) && this.tags.length < 10) {
      this.tags.push(tag);
      this.tagInput = '';
    }
  }

  removeTag(index: number): void {
    this.tags.splice(index, 1);
  }

  onTagKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      event.preventDefault();
      this.addTag();
    }
  }

  nextStep(): void {
    this.activeStep++;
  }

  prevStep(): void {
    this.activeStep--;
  }

  isBasicValid(): boolean {
    return this.basicForm.valid;
  }

  isMetadataValid(): boolean {
    return this.metadataForm.valid;
  }

  isSchemaValid(): boolean {
    if (!this.useCustomSchema) return true;
    if (this.schemaFields.length === 0) return true;
    return this.schemaFields.controls.every(c => (c as FormGroup).valid);
  }

  onSubmit(): void {
    if (!this.isBasicValid() || !this.isMetadataValid() || !this.isSchemaValid()) return;

    const schema: WorkspaceFieldSchema[] = this.useCustomSchema
      ? this.schemaFields.controls.map(ctrl => {
        const g = ctrl as FormGroup;
        const optionsStr = g.get('options')?.value || '';
        return {
          fieldId: g.get('fieldId')?.value,
          fieldName: g.get('fieldName')?.value,
          fieldType: g.get('fieldType')?.value,
          mandatory: g.get('mandatory')?.value || false,
          options: optionsStr ? optionsStr.split(',').map((o: string) => o.trim()).filter((o: string) => o) : [],
          order: g.get('order')?.value
        };
      })
      : [];

    const metadata: WorkspaceMetadata = {
      goal: this.metadataForm.value.goal || '',
      rules: this.metadataForm.value.rules || '',
      duration: this.metadataForm.value.duration || '',
      penalty: this.metadataForm.value.penalty || '',
      category: this.metadataForm.value.category || '',
      tags: this.tags
    };

    this.ref.close({
      name: this.basicForm.value.name,
      description: this.basicForm.value.description || '',
      metadata,
      schema,
      useCustomSchema: this.useCustomSchema
    });
  }

  onCancel(): void {
    this.ref.close();
  }
}
