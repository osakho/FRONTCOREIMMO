import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormArray, Validators } from '@angular/forms';
import { LocatairesService } from '../../../core/services/api.services';

@Component({
  selector: 'kdi-locataire-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <div class="page">
      <div class="page-header">
        <div><h2 class="page-title">Nouveau locataire</h2><p class="page-subtitle">Enregistrement avec documents obligatoires</p></div>
        <a routerLink="/locataires" class="btn btn-secondary">← Retour</a>
      </div>
      <form [formGroup]="form" (ngSubmit)="submit()">

        <!-- Identité -->
        <div class="form-card">
          <h3 class="form-card-title">Identité</h3>
          <div class="form-grid-2">
            <div class="form-group"><label>Prénom *</label>
              <input formControlName="prenom" class="form-control" placeholder="Aminata">
              <span class="err" *ngIf="f('prenom')?.invalid&&f('prenom')?.touched">Obligatoire</span></div>
            <div class="form-group"><label>Nom *</label>
              <input formControlName="nom" class="form-control" placeholder="Diallo">
              <span class="err" *ngIf="f('nom')?.invalid&&f('nom')?.touched">Obligatoire</span></div>
            <div class="form-group"><label>Date de naissance *</label>
              <input formControlName="dateNaissance" type="date" class="form-control"></div>
            <div class="form-group"><label>Lieu de naissance</label>
              <input formControlName="lieuNaissance" class="form-control" placeholder="Nouakchott"></div>
          </div>

          <!-- Photo identité -->
          <div class="form-group" style="margin-top:16px">
            <label>Photo d'identité</label>
            <div class="file-drop" (click)="photoInput.click()" (drop)="onDrop($event,'photo')" (dragover)="$event.preventDefault()">
              <input #photoInput type="file" accept="image/*" style="display:none" (change)="onFileChange($event,'photo')">
              <div *ngIf="!photoPreview" class="fd-placeholder"><span class="fd-icon">📸</span><p>Cliquer ou glisser la photo ici</p></div>
              <img *ngIf="photoPreview" [src]="photoPreview" class="fd-preview">
            </div>
          </div>
        </div>

        <!-- Coordonnées -->
        <div class="form-card">
          <h3 class="form-card-title">Coordonnées</h3>
          <div class="form-grid-2">
            <div class="form-group"><label>Téléphone principal *</label>
              <input formControlName="telephone" class="form-control" placeholder="+222 36 XX XX XX"></div>
            <div class="form-group"><label>Téléphone secondaire</label>
              <input formControlName="telephoneSecondaire" class="form-control"></div>
            <div class="form-group"><label>Email</label>
              <input formControlName="email" type="email" class="form-control"></div>
            <div class="form-group"><label>Quartier</label>
              <input formControlName="quartier" class="form-control"></div>
            <div class="form-group fg-full"><label>Adresse complète *</label>
              <textarea formControlName="adresse" class="form-control" rows="2"></textarea></div>
          </div>
        </div>

        <!-- Document officiel -->
        <div class="form-card">
          <h3 class="form-card-title">Document officiel *</h3>
          <div class="form-grid-2">
            <div class="form-group"><label>Type de document *</label>
              <select formControlName="typeDocumentId" class="form-control">
                <option value="CarteNationaleIdentite">Carte nationale d'identité</option>
                <option value="Passeport">Passeport</option>
                <option value="CarteDeSejour">Carte de séjour</option>
                <option value="CarteConsulaire">Carte consulaire</option>
                <option value="Autre">Autre</option>
              </select></div>
            <div class="form-group"><label>Numéro du document *</label>
              <input formControlName="numeroDocument" class="form-control" placeholder="NNI-001-85-MR"></div>
            <div class="form-group fg-full"><label>Fichier du document</label>
              <div class="file-drop-sm" (click)="docInput.click()" (dragover)="$event.preventDefault()">
                <input #docInput type="file" accept=".pdf,image/*" style="display:none" (change)="onFileChange($event,'doc')">
                <span *ngIf="!docFile">📎 Cliquer pour joindre le document (PDF ou image)</span>
                <span *ngIf="docFile" class="file-name">✓ {{ docFile.name }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Situation professionnelle -->
        <div class="form-card">
          <h3 class="form-card-title">Situation professionnelle</h3>
          <div class="form-grid-2">
            <div class="form-group"><label>Profession</label>
              <input formControlName="profession" class="form-control" placeholder="Commerçant, Fonctionnaire…"></div>
            <div class="form-group"><label>Employeur</label>
              <input formControlName="employeur" class="form-control" placeholder="Ministère, Société…"></div>
          </div>
        </div>

        <!-- Notes -->
        <div class="form-card">
          <h3 class="form-card-title">Notes</h3>
          <div class="form-group">
            <textarea formControlName="notes" class="form-control" rows="3" placeholder="Observations, informations complémentaires…"></textarea>
          </div>
        </div>

        <div class="form-actions">
          <a routerLink="/locataires" class="btn btn-secondary">Annuler</a>
          <button type="submit" class="btn btn-primary" [disabled]="form.invalid||submitting">
            <span *ngIf="submitting" class="spinner"></span>
            {{ submitting ? 'Enregistrement…' : '✅ Créer le locataire' }}
          </button>
        </div>
      </form>
    </div>`,
  styles: [`
    .page{max-width:900px;margin:0 auto}.page-header{display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:24px}.page-title{font-size:24px;font-weight:700;color:#0c1a35;margin:0 0 4px}.page-subtitle{font-size:14px;color:#64748b;margin:0}.btn{padding:9px 18px;border-radius:8px;font-size:14px;font-weight:500;cursor:pointer;border:none;text-decoration:none;display:inline-flex;align-items:center;gap:6px}.btn-primary{background:#0c1a35;color:#fff}.btn-primary:disabled{opacity:.5;cursor:not-allowed}.btn-secondary{background:#fff;color:#334155;border:1px solid #e2e8f0}.form-card{background:#fff;border-radius:12px;padding:24px;margin-bottom:16px;box-shadow:0 1px 3px rgba(0,0,0,.06)}.form-card-title{font-size:16px;font-weight:600;color:#0c1a35;margin:0 0 20px;padding-bottom:12px;border-bottom:1px solid #f1f5f9}.form-grid-2{display:grid;grid-template-columns:1fr 1fr;gap:16px}.form-group{display:flex;flex-direction:column;gap:6px}.fg-full{grid-column:1/-1}label{font-size:13px;font-weight:500;color:#374151}.form-control{padding:9px 12px;border:1px solid #e2e8f0;border-radius:8px;font-size:14px}.form-control:focus{outline:none;border-color:#0c1a35}.err{font-size:12px;color:#dc2626}.form-actions{display:flex;justify-content:flex-end;gap:12px}.file-drop{border:2px dashed #e2e8f0;border-radius:10px;padding:24px;text-align:center;cursor:pointer;transition:border-color .15s}.file-drop:hover{border-color:#c8a96e}.fd-placeholder .fd-icon{font-size:36px;display:block;margin-bottom:8px}.fd-placeholder p{font-size:14px;color:#64748b;margin:0}.fd-preview{max-height:140px;border-radius:8px}.file-drop-sm{border:1px dashed #e2e8f0;border-radius:8px;padding:12px 16px;cursor:pointer;font-size:13px;color:#64748b}.file-drop-sm:hover{border-color:#0c1a35}.file-name{color:#059669;font-weight:500}.form-actions{display:flex;justify-content:flex-end;gap:12px}.spinner{width:14px;height:14px;border:2px solid rgba(255,255,255,.3);border-top-color:#fff;border-radius:50%;animation:spin .7s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}
  `]
})
export class LocataireFormComponent {
  private fb = inject(FormBuilder);
  private svc = inject(LocatairesService);
  private router = inject(Router);

  form = this.fb.group({
    nom:                ['', Validators.required],
    prenom:             ['', Validators.required],
    dateNaissance:      [''],
    lieuNaissance:      [''],
    adresse:            ['', Validators.required],
    quartier:           [''],
    telephone:          ['', Validators.required],
    telephoneSecondaire:[''],
    email:              ['', Validators.email],
    typeDocumentId:     ['CarteNationaleIdentite', Validators.required],
    numeroDocument:     ['', Validators.required],
    profession:         [''],
    employeur:          [''],
    notes:              ['']
  });

  photoFile?: File; photoPreview?: string; docFile?: File; submitting=false;

  f(n:string) { return this.form.get(n); }

  onFileChange(e:Event, type:string) {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    if (type==='photo') {
      this.photoFile=file;
      const r=new FileReader(); r.onload=ev=>this.photoPreview=ev.target?.result as string; r.readAsDataURL(file);
    } else { this.docFile=file; }
  }

  onDrop(e:DragEvent, type:string) {
    e.preventDefault();
    const file=e.dataTransfer?.files[0]; if (!file) return;
    if (type==='photo' && file.type.startsWith('image/')) {
      this.photoFile=file;
      const r=new FileReader(); r.onload=ev=>this.photoPreview=ev.target?.result as string; r.readAsDataURL(file);
    }
  }

  submit() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.submitting=true;
    const fd=new FormData();
    Object.entries(this.form.value).forEach(([k,v])=>{ if(v!=null && v!='') fd.append(k,v as string); });
    if (this.photoFile) fd.append('photoIdentite', this.photoFile);
    if (this.docFile) {
      fd.append('Documents[0].Fichier', this.docFile);
      fd.append('Documents[0].Type', 'CarteIdentite');
      fd.append('Documents[0].Description', 'Document identité principal');
    }
    this.svc.create(fd).subscribe({ next:()=>this.router.navigate(['/locataires']), error:()=>{this.submitting=false;} });
  }
}