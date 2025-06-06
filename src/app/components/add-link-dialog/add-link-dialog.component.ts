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

import { Link } from '../../models/data.model';

@Component({
  selector: 'app-add-link-dialog',
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
  templateUrl: './add-link-dialog.component.html',
  styleUrl: './add-link-dialog.component.scss'
})
export class AddLinkDialogComponent implements OnInit {
  @Input() collectionId!: string; // This might not be strictly needed with DynamicDialogConfig
  @Output() closeDialog = new EventEmitter<void>(); // This might not be needed with DynamicDialogRef
  @Output() addLink = new EventEmitter<{ name: string; url: string; description: string | null; collectionId: string }>();

  linkForm = new FormGroup({
    name: new FormControl('', Validators.required),
    url: new FormControl('', [Validators.required, Validators.pattern('https?://.+')]),
    description: new FormControl(null as string | null)
  });

  constructor(
    public ref: DynamicDialogRef,
    @Inject(DynamicDialogConfig) public config: DynamicDialogConfig
  ) { }

  ngOnInit(): void {
    if (this.config.data && this.config.data.link) {
      this.linkForm.patchValue({
        name: this.config.data.link.name,
        url: this.config.data.link.url,
        description: this.config.data.link.description || null
      });
    }
    // Assign collectionId from config data if available
    if (this.config.data && this.config.data.collectionId) {
      this.collectionId = this.config.data.collectionId;
    }
  }

  onSubmit(): void {
    if (this.linkForm.valid) {
      this.ref.close({
        name: this.linkForm.value.name as string,
        url: this.linkForm.value.url as string,
        description: this.linkForm.value.description as string | null,
        collectionId: this.collectionId
      });
    }
  }

  onCancel(): void {
    this.ref.close();
  }
}
