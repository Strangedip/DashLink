import { Component } from '@angular/core';
import { RouterOutlet, Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from './services/auth.service';
import { ToastService } from './services/toast.service';

// PrimeNG Imports
import { MenubarModule } from 'primeng/menubar';
import { MenuItem } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { TieredMenuModule } from 'primeng/tieredmenu';
import { AvatarModule } from 'primeng/avatar';
import { StyleClassModule } from 'primeng/styleclass';
import { PanelMenuModule } from 'primeng/panelmenu';
import { DialogModule } from 'primeng/dialog';
import { SidebarModule } from 'primeng/sidebar';
import { ToastModule } from 'primeng/toast';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet,
    CommonModule,
    ButtonModule,
    TieredMenuModule,
    AvatarModule,
    StyleClassModule,
    PanelMenuModule,
    RouterLink,
    DialogModule,
    SidebarModule,
    ToastModule,
    MenubarModule
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  title = 'DashLink';
  currentYear = new Date().getFullYear();
  userMenuItems: MenuItem[] = [];
  sidebarMenuItems: MenuItem[] = [];
  sidebarVisible: boolean = false; // For responsive sidebar

  constructor(public authService: AuthService, private router: Router, private toastService: ToastService) {
    this.authService.user$.subscribe(user => {
      if (user) {
        this.userMenuItems = [
          { label: 'Logout', icon: 'pi pi-sign-out', command: () => this.logout() }
        ];
        this.sidebarMenuItems = [
          { label: 'Dashboard', icon: 'pi pi-chart-line', routerLink: '/dashboard' },
          { label: 'Profile', icon: 'pi pi-user', routerLink: '/profile' }
        ];
      } else {
        this.userMenuItems = [];
        this.sidebarMenuItems = [
          { label: 'Login', icon: 'pi pi-sign-in', routerLink: '/auth/login' },
          { label: 'Register', icon: 'pi pi-user-plus', routerLink: '/auth/register' }
        ];
      }
    });
  }

  async logout(): Promise<void> {
    try {
      await this.authService.logout();
      this.router.navigate(['/auth/login']);
      this.toastService.showSuccess('Logged Out', 'You have been successfully logged out.');
    } catch (error) {
      this.toastService.showError('Logout Failed', 'There was an error logging out. Please try again.');
      console.error('Error logging out:', error);
    }
  }
}
