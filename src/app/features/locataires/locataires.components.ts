// ══════════════════════════════════════════════════════════════
//  LOCATAIRES LIST
// ══════════════════════════════════════════════════════════════
import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { LocatairesService } from '../../core/services/api.services';
import { LocataireListItemDto, PagedList } from '../../core/models/models';

@Component({
  selector: 'kdi-locataires-list',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  template: `
    <div class="page">
      <div class="page-header">
        <div><h2 class="page-title">Locataires</h2><p class="page-subtitle">Gestion des locataires et leurs baux</p></div>
        <a routerLink="/locataires/nouveau" class="btn btn-primary">＋ Nouveau locataire</a>
      </div>
      <div class="filters-bar">
        <input type="text" class="search-input" placeholder="🔍 Nom, téléphone, email…"
               [(ngModel)]="searchTerm" (ngModelChange)="onSearch()">
        <select class="filter-select" [(ngModel)]="filtreActif" (ngModelChange)="load()">
          <option value="">Tous</option>
          <option value="true">Actifs</option>
          <option value="false">Inactifs</option>
        </select>
      </div>
      <div class="table-card">
        <table class="data-table" *ngIf="liste().items.length; else empty">
          <thead><tr>
            <th>Locataire</th><th>Téléphone</th><th>Email</th>
            <th class="text-center">Baux actifs</th><th class="text-center">Statut</th>
            <th class="text-center">Inscrit le</th><th></th>
          </tr></thead>
          <tbody>
            <tr *ngFor="let l of liste().items">
              <td><div class="cell-main">{{ l.nomComplet }}</div></td>
              <td>{{ l.telephone }}</td>
              <td class="text-muted">{{ l.email ?? '—' }}</td>
              <td class="text-center">
                <span class="badge" [class.badge-blue]="l.nbContratsActifs>0" [class.badge-gray]="l.nbContratsActifs===0">
                  {{ l.nbContratsActifs }}
                </span>
              </td>
              <td class="text-center">
                <span class="badge" [class.badge-green]="l.estActif" [class.badge-gray]="!l.estActif">
                  {{ l.estActif ? 'Actif' : 'Inactif' }}
                </span>
              </td>
              <td class="text-center text-muted">{{ l.creeLe | date:'dd/MM/yyyy' }}</td>
              <td>
                <div class="row-actions">
                  <a [routerLink]="['/locataires', l.id]" class="btn-icon">👁</a>
                  <a [routerLink]="['/contrats-location']" [queryParams]="{locataireId:l.id}" class="btn-icon" title="Voir les baux">📋</a>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
        <ng-template #empty>
          <div class="empty-state"><span class="empty-icon">🧑‍🤝‍🧑</span><p>Aucun locataire trouvé</p>
            <a routerLink="/locataires/nouveau" class="btn btn-primary">Créer le premier</a></div>
        </ng-template>
      </div>
      <div class="pagination" *ngIf="liste().totalPages > 1">
        <button [disabled]="page===1" (click)="goPage(page-1)" class="page-btn">‹</button>
        <span class="page-info">{{ page }} / {{ liste().totalPages }}</span>
        <button [disabled]="!liste().hasNext" (click)="goPage(page+1)" class="page-btn">›</button>
      </div>
    </div>`,
  styles: [`
    .page{max-width:1100px;margin:0 auto}.page-header{display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:24px}.page-title{font-size:24px;font-weight:700;color:#0c1a35;margin:0 0 4px}.page-subtitle{font-size:14px;color:#64748b;margin:0}.btn{padding:9px 18px;border-radius:8px;font-size:14px;font-weight:500;cursor:pointer;border:none;text-decoration:none;display:inline-flex;align-items:center;gap:6px}.btn-primary{background:#0c1a35;color:#fff}.filters-bar{display:flex;gap:12px;margin-bottom:16px}.search-input{flex:1;padding:9px 14px;border:1px solid #e2e8f0;border-radius:8px;font-size:14px}.filter-select{padding:9px 14px;border:1px solid #e2e8f0;border-radius:8px;font-size:14px;background:#fff}.table-card{background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.06)}.data-table{width:100%;border-collapse:collapse}.data-table th{padding:12px 16px;background:#f8fafc;font-size:12px;font-weight:600;color:#64748b;text-align:left;border-bottom:1px solid #e2e8f0}.data-table td{padding:12px 16px;font-size:14px;color:#334155;border-bottom:1px solid #f1f5f9}.data-table tr:hover td{background:#fafbfc}.data-table tr:last-child td{border-bottom:none}.cell-main{font-weight:500;color:#0c1a35}.text-center{text-align:center}.text-muted{color:#94a3b8;font-size:13px}.badge{padding:3px 10px;border-radius:12px;font-size:12px;font-weight:500}.badge-green{background:#d1fae5;color:#065f46}.badge-blue{background:#dbeafe;color:#1d4ed8}.badge-gray{background:#f1f5f9;color:#64748b}.row-actions{display:flex;gap:6px;justify-content:flex-end}.btn-icon{background:none;border:none;cursor:pointer;font-size:16px;padding:4px;border-radius:6px;text-decoration:none}.btn-icon:hover{background:#f1f5f9}.empty-state{display:flex;flex-direction:column;align-items:center;padding:60px;gap:12px;color:#94a3b8}.empty-icon{font-size:48px}.pagination{display:flex;align-items:center;justify-content:center;gap:12px;margin-top:16px}.page-btn{padding:6px 14px;border:1px solid #e2e8f0;border-radius:6px;background:#fff;cursor:pointer}.page-btn:disabled{opacity:.4}.page-info{font-size:14px;color:#64748b}
  `]
})
export class LocatairesListComponent implements OnInit {
  private svc = inject(LocatairesService);
  liste = signal<PagedList<LocataireListItemDto>>({ items:[], totalCount:0, page:1, pageSize:20, totalPages:0, hasNext:false, hasPrevious:false });
  page=1; searchTerm=''; filtreActif=''; timer:any;
  ngOnInit() { this.load(); }
  load() {
    const actif = this.filtreActif==='' ? undefined : this.filtreActif==='true';
    this.svc.getAll(this.page, 20, this.searchTerm||undefined, actif).subscribe(r=>this.liste.set(r));
  }
  onSearch() { clearTimeout(this.timer); this.timer=setTimeout(()=>{this.page=1;this.load();},400); }
  goPage(p:number) { this.page=p; this.load(); }
}

// ══════════════════════════════════════════════════════════════
//  LOCATAIRE FORM
// ══════════════════════════════════════════════════════════════
import { ReactiveFormsModule, FormBuilder, FormArray, Validators } from '@angular/forms';
import { Router } from '@angular/router';

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

// ══════════════════════════════════════════════════════════════
//  LOCATAIRE DETAIL
// ══════════════════════════════════════════════════════════════
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'kdi-locataire-detail',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="page" *ngIf="loc">
      <div class="page-header">
        <div class="ph-left">
          <div class="avatar" *ngIf="!loc.photoIdentiteUrl">{{ loc.nomComplet.charAt(0) }}</div>
          <img *ngIf="loc.photoIdentiteUrl" [src]="loc.photoIdentiteUrl" class="photo">
          <div>
            <h2 class="page-title">{{ loc.nomComplet }}</h2>
            <p class="page-subtitle">{{ loc.telephone }}<span *ngIf="loc.email"> — {{ loc.email }}</span></p>
            <span class="badge" [class.bg]="loc.estActif" [class.bgray]="!loc.estActif">{{ loc.estActif ? 'Actif' : 'Inactif' }}</span>
          </div>
        </div>
        <div class="ha">
          <a [routerLink]="['/contrats-location/nouveau']" [queryParams]="{locataireId:loc.id}" class="btn btn-primary">📋 Nouveau bail</a>
          <a routerLink="/locataires" class="btn btn-ghost">← Retour</a>
        </div>
      </div>

      <div class="detail-grid">
        <div class="dc">
          <h3 class="dc-title">Informations personnelles</h3>
          <dl class="il">
            <dt>Date naissance</dt><dd>{{ loc.dateNaissance | date:'dd/MM/yyyy' }}</dd>
            <dt>Lieu naissance</dt><dd>{{ loc.lieuNaissance||'—' }}</dd>
            <dt>Adresse</dt><dd>{{ loc.adresse }}<span *ngIf="loc.quartier">, {{ loc.quartier }}</span></dd>
            <dt>Document</dt><dd>{{ loc.typeDocumentLabel }} — {{ loc.numeroDocument }}</dd>
            <dt *ngIf="loc.profession">Profession</dt><dd *ngIf="loc.profession">{{ loc.profession }}</dd>
            <dt *ngIf="loc.employeur">Employeur</dt><dd *ngIf="loc.employeur">{{ loc.employeur }}</dd>
          </dl>
        </div>
        <div class="dc">
          <h3 class="dc-title">Baux actifs ({{ loc.contratsActifs?.length || 0 }})</h3>
          <div *ngFor="let c of loc.contratsActifs" class="contrat-item">
            <div class="ci-code">{{ c.produitCode }}</div>
            <div class="ci-info">{{ c.numero }} — {{ c.loyer|number:'1.0-0' }} MRU/mois</div>
            <span class="badge bg">{{ c.statut }}</span>
            <a [routerLink]="['/contrats-location', c.id]" class="btn-icon">👁</a>
          </div>
          <div *ngIf="!loc.contratsActifs?.length" class="empty-mini">Aucun bail actif.</div>
        </div>
      </div>

      <!-- Documents -->
      <div class="dc" *ngIf="loc.documents?.length">
        <h3 class="dc-title">Documents ({{ loc.documents.length }})</h3>
        <div *ngFor="let d of loc.documents" class="doc-item">
          <span class="doc-icon">📄</span>
          <div><div class="doc-name">{{ d.nomFichier }}</div><div class="doc-type">{{ d.typeLabel }}</div></div>
          <a [href]="d.url" target="_blank" class="btn-icon">⬇️</a>
        </div>
      </div>

      <div class="dc" *ngIf="loc.notes" style="margin-top:16px">
        <h3 class="dc-title">Notes</h3>
        <p class="notes-text">{{ loc.notes }}</p>
      </div>
    </div>`,
  styles: [`
    .page{max-width:1000px;margin:0 auto}.page-header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:24px}.ph-left{display:flex;align-items:center;gap:16px}.avatar{width:64px;height:64px;border-radius:50%;background:#0c1a35;color:#c8a96e;font-size:28px;font-weight:700;display:flex;align-items:center;justify-content:center}.photo{width:64px;height:64px;border-radius:50%;object-fit:cover}.page-title{font-size:24px;font-weight:700;color:#0c1a35;margin:0 0 4px}.page-subtitle{font-size:14px;color:#64748b;margin:0 0 6px}.ha{display:flex;gap:8px}.btn{padding:9px 18px;border-radius:8px;font-size:14px;font-weight:500;cursor:pointer;border:none;text-decoration:none;display:inline-flex;align-items:center;gap:6px}.btn-primary{background:#0c1a35;color:#fff}.btn-ghost{background:transparent;color:#64748b}.btn-icon{background:none;border:none;cursor:pointer;font-size:16px;text-decoration:none;padding:4px}.badge,.bg,.bgray{padding:3px 10px;border-radius:12px;font-size:12px;font-weight:500}.bg{background:#d1fae5;color:#065f46}.bgray{background:#f1f5f9;color:#64748b}.detail-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px}.dc{background:#fff;border-radius:12px;padding:24px;box-shadow:0 1px 3px rgba(0,0,0,.06)}.dc-title{font-size:15px;font-weight:600;color:#0c1a35;margin:0 0 16px;padding-bottom:10px;border-bottom:1px solid #f1f5f9}.il{display:grid;grid-template-columns:auto 1fr;gap:8px 16px;font-size:14px;margin:0}dt{color:#64748b;font-weight:500}dd{color:#334155;margin:0}.contrat-item{display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid #f1f5f9;font-size:14px}.contrat-item:last-child{border:none}.ci-code{font-family:monospace;font-weight:700;background:#e0e7ef;padding:3px 8px;border-radius:6px;color:#0c1a35;font-size:12px}.ci-info{flex:1;color:#64748b;font-size:13px}.doc-item{display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid #f1f5f9}.doc-item:last-child{border:none}.doc-icon{font-size:24px}.doc-name{font-size:14px;font-weight:500;color:#334155}.doc-type{font-size:12px;color:#94a3b8}.notes-text{font-size:14px;color:#475569;line-height:1.6;margin:0}.empty-mini{font-size:14px;color:#94a3b8;padding:8px 0}
  `]
})
export class LocataireDetailComponent implements OnInit {
  private svc = inject(LocatairesService);
  private route = inject(ActivatedRoute);
  loc: any = null;
  ngOnInit() { this.svc.getById(this.route.snapshot.params['id']).subscribe(d=>this.loc=d); }
}
