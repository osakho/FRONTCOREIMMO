import { Component, inject, OnInit, signal, ViewChild } from '@angular/core';
import { CommonModule, DecimalPipe, DatePipe }           from '@angular/common';
import { RouterLink }                                     from '@angular/router';
import { FormsModule }                                    from '@angular/forms';
import { ProprietesService }                              from '../../../core/services/api.services';
import { ProprieteListItemDto }                           from '../../../core/models/models';
import { ProprieteModalComponent }                        from '../form/propriete-modal.component';

@Component({
  selector: 'kdi-proprietes-list',
  standalone: true,
  imports: [CommonModule, DecimalPipe, DatePipe, RouterLink, FormsModule, ProprieteModalComponent],
  template: `

<div class="page">

  <!-- ── En-tête ── -->
  <div class="page-header">
    <div>
      <h2 class="page-title">Propriétés</h2>
      <p class="page-sub">{{ total() }} propriété(s) enregistrée(s)</p>
    </div>
    <!-- ✅ Le bouton ouvre le modal -->
    <button class="btn-add" (click)="modal.open()">
      + Nouvelle propriété
    </button>
  </div>

  <!-- ── Barre de recherche ── -->
  <div class="search-bar">
    <span>🔍</span>
    <input
      type="text"
      placeholder="Rechercher par nom, adresse, propriétaire…"
      [(ngModel)]="searchQuery"
      (input)="onSearch()"
    />
    <span *ngIf="searchQuery" class="clear" (click)="clearSearch()">✕</span>
  </div>

  <!-- ── Tableau ── -->
  <div class="table-card" *ngIf="items().length; else empty">
    <table>
      <thead>
        <tr>
          <th>Propriété</th>
          <th>Propriétaire</th>
          <th>Adresse</th>
          <th class="r">Produits</th>
          <th class="r">Libres</th>
          <th>Contrat gestion</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        <tr *ngFor="let p of items()">
          <td>
            <div class="prop-name">{{ p.libelle }}</div>
            <div class="prop-meta">{{ p.quartier }}</div>
          </td>
          <td>{{ p.proprietaireNom }}</td>
          <td class="text-muted">{{ p.adresse }}</td>
          <td class="r mono">{{ p.nombreProduits }}</td>
          <td class="r">
            <span [class.badge-ok]="p.nombreLibres === 0"
                  [class.badge-warn]="p.nombreLibres > 0"
                  class="badge">
              {{ p.nombreLibres }}
            </span>
          </td>
          <td>
            <span class="badge" [class.badge-ok]="p.aContratGestion" [class.badge-muted]="!p.aContratGestion">
              {{ p.aContratGestion ? '✓ Actif' : '— Aucun' }}
            </span>
          </td>
          <td>
            <a [routerLink]="['/proprietes', p.id]" class="btn-action">Voir →</a>
          </td>
        </tr>
      </tbody>
    </table>

    <!-- Pagination -->
    <div class="pagination" *ngIf="totalPages() > 1">
      <button [disabled]="page() === 1" (click)="goTo(page() - 1)">‹</button>
      <span>Page {{ page() }} / {{ totalPages() }}</span>
      <button [disabled]="page() === totalPages()" (click)="goTo(page() + 1)">›</button>
    </div>
  </div>

  <ng-template #empty>
    <div class="empty-state" *ngIf="!loading()">
      <div class="empty-icon">🏢</div>
      <div class="empty-title">Aucune propriété trouvée</div>
      <div class="empty-sub">Cliquez sur « + Nouvelle propriété » pour commencer</div>
      <button class="btn-add" style="margin-top:16px" (click)="modal.open()">
        + Nouvelle propriété
      </button>
    </div>
    <div class="loading-state" *ngIf="loading()">
      <div class="spinner"></div>
      <p>Chargement…</p>
    </div>
  </ng-template>

</div>

<!-- ✅ Le modal — une seule ligne suffit -->
<kdi-propriete-modal #modal (created)="onCreated($event)" />
  `,
  styles: [`
    :host {
      --gold:     #C9A84C; --gold-dark: #8B6914;
      --ink:      #0D0D0D; --ink-mid:   #1A1A2E; --ink-soft: #2D2D4A;
      --cream:    #F8F4ED; --cream-dk:  #EDE8DF; --muted:    #8A8899;
      --ok:       #1A7A4A; --ok-bg:     #E6F5EE;
      --warn:     #D4850A; --warn-bg:   #FEF3E2;
      --danger:   #C0392B;
    }
    .page { max-width: 1300px; margin: 0 auto; }
    .page-header { display:flex; justify-content:space-between; align-items:flex-end; margin-bottom:22px; flex-wrap:wrap; gap:12px; }
    .page-title  { font-size:22px; font-weight:700; color:var(--ink); margin-bottom:2px; }
    .page-sub    { font-size:13px; color:var(--muted); }

    .btn-add {
      padding:9px 20px; background:var(--ink-mid); color:var(--gold-light,#E8C96A);
      border:none; border-radius:9px; font-size:13.5px; font-weight:600;
      cursor:pointer; font-family:inherit; transition:background .18s;
    }
    .btn-add:hover { background:var(--ink-soft); }

    .search-bar {
      display:flex; align-items:center; gap:10px;
      background:#fff; border:1.5px solid var(--cream-dk);
      border-radius:10px; padding:10px 16px; margin-bottom:18px;
      transition:border-color .18s;
    }
    .search-bar:focus-within { border-color:var(--gold); }
    .search-bar input { flex:1; border:none; outline:none; font-size:13.5px; font-family:inherit; background:transparent; }
    .search-bar input::placeholder { color:#c0bcc8; }
    .clear { color:var(--muted); cursor:pointer; font-size:12px; }
    .clear:hover { color:var(--danger); }

    .table-card { background:#fff; border-radius:12px; overflow:hidden; box-shadow:0 2px 10px rgba(0,0,0,.07); }
    table { width:100%; border-collapse:collapse; }
    thead th { padding:11px 15px; background:#f8f9fc; font-size:11px; font-weight:700; letter-spacing:.7px; text-transform:uppercase; color:var(--muted); border-bottom:1px solid var(--cream-dk); text-align:left; }
    thead th.r { text-align:right; }
    tbody td { padding:13px 15px; font-size:13.5px; color:var(--ink-soft); border-bottom:1px solid var(--cream-dk); vertical-align:middle; }
    tbody tr:last-child td { border-bottom:none; }
    tbody tr:hover td { background:rgba(201,168,76,.03); }
    td.r { text-align:right; }
    td.mono { font-family:monospace; font-weight:600; }
    td.text-muted { color:var(--muted); font-size:12.5px; }
    .prop-name { font-weight:600; font-size:13.5px; }
    .prop-meta { font-size:11.5px; color:var(--muted); margin-top:1px; }

    .badge { display:inline-flex; padding:3px 9px; border-radius:20px; font-size:11px; font-weight:700; }
    .badge-ok   { background:var(--ok-bg);  color:var(--ok); }
    .badge-warn { background:var(--warn-bg); color:var(--warn); }
    .badge-muted{ background:var(--cream-dk); color:var(--muted); }

    .btn-action { font-size:12.5px; color:var(--gold-dark); font-weight:700; text-decoration:none; }
    .btn-action:hover { text-decoration:underline; }

    .pagination { display:flex; align-items:center; justify-content:center; gap:16px; padding:14px; border-top:1px solid var(--cream-dk); font-size:13px; color:var(--muted); }
    .pagination button { width:30px; height:30px; border-radius:7px; border:1.5px solid var(--cream-dk); background:#fff; cursor:pointer; font-size:14px; }
    .pagination button:disabled { opacity:.4; cursor:not-allowed; }

    .empty-state { text-align:center; padding:60px 20px; }
    .empty-icon  { font-size:48px; margin-bottom:12px; }
    .empty-title { font-size:16px; font-weight:700; color:var(--ink); margin-bottom:6px; }
    .empty-sub   { font-size:13px; color:var(--muted); }

    .loading-state { display:flex; flex-direction:column; align-items:center; padding:60px; gap:14px; color:var(--muted); }
    .spinner { width:32px; height:32px; border:3px solid var(--cream-dk); border-top-color:var(--ink-mid); border-radius:50%; animation:spin .8s linear infinite; }
    @keyframes spin { to { transform:rotate(360deg); } }
  `]
})
export class ProprietesListComponent implements OnInit {

  // ✅ Référence vers le modal dans le template
  @ViewChild('modal') modal!: ProprieteModalComponent;

  private svc = inject(ProprietesService);

  items      = signal<ProprieteListItemDto[]>([]);
  total      = signal(0);
  page       = signal(1);
  totalPages = signal(1);
  loading    = signal(false);
  searchQuery = '';
  private searchTimer: any;

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading.set(true);
    this.svc.getAll(this.page(), 20, this.searchQuery || undefined)
      .subscribe({
        next: res => {
          this.items.set(res.items);
          this.total.set(res.totalCount);
          this.totalPages.set(res.totalPages);
          this.loading.set(false);
        },
        error: () => this.loading.set(false)
      });
  }

  onSearch(): void {
    clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => {
      this.page.set(1);
      this.load();
    }, 350);
  }

  clearSearch(): void {
    this.searchQuery = '';
    this.page.set(1);
    this.load();
  }

  goTo(p: number): void {
    this.page.set(p);
    this.load();
  }

  // ✅ Appelé automatiquement quand le modal confirme la création
  onCreated(id: string): void {
    this.load(); // recharge la liste
  }
}