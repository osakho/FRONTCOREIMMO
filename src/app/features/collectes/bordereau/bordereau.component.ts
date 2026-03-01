import { Component, inject, OnInit } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { CollectesService } from '../../../core/services/api.services';
import { CollecteDto, StatutCollecte } from '../../../core/models/models';

@Component({
  selector: 'kdi-bordereau',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, DecimalPipe],
  template: `
    <div class="page">
      <div class="page-header">
        <div>
          <h2 class="page-title">Créer un bordereau</h2>
          <p class="page-subtitle">Versement hebdomadaire à la banque</p>
        </div>
        <a routerLink="/collectes" class="btn btn-secondary">← Retour</a>
      </div>

      <!-- Résumé semaine -->
      <div class="semaine-card">
        <div class="semaine-info">
          <span class="semaine-label">Semaine courante</span>
          <span class="semaine-val">S{{ semaineCourante }} / {{ anneeCourante }}</span>
        </div>
        <div class="semaine-info">
          <span class="semaine-label">Collectes non versées</span>
          <span class="semaine-val">{{ collectesNonVersees.length }}</span>
        </div>
        <div class="semaine-info">
          <span class="semaine-label">Montant total</span>
          <span class="semaine-val montant">{{ totalAVerser | number:'1.0-0' }} MRU</span>
        </div>
      </div>

      <!-- Collectes incluses -->
      <div class="form-card" *ngIf="collectesNonVersees.length">
        <h3 class="form-card-title">Collectes à inclure ({{ collectesNonVersees.length }})</h3>
        <table class="data-table">
          <thead><tr><th>Locataire</th><th>Produit</th><th>Période</th><th class="text-right">Montant</th></tr></thead>
          <tbody>
            <tr *ngFor="let c of collectesNonVersees">
              <td>{{ c.locataireNom }}</td>
              <td><span class="code-badge">{{ c.produitCode }}</span></td>
              <td>{{ c.periodeMois }}</td>
              <td class="text-right font-bold">{{ c.montantEncaisse | number:'1.0-0' }} MRU</td>
            </tr>
            <tr class="total-row">
              <td colspan="3"><strong>TOTAL</strong></td>
              <td class="text-right"><strong>{{ totalAVerser | number:'1.0-0' }} MRU</strong></td>
            </tr>
          </tbody>
        </table>
      </div>

      <form [formGroup]="form" (ngSubmit)="submit()" *ngIf="collectesNonVersees.length">
        <div class="form-card">
          <h3 class="form-card-title">Informations du versement</h3>
          <div class="form-grid-2">
            <div class="form-group">
              <label>Date du versement *</label>
              <input formControlName="dateVersement" type="date" class="form-control">
            </div>
            <div class="form-group">
              <label>Mode de versement *</label>
              <select formControlName="mode" class="form-control">
                <option value="VirementBancaire">Virement bancaire</option>
                <option value="Especes">Espèces</option>
                <option value="Cheque">Chèque</option>
              </select>
            </div>
            <div class="form-group">
              <label>Banque destinataire</label>
              <input formControlName="banqueDestination" class="form-control" placeholder="BMCI, SGM…">
            </div>
            <div class="form-group">
              <label>Référence virement</label>
              <input formControlName="referenceVirement" class="form-control" placeholder="VIR-2026-001">
            </div>
          </div>
        </div>

        <div class="form-actions">
          <a routerLink="/collectes" class="btn btn-secondary">Annuler</a>
          <button type="submit" class="btn btn-primary" [disabled]="form.invalid || submitting">
            <span *ngIf="submitting" class="btn-spinner"></span>
            {{ submitting ? 'Création…' : '📋 Créer le bordereau (' + (totalAVerser | number:'1.0-0') + ' MRU)' }}
          </button>
        </div>
      </form>

      <div class="empty-state" *ngIf="!collectesNonVersees.length">
        <span class="empty-icon">✅</span>
        <p>Toutes les collectes de cette semaine ont déjà été incluses dans un bordereau.</p>
        <a routerLink="/collectes/saisir" class="btn btn-primary">Saisir une collecte</a>
      </div>
    </div>
  `,
  styles: [`
    .page { max-width: 900px; margin: 0 auto; }
    .page-header { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 24px; }
    .page-title { font-size: 24px; font-weight: 700; color: #0c1a35; margin: 0 0 4px; }
    .page-subtitle { font-size: 14px; color: #64748b; margin: 0; }
    .btn { padding: 9px 18px; border-radius: 8px; font-size: 14px; font-weight: 500; cursor: pointer; border: none; text-decoration: none; display: inline-flex; align-items: center; gap: 6px; }
    .btn-primary { background: #0c1a35; color: #fff; } .btn-primary:disabled { opacity: .5; cursor: not-allowed; }
    .btn-secondary { background: #fff; color: #334155; border: 1px solid #e2e8f0; }
    .semaine-card { display: flex; gap: 24px; background: linear-gradient(135deg, #0c1a35, #1a3060); border-radius: 12px; padding: 24px; margin-bottom: 24px; color: #fff; }
    .semaine-info { display: flex; flex-direction: column; gap: 4px; }
    .semaine-label { font-size: 12px; color: rgba(255,255,255,.6); }
    .semaine-val { font-size: 22px; font-weight: 700; }
    .semaine-val.montant { color: #c8a96e; }
    .form-card { background: #fff; border-radius: 12px; padding: 24px; margin-bottom: 16px; box-shadow: 0 1px 3px rgba(0,0,0,.06); }
    .form-card-title { font-size: 16px; font-weight: 600; color: #0c1a35; margin: 0 0 20px; padding-bottom: 12px; border-bottom: 1px solid #f1f5f9; }
    .data-table { width: 100%; border-collapse: collapse; }
    .data-table th { padding: 10px 14px; background: #f8fafc; font-size: 12px; color: #64748b; text-align: left; border-bottom: 1px solid #e2e8f0; }
    .data-table td { padding: 10px 14px; font-size: 13px; border-bottom: 1px solid #f1f5f9; }
    .total-row td { background: #f0f9ff; font-weight: 700; }
    .text-right { text-align: right; }
    .font-bold { font-weight: 600; }
    .code-badge { background: #e0e7ef; color: #0c1a35; padding: 2px 8px; border-radius: 6px; font-family: monospace; font-size: 12px; }
    .form-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .form-group { display: flex; flex-direction: column; gap: 6px; }
    label { font-size: 13px; font-weight: 500; color: #374151; }
    .form-control { padding: 9px 12px; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 14px; }
    .form-actions { display: flex; justify-content: flex-end; gap: 12px; }
    .btn-spinner { width: 14px; height: 14px; border: 2px solid rgba(255,255,255,.3); border-top-color: #fff; border-radius: 50%; animation: spin .7s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .empty-state { display: flex; flex-direction: column; align-items: center; padding: 60px; gap: 12px; color: #94a3b8; text-align: center; }
    .empty-icon { font-size: 48px; }
  `]
})
export class BordereauComponent implements OnInit {
  private fb   = inject(FormBuilder);
  private svc  = inject(CollectesService);
  private router = inject(Router);

  collectesNonVersees: CollecteDto[] = [];
  submitting = false;

  semaineCourante = this.getWeekNumber(new Date());
  anneeCourante   = new Date().getFullYear();

  get totalAVerser() { return this.collectesNonVersees.reduce((s, c) => s + c.montantEncaisse, 0); }

  form = this.fb.group({
    dateVersement:     [new Date().toISOString().substring(0,10), Validators.required],
    mode:              ['VirementBancaire', Validators.required],
    banqueDestination: [''],
    referenceVirement: ['']
  });

  ngOnInit() {
    this.svc.getAll({ statut: StatutCollecte.Saisie, semaine: this.semaineCourante })
      .subscribe(r => this.collectesNonVersees = r.items);
  }

  getWeekNumber(d: Date): number {
    const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
    return Math.ceil((((date as any) - (yearStart as any)) / 86400000 + 1) / 7);
  }

  submit() {
    if (this.form.invalid) return;
    this.submitting = true;
    const payload = {
      ...this.form.value,
      numeroSemaine: this.semaineCourante,
      anneeSemaine:  this.anneeCourante
    };
    this.svc.creerBordereau(payload).subscribe({
      next: () => this.router.navigate(['/collectes']),
      error: () => { this.submitting = false; }
    });
  }
}