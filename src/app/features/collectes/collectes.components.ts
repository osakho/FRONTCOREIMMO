// ══════════════════════════════════════════════════════════════
//  COLLECTE SAISIE (Collecteur)
// ══════════════════════════════════════════════════════════════
import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import {
  CollectesService, ContratsLocationService, AuthService
} from '../../../core/services/api.services';
import {
  CollecteDto, ContratLocationListItemDto, PagedList,
  StatutCollecte, ModePaiement, StatutContrat
} from '../../../core/models/models';

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

// ══════════════════════════════════════════════════════════════
//  COLLECTES LIST
// ══════════════════════════════════════════════════════════════
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

// ══════════════════════════════════════════════════════════════
//  BORDEREAU DE VERSEMENT
// ══════════════════════════════════════════════════════════════
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

// ══════════════════════════════════════════════════════════════
//  RAPPORT COLLECTEUR
// ══════════════════════════════════════════════════════════════
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