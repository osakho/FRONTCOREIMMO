import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ProprietesService } from '../../../core/services/api.services';
import { ProprieteListItemDto, PagedList } from '../../../core/models/models';

@Component({
  selector: 'kdi-proprietes-list',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  template: `
    <div class="page-enter">
      <div class="page-header">
        <div>
          <h2 class="page-title"><span class="mi">apartment</span>Propriétés</h2>
          <p class="page-subtitle" *ngIf="!proprietaireId">{{ liste().totalCount }} propriétés gérées</p>
          <p class="page-subtitle" *ngIf="proprietaireId">
            <a routerLink="/proprietaires" style="color:var(--t3)">Propriétaires</a>
            <span style="color:var(--t4)"> › </span>
            Propriétés du propriétaire
          </p>
        </div>
        <div class="header-actions">
          <a *ngIf="proprietaireId" routerLink="/proprietaires" class="btn btn-ghost">
            <span class="mi">arrow_back</span>Retour
          </a>
          <a routerLink="/proprietes/nouvelle" class="btn btn-gold">
            <span class="mi">add</span>Nouvelle propriété
          </a>
        </div>
      </div>

      <div class="filter-bar">
        <div class="search-inline">
          <span class="mi">search</span>
          <input placeholder="Libellé, quartier, ville…" [(ngModel)]="searchTerm" (ngModelChange)="onSearch()">
        </div>
      </div>

      <!-- Cards grid -->
      <div class="prop-grid" *ngIf="liste().items.length; else empty">
        <div *ngFor="let p of liste().items" class="prop-card">
          <div class="prop-card-header">
            <div class="prop-icon">
              <span class="mi">apartment</span>
            </div>
            <div class="prop-info">
              <div class="prop-name">{{ p.libelle }}</div>
              <div class="prop-owner">{{ p.proprietaireNom }}</div>
            </div>
            <span class="badge" [class.badge-green]="p.aContratGestion" [class.badge-gray]="!p.aContratGestion">
              {{ p.aContratGestion ? 'Géré' : 'Sans contrat' }}
            </span>
          </div>

          <div class="prop-card-body">
            <div class="prop-address">
              <span class="mi mi-sm">place</span>
              {{ p.adresse }}<span *ngIf="p.quartier">, {{ p.quartier }}</span>
            </div>

            <div class="prop-stats">
              <div class="prop-stat">
                <div class="ps-val">{{ p.nombreProduits }}</div>
                <div class="ps-lbl">Total</div>
              </div>
              <div class="prop-stat">
                <div class="ps-val" style="color:var(--ok)">{{ p.nombreProduits - p.nombreLibres }}</div>
                <div class="ps-lbl">Loués</div>
              </div>
              <div class="prop-stat">
                <div class="ps-val" [style.color]="p.nombreLibres > 0 ? 'var(--wa)' : 'var(--t3)'">{{ p.nombreLibres }}</div>
                <div class="ps-lbl">Libres</div>
              </div>
              <div class="prop-stat" *ngIf="p.nombreProduits > 0">
                <div class="ps-val" style="color:var(--in)">{{ occupationRate(p) }}%</div>
                <div class="ps-lbl">Occup.</div>
              </div>
            </div>

            <!-- Occupation bar -->
            <div class="progress-bar mt-2" *ngIf="p.nombreProduits > 0">
              <div class="progress-fill"
                   [class.green]="occupationRate(p) >= 80"
                   [style.width.%]="occupationRate(p)"></div>
            </div>
          </div>

          <div class="prop-card-footer">
            <span class="text-muted" style="font-size:.69rem">{{ p.creeLe | date:'dd/MM/yyyy' }}</span>
            <div class="row-actions">
              <a [routerLink]="['/proprietes', p.id]" class="action-btn view" title="Voir">
                <span class="mi">visibility</span>
              </a>
              <a [routerLink]="['/produits']" [queryParams]="{proprieteId: p.id}" class="action-btn" style="color:var(--gold)" title="Produits">
                <span class="mi">meeting_room</span>
              </a>
            </div>
          </div>
        </div>
      </div>

      <ng-template #empty>
        <div class="card">
          <div class="empty-state">
            <span class="mi">apartment</span>
            <div class="empty-title">Aucune propriété trouvée</div>
            <p class="empty-sub">Créez la première propriété</p>
            <a routerLink="/proprietes/nouvelle" class="btn btn-gold mt-3">
              <span class="mi">add</span>Nouvelle propriété
            </a>
          </div>
        </div>
      </ng-template>

      <div class="flex items-center justify-between mt-4" *ngIf="liste().totalPages > 1">
        <span class="pagination-info">Page {{ page }} / {{ liste().totalPages }}</span>
        <div class="pagination-pages">
          <button class="page-btn" [disabled]="page===1" (click)="goPage(page-1)"><span class="mi">chevron_left</span></button>
          <button *ngFor="let p of pageRange()" class="page-btn" [class.active]="p===page" (click)="goPage(p)">{{ p }}</button>
          <button class="page-btn" [disabled]="!liste().hasNext" (click)="goPage(page+1)"><span class="mi">chevron_right</span></button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .prop-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 14px;
    }
    .prop-card {
      background: var(--wh);
      border: 1px solid var(--bord);
      border-radius: var(--r2);
      overflow: hidden;
      box-shadow: var(--s1);
      transition: var(--tr-slow);
    }
    .prop-card:hover { box-shadow: var(--s2); transform: translateY(-2px); }

    .prop-card-header {
      display: flex;
      align-items: center;
      gap: 11px;
      padding: 15px 15px 12px;
      border-bottom: 1px solid var(--bord);
    }
    .prop-icon {
      width: 40px; height: 40px;
      background: var(--surf);
      border-radius: 10px;
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
    }
    .prop-icon .mi { font-size: 20px; color: var(--gold); }
    .prop-info { flex: 1; min-width: 0; }
    .prop-name { font-weight: 600; font-size: .82rem; color: var(--t1); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .prop-owner { font-size: .69rem; color: var(--t3); margin-top: 1px; }

    .prop-card-body { padding: 13px 15px; }
    .prop-address { font-size: .74rem; color: var(--t3); display: flex; align-items: center; gap: 3px; margin-bottom: 13px; }

    .prop-stats { display: flex; gap: 18px; }
    .prop-stat { display: flex; flex-direction: column; align-items: center; gap: 2px; }
    .ps-val { font-family: 'Syne', sans-serif; font-size: 1.15rem; font-weight: 800; color: var(--t1); line-height: 1; }
    .ps-lbl { font-size: .62rem; color: var(--t3); text-transform: uppercase; letter-spacing: .04em; }

    .prop-card-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 9px 15px;
      background: var(--surf);
      border-top: 1px solid var(--bord);
    }
  `]
})
export class ProprietesListComponent implements OnInit {
  private svc   = inject(ProprietesService);
  private route = inject(ActivatedRoute);

  liste = signal<PagedList<ProprieteListItemDto>>({ items:[], totalCount:0, page:1, pageSize:20, totalPages:0, hasNext:false, hasPrevious:false });
  page = 1; searchTerm = ''; timer: any;
  proprietaireId?: string;

  ngOnInit() {
    this.proprietaireId = this.route.snapshot.queryParams['proprietaireId'] ?? undefined;
    this.load();
  }

  load() {
    this.svc.getAll(this.page, 20, this.searchTerm || undefined, this.proprietaireId).subscribe(r => this.liste.set(r));
  }
  onSearch() { clearTimeout(this.timer); this.timer = setTimeout(() => { this.page = 1; this.load(); }, 380); }
  goPage(p: number) { this.page = p; this.load(); }
  occupationRate(p: any) { return p.nombreProduits > 0 ? Math.round((p.nombreProduits - p.nombreLibres) / p.nombreProduits * 100) : 0; }
  pageRange() {
    const total = this.liste().totalPages, p = this.page, pages: number[] = [];
    for (let i = Math.max(1,p-2); i <= Math.min(total,p+2); i++) pages.push(i);
    return pages;
  }
}