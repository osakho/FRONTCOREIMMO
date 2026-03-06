import { Component, inject, OnInit, OnDestroy, signal, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ContratsLocationService, AuthService, ProduitsService, LocatairesService } from '../../../core/services/api.services';
import { ContratLocationListItemDto, PagedList, StatutContrat } from '../../../core/models/models';
import { kdiConfirm } from '../../../core/utils/confirm-modal';

@Component({
  selector: 'kdi-contrats-location-list',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  template: `
    <div class="page-enter">
      <div class="page-header">
        <div>
          <div class="page-title"><span class="mi">key</span> Contrats de location</div>
          <div class="page-subtitle">Baux locatifs — gestion des locations en cours</div>
        </div>
        <div class="header-actions">
          <button class="btn btn-gold" (click)="ouvrirModal()">
            <span class="mi">add</span> Nouveau bail
          </button>
        </div>
      </div>

      <div class="filter-bar" style="margin-bottom:16px">
        <button class="filter-chip" [class.active]="filtreStatut===''"          (click)="setFiltre('')">Tous</button>
        <button class="filter-chip" [class.active]="filtreStatut==='Brouillon'" (click)="setFiltre('Brouillon')">Brouillon</button>
        <button class="filter-chip" [class.active]="filtreStatut==='Actif'"     (click)="setFiltre('Actif')">Actif</button>
        <button class="filter-chip" [class.active]="filtreStatut==='Suspendu'"  (click)="setFiltre('Suspendu')">Suspendu</button>
        <button class="filter-chip" [class.active]="filtreStatut==='Termine'"   (click)="setFiltre('Termine')">Terminé</button>
      </div>

      <div class="table-card">
        <table class="data-table" *ngIf="liste().items.length; else empty">
          <thead><tr>
            <th>N° Bail</th>
            <th>Bien locatif</th>
            <th>Locataire</th>
            <th class="text-right">Loyer</th>
            <th>Entrée</th>
            <th class="text-center">Retard</th>
            <th class="text-center">Statut</th>
            <th>Actions</th>
          </tr></thead>
          <tbody>
            <tr *ngFor="let c of liste().items">
              <td><span class="num-badge">{{ c.numero }}</span></td>
              <td><div class="cell-main">{{ c.produitCode }}</div></td>
              <td><div class="cell-main">{{ c.locataireNom }}</div></td>
              <td class="text-right" style="font-weight:600">
                {{ c.loyer | number:'1.0-0' }} <span style="font-size:.72rem;color:#8a97b0">FCFA</span>
              </td>
              <td class="text-muted">{{ c.dateEntree | date:'dd/MM/yyyy' }}</td>
              <td class="text-center">
                <span *ngIf="c.estEnRetard" class="badge badge-red">Retard</span>
                <span *ngIf="!c.estEnRetard" style="color:#8a97b0;font-size:.75rem">—</span>
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
                  <button class="btn btn-secondary btn-sm" (click)="activer(c)">
                    <span class="mi">check_circle</span> Activer
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
        <ng-template #empty>
          <div class="empty-state">
            <span class="mi">key</span>
            <div class="empty-title">Aucun contrat de location</div>
            <div class="empty-sub">Créez le premier bail locatif</div>
            <button class="btn btn-gold" style="margin-top:8px" (click)="ouvrirModal()">
              <span class="mi">add</span> Nouveau bail
            </button>
          </div>
        </ng-template>
      </div>
    </div>
  `,
  styles: [`
    .num-badge { font-family:monospace; background:var(--surf2); padding:3px 8px; border-radius:6px; font-size:.78rem; color:var(--navy); font-weight:700; }
    .cell-sub { font-size:.72rem; color:#8a97b0; margin-top:1px; }
  `]
})
export class ContratsLocationListComponent implements OnInit, OnDestroy {
  private svc        = inject(ContratsLocationService);
  private auth       = inject(AuthService);
  private produitSvc = inject(ProduitsService);       // ✅ ProduitsService (pas ProduitsLocatifsService)
  private locatSvc   = inject(LocatairesService);
  private zone       = inject(NgZone);

  liste = signal<PagedList<ContratLocationListItemDto>>({
    items:[], totalCount:0, page:1, pageSize:20, totalPages:0, hasNext:false, hasPrevious:false
  });
  filtreStatut = '';

  etape       = 1;
  submitting  = false;
  stepLabels  = ['Bien & locataire', 'Conditions financières', 'Documents & récap'];

  produitSel:       any   = null;
  produitResultats: any[] = [];
  searchProduit   = '';

  locataireSel:       any   = null;
  locataireResultats: any[] = [];
  searchLocataire   = '';

  timerProduit:   any;
  timerLocataire: any;

  docContrat: File | null = null;
  photosEdl:  File[]      = [];

  step2 = {
    loyer: '' as any, caution: '' as any, avanceLoyer: '' as any,
    periodicite: 'Mensuel',
    dateEntree: new Date().toISOString().slice(0,10),
    dateSortiePrevue: '',
    jourDebutPaiement: 1, jourFinPaiement: 5,
    destinationBien: 'Habitation',
    conditionsParticulieres: ''
  };

  private overlayEl: HTMLElement | null = null;

  ngOnInit() { this.load(); }
  ngOnDestroy() { this.detruireOverlay(); }

  load() {
    // ✅ Signature correcte : getAll(opts)
    this.svc.getAll({ statut: this.filtreStatut as StatutContrat || undefined })
      .subscribe(r => this.liste.set(r));
  }
  setFiltre(s: string) { this.filtreStatut = s; this.load(); }

async activer(c: ContratLocationListItemDto) {
  const ok = await kdiConfirm({
    title:        `Activer le bail ${c.numero} ?`,
    message:      `Le bail de <strong>${c.locataireNom}</strong> pour le bien <strong>${c.produitCode}</strong> sera activé.`,
    confirmLabel: 'Activer',
    icon:         '🔑'
  });
  if (!ok) return;
  this.svc.activer(c.id).subscribe(() => this.load());
}
  isDirection() { return this.auth.isDirection(); }

  ouvrirModal() {
    this.etape = 1;
    this.produitSel = null; this.produitResultats = []; this.searchProduit = '';
    this.locataireSel = null; this.locataireResultats = []; this.searchLocataire = '';
    this.docContrat = null; this.photosEdl = [];
    this.step2 = {
      loyer: '', caution: '', avanceLoyer: '', periodicite: 'Mensuel',
      dateEntree: new Date().toISOString().slice(0,10), dateSortiePrevue: '',
      jourDebutPaiement: 1, jourFinPaiement: 5,
      destinationBien: 'Habitation', conditionsParticulieres: ''
    };
    this.detruireOverlay();
    this.overlayEl = this.construireOverlay();
    document.body.appendChild(this.overlayEl);
    document.body.style.overflow = 'hidden';
  }

  fermerModal() { this.detruireOverlay(); document.body.style.overflow = ''; }
  private detruireOverlay() { if (this.overlayEl) { this.overlayEl.remove(); this.overlayEl = null; } }
  private rerender() { this.detruireOverlay(); this.overlayEl = this.construireOverlay(); document.body.appendChild(this.overlayEl); }

  // ════════════════════════════════════════════════════════════
  //  OVERLAY
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

    const btnPrev = e > 1
      ? `<button id="kdi-prev" style="padding:7px 15px;border-radius:8px;font-family:inherit;font-size:.79rem;cursor:pointer;border:1px solid #e3e8f0;background:#fff;color:#0e1c38">← Précédent</button>`
      : `<button id="kdi-cancel" style="padding:7px 15px;border-radius:8px;font-family:inherit;font-size:.79rem;cursor:pointer;border:1px solid #e3e8f0;background:#fff;color:#0e1c38">✕ Annuler</button>`;
    const btnNext = e < 3
      ? `<button id="kdi-next" ${!this.etapeValide()?'disabled':''} style="padding:7px 15px;border-radius:8px;font-family:inherit;font-size:.79rem;cursor:pointer;border:none;background:#0e1c38;color:#fff;opacity:${!this.etapeValide()?'.4':'1'}">Suivant →</button>`
      : `<button id="kdi-submit" ${this.submitting?'disabled':''} style="padding:7px 15px;border-radius:8px;font-family:inherit;font-size:.79rem;font-weight:600;cursor:pointer;border:none;background:linear-gradient(135deg,#c9a96e,#dfc28e);color:#0e1c38">🔑 ${this.submitting?'Création…':'Créer le bail'}</button>`;

    const html = `
      <div style="font-family:'Instrument Sans',sans-serif;position:fixed;inset:0;background:rgba(14,28,56,.55);backdrop-filter:blur(4px);z-index:99999;display:flex;align-items:center;justify-content:center" id="kdi-overlay">
        <div style="background:#fff;border-radius:14px;width:580px;max-width:94vw;max-height:90vh;overflow-y:auto;box-shadow:0 12px 40px rgba(14,28,56,.14);display:flex;flex-direction:column">
          <div style="display:flex;align-items:center;justify-content:space-between;padding:18px 22px 14px;border-bottom:1px solid #e3e8f0;position:sticky;top:0;background:#fff;z-index:2">
            <div style="font-weight:700;font-size:.93rem;color:#0e1c38;display:flex;align-items:center;gap:7px">
              <span style="color:#c9a96e">✦</span> Nouveau contrat de location
            </div>
            <button id="kdi-close" style="width:30px;height:30px;border:none;background:#f2f5fa;border-radius:7px;cursor:pointer;font-size:16px">✕</button>
          </div>
          <div style="display:flex;align-items:center;justify-content:center;padding:18px 22px 0">${stepperHTML}</div>
          <div style="padding:20px 22px;flex:1">${this.construireBodyHTML()}</div>
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

    if (e === 1) {
      overlay.querySelector('#kdi-search-produit')?.addEventListener('input', (ev) =>
        this.zone.run(() => this.onSearchProduit((ev.target as HTMLInputElement).value)));
      overlay.querySelectorAll('[data-produit-id]').forEach(el => {
        const id = (el as HTMLElement).dataset['produitId'];
        el.addEventListener('click', () => this.zone.run(() => {
          const p = this.produitResultats.find((x: any) => x.id === id);
          if (p) { this.produitSel = p; this.produitResultats = []; this.rerender(); }
        }));
      });
      overlay.querySelector('#kdi-clear-produit')?.addEventListener('click', () =>
        this.zone.run(() => { this.produitSel = null; this.rerender(); }));

      overlay.querySelector('#kdi-search-locataire')?.addEventListener('input', (ev) =>
        this.zone.run(() => this.onSearchLocataire((ev.target as HTMLInputElement).value)));
      overlay.querySelectorAll('[data-locataire-id]').forEach(el => {
        const id = (el as HTMLElement).dataset['locataireId'];
        el.addEventListener('click', () => this.zone.run(() => {
          const l = this.locataireResultats.find((x: any) => x.id === id);
          if (l) { this.locataireSel = l; this.locataireResultats = []; this.rerender(); }
        }));
      });
      overlay.querySelector('#kdi-clear-locataire')?.addEventListener('click', () =>
        this.zone.run(() => { this.locataireSel = null; this.rerender(); }));
    }

    if (e === 2) {
      const bind = (sel: string, field: keyof typeof this.step2) => {
        const el = overlay.querySelector(sel) as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | null;
        const handler = (ev: Event) => this.zone.run(() => { (this.step2 as any)[field] = (ev.target as HTMLInputElement).value; });
        el?.addEventListener('input', handler);
        el?.addEventListener('change', handler);
      };
      bind('#kdi-loyer',       'loyer');
      bind('#kdi-caution',     'caution');
      bind('#kdi-avance',      'avanceLoyer');
      bind('#kdi-perio',       'periodicite');
      bind('#kdi-dentree',     'dateEntree');
      bind('#kdi-dsortie',     'dateSortiePrevue');
      bind('#kdi-jdebut',      'jourDebutPaiement');
      bind('#kdi-jfin',        'jourFinPaiement');
      bind('#kdi-destination', 'destinationBien');
      bind('#kdi-cond',        'conditionsParticulieres');
    }

    if (e === 3) {
      overlay.querySelector('#kdi-doc-contrat')?.addEventListener('change', (ev) =>
        this.zone.run(() => { this.docContrat = (ev.target as HTMLInputElement).files?.[0] ?? null; this.rerender(); }));
      overlay.querySelector('#kdi-doc-photos')?.addEventListener('change', (ev) =>
        this.zone.run(() => { this.photosEdl = Array.from((ev.target as HTMLInputElement).files ?? []); this.rerender(); }));
      overlay.querySelector('#kdi-zone-contrat')?.addEventListener('click', () =>
        (overlay.querySelector('#kdi-doc-contrat') as HTMLInputElement)?.click());
      overlay.querySelector('#kdi-zone-photos')?.addEventListener('click', () =>
        (overlay.querySelector('#kdi-doc-photos') as HTMLInputElement)?.click());
    }

    return overlay;
  }

  // ════════════════════════════════════════════════════════════
  //  BODY HTML
  // ════════════════════════════════════════════════════════════
  private construireBodyHTML(): string {
    const inp = (id: string, type: string, val: string, ph = '', extra = '') =>
      `<input id="${id}" type="${type}" value="${val}" placeholder="${ph}" ${extra}
        style="padding:8px 11px;border:1.5px solid #e3e8f0;border-radius:7px;font-family:inherit;font-size:.81rem;color:#0e1c38;background:#f2f5fa;width:100%;box-sizing:border-box">`;
    const lbl = (txt: string) =>
      `<label style="font-size:.72rem;font-weight:600;color:#4a5878;display:block;margin-bottom:5px">${txt}</label>`;

    // ── ÉTAPE 1 ──────────────────────────────────────────────
    if (this.etape === 1) {
      const produitSearch = !this.produitSel ? `
        ${inp('kdi-search-produit','text',this.searchProduit,'Rechercher un bien disponible…')}
        ${this.produitResultats.length ? `
          <div style="border:1px solid #e3e8f0;border-radius:8px;overflow:hidden;margin-top:6px;background:#fff;max-height:180px;overflow-y:auto">
            ${this.produitResultats.map((p: any) => `
              <div data-produit-id="${p.id}" style="display:flex;align-items:center;gap:8px;padding:9px 12px;cursor:pointer;border-bottom:1px solid #f1f5f9;font-size:.8rem">
                <strong>${p.code ?? p.libelle}</strong>
                <span style="color:#8a97b0;margin-left:6px">${p.proprieteLibelle ?? ''}</span>
                <span style="margin-left:auto;font-size:.7rem;background:#d1fae5;color:#065f46;padding:2px 7px;border-radius:4px;font-weight:600">Libre</span>
              </div>`).join('')}
          </div>` : ''}
        <div style="margin-top:5px;font-size:.7rem;color:#8a97b0">ℹ️ Seuls les biens non loués sont proposés</div>
      ` : `
        <div style="display:flex;align-items:center;gap:10px;background:#f2f5fa;border:1px solid #d0d8e8;border-radius:8px;padding:10px 12px">
          <span style="color:#c9a96e">🏠</span>
          <div style="flex:1;font-size:.82rem">
            <strong>${this.produitSel.code ?? this.produitSel.libelle}</strong>
            <span style="color:#8a97b0;margin-left:6px">${this.produitSel.proprieteLibelle ?? ''}</span>
          </div>
          <button id="kdi-clear-produit" style="border:none;background:none;cursor:pointer;font-size:16px;color:#8a97b0">✕</button>
        </div>`;

      const locataireSearch = !this.locataireSel ? `
        ${inp('kdi-search-locataire','text',this.searchLocataire,'Rechercher un locataire…')}
        ${this.locataireResultats.length ? `
          <div style="border:1px solid #e3e8f0;border-radius:8px;overflow:hidden;margin-top:6px;background:#fff;max-height:180px;overflow-y:auto">
            ${this.locataireResultats.map((l: any) => `
              <div data-locataire-id="${l.id}" style="display:flex;align-items:center;gap:8px;padding:9px 12px;cursor:pointer;border-bottom:1px solid #f1f5f9;font-size:.8rem">
                <strong>${l.nom ?? l.prenomNom}</strong>
                <span style="color:#8a97b0;margin-left:auto">${l.telephone ?? ''}</span>
              </div>`).join('')}
          </div>` : ''}
      ` : `
        <div style="display:flex;align-items:center;gap:10px;background:#f2f5fa;border:1px solid #d0d8e8;border-radius:8px;padding:10px 12px">
          <span style="color:#c9a96e">👤</span>
          <div style="flex:1;font-size:.82rem">
            <strong>${this.locataireSel.nom ?? this.locataireSel.prenomNom}</strong>
            <span style="color:#8a97b0;margin-left:6px">${this.locataireSel.telephone ?? ''}</span>
          </div>
          <button id="kdi-clear-locataire" style="border:none;background:none;cursor:pointer;font-size:16px;color:#8a97b0">✕</button>
        </div>`;

      return `
        <div style="font-size:.85rem;font-weight:600;color:#0e1c38;margin-bottom:16px;padding-bottom:10px;border-bottom:1px solid #e3e8f0">Bien locatif & locataire</div>
        <div style="margin-bottom:16px">${lbl('Bien locatif *')}${produitSearch}</div>
        <div>${lbl('Locataire *')}${locataireSearch}</div>`;
    }

    // ── ÉTAPE 2 ──────────────────────────────────────────────
    if (this.etape === 2) {
      const s = this.step2;
      return `
        <div style="font-size:.85rem;font-weight:600;color:#0e1c38;margin-bottom:16px;padding-bottom:10px;border-bottom:1px solid #e3e8f0">Conditions financières & durée</div>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:14px">
          <div>${lbl('Loyer (FCFA) *')}${inp('kdi-loyer','number',String(s.loyer),'150 000','min="0"')}</div>
          <div>${lbl('Caution (FCFA) *')}${inp('kdi-caution','number',String(s.caution),'300 000','min="0"')}</div>
          <div>${lbl('Avance loyer (FCFA)')}${inp('kdi-avance','number',String(s.avanceLoyer),'0','min="0"')}</div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px">
          <div>
            ${lbl('Périodicité *')}
            <select id="kdi-perio" style="padding:8px 11px;border:1.5px solid #e3e8f0;border-radius:7px;font-family:inherit;font-size:.81rem;width:100%;background:#f2f5fa">
              ${['Mensuel','Bimensuel','Trimestriel'].map(v => `<option value="${v}" ${s.periodicite===v?'selected':''}>${v}</option>`).join('')}
            </select>
          </div>
          <div>
            ${lbl('Destination *')}
            <select id="kdi-destination" style="padding:8px 11px;border:1.5px solid #e3e8f0;border-radius:7px;font-family:inherit;font-size:.81rem;width:100%;background:#f2f5fa">
              ${['Habitation','Commerce','Bureau','Entrepôt','Mixte'].map(v => `<option value="${v}" ${s.destinationBien===v?'selected':''}>${v}</option>`).join('')}
            </select>
          </div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px">
          <div>${lbl("Date d'entrée *")}${inp('kdi-dentree','date',s.dateEntree)}</div>
          <div>${lbl('Date de sortie prévue')}${inp('kdi-dsortie','date',s.dateSortiePrevue)}</div>
        </div>
        <div style="background:#f2f5fa;border:1px solid #e3e8f0;border-radius:8px;padding:12px;margin-bottom:14px">
          <div style="font-size:.76rem;font-weight:600;color:#4a5878;margin-bottom:10px">📅 Fenêtre de paiement</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
            <div>${lbl('Jour début *')}${inp('kdi-jdebut','number',String(s.jourDebutPaiement),'1','min="1" max="28"')}</div>
            <div>${lbl('Jour fin *')}${inp('kdi-jfin','number',String(s.jourFinPaiement),'5','min="1" max="28"')}</div>
          </div>
          <div style="font-size:.7rem;color:#8a97b0;margin-top:6px">Paiement entre le ${s.jourDebutPaiement} et le ${s.jourFinPaiement} de chaque mois.</div>
        </div>
        <div>
          ${lbl('Conditions particulières')}
          <textarea id="kdi-cond" rows="2" style="padding:8px 11px;border:1.5px solid #e3e8f0;border-radius:7px;font-family:inherit;font-size:.81rem;width:100%;background:#f2f5fa;resize:vertical;box-sizing:border-box" placeholder="Clauses spéciales…">${s.conditionsParticulieres}</textarea>
        </div>`;
    }

    // ── ÉTAPE 3 ──────────────────────────────────────────────
    const s = this.step2;
    const ci = (ok: boolean, t: string) =>
      `<span style="display:flex;align-items:center;gap:4px;padding:3px 10px;border-radius:10px;font-size:.72rem;font-weight:500;background:${ok?'#d1fae5':'#e8edf5'};color:${ok?'#065f46':'#8a97b0'}">${ok?'✓':'○'} ${t}</span>`;
    const row = (t: string, v: string) => `<div><span style="color:#8a97b0">${t} : </span><strong>${v}</strong></div>`;

    return `
      <div style="font-size:.85rem;font-weight:600;color:#0e1c38;margin-bottom:12px;padding-bottom:10px;border-bottom:1px solid #e3e8f0">Documents & récapitulatif</div>
      <div style="background:#f2f5fa;border:1px solid #e3e8f0;border-radius:10px;padding:14px;margin-bottom:16px">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;padding-bottom:10px;border-bottom:1px solid #e3e8f0">
          <span style="font-size:20px;color:#c9a96e">🔑</span>
          <div>
            <div style="font-weight:700;font-size:.88rem">${this.produitSel?.code ?? '—'} → ${this.locataireSel?.nom ?? this.locataireSel?.prenomNom ?? '—'}</div>
            <div style="font-size:.7rem;color:#8a97b0">${this.produitSel?.proprieteLibelle ?? ''}</div>
          </div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;font-size:.77rem">
          ${row('Loyer', Number(s.loyer).toLocaleString('fr-FR')+' FCFA')}
          ${row('Caution', Number(s.caution).toLocaleString('fr-FR')+' FCFA')}
          ${row('Périodicité', s.periodicite)}
          ${row('Entrée', s.dateEntree)}
          ${row('Paiement', 'du '+s.jourDebutPaiement+' au '+s.jourFinPaiement)}
          ${row('Destination', s.destinationBien)}
        </div>
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px">
        ${ci(!!this.docContrat,'Contrat signé')} ${ci(this.photosEdl.length>0,'Photos EDL')}
      </div>
      <div style="display:flex;align-items:center;gap:14px;padding:12px 0;border-bottom:1px solid #e3e8f0">
        <div style="display:flex;align-items:center;gap:8px;width:180px;flex-shrink:0">
          <span style="font-size:16px;color:#c9a96e">📄</span>
          <div><div style="font-size:.8rem;font-weight:600">Contrat de bail signé</div><div style="font-size:.7rem;color:#8a97b0">PDF</div></div>
        </div>
        <div id="kdi-zone-contrat" style="flex:1;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:3px;border:2px dashed ${this.docContrat?'#0d9f5a':'#d0d8e8'};border-radius:8px;padding:12px;cursor:pointer;background:${this.docContrat?'#f0fdf4':'#fff'}">
          <span style="font-size:20px;color:${this.docContrat?'#0d9f5a':'#b8c2d4'}">${this.docContrat?'✓':'📎'}</span>
          <span style="font-size:.75rem;color:${this.docContrat?'#0d9f5a':'#8a97b0'}">${this.docContrat ? this.docContrat.name : 'Cliquer pour joindre'}</span>
          <input id="kdi-doc-contrat" type="file" accept=".pdf,image/*" style="display:none">
        </div>
      </div>
      <div style="display:flex;align-items:center;gap:14px;padding:12px 0">
        <div style="display:flex;align-items:center;gap:8px;width:180px;flex-shrink:0">
          <span style="font-size:16px;color:#c9a96e">📷</span>
          <div><div style="font-size:.8rem;font-weight:600">Photos état des lieux</div><div style="font-size:.7rem;color:#8a97b0">Multiple</div></div>
        </div>
        <div id="kdi-zone-photos" style="flex:1;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:3px;border:2px dashed ${this.photosEdl.length?'#0d9f5a':'#d0d8e8'};border-radius:8px;padding:12px;cursor:pointer;background:${this.photosEdl.length?'#f0fdf4':'#fff'}">
          <span style="font-size:20px;color:${this.photosEdl.length?'#0d9f5a':'#b8c2d4'}">${this.photosEdl.length?'✓':'🖼'}</span>
          <span style="font-size:.75rem;color:${this.photosEdl.length?'#0d9f5a':'#8a97b0'}">${this.photosEdl.length ? this.photosEdl.length+' photo(s)' : 'Joindre les photos'}</span>
          <input id="kdi-doc-photos" type="file" accept="image/*" multiple style="display:none">
        </div>
      </div>
      ${(!this.docContrat || !this.photosEdl.length) ? `
        <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:10px 12px;font-size:.78rem;color:#92400e;display:flex;align-items:center;gap:8px;margin-top:10px">
          ⚠️ Documents manquants — bail créé en <strong>Brouillon</strong>.
        </div>` : ''}`;
  }

  // ════════════════════════════════════════════════════════════
  //  RECHERCHES
  // ════════════════════════════════════════════════════════════

  // ✅ ProduitsService.getAll(opts) — filtre statut 'Libre' pour n'avoir que les biens disponibles
  onSearchProduit(val: string) {
    this.searchProduit = val;
    clearTimeout(this.timerProduit);
    if (val.length < 2) { this.produitResultats = []; this.rerender(); return; }
    this.timerProduit = setTimeout(() =>
      this.produitSvc.getAll({ search: val, statut: 'Libre' as any }).subscribe(r => {
        this.produitResultats = r.items;
        this.rerender();
      }), 350);
  }

  onSearchLocataire(val: string) {
    this.searchLocataire = val;
    clearTimeout(this.timerLocataire);
    if (val.length < 2) { this.locataireResultats = []; this.rerender(); return; }
    this.timerLocataire = setTimeout(() =>
      (this.locatSvc as any).getAll(1, 10, val).subscribe((r: any) => {
        this.locataireResultats = r.items;
        this.rerender();
      }), 350);
  }

  // ════════════════════════════════════════════════════════════
  //  VALIDATION & SOUMISSION
  // ════════════════════════════════════════════════════════════
  etapeValide(): boolean {
    if (this.etape === 1) return !!this.produitSel && !!this.locataireSel;
    if (this.etape === 2) return !!this.step2.loyer && !!this.step2.caution && !!this.step2.dateEntree;
    return true;
  }

  soumettre() {
    if (!this.produitSel || !this.locataireSel) return;
    this.submitting = true;
    this.rerender();
    const fd = new FormData();
    fd.append('ProduitLocatifId',  this.produitSel.id);
    fd.append('LocataireId',       this.locataireSel.id);
    fd.append('Loyer',             String(this.step2.loyer));
    fd.append('Caution',           String(this.step2.caution));
    fd.append('AvanceLoyer',       String(this.step2.avanceLoyer || 0));
    fd.append('Periodicite',       this.step2.periodicite);
    fd.append('DateEntree',        this.step2.dateEntree);
    fd.append('JourDebutPaiement', String(this.step2.jourDebutPaiement));
    fd.append('JourFinPaiement',   String(this.step2.jourFinPaiement));
    fd.append('DestinationBien',   this.step2.destinationBien);
    if (this.step2.dateSortiePrevue)        fd.append('DateSortiePrevue',      this.step2.dateSortiePrevue);
    if (this.step2.conditionsParticulieres) fd.append('ConditionsParticulieres', this.step2.conditionsParticulieres);
    if (this.docContrat)                    fd.append('DocContrat',             this.docContrat);
    this.photosEdl.forEach(f => fd.append('PhotosEtatLieux', f));
    this.svc.create(fd).subscribe({
      next:  () => { this.submitting = false; this.fermerModal(); this.load(); },
      error: () => { this.submitting = false; this.rerender(); }
    });
  }
}