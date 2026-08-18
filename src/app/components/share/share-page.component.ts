import { Component, OnInit, ChangeDetectionStrategy, DestroyRef, inject } from '@angular/core';
import { CommonModule, DatePipe, NgTemplateOutlet } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { take } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { LogoComponent } from '../brand/logo.component';
import { BtnComponent } from '../../ui/btn.component';
import { IconComponent } from '../../ui/icon.component';
import { RatingComponent } from '../../ui/rating.component';
import { FormsModule } from '@angular/forms';
import { DialogService } from '../../ui/dialog';
import { CloudinaryService } from '../../services/cloudinary.service';
import { ShareService } from '../../services/share.service';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';
import { LoggerService } from '../../services/logger.service';
import { SeoService } from '../../services/seo.service';
import { PublicCollection, PublicField, PublicSharePayload } from '../../models/share.model';
import { PickDestinationDialogComponent } from './pick-destination-dialog.component';

@Component({
  selector: 'app-share-page',
  imports: [
    CommonModule,
    NgTemplateOutlet,
    FormsModule,
    LogoComponent,
    BtnComponent,
    IconComponent,
    RatingComponent
  ],
  providers: [DatePipe],
  templateUrl: './share-page.component.html',
  styleUrl: './share-page.component.scss',
  changeDetection: ChangeDetectionStrategy.Eager
})
export class SharePageComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);
  private shareService = inject(ShareService);
  private auth = inject(AuthService);
  private dialog = inject(DialogService);
  private toast = inject(ToastService);
  private logger = inject(LoggerService);
  private seo = inject(SeoService);
  private cloudinary = inject(CloudinaryService);
  private datePipe = inject(DatePipe);

  shareId = '';
  loading = true;
  viewerReady = false;
  saving = false;
  signedIn = false;
  payload: PublicSharePayload | null = null;
  expanded = new Set<string>();

  ngOnInit(): void {
    this.shareId = this.route.snapshot.paramMap.get('shareId') || '';
    this.auth.user$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(user => {
      this.signedIn = !!user;
      if (user) {
        this.maybeResumeAdd();
      }
    });
    void this.refresh();
  }

  get logoLink(): string {
    return this.signedIn ? '/dashboard' : '/';
  }

  get isOwner(): boolean {
    return this.payload?.viewer === 'owner';
  }

  get unavailable(): boolean {
    return !!this.payload?.unavailable || (!this.loading && !this.payload);
  }

  nodeKey(path: string, index: number): string {
    return `${path}:${index}`;
  }

  isExpanded(key: string): boolean {
    return this.expanded.has(key);
  }

  toggleNode(key: string): void {
    if (this.expanded.has(key)) {
      this.expanded.delete(key);
    } else {
      this.expanded.add(key);
    }
  }

  heroUrl(url: string): string {
    return this.cloudinary.getHeroUrl(url);
  }

  detailUrl(url: string): string {
    return this.cloudinary.getDetailUrl(url);
  }

  fieldHref(field: PublicField): string | null {
    return this.shareService.hrefFromValue(field.value);
  }

  plainText(value: unknown): string {
    return String(value || '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  formatDate(value: unknown): string {
    if (!value) {
      return '';
    }
    const date = value instanceof Date ? value : new Date(String(value));
    if (Number.isNaN(date.getTime())) {
      return String(value);
    }
    return this.datePipe.transform(date, 'MMM d, y') || String(value);
  }

  formatDateTime(value: unknown): string {
    if (!value) {
      return '';
    }
    const date = value instanceof Date ? value : new Date(String(value));
    if (Number.isNaN(date.getTime())) {
      return String(value);
    }
    return this.datePipe.transform(date, 'MMM d, y, h:mm a') || String(value);
  }

  fieldIcon(type: string): string {
    const icons: Record<string, string> = {
      text: 'align-left',
      'long-text': 'align-justify',
      number: 'hashtag',
      url: 'link',
      email: 'envelope',
      phone: 'phone',
      date: 'calendar',
      datetime: 'clock',
      image: 'image',
      checkbox: 'check-square',
      color: 'palette',
      rating: 'star'
    };
    return icons[type] || 'tag';
  }

  login(saveAfter = false): void {
    if (saveAfter) {
      this.storeAddIntent();
    }
    this.storeReturn();
    void this.router.navigate(['/auth/login'], { queryParams: { returnUrl: `/s/${this.shareId}` } });
  }

  register(): void {
    this.storeAddIntent();
    this.storeReturn();
    void this.router.navigate(['/auth/register'], { queryParams: { returnUrl: `/s/${this.shareId}` } });
  }

  openMine(): void {
    const path = this.payload?.openPath || '/dashboard';
    void this.router.navigateByUrl(path);
  }

  async addToMyStuff(): Promise<void> {
    if (!this.payload || this.payload.unavailable) {
      return;
    }
    if (!this.signedIn) {
      return;
    }
    const hint = this.payload.kind === 'collection'
      ? 'This folder and everything inside it will be copied here. The copy will not stay in sync.'
      : 'This item will be copied into the folder you pick. The copy will not stay in sync.';
    const ref = this.dialog.open(PickDestinationDialogComponent, {
      header: 'Add to my collections',
      width: '28rem',
      data: { hint }
    });
    ref.onClose.pipe(take(1)).subscribe((destinationId: string | undefined) => {
      if (destinationId) {
        void this.saveClone(destinationId);
      }
    });
  }

  countItems(collection: PublicCollection | null | undefined): string {
    if (!collection) {
      return '';
    }
    const folders = this.countFolders(collection);
    const nodes = this.countNodes(collection);
    const parts: string[] = [];
    if (folders) {
      parts.push(`${folders} folder${folders === 1 ? '' : 's'}`);
    }
    parts.push(`${nodes} item${nodes === 1 ? '' : 's'}`);
    return parts.join(' · ');
  }

  private countFolders(collection: PublicCollection): number {
    return (collection.collections || []).reduce((sum, child) => sum + 1 + this.countFolders(child), 0);
  }

  goHome(): void {
    void this.router.navigate([this.signedIn ? '/dashboard' : '/']);
  }

  private countNodes(collection: PublicCollection): number {
    return (collection.nodes?.length || 0)
      + (collection.collections || []).reduce((sum, child) => sum + this.countNodes(child), 0);
  }

  private async saveClone(destinationId: string): Promise<void> {
    if (!this.payload) {
      return;
    }
    this.saving = true;
    try {
      const saved = await this.shareService.cloneIntoMyStuff(this.payload, destinationId);
      this.toast.showSuccess('Saved', 'Added to your collections. This copy is yours and will not stay in sync.');
      void this.router.navigate(['/collections', saved.collectionId]);
    } catch (error: unknown) {
      this.logger.error('Clone share failed:', error);
      this.toast.showError('Could not save', 'Try again in a moment.');
    } finally {
      this.saving = false;
    }
  }

  private storeAddIntent(): void {
    try {
      sessionStorage.setItem('dl.addShare', this.shareId);
    } catch {}
  }

  private maybeResumeAdd(): void {
    if (!this.signedIn || !this.viewerReady || !this.payload || this.payload.unavailable || this.isOwner) {
      return;
    }
    try {
      const pending = sessionStorage.getItem('dl.addShare');
      if (pending === this.shareId) {
        sessionStorage.removeItem('dl.addShare');
        void this.addToMyStuff();
      }
    } catch {}
  }

  private storeReturn(): void {
    try {
      sessionStorage.setItem('dl.postAuth', `/s/${this.shareId}`);
    } catch {}
  }

  private async refresh(): Promise<void> {
    if (!this.shareId) {
      this.loading = false;
      this.payload = null;
      return;
    }
    try {
      const next = await this.shareService.getPublicShare(this.shareId);
      this.payload = next;
      this.applySeo();
    } catch (error: unknown) {
      this.logger.error('Load share failed:', error);
      if (!this.payload) {
        this.payload = {
          shareId: this.shareId,
          kind: 'node',
          origin: 'personal',
          ownerName: '',
          title: 'This DashLink is unavailable',
          description: 'The original item may have been deleted.',
          coverImage: null,
          viewer: this.signedIn ? 'signed-in' : 'guest',
          openPath: null,
          node: null,
          collection: null,
          unavailable: true
        };
      }
    } finally {
      this.loading = false;
      this.viewerReady = true;
      this.maybeResumeAdd();
    }
  }

  private applySeo(): void {
    if (!this.payload) {
      return;
    }
    this.seo.apply({
      title: `${this.payload.title} · DashLink`,
      description: this.payload.description,
      path: `/s/${this.shareId}`,
      index: false
    });
  }
}
