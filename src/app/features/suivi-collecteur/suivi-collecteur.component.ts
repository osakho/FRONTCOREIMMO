import { Component, inject, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RecouvrementService, AuthService } from '../../core/services/api.services';

// ── DTO ──────────────────────────────────────────────────────────────────────
export interface LigneRecouvrementDto {
  collecteurId:      string;
  collecteurNom:     string;
  proprietaireId:    string;
  proprietaireNom:   string;
  proprieteLibelle:  string;
  produitId:         string;
  produitCode:       string;
  loyerReference:    number;
  locataireId:       string;
  locataireNom:      string;
  locataireTel:      string;
  zone:              string;
  statut:            'retard' | 'ajour' | 'avance' | 'attente';
  moisImpayes:       string[];
  montantARecouvrir: number;
  montantCollecte:   number;
  montantAttendu:    number;
}

export interface RecouvrementDto {
  lignes:        LigneRecouvrementDto[];
  collecteurs:   { id: string; nom: string }[];
  proprietaires: { id: string; nom: string }[];
  proprietes:    { id: string; nom: string }[];
}


// ── COMPOSANT ────────────────────────────────────────────────────────────────
const COLL_COLORS: Record<string, { bg: string; light: string }> = {
  default1: { bg: '#0e1c38', light: '#dbeafe' },
  default2: { bg: '#065f46', light: '#d1fae5' },
  default3: { bg: '#7c3aed', light: '#ede9fe' },
  default4: { bg: '#b45309', light: '#fef3c7' },
};

@Component({
  selector: 'kdi-suivi-collecteur',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
<div class="rec-page">

  <!-- ══ HEADER ══ -->
  <div class="rec-header">
    <div>
      <div class="rec-title">Feuille de recouvrement</div>
      <div class="rec-sub">Suivi des impayés · {{ lignesFiltrees().length }} contrat(s)</div>
    </div>
    <div class="rec-actions">
      <button class="btn btn-ghost" (click)="exportPDF()">📄 PDF</button>
      <button class="btn btn-ghost" (click)="exportExcel()">📊 Excel</button>
      <button class="btn btn-gold"  (click)="load()">↻ Actualiser</button>
    </div>
  </div>

  <!-- ══ KPIs ══ -->
  <div class="kpi-grid">
    <div class="kpi-card k-red">
      <div class="kpi-label">Total à recouvrir</div>
      <div class="kpi-val">{{ totalARecouvrir() | number:'1.0-0' }} <span class="kpi-unit">MRU</span></div>
      <div class="kpi-sub">{{ nbRetard() }} locataire(s) en retard</div>
    </div>
    <div class="kpi-card k-navy">
      <div class="kpi-label">Contrats suivis</div>
      <div class="kpi-val">{{ lignesFiltrees().length }}</div>
      <div class="kpi-sub">{{ nbCollecteurs() }} collecteur(s) · filtrés</div>
    </div>
    <div class="kpi-card k-red">
      <div class="kpi-label">En retard</div>
      <div class="kpi-val rec-red">{{ nbRetard() }}</div>
      <div class="kpi-sub">{{ lignesFiltrees().length ? (nbRetard() / lignesFiltrees().length * 100 | number:'1.0-0') : 0 }}% des contrats</div>
    </div>
    <div class="kpi-card k-green">
      <div class="kpi-label">Total collecté</div>
      <div class="kpi-val rec-green" style="font-size:16px">{{ totalCollecte() | number:'1.0-0' }} <span class="kpi-unit">MRU</span></div>
      <div class="kpi-sub">{{ pctGlobal() }}% du montant attendu</div>
    </div>
    <div class="kpi-card k-blue">
      <div class="kpi-label">En avance</div>
      <div class="kpi-val rec-blue">{{ nbAvance() }}</div>
      <div class="kpi-sub">{{ nbAJour() }} à jour · {{ nbAvance() }} en avance</div>
    </div>
  </div>

  <!-- ══ FILTRES ══ -->
  <div class="filters-card">
    <div class="filters-row">
      <div class="fg fg-search">
        <label>Recherche globale</label>
        <div class="search-wrap">
          <span class="search-ico">🔍</span>
          <input type="text" [(ngModel)]="searchQ" (ngModelChange)="applyFilters()" placeholder="Locataire, produit, propriétaire…">
        </div>
      </div>
      <div class="fg" *ngIf="isDirection()">
        <label>Collecteur</label>
        <select [(ngModel)]="fCollecteur" (ngModelChange)="applyFilters()">
          <option value="">Tous</option>
          <option *ngFor="let c of data?.collecteurs" [value]="c.id">{{ c.nom }}</option>
        </select>
      </div>
      <div class="fg">
        <label>Propriétaire</label>
        <select [(ngModel)]="fProprietaire" (ngModelChange)="applyFilters()">
          <option value="">Tous</option>
          <option *ngFor="let p of data?.proprietaires" [value]="p.id">{{ p.nom }}</option>
        </select>
      </div>
      <div class="fg">
        <label>Propriété</label>
        <select [(ngModel)]="fPropriete" (ngModelChange)="applyFilters()">
          <option value="">Toutes</option>
          <option *ngFor="let p of data?.proprietes" [value]="p.id">{{ p.nom }}</option>
        </select>
      </div>
      <div class="fg">
        <label>Produit</label>
        <input type="text" [(ngModel)]="fProduit" (ngModelChange)="applyFilters()" placeholder="Ex: AP-01">
      </div>
      <div class="fg">
        <label>Statut</label>
        <select [(ngModel)]="fStatut" (ngModelChange)="applyFilters()">
          <option value="">Tous</option>
          <option value="retard">En retard</option>
          <option value="ajour">À jour</option>
          <option value="avance">En avance</option>
          <option value="attente">En attente</option>
        </select>
      </div>
      <div class="fg fg-reset">
        <button class="btn btn-white" (click)="resetFiltres()">✕ Réinitialiser</button>
      </div>
    </div>
  </div>

  <!-- ══ LAYOUT PRINCIPAL ══ -->
  <div class="main-layout">

    <!-- TABLE -->
    <div class="table-section">

      <!-- Barre sélection -->
      <div class="sel-bar" [class.visible]="selection.size > 0">
        <div class="sel-info">
          <strong>{{ selection.size }}</strong> ligne(s) sélectionnée(s)
        </div>
        <div class="sel-stats" *ngIf="selection.size > 0">
          <span class="ss-item">Attendu : <strong>{{ selAttendu() | number:'1.0-0' }} MRU</strong></span>
          <span class="ss-item">Collecté : <strong class="rec-green">{{ selCollecte() | number:'1.0-0' }} MRU</strong></span>
          <span class="ss-item">Gap : <strong class="rec-red">{{ selGap() | number:'1.0-0' }} MRU</strong></span>
        </div>
        <button class="btn btn-white" style="font-size:12px;padding:5px 12px" (click)="clearSelection()">✕ Effacer</button>
      </div>

      <div class="table-wrap">
        <div class="table-topbar">
          <div style="display:flex;align-items:center;gap:8px">
            <span class="table-title">Feuille de recouvrement</span>
            <span class="row-count">{{ lignesFiltrees().length }} contrat(s)</span>
          </div>
          <div style="display:flex;gap:6px">
            <button class="btn btn-pdf"   (click)="exportPDF()">📄 PDF</button>
            <button class="btn btn-excel" (click)="exportExcel()">📊 Excel</button>
          </div>
        </div>

        <div class="scroll-x">
        <table class="rec-table" *ngIf="lignesFiltrees().length; else empty">
          <thead><tr>
            <th style="width:36px">
              <input type="checkbox" #chkAll (change)="toggleAll(chkAll.checked)">
            </th>
            <th class="sortable" (click)="sort('collecteurNom')">Collecteur <span class="sort-arrow">↕</span></th>
            <th class="sortable" (click)="sort('proprietaireNom')">Propriétaire <span class="sort-arrow">↕</span></th>
            <th>Produit</th>
            <th class="sortable" (click)="sort('loyerReference')">Loyer réf. <span class="sort-arrow">↕</span></th>
            <th>Locataire</th>
            <th>Zone</th>
            <th class="sortable" (click)="sort('statut')">Statut <span class="sort-arrow">↕</span></th>
            <th>Mois impayés</th>
            <th class="sortable text-right" (click)="sort('montantARecouvrir')">Montant à recouvrir <span class="sort-arrow">↕</span></th>
            <th>Taux</th>
          </tr></thead>
          <tbody>
            <tr *ngFor="let r of lignesFiltrees()"
                [class.row-selected]="selection.has(r.produitId)"
                (click)="toggleRow(r)">
              <td (click)="$event.stopPropagation()">
                <input type="checkbox" [checked]="selection.has(r.produitId)"
                       (change)="toggleRow(r)">
              </td>
              <td>
                <div class="col-coll">
                  <div class="coll-av" [style.background]="collColor(r.collecteurNom).bg">{{ r.collecteurNom[0] }}</div>
                  <span class="coll-nom">{{ r.collecteurNom }}</span>
                </div>
              </td>
              <td><span class="proprio-nom">{{ r.proprietaireNom }}</span></td>
              <td><span class="produit-b">{{ r.produitCode }}</span></td>
              <td><span class="loyer-v">{{ r.loyerReference | number:'1.0-0' }} MRU</span></td>
              <td>
                <div class="loc-nom">{{ r.locataireNom }}</div>
                <div class="loc-tel">{{ r.locataireTel }}</div>
              </td>
              <td><span class="zone-tag">{{ r.zone }}</span></td>
              <td>
                <span class="statut-pill" [ngClass]="'sp-' + r.statut">
                  {{ statutIcon(r.statut) }} {{ statutLabel(r.statut) }}
                </span>
              </td>
              <td>
                <div class="mois-badges" *ngIf="r.moisImpayes.length">
                  <span class="mois-b" *ngFor="let m of r.moisImpayes">{{ m }}</span>
                </div>
                <span class="text-muted" *ngIf="!r.moisImpayes.length">—</span>
              </td>
              <td class="text-right">
                <span class="montant-v" [class.zero]="r.montantARecouvrir === 0">
                  {{ r.montantARecouvrir | number:'1.0-0' }} MRU
                </span>
                <div class="montant-col" *ngIf="r.montantCollecte > 0">
                  ✓ {{ r.montantCollecte | number:'1.0-0' }} collecté
                </div>
              </td>
              <td>
                <div class="prog-wrap">
                  <div class="prog-bar">
                    <div class="prog-fill" [style.width.%]="tauxRecouvrement(r)"
                         [style.background]="pctColor(tauxRecouvrement(r))"></div>
                  </div>
                  <span class="prog-lbl">{{ tauxRecouvrement(r) }}%</span>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
        </div>

        <ng-template #empty>
          <div class="empty-state">
            <span style="font-size:40px">📋</span>
            <div class="empty-title">Aucun résultat</div>
            <div class="empty-sub">Modifiez les filtres</div>
          </div>
        </ng-template>
      </div>
    </div>

    <!-- PANNEAU COLLECTEURS -->
    <div class="collector-panel">
      <div class="cp-header">
        <div>
          <div class="cp-title">Synthèse collecteurs</div>
          <div class="cp-sub">{{ selection.size > 0 ? selection.size + ' sélect.' : lignesFiltrees().length + ' contrats' }}</div>
        </div>
        <span class="cp-badge">{{ selection.size > 0 ? 'SÉLECT.' : 'GLOBAL' }}</span>
      </div>

      <!-- Total global -->
      <div class="cp-total">
        <div class="cp-total-lbl">Total collecté</div>
        <div class="cp-total-row">
          <div class="cp-total-val">{{ (selection.size > 0 ? selCollecte() : totalCollecte()) | number:'1.0-0' }} <span style="font-size:12px;color:rgba(255,255,255,.5)">MRU</span></div>
          <div class="cp-total-pct">{{ selection.size > 0 ? selPct() : pctGlobal() }}%</div>
        </div>
        <div class="cp-prog-track">
          <div class="cp-prog-fill" [style.width.%]="selection.size > 0 ? selPct() : pctGlobal()"></div>
        </div>
        <div class="cp-total-detail">
          <div class="cp-det"><div class="cp-det-lbl">💰 Attendu</div><div class="cp-det-val exp">{{ (selection.size > 0 ? selAttendu() : totalAttendu()) | number:'1.0-0' }} MRU</div></div>
          <div class="cp-det"><div class="cp-det-lbl">✅ Collecté</div><div class="cp-det-val col">{{ (selection.size > 0 ? selCollecte() : totalCollecte()) | number:'1.0-0' }} MRU</div></div>
          <div class="cp-det"><div class="cp-det-lbl">⚠ Restant</div><div class="cp-det-val gap">{{ (selection.size > 0 ? selGap() : totalARecouvrir()) | number:'1.0-0' }} MRU</div></div>
          <div class="cp-det"><div class="cp-det-lbl">📋 Contrats</div><div class="cp-det-val exp">{{ selection.size > 0 ? selection.size : lignesFiltrees().length }}</div></div>
        </div>
      </div>

      <!-- Cards collecteurs -->
      <div class="cp-cards">
        <div class="collector-card" *ngFor="let c of synthCollecteurs()" (click)="filtrerParCollecteur(c.nom)">
          <div class="cc-top">
            <div class="cc-av" [style.background]="collColor(c.nom).bg">{{ c.nom[0] }}</div>
            <div class="cc-info">
              <div class="cc-name">{{ c.nom }}</div>
              <div class="cc-meta">{{ c.count }} contrat(s) · {{ c.retard }} retard(s)</div>
            </div>
            <div class="cc-pct" [style.background]="pctBgColor(c.pct)" [style.color]="pctColor(c.pct)">{{ c.pct }}%</div>
          </div>
          <div class="cc-prog">
            <div class="cc-prog-track">
              <div class="cc-prog-fill" [style.width.%]="c.pct" [style.background]="pctColor(c.pct)"></div>
            </div>
            <div class="cc-prog-labels">
              <span>Collecté : <strong>{{ c.collected | number:'1.0-0' }} MRU</strong></span>
              <span>Gap : <strong class="rec-red">{{ c.gap | number:'1.0-0' }} MRU</strong></span>
            </div>
          </div>
          <div class="cc-stats">
            <div class="cc-stat"><div class="cc-s-lbl">Attendu</div><div class="cc-s-val" style="color:var(--navy)">{{ c.expected | number:'1.0-0' }}</div></div>
            <div class="cc-stat"><div class="cc-s-lbl">Collecté</div><div class="cc-s-val rec-green">{{ c.collected | number:'1.0-0' }}</div></div>
            <div class="cc-stat"><div class="cc-s-lbl">Restant</div><div class="cc-s-val" [style.color]="c.montant > 0 ? 'var(--red)' : 'var(--green)'">{{ c.montant | number:'1.0-0' }}</div></div>
          </div>
        </div>
      </div>
    </div>

  </div><!-- /main-layout -->

  <!-- Toast -->
  <div class="toast" [class.show]="toastMsg">{{ toastMsg }}</div>
</div>
  `,
  styles: [`
    /* ── Variables ── */
    :host { --navy:#0e1c38; --gold:#c9a96e; --surf:#f4f7fb; --surf2:#e8edf5;
      --green:#16a34a; --green-bg:#d1fae5; --red:#dc2626; --red-bg:#fee2e2;
      --blue:#2563eb; --blue-bg:#dbeafe; --amber:#d97706; --amber-bg:#fef3c7;
      --text:#1e293b; --muted:#64748b; --border:#e2e8f0; }

    /* ── Header ── */
    .rec-page { max-width:1560px; margin:0 auto; }
    .rec-header { display:flex; justify-content:space-between; align-items:flex-end; margin-bottom:20px; }
    .rec-title { font-size:22px; font-weight:800; color:var(--navy); }
    .rec-sub { font-size:13px; color:var(--muted); margin-top:2px; }
    .rec-actions { display:flex; gap:8px; }
    .btn { padding:8px 16px; border-radius:8px; border:none; font-size:13px; font-weight:600; cursor:pointer; display:inline-flex; align-items:center; gap:6px; transition:all .15s; }
    .btn-ghost { background:rgba(14,28,56,.07); color:var(--navy); border:1px solid var(--border); }
    .btn-ghost:hover { background:var(--surf2); }
    .btn-gold  { background:var(--gold); color:var(--navy); }
    .btn-gold:hover { background:#d4b07a; }
    .btn-pdf   { background:var(--red-bg); color:#991b1b; }
    .btn-excel { background:var(--green-bg); color:#065f46; }
    .btn-white { background:#fff; color:var(--navy); border:1px solid var(--border); }
    .btn-white:hover { background:var(--surf); }

    /* ── KPIs ── */
    .kpi-grid { display:grid; grid-template-columns:repeat(5,1fr); gap:14px; margin-bottom:18px; }
    .kpi-card { background:#fff; border-radius:12px; padding:16px 18px; box-shadow:0 2px 8px rgba(14,28,56,.06); border:1px solid var(--border); }
    .kpi-label { font-size:10px; font-weight:700; color:var(--muted); text-transform:uppercase; letter-spacing:.6px; margin-bottom:5px; }
    .kpi-val { font-size:20px; font-weight:800; color:var(--navy); }
    .kpi-unit { font-size:11px; font-weight:400; color:var(--muted); }
    .kpi-sub { font-size:11px; color:var(--muted); margin-top:3px; }
    .kpi-card.k-red   { border-top:3px solid var(--red); }
    .kpi-card.k-green { border-top:3px solid var(--green); }
    .kpi-card.k-blue  { border-top:3px solid var(--blue); }
    .kpi-card.k-navy  { border-top:3px solid var(--navy); }
    .rec-red   { color:var(--red) !important; }
    .rec-green { color:var(--green) !important; }
    .rec-blue  { color:var(--blue) !important; }

    /* ── Filtres ── */
    .filters-card { background:#fff; border-radius:12px; padding:14px 18px; margin-bottom:16px; box-shadow:0 2px 8px rgba(14,28,56,.06); border:1px solid var(--border); }
    .filters-row { display:flex; gap:10px; flex-wrap:wrap; align-items:flex-end; }
    .fg { display:flex; flex-direction:column; gap:4px; flex:1; min-width:140px; }
    .fg label { font-size:10px; font-weight:700; color:var(--muted); text-transform:uppercase; letter-spacing:.5px; }
    .fg input, .fg select { padding:7px 10px; border:1.5px solid var(--border); border-radius:8px; font-size:13px; background:var(--surf); color:var(--text); }
    .fg input:focus, .fg select:focus { outline:none; border-color:var(--navy); background:#fff; }
    .fg-search { flex:2; }
    .fg-reset { justify-content:flex-end; flex:none; }
    .search-wrap { position:relative; }
    .search-ico { position:absolute; left:10px; top:50%; transform:translateY(-50%); color:var(--muted); }
    .search-wrap input { padding-left:32px; width:100%; }

    /* ── Selection bar ── */
    .sel-bar { background:var(--navy); border-radius:10px; padding:10px 16px; margin-bottom:12px; display:flex; align-items:center; gap:16px; opacity:0; max-height:0; overflow:hidden; transition:all .2s; }
    .sel-bar.visible { opacity:1; max-height:60px; }
    .sel-info { color:#fff; font-size:13px; font-weight:600; }
    .sel-stats { display:flex; gap:16px; flex:1; }
    .ss-item { font-size:12px; color:rgba(255,255,255,.7); }
    .ss-item strong { color:#fff; }

    /* ── Layout ── */
    .main-layout { display:flex; gap:16px; align-items:flex-start; }
    .table-section { flex:1; min-width:0; }

    /* ── Table ── */
    .table-wrap { background:#fff; border-radius:14px; overflow:hidden; box-shadow:0 2px 12px rgba(14,28,56,.08); border:1px solid var(--border); }
    .table-topbar { display:flex; align-items:center; justify-content:space-between; padding:12px 16px; border-bottom:1px solid var(--border); }
    .table-title { font-size:13px; font-weight:700; color:var(--navy); }
    .row-count { font-size:12px; color:var(--muted); background:var(--surf2); padding:2px 10px; border-radius:20px; }
    .scroll-x { overflow-x:auto; }
    .rec-table { width:100%; border-collapse:collapse; font-size:12.5px; min-width:900px; }
    .rec-table thead tr { background:var(--surf); }
    .rec-table th { padding:9px 11px; text-align:left; font-size:10px; font-weight:700; color:var(--muted); text-transform:uppercase; letter-spacing:.5px; border-bottom:2px solid var(--border); white-space:nowrap; }
    .rec-table th.sortable { cursor:pointer; }
    .rec-table th.sortable:hover { color:var(--navy); }
    .sort-arrow { opacity:.5; font-size:9px; }
    .rec-table td { padding:10px 11px; border-bottom:1px solid #f8fafc; vertical-align:middle; }
    .rec-table tr:last-child td { border-bottom:none; }
    .rec-table tr:hover td { background:#fafbff; }
    .row-selected td { background:#f0f4ff !important; }
    .col-coll { display:flex; align-items:center; gap:6px; }
    .coll-av { width:24px; height:24px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:10px; font-weight:700; color:var(--gold); flex-shrink:0; }
    .coll-nom { font-weight:600; color:var(--navy); font-size:12px; }
    .proprio-nom { font-weight:500; color:var(--text); }
    .produit-b { font-family:monospace; background:var(--surf2); padding:2px 7px; border-radius:5px; font-size:11px; font-weight:700; color:var(--navy); }
    .loyer-v { font-weight:600; }
    .loc-nom { font-weight:600; color:var(--navy); }
    .loc-tel { font-size:11px; color:var(--muted); }
    .zone-tag { font-size:11px; background:var(--surf); padding:2px 7px; border-radius:5px; color:var(--muted); }
    .statut-pill { padding:2px 9px; border-radius:20px; font-size:11px; font-weight:600; white-space:nowrap; }
    .sp-retard  { background:var(--red-bg);   color:#991b1b; }
    .sp-ajour   { background:var(--green-bg); color:#065f46; }
    .sp-avance  { background:var(--blue-bg);  color:#1e40af; }
    .sp-attente { background:var(--amber-bg); color:#92400e; }
    .mois-badges { display:flex; flex-wrap:wrap; gap:3px; }
    .mois-b { background:var(--red-bg); color:#991b1b; border-radius:4px; padding:1px 5px; font-size:10px; font-weight:600; font-family:monospace; }
    .text-muted { color:var(--muted); font-size:11px; }
    .text-right { text-align:right; }
    .montant-v { font-weight:700; color:var(--red); }
    .montant-v.zero { color:var(--green); }
    .montant-col { font-size:10px; color:var(--green); margin-top:1px; }
    .prog-wrap { display:flex; align-items:center; gap:5px; min-width:80px; }
    .prog-bar { flex:1; height:4px; background:var(--surf2); border-radius:2px; overflow:hidden; }
    .prog-fill { height:100%; border-radius:2px; transition:width .4s; }
    .prog-lbl { font-size:10px; color:var(--muted); white-space:nowrap; }
    .empty-state { display:flex; flex-direction:column; align-items:center; padding:50px; gap:8px; }
    .empty-title { font-size:14px; font-weight:600; color:var(--text); }
    .empty-sub { font-size:12px; color:var(--muted); }

    /* ── Panneau collecteurs ── */
    .collector-panel { width:320px; flex-shrink:0; background:#fff; border-radius:14px; box-shadow:0 2px 12px rgba(14,28,56,.08); border:1px solid var(--border); position:sticky; top:20px; overflow:hidden; }
    .cp-header { background:var(--navy); padding:14px 16px; display:flex; align-items:center; justify-content:space-between; }
    .cp-title { font-size:14px; font-weight:700; color:#fff; }
    .cp-sub { font-size:11px; color:rgba(255,255,255,.5); margin-top:2px; }
    .cp-badge { background:var(--gold); color:var(--navy); font-size:10px; font-weight:800; padding:2px 8px; border-radius:20px; }
    .cp-total { background:rgba(255,255,255,.06); border-bottom:1px solid rgba(255,255,255,.08); padding:14px 16px; background:var(--navy); }
    .cp-total-lbl { font-size:10px; color:rgba(255,255,255,.5); text-transform:uppercase; letter-spacing:.5px; margin-bottom:4px; }
    .cp-total-row { display:flex; justify-content:space-between; align-items:flex-end; }
    .cp-total-val { font-size:20px; font-weight:800; color:#fff; }
    .cp-total-pct { font-size:22px; font-weight:800; color:var(--gold); }
    .cp-prog-track { height:5px; background:rgba(255,255,255,.15); border-radius:3px; margin-top:8px; overflow:hidden; }
    .cp-prog-fill { height:100%; background:var(--gold); border-radius:3px; transition:width .5s; }
    .cp-total-detail { display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-top:12px; }
    .cp-det { }
    .cp-det-lbl { font-size:10px; color:rgba(255,255,255,.5); }
    .cp-det-val { font-size:12px; font-weight:700; margin-top:2px; }
    .cp-det-val.exp { color:#fff; }
    .cp-det-val.col { color:#86efac; }
    .cp-det-val.gap { color:#fca5a5; }
    .cp-cards { padding:12px; display:flex; flex-direction:column; gap:10px; max-height:480px; overflow-y:auto; }
    .collector-card { border:1px solid var(--border); border-radius:10px; padding:12px; cursor:pointer; transition:all .15s; }
    .collector-card:hover { border-color:var(--navy); box-shadow:0 2px 8px rgba(14,28,56,.1); }
    .cc-top { display:flex; align-items:center; gap:8px; margin-bottom:8px; }
    .cc-av { width:28px; height:28px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:11px; font-weight:700; color:var(--gold); flex-shrink:0; }
    .cc-name { font-size:13px; font-weight:700; color:var(--navy); }
    .cc-meta { font-size:11px; color:var(--muted); }
    .cc-pct { font-size:12px; font-weight:800; padding:2px 7px; border-radius:8px; margin-left:auto; flex-shrink:0; }
    .cc-prog { margin-bottom:8px; }
    .cc-prog-track { height:4px; background:var(--surf2); border-radius:2px; overflow:hidden; margin-bottom:4px; }
    .cc-prog-fill { height:100%; border-radius:2px; transition:width .4s; }
    .cc-prog-labels { display:flex; justify-content:space-between; font-size:10px; color:var(--muted); }
    .cc-stats { display:grid; grid-template-columns:1fr 1fr 1fr; gap:6px; }
    .cc-stat { text-align:center; }
    .cc-s-lbl { font-size:9px; color:var(--muted); text-transform:uppercase; letter-spacing:.3px; }
    .cc-s-val { font-size:12px; font-weight:700; }

    /* ── Toast ── */
    .toast { position:fixed; bottom:24px; right:24px; background:var(--navy); color:#fff; padding:10px 16px; border-radius:10px; font-size:13px; font-weight:500; box-shadow:0 4px 20px rgba(14,28,56,.3); opacity:0; transform:translateY(8px); transition:all .25s; pointer-events:none; z-index:9999; }
    .toast.show { opacity:1; transform:translateY(0); }

    @media (max-width: 1200px) {
      .collector-panel { display:none; }
      .kpi-grid { grid-template-columns: repeat(3,1fr); }
    }
  `]
})
export class SuiviCollecteurComponent implements OnInit {
  private svc  = inject(RecouvrementService);
  private auth = inject(AuthService);

  data: RecouvrementDto | null = null;
  lignes: LigneRecouvrementDto[] = [];
  selection = new Set<string>();
  toastMsg = '';

  // Filtres
  searchQ      = '';
  fCollecteur  = '';
  fProprietaire= '';
  fPropriete   = '';
  fProduit     = '';
  fStatut      = '';

  // Tri
  sortKey = '';
  sortAsc = true;

  private collColors: Record<string, { bg: string; light: string }> = {};
  private colorPool = Object.values(COLL_COLORS);
  private colorIdx = 0;

  ngOnInit() { this.load(); }

  load() {
    this.svc.getFeuille().subscribe(d => {
      this.data = d;
      this.lignes = d.lignes;
    });
  }

  lignesFiltrees(): LigneRecouvrementDto[] {
    let items = this.lignes;
    const q = this.searchQ.toLowerCase().trim();
    if (q) items = items.filter(r =>
      [r.collecteurNom, r.proprietaireNom, r.produitCode, r.locataireNom, r.zone, r.proprieteLibelle]
        .some(v => v?.toLowerCase().includes(q)));
    if (this.fCollecteur)   items = items.filter(r => r.collecteurId   === this.fCollecteur);
    if (this.fProprietaire) items = items.filter(r => r.proprietaireId === this.fProprietaire);
    if (this.fPropriete)    items = items.filter(r => r.proprieteLibelle?.includes(this.fPropriete));
    if (this.fProduit)      items = items.filter(r => r.produitCode?.toLowerCase().includes(this.fProduit.toLowerCase()));
    if (this.fStatut)       items = items.filter(r => r.statut === this.fStatut);
    if (this.sortKey) {
      const k = this.sortKey as keyof LigneRecouvrementDto;
      items = [...items].sort((a, b) => {
        const av = a[k] as any, bv = b[k] as any;
        const cmp = typeof av === 'string' ? av.localeCompare(bv) : av - bv;
        return this.sortAsc ? cmp : -cmp;
      });
    }
    return items;
  }

  applyFilters() { /* signal déclenche lignesFiltrees */ }
  resetFiltres() { this.searchQ=''; this.fCollecteur=''; this.fProprietaire=''; this.fPropriete=''; this.fProduit=''; this.fStatut=''; this.sortKey=''; }

  sort(key: string) {
    if (this.sortKey === key) this.sortAsc = !this.sortAsc;
    else { this.sortKey = key; this.sortAsc = true; }
  }

  // Sélection
  toggleRow(r: LigneRecouvrementDto) {
    if (this.selection.has(r.produitId)) this.selection.delete(r.produitId);
    else this.selection.add(r.produitId);
    this.selection = new Set(this.selection);
  }
  toggleAll(checked: boolean) {
    if (checked) this.lignesFiltrees().forEach(r => this.selection.add(r.produitId));
    else this.selection.clear();
    this.selection = new Set(this.selection);
  }
  clearSelection() { this.selection = new Set(); }

  // KPIs globaux
  totalARecouvrir() { return this.lignesFiltrees().reduce((s,r) => s + r.montantARecouvrir, 0); }
  totalCollecte()   { return this.lignesFiltrees().reduce((s,r) => s + r.montantCollecte,   0); }
  totalAttendu()    { return this.lignesFiltrees().reduce((s,r) => s + r.montantAttendu,    0); }
  pctGlobal()       { const a = this.totalAttendu(); return a > 0 ? Math.round(this.totalCollecte() / a * 100) : 0; }
  nbRetard()        { return this.lignesFiltrees().filter(r => r.statut === 'retard').length; }
  nbAJour()         { return this.lignesFiltrees().filter(r => r.statut === 'ajour').length; }
  nbAvance()        { return this.lignesFiltrees().filter(r => r.statut === 'avance').length; }
  nbCollecteurs()   { return new Set(this.lignesFiltrees().map(r => r.collecteurId)).size; }

  // KPIs sélection
  selRows()     { return this.lignes.filter(r => this.selection.has(r.produitId)); }
  selAttendu()  { return this.selRows().reduce((s,r) => s + r.montantAttendu, 0); }
  selCollecte() { return this.selRows().reduce((s,r) => s + r.montantCollecte, 0); }
  selGap()      { return this.selAttendu() - this.selCollecte(); }
  selPct()      { const a = this.selAttendu(); return a > 0 ? Math.round(this.selCollecte() / a * 100) : 0; }

  // Synthèse par collecteur
  synthCollecteurs() {
    const src = this.selection.size > 0 ? this.selRows() : this.lignesFiltrees();
    const map: Record<string, any> = {};
    src.forEach(r => {
      if (!map[r.collecteurNom]) map[r.collecteurNom] = { nom:r.collecteurNom, count:0, expected:0, collected:0, montant:0, retard:0 };
      const c = map[r.collecteurNom];
      c.count++; c.expected += r.montantAttendu; c.collected += r.montantCollecte; c.montant += r.montantARecouvrir;
      if (r.statut === 'retard') c.retard++;
    });
    return Object.values(map).map((c: any) => ({
      ...c, pct: c.expected > 0 ? Math.round(c.collected / c.expected * 100) : 0,
      gap: c.expected - c.collected
    })).sort((a: any, b: any) => b.collected - a.collected);
  }

  filtrerParCollecteur(nom: string) {
    const col = this.data?.collecteurs.find(c => c.nom === nom);
    if (col) { this.fCollecteur = col.id; }
    this.showToast('📋 Filtré sur ' + nom);
  }

  tauxRecouvrement(r: LigneRecouvrementDto): number {
    return r.montantAttendu > 0 ? Math.round(r.montantCollecte / r.montantAttendu * 100) : (r.statut === 'ajour' ? 100 : 0);
  }

  collColor(nom: string): { bg: string; light: string } {
    if (!this.collColors[nom]) {
      this.collColors[nom] = this.colorPool[this.colorIdx % this.colorPool.length];
      this.colorIdx++;
    }
    return this.collColors[nom];
  }

  pctColor(pct: number): string { return pct >= 80 ? '#16a34a' : pct >= 50 ? '#d97706' : '#dc2626'; }
  pctBgColor(pct: number): string { return pct >= 80 ? '#d1fae5' : pct >= 50 ? '#fef3c7' : '#fee2e2'; }

  statutLabel(s: string): string { return { retard:'En retard', ajour:'À jour', avance:'En avance', attente:'En attente' }[s] || s; }
  statutIcon(s: string): string  { return { retard:'✗', ajour:'✓', avance:'★', attente:'·' }[s] || ''; }

  isDirection() { return this.auth.isDirection(); }

  showToast(msg: string) {
    this.toastMsg = msg;
    setTimeout(() => this.toastMsg = '', 3000);
  }

  exportPDF()   { this.showToast('📄 Export PDF en cours…'); }
  exportExcel() { this.showToast('📊 Export Excel en cours…'); }
}