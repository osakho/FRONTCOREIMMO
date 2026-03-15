import { Component, inject, OnInit } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CollectesService, AuthService } from '../../../core/services/api.services';
import { RapportCollecteurDto, LigneRapportCollecte } from '../../../core/models/models';

@Component({
  selector: 'kdi-rapport-collecteur',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, DecimalPipe],
  template: `
<div class="rp">

  <!-- ══ HEADER ══ -->
  <div class="rp-header">
    <div>
      <div class="rp-eyebrow">Performance</div>
      <h1 class="rp-title">Rapport collecteur</h1>
      <p class="rp-sub" *ngIf="rapport">{{ rapport.collecteurNom }} · Semaine S{{ rapport.semaine }} / {{ rapport.annee }}</p>
    </div>
    <div class="rp-actions">
      <div class="week-picker">
        <button class="wp-btn" (click)="prevWeek()">‹</button>
        <div class="wp-label">S{{ semaine }} — {{ annee }}</div>
        <button class="wp-btn" (click)="nextWeek()">›</button>
      </div>
      <button class="btn-load" (click)="load()" [class.loading]="isLoading">
        <span *ngIf="!isLoading">↻ Actualiser</span>
        <span *ngIf="isLoading">…</span>
      </button>
      <a routerLink="/collectes" class="btn-back">← Retour</a>
    </div>
  </div>

  <!-- ══ LOADING ══ -->
  <div class="lw" *ngIf="isLoading"><div class="ld"></div><p>Chargement…</p></div>

  <ng-container *ngIf="rapport && !isLoading">

    <!-- ══ KPI STRIP ══ -->
    <div class="kpi-strip">
      <div class="ks-item ks-green">
        <div class="ks-num">{{ rapport.lignesPayees.length }}</div>
        <div class="ks-lbl">Payés</div>
        <div class="ks-bar-bg"><div class="ks-bar" [style.width.%]="pctPaye()"></div></div>
      </div>
      <div class="ks-item ks-red">
        <div class="ks-num">{{ rapport.lignesNonPayees.length }}</div>
        <div class="ks-lbl">En retard</div>
        <div class="ks-bar-bg"><div class="ks-bar" [style.width.%]="pctRetard()"></div></div>
      </div>
      <div class="ks-item ks-amber">
        <div class="ks-num">{{ rapport.lignesRattrapage.length }}</div>
        <div class="ks-lbl">Rattrapages</div>
      </div>
      <div class="ks-item ks-gold">
        <div class="ks-num">{{ rapport.totalCollecte / 1000 | number:'1.0-0' }}<span>k</span></div>
        <div class="ks-lbl">MRU collectés</div>
      </div>
      <div class="ks-item ks-teal">
        <div class="ks-num">{{ tauxEncaissement() }}<span>%</span></div>
        <div class="ks-lbl">Taux encaiss.</div>
        <div class="ks-bar-bg"><div class="ks-bar ks-bar-teal" [style.width.%]="tauxEncaissement()"></div></div>
      </div>
    </div>

    <!-- ══ TABS ══ -->
    <div class="tabs">
      <button class="tab" [class.tab-active]="activeTab==='paye'" (click)="activeTab='paye'">
        <span class="tab-dot td-green"></span> Payés
        <span class="tab-count">{{ rapport.lignesPayees.length }}</span>
      </button>
      <button class="tab" [class.tab-active]="activeTab==='retard'" (click)="activeTab='retard'">
        <span class="tab-dot td-red"></span> En retard
        <span class="tab-count">{{ rapport.lignesNonPayees.length }}</span>
      </button>
      <button class="tab" [class.tab-active]="activeTab==='rattrapage'" (click)="activeTab='rattrapage'"
              *ngIf="rapport.lignesRattrapage.length">
        <span class="tab-dot td-amber"></span> Rattrapages
        <span class="tab-count">{{ rapport.lignesRattrapage.length }}</span>
      </button>
    </div>

    <!-- ══ TABLE PAYÉS ══ -->
    <div class="table-panel" *ngIf="activeTab==='paye'">
      <div class="tp-empty" *ngIf="!rapport.lignesPayees.length">
        <div class="empty-icon">✅</div>
        <div class="empty-title">Aucun paiement cette semaine</div>
      </div>
      <table class="dt" *ngIf="rapport.lignesPayees.length">
        <thead><tr>
          <th>Propriété</th><th>Produit</th><th>Locataire</th>
          <th>Téléphone</th><th>Période</th><th class="r">Encaissé</th><th>Type</th>
        </tr></thead>
        <tbody>
          <tr *ngFor="let l of rapport.lignesPayees" [class.row-rattrapage]="l.estRattrapage">
            <td class="td-prop">{{ l.proprieteLibelle }}</td>
            <td><span class="code">{{ l.produitCode }}</span></td>
            <td class="td-name">{{ l.locataireNom }}</td>
            <td class="td-tel">{{ l.locataireTel }}</td>
            <td class="td-per">{{ l.periodeMois }}</td>
            <td class="r td-amount ok">{{ l.montantEncaisse | number:'1.0-0' }}</td>
            <td>
              <span class="pill pill-green" *ngIf="!l.estRattrapage">✓ Payé</span>
              <span class="pill pill-amber" *ngIf="l.estRattrapage">↩ Rattrapage</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- ══ TABLE RETARDS ══ -->
    <div class="table-panel" *ngIf="activeTab==='retard'">
      <div class="tp-empty tp-ok" *ngIf="!rapport.lignesNonPayees.length">
        <div class="empty-icon">🎉</div>
        <div class="empty-title">Aucun retard cette semaine !</div>
        <div class="empty-sub">Excellent taux d'encaissement</div>
      </div>
      <table class="dt" *ngIf="rapport.lignesNonPayees.length">
        <thead><tr>
          <th>Propriété</th><th>Produit</th><th>Locataire</th>
          <th>Téléphone</th><th>Période</th><th class="r">Attendu</th><th>Statut</th>
        </tr></thead>
        <tbody>
          <tr *ngFor="let l of rapport.lignesNonPayees" class="row-retard">
            <td class="td-prop">{{ l.proprieteLibelle }}</td>
            <td><span class="code">{{ l.produitCode }}</span></td>
            <td class="td-name"><strong>{{ l.locataireNom }}</strong></td>
            <td class="td-tel">{{ l.locataireTel }}</td>
            <td class="td-per">{{ l.periodeMois }}</td>
            <td class="r td-amount danger">{{ l.montantAttendu | number:'1.0-0' }}</td>
            <td><span class="pill pill-red">⚠ Retard</span></td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- ══ TABLE RATTRAPAGES ══ -->
    <div class="table-panel" *ngIf="activeTab==='rattrapage'">
      <table class="dt" *ngIf="rapport.lignesRattrapage.length">
        <thead><tr>
          <th>Propriété</th><th>Produit</th><th>Locataire</th>
          <th>Téléphone</th><th>Période</th><th class="r">Encaissé</th>
        </tr></thead>
        <tbody>
          <tr *ngFor="let l of rapport.lignesRattrapage" class="row-rattrapage">
            <td class="td-prop">{{ l.proprieteLibelle }}</td>
            <td><span class="code">{{ l.produitCode }}</span></td>
            <td class="td-name">{{ l.locataireNom }}</td>
            <td class="td-tel">{{ l.locataireTel }}</td>
            <td class="td-per">{{ l.periodeMois }}</td>
            <td class="r td-amount warn">{{ l.montantEncaisse | number:'1.0-0' }}</td>
          </tr>
        </tbody>
      </table>
    </div>

  </ng-container>

  <!-- ══ VIDE ══ -->
  <div class="no-data" *ngIf="!rapport && !isLoading">
    <div class="nd-icon">📋</div>
    <div class="nd-title">Sélectionnez une semaine et cliquez Actualiser</div>
  </div>

</div>
  `,
  styles: [`
    :host {
      --gold:#C9A84C; --gold-lt:#E8C96A; --gold-dk:#8B6914;
      --ink:#0B1120; --ink2:#1E293B; --ink3:#334155;
      --mu:#94A3B8; --bo:#E2E8F0; --bg:#F5F7FB; --wh:#FFFFFF;
      --ok:#059669; --okb:#D1FAE5;
      --wa:#D97706; --wab:#FEF3C7;
      --da:#DC2626; --dab:#FEE2E2;
      --teal:#0D9488; --tealb:#CCFBF1;
      --r:14px; --sh:0 1px 3px rgba(0,0,0,.06),0 4px 16px rgba(0,0,0,.06);
    }
    .rp { max-width:1300px; margin:0 auto; padding:0 2px 40px; }

    /* Header */
    .rp-header { display:flex; justify-content:space-between; align-items:flex-end; margin-bottom:28px; gap:16px; flex-wrap:wrap; }
    .rp-eyebrow { font-size:11px; font-weight:700; letter-spacing:1.5px; text-transform:uppercase; color:var(--gold); margin-bottom:4px; }
    .rp-title { font-size:26px; font-weight:800; color:var(--ink); margin:0 0 4px; letter-spacing:-.5px; }
    .rp-sub { font-size:13px; color:var(--mu); margin:0; }
    .rp-actions { display:flex; align-items:center; gap:10px; flex-wrap:wrap; }

    /* Week picker */
    .week-picker { display:flex; align-items:center; gap:0; background:var(--wh); border:1.5px solid var(--bo); border-radius:10px; overflow:hidden; box-shadow:var(--sh); }
    .wp-btn { width:36px; height:36px; border:none; background:none; font-size:18px; color:var(--ink3); cursor:pointer; transition:background .15s; }
    .wp-btn:hover { background:var(--bg); }
    .wp-label { padding:0 14px; font-size:13px; font-weight:700; color:var(--ink); min-width:90px; text-align:center; }

    .btn-load { padding:9px 16px; background:var(--ink); color:var(--gold-lt); border:none; border-radius:9px; font-size:13px; font-weight:700; cursor:pointer; transition:all .2s; }
    .btn-load:hover { background:var(--ink2); }
    .btn-load.loading { opacity:.6; cursor:wait; }
    .btn-back { padding:9px 16px; background:var(--wh); color:var(--ink3); border:1.5px solid var(--bo); border-radius:9px; font-size:13px; font-weight:600; text-decoration:none; transition:all .15s; }
    .btn-back:hover { border-color:var(--ink); color:var(--ink); }

    /* KPI Strip */
    .kpi-strip { display:grid; grid-template-columns:repeat(5,1fr); gap:12px; margin-bottom:24px; }
    .ks-item { background:var(--wh); border-radius:var(--r); padding:18px 20px; box-shadow:var(--sh); border-top:3px solid transparent; }
    .ks-green { border-top-color:var(--ok); }
    .ks-red   { border-top-color:var(--da); }
    .ks-amber { border-top-color:var(--wa); }
    .ks-gold  { border-top-color:var(--gold); }
    .ks-teal  { border-top-color:var(--teal); }
    .ks-num { font-size:32px; font-weight:800; color:var(--ink); letter-spacing:-1px; line-height:1; }
    .ks-num span { font-size:16px; font-weight:400; opacity:.6; }
    .ks-lbl { font-size:11px; color:var(--mu); font-weight:600; text-transform:uppercase; letter-spacing:.5px; margin-top:4px; }
    .ks-bar-bg { height:4px; background:var(--bo); border-radius:4px; overflow:hidden; margin-top:10px; }
    .ks-bar { height:100%; border-radius:4px; background:var(--ok); transition:width .5s; }
    .ks-red .ks-bar { background:var(--da); }
    .ks-bar-teal { background:var(--teal); }

    /* Tabs */
    .tabs { display:flex; gap:4px; background:var(--bg); border-radius:12px; padding:4px; margin-bottom:16px; width:fit-content; }
    .tab { display:flex; align-items:center; gap:7px; padding:8px 18px; border-radius:9px; border:none; background:none; font-size:13px; font-weight:600; color:var(--mu); cursor:pointer; transition:all .15s; }
    .tab:hover { color:var(--ink); background:rgba(255,255,255,.6); }
    .tab-active { background:var(--wh); color:var(--ink); box-shadow:var(--sh); }
    .tab-dot { width:8px; height:8px; border-radius:50%; flex-shrink:0; }
    .td-green { background:var(--ok); }
    .td-red   { background:var(--da); }
    .td-amber { background:var(--wa); }
    .tab-count { background:var(--bg); color:var(--mu); padding:1px 7px; border-radius:20px; font-size:11px; font-weight:700; }
    .tab-active .tab-count { background:var(--ink); color:var(--gold-lt); }

    /* Table panel */
    .table-panel { background:var(--wh); border-radius:var(--r); box-shadow:var(--sh); overflow:hidden; }
    .tp-empty { display:flex; flex-direction:column; align-items:center; gap:8px; padding:48px; }
    .tp-ok { background:linear-gradient(135deg,#f0fdf9,#ecfdf5); }
    .empty-icon { font-size:40px; }
    .empty-title { font-size:15px; font-weight:700; color:var(--ink3); }
    .empty-sub { font-size:13px; color:var(--mu); }

    /* Data table */
    .dt { width:100%; border-collapse:collapse; }
    .dt thead th { padding:10px 14px; background:#f8fafc; font-size:10px; font-weight:700; color:var(--mu); text-transform:uppercase; letter-spacing:.5px; border-bottom:1px solid var(--bo); text-align:left; white-space:nowrap; }
    .dt thead th.r { text-align:right; }
    .dt tbody td { padding:11px 14px; font-size:13px; color:var(--ink3); border-bottom:1px solid var(--bo); }
    .dt tbody tr:last-child td { border-bottom:none; }
    .dt tbody tr:hover td { background:rgba(201,168,76,.03); }
    .row-retard td { background:#fff8f8; }
    .row-rattrapage td { background:#fffbeb; }
    td.r { text-align:right; }
    .td-prop { font-size:12px; color:var(--mu); max-width:160px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
    .td-name { font-weight:600; color:var(--ink); }
    .td-tel { font-size:12px; color:var(--mu); font-family:monospace; }
    .td-per { font-family:monospace; font-size:12px; }
    .td-amount { font-family:monospace; font-weight:700; font-size:14px; }
    .td-amount.ok     { color:var(--ok); }
    .td-amount.danger { color:var(--da); }
    .td-amount.warn   { color:var(--wa); }

    .code { font-family:monospace; background:#e8edf5; color:var(--ink); padding:2px 7px; border-radius:6px; font-size:11px; font-weight:700; }
    .pill { display:inline-flex; align-items:center; padding:3px 10px; border-radius:20px; font-size:11px; font-weight:700; white-space:nowrap; }
    .pill-green { background:var(--okb); color:var(--ok); }
    .pill-red   { background:var(--dab); color:var(--da); }
    .pill-amber { background:var(--wab); color:var(--wa); }

    /* No data */
    .no-data { display:flex; flex-direction:column; align-items:center; gap:12px; padding:80px; color:var(--mu); }
    .nd-icon  { font-size:48px; opacity:.4; }
    .nd-title { font-size:14px; font-weight:600; }

    /* Loading */
    .lw { display:flex; flex-direction:column; align-items:center; gap:16px; padding:60px; color:var(--mu); }
    .ld { width:32px; height:32px; border:3px solid var(--bo); border-top-color:var(--ink); border-radius:50%; animation:spin .7s linear infinite; }
    @keyframes spin { to { transform:rotate(360deg); } }

    @media(max-width:900px) { .kpi-strip { grid-template-columns:repeat(3,1fr); } }
    @media(max-width:600px) { .kpi-strip { grid-template-columns:1fr 1fr; } .tabs { flex-wrap:wrap; } }
  `]
})
export class RapportCollecteurComponent implements OnInit {
  private svc  = inject(CollectesService);
  private auth = inject(AuthService);

  rapport:   RapportCollecteurDto | null = null;
  isLoading  = false;
  activeTab  = 'paye';
  semaine    = this.getWeekNumber(new Date());
  annee      = new Date().getFullYear();

  ngOnInit(): void { this.load(); }

  load(): void {
    const user = this.auth.getUser();
    if (!user?.id) return;
    this.isLoading = true;
    this.svc.getRapportCollecteur(user.id, this.semaine, this.annee)
      .subscribe({
        next:  r => { this.rapport = r; this.isLoading = false; },
        error: () => { this.isLoading = false; }
      });
  }

  prevWeek(): void {
    if (this.semaine > 1) { this.semaine--; } else { this.semaine = 52; this.annee--; }
    this.load();
  }

  nextWeek(): void {
    if (this.semaine < 52) { this.semaine++; } else { this.semaine = 1; this.annee++; }
    this.load();
  }

  totalLignes(): number {
    if (!this.rapport) return 0;
    return this.rapport.lignesPayees.length + this.rapport.lignesNonPayees.length;
  }

  pctPaye(): number {
    const t = this.totalLignes();
    return t === 0 ? 0 : Math.round((this.rapport!.lignesPayees.length / t) * 100);
  }

  pctRetard(): number {
    const t = this.totalLignes();
    return t === 0 ? 0 : Math.round((this.rapport!.lignesNonPayees.length / t) * 100);
  }

  tauxEncaissement(): number {
    if (!this.rapport) return 0;
    const attendu = this.rapport.lignesPayees.reduce((s, l) => s + l.montantAttendu, 0)
                  + this.rapport.lignesNonPayees.reduce((s, l) => s + l.montantAttendu, 0);
    return attendu === 0 ? 0 : Math.round((this.rapport.totalCollecte / attendu) * 100);
  }

  getWeekNumber(d: Date): number {
    const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
    return Math.ceil((((date as any) - (yearStart as any)) / 86400000 + 1) / 7);
  }
}
