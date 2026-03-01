import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ContratsLocationService } from '../../../core/services/api.services';
import { ContratLocationListItemDto, PagedList, StatutContrat } from '../../../core/models/models';

@Component({
  selector: 'kdi-contrats-location-list',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, DecimalPipe],
  template: `
    <div class="page">
      <div class="page-header">
        <div>
          <h2 class="page-title">Baux locatifs</h2>
          <p class="page-subtitle">Contrats de location en cours et historique</p>
        </div>
        <a routerLink="/contrats-location/nouveau" class="btn btn-primary">＋ Nouveau bail</a>
      </div>

      <div class="filters-bar">
        <input type="text" class="search-input" placeholder="🔍 Locataire, produit, numéro…"
               [(ngModel)]="search" (ngModelChange)="onSearch()">
        <select class="filter-select" [(ngModel)]="filtreStatut" (ngModelChange)="load()">
          <option value="">Tous les statuts</option>
          <option value="Brouillon">Brouillon</option>
          <option value="Actif">Actif</option>
          <option value="Termine">Terminé</option>
          <option value="Resilie">Résilié</option>
        </select>
      </div>

      <!-- Modal résiliation -->
      <div class="modal-overlay" *ngIf="showModalResiliation" (click)="annulerResiliation()">
        <div class="modal" (click)="$event.stopPropagation()">
          <h3 class="modal-title">🚫 Résilier le contrat</h3>
          <p class="modal-subtitle">Cette action est irréversible.</p>
          <div class="form-group">
            <label>Motif de résiliation *</label>
            <textarea [(ngModel)]="motifResiliation" class="form-control" rows="3"
                      placeholder="Ex: Départ volontaire, non-paiement, fin de période…"></textarea>
          </div>
          <div class="form-group">
            <label>Date de résiliation *</label>
            <input type="date" [(ngModel)]="dateResiliation" class="form-control">
          </div>
          <div class="modal-actions">
            <button class="btn btn-ghost" (click)="annulerResiliation()">Annuler</button>
            <button class="btn btn-danger" (click)="confirmerResiliation()"
                    [disabled]="!motifResiliation || !dateResiliation">
              Confirmer la résiliation
            </button>
          </div>
        </div>
      </div>

      <div class="table-card">
        <table class="data-table" *ngIf="liste().items.length; else empty">
          <thead><tr>
            <th>N° Bail</th>
            <th>Produit</th>
            <th>Locataire</th>
            <th class="text-right">Loyer (MRU)</th>
            <th>Entrée</th>
            <th>Sortie prévue</th>
            <th class="text-center">Retard</th>
            <th class="text-center">Statut</th>
            <th></th>
          </tr></thead>
          <tbody>
            <tr *ngFor="let c of liste().items" [class.row-retard]="c.estEnRetard">
              <td><span class="num-badge">{{ c.numero }}</span></td>
              <td><span class="code-badge">{{ c.produitCode }}</span></td>
              <td><div class="cell-main">{{ c.locataireNom }}</div></td>
              <td class="text-right font-bold">{{ c.loyer | number:'1.0-0' }}</td>
              <td class="text-muted">{{ c.dateEntree | date:'dd/MM/yyyy' }}</td>
              <td class="text-muted">{{ c.dateSortiePrevue ? (c.dateSortiePrevue | date:'dd/MM/yyyy') : 'Indéterminé' }}</td>
              <td class="text-center">
                <span class="retard-badge" *ngIf="c.estEnRetard">⚠️ Retard</span>
              </td>
              <td class="text-center">
                <span class="badge" [ngClass]="statutClass(c.statutLabel)">{{ c.statutLabel }}</span>
              </td>
              <td>
                <div class="row-actions">
                  <a [routerLink]="['/contrats-location', c.id]" class="btn-icon" title="Voir">👁</a>

                  <button *ngIf="c.statutLabel === 'Brouillon'"
                          class="btn-action btn-activer" (click)="activer(c.id)" title="Activer">
                    ✅ Activer
                  </button>

                  <a *ngIf="c.statutLabel === 'Actif'"
                     [routerLink]="['/collectes/saisir']" [queryParams]="{contratId: c.id}"
                     class="btn-icon" title="Saisir loyer">💰</a>

                  <button *ngIf="c.statutLabel === 'Actif' || c.statutLabel === 'Brouillon'"
                          class="btn-action btn-resilier" (click)="ouvrirResiliation(c.id)" title="Résilier">
                    🚫 Résilier
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
        <ng-template #empty>
          <div class="empty-state">
            <span class="empty-icon">📋</span>
            <p>Aucun bail trouvé</p>
            <a routerLink="/contrats-location/nouveau" class="btn btn-primary">Créer le premier</a>
          </div>
        </ng-template>
      </div>
    </div>
  `,
  styles: [`
    .page{max-width:1300px;margin:0 auto}
    .page-header{display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:24px}
    .page-title{font-size:24px;font-weight:700;color:#0c1a35;margin:0 0 4px}
    .page-subtitle{font-size:14px;color:#64748b;margin:0}
    .btn{padding:9px 18px;border-radius:8px;font-size:14px;font-weight:500;cursor:pointer;border:none;text-decoration:none;display:inline-flex;align-items:center;gap:6px}
    .btn-primary{background:#0c1a35;color:#fff}
    .btn-ghost{background:#f1f5f9;color:#475569}
    .btn-danger{background:#ef4444;color:#fff}
    .btn-danger:disabled{opacity:.4;cursor:not-allowed}
    .filters-bar{display:flex;gap:12px;margin-bottom:16px}
    .search-input{flex:1;padding:9px 14px;border:1px solid #e2e8f0;border-radius:8px;font-size:14px}
    .filter-select{padding:9px 14px;border:1px solid #e2e8f0;border-radius:8px;font-size:14px;background:#fff}
    .table-card{background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.06)}
    .data-table{width:100%;border-collapse:collapse}
    .data-table th{padding:12px 14px;background:#f8fafc;font-size:11px;font-weight:600;color:#64748b;text-align:left;border-bottom:1px solid #e2e8f0;text-transform:uppercase}
    .data-table td{padding:11px 14px;font-size:13px;color:#334155;border-bottom:1px solid #f1f5f9}
    .data-table tr:last-child td{border-bottom:none}
    .data-table tr:hover td{background:#fafbfc}
    .row-retard{background:#fff7f7!important}
    .num-badge{font-family:monospace;background:#f1f5f9;padding:3px 8px;border-radius:6px;font-size:12px;font-weight:700;color:#0c1a35}
    .code-badge{font-family:monospace;background:#e0e7ef;padding:3px 8px;border-radius:6px;font-size:12px;font-weight:700;color:#0c1a35}
    .cell-main{font-weight:500;color:#0c1a35}
    .text-right{text-align:right}.text-center{text-align:center}.text-muted{color:#94a3b8}.font-bold{font-weight:600}
    .retard-badge{background:#fee2e2;color:#991b1b;padding:3px 8px;border-radius:8px;font-size:11px;font-weight:600}
    .badge{padding:3px 10px;border-radius:12px;font-size:12px;font-weight:500}
    .badge-actif{background:#d1fae5;color:#065f46}
    .badge-brouillon{background:#f1f5f9;color:#64748b}
    .badge-termine{background:#e0e7ef;color:#475569}
    .badge-resilie{background:#fee2e2;color:#991b1b}
    .row-actions{display:flex;gap:6px;justify-content:flex-end;align-items:center;flex-wrap:wrap}
    .btn-icon{background:none;border:none;cursor:pointer;font-size:16px;padding:4px;border-radius:6px;text-decoration:none}
    .btn-icon:hover{background:#f1f5f9}
    .btn-action{border:none;cursor:pointer;font-size:11px;font-weight:600;padding:4px 8px;border-radius:6px}
    .btn-activer{background:#d1fae5;color:#065f46}
    .btn-activer:hover{background:#a7f3d0}
    .btn-resilier{background:#fee2e2;color:#991b1b}
    .btn-resilier:hover{background:#fecaca}
    .empty-state{display:flex;flex-direction:column;align-items:center;padding:60px;gap:12px;color:#94a3b8}
    .empty-icon{font-size:48px}
    /* Modal */
    .modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,.4);z-index:1000;display:flex;align-items:center;justify-content:center}
    .modal{background:#fff;border-radius:16px;padding:32px;width:480px;max-width:90vw;box-shadow:0 20px 60px rgba(0,0,0,.2)}
    .modal-title{font-size:20px;font-weight:700;color:#0c1a35;margin:0 0 4px}
    .modal-subtitle{font-size:14px;color:#64748b;margin:0 0 24px}
    .form-group{display:flex;flex-direction:column;gap:6px;margin-bottom:16px}
    label{font-size:13px;font-weight:500;color:#374151}
    .form-control{padding:9px 12px;border:1px solid #e2e8f0;border-radius:8px;font-size:14px;font-family:inherit}
    .form-control:focus{outline:none;border-color:#0c1a35}
    .modal-actions{display:flex;justify-content:flex-end;gap:12px;margin-top:24px}
  `]
})
export class ContratsLocationListComponent implements OnInit {
  private svc = inject(ContratsLocationService);

  liste = signal<PagedList<ContratLocationListItemDto>>({
    items: [], totalCount: 0, page: 1, pageSize: 20, totalPages: 0, hasNext: false, hasPrevious: false
  });

  search = ''; filtreStatut = ''; timer: any;

  // Modal résiliation
  showModalResiliation = false;
  contratAResilier: string | null = null;
  motifResiliation = '';
  dateResiliation = new Date().toISOString().slice(0, 10);

  ngOnInit() { this.load(); }

  load() {
    this.svc.getAll({ statut: this.filtreStatut as StatutContrat || undefined, search: this.search || undefined })
      .subscribe(r => this.liste.set(r));
  }

  onSearch() { clearTimeout(this.timer); this.timer = setTimeout(() => this.load(), 400); }

  activer(id: string) {
    if (!confirm('Activer ce contrat ? Les clés seront considérées remises.')) return;
    this.svc.activer(id).subscribe({
      next: () => this.load(),
      error: () => alert('Erreur lors de l\'activation')
    });
  }

  ouvrirResiliation(id: string) {
    this.contratAResilier = id;
    this.motifResiliation = '';
    this.dateResiliation = new Date().toISOString().slice(0, 10);
    this.showModalResiliation = true;
  }

  annulerResiliation() {
    this.showModalResiliation = false;
    this.contratAResilier = null;
  }

  confirmerResiliation() {
    if (!this.contratAResilier || !this.motifResiliation || !this.dateResiliation) return;
    this.svc.resilier(this.contratAResilier, this.motifResiliation, new Date(this.dateResiliation)).subscribe({
      next: () => { this.annulerResiliation(); this.load(); },
      error: () => alert('Erreur lors de la résiliation')
    });
  }

  statutClass(s: string): Record<string, boolean> {
    return {
      'badge-actif': s === 'Actif',
      'badge-brouillon': s === 'Brouillon',
      'badge-termine': s === 'Termine',
      'badge-resilie': s === 'Resilie'
    };
  }
}
