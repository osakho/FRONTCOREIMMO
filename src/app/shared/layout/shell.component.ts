import { Component, inject, signal, HostListener } from '@angular/core';
import { CommonModule }   from '@angular/common';
import { Router, RouterLink, RouterLinkActive, RouterOutlet, NavigationEnd } from '@angular/router';
import { AuthService, RecouvrementService }    from '../../core/services/api.services';
import { filter }         from 'rxjs/operators';

@Component({
  selector: 'kdi-shell',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  template: `

<!-- ══════════════════════════════════════════════
     OVERLAY mobile (ferme la sidebar)
══════════════════════════════════════════════ -->
<div class="sb-overlay" [class.visible]="sidebarOpen()" (click)="sidebarOpen.set(false)"></div>

<!-- ══════════════════════════════════════════════
     SIDEBAR
══════════════════════════════════════════════ -->
<aside class="sidebar" [class.open]="sidebarOpen()">

  <!-- ── Logo ── -->
  <div class="sb-brand">
    <div class="sb-logo-wrap">
      <div class="sb-logo-icon">KDI</div>
      <div class="sb-logo-text">
        <div class="sb-logo-name">Khalifat Djické</div>
        <div class="sb-logo-sub">Gestion Immobilière</div>
      </div>
    </div>
  </div>

  <!-- ── Nav ── -->
  <nav class="sb-nav">

    <!-- PRINCIPAL -->
    <div class="nav-group">
      <a routerLink="/dashboard" routerLinkActive="active" class="nav-item" (click)="closeSidebarMobile()">
        <span class="ni">
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6">
            <rect x="2" y="2" width="7" height="7" rx="1.5"/><rect x="11" y="2" width="7" height="7" rx="1.5"/>
            <rect x="2" y="11" width="7" height="7" rx="1.5"/><rect x="11" y="11" width="7" height="7" rx="1.5"/>
          </svg>
        </span>
        <span class="nl">Tableau de bord</span>
      </a>
    </div>

    <!-- PATRIMOINE -->
    <div class="nav-section-label">Patrimoine</div>
    <div class="nav-group">
      <a routerLink="/proprietaires" routerLinkActive="active" class="nav-item" (click)="closeSidebarMobile()">
        <span class="ni">
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6">
            <circle cx="10" cy="7" r="3.5"/><path d="M3 17c0-3.3 3.1-6 7-6s7 2.7 7 6"/>
          </svg>
        </span>
        <span class="nl">Propriétaires</span>
      </a>
      <a *ngIf="isDirection()" routerLink="/proprietaires/dashboard" routerLinkActive="active" class="nav-item sub" (click)="closeSidebarMobile()">
        <span class="ni">
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6">
            <polyline points="2,14 7,9 11,13 18,6"/><polyline points="14,6 18,6 18,10"/>
          </svg>
        </span>
        <span class="nl">Dashboard propriétaires</span>
      </a>
      <a routerLink="/proprietes" routerLinkActive="active" class="nav-item" (click)="closeSidebarMobile()">
        <span class="ni">
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6">
            <path d="M3 9.5L10 3l7 6.5V17a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z"/><path d="M7 18V12h6v6"/>
          </svg>
        </span>
        <span class="nl">Propriétés</span>
      </a>
      <a routerLink="/produits" routerLinkActive="active" class="nav-item" (click)="closeSidebarMobile()">
        <span class="ni">
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6">
            <rect x="3" y="3" width="14" height="14" rx="2"/><circle cx="10" cy="10" r="2.5"/>
            <path d="M10 3v3M10 14v3M3 10h3M14 10h3"/>
          </svg>
        </span>
        <span class="nl">Produits locatifs</span>
      </a>
    </div>

    <!-- GESTION LOCATIVE -->
    <div class="nav-section-label">Gestion locative</div>
    <div class="nav-group">
      <a routerLink="/locataires" routerLinkActive="active" class="nav-item" (click)="closeSidebarMobile()">
        <span class="ni">
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6">
            <circle cx="7" cy="7" r="3"/><circle cx="13" cy="7" r="3"/>
            <path d="M1 17c0-2.8 2.7-5 6-5M19 17c0-2.8-2.7-5-6-5M7 12c1.3 1 3.3 1 6 0"/>
          </svg>
        </span>
        <span class="nl">Locataires</span>
      </a>
      <a routerLink="/contrats-location" routerLinkActive="active" class="nav-item" (click)="closeSidebarMobile()">
        <span class="ni">
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6">
            <rect x="4" y="2" width="12" height="16" rx="1.5"/>
            <line x1="7" y1="7" x2="13" y2="7"/><line x1="7" y1="10" x2="13" y2="10"/><line x1="7" y1="13" x2="10" y2="13"/>
          </svg>
        </span>
        <span class="nl">Contrats de location</span>
      </a>
      <a *ngIf="isDirection()" routerLink="/contrats-gestion" routerLinkActive="active" class="nav-item" (click)="closeSidebarMobile()">
        <span class="ni">
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6">
            <rect x="4" y="2" width="12" height="16" rx="1.5"/>
            <line x1="7" y1="7" x2="13" y2="7"/><line x1="7" y1="10" x2="13" y2="10"/>
            <path d="M7 13l1.5 1.5L13 11"/>
          </svg>
        </span>
        <span class="nl">Contrats de gestion</span>
      </a>
    </div>

    <!-- COLLECTES & FINANCE -->
    <div class="nav-section-label">Collectes &amp; Finance</div>
    <div class="nav-group">
      <a routerLink="/collectes" routerLinkActive="active" class="nav-item" (click)="closeSidebarMobile()">
        <span class="ni">
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6">
            <circle cx="10" cy="10" r="7.5"/><path d="M10 6v1.5m0 5V14m-2.5-5.5h4a1 1 0 110 2H8a1 1 0 100 2h4"/>
          </svg>
        </span>
        <span class="nl">Collectes</span>
      </a>
      <a *ngIf="isDirection()" routerLink="/collectes/validation" routerLinkActive="active" class="nav-item sub" (click)="closeSidebarMobile()">
        <span class="ni">
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6">
            <rect x="3" y="3" width="14" height="14" rx="2"/><path d="M7 10l2.5 2.5L13 7"/>
          </svg>
        </span>
        <span class="nl">Validation collectes</span>
      </a>
      <a routerLink="/collectes/rapport" routerLinkActive="active" class="nav-item sub" (click)="closeSidebarMobile()">
        <span class="ni">
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6">
            <rect x="3" y="2" width="14" height="16" rx="1.5"/>
            <line x1="7" y1="6" x2="13" y2="6"/><line x1="7" y1="9" x2="13" y2="9"/>
            <polyline points="7,13 9,11 11,13 14,10"/>
          </svg>
        </span>
        <span class="nl">Rapport collecteur</span>
      </a>
      <a routerLink="/collectes/bordereau" routerLinkActive="active" class="nav-item sub" (click)="closeSidebarMobile()">
        <span class="ni">
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6">
            <path d="M4 2h8l4 4v12a1 1 0 01-1 1H4a1 1 0 01-1-1V3a1 1 0 011-1z"/>
            <polyline points="12,2 12,6 16,6"/><line x1="7" y1="10" x2="13" y2="10"/><line x1="7" y1="13" x2="10" y2="13"/>
          </svg>
        </span>
        <span class="nl">Bordereau</span>
      </a>
      <a routerLink="/versements" routerLinkActive="active" class="nav-item" (click)="closeSidebarMobile()">
        <span class="ni">
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6">
            <rect x="2" y="6" width="16" height="11" rx="1.5"/>
            <path d="M6 6V4.5a4 4 0 018 0V6"/><circle cx="10" cy="12" r="1.8"/>
          </svg>
        </span>
        <span class="nl">Versements</span>
      </a>
      <a routerLink="/contentieux" routerLinkActive="active" class="nav-item" (click)="closeSidebarMobile()">
        <span class="ni">
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6">
            <circle cx="10" cy="10" r="7.5"/>
            <path d="M7 7.5h3.5a1.5 1.5 0 010 3H8.5m0 0H7m1.5 0V14"/>
          </svg>
        </span>
        <span class="nl">Contentieux</span>
        <span class="nb" *ngIf="nbContentieux()>0">{{ nbContentieux() }}</span>
      </a>
      <a routerLink="/recouvrement" routerLinkActive="active" class="nav-item" (click)="closeSidebarMobile()">
        <span class="ni">
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6">
            <circle cx="10" cy="10" r="7.5"/><line x1="10" y1="6" x2="10" y2="11"/>
            <circle cx="10" cy="13.5" r=".8" fill="currentColor" stroke="none"/>
          </svg>
        </span>
        <span class="nl">Recouvrement</span>
        <span class="nb" *ngIf="nbImpayes()>0">{{ nbImpayes() }}</span>
      </a>
    </div>

    <!-- ADMINISTRATION -->
    <ng-container *ngIf="isDirection()">
      <div class="nav-section-label">Administration</div>
      <div class="nav-group">
        <a routerLink="/personnel" routerLinkActive="active" class="nav-item" (click)="closeSidebarMobile()">
          <span class="ni">
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6">
              <circle cx="10" cy="6.5" r="2.8"/><path d="M4 17c0-3 2.7-5.5 6-5.5s6 2.5 6 5.5"/>
              <path d="M14.5 9.5l1.5 1.5m0 0l1.5-1.5m-1.5 1.5V8"/>
            </svg>
          </span>
          <span class="nl">Personnel</span>
        </a>
        <a *ngIf="isDirection()" routerLink="/rapports" routerLinkActive="active" class="nav-item" (click)="closeSidebarMobile()">
          <span class="ni">
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6">
              <rect x="3" y="2" width="14" height="16" rx="1.5"/>
              <polyline points="7,8 9,10.5 12,8 14,11"/><line x1="7" y1="14" x2="13" y2="14"/>
            </svg>
          </span>
          <span class="nl">Rapports</span>
        </a>
        <a *ngIf="isDirection()" routerLink="/parametres" routerLinkActive="active" class="nav-item" (click)="closeSidebarMobile()">
          <span class="ni">
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6">
              <circle cx="10" cy="10" r="2.5"/>
              <path d="M10 2v2m0 12v2M2 10h2m12 0h2M4.2 4.2l1.4 1.4m8.8 8.8l1.4 1.4M4.2 15.8l1.4-1.4m8.8-8.8l1.4-1.4"/>
            </svg>
          </span>
          <span class="nl">Paramètres</span>
        </a>
      </div>
    </ng-container>

  </nav>

  <!-- ── Footer utilisateur ── -->
  <div class="sb-footer">
    <div class="sb-avatar">{{ userInitiales() }}</div>
    <div class="sb-user-info">
      <div class="sb-user-name">{{ userName() }}</div>
      <div class="sb-user-role">{{ userRole() }}</div>
    </div>
    <button class="sb-logout-btn" (click)="logout()" title="Se déconnecter">
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7" width="16" height="16">
        <path d="M7 3H4a1 1 0 00-1 1v12a1 1 0 001 1h3"/>
        <polyline points="13,7 17,10 13,13"/><line x1="17" y1="10" x2="7" y2="10"/>
      </svg>
    </button>
  </div>

</aside>

<!-- ══════════════════════════════════════════════
     ZONE PRINCIPALE
══════════════════════════════════════════════ -->
<div class="main-wrapper">

  <!-- ── Topbar ────────────────────────────── -->
  <header class="topbar">

    <!-- Bouton hamburger (mobile) -->
    <button class="hamburger" (click)="sidebarOpen.set(!sidebarOpen())" title="Menu">
      <span></span><span></span><span></span>
    </button>

    <!-- Titre de la page courante -->
    <div class="topbar-title">
      {{ currentPageEmoji() }} <span>{{ currentPageTitle() }}</span>
    </div>

    <div class="topbar-right">

      <!-- Barre de recherche -->
      <div class="search-wrap">
        <span class="search-ico">🔍</span>
        <input type="text" class="search-input" placeholder="Rechercher…">
      </div>

      <!-- Notifications -->
      <button class="icon-btn" title="Notifications">
        🔔
        <span class="notif-dot"></span>
      </button>

      <!-- Raccourci saisie collecte -->
      <a routerLink="/collectes/saisir" class="btn-topbar" title="Saisir une collecte">
        + Collecte
      </a>

      <!-- Avatar utilisateur -->
      <div class="topbar-avatar" (click)="toggleUserMenu()" title="{{ userName() }}">
        {{ userInitiales() }}
      </div>

      <!-- Menu utilisateur -->
      <div class="user-menu" [class.open]="userMenuOpen()">
        <div class="um-header">
          <div class="um-name">{{ userName() }}</div>
          <div class="um-role">{{ userRole() }}</div>
        </div>
        <div class="um-sep"></div>
        <button class="um-item" (click)="logout()">⏻ Se déconnecter</button>
      </div>

    </div>
  </header>

  <!-- ── Contenu de la page ─────────────────── -->
  <main class="main-content">
    <router-outlet />
  </main>

</div>
  `,
  styles: [`
    /* ══════════════════════════════════════════════
       TOKENS — identiques au template HTML
    ══════════════════════════════════════════════ */
    :host {
      --gold:       #C9A84C;
      --gold-light: #E8C96A;
      --gold-dark:  #8B6914;
      --ink:        #0D0D0D;
      --ink-mid:    #1A1A2E;
      --ink-soft:   #2D2D4A;
      --cream:      #F8F4ED;
      --cream-dk:   #EDE8DF;
      --muted:      #8A8899;
      --danger:     #C0392B;
      --sidebar-w:  280px;
      --topbar-h:   64px;
      display: block;
    }

    /* reset dans le host */
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    /* ══════════════════════════════════════════════
       SIDEBAR
    ══════════════════════════════════════════════ */
    .sidebar {
      width: var(--sidebar-w);
      background: linear-gradient(180deg, #0D1321 0%, #111827 100%);
      display: flex;
      flex-direction: column;
      position: fixed;
      top: 0; left: 0;
      height: 100vh;
      z-index: 200;
      transition: transform .28s cubic-bezier(.4,0,.2,1);
      overflow: hidden;
      border-right: 1px solid rgba(255,255,255,.04);
    }

    /* ── Logo ── */
    .sb-brand {
      padding: 18px 16px 16px;
      border-bottom: 1px solid rgba(255,255,255,.06);
      flex-shrink: 0;
    }
    .sb-logo-wrap {
      display: flex; align-items: center; gap: 11px;
    }
    .sb-logo-icon {
      width: 38px; height: 38px; border-radius: 10px;
      background: linear-gradient(135deg, #8B6914, #C9A84C);
      display: flex; align-items: center; justify-content: center;
      font-size: 12px; font-weight: 900; color: #fff;
      letter-spacing: .5px; flex-shrink: 0;
      font-family: 'Playfair Display', Georgia, serif;
      box-shadow: 0 2px 8px rgba(201,168,76,.35);
    }
    .sb-logo-name {
      font-size: 14px; font-weight: 700; color: #fff;
      font-family: 'Playfair Display', Georgia, serif; line-height: 1.2;
    }
    .sb-logo-sub {
      font-size: 10px; color: rgba(255,255,255,.3);
      text-transform: uppercase; letter-spacing: 1px; margin-top: 2px;
    }

    /* ── Nav ── */
    .sb-nav {
      flex: 1;
      padding: 10px 0 6px;
      overflow-y: auto;
    }
    .sb-nav::-webkit-scrollbar { width: 3px; }
    .sb-nav::-webkit-scrollbar-thumb { background: rgba(255,255,255,.08); border-radius: 4px; }

    .nav-section-label {
      padding: 14px 18px 5px;
      font-size: 9.5px; letter-spacing: 1.8px;
      text-transform: uppercase;
      color: rgba(255,255,255,.2); font-weight: 700;
    }

    .nav-group {
      padding: 0 10px;
      margin-bottom: 4px;
    }

    .nav-item {
      display: flex; align-items: center; gap: 10px;
      padding: 9px 10px;
      color: rgba(255,255,255,.48);
      text-decoration: none;
      font-size: 13px; font-weight: 500;
      border-radius: 9px;
      transition: all .15s ease;
      cursor: pointer;
      position: relative;
      white-space: nowrap;
      margin-bottom: 1px;
    }
    .nav-item:hover {
      background: rgba(255,255,255,.06);
      color: rgba(255,255,255,.85);
    }
    .nav-item.active {
      background: rgba(201,168,76,.14);
      color: #E8C96A;
      font-weight: 600;
    }
    .nav-item.active::before {
      content: '';
      position: absolute; left: 0; top: 50%;
      transform: translateY(-50%);
      width: 3px; height: 60%;
      background: #C9A84C; border-radius: 0 3px 3px 0;
    }
    .nav-item.sub {
      padding-left: 18px;
      font-size: 12.5px;
    }
    .nav-item.sub .ni svg { width: 15px; height: 15px; }

    /* Icône nav */
    .ni {
      width: 20px; height: 20px; flex-shrink: 0;
      display: flex; align-items: center; justify-content: center;
    }
    .ni svg { width: 17px; height: 17px; }
    .nav-item.active .ni { color: #C9A84C; }

    /* Label */
    .nl { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; }

    /* Badge impayés */
    .nb {
      margin-left: auto; flex-shrink: 0;
      background: #C0392B; color: #fff;
      font-size: 10px; font-weight: 800;
      padding: 2px 6px; border-radius: 10px;
      min-width: 18px; text-align: center;
      box-shadow: 0 1px 4px rgba(192,57,43,.5);
    }

    /* ── Footer ── */
    .sb-footer {
      padding: 12px 14px;
      border-top: 1px solid rgba(255,255,255,.06);
      display: flex; align-items: center; gap: 10px;
      flex-shrink: 0;
      background: rgba(0,0,0,.15);
    }
    .sb-avatar {
      width: 34px; height: 34px;
      background: linear-gradient(135deg, var(--gold), var(--gold-dark));
      border-radius: 9px;
      display: flex; align-items: center; justify-content: center;
      font-size: 13px; color: #fff; font-weight: 700;
      font-family: 'Playfair Display', serif;
      flex-shrink: 0;
    }
    .sb-user-info { flex: 1; min-width: 0; }
    .sb-user-name {
      font-size: 12.5px; color: rgba(255,255,255,.82);
      font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .sb-user-role { font-size: 10px; color: rgba(255,255,255,.28); margin-top: 1px; }
    .sb-logout-btn {
      background: none; border: none; cursor: pointer;
      color: rgba(255,255,255,.25); padding: 6px; border-radius: 7px;
      transition: all .18s; flex-shrink: 0;
      display: flex; align-items: center; justify-content: center;
    }
    .sb-logout-btn:hover { color: #C0392B; background: rgba(192,57,43,.12); }

        /* ══════════════════════════════════════════════
       MAIN WRAPPER
    ══════════════════════════════════════════════ */
    .main-wrapper {
      margin-left: var(--sidebar-w);
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      background: var(--cream);
    }

    /* ══════════════════════════════════════════════
       TOPBAR
    ══════════════════════════════════════════════ */
    .topbar {
      height: var(--topbar-h);
      background: #fff;
      border-bottom: 1px solid var(--cream-dk);
      padding: 0 28px;
      display: flex; align-items: center; gap: 16px;
      position: sticky; top: 0; z-index: 100;
      box-shadow: 0 1px 4px rgba(0,0,0,.05);
    }

    /* Hamburger (caché desktop) */
    .hamburger {
      display: none; flex-direction: column; gap: 4px;
      background: none; border: none; cursor: pointer; padding: 4px;
    }
    .hamburger span {
      display: block; width: 22px; height: 2px;
      background: var(--ink-soft); border-radius: 2px;
      transition: all .2s;
    }

    /* Titre */
    .topbar-title {
      font-family: 'Playfair Display', Georgia, serif;
      font-size: 18px; font-weight: 700; color: var(--ink);
      flex: 1;
    }
    .topbar-title span { color: var(--gold-dark); }

    /* Partie droite */
    .topbar-right {
      display: flex; align-items: center; gap: 10px;
      position: relative;
    }

    /* Recherche */
    .search-wrap {
      position: relative;
      display: flex; align-items: center;
    }
    .search-ico {
      position: absolute; left: 10px;
      font-size: 14px; color: var(--muted);
      pointer-events: none;
    }
    .search-input {
      padding: 7px 12px 7px 34px;
      border: 1.5px solid var(--cream-dk);
      border-radius: 8px;
      font-size: 13px; background: var(--cream);
      outline: none; width: 200px;
      transition: all .2s;
      font-family: inherit;
    }
    .search-input:focus {
      border-color: var(--gold);
      background: #fff;
      width: 240px;
    }

    /* Bouton icône */
    .icon-btn {
      width: 36px; height: 36px;
      border: none; border-radius: 8px;
      background: var(--cream); cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      font-size: 16px; position: relative;
      transition: background .18s;
    }
    .icon-btn:hover { background: var(--cream-dk); }
    .notif-dot {
      position: absolute; top: 6px; right: 6px;
      width: 8px; height: 8px;
      background: var(--danger); border-radius: 50%;
      border: 2px solid #fff;
    }

    /* Bouton + Collecte */
    .btn-topbar {
      padding: 7px 14px;
      background: var(--ink-mid); color: var(--gold-light);
      border: none; border-radius: 8px;
      font-size: 13px; font-weight: 600; cursor: pointer;
      text-decoration: none; white-space: nowrap;
      transition: background .18s;
      font-family: inherit;
    }
    .btn-topbar:hover { background: var(--ink-soft); }

    /* Avatar topbar */
    .topbar-avatar {
      width: 34px; height: 34px;
      background: linear-gradient(135deg, var(--gold), var(--gold-dark));
      border-radius: 8px;
      display: flex; align-items: center; justify-content: center;
      font-size: 13px; color: #fff; font-weight: 700;
      font-family: 'Playfair Display', serif;
      cursor: pointer; flex-shrink: 0;
      transition: box-shadow .2s;
    }
    .topbar-avatar:hover { box-shadow: 0 0 0 3px rgba(201,168,76,.3); }

    /* Menu utilisateur dropdown */
    .user-menu {
      position: absolute; top: calc(100% + 10px); right: 0;
      background: #fff; border-radius: 10px;
      border: 1px solid var(--cream-dk);
      box-shadow: 0 8px 28px rgba(0,0,0,.12);
      min-width: 200px;
      opacity: 0; pointer-events: none; transform: translateY(-6px);
      transition: all .18s;
      z-index: 300;
    }
    .user-menu.open { opacity: 1; pointer-events: all; transform: translateY(0); }
    .um-header { padding: 14px 16px 10px; }
    .um-name   { font-size: 14px; font-weight: 700; color: var(--ink); }
    .um-role   { font-size: 11.5px; color: var(--muted); margin-top: 2px; }
    .um-sep    { height: 1px; background: var(--cream-dk); }
    .um-item   {
      display: block; width: 100%; padding: 11px 16px;
      background: none; border: none; text-align: left;
      font-size: 13.5px; color: var(--danger); cursor: pointer;
      transition: background .15s; font-family: inherit;
    }
    .um-item:hover { background: var(--cream); }

    /* ══════════════════════════════════════════════
       CONTENU
    ══════════════════════════════════════════════ */
    .main-content {
      flex: 1;
      padding: 28px 32px;
    }

    /* ══════════════════════════════════════════════
       OVERLAY MOBILE
    ══════════════════════════════════════════════ */
    .sb-overlay {
      display: none;
      position: fixed; inset: 0;
      background: rgba(0,0,0,.45);
      z-index: 150;
      opacity: 0; transition: opacity .28s;
    }
    .sb-overlay.visible { opacity: 1; }

    /* ══════════════════════════════════════════════
       RESPONSIVE
    ══════════════════════════════════════════════ */
    @media (max-width: 900px) {
      .sidebar {
        transform: translateX(-100%);
      }
      .sidebar.open {
        transform: translateX(0);
        box-shadow: 4px 0 24px rgba(0,0,0,.25);
      }
      .sb-overlay { display: block; pointer-events: none; }
      .sb-overlay.visible { pointer-events: all; }
      .main-wrapper { margin-left: 0; }
      .hamburger { display: flex; }
      .search-input { width: 140px; }
      .search-input:focus { width: 160px; }
      .btn-topbar { display: none; }
      .main-content { padding: 20px 16px; }
    }

    @media (max-width: 480px) {
      .search-wrap { display: none; }
      .topbar { padding: 0 16px; }
    }
  `]
})
export class ShellComponent {

  private auth   = inject(AuthService);
  private router = inject(Router);
  private recSvc = inject(RecouvrementService);

  // ── États réactifs ───────────────────────────────
  sidebarOpen  = signal(false);
  userMenuOpen = signal(false);
  nbImpayes    = signal(0);
  nbContentieux = signal(0);

  // ── Titre dynamique selon la route ──────────────
  private readonly PAGE_MAP: Record<string, { emoji: string; title: string }> = {
    'dashboard':                { emoji: '📊', title: 'Tableau de bord' },
    'proprietaires':            { emoji: '👤', title: 'Propriétaires' },
    'proprietaires/dashboard':  { emoji: '📋', title: 'Dashboard propriétaires' },
    'proprietes':               { emoji: '🏢', title: 'Propriétés' },
    'produits':                 { emoji: '🔑', title: 'Produits locatifs' },
    'locataires':               { emoji: '👥', title: 'Locataires' },
    'contrats-location':        { emoji: '📄', title: 'Contrats de location' },
    'contrats-gestion':         { emoji: '📑', title: 'Contrats de gestion' },
    'collectes':                { emoji: '💰', title: 'Collectes' },
    'collectes/validation':     { emoji: '✅', title: 'Validation des collectes' },
    'collectes/rapport':        { emoji: '📊', title: 'Rapport collecteur' },
    'collectes/bordereau':      { emoji: '🧾', title: 'Bordereau' },
    'collectes/saisir':         { emoji: '✏️', title: 'Saisie collecte' },
    'recouvrement':             { emoji: '🔴', title: 'Recouvrement' },
    'versements':               { emoji: '🏦', title: 'Versements' },
    'personnel':                { emoji: '👷', title: 'Personnel' },
  };

  currentPageTitle = signal('Tableau de bord');
  currentPageEmoji = signal('📊');

  constructor() {
    // Met à jour le titre à chaque changement de route
    this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe((e: any) => {
        const url   = (e.urlAfterRedirects as string).replace(/^\//, '').split('?')[0];
        const match = this.PAGE_MAP[url]
          ?? this.PAGE_MAP[url.split('/').slice(0, 2).join('/')]
          ?? this.PAGE_MAP[url.split('/')[0]]
          ?? { emoji: '🏛️', title: 'Khalifat Djické' };
        this.currentPageTitle.set(match.title);
        this.currentPageEmoji.set(match.emoji);
      });

    // Ferme le menu user si clic en dehors

    // Charge le badge impayés en différé pour ne pas bloquer le rendu initial
    setTimeout(() => {
      this.recSvc.getDossiers().subscribe({
        next: d => {
          this.nbImpayes.set(d.length);
          this.nbContentieux.set(d.filter((x: any) => x.etape === 'Contentieux').length);
        },
        error: () => {}
      });
    }, 2000);
  }

  // ── Infos utilisateur ────────────────────────────
  userName(): string {
    return this.auth.getUser()?.nom ?? 'Utilisateur';
  }

  userRole(): string {
    const role = this.auth.getUser()?.role ?? '';
    const labels: Record<string, string> = {
      Pdg:          'Président directeur général',
      Direction:    'Direction',
      Admin:        'Administrateur',
      Comptable:    'Comptable',
      Collecteur:   'Collecteur',
      ChargeTravaux:'Chargé de travaux',
    };
    return labels[role] ?? role;
  }

  userInitiales(): string {
    const nom = this.auth.getUser()?.nom ?? 'U';
    return nom.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2);
  }

  // ── Droits ──────────────────────────────────────
  isDirection(): boolean { return this.auth.isDirection(); }

  // ── Actions ──────────────────────────────────────
  logout(): void {
    this.auth.logout();
    this.router.navigate(['/login']);
  }

  closeSidebarMobile(): void {
    if (window.innerWidth < 900) this.sidebarOpen.set(false);
  }

  toggleUserMenu(): void {
    this.userMenuOpen.update(v => !v);
  }

  // Ferme le menu user si clic ailleurs
  @HostListener('document:click', ['$event'])
  onDocClick(e: Event): void {
    const target = e.target as HTMLElement;
    if (!target.closest('.topbar-avatar') && !target.closest('.user-menu')) {
      this.userMenuOpen.set(false);
    }
  }
}