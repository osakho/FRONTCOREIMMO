import { Component, inject, OnInit, OnDestroy, signal, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ContratsGestionService, AuthService, ProprietesService } from '../../../core/services/api.services';
import { ContratGestionDto, PagedList, StatutContrat } from '../../../core/models/models';

@Component({
  selector: 'kdi-contrats-gestion-list',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, ReactiveFormsModule],
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
                  <span *ngIf="c.statutLabel==='Actif'" class="badge badge-green">
                    <span class="mi" style="font-size:11px">check</span> Actif
                  </span>
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

    <!-- ══ MODAL — téléporté dans <body> au clic ══ -->
    <div #modalEl>
      <div class="nv-modal">
        <div class="nv-header">
          <div class="modal-title">
            <span class="mi" style="color:var(--gold)">add_circle</span>
            Nouveau contrat de gestion
          </div>
          <button class="modal-close" (click)="fermerModal()"><span class="mi">close</span></button>
        </div>

        <div class="stepper">
          <ng-container *ngFor="let s of [1,2,3]; let last=last">
            <div class="stepper-step">
              <div class="step-dot" [class.step-active]="etape()===s" [class.step-done]="etape()>s">
                <span *ngIf="etape()<=s">{{ s }}</span>
                <span *ngIf="etape()>s" class="mi" style="font-size:14px">check</span>
              </div>
              <div class="step-label">{{ stepLabels[s-1] }}</div>
            </div>
            <div *ngIf="!last" class="step-line" [class.step-line-done]="etape()>s"></div>
          </ng-container>
        </div>

        <div class="nv-body">
          <!-- ÉTAPE 1 -->
          <div *ngIf="etape()===1">
            <div class="step-title">Propriété &amp; conditions financières</div>
            <div class="form-group" style="margin-bottom:14px">
              <label class="form-label">Propriété concernée *</label>
              <ng-container *ngIf="!propSel">
                <input type="text" class="form-control" placeholder="Rechercher une propriété…"
                       [value]="searchProp" (input)="onSearchProp($event)">
                <div *ngIf="propResultats.length" class="ac-list">
                  <div *ngFor="let p of propResultats" class="ac-item" (click)="selectProp(p)">
                    <span class="mi mi-sm" style="color:var(--gold)">apartment</span>
                    <span style="flex:1;font-size:.8rem"><strong>{{ p.libelle }}</strong></span>
                    <span style="font-size:.75rem;color:var(--t3)">{{ p.proprietaireNom }}</span>
                  </div>
                </div>
              </ng-container>
              <div *ngIf="propSel" class="selected-item">
                <span class="mi mi-sm" style="color:var(--gold)">apartment</span>
                <div style="flex:1;font-size:.82rem">
                  <strong>{{ propSel.libelle }}</strong>
                  <span style="color:var(--t3);margin-left:8px">{{ propSel.proprietaireNom }}</span>
                </div>
                <button class="modal-close" style="width:24px;height:24px" (click)="clearProp()">
                  <span class="mi" style="font-size:14px">close</span>
                </button>
              </div>
            </div>

            <div style="background:#fffdf5;border:1px solid #fde68a;border-radius:8px;padding:14px;margin-bottom:14px">
              <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
                <div style="font-size:.78rem;font-weight:600;color:var(--navy);display:flex;align-items:center;gap:6px">
                  <span class="mi mi-sm">lock</span> Conditions financières — CONFIDENTIEL
                </div>
                <span style="background:#fef3c7;color:#92400e;padding:2px 8px;border-radius:6px;font-size:.68rem;font-weight:600">Direction uniquement</span>
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">Taux de commission (%) *</label>
                  <div style="position:relative;display:flex;align-items:center">
                    <input type="number" class="form-control" style="padding-right:36px"
                           [(ngModel)]="step1.tauxCommission" min="0" max="100" step="0.1" placeholder="10">
                    <span style="position:absolute;right:12px;color:var(--t3);font-weight:600;font-size:.82rem">%</span>
                  </div>
                </div>
                <div class="form-group">
                  <label class="form-label">Périodicité *</label>
                  <select class="form-control" [(ngModel)]="step1.periodicite">
                    <option value="Mensuel">Mensuel</option>
                    <option value="Bimensuel">Bimensuel</option>
                    <option value="Trimestriel">Trimestriel</option>
                  </select>
                </div>
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Date de début *</label>
                <input type="date" class="form-control" [(ngModel)]="step1.dateDebut">
              </div>
              <div class="form-group">
                <label class="form-label">Date de fin (optionnelle)</label>
                <input type="date" class="form-control" [(ngModel)]="step1.dateFin">
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">Conditions particulières</label>
              <textarea class="form-control" rows="2" [(ngModel)]="step1.conditionsParticulieres"
                        placeholder="Clauses spéciales…" style="resize:vertical"></textarea>
            </div>
          </div>

          <!-- ÉTAPE 2 -->
          <div *ngIf="etape()===2">
            <div class="step-title">Documents obligatoires</div>
            <div class="checklist-banner" style="margin-bottom:16px">
              <span class="ci" [class.ok]="!!docIdentite">
                <span class="mi" style="font-size:13px">{{ docIdentite ? 'check_circle' : 'radio_button_unchecked' }}</span> CNI
              </span>
              <span class="ci" [class.ok]="photosEdl.length>0">
                <span class="mi" style="font-size:13px">{{ photosEdl.length>0 ? 'check_circle' : 'radio_button_unchecked' }}</span> Photos EDL
              </span>
              <span class="ci" [class.ok]="!!docAutorisation">
                <span class="mi" style="font-size:13px">{{ docAutorisation ? 'check_circle' : 'radio_button_unchecked' }}</span> Autorisation
              </span>
            </div>
            <div class="doc-row">
              <div class="doc-row-label">
                <span class="mi mi-sm" style="color:var(--gold)">badge</span>
                <div><div style="font-size:.8rem;font-weight:600">CNI / Passeport *</div><div style="font-size:.7rem;color:var(--t3)">PDF, JPG, PNG</div></div>
              </div>
              <div class="file-zone" [class.has-files]="!!docIdentite" (click)="docIdentiteInput.click()">
                <input #docIdentiteInput type="file" accept=".pdf,.jpg,.jpeg,.png" style="display:none" (change)="onDocIdentite($event)">
                <span class="mi" style="font-size:20px">{{ docIdentite ? 'check_circle' : 'attach_file' }}</span>
                <span style="font-size:.75rem">{{ docIdentite ? docIdentite.name : 'Cliquer pour joindre' }}</span>
              </div>
            </div>
            <div class="doc-row">
              <div class="doc-row-label">
                <span class="mi mi-sm" style="color:var(--gold)">photo_library</span>
                <div><div style="font-size:.8rem;font-weight:600">Photos état des lieux *</div><div style="font-size:.7rem;color:var(--t3)">Multiple</div></div>
              </div>
              <div class="file-zone" [class.has-files]="photosEdl.length>0" (click)="photosEdlInput.click()">
                <input #photosEdlInput type="file" accept="image/*" multiple style="display:none" (change)="onPhotosEdl($event)">
                <span class="mi" style="font-size:20px">{{ photosEdl.length>0 ? 'check_circle' : 'add_photo_alternate' }}</span>
                <span style="font-size:.75rem">{{ photosEdl.length>0 ? photosEdl.length + ' photo(s)' : 'Joindre les photos' }}</span>
              </div>
            </div>
            <div class="doc-row" style="border-bottom:none">
              <div class="doc-row-label">
                <span class="mi mi-sm" style="color:var(--gold)">gavel</span>
                <div><div style="font-size:.8rem;font-weight:600">Autorisation d'exploitation *</div><div style="font-size:.7rem;color:var(--t3)">PDF, JPG, PNG</div></div>
              </div>
              <div class="file-zone" [class.has-files]="!!docAutorisation" (click)="docAutorisationInput.click()">
                <input #docAutorisationInput type="file" accept=".pdf,.jpg,.jpeg,.png" style="display:none" (change)="onDocAutorisation($event)">
                <span class="mi" style="font-size:20px">{{ docAutorisation ? 'check_circle' : 'attach_file' }}</span>
                <span style="font-size:.75rem">{{ docAutorisation ? docAutorisation.name : 'Cliquer pour joindre' }}</span>
              </div>
            </div>
          </div>

          <!-- ÉTAPE 3 -->
          <div *ngIf="etape()===3">
            <div class="step-title">Récapitulatif</div>
            <div style="background:var(--surf);border-radius:var(--r);padding:16px;margin-bottom:16px;border:1px solid var(--bord)">
              <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px;padding-bottom:12px;border-bottom:1px solid var(--bord)">
                <span class="mi" style="color:var(--gold);font-size:22px">apartment</span>
                <div>
                  <div style="font-weight:700;font-size:.9rem">{{ propSel?.libelle ?? '—' }}</div>
                  <div class="cell-sub">{{ propSel?.proprietaireNom ?? '—' }}</div>
                </div>
              </div>
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:.78rem">
                <div><span style="color:var(--t3)">Commission : </span><strong>{{ step1.tauxCommission }}%</strong></div>
                <div><span style="color:var(--t3)">Périodicité : </span>{{ step1.periodicite }}</div>
                <div><span style="color:var(--t3)">Début : </span>{{ step1.dateDebut }}</div>
                <div><span style="color:var(--t3)">Fin : </span>{{ step1.dateFin || 'Indéterminée' }}</div>
              </div>
            </div>
            <div style="display:flex;flex-direction:column;gap:6px;margin-bottom:14px">
              <div class="doc-check-item" [class.ok]="!!docIdentite">
                <span class="mi" style="font-size:16px">{{ docIdentite ? 'check_circle' : 'cancel' }}</span>
                CNI / Passeport
                <span style="margin-left:auto;font-size:.72rem;color:var(--t3)" *ngIf="docIdentite">{{ docIdentite.name }}</span>
                <span style="margin-left:auto;font-size:.72rem;color:var(--er)" *ngIf="!docIdentite">Manquant</span>
              </div>
              <div class="doc-check-item" [class.ok]="photosEdl.length>0">
                <span class="mi" style="font-size:16px">{{ photosEdl.length>0 ? 'check_circle' : 'cancel' }}</span>
                Photos état des lieux
                <span style="margin-left:auto;font-size:.72rem;color:var(--t3)" *ngIf="photosEdl.length>0">{{ photosEdl.length }} photo(s)</span>
                <span style="margin-left:auto;font-size:.72rem;color:var(--er)" *ngIf="!photosEdl.length">Manquant</span>
              </div>
              <div class="doc-check-item" [class.ok]="!!docAutorisation">
                <span class="mi" style="font-size:16px">{{ docAutorisation ? 'check_circle' : 'cancel' }}</span>
                Autorisation d'exploitation
                <span style="margin-left:auto;font-size:.72rem;color:var(--t3)" *ngIf="docAutorisation">{{ docAutorisation.name }}</span>
                <span style="margin-left:auto;font-size:.72rem;color:var(--er)" *ngIf="!docAutorisation">Manquant</span>
              </div>
            </div>
            <div *ngIf="!docIdentite || !photosEdl.length || !docAutorisation"
                 style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:10px 12px;font-size:.78rem;color:#92400e;display:flex;align-items:center;gap:8px">
              <span class="mi">warning</span>
              Documents manquants — contrat créé en <strong>Brouillon</strong>.
            </div>
          </div>
        </div>

        <div class="nv-footer">
          <button class="btn btn-secondary" (click)="etape()>1 ? etape.set(etape()-1) : fermerModal()">
            <span class="mi">{{ etape()>1 ? 'arrow_back' : 'close' }}</span>
            {{ etape()>1 ? 'Précédent' : 'Annuler' }}
          </button>
          <button *ngIf="etape()<3" class="btn btn-primary" [disabled]="!etapeValide()" (click)="etape.set(etape()+1)">
            Suivant <span class="mi">arrow_forward</span>
          </button>
          <button *ngIf="etape()===3" class="btn btn-gold" [disabled]="submitting()||!propSel" (click)="soumettre()">
            <span class="mi">{{ submitting() ? 'hourglass_empty' : 'handshake' }}</span>
            {{ submitting() ? 'Création…' : 'Créer le contrat' }}
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .num-badge { font-family:monospace; background:var(--surf2); padding:3px 8px; border-radius:6px; font-size:.78rem; color:var(--navy); font-weight:700; }
    .checklist-dots { display:flex; gap:6px; justify-content:center; }
    .dot { padding:2px 6px; border-radius:6px; font-size:.7rem; font-weight:700; background:#fee2e2; color:#991b1b; display:flex; align-items:center; gap:2px; }
    .dot.ok { background:#d1fae5; color:#065f46; }
    .nv-modal { background:var(--wh); border-radius:var(--r2); width:560px; max-width:94vw; max-height:90vh; overflow-y:auto; box-shadow:var(--s3); display:flex; flex-direction:column; }
    .nv-header { display:flex; align-items:center; justify-content:space-between; padding:18px 22px 14px; border-bottom:1px solid var(--bord); position:sticky; top:0; background:var(--wh); z-index:2; }
    .nv-body { padding:20px 22px; flex:1; }
    .nv-footer { display:flex; align-items:center; justify-content:space-between; padding:14px 22px; border-top:1px solid var(--bord); background:var(--surf); position:sticky; bottom:0; z-index:2; }
    .stepper { display:flex; align-items:center; justify-content:center; padding:18px 22px 0; }
    .stepper-step { display:flex; flex-direction:column; align-items:center; gap:4px; }
    .step-dot { width:34px; height:34px; border-radius:50%; display:flex; align-items:center; justify-content:center; background:var(--surf2); color:var(--t3); font-weight:700; font-size:.82rem; transition:var(--tr); }
    .step-active { background:var(--navy); color:#fff; box-shadow:0 0 0 4px rgba(14,28,56,.12); }
    .step-done { background:var(--ok); color:#fff; }
    .step-label { font-size:.63rem; color:var(--t3); text-align:center; width:80px; }
    .step-line { flex:1; height:2px; background:var(--bord2); margin:0 6px; margin-bottom:18px; min-width:36px; }
    .step-line-done { background:var(--ok); }
    .step-title { font-size:.85rem; font-weight:600; color:var(--navy); margin-bottom:16px; padding-bottom:10px; border-bottom:1px solid var(--bord); }
    .ac-list { border:1px solid var(--bord); border-radius:8px; overflow:hidden; margin-top:6px; background:var(--wh); max-height:200px; overflow-y:auto; }
    .ac-item { display:flex; align-items:center; gap:8px; padding:9px 12px; cursor:pointer; border-bottom:1px solid var(--bord); font-size:.8rem; }
    .ac-item:last-child { border:none; } .ac-item:hover { background:var(--surf); }
    .selected-item { display:flex; align-items:center; gap:10px; background:var(--surf); border:1px solid var(--bord2); border-radius:8px; padding:10px 12px; }
    .checklist-banner { display:flex; gap:8px; flex-wrap:wrap; background:var(--surf); border-radius:8px; padding:10px 12px; }
    .ci { display:flex; align-items:center; gap:4px; padding:3px 10px; border-radius:10px; font-size:.72rem; font-weight:500; background:var(--surf2); color:var(--t3); }
    .ci.ok { background:#d1fae5; color:#065f46; }
    .doc-row { display:flex; align-items:center; gap:14px; padding:12px 0; border-bottom:1px solid var(--bord); }
    .doc-row-label { display:flex; align-items:center; gap:8px; width:190px; flex-shrink:0; }
    .file-zone { flex:1; display:flex; align-items:center; justify-content:center; flex-direction:column; gap:3px; border:2px dashed var(--bord2); border-radius:8px; padding:10px; cursor:pointer; transition:var(--tr); min-height:60px; }
    .file-zone:hover, .file-zone.has-files { border-color:var(--ok); background:#f0fdf4; }
    .doc-check-item { display:flex; align-items:center; gap:8px; padding:8px 12px; border-radius:8px; font-size:.8rem; background:var(--surf); border:1px solid var(--bord); color:var(--t2); }
    .doc-check-item .mi { color:var(--er); }
    .doc-check-item.ok .mi { color:var(--ok); }
    .doc-check-item.ok { border-color:#bbf7d0; }
  `]
})
export class ContratsGestionListComponent implements OnInit, OnDestroy {
  private svc     = inject(ContratsGestionService);
  private auth    = inject(AuthService);
  private propSvc = inject(ProprietesService);

  @ViewChild('modalEl') modalEl!: ElementRef<HTMLElement>;

  liste = signal<PagedList<ContratGestionDto>>({
    items:[], totalCount:0, page:1, pageSize:20, totalPages:0, hasNext:false, hasPrevious:false
  });
  filtreStatut = '';
  etape        = signal(1);
  submitting   = signal(false);
  stepLabels   = ['Propriété & conditions', 'Documents', 'Récapitulatif'];
  propSel:      any   = null;
  propResultats: any[] = [];
  searchProp   = '';
  timer:        any;
  docIdentite:     File | null = null;
  photosEdl:       File[]      = [];
  docAutorisation: File | null = null;
  step1 = {
    tauxCommission: null as number | null,
    periodicite: 'Mensuel',
    dateDebut: new Date().toISOString().slice(0, 10),
    dateFin: '',
    conditionsParticulieres: ''
  };

  ngOnInit() { this.load(); }

  ngOnDestroy() {
    const el = this.modalEl?.nativeElement;
    if (el?.parentNode === document.body) document.body.removeChild(el);
    document.body.style.overflow = '';
  }

  load() {
    this.svc.getAll(1, 20, undefined, this.filtreStatut as StatutContrat || undefined)
      .subscribe(r => this.liste.set(r));
  }
  setFiltre(s: string) { this.filtreStatut = s; this.load(); }
  activer(c: ContratGestionDto) {
    if (!confirm(`Activer le contrat ${c.numero} ?`)) return;
    this.svc.activer(c.id).subscribe(() => this.load());
  }
  isDirection() { return this.auth.isDirection(); }

  ouvrirModal() {
    this.etape.set(1);
    this.propSel = null; this.propResultats = []; this.searchProp = '';
    this.docIdentite = null; this.photosEdl = []; this.docAutorisation = null;
    this.step1 = { tauxCommission: null, periodicite: 'Mensuel', dateDebut: new Date().toISOString().slice(0,10), dateFin: '', conditionsParticulieres: '' };

    // ── TÉLÉPORT : déplacer le modal directement dans <body> ──
    const el = this.modalEl.nativeElement;
    document.body.appendChild(el);
    el.style.cssText = [
      'display:flex',
      'position:fixed',
      'top:0', 'left:0', 'right:0', 'bottom:0',
      'width:100vw', 'height:100vh',
      'background:rgba(14,28,56,.55)',
      'backdrop-filter:blur(4px)',
      'z-index:99999',
      'align-items:center',
      'justify-content:center'
    ].join(';');
    document.body.style.overflow = 'hidden';
  }

  fermerModal() {
    const el = this.modalEl.nativeElement;
    el.style.display = 'none';
    document.body.style.overflow = '';
  }

  onSearchProp(e: Event) {
    const val = (e.target as HTMLInputElement).value; this.searchProp = val;
    clearTimeout(this.timer);
    if (val.length < 2) { this.propResultats = []; return; }
    this.timer = setTimeout(() =>
      this.propSvc.getAll(1, 10, val).subscribe(r => this.propResultats = r.items), 350);
  }
  selectProp(p: any)  { this.propSel = p; this.propResultats = []; this.searchProp = ''; }
  clearProp()         { this.propSel = null; this.searchProp = ''; }
  onDocIdentite(e: Event)     { this.docIdentite    = (e.target as HTMLInputElement).files?.[0] ?? null; }
  onPhotosEdl(e: Event)       { this.photosEdl      = Array.from((e.target as HTMLInputElement).files ?? []); }
  onDocAutorisation(e: Event) { this.docAutorisation = (e.target as HTMLInputElement).files?.[0] ?? null; }

  etapeValide(): boolean {
    if (this.etape() === 1) return !!this.propSel && !!this.step1.tauxCommission && !!this.step1.dateDebut;
    return true;
  }

  soumettre() {
    if (!this.propSel) return;
    this.submitting.set(true);
    const fd = new FormData();
    fd.append('proprieteId',    this.propSel.id);
    fd.append('dateDebut',      this.step1.dateDebut);
    fd.append('tauxCommission', String(Number(this.step1.tauxCommission) / 100));
    fd.append('periodicite',    this.step1.periodicite);
    if (this.step1.dateFin)                 fd.append('dateFin',                 this.step1.dateFin);
    if (this.step1.conditionsParticulieres)  fd.append('conditionsParticulieres', this.step1.conditionsParticulieres);
    if (this.docIdentite)                    fd.append('docIdentiteProprietaire', this.docIdentite);
    if (this.docAutorisation)                fd.append('docAutorisation',         this.docAutorisation);
    this.photosEdl.forEach(f => fd.append('photosEtatLieux', f));
    this.svc.create(fd).subscribe({
      next:  () => { this.submitting.set(false); this.fermerModal(); this.load(); },
      error: () => this.submitting.set(false)
    });
  }
}