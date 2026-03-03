import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';

// PrimeNG Imports
import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';

import { AuthService } from '../../../services/auth.service';
import { ToastService } from '../../../services/toast.service';
import { LoggerService } from '../../../services/logger.service';
import { Router, ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    CardModule,
    InputTextModule,
    ButtonModule,
    MessageModule,
    IconFieldModule,
    InputIconModule
  ],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent {
  loginForm = new FormGroup({
    email: new FormControl('', [Validators.required, Validators.email]),
    password: new FormControl('', Validators.required)
  });

  private returnUrl: string = '/dashboard';

  constructor(
    private authService: AuthService, 
    private router: Router,
    private route: ActivatedRoute,
    private toastService: ToastService,
    private logger: LoggerService
  ) {
    this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/dashboard';
  }

  async onSubmit(): Promise<void> {
    if (this.loginForm.valid) {
      try {
        await this.authService.login(this.loginForm.value.email as string, this.loginForm.value.password as string);
        this.toastService.showSuccess('Login Successful', 'You have been successfully logged in.');
        this.router.navigateByUrl(this.returnUrl);
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
      this.router.navigateByUrl(this.returnUrl);
    } catch (error: unknown) {
      this.logger.error('Error signing in with Google:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred during Google sign-in.';
      this.toastService.showError('Google Sign-in Failed', errorMessage);
    }
  }

  goToRegister(): void {
    this.router.navigate(['/auth/register']);
  }
}
