import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { DashboardService, AuthService } from '../../core/services/api.services';
import { DashboardDto } from '../../core/models/models';

@Component({
  selector: 'kdi-dashboard',
  standalone: true,
  imports: [CommonModule, DecimalPipe, RouterLink],
  template: `
    <div class="dashboard">

      <!-- ── En-tête ── -->
      <div class="page-header">
        <div>
          <h2 class="page-title">Tableau de bord</h2>
          <p class="page-subtitle">Vue d'ensemble en temps réel — {{ today | date:'MMMM yyyy':'':'fr' }}</p>
        </div>
        <select class="period-select" (change)="onPeriodChange($event)">
          <option *ngFor="let m of derniersMois" [value]="m.value">{{ m.label }}</option>
        </select>
      </div>

      <ng-container *ngIf="data(); else loading">

        <!-- ── KPI PATRIMOINE ── -->
        <div class="kpi-grid">
          <div class="kpi-card navy">
            <div class="kpi-icon">🏠</div>
            <div class="kpi-body">
              <div class="kpi-value">{{ data()!.totalProduits }}</div>
              <div class="kpi-label">Produits locatifs</div>
            </div>
          </div>
          <div class="kpi-card green">
            <div class="kpi-icon">✅</div>
            <div class="kpi-body">
              <div class="kpi-value">{{ data()!.produitsLoues }}</div>
              <div class="kpi-label">Produits loués</div>
            </div>
          </div>
          <div class="kpi-card orange">
            <div class="kpi-icon">🔓</div>
            <div class="kpi-body">
              <div class="kpi-value">{{ data()!.produitsLibres }}</div>
              <div class="kpi-label">Produits libres</div>
            </div>
          </div>
          <div class="kpi-card gold">
            <div class="kpi-icon">📈</div>
            <div class="kpi-body">
              <div class="kpi-value">{{ data()!.tauxOccupation }}%</div>
              <div class="kpi-label">Taux d'occupation</div>
            </div>
          </div>
        </div>

        <!-- ── COLLECTES FINANCIÈRES ── -->
        <div class="section-title">💰 Collectes du mois</div>
        <div class="kpi-grid kpi-grid-2">
          <div class="kpi-card-large">
            <div class="kfl-header">
              <span class="kfl-label">Collectes encaissées</span>
              <span class="kfl-badge" [class.up]="data()!.evolutionCollectePct >= 0" [class.down]="data()!.evolutionCollectePct < 0">
                {{ data()!.evolutionCollectePct >= 0 ? '▲' : '▼' }} {{ data()!.evolutionCollectePct | number:'1.1-1' }}%
              </span>
            </div>
            <div class="kfl-amount">{{ data()!.collectesMoisCourant | number:'1.0-0' }} <span class="currency">MRU</span></div>
            <div class="kfl-prev">Mois précédent : {{ data()!.collectesMoisPrecedent | number:'1.0-0' }} MRU</div>
          </div>
          <div class="kpi-card-large">
            <div class="kfl-header"><span class="kfl-label">Contrats actifs</span></div>
            <div class="kfl-amount">{{ data()!.nbContratsActifs }}</div>
            <div class="kfl-prev">Baux en cours d'exécution</div>
          </div>
        </div>

        <!-- ── RETARDS (alerte) ── -->
        <div class="alert-retards" *ngIf="data()!.nbRetardsPaiement > 0">
          <div class="alert-icon">⚠️</div>
          <div class="alert-body">
            <strong>{{ data()!.nbRetardsPaiement }} locataire(s) en retard</strong>
            — Montant total dû : {{ data()!.montantRetards | number:'1.0-0' }} MRU
          </div>
          <a routerLink="/collectes" [queryParams]="{statut: 'retard'}" class="alert-link">Voir →</a>
        </div>

        <!-- ── GAINS AGENCE (Direction uniquement) ── -->
        <ng-container *ngIf="isDirection()">
          <div class="section-title">🏆 Gains agence (confidentiel)</div>
          <div class="kpi-grid kpi-grid-2">
            <div class="kpi-card-large gain">
              <div class="kfl-label">Gains ce mois</div>
              <div class="kfl-amount">{{ data()!.gainsAgenceMoisCourant | number:'1.0-0' }} <span class="currency">MRU</span></div>
            </div>
            <div class="kpi-card-large gain">
              <div class="kfl-label">Gains année en cours</div>
              <div class="kfl-amount">{{ data()!.gainsAgenceAnneeEnCours | number:'1.0-0' }} <span class="currency">MRU</span></div>
            </div>
          </div>
        </ng-container>

        <!-- ── GRAPHIQUE 12 MOIS ── -->
        <div class="section-title">📊 Évolution collectes (12 mois)</div>
        <div class="chart-card">
          <div class="chart-bars">
            <div *ngFor="let p of data()!.graphiqueCollectes" class="chart-bar-wrap">
              <div class="chart-bar-val">{{ p.montant | number:'1.0-0' }}</div>
              <div class="chart-bar" [style.height.%]="getBarHeight(p.montant)"></div>
              <div class="chart-bar-label">{{ p.mois.slice(5) }}/{{ p.mois.slice(2,4) }}</div>
            </div>
          </div>
        </div>

        <!-- ── COLLECTEURS SEMAINE ── -->
        <div class="section-title">👷 Performance collecteurs (semaine courante)</div>
        <div class="table-card" *ngIf="data()!.statsCollecteurs.length; else noCollecteurs">
          <table class="data-table">
            <thead><tr>
              <th>Collecteur</th>
              <th class="text-right">Collectes</th>
              <th class="text-right">Montant (MRU)</th>
              <th class="text-right">Retards</th>
            </tr></thead>
            <tbody>
              <tr *ngFor="let c of data()!.statsCollecteurs">
                <td>{{ c.nom }}</td>
                <td class="text-right">{{ c.nbCollectesSemaine }}</td>
                <td class="text-right">{{ c.montantSemaine | number:'1.0-0' }}</td>
                <td class="text-right"><span class="badge-retard" *ngIf="c.nbRetards > 0">{{ c.nbRetards }}</span><span *ngIf="!c.nbRetards">—</span></td>
              </tr>
            </tbody>
          </table>
        </div>
        <ng-template #noCollecteurs><p class="empty-text">Aucune collecte cette semaine.</p></ng-template>
        
        <!-- ── DERNIÈRES ACTIVITÉS ── -->
        <div class="section-title">🕒 Dernières activités</div>
        <div class="activity-list">
          <div *ngFor="let a of data()!.dernieresActivites" class="activity-item">
            <div class="activity-dot"></div>
            <div class="activity-body">
              <div class="activity-desc">{{ a.description }}</div>
              <div class="activity-date">{{ a.date | date:'dd/MM/yyyy HH:mm' }}</div>
            </div>
          </div>
        </div>

      </ng-container>

      <ng-template #loading>
        <div class="loading-state">
          <div class="spinner"></div>
          <p>Chargement du tableau de bord…</p>
        </div>
      </ng-template>
    </div>
  `,
  styles: [`
    .dashboard { max-width: 1400px; margin: 0 auto; }

    .page-header { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 24px; }
    .page-title { font-size: 28px; font-weight: 700; color: #0c1a35; margin: 0 0 4px; }
    .page-subtitle { font-size: 14px; color: #64748b; margin: 0; }
    .period-select { padding: 8px 12px; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 14px; background: #fff; }

    /* ── KPIs ── */
    .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 24px; }
    .kpi-grid-2 { grid-template-columns: repeat(2, 1fr); }

    .kpi-card {
      background: #fff; border-radius: 12px; padding: 20px;
      display: flex; gap: 16px; align-items: center;
      box-shadow: 0 1px 3px rgba(0,0,0,.06); border-left: 4px solid transparent;
    }
    .kpi-card.navy  { border-left-color: #0c1a35; }
    .kpi-card.green { border-left-color: #10b981; }
    .kpi-card.orange{ border-left-color: #f59e0b; }
    .kpi-card.gold  { border-left-color: #c8a96e; }

    .kpi-icon { font-size: 32px; }
    .kpi-value { font-size: 28px; font-weight: 700; color: #0c1a35; line-height: 1; }
    .kpi-label { font-size: 13px; color: #64748b; margin-top: 4px; }

    .kpi-card-large {
      background: #fff; border-radius: 12px; padding: 24px;
      box-shadow: 0 1px 3px rgba(0,0,0,.06);
    }
    .kpi-card-large.gain { border-left: 4px solid #c8a96e; }
    .kfl-header { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; }
    .kfl-label { font-size: 14px; color: #64748b; font-weight: 500; }
    .kfl-badge { padding: 3px 8px; border-radius: 12px; font-size: 12px; font-weight: 600; }
    .kfl-badge.up   { background: #d1fae5; color: #065f46; }
    .kfl-badge.down { background: #fee2e2; color: #991b1b; }
    .kfl-amount { font-size: 36px; font-weight: 800; color: #0c1a35; }
    .currency { font-size: 18px; font-weight: 500; color: #94a3b8; }
    .kfl-prev { font-size: 13px; color: #94a3b8; margin-top: 4px; }

    /* ── Alerte retards ── */
    .alert-retards {
      background: #fff7ed; border: 1px solid #fed7aa; border-radius: 10px;
      padding: 14px 20px; display: flex; align-items: center; gap: 12px; margin-bottom: 24px;
    }
    .alert-icon { font-size: 20px; }
    .alert-body { flex: 1; font-size: 14px; color: #92400e; }
    .alert-link { font-size: 13px; color: #c2410c; font-weight: 600; text-decoration: none; }

    /* ── Section title ── */
    .section-title { font-size: 16px; font-weight: 600; color: #0c1a35; margin: 28px 0 12px; }

    /* ── Chart ── */
    .chart-card { background: #fff; border-radius: 12px; padding: 24px; margin-bottom: 24px; box-shadow: 0 1px 3px rgba(0,0,0,.06); }
    .chart-bars { display: flex; align-items: flex-end; gap: 8px; height: 160px; }
    .chart-bar-wrap { display: flex; flex-direction: column; align-items: center; flex: 1; height: 100%; justify-content: flex-end; }
    .chart-bar-val { font-size: 9px; color: #94a3b8; margin-bottom: 2px; writing-mode: vertical-lr; transform: rotate(180deg); }
    .chart-bar { width: 100%; background: linear-gradient(to top, #0c1a35, #3b5998); border-radius: 4px 4px 0 0; min-height: 4px; transition: height .3s; }
    .chart-bar-label { font-size: 11px; color: #94a3b8; margin-top: 6px; }

    /* ── Table ── */
    .table-card { background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,.06); margin-bottom: 24px; }
    .data-table { width: 100%; border-collapse: collapse; }
    .data-table th { padding: 12px 16px; background: #f8fafc; font-size: 12px; font-weight: 600; color: #64748b; text-align: left; border-bottom: 1px solid #e2e8f0; }
    .data-table td { padding: 12px 16px; font-size: 14px; color: #334155; border-bottom: 1px solid #f1f5f9; }
    .text-right { text-align: right; }
    .badge-retard { background: #fee2e2; color: #991b1b; padding: 2px 8px; border-radius: 10px; font-size: 12px; font-weight: 600; }

    /* ── Activities ── */
    .activity-list { background: #fff; border-radius: 12px; padding: 16px 20px; box-shadow: 0 1px 3px rgba(0,0,0,.06); }
    .activity-item { display: flex; gap: 12px; padding: 10px 0; border-bottom: 1px solid #f1f5f9; }
    .activity-item:last-child { border-bottom: none; }
    .activity-dot { width: 8px; height: 8px; background: #c8a96e; border-radius: 50%; margin-top: 6px; flex-shrink: 0; }
    .activity-desc { font-size: 14px; color: #334155; }
    .activity-date { font-size: 12px; color: #94a3b8; margin-top: 2px; }

    .empty-text { color: #94a3b8; font-style: italic; padding: 16px 0; }

    .loading-state { display: flex; flex-direction: column; align-items: center; padding: 60px; gap: 16px; color: #64748b; }
    .spinner { width: 36px; height: 36px; border: 3px solid #e2e8f0; border-top-color: #0c1a35; border-radius: 50%; animation: spin .8s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }

    @media (max-width: 1024px) { .kpi-grid { grid-template-columns: repeat(2, 1fr); } }
    @media (max-width: 640px) { .kpi-grid { grid-template-columns: 1fr; } }
  `]
})
export class DashboardComponent implements OnInit {
  private dashSvc = inject(DashboardService);
  private auth    = inject(AuthService);

  data     = signal<DashboardDto | null>(null);
  today    = new Date();
  maxMontant = 0;

  derniersMois = this.buildDerniersMois();

  ngOnInit() { this.load(); }

  // load(period?: string) {
  //   this.dashSvc.getDashboard(period).subscribe(d => {
  //     this.data.set(d);
  //     this.maxMontant = Math.max(...d.graphiqueCollectes.map(p => p.montant), 1);
  //   });
  // }
  load(period?: string) {
    this.dashSvc.getDashboard(period).subscribe(d => {
      if (!d) return;
      this.data.set({
        ...d,
        graphiqueCollectes: d.graphiqueCollectes ?? [],
        statsCollecteurs: d.statsCollecteurs ?? [],
        dernieresActivites: d.dernieresActivites ?? [],
      });
      this.maxMontant = Math.max(...(d.graphiqueCollectes ?? []).map(p => p.montant), 1);
    });
  }
  onPeriodChange(e: Event) {
    this.load((e.target as HTMLSelectElement).value);
  }

  getBarHeight(m: number): number {
    return this.maxMontant === 0 ? 4 : Math.max((m / this.maxMontant) * 100, 4);
  }

  isDirection() { return this.auth.isDirection(); }

  buildDerniersMois() {
    const mois = [];
    const now  = new Date();
    for (let i = 0; i < 12; i++) {
      const d   = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const val = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
      mois.push({ value: val, label: val });
    }
    return mois;
  }
}
