import { Component, inject, OnInit } from '@angular/core';
import { CommonModule, DatePipe, DecimalPipe } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ChantiersService }                     from '../../../core/services/api.services';
import { ChantierListItemDto, ChantierDto, StatutChantier } from '../../../core/models/models';

@Component({
  selector: 'kdi-chantiers',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, DatePipe, DecimalPipe],
  template: `
<div class="page">

  <!-- ── Header ── -->
  <div class="page-header">
    <div>
      <h2 class="page-title">Suivi de Chantiers</h2>
      <p class="page-subtitle">Pilotage des travaux en cours et historique des interventions</p>
    </div>
    <div class="header-actions">
      <button class="btn btn-secondary">📊 Rapport chantier</button>
      <button class="btn btn-primary" (click)="openForm()">＋ Nouveau chantier</button>
    </div>
  </div>

  <!-- ── KPIs ── -->
  <div class="kpi-grid">
    <div class="kpi-card kpi-gold">
      <div class="kpi-icon">🏗️</div>
      <div class="kpi-label">Chantiers actifs</div>
      <div class="kpi-value">{{ nbActifs }}</div>
    </div>
    <div class="kpi-card kpi-green">
      <div class="kpi-icon">🎯</div>
      <div class="kpi-label">Terminés (90j)</div>
      <div class="kpi-value">{{ nbTermines }}</div>
    </div>
    <div class="kpi-card kpi-blue">
      <div class="kpi-icon">💵</div>
      <div class="kpi-label">Budget engagé</div>
      <div class="kpi-value" style="font-size:18px">{{ budgetTotal | number:'1.0-0' }}</div>
    </div>
    <div class="kpi-card kpi-red">
      <div class="kpi-icon">⚠️</div>
      <div class="kpi-label">Hors délai</div>
      <div class="kpi-value">{{ nbRetard }}</div>
    </div>
  </div>

  <!-- ── Filtres ── -->
  <div class="filters-bar">
    <div class="tab-group">
      <button class="tab-btn" [class.active]="filtreStatut === ''"         (click)="setStatut('')">Tous</button>
      <button class="tab-btn" [class.active]="filtreStatut === 'EnCours'"  (click)="setStatut('EnCours')">🔵 En cours</button>
      <button class="tab-btn" [class.active]="filtreStatut === 'Planifie'" (click)="setStatut('Planifie')">📅 Planifiés</button>
      <button class="tab-btn" [class.active]="filtreStatut === 'Termine'"  (click)="setStatut('Termine')">✅ Terminés</button>
    </div>
  </div>

  <!-- ── Grille chantiers ── -->
  <div class="chantiers-grid" *ngIf="filtered.length; else empty">
    <div class="chantier-card" *ngFor="let c of filtered" (click)="voirChantier(c)">
      <div class="card-top">
        <div>
          <div class="chantier-titre">{{ c.intitule }}</div>
          <div class="chantier-adresse">📍 {{ c.proprieteAdresse }}</div>
        </div>
        <span class="badge" [ngClass]="statutClass(c.statut)">{{ c.statutLabel }}</span>
      </div>

      <div class="progress-section">
        <div class="progress-meta">
          <span class="text-muted small">Avancement</span>
          <span class="font-bold" [class.text-danger]="c.joursDepassement > 0">{{ c.avancement }}%</span>
        </div>
        <div class="progress-bar">
          <div class="progress-fill" [style.width.%]="c.avancement" [ngClass]="progressClass(c)"></div>
        </div>
      </div>

      <div class="chantier-stats">
        <div class="stat">
          <div class="stat-val text-gold">{{ c.budget | number:'1.0-0' }}</div>
          <div class="stat-lbl">Budget MRU</div>
        </div>
        <div class="stat">
          <div class="stat-val" [class.text-danger]="c.joursDepassement > 0" [class.text-blue]="c.joursRestants > 0">
            {{ c.joursDepassement > 0 ? '-' + c.joursDepassement + 'j' : c.joursRestants + 'j' }}
          </div>
          <div class="stat-lbl">{{ c.joursDepassement > 0 ? 'Dépassement' : 'Restants' }}</div>
        </div>
        <div class="stat">
          <div class="stat-val" [class.text-green]="c.nbEtapesOk === c.nbEtapesTotal">{{ c.nbEtapesOk }}/{{ c.nbEtapesTotal }}</div>
          <div class="stat-lbl">Étapes OK</div>
        </div>
      </div>

      <div class="card-footer">
        <span class="text-muted small">🏢 {{ c.entrepreneur }}</span>
        <button class="btn btn-secondary btn-sm" (click)="$event.stopPropagation(); voirChantier(c)">Détail →</button>
      </div>
    </div>
  </div>

  <ng-template #empty>
    <div class="empty-state">
      <span class="empty-icon">🏗️</span>
      <p>Aucun chantier trouvé</p>
      <button class="btn btn-primary" (click)="openForm()">Créer le premier chantier</button>
    </div>
  </ng-template>

  <!-- ── Modal Détail Chantier ── -->
  <div class="modal-overlay" *ngIf="selectedChantier" (click)="selectedChantier = null">
    <div class="modal modal-lg" (click)="$event.stopPropagation()">
      <div class="modal-header">
        <div class="modal-title">🏗️ {{ selectedChantier.intitule }}</div>
        <button class="modal-close" (click)="selectedChantier = null">×</button>
      </div>
      <div class="modal-body">
        <div class="detail-top">
          <div class="progress-section" style="flex:1">
            <div class="progress-meta">
              <span class="font-bold">Avancement global</span>
              <span class="font-bold text-gold">{{ selectedChantier.avancement }}%</span>
            </div>
            <div class="progress-bar progress-bar-lg">
              <div class="progress-fill" [style.width.%]="selectedChantier.avancement" [ngClass]="progressClass(selectedChantier)"></div>
            </div>
          </div>
          <span class="badge" [ngClass]="statutClass(selectedChantier.statut)">{{ selectedChantier.statutLabel }}</span>
        </div>

        <div class="detail-kpis">
          <div class="d-kpi"><div class="d-kpi-val text-gold">{{ selectedChantier.budget | number:'1.0-0' }}</div><div class="d-kpi-lbl">Budget MRU</div></div>
          <div class="d-kpi"><div class="d-kpi-val text-blue">{{ selectedChantier.joursRestants }}j</div><div class="d-kpi-lbl">Jours restants</div></div>
          <div class="d-kpi"><div class="d-kpi-val text-green">{{ countDone(selectedChantier.etapes) }}/{{ selectedChantier.etapes.length }}</div><div class="d-kpi-lbl">Étapes OK</div></div>
        </div>

        <div class="etapes-section">
          <div class="section-label">Étapes du chantier</div>
          <div class="etape-item" *ngFor="let e of selectedChantier.etapes" [ngClass]="etapeClass(e.statut)">
            <div class="etape-icon">
              <span *ngIf="e.statut === 'Terminee'">✅</span>
              <span *ngIf="e.statut === 'EnCours'">🔄</span>
              <span *ngIf="e.statut === 'AouvFaire'">⬜</span>
            </div>
            <div class="etape-body">
              <div class="etape-titre">{{ e.titre }}</div>
              <div class="etape-dates text-muted small" *ngIf="e.dateDebut">
                {{ e.dateDebut | date:'dd/MM' }} — {{ e.dateFin | date:'dd/MM' }}
              </div>
            </div>
            <button class="btn btn-secondary btn-sm" *ngIf="e.statut === 'EnCours'" (click)="validerEtape(e.id)">✔ Valider</button>
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" (click)="selectedChantier = null">Fermer</button>
        <button class="btn btn-primary" *ngIf="selectedChantier.statut === 'EnCours'" (click)="cloture()">🎯 Clôturer chantier</button>
      </div>
    </div>
  </div>

  <!-- ── Modal Nouveau Chantier ── -->
  <div class="modal-overlay" *ngIf="showForm" (click)="closeForm()">
    <div class="modal" (click)="$event.stopPropagation()">
      <div class="modal-header">
        <div class="modal-title">🏗️ Nouveau chantier</div>
        <button class="modal-close" (click)="closeForm()">×</button>
      </div>
      <form [formGroup]="form" (ngSubmit)="submit()">
        <div class="modal-body">
          <div class="form-row">
            <div class="form-group">
              <label>Intitulé *</label>
              <input formControlName="intitule" class="form-control" placeholder="Ex: Réfection toiture">
            </div>
            <div class="form-group">
              <label>Propriété *</label>
              <input formControlName="proprieteTitre" class="form-control" placeholder="Nom de la propriété">
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Entrepreneur *</label>
              <input formControlName="entrepreneur" class="form-control" placeholder="Nom entreprise">
            </div>
            <div class="form-group">
              <label>Budget (MRU)</label>
              <input formControlName="budget" type="number" class="form-control" placeholder="0">
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Date début *</label>
              <input formControlName="dateDebut" type="date" class="form-control">
            </div>
            <div class="form-group">
              <label>Date fin prévisionnelle *</label>
              <input formControlName="dateFinPrevue" type="date" class="form-control">
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" (click)="closeForm()">Annuler</button>
          <button type="submit" class="btn btn-primary" [disabled]="form.invalid || submitting">
            {{ submitting ? 'Création…' : '🏗️ Créer chantier' }}
          </button>
        </div>
      </form>
    </div>
  </div>

</div>
  `,
  styles: [`
    .page { max-width: 1200px; margin: 0 auto; }
    .page-header { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 24px; }
    .page-title { font-size: 24px; font-weight: 700; color: #0c1a35; margin: 0 0 4px; }
    .page-subtitle { font-size: 14px; color: #64748b; margin: 0; }
    .header-actions { display: flex; gap: 8px; }
    .btn { padding: 9px 18px; border-radius: 8px; font-size: 14px; font-weight: 500; cursor: pointer; border: none; display: inline-flex; align-items: center; gap: 6px; transition: opacity .2s; }
    .btn:disabled { opacity:.5; cursor:not-allowed; }
    .btn-primary { background: #0c1a35; color: #fff; }
    .btn-secondary { background: #fff; color: #334155; border: 1px solid #e2e8f0; }
    .btn-sm { padding: 5px 10px; font-size: 12px; }

    .kpi-grid { display: grid; grid-template-columns: repeat(4,1fr); gap: 16px; margin-bottom: 24px; }
    .kpi-card { background: #fff; border-radius: 12px; padding: 20px; box-shadow: 0 1px 4px rgba(0,0,0,.06); border-left: 4px solid #e2e8f0; }
    .kpi-gold { border-left-color: #c8a96e; } .kpi-green { border-left-color: #22c55e; }
    .kpi-blue { border-left-color: #3b82f6; } .kpi-red { border-left-color: #ef4444; }
    .kpi-icon { font-size: 20px; margin-bottom: 6px; } .kpi-label { font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #64748b; margin-bottom: 4px; }
    .kpi-value { font-size: 28px; font-weight: 700; color: #0c1a35; }

    .filters-bar { display: flex; gap: 12px; margin-bottom: 20px; }
    .tab-group { display: flex; background: #f1f5f9; border-radius: 8px; padding: 3px; }
    .tab-btn { padding: 6px 14px; border-radius: 6px; border: none; background: none; cursor: pointer; font-size: 13px; color: #64748b; transition: all .15s; }
    .tab-btn.active { background: #fff; color: #0c1a35; font-weight: 600; box-shadow: 0 1px 3px rgba(0,0,0,.1); }

    .chantiers-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 16px; }
    .chantier-card { background: #fff; border-radius: 12px; padding: 18px; box-shadow: 0 1px 4px rgba(0,0,0,.06); border: 1px solid #e2e8f0; cursor: pointer; transition: all .2s; }
    .chantier-card:hover { border-color: #c8a96e; transform: translateY(-1px); box-shadow: 0 4px 16px rgba(0,0,0,.08); }
    .card-top { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 14px; gap: 8px; }
    .chantier-titre { font-size: 13px; font-weight: 700; color: #0c1a35; margin-bottom: 3px; }
    .chantier-adresse { font-size: 11px; color: #94a3b8; }

    .progress-section { margin-bottom: 14px; }
    .progress-meta { display: flex; justify-content: space-between; margin-bottom: 5px; }
    .progress-bar { height: 6px; background: #f1f5f9; border-radius: 3px; overflow: hidden; }
    .progress-bar-lg { height: 10px; }
    .progress-fill { height: 100%; border-radius: 3px; transition: width .4s ease; }
    .fill-gold { background: linear-gradient(90deg, #c8a96e, #e8c97a); }
    .fill-green { background: #22c55e; }
    .fill-red { background: #ef4444; }
    .fill-blue { background: #3b82f6; }

    .chantier-stats { display: flex; gap: 12px; margin-bottom: 14px; }
    .stat { flex: 1; text-align: center; background: #f8fafc; border-radius: 8px; padding: 8px 4px; }
    .stat-val { font-size: 16px; font-weight: 700; color: #0c1a35; }
    .stat-lbl { font-size: 10px; color: #94a3b8; margin-top: 2px; }
    .card-footer { display: flex; justify-content: space-between; align-items: center; padding-top: 12px; border-top: 1px solid #f1f5f9; }

    .badge { font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 20px; text-transform: uppercase; letter-spacing: .5px; flex-shrink: 0; }
    .badge-encours { background: #eff6ff; color: #2563eb; }
    .badge-planifie { background: #f0fdf4; color: #16a34a; }
    .badge-retard { background: #fef2f2; color: #dc2626; }
    .badge-termine { background: #f8fafc; color: #475569; }
    .badge-pause { background: #fffbeb; color: #d97706; }

    .text-gold { color: #c8a96e; } .text-blue { color: #3b82f6; } .text-green { color: #16a34a; }
    .text-danger { color: #dc2626; } .text-muted { color: #94a3b8; } .font-bold { font-weight: 700; } .small { font-size: 12px; }

    .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.5); backdrop-filter: blur(3px); z-index: 200; display: flex; align-items: center; justify-content: center; }
    .modal { background: #fff; border-radius: 16px; width: 580px; max-height: 90vh; overflow-y: auto; box-shadow: 0 20px 60px rgba(0,0,0,.2); animation: slideUp .2s ease; }
    .modal-lg { width: 640px; }
    @keyframes slideUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
    .modal-header { padding: 20px 24px; border-bottom: 1px solid #f1f5f9; display: flex; align-items: center; justify-content: space-between; }
    .modal-title { font-size: 16px; font-weight: 700; color: #0c1a35; }
    .modal-close { background: none; border: none; font-size: 22px; cursor: pointer; color: #94a3b8; line-height: 1; }
    .modal-body { padding: 24px; }
    .modal-footer { padding: 16px 24px; border-top: 1px solid #f1f5f9; display: flex; justify-content: flex-end; gap: 10px; }

    .detail-top { display: flex; gap: 16px; align-items: flex-start; margin-bottom: 16px; }
    .detail-kpis { display: grid; grid-template-columns: repeat(3,1fr); gap: 12px; margin-bottom: 20px; }
    .d-kpi { background: #f8fafc; border-radius: 8px; padding: 12px; text-align: center; }
    .d-kpi-val { font-size: 18px; font-weight: 700; margin-bottom: 2px; }
    .d-kpi-lbl { font-size: 11px; color: #94a3b8; }

    .etapes-section { }
    .section-label { font-size: 13px; font-weight: 600; color: #0c1a35; margin-bottom: 10px; display: block; }
    .etape-item { display: flex; align-items: center; gap: 12px; padding: 10px 12px; border-radius: 8px; margin-bottom: 6px; background: #f8fafc; border: 1px solid #e2e8f0; }
    .etape-item.done { opacity: 1; }
    .etape-item.current { background: #eff6ff; border-color: #93c5fd; }
    .etape-item.todo { opacity: .6; }
    .etape-icon { font-size: 16px; flex-shrink: 0; }
    .etape-body { flex: 1; }
    .etape-titre { font-size: 13px; font-weight: 500; color: #0f172a; }
    .etape-dates { margin-top: 2px; }

    .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .form-group { display: flex; flex-direction: column; gap: 6px; margin-bottom: 14px; }
    label { font-size: 13px; font-weight: 500; color: #374151; }
    .form-control { padding: 9px 12px; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 14px; font-family: inherit; }
    .form-control:focus { outline: none; border-color: #c8a96e; }

    .empty-state { display: flex; flex-direction: column; align-items: center; padding: 60px; gap: 12px; color: #94a3b8; text-align: center; background: #fff; border-radius: 12px; }
    .empty-icon { font-size: 48px; }
  `]
})
export class ChantiersComponent implements OnInit {
  private svc = inject(ChantiersService);
  private fb  = inject(FormBuilder);

  chantiers:       ChantierListItemDto[] = [];
  filtreStatut     = '';
  selectedChantier: ChantierDto | null = null;
  showForm         = false;
  submitting       = false;

  get filtered()    { return this.filtreStatut ? this.chantiers.filter(c => c.statut === this.filtreStatut) : this.chantiers; }
  get nbActifs()    { return this.chantiers.filter(c => c.statut === 'EnCours').length; }
  get nbTermines()  { return this.chantiers.filter(c => c.statut === 'Termine').length; }
  get nbRetard()    { return this.chantiers.filter(c => c.joursDepassement > 0).length; }
  get budgetTotal() { return this.chantiers.reduce((s, c) => s + c.budget, 0); }

  form = this.fb.group({
    intitule:       ['', Validators.required],
    proprieteTitre: ['', Validators.required],
    entrepreneur:   ['', Validators.required],
    budget:         [0],
    dateDebut:      [new Date().toISOString().substring(0,10), Validators.required],
    dateFinPrevue:  ['', Validators.required]
  });

  ngOnInit() { this.load(); }

  load() {
    this.svc.getAll({ statut: this.filtreStatut as StatutChantier || undefined })
      .subscribe({ next: r => this.chantiers = r.items, error: () => this.chantiers = [] });
  }

  setStatut(s: string) { this.filtreStatut = s; }

  voirChantier(c: ChantierListItemDto) {
    this.svc.getById(c.id).subscribe({ next: d => this.selectedChantier = d, error: () => {} });
  }

  validerEtape(etapeId: string) {
    if (!this.selectedChantier) return;
    this.svc.validerEtape(this.selectedChantier.id, etapeId)
      .subscribe({ next: d => this.selectedChantier = d, error: () => {} });
  }

  cloture() {
    if (!this.selectedChantier) return;
    this.svc.cloture(this.selectedChantier.id)
      .subscribe({ next: () => { this.selectedChantier = null; this.load(); }, error: () => {} });
  }

  openForm()  { this.showForm = true; }
  closeForm() { this.showForm = false; this.form.reset(); }

  submit() {
    if (this.form.invalid) return;
    this.submitting = true;
    this.svc.create(this.form.value).subscribe({
      next: () => { this.submitting = false; this.closeForm(); this.load(); },
      error: () => { this.submitting = false; }
    });
  }

  progressClass(c: { avancement: number; joursDepassement: number; statut: string }) {
    if (c.statut === 'Termine') return 'fill-green';
    if (c.joursDepassement > 0) return 'fill-red';
    if (c.avancement >= 70)    return 'fill-gold';
    return 'fill-blue';
  }

  statutClass(s: StatutChantier) {
    return {
      'badge-encours':  s === 'EnCours',
      'badge-planifie': s === 'Planifie',
      'badge-termine':  s === 'Termine',
      'badge-pause':    s === 'EnPause',
      'badge-retard':   false
    };
  }

  etapeClass(s: string) {
    return { 'done': s === 'Terminee', 'current': s === 'EnCours', 'todo': s === 'AouvFaire' };
  }

  countDone(etapes: { statut: string }[]): number {
    return etapes.filter(e => e.statut === 'Terminee').length;
  }
}
