import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup, FormControl, Validators, AbstractControl, ValidatorFn } from '@angular/forms';

import { LogoComponent } from '../../brand/logo.component';
import { BtnComponent } from '../../../ui/btn.component';
import { IconComponent } from '../../../ui/icon.component';
import { AuthService } from '../../../services/auth.service';
import { ToastService } from '../../../services/toast.service';
import { LoggerService } from '../../../services/logger.service';
import { Router, ActivatedRoute } from '@angular/router';

export const passwordMatchValidator: ValidatorFn = (control: AbstractControl): { [key: string]: boolean } | null => {
  const form = control as FormGroup;
  const password = form.get('password');
  const confirmPassword = form.get('confirmPassword');
  
  if (!password || !confirmPassword) {
    return null;
  }

  return password.value !== confirmPassword.value ? { 'passwordMismatch': true } : null;
};

@Component({
    selector: 'app-register',
    imports: [
        CommonModule,
        ReactiveFormsModule,
        LogoComponent,
        BtnComponent,
        IconComponent
    ],
    templateUrl: './register.component.html',
    changeDetection: ChangeDetectionStrategy.Eager,
    styleUrl: './register.component.scss'
})
export class RegisterComponent {
  registerForm = new FormGroup({
    email: new FormControl('', [Validators.required, Validators.email]),
    password: new FormControl('', [Validators.required, Validators.minLength(6)]),
    confirmPassword: new FormControl('', Validators.required)
  }, { validators: passwordMatchValidator });

  showPassword = false;
  showConfirmPassword = false;
  private returnUrl = '/dashboard';

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
    if (this.registerForm.valid) {
      try {
        await this.authService.register(this.registerForm.value.email as string, this.registerForm.value.password as string);
        this.toastService.showSuccess('Registration Successful', 'You have been successfully registered.');
        this.router.navigateByUrl(this.afterAuthPath());
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred during registration.';
        this.toastService.showError('Registration Failed', errorMessage);
        this.logger.error('Registration error:', error);
      }
    }
  }

  async signInWithGoogle(): Promise<void> {
    try {
      await this.authService.signInWithGoogle();
      this.toastService.showSuccess('Google Sign-up Successful', 'You have been successfully signed up with Google.');
      this.router.navigateByUrl(this.afterAuthPath());
    } catch (error: unknown) {
      this.logger.error('Error signing in with Google:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred during Google sign-in.';
      this.toastService.showError('Google Sign-up Failed', errorMessage);
    }
  }

  goToLogin(): void {
    const queryParams = this.returnUrl && this.returnUrl !== '/dashboard' ? { returnUrl: this.returnUrl } : {};
    this.router.navigate(['/auth/login'], { queryParams });
  }
}
