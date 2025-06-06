import { Component } from '@angular/core';
import { RouterOutlet, Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from './services/auth.service';

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

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet,
    CommonModule,
    MenubarModule,
    ButtonModule,
    TieredMenuModule,
    AvatarModule,
    StyleClassModule,
    PanelMenuModule,
    RouterLink,
    DialogModule,
    SidebarModule,
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

  constructor(public authService: AuthService, private router: Router) {
    this.authService.user$.subscribe(user => {
      if (user) {
        this.userMenuItems = [
          { label: 'Logout', icon: 'pi pi-sign-out', command: () => this.logout() }
        ];
        this.sidebarMenuItems = [
          { label: 'Home', icon: 'pi pi-home', routerLink: '/' },
          { label: 'Dashboard', icon: 'pi pi-chart-line', routerLink: '/dashboard' },
          { label: 'Profile', icon: 'pi pi-user', routerLink: '/profile' },
          { label: 'Showcase', icon: 'pi pi-prime', routerLink: '/material-showcase' } // Renamed for now
        ];
      } else {
        this.userMenuItems = [];
        this.sidebarMenuItems = [
          { label: 'Home', icon: 'pi pi-home', routerLink: '/' },
          { label: 'Login', icon: 'pi pi-sign-in', routerLink: '/login' },
          { label: 'Register', icon: 'pi pi-user-plus', routerLink: '/register' },
          { label: 'Showcase', icon: 'pi pi-prime', routerLink: '/material-showcase' } // Renamed for now
        ];
      }
    });
  }

  async logout(): Promise<void> {
    try {
      await this.authService.logout();
      this.router.navigate(['/login']);
    } catch (error) {
      console.error('Error logging out:', error);
    }
  }
}
