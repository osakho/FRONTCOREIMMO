import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule, DatePipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { catchError, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import { PersonnelService } from '../../core/services/api.services';
import { PersonnelListItemDto, PagedList, TableauBordAgenceDto, CreanceProprietaireDto, FraisAgenceDto, SalaireMoisDto } from '../../core/models/models';

@Component({
  selector: 'kdi-tableau-bord-agence',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe, DecimalPipe],
  template: `
<div class="page-enter tba">

  <!-- ══ HEADER ══ -->
  <div class="tba-header">
    <div class="tba-header-left">
      <h1 class="tba-title">
        <svg class="tba-ico" viewBox="0 0 20 20" fill="currentColor">
          <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zm6-4a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zm6-3a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z"/>
        </svg>
        Tableau de bord financier
      </h1>
      <p class="tba-sub">Commissions · Charges · Créances · Salaires — Accès Direction</p>
    </div>
    <div class="tba-header-right">
      <select class="tba-sel" [(ngModel)]="moisSelectionne" (change)="charger()">
        <option *ngFor="let m of moisDisponibles" [value]="m.value">{{ m.label }}</option>
      </select>
      <button class="tba-btn-export" (click)="exporterRapport()">
        <svg viewBox="0 0 16 16" fill="none"><path d="M2 12h12M8 2v8M5 7l3 3 3-3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
        Exporter PDF
      </button>
    </div>
  </div>

  <!-- ══ LOADING ══ -->
  <div class="tba-loading" *ngIf="loading()">
    <div class="tba-spinner"></div> Chargement du tableau de bord…
  </div>

  <ng-container *ngIf="!loading()">

    <!-- ══ KPIs ══ -->
    <div class="tba-kpis">
      <div class="kpi-card kpi-gold">
        <div class="kpi-ico-wrap gold">
          <svg viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="1.4"/><path d="M8 5v1.5M8 9.5V11M6 7.5a2 2 0 014 0c0 1-1.5 1.5-2 2" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>
        </div>
        <div class="kpi-body">
          <div class="kpi-lbl">Commissions nettes</div>
          <div class="kpi-val">{{ (data()?.commissionsNettesMois ?? 0) | number:'1.0-0' }} <span class="kpi-unit">MRU</span></div>
          <div class="kpi-sub">{{ data()?.nbContratsActifs ?? 0 }} contrats · taux moy. {{ (data()?.tauxCommissionMoyen ?? 0) | number:'1.0-1' }}%</div>
        </div>
      </div>
      <div class="kpi-card kpi-red">
        <div class="kpi-ico-wrap red">
          <svg viewBox="0 0 16 16" fill="none"><path d="M2 13l4-5 3 3 5-7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </div>
        <div class="kpi-body">
          <div class="kpi-lbl">Charges totales</div>
          <div class="kpi-val">{{ chargesTotal() | number:'1.0-0' }} <span class="kpi-unit">MRU</span></div>
          <div class="kpi-sub">Salaires {{ (data()?.chargesSalaires ?? 0) | number:'1.0-0' }} + Frais {{ (data()?.chargesFrais ?? 0) | number:'1.0-0' }}</div>
        </div>
      </div>
      <div class="kpi-card" [class.kpi-green]="(data()?.resultatNet ?? 0) >= 0" [class.kpi-red]="(data()?.resultatNet ?? 0) < 0">
        <div class="kpi-ico-wrap" [class.green]="(data()?.resultatNet ?? 0) >= 0" [class.red]="(data()?.resultatNet ?? 0) < 0">
          <svg viewBox="0 0 16 16" fill="none"><path d="M2 10l4-4 3 3 5-6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </div>
        <div class="kpi-body">
          <div class="kpi-lbl">Résultat net agence</div>
          <div class="kpi-val" [class.neg]="(data()?.resultatNet ?? 0) < 0">
            {{ (data()?.resultatNet ?? 0) >= 0 ? '+' : '' }}{{ (data()?.resultatNet ?? 0) | number:'1.0-0' }} <span class="kpi-unit">MRU</span>
          </div>
          <div class="kpi-sub">Marge {{ margeNet() | number:'1.0-0' }}%</div>
        </div>
      </div>
      <div class="kpi-card kpi-blue">
        <div class="kpi-ico-wrap blue">
          <svg viewBox="0 0 16 16" fill="none"><path d="M8 2l1.5 3h3l-2.5 2 1 3L8 8.5 5 10l1-3L3.5 5h3z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/></svg>
        </div>
        <div class="kpi-body">
          <div class="kpi-lbl">Créances propriétaires</div>
          <div class="kpi-val">{{ totalCreances() | number:'1.0-0' }} <span class="kpi-unit">MRU</span></div>
          <div class="kpi-sub">{{ (data()?.creancesProprietaires?.length ?? 0) }} dossier(s) actif(s)</div>
        </div>
      </div>
    </div>

    <!-- ══ TABS ══ -->
    <div class="tba-tabs">
      <button class="tba-tab" [class.active]="onglet==='commissions'" (click)="onglet='commissions'">
        <svg viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="5" stroke="currentColor" stroke-width="1.3"/><path d="M7 5v.8m0 2.4V9M5.5 6.5a1.5 1.5 0 013 0c0 .66-.4 1.2-1 1.4" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>
        Commissions
      </button>
      <button class="tba-tab" [class.active]="onglet==='creances'" (click)="onglet='creances'">
        <svg viewBox="0 0 14 14" fill="none"><path d="M7 1l1.5 3h3l-2.5 2 1 3L7 7.5 4 9l1-3L2.5 4h3z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/></svg>
        Créances
        <span class="tab-badge red" *ngIf="(data()?.creancesProprietaires?.length ?? 0) > 0">{{ data()?.creancesProprietaires?.length }}</span>
      </button>
      <button class="tba-tab" [class.active]="onglet==='salaires'" (click)="onglet='salaires'">
        <svg viewBox="0 0 14 14" fill="none"><path d="M7 7a3 3 0 100-6 3 3 0 000 6zm-4.5 6a4.5 4.5 0 019 0" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>
        Salaires
        <span class="tab-badge amber" *ngIf="salairesPending() > 0">{{ salairesPending() }}</span>
      </button>
      <button class="tba-tab" [class.active]="onglet==='frais'" (click)="onglet='frais'">
        <svg viewBox="0 0 14 14" fill="none"><rect x="1" y="2" width="12" height="10" rx="1.5" stroke="currentColor" stroke-width="1.3"/><path d="M1 6h12M4 6v6" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>
        Frais fixes
        <span class="tab-badge red" *ngIf="fraisImpayes() > 0">{{ fraisImpayes() }}</span>
      </button>
    </div>

    <!-- ══ COMMISSIONS ══ -->
    <div class="tba-section" *ngIf="onglet==='commissions'">
      <div class="tba-sec-head">
        <div class="tba-sec-title">Détail par contrat — {{ moisLabel() }}</div>
        <div class="pills-row">
          <span class="pill gold">Brut {{ (data()?.commissionsbrutesMois ?? 0) | number:'1.0-0' }} MRU</span>
          <span class="pill red">Frais −{{ (data()?.fraisGestionMois ?? 0) | number:'1.0-0' }} MRU</span>
          <span class="pill green">Net {{ (data()?.commissionsNettesMois ?? 0) | number:'1.0-0' }} MRU</span>
        </div>
      </div>

      <!-- Barre répartition -->
      <div class="rep-wrap" *ngIf="data()?.loyersCollectesMois">
        <div class="rep-bar">
          <div class="rep-seg navy" [style.flex]="data()!.netAReverserMois"></div>
          <div class="rep-seg gold"  [style.flex]="data()!.commissionsNettesMois"></div>
          <div class="rep-seg red"   [style.flex]="data()!.fraisGestionMois"></div>
        </div>
        <div class="rep-legend">
          <span class="rl navy">● Net propriétaires {{ (data()!.netAReverserMois / data()!.loyersCollectesMois * 100) | number:'1.0-0' }}%</span>
          <span class="rl gold">● Commission agence {{ (data()!.commissionsNettesMois / data()!.loyersCollectesMois * 100) | number:'1.0-1' }}%</span>
          <span class="rl red">● Frais gestion {{ (data()!.fraisGestionMois / data()!.loyersCollectesMois * 100) | number:'1.0-1' }}%</span>
        </div>
      </div>

      <table class="tba-table">
        <thead><tr>
          <th>N° Contrat</th><th>Propriété</th><th>Propriétaire</th>
          <th class="r">Loyer</th><th class="c">Taux</th>
          <th class="r">Brute</th><th class="r">Frais</th><th class="r">Nette</th>
        </tr></thead>
        <tbody>
          <tr *ngFor="let c of data()?.commissionsParContrat ?? []; let i=index" [style.animation-delay]="(i*18)+'ms'">
            <td><span class="num-b">{{ c.contratNumero }}</span></td>
            <td class="fw6">{{ c.proprieteLibelle }}</td>
            <td class="t2">{{ c.proprietaireNom }}</td>
            <td class="r fw6">{{ c.loyer | number:'1.0-0' }} <span class="mru">MRU</span></td>
            <td class="c"><span class="taux-b">{{ (c.tauxCommission * 100) | number:'1.0-0' }}%</span></td>
            <td class="r text-gold fw6">{{ c.commissionBrute | number:'1.0-0' }}</td>
            <td class="r t3">−{{ c.fraisImputes | number:'1.0-0' }}</td>
            <td class="r text-green fw6">{{ c.commissionNette | number:'1.0-0' }}</td>
          </tr>
        </tbody>
        <tfoot>
          <tr>
            <td colspan="3">TOTAL — {{ data()?.nbContratsActifs ?? 0 }} contrats</td>
            <td class="r">{{ (data()?.loyersCollectesMois ?? 0) | number:'1.0-0' }}</td>
            <td></td>
            <td class="r text-gold-l">{{ (data()?.commissionsbrutesMois ?? 0) | number:'1.0-0' }}</td>
            <td class="r t3-l">−{{ (data()?.fraisGestionMois ?? 0) | number:'1.0-0' }}</td>
            <td class="r text-green-l">{{ (data()?.commissionsNettesMois ?? 0) | number:'1.0-0' }}</td>
          </tr>
        </tfoot>
      </table>
      <div class="tba-note">* Les frais de gestion représentent 15% de la commission brute (entretien, administration, divers).</div>
    </div>

    <!-- ══ CRÉANCES ══ -->
    <div class="tba-section" *ngIf="onglet==='creances'">
      <div class="tba-sec-head">
        <div class="tba-sec-title">Propriétaires débiteurs de l'agence</div>
        <button class="tba-btn-primary" (click)="ouvrirModalCreance()">
          <svg viewBox="0 0 14 14" fill="currentColor"><path d="M7 1a1 1 0 011 1v4h4a1 1 0 010 2H8v4a1 1 0 01-2 0V8H2a1 1 0 010-2h4V2a1 1 0 011-1z"/></svg>
          Nouvelle créance
        </button>
      </div>

      <div class="tba-empty" *ngIf="!(data()?.creancesProprietaires?.length)">
        <div class="empty-ico">✓</div>
        <div class="empty-h">Aucune créance en cours</div>
        <p class="empty-p">Tous les propriétaires sont à jour avec l'agence.</p>
      </div>

      <div class="cr-grid" *ngIf="data()?.creancesProprietaires?.length">
        <div class="cr-card" *ngFor="let cr of data()!.creancesProprietaires; let i=index"
             [style.animation-delay]="(i*30)+'ms'"
             [class.cr-retard]="cr.statut==='EnRetard'"
             [class.cr-solde]="cr.statut==='Solde'">
          <div class="cr-head">
            <div class="cr-av" [style.background]="cr.proprietaireColor">{{ cr.proprietaireInitiales }}</div>
            <div class="cr-info">
              <div class="cr-nom">{{ cr.proprietaireNom }}</div>
              <div class="cr-prop">{{ cr.proprietes.join(' · ') }}</div>
            </div>
            <span class="pill" [ngClass]="typeMotifClass(cr.typeMotif)">{{ typeMotifLabel(cr.typeMotif) }}</span>
            <span class="statut-pill" [ngClass]="statutCreanceClass(cr.statut)">{{ statutCreanceLabel(cr.statut) }}</span>
          </div>
          <div class="cr-body">
            <div class="cr-montants">
              <div class="cr-m-item"><div class="cr-ml">Total dû</div><div class="cr-mv text-late">{{ cr.montantTotal | number:'1.0-0' }} MRU</div></div>
              <div class="cr-m-item"><div class="cr-ml">Payé</div><div class="cr-mv text-ok">{{ cr.montantPaye | number:'1.0-0' }} MRU</div></div>
              <div class="cr-m-item"><div class="cr-ml">Restant</div><div class="cr-mv fw6">{{ cr.montantRestant | number:'1.0-0' }} MRU</div></div>
              <div class="cr-m-item"><div class="cr-ml">Mensualité</div><div class="cr-mv">{{ cr.montantEcheance | number:'1.0-0' }} MRU</div></div>
            </div>
            <div class="cr-ech" *ngIf="cr.nbEcheances > 0">
              <div class="cr-ech-lbl">Échéancier ({{ cr.echeancesPaye }}/{{ cr.nbEcheances }})</div>
              <div class="cr-ech-row">
                <div class="cr-step" *ngFor="let s of echeancierSteps(cr)" [class.paid]="s==='paid'" [class.current]="s==='current'"></div>
              </div>
            </div>
            <div class="cr-no-plan" *ngIf="cr.nbEcheances === 0">
              <svg viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="5" stroke="currentColor" stroke-width="1.3"/><path d="M7 5v2.5l1.5 1.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>
              Aucun échéancier défini
            </div>
          </div>
          <div class="cr-footer">
            <span class="cr-date" *ngIf="cr.dateDernierPaiement">Dernier paiement {{ cr.dateDernierPaiement | date:'dd/MM/yyyy' }}</span>
            <div class="cr-acts">
              <button class="tba-act" (click)="enregistrerPaiement(cr)" [disabled]="cr.statut==='Solde'">
                <svg viewBox="0 0 14 14" fill="none"><rect x="1" y="3" width="12" height="9" rx="1.5" stroke="currentColor" stroke-width="1.3"/><path d="M1 6h12M4 8.5h3" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>
                Paiement
              </button>
              <button class="tba-act blue" (click)="ouvrirEcheancier(cr)">
                <svg viewBox="0 0 14 14" fill="none"><rect x="1" y="2" width="12" height="11" rx="1.5" stroke="currentColor" stroke-width="1.3"/><path d="M4 1v2M10 1v2M1 6h12" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>
                Échéancier
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ══ SALAIRES ══ -->
    <div class="tba-section" *ngIf="onglet==='salaires'">
      <div class="tba-sec-head">
        <div class="tba-sec-title">Paie du personnel — {{ moisLabel() }}</div>
        <div class="head-right">
          <div class="pills-row">
            <span class="pill blue">{{ (data()?.salairesMois?.length ?? 0) }} employés</span>
            <span class="pill green">Versé {{ salairesTotalVerse() | number:'1.0-0' }} MRU</span>
            <span class="pill amber" *ngIf="salairesTotalPending() > 0">En attente {{ salairesTotalPending() | number:'1.0-0' }} MRU</span>
          </div>
          <button class="tba-btn-primary" (click)="ouvrirModalSalaire()">
            <svg viewBox="0 0 14 14" fill="currentColor"><path d="M7 1a1 1 0 011 1v4h4a1 1 0 010 2H8v4a1 1 0 01-2 0V8H2a1 1 0 010-2h4V2a1 1 0 011-1z"/></svg>
            Enregistrer versement
          </button>
        </div>
      </div>
      <table class="tba-table">
        <thead><tr>
          <th>Employé</th><th>Poste</th><th>Contrat</th>
          <th class="r">Salaire</th><th class="c">Statut</th><th class="c">Date versement</th><th></th>
        </tr></thead>
        <tbody>
          <tr *ngFor="let s of data()?.salairesMois ?? []; let i=index" [style.animation-delay]="(i*18)+'ms'">
            <td>
              <div class="pers-cell">
                <div class="pers-av" [style.background]="s.avatarColor">{{ s.initiales }}</div>
                <span class="fw6">{{ s.nomComplet }}</span>
              </div>
            </td>
            <td class="t2">{{ s.poste }}</td>
            <td><span class="contrat-b" [class.cdi]="s.typeContrat==='CDI'">{{ s.typeContrat }}</span></td>
            <td class="r fw6">{{ s.montant | number:'1.0-0' }} <span class="mru">MRU</span></td>
            <td class="c">
              <span class="sal-statut" [class.s-verse]="s.statut==='Verse'" [class.s-attente]="s.statut==='EnAttente'" [class.s-partiel]="s.statut==='Partiel'">
                {{ s.statut === 'Verse' ? '✓ Versé' : s.statut === 'Partiel' ? '½ Partiel' : '⏳ En attente' }}
              </span>
            </td>
            <td class="c t2">{{ s.dateVersement ? (s.dateVersement | date:'dd/MM/yyyy') : '—' }}</td>
            <td>
              <button class="tba-act green" *ngIf="s.statut !== 'Verse'" (click)="marquerSalaireVerse(s)">
                <svg viewBox="0 0 14 14" fill="none"><path d="M2 7l3.5 3.5 6.5-7" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>
                Marquer versé
              </button>
            </td>
          </tr>
        </tbody>
        <tfoot>
          <tr>
            <td colspan="3">MASSE SALARIALE TOTALE</td>
            <td class="r">{{ (data()?.chargesSalaires ?? 0) | number:'1.0-0' }} <span class="mru-l">MRU</span></td>
            <td colspan="3"></td>
          </tr>
        </tfoot>
      </table>
    </div>

    <!-- ══ FRAIS FIXES ══ -->
    <div class="tba-section" *ngIf="onglet==='frais'">
      <div class="tba-sec-head">
        <div class="tba-sec-title">Frais fixes agence — {{ moisLabel() }}</div>
        <div class="head-right">
          <div class="pills-row">
            <span class="pill gold">Total {{ (data()?.chargesFrais ?? 0) | number:'1.0-0' }} MRU</span>
            <span class="pill green">Payé {{ fraisPaye() | number:'1.0-0' }} MRU</span>
            <span class="pill red" *ngIf="fraisImpayes() > 0">{{ fraisImpayes() }} impayé(s)</span>
          </div>
          <button class="tba-btn-primary" (click)="ouvrirModalFrais()">
            <svg viewBox="0 0 14 14" fill="currentColor"><path d="M7 1a1 1 0 011 1v4h4a1 1 0 010 2H8v4a1 1 0 01-2 0V8H2a1 1 0 010-2h4V2a1 1 0 011-1z"/></svg>
            Ajouter frais
          </button>
        </div>
      </div>
      <table class="tba-table">
        <thead><tr>
          <th>Catégorie</th><th>Libellé</th><th class="r">Montant</th><th class="c">Statut</th><th class="c">Échéance</th><th></th>
        </tr></thead>
        <tbody>
          <tr *ngFor="let f of data()?.fraisAgence ?? []; let i=index" [style.animation-delay]="(i*18)+'ms'">
            <td><span class="categ-b">{{ f.categorie }}</span></td>
            <td class="fw6">{{ f.libelle }}</td>
            <td class="r fw6">{{ f.montant | number:'1.0-0' }} <span class="mru">MRU</span></td>
            <td class="c">
              <span class="frais-s" [class.fs-paye]="f.statut==='Paye'" [class.fs-attente]="f.statut==='EnAttente'" [class.fs-impaye]="f.statut==='Impaye'">
                {{ f.statut === 'Paye' ? '✓ Payé' : f.statut === 'EnAttente' ? '⏳ En attente' : '✕ Impayé' }}
              </span>
            </td>
            <td class="c t2">{{ f.dateEcheance ? (f.dateEcheance | date:'dd/MM') : '—' }}</td>
            <td>
              <button class="tba-act green" *ngIf="f.statut !== 'Paye'" (click)="marquerFraisPaye(f)">Marquer payé</button>
            </td>
          </tr>
        </tbody>
        <tfoot>
          <tr>
            <td colspan="2">TOTAL FRAIS FIXES</td>
            <td class="r">{{ (data()?.chargesFrais ?? 0) | number:'1.0-0' }} <span class="mru-l">MRU</span></td>
            <td colspan="3"></td>
          </tr>
        </tfoot>
      </table>

      <!-- Synthèse résultat -->
      <div class="synthese">
        <div class="synth-title">Synthèse financière — {{ moisLabel() }}</div>
        <div class="synth-rows">
          <div class="synth-row"><span>Loyers collectés</span><span class="fw6">{{ (data()?.loyersCollectesMois ?? 0) | number:'1.0-0' }} MRU</span></div>
          <div class="synth-row muted"><span>− Net propriétaires</span><span>−{{ (data()?.netAReverserMois ?? 0) | number:'1.0-0' }} MRU</span></div>
          <div class="synth-row bold"><span>= Commissions brutes</span><span>{{ (data()?.commissionsbrutesMois ?? 0) | number:'1.0-0' }} MRU</span></div>
          <div class="synth-row muted"><span>− Frais de gestion</span><span>−{{ (data()?.fraisGestionMois ?? 0) | number:'1.0-0' }} MRU</span></div>
          <div class="synth-row gold"><span>= Commissions nettes</span><span>{{ (data()?.commissionsNettesMois ?? 0) | number:'1.0-0' }} MRU</span></div>
          <div class="synth-row muted"><span>− Masse salariale</span><span>−{{ (data()?.chargesSalaires ?? 0) | number:'1.0-0' }} MRU</span></div>
          <div class="synth-row muted"><span>− Frais fixes</span><span>−{{ (data()?.chargesFrais ?? 0) | number:'1.0-0' }} MRU</span></div>
          <div class="synth-row result" [class.result-pos]="(data()?.resultatNet ?? 0) >= 0" [class.result-neg]="(data()?.resultatNet ?? 0) < 0">
            <span>RÉSULTAT NET AGENCE</span>
            <span>{{ (data()?.resultatNet ?? 0) >= 0 ? '+' : '' }}{{ (data()?.resultatNet ?? 0) | number:'1.0-0' }} MRU</span>
          </div>
        </div>
      </div>
    </div>

  </ng-container>
</div>

<!-- ══ MODAL CRÉANCE ══ -->
<div class="tba-modal-bg" [class.open]="showModalCreance" (click)="fermerModals()">
  <div class="tba-modal" (click)="$event.stopPropagation()">
    <div class="tba-modal-head">
      <div class="tba-modal-title">Nouvelle créance propriétaire</div>
      <button class="tba-modal-close" (click)="fermerModals()">✕</button>
    </div>
    <div class="tba-modal-body">
      <div class="fg-grid">
        <div class="fg span2"><label>Type de créance *</label>
          <select class="fc" [(ngModel)]="formCreance.typeMotif">
            <option value="AvanceFrais">Avance sur frais</option>
            <option value="TropPercu">Trop-perçu</option>
            <option value="CommissionNonVersee">Commission non reversée</option>
            <option value="Autre">Autre</option>
          </select></div>
        <div class="fg span2"><label>Motif détaillé *</label>
          <input class="fc" type="text" [(ngModel)]="formCreance.motif" placeholder="Ex : Travaux urgents avancés par l'agence…"/></div>
        <div class="fg"><label>Montant total (MRU) *</label>
          <input class="fc" type="number" [(ngModel)]="formCreance.montantTotal" placeholder="0"/></div>
        <div class="fg"><label>Nombre d'échéances</label>
          <input class="fc" type="number" [(ngModel)]="formCreance.nbEcheances" placeholder="Ex : 4"/></div>
        <div class="fg"><label>Mensualité (MRU)</label>
          <input class="fc" type="number" [(ngModel)]="formCreance.montantEcheance" placeholder="Auto si vide"/></div>
        <div class="fg"><label>Propriétaire ID *</label>
          <input class="fc" type="text" [(ngModel)]="formCreance.proprietaireId" placeholder="UUID propriétaire"/></div>
        <div class="fg span2"><label>Notes</label>
          <textarea class="fc ta" rows="2" [(ngModel)]="formCreance.notes" placeholder="Contexte, pièces justificatives…"></textarea></div>
      </div>
    </div>
    <div class="tba-modal-foot">
      <button class="btn-ghost" (click)="fermerModals()">Annuler</button>
      <button class="btn-submit" [disabled]="!formCreance.motif || !formCreance.montantTotal || submitting()" (click)="soumettreCreance()">
        <span *ngIf="!submitting()">Créer la créance</span>
        <span *ngIf="submitting()" class="tba-spin"></span>
      </button>
    </div>
  </div>
</div>

<!-- ══ MODAL SALAIRE ══ -->
<div class="tba-modal-bg" [class.open]="showModalSalaire" (click)="fermerModals()">
  <div class="tba-modal" (click)="$event.stopPropagation()">
    <div class="tba-modal-head">
      <div class="tba-modal-title">Enregistrer un versement de salaire</div>
      <button class="tba-modal-close" (click)="fermerModals()">✕</button>
    </div>
    <div class="tba-modal-body">
      <div class="fg-grid">
        <div class="fg span2"><label>Employé *</label>
          <select class="fc" [(ngModel)]="formSalaire.personnelId">
            <option value="">Sélectionner…</option>
            <option *ngFor="let p of personnel()" [value]="p.id">{{ p.nomComplet }} — {{ p.poste }}</option>
          </select></div>
        <div class="fg"><label>Montant (MRU) *</label>
          <input class="fc" type="number" [(ngModel)]="formSalaire.montant" placeholder="0"/></div>
        <div class="fg"><label>Période *</label>
          <input class="fc" type="month" [(ngModel)]="formSalaire.periodeMois"/></div>
        <div class="fg"><label>Mode de paiement *</label>
          <select class="fc" [(ngModel)]="formSalaire.mode">
            <option value="">Choisir…</option>
            <option value="Especes">Espèces</option>
            <option value="Bankily">Bankily</option>
            <option value="Masrvi">Masrvi</option>
            <option value="VirementBancaire">Virement bancaire</option>
          </select></div>
        <div class="fg"><label>Référence</label>
          <input class="fc" type="text" [(ngModel)]="formSalaire.reference" placeholder="N° transaction…"/></div>
      </div>
    </div>
    <div class="tba-modal-foot">
      <button class="btn-ghost" (click)="fermerModals()">Annuler</button>
      <button class="btn-submit" [disabled]="!formSalaire.personnelId || !formSalaire.montant || !formSalaire.mode || submitting()" (click)="soumettreVersementSalaire()">
        <span *ngIf="!submitting()">Confirmer le versement</span>
        <span *ngIf="submitting()" class="tba-spin"></span>
      </button>
    </div>
  </div>
</div>

<!-- ══ MODAL FRAIS ══ -->
<div class="tba-modal-bg" [class.open]="showModalFrais" (click)="fermerModals()">
  <div class="tba-modal" (click)="$event.stopPropagation()">
    <div class="tba-modal-head">
      <div class="tba-modal-title">Ajouter un frais fixe</div>
      <button class="tba-modal-close" (click)="fermerModals()">✕</button>
    </div>
    <div class="tba-modal-body">
      <div class="fg-grid">
        <div class="fg"><label>Catégorie *</label>
          <select class="fc" [(ngModel)]="formFrais.categorie">
            <option value="">Choisir…</option>
            <option value="Loyer">Loyer bureau</option>
            <option value="Énergie">Électricité & eau</option>
            <option value="Télécoms">Internet & téléphonie</option>
            <option value="Transport">Transport & carburant</option>
            <option value="Logiciel">Logiciel & maintenance</option>
            <option value="Fournitures">Fournitures bureau</option>
            <option value="Divers">Divers</option>
          </select></div>
        <div class="fg"><label>Libellé *</label>
          <input class="fc" type="text" [(ngModel)]="formFrais.libelle" placeholder="Ex : Loyer bureau Mars…"/></div>
        <div class="fg"><label>Montant (MRU) *</label>
          <input class="fc" type="number" [(ngModel)]="formFrais.montant" placeholder="0"/></div>
        <div class="fg"><label>Date d'échéance</label>
          <input class="fc" type="date" [(ngModel)]="formFrais.dateEcheance"/></div>
        <div class="fg span2"><label>Statut</label>
          <select class="fc" [(ngModel)]="formFrais.statut">
            <option value="EnAttente">En attente</option>
            <option value="Paye">Payé</option>
            <option value="Impaye">Impayé</option>
          </select></div>
      </div>
    </div>
    <div class="tba-modal-foot">
      <button class="btn-ghost" (click)="fermerModals()">Annuler</button>
      <button class="btn-submit" [disabled]="!formFrais.categorie || !formFrais.libelle || !formFrais.montant || submitting()" (click)="soumettreAjoutFrais()">
        <span *ngIf="!submitting()">Ajouter le frais</span>
        <span *ngIf="submitting()" class="tba-spin"></span>
      </button>
    </div>
  </div>
</div>
    `,
  styles: [`
    :host {
      --navy:#0D1B2A; --navy2:#1B2B3A;
      --gold:#C9A84C; --gold-l:#E8C96A; --gold-d:#9A7A2E;
      --ok:#16a34a; --ok-bg:#dcfce7; --ok-t:#166534;
      --late:#dc2626; --late-bg:#fee2e2; --late-t:#991b1b;
      --blue:#1d4ed8; --blue-bg:#dbeafe; --blue-t:#1e40af;
      --amber:#d97706; --amber-bg:#fef3c7; --amber-t:#92400e;
      --surf:#F5F7FA; --surf2:#EEF1F6; --bord:#E2E8F0;
      --t1:#0F172A; --t2:#475569; --t3:#94a3b8;
      --r:10px; --r2:14px;
      --shadow:0 1px 3px rgba(0,0,0,.07),0 4px 16px rgba(0,0,0,.05);
      font-family:'DM Sans','Segoe UI',sans-serif;
      display:block;
    }
    /* HEADER */
    .tba-header{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:20px;gap:16px;flex-wrap:wrap}
    .tba-title{display:flex;align-items:center;gap:10px;font-size:21px;font-weight:800;color:var(--t1);margin:0 0 4px}
    .tba-ico{width:22px;height:22px;color:var(--gold);flex-shrink:0}
    .tba-sub{font-size:12.5px;color:var(--t3);margin:0}
    .tba-header-right{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
    .tba-sel{padding:8px 12px;border:1.5px solid var(--bord);border-radius:var(--r);font-size:13px;font-family:inherit;background:#fff;color:var(--t1);cursor:pointer}
    .tba-btn-export{display:inline-flex;align-items:center;gap:6px;padding:9px 16px;border:1.5px solid var(--bord);border-radius:var(--r);background:#fff;color:var(--t2);font-size:13px;font-weight:600;cursor:pointer;font-family:inherit;transition:all .15s}
    .tba-btn-export svg{width:14px;height:14px}
    .tba-btn-export:hover{background:var(--navy);color:var(--gold-l);border-color:var(--navy)}
    .tba-btn-primary{display:inline-flex;align-items:center;gap:6px;padding:8px 16px;background:var(--navy);color:var(--gold-l);border:none;border-radius:var(--r);font-size:13px;font-weight:700;cursor:pointer;font-family:inherit;transition:all .15s}
    .tba-btn-primary svg{width:12px;height:12px}
    .tba-btn-primary:hover{background:var(--navy2)}
    /* LOADING */
    .tba-loading{display:flex;align-items:center;gap:12px;padding:60px;justify-content:center;color:var(--t3)}
    .tba-spinner{width:20px;height:20px;border:2px solid var(--bord);border-top-color:var(--navy);border-radius:50%;animation:spin .7s linear infinite}
    @keyframes spin{to{transform:rotate(360deg)}}
    @keyframes fadeUp{from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:none}}
    /* KPIs */
    .tba-kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:20px}
    .kpi-card{background:#fff;border-radius:var(--r2);padding:16px;display:flex;align-items:flex-start;gap:12px;box-shadow:var(--shadow);border:1px solid var(--bord);border-left:3px solid transparent}
    .kpi-gold{border-left-color:var(--gold)}.kpi-red{border-left-color:var(--late)}.kpi-green{border-left-color:var(--ok)}.kpi-blue{border-left-color:var(--blue)}
    .kpi-ico-wrap{width:34px;height:34px;border-radius:var(--r);display:flex;align-items:center;justify-content:center;flex-shrink:0}
    .kpi-ico-wrap svg{width:16px;height:16px}
    .kpi-ico-wrap.gold{background:var(--amber-bg)}.kpi-ico-wrap.gold svg{color:var(--amber)}
    .kpi-ico-wrap.red{background:var(--late-bg)}.kpi-ico-wrap.red svg{color:var(--late)}
    .kpi-ico-wrap.green{background:var(--ok-bg)}.kpi-ico-wrap.green svg{color:var(--ok)}
    .kpi-ico-wrap.blue{background:var(--blue-bg)}.kpi-ico-wrap.blue svg{color:var(--blue)}
    .kpi-lbl{font-size:10.5px;color:var(--t3);text-transform:uppercase;letter-spacing:.5px;margin-bottom:5px}
    .kpi-val{font-size:20px;font-weight:800;color:var(--t1);line-height:1}
    .kpi-val.neg{color:var(--late)}
    .kpi-unit{font-size:11px;font-weight:400;color:var(--t3)}
    .kpi-sub{font-size:11px;color:var(--t3);margin-top:5px}
    /* TABS */
    .tba-tabs{display:flex;gap:4px;background:#fff;border:1px solid var(--bord);border-radius:var(--r2);padding:4px;margin-bottom:16px;width:fit-content;box-shadow:var(--shadow)}
    .tba-tab{display:inline-flex;align-items:center;gap:7px;padding:8px 16px;border-radius:var(--r);border:none;background:transparent;font-size:13px;font-weight:500;color:var(--t2);cursor:pointer;font-family:inherit;transition:all .15s}
    .tba-tab svg{width:13px;height:13px}
    .tba-tab:hover:not(.active){background:var(--surf2)}
    .tba-tab.active{background:var(--navy);color:var(--gold-l)}
    .tab-badge{font-size:10.5px;font-weight:700;padding:1px 6px;border-radius:20px}
    .tab-badge.red{background:var(--late-bg);color:var(--late-t)}.tab-badge.amber{background:var(--amber-bg);color:var(--amber-t)}
    /* SECTION */
    .tba-section{background:#fff;border-radius:var(--r2);box-shadow:var(--shadow);border:1px solid var(--bord);overflow:hidden}
    .tba-sec-head{display:flex;align-items:center;justify-content:space-between;padding:14px 18px;border-bottom:1px solid var(--surf2);gap:12px;flex-wrap:wrap}
    .tba-sec-title{font-size:14px;font-weight:700;color:var(--t1)}
    .head-right{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
    .pills-row{display:flex;gap:7px;flex-wrap:wrap}
    .pill{font-size:12px;font-weight:600;padding:3px 11px;border-radius:20px}
    .pill.gold{background:var(--amber-bg);color:var(--amber-t)}.pill.green{background:var(--ok-bg);color:var(--ok-t)}
    .pill.red{background:var(--late-bg);color:var(--late-t)}.pill.amber{background:var(--amber-bg);color:var(--amber-t)}
    .pill.blue{background:var(--blue-bg);color:var(--blue-t)}
    /* Répartition */
    .rep-wrap{padding:12px 18px 8px}
    .rep-bar{display:flex;height:8px;border-radius:4px;overflow:hidden;gap:2px;margin-bottom:6px}
    .rep-seg{min-width:4px;border-radius:2px}
    .rep-seg.navy{background:var(--navy)}.rep-seg.gold{background:var(--gold)}.rep-seg.red{background:var(--late)}
    .rep-legend{display:flex;gap:16px;flex-wrap:wrap}
    .rl{font-size:11px;font-weight:500}
    .rl.navy{color:var(--navy)}.rl.gold{color:var(--gold-d)}.rl.red{color:var(--late)}
    /* TABLE */
    .tba-table{width:100%;border-collapse:collapse;font-size:13px}
    .tba-table thead th{padding:10px 18px;background:var(--navy);color:rgba(255,255,255,.45);font-size:10.5px;font-weight:700;text-transform:uppercase;letter-spacing:.6px;text-align:left;white-space:nowrap}
    .tba-table th.r{text-align:right}.tba-table th.c{text-align:center}
    .tba-table tbody tr{border-bottom:1px solid var(--surf2);animation:fadeUp .28s ease both;transition:background .1s}
    .tba-table tbody tr:last-child{border-bottom:none}
    .tba-table tbody tr:hover{background:var(--surf)}
    .tba-table tbody td{padding:12px 18px;vertical-align:middle;color:var(--t1)}
    .tba-table td.r{text-align:right}.tba-table td.c{text-align:center}
    .tba-table tfoot tr td{padding:12px 18px;background:var(--navy);color:rgba(255,255,255,.6);font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.5px}
    .tba-table tfoot td.r{text-align:right}
    .tba-note{padding:8px 18px;font-size:11.5px;color:var(--t3);font-style:italic;border-top:1px solid var(--surf2)}
    /* Cell helpers */
    .num-b{font-family:monospace;font-size:12px;font-weight:700;background:var(--surf2);color:var(--navy);padding:2px 8px;border-radius:5px}
    .fw6{font-weight:600}.t2{color:var(--t2)}.t3{color:var(--t3);font-size:12px}
    .mru{font-size:10px;color:var(--t3)}.mru-l{font-size:10px;color:rgba(255,255,255,.4)}
    .text-gold{color:var(--gold-d)}.text-green{color:var(--ok)}.text-late{color:var(--late)}.text-ok{color:var(--ok)}
    .text-gold-l{color:var(--gold-l);font-weight:600;text-align:right}
    .text-green-l{color:#4ade80;font-weight:600;text-align:right}
    .t3-l{color:rgba(255,255,255,.35);text-align:right}
    .taux-b{background:var(--surf2);color:var(--t2);font-size:11.5px;font-weight:700;padding:2px 8px;border-radius:5px}
    .pers-cell{display:flex;align-items:center;gap:10px}
    .pers-av{width:32px;height:32px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:#fff;flex-shrink:0}
    .contrat-b{font-size:11px;font-weight:700;padding:2px 8px;border-radius:5px;background:var(--surf2);color:var(--t2)}
    .contrat-b.cdi{background:var(--blue-bg);color:var(--blue-t)}
    .sal-statut{font-size:11.5px;font-weight:700}
    .s-verse{color:var(--ok)}.s-attente{color:var(--amber)}.s-partiel{color:var(--blue)}
    .categ-b{font-size:11px;font-weight:600;background:var(--surf2);color:var(--t2);padding:2px 8px;border-radius:5px}
    .frais-s{font-size:11.5px;font-weight:700}
    .fs-paye{color:var(--ok)}.fs-attente{color:var(--amber)}.fs-impaye{color:var(--late)}
    .statut-pill{font-size:11px;font-weight:700;padding:2px 9px;border-radius:20px}
    /* Action buttons */
    .tba-act{display:inline-flex;align-items:center;gap:5px;height:28px;padding:0 10px;border-radius:7px;border:1.5px solid var(--bord);background:#fff;color:var(--t2);font-size:11.5px;font-weight:600;cursor:pointer;transition:all .13s;font-family:inherit;white-space:nowrap}
    .tba-act svg{width:12px;height:12px}
    .tba-act:hover:not(:disabled){background:var(--navy);color:var(--gold-l);border-color:var(--navy)}
    .tba-act:disabled{opacity:.35;cursor:not-allowed}
    .tba-act.green{background:var(--ok-bg);color:var(--ok-t);border-color:#86efac}
    .tba-act.green:hover{background:var(--ok);color:#fff}
    .tba-act.blue{background:var(--blue-bg);color:var(--blue-t);border-color:#93c5fd}
    .tba-act.blue:hover{background:var(--blue);color:#fff}
    /* CRÉANCES */
    .cr-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(370px,1fr));gap:14px;padding:16px 18px}
    .cr-card{background:#fff;border:1px solid var(--bord);border-radius:var(--r2);overflow:hidden;animation:fadeUp .3s ease both;transition:box-shadow .15s}
    .cr-card:hover{box-shadow:0 4px 20px rgba(0,0,0,.08)}
    .cr-retard{border-left:3px solid var(--late)}.cr-solde{border-left:3px solid var(--ok);opacity:.7}
    .cr-head{display:flex;align-items:center;gap:10px;padding:14px 16px;border-bottom:1px solid var(--surf2);background:var(--surf);flex-wrap:wrap}
    .cr-av{width:36px;height:36px;border-radius:9px;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;color:#fff;flex-shrink:0}
    .cr-nom{font-size:13.5px;font-weight:700;color:var(--t1)}.cr-prop{font-size:11.5px;color:var(--t3);margin-top:1px;font-family:monospace}
    .cr-info{flex:1;min-width:0}
    .cr-body{padding:14px 16px}
    .cr-montants{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:12px}
    .cr-m-item{text-align:center}
    .cr-ml{font-size:10px;color:var(--t3);text-transform:uppercase;letter-spacing:.4px;margin-bottom:3px}
    .cr-mv{font-size:13px;font-weight:600;color:var(--t1)}
    .cr-ech-lbl{font-size:11px;color:var(--t3);margin-bottom:5px}
    .cr-ech-row{display:flex;gap:3px}
    .cr-step{flex:1;height:7px;border-radius:3px;background:var(--bord)}
    .cr-step.paid{background:var(--ok)}.cr-step.current{background:var(--gold)}
    .cr-no-plan{display:flex;align-items:center;gap:6px;font-size:12px;color:var(--t3)}
    .cr-no-plan svg{width:14px;height:14px;flex-shrink:0}
    .cr-footer{display:flex;align-items:center;justify-content:space-between;padding:10px 16px;background:var(--surf);border-top:1px solid var(--surf2)}
    .cr-date{font-size:11.5px;color:var(--t3)}.cr-acts{display:flex;gap:6px}
    /* Empty */
    .tba-empty{text-align:center;padding:60px 20px}
    .empty-ico{font-size:40px;margin-bottom:12px;color:var(--ok)}.empty-h{font-size:16px;font-weight:700;color:var(--t1);margin-bottom:6px}.empty-p{font-size:13px;color:var(--t3);margin:0}
    /* Synthèse */
    .synthese{margin:0;border-top:1px solid var(--surf2);padding:18px}
    .synth-title{font-size:12px;font-weight:700;color:var(--t2);text-transform:uppercase;letter-spacing:.5px;margin-bottom:12px}
    .synth-rows{display:flex;flex-direction:column;gap:2px;max-width:480px}
    .synth-row{display:flex;justify-content:space-between;align-items:center;padding:7px 12px;border-radius:7px;font-size:13px;color:var(--t1)}
    .synth-row.muted{color:var(--t3);font-size:12.5px}
    .synth-row.bold{font-weight:700;background:var(--surf)}
    .synth-row.gold{font-weight:700;color:var(--gold-d);background:var(--amber-bg)}
    .synth-row.result{font-weight:800;font-size:14px;margin-top:6px;padding:12px}
    .synth-row.result-pos{background:var(--ok);color:#fff;border-radius:var(--r)}
    .synth-row.result-neg{background:var(--late);color:#fff;border-radius:var(--r)}
    /* MODALS */
    .tba-modal-bg{position:fixed;inset:0;background:rgba(13,27,42,.6);backdrop-filter:blur(5px);z-index:1000;display:flex;align-items:center;justify-content:center;padding:20px;opacity:0;pointer-events:none;transition:opacity .2s}
    .tba-modal-bg.open{opacity:1;pointer-events:all}
    .tba-modal{background:#fff;border-radius:18px;width:100%;max-width:520px;max-height:92vh;display:flex;flex-direction:column;box-shadow:0 30px 80px rgba(0,0,0,.22);transform:translateY(16px) scale(.97);transition:transform .22s;overflow:hidden}
    .tba-modal-bg.open .tba-modal{transform:none}
    .tba-modal-head{display:flex;align-items:center;justify-content:space-between;padding:18px 22px;background:var(--navy);flex-shrink:0}
    .tba-modal-title{font-size:15px;font-weight:700;color:var(--gold-l)}
    .tba-modal-close{background:rgba(255,255,255,.1);border:none;color:rgba(255,255,255,.6);width:26px;height:26px;border-radius:6px;cursor:pointer;font-size:13px}
    .tba-modal-close:hover{background:rgba(220,38,38,.35);color:#fff}
    .tba-modal-body{flex:1;overflow-y:auto;padding:18px 22px}
    .fg-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}
    .fg{display:flex;flex-direction:column;gap:5px}.fg.span2{grid-column:1/-1}
    .fg label{font-size:11.5px;font-weight:700;color:var(--t2)}
    .fc{padding:9px 11px;border:1.5px solid var(--bord);border-radius:8px;font-size:13px;font-family:inherit;color:var(--t1);outline:none;transition:border-color .15s;background:#fff}
    .fc:focus{border-color:var(--gold);box-shadow:0 0 0 3px rgba(201,168,76,.1)}.ta{resize:none}
    .tba-modal-foot{padding:13px 22px;border-top:1px solid var(--bord);background:var(--surf);display:flex;align-items:center;justify-content:space-between;flex-shrink:0}
    .btn-ghost{background:none;border:none;cursor:pointer;font-size:13px;color:var(--t3);padding:8px;font-family:inherit}
    .btn-ghost:hover{color:var(--late)}
    .btn-submit{padding:9px 22px;border-radius:8px;background:var(--navy);color:var(--gold-l);border:none;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit;display:flex;align-items:center;justify-content:center;min-width:160px;transition:all .15s}
    .btn-submit:disabled{opacity:.4;cursor:not-allowed}
    .btn-submit:not(:disabled):hover{background:var(--navy2)}
    .tba-spin{width:16px;height:16px;border:2px solid rgba(255,255,255,.3);border-top-color:#fff;border-radius:50%;animation:spin .7s linear infinite;display:inline-block}
    @media(max-width:900px){.tba-kpis{grid-template-columns:1fr 1fr}.cr-grid{grid-template-columns:1fr}}
  `]
})
export class TableauBordAgenceComponent implements OnInit {
  private http         = inject(HttpClient);
  private personnelSvc = inject(PersonnelService);
  private base         = environment.apiUrl;

  data       = signal<TableauBordAgenceDto | null>(null);
  loading    = signal(true);
  submitting = signal(false);

  // Personnel chargé indépendamment — ne dépend pas du backend agence
  personnel  = signal<PersonnelListItemDto[]>([] as PersonnelListItemDto[]);

  onglet: 'commissions' | 'creances' | 'salaires' | 'frais' = 'commissions';
  moisSelectionne = new Date().toISOString().slice(0, 7);
  moisDisponibles = this.buildMoisDisponibles();

  showModalCreance = false;
  showModalSalaire = false;
  showModalFrais   = false;

  formCreance = this.initFormCreance();
  formSalaire = this.initFormSalaire();
  formFrais   = this.initFormFrais();

  // ── Computed ───────────────────────────────────────────────────────────────
  chargesTotal = computed(() => (this.data()?.chargesSalaires ?? 0) + (this.data()?.chargesFrais ?? 0));
  margeNet     = computed(() => {
    const c = this.data()?.commissionsNettesMois ?? 0;
    return c ? ((this.data()?.resultatNet ?? 0) / c) * 100 : 0;
  });
  totalCreances = computed(() =>
    (this.data()?.creancesProprietaires ?? []).filter(c => c.statut !== 'Solde').reduce((s, c) => s + c.montantRestant, 0)
  );
  salairesPending    = computed(() => (this.data()?.salairesMois ?? []).filter(s => s.statut !== 'Verse').length);
  salairesTotalVerse = computed(() => (this.data()?.salairesMois ?? []).filter(s => s.statut === 'Verse').reduce((s, p) => s + p.montant, 0));
  salairesTotalPending = computed(() => (this.data()?.salairesMois ?? []).filter(s => s.statut !== 'Verse').reduce((s, p) => s + p.montant, 0));
  fraisImpayes = computed(() => (this.data()?.fraisAgence ?? []).filter(f => f.statut === 'Impaye').length);
  fraisPaye    = computed(() => (this.data()?.fraisAgence ?? []).filter(f => f.statut === 'Paye').reduce((s, f) => s + f.montant, 0));

  // ── Lifecycle ──────────────────────────────────────────────────────────────
  ngOnInit() {
    this.charger();
    // Charger le personnel indépendamment — endpoint /personnel existant
    this.personnelSvc.getAll(1).subscribe({
      next: (r: PagedList<PersonnelListItemDto>) => this.personnel.set(r.items.filter((p: PersonnelListItemDto) => p.estActif)),
      error: () => {}
    });
  }

  charger() {
    this.loading.set(true);
    this.http.get<any>(`${this.base}/agence/tableau-bord?mois=${this.moisSelectionne}`)
      .pipe(catchError(() => of({ data: this.buildFallback() })))
      .subscribe(r => { this.data.set(r.data ?? r); this.loading.set(false); });
  }

  // ── Helpers ────────────────────────────────────────────────────────────────
  moisLabel(): string {
    const [y, m] = this.moisSelectionne.split('-');
    return ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'][+m-1] + ' ' + y;
  }

  echeancierSteps(cr: CreanceProprietaireDto): string[] {
    return Array.from({ length: cr.nbEcheances }, (_, i) =>
      i < cr.echeancesPaye ? 'paid' : i === cr.echeancesPaye ? 'current' : 'empty'
    );
  }

  typeMotifLabel(t: string): string {
    return ({AvanceFrais:'Avance frais',TropPercu:'Trop-perçu',CommissionNonVersee:'Commission',Autre:'Autre'})[t] ?? t;
  }
  typeMotifClass(t: string): string {
    const map: Record<string, string> = {AvanceFrais:'red',TropPercu:'amber',CommissionNonVersee:'blue',Autre:'amber'};
    return map[t] ?? 'amber';
  }
  statutCreanceLabel(s: string): string {
    return ({EnCours:'En cours',Solde:'Soldé',EnAttente:'En attente',EnRetard:'En retard'})[s] ?? s;
  }
  statutCreanceClass(s: string): string {
    const map: Record<string, string> = {
      EnCours:'pill blue',Solde:'pill green',EnAttente:'pill amber',EnRetard:'pill red'
    };
    return map[s] ?? 'pill amber';
  }

  // ── Actions ────────────────────────────────────────────────────────────────
  ouvrirModalCreance() { this.formCreance = this.initFormCreance(); this.showModalCreance = true; }
  ouvrirModalSalaire() { this.formSalaire = this.initFormSalaire(); this.showModalSalaire = true; }
  ouvrirModalFrais()   { this.formFrais = this.initFormFrais(); this.showModalFrais = true; }
  fermerModals()       { this.showModalCreance = false; this.showModalSalaire = false; this.showModalFrais = false; }

  soumettreCreance() {
    this.submitting.set(true);
    this.http.post(`${this.base}/agence/creances`, this.formCreance).subscribe({
      next:  () => { this.submitting.set(false); this.fermerModals(); this.charger(); },
      error: () => { this.submitting.set(false); alert('Erreur lors de la création.'); }
    });
  }

  soumettreVersementSalaire() {
    this.submitting.set(true);
    this.http.post(`${this.base}/agence/salaires/verser`, this.formSalaire).subscribe({
      next:  () => { this.submitting.set(false); this.fermerModals(); this.charger(); },
      error: () => { this.submitting.set(false); alert('Erreur lors du versement.'); }
    });
  }

  enregistrerPaiement(cr: CreanceProprietaireDto) {
    const montant = prompt(`Paiement créance — ${cr.proprietaireNom}\nMontant (MRU) :`);
    if (!montant || isNaN(+montant)) return;
    this.http.post(`${this.base}/agence/creances/${cr.id}/paiement`, { montant: +montant }).subscribe({
      next:  () => this.charger(),
      error: () => alert('Erreur lors de l\'enregistrement du paiement.')
    });
  }

  ouvrirEcheancier(cr: CreanceProprietaireDto) {
    const nb = prompt(`Échéancier pour ${cr.proprietaireNom}\nNombre de mensualités :`);
    if (!nb || isNaN(+nb)) return;
    const mensualite = cr.montantRestant / +nb;
    this.http.patch(`${this.base}/agence/creances/${cr.id}`, { nbEcheances: +nb, montantEcheance: mensualite }).subscribe({
      next:  () => this.charger(),
      error: () => alert('Erreur lors de la mise à jour de l\'échéancier.')
    });
  }

  marquerSalaireVerse(s: SalaireMoisDto) {
    if (!confirm(`Marquer le salaire de ${s.nomComplet} comme versé ?`)) return;
    this.http.post(`${this.base}/agence/salaires/${s.personnelId}/marquer-verse`, { periodeMois: this.moisSelectionne }).subscribe({
      next:  () => this.charger(),
      error: () => alert('Erreur.')
    });
  }

  marquerFraisPaye(f: FraisAgenceDto) {
    if (!confirm(`Marquer "${f.libelle}" comme payé ?`)) return;
    this.http.post(`${this.base}/agence/frais/${f.id}/marquer-paye`, {}).subscribe({
      next:  () => this.charger(),
      error: () => alert('Erreur.')
    });
  }

  exporterRapport() {
    window.open(`${this.base}/agence/tableau-bord/export?mois=${this.moisSelectionne}`, '_blank');
  }

  // ── Private ────────────────────────────────────────────────────────────────
  soumettreAjoutFrais() {
    this.submitting.set(true);
    this.http.post(`${this.base}/agence/frais`, {
      ...this.formFrais,
      periodeMois: this.moisSelectionne,
      montant: Number(this.formFrais.montant)
    }).subscribe({
      next:  () => { this.submitting.set(false); this.fermerModals(); this.charger(); },
      error: () => { this.submitting.set(false); alert('Erreur lors de l\'ajout.'); }
    });
  }

  private initFormFrais() {
    return { categorie:'', libelle:'', montant: null as any, statut:'EnAttente', dateEcheance:'' };
  }

  private initFormCreance() {
    return { proprietaireId:'', motif:'', typeMotif:'AvanceFrais', montantTotal: null as any, montantEcheance: null as any, nbEcheances: null as any, notes:'' };
  }
  private initFormSalaire() {
    return { personnelId:'', montant: null as any, periodeMois: this.moisSelectionne, mode:'', reference:'' };
  }
  private buildMoisDisponibles() {
    const noms = ['Janv','Févr','Mars','Avr','Mai','Juin','Juil','Août','Sept','Oct','Nov','Déc'];
    const now  = new Date();
    return Array.from({ length: 12 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      return { value: d.toISOString().slice(0,7), label: `${noms[d.getMonth()]} ${d.getFullYear()}` };
    });
  }
  private buildFallback(): TableauBordAgenceDto {
    return {
      mois: this.moisSelectionne, loyersCollectesMois:0, commissionsbrutesMois:0,
      fraisGestionMois:0, commissionsNettesMois:0, nbContratsActifs:0,
      tauxCommissionMoyen:0, netAReverserMois:0, chargesSalaires:0, chargesFrais:0, resultatNet:0,
      commissionsParContrat:[], fraisAgence:[], creancesProprietaires:[], salairesMois:[]
    };
  }
}
