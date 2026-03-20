import { Component, inject, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Observable } from 'rxjs';
import { SuiviLoyersService, RecouvrementService, ApiService } from '../../core/services/api.services';
import { SuiviLoyersGlobalDto, RecapFinancierContratDto } from '../../core/models/models';
import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class NotificationLocataireService extends ApiService {
  notifier(contratId: string, canal: string, type: string): Observable<void> {
    return this.post<void>(`/contrats-location/${contratId}/notifier-locataire`, { canal, type });
  }
}

@Component({
  selector: 'kdi-suivi-loyers',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe, RouterLink],
  template: `
<div class="sl-root page-enter">
  <div class="sl-header">
    <div>
      <h1 class="sl-title">
        <svg class="sl-ico" viewBox="0 0 20 20" fill="currentColor"><path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4zm14 5H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 010 2H5a1 1 0 01-1-1zm5-1a1 1 0 000 2h1a1 1 0 000-2H9z"/></svg>
        Suivi des loyers
      </h1>
      <p class="sl-sub">Situation financière locative en temps réel</p>
    </div>
    <button class="sl-btn-refresh" (click)="load()">
      <svg viewBox="0 0 16 16" fill="none"><path d="M13 8A5 5 0 113 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><path d="M13 4v4h-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
      Actualiser
    </button>
  </div>

  <div class="sl-loading" *ngIf="loading"><div class="sl-spinner"></div> Chargement…</div>

  <ng-container *ngIf="!loading && data">
    <div class="sl-kpis">
      <div class="sl-kpi sl-kpi-du">
        <div class="sl-kpi-lbl">Total dû</div>
        <div class="sl-kpi-val red">{{ data.totalDu | number:'1.0-0' }} <span class="sl-kpi-unit">MRU</span></div>
        <div class="sl-kpi-sub">{{ data.contrats.length }} contrats actifs</div>
      </div>
      <div class="sl-kpi sl-kpi-enc">
        <div class="sl-kpi-lbl">Total encaissé</div>
        <div class="sl-kpi-val green">{{ data.totalPaye | number:'1.0-0' }} <span class="sl-kpi-unit">MRU</span></div>
        <div class="sl-kpi-sub">Taux {{ data.totalDu > 0 ? (data.totalPaye / data.totalDu * 100 | number:'1.0-0') : 0 }}%</div>
      </div>
      <div class="sl-kpi sl-kpi-sol">
        <div class="sl-kpi-lbl">Solde global</div>
        <div class="sl-kpi-val" [class.teal]="data.totalSolde >= 0" [class.red]="data.totalSolde < 0">{{ data.totalSolde >= 0 ? '+' : '' }}{{ data.totalSolde | number:'1.0-0' }} <span class="sl-kpi-unit">MRU</span></div>
        <div class="sl-kpi-sub">{{ data.totalSolde >= 0 ? 'Excédent' : 'Déficit' }}</div>
      </div>
      <div class="sl-kpi sl-kpi-stat">
        <div class="sl-kpi-lbl">Répartition</div>
        <div class="sl-spills">
          <div class="sl-spill sp-g">✓ À jour <strong>{{ data.nbAJour }}</strong></div>
          <div class="sl-spill sp-r">✗ Retard <strong>{{ data.nbEnRetard }}</strong></div>
          <div class="sl-spill sp-b">★ Crédit <strong>{{ data.nbCredit }}</strong></div>
          <div class="sl-spill sp-gr">· Attente <strong>{{ data.nbNonCommence }}</strong></div>
        </div>
      </div>
    </div>

    <div class="sl-toolbar">
      <div class="sl-search-wrap">
        <svg viewBox="0 0 16 16" fill="none"><circle cx="6.5" cy="6.5" r="4" stroke="currentColor" stroke-width="1.3"/><path d="M10.5 10.5l3 3" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>
        <input class="sl-search" type="text" [(ngModel)]="recherche" placeholder="Locataire, propriété, collecteur…"/>
      </div>
      <select class="sl-sel" [(ngModel)]="filtreProp">
        <option value="">Toutes les propriétés</option>
        <option *ngFor="let p of proprietesDisponibles()" [value]="p">{{ p }}</option>
      </select>
      <select class="sl-sel" [(ngModel)]="filtreCollecteur">
        <option value="">Tous les collecteurs</option>
        <option *ngFor="let c of collecteursDisponibles()" [value]="c">{{ c }}</option>
      </select>
      <div class="sl-chips">
        <button class="sl-chip" [class.on]="filtre===''" (click)="setFiltre('')">Tous ({{ data.contrats.length }})</button>
        <button class="sl-chip" [class.on]="filtre==='AJour'" (click)="setFiltre('AJour')">✓ À jour ({{ data.nbAJour }})</button>
        <button class="sl-chip" [class.on]="filtre==='EnRetard'" (click)="setFiltre('EnRetard')">✗ Retard ({{ data.nbEnRetard }})</button>
        <button class="sl-chip" [class.on]="filtre==='Credit'" (click)="setFiltre('Credit')">★ Crédit ({{ data.nbCredit }})</button>
        <button class="sl-chip" [class.on]="filtre==='NonCommence'" (click)="setFiltre('NonCommence')">· Attente ({{ data.nbNonCommence }})</button>
      </div>
    </div>

    <div class="sl-layout" [class.sl-panel-open]="selected !== null">
      <div class="sl-table-wrap">
        <table class="sl-table">
          <thead><tr>
            <th class="c-bien">Bien</th>
            <th class="c-loc">Locataire</th>
            <th class="c-prop sl-hide-panel">Propriété</th>
            <th class="c-coll sl-hide-panel">Collecteur</th>
            <th class="c-loyer r">Loyer</th>
            <th class="c-du r">Dû</th>
            <th class="c-paye r">Payé</th>
            <th class="c-solde r">Solde</th>
            <th class="c-mois" style="text-align:center">Imp.</th>
            <th class="c-dpay">Dernier pmt</th>
            <th class="c-stat">Statut</th>
            <th class="c-prog">Avancement</th>
          </tr></thead>
          <tbody>
            <tr *ngFor="let c of contratsFiltres()"
                [class.sl-row-sel]="selected?.contratId === c.contratId"
                (click)="selectContrat(c)">
              <td><span class="sl-bien">{{ c.produitCode }}</span></td>
              <td><div class="sl-lname">{{ c.locataireNom }}</div><div class="sl-lsub">Depuis {{ c.dateEntree | date:'MM/yyyy' }}</div></td>
              <td class="sl-hide-panel"><div class="sl-pname">{{ proprieteLabel(c) }}</div></td>
              <td class="sl-hide-panel">
                <div class="sl-coll-cell" *ngIf="collecteurLabel(c); else noCollect">
                  <div class="sl-av-sm" [style.background]="avatarColor(collecteurLabel(c))">{{ initials(collecteurLabel(c)) }}</div>
                  <span class="sl-coll-name">{{ collecteurLabel(c) }}</span>
                </div>
                <ng-template #noCollect><span class="sl-muted">—</span></ng-template>
              </td>
              <td class="r"><span class="sl-amt">{{ c.loyer | number:'1.0-0' }}</span> <span class="sl-mru">MRU</span></td>
              <td class="r">{{ c.montantDu | number:'1.0-0' }}</td>
              <td class="r"><span class="sl-amt" [class.pos]="c.montantPaye >= c.montantDu">{{ c.montantPaye | number:'1.0-0' }}</span></td>
              <td class="r"><span class="sl-amt" [class.pos]="c.solde >= 0" [class.neg]="c.solde < 0">{{ c.solde >= 0 ? '+' : '-' }}{{ (c.solde < 0 ? -c.solde : c.solde) | number:'1.0-0' }}</span></td>
              <td style="text-align:center"><span class="sl-mb" [class.sl-mb-z]="c.moisEnRetard===0" [class.sl-mb-o]="c.moisEnRetard===1" [class.sl-mb-m]="c.moisEnRetard>1">{{ c.moisEnRetard }}</span></td>
              <td><span class="sl-dp" [class.sl-dp-rec]="isRecentPayment(c.dernierPaiement)">{{ c.dernierPaiement ? (c.dernierPaiement | date:'dd/MM/yyyy') : '—' }}</span></td>
              <td><span class="sl-sb" [class.sl-aj]="c.statutLoyer==='AJour'" [class.sl-rt]="c.statutLoyer==='EnRetard'" [class.sl-cr]="c.statutLoyer==='Credit'" [class.sl-at]="c.statutLoyer==='NonCommence'">{{ c.statutLoyer==='AJour'?'✓ À jour':c.statutLoyer==='EnRetard'?'✗ Retard':c.statutLoyer==='Credit'?'★ Crédit':'· Attente' }}</span></td>
              <td><div class="sl-prog"><div class="sl-pt"><div class="sl-pf" [class.sl-pf-r]="c.statutLoyer==='EnRetard'" [class.sl-pf-g]="c.statutLoyer==='AJour'||c.statutLoyer==='Credit'" [class.sl-pf-a]="c.statutLoyer==='NonCommence'" [style.width.%]="c.moisDepuisEntree>0?(c.moisPayes/c.moisDepuisEntree*100):0"></div></div><span class="sl-pl">{{ c.moisPayes }}/{{ c.moisDepuisEntree }}</span></div></td>
            </tr>
            <tr *ngIf="!contratsFiltres().length"><td colspan="12" class="sl-empty">Aucun contrat dans cette sélection</td></tr>
          </tbody>
        </table>
        <div class="sl-count" *ngIf="contratsFiltres().length">{{ contratsFiltres().length }} contrat{{ contratsFiltres().length > 1 ? 's' : '' }} affiché{{ contratsFiltres().length > 1 ? 's' : '' }}</div>
      </div>

      <div class="sl-panel" *ngIf="selected">
        <div class="sl-ph">
          <div class="sl-pav">{{ selected.locataireNom[0] || '?' }}</div>
          <div class="sl-pinfo">
            <div class="sl-pnom">{{ selected.locataireNom }}</div>
            <div class="sl-pcod">{{ selected.produitCode }}{{ proprieteLabel(selected) !== '—' ? ' · ' + proprieteLabel(selected) : '' }}</div>
          </div>
          <button class="sl-pcls" (click)="selected = null">✕</button>
        </div>
        <div class="sl-pbody">

          <div class="sl-stblk" [class.sl-st-rt]="selected.statutLoyer==='EnRetard'" [class.sl-st-aj]="selected.statutLoyer==='AJour'" [class.sl-st-cr]="selected.statutLoyer==='Credit'" [class.sl-st-at]="selected.statutLoyer==='NonCommence'">
            <div class="sl-st-ico">{{ selected.statutLoyer==='AJour'?'✓':selected.statutLoyer==='EnRetard'?'✗':selected.statutLoyer==='Credit'?'★':'·' }}</div>
            <div>
              <div class="sl-st-ttl">{{ selected.statutLoyerLabel }}</div>
              <div class="sl-st-det" *ngIf="selected.moisEnRetard > 0">{{ selected.moisEnRetard }} mois impayé(s) · {{ (selected.montantDu - selected.montantPaye) | number:'1.0-0' }} MRU dus</div>
              <div class="sl-st-det" *ngIf="selected.moisEnAvance > 0">{{ selected.moisEnAvance }} mois d'avance · crédit {{ selected.solde | number:'1.0-0' }} MRU</div>
              <div class="sl-st-det" *ngIf="selected.statutLoyer==='AJour' && selected.moisEnAvance===0">Tous les loyers sont à jour</div>
            </div>
          </div>

          <div class="sl-section" *ngIf="selected.statutLoyer === 'EnRetard'">
            <div class="sl-sec-lbl">Relancer le locataire</div>
            <div class="sl-rel-blk">
              <div class="sl-rel-hd"><div class="sl-rel-ico">🔔</div><div><div class="sl-rel-ttl">Relance loyer</div><div class="sl-rel-det">{{ selected.moisEnRetard }} mois impayé(s) · {{ (selected.montantDu - selected.montantPaye) | number:'1.0-0' }} MRU dus</div></div></div>
              <div class="sl-rel-body">
                <select class="sl-sn" [(ngModel)]="messageRelance">
                  <option value="relance_simple">Relance simple</option>
                  <option value="relance_urgente">Relance urgente (2+ mois)</option>
                  <option value="mise_en_demeure">Mise en demeure</option>
                </select>
                <div class="sl-nbts">
                  <button class="sl-nbt sl-email" [disabled]="relanceEnCours" (click)="relancerLocataire('email')">
                    <svg viewBox="0 0 14 14" fill="none"><rect x="1" y="3" width="12" height="9" rx="1.5" stroke="currentColor" stroke-width="1.2"/><path d="M1 5l6 4 6-4" stroke="currentColor" stroke-width="1.2"/></svg> Email
                  </button>
                  <button class="sl-nbt sl-wa" [disabled]="relanceEnCours" (click)="relancerLocataire('whatsapp')">
                    <svg viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="5.5" stroke="currentColor" stroke-width="1.2"/><path d="M5 7.5c.5 1 2 1.5 2.5 1.5" stroke="currentColor" stroke-width="1.1" stroke-linecap="round"/></svg> WhatsApp
                  </button>
                  <button class="sl-nbt sl-sms" [disabled]="relanceEnCours" (click)="relancerLocataire('sms')">
                    <svg viewBox="0 0 14 14" fill="none"><rect x="1" y="2" width="12" height="8" rx="1.5" stroke="currentColor" stroke-width="1.2"/><path d="M4 12l3-2h4" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg> SMS
                  </button>
                </div>
                <div class="sl-nok" *ngIf="relanceConfirm">✓ {{ relanceConfirm }}</div>
                <div class="sl-nerr" *ngIf="relanceErreur">✕ {{ relanceErreur }}</div>
              </div>
            </div>
          </div>

          <div class="sl-section">
            <div class="sl-sec-lbl">Caution & Avance</div>
            <div class="sl-ca-blk" [class.sl-ca-ok]="selected.cautionReglee" [class.sl-ca-ko]="!selected.cautionReglee">
              <div class="sl-ca-row"><span class="sl-ca-ico">🔒</span><div class="sl-ca-info"><div class="sl-ca-label">Caution</div><div class="sl-ca-amt">{{ selected.caution | number:'1.0-0' }} MRU</div></div><span class="sl-ca-badge" [class.sl-ca-ok-b]="selected.cautionReglee" [class.sl-ca-ko-b]="!selected.cautionReglee">{{ selected.cautionReglee ? '✓ Réglée' : '✗ Non réglée' }}</span></div>
              <div class="sl-ca-note">🏦 Conservée par l'agence · restituée à la sortie</div>
            </div>
            <div class="sl-ca-blk" style="margin-top:6px" [class.sl-ca-ok]="selected.avanceLoyerReglee" [class.sl-ca-ko]="!selected.avanceLoyerReglee">
              <div class="sl-ca-row"><span class="sl-ca-ico">💵</span><div class="sl-ca-info"><div class="sl-ca-label">Avance loyer</div><div class="sl-ca-amt">{{ selected.avanceLoyer | number:'1.0-0' }} MRU</div></div><span class="sl-ca-badge" [class.sl-ca-ok-b]="selected.avanceLoyerReglee" [class.sl-ca-ko-b]="!selected.avanceLoyerReglee">{{ selected.avanceLoyerReglee ? '✓ Réglée' : '✗ Non réglée' }}</span></div>
              <div class="sl-ca-note">👤 Affectée au propriétaire comme 1er mois</div>
            </div>
          </div>

          <div class="sl-section">
            <div class="sl-sec-lbl">Notifier le locataire — Caution/Avance</div>
            <div class="sl-rel-blk">
              <div class="sl-rel-body">
                <select class="sl-sn" [(ngModel)]="typeNotif">
                  <option value="caution_avance">Caution + Avance</option>
                  <option value="caution">Caution uniquement</option>
                  <option value="avance">Avance uniquement</option>
                </select>
                <div class="sl-nbts">
                  <button class="sl-nbt sl-email" [disabled]="notifEnCours" (click)="notifier('email')"><svg viewBox="0 0 14 14" fill="none"><rect x="1" y="3" width="12" height="9" rx="1.5" stroke="currentColor" stroke-width="1.2"/><path d="M1 5l6 4 6-4" stroke="currentColor" stroke-width="1.2"/></svg> Email</button>
                  <button class="sl-nbt sl-wa" [disabled]="notifEnCours" (click)="notifier('whatsapp')"><svg viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="5.5" stroke="currentColor" stroke-width="1.2"/><path d="M5 7.5c.5 1 2 1.5 2.5 1.5" stroke="currentColor" stroke-width="1.1" stroke-linecap="round"/></svg> WhatsApp</button>
                  <button class="sl-nbt sl-sms" [disabled]="notifEnCours" (click)="notifier('sms')"><svg viewBox="0 0 14 14" fill="none"><rect x="1" y="2" width="12" height="8" rx="1.5" stroke="currentColor" stroke-width="1.2"/><path d="M4 12l3-2h4" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg> SMS</button>
                </div>
                <div class="sl-nok" *ngIf="notifConfirm">✓ {{ notifConfirm }}</div>
                <div class="sl-nerr" *ngIf="notifErreur">✕ {{ notifErreur }}</div>
              </div>
            </div>
          </div>

          <div class="sl-section">
            <div class="sl-sec-lbl">Historique des loyers</div>
            <div class="sl-mois-grid">
              <div class="sl-mc" *ngFor="let m of selected.mois" [title]="m.label" [class.sl-mc-p]="m.statut==='Paye'" [class.sl-mc-h]="m.statut==='Partiel'" [class.sl-mc-i]="m.statut==='Impaye'" [class.sl-mc-a]="m.statut==='Avance'" [class.sl-mc-f]="m.statut==='Futur'">
                <div class="sl-mc-lbl">{{ m.label }}</div>
                <div class="sl-mc-ico">{{ m.statut==='Paye'?'✓':m.statut==='Partiel'?'½':m.statut==='Impaye'?'✗':m.statut==='Avance'?'★':'·' }}</div>
                <div class="sl-mc-amt" *ngIf="m.statut !== 'Futur'">{{ m.montantPaye | number:'1.0-0' }}</div>
              </div>
            </div>
            <div class="sl-mois-leg">
              <span class="sl-leg sl-leg-p">✓ Payé</span><span class="sl-leg sl-leg-h">½ Partiel</span>
              <span class="sl-leg sl-leg-i">✗ Impayé</span><span class="sl-leg sl-leg-a">★ Avance</span>
              <span class="sl-leg sl-leg-f">· À venir</span>
            </div>
          </div>

          <div class="sl-finrec">
            <div class="sl-fr-item"><div class="sl-fr-lbl">Total dû</div><div class="sl-fr-val red">{{ selected.montantDu | number:'1.0-0' }} MRU</div></div>
            <div class="sl-fr-item"><div class="sl-fr-lbl">Total payé</div><div class="sl-fr-val green">{{ selected.montantPaye | number:'1.0-0' }} MRU</div></div>
            <div class="sl-fr-item"><div class="sl-fr-lbl">Solde</div><div class="sl-fr-val" [class.green]="selected.solde>=0" [class.red]="selected.solde<0">{{ selected.solde >= 0 ? '+' : '-' }}{{ (selected.solde < 0 ? -selected.solde : selected.solde) | number:'1.0-0' }} MRU</div></div>
          </div>

          <div class="sl-dpay-row" *ngIf="selected.dernierPaiement">
            <svg viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="5.5" stroke="currentColor" stroke-width="1.2"/><path d="M7 4.5V7l2 1.5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>
            Dernier paiement : <strong>{{ selected.dernierPaiement | date:'dd/MM/yyyy' }}</strong>
          </div>

          <a [routerLink]="['/collectes/saisir']" [queryParams]="{contratId: selected.contratId}" class="sl-btn-saisir">
            <svg viewBox="0 0 14 14" fill="none"><path d="M7 1a1 1 0 011 1v4h4a1 1 0 010 2H8v4a1 1 0 01-2 0V8H2a1 1 0 010-2h4V2a1 1 0 011-1z" fill="currentColor"/></svg>
            Saisir un loyer
          </a>
        </div>
      </div>
    </div>
  </ng-container>
</div>
  `,
  styles: [`
    :host{--navy:#0D1B2A;--navy2:#1B2B3A;--gold:#C9A84C;--gold-l:#E8C96A;--ok:#16a34a;--ok-bg:#dcfce7;--ok-t:#166534;--late:#dc2626;--late-bg:#fee2e2;--late-t:#991b1b;--blue:#1d4ed8;--blue-bg:#dbeafe;--blue-t:#1e40af;--amber:#d97706;--amber-bg:#fef3c7;--amber-t:#92400e;--teal:#0f766e;--teal-bg:#ccfbf1;--teal-t:#134e4a;--surf:#F5F7FA;--surf2:#EEF1F6;--bord:#E2E8F0;--t1:#0F172A;--t2:#475569;--t3:#94a3b8;--r:10px;--r2:14px;font-family:'DM Sans','Segoe UI',sans-serif;display:block}
    .sl-root{padding:0}
    .sl-header{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:20px}
    .sl-title{display:flex;align-items:center;gap:10px;font-size:22px;font-weight:800;color:var(--t1);margin:0 0 3px}
    .sl-ico{width:22px;height:22px;color:var(--gold);flex-shrink:0}
    .sl-sub{font-size:12.5px;color:var(--t3);margin:0}
    .sl-btn-refresh{display:inline-flex;align-items:center;gap:7px;padding:9px 16px;border:1.5px solid var(--bord);border-radius:var(--r);background:#fff;color:var(--t2);font-size:13px;font-weight:600;cursor:pointer;font-family:inherit;transition:all .15s}
    .sl-btn-refresh svg{width:14px;height:14px}
    .sl-btn-refresh:hover{background:var(--navy);color:var(--gold-l);border-color:var(--navy)}
    .sl-loading{display:flex;align-items:center;gap:12px;padding:60px;justify-content:center;color:var(--t3)}
    .sl-spinner{width:20px;height:20px;border:2px solid var(--bord);border-top-color:var(--navy);border-radius:50%;animation:spin .7s linear infinite}
    @keyframes spin{to{transform:rotate(360deg)}}
    @keyframes fadeUp{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:none}}
    .sl-kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:18px}
    .sl-kpi{background:#fff;border-radius:var(--r2);padding:14px 16px;border:1px solid var(--bord);border-left:3px solid transparent}
    .sl-kpi-du{border-left-color:var(--late)}.sl-kpi-enc{border-left-color:var(--ok)}.sl-kpi-sol{border-left-color:var(--teal)}.sl-kpi-stat{border-left-color:var(--blue)}
    .sl-kpi-lbl{font-size:10.5px;color:var(--t3);text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px}
    .sl-kpi-val{font-size:20px;font-weight:800;line-height:1.1;color:var(--t1)}
    .sl-kpi-val.red{color:var(--late)}.sl-kpi-val.green{color:var(--ok)}.sl-kpi-val.teal{color:var(--teal)}
    .sl-kpi-unit{font-size:11px;font-weight:400;color:var(--t3)}.sl-kpi-sub{font-size:11.5px;color:var(--t3);margin-top:3px}
    .sl-spills{display:grid;grid-template-columns:1fr 1fr;gap:4px;margin-top:6px}
    .sl-spill{font-size:11.5px;font-weight:600;padding:3px 8px;border-radius:20px;text-align:center}
    .sp-g{background:var(--ok-bg);color:var(--ok-t)}.sp-r{background:var(--late-bg);color:var(--late-t)}.sp-b{background:var(--blue-bg);color:var(--blue-t)}.sp-gr{background:var(--surf2);color:var(--t2)}
    .sl-toolbar{background:#fff;border:1px solid var(--bord);border-radius:var(--r2);padding:10px 14px;margin-bottom:14px;display:flex;align-items:center;gap:8px;flex-wrap:wrap}
    .sl-search-wrap{position:relative;flex:1;min-width:200px}
    .sl-search-wrap svg{position:absolute;left:9px;top:50%;transform:translateY(-50%);width:14px;height:14px;color:var(--t3)}
    .sl-search{width:100%;padding:7px 10px 7px 30px;border:1.5px solid var(--bord);border-radius:var(--r);background:var(--surf);font-size:13px;color:var(--t1);font-family:inherit}
    .sl-search:focus{outline:none;border-color:var(--gold)}
    .sl-sel{padding:7px 10px;border:1.5px solid var(--bord);border-radius:var(--r);background:var(--surf);font-size:12.5px;color:var(--t1);font-family:inherit;cursor:pointer}
    .sl-sel:focus{outline:none}
    .sl-chips{display:flex;gap:5px;flex-wrap:wrap}
    .sl-chip{font-size:11.5px;padding:4px 12px;border-radius:20px;border:1.5px solid var(--bord);background:transparent;cursor:pointer;color:var(--t2);font-family:inherit;transition:all .13s;white-space:nowrap}
    .sl-chip.on{background:var(--navy);color:var(--gold-l);border-color:var(--navy)}
    .sl-chip:hover:not(.on){background:var(--surf2)}
    .sl-layout{display:grid;grid-template-columns:1fr;gap:14px;align-items:start}
    .sl-layout.sl-panel-open{grid-template-columns:1fr 320px}
    .sl-table-wrap{background:#fff;border-radius:var(--r2);border:1px solid var(--bord);overflow:hidden;min-width:0}
    .sl-table{width:100%;border-collapse:collapse;table-layout:fixed;font-weight:400}
    .sl-table thead th{padding:9px 12px;background:var(--navy);color:rgba(255,255,255,.45);font-size:10.5px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;text-align:left;white-space:nowrap}
    .sl-table thead th.r{text-align:right}
    .sl-table tbody tr{border-bottom:1px solid var(--surf2);cursor:pointer;transition:background .1s;animation:fadeUp .25s ease both}
    .sl-table tbody tr:last-child{border-bottom:none}
    .sl-table tbody tr:hover{background:var(--surf)}
    .sl-table tbody tr.sl-row-sel{background:var(--blue-bg)}
    .sl-table tbody tr.sl-row-sel td:first-child{border-left:3px solid var(--blue)}
    .sl-table td{padding:10px 12px;vertical-align:middle;color:var(--t1);font-weight:400}
    .sl-table td.r{text-align:right}
    .c-bien{width:54px}.c-loc{width:180px}.c-prop{width:150px}.c-coll{width:120px}.c-loyer{width:82px}.c-du{width:70px}.c-paye{width:70px}.c-solde{width:75px}.c-mois{width:44px}.c-dpay{width:90px}.c-stat{width:88px}.c-prog{width:100px}
    .sl-panel-open .sl-hide-panel{display:none}
    .sl-bien{display:inline-flex;align-items:center;justify-content:center;height:24px;min-width:44px;padding:0 6px;background:var(--blue-bg);color:var(--blue-t);border-radius:5px;font-size:11px;font-weight:700;font-family:monospace}
    .sl-lname{font-size:13px;font-weight:500;color:var(--t1);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .sl-lsub{font-size:11px;color:var(--t3)}
    .sl-pname{font-size:12px;color:var(--t2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .sl-muted{color:var(--t3);font-size:12px}
    .sl-coll-cell{display:flex;align-items:center;gap:5px}
    .sl-av-sm{width:22px;height:22px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-size:9px;font-weight:700;color:#fff;flex-shrink:0}
    .sl-coll-name{font-size:12px;color:var(--t2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .sl-amt{font-weight:600}.sl-amt.pos{color:var(--ok)}.sl-amt.neg{color:var(--late)}.sl-mru{font-size:10px;color:var(--t3)}
    .sl-mb{display:inline-flex;align-items:center;justify-content:center;min-width:20px;height:20px;border-radius:10px;padding:0 5px;font-size:11px;font-weight:700}
    .sl-mb-z{background:var(--ok-bg);color:var(--ok-t)}.sl-mb-o{background:var(--amber-bg);color:var(--amber-t)}.sl-mb-m{background:var(--late-bg);color:var(--late-t)}
    .sl-dp{font-size:11.5px;color:var(--t3)}.sl-dp.sl-dp-rec{color:var(--ok)}
    .sl-sb{display:inline-flex;align-items:center;gap:3px;font-size:11px;font-weight:600;padding:2px 8px;border-radius:20px;white-space:nowrap}
    .sl-aj{background:var(--ok-bg);color:var(--ok-t)}.sl-rt{background:var(--late-bg);color:var(--late-t)}.sl-cr{background:var(--blue-bg);color:var(--blue-t)}.sl-at{background:var(--surf2);color:var(--t2)}
    .sl-prog{display:flex;align-items:center;gap:5px}.sl-pt{flex:1;height:4px;background:var(--bord);border-radius:2px;overflow:hidden;min-width:40px}.sl-pf{height:100%;border-radius:2px}
    .sl-pf-r{background:var(--late)}.sl-pf-g{background:var(--ok)}.sl-pf-a{background:var(--amber)}.sl-pl{font-size:10px;color:var(--t3);min-width:24px;text-align:right}
    .sl-empty{text-align:center;padding:40px;color:var(--t3);font-size:13px}
    .sl-count{font-size:11.5px;color:var(--t3);padding:7px 12px;border-top:1px solid var(--surf2)}
    .sl-panel{background:#fff;border-radius:var(--r2);border:1px solid var(--bord);overflow:hidden;position:sticky;top:16px}
    .sl-ph{background:var(--navy);padding:14px 16px;display:flex;align-items:center;gap:10px}
    .sl-pav{width:36px;height:36px;border-radius:50%;background:var(--gold);display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:800;color:var(--navy);flex-shrink:0}
    .sl-pnom{font-size:14px;font-weight:700;color:#fff}.sl-pcod{font-size:11px;color:rgba(255,255,255,.5);margin-top:1px}
    .sl-pinfo{flex:1;min-width:0;overflow:hidden}
    .sl-pcls{background:rgba(255,255,255,.1);border:none;color:rgba(255,255,255,.6);width:26px;height:26px;border-radius:6px;cursor:pointer;font-size:13px;flex-shrink:0;margin-left:auto}
    .sl-pcls:hover{background:rgba(220,38,38,.35);color:#fff}
    .sl-pbody{max-height:calc(100vh - 180px);overflow-y:auto;display:flex;flex-direction:column}
    .sl-pbody::-webkit-scrollbar{width:3px}.sl-pbody::-webkit-scrollbar-thumb{background:var(--bord)}
    .sl-section{padding:12px 14px;border-bottom:1px solid var(--surf2)}
    .sl-sec-lbl{font-size:10px;font-weight:700;color:var(--t3);text-transform:uppercase;letter-spacing:.6px;margin-bottom:8px}
    .sl-stblk{display:flex;align-items:flex-start;gap:10px;padding:12px 14px;border-bottom:1px solid var(--surf2)}
    .sl-st-rt{background:var(--late-bg)}.sl-st-aj{background:var(--ok-bg)}.sl-st-cr{background:var(--blue-bg)}.sl-st-at{background:var(--surf)}
    .sl-st-ico{width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:13px;flex-shrink:0;background:rgba(255,255,255,.6)}
    .sl-st-ttl{font-size:13px;font-weight:700;color:var(--t1);margin-bottom:2px}.sl-st-det{font-size:11.5px;color:var(--t2)}
    .sl-rel-blk{border:1px solid var(--bord);border-radius:var(--r);overflow:hidden}
    .sl-rel-hd{display:flex;align-items:center;gap:8px;padding:9px 12px;background:var(--surf);border-bottom:1px solid var(--bord)}
    .sl-rel-ico{width:26px;height:26px;border-radius:50%;background:var(--amber-bg);display:flex;align-items:center;justify-content:center;font-size:13px;flex-shrink:0}
    .sl-rel-ttl{font-size:12px;font-weight:700;color:var(--t1)}.sl-rel-det{font-size:11px;color:var(--t2)}
    .sl-rel-body{padding:10px 12px;display:flex;flex-direction:column;gap:8px}
    .sl-sn{width:100%;padding:6px 10px;border:1.5px solid var(--bord);border-radius:8px;font-size:12.5px;font-family:inherit;color:var(--t1);background:#fff}
    .sl-sn:focus{outline:none;border-color:var(--gold)}
    .sl-nbts{display:grid;grid-template-columns:repeat(3,1fr);gap:5px}
    .sl-nbt{padding:7px 4px;border:1.5px solid var(--bord);border-radius:var(--r);background:transparent;font-size:11.5px;font-weight:600;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:4px;font-family:inherit;transition:all .13s}
    .sl-nbt svg{width:13px;height:13px;flex-shrink:0}
    .sl-nbt:disabled{opacity:.4;cursor:not-allowed}
    .sl-email{border-color:#B5D4F4;color:var(--blue-t)}.sl-email:hover:not(:disabled){background:var(--blue-bg)}
    .sl-wa{border-color:#9FE1CB;color:var(--teal)}.sl-wa:hover:not(:disabled){background:var(--teal-bg)}
    .sl-sms{border-color:#FAC775;color:var(--amber-t)}.sl-sms:hover:not(:disabled){background:var(--amber-bg)}
    .sl-nok{font-size:11.5px;color:var(--ok);text-align:center;padding:3px}.sl-nerr{font-size:11.5px;color:var(--late);text-align:center;padding:3px}
    .sl-ca-blk{border-radius:var(--r);padding:10px 12px;border:1px solid var(--bord)}
    .sl-ca-ok{border-color:#86efac;background:var(--ok-bg)}.sl-ca-ko{border-color:#fca5a5;background:var(--late-bg)}
    .sl-ca-row{display:flex;align-items:center;gap:8px}.sl-ca-ico{font-size:18px;flex-shrink:0}.sl-ca-info{flex:1}
    .sl-ca-label{font-size:11px;color:var(--t2)}.sl-ca-amt{font-size:14px;font-weight:700;color:var(--t1)}
    .sl-ca-badge{font-size:10.5px;font-weight:700;padding:2px 8px;border-radius:20px}
    .sl-ca-ok-b{background:#86efac;color:var(--ok-t)}.sl-ca-ko-b{background:#fca5a5;color:var(--late-t)}
    .sl-ca-note{font-size:11px;color:var(--t2);margin-top:6px;padding-top:5px;border-top:1px solid rgba(0,0,0,.05)}
    .sl-mois-grid{display:grid;grid-template-columns:repeat(6,1fr);gap:3px}
    .sl-mc{text-align:center;padding:4px 2px;border-radius:5px}
    .sl-mc-p{background:var(--ok-bg)}.sl-mc-h{background:var(--amber-bg)}.sl-mc-i{background:var(--late-bg)}.sl-mc-a{background:var(--blue-bg)}.sl-mc-f{background:var(--surf2);opacity:.6}
    .sl-mc-lbl{font-size:7px;color:var(--t3);font-weight:600;text-transform:uppercase}.sl-mc-ico{font-size:10px;margin:1px 0}
    .sl-mc-p .sl-mc-ico{color:var(--ok)}.sl-mc-i .sl-mc-ico{color:var(--late)}.sl-mc-h .sl-mc-ico{color:var(--amber)}.sl-mc-a .sl-mc-ico{color:var(--blue)}
    .sl-mc-amt{font-size:7px;color:var(--t3)}
    .sl-mois-leg{display:flex;flex-wrap:wrap;gap:6px;margin-top:6px}
    .sl-leg{font-size:10px;color:var(--t3);display:flex;align-items:center;gap:3px}
    .sl-leg::before{content:'';display:inline-block;width:7px;height:7px;border-radius:2px}
    .sl-leg-p::before{background:var(--ok-bg)}.sl-leg-h::before{background:var(--amber-bg)}.sl-leg-i::before{background:var(--late-bg)}.sl-leg-a::before{background:var(--blue-bg)}.sl-leg-f::before{background:var(--surf2)}
    .sl-finrec{display:grid;grid-template-columns:1fr 1fr 1fr;background:var(--surf2);gap:1px;border-top:1px solid var(--surf2);border-bottom:1px solid var(--surf2)}
    .sl-fr-item{background:#fff;padding:10px;text-align:center}
    .sl-fr-lbl{font-size:9.5px;color:var(--t3);text-transform:uppercase;letter-spacing:.4px;margin-bottom:3px}
    .sl-fr-val{font-size:12.5px;font-weight:700;color:var(--t1)}
    .sl-fr-val.red{color:var(--late)}.sl-fr-val.green{color:var(--ok)}
    .sl-dpay-row{display:flex;align-items:center;gap:6px;padding:9px 14px;font-size:12px;color:var(--t2);border-bottom:1px solid var(--surf2)}
    .sl-dpay-row svg{width:13px;height:13px;flex-shrink:0}
    .sl-btn-saisir{display:flex;align-items:center;justify-content:center;gap:7px;margin:12px 14px;padding:10px;background:var(--navy);color:var(--gold-l);border-radius:var(--r);font-size:13px;font-weight:700;text-decoration:none;transition:all .15s}
    .sl-btn-saisir svg{width:13px;height:13px}
    .sl-btn-saisir:hover{background:var(--navy2)}
    @media(max-width:900px){.sl-kpis{grid-template-columns:1fr 1fr}.sl-layout.sl-panel-open{grid-template-columns:1fr}}
  `]
})
export class SuiviLoyersComponent implements OnInit {
  private svc      = inject(SuiviLoyersService);
  private recSvc   = inject(RecouvrementService);
  private notifSvc = inject(NotificationLocataireService);

  loading  = true;
  data:    SuiviLoyersGlobalDto | null = null;
  selected: RecapFinancierContratDto | null = null;

  filtre           = '';
  recherche        = '';
  filtreProp       = '';
  filtreCollecteur = '';

  typeNotif    = 'caution_avance';
  notifEnCours = false;
  notifConfirm = '';
  notifErreur  = '';

  messageRelance = 'relance_simple';
  relanceEnCours = false;
  relanceConfirm = '';
  relanceErreur  = '';

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading = true;
    this.svc.getSuivi().subscribe({
      next:  d  => { this.data = d; this.loading = false; },
      error: () => { this.data = this.buildFallback(); this.loading = false; }
    });
  }

  setFiltre(f: string): void { this.filtre = f; this.selected = null; }

  selectContrat(c: RecapFinancierContratDto): void {
    this.selected = this.selected?.contratId === c.contratId ? null : c;
    this.notifConfirm = ''; this.notifErreur = '';
    this.relanceConfirm = ''; this.relanceErreur = '';
  }

  contratsFiltres(): RecapFinancierContratDto[] {
    if (!this.data) return [];
    let list = this.data.contrats;
    if (this.filtre)           list = list.filter(c => c.statutLoyer === this.filtre);
    if (this.filtreProp)       list = list.filter(c => this.proprieteLabel(c) === this.filtreProp);
    if (this.filtreCollecteur) list = list.filter(c => this.collecteurLabel(c) === this.filtreCollecteur);
    if (this.recherche) {
      const q = this.recherche.toLowerCase();
      list = list.filter(c =>
        c.locataireNom.toLowerCase().includes(q) ||
        this.proprieteLabel(c).toLowerCase().includes(q) ||
        this.collecteurLabel(c).toLowerCase().includes(q) ||
        c.produitCode.toLowerCase().includes(q)
      );
    }
    return list;
  }

  proprietesDisponibles(): string[] {
    const s = new Set<string>();
    (this.data?.contrats ?? []).forEach(c => { const p = this.proprieteLabel(c); if (p && p !== '—') s.add(p); });
    return [...s].sort();
  }

  collecteursDisponibles(): string[] {
    const s = new Set<string>();
    (this.data?.contrats ?? []).forEach(c => { const col = this.collecteurLabel(c); if (col) s.add(col); });
    return [...s].sort();
  }

  proprieteLabel(c: RecapFinancierContratDto): string {
    // Essaie tous les noms possibles selon la casse du backend
    return (c as any).proprieteLibelle    // camelCase standard
        || (c as any).ProprieteLiBelle    // PascalCase C# non normalisé
        || (c as any).ProprieteLibelle    // PascalCase normalisé
        || (c as any).propriete
        || '—';
  }

  collecteurLabel(c: RecapFinancierContratDto): string {
    return (c as any).collecteurNom    // camelCase standard
        || (c as any).CollecteurNom    // PascalCase
        || (c as any).collecteur
        || '';
  }

  initials(nom: string): string {
    return nom.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();
  }

  avatarColor(nom: string): string {
    const colors = ['#378ADD','#1D9E75','#BA7517','#D4537E','#534AB7','#0f766e'];
    let h = 0;
    for (let i = 0; i < nom.length; i++) h = (h * 31 + nom.charCodeAt(i)) & 0xffffffff;
    return colors[Math.abs(h) % colors.length];
  }

  isRecentPayment(d?: string): boolean {
    if (!d) return false;
    return (new Date().getTime() - new Date(d).getTime()) / 86400000 < 35;
  }

  notifier(canal: string): void {
    if (!this.selected || this.notifEnCours) return;
    this.notifEnCours = true;
    this.notifSvc.notifier(this.selected.contratId, canal, this.typeNotif).subscribe({
      next: () => {
        const lbl: Record<string,string> = {email:'Email',whatsapp:'WhatsApp',sms:'SMS'};
        const typ: Record<string,string> = {caution_avance:'Caution & Avance',caution:'Caution',avance:'Avance'};
        this.notifConfirm = `${typ[this.typeNotif]} envoyé(e) par ${lbl[canal]}`;
        this.notifEnCours = false;
        setTimeout(() => this.notifConfirm = '', 4000);
      },
      error: (err: any) => { this.notifEnCours = false; this.notifErreur = err?.error?.message ?? 'Erreur'; setTimeout(() => this.notifErreur = '', 5000); }
    });
  }

  relancerLocataire(canal: string): void {
    if (!this.selected || this.relanceEnCours) return;
    this.relanceEnCours = true;
    this.recSvc.envoyerRelance(this.selected.contratId, this.messageRelance, canal).subscribe({
      next: () => {
        const lbl: Record<string,string> = {email:'Email',whatsapp:'WhatsApp',sms:'SMS'};
        const msg: Record<string,string> = {relance_simple:'Relance simple',relance_urgente:'Relance urgente',mise_en_demeure:'Mise en demeure'};
        this.relanceConfirm = `${msg[this.messageRelance]} envoyée par ${lbl[canal]}`;
        this.relanceEnCours = false;
        setTimeout(() => this.relanceConfirm = '', 4000);
      },
      error: (err: any) => { this.relanceEnCours = false; this.relanceErreur = err?.error?.message ?? 'Erreur'; setTimeout(() => this.relanceErreur = '', 5000); }
    });
  }

  private buildFallback(): SuiviLoyersGlobalDto {
    return { totalDu:0, totalPaye:0, totalSolde:0, nbAJour:0, nbEnRetard:0, nbCredit:0, nbNonCommence:0, contrats:[] };
  }
}