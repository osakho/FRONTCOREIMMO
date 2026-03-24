// ═══════════════════════════════════════════════════════════════════════
// CORRECTIONS FRONTEND — 3 fixes conservés :
// 1. Colonne Reporté masquée si aucune valeur > 0
// 2. lignesParStatut robuste (trim + insensible à la casse)
// 3. Affichage tauxCommission * 100 déjà appliqué
// ═══════════════════════════════════════════════════════════════════════

import { Component, inject, OnInit } from '@angular/core';
import { CommonModule, DecimalPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.services';
import { NotificationModalComponent, NotificationModalConfig } from '../../shared/components/notification-modal.component';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import {
  LigneProduitVersementDto,
  PeriodeVersementDto,
  SuiviVersementProprietaireDto,
  SuiviVersementProprieteDto,
  SuiviVersementsGlobalDto
} from '../../core/models/models';

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

  preparer(contratGestionId: string, periode: string, datePrevue: string): Observable<string> {
    return this.post<string>('/versements/preparer', { contratGestionId, periode, datePrevue });
  }

  marquerEffectue(versementId: string, reference: string): Observable<void> {
    const fd = new FormData();
    fd.append('Reference',        reference);
    fd.append('DateEffective',    new Date().toISOString().split('T')[0]);
    fd.append('Mode',             'VirementBancaire');
    fd.append('NotifierEmail',    'false');
    fd.append('NotifierWhatsApp', 'false');
    fd.append('NotifierSms',      'false');
    return this.http.post<void>(`${this.base}/versements/${versementId}/effectuer`, fd);
  }

  accorderDerogation(versementId: string, motif: string): Observable<void> {
    return this.http.post<void>(
      `${this.base}/versements/${versementId}/accorder-derogation`,
      JSON.stringify(motif),
      { headers: { 'Content-Type': 'application/json' } }
    );
  }

  envoyerBordereau(versementId: string, canal: 'email' | 'whatsapp' | 'sms'): Observable<void> {
    return this.post<void>(`/versements/${versementId}/envoyer-bordereau`, { canal });
  }
}

// ── Composant ────────────────────────────────────────────────
@Component({
  selector: 'kdi-suivi-versements',
  standalone: true,
  imports: [CommonModule, FormsModule, DecimalPipe, DatePipe, NotificationModalComponent],
  template: `
<div class="page-enter sv-root">

  <!-- ══ Header ══ -->
  <div class="page-header">
    <div>
      <div class="page-title">
        <span class="mi">account_balance_wallet</span>
        Suivi des versements
      </div>
      <div class="page-subtitle">Versements propriétaires par période · Mensuel / Bi-mensuel / Trimestriel</div>
    </div>
    <div class="header-actions">
      <select class="form-control sv-select-year" [(ngModel)]="anneeFiltre" (change)="load()">
        <option *ngFor="let a of annees" [value]="a">{{ a }}</option>
      </select>
      <button class="btn btn-secondary" (click)="load()">
        <span class="mi mi-sm">refresh</span> Actualiser
      </button>
    </div>
  </div>

  <!-- ══ Loading ══ -->
  <div *ngIf="loading" class="sv-loading">
    <div class="sv-spinner"></div>
    <span>Chargement…</span>
  </div>

  <ng-container *ngIf="!loading && data">

    <!-- ══ KPIs ══ -->
    <div class="kpi-grid sv-kpi-grid">

      <div class="kpi-card kpi-navy">
        <div class="kpi-icon"><span class="mi">payments</span></div>
        <div class="kpi-value">{{ data.totalBrutGlobal | number:'1.0-0' }}</div>
        <div class="kpi-label">Brut total <span class="kpi-unit">MRU</span></div>
      </div>

      <div class="kpi-card kpi-green">
        <div class="kpi-icon"><span class="mi">check_circle</span></div>
        <div class="kpi-value">{{ data.totalNetGlobal | number:'1.0-0' }}</div>
        <div class="kpi-label">Net à verser <span class="kpi-unit">MRU</span></div>
      </div>

      <div class="kpi-card kpi-gold">
        <div class="kpi-icon"><span class="mi">account_balance</span></div>
        <div class="kpi-value">{{ data.totalCommissionGlobal | number:'1.0-0' }}</div>
        <div class="kpi-label">Commissions <span class="kpi-unit">MRU</span></div>
      </div>

      <div class="kpi-card kpi-red sv-kpi-stat">
        <div class="kpi-pills">
          <div class="kpi-pill kpi-pill-red">
            <span class="mi mi-xs">warning</span>
            En retard&nbsp;<strong>{{ data.nbPeriodesTotalEnRetard }}</strong>
          </div>
          <div class="kpi-pill kpi-pill-blue">
            <span class="mi mi-xs">schedule</span>
            À venir&nbsp;<strong>{{ data.nbPeriodesTotalAVenir }}</strong>
          </div>
          <div class="kpi-pill kpi-pill-gray">
            <span class="mi mi-xs">person</span>
            Propriétaires&nbsp;<strong>{{ data.nbProprietaires }}</strong>
          </div>
        </div>
      </div>

    </div>

    <!-- ══ Layout liste + panneau ══ -->
    <div class="sv-layout" [class.sv-panel-open]="selectedPeriode !== null">

      <!-- ══ Liste propriétaires ══ -->
      <div class="sv-list">

        <!-- Filtres -->
        <div class="filter-bar">
          <button class="filter-chip" [class.active]="filtre===''"          (click)="filtre=''">Tous</button>
          <button class="filter-chip" [class.active]="filtre==='EnRetard'"  (click)="filtre='EnRetard'">
            <span class="mi mi-xs">warning</span> En retard
          </button>
          <button class="filter-chip" [class.active]="filtre==='EnAttente'" (click)="filtre='EnAttente'">
            <span class="mi mi-xs">schedule</span> En attente
          </button>
          <button class="filter-chip" [class.active]="filtre==='Effectue'"  (click)="filtre='Effectue'">
            <span class="mi mi-xs">check</span> Effectués
          </button>
          <button class="filter-chip" [class.active]="filtre==='Planifie'"  (click)="filtre='Planifie'">
            <span class="mi mi-xs">radio_button_unchecked</span> Planifiés
          </button>
        </div>

        <!-- Accordéon propriétaires -->
        <div class="sv-prop-card card" *ngFor="let p of proprietairesFiltres()">

          <!-- Header propriétaire -->
          <div class="sv-prop-header" (click)="toggleProprietaire(p.proprietaireId)">
            <div class="sv-prop-avatar avatar" [style.background]="avatarColor(p.proprietaireNom)">
              {{ p.proprietaireNom[0] }}
            </div>
            <div class="sv-prop-info">
              <div class="sv-prop-nom">{{ p.proprietaireNom }}</div>
              <div class="sv-prop-tel text-muted">{{ p.proprietaireTel }}</div>
            </div>
            <div class="sv-prop-kpis">
              <div class="sv-pk">
                <span class="sv-pk-label">Brut</span>
                <span class="sv-pk-val">{{ p.totalBrutGlobal | number:'1.0-0' }}</span>
              </div>
              <div class="sv-pk sv-pk-net">
                <span class="sv-pk-label">Net</span>
                <span class="sv-pk-val">{{ p.totalNetGlobal | number:'1.0-0' }}</span>
              </div>
              <div class="sv-pk" *ngIf="p.nbPeriodesEnRetard > 0">
                <span class="sv-pk-label">Retard</span>
                <span class="sv-pk-val sv-pk-danger">{{ p.nbPeriodesEnRetard }}</span>
              </div>
            </div>
            <!-- Notification rapide -->
            <button class="action-btn sv-notif-btn" title="Envoyer notification"
                    (click)="$event.stopPropagation(); openNotifProprietaire(p)">
              <span class="mi mi-sm">notifications</span>
            </button>
            <span class="sv-chevron" [class.sv-chevron-open]="isOpen(p.proprietaireId)">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px;display:block"><polyline points="9 18 15 12 9 6"/></svg>
            </span>
          </div>

          <!-- Propriétés -->
          <div class="sv-prop-body" *ngIf="isOpen(p.proprietaireId)">
            <div class="sv-pr-block" *ngFor="let pr of proprietesFiltrees(p)">

              <div class="sv-pr-header">
                <div>
                  <div class="sv-pr-libelle">{{ pr.proprieteLibelle }}</div>
                  <div class="sv-pr-meta">
                    <span class="badge sv-period-badge" [ngClass]="'sv-pb-' + pr.periodicite.toLowerCase()">
                      {{ pr.periodiciteLabel }}
                    </span>
                    <span class="text-muted">Commission {{ pr.tauxCommission * 100 | number:'1.0-2' }}%</span>
                    <span class="text-muted">{{ pr.nbProduitsLoues }} loué(s)</span>
                    <span class="sv-vacants" *ngIf="pr.nbProduitsVacants > 0">
                      · {{ pr.nbProduitsVacants }} vacant(s)
                    </span>
                  </div>
                </div>
                <div class="sv-pr-totaux">
                  <span class="sv-pr-brut">Brut : {{ pr.totalBrut | number:'1.0-0' }} MRU</span>
                  <span class="sv-pr-net">Net : {{ pr.totalNet | number:'1.0-0' }} MRU</span>
                </div>
              </div>

              <!-- Tableau des périodes -->
              <div class="sv-table-wrap">
                <table class="data-table sv-periods-table">
                  <thead><tr>
                    <th>Période</th>
                    <th>Date prévue</th>
                    <th class="text-right">Brut</th>
                    <!-- FIX 1 : colonne Reporté masquée si aucune valeur -->
                    <th class="text-right" *ngIf="aDesReports(pr)">Reporté</th>
                    <th class="text-right">Commission</th>
                    <th class="text-right">Travaux</th>
                    <th class="text-right">Net</th>
                    <th class="text-center">Statut</th>
                    <th class="text-center">Actions</th>
                  </tr></thead>
                  <tbody>
                    <tr *ngFor="let periode of periodesFiltrees(pr)"
                        [class.sv-row-selected]="selectedPeriode?.periodeId === periode.periodeId && selectedPropriete?.proprieteId === pr.proprieteId"
                        [class.sv-row-retard]="periode.statut === 'EnRetard'"
                        (click)="selectPeriode(periode, p, pr)">

                      <td>
                        <div class="sv-periode-id">{{ periode.periodeId }}</div>
                        <div class="sv-periode-mois text-muted">{{ periode.moisConcernes.length }} mois</div>
                        <div class="sv-periode-warning" *ngIf="periodeInvalide(periode, pr)">
                          <span class="mi mi-xs">warning</span>
                          Période non conforme CDC
                          <span class="sv-periode-expected" *ngIf="periodeAttendue(periode, pr)">
                            → attendu : {{ periodeAttendue(periode, pr) }}
                          </span>
                        </div>
                      </td>

                      <td>
                        <div [class.sv-date-retard]="periode.statut === 'EnRetard'">
                          {{ periode.datePrevue | date:'dd/MM/yyyy' }}
                        </div>
                        <div class="sv-date-eff" *ngIf="periode.dateEffective">
                          <span class="mi mi-xs">check</span>
                          {{ periode.dateEffective | date:'dd/MM/yyyy' }}
                        </div>
                      </td>

                      <td class="text-right sv-num">{{ periode.montantBrut | number:'1.0-0' }}</td>

                      <!-- FIX 1 : cellule Reporté conditionnelle -->
                      <td class="text-right" *ngIf="aDesReports(pr)">
                        <span *ngIf="periode.montantReporte > 0" class="badge badge-amber sv-report-badge">
                          +{{ periode.montantReporte | number:'1.0-0' }}
                        </span>
                      </td>

                      <td class="text-right sv-num sv-commission">
                        <span *ngIf="periode.commission > 0">−{{ periode.commission | number:'1.0-0' }}</span>
                        <span *ngIf="periode.commission === 0" class="text-muted">—</span>
                      </td>

                      <td class="text-right sv-num sv-travaux">
                        <span *ngIf="periode.retenueTravaux > 0">−{{ periode.retenueTravaux | number:'1.0-0' }}</span>
                        <span *ngIf="periode.retenueTravaux === 0" class="text-muted">—</span>
                      </td>

                      <td class="text-right sv-num sv-net fw-bold">
                        {{ periode.montantNet | number:'1.0-0' }}
                      </td>

                      <td class="text-center">
                        <span class="badge"
                          [class.badge-green] ="periode.statut==='Effectue'"
                          [class.badge-red]   ="periode.statut==='EnRetard'"
                          [class.badge-amber] ="periode.statut==='EnAttente'"
                          [class.badge-gray]  ="periode.statut==='Planifie'"
                          [class.badge-blue]  ="periode.statut==='Derogation'">
                          {{ periode.statutLabel }}
                        </span>
                      </td>

                      <td class="text-center" (click)="$event.stopPropagation()">
                        <div class="row-actions">
                          <button class="action-btn view" title="Voir détail"
                                  (click)="selectPeriode(periode, p, pr)">
                            <span class="mi mi-sm">visibility</span>
                          </button>
                          <button class="action-btn" title="Envoyer bordereau"
                                  *ngIf="periode.statut !== 'Planifie'"
                                  (click)="openEnvoi(periode, p)"
                                  style="color:var(--gold)">
                            <span class="mi mi-sm">send</span>
                          </button>
                        </div>
                      </td>

                    </tr>
                  </tbody>
                </table>
              </div>

            </div>
          </div>

        </div>

        <!-- Empty state -->
        <div class="empty-state" *ngIf="!proprietairesFiltres().length">
          <span class="mi">account_balance_wallet</span>
          <div class="empty-title">Aucun versement dans cette catégorie</div>
          <div class="empty-sub">Modifiez le filtre ou actualisez les données.</div>
        </div>

      </div><!-- /sv-list -->

      <!-- ══ Panneau détail période ══ -->
      <div class="sv-recap card" *ngIf="selectedPeriode && selectedProprietaire && selectedPropriete">

        <!-- En-tête panneau -->
        <div class="sv-rp-header">
          <div class="sv-rp-title">
            <div class="avatar sv-rp-avatar" [style.background]="avatarColor(selectedProprietaire.proprietaireNom)">
              {{ selectedProprietaire.proprietaireNom[0] }}
            </div>
            <div>
              <div class="sv-rp-nom">{{ selectedProprietaire.proprietaireNom }}</div>
              <div class="sv-rp-code">{{ selectedPropriete.proprieteLibelle }}</div>
            </div>
          </div>
          <button class="action-btn" (click)="selectedPeriode = null" title="Fermer">
            <span class="mi mi-sm">close</span>
          </button>
        </div>

        <!-- Période + statut -->
        <div class="sv-periode-info">
          <div class="sv-pi-row">
            <span class="sv-pi-label">Période</span>
            <strong class="sv-pi-val">{{ selectedPeriode.periodeId }}</strong>
          </div>
          <div class="sv-pi-row">
            <span class="sv-pi-label">Date prévue</span>
            <strong class="sv-pi-val">{{ selectedPeriode.datePrevue | date:'dd/MM/yyyy' }}</strong>
          </div>
          <div class="sv-pi-row">
            <span class="sv-pi-label">Statut</span>
            <span class="badge"
              [class.badge-green] ="selectedPeriode.statut==='Effectue'"
              [class.badge-red]   ="selectedPeriode.statut==='EnRetard'"
              [class.badge-amber] ="selectedPeriode.statut==='EnAttente'"
              [class.badge-gray]  ="selectedPeriode.statut==='Planifie'"
              [class.badge-blue]  ="selectedPeriode.statut==='Derogation'">
              {{ selectedPeriode.statutLabel }}
            </span>
          </div>
          <div class="sv-pi-row" *ngIf="selectedPeriode.reference">
            <span class="sv-pi-label">Référence</span>
            <code class="sv-ref-code">{{ selectedPeriode.reference }}</code>
          </div>
          <!-- Alerte CDC -->
          <div class="sv-cdc-alert" *ngIf="periodeInvalide(selectedPeriode, selectedPropriete)">
            <span class="mi mi-sm">warning</span>
            <div>
              <div class="sv-cdc-title">Période non conforme au cahier des charges</div>
              <div class="sv-cdc-body">
                Les mois {{ selectedPeriode.moisConcernes.join(', ') }} ne forment pas une période officielle
                {{ selectedPropriete.periodiciteLabel | lowercase }}.
                <span *ngIf="periodeAttendue(selectedPeriode, selectedPropriete)">
                  Période attendue&nbsp;: <strong>{{ periodeAttendue(selectedPeriode, selectedPropriete) }}</strong>.
                </span>
                Ce versement doit être corrigé côté backend avant d'être traité.
              </div>
            </div>
          </div>
        </div>

        <!-- Résumé financier rapide -->
        <div class="sv-fin-summary">
          <div class="sv-fs-row">
            <span class="sv-fs-label">Loyers encaissés (brut)</span>
            <span class="sv-fs-val">{{ selectedPeriode.montantBrut | number:'1.0-0' }} MRU</span>
          </div>
          <div class="sv-fs-row sv-fs-report" *ngIf="selectedPeriode.montantReporte > 0">
            <span class="sv-fs-label">+ Report période précédente</span>
            <span class="sv-fs-val text-amber">+{{ selectedPeriode.montantReporte | number:'1.0-0' }} MRU</span>
          </div>
          <div class="sv-fs-row sv-fs-total">
            <span class="sv-fs-label fw-bold">Net à verser</span>
            <span class="sv-fs-val sv-fs-net">{{ selectedPeriode.montantNet | number:'1.0-0' }} MRU</span>
          </div>
        </div>

        <!-- ══ Tableau détail produits ══ -->
        <div class="sv-lignes">
          <div class="sv-lignes-title">Détail par produit locatif</div>

          <table class="data-table sv-detail-table">
            <thead>
              <tr>
                <th>Produit</th>
                <th>Statut</th>
                <th class="text-right">Collectes</th>
                <th class="text-right">Encaissé</th>
              </tr>
            </thead>
            <tbody>

              <!-- Loués -->
              <tr *ngFor="let l of lignesParStatut(selectedPeriode.lignes, 'Loue')">
                <td><code class="sv-prod-code">{{ l.produitCode }}</code></td>
                <td><span class="badge badge-green">loué</span></td>
                <td class="text-right text-muted">{{ l.nbCollectes }} collecte(s)</td>
                <td class="text-right fw-bold">{{ l.montantEncaisse | number:'1.0-0' }} MRU</td>
              </tr>

              <!-- En attente -->
              <tr *ngFor="let l of lignesParStatut(selectedPeriode.lignes, 'LoyersEnAttente')"
                  class="sv-row-attente">
                <td><code class="sv-prod-code">{{ l.produitCode }}</code></td>
                <td><span class="badge badge-amber">en attente</span></td>
                <td class="text-right text-muted">Non encaissé</td>
                <td class="text-right text-amber">{{ l.montantAttendu | number:'1.0-0' }} MRU attendu</td>
              </tr>

              <!-- Vacants -->
              <tr *ngFor="let l of lignesParStatut(selectedPeriode.lignes, 'Vacant')"
                  class="sv-row-vacant">
                <td><code class="sv-prod-code">{{ l.produitCode }}</code></td>
                <td><span class="badge badge-gray">vacant</span></td>
                <td class="text-right text-muted">—</td>
                <td class="text-right text-muted">0 MRU</td>
              </tr>

              <!-- Total brut -->
              <tr class="sv-row-total">
                <td colspan="3" class="fw-bold">Montant brut</td>
                <td class="text-right fw-bold">{{ selectedPeriode.montantBrut | number:'1.0-0' }} MRU</td>
              </tr>

              <!-- Déductions -->
              <tr class="sv-row-ded" *ngIf="selectedPeriode.montantReporte > 0">
                <td colspan="3">− Report période précédente</td>
                <td class="text-right text-red">−{{ selectedPeriode.montantReporte | number:'1.0-0' }} MRU</td>
              </tr>
              <tr class="sv-row-ded" *ngIf="selectedPeriode.commission > 0">
                <td colspan="3">− Commission agence</td>
                <td class="text-right text-red">−{{ selectedPeriode.commission | number:'1.0-0' }} MRU</td>
              </tr>
              <tr class="sv-row-ded" *ngIf="selectedPeriode.retenueTravaux > 0">
                <td colspan="3">− Retenue travaux</td>
                <td class="text-right text-red">−{{ selectedPeriode.retenueTravaux | number:'1.0-0' }} MRU</td>
              </tr>
              <tr class="sv-row-ded" *ngIf="selectedPeriode.retenueAvance > 0">
                <td colspan="3">
                  <div class="sv-ded-avance">
                    <span>− Remboursement prêt agence</span>
                    <ng-container *ngFor="let d of selectedPeriode.deductions">
                      <span class="sv-ded-sub text-muted"
                            *ngIf="d.type==='avance' || d.type==='Avance'">
                        {{ d.libelle }}
                      </span>
                    </ng-container>
                  </div>
                </td>
                <td class="text-right text-red">−{{ selectedPeriode.retenueAvance | number:'1.0-0' }} MRU</td>
              </tr>
              <tr class="sv-row-ded">
                <td colspan="3">− Impôts</td>
                <td class="text-right text-muted">—</td>
              </tr>
              <tr class="sv-row-ded">
                <td colspan="3">− Services agence</td>
                <td class="text-right text-muted">—</td>
              </tr>

              <!-- Net final -->
              <tr class="sv-row-net">
                <td colspan="3" class="fw-bold">Net à verser</td>
                <td class="text-right fw-bold text-green">
                  {{ selectedPeriode.montantNet | number:'1.0-0' }} MRU
                </td>
              </tr>

            </tbody>
          </table>

          <!-- Légende -->
          <div class="sv-legend" *ngIf="selectedPeriode.lignes.length">
            <span class="sv-leg text-green">
              {{ lignesParStatut(selectedPeriode.lignes, 'Loue').length }} loué(s)
            </span>
            <span class="sv-leg text-amber"
                  *ngIf="lignesParStatut(selectedPeriode.lignes, 'LoyersEnAttente').length > 0">
              · {{ lignesParStatut(selectedPeriode.lignes, 'LoyersEnAttente').length }} en attente
            </span>
            <span class="sv-leg text-muted"
                  *ngIf="lignesParStatut(selectedPeriode.lignes, 'Vacant').length > 0">
              · {{ lignesParStatut(selectedPeriode.lignes, 'Vacant').length }} vacant(s)
            </span>
          </div>
        </div>

        <!-- ══ Actions ══ -->
        <div class="sv-rp-actions">

          <!-- Marquer effectué -->
          <div class="sv-action-group"
               *ngIf="selectedPeriode.statut === 'EnAttente'
                   || selectedPeriode.statut === 'EnRetard'
                   || (selectedPeriode.statut.toLowerCase().startsWith('planifi') && selectedPeriode.montantBrut > 0)">
            <input class="form-control sv-input-ref"
                   [(ngModel)]="refPaiement"
                   placeholder="Référence paiement…">
            <button class="btn btn-gold sv-btn-full"
                    (click)="marquerEffectue()"
                    [disabled]="saving || !refPaiement.trim()">
              <span class="mi mi-sm">check_circle</span>
              {{ saving ? 'Enregistrement…' : 'Marquer comme versé' }}
            </button>
          </div>

          <!-- Dérogation -->
          <div class="sv-action-group" *ngIf="selectedPeriode.statut === 'EnRetard'">
            <input class="form-control sv-input-ref"
                   [(ngModel)]="motifDerogation"
                   placeholder="Motif dérogation…">
            <button class="btn btn-secondary sv-btn-full" (click)="accorderDerogation()">
              <span class="mi mi-sm">schedule</span>
              Accorder une dérogation
            </button>
          </div>

          <!-- Envoi bordereau -->
          <div class="sv-envoi-group"
               *ngIf="!selectedPeriode.statut.toLowerCase().startsWith('planifi') || selectedPeriode.montantBrut > 0">
            <div class="sv-envoi-label">Envoyer le bordereau</div>
            <div class="sv-envoi-btns">
              <button class="btn sv-btn-envoi sv-btn-email"    (click)="envoyer('email')">
                <span class="mi mi-sm">email</span> Email
              </button>
              <button class="btn sv-btn-envoi sv-btn-whatsapp" (click)="envoyer('whatsapp')">
                <span class="mi mi-sm">chat</span> WhatsApp
              </button>
              <button class="btn sv-btn-envoi sv-btn-sms"      (click)="envoyer('sms')">
                <span class="mi mi-sm">sms</span> SMS
              </button>
            </div>
          </div>

          <!-- Export -->
          <div class="sv-export-btns">
            <button class="btn btn-secondary sv-btn-export" (click)="exportPdf()">
              <span class="mi mi-sm">picture_as_pdf</span> Export PDF
            </button>
            <button class="btn btn-secondary sv-btn-export" (click)="exportExcel()">
              <span class="mi mi-sm">table_chart</span> Export Excel
            </button>
          </div>

        </div>

      </div><!-- /sv-recap -->

    </div><!-- /sv-layout -->
  </ng-container>

  <!-- ══ Modal envoi rapide ══ -->
  <div class="modal-overlay" *ngIf="showEnvoiModal" (click)="showEnvoiModal=false">
    <div class="modal sv-modal-envoi" (click)="$event.stopPropagation()">
      <div class="modal-header">
        <div class="modal-title">
          <span class="mi">send</span>
          Envoyer le bordereau
        </div>
        <button class="modal-close" (click)="showEnvoiModal=false">
          <span class="mi">close</span>
        </button>
      </div>
      <div class="modal-body" *ngIf="modalPeriode && modalProprietaire">
        <div class="sv-modal-info">
          <strong>{{ modalProprietaire.proprietaireNom }}</strong> —
          Période {{ modalPeriode.periodeId }} —
          Net {{ modalPeriode.montantNet | number:'1.0-0' }} MRU
        </div>
        <div class="sv-envoi-btns" style="margin-top:14px">
          <button class="btn sv-btn-envoi sv-btn-email"    (click)="envoyerModal('email')">
            <span class="mi mi-sm">email</span> Email
          </button>
          <button class="btn sv-btn-envoi sv-btn-whatsapp" (click)="envoyerModal('whatsapp')">
            <span class="mi mi-sm">chat</span> WhatsApp
          </button>
          <button class="btn sv-btn-envoi sv-btn-sms"      (click)="envoyerModal('sms')">
            <span class="mi mi-sm">sms</span> SMS
          </button>
        </div>
      </div>
    </div>
  </div>

  <!-- ══ Toast ══ -->
  <div class="sv-toast" [class.visible]="toastVisible" [class.ok]="toastType==='ok'" [class.err]="toastType==='err'">
    <span class="mi mi-sm">{{ toastType === 'ok' ? 'check_circle' : 'error' }}</span>
    {{ toastMsg }}
  </div>

</div>

<!-- ── Modal notification propriétaire ── -->
<kdi-notification-modal
  *ngIf="notifModalConfig"
  [config]="notifModalConfig!"
  (closed)="onNotifProprietaireClose($event)">
</kdi-notification-modal>
  `,
  styles: [`

    /* ════════════════════════════════════════════════
       THÈME SOMBRE — variables locales
       Palette identique à la version HTML prototype
       ════════════════════════════════════════════════ */
    .sv-root {
      --sv-panel-w:  400px;

      /* Fonds */
      --dk-bg:       #0d1117;
      --dk-s1:       #161b22;
      --dk-s2:       #1c2331;
      --dk-s3:       #222b3a;

      /* Bordures */
      --dk-bord:     rgba(255,255,255,0.07);
      --dk-bord2:    rgba(255,255,255,0.13);

      /* Texte */
      --dk-text:     #e6edf3;
      --dk-muted:    #8b949e;
      --dk-dim:      #484f58;

      /* Accents */
      --dk-gold:     #d4af37;
      --dk-gold-bg:  rgba(212,175,55,0.10);
      --dk-gold-bd:  rgba(212,175,55,0.22);

      --dk-green:    #3fb950;
      --dk-green-bg: rgba(63,185,80,0.10);
      --dk-green-bd: rgba(63,185,80,0.22);

      --dk-red:      #f85149;
      --dk-red-bg:   rgba(248,81,73,0.10);
      --dk-red-bd:   rgba(248,81,73,0.22);

      --dk-orange:   #e3a13f;
      --dk-org-bg:   rgba(227,161,63,0.10);
      --dk-org-bd:   rgba(227,161,63,0.22);

      --dk-blue:     #58a6ff;
      --dk-blue-bg:  rgba(88,166,255,0.10);
      --dk-blue-bd:  rgba(88,166,255,0.22);

      --dk-purple:   #bc8cff;
      --dk-pur-bg:   rgba(188,140,255,0.10);
      --dk-pur-bd:   rgba(188,140,255,0.22);

      /* Fond global du composant */
      background: var(--dk-bg);
      color: var(--dk-text);
      font-family: 'DM Sans', sans-serif;
      min-height: 100%;
      padding: 24px;
    }

    /* ── Écraser page-header / page-title pour le dark ── */
    .sv-root .page-header    { margin-bottom: 20px; background: transparent; border-bottom: none; }
    .sv-root .page-title     { color: var(--dk-text) !important; font-family: 'DM Sans', sans-serif; font-size: 1.1rem; font-weight: 500; }
    .sv-root .page-title .mi { color: var(--dk-gold); }
    .sv-root .page-subtitle  { color: var(--dk-muted); }
    .sv-root .header-actions { gap: 8px; }

    /* select année */
    .sv-select-year {
      width: auto;
      padding: 6px 12px;
      font-size: .8rem;
      background: var(--dk-s2);
      border: 1px solid var(--dk-bord2);
      color: var(--dk-text);
      border-radius: 10px;
      outline: none;
      font-family: inherit;
    }

    /* btn Actualiser */
    .sv-root .btn-secondary {
      background: var(--dk-s2);
      border: 1px solid var(--dk-bord2);
      color: var(--dk-muted);
      border-radius: 10px;
    }
    .sv-root .btn-secondary:hover { color: var(--dk-text); }

    /* ── KPIs ── */
    .sv-kpi-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 0;
      background: var(--dk-bord);
      border: 1px solid var(--dk-bord);
      border-radius: 14px;
      overflow: hidden;
      margin-bottom: 20px;
    }
    .sv-root .kpi-card {
      background: var(--dk-s1);
      border: none;
      border-radius: 0;
      box-shadow: none;
      padding: 16px 22px;
      cursor: default;
    }
    .sv-root .kpi-card:hover { box-shadow: none; transform: none; }
    .sv-root .kpi-card::before { display: none; }
    .sv-root .kpi-icon {
      background: var(--dk-gold-bg) !important;
      border-radius: 8px;
      margin-bottom: 10px;
    }
    .sv-root .kpi-icon .mi { color: var(--dk-gold) !important; }
    .sv-root .kpi-value  { color: var(--dk-text); font-size: 1.3rem; font-family: 'DM Sans', sans-serif; font-weight: 600; }
    .sv-root .kpi-label  { color: var(--dk-muted); font-size: .65rem; }
    .kpi-unit            { font-size: .6rem; color: var(--dk-dim); margin-left: 3px; }

    .sv-kpi-stat { display: flex; flex-direction: column; justify-content: center; }
    .kpi-pills   { display: flex; flex-direction: column; gap: 5px; }
    .kpi-pill {
      display: inline-flex; align-items: center; gap: 4px;
      font-size: .72rem; font-weight: 500;
      padding: 3px 10px; border-radius: 20px; width: fit-content;
    }
    .kpi-pill strong { font-weight: 600; }
    .kpi-pill-red  { background: var(--dk-red-bg);  color: var(--dk-red);  border: 1px solid var(--dk-red-bd); }
    .kpi-pill-blue { background: var(--dk-blue-bg); color: var(--dk-blue); border: 1px solid var(--dk-blue-bd); }
    .kpi-pill-gray { background: rgba(255,255,255,.04); color: var(--dk-muted); border: 1px solid var(--dk-bord); }

    /* ── Layout liste + panneau ── */
    .sv-layout {
      display: grid;
      grid-template-columns: 1fr;
      gap: 14px;
      align-items: start;
    }
    .sv-layout.sv-panel-open {
      grid-template-columns: 1fr var(--sv-panel-w);
    }

    .sv-list { display: flex; flex-direction: column; gap: 10px; }

    /* ── filter-bar dark ── */
    .sv-root .filter-bar {
      background: var(--dk-s1);
      border: 1px solid var(--dk-bord);
      box-shadow: none;
      padding: 8px 12px;
      border-radius: 10px;
    }
    .sv-root .filter-chip {
      border-color: var(--dk-bord2);
      color: var(--dk-muted);
      background: transparent;
      font-size: .72rem;
    }
    .sv-root .filter-chip:hover { color: var(--dk-text); border-color: var(--dk-muted); }
    .sv-root .filter-chip.active {
      background: var(--dk-s2);
      color: var(--dk-text);
      border-color: var(--dk-bord2);
    }
    /* chips colorés */
    .sv-root .filter-chip[class*="active"]:nth-child(2) { background: var(--dk-red-bg);   color: var(--dk-red);    border-color: var(--dk-red-bd); }
    .sv-root .filter-chip.active[data-f="EnRetard"]     { background: var(--dk-red-bg);   color: var(--dk-red);    border-color: var(--dk-red-bd); }

    /* ── Cartes propriétaire ── */
    .sv-prop-card {
      background: var(--dk-s1);
      border: 1px solid var(--dk-bord);
      border-radius: 14px;
      overflow: hidden;
      transition: border-color .15s;
    }
    .sv-prop-card:hover { border-color: var(--dk-bord2); }

    .sv-prop-header {
      display: flex; align-items: center; gap: 10px;
      padding: 13px 16px; cursor: pointer; user-select: none;
      transition: background .12s;
    }
    .sv-prop-header:hover { background: rgba(255,255,255,.02); }

    .sv-prop-avatar {
      width: 36px; height: 36px; border-radius: 50%;
      background: var(--dk-gold-bg); border: 1px solid var(--dk-gold-bd);
      display: flex; align-items: center; justify-content: center;
      font-family: 'DM Sans', sans-serif; font-size: .82rem; font-weight: 600;
      color: var(--dk-gold); flex-shrink: 0;
    }
    .sv-prop-info { flex: 1; min-width: 0; }
    .sv-prop-nom  { font-size: .8rem; font-weight: 500; color: var(--dk-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .sv-prop-tel  { font-size: .7rem; color: var(--dk-muted); margin-top: 1px; }

    .sv-prop-kpis { display: flex; gap: 14px; }
    .sv-pk        { text-align: right; }
    .sv-pk-label  { display: block; font-size: .6rem; color: var(--dk-dim); text-transform: uppercase; letter-spacing: .04em; }
    .sv-pk-val    { font-size: .78rem; font-weight: 500; color: var(--dk-text); }
    .sv-pk-net .sv-pk-val  { color: var(--dk-green); }
    .sv-pk-danger { color: var(--dk-red) !important; }

    .sv-notif-btn { color: var(--dk-dim) !important; border-radius: 6px; }
    .sv-notif-btn:hover { background: var(--dk-gold-bg) !important; color: var(--dk-gold) !important; }

    /* ── Material Icons — couleur forcée dans le dark ── */
    .sv-root .mi { color: var(--dk-muted) !important; }
    .sv-root .page-title .mi { color: var(--dk-gold) !important; }
    .sv-root .sv-date-eff .mi { color: var(--dk-green) !important; }

    .sv-chevron {
      width: 20px; height: 20px;
      display: flex; align-items: center; justify-content: center;
      color: var(--dk-dim);
      transition: transform .2s, color .15s;
      flex-shrink: 0;
    }
    .sv-chevron-open { transform: rotate(90deg); color: var(--dk-muted); }

    /* ── Corps propriété ── */
    .sv-prop-body { border-top: 1px solid var(--dk-bord); animation: sv-slide .14s ease; }
    @keyframes sv-slide { from { opacity:0; transform:translateY(-4px); } to { opacity:1; transform:translateY(0); } }

    .sv-pr-block { border-bottom: 1px solid var(--dk-bord); }
    .sv-pr-block:last-child { border-bottom: none; }

    .sv-pr-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; padding: 11px 16px 8px; }
    .sv-pr-libelle { font-size: .78rem; font-weight: 500; color: var(--dk-text); margin-bottom: 4px; }
    .sv-pr-meta    { display: flex; align-items: center; gap: 7px; flex-wrap: wrap; font-size: .7rem; color: var(--dk-muted); }
    .sv-pr-totaux  { text-align: right; flex-shrink: 0; }
    .sv-pr-brut    { display: block; font-size: .67rem; color: var(--dk-muted); }
    .sv-pr-net     { display: block; font-size: .74rem; font-weight: 600; color: var(--dk-green); }
    .sv-vacants    { font-size: .7rem; color: var(--dk-orange); }

    /* badges periodicite */
    .sv-period-badge { font-size: .67rem; font-weight: 500; }
    .sv-pb-mensuel     { background: var(--dk-blue-bg);  color: var(--dk-blue);   border: 1px solid var(--dk-blue-bd); }
    .sv-pb-bimensuel   { background: var(--dk-gold-bg);  color: var(--dk-gold);   border: 1px solid var(--dk-gold-bd); }
    .sv-pb-trimestriel { background: var(--dk-pur-bg);   color: var(--dk-purple); border: 1px solid var(--dk-pur-bd); }

    /* ── Table périodes ── */
    .sv-table-wrap { overflow-x: auto; }
    .sv-periods-table { margin-bottom: 0; }

    /* écrase les styles globaux de .data-table pour le dark */
    .sv-root .data-table th {
      background: rgba(255,255,255,.02);
      color: var(--dk-dim);
      border-bottom: 1px solid var(--dk-bord);
      border-top: 1px solid var(--dk-bord);
      font-size: .6rem;
    }
    .sv-root .data-table td {
      color: var(--dk-text);
      border-bottom: 1px solid var(--dk-bord);
      font-size: .76rem;
    }
    .sv-root .data-table tr:last-child td { border-bottom: none; }
    .sv-root .data-table tbody tr:hover td { background: rgba(255,255,255,.025); cursor: pointer; }

    .sv-row-selected td { background: rgba(212,175,55,.055) !important; }
    .sv-row-retard   td { background: rgba(248,81,73,.03)   !important; }
    .sv-row-retard:hover td { background: rgba(248,81,73,.06) !important; }

    .sv-periode-id   { font-size: .74rem; font-weight: 500; color: var(--dk-text); }
    .sv-periode-mois { font-size: .65rem; color: var(--dk-muted); margin-top: 1px; }

    /* ── Avertissement période non conforme CDC ── */
    .sv-periode-warning {
      display: flex;
      align-items: center;
      gap: 3px;
      margin-top: 4px;
      font-size: .62rem;
      color: var(--dk-orange);
      flex-wrap: wrap;
    }
    .sv-periode-warning .mi { font-size: 11px !important; color: var(--dk-orange) !important; }
    .sv-periode-expected {
      color: var(--dk-muted);
      font-size: .62rem;
    }

    /* ── Alerte CDC dans le panneau détail ── */
    .sv-cdc-alert {
      display: flex;
      gap: 10px;
      margin-top: 6px;
      background: var(--dk-org-bg);
      border: 1px solid var(--dk-org-bd);
      border-radius: 8px;
      padding: 10px 12px;
    }
    .sv-cdc-alert > .mi { color: var(--dk-orange) !important; font-size: 16px !important; flex-shrink: 0; margin-top: 1px; }
    .sv-cdc-title { font-size: .74rem; font-weight: 600; color: var(--dk-orange); margin-bottom: 3px; }
    .sv-cdc-body  { font-size: .71rem; color: var(--dk-muted); line-height: 1.5; }
    .sv-cdc-body strong { color: var(--dk-text); }
    .sv-date-retard  { color: var(--dk-red); font-weight: 500; font-size: .74rem; }
    .sv-date-eff     { font-size: .65rem; color: var(--dk-green); display: flex; align-items: center; gap: 2px; margin-top: 2px; }
    .sv-num          { font-variant-numeric: tabular-nums; }
    .sv-commission   { color: var(--dk-muted); }
    .sv-travaux      { color: var(--dk-orange); }
    .sv-report-badge {
      font-size: .63rem;
      background: var(--dk-org-bg); color: var(--dk-orange);
      border: 1px solid var(--dk-org-bd); border-radius: 4px;
      padding: 1px 6px;
    }

    /* badges statut (écrase .badge global) */
    .sv-root .badge-green { background: var(--dk-green-bg); color: var(--dk-green); border: 1px solid var(--dk-green-bd); }
    .sv-root .badge-red   { background: var(--dk-red-bg);   color: var(--dk-red);   border: 1px solid var(--dk-red-bd); }
    .sv-root .badge-amber { background: var(--dk-org-bg);   color: var(--dk-orange);border: 1px solid var(--dk-org-bd); }
    .sv-root .badge-gray  { background: rgba(255,255,255,.04); color: var(--dk-dim); border: 1px solid var(--dk-bord); }
    .sv-root .badge-blue  { background: var(--dk-blue-bg);  color: var(--dk-blue);  border: 1px solid var(--dk-blue-bd); }

    /* action-btn dans la table */
    .sv-root .action-btn { background: transparent; border: 1px solid transparent; border-radius: 6px; }
    .sv-root .action-btn.view { color: var(--dk-dim); }
    .sv-root .action-btn.view:hover { background: var(--dk-s2); border-color: var(--dk-bord2); color: var(--dk-muted); }

    /* ── Panneau détail ── */
    .sv-recap {
      background: var(--dk-s1);
      border: 1px solid var(--dk-bord2);
      border-radius: 14px;
      position: sticky;
      top: 20px;
      max-height: calc(100vh - 120px);
      overflow-y: auto;
      scrollbar-width: thin;
      scrollbar-color: var(--dk-bord2) transparent;
    }
    .sv-recap::-webkit-scrollbar { width: 3px; }
    .sv-recap::-webkit-scrollbar-thumb { background: var(--dk-bord2); }

    .sv-rp-header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 13px 16px; background: #0e1c38;
      border-radius: 13px 13px 0 0; flex-shrink: 0;
    }
    .sv-rp-title { display: flex; align-items: center; gap: 10px; }
    .sv-rp-avatar {
      width: 34px; height: 34px; border-radius: 50%;
      background: rgba(201,169,78,.25);
      display: flex; align-items: center; justify-content: center;
      font-size: .8rem; font-weight: 600; color: #c9a94e; flex-shrink: 0;
    }
    .sv-rp-nom  { font-size: .78rem; font-weight: 500; color: #fff; }
    .sv-rp-code { font-size: .65rem; color: rgba(255,255,255,.4); margin-top: 1px; }
    .sv-rp-header .action-btn { color: rgba(255,255,255,.45) !important; border-radius: 6px !important; }
    .sv-rp-header .action-btn:hover { background: rgba(255,255,255,.1) !important; color: #fff !important; }

    /* période info */
    .sv-periode-info {
      padding: 10px 16px; border-bottom: 1px solid var(--dk-bord);
      display: flex; flex-direction: column; gap: 5px;
    }
    .sv-pi-row   { display: flex; align-items: center; justify-content: space-between; font-size: .75rem; }
    .sv-pi-label { color: var(--dk-muted); }
    .sv-pi-val   { color: var(--dk-text); font-weight: 500; }
    .sv-ref-code {
      font-size: .7rem;
      background: var(--dk-s2); color: var(--dk-text);
      padding: 1px 6px; border-radius: 4px; border: 1px solid var(--dk-bord2);
    }

    /* fin-summary */
    .sv-fin-summary { padding: 10px 16px; border-bottom: 1px solid var(--dk-bord); }
    .sv-fs-row    { display: flex; justify-content: space-between; align-items: center; padding: 4px 0; font-size: .76rem; }
    .sv-fs-report { background: var(--dk-org-bg); border: 1px solid var(--dk-org-bd); border-radius: 4px; padding: 3px 7px; margin: 2px 0; }
    .sv-fs-total  { border-top: 1px solid var(--dk-bord2); margin-top: 5px; padding-top: 7px; font-weight: 600; }
    .sv-fs-label  { color: var(--dk-muted); }
    .sv-fs-val    { font-weight: 500; font-variant-numeric: tabular-nums; color: var(--dk-text); }
    .sv-fs-net    { color: var(--dk-green); font-size: .95rem; font-weight: 600; }
    .sv-root .text-amber  { color: var(--dk-orange) !important; }
    .sv-root .text-green  { color: var(--dk-green)  !important; }
    .sv-root .text-red    { color: var(--dk-red)    !important; }
    .sv-root .text-muted  { color: var(--dk-muted)  !important; }

    /* lignes produits */
    .sv-lignes { padding: 10px 16px; border-bottom: 1px solid var(--dk-bord); }
    .sv-lignes-title { font-size: .6rem; font-weight: 500; color: var(--dk-dim); text-transform: uppercase; letter-spacing: .06em; margin-bottom: 8px; }
    .sv-detail-table th { color: var(--dk-dim) !important; }
    .sv-detail-table td { font-size: .72rem !important; padding: 6px 10px !important; }
    .sv-prod-code {
      font-size: .7rem; font-weight: 500;
      background: var(--dk-s2); color: var(--dk-text);
      padding: 2px 6px; border-radius: 4px; border: 1px solid var(--dk-bord2);
    }
    .sv-row-attente td { background: rgba(227,161,63,.04) !important; }
    .sv-row-vacant  td { color: var(--dk-muted) !important; }
    .sv-row-total   td { font-weight: 600 !important; background: rgba(255,255,255,.03) !important; border-top: 1px solid var(--dk-bord2) !important; }
    .sv-row-ded     td { color: var(--dk-muted) !important; font-size: .71rem !important; }
    .sv-row-net     td {
      font-weight: 600 !important; font-size: .78rem !important;
      color: var(--dk-green) !important;
      background: var(--dk-green-bg) !important;
      border-top: 1px solid var(--dk-green-bd) !important;
    }
    .sv-root .fw-bold { font-weight: 600 !important; }

    .sv-ded-avance { display: flex; flex-direction: column; gap: 2px; }
    .sv-ded-sub    { font-size: .65rem; padding-left: 10px; color: var(--dk-dim); }

    .sv-legend { display: flex; gap: 6px; margin-top: 5px; padding-top: 6px; border-top: 1px dashed var(--dk-bord); }
    .sv-leg    { font-size: .69rem; }

    /* ── Actions ── */
    .sv-rp-actions { padding: 12px 16px; display: flex; flex-direction: column; gap: 8px; border-top: 1px solid var(--dk-bord); }
    .sv-action-group { display: flex; flex-direction: column; gap: 6px; }

    .sv-input-ref {
      padding: 8px 11px; border: 1px solid var(--dk-bord2); border-radius: 10px;
      font-size: .78rem; width: 100%; background: var(--dk-s2); color: var(--dk-text);
      font-family: inherit; outline: none; transition: border-color .12s;
    }
    .sv-input-ref:focus { border-color: var(--dk-gold); }
    .sv-input-ref::placeholder { color: var(--dk-dim); }

    .sv-btn-full { width: 100%; justify-content: center; }

    /* btn-gold dark */
    .sv-root .btn-gold {
      background: var(--dk-gold-bg);
      border: 1px solid var(--dk-gold-bd);
      color: var(--dk-gold);
      box-shadow: none;
      transform: none;
    }
    .sv-root .btn-gold:hover { background: rgba(212,175,55,.18); transform: none; box-shadow: none; }
    .sv-root .btn-gold:disabled { opacity: .4; cursor: not-allowed; }

    .sv-envoi-group { padding-top: 8px; border-top: 1px solid var(--dk-bord); }
    .sv-envoi-label { font-size: .6rem; font-weight: 500; color: var(--dk-dim); text-transform: uppercase; letter-spacing: .06em; margin-bottom: 6px; }
    .sv-envoi-btns  { display: flex; gap: 6px; }
    .sv-btn-envoi { flex: 1; padding: 7px 8px; font-size: .73rem; justify-content: center; border-radius: 8px; }
    .sv-btn-email    { background: var(--dk-s2); border: 1px solid var(--dk-bord2); color: var(--dk-muted); }
    .sv-btn-email:hover    { color: var(--dk-text); background: var(--dk-s3); transform: none; box-shadow: none; }
    .sv-btn-whatsapp { background: var(--dk-s2); border: 1px solid var(--dk-bord2); color: var(--dk-muted); }
    .sv-btn-whatsapp:hover { color: var(--dk-text); background: var(--dk-s3); transform: none; box-shadow: none; }
    .sv-btn-sms      { background: var(--dk-s2); border: 1px solid var(--dk-bord2); color: var(--dk-muted); }
    .sv-btn-sms:hover      { color: var(--dk-text); background: var(--dk-s3); transform: none; box-shadow: none; }

    .sv-export-btns { display: flex; gap: 6px; }
    .sv-btn-export  {
      flex: 1; justify-content: center; font-size: .72rem;
      background: transparent; border: 1px solid var(--dk-bord);
      color: var(--dk-muted); border-radius: 10px;
    }
    .sv-btn-export:hover { background: var(--dk-s2); color: var(--dk-text); transform: none; box-shadow: none; }

    /* ── Modal envoi rapide ── */
    .sv-root .modal-overlay { background: rgba(0,0,0,.65); }
    .sv-modal-envoi {
      max-width: 380px;
      background: var(--dk-s1) !important;
      border: 1px solid var(--dk-bord2) !important;
      box-shadow: 0 12px 40px rgba(0,0,0,.5) !important;
    }
    .sv-modal-envoi .modal-header { background: #0e1c38 !important; border-bottom: none; }
    .sv-modal-envoi .modal-title  { color: #fff !important; font-family: 'DM Sans', sans-serif; font-weight: 500; font-size: .85rem; }
    .sv-modal-envoi .modal-close  { background: rgba(255,255,255,.1); color: rgba(255,255,255,.6); }
    .sv-modal-envoi .modal-close:hover { background: rgba(255,255,255,.2); color: #fff; }
    .sv-modal-envoi .modal-body   { background: var(--dk-s1) !important; }
    .sv-modal-info {
      background: var(--dk-s2); border: 1px solid var(--dk-bord);
      border-radius: 8px; padding: 10px 13px; font-size: .78rem; color: var(--dk-text);
    }

    /* ── Empty state dark ── */
    .sv-root .empty-state      { color: var(--dk-dim); }
    .sv-root .empty-state .mi  { color: var(--dk-dim); }
    .sv-root .empty-title      { color: var(--dk-muted); font-family: 'DM Sans', sans-serif; }
    .sv-root .empty-sub        { color: var(--dk-dim); }

    /* ── Loading ── */
    .sv-loading { display: flex; align-items: center; gap: 10px; padding: 60px; justify-content: center; color: var(--dk-muted); font-size: .8rem; }
    .sv-spinner {
      width: 20px; height: 20px;
      border: 2px solid var(--dk-bord2);
      border-top-color: var(--dk-gold);
      border-radius: 50%;
      animation: sv-spin .7s linear infinite;
    }
    @keyframes sv-spin { to { transform: rotate(360deg); } }

    /* ── Toast ── */
    .sv-toast {
      position: fixed; bottom: 24px; right: 24px; z-index: 9999;
      display: flex; align-items: center; gap: 8px;
      padding: 12px 18px; border-radius: 10px;
      font-size: .8rem; font-weight: 500;
      box-shadow: 0 8px 28px rgba(0,0,0,.4); max-width: 400px;
      transform: translateY(70px); opacity: 0;
      transition: transform .28s ease, opacity .28s ease; pointer-events: none;
    }
    .sv-toast.visible { transform: translateY(0); opacity: 1; }
    .sv-toast.ok  { background: var(--dk-green-bg); color: var(--dk-green); border: 1px solid var(--dk-green-bd); }
    .sv-toast.err { background: var(--dk-red-bg);   color: var(--dk-red);   border: 1px solid var(--dk-red-bd); }
  `]
})
export class SuiviVersementsComponent implements OnInit {
  private svc = inject(SuiviVersementsService);

  loading     = true;
  data:        SuiviVersementsGlobalDto | null = null;
  filtre       = '';
  anneeFiltre  = new Date().getFullYear().toString();
  annees       = Array.from({ length: 4 }, (_, i) => (new Date().getFullYear() - i).toString());

  selectedPeriode:      PeriodeVersementDto | null = null;
  selectedProprietaire: SuiviVersementProprietaireDto | null = null;
  selectedPropriete:    SuiviVersementProprieteDto | null = null;

  showEnvoiModal    = false;
  modalPeriode:      PeriodeVersementDto | null = null;
  modalProprietaire: SuiviVersementProprietaireDto | null = null;

  refPaiement     = '';
  motifDerogation = '';
  saving          = false;

  private openProprietaires = new Set<string>();

  // ── Palette pour les avatars (rotation sur le nom) ──────────────────
  private readonly AVATAR_COLORS = [
    '#0e1c38', '#1a3060', '#1e4d2b', '#6b2d2d',
    '#6b4c2d', '#2d4c6b', '#4c2d6b', '#2d6b4c',
  ];

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

  isOpen(id: string) { return this.openProprietaires.has(id); }

  toggleProprietaire(id: string) {
    if (this.openProprietaires.has(id)) this.openProprietaires.delete(id);
    else this.openProprietaires.add(id);
  }

  // Exclure les propriétaires sans net global
  proprietairesFiltres(): SuiviVersementProprietaireDto[] {
    if (!this.data) return [];
    const avecNet = this.data.proprietaires.filter(p => p.totalNetGlobal > 0);
    if (!this.filtre) return avecNet;
    return avecNet.filter(p =>
      p.proprietes.some(pr => pr.periodes.some(pe => pe.statut === this.filtre))
    );
  }

  // Propriétés avec montant net > 0 uniquement
  proprietesFiltrees(p: SuiviVersementProprietaireDto): SuiviVersementProprieteDto[] {
    return p.proprietes.filter(pr => pr.totalNet > 0);
  }

  // Périodes filtrées (filtre actif ou toutes)
  periodesFiltrees(pr: SuiviVersementProprieteDto): PeriodeVersementDto[] {
    if (!this.filtre) return pr.periodes;
    return pr.periodes.filter(pe => pe.statut === this.filtre);
  }

  // ── Validation CDC : périodes officielles ────────────────────────────
  // Bimensuel : Jan-Fév, Mar-Avr, Mai-Jun, Jul-Aoû, Sep-Oct, Nov-Déc
  private readonly PERIODES_BIMENSUELLES = [
    [1, 2], [3, 4], [5, 6], [7, 8], [9, 10], [11, 12]
  ];
  // Trimestriel : Jan-Mar, Avr-Jun, Jul-Sep, Oct-Déc
  private readonly PERIODES_TRIMESTRIELLES = [
    [1, 2, 3], [4, 5, 6], [7, 8, 9], [10, 11, 12]
  ];

  /**
   * Retourne true si les moisConcernes de cette période ne correspondent pas
   * à une période officielle du CDC pour la periodicite donnée.
   */
  periodeInvalide(periode: PeriodeVersementDto, pr: SuiviVersementProprieteDto): boolean {
    if (!periode.moisConcernes?.length) return false;
    const periodicite = pr.periodicite?.toLowerCase();
    if (periodicite === 'mensuel') return false; // toujours 1 mois, toujours valide

    // Extraire les numéros de mois depuis moisConcernes (format "Janvier 2026", "2026-01", etc.)
    const numeros = periode.moisConcernes.map(m => this.moisVersNumero(m)).filter(n => n > 0);
    if (!numeros.length) return false;

    const annees = new Set(periode.moisConcernes.map(m => this.moisVersAnnee(m)));
    // Périodes multi-années = invalide
    if (annees.size > 1) return true;

    if (periodicite === 'bimensuel') {
      return !this.PERIODES_BIMENSUELLES.some(p =>
        p.length === numeros.length && p.every((v, i) => v === numeros[i])
      );
    }
    if (periodicite === 'trimestriel') {
      return !this.PERIODES_TRIMESTRIELLES.some(p =>
        p.length === numeros.length && p.every((v, i) => v === numeros[i])
      );
    }
    return false;
  }

  /**
   * Retourne la période officielle CDC attendue pour ce mois de début et cette periodicite.
   * Ex : mois 2 + bimensuel → "Janv – Fév"
   */
  periodeAttendue(periode: PeriodeVersementDto, pr: SuiviVersementProprieteDto): string {
    if (!periode.moisConcernes?.length) return '';
    const premier = this.moisVersNumero(periode.moisConcernes[0]);
    const periodicite = pr.periodicite?.toLowerCase();
    const MOIS = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'];

    if (periodicite === 'bimensuel') {
      const grp = this.PERIODES_BIMENSUELLES.find(p => p.includes(premier));
      if (grp) return grp.map(n => MOIS[n - 1]).join(' – ');
    }
    if (periodicite === 'trimestriel') {
      const grp = this.PERIODES_TRIMESTRIELLES.find(p => p.includes(premier));
      if (grp) return grp.map(n => MOIS[n - 1]).join(' – ');
    }
    return '';
  }

  private moisVersNumero(mois: string): number {
    const m = mois.toLowerCase().trim();
    // Format "2026-01" ou "01-2026"
    const isoMatch = m.match(/^(\d{4})-(\d{2})$/) || m.match(/^(\d{2})-(\d{4})$/);
    if (isoMatch) return parseInt(isoMatch[2] || isoMatch[1], 10);
    // Format texte français
    const noms: Record<string, number> = {
      janvier:1, février:2, fevrier:2, mars:3, avril:4, mai:5, juin:6,
      juillet:7, août:8, aout:8, septembre:9, octobre:10, novembre:11, décembre:12, decembre:12
    };
    for (const [nom, num] of Object.entries(noms)) {
      if (m.includes(nom)) return num;
    }
    return 0;
  }

  private moisVersAnnee(mois: string): string {
    const match = mois.match(/\d{4}/);
    return match ? match[0] : '';
  }

  // FIX 1 : colonne Reporté masquée si aucune période n'a de report
  aDesReports(pr: SuiviVersementProprieteDto): boolean {
    return pr.periodes.some(p => p.montantReporte > 0);
  }

  // FIX 2 : insensible à la casse + trim pour éviter les faux négatifs
  lignesParStatut(
    lignes: LigneProduitVersementDto[],
    statut: string
  ): LigneProduitVersementDto[] {
    return lignes.filter(l =>
      (l.statutProduit ?? '').trim().toLowerCase() === statut.toLowerCase()
    );
  }

  selectPeriode(
    periode: PeriodeVersementDto,
    proprietaire: SuiviVersementProprietaireDto,
    propriete: SuiviVersementProprieteDto
  ) {
    // Toggle : refermer si déjà sélectionné
    if (this.selectedPeriode?.periodeId === periode.periodeId
        && this.selectedPropriete?.proprieteId === propriete.proprieteId) {
      this.selectedPeriode = null;
      return;
    }
    this.selectedPeriode      = periode;
    this.selectedProprietaire = proprietaire;
    this.selectedPropriete    = propriete;
    this.refPaiement          = '';
    this.motifDerogation      = '';
  }

  openEnvoi(periode: PeriodeVersementDto, proprietaire: SuiviVersementProprietaireDto) {
    this.modalPeriode      = periode;
    this.modalProprietaire = proprietaire;
    this.showEnvoiModal    = true;
  }

  // ── Marquer versé ────────────────────────────────────────────────────
  marquerEffectue() {
    if (!this.selectedPeriode || this.saving) return;
    if (!this.refPaiement.trim()) {
      this.showToast('⚠️ Veuillez saisir une référence de paiement.', 'err');
      return;
    }

    this.saving = true;

    const doEffectuer = (versementId: string) => {
      this.svc.marquerEffectue(versementId, this.refPaiement.trim()).subscribe({
        next: () => {
          this.selectedPeriode  = null;
          this.refPaiement      = '';
          this.saving           = false;
          this.load();
          this.showToast('✅ Versement marqué comme effectué.', 'ok');
        },
        error: (e: any) => {
          this.saving = false;
          this.showToast('❌ ' + (e?.error?.message ?? 'Erreur ' + e?.status), 'err');
        }
      });
    };

    if (this.selectedPeriode.versementId) {
      doEffectuer(this.selectedPeriode.versementId);
    } else if (this.selectedPropriete?.contratGestionId) {
      // Créer le versement en base puis le marquer effectué
      const periode   = this.selectedPeriode.moisConcernes[0];
      const datePrevue = this.selectedPeriode.datePrevue;
      this.svc.preparer(this.selectedPropriete.contratGestionId, periode, datePrevue).subscribe({
        next:  (id: string) => doEffectuer(id),
        error: (e: any) => {
          this.saving = false;
          this.showToast('❌ ' + (e?.error?.message ?? 'Erreur ' + e?.status), 'err');
        }
      });
    } else {
      this.saving = false;
      this.showToast('❌ Impossible de déterminer le contrat de gestion.', 'err');
    }
  }

  // ── Dérogation ───────────────────────────────────────────────────────
  accorderDerogation() {
    if (!this.selectedPeriode || !this.motifDerogation.trim() || this.saving) return;
    if (!this.selectedPeriode.versementId) {
      this.showToast("⚠️ Ce versement n'a pas encore été préparé.", 'err');
      return;
    }
    this.saving = true;
    this.svc.accorderDerogation(this.selectedPeriode.versementId, this.motifDerogation.trim()).subscribe({
      next: () => {
        this.selectedPeriode  = null;
        this.motifDerogation  = '';
        this.saving           = false;
        this.load();
        this.showToast('✅ Dérogation accordée.', 'ok');
      },
      error: (e: any) => {
        this.saving = false;
        this.showToast('❌ ' + (e?.error?.message ?? 'Erreur ' + e?.status), 'err');
      }
    });
  }

  // ── Envoi bordereau (depuis panneau) ─────────────────────────────────
  envoyer(canal: 'email' | 'whatsapp' | 'sms') {
    if (!this.selectedPeriode || this.saving) return;
    if (!this.selectedPeriode.versementId) {
      this.showToast('⚠️ Versement non préparé.', 'err');
      return;
    }
    this.saving = true;
    this.svc.envoyerBordereau(this.selectedPeriode.versementId, canal).subscribe({
      next:  () => { this.saving = false; this.showToast(`✅ Bordereau envoyé par ${canal}.`, 'ok'); },
      error: () => { this.saving = false; this.showToast("❌ Erreur lors de l'envoi.", 'err'); }
    });
  }

  // ── Envoi bordereau (depuis modal rapide) ────────────────────────────
  envoyerModal(canal: 'email' | 'whatsapp' | 'sms') {
    if (!this.modalPeriode || this.saving) return;
    if (!this.modalPeriode.versementId) {
      this.showToast('⚠️ Versement non préparé.', 'err');
      return;
    }
    this.showEnvoiModal = false;
    this.saving = true;
    this.svc.envoyerBordereau(this.modalPeriode.versementId, canal).subscribe({
      next:  () => { this.saving = false; this.showToast(`✅ Bordereau envoyé par ${canal}.`, 'ok'); },
      error: () => { this.saving = false; this.showToast("❌ Erreur lors de l'envoi.", 'err'); }
    });
  }

  exportPdf()   { this.showToast('📄 Export PDF — à brancher sur le backend', 'ok'); }
  exportExcel() { this.showToast('📊 Export Excel — à brancher sur le backend', 'ok'); }

  // ── Couleur avatar déterministe ───────────────────────────────────────
  avatarColor(nom: string): string {
    const idx = nom.charCodeAt(0) % this.AVATAR_COLORS.length;
    return this.AVATAR_COLORS[idx];
  }

  // ── Modal notification propriétaire ──────────────────────────────────
  notifModalConfig: NotificationModalConfig | null = null;

  openNotifProprietaire(p: SuiviVersementProprietaireDto, versementId?: string): void {
    this.notifModalConfig = {
      id:               versementId ?? p.proprietaireId,
      typeDestinataire: 'Proprietaire',
      nomDestinataire:  p.proprietaireNom,
      telephone:        p.proprietaireTel,
      type:             'BordereauVersement',
      canauxDefaut:     ['sms'],
      parametres: {
        nom:    p.proprietaireNom,
        montant: p.totalNetGlobal?.toString() ?? '0',
      },
    };
  }

  onNotifProprietaireClose(result: any): void {
    this.notifModalConfig = null;
    if (result.envoye) {
      const lbl: Record<string, string> = { email: 'Email', whatsapp: 'WhatsApp', sms: 'SMS' };
      this.showToast(
        '✅ Notification envoyée via ' + (result.canaux?.map((c: string) => lbl[c] || c).join(' + ')),
        'ok'
      );
    }
  }

  // ── Toast ─────────────────────────────────────────────────────────────
  toastMsg     = '';
  toastType    = '';
  toastVisible = false;
  private _toastTimer: ReturnType<typeof setTimeout> | undefined;

  private showToast(msg: string, type: 'ok' | 'err') {
    this.toastMsg     = msg;
    this.toastType    = type;
    this.toastVisible = true;
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => this.toastVisible = false, 4500);
  }

  // ── Fallback si API inaccessible ──────────────────────────────────────
  private buildFallback(): SuiviVersementsGlobalDto {
    return {
      totalBrutGlobal: 0, totalNetGlobal: 0, totalCommissionGlobal: 0,
      nbProprietaires: 0, nbPeriodesTotalEnRetard: 0, nbPeriodesTotalAVenir: 0,
      proprietaires: []
    };
  }
}