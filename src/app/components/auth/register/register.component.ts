import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup, FormControl, Validators, AbstractControl, ValidatorFn } from '@angular/forms';

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

// Custom validator function
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
  templateUrl: './register.component.html',
  styleUrl: './register.component.scss'
})
export class RegisterComponent {
  registerForm = new FormGroup({
    email: new FormControl('', [Validators.required, Validators.email]),
    password: new FormControl('', [Validators.required, Validators.minLength(6)]),
    confirmPassword: new FormControl('', Validators.required)
  }, { validators: passwordMatchValidator });

  constructor(private authService: AuthService, private router: Router, private toastService: ToastService) { }

  async onSubmit(): Promise<void> {
    if (this.registerForm.valid) {
      try {
        await this.authService.register(this.registerForm.value.email as string, this.registerForm.value.password as string);
        this.toastService.showSuccess('Registration Successful', 'You have been successfully registered.');
        this.router.navigate(['/dashboard']);
      } catch (error: any) {
        this.toastService.showError('Registration Failed', error.message || 'An unknown error occurred during registration.');
      }
    }
  }

  async signInWithGoogle(): Promise<void> {
    try {
      await this.authService.signInWithGoogle();
      this.toastService.showSuccess('Google Sign-up Successful', 'You have been successfully signed up with Google.');
      this.router.navigate(['/']);
    } catch (error: any) {
      console.error('Error signing in with Google:', error);
      this.toastService.showError('Google Sign-up Failed', error.message || 'An unknown error occurred during Google sign-in.');
    }
  }

  goToLogin(): void {
    this.router.navigate(['/auth/login']);
  }
}
