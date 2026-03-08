import { Component, inject, OnInit } from '@angular/core';
import { CommonModule, DatePipe, DecimalPipe } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormArray, Validators } from '@angular/forms';
import { DevisTravauxService }                  from '../../../core/services/api.services';
import { DevisListItemDto, DevisDto, StatutDevis } from '../../../core/models/models';

@Component({
  selector: 'kdi-devis-travaux',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, DatePipe, DecimalPipe],
  template: `
<div class="page">

  <!-- ── Header ── -->
  <div class="page-header">
    <div>
      <h2 class="page-title">Devis Travaux</h2>
      <p class="page-subtitle">Création, suivi et impression des devis</p>
    </div>
    <div class="header-actions">
      <button class="btn btn-secondary" (click)="printDevis()" *ngIf="selectedDevis">🖨️ Imprimer</button>
      <button class="btn btn-primary" (click)="openForm()">＋ Nouveau devis</button>
    </div>
  </div>

  <!-- ── KPIs ── -->
  <div class="kpi-grid">
    <div class="kpi-card kpi-gold">
      <div class="kpi-icon">📐</div>
      <div class="kpi-label">Devis émis</div>
      <div class="kpi-value">{{ devis.length }}</div>
    </div>
    <div class="kpi-card kpi-green">
      <div class="kpi-icon">✅</div>
      <div class="kpi-label">Acceptés</div>
      <div class="kpi-value">{{ nbAcceptes }}</div>
    </div>
    <div class="kpi-card kpi-blue">
      <div class="kpi-icon">💵</div>
      <div class="kpi-label">Montant total</div>
      <div class="kpi-value" style="font-size:20px">{{ totalMontant | number:'1.0-0' }}</div>
    </div>
    <div class="kpi-card kpi-orange">
      <div class="kpi-icon">⏳</div>
      <div class="kpi-label">En attente</div>
      <div class="kpi-value">{{ nbEnAttente }}</div>
    </div>
  </div>

  <!-- ── Filtres ── -->
  <div class="filters-bar">
    <div class="tab-group">
      <button class="tab-btn" [class.active]="filtreStatut === ''"         (click)="setStatut('')">Tous</button>
      <button class="tab-btn" [class.active]="filtreStatut === 'Emis'"     (click)="setStatut('Emis')">📤 Émis</button>
      <button class="tab-btn" [class.active]="filtreStatut === 'Accepte'"  (click)="setStatut('Accepte')">✅ Acceptés</button>
      <button class="tab-btn" [class.active]="filtreStatut === 'Refuse'"   (click)="setStatut('Refuse')">❌ Refusés</button>
    </div>
  </div>

  <!-- ── Table ── -->
  <div class="table-card" *ngIf="devis.length; else empty">
    <table class="data-table">
      <thead><tr>
        <th>N° Devis</th>
        <th>Propriété</th>
        <th>Nature travaux</th>
        <th>Entrepreneur</th>
        <th class="text-right">Montant TTC</th>
        <th>Date émission</th>
        <th>Statut</th>
        <th>Actions</th>
      </tr></thead>
      <tbody>
        <tr *ngFor="let d of filteredDevis">
          <td><strong class="text-gold">{{ d.numero }}</strong></td>
          <td>{{ d.proprieteTitre }}</td>
          <td>{{ d.natureTravaux }}</td>
          <td>{{ d.entrepreneur }}</td>
          <td class="text-right font-bold">{{ d.totalTtc | number:'1.0-0' }}</td>
          <td>{{ d.dateEmission | date:'dd/MM/yyyy' }}</td>
          <td><span class="badge" [ngClass]="statutClass(d.statut)">{{ d.statutLabel }}</span></td>
          <td>
            <div class="row-actions">
              <button class="btn-action" title="Voir / Imprimer" (click)="voirDevis(d)">👁</button>
              <button class="btn-action green" title="Accepter" *ngIf="d.statut === 'EnAttente'" (click)="accepter(d)">✔</button>
              <button class="btn-action red" title="Refuser" *ngIf="d.statut === 'EnAttente'" (click)="refuser(d)">✕</button>
              <button class="btn-action blue" title="→ Chantier" *ngIf="d.statut === 'Accepte' && !d.chantierId" (click)="convertir(d)">🏗</button>
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  </div>

  <ng-template #empty>
    <div class="empty-state">
      <span class="empty-icon">📐</span>
      <p>Aucun devis pour l'instant</p>
      <button class="btn btn-primary" (click)="openForm()">Créer le premier devis</button>
    </div>
  </ng-template>

  <!-- ── Modal Détail / Impression ── -->
  <div class="modal-overlay" *ngIf="selectedDevis" (click)="selectedDevis = null">
    <div class="modal modal-lg" (click)="$event.stopPropagation()" id="devis-print">
      <div class="modal-header no-print">
        <div class="modal-title">📄 {{ selectedDevis.numero }} — Aperçu</div>
        <button class="modal-close" (click)="selectedDevis = null">×</button>
      </div>
      <div class="modal-body devis-preview">
        <!-- En-tête devis -->
        <div class="devis-header">
          <div>
            <div class="devis-logo">KDI</div>
            <div class="devis-agency">Khalifat Djické Immobilier<br><small>BP 1234 Ouagadougou</small></div>
          </div>
          <div class="text-right">
            <div class="devis-num-title">DEVIS</div>
            <div class="text-gold font-bold">{{ selectedDevis.numero }}</div>
            <div class="text-muted small">Émis le {{ selectedDevis.dateEmission | date:'dd/MM/yyyy' }}</div>
            <div class="text-muted small">Valable jusqu'au {{ selectedDevis.dateValidite | date:'dd/MM/yyyy' }}</div>
          </div>
        </div>
        <div class="devis-parties">
          <div><div class="parties-label">PROPRIÉTÉ</div><div class="font-bold">{{ selectedDevis.proprieteTitre }}</div></div>
          <div><div class="parties-label">ENTREPRENEUR</div><div class="font-bold">{{ selectedDevis.entrepreneur }}</div></div>
        </div>
        <div class="devis-objet">
          <strong>Objet :</strong> {{ selectedDevis.natureTravaux }}
        </div>
        <table class="devis-table">
          <thead><tr><th>#</th><th>Désignation</th><th class="text-right">Qté</th><th class="text-right">Unité</th><th class="text-right">PU</th><th class="text-right">Total</th></tr></thead>
          <tbody>
            <tr *ngFor="let l of selectedDevis.lignes; let i = index">
              <td class="text-muted">{{ i+1 }}</td>
              <td>{{ l.designation }}</td>
              <td class="text-right">{{ l.quantite }}</td>
              <td class="text-right">{{ l.unite }}</td>
              <td class="text-right">{{ l.prixUnitaire | number:'1.0-0' }}</td>
              <td class="text-right text-gold font-bold">{{ l.total | number:'1.0-0' }}</td>
            </tr>
          </tbody>
        </table>
        <div class="devis-totaux">
          <div class="total-row"><span class="text-muted">Sous-total HT</span><span>{{ selectedDevis.sousTotal | number:'1.0-0' }} MRU</span></div>
          <div class="total-row"><span class="text-muted">TVA ({{ ((selectedDevis.tva / selectedDevis.sousTotal)*100 | number:'1.0-0') }}%)</span><span>{{ selectedDevis.tva | number:'1.0-0' }} MRU</span></div>
          <div class="total-row grand"><span>TOTAL TTC</span><span class="text-gold">{{ selectedDevis.totalTtc | number:'1.0-0' }} MRU</span></div>
        </div>
        <div class="devis-conditions" *ngIf="selectedDevis.conditions">{{ selectedDevis.conditions }}</div>
      </div>
      <div class="modal-footer no-print">
        <button class="btn btn-secondary" (click)="selectedDevis = null">Fermer</button>
        <button class="btn btn-primary" (click)="printDevis()">🖨️ Imprimer / PDF</button>
      </div>
    </div>
  </div>

  <!-- ── Modal Nouveau Devis ── -->
  <div class="modal-overlay" *ngIf="showForm" (click)="closeForm()">
    <div class="modal modal-lg" (click)="$event.stopPropagation()">
      <div class="modal-header">
        <div class="modal-title">📐 Nouveau devis travaux</div>
        <button class="modal-close" (click)="closeForm()">×</button>
      </div>
      <form [formGroup]="form" (ngSubmit)="submit()">
        <div class="modal-body">
          <div class="form-row">
            <div class="form-group">
              <label>Propriété *</label>
              <input formControlName="proprieteTitre" class="form-control" placeholder="Nom de la propriété">
            </div>
            <div class="form-group">
              <label>Entrepreneur *</label>
              <input formControlName="entrepreneur" class="form-control" placeholder="Nom entreprise">
            </div>
          </div>
          <div class="form-group">
            <label>Nature des travaux *</label>
            <input formControlName="natureTravaux" class="form-control" placeholder="Ex: Réfection toiture + étanchéité">
          </div>

          <!-- Lignes devis -->
          <div class="lignes-section">
            <div class="lignes-header">
              <span class="section-label">Lignes du devis</span>
              <button type="button" class="btn btn-secondary btn-sm" (click)="addLigne()">＋ Ligne</button>
            </div>
            <table class="lignes-table">
              <thead><tr><th>Désignation</th><th>Qté</th><th>Unité</th><th>PU</th><th>Total</th><th></th></tr></thead>
              <tbody formArrayName="lignes">
                <tr *ngFor="let lg of lignesArray.controls; let i=index" [formGroupName]="i">
                  <td><input formControlName="designation" class="form-control fc-sm" placeholder="Ex: Main d'œuvre"></td>
                  <td><input formControlName="quantite" type="number" class="form-control fc-sm" min="1" (input)="calcTotal(i)"></td>
                  <td><input formControlName="unite" class="form-control fc-sm" placeholder="Forfait"></td>
                  <td><input formControlName="prixUnitaire" type="number" class="form-control fc-sm" min="0" (input)="calcTotal(i)"></td>
                  <td class="text-gold font-bold">{{ getTotal(i) | number:'1.0-0' }}</td>
                  <td><button type="button" class="btn-rm" (click)="removeLigne(i)">✕</button></td>
                </tr>
              </tbody>
            </table>
            <div class="sous-total">Sous-total : <strong>{{ sousTotal | number:'1.0-0' }} MRU</strong></div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label>Date d'émission</label>
              <input formControlName="dateEmission" type="date" class="form-control">
            </div>
            <div class="form-group">
              <label>Validité (jours)</label>
              <input formControlName="validite" type="number" class="form-control" placeholder="30">
            </div>
          </div>
          <div class="form-group">
            <label>Conditions de paiement</label>
            <textarea formControlName="conditions" class="form-control" rows="2" placeholder="Ex: 50% à la commande, 50% à la livraison"></textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" (click)="closeForm()">Annuler</button>
          <button type="submit" class="btn btn-primary" [disabled]="form.invalid || submitting">
            {{ submitting ? 'Enregistrement…' : '💾 Enregistrer devis' }}
          </button>
        </div>
      </form>
    </div>
  </div>

</div>
  `,
  styles: [`
    .page { max-width: 1300px; margin: 0 auto; }
    .page-header { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 24px; }
    .page-title { font-size: 24px; font-weight: 700; color: #0c1a35; margin: 0 0 4px; }
    .page-subtitle { font-size: 14px; color: #64748b; margin: 0; }
    .header-actions { display: flex; gap: 8px; }
    .btn { padding: 9px 18px; border-radius: 8px; font-size: 14px; font-weight: 500; cursor: pointer; border: none; display: inline-flex; align-items: center; gap: 6px; transition: opacity .2s; text-decoration: none; }
    .btn:disabled { opacity:.5; cursor:not-allowed; }
    .btn-primary { background: #0c1a35; color: #fff; }
    .btn-secondary { background: #fff; color: #334155; border: 1px solid #e2e8f0; }
    .btn-sm { padding: 5px 10px; font-size: 12px; }

    .kpi-grid { display: grid; grid-template-columns: repeat(4,1fr); gap: 16px; margin-bottom: 24px; }
    .kpi-card { background: #fff; border-radius: 12px; padding: 20px; box-shadow: 0 1px 4px rgba(0,0,0,.06); border-left: 4px solid #e2e8f0; }
    .kpi-gold { border-left-color: #c8a96e; } .kpi-green { border-left-color: #22c55e; }
    .kpi-blue { border-left-color: #3b82f6; } .kpi-orange { border-left-color: #f59e0b; }
    .kpi-icon { font-size: 20px; margin-bottom: 6px; }
    .kpi-label { font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #64748b; margin-bottom: 4px; }
    .kpi-value { font-size: 28px; font-weight: 700; color: #0c1a35; }

    .filters-bar { display: flex; gap: 12px; margin-bottom: 16px; align-items: center; }
    .tab-group { display: flex; background: #f1f5f9; border-radius: 8px; padding: 3px; }
    .tab-btn { padding: 6px 14px; border-radius: 6px; border: none; background: none; cursor: pointer; font-size: 13px; color: #64748b; transition: all .15s; }
    .tab-btn.active { background: #fff; color: #0c1a35; font-weight: 600; box-shadow: 0 1px 3px rgba(0,0,0,.1); }

    .table-card { background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 4px rgba(0,0,0,.06); }
    .data-table { width: 100%; border-collapse: collapse; }
    .data-table th { padding: 10px 16px; background: #f8fafc; font-size: 11px; color: #64748b; text-align: left; border-bottom: 1px solid #e2e8f0; letter-spacing: 1px; text-transform: uppercase; }
    .data-table td { padding: 12px 16px; font-size: 13px; border-bottom: 1px solid #f1f5f9; vertical-align: middle; }
    .data-table tr:last-child td { border-bottom: none; }
    .data-table tr:hover td { background: #fafafa; }
    .text-right { text-align: right; } .text-gold { color: #c8a96e; } .text-muted { color: #94a3b8; }
    .font-bold { font-weight: 600; } .small { font-size: 12px; }

    .badge { font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 20px; text-transform: uppercase; letter-spacing: .5px; }
    .badge-emis { background: #eff6ff; color: #2563eb; }
    .badge-attente { background: #fffbeb; color: #d97706; }
    .badge-accepte { background: #f0fdf4; color: #16a34a; }
    .badge-refuse { background: #fef2f2; color: #dc2626; }
    .badge-expire { background: #f8fafc; color: #94a3b8; }
    .badge-brouillon { background: #f1f5f9; color: #475569; }
    .badge-negociation { background: #f5f3ff; color: #7c3aed; }

    .row-actions { display: flex; gap: 4px; }
    .btn-action { width: 28px; height: 28px; border: 1px solid #e2e8f0; border-radius: 6px; background: #fff; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 13px; transition: background .15s; }
    .btn-action:hover { background: #f1f5f9; }
    .btn-action.green { color: #16a34a; } .btn-action.green:hover { background: #f0fdf4; border-color: #86efac; }
    .btn-action.red { color: #dc2626; } .btn-action.red:hover { background: #fef2f2; border-color: #fca5a5; }
    .btn-action.blue { color: #2563eb; } .btn-action.blue:hover { background: #eff6ff; border-color: #93c5fd; }

    /* Devis preview */
    .modal-overlay { position:fixed; inset:0; background:rgba(0,0,0,.5); backdrop-filter:blur(3px); z-index:200; display:flex; align-items:center; justify-content:center; }
    .modal { background:#fff; border-radius:16px; width:580px; max-height:90vh; overflow-y:auto; box-shadow:0 20px 60px rgba(0,0,0,.2); animation:slideUp .2s ease; }
    .modal-lg { width: 680px; }
    @keyframes slideUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
    .modal-header { padding:20px 24px; border-bottom:1px solid #f1f5f9; display:flex; align-items:center; justify-content:space-between; }
    .modal-title { font-size:16px; font-weight:700; color:#0c1a35; }
    .modal-close { background:none; border:none; font-size:22px; cursor:pointer; color:#94a3b8; line-height:1; }
    .modal-body { padding:24px; }
    .modal-footer { padding:16px 24px; border-top:1px solid #f1f5f9; display:flex; justify-content:flex-end; gap:10px; }

    .devis-header { display:flex; justify-content:space-between; background:#f8fafc; padding:16px; border-radius:10px; margin-bottom:16px; }
    .devis-logo { font-size:22px; font-weight:800; color:#c8a96e; font-family:sans-serif; }
    .devis-agency { font-size:12px; color:#64748b; margin-top:4px; }
    .devis-num-title { font-size:20px; font-weight:800; color:#0c1a35; }
    .text-right { text-align:right; }
    .devis-parties { display:flex; justify-content:space-between; margin-bottom:16px; padding:12px; background:#fff; border:1px solid #e2e8f0; border-radius:8px; }
    .parties-label { font-size:10px; text-transform:uppercase; letter-spacing:1px; color:#94a3b8; margin-bottom:4px; }
    .devis-objet { background:#f0f9ff; padding:10px 14px; border-radius:8px; font-size:13px; margin-bottom:16px; }
    .devis-table { width:100%; border-collapse:collapse; font-size:13px; margin-bottom:12px; }
    .devis-table th { background:#f8fafc; padding:9px 12px; font-size:11px; letter-spacing:1px; text-transform:uppercase; color:#64748b; text-align:left; }
    .devis-table td { padding:9px 12px; border-bottom:1px solid #f1f5f9; }
    .devis-totaux { text-align:right; }
    .total-row { display:flex; justify-content:flex-end; gap:40px; font-size:13px; margin-bottom:4px; }
    .total-row.grand { font-size:16px; font-weight:700; border-top:1px solid #e2e8f0; padding-top:10px; margin-top:8px; }
    .devis-conditions { margin-top:16px; padding:12px; background:#fffbeb; border-radius:8px; font-size:12px; color:#78716c; border:1px solid #fde68a; }

    /* Form lignes */
    .lignes-section { background:#f8fafc; border-radius:10px; padding:16px; margin-bottom:16px; }
    .lignes-header { display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; }
    .section-label { font-size:13px; font-weight:600; color:#0c1a35; }
    .lignes-table { width:100%; border-collapse:collapse; font-size:13px; }
    .lignes-table th { padding:7px 10px; background:#e2e8f0; font-size:11px; color:#64748b; text-align:left; letter-spacing:.5px; }
    .lignes-table td { padding:5px 6px; border-bottom:1px solid #e2e8f0; }
    .fc-sm { padding:6px 8px; font-size:13px; }
    .btn-rm { background:none; border:none; cursor:pointer; color:#ef4444; font-size:14px; padding:0 4px; }
    .sous-total { text-align:right; font-size:13px; margin-top:10px; color:#64748b; }
    .form-row { display:grid; grid-template-columns:1fr 1fr; gap:16px; }
    .form-group { display:flex; flex-direction:column; gap:6px; margin-bottom:14px; }
    label { font-size:13px; font-weight:500; color:#374151; }
    .form-control { padding:9px 12px; border:1px solid #e2e8f0; border-radius:8px; font-size:14px; font-family:inherit; }
    .form-control:focus { outline:none; border-color:#c8a96e; }
    textarea.form-control { resize:vertical; }

    .empty-state { display:flex; flex-direction:column; align-items:center; padding:60px; gap:12px; color:#94a3b8; text-align:center; background:#fff; border-radius:12px; }
    .empty-icon { font-size:48px; }

    @media print {
      .no-print { display: none !important; }
    }
  `]
})
export class DevisTravauxComponent implements OnInit {
  private svc = inject(DevisTravauxService);
  private fb  = inject(FormBuilder);

  devis:         DevisListItemDto[] = [];
  filtreStatut   = '';
  selectedDevis: DevisDto | null = null;
  showForm       = false;
  submitting     = false;

  get filteredDevis() {
    if (!this.filtreStatut) return this.devis;
    return this.devis.filter(d => d.statut === this.filtreStatut);
  }
  get nbAcceptes()  { return this.devis.filter(d => d.statut === 'Accepte').length; }
  get nbEnAttente() { return this.devis.filter(d => d.statut === 'EnAttente').length; }
  get totalMontant(){ return this.devis.reduce((s, d) => s + d.totalTtc, 0); }

  form = this.fb.group({
    proprieteTitre: ['', Validators.required],
    entrepreneur:   ['', Validators.required],
    natureTravaux:  ['', Validators.required],
    dateEmission:   [new Date().toISOString().substring(0,10)],
    validite:       [30],
    conditions:     [''],
    lignes: this.fb.array([this.newLigne()])
  });

  get lignesArray() { return this.form.get('lignes') as FormArray; }

  get sousTotal() {
    return this.lignesArray.controls.reduce((s, lg) => {
      const q = +lg.get('quantite')?.value || 0;
      const p = +lg.get('prixUnitaire')?.value || 0;
      return s + q * p;
    }, 0);
  }

  getTotal(i: number): number {
    const lg = this.lignesArray.at(i);
    return (+lg.get('quantite')?.value || 0) * (+lg.get('prixUnitaire')?.value || 0);
  }

  calcTotal(i: number) { /* triggers getTotal via template */ }

  newLigne() {
    return this.fb.group({ designation: [''], quantite: [1], unite: ['Forfait'], prixUnitaire: [0] });
  }
  addLigne()       { this.lignesArray.push(this.newLigne()); }
  removeLigne(i: number) { if (this.lignesArray.length > 1) this.lignesArray.removeAt(i); }

  ngOnInit() { this.load(); }

  load() {
    this.svc.getAll({ statut: this.filtreStatut as StatutDevis || undefined })
      .subscribe({ next: r => this.devis = r.items, error: () => this.devis = [] });
  }

  setStatut(s: string) { this.filtreStatut = s; this.load(); }

  voirDevis(d: DevisListItemDto) {
    this.svc.getById(d.id).subscribe({ next: v => this.selectedDevis = v, error: () => {} });
  }

  accepter(d: DevisListItemDto) { this.svc.accepter(d.id).subscribe(() => this.load()); }
  refuser(d: DevisListItemDto)  { this.svc.refuser(d.id).subscribe(() => this.load()); }
  convertir(d: DevisListItemDto){ this.svc.convertirChantier(d.id).subscribe(() => this.load()); }

  openForm()  { this.showForm = true; }
  closeForm() { this.showForm = false; this.form.reset(); while(this.lignesArray.length > 1) this.lignesArray.removeAt(0); }

  submit() {
    if (this.form.invalid) return;
    this.submitting = true;
    this.svc.create(this.form.value as any).subscribe({
      next: () => { this.submitting = false; this.closeForm(); this.load(); },
      error: () => { this.submitting = false; }
    });
  }

  printDevis() {
    const printContents = document.getElementById('devis-print')?.innerHTML ?? '';
    const w = window.open('', '_blank');
    w?.document.write(`<html><head><title>Devis</title><style>body{font-family:sans-serif;padding:30px;color:#222} table{width:100%;border-collapse:collapse} th{background:#f5f5f5;padding:8px;text-align:left;font-size:11px} td{padding:8px;border-bottom:1px solid #eee} .no-print{display:none} .text-gold{color:#c8a96e} .font-bold{font-weight:700}</style></head><body>${printContents}</body></html>`);
    w?.document.close();
    setTimeout(() => w?.print(), 400);
  }

  statutClass(s: StatutDevis) {
    return {
      'badge-emis': s === 'Emis',
      'badge-attente': s === 'EnAttente',
      'badge-accepte': s === 'Accepte',
      'badge-refuse': s === 'Refuse',
      'badge-expire': s === 'Expire',
      'badge-brouillon': s === 'Brouillon'
    };
  }
}
