import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { filter, take } from 'rxjs';
import { AuthService } from './services/auth.service';
import { ToastService } from './services/toast.service';
import { LoggerService } from './services/logger.service';
import { SeoService } from './services/seo.service';
import { ShareService } from './services/share.service';
import { PreferencesService } from './services/preferences.service';
import { AvatarComponent } from './ui/avatar.component';
import { ToastHostComponent } from './ui/toast-host.component';
import { DialogHostComponent, DialogService } from './ui/dialog';
import { MenuHostComponent } from './ui/menu.component';
import { LogoComponent } from './components/brand/logo.component';
import { IconComponent } from './ui/icon.component';
import { ConfirmDialogComponent } from './components/confirm-dialog/confirm-dialog.component';

@Component({
    selector: 'app-root',
    imports: [
        RouterOutlet,
        CommonModule,
        AvatarComponent,
        ToastHostComponent,
        DialogHostComponent,
        MenuHostComponent,
        LogoComponent,
        IconComponent
    ],
    templateUrl: './app.component.html',
    changeDetection: ChangeDetectionStrategy.Eager,
    styleUrl: './app.component.scss'
})
export class AppComponent {
  isAuthRoute = false;
  accountOpen = false;
  accountName = '';
  accountEmail = '';
  nameDraft = '';
  editingName = false;
  savingName = false;
  showInstallHint = false;
  installHint = '';

  constructor(
    public authService: AuthService,
    private router: Router,
    private toastService: ToastService,
    private logger: LoggerService,
    private seo: SeoService,
    private dialogService: DialogService,
    private shareService: ShareService,
    private preferences: PreferencesService
  ) {
    this.authService.user$.subscribe(user => {
      this.preferences.setUser(user?.uid || null);
      this.accountName = user?.displayName || '';
      this.accountEmail = user?.email || '';
    });

    this.router.events.pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe(event => {
        const url = event.urlAfterRedirects.split('?')[0];
        this.isAuthRoute = url === '/' || url.startsWith('/auth') || url.startsWith('/s');
        this.seo.applyForUrl(url);
        this.accountOpen = false;
      });
  }

  userInitial(user: { displayName?: string | null; email?: string | null }): string {
    const source = this.accountName || user.displayName || user.email || 'U';
    return source.charAt(0).toUpperCase();
  }

  toggleAccount(event: Event): void {
    event.stopPropagation();
    this.accountOpen = !this.accountOpen;
    if (this.accountOpen) {
      this.nameDraft = this.accountName;
      this.editingName = !this.accountName;
      this.refreshInstallHint();
    }
  }

  closeAccount(): void {
    this.accountOpen = false;
    this.editingName = false;
  }

  async copyEmail(): Promise<void> {
    if (!this.accountEmail) {
      return;
    }
    const ok = await this.shareService.copy(this.accountEmail);
    this.toastService.showSuccess(ok ? 'Copied' : 'Copy failed', ok ? 'Email copied to clipboard.' : 'Could not copy email.');
  }

  async saveDisplayName(): Promise<void> {
    const name = this.nameDraft.trim();
    if (!name) {
      this.toastService.showInfo('Name needed', 'Enter a display name to save.');
      return;
    }
    this.savingName = true;
    try {
      await this.authService.updateDisplayName(name);
      this.accountName = name;
      this.editingName = false;
      this.toastService.showSuccess('Updated', 'Your display name was saved.');
    } catch (error: unknown) {
      this.toastService.showError('Update failed', 'Could not save your name.');
      this.logger.error('Display name update failed:', error);
    } finally {
      this.savingName = false;
    }
  }

  confirmLogout(): void {
    this.accountOpen = false;
    const ref = this.dialogService.open(ConfirmDialogComponent, {
      header: 'Log out',
      width: '24rem',
      data: {
        message: 'Log out of DashLink on this device?',
        confirmLabel: 'Log out',
        confirmIcon: 'sign-out',
        confirmVariant: 'primary'
      }
    });
    ref.onClose.pipe(take(1)).subscribe((ok) => {
      if (ok) {
        void this.logout();
      }
    });
  }

  async logout(): Promise<void> {
    try {
      await this.authService.logout();
      this.router.navigate(['/']);
      this.toastService.showSuccess('Logged out', 'See you next time.');
    } catch (error: unknown) {
      this.toastService.showError('Logout failed', 'Please try again.');
      this.logger.error('Error logging out:', error);
    }
  }

  private refreshInstallHint(): void {
    const standalone = window.matchMedia('(display-mode: standalone)').matches
      || ('standalone' in navigator && (navigator as Navigator & { standalone?: boolean }).standalone);
    this.showInstallHint = !standalone;
    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
    this.installHint = isIOS
      ? 'On iPhone: tap Share, then Add to Home Screen.'
      : 'Install DashLink from your browser menu for a home-screen app.';
  }
}
