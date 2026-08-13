import { Injectable, Inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { Meta, Title } from '@angular/platform-browser';
import { environment } from '../../environments/environment';

export interface SeoPage {
  title: string;
  description: string;
  path?: string;
  index?: boolean;
}

@Injectable({ providedIn: 'root' })
export class SeoService {
  private readonly siteUrl = environment.siteUrl.replace(/\/$/, '');

  constructor(
    private title: Title,
    private meta: Meta,
    @Inject(DOCUMENT) private document: Document
  ) {}

  applyForUrl(path: string): void {
    const clean = path.split('?')[0] || '/';
    if (clean === '/') {
      this.apply({
        title: 'DashLink — Organize links, notes, and teams',
        description: 'DashLink is a workspace for organizing links, notes, and collections. Build personal folders or collaborate in shared team workspaces with live sync.',
        path: '/',
        index: true
      });
      return;
    }
    if (clean === '/auth/login') {
      this.apply({
        title: 'Sign in · DashLink',
        description: 'Sign in to DashLink to open your collections, notes, and shared workspaces.',
        path: '/auth/login',
        index: true
      });
      return;
    }
    if (clean === '/auth/register') {
      this.apply({
        title: 'Create account · DashLink',
        description: 'Create a free DashLink account to organize personal collections or start a team workspace.',
        path: '/auth/register',
        index: true
      });
      return;
    }
    this.apply({
      title: this.title.getTitle() || 'DashLink',
      description: 'DashLink workspace — organize links, notes, and teams.',
      path: clean,
      index: false
    });
  }

  apply(page: SeoPage): void {
    const url = `${this.siteUrl}${page.path || '/'}`;
    const index = page.index !== false;

    this.title.setTitle(page.title);
    this.meta.updateTag({ name: 'description', content: page.description });
    this.meta.updateTag({ name: 'robots', content: index ? 'index, follow' : 'noindex, nofollow' });
    this.meta.updateTag({ property: 'og:title', content: page.title });
    this.meta.updateTag({ property: 'og:description', content: page.description });
    this.meta.updateTag({ property: 'og:url', content: url });
    this.meta.updateTag({ name: 'twitter:title', content: page.title });
    this.meta.updateTag({ name: 'twitter:description', content: page.description });
    this.setCanonical(url);
  }

  private setCanonical(url: string): void {
    let link = this.document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!link) {
      link = this.document.createElement('link');
      link.setAttribute('rel', 'canonical');
      this.document.head.appendChild(link);
    }
    link.setAttribute('href', url);
  }
}
