import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';

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
    MessagesModule,
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
  messages: ToastMessageOptions[] = [];

  constructor(private authService: AuthService, private router: Router) { }

  async onSubmit(): Promise<void> {
    if (this.loginForm.valid) {
      this.messages = [];
      try {
        await this.authService.login(this.loginForm.value.email as string, this.loginForm.value.password as string);
        this.router.navigate(['/dashboard']);
      } catch (error: any) {
        this.messages = [{ severity: 'error', summary: 'Login Error', detail: error.message }];
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
