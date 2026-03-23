// ══════════════════════════════════════════════════════════════════════════════
//  COMPTE DE RÉSULTAT AGENCE
//  Suivi des entrées nettes : commissions gestion + frais travaux + charges
//  Source : GET /agence/tableau-bord?mois=YYYY-MM  (TableauBordAgenceDto)
// ══════════════════════════════════════════════════════════════════════════════

import {
  Component, inject, OnInit, signal, computed, ChangeDetectionStrategy
} from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { catchError, of, forkJoin } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  TableauBordAgenceDto,
  CommissionContratAgenceDto,
  FraisAgenceDto,
  CreanceProprietaireDto,
} from '../../core/models/models';

// ── Interface historique pour le mini-graphe ──────────────────────────────────
interface PointHistorique {
  label:    string;
  revenus:  number;
  charges:  number;
  net:      number;
}

@Component({
  selector: 'kdi-compte-resultat-agence',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, DecimalPipe],
  template: `
<div class="cra-root page-enter">

  <!-- ══ HEADER ══ -->
  <div class="page-header">
    <div>
      <div class="page-eyebrow">Finance · Comptabilité</div>
      <div class="page-title"><span class="mi">bar_chart</span> Compte de résultat</div>
      <div class="page-subtitle">Commissions gestion · Frais travaux · Charges · Résultat net agence</div>
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
      <button class="btn btn-gold" (click)="exportPdf()">
        <span class="mi">picture_as_pdf</span> PDF
      </button>
    </div>
  </div>

  <!-- ══ CHARGEMENT ══ -->
  <div *ngIf="loading()" class="cra-loading">
    <div class="cra-spinner"></div> Chargement du compte de résultat…
  </div>

  <ng-container *ngIf="!loading() && data()">

    <!-- ══ HERO SOLDE ══ -->
    <div class="cra-hero">
      <div class="cra-hero-item">
        <div class="cra-hero-lbl">Loyers collectés</div>
        <div class="cra-hero-val cra-gold">{{ data()!.loyersCollectesMois | number:'1.0-0' }} <span class="cra-unit">MRU</span></div>
        <div class="cra-hero-sub">{{ data()!.nbContratsActifs }} contrats actifs</div>
      </div>
      <div class="cra-hero-sep"></div>
      <div class="cra-hero-item">
        <div class="cra-hero-lbl">Total revenus agence</div>
        <div class="cra-hero-val cra-gold">{{ totalRevenus() | number:'1.0-0' }} <span class="cra-unit">MRU</span></div>
        <div class="cra-hero-badge"
             [class.pos]="totalRevenus() > 0"
             [class.neg]="totalRevenus() === 0">
          Commissions + travaux
        </div>
      </div>
      <div class="cra-hero-sep"></div>
      <div class="cra-hero-item">
        <div class="cra-hero-lbl">Total charges</div>
        <div class="cra-hero-val cra-red">{{ totalCharges() | number:'1.0-0' }} <span class="cra-unit">MRU</span></div>
        <div class="cra-hero-sub">Salaires + frais fixes</div>
      </div>
      <div class="cra-hero-sep"></div>
      <div class="cra-hero-item">
        <div class="cra-hero-lbl">Résultat net</div>
        <div class="cra-hero-val" [class.cra-green]="resultatNet() >= 0" [class.cra-red]="resultatNet() < 0">
          {{ resultatNet() >= 0 ? '+' : '' }}{{ resultatNet() | number:'1.0-0' }} <span class="cra-unit">MRU</span>
        </div>
        <div class="cra-hero-badge" [class.pos]="resultatNet() >= 0" [class.neg]="resultatNet() < 0">
          {{ resultatNet() >= 0 ? '✓ Bénéficiaire' : '⚠ Déficitaire' }}
          · Marge {{ margeNette() | number:'1.0-0' }}%
        </div>
      </div>
    </div>

    <!-- ══ QUICK STATS ══ -->
    <div class="cra-qs-grid">
      <div class="cra-qs cra-qs-gold">
        <div class="cra-qs-ico">🏢</div>
        <div class="cra-qs-lbl">Commissions gestion</div>
        <div class="cra-qs-val">{{ data()!.commissionsNettesMois | number:'1.0-0' }} <span class="cra-unit">MRU</span></div>
        <div class="cra-qs-sub">
          Brut {{ data()!.commissionsbrutesMois | number:'1.0-0' }} −
          Frais {{ data()!.fraisGestionMois | number:'1.0-0' }} MRU
        </div>
      </div>
      <div class="cra-qs cra-qs-violet">
        <div class="cra-qs-ico">🔧</div>
        <div class="cra-qs-lbl">Frais travaux / chantiers</div>
        <div class="cra-qs-val">{{ fraisTravaux() | number:'1.0-0' }} <span class="cra-unit">MRU</span></div>
        <div class="cra-qs-sub">Retenues agence sur chantiers</div>
      </div>
      <div class="cra-qs cra-qs-red">
        <div class="cra-qs-ico">📤</div>
        <div class="cra-qs-lbl">Charges totales</div>
        <div class="cra-qs-val">{{ totalCharges() | number:'1.0-0' }} <span class="cra-unit">MRU</span></div>
        <div class="cra-qs-sub">
          Salaires {{ data()!.chargesSalaires | number:'1.0-0' }} +
          Frais {{ data()!.chargesFrais | number:'1.0-0' }} MRU
        </div>
      </div>
      <div class="cra-qs" [class.cra-qs-green]="resultatNet() >= 0" [class.cra-qs-red2]="resultatNet() < 0">
        <div class="cra-qs-ico">{{ resultatNet() >= 0 ? '💰' : '⚠️' }}</div>
        <div class="cra-qs-lbl">Résultat net</div>
        <div class="cra-qs-val" [class.green]="resultatNet() >= 0" [class.red]="resultatNet() < 0">
          {{ resultatNet() | number:'1.0-0' }} <span class="cra-unit">MRU</span>
        </div>
        <div class="cra-qs-sub">Marge {{ margeNette() | number:'1.0-0' }}% · {{ moisLabel() }}</div>
      </div>
    </div>

    <!-- ══ 3 SOURCES DE REVENUS ══ -->
    <div class="cra-sources-grid">

      <!-- Commissions de gestion -->
      <div class="cra-card cra-card-gold">
        <div class="cra-card-head">
          <div class="cra-card-title-wrap">
            <div class="cra-card-ico cra-ico-gold">🏢</div>
            <div>
              <div class="cra-card-title">Commissions de gestion</div>
              <div class="cra-card-sub">{{ data()!.nbContratsActifs }} contrats · taux moy. {{ data()!.tauxCommissionMoyen | number:'1.0-1' }}%</div>
            </div>
          </div>
          <div class="cra-card-total cra-gold-txt">{{ data()!.commissionsNettesMois | number:'1.0-0' }} MRU</div>
        </div>
        <div class="cra-card-body">
          <div class="cra-detail-line" *ngFor="let c of topCommissions()">
            <div class="cra-dl-left">
              <div class="cra-dot cra-dot-gold"></div>
              <div class="cra-dl-label">
                <strong>{{ c.proprietaireNom }}</strong> — {{ c.proprieteLibelle }}
              </div>
            </div>
            <div class="cra-bar-wrap">
              <div class="cra-bar cra-bar-gold"
                   [style.width.%]="barPct(c.commissionNette, maxCommission())"></div>
            </div>
            <span class="cra-tag">{{ (c.tauxCommission * 100) | number:'1.0-0' }}%</span>
            <div class="cra-dl-amount cra-green-txt">{{ c.commissionNette | number:'1.0-0' }} MRU</div>
          </div>
          <div class="cra-detail-line cra-detail-more"
               *ngIf="data()!.commissionsParContrat.length > 4">
            <div class="cra-dl-left" style="color:var(--cra-slate)">
              + {{ data()!.commissionsParContrat.length - 4 }} autre(s) contrat(s)
            </div>
            <div class="cra-dl-amount">
              {{ autresCommissions() | number:'1.0-0' }} MRU
            </div>
          </div>
          <!-- Détail brut / frais -->
          <div class="cra-card-footer">
            <span class="cra-footer-item">
              Brut <strong>{{ data()!.commissionsbrutesMois | number:'1.0-0' }}</strong> MRU
            </span>
            <span class="cra-footer-sep">−</span>
            <span class="cra-footer-item cra-red-txt">
              Frais imputés <strong>{{ data()!.fraisGestionMois | number:'1.0-0' }}</strong> MRU
            </span>
            <span class="cra-footer-sep">=</span>
            <span class="cra-footer-item cra-gold-txt">
              Net <strong>{{ data()!.commissionsNettesMois | number:'1.0-0' }}</strong> MRU
            </span>
          </div>
        </div>
      </div>

      <!-- Frais travaux -->
      <div class="cra-card cra-card-violet">
        <div class="cra-card-head">
          <div class="cra-card-title-wrap">
            <div class="cra-card-ico cra-ico-violet">🔧</div>
            <div>
              <div class="cra-card-title">Frais travaux & chantiers</div>
              <div class="cra-card-sub">Retenues agence sur budgets chantiers</div>
            </div>
          </div>
          <div class="cra-card-total cra-violet-txt">{{ fraisTravaux() | number:'1.0-0' }} MRU</div>
        </div>
        <div class="cra-card-body">
          <div *ngIf="data()!.fraisAgence.length === 0" class="cra-empty-source">
            <div class="cra-empty-ico">🔧</div>
            <div>Aucun chantier facturé ce mois</div>
          </div>
          <ng-container *ngFor="let f of fraisChantiers()">
            <div class="cra-detail-line">
              <div class="cra-dl-left">
                <div class="cra-dot cra-dot-violet"></div>
                <div class="cra-dl-label">
                  <strong>{{ f.libelle }}</strong>
                  <span class="cra-dl-cat"> · {{ f.categorie }}</span>
                </div>
              </div>
              <span class="cra-tag" [class.cra-tag-ok]="f.statut==='Paye'"
                    [class.cra-tag-warn]="f.statut==='EnAttente'"
                    [class.cra-tag-err]="f.statut==='Impaye'">
                {{ f.statut === 'Paye' ? 'Payé' : f.statut === 'EnAttente' ? 'En attente' : 'Impayé' }}
              </span>
              <div class="cra-dl-amount" [class.cra-green-txt]="f.statut==='Paye'"
                   [class.cra-slate-txt]="f.statut!=='Paye'">
                {{ f.montant | number:'1.0-0' }} MRU
              </div>
            </div>
          </ng-container>
          <div *ngIf="fraisChantiers().length === 0 && data()!.fraisAgence.length > 0" class="cra-empty-source">
            <div>Aucun frais travaux identifié</div>
          </div>
          <div class="cra-card-footer" *ngIf="fraisTravaux() > 0">
            <span class="cra-footer-item">{{ fraisChantiers().length }} chantier(s) ce mois</span>
            <span class="cra-footer-sep">·</span>
            <span class="cra-footer-item cra-violet-txt">
              Total <strong>{{ fraisTravaux() | number:'1.0-0' }}</strong> MRU
            </span>
          </div>
        </div>
      </div>

      <!-- Autres produits -->
      <div class="cra-card cra-card-blue">
        <div class="cra-card-head">
          <div class="cra-card-title-wrap">
            <div class="cra-card-ico cra-ico-blue">💼</div>
            <div>
              <div class="cra-card-title">Autres produits agence</div>
              <div class="cra-card-sub">Frais de dossier · Pénalités · Divers</div>
            </div>
          </div>
          <div class="cra-card-total cra-blue-txt">{{ autresProduits() | number:'1.0-0' }} MRU</div>
        </div>
        <div class="cra-card-body">
          <ng-container *ngFor="let f of fraisAutres()">
            <div class="cra-detail-line">
              <div class="cra-dl-left">
                <div class="cra-dot cra-dot-blue"></div>
                <div class="cra-dl-label"><strong>{{ f.libelle }}</strong></div>
              </div>
              <span class="cra-tag cra-tag-taux">{{ f.categorie }}</span>
              <div class="cra-dl-amount cra-blue-txt">{{ f.montant | number:'1.0-0' }} MRU</div>
            </div>
          </ng-container>
          <div class="cra-empty-source" *ngIf="fraisAutres().length === 0">
            <div class="cra-empty-ico">📭</div>
            <div>Aucun autre produit ce mois</div>
          </div>
        </div>
      </div>

    </div>

    <!-- ══ COMPTE DE RÉSULTAT TABLE ══ -->
    <div class="cra-card cra-card-table">
      <div class="cra-card-head">
        <div class="cra-card-title-wrap">
          <div class="cra-card-ico cra-ico-green">📋</div>
          <div>
            <div class="cra-card-title">Compte de résultat — {{ moisLabel() }}</div>
            <div class="cra-card-sub">Synthèse comptable · Produits / Charges / Résultat</div>
          </div>
        </div>
        <span class="cra-result-badge" [class.pos]="resultatNet() >= 0" [class.neg]="resultatNet() < 0">
          {{ resultatNet() >= 0 ? '✓ Bénéficiaire' : '⚠ Déficitaire' }}
        </span>
      </div>

      <div class="cra-table-wrap">
        <table class="cra-table">
          <thead>
            <tr>
              <th class="cra-th-wide">Poste</th>
              <th class="r">Montant MRU</th>
              <th class="r">% revenus</th>
              <th>Statut</th>
            </tr>
          </thead>
          <tbody>

            <!-- PRODUITS -->
            <tr class="cra-sec-head">
              <td colspan="4">📥 PRODUITS — Revenus de l'agence</td>
            </tr>
            <tr>
              <td><span class="cra-row-ico">🏢</span> Commissions de gestion locative</td>
              <td class="r cra-green-txt">{{ data()!.commissionsNettesMois | number:'1.0-0' }}</td>
              <td class="r cra-slate-txt">{{ pctRevenus(data()!.commissionsNettesMois) | number:'1.0-0' }}%</td>
              <td><span class="cra-tag cra-tag-ok">Encaissé</span></td>
            </tr>
            <tr class="cra-sub-row">
              <td class="cra-sub-label">└ Commissions brutes sur loyers</td>
              <td class="r cra-slate-txt">{{ data()!.commissionsbrutesMois | number:'1.0-0' }}</td>
              <td class="r"></td><td></td>
            </tr>
            <tr class="cra-sub-row">
              <td class="cra-sub-label">└ − Frais imputés sur commissions</td>
              <td class="r cra-red-txt">−{{ data()!.fraisGestionMois | number:'1.0-0' }}</td>
              <td class="r"></td><td></td>
            </tr>
            <tr>
              <td><span class="cra-row-ico">🔧</span> Frais de gestion travaux & chantiers</td>
              <td class="r cra-green-txt">{{ fraisTravaux() | number:'1.0-0' }}</td>
              <td class="r cra-slate-txt">{{ pctRevenus(fraisTravaux()) | number:'1.0-0' }}%</td>
              <td><span class="cra-tag cra-tag-ok">Encaissé</span></td>
            </tr>
            <tr>
              <td><span class="cra-row-ico">💼</span> Autres produits agence</td>
              <td class="r cra-slate-txt">{{ autresProduits() | number:'1.0-0' }}</td>
              <td class="r cra-slate-txt">{{ pctRevenus(autresProduits()) | number:'1.0-0' }}%</td>
              <td><span class="cra-tag cra-tag-neant">Néant</span></td>
            </tr>
            <tr class="cra-subtotal-row">
              <td><strong>Total des produits</strong></td>
              <td class="r cra-green-txt">{{ totalRevenus() | number:'1.0-0' }}</td>
              <td class="r cra-slate-txt">100%</td>
              <td></td>
            </tr>

            <!-- CHARGES -->
            <tr class="cra-sec-head">
              <td colspan="4">📤 CHARGES — Dépenses de fonctionnement</td>
            </tr>
            <tr>
              <td><span class="cra-row-ico">👥</span> Charges salariales</td>
              <td class="r cra-red-txt">−{{ data()!.chargesSalaires | number:'1.0-0' }}</td>
              <td class="r cra-slate-txt">{{ pctRevenus(data()!.chargesSalaires) | number:'1.0-0' }}%</td>
              <td>
                <span class="cra-tag"
                      [class.cra-tag-ok]="salairesOk()"
                      [class.cra-tag-warn]="!salairesOk()">
                  {{ salairesLabel() }}
                </span>
              </td>
            </tr>
            <tr>
              <td><span class="cra-row-ico">🏦</span> Frais fixes agence</td>
              <td class="r cra-red-txt">−{{ data()!.chargesFrais | number:'1.0-0' }}</td>
              <td class="r cra-slate-txt">{{ pctRevenus(data()!.chargesFrais) | number:'1.0-0' }}%</td>
              <td>
                <span class="cra-tag"
                      [class.cra-tag-ok]="fraisImpayes() === 0"
                      [class.cra-tag-warn]="fraisImpayes() > 0">
                  {{ fraisImpayes() === 0 ? 'Payé' : fraisImpayes() + ' impayé(s)' }}
                </span>
              </td>
            </tr>
            <tr *ngIf="totalCreances() > 0">
              <td><span class="cra-row-ico">📋</span> Créances propriétaires</td>
              <td class="r cra-red-txt">−{{ totalCreances() | number:'1.0-0' }}</td>
              <td class="r cra-slate-txt">{{ pctRevenus(totalCreances()) | number:'1.0-0' }}%</td>
              <td><span class="cra-tag cra-tag-warn">En cours</span></td>
            </tr>
            <tr class="cra-subtotal-row cra-subtotal-neg">
              <td><strong>Total des charges</strong></td>
              <td class="r cra-red-txt">−{{ totalCharges() | number:'1.0-0' }}</td>
              <td class="r cra-slate-txt">{{ pctRevenus(totalCharges()) | number:'1.0-0' }}%</td>
              <td></td>
            </tr>

            <!-- RÉSULTAT -->
            <tr class="cra-total-row">
              <td><strong>💰 Résultat net de l'agence</strong></td>
              <td class="r">{{ resultatNet() >= 0 ? '+' : '' }}{{ resultatNet() | number:'1.0-0' }}</td>
              <td class="r" style="color:rgba(255,255,255,.4);font-size:11px">Marge {{ margeNette() | number:'1.0-0' }}%</td>
              <td>
                <span class="cra-tag"
                      [style.background]="resultatNet() >= 0 ? 'rgba(74,222,128,.2)' : 'rgba(248,113,113,.2)'"
                      [style.color]="resultatNet() >= 0 ? '#4ade80' : '#f87171'">
                  {{ resultatNet() >= 0 ? '✓ Bénéfice' : '⚠ Perte' }}
                </span>
              </td>
            </tr>

          </tbody>
        </table>
      </div>
    </div>

    <!-- ══ GRAPHE ÉVOLUTION + RÉPARTITION ══ -->
    <div class="cra-bottom-grid">

      <!-- Évolution 6 mois -->
      <div class="cra-card cra-card-gold">
        <div class="cra-card-head">
          <div class="cra-card-title-wrap">
            <div class="cra-card-ico cra-ico-gold">📈</div>
            <div>
              <div class="cra-card-title">Évolution sur 6 mois</div>
              <div class="cra-card-sub">Revenus · Charges · Résultat net</div>
            </div>
          </div>
        </div>
        <div class="cra-chart-wrap">
          <div class="cra-chart-bars">
            <div class="cra-chart-col" *ngFor="let pt of historique(); let i = index">
              <div class="cra-bars-group">
                <div class="cra-bar-hist cra-bar-rev"
                     [style.height.%]="barPctHist(pt.revenus)"
                     [title]="pt.revenus + ' MRU'"></div>
                <div class="cra-bar-hist cra-bar-chg"
                     [style.height.%]="barPctHist(pt.charges)"
                     [title]="pt.charges + ' MRU'"></div>
                <div class="cra-bar-hist cra-bar-net"
                     [style.height.%]="barPctHist(pt.net)"
                     [title]="pt.net + ' MRU'"></div>
              </div>
              <div class="cra-chart-lbl">{{ pt.label }}</div>
            </div>
          </div>
          <div class="cra-chart-legend">
            <div class="cra-leg"><div class="cra-leg-dot" style="background:#c9a84c"></div>Revenus</div>
            <div class="cra-leg"><div class="cra-leg-dot" style="background:#f87171"></div>Charges</div>
            <div class="cra-leg"><div class="cra-leg-dot" style="background:#4ade80"></div>Résultat net</div>
          </div>
        </div>
      </div>

      <!-- Répartition revenus -->
      <div class="cra-card cra-card-violet">
        <div class="cra-card-head">
          <div class="cra-card-title-wrap">
            <div class="cra-card-ico cra-ico-violet">🥧</div>
            <div>
              <div class="cra-card-title">Répartition des revenus</div>
              <div class="cra-card-sub">Par source · {{ moisLabel() }}</div>
            </div>
          </div>
        </div>
        <div class="cra-repartition-body">
          <!-- Barre empilée -->
          <div class="cra-stacked-bar">
            <div class="cra-stacked-seg cra-seg-gold"
                 [style.width.%]="pctRevenus(data()!.commissionsNettesMois)"
                 [title]="'Commissions ' + (data()!.commissionsNettesMois | number:'1.0-0') + ' MRU'">
              <span *ngIf="pctRevenus(data()!.commissionsNettesMois) > 15">
                {{ pctRevenus(data()!.commissionsNettesMois) | number:'1.0-0' }}%
              </span>
            </div>
            <div class="cra-stacked-seg cra-seg-violet"
                 [style.width.%]="pctRevenus(fraisTravaux())"
                 [title]="'Travaux ' + (fraisTravaux() | number:'1.0-0') + ' MRU'">
              <span *ngIf="pctRevenus(fraisTravaux()) > 10">
                {{ pctRevenus(fraisTravaux()) | number:'1.0-0' }}%
              </span>
            </div>
            <div class="cra-stacked-seg cra-seg-blue"
                 [style.width.%]="pctRevenus(autresProduits())"
                 *ngIf="autresProduits() > 0">
              <span *ngIf="pctRevenus(autresProduits()) > 10">
                {{ pctRevenus(autresProduits()) | number:'1.0-0' }}%
              </span>
            </div>
          </div>
          <!-- Lignes détail -->
          <div class="cra-detail-line">
            <div class="cra-dl-left"><div class="cra-dot cra-dot-gold"></div>
              <div class="cra-dl-label">Commissions gestion locative</div></div>
            <div class="cra-dl-amount cra-gold-txt">{{ data()!.commissionsNettesMois | number:'1.0-0' }} MRU</div>
          </div>
          <div class="cra-detail-line">
            <div class="cra-dl-left"><div class="cra-dot cra-dot-violet"></div>
              <div class="cra-dl-label">Frais gestion travaux</div></div>
            <div class="cra-dl-amount cra-violet-txt">{{ fraisTravaux() | number:'1.0-0' }} MRU</div>
          </div>
          <div class="cra-detail-line">
            <div class="cra-dl-left"><div class="cra-dot" style="background:#e2e8f0"></div>
              <div class="cra-dl-label">Autres produits</div></div>
            <div class="cra-dl-amount cra-slate-txt">{{ autresProduits() | number:'1.0-0' }} MRU</div>
          </div>
          <div class="cra-repartition-total">
            <span>Total revenus</span>
            <span class="cra-total-val">{{ totalRevenus() | number:'1.0-0' }} MRU</span>
          </div>
        </div>
      </div>

    </div>

  </ng-container>

  <!-- Toast -->
  <div class="cra-toast" [class.visible]="toastVisible" [class.ok]="toastType==='ok'" [class.err]="toastType==='err'">
    {{ toastMsg }}
  </div>

</div>
  `,
  styles: [`
    /* ── Variables ── */
    .cra-root {
      --cra-navy:   #0b1829;
      --cra-navy2:  #132238;
      --cra-gold:   #c9a84c;
      --cra-gold2:  #e8c97a;
      --cra-gold-bg:#fdf8ec;
      --cra-green:  #16a34a;
      --cra-green-bg:#f0fdf4;
      --cra-red:    #dc2626;
      --cra-red-bg: #fef2f2;
      --cra-blue:   #2563eb;
      --cra-blue-bg:#eff6ff;
      --cra-violet: #7c3aed;
      --cra-violet-bg:#f5f3ff;
      --cra-slate:  #64748b;
      --cra-border: #e8edf5;
      --cra-bg:     #f4f6fa;
      --cra-white:  #fff;
      --cra-text:   #0f172a;
      --cra-r:      10px;
      --cra-shadow: 0 2px 12px rgba(11,24,41,.08);
    }

    /* ── Header ── */
    .page-header { display:flex; align-items:flex-start; justify-content:space-between; margin-bottom:24px; }
    .page-eyebrow { font-size:11px; font-weight:600; color:var(--cra-gold); text-transform:uppercase; letter-spacing:.8px; margin-bottom:3px; }
    .page-title { font-size:24px; font-weight:800; color:var(--cra-navy); display:flex; align-items:center; gap:8px; }
    .page-subtitle { font-size:13px; color:var(--cra-slate); margin-top:3px; }
    .cra-header-actions { display:flex; align-items:center; gap:8px; flex-wrap:wrap; }
    .cra-sel-mois { padding:7px 12px; border:1px solid var(--cra-border); border-radius:8px; font-size:13px; background:var(--cra-white); color:var(--cra-navy); font-family:inherit; outline:none; cursor:pointer; }
    .cra-view-toggle { display:flex; border:1px solid var(--cra-border); border-radius:8px; overflow:hidden; background:var(--cra-white); }
    .cra-view-toggle button { padding:7px 12px; border:none; background:none; cursor:pointer; font-size:12px; font-weight:500; color:var(--cra-slate); font-family:inherit; transition:all .15s; }
    .cra-view-toggle button.on { background:var(--cra-navy); color:#fff; }

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
    .cra-qs-red::after    { background:var(--cra-red); }
    .cra-qs-green::after  { background:var(--cra-green); }
    .cra-qs-red2::after   { background:var(--cra-red); }
    .cra-qs-ico  { font-size:20px; margin-bottom:5px; }
    .cra-qs-lbl  { font-size:10px; font-weight:600; color:var(--cra-slate); text-transform:uppercase; letter-spacing:.5px; }
    .cra-qs-val  { font-family:monospace; font-size:20px; font-weight:700; color:var(--cra-navy); margin:3px 0; }
    .cra-qs-val .cra-unit { font-size:11px; color:var(--cra-slate); font-family:inherit; font-weight:400; }
    .cra-qs-val.green { color:var(--cra-green); }
    .cra-qs-val.red   { color:var(--cra-red); }
    .cra-qs-sub  { font-size:11px; color:var(--cra-slate); }

    /* ── Sources grid ── */
    .cra-sources-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:16px; margin-bottom:20px; }

    /* ── Card ── */
    .cra-card { background:var(--cra-white); border:1px solid var(--cra-border); border-radius:var(--cra-r); box-shadow:var(--cra-shadow); overflow:hidden; margin-bottom:0; }
    .cra-card-table { margin-bottom:20px; }
    .cra-card-gold   { border-top:3px solid var(--cra-gold); }
    .cra-card-violet { border-top:3px solid var(--cra-violet); }
    .cra-card-blue   { border-top:3px solid var(--cra-blue); }
    .cra-card-table  { border-top:3px solid var(--cra-green); }
    .cra-card-head { padding:14px 18px; border-bottom:1px solid var(--cra-border); display:flex; align-items:center; justify-content:space-between; }
    .cra-card-title-wrap { display:flex; align-items:center; gap:10px; }
    .cra-card-ico { width:34px; height:34px; border-radius:8px; display:flex; align-items:center; justify-content:center; font-size:16px; flex-shrink:0; }
    .cra-ico-gold   { background:var(--cra-gold-bg); }
    .cra-ico-violet { background:var(--cra-violet-bg); }
    .cra-ico-blue   { background:var(--cra-blue-bg); }
    .cra-ico-green  { background:var(--cra-green-bg); }
    .cra-card-title { font-size:13px; font-weight:600; color:var(--cra-navy); }
    .cra-card-sub   { font-size:11px; color:var(--cra-slate); margin-top:1px; }
    .cra-card-total { font-family:monospace; font-size:16px; font-weight:700; white-space:nowrap; }
    .cra-card-body  { padding:14px 18px; }

    /* ── Lignes détail ── */
    .cra-detail-line { display:flex; align-items:center; justify-content:space-between; padding:7px 0; border-bottom:1px solid #f8fafc; gap:8px; }
    .cra-detail-line:last-child { border-bottom:none; }
    .cra-dl-left { display:flex; align-items:center; gap:7px; flex:1; min-width:0; }
    .cra-dot { width:6px; height:6px; border-radius:50%; flex-shrink:0; }
    .cra-dot-gold   { background:var(--cra-gold); }
    .cra-dot-violet { background:var(--cra-violet); }
    .cra-dot-blue   { background:var(--cra-blue); }
    .cra-dot-green  { background:var(--cra-green); }
    .cra-dl-label { font-size:12px; color:var(--cra-text); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
    .cra-dl-label strong { font-weight:500; color:var(--cra-navy); }
    .cra-dl-cat { color:var(--cra-slate); font-size:11px; }
    .cra-bar-wrap { flex:1; height:4px; background:#f1f5f9; border-radius:2px; min-width:40px; max-width:90px; }
    .cra-bar { height:100%; border-radius:2px; transition:width .4s ease; }
    .cra-bar-gold   { background:var(--cra-gold); }
    .cra-dl-amount { font-family:monospace; font-size:12px; font-weight:500; white-space:nowrap; }
    .cra-detail-more { opacity:.7; font-style:italic; }

    /* Tags */
    .cra-tag { font-size:10px; padding:2px 7px; border-radius:10px; font-weight:600; white-space:nowrap; flex-shrink:0; }
    .cra-tag-taux  { background:#f1f5f9; color:var(--cra-slate); }
    .cra-tag-ok    { background:var(--cra-green-bg); color:var(--cra-green); }
    .cra-tag-warn  { background:#fef9c3; color:#854d0e; }
    .cra-tag-err   { background:var(--cra-red-bg); color:var(--cra-red); }
    .cra-tag-neant { background:#f1f5f9; color:var(--cra-slate); }

    /* Footer card */
    .cra-card-footer { display:flex; align-items:center; gap:8px; flex-wrap:wrap; margin-top:12px; padding-top:10px; border-top:1px solid var(--cra-border); font-size:12px; }
    .cra-footer-item strong { font-family:monospace; }
    .cra-footer-sep { color:var(--cra-slate); }

    /* Empty */
    .cra-empty-source { display:flex; flex-direction:column; align-items:center; gap:6px; padding:32px 0; color:var(--cra-slate); font-size:13px; }
    .cra-empty-ico { font-size:28px; opacity:.3; }

    /* ── Table ── */
    .cra-table-wrap { overflow-x:auto; }
    .cra-table { width:100%; border-collapse:collapse; font-size:13px; }
    .cra-table thead tr { background:#f8fafc; }
    .cra-table th { padding:9px 14px; font-size:10px; font-weight:600; color:var(--cra-slate); text-transform:uppercase; letter-spacing:.4px; border-bottom:1px solid var(--cra-border); text-align:left; }
    .cra-table th.r { text-align:right; }
    .cra-th-wide { width:45%; }
    .cra-table td { padding:10px 14px; border-bottom:1px solid #f8fafc; vertical-align:middle; }
    .cra-table td.r { text-align:right; font-family:monospace; font-weight:500; }
    .cra-table tr:last-child td { border-bottom:none; }
    .cra-sec-head td { background:#f8fafc; font-size:11px; font-weight:600; color:var(--cra-slate); padding:6px 14px; border-top:1px solid var(--cra-border); border-bottom:1px solid var(--cra-border); }
    .cra-subtotal-row td { background:#f8fafc; font-weight:600; border-top:1px solid var(--cra-border); }
    .cra-subtotal-neg td.r { color:var(--cra-red); }
    .cra-total-row td { background:var(--cra-navy); color:#fff; font-weight:700; border-top:2px solid var(--cra-gold); }
    .cra-total-row td.r { font-family:monospace; font-size:16px; color:var(--cra-gold); }
    .cra-sub-row td { font-size:11px; color:var(--cra-slate); }
    .cra-sub-label { padding-left:32px !important; }
    .cra-row-ico { margin-right:4px; }
    .cra-result-badge { font-size:12px; padding:5px 12px; border-radius:20px; font-weight:600; }
    .cra-result-badge.pos { background:var(--cra-green-bg); color:var(--cra-green); }
    .cra-result-badge.neg { background:var(--cra-red-bg); color:var(--cra-red); }

    /* ── Bottom grid ── */
    .cra-bottom-grid { display:grid; grid-template-columns:1fr 1fr; gap:16px; margin-top:16px; }

    /* ── Chart ── */
    .cra-chart-wrap { padding:16px 18px; }
    .cra-chart-bars { display:flex; align-items:flex-end; gap:6px; height:90px; margin-bottom:10px; }
    .cra-chart-col { flex:1; display:flex; flex-direction:column; align-items:center; gap:4px; }
    .cra-bars-group { flex:1; width:100%; display:flex; align-items:flex-end; gap:2px; }
    .cra-bar-hist { flex:1; border-radius:3px 3px 0 0; min-height:2px; transition:height .5s ease; }
    .cra-bar-rev { background:var(--cra-gold); opacity:.8; }
    .cra-bar-chg { background:#f87171; opacity:.7; }
    .cra-bar-net { background:#4ade80; opacity:.85; }
    .cra-chart-lbl { font-size:9px; color:var(--cra-slate); white-space:nowrap; }
    .cra-chart-legend { display:flex; gap:12px; }
    .cra-leg { display:flex; align-items:center; gap:5px; font-size:11px; color:var(--cra-slate); }
    .cra-leg-dot { width:8px; height:8px; border-radius:2px; flex-shrink:0; }

    /* ── Répartition ── */
    .cra-repartition-body { padding:14px 18px; }
    .cra-stacked-bar { display:flex; height:16px; border-radius:8px; overflow:hidden; margin-bottom:14px; gap:2px; }
    .cra-stacked-seg { display:flex; align-items:center; justify-content:center; font-size:10px; font-weight:700; transition:width .4s ease; min-width:0; }
    .cra-seg-gold   { background:var(--cra-gold); color:var(--cra-navy); }
    .cra-seg-violet { background:var(--cra-violet); color:#fff; }
    .cra-seg-blue   { background:var(--cra-blue); color:#fff; }
    .cra-repartition-total { display:flex; justify-content:space-between; align-items:center; margin-top:10px; padding-top:10px; border-top:1px solid var(--cra-border); font-size:13px; }
    .cra-total-val { font-family:monospace; font-weight:700; font-size:15px; color:var(--cra-navy); }

    /* ── Colors helpers ── */
    .cra-gold-txt   { color:var(--cra-gold); }
    .cra-green-txt  { color:var(--cra-green); }
    .cra-red-txt    { color:var(--cra-red); }
    .cra-blue-txt   { color:var(--cra-blue); }
    .cra-violet-txt { color:var(--cra-violet); }
    .cra-slate-txt  { color:var(--cra-slate); }
    .r { text-align:right; }

    /* ── Loading ── */
    .cra-loading { display:flex; align-items:center; gap:10px; padding:60px; justify-content:center; color:var(--cra-slate); }
    .cra-spinner { width:20px; height:20px; border:2px solid var(--cra-border); border-top-color:var(--cra-navy); border-radius:50%; animation:spin .7s linear infinite; }
    @keyframes spin { to { transform:rotate(360deg); } }

    /* ── Toast ── */
    .cra-toast { position:fixed; bottom:28px; right:28px; z-index:9999; padding:13px 20px; border-radius:12px; font-size:14px; font-weight:600; box-shadow:0 8px 28px rgba(0,0,0,.15); max-width:380px; transform:translateY(80px); opacity:0; transition:transform .3s,opacity .3s; pointer-events:none; }
    .cra-toast.visible { transform:translateY(0); opacity:1; }
    .cra-toast.ok  { background:#d1fae5; color:#065f46; border:1px solid #6ee7b7; }
    .cra-toast.err { background:#fee2e2; color:#991b1b; border:1px solid #fca5a5; }
  `]
})
export class CompteResultatAgenceComponent implements OnInit {
  private http = inject(HttpClient);
  private base = environment.apiUrl;

  loading = signal(true);
  data    = signal<TableauBordAgenceDto | null>(null);

  moisSelectionne = new Date().toISOString().slice(0, 7);
  moisDisponibles = this.buildMoisDisponibles();
  vue: 'mensuel' | 'trimestriel' | 'annuel' = 'mensuel';

  // Historique simulé (les 6 derniers mois chargés progressivement)
  private historiqueData: PointHistorique[] = [];

  toastMsg     = '';
  toastType    = '';
  toastVisible = false;
  private _toastTimer: any;

  // ── Computed ──────────────────────────────────────────────────────────────
  totalRevenus = computed(() => {
    const d = this.data();
    if (!d) return 0;
    return d.commissionsNettesMois + this.fraisTravaux() + this.autresProduits();
  });

  totalCharges = computed(() => {
    const d = this.data();
    if (!d) return 0;
    return d.chargesSalaires + d.chargesFrais;
  });

  resultatNet = computed(() => this.totalRevenus() - this.totalCharges());

  margeNette = computed(() => {
    const rev = this.totalRevenus();
    return rev > 0 ? (this.resultatNet() / rev) * 100 : 0;
  });

  fraisTravaux = computed(() => {
    const d = this.data();
    if (!d) return 0;
    // Frais catégorisés comme Travaux/Chantier
    return d.fraisAgence
      .filter(f => ['Travaux', 'Chantier', 'BTP', 'Rénovation'].some(k =>
        f.categorie?.toLowerCase().includes(k.toLowerCase()) ||
        f.libelle?.toLowerCase().includes('chantier') ||
        f.libelle?.toLowerCase().includes('travaux')
      ))
      .reduce((s, f) => s + f.montant, 0);
  });

  autresProduits = computed(() => {
    const d = this.data();
    if (!d) return 0;
    // Tous les frais agence qui ne sont pas des charges (hors Travaux)
    // Dans ce modèle : les fraisAgence avec statut 'Paye' qui ne sont pas des charges fixes
    return 0; // À étendre selon les catégories du backend
  });

  fraisChantiers = computed(() => {
    const d = this.data();
    if (!d) return [];
    return d.fraisAgence.filter(f =>
      ['Travaux', 'Chantier', 'BTP', 'Rénovation'].some(k =>
        (f.categorie ?? '').toLowerCase().includes(k.toLowerCase()) ||
        (f.libelle ?? '').toLowerCase().includes('chantier') ||
        (f.libelle ?? '').toLowerCase().includes('travaux')
      )
    );
  });

  fraisAutres = computed(() => {
    const d = this.data();
    if (!d) return [];
    return d.fraisAgence.filter(f =>
      !this.fraisChantiers().includes(f) &&
      !['salaire', 'loyer', 'bureau', 'téléphone', 'fixe'].some(k =>
        (f.categorie ?? '').toLowerCase().includes(k) ||
        (f.libelle ?? '').toLowerCase().includes(k)
      )
    );
  });

  topCommissions = computed(() =>
    (this.data()?.commissionsParContrat ?? [])
      .slice(0, 4)
      .sort((a, b) => b.commissionNette - a.commissionNette)
  );

  maxCommission = computed(() =>
    Math.max(...(this.data()?.commissionsParContrat ?? []).map(c => c.commissionNette), 1)
  );

  autresCommissions = computed(() => {
    const all = this.data()?.commissionsParContrat ?? [];
    return all.slice(4).reduce((s, c) => s + c.commissionNette, 0);
  });

  totalCreances = computed(() =>
    (this.data()?.creancesProprietaires ?? [])
      .filter(c => c.statut !== 'Solde')
      .reduce((s, c) => s + c.montantRestant, 0)
  );

  fraisImpayes = computed(() =>
    (this.data()?.fraisAgence ?? []).filter(f => f.statut === 'Impaye').length
  );

  salairesOk = computed(() =>
    (this.data()?.salairesMois ?? []).every(s => s.statut === 'Verse')
  );
  salairesLabel = computed(() =>
    this.salairesOk() ? 'Versé' : 'Partiel'
  );

  historique = computed(() => this.historiqueData);

  // ── Lifecycle ─────────────────────────────────────────────────────────────
  ngOnInit() {
    this.charger();
    this.chargerHistorique();
  }

  charger() {
    this.loading.set(true);
    this.http.get<any>(`${this.base}/agence/tableau-bord?mois=${this.moisSelectionne}`)
      .pipe(catchError(() => of({ data: this.buildFallback() })))
      .subscribe(r => {
        this.data.set(r.data ?? r);
        this.loading.set(false);
      });
  }

  private chargerHistorique() {
    // Charger les 6 derniers mois en parallèle pour le graphe d'évolution
    const mois = Array.from({ length: 6 }, (_, i) => {
      const d = new Date();
      d.setMonth(d.getMonth() - (5 - i));
      return d.toISOString().slice(0, 7);
    });
    const noms = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'];

    const reqs = mois.map(m =>
      this.http.get<any>(`${this.base}/agence/tableau-bord?mois=${m}`)
        .pipe(catchError(() => of(null)))
    );
    forkJoin(reqs).subscribe(results => {
      this.historiqueData = results.map((r, i) => {
        const d: TableauBordAgenceDto = r?.data ?? r ?? this.buildFallback();
        const [y, mo] = mois[i].split('-');
        const rev = (d.commissionsNettesMois ?? 0) + (d.chargesFrais ?? 0);
        const chg = (d.chargesSalaires ?? 0) + (d.chargesFrais ?? 0);
        return {
          label:   noms[parseInt(mo, 10) - 1] + ' ' + y.slice(2),
          revenus: rev,
          charges: chg,
          net:     rev - chg,
        };
      });
    });
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
  moisLabel(): string {
    const noms = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
    const [y, m] = this.moisSelectionne.split('-');
    return noms[parseInt(m, 10) - 1] + ' ' + y;
  }

  pctRevenus(val: number): number {
    const t = this.totalRevenus();
    return t > 0 ? (val / t) * 100 : 0;
  }

  barPct(val: number, max: number): number {
    return max > 0 ? (val / max) * 100 : 0;
  }

  barPctHist(val: number): number {
    const max = Math.max(...this.historiqueData.map(p => p.revenus), 1);
    return max > 0 ? (val / max) * 100 : 0;
  }

  exportPdf() {
    window.open(`${this.base}/agence/tableau-bord/export?mois=${this.moisSelectionne}`, '_blank');
  }

  private toast(msg: string, type: 'ok' | 'err') {
    this.toastMsg = msg; this.toastType = type; this.toastVisible = true;
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => this.toastVisible = false, 4500);
  }

  private buildMoisDisponibles() {
    const noms = ['Janv','Févr','Mars','Avr','Mai','Juin','Juil','Août','Sept','Oct','Nov','Déc'];
    const now  = new Date();
    return Array.from({ length: 12 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      return { value: d.toISOString().slice(0, 7), label: `${noms[d.getMonth()]} ${d.getFullYear()}` };
    });
  }

  private buildFallback(): TableauBordAgenceDto {
    return {
      mois: this.moisSelectionne, loyersCollectesMois: 0, commissionsbrutesMois: 0,
      fraisGestionMois: 0, commissionsNettesMois: 0, nbContratsActifs: 0,
      tauxCommissionMoyen: 0, netAReverserMois: 0, chargesSalaires: 0,
      chargesFrais: 0, resultatNet: 0,
      commissionsParContrat: [], fraisAgence: [],
      creancesProprietaires: [], salairesMois: []
    };
  }
}