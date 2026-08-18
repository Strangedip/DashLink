import { Routes } from '@angular/router';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { LoginComponent } from './components/auth/login/login.component';
import { RegisterComponent } from './components/auth/register/register.component';
import { WorkspaceDashboardComponent } from './components/workspace/workspace-dashboard/workspace-dashboard.component';
import { WorkspaceOverviewComponent } from './components/workspace/workspace-overview/workspace-overview.component';
import { JoinWorkspaceComponent } from './components/workspace/join-workspace/join-workspace.component';
import { LandingComponent } from './components/landing/landing.component';
import { SharePageComponent } from './components/share/share-page.component';
import { authGuard } from './guards/auth.guard';
import { guestGuard } from './guards/guest.guard';

export const routes: Routes = [
  { path: '', component: LandingComponent, canActivate: [guestGuard], title: 'DashLink — Organize links, notes, and teams' },
  { path: 'auth/login', component: LoginComponent, canActivate: [guestGuard], title: 'Sign in · DashLink' },
  { path: 'auth/register', component: RegisterComponent, canActivate: [guestGuard], title: 'Create account · DashLink' },
  { path: 'dashboard', component: DashboardComponent, canActivate: [authGuard], title: 'Dashboard · DashLink' },
  { path: 'collections/:collectionId', component: DashboardComponent, canActivate: [authGuard], title: 'Collection · DashLink' },
  { path: 'workspaces/join/:inviteCode', component: JoinWorkspaceComponent, canActivate: [authGuard], title: 'Join workspace · DashLink' },
  { path: 'workspaces/:workspaceId/overview', component: WorkspaceOverviewComponent, canActivate: [authGuard], title: 'Workspace overview · DashLink' },
  { path: 'workspaces/:workspaceId', component: WorkspaceDashboardComponent, canActivate: [authGuard], title: 'Workspace · DashLink' },
  { path: 'workspaces/:workspaceId/collections/:collectionId', component: WorkspaceDashboardComponent, canActivate: [authGuard], title: 'Workspace · DashLink' },
  { path: 's/:shareId', component: SharePageComponent, title: 'Shared · DashLink' },
  { path: '**', redirectTo: '' }
];
