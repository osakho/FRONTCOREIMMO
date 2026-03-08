import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule, DatePipe }             from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { TachesService }                       from '../../../core/services/api.services';
import { TacheDto, StatutTache, PrioriteTache, CategorieTache } from '../../../core/models/models';

@Component({
  selector: 'kdi-taches',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, DatePipe],
  template: `
<div class="page">

  <!-- ── Header ── -->
  <div class="page-header">
    <div>
      <h2 class="page-title">Suivi des tâches</h2>
      <p class="page-subtitle">Gestion complète des tâches jusqu'à clôture</p>
    </div>
    <div class="header-actions">
      <button class="btn btn-primary" (click)="openModal()">＋ Nouvelle tâche</button>
    </div>
  </div>

  <!-- ── KPIs ── -->
  <div class="kpi-grid">
    <div class="kpi-card kpi-gold">
      <div class="kpi-icon">📋</div>
      <div class="kpi-label">Total tâches</div>
      <div class="kpi-value">{{ total }}</div>
    </div>
    <div class="kpi-card kpi-blue">
      <div class="kpi-icon">⏳</div>
      <div class="kpi-label">En cours</div>
      <div class="kpi-value">{{ nbEnCours }}</div>
    </div>
    <div class="kpi-card kpi-green">
      <div class="kpi-icon">✅</div>
      <div class="kpi-label">Clôturées</div>
      <div class="kpi-value">{{ nbCloturees }}</div>
    </div>
    <div class="kpi-card kpi-red">
      <div class="kpi-icon">🚨</div>
      <div class="kpi-label">Urgentes</div>
      <div class="kpi-value">{{ nbUrgentes }}</div>
    </div>
  </div>

  <!-- ── Filtres ── -->
  <div class="filters-bar">
    <div class="tab-group">
      <button class="tab-btn" [class.active]="filtreStatut === ''"         (click)="setStatut('')">Toutes</button>
      <button class="tab-btn" [class.active]="filtreStatut === 'Urgente'"  (click)="setStatut('Urgente')">🔴 Urgentes</button>
      <button class="tab-btn" [class.active]="filtreStatut === 'EnCours'"  (click)="setStatut('EnCours')">🔵 En cours</button>
      <button class="tab-btn" [class.active]="filtreStatut === 'Cloturee'" (click)="setStatut('Cloturee')">✅ Clôturées</button>
    </div>
    <select class="filter-select" [(ngModel)]="filtreCategorie" (change)="load()">
      <option value="">Toutes catégories</option>
      <option value="TravauxChantier">Travaux & Chantiers</option>
      <option value="GestionLocative">Gestion Locative</option>
      <option value="Administration">Administration</option>
      <option value="Contentieux">Contentieux</option>
    </select>
  </div>

  <!-- ── Liste ── -->
  <div class="table-card" *ngIf="taches.length; else empty">
    <div class="tache-item" *ngFor="let t of taches">
      <div class="tache-check" [class.checked]="t.statut === 'Cloturee'" (click)="toggleCloture(t)">
        <svg *ngIf="t.statut === 'Cloturee'" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
      </div>
      <div class="tache-body">
        <div class="tache-titre" [class.done]="t.statut === 'Cloturee'">{{ t.titre }}</div>
        <div class="tache-meta">
          <span *ngIf="t.proprieteTitre">🏠 {{ t.proprieteTitre }}</span>
          <span *ngIf="t.dateEcheance">📅 {{ t.dateEcheance | date:'dd MMM' }}</span>
          <span *ngIf="t.assigneNom">👤 {{ t.assigneNom }}</span>
          <span class="badge" [ngClass]="prioriteClass(t.priorite)">{{ t.prioriteLabel }}</span>
          <span class="badge badge-cat">{{ t.categorieLabel }}</span>
        </div>
        <div class="progress-wrap" *ngIf="t.avancement > 0 && t.statut !== 'Cloturee'">
          <div class="progress-bar">
            <div class="progress-fill" [style.width.%]="t.avancement"></div>
          </div>
          <span class="progress-pct">{{ t.avancement }}%</span>
        </div>
      </div>
      <div class="tache-actions">
        <button class="btn-icon" title="Voir" (click)="selectedTache = t">👁</button>
        <button class="btn-icon danger" title="Clôturer" *ngIf="t.statut !== 'Cloturee'" (click)="cloture(t)">✅</button>
      </div>
    </div>
  </div>

  <ng-template #empty>
    <div class="empty-state">
      <span class="empty-icon">📋</span>
      <p>Aucune tâche trouvée</p>
      <button class="btn btn-primary" (click)="openModal()">Créer la première tâche</button>
    </div>
  </ng-template>

  <!-- ── Détail tâche ── -->
  <div class="modal-overlay" *ngIf="selectedTache" (click)="selectedTache = null">
    <div class="modal" (click)="$event.stopPropagation()">
      <div class="modal-header">
        <div class="modal-title">📋 {{ selectedTache.titre }}</div>
        <button class="modal-close" (click)="selectedTache = null">×</button>
      </div>
      <div class="modal-body">
        <div class="detail-badges">
          <span class="badge" [ngClass]="prioriteClass(selectedTache.priorite)">{{ selectedTache.prioriteLabel }}</span>
          <span class="badge badge-cat">{{ selectedTache.categorieLabel }}</span>
          <span class="badge" [ngClass]="statutClass(selectedTache.statut)">{{ selectedTache.statutLabel }}</span>
        </div>
        <div class="detail-grid">
          <div><span class="detail-label">Propriété</span><div>{{ selectedTache.proprieteTitre ?? '—' }}</div></div>
          <div><span class="detail-label">Assigné à</span><div>{{ selectedTache.assigneNom ?? '—' }}</div></div>
          <div><span class="detail-label">Créée le</span><div>{{ selectedTache.dateCreation | date:'dd/MM/yyyy' }}</div></div>
          <div><span class="detail-label">Échéance</span>
            <div [class.text-danger]="isRetard(selectedTache)">{{ selectedTache.dateEcheance ? (selectedTache.dateEcheance | date:'dd/MM/yyyy') : '—' }}</div>
          </div>
        </div>
        <div class="detail-desc" *ngIf="selectedTache.description">{{ selectedTache.description }}</div>
        <div class="progress-section" *ngIf="selectedTache.avancement > 0">
          <span class="detail-label">Avancement — {{ selectedTache.avancement }}%</span>
          <div class="progress-bar mt4"><div class="progress-fill" [style.width.%]="selectedTache.avancement"></div></div>
        </div>
        <div class="timeline" *ngIf="selectedTache.historique?.length">
          <span class="detail-label">Historique</span>
          <div class="tl-item" *ngFor="let h of selectedTache.historique">
            <div class="tl-dot"></div>
            <div>
              <div class="tl-date">{{ h.date | date:'dd MMM · HH:mm' }} — {{ h.auteur }}</div>
              <div class="tl-desc">{{ h.description }}</div>
            </div>
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" (click)="selectedTache = null">Fermer</button>
        <button class="btn btn-primary" *ngIf="selectedTache.statut !== 'Cloturee'" (click)="cloture(selectedTache); selectedTache = null">✅ Clôturer</button>
      </div>
    </div>
  </div>

  <!-- ── Modal nouvelle tâche ── -->
  <div class="modal-overlay" *ngIf="showModal" (click)="closeModal()">
    <div class="modal" (click)="$event.stopPropagation()">
      <div class="modal-header">
        <div class="modal-title">✔️ Nouvelle tâche</div>
        <button class="modal-close" (click)="closeModal()">×</button>
      </div>
      <form [formGroup]="form" (ngSubmit)="submit()">
        <div class="modal-body">
          <div class="form-row">
            <div class="form-group">
              <label>Titre *</label>
              <input formControlName="titre" class="form-control" placeholder="Ex: Inspection fuite toiture">
            </div>
            <div class="form-group">
              <label>Catégorie *</label>
              <select formControlName="categorie" class="form-control">
                <option value="TravauxChantier">Travaux & Chantiers</option>
                <option value="GestionLocative">Gestion Locative</option>
                <option value="Administration">Administration</option>
                <option value="Contentieux">Contentieux</option>
                <option value="Finance">Finance</option>
              </select>
            </div>
          </div>
          <div class="form-group">
            <label>Description</label>
            <textarea formControlName="description" class="form-control" rows="3" placeholder="Détails…"></textarea>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Priorité *</label>
              <select formControlName="priorite" class="form-control">
                <option value="Urgente">🔴 Urgente</option>
                <option value="Moyenne">🟡 Moyenne</option>
                <option value="Faible">🟢 Faible</option>
              </select>
            </div>
            <div class="form-group">
              <label>Date d'échéance</label>
              <input formControlName="dateEcheance" type="date" class="form-control">
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" (click)="closeModal()">Annuler</button>
          <button type="submit" class="btn btn-primary" [disabled]="form.invalid || submitting">
            {{ submitting ? 'Création…' : '✅ Créer la tâche' }}
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
    .btn:disabled { opacity: .5; cursor: not-allowed; }
    .btn-primary { background: #0c1a35; color: #fff; }
    .btn-secondary { background: #fff; color: #334155; border: 1px solid #e2e8f0; }

    /* KPIs */
    .kpi-grid { display: grid; grid-template-columns: repeat(4,1fr); gap: 16px; margin-bottom: 24px; }
    .kpi-card { background: #fff; border-radius: 12px; padding: 20px; box-shadow: 0 1px 4px rgba(0,0,0,.06); border-left: 4px solid transparent; }
    .kpi-gold { border-left-color: #c8a96e; }
    .kpi-blue { border-left-color: #3b82f6; }
    .kpi-green { border-left-color: #22c55e; }
    .kpi-red { border-left-color: #ef4444; }
    .kpi-icon { font-size: 20px; margin-bottom: 6px; }
    .kpi-label { font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #64748b; margin-bottom: 4px; }
    .kpi-value { font-size: 28px; font-weight: 700; color: #0c1a35; }

    /* Filtres */
    .filters-bar { display: flex; gap: 12px; margin-bottom: 16px; align-items: center; flex-wrap: wrap; }
    .tab-group { display: flex; background: #f1f5f9; border-radius: 8px; padding: 3px; }
    .tab-btn { padding: 6px 14px; border-radius: 6px; border: none; background: none; cursor: pointer; font-size: 13px; color: #64748b; transition: all .15s; }
    .tab-btn.active { background: #fff; color: #0c1a35; font-weight: 600; box-shadow: 0 1px 3px rgba(0,0,0,.1); }
    .filter-select { padding: 8px 12px; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 13px; }

    /* Tâche item */
    .table-card { background: #fff; border-radius: 12px; padding: 8px; box-shadow: 0 1px 4px rgba(0,0,0,.06); }
    .tache-item { display: flex; align-items: flex-start; gap: 14px; padding: 14px 12px; border-radius: 8px; transition: background .15s; }
    .tache-item:hover { background: #f8fafc; }
    .tache-check { width: 18px; height: 18px; border: 2px solid #cbd5e1; border-radius: 5px; cursor: pointer; flex-shrink: 0; margin-top: 3px; display: flex; align-items: center; justify-content: center; transition: all .2s; }
    .tache-check.checked { background: #22c55e; border-color: #22c55e; }
    .tache-body { flex: 1; }
    .tache-titre { font-size: 14px; font-weight: 500; color: #0f172a; margin-bottom: 6px; }
    .tache-titre.done { text-decoration: line-through; color: #94a3b8; }
    .tache-meta { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; font-size: 12px; color: #64748b; }
    .tache-actions { display: flex; gap: 6px; flex-shrink: 0; }
    .btn-icon { width: 30px; height: 30px; border: 1px solid #e2e8f0; border-radius: 7px; background: #fff; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 14px; transition: background .15s; }
    .btn-icon:hover { background: #f1f5f9; }
    .btn-icon.danger:hover { background: #fef2f2; border-color: #fca5a5; }

    /* Badges */
    .badge { font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 20px; text-transform: uppercase; letter-spacing: .5px; }
    .badge-urgent { background: #fef2f2; color: #dc2626; }
    .badge-moyenne { background: #fffbeb; color: #d97706; }
    .badge-faible { background: #f0fdf4; color: #16a34a; }
    .badge-cat { background: #f1f5f9; color: #475569; }
    .badge-encours { background: #eff6ff; color: #2563eb; }
    .badge-cloture { background: #f0fdf4; color: #16a34a; }
    .badge-attente { background: #f8fafc; color: #64748b; }

    /* Progress */
    .progress-wrap { display: flex; align-items: center; gap: 8px; margin-top: 8px; }
    .progress-bar { flex: 1; height: 5px; background: #f1f5f9; border-radius: 3px; overflow: hidden; }
    .progress-fill { height: 100%; background: linear-gradient(90deg, #c8a96e, #e8c97a); border-radius: 3px; }
    .progress-pct { font-size: 11px; color: #64748b; width: 30px; text-align: right; flex-shrink: 0; }
    .mt4 { margin-top: 4px; }

    /* Modal */
    .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.5); backdrop-filter: blur(3px); z-index: 200; display: flex; align-items: center; justify-content: center; }
    .modal { background: #fff; border-radius: 16px; width: 580px; max-height: 90vh; overflow-y: auto; box-shadow: 0 20px 60px rgba(0,0,0,.2); animation: slideUp .2s ease; }
    @keyframes slideUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
    .modal-header { padding: 20px 24px; border-bottom: 1px solid #f1f5f9; display: flex; align-items: center; justify-content: space-between; }
    .modal-title { font-size: 16px; font-weight: 700; color: #0c1a35; }
    .modal-close { background: none; border: none; font-size: 22px; cursor: pointer; color: #94a3b8; line-height: 1; }
    .modal-body { padding: 24px; }
    .modal-footer { padding: 16px 24px; border-top: 1px solid #f1f5f9; display: flex; justify-content: flex-end; gap: 10px; }
    .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .form-group { display: flex; flex-direction: column; gap: 6px; margin-bottom: 14px; }
    label { font-size: 13px; font-weight: 500; color: #374151; }
    .form-control { padding: 9px 12px; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 14px; font-family: inherit; transition: border-color .2s; }
    .form-control:focus { outline: none; border-color: #c8a96e; }
    textarea.form-control { resize: vertical; }

    /* Détail */
    .detail-badges { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 16px; }
    .detail-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px; }
    .detail-label { font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #94a3b8; display: block; margin-bottom: 3px; }
    .detail-desc { font-size: 14px; color: #475569; background: #f8fafc; padding: 12px; border-radius: 8px; margin-bottom: 16px; line-height: 1.6; }
    .progress-section { margin-bottom: 16px; }
    .text-danger { color: #dc2626; }

    /* Timeline */
    .timeline { padding-left: 12px; border-left: 2px solid #e2e8f0; margin-top: 8px; }
    .tl-item { position: relative; padding: 0 0 16px 16px; }
    .tl-dot { position: absolute; left: -7px; top: 4px; width: 12px; height: 12px; background: #e2e8f0; border: 2px solid #cbd5e1; border-radius: 50%; }
    .tl-date { font-size: 11px; color: #94a3b8; margin-bottom: 2px; }
    .tl-desc { font-size: 13px; color: #334155; }

    /* Empty */
    .empty-state { display: flex; flex-direction: column; align-items: center; padding: 60px; gap: 12px; color: #94a3b8; text-align: center; background: #fff; border-radius: 12px; }
    .empty-icon { font-size: 48px; }
  `]
})
export class TachesComponent implements OnInit {
  private svc  = inject(TachesService);
  private fb   = inject(FormBuilder);

  taches:          TacheDto[] = [];
  filtreStatut     = '';
  filtreCategorie  = '';
  selectedTache:   TacheDto | null = null;
  showModal        = false;
  submitting       = false;

  get total()      { return this.taches.length; }
  get nbEnCours()  { return this.taches.filter(t => t.statut === 'EnCours').length; }
  get nbCloturees(){ return this.taches.filter(t => t.statut === 'Cloturee').length; }
  get nbUrgentes() { return this.taches.filter(t => t.priorite === 'Urgente' && t.statut !== 'Cloturee').length; }

  form = this.fb.group({
    titre:         ['', Validators.required],
    categorie:     ['TravauxChantier', Validators.required],
    description:   [''],
    priorite:      ['Moyenne', Validators.required],
    dateEcheance:  [''],
    assigneId:     [''],
    proprieteId:   ['']
  });

  ngOnInit() { this.load(); }

  load() {
    this.svc.getAll({ statut: this.filtreStatut as StatutTache || undefined })
      .subscribe({ next: r => this.taches = r.items, error: () => this.taches = [] });
  }

  setStatut(s: string) { this.filtreStatut = s; this.load(); }

  cloture(t: TacheDto) {
    this.svc.cloture(t.id).subscribe({ next: () => this.load(), error: () => {} });
  }

  toggleCloture(t: TacheDto) {
    if (t.statut !== 'Cloturee') this.cloture(t);
  }

  openModal()  { this.showModal = true; }
  closeModal() { this.showModal = false; this.form.reset({ categorie: 'TravauxChantier', priorite: 'Moyenne' }); }

  submit() {
    if (this.form.invalid) return;
    this.submitting = true;
    const v = this.form.value as any;
    // Convertir les chaînes vides en null pour les champs Guid? optionnels
    const payload = {
      ...v,
      assigneId:    v.assigneId    || null,
      proprieteId:  v.proprieteId  || null,
      dateEcheance: v.dateEcheance || null,
    };
    this.svc.create(payload).subscribe({
      next: () => { this.submitting = false; this.closeModal(); this.load(); },
      error: () => { this.submitting = false; }
    });
  }

  prioriteClass(p: string) {
    return { 'badge-urgent': p === 'Urgente', 'badge-moyenne': p === 'Moyenne', 'badge-faible': p === 'Faible' };
  }
  statutClass(s: string) {
    return { 'badge-encours': s === 'EnCours', 'badge-cloture': s === 'Cloturee', 'badge-attente': s === 'AouvFaire' || s === 'EnAttente' };
  }
  isRetard(t: TacheDto): boolean {
    return !!t.dateEcheance && new Date(t.dateEcheance) < new Date() && t.statut !== 'Cloturee';
  }
}
