import { Component, inject, OnInit } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { RouterLink, Router, ActivatedRoute } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { ContratsLocationService, ProduitsService, LocatairesService } from '../../../core/services/api.services';

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