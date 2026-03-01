import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/api.services';

@Component({
  selector: 'kdi-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="login-page">
      <div class="login-left">
        <div class="login-brand">
          <div class="brand-logo">🏢</div>
          <h1 class="brand-name">Khalifat Djické<br><span>Immobilier</span></h1>
          <p class="brand-tagline">Système de gestion immobilière professionnelle</p>
        </div>
        <div class="login-features">
          <div class="feature-item"><span class="fi-icon">🏠</span><span>Gestion patrimoine & loyers</span></div>
          <div class="feature-item"><span class="fi-icon">💰</span><span>Suivi collectes hebdomadaires</span></div>
          <div class="feature-item"><span class="fi-icon">📊</span><span>Tableau de bord temps réel</span></div>
          <div class="feature-item"><span class="fi-icon">🔔</span><span>Alertes automatiques retards</span></div>
        </div>
      </div>

      <div class="login-right">
        <div class="login-box">
          <div class="login-header">
            <h2>Connexion</h2>
            <p>Accédez à votre espace de gestion</p>
          </div>

          <form [formGroup]="form" (ngSubmit)="submit()">
            <div class="form-group">
              <label>Adresse email</label>
              <div class="input-wrap">
                <span class="input-icon">✉️</span>
                <input formControlName="email" type="email" class="form-input"
                       placeholder="vous@kdi-immo.mr" autocomplete="email">
              </div>
              <span class="form-error" *ngIf="form.get('email')?.invalid && form.get('email')?.touched">
                Email invalide
              </span>
            </div>

            <div class="form-group">
              <label>Mot de passe</label>
              <div class="input-wrap">
                <span class="input-icon">🔒</span>
                <input formControlName="motDePasse" [type]="showPwd ? 'text' : 'password'"
                       class="form-input" placeholder="••••••••" autocomplete="current-password">
                <button type="button" class="toggle-pwd" (click)="showPwd = !showPwd">
                  {{ showPwd ? '🙈' : '👁' }}
                </button>
              </div>
            </div>

            <div class="error-msg" *ngIf="erreur">{{ erreur }}</div>

            <button type="submit" class="btn-login" [disabled]="form.invalid || loading">
              <span *ngIf="loading" class="btn-spinner"></span>
              {{ loading ? 'Connexion en cours…' : 'Se connecter' }}
            </button>
          </form>

          <div class="login-footer">
            <p>Version 1.0 — Nouakchott, Mauritanie</p>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .login-page {
      display: flex; min-height: 100vh; font-family: 'Inter', sans-serif;
    }

    /* ── Left ── */
    .login-left {
      flex: 1; background: linear-gradient(160deg, #0c1a35 0%, #1a3060 60%, #0c1a35 100%);
      display: flex; flex-direction: column; justify-content: center;
      padding: 60px; color: #fff;
    }

    .brand-logo { font-size: 56px; margin-bottom: 20px; }
    .brand-name { font-size: 36px; font-weight: 300; margin: 0 0 12px; line-height: 1.2; }
    .brand-name span { font-weight: 700; color: #c8a96e; }
    .brand-tagline { font-size: 16px; color: rgba(255,255,255,.6); margin-bottom: 48px; }

    .login-features { display: flex; flex-direction: column; gap: 16px; }
    .feature-item { display: flex; align-items: center; gap: 14px; font-size: 15px; color: rgba(255,255,255,.85); }
    .fi-icon { font-size: 22px; width: 36px; height: 36px; background: rgba(200,169,110,.2); border-radius: 10px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }

    /* ── Right ── */
    .login-right {
      width: 480px; flex-shrink: 0; background: #f8fafc;
      display: flex; align-items: center; justify-content: center; padding: 40px;
    }

    .login-box {
      width: 100%; background: #fff; border-radius: 20px;
      padding: 44px; box-shadow: 0 4px 24px rgba(0,0,0,.08);
    }

    .login-header { margin-bottom: 32px; }
    .login-header h2 { font-size: 28px; font-weight: 700; color: #0c1a35; margin: 0 0 6px; }
    .login-header p { font-size: 14px; color: #64748b; margin: 0; }

    .form-group { margin-bottom: 20px; display: flex; flex-direction: column; gap: 8px; }
    label { font-size: 13px; font-weight: 600; color: #374151; }

    .input-wrap { position: relative; display: flex; align-items: center; }
    .input-icon { position: absolute; left: 14px; font-size: 16px; z-index: 1; pointer-events: none; }
    .form-input {
      width: 100%; padding: 12px 42px 12px 44px;
      border: 2px solid #e2e8f0; border-radius: 10px; font-size: 15px;
      transition: border-color .15s; box-sizing: border-box;
    }
    .form-input:focus { outline: none; border-color: #0c1a35; }
    .toggle-pwd { position: absolute; right: 12px; background: none; border: none; cursor: pointer; font-size: 16px; padding: 4px; }

    .form-error { font-size: 12px; color: #dc2626; }
    .error-msg { background: #fee2e2; color: #991b1b; padding: 10px 14px; border-radius: 8px; font-size: 13px; margin-bottom: 16px; }

    .btn-login {
      width: 100%; padding: 14px; background: #0c1a35; color: #fff;
      border: none; border-radius: 10px; font-size: 16px; font-weight: 600;
      cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 10px;
      transition: background .15s;
    }
    .btn-login:hover:not(:disabled) { background: #1a2d52; }
    .btn-login:disabled { opacity: .6; cursor: not-allowed; }
    .btn-spinner { width: 18px; height: 18px; border: 2px solid rgba(255,255,255,.3); border-top-color: #fff; border-radius: 50%; animation: spin .7s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }

    .login-footer { text-align: center; margin-top: 28px; font-size: 12px; color: #94a3b8; }

    @media (max-width: 768px) {
      .login-left { display: none; }
      .login-right { width: 100%; }
    }
  `]
})
export class LoginComponent {
  private fb     = inject(FormBuilder);
  private auth   = inject(AuthService);
  private router = inject(Router);

  form = this.fb.group({
    email:     ['', [Validators.required, Validators.email]],
    motDePasse:['', Validators.required]
  });

  loading  = false;
  erreur   = '';
  showPwd  = false;

  submit() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.loading = true;
    this.erreur  = '';
    this.auth.login(this.form.value as any).subscribe({
      next: (resp) => {
        this.auth.saveSession(resp);
        this.router.navigate(['/dashboard']);
      },
      error: () => {
        this.erreur  = 'Email ou mot de passe incorrect';
        this.loading = false;
      }
    });
  }
}
