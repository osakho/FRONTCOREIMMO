import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ProprietairesService } from '../../../core/services/api.services';
import { ProprietaireListItemDto, PagedList } from '../../../core/models/models';

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
  styles: [`
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
`]
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