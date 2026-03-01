import { Component, inject, signal } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../core/services/api.services';

interface NavItem {
  label:    string;
  icon:     string;
  route:    string;
  roles?:   string[];
  badge?:   number;
}

@Component({
  selector: 'kdi-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, CommonModule],
  template: `
    <div class="shell">
      <!-- ── Sidebar ─────────────────────────────── -->
      <aside class="sidebar" [class.collapsed]="sidebarCollapsed()">
        <!-- Logo -->
        <div class="sidebar-logo">
          <div class="logo-mark">
            <span class="logo-icon">🏢</span>
            <span class="logo-text" *ngIf="!sidebarCollapsed()">
              <strong>KD</strong> Immo
            </span>
          </div>
          <button class="collapse-btn" (click)="toggleSidebar()">
            <span>{{ sidebarCollapsed() ? '›' : '‹' }}</span>
          </button>
        </div>

        <!-- Navigation -->
        <nav class="sidebar-nav">
          <div class="nav-section">
            <span class="nav-section-label" *ngIf="!sidebarCollapsed()">GÉNÉRAL</span>
            <a *ngFor="let item of mainNav"
               [routerLink]="item.route"
               routerLinkActive="active"
               class="nav-item"
               [title]="sidebarCollapsed() ? item.label : ''">
              <span class="nav-icon">{{ item.icon }}</span>
              <span class="nav-label" *ngIf="!sidebarCollapsed()">{{ item.label }}</span>
              <span class="nav-badge" *ngIf="item.badge && !sidebarCollapsed()">{{ item.badge }}</span>
            </a>
          </div>

          <div class="nav-section" *ngIf="isDirection()">
            <span class="nav-section-label" *ngIf="!sidebarCollapsed()">DIRECTION</span>
            <a *ngFor="let item of directionNav"
               [routerLink]="item.route"
               routerLinkActive="active"
               class="nav-item"
               [title]="sidebarCollapsed() ? item.label : ''">
              <span class="nav-icon">{{ item.icon }}</span>
              <span class="nav-label" *ngIf="!sidebarCollapsed()">{{ item.label }}</span>
            </a>
          </div>
        </nav>

        <!-- User info -->
        <div class="sidebar-user" *ngIf="!sidebarCollapsed()">
          <div class="user-avatar">{{ userInitials() }}</div>
          <div class="user-info">
            <div class="user-name">{{ userName() }}</div>
            <div class="user-role">{{ userRole() }}</div>
          </div>
          <button class="logout-btn" (click)="logout()" title="Déconnexion">↩</button>
        </div>
        <div class="sidebar-user-collapsed" *ngIf="sidebarCollapsed()">
          <div class="user-avatar small">{{ userInitials() }}</div>
        </div>
      </aside>

      <!-- ── Main ───────────────────────────────── -->
      <main class="main-content">
        <!-- Topbar -->
        <header class="topbar">
          <div class="topbar-left">
            <h1 class="page-title">Khalifat Djické Immobilier</h1>
          </div>
          <div class="topbar-right">
            <span class="topbar-date">{{ today | date:'EEEE d MMMM yyyy':'':'fr' }}</span>
            <button class="topbar-btn" title="Notifications">🔔</button>
            <button class="topbar-btn logout" (click)="logout()">↩ Déconnexion</button>
          </div>
        </header>

        <!-- Page content -->
        <div class="page-content">
          <router-outlet />
        </div>
      </main>
    </div>
  `,
  styles: [`
    :host { display: block; height: 100vh; }

    .shell { display: flex; height: 100vh; background: #f0f2f5; font-family: 'Inter', sans-serif; }

    /* ── Sidebar ── */
    .sidebar {
      width: 240px; min-height: 100vh; background: #0c1a35;
      display: flex; flex-direction: column;
      transition: width .25s ease; flex-shrink: 0;
      position: relative; z-index: 100;
    }
    .sidebar.collapsed { width: 64px; }

    .sidebar-logo {
      display: flex; align-items: center; justify-content: space-between;
      padding: 20px 16px; border-bottom: 1px solid rgba(255,255,255,.1);
      min-height: 70px;
    }
    .logo-mark { display: flex; align-items: center; gap: 10px; }
    .logo-icon { font-size: 24px; }
    .logo-text { color: #fff; font-size: 18px; font-weight: 300; white-space: nowrap; }
    .logo-text strong { font-weight: 700; color: #c8a96e; }
    .collapse-btn {
      background: rgba(255,255,255,.1); border: none; color: #fff;
      width: 24px; height: 24px; border-radius: 4px; cursor: pointer;
      font-size: 16px; display: flex; align-items: center; justify-content: center;
    }
    .collapse-btn:hover { background: rgba(255,255,255,.2); }

    .sidebar-nav { flex: 1; padding: 16px 0; overflow-y: auto; }
    .nav-section { margin-bottom: 24px; }
    .nav-section-label {
      padding: 0 16px 8px; font-size: 10px; font-weight: 600;
      color: rgba(255,255,255,.4); letter-spacing: 1px; text-transform: uppercase;
    }

    .nav-item {
      display: flex; align-items: center; gap: 12px;
      padding: 10px 16px; color: rgba(255,255,255,.7);
      text-decoration: none; transition: all .15s;
      border-left: 3px solid transparent; position: relative;
    }
    .nav-item:hover { background: rgba(255,255,255,.08); color: #fff; }
    .nav-item.active { background: rgba(200,169,110,.15); color: #c8a96e; border-left-color: #c8a96e; }
    .nav-icon { font-size: 18px; min-width: 20px; text-align: center; }
    .nav-label { font-size: 14px; white-space: nowrap; overflow: hidden; }
    .nav-badge {
      margin-left: auto; background: #e74c3c; color: #fff;
      font-size: 11px; padding: 2px 6px; border-radius: 10px;
    }

    .sidebar-user {
      display: flex; align-items: center; gap: 10px;
      padding: 16px; border-top: 1px solid rgba(255,255,255,.1);
    }
    .user-avatar {
      width: 36px; height: 36px; border-radius: 50%; background: #c8a96e;
      color: #0c1a35; font-weight: 700; display: flex; align-items: center;
      justify-content: center; font-size: 14px; flex-shrink: 0;
    }
    .user-avatar.small { width: 32px; height: 32px; font-size: 12px; }
    .user-info { flex: 1; overflow: hidden; }
    .user-name { color: #fff; font-size: 13px; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .user-role { color: rgba(255,255,255,.5); font-size: 11px; }
    .logout-btn { background: none; border: none; color: rgba(255,255,255,.5); cursor: pointer; font-size: 16px; }
    .logout-btn:hover { color: #e74c3c; }
    .sidebar-user-collapsed { display: flex; justify-content: center; padding: 16px 0; border-top: 1px solid rgba(255,255,255,.1); }

    /* ── Main ── */
    .main-content { flex: 1; display: flex; flex-direction: column; overflow: hidden; min-width: 0; }

    .topbar {
      height: 64px; background: #fff; border-bottom: 1px solid #e8ecf0;
      display: flex; align-items: center; justify-content: space-between;
      padding: 0 24px; flex-shrink: 0; gap: 16px;
    }
    .page-title { font-size: 18px; font-weight: 700; color: #0c1a35; margin: 0; }
    .topbar-right { display: flex; align-items: center; gap: 12px; }
    .topbar-date { font-size: 13px; color: #64748b; }
    .topbar-btn {
      background: none; border: 1px solid #e2e8f0; border-radius: 8px;
      padding: 6px 12px; cursor: pointer; font-size: 13px; color: #475569;
    }
    .topbar-btn:hover { background: #f8fafc; }
    .topbar-btn.logout:hover { color: #e74c3c; border-color: #fecaca; }

    .page-content { flex: 1; overflow-y: auto; padding: 24px; }
  `]
})
export class ShellComponent {
  private auth   = inject(AuthService);
  private router = inject(Router);

  sidebarCollapsed = signal(false);
  today = new Date();

  mainNav: NavItem[] = [
    { label: 'Tableau de bord',     icon: '📊', route: '/dashboard' },
    { label: 'Propriétaires',       icon: '👤', route: '/proprietaires' },
    { label: 'Propriétés',          icon: '🏘️', route: '/proprietes' },
    { label: 'Produits locatifs',   icon: '🏠', route: '/produits' },
    { label: 'Locataires',          icon: '🧑‍🤝‍🧑', route: '/locataires' },
    { label: 'Contrats de location', icon: '📋', route: '/contrats-location' },
    { label: 'Collectes',           icon: '💰', route: '/collectes' },
  ];

  directionNav: NavItem[] = [
    { label: 'Contrats de gestion', icon: '🤝', route: '/contrats-gestion' },
    { label: 'Versements',          icon: '💸', route: '/versements' },
    { label: 'Personnel',           icon: '👥', route: '/personnel' },
    { label: 'Portefeuille', icon: '📊', route: '/proprietaires/dashboard' },
  ];

  toggleSidebar()  { this.sidebarCollapsed.update(v => !v); }
  logout()         { this.auth.logout(); this.router.navigate(['/login']); }
  isDirection()    { return this.auth.isDirection(); }
  userName()       { return this.auth.getUser()?.nom ?? ''; }
  userRole()       { return this.auth.getUser()?.role ?? ''; }
  userInitials()   {
    const u = this.auth.getUser();
    return u ? (u.nom ?? '?').charAt(0).toUpperCase() : '?';
  }
}
