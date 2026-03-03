import { Component, OnInit, DestroyRef } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { combineLatest, filter, switchMap, take } from 'rxjs';
import { DialogService, DynamicDialogRef } from 'primeng/dynamicdialog';
import { ButtonModule } from 'primeng/button';
import { AvatarModule } from 'primeng/avatar';
import { TooltipModule } from 'primeng/tooltip';
import { SelectModule } from 'primeng/select';
import { ProgressBarModule } from 'primeng/progressbar';
import { Workspace, WorkspaceNode, WorkspaceMember } from '../../../models/workspace.model';
import { WorkspaceService } from '../../../services/workspace.service';
import { AuthService } from '../../../services/auth.service';
import { ViewWorkspaceNodeDialogComponent } from '../view-workspace-node-dialog/view-workspace-node-dialog.component';
import { AiAnalysisDialogComponent } from '../ai-analysis-dialog/ai-analysis-dialog.component';

interface MemberStat {
  member: WorkspaceMember;
  nodeCount: number;
  lastActivity: Date | null;
}

interface NodeRow {
  node: WorkspaceNode;
  createdAt: Date;
}

@Component({
  selector: 'app-workspace-overview',
  standalone: true,
  imports: [
    CommonModule, FormsModule, ButtonModule, AvatarModule,
    TooltipModule, SelectModule, ProgressBarModule
  ],
  providers: [DatePipe],
  templateUrl: './workspace-overview.component.html',
  styleUrl: './workspace-overview.component.scss'
})
export class WorkspaceOverviewComponent implements OnInit {
  workspace: Workspace | null = null;
  workspaceId: string | null = null;
  allNodes: WorkspaceNode[] = [];
  allCollections: any[] = [];
  currentUserId: string | null = null;

  totalNodes = 0;
  totalCollections = 0;
  activeMembers: WorkspaceMember[] = [];
  memberStats: MemberStat[] = [];
  recentNodes: NodeRow[] = [];
  topContributor: MemberStat | null = null;

  sortOptions = [
    { label: 'Most Nodes', value: 'nodes-desc' },
    { label: 'Fewest Nodes', value: 'nodes-asc' },
    { label: 'Name A–Z', value: 'name-asc' },
    { label: 'Name Z–A', value: 'name-desc' },
    { label: 'Recent Activity', value: 'recent' },
  ];
  selectedSort = 'nodes-desc';

  recentSortOptions = [
    { label: 'Newest First', value: 'newest' },
    { label: 'Oldest First', value: 'oldest' },
    { label: 'Name A–Z', value: 'name-asc' },
    { label: 'Name Z–A', value: 'name-desc' },
    { label: 'Creator', value: 'creator' },
  ];
  selectedRecentSort = 'newest';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private workspaceService: WorkspaceService,
    private authService: AuthService,
    private dialogService: DialogService,
    private destroyRef: DestroyRef,
    private datePipe: DatePipe
  ) {}

  ngOnInit(): void {
    this.route.paramMap.pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(params => {
      this.workspaceId = params.get('workspaceId');
      if (this.workspaceId) {
        this.loadData();
      }
    });
  }

  private loadData(): void {
    combineLatest([
      this.workspaceService.getWorkspace(this.workspaceId!),
      this.workspaceService.getAllWorkspaceNodes(this.workspaceId!),
      this.workspaceService.getWorkspaceCollections(this.workspaceId!, null),
      this.authService.user$
    ]).pipe(take(1)).subscribe(([workspace, allNodes, collections, user]) => {
      this.workspace = workspace;
      this.allNodes = allNodes;
      this.allCollections = collections;
      this.totalCollections = collections.length;
      this.currentUserId = user?.uid || null;

      this.activeMembers = this.workspace.members?.filter(m => !m.banned) || [];
      this.totalNodes = this.allNodes.length;

      this.buildMemberStats();
      this.buildRecentNodes();
      this.sortMembers();
      this.sortRecentNodes();
    });
  }

  private buildMemberStats(): void {
    const statMap = new Map<string, MemberStat>();

    for (const member of this.activeMembers) {
      statMap.set(member.userId, {
        member,
        nodeCount: 0,
        lastActivity: null
      });
    }

    for (const node of this.allNodes) {
      const stat = statMap.get(node.creatorId);
      if (stat) {
        stat.nodeCount++;
        const nodeDate = this.toDate(node.createdAt);
        if (nodeDate && (!stat.lastActivity || nodeDate > stat.lastActivity)) {
          stat.lastActivity = nodeDate;
        }
      }
    }

    this.memberStats = Array.from(statMap.values());
    this.topContributor = this.memberStats.length > 0
      ? this.memberStats.reduce((a, b) => a.nodeCount >= b.nodeCount ? a : b)
      : null;
  }

  private buildRecentNodes(): void {
    this.recentNodes = this.allNodes.map(node => ({
      node,
      createdAt: this.toDate(node.createdAt) || new Date(0)
    }));
  }

  sortMembers(): void {
    const stats = [...this.memberStats];
    switch (this.selectedSort) {
      case 'nodes-desc': stats.sort((a, b) => b.nodeCount - a.nodeCount); break;
      case 'nodes-asc': stats.sort((a, b) => a.nodeCount - b.nodeCount); break;
      case 'name-asc': stats.sort((a, b) => a.member.displayName.localeCompare(b.member.displayName)); break;
      case 'name-desc': stats.sort((a, b) => b.member.displayName.localeCompare(a.member.displayName)); break;
      case 'recent': stats.sort((a, b) => (b.lastActivity?.getTime() || 0) - (a.lastActivity?.getTime() || 0)); break;
    }
    this.memberStats = stats;
  }

  sortRecentNodes(): void {
    const nodes = [...this.recentNodes];
    switch (this.selectedRecentSort) {
      case 'newest': nodes.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()); break;
      case 'oldest': nodes.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime()); break;
      case 'name-asc': nodes.sort((a, b) => a.node.name.localeCompare(b.node.name)); break;
      case 'name-desc': nodes.sort((a, b) => b.node.name.localeCompare(a.node.name)); break;
      case 'creator': nodes.sort((a, b) => a.node.creatorName.localeCompare(b.node.creatorName)); break;
    }
    this.recentNodes = nodes;
  }

  getContributionPercent(count: number): number {
    return this.totalNodes > 0 ? Math.round((count / this.totalNodes) * 100) : 0;
  }

  getMemberInitial(member: WorkspaceMember): string {
    return (member.displayName || 'U').charAt(0).toUpperCase();
  }

  formatDate(ts: any): string {
    const d = this.toDate(ts);
    if (!d) return '—';
    return this.datePipe.transform(d, 'MMM d, y, h:mm a') || '—';
  }

  formatShortDate(ts: any): string {
    const d = this.toDate(ts);
    if (!d) return '—';
    return this.datePipe.transform(d, 'MMM d, y') || '—';
  }

  private toDate(ts: any): Date | null {
    if (!ts) return null;
    if (typeof ts === 'object' && 'toDate' in ts && typeof ts.toDate === 'function') return ts.toDate();
    if (ts instanceof Date) return ts;
    return null;
  }

  goBack(): void {
    this.router.navigate(['/workspaces', this.workspaceId]);
  }

  goToDashboard(): void {
    this.router.navigate(['/dashboard']);
  }

  viewNode(node: WorkspaceNode): void {
    this.dialogService.open(ViewWorkspaceNodeDialogComponent, {
      header: node.name ?? 'Node Details',
      width: '550px',
      style: { 'max-width': '96vw' },
      dismissableMask: true,
      data: { node }
    });
  }

  openAIAnalysis(): void {
    if (!this.workspace || !this.currentUserId) return;

    this.dialogService.open(AiAnalysisDialogComponent, {
      header: 'AI Workspace Analysis',
      width: '700px',
      style: { 'max-width': '96vw', 'max-height': '90vh' },
      dismissableMask: true,
      data: {
        workspace: this.workspace,
        members: this.activeMembers,
        nodes: this.allNodes,
        collections: this.allCollections,
        userId: this.currentUserId
      }
    });
  }
}
