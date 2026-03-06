import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/api.services';

@Component({
  selector: 'kdi-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="login-root">

      <!-- ── Grille de fond animée ── -->
      <div class="bg-grid"></div>
      <div class="bg-glow"></div>

      <!-- ── Panneau gauche ── -->
      <aside class="login-left">
        <div class="left-inner">

          <!-- Logo -->
          <div class="brand">
            <div class="brand-icon">KDI</div>
            <div class="brand-text">
              <span class="brand-name">Khalifat Djické</span>
              <span class="brand-sub">Gestion Immobilière</span>
            </div>
          </div>

          <!-- Titre accrocheur -->
          <div class="left-headline">
            <h1>Pilotez votre<br><span class="gold-text">patrimoine</span><br>avec précision.</h1>
            <p>La plateforme tout-en-un pour gérer vos propriétés, locataires, collectes et finances.</p>
          </div>

          <!-- Stats visuelles -->
          <div class="stats-grid">
            <div class="stat-card">
              <div class="stat-value">247</div>
              <div class="stat-label">Biens gérés</div>
            </div>
            <div class="stat-card">
              <div class="stat-value">98%</div>
              <div class="stat-label">Taux recouvrement</div>
            </div>
            <div class="stat-card">
              <div class="stat-value">12</div>
              <div class="stat-label">Propriétaires</div>
            </div>
            <div class="stat-card">
              <div class="stat-value">3 s</div>
              <div class="stat-label">Accès données</div>
            </div>
          </div>

          <!-- Features -->
          <ul class="features">
            <li>
              <span class="feat-icon">
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M2 9l4-4 3 3 5-6"/></svg>
              </span>
              Tableau de bord temps réel
            </li>
            <li>
              <span class="feat-icon">
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="8" cy="8" r="6"/><path d="M8 5v3l2 2"/></svg>
              </span>
              Alertes automatiques de retard
            </li>
            <li>
              <span class="feat-icon">
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="2" y="4" width="12" height="9" rx="1.5"/><path d="M6 4V3a2 2 0 014 0v1"/><circle cx="8" cy="9" r="1.2"/></svg>
              </span>
              Accès sécurisé par rôle
            </li>
          </ul>

        </div>

        <!-- Decoration coin bas gauche -->
        <div class="left-deco"></div>
      </aside>

      <!-- ── Panneau droit ── -->
      <main class="login-right">
        <div class="login-card">

          <!-- Header card -->
          <div class="card-header">
            <div class="card-eyebrow">Espace de connexion</div>
            <h2 class="card-title">Bon retour <span class="gold-text">👋</span></h2>
            <p class="card-sub">Connectez-vous à votre espace de gestion</p>
          </div>

          <!-- Séparateur décoratif -->
          <div class="divider">
            <span></span>
            <span class="divider-icon">
              <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" width="14" height="14">
                <path d="M3 9.5L10 3l7 6.5V17a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z"/>
                <path d="M7 18V12h6v6"/>
              </svg>
            </span>
            <span></span>
          </div>

          <!-- Formulaire -->
          <form [formGroup]="form" (ngSubmit)="submit()" autocomplete="on" novalidate>

            <!-- Email -->
            <div class="field" [class.error]="form.get('email')?.invalid && form.get('email')?.touched">
              <label for="kdi-email">Adresse email</label>
              <div class="field-wrap">
                <span class="field-icon">
                  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" width="15" height="15">
                    <rect x="1" y="3" width="14" height="10" rx="1.5"/>
                    <path d="M1 5l7 5 7-5"/>
                  </svg>
                </span>
                <input
                  id="kdi-email"
                  formControlName="email"
                  type="email"
                  placeholder="vous@kdi-immo.mr"
                  autocomplete="email"
                  (focus)="activeField.set('email')"
                  (blur)="activeField.set('')"
                  [class.focused]="activeField()==='email'"
                />
              </div>
              <span class="field-err" *ngIf="form.get('email')?.invalid && form.get('email')?.touched">
                Adresse email invalide
              </span>
            </div>

            <!-- Mot de passe -->
            <div class="field">
              <div class="field-label-row">
                <label for="kdi-pwd">Mot de passe</label>
                <a class="forgot-link" href="#" (click)="$event.preventDefault()">Mot de passe oublié ?</a>
              </div>
              <div class="field-wrap">
                <span class="field-icon">
                  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" width="15" height="15">
                    <rect x="3" y="7" width="10" height="8" rx="1.5"/>
                    <path d="M5 7V5a3 3 0 016 0v2"/>
                    <circle cx="8" cy="11" r="1" fill="currentColor" stroke="none"/>
                  </svg>
                </span>
                <input
                  id="kdi-pwd"
                  formControlName="motDePasse"
                  [type]="showPwd() ? 'text' : 'password'"
                  placeholder="••••••••••"
                  autocomplete="current-password"
                  (focus)="activeField.set('pwd')"
                  (blur)="activeField.set('')"
                />
                <button type="button" class="toggle-eye" (click)="showPwd.set(!showPwd())" [title]="showPwd() ? 'Masquer' : 'Afficher'">
                  <svg *ngIf="!showPwd()" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" width="15" height="15">
                    <path d="M1 8s2.5-5 7-5 7 5 7 5-2.5 5-7 5-7-5-7-5z"/>
                    <circle cx="8" cy="8" r="2"/>
                  </svg>
                  <svg *ngIf="showPwd()" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" width="15" height="15">
                    <path d="M2 2l12 12M6.5 6.5A2 2 0 0110 10M4 4.5C2.5 5.8 1 8 1 8s2.5 5 7 5c1.4 0 2.6-.4 3.6-1M7 3.1C7.3 3 7.6 3 8 3c4.5 0 7 5 7 5s-.7 1.4-2 2.7"/>
                  </svg>
                </button>
              </div>
            </div>

            <!-- Se souvenir -->
            <div class="remember-row">
              <label class="checkbox-label">
                <input type="checkbox" class="checkbox-input">
                <span class="checkbox-custom"></span>
                <span>Se souvenir de moi</span>
              </label>
            </div>

            <!-- Erreur globale -->
            <div class="alert-error" *ngIf="erreur()">
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" width="15" height="15">
                <circle cx="8" cy="8" r="6.5"/>
                <path d="M8 5v3.5M8 10.5v.5"/>
              </svg>
              {{ erreur() }}
            </div>

            <!-- Bouton submit -->
            <button type="submit" class="btn-submit" [disabled]="form.invalid || loading()">
              <span class="btn-content" *ngIf="!loading()">
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" width="15" height="15">
                  <path d="M3 8h10M9 4l4 4-4 4"/>
                </svg>
                Se connecter
              </span>
              <span class="btn-content" *ngIf="loading()">
                <span class="spinner"></span>
                Connexion en cours…
              </span>
            </button>

          </form>

          <!-- Footer card -->
          <div class="card-footer">
            <span class="dot"></span>
            Accès réservé au personnel autorisé
            <span class="dot"></span>
          </div>

        </div>

        <!-- Version -->
        <div class="version-tag">v1.0 — Nouakchott, Mauritanie</div>
      </main>

    </div>
  `,
  styles: [`
    /* ════════════════════════════════════════════
       TOKENS — alignés sur le prototype dark
    ════════════════════════════════════════════ */
    :host {
      --gold:       #C9A84C;
      --gold-light: #E8C97A;
      --gold-dim:   rgba(201,168,76,.12);
      --gold-glow:  rgba(201,168,76,.25);
      --bg:         #0D0F14;
      --bg2:        #13161E;
      --bg3:        #1A1E2A;
      --bg4:        #222738;
      --border:     rgba(201,168,76,.16);
      --border-sub: rgba(255,255,255,.06);
      --text:       #E8EAF0;
      --text-muted: #7A8099;
      --text-soft:  #B0B5CC;
      --danger:     #E05C5C;
      --radius:     14px;
      display: block;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }

    /* ════════════════════════════════════════════
       ROOT
    ════════════════════════════════════════════ */
    .login-root {
      display: flex;
      min-height: 100vh;
      background: var(--bg);
      font-family: 'DM Sans', sans-serif;
      position: relative;
      overflow: hidden;
    }

    /* ── Fond grille ── */
    .bg-grid {
      position: absolute; inset: 0; pointer-events: none;
      background-image:
        linear-gradient(rgba(201,168,76,.04) 1px, transparent 1px),
        linear-gradient(90deg, rgba(201,168,76,.04) 1px, transparent 1px);
      background-size: 48px 48px;
    }

    /* ── Halo gauche ── */
    .bg-glow {
      position: absolute;
      width: 600px; height: 600px;
      border-radius: 50%;
      background: radial-gradient(circle, rgba(201,168,76,.08) 0%, transparent 70%);
      top: -100px; left: -100px;
      pointer-events: none;
    }

    /* ════════════════════════════════════════════
       PANNEAU GAUCHE
    ════════════════════════════════════════════ */
    .login-left {
      flex: 1;
      background: var(--bg2);
      border-right: 1px solid var(--border);
      display: flex;
      flex-direction: column;
      padding: 48px 52px;
      position: relative;
      overflow: hidden;
      min-width: 0;
    }

    .left-inner {
      position: relative; z-index: 2;
      display: flex; flex-direction: column;
      gap: 44px;
      max-width: 440px;
    }

    /* ── Brand ── */
    .brand {
      display: flex; align-items: center; gap: 12px;
    }
    .brand-icon {
      width: 42px; height: 42px;
      background: linear-gradient(135deg, var(--gold), #8B5E1A);
      border-radius: 11px;
      display: flex; align-items: center; justify-content: center;
      font-family: 'Syne', sans-serif;
      font-weight: 800; font-size: 14px; color: #fff;
      box-shadow: 0 4px 14px rgba(201,168,76,.35);
      flex-shrink: 0;
    }
    .brand-text { display: flex; flex-direction: column; }
    .brand-name {
      font-family: 'Syne', sans-serif;
      font-size: 14px; font-weight: 700; color: var(--text);
    }
    .brand-sub {
      font-size: 11px; color: var(--text-muted);
      margin-top: 1px;
    }

    /* ── Headline ── */
    .left-headline h1 {
      font-family: 'Syne', sans-serif;
      font-size: 38px; font-weight: 800;
      line-height: 1.15; color: var(--text);
      margin-bottom: 14px;
    }
    .left-headline p {
      font-size: 14px; color: var(--text-muted);
      line-height: 1.65; max-width: 360px;
    }
    .gold-text { color: var(--gold); }

    /* ── Stats ── */
    .stats-grid {
      display: grid; grid-template-columns: 1fr 1fr;
      gap: 12px;
    }
    .stat-card {
      background: var(--bg3);
      border: 1px solid var(--border-sub);
      border-radius: 10px;
      padding: 14px 16px;
      transition: border-color .2s;
    }
    .stat-card:hover { border-color: var(--border); }
    .stat-value {
      font-family: 'Syne', sans-serif;
      font-size: 22px; font-weight: 800;
      color: var(--gold); line-height: 1;
    }
    .stat-label {
      font-size: 11.5px; color: var(--text-muted);
      margin-top: 4px;
    }

    /* ── Features ── */
    .features {
      list-style: none;
      display: flex; flex-direction: column; gap: 12px;
    }
    .features li {
      display: flex; align-items: center; gap: 10px;
      font-size: 13.5px; color: var(--text-soft);
    }
    .feat-icon {
      width: 28px; height: 28px; border-radius: 8px;
      background: var(--gold-dim);
      border: 1px solid rgba(201,168,76,.2);
      display: flex; align-items: center; justify-content: center;
      color: var(--gold); flex-shrink: 0;
    }

    /* ── Déco coin ── */
    .left-deco {
      position: absolute;
      width: 400px; height: 400px;
      bottom: -120px; right: -80px;
      border-radius: 50%;
      background: radial-gradient(circle, rgba(201,168,76,.06) 0%, transparent 65%);
      pointer-events: none;
    }

    /* ════════════════════════════════════════════
       PANNEAU DROIT
    ════════════════════════════════════════════ */
    .login-right {
      width: 480px;
      flex-shrink: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 40px 40px 28px;
      position: relative;
      gap: 16px;
    }

    /* ── Card ── */
    .login-card {
      width: 100%;
      background: var(--bg2);
      border: 1px solid var(--border);
      border-radius: 18px;
      padding: 36px 36px 28px;
      box-shadow: 0 24px 64px rgba(0,0,0,.5), 0 0 0 1px rgba(201,168,76,.06);
    }

    /* ── Card header ── */
    .card-eyebrow {
      font-size: 10px; letter-spacing: 2px;
      text-transform: uppercase;
      color: var(--gold); font-weight: 700;
      margin-bottom: 10px;
    }
    .card-title {
      font-family: 'Syne', sans-serif;
      font-size: 26px; font-weight: 800;
      color: var(--text); margin-bottom: 6px;
    }
    .card-sub {
      font-size: 13.5px; color: var(--text-muted);
      margin-bottom: 0;
    }

    /* ── Divider ── */
    .divider {
      display: flex; align-items: center; gap: 12px;
      margin: 22px 0;
    }
    .divider span:first-child,
    .divider span:last-child {
      flex: 1; height: 1px; background: var(--border-sub);
    }
    .divider-icon {
      width: 28px; height: 28px; border-radius: 8px;
      background: var(--gold-dim);
      border: 1px solid var(--border);
      display: flex; align-items: center; justify-content: center;
      color: var(--gold); flex-shrink: 0;
    }

    /* ── Champs ── */
    .field {
      margin-bottom: 18px;
    }
    .field label {
      display: block;
      font-size: 12px; font-weight: 600;
      color: var(--text-soft); margin-bottom: 7px;
      letter-spacing: .3px;
    }
    .field-label-row {
      display: flex; align-items: center;
      justify-content: space-between;
      margin-bottom: 7px;
    }
    .field-label-row label { margin-bottom: 0; }
    .forgot-link {
      font-size: 11.5px; color: var(--gold);
      text-decoration: none; opacity: .8;
      transition: opacity .15s;
    }
    .forgot-link:hover { opacity: 1; }

    .field-wrap {
      position: relative; display: flex; align-items: center;
    }
    .field-icon {
      position: absolute; left: 13px;
      color: var(--text-muted);
      display: flex; align-items: center;
      pointer-events: none; z-index: 1;
    }
    .field-wrap input {
      width: 100%;
      padding: 11px 42px 11px 40px;
      background: var(--bg3);
      border: 1.5px solid var(--border-sub);
      border-radius: 10px;
      font-family: 'DM Sans', sans-serif;
      font-size: 13.5px; color: var(--text);
      outline: none;
      transition: border-color .18s, box-shadow .18s, background .18s;
    }
    .field-wrap input::placeholder { color: var(--text-muted); }
    .field-wrap input:focus {
      border-color: var(--gold);
      background: var(--bg4);
      box-shadow: 0 0 0 3px var(--gold-dim);
    }
    .field.error .field-wrap input {
      border-color: var(--danger);
      box-shadow: 0 0 0 3px rgba(224,92,92,.12);
    }
    .field-err {
      display: block; margin-top: 5px;
      font-size: 11.5px; color: var(--danger);
    }

    .toggle-eye {
      position: absolute; right: 12px;
      background: none; border: none; cursor: pointer;
      color: var(--text-muted); padding: 4px;
      display: flex; align-items: center;
      transition: color .15s;
    }
    .toggle-eye:hover { color: var(--text-soft); }

    /* ── Remember ── */
    .remember-row {
      margin-bottom: 18px;
    }
    .checkbox-label {
      display: flex; align-items: center; gap: 9px;
      font-size: 12.5px; color: var(--text-muted);
      cursor: pointer; user-select: none;
    }
    .checkbox-input { display: none; }
    .checkbox-custom {
      width: 16px; height: 16px; border-radius: 4px;
      border: 1.5px solid var(--border-sub);
      background: var(--bg3);
      flex-shrink: 0; position: relative;
      transition: all .15s;
    }
    .checkbox-input:checked + .checkbox-custom {
      background: var(--gold);
      border-color: var(--gold);
    }
    .checkbox-input:checked + .checkbox-custom::after {
      content: '';
      position: absolute; left: 3px; top: 1px;
      width: 5px; height: 8px;
      border: 2px solid #000;
      border-top: none; border-left: none;
      transform: rotate(45deg);
    }

    /* ── Alerte erreur ── */
    .alert-error {
      display: flex; align-items: center; gap: 8px;
      background: rgba(224,92,92,.1);
      border: 1px solid rgba(224,92,92,.25);
      border-radius: 9px;
      padding: 10px 14px;
      font-size: 13px; color: #f87171;
      margin-bottom: 18px;
    }

    /* ── Bouton submit ── */
    .btn-submit {
      width: 100%;
      padding: 13px;
      background: linear-gradient(135deg, var(--gold) 0%, #a87828 100%);
      color: #0D0F14;
      border: none; border-radius: 10px;
      font-family: 'Syne', sans-serif;
      font-size: 14px; font-weight: 700;
      cursor: pointer;
      transition: opacity .18s, box-shadow .18s, transform .12s;
      box-shadow: 0 4px 20px rgba(201,168,76,.3);
    }
    .btn-submit:hover:not(:disabled) {
      opacity: .92;
      box-shadow: 0 6px 28px rgba(201,168,76,.45);
      transform: translateY(-1px);
    }
    .btn-submit:active:not(:disabled) { transform: translateY(0); }
    .btn-submit:disabled { opacity: .4; cursor: not-allowed; }

    .btn-content {
      display: flex; align-items: center;
      justify-content: center; gap: 8px;
    }

    /* Spinner */
    .spinner {
      width: 16px; height: 16px;
      border: 2px solid rgba(13,15,20,.25);
      border-top-color: #0D0F14;
      border-radius: 50%;
      animation: spin .65s linear infinite;
      flex-shrink: 0;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    /* ── Card footer ── */
    .card-footer {
      display: flex; align-items: center; gap: 8px;
      justify-content: center;
      margin-top: 20px;
      font-size: 11px; color: var(--text-muted);
      letter-spacing: .3px;
    }
    .dot {
      width: 3px; height: 3px; border-radius: 50%;
      background: var(--border);
      flex-shrink: 0;
    }

    /* ── Version ── */
    .version-tag {
      font-size: 11px; color: var(--text-muted);
      opacity: .5;
    }

    /* ════════════════════════════════════════════
       RESPONSIVE
    ════════════════════════════════════════════ */
    @media (max-width: 900px) {
      .login-left { display: none; }
      .login-right { width: 100%; padding: 32px 24px; }
      .login-card { padding: 28px 24px; }
    }
    @media (max-width: 400px) {
      .login-right { padding: 20px 16px; }
      .card-title { font-size: 22px; }
    }
  `]
})
export class LoginComponent {
  private fb     = inject(FormBuilder);
  private auth   = inject(AuthService);
  private router = inject(Router);

  form = this.fb.group({
    email:      ['', [Validators.required, Validators.email]],
    motDePasse: ['', Validators.required]
  });

  loading     = signal(false);
  erreur      = signal('');
  showPwd     = signal(false);
  activeField = signal('');

  submit() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.loading.set(true);
    this.erreur.set('');
    this.auth.login(this.form.value as any).subscribe({
      next: (resp) => {
        this.auth.saveSession(resp);
        this.router.navigate(['/dashboard']);
      },
      error: () => {
        this.erreur.set('Email ou mot de passe incorrect');
        this.loading.set(false);
      }
    });
  }
}