import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { ProprietairesService } from '../../../core/services/api.services';
import { ProprietaireListItemDto, PagedList } from '../../../core/models/models';

@Component({
  selector: 'kdi-proprietaires-list',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, ReactiveFormsModule],
  template: `
    <div class="page-enter">

      <!-- ── PAGE HEADER ── -->
      <div class="page-header">
        <div>
          <div class="page-title"><span class="mi">person</span> Propriétaires</div>
          <div class="page-subtitle">{{ liste().totalCount }} propriétaires dans le portefeuille</div>
        </div>
        <div class="header-actions">
          <button class="btn btn-gold" (click)="ouvrirModal()">
            <span class="mi">add</span> Nouveau propriétaire
          </button>
        </div>
      </div>

      <!-- ── FILTRES ── -->
      <div class="filter-bar">
        <button class="filter-chip" [class.active]="filtreActif===''"      (click)="setFiltre('')">Tous</button>
        <button class="filter-chip" [class.active]="filtreActif==='true'"  (click)="setFiltre('true')">Actifs</button>
        <button class="filter-chip" [class.active]="filtreActif==='false'" (click)="setFiltre('false')">Inactifs</button>
        <div class="filter-spacer"></div>
        <div class="search-inline">
          <span class="mi">search</span>
          <input placeholder="Nom, téléphone…" [(ngModel)]="searchTerm" (ngModelChange)="onSearch()">
        </div>
      </div>

      <!-- ── TABLE ── -->
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
                <div class="cell-avatar">
                  <div class="avatar" [style.background]="avatarColor(p.nomComplet)">{{ initiales(p.nomComplet) }}</div>
                  <div class="cell-name">{{ p.nomComplet }}</div>
                </div>
              </td>
              <td>{{ p.telephone }}</td>
              <td class="text-muted">{{ p.email ?? '—' }}</td>
              <td class="text-center"><span class="badge badge-navy">{{ p.nombreProprietes }}</span></td>
              <td class="text-center">
                <span class="badge" [class.badge-green]="p.estActif" [class.badge-gray]="!p.estActif">
                  {{ p.estActif ? 'Actif' : 'Inactif' }}
                </span>
              </td>
              <td class="text-center text-muted">{{ p.creeLe | date:'dd/MM/yyyy' }}</td>
              <td>
                <div class="row-actions">
                  <a [routerLink]="['/proprietaires', p.id]" class="action-btn view" title="Voir"><span class="mi">visibility</span></a>
                  <a [routerLink]="['/proprietaires', p.id, 'edit']" class="action-btn edit" title="Modifier"><span class="mi">edit</span></a>
                </div>
              </td>
            </tr>
          </tbody>
        </table>

        <ng-template #empty>
          <div class="empty-state">
            <span class="mi">person</span>
            <div class="empty-title">Aucun propriétaire trouvé</div>
            <div class="empty-sub">Créez le premier propriétaire</div>
            <button class="btn btn-gold" style="margin-top:8px" (click)="ouvrirModal()">
              <span class="mi">add</span> Nouveau propriétaire
            </button>
          </div>
        </ng-template>

        <div class="pagination" *ngIf="liste().totalPages > 1">
          <div class="pagination-info">{{ (page-1)*20+1 }}–{{ min(page*20, liste().totalCount) }} sur {{ liste().totalCount }}</div>
          <div class="pagination-pages">
            <button class="page-btn" [disabled]="page===1" (click)="goPage(page-1)"><span class="mi">chevron_left</span></button>
            <button *ngFor="let p of pageRange()" class="page-btn" [class.active]="p===page" (click)="goPage(p)">{{ p }}</button>
            <button class="page-btn" [disabled]="!liste().hasNext" (click)="goPage(page+1)"><span class="mi">chevron_right</span></button>
          </div>
        </div>
      </div>
    </div>

    <!-- ══════════════════════════════════════════════════════════
         MODAL NOUVEAU PROPRIÉTAIRE — 3 ÉTAPES
    ══════════════════════════════════════════════════════════════ -->
    <div class="modal-overlay" [class.open]="modalOuvert()">
      <div class="nv-modal">

        <!-- Header -->
        <div class="nv-header">
          <div class="modal-title" style="font-size:.95rem">
            <span class="mi" style="color:var(--gold)">add_circle</span>
            Nouveau propriétaire
          </div>
          <button class="modal-close" (click)="fermerModal()"><span class="mi">close</span></button>
        </div>

        <!-- Stepper -->
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

        <!-- Body -->
        <div class="nv-body" [formGroup]="form">

          <!-- ── ÉTAPE 1 : Identité & Coordonnées ── -->
          <div *ngIf="etape()===1">
            <div class="step-title">Identité &amp; coordonnées</div>
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Prénom *</label>
                <input formControlName="prenom" class="form-control" placeholder="Amadou">
              </div>
              <div class="form-group">
                <label class="form-label">Nom *</label>
                <input formControlName="nom" class="form-control" placeholder="Ba">
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Date de naissance *</label>
                <input formControlName="dateNaissance" type="date" class="form-control">
              </div>
              <div class="form-group">
                <label class="form-label">Lieu de naissance *</label>
                <input formControlName="lieuNaissance" class="form-control" placeholder="Nouakchott">
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Téléphone principal *</label>
                <input formControlName="telephone" class="form-control" placeholder="+222 36 XX XX XX">
              </div>
              <div class="form-group">
                <label class="form-label">Téléphone secondaire</label>
                <input formControlName="telephoneSecondaire" class="form-control" placeholder="+222 22 XX XX XX">
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Email</label>
                <input formControlName="email" type="email" class="form-control" placeholder="exemple@mail.com">
              </div>
              <div class="form-group">
                <label class="form-label">Quartier / Zone</label>
                <input formControlName="quartier" class="form-control" placeholder="Tevragh Zeina">
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">Adresse complète *</label>
              <textarea formControlName="adresse" class="form-control" rows="2"
                        placeholder="Numéro, rue, quartier…" style="resize:vertical"></textarea>
            </div>

            <!-- Photo identité -->
            <div class="form-group" style="margin-top:4px">
              <label class="form-label">Photo d'identité</label>
              <div class="file-zone" [class.has-files]="!!photoPreview" (click)="photoInput.click()"
                   (drop)="onDrop($event)" (dragover)="$event.preventDefault()">
                <input #photoInput type="file" accept="image/*" style="display:none" (change)="onPhotoChange($event)">
                <ng-container *ngIf="!photoPreview">
                  <span class="mi" style="font-size:24px;color:var(--t4)">add_a_photo</span>
                  <span style="font-size:.78rem;color:var(--t3)">Cliquer ou glisser une photo</span>
                  <span style="font-size:.7rem;color:var(--t4)">JPG, PNG — max 5 Mo</span>
                </ng-container>
                <img *ngIf="photoPreview" [src]="photoPreview" style="max-height:100px;border-radius:6px" alt="Photo">
              </div>
            </div>
          </div>

          <!-- ── ÉTAPE 2 : Document & Coordonnées bancaires ── -->
          <div *ngIf="etape()===2">
            <div class="step-title">Document officiel</div>
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Type de document *</label>
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
                <label class="form-label">Numéro du document *</label>
                <input formControlName="numeroDocument" class="form-control" placeholder="MR-001-2024">
              </div>
            </div>

            <!-- Comptes bancaires -->
            <div style="margin-top:16px">
              <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
                <div style="font-size:.8rem;font-weight:600;color:var(--navy)">Comptes bancaires</div>
                <button type="button" class="btn btn-secondary btn-sm" (click)="addCompte()">
                  <span class="mi">add</span> Ajouter
                </button>
              </div>
              <div formArrayName="comptes">
                <div *ngFor="let c of comptes.controls; let i=index" [formGroupName]="i"
                     style="background:var(--surf);border-radius:8px;padding:12px;margin-bottom:8px;border:1px solid var(--bord)">
                  <div class="form-row" style="margin-bottom:8px">
                    <div class="form-group">
                      <label class="form-label">Banque</label>
                      <input formControlName="banque" class="form-control" placeholder="BMCI, SGM…">
                    </div>
                    <div class="form-group">
                      <label class="form-label">Numéro de compte</label>
                      <input formControlName="numero" class="form-control">
                    </div>
                  </div>
                  <div style="display:flex;align-items:center;justify-content:space-between">
                    <label style="display:flex;align-items:center;gap:6px;font-size:.78rem;cursor:pointer">
                      <input type="checkbox" formControlName="estPrincipal"> Principal
                    </label>
                    <button type="button" class="action-btn del" style="width:28px;height:28px" (click)="removeCompte(i)">
                      <span class="mi" style="font-size:14px">delete</span>
                    </button>
                  </div>
                </div>
                <div *ngIf="comptes.length===0" style="text-align:center;padding:12px;color:var(--t3);font-size:.78rem;background:var(--surf);border-radius:8px;border:1px dashed var(--bord2)">
                  Aucun compte bancaire ajouté
                </div>
              </div>
            </div>

            <!-- Plateformes mobiles -->
            <div style="margin-top:16px">
              <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
                <div style="font-size:.8rem;font-weight:600;color:var(--navy)">Plateformes mobiles</div>
                <button type="button" class="btn btn-secondary btn-sm" (click)="addPlateforme()">
                  <span class="mi">add</span> Ajouter
                </button>
              </div>
              <div formArrayName="plateformes">
                <div *ngFor="let p of plateformes.controls; let i=index" [formGroupName]="i"
                     style="background:var(--surf);border-radius:8px;padding:12px;margin-bottom:8px;border:1px solid var(--bord)">
                  <div class="form-row" style="margin-bottom:8px">
                    <div class="form-group">
                      <label class="form-label">Plateforme</label>
                      <select formControlName="nom" class="form-control">
                        <option value="Bankily">Bankily</option>
                        <option value="Masrvi">Masrvi</option>
                        <option value="Bimbank">Bimbank</option>
                        <option value="Click">Click</option>
                        <option value="Autre">Autre</option>
                      </select>
                    </div>
                    <div class="form-group">
                      <label class="form-label">Numéro</label>
                      <input formControlName="numero" class="form-control" placeholder="+222…">
                    </div>
                  </div>
                  <div style="display:flex;align-items:center;justify-content:space-between">
                    <label style="display:flex;align-items:center;gap:6px;font-size:.78rem;cursor:pointer">
                      <input type="checkbox" formControlName="estPrincipal"> Principal
                    </label>
                    <button type="button" class="action-btn del" style="width:28px;height:28px" (click)="removePlateforme(i)">
                      <span class="mi" style="font-size:14px">delete</span>
                    </button>
                  </div>
                </div>
                <div *ngIf="plateformes.length===0" style="text-align:center;padding:12px;color:var(--t3);font-size:.78rem;background:var(--surf);border-radius:8px;border:1px dashed var(--bord2)">
                  Aucune plateforme mobile ajoutée
                </div>
              </div>
            </div>
          </div>

          <!-- ── ÉTAPE 3 : Récap & Notes ── -->
          <div *ngIf="etape()===3">
            <div class="step-title">Récapitulatif &amp; notes</div>

            <!-- Récap card -->
            <div style="background:var(--surf);border-radius:var(--r);padding:16px;margin-bottom:16px;border:1px solid var(--bord)">
              <div style="display:flex;align-items:center;gap:12px;margin-bottom:14px">
                <div class="avatar" style="width:44px;height:44px;font-size:.85rem"
                     [style.background]="avatarColor((form.get('prenom')?.value||'') + ' ' + (form.get('nom')?.value||''))">
                  {{ initiales((form.get('prenom')?.value||'') + ' ' + (form.get('nom')?.value||'')) }}
                </div>
                <div>
                  <div style="font-weight:700;font-size:.92rem;color:var(--t1)">
                    {{ form.get('prenom')?.value }} {{ form.get('nom')?.value }}
                  </div>
                  <div class="cell-sub">{{ form.get('telephone')?.value }}</div>
                </div>
              </div>
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:.78rem">
                <div>
                  <span style="color:var(--t3)">Adresse : </span>
                  <span style="color:var(--t1)">{{ form.get('adresse')?.value || '—' }}</span>
                </div>
                <div>
                  <span style="color:var(--t3)">Document : </span>
                  <span style="color:var(--t1)">{{ form.get('numeroDocument')?.value || '—' }}</span>
                </div>
                <div>
                  <span style="color:var(--t3)">Email : </span>
                  <span style="color:var(--t1)">{{ form.get('email')?.value || '—' }}</span>
                </div>
                <div>
                  <span style="color:var(--t3)">Comptes : </span>
                  <span style="color:var(--t1)">{{ comptes.length }} · Plateformes : {{ plateformes.length }}</span>
                </div>
              </div>
            </div>

            <!-- Notes -->
            <div class="form-group">
              <label class="form-label">Notes (optionnel)</label>
              <textarea formControlName="notes" class="form-control" rows="3"
                        placeholder="Observations, informations complémentaires…"
                        style="resize:vertical"></textarea>
            </div>
          </div>

        </div>

        <!-- Footer -->
        <div class="nv-footer">
          <button class="btn btn-secondary" (click)="etape()>1 ? etape.set(etape()-1) : fermerModal()">
            <span class="mi">{{ etape()>1 ? 'arrow_back' : 'close' }}</span>
            {{ etape()>1 ? 'Précédent' : 'Annuler' }}
          </button>
          <button *ngIf="etape()<3" class="btn btn-primary" [disabled]="!etapeValide()" (click)="etape.set(etape()+1)">
            Suivant <span class="mi">arrow_forward</span>
          </button>
          <button *ngIf="etape()===3" class="btn btn-gold" [disabled]="form.invalid || submitting()" (click)="soumettre()">
            <span class="mi">{{ submitting() ? 'hourglass_empty' : 'check_circle' }}</span>
            {{ submitting() ? 'Création…' : 'Créer le propriétaire' }}
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    /* ── Modal ── */
    .nv-modal {
      background: var(--wh); border-radius: var(--r2);
      width: 560px; max-width: 94vw; max-height: 90vh; overflow-y: auto;
      box-shadow: var(--s3); display: flex; flex-direction: column;
    }
    .nv-header {
      display:flex; align-items:center; justify-content:space-between;
      padding:18px 22px 14px; border-bottom:1px solid var(--bord);
      position:sticky; top:0; background:var(--wh); z-index:2;
    }
    .nv-body   { padding:20px 22px; flex:1; }
    .nv-footer {
      display:flex; align-items:center; justify-content:space-between;
      padding:14px 22px; border-top:1px solid var(--bord);
      background:var(--surf);
      position:sticky; bottom:0; z-index:2;
    }

    /* Stepper */
    .stepper {
      display:flex; align-items:center; justify-content:center;
      padding:18px 22px 0; gap:0;
    }
    .stepper-step { display:flex; flex-direction:column; align-items:center; gap:4px; }
    .step-dot {
      width:34px; height:34px; border-radius:50%;
      display:flex; align-items:center; justify-content:center;
      background:var(--surf2); color:var(--t3);
      font-family:'Syne',sans-serif; font-weight:700; font-size:.82rem; transition:var(--tr);
    }
    .step-active { background:var(--navy); color:#fff; box-shadow:0 0 0 4px rgba(14,28,56,.12); }
    .step-done   { background:var(--ok); color:#fff; }
    .step-label  { font-size:.63rem; color:var(--t3); text-align:center; width:80px; }
    .step-line   { flex:1; height:2px; background:var(--bord2); margin:0 6px; margin-bottom:18px; min-width:36px; }
    .step-line-done { background:var(--ok); }

    /* Step title */
    .step-title {
      font-size:.85rem; font-weight:600; color:var(--navy);
      margin-bottom:16px; padding-bottom:10px; border-bottom:1px solid var(--bord);
    }

    /* File zone */
    .file-zone {
      display:flex; align-items:center; justify-content:center; flex-direction:column; gap:4px;
      border:2px dashed var(--bord2); border-radius:8px; padding:16px; cursor:pointer;
      transition:var(--tr); min-height:80px;
    }
    .file-zone:hover, .file-zone.has-files { border-color:var(--gold); background:#fffdf5; }
  `]
})
export class ProprietairesListComponent implements OnInit {
  private svc = inject(ProprietairesService);
  private fb  = inject(FormBuilder);

  // ── Liste ──
  liste = signal<PagedList<ProprietaireListItemDto>>({
    items:[], totalCount:0, page:1, pageSize:20, totalPages:0, hasNext:false, hasPrevious:false
  });
  page = 1; searchTerm = ''; filtreActif = ''; timer: any;

  // ── Modal ──
  modalOuvert = signal(false);
  etape       = signal(1);
  submitting  = signal(false);
  stepLabels  = ['Identité', 'Documents', 'Récap'];
  photoFile?: File;
  photoPreview?: string;

  form: FormGroup = this.fb.group({
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
    plateformes:         this.fb.array([]),
  });

  get comptes()     { return this.form.get('comptes')     as FormArray; }
  get plateformes() { return this.form.get('plateformes') as FormArray; }

  ngOnInit() { this.load(); }

  load() {
    const actif = this.filtreActif === '' ? undefined : this.filtreActif === 'true';
    this.svc.getAll(this.page, 20, this.searchTerm || undefined, actif).subscribe(r => this.liste.set(r));
  }
  setFiltre(v: string) { this.filtreActif = v; this.page = 1; this.load(); }
  onSearch() { clearTimeout(this.timer); this.timer = setTimeout(() => { this.page = 1; this.load(); }, 380); }
  goPage(p: number) { this.page = p; this.load(); }

  // ── Modal ──
  ouvrirModal() {
    this.etape.set(1);
    this.photoFile = undefined;
    this.photoPreview = undefined;
    // Reset comptes & plateformes
    while (this.comptes.length) this.comptes.removeAt(0);
    while (this.plateformes.length) this.plateformes.removeAt(0);
    this.form.reset({
      nom:'', prenom:'', dateNaissance:'', lieuNaissance:'',
      adresse:'', quartier:'', telephone:'', telephoneSecondaire:'',
      email:'', typeDocumentId:'CarteNationaleIdentite', numeroDocument:'', notes:''
    });
    this.modalOuvert.set(true);
  }

  fermerModal() { this.modalOuvert.set(false); }

  etapeValide(): boolean {
    if (this.etape() === 1) {
      const f = this.form;
      return !!(f.get('prenom')?.value && f.get('nom')?.value &&
                f.get('dateNaissance')?.value && f.get('lieuNaissance')?.value &&
                f.get('telephone')?.valid && f.get('adresse')?.value);
    }
    if (this.etape() === 2) {
      return !!(this.form.get('typeDocumentId')?.value && this.form.get('numeroDocument')?.value);
    }
    return true;
  }

  // Comptes
  addCompte() {
    this.comptes.push(this.fb.group({
      banque:['', Validators.required], numero:['', Validators.required],
      agence:[''], estPrincipal:[false]
    }));
  }
  removeCompte(i: number) { this.comptes.removeAt(i); }

  // Plateformes
  addPlateforme() {
    this.plateformes.push(this.fb.group({
      nom:['Bankily', Validators.required], numero:['', Validators.required], estPrincipal:[false]
    }));
  }
  removePlateforme(i: number) { this.plateformes.removeAt(i); }

  // Photo
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
    if (file?.type.startsWith('image/')) {
      this.photoFile = file;
      const reader = new FileReader();
      reader.onload = ev => this.photoPreview = ev.target?.result as string;
      reader.readAsDataURL(file);
    }
  }

  soumettre() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.submitting.set(true);
    const fd = this.svc.buildFormData(this.form.value, this.photoFile);
    this.svc.create(fd).subscribe({
      next: () => { this.submitting.set(false); this.fermerModal(); this.load(); },
      error: () => this.submitting.set(false)
    });
  }

  // ── Helpers ──
  min(a: number, b: number) { return Math.min(a, b); }
  initiales(nom: string) { return nom.split(' ').filter(Boolean).slice(0,2).map(w=>w[0]).join('').toUpperCase(); }
  avatarColor(nom: string) {
    const colors = ['#162845','#0d9f5a','#2057c8','#7c3aed','#d07a0c','#c9a96e'];
    let h = 0; for (const c of nom) h = (h*31+c.charCodeAt(0)) % colors.length;
    return colors[Math.abs(h)];
  }
  pageRange() {
    const total = this.liste().totalPages, p = this.page, pages: number[] = [];
    for (let i = Math.max(1, p-2); i <= Math.min(total, p+2); i++) pages.push(i);
    return pages;
  }
}