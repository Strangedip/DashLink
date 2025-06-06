import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup, FormControl, Validators, AbstractControl, ValidatorFn } from '@angular/forms';

// PrimeNG Imports
import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import { MessagesModule } from 'primeng/messages';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { MessageService, ToastMessageOptions } from 'primeng/api';

import { AuthService } from '../../../services/auth.service';
import { Router } from '@angular/router';

// Custom validator function
export const passwordMatchValidator: ValidatorFn = (control: AbstractControl): { [key: string]: boolean } | null => {
  const form = control as FormGroup;
  const password = form.get('password');
  const confirmPassword = form.get('confirmPassword');
  
  if (!password || !confirmPassword) {
    return null; // Don't validate if controls are not present
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
    MessagesModule,
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
  messages: ToastMessageOptions[] = [];

  constructor(private authService: AuthService, private router: Router) { }

  async onSubmit(): Promise<void> {
    if (this.registerForm.valid) {
      this.messages = [];
      try {
        await this.authService.register(this.registerForm.value.email as string, this.registerForm.value.password as string);
        this.router.navigate(['/dashboard']);
      } catch (error: any) {
        this.messages = [{ severity: 'error', summary: 'Registration Error', detail: error.message }];
      }
    }
  }

  async signInWithGoogle(): Promise<void> {
    try {
      await this.authService.signInWithGoogle();
      this.router.navigate(['/']);
    } catch (error: any) {
      console.error('Error signing in with Google:', error);
      this.messages = [{ severity: 'error', summary: 'Google Sign-in Error', detail: error.message }];
    }
  }
}
