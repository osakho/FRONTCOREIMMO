import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { CollectesService, ContratsLocationService, AuthService } from '../../../core/services/api.services';
import { CollecteDto, ContratLocationListItemDto, PagedList, StatutCollecte, StatutContrat } from '../../../core/models/models';

@Component({
  selector: 'kdi-collecte-saisie',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <div class="page">
      <div class="page-header">
        <div>
          <h2 class="page-title">Saisir une collecte</h2>
          <p class="page-subtitle">Enregistrement d'un encaissement de loyer</p>
        </div>
        <a routerLink="/collectes" class="btn btn-secondary">← Retour</a>
      </div>

      <form [formGroup]="form" (ngSubmit)="submit()">
        <div class="form-card">
          <h3 class="form-card-title">Contrat de location</h3>

          <!-- Recherche du contrat -->
          <div class="form-group">
            <label>Rechercher un locataire / produit *</label>
            <input type="text" class="form-control" placeholder="🔍 Nom locataire, code produit…"
                   [value]="recherche" (input)="onRecherche($event)">
          </div>

          <!-- Résultats -->
          <div class="contrats-liste" *ngIf="contratsRecherche.length && !contratSelectionne">
            <div *ngFor="let c of contratsRecherche" class="contrat-item" (click)="selectContrat(c)">
              <div class="ci-main">{{ c.locataireNom }}</div>
              <div class="ci-info">{{ c.produitCode }} — {{ c.loyer | number:'1.0-0' }} MRU/mois</div>
              <span class="badge" [class.badge-retard]="c.estEnRetard" [class.badge-ok]="!c.estEnRetard">
                {{ c.estEnRetard ? '⚠️ En retard' : '✅ OK' }}
              </span>
            </div>
          </div>

          <!-- Contrat sélectionné -->
          <div class="contrat-selected" *ngIf="contratSelectionne">
            <div class="cs-info">
              <strong>{{ contratSelectionne.locataireNom }}</strong>
              — {{ contratSelectionne.produitCode }}
              — Loyer attendu : <strong>{{ contratSelectionne.loyer | number:'1.0-0' }} MRU</strong>
              <span class="badge-retard-pill" *ngIf="contratSelectionne.estEnRetard">⚠️ En retard</span>
            </div>
            <button type="button" class="btn-clear" (click)="clearContrat()">✕ Changer</button>
          </div>
        </div>

        <div class="form-card" *ngIf="contratSelectionne">
          <h3 class="form-card-title">Détails du paiement</h3>
          <div class="form-grid-2">
            <div class="form-group">
              <label>Période (mois) *</label>
              <input formControlName="periodeMois" type="month" class="form-control">
            </div>
            <div class="form-group">
              <label>Montant encaissé (MRU) *</label>
              <input formControlName="montantEncaisse" type="number" class="form-control"
                     [placeholder]="contratSelectionne.loyer.toString()">
            </div>
            <div class="form-group">
              <label>Mode de paiement *</label>
              <select formControlName="modePaiement" class="form-control">
                <option value="Especes">💵 Espèces</option>
                <option value="Bankily">📱 Bankily</option>
                <option value="Masrvi">📱 Masrvi</option>
                <option value="Bimbank">📱 Bimbank</option>
                <option value="Click">📱 Click</option>
                <option value="VirementBancaire">🏦 Virement bancaire</option>
                <option value="Cheque">📋 Chèque</option>
              </select>
            </div>
            <div class="form-group">
              <label>Référence / N° transaction</label>
              <input formControlName="reference" class="form-control" placeholder="TXN-20260219-001">
            </div>
            <div class="form-group form-group-full">
              <label>Commentaire</label>
              <textarea formControlName="commentaire" class="form-control" rows="2"
                        placeholder="Observations, retard justifié…"></textarea>
            </div>
          </div>

          <!-- Récap -->
          <div class="recalc-bar" *ngIf="ecart !== null">
            <div class="recalc-item">
              <span class="ri-label">Attendu</span>
              <span class="ri-val">{{ contratSelectionne.loyer | number:'1.0-0' }} MRU</span>
            </div>
            <div class="recalc-item">
              <span class="ri-label">Encaissé</span>
              <span class="ri-val">{{ form.get('montantEncaisse')?.value | number:'1.0-0' }} MRU</span>
            </div>
            <div class="recalc-item" [class.ecart-neg]="ecart < 0" [class.ecart-pos]="ecart >= 0">
              <span class="ri-label">Écart</span>
              <span class="ri-val">{{ ecart > 0 ? '+' : '' }}{{ ecart | number:'1.0-0' }} MRU</span>
            </div>
          </div>
        </div>

        <div class="form-actions" *ngIf="contratSelectionne">
          <a routerLink="/collectes" class="btn btn-secondary">Annuler</a>
          <button type="submit" class="btn btn-primary" [disabled]="form.invalid || submitting">
            <span *ngIf="submitting" class="btn-spinner"></span>
            {{ submitting ? 'Enregistrement…' : '💰 Enregistrer la collecte' }}
          </button>
        </div>
      </form>
    </div>
  `,
  styles: [`
    .page { max-width: 800px; margin: 0 auto; }
    .page-header { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 24px; }
    .page-title { font-size: 24px; font-weight: 700; color: #0c1a35; margin: 0 0 4px; }
    .page-subtitle { font-size: 14px; color: #64748b; margin: 0; }
    .btn { padding: 9px 18px; border-radius: 8px; font-size: 14px; font-weight: 500; cursor: pointer; border: none; text-decoration: none; display: inline-flex; align-items: center; gap: 6px; }
    .btn-primary { background: #0c1a35; color: #fff; } .btn-primary:hover { background: #1a2d52; }
    .btn-primary:disabled { opacity: .5; cursor: not-allowed; }
    .btn-secondary { background: #fff; color: #334155; border: 1px solid #e2e8f0; }
    .form-card { background: #fff; border-radius: 12px; padding: 24px; margin-bottom: 16px; box-shadow: 0 1px 3px rgba(0,0,0,.06); }
    .form-card-title { font-size: 16px; font-weight: 600; color: #0c1a35; margin: 0 0 20px; padding-bottom: 12px; border-bottom: 1px solid #f1f5f9; }
    .form-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .form-group { display: flex; flex-direction: column; gap: 6px; }
    .form-group-full { grid-column: 1/-1; }
    label { font-size: 13px; font-weight: 500; color: #374151; }
    .form-control { padding: 9px 12px; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 14px; }
    .form-control:focus { outline: none; border-color: #0c1a35; box-shadow: 0 0 0 3px rgba(12,26,53,.08); }
    .form-actions { display: flex; justify-content: flex-end; gap: 12px; }
    .btn-spinner { width: 14px; height: 14px; border: 2px solid rgba(255,255,255,.3); border-top-color: #fff; border-radius: 50%; animation: spin .7s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }

    .contrats-liste { border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; margin-top: 8px; }
    .contrat-item { display: flex; align-items: center; gap: 12px; padding: 12px 16px; cursor: pointer; border-bottom: 1px solid #f1f5f9; transition: background .1s; }
    .contrat-item:last-child { border-bottom: none; }
    .contrat-item:hover { background: #f8fafc; }
    .ci-main { font-weight: 500; color: #0c1a35; flex: 1; }
    .ci-info { font-size: 13px; color: #64748b; }
    .badge { padding: 3px 10px; border-radius: 12px; font-size: 12px; }
    .badge-retard { background: #fee2e2; color: #991b1b; }
    .badge-ok { background: #d1fae5; color: #065f46; }

    .contrat-selected { display: flex; align-items: center; justify-content: space-between; background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; padding: 12px 16px; margin-top: 8px; }
    .cs-info { font-size: 14px; color: #0c4a6e; }
    .badge-retard-pill { background: #fee2e2; color: #991b1b; padding: 2px 8px; border-radius: 10px; font-size: 12px; margin-left: 8px; }
    .btn-clear { background: none; border: none; color: #64748b; cursor: pointer; font-size: 13px; }

    .recalc-bar { display: flex; gap: 24px; background: #f8fafc; border-radius: 8px; padding: 16px; margin-top: 16px; }
    .recalc-item { display: flex; flex-direction: column; gap: 4px; }
    .ri-label { font-size: 12px; color: #64748b; }
    .ri-val { font-size: 18px; font-weight: 700; color: #0c1a35; }
    .ecart-neg .ri-val { color: #dc2626; }
    .ecart-pos .ri-val { color: #059669; }
  `]
})
export class CollecteSaisieComponent implements OnInit {
  private fb       = inject(FormBuilder);
  private svc      = inject(CollectesService);
  private contratSvc = inject(ContratsLocationService);
  private router   = inject(Router);

  form = this.fb.group({
    periodeMois:      [this.currentMonth(), Validators.required],
    montantEncaisse:  [null as number | null, [Validators.required, Validators.min(0)]],
    modePaiement:     ['Especes', Validators.required],
    reference:        [''],
    commentaire:      ['']
  });

  contratSelectionne: ContratLocationListItemDto | null = null;
  contratsRecherche: ContratLocationListItemDto[] = [];
  recherche = '';
  submitting = false;
  ecart: number | null = null;
  timer: any;

  ngOnInit() {
    this.form.get('montantEncaisse')?.valueChanges.subscribe(v => {
      if (this.contratSelectionne && v != null)
        this.ecart = v - this.contratSelectionne.loyer;
      else this.ecart = null;
    });
  }

  onRecherche(e: Event) {
    const val = (e.target as HTMLInputElement).value;
    this.recherche = val;
    clearTimeout(this.timer);
    if (val.length < 2) { this.contratsRecherche = []; return; }
    this.timer = setTimeout(() => {
      this.contratSvc.getAll({ statut: StatutContrat.Actif, search: val })
        .subscribe(r => this.contratsRecherche = r.items);
    }, 350);
  }

  selectContrat(c: ContratLocationListItemDto) {
    this.contratSelectionne = c;
    this.contratsRecherche  = [];
    this.form.patchValue({ montantEncaisse: c.loyer });
  }

  clearContrat() { this.contratSelectionne = null; this.recherche = ''; }

  currentMonth() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
  }

  submit() {
    if (this.form.invalid || !this.contratSelectionne) return;
    this.submitting = true;
    const payload = { contratLocationId: this.contratSelectionne.id, ...this.form.value };
    this.svc.saisir(payload).subscribe({
      next: () => this.router.navigate(['/collectes']),
      error: () => { this.submitting = false; }
    });
  }
}