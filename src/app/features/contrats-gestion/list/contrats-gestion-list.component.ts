// ══════════════════════════════════════════════════════════════
//  CONTRATS GESTION LIST
// ══════════════════════════════════════════════════════════════
import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ContratsGestionService, AuthService } from '../../../core/services/api.services';
import { ContratGestionDto, PagedList, StatutContrat } from '../../../core/models/models';

@Component({
  selector: 'kdi-contrats-gestion-list',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, DecimalPipe],
  template: `
    <div class="page">
      <div class="page-header">
        <div>
          <h2 class="page-title">Contrats de gestion</h2>
          <p class="page-subtitle">Mandats de gestion agence ↔ propriétaire — Accès Direction</p>
        </div>
        <a routerLink="/contrats-gestion/nouveau" class="btn btn-primary">＋ Nouveau contrat</a>
      </div>

      <!-- Filtres -->
      <div class="filters-bar">
        <select class="filter-select" [(ngModel)]="filtreStatut" (ngModelChange)="load()">
          <option value="">Tous les statuts</option>
          <option value="Brouillon">Brouillon</option>
          <option value="Actif">Actif</option>
          <option value="Suspendu">Suspendu</option>
          <option value="Termine">Terminé</option>
        </select>
      </div>

      <div class="table-card">
        <table class="data-table" *ngIf="liste().items.length; else empty">
          <thead><tr>
            <th>N° Contrat</th>
            <th>Propriété</th>
            <th>Période</th>
            <th class="text-right" *ngIf="isDirection()">Commission</th>
            <th class="text-center">Checklist</th>
            <th class="text-center">Statut</th>
            <th>Actions</th>
          </tr></thead>
          <tbody>
            <tr *ngFor="let c of liste().items">
              <td><span class="num-badge">{{ c.numero }}</span></td>
              <td><div class="cell-main">{{ c.proprieteLibelle }}</div></td>
              <td class="text-muted">
                {{ c.dateDebut | date:'dd/MM/yyyy' }}
                <span *ngIf="c.dateFin"> → {{ c.dateFin | date:'dd/MM/yyyy' }}</span>
              </td>
              <td class="text-right font-bold" *ngIf="isDirection()">
                {{ c.tauxCommission * 100 | number:'1.0-1' }}%
              </td>
              <td class="text-center">
                <div class="checklist-dots">
                  <span class="dot" [class.ok]="c.docIdentiteOk" title="CNI propriétaire">ID</span>
                  <span class="dot" [class.ok]="c.photosEdlOk" title="Photos état des lieux">📷</span>
                  <span class="dot" [class.ok]="c.docAutorisationOk" title="Autorisation exploitation">📄</span>
                </div>
              </td>
              <td class="text-center">
                <span class="badge" [ngClass]="statutClass(c.statutLabel)">{{ c.statutLabel }}</span>
              </td>
              <td>
                <div class="row-actions">
                  <button *ngIf="c.peutEtreActive && c.statutLabel !== 'Actif'"
                          (click)="activer(c)" class="btn-action green" title="Activer">✔</button>
                  <span class="badge badge-green" *ngIf="c.statutLabel === 'Actif'">✓ Actif</span>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
        <ng-template #empty>
          <div class="empty-state">
            <span class="empty-icon">🤝</span>
            <p>Aucun contrat de gestion</p>
            <a routerLink="/contrats-gestion/nouveau" class="btn btn-primary">Créer le premier</a>
          </div>
        </ng-template>
      </div>

      <div class="confidentiel-note" *ngIf="!isDirection()">
        🔒 Les taux de commission sont confidentiels — accès Direction uniquement.
      </div>
    </div>
  `,
  styles: [`
    .page{max-width:1100px;margin:0 auto}
    .page-header{display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:24px}
    .page-title{font-size:24px;font-weight:700;color:#0c1a35;margin:0 0 4px}
    .page-subtitle{font-size:14px;color:#64748b;margin:0}
    .btn{padding:9px 18px;border-radius:8px;font-size:14px;font-weight:500;cursor:pointer;border:none;text-decoration:none;display:inline-flex;align-items:center;gap:6px}
    .btn-primary{background:#0c1a35;color:#fff}
    .filters-bar{display:flex;gap:12px;margin-bottom:16px}
    .filter-select{padding:9px 14px;border:1px solid #e2e8f0;border-radius:8px;font-size:14px;background:#fff}
    .table-card{background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.06)}
    .data-table{width:100%;border-collapse:collapse}
    .data-table th{padding:12px 14px;background:#f8fafc;font-size:12px;font-weight:600;color:#64748b;text-align:left;border-bottom:1px solid #e2e8f0;text-transform:uppercase}
    .data-table td{padding:11px 14px;font-size:13px;color:#334155;border-bottom:1px solid #f1f5f9}
    .data-table tr:last-child td{border-bottom:none}
    .num-badge{font-family:monospace;background:#f1f5f9;padding:3px 8px;border-radius:6px;font-size:12px;color:#0c1a35;font-weight:700}
    .cell-main{font-weight:500;color:#0c1a35}
    .text-right{text-align:right}.text-center{text-align:center}.text-muted{color:#94a3b8}.font-bold{font-weight:600}
    .checklist-dots{display:flex;gap:6px;justify-content:center}
    .dot{padding:2px 6px;border-radius:6px;font-size:10px;font-weight:700;background:#fee2e2;color:#991b1b}
    .dot.ok{background:#d1fae5;color:#065f46}
    .badge{padding:3px 10px;border-radius:12px;font-size:12px;font-weight:500}
    .badge-actif{background:#d1fae5;color:#065f46}
    .badge-brouillon{background:#f1f5f9;color:#64748b}
    .badge-green{background:#d1fae5;color:#065f46;padding:3px 10px;border-radius:12px;font-size:12px}
    .row-actions{display:flex;gap:6px;align-items:center}
    .btn-action{width:28px;height:28px;border:none;border-radius:6px;cursor:pointer;font-size:14px;display:flex;align-items:center;justify-content:center}
    .btn-action.green{background:#d1fae5;color:#065f46}
    .empty-state{display:flex;flex-direction:column;align-items:center;padding:60px;gap:12px;color:#94a3b8}
    .empty-icon{font-size:48px}
    .confidentiel-note{margin-top:16px;background:#fef3c7;border:1px solid #fde68a;border-radius:8px;padding:12px 16px;font-size:13px;color:#92400e}
  `]
})
export class ContratsGestionListComponent implements OnInit {
  private svc  = inject(ContratsGestionService);
  private auth = inject(AuthService);

  liste = signal<PagedList<ContratGestionDto>>({ items:[], totalCount:0, page:1, pageSize:20, totalPages:0, hasNext:false, hasPrevious:false });
  filtreStatut = '';

  ngOnInit() { this.load(); }

  load() {
    this.svc.getAll(1, 20, undefined, this.filtreStatut as StatutContrat || undefined)
      .subscribe(r => this.liste.set(r));
  }

  activer(c: ContratGestionDto) {
    if (!confirm(`Activer le contrat ${c.numero} ?`)) return;
    this.svc.activer(c.id).subscribe(() => this.load());
  }

  isDirection() { return this.auth.isDirection(); }

  statutClass(s: string): Record<string, boolean> {
    return { 'badge-actif': s === 'Actif', 'badge-brouillon': s !== 'Actif' };
  }
}
