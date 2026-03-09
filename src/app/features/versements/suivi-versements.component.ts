import { Component, inject, OnInit } from '@angular/core';
import { CommonModule, DecimalPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.services';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

// ── DTOs ─────────────────────────────────────────────────────
export interface LigneProduitVersementDto {
  produitCode:      string;
  proprieteLibelle: string;
  montantEncaisse:  number;
  nbCollectes:      number;
}

export interface DeductionVersementDto {
  type:    string;
  libelle: string;
  montant: number;
}

export interface PeriodeVersementDto {
  periodeId:      string;
  moisConcernes:  string[];
  datePrevue:     string;
  dateEffective?: string;
  montantBrut:    number;
  commission:     number;
  retenueTravaux: number;
  montantNet:     number;
  statut:         'Planifie' | 'EnAttente' | 'Effectue' | 'EnRetard' | 'Annule' | 'Derogation';
  statutLabel:    string;
  reference?:     string;
  lignes:         LigneProduitVersementDto[];
  deductions:     DeductionVersementDto[];
}

export interface SuiviVersementProprieteDto {
  proprieteId:      string;
  proprieteLibelle: string;
  proprieteAdresse: string;
  periodicite:      string;
  periodiciteLabel: string;
  tauxCommission:   number;
  totalBrut:        number;
  totalNet:         number;
  nbProduitsLoues:  number;
  periodes:         PeriodeVersementDto[];
}

export interface SuiviVersementProprietaireDto {
  proprietaireId:             string;
  proprietaireNom:            string;
  proprietaireTel:            string;
  proprietes:                 SuiviVersementProprieteDto[];
  totalBrutGlobal:            number;
  totalNetGlobal:             number;
  totalCommissionGlobal:      number;
  totalRetenueTravauxGlobal:  number;
  nbPeriodesEnRetard:         number;
  nbPeriodesTotalPeriodes:    number;
}

export interface SuiviVersementsGlobalDto {
  totalBrutGlobal:         number;
  totalNetGlobal:          number;
  totalCommissionGlobal:   number;
  nbProprietaires:         number;
  nbPeriodesTotalEnRetard: number;
  nbPeriodesTotalAVenir:   number;
  proprietaires:           SuiviVersementProprietaireDto[];
}

// ── Service ───────────────────────────────────────────────────
@Injectable({ providedIn: 'root' })
export class SuiviVersementsService extends ApiService {
  getSuivi(proprietaireId?: string, annee?: string): Observable<SuiviVersementsGlobalDto> {
    let url = '/versements/suivi-proprietaires';
    const params: string[] = [];
    if (proprietaireId) params.push(`proprietaireId=${proprietaireId}`);
    if (annee)          params.push(`annee=${annee}`);
    if (params.length)  url += '?' + params.join('&');
    return this.get<SuiviVersementsGlobalDto>(url);
  }

  marquerEffectue(versementId: string, reference: string): Observable<void> {
    return this.post<void>(`/versements/${versementId}/effectuer`, { reference });
  }

  accorderDerogation(versementId: string, motif: string): Observable<void> {
    return this.post<void>(`/versements/${versementId}/accorder-derogation`, motif);
  }

  envoyerBordereau(versementId: string, canal: 'email' | 'whatsapp' | 'sms'): Observable<void> {
    return this.post<void>(`/versements/${versementId}/envoyer-bordereau`, { canal });
  }
}

// ── Composant ────────────────────────────────────────────────
@Component({
  selector: 'kdi-suivi-versements',
  standalone: true,
  imports: [CommonModule, FormsModule, DecimalPipe, DatePipe],
  template: `
<div class="page-enter">

  <!-- Header -->
  <div class="page-header">
    <div>
      <div class="page-title"><span class="mi">account_balance_wallet</span> Suivi des versements</div>
      <div class="page-subtitle">Versements propriétaires par période · Mensuel / Bimensuel / Trimestriel</div>
    </div>
    <div class="header-actions">
      <select class="select-annee" [(ngModel)]="anneeFiltre" (change)="load()">
        <option *ngFor="let a of annees" [value]="a">{{ a }}</option>
      </select>
      <button class="btn btn-secondary" (click)="load()">
        <span class="mi">refresh</span> Actualiser
      </button>
    </div>
  </div>

  <!-- Loading -->
  <div *ngIf="loading" class="sv-loading">
    <div class="sv-spinner"></div> Chargement…
  </div>

  <ng-container *ngIf="!loading && data">

    <!-- ══ KPIs globaux ══ -->
    <div class="kpi-global">
      <div class="kg-card">
        <div class="kg-icon">💰</div>
        <div class="kg-body">
          <div class="kg-label">Brut total</div>
          <div class="kg-val">{{ data.totalBrutGlobal | number:'1.0-0' }} <span class="kg-unit">MRU</span></div>
        </div>
      </div>
      <div class="kg-card kg-net">
        <div class="kg-icon">✅</div>
        <div class="kg-body">
          <div class="kg-label">Net à verser</div>
          <div class="kg-val">{{ data.totalNetGlobal | number:'1.0-0' }} <span class="kg-unit">MRU</span></div>
        </div>
      </div>
      <div class="kg-card kg-commission">
        <div class="kg-icon">🏦</div>
        <div class="kg-body">
          <div class="kg-label">Commissions</div>
          <div class="kg-val">{{ data.totalCommissionGlobal | number:'1.0-0' }} <span class="kg-unit">MRU</span></div>
        </div>
      </div>
      <div class="kg-card kg-stat">
        <div class="kg-stat-row">
          <div class="kg-pill kg-pill-red">⚠ En retard <strong>{{ data.nbPeriodesTotalEnRetard }}</strong></div>
          <div class="kg-pill kg-pill-blue">⏳ À venir <strong>{{ data.nbPeriodesTotalAVenir }}</strong></div>
        </div>
        <div class="kg-stat-row" style="margin-top:6px">
          <div class="kg-pill kg-pill-gray">👤 Propriétaires <strong>{{ data.nbProprietaires }}</strong></div>
        </div>
      </div>
    </div>

    <!-- ══ Layout liste + panneau ══ -->
    <div class="layout" [class.panel-open]="selectedPeriode !== null">

      <!-- ══ Liste propriétaires ══ -->
      <div class="list-pane">

        <!-- Filtres -->
        <div class="filter-bar">
          <button class="filter-chip" [class.active]="filtre===''"          (click)="filtre=''">Tous</button>
          <button class="filter-chip" [class.active]="filtre==='EnRetard'"  (click)="filtre='EnRetard'">⚠ En retard</button>
          <button class="filter-chip" [class.active]="filtre==='EnAttente'" (click)="filtre='EnAttente'">⏳ En attente</button>
          <button class="filter-chip" [class.active]="filtre==='Effectue'"  (click)="filtre='Effectue'">✓ Effectués</button>
          <button class="filter-chip" [class.active]="filtre==='Planifie'"  (click)="filtre='Planifie'">· Planifiés</button>
        </div>

        <!-- Accordéon propriétaires -->
        <div class="proprietaire-card" *ngFor="let p of proprietairesFiltres()">

          <!-- Header propriétaire -->
          <div class="prop-header" (click)="toggleProprietaire(p.proprietaireId)">
            <div class="prop-avatar">{{ p.proprietaireNom[0] }}</div>
            <div class="prop-info">
              <div class="prop-nom">{{ p.proprietaireNom }}</div>
              <div class="prop-tel">{{ p.proprietaireTel }}</div>
            </div>
            <div class="prop-kpis">
              <div class="pk-item">
                <span class="pk-label">Brut</span>
                <span class="pk-val">{{ p.totalBrutGlobal | number:'1.0-0' }}</span>
              </div>
              <div class="pk-item pk-net">
                <span class="pk-label">Net</span>
                <span class="pk-val">{{ p.totalNetGlobal | number:'1.0-0' }}</span>
              </div>
              <div class="pk-item pk-retard" *ngIf="p.nbPeriodesEnRetard > 0">
                <span class="pk-label">Retard</span>
                <span class="pk-val pk-danger">{{ p.nbPeriodesEnRetard }}</span>
              </div>
            </div>
            <span class="prop-chevron" [class.open]="isOpen(p.proprietaireId)">▶</span>
          </div>

          <!-- Propriétés de ce propriétaire -->
          <div class="prop-body" *ngIf="isOpen(p.proprietaireId)">
            <div class="propriete-block" *ngFor="let pr of p.proprietes">

              <div class="pr-header">
                <div>
                  <div class="pr-libelle">{{ pr.proprieteLibelle }}</div>
                  <div class="pr-meta">
                    <span class="periodicite-badge" [ngClass]="'pb-' + pr.periodicite.toLowerCase()">
                      {{ pr.periodiciteLabel }}
                    </span>
                    <span class="pr-taux">Commission {{ pr.tauxCommission * 100 }}%</span>
                    <span class="pr-produits">{{ pr.nbProduitsLoues }} produit(s) loué(s)</span>
                  </div>
                </div>
                <div class="pr-totaux">
                  <span class="pr-brut">Brut : {{ pr.totalBrut | number:'1.0-0' }} MRU</span>
                  <span class="pr-net">Net : {{ pr.totalNet | number:'1.0-0' }} MRU</span>
                </div>
              </div>

              <!-- Tableau des périodes -->
              <table class="data-table periods-table">
                <thead><tr>
                  <th>Période</th>
                  <th>Date prévue</th>
                  <th class="text-right">Brut</th>
                  <th class="text-right">Commission</th>
                  <th class="text-right">Travaux</th>
                  <th class="text-right">Net</th>
                  <th class="text-center">Statut</th>
                  <th class="text-center">Actions</th>
                </tr></thead>
                <tbody>
                  <tr *ngFor="let periode of pr.periodes"
                      [class.row-selected]="selectedPeriode?.periodeId === periode.periodeId"
                      [class.row-retard]="periode.statut === 'EnRetard'"
                      (click)="selectPeriode(periode, p, pr)">
                    <td>
                      <div class="periode-label">{{ periode.periodeId }}</div>
                      <div class="periode-mois">{{ periode.moisConcernes.length }} mois</div>
                    </td>
                    <td>
                      <div [class.date-retard]="periode.statut === 'EnRetard'">
                        {{ periode.datePrevue | date:'dd/MM/yyyy' }}
                      </div>
                      <div class="date-effective" *ngIf="periode.dateEffective">
                        ✓ {{ periode.dateEffective | date:'dd/MM/yyyy' }}
                      </div>
                    </td>
                    <td class="text-right">{{ periode.montantBrut | number:'1.0-0' }}</td>
                    <td class="text-right text-commission">-{{ periode.commission | number:'1.0-0' }}</td>
                    <td class="text-right text-travaux">-{{ periode.retenueTravaux | number:'1.0-0' }}</td>
                    <td class="text-right text-net font-bold">{{ periode.montantNet | number:'1.0-0' }}</td>
                    <td class="text-center">
                      <span class="badge"
                        [class.badge-green]="periode.statut==='Effectue'"
                        [class.badge-red]="periode.statut==='EnRetard'"
                        [class.badge-gold]="periode.statut==='EnAttente'"
                        [class.badge-gray]="periode.statut==='Planifie'"
                        [class.badge-blue]="periode.statut==='Derogation'">
                        {{ periode.statutLabel }}
                      </span>
                    </td>
                    <td class="text-center" (click)="$event.stopPropagation()">
                      <div class="action-btns">
                        <button class="btn-icon" title="Détail" (click)="selectPeriode(periode, p, pr)">👁</button>
                        <button class="btn-icon" title="Envoyer bordereau"
                                *ngIf="periode.statut !== 'Planifie'"
                                (click)="openEnvoi(periode, p)">📤</button>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>

            </div>
          </div>

        </div>

        <!-- Empty -->
        <div class="empty-state" *ngIf="!proprietairesFiltres().length">
          <span class="mi">account_balance_wallet</span>
          <div class="empty-title">Aucun versement dans cette catégorie</div>
        </div>

      </div>

      <!-- ══ Panneau détail période ══ -->
      <div class="recap-pane" *ngIf="selectedPeriode && selectedProprietaire && selectedPropriete">

        <div class="rp-header">
          <div class="rp-title-block">
            <div class="rp-avatar">{{ selectedProprietaire.proprietaireNom[0] }}</div>
            <div>
              <div class="rp-nom">{{ selectedProprietaire.proprietaireNom }}</div>
              <div class="rp-code">{{ selectedPropriete.proprieteLibelle }}</div>
            </div>
          </div>
          <button class="rp-close" (click)="selectedPeriode = null">✕</button>
        </div>

        <!-- Période info -->
        <div class="periode-info">
          <div class="pi-periode">Période : <strong>{{ selectedPeriode.periodeId }}</strong></div>
          <div class="pi-date">Date prévue : <strong>{{ selectedPeriode.datePrevue | date:'dd/MM/yyyy' }}</strong></div>
          <div class="pi-statut">
            <span class="badge"
              [class.badge-green]="selectedPeriode.statut==='Effectue'"
              [class.badge-red]="selectedPeriode.statut==='EnRetard'"
              [class.badge-gold]="selectedPeriode.statut==='EnAttente'"
              [class.badge-gray]="selectedPeriode.statut==='Planifie'"
              [class.badge-blue]="selectedPeriode.statut==='Derogation'">
              {{ selectedPeriode.statutLabel }}
            </span>
          </div>
        </div>

        <!-- Résumé financier -->
        <div class="fin-summary">
          <div class="fs-row">
            <span class="fs-label">Loyers encaissés (brut)</span>
            <span class="fs-val">{{ selectedPeriode.montantBrut | number:'1.0-0' }} MRU</span>
          </div>
          <div class="fs-row fs-deduction" *ngFor="let d of selectedPeriode.deductions">
            <span class="fs-label">− {{ d.libelle }}</span>
            <span class="fs-val fs-neg">-{{ d.montant | number:'1.0-0' }} MRU</span>
          </div>
          <div class="fs-row fs-total">
            <span class="fs-label">Net à verser</span>
            <span class="fs-val fs-net">{{ selectedPeriode.montantNet | number:'1.0-0' }} MRU</span>
          </div>
        </div>

        <!-- Détail par produit -->
        <div class="lignes-section">
          <div class="ls-title">Détail par produit locatif</div>
          <div class="ls-row" *ngFor="let l of selectedPeriode.lignes">
            <div class="ls-code">{{ l.produitCode }}</div>
            <div class="ls-nb">{{ l.nbCollectes }} collecte(s)</div>
            <div class="ls-montant">{{ l.montantEncaisse | number:'1.0-0' }} MRU</div>
          </div>
          <div class="ls-empty" *ngIf="!selectedPeriode.lignes.length">
            Aucune collecte enregistrée pour cette période
          </div>
        </div>

        <!-- Actions -->
        <div class="rp-actions">

          <!-- Marquer effectué -->
          <div class="action-group" *ngIf="selectedPeriode.statut === 'EnAttente' || selectedPeriode.statut === 'EnRetard'">
            <input class="input-ref" [(ngModel)]="refPaiement" placeholder="Référence paiement…">
            <button class="btn btn-gold btn-full" (click)="marquerEffectue()">
              ✓ Marquer comme versé
            </button>
          </div>

          <!-- Dérogation -->
          <div class="action-group" *ngIf="selectedPeriode.statut === 'EnRetard'">
            <input class="input-ref" [(ngModel)]="motifDerogation" placeholder="Motif dérogation…">
            <button class="btn btn-secondary btn-full" (click)="accorderDerogation()">
              ⏳ Accorder une dérogation
            </button>
          </div>

          <!-- Envoi bordereau -->
          <div class="action-group envoi-group" *ngIf="selectedPeriode.statut !== 'Planifie'">
            <div class="ls-title" style="margin-bottom:6px">Envoyer le bordereau</div>
            <div class="envoi-btns">
              <button class="btn btn-envoi btn-email"    (click)="envoyer('email')">📧 Email</button>
              <button class="btn btn-envoi btn-whatsapp" (click)="envoyer('whatsapp')">💬 WhatsApp</button>
              <button class="btn btn-envoi btn-sms"      (click)="envoyer('sms')">📱 SMS</button>
            </div>
          </div>

          <!-- Export -->
          <div class="export-btns">
            <button class="btn btn-export" (click)="exportPdf()">📄 Export PDF</button>
            <button class="btn btn-export" (click)="exportExcel()">📊 Export Excel</button>
          </div>

        </div>

      </div>
    </div>

  </ng-container>

  <!-- Modal envoi rapide -->
  <div class="modal-overlay" *ngIf="showEnvoiModal" (click)="showEnvoiModal=false">
    <div class="modal" (click)="$event.stopPropagation()">
      <div class="modal-header">
        <div class="modal-title">📤 Envoyer le bordereau</div>
        <button class="rp-close" (click)="showEnvoiModal=false">✕</button>
      </div>
      <div class="modal-body" *ngIf="modalPeriode && modalProprietaire">
        <div class="modal-info">
          <strong>{{ modalProprietaire.proprietaireNom }}</strong> —
          Période {{ modalPeriode.periodeId }} —
          Net {{ modalPeriode.montantNet | number:'1.0-0' }} MRU
        </div>
        <div class="envoi-btns" style="margin-top:14px">
          <button class="btn btn-envoi btn-email"    (click)="envoyerModal('email')">📧 Email</button>
          <button class="btn btn-envoi btn-whatsapp" (click)="envoyerModal('whatsapp')">💬 WhatsApp</button>
          <button class="btn btn-envoi btn-sms"      (click)="envoyerModal('sms')">📱 SMS</button>
        </div>
      </div>
    </div>
  </div>

</div>
  `,
  styles: [`
    /* ── KPIs ── */
    .kpi-global { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin-bottom: 22px; }
    .kg-card { background: #fff; border-radius: 12px; padding: 16px; display: flex; align-items: center; gap: 12px; box-shadow: 0 2px 10px rgba(14,28,56,.07); border: 1px solid #e8edf5; border-top: 3px solid #e2e8f0; }
    .kg-net        { border-top-color: #16a34a; }
    .kg-commission { border-top-color: #c9a84c; }
    .kg-icon  { font-size: 24px; flex-shrink: 0; }
    .kg-label { font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: .5px; margin-bottom: 4px; }
    .kg-val   { font-size: 20px; font-weight: 800; color: #0e1c38; }
    .kg-unit  { font-size: 11px; font-weight: 400; color: #94a3b8; }
    .kg-stat  { flex-direction: column; align-items: flex-start; gap: 0; }
    .kg-stat-row { display: flex; gap: 6px; }
    .kg-pill { font-size: 11px; padding: 3px 10px; border-radius: 20px; display: flex; gap: 5px; align-items: center; }
    .kg-pill strong { font-weight: 800; }
    .kg-pill-red  { background: #fee2e2; color: #991b1b; }
    .kg-pill-blue { background: #dbeafe; color: #1e40af; }
    .kg-pill-gray { background: #f1f5f9; color: #64748b; }

    /* ── Header actions ── */
    .header-actions { display: flex; align-items: center; gap: 10px; }
    .select-annee { padding: 7px 12px; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 13px; background: #fff; color: #0e1c38; cursor: pointer; }

    /* ── Layout ── */
    .layout { display: grid; grid-template-columns: 1fr; gap: 20px; }
    .layout.panel-open { grid-template-columns: 1fr 380px; align-items: start; }

    /* ── Filtres ── */
    .filter-bar { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 14px; }

    /* ── Accordéon propriétaire ── */
    .proprietaire-card { background: #fff; border-radius: 12px; margin-bottom: 12px; border: 1px solid #e8edf5; box-shadow: 0 2px 8px rgba(14,28,56,.05); overflow: hidden; }
    .prop-header { display: flex; align-items: center; gap: 12px; padding: 14px 16px; cursor: pointer; transition: background .15s; }
    .prop-header:hover { background: #f8fafc; }
    .prop-avatar { width: 38px; height: 38px; background: linear-gradient(135deg,#c9a84c,#7a4f0d); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 15px; color: #fff; flex-shrink: 0; }
    .prop-info { flex: 1; }
    .prop-nom { font-size: 14px; font-weight: 700; color: #0e1c38; }
    .prop-tel { font-size: 11px; color: #64748b; margin-top: 1px; }
    .prop-kpis { display: flex; gap: 14px; }
    .pk-item { text-align: right; }
    .pk-label { display: block; font-size: 9px; color: #94a3b8; text-transform: uppercase; letter-spacing: .5px; }
    .pk-val { font-size: 13px; font-weight: 700; color: #0e1c38; }
    .pk-net .pk-val { color: #16a34a; }
    .pk-danger { color: #dc2626 !important; }
    .prop-chevron { font-size: 10px; color: #94a3b8; transition: transform .2s; }
    .prop-chevron.open { transform: rotate(90deg); }

    /* ── Propriété block ── */
    .prop-body { border-top: 1px solid #f1f5f9; }
    .propriete-block { padding: 12px 16px 0; border-bottom: 1px solid #f1f5f9; }
    .propriete-block:last-child { border-bottom: none; }
    .pr-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px; }
    .pr-libelle { font-size: 13px; font-weight: 600; color: #0e1c38; }
    .pr-meta { display: flex; align-items: center; gap: 8px; margin-top: 3px; flex-wrap: wrap; }
    .periodicite-badge { font-size: 10px; padding: 2px 8px; border-radius: 10px; font-weight: 600; }
    .pb-mensuel     { background: #d1fae5; color: #065f46; }
    .pb-bimensuel   { background: #dbeafe; color: #1e40af; }
    .pb-trimestriel { background: #fef3c7; color: #92400e; }
    .pr-taux    { font-size: 11px; color: #64748b; }
    .pr-produits { font-size: 11px; color: #94a3b8; }
    .pr-totaux { text-align: right; }
    .pr-brut { display: block; font-size: 11px; color: #64748b; }
    .pr-net  { display: block; font-size: 12px; font-weight: 700; color: #16a34a; }

    /* ── Table périodes ── */
    .periods-table { margin-bottom: 12px; }
    .periode-label { font-family: monospace; font-size: 12px; font-weight: 600; color: #0e1c38; }
    .periode-mois  { font-size: 10px; color: #94a3b8; }
    .date-retard   { color: #dc2626; font-weight: 600; }
    .date-effective { font-size: 10px; color: #16a34a; margin-top: 2px; }
    .text-commission { color: #c9a84c; }
    .text-travaux    { color: #f97316; }
    .text-net        { color: #16a34a; }
    .font-bold       { font-weight: 700; }
    .row-retard td   { background: #fff5f5 !important; }
    .action-btns { display: flex; gap: 4px; justify-content: center; }
    .btn-icon { background: none; border: none; cursor: pointer; font-size: 14px; padding: 2px 4px; border-radius: 4px; transition: background .15s; }
    .btn-icon:hover { background: #f1f5f9; }

    /* ── Badges ── */
    .badge-gold { background: #fef3c7; color: #92400e; }

    /* ── Recap pane ── */
    .recap-pane { background: #fff; border-radius: 14px; overflow: hidden; box-shadow: 0 4px 24px rgba(14,28,56,.12); position: sticky; top: 20px; max-height: calc(100vh - 60px); overflow-y: auto; }
    .recap-pane::-webkit-scrollbar { width: 3px; }
    .recap-pane::-webkit-scrollbar-thumb { background: #e2e8f0; }
    .rp-header { display: flex; align-items: center; justify-content: space-between; padding: 14px 16px; background: #0e1c38; }
    .rp-title-block { display: flex; align-items: center; gap: 10px; }
    .rp-avatar { width: 36px; height: 36px; background: #c9a96e; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 15px; color: #0e1c38; flex-shrink: 0; }
    .rp-nom  { font-size: 13px; font-weight: 700; color: #fff; }
    .rp-code { font-size: 11px; color: rgba(255,255,255,.5); font-family: monospace; margin-top: 2px; }
    .rp-close { background: rgba(255,255,255,.12); border: none; color: #fff; width: 26px; height: 26px; border-radius: 6px; cursor: pointer; font-size: 13px; display: flex; align-items: center; justify-content: center; }
    .rp-close:hover { background: rgba(255,255,255,.2); }

    /* ── Période info ── */
    .periode-info { padding: 12px 16px; border-bottom: 1px solid #f1f5f9; display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
    .pi-periode { font-size: 12px; color: #0e1c38; }
    .pi-date    { font-size: 12px; color: #64748b; }

    /* ── Résumé financier ── */
    .fin-summary { padding: 10px 16px; border-bottom: 1px solid #f1f5f9; }
    .fs-row { display: flex; justify-content: space-between; align-items: center; padding: 5px 0; font-size: 12px; }
    .fs-deduction { color: #64748b; }
    .fs-total { border-top: 1px solid #e2e8f0; margin-top: 4px; padding-top: 8px; font-weight: 700; }
    .fs-val   { font-weight: 600; }
    .fs-neg   { color: #dc2626; }
    .fs-net   { color: #16a34a; font-size: 14px; }

    /* ── Lignes produits ── */
    .lignes-section { padding: 10px 16px; border-bottom: 1px solid #f1f5f9; }
    .ls-title { font-size: 10px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: .5px; margin-bottom: 6px; }
    .ls-row { display: flex; align-items: center; gap: 8px; padding: 5px 0; border-bottom: 1px dashed #f1f5f9; font-size: 12px; }
    .ls-code { font-family: monospace; font-weight: 700; color: #0e1c38; background: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-size: 11px; }
    .ls-nb   { color: #94a3b8; flex: 1; }
    .ls-montant { font-weight: 700; color: #0e1c38; }
    .ls-empty { font-size: 11px; color: #94a3b8; text-align: center; padding: 8px 0; }

    /* ── Actions ── */
    .rp-actions { padding: 12px 16px; display: flex; flex-direction: column; gap: 8px; }
    .action-group { display: flex; flex-direction: column; gap: 6px; }
    .input-ref { padding: 7px 10px; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 12px; width: 100%; }
    .btn-full  { width: 100%; justify-content: center; display: flex; }
    .envoi-group { border-top: 1px solid #f1f5f9; padding-top: 8px; }
    .envoi-btns { display: flex; gap: 6px; }
    .btn-envoi { flex: 1; padding: 8px; border-radius: 8px; border: none; cursor: pointer; font-size: 12px; font-weight: 600; transition: opacity .15s; }
    .btn-envoi:hover { opacity: .85; }
    .btn-email    { background: #dbeafe; color: #1e40af; }
    .btn-whatsapp { background: #d1fae5; color: #065f46; }
    .btn-sms      { background: #fef3c7; color: #92400e; }
    .export-btns { display: flex; gap: 6px; border-top: 1px solid #f1f5f9; padding-top: 8px; }
    .btn-export { flex: 1; padding: 8px; border-radius: 8px; border: 1px solid #e2e8f0; background: #f8fafc; cursor: pointer; font-size: 11px; font-weight: 600; color: #475569; transition: background .15s; }
    .btn-export:hover { background: #f1f5f9; }

    /* ── Modal ── */
    .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.4); z-index: 1000; display: flex; align-items: center; justify-content: center; }
    .modal { background: #fff; border-radius: 14px; width: 380px; overflow: hidden; box-shadow: 0 20px 60px rgba(0,0,0,.2); }
    .modal-header { display: flex; justify-content: space-between; align-items: center; padding: 14px 16px; background: #0e1c38; }
    .modal-title  { font-size: 14px; font-weight: 700; color: #fff; }
    .modal-body   { padding: 16px; }
    .modal-info   { font-size: 13px; color: #0e1c38; background: #f8fafc; padding: 10px; border-radius: 8px; }

    /* ── Loading ── */
    .sv-loading { display: flex; align-items: center; gap: 10px; padding: 60px; justify-content: center; color: #64748b; }
    .sv-spinner { width: 20px; height: 20px; border: 2px solid #e2e8f0; border-top-color: #0e1c38; border-radius: 50%; animation: spin .7s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }

    /* ── Table selected ── */
    .data-table tr.row-selected td { background: #eff6ff !important; }
    .data-table tr { cursor: pointer; }
  `]
})
export class SuiviVersementsComponent implements OnInit {
  private svc = inject(SuiviVersementsService);

  loading    = true;
  data:       SuiviVersementsGlobalDto | null = null;
  filtre      = '';
  anneeFiltre = new Date().getFullYear().toString();
  annees      = Array.from({ length: 4 }, (_, i) => (new Date().getFullYear() - i).toString());

  selectedPeriode:       PeriodeVersementDto | null = null;
  selectedProprietaire:  SuiviVersementProprietaireDto | null = null;
  selectedPropriete:     SuiviVersementProprieteDto | null = null;

  showEnvoiModal = false;
  modalPeriode:      PeriodeVersementDto | null = null;
  modalProprietaire: SuiviVersementProprietaireDto | null = null;

  refPaiement    = '';
  motifDerogation = '';

  private openProprietaires = new Set<string>();

  ngOnInit() { this.load(); }

  load() {
    this.loading = true;
    this.svc.getSuivi(undefined, this.anneeFiltre).subscribe({
      next:  d => { this.data = d; this.loading = false; this.openAll(); },
      error: () => { this.data = this.buildFallback(); this.loading = false; }
    });
  }

  private openAll() {
    this.data?.proprietaires.forEach(p => this.openProprietaires.add(p.proprietaireId));
  }

  isOpen(id: string)        { return this.openProprietaires.has(id); }
  toggleProprietaire(id: string) {
    if (this.openProprietaires.has(id)) this.openProprietaires.delete(id);
    else this.openProprietaires.add(id);
  }

  proprietairesFiltres(): SuiviVersementProprietaireDto[] {
    if (!this.data) return [];
    if (!this.filtre) return this.data.proprietaires;
    return this.data.proprietaires.filter(p =>
      p.proprietes.some(pr => pr.periodes.some(pe => pe.statut === this.filtre))
    );
  }

  selectPeriode(
    periode: PeriodeVersementDto,
    proprietaire: SuiviVersementProprietaireDto,
    propriete: SuiviVersementProprieteDto
  ) {
    if (this.selectedPeriode?.periodeId === periode.periodeId) {
      this.selectedPeriode = null;
      return;
    }
    this.selectedPeriode      = periode;
    this.selectedProprietaire = proprietaire;
    this.selectedPropriete    = propriete;
    this.refPaiement    = '';
    this.motifDerogation = '';
  }

  openEnvoi(periode: PeriodeVersementDto, proprietaire: SuiviVersementProprietaireDto) {
    this.modalPeriode      = periode;
    this.modalProprietaire = proprietaire;
    this.showEnvoiModal    = true;
  }

  marquerEffectue() {
    if (!this.selectedPeriode || !this.refPaiement) return;
    // TODO: récupérer versementId depuis backend — pour l'instant placeholder
    alert(`Versement marqué effectué — Réf: ${this.refPaiement}`);
  }

  accorderDerogation() {
    if (!this.selectedPeriode || !this.motifDerogation) return;
    alert(`Dérogation accordée — Motif: ${this.motifDerogation}`);
  }

  envoyer(canal: 'email' | 'whatsapp' | 'sms') {
    if (!this.selectedPeriode) return;
    alert(`Bordereau envoyé par ${canal}`);
  }

  envoyerModal(canal: 'email' | 'whatsapp' | 'sms') {
    this.showEnvoiModal = false;
    alert(`Bordereau envoyé par ${canal}`);
  }

  exportPdf()   { alert('Export PDF — à brancher sur le backend'); }
  exportExcel() { alert('Export Excel — à brancher sur le backend'); }

  private buildFallback(): SuiviVersementsGlobalDto {
    return {
      totalBrutGlobal: 0, totalNetGlobal: 0, totalCommissionGlobal: 0,
      nbProprietaires: 0, nbPeriodesTotalEnRetard: 0, nbPeriodesTotalAVenir: 0,
      proprietaires: []
    };
  }
}