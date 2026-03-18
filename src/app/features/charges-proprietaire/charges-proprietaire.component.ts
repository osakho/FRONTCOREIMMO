import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  AuthService,
  ProprietairesService,
  ChargesProprietaireService,
  ChargeProprietaireDto,
  FeuilleChargesDto,
  TypeCharge,
  MotifsPretService,
  MotifPretDto
} from '../../core/services/api.services';

// ── COMPOSANT ────────────────────────────────────────────────────────────────
@Component({
  selector: 'kdi-charges-proprietaire',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
<div class="ch-page page-enter">

  <!-- ══ HEADER ══ -->
  <div class="page-header">
    <div>
      <div class="page-title"><span class="mi">account_balance_wallet</span> Charges & Déductions</div>
      <div class="page-subtitle">Avances · Impôts · Travaux · Charges ponctuelles</div>
    </div>
    <div class="header-actions">
      <button class="btn btn-secondary" (click)="showToast('📄 Export en cours…')">
        <span class="mi">receipt_long</span> Bordereau
      </button>
      <button class="btn btn-gold" (click)="openModal()">
        <span class="mi">add</span> Nouvelle charge
      </button>
    </div>
  </div>

  <!-- ══ SÉLECTEURS ══ -->
  <div class="selector-bar">
    <div class="sel-avatar">{{ initiales(selectedNom()) }}</div>
    <div class="sel-info">
      <div class="sel-nom">{{ selectedNom() || 'Sélectionnez un propriétaire' }}</div>
      <div class="sel-meta" *ngIf="feuille">{{ feuille.charges.length }} charge(s) · {{ periodeMoisLabel() }}</div>
    </div>
    <select class="sel-ctrl" [(ngModel)]="proprietaireId" (ngModelChange)="load()">
      <option value="">— Propriétaire —</option>
      <option *ngFor="let p of proprietaires" [value]="p.id">{{ p.nom }}</option>
    </select>
    <input type="month" class="sel-ctrl" [(ngModel)]="periodeMois" (ngModelChange)="load()">
  </div>

  <ng-container *ngIf="feuille && proprietaireId">

    <!-- ══ BANDEAU REVERSEMENT ══ -->
    <div class="rev-card">
      <div class="rev-deco1"></div><div class="rev-deco2"></div>
      <div class="rev-top">
        <div>
          <div class="rev-eyebrow">CALCUL DU REVERSEMENT</div>
          <div class="rev-period">{{ periodeMoisLabel() }}</div>
        </div>
        <div class="rev-status-badge" [class.badge-ok]="chargesEnAttente().length === 0">
          {{ chargesEnAttente().length > 0 ? '⏳ En attente validation' : '✓ Prêt à reverser' }}
        </div>
      </div>
      <div class="rev-grid">
        <div class="rev-col">
          <div class="rev-lbl">Loyers collectés</div>
          <div class="rev-val">{{ feuille.loyersCollectes | number:'1.0-0' }}</div>
          <div class="rev-unit">MRU</div>
        </div>
        <div class="rev-divider"></div>
        <div class="rev-col">
          <div class="rev-lbl">Total déductions</div>
          <div class="rev-val red">− {{ totalDeductions() | number:'1.0-0' }}</div>
          <div class="rev-unit">MRU · {{ chargesApprouvees().length }} approuvée(s)</div>
        </div>
        <div class="rev-divider"></div>
        <div class="rev-col">
          <div class="rev-lbl">Net à reverser</div>
          <div class="rev-val gold">{{ feuille.netAReverser | number:'1.0-0' }}</div>
          <div class="rev-unit">MRU</div>
        </div>
      </div>
      <div class="rev-breakdown">
        <div class="rev-line" *ngFor="let l of feuille.lignesDetail">
          <div class="rev-dot" [style.background]="dotColor(l.type)"></div>
          <span class="rev-lbl2">{{ l.libelle }}</span>
          <span class="rev-montant" [class.neg]="l.montant < 0">
            {{ l.montant < 0 ? '−' : '' }} {{ (l.montant < 0 ? -l.montant : l.montant) | number:'1.0-0' }} MRU
          </span>
        </div>
        <div class="rev-line net">
          <div class="rev-dot" style="background:#C9A96E"></div>
          <strong>Net reversé</strong>
          <span class="rev-montant gold">= {{ feuille.netAReverser | number:'1.0-0' }} MRU</span>
        </div>
      </div>
    </div>

    <!-- ══ PANEL VALIDATION DIRECTION ══ -->
    <div class="vp-card" *ngIf="chargesEnAttente().length && isDirection()">
      <div class="vp-header">
        <span class="vp-ico">⏳</span>
        <div class="vp-header-text">
          <div class="vp-title">En attente de validation Direction</div>
          <div class="vp-sub">Ces charges seront déduites du reversement après approbation</div>
        </div>
        <span class="vp-count">{{ chargesEnAttente().length }} en attente</span>
      </div>
      <div class="vp-list">
        <div class="vp-item" *ngFor="let c of chargesEnAttente()">
          <span class="vp-type-ico">{{ typeIcon(c.type) }}</span>
          <div class="vp-body">
            <div class="vp-item-title">{{ c.libelle }}</div>
            <div class="vp-meta">{{ typeLabel(c.type) }} · {{ c.creeLe | date:'dd/MM/yyyy' }}<span *ngIf="c.chantierNumero"> · #{{ c.chantierNumero }}</span></div>
          </div>
          <div class="vp-montant">− {{ c.montant | number:'1.0-0' }} MRU</div>
          <div class="row-actions">
            <button class="btn-action btn-valider"  title="Approuver" (click)="approuver(c)"><span class="mi">check</span></button>
            <button class="btn-action btn-rejeter"  title="Refuser"   (click)="refuserAvecMotif(c)"><span class="mi">close</span></button>
          </div>
        </div>
      </div>
    </div>

    <!-- ══ ONGLETS ══ -->
    <div class="tabs-bar">
      <button class="tab-btn" [class.active]="onglet==='all'"     (click)="onglet='all'">
        Toutes <span class="tab-chip">{{ feuille.charges.length }}</span>
      </button>
      <button class="tab-btn" [class.active]="onglet==='Avance'"  (click)="onglet='Avance'">
        💰 Avances <span class="tab-chip">{{ nbType('Avance') }}</span>
      </button>
      <button class="tab-btn" [class.active]="onglet==='Impot'"   (click)="onglet='Impot'">
        🏛️ Impôts <span class="tab-chip">{{ nbType('Impot') }}</span>
      </button>
      <button class="tab-btn" [class.active]="onglet==='Travaux'" (click)="onglet='Travaux'">
        🔧 Travaux <span class="tab-chip" [class.warn]="nbType('Travaux')>0">{{ nbType('Travaux') }}</span>
      </button>
      <button class="tab-btn" [class.active]="onglet==='Autre'"   (click)="onglet='Autre'">
        📋 Autres <span class="tab-chip">{{ nbType('Autre') }}</span>
      </button>
    </div>

    <!-- Bandeau travaux -->
    <div class="travaux-banner" *ngIf="onglet==='Travaux'">
      <span>🔧</span>
      <div>
        <div class="tb-title">Dépenses travaux importées automatiquement</div>
        <div class="tb-sub">Synchronisées depuis le module Travaux</div>
      </div>
      <div class="tb-total">− {{ totalType('Travaux') | number:'1.0-0' }} MRU</div>
    </div>

    <!-- ══ LISTE CHARGES ══ -->
    <div class="charges-list">
      <div class="charge-card"
           *ngFor="let c of chargesFiltrees()"
           [class.cc-enattente]="c.statut==='EnAttente'"
           [class.cc-approuvee]="c.statut==='Approuvee'"
           [class.cc-refusee]="c.statut==='Refusee'"
           [class.cc-travaux]="c.type==='Travaux'">
        <div class="cc-icon" [class]="'ic-'+c.type.toLowerCase()">{{ typeIcon(c.type) }}</div>
        <div class="cc-body">
          <div class="cc-title">{{ c.libelle }}</div>
          <div class="cc-meta">
            <span class="cc-tag" [class]="'tag-'+c.type.toLowerCase()">{{ typeIcon(c.type) }} {{ typeLabel(c.type) }}</span>
            <span *ngIf="c.chantierNumero">#{{ c.chantierNumero }}</span>
            <span *ngIf="c.proprieteLibelle">{{ c.proprieteLibelle }}</span>
            <span *ngIf="c.locataireNom">{{ c.locataireNom }}</span>
            <span *ngIf="c.reference">Réf : {{ c.reference }}</span>
            <span>{{ c.creeLe | date:'dd/MM/yyyy' }}</span>
          </div>
          <div class="cc-avance" *ngIf="c.type==='Avance' && c.remboursementMensuel">
            Remb. {{ c.remboursementMensuel | number:'1.0-0' }} MRU/mois
            <span *ngIf="c.moisRestants"> · {{ c.moisRestants }} mois restant(s)</span>
          </div>
          <div class="cc-motif" *ngIf="c.motifRefus">Motif refus : {{ c.motifRefus }}</div>
        </div>
        <div class="cc-right">
          <div class="cc-montant">− {{ c.montant | number:'1.0-0' }} MRU</div>
          <div class="statut-badge" [ngClass]="'sb-'+c.statut.toLowerCase()">
            <span class="sb-dot"></span>{{ statutLabel(c.statut) }}
          </div>
        </div>
        <div class="row-actions">
          <button *ngIf="c.statut==='EnAttente' && isDirection()" class="btn-action btn-valider" title="Approuver" (click)="approuver(c)"><span class="mi">check</span></button>
          <button *ngIf="c.statut==='EnAttente' && isDirection()" class="btn-action btn-rejeter" title="Refuser"   (click)="refuserAvecMotif(c)"><span class="mi">close</span></button>
          <button *ngIf="c.type==='Travaux'" class="btn-action" title="Voir chantier" routerLink="/travaux"><span class="mi">open_in_new</span></button>
        </div>
      </div>

      <div class="empty-state" *ngIf="!chargesFiltrees().length">
        <span class="mi" style="font-size:44px;color:#cbd5e1">receipt_long</span>
        <div class="empty-title">Aucune charge pour cette sélection</div>
        <div class="empty-sub">Ajoutez une charge via "+ Nouvelle charge"</div>
      </div>
    </div>

    <!-- ══ RÉCAPITULATIF FINAL ══ -->
    <div class="recap-card">
      <div class="recap-title">📊 Récapitulatif — {{ periodeMoisLabel() }}</div>
      <div class="recap-row"><span class="recap-lbl">Loyers collectés (brut)</span><span class="recap-val">{{ feuille.loyersCollectes | number:'1.0-0' }} MRU</span></div>
      <div class="recap-row"><span class="recap-lbl">Commission KDI</span><span class="recap-val red">− {{ feuille.commission | number:'1.0-0' }} MRU</span></div>
      <div class="recap-row" *ngFor="let c of chargesApprouvees()">
        <span class="recap-lbl">{{ typeIcon(c.type) }} {{ c.libelle }}</span>
        <span class="recap-val red">− {{ c.montant | number:'1.0-0' }} MRU</span>
      </div>
      <div class="recap-row pending" *ngIf="chargesEnAttente().length">
        <span class="recap-lbl">⏳ En attente ({{ chargesEnAttente().length }})</span>
        <span class="recap-val amber">± {{ totalEnAttente() | number:'1.0-0' }} MRU</span>
      </div>
      <div class="recap-row total">
        <span class="recap-lbl bold">Net à reverser</span>
        <span class="recap-val gold">{{ feuille.netAReverser | number:'1.0-0' }} MRU</span>
      </div>
    </div>

  </ng-container>

  <!-- Vide -->
  <div class="empty-state big" *ngIf="!proprietaireId">
    <span class="mi" style="font-size:52px;color:#cbd5e1">account_balance_wallet</span>
    <div class="empty-title">Sélectionnez un propriétaire</div>
    <div class="empty-sub">Choisissez un propriétaire et une période pour afficher les charges</div>
  </div>

</div>

<!-- ══ MODAL SAISIE ══ -->
<div class="modal-overlay" [class.open]="modalOpen" (click)="closeOnOverlay($event)">
  <div class="modal" (click)="$event.stopPropagation()">
    <div class="modal-hdr">
      <div class="modal-icon">{{ typeIcon(form.type) }}</div>
      <div class="modal-hdr-text">
        <div class="modal-title">Nouvelle charge / déduction</div>
        <div class="modal-sub">Sera soumise à validation de la Direction</div>
      </div>
      <button class="close-btn" (click)="closeModal()">✕</button>
    </div>

    <div class="type-grid">
      <button class="type-btn" [class.selected]="form.type==='Avance'"  (click)="form.type='Avance';  form.libelle=''">
        <span class="ti">💰</span><span class="tl">Prêt agence</span>
      </button>
      <button class="type-btn" [class.selected]="form.type==='Impot'"   (click)="form.type='Impot';   form.libelle=''">
        <span class="ti">🏛️</span><span class="tl">Impôt/Taxe</span>
      </button>
      <button class="type-btn" [class.selected]="form.type==='Travaux'" (click)="form.type='Travaux'; form.libelle=''">
        <span class="ti">🔧</span><span class="tl">Travaux</span>
      </button>
      <button class="type-btn" [class.selected]="form.type==='Autre'"   (click)="form.type='Autre';   form.libelle=''">
        <span class="ti">📋</span><span class="tl">Autre</span>
      </button>
    </div>

    <div class="modal-body">

      <!-- PRÊT AGENCE -->
      <ng-container *ngIf="form.type==='Avance'">
        <div class="pret-info-banner">
          <svg viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="1.4"/><path d="M8 7v4M8 5.5v.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
          Le propriétaire emprunte à l'agence. Le remboursement sera <strong>déduit automatiquement</strong> de ses versements mensuels.
        </div>
        <div class="fg">
          <label>Objet du prêt <span class="req">*</span></label>
          <select class="fc" [(ngModel)]="form.libelle" [disabled]="motifsPretLoading">
            <option value="">{{ motifsPretLoading ? "Chargement…" : "— Sélectionner le motif —" }}</option>
            <ng-container *ngFor="let groupe of motifsPretGroupes()">
              <optgroup [label]="groupe.nom">
                <option *ngFor="let m of groupe.motifs" [value]="m.libelle">{{ m.libelle }}</option>
              </optgroup>
            </ng-container>
          </select>
          <span class="fg-hint">Le motif apparaîtra sur les bordereaux de versement.</span>
        </div>
        <div class="two-col">
          <div class="fg">
            <label>Montant du prêt <span class="req">*</span></label>
            <div class="input-sfx"><input type="number" class="fc" [(ngModel)]="form.montant" placeholder="15 000"><span class="sfx">MRU</span></div>
          </div>
          <div class="fg">
            <label>Remboursement / versement <span class="req">*</span></label>
            <div class="input-sfx"><input type="number" class="fc" [(ngModel)]="form.remboursementMensuel" placeholder="3 000"><span class="sfx">MRU</span></div>
          </div>
        </div>
        <div class="avance-preview">
          <div class="ap-title">📅 Aperçu de l'échéancier</div>
          <div class="ap-row"><span>Montant total</span><span class="ap-val">{{ form.montant | number:'1.0-0' }} MRU</span></div>
          <div class="ap-row"><span>Remboursement mensuel</span><span class="ap-val">{{ form.remboursementMensuel | number:'1.0-0' }} MRU</span></div>
          <div class="ap-row"><span>Nombre de mois</span><span class="ap-val violet fw-bold">{{ dureeAvance() }} mois</span></div>
          <div class="ap-row" *ngIf="dureeAvance() > 0"><span>Amputé du versement dès approbation</span><span class="ap-val">−{{ form.remboursementMensuel | number:'1.0-0' }} MRU/versement</span></div>
        </div>
        <div class="fg"><label>Notes</label><textarea class="fc" [(ngModel)]="form.notes" rows="2" style="resize:none" placeholder="Raison de l'avance…"></textarea></div>
      </ng-container>

      <!-- IMPÔT -->
      <ng-container *ngIf="form.type==='Impot'">
        <div class="two-col">
          <div class="fg">
            <label>Type de taxe <span class="req">*</span></label>
            <select class="fc" [(ngModel)]="form.libelle">
              <option value="">— Sélectionner —</option>
              <option>Impôt foncier</option><option>Taxe d'habitation</option><option>TNB</option><option>Autre taxe</option>
            </select>
          </div>
          <div class="fg">
            <label>Montant <span class="req">*</span></label>
            <div class="input-sfx"><input type="number" class="fc" [(ngModel)]="form.montant" placeholder="5 000"><span class="sfx">MRU</span></div>
          </div>
        </div>
        <div class="two-col">
          <div class="fg"><label>Référence / N° avis</label><input type="text" class="fc" [(ngModel)]="form.reference" placeholder="IMP-26-XXXX"></div>
          <div class="fg">
            <label>Période</label>
            <select class="fc" [(ngModel)]="form.periodeMois">
              <option value="">— Période —</option>
              <option value="T1-2026">T1 2026</option><option value="T2-2026">T2 2026</option><option value="annuel-2026">Annuel 2026</option>
            </select>
          </div>
        </div>
        <div class="fg"><label>Notes</label><textarea class="fc" [(ngModel)]="form.notes" rows="2" style="resize:none" placeholder="Précisions…"></textarea></div>
      </ng-container>

      <!-- TRAVAUX -->
      <ng-container *ngIf="form.type==='Travaux'">
        <div class="travaux-import">
          <div class="ti-title">🔧 Chantiers disponibles <span class="ti-hint">Cochez pour inclure</span></div>
          <div class="ti-item" *ngFor="let ch of feuille?.chantiersDisponibles">
            <input type="checkbox" class="ti-chk" [checked]="chantierSelectionne(ch.id)" (change)="toggleChantier(ch)">
            <div class="ti-info"><div class="ti-nom">{{ ch.libelle }}</div><div class="ti-sub">{{ ch.proprieteLibelle }} · #{{ ch.numero }}</div></div>
            <span class="ti-val">{{ ch.montant | number:'1.0-0' }} MRU</span>
          </div>
          <div class="ti-empty" *ngIf="!feuille?.chantiersDisponibles?.length">Aucun chantier réceptionné non imputé</div>
        </div>
        <div class="note-info">ℹ️ Seuls les chantiers réceptionnés peuvent être imputés.</div>
      </ng-container>

      <!-- AUTRE -->
      <ng-container *ngIf="form.type==='Autre'">
        <div class="fg"><label>Libellé <span class="req">*</span></label><input type="text" class="fc" [(ngModel)]="form.libelle" placeholder="Assurance multirisque, frais de syndic…"></div>
        <div class="two-col">
          <div class="fg"><label>Montant <span class="req">*</span></label><div class="input-sfx"><input type="number" class="fc" [(ngModel)]="form.montant" placeholder="3 200"><span class="sfx">MRU</span></div></div>
          <div class="fg"><label>Fréquence</label><select class="fc" [(ngModel)]="form.reference"><option>Ponctuelle</option><option>Mensuelle</option><option>Annuelle</option></select></div>
        </div>
        <div class="fg"><label>Notes</label><textarea class="fc" [(ngModel)]="form.notes" rows="2" style="resize:none" placeholder="Précisions…"></textarea></div>
      </ng-container>

    </div>

    <div class="modal-footer">
      <button class="btn btn-secondary" (click)="closeModal()">Annuler</button>
      <button class="btn btn-gold" (click)="soumettre()" [disabled]="!formValide()">Soumettre à validation →</button>
    </div>
  </div>
</div>

<!-- Toast -->
<div class="toast" [class.show]="toastMsg">{{ toastMsg }}</div>
  `,
  styles: [`
    :host {
      --navy:#0E1C38; --navy-m:#1A2F52; --gold:#C9A96E; --gold-d:#8B6914;
      --red:#DC2626; --red-bg:#FEF2F2; --green:#16A34A; --green-bg:#F0FDF4;
      --amber:#D97706; --amber-bg:#FFFBEB; --blue:#2563EB; --blue-bg:#EFF6FF;
      --violet:#7C3AED; --violet-bg:#F5F3FF; --muted:#64748B;
      --border:#E2E8F0; --surf:#F8FAFC; --surf2:#F1F5F9;
      --shadow:0 2px 10px rgba(14,28,56,.07); --r:12px;
    }
    .selector-bar { display:flex; align-items:center; gap:14px; background:#fff; border-radius:var(--r); padding:14px 18px; margin-bottom:20px; box-shadow:var(--shadow); flex-wrap:wrap; border:1px solid #e8edf5; }
    .sel-avatar { width:46px; height:46px; border-radius:12px; flex-shrink:0; background:linear-gradient(135deg,var(--navy),var(--navy-m)); display:flex; align-items:center; justify-content:center; font-weight:700; font-size:15px; color:var(--gold); }
    .sel-info { flex:1; min-width:160px; }
    .sel-nom { font-weight:700; font-size:14px; color:var(--navy); }
    .sel-meta { font-size:11px; color:var(--muted); margin-top:2px; }
    .sel-ctrl { padding:8px 12px; border:1.5px solid var(--border); border-radius:9px; font-size:13px; color:var(--navy); background:var(--surf2); font-family:inherit; }
    .sel-ctrl:focus { outline:none; border-color:var(--navy); }
    .rev-card { background:var(--navy); border-radius:var(--r); padding:22px 26px; margin-bottom:20px; position:relative; overflow:hidden; box-shadow:0 8px 32px rgba(14,28,56,.18); }
    .rev-deco1 { position:absolute; right:-50px; top:-50px; width:200px; height:200px; border-radius:50%; background:rgba(201,169,110,.07); pointer-events:none; }
    .rev-deco2 { position:absolute; right:80px; bottom:-60px; width:140px; height:140px; border-radius:50%; background:rgba(255,255,255,.03); pointer-events:none; }
    .rev-top { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:18px; }
    .rev-eyebrow { font-size:10px; font-weight:700; letter-spacing:1.5px; color:rgba(255,255,255,.4); text-transform:uppercase; }
    .rev-period { font-size:13px; font-weight:600; color:var(--gold); margin-top:3px; }
    .rev-status-badge { font-size:11px; font-weight:700; padding:4px 12px; border-radius:20px; background:rgba(255,255,255,.1); color:rgba(255,255,255,.7); }
    .rev-status-badge.badge-ok { background:rgba(22,163,74,.25); color:#86EFAC; }
    .rev-grid { display:grid; grid-template-columns:1fr 1px 1fr 1px 1fr; margin-bottom:18px; }
    .rev-divider { background:rgba(255,255,255,.1); }
    .rev-col { padding:0 22px; }
    .rev-col:first-child { padding-left:0; }
    .rev-lbl { font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:.8px; color:rgba(255,255,255,.4); margin-bottom:5px; }
    .rev-val { font-size:22px; font-weight:800; color:#fff; }
    .rev-val.red { color:#FCA5A5; }
    .rev-val.gold { color:var(--gold); }
    .rev-unit { font-size:11px; color:rgba(255,255,255,.35); margin-top:3px; }
    .rev-breakdown { display:flex; gap:20px; flex-wrap:wrap; padding-top:16px; border-top:1px solid rgba(255,255,255,.08); }
    .rev-line { display:flex; align-items:center; gap:7px; font-size:12px; color:rgba(255,255,255,.55); }
    .rev-line.net { color:rgba(255,255,255,.8); }
    .rev-dot { width:6px; height:6px; border-radius:50%; flex-shrink:0; }
    .rev-montant { font-family:monospace; font-size:12px; color:rgba(255,255,255,.75); font-weight:600; }
    .rev-montant.neg { color:#FCA5A5; }
    .rev-montant.gold { color:var(--gold); font-weight:700; }
    .vp-card { background:#fff; border-radius:var(--r); padding:18px 20px; box-shadow:var(--shadow); border:1.5px solid var(--amber); margin-bottom:18px; }
    .vp-header { display:flex; align-items:center; gap:10px; margin-bottom:12px; }
    .vp-ico { font-size:22px; }
    .vp-title { font-size:13px; font-weight:700; color:var(--navy); }
    .vp-sub { font-size:11px; color:var(--muted); }
    .vp-count { margin-left:auto; background:var(--amber-bg); color:var(--amber); padding:3px 10px; border-radius:20px; font-size:11px; font-weight:700; flex-shrink:0; }
    .vp-header-text { flex:1; }
    .vp-list { display:flex; flex-direction:column; gap:8px; }
    .vp-item { display:flex; align-items:center; gap:10px; padding:10px 14px; background:var(--amber-bg); border-radius:9px; border:1px solid rgba(217,119,6,.15); }
    .vp-type-ico { font-size:18px; flex-shrink:0; }
    .vp-body { flex:1; min-width:0; }
    .vp-item-title { font-size:13px; font-weight:600; color:var(--navy); }
    .vp-meta { font-size:11px; color:var(--muted); }
    .vp-montant { font-family:monospace; font-size:13px; font-weight:700; color:var(--red); flex-shrink:0; }
    .tabs-bar { display:flex; gap:4px; background:#fff; border-radius:var(--r); padding:5px; box-shadow:var(--shadow); margin-bottom:16px; border:1px solid #e8edf5; }
    .tab-btn { flex:1; padding:9px 10px; border-radius:9px; border:none; background:none; font-family:inherit; font-size:13px; font-weight:600; color:var(--muted); cursor:pointer; transition:all .18s; display:flex; align-items:center; justify-content:center; gap:6px; }
    .tab-btn.active { background:var(--navy); color:var(--gold); }
    .tab-chip { min-width:18px; height:18px; padding:0 5px; border-radius:9px; font-size:10px; font-weight:700; display:inline-flex; align-items:center; justify-content:center; background:rgba(0,0,0,.06); }
    .tab-btn.active .tab-chip { background:rgba(255,255,255,.15); }
    .tab-chip.warn { background:var(--amber-bg); color:var(--amber); }
    .travaux-banner { display:flex; align-items:center; gap:10px; padding:11px 16px; background:var(--blue-bg); border-radius:10px; border:1px solid rgba(37,99,235,.15); margin-bottom:14px; font-size:20px; }
    .tb-title { font-size:13px; font-weight:700; color:var(--blue); }
    .tb-sub { font-size:11px; color:rgba(37,99,235,.6); }
    .tb-total { margin-left:auto; font-family:monospace; font-size:14px; font-weight:700; color:var(--blue); }
    .charges-list { display:flex; flex-direction:column; gap:10px; margin-bottom:20px; }
    .charge-card { background:#fff; border-radius:var(--r); padding:15px 18px; box-shadow:var(--shadow); border:1px solid #e8edf5; border-left:4px solid transparent; display:flex; align-items:center; gap:14px; transition:all .18s; }
    .charge-card:hover { box-shadow:0 4px 20px rgba(14,28,56,.11); transform:translateX(2px); }
    .cc-enattente { border-left-color:var(--amber); }
    .cc-approuvee  { border-left-color:var(--green); }
    .cc-refusee    { border-left-color:var(--red); }
    .cc-travaux    { border-left-color:var(--blue); }
    .cc-icon { width:42px; height:42px; border-radius:11px; flex-shrink:0; display:flex; align-items:center; justify-content:center; font-size:19px; }
    .ic-avance  { background:var(--violet-bg); }
    .ic-impot   { background:var(--amber-bg); }
    .ic-travaux { background:var(--blue-bg); }
    .ic-autre   { background:var(--surf2); }
    .cc-body { flex:1; min-width:0; }
    .cc-title { font-size:13px; font-weight:700; color:var(--navy); margin-bottom:3px; }
    .cc-meta { font-size:11.5px; color:var(--muted); display:flex; flex-wrap:wrap; gap:8px; align-items:center; }
    .cc-tag { display:inline-flex; align-items:center; gap:3px; padding:1px 7px; border-radius:10px; font-size:10.5px; font-weight:600; }
    .tag-avance  { background:var(--violet-bg); color:var(--violet); }
    .tag-impot   { background:var(--amber-bg);  color:var(--amber);  }
    .tag-travaux { background:var(--blue-bg);   color:var(--blue);   }
    .tag-autre   { background:var(--surf2);     color:var(--muted);  }
    .cc-avance { font-size:11px; color:var(--muted); margin-top:3px; }
    .cc-motif  { font-size:11px; color:var(--red); margin-top:3px; }
    .cc-right { text-align:right; flex-shrink:0; }
    .cc-montant { font-family:monospace; font-size:14px; font-weight:700; color:var(--red); white-space:nowrap; }
    .statut-badge { display:inline-flex; align-items:center; gap:4px; padding:2px 8px; border-radius:20px; font-size:10.5px; font-weight:700; margin-top:4px; white-space:nowrap; }
    .sb-enattente { background:var(--amber-bg); color:var(--amber); }
    .sb-approuvee { background:var(--green-bg); color:var(--green); }
    .sb-refusee   { background:var(--red-bg);   color:var(--red);   }
    .sb-dot { width:5px; height:5px; border-radius:50%; background:currentColor; }
    .row-actions { display:flex; gap:5px; flex-shrink:0; }
    .btn-action { width:30px; height:30px; border:none; border-radius:7px; cursor:pointer; display:flex; align-items:center; justify-content:center; transition:opacity .15s; background:var(--surf2); color:var(--muted); }
    .btn-action .mi { font-size:16px; }
    .btn-action:hover { opacity:.8; }
    .btn-valider { background:var(--green-bg); color:#065f46; }
    .btn-rejeter { background:var(--red-bg);   color:#991b1b; }
    .recap-card { background:#fff; border-radius:var(--r); padding:18px 22px; box-shadow:var(--shadow); border:1px solid #e8edf5; }
    .recap-title { font-size:13px; font-weight:700; color:var(--navy); margin-bottom:12px; padding-bottom:10px; border-bottom:2px solid var(--surf2); }
    .recap-row { display:flex; justify-content:space-between; align-items:center; padding:7px 0; border-bottom:1px solid var(--surf); font-size:13px; }
    .recap-row:last-child { border:none; }
    .recap-row.pending { background:var(--amber-bg); margin:4px -4px; padding:7px 4px; border-radius:6px; border:none; }
    .recap-row.total { border-top:2px solid var(--navy); margin-top:4px; }
    .recap-lbl { color:var(--muted); }
    .recap-lbl.bold { color:var(--navy); font-weight:700; }
    .recap-val { font-family:monospace; font-weight:600; color:var(--navy); }
    .recap-val.red   { color:var(--red); }
    .recap-val.amber { color:var(--amber); }
    .recap-val.gold  { color:var(--gold-d); font-size:16px; font-weight:800; font-family:inherit; }
    .empty-state { text-align:center; padding:40px; background:#fff; border-radius:var(--r); box-shadow:var(--shadow); border:1px solid #e8edf5; }
    .empty-state.big { padding:64px; }
    .empty-title { font-size:14px; font-weight:600; color:#334155; margin-top:10px; }
    .empty-sub { font-size:12px; color:var(--muted); margin-top:4px; }
    .modal-overlay { position:fixed; inset:0; background:rgba(14,28,56,.55); backdrop-filter:blur(5px); z-index:1000; display:flex; align-items:center; justify-content:center; padding:20px; opacity:0; pointer-events:none; transition:opacity .25s; }
    .modal-overlay.open { opacity:1; pointer-events:all; }
    .modal { background:#fff; border-radius:18px; width:100%; max-width:510px; max-height:92vh; overflow-y:auto; box-shadow:0 24px 70px rgba(14,28,56,.22); transform:translateY(16px) scale(.98); transition:transform .27s; }
    .modal-overlay.open .modal { transform:translateY(0) scale(1); }
    .modal-hdr { padding:20px 22px 16px; background:linear-gradient(135deg,var(--navy),var(--navy-m)); border-radius:18px 18px 0 0; display:flex; align-items:center; gap:12px; }
    .modal-icon { font-size:22px; }
    .modal-hdr-text { flex:1; }
    .modal-title { font-size:15px; font-weight:700; color:var(--gold); }
    .modal-sub { font-size:11px; color:rgba(255,255,255,.4); margin-top:2px; }
    .close-btn { width:28px; height:28px; border-radius:7px; border:none; background:rgba(255,255,255,.1); color:rgba(255,255,255,.6); cursor:pointer; font-size:14px; display:flex; align-items:center; justify-content:center; transition:all .15s; }
    .close-btn:hover { background:rgba(220,38,38,.35); color:#fff; }
    .type-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:8px; padding:18px 20px 0; }
    .type-btn { display:flex; flex-direction:column; align-items:center; gap:5px; padding:12px 8px; border-radius:11px; border:2px solid var(--border); background:#fff; cursor:pointer; transition:all .18s; font-family:inherit; }
    .type-btn:hover { border-color:var(--gold); }
    .type-btn.selected { border-color:var(--navy); background:rgba(14,28,56,.04); }
    .type-btn .ti { font-size:20px; }
    .type-btn .tl { font-size:11px; font-weight:700; color:var(--muted); }
    .type-btn.selected .tl { color:var(--navy); }
    .modal-body { padding:18px 20px; }
    .fg { display:flex; flex-direction:column; gap:4px; margin-bottom:12px; }
    .fg label { font-size:11.5px; font-weight:700; color:var(--navy); }
    .req { color:var(--red); }
    .fc { padding:9px 12px; border:1.5px solid var(--border); border-radius:9px; font-size:13px; color:var(--navy); font-family:inherit; outline:none; transition:border-color .18s; background:#fff; width:100%; box-sizing:border-box; }
    .fc:focus { border-color:var(--gold); box-shadow:0 0 0 3px rgba(201,169,110,.1); }
    .two-col { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
    .input-sfx { display:flex; align-items:center; border:1.5px solid var(--border); border-radius:9px; overflow:hidden; transition:border-color .18s; background:#fff; }
    .input-sfx:focus-within { border-color:var(--gold); box-shadow:0 0 0 3px rgba(201,169,110,.1); }
    .input-sfx .fc { border:none; box-shadow:none; flex:1; border-radius:0; }
    .sfx { padding:0 11px; background:var(--surf2); color:var(--muted); font-size:11px; font-weight:700; border-left:1px solid var(--border); display:flex; align-items:center; white-space:nowrap; }
    .pret-info-banner { display:flex; align-items:flex-start; gap:9px; background:#eff6ff; border:1px solid #bfdbfe; border-radius:9px; padding:11px 13px; margin-bottom:12px; font-size:12.5px; color:#1e40af; line-height:1.5; }
    .pret-info-banner svg { width:15px; height:15px; flex-shrink:0; margin-top:1px; color:#1d4ed8; }
    .pret-info-banner strong { font-weight:700; }
    .fg-hint { font-size:11px; color:#94a3b8; margin-top:3px; }
    .fg-link { color:var(--blue, #1d4ed8); cursor:pointer; text-decoration:underline; margin-left:6px; }
    .avance-nb-mois { display:flex; align-items:center; gap:10px; background:var(--violet-bg); border:1px solid rgba(124,58,237,.15); border-radius:8px; padding:10px 14px; }
    .nb-mois-val { font-size:24px; font-weight:800; color:var(--violet); line-height:1; }
    .nb-mois-lbl { font-size:13px; font-weight:600; color:var(--violet); }
    .nb-mois-detail { font-size:11.5px; color:#64748b; margin-left:auto; }
    .fw-bold { font-weight:800 !important; }
    .avance-preview { background:var(--violet-bg); border-radius:10px; padding:11px 14px; border:1px solid rgba(124,58,237,.12); margin-bottom:12px; }
    .ap-title { font-size:11.5px; font-weight:700; color:var(--violet); margin-bottom:7px; }
    .ap-row { display:flex; justify-content:space-between; font-size:12px; padding:3px 0; color:var(--muted); }
    .ap-val { font-family:monospace; font-weight:600; color:var(--navy); }
    .ap-val.violet { color:var(--violet); }
    .travaux-import { background:var(--blue-bg); border-radius:10px; padding:12px 14px; border:1px solid rgba(37,99,235,.12); margin-bottom:12px; }
    .ti-title { font-size:11.5px; font-weight:700; color:var(--blue); margin-bottom:8px; display:flex; justify-content:space-between; }
    .ti-hint { font-size:10px; font-weight:400; color:rgba(37,99,235,.6); }
    .ti-item { display:flex; align-items:center; gap:8px; padding:6px 0; border-bottom:1px solid rgba(37,99,235,.08); font-size:12px; }
    .ti-item:last-child { border:none; }
    .ti-chk { accent-color:var(--blue); cursor:pointer; }
    .ti-info { flex:1; }
    .ti-nom { font-weight:600; color:var(--navy); }
    .ti-sub { font-size:10px; color:var(--muted); }
    .ti-val { font-family:monospace; font-weight:700; color:var(--blue); }
    .ti-empty { font-size:12px; color:var(--muted); text-align:center; padding:10px 0; }
    .note-info { background:var(--blue-bg); border-radius:9px; padding:9px 12px; font-size:11.5px; color:var(--blue); border:1px solid rgba(37,99,235,.12); }
    .modal-footer { padding:12px 20px; border-top:1px solid var(--surf2); background:var(--surf); border-radius:0 0 18px 18px; display:flex; justify-content:flex-end; gap:8px; }
    .toast { position:fixed; bottom:24px; right:24px; background:var(--navy); color:#fff; padding:11px 17px; border-radius:11px; font-size:13px; font-weight:500; box-shadow:0 6px 24px rgba(14,28,56,.3); opacity:0; transform:translateY(8px); transition:all .25s; pointer-events:none; z-index:9999; }
    .toast.show { opacity:1; transform:translateY(0); }
    @media(max-width:900px) {
      .rev-grid { grid-template-columns:1fr 1fr; }
      .rev-divider { display:none; }
      .type-grid { grid-template-columns:1fr 1fr; }
      .two-col { grid-template-columns:1fr; }
      .tabs-bar { flex-wrap:wrap; }
    }
  `]
})
export class ChargesProprietaireComponent implements OnInit {
  private svc       = inject(ChargesProprietaireService);
  private motifsSvc = inject(MotifsPretService);
  private auth = inject(AuthService);
  private proprietairesSvc = inject(ProprietairesService);

  feuille: FeuilleChargesDto | null = null;
  proprietaires: { id: string; nom: string }[] = [];
  proprietaireId = '';
  periodeMois    = this.currentMonth();
  onglet         = 'all';
  toastMsg       = '';
  modalOpen      = false;

  form: any = this.resetForm();
  selectedChantiers: { id: string; montant: number }[] = [];

  motifsPret:        MotifPretDto[] = [];
  motifsPretLoading  = false;
  readonly MOTIFS_FALLBACK: MotifPretDto[] = [
    { id: '1',  groupe: 'Travaux & Réparations', libelle: 'Avance travaux urgents (toiture)',       ordre: 10 },
    { id: '2',  groupe: 'Travaux & Réparations', libelle: 'Avance travaux urgents (plomberie)',     ordre: 20 },
    { id: '3',  groupe: 'Travaux & Réparations', libelle: 'Avance travaux urgents (électricité)',   ordre: 30 },
    { id: '4',  groupe: 'Travaux & Réparations', libelle: 'Avance travaux urgents (climatisation)', ordre: 40 },
    { id: '5',  groupe: 'Travaux & Réparations', libelle: 'Avance travaux de rénovation',           ordre: 50 },
    { id: '6',  groupe: 'Travaux & Réparations', libelle: 'Avance remplacement équipement',         ordre: 60 },
    { id: '7',  groupe: 'Travaux & Aménagement', libelle: 'Avance branchement eau',                 ordre: 10 },
    { id: '8',  groupe: 'Travaux & Aménagement', libelle: 'Avance branchement électricité',         ordre: 20 },
    { id: '9',  groupe: 'Travaux & Aménagement', libelle: 'Avance permis de construire',            ordre: 30 },
    { id: '10', groupe: 'Trésorerie & Fiscal',   libelle: 'Avance sur loyers futurs',               ordre: 10 },
    { id: '11', groupe: 'Trésorerie & Fiscal',   libelle: 'Avance dépannage trésorerie',            ordre: 20 },
    { id: '12', groupe: 'Trésorerie & Fiscal',   libelle: 'Avance règlement impôt foncier',         ordre: 30 },
    { id: '13', groupe: 'Trésorerie & Fiscal',   libelle: 'Avance règlement taxe habitation',       ordre: 40 },
    { id: '14', groupe: 'Trésorerie & Fiscal',   libelle: 'Avance frais notaire / juridiques',      ordre: 50 },
    { id: '15', groupe: 'Charges courantes',     libelle: 'Avance charges de copropriété',          ordre: 10 },
    { id: '16', groupe: 'Charges courantes',     libelle: 'Avance assurance immeuble',              ordre: 20 },
    { id: '17', groupe: 'Charges courantes',     libelle: 'Avance frais de gardiennage',            ordre: 30 },
    { id: '18', groupe: 'Charges courantes',     libelle: 'Avance entretien espaces communs',       ordre: 40 },
  ];

  motifsPretGroupes(): { nom: string; motifs: MotifPretDto[] }[] {
    const groupes = [...new Set(this.motifsPret.map(m => m.groupe))];
    return groupes.map(nom => ({ nom, motifs: this.motifsPret.filter(m => m.groupe === nom) }));
  }

  ouvrirGestionMotifs() {
    // Navigation vers la page paramètres > motifs (à implémenter)
    alert('Gestion des motifs disponible dans Paramètres > Motifs de prêt');
  }

ngOnInit(): void {
  this.motifsPretLoading = true;
  this.motifsSvc.getAll().subscribe({
    next:  (m: MotifPretDto[]) => { this.motifsPret = m.length ? m : this.MOTIFS_FALLBACK; this.motifsPretLoading = false; },
    error: ()                  => { this.motifsPret = this.MOTIFS_FALLBACK;                this.motifsPretLoading = false; }
  });
  this.proprietairesSvc.getAll(1, 100).subscribe({
    next: (r: any) => {
      this.proprietaires = r.items.map((p: any) => ({ id: p.id, nom: p.nomComplet ?? p.nom }));
    },
    error: () => {
      this.showToast('❌ Erreur chargement propriétaires');
    }
  });
}
  load(): void {
  
  if (!this.proprietaireId) {
    return;
  }
  
  this.svc.getFeuille(this.proprietaireId, this.periodeMois).subscribe({
    next: (f: FeuilleChargesDto) => {
      this.feuille = f;
    },
    error: () => {
      this.showToast('❌ Erreur chargement');
    }
  });

}

  selectedNom(): string { return this.proprietaires.find(p => p.id === this.proprietaireId)?.nom ?? ''; }

//   chargesFiltrees(): ChargeProprietaireDto[] {
//     if (!this.feuille) return [];
//     return this.onglet === 'all' ? this.feuille.charges
//       : this.feuille.charges.filter(c => c.type === this.onglet);
//   }
chargesFiltrees(): ChargeProprietaireDto[] {
  if (!this.feuille?.charges) return [];

  return this.onglet === 'all'
    ? this.feuille.charges
    : this.feuille.charges.filter((c: ChargeProprietaireDto) => c.type === this.onglet);
}
//   chargesApprouvees(): ChargeProprietaireDto[]  { return this.feuille?.charges.filter(c => c.statut === 'Approuvee')  ?? []; }
//   chargesEnAttente():  ChargeProprietaireDto[]  { return this.feuille?.charges.filter(c => c.statut === 'EnAttente')  ?? []; }
//   nbType(t: string): number    { return this.feuille?.charges.filter(c => c.type === t).length ?? 0; }
//   totalType(t: string): number { return this.feuille?.charges.filter(c => c.type === t).reduce((s, c) => s + c.montant, 0) ?? 0; }
  
  chargesApprouvees(): ChargeProprietaireDto[] {
  return (this.feuille?.charges ?? []).filter((c: ChargeProprietaireDto) => c.statut === 'Approuvee');
}

chargesEnAttente(): ChargeProprietaireDto[] {
  return (this.feuille?.charges ?? []).filter((c: ChargeProprietaireDto) => c.statut === 'EnAttente');
}

nbType(t: string): number {
  return (this.feuille?.charges ?? []).filter((c: ChargeProprietaireDto) => c.type === t).length;
}

totalType(t: string): number {
  return (this.feuille?.charges ?? [])
    .filter((c: ChargeProprietaireDto) => c.type === t)
    .reduce((s: number, c: ChargeProprietaireDto) => s + c.montant, 0);
}
  
  totalDeductions(): number    { return this.chargesApprouvees().reduce((s, c) => s + c.montant, 0) + (this.feuille?.commission ?? 0); }
  totalEnAttente(): number     { return this.chargesEnAttente().reduce((s, c) => s + c.montant, 0); }

  approuver(c: ChargeProprietaireDto) {
    this.svc.approuver(c.id).subscribe({ next: () => { this.load(); this.showToast('✅ Charge approuvée'); }, error: () => this.showToast('❌ Erreur') });
  }
  refuserAvecMotif(c: ChargeProprietaireDto) {
    const m = prompt('Motif du refus :'); if (!m) return;
    this.svc.refuser(c.id, m).subscribe({ next: () => { this.load(); this.showToast('❌ Charge refusée'); }, error: () => this.showToast('❌ Erreur') });
  }

  openModal()  { this.form = this.resetForm(); this.selectedChantiers = []; this.modalOpen = true; }
  closeModal() { this.modalOpen = false; }
  closeOnOverlay(e: Event) { if ((e.target as HTMLElement).classList.contains('modal-overlay')) this.closeModal(); }

  soumettre() {
    if (!this.formValide()) return;
    if (this.form.type === 'Travaux') {
      this.selectedChantiers.forEach(ch =>
        this.svc.creer({ ...this.form, chantierOrigineId: ch.id, montant: ch.montant, proprietaireId: this.proprietaireId })
          .subscribe({ next: () => this.load(), error: () => this.showToast('❌ Erreur') })
      );
    } else {
      const payload = this.form.type === 'Avance'
        ? {
            type:                 this.form.type,
            libelle:              this.form.libelle,
            montant:              this.form.montant,
            remboursementMensuel: this.form.remboursementMensuel,
            notes:                this.form.notes,
            proprietaireId:       this.proprietaireId
          }
        : { ...this.form, proprietaireId: this.proprietaireId };
      this.svc.creer(payload)
        .subscribe({ next: () => this.load(), error: () => this.showToast('❌ Erreur') });
    }
    this.closeModal();
    this.showToast('📨 Charge soumise à validation Direction');
  }

  formValide(): boolean {
    if (this.form.type === 'Travaux') return this.selectedChantiers.length > 0;
    if (this.form.type === 'Avance')
      return !!(this.form.montant > 0 && this.form.libelle && this.form.remboursementMensuel > 0);
    return !!(this.form.montant > 0 && (this.form.libelle || this.form.locataireId));
  }

  dureeAvance(): number {
    const t = +this.form.montant || 0, m = +this.form.remboursementMensuel || 0;
    return m > 0 ? Math.ceil(t / m) : 0;
  }

  chantierSelectionne(id: string): boolean { return this.selectedChantiers.some(c => c.id === id); }
  toggleChantier(ch: any) {
    const i = this.selectedChantiers.findIndex(c => c.id === ch.id);
    if (i >= 0) this.selectedChantiers.splice(i, 1); else this.selectedChantiers.push({ id: ch.id, montant: ch.montant });
    this.selectedChantiers = [...this.selectedChantiers];
  }

  typeIcon(t: string): string   { return ({ Avance: '💰', Impot: '🏛️', Travaux: '🔧', Autre: '📋' } as any)[t] ?? '📋'; }
  typeLabel(t: string): string  { return ({ Avance: 'Avance', Impot: 'Impôt/Taxe', Travaux: 'Travaux', Autre: 'Autre charge' } as any)[t] ?? t; }
  statutLabel(s: string): string { return ({ EnAttente: 'En attente', Approuvee: 'Approuvé', Refusee: 'Refusé' } as any)[s] ?? s; }
  dotColor(type: string): string {
    return ({ loyers: '#86EFAC', commission: '#FCA5A5', travaux: '#93C5FD', impot: '#FDE68A', avance: '#DDD6FE', autre: '#FCA5A5', net: '#C9A96E' } as any)[type] ?? '#FCA5A5';
  }
  periodeMoisLabel(): string {
    try { const [y, m] = this.periodeMois.split('-'); return new Date(+y, +m - 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }); }
    catch { return this.periodeMois; }
  }
  initiales(nom: string): string { return nom ? nom.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase() : '?'; }
  currentMonth(): string { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; }
  isDirection(): boolean { return this.auth.isDirection(); }
  showToast(msg: string) { this.toastMsg = msg; setTimeout(() => this.toastMsg = '', 3200); }
  resetForm() { return { type: 'Avance' as TypeCharge, libelle: '', montant: 0, notes: '', reference: '', locataireId: '', remboursementMensuel: 0, periodeMois: '' }; }
}