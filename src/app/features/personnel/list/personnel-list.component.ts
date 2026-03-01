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