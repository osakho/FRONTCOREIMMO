// ══════════════════════════════════════════════════════════════
//  PROPRIÉTAIRES LIST
// ══════════════════════════════════════════════════════════════
import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ProprietairesService } from '../../../core/services/api.services';
import { ProprietaireListItemDto, PagedList } from '../../../core/models/models';


const SHARED_LIST_STYLES = `
  .page { max-width: 1200px; margin: 0 auto; }
  .page-header { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 24px; }
  .page-title { font-size: 24px; font-weight: 700; color: #0c1a35; margin: 0 0 4px; }
  .page-subtitle { font-size: 14px; color: #64748b; margin: 0; }

  .btn { padding: 9px 18px; border-radius: 8px; font-size: 14px; font-weight: 500; cursor: pointer; border: none; text-decoration: none; display: inline-flex; align-items: center; gap: 6px; transition: all .15s; }
  .btn-primary { background: #0c1a35; color: #fff; }
  .btn-primary:hover { background: #1a2d52; }
  .btn-secondary { background: #fff; color: #334155; border: 1px solid #e2e8f0; }
  .btn-ghost { background: transparent; color: #64748b; }

  .filters-bar { display: flex; gap: 12px; margin-bottom: 16px; }
  .search-input { flex: 1; padding: 9px 14px; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 14px; }
  .filter-select { padding: 9px 14px; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 14px; background: #fff; }

  .table-card { background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,.06); }
  .data-table { width: 100%; border-collapse: collapse; }
  .data-table th { padding: 12px 16px; background: #f8fafc; font-size: 12px; font-weight: 600; color: #64748b; text-align: left; border-bottom: 1px solid #e2e8f0; }
  .data-table td { padding: 12px 16px; font-size: 14px; color: #334155; border-bottom: 1px solid #f1f5f9; }
  .data-table tr:hover td { background: #fafbfc; }
  .data-table tr:last-child td { border-bottom: none; }
  .cell-main { font-weight: 500; color: #0c1a35; }
  .text-center { text-align: center; }
  .text-muted { color: #94a3b8; }

  .badge { padding: 3px 10px; border-radius: 12px; font-size: 12px; font-weight: 500; }
  .badge-navy  { background: #e0e7ef; color: #0c1a35; }
  .badge-green { background: #d1fae5; color: #065f46; }
  .badge-gray  { background: #f1f5f9; color: #64748b; }

  .row-actions { display: flex; gap: 6px; justify-content: flex-end; }
  .btn-icon { background: none; border: none; cursor: pointer; font-size: 16px; padding: 4px; border-radius: 6px; text-decoration: none; }
  .btn-icon:hover { background: #f1f5f9; }

  .empty-state { display: flex; flex-direction: column; align-items: center; padding: 60px; gap: 12px; color: #94a3b8; }
  .empty-icon { font-size: 48px; }
  .empty-state p { font-size: 16px; margin: 0; }

  .pagination { display: flex; align-items: center; justify-content: center; gap: 12px; margin-top: 16px; }
  .page-btn { padding: 6px 14px; border: 1px solid #e2e8f0; border-radius: 6px; background: #fff; cursor: pointer; }
  .page-btn:disabled { opacity: .4; cursor: not-allowed; }
  .page-info { font-size: 14px; color: #64748b; }
`;

const SHARED_FORM_STYLES = `
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
`;

const SHARED_DETAIL_STYLES = `
  .page { max-width: 1100px; margin: 0 auto; }
  .page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; }
  .page-title { font-size: 24px; font-weight: 700; color: #0c1a35; margin: 0 0 4px; }
  .page-subtitle { font-size: 14px; color: #64748b; margin: 0 0 8px; }
  .detail-header-main { display: flex; align-items: center; gap: 20px; }
  .detail-avatar { width: 64px; height: 64px; border-radius: 50%; background: #0c1a35; color: #c8a96e; font-size: 28px; font-weight: 700; display: flex; align-items: center; justify-content: center; }
  .detail-photo { width: 64px; height: 64px; border-radius: 50%; object-fit: cover; }
  .header-actions { display: flex; gap: 8px; }

  .btn { padding: 9px 18px; border-radius: 8px; font-size: 14px; font-weight: 500; cursor: pointer; border: none; text-decoration: none; display: inline-flex; align-items: center; gap: 6px; }
  .btn-secondary { background: #fff; color: #334155; border: 1px solid #e2e8f0; }
  .btn-ghost { background: transparent; color: #64748b; }
  .btn-sm { padding: 6px 12px; font-size: 13px; background: #f1f5f9; border: 1px solid #e2e8f0; border-radius: 6px; cursor: pointer; text-decoration: none; }

  .badge { padding: 3px 10px; border-radius: 12px; font-size: 12px; font-weight: 500; }
  .badge-green { background: #d1fae5; color: #065f46; }
  .badge-gray  { background: #f1f5f9; color: #64748b; }

  .detail-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
  .detail-card { background: #fff; border-radius: 12px; padding: 24px; box-shadow: 0 1px 3px rgba(0,0,0,.06); }
  .detail-card-title { font-size: 15px; font-weight: 600; color: #0c1a35; margin: 0 0 16px; padding-bottom: 10px; border-bottom: 1px solid #f1f5f9; }

  .info-list { margin: 0; display: grid; grid-template-columns: auto 1fr; gap: 8px 16px; font-size: 14px; }
  dt { color: #64748b; font-weight: 500; white-space: nowrap; }
  dd { color: #334155; margin: 0; }

  .stat-grid { display: flex; gap: 24px; }
  .stat-item { text-align: center; }
  .stat-val { font-size: 32px; font-weight: 700; color: #0c1a35; }
  .stat-lbl { font-size: 12px; color: #64748b; }
  .mt-2 { margin-top: 16px; }

  .sub-item { display: flex; align-items: center; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #f1f5f9; }
  .sub-item:last-child { border-bottom: none; }
  .sub-item-main { font-size: 14px; color: #334155; }

  .doc-item { display: flex; align-items: center; gap: 12px; padding: 10px 0; border-bottom: 1px solid #f1f5f9; }
  .doc-item:last-child { border-bottom: none; }
  .doc-icon { font-size: 24px; }
  .doc-name { font-size: 14px; color: #334155; font-weight: 500; }
  .doc-type { font-size: 12px; color: #94a3b8; }
  .btn-icon { font-size: 16px; text-decoration: none; padding: 4px; }

  .notes-text { font-size: 14px; color: #475569; line-height: 1.6; white-space: pre-wrap; margin: 0; }
`;

@Component({
  selector: 'kdi-proprietaires-list',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  template: `
    <div class="page">
      <div class="page-header">
        <div>
          <h2 class="page-title">Propriétaires</h2>
          <p class="page-subtitle">Gestion des propriétaires et leurs biens</p>
        </div>
        <a routerLink="/proprietaires/nouveau" class="btn btn-primary">＋ Nouveau propriétaire</a>
      </div>

      <!-- Filtres -->
      <div class="filters-bar">
        <input type="text" class="search-input" placeholder="🔍 Rechercher (nom, téléphone…)"
               [(ngModel)]="searchTerm" (ngModelChange)="onSearch()">
        <select class="filter-select" [(ngModel)]="filtreActif" (ngModelChange)="load()">
          <option value="">Tous les statuts</option>
          <option value="true">Actifs</option>
          <option value="false">Inactifs</option>
        </select>
      </div>

      <!-- Table -->
      <div class="table-card">
        <table class="data-table" *ngIf="liste().items.length; else empty">
          <thead>
            <tr>
              <th>Propriétaire</th>
              <th>Téléphone</th>
              <th>Email</th>
              <th class="text-center">Propriétés</th>
              <th class="text-center">Statut</th>
              <th class="text-center">Inscrit le</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let p of liste().items">
              <td>
                <div class="cell-main">{{ p.nomComplet }}</div>
              </td>
              <td>{{ p.telephone }}</td>
              <td>{{ p.email ?? '—' }}</td>
              <td class="text-center">
                <span class="badge badge-navy">{{ p.nombreProprietes }}</span>
              </td>
              <td class="text-center">
                <span class="badge" [class.badge-green]="p.estActif" [class.badge-gray]="!p.estActif">
                  {{ p.estActif ? 'Actif' : 'Inactif' }}
                </span>
              </td>
              <td class="text-center text-muted">{{ p.creeLe | date:'dd/MM/yyyy' }}</td>
              <td>
                <div class="row-actions">
                  <a [routerLink]="['/proprietaires', p.id]" class="btn-icon" title="Voir">👁</a>
                  <a [routerLink]="['/proprietaires', p.id, 'edit']" class="btn-icon" title="Modifier">✏️</a>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
        <ng-template #empty>
          <div class="empty-state">
            <span class="empty-icon">👤</span>
            <p>Aucun propriétaire trouvé</p>
            <a routerLink="/proprietaires/nouveau" class="btn btn-primary">Créer le premier</a>
          </div>
        </ng-template>
      </div>

      <!-- Pagination -->
      <div class="pagination" *ngIf="liste().totalPages > 1">
        <button [disabled]="page === 1" (click)="goPage(page-1)" class="page-btn">‹</button>
        <span class="page-info">{{ page }} / {{ liste().totalPages }}</span>
        <button [disabled]="!liste().hasNext" (click)="goPage(page+1)" class="page-btn">›</button>
      </div>
    </div>
  `,
  styles: [SHARED_LIST_STYLES]
})
export class ProprietairesListComponent implements OnInit {
  private svc = inject(ProprietairesService);
  liste = signal<PagedList<ProprietaireListItemDto>>({ items: [], totalCount: 0, page: 1, pageSize: 20, totalPages: 0, hasNext: false, hasPrevious: false });
  page = 1; searchTerm = ''; filtreActif = ''; timer: any;

  ngOnInit() { this.load(); }

  load() {
    const actif = this.filtreActif === '' ? undefined : this.filtreActif === 'true';
    this.svc.getAll(this.page, 20, this.searchTerm || undefined, actif)
      .subscribe(r => this.liste.set(r));
  }

  onSearch() {
    clearTimeout(this.timer);
    this.timer = setTimeout(() => { this.page = 1; this.load(); }, 400);
  }

  goPage(p: number) { this.page = p; this.load(); }
}

// ══════════════════════════════════════════════════════════════
//  PROPRIÉTAIRE FORM (Créer / Modifier)
// ══════════════════════════════════════════════════════════════
import { ReactiveFormsModule, FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';

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
  styles: [SHARED_FORM_STYLES]
})
export class ProprietaireFormComponent implements OnInit {
  private fb      = inject(FormBuilder);
  private svc     = inject(ProprietairesService);
  private router  = inject(Router);
  private route   = inject(ActivatedRoute);

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

        // Charger les comptes bancaires
        p.comptes?.forEach((c: any) => {
          this.comptes.push(this.fb.group({
            banque:       [c.banque, Validators.required],
            numero:       [c.numero, Validators.required],
            agence:       [c.agence ?? ''],
            estPrincipal: [c.estPrincipal ?? false]
          }));
        });

        // Charger les plateformes
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
      nom:                ['', Validators.required],
      prenom:             ['', Validators.required],
      dateNaissance:      ['', Validators.required],
      lieuNaissance:      ['', Validators.required],
      adresse:            ['', Validators.required],
      quartier:           [''],
      telephone:          ['', [Validators.required, Validators.pattern(/^\+?[\d\s\-]{8,}$/)]],
      telephoneSecondaire:[''],
      email:              ['', Validators.email],
      typeDocumentId:     ['CarteNationaleIdentite', Validators.required],
      numeroDocument:     ['', Validators.required],
      notes:              [''],
      comptes:            this.fb.array([]),
      plateformes:        this.fb.array([])
    });
  }

  field(name: string) { return this.form.get(name); }
  get comptes()      { return this.form.get('comptes') as FormArray; }
  get plateformes()  { return this.form.get('plateformes') as FormArray; }

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
    const reader  = new FileReader();
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

// ══════════════════════════════════════════════════════════════
//  PROPRIÉTAIRE DETAIL
// ══════════════════════════════════════════════════════════════
@Component({
  selector: 'kdi-proprietaire-detail',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="page" *ngIf="proprietaire">
      <div class="page-header">
        <div class="detail-header-main">
          <div class="detail-avatar" *ngIf="!proprietaire.photoIdentiteUrl">
            {{ proprietaire.nomComplet.charAt(0) }}
          </div>
          <img *ngIf="proprietaire.photoIdentiteUrl" [src]="proprietaire.photoIdentiteUrl"
               class="detail-photo" alt="Photo">
          <div>
            <h2 class="page-title">{{ proprietaire.nomComplet }}</h2>
            <!-- <p class="page-subtitle">{{ proprietaire.telephone }} — {{ proprietaire.email ?? 'Pas d\'email' }}</p> -->
            <p class="page-subtitle">{{ proprietaire.telephone }} — {{ proprietaire.email ?? "Pas d'email" }}</p>
            <span class="badge" [class.badge-green]="proprietaire.estActif" [class.badge-gray]="!proprietaire.estActif">
              {{ proprietaire.estActif ? 'Actif' : 'Inactif' }}
            </span>
          </div>
        </div>
        <div class="header-actions">
          <a [routerLink]="['/proprietaires', proprietaire.id, 'edit']" class="btn btn-secondary">✏️ Modifier</a>
          <a routerLink="/proprietaires" class="btn btn-ghost">← Retour</a>
        </div>
      </div>

      <div class="detail-grid">
        <!-- Infos personnelles -->
        <div class="detail-card">
          <h3 class="detail-card-title">Informations personnelles</h3>
          <dl class="info-list">
            <dt>Date de naissance</dt><dd>{{ proprietaire.dateNaissance | date:'dd/MM/yyyy' }}</dd>
            <dt>Lieu de naissance</dt><dd>{{ proprietaire.lieuNaissance }}</dd>
            <dt>Adresse</dt><dd>{{ proprietaire.adresse }}<span *ngIf="proprietaire.quartier">, {{ proprietaire.quartier }}</span></dd>
            <dt>Document</dt><dd>{{ proprietaire.typeDocumentLabel }} — {{ proprietaire.numeroDocument }}</dd>
          </dl>
        </div>

        <!-- Statistiques -->
        <div class="detail-card">
          <h3 class="detail-card-title">Patrimoine géré</h3>
          <div class="stat-grid">
            <div class="stat-item">
              <div class="stat-val">{{ proprietaire.nombreProprietes }}</div>
              <div class="stat-lbl">Propriétés</div>
            </div>
          </div>
          <a [routerLink]="['/proprietes']" [queryParams]="{proprietaireId: proprietaire.id}" class="btn btn-sm mt-2">Voir les propriétés →</a>
        </div>

        <!-- Comptes bancaires -->
        <div class="detail-card" *ngIf="proprietaire.comptes.length">
          <h3 class="detail-card-title">Comptes bancaires</h3>
          <div *ngFor="let c of proprietaire.comptes" class="sub-item">
            <div class="sub-item-main">{{ c.banque }} — {{ c.numero }}</div>
            <span class="badge badge-green" *ngIf="c.estPrincipal">Principal</span>
          </div>
        </div>

        <!-- Plateformes mobiles -->
        <div class="detail-card" *ngIf="proprietaire.plateformes.length">
          <h3 class="detail-card-title">Plateformes mobiles</h3>
          <div *ngFor="let p of proprietaire.plateformes" class="sub-item">
            <div class="sub-item-main">{{ p.nom }} — {{ p.numero }}</div>
            <span class="badge badge-green" *ngIf="p.estPrincipal">Principal</span>
          </div>
        </div>

        <!-- Documents -->
        <div class="detail-card" *ngIf="proprietaire.documents.length">
          <h3 class="detail-card-title">Documents attachés</h3>
          <div *ngFor="let d of proprietaire.documents" class="doc-item">
            <span class="doc-icon">📄</span>
            <div>
              <div class="doc-name">{{ d.nomFichier }}</div>
              <div class="doc-type">{{ d.typeLabel }} — {{ d.creeLe | date:'dd/MM/yyyy' }}</div>
            </div>
            <a [href]="d.url" target="_blank" class="btn-icon">⬇️</a>
          </div>
        </div>

        <!-- Notes -->
        <div class="detail-card" *ngIf="proprietaire.notes">
          <h3 class="detail-card-title">Notes</h3>
          <p class="notes-text">{{ proprietaire.notes }}</p>
        </div>
      </div>
    </div>
  `,
  styles: [SHARED_DETAIL_STYLES]
})
export class ProprietaireDetailComponent implements OnInit {
  private svc   = inject(ProprietairesService);
  private route = inject(ActivatedRoute);
  proprietaire: any;

  ngOnInit() {
    const id = this.route.snapshot.params['id'];
    this.svc.getById(id).subscribe(p => this.proprietaire = p);
  }
}

// ══════════════════════════════════════════════════════════════
//  STYLES PARTAGÉS
// ══════════════════════════════════════════════════════════════