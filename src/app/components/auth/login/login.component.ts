import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';

import { LogoComponent } from '../../brand/logo.component';
import { BtnComponent } from '../../../ui/btn.component';
import { IconComponent } from '../../../ui/icon.component';
import { AuthService } from '../../../services/auth.service';
import { ToastService } from '../../../services/toast.service';
import { LoggerService } from '../../../services/logger.service';
import { Router, ActivatedRoute } from '@angular/router';

@Component({
    selector: 'app-login',
    imports: [
        CommonModule,
        ReactiveFormsModule,
        LogoComponent,
        BtnComponent,
        IconComponent
    ],
    templateUrl: './login.component.html',
    changeDetection: ChangeDetectionStrategy.Eager,
    styleUrl: './login.component.scss'
})
export class LoginComponent {
  loginForm = new FormGroup({
    email: new FormControl('', [Validators.required, Validators.email]),
    password: new FormControl('', Validators.required)
  });

  private returnUrl: string = '/dashboard';
  showPassword = false;
  resetSending = false;

  constructor(
    private authService: AuthService, 
    private router: Router,
    private route: ActivatedRoute,
    private toastService: ToastService,
    private logger: LoggerService
  ) {
    this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/dashboard';
  }

  private afterAuthPath(): string {
    if (this.returnUrl && this.returnUrl !== '/dashboard' && this.returnUrl.startsWith('/') && !this.returnUrl.startsWith('/auth')) {
      return this.authService.consumePostAuthUrl(this.returnUrl);
    }
    return this.authService.consumePostAuthUrl('/dashboard');
  }

  async onSubmit(): Promise<void> {
    if (this.loginForm.valid) {
      try {
        await this.authService.login(this.loginForm.value.email as string, this.loginForm.value.password as string);
        this.toastService.showSuccess('Login Successful', 'You have been successfully logged in.');
        this.router.navigateByUrl(this.afterAuthPath());
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred during login.';
        this.toastService.showError('Login Failed', errorMessage);
        this.logger.error('Login error:', error);
      }
    }
  }

  async signInWithGoogle(): Promise<void> {
    try {
      await this.authService.signInWithGoogle();
      this.toastService.showSuccess('Google Sign-in Successful', 'You have been successfully signed in with Google.');
      this.router.navigateByUrl(this.afterAuthPath());
    } catch (error: unknown) {
      this.logger.error('Error signing in with Google:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred during Google sign-in.';
      this.toastService.showError('Google Sign-in Failed', errorMessage);
    }
  }

  async forgotPassword(): Promise<void> {
    const email = this.loginForm.get('email')?.value?.trim();
    if (!email || this.loginForm.get('email')?.invalid) {
      this.loginForm.get('email')?.markAsTouched();
      this.toastService.showInfo('Email needed', 'Enter your email above, then tap Forgot password.');
      return;
    }
    this.resetSending = true;
    try {
      await this.authService.sendPasswordReset(email);
      this.toastService.showSuccess('Reset email sent', 'Check your inbox for a password reset link.');
    } catch (error: unknown) {
      this.toastService.showError('Reset failed', 'Could not send a reset email. Check the address and try again.');
      this.logger.error('Password reset error:', error);
    } finally {
      this.resetSending = false;
    }
  }

  goToRegister(): void {
    const queryParams = this.returnUrl && this.returnUrl !== '/dashboard' ? { returnUrl: this.returnUrl } : {};
    this.router.navigate(['/auth/register'], { queryParams });
  }
}
