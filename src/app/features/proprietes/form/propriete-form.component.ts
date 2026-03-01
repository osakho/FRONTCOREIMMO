import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { ProprietesService, ProprietairesService } from '../../../core/services/api.services';

@Component({
  selector: 'kdi-propriete-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, FormsModule],
  template: `
    <div class="page">
      <div class="page-header">
        <div><h2 class="page-title">Nouvelle propriété</h2><p class="page-subtitle">Enregistrer un immeuble ou bâtiment</p></div>
        <a routerLink="/proprietes" class="btn btn-secondary">← Retour</a>
      </div>
      <form [formGroup]="form" (ngSubmit)="submit()">
        <div class="form-card">
          <h3 class="form-card-title">Propriétaire *</h3>
          <div class="form-group">
            <label>Rechercher le propriétaire</label>
            <input type="text" class="form-control" placeholder="🔍 Nom du propriétaire…"
                   [value]="searchProp" (input)="onSearchProp($event)">
            <div class="ac-list" *ngIf="propResultats.length && !propSel">
              <div *ngFor="let p of propResultats" class="ac-item" (click)="selectProp(p)">
                <strong>{{ p.nomComplet }}</strong> — {{ p.telephone }}
              </div>
            </div>
            <div class="selected-chip" *ngIf="propSel">
              ✓ {{ propSel.nomComplet }}
              <button type="button" (click)="clearProp()">✕</button>
            </div>
          </div>
        </div>

        <div class="form-card" *ngIf="propSel">
          <h3 class="form-card-title">Informations</h3>
          <div class="form-grid-2">
            <div class="form-group fg-full">
              <label>Libellé *</label>
              <input formControlName="libelle" class="form-control" placeholder="Résidence El Hadj, Immeuble Tevragh…">
              <span class="err" *ngIf="f('libelle')?.invalid && f('libelle')?.touched">Obligatoire</span>
            </div>
            <div class="form-group fg-full">
              <label>Adresse *</label>
              <input formControlName="adresse" class="form-control" placeholder="Numéro, rue, ilot…">
            </div>
            <div class="form-group">
              <label>Quartier</label>
              <input formControlName="quartier" class="form-control" placeholder="Tevragh Zeina, Ksar, Sebkha…">
            </div>
            <div class="form-group">
              <label>Ville *</label>
              <select formControlName="ville" class="form-control">
                <option value="Nouakchott">Nouakchott</option>
                <option value="Nouadhibou">Nouadhibou</option>
                <option value="Rosso">Rosso</option>
                <option value="Kaédi">Kaédi</option>
                <option value="Kiffa">Kiffa</option>
                <option value="Zouerate">Zouerate</option>
                <option value="Autre">Autre</option>
              </select>
            </div>
            <div class="form-group">
              <label>Code zone</label>
              <input formControlName="zoneCode" class="form-control" placeholder="TZ, KS, SB…">
            </div>
            <div class="form-group">
              <label>Latitude GPS</label>
              <input formControlName="latitude" type="number" step="0.000001" class="form-control" placeholder="18.086111">
            </div>
            <div class="form-group">
              <label>Longitude GPS</label>
              <input formControlName="longitude" type="number" step="0.000001" class="form-control" placeholder="-15.978889">
            </div>
            <div class="form-group fg-full">
              <label>Description</label>
              <textarea formControlName="description" class="form-control" rows="3"
                        placeholder="Type de bâtiment, nombre d'étages, état général…"></textarea>
            </div>
          </div>
        </div>

        <div class="form-actions" *ngIf="propSel">
          <a routerLink="/proprietes" class="btn btn-secondary">Annuler</a>
          <button type="submit" class="btn btn-primary" [disabled]="form.invalid || submitting">
            <span *ngIf="submitting" class="spinner"></span>
            {{ submitting ? 'Création…' : '🏘️ Créer la propriété' }}
          </button>
        </div>
      </form>
    </div>
  `,
  styles: [`
    .page{max-width:800px;margin:0 auto}
    .page-header{display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:24px}
    .page-title{font-size:24px;font-weight:700;color:#0c1a35;margin:0 0 4px}
    .page-subtitle{font-size:14px;color:#64748b;margin:0}
    .btn{padding:9px 18px;border-radius:8px;font-size:14px;font-weight:500;cursor:pointer;border:none;text-decoration:none;display:inline-flex;align-items:center;gap:6px}
    .btn-primary{background:#0c1a35;color:#fff}.btn-primary:hover{background:#1a2d52}
    .btn-primary:disabled{opacity:.5;cursor:not-allowed}
    .btn-secondary{background:#fff;color:#334155;border:1px solid #e2e8f0}
    .form-card{background:#fff;border-radius:12px;padding:24px;margin-bottom:16px;box-shadow:0 1px 3px rgba(0,0,0,.06)}
    .form-card-title{font-size:16px;font-weight:600;color:#0c1a35;margin:0 0 20px;padding-bottom:12px;border-bottom:1px solid #f1f5f9}
    .form-grid-2{display:grid;grid-template-columns:1fr 1fr;gap:16px}
    .form-group{display:flex;flex-direction:column;gap:6px}
    .fg-full{grid-column:1/-1}
    label{font-size:13px;font-weight:500;color:#374151}
    .form-control{padding:9px 12px;border:1px solid #e2e8f0;border-radius:8px;font-size:14px}
    .form-control:focus{outline:none;border-color:#0c1a35;box-shadow:0 0 0 3px rgba(12,26,53,.08)}
    .err{font-size:12px;color:#dc2626}
    .form-actions{display:flex;justify-content:flex-end;gap:12px}
    .spinner{width:14px;height:14px;border:2px solid rgba(255,255,255,.3);border-top-color:#fff;border-radius:50%;animation:spin .7s linear infinite}
    @keyframes spin{to{transform:rotate(360deg)}}
    .ac-list{border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;margin-top:4px;background:#fff;z-index:10;position:relative}
    .ac-item{padding:10px 14px;cursor:pointer;font-size:14px;border-bottom:1px solid #f1f5f9}
    .ac-item:last-child{border:none}.ac-item:hover{background:#f8fafc}
    .selected-chip{display:flex;align-items:center;justify-content:space-between;background:#f0f9ff;border:1px solid #bae6fd;border-radius:8px;padding:10px 14px;margin-top:4px;font-size:14px;color:#0c4a6e}
    .selected-chip button{background:none;border:none;cursor:pointer;color:#64748b;font-size:16px}
  `]
})
export class ProprieteFormComponent implements OnInit {
  private fb      = inject(FormBuilder);
  private svc     = inject(ProprietesService);
  private propSvc = inject(ProprietairesService);
  private router  = inject(Router);

  form = this.fb.group({
    libelle:    ['', Validators.required],
    adresse:    ['', Validators.required],
    quartier:   [''],
    ville:      ['Nouakchott', Validators.required],
    zoneCode:   [''],
    description:[''],
    latitude:   [null as number | null],
    longitude:  [null as number | null]
  });

  propSel: any = null;
  propResultats: any[] = [];
  searchProp = '';
  submitting = false;
  timer: any;

  ngOnInit() {}

  f(n: string) { return this.form.get(n); }

  onSearchProp(e: Event) {
    const val = (e.target as HTMLInputElement).value;
    this.searchProp = val;
    clearTimeout(this.timer);
    if (val.length < 2) { this.propResultats = []; return; }
    this.timer = setTimeout(() => {
      this.propSvc.getAll(1, 10, val).subscribe(r => this.propResultats = r.items);
    }, 350);
  }

  selectProp(p: any) { this.propSel = p; this.propResultats = []; }
  clearProp() { this.propSel = null; this.searchProp = ''; }

  submit() {
    if (this.form.invalid || !this.propSel) return;
    this.submitting = true;
    this.svc.create({ ...this.form.value, proprietaireId: this.propSel.id }).subscribe({
      next: () => this.router.navigate(['/proprietes']),
      error: () => { this.submitting = false; }
    });
  }
}
