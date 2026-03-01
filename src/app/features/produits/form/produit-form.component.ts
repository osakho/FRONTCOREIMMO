import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router, ActivatedRoute } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { ProduitsService, ProprietesService } from '../../../core/services/api.services';

@Component({
  selector: 'kdi-produit-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, FormsModule],
  template: `
    <div class="page">
      <div class="page-header">
        <div><h2 class="page-title">Nouveau produit locatif</h2><p class="page-subtitle">Ajouter une unité louable à une propriété</p></div>
        <a routerLink="/produits" class="btn btn-secondary">← Retour</a>
      </div>
      <form [formGroup]="form" (ngSubmit)="submit()">
        <div class="form-card">
          <h3 class="form-card-title">Propriété *</h3>
          <div class="form-group">
            <label>Rechercher la propriété</label>
            <input type="text" class="form-control" placeholder="🔍 Nom de la propriété…"
                   [value]="searchProp" (input)="onSearchProp($event)">
            <div class="ac-list" *ngIf="propResultats.length&&!propSel">
              <div *ngFor="let p of propResultats" class="ac-item" (click)="selectProp(p)">
                <strong>{{ p.libelle }}</strong> — {{ p.quartier||p.proprietaireNom }}
              </div>
            </div>
            <div class="selected-chip" *ngIf="propSel">
              ✓ {{ propSel.libelle }} ({{ propSel.proprietaireNom }})
              <button type="button" (click)="clearProp()">✕</button>
            </div>
          </div>
        </div>

        <div class="form-card" *ngIf="propSel">
          <h3 class="form-card-title">Caractéristiques</h3>
          <div class="form-grid-2">
            <div class="form-group">
              <label>Type de produit *</label>
              <select formControlName="type" class="form-control">
                <option value="Chambre">🛏 Chambre</option>
                <option value="Appartement">🏠 Appartement</option>
                <option value="Boutique">🏪 Boutique</option>
                <option value="Garage">🚗 Garage</option>
              </select>
            </div>
            <div class="form-group">
              <label>Étage</label>
              <input formControlName="etage" type="number" class="form-control" placeholder="0 = RDC">
            </div>
            <div class="form-group">
              <label>Surface (m²)</label>
              <input formControlName="surface" type="number" class="form-control" placeholder="25">
            </div>
            <div class="form-group">
              <label>Loyer de référence (MRU) *</label>
              <input formControlName="loyerReference" type="number" class="form-control" placeholder="15000">
              <span class="form-hint">Loyer mensuel indicatif</span>
            </div>
            <div class="form-group fg-full">
              <label>Description *</label>
              <input formControlName="description" class="form-control" placeholder="Chambre simple, Appartement F3 meublé…">
              <span class="err" *ngIf="f('description')?.invalid&&f('description')?.touched">Obligatoire</span>
            </div>
            <div class="form-group">
              <label class="checkbox-lbl"><input type="checkbox" formControlName="hasCompteurElec"> Compteur électricité</label>
            </div>
            <div class="form-group">
              <label class="checkbox-lbl"><input type="checkbox" formControlName="hasCompteurEau"> Compteur eau</label>
            </div>
            <div class="form-group fg-full">
              <label>Notes internes</label>
              <textarea formControlName="notes" class="form-control" rows="2" placeholder="Rénovation 2024, climatisation incluse…"></textarea>
            </div>
          </div>
        </div>

        <!-- Création en lot -->
        <div class="form-card" *ngIf="propSel">
          <h3 class="form-card-title">Option : création en lot</h3>
          <p class="form-hint">Créer plusieurs produits du même type en une fois (même loyer de référence).</p>
          <div class="form-grid-2">
            <div class="form-group">
              <label>Nombre à créer</label>
              <input type="number" class="form-control" [(ngModel)]="quantiteLot" [ngModelOptions]="{standalone:true}" min="1" max="50">
            </div>
          </div>
        </div>

        <div class="form-actions" *ngIf="propSel">
          <a routerLink="/produits" class="btn btn-secondary">Annuler</a>
          <button *ngIf="quantiteLot > 1" type="button" class="btn btn-secondary" (click)="submitLot()" [disabled]="form.invalid||submitting">
            📦 Créer {{ quantiteLot }} produits
          </button>
          <button *ngIf="quantiteLot <= 1" type="submit" class="btn btn-primary" [disabled]="form.invalid||submitting">
            {{ submitting ? 'Création…' : '🏠 Créer le produit' }}
          </button>
        </div>
      </form>
    </div>`,
  styles: [`
    .page{max-width:800px;margin:0 auto}.page-header{display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:24px}.page-title{font-size:24px;font-weight:700;color:#0c1a35;margin:0 0 4px}.page-subtitle{font-size:14px;color:#64748b;margin:0}.btn{padding:9px 18px;border-radius:8px;font-size:14px;font-weight:500;cursor:pointer;border:none;text-decoration:none;display:inline-flex;align-items:center;gap:6px}.btn-primary{background:#0c1a35;color:#fff}.btn-primary:disabled{opacity:.5;cursor:not-allowed}.btn-secondary{background:#fff;color:#334155;border:1px solid #e2e8f0}.form-card{background:#fff;border-radius:12px;padding:24px;margin-bottom:16px;box-shadow:0 1px 3px rgba(0,0,0,.06)}.form-card-title{font-size:16px;font-weight:600;color:#0c1a35;margin:0 0 20px;padding-bottom:12px;border-bottom:1px solid #f1f5f9}.form-grid-2{display:grid;grid-template-columns:1fr 1fr;gap:16px}.form-group{display:flex;flex-direction:column;gap:6px}.fg-full{grid-column:1/-1}label{font-size:13px;font-weight:500;color:#374151}.form-control{padding:9px 12px;border:1px solid #e2e8f0;border-radius:8px;font-size:14px}.form-control:focus{outline:none;border-color:#0c1a35}.form-hint{font-size:12px;color:#94a3b8}.err{font-size:12px;color:#dc2626}.checkbox-lbl{display:flex;align-items:center;gap:8px;cursor:pointer;font-size:14px}.form-actions{display:flex;justify-content:flex-end;gap:12px}.ac-list{border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;margin-top:4px}.ac-item{padding:10px 14px;cursor:pointer;font-size:14px;border-bottom:1px solid #f1f5f9}.ac-item:last-child{border:none}.ac-item:hover{background:#f8fafc}.selected-chip{display:flex;align-items:center;justify-content:space-between;background:#f0f9ff;border:1px solid #bae6fd;border-radius:8px;padding:10px 14px;margin-top:4px;font-size:14px;color:#0c4a6e}.selected-chip button{background:none;border:none;cursor:pointer;color:#64748b}
  `]
})
export class ProduitFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private svc = inject(ProduitsService);
  private propSvc = inject(ProprietesService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  form = this.fb.group({
    type:            ['Chambre', Validators.required],
    description:     ['', Validators.required],
    etage:           [0],
    surface:         [null as number|null],
    loyerReference:  [null as number|null, [Validators.required, Validators.min(1)]],
    hasCompteurElec: [false],
    hasCompteurEau:  [false],
    notes:           ['']
  });

  propSel: any = null; propResultats: any[] = []; searchProp = '';
  submitting = false; quantiteLot = 1; timer: any;

  ngOnInit() {
    const pid = this.route.snapshot.queryParams['proprieteId'];
    if (pid) this.propSvc.getById(pid).subscribe(p => { this.propSel = p; });
  }

  f(n:string) { return this.form.get(n); }

  onSearchProp(e:Event) {
    const val = (e.target as HTMLInputElement).value; this.searchProp=val;
    clearTimeout(this.timer);
    if (val.length<2) { this.propResultats=[]; return; }
    this.timer = setTimeout(()=>{ this.propSvc.getAll(1,10,val).subscribe(r=>this.propResultats=r.items); },350);
  }
  selectProp(p:any) { this.propSel=p; this.propResultats=[]; }
  clearProp() { this.propSel=null; this.searchProp=''; }

  submit() {
    if (this.form.invalid||!this.propSel) return;
    this.submitting=true;
    this.svc.create({...this.form.value, proprieteId:this.propSel.id}).subscribe({
      next:()=>this.router.navigate(['/produits']), error:()=>{this.submitting=false;}
    });
  }

  submitLot() {
    if (this.form.invalid||!this.propSel) return;
    this.submitting=true;
    this.svc.createBatch({
      proprieteId: this.propSel.id,
      type: this.form.value.type,
      quantite: this.quantiteLot,
      loyerReference: this.form.value.loyerReference,
      descriptionGenerique: this.form.value.description
    }).subscribe({
      next:()=>this.router.navigate(['/produits']), error:()=>{this.submitting=false;}
    });
  }
}