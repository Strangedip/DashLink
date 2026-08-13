import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-logo',
  imports: [RouterLink],
  template: `
    <a class="dl-logo" [routerLink]="link" [attr.aria-label]="label">
      <img src="/logo.svg" width="32" height="32" alt="" decoding="async">
      @if (showWordmark) {
        <span class="logo-word">DashLink</span>
      }
    </a>
  `,
  styles: [`
    .dl-logo {
      display: inline-flex;
      align-items: center;
      gap: 0.55rem;
      text-decoration: none;
      min-height: var(--dl-touch, 44px);
      color: inherit;
    }
    img {
      width: 2rem;
      height: 2rem;
      border-radius: 8px;
      display: block;
      flex-shrink: 0;
    }
    .logo-word {
      font-size: 1.2rem;
      font-weight: 700;
      letter-spacing: -0.03em;
      background: linear-gradient(135deg, #4caf50 0%, #a5d6a7 100%);
      -webkit-background-clip: text;
      background-clip: text;
      -webkit-text-fill-color: transparent;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LogoComponent {
  @Input() link = '/';
  @Input() showWordmark = true;
  @Input() label = 'DashLink home';
}
