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
              <a [routerLink]="['/proprietes', p.id]" class="btn-icon" title="Voir">👁</a>
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
  private svc   = inject(ProprietesService);
  private route = inject(ActivatedRoute);

  liste = signal<PagedList<ProprieteListItemDto>>({ items:[], totalCount:0, page:1, pageSize:20, totalPages:0, hasNext:false, hasPrevious:false });
  page = 1; searchTerm = ''; timer: any;
  proprietaireId?: string;

  ngOnInit() {
    // Lire le filtre propriétaire depuis l'URL
    this.proprietaireId = this.route.snapshot.queryParams['proprietaireId'] ?? undefined;
    this.load();
  }

  load() {
    this.svc.getAll(this.page, 20, this.searchTerm || undefined, this.proprietaireId)
      .subscribe(r => this.liste.set(r));
  }

  onSearch() { clearTimeout(this.timer); this.timer = setTimeout(() => { this.page = 1; this.load(); }, 400); }
  goPage(p: number) { this.page = p; this.load(); }
}
// export class ProprietesListComponent implements OnInit {
//   private svc = inject(ProprietesService);
//   private route = inject(ActivatedRoute);
//   liste = signal<PagedList<ProprieteListItemDto>>({ items:[], totalCount:0, page:1, pageSize:20, totalPages:0, hasNext:false, hasPrevious:false });
//   page = 1; searchTerm = ''; timer: any;
//   ngOnInit() { this.load(); }
//   load() { this.svc.getAll(this.page, 20, this.searchTerm||undefined).subscribe(r => this.liste.set(r)); }
//   onSearch() { clearTimeout(this.timer); this.timer = setTimeout(()=>{ this.page=1; this.load(); },400); }
//   goPage(p:number) { this.page=p; this.load(); }
// }
