import { Component, inject, signal, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive, RouterOutlet, NavigationEnd } from '@angular/router';
import { AuthService } from '../../core/services/api.services';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'kdi-shell',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  template: `

<div class="app-shell">

  <!-- ══════════════════════════════════════
       SIDEBAR — navy dark, exactement comme le prototype
  ══════════════════════════════════════ -->
  <aside class="sb" [class.sb-open]="sidebarOpen()">

    <!-- Brand -->
    <div class="sb-brand">
      <div class="sb-logo"><span class="mi">home_work</span></div>
      <div>
        <div class="sb-name">Khalifat Djické</div>
        <div class="sb-tag">Immobilier · Mauritanie</div>
      </div>
    </div>

    <!-- Nav -->
    <nav class="sb-nav">

      <div class="sec">Principal</div>
      <a routerLink="/dashboard" routerLinkActive="ni-act" class="ni" (click)="closeMobile()">
        <span class="mi">dashboard</span>Tableau de bord
      </a>

      <div class="sec">Patrimoine</div>
      <a routerLink="/proprietaires" routerLinkActive="ni-act" class="ni" (click)="closeMobile()">
        <span class="mi">person</span>Propriétaires
      </a>
      <a *ngIf="isDirection()" routerLink="/proprietaires/dashboard" routerLinkActive="ni-act" class="ni ni-sub" (click)="closeMobile()">
        <span class="mi">bar_chart</span>Dashboard propriétaires
      </a>
      <a routerLink="/proprietes" routerLinkActive="ni-act" class="ni" (click)="closeMobile()">
        <span class="mi">apartment</span>Propriétés
      </a>
      <a routerLink="/produits" routerLinkActive="ni-act" class="ni" (click)="closeMobile()">
        <span class="mi">door_front</span>Produits locatifs
      </a>

      <div class="sec">Gestion locative</div>
      <a routerLink="/locataires" routerLinkActive="ni-act" class="ni" (click)="closeMobile()">
        <span class="mi">groups</span>Locataires
      </a>
      <a routerLink="/contrats-location" routerLinkActive="ni-act" class="ni" (click)="closeMobile()">
        <span class="mi">description</span>Contrats de location
      </a>
      <a *ngIf="isDirection()" routerLink="/contrats-gestion" routerLinkActive="ni-act" class="ni" (click)="closeMobile()">
        <span class="mi">fact_check</span>Contrats de gestion
      </a>

      <div class="sec">Collectes & Finance</div>
      <a routerLink="/collectes" routerLinkActive="ni-act" class="ni" (click)="closeMobile()">
        <span class="mi">payments</span>Collectes
      </a>
      <a *ngIf="isDirection()" routerLink="/collectes/validation" routerLinkActive="ni-act" class="ni ni-sub" (click)="closeMobile()">
        <span class="mi">rule</span>Validation collectes
        <span class="nb">7</span>
      </a>
      <a routerLink="/collectes/rapport" routerLinkActive="ni-act" class="ni ni-sub" (click)="closeMobile()">
        <span class="mi">summarize</span>Rapport collecteur
      </a>
      <a routerLink="/collectes/bordereau" routerLinkActive="ni-act" class="ni ni-sub" (click)="closeMobile()">
        <span class="mi">receipt_long</span>Bordereau
      </a>
      <a routerLink="/versements" routerLinkActive="ni-act" class="ni" (click)="closeMobile()">
        <span class="mi">account_balance_wallet</span>Versements
      </a>
      <a routerLink="/contentieux" routerLinkActive="ni-act" class="ni" (click)="closeMobile()">
        <span class="mi">gavel</span>Contentieux
      </a>
      <a routerLink="/recouvrement" routerLinkActive="ni-act" class="ni" (click)="closeMobile()">
        <span class="mi">warning_amber</span>Recouvrement
      </a>

      <div class="sec" *ngIf="isDirection()">Administration</div>
      <a *ngIf="isDirection()" routerLink="/personnel" routerLinkActive="ni-act" class="ni" (click)="closeMobile()">
        <span class="mi">badge</span>Personnel
      </a>
      <a *ngIf="isDirection()" routerLink="/rapports" routerLinkActive="ni-act" class="ni" (click)="closeMobile()">
        <span class="mi">bar_chart</span>Rapports
      </a>
      <a *ngIf="isDirection()" routerLink="/parametres" routerLinkActive="ni-act" class="ni" (click)="closeMobile()">
        <span class="mi">settings</span>Paramètres
      </a>

    </nav>

    <!-- Footer utilisateur -->
    <div class="sb-foot">
      <div class="u-row" (click)="toggleUserMenu()">
        <div class="uav">{{ userInitiales() }}</div>
        <div>
          <div class="u-name">{{ userName() }}</div>
          <div class="u-role">{{ userRole() }}</div>
        </div>
        <span class="mi" style="color:rgba(255,255,255,.25);font-size:16px;margin-left:auto">more_vert</span>
      </div>

      <!-- Dropdown utilisateur -->
      <div class="user-drop" [class.open]="userMenuOpen()">
        <button class="ud-item" (click)="logout()">
          <span class="mi">logout</span> Se déconnecter
        </button>
      </div>
    </div>

  </aside>

  <!-- Overlay mobile -->
  <div class="sb-veil" [class.on]="sidebarOpen()" (click)="sidebarOpen.set(false)"></div>

  <!-- ══════════════════════════════════════
       ZONE PRINCIPALE
  ══════════════════════════════════════ -->
  <div class="main">

    <!-- Topbar -->
    <div class="topbar">
      <button class="hamburger" (click)="sidebarOpen.set(!sidebarOpen())">
        <span class="mi">menu</span>
      </button>
      <div class="tb-t">{{ currentTitle() }}</div>
      <div class="srch">
        <span class="mi">search</span>
        <input placeholder="Rechercher locataire, contrat, propriété…">
      </div>
      <a routerLink="/collectes/saisir" class="btn b-g b-sm">
        <span class="mi">add</span>Collecte
      </a>
      <button class="ib">
        <span class="mi">notifications</span>
        <span class="ndot"></span>
      </button>
      <div class="uav uav-top" style="cursor:pointer" (click)="toggleUserMenu()">{{ userInitiales() }}</div>
    </div>

    <!-- Contenu des pages -->
    <div class="content">
      <router-outlet />
    </div>

  </div>

</div>
  `,
  styles: [`
    /* ══════════════════════════════════════════════════
       TOKENS — fidèles au prototype
    ══════════════════════════════════════════════════ */
    :host {
      --navy:   #0e1c38;
      --navy2:  #162845;
      --navy3:  #1e3560;
      --gold:   #c9a96e;
      --gold2:  #dfc28e;
      --surf:   #f2f5fa;
      --surf2:  #e8edf5;
      --wh:     #ffffff;
      --t1:     #0e1c38;
      --t2:     #4a5878;
      --t3:     #8a97b0;
      --t4:     #b8c2d4;
      --bord:   #e3e8f0;
      --ok:     #0d9f5a;
      --er:     #d42b2b;
      --wa:     #d07a0c;
      --in:     #2057c8;
      --sb:     252px;
      --topbar: 56px;
      --r:      10px;
      --s1:     0 1px 4px rgba(14,28,56,.06);
      --s2:     0 4px 20px rgba(14,28,56,.1);
      --s3:     0 12px 48px rgba(14,28,56,.15);
      display: block;
    }

    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    .mi {
      font-family: 'Material Icons Round';
      font-style: normal; font-weight: normal;
      font-size: 20px; line-height: 1;
      letter-spacing: normal; text-transform: none;
      display: inline-block; white-space: nowrap;
      direction: ltr; -webkit-font-smoothing: antialiased;
      vertical-align: middle; user-select: none;
    }

    /* ══════════════════════════════════════════════════
       LAYOUT
    ══════════════════════════════════════════════════ */
    .app-shell {
      display: flex;
      height: 100vh;
      overflow: hidden;
      background: var(--surf);
      font-family: 'Instrument Sans', 'DM Sans', sans-serif;
    }

    /* ══════════════════════════════════════════════════
       SIDEBAR
    ══════════════════════════════════════════════════ */
    .sb {
      width: var(--sb);
      background: var(--navy);
      display: flex; flex-direction: column;
      height: 100vh;
      flex-shrink: 0;
      z-index: 100;
      position: relative;
      overflow: hidden;
    }

    /* Texture subtile */
    .sb::before {
      content: '';
      position: absolute; inset: 0;
      background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.03'/%3E%3C/svg%3E");
      pointer-events: none; opacity: .4;
    }

    /* Brand */
    .sb-brand {
      padding: 18px 15px 15px;
      border-bottom: 1px solid rgba(255,255,255,.07);
      display: flex; align-items: center; gap: 10px;
      flex-shrink: 0; position: relative; z-index: 1;
    }
    .sb-logo {
      width: 36px; height: 36px;
      background: linear-gradient(135deg, var(--gold), var(--gold2));
      border-radius: 8px;
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0; box-shadow: 0 2px 8px rgba(201,169,110,.3);
    }
    .sb-logo .mi { color: var(--navy); font-size: 18px; }
    .sb-name {
      font-family: 'Syne', sans-serif;
      font-weight: 800; font-size: .82rem; color: #fff; line-height: 1.2;
    }
    .sb-tag { font-size: .58rem; letter-spacing: .1em; text-transform: uppercase; color: var(--gold); margin-top: 1px; }

    /* Nav */
    .sb-nav {
      flex: 1; overflow-y: auto;
      padding: 10px 0; scrollbar-width: none;
      position: relative; z-index: 1;
    }
    .sb-nav::-webkit-scrollbar { display: none; }

    .sec {
      font-size: .58rem; letter-spacing: .12em; text-transform: uppercase;
      color: rgba(255,255,255,.2); padding: 11px 15px 4px; font-weight: 500;
    }

    .ni {
      display: flex; align-items: center; gap: 9px;
      padding: 8px 15px;
      cursor: pointer; color: rgba(255,255,255,.46);
      font-size: .8rem; font-weight: 400;
      border-left: 3px solid transparent;
      transition: all .14s; user-select: none;
      text-decoration: none;
    }
    .ni:hover { background: rgba(255,255,255,.05); color: rgba(255,255,255,.8); }
    .ni-act, .ni.ni-act {
      background: rgba(201,169,110,.12) !important;
      color: var(--gold2) !important;
      border-left-color: var(--gold) !important;
      font-weight: 500 !important;
    }
    .ni .mi { font-size: 17px; flex-shrink: 0; }
    .ni-sub { padding-left: 24px; font-size: .76rem; }
    .ni-sub .mi { font-size: 15px; }

    .nb {
      margin-left: auto;
      background: var(--er); color: #fff;
      font-size: .58rem; font-weight: 700;
      padding: 1px 6px; border-radius: 10px; line-height: 1.5;
    }
    .nb.g { background: var(--gold); color: var(--navy); }

    /* Footer */
    .sb-foot {
      padding: 12px 15px;
      border-top: 1px solid rgba(255,255,255,.07);
      flex-shrink: 0; position: relative; z-index: 1;
    }
    .u-row {
      display: flex; align-items: center; gap: 8px;
      cursor: pointer; padding: 4px 0;
    }
    .uav {
      width: 32px; height: 32px; border-radius: 50%;
      background: linear-gradient(135deg, var(--gold), #a8792d);
      display: flex; align-items: center; justify-content: center;
      font-family: 'Syne', sans-serif; font-weight: 800;
      font-size: .73rem; color: var(--navy); flex-shrink: 0;
    }
    .u-name { font-size: .77rem; font-weight: 500; color: #fff; }
    .u-role { font-size: .58rem; color: var(--gold); }

    /* Dropdown logout */
    .user-drop {
      background: var(--navy2); border-radius: 8px;
      margin-top: 6px; overflow: hidden;
      max-height: 0; transition: max-height .2s ease;
      border: 1px solid rgba(255,255,255,.08);
    }
    .user-drop.open { max-height: 80px; }
    .ud-item {
      display: flex; align-items: center; gap: 8px;
      width: 100%; padding: 10px 14px;
      background: none; border: none; color: rgba(255,255,255,.6);
      font-size: .79rem; cursor: pointer; font-family: inherit;
      transition: background .12s;
    }
    .ud-item:hover { background: rgba(212,43,43,.15); color: var(--er); }
    .ud-item .mi { font-size: 15px; }

    /* Veil mobile */
    .sb-veil {
      display: none; position: fixed; inset: 0;
      background: rgba(14,28,56,.5); z-index: 90;
      backdrop-filter: blur(2px);
      opacity: 0; transition: opacity .25s;
      pointer-events: none;
    }
    .sb-veil.on { opacity: 1; pointer-events: all; }

    /* ══════════════════════════════════════════════════
       MAIN
    ══════════════════════════════════════════════════ */
    .main {
      flex: 1; display: flex; flex-direction: column;
      overflow: hidden; min-width: 0;
    }

    /* Topbar */
    .topbar {
      height: var(--topbar);
      background: var(--wh);
      border-bottom: 1px solid var(--bord);
      display: flex; align-items: center;
      padding: 0 20px; gap: 11px;
      flex-shrink: 0; box-shadow: var(--s1);
      z-index: 10;
    }
    .hamburger {
      display: none; background: none; border: none;
      cursor: pointer; padding: 4px; color: var(--t2);
    }
    .hamburger .mi { font-size: 22px; }
    .tb-t {
      font-family: 'Syne', sans-serif; font-weight: 700;
      font-size: .98rem; color: var(--t1); flex: 1;
    }
    .srch {
      display: flex; align-items: center; gap: 6px;
      background: #ffffff; border: 1px solid var(--bord);
      border-radius: 7px; padding: 5px 10px; width: 210px;
      transition: all .15s;
    }
    .srch:focus-within {
      border-color: var(--gold); background: #fff;
      box-shadow: 0 0 0 3px rgba(201,169,110,.1); width: 250px;
    }
    .srch .mi { font-size: 16px; color: var(--t3); flex-shrink: 0; }
    .srch input {
      border: none; background: none; outline: none;
      font-family: inherit; font-size: .78rem; color: var(--t1); width: 100%;
    }
    .srch input::placeholder { color: var(--t4); }

    /* Boutons topbar */
    .btn {
      display: inline-flex; align-items: center; gap: 5px;
      padding: 7px 14px; border-radius: 7px;
      font-family: inherit; font-size: .79rem; font-weight: 500;
      cursor: pointer; border: none; transition: all .14s; white-space: nowrap;
      text-decoration: none;
    }
    .btn .mi { font-size: 14px; }
    .b-g {
      background: linear-gradient(135deg, var(--gold), var(--gold2));
      color: var(--navy); font-weight: 600;
    }
    .b-g:hover { box-shadow: 0 4px 12px rgba(201,169,110,.35); transform: translateY(-1px); }
    .b-sm { padding: 5px 11px; font-size: .74rem; }

    .ib {
      width: 33px; height: 33px; border: none;
      background: #ffffff; border-radius: 7px; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      color: var(--t2); transition: all .13s; position: relative;
    }
    .ib:hover { background: var(--bord); }
    .ib .mi { font-size: 17px; }
    .ndot {
      position: absolute; top: 5px; right: 5px;
      width: 6px; height: 6px;
      background: var(--er); border-radius: 50%;
      border: 2px solid var(--wh);
    }
    .uav-top {
      width: 33px; height: 33px; border-radius: 50%;
      font-size: .72rem;
    }

    /* Contenu */
    .content {
      flex: 1; overflow-y: auto;
      padding: 22px;
      scrollbar-width: thin;
      scrollbar-color: var(--bord) transparent;
      background: var(--surf);
    }
    .content::-webkit-scrollbar { width: 5px; }
    .content::-webkit-scrollbar-track { background: transparent; }
    .content::-webkit-scrollbar-thumb { background: var(--bord); border-radius: 3px; }

    /* ══════════════════════════════════════════════════
       RESPONSIVE
    ══════════════════════════════════════════════════ */
    @media (max-width: 900px) {
      .sb {
        position: fixed; top: 0; left: 0; z-index: 200;
        transform: translateX(-100%);
        transition: transform .28s cubic-bezier(.4,0,.2,1);
      }
      .sb.sb-open { transform: translateX(0); box-shadow: 8px 0 32px rgba(14,28,56,.3); }
      .sb-veil { display: block; }
      .hamburger { display: flex; }
      .srch { width: 160px; }
    }
    @media (max-width: 520px) {
      .srch { display: none; }
      .topbar { padding: 0 14px; gap: 8px; }
      .content { padding: 14px; }
    }
  `]
})
export class ShellComponent {
  private auth   = inject(AuthService);
  private router = inject(Router);

  sidebarOpen  = signal(false);
  userMenuOpen = signal(false);

  private readonly PAGE_MAP: Record<string, string> = {
    'dashboard':               'Tableau de bord',
    'proprietaires':           'Propriétaires',
    'proprietaires/dashboard': 'Dashboard propriétaires',
    'proprietes':              'Propriétés',
    'produits':                'Produits locatifs',
    'locataires':              'Locataires',
    'contrats-location':       'Contrats de location',
    'contrats-gestion':        'Contrats de gestion',
    'collectes':               'Collectes',
    'collectes/validation':    'Validation des collectes',
    'collectes/rapport':       'Rapport collecteur',
    'collectes/bordereau':     'Bordereau',
    'collectes/saisir':        'Saisie collecte',
    'recouvrement':            'Recouvrement',
    'contentieux':             'Contentieux',
    'versements':              'Versements',
    'personnel':               'Personnel',
    'rapports':                'Rapports',
    'parametres':              'Paramètres',
  };

  currentTitle = signal('Tableau de bord');

  constructor() {
    this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe((e: any) => {
        const url = (e.urlAfterRedirects as string).replace(/^\//, '').split('?')[0];
        this.currentTitle.set(
          this.PAGE_MAP[url]
          ?? this.PAGE_MAP[url.split('/').slice(0, 2).join('/')]
          ?? this.PAGE_MAP[url.split('/')[0]]
          ?? 'Khalifat Djické'
        );
      });
  }

  userName()     { return this.auth.getUser()?.nom ?? 'Utilisateur'; }
  userInitiales() {
    const n = this.auth.getUser()?.nom ?? 'U';
    return n.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2);
  }
  userRole() {
    const labels: Record<string, string> = {
      Pdg: 'Direction générale', Direction: 'Direction',
      Admin: 'Administrateur', Comptable: 'Comptable',
      Collecteur: 'Collecteur', ChargeTravaux: 'Chargé travaux',
    };
    return labels[this.auth.getUser()?.role ?? ''] ?? '';
  }
  isDirection() { return this.auth.isDirection(); }
  logout()      { this.auth.logout(); this.router.navigate(['/login']); }
  closeMobile() { if (window.innerWidth < 900) this.sidebarOpen.set(false); }
  toggleUserMenu() { this.userMenuOpen.update(v => !v); }

  @HostListener('document:click', ['$event'])
  onDocClick(e: Event) {
    const t = e.target as HTMLElement;
    if (!t.closest('.sb-foot')) this.userMenuOpen.set(false);
  }
}