import { Component, inject, OnInit, OnDestroy, signal, NgZone } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ContratsGestionService, AuthService, ProprietesService } from '../../../core/services/api.services';
import { ContratGestionDto, PagedList, StatutContrat } from '../../../core/models/models';
import { kdiConfirm } from '../../../core/utils/confirm-modal';

@Component({
  selector: 'kdi-contrats-gestion-list',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  template: `
<div class="page-enter">

  <!-- ══ HEADER ══ -->
  <div class="cg-header">
    <div class="cg-header-left">
      <h1 class="cg-title">
        <svg class="cg-title-ico" viewBox="0 0 20 20" fill="currentColor">
          <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"/>
          <path fill-rule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3z" clip-rule="evenodd"/>
        </svg>
        Contrats de gestion
      </h1>
      <p class="cg-sub">Mandats de gestion agence ↔ propriétaire — Accès Direction</p>
    </div>
    <button class="cg-btn-new" (click)="ouvrirModal()">
      <svg viewBox="0 0 16 16" fill="currentColor"><path d="M8 2a1 1 0 011 1v4h4a1 1 0 010 2H9v4a1 1 0 01-2 0V9H3a1 1 0 010-2h4V3a1 1 0 011-1z"/></svg>
      Nouveau contrat
    </button>
  </div>

  <!-- ══ FILTRES ══ -->
  <div class="cg-filters">
    <button class="cg-chip" [class.active]="filtreStatut===''"          (click)="setFiltre('')">Tous les statuts</button>
    <button class="cg-chip draft"    [class.active]="filtreStatut==='Brouillon'" (click)="setFiltre('Brouillon')">
      <span class="cg-dot"></span>Brouillon
    </button>
    <button class="cg-chip act"     [class.active]="filtreStatut==='Actif'"     (click)="setFiltre('Actif')">
      <span class="cg-dot"></span>Actif
    </button>
    <button class="cg-chip suspend"  [class.active]="filtreStatut==='Suspendu'"  (click)="setFiltre('Suspendu')">
      <span class="cg-dot"></span>Suspendu
    </button>
    <button class="cg-chip ended"    [class.active]="filtreStatut==='Termine'"   (click)="setFiltre('Termine')">
      <span class="cg-dot"></span>Terminé
    </button>
  </div>

  <!-- ══ TABLEAU ══ -->
  <div class="cg-table-wrap">
    <table *ngIf="liste().items.length; else empty">
      <thead>
        <tr>
          <th>N° Contrat</th>
          <th>Propriété</th>
          <th>Période</th>
          <th class="r" *ngIf="isDirection()">Commission</th>
          <th class="c">Checklist</th>
          <th class="c">Statut</th>
          <th class="r">Actions</th>
        </tr>
      </thead>
      <tbody>
        <tr *ngFor="let c of liste().items; let i=index" [style.animation-delay]="(i*25)+'ms'">

          <!-- N° contrat -->
          <td>
            <span class="cg-num">{{ c.numero }}</span>
          </td>

          <!-- Propriété -->
          <td>
            <div class="prop-cell">
              <div class="prop-icon">🏘</div>
              <div class="prop-nom">{{ c.proprieteLibelle }}</div>
            </div>
          </td>

          <!-- Période -->
          <td>
            <div class="period-cell">
              <span class="period-start">{{ c.dateDebut | date:'dd MMM yyyy' }}</span>
              <span class="period-arrow" *ngIf="c.dateFin">
                <svg viewBox="0 0 16 8" fill="none"><path d="M0 4h14M11 1l3 3-3 3" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>
                {{ c.dateFin | date:'dd MMM yyyy' }}
              </span>
              <span class="period-open" *ngIf="!c.dateFin">Durée indéterminée</span>
            </div>
          </td>

          <!-- Commission -->
          <td class="r" *ngIf="isDirection()">
            <span class="commission-val">{{ c.tauxCommission * 100 | number:'1.0-1' }}<span class="pct">%</span></span>
          </td>

          <!-- Checklist -->
          <td class="c">
            <div class="checklist">
              <span class="ck-item" [class.ok]="c.docIdentiteOk" title="Document identité">
                <svg viewBox="0 0 14 14" fill="none"><rect x="1" y="2" width="12" height="10" rx="1.5" stroke="currentColor" stroke-width="1.3"/><path d="M4 6h2m-2 2.5h6M8 6h2" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>
                ID
              </span>
              <span class="ck-item" [class.ok]="c.photosEdlOk" title="Photos état des lieux">
                <svg viewBox="0 0 14 14" fill="none"><rect x="1" y="3" width="12" height="9" rx="1.5" stroke="currentColor" stroke-width="1.3"/><circle cx="7" cy="7.5" r="2" stroke="currentColor" stroke-width="1.3"/><path d="M5 3l.8-1.5h2.4L9 3" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>
                EDL
              </span>
              <span class="ck-item" [class.ok]="c.docAutorisationOk" title="Autorisation">
                <svg viewBox="0 0 14 14" fill="none"><path d="M3 2h8a1 1 0 011 1v9a1 1 0 01-1 1H3a1 1 0 01-1-1V3a1 1 0 011-1z" stroke="currentColor" stroke-width="1.3"/><path d="M4 5h6M4 7.5h6M4 10h4" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>
                Auth
              </span>
            </div>
          </td>

          <!-- Statut -->
          <td class="c">
            <span class="cg-statut"
              [class.s-actif]="c.statutLabel==='Actif'"
              [class.s-brouillon]="c.statutLabel==='Brouillon'"
              [class.s-suspendu]="c.statutLabel==='Suspendu'"
              [class.s-termine]="c.statutLabel==='Termine'">
              {{ c.statutLabel }}
            </span>
          </td>

          <!-- Actions -->
          <td>
            <div class="cg-acts">
              <button *ngIf="c.peutEtreActive && c.statutLabel!=='Actif'"
                      class="cg-act-btn green" (click)="activer(c)">
                <svg viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="5.5" stroke="currentColor" stroke-width="1.4"/><path d="M4.5 7l2 2 3-3" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>
                Activer
              </button>
              <button *ngIf="c.statutLabel==='Actif'"
                      class="cg-act-btn blue" (click)="ouvrirAvenant(c)">
                <svg viewBox="0 0 14 14" fill="none"><path d="M9.5 2l2.5 2.5L5 11.5H2.5V9L9.5 2z" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>
                Avenant
              </button>
            </div>
          </td>
        </tr>
      </tbody>
    </table>

    <ng-template #empty>
      <div class="cg-empty">
        <div class="cg-empty-ico">🤝</div>
        <div class="cg-empty-h">Aucun contrat de gestion</div>
        <p class="cg-empty-p">Créez le premier mandat de gestion agence ↔ propriétaire</p>
        <button class="cg-btn-new" (click)="ouvrirModal()">+ Nouveau contrat</button>
      </div>
    </ng-template>
  </div>

</div>
  `,
  styles: [`

    :host {
      --navy:  #0D1B2A; --navy2: #1B2B3A;
      --gold:  #C9A84C; --gold-l: #E8C96A;
      --ok:    #16a34a; --ok-bg: #dcfce7;
      --late:  #dc2626; --late-bg: #fee2e2;
      --blue:  #1d4ed8; --blue-bg: #dbeafe;
      --amber: #d97706; --amber-bg: #fef3c7;
      --surf:  #F5F7FA; --surf2: #EEF1F6; --bord: #E2E8F0;
      --t1: #0F172A; --t2: #475569; --t3: #94a3b8;
      --r: 10px; --r2: 14px;
      --shadow: 0 1px 3px rgba(0,0,0,.07), 0 4px 16px rgba(0,0,0,.05);
      font-family: 'DM Sans','Segoe UI',sans-serif;
      display: block;
    }

    /* HEADER */
    .cg-header { display:flex; align-items:flex-start; justify-content:space-between; margin-bottom:18px; gap:16px; flex-wrap:wrap; }
    .cg-title { display:flex; align-items:center; gap:10px; font-size:21px; font-weight:800; color:var(--t1); margin:0 0 4px; }
    .cg-title-ico { width:22px; height:22px; color:var(--gold); flex-shrink:0; }
    .cg-sub { font-size:12.5px; color:var(--t3); margin:0; }
    .cg-btn-new {
      display:inline-flex; align-items:center; gap:7px;
      padding:10px 18px; background:var(--gold); color:var(--navy);
      border:none; border-radius:var(--r); font-size:13px; font-weight:700;
      cursor:pointer; font-family:inherit; transition:all .18s; white-space:nowrap; flex-shrink:0;
    }
    .cg-btn-new svg { width:14px; height:14px; }
    .cg-btn-new:hover { background:var(--gold-l); box-shadow:0 4px 14px rgba(201,168,76,.4); transform:translateY(-1px); }

    /* FILTRES */
    .cg-filters { display:flex; gap:6px; margin-bottom:16px; flex-wrap:wrap; }
    .cg-chip {
      display:inline-flex; align-items:center; gap:6px;
      padding:7px 14px; border-radius:20px;
      border:1.5px solid var(--bord); background:#fff;
      font-size:12.5px; font-weight:600; color:var(--t2);
      cursor:pointer; transition:all .14s; font-family:inherit;
    }
    .cg-chip:hover:not(.active) { border-color:var(--navy); color:var(--navy); }
    .cg-chip.active { background:var(--navy); color:var(--gold-l); border-color:var(--navy); }
    .cg-dot { width:6px; height:6px; border-radius:50%; background:currentColor; opacity:.6; flex-shrink:0; }
    .cg-chip.draft.active  { background:#64748b; border-color:#64748b; color:#fff; }
    .cg-chip.act.active    { background:var(--ok); border-color:var(--ok); color:#fff; }
    .cg-chip.suspend.active{ background:var(--amber); border-color:var(--amber); color:#fff; }
    .cg-chip.ended.active  { background:var(--late); border-color:var(--late); color:#fff; }

    /* TABLEAU */
    .cg-table-wrap { background:#fff; border-radius:var(--r2); box-shadow:var(--shadow); overflow:hidden; }
    table { width:100%; border-collapse:collapse; }
    thead th {
      padding:11px 14px; background:var(--navy);
      color:rgba(255,255,255,.45); font-size:10.5px; font-weight:700;
      text-transform:uppercase; letter-spacing:.7px; text-align:left; white-space:nowrap;
    }
    th.r { text-align:right; } th.c { text-align:center; }
    tbody tr { border-bottom:1px solid var(--surf2); transition:background .1s; animation:fadeUp .28s ease both; }
    @keyframes fadeUp { from { opacity:0; transform:translateY(5px); } to { opacity:1; transform:none; } }
    tbody tr:last-child { border-bottom:none; }
    tbody tr:hover { background:var(--surf); }
    tbody td { padding:13px 14px; vertical-align:middle; }
    td.r { text-align:right; } td.c { text-align:center; }

    .cg-num { font-family:monospace; font-size:12px; font-weight:700; background:var(--surf2); color:var(--navy); padding:3px 9px; border-radius:6px; white-space:nowrap; }

    .prop-cell { display:flex; align-items:center; gap:9px; }
    .prop-icon { font-size:16px; flex-shrink:0; }
    .prop-nom { font-size:13.5px; font-weight:600; color:var(--t1); }

    .period-cell { display:flex; flex-direction:column; gap:3px; }
    .period-start { font-size:12.5px; font-weight:600; color:var(--t1); }
    .period-arrow { display:flex; align-items:center; gap:5px; font-size:11.5px; color:var(--t3); }
    .period-arrow svg { width:14px; height:7px; color:var(--t3); }
    .period-open { font-size:11px; color:var(--t3); font-style:italic; }

    .commission-val { font-size:15px; font-weight:800; color:var(--t1); }
    .pct { font-size:11px; font-weight:500; color:var(--t3); }

    /* Checklist */
    .checklist { display:flex; gap:5px; justify-content:center; }
    .ck-item {
      display:inline-flex; align-items:center; gap:3px;
      padding:3px 8px; border-radius:6px; font-size:10.5px; font-weight:700;
      background:var(--late-bg); color:var(--late);
      transition:all .14s;
    }
    .ck-item svg { width:11px; height:11px; flex-shrink:0; }
    .ck-item.ok { background:var(--ok-bg); color:var(--ok); }

    /* Statut */
    .cg-statut { display:inline-flex; padding:4px 11px; border-radius:20px; font-size:11.5px; font-weight:700; white-space:nowrap; }
    .s-actif     { background:var(--ok-bg);    color:var(--ok); }
    .s-brouillon { background:var(--surf2);     color:var(--t2); }
    .s-suspendu  { background:var(--amber-bg);  color:var(--amber); }
    .s-termine   { background:var(--late-bg);   color:var(--late); }

    /* Actions */
    .cg-acts { display:flex; align-items:center; gap:5px; justify-content:flex-end; }
    .cg-act-btn {
      display:inline-flex; align-items:center; gap:5px;
      height:30px; padding:0 11px; border-radius:7px;
      border:1.5px solid transparent; font-size:11.5px; font-weight:600;
      cursor:pointer; transition:all .13s; font-family:inherit; white-space:nowrap;
    }
    .cg-act-btn svg { width:12px; height:12px; }
    .cg-act-btn.green { background:var(--ok-bg); color:var(--ok); border-color:#86efac; }
    .cg-act-btn.green:hover { background:var(--ok); color:#fff; border-color:var(--ok); }
    .cg-act-btn.blue  { background:var(--blue-bg); color:var(--blue); border-color:#93c5fd; }
    .cg-act-btn.blue:hover  { background:var(--blue); color:#fff; border-color:var(--blue); }

    /* Empty */
    .cg-empty { text-align:center; padding:60px 20px; }
    .cg-empty-ico { font-size:52px; margin-bottom:14px; }
    .cg-empty-h { font-size:17px; font-weight:700; color:var(--t1); margin-bottom:7px; }
    .cg-empty-p { font-size:13px; color:var(--t3); margin:0 0 18px; }

  `]
})
export class ContratsGestionListComponent implements OnInit, OnDestroy {
  private svc     = inject(ContratsGestionService);
  private auth    = inject(AuthService);
  private propSvc = inject(ProprietesService);
  private zone    = inject(NgZone);
  private route   = inject(ActivatedRoute);

  liste = signal<PagedList<ContratGestionDto>>({
    items:[], totalCount:0, page:1, pageSize:20, totalPages:0, hasNext:false, hasPrevious:false
  });
  filtreStatut = '';

  etape        = 1;
  submitting   = false;
  stepLabels   = ['Propriété & conditions', 'Documents', 'Récapitulatif'];
  propSel:      any   = null;
  propResultats: any[] = [];
  searchProp   = '';
  timer:        any;
  docIdentite:     File | null = null;
  photosEdl:       File[]      = [];
  docAutorisation: File | null = null;
  step1 = { tauxCommission: '' as any, periodicite:'Mensuel', dateDebut: new Date().toISOString().slice(0,10), dateFin:'', conditionsParticulieres:'' };

  avenantContrat: ContratGestionDto | null = null;
  avenantData = { tauxCommission: '' as any, periodicite: '', dateFin: '', conditionsParticulieres: '' };
  avenantDoc:  File | null = null;
  avenantSubmitting = false;

  private overlayEl: HTMLElement | null = null;

  ngOnInit() {
    this.load();
    this.route.queryParams.subscribe((params: Record<string, string>) => {
      const pid = params['proprieteId'], pnom = params['proprieteLibelle'], powner = params['proprietaireNom'] ?? '';
      if (pid && pnom) setTimeout(() => this.ouvrirModalAvecPropriete({ id: pid, libelle: pnom, proprietaireNom: powner }), 150);
    });
  }
  ngOnDestroy() { this.detruireOverlay(); }

  load() {
    this.svc.getAll(1, 20, undefined, this.filtreStatut as StatutContrat || undefined)
      .subscribe(r => this.liste.set(r));
  }
  setFiltre(s: string) { this.filtreStatut = s; this.load(); }
  async activer(c: ContratGestionDto) {
  const ok = await kdiConfirm({
    title:        `Activer le contrat ${c.numero} ?`,
    message:      `Le contrat sera activé pour <strong>${c.proprieteLibelle}</strong>. Cette action est irréversible.`,
    confirmLabel: 'Activer',
    icon:         '✦'
  });
  if (!ok) return;
  this.svc.activer(c.id).subscribe(() => this.load());
}
  isDirection() { return this.auth.isDirection(); }

  ouvrirModal() { this.ouvrirModalAvecPropriete(null); }

  ouvrirModalAvecPropriete(prop: { id: string; libelle: string; proprietaireNom?: string } | null) {
    this.avenantContrat = null;
    this.etape = 1;
    this.propSel = prop ?? null;
    this.propResultats = [];
    this.searchProp = prop ? prop.libelle : '';
    this.docIdentite = null; this.photosEdl = []; this.docAutorisation = null;
    this.step1 = { tauxCommission: '', periodicite:'Mensuel', dateDebut: new Date().toISOString().slice(0,10), dateFin:'', conditionsParticulieres:'' };
    this.detruireOverlay();
    this.overlayEl = this.construireOverlay();
    document.body.appendChild(this.overlayEl);
    document.body.style.overflow = 'hidden';
  }

  ouvrirAvenant(c: ContratGestionDto) {
    this.avenantContrat = c;
    this.avenantData = {
      tauxCommission: c.tauxCommission * 100,
      periodicite: c.periodiciteLabel,
      dateFin: c.dateFin ? new Date(c.dateFin).toISOString().slice(0,10) : '',
      conditionsParticulieres: c.conditionsParticulieres ?? ''
    };
    this.avenantDoc = null;
    this.avenantSubmitting = false;
    this.detruireOverlay();
    this.overlayEl = this.construireOverlayAvenant();
    document.body.appendChild(this.overlayEl);
    document.body.style.overflow = 'hidden';
  }

  fermerModal() { this.detruireOverlay(); document.body.style.overflow = ''; }
  private detruireOverlay() { if (this.overlayEl) { this.overlayEl.remove(); this.overlayEl = null; } }
  private rerender() {
    this.detruireOverlay();
    this.overlayEl = this.avenantContrat ? this.construireOverlayAvenant() : this.construireOverlay();
    document.body.appendChild(this.overlayEl);
  }

  // ════════════════════════════════════════════════════════════
  //  OVERLAY AVENANT
  // ════════════════════════════════════════════════════════════
  private construireOverlayAvenant(): HTMLElement {
    const c = this.avenantContrat!;
    const d = this.avenantData;
    const inp = (id: string, type: string, val: string, ph = '', extra = '') =>
      `<input id="${id}" type="${type}" value="${val}" placeholder="${ph}" ${extra}
        style="padding:8px 11px;border:1.5px solid #e3e8f0;border-radius:7px;font-family:inherit;font-size:.81rem;color:#0e1c38;background:#f2f5fa;width:100%;box-sizing:border-box">`;

    const html = `
      <div style="font-family:'Instrument Sans',sans-serif;position:fixed;inset:0;background:rgba(14,28,56,.55);backdrop-filter:blur(4px);z-index:99999;display:flex;align-items:center;justify-content:center" id="kdi-overlay">
        <div style="background:#fff;border-radius:14px;width:520px;max-width:94vw;max-height:90vh;overflow-y:auto;box-shadow:0 12px 40px rgba(14,28,56,.18);display:flex;flex-direction:column">
          <div style="display:flex;align-items:center;justify-content:space-between;padding:18px 22px 14px;border-bottom:1px solid #e3e8f0;position:sticky;top:0;background:#fff;z-index:2">
            <div style="font-weight:700;font-size:.93rem;color:#0e1c38;display:flex;align-items:center;gap:8px">
              <span style="color:#c9a96e">✦</span>
              Avenant — <span style="font-family:monospace;background:#e8edf5;padding:2px 8px;border-radius:5px;font-size:.82rem">${c.numero}</span>
            </div>
            <button id="kdi-close" style="width:30px;height:30px;border:none;background:#f2f5fa;border-radius:7px;cursor:pointer;font-size:16px">✕</button>
          </div>
          <div style="margin:16px 22px 0;background:#f2f5fa;border:1px solid #e3e8f0;border-radius:8px;padding:10px 14px;font-size:.8rem;display:flex;align-items:center;gap:10px">
            <span style="font-size:18px;color:#c9a96e">🏘</span>
            <div>
              <div style="font-weight:700;color:#0e1c38">${c.proprieteLibelle}</div>
              <div style="color:#8a97b0;font-size:.72rem">Actif depuis le ${new Date(c.dateDebut).toLocaleDateString('fr-FR')}</div>
            </div>
          </div>
          <div style="padding:20px 22px;flex:1;display:flex;flex-direction:column;gap:16px">
            <div style="background:#fffdf5;border:1px solid #fde68a;border-radius:8px;padding:10px 14px;font-size:.76rem;color:#92400e;display:flex;gap:8px">
              <span>⚠️</span><div>Valeurs actuelles pré-remplies — modifiez uniquement ce qui change.</div>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
              <div>
                <label style="font-size:.72rem;font-weight:600;color:#4a5878;display:block;margin-bottom:5px">🔒 Taux de commission (%)</label>
                <div style="position:relative">
                  ${inp('kdi-av-taux','number',String(d.tauxCommission),'','min="0" max="100" step="0.1"')}
                  <span style="position:absolute;right:12px;top:50%;transform:translateY(-50%);color:#8a97b0;font-weight:600">%</span>
                </div>
              </div>
              <div>
                <label style="font-size:.72rem;font-weight:600;color:#4a5878;display:block;margin-bottom:5px">Périodicité</label>
                <select id="kdi-av-perio" style="padding:8px 11px;border:1.5px solid #e3e8f0;border-radius:7px;font-family:inherit;font-size:.81rem;width:100%;background:#f2f5fa">
                  ${['Mensuel','Bimensuel','Trimestriel'].map(v => `<option value="${v}" ${d.periodicite===v?'selected':''}>${v}</option>`).join('')}
                </select>
              </div>
            </div>
            <div>
              <label style="font-size:.72rem;font-weight:600;color:#4a5878;display:block;margin-bottom:5px">Nouvelle date de fin</label>
              ${inp('kdi-av-dfin','date', d.dateFin)}
            </div>
            <div>
              <label style="font-size:.72rem;font-weight:600;color:#4a5878;display:block;margin-bottom:5px">Conditions particulières</label>
              <textarea id="kdi-av-cond" rows="3"
                style="padding:8px 11px;border:1.5px solid #e3e8f0;border-radius:7px;font-family:inherit;font-size:.81rem;width:100%;background:#f2f5fa;resize:vertical;box-sizing:border-box"
                placeholder="Clauses modifiées…">${d.conditionsParticulieres}</textarea>
            </div>
            <div>
              <label style="font-size:.72rem;font-weight:600;color:#4a5878;display:block;margin-bottom:5px">Document avenant signé</label>
              <div id="kdi-av-zone" style="display:flex;align-items:center;justify-content:center;flex-direction:column;gap:4px;border:2px dashed ${this.avenantDoc?'#0d9f5a':'#d0d8e8'};border-radius:8px;padding:14px;cursor:pointer;background:${this.avenantDoc?'#f0fdf4':'#fff'}">
                <span style="font-size:22px;color:${this.avenantDoc?'#0d9f5a':'#b8c2d4'}">${this.avenantDoc?'✓':'📎'}</span>
                <span style="font-size:.75rem;color:${this.avenantDoc?'#0d9f5a':'#8a97b0'}">${this.avenantDoc ? this.avenantDoc.name : 'Cliquer pour joindre'}</span>
                <input id="kdi-av-doc" type="file" accept=".pdf,image/*" style="display:none">
              </div>
            </div>
          </div>
          <div style="display:flex;align-items:center;justify-content:space-between;padding:14px 22px;border-top:1px solid #e3e8f0;background:#f2f5fa;position:sticky;bottom:0;z-index:2">
            <button id="kdi-cancel" style="padding:7px 15px;border-radius:8px;font-family:inherit;font-size:.79rem;cursor:pointer;border:1px solid #e3e8f0;background:#fff;color:#0e1c38">✕ Annuler</button>
            <button id="kdi-submit-av" ${this.avenantSubmitting?'disabled':''} style="padding:7px 18px;border-radius:8px;font-family:inherit;font-size:.79rem;font-weight:600;cursor:pointer;border:none;background:linear-gradient(135deg,#c9a96e,#dfc28e);color:#0e1c38;opacity:${this.avenantSubmitting?'.6':'1'}">
              ✦ ${this.avenantSubmitting ? 'Enregistrement…' : "Enregistrer l'avenant"}
            </button>
          </div>
        </div>
      </div>`;

    const wrapper = document.createElement('div');
    wrapper.innerHTML = html;
    const overlay = wrapper.firstElementChild as HTMLElement;

    overlay.querySelector('#kdi-close')?.addEventListener('click',  () => this.zone.run(() => this.fermerModal()));
    overlay.querySelector('#kdi-cancel')?.addEventListener('click', () => this.zone.run(() => this.fermerModal()));
    overlay.querySelector('#kdi-av-taux')?.addEventListener('input', (e) =>
      this.zone.run(() => { this.avenantData.tauxCommission = (e.target as HTMLInputElement).value; }));
    overlay.querySelector('#kdi-av-perio')?.addEventListener('change', (e) =>
      this.zone.run(() => { this.avenantData.periodicite = (e.target as HTMLSelectElement).value; }));
    overlay.querySelector('#kdi-av-dfin')?.addEventListener('change', (e) =>
      this.zone.run(() => { this.avenantData.dateFin = (e.target as HTMLInputElement).value; }));
    overlay.querySelector('#kdi-av-cond')?.addEventListener('input', (e) =>
      this.zone.run(() => { this.avenantData.conditionsParticulieres = (e.target as HTMLTextAreaElement).value; }));
    overlay.querySelector('#kdi-av-zone')?.addEventListener('click', () =>
      (overlay.querySelector('#kdi-av-doc') as HTMLInputElement)?.click());
    overlay.querySelector('#kdi-av-doc')?.addEventListener('change', (e) =>
      this.zone.run(() => { this.avenantDoc = (e.target as HTMLInputElement).files?.[0] ?? null; this.rerender(); }));
    overlay.querySelector('#kdi-submit-av')?.addEventListener('click', () =>
      this.zone.run(() => this.soumettreAvenant()));

    return overlay;
  }

  soumettreAvenant() {
    if (!this.avenantContrat) return;
    this.avenantSubmitting = true;
    this.rerender();
    const fd = new FormData();
    fd.append('TauxCommission', String(Number(this.avenantData.tauxCommission) / 100));
    fd.append('Periodicite',    this.avenantData.periodicite);
    if (this.avenantData.dateFin)                 fd.append('DateFin',                 this.avenantData.dateFin);
    if (this.avenantData.conditionsParticulieres) fd.append('ConditionsParticulieres', this.avenantData.conditionsParticulieres);
    if (this.avenantDoc)                          fd.append('DocAvenant',              this.avenantDoc);
    // ⚠️ Ajouter creerAvenant() dans ContratsGestionService — voir snippet ci-dessous
    (this.svc as any).creerAvenant(this.avenantContrat.id, fd).subscribe({
      next:  () => { this.avenantSubmitting = false; this.fermerModal(); this.load(); },
      error: () => { this.avenantSubmitting = false; this.rerender(); }
    });
  }

  // ════════════════════════════════════════════════════════════
  //  OVERLAY CRÉATION
  // ════════════════════════════════════════════════════════════
  private construireOverlay(): HTMLElement {
    const e = this.etape;
    const stepperHTML = this.stepLabels.map((label, i) => {
      const n = i + 1, isActive = e === n, isDone = e > n;
      const dotBg    = isDone ? '#0d9f5a' : isActive ? '#0e1c38' : '#e8edf5';
      const dotColor = (isDone || isActive) ? '#fff' : '#8a97b0';
      const lineColor = isDone ? '#0d9f5a' : '#d0d8e8';
      const line = i < 2 ? `<div style="flex:1;height:2px;background:${lineColor};margin:0 6px 18px"></div>` : '';
      return `
        <div style="display:flex;flex-direction:column;align-items:center;gap:4px">
          <div style="width:34px;height:34px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:${dotBg};color:${dotColor};font-weight:700;font-size:13px">${isDone?'✓':n}</div>
          <div style="font-size:10px;color:#8a97b0;text-align:center;width:80px">${label}</div>
        </div>${line}`;
    }).join('');

    const bodyHTML = this.construireBodyHTML();
    const btnPrev  = e > 1
      ? `<button id="kdi-prev" style="padding:7px 15px;border-radius:8px;font-family:inherit;font-size:.79rem;cursor:pointer;border:1px solid #e3e8f0;background:#fff;color:#0e1c38">← Précédent</button>`
      : `<button id="kdi-cancel" style="padding:7px 15px;border-radius:8px;font-family:inherit;font-size:.79rem;cursor:pointer;border:1px solid #e3e8f0;background:#fff;color:#0e1c38">✕ Annuler</button>`;
    const btnNext = e < 3
      ? `<button id="kdi-next" ${!this.etapeValide()?'disabled':''} style="padding:7px 15px;border-radius:8px;font-family:inherit;font-size:.79rem;cursor:pointer;border:none;background:#0e1c38;color:#fff;opacity:${!this.etapeValide()?'.4':'1'}">Suivant →</button>`
      : `<button id="kdi-submit" ${(this.submitting||!this.propSel)?'disabled':''} style="padding:7px 15px;border-radius:8px;font-family:inherit;font-size:.79rem;font-weight:600;cursor:pointer;border:none;background:linear-gradient(135deg,#c9a96e,#dfc28e);color:#0e1c38">🤝 ${this.submitting?'Création…':'Créer le contrat'}</button>`;

    const html = `
      <div style="font-family:'Instrument Sans',sans-serif;position:fixed;inset:0;background:rgba(14,28,56,.55);backdrop-filter:blur(4px);z-index:99999;display:flex;align-items:center;justify-content:center" id="kdi-overlay">
        <div style="background:#fff;border-radius:14px;width:560px;max-width:94vw;max-height:90vh;overflow-y:auto;box-shadow:0 12px 40px rgba(14,28,56,.14);display:flex;flex-direction:column">
          <div style="display:flex;align-items:center;justify-content:space-between;padding:18px 22px 14px;border-bottom:1px solid #e3e8f0;position:sticky;top:0;background:#fff;z-index:2">
            <div style="font-weight:700;font-size:.93rem;color:#0e1c38;display:flex;align-items:center;gap:7px">
              <span style="color:#c9a96e">✦</span> Nouveau contrat de gestion
            </div>
            <button id="kdi-close" style="width:30px;height:30px;border:none;background:#f2f5fa;border-radius:7px;cursor:pointer;font-size:16px">✕</button>
          </div>
          <div style="display:flex;align-items:center;justify-content:center;padding:18px 22px 0">${stepperHTML}</div>
          <div style="padding:20px 22px;flex:1">${bodyHTML}</div>
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

    if (this.etape === 1) {
      overlay.querySelector('#kdi-search-prop')?.addEventListener('input', (e) =>
        this.zone.run(() => this.onSearchPropRaw((e.target as HTMLInputElement).value)));
      overlay.querySelectorAll('[data-prop-id]').forEach(el => {
        const id = (el as HTMLElement).dataset['propId'];
        el.addEventListener('click', () => this.zone.run(() => {
          const p = this.propResultats.find((x: any) => x.id === id);
          if (p) { this.propSel = p; this.propResultats = []; this.rerender(); }
        }));
      });
      overlay.querySelector('#kdi-clear-prop')?.addEventListener('click', () =>
        this.zone.run(() => { this.propSel = null; this.rerender(); }));
      (overlay.querySelector('#kdi-taux') as HTMLInputElement)?.addEventListener('input', (e) =>
        this.zone.run(() => { this.step1.tauxCommission = (e.target as HTMLInputElement).value; }));
      (overlay.querySelector('#kdi-perio') as HTMLSelectElement)?.addEventListener('change', (e) =>
        this.zone.run(() => { this.step1.periodicite = (e.target as HTMLSelectElement).value; }));
      (overlay.querySelector('#kdi-ddeb') as HTMLInputElement)?.addEventListener('change', (e) =>
        this.zone.run(() => { this.step1.dateDebut = (e.target as HTMLInputElement).value; }));
      (overlay.querySelector('#kdi-dfin') as HTMLInputElement)?.addEventListener('change', (e) =>
        this.zone.run(() => { this.step1.dateFin = (e.target as HTMLInputElement).value; }));
      (overlay.querySelector('#kdi-cond') as HTMLTextAreaElement)?.addEventListener('input', (e) =>
        this.zone.run(() => { this.step1.conditionsParticulieres = (e.target as HTMLTextAreaElement).value; }));
    }

    if (this.etape === 2) {
      overlay.querySelector('#kdi-doc-id')?.addEventListener('change', (e) =>
        this.zone.run(() => { this.docIdentite = (e.target as HTMLInputElement).files?.[0] ?? null; this.rerender(); }));
      overlay.querySelector('#kdi-doc-photos')?.addEventListener('change', (e) =>
        this.zone.run(() => { this.photosEdl = Array.from((e.target as HTMLInputElement).files ?? []); this.rerender(); }));
      overlay.querySelector('#kdi-doc-auth')?.addEventListener('change', (e) =>
        this.zone.run(() => { this.docAutorisation = (e.target as HTMLInputElement).files?.[0] ?? null; this.rerender(); }));
      overlay.querySelector('#kdi-zone-id')?.addEventListener('click',     () => (overlay.querySelector('#kdi-doc-id') as HTMLInputElement)?.click());
      overlay.querySelector('#kdi-zone-photos')?.addEventListener('click', () => (overlay.querySelector('#kdi-doc-photos') as HTMLInputElement)?.click());
      overlay.querySelector('#kdi-zone-auth')?.addEventListener('click',   () => (overlay.querySelector('#kdi-doc-auth') as HTMLInputElement)?.click());
    }

    return overlay;
  }

  private construireBodyHTML(): string {
    const inp = (id: string, type: string, val: string, ph = '', extra = '') =>
      `<input id="${id}" type="${type}" value="${val}" placeholder="${ph}" ${extra}
        style="padding:8px 11px;border:1.5px solid #e3e8f0;border-radius:7px;font-family:inherit;font-size:.81rem;color:#0e1c38;background:#f2f5fa;width:100%;box-sizing:border-box">`;

    if (this.etape === 1) {
      const propSearch = !this.propSel ? `
        ${inp('kdi-search-prop','text', this.searchProp,'Rechercher une propriété sans contrat…')}
        <div id='kdi-dropdown-prop'></div>
        <div style="margin-top:5px;font-size:.7rem;color:#8a97b0">ℹ️ Seules les propriétés sans contrat de gestion actif sont proposées</div>
      ` : `
        <div style="display:flex;align-items:center;gap:10px;background:#f2f5fa;border:1px solid #d0d8e8;border-radius:8px;padding:10px 12px">
          <span style="color:#c9a96e">🏘</span>
          <div style="flex:1;font-size:.82rem"><strong>${this.propSel.libelle}</strong> <span style="color:#8a97b0">${this.propSel.proprietaireNom ?? ''}</span></div>
          <button id="kdi-clear-prop" style="border:none;background:none;cursor:pointer;font-size:16px;color:#8a97b0">✕</button>
        </div>`;

      return `
        <div style="font-size:.85rem;font-weight:600;color:#0e1c38;margin-bottom:16px;padding-bottom:10px;border-bottom:1px solid #e3e8f0">Propriété & conditions financières</div>
        <div style="margin-bottom:14px">
          <label style="font-size:.72rem;font-weight:500;color:#4a5878;display:block;margin-bottom:5px">Propriété concernée *</label>
          ${propSearch}
        </div>
        <div style="background:#fffdf5;border:1px solid #fde68a;border-radius:8px;padding:14px;margin-bottom:14px">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
            <span style="font-size:.78rem;font-weight:600;color:#0e1c38">🔒 Conditions financières — CONFIDENTIEL</span>
            <span style="background:#fef3c7;color:#92400e;padding:2px 8px;border-radius:6px;font-size:.68rem;font-weight:600">Direction uniquement</span>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
            <div>
              <label style="font-size:.72rem;font-weight:500;color:#4a5878;display:block;margin-bottom:5px">Taux de commission (%) *</label>
              <div style="position:relative">
                ${inp('kdi-taux','number',String(this.step1.tauxCommission??''),'10','min="0" max="100" step="0.1"')}
                <span style="position:absolute;right:12px;top:50%;transform:translateY(-50%);color:#8a97b0;font-weight:600">%</span>
              </div>
            </div>
            <div>
              <label style="font-size:.72rem;font-weight:500;color:#4a5878;display:block;margin-bottom:5px">Périodicité *</label>
              <select id="kdi-perio" style="padding:8px 11px;border:1.5px solid #e3e8f0;border-radius:7px;font-family:inherit;font-size:.81rem;width:100%;background:#f2f5fa">
                ${['Mensuel','Bimensuel','Trimestriel'].map(v => `<option value="${v}" ${this.step1.periodicite===v?'selected':''}>${v}</option>`).join('')}
              </select>
            </div>
          </div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px">
          <div>
            <label style="font-size:.72rem;font-weight:500;color:#4a5878;display:block;margin-bottom:5px">Date de début *</label>
            ${inp('kdi-ddeb','date',this.step1.dateDebut)}
          </div>
          <div>
            <label style="font-size:.72rem;font-weight:500;color:#4a5878;display:block;margin-bottom:5px">Date de fin (optionnelle)</label>
            ${inp('kdi-dfin','date',this.step1.dateFin)}
          </div>
        </div>
        <div>
          <label style="font-size:.72rem;font-weight:500;color:#4a5878;display:block;margin-bottom:5px">Conditions particulières</label>
          <textarea id="kdi-cond" style="padding:8px 11px;border:1.5px solid #e3e8f0;border-radius:7px;font-family:inherit;font-size:.81rem;width:100%;background:#f2f5fa;resize:vertical;box-sizing:border-box" rows="2" placeholder="Clauses spéciales…">${this.step1.conditionsParticulieres}</textarea>
        </div>`;
    }

    if (this.etape === 2) {
      const ci = (ok: boolean, lbl: string) =>
        `<span style="display:flex;align-items:center;gap:4px;padding:3px 10px;border-radius:10px;font-size:.72rem;font-weight:500;background:${ok?'#d1fae5':'#e8edf5'};color:${ok?'#065f46':'#8a97b0'}">${ok?'✓':'○'} ${lbl}</span>`;
      const zone = (id: string, zoneId: string, icon: string, lbl: string, hint: string, file: File|null) =>
        `<div style="display:flex;align-items:center;gap:14px;padding:12px 0;border-bottom:1px solid #e3e8f0">
          <div style="display:flex;align-items:center;gap:8px;width:190px;flex-shrink:0">
            <span style="font-size:16px;color:#c9a96e">${icon}</span>
            <div><div style="font-size:.8rem;font-weight:600">${lbl}</div><div style="font-size:.7rem;color:#8a97b0">${hint}</div></div>
          </div>
          <div id="${zoneId}" style="flex:1;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:3px;border:2px dashed ${file?'#0d9f5a':'#d0d8e8'};border-radius:8px;padding:12px;cursor:pointer;background:${file?'#f0fdf4':'#fff'}">
            <span style="font-size:20px;color:${file?'#0d9f5a':'#b8c2d4'}">${file?'✓':'📎'}</span>
            <span style="font-size:.75rem;color:${file?'#0d9f5a':'#8a97b0'}">${file ? file.name : 'Cliquer pour joindre'}</span>
            <input id="${id}" type="file" style="display:none">
          </div>
        </div>`;
      return `
        <div style="font-size:.85rem;font-weight:600;color:#0e1c38;margin-bottom:16px;padding-bottom:10px;border-bottom:1px solid #e3e8f0">Documents obligatoires</div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;background:#f2f5fa;border-radius:8px;padding:10px 12px;margin-bottom:16px">
          ${ci(!!this.docIdentite,'CNI / Passeport')} ${ci(this.photosEdl.length>0,'Photos EDL')} ${ci(!!this.docAutorisation,'Autorisation')}
        </div>
        ${zone('kdi-doc-id','kdi-zone-id','🪪','CNI / Passeport *','PDF, JPG, PNG',this.docIdentite)}
        <div style="display:flex;align-items:center;gap:14px;padding:12px 0;border-bottom:1px solid #e3e8f0">
          <div style="display:flex;align-items:center;gap:8px;width:190px;flex-shrink:0">
            <span style="font-size:16px;color:#c9a96e">📷</span>
            <div><div style="font-size:.8rem;font-weight:600">Photos état des lieux *</div><div style="font-size:.7rem;color:#8a97b0">Multiple</div></div>
          </div>
          <div id="kdi-zone-photos" style="flex:1;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:3px;border:2px dashed ${this.photosEdl.length?'#0d9f5a':'#d0d8e8'};border-radius:8px;padding:12px;cursor:pointer;background:${this.photosEdl.length?'#f0fdf4':'#fff'}">
            <span style="font-size:20px;color:${this.photosEdl.length?'#0d9f5a':'#b8c2d4'}">${this.photosEdl.length?'✓':'🖼'}</span>
            <span style="font-size:.75rem;color:${this.photosEdl.length?'#0d9f5a':'#8a97b0'}">${this.photosEdl.length ? this.photosEdl.length+' photo(s)' : 'Joindre les photos'}</span>
            <input id="kdi-doc-photos" type="file" accept="image/*" multiple style="display:none">
          </div>
        </div>
        <div style="border-bottom:none">${zone('kdi-doc-auth','kdi-zone-auth','⚖️',"Autorisation d'exploitation *",'PDF, JPG, PNG',this.docAutorisation)}</div>`;
    }

    const row = (lbl: string, val: string) => `<div><span style="color:#8a97b0">${lbl} : </span><strong>${val}</strong></div>`;
    const docRow = (ok: boolean, lbl: string, info: string) =>
      `<div style="display:flex;align-items:center;gap:8px;padding:8px 12px;border-radius:8px;background:#f2f5fa;border:1px solid ${ok?'#bbf7d0':'#e3e8f0'};font-size:.8rem;margin-bottom:6px">
        <span style="color:${ok?'#0d9f5a':'#d42b2b'}">${ok?'✓':'✕'}</span>${lbl}
        <span style="margin-left:auto;font-size:.72rem;color:${ok?'#8a97b0':'#d42b2b'}">${info}</span>
      </div>`;
    return `
      <div style="font-size:.85rem;font-weight:600;color:#0e1c38;margin-bottom:16px;padding-bottom:10px;border-bottom:1px solid #e3e8f0">Récapitulatif</div>
      <div style="background:#f2f5fa;border-radius:10px;padding:16px;margin-bottom:16px;border:1px solid #e3e8f0">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px;padding-bottom:12px;border-bottom:1px solid #e3e8f0">
          <span style="font-size:22px;color:#c9a96e">🏘</span>
          <div>
            <div style="font-weight:700;font-size:.9rem">${this.propSel?.libelle ?? '—'}</div>
            <div style="font-size:.68rem;color:#8a97b0">${this.propSel?.proprietaireNom ?? ''}</div>
          </div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:.78rem">
          ${row('Commission', this.step1.tauxCommission+'%')} ${row('Périodicité', this.step1.periodicite)}
          ${row('Début', this.step1.dateDebut)} ${row('Fin', this.step1.dateFin || 'Indéterminée')}
        </div>
      </div>
      ${docRow(!!this.docIdentite, 'CNI / Passeport', this.docIdentite?.name ?? 'Manquant')}
      ${docRow(this.photosEdl.length>0, 'Photos état des lieux', this.photosEdl.length>0 ? this.photosEdl.length+' photo(s)' : 'Manquant')}
      ${docRow(!!this.docAutorisation, "Autorisation d'exploitation", this.docAutorisation?.name ?? 'Manquant')}
      ${(!this.docIdentite || !this.photosEdl.length || !this.docAutorisation) ? `
        <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:10px 12px;font-size:.78rem;color:#92400e;display:flex;align-items:center;gap:8px;margin-top:10px">
          ⚠️ Documents manquants — contrat créé en <strong>Brouillon</strong>.
        </div>` : ''}`;
  }

  onSearchPropRaw(val: string) {
    this.searchProp = val;
    clearTimeout(this.timer);
    this.updateDropdownProp([]);
    if (val.length < 2) { this.propResultats = []; return; }
    this.timer = setTimeout(() =>
      this.propSvc.getAll(1, 10, val).subscribe(r => {
        this.propResultats = r.items.filter((p: any) => !p.aContratGestion);
        this.updateDropdownProp(this.propResultats);
      }), 350);
  }

  private updateDropdownProp(items: any[]) {
    const container = this.overlayEl?.querySelector('#kdi-dropdown-prop') as HTMLElement | null;
    if (!container) return;
    if (!items.length) { container.innerHTML = ''; return; }
    container.innerHTML = `
      <div style="border:1px solid #e3e8f0;border-radius:8px;overflow:hidden;margin-top:6px;background:#fff;max-height:180px;overflow-y:auto">
        ${items.map((p: any) => `
          <div data-prop-id="${p.id}" style="display:flex;align-items:center;gap:8px;padding:9px 12px;cursor:pointer;border-bottom:1px solid #f1f5f9;font-size:.8rem">
            <strong>${p.libelle}</strong>
            <span style="color:#8a97b0;margin-left:6px">${p.proprietaireNom ?? ''}</span>
            ${p.aContratGestion ? '<span style="font-size:11px;color:#d97706;margin-left:auto">⚠️ Contrat existant</span>' : ''}
          </div>`).join('')}
      </div>`;
    container.querySelectorAll('[data-prop-id]').forEach(el => {
      const id = (el as HTMLElement).dataset['propId'];
      el.addEventListener('click', () => this.zone.run(() => {
        const p = this.propResultats.find((x: any) => x.id === id);
        if (p) { this.propSel = p; this.propResultats = []; this.rerender(); }
      }));
    });
  }

  // etapeValide(): boolean {
  //   if (this.etape === 1) return !!this.propSel && !!this.step1.tauxCommission && !!this.step1.dateDebut;
  //   return true;
  // }
  etapeValide(): boolean {
    if (this.etape !== 1) return true;
    
    const taux = Number(this.step1.tauxCommission);
    
    return (
      this.propSel != null &&
      this.step1.dateDebut?.length > 0 &&
      !isNaN(taux) &&
      taux >= 0 && taux <= 100
    );
  }

  soumettre() {
    if (!this.propSel) return;
    this.submitting = true;
    this.rerender();
    const fd = new FormData();
    fd.append('ProprieteId',    this.propSel.id);
    fd.append('DateDebut',      this.step1.dateDebut);
    fd.append('TauxCommission', String(Number(this.step1.tauxCommission) / 100));
    fd.append('Periodicite',    this.step1.periodicite);
    if (this.step1.dateFin)                  fd.append('DateFin',                 this.step1.dateFin);
    if (this.step1.conditionsParticulieres)  fd.append('ConditionsParticulieres', this.step1.conditionsParticulieres);
    if (this.docIdentite)                    fd.append('DocIdentite',             this.docIdentite);
    if (this.docAutorisation)                fd.append('DocAutorisation',         this.docAutorisation);
    this.photosEdl.forEach(f => fd.append('PhotosEtatLieux', f));
    this.svc.create(fd).subscribe({
      next:  () => { this.submitting = false; this.fermerModal(); this.load(); },
      error: () => { this.submitting = false; this.rerender(); }
    });
  }
}