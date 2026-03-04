// ══════════════════════════════════════════════════════════════
//  PROPRIÉTAIRES DASHBOARD COMPONENT
//  Fichier : proprietaires-dashboard.component.ts
// ══════════════════════════════════════════════════════════════
import { Component, inject, OnInit, signal, computed, OnDestroy } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';
import { ProprietairesService, PersonnelService } from '../../../core/services/api.services';
import {
  DashboardProprietaireDto,
  DashboardProprieteDto,
  StatsDashboardProprietairesDto,
  PagedList,
  PersonnelListItemDto
} from '../../../core/models/models';

@Component({
  selector: 'kdi-proprietaires-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, DecimalPipe],
  template: `
<div class="page">

  <!-- ── HEADER ─────────────────────────────────────────── -->
  <div class="page-header">
    <div>
      <h2 class="page-title">Propriétaires</h2>
      <p class="page-subtitle">Vue consolidée · Propriétés · Produits locatifs</p>
    </div>
    <a routerLink="/proprietaires/nouveau" class="btn btn-primary">＋ Nouveau propriétaire</a>
  </div>

  <!-- ── STATS ──────────────────────────────────────────── -->
  <div class="stats-grid" *ngIf="stats()">
    <div class="stat-card">
      <div class="stat-icon navy">👤</div>
      <div>
        <div class="stat-value">{{ stats()!.totalProprietaires }}</div>
        <div class="stat-label">Propriétaires</div>
      </div>
    </div>
    <div class="stat-card">
      <div class="stat-icon emerald">🏢</div>
      <div>
        <div class="stat-value">{{ stats()!.totalProprietes }}</div>
        <div class="stat-label">Propriétés</div>
      </div>
    </div>
    <div class="stat-card">
      <div class="stat-icon gold">🏠</div>
      <div>
        <div class="stat-value">{{ stats()!.totalProduits }}</div>
        <div class="stat-label">Unités</div>
      </div>
    </div>
    <div class="stat-card">
      <div class="stat-icon blue">📊</div>
      <div>
        <div class="stat-value">{{ stats()!.tauxOccupation | number:'1.0-1' }}%</div>
        <div class="stat-label">Occupation</div>
      </div>
    </div>
  </div>

  <!-- ── RECAP BAR ──────────────────────────────────────── -->
  <div class="recap-bar" *ngIf="stats()">
    <div class="recap-item">
      <div class="recap-value">{{ stats()!.totalLoues }}</div>
      <div class="recap-label">Unités louées</div>
    </div>
    <div class="recap-divider"></div>
    <div class="recap-item">
      <div class="recap-value">{{ stats()!.totalLibres }}</div>
      <div class="recap-label">Unités libres</div>
    </div>
    <div class="recap-divider"></div>
    <div class="recap-item">
      <div class="recap-value">{{ stats()!.totalLoyerMensuel | number:'1.0-0' }}</div>
      <div class="recap-label">MRU collectés/mois</div>
    </div>
    <div class="recap-divider"></div>
    <div class="recap-item">
      <div class="recap-value">{{ stats()!.nbCollecteurs }}</div>
      <div class="recap-label">Collecteurs actifs</div>
    </div>
  </div>

  <!-- ── TOOLBAR ────────────────────────────────────────── -->
  <div class="toolbar">
    <div class="search-box">
      <span class="search-icon">🔍</span>
      <input
        type="text"
        [(ngModel)]="searchTerm"
        (ngModelChange)="onSearch($event)"
        placeholder="Rechercher propriétaire ou résidence…"
        class="search-input" />
      <button *ngIf="searchTerm" class="search-clear" (click)="clearSearch()">✕</button>
    </div>

    <select class="filter-select" [(ngModel)]="selectedCollecteurId" (ngModelChange)="load()">
      <option value="">Tous les collecteurs</option>
      <option *ngFor="let c of collecteurs()" [value]="c.id">{{ c.nomComplet }}</option>
    </select>

    <div class="sort-group">
      <button class="sort-btn" [class.active]="sortBy === 'nom'"      (click)="setSort('nom')">Nom</button>
      <button class="sort-btn" [class.active]="sortBy === 'proprietes'" (click)="setSort('proprietes')">Propriétés</button>
      <button class="sort-dir" (click)="toggleSortDir()">{{ sortAsc ? '↑' : '↓' }}</button>
    </div>

    <button class="expand-btn" (click)="toggleAll()">
      {{ allExpanded ? '⊟ Replier tout' : '⊞ Déplier tout' }}
    </button>
  </div>

  <!-- ── LOADING ────────────────────────────────────────── -->
  <div class="loading" *ngIf="loading()">
    <div class="spinner"></div>
    <span>Chargement…</span>
  </div>

  <!-- ── LISTE ──────────────────────────────────────────── -->
  <div class="prop-list" *ngIf="!loading()">

    <!-- EMPTY STATE -->
    <div class="empty-state" *ngIf="!pagedData()?.items?.length">
      <span>🔍</span>
      <p>Aucun propriétaire trouvé</p>
      <a routerLink="/proprietaires/nouveau" class="btn btn-primary">Créer le premier</a>
    </div>

    <!-- CARDS -->
    <div
      class="prop-card"
      *ngFor="let p of pagedData()?.items; trackBy: trackById"
      [class.expanded]="isExpanded(p.id)">

      <!-- ─ HEADER PROPRIÉTAIRE ─ -->
      <div class="prop-header" (click)="toggle(p.id)">
        <div class="prop-avatar">{{ p.initiales }}</div>

        <div class="prop-info">
          <div class="prop-name" [innerHTML]="highlight(p.nomComplet)"></div>
          <div class="prop-meta">
            <span>📞 {{ p.telephone }}</span>
            <span *ngIf="p.email" class="email-meta">✉ {{ p.email }}</span>
            <ng-container *ngIf="p.collecteurNom; else noCollecteur">
              <span class="collecteur-badge">👷 {{ p.collecteurNom }}</span>
            </ng-container>
            <ng-template #noCollecteur>
              <span class="badge-warn">⚠ Sans collecteur</span>
            </ng-template>
          </div>
        </div>

        <div class="prop-kpis">
          <div class="kpi">
            <div class="kpi-val">{{ p.nombreProprietes }}</div>
            <div class="kpi-lbl">Propriétés</div>
          </div>
          <div class="kpi">
            <div class="kpi-val">{{ p.totalProduits }}</div>
            <div class="kpi-lbl">Unités</div>
          </div>
          <div class="kpi">
            <div class="kpi-val">{{ p.produitsLoues }}/{{ p.totalProduits }}</div>
            <div class="kpi-lbl">Louées</div>
          </div>
          <div class="kpi">
            <div class="kpi-val">{{ (p.totalLoyerMensuel / 1000) | number:'1.0-0' }}k</div>
            <div class="kpi-lbl">MRU/mois</div>
          </div>
        </div>

        <div class="prop-badges">
          <span class="badge" [ngClass]="contratClass(p.statutContratLabel)">
            {{ p.statutContratLabel ?? 'Sans contrat' }}
          </span>
          <span *ngIf="p.periodiciteVersementLabel" class="badge badge-period">
            🔄 {{ p.periodiciteVersementLabel }}
          </span>
        </div>

        <div class="prop-actions" (click)="$event.stopPropagation()">
          <a [routerLink]="['/proprietaires', p.id]" class="action-btn" title="Voir détail">👁</a>
          <a [routerLink]="['/proprietaires', p.id, 'modifier']" class="action-btn" title="Modifier">✏️</a>
        </div>

        <span class="chevron">▾</span>
      </div>

      <!-- ─ BODY : PROPRIÉTÉS ─ -->
      <div class="prop-body" *ngIf="isExpanded(p.id)">
        <div class="prop-body-header">
          <span class="section-title">🏢 {{ p.nombreProprietes }} propriété(s)</span>
          <span class="section-sub">
            {{ p.produitsLoues }} louées · {{ p.produitsLibres }} libres
          </span>
        </div>

        <!-- PROPRIÉTÉ ROW -->
        <div
          class="propriete-row"
          *ngFor="let pr of p.proprietes; trackBy: trackById"
          [class.expanded]="isExpanded(pr.id)">

          <div class="propriete-header" (click)="toggle(pr.id)">
            <div class="propriete-icon">🏢</div>
            <div class="propriete-info">
              <div class="propriete-name" [innerHTML]="highlight(pr.libelle)"></div>
              <div class="propriete-sub">{{ pr.quartier ? pr.quartier + ' · ' : '' }}{{ pr.ville }}</div>
            </div>
            <div class="propriete-kpis">
              <div class="pkpi">
                <span class="pkpi-val">{{ pr.nombreProduits }}</span>
                <span class="pkpi-lbl">Unités</span>
              </div>
              <div class="pkpi">
                <span class="pkpi-val">{{ pr.produitsLoues }}/{{ pr.nombreProduits }}</span>
                <span class="pkpi-lbl">Louées</span>
              </div>
              <div class="pkpi">
                <span class="pkpi-val mono">{{ pr.totalLoyerMensuel | number:'1.0-0' }}</span>
                <span class="pkpi-lbl">MRU/mois</span>
              </div>
            </div>
            <span class="badge" [ngClass]="pr.aContratGestion ? 'badge-actif' : 'badge-warn-sm'">
              {{ pr.aContratGestion ? '✓ Géré' : 'Sans contrat' }}
            </span>
            <div class="propriete-actions" (click)="$event.stopPropagation()">
              <a [routerLink]="['/proprietes', pr.id]" class="action-btn-sm" title="Voir">👁</a>
              <a [routerLink]="['/produits/nouveau']" [queryParams]="{proprieteId: pr.id}" class="action-btn-sm" title="Ajouter unité">＋</a>
            </div>
            <span class="mini-chevron">▾</span>
          </div>

          <!-- PRODUITS TABLE -->
          <div class="produits-section" *ngIf="isExpanded(pr.id)">
            <table class="produits-table">
              <thead>
                <tr>
                  <th>Réf.</th>
                  <th>Type</th>
                  <th class="text-right">Loyer</th>
                  <th>Statut</th>
                  <th>Locataire</th>
                  <th>Contrat</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let pd of pr.produits">
                  <td><span class="code-badge">{{ pd.code }}</span></td>
                  <td>{{ pd.typeLabel }}</td>
                  <td class="text-right mono">{{ pd.loyerReference | number:'1.0-0' }} MRU</td>
                  <td>
                    <span class="status-dot" [ngClass]="statutProduitClass(pd.statutLabel)">
                      {{ pd.statutLabel }}
                    </span>
                  </td>
                  <td class="text-muted">{{ pd.locataireNom ?? '—' }}</td>
                  <td>
                    <span *ngIf="pd.contratNumero" class="contrat-num">{{ pd.contratNumero }}</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        <!-- /PROPRIÉTÉ ROW -->

      </div>
    </div>
    <!-- /CARDS -->

  </div>

  <!-- ── PAGINATION ──────────────────────────────────────── -->
  <div class="pagination" *ngIf="pagedData() && pagedData()!.totalPages > 1">
    <span class="page-info">
      Page {{ currentPage }} / {{ pagedData()!.totalPages }}
      · {{ pagedData()!.totalCount }} propriétaire(s)
    </span>
    <div class="page-btns">
      <button class="page-btn" [disabled]="!pagedData()!.hasPrevious" (click)="changePage(-1)">‹</button>
      <button
        class="page-btn"
        *ngFor="let n of pageNumbers()"
        [class.active]="n === currentPage"
        (click)="goToPage(n)">{{ n }}</button>
      <button class="page-btn" [disabled]="!pagedData()!.hasNext" (click)="changePage(1)">›</button>
    </div>
  </div>

</div>
  `,
  styles: [`
    /* ── PAGE ─────────────────────────────────────────── */
    .page { max-width: 1200px; margin: 0 auto; padding: 28px 20px; }
    .page-header { display:flex; justify-content:space-between; align-items:flex-end; margin-bottom:24px; }
    .page-title  { font-size:24px; font-weight:700; color:#0c1a35; margin:0 0 4px; }
    .page-subtitle { font-size:13px; color:#64748b; margin:0; }

    .btn { padding:9px 18px; border-radius:8px; font-size:13px; font-weight:600;
           cursor:pointer; border:none; display:inline-flex; align-items:center; gap:6px;
           text-decoration:none; transition:all .15s; }
    .btn-primary { background:#0c1a35; color:#fff; }
    .btn-primary:hover { background:#1e3a5f; }

    /* ── STATS ───────────────────────────────────────── */
    .stats-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:14px; margin-bottom:16px; }
    .stat-card { background:#fff; border-radius:12px; padding:16px 18px; border:1px solid #e2e8f0;
                 box-shadow:0 1px 3px rgba(0,0,0,.06); display:flex; align-items:center; gap:12px; }
    .stat-icon { width:40px; height:40px; border-radius:10px; display:flex; align-items:center;
                 justify-content:center; font-size:18px; flex-shrink:0; }
    .stat-icon.navy    { background:#e8edf5; }
    .stat-icon.emerald { background:#d1fae5; }
    .stat-icon.gold    { background:#fef3c7; }
    .stat-icon.blue    { background:#dbeafe; }
    .stat-value { font-size:20px; font-weight:700; color:#0c1a35; line-height:1; }
    .stat-label { font-size:11px; color:#64748b; margin-top:3px; text-transform:uppercase; letter-spacing:.4px; }

    /* ── RECAP BAR ───────────────────────────────────── */
    .recap-bar { background:linear-gradient(135deg,#0c1a35,#1e3a5f); border-radius:12px;
                 padding:16px 24px; display:flex; gap:28px; align-items:center; margin-bottom:18px; }
    .recap-item { text-align:center; }
    .recap-value { font-size:18px; font-weight:700; color:#fff; font-family:monospace; }
    .recap-label { font-size:10px; color:#94a3b8; text-transform:uppercase; letter-spacing:.5px; margin-top:2px; }
    .recap-divider { width:1px; background:rgba(255,255,255,.15); height:36px; }

    /* ── TOOLBAR ─────────────────────────────────────── */
    .toolbar { display:flex; gap:10px; margin-bottom:16px; align-items:center; flex-wrap:wrap; }
    .search-box { position:relative; flex:1; min-width:260px; max-width:380px; }
    .search-icon { position:absolute; left:11px; top:50%; transform:translateY(-50%); font-size:14px; }
    .search-input { width:100%; padding:9px 36px; border:1px solid #e2e8f0; border-radius:8px;
                    font-size:13px; color:#0c1a35; background:#fff; outline:none; transition:border-color .15s; }
    .search-input:focus { border-color:#2d5282; box-shadow:0 0 0 3px rgba(45,82,130,.1); }
    .search-clear { position:absolute; right:10px; top:50%; transform:translateY(-50%);
                    background:none; border:none; cursor:pointer; color:#94a3b8; font-size:14px; }
    .filter-select { padding:9px 12px; border:1px solid #e2e8f0; border-radius:8px;
                     font-size:13px; background:#fff; color:#0c1a35; outline:none; cursor:pointer; }
    .sort-group { display:flex; gap:0; }
    .sort-btn { padding:9px 12px; border:1px solid #e2e8f0; background:#fff; font-size:12px;
                font-weight:600; color:#64748b; cursor:pointer; transition:all .15s; }
    .sort-btn:first-child { border-radius:8px 0 0 8px; }
    .sort-btn.active { background:#0c1a35; color:#fff; border-color:#0c1a35; }
    .sort-dir { padding:9px 10px; border:1px solid #e2e8f0; border-left:none;
                border-radius:0 8px 8px 0; background:#fff; cursor:pointer; font-size:14px; color:#64748b; }
    .expand-btn { margin-left:auto; padding:9px 14px; border:1px solid #e2e8f0; border-radius:8px;
                  background:#fff; font-size:12px; color:#64748b; cursor:pointer; white-space:nowrap;
                  transition:all .15s; }
    .expand-btn:hover { border-color:#0c1a35; color:#0c1a35; }

    /* ── LOADING ─────────────────────────────────────── */
    .loading { display:flex; align-items:center; justify-content:center; gap:12px;
               padding:60px; color:#64748b; font-size:14px; }
    .spinner { width:24px; height:24px; border:3px solid #e2e8f0; border-top-color:#0c1a35;
               border-radius:50%; animation:spin .7s linear infinite; }
    @keyframes spin { to { transform:rotate(360deg); } }

    /* ── PROP CARD ───────────────────────────────────── */
    .prop-list  { display:flex; flex-direction:column; gap:10px; }
    .prop-card  { background:#fff; border-radius:12px; border:1px solid #e2e8f0;
                  box-shadow:0 1px 3px rgba(0,0,0,.06); overflow:hidden; transition:box-shadow .2s; }
    .prop-card:hover { box-shadow:0 4px 16px rgba(0,0,0,.1); }
    .prop-card.expanded { border-color:#b8cceb; }

    .prop-header { padding:14px 18px; display:flex; align-items:center; gap:14px;
                   cursor:pointer; user-select:none; transition:background .15s; }
    .prop-header:hover { background:#fafbfd; }

    .prop-avatar { width:40px; height:40px; border-radius:50%; flex-shrink:0;
                   background:linear-gradient(135deg,#0c1a35,#2d5282);
                   color:#fff; font-weight:700; font-size:14px;
                   display:flex; align-items:center; justify-content:center; }

    .prop-info  { flex:1; min-width:0; }
    .prop-name  { font-size:14px; font-weight:600; color:#0c1a35; }
    .prop-meta  { font-size:11px; color:#94a3b8; margin-top:3px; display:flex; gap:10px; flex-wrap:wrap; align-items:center; }
    .email-meta { color:#94a3b8; }

    .prop-kpis { display:flex; gap:18px; }
    .kpi { text-align:right; }
    .kpi-val { font-size:14px; font-weight:700; color:#0c1a35; font-family:monospace; }
    .kpi-lbl { font-size:10px; color:#94a3b8; text-transform:uppercase; letter-spacing:.3px; }

    .prop-badges { display:flex; gap:6px; flex-wrap:wrap; }
    .badge       { padding:3px 9px; border-radius:20px; font-size:11px; font-weight:600; }
    .badge-actif    { background:#d1fae5; color:#065f46; }
    .badge-brouillon{ background:#f1f5f9; color:#64748b; }
    .badge-period   { background:#fef3c7; color:#92400e; }
    .badge-warn     { background:#fee2e2; color:#991b1b; font-size:11px; font-weight:600; padding:2px 8px; border-radius:20px; }
    .badge-warn-sm  { background:#fef3c7; color:#92400e; }

    .prop-actions { display:flex; gap:4px; }
    .action-btn { width:28px; height:28px; border-radius:6px; background:#f1f5f9; border:none;
                  cursor:pointer; display:flex; align-items:center; justify-content:center;
                  font-size:14px; text-decoration:none; transition:background .15s; }
    .action-btn:hover { background:#e2e8f0; }

    .chevron { color:#94a3b8; font-size:16px; transition:transform .25s; flex-shrink:0; }
    .prop-card.expanded .prop-header .chevron { transform:rotate(180deg); }

    .collecteur-badge { background:#fef3c7; color:#92400e; padding:2px 7px;
                        border-radius:20px; font-size:10px; font-weight:600; }

    /* ── PROP BODY ───────────────────────────────────── */
    .prop-body { border-top:1px solid #e2e8f0; background:#fafbfd; }
    .prop-body-header { padding:10px 18px; display:flex; justify-content:space-between;
                        align-items:center; border-bottom:1px solid #e2e8f0; }
    .section-title { font-size:11px; font-weight:600; color:#64748b; text-transform:uppercase; letter-spacing:.5px; }
    .section-sub   { font-size:11px; color:#94a3b8; }

    /* ── PROPRIÉTÉ ROW ───────────────────────────────── */
    .propriete-row { border-bottom:1px solid #f1f5f9; }
    .propriete-row:last-child { border-bottom:none; }

    .propriete-header { padding:11px 18px 11px 36px; display:flex; align-items:center;
                        gap:12px; cursor:pointer; transition:background .15s; }
    .propriete-header:hover { background:#f1f5f9; }

    .propriete-icon { width:30px; height:30px; border-radius:7px; background:#e8edf5;
                      display:flex; align-items:center; justify-content:center; font-size:15px; flex-shrink:0; }
    .propriete-info { flex:1; min-width:0; }
    .propriete-name { font-size:13px; font-weight:600; color:#0c1a35; }
    .propriete-sub  { font-size:11px; color:#94a3b8; margin-top:1px; }

    .propriete-kpis { display:flex; gap:14px; }
    .pkpi { display:flex; flex-direction:column; align-items:flex-end; }
    .pkpi-val { font-size:12px; font-weight:700; color:#0c1a35; }
    .pkpi-lbl { font-size:9px; color:#94a3b8; text-transform:uppercase; }
    .mono { font-family:monospace; }

    .propriete-actions { display:flex; gap:4px; }
    .action-btn-sm { width:24px; height:24px; border-radius:5px; background:#f1f5f9; border:none;
                     cursor:pointer; display:flex; align-items:center; justify-content:center;
                     font-size:12px; text-decoration:none; }
    .action-btn-sm:hover { background:#e2e8f0; }

    .mini-chevron { color:#94a3b8; font-size:13px; transition:transform .2s; flex-shrink:0; }
    .propriete-row.expanded .mini-chevron { transform:rotate(180deg); }

    /* ── PRODUITS TABLE ──────────────────────────────── */
    .produits-section { background:#f8fafc; border-top:1px solid #f1f5f9; }
    .produits-table { width:100%; border-collapse:collapse; }
    .produits-table th { padding:7px 12px 7px 54px; font-size:10px; font-weight:600; color:#94a3b8;
                         text-transform:uppercase; letter-spacing:.5px; text-align:left;
                         border-bottom:1px solid #e2e8f0; background:#f1f5f9; }
    .produits-table th:not(:first-child) { padding-left:12px; }
    .produits-table td { padding:9px 12px 9px 54px; font-size:12px; color:#334155;
                         border-bottom:1px solid #f8fafc; }
    .produits-table td:not(:first-child) { padding-left:12px; }
    .produits-table tr:last-child td { border-bottom:none; }
    .produits-table tbody tr:hover { background:#eef2f8; }
    .text-right { text-align:right; }
    .text-muted { color:#94a3b8; }

    .code-badge { font-family:monospace; background:#e8edf5; padding:2px 7px;
                  border-radius:5px; font-size:11px; color:#0c1a35; font-weight:700; }
    .contrat-num { font-family:monospace; background:#fef3c7; color:#92400e;
                   padding:2px 7px; border-radius:5px; font-size:10px; font-weight:700; }

    .status-dot { display:inline-flex; align-items:center; gap:5px; font-size:11px; font-weight:600; }
    .status-dot::before { content:''; width:6px; height:6px; border-radius:50%; flex-shrink:0; }
    .status-dot.loue      { color:#065f46; }
    .status-dot.loue::before    { background:#10b981; }
    .status-dot.libre     { color:#d97706; }
    .status-dot.libre::before   { background:#f59e0b; }
    .status-dot.travaux   { color:#991b1b; }
    .status-dot.travaux::before { background:#ef4444; }
    .status-dot.reserve   { color:#2d5282; }
    .status-dot.reserve::before { background:#3b82f6; }

    /* ── PAGINATION ──────────────────────────────────── */
    .pagination { display:flex; justify-content:space-between; align-items:center; margin-top:20px; }
    .page-info  { font-size:13px; color:#64748b; }
    .page-btns  { display:flex; gap:5px; }
    .page-btn   { width:32px; height:32px; border-radius:7px; border:1px solid #e2e8f0;
                  background:#fff; font-size:13px; cursor:pointer; display:flex;
                  align-items:center; justify-content:center; color:#0c1a35; transition:all .15s; }
    .page-btn:hover   { border-color:#0c1a35; }
    .page-btn.active  { background:#0c1a35; color:#fff; border-color:#0c1a35; }
    .page-btn:disabled { opacity:.35; cursor:not-allowed; }

    /* ── EMPTY STATE ─────────────────────────────────── */
    .empty-state { display:flex; flex-direction:column; align-items:center; padding:60px;
                   gap:12px; color:#94a3b8; font-size:14px; }
    .empty-state span { font-size:40px; }

    /* ── HIGHLIGHT ───────────────────────────────────── */
    :global(.hl) { background:#fef08a; border-radius:2px; padding:0 2px; }
  `]
})
export class ProprietairesDashboardComponent implements OnInit, OnDestroy {
  private svc         = inject(ProprietairesService);
  private personnelSvc= inject(PersonnelService);
  private destroy$    = new Subject<void>();
  private search$     = new Subject<string>();

  // ── State ──────────────────────────────────────────────────
  loading     = signal(false);
  pagedData   = signal<PagedList<DashboardProprietaireDto> | null>(null);
  stats       = signal<StatsDashboardProprietairesDto | null>(null);
  collecteurs = signal<PersonnelListItemDto[]>([]);

  expandedIds = signal<Set<string>>(new Set());
  allExpanded = false;

  searchTerm          = '';
  selectedCollecteurId= '';
  sortBy              = 'nom';
  sortAsc             = true;
  currentPage         = 1;

  // ── Init ───────────────────────────────────────────────────
  ngOnInit() {
    // debounce search
    this.search$.pipe(
      debounceTime(350),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(() => {
      this.currentPage = 1;
      this.load();
    });

    this.loadCollecteurs();
    this.load();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ── Load ───────────────────────────────────────────────────
  load() {
    this.loading.set(true);
    this.svc.getDashboard({
      page:         this.currentPage,
      search:       this.searchTerm || undefined,
      sortBy:       this.sortBy,
      sortAsc:      this.sortAsc,
      collecteurId: this.selectedCollecteurId || undefined
    }).subscribe({
      next: r => {
        this.pagedData.set(r.items);
        this.stats.set(r.stats);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  loadCollecteurs() {
    this.personnelSvc.getAll(1).subscribe(r => {
      // Filtrer uniquement les collecteurs
      this.collecteurs.set(r.items.filter(p => p.typeLabel === 'Collecteur'));
    });
  }

  // ── Search ─────────────────────────────────────────────────
  onSearch(val: string) { this.search$.next(val); }
  clearSearch() { this.searchTerm = ''; this.search$.next(''); }

  // ── Sort ───────────────────────────────────────────────────
  setSort(by: string) {
    if (this.sortBy === by) { this.sortAsc = !this.sortAsc; }
    else { this.sortBy = by; this.sortAsc = true; }
    this.load();
  }
  toggleSortDir() { this.sortAsc = !this.sortAsc; this.load(); }

  // ── Expand / collapse ──────────────────────────────────────
  toggle(id: string) {
    const s = new Set(this.expandedIds());
    s.has(id) ? s.delete(id) : s.add(id);
    this.expandedIds.set(s);
  }

  isExpanded(id: string) { return this.expandedIds().has(id); }

  toggleAll() {
    this.allExpanded = !this.allExpanded;
    if (this.allExpanded) {
      const all = new Set<string>();
      this.pagedData()?.items.forEach(p => {
        all.add(p.id);
        p.proprietes.forEach(pr => all.add(pr.id));
      });
      this.expandedIds.set(all);
    } else {
      this.expandedIds.set(new Set());
    }
  }

  // ── Pagination ─────────────────────────────────────────────
  changePage(delta: number) { this.goToPage(this.currentPage + delta); }
  goToPage(n: number) {
    this.currentPage = n;
    this.expandedIds.set(new Set()); // replier à la pagination
    this.load();
  }

  pageNumbers(): number[] {
    const total = this.pagedData()?.totalPages ?? 1;
    return Array.from({ length: Math.min(total, 7) }, (_, i) => i + 1);
  }

  // ── Helpers ────────────────────────────────────────────────
  trackById(_: number, item: { id: string }) { return item.id; }

  highlight(text: string): string {
    if (!this.searchTerm?.trim()) return text;
    const re = new RegExp(`(${this.searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    return text.replace(re, '<span class="hl">$1</span>');
  }

  contratClass(statut?: string): Record<string, boolean> {
    return {
      'badge-actif':     statut === 'Actif',
      'badge-brouillon': statut === 'Brouillon' || !statut,
    };
  }

  statutProduitClass(statut: string): Record<string, boolean> {
    return {
      'loue':    statut === 'Loue',
      'libre':   statut === 'Libre',
      'travaux': statut === 'EnTravaux',
      'reserve': statut === 'Reserve',
    };
  }
}