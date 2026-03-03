import { Component, OnInit, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DynamicDialogRef, DynamicDialogConfig } from 'primeng/dynamicdialog';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import { Textarea } from 'primeng/inputtextarea';
import { ProgressBarModule } from 'primeng/progressbar';
import { Workspace, WorkspaceNode, WorkspaceCollection, WorkspaceMember } from '../../../models/workspace.model';
import { AiAnalysisService, AIAnalysisData, AIAnalysisResult, AIUsageStat } from '../../../services/ai-analysis.service';

type Phase = 'input' | 'analyzing' | 'results' | 'error';

@Component({
  selector: 'app-ai-analysis-dialog',
  standalone: true,
  imports: [
    CommonModule, FormsModule, ButtonModule, MessageModule,
    Textarea, ProgressBarModule
  ],
  templateUrl: './ai-analysis-dialog.component.html',
  styleUrl: './ai-analysis-dialog.component.scss'
})
export class AiAnalysisDialogComponent implements OnInit {
  workspace!: Workspace;
  members!: WorkspaceMember[];
  nodes!: WorkspaceNode[];
  collections!: WorkspaceCollection[];
  userId!: string;

  phase: Phase = 'input';
  errorMessage = '';
  customQuestion = '';

  analysisData!: AIAnalysisData;
  result: AIAnalysisResult | null = null;

  hasApiKey = false;
  usageStat: AIUsageStat | null = null;
  isAnalyzing = false;

  constructor(
    public ref: DynamicDialogRef,
    @Inject(DynamicDialogConfig) public config: DynamicDialogConfig,
    private aiService: AiAnalysisService
  ) {}

  async ngOnInit(): Promise<void> {
    this.workspace = this.config.data.workspace;
    this.members = this.config.data.members;
    this.nodes = this.config.data.nodes;
    this.collections = this.config.data.collections;
    this.userId = this.config.data.userId;

    this.hasApiKey = !!(this.workspace.aiApiKey?.trim());

    this.analysisData = this.aiService.prepareAnalysisData(
      this.workspace,
      this.members,
      this.nodes,
      this.collections
    );

    if (!this.hasApiKey) {
      this.phase = 'error';
      this.errorMessage = 'No AI API key configured for this workspace. The workspace owner needs to add a Google Gemini API key in workspace settings.';
      return;
    }

    // Load usage stats (fire-and-forget; non-blocking)
    this.aiService.getUsageStat(this.userId, this.workspace.id!).then(stat => {
      this.usageStat = stat;
    });
  }

  async runAnalysis(): Promise<void> {
    if (!this.hasApiKey || this.isAnalyzing) return;

    this.isAnalyzing = true;
    this.phase = 'analyzing';

    try {
      const result = await this.aiService.analyzeWorkspace(
        this.workspace.aiApiKey!,
        this.analysisData,
        this.customQuestion.trim() || undefined
      );

      // Increment counter (fire-and-forget; doesn't block showing results)
      this.aiService.incrementUsage(this.userId, this.workspace.id!).then(() => {
        // Refresh usage stat so the updated count shows
        this.aiService.getUsageStat(this.userId, this.workspace.id!).then(stat => {
          this.usageStat = stat;
        });
      });

      this.result = result;
      this.phase = 'results';
    } catch (error: any) {
      console.error('AI Analysis failed:', error);
      this.errorMessage = this.humaniseError(error);
      this.phase = 'error';
    } finally {
      this.isAnalyzing = false;
    }
  }

  private humaniseError(error: any): string {
    const msg: string = error?.message || String(error);
    if (msg.includes('API_KEY_INVALID') || msg.toLowerCase().includes('invalid api key') || msg.includes('400')) {
      return 'Invalid API key. Please check the Google Gemini API key saved in workspace settings.';
    }
    if (msg.toLowerCase().includes('quota') || msg.toLowerCase().includes('rate limit') || msg.includes('429')) {
      return 'Gemini API quota exceeded. Please wait a moment and try again, or check your Google Cloud quota.';
    }
    if (msg.includes('PERMISSION_DENIED') || msg.includes('403')) {
      return 'Permission denied. Ensure the Gemini API is enabled for your API key at console.cloud.google.com.';
    }
    if (msg.toLowerCase().includes('network') || msg.toLowerCase().includes('fetch')) {
      return 'Network error. Please check your connection and try again.';
    }
    return `Analysis failed: ${msg}`;
  }

  backToInput(): void {
    this.phase = 'input';
    this.result = null;
    this.errorMessage = '';
  }

  close(): void {
    this.ref.close();
  }

  getHealthColor(score: number): string {
    if (score >= 80) return 'var(--p-green-500)';
    if (score >= 60) return '#FFA726';
    return '#EF5350';
  }

  getHealthLabel(score: number): string {
    if (score >= 80) return 'Healthy';
    if (score >= 60) return 'Moderate';
    return 'Needs Attention';
  }

  getMemberInitial(name: string): string {
    return name?.charAt(0)?.toUpperCase() || 'U';
  }

  get lastRunLabel(): string {
    if (!this.usageStat?.lastRunAt) return 'Never run before';
    const d = this.usageStat.lastRunAt;
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return d.toLocaleDateString();
  }
}
