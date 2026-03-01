import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router, ActivatedRoute } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { ProprietairesService } from '../../../core/services/api.services';

@Component({
  selector: 'kdi-proprietaire-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <div class="page">
      <div class="page-header">
        <div>
          <h2 class="page-title">{{ isEdit ? 'Modifier' : 'Nouveau' }} propriétaire</h2>
          <p class="page-subtitle">{{ isEdit ? 'Mise à jour des informations' : 'Saisie des informations du propriétaire' }}</p>
        </div>
        <a routerLink="/proprietaires" class="btn btn-secondary">← Retour</a>
      </div>

      <form [formGroup]="form" (ngSubmit)="submit()">
        <!-- ── Identité ── -->
        <div class="form-card">
          <h3 class="form-card-title">Identité</h3>
          <div class="form-grid-2">
            <div class="form-group">
              <label>Prénom *</label>
              <input formControlName="prenom" class="form-control" placeholder="Amadou">
              <span class="form-error" *ngIf="field('prenom')?.invalid && field('prenom')?.touched">Obligatoire</span>
            </div>
            <div class="form-group">
              <label>Nom *</label>
              <input formControlName="nom" class="form-control" placeholder="Ba">
              <span class="form-error" *ngIf="field('nom')?.invalid && field('nom')?.touched">Obligatoire</span>
            </div>
            <div class="form-group">
              <label>Date de naissance *</label>
              <input formControlName="dateNaissance" type="date" class="form-control">
            </div>
            <div class="form-group">
              <label>Lieu de naissance *</label>
              <input formControlName="lieuNaissance" class="form-control" placeholder="Nouakchott">
            </div>
          </div>

          <!-- Photo identité -->
          <div class="form-group">
            <label>Photo d'identité</label>
            <div class="file-upload-area" (click)="photoInput.click()" (drop)="onDrop($event)" (dragover)="$event.preventDefault()">
              <input #photoInput type="file" accept="image/*" style="display:none" (change)="onPhotoChange($event)">
              <div *ngIf="!photoPreview" class="file-upload-placeholder">
                <span class="upload-icon">📸</span>
                <p>Cliquer ou glisser une photo ici</p>
                <p class="upload-hint">JPG, PNG — max 5 Mo</p>
              </div>
              <img *ngIf="photoPreview" [src]="photoPreview" class="photo-preview" alt="Aperçu">
            </div>
          </div>
        </div>

        <!-- ── Coordonnées ── -->
        <div class="form-card">
          <h3 class="form-card-title">Coordonnées</h3>
          <div class="form-grid-2">
            <div class="form-group">
              <label>Téléphone principal *</label>
              <input formControlName="telephone" class="form-control" placeholder="+222 36 XX XX XX">
              <span class="form-error" *ngIf="field('telephone')?.invalid && field('telephone')?.touched">Format invalide</span>
            </div>
            <div class="form-group">
              <label>Téléphone secondaire</label>
              <input formControlName="telephoneSecondaire" class="form-control" placeholder="+222 22 XX XX XX">
            </div>
            <div class="form-group">
              <label>Email</label>
              <input formControlName="email" type="email" class="form-control" placeholder="exemple@mail.com">
            </div>
            <div class="form-group">
              <label>Quartier / Zone</label>
              <input formControlName="quartier" class="form-control" placeholder="Tevragh Zeina">
            </div>
            <div class="form-group form-group-full">
              <label>Adresse complète *</label>
              <textarea formControlName="adresse" class="form-control" rows="2" placeholder="Numéro, rue, quartier…"></textarea>
            </div>
          </div>
        </div>

        <!-- ── Document officiel ── -->
        <div class="form-card">
          <h3 class="form-card-title">Document officiel</h3>
          <div class="form-grid-2">
            <div class="form-group">
              <label>Type de document *</label>
              <select formControlName="typeDocumentId" class="form-control">
                <option value="CarteNationaleIdentite">Carte nationale d'identité</option>
                <option value="Passeport">Passeport</option>
                <option value="CarteDeSejour">Carte de séjour</option>
                <option value="CarteConsulaire">Carte consulaire</option>
                <option value="RegistreCommerce">Registre de commerce</option>
                <option value="Autre">Autre</option>
              </select>
            </div>
            <div class="form-group">
              <label>Numéro du document *</label>
              <input formControlName="numeroDocument" class="form-control" placeholder="MR-001-2024">
            </div>
          </div>
        </div>

        <!-- ── Comptes bancaires ── -->
        <div class="form-card">
          <div class="form-card-header">
            <h3 class="form-card-title">Comptes bancaires</h3>
            <button type="button" class="btn btn-sm" (click)="addCompte()">＋ Ajouter</button>
          </div>
          <div formArrayName="comptes">
            <div *ngFor="let c of comptes.controls; let i = index" [formGroupName]="i" class="sub-form-row">
              <div class="form-grid-3">
                <div class="form-group">
                  <label>Banque</label>
                  <input formControlName="banque" class="form-control" placeholder="BMCI, SGM…">
                </div>
                <div class="form-group">
                  <label>Numéro de compte</label>
                  <input formControlName="numero" class="form-control">
                </div>
                <div class="form-group">
                  <label>Agence</label>
                  <input formControlName="agence" class="form-control">
                </div>
              </div>
              <div class="sub-form-actions">
                <label class="checkbox-label">
                  <input type="checkbox" formControlName="estPrincipal"> Principal
                </label>
                <button type="button" class="btn-remove" (click)="removeCompte(i)">✕</button>
              </div>
            </div>
          </div>
        </div>

        <!-- ── Plateformes mobiles ── -->
        <div class="form-card">
          <div class="form-card-header">
            <h3 class="form-card-title">Plateformes mobiles</h3>
            <button type="button" class="btn btn-sm" (click)="addPlateforme()">＋ Ajouter</button>
          </div>
          <div formArrayName="plateformes">
            <div *ngFor="let p of plateformes.controls; let i = index" [formGroupName]="i" class="sub-form-row">
              <div class="form-grid-2">
                <div class="form-group">
                  <label>Plateforme</label>
                  <select formControlName="nom" class="form-control">
                    <option value="Bankily">Bankily</option>
                    <option value="Masrvi">Masrvi</option>
                    <option value="Bimbank">Bimbank</option>
                    <option value="Click">Click</option>
                    <option value="Autre">Autre</option>
                  </select>
                </div>
                <div class="form-group">
                  <label>Numéro</label>
                  <input formControlName="numero" class="form-control" placeholder="+222…">
                </div>
              </div>
              <div class="sub-form-actions">
                <label class="checkbox-label">
                  <input type="checkbox" formControlName="estPrincipal"> Principal
                </label>
                <button type="button" class="btn-remove" (click)="removePlateforme(i)">✕</button>
              </div>
            </div>
          </div>
        </div>

        <!-- ── Notes ── -->
        <div class="form-card">
          <h3 class="form-card-title">Notes</h3>
          <div class="form-group">
            <textarea formControlName="notes" class="form-control" rows="3" placeholder="Observations, informations complémentaires…"></textarea>
          </div>
        </div>

        <!-- ── Actions ── -->
        <div class="form-actions">
          <a routerLink="/proprietaires" class="btn btn-secondary">Annuler</a>
          <button type="submit" class="btn btn-primary" [disabled]="form.invalid || submitting">
            <span *ngIf="submitting" class="btn-spinner"></span>
            {{ submitting ? 'Enregistrement…' : (isEdit ? 'Enregistrer les modifications' : 'Créer le propriétaire') }}
          </button>
        </div>
      </form>
    </div>
  `,
  styles: [`
  .page { max-width: 900px; margin: 0 auto; }
  .page-header { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 24px; }
  .page-title { font-size: 24px; font-weight: 700; color: #0c1a35; margin: 0 0 4px; }
  .page-subtitle { font-size: 14px; color: #64748b; margin: 0; }
  .btn { padding: 9px 18px; border-radius: 8px; font-size: 14px; font-weight: 500; cursor: pointer; border: none; text-decoration: none; display: inline-flex; align-items: center; gap: 6px; }
  .btn-primary { background: #0c1a35; color: #fff; } .btn-primary:hover { background: #1a2d52; }
  .btn-primary:disabled { opacity: .5; cursor: not-allowed; }
  .btn-secondary { background: #fff; color: #334155; border: 1px solid #e2e8f0; }
  .btn-sm { padding: 6px 12px; font-size: 13px; background: #f1f5f9; border: 1px solid #e2e8f0; border-radius: 6px; cursor: pointer; }
  .form-card { background: #fff; border-radius: 12px; padding: 24px; margin-bottom: 16px; box-shadow: 0 1px 3px rgba(0,0,0,.06); }
  .form-card-title { font-size: 16px; font-weight: 600; color: #0c1a35; margin: 0 0 20px; padding-bottom: 12px; border-bottom: 1px solid #f1f5f9; }
  .form-card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; padding-bottom: 12px; border-bottom: 1px solid #f1f5f9; }
  .form-card-header .form-card-title { margin: 0; padding: 0; border: none; }
  .form-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
  .form-grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; }
  .form-group { display: flex; flex-direction: column; gap: 6px; }
  .form-group-full { grid-column: 1 / -1; }
  label { font-size: 13px; font-weight: 500; color: #374151; }
  .form-control { padding: 9px 12px; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 14px; }
  .form-control:focus { outline: none; border-color: #0c1a35; box-shadow: 0 0 0 3px rgba(12,26,53,.08); }
  .form-error { font-size: 12px; color: #dc2626; }
  .file-upload-area { border: 2px dashed #e2e8f0; border-radius: 10px; padding: 24px; text-align: center; cursor: pointer; transition: border-color .15s; }
  .file-upload-area:hover { border-color: #c8a96e; }
  .file-upload-placeholder .upload-icon { font-size: 40px; display: block; margin-bottom: 8px; }
  .file-upload-placeholder p { margin: 4px 0; font-size: 14px; color: #64748b; }
  .upload-hint { font-size: 12px; color: #94a3b8; }
  .photo-preview { max-height: 160px; border-radius: 8px; }
  .sub-form-row { background: #f8fafc; border-radius: 8px; padding: 16px; margin-bottom: 12px; }
  .sub-form-actions { display: flex; align-items: center; gap: 12px; margin-top: 8px; }
  .checkbox-label { display: flex; align-items: center; gap: 6px; font-size: 13px; cursor: pointer; }
  .btn-remove { background: none; border: none; color: #dc2626; cursor: pointer; font-size: 16px; padding: 4px 8px; border-radius: 6px; }
  .btn-remove:hover { background: #fee2e2; }
  .form-actions { display: flex; justify-content: flex-end; gap: 12px; padding-top: 8px; }
  .btn-spinner { width: 14px; height: 14px; border: 2px solid rgba(255,255,255,.3); border-top-color: #fff; border-radius: 50%; animation: spin .7s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }
`]
})
export class ProprietaireFormComponent implements OnInit {
  private fb     = inject(FormBuilder);
  private svc    = inject(ProprietairesService);
  private router = inject(Router);
  private route  = inject(ActivatedRoute);

  form!: FormGroup;
  photoFile?: File;
  photoPreview?: string;
  submitting = false;
  isEdit = false;

  ngOnInit() {
    this.isEdit = !!this.route.snapshot.params['id'];
    this.buildForm();

    if (this.isEdit) {
      const id = this.route.snapshot.params['id'];
      this.svc.getById(id).subscribe((p: any) => {
        this.form.patchValue({
          nom:                 p.nom,
          prenom:              p.prenom,
          dateNaissance:       p.dateNaissance?.slice(0, 10),
          lieuNaissance:       p.lieuNaissance,
          adresse:             p.adresse,
          quartier:            p.quartier ?? '',
          telephone:           p.telephone,
          telephoneSecondaire: p.telephoneSecondaire ?? '',
          email:               p.email ?? '',
          typeDocumentId:      p.typeDocumentId ?? 'CarteNationaleIdentite',
          numeroDocument:      p.numeroDocument,
          notes:               p.notes ?? ''
        });

        // Comptes bancaires
        p.comptes?.forEach((c: any) => {
          this.comptes.push(this.fb.group({
            banque:       [c.banque, Validators.required],
            numero:       [c.numero, Validators.required],
            agence:       [c.agence ?? ''],
            estPrincipal: [c.estPrincipal ?? false]
          }));
        });

        // Plateformes
        p.plateformes?.forEach((pl: any) => {
          this.plateformes.push(this.fb.group({
            nom:          [pl.nom, Validators.required],
            numero:       [pl.numero, Validators.required],
            estPrincipal: [pl.estPrincipal ?? false]
          }));
        });

        // Photo existante
        if (p.photoIdentiteUrl) this.photoPreview = p.photoIdentiteUrl;
      });
    }
  }

  buildForm() {
    this.form = this.fb.group({
      nom:                 ['', Validators.required],
      prenom:              ['', Validators.required],
      dateNaissance:       ['', Validators.required],
      lieuNaissance:       ['', Validators.required],
      adresse:             ['', Validators.required],
      quartier:            [''],
      telephone:           ['', [Validators.required, Validators.pattern(/^\+?[\d\s\-]{8,}$/)]],
      telephoneSecondaire: [''],
      email:               ['', Validators.email],
      typeDocumentId:      ['CarteNationaleIdentite', Validators.required],
      numeroDocument:      ['', Validators.required],
      notes:               [''],
      comptes:             this.fb.array([]),
      plateformes:         this.fb.array([])
    });
  }

  field(name: string) { return this.form.get(name); }
  get comptes()    { return this.form.get('comptes') as FormArray; }
  get plateformes(){ return this.form.get('plateformes') as FormArray; }

  addCompte() {
    this.comptes.push(this.fb.group({
      banque: ['', Validators.required], numero: ['', Validators.required],
      agence: [''], estPrincipal: [false]
    }));
  }
  removeCompte(i: number) { this.comptes.removeAt(i); }

  addPlateforme() {
    this.plateformes.push(this.fb.group({
      nom: ['Bankily', Validators.required], numero: ['', Validators.required], estPrincipal: [false]
    }));
  }
  removePlateforme(i: number) { this.plateformes.removeAt(i); }

  onPhotoChange(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.photoFile = file;
    const reader = new FileReader();
    reader.onload = ev => this.photoPreview = ev.target?.result as string;
    reader.readAsDataURL(file);
  }

  onDrop(e: DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer?.files[0];
    if (file && file.type.startsWith('image/')) {
      this.photoFile = file;
      const reader = new FileReader();
      reader.onload = ev => this.photoPreview = ev.target?.result as string;
      reader.readAsDataURL(file);
    }
  }

  submit() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.submitting = true;
    const fd = this.svc.buildFormData(this.form.value, this.photoFile);

    if (this.isEdit) {
      const id = this.route.snapshot.params['id'];
      this.svc.update(id, fd).subscribe({
        next: () => this.router.navigate(['/proprietaires', id]),
        error: () => this.submitting = false
      });
    } else {
      this.svc.create(fd).subscribe({
        next: () => this.router.navigate(['/proprietaires']),
        error: () => this.submitting = false
      });
    }
  }
}