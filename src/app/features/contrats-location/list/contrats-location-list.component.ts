import { Component, inject, OnInit, OnDestroy, signal, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ContratsLocationService, AuthService, ProduitsService, LocatairesService } from '../../../core/services/api.services';
import { ContratLocationListItemDto, PagedList, StatutContrat } from '../../../core/models/models';

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
                {{ c.loyer | number:'1.0-0' }} <span style="font-size:.72rem;color:#8a97b0">MRU</span>
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
                  [class.badge-red]="c.statutLabel==='Termine' || c.statutLabel==='Resilie'">{{ c.statutLabel }}</span>
              </td>
              <td>
                <div class="row-actions">
                  <!-- Activer : visible seulement si Brouillon -->
                  <button *ngIf="c.statutLabel==='Brouillon'"
                          class="btn btn-secondary btn-sm" (click)="activer(c)">
                    <span class="mi">check_circle</span> Activer
                  </button>

                  <!-- Actif : avenant + résiliation (PDG / Assistante) -->
                  <ng-container *ngIf="c.statutLabel==='Actif'">
                    <button class="btn btn-secondary btn-sm" (click)="ouvrirAvenant(c)"
                            title="Avenant au contrat">
                      <span class="mi">edit_document</span> Avenant
                    </button>
                    <button *ngIf="peutResilier()"
                            class="btn btn-danger btn-sm" (click)="ouvrirResiliation(c)"
                            title="Résilier le bail">
                      <span class="mi">cancel</span> Résilier
                    </button>
                  </ng-container>

                  <!-- Contrat résilié / terminé : lecture seule -->
                  <span *ngIf="c.statutLabel==='Resilie' || c.statutLabel==='Termine'"
                        style="font-size:.75rem;color:#94a3b8;padding:4px 8px">
                    <span class="mi" style="font-size:14px">lock</span> Clôturé
                  </span>
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
    .btn-danger { background:#fee2e2; color:#b91c1c; border:1px solid #fca5a5; }
    .btn-danger:hover { background:#fecaca; }
    .row-actions { display:flex; gap:6px; align-items:center; flex-wrap:wrap; }
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

activer(c: ContratLocationListItemDto) {
  this.ouvrirModalActivation(c);
}

private ouvrirModalActivation(c: ContratLocationListItemDto) {
  const checklist = {
    cautionReglee:      false,
    avanceLoyerReglee:  false,
    contratSigne:       false,
    edlEntreeValide:    false,
    photosAvantRemise:  false,
  };

  const render = () => {
    const allOk = Object.values(checklist).every(v => v);
    const item = (key: keyof typeof checklist, label: string, icon: string) => {
      const checked = checklist[key];
      return `
        <label data-key="${key}" style="display:flex;align-items:center;gap:12px;padding:11px 14px;border-radius:9px;cursor:pointer;
               background:${checked ? '#f0fdf4' : '#f8fafc'};border:1.5px solid ${checked ? '#86efac' : '#e2e8f0'};
               margin-bottom:8px;transition:all .15s;user-select:none">
          <div style="width:20px;height:20px;border-radius:5px;border:2px solid ${checked ? '#22c55e' : '#cbd5e1'};
               background:${checked ? '#22c55e' : '#fff'};display:flex;align-items:center;justify-content:center;flex-shrink:0">
            ${checked ? '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>' : ''}
          </div>
          <span style="font-size:13px;color:${checked ? '#15803d' : '#475569'};font-weight:${checked ? '600' : '400'}">${icon} ${label}</span>
        </label>`;
    };

    const html = `
      <div style="position:fixed;inset:0;background:rgba(14,28,56,.55);backdrop-filter:blur(4px);z-index:99999;
           display:flex;align-items:center;justify-content:center;font-family:'DM Sans','Inter',sans-serif" id="kdi-activ-overlay">
        <div style="background:#fff;border-radius:14px;width:460px;max-width:94vw;
             box-shadow:0 12px 40px rgba(14,28,56,.18);overflow:hidden">

          <!-- Header -->
          <div style="padding:18px 22px 14px;border-bottom:1px solid #e2e8f0;display:flex;align-items:center;gap:10px">
            <div style="width:36px;height:36px;border-radius:9px;background:linear-gradient(135deg,#c9a96e,#dfc28e);
                 display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0">🔑</div>
            <div>
              <div style="font-weight:700;font-size:15px;color:#0e1c38">Activer le bail ${c.numero}</div>
              <div style="font-size:12px;color:#64748b;margin-top:1px">${c.locataireNom} — ${c.produitCode}</div>
            </div>
            <button id="kdi-activ-close" style="margin-left:auto;width:28px;height:28px;border:none;background:#f1f5f9;
                 border-radius:7px;cursor:pointer;font-size:15px;color:#64748b">✕</button>
          </div>

          <!-- Body -->
          <div style="padding:20px 22px">
            <div style="font-size:12px;font-weight:600;color:#94a3b8;text-transform:uppercase;letter-spacing:.8px;margin-bottom:12px">
              Checklist obligatoire avant remise des clés
            </div>
            ${item('cautionReglee',     'Caution encaissée',          '💰')}
            ${item('avanceLoyerReglee', 'Avance loyer encaissée',     '💵')}
            ${item('contratSigne',      'Contrat signé (2 parties)',  '📝')}
            ${item('edlEntreeValide',   'État des lieux signé',       '📋')}
            ${item('photosAvantRemise', 'Photos avant remise clés',   '📸')}

            ${!allOk ? `
              <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:10px 12px;
                   font-size:12px;color:#92400e;display:flex;align-items:center;gap:7px;margin-top:4px">
                ⚠️ Cochez toutes les conditions pour activer le bail.
              </div>` : `
              <div style="background:#f0fdf4;border:1px solid #86efac;border-radius:8px;padding:10px 12px;
                   font-size:12px;color:#166534;display:flex;align-items:center;gap:7px;margin-top:4px">
                ✅ Toutes les conditions sont remplies — le bail peut être activé.
              </div>`}
          </div>

          <!-- Footer -->
          <div style="padding:14px 22px;border-top:1px solid #e2e8f0;background:#f8fafc;
               display:flex;justify-content:space-between;align-items:center">
            <button id="kdi-activ-cancel" style="padding:8px 16px;border-radius:8px;border:1px solid #e2e8f0;
                 background:#fff;color:#475569;font-family:inherit;font-size:13px;cursor:pointer">Annuler</button>
            <button id="kdi-activ-confirm" ${!allOk ? 'disabled' : ''} style="padding:8px 20px;border-radius:8px;border:none;
                 background:${allOk ? 'linear-gradient(135deg,#c9a96e,#dfc28e)' : '#e2e8f0'};
                 color:${allOk ? '#0e1c38' : '#94a3b8'};font-family:inherit;font-size:13px;font-weight:600;
                 cursor:${allOk ? 'pointer' : 'not-allowed'};transition:all .2s">
              🔑 Activer le bail
            </button>
          </div>
        </div>
      </div>`;

    let existing = document.getElementById('kdi-activ-overlay');
    if (existing) existing.remove();

    const wrapper = document.createElement('div');
    wrapper.innerHTML = html;
    const overlay = wrapper.firstElementChild as HTMLElement;
    document.body.appendChild(overlay);

    // Checkboxes
    overlay.querySelectorAll('[data-key]').forEach(el => {
      el.addEventListener('click', () => this.zone.run(() => {
        const key = (el as HTMLElement).dataset['key'] as keyof typeof checklist;
        checklist[key] = !checklist[key];
        render();
      }));
    });

    overlay.querySelector('#kdi-activ-close')?.addEventListener('click',  () => this.zone.run(() => overlay.remove()));
    overlay.querySelector('#kdi-activ-cancel')?.addEventListener('click', () => this.zone.run(() => overlay.remove()));
    overlay.querySelector('#kdi-activ-confirm')?.addEventListener('click', () => this.zone.run(() => {
      if (!Object.values(checklist).every(v => v)) return;
      overlay.remove();
      this.svc.activer(c.id, checklist).subscribe({
        next:  () => this.load(),
        error: () => alert('Erreur lors de l\'activation du bail.')
      });
    }));
  };

  render();
}
  isDirection() { return this.auth.isDirection(); }
  peutResilier() { return this.auth.isPdg() || ['Pdg','Assistante','Direction','Admin'].includes(this.auth['getUser']?.()?.role ?? ''); }

  // ════════════════════════════════════════════════════════════
  //  RÉSILIATION
  // ════════════════════════════════════════════════════════════
  ouvrirResiliation(c: ContratLocationListItemDto) {
    let motif = '';
    let dateRes = new Date().toISOString().slice(0,10);

    const render = () => {
      const html = `
        <div style="position:fixed;inset:0;background:rgba(14,28,56,.55);backdrop-filter:blur(4px);z-index:99999;
             display:flex;align-items:center;justify-content:center;font-family:'DM Sans','Inter',sans-serif" id="kdi-resil-overlay">
          <div style="background:#fff;border-radius:14px;width:460px;max-width:94vw;box-shadow:0 12px 40px rgba(14,28,56,.18);overflow:hidden">
            <div style="padding:18px 22px 14px;border-bottom:1px solid #e2e8f0;display:flex;align-items:center;gap:10px">
              <div style="width:36px;height:36px;border-radius:9px;background:#fee2e2;display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0">⛔</div>
              <div>
                <div style="font-weight:700;font-size:15px;color:#0e1c38">Résilier le bail ${c.numero}</div>
                <div style="font-size:12px;color:#64748b;margin-top:1px">${c.locataireNom} — ${c.produitCode}</div>
              </div>
              <button id="kdi-resil-close" style="margin-left:auto;width:28px;height:28px;border:none;background:#f1f5f9;border-radius:7px;cursor:pointer;font-size:15px">✕</button>
            </div>
            <div style="padding:20px 22px">
              <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:8px;padding:10px 12px;font-size:12px;color:#c2410c;margin-bottom:16px">
                ⚠️ Cette action est <strong>irréversible</strong>. Le bail sera résilié et le bien libéré.
              </div>
              <div style="margin-bottom:14px">
                <label style="font-size:12px;font-weight:600;color:#4a5878;display:block;margin-bottom:6px">Date de résiliation *</label>
                <input id="kdi-resil-date" type="date" value="${dateRes}"
                  style="padding:8px 11px;border:1.5px solid #e3e8f0;border-radius:7px;font-family:inherit;font-size:.85rem;width:100%;box-sizing:border-box">
              </div>
              <div>
                <label style="font-size:12px;font-weight:600;color:#4a5878;display:block;margin-bottom:6px">Motif de résiliation *</label>
                <textarea id="kdi-resil-motif" rows="3"
                  style="padding:8px 11px;border:1.5px solid #e3e8f0;border-radius:7px;font-family:inherit;font-size:.85rem;width:100%;box-sizing:border-box;resize:vertical"
                  placeholder="Ex : Non-paiement du loyer, départ volontaire…">${motif}</textarea>
              </div>
            </div>
            <div style="padding:14px 22px;border-top:1px solid #e2e8f0;background:#f8fafc;display:flex;justify-content:space-between">
              <button id="kdi-resil-cancel" style="padding:8px 16px;border-radius:8px;border:1px solid #e2e8f0;background:#fff;color:#475569;font-family:inherit;font-size:13px;cursor:pointer">Annuler</button>
              <button id="kdi-resil-confirm" style="padding:8px 20px;border-radius:8px;border:none;background:#dc2626;color:#fff;font-family:inherit;font-size:13px;font-weight:600;cursor:pointer">
                ⛔ Confirmer la résiliation
              </button>
            </div>
          </div>
        </div>`;

      document.getElementById('kdi-resil-overlay')?.remove();
      const wrap = document.createElement('div'); wrap.innerHTML = html;
      const overlay = wrap.firstElementChild as HTMLElement;
      document.body.appendChild(overlay);

      overlay.querySelector('#kdi-resil-date')?.addEventListener('input',   (ev) => this.zone.run(() => { dateRes = (ev.target as HTMLInputElement).value; }));
      overlay.querySelector('#kdi-resil-motif')?.addEventListener('input',  (ev) => this.zone.run(() => { motif  = (ev.target as HTMLTextAreaElement).value; }));
      overlay.querySelector('#kdi-resil-close')?.addEventListener('click',  () => this.zone.run(() => overlay.remove()));
      overlay.querySelector('#kdi-resil-cancel')?.addEventListener('click', () => this.zone.run(() => overlay.remove()));
      overlay.querySelector('#kdi-resil-confirm')?.addEventListener('click', () => this.zone.run(() => {
        if (!motif.trim() || !dateRes) { alert('Veuillez renseigner la date et le motif.'); return; }
        overlay.remove();
        this.svc.resilier(c.id, motif, new Date(dateRes)).subscribe({
          next:  () => this.load(),
          error: () => alert('Erreur lors de la résiliation.')
        });
      }));
    };
    render();
  }

  // ════════════════════════════════════════════════════════════
  //  AVENANT
  // ════════════════════════════════════════════════════════════
  ouvrirAvenant(c: ContratLocationListItemDto) {
    // Charger le détail du contrat pour connaître le type de produit et les compteurs
    this.svc.getById(c.id).subscribe((detail: any) => {
      this.zone.run(() => this.afficherModalAvenant(c, detail));
    });
  }

  private afficherModalAvenant(c: ContratLocationListItemDto, detail: any) {
    const typeProduit: string = detail.typeProduit ?? detail.produitType ?? '';
    const isChambre     = typeProduit === 'Chambre';
    const needsCompteurs = ['Appartement','Boutique'].includes(typeProduit);

    // Valeurs avenant
    let av = {
      nouveauLoyer:    detail.loyer ?? '',
      nouvelleDateSortie: detail.dateSortiePrevue ?? '',
      conditionsParticulieres: '',
      motif: '',
      // Compteurs
      hasCompteurElec: detail.hasCompteurElec ?? false,
      hasCompteurEau:  detail.hasCompteurEau  ?? false,
      indexElec:  '' as any,
      indexEau:   '' as any,
    };

    const render = () => {
      const lbl = (t: string) => `<label style="font-size:12px;font-weight:600;color:#4a5878;display:block;margin-bottom:5px">${t}</label>`;
      const inp = (id: string, type: string, val: any, ph = '') =>
        `<input id="${id}" type="${type}" value="${val}" placeholder="${ph}"
          style="padding:8px 11px;border:1.5px solid #e3e8f0;border-radius:7px;font-family:inherit;font-size:.84rem;width:100%;box-sizing:border-box">`;

      // Section compteurs selon type de produit
      let compteurSection = '';
      if (needsCompteurs) {
        // Appartement / Boutique : compteurs obligatoires
        const elecRequired = !av.hasCompteurElec;
        const eauRequired  = !av.hasCompteurEau;
        compteurSection = `
          <div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:10px;padding:14px;margin-bottom:14px">
            <div style="font-size:12px;font-weight:700;color:#0369a1;margin-bottom:12px">⚡💧 Compteurs — ${typeProduit}</div>
            ${elecRequired ? `
              <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:7px;padding:8px 10px;font-size:12px;color:#c2410c;margin-bottom:10px">
                ⚠️ Compteur électrique obligatoire pour un ${typeProduit}
              </div>` : ''}
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
              <div>
                <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px">
                  <input type="checkbox" id="kdi-av-has-elec" ${av.hasCompteurElec ? 'checked' : ''}
                    style="width:15px;height:15px;cursor:pointer">
                  ${lbl('⚡ Compteur électrique')}
                </div>
                ${av.hasCompteurElec ? inp('kdi-av-idx-elec','number',av.indexElec,'Index relevé') : '<div style="font-size:11px;color:#94a3b8;padding:4px 0">Non installé</div>'}
              </div>
              <div>
                <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px">
                  <input type="checkbox" id="kdi-av-has-eau" ${av.hasCompteurEau ? 'checked' : ''}
                    style="width:15px;height:15px;cursor:pointer">
                  ${lbl('💧 Compteur eau')}
                </div>
                ${av.hasCompteurEau ? inp('kdi-av-idx-eau','number',av.indexEau,'Index relevé') : '<div style="font-size:11px;color:#94a3b8;padding:4px 0">Non installé</div>'}
              </div>
            </div>
          </div>`;
      } else if (isChambre) {
        // Chambre : compteurs partagés, saisie index uniquement
        compteurSection = `
          <div style="background:#faf5ff;border:1px solid #e9d5ff;border-radius:10px;padding:14px;margin-bottom:14px">
            <div style="font-size:12px;font-weight:700;color:#7c3aed;margin-bottom:4px">⚡💧 Compteurs partagés — Chambre</div>
            <div style="font-size:11px;color:#8b5cf6;margin-bottom:12px">Les compteurs sont mutualisés — saisir les index de relevé</div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
              <div>${lbl('⚡ Index électricité')}${inp('kdi-av-idx-elec','number',av.indexElec,'Index partagé')}</div>
              <div>${lbl('💧 Index eau')}${inp('kdi-av-idx-eau','number',av.indexEau,'Index partagé')}</div>
            </div>
          </div>`;
      }

      const html = `
        <div style="position:fixed;inset:0;background:rgba(14,28,56,.55);backdrop-filter:blur(4px);z-index:99999;
             display:flex;align-items:center;justify-content:center;font-family:'DM Sans','Inter',sans-serif" id="kdi-av-overlay">
          <div style="background:#fff;border-radius:14px;width:520px;max-width:94vw;max-height:90vh;overflow-y:auto;
               box-shadow:0 12px 40px rgba(14,28,56,.18);display:flex;flex-direction:column">
            <!-- Header -->
            <div style="padding:18px 22px 14px;border-bottom:1px solid #e2e8f0;display:flex;align-items:center;gap:10px;position:sticky;top:0;background:#fff;z-index:2">
              <div style="width:36px;height:36px;border-radius:9px;background:linear-gradient(135deg,#dbeafe,#bfdbfe);
                   display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0">📋</div>
              <div>
                <div style="font-weight:700;font-size:15px;color:#0e1c38">Avenant — ${c.numero}</div>
                <div style="font-size:12px;color:#64748b;margin-top:1px">${c.locataireNom} — ${c.produitCode} (${typeProduit || 'Bien'})</div>
              </div>
              <button id="kdi-av-close" style="margin-left:auto;width:28px;height:28px;border:none;background:#f1f5f9;border-radius:7px;cursor:pointer;font-size:15px">✕</button>
            </div>

            <!-- Body -->
            <div style="padding:20px 22px;flex:1">
              <!-- Conditions financières -->
              <div style="font-size:12px;font-weight:700;color:#4a5878;text-transform:uppercase;letter-spacing:.7px;margin-bottom:12px">Modifications du contrat</div>
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px">
                <div>${lbl('Nouveau loyer (MRU)')}${inp('kdi-av-loyer','number',av.nouveauLoyer,'Laisser vide si inchangé')}</div>
                <div>${lbl('Nouvelle date de sortie')}${inp('kdi-av-sortie','date',av.nouvelleDateSortie,'')}</div>
              </div>
              <div style="margin-bottom:14px">
                ${lbl('Motif de l\'avenant *')}
                <textarea id="kdi-av-motif" rows="2"
                  style="padding:8px 11px;border:1.5px solid #e3e8f0;border-radius:7px;font-family:inherit;font-size:.84rem;width:100%;box-sizing:border-box;resize:vertical"
                  placeholder="Ex : Révision du loyer, prolongation de bail…">${av.motif}</textarea>
              </div>
              <div style="margin-bottom:16px">
                ${lbl('Conditions particulières')}
                <textarea id="kdi-av-cond" rows="2"
                  style="padding:8px 11px;border:1.5px solid #e3e8f0;border-radius:7px;font-family:inherit;font-size:.84rem;width:100%;box-sizing:border-box;resize:vertical"
                  placeholder="Clauses spéciales de l'avenant…">${av.conditionsParticulieres}</textarea>
              </div>

              <!-- Section compteurs (conditionnelle selon type) -->
              ${compteurSection}
            </div>

            <!-- Footer -->
            <div style="padding:14px 22px;border-top:1px solid #e2e8f0;background:#f8fafc;display:flex;justify-content:space-between;position:sticky;bottom:0">
              <button id="kdi-av-cancel" style="padding:8px 16px;border-radius:8px;border:1px solid #e2e8f0;background:#fff;color:#475569;font-family:inherit;font-size:13px;cursor:pointer">Annuler</button>
              <button id="kdi-av-confirm" style="padding:8px 20px;border-radius:8px;border:none;background:linear-gradient(135deg,#1d4ed8,#2563eb);color:#fff;font-family:inherit;font-size:13px;font-weight:600;cursor:pointer">
                📋 Enregistrer l'avenant
              </button>
            </div>
          </div>
        </div>`;

      document.getElementById('kdi-av-overlay')?.remove();
      const wrap = document.createElement('div'); wrap.innerHTML = html;
      const overlay = wrap.firstElementChild as HTMLElement;
      document.body.appendChild(overlay);

      // Bind champs texte
      const bind = (id: string, field: keyof typeof av) => {
        overlay.querySelector(`#${id}`)?.addEventListener('input', (ev) =>
          this.zone.run(() => { (av as any)[field] = (ev.target as HTMLInputElement).value; }));
      };
      bind('kdi-av-loyer',  'nouveauLoyer');
      bind('kdi-av-sortie', 'nouvelleDateSortie');
      bind('kdi-av-motif',  'motif');
      bind('kdi-av-cond',   'conditionsParticulieres');
      bind('kdi-av-idx-elec', 'indexElec');
      bind('kdi-av-idx-eau',  'indexEau');

      // Checkboxes compteurs (Appartement/Boutique) → re-render pour afficher/cacher l'input index
      overlay.querySelector('#kdi-av-has-elec')?.addEventListener('change', (ev) =>
        this.zone.run(() => { av.hasCompteurElec = (ev.target as HTMLInputElement).checked; render(); }));
      overlay.querySelector('#kdi-av-has-eau')?.addEventListener('change', (ev) =>
        this.zone.run(() => { av.hasCompteurEau = (ev.target as HTMLInputElement).checked; render(); }));

      overlay.querySelector('#kdi-av-close')?.addEventListener('click',  () => this.zone.run(() => overlay.remove()));
      overlay.querySelector('#kdi-av-cancel')?.addEventListener('click', () => this.zone.run(() => overlay.remove()));

      overlay.querySelector('#kdi-av-confirm')?.addEventListener('click', () => this.zone.run(() => {
        if (!av.motif.trim()) { alert('Le motif de l\'avenant est obligatoire.'); return; }

        // Validation compteurs obligatoires pour Appartement/Boutique
        if (needsCompteurs && (!av.hasCompteurElec || !av.hasCompteurEau)) {
          alert(`Un ${typeProduit} doit obligatoirement avoir un compteur électrique et un compteur eau.`);
          return;
        }
        // Validation index si compteur présent
        if ((av.hasCompteurElec || isChambre) && av.indexElec === '') {
          alert('L\'index du compteur électrique est requis.'); return;
        }
        if ((av.hasCompteurEau || isChambre) && av.indexEau === '') {
          alert('L\'index du compteur eau est requis.'); return;
        }

        const fd = new FormData();
        fd.append('motif', av.motif);
        if (av.nouveauLoyer)         fd.append('nouveauLoyer',         String(av.nouveauLoyer));
        if (av.nouvelleDateSortie)   fd.append('nouvelleDateSortie',   av.nouvelleDateSortie);
        if (av.conditionsParticulieres) fd.append('conditionsParticulieres', av.conditionsParticulieres);
        if (needsCompteurs) {
          fd.append('hasCompteurElec', String(av.hasCompteurElec));
          fd.append('hasCompteurEau',  String(av.hasCompteurEau));
        }
        if (av.indexElec !== '') fd.append('indexElec', String(av.indexElec));
        if (av.indexEau  !== '') fd.append('indexEau',  String(av.indexEau));

        overlay.remove();
        this.svc.creerAvenant(c.id, fd).subscribe({
          next:  () => this.load(),
          error: () => alert('Erreur lors de l\'enregistrement de l\'avenant.')
        });
      }));
    };

    render();
  }

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
          if (p) { this.selectionnerProduit(p); this.rerender(); }
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
      const updateNextBtn = () => {
        const btn = overlay.querySelector('#kdi-next') as HTMLButtonElement | null;
        if (!btn) return;
        const ok = this.etapeValide();
        btn.disabled = !ok;
        btn.style.opacity = ok ? '1' : '.4';
        btn.style.cursor  = ok ? 'pointer' : 'not-allowed';
      };

      const bind = (sel: string, field: keyof typeof this.step2) => {
        const el = overlay.querySelector(sel) as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | null;
        const handler = (ev: Event) => this.zone.run(() => {
          (this.step2 as any)[field] = (ev.target as HTMLInputElement).value;
          updateNextBtn();
        });
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

      // Mettre à jour le bouton dès l'ouverture (cas où step2 est déjà rempli)
      updateNextBtn();
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
      // ── Produit : input stable + conteneur dropdown séparé ──
      const produitSearch = !this.produitSel ? `
        ${inp('kdi-search-produit','text',this.searchProduit,'Rechercher un bien disponible…')}
        <div id="kdi-dropdown-produit"></div>
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

      // ── Locataire : input stable + conteneur dropdown séparé ──
      const locataireSearch = !this.locataireSel ? `
        ${inp('kdi-search-locataire','text',this.searchLocataire,'Rechercher un locataire…')}
        <div id="kdi-dropdown-locataire"></div>
      ` : `
        <div style="display:flex;align-items:center;gap:10px;background:#f2f5fa;border:1px solid #d0d8e8;border-radius:8px;padding:10px 12px">
          <span style="color:#c9a96e">👤</span>
          <div style="flex:1;font-size:.82rem">
            <strong>${this.locataireSel.nomComplet ?? this.locataireSel.prenomNom ?? this.locataireSel.nom ?? '—'}</strong>
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
          <div>${lbl('Loyer (MRU) *')}${inp('kdi-loyer','number',String(s.loyer),'150 000','min="0"')}</div>
          <div>${lbl('Caution (MRU) *')}${inp('kdi-caution','number',String(s.caution),'300 000','min="0"')}</div>
          <div>${lbl('Avance loyer (MRU)')}${inp('kdi-avance','number',String(s.avanceLoyer),'0','min="0"')}</div>
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
          ${row('Loyer', Number(s.loyer).toLocaleString('fr-FR')+' MRU')}
          ${row('Caution', Number(s.caution).toLocaleString('fr-FR')+' MRU')}
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
    // Vider le dropdown immédiatement sans rerender
    this.updateDropdownProduit([]);
    if (val.length < 2) { this.produitResultats = []; return; }
    this.timerProduit = setTimeout(() =>
      this.produitSvc.getAll({ search: val, statut: 'Libre' as any }).subscribe(r => {
        this.produitResultats = r.items;
        // Mettre à jour le dropdown EN PLACE sans recréer l'overlay
        this.updateDropdownProduit(r.items);
      }), 350);
  }

  onSearchLocataire(val: string) {
    this.searchLocataire = val;
    clearTimeout(this.timerLocataire);
    // Vider le dropdown immédiatement sans rerender
    this.updateDropdownLocataire([]);
    if (val.length < 2) { this.locataireResultats = []; return; }
    this.timerLocataire = setTimeout(() =>
      (this.locatSvc as any).getAll(1, 10, val).subscribe((r: any) => {
        this.locataireResultats = r.items;
        // Mettre à jour le dropdown EN PLACE sans recréer l'overlay
        this.updateDropdownLocataire(r.items);
      }), 350);
  }

  /** Met à jour le dropdown produit dans le DOM existant sans recréer l'overlay */
  private updateDropdownProduit(items: any[]) {
    const container = this.overlayEl?.querySelector('#kdi-dropdown-produit') as HTMLElement | null;
    if (!container) return;
    if (!items.length) { container.innerHTML = ''; return; }
    container.innerHTML = `
      <div style="border:1px solid #e3e8f0;border-radius:8px;overflow:hidden;margin-top:6px;background:#fff;max-height:180px;overflow-y:auto">
        ${items.map((p: any) => `
          <div data-produit-id="${p.id}" style="display:flex;align-items:center;gap:8px;padding:9px 12px;cursor:pointer;border-bottom:1px solid #f1f5f9;font-size:.8rem">
            <strong>${p.code ?? p.libelle}</strong>
            <span style="color:#8a97b0;margin-left:6px">${p.proprieteLibelle ?? ''}</span>
            <span style="margin-left:auto;font-size:.7rem;background:#d1fae5;color:#065f46;padding:2px 7px;border-radius:4px;font-weight:600">Libre</span>
          </div>`).join('')}
      </div>`;
    // Rebrancher les listeners sur les nouveaux items
    container.querySelectorAll('[data-produit-id]').forEach(el => {
      const id = (el as HTMLElement).dataset['produitId'];
      el.addEventListener('click', () => this.zone.run(() => {
        const p = this.produitResultats.find((x: any) => x.id === id);
        if (p) { this.selectionnerProduit(p); this.rerender(); }
      }));
    });
  }

  /** Met à jour le dropdown locataire dans le DOM existant sans recréer l'overlay */
  private updateDropdownLocataire(items: any[]) {
    const container = this.overlayEl?.querySelector('#kdi-dropdown-locataire') as HTMLElement | null;
    if (!container) return;
    if (!items.length) { container.innerHTML = ''; return; }

    // Afficher "undefined" si nomComplet absent — on affiche les bons champs
    container.innerHTML = `
      <div style="border:1px solid #e3e8f0;border-radius:8px;overflow:hidden;margin-top:6px;background:#fff;max-height:180px;overflow-y:auto">
        ${items.map((l: any) => {
          const nom = l.nomComplet ?? l.prenomNom ?? l.nom ?? '—';
          const tel = l.telephone ?? '';
          return `
            <div data-locataire-id="${l.id}" style="display:flex;align-items:center;gap:8px;padding:9px 12px;cursor:pointer;border-bottom:1px solid #f1f5f9;font-size:.8rem">
              <strong>${nom}</strong>
              <span style="color:#8a97b0;margin-left:auto">${tel}</span>
            </div>`;
        }).join('')}
      </div>`;
    // Rebrancher les listeners
    container.querySelectorAll('[data-locataire-id]').forEach(el => {
      const id = (el as HTMLElement).dataset['locataireId'];
      el.addEventListener('click', () => this.zone.run(() => {
        const l = this.locataireResultats.find((x: any) => x.id === id);
        if (l) { this.locataireSel = l; this.locataireResultats = []; this.rerender(); }
      }));
    });
  }

  // ════════════════════════════════════════════════════════════
  //  VALIDATION & SOUMISSION
  // ════════════════════════════════════════════════════════════
  /** Sélectionne un produit ET pré-remplit les champs financiers depuis loyerReference */
  private selectionnerProduit(p: any) {
    this.produitSel      = p;
    this.produitResultats = [];
    const ref = Number(p.loyerReference ?? p.loyer ?? 0);
    if (ref > 0) {
      this.step2.loyer       = ref;
      this.step2.caution     = ref * 2;   // caution = 2 mois par défaut
      this.step2.avanceLoyer = ref;       // avance = 1 mois par défaut
    }
  }

  etapeValide(): boolean {
    if (this.etape === 1) return !!this.produitSel && !!this.locataireSel;
    if (this.etape === 2) {
      const loyer   = Number(this.step2.loyer);
      const caution = Number(this.step2.caution);
      return loyer > 0 && caution >= 0 && !!this.step2.dateEntree;
    }
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