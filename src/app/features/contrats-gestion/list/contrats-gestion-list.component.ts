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
      <div class="page-header">
        <div>
          <div class="page-title"><span class="mi">handshake</span> Contrats de gestion</div>
          <div class="page-subtitle">Mandats de gestion agence ↔ propriétaire — Accès Direction</div>
        </div>
        <div class="header-actions">
          <button class="btn btn-gold" (click)="ouvrirModal()">
            <span class="mi">add</span> Nouveau contrat
          </button>
        </div>
      </div>

      <div class="filter-bar" style="margin-bottom:16px">
        <button class="filter-chip" [class.active]="filtreStatut===''"          (click)="setFiltre('')">Tous les statuts</button>
        <button class="filter-chip" [class.active]="filtreStatut==='Brouillon'" (click)="setFiltre('Brouillon')">Brouillon</button>
        <button class="filter-chip" [class.active]="filtreStatut==='Actif'"     (click)="setFiltre('Actif')">Actif</button>
        <button class="filter-chip" [class.active]="filtreStatut==='Suspendu'"  (click)="setFiltre('Suspendu')">Suspendu</button>
        <button class="filter-chip" [class.active]="filtreStatut==='Termine'"   (click)="setFiltre('Termine')">Terminé</button>
      </div>

      <div class="table-card">
        <table class="data-table" *ngIf="liste().items.length; else empty">
          <thead><tr>
            <th>N° Contrat</th><th>Propriété</th><th>Période</th>
            <th class="text-right" *ngIf="isDirection()">Commission</th>
            <th class="text-center">Checklist</th>
            <th class="text-center">Statut</th>
            <th>Actions</th>
          </tr></thead>
          <tbody>
            <tr *ngFor="let c of liste().items">
              <td><span class="num-badge">{{ c.numero }}</span></td>
              <td><div class="cell-main">{{ c.proprieteLibelle }}</div></td>
              <td class="text-muted">
                {{ c.dateDebut | date:'dd/MM/yyyy' }}
                <span *ngIf="c.dateFin"> → {{ c.dateFin | date:'dd/MM/yyyy' }}</span>
              </td>
              <td class="text-right" style="font-weight:600" *ngIf="isDirection()">
                {{ c.tauxCommission * 100 | number:'1.0-1' }}%
              </td>
              <td class="text-center">
                <div class="checklist-dots">
                  <span class="dot" [class.ok]="c.docIdentiteOk">ID</span>
                  <span class="dot" [class.ok]="c.photosEdlOk"><span class="mi" style="font-size:10px">photo_camera</span></span>
                  <span class="dot" [class.ok]="c.docAutorisationOk"><span class="mi" style="font-size:10px">description</span></span>
                </div>
              </td>
              <td class="text-center">
                <span class="badge"
                  [class.badge-green]="c.statutLabel==='Actif'"
                  [class.badge-amber]="c.statutLabel==='Suspendu'"
                  [class.badge-gray]="c.statutLabel==='Brouillon'"
                  [class.badge-red]="c.statutLabel==='Termine'">{{ c.statutLabel }}</span>
              </td>
              <td>
                <div class="row-actions">
                  <button *ngIf="c.peutEtreActive && c.statutLabel!=='Actif'"
                          class="btn btn-secondary btn-sm" (click)="activer(c)">
                    <span class="mi">check_circle</span> Activer
                  </button>
                  <button *ngIf="c.statutLabel==='Actif'"
                          class="btn btn-secondary btn-sm" (click)="ouvrirAvenant(c)">
                    <span class="mi">edit_document</span> Avenant
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
        <ng-template #empty>
          <div class="empty-state">
            <span class="mi">handshake</span>
            <div class="empty-title">Aucun contrat de gestion</div>
            <div class="empty-sub">Créez le premier mandat de gestion</div>
            <button class="btn btn-gold" style="margin-top:8px" (click)="ouvrirModal()">
              <span class="mi">add</span> Nouveau contrat
            </button>
          </div>
        </ng-template>
      </div>
    </div>
  `,
  styles: [`
    .num-badge { font-family:monospace; background:var(--surf2); padding:3px 8px; border-radius:6px; font-size:.78rem; color:var(--navy); font-weight:700; }
    .checklist-dots { display:flex; gap:6px; justify-content:center; }
    .dot { padding:2px 6px; border-radius:6px; font-size:.7rem; font-weight:700; background:#fee2e2; color:#991b1b; display:flex; align-items:center; gap:2px; }
    .dot.ok { background:#d1fae5; color:#065f46; }
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

  etapeValide(): boolean {
    if (this.etape === 1) return !!this.propSel && !!this.step1.tauxCommission && !!this.step1.dateDebut;
    return true;
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