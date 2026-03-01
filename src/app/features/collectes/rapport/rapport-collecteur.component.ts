import { Component, inject } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CollectesService, AuthService } from '../../../core/services/api.services';

@Component({
  selector: 'kdi-rapport-collecteur',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, DecimalPipe],
  template: `
    <div class="page">
      <div class="page-header">
        <div>
          <h2 class="page-title">Rapport collecteur</h2>
          <p class="page-subtitle">Bilan hebdomadaire — locataires payés / en retard</p>
        </div>
        <a routerLink="/collectes" class="btn btn-secondary">← Retour</a>
      </div>

      <!-- Sélecteur semaine -->
      <div class="selector-bar">
        <div class="form-group">
          <label>Semaine</label>
          <input type="number" class="form-control-sm" [(ngModel)]="semaine" min="1" max="53">
        </div>
        <div class="form-group">
          <label>Année</label>
          <input type="number" class="form-control-sm" [(ngModel)]="annee" min="2024" max="2030">
        </div>
        <button class="btn btn-primary" (click)="load()">Afficher</button>
      </div>

      <ng-container *ngIf="rapport">
        <!-- En-tête rapport -->
        <div class="rapport-header">
          <div class="rh-item">
            <span class="rh-label">Collecteur</span>
            <span class="rh-val">{{ rapport.collecteurNom }}</span>
          </div>
          <div class="rh-item">
            <span class="rh-label">Semaine</span>
            <span class="rh-val">S{{ rapport.semaine }} / {{ rapport.annee }}</span>
          </div>
          <div class="rh-item green">
            <span class="rh-label">Payés</span>
            <span class="rh-val">{{ rapport.lignesPayees.length }}</span>
          </div>
          <div class="rh-item red">
            <span class="rh-label">Non payés</span>
            <span class="rh-val">{{ rapport.lignesNonPayees.length }}</span>
          </div>
          <div class="rh-item gold">
            <span class="rh-label">Total collecté</span>
            <span class="rh-val">{{ rapport.totalCollecte | number:'1.0-0' }} MRU</span>
          </div>
        </div>

        <!-- Payés -->
        <div class="section-title green-title">✅ Locataires ayant payé ({{ rapport.lignesPayees.length }})</div>
        <div class="rapport-table" *ngIf="rapport.lignesPayees.length">
          <table class="data-table">
            <thead><tr><th>Propriété</th><th>Produit</th><th>Locataire</th><th>Téléphone</th><th>Période</th><th class="text-right">Encaissé</th></tr></thead>
            <tbody>
              <tr *ngFor="let l of rapport.lignesPayees" [class.rattrapage]="l.estRattrapage">
                <td>{{ l.proprieteLibelle }}</td>
                <td><span class="code-badge">{{ l.produitCode }}</span></td>
                <td>{{ l.locataireNom }}</td>
                <td class="text-muted">{{ l.locataireTel }}</td>
                <td>{{ l.periodeMois }}<span class="rattrapage-badge" *ngIf="l.estRattrapage">Rattrapage</span></td>
                <td class="text-right font-bold">{{ l.montantEncaisse | number:'1.0-0' }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Non payés -->
        <div class="section-title red-title">⚠️ Locataires en retard ({{ rapport.lignesNonPayees.length }})</div>
        <div class="rapport-table" *ngIf="rapport.lignesNonPayees.length">
          <table class="data-table">
            <thead><tr><th>Propriété</th><th>Produit</th><th>Locataire</th><th>Téléphone</th><th>Période</th><th class="text-right">Attendu</th></tr></thead>
            <tbody>
              <tr *ngFor="let l of rapport.lignesNonPayees" class="row-retard">
                <td>{{ l.proprieteLibelle }}</td>
                <td><span class="code-badge">{{ l.produitCode }}</span></td>
                <td><strong>{{ l.locataireNom }}</strong></td>
                <td class="text-muted">{{ l.locataireTel }}</td>
                <td>{{ l.periodeMois }}</td>
                <td class="text-right font-bold text-danger">{{ l.montantAttendu | number:'1.0-0' }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="empty-mini" *ngIf="!rapport.lignesNonPayees.length">
          <span>🎉 Aucun retard cette semaine !</span>
        </div>
      </ng-container>
    </div>
  `,
  styles: [`
    .page { max-width: 1200px; margin: 0 auto; }
    .page-header { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 24px; }
    .page-title { font-size: 24px; font-weight: 700; color: #0c1a35; margin: 0 0 4px; }
    .page-subtitle { font-size: 14px; color: #64748b; margin: 0; }
    .btn { padding: 9px 18px; border-radius: 8px; font-size: 14px; font-weight: 500; cursor: pointer; border: none; text-decoration: none; display: inline-flex; align-items: center; gap: 6px; }
    .btn-primary { background: #0c1a35; color: #fff; }
    .btn-secondary { background: #fff; color: #334155; border: 1px solid #e2e8f0; }
    .selector-bar { display: flex; align-items: flex-end; gap: 16px; background: #fff; border-radius: 10px; padding: 16px 20px; margin-bottom: 24px; box-shadow: 0 1px 3px rgba(0,0,0,.06); }
    .form-group { display: flex; flex-direction: column; gap: 6px; }
    label { font-size: 13px; font-weight: 500; color: #374151; }
    .form-control-sm { padding: 8px 12px; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 14px; width: 100px; }
    .rapport-header { display: flex; gap: 20px; background: #fff; border-radius: 12px; padding: 20px 24px; margin-bottom: 24px; box-shadow: 0 1px 3px rgba(0,0,0,.06); }
    .rh-item { display: flex; flex-direction: column; gap: 4px; padding: 0 20px; border-right: 1px solid #f1f5f9; }
    .rh-item:last-child { border: none; }
    .rh-label { font-size: 12px; color: #64748b; }
    .rh-val { font-size: 20px; font-weight: 700; color: #0c1a35; }
    .rh-item.green .rh-val { color: #059669; }
    .rh-item.red .rh-val { color: #dc2626; }
    .rh-item.gold .rh-val { color: #c8a96e; }
    .section-title { font-size: 15px; font-weight: 600; margin: 20px 0 10px; }
    .green-title { color: #059669; }
    .red-title { color: #dc2626; }
    .rapport-table { background: #fff; border-radius: 10px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,.06); margin-bottom: 20px; }
    .data-table { width: 100%; border-collapse: collapse; }
    .data-table th { padding: 10px 14px; background: #f8fafc; font-size: 12px; color: #64748b; text-align: left; border-bottom: 1px solid #e2e8f0; }
    .data-table td { padding: 10px 14px; font-size: 13px; border-bottom: 1px solid #f1f5f9; }
    .data-table tr:last-child td { border-bottom: none; }
    .row-retard td { background: #fff7f7; }
    .rattrapage td { background: #fffbeb; }
    .text-right { text-align: right; }
    .text-muted { color: #94a3b8; }
    .font-bold { font-weight: 600; }
    .text-danger { color: #dc2626; }
    .code-badge { background: #e0e7ef; color: #0c1a35; padding: 2px 8px; border-radius: 6px; font-family: monospace; font-size: 12px; }
    .rattrapage-badge { background: #fef3c7; color: #92400e; padding: 1px 6px; border-radius: 8px; font-size: 10px; margin-left: 6px; }
    .empty-mini { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px; text-align: center; color: #065f46; font-size: 14px; }
  `]
})
export class RapportCollecteurComponent {
  private svc  = inject(CollectesService);
  private auth = inject(AuthService);

  rapport: any = null;
  semaine = this.getWeekNumber(new Date());
  annee   = new Date().getFullYear();

  load() {
    const user = this.auth.getUser();
    if (!user?.id) return;
    this.svc.getRapportCollecteur(user.id, this.semaine, this.annee)
      .subscribe(r => this.rapport = r);
  }

  getWeekNumber(d: Date): number {
    const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
    return Math.ceil((((date as any) - (yearStart as any)) / 86400000 + 1) / 7);
  }
}