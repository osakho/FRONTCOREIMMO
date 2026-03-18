import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule }                        from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive, Router, NavigationEnd } from '@angular/router';
import { FormsModule }                         from '@angular/forms';
import { DomSanitizer, SafeHtml }              from '@angular/platform-browser';
import { AuthService }                         from '../../core/services/api.services';
import { filter }                              from 'rxjs/operators';

interface NavItem {
  label:       string;
  route:       string;
  badge?:      string;
  badgeColor?: 'gold' | 'blue' | 'red';
  icon:        SafeHtml;
}

interface NavSection {
  label:     string;
  key:       string;
  items:     NavItem[];
  collapsed: boolean;
}

@Component({
  selector: 'kdi-shell',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, FormsModule],
  template: `
<div class="shell">

  <!-- ── SIDEBAR ── -->
  <aside class="sidebar" [class.collapsed]="sidebarCollapsed()">

    <!-- Logo / Profil -->
    <div class="logo-block">
      <div class="logo-icon">KD</div>
      <div class="logo-info" *ngIf="!sidebarCollapsed()">
        <div class="logo-name">{{ user?.nom ?? 'Khalifat Djické' }}</div>
        <div class="logo-role">{{ user?.role ?? 'Direction' }}</div>
      </div>
      <button class="logout-btn" (click)="logout()" title="Déconnexion" *ngIf="!sidebarCollapsed()">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
          <polyline points="16 17 21 12 16 7"/>
          <line x1="21" y1="12" x2="9" y2="12"/>
        </svg>
      </button>
    </div>

    <!-- Navigation -->
    <nav class="nav">
      <div class="nav-section" *ngFor="let section of sections; let last = last">

        <!-- Section header (uppercase via CSS) -->
        <div class="section-label" (click)="toggleSection(section)"
             [class.is-collapsed]="section.collapsed"
             [title]="sidebarCollapsed() ? section.label : ''">
          <span *ngIf="!sidebarCollapsed()">{{ section.label }}</span>
          <span class="chevron" *ngIf="!sidebarCollapsed()" [class.rotated]="section.collapsed">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </span>
        </div>

        <!-- Items -->
        <div class="section-items" [class.hidden]="section.collapsed && !sidebarCollapsed()">
          <a *ngFor="let item of section.items"
             [routerLink]="item.route"
             routerLinkActive="active"
             class="nav-item"
             [title]="sidebarCollapsed() ? item.label : ''">
            <!-- icon via SafeHtml -->
            <span class="nav-icon" [innerHTML]="item.icon"></span>
            <span class="nav-label-text" *ngIf="!sidebarCollapsed()">{{ item.label }}</span>
            <span class="nav-badge" *ngIf="item.badge && !sidebarCollapsed()"
              [ngClass]="'badge-' + (item.badgeColor ?? 'gold')">{{ item.badge }}</span>
          </a>
        </div>

        <!-- Séparateur -->
        <div class="nav-sep" *ngIf="!last && !sidebarCollapsed()"></div>

      </div>
    </nav>

    <!-- Toggle sidebar -->
    <div class="sidebar-footer">
      <button class="toggle-btn" (click)="toggleSidebar()">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline *ngIf="!sidebarCollapsed()" points="15 18 9 12 15 6"/>
          <polyline *ngIf="sidebarCollapsed()"  points="9 18 15 12 9 6"/>
        </svg>
        <span *ngIf="!sidebarCollapsed()">Réduire</span>
      </button>
    </div>

  </aside>

  <!-- ── MAIN ── -->
  <div class="main-wrapper">

    <!-- Topbar -->
    <header class="topbar">
      <div class="topbar-left">
        <div class="topbar-breadcrumb">
          <span class="breadcrumb-app">KDI</span>
          <span class="breadcrumb-sep">›</span>
          <span class="breadcrumb-page">{{ pageTitle }}</span>
        </div>
      </div>
      <div class="topbar-right">
        <div class="search-box">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input type="text" placeholder="Rechercher…" [(ngModel)]="searchQuery" class="search-input">
        </div>
        <div class="notif-btn" (click)="showNotifs = !showNotifs">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
          </svg>
          <span class="notif-badge" *ngIf="nbNotifs > 0">{{ nbNotifs }}</span>
        </div>
        <div class="avatar-btn" (click)="showUserMenu = !showUserMenu">
          <span>{{ initiales }}</span>
        </div>
        <div class="user-menu" *ngIf="showUserMenu" (click)="$event.stopPropagation()">
          <div class="um-header">
            <div class="um-name">{{ user?.nom }}</div>
            <div class="um-role">{{ user?.role }}</div>
          </div>
          <div class="um-divider"></div>
          <button class="um-item" routerLink="/personnel">👤 Mon profil</button>
          <button class="um-item" routerLink="/parametres">⚙️ Paramètres</button>
          <div class="um-divider"></div>
          <button class="um-item um-logout" (click)="logout()">↩ Déconnexion</button>
        </div>
      </div>
    </header>

    <!-- Contenu -->
    <main class="page-content" (click)="closeMenus()">
      <router-outlet />
    </main>

  </div>
</div>
  `,
  styles: [`
    *, *::before, *::after { box-sizing: border-box; }

    :host {
      --gold:      #C9A84C;
      --gold-dim:  rgba(201,168,76,0.10);
      --sb-bg:     #0D1117;
      --sb-hover:  #161C2A;
      --sb-border: rgba(255,255,255,0.04);
      --sb-section:#3D4A6A;
      --sb-item:   #6878A0;
      --sb-active: #C9A84C;
      --sb-width:  210px;
      --sb-mini:   54px;
      --top-h:     54px;
      --page-bg:   #F1F4F8;
      --danger:    #E05C5C;
    }

    .shell {
      display: flex; height: 100vh; overflow: hidden;
      font-family: 'DM Sans', 'Inter', sans-serif;
      background: var(--page-bg);
    }

    /* ═══ SIDEBAR ═══ */
    .sidebar {
      width: var(--sb-width);
      background: var(--sb-bg);
      border-right: 1px solid rgba(201,168,76,0.13);
      display: flex; flex-direction: column;
      height: 100vh; flex-shrink: 0;
      transition: width .25s ease; overflow: hidden;
    }
    .sidebar.collapsed { width: var(--sb-mini); }

    /* Logo */
    .logo-block {
      padding: 13px 11px;
      border-bottom: 1px solid var(--sb-border);
      display: flex; align-items: center; gap: 9px;
      flex-shrink: 0; min-height: 62px;
    }
    .logo-icon {
      width: 33px; height: 33px;
      background: linear-gradient(135deg, #C9A84C, #7A4F0D);
      border-radius: 8px; display: flex; align-items: center; justify-content: center;
      font-family: 'Syne', sans-serif; font-weight: 800; font-size: 12px; color: #fff;
      flex-shrink: 0; letter-spacing: -0.5px;
    }
    .logo-info { flex: 1; min-width: 0; }
    .logo-name {
      font-family: 'Syne', sans-serif; font-size: 12px; font-weight: 700; color: #E2E8F0;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis; line-height: 1.3;
    }
    .logo-role { font-size: 10px; color: #4A5570; margin-top: 1px; }
    .logout-btn {
      width: 25px; height: 25px; border-radius: 6px; background: none; border: none;
      cursor: pointer; color: #4A5570; display: flex; align-items: center; justify-content: center;
      transition: background .2s, color .2s; flex-shrink: 0;
    }
    .logout-btn:hover { background: rgba(224,92,92,.12); color: var(--danger); }

    /* Nav */
    .nav { flex: 1; overflow-y: auto; overflow-x: hidden; padding: 8px 0 12px; }
    .nav::-webkit-scrollbar { width: 2px; }
    .nav::-webkit-scrollbar-thumb { background: rgba(201,168,76,.15); border-radius: 1px; }

    /* Section header — uppercase, petit, discret */
    .nav-section { padding: 0 6px; }
    .section-label {
      display: flex; align-items: center; justify-content: space-between;
      padding: 8px 6px 4px;
      font-size: 9px; font-weight: 700; letter-spacing: 1.3px;
      text-transform: uppercase;
      color: var(--sb-section); cursor: pointer; user-select: none;
      transition: color .15s; white-space: nowrap;
    }
    .section-label:hover { color: #5A6A8A; }
    .chevron { display: flex; align-items: center; opacity: .5; transition: transform .22s ease; flex-shrink: 0; }
    .chevron.rotated { transform: rotate(-90deg); }

    /* Items container */
    .section-items {
      overflow: hidden; max-height: 500px;
      transition: max-height .28s ease, opacity .22s ease; opacity: 1;
    }
    .section-items.hidden { max-height: 0; opacity: 0; }

    /* Nav item — minuscule, compact */
    .nav-item {
      display: flex; align-items: center; gap: 8px;
      padding: 6px 7px; border-radius: 6px;
      font-size: 12px !important;
      font-weight: 500;
      color: var(--sb-item);
      text-transform: none !important;
      letter-spacing: normal !important;
      text-decoration: none; cursor: pointer;
      transition: background .14s, color .14s;
      position: relative; margin-bottom: 1px; white-space: nowrap;
    }
    .nav-item:hover { background: var(--sb-hover); color: #B0BEDD; }
    .nav-item.active { background: var(--gold-dim); color: var(--sb-active); }
    .nav-item.active::before {
      content: ''; position: absolute; left: 0; top: 50%; transform: translateY(-50%);
      width: 2.5px; height: 50%; background: var(--gold); border-radius: 0 2px 2px 0;
    }

    /* Label text — forcer minuscule */
    .nav-label-text {
      flex: 1;
      text-transform: none !important;
      letter-spacing: normal !important;
      font-size: 12px !important;
    }

    /* Icon container — le SVG est injecté via innerHTML/SafeHtml */
    .nav-icon {
      width: 16px; height: 16px; flex-shrink: 0;
      display: flex; align-items: center; justify-content: center;
      opacity: .55; transition: opacity .14s;
      color: currentColor;
    }
    .nav-item:hover .nav-icon,
    .nav-item.active .nav-icon { opacity: 1; }

    /* Force SVG size inside nav-icon */
    .nav-icon svg {
      width: 14px !important;
      height: 14px !important;
      display: block;
      stroke: currentColor;
      fill: none;
    }

    /* Badge */
    .nav-badge {
      margin-left: auto; flex-shrink: 0;
      font-size: 9px; font-weight: 700; padding: 1px 5px; border-radius: 8px; line-height: 1.6;
    }
    .badge-gold { background: #C9A84C; color: #000; }
    .badge-blue { background: #3B82F6; color: #fff; }
    .badge-red  { background: #E05C5C; color: #fff; }

    /* Separator */
    .nav-sep { height: 1px; background: var(--sb-border); margin: 5px 4px; }

    /* Footer */
    .sidebar-footer { padding: 6px; border-top: 1px solid var(--sb-border); flex-shrink: 0; }
    .toggle-btn {
      width: 100%; border-radius: 6px; background: #161C2A;
      border: 1px solid rgba(255,255,255,0.05); color: #3D4A6A; cursor: pointer;
      padding: 7px 10px; display: flex; align-items: center; justify-content: center;
      gap: 6px; font-size: 11px; font-family: 'DM Sans', sans-serif;
      transition: background .2s, color .2s; text-transform: none;
    }
    .toggle-btn:hover { background: #1C2336; color: #6878A0; }

    /* Collapsed */
    .sidebar.collapsed .nav-item { justify-content: center; padding: 8px; }
    .sidebar.collapsed .section-label { justify-content: center; padding: 6px; }
    .sidebar.collapsed .nav-icon { width: 18px; height: 18px; opacity: .65; }
    .sidebar.collapsed .nav-icon svg { width: 16px !important; height: 16px !important; }
    .sidebar.collapsed .nav-item.active::before { display: none; }
    .sidebar.collapsed .toggle-btn { padding: 8px; }

    /* ═══ MAIN ═══ */
    .main-wrapper { flex: 1; display: flex; flex-direction: column; min-width: 0; overflow: hidden; }

    .topbar {
      height: var(--top-h); background: #ffffff; border-bottom: 1px solid #E2E8F0;
      display: flex; align-items: center; justify-content: space-between;
      padding: 0 24px; gap: 16px; flex-shrink: 0; position: relative;
      box-shadow: 0 1px 3px rgba(0,0,0,.04);
    }
    .topbar-left { display: flex; align-items: center; }
    .topbar-right { display: flex; align-items: center; gap: 10px; }

    .topbar-breadcrumb { display: flex; align-items: center; gap: 6px; }
    .breadcrumb-app { font-size: 12px; color: #94A3B8; }
    .breadcrumb-sep { color: #CBD5E1; font-size: 13px; }
    .breadcrumb-page { font-size: 14px; font-weight: 600; color: #0F172A; font-family: 'Syne', sans-serif; }

    .search-box {
      display: flex; align-items: center; gap: 8px;
      background: #F8FAFC; border: 1px solid #E2E8F0;
      border-radius: 8px; padding: 6px 12px; transition: border-color .2s;
    }
    .search-box:focus-within { border-color: #C9A84C; }
    .search-box svg { color: #94A3B8; flex-shrink: 0; }
    .search-input {
      background: none; border: none; outline: none;
      font-size: 13px; color: #0F172A; font-family: inherit; width: 160px;
    }
    .search-input::placeholder { color: #94A3B8; }

    .notif-btn {
      width: 34px; height: 34px; border-radius: 8px;
      background: #F8FAFC; border: 1px solid #E2E8F0;
      display: flex; align-items: center; justify-content: center;
      cursor: pointer; color: #64748B; position: relative; transition: background .2s, color .2s;
    }
    .notif-btn:hover { background: #F1F5F9; color: #0F172A; }
    .notif-badge {
      position: absolute; top: -4px; right: -4px; width: 15px; height: 15px; border-radius: 50%;
      background: var(--danger); color: #fff; font-size: 9px; font-weight: 700;
      display: flex; align-items: center; justify-content: center;
    }

    .avatar-btn {
      width: 34px; height: 34px; border-radius: 50%;
      background: linear-gradient(135deg, #C9A84C, #7A4F0D);
      display: flex; align-items: center; justify-content: center;
      font-size: 12px; font-weight: 700; color: #fff; cursor: pointer; flex-shrink: 0;
      font-family: 'Syne', sans-serif;
    }

    .user-menu {
      position: absolute; top: calc(var(--top-h) + 4px); right: 16px;
      background: #ffffff; border: 1px solid #E2E8F0; border-radius: 12px; width: 196px;
      box-shadow: 0 8px 30px rgba(0,0,0,.10); z-index: 500; overflow: hidden;
      animation: popIn .15s ease;
    }
    @keyframes popIn { from { opacity:0; transform:translateY(-6px); } to { opacity:1; transform:translateY(0); } }
    .um-header { padding: 13px 15px; }
    .um-name { font-size: 13px; font-weight: 600; color: #0F172A; }
    .um-role { font-size: 11px; color: #64748B; margin-top: 2px; }
    .um-divider { height: 1px; background: #F1F5F9; }
    .um-item {
      width: 100%; text-align: left; background: none; border: none;
      padding: 9px 15px; font-size: 13px; color: #475569; cursor: pointer; display: block;
      transition: background .14s, color .14s; font-family: inherit; text-transform: none;
    }
    .um-item:hover { background: #F8FAFC; color: #0F172A; }
    .um-logout { color: var(--danger); }
    .um-logout:hover { background: #FEF2F2; }

    .page-content { flex: 1; overflow-y: auto; padding: 28px; background: var(--page-bg); }
    .page-content::-webkit-scrollbar { width: 5px; }
    .page-content::-webkit-scrollbar-thumb { background: #CBD5E1; border-radius: 3px; }
    .page-content::-webkit-scrollbar-track { background: transparent; }
  `]
})
export class ShellComponent implements OnInit {
  private auth      = inject(AuthService);
  private router    = inject(Router);
  private sanitizer = inject(DomSanitizer);

  sidebarCollapsed = signal(false);
  showUserMenu     = false;
  showNotifs       = false;
  searchQuery      = '';
  pageTitle        = 'Tableau de bord';
  nbNotifs         = 3;

  get user()      { return this.auth.getUser(); }
  get initiales() {
    const n = this.user?.nom ?? 'KD';
    return n.split(' ').map((p: string) => p[0]).join('').substring(0, 2).toUpperCase();
  }

  /** Sanitize raw SVG string so Angular renders it via [innerHTML] */
  private svg(raw: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(raw);
  }

  sections: NavSection[] = [];

  ngOnInit() {
    // Build sections here so sanitizer is available
    this.sections = [
      {
        label: 'Patrimoine', key: 'patrimoine', collapsed: false,
        items: [
          { label: 'Tableau de bord',   route: '/dashboard',     icon: this.svg(ICONS.grid) },
          { label: 'Propriétaires',     route: '/proprietaires', icon: this.svg(ICONS.user) },
          { label: 'Propriétés',        route: '/proprietes',    icon: this.svg(ICONS.home) },
          { label: 'Produits locatifs', route: '/produits',      icon: this.svg(ICONS.tag)  },
        ]
      },
      {
        label: 'Gestion Locative', key: 'locative', collapsed: false,
        items: [
          { label: 'Locataires',           route: '/locataires',        icon: this.svg(ICONS.users) },
          { label: 'Contrats de location', route: '/contrats-location', icon: this.svg(ICONS.filePlus) },
          { label: 'Contrats de gestion',  route: '/contrats-gestion',  icon: this.svg(ICONS.fileCheck) },
          { label: 'Suivi des loyers',     route: '/suivi-loyers',      icon: this.svg(ICONS.payments)  },
        ]
      },
      {
        label: 'Collectes & Finance', key: 'finance', collapsed: false,
        items: [
          { label: 'Collectes',            route: '/collectes',            icon: this.svg(ICONS.coins),       badge: '5', badgeColor: 'gold' },
          { label: 'Validation collectes', route: '/collectes/validation', icon: this.svg(ICONS.checkSquare) },
          { label: 'Rapport collecteur',   route: '/collectes/rapport',    icon: this.svg(ICONS.barChart) },
          { label: 'Bordereau',            route: '/collectes/bordereau',  icon: this.svg(ICONS.fileText) },
          { label: 'Versements',           route: '/versements',           icon: this.svg(ICONS.creditCard) },
          { label: 'Suivi versements',     route: '/suivi-versements',     icon: this.svg(ICONS.wallet) },
          { label: 'Reversements',         route: '/reversements',         icon: this.svg(ICONS.arrowDown) },
          { label: 'Contentieux',          route: '/contentieux',          icon: this.svg(ICONS.alertCircle), badge: '3', badgeColor: 'red' },
          { label: 'Recouvrement',         route: '/recouvrement',         icon: this.svg(ICONS.refresh) },
          { label: 'Charges propriétaires', route: '/charges-proprietaire', icon: this.svg(ICONS.wallet) },
          { label: 'Suivi collecteur',     route: '/suivi-collecteur', icon: this.svg(ICONS.clipboardList) },
          { label: 'Bord financier agence', route: '/tableau-bord-agence', icon: this.svg(ICONS.barChart) },
          
        ]
      },
      {
        label: 'Travaux & Chantiers', key: 'travaux', collapsed: false,
        items: [
          { label: 'Suivi des tâches', route: '/taches',        icon: this.svg(ICONS.check),    badge: '8', badgeColor: 'blue' },
          { label: 'Devis travaux',    route: '/devis-travaux', icon: this.svg(ICONS.drafting) },
          { label: 'Suivi chantiers',  route: '/chantiers',     icon: this.svg(ICONS.building),  badge: '4', badgeColor: 'gold' },
          { label: 'Agenda',           route: '/agenda',        icon: this.svg(ICONS.calendar) },
        ]
      },
      {
        label: 'Administration', key: 'admin', collapsed: false,
        items: [
          { label: 'Personnel',  route: '/personnel',  icon: this.svg(ICONS.userTie) },
          { label: 'Rapports',   route: '/rapports',   icon: this.svg(ICONS.pieChart) },
          { label: 'Paramètres', route: '/parametres', icon: this.svg(ICONS.settings) },
        ]
      }
    ];

    this.router.events.pipe(filter(e => e instanceof NavigationEnd))
      .subscribe((e: any) => {
        this.pageTitle = this.findTitle(e.urlAfterRedirects.split('?')[0]);
      });
    this.pageTitle = this.findTitle(this.router.url.split('?')[0]);
  }

  private readonly titles: Record<string, string> = {
    '/dashboard':             'Tableau de bord',
    '/proprietaires':         'Propriétaires',
    '/proprietes':            'Propriétés',
    '/produits':              'Produits locatifs',
    '/locataires':            'Locataires',
    '/contrats-location':     'Contrats de location',
    '/contrats-gestion':      'Contrats de gestion',
    '/suivi-loyers':          'Suivi des loyers',
    '/suivi-versements': 'Suivi des versements',
    '/collectes':             'Collectes',
    '/collectes/validation':  'Validation collectes',
    '/collectes/rapport':     'Rapport collecteur',
    '/collectes/bordereau':   'Bordereau',
    '/collectes/saisir':      'Saisir une collecte',
    '/versements':            'Versements',
    '/reversements':          'Reversements',
    '/contentieux':           'Contentieux',
    '/recouvrement':          'Recouvrement',
    '/charges-proprietaire': 'Charges & Déductions',
    '/taches':                'Suivi des tâches',
    '/devis-travaux':         'Devis travaux',
    '/chantiers':             'Suivi chantiers',
    '/agenda':                'Agenda',
    '/personnel':             'Personnel',
    '/rapports':              'Rapports',
    '/parametres':            'Paramètres',
    '/tableau-bord-agence':   'Tableau de bord financier',
  };

  private findTitle(url: string): string {
    if (this.titles[url]) return this.titles[url];
    const prefix = Object.keys(this.titles).find(k => url.startsWith(k + '/'));
    return prefix ? this.titles[prefix] : 'Khalifat Djické';
  }

  toggleSection(section: NavSection) { section.collapsed = !section.collapsed; }
  toggleSidebar() { this.sidebarCollapsed.update(v => !v); }
  closeMenus()    { this.showUserMenu = false; this.showNotifs = false; }
  logout()        { this.auth.logout(); this.router.navigate(['/login']); }
}

// ── Raw SVG strings (14×14, stroke="currentColor") ───────────────────────────
const ICONS = {
  grid:        `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>`,
  user:        `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
  home:        `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`,
  tag:         `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>`,
  users:       `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
  filePlus:    `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></svg>`,
  fileCheck:   `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><polyline points="9 15 11 17 15 13"/></svg>`,
  coins:       `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="8" r="6"/><path d="M18.09 10.37A6 6 0 1 1 10.34 18"/><path d="M7 6h1v4"/><line x1="16.71" y1="13.88" x2="13.29" y2="19.06"/></svg>`,
  checkSquare: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>`,
  barChart:    `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>`,
  fileText:    `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="16" y2="17"/></svg>`,
  creditCard:  `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>`,
  alertCircle: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,
  refresh:     `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-4.5"/></svg>`,
  check:       `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`,
  drafting:    `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19l7-7 3 3-7 7-3-3z"/><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/><path d="M2 2l7.586 7.586"/><circle cx="11" cy="11" r="2"/></svg>`,
  building:    `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="8" height="8" rx="1"/><rect x="14" y="3" width="8" height="8" rx="1"/><rect x="2" y="15" width="8" height="6" rx="1"/><rect x="14" y="15" width="8" height="6" rx="1"/></svg>`,
  calendar:    `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`,
  userTie:     `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/><line x1="12" y1="11" x2="12" y2="17"/><polyline points="10 13 12 15 14 13"/></svg>`,
  pieChart:    `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.21 15.89A10 10 0 1 1 8 2.83"/><path d="M22 12A10 10 0 0 0 12 2v10z"/></svg>`,
  settings:    `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`,
  arrowDown:   `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg>`,
  payments:    `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/><line x1="6" y1="15" x2="10" y2="15"/><line x1="14" y1="15" x2="18" y2="15"/></svg>`,
  wallet: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4z"/></svg>`,
  clipboardList: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1"/><line x1="9" y1="12" x2="15" y2="12"/><line x1="9" y1="16" x2="13" y2="16"/></svg>`,
};