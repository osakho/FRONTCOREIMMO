import { Component, inject, signal, HostListener } from '@angular/core';
import { CommonModule }   from '@angular/common';
import { Router, RouterLink, RouterLinkActive, RouterOutlet, NavigationEnd } from '@angular/router';
import { AuthService }    from '../../core/services/api.services';
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

  <!-- ── Marque ─────────────────────────────── -->
  <div class="sb-brand">
    <div class="sb-logo">
      <div class="sb-emblem">🏛️</div>
      <div style="flex:1;min-width:0;">
        <div class="sb-name">Khalifat Djické</div>
        <div class="sb-sub">Gestion Immobilière</div>
      </div>
    </div>
  </div>

  <!-- ── Navigation ─────────────────────────── -->
  <nav class="sb-nav">

    <!-- Principal -->
    <div class="nav-section">Principal</div>

    <a routerLink="/dashboard" routerLinkActive="active" class="nav-item"
       (click)="closeSidebarMobile()">
      <span class="nav-icon">📊</span>
      <span>Tableau de bord</span>
    </a>

    <!-- Patrimoine -->
    <div class="nav-section">Patrimoine</div>

    <a routerLink="/proprietaires" routerLinkActive="active" class="nav-item"
       (click)="closeSidebarMobile()">
      <span class="nav-icon">👤</span>
      <span>Propriétaires</span>
    </a>

    <a *ngIf="isDirection()" routerLink="/proprietaires/dashboard"
       routerLinkActive="active" class="nav-item"
       (click)="closeSidebarMobile()">
      <span class="nav-icon">📋</span>
      <span>Dashboard propriétaires</span>
    </a>

    <a routerLink="/proprietes" routerLinkActive="active" class="nav-item"
       (click)="closeSidebarMobile()">
      <span class="nav-icon">🏢</span>
      <span>Propriétés</span>
    </a>

    <a routerLink="/produits" routerLinkActive="active" class="nav-item"
       (click)="closeSidebarMobile()">
      <span class="nav-icon">🔑</span>
      <span>Produits locatifs</span>
    </a>

    <!-- Gestion locative -->
    <div class="nav-section">Gestion locative</div>

    <a routerLink="/locataires" routerLinkActive="active" class="nav-item"
       (click)="closeSidebarMobile()">
      <span class="nav-icon">👥</span>
      <span>Locataires</span>
    </a>

    <a routerLink="/contrats-location" routerLinkActive="active" class="nav-item"
       (click)="closeSidebarMobile()">
      <span class="nav-icon">📄</span>
      <span>Contrats de location</span>
    </a>

    <a *ngIf="isDirection()" routerLink="/contrats-gestion"
       routerLinkActive="active" class="nav-item"
       (click)="closeSidebarMobile()">
      <span class="nav-icon">📑</span>
      <span>Contrats de gestion</span>
    </a>

    <!-- Collectes & Finance -->
    <div class="nav-section">Collectes &amp; Finance</div>

    <a routerLink="/collectes" routerLinkActive="active" class="nav-item"
       (click)="closeSidebarMobile()">
      <span class="nav-icon">💰</span>
      <span>Collectes</span>
    </a>

    <a *ngIf="isDirection()" routerLink="/collectes/validation"
       routerLinkActive="active" class="nav-item"
       (click)="closeSidebarMobile()">
      <span class="nav-icon">✅</span>
      <span>Validation collectes</span>
    </a>

    <a routerLink="/collectes/rapport" routerLinkActive="active" class="nav-item"
       (click)="closeSidebarMobile()">
      <span class="nav-icon">📊</span>
      <span>Rapport collecteur</span>
    </a>

    <a routerLink="/collectes/bordereau" routerLinkActive="active" class="nav-item"
       (click)="closeSidebarMobile()">
      <span class="nav-icon">🧾</span>
      <span>Bordereau</span>
    </a>

    <a routerLink="/versements" routerLinkActive="active" class="nav-item"
       (click)="closeSidebarMobile()">
      <span class="nav-icon">🏦</span>
      <span>Versements</span>
    </a>

    <!-- Administration -->
    <div class="nav-section" *ngIf="isDirection()">Administration</div>

    <a *ngIf="isDirection()" routerLink="/personnel"
       routerLinkActive="active" class="nav-item"
       (click)="closeSidebarMobile()">
      <span class="nav-icon">👷</span>
      <span>Personnel</span>
    </a>

  </nav>

  <!-- ── Pied : utilisateur connecté ───────── -->
  <div class="sb-footer">
    <div class="sb-avatar">{{ userInitiales() }}</div>
    <div class="sb-user-info">
      <div class="sb-user-name">{{ userName() }}</div>
      <div class="sb-user-role">{{ userRole() }}</div>
    </div>
    <button class="sb-logout-btn" (click)="logout()" title="Se déconnecter">
      ⏻
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
      background: var(--ink-mid);
      display: flex;
      flex-direction: column;
      position: fixed;
      top: 0; left: 0;
      height: 100vh;
      z-index: 200;
      transition: transform .28s ease;
      overflow: hidden;
    }

    /* ── Marque ── */
    .sb-brand {
      padding: 24px 20px 18px;
      border-bottom: 1px solid rgba(201,168,76,.2);
      flex-shrink: 0;
    }
    .sb-logo {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: nowrap;
    }
    .sb-emblem {
      width: 40px; height: 40px;
      background: linear-gradient(135deg, var(--gold), var(--gold-dark));
      border-radius: 10px;
      display: flex; align-items: center; justify-content: center;
      font-size: 18px; flex-shrink: 0;
    }
    .sb-name {
      font-family: 'Playfair Display', Georgia, serif;
      font-size: 14.5px; color: var(--gold-light);
      font-weight: 700; line-height: 1.25;
      white-space: nowrap;
      display: block;
    }
    .sb-sub {
      font-size: 9.5px; color: var(--muted);
      letter-spacing: 1.8px; text-transform: uppercase;
      margin-top: 2px;
      white-space: nowrap;
      display: block;
    }

    /* ── Nav ── */
    .sb-nav {
      flex: 1;
      padding: 14px 0;
      overflow-y: auto;
    }
    .sb-nav::-webkit-scrollbar { width: 3px; }
    .sb-nav::-webkit-scrollbar-thumb { background: rgba(255,255,255,.1); border-radius: 4px; }

    .nav-section {
      padding: 10px 20px 4px;
      font-size: 9px; letter-spacing: 2px;
      text-transform: uppercase;
      color: var(--muted); font-weight: 700;
      margin-top: 6px;
    }

    .nav-item {
      display: flex; align-items: center; gap: 11px;
      padding: 10px 20px;
      color: rgba(255,255,255,.58);
      text-decoration: none;
      font-size: 13.5px;
      border-left: 3px solid transparent;
      transition: all .16s;
      cursor: pointer;
      white-space: nowrap;
    }
    .nav-item:hover {
      background: rgba(201,168,76,.08);
      color: rgba(255,255,255,.88);
      border-left-color: rgba(201,168,76,.35);
    }
    .nav-item.active {
      background: rgba(201,168,76,.13);
      color: var(--gold-light);
      border-left-color: var(--gold);
      font-weight: 600;
    }
    .nav-icon {
      font-size: 16px; width: 20px;
      text-align: center; flex-shrink: 0;
    }

    /* ── Pied sidebar ── */
    .sb-footer {
      padding: 14px 18px;
      border-top: 1px solid rgba(255,255,255,.07);
      display: flex; align-items: center; gap: 10px;
      flex-shrink: 0;
    }
    .sb-avatar {
      width: 34px; height: 34px;
      background: linear-gradient(135deg, var(--gold), var(--gold-dark));
      border-radius: 8px;
      display: flex; align-items: center; justify-content: center;
      font-size: 13px; color: #fff; font-weight: 700;
      font-family: 'Playfair Display', serif;
      flex-shrink: 0; cursor: pointer;
    }
    .sb-user-info { flex: 1; min-width: 0; }
    .sb-user-name {
      font-size: 12.5px; color: rgba(255,255,255,.85);
      font-weight: 600; white-space: nowrap;
    }
    .sb-user-role { font-size: 10px; color: var(--muted); margin-top: 1px; }
    .sb-logout-btn {
      background: none; border: none; cursor: pointer;
      color: rgba(255,255,255,.35); font-size: 16px;
      padding: 4px; border-radius: 6px; transition: all .2s;
      flex-shrink: 0;
    }
    .sb-logout-btn:hover { color: var(--danger); background: rgba(192,57,43,.15); }

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

  // ── États réactifs ───────────────────────────────
  sidebarOpen  = signal(false);
  userMenuOpen = signal(false);

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