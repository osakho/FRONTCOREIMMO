// ══════════════════════════════════════════════════════════════
//  PROPRIÉTÉS LIST
// ══════════════════════════════════════════════════════════════
import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ProprietesService, ProprietairesService } from '../../../core/services/api.services';
import { ProprieteListItemDto, PagedList } from '../../../core/models/models';

@Component({
  selector: 'kdi-proprietes-list',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  template: `
    <div class="page">
      <div class="page-header">
        <div><h2 class="page-title">Propriétés</h2><p class="page-subtitle">Immeubles et bâtiments gérés</p></div>
        <a routerLink="/proprietes/nouvelle" class="btn btn-primary">＋ Nouvelle propriété</a>
      </div>
      <div class="filters-bar">
        <input type="text" class="search-input" placeholder="🔍 Rechercher (libellé, quartier…)"
               [(ngModel)]="searchTerm" (ngModelChange)="onSearch()">
      </div>
      <div class="cards-grid" *ngIf="liste().items.length; else empty">
        <div *ngFor="let p of liste().items" class="prop-card">
          <div class="pc-header">
            <div class="pc-icon">🏘️</div>
            <div class="pc-info">
              <div class="pc-title">{{ p.libelle }}</div>
              <div class="pc-sub">{{ p.proprietaireNom }}</div>
            </div>
            <span class="badge" [class.badge-green]="p.aContratGestion" [class.badge-gray]="!p.aContratGestion">
              {{ p.aContratGestion ? '✓ Géré' : 'Sans contrat' }}
            </span>
          </div>
          <div class="pc-body">
            <div class="pc-address">📍 {{ p.adresse }}<span *ngIf="p.quartier">, {{ p.quartier }}</span></div>
            <div class="pc-stats">
              <div class="pc-stat"><span class="ps-val">{{ p.nombreProduits }}</span><span class="ps-lbl">Total</span></div>
              <div class="pc-stat"><span class="ps-val green">{{ p.nombreProduits - p.nombreLibres }}</span><span class="ps-lbl">Loués</span></div>
              <div class="pc-stat"><span class="ps-val" [class.orange]="p.nombreLibres > 0">{{ p.nombreLibres }}</span><span class="ps-lbl">Libres</span></div>
            </div>
          </div>
          <div class="pc-footer">
            <span class="pc-date">{{ p.creeLe | date:'dd/MM/yyyy' }}</span>
            <div class="row-actions">
              <a [routerLink]="['/proprietes', p.id]" class="btn-icon">👁</a>
              <a [routerLink]="['/produits']" [queryParams]="{proprieteId: p.id}" class="btn-icon" title="Produits">🏠</a>
            </div>
          </div>
        </div>
      </div>
      <ng-template #empty>
        <div class="empty-state"><span class="empty-icon">🏘️</span><p>Aucune propriété trouvée</p>
          <a routerLink="/proprietes/nouvelle" class="btn btn-primary">Créer la première</a></div>
      </ng-template>
      <div class="pagination" *ngIf="liste().totalPages > 1">
        <button [disabled]="page===1" (click)="goPage(page-1)" class="page-btn">‹</button>
        <span class="page-info">{{ page }} / {{ liste().totalPages }}</span>
        <button [disabled]="!liste().hasNext" (click)="goPage(page+1)" class="page-btn">›</button>
      </div>
    </div>`,
  styles: [`
    .page{max-width:1200px;margin:0 auto}.page-header{display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:24px}.page-title{font-size:24px;font-weight:700;color:#0c1a35;margin:0 0 4px}.page-subtitle{font-size:14px;color:#64748b;margin:0}.btn{padding:9px 18px;border-radius:8px;font-size:14px;font-weight:500;cursor:pointer;border:none;text-decoration:none;display:inline-flex;align-items:center;gap:6px}.btn-primary{background:#0c1a35;color:#fff}.filters-bar{display:flex;gap:12px;margin-bottom:24px}.search-input{flex:1;padding:9px 14px;border:1px solid #e2e8f0;border-radius:8px;font-size:14px}.cards-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:16px}.prop-card{background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.06);border:1px solid #f1f5f9;transition:box-shadow .2s}.prop-card:hover{box-shadow:0 4px 12px rgba(0,0,0,.1)}.pc-header{display:flex;align-items:center;gap:12px;padding:16px;border-bottom:1px solid #f1f5f9}.pc-icon{font-size:28px;width:44px;height:44px;background:#f0f4ff;border-radius:10px;display:flex;align-items:center;justify-content:center;flex-shrink:0}.pc-info{flex:1;min-width:0}.pc-title{font-size:15px;font-weight:600;color:#0c1a35;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.pc-sub{font-size:13px;color:#64748b}.badge{padding:3px 8px;border-radius:10px;font-size:11px;font-weight:500;white-space:nowrap}.badge-green{background:#d1fae5;color:#065f46}.badge-gray{background:#f1f5f9;color:#64748b}.pc-body{padding:14px 16px}.pc-address{font-size:13px;color:#64748b;margin-bottom:14px}.pc-stats{display:flex;gap:20px}.pc-stat{display:flex;flex-direction:column;align-items:center;gap:2px}.ps-val{font-size:22px;font-weight:700;color:#0c1a35}.ps-val.green{color:#059669}.ps-val.orange{color:#d97706}.ps-lbl{font-size:11px;color:#94a3b8}.pc-footer{display:flex;justify-content:space-between;align-items:center;padding:10px 16px;background:#f8fafc}.pc-date{font-size:12px;color:#94a3b8}.row-actions{display:flex;gap:6px}.btn-icon{background:none;border:none;cursor:pointer;font-size:16px;padding:4px;border-radius:6px;text-decoration:none}.btn-icon:hover{background:#e2e8f0}.empty-state{display:flex;flex-direction:column;align-items:center;padding:60px;gap:12px;color:#94a3b8}.empty-icon{font-size:48px}.pagination{display:flex;align-items:center;justify-content:center;gap:12px;margin-top:16px}.page-btn{padding:6px 14px;border:1px solid #e2e8f0;border-radius:6px;background:#fff;cursor:pointer}.page-btn:disabled{opacity:.4}.page-info{font-size:14px;color:#64748b}
  `]
})
export class ProprietesListComponent implements OnInit {
  private svc = inject(ProprietesService);
  private route = inject(ActivatedRoute);
  liste = signal<PagedList<ProprieteListItemDto>>({ items:[], totalCount:0, page:1, pageSize:20, totalPages:0, hasNext:false, hasPrevious:false });
  page = 1; searchTerm = ''; timer: any;
  ngOnInit() { this.load(); }
  load() { this.svc.getAll(this.page, 20, this.searchTerm||undefined).subscribe(r => this.liste.set(r)); }
  onSearch() { clearTimeout(this.timer); this.timer = setTimeout(()=>{ this.page=1; this.load(); },400); }
  goPage(p:number) { this.page=p; this.load(); }
}

// ══════════════════════════════════════════════════════════════
//  PROPRIÉTÉ FORM
// ══════════════════════════════════════════════════════════════
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';

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
            <div class="form-group fg-full"><label>Libellé *</label>
              <input formControlName="libelle" class="form-control" placeholder="Résidence El Hadj…">
              <span class="err" *ngIf="f('libelle')?.invalid && f('libelle')?.touched">Obligatoire</span></div>
            <div class="form-group fg-full"><label>Adresse *</label>
              <input formControlName="adresse" class="form-control" placeholder="Numéro, rue, ilot…"></div>
            <div class="form-group"><label>Quartier</label>
              <input formControlName="quartier" class="form-control" placeholder="Tevragh Zeina…"></div>
            <div class="form-group"><label>Ville *</label>
              <select formControlName="ville" class="form-control">
                <option value="Nouakchott">Nouakchott</option>
                <option value="Nouadhibou">Nouadhibou</option>
                <option value="Rosso">Rosso</option>
                <option value="Kaédi">Kaédi</option>
                <option value="Autre">Autre</option>
              </select></div>
            <div class="form-group"><label>Code zone</label>
              <input formControlName="zoneCode" class="form-control" placeholder="TZ, KS…"></div>
            <div class="form-group"><label>Latitude GPS</label>
              <input formControlName="latitude" type="number" step="0.000001" class="form-control" placeholder="18.086"></div>
            <div class="form-group"><label>Longitude GPS</label>
              <input formControlName="longitude" type="number" step="0.000001" class="form-control" placeholder="-15.978"></div>
            <div class="form-group fg-full"><label>Description</label>
              <textarea formControlName="description" class="form-control" rows="3" placeholder="Type de bâtiment, nombre d'étages…"></textarea></div>
          </div>
        </div>
        <div class="form-actions" *ngIf="propSel">
          <a routerLink="/proprietes" class="btn btn-secondary">Annuler</a>
          <button type="submit" class="btn btn-primary" [disabled]="form.invalid||submitting">
            {{ submitting ? 'Création…' : '🏘️ Créer la propriété' }}
          </button>
        </div>
      </form>
    </div>`,
  styles: [`
    .page{max-width:800px;margin:0 auto}.page-header{display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:24px}.page-title{font-size:24px;font-weight:700;color:#0c1a35;margin:0 0 4px}.page-subtitle{font-size:14px;color:#64748b;margin:0}.btn{padding:9px 18px;border-radius:8px;font-size:14px;font-weight:500;cursor:pointer;border:none;text-decoration:none;display:inline-flex;align-items:center;gap:6px}.btn-primary{background:#0c1a35;color:#fff}.btn-primary:disabled{opacity:.5;cursor:not-allowed}.btn-secondary{background:#fff;color:#334155;border:1px solid #e2e8f0}.form-card{background:#fff;border-radius:12px;padding:24px;margin-bottom:16px;box-shadow:0 1px 3px rgba(0,0,0,.06)}.form-card-title{font-size:16px;font-weight:600;color:#0c1a35;margin:0 0 20px;padding-bottom:12px;border-bottom:1px solid #f1f5f9}.form-grid-2{display:grid;grid-template-columns:1fr 1fr;gap:16px}.form-group{display:flex;flex-direction:column;gap:6px}.fg-full{grid-column:1/-1}label{font-size:13px;font-weight:500;color:#374151}.form-control{padding:9px 12px;border:1px solid #e2e8f0;border-radius:8px;font-size:14px}.form-control:focus{outline:none;border-color:#0c1a35}.err{font-size:12px;color:#dc2626}.form-actions{display:flex;justify-content:flex-end;gap:12px}.ac-list{border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;margin-top:4px}.ac-item{padding:10px 14px;cursor:pointer;font-size:14px;border-bottom:1px solid #f1f5f9}.ac-item:last-child{border:none}.ac-item:hover{background:#f8fafc}.selected-chip{display:flex;align-items:center;justify-content:space-between;background:#f0f9ff;border:1px solid #bae6fd;border-radius:8px;padding:10px 14px;margin-top:4px;font-size:14px;color:#0c4a6e}.selected-chip button{background:none;border:none;cursor:pointer;color:#64748b}
  `]
})
export class ProprieteFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private svc = inject(ProprietesService);
  private propSvc = inject(ProprietairesService);
  private router = inject(Router);
  form = this.fb.group({ libelle:['',Validators.required], adresse:['',Validators.required], quartier:[''], ville:['Nouakchott',Validators.required], zoneCode:[''], description:[''], latitude:[null as number|null], longitude:[null as number|null] });
  propSel: any = null; propResultats: any[] = []; searchProp = ''; submitting = false; timer: any;
  ngOnInit() {}
  f(n:string) { return this.form.get(n); }
  onSearchProp(e: Event) {
    const val = (e.target as HTMLInputElement).value; this.searchProp = val;
    clearTimeout(this.timer);
    if (val.length < 2) { this.propResultats=[]; return; }
    this.timer = setTimeout(()=>{ this.propSvc.getAll(1,10,val).subscribe(r=>this.propResultats=r.items); },350);
  }
  selectProp(p:any) { this.propSel=p; this.propResultats=[]; }
  clearProp() { this.propSel=null; this.searchProp=''; }
  submit() {
    if (this.form.invalid||!this.propSel) return;
    this.submitting=true;
    this.svc.create({...this.form.value,proprietaireId:this.propSel.id}).subscribe({
      next:()=>this.router.navigate(['/proprietes']), error:()=>{this.submitting=false;}
    });
  }
}

// ══════════════════════════════════════════════════════════════
//  PROPRIÉTÉ DETAIL
// ══════════════════════════════════════════════════════════════
@Component({
  selector: 'kdi-propriete-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, DecimalPipe],
  template: `
    <div class="page" *ngIf="p">
      <div class="page-header">
        <div><h2 class="page-title">{{ p.libelle }}</h2><p class="page-subtitle">{{ p.proprietaireNom }} — {{ p.adresse }}</p></div>
        <div class="ha">
          <a [routerLink]="['/produits']" [queryParams]="{proprieteId:p.id}" class="btn btn-sec">🏠 Produits</a>
          <a routerLink="/proprietes" class="btn btn-ghost">← Retour</a>
        </div>
      </div>
      <div class="stats-row">
        <div class="sc navy"><div class="sc-val">{{ p.nombreProduits }}</div><div class="sc-lbl">Total</div></div>
        <div class="sc green"><div class="sc-val">{{ p.nombreProduitsLoues }}</div><div class="sc-lbl">Loués</div></div>
        <div class="sc orange"><div class="sc-val">{{ p.nombreProduitsLibres }}</div><div class="sc-lbl">Libres</div></div>
        <div class="sc gold"><div class="sc-val">{{ p.nombreProduits>0 ? ((p.nombreProduitsLoues/p.nombreProduits)*100|number:'1.0-0') : 0 }}%</div><div class="sc-lbl">Taux occ.</div></div>
      </div>
      <div class="detail-grid">
        <div class="dc"><h3 class="dc-title">Localisation</h3>
          <dl class="il"><dt>Adresse</dt><dd>{{ p.adresse }}</dd><dt>Quartier</dt><dd>{{ p.quartier||'—' }}</dd><dt>Ville</dt><dd>{{ p.ville }}</dd><dt>Zone</dt><dd>{{ p.zoneCode||'—' }}</dd></dl>
          <p class="notes" *ngIf="p.description">{{ p.description }}</p></div>
        <div class="dc"><h3 class="dc-title">Gestion</h3>
          <span class="badge" [class.bg]="p.aContratGestion" [class.br]="!p.aContratGestion">{{ p.aContratGestion ? '✓ Contrat actif' : '⚠ Sans contrat' }}</span></div>
      </div>
      <div class="sec-title">🏠 Produits locatifs</div>
      <div class="produits-table" *ngIf="p.produits?.length">
        <div *ngFor="let prod of p.produits" class="prod-row">
          <span class="prod-code">{{ prod.code }}</span>
          <span class="prod-type">{{ prod.typeLabel }}</span>
          <span class="prod-loyer">{{ prod.loyerReference|number:'1.0-0' }} MRU</span>
          <span class="badge" [class.bg]="prod.statutLabel==='Loue'" [class.bgray]="prod.statutLabel==='Libre'">{{ prod.statutLabel }}</span>
          <a [routerLink]="['/produits',prod.id]" class="btn-icon">👁</a>
        </div>
      </div>
      <div class="empty-mini" *ngIf="!p.produits?.length">
        Aucun produit. <a [routerLink]="['/produits/nouveau']" [queryParams]="{proprieteId:p.id}">Créer →</a>
      </div>
    </div>`,
  styles: [`
    .page{max-width:1100px;margin:0 auto}.page-header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:24px}.page-title{font-size:24px;font-weight:700;color:#0c1a35;margin:0 0 4px}.page-subtitle{font-size:14px;color:#64748b;margin:0}.ha{display:flex;gap:8px}.btn{padding:9px 18px;border-radius:8px;font-size:14px;font-weight:500;cursor:pointer;border:none;text-decoration:none;display:inline-flex;align-items:center;gap:6px}.btn-sec{background:#fff;color:#334155;border:1px solid #e2e8f0}.btn-ghost{background:transparent;color:#64748b}.badge,.bg,.br,.bgray{padding:4px 10px;border-radius:12px;font-size:12px;font-weight:500}.bg{background:#d1fae5;color:#065f46}.br{background:#fef3c7;color:#92400e}.bgray{background:#f1f5f9;color:#64748b}.stats-row{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:24px}.sc{background:#fff;border-radius:12px;padding:20px;text-align:center;box-shadow:0 1px 3px rgba(0,0,0,.06);border-top:3px solid transparent}.sc.navy{border-top-color:#0c1a35}.sc.green{border-top-color:#10b981}.sc.orange{border-top-color:#f59e0b}.sc.gold{border-top-color:#c8a96e}.sc-val{font-size:28px;font-weight:800;color:#0c1a35}.sc-lbl{font-size:12px;color:#64748b;margin-top:4px}.detail-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:24px}.dc{background:#fff;border-radius:12px;padding:24px;box-shadow:0 1px 3px rgba(0,0,0,.06)}.dc-title{font-size:15px;font-weight:600;color:#0c1a35;margin:0 0 16px;padding-bottom:10px;border-bottom:1px solid #f1f5f9}.il{display:grid;grid-template-columns:auto 1fr;gap:8px 16px;font-size:14px;margin:0}dt{color:#64748b;font-weight:500}dd{color:#334155;margin:0}.notes{font-size:14px;color:#475569;margin-top:12px}.sec-title{font-size:16px;font-weight:600;color:#0c1a35;margin-bottom:12px}.produits-table{background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.06)}.prod-row{display:grid;grid-template-columns:80px 1fr 130px 100px 40px;align-items:center;gap:12px;padding:12px 16px;border-bottom:1px solid #f1f5f9;font-size:14px}.prod-row:last-child{border:none}.prod-code{font-family:monospace;font-weight:700;background:#e0e7ef;padding:3px 8px;border-radius:6px;color:#0c1a35;font-size:12px}.prod-type{color:#64748b}.prod-loyer{font-weight:600;color:#0c1a35}.btn-icon{background:none;border:none;cursor:pointer;font-size:16px;text-decoration:none;padding:4px}.empty-mini{background:#f8fafc;border-radius:10px;padding:24px;text-align:center;color:#94a3b8;font-size:14px}.empty-mini a{color:#0c1a35;font-weight:500}
  `]
})
export class ProprieteDetailComponent implements OnInit {
  private svc = inject(ProprietesService);
  private route = inject(ActivatedRoute);
  p: any = null;
  ngOnInit() { this.svc.getById(this.route.snapshot.params['id']).subscribe(d => this.p = d); }
}
