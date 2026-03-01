// ══════════════════════════════════════════════════════════════
//  CONTRATS LOCATION LIST
// ══════════════════════════════════════════════════════════════
import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ContratsLocationService } from '../../../core/services/api.services';
import { ContratLocationListItemDto, PagedList, StatutContrat } from '../../../core/models/models';

@Component({
  selector: 'kdi-contrats-location-list',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, DecimalPipe],
  template: `
    <div class="page">
      <div class="page-header">
        <div>
          <h2 class="page-title">Baux locatifs</h2>
          <p class="page-subtitle">Contrats de location en cours et historique</p>
        </div>
        <a routerLink="/contrats-location/nouveau" class="btn btn-primary">＋ Nouveau bail</a>
      </div>

      <div class="filters-bar">
        <input type="text" class="search-input" placeholder="🔍 Locataire, produit, numéro…"
               [(ngModel)]="search" (ngModelChange)="onSearch()">
        <select class="filter-select" [(ngModel)]="filtreStatut" (ngModelChange)="load()">
          <option value="">Tous les statuts</option>
          <option value="Brouillon">Brouillon</option>
          <option value="Actif">Actif</option>
          <option value="Termine">Terminé</option>
          <option value="Resilie">Résilié</option>
        </select>
      </div>

      <div class="table-card">
        <table class="data-table" *ngIf="liste().items.length; else empty">
          <thead><tr>
            <th>N° Bail</th>
            <th>Produit</th>
            <th>Locataire</th>
            <th class="text-right">Loyer (MRU)</th>
            <th>Entrée</th>
            <th>Sortie prévue</th>
            <th class="text-center">Retard</th>
            <th class="text-center">Statut</th>
            <th></th>
          </tr></thead>
          <tbody>
            <tr *ngFor="let c of liste().items" [class.row-retard]="c.estEnRetard">
              <td><span class="num-badge">{{ c.numero }}</span></td>
              <td><span class="code-badge">{{ c.produitCode }}</span></td>
              <td><div class="cell-main">{{ c.locataireNom }}</div></td>
              <td class="text-right font-bold">{{ c.loyer | number:'1.0-0' }}</td>
              <td class="text-muted">{{ c.dateEntree | date:'dd/MM/yyyy' }}</td>
              <td class="text-muted">{{ c.dateSortiePrevue ? (c.dateSortiePrevue | date:'dd/MM/yyyy') : 'Indéterminé' }}</td>
              <td class="text-center">
                <span class="retard-badge" *ngIf="c.estEnRetard">⚠️ Retard</span>
              </td>
              <td class="text-center">
                <span class="badge" [ngClass]="statutClass(c.statutLabel)">{{ c.statutLabel }}</span>
              </td>
              <td>
                <div class="row-actions">
                  <a [routerLink]="['/contrats-location', c.id]" class="btn-icon" title="Voir">👁</a>
                  <a *ngIf="c.statutLabel === 'Actif'"
                     [routerLink]="['/collectes/saisir']" [queryParams]="{contratId: c.id}"
                     class="btn-icon" title="Saisir loyer">💰</a>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
        <ng-template #empty>
          <div class="empty-state">
            <span class="empty-icon">📋</span>
            <p>Aucun bail trouvé</p>
            <a routerLink="/contrats-location/nouveau" class="btn btn-primary">Créer le premier</a>
          </div>
        </ng-template>
      </div>
    </div>
  `,
  styles: [`
    .page{max-width:1300px;margin:0 auto}
    .page-header{display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:24px}
    .page-title{font-size:24px;font-weight:700;color:#0c1a35;margin:0 0 4px}
    .page-subtitle{font-size:14px;color:#64748b;margin:0}
    .btn{padding:9px 18px;border-radius:8px;font-size:14px;font-weight:500;cursor:pointer;border:none;text-decoration:none;display:inline-flex;align-items:center;gap:6px}
    .btn-primary{background:#0c1a35;color:#fff}
    .filters-bar{display:flex;gap:12px;margin-bottom:16px}
    .search-input{flex:1;padding:9px 14px;border:1px solid #e2e8f0;border-radius:8px;font-size:14px}
    .filter-select{padding:9px 14px;border:1px solid #e2e8f0;border-radius:8px;font-size:14px;background:#fff}
    .table-card{background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.06)}
    .data-table{width:100%;border-collapse:collapse}
    .data-table th{padding:12px 14px;background:#f8fafc;font-size:11px;font-weight:600;color:#64748b;text-align:left;border-bottom:1px solid #e2e8f0;text-transform:uppercase}
    .data-table td{padding:11px 14px;font-size:13px;color:#334155;border-bottom:1px solid #f1f5f9}
    .data-table tr:last-child td{border-bottom:none}
    .data-table tr:hover td{background:#fafbfc}
    .row-retard{background:#fff7f7!important}
    .num-badge{font-family:monospace;background:#f1f5f9;padding:3px 8px;border-radius:6px;font-size:12px;font-weight:700;color:#0c1a35}
    .code-badge{font-family:monospace;background:#e0e7ef;padding:3px 8px;border-radius:6px;font-size:12px;font-weight:700;color:#0c1a35}
    .cell-main{font-weight:500;color:#0c1a35}
    .text-right{text-align:right}.text-center{text-align:center}.text-muted{color:#94a3b8}.font-bold{font-weight:600}
    .retard-badge{background:#fee2e2;color:#991b1b;padding:3px 8px;border-radius:8px;font-size:11px;font-weight:600}
    .badge{padding:3px 10px;border-radius:12px;font-size:12px;font-weight:500}
    .badge-actif{background:#d1fae5;color:#065f46}
    .badge-brouillon{background:#f1f5f9;color:#64748b}
    .badge-termine{background:#e0e7ef;color:#475569}
    .badge-resilie{background:#fee2e2;color:#991b1b}
    .row-actions{display:flex;gap:6px;justify-content:flex-end}
    .btn-icon{background:none;border:none;cursor:pointer;font-size:16px;padding:4px;border-radius:6px;text-decoration:none}
    .btn-icon:hover{background:#f1f5f9}
    .empty-state{display:flex;flex-direction:column;align-items:center;padding:60px;gap:12px;color:#94a3b8}
    .empty-icon{font-size:48px}
  `]
})
export class ContratsLocationListComponent implements OnInit {
  private svc = inject(ContratsLocationService);

  liste = signal<PagedList<ContratLocationListItemDto>>({ items:[], totalCount:0, page:1, pageSize:20, totalPages:0, hasNext:false, hasPrevious:false });
  search = ''; filtreStatut = ''; timer: any;

  ngOnInit() { this.load(); }

  load() {
    this.svc.getAll({ statut: this.filtreStatut as StatutContrat || undefined, search: this.search || undefined })
      .subscribe(r => this.liste.set(r));
  }

  onSearch() { clearTimeout(this.timer); this.timer = setTimeout(() => { this.load(); }, 400); }

  statutClass(s: string): Record<string, boolean> {
    return { 'badge-actif': s==='Actif', 'badge-brouillon': s==='Brouillon', 'badge-termine': s==='Termine', 'badge-resilie': s==='Resilie' };
  }
}

// ══════════════════════════════════════════════════════════════
//  CONTRAT LOCATION FORM
// ══════════════════════════════════════════════════════════════
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { LocatairesService, ProduitsService } from '../../../core/services/api.services';

@Component({
  selector: 'kdi-contrat-location-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, FormsModule],
  template: `
    <div class="page">
      <div class="page-header">
        <div>
          <h2 class="page-title">Nouveau bail</h2>
          <p class="page-subtitle">Contrat de location entre l'agence et un locataire</p>
        </div>
        <a routerLink="/contrats-location" class="btn btn-secondary">← Retour</a>
      </div>

      <!-- Checklist obligatoire -->
      <div class="checklist-banner">
        <div class="cb-title">📋 Conditions à valider AVANT remise des clés</div>
        <div class="cb-items">
          <span class="ci" [class.ok]="form.get('cautionReglee')?.value">💰 Caution réglée</span>
          <span class="ci" [class.ok]="form.get('avanceLoyerReglee')?.value">💵 Avance réglée</span>
          <span class="ci" [class.ok]="form.get('contratSigne')?.value">📝 Contrat signé</span>
          <span class="ci" [class.ok]="form.get('edlEntreeValide')?.value">📸 État des lieux</span>
          <span class="ci" [class.ok]="photosAvant.length > 0">🖼 Photos</span>
        </div>
      </div>

      <form [formGroup]="form" (ngSubmit)="submit()">

        <!-- Produit -->
        <div class="form-card">
          <h3 class="form-card-title">Produit locatif *</h3>
          <div class="form-group">
            <input type="text" class="form-control" placeholder="🔍 Code produit, description…"
                   [value]="searchProduit" (input)="onSearchProduit($event)">
            <div class="ac-list" *ngIf="produitResultats.length && !produitSel">
              <div *ngFor="let p of produitResultats" class="ac-item" (click)="selectProduit(p)">
                <span class="code">{{ p.code }}</span>
                <span>{{ p.proprieteLibelle }}</span>
                <span class="loyer">{{ p.loyerReference | number:'1.0-0' }} MRU</span>
                <span class="badge-libre">{{ p.statutLabel }}</span>
              </div>
            </div>
            <div class="selected-chip" *ngIf="produitSel">
              🏠 <strong>{{ produitSel.code }}</strong> — {{ produitSel.proprieteLibelle }} — {{ produitSel.loyerReference | number:'1.0-0' }} MRU/mois
              <button type="button" (click)="clearProduit()">✕</button>
            </div>
          </div>
        </div>

        <!-- Locataire -->
        <div class="form-card">
          <h3 class="form-card-title">Locataire *</h3>
          <div class="form-group">
            <input type="text" class="form-control" placeholder="🔍 Nom, téléphone du locataire…"
                   [value]="searchLocataire" (input)="onSearchLocataire($event)">
            <div class="ac-list" *ngIf="locataireResultats.length && !locataireSel">
              <div *ngFor="let l of locataireResultats" class="ac-item" (click)="selectLocataire(l)">
                <strong>{{ l.nomComplet }}</strong> — {{ l.telephone }}
              </div>
            </div>
            <div class="selected-chip" *ngIf="locataireSel">
              👤 {{ locataireSel.nomComplet }} — {{ locataireSel.telephone }}
              <button type="button" (click)="clearLocataire()">✕</button>
            </div>
          </div>
        </div>

        <div *ngIf="produitSel && locataireSel">

          <!-- Conditions financières -->
          <div class="form-card">
            <h3 class="form-card-title">Conditions financières</h3>
            <div class="form-grid-3">
              <div class="form-group">
                <label>Loyer mensuel (MRU) *</label>
                <input formControlName="loyer" type="number" class="form-control">
              </div>
              <div class="form-group">
                <label>Caution (MRU) *</label>
                <input formControlName="caution" type="number" class="form-control">
              </div>
              <div class="form-group">
                <label>Avance loyer (MRU) *</label>
                <input formControlName="avanceLoyer" type="number" class="form-control">
              </div>
              <div class="form-group">
                <label>Périodicité</label>
                <select formControlName="periodicite" class="form-control">
                  <option value="Mensuel">Mensuel</option>
                  <option value="Bimensuel">Bimensuel</option>
                  <option value="Trimestriel">Trimestriel</option>
                </select>
              </div>
              <div class="form-group">
                <label>Jour début paiement</label>
                <input formControlName="jourDebutPaiement" type="number" min="1" max="28" class="form-control">
              </div>
              <div class="form-group">
                <label>Jour limite paiement</label>
                <input formControlName="jourFinPaiement" type="number" min="1" max="28" class="form-control">
              </div>
            </div>
          </div>

          <!-- Dates -->
          <div class="form-card">
            <h3 class="form-card-title">Durée du bail</h3>
            <div class="form-grid-2">
              <div class="form-group">
                <label>Date d'entrée *</label>
                <input formControlName="dateEntree" type="date" class="form-control">
              </div>
              <div class="form-group">
                <label>Date de sortie prévue</label>
                <input formControlName="dateSortiePrevue" type="date" class="form-control">
              </div>
              <div class="form-group">
                <label>Destination du bien</label>
                <input formControlName="destinationBien" class="form-control" placeholder="Usage habitation, commerce…">
              </div>
              <div class="form-group">
                <label>Conditions particulières</label>
                <textarea formControlName="conditionsParticulieres" class="form-control" rows="2"></textarea>
              </div>
            </div>
          </div>

          <!-- Checklist entrée -->
          <div class="form-card">
            <h3 class="form-card-title">Checklist — Conditions d'entrée</h3>
            <div class="checklist-form">
              <label class="cl-item">
                <input type="checkbox" formControlName="cautionReglee">
                <span>Caution réglée</span>
                <div class="cl-amount" *ngIf="form.get('cautionReglee')?.value">
                  Montant : <input type="number" formControlName="cautionMontantRegle" class="fc-mini"> MRU
                </div>
              </label>
              <label class="cl-item">
                <input type="checkbox" formControlName="avanceLoyerReglee">
                <span>Avance loyer réglée</span>
              </label>
              <label class="cl-item">
                <input type="checkbox" formControlName="contratSigne">
                <span>Contrat signé par les deux parties</span>
              </label>
              <label class="cl-item">
                <input type="checkbox" formControlName="edlEntreeValide">
                <span>État des lieux d'entrée signé</span>
              </label>
            </div>

            <!-- Index compteurs -->
            <div class="form-grid-2" style="margin-top:16px" *ngIf="produitSel?.hasCompteurElec || produitSel?.hasCompteurEau">
              <div class="form-group" *ngIf="produitSel?.hasCompteurElec">
                <label>⚡ Index électricité (entrée)</label>
                <input formControlName="indexElecEntree" type="number" class="form-control" placeholder="0000">
              </div>
              <div class="form-group" *ngIf="produitSel?.hasCompteurEau">
                <label>💧 Index eau (entrée)</label>
                <input formControlName="indexEauEntree" type="number" class="form-control" placeholder="0000">
              </div>
            </div>

            <!-- Photos avant remise -->
            <div class="form-group" style="margin-top:16px">
              <label>Photos avant remise des clés</label>
              <div class="file-zone" [class.has-files]="photosAvant.length" (click)="photosInput.click()">
                <input #photosInput type="file" accept="image/*" multiple style="display:none" (change)="onPhotos($event)">
                <span *ngIf="!photosAvant.length">📸 Ajouter des photos</span>
                <span *ngIf="photosAvant.length" class="file-ok">✅ {{ photosAvant.length }} photo(s) jointe(s)</span>
              </div>
            </div>
          </div>

          <div class="form-actions">
            <a routerLink="/contrats-location" class="btn btn-secondary">Annuler</a>
            <button type="submit" class="btn btn-primary" [disabled]="form.invalid || submitting">
              <span *ngIf="submitting" class="spinner"></span>
              {{ submitting ? 'Création…' : '📋 Créer le bail' }}
            </button>
          </div>
        </div>
      </form>
    </div>
  `,
  styles: [`
    .page{max-width:900px;margin:0 auto}
    .page-header{display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:24px}
    .page-title{font-size:24px;font-weight:700;color:#0c1a35;margin:0 0 4px}
    .page-subtitle{font-size:14px;color:#64748b;margin:0}
    .btn{padding:9px 18px;border-radius:8px;font-size:14px;font-weight:500;cursor:pointer;border:none;text-decoration:none;display:inline-flex;align-items:center;gap:6px}
    .btn-primary{background:#0c1a35;color:#fff}.btn-primary:disabled{opacity:.5;cursor:not-allowed}
    .btn-secondary{background:#fff;color:#334155;border:1px solid #e2e8f0}

    .checklist-banner{background:#f0f9ff;border:1px solid #bae6fd;border-radius:12px;padding:14px 20px;margin-bottom:20px}
    .cb-title{font-size:13px;font-weight:600;color:#0c4a6e;margin-bottom:10px}
    .cb-items{display:flex;gap:10px;flex-wrap:wrap}
    .ci{padding:4px 12px;border-radius:10px;font-size:12px;font-weight:500;background:#e0e7ef;color:#475569;transition:all .2s}
    .ci.ok{background:#d1fae5;color:#065f46}

    .form-card{background:#fff;border-radius:12px;padding:24px;margin-bottom:16px;box-shadow:0 1px 3px rgba(0,0,0,.06)}
    .form-card-title{font-size:16px;font-weight:600;color:#0c1a35;margin:0 0 20px;padding-bottom:12px;border-bottom:1px solid #f1f5f9}
    .form-grid-2{display:grid;grid-template-columns:1fr 1fr;gap:16px}
    .form-grid-3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px}
    .form-group{display:flex;flex-direction:column;gap:6px}
    label{font-size:13px;font-weight:500;color:#374151}
    .form-control{padding:9px 12px;border:1px solid #e2e8f0;border-radius:8px;font-size:14px}
    .form-control:focus{outline:none;border-color:#0c1a35}

    .ac-list{border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;margin-top:4px;background:#fff}
    .ac-item{display:flex;align-items:center;gap:10px;padding:10px 14px;cursor:pointer;font-size:13px;border-bottom:1px solid #f1f5f9}
    .ac-item:last-child{border:none}.ac-item:hover{background:#f8fafc}
    .code{font-family:monospace;font-weight:700;background:#e0e7ef;padding:2px 6px;border-radius:4px;font-size:12px}
    .loyer{font-weight:600;color:#0c1a35;margin-left:auto}
    .badge-libre{background:#d1fae5;color:#065f46;padding:2px 8px;border-radius:8px;font-size:11px}
    .selected-chip{display:flex;align-items:center;justify-content:space-between;background:#f0f9ff;border:1px solid #bae6fd;border-radius:8px;padding:10px 14px;margin-top:4px;font-size:14px;color:#0c4a6e}
    .selected-chip button{background:none;border:none;cursor:pointer;color:#64748b;font-size:16px}

    .checklist-form{display:flex;flex-direction:column;gap:12px}
    .cl-item{display:flex;align-items:center;gap:10px;cursor:pointer;font-size:14px;color:#334155;padding:10px;border-radius:8px;transition:background .1s}
    .cl-item:hover{background:#f8fafc}
    .cl-item input[type=checkbox]{width:16px;height:16px;cursor:pointer}
    .cl-amount{margin-left:auto;display:flex;align-items:center;gap:8px;font-size:13px;color:#64748b}
    .fc-mini{padding:4px 8px;border:1px solid #e2e8f0;border-radius:6px;font-size:13px;width:100px}

    .file-zone{border:2px dashed #e2e8f0;border-radius:8px;padding:12px;cursor:pointer;font-size:13px;color:#64748b;text-align:center}
    .file-zone:hover,.file-zone.has-files{border-color:#10b981;background:#f0fdf4}
    .file-ok{color:#065f46;font-weight:500}

    .form-actions{display:flex;justify-content:flex-end;gap:12px}
    .spinner{width:14px;height:14px;border:2px solid rgba(255,255,255,.3);border-top-color:#fff;border-radius:50%;animation:spin .7s linear infinite}
    @keyframes spin{to{transform:rotate(360deg)}}
  `]
})
export class ContratLocationFormComponent implements OnInit {
  private fb          = inject(FormBuilder);
  private svc         = inject(ContratsLocationService);
  private produitSvc  = inject(ProduitsService);
  private locataireSvc= inject(LocatairesService);
  private router      = inject(Router);
  private route       = inject(ActivatedRoute);

  form = this.fb.group({
    loyer:                [null as number|null, [Validators.required, Validators.min(1)]],
    caution:              [null as number|null, [Validators.required, Validators.min(0)]],
    avanceLoyer:          [null as number|null, [Validators.required, Validators.min(0)]],
    periodicite:          ['Mensuel', Validators.required],
    dateEntree:           [new Date().toISOString().substring(0,10), Validators.required],
    dateSortiePrevue:     [''],
    jourDebutPaiement:    [1, [Validators.required, Validators.min(1), Validators.max(28)]],
    jourFinPaiement:      [5, [Validators.required, Validators.min(1), Validators.max(28)]],
    destinationBien:      [''],
    conditionsParticulieres:[''],
    cautionReglee:        [false],
    cautionMontantRegle:  [null as number|null],
    avanceLoyerReglee:    [false],
    contratSigne:         [false],
    edlEntreeValide:      [false],
    indexElecEntree:      [null as number|null],
    indexEauEntree:       [null as number|null]
  });

  produitSel: any = null;     produitResultats: any[] = [];    searchProduit = '';
  locataireSel: any = null;   locataireResultats: any[] = [];  searchLocataire = '';
  photosAvant: File[] = [];
  submitting = false;
  timer1: any; timer2: any;

  ngOnInit() {
    const pid = this.route.snapshot.queryParams['produitId'];
    if (pid) this.produitSvc.getById(pid).subscribe(p => {
      this.produitSel = p;
      this.form.patchValue({ loyer: p.loyerReference, caution: p.loyerReference * 2, avanceLoyer: p.loyerReference });
    });
  }

  onSearchProduit(e: Event) {
    const val = (e.target as HTMLInputElement).value; this.searchProduit = val;
    clearTimeout(this.timer1);
    if (val.length < 2) { this.produitResultats = []; return; }
    this.timer1 = setTimeout(() => {
      this.produitSvc.getAll({ search: val, statut: 'Libre' as any }).subscribe(r => this.produitResultats = r.items);
    }, 350);
  }
  selectProduit(p: any) {
    this.produitSel = p; this.produitResultats = [];
    this.form.patchValue({ loyer: p.loyerReference, caution: p.loyerReference * 2, avanceLoyer: p.loyerReference });
  }
  clearProduit() { this.produitSel = null; this.searchProduit = ''; }

  onSearchLocataire(e: Event) {
    const val = (e.target as HTMLInputElement).value; this.searchLocataire = val;
    clearTimeout(this.timer2);
    if (val.length < 2) { this.locataireResultats = []; return; }
    this.timer2 = setTimeout(() => {
      this.locataireSvc.getAll(1, 10, val).subscribe(r => this.locataireResultats = r.items);
    }, 350);
  }
  selectLocataire(l: any) { this.locataireSel = l; this.locataireResultats = []; }
  clearLocataire() { this.locataireSel = null; this.searchLocataire = ''; }

  onPhotos(e: Event) { this.photosAvant = Array.from((e.target as HTMLInputElement).files || []); }

  submit() {
    if (this.form.invalid || !this.produitSel || !this.locataireSel) return;
    this.submitting = true;
    const fd = new FormData();
    fd.append('produitLocatifId', this.produitSel.id);
    fd.append('locataireId', this.locataireSel.id);
    Object.entries(this.form.value).forEach(([k, v]) => {
      if (v !== null && v !== undefined && v !== '') fd.append(k, String(v));
    });
    this.photosAvant.forEach(f => fd.append('photosAvant', f));
    this.svc.create(fd).subscribe({
      next: () => this.router.navigate(['/contrats-location']),
      error: () => { this.submitting = false; }
    });
  }
}

// ══════════════════════════════════════════════════════════════
//  CONTRAT LOCATION DETAIL
// ══════════════════════════════════════════════════════════════
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'kdi-contrat-location-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, DecimalPipe],
  template: `
    <div class="page" *ngIf="c">
      <div class="page-header">
        <div>
          <h2 class="page-title">Bail {{ c.numero }}</h2>
          <p class="page-subtitle">{{ c.locataireNom }} — {{ c.produitCode }}</p>
        </div>
        <div class="ha">
          <button *ngIf="c.statutLabel === 'Brouillon' && c.peutEtreActive"
                  (click)="activer()" class="btn btn-primary">🔑 Remettre les clés</button>
          <a routerLink="/contrats-location" class="btn btn-ghost">← Retour</a>
        </div>
      </div>

      <!-- Status banner -->
      <div class="status-banner" [class.actif]="c.statutLabel==='Actif'" [class.brouillon]="c.statutLabel==='Brouillon'">
        <span class="sb-status">{{ c.statutLabel }}</span>
        <span class="sb-loyer">{{ c.loyer | number:'1.0-0' }} MRU/mois</span>
        <span class="sb-dates">Entrée : {{ c.dateEntree | date:'dd/MM/yyyy' }}</span>
      </div>

      <div class="detail-grid">
        <!-- Informations bail -->
        <div class="dc">
          <h3 class="dc-title">Informations du bail</h3>
          <dl class="il">
            <dt>Locataire</dt><dd>{{ c.locataireNom }}</dd>
            <dt>Téléphone</dt><dd>{{ c.locataireTel }}</dd>
            <dt>Produit</dt><dd>{{ c.produitCode }}</dd>
            <dt>Loyer</dt><dd class="font-bold">{{ c.loyer | number:'1.0-0' }} MRU</dd>
            <dt>Caution</dt><dd>{{ c.caution | number:'1.0-0' }} MRU</dd>
            <dt>Avance</dt><dd>{{ c.avanceLoyer | number:'1.0-0' }} MRU</dd>
            <dt>Périodicité</dt><dd>{{ c.periodiciteLabel }}</dd>
            <dt>Paiement</dt><dd>du {{ c.jourDebutPaiement }} au {{ c.jourFinPaiement }} du mois</dd>
          </dl>
        </div>

        <!-- Checklist entrée -->
        <div class="dc">
          <h3 class="dc-title">Checklist entrée</h3>
          <div class="checklist">
            <div class="cl-row" [class.ok]="c.cautionReglee"><span>{{ c.cautionReglee ? '✅' : '⬜' }}</span> Caution réglée</div>
            <div class="cl-row" [class.ok]="c.avanceLoyerReglee"><span>{{ c.avanceLoyerReglee ? '✅' : '⬜' }}</span> Avance loyer réglée</div>
            <div class="cl-row" [class.ok]="c.contratSigne"><span>{{ c.contratSigne ? '✅' : '⬜' }}</span> Contrat signé</div>
            <div class="cl-row" [class.ok]="c.edlEntreeValide"><span>{{ c.edlEntreeValide ? '✅' : '⬜' }}</span> État des lieux entrée</div>
            <div class="cl-row" [class.ok]="c.photosAvantRemise"><span>{{ c.photosAvantRemise ? '✅' : '⬜' }}</span> Photos avant remise</div>
            <div class="cl-row" *ngIf="c.indexElecEntree !== null">
              <span>⚡</span> Index élec. entrée : <strong>{{ c.indexElecEntree }}</strong>
            </div>
            <div class="cl-row" *ngIf="c.indexEauEntree !== null">
              <span>💧</span> Index eau entrée : <strong>{{ c.indexEauEntree }}</strong>
            </div>
          </div>
        </div>
      </div>

      <!-- Actions rapides -->
      <div class="actions-card" *ngIf="c.statutLabel === 'Actif'">
        <h3 class="dc-title">Actions</h3>
        <div class="action-btns">
          <a [routerLink]="['/collectes/saisir']" [queryParams]="{contratId: c.id}" class="btn btn-primary">💰 Saisir un loyer</a>
          <a [routerLink]="['/collectes']" [queryParams]="{contratId: c.id}" class="btn btn-sec">📊 Historique collectes</a>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .page{max-width:1000px;margin:0 auto}
    .page-header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:24px}
    .page-title{font-size:24px;font-weight:700;color:#0c1a35;margin:0 0 4px}
    .page-subtitle{font-size:14px;color:#64748b;margin:0}
    .ha{display:flex;gap:8px}
    .btn{padding:9px 18px;border-radius:8px;font-size:14px;font-weight:500;cursor:pointer;border:none;text-decoration:none;display:inline-flex;align-items:center;gap:6px}
    .btn-primary{background:#0c1a35;color:#fff}
    .btn-ghost{background:transparent;color:#64748b}
    .btn-sec{background:#fff;color:#334155;border:1px solid #e2e8f0}
    .status-banner{display:flex;align-items:center;gap:20px;padding:14px 20px;border-radius:12px;margin-bottom:24px}
    .status-banner.actif{background:#d1fae5;color:#065f46}
    .status-banner.brouillon{background:#f1f5f9;color:#475569}
    .sb-status{font-size:16px;font-weight:700}
    .sb-loyer{font-size:20px;font-weight:800;margin-left:auto}
    .sb-dates{font-size:14px}
    .detail-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px}
    .dc{background:#fff;border-radius:12px;padding:24px;box-shadow:0 1px 3px rgba(0,0,0,.06)}
    .dc-title{font-size:15px;font-weight:600;color:#0c1a35;margin:0 0 16px;padding-bottom:10px;border-bottom:1px solid #f1f5f9}
    .il{display:grid;grid-template-columns:auto 1fr;gap:8px 16px;font-size:14px;margin:0}
    dt{color:#64748b;font-weight:500}dd{color:#334155;margin:0}.font-bold{font-weight:700;color:#0c1a35}
    .checklist{display:flex;flex-direction:column;gap:8px}
    .cl-row{display:flex;align-items:center;gap:8px;font-size:14px;color:#64748b;padding:6px 8px;border-radius:6px}
    .cl-row.ok{color:#065f46;background:#f0fdf4}
    .actions-card{background:#fff;border-radius:12px;padding:24px;box-shadow:0 1px 3px rgba(0,0,0,.06)}
    .action-btns{display:flex;gap:10px;flex-wrap:wrap}
  `]
})
export class ContratLocationDetailComponent implements OnInit {
  private svc   = inject(ContratsLocationService);
  private route = inject(ActivatedRoute);
  c: any = null;

  ngOnInit() { this.svc['get'] ? null : null;  // placeholder
    // TODO: implémenter getById dans ContratsLocationService
    // this.svc.getById(this.route.snapshot.params['id']).subscribe(d => this.c = d);
    this.c = { numero: 'CL-2026-0001', locataireNom: '...', produitCode: 'CH-01', loyer: 0, statutLabel: 'Actif', peutEtreActive: false };
  }

  activer() {
    this.svc.activer(this.route.snapshot.params['id']).subscribe(() => {
      if (this.c) this.c.statutLabel = 'Actif';
    });
  }
}
