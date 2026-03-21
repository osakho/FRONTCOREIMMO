// ══════════════════════════════════════════════════════════════════════════════
//  BORDEREAU DE VERSEMENTS
//  Export PDF (jsPDF + autoTable) + Excel (ExcelJS) côté client
//  Source de données : SuiviVersementsService (suivi propriétaires)
//  + ProprietairesService (comptes bancaires & plateformes)
// ══════════════════════════════════════════════════════════════════════════════

import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Injectable } from '@angular/core';
import { Observable, forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { ApiService, ProprietairesService, AuthService } from '../../core/services/api.services';
import {
  SuiviVersementsGlobalDto,
  SuiviVersementProprietaireDto,
  SuiviVersementProprieteDto,
  PeriodeVersementDto,
  ProprietaireDto,
  CompteBancaireDto,
  PlateformeElectroniqueDto,
} from '../../core/models/models';

// ── Service réutilisé depuis suivi-versements ─────────────────────────────────
@Injectable({ providedIn: 'root' })
export class SuiviVersementsServiceBv extends ApiService {
  getSuivi(proprietaireId?: string, annee?: string): Observable<SuiviVersementsGlobalDto> {
    let url = '/versements/suivi-proprietaires';
    const params: string[] = [];
    if (proprietaireId) params.push(`proprietaireId=${proprietaireId}`);
    if (annee)          params.push(`annee=${annee}`);
    if (params.length)  url += '?' + params.join('&');
    return this.get<SuiviVersementsGlobalDto>(url);
  }
}

// ── Ligne aplatie pour la table + export ─────────────────────────────────────
export interface LigneBordereau {
  numero:       string;       // N° propriétaire
  nom:          string;
  propriete:    string;
  p:            number;
  mode:         'Transfert' | 'Virement' | 'Espèces' | string;
  banque:       string;
  compte:       string;
  montant:      number;
  isTransfere:  boolean;      // indicateur T
  periode:      string;
  observations: string;
  statut:       string;     // Planifie | EnAttente | EnRetard | Derogation
  // meta (pas affiché mais utile pour filtre)
  proprietaireId: string;
  versementId?:   string;
}

// ── Composant ─────────────────────────────────────────────────────────────────
@Component({
  selector: 'kdi-bordereau-versements',
  standalone: true,
  imports: [CommonModule, FormsModule, DecimalPipe],
  template: `
<div class="bv-root page-enter">

  <!-- ══ HEADER ══ -->
  <div class="page-header">
    <div>
      <div class="page-eyebrow">Finance · Comptabilité</div>
      <div class="page-title"><span class="mi">receipt_long</span> Bordereau de versements</div>
      <div class="page-subtitle">Sélectionnez les propriétaires et générez le bordereau d'exécution</div>
    </div>
    <div class="header-actions">
      <select class="select-annee" [(ngModel)]="anneeFiltre" (change)="load()">
        <option *ngFor="let a of annees" [value]="a">{{ a }}</option>
      </select>
      <button class="btn btn-secondary" (click)="load()">
        <span class="mi">refresh</span> Actualiser
      </button>
      <button class="btn btn-secondary" [disabled]="lignesFiltrees().length === 0"
              (click)="exportExcel()">
        <span class="mi">table_chart</span> Excel
      </button>
      <button class="btn btn-gold" [disabled]="lignesFiltrees().length === 0"
              (click)="exportPdf()">
        <span class="mi">picture_as_pdf</span> PDF
      </button>
    </div>
  </div>

  <!-- ══ CHARGEMENT ══ -->
  <div *ngIf="loading()" class="bv-loading">
    <div class="bv-spinner"></div> Chargement des versements…
  </div>

  <ng-container *ngIf="!loading()">

    <!-- ══ KPIs ══ -->
    <div class="bv-kpis">
      <div class="bv-kpi bv-kpi-gold">
        <div class="bv-kpi-ico">💰</div>
        <div>
          <div class="bv-kpi-lbl">Total sélectionné</div>
          <div class="bv-kpi-val">{{ totalSelection() | number:'1.0-0' }} <span class="bv-unit">MRU</span></div>
        </div>
      </div>
      <div class="bv-kpi bv-kpi-blue">
        <div class="bv-kpi-ico">⇄</div>
        <div>
          <div class="bv-kpi-lbl">À transférer</div>
          <div class="bv-kpi-val">{{ totalTransfert() | number:'1.0-0' }} <span class="bv-unit">MRU</span></div>
          <div class="bv-kpi-sub">{{ nbTransfert() }} opération(s)</div>
        </div>
      </div>
      <div class="bv-kpi bv-kpi-green">
        <div class="bv-kpi-ico">💵</div>
        <div>
          <div class="bv-kpi-lbl">À verser</div>
          <div class="bv-kpi-val">{{ totalEspeces() | number:'1.0-0' }} <span class="bv-unit">MRU</span></div>
          <div class="bv-kpi-sub">{{ nbEspeces() }} opération(s)</div>
        </div>
      </div>
      <div class="bv-kpi">
        <div class="bv-kpi-ico">👤</div>
        <div>
          <div class="bv-kpi-lbl">Propriétaires</div>
          <div class="bv-kpi-val">{{ nbProprietairesSelectionnes() }}</div>
          <div class="bv-kpi-sub">{{ lignesSelectionnees().length }} ligne(s)</div>
        </div>
      </div>
    </div>

    <!-- ══ FILTRES ══ -->
    <div class="bv-toolbar">
      <div class="bv-search-wrap">
        <span class="mi bv-search-ico">search</span>
        <input class="bv-search" type="text" [(ngModel)]="recherche"
               placeholder="Propriétaire, banque, propriété…">
      </div>
      <select class="bv-sel" [(ngModel)]="filtreMode">
        <option value="">Tous les modes</option>
        <option value="Transfert">Transfert mobile</option>
        <option value="Espèces">Versement espèces</option>
        <option value="Virement">Virement bancaire</option>
      </select>
      <select class="bv-sel" [(ngModel)]="filtrePeriode">
        <option value="">Toutes les périodes</option>
        <option *ngFor="let p of periodesDisponibles()" [value]="p">{{ p }}</option>
      </select>
      <select class="bv-sel" [(ngModel)]="filtreStatut">
        <option value="">Tous les statuts</option>
        <option value="EnRetard">⚠ En retard</option>
        <option value="EnAttente">⏳ En attente</option>
        <option value="Planifie">· Planifié</option>
        <option value="Derogation">⏸ Dérogation</option>
      </select>
      <div class="bv-sep"></div>
      <button class="bv-chip" [class.on]="toutSelectionne()"
              (click)="toggleTout()">
        {{ toutSelectionne() ? '☑' : '☐' }} Tout sélectionner
      </button>
      <button class="bv-chip-danger" *ngIf="lignesSelectionnees().length > 0"
              (click)="deselectionnerTout()">
        ✕ Désélectionner ({{ lignesSelectionnees().length }})
      </button>
    </div>

    <!-- ══ TABLE ══ -->
    <div class="bv-card">
      <div class="bv-card-header">
        <div class="bv-card-title">
          📋 Versements à exécuter
          <span class="bv-badge">{{ anneeFiltre }}</span>
        </div>
        <div class="bv-card-sub">
          {{ lignesFiltrees().length }} ligne(s) affichée(s)
          <span *ngIf="lignesSelectionnees().length > 0" class="bv-sel-count">
            · {{ lignesSelectionnees().length }} sélectionnée(s)
          </span>
        </div>
      </div>

      <div class="bv-table-wrap">
        <table class="bv-table">
          <thead>
            <tr>
              <th class="bv-cb">
                <input type="checkbox"
                       [checked]="toutSelectionne()"
                       (change)="toggleTout()">
              </th>
              <th>N°</th>
              <th>Propriétaire</th>
              <th>Propriété</th>
              <th>P</th>
              <th>Mode</th>
              <th>Banque / Plateforme</th>
              <th>N° de Compte</th>
              <th class="r">Montant</th>
              <th>Période</th>
              <th>Statut</th>
              <th>Observations</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let l of lignesFiltrees()"
                [class.bv-row-sel]="estSelectionne(l)"
                (click)="toggleLigne(l)">
              <td class="bv-cb" (click)="$event.stopPropagation()">
                <input type="checkbox"
                       [checked]="estSelectionne(l)"
                       (change)="toggleLigne(l)">
              </td>
              <td><span class="bv-num">{{ l.numero }}</span></td>
              <td>
                <div class="bv-nom">{{ l.nom }}</div>
              </td>
              <td><span class="bv-prop-badge">{{ l.propriete }}</span></td>
              <td class="bv-center bv-muted">{{ l.p }}</td>
              <td>
                <span class="bv-mode-badge"
                      [class.bv-mode-t]="l.mode==='Transfert'"
                      [class.bv-mode-v]="l.mode==='Virement'"
                      [class.bv-mode-e]="l.mode==='Espèces'">
                  {{ l.mode === 'Transfert' ? '⇄ Transfert' : l.mode === 'Espèces' ? '💵 Espèces' : '🏦 Virement' }}
                </span>
              </td>
              <td>
                <div class="bv-banque-cell">
                  <div class="bv-banque-ico" [ngClass]="banqueClass(l.banque)">
                    {{ l.banque.slice(0,2).toUpperCase() }}
                  </div>
                  <div>
                    <div class="bv-banque-nom">{{ l.banque }}</div>
                  </div>
                </div>
              </td>
              <td class="bv-compte">{{ l.compte }}</td>
              <td class="r">
                <span class="bv-montant">{{ l.montant | number:'1.0-0' }}</span>
                <span class="bv-unit-sm">MRU</span>
                <span class="bv-t-flag" *ngIf="l.isTransfere">T</span>
              </td>
              <td><span class="bv-periode">{{ l.periode || '—' }}</span></td>
              <td>
                <span class="bv-statut-badge"
                  [class.bv-st-retard]="l.statut==='EnRetard'"
                  [class.bv-st-attente]="l.statut==='EnAttente'"
                  [class.bv-st-planifie]="l.statut==='Planifie'"
                  [class.bv-st-dero]="l.statut==='Derogation'">
                  {{ l.statut==='EnRetard' ? '⚠ En retard' : l.statut==='EnAttente' ? '⏳ En attente' : l.statut==='Planifie' ? '· Planifié' : '⏸ Dérogation' }}
                </span>
              </td>
              <td class="bv-obs">{{ l.observations }}</td>
            </tr>
            <tr *ngIf="!lignesFiltrees().length">
              <td colspan="11" class="bv-empty">Aucun versement dans cette sélection</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- TOTAUX -->
      <div class="bv-totaux">
        <div class="bv-tot-item">
          <div class="bv-tot-lbl">Montant à transférer</div>
          <div class="bv-tot-val bv-tot-gold">{{ totalTransfert() | number:'1.0-0' }} <span class="bv-unit">MRU</span></div>
        </div>
        <div class="bv-tot-item">
          <div class="bv-tot-lbl">Montant à verser</div>
          <div class="bv-tot-val bv-tot-white">{{ totalEspeces() | number:'1.0-0' }} <span class="bv-unit">MRU</span></div>
        </div>
        <div class="bv-tot-item">
          <div class="bv-tot-lbl">Total des transactions</div>
          <div class="bv-tot-val bv-tot-green">{{ totalSelection() | number:'1.0-0' }} <span class="bv-unit">MRU</span></div>
        </div>
      </div>
    </div>

  </ng-container>

  <!-- Toast -->
  <div class="bv-toast" [class.visible]="toastVisible" [class.ok]="toastType==='ok'" [class.err]="toastType==='err'">
    {{ toastMsg }}
  </div>

</div>
  `,
  styles: [`
    .bv-root { }
    .page-header { display:flex; align-items:flex-start; justify-content:space-between; margin-bottom:24px; }
    .page-eyebrow { font-size:11px; font-weight:600; color:#c9a84c; text-transform:uppercase; letter-spacing:.8px; margin-bottom:3px; }
    .page-title { font-size:24px; font-weight:800; color:#0e1c38; display:flex; align-items:center; gap:8px; }
    .page-subtitle { font-size:13px; color:#64748b; margin-top:3px; }
    .header-actions { display:flex; align-items:center; gap:8px; flex-wrap:wrap; }
    .select-annee { padding:7px 12px; border:1px solid #e2e8f0; border-radius:8px; font-size:13px; background:#fff; color:#0e1c38; cursor:pointer; }

    /* ── KPIs ── */
    .bv-kpis { display:grid; grid-template-columns:repeat(4,1fr); gap:14px; margin-bottom:20px; }
    .bv-kpi { background:#fff; border:1px solid #e2e8f0; border-radius:12px; padding:16px; display:flex; align-items:center; gap:12px; box-shadow:0 2px 8px rgba(14,28,56,.06); border-top:3px solid #e2e8f0; }
    .bv-kpi-gold  { border-top-color:#c9a84c; }
    .bv-kpi-blue  { border-top-color:#3b82f6; }
    .bv-kpi-green { border-top-color:#16a34a; }
    .bv-kpi-ico { font-size:22px; flex-shrink:0; }
    .bv-kpi-lbl { font-size:11px; font-weight:600; color:#64748b; text-transform:uppercase; letter-spacing:.5px; }
    .bv-kpi-val { font-size:20px; font-weight:800; color:#0e1c38; font-family:monospace; margin:2px 0; }
    .bv-kpi-sub { font-size:11px; color:#94a3b8; }
    .bv-unit { font-size:11px; font-weight:400; color:#94a3b8; }

    /* ── Toolbar ── */
    .bv-toolbar { background:#fff; border:1px solid #e2e8f0; border-radius:12px; padding:12px 16px; display:flex; align-items:center; gap:10px; margin-bottom:16px; flex-wrap:wrap; box-shadow:0 2px 8px rgba(14,28,56,.04); }
    .bv-search-wrap { flex:1; min-width:180px; position:relative; display:flex; align-items:center; }
    .bv-search-ico { position:absolute; left:8px; font-size:16px; color:#94a3b8; }
    .bv-search { width:100%; padding:7px 10px 7px 30px; border:1px solid #e2e8f0; border-radius:8px; font-size:13px; color:#0e1c38; background:#f8fafc; font-family:inherit; outline:none; transition:border-color .15s; }
    .bv-search:focus { border-color:#c9a84c; background:#fff; }
    .bv-sel { padding:7px 10px; border:1px solid #e2e8f0; border-radius:8px; font-size:13px; color:#0e1c38; background:#f8fafc; font-family:inherit; outline:none; cursor:pointer; }
    .bv-sep { width:1px; height:26px; background:#e2e8f0; flex-shrink:0; }
    .bv-chip { padding:6px 12px; border-radius:20px; border:1px solid #e2e8f0; background:#f8fafc; font-size:12px; font-weight:600; color:#475569; cursor:pointer; white-space:nowrap; transition:all .15s; }
    .bv-chip.on, .bv-chip:hover { background:#0e1c38; color:#fff; border-color:#0e1c38; }
    .bv-chip-danger { padding:6px 12px; border-radius:20px; border:1px solid #fecaca; background:#fee2e2; font-size:12px; font-weight:600; color:#dc2626; cursor:pointer; white-space:nowrap; }
    .bv-chip-danger:hover { background:#fca5a5; }

    /* ── Card ── */
    .bv-card { background:#fff; border:1px solid #e2e8f0; border-radius:12px; box-shadow:0 2px 8px rgba(14,28,56,.06); overflow:hidden; }
    .bv-card-header { padding:14px 18px; border-bottom:1px solid #f1f5f9; display:flex; align-items:center; justify-content:space-between; background:linear-gradient(to right,#0e1c38,#1a3060); }
    .bv-card-title { font-size:14px; font-weight:700; color:#fff; display:flex; align-items:center; gap:8px; }
    .bv-card-sub { font-size:12px; color:rgba(255,255,255,.5); }
    .bv-badge { font-size:11px; background:rgba(201,168,76,.2); color:#e8c97a; padding:2px 8px; border-radius:20px; font-weight:500; }
    .bv-sel-count { color:#c9a84c; font-weight:600; }

    /* ── Table ── */
    .bv-table-wrap { overflow-x:auto; }
    .bv-table { width:100%; border-collapse:collapse; font-size:13px; table-layout:fixed; }
    .bv-table thead tr { background:#f1f5f9; }
    .bv-table thead th { padding:9px 12px; font-size:11px; font-weight:600; color:#64748b; text-transform:uppercase; letter-spacing:.4px; border-bottom:1px solid #e2e8f0; text-align:left; white-space:nowrap; overflow:hidden; }
    .bv-table tbody tr { border-bottom:1px solid #f8fafc; cursor:pointer; transition:background .1s; }
    .bv-table tbody tr:hover { background:#fafbfc; }
    .bv-row-sel { background:#fdf6e3 !important; }
    .bv-row-sel td { border-bottom-color:#f0e4b8 !important; }
    .bv-table td { padding:10px 12px; vertical-align:middle; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    .r { text-align:right; }
    .bv-cb { width:40px; text-align:center; }
    .bv-cb input[type=checkbox] { width:15px; height:15px; accent-color:#c9a84c; cursor:pointer; }

    /* Cells */
    .bv-num { font-family:monospace; font-size:11px; color:#64748b; background:#f1f5f9; border-radius:4px; padding:2px 6px; }
    .bv-nom { font-weight:600; color:#0e1c38; }
    .bv-prop-badge { background:#0e1c38; color:#c9a96e; font-family:monospace; font-size:11px; padding:2px 8px; border-radius:4px; }
    .bv-center { text-align:center; }
    .bv-muted { color:#94a3b8; font-size:12px; }
    .bv-mode-badge { font-size:11px; padding:3px 8px; border-radius:6px; font-weight:600; }
    .bv-mode-t { background:#dbeafe; color:#1d4ed8; }
    .bv-mode-v { background:#d1fae5; color:#065f46; }
    .bv-mode-e { background:#fef3c7; color:#92400e; }
    .bv-banque-cell { display:flex; align-items:center; gap:8px; }
    .bv-banque-ico { width:26px; height:26px; border-radius:6px; display:flex; align-items:center; justify-content:center; font-size:10px; font-weight:700; flex-shrink:0; }
    .bv-bi-bankily { background:#fef3c7; color:#92400e; }
    .bv-bi-bnm     { background:#dbeafe; color:#1d4ed8; }
    .bv-bi-bmci    { background:#d1fae5; color:#065f46; }
    .bv-bi-bimbank { background:#fce7f3; color:#9d174d; }
    .bv-bi-click   { background:#ede9fe; color:#5b21b6; }
    .bv-bi-default { background:#f1f5f9; color:#64748b; }
    .bv-banque-nom { font-size:12px; font-weight:500; color:#0e1c38; }
    .bv-compte { font-family:monospace; font-size:11px; color:#64748b; max-width:160px; overflow:hidden; text-overflow:ellipsis; }
    .bv-montant { font-family:monospace; font-weight:700; color:#0e1c38; }
    .bv-unit-sm { font-size:10px; color:#94a3b8; margin-left:2px; }
    .bv-t-flag { font-size:9px; font-weight:700; background:#dbeafe; color:#1d4ed8; padding:1px 4px; border-radius:3px; margin-left:4px; }
    .bv-periode { font-size:11px; background:#f1f5f9; color:#64748b; border-radius:4px; padding:2px 6px; }
    .bv-obs { font-size:11px; color:#94a3b8; font-style:italic; max-width:130px; overflow:hidden; text-overflow:ellipsis; }
    .bv-statut-badge { font-size:11px; padding:3px 8px; border-radius:6px; font-weight:600; white-space:nowrap; }
    .bv-st-retard  { background:#fee2e2; color:#dc2626; }
    .bv-st-attente { background:#fef3c7; color:#92400e; }
    .bv-st-planifie{ background:#f1f5f9; color:#64748b; }
    .bv-st-dero    { background:#ede9fe; color:#5b21b6; }
    .bv-empty { text-align:center; padding:48px; color:#94a3b8; font-size:14px; }

    /* ── Totaux ── */
    .bv-totaux { background:#0e1c38; display:grid; grid-template-columns:repeat(3,1fr); border-top:2px solid #c9a84c; }
    .bv-tot-item { padding:14px 20px; border-right:1px solid rgba(255,255,255,.08); }
    .bv-tot-item:last-child { border-right:none; }
    .bv-tot-lbl { font-size:11px; font-weight:600; color:rgba(255,255,255,.45); text-transform:uppercase; letter-spacing:.5px; margin-bottom:4px; }
    .bv-tot-val { font-family:monospace; font-size:18px; font-weight:800; }
    .bv-tot-gold  { color:#c9a84c; }
    .bv-tot-white { color:#fff; }
    .bv-tot-green { color:#4ade80; }

    /* ── Loading ── */
    .bv-loading { display:flex; align-items:center; gap:10px; padding:60px; justify-content:center; color:#64748b; }
    .bv-spinner { width:20px; height:20px; border:2px solid #e2e8f0; border-top-color:#0e1c38; border-radius:50%; animation:spin .7s linear infinite; }
    @keyframes spin { to { transform:rotate(360deg); } }

    /* ── Toast ── */
    .bv-toast { position:fixed; bottom:28px; right:28px; z-index:9999; padding:13px 20px; border-radius:12px; font-size:14px; font-weight:600; box-shadow:0 8px 28px rgba(0,0,0,.15); max-width:380px; transform:translateY(80px); opacity:0; transition:transform .3s,opacity .3s; pointer-events:none; }
    .bv-toast.visible { transform:translateY(0); opacity:1; }
    .bv-toast.ok  { background:#d1fae5; color:#065f46; border:1px solid #6ee7b7; }
    .bv-toast.err { background:#fee2e2; color:#991b1b; border:1px solid #fca5a5; }

    /* Table col widths */
    .bv-table th:nth-child(1)  { width:42px; }
    .bv-table th:nth-child(2)  { width:68px; }
    .bv-table th:nth-child(3)  { width:200px; }
    .bv-table th:nth-child(4)  { width:80px; }
    .bv-table th:nth-child(5)  { width:36px; }
    .bv-table th:nth-child(6)  { width:110px; }
    .bv-table th:nth-child(7)  { width:130px; }
    .bv-table th:nth-child(8)  { width:150px; }
    .bv-table th:nth-child(9)  { width:110px; }
    .bv-table th:nth-child(10) { width:100px; }
    .bv-table th:nth-child(11) { width:100px; }
    .bv-table th:nth-child(12) { width:auto; }
  `]
})
export class BordereauVersementsComponent implements OnInit {
  private suiSvc  = inject(SuiviVersementsServiceBv);
  private propSvc = inject(ProprietairesService);
  private auth    = inject(AuthService);

  loading = signal(true);

  anneeFiltre = new Date().getFullYear().toString();
  annees      = Array.from({ length: 4 }, (_, i) => (new Date().getFullYear() - i).toString());

  recherche    = '';
  filtreMode    = '';
  filtrePeriode = '';
  filtreStatut  = '';

  private toutesLignes: LigneBordereau[] = [];
  private selectionnes = new Set<string>(); // clé = index stringifié

  toastMsg     = '';
  toastType    = '';
  toastVisible = false;
  private _toastTimer: any;

  // ── Cycle de vie ──────────────────────────────────────────────────────────
  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    this.selectionnes.clear();

    this.suiSvc.getSuivi(undefined, this.anneeFiltre).subscribe({
      next: data => {
        const proprietaireIds = data.proprietaires.map(p => p.proprietaireId);
        if (!proprietaireIds.length) {
          this.toutesLignes = [];
          this.loading.set(false);
          return;
        }
        // Charger les infos bancaires de chaque propriétaire en parallèle
        const reqs = proprietaireIds.map(id =>
          this.propSvc.getById(id).pipe(catchError(() => of(null)))
        );
        forkJoin(reqs).subscribe(proprietaires => {
          const propMap = new Map<string, ProprietaireDto | null>();
          proprietaireIds.forEach((id, i) => propMap.set(id, proprietaires[i]));
          this.toutesLignes = this.aplatir(data, propMap);
          this.loading.set(false);
        });
      },
      error: () => { this.toutesLignes = []; this.loading.set(false); }
    });
  }

  // ── Aplatissement du DTO en lignes de bordereau ───────────────────────────
  private aplatir(
    data: SuiviVersementsGlobalDto,
    propMap: Map<string, ProprietaireDto | null>
  ): LigneBordereau[] {
    const lignes: LigneBordereau[] = [];
    let counter = 1;

    for (const prop of data.proprietaires) {
      const detail = propMap.get(prop.proprietaireId);
      const comptes     = detail?.comptes    ?? [];
      const plateformes = detail?.plateformes ?? [];

      // Compte / plateforme principal
      const comptePrincipal     = comptes.find(c => c.estPrincipal)     ?? comptes[0];
      const plateformePrincipale = plateformes.find(p => p.estPrincipal) ?? plateformes[0];

      for (const propriete of prop.proprietes) {
        // Inclure toutes les périodes avec montantNet > 0 non encore effectuées/annulées.
        // Planifié, EnAttente, EnRetard, Dérogation sont tous à exécuter dans le bordereau.
        const periodesDues = propriete.periodes.filter(
          pe => pe.montantNet > 0
             && pe.statut !== 'Effectue'
             && pe.statut !== 'Annule'
        );
        if (!periodesDues.length) continue;

        // Choisir le mode de paiement selon les coordonnées disponibles
        let banque  = '';
        let compte  = '';
        let mode    = 'Espèces';

        if (plateformePrincipale) {
          banque = plateformePrincipale.nom;
          compte = plateformePrincipale.numero;
          mode   = 'Transfert';
        } else if (comptePrincipal) {
          banque = comptePrincipal.banque;
          compte = comptePrincipal.numero;
          mode   = 'Virement';
        }

        // Une ligne par période
        for (const periode of periodesDues) {
          const isTransfere = mode === 'Transfert';
          lignes.push({
            numero:         String(counter).padStart(5, '0'),
            nom:            prop.proprietaireNom,
            propriete:      propriete.proprieteLibelle,
            p:              1,
            mode,
            banque,
            compte,
            montant:        periode.montantNet,
            isTransfere,
            periode:        periode.periodeId,
            observations:   '',
            statut:         periode.statut,
            proprietaireId: prop.proprietaireId,
            versementId:    periode.versementId,
          });
          counter++;
        }
      }
    }
    return lignes;
  }

  // ── Filtrage ──────────────────────────────────────────────────────────────
  lignesFiltrees(): LigneBordereau[] {
    const q = this.recherche.toLowerCase();
    return this.toutesLignes.filter(l => {
      if (q && !l.nom.toLowerCase().includes(q) &&
               !l.banque.toLowerCase().includes(q) &&
               !l.propriete.toLowerCase().includes(q) &&
               !l.compte.includes(q)) return false;
      if (this.filtreMode   && l.mode     !== this.filtreMode)    return false;
      if (this.filtrePeriode && l.periode !== this.filtrePeriode) return false;
      if (this.filtreStatut  && l.statut  !== this.filtreStatut)  return false;
      return true;
    });
  }

  periodesDisponibles(): string[] {
    return [...new Set(this.toutesLignes.map(l => l.periode).filter(Boolean))].sort().reverse();
  }

  // ── Sélection ─────────────────────────────────────────────────────────────
  key(l: LigneBordereau): string { return `${l.nom}__${l.propriete}__${l.periode}`; }

  estSelectionne(l: LigneBordereau): boolean { return this.selectionnes.has(this.key(l)); }

  toggleLigne(l: LigneBordereau) {
    const k = this.key(l);
    if (this.selectionnes.has(k)) this.selectionnes.delete(k);
    else this.selectionnes.add(k);
  }

  toutSelectionne(): boolean {
    const f = this.lignesFiltrees();
    return f.length > 0 && f.every(l => this.estSelectionne(l));
  }

  toggleTout() {
    const f = this.lignesFiltrees();
    if (this.toutSelectionne()) f.forEach(l => this.selectionnes.delete(this.key(l)));
    else f.forEach(l => this.selectionnes.add(this.key(l)));
  }

  deselectionnerTout() { this.selectionnes.clear(); }

  lignesSelectionnees(): LigneBordereau[] {
    return this.selectionnes.size > 0
      ? this.toutesLignes.filter(l => this.estSelectionne(l))
      : this.lignesFiltrees();
  }

  // ── KPIs calculés ─────────────────────────────────────────────────────────
  totalSelection(): number { return this.lignesSelectionnees().reduce((s, l) => s + l.montant, 0); }
  totalTransfert(): number { return this.lignesSelectionnees().filter(l => l.mode === 'Transfert').reduce((s, l) => s + l.montant, 0); }
  totalEspeces():   number { return this.lignesSelectionnees().filter(l => l.mode === 'Espèces').reduce((s, l) => s + l.montant, 0); }
  nbTransfert():    number { return this.lignesSelectionnees().filter(l => l.mode === 'Transfert').length; }
  nbEspeces():      number { return this.lignesSelectionnees().filter(l => l.mode === 'Espèces').length; }
  nbProprietairesSelectionnes(): number {
    return new Set(this.lignesSelectionnees().map(l => l.proprietaireId)).size;
  }

  banqueClass(b: string): string {
    const map: Record<string, string> = {
      Bankily: 'bv-bi-bankily', BNM: 'bv-bi-bnm', BMCI: 'bv-bi-bmci',
      BimBank: 'bv-bi-bimbank', Click: 'bv-bi-click',
    };
    return map[b] ?? 'bv-bi-default';
  }

  // ── Toast ─────────────────────────────────────────────────────────────────
  private toast(msg: string, type: 'ok' | 'err') {
    this.toastMsg     = msg;
    this.toastType    = type;
    this.toastVisible = true;
    clearTimeout(this._toastTimer);
    this._toastTimer  = setTimeout(() => this.toastVisible = false, 4500);
  }

  // ── Formatage sûr pour jsPDF (évite l'espace insécable de toLocaleString fr-FR) ──
  private fmt(n: number): string {
    // Séparateur de milliers = espace ASCII normal (0x20), jamais U+00A0
    return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  }

  // ── Export Excel (ExcelJS via CDN dynamique) ──────────────────────────────
  async exportExcel() {
    const lignes  = this.lignesSelectionnees();
    if (!lignes.length) { this.toast('⚠️ Aucune ligne à exporter.', 'err'); return; }

    try {
      // Chargement dynamique d'ExcelJS depuis CDN
      const ExcelJS = await this.loadExcelJS();
      const wb  = new ExcelJS.Workbook();
      const ws  = wb.addWorksheet('Bordereau versements');

      const today    = new Date().toLocaleDateString('fr-FR');
      const ref      = `BV-${new Date().getFullYear()}${String(new Date().getMonth()+1).padStart(2,'0')}-001`;
      const user     = this.auth.getUser();
      const userName = user ? `${user.prenom ?? ''} ${user.nom ?? ''}`.trim() : 'KDI';

      const NAVY  = '0B1829';
      const GOLD  = 'C9A84C';
      const WHITE = 'FFFFFF';
      const LIGHT = 'F8FAFC';
      const SLATE = '64748B';

      // En-tête entité
      ws.mergeCells('B2:F3');
      const titleCell = ws.getCell('B2');
      titleCell.value = 'Khalifat Djické Immobilier';
      titleCell.font  = { bold: true, size: 14, color: { argb: `FF${GOLD}` }, name: 'Arial' };
      titleCell.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${NAVY}` } };

      ws.mergeCells('B4:F4');
      const sub = ws.getCell('B4');
      sub.value = 'Service de comptabilité';
      sub.font  = { size: 9, color: { argb: 'FF94A3B8' }, name: 'Arial' };
      sub.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${NAVY}` } };

      ws.mergeCells('H2:L2');
      const dateCell = ws.getCell('H2');
      dateCell.value = `Date d'édition : ${today}`;
      dateCell.font  = { bold: true, size: 10, color: { argb: `FF${GOLD}` }, name: 'Arial' };
      dateCell.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${NAVY}` } };
      dateCell.alignment = { horizontal: 'right', vertical: 'middle' };

      ws.mergeCells('H3:L3');
      const refCell = ws.getCell('H3');
      refCell.value = `Réf : ${ref}   |   T = Transfert   ·   V = Versement`;
      refCell.font  = { size: 8, color: { argb: 'FF64748B' }, name: 'Arial' };
      refCell.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${NAVY}` } };
      refCell.alignment = { horizontal: 'right', vertical: 'middle' };

      // Ligne or de séparation
      ws.getRow(5).height = 5;
      for (let c = 1; c <= 12; c++) {
        const cell = ws.getCell(5, c);
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${GOLD}` } };
      }

      // Titre
      ws.mergeCells('B6:L6');
      const mainTitle = ws.getCell('B6');
      mainTitle.value = `Liste des versements — ${this.anneeFiltre}`;
      mainTitle.font  = { bold: true, size: 12, color: { argb: `FF${NAVY}` }, name: 'Arial' };
      mainTitle.alignment = { horizontal: 'left', vertical: 'middle' };
      ws.getRow(6).height = 20;

      // En-têtes colonnes
      const headers = ['', 'N°', 'Propriétaire', 'Propriété', 'P', 'Mode', 'Banque', 'N° de Compte', 'Montant', 'T', 'Période', 'Observations'];
      const hRow = ws.getRow(8);
      hRow.height = 18;
      headers.forEach((h, i) => {
        const cell = hRow.getCell(i + 1);
        cell.value = h;
        cell.font  = { bold: true, size: 9, color: { argb: `FF${WHITE}` }, name: 'Arial' };
        cell.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${NAVY}` } };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.border = {
          top:    { style: 'medium', color: { argb: `FF${GOLD}` } },
          bottom: { style: 'medium', color: { argb: `FF${GOLD}` } },
        };
      });

      const totTransfert = this.totalTransfert();
      const totEspeces   = this.totalEspeces();
      const totTotal     = this.totalSelection();

      // Données
      const DATA_START = 9;
      lignes.forEach((l, i) => {
        const row = ws.getRow(DATA_START + i);
        row.height = 15;
        const bg = i % 2 === 0 ? `FF${WHITE}` : `FF${LIGHT}`;

        const setCell = (col: number, val: any, opts: any = {}) => {
          const cell = row.getCell(col);
          cell.value = val;
          cell.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
          cell.font  = { size: 9, name: 'Arial', color: { argb: `FF${NAVY}` }, ...opts.font };
          cell.alignment = { horizontal: opts.h ?? 'left', vertical: 'middle' };
          cell.border = {
            top:    { style: 'hair', color: { argb: 'FFF1F5F9' } },
            bottom: { style: 'hair', color: { argb: 'FFF1F5F9' } },
          };
          if (opts.numFmt) cell.numFmt = opts.numFmt;
        };

        setCell(1, '');
        setCell(2, l.numero,    { h: 'center', font: { color: { argb: `FF${SLATE}` } } });
        setCell(3, l.nom,       { font: { bold: true } });
        setCell(4, l.propriete, { h: 'center' });
        setCell(5, l.p,         { h: 'center', font: { color: { argb: `FF${SLATE}` } } });
        setCell(6, l.mode,      { h: 'center', font: { bold: true,
          color: { argb: l.mode === 'Transfert' ? 'FF1D4ED8' : l.mode === 'Espèces' ? 'FF166534' : 'FF0C447C' } } });
        setCell(7, l.banque);
        setCell(8, l.compte,    { font: { color: { argb: `FF${SLATE}` } } });
        setCell(9, l.montant,   { h: 'right', font: { bold: true }, numFmt: '#,##0' });
        setCell(10, l.isTransfere ? 'T' : '', { h: 'center', font: { bold: true, color: { argb: 'FF1D4ED8' } } });
        setCell(11, l.periode,  { h: 'center', font: { color: { argb: `FF${SLATE}` } } });
        setCell(12, l.observations, { font: { color: { argb: `FF${SLATE}` }, italic: true } });
      });

      // Ligne séparatrice dorée
      const sepRow = DATA_START + lignes.length;
      for (let c = 1; c <= 12; c++)
        ws.getCell(sepRow, c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${GOLD}` } };

      // Totaux
      const T1 = sepRow + 1;
      ws.getRow(T1).height = 22;
      const totData = [
        { col: 2, lbl: 'Montant à transférer', val: totTransfert, color: `FF${GOLD}` },
        { col: 7, lbl: 'Montant à verser',     val: totEspeces,   color: 'FFFFFFFF' },
        { col: 9, lbl: 'Total transactions',    val: totTotal,     color: 'FF4ADE80' },
      ];
      for (let c = 1; c <= 12; c++)
        ws.getCell(T1, c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${NAVY}` } };

      totData.forEach(t => {
        const lbl = ws.getCell(T1, t.col);
        lbl.value = t.lbl;
        lbl.font  = { size: 9, color: { argb: 'FF94A3B8' }, name: 'Arial' };
        lbl.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${NAVY}` } };
        lbl.alignment = { horizontal: 'left', vertical: 'middle' };

        const val = ws.getCell(T1, t.col + 1);
        val.value  = t.val;
        val.font   = { bold: true, size: 13, color: { argb: t.color }, name: 'Arial' };
        val.fill   = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${NAVY}` } };
        val.numFmt = '#,##0';
        val.alignment = { horizontal: 'right', vertical: 'middle' };
      });

      // Signatures
      const SIG = T1 + 3;
      ws.mergeCells(`B${SIG}:E${SIG+4}`);
      const sig1 = ws.getCell(`B${SIG}`);
      sig1.value = 'Le comptable';
      sig1.font  = { bold: true, size: 10, color: { argb: `FF${NAVY}` }, name: 'Arial' };
      sig1.alignment = { horizontal: 'center', vertical: 'top' };
      sig1.border = { left:{style:'thin'}, right:{style:'thin'}, top:{style:'thin'}, bottom:{style:'thin'} };

      ws.mergeCells(`H${SIG}:K${SIG+4}`);
      const sig2 = ws.getCell(`H${SIG}`);
      sig2.value = "L'assistant comptable";
      sig2.font  = { bold: true, size: 10, color: { argb: `FF${NAVY}` }, name: 'Arial' };
      sig2.alignment = { horizontal: 'center', vertical: 'top' };
      sig2.border = { left:{style:'thin'}, right:{style:'thin'}, top:{style:'thin'}, bottom:{style:'thin'} };

      // Largeurs colonnes
      const widths = [3, 7, 26, 10, 4, 13, 13, 22, 12, 4, 13, 22];
      widths.forEach((w, i) => ws.getColumn(i + 1).width = w);

      // En-têtes et pieds de page natifs
      ws.headerFooter.oddHeader = `&C&"Arial,Bold"&14Khalifat Djické Immobilier&R&"Arial"&8Date : ${today}   Réf : ${ref}`;
      ws.headerFooter.oddFooter = `&L&"Arial"&8Khalifat Djické Immobilier — Service de comptabilité&C&"Arial"&8Liste des versements ${this.anneeFiltre}&R&"Arial"&8Page &P / &N`;

      ws.pageSetup.orientation   = 'landscape';
      ws.pageSetup.paperSize     = 9; // A4
      ws.pageSetup.fitToWidth    = 1;
      ws.pageSetup.fitToHeight   = 0;
      ws.pageSetup.printTitlesRow = '8:8';
      ws.autoFilter = { from: 'B8', to: 'L8' };
      ws.views = [{ state: 'frozen', xSplit: 2, ySplit: 8 }];

      // Téléchargement
      const buffer = await wb.xlsx.writeBuffer();
      const blob   = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url    = URL.createObjectURL(blob);
      const a      = document.createElement('a');
      a.href       = url;
      a.download   = `bordereau-versements-${this.anneeFiltre}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      this.toast('✅ Excel généré avec succès.', 'ok');

    } catch (e: any) {
      console.error(e);
      this.toast('❌ Erreur lors de la génération Excel.', 'err');
    }
  }

  // ── Export PDF (jsPDF + autoTable) ────────────────────────────────────────
  async exportPdf() {
    const lignes = this.lignesSelectionnees();
    if (!lignes.length) { this.toast('⚠️ Aucune ligne à exporter.', 'err'); return; }

    try {
      const jsPDF = await this.loadJsPDF();
      const doc   = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

      const today    = new Date().toLocaleDateString('fr-FR');
      const ref      = `BV-${new Date().getFullYear()}${String(new Date().getMonth()+1).padStart(2,'0')}-001`;
      const PW       = doc.internal.pageSize.getWidth();
      const PH       = doc.internal.pageSize.getHeight();
      const MARGIN   = 12;

      const NAVY  = [11, 24, 41]   as [number,number,number];
      const GOLD  = [201,168,76]   as [number,number,number];
      const WHITE = [255,255,255]  as [number,number,number];
      const SLATE = [100,116,139]  as [number,number,number];
      const GREEN = [74, 222, 128] as [number,number,number];

      const drawHeader = (pageNum: number, totalPages: number) => {
        // Bande navy
        doc.setFillColor(...NAVY);
        doc.rect(0, 0, PW, 20, 'F');
        // Ligne or sous l'en-tête
        doc.setFillColor(...GOLD);
        doc.rect(0, 20, PW, 1, 'F');

        // Logo
        doc.setFillColor(...GOLD);
        doc.roundedRect(MARGIN, 4, 12, 12, 1.5, 1.5, 'F');
        doc.setTextColor(...NAVY);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.text('KD', MARGIN + 6, 11, { align: 'center' });

        // Nom société
        doc.setTextColor(...WHITE);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.text('Khalifat Djické Immobilier', MARGIN + 15, 9);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184);
        doc.text('Service de comptabilité', MARGIN + 15, 14);

        // Date + ref à droite
        doc.setTextColor(...GOLD);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.text(`Date d'édition : ${today}`, PW - MARGIN, 9, { align: 'right' });
        doc.setTextColor(100, 116, 139);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.text(`Réf : ${ref}   |   T = Transfert   ·   V = Versement`, PW - MARGIN, 14, { align: 'right' });
      };

      const drawFooter = (pageNum: number, totalPages: number) => {
        // Bande footer
        doc.setFillColor(...NAVY);
        doc.rect(0, PH - 10, PW, 10, 'F');
        doc.setFillColor(...GOLD);
        doc.rect(0, PH - 11, PW, 1, 'F');

        doc.setTextColor(148, 163, 184);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.text('Khalifat Djické Immobilier — Service de comptabilité', MARGIN, PH - 5);
        doc.text(`Liste des versements ${this.anneeFiltre}`, PW / 2, PH - 5, { align: 'center' });
        doc.text(`Page ${pageNum} / ${totalPages}`, PW - MARGIN, PH - 5, { align: 'right' });
      };

      // Titre
      drawHeader(1, 1);
      doc.setTextColor(...NAVY);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text(`Liste des versements — ${this.anneeFiltre}`, MARGIN, 27);
      doc.setDrawColor(...(GOLD as [number,number,number]));
      doc.setLineWidth(0.5);
      doc.line(MARGIN + 75, 26, PW - MARGIN, 26);

      // Tableau
      const totTransfert = this.totalTransfert();
      const totEspeces   = this.totalEspeces();
      const totTotal     = this.totalSelection();

      const rows = lignes.map(l => [
        l.numero,
        l.nom,
        l.propriete,
        String(l.p),
        l.mode,
        l.banque,
        l.compte,
        this.fmt(l.montant) + (l.isTransfere ? ' T' : ''),
        l.periode || '—',
        l.observations,
      ]);

      (doc as any).autoTable({
        head: [['N°', 'Propriétaire', 'Prop.', 'P', 'Mode', 'Banque', 'N° Compte', 'Montant', 'Période', 'Observations']],
        body: rows,
        startY: 30,
        margin: { left: MARGIN, right: MARGIN, top: 22, bottom: 14 },
        theme: 'grid',
        headStyles: {
          fillColor: NAVY,
          textColor: WHITE,
          fontStyle: 'bold',
          fontSize: 8,
          halign: 'center',
          lineColor: GOLD,
          lineWidth: 0.3,
        },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        bodyStyles: { fontSize: 8, textColor: NAVY, lineColor: [241, 245, 249] },
        columnStyles: {
          0: { halign: 'center', cellWidth: 14 },
          1: { cellWidth: 40, fontStyle: 'bold' },
          2: { halign: 'center', cellWidth: 18 },
          3: { halign: 'center', cellWidth: 8 },
          4: { halign: 'center', cellWidth: 22 },
          5: { cellWidth: 22 },
          6: { cellWidth: 35, fontSize: 7 },
          7: { halign: 'right', cellWidth: 24, fontStyle: 'bold' },
          8: { halign: 'center', cellWidth: 22 },
          9: { cellWidth: 'auto', fontSize: 7 },
        },
        didDrawPage: (data: any) => {
          const pg = (doc as any).internal.getNumberOfPages();
          drawHeader(data.pageNumber, pg);
          drawFooter(data.pageNumber, pg);
        },
      });

      // Bloc totaux
      const finalY = (doc as any).lastAutoTable.finalY + 4;
      doc.setFillColor(...NAVY);
      doc.rect(MARGIN, finalY, PW - MARGIN * 2, 14, 'F');
      doc.setFillColor(...GOLD);
      doc.rect(MARGIN, finalY, PW - MARGIN * 2, 0.8, 'F');
      doc.rect(MARGIN, finalY + 14, PW - MARGIN * 2, 0.8, 'F');

      const blockW = (PW - MARGIN * 2) / 3;
      const items = [
        { label: 'Montant à transférer', val: totTransfert, color: GOLD },
        { label: 'Montant à verser',     val: totEspeces,   color: WHITE },
        { label: 'Total transactions',   val: totTotal,     color: GREEN },
      ];
      items.forEach((item, i) => {
        const x = MARGIN + i * blockW;
        if (i > 0) {
          doc.setDrawColor(30, 58, 95);
          doc.setLineWidth(0.3);
          doc.line(x, finalY + 1, x, finalY + 13);
        }
        doc.setTextColor(148, 163, 184);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.text(item.label, x + 8, finalY + 5);
        doc.setTextColor(...item.color);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.text(this.fmt(item.val) + ' MRU', x + blockW - 4, finalY + 11, { align: 'right' });
      });

      // ── Page de signatures : toujours sur une nouvelle page dédiée ──────────
      // Garantit l'affichage quelle que soit la longueur du tableau de données.
      doc.addPage();

      // En-tête sur la page signatures (sera mis à jour dans la boucle finale)
      drawHeader(0, 0);

      const SP_TOP  = 26;   // Y de départ sous l'en-tête
      const SP_SLAT = [100, 116, 139] as [number,number,number];
      const SP_NAVY = NAVY;

      // ── Séparateur + titre de section ──
      doc.setDrawColor(...GOLD);
      doc.setLineWidth(0.6);
      doc.line(MARGIN, SP_TOP, PW - MARGIN, SP_TOP);

      doc.setTextColor(...SP_NAVY);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text('Exécution du bordereau', MARGIN, SP_TOP + 8);

      // ── Récapitulatif des montants ──
      const recapY = SP_TOP + 18;
      doc.setFillColor(11, 24, 41);
      doc.roundedRect(MARGIN, recapY, PW - MARGIN * 2, 14, 2, 2, 'F');
      doc.setFillColor(...GOLD);
      doc.rect(MARGIN, recapY, PW - MARGIN * 2, 0.7, 'F');
      doc.rect(MARGIN, recapY + 14, PW - MARGIN * 2, 0.7, 'F');

      const rW = (PW - MARGIN * 2) / 3;
      const recapItems = [
        { label: 'Montant a transferer', val: totTransfert },
        { label: 'Montant a verser',     val: totEspeces   },
        { label: 'Total transactions',   val: totTotal     },
      ];
      const recapColors: [number,number,number][] = [GOLD, WHITE, [74,222,128]];
      recapItems.forEach((it, i) => {
        const rx = MARGIN + i * rW;
        if (i > 0) {
          doc.setDrawColor(30, 58, 95);
          doc.setLineWidth(0.3);
          doc.line(rx, recapY + 1, rx, recapY + 13);
        }
        doc.setTextColor(148, 163, 184);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.text(it.label, rx + 6, recapY + 5);
        doc.setTextColor(...recapColors[i]);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.text(this.fmt(it.val) + ' MRU', rx + rW - 4, recapY + 11, { align: 'right' });
      });

      // ── Champs à remplir ──
      const fieldsY = recapY + 24;
      doc.setTextColor(...SP_SLAT);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);

      // Ligne de base des champs
      doc.setDrawColor(...SP_SLAT);
      doc.setLineWidth(0.3);

      const fieldW = 55;
      const fields = [
        { label: 'Numero de cheque :', x: MARGIN },
        { label: "Date d execution :", x: MARGIN + (PW - MARGIN * 2) / 3 },
        { label: 'Retrait effectue par :', x: MARGIN + (PW - MARGIN * 2) * 2 / 3 },
      ];
      fields.forEach(f => {
        doc.text(f.label, f.x, fieldsY);
        const lw = doc.getTextWidth(f.label);
        doc.line(f.x + lw + 3, fieldsY, f.x + lw + 3 + fieldW, fieldsY);
      });

      // ── Boîtes de signature ──
      const sigBoxY = fieldsY + 12;
      const sigH    = 35;
      const sigW    = (PW - MARGIN * 2) / 2 - 6;
      const gap     = 12;

      const drawSigBox = (x: number, title: string) => {
        doc.setFillColor(248, 250, 252);
        doc.setDrawColor(200, 210, 220);
        doc.setLineWidth(0.5);
        doc.roundedRect(x, sigBoxY, sigW, sigH, 2, 2, 'FD');

        // Titre en haut
        doc.setTextColor(...SP_NAVY);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.text(title, x + sigW / 2, sigBoxY + 7, { align: 'center' });

        // Ligne de signature au milieu
        doc.setDrawColor(180, 190, 200);
        doc.setLineWidth(0.3);
        doc.line(x + 10, sigBoxY + sigH / 2 + 4, x + sigW - 10, sigBoxY + sigH / 2 + 4);

        // Label en bas
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(148, 163, 184);
        doc.text('Signature & cachet', x + sigW / 2, sigBoxY + sigH - 4, { align: 'center' });
      };

      drawSigBox(MARGIN, 'Le comptable');
      drawSigBox(MARGIN + sigW + gap, "L'assistant comptable");

      // Mettre à jour les numéros de pages dans les footers
      const totalPages = (doc as any).internal.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        drawFooter(i, totalPages);
      }

      doc.save(`bordereau-versements-${this.anneeFiltre}.pdf`);
      this.toast('✅ PDF généré avec succès.', 'ok');

    } catch (e: any) {
      console.error(e);
      this.toast('❌ Erreur lors de la génération PDF.', 'err');
    }
  }

  // ── Loaders dynamiques (évite d'alourdir le bundle Angular) ──────────────
  private loadExcelJS(): Promise<any> {
    return new Promise((resolve, reject) => {
      if ((window as any).ExcelJS) { resolve((window as any).ExcelJS); return; }
      const s = document.createElement('script');
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/exceljs/4.4.0/exceljs.min.js';
      s.onload  = () => resolve((window as any).ExcelJS);
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  private loadJsPDF(): Promise<any> {
    return new Promise((resolve, reject) => {
      if ((window as any).jspdf) { resolve((window as any).jspdf.jsPDF); return; }
      const loadScript = (src: string) => new Promise<void>((res, rej) => {
        const s = document.createElement('script');
        s.src = src; s.onload = () => res(); s.onerror = rej;
        document.head.appendChild(s);
      });
      loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js')
        .then(() => loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js'))
        .then(() => resolve((window as any).jspdf.jsPDF))
        .catch(reject);
    });
  }
}