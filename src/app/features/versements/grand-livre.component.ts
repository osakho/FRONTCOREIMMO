// ══════════════════════════════════════════════════════════════════════════════
//  GRAND LIVRE PROPRIÉTAIRES
//  Compte de gestion historisé par propriété et par propriétaire.
//  Sources :
//    • GET /versements/suivi-proprietaires  → loyers bruts, commissions, net
//    • GET /charges-proprietaire/feuille    → travaux, impôts, avances, services
//    • GET /proprietaires                   → liste + coordonnées bancaires
// ══════════════════════════════════════════════════════════════════════════════

import {
  Component, inject, Injectable, OnInit, signal, computed,
  ChangeDetectionStrategy, ChangeDetectorRef
} from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin, of, Observable } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { environment } from '../../../environments/environment';
import {
  ChargesProprietaireService,
  ChargeProprietaireDto,
  TypeCharge,
  StatutCharge,
} from '../../core/services/api.services';

// Réutilise le service déjà existant dans suivi-versements.component.ts
import { ApiService } from '../../core/services/api.services';

@Injectable({ providedIn: 'root' })
class GrandLivreSuiviService extends ApiService {
  getSuivi(annee?: string): Observable<SuiviVersementsGlobalDto> {
    const url = annee
      ? `/versements/suivi-proprietaires?annee=${annee}`
      : '/versements/suivi-proprietaires';
    return this.get<SuiviVersementsGlobalDto>(url);
  }
}
import {
  SuiviVersementsGlobalDto,
  SuiviVersementProprietaireDto,
  SuiviVersementProprieteDto,
  PeriodeVersementDto,
} from '../../core/models/models';

// ── Ligne aplatie pour le grand livre ────────────────────────────────────────
export type TypeLigne =
  | 'loyer' | 'commission' | 'travaux' | 'impot'
  | 'service' | 'avance' | 'versement' | 'report';

export interface LigneGrandLivre {
  id:         string;
  date:       string;         // YYYY-MM-DD
  periode:    string;         // YYYY-MM
  type:       TypeLigne;
  libelle:    string;
  reference:  string;
  credit:     number;
  debit:      number;
  statut:     string;         // ok | wait | late | done | plan
  // meta
  proprietaireId: string;
  proprieteId:    string;
}

// ── DTO intermédiaire résumé propriété ───────────────────────────────────────
interface SommairePropriete {
  id:          string;
  libelle:     string;
  adresse:     string;
  loues:       number;
  libres:      number;
  tauxCom:     number;
  lignes:      LigneGrandLivre[];
}

// ── DTO intermédiaire résumé propriétaire ────────────────────────────────────
interface SommaireProprietaire {
  id:          string;
  nom:         string;
  telephone:   string;
  initiales:   string;
  couleur:     string;
  collecteur:  string;
  banque:      string;
  compte:      string;
  taux:        number;
  proprietes:  SommairePropriete[];
}

// ── Palette de couleurs pour les avatars ─────────────────────────────────────
const AVATAR_COLORS = [
  '#1d4ed8','#0c7a62','#7c3aed','#059669',
  '#be185d','#0891b2','#4f46e5','#d97706',
];

// ── Config visuelle par type de ligne ────────────────────────────────────────
const TX_CFG: Record<TypeLigne, { ico: string; catCls: string; lbl: string }> = {
  loyer:      { ico: '💰', catCls: 'cat-l', lbl: 'Loyer'       },
  commission: { ico: '📊', catCls: 'cat-c', lbl: 'Commission'  },
  travaux:    { ico: '🔧', catCls: 'cat-t', lbl: 'Travaux'     },
  impot:      { ico: '🏛', catCls: 'cat-i', lbl: 'Impôt/Taxe'  },
  service:    { ico: '⚙',  catCls: 'cat-s', lbl: 'Service'     },
  avance:     { ico: '💳', catCls: 'cat-v', lbl: 'Avance'      },
  versement:  { ico: '💸', catCls: 'cat-k', lbl: 'Versement'   },
  report:     { ico: '⏩', catCls: 'cat-r', lbl: 'Reporté'     },
};

const STATUT_CFG: Record<string, { cls: string; lbl: string }> = {
  ok:   { cls: 'st-ok',   lbl: '✓ Validé'      },
  wait: { cls: 'st-w',    lbl: '⏳ En attente'  },
  late: { cls: 'st-l',    lbl: '⚠ Retard'       },
  done: { cls: 'st-d',    lbl: '✓ Effectué'     },
  plan: { cls: 'st-p',    lbl: '· Planifié'     },
};

@Component({
  selector: 'kdi-grand-livre',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, DecimalPipe],
  template: `
<div class="gl-root page-enter">

  <!-- ══ HEADER ══ -->
  <div class="page-header">
    <div>
      <div class="page-eyebrow">Finance · Comptabilité</div>
      <div class="page-title"><span class="mi">menu_book</span> Grand Livre propriétaires</div>
      <div class="page-subtitle">Compte de gestion historisé · Loyers · Commissions · Travaux · Impôts · Versements</div>
    </div>
    <div class="gl-header-actions">
      <button class="btn btn-secondary" (click)="exportCSV()">
        <span class="mi">download</span> CSV
      </button>
      <button class="btn btn-gold" (click)="exportPDF()">
        <span class="mi">picture_as_pdf</span> PDF
      </button>
    </div>
  </div>

  <!-- ══ CONTROLS ══ -->
  <div class="gl-controls">
    <div class="gl-ctl-group">
      <span class="gl-ctl-label">Propriétaire</span>
      <select class="gl-sel" [(ngModel)]="filtreProprietaire" (change)="applyFilters()">
        <option value="">Tous ({{ proprietaires().length }})</option>
        <option *ngFor="let p of proprietaires()" [value]="p.id">{{ p.nom }}</option>
      </select>
    </div>
    <div class="gl-ctl-group">
      <span class="gl-ctl-label">Du</span>
      <input type="month" class="gl-inp" [(ngModel)]="filtreDu" (change)="applyFilters()">
      <span class="gl-arrow">→</span>
      <input type="month" class="gl-inp" [(ngModel)]="filtreAu" (change)="applyFilters()">
    </div>
    <div class="gl-div"></div>
    <div class="gl-ctl-group">
      <span class="gl-ctl-label">Opération</span>
      <select class="gl-sel" [(ngModel)]="filtreType" (change)="applyFilters()">
        <option value="">Toutes</option>
        <option value="loyer">💰 Loyers</option>
        <option value="commission">📊 Commissions</option>
        <option value="travaux">🔧 Travaux</option>
        <option value="impot">🏛 Impôts</option>
        <option value="service">⚙ Services</option>
        <option value="avance">💳 Avances</option>
        <option value="versement">💸 Versements</option>
      </select>
    </div>
    <div class="gl-div"></div>
    <button class="btn btn-secondary gl-btn-sm" (click)="setAll(true)">⊕ Tout ouvrir</button>
    <button class="btn btn-secondary gl-btn-sm" (click)="setAll(false)">⊖ Tout fermer</button>
    <div class="gl-div"></div>
    <div class="gl-counter"><b>{{ nbLignesFiltrees() }}</b> opération(s)</div>
  </div>

  <!-- ══ KPI STRIP ══ -->
  <div class="gl-kpis">
    <div class="gl-kpi gl-kpi-jade">
      <div class="gl-kpi-lbl">Loyers collectés</div>
      <div class="gl-kpi-val jade">{{ kLoyers() | number:'1.0-0' }}</div>
      <div class="gl-kpi-sub">MRU · période</div>
    </div>
    <div class="gl-kpi gl-kpi-gold">
      <div class="gl-kpi-lbl">Commissions agence</div>
      <div class="gl-kpi-val gold">{{ kCommissions() | number:'1.0-0' }}</div>
      <div class="gl-kpi-sub">MRU déduits</div>
    </div>
    <div class="gl-kpi gl-kpi-amth">
      <div class="gl-kpi-lbl">Travaux imputés</div>
      <div class="gl-kpi-val amth">{{ kTravaux() | number:'1.0-0' }}</div>
      <div class="gl-kpi-sub">MRU déduits</div>
    </div>
    <div class="gl-kpi gl-kpi-ruby">
      <div class="gl-kpi-lbl">Impôts & services</div>
      <div class="gl-kpi-val ruby">{{ kImpots() | number:'1.0-0' }}</div>
      <div class="gl-kpi-sub">MRU déduits</div>
    </div>
    <div class="gl-kpi gl-kpi-saph">
      <div class="gl-kpi-lbl">Versements propr.</div>
      <div class="gl-kpi-val saph">{{ kVersements() | number:'1.0-0' }}</div>
      <div class="gl-kpi-sub">MRU versés</div>
    </div>
    <div class="gl-kpi gl-kpi-nav">
      <div class="gl-kpi-lbl">Solde restant dû</div>
      <div class="gl-kpi-val" [class.jade]="kSolde() >= 0" [class.ruby]="kSolde() < 0">
        {{ kSolde() >= 0 ? '' : '−' }}{{ kSolde() | number:'1.0-0' }}
      </div>
      <div class="gl-kpi-sub">MRU à verser</div>
    </div>
  </div>

  <!-- ══ LOADING ══ -->
  <div *ngIf="loading()" class="gl-loading">
    <div class="gl-spinner"></div>
    Chargement du grand livre…
  </div>

  <!-- ══ PROPRIÉTAIRES ══ -->
  <ng-container *ngIf="!loading()">
    <div *ngFor="let p of proprietairesFiltres()" class="gl-prop-wrap">

      <!-- En-tête propriétaire -->
      <div class="gl-ph" (click)="toggleP(p.id)">
        <div class="gl-ph-av" [style.background]="p.couleur">{{ p.initiales }}</div>
        <div class="gl-ph-id">
          <div class="gl-ph-nm">{{ p.nom }}</div>
          <div class="gl-ph-mt">
            <span>{{ p.telephone }}</span>
            <span class="gl-ph-sep"></span>
            <span>Collecteur : {{ p.collecteur }}</span>
            <span class="gl-ph-sep"></span>
            <span>{{ p.proprietes.length }} propriété(s) · {{ nbLignesProp(p) }} opérations</span>
          </div>
          <div class="gl-ph-bg">
            📄 Contrat gestion · {{ p.taux }}% commission · {{ p.banque }} {{ p.compte }}
          </div>
        </div>
        <div class="gl-ph-ks">
          <div class="gl-ph-k">
            <div class="gl-ph-kl">Loyers</div>
            <div class="gl-ph-kv jade">{{ totalPropCredit(p) | number:'1.0-0' }}</div>
          </div>
          <div class="gl-ph-k">
            <div class="gl-ph-kl">Déduit</div>
            <div class="gl-ph-kv ruby">{{ totalPropDebit(p) | number:'1.0-0' }}</div>
          </div>
          <div class="gl-ph-k gl-ph-k-last">
            <div class="gl-ph-kl">Solde net</div>
            <div class="gl-ph-kv" [class.jade]="soldeProp(p)>=0" [class.ruby]="soldeProp(p)<0">
              {{ soldeProp(p) >= 0 ? '+' : '−' }}{{ soldeProp(p) | number:'1.0-0' }}
            </div>
          </div>
        </div>
        <div class="gl-ph-ch" [class.open]="isPOpen(p.id)">▶</div>
      </div>

      <!-- Propriétés -->
      <ng-container *ngIf="isPOpen(p.id)">
        <div *ngFor="let pr of p.proprietes" class="gl-ps">

          <!-- En-tête propriété -->
          <div class="gl-psh" (click)="togglePR(pr.id)">
            <div class="gl-psl">
              <span class="gl-ps-chip">{{ pr.id.slice(-3).toUpperCase() }}</span>
              <div>
                <div class="gl-ps-ti">{{ pr.libelle }}</div>
                <div class="gl-ps-ad">{{ pr.adresse }}</div>
              </div>
              <div class="gl-ps-pills">
                <span class="gl-pp gl-pp-l">🟢 {{ pr.loues }} loué(s)</span>
                <span class="gl-pp gl-pp-f" *ngIf="pr.libres > 0">⚪ {{ pr.libres }} libre(s)</span>
              </div>
            </div>
            <div class="gl-ps-st">
              <div class="gl-ps-s">
                <div class="gl-ps-sl">Collecté</div>
                <div class="gl-ps-sv sv-j">{{ totalPrCredit(pr) | number:'1.0-0' }}</div>
              </div>
              <div class="gl-ps-s">
                <div class="gl-ps-sl">Déduit</div>
                <div class="gl-ps-sv sv-r">{{ totalPrDebit(pr) | number:'1.0-0' }}</div>
              </div>
              <div class="gl-ps-s">
                <div class="gl-ps-sl">Solde</div>
                <div class="gl-ps-sv" [class.sv-j]="soldePr(pr)>=0" [class.sv-r]="soldePr(pr)<0">
                  {{ soldePr(pr) >= 0 ? '+' : '−' }}{{ soldePr(pr) | number:'1.0-0' }}
                </div>
              </div>
              <div class="gl-ps-s">
                <div class="gl-ps-sl">Opérations</div>
                <div class="gl-ps-sv">{{ lignesFiltreesPr(pr).length }}</div>
              </div>
            </div>
            <div class="gl-ps-ch" [class.open]="isPROpen(pr.id)">▶</div>
          </div>

          <!-- Tableau grand livre -->
          <div *ngIf="isPROpen(pr.id)" class="gl-tw">
            <table class="gl-t">
              <thead>
                <tr>
                  <th style="width:88px">Date</th>
                  <th style="width:78px">Période</th>
                  <th>Opération</th>
                  <th class="ac" style="width:100px">Catégorie</th>
                  <th class="ar" style="width:112px">Crédit MRU</th>
                  <th class="ar" style="width:112px">Débit MRU</th>
                  <th class="ar" style="width:120px">Solde cumulatif</th>
                  <th class="ac" style="width:98px">Statut</th>
                </tr>
              </thead>
              <tbody>
                <ng-container *ngFor="let grp of groupedByPeriod(lignesFiltreesPr(pr)); let gi = index">
                  <tr class="gl-rph">
                    <td colspan="8">── {{ formatPeriode(grp.periode) }}</td>
                  </tr>
                  <tr *ngFor="let l of grp.lignes">
                    <td><span class="gl-mono gl-sl2">{{ formatDate(l.date) }}</span></td>
                    <td><span class="gl-per">{{ formatPeriode(l.periode) }}</span></td>
                    <td>
                      <div class="gl-txc">
                        <div class="gl-ti" [ngClass]="txIcoCls(l.type)">{{ txIco(l.type) }}</div>
                        <div>
                          <div class="gl-txn">{{ l.libelle }}</div>
                          <div class="gl-txr">{{ l.reference }}</div>
                        </div>
                      </div>
                    </td>
                    <td class="ac">
                      <span class="gl-cat" [ngClass]="txCatCls(l.type)">{{ txLbl(l.type) }}</span>
                    </td>
                    <td class="ar">
                      <span *ngIf="l.credit > 0" class="gl-cr">{{ l.credit | number:'1.0-0' }}</span>
                      <span *ngIf="l.credit === 0" class="gl-neu">—</span>
                    </td>
                    <td class="ar">
                      <span *ngIf="l.debit > 0" class="gl-db">{{ l.debit | number:'1.0-0' }}</span>
                      <span *ngIf="l.debit === 0" class="gl-neu">—</span>
                    </td>
                    <td class="ar">
                      <span [class.gl-sp]="l.cumulatif >= 0" [class.gl-sn]="l.cumulatif < 0">
                        {{ l.cumulatif >= 0 ? '+' : '−' }}{{ l.cumulatif | number:'1.0-0' }}
                      </span>
                    </td>
                    <td class="ac">
                      <span class="gl-st" [ngClass]="stCls(l.statut)">{{ stLbl(l.statut) }}</span>
                    </td>
                  </tr>
                </ng-container>

                <!-- Sous-total propriété -->
                <tr class="gl-rsu" *ngIf="lignesFiltreesPr(pr).length > 0">
                  <td colspan="4">
                    <div class="gl-sub-lbl">
                      <div class="gl-sub-ico">∑</div>
                      Sous-total — {{ pr.libelle }}
                    </div>
                  </td>
                  <td class="ar"><span class="gl-cr fw7">{{ totalPrCredit(pr) | number:'1.0-0' }}</span></td>
                  <td class="ar"><span class="gl-db fw7">{{ totalPrDebit(pr)  | number:'1.0-0' }}</span></td>
                  <td class="ar">
                    <span [class.gl-sp]="soldePr(pr)>=0" [class.gl-sn]="soldePr(pr)<0" class="fw7">
                      {{ soldePr(pr) >= 0 ? '+' : '−' }}{{ soldePr(pr) | number:'1.0-0' }}
                    </span>
                  </td>
                  <td></td>
                </tr>
                <tr *ngIf="lignesFiltreesPr(pr).length === 0">
                  <td colspan="8" class="gl-emp">Aucune opération pour ce filtre.</td>
                </tr>
              </tbody>
            </table>
          </div>

        </div><!-- /proprietes -->

        <!-- Total global propriétaire -->
        <div class="gl-tot-wrap">
          <table class="gl-t">
            <tbody>
              <tr class="gl-rto">
                <td colspan="2">
                  <div class="gl-tot-lbl">
                    ⊕ Total — <span class="gl-tot-bg">{{ p.nom }}</span>
                  </div>
                </td>
                <td colspan="2">
                  <div class="gl-tot-det">
                    <span>Loyers <b class="jade">{{ totalPropCredit(p) | number:'1.0-0' }}</b></span>
                    <span>Commission <b class="ruby">{{ totalCatProp(p,'commission') | number:'1.0-0' }}</b></span>
                    <span>Travaux <b class="amth">{{ totalCatProp(p,'travaux') | number:'1.0-0' }}</b></span>
                    <span>Impôts <b class="ruby">{{ totalCatProp(p,'impot') | number:'1.0-0' }}</b></span>
                    <span>Services <b class="saph">{{ totalCatProp(p,'service') | number:'1.0-0' }}</b></span>
                    <span>Avances <b class="ambr">{{ totalCatProp(p,'avance') | number:'1.0-0' }}</b></span>
                    <span>Versés <b class="slate">{{ totalCatProp(p,'versement') | number:'1.0-0' }}</b></span>
                  </div>
                </td>
                <td class="ar"><span class="gl-tv tv-j">{{ totalPropCredit(p) | number:'1.0-0' }}</span></td>
                <td class="ar"><span class="gl-tv tv-r">{{ totalPropDebit(p)  | number:'1.0-0' }}</span></td>
                <td class="ar">
                  <span class="gl-tv" [class.tv-j]="soldeProp(p)>=0" [class.tv-r]="soldeProp(p)<0" style="font-size:15px">
                    {{ soldeProp(p) >= 0 ? '+' : '−' }}{{ soldeProp(p) | number:'1.0-0' }}
                  </span>
                </td>
                <td></td>
              </tr>
            </tbody>
          </table>
        </div>

      </ng-container>
    </div><!-- /proprietaires -->

    <div *ngIf="proprietairesFiltres().length === 0" class="gl-empty-page">
      <div class="gl-empty-ico">📋</div>
      <div>Aucune donnée pour cette sélection.</div>
    </div>
  </ng-container>

</div>
  `,
  styles: [`
    /* ── Variables ── */
    .gl-root {
      --jade:#0c7a62; --jade-bg:#e6f7f2;
      --gold:#c8982a; --gold-bg:#fdf7e8; --gold-line:#f0dfa0;
      --ruby:#c02840; --ruby-bg:#fdeaed;
      --saph:#1a52a8; --saph-bg:#e8f0fb;
      --amth:#6a30a0; --amth-bg:#f0e8fb;
      --ambr:#b85a08; --ambr-bg:#fef0e0;
      --navy:#08152a; --navy2:#0f2240;
      --sl:#3d5570; --sl2:#6a8aaa; --sl3:#9ab0c8;
      --bdr:#d8e4f0; --bdr2:#eaf0f8;
      --sf:#f2f6fc; --sf2:#f8fafd;
    }

    /* ── Header ── */
    .page-header { display:flex; align-items:flex-start; justify-content:space-between; margin-bottom:22px; }
    .page-eyebrow { font-size:11px; font-weight:600; color:#c9a84c; text-transform:uppercase; letter-spacing:.8px; margin-bottom:3px; }
    .page-title { font-size:24px; font-weight:800; color:#0e1c38; display:flex; align-items:center; gap:8px; }
    .page-subtitle { font-size:13px; color:#64748b; margin-top:3px; }
    .gl-header-actions { display:flex; gap:8px; }

    /* ── Controls ── */
    .gl-controls { background:#fff; border:1px solid var(--bdr); border-radius:10px; padding:10px 16px; display:flex; align-items:center; gap:10px; flex-wrap:wrap; margin-bottom:16px; box-shadow:0 2px 8px rgba(8,21,42,.05); }
    .gl-ctl-group { display:flex; align-items:center; gap:6px; }
    .gl-ctl-label { font-size:10px; font-weight:600; color:var(--sl2); text-transform:uppercase; letter-spacing:.7px; }
    .gl-sel, .gl-inp { height:32px; padding:0 10px; border:1px solid var(--bdr); border-radius:7px; font-family:inherit; font-size:12px; color:#0e1c38; background:var(--sf2); outline:none; cursor:pointer; transition:border-color .15s; }
    .gl-sel:focus, .gl-inp:focus { border-color:#c9a84c; background:#fff; }
    .gl-inp { width:134px; }
    .gl-arrow { color:var(--sl2); font-size:11px; }
    .gl-div { width:1px; height:22px; background:var(--bdr); }
    .gl-btn-sm { height:32px; padding:0 12px; font-size:12px; }
    .gl-counter { font-size:11px; color:var(--sl2); background:var(--sf); border:1px solid var(--bdr); border-radius:20px; padding:3px 10px; }
    .gl-counter b { color:#0e1c38; }

    /* ── KPIs ── */
    .gl-kpis { display:grid; grid-template-columns:repeat(6,1fr); border:1px solid var(--bdr); border-radius:10px; overflow:hidden; margin-bottom:20px; box-shadow:0 2px 8px rgba(8,21,42,.05); }
    .gl-kpi { background:#fff; padding:13px 16px; border-right:1px solid var(--bdr2); position:relative; overflow:hidden; }
    .gl-kpi:last-child { border-right:none; }
    .gl-kpi::before { content:''; position:absolute; left:0; top:0; bottom:0; width:3px; }
    .gl-kpi-jade::before  { background:var(--jade); }
    .gl-kpi-gold::before  { background:var(--gold); }
    .gl-kpi-amth::before  { background:var(--amth); }
    .gl-kpi-ruby::before  { background:var(--ruby); }
    .gl-kpi-saph::before  { background:var(--saph); }
    .gl-kpi-nav::before   { background:var(--navy); }
    .gl-kpi-lbl { font-size:10px; font-weight:600; color:var(--sl2); text-transform:uppercase; letter-spacing:.6px; margin-bottom:3px; }
    .gl-kpi-val { font-family:monospace; font-size:17px; font-weight:600; }
    .gl-kpi-val.jade { color:var(--jade); }
    .gl-kpi-val.gold { color:var(--gold); }
    .gl-kpi-val.amth { color:var(--amth); }
    .gl-kpi-val.ruby { color:var(--ruby); }
    .gl-kpi-val.saph { color:var(--saph); }
    .gl-kpi-sub { font-size:10px; color:var(--sl3); margin-top:2px; }

    /* ── Loading ── */
    .gl-loading { display:flex; align-items:center; gap:10px; padding:60px; justify-content:center; color:var(--sl2); }
    .gl-spinner { width:20px; height:20px; border:2px solid var(--bdr); border-top-color:var(--navy); border-radius:50%; animation:spin .7s linear infinite; }
    @keyframes spin { to { transform:rotate(360deg); } }

    /* ── Propriétaire ── */
    .gl-prop-wrap { margin-bottom:22px; border-radius:14px; overflow:hidden; border:1px solid var(--bdr); box-shadow:0 4px 18px rgba(8,21,42,.07); }
    .gl-ph { background:linear-gradient(120deg,var(--navy),var(--navy2) 55%,#152e58); padding:16px 20px; display:flex; align-items:center; gap:14px; cursor:pointer; user-select:none; position:relative; overflow:hidden; }
    .gl-ph::after { content:''; position:absolute; right:-30px; top:-30px; width:150px; height:150px; border-radius:50%; background:radial-gradient(circle,rgba(200,152,42,.08),transparent 70%); pointer-events:none; }
    .gl-ph-av { width:42px; height:42px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-weight:700; font-size:15px; color:var(--navy); flex-shrink:0; border:2px solid rgba(228,185,74,.25); }
    .gl-ph-id { flex:1; min-width:0; position:relative; z-index:1; }
    .gl-ph-nm { font-size:16px; font-weight:700; color:#fff; line-height:1.2; }
    .gl-ph-mt { display:flex; align-items:center; gap:8px; margin-top:2px; flex-wrap:wrap; font-size:11px; color:rgba(255,255,255,.4); }
    .gl-ph-sep { width:3px; height:3px; border-radius:50%; background:rgba(255,255,255,.2); }
    .gl-ph-bg { display:inline-flex; align-items:center; background:rgba(200,152,42,.15); color:#e4b94a; border:1px solid rgba(200,152,42,.2); border-radius:20px; padding:2px 9px; font-size:10px; font-weight:600; margin-top:5px; }
    .gl-ph-ks { display:flex; align-items:stretch; flex-shrink:0; position:relative; z-index:1; }
    .gl-ph-k { padding:6px 14px; text-align:right; border-left:1px solid rgba(255,255,255,.08); }
    .gl-ph-k-last { border-right:1px solid rgba(255,255,255,.08); padding-right:16px; }
    .gl-ph-kl { font-size:9px; color:rgba(255,255,255,.3); text-transform:uppercase; letter-spacing:.5px; }
    .gl-ph-kv { font-family:monospace; font-size:13px; font-weight:600; margin-top:2px; }
    .gl-ph-kv.jade { color:#5ecab2; } .gl-ph-kv.ruby { color:#f08090; } .gl-ph-kv.gold { color:#e4b94a; }
    .gl-ph-ch { color:rgba(255,255,255,.3); font-size:10px; transition:transform .25s; margin-left:6px; flex-shrink:0; }
    .gl-ph-ch.open { transform:rotate(90deg); }

    /* ── Propriété ── */
    .gl-ps { border-top:1px solid var(--bdr2); background:#fff; }
    .gl-psh { padding:10px 20px; background:var(--sf2); display:flex; align-items:center; justify-content:space-between; gap:12px; cursor:pointer; border-bottom:1px solid var(--bdr2); transition:background .1s; }
    .gl-psh:hover { background:#ecf2fa; }
    .gl-psl { display:flex; align-items:center; gap:10px; flex:1; min-width:0; }
    .gl-ps-chip { background:var(--navy); color:#e4b94a; font-family:monospace; font-size:10px; font-weight:500; padding:2px 8px; border-radius:5px; flex-shrink:0; }
    .gl-ps-ti { font-size:13px; font-weight:600; color:#0e1c38; }
    .gl-ps-ad { font-size:11px; color:var(--sl2); }
    .gl-ps-pills { display:flex; gap:4px; }
    .gl-pp { font-size:10px; font-weight:600; padding:2px 8px; border-radius:20px; white-space:nowrap; }
    .gl-pp-l { background:var(--jade-bg); color:var(--jade); }
    .gl-pp-f { background:var(--sf); color:var(--sl); border:1px solid var(--bdr); }
    .gl-ps-st { display:flex; gap:18px; align-items:center; flex-shrink:0; }
    .gl-ps-s { text-align:right; }
    .gl-ps-sl { font-size:9px; color:var(--sl3); text-transform:uppercase; letter-spacing:.4px; }
    .gl-ps-sv { font-family:monospace; font-size:13px; font-weight:600; margin-top:1px; }
    .sv-j { color:var(--jade); } .sv-r { color:var(--ruby); }
    .gl-ps-ch { font-size:10px; color:var(--sl3); transition:transform .2s; }
    .gl-ps-ch.open { transform:rotate(90deg); }

    /* ── Table ── */
    .gl-tw { overflow-x:auto; }
    .gl-t { width:100%; border-collapse:collapse; font-size:12px; }
    .gl-t thead tr { background:#eef3fa; }
    .gl-t th { padding:7px 12px; font-size:9px; font-weight:700; color:var(--sl); text-transform:uppercase; letter-spacing:.55px; text-align:left; white-space:nowrap; border-bottom:2px solid var(--bdr); border-right:1px solid var(--bdr2); }
    .gl-t th:last-child { border-right:none; }
    .gl-t th.ac { text-align:center; } .gl-t th.ar { text-align:right; }
    .gl-t tbody tr { border-bottom:1px solid var(--bdr2); transition:background .08s; }
    .gl-t tbody tr:hover { background:#f5f9ff; }
    .gl-t td { padding:9px 12px; vertical-align:middle; border-right:1px solid var(--bdr2); }
    .gl-t td:last-child { border-right:none; }
    .gl-t td.ac { text-align:center; } .gl-t td.ar { text-align:right; font-family:monospace; }
    .gl-rph { background:#f2f7ff !important; cursor:default !important; }
    .gl-rph td { padding:5px 12px !important; font-size:10px; font-weight:700; color:var(--saph); text-transform:uppercase; letter-spacing:.6px; border-bottom:1px solid var(--bdr) !important; }
    .gl-rsu { background:var(--jade-bg) !important; border-top:1px solid rgba(12,122,98,.15) !important; border-bottom:2px solid rgba(12,122,98,.1) !important; }
    .gl-rto { background:linear-gradient(to right,var(--gold-bg),#fffdf5) !important; border-top:2px solid var(--gold-line) !important; border-bottom:3px solid var(--gold-line) !important; }

    /* TX cells */
    .gl-ti { width:28px; height:28px; border-radius:7px; display:inline-flex; align-items:center; justify-content:center; font-size:13px; flex-shrink:0; }
    .ti-l { background:var(--jade-bg); } .ti-c { background:var(--gold-bg); } .ti-t { background:var(--amth-bg); }
    .ti-i { background:var(--ruby-bg); } .ti-s { background:var(--saph-bg); } .ti-v { background:var(--ambr-bg); }
    .ti-k { background:var(--sf); border:1px solid var(--bdr); } .ti-r { background:var(--sf); }
    .gl-txc { display:flex; align-items:center; gap:8px; }
    .gl-txn { font-weight:500; color:#0e1c38; }
    .gl-txr { font-family:monospace; font-size:10px; color:var(--sl3); margin-top:1px; }
    .gl-cr  { color:var(--jade); font-weight:600; }
    .gl-db  { color:var(--ruby); font-weight:600; }
    .gl-neu { color:var(--sl3); }
    .gl-sp  { color:var(--jade); font-weight:600; }
    .gl-sn  { color:var(--ruby); font-weight:600; }
    .gl-mono { font-family:monospace; }
    .gl-sl2  { color:var(--sl2); font-size:11px; }

    /* CAT tags */
    .gl-cat { font-size:10px; padding:2px 8px; border-radius:20px; white-space:nowrap; background:var(--sf); border:1px solid var(--bdr); color:var(--sl); }
    .cat-l { background:var(--jade-bg); border-color:var(--jade-bg); color:var(--jade); }
    .cat-c { background:var(--gold-bg); border-color:var(--gold-line); color:var(--gold); }
    .cat-t { background:var(--amth-bg); border-color:var(--amth-bg); color:var(--amth); }
    .cat-i { background:var(--ruby-bg); border-color:var(--ruby-bg); color:var(--ruby); }
    .cat-s { background:var(--saph-bg); border-color:var(--saph-bg); color:var(--saph); }
    .cat-v { background:var(--ambr-bg); border-color:var(--ambr-bg); color:var(--ambr); }
    .cat-k { background:var(--sf); border-color:var(--bdr); color:var(--sl); }
    .cat-r { background:var(--sf); border-color:var(--bdr); color:var(--sl2); }

    /* Status */
    .gl-st { display:inline-block; padding:2px 8px; border-radius:20px; font-size:10px; font-weight:600; white-space:nowrap; }
    .st-ok { background:var(--jade-bg); color:var(--jade); }
    .st-w  { background:#fef9e5; color:#8a6018; }
    .st-l  { background:var(--ruby-bg); color:var(--ruby); }
    .st-d  { background:#e8f5e8; color:#1a6a2a; }
    .st-p  { background:var(--sf); color:var(--sl); border:1px solid var(--bdr); }

    /* Period */
    .gl-per { font-family:monospace; font-size:10px; font-weight:500; background:var(--sf); color:var(--sl); border:1px solid var(--bdr); border-radius:5px; padding:2px 7px; white-space:nowrap; }

    /* Sub/Tot labels */
    .gl-sub-lbl { font-size:11px; font-weight:700; color:var(--jade); text-transform:uppercase; letter-spacing:.5px; display:flex; align-items:center; gap:6px; }
    .gl-sub-ico { width:18px; height:18px; border-radius:4px; background:var(--jade-bg); display:inline-flex; align-items:center; justify-content:center; font-size:10px; }
    .gl-tot-wrap { border-top:2px solid var(--gold-line); }
    .gl-tot-lbl { font-size:12px; font-weight:800; color:var(--gold); text-transform:uppercase; letter-spacing:.6px; display:flex; align-items:center; gap:8px; }
    .gl-tot-bg { background:var(--navy); color:#e4b94a; font-size:9px; padding:2px 7px; border-radius:20px; font-weight:600; }
    .gl-tot-det { display:flex; gap:12px; flex-wrap:wrap; font-size:10px; color:var(--sl); }
    .gl-tot-det b { font-family:monospace; font-weight:700; margin-left:3px; }
    .gl-tv { font-family:monospace; font-size:14px; font-weight:700; }
    .tv-j { color:var(--jade); } .tv-r { color:var(--ruby); } .tv-g { color:var(--gold); }
    b.jade { color:var(--jade); } b.ruby { color:var(--ruby); } b.amth { color:var(--amth); }
    b.saph { color:var(--saph); } b.ambr { color:var(--ambr); } b.slate { color:var(--sl); }

    .gl-emp { padding:28px !important; text-align:center !important; color:var(--sl3) !important; font-style:italic; }
    .fw7 { font-weight:700; }
    .gl-empty-page { padding:60px; text-align:center; color:var(--sl2); }
    .gl-empty-ico { font-size:36px; opacity:.2; margin-bottom:8px; }
  `]
})
export class GrandLivreComponent implements OnInit {
  private suiviSvc = inject(GrandLivreSuiviService);
  private chgSvc   = inject(ChargesProprietaireService);
  private cd       = inject(ChangeDetectorRef);
  private base     = environment.apiUrl;

  loading      = signal(true);
  private _props = signal<SommaireProprietaire[]>([]);

  // ── Filtres ───────────────────────────────────────────────────────────────
  filtreProprietaire = '';
  filtreDu   = new Date().toISOString().slice(0, 7).replace('-', '-').split('-').slice(0,2).join('-');
  filtreAu   = new Date().toISOString().slice(0, 7);
  filtreType = '';

  private openProps    = new Set<string>();
  private openProprietes = new Set<string>();

  // ── Liste pour le sélecteur ───────────────────────────────────────────────
  proprietaires = computed(() => this._props().map(p => ({ id: p.id, nom: p.nom })));

  ngOnInit() {
    // Initialiser filtreDu 3 mois en arrière
    const d = new Date();
    d.setMonth(d.getMonth() - 2);
    this.filtreDu = d.toISOString().slice(0, 7);
    this.charger();
  }

  charger() {
    this.loading.set(true);

    // Un seul appel global (même pattern que suivi-versements.component.ts)
    const annee = this.filtreAu ? this.filtreAu.slice(0, 4) : undefined;

    this.suiviSvc.getSuivi(annee).pipe(
      catchError(() => of(null))
    ).subscribe({
      next: global => {
        if (!global?.proprietaires?.length) {
          this._props.set([]);
          this.loading.set(false);
          this.cd.markForCheck();
          return;
        }

        // Charger les charges approuvées pour chaque propriétaire en parallèle
        const chargeReqs = global.proprietaires.map(p =>
          this.chgSvc.getFeuille(p.proprietaireId, this.filtreAu)
            .pipe(catchError(() => of(null)))
        );

        forkJoin(chargeReqs).pipe(
          catchError(() => of(global.proprietaires.map(() => null)))
        ).subscribe({
          next: chargesArray => {
            const props = global.proprietaires.map((p, i) =>
              this.buildSommaireFromDto(p, chargesArray[i], i)
            );
            this._props.set(props);
            props.forEach(p => {
              this.openProps.add(p.id);
              p.proprietes.forEach(pr => this.openProprietes.add(pr.id));
            });
            this.loading.set(false);
            this.cd.markForCheck();
          },
          error: () => { this.loading.set(false); this.cd.markForCheck(); }
        });
      },
      error: () => { this.loading.set(false); this.cd.markForCheck(); }
    });
  }

  // ── Construction depuis SuiviVersementProprietaireDto (appel global) ─────
  private buildSommaireFromDto(
    dto:     SuiviVersementProprietaireDto,
    charges: any | null,
    idx:     number
  ): SommaireProprietaire {
    const color = AVATAR_COLORS[idx % AVATAR_COLORS.length];
    const ini   = dto.proprietaireNom
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map(s => s[0])
      .join('')
      .toUpperCase();

    const taux = dto.proprietes[0]?.tauxCommission ?? 10;

    // Infos banque depuis FeuilleChargesDto si disponible
    const banque  = charges?.charges?.[0] ? '—' : '—';   // à enrichir si le backend retourne les coords
    const compte  = '—';
    const coll    = 'Voir contrat';

    const proprietes: SommairePropriete[] = dto.proprietes.map(pr => ({
      id:      pr.proprieteId,
      libelle: pr.proprieteLibelle,
      adresse: pr.proprieteAdresse ?? '',
      loues:   pr.nbProduitsLoues,
      libres:  pr.nbProduitsVacants,
      tauxCom: pr.tauxCommission,
      lignes:  this.buildLignes(pr, dto.proprietaireId, charges),
    }));

    return {
      id:         dto.proprietaireId,
      nom:        dto.proprietaireNom,
      telephone:  dto.proprietaireTel,
      initiales:  ini,
      couleur:    color,
      collecteur: coll,
      banque,
      compte,
      taux,
      proprietes,
    };
  }

  // ── Conversion PeriodeVersementDto + ChargesProprietaireDto → LigneGrandLivre[] ──
  private buildLignes(
    pr:      SuiviVersementProprieteDto,
    propId:  string,
    charges: any | null
  ): LigneGrandLivre[] {
    const lignes: LigneGrandLivre[] = [];

    pr.periodes.forEach((p, pi) => {
      const perDate = p.datePrevue?.slice(0, 10) ?? p.moisConcernes?.[0] ?? '2026-01-01';
      const mois    = p.moisConcernes?.[0] ?? p.periodeId ?? perDate.slice(0, 7);

      // Loyers encaissés (montantBrut)
      if (p.montantBrut > 0) {
        p.lignes.forEach((l, li) => {
          if (l.montantEncaisse > 0) {
            lignes.push({
              id: `${pr.proprieteId}-${pi}-loyer-${li}`,
              date: perDate, periode: mois,
              type: 'loyer',
              libelle: `Loyer encaissé — ${l.produitCode}`,
              reference: `COL-${mois}-${String(li+1).padStart(3,'0')}`,
              credit: l.montantEncaisse, debit: 0,
              statut: this.periodeToStatut(p.statut),
              proprietaireId: propId, proprieteId: pr.proprieteId,
              cumulatif: 0,
            } as any);
          }
        });
      }

      // Commission agence
      if (p.commission > 0) {
        lignes.push({
          id: `${pr.proprieteId}-${pi}-com`,
          date: perDate, periode: mois,
          type: 'commission',
          libelle: `Commission agence ${Math.round(pr.tauxCommission * 100)}% — ${mois}`,
          reference: `COM-${mois}-${String(pi+1).padStart(3,'0')}`,
          credit: 0, debit: p.commission,
          statut: 'done',
          proprietaireId: propId, proprieteId: pr.proprieteId,
          cumulatif: 0,
        } as any);
      }

      // Retenue travaux
      if (p.retenueTravaux > 0) {
        lignes.push({
          id: `${pr.proprieteId}-${pi}-trav`,
          date: perDate, periode: mois,
          type: 'travaux',
          libelle: `Retenue travaux — ${mois}`,
          reference: `TRAV-${mois}-${String(pi+1).padStart(3,'0')}`,
          credit: 0, debit: p.retenueTravaux,
          statut: 'done',
          proprietaireId: propId, proprieteId: pr.proprieteId,
          cumulatif: 0,
        } as any);
      }

      // Retenue avance
      if (p.retenueAvance > 0) {
        lignes.push({
          id: `${pr.proprieteId}-${pi}-av`,
          date: perDate, periode: mois,
          type: 'avance',
          libelle: `Remboursement avance — ${mois}`,
          reference: `AV-${mois}-${String(pi+1).padStart(3,'0')}`,
          credit: 0, debit: p.retenueAvance,
          statut: 'done',
          proprietaireId: propId, proprieteId: pr.proprieteId,
          cumulatif: 0,
        } as any);
      }

      // Versement effectué
      if (p.statut === 'Effectue' && p.montantNet > 0) {
        lignes.push({
          id: `${pr.proprieteId}-${pi}-vers`,
          date: p.dateEffective?.slice(0, 10) ?? perDate,
          periode: mois, type: 'versement',
          libelle: `Versement propriétaire — ${mois}`,
          reference: p.reference ?? `VRS-${mois}-${String(pi+1).padStart(3,'0')}`,
          credit: 0, debit: p.montantNet,
          statut: 'done',
          proprietaireId: propId, proprieteId: pr.proprieteId,
          cumulatif: 0,
        } as any);
      }
    });

    // Charges supplémentaires (impôts, services…) depuis FeuilleChargesDto
    if (charges?.charges) {
      (charges.charges as ChargeProprietaireDto[])
        .filter(c => c.statut === 'Approuvee')
        .forEach((c, ci) => {
          const type = this.chargeTypeToLigne(c.type);
          lignes.push({
            id: `charge-${c.id}`,
            date: c.creeLe?.slice(0, 10) ?? c.periodeMois ?? '2026-01-01',
            periode: c.periodeMois ?? c.creeLe?.slice(0, 7) ?? '2026-01',
            type,
            libelle: c.libelle,
            reference: c.reference ?? `CHG-${ci+1}`,
            credit: 0, debit: c.montant,
            statut: 'done',
            proprietaireId: propId, proprieteId: '',
            cumulatif: 0,
          } as any);
        });
    }

    // Trier par date puis recalculer cumulatif
    lignes.sort((a, b) => a.date.localeCompare(b.date));
    let cumul = 0;
    lignes.forEach(l => {
      cumul += (l.credit || 0) - (l.debit || 0);
      (l as any).cumulatif = cumul;
    });

    return lignes;
  }

  private periodeToStatut(s: string): string {
    switch (s) {
      case 'Effectue': return 'done';
      case 'EnAttente': return 'wait';
      case 'EnRetard': return 'late';
      case 'Planifie': return 'plan';
      default: return 'ok';
    }
  }

  private chargeTypeToLigne(t: TypeCharge): TypeLigne {
    switch (t) {
      case 'Impot':   return 'impot';
      case 'Travaux': return 'travaux';
      case 'Avance':  return 'avance';
      default:        return 'service';
    }
  }

  // ── Filtrage ──────────────────────────────────────────────────────────────
  private filtreLignes(lignes: LigneGrandLivre[]): (LigneGrandLivre & { cumulatif: number })[] {
    const filtered = lignes.filter(l => {
      if (this.filtreDu && l.periode < this.filtreDu) return false;
      if (this.filtreAu && l.periode > this.filtreAu) return false;
      if (this.filtreType && l.type !== this.filtreType) return false;
      return true;
    });
    // Recalcul du cumulatif sur les lignes filtrées
    let cumul = 0;
    return filtered.map(l => {
      cumul += l.credit - l.debit;
      return { ...l, cumulatif: cumul };
    });
  }

  proprietairesFiltres(): SommaireProprietaire[] {
    const all = this._props();
    return this.filtreProprietaire
      ? all.filter(p => p.id === this.filtreProprietaire)
      : all;
  }

  lignesFiltreesPr(pr: SommairePropriete): (LigneGrandLivre & { cumulatif: number })[] {
    return this.filtreLignes(pr.lignes);
  }

  // ── Computed KPIs ─────────────────────────────────────────────────────────
  private allLignesFiltrees = computed(() => {
    return this.proprietairesFiltres()
      .flatMap(p => p.proprietes.flatMap(pr => this.filtreLignes(pr.lignes)));
  });

  kLoyers      = computed(() => this.allLignesFiltrees().filter(l => l.type === 'loyer').reduce((s, l) => s + l.credit, 0));
  kCommissions = computed(() => this.allLignesFiltrees().filter(l => l.type === 'commission').reduce((s, l) => s + l.debit, 0));
  kTravaux     = computed(() => this.allLignesFiltrees().filter(l => l.type === 'travaux').reduce((s, l) => s + l.debit, 0));
  kImpots      = computed(() => this.allLignesFiltrees().filter(l => ['impot','service'].includes(l.type)).reduce((s, l) => s + l.debit, 0));
  kVersements  = computed(() => this.allLignesFiltrees().filter(l => l.type === 'versement').reduce((s, l) => s + l.debit, 0));
  kSolde       = computed(() => this.kLoyers() - this.kCommissions() - this.kTravaux() - this.kImpots() - this.kVersements());

  nbLignesFiltrees = computed(() => this.allLignesFiltrees().length);

  // ── Totaux par propriétaire / propriété ───────────────────────────────────
  nbLignesProp(p: SommaireProprietaire): number {
    return p.proprietes.reduce((s, pr) => s + this.lignesFiltreesPr(pr).length, 0);
  }
  totalPropCredit(p: SommaireProprietaire): number {
    return p.proprietes.reduce((s, pr) => s + this.lignesFiltreesPr(pr).reduce((ss, l) => ss + l.credit, 0), 0);
  }
  totalPropDebit(p: SommaireProprietaire): number {
    return p.proprietes.reduce((s, pr) => s + this.lignesFiltreesPr(pr).reduce((ss, l) => ss + l.debit, 0), 0);
  }
  soldeProp(p: SommaireProprietaire): number { return this.totalPropCredit(p) - this.totalPropDebit(p); }
  totalCatProp(p: SommaireProprietaire, type: string): number {
    return p.proprietes.reduce((s, pr) =>
      s + this.lignesFiltreesPr(pr).filter(l => l.type === type).reduce((ss, l) => ss + l.debit, 0), 0);
  }
  totalPrCredit(pr: SommairePropriete): number { return this.lignesFiltreesPr(pr).reduce((s, l) => s + l.credit, 0); }
  totalPrDebit(pr: SommairePropriete):  number { return this.lignesFiltreesPr(pr).reduce((s, l) => s + l.debit,  0); }
  soldePr(pr: SommairePropriete): number { return this.totalPrCredit(pr) - this.totalPrDebit(pr); }

  // ── Grouper par période ───────────────────────────────────────────────────
  groupedByPeriod(lignes: (LigneGrandLivre & { cumulatif: number })[]) {
    const map = new Map<string, (LigneGrandLivre & { cumulatif: number })[]>();
    lignes.forEach(l => {
      if (!map.has(l.periode)) map.set(l.periode, []);
      map.get(l.periode)!.push(l);
    });
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b))
      .map(([periode, lignes]) => ({ periode, lignes }));
  }

  // ── Toggles ───────────────────────────────────────────────────────────────
  isPOpen(id: string):  boolean { return this.openProps.has(id); }
  isPROpen(id: string): boolean { return this.openProprietes.has(id); }
  toggleP(id: string)  { this.openProps.has(id) ? this.openProps.delete(id) : this.openProps.add(id); }
  togglePR(id: string) { this.openProprietes.has(id) ? this.openProprietes.delete(id) : this.openProprietes.add(id); }
  setAll(open: boolean) {
    this._props().forEach(p => {
      open ? this.openProps.add(p.id) : this.openProps.delete(p.id);
      p.proprietes.forEach(pr => open ? this.openProprietes.add(pr.id) : this.openProprietes.delete(pr.id));
    });
  }

  applyFilters() { /* Les computed se réévaluent automatiquement */ }

  // ── Helpers visuels ───────────────────────────────────────────────────────
  txIco(t: TypeLigne): string     { return TX_CFG[t]?.ico    ?? '·'; }
  txIcoCls(t: TypeLigne): string  {
    const m: Record<TypeLigne, string> = {
      loyer:'ti-l', commission:'ti-c', travaux:'ti-t', impot:'ti-i',
      service:'ti-s', avance:'ti-v', versement:'ti-k', report:'ti-r',
    };
    return m[t] ?? 'ti-r';
  }
  txCatCls(t: TypeLigne): string  { return TX_CFG[t]?.catCls ?? ''; }
  txLbl(t: TypeLigne): string     { return TX_CFG[t]?.lbl    ?? t; }
  stCls(s: string): string { return STATUT_CFG[s]?.cls ?? 'st-p'; }
  stLbl(s: string): string { return STATUT_CFG[s]?.lbl ?? s; }

  formatDate(d: string): string {
    if (!d) return '—';
    const [y, m, j] = d.split('-');
    return `${j}/${m}/${y}`;
  }
  formatPeriode(p: string): string {
    if (!p) return '—';
    const [y, mo] = p.split('-');
    const noms = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'];
    return (noms[parseInt(mo, 10) - 1] ?? mo) + ' ' + y;
  }

  // ── Export ────────────────────────────────────────────────────────────────
  exportCSV() {
    const lignes = this.allLignesFiltrees();
    const rows = [
      ['Date','Période','Type','Libellé','Référence','Crédit','Débit','Statut'],
      ...lignes.map(l => [l.date, l.periode, l.type, l.libelle, l.reference, l.credit, l.debit, l.statut])
    ];
    const csv = rows.map(r => r.join(';')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = `grand-livre-${this.filtreAu}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  exportPDF() {
    window.open(`${this.base}/grand-livre/export?du=${this.filtreDu}&au=${this.filtreAu}`, '_blank');
  }
}