import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule, DecimalPipe, DatePipe }         from '@angular/common';
import { RouterLink }                                   from '@angular/router';
import { DashboardService, AuthService, CollectesService } from '../../core/services/api.services';
import { DashboardDto, StatCollecteur, RapportCollecteurDto } from '../../core/models/models';

@Component({
  selector: 'kdi-dashboard',
  standalone: true,
  imports: [CommonModule, DecimalPipe, DatePipe, RouterLink],
  template: `
<!-- ══════════════════════════════════════════════════════════
     PAGE HEADER
══════════════════════════════════════════════════════════ -->
<div class="dashboard">

  <div class="page-header">
    <div>
      <h2 class="page-title">Tableau de bord</h2>
      <p class="page-sub">Vue d'ensemble en temps réel — {{ today | date:'MMMM yyyy':'':'fr' }}</p>
    </div>
    <select class="period-select" (change)="onPeriodChange($event)">
      <option *ngFor="let m of derniersMois" [value]="m.value">{{ m.label }}</option>
    </select>
  </div>

  <ng-container *ngIf="data(); else loading">

    <!-- ══════════════════════════════════════════════════════
         KPI PATRIMOINE
    ══════════════════════════════════════════════════════════ -->
    <div class="kpi-row">
      <div class="kpi navy">
        <div class="kpi-emoji">🏠</div>
        <div>
          <div class="kpi-val">{{ data()!.totalProduits }}</div>
          <div class="kpi-lbl">Produits locatifs</div>
        </div>
      </div>
      <div class="kpi green">
        <div class="kpi-emoji">✅</div>
        <div>
          <div class="kpi-val">{{ data()!.produitsLoues }}</div>
          <div class="kpi-lbl">Produits loués</div>
        </div>
      </div>
      <div class="kpi orange">
        <div class="kpi-emoji">🔓</div>
        <div>
          <div class="kpi-val">{{ data()!.produitsLibres }}</div>
          <div class="kpi-lbl">Produits libres</div>
        </div>
      </div>
      <div class="kpi gold">
        <div class="kpi-emoji">📈</div>
        <div>
          <div class="kpi-val">{{ data()!.tauxOccupation }}%</div>
          <div class="kpi-lbl">Taux d'occupation</div>
        </div>
      </div>
    </div>

    <!-- ══════════════════════════════════════════════════════
         COLLECTES DU MOIS
    ══════════════════════════════════════════════════════════ -->
    <div class="section-title">💰 Collectes du mois</div>
    <div class="large-row">
      <div class="kpi-large gold-border">
        <div class="klg-header">
          <span class="klg-lbl">Collectes encaissées</span>
          <span class="klg-badge"
                [class.up]="data()!.evolutionCollectePct >= 0"
                [class.down]="data()!.evolutionCollectePct < 0">
            {{ data()!.evolutionCollectePct >= 0 ? '▲' : '▼' }}
            {{ data()!.evolutionCollectePct | number:'1.1-1' }}%
          </span>
        </div>
        <div class="klg-val">
          {{ data()!.collectesMoisCourant | number:'1.0-0' }}
          <span class="cur">MRU</span>
        </div>
        <div class="klg-prev">
          Mois précédent : {{ data()!.collectesMoisPrecedent | number:'1.0-0' }} MRU
        </div>
      </div>

      <div class="kpi-large ok-border">
        <div class="klg-header"><span class="klg-lbl">Contrats actifs</span></div>
        <div class="klg-val">{{ data()!.nbContratsActifs }}</div>
        <div class="klg-prev">Baux en cours d'exécution</div>
      </div>
    </div>

    <!-- Alerte retards -->
    <div class="alert-retards" *ngIf="data()!.nbRetardsPaiement > 0">
      <span class="alr-icon">⚠️</span>
      <div class="alr-body">
        <strong>{{ data()!.nbRetardsPaiement }} locataire(s) en retard</strong>
        — Montant total dû : {{ data()!.montantRetards | number:'1.0-0' }} MRU
      </div>
      <a routerLink="/collectes" [queryParams]="{statut:'retard'}" class="alr-link">
        Voir les retards →
      </a>
    </div>

    <!-- ══════════════════════════════════════════════════════
         GAINS AGENCE  (Direction uniquement)
    ══════════════════════════════════════════════════════════ -->
    <ng-container *ngIf="isDirection()">
      <div class="section-title">
        🏆 Gains agence
        <span class="section-note">(confidentiel — Direction)</span>
      </div>
      <div class="gains-row">
        <div class="gains-card">
          <div class="gains-lbl">Gains ce mois</div>
          <div class="gains-val">
            {{ data()!.gainsAgenceMoisCourant | number:'1.0-0' }}
            <span class="gains-cur">MRU</span>
          </div>
        </div>
        <div class="gains-card">
          <div class="gains-lbl">Gains année en cours</div>
          <div class="gains-val">
            {{ data()!.gainsAgenceAnneeEnCours | number:'1.0-0' }}
            <span class="gains-cur">MRU</span>
          </div>
        </div>
      </div>
    </ng-container>

    <!-- ══════════════════════════════════════════════════════
         GRAPHIQUE 12 MOIS
    ══════════════════════════════════════════════════════════ -->
    <div class="section-title">📊 Évolution collectes — 12 mois</div>
    <div class="chart-card">
      <div class="chart-bars">
        <div *ngFor="let p of data()!.graphiqueCollectes"
             class="bar-group"
             [title]="p.mois + ' : ' + (p.montant | number:'1.0-0') + ' MRU'">
          <div class="bar-val">{{ p.montant / 1000 | number:'1.0-0' }}k</div>
          <div class="bar-fill" [style.height.%]="getBarHeight(p.montant)"></div>
          <div class="bar-lbl">{{ p.mois.slice(5) }}/{{ p.mois.slice(2,4) }}</div>
        </div>
      </div>
    </div>

    <!-- ══════════════════════════════════════════════════════
         PERFORMANCE COLLECTEURS
    ══════════════════════════════════════════════════════════ -->
    <ng-container *ngIf="data()!.statsCollecteurs.length">

      <div class="section-title">👷 Performance collecteurs — Semaine S{{ semaineEnCours }}</div>

      <!-- ── Cartes podium Top 3 ── -->
      <div class="coll-cards-row">
        <ng-container *ngFor="let c of top3(); let i = index">
          <div class="coll-card" [ngClass]="'rank-' + (i + 1)">

            <div class="coll-rank">#{{ i + 1 }}</div>

            <div class="coll-head">
              <div class="coll-avatar">{{ getInitiales(c) }}</div>
              <div>
                <div class="coll-name">{{ c.nom }}</div>
                <div class="coll-type">{{ c.typeLabel || 'Collecteur' }}</div>
              </div>
            </div>

            <div class="coll-stats">
              <div class="cs-item">
                <div class="cs-lbl">Collectes</div>
                <div class="cs-val gold">{{ c.nbCollectesSemaine }}</div>
              </div>
              <div class="cs-item">
                <div class="cs-lbl">Montant (MRU)</div>
                <div class="cs-val">{{ c.montantSemaine / 1000 | number:'1.0-0' }}k</div>
              </div>
              <div class="cs-item">
                <div class="cs-lbl">Taux encaiss.</div>
                <div class="cs-val" [ngClass]="getRateClass(c.tauxEncaissement)">
                  {{ c.tauxEncaissement }}%
                </div>
              </div>
              <div class="cs-item">
                <div class="cs-lbl">Retards</div>
                <div class="cs-val"
                     [class.ok]="c.nbRetards === 0"
                     [class.warn]="c.nbRetards > 0 && c.nbRetards <= 2"
                     [class.danger]="c.nbRetards > 2">
                  {{ c.nbRetards }}
                </div>
              </div>
            </div>

            <div class="coll-bar-wrap">
              <div class="coll-bar-top">
                <span>Volume collecte</span>
                <span [ngClass]="getEvolutionClass(c)">
                  {{ getEvolutionSymbol(c) }} {{ getEvolutionPct(c) | number:'1.1-1' }}% vs S-1
                </span>
              </div>
              <div class="coll-bar-bg">
                <div class="coll-bar-fill"
                     [ngClass]="'rank-' + (i + 1)"
                     [style.width.%]="getVolumePct(c)">
                </div>
              </div>
            </div>

          </div>
        </ng-container>
      </div>

      <!-- ── Tableau détaillé tous collecteurs ── -->
      <div class="table-card">
        <div class="table-card-header">
          <div class="table-card-title">📋 Détail performance — tous les collecteurs</div>
          <a routerLink="/collectes/rapport" class="btn-link">Rapport complet →</a>
        </div>
        <div class="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Rang</th>
                <th>Collecteur</th>
                <th class="r">Collectes&nbsp;/&nbsp;sem.</th>
                <th class="r">Montant (MRU)</th>
                <th class="r">Taux encaissement</th>
                <th class="r">Retards</th>
                <th class="r">Évolution vs S-1</th>
                <th>Score</th>
                <th>Statut</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let c of data()!.statsCollecteurs; let i = index">

                <!-- Rang -->
                <td class="rank-cell">
                  <span *ngIf="i === 0">🥇</span>
                  <span *ngIf="i === 1">🥈</span>
                  <span *ngIf="i === 2">🥉</span>
                  <span *ngIf="i > 2" class="rank-num">{{ i + 1 }}</span>
                </td>

                <!-- Collecteur -->
                <td>
                  <div class="coll-cell">
                    <div class="coll-mini-avatar">{{ getInitiales(c) }}</div>
                    <div>
                      <div class="coll-cell-name">{{ c.nom }}</div>
                      <div class="coll-cell-type">{{ c.typeLabel || 'Collecteur' }}</div>
                    </div>
                  </div>
                </td>

                <td class="r mono">{{ c.nbCollectesSemaine }}</td>
                <td class="r mono">{{ c.montantSemaine | number:'1.0-0' }}</td>

                <!-- Taux avec mini barre -->
                <td class="r">
                  <div class="rate-cell">
                    <span class="badge" [ngClass]="getRateBadge(c.tauxEncaissement)">
                      {{ c.tauxEncaissement }}%
                    </span>
                    <div class="rate-mini-bar-bg">
                      <div class="rate-mini-bar-fill"
                           [ngClass]="getRateBarClass(c.tauxEncaissement)"
                           [style.width.%]="c.tauxEncaissement">
                      </div>
                    </div>
                  </div>
                </td>

                <!-- Retards -->
                <td class="r">
                  <span *ngIf="c.nbRetards > 0" class="badge badge-danger">
                    {{ c.nbRetards }}
                  </span>
                  <span *ngIf="c.nbRetards === 0" class="no-retard">—</span>
                </td>

                <!-- Évolution -->
                <td class="r">
                  <span [ngClass]="getEvolutionClass(c)">
                    {{ getEvolutionSymbol(c) }} {{ getEvolutionPct(c) | number:'1.1-1' }}%
                  </span>
                </td>

                <!-- Score barre -->
                <td>
                  <div class="score-row">
                    <div class="score-bar-bg">
                      <div class="score-bar-fill"
                           [ngClass]="getScoreBarClass(c.score)"
                           [style.width.%]="c.score">
                      </div>
                    </div>
                    <span class="score-num" [ngClass]="getScoreTextClass(c.score)">
                      {{ c.score }}
                    </span>
                  </div>
                </td>

                <!-- Statut -->
                <td>
                  <span *ngIf="c.score >= 80" class="badge badge-ok">⭐ Excellent</span>
                  <span *ngIf="c.score >= 65 && c.score < 80" class="badge badge-info">👍 Bon</span>
                  <span *ngIf="c.score >= 50 && c.score < 65" class="badge badge-warn">⚠ À améliorer</span>
                  <span *ngIf="c.score < 50"  class="badge badge-danger">🔴 Insuffisant</span>
                </td>

              </tr>
            </tbody>
          </table>
        </div>
      </div>

    </ng-container>
    <p *ngIf="!data()!.statsCollecteurs.length" class="empty-text">
      Aucune collecte enregistrée cette semaine.
    </p>

    <!-- ══════════════════════════════════════════════════════
         RAPPORT HEBDO RAPIDE  +  DERNIÈRES ACTIVITÉS
    ══════════════════════════════════════════════════════════ -->
    <div class="two-col">

      <!-- Mini rapport -->
      <div>
        <div class="section-title" style="margin-top:0">
          📑 Rapport hebdomadaire — S{{ semaineEnCours }}
        </div>

        <ng-container *ngIf="rapport(); else noRapport">
          <div class="rapport-kpis">
            <div class="rk-item">
              <div class="rk-lbl">Payés</div>
              <div class="rk-val ok">{{ rapport()!.lignesPayees.length }}</div>
            </div>
            <div class="rk-item">
              <div class="rk-lbl">Non payés</div>
              <div class="rk-val danger">{{ rapport()!.lignesNonPayees.length }}</div>
            </div>
            <div class="rk-item">
              <div class="rk-lbl">Rattrapages</div>
              <div class="rk-val warn">{{ rapport()!.lignesRattrapage.length }}</div>
            </div>
            <div class="rk-item">
              <div class="rk-lbl">Total collecté</div>
              <div class="rk-val gold mono">{{ rapport()!.totalCollecte | number:'1.0-0' }}</div>
            </div>
          </div>

          <div class="table-card">
            <div class="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Produit</th>
                    <th>Locataire</th>
                    <th>Période</th>
                    <th class="r">Encaissé (MRU)</th>
                    <th>Statut</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let l of rapport()!.lignesPayees | slice:0:5"
                      [class.row-rattrapage]="l.estRattrapage">
                    <td><span class="code-badge">{{ l.produitCode }}</span></td>
                    <td>{{ l.locataireNom }}</td>
                    <td>
                      {{ l.periodeMois }}
                      <span *ngIf="l.estRattrapage" class="badge-rattrapage">Rattrapage</span>
                    </td>
                    <td class="r mono">{{ l.montantEncaisse | number:'1.0-0' }}</td>
                    <td><span class="badge badge-ok">✓ Payé</span></td>
                  </tr>
                  <tr *ngFor="let l of rapport()!.lignesNonPayees | slice:0:3"
                      class="row-retard">
                    <td><span class="code-badge">{{ l.produitCode }}</span></td>
                    <td><strong>{{ l.locataireNom }}</strong></td>
                    <td>{{ l.periodeMois }}</td>
                    <td class="r mono danger-text">{{ l.montantAttendu | number:'1.0-0' }}</td>
                    <td><span class="badge badge-danger">⚠ Retard</span></td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div class="table-footer">
              <a routerLink="/collectes/rapport" class="btn-link">Voir le rapport complet →</a>
            </div>
          </div>
        </ng-container>

        <ng-template #noRapport>
          <div class="empty-mini">📭 Aucune donnée pour la semaine en cours.</div>
        </ng-template>
      </div>

      <!-- Dernières activités -->
      <div>
        <div class="section-title" style="margin-top:0">🕒 Dernières activités</div>
        <div class="activity-list">
          <div *ngFor="let a of data()!.dernieresActivites" class="act-item">
            <div class="act-dot" [ngClass]="getActivityDotClass(a.type)"></div>
            <div>
              <div class="act-desc">{{ a.description }}</div>
              <div class="act-date">{{ a.date | date:'dd/MM/yyyy HH:mm' }}</div>
            </div>
          </div>
          <div *ngIf="!data()!.dernieresActivites.length" class="empty-mini">
            Aucune activité récente.
          </div>
        </div>
      </div>

    </div><!-- /two-col -->

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
    :host {
      --gold:      #C9A84C; --gold-light:#E8C96A; --gold-dark:#8B6914;
      --ink:       #0D0D0D; --ink-mid:   #1A1A2E; --ink-soft: #2D2D4A;
      --cream:     #F8F4ED; --cream-dk:  #EDE8DF; --muted:    #8A8899;
      --danger:    #C0392B; --danger-bg: #FDECEA;
      --warn:      #D4850A; --warn-bg:   #FEF3E2;
      --ok:        #1A7A4A; --ok-bg:     #E6F5EE;
      --info:      #1A5E9E; --info-bg:   #E6F0FA;
      --r: 12px;   --sh: 0 2px 10px rgba(0,0,0,.07);
    }

    .dashboard { max-width:1400px; margin:0 auto; }

    /* ─ page header ─ */
    .page-header { display:flex; justify-content:space-between; align-items:flex-end; margin-bottom:26px; flex-wrap:wrap; gap:12px; }
    .page-title  { font-size:24px; font-weight:700; color:var(--ink); margin-bottom:3px; }
    .page-sub    { font-size:13px; color:var(--muted); }
    .period-select { padding:7px 12px; border:1.5px solid var(--cream-dk); border-radius:8px; font-size:13px; background:#fff; outline:none; cursor:pointer; }

    /* ─ kpi patrimoine ─ */
    .kpi-row { display:grid; grid-template-columns:repeat(4,1fr); gap:16px; margin-bottom:22px; }
    .kpi { background:#fff; border-radius:var(--r); padding:20px 22px; display:flex; align-items:center; gap:16px; box-shadow:var(--sh); border-left:4px solid transparent; }
    .kpi.navy   { border-left-color:#0c1a35; }
    .kpi.green  { border-left-color:var(--ok); }
    .kpi.orange { border-left-color:var(--warn); }
    .kpi.gold   { border-left-color:var(--gold); }
    .kpi-emoji  { font-size:30px; }
    .kpi-val    { font-size:28px; font-weight:700; color:var(--ink); line-height:1; }
    .kpi-lbl    { font-size:12px; color:var(--muted); margin-top:4px; font-weight:500; }

    /* ─ section title ─ */
    .section-title { font-size:14px; font-weight:700; color:var(--ink); margin:26px 0 12px; display:flex; align-items:center; gap:8px; }
    .section-title::after { content:''; flex:1; height:1px; background:var(--cream-dk); }
    .section-note { font-size:11px; color:var(--muted); font-weight:400; }

    /* ─ large kpi ─ */
    .large-row { display:grid; grid-template-columns:repeat(2,1fr); gap:16px; margin-bottom:16px; }
    .kpi-large { background:#fff; border-radius:var(--r); padding:24px 26px; box-shadow:var(--sh); display:flex; flex-direction:column; gap:8px; }
    .kpi-large.gold-border { border-left:4px solid var(--gold); }
    .kpi-large.ok-border   { border-left:4px solid var(--ok); }
    .klg-header { display:flex; align-items:center; gap:10px; }
    .klg-lbl    { font-size:13px; color:var(--muted); font-weight:500; flex:1; }
    .klg-badge  { padding:3px 8px; border-radius:12px; font-size:11px; font-weight:700; }
    .klg-badge.up   { background:var(--ok-bg);    color:var(--ok); }
    .klg-badge.down { background:var(--danger-bg); color:var(--danger); }
    .klg-val    { font-size:34px; font-weight:700; color:var(--ink); line-height:1; }
    .cur        { font-size:16px; font-weight:400; color:var(--muted); margin-left:4px; }
    .klg-prev   { font-size:12px; color:var(--muted); }

    /* ─ alerte retards ─ */
    .alert-retards { background:var(--warn-bg); border:1px solid #FBBF24; border-left:4px solid var(--warn); border-radius:10px; padding:14px 20px; display:flex; align-items:center; gap:12px; margin-bottom:6px; }
    .alr-icon { font-size:20px; }
    .alr-body { flex:1; font-size:13.5px; color:#92400e; }
    .alr-link { font-size:13px; color:var(--warn); font-weight:700; text-decoration:none; border:1.5px solid var(--warn); padding:5px 12px; border-radius:7px; transition:all .2s; }
    .alr-link:hover { background:var(--warn); color:#fff; }

    /* ─ gains agence ─ */
    .gains-row { display:grid; grid-template-columns:1fr 1fr; gap:16px; }
    .gains-card { background:linear-gradient(135deg,var(--ink-mid) 0%,#2D2D4A 100%); border-radius:var(--r); padding:24px 26px; box-shadow:var(--sh); }
    .gains-lbl { font-size:11px; color:rgba(255,255,255,.5); letter-spacing:.8px; text-transform:uppercase; margin-bottom:10px; }
    .gains-val { font-size:32px; font-weight:700; color:var(--gold-light); line-height:1; }
    .gains-cur { font-size:15px; font-weight:400; color:var(--gold); }

    /* ─ graphique ─ */
    .chart-card { background:#fff; border-radius:var(--r); padding:24px 26px; box-shadow:var(--sh); margin-bottom:4px; }
    .chart-bars { display:flex; align-items:flex-end; gap:6px; height:150px; position:relative; padding-bottom:28px; }
    .chart-bars::before { content:''; position:absolute; bottom:28px; left:0; right:0; border-top:1px dashed var(--cream-dk); }
    .bar-group  { flex:1; display:flex; flex-direction:column; align-items:center; gap:3px; position:relative; }
    .bar-fill   { width:100%; border-radius:4px 4px 0 0; min-height:4px; background:linear-gradient(to top,var(--ink-mid),#3b5998); transition:height .3s; cursor:pointer; }
    .bar-fill:hover { opacity:.8; }
    .bar-val    { font-size:8.5px; color:var(--muted); font-family:monospace; writing-mode:vertical-lr; transform:rotate(180deg); height:30px; overflow:hidden; }
    .bar-lbl    { font-size:10px; color:var(--muted); font-family:monospace; position:absolute; bottom:0; }

    /* ─ cartes collecteurs podium ─ */
    .coll-cards-row { display:grid; grid-template-columns:repeat(3,1fr); gap:16px; margin-bottom:20px; }
    .coll-card { background:#fff; border-radius:var(--r); padding:20px 22px; box-shadow:var(--sh); border-top:3px solid var(--cream-dk); position:relative; overflow:hidden; transition:box-shadow .2s; }
    .coll-card:hover { box-shadow:0 8px 28px rgba(0,0,0,.12); }
    .coll-card.rank-1 { border-top-color:var(--gold); }
    .coll-card.rank-2 { border-top-color:#94a3b8; }
    .coll-card.rank-3 { border-top-color:#d4a373; }
    .coll-rank { position:absolute; top:14px; right:16px; font-size:22px; font-weight:700; opacity:.1; color:var(--ink); }
    .coll-head { display:flex; align-items:center; gap:12px; margin-bottom:16px; }
    .coll-avatar { width:40px; height:40px; border-radius:10px; background:linear-gradient(135deg,var(--ink-mid),var(--ink-soft)); display:flex; align-items:center; justify-content:center; font-size:14px; color:var(--gold-light); font-weight:700; flex-shrink:0; }
    .coll-name { font-weight:700; font-size:14px; color:var(--ink); }
    .coll-type { font-size:11px; color:var(--muted); margin-top:2px; }
    .coll-stats { display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:14px; }
    .cs-lbl { font-size:10px; color:var(--muted); font-weight:600; text-transform:uppercase; letter-spacing:.4px; }
    .cs-val { font-size:20px; font-weight:700; color:var(--ink); line-height:1.3; margin-top:2px; }
    .cs-val.gold   { color:var(--gold-dark); }
    .cs-val.ok     { color:var(--ok); }
    .cs-val.warn   { color:var(--warn); }
    .cs-val.danger { color:var(--danger); }
    .coll-bar-top { display:flex; justify-content:space-between; font-size:11px; color:var(--muted); margin-bottom:5px; }
    .coll-bar-bg  { height:6px; background:var(--cream-dk); border-radius:10px; overflow:hidden; }
    .coll-bar-fill { height:100%; border-radius:10px; transition:width .5s; }
    .coll-bar-fill.rank-1 { background:linear-gradient(90deg,var(--gold-dark),var(--gold-light)); }
    .coll-bar-fill.rank-2 { background:linear-gradient(90deg,#64748b,#94a3b8); }
    .coll-bar-fill.rank-3 { background:linear-gradient(90deg,#92400e,#d4a373); }

    /* ─ table commune ─ */
    .table-card { background:#fff; border-radius:var(--r); box-shadow:var(--sh); overflow:hidden; margin-bottom:20px; }
    .table-card-header { padding:14px 20px; border-bottom:1px solid var(--cream-dk); display:flex; align-items:center; justify-content:space-between; }
    .table-card-title  { font-weight:700; font-size:14px; color:var(--ink); }
    .table-footer { padding:12px 18px; border-top:1px solid var(--cream-dk); text-align:center; }
    .btn-link { font-size:12.5px; color:var(--gold-dark); font-weight:700; text-decoration:none; }
    .btn-link:hover { text-decoration:underline; }
    .table-scroll { overflow-x:auto; }

    table    { width:100%; border-collapse:collapse; }
    thead th { padding:10px 14px; background:#f8f9fc; text-align:left; font-size:11px; font-weight:700; letter-spacing:.7px; text-transform:uppercase; color:var(--muted); border-bottom:1px solid var(--cream-dk); }
    thead th.r { text-align:right; }
    tbody td { padding:12px 14px; font-size:13.5px; color:var(--ink-soft); border-bottom:1px solid var(--cream-dk); vertical-align:middle; }
    tbody tr:last-child td { border-bottom:none; }
    tbody tr:hover td { background:rgba(201,168,76,.03); }
    td.r    { text-align:right; }
    td.mono { font-family:monospace; font-weight:600; }

    .rank-cell { text-align:center; font-size:18px; }
    .rank-num  { font-size:13px; font-weight:700; color:var(--muted); }
    .coll-cell { display:flex; align-items:center; gap:10px; }
    .coll-mini-avatar { width:32px; height:32px; border-radius:8px; background:linear-gradient(135deg,var(--ink-mid),var(--ink-soft)); display:flex; align-items:center; justify-content:center; font-size:11px; color:var(--gold-light); font-weight:700; flex-shrink:0; }
    .coll-cell-name { font-weight:600; font-size:13.5px; color:var(--ink); }
    .coll-cell-type { font-size:11px; color:var(--muted); }

    .rate-cell { display:flex; flex-direction:column; align-items:flex-end; gap:4px; }
    .rate-mini-bar-bg   { width:60px; height:4px; background:var(--cream-dk); border-radius:4px; overflow:hidden; }
    .rate-mini-bar-fill { height:100%; border-radius:4px; }
    .rate-bar-ok     { background:var(--ok); }
    .rate-bar-warn   { background:var(--warn); }
    .rate-bar-danger { background:var(--danger); }

    .badge { display:inline-flex; align-items:center; padding:3px 9px; border-radius:20px; font-size:11px; font-weight:700; white-space:nowrap; }
    .badge-ok     { background:var(--ok-bg);    color:var(--ok); }
    .badge-danger { background:var(--danger-bg); color:var(--danger); }
    .badge-warn   { background:var(--warn-bg);   color:var(--warn); }
    .badge-info   { background:var(--info-bg);   color:var(--info); }

    .no-retard  { color:var(--ok); font-size:13px; }
    .trend-up   { color:var(--ok);     font-size:12px; font-weight:600; }
    .trend-down { color:var(--danger); font-size:12px; font-weight:600; }

    .score-row      { display:flex; align-items:center; gap:8px; }
    .score-bar-bg   { flex:1; max-width:80px; height:6px; background:var(--cream-dk); border-radius:6px; overflow:hidden; }
    .score-bar-fill { height:100%; border-radius:6px; transition:width .4s; }
    .score-bar-ok     { background:linear-gradient(90deg,var(--ok),#2EA862); }
    .score-bar-warn   { background:linear-gradient(90deg,var(--warn),#F59E0B); }
    .score-bar-danger { background:linear-gradient(90deg,var(--danger),#E05C50); }
    .score-num    { font-size:12px; font-weight:700; }
    .score-ok     { color:var(--ok); }
    .score-warn   { color:var(--warn); }
    .score-danger { color:var(--danger); }

    /* ─ deux colonnes ─ */
    .two-col { display:grid; grid-template-columns:1.4fr 1fr; gap:18px; margin-top:26px; }

    /* ─ rapport kpis ─ */
    .rapport-kpis { display:flex; gap:0; background:#fff; border-radius:var(--r); box-shadow:var(--sh); padding:16px 20px; margin-bottom:14px; flex-wrap:wrap; }
    .rk-item { display:flex; flex-direction:column; gap:3px; padding:0 20px; border-right:1px solid var(--cream-dk); flex:1; min-width:80px; }
    .rk-item:last-child { border-right:none; }
    .rk-lbl { font-size:10px; color:var(--muted); font-weight:700; text-transform:uppercase; letter-spacing:.6px; }
    .rk-val { font-size:20px; font-weight:700; color:var(--ink); }
    .rk-val.ok     { color:var(--ok); }
    .rk-val.danger { color:var(--danger); }
    .rk-val.warn   { color:var(--warn); }
    .rk-val.gold   { color:var(--gold-dark); }
    .rk-val.mono   { font-family:monospace; }

    .row-retard td     { background:#fff7f7; }
    .row-rattrapage td { background:#fffbeb; }
    .code-badge    { background:#e0e7ef; color:var(--ink-mid); padding:2px 7px; border-radius:5px; font-size:11px; font-family:monospace; }
    .badge-rattrapage { background:#fef3c7; color:#92400e; padding:1px 6px; border-radius:8px; font-size:10px; margin-left:6px; }
    .danger-text   { color:var(--danger); }

    /* ─ activités ─ */
    .activity-list { background:#fff; border-radius:var(--r); box-shadow:var(--sh); overflow:hidden; }
    .act-item { display:flex; gap:14px; padding:13px 18px; border-bottom:1px solid var(--cream-dk); transition:background .15s; }
    .act-item:last-child { border-bottom:none; }
    .act-item:hover { background:var(--cream); }
    .act-dot { width:9px; height:9px; border-radius:50%; background:var(--gold); flex-shrink:0; margin-top:5px; }
    .act-dot.ok     { background:var(--ok); }
    .act-dot.danger { background:var(--danger); }
    .act-dot.warn   { background:var(--warn); }
    .act-dot.info   { background:var(--info); }
    .act-desc { font-size:13.5px; color:var(--ink-soft); line-height:1.5; }
    .act-date { font-size:11px; color:var(--muted); margin-top:3px; font-family:monospace; }

    .empty-text { color:var(--muted); font-style:italic; padding:16px 0; }
    .empty-mini { background:#f0fdf4; border:1px solid #bbf7d0; border-radius:8px; padding:14px; text-align:center; color:#065f46; font-size:13px; }

    .loading-state { display:flex; flex-direction:column; align-items:center; padding:60px; gap:16px; color:var(--muted); }
    .spinner { width:36px; height:36px; border:3px solid var(--cream-dk); border-top-color:var(--ink-mid); border-radius:50%; animation:spin .8s linear infinite; }
    @keyframes spin { to { transform:rotate(360deg); } }

    @media(max-width:1200px) {
      .kpi-row, .coll-cards-row { grid-template-columns:repeat(2,1fr); }
      .two-col { grid-template-columns:1fr; }
    }
    @media(max-width:768px) {
      .kpi-row, .large-row, .gains-row { grid-template-columns:1fr; }
      .coll-cards-row { grid-template-columns:1fr; }
    }
  `]
})
export class DashboardComponent implements OnInit {

  private dashSvc    = inject(DashboardService);
  private collectSvc = inject(CollectesService);
  private auth       = inject(AuthService);

  data    = signal<DashboardDto | null>(null);
  rapport = signal<RapportCollecteurDto | null>(null);

  today          = new Date();
  maxMontant     = 0;
  semaineEnCours = this.getWeekNumber(new Date());
  derniersMois   = this.buildDerniersMois();

  // Top 3 calculé depuis le signal data
  top3 = computed(() => (this.data()?.statsCollecteurs ?? []).slice(0, 3));

  ngOnInit(): void {
    this.load();
    this.loadRapport();
  }

  // ── Chargement dashboard ─────────────────────────
  load(period?: string): void {
    this.dashSvc.getDashboard(period).subscribe(d => {
      if (!d) return;
      this.data.set({
        ...d,
        graphiqueCollectes: d.graphiqueCollectes ?? [],
        statsCollecteurs:   d.statsCollecteurs   ?? [],
        dernieresActivites: d.dernieresActivites  ?? [],
      });
      this.maxMontant = Math.max(
        ...(d.graphiqueCollectes ?? []).map(p => p.montant), 1
      );
    });
  }

  // ── Chargement rapport hebdo ─────────────────────
  loadRapport(): void {
    const user = this.auth.getUser();
    if (!user?.id) return;
    this.collectSvc
      .getRapportCollecteur(user.id, this.semaineEnCours, this.today.getFullYear())
      .subscribe({
        next:  r => this.rapport.set(r),
        error: () => this.rapport.set(null)
      });
  }

  onPeriodChange(e: Event): void {
    this.load((e.target as HTMLSelectElement).value);
  }

  // ── Graphique ────────────────────────────────────
  getBarHeight(m: number): number {
    return this.maxMontant === 0 ? 4 : Math.max((m / this.maxMontant) * 100, 4);
  }

  // ── Initiales collecteur ─────────────────────────
  getInitiales(c: StatCollecteur): string {
    if (c.initiales) return c.initiales;
    return c.nom.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  }

  // ── Volume (barre carte) ─────────────────────────
  getVolumePct(c: StatCollecteur): number {
    const max = Math.max(
      ...(this.data()?.statsCollecteurs ?? []).map(x => x.montantSemaine), 1
    );
    return Math.round((c.montantSemaine / max) * 100);
  }

  // ── Évolution vs semaine précédente ─────────────
  getEvolutionPct(c: StatCollecteur): number {
    if (!c.montantSemainePrec || c.montantSemainePrec === 0) return 0;
    return ((c.montantSemaine - c.montantSemainePrec) / c.montantSemainePrec) * 100;
  }
  getEvolutionSymbol(c: StatCollecteur): string { return this.getEvolutionPct(c) >= 0 ? '▲' : '▼'; }
  getEvolutionClass(c: StatCollecteur): string  { return this.getEvolutionPct(c) >= 0 ? 'trend-up' : 'trend-down'; }

  // ── Taux encaissement ────────────────────────────
  getRateClass(t: number):    string { return t >= 80 ? 'ok'        : t >= 65 ? 'warn'        : 'danger'; }
  getRateBadge(t: number):    string { return t >= 80 ? 'badge-ok'  : t >= 65 ? 'badge-warn'  : 'badge-danger'; }
  getRateBarClass(t: number): string { return t >= 80 ? 'rate-bar-ok' : t >= 65 ? 'rate-bar-warn' : 'rate-bar-danger'; }

  // ── Score ────────────────────────────────────────
  getScoreBarClass(s: number):  string { return s >= 65 ? 'score-bar-ok'  : s >= 50 ? 'score-bar-warn'  : 'score-bar-danger'; }
  getScoreTextClass(s: number): string { return s >= 65 ? 'score-ok'      : s >= 50 ? 'score-warn'      : 'score-danger'; }

  // ── Point coloré activités ───────────────────────
  getActivityDotClass(type: string): string {
    const t = (type ?? '').toLowerCase();
    if (t.includes('collecte') || t.includes('paiement') || t.includes('valid')) return 'ok';
    if (t.includes('retard')   || t.includes('rejet')    || t.includes('conten')) return 'danger';
    if (t.includes('relance')  || t.includes('alerte'))                            return 'warn';
    return 'info';
  }

  isDirection(): boolean { return this.auth.isDirection(); }

  buildDerniersMois(): { value: string; label: string }[] {
    return Array.from({ length: 12 }, (_, i) => {
      const d = new Date(this.today.getFullYear(), this.today.getMonth() - i, 1);
      const v = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      return { value: v, label: v };
    });
  }

  getWeekNumber(d: Date): number {
    const utc = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    utc.setUTCDate(utc.getUTCDate() + 4 - (utc.getUTCDay() || 7));
    const y = new Date(Date.UTC(utc.getUTCFullYear(), 0, 1));
    return Math.ceil((((utc as any) - (y as any)) / 86400000 + 1) / 7);
  }
}