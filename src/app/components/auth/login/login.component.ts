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
import { Router } from '@angular/router';

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

  constructor(private authService: AuthService, private router: Router, private toastService: ToastService) { }

  async onSubmit(): Promise<void> {
    if (this.loginForm.valid) {
      try {
        await this.authService.login(this.loginForm.value.email as string, this.loginForm.value.password as string);
        this.toastService.showSuccess('Login Successful', 'You have been successfully logged in.');
        this.router.navigate(['/dashboard']);
      } catch (error: any) {
        this.toastService.showError('Login Failed', error.message || 'An unknown error occurred during login.');
      }
    }
  }

  async signInWithGoogle(): Promise<void> {
    try {
      await this.authService.signInWithGoogle();
      this.toastService.showSuccess('Google Sign-in Successful', 'You have been successfully signed in with Google.');
      this.router.navigate(['/']);
    } catch (error: any) {
      console.error('Error signing in with Google:', error);
      this.toastService.showError('Google Sign-in Failed', error.message || 'An unknown error occurred during Google sign-in.');
    }
  }

  goToRegister(): void {
    this.router.navigate(['/auth/register']);
  }
}
