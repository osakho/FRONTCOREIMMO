// ══════════════════════════════════════════════════════════════
//  PERSONNEL LIST
// ══════════════════════════════════════════════════════════════
import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { PersonnelService } from '../../../core/services/api.services';
import { PersonnelListItemDto, PagedList } from '../../../core/models/models';

@Component({
  selector: 'kdi-personnel-list',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  template: `
    <div class="page">
      <div class="page-header">
        <div>
          <h2 class="page-title">Personnel</h2>
          <p class="page-subtitle">Équipe KDI Immo — Collecteurs, Comptables, Assistantes…</p>
        </div>
        <a routerLink="/personnel/nouveau" class="btn btn-primary">＋ Nouveau membre</a>
      </div>

      <div class="table-card">
        <table class="data-table" *ngIf="liste().items.length; else empty">
          <thead><tr>
            <th>Nom complet</th>
            <th>Fonction</th>
            <th>Poste</th>
            <th class="text-center">Statut</th>
            <th>Actions</th>
          </tr></thead>
          <tbody>
            <tr *ngFor="let p of liste().items">
              <td>
                <div class="cell-main">{{ p.nomComplet }}</div>
              </td>
              <td>
                <span class="type-badge" [attr.data-type]="p.typeLabel">
                  {{ typeIcon(p.typeLabel) }} {{ p.typeLabel }}
                </span>
              </td>
              <td class="text-muted">{{ p.poste }}</td>
              <td class="text-center">
                <span class="badge" [class.badge-green]="p.estActif" [class.badge-gray]="!p.estActif">
                  {{ p.estActif ? 'Actif' : 'Inactif' }}
                </span>
              </td>
              <td>
                <div class="row-actions">
                  <button *ngIf="p.typeLabel === 'Collecteur'"
                          (click)="affecterPropriete(p)" class="btn-action" title="Affecter propriété">🏘️</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
        <ng-template #empty>
          <div class="empty-state">
            <span class="empty-icon">👥</span>
            <p>Aucun membre du personnel</p>
            <a routerLink="/personnel/nouveau" class="btn btn-primary">Recruter le premier</a>
          </div>
        </ng-template>
      </div>
    </div>
  `,
  styles: [`
    .page{max-width:1000px;margin:0 auto}
    .page-header{display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:24px}
    .page-title{font-size:24px;font-weight:700;color:#0c1a35;margin:0 0 4px}
    .page-subtitle{font-size:14px;color:#64748b;margin:0}
    .btn{padding:9px 18px;border-radius:8px;font-size:14px;font-weight:500;cursor:pointer;border:none;text-decoration:none;display:inline-flex;align-items:center;gap:6px}
    .btn-primary{background:#0c1a35;color:#fff}
    .table-card{background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.06)}
    .data-table{width:100%;border-collapse:collapse}
    .data-table th{padding:12px 14px;background:#f8fafc;font-size:12px;font-weight:600;color:#64748b;text-align:left;border-bottom:1px solid #e2e8f0;text-transform:uppercase}
    .data-table td{padding:11px 14px;font-size:13px;color:#334155;border-bottom:1px solid #f1f5f9}
    .data-table tr:last-child td{border-bottom:none}.data-table tr:hover td{background:#fafbfc}
    .cell-main{font-weight:500;color:#0c1a35}
    .type-badge{display:inline-flex;align-items:center;gap:4px;padding:3px 10px;border-radius:10px;font-size:12px;font-weight:500;background:#e0e7ef;color:#334155}
    .text-center{text-align:center}.text-muted{color:#94a3b8}
    .badge{padding:3px 10px;border-radius:12px;font-size:12px;font-weight:500}
    .badge-green{background:#d1fae5;color:#065f46}.badge-gray{background:#f1f5f9;color:#64748b}
    .row-actions{display:flex;gap:6px}
    .btn-action{background:none;border:1px solid #e2e8f0;border-radius:6px;cursor:pointer;font-size:16px;padding:4px 8px}
    .btn-action:hover{background:#f1f5f9}
    .empty-state{display:flex;flex-direction:column;align-items:center;padding:60px;gap:12px;color:#94a3b8}
    .empty-icon{font-size:48px}
  `]
})
export class PersonnelListComponent implements OnInit {
  private svc = inject(PersonnelService);

  liste = signal<PagedList<PersonnelListItemDto>>({ items:[], totalCount:0, page:1, pageSize:20, totalPages:0, hasNext:false, hasPrevious:false });

  ngOnInit() { this.load(); }
  load() { this.svc.getAll().subscribe(r => this.liste.set(r)); }

  typeIcon(t: string) {
    const icons: Record<string, string> = { Comptable:'🧾', Collecteur:'💼', ChargeTravaux:'🔧', Menage:'🧹', Communication:'📢', Assistante:'👩‍💼', Direction:'👔', Autre:'👤' };
    return icons[t] || '👤';
  }

  affecterPropriete(p: PersonnelListItemDto) {
    const proprieteId = prompt('ID de la propriété à affecter :');
    if (!proprieteId) return;
    const dateDebut = new Date().toISOString().substring(0,10);
    this.svc.affecterPropriete(p.id, proprieteId, dateDebut).subscribe(() => alert('Affectation enregistrée'));
  }
}

// ══════════════════════════════════════════════════════════════
//  PERSONNEL FORM
// ══════════════════════════════════════════════════════════════
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';

@Component({
  selector: 'kdi-personnel-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <div class="page">
      <div class="page-header">
        <div>
          <h2 class="page-title">Nouveau membre du personnel</h2>
          <p class="page-subtitle">Enregistrement d'un collaborateur</p>
        </div>
        <a routerLink="/personnel" class="btn btn-secondary">← Retour</a>
      </div>

      <!-- Docs obligatoires -->
      <div class="docs-alert">
        <strong>📋 Documents requis :</strong>
        <span class="doc-item" [class.ok]="photoIdentite">📸 Photo identité</span>
        <span class="doc-item" [class.ok]="docIdentite">🪪 Document officiel</span>
        <span class="doc-item" [class.ok]="contratTravail">📄 Contrat de travail</span>
      </div>

      <form [formGroup]="form" (ngSubmit)="submit()">
        <!-- Identité -->
        <div class="form-card">
          <h3 class="form-card-title">Identité</h3>
          <div class="form-grid-2">
            <div class="form-group">
              <label>Prénom *</label>
              <input formControlName="prenom" class="form-control" placeholder="Mohamed">
            </div>
            <div class="form-group">
              <label>Nom *</label>
              <input formControlName="nom" class="form-control" placeholder="Ould Ahmed">
            </div>
            <div class="form-group">
              <label>Date de naissance *</label>
              <input formControlName="dateNaissance" type="date" class="form-control">
            </div>
            <div class="form-group">
              <label>Adresse</label>
              <input formControlName="adresse" class="form-control">
            </div>
            <div class="form-group">
              <label>Téléphone *</label>
              <input formControlName="telephone" class="form-control" placeholder="+222 36…">
            </div>
            <div class="form-group">
              <label>Email</label>
              <input formControlName="email" type="email" class="form-control">
            </div>
          </div>

          <!-- Photo identité -->
          <div class="form-group" style="margin-top:16px">
            <label>Photo identité *</label>
            <div class="file-zone" [class.uploaded]="photoIdentite" (click)="photoInput.click()">
              <input #photoInput type="file" accept="image/*" style="display:none" (change)="onPhoto($event)">
              <span *ngIf="!photoPreview">📸 Cliquer pour ajouter</span>
              <img *ngIf="photoPreview" [src]="photoPreview" class="photo-preview" alt="Aperçu">
            </div>
          </div>
        </div>

        <!-- Document officiel -->
        <div class="form-card">
          <h3 class="form-card-title">Document officiel</h3>
          <div class="form-grid-2">
            <div class="form-group">
              <label>Type *</label>
              <select formControlName="typeDocumentId" class="form-control">
                <option value="CarteNationaleIdentite">CNI</option>
                <option value="Passeport">Passeport</option>
                <option value="CarteDeSejour">Carte de séjour</option>
              </select>
            </div>
            <div class="form-group">
              <label>Numéro *</label>
              <input formControlName="numeroDocument" class="form-control">
            </div>
          </div>
          <div class="form-group" style="margin-top:12px">
            <label>Joindre le document *</label>
            <div class="file-zone" [class.uploaded]="docIdentite" (click)="docInput.click()">
              <input #docInput type="file" accept=".pdf,.jpg,.png" style="display:none" (change)="onDocIdentite($event)">
              <span *ngIf="!docIdentite">📎 Cliquer pour joindre</span>
              <span *ngIf="docIdentite" class="file-ok">✅ {{ docIdentite.name }}</span>
            </div>
          </div>
        </div>

        <!-- Poste -->
        <div class="form-card">
          <h3 class="form-card-title">Poste & Contrat</h3>
          <div class="form-grid-2">
            <div class="form-group">
              <label>Fonction *</label>
              <select formControlName="typePersonnel" class="form-control">
                <option value="Comptable">Comptable</option>
                <option value="Collecteur">Collecteur</option>
                <option value="ChargeTravaux">Chargé travaux</option>
                <option value="Menage">Ménage</option>
                <option value="Communication">Communication</option>
                <option value="Assistante">Assistante</option>
                <option value="Direction">Direction</option>
              </select>
            </div>
            <div class="form-group">
              <label>Intitulé du poste *</label>
              <input formControlName="poste" class="form-control" placeholder="Collecteur terrain zone Nord">
            </div>
            <div class="form-group">
              <label>Date d'embauche *</label>
              <input formControlName="dateEmbauche" type="date" class="form-control">
            </div>
            <div class="form-group">
              <label>Salaire de base (MRU)</label>
              <input formControlName="salaireBase" type="number" class="form-control" placeholder="25000">
            </div>
          </div>
          <div class="form-group" style="margin-top:12px">
            <label>Contrat de travail signé *</label>
            <div class="file-zone" [class.uploaded]="contratTravail" (click)="contratInput.click()">
              <input #contratInput type="file" accept=".pdf" style="display:none" (change)="onContratTravail($event)">
              <span *ngIf="!contratTravail">📄 Joindre le contrat de travail (PDF)</span>
              <span *ngIf="contratTravail" class="file-ok">✅ {{ contratTravail.name }}</span>
            </div>
          </div>
        </div>

        <div class="form-actions">
          <a routerLink="/personnel" class="btn btn-secondary">Annuler</a>
          <button type="submit" class="btn btn-primary" [disabled]="form.invalid || submitting">
            <span *ngIf="submitting" class="spinner"></span>
            {{ submitting ? 'Enregistrement…' : '👥 Enregistrer le membre' }}
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
    .btn-primary{background:#0c1a35;color:#fff}.btn-primary:disabled{opacity:.5;cursor:not-allowed}
    .btn-secondary{background:#fff;color:#334155;border:1px solid #e2e8f0}
    .docs-alert{display:flex;align-items:center;gap:12px;background:#fffbeb;border:1px solid #fde68a;border-radius:10px;padding:12px 16px;margin-bottom:16px;font-size:13px;flex-wrap:wrap}
    .doc-item{padding:4px 10px;border-radius:8px;background:#e0e7ef;color:#475569}
    .doc-item.ok{background:#d1fae5;color:#065f46}
    .form-card{background:#fff;border-radius:12px;padding:24px;margin-bottom:16px;box-shadow:0 1px 3px rgba(0,0,0,.06)}
    .form-card-title{font-size:16px;font-weight:600;color:#0c1a35;margin:0 0 20px;padding-bottom:12px;border-bottom:1px solid #f1f5f9}
    .form-grid-2{display:grid;grid-template-columns:1fr 1fr;gap:16px}
    .form-group{display:flex;flex-direction:column;gap:6px}
    label{font-size:13px;font-weight:500;color:#374151}
    .form-control{padding:9px 12px;border:1px solid #e2e8f0;border-radius:8px;font-size:14px}
    .form-control:focus{outline:none;border-color:#0c1a35}
    .file-zone{border:2px dashed #e2e8f0;border-radius:8px;padding:12px;cursor:pointer;font-size:13px;color:#64748b;text-align:center;transition:all .15s}
    .file-zone:hover,.file-zone.uploaded{border-color:#10b981;background:#f0fdf4}
    .file-ok{color:#065f46;font-weight:500}
    .photo-preview{max-height:120px;border-radius:8px}
    .form-actions{display:flex;justify-content:flex-end;gap:12px}
    .spinner{width:14px;height:14px;border:2px solid rgba(255,255,255,.3);border-top-color:#fff;border-radius:50%;animation:spin .7s linear infinite}
    @keyframes spin{to{transform:rotate(360deg)}}
  `]
})
export class PersonnelFormComponent {
  private fb     = inject(FormBuilder);
  private svc    = inject(PersonnelService);
  private router = inject(Router);

  form = this.fb.group({
    nom:            ['', Validators.required],
    prenom:         ['', Validators.required],
    dateNaissance:  ['', Validators.required],
    adresse:        [''],
    telephone:      ['', Validators.required],
    email:          ['', Validators.email],
    typeDocumentId: ['CarteNationaleIdentite', Validators.required],
    numeroDocument: ['', Validators.required],
    typePersonnel:  ['Collecteur', Validators.required],
    poste:          ['', Validators.required],
    dateEmbauche:   [new Date().toISOString().substring(0,10), Validators.required],
    salaireBase:    [null as number|null]
  });

  photoIdentite: File | null = null;
  docIdentite: File | null = null;
  contratTravail: File | null = null;
  photoPreview: string | null = null;
  submitting = false;

  onPhoto(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.photoIdentite = file;
    const reader = new FileReader();
    reader.onload = ev => this.photoPreview = ev.target?.result as string;
    reader.readAsDataURL(file);
  }
  onDocIdentite(e: Event)   { this.docIdentite   = (e.target as HTMLInputElement).files?.[0] || null; }
  onContratTravail(e: Event){ this.contratTravail = (e.target as HTMLInputElement).files?.[0] || null; }

  submit() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.submitting = true;
    const fd = new FormData();
    Object.entries(this.form.value).forEach(([k, v]) => {
      if (v !== null && v !== undefined && v !== '') fd.append(k, String(v));
    });
    if (this.photoIdentite) fd.append('photoIdentite', this.photoIdentite);
    if (this.docIdentite)   fd.append('docIdentite', this.docIdentite);
    if (this.contratTravail)fd.append('contratTravail', this.contratTravail);
    this.svc.create(fd).subscribe({
      next: () => this.router.navigate(['/personnel']),
      error: () => { this.submitting = false; }
    });
  }
}
