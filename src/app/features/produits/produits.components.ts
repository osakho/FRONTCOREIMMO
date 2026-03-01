// ══════════════════════════════════════════════════════════════
//  PRODUITS LIST
// ══════════════════════════════════════════════════════════════
import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ProduitsService } from '../../../core/services/api.services';
import { ProduitListItemDto, PagedList, TypeProduit, StatutProduit } from '../../../core/models/models';

@Component({
  selector: 'kdi-produits-list',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, DecimalPipe],
  template: `
    <div class="page">
      <div class="page-header">
        <div><h2 class="page-title">Produits locatifs</h2><p class="page-subtitle">Chambres, appartements, boutiques, garages</p></div>
        <a routerLink="/produits/nouveau" class="btn btn-primary">＋ Nouveau produit</a>
      </div>

      <div class="filters-bar">
        <input type="text" class="search-input" placeholder="🔍 Code, description…"
               [(ngModel)]="search" (ngModelChange)="onSearch()">
        <select class="filter-select" [(ngModel)]="filtreType" (ngModelChange)="load()">
          <option value="">Tous les types</option>
          <option value="Chambre">Chambre</option>
          <option value="Appartement">Appartement</option>
          <option value="Boutique">Boutique</option>
          <option value="Garage">Garage</option>
        </select>
        <select class="filter-select" [(ngModel)]="filtreStatut" (ngModelChange)="load()">
          <option value="">Tous les statuts</option>
          <option value="Libre">Libre</option>
          <option value="Loue">Loué</option>
          <option value="EnTravaux">En travaux</option>
          <option value="Reserve">Réservé</option>
        </select>
      </div>

      <!-- Résumé par type -->
      <div class="type-chips">
        <div class="type-chip" *ngFor="let t of typesCount">
          <span class="tc-icon">{{ t.icon }}</span>
          <span class="tc-label">{{ t.label }}</span>
          <span class="tc-val">{{ t.count }}</span>
        </div>
      </div>

      <div class="table-card">
        <table class="data-table" *ngIf="liste().items.length; else empty">
          <thead><tr>
            <th>Code</th><th>Propriété</th><th>Type</th>
            <th class="text-right">Loyer réf. (MRU)</th>
            <th class="text-center">Surface</th>
            <th class="text-center">Statut</th>
            <th></th>
          </tr></thead>
          <tbody>
            <tr *ngFor="let p of liste().items">
              <td><span class="code-badge">{{ p.code }}</span></td>
              <td><div class="cell-sub">{{ p.proprieteLibelle }}</div></td>
              <td>
                <span class="type-tag" [attr.data-type]="p.typeLabel">
                  {{ typeIcon(p.typeLabel) }} {{ p.typeLabel }}
                </span>
              </td>
              <td class="text-right font-bold">{{ p.loyerReference | number:'1.0-0' }}</td>
              <td class="text-center text-muted">{{ p.surface ? p.surface + ' m²' : '—' }}</td>
              <td class="text-center">
                <span class="badge" [ngClass]="statutClass(p.statutLabel)">{{ p.statutLabel }}</span>
              </td>
              <td>
                <div class="row-actions">
                  <a [routerLink]="['/produits', p.id]" class="btn-icon">👁</a>
                  <a *ngIf="p.statutLabel==='Libre'" [routerLink]="['/contrats-location/nouveau']"
                     [queryParams]="{produitId: p.id}" class="btn-icon" title="Créer un bail">📋</a>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
        <ng-template #empty>
          <div class="empty-state">
            <span class="empty-icon">🏠</span>
            <p>Aucun produit trouvé</p>
            <a routerLink="/produits/nouveau" class="btn btn-primary">Créer le premier</a>
          </div>
        </ng-template>
      </div>

      <div class="pagination" *ngIf="liste().totalPages > 1">
        <button [disabled]="page===1" (click)="goPage(page-1)" class="page-btn">‹</button>
        <span class="page-info">{{ page }} / {{ liste().totalPages }}</span>
        <button [disabled]="!liste().hasNext" (click)="goPage(page+1)" class="page-btn">›</button>
      </div>
    </div>`,
  styles: [`
    .page{max-width:1200px;margin:0 auto}.page-header{display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:24px}.page-title{font-size:24px;font-weight:700;color:#0c1a35;margin:0 0 4px}.page-subtitle{font-size:14px;color:#64748b;margin:0}.btn{padding:9px 18px;border-radius:8px;font-size:14px;font-weight:500;cursor:pointer;border:none;text-decoration:none;display:inline-flex;align-items:center;gap:6px}.btn-primary{background:#0c1a35;color:#fff}.filters-bar{display:flex;gap:12px;margin-bottom:16px}.search-input{flex:1;padding:9px 14px;border:1px solid #e2e8f0;border-radius:8px;font-size:14px}.filter-select{padding:9px 14px;border:1px solid #e2e8f0;border-radius:8px;font-size:14px;background:#fff}.type-chips{display:flex;gap:12px;margin-bottom:16px}.type-chip{display:flex;align-items:center;gap:8px;background:#fff;border:1px solid #e2e8f0;border-radius:10px;padding:8px 16px}.tc-icon{font-size:18px}.tc-label{font-size:13px;color:#64748b}.tc-val{font-size:16px;font-weight:700;color:#0c1a35}.table-card{background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.06)}.data-table{width:100%;border-collapse:collapse}.data-table th{padding:12px 14px;background:#f8fafc;font-size:12px;font-weight:600;color:#64748b;text-align:left;border-bottom:1px solid #e2e8f0;text-transform:uppercase}.data-table td{padding:11px 14px;font-size:14px;color:#334155;border-bottom:1px solid #f1f5f9}.data-table tr:hover td{background:#fafbfc}.data-table tr:last-child td{border-bottom:none}.code-badge{font-family:monospace;font-weight:700;background:#e0e7ef;padding:4px 10px;border-radius:6px;color:#0c1a35;font-size:13px}.cell-sub{font-size:13px;color:#64748b}.type-tag{font-size:13px;color:#334155}.text-right{text-align:right}.text-center{text-align:center}.text-muted{color:#94a3b8;font-size:13px}.font-bold{font-weight:600}.badge{padding:3px 10px;border-radius:12px;font-size:12px;font-weight:500}.badge-libre{background:#f0fdf4;color:#166534;border:1px solid #bbf7d0}.badge-loue{background:#eff6ff;color:#1d4ed8}.badge-travaux{background:#fef3c7;color:#92400e}.badge-reserve{background:#f5f3ff;color:#5b21b6}.row-actions{display:flex;gap:6px;justify-content:flex-end}.btn-icon{background:none;border:none;cursor:pointer;font-size:16px;padding:4px;border-radius:6px;text-decoration:none}.btn-icon:hover{background:#f1f5f9}.empty-state{display:flex;flex-direction:column;align-items:center;padding:60px;gap:12px;color:#94a3b8}.empty-icon{font-size:48px}.pagination{display:flex;align-items:center;justify-content:center;gap:12px;margin-top:16px}.page-btn{padding:6px 14px;border:1px solid #e2e8f0;border-radius:6px;background:#fff;cursor:pointer}.page-btn:disabled{opacity:.4}.page-info{font-size:14px;color:#64748b}
  `]
})
export class ProduitsListComponent implements OnInit {
  private svc = inject(ProduitsService);
  private route = inject(ActivatedRoute);

  liste = signal<PagedList<ProduitListItemDto>>({ items:[], totalCount:0, page:1, pageSize:50, totalPages:0, hasNext:false, hasPrevious:false });
  page=1; search=''; filtreType=''; filtreStatut=''; timer:any;

  get typesCount() {
    const items = this.liste().items;
    return [
      { icon:'🛏', label:'Chambres',     count: items.filter(i=>i.typeLabel==='Chambre').length },
      { icon:'🏠', label:'Appartements', count: items.filter(i=>i.typeLabel==='Appartement').length },
      { icon:'🏪', label:'Boutiques',    count: items.filter(i=>i.typeLabel==='Boutique').length },
      { icon:'🚗', label:'Garages',      count: items.filter(i=>i.typeLabel==='Garage').length },
    ].filter(t=>t.count>0);
  }

  ngOnInit() {
    this.route.queryParams.subscribe(q => {
      if (q['proprieteId']) this.load(q['proprieteId']);
      else this.load();
    });
  }

  load(proprieteId?: string) {
    this.svc.getAll({
      page: this.page, proprieteId: proprieteId||undefined,
      type: (this.filtreType as TypeProduit)||undefined,
      statut: (this.filtreStatut as StatutProduit)||undefined,
      search: this.search||undefined
    }).subscribe(r => this.liste.set(r));
  }

  onSearch() { clearTimeout(this.timer); this.timer=setTimeout(()=>{this.page=1;this.load();},400); }
  goPage(p:number) { this.page=p; this.load(); }

  typeIcon(t:string) { return {Chambre:'🛏',Appartement:'🏠',Boutique:'🏪',Garage:'🚗'}[t]||'🏠'; }
  statutClass(s:string) { return { 'badge-libre':s==='Libre','badge-loue':s==='Loue','badge-travaux':s==='EnTravaux','badge-reserve':s==='Reserve' }; }
}

// ══════════════════════════════════════════════════════════════
//  PRODUIT FORM
// ══════════════════════════════════════════════════════════════
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ProprietesService } from '../../../core/services/api.services';

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

// ══════════════════════════════════════════════════════════════
//  PRODUIT DETAIL
// ══════════════════════════════════════════════════════════════
@Component({
  selector: 'kdi-produit-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, DecimalPipe],
  template: `
    <div class="page" *ngIf="p">
      <div class="page-header">
        <div class="ph-left">
          <div class="code-big">{{ p.code }}</div>
          <div>
            <h2 class="page-title">{{ p.description }}</h2>
            <p class="page-subtitle">{{ p.proprieteLibelle }}</p>
          </div>
        </div>
        <div class="ha">
          <a *ngIf="p.statut==='Libre'" [routerLink]="['/contrats-location/nouveau']" [queryParams]="{produitId:p.id}" class="btn btn-primary">📋 Créer un bail</a>
          <a routerLink="/produits" class="btn btn-ghost">← Retour</a>
        </div>
      </div>

      <div class="status-banner" [class.loue]="p.statut==='Loue'" [class.libre]="p.statut==='Libre'" [class.travaux]="p.statut==='EnTravaux'">
        <span class="sb-icon">{{ statutIcon(p.statut) }}</span>
        <span class="sb-text">{{ p.statutLabel }}</span>
        <span class="sb-loyer">Loyer de référence : {{ p.loyerReference|number:'1.0-0' }} MRU/mois</span>
      </div>

      <div class="detail-grid">
        <div class="dc">
          <h3 class="dc-title">Caractéristiques</h3>
          <dl class="il">
            <dt>Type</dt><dd>{{ p.typeLabel }}</dd>
            <dt>Étage</dt><dd>{{ p.etage === 0 ? 'RDC' : 'Étage ' + p.etage }}</dd>
            <dt>Surface</dt><dd>{{ p.surface ? p.surface + ' m²' : 'Non renseigné' }}</dd>
            <dt>Compteur élec.</dt><dd>{{ p.hasCompteurElec ? 'Oui ✓' : 'Non' }}</dd>
            <dt>Compteur eau</dt><dd>{{ p.hasCompteurEau ? 'Oui ✓' : 'Non' }}</dd>
          </dl>
          <p class="notes" *ngIf="p.notes">{{ p.notes }}</p>
        </div>

        <!-- Loyer modifiable -->
        <div class="dc">
          <h3 class="dc-title">Loyer de référence</h3>
          <div class="loyer-edit">
            <div class="le-current">{{ p.loyerReference|number:'1.0-0' }} MRU</div>
            <div class="le-form" *ngIf="editLoyer">
              <input type="number" [(ngModel)]="newLoyer" class="form-control-sm">
              <button class="btn btn-sm btn-primary" (click)="saveLoyer()">Enregistrer</button>
              <button class="btn btn-sm" (click)="editLoyer=false">Annuler</button>
            </div>
            <button *ngIf="!editLoyer" class="btn btn-sm" (click)="startEditLoyer()">✏️ Modifier</button>
          </div>
        </div>
      </div>

      <!-- Bail actuel -->
      <div *ngIf="p.contratActif" class="contrat-actuel">
        <h3 class="dc-title">🔑 Bail actuel</h3>
        <div class="ca-info">
          <div><strong>{{ p.contratActif.locataireNom }}</strong></div>
          <div class="ca-num">{{ p.contratActif.numero }}</div>
          <span class="badge bg-blue">{{ p.contratActif.statut }}</span>
          <a [routerLink]="['/contrats-location', p.contratActif.id]" class="btn btn-sm">Voir le bail →</a>
        </div>
      </div>
    </div>`,
  styles: [`
    .page{max-width:900px;margin:0 auto}.page-header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:24px}.ph-left{display:flex;align-items:center;gap:16px}.code-big{font-family:monospace;font-size:28px;font-weight:800;background:#0c1a35;color:#c8a96e;padding:8px 16px;border-radius:10px}.page-title{font-size:24px;font-weight:700;color:#0c1a35;margin:0 0 4px}.page-subtitle{font-size:14px;color:#64748b;margin:0}.ha{display:flex;gap:8px}.btn{padding:9px 18px;border-radius:8px;font-size:14px;font-weight:500;cursor:pointer;border:none;text-decoration:none;display:inline-flex;align-items:center;gap:6px}.btn-primary{background:#0c1a35;color:#fff}.btn-ghost{background:transparent;color:#64748b}.btn-sm{padding:6px 12px;font-size:13px;background:#f1f5f9;border:1px solid #e2e8f0;border-radius:6px;cursor:pointer;display:inline-flex;align-items:center;gap:4px;text-decoration:none}.btn-sm.btn-primary{background:#0c1a35;color:#fff;border-color:#0c1a35}.status-banner{display:flex;align-items:center;gap:16px;padding:16px 20px;border-radius:12px;margin-bottom:24px;font-size:15px}.status-banner.loue{background:#eff6ff;color:#1d4ed8}.status-banner.libre{background:#f0fdf4;color:#166534}.status-banner.travaux{background:#fef3c7;color:#92400e}.sb-icon{font-size:24px}.sb-text{font-weight:600}.sb-loyer{margin-left:auto;font-size:18px;font-weight:700}.detail-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:24px}.dc{background:#fff;border-radius:12px;padding:24px;box-shadow:0 1px 3px rgba(0,0,0,.06)}.dc-title{font-size:15px;font-weight:600;color:#0c1a35;margin:0 0 16px;padding-bottom:10px;border-bottom:1px solid #f1f5f9}.il{display:grid;grid-template-columns:auto 1fr;gap:8px 16px;font-size:14px;margin:0}dt{color:#64748b;font-weight:500}dd{color:#334155;margin:0}.notes{font-size:14px;color:#475569;margin-top:12px}.loyer-edit{display:flex;flex-direction:column;gap:12px}.le-current{font-size:32px;font-weight:800;color:#0c1a35}.le-form{display:flex;gap:8px;align-items:center}.form-control-sm{padding:8px 12px;border:1px solid #e2e8f0;border-radius:8px;font-size:14px;width:140px}.contrat-actuel{background:#fff;border-radius:12px;padding:24px;box-shadow:0 1px 3px rgba(0,0,0,.06)}.ca-info{display:flex;align-items:center;gap:16px;font-size:14px}.ca-num{font-family:monospace;color:#64748b}.badge{padding:3px 10px;border-radius:12px;font-size:12px;font-weight:500}.bg-blue{background:#dbeafe;color:#1d4ed8}
  `]
})
export class ProduitDetailComponent implements OnInit {
  private svc = inject(ProduitsService);
  private route = inject(ActivatedRoute);
  p: any = null; editLoyer=false; newLoyer=0;

  ngOnInit() { this.svc.getById(this.route.snapshot.params['id']).subscribe(d=>{ this.p=d; this.newLoyer=d.loyerReference; }); }

  statutIcon(s:string) { return {Libre:'🔓',Loue:'🔑',EnTravaux:'🔧',Reserve:'📌',HorsService:'⛔'}[s]||'?'; }
  startEditLoyer() { this.editLoyer=true; }
  saveLoyer() {
    this.svc.updateLoyer(this.p.id, this.newLoyer).subscribe(()=>{ this.p.loyerReference=this.newLoyer; this.editLoyer=false; });
  }
}
