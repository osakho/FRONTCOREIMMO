// ══════════════════════════════════════════════════════════════════════════════
//  RECETTES AGENCE
//  Suivi des commissions perçues sur 3 sources :
//    1. Commissions gestion locative (sur loyers collectés)
//    2. Commissions travaux (sur chantiers réceptionnés)
//    3. Commissions services (mise en location, EDL, contentieux…)
//
//  Endpoints :
//    GET /agence/recettes?mois=YYYY-MM          → RecettesAgenceDto
//    GET /agence/recettes/lignes?mois=YYYY-MM   → LigneRecetteDto[]
//    POST /agence/recettes/services             → créer recette service
//    GET /agence/tableau-bord?mois=YYYY-MM      → réutilisé pour commissions gestion/travaux
// ══════════════════════════════════════════════════════════════════════════════

import {
  Component, inject, OnInit, signal, computed, ChangeDetectionStrategy
} from '@angular/core';
import { CommonModule, DecimalPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { catchError, of, forkJoin } from 'rxjs';
import { environment } from '../../../environments/environment';
import { TableauBordAgenceDto } from '../../core/models/models';

// ── DTOs locaux ──────────────────────────────────────────────────────────────

export interface RecettesAgenceDto {
  mois:                  string;
  totalRecettes:         number;
  commissionsGestion:    number;
  commissionsTravaux:    number;
  commissionsServices:   number;
  variationMoisPrecedent: number;   // % variation vs mois précédent
  nbContratsGestion:     number;
  tauxCommissionMoyen:   number;
  nbChantiersFactures:   number;
  tauxCommissionTravaux: number;
  nbPrestationsServices: number;
  topGestion:            LigneRecetteGestionDto[];
  topTravaux:            LigneRecetteTravauxDto[];
  lignesServices:        LigneRecetteServiceDto[];
}

export interface LigneRecetteGestionDto {
  contratId:        string;
  proprietaireNom:  string;
  proprieteLibelle: string;
  periodicite:      string;
  tauxCommission:   number;
  loyerBrut:        number;
  commission:        number;
  fraisImputes:      number;
  commissionNette:   number;
}

export interface LigneRecetteTravauxDto {
  chantierId:       string;
  chantierNumero:   string;
  chantierLibelle:  string;
  proprieteLibelle: string;
  dateReception:    string;
  budgetChantier:   number;
  tauxCommission:   number;
  commission:        number;
  statut:           'Facture' | 'EnAttente';
}

export interface LigneRecetteServiceDto {
  id:               string;
  typeService:      string;
  libelle:          string;
  proprietaireNom?: string;
  date:             string;
  montant:          number;
  reference?:       string;
  statut:           'Encaisse' | 'EnAttente';
}

interface PointHistorique {
  label:    string;
  gestion:  number;
  travaux:  number;
  services: number;
}

// ── Services disponibles ──────────────────────────────────────────────────────
const TYPES_SERVICES = [
  'Mise en location',
  'État des lieux entrée',
  'État des lieux sortie',
  'Gestion contentieux',
  'Accompagnement juridique',
  'Conseil patrimonial',
  'Frais de dossier',
  'Autre prestation',
];

// ── Composant ─────────────────────────────────────────────────────────────────
@Component({
  selector: 'kdi-recettes-agence',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, DecimalPipe, DatePipe],
  template: `
<div class="cra-root page-enter">

  <!-- ══ HEADER ══ -->
  <div class="page-header">
    <div>
      <div class="page-eyebrow">Finance · Comptabilité</div>
      <div class="page-title"><span class="mi">trending_up</span> Recettes agence</div>
      <div class="page-subtitle">Commissions gestion · Commissions travaux · Commissions services</div>
    </div>
    <div class="cra-header-actions">
      <select class="cra-sel-mois" [(ngModel)]="moisSelectionne" (change)="charger()">
        <option *ngFor="let m of moisDisponibles" [value]="m.value">{{ m.label }}</option>
      </select>
      <div class="cra-view-toggle">
        <button [class.on]="vue==='mensuel'"     (click)="vue='mensuel'">Mensuel</button>
        <button [class.on]="vue==='trimestriel'" (click)="vue='trimestriel'">Trimestriel</button>
        <button [class.on]="vue==='annuel'"      (click)="vue='annuel'">Annuel</button>
      </div>
      <button class="btn btn-secondary" (click)="charger()">
        <span class="mi">refresh</span> Actualiser
      </button>
      <button class="btn btn-gold" (click)="exporter()">
        <span class="mi">download</span> Export
      </button>
    </div>
  </div>

  <!-- ══ CHARGEMENT ══ -->
  <div *ngIf="loading()" class="cra-loading">
    <div class="cra-spinner"></div> Chargement des recettes…
  </div>

  <ng-container *ngIf="!loading()">

    <!-- ══ HERO ══ -->
    <div class="cra-hero">
      <div class="cra-hero-item">
        <div class="cra-hero-lbl">Total recettes</div>
        <div class="cra-hero-val cra-gold">
          {{ data()!.totalRecettes | number:'1.0-0' }}
          <span class="cra-unit">MRU</span>
        </div>
        <div class="cra-hero-badge" [class.pos]="data()!.variationMoisPrecedent >= 0" [class.neg]="data()!.variationMoisPrecedent < 0">
          {{ data()!.variationMoisPrecedent >= 0 ? '▲' : '▼' }}
          {{ data()!.variationMoisPrecedent | number:'1.0-1' }}% vs mois préc.
        </div>
      </div>
      <div class="cra-hero-sep"></div>
      <div class="cra-hero-item">
        <div class="cra-hero-lbl">Commissions gestion</div>
        <div class="cra-hero-val" style="color:#dfc28e">
          {{ data()!.commissionsGestion | number:'1.0-0' }}
          <span class="cra-unit">MRU</span>
        </div>
        <div class="cra-hero-sub">
          {{ pctSource(data()!.commissionsGestion) | number:'1.0-1' }}% du total
          · {{ data()!.nbContratsGestion }} contrats
        </div>
      </div>
      <div class="cra-hero-sep"></div>
      <div class="cra-hero-item">
        <div class="cra-hero-lbl">Commissions travaux</div>
        <div class="cra-hero-val" style="color:#a78bfa">
          {{ data()!.commissionsTravaux | number:'1.0-0' }}
          <span class="cra-unit">MRU</span>
        </div>
        <div class="cra-hero-sub">
          {{ pctSource(data()!.commissionsTravaux) | number:'1.0-1' }}% du total
          · {{ data()!.nbChantiersFactures }} chantiers
        </div>
      </div>
      <div class="cra-hero-sep"></div>
      <div class="cra-hero-item">
        <div class="cra-hero-lbl">Commissions services</div>
        <div class="cra-hero-val" style="color:#60a5fa">
          {{ data()!.commissionsServices | number:'1.0-0' }}
          <span class="cra-unit">MRU</span>
        </div>
        <div class="cra-hero-sub">
          {{ pctSource(data()!.commissionsServices) | number:'1.0-1' }}% du total
          · {{ data()!.nbPrestationsServices }} prestations
        </div>
      </div>
    </div>

    <!-- ══ QUICK STATS ══ -->
    <div class="cra-qs-grid">
      <div class="cra-qs cra-qs-gold">
        <div class="cra-qs-ico">🏢</div>
        <div class="cra-qs-lbl">Commissions gestion</div>
        <div class="cra-qs-val">{{ data()!.commissionsGestion | number:'1.0-0' }} <span class="cra-unit">MRU</span></div>
        <div class="cra-qs-sub">Taux moy. {{ data()!.tauxCommissionMoyen | number:'1.0-1' }}% · {{ data()!.nbContratsGestion }} contrats actifs</div>
      </div>
      <div class="cra-qs cra-qs-violet">
        <div class="cra-qs-ico">🔧</div>
        <div class="cra-qs-lbl">Commissions travaux</div>
        <div class="cra-qs-val">{{ data()!.commissionsTravaux | number:'1.0-0' }} <span class="cra-unit">MRU</span></div>
        <div class="cra-qs-sub">Taux moy. {{ data()!.tauxCommissionTravaux | number:'1.0-1' }}% · {{ data()!.nbChantiersFactures }} chantiers</div>
      </div>
      <div class="cra-qs cra-qs-blue">
        <div class="cra-qs-ico">🤝</div>
        <div class="cra-qs-lbl">Commissions services</div>
        <div class="cra-qs-val">{{ data()!.commissionsServices | number:'1.0-0' }} <span class="cra-unit">MRU</span></div>
        <div class="cra-qs-sub">{{ data()!.nbPrestationsServices }} prestations · ce mois</div>
      </div>
      <div class="cra-qs cra-qs-green">
        <div class="cra-qs-ico">💰</div>
        <div class="cra-qs-lbl">Total du mois</div>
        <div class="cra-qs-val cra-green">{{ data()!.totalRecettes | number:'1.0-0' }} <span class="cra-unit">MRU</span></div>
        <div class="cra-qs-sub">{{ moisLabel() }}</div>
      </div>
    </div>

    <!-- ══ AJOUT RAPIDE ══ -->
    <div class="ra-ajout-banner">
      <div>
        <div class="ra-ajout-title">Enregistrer une recette</div>
        <div class="ra-ajout-sub">Saisir une nouvelle commission perçue sur l'une des trois sources</div>
      </div>
      <div class="ra-ajout-btns">
        <button class="ra-btn-ajout ra-btn-gold"   (click)="openModal('gestion')">
          <span class="mi">add</span> Commission gestion
        </button>
        <button class="ra-btn-ajout ra-btn-violet" (click)="openModal('travaux')">
          <span class="mi">add</span> Commission travaux
        </button>
        <button class="ra-btn-ajout ra-btn-blue"   (click)="openModal('services')">
          <span class="mi">add</span> Commission services
        </button>
      </div>
    </div>

    <!-- ══ 3 CARTES SOURCES ══ -->
    <div class="cra-sources-grid">

      <!-- Gestion -->
      <div class="cra-card cra-card-gold">
        <div class="cra-card-head">
          <div class="cra-card-title-wrap">
            <div class="cra-card-ico cra-ico-gold">🏢</div>
            <div>
              <div class="cra-card-title">Commissions gestion</div>
              <div class="cra-card-sub">
                {{ data()!.nbContratsGestion }} contrats · taux moy. {{ data()!.tauxCommissionMoyen | number:'1.0-1' }}%
              </div>
            </div>
          </div>
          <div class="cra-card-total cra-gold-txt">{{ data()!.commissionsGestion | number:'1.0-0' }} MRU</div>
        </div>
        <div class="cra-card-body">
          <div class="cra-detail-line" *ngFor="let c of topGestion()">
            <div class="cra-dl-left">
              <div class="cra-dot cra-dot-gold"></div>
              <div class="cra-dl-label">
                <strong>{{ c.proprietaireNom }}</strong>
                <span class="cra-dl-sub">{{ c.proprieteLibelle }} · {{ c.periodicite }}</span>
              </div>
            </div>
            <div class="cra-bar-wrap">
              <div class="cra-bar cra-bar-gold"
                   [style.width.%]="barPct(c.commissionNette, maxGestion())"></div>
            </div>
            <span class="cra-tag">{{ (c.tauxCommission * 100) | number:'1.0-0' }}%</span>
            <div class="cra-dl-amount cra-gold-txt">{{ c.commissionNette | number:'1.0-0' }} MRU</div>
          </div>
          <div class="cra-detail-line cra-detail-more"
               *ngIf="data()!.topGestion.length > 4">
            <div class="cra-dl-left" style="color:var(--cra-slate)">
              + {{ data()!.topGestion.length - 4 }} autre(s) contrat(s)
            </div>
            <div class="cra-dl-amount">{{ autresGestion() | number:'1.0-0' }} MRU</div>
          </div>
          <!-- Footer brut/frais/net -->
          <div class="cra-card-footer">
            <span class="cra-footer-item">
              Brut <strong>{{ brutGestion() | number:'1.0-0' }}</strong> MRU
            </span>
            <span class="cra-footer-sep">−</span>
            <span class="cra-footer-item cra-red-txt">
              Frais <strong>{{ fraisGestion() | number:'1.0-0' }}</strong> MRU
            </span>
            <span class="cra-footer-sep">=</span>
            <span class="cra-footer-item cra-gold-txt">
              Net <strong>{{ data()!.commissionsGestion | number:'1.0-0' }}</strong> MRU
            </span>
          </div>
        </div>
      </div>

      <!-- Travaux -->
      <div class="cra-card cra-card-violet">
        <div class="cra-card-head">
          <div class="cra-card-title-wrap">
            <div class="cra-card-ico cra-ico-violet">🔧</div>
            <div>
              <div class="cra-card-title">Commissions travaux</div>
              <div class="cra-card-sub">
                {{ data()!.nbChantiersFactures }} chantiers réceptionnés · taux moy. {{ data()!.tauxCommissionTravaux | number:'1.0-1' }}%
              </div>
            </div>
          </div>
          <div class="cra-card-total cra-violet-txt">{{ data()!.commissionsTravaux | number:'1.0-0' }} MRU</div>
        </div>
        <div class="cra-card-body">
          <div class="cra-detail-line" *ngFor="let t of topTravaux()">
            <div class="cra-dl-left">
              <div class="cra-dot cra-dot-violet"></div>
              <div class="cra-dl-label">
                <strong>#{{ t.chantierNumero }} — {{ t.chantierLibelle }}</strong>
                <span class="cra-dl-sub">{{ t.proprieteLibelle }} · Réc. {{ t.dateReception | date:'dd/MM/yyyy' }}</span>
              </div>
            </div>
            <div class="cra-bar-wrap">
              <div class="cra-bar cra-bar-violet"
                   [style.width.%]="barPct(t.commission, maxTravaux())"></div>
            </div>
            <span class="cra-tag">{{ (t.tauxCommission * 100) | number:'1.0-0' }}%</span>
            <div class="cra-dl-amount cra-violet-txt">{{ t.commission | number:'1.0-0' }} MRU</div>
          </div>
          <div class="cra-detail-line cra-detail-more"
               *ngIf="data()!.topTravaux.length > 4">
            <div class="cra-dl-left" style="color:var(--cra-slate)">
              + {{ data()!.topTravaux.length - 4 }} autre(s) chantier(s)
            </div>
            <div class="cra-dl-amount">{{ autresTosauTravaux() | number:'1.0-0' }} MRU</div>
          </div>
          <div class="cra-card-footer">
            <span class="cra-footer-item">
              Chantiers clôturés <strong>{{ data()!.nbChantiersFactures }}</strong>
            </span>
            <span class="cra-footer-sep">·</span>
            <span class="cra-footer-item cra-violet-txt">
              Taux moy. <strong>{{ data()!.tauxCommissionTravaux | number:'1.0-1' }}%</strong>
            </span>
          </div>
        </div>
      </div>

      <!-- Services -->
      <div class="cra-card cra-card-blue">
        <div class="cra-card-head">
          <div class="cra-card-title-wrap">
            <div class="cra-card-ico cra-ico-blue">🤝</div>
            <div>
              <div class="cra-card-title">Commissions services</div>
              <div class="cra-card-sub">
                {{ data()!.nbPrestationsServices }} prestations facturées · {{ moisLabel() }}
              </div>
            </div>
          </div>
          <div class="cra-card-total cra-blue-txt">{{ data()!.commissionsServices | number:'1.0-0' }} MRU</div>
        </div>
        <div class="cra-card-body">
          <!-- Regroupé par type de service -->
          <ng-container *ngFor="let grp of servicesGroupes()">
            <div class="cra-detail-line">
              <div class="cra-dl-left">
                <div class="cra-dot cra-dot-blue"></div>
                <div class="cra-dl-label">
                  <strong>{{ grp.type }}</strong>
                  <span class="cra-dl-sub">{{ grp.count }} prestation(s)</span>
                </div>
              </div>
              <div class="cra-bar-wrap">
                <div class="cra-bar cra-bar-blue"
                     [style.width.%]="barPct(grp.total, maxServices())"></div>
              </div>
              <div class="cra-dl-amount cra-blue-txt">{{ grp.total | number:'1.0-0' }} MRU</div>
            </div>
          </ng-container>
          <div class="cra-card-footer">
            <span class="cra-footer-item cra-green-txt">
              Encaissé <strong>{{ servicesEncaisses() | number:'1.0-0' }}</strong> MRU
            </span>
            <span class="cra-footer-sep">·</span>
            <span class="cra-footer-item" style="color:var(--cra-gold)">
              En attente <strong>{{ servicesAttente() | number:'1.0-0' }}</strong> MRU
            </span>
          </div>
        </div>
      </div>

    </div><!-- /cra-sources-grid -->

    <!-- ══ ÉVOLUTION + RÉPARTITION ══ -->
    <div class="cra-bottom-grid">

      <!-- Évolution 6 mois -->
      <div class="cra-card cra-card-gold">
        <div class="cra-card-head">
          <div class="cra-card-title-wrap">
            <div class="cra-card-ico cra-ico-gold">📈</div>
            <div>
              <div class="cra-card-title">Évolution sur 6 mois</div>
              <div class="cra-card-sub">Gestion · Travaux · Services</div>
            </div>
          </div>
        </div>
        <div class="cra-chart-wrap">
          <div class="cra-chart-bars">
            <div class="cra-chart-col" *ngFor="let pt of historique()">
              <div class="cra-bars-group">
                <div class="cra-bar-hist cra-bar-gest"
                     [style.height.%]="barPctHist(pt.gestion)"
                     [title]="'Gestion: ' + (pt.gestion | number:'1.0-0') + ' MRU'"></div>
                <div class="cra-bar-hist cra-bar-trav"
                     [style.height.%]="barPctHist(pt.travaux)"
                     [title]="'Travaux: ' + (pt.travaux | number:'1.0-0') + ' MRU'"></div>
                <div class="cra-bar-hist cra-bar-svc"
                     [style.height.%]="barPctHist(pt.services)"
                     [title]="'Services: ' + (pt.services | number:'1.0-0') + ' MRU'"></div>
              </div>
              <div class="cra-chart-lbl">{{ pt.label }}</div>
            </div>
          </div>
          <div class="cra-chart-legend">
            <div class="cra-leg"><div class="cra-leg-dot" style="background:#c9a84c"></div>Gestion</div>
            <div class="cra-leg"><div class="cra-leg-dot" style="background:#7c3aed"></div>Travaux</div>
            <div class="cra-leg"><div class="cra-leg-dot" style="background:#2563eb"></div>Services</div>
          </div>
        </div>
      </div>

      <!-- Répartition -->
      <div class="cra-card cra-card-violet">
        <div class="cra-card-head">
          <div class="cra-card-title-wrap">
            <div class="cra-card-ico cra-ico-violet">🥧</div>
            <div>
              <div class="cra-card-title">Répartition des recettes</div>
              <div class="cra-card-sub">Par source · {{ moisLabel() }}</div>
            </div>
          </div>
        </div>
        <div class="cra-repartition-body">
          <div class="cra-stacked-bar">
            <div class="cra-stacked-seg cra-seg-gold"
                 [style.width.%]="pctSource(data()!.commissionsGestion)"
                 [title]="'Gestion ' + (data()!.commissionsGestion | number:'1.0-0') + ' MRU'">
              <span *ngIf="pctSource(data()!.commissionsGestion) > 15">
                {{ pctSource(data()!.commissionsGestion) | number:'1.0-0' }}%
              </span>
            </div>
            <div class="cra-stacked-seg cra-seg-violet"
                 [style.width.%]="pctSource(data()!.commissionsTravaux)"
                 [title]="'Travaux ' + (data()!.commissionsTravaux | number:'1.0-0') + ' MRU'">
              <span *ngIf="pctSource(data()!.commissionsTravaux) > 10">
                {{ pctSource(data()!.commissionsTravaux) | number:'1.0-0' }}%
              </span>
            </div>
            <div class="cra-stacked-seg cra-seg-blue"
                 [style.width.%]="pctSource(data()!.commissionsServices)"
                 *ngIf="data()!.commissionsServices > 0"
                 [title]="'Services ' + (data()!.commissionsServices | number:'1.0-0') + ' MRU'">
              <span *ngIf="pctSource(data()!.commissionsServices) > 10">
                {{ pctSource(data()!.commissionsServices) | number:'1.0-0' }}%
              </span>
            </div>
          </div>
          <div class="cra-detail-line">
            <div class="cra-dl-left">
              <div class="cra-dot cra-dot-gold"></div>
              <div class="cra-dl-label">Commissions gestion locative</div>
            </div>
            <div class="cra-dl-amount cra-gold-txt">{{ data()!.commissionsGestion | number:'1.0-0' }} MRU</div>
          </div>
          <div class="cra-detail-line">
            <div class="cra-dl-left">
              <div class="cra-dot cra-dot-violet"></div>
              <div class="cra-dl-label">Commissions travaux / chantiers</div>
            </div>
            <div class="cra-dl-amount cra-violet-txt">{{ data()!.commissionsTravaux | number:'1.0-0' }} MRU</div>
          </div>
          <div class="cra-detail-line">
            <div class="cra-dl-left">
              <div class="cra-dot cra-dot-blue"></div>
              <div class="cra-dl-label">Commissions services agence</div>
            </div>
            <div class="cra-dl-amount cra-blue-txt">{{ data()!.commissionsServices | number:'1.0-0' }} MRU</div>
          </div>
          <div class="cra-repartition-total">
            <span>Total recettes</span>
            <span class="cra-total-val">{{ data()!.totalRecettes | number:'1.0-0' }} MRU</span>
          </div>
        </div>
      </div>

    </div>

    <!-- ══ TABLE TOUTES LES LIGNES ══ -->
    <div class="cra-card cra-card-table">
      <div class="cra-card-head">
        <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">
          <div class="cra-card-title-wrap">
            <div class="cra-card-ico" style="background:#f1f5f9">📋</div>
            <div class="cra-card-title">Toutes les recettes</div>
          </div>
          <!-- Filtres par source -->
          <div class="ra-tab-pills">
            <button class="ra-tab-pill" [class.ra-all]="filtreLigne===''"
                    (click)="filtreLigne=''">Toutes</button>
            <button class="ra-tab-pill" [class.ra-gold]="filtreLigne==='gestion'"
                    (click)="filtreLigne='gestion'">🏢 Gestion</button>
            <button class="ra-tab-pill" [class.ra-violet]="filtreLigne==='travaux'"
                    (click)="filtreLigne='travaux'">🔧 Travaux</button>
            <button class="ra-tab-pill" [class.ra-blue]="filtreLigne==='services'"
                    (click)="filtreLigne='services'">🤝 Services</button>
          </div>
        </div>
        <div class="ra-search">
          <span class="mi">search</span>
          <input type="text" [(ngModel)]="searchQuery" placeholder="Rechercher…">
        </div>
      </div>

      <table class="data-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Source</th>
            <th>Libellé</th>
            <th>Référence</th>
            <th class="text-right">Montant</th>
            <th class="text-center">Statut</th>
            <th class="text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let l of lignesFiltrees()">
            <td style="color:var(--cra-slate);font-size:12px">{{ l.date | date:'dd/MM/yyyy' }}</td>
            <td>
              <span class="ra-src-badge" [ngClass]="'ra-src-' + l.source">
                {{ srcLabel(l.source) }}
              </span>
            </td>
            <td>
              <div style="font-weight:500;color:var(--cra-navy);font-size:13px">{{ l.libelle }}</div>
              <div *ngIf="l.sub" style="font-size:11px;color:var(--cra-slate)">{{ l.sub }}</div>
            </td>
            <td style="font-family:monospace;font-size:11px;color:var(--cra-slate)">{{ l.ref || '—' }}</td>
            <td class="text-right" style="font-family:monospace;font-weight:600;color:var(--cra-navy)">
              {{ l.montant | number:'1.0-0' }} MRU
            </td>
            <td class="text-center">
              <span class="badge" [class.badge-green]="l.statut==='ok'" [class.badge-amber]="l.statut==='att'">
                {{ l.statut === 'ok' ? 'Encaissé' : 'En attente' }}
              </span>
            </td>
            <td class="text-right">
              <div class="row-actions">
                <button class="action-btn view" title="Détail" (click)="voirLigne(l)">
                  <span class="mi">visibility</span>
                </button>
                <button class="action-btn ok" title="Marquer encaissé"
                        *ngIf="l.statut==='att'" (click)="marquerEncaisse(l)">
                  <span class="mi">check_circle</span>
                </button>
              </div>
            </td>
          </tr>
          <tr *ngIf="!lignesFiltrees().length">
            <td colspan="7">
              <div class="empty-state">
                <span class="mi">search_off</span>
                <div class="empty-title">Aucune recette trouvée</div>
                <div class="empty-sub">Modifiez le filtre ou actualisez les données</div>
              </div>
            </td>
          </tr>
        </tbody>
        <tfoot *ngIf="lignesFiltrees().length">
          <tr style="background:var(--cra-bg)">
            <td colspan="4" style="font-weight:600;color:var(--cra-slate)">
              Total ({{ lignesFiltrees().length }} ligne{{ lignesFiltrees().length > 1 ? 's' : '' }})
            </td>
            <td class="text-right" style="font-family:monospace;font-weight:700;font-size:14px;color:var(--cra-gold)">
              {{ totalLignesFiltrees() | number:'1.0-0' }} MRU
            </td>
            <td colspan="2"></td>
          </tr>
        </tfoot>
      </table>
    </div>

  </ng-container>

  <!-- ══ MODAL AJOUT ══ -->
  <div class="modal-overlay" *ngIf="modalOpen" (click)="closeOnOverlay($event)">
    <div class="modal">
      <div class="modal-header">
        <div class="modal-title">
          <span class="mi">{{ modalType === 'gestion' ? 'home_work' : modalType === 'travaux' ? 'construction' : 'handshake' }}</span>
          {{ modalTitle() }}
        </div>
        <button class="modal-close" (click)="modalOpen=false">
          <span class="mi">close</span>
        </button>
      </div>

      <div class="modal-body">
        <!-- Sélecteur de type -->
        <div class="ra-type-picker">
          <button class="ra-type-btn" [class.ra-sel-gold]="modalType==='gestion'"
                  (click)="modalType='gestion'; resetForm()">
            <span class="ra-ti">🏢</span><span class="ra-tl">Gestion</span>
          </button>
          <button class="ra-type-btn" [class.ra-sel-violet]="modalType==='travaux'"
                  (click)="modalType='travaux'; resetForm()">
            <span class="ra-ti">🔧</span><span class="ra-tl">Travaux</span>
          </button>
          <button class="ra-type-btn" [class.ra-sel-blue]="modalType==='services'"
                  (click)="modalType='services'; resetForm()">
            <span class="ra-ti">🤝</span><span class="ra-tl">Services</span>
          </button>
        </div>

        <!-- Formulaire Gestion -->
        <ng-container *ngIf="modalType==='gestion'">
          <div class="form-row">
            <div class="form-group">
              <label>Contrat de gestion <span class="req">*</span></label>
              <select class="form-control" [(ngModel)]="form.contratId">
                <option value="">— Sélectionner —</option>
                <option *ngFor="let c of contratsDisponibles" [value]="c.id">{{ c.label }}</option>
              </select>
            </div>
            <div class="form-group">
              <label>Période</label>
              <input type="month" class="form-control" [(ngModel)]="form.periode">
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Loyer brut collecté <span class="req">*</span></label>
              <div class="input-with-suffix">
                <input type="number" class="form-control" [(ngModel)]="form.loyerBrut" placeholder="240 000" (input)="calcCommissionGestion()">
                <span class="input-suffix">MRU</span>
              </div>
            </div>
            <div class="form-group">
              <label>Taux commission</label>
              <div class="input-with-suffix">
                <input type="number" class="form-control" [(ngModel)]="form.tauxCommission" placeholder="10" (input)="calcCommissionGestion()">
                <span class="input-suffix">%</span>
              </div>
            </div>
          </div>
          <div class="form-row form-row-full">
            <div class="form-group">
              <label>Commission calculée</label>
              <div class="ra-calc-result ra-calc-gold">
                {{ commissionCalculee() | number:'1.0-0' }} MRU
              </div>
            </div>
          </div>
          <div class="form-row form-row-full">
            <div class="form-group">
              <label>Notes</label>
              <textarea class="form-control" [(ngModel)]="form.notes" rows="2" style="resize:none" placeholder="Remarques…"></textarea>
            </div>
          </div>
        </ng-container>

        <!-- Formulaire Travaux -->
        <ng-container *ngIf="modalType==='travaux'">
          <div class="form-row form-row-full">
            <div class="form-group">
              <label>Chantier réceptionné <span class="req">*</span></label>
              <select class="form-control" [(ngModel)]="form.chantierId" (change)="onChantierSelect()">
                <option value="">— Sélectionner un chantier réceptionné —</option>
                <option *ngFor="let c of chantiersDisponibles" [value]="c.id">
                  #{{ c.numero }} — {{ c.libelle }} ({{ c.budget | number:'1.0-0' }} MRU)
                </option>
              </select>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Budget chantier</label>
              <div class="input-with-suffix">
                <input type="number" class="form-control" [(ngModel)]="form.loyerBrut" placeholder="120 000" (input)="calcCommissionTravaux()">
                <span class="input-suffix">MRU</span>
              </div>
            </div>
            <div class="form-group">
              <label>Taux commission travaux</label>
              <div class="input-with-suffix">
                <input type="number" class="form-control" [(ngModel)]="form.tauxCommission" placeholder="5" (input)="calcCommissionTravaux()">
                <span class="input-suffix">%</span>
              </div>
            </div>
          </div>
          <div class="form-row form-row-full">
            <div class="form-group">
              <label>Commission calculée</label>
              <div class="ra-calc-result ra-calc-violet">
                {{ commissionCalculee() | number:'1.0-0' }} MRU
              </div>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Date de réception</label>
              <input type="date" class="form-control" [(ngModel)]="form.dateReception">
            </div>
            <div class="form-group">
              <label>Référence</label>
              <input type="text" class="form-control" [(ngModel)]="form.reference" placeholder="TRV-2026-XX">
            </div>
          </div>
        </ng-container>

        <!-- Formulaire Services -->
        <ng-container *ngIf="modalType==='services'">
          <div class="form-row">
            <div class="form-group">
              <label>Type de service <span class="req">*</span></label>
              <select class="form-control" [(ngModel)]="form.typeService">
                <option value="">— Sélectionner —</option>
                <option *ngFor="let t of typesServices" [value]="t">{{ t }}</option>
              </select>
            </div>
            <div class="form-group">
              <label>Date <span class="req">*</span></label>
              <input type="date" class="form-control" [(ngModel)]="form.dateReception">
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Montant <span class="req">*</span></label>
              <div class="input-with-suffix">
                <input type="number" class="form-control" [(ngModel)]="form.loyerBrut" placeholder="1 200">
                <span class="input-suffix">MRU</span>
              </div>
            </div>
            <div class="form-group">
              <label>Référence</label>
              <input type="text" class="form-control" [(ngModel)]="form.reference" placeholder="SVC-2026-XX">
            </div>
          </div>
          <div class="form-row form-row-full">
            <div class="form-group">
              <label>Propriétaire / Client</label>
              <select class="form-control" [(ngModel)]="form.contratId">
                <option value="">— Sélectionner (optionnel) —</option>
                <option *ngFor="let p of proprietairesDisponibles" [value]="p.id">{{ p.nom }}</option>
              </select>
            </div>
          </div>
          <div class="form-row form-row-full">
            <div class="form-group">
              <label>Description</label>
              <textarea class="form-control" [(ngModel)]="form.notes" rows="2" style="resize:none" placeholder="Détails de la prestation…"></textarea>
            </div>
          </div>
        </ng-container>
      </div>

      <div class="modal-footer">
        <button class="btn btn-secondary" (click)="modalOpen=false">Annuler</button>
        <button class="btn btn-gold" (click)="soumettre()" [disabled]="!formValide() || saving">
          <span class="mi">check</span>
          {{ saving ? 'Enregistrement…' : 'Enregistrer' }}
        </button>
      </div>
    </div>
  </div>

  <!-- ══ TOAST ══ -->
  <div class="cra-toast" [class.visible]="toastVisible" [class.ok]="toastType==='ok'" [class.err]="toastType==='err'">
    {{ toastMsg }}
  </div>

</div>
  `,
  styles: [`
    /* ── Variables (héritées + locales) ── */
    .cra-root {
      --cra-navy:      #0b1829;
      --cra-navy2:     #132238;
      --cra-gold:      #c9a84c;
      --cra-gold2:     #e8c97a;
      --cra-gold-bg:   #fdf8ec;
      --cra-green:     #16a34a;
      --cra-green-bg:  #f0fdf4;
      --cra-red:       #dc2626;
      --cra-red-bg:    #fef2f2;
      --cra-blue:      #2563eb;
      --cra-blue-bg:   #eff6ff;
      --cra-blue2:     #dbeafe;
      --cra-violet:    #7c3aed;
      --cra-violet-bg: #f5f3ff;
      --cra-violet2:   #ede9fe;
      --cra-slate:     #64748b;
      --cra-border:    #e8edf5;
      --cra-bg:        #f4f6fa;
      --cra-white:     #fff;
      --cra-text:      #0f172a;
      --cra-r:         10px;
      --cra-shadow:    0 2px 12px rgba(11,24,41,.08);
    }

    /* ── Header ── */
    .page-header { display:flex; align-items:flex-start; justify-content:space-between; margin-bottom:24px; flex-wrap:wrap; gap:12px; }
    .page-eyebrow { font-size:11px; font-weight:600; color:var(--cra-gold); text-transform:uppercase; letter-spacing:.8px; margin-bottom:3px; }
    .page-title { font-size:24px; font-weight:800; color:var(--cra-navy); display:flex; align-items:center; gap:8px; }
    .page-subtitle { font-size:13px; color:var(--cra-slate); margin-top:3px; }
    .cra-header-actions { display:flex; align-items:center; gap:8px; flex-wrap:wrap; }
    .cra-sel-mois { padding:7px 12px; border:1px solid var(--cra-border); border-radius:8px; font-size:13px; background:var(--cra-white); color:var(--cra-navy); font-family:inherit; outline:none; cursor:pointer; }
    .cra-view-toggle { display:flex; border:1px solid var(--cra-border); border-radius:8px; overflow:hidden; background:var(--cra-white); }
    .cra-view-toggle button { padding:7px 12px; border:none; background:none; cursor:pointer; font-size:12px; font-weight:500; color:var(--cra-slate); font-family:inherit; transition:all .15s; }
    .cra-view-toggle button.on { background:var(--cra-navy); color:#fff; }

    /* ── Loading ── */
    .cra-loading { display:flex; align-items:center; gap:10px; padding:60px; justify-content:center; color:var(--cra-slate); }
    .cra-spinner { width:20px; height:20px; border:2px solid var(--cra-border); border-top-color:var(--cra-navy); border-radius:50%; animation:spin .7s linear infinite; }
    @keyframes spin { to { transform:rotate(360deg); } }

    /* ── Hero ── */
    .cra-hero { background:linear-gradient(135deg,var(--cra-navy) 0%,#1c3a6e 100%); border-radius:14px; padding:24px 28px; display:grid; grid-template-columns:1fr auto 1fr auto 1fr auto 1fr; align-items:center; margin-bottom:20px; position:relative; overflow:hidden; }
    .cra-hero::before { content:''; position:absolute; inset:0; background:repeating-linear-gradient(45deg,rgba(201,168,76,.03) 0,rgba(201,168,76,.03) 1px,transparent 1px,transparent 12px); }
    .cra-hero-item { position:relative; z-index:1; }
    .cra-hero-lbl { font-size:10px; font-weight:600; color:rgba(255,255,255,.4); text-transform:uppercase; letter-spacing:.7px; margin-bottom:5px; }
    .cra-hero-val { font-family:monospace; font-size:24px; font-weight:700; }
    .cra-gold  { color:var(--cra-gold); }
    .cra-green { color:#4ade80; }
    .cra-red   { color:#f87171; }
    .cra-hero-sub { font-size:11px; color:rgba(255,255,255,.4); margin-top:3px; }
    .cra-hero-badge { display:inline-flex; align-items:center; font-size:11px; font-weight:600; padding:3px 9px; border-radius:20px; margin-top:5px; }
    .cra-hero-badge.pos { background:rgba(74,222,128,.15); color:#4ade80; }
    .cra-hero-badge.neg { background:rgba(248,113,113,.15); color:#f87171; }
    .cra-hero-sep { width:1px; height:54px; background:rgba(255,255,255,.1); }
    .cra-unit { font-size:11px; font-weight:400; color:rgba(255,255,255,.3); margin-left:2px; }

    /* ── Quick stats ── */
    .cra-qs-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:14px; margin-bottom:20px; }
    .cra-qs { background:var(--cra-white); border:1px solid var(--cra-border); border-radius:var(--cra-r); padding:16px; box-shadow:var(--cra-shadow); position:relative; overflow:hidden; }
    .cra-qs::after { content:''; position:absolute; right:0; top:0; bottom:0; width:3px; border-radius:0 var(--cra-r) var(--cra-r) 0; }
    .cra-qs-gold::after   { background:var(--cra-gold); }
    .cra-qs-violet::after { background:var(--cra-violet); }
    .cra-qs-blue::after   { background:var(--cra-blue); }
    .cra-qs-green::after  { background:var(--cra-green); }
    .cra-qs-ico  { font-size:20px; margin-bottom:5px; }
    .cra-qs-lbl  { font-size:10px; font-weight:600; color:var(--cra-slate); text-transform:uppercase; letter-spacing:.5px; }
    .cra-qs-val  { font-family:monospace; font-size:20px; font-weight:700; color:var(--cra-navy); margin:3px 0; }
    .cra-qs-val .cra-unit { font-size:11px; color:var(--cra-slate); font-family:inherit; font-weight:400; }
    .cra-qs-val.cra-green { color:var(--cra-green); }
    .cra-qs-sub  { font-size:11px; color:var(--cra-slate); }

    /* ── Bannière ajout rapide ── */
    .ra-ajout-banner { background:var(--cra-navy); border-radius:var(--cra-r); padding:16px 22px; display:flex; align-items:center; justify-content:space-between; gap:14px; margin-bottom:20px; flex-wrap:wrap; }
    .ra-ajout-title  { font-size:14px; font-weight:700; color:#fff; margin-bottom:2px; }
    .ra-ajout-sub    { font-size:11px; color:rgba(255,255,255,.4); }
    .ra-ajout-btns   { display:flex; gap:8px; flex-wrap:wrap; }
    .ra-btn-ajout { display:inline-flex; align-items:center; gap:5px; padding:7px 13px; border-radius:8px; font-family:inherit; font-size:12px; font-weight:600; cursor:pointer; border:none; transition:all .16s; }
    .ra-btn-ajout .mi { font-size:14px; }
    .ra-btn-gold   { background:var(--cra-gold);  color:var(--cra-navy); }
    .ra-btn-gold:hover   { background:var(--cra-gold2); }
    .ra-btn-violet { background:var(--cra-violet); color:#fff; }
    .ra-btn-violet:hover { background:#6d28d9; }
    .ra-btn-blue   { background:var(--cra-blue);   color:#fff; }
    .ra-btn-blue:hover   { background:#1a46a8; }

    /* ── Sources grid ── */
    .cra-sources-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:16px; margin-bottom:20px; }

    /* ── Cards ── */
    .cra-card { background:var(--cra-white); border:1px solid var(--cra-border); border-radius:var(--cra-r); box-shadow:var(--cra-shadow); overflow:hidden; }
    .cra-card-table { margin-bottom:20px; }
    .cra-card-gold   { border-top:3px solid var(--cra-gold); }
    .cra-card-violet { border-top:3px solid var(--cra-violet); }
    .cra-card-blue   { border-top:3px solid var(--cra-blue); }
    .cra-card-table  { border-top:3px solid var(--cra-green); }
    .cra-card-head { padding:14px 18px; border-bottom:1px solid var(--cra-border); display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:8px; }
    .cra-card-title-wrap { display:flex; align-items:center; gap:10px; }
    .cra-card-ico { width:34px; height:34px; border-radius:8px; display:flex; align-items:center; justify-content:center; font-size:16px; flex-shrink:0; }
    .cra-ico-gold   { background:var(--cra-gold-bg); }
    .cra-ico-violet { background:var(--cra-violet-bg); }
    .cra-ico-blue   { background:var(--cra-blue-bg); }
    .cra-card-title { font-size:14px; font-weight:700; color:var(--cra-navy); }
    .cra-card-sub   { font-size:11px; color:var(--cra-slate); margin-top:2px; }
    .cra-card-total { font-family:monospace; font-size:15px; font-weight:700; }

    /* ── Lignes détail dans les cards ── */
    .cra-card-body { padding:10px 16px 6px; }
    .cra-detail-line { display:flex; align-items:center; gap:10px; padding:7px 0; border-bottom:1px solid var(--cra-border); }
    .cra-detail-line:last-child { border-bottom:none; }
    .cra-detail-more { opacity:.65; }
    .cra-dl-left  { display:flex; align-items:flex-start; gap:8px; flex:1; min-width:0; }
    .cra-dot { width:7px; height:7px; border-radius:50%; flex-shrink:0; margin-top:5px; }
    .cra-dot-gold   { background:var(--cra-gold); }
    .cra-dot-violet { background:var(--cra-violet); }
    .cra-dot-blue   { background:var(--cra-blue); }
    .cra-dl-label { flex:1; min-width:0; font-size:12px; color:var(--cra-slate); }
    .cra-dl-label strong { display:block; font-weight:500; color:var(--cra-navy); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
    .cra-dl-sub { font-size:10px; color:var(--cra-slate); display:block; margin-top:1px; }
    .cra-bar-wrap { width:72px; height:5px; background:var(--cra-border); border-radius:3px; flex-shrink:0; overflow:hidden; }
    .cra-bar { height:100%; border-radius:3px; transition:width .6s cubic-bezier(.4,0,.2,1); }
    .cra-bar-gold   { background:var(--cra-gold); }
    .cra-bar-violet { background:var(--cra-violet); }
    .cra-bar-blue   { background:var(--cra-blue); }
    .cra-tag { font-size:10px; color:var(--cra-slate); width:28px; text-align:right; flex-shrink:0; }
    .cra-dl-amount { font-family:monospace; font-size:12px; font-weight:600; width:90px; text-align:right; flex-shrink:0; }
    .cra-gold-txt   { color:var(--cra-gold); }
    .cra-violet-txt { color:var(--cra-violet); }
    .cra-blue-txt   { color:var(--cra-blue); }
    .cra-green-txt  { color:var(--cra-green); }
    .cra-red-txt    { color:var(--cra-red); }
    .cra-slate-txt  { color:var(--cra-slate); }

    /* ── Footer card ── */
    .cra-card-footer { display:flex; align-items:center; gap:8px; flex-wrap:wrap; padding:9px 0 4px; font-size:11px; color:var(--cra-slate); border-top:1px dashed var(--cra-border); margin-top:6px; }
    .cra-footer-item { display:flex; align-items:center; gap:3px; }
    .cra-footer-item strong { font-family:monospace; color:var(--cra-navy); }
    .cra-footer-sep { color:var(--cra-border); }

    /* ── Bottom grid ── */
    .cra-bottom-grid { display:grid; grid-template-columns:1fr 1fr; gap:16px; margin-bottom:20px; }

    /* ── Chart ── */
    .cra-chart-wrap { padding:16px 18px 12px; }
    .cra-chart-bars { display:flex; align-items:flex-end; gap:6px; height:130px; margin-bottom:8px; }
    .cra-chart-col  { display:flex; flex-direction:column; align-items:center; gap:3px; flex:1; }
    .cra-bars-group { display:flex; gap:2px; align-items:flex-end; height:110px; }
    .cra-bar-hist   { width:13px; border-radius:3px 3px 0 0; min-height:3px; transition:height .6s cubic-bezier(.4,0,.2,1); }
    .cra-bar-gest   { background:var(--cra-gold); }
    .cra-bar-trav   { background:var(--cra-violet); opacity:.7; }
    .cra-bar-svc    { background:var(--cra-blue); opacity:.7; }
    .cra-chart-lbl  { font-size:9px; color:var(--cra-slate); text-align:center; margin-top:3px; }
    .cra-chart-legend { display:flex; gap:12px; flex-wrap:wrap; }
    .cra-leg { display:flex; align-items:center; gap:5px; font-size:11px; color:var(--cra-slate); }
    .cra-leg-dot { width:8px; height:8px; border-radius:2px; }

    /* ── Répartition ── */
    .cra-repartition-body { padding:14px 18px; }
    .cra-stacked-bar { display:flex; height:22px; border-radius:6px; overflow:hidden; margin-bottom:16px; gap:2px; }
    .cra-stacked-seg { display:flex; align-items:center; justify-content:center; font-size:10px; font-weight:700; color:#fff; transition:width .6s cubic-bezier(.4,0,.2,1); min-width:0; overflow:hidden; border-radius:4px; }
    .cra-seg-gold   { background:var(--cra-gold); }
    .cra-seg-violet { background:var(--cra-violet); }
    .cra-seg-blue   { background:var(--cra-blue); }
    .cra-repartition-total { display:flex; justify-content:space-between; align-items:center; margin-top:12px; padding-top:10px; border-top:1px solid var(--cra-border); font-size:13px; font-weight:600; color:var(--cra-navy); }
    .cra-total-val { font-family:monospace; font-size:16px; font-weight:700; color:var(--cra-gold); }

    /* ── Table header avec tabs ── */
    .ra-tab-pills { display:flex; gap:4px; flex-wrap:wrap; }
    .ra-tab-pill { padding:4px 11px; border-radius:20px; font-size:11px; font-weight:500; border:1.5px solid var(--cra-border); background:transparent; color:var(--cra-slate); cursor:pointer; font-family:inherit; transition:all .12s; }
    .ra-tab-pill:hover { color:var(--cra-navy); }
    .ra-tab-pill.ra-all    { background:var(--cra-navy);   color:#fff; border-color:var(--cra-navy); }
    .ra-tab-pill.ra-gold   { background:var(--cra-gold-bg);   color:#8a6520; border-color:#e8c97a; }
    .ra-tab-pill.ra-violet { background:var(--cra-violet-bg); color:var(--cra-violet); border-color:var(--cra-violet2); }
    .ra-tab-pill.ra-blue   { background:var(--cra-blue-bg);   color:var(--cra-blue); border-color:var(--cra-blue2); }

    /* search */
    .ra-search { display:flex; align-items:center; gap:6px; background:var(--cra-bg); border:1px solid var(--cra-border); border-radius:8px; padding:5px 11px; }
    .ra-search .mi { font-size:15px; color:var(--cra-slate); }
    .ra-search input { border:none; background:none; outline:none; font-family:inherit; font-size:12px; color:var(--cra-navy); width:160px; }
    .ra-search input::placeholder { color:var(--cra-slate); }

    /* source badge */
    .ra-src-badge { display:inline-flex; align-items:center; gap:4px; padding:2px 9px; border-radius:20px; font-size:11px; font-weight:600; }
    .ra-src-gestion  { background:var(--cra-gold-bg);   color:#8a6520; }
    .ra-src-travaux  { background:var(--cra-violet-bg); color:var(--cra-violet); }
    .ra-src-services { background:var(--cra-blue-bg);   color:var(--cra-blue); }

    /* ── Modal ── */
    .ra-type-picker { display:grid; grid-template-columns:repeat(3,1fr); gap:8px; margin-bottom:16px; }
    .ra-type-btn { display:flex; flex-direction:column; align-items:center; gap:5px; padding:12px 8px; border-radius:10px; border:2px solid var(--cra-border); background:var(--cra-white); cursor:pointer; transition:all .16s; font-family:inherit; }
    .ra-type-btn:hover { border-color:var(--cra-gold); }
    .ra-sel-gold   { border-color:var(--cra-gold); background:var(--cra-gold-bg); }
    .ra-sel-violet { border-color:var(--cra-violet); background:var(--cra-violet-bg); }
    .ra-sel-blue   { border-color:var(--cra-blue); background:var(--cra-blue-bg); }
    .ra-ti { font-size:22px; }
    .ra-tl { font-size:11px; font-weight:700; color:var(--cra-slate); }
    .ra-sel-gold .ra-tl   { color:#8a6520; }
    .ra-sel-violet .ra-tl { color:var(--cra-violet); }
    .ra-sel-blue .ra-tl   { color:var(--cra-blue); }

    .ra-calc-result { padding:9px 12px; border-radius:8px; font-family:monospace; font-weight:700; font-size:15px; }
    .ra-calc-gold   { background:var(--cra-gold-bg);   color:var(--cra-gold); }
    .ra-calc-violet { background:var(--cra-violet-bg); color:var(--cra-violet); }

    /* ── Toast ── */
    .cra-toast { position:fixed; bottom:22px; right:22px; z-index:9999; padding:12px 18px; border-radius:10px; font-size:13px; font-weight:500; box-shadow:0 8px 28px rgba(0,0,0,.15); max-width:380px; transform:translateY(60px); opacity:0; transition:transform .28s ease,opacity .28s ease; pointer-events:none; }
    .cra-toast.visible { transform:translateY(0); opacity:1; }
    .cra-toast.ok  { background:var(--cra-green-bg); color:var(--cra-green); border:1px solid #a7f3d0; }
    .cra-toast.err { background:var(--cra-red-bg);   color:var(--cra-red);   border:1px solid #fca5a5; }
  `]
})
export class RecettesAgenceComponent implements OnInit {
  private http = inject(HttpClient);
  private base = environment.apiUrl;

  loading = signal(true);
  data    = signal<RecettesAgenceDto>(this.buildFallback());

  moisSelectionne  = new Date().toISOString().slice(0, 7);
  moisDisponibles  = this.buildMoisDisponibles();
  vue: 'mensuel' | 'trimestriel' | 'annuel' = 'mensuel';

  // ── Table ──────────────────────────────────────────────────────────────────
  filtreLigne  = '';
  searchQuery  = '';
  private toutesLignes: LigneTable[] = [];

  // ── Modal ──────────────────────────────────────────────────────────────────
  modalOpen = false;
  modalType: 'gestion' | 'travaux' | 'services' = 'gestion';
  saving    = false;
  typesServices = TYPES_SERVICES;

  form = this.emptyForm();

  // Données référentielles (chargées depuis le tableau de bord existant)
  contratsDisponibles:      { id: string; label: string }[] = [];
  chantiersDisponibles:     { id: string; numero: string; libelle: string; budget: number }[] = [];
  proprietairesDisponibles: { id: string; nom: string }[] = [];

  // Historique 6 mois
  private historiqueData: PointHistorique[] = [];

  // Toast
  toastMsg = ''; toastType = ''; toastVisible = false;
  private _toastTimer: any;

  // ── Computed ───────────────────────────────────────────────────────────────
  topGestion = computed(() => this.data().topGestion.slice(0, 4).sort((a, b) => b.commissionNette - a.commissionNette));
  topTravaux = computed(() => this.data().topTravaux.slice(0, 4).sort((a, b) => b.commission - a.commission));

  maxGestion  = computed(() => Math.max(...this.data().topGestion.map(c => c.commissionNette), 1));
  maxTravaux  = computed(() => Math.max(...this.data().topTravaux.map(t => t.commission), 1));
  maxServices = computed(() => {
    const groupes = this.servicesGroupes();
    return Math.max(...groupes.map(g => g.total), 1);
  });

  autresGestion = computed(() =>
    this.data().topGestion.slice(4).reduce((s, c) => s + c.commissionNette, 0)
  );
  autresTosauTravaux = computed(() =>
    this.data().topTravaux.slice(4).reduce((s, t) => s + t.commission, 0)
  );

  servicesGroupes = computed(() => {
    const map = new Map<string, { total: number; count: number }>();
    for (const s of this.data().lignesServices) {
      const cur = map.get(s.typeService) ?? { total: 0, count: 0 };
      map.set(s.typeService, { total: cur.total + s.montant, count: cur.count + 1 });
    }
    return [...map.entries()]
      .map(([type, v]) => ({ type, ...v }))
      .sort((a, b) => b.total - a.total);
  });

  servicesEncaisses = computed(() =>
    this.data().lignesServices.filter(s => s.statut === 'Encaisse').reduce((s, l) => s + l.montant, 0)
  );
  servicesAttente = computed(() =>
    this.data().lignesServices.filter(s => s.statut === 'EnAttente').reduce((s, l) => s + l.montant, 0)
  );

  brutGestion  = computed(() => this.data().topGestion.reduce((s, c) => s + c.loyerBrut, 0));
  fraisGestion = computed(() => this.data().topGestion.reduce((s, c) => s + c.fraisImputes, 0));

  historique = computed(() => this.historiqueData);

  commissionCalculee = computed(() => {
    const b = +this.form.loyerBrut    || 0;
    const t = +this.form.tauxCommission || 0;
    return Math.round(b * t / 100);
  });

  lignesFiltrees = computed(() =>
    this.toutesLignes.filter(l => {
      const matchSrc = !this.filtreLigne || l.source === this.filtreLigne;
      const q = this.searchQuery.toLowerCase();
      const matchQ = !q || l.libelle.toLowerCase().includes(q) || (l.ref ?? '').toLowerCase().includes(q);
      return matchSrc && matchQ;
    })
  );

  totalLignesFiltrees = computed(() =>
    this.lignesFiltrees().reduce((s, l) => s + l.montant, 0)
  );

  // ── Lifecycle ──────────────────────────────────────────────────────────────
  ngOnInit() {
    this.charger();
    this.chargerHistorique();
  }

  charger() {
    this.loading.set(true);
    // Appel principal : GET /agence/recettes
    this.http.get<any>(`${this.base}/agence/recettes?mois=${this.moisSelectionne}`)
      .pipe(catchError(() => of(null)))
      .subscribe(r => {
        if (r) {
          this.data.set(r.data ?? r);
        } else {
          // Fallback : réutiliser tableau de bord existant
          this.chargerDepuisTableauBord();
          return;
        }
        this.buildTableauLignes();
        this.loading.set(false);
      });
  }

  // Fallback si l'endpoint /agence/recettes n'existe pas encore :
  // on reconstruit les données depuis GET /agence/tableau-bord
  private chargerDepuisTableauBord() {
    this.http.get<any>(`${this.base}/agence/tableau-bord?mois=${this.moisSelectionne}`)
      .pipe(catchError(() => of(null)))
      .subscribe((r: any) => {
        const tb: TableauBordAgenceDto = r?.data ?? r ?? ({} as any);
        this.data.set(this.mapTableauBordToRecettes(tb));
        this.buildTableauLignes();
        this.loading.set(false);
      });
  }

  private mapTableauBordToRecettes(tb: TableauBordAgenceDto): RecettesAgenceDto {
    const commGestion  = tb.commissionsNettesMois ?? 0;
    const commTravaux  = tb.fraisAgence?.filter(f =>
      ['Travaux','Chantier','BTP','Rénovation'].some(k =>
        (f.categorie ?? '').toLowerCase().includes(k.toLowerCase()) ||
        (f.libelle ?? '').toLowerCase().includes('chantier') ||
        (f.libelle ?? '').toLowerCase().includes('travaux')
      )).reduce((s, f) => s + f.montant, 0) ?? 0;
    const commServices = 0; // non disponible dans l'ancien modèle

    return {
      mois: tb.mois ?? this.moisSelectionne,
      totalRecettes:          commGestion + commTravaux + commServices,
      commissionsGestion:     commGestion,
      commissionsTravaux:     commTravaux,
      commissionsServices:    commServices,
      variationMoisPrecedent: 0,
      nbContratsGestion:      tb.nbContratsActifs ?? 0,
      tauxCommissionMoyen:    tb.tauxCommissionMoyen ?? 0,
      nbChantiersFactures:    0,
      tauxCommissionTravaux:  5,
      nbPrestationsServices:  0,
      topGestion: (tb.commissionsParContrat ?? []).map(c => ({
        contratId:        c.contratId,
        proprietaireNom:  c.proprietaireNom,
        proprieteLibelle: c.proprieteLibelle,
        periodicite:      '',
        tauxCommission:   c.tauxCommission,
        loyerBrut:        c.loyer,
        commission:       c.commissionBrute,
        fraisImputes:     c.fraisImputes,
        commissionNette:  c.commissionNette,
      })),
      topTravaux: [],
      lignesServices: [],
    };
  }

  private buildTableauLignes() {
    const d = this.data();
    const lignes: LigneTable[] = [];
    // Gestion
    for (const c of d.topGestion) {
      lignes.push({
        source: 'gestion', libelle: `${c.proprietaireNom} — ${c.proprieteLibelle}`,
        sub: `Commission ${(c.tauxCommission * 100).toFixed(0)}%`,
        date: this.moisSelectionne + '-01',
        montant: c.commissionNette, ref: undefined, statut: 'ok'
      });
    }
    // Travaux
    for (const t of d.topTravaux) {
      lignes.push({
        source: 'travaux', libelle: `#${t.chantierNumero} — ${t.chantierLibelle}`,
        sub: t.proprieteLibelle, date: t.dateReception,
        montant: t.commission, ref: t.chantierId.slice(0, 8).toUpperCase(),
        statut: t.statut === 'Facture' ? 'ok' : 'att'
      });
    }
    // Services
    for (const s of d.lignesServices) {
      lignes.push({
        source: 'services', libelle: s.typeService,
        sub: s.libelle, date: s.date,
        montant: s.montant, ref: s.reference,
        statut: s.statut === 'Encaisse' ? 'ok' : 'att'
      });
    }
    this.toutesLignes = lignes.sort((a, b) => b.date.localeCompare(a.date));
  }

  private chargerHistorique() {
    const mois = Array.from({ length: 6 }, (_, i) => {
      const d = new Date();
      d.setMonth(d.getMonth() - (5 - i));
      return d.toISOString().slice(0, 7);
    });
    const noms = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'];

    forkJoin(mois.map(m =>
      this.http.get<any>(`${this.base}/agence/recettes?mois=${m}`)
        .pipe(catchError(() =>
          this.http.get<any>(`${this.base}/agence/tableau-bord?mois=${m}`)
            .pipe(catchError(() => of(null)))
        ))
    )).subscribe(results => {
      this.historiqueData = results.map((r, i) => {
        const d = r?.data ?? r;
        const [y, mo] = mois[i].split('-');
        // Gérer les deux formats de réponse
        const gestion  = d?.commissionsGestion ?? d?.commissionsNettesMois ?? 0;
        const travaux  = d?.commissionsTravaux ?? 0;
        const services = d?.commissionsServices ?? 0;
        return {
          label:    noms[parseInt(mo, 10) - 1] + ' ' + y.slice(2),
          gestion,
          travaux,
          services,
        };
      });
    });
  }

  // ── Modal ──────────────────────────────────────────────────────────────────
  openModal(type: 'gestion' | 'travaux' | 'services') {
    this.modalType = type;
    this.form = this.emptyForm();
    this.form.periode = this.moisSelectionne;
    this.modalOpen = true;
    // Charger les données référentielles depuis le tableau de bord
    this.chargerRef();
  }

  private chargerRef() {
    this.http.get<any>(`${this.base}/agence/tableau-bord?mois=${this.moisSelectionne}`)
      .pipe(catchError(() => of(null)))
      .subscribe((r: any) => {
        const tb: TableauBordAgenceDto = r?.data ?? r;
        // Contrats
        this.contratsDisponibles = (tb?.commissionsParContrat ?? []).map(c => ({
          id: c.contratId,
          label: `${c.proprieteLibelle} — ${c.proprietaireNom}`
        }));
        // Chantiers (depuis fraisAgence catégorie Travaux)
        this.chantiersDisponibles = (tb?.fraisAgence ?? [])
          .filter(f => ['Travaux','Chantier','BTP'].some(k =>
            (f.categorie ?? '').toLowerCase().includes(k.toLowerCase())))
          .map((f, i) => ({
            id: f.id, numero: String(i + 1).padStart(3, '0'),
            libelle: f.libelle, budget: f.montant * 20
          }));
        // Créances propriétaires → comme source de clients services
        this.proprietairesDisponibles = (tb?.creancesProprietaires ?? [])
          .map(c => ({ id: c.proprietaireId, nom: c.proprietaireNom }))
          .filter((v, i, a) => a.findIndex(x => x.id === v.id) === i);
      });
  }

  closeOnOverlay(e: Event) {
    if ((e.target as HTMLElement).classList.contains('modal-overlay')) this.modalOpen = false;
  }

  resetForm() { this.form = { ...this.emptyForm(), periode: this.moisSelectionne }; }

  calcCommissionGestion() { /* computed() s'en charge */ }
  calcCommissionTravaux() { /* computed() s'en charge */ }

  onChantierSelect() {
    const ch = this.chantiersDisponibles.find(c => c.id === this.form.chantierId);
    if (ch) { this.form.loyerBrut = ch.budget; }
  }

  formValide(): boolean {
    if (this.modalType === 'gestion')
      return !!(this.form.contratId && this.form.loyerBrut > 0 && this.form.tauxCommission > 0);
    if (this.modalType === 'travaux')
      return !!(this.form.chantierId && this.form.loyerBrut > 0 && this.form.tauxCommission > 0);
    if (this.modalType === 'services')
      return !!(this.form.typeService && this.form.loyerBrut > 0 && this.form.dateReception);
    return false;
  }

  soumettre() {
    if (!this.formValide() || this.saving) return;
    this.saving = true;

    let payload: any;
    if (this.modalType === 'gestion') {
      payload = {
        type: 'Gestion', contratGestionId: this.form.contratId,
        periode: this.form.periode, loyerBrut: this.form.loyerBrut,
        tauxCommission: this.form.tauxCommission / 100,
        montant: this.commissionCalculee(), notes: this.form.notes
      };
    } else if (this.modalType === 'travaux') {
      payload = {
        type: 'Travaux', chantierId: this.form.chantierId,
        budgetChantier: this.form.loyerBrut,
        tauxCommission: this.form.tauxCommission / 100,
        montant: this.commissionCalculee(),
        dateReception: this.form.dateReception, reference: this.form.reference
      };
    } else {
      payload = {
        type: 'Service', typeService: this.form.typeService,
        montant: this.form.loyerBrut, date: this.form.dateReception,
        reference: this.form.reference, notes: this.form.notes,
        proprietaireId: this.form.contratId || null
      };
    }

    this.http.post(`${this.base}/agence/recettes/services`, payload)
      .pipe(catchError(() => of(null)))
      .subscribe(() => {
        this.saving   = false;
        this.modalOpen = false;
        this.charger();
        const labels = { gestion: 'Commission gestion', travaux: 'Commission travaux', services: 'Commission services' };
        this.showToast(`✅ ${labels[this.modalType]} enregistrée`, 'ok');
      });
  }

  // ── Actions table ──────────────────────────────────────────────────────────
  voirLigne(l: LigneTable) {
    this.showToast(`Détail — ${l.libelle} · ${l.montant.toLocaleString('fr-FR')} MRU`, 'ok');
  }

  marquerEncaisse(l: LigneTable) {
    l.statut = 'ok';
    this.showToast(`✅ Recette marquée encaissée`, 'ok');
  }

  // ── Helpers ────────────────────────────────────────────────────────────────
  modalTitle(): string {
    return { gestion: 'Commission gestion', travaux: 'Commission travaux', services: 'Commission services' }[this.modalType];
  }

  pctSource(val: number): number {
    const t = this.data().totalRecettes;
    return t > 0 ? (val / t) * 100 : 0;
  }

  barPct(val: number, max: number): number {
    return max > 0 ? (val / max) * 100 : 0;
  }

  barPctHist(val: number): number {
    const max = Math.max(...this.historiqueData.map(p => p.gestion + p.travaux + p.services), 1);
    return max > 0 ? (val / max) * 100 : 0;
  }

  srcLabel(src: string): string {
    return { gestion: '🏢 Gestion', travaux: '🔧 Travaux', services: '🤝 Services' }[src] ?? src;
  }

  moisLabel(): string {
    const noms = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
    const [y, m] = this.moisSelectionne.split('-');
    return noms[parseInt(m, 10) - 1] + ' ' + y;
  }

  exporter() {
    window.open(`${this.base}/agence/recettes/export?mois=${this.moisSelectionne}`, '_blank');
  }

  showToast(msg: string, type: 'ok' | 'err') {
    this.toastMsg = msg; this.toastType = type; this.toastVisible = true;
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => this.toastVisible = false, 4500);
  }

  private emptyForm() {
    return {
      contratId: '', chantierId: '', typeService: '',
      loyerBrut: 0, tauxCommission: 0, commissionCalculee: 0,
      reference: '', notes: '', dateReception: '', periode: ''
    };
  }

  private buildFallback(): RecettesAgenceDto {
    return {
      mois: this.moisSelectionne,
      totalRecettes: 0, commissionsGestion: 0,
      commissionsTravaux: 0, commissionsServices: 0,
      variationMoisPrecedent: 0,
      nbContratsGestion: 0, tauxCommissionMoyen: 0,
      nbChantiersFactures: 0, tauxCommissionTravaux: 5,
      nbPrestationsServices: 0,
      topGestion: [], topTravaux: [], lignesServices: [],
    };
  }

  private buildMoisDisponibles() {
    const noms = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
    return Array.from({ length: 12 }, (_, i) => {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const val = d.toISOString().slice(0, 7);
      const [y, m] = val.split('-');
      return { value: val, label: noms[parseInt(m, 10) - 1] + ' ' + y };
    });
  }
}

// ── Type interne pour la table ─────────────────────────────────────────────────
interface LigneTable {
  source:  'gestion' | 'travaux' | 'services';
  libelle: string;
  sub?:    string;
  date:    string;
  montant: number;
  ref?:    string;
  statut:  'ok' | 'att';
}