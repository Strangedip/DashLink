import { Injectable } from '@angular/core';
import { Firestore, doc, getDoc, setDoc, updateDoc } from '@angular/fire/firestore';
import { Workspace, WorkspaceNode, WorkspaceCollection } from '../models/workspace.model';

export interface AIAnalysisData {
  workspace: {
    name: string;
    description: string;
    goal: string;
    rules?: string;
    duration?: string;
    penalty?: string;
    category?: string;
    tags?: string[];
    memberLimit: number;
    totalMembers: number;
    createdAt: string;
  };
  members: Array<{
    name: string;
    email: string;
    role: string;
    joinedAt: string;
    nodeCount: number;
    contributionPercent: number;
    banned: boolean;
  }>;
  nodes: Array<{
    name: string;
    creatorName: string;
    createdAt: string;
    fieldCount: number;
  }>;
  collections: Array<{
    name: string;
    createdBy: string;
  }>;
  stats: {
    totalNodes: number;
    totalCollections: number;
    avgNodesPerMember: number;
  };
}

export interface AIAnalysisResult {
  overallHealth: {
    score: number;
    summary: string;
  };
  memberAnalysis: Array<{
    memberName: string;
    memberEmail: string;
    analysis: string;
    warnings: string[];
    recommendations: string[];
    penalties?: string[];
  }>;
  teamInsights: {
    strengths: string[];
    concerns: string[];
    suggestions: string[];
  };
  customQuestionAnswer?: string;
}

export interface AIUsageStat {
  userId: string;
  workspaceId: string;
  totalCount: number;
  lastRunAt: Date | null;
}

@Injectable({
  providedIn: 'root'
})
export class AiAnalysisService {
  private readonly GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

  constructor(private firestore: Firestore) {}

  /** Returns how many total analyses this user has run in this workspace. */
  async getUsageStat(userId: string, workspaceId: string): Promise<AIUsageStat> {
    const usageRef = doc(this.firestore, `aiAnalysisUsage/${userId}_${workspaceId}`);
    const snap = await getDoc(usageRef);
    if (!snap.exists()) {
      return { userId, workspaceId, totalCount: 0, lastRunAt: null };
    }
    const data = snap.data();
    return {
      userId,
      workspaceId,
      totalCount: data['totalCount'] ?? 0,
      lastRunAt: data['lastRunAt']?.toDate?.() ?? null,
    };
  }

  /** Increments the usage counter after a successful analysis. */
  async incrementUsage(userId: string, workspaceId: string): Promise<void> {
    const usageRef = doc(this.firestore, `aiAnalysisUsage/${userId}_${workspaceId}`);
    const snap = await getDoc(usageRef);
    const now = new Date();

    if (!snap.exists()) {
      await setDoc(usageRef, {
        userId,
        workspaceId,
        totalCount: 1,
        lastRunAt: now,
      });
    } else {
      const current = snap.data()['totalCount'] ?? 0;
      await updateDoc(usageRef, {
        totalCount: current + 1,
        lastRunAt: now,
      });
    }
  }

  prepareAnalysisData(
    workspace: Workspace,
    members: any[],
    nodes: WorkspaceNode[],
    collections: WorkspaceCollection[]
  ): AIAnalysisData {
    const totalNodes = nodes.length;
    const memberNodeCounts = new Map<string, number>();

    nodes.forEach(node => {
      memberNodeCounts.set(node.creatorId, (memberNodeCounts.get(node.creatorId) || 0) + 1);
    });

    return {
      workspace: {
        name: workspace.name,
        description: workspace.description,
        goal: workspace.metadata.goal || '',
        rules: workspace.metadata.rules,
        duration: workspace.metadata.duration,
        penalty: workspace.metadata.penalty,
        category: workspace.metadata.category,
        tags: workspace.metadata.tags,
        memberLimit: workspace.memberLimit,
        totalMembers: members.length,
        createdAt: this.tsToIso(workspace.createdAt) || new Date().toISOString(),
      },
      members: members.map(m => ({
        name: m.displayName,
        email: m.email,
        role: m.role,
        joinedAt: this.tsToIso(m.joinedAt) || '',
        nodeCount: memberNodeCounts.get(m.userId) || 0,
        contributionPercent:
          totalNodes > 0
            ? Math.round(((memberNodeCounts.get(m.userId) || 0) / totalNodes) * 100)
            : 0,
        banned: m.banned,
      })),
      nodes: nodes.slice(0, 100).map(n => ({
        name: n.name,
        creatorName: n.creatorName,
        createdAt: this.tsToIso(n.createdAt) || '',
        fieldCount: n.fields?.length || 0,
      })),
      collections: collections.slice(0, 50).map(c => ({
        name: c.name,
        createdBy: c.createdBy,
      })),
      stats: {
        totalNodes,
        totalCollections: collections.length,
        avgNodesPerMember: members.length > 0 ? Math.round(totalNodes / members.length) : 0,
      },
    };
  }

  async analyzeWorkspace(
    apiKey: string,
    analysisData: AIAnalysisData,
    customQuestion?: string
  ): Promise<AIAnalysisResult> {
    const prompt = this.buildPrompt(analysisData, customQuestion);

    const response = await fetch(`${this.GEMINI_API_BASE}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.6,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 16384,
        },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `API Error: ${response.status}`);
    }

    const data = await response.json();
    const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!textResponse) {
      throw new Error('No response received from AI. Please try again.');
    }

    // Extract JSON — Gemini sometimes wraps it in markdown code blocks
    const jsonMatch = textResponse.match(/```(?:json)?\s*([\s\S]*?)\s*```/) ||
                      textResponse.match(/(\{[\s\S]*\})/);

    if (!jsonMatch) {
      throw new Error('AI returned an unexpected response format. Please try again.');
    }

    try {
      return JSON.parse(jsonMatch[1] || jsonMatch[0]);
    } catch {
      throw new Error('Could not parse the AI response. Please try again.');
    }
  }

  /** Safely converts a Firestore Timestamp or Date to an ISO string. */
  private tsToIso(value: any): string | null {
    if (!value) return null;
    if (typeof value.toDate === 'function') return value.toDate().toISOString();
    if (value instanceof Date) return value.toISOString();
    return null;
  }

  private buildPrompt(data: AIAnalysisData, customQuestion?: string): string {
    // Trim nodes to keep prompt size reasonable (top 50 is plenty for analysis)
    const trimmedData = {
      ...data,
      nodes: data.nodes.slice(0, 50),
    };

    const penaltyLine = data.workspace.penalty
      ? `   - Apply penalties based on this rule: "${data.workspace.penalty}"`
      : '';
    const rulesLine = data.workspace.rules
      ? `   - Check compliance with workspace rules: "${data.workspace.rules}"`
      : '';
    const customQLine = customQuestion
      ? `4. Answer this custom question based only on the data: "${customQuestion}"`
      : '';
    const customQField = customQuestion
      ? ',\n  "customQuestionAnswer": "<direct, concise answer>"'
      : '';

    return `You are an expert workspace analyst. Analyze the workspace data below and respond with ONLY a valid JSON object — no markdown, no code fences, no commentary before or after.

WORKSPACE DATA:
${JSON.stringify(trimmedData, null, 2)}

REQUIREMENTS:
1. Compute an overall workspace health score (integer 0–100) and write a 2–3 sentence summary.
2. For EVERY member in the data, provide:
   - A paragraph analysing their contribution and activity patterns
   - A "warnings" array (empty array [] if none)
   - A "recommendations" array with at least one personalised tip
   - A "penalties" array (empty array [] if no penalty rule exists or member is compliant)
${penaltyLine}
${rulesLine}
3. Provide 2–4 team-level strengths, concerns, and actionable suggestions each.
${customQLine}

OUTPUT — respond with exactly this JSON structure, no extra keys:
{"overallHealth":{"score":<integer 0-100>,"summary":"<2-3 sentences>"},"memberAnalysis":[{"memberName":"<name>","memberEmail":"<email>","analysis":"<paragraph>","warnings":[],"recommendations":["<tip>"],"penalties":[]}],"teamInsights":{"strengths":["<item>"],"concerns":["<item>"],"suggestions":["<item>"]}${customQField}}`;
  }
}
