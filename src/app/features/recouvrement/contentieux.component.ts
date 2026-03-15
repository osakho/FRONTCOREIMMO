import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RecouvrementService } from '../../core/services/api.services';


// ── Types locaux ────────────────────────────────────────────────────────────
type PhaseProcedure = 'Relances' | 'MiseEnDemeure' | 'Commandement' | 'Assignation' | 'Jugement' | 'Expulsion';

const PHASES: PhaseProcedure[] = ['Relances', 'MiseEnDemeure', 'Commandement', 'Assignation', 'Jugement', 'Expulsion'];

interface DossierContentieux {
  // Champs de DossierRecouvrementDto (redéclarés pour éviter le extends)
  contratId:        string;
  contratNumero:    string;
  locataireId:      string;
  locataireNom:     string;
  locataireTel:     string;
  produitCode:      string;
  proprieteLibelle: string;
  loyer:            number;
  montantDu:        number;
  joursRetard:      number;
  derniereRelance?: string;
  etape:            string;
  loading?:         boolean;
  // Champs enrichis
  phaseActuelle:    PhaseProcedure;
  niveauLabel:      string;
  niveauCouleur:    'modere' | 'eleve' | 'critique';
  phaseLabel:       string;
  audienceDate?:    string;
  avocat?:          string;
  tribunal?:        string;
}

@Component({
  selector: 'kdi-contentieux',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `

<!-- ══ PAGE ══ -->
<div class="cx-page">

  <!-- HEADER -->
  <div class="cx-header">
    <div class="cx-header-left">
      <div class="cx-title-row">
        <h1 class="cx-title">Gestion <span class="cx-title-acc">Contentieux</span></h1>
      </div>
      <h2 class="cx-sub-title">Contentieux locatif</h2>
      <p class="cx-sub">Gestion des procédures judiciaires et expulsions</p>
    </div>
    <div class="cx-header-actions">
      <button class="btn-outline">📋 Rapport juridique</button>
      <button class="btn-primary" (click)="ouvrirNouveauDossier()">＋ Ouvrir dossier</button>
    </div>
  </div>

  <!-- ALERTE AUDIENCE -->
  <div class="alert-audience" *ngIf="prochAudience()">
    <div class="aa-icon">⚖️</div>
    <div class="aa-body">
      <div class="aa-title">Audience programmée le {{ prochAudience()!.audienceDate }} — {{ prochAudience()!.tribunal || 'Tribunal compétent' }}</div>
      <div class="aa-sub">Dossier {{ prochAudience()!.locataireNom }} — Pensez à préparer les pièces justificatives.</div>
    </div>
  </div>

  <!-- FILTRES -->
  <div class="cx-filters">
    <div class="cx-search">
      <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="9" cy="9" r="6"/><path d="M15 15l3 3"/>
      </svg>
      <input [(ngModel)]="search" placeholder="Rechercher un dossier…" />
      <button *ngIf="search" (click)="search=''" class="cx-clr">✕</button>
    </div>
    <div class="cx-phase-chips">
      <button class="px-chip" [class.active]="filtrePhase()===''"
              (click)="filtrePhase.set('')">Tous <span class="cnt">{{ dossiers().length }}</span></button>
      <button *ngFor="let p of phasesFiltre" class="px-chip"
              [class.active]="filtrePhase()===p.val"
              (click)="filtrePhase.set(p.val)">
        {{ p.lbl }}
        <span class="cnt" *ngIf="countPhase(p.val)>0">{{ countPhase(p.val) }}</span>
      </button>
    </div>
  </div>

  <!-- LOADING -->
  <div class="cx-loading" *ngIf="loading()">
    <div class="cx-spinner"></div>
    <span>Chargement des dossiers…</span>
  </div>

  <!-- VIDE -->
  <div class="cx-empty" *ngIf="!loading() && !dossiersAffiches().length">
    <div class="ce-icon">⚖️</div>
    <div class="ce-title">Aucun dossier contentieux</div>
    <div class="ce-sub">Les dossiers en phase contentieux (>90 jours) apparaîtront ici</div>
  </div>

  <!-- LISTE DOSSIERS -->
  <div class="cx-list" *ngIf="!loading() && dossiersAffiches().length">
    <div *ngFor="let d of dossiersAffiches()" class="dossier-card"
         [class.critique]="d.niveauCouleur==='critique'"
         [class.eleve]="d.niveauCouleur==='eleve'">

      <!-- Card Header -->
      <div class="dc-head">
        <div class="dc-head-left">
          <div class="dc-avatar">{{ initiales(d.locataireNom) }}</div>
          <div>
            <div class="dc-nom">{{ d.locataireNom }}</div>
            <div class="dc-loc">
              <svg width="11" height="11" viewBox="0 0 20 20" fill="currentColor">
                <path d="M10 2C7.2 2 5 4.2 5 7c0 4.2 5 11 5 11s5-6.8 5-11c0-2.8-2.2-5-5-5zm0 6.8c-1 0-1.8-.8-1.8-1.8s.8-1.8 1.8-1.8 1.8.8 1.8 1.8-.8 1.8-1.8 1.8z"/>
              </svg>
              {{ d.produitCode }} — {{ d.proprieteLibelle }}
            </div>
          </div>
        </div>
        <div class="dc-montant">
          <div class="dc-mnt">{{ formatMontant(d.montantDu) }}</div>
          <div class="dc-mnt-lbl">Cumul impayés</div>
        </div>
      </div>

      <!-- Badges statut -->
      <div class="dc-badges">
        <span class="badge-phase" [attr.data-p]="phaseKey(d.phaseActuelle)">
          📋 {{ d.phaseLabel }}
        </span>
        <span class="badge-jours">
          <svg width="11" height="11" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="4" width="14" height="13" rx="1.5"/><line x1="3" y1="8" x2="17" y2="8"/>
            <line x1="7" y1="2" x2="7" y2="5"/><line x1="13" y1="2" x2="13" y2="5"/>
          </svg>
          Depuis {{ d.joursRetard }} jours
        </span>
        <span class="badge-niveau" [attr.data-n]="d.niveauCouleur">
          ● {{ d.niveauLabel }}
        </span>
        <span class="badge-audience" *ngIf="d.audienceDate">
          📅 Audience : {{ d.audienceDate }}
        </span>
      </div>

      <!-- Timeline procédure -->
      <div class="timeline-wrap">
        <div class="timeline">
          <ng-container *ngFor="let phase of phases; let i=index">
            <!-- Ligne connecteur -->
            <div *ngIf="i>0" class="tl-line"
                 [class.done]="phaseIndex(d.phaseActuelle)>=i"
                 [class.active]="phaseIndex(d.phaseActuelle)===i"></div>

            <!-- Nœud -->
            <div class="tl-node-wrap">
              <div class="tl-node"
                   [class.done]="phaseIndex(d.phaseActuelle)>i"
                   [class.active]="phaseIndex(d.phaseActuelle)===i"
                   [class.pending]="phaseIndex(d.phaseActuelle)<i"
                   [class.danger]="phase.key==='Expulsion'">
                <span *ngIf="phaseIndex(d.phaseActuelle)>i">✓</span>
                <span *ngIf="phaseIndex(d.phaseActuelle)===i" class="tl-ico">{{ phase.ico }}</span>
                <span *ngIf="phaseIndex(d.phaseActuelle)<i && phase.key!=='Expulsion'" class="tl-ico-p">{{ phase.ico }}</span>
                <span *ngIf="phase.key==='Expulsion' && phaseIndex(d.phaseActuelle)<i" class="tl-ico-e">🚫</span>
              </div>
              <div class="tl-lbl" [class.active]="phaseIndex(d.phaseActuelle)===i">{{ phase.lbl }}</div>
            </div>
          </ng-container>
        </div>
      </div>

      <!-- Actions contextuelles -->
      <div class="dc-actions">
        <button class="act-btn ghost" (click)="voirPieces(d)">
          <svg width="13" height="13" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8">
            <path d="M14 2H6a1 1 0 00-1 1v14a1 1 0 001 1h8a1 1 0 001-1V5.5L14 2zM14 2v3.5H17.5"/>
          </svg>
          Voir pièces
        </button>
        <button class="act-btn teal" (click)="accordAmiable(d)">
          <svg width="13" height="13" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8">
            <path d="M7 9l2.5 2.5L15 6"/><rect x="3" y="3" width="14" height="14" rx="2"/>
          </svg>
          Accord amiable
        </button>
        <!-- Actions selon phase -->
        <ng-container [ngSwitch]="d.phaseActuelle">
          <button *ngSwitchCase="'Assignation'" class="act-btn gold" (click)="preparerAudience(d)">
            <svg width="13" height="13" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8">
              <circle cx="10" cy="10" r="7.5"/><line x1="10" y1="7" x2="10" y2="11"/>
              <circle cx="10" cy="13.5" r=".8" fill="currentColor" stroke="none"/>
            </svg>
            Préparer audience
          </button>
          <button *ngSwitchCase="'Assignation'" class="act-btn purple" (click)="contacterAvocat(d)">
            <svg width="13" height="13" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8">
              <path d="M16 14c0 1-2.2 3-3 3-4 0-9-5-9-9 0-.8 2-3 3-3l2 4-1.5 1.5S9 12 11 14l1.5-1.5L16 14z"/>
            </svg>
            Contacter avocat
          </button>
          <button *ngSwitchCase="'Commandement'" class="act-btn danger" (click)="preparerAssignation(d)">
            <svg width="13" height="13" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8">
              <path d="M10 2l2.4 5 5.6.8-4 3.9.9 5.5L10 14.8l-4.9 2.4.9-5.5L2 7.8l5.6-.8L10 2z"/>
            </svg>
            Préparer assignation
          </button>
          <button *ngSwitchCase="'MiseEnDemeure'" class="act-btn warn" (click)="commanderPayer(d)">
            <svg width="13" height="13" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8">
              <path d="M4 2h8l4 4v12a1 1 0 01-1 1H4a1 1 0 01-1-1V3a1 1 0 011-1z"/>
            </svg>
            Commandement de payer
          </button>
          <button *ngSwitchCase="'Relances'" class="act-btn warn" (click)="envoyerMED(d)">
            <svg width="13" height="13" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8">
              <path d="M3 4l7 7 7-7M3 4h14v12H3V4z"/>
            </svg>
            Relancer
          </button>
        </ng-container>
      </div>

    </div>
  </div>

</div>

<!-- ══ MODAL NOUVEAU DOSSIER ══ -->
<div class="cx-ov" [class.open]="showModal()" (click)="closeOv($event)">
  <div class="cx-modal" (click)="$event.stopPropagation()">
    <div class="cxm-hd">
      <div class="cxm-hd-l">
        <div class="cxm-ico">⚖️</div>
        <div>
          <div class="cxm-title">Ouvrir un dossier contentieux</div>
          <div class="cxm-sub">Escalade procédurale d'un dossier recouvrement</div>
        </div>
      </div>
      <button class="cxm-close" (click)="showModal.set(false)">✕</button>
    </div>
    <div class="cxm-body">
      <div class="cxm-info">
        <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="10" cy="10" r="7.5"/><line x1="10" y1="7" x2="10" y2="11"/>
          <circle cx="10" cy="13.5" r=".8" fill="currentColor" stroke="none"/>
        </svg>
        Fonctionnalité disponible dans la prochaine version. Contactez votre administrateur pour ouvrir manuellement un dossier.
      </div>
    </div>
    <div class="cxm-foot">
      <button class="btn-ghost" (click)="showModal.set(false)">Fermer</button>
    </div>
  </div>
</div>

  `,
  styles: [`
    :host {
      --gold:    #C9A84C;
      --gold-l:  #E8C96A;
      --gold-d:  #8B6914;
      --ink:     #0D1321;
      --ink-mid: #1A1A2E;
      --ink-soft:#2D2D4A;
      --cream:   #F8F4ED;
      --cream-dk:#EDE8DF;
      --muted:   #8A8899;
      --ok:      #1A7A4A;
      --ok-bg:   #E6F5EE;
      --teal:    #0891B2;
      --teal-bg: #ECFEFF;
      --warn:    #D4850A;
      --warn-bg: #FEF3E2;
      --danger:  #C0392B;
      --danger-bg:#FDECEA;
      --purple:  #6D28D9;
      --purple-bg:#F5F3FF;
      --r: 14px;
      display: block;
    }

    /* ── PAGE ── */
    .cx-page { max-width: 1100px; margin: 0 auto; }

    /* ── HEADER ── */
    .cx-header {
      display: flex; justify-content: space-between; align-items: flex-start;
      margin-bottom: 8px; gap: 16px; flex-wrap: wrap;
    }
    .cx-title-row { display: flex; align-items: center; gap: 10px; }
    .cx-title {
      font-size: 26px; font-weight: 900; color: var(--ink-mid);
      font-family: 'Playfair Display', Georgia, serif; margin: 0 0 2px;
    }
    .cx-title-acc { color: #C0392B; }
    .cx-sub-title {
      font-size: 20px; font-weight: 700; color: var(--ink-mid);
      font-family: 'Playfair Display', Georgia, serif; margin: 0 0 4px;
    }
    .cx-sub { font-size: 13px; color: var(--muted); margin: 0; }
    .cx-header-actions { display: flex; gap: 10px; flex-shrink: 0; align-items: center; padding-top: 6px; }
    .btn-outline {
      padding: 9px 18px; border-radius: 9px; border: 1.5px solid var(--cream-dk);
      background: #fff; color: var(--ink-soft); font-size: 13px; font-weight: 600;
      cursor: pointer; font-family: inherit; transition: all .15s;
    }
    .btn-outline:hover { border-color: var(--ink-mid); color: var(--ink-mid); }
    .btn-primary {
      padding: 9px 20px; border-radius: 9px; background: var(--danger);
      color: #fff; border: none; font-size: 13px; font-weight: 700;
      cursor: pointer; font-family: inherit; transition: box-shadow .15s;
    }
    .btn-primary:hover { box-shadow: 0 4px 14px rgba(192,57,43,.35); }

    /* ── ALERTE AUDIENCE ── */
    .alert-audience {
      display: flex; align-items: flex-start; gap: 12px;
      background: #FFF5F5; border: 1.5px solid #FCA5A5;
      border-left: 4px solid var(--danger);
      border-radius: 10px; padding: 14px 18px; margin-bottom: 20px;
    }
    .aa-icon { font-size: 20px; flex-shrink: 0; margin-top: 1px; }
    .aa-title { font-size: 13.5px; font-weight: 700; color: var(--danger); }
    .aa-sub   { font-size: 12.5px; color: #7F1D1D; margin-top: 3px; }

    /* ── FILTRES ── */
    .cx-filters {
      display: flex; align-items: center; justify-content: space-between;
      gap: 12px; flex-wrap: wrap; margin-bottom: 18px;
    }
    .cx-search {
      display: flex; align-items: center; gap: 8px;
      background: #fff; border: 1.5px solid var(--cream-dk);
      border-radius: 9px; padding: 8px 12px; min-width: 220px;
      transition: border-color .18s;
    }
    .cx-search:focus-within { border-color: var(--gold); }
    .cx-search svg { color: var(--muted); flex-shrink: 0; }
    .cx-search input { border: none; outline: none; font-size: 13px; font-family: inherit; flex: 1; background: transparent; }
    .cx-search input::placeholder { color: var(--muted); }
    .cx-clr { background: none; border: none; cursor: pointer; color: var(--muted); font-size: 12px; }
    .cx-phase-chips { display: flex; gap: 7px; flex-wrap: wrap; }
    .px-chip {
      padding: 6px 12px; border-radius: 20px; border: 1.5px solid var(--cream-dk);
      background: #fff; color: var(--muted); font-size: 12px; font-weight: 600;
      cursor: pointer; font-family: inherit; transition: all .14s;
      display: flex; align-items: center; gap: 6px;
    }
    .px-chip.active { background: var(--ink-mid); color: var(--gold-l); border-color: var(--ink-mid); }
    .px-chip:not(.active):hover { border-color: var(--danger); color: var(--danger); }
    .cnt {
      background: rgba(192,57,43,.12); color: var(--danger);
      font-size: 10.5px; font-weight: 800;
      padding: 1px 6px; border-radius: 10px;
    }
    .px-chip.active .cnt { background: rgba(255,255,255,.15); color: var(--gold-l); }

    /* ── LOADING / VIDE ── */
    .cx-loading { display: flex; align-items: center; justify-content: center; gap: 12px; padding: 60px; color: var(--muted); font-size: 14px; }
    .cx-spinner { width: 26px; height: 26px; border: 3px solid var(--cream-dk); border-top-color: var(--ink-mid); border-radius: 50%; animation: spin .8s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .cx-empty { text-align: center; padding: 70px 20px; }
    .ce-icon { font-size: 48px; margin-bottom: 12px; }
    .ce-title { font-size: 18px; font-weight: 700; color: var(--ink-mid); margin-bottom: 6px; }
    .ce-sub { font-size: 13px; color: var(--muted); }

    /* ── LISTE ── */
    .cx-list { display: flex; flex-direction: column; gap: 14px; }

    /* ── DOSSIER CARD ── */
    .dossier-card {
      background: #fff; border-radius: var(--r); padding: 22px 24px 18px;
      border: 1.5px solid var(--cream-dk);
      box-shadow: 0 2px 12px rgba(0,0,0,.06);
      transition: box-shadow .18s;
    }
    .dossier-card:hover { box-shadow: 0 6px 24px rgba(0,0,0,.1); }
    .dossier-card.critique { border-color: rgba(192,57,43,.3); }
    .dossier-card.eleve    { border-color: rgba(212,133,10,.25); }

    /* ── Card Head ── */
    .dc-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
    .dc-head-left { display: flex; align-items: center; gap: 12px; }
    .dc-avatar {
      width: 42px; height: 42px; border-radius: 11px; flex-shrink: 0;
      background: linear-gradient(135deg, var(--ink-mid), var(--ink-soft));
      color: var(--gold-l); font-size: 15px; font-weight: 800;
      display: flex; align-items: center; justify-content: center;
      font-family: 'Playfair Display', Georgia, serif;
    }
    .dc-nom { font-size: 16px; font-weight: 800; color: var(--ink-mid); font-family: 'Playfair Display', Georgia, serif; }
    .dc-loc { font-size: 12px; color: var(--muted); display: flex; align-items: center; gap: 4px; margin-top: 3px; }
    .dc-montant { text-align: right; flex-shrink: 0; }
    .dc-mnt {
      font-size: 20px; font-weight: 900; color: var(--danger);
      font-family: 'Playfair Display', Georgia, serif; letter-spacing: .5px;
    }
    .dc-mnt-lbl { font-size: 10.5px; color: var(--muted); text-align: right; margin-top: 2px; }

    /* ── Badges ── */
    .dc-badges { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 18px; }
    .badge-phase {
      padding: 4px 11px; border-radius: 6px; font-size: 12px; font-weight: 700;
    }
    .badge-phase[data-p="Assignation"],
    .badge-phase[data-p="Jugement"],
    .badge-phase[data-p="Expulsion"] {
      background: rgba(192,57,43,.1); color: var(--danger); border: 1px solid rgba(192,57,43,.2);
    }
    .badge-phase[data-p="Commandement"] {
      background: rgba(212,133,10,.1); color: var(--warn); border: 1px solid rgba(212,133,10,.2);
    }
    .badge-phase[data-p="MiseEnDemeure"] {
      background: rgba(109,40,217,.1); color: var(--purple); border: 1px solid rgba(109,40,217,.2);
    }
    .badge-phase[data-p="Relances"] {
      background: rgba(8,145,178,.1); color: var(--teal); border: 1px solid rgba(8,145,178,.2);
    }
    .badge-jours {
      display: flex; align-items: center; gap: 5px;
      padding: 4px 11px; border-radius: 6px; font-size: 12px; font-weight: 600;
      background: var(--cream); color: var(--muted); border: 1px solid var(--cream-dk);
    }
    .badge-niveau {
      padding: 4px 11px; border-radius: 6px; font-size: 12px; font-weight: 700;
    }
    .badge-niveau[data-n="critique"] { background: rgba(192,57,43,.1); color: var(--danger); }
    .badge-niveau[data-n="eleve"]    { background: rgba(212,133,10,.1); color: var(--warn);   }
    .badge-niveau[data-n="modere"]   { background: rgba(201,168,76,.1); color: var(--gold-d); }
    .badge-audience {
      padding: 4px 11px; border-radius: 6px; font-size: 12px; font-weight: 700;
      background: rgba(29,78,216,.1); color: #1D4ED8; border: 1px solid rgba(29,78,216,.2);
    }

    /* ── TIMELINE ── */
    .timeline-wrap {
      background: var(--cream); border-radius: 10px;
      padding: 18px 24px; margin-bottom: 14px;
      overflow-x: auto;
    }
    .timeline {
      display: flex; align-items: flex-start;
      min-width: 480px;
    }
    .tl-line {
      flex: 1; height: 3px; background: var(--cream-dk);
      margin-top: 17px; border-radius: 2px; transition: background .3s;
    }
    .tl-line.done   { background: var(--gold); }
    .tl-line.active { background: linear-gradient(90deg, var(--gold), var(--cream-dk)); }

    .tl-node-wrap {
      display: flex; flex-direction: column; align-items: center;
      gap: 7px; flex-shrink: 0;
    }
    .tl-node {
      width: 36px; height: 36px; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      font-size: 14px; font-weight: 700; transition: all .2s;
    }
    .tl-node.done    { background: var(--gold); color: #fff; box-shadow: 0 0 0 3px rgba(201,168,76,.2); }
    .tl-node.active  { background: var(--ink-mid); color: var(--gold-l); box-shadow: 0 0 0 4px rgba(26,26,46,.2); }
    .tl-node.pending { background: #fff; border: 2px solid var(--cream-dk); color: var(--muted); }
    .tl-node.danger.pending { border-color: rgba(192,57,43,.3); }

    .tl-ico   { font-size: 16px; }
    .tl-ico-p { font-size: 14px; color: var(--muted); opacity: .5; }
    .tl-ico-e { font-size: 14px; opacity: .4; }

    .tl-lbl {
      font-size: 11px; font-weight: 600; color: var(--muted);
      text-align: center; white-space: nowrap; max-width: 80px;
    }
    .tl-lbl.active { color: var(--ink-mid); font-weight: 800; }

    /* ── ACTIONS ── */
    .dc-actions { display: flex; gap: 8px; flex-wrap: wrap; }
    .act-btn {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 7px 14px; border-radius: 8px; font-size: 12.5px; font-weight: 700;
      cursor: pointer; font-family: inherit; border: 1.5px solid transparent;
      transition: all .14s;
    }
    .act-btn.ghost  { background: var(--cream); color: var(--ink-soft); border-color: var(--cream-dk); }
    .act-btn.ghost:hover { background: var(--cream-dk); }
    .act-btn.teal   { background: var(--teal-bg); color: var(--teal); border-color: rgba(8,145,178,.2); }
    .act-btn.teal:hover { background: rgba(8,145,178,.12); }
    .act-btn.gold   { background: rgba(201,168,76,.1); color: var(--gold-d); border-color: rgba(201,168,76,.2); }
    .act-btn.gold:hover { background: rgba(201,168,76,.2); }
    .act-btn.purple { background: var(--purple-bg); color: var(--purple); border-color: rgba(109,40,217,.2); }
    .act-btn.purple:hover { background: rgba(109,40,217,.1); }
    .act-btn.danger { background: var(--danger-bg); color: var(--danger); border-color: rgba(192,57,43,.2); }
    .act-btn.danger:hover { background: rgba(192,57,43,.12); }
    .act-btn.warn   { background: var(--warn-bg); color: var(--warn); border-color: rgba(212,133,10,.2); }
    .act-btn.warn:hover { background: rgba(212,133,10,.12); }

    /* ── MODAL ── */
    .cx-ov {
      position: fixed; inset: 0; background: rgba(13,13,13,.6);
      backdrop-filter: blur(4px); z-index: 1000;
      display: flex; align-items: center; justify-content: center; padding: 20px;
      opacity: 0; pointer-events: none; transition: opacity .22s;
    }
    .cx-ov.open { opacity: 1; pointer-events: all; }
    .cx-modal {
      background: #fff; border-radius: 16px; width: 100%; max-width: 480px;
      box-shadow: 0 24px 80px rgba(0,0,0,.2);
      transform: translateY(14px) scale(.97); transition: transform .22s;
      overflow: hidden;
    }
    .cx-ov.open .cx-modal { transform: translateY(0) scale(1); }
    .cxm-hd {
      padding: 18px 22px 14px;
      background: linear-gradient(135deg, var(--ink-mid), var(--ink-soft));
      display: flex; align-items: center; justify-content: space-between;
    }
    .cxm-hd-l { display: flex; align-items: center; gap: 12px; }
    .cxm-ico {
      width: 40px; height: 40px; border-radius: 10px;
      background: rgba(201,168,76,.18); border: 1.5px solid rgba(201,168,76,.3);
      display: flex; align-items: center; justify-content: center; font-size: 19px;
    }
    .cxm-title { font-size: 15px; font-weight: 700; color: var(--gold-l); font-family: 'Playfair Display', Georgia, serif; }
    .cxm-sub   { font-size: 11.5px; color: rgba(255,255,255,.4); margin-top: 2px; }
    .cxm-close {
      width: 28px; height: 28px; border-radius: 7px; border: none;
      background: rgba(255,255,255,.1); color: rgba(255,255,255,.6);
      font-size: 13px; cursor: pointer;
    }
    .cxm-body { padding: 20px 22px; }
    .cxm-info {
      display: flex; align-items: flex-start; gap: 10px;
      background: rgba(29,78,216,.06); border: 1px solid rgba(29,78,216,.15);
      border-radius: 8px; padding: 12px 14px; font-size: 13px; color: #1D4ED8;
    }
    .cxm-foot {
      padding: 12px 22px 16px; border-top: 1px solid var(--cream-dk);
      display: flex; justify-content: flex-end;
    }
    .btn-ghost {
      background: none; border: none; cursor: pointer; font-size: 13px;
      color: var(--muted); padding: 8px; font-family: inherit;
    }

    @media(max-width: 768px) {
      .cx-header { flex-direction: column; }
      .dc-head { flex-direction: column; align-items: flex-start; gap: 8px; }
      .dc-montant { text-align: left; }
      .timeline-wrap { padding: 14px 12px; }
    }
  `]
})
export class ContentieuxComponent implements OnInit {
  private svc = inject(RecouvrementService);

  dossiers   = signal<DossierContentieux[]>([]);
  loading    = signal(true);
  filtrePhase = signal('');
  search     = '';
  showModal  = signal(false);

  phases = [
    { key: 'Relances',      lbl: 'Relances',        ico: '📩' },
    { key: 'MiseEnDemeure', lbl: 'Mise en\ndemeure', ico: '📋' },
    { key: 'Commandement',  lbl: 'Commandement',    ico: '📜' },
    { key: 'Assignation',   lbl: 'Assignation',     ico: '⚖️' },
    { key: 'Jugement',      lbl: 'Jugement',        ico: '🏛️' },
    { key: 'Expulsion',     lbl: 'Expulsion',       ico: '🚪' },
  ];

  phasesFiltre = [
    { val: 'MiseEnDemeure', lbl: 'Mise en demeure' },
    { val: 'Commandement',  lbl: 'Commandement' },
    { val: 'Assignation',   lbl: 'Assignation' },
    { val: 'Jugement',      lbl: 'Jugement' },
    { val: 'Expulsion',     lbl: 'Expulsion' },
  ];

  dossiersAffiches = computed(() => {
    let l = [...this.dossiers()];
    if (this.filtrePhase()) l = l.filter(d => d.phaseActuelle === this.filtrePhase());
    if (this.search.trim()) {
      const q = this.search.toLowerCase();
      l = l.filter(d =>
        d.locataireNom.toLowerCase().includes(q) ||
        d.produitCode.toLowerCase().includes(q)  ||
        d.proprieteLibelle.toLowerCase().includes(q)
      );
    }
    return l;
  });

  prochAudience = computed(() =>
    this.dossiers().find(d => d.audienceDate)
  );

  ngOnInit() { this.charger(); }

  charger() {
    this.loading.set(true);
    (this.svc.getDossiers() as any).subscribe({
      next: (list: any[]) => {
        // On filtre uniquement les dossiers en étape Contentieux
        const contentieux = list
          .filter((d: any) => d.etape === 'Contentieux')
          .map((d: any) => this.enrichir(d));
        this.dossiers.set(contentieux);
        this.loading.set(false);
      },
      error: () => {
        // Données démo si API indisponible
        this.dossiers.set(this.demoData());
        this.loading.set(false);
      }
    });
  }

  private enrichir(d: any): DossierContentieux {
    const phase = this.calcPhase(d.joursRetard);
    return {
      ...d,
      phaseActuelle: phase,
      phaseLabel:    this.phaseLibelle(phase),
      niveauLabel:   this.niveauLibelle(d.joursRetard),
      niveauCouleur: d.joursRetard > 120 ? 'critique' : d.joursRetard > 90 ? 'eleve' : 'modere',
      audienceDate:  undefined,
      avocat:        undefined,
      tribunal:      undefined,
    };
  }

  private calcPhase(jours: number): PhaseProcedure {
    if (jours > 180) return 'Expulsion';
    if (jours > 150) return 'Jugement';
    if (jours > 120) return 'Assignation';
    if (jours > 105) return 'Commandement';
    if (jours > 92)  return 'MiseEnDemeure';
    return 'Relances';
  }

  private phaseLibelle(p: PhaseProcedure): string {
    const m: Record<PhaseProcedure, string> = {
      Relances: 'Relances effectuées', MiseEnDemeure: 'Mise en demeure envoyée',
      Commandement: 'Commandement de payer', Assignation: 'Phase judiciaire',
      Jugement: 'En attente de jugement', Expulsion: 'Procédure d\'expulsion'
    };
    return m[p];
  }

  private niveauLibelle(j: number): string {
    if (j > 120) return 'Niveau 3 — Critique';
    if (j > 90)  return 'Niveau 2 — Élevé';
    return 'Niveau 1 — Modéré';
  }

  phaseIndex(p: PhaseProcedure): number {
    return PHASES.indexOf(p);
  }
  
  phaseKey(p: PhaseProcedure): string { return p; }

  countPhase(phase: string): number {
    return this.dossiers().filter(d => d.phaseActuelle === phase).length;
  }

  formatMontant(m: number): string {
    return m.toLocaleString('fr-FR').replace(/\s/g, '\u00A0') + ' MRU';
  }

  initiales(nom: string): string {
    return nom.trim().split(' ').filter(Boolean).slice(0,2).map(w => w[0]).join('').toUpperCase();
  }

  ouvrirNouveauDossier() { this.showModal.set(true); }
  closeOv(e: Event) {
    if ((e.target as HTMLElement).classList.contains('cx-ov')) this.showModal.set(false);
  }

  voirPieces(d: DossierContentieux)        { alert(`Pièces du dossier : ${d.locataireNom}`); }
  accordAmiable(d: DossierContentieux)     { alert(`Accord amiable : ${d.locataireNom}`); }
  preparerAudience(d: DossierContentieux)  { alert(`Préparer audience : ${d.locataireNom}`); }
  contacterAvocat(d: DossierContentieux)   { alert(`Contacter avocat pour : ${d.locataireNom}`); }
  preparerAssignation(d: DossierContentieux){ alert(`Assignation : ${d.locataireNom}`); }
  commanderPayer(d: DossierContentieux)    { alert(`Commandement de payer : ${d.locataireNom}`); }
  envoyerMED(d: DossierContentieux)        { alert(`Mise en demeure : ${d.locataireNom}`); }

  // Données démo pour développement
  private demoData(): DossierContentieux[] {
    const data: any[] = [
      {
        contratId: '1', contratNumero: 'CTR-001', locataireId: 'L1',
        locataireNom: 'Ibrahima Ba', locataireTel: '+221 77 123 4567',
        produitCode: 'Appt D-01', proprieteLibelle: 'Résidence Djické Bloc D',
        loyer: 55000, montantDu: 220000, joursRetard: 91,
        derniereRelance: '2025-06-15', etape: 'Contentieux', loading: false,
        phaseActuelle: 'Assignation', phaseLabel: 'Phase judiciaire',
        niveauLabel: 'Niveau 3 — Critique', niveauCouleur: 'critique',
        audienceDate: '18/07/2025', avocat: 'Me Diallo', tribunal: 'Tribunal de Dakar'
      },
      {
        contratId: '2', contratNumero: 'CTR-002', locataireId: 'L2',
        locataireNom: 'Pape Mbaye', locataireTel: '+221 77 234 5678',
        produitCode: 'Local D-05', proprieteLibelle: 'Zone commerciale Djické',
        loyer: 80000, montantDu: 320000, joursRetard: 78,
        derniereRelance: '2025-06-20', etape: 'Contentieux', loading: false,
        phaseActuelle: 'Commandement', phaseLabel: 'Commandement de payer',
        niveauLabel: 'Niveau 2 — Élevé', niveauCouleur: 'eleve',
        audienceDate: undefined
      },
      {
        contratId: '3', contratNumero: 'CTR-003', locataireId: 'L3',
        locataireNom: 'Rokhaya Gaye', locataireTel: '+221 77 345 6789',
        produitCode: 'Villa B-07', proprieteLibelle: 'Résidence Djické Bloc B',
        loyer: 62500, montantDu: 250000, joursRetard: 52,
        derniereRelance: '2025-07-01', etape: 'Contentieux', loading: false,
        phaseActuelle: 'MiseEnDemeure', phaseLabel: 'Mise en demeure envoyée',
        niveauLabel: 'Niveau 1 — Modéré', niveauCouleur: 'modere',
        audienceDate: undefined
      }
    ];
    return data as DossierContentieux[];
  }
}