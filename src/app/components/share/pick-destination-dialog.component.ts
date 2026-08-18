import { Component, OnInit, ChangeDetectionStrategy, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { DynamicDialogRef, DynamicDialogConfig } from '../../ui/dialog';
import { BtnComponent } from '../../ui/btn.component';
import { IconComponent } from '../../ui/icon.component';
import { Collection } from '../../models/data.model';
import { FirebaseService } from '../../services/firebase.service';
import { AuthService } from '../../services/auth.service';

interface DestinationRow {
  id: string;
  name: string;
  depth: number;
  isDefault: boolean;
}

@Component({
  selector: 'app-pick-destination-dialog',
  imports: [BtnComponent, IconComponent],
  templateUrl: './pick-destination-dialog.component.html',
  styleUrl: './pick-destination-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.Eager
})
export class PickDestinationDialogComponent implements OnInit {
  private firebase = inject(FirebaseService);
  private auth = inject(AuthService);
  private ref = inject(DynamicDialogRef);
  private config = inject(DynamicDialogConfig);

  loading = true;
  error = '';
  rows: DestinationRow[] = [];
  selectedId: string | null = null;
  hint = 'Choose a folder in My stuff. Nested items stay nested.';

  async ngOnInit(): Promise<void> {
    if (this.config.data?.hint) {
      this.hint = this.config.data.hint;
    }
    try {
      const uid = this.auth.currentUserUid;
      if (!uid) {
        this.error = 'Sign in to save this.';
        this.loading = false;
        return;
      }
      await this.firebase.ensureDefaultUserCollection(uid);
      const collections = await firstValueFrom(this.firebase.getCollections(uid));
      this.rows = this.toRows(collections);
      const preferred = this.rows.find(row => row.isDefault) || this.rows[0];
      this.selectedId = preferred?.id || null;
    } catch {
      this.error = 'Could not load your folders.';
    } finally {
      this.loading = false;
    }
  }

  select(id: string): void {
    this.selectedId = id;
  }

  confirm(): void {
    if (this.selectedId) {
      this.ref.close(this.selectedId);
    }
  }

  cancel(): void {
    this.ref.close();
  }

  private toRows(collections: Collection[]): DestinationRow[] {
    const byParent = new Map<string | null, Collection[]>();
    for (const item of collections) {
      const parent = item.parentCollectionId == null || item.parentCollectionId === '' ? null : item.parentCollectionId;
      const list = byParent.get(parent) || [];
      list.push(item);
      byParent.set(parent, list);
    }
    for (const list of byParent.values()) {
      list.sort((a, b) => a.name.localeCompare(b.name));
    }
    const rows: DestinationRow[] = [];
    const walk = (parentId: string | null, depth: number) => {
      for (const item of byParent.get(parentId) || []) {
        if (!item.id) {
          continue;
        }
        rows.push({
          id: item.id,
          name: item.name,
          depth,
          isDefault: depth === 0 && item.name === 'My Collections'
        });
        walk(item.id, depth + 1);
      }
    };
    walk(null, 0);
    if (!rows.length) {
      for (const item of collections) {
        if (!item.id) {
          continue;
        }
        rows.push({
          id: item.id,
          name: item.name,
          depth: 0,
          isDefault: item.name === 'My Collections'
        });
      }
    }
    if (rows[0] && !rows.some(row => row.isDefault)) {
      rows[0].isDefault = true;
    }
    return rows;
  }
}
