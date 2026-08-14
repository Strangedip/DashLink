import { Component, OnInit, Inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule, FormGroup, Validators, FormBuilder, FormArray } from '@angular/forms';
import { DynamicDialogRef, DynamicDialogConfig } from '../../../ui/dialog';
import { BtnComponent } from '../../../ui/btn.component';
import { IconComponent } from '../../../ui/icon.component';
import { CheckComponent } from '../../../ui/check.component';
import { SelectComponent } from '../../../ui/select.component';
import {
  Workspace, WorkspaceFieldSchema, WorkspaceMetadata, WorkspaceDetail,
  WORKSPACE_FIELD_TYPES,
  SCHEMA_STARTERS, SchemaStarter,
  generateFieldId, workspacePurpose, workspaceDetails
} from '../../../models/workspace.model';

const PURPOSE_IDEAS = [
  { label: 'Team project', text: 'A shared space for our project work.' },
  { label: 'Places', text: 'Places we want to remember and share.' },
  { label: 'Attendance', text: 'Track who is present and when.' },
  { label: 'Study group', text: 'Notes, links, and progress for the group.' },
  { label: 'Challenge', text: 'A group challenge with shared check-ins.' },
];

@Component({
    selector: 'app-create-workspace-dialog',
    imports: [
        CommonModule, ReactiveFormsModule, FormsModule,
        BtnComponent, IconComponent, CheckComponent, SelectComponent
    ],
    templateUrl: './create-workspace-dialog.component.html',
    changeDetection: ChangeDetectionStrategy.Eager,
    styleUrl: './create-workspace-dialog.component.scss'
})
export class CreateWorkspaceDialogComponent implements OnInit {
  activeStep = 0;
  readonly fieldTypeOptions = WORKSPACE_FIELD_TYPES.map(type => ({ value: type.code, label: type.name }));
  starters = SCHEMA_STARTERS;
  purposeIdeas = PURPOSE_IDEAS;

  basicForm!: FormGroup;
  schemaFields: FormArray = new FormArray<FormGroup>([]);
  details: FormArray = new FormArray<FormGroup>([]);
  useCustomSchema = false;
  showAdvanced = false;
  selectedStarter: string | null = null;
  tagInput = '';
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
      purpose: ['', Validators.maxLength(200)],
      memberLimit: [12, [Validators.required, Validators.min(2), Validators.max(32)]],
      aiApiKey: [''],
    });

    if (this.config.data?.workspace) {
      this.isEditMode = true;
      this.existingWorkspace = this.config.data.workspace;
      this.populateFromWorkspace(this.existingWorkspace!);
    }
  }

  private populateFromWorkspace(ws: Workspace): void {
    this.basicForm.patchValue({
      name: ws.name,
      description: ws.description,
      purpose: workspacePurpose(ws.metadata),
      memberLimit: ws.memberLimit || 12,
      aiApiKey: ws.aiApiKey || ''
    });
    this.tags = ws.metadata?.tags ? [...ws.metadata.tags] : [];
    this.useCustomSchema = !!ws.useCustomSchema && (ws.schema?.length || 0) > 0;
    this.showAdvanced = (ws.memberLimit && ws.memberLimit !== 12) || !!ws.aiApiKey;

    workspaceDetails(ws.metadata).forEach(detail => {
      if (detail.label.toLowerCase() === 'goal' && detail.value === workspacePurpose(ws.metadata)) {
        return;
      }
      this.addDetail(detail);
    });

    if (ws.schema) {
      ws.schema.forEach(field => this.addSchemaFieldFromExisting(field));
    }
  }

  get schemaFieldControls(): FormGroup[] {
    return this.schemaFields.controls as FormGroup[];
  }

  get detailControls(): FormGroup[] {
    return this.details.controls as FormGroup[];
  }

  setItemMode(custom: boolean): void {
    this.useCustomSchema = custom;
    if (!custom) {
      this.selectedStarter = null;
    }
  }

  applyStarter(starter: SchemaStarter): void {
    this.useCustomSchema = true;
    this.selectedStarter = starter.id;
    this.schemaFields.clear();
    starter.fields.forEach(field => {
      this.addSchemaFieldFromExisting({
        fieldId: generateFieldId(),
        fieldName: field.fieldName,
        fieldType: field.fieldType,
        mandatory: field.mandatory,
        options: field.options || [],
        order: this.schemaFields.length
      });
    });
  }

  applyPurposeIdea(text: string): void {
    this.basicForm.get('purpose')?.setValue(text);
  }

  addSchemaField(): void {
    this.selectedStarter = null;
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

  addDetail(existing?: WorkspaceDetail): void {
    this.details.push(this.fb.group({
      id: [existing?.id || generateFieldId()],
      label: [existing?.label || '', Validators.required],
      value: [existing?.value || '', Validators.required]
    }));
  }

  removeDetail(index: number): void {
    this.details.removeAt(index);
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
    if (this.isBasicValid()) {
      this.activeStep = 1;
    }
  }

  prevStep(): void {
    this.activeStep = 0;
  }

  isBasicValid(): boolean {
    return !!this.basicForm.get('name')?.valid;
  }

  isSchemaValid(): boolean {
    if (!this.useCustomSchema) return true;
    if (this.schemaFields.length === 0) return true;
    return this.schemaFields.controls.every(c => (c as FormGroup).valid);
  }

  isDetailsValid(): boolean {
    return this.details.controls.every(ctrl => {
      const label = (ctrl.get('label')?.value || '').trim();
      const value = (ctrl.get('value')?.value || '').trim();
      return (!label && !value) || (label && value);
    });
  }

  onSubmit(): void {
    if (!this.isBasicValid() || !this.isSchemaValid() || !this.isDetailsValid()) return;

    const filledSchema = this.schemaFields.controls
      .map(ctrl => {
        const g = ctrl as FormGroup;
        const optionsStr = g.get('options')?.value || '';
        return {
          fieldId: g.get('fieldId')?.value,
          fieldName: (g.get('fieldName')?.value || '').trim(),
          fieldType: g.get('fieldType')?.value,
          mandatory: g.get('mandatory')?.value || false,
          options: optionsStr ? optionsStr.split(',').map((o: string) => o.trim()).filter((o: string) => o) : [],
          order: g.get('order')?.value
        } as WorkspaceFieldSchema;
      })
      .filter(field => field.fieldName && field.fieldType);

    const useCustomSchema = this.useCustomSchema && filledSchema.length > 0;
    const purpose = (this.basicForm.value.purpose || '').trim();
    const details: WorkspaceDetail[] = this.details.controls
      .map(ctrl => ({
        id: ctrl.get('id')?.value,
        label: (ctrl.get('label')?.value || '').trim(),
        value: (ctrl.get('value')?.value || '').trim()
      }))
      .filter(item => item.label && item.value);

    const metadata: WorkspaceMetadata = {
      purpose,
      details,
      tags: this.tags,
      goal: purpose
    };

    this.ref.close({
      name: this.basicForm.value.name.trim(),
      description: this.basicForm.value.description?.trim() || '',
      memberLimit: this.basicForm.value.memberLimit || 12,
      aiApiKey: this.basicForm.value.aiApiKey || '',
      metadata,
      schema: useCustomSchema ? filledSchema : [],
      useCustomSchema
    });
  }

  onCancel(): void {
    this.ref.close();
  }
}
