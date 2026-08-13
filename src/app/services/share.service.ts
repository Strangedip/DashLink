import { Injectable } from '@angular/core';
import { Node } from '../models/data.model';
import { WorkspaceNode } from '../models/workspace.model';

@Injectable({ providedIn: 'root' })
export class ShareService {
  primaryUrlFromNode(node: Node | null | undefined): string | null {
    if (!node) {
      return null;
    }
    if (Array.isArray(node.customFields)) {
      const urlField = node.customFields.find(field => field.fieldType === 'url' && field.fieldValue);
      if (urlField) {
        return this.toHref(String(urlField.fieldValue), true);
      }
    }
    return this.toHref(node.name, false);
  }

  primaryUrlFromWorkspaceNode(node: WorkspaceNode | null | undefined): string | null {
    if (!node) {
      return null;
    }
    const urlField = node.fields?.find(field => field.fieldType === 'url' && field.value);
    if (urlField) {
      return this.toHref(String(urlField.value), true);
    }
    return this.toHref(node.name, false);
  }

  open(url: string): void {
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  async copy(text: string): Promise<boolean> {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      return false;
    }
  }

  async share(payload: { title: string; text?: string; url?: string }): Promise<'shared' | 'copied' | 'failed'> {
    const shareUrl = payload.url || '';
    const shareText = payload.text || payload.title;
    if (navigator.share) {
      try {
        await navigator.share({
          title: payload.title,
          text: shareText,
          url: shareUrl || undefined
        });
        return 'shared';
      } catch (error: unknown) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return 'failed';
        }
      }
    }
    const copied = await this.copy([payload.title, shareText, shareUrl].filter(Boolean).join('\n'));
    return copied ? 'copied' : 'failed';
  }

  private toHref(value: string | null | undefined, allowBare: boolean): string | null {
    if (!value) {
      return null;
    }
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }
    if (/^https?:\/\//i.test(trimmed)) {
      return trimmed;
    }
    if (/^www\./i.test(trimmed)) {
      return `https://${trimmed}`;
    }
    if (allowBare && /^[\w.-]+\.[a-z]{2,}([/:?#].*)?$/i.test(trimmed)) {
      return `https://${trimmed}`;
    }
    return null;
  }
}
