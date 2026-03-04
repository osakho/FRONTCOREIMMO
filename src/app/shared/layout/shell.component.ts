import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, RouterLinkActive, RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';

interface NavItem {
  label: string;
  icon: string;
  route: string;
  badge?: number;
  badgeType?: 'red' | 'gold';
}

interface NavGroup {
  section: string;
  items: NavItem[];
}

@Component({
  selector: 'kdi-shell',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, RouterLinkActive, RouterOutlet],
  template: `
    <div class="app-shell">
      <!-- ══ SIDEBAR ══ -->
      <aside class="sidebar">
        <div class="sb-brand">
          <div class="sb-logo"><span class="mi">home_work</span></div>
          <div>
            <div class="sb-name">Khalifat Djické</div>
            <div class="sb-tag">Immobilier · Mauritanie</div>
          </div>
        </div>
        <nav class="sb-nav">
          <ng-container *ngFor="let group of navGroups">
            <div class="nav-section">{{ group.section }}</div>
            <a *ngFor="let item of group.items"
               [routerLink]="item.route"
               routerLinkActive="active"
               class="nav-item">
              <span class="mi">{{ item.icon }}</span>
              {{ item.label }}
              <span *ngIf="item.badge" class="nav-badge"
                    [class.red]="item.badgeType==='red'"
                    [class.gold]="item.badgeType==='gold'">
                {{ item.badge }}
              </span>
            </a>
          </ng-container>
        </nav>
        <div class="sb-footer">
          <div class="user-row">
            <div class="user-avatar">{{ initiales }}</div>
            <div>
              <div class="user-name">{{ userName }}</div>
              <div class="user-role">{{ userRole }}</div>
            </div>
            <span class="mi" style="color:rgba(255,255,255,.2);font-size:15px">more_vert</span>
          </div>
        </div>
      </aside>

      <!-- ══ MAIN ══ -->
      <div class="main-area">
        <header class="topbar">
          <div class="topbar-title">{{ pageTitle() }}</div>
          <div class="topbar-search">
            <span class="mi">search</span>
            <input placeholder="Rechercher…" [(ngModel)]="searchQuery" (keyup.enter)="onSearch()">
          </div>
          <button class="icon-btn" title="Notifications">
            <span class="mi">notifications</span>
            <span class="notif-dot" *ngIf="hasNotifications"></span>
          </button>
          <button class="icon-btn" title="Aide">
            <span class="mi">help_outline</span>
          </button>
          <div class="user-avatar" style="cursor:pointer;margin-left:2px">{{ initiales }}</div>
        </header>

        <!-- Le content-area NE SCROLL PLUS lui-même — c'est le router-outlet qui gère son scroll -->
        <main class="content-area">
          <router-outlet></router-outlet>
        </main>
      </div>
    </div>

    <!-- Toast container -->
    <div class="toast-wrapper" id="toast-wrapper"></div>
  `,
  styles: [`
    :host { display: contents; }
    .topbar-search input { width: 100%; }

    /* CRITICAL FIX : content-area ne doit PAS avoir overflow-y:auto
       car cela casse position:fixed des modals enfants.
       Le scroll est géré par le composant page lui-même via .page-enter */
    .content-area {
      flex: 1;
      overflow: visible !important;
      padding: 0;
    }
  `]
})
export class ShellComponent implements OnInit {
  private router = inject(Router);

  pageTitle = signal('Tableau de bord');
  searchQuery = '';
  hasNotifications = true;
  userName = 'Khalifat Djické';
  userRole = 'Direction';
  initiales = 'KD';

  readonly navGroups: NavGroup[] = [
    {
      section: 'Principal',
      items: [
        { label: 'Tableau de bord',      icon: 'dashboard',              route: '/dashboard' },
        { label: 'Contrats de location', icon: 'description',            route: '/contrats-location' },
        { label: 'Saisie collectes',     icon: 'payments',               route: '/collectes',            badge: 12, badgeType: 'gold' },
        { label: 'Validation comptable', icon: 'fact_check',             route: '/collectes/validation', badge: 7,  badgeType: 'red' },
        { label: 'Versements',           icon: 'account_balance_wallet', route: '/versements',           badge: 3,  badgeType: 'red' },
      ]
    },
    {
      section: 'Gestion',
      items: [
        { label: 'Propriétaires',     icon: 'person',       route: '/proprietaires' },
        { label: 'Propriétés',        icon: 'apartment',    route: '/proprietes' },
        { label: 'Produits locatifs', icon: 'meeting_room', route: '/produits' },
        { label: 'Locataires',        icon: 'groups',       route: '/locataires' },
        { label: 'Travaux',           icon: 'construction', route: '/travaux' },
      ]
    },
    {
      section: 'Direction',
      items: [
        { label: 'Contrats de gestion', icon: 'handshake', route: '/contrats-gestion' },
        { label: 'Portefeuille',        icon: 'bar_chart', route: '/proprietaires/dashboard' },
        { label: 'Personnel',           icon: 'badge',     route: '/personnel' },
      ]
    }
  ];

  readonly pageTitles: Record<string, string> = {
    '/dashboard':               'Tableau de bord',
    '/contrats-location':       'Contrats de location',
    '/collectes':               'Saisie collectes',
    '/collectes/validation':    'Validation comptable',
    '/versements':              'Versements propriétaires',
    '/proprietaires':           'Propriétaires',
    '/proprietes':              'Propriétés',
    '/produits':                'Produits locatifs',
    '/locataires':              'Locataires',
    '/travaux':                 'Travaux & Tâches',
    '/contrats-gestion':        'Contrats de gestion',
    '/proprietaires/dashboard': 'Portefeuille',
    '/personnel':               'Personnel & Paie',
  };

  ngOnInit() {
    this.router.events.pipe(
      filter(e => e instanceof NavigationEnd)
    ).subscribe((e: any) => {
      const url = e.urlAfterRedirects.split('?')[0];
      const match = Object.keys(this.pageTitles)
        .filter(k => url.startsWith(k))
        .sort((a, b) => b.length - a.length)[0];
      this.pageTitle.set(this.pageTitles[match] ?? 'KDI Immobilier');
    });
  }

  onSearch() {}
}