import { Component, ChangeDetectionStrategy } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { BtnComponent } from '../../ui/btn.component';
import { IconComponent } from '../../ui/icon.component';
import { LogoComponent } from '../brand/logo.component';

@Component({
  selector: 'app-landing',
  imports: [RouterLink, BtnComponent, IconComponent, LogoComponent],
  templateUrl: './landing.component.html',
  styleUrl: './landing.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LandingComponent {
  readonly year = new Date().getFullYear();

  constructor(private router: Router) {}

  go(path: string): void {
    this.router.navigateByUrl(path);
  }
}
