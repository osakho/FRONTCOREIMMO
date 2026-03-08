import { Component, inject, OnInit } from '@angular/core';
import { CommonModule, DecimalPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SuiviLoyersService } from '../../core/services/api.services';
import { SuiviLoyersGlobalDto, RecapFinancierContratDto } from '../../core/models/models';



// ── Composant ────────────────────────────────────────────────
@Component({
  selector: 'kdi-suivi-loyers',
  standalone: true,
  imports: [CommonModule, FormsModule, DecimalPipe, DatePipe],
  template: `
<div class="page-enter">

  <!-- Header -->
  <div class="page-header">
    <div>
      <div class="page-title"><span class="mi">payments</span> Suivi des loyers</div>
      <div class="page-subtitle">Situation financière locative en temps réel</div>
    </div>
    <button class="btn btn-secondary" (click)="load()">
      <span class="mi">refresh</span> Actualiser
    </button>
  </div>

  <!-- Loading -->
  <div *ngIf="loading" class="sl-loading">
    <div class="sl-spinner"></div> Chargement…
  </div>

  <ng-container *ngIf="!loading && data">

    <!-- ══ KPIs globaux ══ -->
    <div class="kpi-global">
      <div class="kg-card kg-du">
        <div class="kg-icon">📋</div>
        <div class="kg-body">
          <div class="kg-label">Total dû</div>
          <div class="kg-val">{{ data.totalDu | number:'1.0-0' }} <span class="kg-unit">MRU</span></div>
        </div>
      </div>
      <div class="kg-card kg-paye">
        <div class="kg-icon">✅</div>
        <div class="kg-body">
          <div class="kg-label">Total encaissé</div>
          <div class="kg-val">{{ data.totalPaye | number:'1.0-0' }} <span class="kg-unit">MRU</span></div>
        </div>
      </div>
      <div class="kg-card" [class.kg-solde-neg]="data.totalSolde < 0" [class.kg-solde-pos]="data.totalSolde >= 0">
        <div class="kg-icon">{{ data.totalSolde >= 0 ? '💚' : '🔴' }}</div>
        <div class="kg-body">
          <div class="kg-label">Solde global</div>
          <div class="kg-val">{{ data.totalSolde >= 0 ? '+' : '' }}{{ data.totalSolde | number:'1.0-0' }} <span class="kg-unit">MRU</span></div>
        </div>
      </div>
      <div class="kg-card kg-stat">
        <div class="kg-stat-row">
          <div class="kg-pill kg-pill-green">✓ À jour <strong>{{ data.nbAJour }}</strong></div>
          <div class="kg-pill kg-pill-red">✗ Retard <strong>{{ data.nbEnRetard }}</strong></div>
        </div>
        <div class="kg-stat-row" style="margin-top:6px">
          <div class="kg-pill kg-pill-blue">★ Crédit <strong>{{ data.nbCredit }}</strong></div>
          <div class="kg-pill kg-pill-gray">· En attente <strong>{{ data.nbNonCommence }}</strong></div>
        </div>
      </div>
    </div>

    <!-- ══ Layout liste + panneau ══ -->
    <div class="layout" [class.panel-open]="selected !== null">

      <!-- Liste -->
      <div class="list-pane">

        <!-- Filtres statut loyer -->
        <div class="filter-bar" style="margin-bottom:14px">
          <button class="filter-chip" [class.active]="filtre===''"            (click)="setFiltre('')">Tous ({{ data.contrats.length }})</button>
          <button class="filter-chip" [class.active]="filtre==='AJour'"       (click)="setFiltre('AJour')">✓ À jour ({{ data.nbAJour }})</button>
          <button class="filter-chip" [class.active]="filtre==='EnRetard'"    (click)="setFiltre('EnRetard')">✗ Retard ({{ data.nbEnRetard }})</button>
          <button class="filter-chip" [class.active]="filtre==='Credit'"      (click)="setFiltre('Credit')">★ Crédit ({{ data.nbCredit }})</button>
          <button class="filter-chip" [class.active]="filtre==='NonCommence'" (click)="setFiltre('NonCommence')">· En attente ({{ data.nbNonCommence }})</button>
        </div>

        <div class="table-card">
          <table class="data-table" *ngIf="contratsFiltres().length; else empty">
            <thead><tr>
              <th>Bien</th>
              <th>Locataire</th>
              <th class="text-right">Loyer</th>
              <th class="text-right">Dû</th>
              <th class="text-right">Payé</th>
              <th class="text-right">Solde</th>
              <th class="text-center">Statut loyer</th>
              <th class="text-center">Avancement</th>
            </tr></thead>
            <tbody>
              <tr *ngFor="let c of contratsFiltres()"
                  [class.row-selected]="selected?.contratId === c.contratId"
                  (click)="selectContrat(c)">
                <td><span class="num-badge">{{ c.produitCode }}</span></td>
                <td>
                  <div class="cell-main">{{ c.locataireNom }}</div>
                  <div class="cell-sub">Depuis {{ c.dateEntree | date:'MM/yyyy' }}</div>
                </td>
                <td class="text-right" style="font-weight:600">
                  {{ c.loyer | number:'1.0-0' }}
                  <span style="font-size:.7rem;color:#8a97b0"> MRU</span>
                </td>
                <td class="text-right text-muted">{{ c.montantDu | number:'1.0-0' }}</td>
                <td class="text-right" style="color:#16a34a;font-weight:600">{{ c.montantPaye | number:'1.0-0' }}</td>
                <td class="text-right" [class.text-danger]="c.solde < 0" [class.text-success]="c.solde >= 0" style="font-weight:700">
                  {{ c.solde >= 0 ? '+' : '' }}{{ c.solde | number:'1.0-0' }}
                </td>
                <td class="text-center">
                  <span class="badge"
                    [class.badge-green]="c.statutLoyer==='AJour'"
                    [class.badge-blue]="c.statutLoyer==='Credit'"
                    [class.badge-red]="c.statutLoyer==='EnRetard'"
                    [class.badge-gray]="c.statutLoyer==='NonCommence'">
                    {{ c.statutLoyer === 'AJour'       ? '✓ À jour'    :
                       c.statutLoyer === 'Credit'      ? '★ Crédit'    :
                       c.statutLoyer === 'EnRetard'    ? '✗ Retard'    : '· Attente' }}
                  </span>
                </td>
                <td class="text-center">
                  <div class="progress-wrap">
                    <div class="progress-bar">
                      <div class="progress-fill"
                           [style.width.%]="c.moisDepuisEntree > 0 ? (c.moisPayes / c.moisDepuisEntree * 100) : 0"
                           [class.fill-ok]="c.statutLoyer==='AJour' || c.statutLoyer==='Credit'"
                           [class.fill-ko]="c.statutLoyer==='EnRetard'">
                      </div>
                    </div>
                    <span class="progress-label">{{ c.moisPayes }}/{{ c.moisDepuisEntree }}</span>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
          <ng-template #empty>
            <div class="empty-state">
              <span class="mi">payments</span>
              <div class="empty-title">Aucun contrat dans cette catégorie</div>
            </div>
          </ng-template>
        </div>
      </div>

      <!-- ══ Panneau détail ══ -->
      <div class="recap-pane" *ngIf="selected">

        <div class="rp-header">
          <div class="rp-title-block">
            <div class="rp-avatar">{{ selected.locataireNom[0] || '?' }}</div>
            <div>
              <div class="rp-nom">{{ selected.locataireNom }}</div>
              <div class="rp-code">{{ selected.produitCode }}</div>
            </div>
          </div>
          <button class="rp-close" (click)="selected = null">✕</button>
        </div>

        <!-- Statut loyer -->
        <div class="statut-loyer" [ngClass]="'sl-' + selected.statutLoyer.toLowerCase()">
          <div class="sl-icon">
            {{ selected.statutLoyer === 'AJour'    ? '✅' :
               selected.statutLoyer === 'Credit'   ? '💚' :
               selected.statutLoyer === 'EnRetard' ? '🔴' : '⏳' }}
          </div>
          <div>
            <div class="sl-label">{{ selected.statutLoyerLabel }}</div>
            <div class="sl-detail" *ngIf="selected.moisEnRetard > 0">
              {{ selected.moisEnRetard }} mois impayé(s) · {{ selected.montantDu - selected.montantPaye | number:'1.0-0' }} MRU dus
            </div>
            <div class="sl-detail" *ngIf="selected.moisEnAvance > 0">
              {{ selected.moisEnAvance }} mois d'avance · crédit {{ selected.solde | number:'1.0-0' }} MRU
            </div>
            <div class="sl-detail" *ngIf="selected.statutLoyer === 'AJour' && selected.moisEnAvance === 0">
              Tous les loyers sont à jour
            </div>
          </div>
        </div>

        <!-- KPIs -->
        <div class="kpi-row">
          <div class="kpi" [class.kpi-ok]="selected.cautionReglee" [class.kpi-ko]="!selected.cautionReglee">
            <div class="kpi-icon">🔒</div>
            <div class="kpi-label">Caution</div>
            <div class="kpi-val">{{ selected.caution | number:'1.0-0' }}</div>
            <div class="kpi-status">{{ selected.cautionReglee ? '✅ Réglée' : '❌ Non réglée' }}</div>
          </div>
          <div class="kpi" [class.kpi-ok]="selected.avanceLoyerReglee" [class.kpi-ko]="!selected.avanceLoyerReglee">
            <div class="kpi-icon">💵</div>
            <div class="kpi-label">Avance</div>
            <div class="kpi-val">{{ selected.avanceLoyer | number:'1.0-0' }}</div>
            <div class="kpi-status">{{ selected.avanceLoyerReglee ? '✅ Réglée' : '❌ Non réglée' }}</div>
          </div>
          <div class="kpi">
            <div class="kpi-icon">📅</div>
            <div class="kpi-label">Payés</div>
            <div class="kpi-val">{{ selected.moisPayes }}/{{ selected.moisDepuisEntree }}</div>
            <div class="kpi-status">mois</div>
          </div>
        </div>

        <!-- Solde -->
        <div class="solde-row">
          <div class="solde-item">
            <span class="si-label">Total dû</span>
            <span class="si-val">{{ selected.montantDu | number:'1.0-0' }} MRU</span>
          </div>
          <div class="solde-item">
            <span class="si-label">Total payé</span>
            <span class="si-val si-ok">{{ selected.montantPaye | number:'1.0-0' }} MRU</span>
          </div>
          <div class="solde-item"
               [class.solde-positif]="selected.solde >= 0"
               [class.solde-negatif]="selected.solde < 0">
            <span class="si-label">Solde</span>
            <span class="si-val">{{ selected.solde >= 0 ? '+' : '' }}{{ selected.solde | number:'1.0-0' }} MRU</span>
          </div>
        </div>

        <!-- Calendrier mensuel -->
        <div class="mois-section">
          <div class="mois-title">Historique des loyers</div>
          <div class="mois-grid">
            <div class="mois-cell" *ngFor="let m of selected.mois"
                 [ngClass]="'mc-' + m.statut.toLowerCase()"
                 [title]="m.label + ' : ' + (m.montantPaye | number:'1.0-0') + ' / ' + (m.montant | number:'1.0-0') + ' MRU'">
              <div class="mc-label">{{ m.label }}</div>
              <div class="mc-icon">
                {{ m.statut === 'Paye'    ? '✓' :
                   m.statut === 'Partiel' ? '½' :
                   m.statut === 'Impaye'  ? '✗' :
                   m.statut === 'Avance'  ? '★' : '·' }}
              </div>
              <div class="mc-montant" *ngIf="m.statut !== 'Futur'">
                {{ m.montantPaye | number:'1.0-0' }}
              </div>
            </div>
          </div>
          <div class="mois-legend">
            <span class="leg leg-paye">✓ Payé</span>
            <span class="leg leg-partiel">½ Partiel</span>
            <span class="leg leg-impaye">✗ Impayé</span>
            <span class="leg leg-avance">★ Avance</span>
            <span class="leg leg-futur">· À venir</span>
          </div>
        </div>

        <!-- Dernier paiement -->
        <div class="last-payment" *ngIf="selected.dernierPaiement">
          <span>🕐</span>
          Dernier paiement : <strong>{{ selected.dernierPaiement | date:'dd/MM/yyyy' }}</strong>
        </div>

        <div class="rp-actions">
          <a [href]="'/collectes/saisir?contratId=' + selected.contratId" class="btn btn-gold btn-full">
            💰 Saisir un loyer
          </a>
        </div>

      </div>
    </div>

  </ng-container>
</div>
  `,
  styles: [`
    .kpi-global { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin-bottom: 22px; }
    .kg-card { background: #fff; border-radius: 12px; padding: 16px; display: flex; align-items: center; gap: 12px; box-shadow: 0 2px 10px rgba(14,28,56,.07); border: 1px solid #e8edf5; }
    .kg-icon { font-size: 24px; flex-shrink: 0; }
    .kg-label { font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: .5px; margin-bottom: 4px; }
    .kg-val { font-size: 20px; font-weight: 800; color: #0e1c38; }
    .kg-unit { font-size: 11px; font-weight: 400; color: #94a3b8; }
    .kg-du { border-top: 3px solid #e2e8f0; }
    .kg-paye { border-top: 3px solid #16a34a; }
    .kg-solde-pos { border-top: 3px solid #16a34a; }
    .kg-solde-neg { border-top: 3px solid #dc2626; }
    .kg-stat { flex-direction: column; align-items: flex-start; gap: 0; }
    .kg-stat-row { display: flex; gap: 6px; }
    .kg-pill { font-size: 11px; padding: 3px 10px; border-radius: 20px; display: flex; gap: 5px; align-items: center; }
    .kg-pill strong { font-weight: 800; }
    .kg-pill-green { background: #d1fae5; color: #065f46; }
    .kg-pill-red   { background: #fee2e2; color: #991b1b; }
    .kg-pill-blue  { background: #dbeafe; color: #1e40af; }
    .kg-pill-gray  { background: #f1f5f9; color: #64748b; }
    .layout { display: grid; grid-template-columns: 1fr; gap: 20px; }
    .layout.panel-open { grid-template-columns: 1fr 360px; align-items: start; }
    .progress-wrap { display: flex; align-items: center; gap: 6px; min-width: 80px; }
    .progress-bar { flex: 1; height: 5px; background: #e2e8f0; border-radius: 3px; overflow: hidden; }
    .progress-fill { height: 100%; border-radius: 3px; transition: width .3s; }
    .fill-ok { background: #16a34a; }
    .fill-ko { background: #dc2626; }
    .progress-label { font-size: 10px; color: #64748b; white-space: nowrap; }
    .text-danger { color: #dc2626; }
    .text-success { color: #16a34a; }
    .cell-sub { font-size: .7rem; color: #8a97b0; margin-top: 1px; }
    .badge-blue { background: #dbeafe; color: #1e40af; }
    .recap-pane { background: #fff; border-radius: 14px; overflow: hidden; box-shadow: 0 4px 24px rgba(14,28,56,.12); position: sticky; top: 20px; max-height: calc(100vh - 60px); overflow-y: auto; }
    .recap-pane::-webkit-scrollbar { width: 3px; }
    .recap-pane::-webkit-scrollbar-thumb { background: #e2e8f0; }
    .rp-header { display: flex; align-items: center; justify-content: space-between; padding: 14px 16px; background: #0e1c38; }
    .rp-title-block { display: flex; align-items: center; gap: 10px; }
    .rp-avatar { width: 36px; height: 36px; background: #c9a96e; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 15px; color: #0e1c38; flex-shrink: 0; }
    .rp-nom { font-size: 13px; font-weight: 700; color: #fff; }
    .rp-code { font-size: 11px; color: rgba(255,255,255,.5); font-family: monospace; margin-top: 2px; }
    .rp-close { background: rgba(255,255,255,.12); border: none; color: #fff; width: 26px; height: 26px; border-radius: 6px; cursor: pointer; font-size: 13px; display: flex; align-items: center; justify-content: center; }
    .rp-close:hover { background: rgba(255,255,255,.2); }
    .statut-loyer { display: flex; align-items: flex-start; gap: 10px; padding: 13px 16px; border-bottom: 1px solid #f1f5f9; }
    .sl-ajour       { background: #f0fdf4; } .sl-credit      { background: #ecfdf5; }
    .sl-enretard    { background: #fef2f2; } .sl-noncommence { background: #f8fafc; }
    .sl-icon { font-size: 20px; flex-shrink: 0; margin-top: 2px; }
    .sl-label { font-size: 13px; font-weight: 700; color: #0e1c38; }
    .sl-detail { font-size: 11px; color: #64748b; margin-top: 3px; }
    .kpi-row { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 5px; padding: 10px 14px; border-bottom: 1px solid #f1f5f9; }
    .kpi { background: #f8fafc; border-radius: 8px; padding: 9px 5px; text-align: center; border: 1px solid #e2e8f0; }
    .kpi-ok { border-color: #86efac !important; background: #f0fdf4; } .kpi-ko { border-color: #fca5a5 !important; background: #fef2f2; }
    .kpi-icon { font-size: 15px; margin-bottom: 2px; } .kpi-label { font-size: 9px; color: #64748b; text-transform: uppercase; letter-spacing: .5px; }
    .kpi-val { font-size: 12px; font-weight: 700; color: #0e1c38; margin: 2px 0; } .kpi-status { font-size: 9px; color: #64748b; }
    .solde-row { display: grid; grid-template-columns: 1fr 1fr 1fr; background: #f1f5f9; gap: 1px; border-bottom: 1px solid #f1f5f9; }
    .solde-item { background: #fff; padding: 9px 10px; text-align: center; }
    .si-label { display: block; font-size: 9px; color: #94a3b8; text-transform: uppercase; letter-spacing: .5px; margin-bottom: 3px; }
    .si-val { font-size: 11px; font-weight: 700; color: #0e1c38; } .si-ok { color: #16a34a; }
    .solde-positif .si-val { color: #16a34a; } .solde-negatif .si-val { color: #dc2626; }
    .mois-section { padding: 11px 14px; border-bottom: 1px solid #f1f5f9; }
    .mois-title { font-size: 10px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: .5px; margin-bottom: 7px; }
    .mois-grid { display: grid; grid-template-columns: repeat(6, 1fr); gap: 3px; }
    .mois-cell { text-align: center; padding: 4px 2px; border-radius: 5px; }
    .mc-paye { background: #d1fae5; } .mc-partiel { background: #fef3c7; } .mc-impaye { background: #fee2e2; } .mc-avance { background: #dbeafe; } .mc-futur { background: #f1f5f9; opacity: .6; }
    .mc-label { font-size: 7px; color: #64748b; font-weight: 600; text-transform: uppercase; }
    .mc-icon { font-size: 10px; margin: 1px 0; }
    .mc-paye .mc-icon { color: #16a34a; } .mc-partiel .mc-icon { color: #d97706; } .mc-impaye .mc-icon { color: #dc2626; } .mc-avance .mc-icon { color: #2563eb; }
    .mc-montant { font-size: 7px; color: #64748b; }
    .mois-legend { display: flex; flex-wrap: wrap; gap: 5px; margin-top: 5px; }
    .leg { font-size: 9px; color: #64748b; display: flex; align-items: center; gap: 3px; }
    .leg::before { content: ''; display: inline-block; width: 7px; height: 7px; border-radius: 2px; }
    .leg-paye::before { background: #d1fae5; } .leg-partiel::before { background: #fef3c7; } .leg-impaye::before { background: #fee2e2; } .leg-avance::before { background: #dbeafe; } .leg-futur::before { background: #f1f5f9; }
    .last-payment { padding: 9px 14px; font-size: 11px; color: #64748b; border-bottom: 1px solid #f1f5f9; display: flex; align-items: center; gap: 6px; }
    .rp-actions { padding: 12px 14px; }
    .btn-full { width: 100%; justify-content: center; display: flex; }
    .data-table tr.row-selected td { background: #eff6ff !important; }
    .data-table tr.row-selected td:first-child { border-left: 3px solid #3b82f6; }
    .data-table tr { cursor: pointer; }
    .num-badge { font-family: monospace; background: var(--surf2); padding: 3px 8px; border-radius: 6px; font-size: .78rem; color: var(--navy); font-weight: 700; }
    .sl-loading { display: flex; align-items: center; gap: 10px; padding: 60px; justify-content: center; color: #64748b; }
    .sl-spinner { width: 20px; height: 20px; border: 2px solid #e2e8f0; border-top-color: #0e1c38; border-radius: 50%; animation: spin .7s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
  `]
})
export class SuiviLoyersComponent implements OnInit {
  private svc = inject(SuiviLoyersService);

  loading = true;
  data: SuiviLoyersGlobalDto | null = null;
  filtre = '';
  selected: RecapFinancierContratDto | null = null;

  ngOnInit() { this.load(); }

  load() {
    this.loading = true;
    this.svc.getSuivi().subscribe({
      next:  d => { this.data = d; this.loading = false; },
      error: () => { this.data = this.buildFallback(); this.loading = false; }
    });
  }

  setFiltre(f: string) { this.filtre = f; this.selected = null; }

  selectContrat(c: RecapFinancierContratDto) {
    this.selected = this.selected?.contratId === c.contratId ? null : c;
  }

  contratsFiltres(): RecapFinancierContratDto[] {
    if (!this.data) return [];
    if (!this.filtre) return this.data.contrats;
    return this.data.contrats.filter(c => c.statutLoyer === this.filtre);
  }

  private buildFallback(): SuiviLoyersGlobalDto {
    return {
      totalDu: 0, totalPaye: 0, totalSolde: 0,
      nbAJour: 0, nbEnRetard: 0, nbCredit: 0, nbNonCommence: 0,
      contrats: []
    };
  }
}