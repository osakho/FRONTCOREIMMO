import { Component, inject, OnInit, OnDestroy, signal, NgZone } from '@angular/core';
import { CommonModule, DecimalPipe, DatePipe } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Observable } from 'rxjs';
import { Injectable } from '@angular/core';
import { ContratsLocationService, AuthService, ProduitsService, LocatairesService, ApiService } from '../../../core/services/api.services';
import { ContratLocationListItemDto, PagedList, StatutContrat } from '../../../core/models/models';

// ── DTOs récap financier ──────────────────────────────────────
export interface MoisLoyer {
  periode:     string;
  label:       string;
  montant:     number;
  montantPaye: number;
  statut:      'Paye' | 'Partiel' | 'Impaye' | 'Futur' | 'Avance';
}
export interface RecapFinancierContratDto {
  contratId:         string;
  locataireNom:      string;
  produitCode:       string;
  loyer:             number;
  caution:           number;
  cautionReglee:     boolean;
  avanceLoyer:       number;
  avanceLoyerReglee: boolean;
  moisDepuisEntree:  number;
  moisPayes:         number;
  moisEnAvance:      number;
  moisEnRetard:      number;
  montantDu:         number;
  montantPaye:       number;
  solde:             number;
  statutLoyer:       'AJour' | 'EnRetard' | 'Credit' | 'NonCommence';
  statutLoyerLabel:  string;
  dernierPaiement?:  string;
  mois:              MoisLoyer[];
}

// ── Service récap ─────────────────────────────────────────────
@Injectable({ providedIn: 'root' })
export class RecapContratService extends ApiService {
  getRecap(contratId: string): Observable<RecapFinancierContratDto> {
    return this.get<RecapFinancierContratDto>(`/contrats-location/${contratId}/recap-financier`);
  }
}

// ══════════════════════════════════════════════════════════════
//  COMPOSANT
// ══════════════════════════════════════════════════════════════
@Component({
  selector: 'kdi-contrats-location-list',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, DecimalPipe, DatePipe],
  template: `
<div class="cl-layout" [class.panel-open]="recap !== null || recapLoading">

  <!-- ══ LISTE ══ -->
  <div class="cl-list page-enter">

    <!-- Header -->
    <div class="cl-header">
      <div class="cl-header-left">
        <h1 class="cl-title">
          <svg class="cl-title-ico" viewBox="0 0 20 20" fill="currentColor"><path d="M10 2a1 1 0 00-.894.553L7.382 6H4a1 1 0 000 2v10a1 1 0 001 1h10a1 1 0 001-1V8a1 1 0 000-2h-3.382l-1.724-3.447A1 1 0 0010 2zm0 2.236L11.382 7H8.618L10 4.236zM6 9h8v8H6V9z"/></svg>
          Contrats de location
        </h1>
        <p class="cl-sub">Baux locatifs — gestion des locations en cours</p>
      </div>
      <button class="cl-btn-new" (click)="ouvrirModal()">
        <svg viewBox="0 0 16 16" fill="currentColor"><path d="M8 2a1 1 0 011 1v4h4a1 1 0 010 2H9v4a1 1 0 01-2 0V9H3a1 1 0 010-2h4V3a1 1 0 011-1z"/></svg>
        Nouveau bail
      </button>
    </div>

    <!-- Filtres -->
    <div class="cl-filters">
      <button class="cl-chip" [class.active]="filtreStatut===''"          (click)="setFiltre('')">Tous</button>
      <button class="cl-chip draft"    [class.active]="filtreStatut==='Brouillon'" (click)="setFiltre('Brouillon')">
        <span class="cl-chip-dot"></span>Brouillon
      </button>
      <button class="cl-chip active-c" [class.active]="filtreStatut==='Actif'"     (click)="setFiltre('Actif')">
        <span class="cl-chip-dot"></span>Actif
      </button>
      <button class="cl-chip suspend"  [class.active]="filtreStatut==='Suspendu'"  (click)="setFiltre('Suspendu')">
        <span class="cl-chip-dot"></span>Suspendu
      </button>
      <button class="cl-chip ended"    [class.active]="filtreStatut==='Termine'"   (click)="setFiltre('Termine')">
        <span class="cl-chip-dot"></span>Terminé
      </button>
    </div>

    <!-- Tableau -->
    <div class="cl-table-wrap">
      <table *ngIf="liste().items.length; else empty">
        <thead>
          <tr>
            <th>N° Bail</th>
            <th>Bien</th>
            <th>Locataire</th>
            <th class="r">Loyer</th>
            <th>Entrée</th>
            <th class="c">Statut</th>
            <th class="r">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let c of liste().items; let i=index"
              [class.selected]="recap?.contratId === c.id || (recapLoading && selectedId === c.id)"
              [style.animation-delay]="(i*25)+'ms'"
              (click)="toggleRecap(c)">

            <!-- N° Bail -->
            <td>
              <span class="bail-num">{{ c.numero }}</span>
            </td>

            <!-- Bien -->
            <td>
              <div class="bien-cell">
                <div class="bien-code">{{ c.produitCode }}</div>
              </div>
            </td>

            <!-- Locataire -->
            <td>
              <div class="loc-cell">
                <div class="loc-av" [style.background]="avatarColor(c.locataireNom)">
                  {{ initiales(c.locataireNom) }}
                </div>
                <div class="loc-nom">{{ c.locataireNom }}</div>
              </div>
            </td>

            <!-- Loyer -->
            <td class="r">
              <div class="loyer-val">{{ c.loyer | number:'1.0-0' }} <span class="mru">MRU</span></div>
              <div class="retard-tag" *ngIf="c.estEnRetard">⚠ Retard</div>
            </td>

            <!-- Date entrée -->
            <td>
              <span class="date-val">{{ c.dateEntree | date:'dd MMM yyyy' }}</span>
            </td>

            <!-- Statut -->
            <td class="c">
              <span class="statut-pill"
                [class.s-actif]="c.statutLabel==='Actif'"
                [class.s-brouillon]="c.statutLabel==='Brouillon'"
                [class.s-suspendu]="c.statutLabel==='Suspendu'"
                [class.s-termine]="c.statutLabel==='Termine' || c.statutLabel==='Resilie'">
                {{ c.statutLabel }}
              </span>
            </td>

            <!-- Actions -->
            <td (click)="$event.stopPropagation()">
              <div class="cl-acts">
                <button class="cl-act" title="Récap financier" (click)="toggleRecap(c)">
                  <svg viewBox="0 0 16 16" fill="none"><path d="M2 12h2v2H2zm3-4h2v6H5zm3-3h2v9H8zm3-3h2v12h-2z" fill="currentColor"/></svg>
                </button>
                <button *ngIf="c.statutLabel==='Brouillon'" class="cl-act-label green" (click)="activer(c)">
                  <svg viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="1.5"/><path d="M5.5 8l2 2 3-3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
                  Activer
                </button>
                <ng-container *ngIf="c.statutLabel==='Actif'">
                  <button class="cl-act-label blue" (click)="ouvrirAvenant(c)">
                    <svg viewBox="0 0 16 16" fill="none"><path d="M11 2l3 3-8 8H3v-3l8-8z" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>
                    Avenant
                  </button>
                  <button *ngIf="peutResilier()" class="cl-act-label red" (click)="ouvrirResiliation(c)">
                    <svg viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="1.5"/><path d="M5.5 5.5l5 5M10.5 5.5l-5 5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
                    Résilier
                  </button>
                </ng-container>
                <span *ngIf="c.statutLabel==='Resilie' || c.statutLabel==='Termine'" class="cl-closed">
                  <svg viewBox="0 0 16 16" fill="none"><rect x="3" y="7" width="10" height="7" rx="1.5" stroke="currentColor" stroke-width="1.4"/><path d="M5 7V5a3 3 0 016 0v2" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>
                  Clôturé
                </span>
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      <ng-template #empty>
        <div class="cl-empty">
          <div class="cl-empty-ico">🔑</div>
          <div class="cl-empty-h">Aucun contrat de location</div>
          <p class="cl-empty-p">Créez le premier bail locatif</p>
          <button class="cl-btn-new" (click)="ouvrirModal()">+ Nouveau bail</button>
        </div>
      </ng-template>
    </div>
  </div>

  <!-- ══ PANNEAU RÉCAP ══ -->
  <div class="recap-pane" *ngIf="recap !== null || recapLoading">
    <div class="rp-header">
      <div class="rp-title-block">
        <div class="rp-avatar">{{ recap?.locataireNom?.[0] ?? '?' }}</div>
        <div>
          <div class="rp-nom">{{ recap?.locataireNom ?? '…' }}</div>
          <div class="rp-code">{{ recap?.produitCode ?? '' }}</div>
        </div>
      </div>
      <button class="rp-close" (click)="closeRecap()">✕</button>
    </div>
    <div class="rp-loading" *ngIf="recapLoading">
      <div class="spinner-sm"></div> Chargement…
    </div>
    <ng-container *ngIf="recap && !recapLoading">
      <div class="statut-loyer" [ngClass]="'sl-' + recap.statutLoyer.toLowerCase()">
        <div class="sl-icon">
          {{ recap.statutLoyer === 'AJour'    ? '✅' :
             recap.statutLoyer === 'Credit'   ? '💚' :
             recap.statutLoyer === 'EnRetard' ? '🔴' : '⏳' }}
        </div>
        <div>
          <div class="sl-label">{{ recap.statutLoyerLabel }}</div>
          <div class="sl-detail" *ngIf="recap.moisEnRetard > 0">
            {{ recap.moisEnRetard }} mois impayé(s) · {{ recap.montantDu | number:'1.0-0' }} MRU dus
          </div>
          <div class="sl-detail" *ngIf="recap.moisEnAvance > 0">
            {{ recap.moisEnAvance }} mois d'avance · crédit {{ recap.solde | number:'1.0-0' }} MRU
          </div>
          <div class="sl-detail" *ngIf="recap.statutLoyer === 'AJour' && recap.moisEnAvance === 0">
            Tous les loyers sont à jour
          </div>
        </div>
      </div>
      <div class="kpi-row">
        <div class="kpi" [class.kpi-ok]="recap.cautionReglee" [class.kpi-ko]="!recap.cautionReglee">
          <div class="kpi-icon">🔒</div>
          <div class="kpi-label">Caution</div>
          <div class="kpi-val">{{ recap.caution | number:'1.0-0' }}</div>
          <div class="kpi-status">{{ recap.cautionReglee ? '✅ Réglée' : '❌ Non réglée' }}</div>
        </div>
        <div class="kpi" [class.kpi-ok]="recap.avanceLoyerReglee" [class.kpi-ko]="!recap.avanceLoyerReglee">
          <div class="kpi-icon">💵</div>
          <div class="kpi-label">Avance</div>
          <div class="kpi-val">{{ recap.avanceLoyer | number:'1.0-0' }}</div>
          <div class="kpi-status">{{ recap.avanceLoyerReglee ? '✅ Réglée' : '❌ Non réglée' }}</div>
        </div>
        <div class="kpi">
          <div class="kpi-icon">📅</div>
          <div class="kpi-label">Loyers payés</div>
          <div class="kpi-val">{{ recap.moisPayes }}/{{ recap.moisDepuisEntree }}</div>
          <div class="kpi-status">mois</div>
        </div>
      </div>
      <div class="solde-row">
        <div class="solde-item">
          <span class="si-label">Total dû</span>
          <span class="si-val">{{ recap.montantDu | number:'1.0-0' }} MRU</span>
        </div>
        <div class="solde-item">
          <span class="si-label">Total payé</span>
          <span class="si-val si-ok">{{ recap.montantPaye | number:'1.0-0' }} MRU</span>
        </div>
        <div class="solde-item" [class.solde-positif]="recap.solde >= 0" [class.solde-negatif]="recap.solde < 0">
          <span class="si-label">Solde</span>
          <span class="si-val">{{ recap.solde >= 0 ? '+' : '' }}{{ recap.solde | number:'1.0-0' }} MRU</span>
        </div>
      </div>
      <div class="mois-section">
        <div class="mois-title">Historique des loyers</div>
        <div class="mois-grid">
          <div class="mois-cell" *ngFor="let m of recap.mois"
               [ngClass]="'mc-' + m.statut.toLowerCase()"
               [title]="m.label + ' : ' + (m.montantPaye | number:'1.0-0') + ' / ' + (m.montant | number:'1.0-0') + ' MRU'">
            <div class="mc-label">{{ m.label }}</div>
            <div class="mc-icon">
              {{ m.statut === 'Paye'    ? '✓' :
                 m.statut === 'Partiel' ? '½' :
                 m.statut === 'Impaye'  ? '✗' :
                 m.statut === 'Avance'  ? '★' : '·' }}
            </div>
            <div class="mc-montant" *ngIf="m.statut !== 'Futur'">{{ m.montantPaye | number:'1.0-0' }}</div>
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
      <div class="last-payment" *ngIf="recap.dernierPaiement">
        <span>🕐</span> Dernier paiement : <strong>{{ recap.dernierPaiement | date:'dd/MM/yyyy' }}</strong>
      </div>
      <div class="rp-actions">
        <button class="cl-btn-new full" (click)="ouvrirSaisieLoyer()">💰 Saisir un loyer</button>
      </div>
    </ng-container>
  </div>

</div>
  `,
  styles: [`

    /* ══ TOKENS ══ */
    :host {
      --navy:   #0D1B2A;
      --navy2:  #1B2B3A;
      --gold:   #C9A84C;
      --gold-l: #E8C96A;
      --ok:     #16a34a; --ok-bg: #dcfce7;
      --late:   #dc2626; --late-bg: #fee2e2;
      --blue:   #1d4ed8; --blue-bg: #dbeafe;
      --amber:  #d97706; --amber-bg: #fef3c7;
      --surf:   #F5F7FA; --surf2: #EEF1F6; --bord: #E2E8F0;
      --t1: #0F172A; --t2: #475569; --t3: #94a3b8;
      --r: 10px; --r2: 14px;
      --shadow: 0 1px 3px rgba(0,0,0,.07), 0 4px 16px rgba(0,0,0,.05);
      font-family: 'DM Sans','Segoe UI',sans-serif;
      display: block;
    }

    /* ══ LAYOUT ══ */
    .cl-layout { display: grid; grid-template-columns: 1fr; gap: 20px; }
    .cl-layout.panel-open { grid-template-columns: 1fr 360px; align-items: start; }

    /* ══ HEADER ══ */
    .cl-header {
      display: flex; align-items: flex-start; justify-content: space-between;
      margin-bottom: 18px; gap: 16px; flex-wrap: wrap;
    }
    .cl-title {
      display: flex; align-items: center; gap: 10px;
      font-size: 21px; font-weight: 800; color: var(--t1); margin: 0 0 4px;
    }
    .cl-title-ico { width: 22px; height: 22px; color: var(--gold); flex-shrink: 0; }
    .cl-sub { font-size: 12.5px; color: var(--t3); margin: 0; }

    .cl-btn-new {
      display: inline-flex; align-items: center; gap: 7px;
      padding: 10px 18px; background: var(--gold); color: var(--navy);
      border: none; border-radius: var(--r); font-size: 13px; font-weight: 700;
      cursor: pointer; font-family: inherit; transition: all .18s; white-space: nowrap; flex-shrink: 0;
    }
    .cl-btn-new svg { width: 14px; height: 14px; }
    .cl-btn-new:hover { background: var(--gold-l); box-shadow: 0 4px 14px rgba(201,168,76,.4); transform: translateY(-1px); }
    .cl-btn-new.full { width: 100%; justify-content: center; }

    /* ══ FILTRES ══ */
    .cl-filters { display: flex; gap: 6px; margin-bottom: 16px; flex-wrap: wrap; }
    .cl-chip {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 7px 14px; border-radius: 20px;
      border: 1.5px solid var(--bord); background: #fff;
      font-size: 12.5px; font-weight: 600; color: var(--t2);
      cursor: pointer; transition: all .14s; font-family: inherit;
    }
    .cl-chip:hover { border-color: var(--navy); color: var(--navy); }
    .cl-chip.active { background: var(--navy); color: var(--gold-l); border-color: var(--navy); }
    .cl-chip-dot { width: 6px; height: 6px; border-radius: 50%; background: currentColor; opacity: .6; flex-shrink: 0; }
    .cl-chip.draft.active    { background: #64748b; border-color: #64748b; color: #fff; }
    .cl-chip.active-c.active { background: var(--ok); border-color: var(--ok); color: #fff; }
    .cl-chip.suspend.active  { background: var(--amber); border-color: var(--amber); color: #fff; }
    .cl-chip.ended.active    { background: var(--late); border-color: var(--late); color: #fff; }

    /* ══ TABLEAU ══ */
    .cl-table-wrap { background: #fff; border-radius: var(--r2); box-shadow: var(--shadow); overflow: hidden; }
    table { width: 100%; border-collapse: collapse; }
    thead th {
      padding: 11px 14px; background: var(--navy);
      color: rgba(255,255,255,.45); font-size: 10.5px; font-weight: 700;
      text-transform: uppercase; letter-spacing: .7px; text-align: left; white-space: nowrap;
    }
    th.r { text-align: right; } th.c { text-align: center; }
    tbody tr {
      border-bottom: 1px solid var(--surf2);
      cursor: pointer; transition: background .1s;
      animation: fadeUp .28s ease both;
    }
    @keyframes fadeUp { from { opacity:0; transform:translateY(5px); } to { opacity:1; transform:none; } }
    tbody tr:last-child { border-bottom: none; }
    tbody tr:hover { background: var(--surf); }
    tbody tr.selected td { background: #eff6ff !important; }
    tbody tr.selected td:first-child { border-left: 3px solid var(--blue); }
    tbody td { padding: 12px 14px; vertical-align: middle; }
    td.r { text-align: right; } td.c { text-align: center; }

    .bail-num {
      font-family: monospace; font-size: 12px; font-weight: 700;
      background: var(--surf2); color: var(--navy);
      padding: 3px 9px; border-radius: 6px; white-space: nowrap;
    }
    .bien-code { font-size: 13px; font-weight: 700; color: var(--t1); font-family: monospace; }
    .loc-cell { display: flex; align-items: center; gap: 9px; }
    .loc-av {
      width: 32px; height: 32px; border-radius: 8px;
      display: flex; align-items: center; justify-content: center;
      font-size: 11px; font-weight: 800; color: #fff; flex-shrink: 0;
    }
    .loc-nom { font-size: 13px; font-weight: 600; color: var(--t1); }
    .loyer-val { font-size: 13.5px; font-weight: 700; color: var(--t1); }
    .mru { font-size: 10px; font-weight: 500; color: var(--t3); }
    .retard-tag { font-size: 10.5px; font-weight: 700; color: var(--late); margin-top: 2px; }
    .date-val { font-size: 12.5px; color: var(--t2); }

    .statut-pill {
      display: inline-flex; padding: 4px 11px; border-radius: 20px;
      font-size: 11.5px; font-weight: 700; white-space: nowrap;
    }
    .s-actif     { background: var(--ok-bg);   color: var(--ok); }
    .s-brouillon { background: var(--surf2);    color: var(--t2); }
    .s-suspendu  { background: var(--amber-bg); color: var(--amber); }
    .s-termine   { background: var(--late-bg);  color: var(--late); }

    /* Actions tableau */
    .cl-acts { display: flex; align-items: center; gap: 5px; justify-content: flex-end; flex-wrap: wrap; }
    .cl-act {
      width: 30px; height: 30px; border-radius: 7px;
      border: 1.5px solid var(--bord); background: #fff; color: var(--t3);
      display: flex; align-items: center; justify-content: center;
      cursor: pointer; transition: all .13s; flex-shrink: 0;
    }
    .cl-act svg { width: 14px; height: 14px; }
    .cl-act:hover { background: var(--navy); color: var(--gold-l); border-color: var(--navy); }
    .cl-act-label {
      display: inline-flex; align-items: center; gap: 5px;
      height: 30px; padding: 0 10px; border-radius: 7px;
      border: 1.5px solid transparent; font-size: 11.5px; font-weight: 600;
      cursor: pointer; transition: all .13s; font-family: inherit; white-space: nowrap;
    }
    .cl-act-label svg { width: 12px; height: 12px; }
    .cl-act-label.green { background: var(--ok-bg);   color: var(--ok);   border-color: #86efac; }
    .cl-act-label.green:hover { background: var(--ok); color: #fff; }
    .cl-act-label.blue  { background: var(--blue-bg); color: var(--blue); border-color: #93c5fd; }
    .cl-act-label.blue:hover  { background: var(--blue); color: #fff; }
    .cl-act-label.red   { background: var(--late-bg); color: var(--late); border-color: #fca5a5; }
    .cl-act-label.red:hover   { background: var(--late); color: #fff; }
    .cl-closed { display: inline-flex; align-items: center; gap: 4px; font-size: 11.5px; color: var(--t3); padding: 0 6px; }
    .cl-closed svg { width: 12px; height: 12px; }

    /* Empty */
    .cl-empty { text-align: center; padding: 60px 20px; }
    .cl-empty-ico { font-size: 48px; margin-bottom: 12px; }
    .cl-empty-h { font-size: 16px; font-weight: 700; color: var(--t1); margin-bottom: 6px; }
    .cl-empty-p { font-size: 13px; color: var(--t3); margin: 0 0 16px; }

    /* ══ PANNEAU RÉCAP ══ */
    .recap-pane {
      background: #fff; border-radius: var(--r2); overflow: hidden;
      box-shadow: 0 4px 24px rgba(14,28,56,.12);
      position: sticky; top: 20px;
      max-height: calc(100vh - 60px); overflow-y: auto;
    }
    .recap-pane::-webkit-scrollbar { width: 3px; }
    .recap-pane::-webkit-scrollbar-thumb { background: var(--bord); }
    .rp-header { display:flex; align-items:center; justify-content:space-between; padding:14px 16px; background:var(--navy); }
    .rp-title-block { display:flex; align-items:center; gap:10px; }
    .rp-avatar { width:36px; height:36px; background:var(--gold); border-radius:50%; display:flex; align-items:center; justify-content:center; font-weight:800; font-size:15px; color:var(--navy); flex-shrink:0; }
    .rp-nom  { font-size:13px; font-weight:700; color:#fff; }
    .rp-code { font-size:11px; color:rgba(255,255,255,.4); font-family:monospace; margin-top:2px; }
    .rp-close { background:rgba(255,255,255,.1); border:none; color:#fff; width:26px; height:26px; border-radius:6px; cursor:pointer; font-size:13px; display:flex; align-items:center; justify-content:center; }
    .rp-close:hover { background:rgba(220,38,38,.3); }
    .rp-loading { display:flex; align-items:center; gap:10px; padding:28px; color:var(--t3); font-size:13px; }
    .spinner-sm { width:16px; height:16px; border:2px solid var(--bord); border-top-color:var(--navy); border-radius:50%; animation:spin .7s linear infinite; flex-shrink:0; }
    @keyframes spin { to { transform:rotate(360deg); } }
    .statut-loyer { display:flex; align-items:flex-start; gap:10px; padding:13px 16px; border-bottom:1px solid var(--surf2); }
    .sl-ajour{background:var(--ok-bg)}.sl-credit{background:#ecfdf5}.sl-enretard{background:var(--late-bg)}.sl-noncommence{background:var(--surf)}
    .sl-icon{font-size:20px;flex-shrink:0;margin-top:2px}.sl-label{font-size:13px;font-weight:700;color:var(--t1)}.sl-detail{font-size:11px;color:var(--t3);margin-top:3px}
    .kpi-row{display:grid;grid-template-columns:1fr 1fr 1fr;gap:5px;padding:10px 14px;border-bottom:1px solid var(--surf2)}
    .kpi{background:var(--surf);border-radius:8px;padding:9px 5px;text-align:center;border:1px solid var(--bord)}
    .kpi-ok{border-color:#86efac!important;background:var(--ok-bg)}.kpi-ko{border-color:#fca5a5!important;background:var(--late-bg)}
    .kpi-icon{font-size:15px;margin-bottom:2px}.kpi-label{font-size:9px;color:var(--t3);text-transform:uppercase;letter-spacing:.5px}
    .kpi-val{font-size:12px;font-weight:700;color:var(--t1);margin:2px 0}.kpi-status{font-size:9px;color:var(--t3)}
    .solde-row{display:grid;grid-template-columns:1fr 1fr 1fr;background:var(--surf2);gap:1px;border-bottom:1px solid var(--surf2)}
    .solde-item{background:#fff;padding:9px 10px;text-align:center}
    .si-label{display:block;font-size:9px;color:var(--t3);text-transform:uppercase;letter-spacing:.5px;margin-bottom:3px}
    .si-val{font-size:11px;font-weight:700;color:var(--t1)}.si-ok{color:var(--ok)}
    .solde-positif .si-val{color:var(--ok)}.solde-negatif .si-val{color:var(--late)}
    .mois-section{padding:11px 14px;border-bottom:1px solid var(--surf2)}
    .mois-title{font-size:10px;font-weight:600;color:var(--t3);text-transform:uppercase;letter-spacing:.5px;margin-bottom:7px}
    .mois-grid{display:grid;grid-template-columns:repeat(6,1fr);gap:3px}
    .mois-cell{text-align:center;padding:4px 2px;border-radius:5px}
    .mc-paye{background:#d1fae5}.mc-partiel{background:#fef3c7}.mc-impaye{background:#fee2e2}.mc-avance{background:#dbeafe}.mc-futur{background:var(--surf2);opacity:.6}
    .mc-label{font-size:7px;color:var(--t3);font-weight:600;text-transform:uppercase}.mc-icon{font-size:10px;margin:1px 0}
    .mc-paye .mc-icon{color:var(--ok)}.mc-partiel .mc-icon{color:var(--amber)}.mc-impaye .mc-icon{color:var(--late)}.mc-avance .mc-icon{color:var(--blue)}
    .mc-montant{font-size:7px;color:var(--t3)}
    .mois-legend{display:flex;flex-wrap:wrap;gap:5px;margin-top:5px}
    .leg{font-size:9px;color:var(--t3);display:flex;align-items:center;gap:3px}
    .leg::before{content:'';display:inline-block;width:7px;height:7px;border-radius:2px}
    .leg-paye::before{background:#d1fae5}.leg-partiel::before{background:#fef3c7}.leg-impaye::before{background:#fee2e2}.leg-avance::before{background:#dbeafe}.leg-futur::before{background:var(--surf2)}
    .last-payment{padding:9px 14px;font-size:11px;color:var(--t3);border-bottom:1px solid var(--surf2);display:flex;align-items:center;gap:6px}
    .rp-actions{padding:12px 14px}

  `]
})
export class ContratsLocationListComponent implements OnInit, OnDestroy {
  private svc        = inject(ContratsLocationService);
  private auth       = inject(AuthService);
  private produitSvc = inject(ProduitsService);
  private locatSvc   = inject(LocatairesService);
  private recapSvc   = inject(RecapContratService);
  private zone       = inject(NgZone);

  liste = signal<PagedList<ContratLocationListItemDto>>({
    items:[], totalCount:0, page:1, pageSize:20, totalPages:0, hasNext:false, hasPrevious:false
  });
  filtreStatut = '';

  // ── Récap financier ──
  recap:        RecapFinancierContratDto | null = null;
  recapLoading  = false;
  selectedId    = '';
  private currentContrat: ContratLocationListItemDto | null = null;

  // ── Modal nouveau bail ──
  etape      = 1;
  submitting = false;

  // ── stepLabels dynamique selon le produit sélectionné ──
  get stepLabels(): string[] {
    return this.produitNeedIndexStep()
      ? ['Bien & locataire', 'Conditions financières', 'Index & compteurs', 'Documents & récap']
      : ['Bien & locataire', 'Conditions financières', 'Documents & récap'];
  }

  // ── Étape index : existe seulement si le produit a des compteurs ou est une chambre ──
  produitNeedIndexStep(): boolean {
    if (!this.produitSel) return false;
    const type = (this.produitSel.type ?? this.produitSel.typeLabel ?? "").toString();
    if (type === "Chambre") return true;
    if (type === "Appartement") return !!(this.produitSel.hasCompteurElec || this.produitSel.hasCompteurEau);
    if (type === "Boutique")    return true; // élec toujours obligatoire
    return !!(this.produitSel.hasCompteurElec || this.produitSel.hasCompteurEau);
  }

  // ── Étape "Documents" = étape 3 ou 4 selon produit ──
  get etapeDocuments(): number { return this.produitNeedIndexStep() ? 4 : 3; }

  produitSel:       any   = null;
  produitDetailLoading = false; // bloque "Suivant" le temps du getById
  produitResultats: any[] = [];
  searchProduit   = '';

  locataireSel:       any   = null;
  locataireResultats: any[] = [];
  searchLocataire   = '';

  timerProduit:   any;
  timerLocataire: any;

  docContrat: File | null = null;
  photosEdl:  File[]      = [];

  step2 = {
    loyer: '' as any, caution: '' as any, avanceLoyer: '' as any,
    periodicite: 'Mensuel',
    dateEntree: new Date().toISOString().slice(0,10),
    dateSortiePrevue: '',
    jourDebutPaiement: 1, jourFinPaiement: 5,
    destinationBien: 'Habitation',
    conditionsParticulieres: '',
    indexElecEntree: '' as any,
    indexEauEntree:  '' as any
  };

  // ── Dérogation PDG : permet l'antidatage du contrat ──
  derogationActive = false;

  private overlayEl: HTMLElement | null = null;

  ngOnInit() { this.load(); }
  ngOnDestroy() { this.detruireOverlay(); }

  load() {
    this.svc.getAll({ statut: this.filtreStatut as StatutContrat || undefined })
      .subscribe(r => this.liste.set(r));
  }
  setFiltre(s: string) { this.filtreStatut = s; this.load(); }

  // ════════════════════════════════════════════════════════════
  //  RÉCAP FINANCIER
  // ════════════════════════════════════════════════════════════
  toggleRecap(c: ContratLocationListItemDto) {
    if (this.recap?.contratId === c.id) { this.closeRecap(); return; }
    this.recap        = null;
    this.recapLoading = true;
    this.selectedId   = c.id;
    this.currentContrat = c;
    this.recapSvc.getRecap(c.id).subscribe({
      next:  r  => { this.recap = r; this.recapLoading = false; },
      error: () => { this.recap = this.buildFallbackRecap(c); this.recapLoading = false; }
    });
  }

  closeRecap() {
    this.recap        = null;
    this.recapLoading = false;
    this.selectedId   = '';
    this.currentContrat = null;
  }

  ouvrirSaisieLoyer() {
    if (!this.currentContrat) return;
    window.location.href = `/collectes/saisir?contratId=${this.currentContrat.id}`;
  }

  private buildFallbackRecap(c: ContratLocationListItemDto): RecapFinancierContratDto {
    const entree    = new Date(c.dateEntree);
    const now       = new Date();
    const moisTotal = Math.max(0,
      (now.getFullYear() - entree.getFullYear()) * 12 + (now.getMonth() - entree.getMonth())
    );
    const moisLabels = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'];
    const mois: MoisLoyer[] = [];
    for (let i = 0; i <= Math.min(moisTotal + 1, 11); i++) {
      const d      = new Date(entree.getFullYear(), entree.getMonth() + i, 1);
      const label  = moisLabels[d.getMonth()] + ' ' + String(d.getFullYear()).slice(2);
      const periode= `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      mois.push({ periode, label, montant: c.loyer, montantPaye: 0, statut: i >= moisTotal ? 'Futur' : 'Impaye' });
    }
    const montantDu = moisTotal * c.loyer;
    return {
      contratId: c.id, locataireNom: c.locataireNom, produitCode: c.produitCode, loyer: c.loyer,
      caution: c.caution ?? 0, cautionReglee: c.cautionReglee ?? false, avanceLoyer: c.avanceLoyer ?? 0, avanceLoyerReglee: c.avanceLoyerReglee ?? false,
      moisDepuisEntree: moisTotal, moisPayes: 0, moisEnAvance: 0, moisEnRetard: moisTotal,
      montantDu, montantPaye: 0, solde: -montantDu,
      statutLoyer:      moisTotal === 0 ? 'NonCommence' : 'EnRetard',
      statutLoyerLabel: moisTotal === 0
        ? 'Pas encore commencé'
        : `En retard — ${moisTotal} mois non payé${moisTotal > 1 ? 's' : ''}`,
      mois
    };
  }

  // ════════════════════════════════════════════════════════════
  //  ACTIVATION
  // ════════════════════════════════════════════════════════════
  activer(c: ContratLocationListItemDto) { this.ouvrirModalActivation(c); }

  private ouvrirModalActivation(c: ContratLocationListItemDto) {
    const checklist = {
      cautionReglee:      false,
      avanceLoyerReglee:  false,
      contratSigne:       false,
      edlEntreeValide:    false,
      photosAvantRemise:  false,
    };
    const render = () => {
      const allOk = Object.values(checklist).every(v => v);
      const item = (key: keyof typeof checklist, label: string, icon: string) => {
        const checked = checklist[key];
        return `
          <label data-key="${key}" style="display:flex;align-items:center;gap:12px;padding:11px 14px;border-radius:9px;cursor:pointer;
                 background:${checked ? '#f0fdf4' : '#f8fafc'};border:1.5px solid ${checked ? '#86efac' : '#e2e8f0'};
                 margin-bottom:8px;transition:all .15s;user-select:none">
            <div style="width:20px;height:20px;border-radius:5px;border:2px solid ${checked ? '#22c55e' : '#cbd5e1'};
                 background:${checked ? '#22c55e' : '#fff'};display:flex;align-items:center;justify-content:center;flex-shrink:0">
              ${checked ? '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>' : ''}
            </div>
            <span style="font-size:13px;color:${checked ? '#15803d' : '#475569'};font-weight:${checked ? '600' : '400'}">${icon} ${label}</span>
          </label>`;
      };
      const html = `
        <div style="position:fixed;inset:0;background:rgba(14,28,56,.55);backdrop-filter:blur(4px);z-index:99999;
             display:flex;align-items:center;justify-content:center;font-family:'DM Sans','Inter',sans-serif" id="kdi-activ-overlay">
          <div style="background:#fff;border-radius:14px;width:460px;max-width:94vw;
               box-shadow:0 12px 40px rgba(14,28,56,.18);overflow:hidden">
            <div style="padding:18px 22px 14px;border-bottom:1px solid #e2e8f0;display:flex;align-items:center;gap:10px">
              <div style="width:36px;height:36px;border-radius:9px;background:linear-gradient(135deg,#c9a96e,#dfc28e);
                   display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0">🔑</div>
              <div>
                <div style="font-weight:700;font-size:15px;color:#0e1c38">Activer le bail ${c.numero}</div>
                <div style="font-size:12px;color:#64748b;margin-top:1px">${c.locataireNom} — ${c.produitCode}</div>
              </div>
              <button id="kdi-activ-close" style="margin-left:auto;width:28px;height:28px;border:none;background:#f1f5f9;
                   border-radius:7px;cursor:pointer;font-size:15px;color:#64748b">✕</button>
            </div>
            <div style="padding:20px 22px">
              <div style="font-size:12px;font-weight:600;color:#94a3b8;text-transform:uppercase;letter-spacing:.8px;margin-bottom:12px">
                Checklist obligatoire avant remise des clés
              </div>
              ${item('cautionReglee',     'Caution encaissée',          '💰')}
              ${item('avanceLoyerReglee', 'Avance loyer encaissée',     '💵')}
              ${item('contratSigne',      'Contrat signé (2 parties)',  '📝')}
              ${item('edlEntreeValide',   'État des lieux signé',       '📋')}
              ${item('photosAvantRemise', 'Photos avant remise clés',   '📸')}
              ${!allOk ? `
                <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:10px 12px;
                     font-size:12px;color:#92400e;display:flex;align-items:center;gap:7px;margin-top:4px">
                  ⚠️ Cochez toutes les conditions pour activer le bail.
                </div>` : `
                <div style="background:#f0fdf4;border:1px solid #86efac;border-radius:8px;padding:10px 12px;
                     font-size:12px;color:#166534;display:flex;align-items:center;gap:7px;margin-top:4px">
                  ✅ Toutes les conditions sont remplies — le bail peut être activé.
                </div>`}
            </div>
            <div style="padding:14px 22px;border-top:1px solid #e2e8f0;background:#f8fafc;
                 display:flex;justify-content:space-between;align-items:center">
              <button id="kdi-activ-cancel" style="padding:8px 16px;border-radius:8px;border:1px solid #e2e8f0;
                   background:#fff;color:#475569;font-family:inherit;font-size:13px;cursor:pointer">Annuler</button>
              <button id="kdi-activ-confirm" ${!allOk ? 'disabled' : ''} style="padding:8px 20px;border-radius:8px;border:none;
                   background:${allOk ? 'linear-gradient(135deg,#c9a96e,#dfc28e)' : '#e2e8f0'};
                   color:${allOk ? '#0e1c38' : '#94a3b8'};font-family:inherit;font-size:13px;font-weight:600;
                   cursor:${allOk ? 'pointer' : 'not-allowed'};transition:all .2s">
                🔑 Activer le bail
              </button>
            </div>
          </div>
        </div>`;
      let existing = document.getElementById('kdi-activ-overlay');
      if (existing) existing.remove();
      const wrapper = document.createElement('div');
      wrapper.innerHTML = html;
      const overlay = wrapper.firstElementChild as HTMLElement;
      document.body.appendChild(overlay);
      overlay.querySelectorAll('[data-key]').forEach(el => {
        el.addEventListener('click', () => this.zone.run(() => {
          const key = (el as HTMLElement).dataset['key'] as keyof typeof checklist;
          checklist[key] = !checklist[key];
          render();
        }));
      });
      overlay.querySelector('#kdi-activ-close')?.addEventListener('click',  () => this.zone.run(() => overlay.remove()));
      overlay.querySelector('#kdi-activ-cancel')?.addEventListener('click', () => this.zone.run(() => overlay.remove()));
      overlay.querySelector('#kdi-activ-confirm')?.addEventListener('click', () => this.zone.run(() => {
        if (!Object.values(checklist).every(v => v)) return;
        overlay.remove();
        this.svc.activer(c.id, checklist).subscribe({
          next:  () => this.load(),
          error: () => alert('Erreur lors de l\'activation du bail.')
        });
      }));
    };
    render();
  }

  isDirection() { return this.auth.isDirection(); }
  peutResilier() { return this.auth.isPdg(); }

  avatarColor(nom: string): string {
    const colors = ['#0D1B2A','#1B3A5C','#0F3460','#1A4731','#533483','#7B3F00','#2B4865'];
    let h = 0; for (const c of nom) h = (h * 31 + c.charCodeAt(0)) & 0xFFFFFF;
    return colors[Math.abs(h) % colors.length];
  }
  initiales(nom: string): string {
    return nom.split(' ').map((w: string) => w[0] ?? '').join('').toUpperCase().slice(0, 2);
  }

  // ════════════════════════════════════════════════════════════
  //  RÉSILIATION
  // ════════════════════════════════════════════════════════════
  ouvrirResiliation(c: ContratLocationListItemDto) {
    let motif = '';
    let dateRes = new Date().toISOString().slice(0,10);
    const render = () => {
      const html = `
        <div style="position:fixed;inset:0;background:rgba(14,28,56,.55);backdrop-filter:blur(4px);z-index:99999;
             display:flex;align-items:center;justify-content:center;font-family:'DM Sans','Inter',sans-serif" id="kdi-resil-overlay">
          <div style="background:#fff;border-radius:14px;width:460px;max-width:94vw;box-shadow:0 12px 40px rgba(14,28,56,.18);overflow:hidden">
            <div style="padding:18px 22px 14px;border-bottom:1px solid #e2e8f0;display:flex;align-items:center;gap:10px">
              <div style="width:36px;height:36px;border-radius:9px;background:#fee2e2;display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0">⛔</div>
              <div>
                <div style="font-weight:700;font-size:15px;color:#0e1c38">Résilier le bail ${c.numero}</div>
                <div style="font-size:12px;color:#64748b;margin-top:1px">${c.locataireNom} — ${c.produitCode}</div>
              </div>
              <button id="kdi-resil-close" style="margin-left:auto;width:28px;height:28px;border:none;background:#f1f5f9;border-radius:7px;cursor:pointer;font-size:15px">✕</button>
            </div>
            <div style="padding:20px 22px">
              <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:8px;padding:10px 12px;font-size:12px;color:#c2410c;margin-bottom:16px">
                ⚠️ Cette action est <strong>irréversible</strong>. Le bail sera résilié et le bien libéré.
              </div>
              <div style="margin-bottom:14px">
                <label style="font-size:12px;font-weight:600;color:#4a5878;display:block;margin-bottom:6px">Date de résiliation *</label>
                <input id="kdi-resil-date" type="date" value="${dateRes}"
                  style="padding:8px 11px;border:1.5px solid #e3e8f0;border-radius:7px;font-family:inherit;font-size:.85rem;width:100%;box-sizing:border-box">
              </div>
              <div>
                <label style="font-size:12px;font-weight:600;color:#4a5878;display:block;margin-bottom:6px">Motif de résiliation *</label>
                <textarea id="kdi-resil-motif" rows="3"
                  style="padding:8px 11px;border:1.5px solid #e3e8f0;border-radius:7px;font-family:inherit;font-size:.85rem;width:100%;box-sizing:border-box;resize:vertical"
                  placeholder="Ex : Non-paiement du loyer, départ volontaire…">${motif}</textarea>
              </div>
            </div>
            <div style="padding:14px 22px;border-top:1px solid #e2e8f0;background:#f8fafc;display:flex;justify-content:space-between">
              <button id="kdi-resil-cancel" style="padding:8px 16px;border-radius:8px;border:1px solid #e2e8f0;background:#fff;color:#475569;font-family:inherit;font-size:13px;cursor:pointer">Annuler</button>
              <button id="kdi-resil-confirm" style="padding:8px 20px;border-radius:8px;border:none;background:#dc2626;color:#fff;font-family:inherit;font-size:13px;font-weight:600;cursor:pointer">
                ⛔ Confirmer la résiliation
              </button>
            </div>
          </div>
        </div>`;
      document.getElementById('kdi-resil-overlay')?.remove();
      const wrap = document.createElement('div'); wrap.innerHTML = html;
      const overlay = wrap.firstElementChild as HTMLElement;
      document.body.appendChild(overlay);
      overlay.querySelector('#kdi-resil-date')?.addEventListener('input',   (ev) => this.zone.run(() => { dateRes = (ev.target as HTMLInputElement).value; }));
      overlay.querySelector('#kdi-resil-motif')?.addEventListener('input',  (ev) => this.zone.run(() => { motif  = (ev.target as HTMLTextAreaElement).value; }));
      overlay.querySelector('#kdi-resil-close')?.addEventListener('click',  () => this.zone.run(() => overlay.remove()));
      overlay.querySelector('#kdi-resil-cancel')?.addEventListener('click', () => this.zone.run(() => overlay.remove()));
      overlay.querySelector('#kdi-resil-confirm')?.addEventListener('click', () => this.zone.run(() => {
        if (!motif.trim() || !dateRes) { alert('Veuillez renseigner la date et le motif.'); return; }
        overlay.remove();
        this.svc.resilier(c.id, motif, new Date(dateRes)).subscribe({
          next:  () => this.load(),
          error: () => alert('Erreur lors de la résiliation.')
        });
      }));
    };
    render();
  }

  // ════════════════════════════════════════════════════════════
  //  AVENANT
  // ════════════════════════════════════════════════════════════
  ouvrirAvenant(c: ContratLocationListItemDto) {
    this.svc.getById(c.id).subscribe({
      next:  (detail: any) => this.zone.run(() => this.afficherModalAvenant(c, detail)),
      error: ()            => this.zone.run(() => this.afficherModalAvenant(c, c))
    });
  }

  private afficherModalAvenant(c: ContratLocationListItemDto, detail: any) {
    const typeProduit: string = detail.typeProduit ?? detail.produitType ?? '';
    const isChambre      = typeProduit === 'Chambre';
    const needsCompteurs = ['Appartement','Boutique'].includes(typeProduit);
    let av = {
      nouveauLoyer:    detail.loyer ?? '',
      nouvelleDateSortie: detail.dateSortiePrevue ?? '',
      conditionsParticulieres: '',
      motif: '',
      hasCompteurElec: detail.hasCompteurElec ?? false,
      hasCompteurEau:  detail.hasCompteurEau  ?? false,
      indexElec:  '' as any,
      indexEau:   '' as any,
    };
    const render = () => {
      const lbl = (t: string) => `<label style="font-size:12px;font-weight:600;color:#4a5878;display:block;margin-bottom:5px">${t}</label>`;
      const inp = (id: string, type: string, val: any, ph = '') =>
        `<input id="${id}" type="${type}" value="${val}" placeholder="${ph}"
          style="padding:8px 11px;border:1.5px solid #e3e8f0;border-radius:7px;font-family:inherit;font-size:.84rem;width:100%;box-sizing:border-box">`;
      let compteurSection = '';
      if (needsCompteurs) {
        compteurSection = `
          <div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:10px;padding:14px;margin-bottom:14px">
            <div style="font-size:12px;font-weight:700;color:#0369a1;margin-bottom:12px">⚡💧 Compteurs — ${typeProduit}</div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
              <div>
                <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px">
                  <input type="checkbox" id="kdi-av-has-elec" ${av.hasCompteurElec ? 'checked' : ''} style="width:15px;height:15px;cursor:pointer">
                  ${lbl('⚡ Compteur électrique')}
                </div>
                ${av.hasCompteurElec ? inp('kdi-av-idx-elec','number',av.indexElec,'Index relevé') : '<div style="font-size:11px;color:#94a3b8;padding:4px 0">Non installé</div>'}
              </div>
              <div>
                <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px">
                  <input type="checkbox" id="kdi-av-has-eau" ${av.hasCompteurEau ? 'checked' : ''} style="width:15px;height:15px;cursor:pointer">
                  ${lbl('💧 Compteur eau')}
                </div>
                ${av.hasCompteurEau ? inp('kdi-av-idx-eau','number',av.indexEau,'Index relevé') : '<div style="font-size:11px;color:#94a3b8;padding:4px 0">Non installé</div>'}
              </div>
            </div>
          </div>`;
      } else if (isChambre) {
        compteurSection = `
          <div style="background:#faf5ff;border:1px solid #e9d5ff;border-radius:10px;padding:14px;margin-bottom:14px">
            <div style="font-size:12px;font-weight:700;color:#7c3aed;margin-bottom:4px">⚡💧 Compteurs partagés — Chambre</div>
            <div style="font-size:11px;color:#8b5cf6;margin-bottom:12px">Les compteurs sont mutualisés</div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
              <div>${lbl('⚡ Index électricité')}${inp('kdi-av-idx-elec','number',av.indexElec,'Index partagé')}</div>
              <div>${lbl('💧 Index eau')}${inp('kdi-av-idx-eau','number',av.indexEau,'Index partagé')}</div>
            </div>
          </div>`;
      }
      const html = `
        <div style="position:fixed;inset:0;background:rgba(14,28,56,.55);backdrop-filter:blur(4px);z-index:99999;
             display:flex;align-items:center;justify-content:center;font-family:'DM Sans','Inter',sans-serif" id="kdi-av-overlay">
          <div style="background:#fff;border-radius:14px;width:520px;max-width:94vw;max-height:90vh;overflow-y:auto;
               box-shadow:0 12px 40px rgba(14,28,56,.18);display:flex;flex-direction:column">
            <div style="padding:18px 22px 14px;border-bottom:1px solid #e2e8f0;display:flex;align-items:center;gap:10px;position:sticky;top:0;background:#fff;z-index:2">
              <div style="width:36px;height:36px;border-radius:9px;background:linear-gradient(135deg,#dbeafe,#bfdbfe);display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0">📋</div>
              <div>
                <div style="font-weight:700;font-size:15px;color:#0e1c38">Avenant — ${c.numero}</div>
                <div style="font-size:12px;color:#64748b;margin-top:1px">${c.locataireNom} — ${c.produitCode}</div>
              </div>
              <button id="kdi-av-close" style="margin-left:auto;width:28px;height:28px;border:none;background:#f1f5f9;border-radius:7px;cursor:pointer;font-size:15px">✕</button>
            </div>
            <div style="padding:20px 22px;flex:1">
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px">
                <div>${lbl('Nouveau loyer (MRU)')}${inp('kdi-av-loyer','number',av.nouveauLoyer,'Inchangé si vide')}</div>
                <div>${lbl('Nouvelle date de sortie')}${inp('kdi-av-sortie','date',av.nouvelleDateSortie,'')}</div>
              </div>
              <div style="margin-bottom:14px">
                ${lbl('Motif *')}
                <textarea id="kdi-av-motif" rows="2"
                  style="padding:8px 11px;border:1.5px solid #e3e8f0;border-radius:7px;font-family:inherit;font-size:.84rem;width:100%;box-sizing:border-box;resize:vertical"
                  placeholder="Ex : Révision du loyer, prolongation…">${av.motif}</textarea>
              </div>
              <div style="margin-bottom:16px">
                ${lbl('Conditions particulières')}
                <textarea id="kdi-av-cond" rows="2"
                  style="padding:8px 11px;border:1.5px solid #e3e8f0;border-radius:7px;font-family:inherit;font-size:.84rem;width:100%;box-sizing:border-box;resize:vertical">${av.conditionsParticulieres}</textarea>
              </div>
              ${compteurSection}
            </div>
            <div style="padding:14px 22px;border-top:1px solid #e2e8f0;background:#f8fafc;display:flex;justify-content:space-between;position:sticky;bottom:0">
              <button id="kdi-av-cancel" style="padding:8px 16px;border-radius:8px;border:1px solid #e2e8f0;background:#fff;color:#475569;font-family:inherit;font-size:13px;cursor:pointer">Annuler</button>
              <button id="kdi-av-confirm" style="padding:8px 20px;border-radius:8px;border:none;background:linear-gradient(135deg,#1d4ed8,#2563eb);color:#fff;font-family:inherit;font-size:13px;font-weight:600;cursor:pointer">
                📋 Enregistrer l'avenant
              </button>
            </div>
          </div>
        </div>`;
      document.getElementById('kdi-av-overlay')?.remove();
      const wrap = document.createElement('div'); wrap.innerHTML = html;
      const overlay = wrap.firstElementChild as HTMLElement;
      document.body.appendChild(overlay);
      const bind = (id: string, field: keyof typeof av) => {
        overlay.querySelector(`#${id}`)?.addEventListener('input', (ev) =>
          this.zone.run(() => { (av as any)[field] = (ev.target as HTMLInputElement).value; }));
      };
      bind('kdi-av-loyer',    'nouveauLoyer');
      bind('kdi-av-sortie',   'nouvelleDateSortie');
      bind('kdi-av-motif',    'motif');
      bind('kdi-av-cond',     'conditionsParticulieres');
      bind('kdi-av-idx-elec', 'indexElec');
      bind('kdi-av-idx-eau',  'indexEau');
      overlay.querySelector('#kdi-av-has-elec')?.addEventListener('change', (ev) =>
        this.zone.run(() => { av.hasCompteurElec = (ev.target as HTMLInputElement).checked; render(); }));
      overlay.querySelector('#kdi-av-has-eau')?.addEventListener('change', (ev) =>
        this.zone.run(() => { av.hasCompteurEau = (ev.target as HTMLInputElement).checked; render(); }));
      overlay.querySelector('#kdi-av-close')?.addEventListener('click',  () => this.zone.run(() => overlay.remove()));
      overlay.querySelector('#kdi-av-cancel')?.addEventListener('click', () => this.zone.run(() => overlay.remove()));
      overlay.querySelector('#kdi-av-confirm')?.addEventListener('click', () => this.zone.run(() => {
        if (!av.motif.trim()) { alert('Le motif est obligatoire.'); return; }
        const fd = new FormData();
        fd.append('motif', av.motif);
        if (av.nouveauLoyer)            fd.append('nouveauLoyer',            String(av.nouveauLoyer));
        if (av.nouvelleDateSortie)      fd.append('nouvelleDateSortie',      av.nouvelleDateSortie);
        if (av.conditionsParticulieres) fd.append('conditionsParticulieres', av.conditionsParticulieres);
        if (av.indexElec !== '')        fd.append('indexElec',               String(av.indexElec));
        if (av.indexEau  !== '')        fd.append('indexEau',                String(av.indexEau));
        overlay.remove();
        this.svc.creerAvenant(c.id, fd).subscribe({
          next:  () => this.load(),
          error: () => alert('Erreur lors de l\'enregistrement.')
        });
      }));
    };
    render();
  }

  // ════════════════════════════════════════════════════════════
  //  MODAL NOUVEAU BAIL
  // ════════════════════════════════════════════════════════════
  ouvrirModal() {
    this.etape = 1;
    this.produitSel = null; this.produitResultats = []; this.searchProduit = ''; this.produitDetailLoading = false;
    this.locataireSel = null; this.locataireResultats = []; this.searchLocataire = '';
    this.docContrat = null; this.photosEdl = [];
    this.step2 = {
      loyer: '', caution: '', avanceLoyer: '', periodicite: 'Mensuel',
      dateEntree: new Date().toISOString().slice(0,10), dateSortiePrevue: '',
      jourDebutPaiement: 1, jourFinPaiement: 5,
      destinationBien: 'Habitation', conditionsParticulieres: '',
      indexElecEntree: '', indexEauEntree: ''
    };
    this.derogationActive = false;
    this.detruireOverlay();
    this.overlayEl = this.construireOverlay();
    document.body.appendChild(this.overlayEl);
    document.body.style.overflow = 'hidden';
  }

  fermerModal() { this.detruireOverlay(); document.body.style.overflow = ''; }
  private detruireOverlay() { if (this.overlayEl) { this.overlayEl.remove(); this.overlayEl = null; } }
  private rerender() { this.detruireOverlay(); this.overlayEl = this.construireOverlay(); document.body.appendChild(this.overlayEl); }

  private construireOverlay(): HTMLElement {
    const e = this.etape;
    const totalEtapes = this.stepLabels.length;

    const stepperHTML = this.stepLabels.map((label, i) => {
      const n = i + 1, isActive = e === n, isDone = e > n;
      const dotBg    = isDone ? '#0d9f5a' : isActive ? '#0e1c38' : '#e8edf5';
      const dotColor = (isDone || isActive) ? '#fff' : '#8a97b0';
      const lineColor = isDone ? '#0d9f5a' : '#d0d8e8';
      const line = i < totalEtapes - 1
        ? `<div style="flex:1;height:2px;background:${lineColor};margin:0 6px 18px"></div>`
        : '';
      return `
        <div style="display:flex;flex-direction:column;align-items:center;gap:4px">
          <div style="width:34px;height:34px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:${dotBg};color:${dotColor};font-weight:700;font-size:13px">${isDone?'✓':n}</div>
          <div style="font-size:10px;color:#8a97b0;text-align:center;width:80px">${label}</div>
        </div>${line}`;
    }).join('');

    const btnPrev = e > 1
      ? `<button id="kdi-prev" style="padding:7px 15px;border-radius:8px;font-family:inherit;font-size:.79rem;cursor:pointer;border:1px solid #e3e8f0;background:#fff;color:#0e1c38">← Précédent</button>`
      : `<button id="kdi-cancel" style="padding:7px 15px;border-radius:8px;font-family:inherit;font-size:.79rem;cursor:pointer;border:1px solid #e3e8f0;background:#fff;color:#0e1c38">✕ Annuler</button>`;
    const btnNext = e < totalEtapes
      ? `<button id="kdi-next" ${!this.etapeValide()?'disabled':''} style="padding:7px 15px;border-radius:8px;font-family:inherit;font-size:.79rem;cursor:pointer;border:none;background:#0e1c38;color:#fff;opacity:${!this.etapeValide()?'.4':'1'}">Suivant →</button>`
      : `<button id="kdi-submit" ${this.submitting?'disabled':''} style="padding:7px 15px;border-radius:8px;font-family:inherit;font-size:.79rem;font-weight:600;cursor:pointer;border:none;background:linear-gradient(135deg,#c9a96e,#dfc28e);color:#0e1c38">🔑 ${this.submitting?'Création…':'Créer le bail'}</button>`;

    const html = `
      <div style="font-family:'Instrument Sans',sans-serif;position:fixed;inset:0;background:rgba(14,28,56,.55);backdrop-filter:blur(4px);z-index:99999;display:flex;align-items:center;justify-content:center" id="kdi-overlay">
        <div style="background:#fff;border-radius:14px;width:580px;max-width:94vw;max-height:90vh;overflow-y:auto;box-shadow:0 12px 40px rgba(14,28,56,.14);display:flex;flex-direction:column">
          <div style="display:flex;align-items:center;justify-content:space-between;padding:18px 22px 14px;border-bottom:1px solid #e3e8f0;position:sticky;top:0;background:#fff;z-index:2">
            <div style="font-weight:700;font-size:.93rem;color:#0e1c38;display:flex;align-items:center;gap:7px">
              <span style="color:#c9a96e">✦</span> Nouveau contrat de location
            </div>
            <button id="kdi-close" style="width:30px;height:30px;border:none;background:#f2f5fa;border-radius:7px;cursor:pointer;font-size:16px">✕</button>
          </div>
          <div style="display:flex;align-items:center;justify-content:center;padding:18px 22px 0">${stepperHTML}</div>
          <div style="padding:20px 22px;flex:1">${this.construireBodyHTML()}</div>
          <div style="display:flex;align-items:center;justify-content:space-between;padding:14px 22px;border-top:1px solid #e3e8f0;background:#f2f5fa;position:sticky;bottom:0;z-index:2">
            ${btnPrev}${btnNext}
          </div>
        </div>
      </div>`;

    const wrapper = document.createElement('div');
    wrapper.innerHTML = html;
    const overlay = wrapper.firstElementChild as HTMLElement;

    overlay.querySelector('#kdi-close')?.addEventListener('click',  () => this.zone.run(() => this.fermerModal()));
    overlay.querySelector('#kdi-cancel')?.addEventListener('click', () => this.zone.run(() => this.fermerModal()));
    overlay.querySelector('#kdi-prev')?.addEventListener('click',   () => this.zone.run(() => { this.etape--; this.rerender(); }));
    overlay.querySelector('#kdi-next')?.addEventListener('click',   () => this.zone.run(() => { if (this.etapeValide()) { this.etape++; this.rerender(); } }));
    overlay.querySelector('#kdi-submit')?.addEventListener('click', () => this.zone.run(() => this.soumettre()));

    if (e === 1) {
      overlay.querySelector('#kdi-search-produit')?.addEventListener('input', (ev) =>
        this.zone.run(() => this.onSearchProduit((ev.target as HTMLInputElement).value)));
      overlay.querySelectorAll('[data-produit-id]').forEach(el => {
        const id = (el as HTMLElement).dataset['produitId'];
        el.addEventListener('click', () => this.zone.run(() => {
          const p = this.produitResultats.find((x: any) => x.id === id);
          if (p) { this.selectionnerProduit(p); }
        }));
      });
      overlay.querySelector('#kdi-clear-produit')?.addEventListener('click', () =>
        this.zone.run(() => { this.produitSel = null; this.rerender(); }));
      overlay.querySelector('#kdi-search-locataire')?.addEventListener('input', (ev) =>
        this.zone.run(() => this.onSearchLocataire((ev.target as HTMLInputElement).value)));
      overlay.querySelectorAll('[data-locataire-id]').forEach(el => {
        const id = (el as HTMLElement).dataset['locataireId'];
        el.addEventListener('click', () => this.zone.run(() => {
          const l = this.locataireResultats.find((x: any) => x.id === id);
          if (l) { this.locataireSel = l; this.locataireResultats = []; this.rerender(); }
        }));
      });
      overlay.querySelector('#kdi-clear-locataire')?.addEventListener('click', () =>
        this.zone.run(() => { this.locataireSel = null; this.rerender(); }));
    }

    if (e === 2) {
      const updateNextBtn = () => {
        const btn = overlay.querySelector('#kdi-next') as HTMLButtonElement | null;
        if (!btn) return;
        const ok = this.etapeValide();
        btn.disabled = !ok; btn.style.opacity = ok ? '1' : '.4'; btn.style.cursor = ok ? 'pointer' : 'not-allowed';
      };
      const bind = (sel: string, field: keyof typeof this.step2) => {
        const el = overlay.querySelector(sel) as HTMLInputElement | null;
        const handler = (ev: Event) => this.zone.run(() => {
          (this.step2 as any)[field] = (ev.target as HTMLInputElement).value; updateNextBtn();
        });
        el?.addEventListener('input', handler);
        el?.addEventListener('change', handler);
      };
      bind('#kdi-loyer','loyer'); bind('#kdi-caution','caution'); bind('#kdi-avance','avanceLoyer');
      bind('#kdi-perio','periodicite'); bind('#kdi-dentree','dateEntree'); bind('#kdi-dsortie','dateSortiePrevue');
      bind('#kdi-jdebut','jourDebutPaiement'); bind('#kdi-jfin','jourFinPaiement');
      bind('#kdi-destination','destinationBien'); bind('#kdi-cond','conditionsParticulieres');

      overlay.querySelector('#kdi-derog-btn')?.addEventListener('click', (ev) => {
        ev.preventDefault();
        this.zone.run(() => { this.derogationActive = true; this.rerender(); });
      });
      overlay.querySelector('#kdi-derog-cancel')?.addEventListener('click', () => {
        this.zone.run(() => {
          this.derogationActive = false;
          const today = new Date().toISOString().slice(0, 10);
          if (this.step2.dateEntree < today) this.step2.dateEntree = today;
          this.rerender();
        });
      });
      updateNextBtn();
    }

    // ── Étape 3 : Index compteurs (si produit avec compteurs) ──
    if (e === 3 && this.produitNeedIndexStep()) {
      const updateNextBtn = () => {
        const btn = overlay.querySelector('#kdi-next') as HTMLButtonElement | null;
        if (!btn) return;
        const ok = this.etapeValide();
        btn.disabled = !ok; btn.style.opacity = ok ? '1' : '.4'; btn.style.cursor = ok ? 'pointer' : 'not-allowed';
      };
      const bindIdx = (sel: string, field: 'indexElecEntree' | 'indexEauEntree') => {
        const el = overlay.querySelector(sel) as HTMLInputElement | null;
        el?.addEventListener('input', (ev) => this.zone.run(() => {
          this.step2[field] = (ev.target as HTMLInputElement).value;
          updateNextBtn();
        }));
      };
      bindIdx('#kdi-idx-elec', 'indexElecEntree');
      bindIdx('#kdi-idx-eau',  'indexEauEntree');
      updateNextBtn();
    }

    // ── Étape Documents (3 ou 4 selon produit) ──
    if (e === this.etapeDocuments) {
      overlay.querySelector('#kdi-doc-contrat')?.addEventListener('change', (ev) =>
        this.zone.run(() => { this.docContrat = (ev.target as HTMLInputElement).files?.[0] ?? null; this.rerender(); }));
      overlay.querySelector('#kdi-doc-photos')?.addEventListener('change', (ev) =>
        this.zone.run(() => { this.photosEdl = Array.from((ev.target as HTMLInputElement).files ?? []); this.rerender(); }));
      overlay.querySelector('#kdi-zone-contrat')?.addEventListener('click', () =>
        (overlay.querySelector('#kdi-doc-contrat') as HTMLInputElement)?.click());
      overlay.querySelector('#kdi-zone-photos')?.addEventListener('click', () =>
        (overlay.querySelector('#kdi-doc-photos') as HTMLInputElement)?.click());
    }

    return overlay;
  }

  private construireBodyHTML(): string {
    const inp = (id: string, type: string, val: string, ph = '', extra = '') =>
      `<input id="${id}" type="${type}" value="${val}" placeholder="${ph}" ${extra}
        style="padding:8px 11px;border:1.5px solid #e3e8f0;border-radius:7px;font-family:inherit;font-size:.81rem;color:#0e1c38;background:#f2f5fa;width:100%;box-sizing:border-box">`;
    const lbl = (txt: string) =>
      `<label style="font-size:.72rem;font-weight:600;color:#4a5878;display:block;margin-bottom:5px">${txt}</label>`;

    // ── ÉTAPE 1 : Bien & locataire ──────────────────────────────
    if (this.etape === 1) {
      const produitSearch = !this.produitSel ? `
        ${inp('kdi-search-produit','text',this.searchProduit,'Rechercher un bien disponible…')}
        <div id="kdi-dropdown-produit"></div>
        <div style="margin-top:5px;font-size:.7rem;color:#8a97b0">ℹ️ Seuls les biens non loués sont proposés</div>
      ` : `
        <div style="display:flex;align-items:center;gap:10px;background:#f2f5fa;border:1px solid #d0d8e8;border-radius:8px;padding:10px 12px">
          <span style="color:#c9a96e">🏠</span>
          <div style="flex:1;font-size:.82rem">
            <strong>${this.produitSel.code ?? this.produitSel.libelle}</strong>
            <span style="color:#8a97b0;margin-left:6px">${this.produitSel.proprieteLibelle ?? ''}</span>
          </div>
          ${this.produitDetailLoading ? `<span style="font-size:11px;color:#c9a96e;display:flex;align-items:center;gap:4px"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="animation:spin .7s linear infinite"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg> Chargement…</span>` : `<button id="kdi-clear-produit" style="border:none;background:none;cursor:pointer;font-size:16px;color:#8a97b0">✕</button>`}
        </div>`;
      const locataireSearch = !this.locataireSel ? `
        ${inp('kdi-search-locataire','text',this.searchLocataire,'Rechercher un locataire…')}
        <div id="kdi-dropdown-locataire"></div>
      ` : `
        <div style="display:flex;align-items:center;gap:10px;background:#f2f5fa;border:1px solid #d0d8e8;border-radius:8px;padding:10px 12px">
          <span style="color:#c9a96e">👤</span>
          <div style="flex:1;font-size:.82rem">
            <strong>${this.locataireSel.nomComplet ?? this.locataireSel.prenomNom ?? '—'}</strong>
            <span style="color:#8a97b0;margin-left:6px">${this.locataireSel.telephone ?? ''}</span>
          </div>
          <button id="kdi-clear-locataire" style="border:none;background:none;cursor:pointer;font-size:16px;color:#8a97b0">✕</button>
        </div>`;
      return `
        <div style="font-size:.85rem;font-weight:600;color:#0e1c38;margin-bottom:16px;padding-bottom:10px;border-bottom:1px solid #e3e8f0">Bien locatif & locataire</div>
        <div style="margin-bottom:16px">${lbl('Bien locatif *')}${produitSearch}</div>
        <div>${lbl('Locataire *')}${locataireSearch}</div>`;
    }

    // ── ÉTAPE 2 : Conditions financières ───────────────────────
    if (this.etape === 2) {
      const s = this.step2;
      const estPdg = this.auth.getUser()?.role === 'Direction';
      return `
        <div style="font-size:.85rem;font-weight:600;color:#0e1c38;margin-bottom:16px;padding-bottom:10px;border-bottom:1px solid #e3e8f0">Conditions financières & durée</div>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:14px">
          <div>${lbl('Loyer (MRU) *')}${inp('kdi-loyer','number',String(s.loyer),'150 000','min="0"')}</div>
          <div>${lbl('Caution (MRU) *')}${inp('kdi-caution','number',String(s.caution),'300 000','min="0"')}</div>
          <div>${lbl('Avance loyer (MRU)')}${inp('kdi-avance','number',String(s.avanceLoyer),'0','min="0"')}</div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px">
          <div>${lbl('Périodicité *')}<select id="kdi-perio" style="padding:8px 11px;border:1.5px solid #e3e8f0;border-radius:7px;font-family:inherit;font-size:.81rem;width:100%;background:#f2f5fa">
            ${['Mensuel','Bimensuel','Trimestriel'].map(v=>`<option value="${v}" ${s.periodicite===v?'selected':''}>${v}</option>`).join('')}
          </select></div>
          <div>${lbl('Destination *')}<select id="kdi-destination" style="padding:8px 11px;border:1.5px solid #e3e8f0;border-radius:7px;font-family:inherit;font-size:.81rem;width:100%;background:#f2f5fa">
            ${['Habitation','Commerce','Bureau','Entrepôt','Mixte'].map(v=>`<option value="${v}" ${s.destinationBien===v?'selected':''}>${v}</option>`).join('')}
          </select></div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px">
          <div>
            ${lbl("Date d'entrée *")}
            <div style="position:relative">
              <input id="kdi-dentree" type="date" value="${s.dateEntree}"
                ${this.derogationActive ? '' : `max="${new Date().toISOString().slice(0,10)}"`}
                style="padding:8px 11px;border:1.5px solid ${this.derogationActive ? '#f59e0b' : '#e3e8f0'};
                       border-radius:7px;font-family:inherit;font-size:.81rem;color:#0e1c38;
                       background:${this.derogationActive ? '#fffbeb' : '#f2f5fa'};
                       width:100%;box-sizing:border-box;padding-right:${estPdg ? '32px' : '11px'}">
              ${estPdg && !this.derogationActive ? `
                <button id="kdi-derog-btn"
                  title="Dérogation PDG — autoriser l'antidatage"
                  style="position:absolute;right:7px;top:50%;transform:translateY(-50%);
                         border:none;background:none;cursor:pointer;font-size:15px;
                         opacity:.4;padding:2px;line-height:1;color:#92400e;transition:opacity .15s"
                  onmouseover="this.style.opacity='1'"
                  onmouseout="this.style.opacity='.4'">🔓</button>` : ''}
            </div>
            ${this.derogationActive ? `
              <div style="font-size:.69rem;color:#b45309;margin-top:3px;display:flex;align-items:center;gap:3px">
                ⚠️ Antidatage PDG actif — date libre
              </div>` : ''}
          </div>
          <div>${lbl('Date de sortie prévue')}${inp('kdi-dsortie','date',s.dateSortiePrevue)}</div>
        </div>
        ${this.derogationActive ? `
        <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;
             padding:10px 13px;margin-bottom:14px;display:flex;align-items:center;justify-content:space-between;gap:10px">
          <span style="font-size:.75rem;color:#92400e">
            🔓 <strong>Dérogation PDG active</strong> — le contrat peut être antidaté.
            Cette opération est enregistrée dans les logs.
          </span>
          <button id="kdi-derog-cancel"
            style="border:none;background:rgba(180,83,9,.12);border-radius:5px;
                   padding:3px 10px;font-size:.72rem;cursor:pointer;color:#92400e;font-weight:600;white-space:nowrap">
            ✕ Désactiver
          </button>
        </div>` : ''}
        <div style="background:#f2f5fa;border:1px solid #e3e8f0;border-radius:8px;padding:12px;margin-bottom:14px">
          <div style="font-size:.76rem;font-weight:600;color:#4a5878;margin-bottom:10px">📅 Fenêtre de paiement</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
            <div>${lbl('Jour début *')}${inp('kdi-jdebut','number',String(s.jourDebutPaiement),'1','min="1" max="28"')}</div>
            <div>${lbl('Jour fin *')}${inp('kdi-jfin','number',String(s.jourFinPaiement),'5','min="1" max="28"')}</div>
          </div>
        </div>
        <div>${lbl('Conditions particulières')}
          <textarea id="kdi-cond" rows="2" style="padding:8px 11px;border:1.5px solid #e3e8f0;border-radius:7px;font-family:inherit;font-size:.81rem;width:100%;background:#f2f5fa;resize:vertical;box-sizing:border-box">${s.conditionsParticulieres}</textarea>
        </div>`;
    }

    // ── ÉTAPE 3 : Index compteurs (conditionnelle) ──────────────
    if (this.etape === 3 && this.produitNeedIndexStep()) {
      const p    = this.produitSel;
      const type = (p?.type ?? p?.typeLabel ?? '').toString();
      const isChambre  = type === 'Chambre';
      const isAppart   = type === 'Appartement';
      const isBoutique = type === 'Boutique';
      const hasElec    = !!(p?.hasCompteurElec);
      const hasEau     = !!(p?.hasCompteurEau);

      const elecOblig  = (isAppart && hasElec) || isBoutique || (isChambre && hasElec);
      const eauOblig   = (isAppart && hasEau)  || (isChambre && hasEau);
      const elecInfo   = isChambre && !hasElec;
      const eauInfo    = isChambre && !hasEau;

      const showElec = hasElec || isBoutique || isChambre;
      const showEau  = hasEau  || isAppart   || isChambre;

      const badgeOblig = `<span style="font-size:.65rem;font-weight:700;padding:1px 7px;border-radius:10px;background:#fee2e2;color:#b91c1c;margin-left:6px">Obligatoire</span>`;
      const badgeInfo  = `<span style="font-size:.65rem;font-weight:700;padding:1px 7px;border-radius:10px;background:#dbeafe;color:#1d4ed8;margin-left:6px">Informatif</span>`;
      const badgeFacul = `<span style="font-size:.65rem;font-weight:700;padding:1px 7px;border-radius:10px;background:#f0fdf4;color:#15803d;margin-left:6px">Facultatif</span>`;

      const buildChamp = (
        id: string, label: string, icon: string, val: any,
        obligatoire: boolean, informatif: boolean, _facultatif: boolean, hint: string
      ) => {
        const badge   = obligatoire ? badgeOblig : informatif ? badgeInfo : badgeFacul;
        const filled  = val !== '' && val !== null && val !== undefined;
        const borderC = obligatoire ? (filled ? '#22c55e' : '#fca5a5') : informatif ? '#93c5fd' : '#86efac';
        const bgC     = obligatoire ? (filled ? '#f0fdf4' : '#fff5f5') : informatif ? '#eff6ff' : '#f0fdf4';
        return `
          <div style="background:${bgC};border:1.5px solid ${borderC};border-radius:12px;padding:16px 18px;transition:all .2s">
            <div style="display:flex;align-items:center;margin-bottom:10px">
              <span style="font-size:20px;margin-right:8px">${icon}</span>
              <span style="font-size:.82rem;font-weight:700;color:#0e1c38">${label}</span>
              ${badge}
              ${filled ? `<span style="margin-left:auto;font-size:18px">✅</span>` : ''}
            </div>
            <div style="position:relative">
              <input id="${id}" type="number" value="${val ?? ''}" step="0.01" min="0"
                placeholder="Ex : 1 234,56"
                style="padding:10px 44px 10px 14px;border:1.5px solid ${filled ? '#22c55e' : '#d1d5db'};
                       border-radius:8px;font-family:inherit;font-size:.88rem;width:100%;
                       box-sizing:border-box;background:#fff;color:#0e1c38;outline:none;transition:border-color .15s">
              <span style="position:absolute;right:12px;top:50%;transform:translateY(-50%);font-size:.72rem;font-weight:600;color:#94a3b8">kWh/m³</span>
            </div>
            <div style="font-size:.69rem;color:#64748b;margin-top:6px;display:flex;align-items:center;gap:4px">
              ℹ️ ${hint}
            </div>
          </div>`;
      };

      const elecHint = isBoutique
        ? 'Index relevé sur le compteur électrique — obligatoire pour les boutiques.'
        : isAppart
          ? 'Index relevé sur le compteur électrique individuel de l\'appartement.'
          : hasElec
            ? 'Compteur individuel — index obligatoire pour le suivi de consommation.'
            : 'Compteur partagé — index informatif, permet le suivi par unité.';
      const eauHint = isBoutique
        ? 'Eau optionnelle pour les boutiques — renseignez si disponible.'
        : isAppart
          ? 'Index relevé sur le compteur eau individuel de l\'appartement.'
          : hasEau
            ? 'Compteur individuel — index obligatoire pour le suivi de consommation.'
            : 'Compteur partagé — index informatif, permet le suivi par unité.';

      const regleLabel = isAppart
        ? `Appartement avec ${hasElec && hasEau ? 'compteurs eau + électricité' : hasElec ? 'compteur électricité' : 'compteur eau'} — relevés obligatoires.`
        : isBoutique
          ? 'Boutique — index électricité obligatoire, eau facultative.'
          : hasElec && hasEau
            ? 'Chambre avec compteurs individuels — index obligatoires.'
            : hasElec
              ? 'Chambre — électricité individuelle (obligatoire), eau partagée (informatif).'
              : hasEau
                ? 'Chambre — eau individuelle (obligatoire), électricité partagée (informatif).'
                : 'Chambre avec compteurs partagés — index informatifs.';

      return `
        <div style="font-size:.85rem;font-weight:600;color:#0e1c38;margin-bottom:4px;padding-bottom:10px;border-bottom:1px solid #e3e8f0;display:flex;align-items:center;gap:8px">
          ⚡💧 Relevé des index — état des lieux d'entrée
        </div>
        <div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:9px;padding:10px 13px;margin-bottom:18px;font-size:.75rem;color:#0369a1;display:flex;align-items:flex-start;gap:7px">
          <span style="font-size:16px;flex-shrink:0">📋</span>
          <span>${regleLabel} Ces valeurs serviront de référence pour le calcul des charges.</span>
        </div>
        <div style="display:flex;flex-direction:column;gap:12px">
          ${showElec ? buildChamp('kdi-idx-elec', 'Électricité', '⚡',
              this.step2.indexElecEntree, elecOblig, elecInfo, !elecOblig && !elecInfo, elecHint) : ''}
          ${showEau  ? buildChamp('kdi-idx-eau',  'Eau',         '💧',
              this.step2.indexEauEntree,  eauOblig,  eauInfo,  !eauOblig  && !eauInfo,  eauHint)  : ''}
        </div>
        ${(elecOblig || eauOblig) ? `
        <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:9px 13px;margin-top:14px;font-size:.73rem;color:#92400e;display:flex;align-items:center;gap:7px">
          ⚠️ Les champs <strong>Obligatoires</strong> doivent être renseignés pour continuer.
        </div>` : ''}`;
    }

    // ── ÉTAPE DOCUMENTS (3 ou 4) ────────────────────────────────
    const s = this.step2;
    const ci = (ok: boolean, t: string) =>
      `<span style="display:flex;align-items:center;gap:4px;padding:3px 10px;border-radius:10px;font-size:.72rem;font-weight:500;background:${ok?'#d1fae5':'#e8edf5'};color:${ok?'#065f46':'#8a97b0'}">${ok?'✓':'○'} ${t}</span>`;
    const row = (t: string, v: string) => `<div><span style="color:#8a97b0">${t} : </span><strong>${v}</strong></div>`;

    return `
      <div style="font-size:.85rem;font-weight:600;color:#0e1c38;margin-bottom:12px;padding-bottom:10px;border-bottom:1px solid #e3e8f0">Documents & récapitulatif</div>
      <div style="background:#f2f5fa;border:1px solid #e3e8f0;border-radius:10px;padding:14px;margin-bottom:16px">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;padding-bottom:10px;border-bottom:1px solid #e3e8f0">
          <span style="font-size:20px;color:#c9a96e">🔑</span>
          <div>
            <div style="font-weight:700;font-size:.88rem">${this.produitSel?.code ?? '—'} → ${this.locataireSel?.nomComplet ?? this.locataireSel?.prenomNom ?? '—'}</div>
            <div style="font-size:.7rem;color:#8a97b0">${this.produitSel?.proprieteLibelle ?? ''}</div>
          </div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;font-size:.77rem">
          ${row('Loyer', Number(s.loyer).toLocaleString('fr-FR')+' MRU')}
          ${row('Caution', Number(s.caution).toLocaleString('fr-FR')+' MRU')}
          ${row('Périodicité', s.periodicite)}
          ${row('Entrée', s.dateEntree)}
          ${row('Paiement', 'du '+s.jourDebutPaiement+' au '+s.jourFinPaiement)}
          ${row('Destination', s.destinationBien)}
          ${s.indexElecEntree !== '' ? row('Index élec.', String(s.indexElecEntree)+' kWh') : ''}
          ${s.indexEauEntree  !== '' ? row('Index eau',   String(s.indexEauEntree) +' m³')  : ''}
        </div>
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px">
        ${ci(!!this.docContrat,'Contrat signé')} ${ci(this.photosEdl.length>0,'Photos EDL')}
      </div>
      <div style="display:flex;align-items:center;gap:14px;padding:12px 0;border-bottom:1px solid #e3e8f0">
        <div style="display:flex;align-items:center;gap:8px;width:180px;flex-shrink:0">
          <span style="font-size:16px;color:#c9a96e">📄</span>
          <div><div style="font-size:.8rem;font-weight:600">Contrat de bail signé</div><div style="font-size:.7rem;color:#8a97b0">PDF</div></div>
        </div>
        <div id="kdi-zone-contrat" style="flex:1;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:3px;border:2px dashed ${this.docContrat?'#0d9f5a':'#d0d8e8'};border-radius:8px;padding:12px;cursor:pointer;background:${this.docContrat?'#f0fdf4':'#fff'}">
          <span style="font-size:20px;color:${this.docContrat?'#0d9f5a':'#b8c2d4'}">${this.docContrat?'✓':'📎'}</span>
          <span style="font-size:.75rem;color:${this.docContrat?'#0d9f5a':'#8a97b0'}">${this.docContrat ? this.docContrat.name : 'Cliquer pour joindre'}</span>
          <input id="kdi-doc-contrat" type="file" accept=".pdf,image/*" style="display:none">
        </div>
      </div>
      <div style="display:flex;align-items:center;gap:14px;padding:12px 0">
        <div style="display:flex;align-items:center;gap:8px;width:180px;flex-shrink:0">
          <span style="font-size:16px;color:#c9a96e">📷</span>
          <div><div style="font-size:.8rem;font-weight:600">Photos état des lieux</div><div style="font-size:.7rem;color:#8a97b0">Multiple</div></div>
        </div>
        <div id="kdi-zone-photos" style="flex:1;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:3px;border:2px dashed ${this.photosEdl.length?'#0d9f5a':'#d0d8e8'};border-radius:8px;padding:12px;cursor:pointer;background:${this.photosEdl.length?'#f0fdf4':'#fff'}">
          <span style="font-size:20px;color:${this.photosEdl.length?'#0d9f5a':'#b8c2d4'}">${this.photosEdl.length?'✓':'🖼'}</span>
          <span style="font-size:.75rem;color:${this.photosEdl.length?'#0d9f5a':'#8a97b0'}">${this.photosEdl.length ? this.photosEdl.length+' photo(s)' : 'Joindre les photos'}</span>
          <input id="kdi-doc-photos" type="file" accept="image/*" multiple style="display:none">
        </div>
      </div>
      ${(!this.docContrat || !this.photosEdl.length) ? `
        <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:10px 12px;font-size:.78rem;color:#92400e;display:flex;align-items:center;gap:8px;margin-top:10px">
          ⚠️ Documents manquants — bail créé en <strong>Brouillon</strong>.
        </div>` : ''}`;
  }

  onSearchProduit(val: string) {
    this.searchProduit = val;
    clearTimeout(this.timerProduit);
    this.updateDropdownProduit([]);
    if (val.length < 2) { this.produitResultats = []; return; }
    this.timerProduit = setTimeout(() =>
      this.produitSvc.getAll({ search: val, statut: 'Libre' as any }).subscribe(r => {
        this.produitResultats = r.items;
        this.updateDropdownProduit(r.items);
      }), 350);
  }

  onSearchLocataire(val: string) {
    this.searchLocataire = val;
    clearTimeout(this.timerLocataire);
    this.updateDropdownLocataire([]);
    if (val.length < 2) { this.locataireResultats = []; return; }
    this.timerLocataire = setTimeout(() =>
      (this.locatSvc as any).getAll(1, 10, val).subscribe((r: any) => {
        this.locataireResultats = r.items;
        this.updateDropdownLocataire(r.items);
      }), 350);
  }

  private updateDropdownProduit(items: any[]) {
    const container = this.overlayEl?.querySelector('#kdi-dropdown-produit') as HTMLElement | null;
    if (!container) return;
    if (!items.length) { container.innerHTML = ''; return; }
    container.innerHTML = `
      <div style="border:1px solid #e3e8f0;border-radius:8px;overflow:hidden;margin-top:6px;background:#fff;max-height:180px;overflow-y:auto">
        ${items.map((p: any) => `
          <div data-produit-id="${p.id}" style="display:flex;align-items:center;gap:8px;padding:9px 12px;cursor:pointer;border-bottom:1px solid #f1f5f9;font-size:.8rem">
            <strong>${p.code ?? p.libelle}</strong>
            <span style="color:#8a97b0;margin-left:6px">${p.proprieteLibelle ?? ''}</span>
            <span style="margin-left:auto;font-size:.7rem;background:#d1fae5;color:#065f46;padding:2px 7px;border-radius:4px;font-weight:600">Libre</span>
          </div>`).join('')}
      </div>`;
    container.querySelectorAll('[data-produit-id]').forEach(el => {
      const id = (el as HTMLElement).dataset['produitId'];
      el.addEventListener('click', () => this.zone.run(() => {
        const p = this.produitResultats.find((x: any) => x.id === id);
        if (p) { this.selectionnerProduit(p); }
      }));
    });
  }

  private updateDropdownLocataire(items: any[]) {
    const container = this.overlayEl?.querySelector('#kdi-dropdown-locataire') as HTMLElement | null;
    if (!container) return;
    if (!items.length) { container.innerHTML = ''; return; }
    container.innerHTML = `
      <div style="border:1px solid #e3e8f0;border-radius:8px;overflow:hidden;margin-top:6px;background:#fff;max-height:180px;overflow-y:auto">
        ${items.map((l: any) => `
          <div data-locataire-id="${l.id}" style="display:flex;align-items:center;gap:8px;padding:9px 12px;cursor:pointer;border-bottom:1px solid #f1f5f9;font-size:.8rem">
            <strong>${l.nomComplet ?? l.prenomNom ?? '—'}</strong>
            <span style="color:#8a97b0;margin-left:auto">${l.telephone ?? ''}</span>
          </div>`).join('')}
      </div>`;
    container.querySelectorAll('[data-locataire-id]').forEach(el => {
      const id = (el as HTMLElement).dataset['locataireId'];
      el.addEventListener('click', () => this.zone.run(() => {
        const l = this.locataireResultats.find((x: any) => x.id === id);
        if (l) { this.locataireSel = l; this.locataireResultats = []; this.rerender(); }
      }));
    });
  }

  private selectionnerProduit(p: any) {
    this.produitResultats = [];
    // Déduire type depuis typeLabel si type absent (backend ne le retourne pas dans la liste)
    const typeLabel = (p.typeLabel ?? p.type ?? "").toString();
    p.type = p.type ?? typeLabel; // normalise
    // hasCompteurElec/Eau : si absents de la liste, on fait un getById une seule fois
    const hasKnownCompteurs = p.hasCompteurElec !== undefined || p.hasCompteurEau !== undefined;
    const ref = Number(p.loyerReference ?? p.loyer ?? 0);
    if (ref > 0) { this.step2.loyer = ref; this.step2.caution = ref * 2; this.step2.avanceLoyer = ref; }
    if (hasKnownCompteurs) {
      // La liste retourne déjà les compteurs — utilisation directe, pas de getById
      this.produitSel = p;
      this.produitDetailLoading = false;
      this.rerender();
    } else {
      // La liste ne retourne pas les compteurs — getById nécessaire
      this.produitDetailLoading = true;
      const container = this.overlayEl?.querySelector('#kdi-dropdown-produit') as HTMLElement | null;
      if (container) container.innerHTML = `<div style="padding:10px 12px;font-size:.8rem;color:#c9a96e">⟳ Chargement…</div>`;
      this.produitSvc.getById(p.id).subscribe({
        next: (detail: any) => this.zone.run(() => {
          // Prendre les compteurs du detail, le type de p (plus fiable)
          this.produitSel = {
            ...p,
            hasCompteurElec: !!(detail.hasCompteurElec ?? false),
            hasCompteurEau:  !!(detail.hasCompteurEau  ?? false),
            type: detail.type ?? p.type ?? typeLabel,
          };
          this.produitDetailLoading = false;
          this.rerender();
        }),
        error: () => this.zone.run(() => {
          this.produitSel = p;
          this.produitDetailLoading = false;
          this.rerender();
        })
      });
    }
  }

  etapeValide(): boolean {
    if (this.etape === 1) return !!this.produitSel && !!this.locataireSel && !this.produitDetailLoading;
    if (this.etape === 2) return Number(this.step2.loyer) > 0 && Number(this.step2.caution) >= 0 && !!this.step2.dateEntree;
    if (this.etape === 3 && this.produitNeedIndexStep()) {
      const p      = this.produitSel;
      const type   = (p?.type ?? p?.typeLabel ?? '').toString();
      const hasElec    = !!(p?.hasCompteurElec);
      const hasEau     = !!(p?.hasCompteurEau);
      const isAppart   = type === 'Appartement';
      const isBoutique = type === 'Boutique';
      const isChambre  = type === 'Chambre';
      const elecOblig  = (isAppart && hasElec) || isBoutique || (isChambre && hasElec);
      const eauOblig   = (isAppart && hasEau)  || (isChambre && hasEau);
      if (elecOblig && (this.step2.indexElecEntree === '' || this.step2.indexElecEntree === null)) return false;
      if (eauOblig  && (this.step2.indexEauEntree  === '' || this.step2.indexEauEntree  === null)) return false;
    }
    return true;
  }

  soumettre() {
    if (!this.produitSel || !this.locataireSel) return;
    this.submitting = true; this.rerender();
    const fd = new FormData();
    fd.append('ProduitLocatifId',  this.produitSel.id);
    fd.append('LocataireId',       this.locataireSel.id);
    fd.append('Loyer',             String(this.step2.loyer));
    fd.append('Caution',           String(this.step2.caution));
    fd.append('AvanceLoyer',       String(this.step2.avanceLoyer || 0));
    fd.append('CautionReglee',     'true');
    fd.append('AvanceLoyerReglee', 'true');
    fd.append('Periodicite',       this.step2.periodicite);
    fd.append('DateEntree',        this.step2.dateEntree);
    fd.append('JourDebutPaiement', String(this.step2.jourDebutPaiement));
    fd.append('JourFinPaiement',   String(this.step2.jourFinPaiement));
    fd.append('DestinationBien',   this.step2.destinationBien);
    if (this.derogationActive)                   fd.append('DerogationPdg',           'true');
    if (this.step2.indexElecEntree !== '')        fd.append('IndexElecEntree',          String(this.step2.indexElecEntree));
    if (this.step2.indexEauEntree  !== '')        fd.append('IndexEauEntree',           String(this.step2.indexEauEntree));
    if (this.step2.dateSortiePrevue)             fd.append('DateSortiePrevue',         this.step2.dateSortiePrevue);
    if (this.step2.conditionsParticulieres)      fd.append('ConditionsParticulieres',  this.step2.conditionsParticulieres);
    if (this.docContrat)                         fd.append('DocContrat',               this.docContrat);
    this.photosEdl.forEach(f => fd.append('PhotosEtatLieux', f));
    this.svc.create(fd).subscribe({
      next:  () => { this.submitting = false; this.derogationActive = false; this.fermerModal(); this.load(); },
      error: () => { this.submitting = false; this.rerender(); }
    });
  }
}