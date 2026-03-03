import { Routes } from '@angular/router';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { LoginComponent } from './components/auth/login/login.component';
import { RegisterComponent } from './components/auth/register/register.component';
import { WorkspaceDashboardComponent } from './components/workspace/workspace-dashboard/workspace-dashboard.component';
import { WorkspaceOverviewComponent } from './components/workspace/workspace-overview/workspace-overview.component';
import { JoinWorkspaceComponent } from './components/workspace/join-workspace/join-workspace.component';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  { path: 'auth/login', component: LoginComponent },
  { path: 'auth/register', component: RegisterComponent },
  { path: 'dashboard', component: DashboardComponent, canActivate: [authGuard] },
  { path: 'collections/:collectionId', component: DashboardComponent, canActivate: [authGuard] },
  { path: 'workspaces/join/:inviteCode', component: JoinWorkspaceComponent, canActivate: [authGuard] },
  { path: 'workspaces/:workspaceId/overview', component: WorkspaceOverviewComponent, canActivate: [authGuard] },
  { path: 'workspaces/:workspaceId', component: WorkspaceDashboardComponent, canActivate: [authGuard] },
  { path: 'workspaces/:workspaceId/collections/:collectionId', component: WorkspaceDashboardComponent, canActivate: [authGuard] },
  { path: '**', redirectTo: 'dashboard' }
];
