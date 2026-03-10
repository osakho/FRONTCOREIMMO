import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CollectesService, AuthService, PersonnelService } from '../../../core/services/api.services';
import { CollecteDto, PagedList, StatutCollecte } from '../../../core/models/models';

@Component({
  selector: 'kdi-collectes-list',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  template: `
<div class="page-enter">

  <!-- ══ HEADER ══ -->
  <div class="page-header">
    <div>
      <div class="page-title"><span class="mi">payments</span> Collectes</div>
      <div class="page-subtitle">Suivi des encaissements de loyers</div>
    </div>
    <div class="header-actions">
      <a routerLink="/collectes/bordereau" class="btn btn-secondary">
        <span class="mi">receipt_long</span> Bordereau
      </a>
      <a routerLink="/collectes/rapport" class="btn btn-secondary">
        <span class="mi">bar_chart</span> Rapport semaine
      </a>
      <a routerLink="/collectes/saisir" class="btn btn-gold">
        <span class="mi">add</span> Saisir une collecte
      </a>
    </div>
  </div>

  <!-- ══ FILTRES ══ -->
  <div class="filters-panel">

    <!-- Mode filtre -->
    <div class="mode-toggle">
      <button class="mode-btn" [class.active]="modeFiltre==='mois'" (click)="setMode('mois')">
        <span class="mi">calendar_month</span> Par mois
      </button>
      <button class="mode-btn" [class.active]="modeFiltre==='periode'" (click)="setMode('periode')">
        <span class="mi">date_range</span> Par période
      </button>
    </div>

    <!-- Filtre mois -->
    <div class="filter-group" *ngIf="modeFiltre==='mois'">
      <label class="filter-label">Mois</label>
      <input type="month" class="filter-input" [(ngModel)]="filtreMois" (ngModelChange)="load()">
    </div>

    <!-- Filtre période -->
    <ng-container *ngIf="modeFiltre==='periode'">
      <div class="filter-group">
        <label class="filter-label">Du</label>
        <input type="month" class="filter-input" [(ngModel)]="periodeDebut" (ngModelChange)="load()">
      </div>
      <div class="filter-group">
        <label class="filter-label">Au</label>
        <input type="month" class="filter-input" [(ngModel)]="periodeFin" (ngModelChange)="load()">
      </div>
    </ng-container>

    <!-- Collecteur -->
    <div class="filter-group" *ngIf="isDirection()">
      <label class="filter-label">Collecteur</label>
      <select class="filter-input" [(ngModel)]="filtreCollecteur" (ngModelChange)="load()">
        <option value="">Tous</option>
        <option *ngFor="let p of collecteurs" [value]="p.id">{{ p.nomComplet }}</option>
      </select>
    </div>

    <!-- Statut -->
    <div class="filter-group">
      <label class="filter-label">Statut</label>
      <select class="filter-input" [(ngModel)]="filtreStatut" (ngModelChange)="load()">
        <option value="">Tous</option>
        <option value="Saisie">Saisie</option>
        <option value="SoumisComptable">Soumis comptable</option>
        <option value="Valide">Validée</option>
        <option value="Rejete">Rejetée</option>
      </select>
    </div>

    <!-- Produit -->
    <div class="filter-group">
      <label class="filter-label">Bien</label>
      <input type="text" class="filter-input" [(ngModel)]="filtreProduit"
             (ngModelChange)="filtrerLocalement()"
             placeholder="Ex: AP-01">
    </div>

    <!-- Reset -->
    <button class="btn-reset" (click)="resetFiltres()" title="Réinitialiser">
      <span class="mi">filter_alt_off</span>
    </button>
  </div>

  <!-- ══ KPIs ══ -->
  <div class="kpi-band" *ngIf="collectesFiltrees().length">
    <div class="kpi-card kpi-encaisse">
      <div class="kpi-icon-wrap">💰</div>
      <div class="kpi-body">
        <div class="kpi-label">Total encaissé</div>
        <div class="kpi-val">{{ totalEncaisse() | number:"1.0-0" }} <span class="kpi-unit">MRU</span></div>
      </div>
    </div>
    <div class="kpi-card kpi-attendu">
      <div class="kpi-icon-wrap">📋</div>
      <div class="kpi-body">
        <div class="kpi-label">Total attendu</div>
        <div class="kpi-val">{{ totalAttendu() | number:"1.0-0" }} <span class="kpi-unit">MRU</span></div>
      </div>
    </div>
    <div class="kpi-card" [class.kpi-ecart-neg]="ecartGlobal() < 0" [class.kpi-ecart-pos]="ecartGlobal() >= 0">
      <div class="kpi-icon-wrap">{{ ecartGlobal() >= 0 ? "✅" : "⚠" }}</div>
      <div class="kpi-body">
        <div class="kpi-label">Écart global</div>
        <div class="kpi-val">{{ ecartGlobal() >= 0 ? "+" : "" }}{{ ecartGlobal() | number:"1.0-0" }} <span class="kpi-unit">MRU</span></div>
      </div>
    </div>
    <div class="kpi-card kpi-stats">
      <div class="kpi-stats-grid">
        <div class="ks-item ks-green">
          <div class="ks-num">{{ nbParStatut("Valide") }}</div>
          <div class="ks-lbl">Validées</div>
        </div>
        <div class="ks-item ks-blue">
          <div class="ks-num">{{ nbParStatut("SoumisComptable") }}</div>
          <div class="ks-lbl">En attente</div>
        </div>
        <div class="ks-item ks-amber">
          <div class="ks-num">{{ nbParStatut("Saisie") }}</div>
          <div class="ks-lbl">Saisies</div>
        </div>
        <div class="ks-item ks-red">
          <div class="ks-num">{{ nbParStatut("Rejete") }}</div>
          <div class="ks-lbl">Rejetées</div>
        </div>
      </div>
    </div>
  </div>

  <!-- ══ TABLE ══ -->
  <div class="table-card">

    <!-- Barre résultats -->
    <div class="table-topbar" *ngIf="collectesFiltrees().length">
      <span class="results-count">{{ collectesFiltrees().length }} collecte(s)</span>
      <div class="statut-chips">
        <button class="chip" [class.chip-active]="filtreRapide===''" (click)="filtreRapide=''">Tous</button>
        <button class="chip chip-green"  [class.chip-active]="filtreRapide==='Valide'"          (click)="toggleRapide('Valide')">✓ Validées</button>
        <button class="chip chip-blue"   [class.chip-active]="filtreRapide==='SoumisComptable'" (click)="toggleRapide('SoumisComptable')">↑ En attente</button>
        <button class="chip chip-amber"  [class.chip-active]="filtreRapide==='Saisie'"          (click)="toggleRapide('Saisie')">✎ Saisies</button>
        <button class="chip chip-red"    [class.chip-active]="filtreRapide==='Rejete'"          (click)="toggleRapide('Rejete')">✕ Rejetées</button>
      </div>
    </div>

    <table class="data-table" *ngIf="collectesFiltrees().length; else empty">
      <thead><tr>
        <th>Locataire</th>
        <th>Bien</th>
        <th>Période</th>
        <th class="text-right">Attendu</th>
        <th class="text-right">Encaissé</th>
        <th class="text-right">Écart</th>
        <th>Mode</th>
        <th>Collecteur</th>
        <th class="text-center">Statut</th>
        <th class="text-center">Actions</th>
      </tr></thead>
      <tbody>
        <tr *ngFor="let c of collectesFiltrees()"
            [class.row-valide]="c.statutLabel==='Valide'"
            [class.row-rejete]="c.statutLabel==='Rejete'">
          <td>
            <div class="cell-main">{{ c.locataireNom }}</div>
            <div class="cell-sub">{{ c.locataireTel }}</div>
          </td>
          <td><span class="num-badge">{{ c.produitCode }}</span></td>
          <td class="text-muted">{{ c.periodeMois }}</td>
          <td class="text-right text-muted">{{ c.montantAttendu | number:"1.0-0" }}</td>
          <td class="text-right" style="font-weight:700">{{ c.montantEncaisse | number:"1.0-0" }}</td>
          <td class="text-right">
            <span class="ecart-badge"
                  [class.ecart-pos]="c.ecart > 0"
                  [class.ecart-neg]="c.ecart < 0"
                  [class.ecart-neu]="c.ecart === 0">
              {{ c.ecart !== 0 ? (c.ecart > 0 ? "+" : "") + (c.ecart | number:"1.0-0") : "—" }}
            </span>
          </td>
          <td class="text-muted">{{ c.modeLabel }}</td>
          <td>
            <div class="collecteur-tag">
              <div class="ct-avatar">{{ (c.collecteurNom || "?")[0] }}</div>
              <span class="ct-nom">{{ c.collecteurNom }}</span>
            </div>
          </td>
          <td class="text-center">
            <span class="statut-badge" [ngClass]="'sb-' + c.statutLabel.toLowerCase()">
              {{ statutIcon(c.statutLabel) }} {{ statutLibelle(c.statutLabel) }}
            </span>
          </td>
          <td class="text-center">
            <div class="row-actions">
              <button *ngIf="isComptable() && c.statutLabel==='SoumisComptable'"
                      class="btn-action btn-valider" (click)="valider(c)" title="Valider">
                <span class="mi">check</span>
              </button>
              <button *ngIf="isComptable() && c.statutLabel==='SoumisComptable'"
                      class="btn-action btn-rejeter" (click)="rejeter(c)" title="Rejeter">
                <span class="mi">close</span>
              </button>
              <button *ngIf="c.statutLabel==='Saisie'"
                      class="btn-action btn-soumettre" (click)="soumettre(c)" title="Soumettre">
                <span class="mi">upload</span>
              </button>
            </div>
          </td>
        </tr>
      </tbody>
    </table>

    <ng-template #empty>
      <div class="empty-state">
        <span class="mi" style="font-size:48px;color:#cbd5e1">payments</span>
        <div class="empty-title">Aucune collecte pour cette période</div>
        <div class="empty-sub">Modifiez les filtres ou saisissez une nouvelle collecte</div>
        <a routerLink="/collectes/saisir" class="btn btn-gold" style="margin-top:8px">
          <span class="mi">add</span> Saisir une collecte
        </a>
      </div>
    </ng-template>
  </div>

</div>
  `,
  styles: [`
    /* ── Filtres ── */
    .filters-panel { display:flex; align-items:flex-end; gap:12px; flex-wrap:wrap; margin-bottom:18px; background:#fff; border-radius:12px; padding:14px 16px; box-shadow:0 2px 10px rgba(14,28,56,.06); border:1px solid #e8edf5; }
    .mode-toggle { display:flex; gap:4px; background:#f1f5f9; border-radius:8px; padding:3px; }
    .mode-btn { display:flex; align-items:center; gap:5px; padding:5px 12px; border-radius:6px; border:none; background:none; font-size:12px; font-weight:600; color:#64748b; cursor:pointer; transition:all .15s; }
    .mode-btn .mi { font-size:15px; }
    .mode-btn.active { background:#fff; color:#0e1c38; box-shadow:0 1px 4px rgba(14,28,56,.1); }
    .filter-group { display:flex; flex-direction:column; gap:4px; }
    .filter-label { font-size:10px; font-weight:600; color:#94a3b8; text-transform:uppercase; letter-spacing:.5px; }
    .filter-input { padding:7px 10px; border:1.5px solid #e2e8f0; border-radius:8px; font-size:12px; background:#f8fafc; color:#0e1c38; min-width:130px; }
    .filter-input:focus { outline:none; border-color:#0e1c38; }
    .btn-reset { padding:7px 10px; border-radius:8px; border:1.5px solid #e2e8f0; background:#fff; color:#94a3b8; cursor:pointer; display:flex; align-items:center; margin-top:18px; }
    .btn-reset:hover { color:#dc2626; border-color:#fca5a5; }
    .btn-reset .mi { font-size:18px; }

    /* ── KPIs ── */
    .kpi-band { display:grid; grid-template-columns:1fr 1fr 1fr 1fr; gap:14px; margin-bottom:18px; }
    .kpi-card { background:#fff; border-radius:12px; padding:16px; display:flex; align-items:center; gap:12px; box-shadow:0 2px 10px rgba(14,28,56,.07); border:1px solid #e8edf5; }
    .kpi-icon-wrap { font-size:24px; flex-shrink:0; }
    .kpi-label { font-size:11px; color:#64748b; text-transform:uppercase; letter-spacing:.5px; margin-bottom:3px; }
    .kpi-val { font-size:20px; font-weight:800; color:#0e1c38; }
    .kpi-unit { font-size:11px; font-weight:400; color:#94a3b8; }
    .kpi-encaisse { border-top:3px solid #16a34a; }
    .kpi-attendu  { border-top:3px solid #3b82f6; }
    .kpi-ecart-pos { border-top:3px solid #16a34a; }
    .kpi-ecart-neg { border-top:3px solid #dc2626; }
    .kpi-stats { flex-direction:column; align-items:stretch; padding:12px 16px; }
    .kpi-stats-grid { display:grid; grid-template-columns:1fr 1fr; gap:8px; }
    .ks-item { text-align:center; padding:6px; border-radius:8px; }
    .ks-num { font-size:18px; font-weight:800; }
    .ks-lbl { font-size:9px; font-weight:600; text-transform:uppercase; letter-spacing:.5px; margin-top:1px; }
    .ks-green { background:#d1fae5; } .ks-green .ks-num { color:#065f46; } .ks-green .ks-lbl { color:#16a34a; }
    .ks-blue  { background:#dbeafe; } .ks-blue  .ks-num { color:#1e40af; } .ks-blue  .ks-lbl { color:#3b82f6; }
    .ks-amber { background:#fef3c7; } .ks-amber .ks-num { color:#92400e; } .ks-amber .ks-lbl { color:#d97706; }
    .ks-red   { background:#fee2e2; } .ks-red   .ks-num { color:#991b1b; } .ks-red   .ks-lbl { color:#dc2626; }

    /* ── Table ── */
    .table-card { background:#fff; border-radius:14px; overflow:hidden; box-shadow:0 2px 12px rgba(14,28,56,.08); border:1px solid #e8edf5; }
    .table-topbar { display:flex; align-items:center; justify-content:space-between; padding:12px 16px; border-bottom:1px solid #f1f5f9; }
    .results-count { font-size:12px; font-weight:600; color:#64748b; }
    .statut-chips { display:flex; gap:6px; flex-wrap:wrap; }
    .chip { padding:4px 10px; border-radius:20px; border:1.5px solid #e2e8f0; background:#fff; font-size:11px; font-weight:600; color:#64748b; cursor:pointer; transition:all .15s; }
    .chip.chip-active, .chip:hover { border-color:#0e1c38; color:#0e1c38; background:#f8fafc; }
    .chip-green.chip-active  { background:#d1fae5; border-color:#86efac; color:#065f46; }
    .chip-blue.chip-active   { background:#dbeafe; border-color:#93c5fd; color:#1e40af; }
    .chip-amber.chip-active  { background:#fef3c7; border-color:#fde68a; color:#92400e; }
    .chip-red.chip-active    { background:#fee2e2; border-color:#fca5a5; color:#991b1b; }
    .data-table { width:100%; border-collapse:collapse; }
    .data-table th { padding:11px 14px; background:#f8fafc; font-size:10px; font-weight:700; color:#64748b; text-align:left; border-bottom:1px solid #e2e8f0; text-transform:uppercase; letter-spacing:.5px; }
    .data-table td { padding:11px 14px; font-size:13px; color:#334155; border-bottom:1px solid #f8fafc; }
    .data-table tr:hover td { background:#fafbff; }
    .data-table tr:last-child td { border-bottom:none; }
    .row-valide td { background:#fafffe; }
    .row-rejete td { background:#fff8f8; }
    .cell-main { font-weight:600; color:#0e1c38; }
    .cell-sub { font-size:11px; color:#94a3b8; margin-top:1px; }
    .text-right { text-align:right; }
    .text-center { text-align:center; }
    .text-muted { color:#94a3b8; font-size:12px; }
    .num-badge { font-family:monospace; background:#f1f5f9; padding:3px 8px; border-radius:6px; font-size:.78rem; color:#0e1c38; font-weight:700; }
    .ecart-badge { padding:2px 8px; border-radius:8px; font-size:11px; font-weight:700; }
    .ecart-pos { background:#d1fae5; color:#065f46; }
    .ecart-neg { background:#fee2e2; color:#991b1b; }
    .ecart-neu { color:#94a3b8; }
    .collecteur-tag { display:flex; align-items:center; gap:6px; }
    .ct-avatar { width:22px; height:22px; background:#0e1c38; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:10px; font-weight:700; color:#c9a96e; flex-shrink:0; }
    .ct-nom { font-size:12px; color:#475569; }
    .statut-badge { padding:3px 10px; border-radius:20px; font-size:11px; font-weight:600; display:inline-flex; align-items:center; gap:4px; white-space:nowrap; }
    .sb-saisie         { background:#fef3c7; color:#92400e; }
    .sb-soumiscomptable { background:#dbeafe; color:#1e40af; }
    .sb-valide         { background:#d1fae5; color:#065f46; }
    .sb-rejete         { background:#fee2e2; color:#991b1b; }
    .row-actions { display:flex; gap:4px; justify-content:center; }
    .btn-action { width:28px; height:28px; border:none; border-radius:7px; cursor:pointer; display:flex; align-items:center; justify-content:center; transition:opacity .15s; }
    .btn-action .mi { font-size:16px; }
    .btn-action:hover { opacity:.8; }
    .btn-valider  { background:#d1fae5; color:#065f46; }
    .btn-rejeter  { background:#fee2e2; color:#991b1b; }
    .btn-soumettre { background:#dbeafe; color:#1e40af; }
    .empty-state { display:flex; flex-direction:column; align-items:center; padding:60px; gap:8px; }
    .empty-title { font-size:14px; font-weight:600; color:#334155; }
    .empty-sub { font-size:12px; color:#94a3b8; }
  `]
})
export class CollectesListComponent implements OnInit {
  private svc         = inject(CollectesService);
  private auth        = inject(AuthService);
  private personnelSvc = inject(PersonnelService);

  collectes: PagedList<CollecteDto> = {
    items: [], totalCount: 0, page: 1, pageSize: 100, totalPages: 0, hasNext: false, hasPrevious: false
  };
  collecteurs: any[] = [];

  modeFiltre       = 'mois';
  filtreMois       = this.currentMonth();
  periodeDebut     = '';
  periodeFin       = '';
  filtreStatut     = '';
  filtreCollecteur = '';
  filtreProduit    = '';
  filtreRapide     = '';

  ngOnInit() {
    this.load();
    if (this.isDirection()) {
      this.personnelSvc.getAll().subscribe(r => {
        this.collecteurs = r.items.filter((p: any) =>
          p.typeLabel === 'Collecteur'
        );
      });
    }
  }

  setMode(m: string) {
    this.modeFiltre = m;
    if (m === 'mois') { this.periodeDebut = ''; this.periodeFin = ''; }
    else               { this.filtreMois = ''; }
    this.load();
  }

  load() {
    const opts: any = { statut: (this.filtreStatut as StatutCollecte) || undefined };
    if (this.modeFiltre === 'mois' && this.filtreMois) opts.periodeMois = this.filtreMois;
    if (this.filtreCollecteur) opts.collecteurId = this.filtreCollecteur;
    this.svc.getAll(opts).subscribe(r => { this.collectes = r; });
  }

  filtrerLocalement() { /* filtreProduit appliqué dans collectesFiltrees() */ }

  collectesFiltrees(): CollecteDto[] {
    let items = this.collectes.items;
    if (this.modeFiltre === 'periode' && this.periodeDebut && this.periodeFin) {
      items = items.filter(c => c.periodeMois >= this.periodeDebut && c.periodeMois <= this.periodeFin);
    }
    if (this.filtreProduit) {
      const q = this.filtreProduit.toLowerCase().trim();
      items = items.filter(c => c.produitCode?.toLowerCase().includes(q));
    }
    if (this.filtreRapide) {
      items = items.filter(c => c.statutLabel === this.filtreRapide);
    }
    return items;
  }

  resetFiltres() {
    this.filtreMois = this.currentMonth();
    this.periodeDebut = ''; this.periodeFin = '';
    this.filtreStatut = ''; this.filtreCollecteur = '';
    this.filtreProduit = ''; this.filtreRapide = '';
    this.modeFiltre = 'mois';
    this.load();
  }

  toggleRapide(s: string) { this.filtreRapide = this.filtreRapide === s ? '' : s; }

  totalEncaisse() { return this.collectesFiltrees().reduce((s, c) => s + c.montantEncaisse, 0); }
  totalAttendu()  { return this.collectesFiltrees().reduce((s, c) => s + c.montantAttendu,  0); }
  ecartGlobal()   { return this.totalEncaisse() - this.totalAttendu(); }
  nbParStatut(s: string) { return this.collectesFiltrees().filter(c => c.statutLabel === s).length; }

  valider(c: CollecteDto)  { this.svc.valider(c.id).subscribe(() => this.load()); }
  soumettre(c: CollecteDto){ this.svc.soumettre(c.id).subscribe(() => this.load()); }
  rejeter(c: CollecteDto) {
    const motif = prompt('Motif du rejet :');
    if (!motif) return;
    this.svc.rejeter(c.id, motif).subscribe(() => this.load());
  }

  isComptable()  { return this.auth.isComptable(); }
  isDirection()  { return this.auth.isDirection(); }

  statutIcon(s: string): string {
    return s === 'Valide' ? '✓' : s === 'SoumisComptable' ? '↑' : s === 'Rejete' ? '✕' : '✎';
  }

  statutLibelle(s: string): string {
    return s === 'SoumisComptable' ? 'En attente' :
           s === 'Valide'          ? 'Validée'    :
           s === 'Rejete'          ? 'Rejetée'    : 'Saisie';
  }

  currentMonth(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
  }
}