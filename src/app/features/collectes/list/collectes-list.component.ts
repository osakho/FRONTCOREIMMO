import { Component, inject, OnInit } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CollectesService, AuthService } from '../../../core/services/api.services';
import { CollecteDto, PagedList, StatutCollecte } from '../../../core/models/models';

@Component({
  selector: 'kdi-collectes-list',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, DecimalPipe],
  template: `
    <div class="page">
      <div class="page-header">
        <div>
          <h2 class="page-title">Collectes</h2>
          <p class="page-subtitle">Suivi des encaissements de loyers</p>
        </div>
        <div class="header-actions">
          <a routerLink="/collectes/bordereau" class="btn btn-secondary">📋 Créer un bordereau</a>
          <a routerLink="/collectes/rapport" class="btn btn-secondary">📊 Rapport semaine</a>
          <a routerLink="/collectes/saisir" class="btn btn-primary">＋ Saisir une collecte</a>
        </div>
      </div>

      <!-- Filtres -->
      <div class="filters-bar">
        <input type="month" class="filter-select" [(ngModel)]="filtreMois" (ngModelChange)="load()">
        <select class="filter-select" [(ngModel)]="filtreStatut" (ngModelChange)="load()">
          <option value="">Tous les statuts</option>
          <option value="Saisie">Saisie</option>
          <option value="SoumisComptable">Soumis comptable</option>
          <option value="Valide">Validée</option>
          <option value="Rejete">Rejetée</option>
        </select>
      </div>

      <!-- Totaux rapides -->
      <div class="totaux-bar" *ngIf="collectes.items.length">
        <div class="total-item">
          <span class="ti-label">Total encaissé</span>
          <span class="ti-val">{{ totalEncaisse | number:'1.0-0' }} MRU</span>
        </div>
        <div class="total-item">
          <span class="ti-label">Collectes</span>
          <span class="ti-val">{{ collectes.totalCount }}</span>
        </div>
        <div class="total-item warn" *ngIf="nbRetards > 0">
          <span class="ti-label">Retards</span>
          <span class="ti-val">{{ nbRetards }}</span>
        </div>
      </div>

      <!-- Table -->
      <div class="table-card">
        <table class="data-table" *ngIf="collectes.items.length; else empty">
          <thead><tr>
            <th>Locataire</th>
            <th>Produit</th>
            <th>Période</th>
            <th class="text-right">Attendu</th>
            <th class="text-right">Encaissé</th>
            <th class="text-right">Écart</th>
            <th>Mode</th>
            <th>Collecteur</th>
            <th>Statut</th>
            <th>Actions</th>
          </tr></thead>
          <tbody>
            <tr *ngFor="let c of collectes.items">
              <td><div class="cell-main">{{ c.locataireNom }}</div><div class="cell-sub">{{ c.locataireTel }}</div></td>
              <td><span class="badge badge-code">{{ c.produitCode }}</span></td>
              <td>{{ c.periodeMois }}</td>
              <td class="text-right">{{ c.montantAttendu | number:'1.0-0' }}</td>
              <td class="text-right font-bold">{{ c.montantEncaisse | number:'1.0-0' }}</td>
              <td class="text-right" [class.text-danger]="c.ecart < 0" [class.text-success]="c.ecart > 0">
                {{ c.ecart !== 0 ? (c.ecart > 0 ? '+' : '') + (c.ecart | number:'1.0-0') : '—' }}
              </td>
              <td>{{ c.modeLabel }}</td>
              <td class="text-muted">{{ c.collecteurNom }}</td>
              <td>
                <span class="badge" [ngClass]="statutClass(c.statutLabel)">{{ c.statutLabel }}</span>
              </td>
              <td>
                <div class="row-actions">
                  <button *ngIf="isComptable() && c.statutLabel === 'SoumisComptable'"
                          (click)="valider(c)" class="btn-action green" title="Valider">✔</button>
                  <button *ngIf="isComptable() && c.statutLabel === 'SoumisComptable'"
                          (click)="rejeter(c)" class="btn-action red" title="Rejeter">✕</button>
                  <button *ngIf="c.statutLabel === 'Saisie'"
                          (click)="soumettre(c)" class="btn-action blue" title="Soumettre">↑</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
        <ng-template #empty>
          <div class="empty-state">
            <span class="empty-icon">💰</span>
            <p>Aucune collecte pour cette période</p>
            <a routerLink="/collectes/saisir" class="btn btn-primary">Saisir la première</a>
          </div>
        </ng-template>
      </div>
    </div>
  `,
  styles: [`
    .page { max-width: 1300px; margin: 0 auto; }
    .page-header { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 24px; }
    .page-title { font-size: 24px; font-weight: 700; color: #0c1a35; margin: 0 0 4px; }
    .page-subtitle { font-size: 14px; color: #64748b; margin: 0; }
    .header-actions { display: flex; gap: 8px; }
    .btn { padding: 9px 18px; border-radius: 8px; font-size: 14px; font-weight: 500; cursor: pointer; border: none; text-decoration: none; display: inline-flex; align-items: center; gap: 6px; }
    .btn-primary { background: #0c1a35; color: #fff; }
    .btn-secondary { background: #fff; color: #334155; border: 1px solid #e2e8f0; }
    .filters-bar { display: flex; gap: 12px; margin-bottom: 16px; }
    .filter-select { padding: 9px 14px; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 14px; background: #fff; }
    .totaux-bar { display: flex; gap: 24px; background: #fff; border-radius: 10px; padding: 16px 24px; margin-bottom: 16px; box-shadow: 0 1px 3px rgba(0,0,0,.06); }
    .total-item { display: flex; flex-direction: column; gap: 2px; }
    .total-item.warn .ti-val { color: #dc2626; }
    .ti-label { font-size: 12px; color: #64748b; }
    .ti-val { font-size: 20px; font-weight: 700; color: #0c1a35; }
    .table-card { background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,.06); }
    .data-table { width: 100%; border-collapse: collapse; }
    .data-table th { padding: 12px 14px; background: #f8fafc; font-size: 11px; font-weight: 600; color: #64748b; text-align: left; border-bottom: 1px solid #e2e8f0; text-transform: uppercase; }
    .data-table td { padding: 11px 14px; font-size: 13px; color: #334155; border-bottom: 1px solid #f1f5f9; }
    .data-table tr:hover td { background: #fafbfc; }
    .data-table tr:last-child td { border-bottom: none; }
    .cell-main { font-weight: 500; color: #0c1a35; }
    .cell-sub { font-size: 12px; color: #94a3b8; }
    .text-right { text-align: right; }
    .text-muted { color: #94a3b8; }
    .font-bold { font-weight: 600; }
    .text-danger { color: #dc2626; font-weight: 600; }
    .text-success { color: #059669; }
    .badge { padding: 3px 8px; border-radius: 10px; font-size: 11px; font-weight: 500; }
    .badge-code { background: #e0e7ef; color: #0c1a35; font-weight: 600; font-family: monospace; }
    .badge-saisie { background: #fef3c7; color: #92400e; }
    .badge-soumis { background: #dbeafe; color: #1e40af; }
    .badge-valide { background: #d1fae5; color: #065f46; }
    .badge-rejete { background: #fee2e2; color: #991b1b; }
    .row-actions { display: flex; gap: 4px; }
    .btn-action { width: 28px; height: 28px; border: none; border-radius: 6px; cursor: pointer; font-size: 14px; display: flex; align-items: center; justify-content: center; }
    .btn-action.green { background: #d1fae5; color: #065f46; }
    .btn-action.red { background: #fee2e2; color: #991b1b; }
    .btn-action.blue { background: #dbeafe; color: #1e40af; }
    .empty-state { display: flex; flex-direction: column; align-items: center; padding: 60px; gap: 12px; color: #94a3b8; }
    .empty-icon { font-size: 48px; }
  `]
})
export class CollectesListComponent implements OnInit {
  private svc  = inject(CollectesService);
  private auth = inject(AuthService);

  collectes: PagedList<CollecteDto> = { items: [], totalCount: 0, page: 1, pageSize: 30, totalPages: 0, hasNext: false, hasPrevious: false };
  filtreMois   = this.currentMonth();
  filtreStatut = '';

  get totalEncaisse() { return this.collectes.items.reduce((s, c) => s + c.montantEncaisse, 0); }
  get nbRetards()     { return this.collectes.items.filter(c => c.ecart < 0).length; }

  ngOnInit() { this.load(); }

  load() {
    this.svc.getAll({
      periodeMois: this.filtreMois || undefined,
      statut: (this.filtreStatut as StatutCollecte) || undefined
    }).subscribe(r => this.collectes = r);
  }

  valider(c: CollecteDto) {
    this.svc.valider(c.id).subscribe(() => this.load());
  }
  rejeter(c: CollecteDto) {
    const motif = prompt('Motif du rejet :');
    if (!motif) return;
    this.svc.rejeter(c.id, motif).subscribe(() => this.load());
  }
  soumettre(c: CollecteDto) {
    this.svc.soumettre(c.id).subscribe(() => this.load());
  }

  isComptable() { return this.auth.isComptable(); }

  statutClass(s: string): Record<string, boolean> {
    return {
      'badge-saisie': s === 'Saisie',
      'badge-soumis': s === 'SoumisComptable',
      'badge-valide': s === 'Valide',
      'badge-rejete': s === 'Rejete'
    };
  }

  currentMonth() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
  }
}