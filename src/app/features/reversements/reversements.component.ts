// ══════════════════════════════════════════════════════════════
//  REVERSEMENTS — Module Finance complet
//  Fichier : src/app/features/reversements/reversements.component.ts
//  Route   : /reversements  (voir ROUTE_A_AJOUTER.md)
// ══════════════════════════════════════════════════════════════
import { Component, inject, OnInit } from '@angular/core';
import { CommonModule, DecimalPipe, DatePipe } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Injectable } from '@angular/core';
import { ApiService } from '../../core/services/api.services';

// ── DTOs ──────────────────────────────────────────────────────
export interface ReversementLigneDto {
  proprieteLibelle: string;
  produitCode:      string;
  periodeMois:      string;
  loyer:            number;
  montantCollecte:  number;
  commission:       number;
  netProprietaire:  number;
  estInclus:        boolean;
}

export interface ReversementProprietaireDto {
  proprietaireId:    string;
  proprietaireNom:   string;
  telephone:         string;
  email?:            string;
  periodicite:       string;
  periodiciteLabel:  string;
  prochaineEcheance: string;
  montantDu:         number;
  montantVerse:      number;
  montantRestant:    number;
  nbProprietes:      number;
  detail:            ReversementLigneDto[];
  statut:            'AVerser' | 'PartielleVerser' | 'Verse' | 'EnRetard';
  statutLabel:       string;
  dernierVersement?: string;
}

export interface ExecuterReversementRequest {
  proprietaireId:   string;
  montant:          number;
  modePaiement:     string;
  reference?:       string;
  commentaire?:     string;
  periodeDebut:     string;
  periodeFin:       string;
  notifierSms:      boolean;
  notifierEmail:    boolean;
  notifierWhatsapp: boolean;
}

export interface HistoriqueReversementDto {
  id:                string;
  proprietaireNom:   string;
  montant:           number;
  modePaiement:      string;
  modePaiementLabel: string;
  reference?:        string;
  dateVersement:     string;
  periodeDebut:      string;
  periodeFin:        string;
  periodicite:       string;
  notifie:           boolean;
  canaux:            string[];
  comptableNom:      string;
}

export interface AlerteFinanceDto {
  proprietaireId:   string;
  proprietaireNom:  string;
  telephone:        string;
  periodicite:      string;
  periodiciteLabel: string;
  echeanceDepassee: string;
  joursRetard:      number;
  montantDu:        number;
  nbMoisNonVerses:  number;
}

export interface StatsReversementsDto {
  totalAVerser:            number;
  totalVerseAujourdhui:    number;
  totalVerseMois:          number;
  nbProprietairesEnRetard: number;
  nbProprietairesAVerser:  number;
  totalMontantRetard:      number;
}

// ── Service ───────────────────────────────────────────────────
@Injectable({ providedIn: 'root' })
export class ReversementsService extends ApiService {

  getProprietairesAVerser(periodicite?: string, statut?: string): Observable<ReversementProprietaireDto[]> {
    let params = new HttpParams();
    if (periodicite) params = params.set('periodicite', periodicite);
    if (statut)      params = params.set('statut', statut);
    return this.http.get<ReversementProprietaireDto[]>(`${this.base}/reversements/a-verser`, { params });
  }

  getStats(): Observable<StatsReversementsDto> {
    return this.get<StatsReversementsDto>('/reversements/stats');
  }

  getAlertes(): Observable<AlerteFinanceDto[]> {
    return this.get<AlerteFinanceDto[]>('/reversements/alertes');
  }

  getHistorique(annee?: number, proprietaireId?: string): Observable<HistoriqueReversementDto[]> {
    let params = new HttpParams();
    if (annee)          params = params.set('annee', annee.toString());
    if (proprietaireId) params = params.set('proprietaireId', proprietaireId);
    return this.http.get<HistoriqueReversementDto[]>(`${this.base}/reversements/historique`, { params });
  }

  executer(req: ExecuterReversementRequest): Observable<string> {
    return this.post<string>('/reversements/executer', req);
  }
}

// ══════════════════════════════════════════════════════════════
//  COMPOSANT
// ══════════════════════════════════════════════════════════════
@Component({
  selector: 'kdi-reversements',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, DecimalPipe, DatePipe],
  template: `
<div class="rev-shell">
  <div class="rev-nav">
    <div class="rev-nav-brand">
      <div class="rev-brand-icon">₩</div>
      <div>
        <div class="rev-brand-title">Reversements</div>
        <div class="rev-brand-sub">Module Finance</div>
      </div>
    </div>
    <div class="rev-tabs">
      <button class="rev-tab" [class.active]="onglet==='dashboard'" (click)="onglet='dashboard'"><span class="tab-icon">📊</span> Dashboard</button>
      <button class="rev-tab" [class.active]="onglet==='executer'" (click)="onglet='executer'; loadAVerser()"><span class="tab-icon">💸</span> Verser</button>
      <button class="rev-tab" [class.active]="onglet==='historique'" (click)="onglet='historique'; loadHistorique()"><span class="tab-icon">📋</span> Historique</button>
      <button class="rev-tab alertes-tab" [class.active]="onglet==='alertes'" (click)="onglet='alertes'; loadAlertes()">
        <span class="tab-icon">🚨</span> Alertes
        <span class="badge-alert" *ngIf="nbAlertes > 0">{{ nbAlertes }}</span>
      </button>
    </div>
  </div>

  <!-- DASHBOARD -->
  <div *ngIf="onglet==='dashboard'" class="tab-content">
    <div class="dash-header">
      <div><h2 class="dash-title">Tableau de bord — Reversements</h2><p class="dash-sub">Suivi en temps réel des versements propriétaires</p></div>
      <select [(ngModel)]="anneeSelectionnee" (change)="loadStats()" class="period-select">
        <option *ngFor="let a of annees" [value]="a">{{ a }}</option>
      </select>
    </div>
    <div class="kpi-row" *ngIf="stats">
      <div class="kpi-card kpi-gold">
        <div class="kpi-top"><span class="kpi-icon">⏳</span><span class="kpi-trend up">À verser</span></div>
        <div class="kpi-amount">{{ stats.totalAVerser | number:'1.0-0' }}</div>
        <div class="kpi-label">MRU en attente</div><div class="kpi-sub">{{ stats.nbProprietairesAVerser }} propriétaires</div>
      </div>
      <div class="kpi-card kpi-green">
        <div class="kpi-top"><span class="kpi-icon">✅</span><span class="kpi-trend up">Ce mois</span></div>
        <div class="kpi-amount">{{ stats.totalVerseMois | number:'1.0-0' }}</div>
        <div class="kpi-label">MRU versés</div><div class="kpi-sub">Cumul mois en cours</div>
      </div>
      <div class="kpi-card kpi-blue">
        <div class="kpi-top"><span class="kpi-icon">📅</span><span class="kpi-trend">Aujourd'hui</span></div>
        <div class="kpi-amount">{{ stats.totalVerseAujourdhui | number:'1.0-0' }}</div>
        <div class="kpi-label">MRU versés</div><div class="kpi-sub">Opérations du jour</div>
      </div>
      <div class="kpi-card kpi-red">
        <div class="kpi-top"><span class="kpi-icon">🚨</span><span class="kpi-trend down">Retard</span></div>
        <div class="kpi-amount">{{ stats.totalMontantRetard | number:'1.0-0' }}</div>
        <div class="kpi-label">MRU en retard</div><div class="kpi-sub">{{ stats.nbProprietairesEnRetard }} propriétaires</div>
      </div>
    </div>
    <div class="echeances-section">
      <h3 class="section-title">📅 Calendrier des échéances {{ anneeSelectionnee }}</h3>
      <div class="periodes-grid">
        <div class="periodicite-bloc">
          <div class="pb-header pb-mensuel"><span class="pb-icon">🗓️</span><div><div class="pb-title">Mensuel</div><div class="pb-sub">12 versements / an</div></div></div>
          <div class="mois-grid">
            <div class="mois-cell" *ngFor="let m of mois12" [class.passe]="m.passe" [class.actuel]="m.actuel" [class.futur]="m.futur">
              <div class="mc-label">{{ m.label }}</div>
              <div class="mc-badge" [class.ok]="m.verse" [class.ko]="!m.verse && m.passe">{{ m.verse ? '✓' : (m.passe ? '!' : '·') }}</div>
            </div>
          </div>
        </div>
        <div class="periodicite-bloc">
          <div class="pb-header pb-bimensuel"><span class="pb-icon">📆</span><div><div class="pb-title">Bimensuel</div><div class="pb-sub">6 versements / an</div></div></div>
          <div class="mois-grid mois-grid-6">
            <div class="mois-cell" *ngFor="let m of mois6" [class.passe]="m.passe" [class.actuel]="m.actuel">
              <div class="mc-label">{{ m.label }}</div>
              <div class="mc-badge" [class.ok]="m.verse" [class.ko]="!m.verse && m.passe">{{ m.verse ? '✓' : (m.passe ? '!' : '·') }}</div>
            </div>
          </div>
        </div>
        <div class="periodicite-bloc">
          <div class="pb-header pb-trimestriel"><span class="pb-icon">🗃️</span><div><div class="pb-title">Trimestriel</div><div class="pb-sub">4 versements / an</div></div></div>
          <div class="mois-grid mois-grid-4">
            <div class="mois-cell" *ngFor="let m of mois4" [class.passe]="m.passe" [class.actuel]="m.actuel">
              <div class="mc-label">{{ m.label }}</div>
              <div class="mc-badge" [class.ok]="m.verse" [class.ko]="!m.verse && m.passe">{{ m.verse ? '✓' : (m.passe ? '!' : '·') }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- EXÉCUTER -->
  <div *ngIf="onglet==='executer'" class="tab-content">
    <div class="exec-layout">
      <div class="exec-liste">
        <div class="exec-liste-header">
          <h3 class="exec-title">Propriétaires à verser</h3>
          <div class="exec-filters">
            <select [(ngModel)]="filtrePeriodicite" (change)="loadAVerser()" class="filter-sel">
              <option value="">Toutes périodicités</option>
              <option value="Mensuel">Mensuel</option>
              <option value="Bimensuel">Bimensuel</option>
              <option value="Trimestriel">Trimestriel</option>
            </select>
            <select [(ngModel)]="filtreStatut" (change)="loadAVerser()" class="filter-sel">
              <option value="">Tous statuts</option>
              <option value="AVerser">À verser</option>
              <option value="EnRetard">En retard</option>
            </select>
          </div>
        </div>
        <div class="prop-liste">
          <div class="prop-item" *ngFor="let p of proprietairesAVerser"
               [class.selected]="selectedProp?.proprietaireId === p.proprietaireId"
               [class.retard]="p.statut === 'EnRetard'" (click)="selectProp(p)">
            <div class="pi-top">
              <div class="pi-avatar">{{ p.proprietaireNom[0] }}</div>
              <div class="pi-info">
                <div class="pi-nom">{{ p.proprietaireNom }}</div>
                <div class="pi-meta">
                  <span class="tag-periodicite">{{ p.periodiciteLabel }}</span>
                  <span class="tag-echeance">{{ p.prochaineEcheance }}</span>
                </div>
              </div>
              <div class="pi-montant"><div class="pi-montant-val">{{ p.montantDu | number:'1.0-0' }}</div><div class="pi-montant-sub">MRU</div></div>
            </div>
            <div class="pi-props" *ngIf="p.nbProprietes > 0">📍 {{ p.nbProprietes }} propriété(s)</div>
          </div>
          <div class="empty-mini" *ngIf="!proprietairesAVerser.length"><span>✅ Aucun versement en attente</span></div>
        </div>
      </div>

      <div class="exec-panel" *ngIf="selectedProp; else noSelection">
        <div class="ep-header">
          <div class="ep-avatar">{{ selectedProp.proprietaireNom[0] }}</div>
          <div><div class="ep-nom">{{ selectedProp.proprietaireNom }}</div><div class="ep-meta">{{ selectedProp.periodiciteLabel }} · {{ selectedProp.telephone }}</div></div>
          <div class="ep-statut" [class.retard]="selectedProp.statut==='EnRetard'">{{ selectedProp.statut === 'EnRetard' ? '⚠️ En retard' : '⏳ À verser' }}</div>
        </div>
        <div class="detail-section">
          <h4 class="detail-title">Détail des loyers à reverser</h4>
          <table class="detail-table">
            <thead><tr><th>Propriété</th><th>Produit</th><th>Période</th><th>Loyer</th><th>Collecté</th><th>Commission</th><th class="col-net">Net propriétaire</th><th>Inclure</th></tr></thead>
            <tbody>
              <tr *ngFor="let l of selectedProp.detail" [class.exclu]="!l.estInclus">
                <td>{{ l.proprieteLibelle }}</td>
                <td><span class="code-pill">{{ l.produitCode }}</span></td>
                <td>{{ l.periodeMois }}</td>
                <td>{{ l.loyer | number:'1.0-0' }}</td>
                <td [class.partiel]="l.montantCollecte < l.loyer">{{ l.montantCollecte | number:'1.0-0' }}</td>
                <td class="col-comm">-{{ l.commission | number:'1.0-0' }}</td>
                <td class="col-net">{{ l.netProprietaire | number:'1.0-0' }}</td>
                <td><input type="checkbox" [(ngModel)]="l.estInclus" (change)="recalculer()"></td>
              </tr>
            </tbody>
            <tfoot><tr><td colspan="6" class="tf-label">Total net à verser</td><td class="tf-total">{{ montantCalcule | number:'1.0-0' }} MRU</td><td></td></tr></tfoot>
          </table>
        </div>
        <div class="versement-form" [formGroup]="formVersement">
          <div class="vf-row">
            <div class="form-group"><label>Montant à verser (MRU) *</label><input formControlName="montant" type="number" class="form-control" [placeholder]="montantCalcule.toString()"></div>
            <div class="form-group"><label>Mode de paiement *</label>
              <select formControlName="modePaiement" class="form-control">
                <option value="Especes">💵 Espèces</option><option value="Bankily">📱 Bankily</option>
                <option value="Masrvi">📱 Masrvi</option><option value="VirementBancaire">🏦 Virement bancaire</option><option value="Cheque">📄 Chèque</option>
              </select>
            </div>
            <div class="form-group"><label>Référence / N° transaction</label><input formControlName="reference" class="form-control" placeholder="Ex: VIR-2026-0042"></div>
          </div>
          <div class="form-group"><label>Commentaire</label><textarea formControlName="commentaire" class="form-control" rows="2" placeholder="Notes internes…"></textarea></div>
          <div class="notif-section">
            <div class="notif-title">📣 Notifier le propriétaire</div>
            <div class="notif-options">
              <label class="notif-opt" [class.active]="formVersement.get('notifierSms')?.value">
                <input type="checkbox" formControlName="notifierSms"><span class="notif-icon">💬</span> SMS
              </label>
              <label class="notif-opt" [class.active]="formVersement.get('notifierEmail')?.value" [class.disabled]="!selectedProp.email">
                <input type="checkbox" formControlName="notifierEmail" [attr.disabled]="!selectedProp.email ? true : null">
                <span class="notif-icon">📧</span> Email<span class="no-email" *ngIf="!selectedProp.email">pas d'email</span>
              </label>
              <label class="notif-opt" [class.active]="formVersement.get('notifierWhatsapp')?.value">
                <input type="checkbox" formControlName="notifierWhatsapp"><span class="notif-icon">🟢</span> WhatsApp
              </label>
            </div>
          </div>
          <div class="vf-actions">
            <div class="vf-summary">Versement de <strong>{{ formVersement.get('montant')?.value || montantCalcule | number:'1.0-0' }} MRU</strong> à <strong>{{ selectedProp.proprietaireNom }}</strong></div>
            <button class="btn-verser" [disabled]="formVersement.invalid || submitting" (click)="executerVersement()">{{ submitting ? '⏳ Traitement…' : '✅ Exécuter le versement' }}</button>
          </div>
        </div>
      </div>
      <ng-template #noSelection><div class="no-selection"><div class="ns-icon">👆</div><div class="ns-text">Sélectionnez un propriétaire<br>pour effectuer un versement</div></div></ng-template>
    </div>
  </div>

  <!-- HISTORIQUE -->
  <div *ngIf="onglet==='historique'" class="tab-content">
    <div class="hist-header">
      <h3 class="exec-title">Historique des versements</h3>
      <select [(ngModel)]="anneeHistorique" (change)="loadHistorique()" class="filter-sel"><option *ngFor="let a of annees" [value]="a">{{ a }}</option></select>
    </div>
    <div class="bilan-cards" *ngIf="historiqueVersements.length">
      <div class="bilan-card"><div class="bc-label">Total versé {{ anneeHistorique }}</div><div class="bc-value">{{ totalHistorique | number:'1.0-0' }} MRU</div></div>
      <div class="bilan-card"><div class="bc-label">Nombre d'opérations</div><div class="bc-value">{{ historiqueVersements.length }}</div></div>
      <div class="bilan-card"><div class="bc-label">Propriétaires versés</div><div class="bc-value">{{ nbProprietairesVerses }}</div></div>
    </div>
    <div class="table-card" *ngIf="historiqueVersements.length; else emptyHist">
      <table class="hist-table">
        <thead><tr><th>Date</th><th>Propriétaire</th><th>Période couverte</th><th>Périodicité</th><th>Montant</th><th>Mode</th><th>Référence</th><th>Notifications</th><th>Par</th></tr></thead>
        <tbody>
          <tr *ngFor="let h of historiqueVersements">
            <td>{{ h.dateVersement | date:'dd/MM/yyyy' }}</td>
            <td class="td-nom">{{ h.proprietaireNom }}</td>
            <td class="td-periode">{{ h.periodeDebut }} → {{ h.periodeFin }}</td>
            <td><span class="tag-periodicite">{{ h.periodicite }}</span></td>
            <td class="td-montant">{{ h.montant | number:'1.0-0' }} MRU</td>
            <td>{{ h.modePaiementLabel }}</td>
            <td class="td-ref">{{ h.reference || '—' }}</td>
            <td><span class="notif-badge" *ngIf="h.notifie">✅ {{ h.canaux.join(' · ') }}</span><span class="notif-none" *ngIf="!h.notifie">—</span></td>
            <td class="td-par">{{ h.comptableNom }}</td>
          </tr>
        </tbody>
      </table>
    </div>
    <ng-template #emptyHist><div class="empty-state"><span class="empty-icon">📋</span><p>Aucun versement enregistré pour {{ anneeHistorique }}</p></div></ng-template>
  </div>

  <!-- ALERTES -->
  <div *ngIf="onglet==='alertes'" class="tab-content">
    <div class="alertes-header">
      <div><h3 class="exec-title">🚨 Alertes — Montants non versés</h3><p class="exec-sub">Propriétaires dont l'échéance de reversement est dépassée</p></div>
      <button class="btn-export" (click)="exporterAlertes()">⬇️ Exporter CSV</button>
    </div>
    <div class="alertes-list" *ngIf="alertes.length; else emptyAlertes">
      <div class="alerte-item" *ngFor="let a of alertes" [class.critique]="a.joursRetard > 30">
        <div class="ai-urgence"><div class="ai-jours" [class.critique]="a.joursRetard > 30">{{ a.joursRetard }}j</div><div class="ai-retard-label">retard</div></div>
        <div class="ai-body">
          <div class="ai-nom">{{ a.proprietaireNom }}</div>
          <div class="ai-meta"><span class="tag-periodicite">{{ a.periodiciteLabel }}</span><span class="ai-echeance">Échéance : {{ a.echeanceDepassee }}</span><span class="ai-mois">{{ a.nbMoisNonVerses }} mois non versé(s)</span></div>
          <div class="ai-tel">📞 {{ a.telephone }}</div>
        </div>
        <div class="ai-montant"><div class="ai-montant-val">{{ a.montantDu | number:'1.0-0' }}</div><div class="ai-montant-sub">MRU à verser</div></div>
        <div class="ai-actions"><button class="btn-alerte-action" (click)="onglet='executer'; selectPropByIdFromAlert(a)">💸 Verser</button></div>
      </div>
    </div>
    <ng-template #emptyAlertes><div class="empty-state empty-green"><span class="empty-icon">🎉</span><p>Aucune alerte — tous les versements sont à jour !</p></div></ng-template>
  </div>
</div>
  `,
  styles: [`
    :host { --gold:#c8a96e; --navy:#0c1a35; --navy-mid:#1a2d4a; --green:#22c55e; --red:#ef4444; --blue:#3b82f6; --bg:#f0f4f8; --card:#fff; --border:#e2e8f0; --text:#0f172a; --muted:#64748b; }
    .rev-shell { min-height:100vh; background:var(--bg); font-family:'Segoe UI',sans-serif; }
    .rev-nav { background:var(--navy); display:flex; align-items:center; gap:32px; padding:0 24px; border-bottom:2px solid var(--gold); }
    .rev-nav-brand { display:flex; align-items:center; gap:12px; padding:14px 0; }
    .rev-brand-icon { width:36px; height:36px; background:var(--gold); border-radius:8px; display:flex; align-items:center; justify-content:center; font-size:18px; font-weight:900; color:var(--navy); }
    .rev-brand-title { font-size:15px; font-weight:700; color:#fff; } .rev-brand-sub { font-size:11px; color:rgba(255,255,255,.5); }
    .rev-tabs { display:flex; gap:2px; margin-left:auto; }
    .rev-tab { padding:18px 20px; background:none; border:none; color:rgba(255,255,255,.6); font-size:13px; font-weight:500; cursor:pointer; transition:all .2s; border-bottom:3px solid transparent; position:relative; }
    .rev-tab:hover { color:#fff; } .rev-tab.active { color:var(--gold); border-bottom-color:var(--gold); }
    .tab-icon { margin-right:6px; } .alertes-tab { position:relative; }
    .badge-alert { position:absolute; top:10px; right:8px; background:var(--red); color:#fff; font-size:10px; font-weight:700; width:18px; height:18px; border-radius:50%; display:flex; align-items:center; justify-content:center; }
    .tab-content { padding:28px; max-width:1400px; margin:0 auto; }
    .dash-header { display:flex; justify-content:space-between; align-items:flex-end; margin-bottom:24px; }
    .dash-title { font-size:22px; font-weight:700; color:var(--navy); margin:0 0 4px; } .dash-sub { font-size:13px; color:var(--muted); margin:0; }
    .period-select { padding:8px 14px; border:1px solid var(--border); border-radius:8px; font-size:14px; }
    .kpi-row { display:grid; grid-template-columns:repeat(4,1fr); gap:16px; margin-bottom:32px; }
    .kpi-card { background:var(--card); border-radius:14px; padding:20px; box-shadow:0 2px 8px rgba(0,0,0,.06); border-left:5px solid transparent; transition:transform .2s; }
    .kpi-card:hover { transform:translateY(-2px); }
    .kpi-gold { border-left-color:var(--gold); } .kpi-green { border-left-color:var(--green); } .kpi-blue { border-left-color:var(--blue); } .kpi-red { border-left-color:var(--red); }
    .kpi-top { display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; } .kpi-icon { font-size:20px; }
    .kpi-trend { font-size:11px; font-weight:600; padding:2px 8px; border-radius:20px; background:#f1f5f9; color:var(--muted); }
    .kpi-trend.up { background:#f0fdf4; color:#16a34a; } .kpi-trend.down { background:#fef2f2; color:#dc2626; }
    .kpi-amount { font-size:28px; font-weight:800; color:var(--navy); letter-spacing:-1px; }
    .kpi-label { font-size:12px; color:var(--muted); text-transform:uppercase; letter-spacing:1px; margin:4px 0 2px; } .kpi-sub { font-size:12px; color:var(--muted); }
    .echeances-section { margin-top:8px; } .section-title { font-size:16px; font-weight:700; color:var(--navy); margin-bottom:16px; }
    .periodes-grid { display:grid; grid-template-columns:1fr 1fr 1fr; gap:16px; }
    .periodicite-bloc { background:var(--card); border-radius:14px; overflow:hidden; box-shadow:0 2px 8px rgba(0,0,0,.06); }
    .pb-header { display:flex; align-items:center; gap:12px; padding:14px 16px; }
    .pb-mensuel { background:linear-gradient(135deg,#c8a96e22,#e8c97a11); border-bottom:2px solid var(--gold); }
    .pb-bimensuel { background:linear-gradient(135deg,#3b82f622,#60a5fa11); border-bottom:2px solid var(--blue); }
    .pb-trimestriel { background:linear-gradient(135deg,#22c55e22,#4ade8011); border-bottom:2px solid var(--green); }
    .pb-icon { font-size:22px; } .pb-title { font-size:14px; font-weight:700; color:var(--navy); } .pb-sub { font-size:11px; color:var(--muted); }
    .mois-grid { display:grid; grid-template-columns:repeat(6,1fr); gap:6px; padding:12px; }
    .mois-grid-6 { grid-template-columns:repeat(6,1fr); } .mois-grid-4 { grid-template-columns:repeat(4,1fr); }
    .mois-cell { text-align:center; padding:8px 4px; border-radius:8px; background:#f8fafc; }
    .mois-cell.passe { background:#fef2f2; } .mois-cell.actuel { background:#eff6ff; border:2px solid var(--blue); }
    .mc-label { font-size:10px; color:var(--muted); font-weight:600; text-transform:uppercase; }
    .mc-badge { font-size:14px; margin-top:3px; } .mc-badge.ok { color:var(--green); } .mc-badge.ko { color:var(--red); }
    .exec-layout { display:grid; grid-template-columns:380px 1fr; gap:20px; align-items:start; }
    .exec-liste { background:var(--card); border-radius:14px; box-shadow:0 2px 8px rgba(0,0,0,.06); overflow:hidden; }
    .exec-liste-header { padding:16px; border-bottom:1px solid var(--border); }
    .exec-title { font-size:16px; font-weight:700; color:var(--navy); margin:0 0 12px; } .exec-sub { font-size:13px; color:var(--muted); margin:0; }
    .exec-filters { display:flex; gap:8px; }
    .filter-sel { padding:6px 10px; border:1px solid var(--border); border-radius:8px; font-size:12px; }
    .prop-liste { max-height:600px; overflow-y:auto; }
    .prop-item { padding:14px 16px; border-bottom:1px solid #f8fafc; cursor:pointer; transition:background .15s; border-left:3px solid transparent; }
    .prop-item:hover { background:#f8fafc; } .prop-item.selected { background:#eff6ff; border-left-color:var(--blue); } .prop-item.retard { border-left-color:var(--red); }
    .pi-top { display:flex; align-items:center; gap:10px; }
    .pi-avatar { width:36px; height:36px; background:var(--navy); border-radius:50%; display:flex; align-items:center; justify-content:center; color:var(--gold); font-weight:700; font-size:15px; flex-shrink:0; }
    .pi-info { flex:1; } .pi-nom { font-size:13px; font-weight:600; color:var(--text); }
    .pi-meta { display:flex; gap:6px; margin-top:3px; flex-wrap:wrap; }
    .pi-montant { text-align:right; } .pi-montant-val { font-size:16px; font-weight:700; color:var(--navy); } .pi-montant-sub { font-size:10px; color:var(--muted); }
    .pi-props { font-size:11px; color:var(--muted); margin-top:6px; padding-left:46px; }
    .tag-periodicite { font-size:10px; font-weight:700; padding:2px 8px; border-radius:20px; background:#f1f5f9; color:var(--muted); text-transform:uppercase; }
    .tag-echeance { font-size:10px; color:var(--muted); }
    .empty-mini { padding:32px; text-align:center; color:var(--muted); font-size:13px; }
    .exec-panel { background:var(--card); border-radius:14px; box-shadow:0 2px 8px rgba(0,0,0,.06); overflow:hidden; }
    .ep-header { display:flex; align-items:center; gap:14px; padding:18px 20px; background:var(--navy); }
    .ep-avatar { width:44px; height:44px; background:var(--gold); border-radius:50%; display:flex; align-items:center; justify-content:center; color:var(--navy); font-weight:800; font-size:18px; flex-shrink:0; }
    .ep-nom { font-size:16px; font-weight:700; color:#fff; } .ep-meta { font-size:12px; color:rgba(255,255,255,.6); margin-top:2px; }
    .ep-statut { margin-left:auto; font-size:12px; font-weight:600; padding:4px 12px; border-radius:20px; background:rgba(255,255,255,.15); color:var(--gold); }
    .ep-statut.retard { background:rgba(239,68,68,.2); color:#fca5a5; }
    .detail-section { padding:16px 20px; border-bottom:1px solid var(--border); }
    .detail-title { font-size:13px; font-weight:700; color:var(--navy); margin-bottom:10px; text-transform:uppercase; letter-spacing:.5px; }
    .detail-table { width:100%; border-collapse:collapse; font-size:12px; }
    .detail-table th { padding:8px 10px; text-align:left; background:#f8fafc; font-size:11px; color:var(--muted); text-transform:uppercase; letter-spacing:.5px; border-bottom:1px solid var(--border); }
    .detail-table td { padding:8px 10px; border-bottom:1px solid #f8fafc; }
    .detail-table tr.exclu td { opacity:.4; text-decoration:line-through; }
    .col-net { font-weight:700; color:var(--navy); } .col-comm { color:var(--red); }
    .code-pill { background:#f1f5f9; padding:2px 7px; border-radius:4px; font-family:monospace; font-size:11px; }
    .detail-table tfoot td { padding:10px; font-weight:700; background:#f8fafc; }
    .tf-label { color:var(--muted); text-align:right; font-size:12px; } .tf-total { font-size:16px; color:var(--navy); }
    .versement-form { padding:16px 20px; }
    .vf-row { display:grid; grid-template-columns:1fr 1fr 1fr; gap:14px; margin-bottom:12px; }
    .form-group { display:flex; flex-direction:column; gap:5px; margin-bottom:10px; }
    label { font-size:12px; font-weight:600; color:var(--text); }
    .form-control { padding:9px 12px; border:1px solid var(--border); border-radius:8px; font-size:13px; font-family:inherit; transition:border-color .2s; }
    .form-control:focus { outline:none; border-color:var(--gold); } textarea.form-control { resize:vertical; }
    .notif-section { margin:12px 0; } .notif-title { font-size:13px; font-weight:700; color:var(--navy); margin-bottom:10px; }
    .notif-options { display:flex; gap:10px; }
    .notif-opt { display:flex; align-items:center; gap:8px; padding:10px 16px; border:2px solid var(--border); border-radius:10px; cursor:pointer; font-size:13px; font-weight:500; transition:all .2s; }
    .notif-opt input { display:none; } .notif-opt.active { border-color:var(--green); background:#f0fdf4; color:#16a34a; } .notif-opt.disabled { opacity:.4; cursor:not-allowed; }
    .notif-icon { font-size:16px; } .no-email { font-size:10px; color:var(--muted); }
    .vf-actions { display:flex; align-items:center; justify-content:space-between; margin-top:16px; padding-top:16px; border-top:1px solid var(--border); }
    .vf-summary { font-size:13px; color:var(--muted); } .vf-summary strong { color:var(--navy); }
    .btn-verser { padding:12px 28px; background:var(--navy); color:#fff; border:none; border-radius:10px; font-size:14px; font-weight:600; cursor:pointer; transition:all .2s; }
    .btn-verser:hover { background:var(--navy-mid); } .btn-verser:disabled { opacity:.5; cursor:not-allowed; }
    .no-selection { display:flex; flex-direction:column; align-items:center; justify-content:center; min-height:400px; background:var(--card); border-radius:14px; color:var(--muted); }
    .ns-icon { font-size:48px; margin-bottom:12px; } .ns-text { font-size:14px; text-align:center; line-height:1.6; }
    .hist-header { display:flex; justify-content:space-between; align-items:center; margin-bottom:20px; }
    .bilan-cards { display:grid; grid-template-columns:repeat(3,1fr); gap:12px; margin-bottom:20px; }
    .bilan-card { background:var(--card); border-radius:12px; padding:16px 20px; box-shadow:0 1px 4px rgba(0,0,0,.06); }
    .bc-label { font-size:11px; color:var(--muted); text-transform:uppercase; letter-spacing:1px; margin-bottom:4px; } .bc-value { font-size:22px; font-weight:700; color:var(--navy); }
    .table-card { background:var(--card); border-radius:14px; overflow:hidden; box-shadow:0 2px 8px rgba(0,0,0,.06); }
    .hist-table { width:100%; border-collapse:collapse; font-size:13px; }
    .hist-table th { padding:12px 14px; background:#f8fafc; text-align:left; font-size:11px; color:var(--muted); text-transform:uppercase; letter-spacing:.5px; border-bottom:1px solid var(--border); }
    .hist-table td { padding:12px 14px; border-bottom:1px solid #f8fafc; }
    .td-nom { font-weight:600; color:var(--navy); } .td-montant { font-weight:700; color:var(--navy); }
    .td-periode { font-size:12px; color:var(--muted); } .td-ref { font-family:monospace; font-size:12px; } .td-par { font-size:12px; color:var(--muted); }
    .notif-badge { font-size:11px; color:#16a34a; background:#f0fdf4; padding:2px 8px; border-radius:20px; } .notif-none { color:var(--muted); }
    .alertes-header { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:20px; }
    .btn-export { padding:8px 16px; background:#fff; border:1px solid var(--border); border-radius:8px; font-size:13px; cursor:pointer; }
    .alertes-list { display:flex; flex-direction:column; gap:12px; }
    .alerte-item { background:var(--card); border-radius:12px; padding:16px 20px; display:flex; align-items:center; gap:16px; box-shadow:0 1px 4px rgba(0,0,0,.06); border-left:4px solid #f59e0b; transition:transform .15s; }
    .alerte-item:hover { transform:translateX(3px); } .alerte-item.critique { border-left-color:var(--red); }
    .ai-urgence { text-align:center; width:52px; flex-shrink:0; }
    .ai-jours { font-size:24px; font-weight:800; color:#f59e0b; } .ai-jours.critique { color:var(--red); }
    .ai-retard-label { font-size:10px; color:var(--muted); text-transform:uppercase; }
    .ai-body { flex:1; } .ai-nom { font-size:15px; font-weight:700; color:var(--navy); margin-bottom:4px; }
    .ai-meta { display:flex; gap:8px; align-items:center; flex-wrap:wrap; margin-bottom:4px; }
    .ai-echeance { font-size:12px; color:var(--muted); } .ai-mois { font-size:12px; font-weight:600; color:#f59e0b; } .ai-tel { font-size:12px; color:var(--muted); }
    .ai-montant { text-align:right; flex-shrink:0; }
    .ai-montant-val { font-size:20px; font-weight:800; color:var(--navy); } .ai-montant-sub { font-size:11px; color:var(--muted); }
    .ai-actions { flex-shrink:0; }
    .btn-alerte-action { padding:8px 16px; background:var(--navy); color:#fff; border:none; border-radius:8px; font-size:13px; cursor:pointer; white-space:nowrap; }
    .empty-state { display:flex; flex-direction:column; align-items:center; padding:60px; gap:12px; color:var(--muted); text-align:center; background:var(--card); border-radius:14px; }
    .empty-green { color:#16a34a; } .empty-icon { font-size:48px; }
  `]
})
export class ReversementsComponent implements OnInit {
  private svc = inject(ReversementsService);
  private fb  = inject(FormBuilder);

  onglet: 'dashboard' | 'executer' | 'historique' | 'alertes' = 'dashboard';
  stats: StatsReversementsDto | null = null;
  anneeSelectionnee = new Date().getFullYear();
  annees = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);
  mois12 = this.buildMois(12, 1);
  mois6  = this.buildMois(6, 2);
  mois4  = this.buildMois(4, 3);
  proprietairesAVerser: ReversementProprietaireDto[] = [];
  selectedProp: ReversementProprietaireDto | null = null;
  filtrePeriodicite = '';
  filtreStatut = '';
  montantCalcule = 0;
  submitting = false;
  formVersement = this.fb.group({
    montant:          [0, [Validators.required, Validators.min(1)]],
    modePaiement:     ['Especes', Validators.required],
    reference:        [''],
    commentaire:      [''],
    notifierSms:      [true],
    notifierEmail:    [false],
    notifierWhatsapp: [false],
  });
  historiqueVersements: HistoriqueReversementDto[] = [];
  anneeHistorique = new Date().getFullYear();
  alertes: AlerteFinanceDto[] = [];
  nbAlertes = 0;

  ngOnInit() { this.loadStats(); this.loadAlertes(); }

  loadStats() {
    this.svc.getStats().subscribe({
      next: s => this.stats = s,
      error: () => this.stats = { totalAVerser:0, totalVerseAujourdhui:0, totalVerseMois:0, nbProprietairesEnRetard:0, nbProprietairesAVerser:0, totalMontantRetard:0 }
    });
  }
  loadAVerser() {
    this.svc.getProprietairesAVerser(this.filtrePeriodicite || undefined, this.filtreStatut || undefined)
      .subscribe({ next: r => this.proprietairesAVerser = r, error: () => this.proprietairesAVerser = [] });
  }
  loadHistorique() {
    this.svc.getHistorique(this.anneeHistorique)
      .subscribe({ next: r => this.historiqueVersements = r, error: () => this.historiqueVersements = [] });
  }
  loadAlertes() {
    this.svc.getAlertes().subscribe({
      next: r => { this.alertes = r; this.nbAlertes = r.length; },
      error: () => { this.alertes = []; this.nbAlertes = 0; }
    });
  }
  selectProp(p: ReversementProprietaireDto) {
    this.selectedProp = p;
    this.recalculer();
    this.formVersement.patchValue({ montant: this.montantCalcule, notifierEmail: !!p.email });
  }
  selectPropByIdFromAlert(_a: AlerteFinanceDto) { this.loadAVerser(); this.onglet = 'executer'; }
  recalculer() {
    if (!this.selectedProp) return;
    this.montantCalcule = this.selectedProp.detail.filter(l => l.estInclus).reduce((s, l) => s + l.netProprietaire, 0);
    this.formVersement.patchValue({ montant: this.montantCalcule });
  }
  executerVersement() {
    if (!this.selectedProp || this.formVersement.invalid) return;
    this.submitting = true;
    const v = this.formVersement.value as any;
    const req: ExecuterReversementRequest = {
      proprietaireId:   this.selectedProp.proprietaireId,
      montant:          +v.montant,
      modePaiement:     v.modePaiement,
      reference:        v.reference || undefined,
      commentaire:      v.commentaire || undefined,
      periodeDebut:     this.selectedProp.detail.find(l => l.estInclus)?.periodeMois ?? '',
      periodeFin:       [...this.selectedProp.detail].filter(l => l.estInclus).pop()?.periodeMois ?? '',
      notifierSms:      !!v.notifierSms,
      notifierEmail:    !!v.notifierEmail,
      notifierWhatsapp: !!v.notifierWhatsapp,
    };
    this.svc.executer(req).subscribe({
      next: () => { this.submitting = false; this.selectedProp = null; this.loadAVerser(); this.loadStats(); alert('✅ Versement exécuté avec succès !'); },
      error: () => { this.submitting = false; }
    });
  }
  exporterAlertes() {
    const rows = ['Propriétaire;Téléphone;Périodicité;Échéance dépassée;Jours retard;Mois non versés;Montant dû MRU'];
    this.alertes.forEach(a => rows.push(`${a.proprietaireNom};${a.telephone};${a.periodiciteLabel};${a.echeanceDepassee};${a.joursRetard};${a.nbMoisNonVerses};${a.montantDu}`));
    const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `alertes-reversements-${new Date().toISOString().slice(0,10)}.csv`;
    link.click();
  }
  get totalHistorique() { return this.historiqueVersements.reduce((s, h) => s + h.montant, 0); }
  get nbProprietairesVerses() { return new Set(this.historiqueVersements.map(h => h.proprietaireNom)).size; }
  buildMois(n: number, pas: number) {
    const now = new Date();
    const moisLabels = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'];
    return Array.from({ length: n }, (_, i) => {
      const moisIndex = (i * pas) % 12; const moisNum = moisIndex + 1; const moisActuel = now.getMonth() + 1;
      return { label: moisLabels[moisIndex], passe: moisNum < moisActuel, actuel: moisNum === moisActuel, futur: moisNum > moisActuel, verse: false };
    });
  }
}