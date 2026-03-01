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