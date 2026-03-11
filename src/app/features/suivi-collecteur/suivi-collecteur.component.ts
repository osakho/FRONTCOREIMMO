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
            <th class="sortable" (click)="sort('proprieteLibelle')">Propriété <span class="sort-arrow">↕</span></th>
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
              <td><span class="proprio-nom">{{ r.proprieteLibelle }}</span></td>
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
    .rec-page { width:100%; }
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

  exportExcel(): void {
    const rows = this.lignesFiltrees();
    if (!rows.length) { this.showToast('Aucune donnée à exporter'); return; }
    this.showToast('📊 Génération Excel…');

    const LOGO_B64 = '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';
    const statutLabel = (s: string) => ({ retard:'En retard', ajour:'À jour', avance:'En avance', attente:'En attente' } as any)[s] ?? s;

    const loadExcelJS = (): Promise<any> => new Promise((res, rej) => {
      if ((window as any).ExcelJS) { res((window as any).ExcelJS); return; }
      const s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/exceljs@4.4.0/dist/exceljs.min.js';
      s.onload = () => (window as any).ExcelJS ? res((window as any).ExcelJS) : rej(new Error('ExcelJS non trouvé'));
      s.onerror = () => rej(new Error('Échec chargement ExcelJS'));
      document.head.appendChild(s);
    });

    loadExcelJS().then(async (ExcelJS: any) => {
      const wb = new ExcelJS.Workbook();
      wb.creator = 'KDI Immobilier';
      wb.created = new Date();

      // ── Palette ──
      const NAVY    = '0E1C38'; const NAVY_M  = '1E3A5F'; const GOLD  = 'C9A96E';
      const WHITE   = 'FFFFFF'; const GRAY_L  = 'F8FAFC'; const GRAY_M = 'E2E8F0';
      const GRAY_T  = '64748B'; const RED_T   = 'DC2626'; const RED_BG = 'FEF2F2';
      const GRN_T   = '16A34A'; const GRN_BG  = 'F0FDF4'; const ORANGE = 'D97706';

      const fnt  = (bold=false, color='0D0D0D', size=9, italic=false) =>
        ({ bold, color:{argb:'FF'+color}, size, italic, name:'Arial' });
      const fill = (color: string) =>
        ({ type:'pattern', pattern:'solid', fgColor:{argb:'FF'+color} });
      const bdr  = (color=GRAY_M, topStyle='thin' as any, topColor?: string) => ({
        top:    { style: topStyle,  color: {argb:'FF'+(topColor||color)} },
        bottom: { style: 'thin',    color: {argb:'FF'+color} },
        left:   { style: 'thin',    color: {argb:'FF'+color} },
        right:  { style: 'thin',    color: {argb:'FF'+color} },
      });
      const bdrHead = () => ({
        bottom: { style:'medium', color:{argb:'FF'+GOLD} },
        top:    { style:'thin',   color:{argb:'FF'+NAVY} },
        left:   { style:'thin',   color:{argb:'FF'+NAVY_M} },
        right:  { style:'thin',   color:{argb:'FF'+NAVY_M} },
      });
      const bdrTotal = () => ({
        top:    { style:'medium', color:{argb:'FF'+GOLD} },
        bottom: { style:'thin',   color:{argb:'FF'+NAVY} },
        left:   { style:'thin',   color:{argb:'FF'+NAVY} },
        right:  { style:'thin',   color:{argb:'FF'+NAVY} },
      });
      const aln = (h='left' as any, v='middle' as any) => ({ horizontal:h, vertical:v });

      const att_tot   = rows.reduce((s,r)=>s+r.montantAttendu,0);
      const col_tot   = rows.reduce((s,r)=>s+r.montantCollecte,0);
      const rec_tot   = rows.reduce((s,r)=>s+r.montantARecouvrir,0);
      const nb_ret    = rows.filter(r=>r.statut==='retard').length;
      const taux_glob = att_tot > 0 ? col_tot/att_tot : 0;
      const today     = new Date().toLocaleDateString('fr-FR',{day:'2-digit',month:'long',year:'numeric'});
      const numFmt    = '#,##0" MRU"';
      const pctFmt    = '0%';

      const styleCell = (cell: any, opts: any) => {
        if (opts.font)      cell.font      = opts.font;
        if (opts.fill)      cell.fill      = opts.fill;
        if (opts.border)    cell.border    = opts.border;
        if (opts.alignment) cell.alignment = opts.alignment;
        if (opts.numFmt)    cell.numFmt    = opts.numFmt;
      };

      // ═══════════════════════════════════════
      // Ajouter le logo (base64 → buffer)
      // ═══════════════════════════════════════
      const addLogo = (ws: any) => {
        try {
          const b64 = LOGO_B64.replace(/^data:image\/png;base64,/, '');
          const binaryStr = atob(b64);
          const bytes = new Uint8Array(binaryStr.length);
          for (let i=0; i<binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);
          const imgId = wb.addImage({ buffer: bytes.buffer, extension: 'png' });
          ws.addImage(imgId, {
            tl: { col: 0.1, row: 0.1 },
            ext: { width: 52, height: 48 },
            editAs: 'oneCell',
          });
        } catch(e) { console.warn('Logo non ajouté:', e); }
      };

      // ═══════════════════════════════════════
      // FEUILLE 1 — Détail
      // ═══════════════════════════════════════
      const ws1 = wb.addWorksheet('Feuille de recouvrement', {
        views: [{ showGridLines: false, state:'frozen', xSplit:0, ySplit:7 }],
        pageSetup: { orientation:'landscape', fitToPage:true, fitToWidth:1 },
      });

      // Largeurs colonnes
      ws1.columns = [
        {width:5},{width:18},{width:24},{width:24},{width:9},{width:22},
        {width:18},{width:15},{width:13},{width:22},{width:14},
        {width:16},{width:16},{width:16},{width:10},
      ];

      // ── Ligne 1 : Titre + Logo ──
      ws1.getRow(1).height = 52;
      for (let c=1; c<=15; c++) {
        const cell = ws1.getCell(1,c);
        cell.fill   = fill(NAVY);
        cell.border = bdr(NAVY);
        if (c===3) {
          cell.value     = 'FEUILLE DE RECOUVREMENT — KDI Immobilier';
          cell.font      = fnt(true, GOLD, 15);
          cell.alignment = aln('left');
        }
      }
      ws1.mergeCells(1,3,1,15);
      addLogo(ws1);

      // ── Ligne 2 : Sous-titre ──
      ws1.getRow(2).height = 18;
      ws1.mergeCells(2,1,2,15);
      const subCell = ws1.getCell(2,1);
      subCell.value     = `Généré le ${today}  ·  ${rows.length} contrat(s)  ·  Confidentiel`;
      subCell.font      = fnt(false,'FFFFFF',8.5,true);
      subCell.fill      = fill(NAVY_M);
      subCell.alignment = aln('left');
      for (let c=2;c<=15;c++) { ws1.getCell(2,c).fill=fill(NAVY_M); ws1.getCell(2,c).border=bdr(NAVY_M); }

      // ── Ligne 3 : Spacer ──
      ws1.getRow(3).height = 8;
      ws1.mergeCells(3,1,3,15);
      for (let c=1;c<=15;c++) ws1.getCell(3,c).fill = fill('EEF2F7');

      // ── Lignes 4-5 : KPIs ──
      const kpis = [
        { label:'CONTRATS SUIVIS',   val:rows.length, fmt:undefined, color:NAVY },
        { label:'EN RETARD',         val:nb_ret,       fmt:undefined, color:nb_ret>0?RED_T:GRN_T },
        { label:'TOTAL ATTENDU',     val:att_tot,      fmt:numFmt,   color:NAVY },
        { label:'TOTAL COLLECTÉ',    val:col_tot,      fmt:numFmt,   color:GRN_T },
        { label:'À RECOUVRIR',       val:rec_tot,      fmt:numFmt,   color:rec_tot>0?RED_T:GRN_T },
        { label:'TAUX RECOUVREMENT', val:taux_glob,    fmt:pctFmt,   color:taux_glob>=0.8?GRN_T:(taux_glob<0.5?RED_T:ORANGE) },
      ];
      const kpiCols = [1,3,5,7,9,11];
      ws1.getRow(4).height = 22; ws1.getRow(5).height = 22;

      kpis.forEach((kpi,idx) => {
        const c1=kpiCols[idx]; const c2=c1+1;
        ws1.mergeCells(4,c1,4,c2); ws1.mergeCells(5,c1,5,c2);
        const lbl = ws1.getCell(4,c1);
        lbl.value=kpi.label; lbl.font=fnt(true,GRAY_T,7); lbl.fill=fill(GRAY_L);
        lbl.alignment=aln('left'); lbl.border={ top:{style:'medium',color:{argb:'FF'+NAVY}}, bottom:{style:'thin',color:{argb:'FF'+GRAY_M}}, left:{style:'thin',color:{argb:'FF'+GRAY_M}}, right:{style:'thin',color:{argb:'FF'+GRAY_M}} };
        const v = ws1.getCell(5,c1);
        v.value=kpi.val; v.font=fnt(true,kpi.color,16); v.fill=fill(WHITE);
        v.alignment=aln('left'); v.border={ top:{style:'thin',color:{argb:'FF'+GRAY_M}}, bottom:{style:'medium',color:{argb:'FF'+NAVY}}, left:{style:'thin',color:{argb:'FF'+GRAY_M}}, right:{style:'thin',color:{argb:'FF'+GRAY_M}} };
        if (kpi.fmt) v.numFmt=kpi.fmt;
      });
      // Cols 13-15 KPI zone
      for (let row=4;row<=5;row++) for (let c=13;c<=15;c++) {
        const cell=ws1.getCell(row,c); cell.fill=fill(row===4?GRAY_L:WHITE);
        cell.border=row===4?{ top:{style:'medium',color:{argb:'FF'+NAVY}}, bottom:{style:'thin',color:{argb:'FF'+GRAY_M}}, left:{style:'thin',color:{argb:'FF'+GRAY_M}}, right:{style:'thin',color:{argb:'FF'+GRAY_M}} }:{ top:{style:'thin',color:{argb:'FF'+GRAY_M}}, bottom:{style:'medium',color:{argb:'FF'+NAVY}}, left:{style:'thin',color:{argb:'FF'+GRAY_M}}, right:{style:'thin',color:{argb:'FF'+GRAY_M}} };
      }

      // ── Ligne 6 : Spacer ──
      ws1.getRow(6).height=8; ws1.mergeCells(6,1,6,15);
      for (let c=1;c<=15;c++) ws1.getCell(6,c).fill=fill('EEF2F7');

      // ── Ligne 7 : En-têtes tableau ──
      ws1.getRow(7).height=26;
      const headers=['Collecteur','Propriétaire','Propriété','Produit','Locataire','Tél.','Zone','Statut','Mois impayés','Loyer réf.','Attendu','Collecté','À recouvrir','Taux'];
      headers.forEach((h,i) => {
        const cell=ws1.getCell(7,i+1);
        cell.value=h.toUpperCase(); cell.font=fnt(true,WHITE,8.5);
        cell.fill=fill(NAVY); cell.border=bdrHead();
        cell.alignment=aln(i>=9?'center':'left');
      });
      // col 15 vide
      const h15=ws1.getCell(7,15); h15.fill=fill(NAVY); h15.border=bdrHead();

      // ── Lignes données ──
      let prevColl='';
      rows.forEach((r,ri) => {
        const er=ri+8; ws1.getRow(er).height=20;
        const st=r.statut; const curColl=r.collecteurNom;
        const thick=prevColl!==''&&curColl!==prevColl; prevColl=curColl;
        const rowBg=st==='retard'?RED_BG:(st==='ajour'?GRN_BG:(ri%2===1?GRAY_L:WHITE));
        const taux_r=r.montantAttendu>0?r.montantCollecte/r.montantAttendu:0;
        const topStyle=thick?'medium':'thin' as any;
        const topColor=thick?NAVY:GRAY_M;

        const rowData=[
          {v:r.collecteurNom,     fnt:fnt(true,NAVY,9),      al:aln('left'),   fmt:undefined},
          {v:r.proprietaireNom,   fnt:fnt(false,'1E293B',9), al:aln('left'),   fmt:undefined},
          {v:r.proprieteLibelle||'—', fnt:fnt(false,'1E293B',9),al:aln('left'),fmt:undefined},
          {v:r.produitCode,       fnt:fnt(true,NAVY,9),      al:aln('center'), fmt:undefined},
          {v:r.locataireNom,      fnt:fnt(false,'1E293B',9), al:aln('left'),   fmt:undefined},
          {v:r.locataireTel||'—', fnt:fnt(false,GRAY_T,9),   al:aln('left'),   fmt:undefined},
          {v:r.zone||'—',         fnt:fnt(false,'1E293B',9), al:aln('left'),   fmt:undefined},
          {v:statutLabel(st),     fnt:fnt(true,st==='retard'?RED_T:st==='ajour'?GRN_T:GRAY_T,9), al:aln('center'), fmt:undefined},
          {v:(r.moisImpayes||[]).join(', ')||'—', fnt:fnt(false,GRAY_T,9), al:aln('center'), fmt:undefined},
          {v:r.loyerReference,    fnt:fnt(false,NAVY,9),     al:aln('right'),  fmt:numFmt},
          {v:r.montantAttendu,    fnt:fnt(false,NAVY,9),     al:aln('right'),  fmt:numFmt},
          {v:r.montantCollecte,   fnt:fnt(false,r.montantCollecte>0?GRN_T:GRAY_T,9), al:aln('right'), fmt:numFmt},
          {v:r.montantARecouvrir, fnt:fnt(true,r.montantARecouvrir>0?RED_T:GRN_T,9), al:aln('right'), fmt:numFmt},
          {v:taux_r,              fnt:fnt(true,taux_r>=0.8?GRN_T:(taux_r<0.5&&r.montantAttendu>0?RED_T:GRAY_T),9), al:aln('center'), fmt:pctFmt},
        ];
        rowData.forEach((d,ci) => {
          const cell=ws1.getCell(er,ci+1);
          cell.value=d.v; cell.font=d.fnt; cell.fill=fill(rowBg);
          cell.alignment=d.al; cell.border=bdr(GRAY_M,topStyle,topColor);
          if (d.fmt) cell.numFmt=d.fmt;
        });
      });

      // ── Totaux ──
      const tr=rows.length+8; ws1.getRow(tr).height=26;
      ws1.mergeCells(tr,1,tr,9);
      const tl=ws1.getCell(tr,1);
      tl.value='TOTAL'; tl.font=fnt(true,WHITE,10); tl.fill=fill(NAVY);
      tl.alignment=aln('right'); tl.border=bdrTotal();
      for(let c=2;c<=10;c++) { ws1.getCell(tr,c).fill=fill(NAVY); ws1.getCell(tr,c).border=bdrTotal(); }
      [
        {c:11,v:att_tot,color:WHITE},
        {c:12,v:col_tot,color:GRN_T},
        {c:13,v:rec_tot,color:rec_tot>0?RED_T:GRN_T},
      ].forEach(d => {
        const cell=ws1.getCell(tr,d.c); cell.value=d.v;
        cell.font=fnt(true,d.color,10); cell.fill=fill(NAVY);
        cell.alignment=aln('center'); cell.border=bdrTotal(); cell.numFmt=numFmt;
      });
      const ct=ws1.getCell(tr,14); ct.value=taux_glob;
      ct.font=fnt(true,GOLD,10); ct.fill=fill(NAVY);
      ct.alignment=aln('center'); ct.border=bdrTotal(); ct.numFmt=pctFmt;
      ws1.getCell(tr,15).fill=fill(NAVY); ws1.getCell(tr,15).border=bdrTotal();

      // ═══════════════════════════════════════
      // FEUILLE 2 — Synthèse collecteurs
      // ═══════════════════════════════════════
      const ws2 = wb.addWorksheet('Synthèse collecteurs', {
        views: [{ showGridLines:false, state:'frozen', xSplit:0, ySplit:4 }],
        pageSetup: { orientation:'landscape', fitToPage:true, fitToWidth:1 },
      });
      ws2.columns=[{width:5},{width:26},{width:13},{width:13},{width:20},{width:20},{width:22},{width:10}];

      ws2.getRow(1).height=52;
      for(let c=1;c<=8;c++) { ws2.getCell(1,c).fill=fill(NAVY); ws2.getCell(1,c).border=bdr(NAVY); }
      ws2.mergeCells(1,3,1,8);
      const t2=ws2.getCell(1,3); t2.value='SYNTHÈSE PAR COLLECTEUR';
      t2.font=fnt(true,GOLD,13); t2.fill=fill(NAVY); t2.alignment=aln('left');
      addLogo(ws2);

      ws2.getRow(2).height=16; ws2.mergeCells(2,1,2,8);
      const s2=ws2.getCell(2,1); s2.value=`KDI Immobilier  ·  ${today}`;
      s2.font=fnt(false,'FFFFFF',8.5,true); s2.fill=fill(NAVY_M); s2.alignment=aln('left');
      for(let c=2;c<=8;c++) { ws2.getCell(2,c).fill=fill(NAVY_M); ws2.getCell(2,c).border=bdr(NAVY_M); }

      ws2.getRow(3).height=8;
      for(let c=1;c<=8;c++) ws2.getCell(3,c).fill=fill('EEF2F7');

      ws2.getRow(4).height=26;
      ['Collecteur','Nb contrats','En retard','Attendu','Collecté','À recouvrir','Taux'].forEach((h,i) => {
        const cell=ws2.getCell(4,i+2); // commence col 2 (après logo col)
        cell.value=h.toUpperCase(); cell.font=fnt(true,WHITE,9);
        cell.fill=fill(NAVY); cell.border=bdrHead();
        cell.alignment=aln(i===0?'left':'center');
      });
      ws2.getCell(4,1).fill=fill(NAVY); ws2.getCell(4,1).border=bdrHead();

      const grouped=new Map<string,typeof rows>();
      rows.forEach(r=>{ const k=r.collecteurNom; if(!grouped.has(k)) grouped.set(k,[]); grouped.get(k)!.push(r); });
      let ri2=0;
      grouped.forEach((grp,collecteur) => {
        const rr=ri2+5; ws2.getRow(rr).height=22;
        const bg2=ri2%2===0?WHITE:GRAY_L;
        const att2=grp.reduce((s,r)=>s+r.montantAttendu,0);
        const col2=grp.reduce((s,r)=>s+r.montantCollecte,0);
        const rec2=grp.reduce((s,r)=>s+r.montantARecouvrir,0);
        const ret2=grp.filter(r=>r.statut==='retard').length;
        const t2v=att2>0?col2/att2:0;
        ws2.getCell(rr,1).fill=fill(bg2); ws2.getCell(rr,1).border=bdr();
        [
          {v:collecteur,c:2,fnt:fnt(true,NAVY,9),al:aln('left'),fmt:undefined},
          {v:grp.length,c:3,fnt:fnt(false,GRAY_T,9),al:aln('center'),fmt:undefined},
          {v:ret2,c:4,fnt:fnt(true,ret2>0?RED_T:GRN_T,9),al:aln('center'),fmt:undefined},
          {v:att2,c:5,fnt:fnt(false,NAVY,9),al:aln('right'),fmt:numFmt},
          {v:col2,c:6,fnt:fnt(false,col2>0?GRN_T:GRAY_T,9),al:aln('right'),fmt:numFmt},
          {v:rec2,c:7,fnt:fnt(true,rec2>0?RED_T:GRN_T,9),al:aln('right'),fmt:numFmt},
          {v:t2v,c:8,fnt:fnt(true,t2v>=0.8?GRN_T:(t2v<0.5&&att2>0?RED_T:GRAY_T),9),al:aln('center'),fmt:pctFmt},
        ].forEach(d=>{ const cell=ws2.getCell(rr,d.c); cell.value=d.v; cell.font=d.fnt; cell.fill=fill(bg2); cell.alignment=d.al; cell.border=bdr(); if(d.fmt) cell.numFmt=d.fmt; });
        ri2++;
      });

      const tr2=grouped.size+5; ws2.getRow(tr2).height=26;
      ws2.mergeCells(tr2,1,tr2,4);
      const tl2=ws2.getCell(tr2,1); tl2.value='TOTAL';
      tl2.font=fnt(true,WHITE,10); tl2.fill=fill(NAVY); tl2.alignment=aln('right'); tl2.border=bdrTotal();
      for(let c=2;c<=4;c++) { ws2.getCell(tr2,c).fill=fill(NAVY); ws2.getCell(tr2,c).border=bdrTotal(); }
      [{c:5,v:att_tot,col:WHITE},{c:6,v:col_tot,col:GRN_T},{c:7,v:rec_tot,col:rec_tot>0?RED_T:GRN_T}].forEach(d=>{
        const cell=ws2.getCell(tr2,d.c); cell.value=d.v; cell.font=fnt(true,d.col,10);
        cell.fill=fill(NAVY); cell.alignment=aln('center'); cell.border=bdrTotal(); cell.numFmt=numFmt;
      });
      const ct2=ws2.getCell(tr2,8); ct2.value=taux_glob;
      ct2.font=fnt(true,GOLD,10); ct2.fill=fill(NAVY); ct2.alignment=aln('center'); ct2.border=bdrTotal(); ct2.numFmt=pctFmt;

      // ── Téléchargement ──
      const buffer = await wb.xlsx.writeBuffer();
      const blob   = new Blob([buffer], {type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
      const url    = URL.createObjectURL(blob);
      const a      = document.createElement('a');
      a.href = url; a.download = `feuille-recouvrement-${new Date().toISOString().slice(0,10)}.xlsx`;
      a.click(); URL.revokeObjectURL(url);
      this.showToast('📊 Excel téléchargé');
    }).catch((err: any) => {
      console.error('Export Excel error:', err);
      this.showToast('❌ Erreur export Excel : ' + (err?.message ?? err));
    });
  }

  exportPDF(): void {
    const rows = this.lignesFiltrees();
    if (!rows.length) { this.showToast('Aucune donnée à exporter'); return; }
    this.showToast('📄 Génération du PDF…');

    const loadScript = (src: string): Promise<void> =>
      new Promise(res => { const s = document.createElement('script'); s.src = src; s.onload = () => res(); document.head.appendChild(s); });

    const statutLabel = (s: string) => ({retard:'En retard', ajour:'À jour', avance:'En avance', attente:'En attente'} as any)[s] ?? s;
    const fmt = (n: number) => n.toLocaleString('fr-FR').replace(/ /g, ' ');

    Promise.all([
      loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'),
      loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.31/jspdf.plugin.autotable.min.js'),
    ]).then(() => {
      const { jsPDF } = (window as any).jspdf;
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      const W = 297; const margin = 12;

      // ── En-tête ──
      doc.setFillColor(14, 28, 56);
      doc.rect(0, 0, W, 24, 'F');
      // Ligne dorée
      doc.setDrawColor(201, 169, 110);
      doc.setLineWidth(0.6);
      doc.line(0, 24, W, 24);

      doc.setTextColor(201, 169, 110);
      doc.setFontSize(13); doc.setFont('helvetica', 'bold');
      doc.text('Feuille de recouvrement', margin, 10);

      doc.setTextColor(180, 200, 230);
      doc.setFontSize(7.5); doc.setFont('helvetica', 'normal');
      const date = new Date().toLocaleDateString('fr-FR', { day:'2-digit', month:'long', year:'numeric' });
      doc.text(`Généré le ${date}  ·  ${rows.length} contrat(s)`, margin, 17);

      // Totaux à droite
      const totalRecouvrir = rows.reduce((s,r) => s + r.montantARecouvrir, 0);
      const totalCollecte  = rows.reduce((s,r) => s + r.montantCollecte,   0);
      const totalAttendu   = rows.reduce((s,r) => s + r.montantAttendu,    0);
      const taux = totalAttendu > 0 ? Math.round(totalCollecte / totalAttendu * 100) : 0;

      doc.setFillColor(255,255,255);
      doc.setGState && doc.setGState(new (doc as any).GState({ opacity: 0.08 }));
      doc.roundedRect(W - 130, 3, 118, 18, 2, 2, 'F');
      doc.setGState && doc.setGState(new (doc as any).GState({ opacity: 1 }));

      doc.setTextColor(150, 180, 220); doc.setFontSize(6.5); doc.setFont('helvetica','normal');
      doc.text('ATTENDU', W - 126, 9);
      doc.text('COLLECTÉ', W - 96, 9);
      doc.text('À RECOUVRIR', W - 62, 9);
      doc.text('TAUX', W - 22, 9);

      doc.setTextColor(255,255,255); doc.setFontSize(8.5); doc.setFont('helvetica','bold');
      doc.text(fmt(totalAttendu), W - 126, 16);
      doc.setTextColor(134, 239, 172);
      doc.text(fmt(totalCollecte), W - 96, 16);
      doc.setTextColor(totalRecouvrir > 0 ? 252 : 134, totalRecouvrir > 0 ? 165 : 239, totalRecouvrir > 0 ? 165 : 172);
      doc.text(fmt(totalRecouvrir), W - 62, 16);
      doc.setTextColor(taux >= 80 ? 134 : taux >= 50 ? 253 : 252, taux >= 80 ? 239 : taux >= 50 ? 224 : 165, taux >= 80 ? 172 : taux >= 50 ? 71 : 165);
      doc.text(taux + '%', W - 22, 16);

      // ── Tableau ──
      const head = [['Collecteur','Propriétaire','Propriété','Produit','Locataire','Tél.','Zone','Statut','Mois impayés','Attendu','Collecté','À recouvrir']];
      const body = rows.map(r => [
        r.collecteurNom,
        r.proprietaireNom,
        r.proprieteLibelle || '—',
        r.produitCode,
        r.locataireNom,
        r.locataireTel || '—',
        r.zone || '—',
        statutLabel(r.statut),
        r.moisImpayes?.join(', ') || '—',
        fmt(r.montantAttendu),
        fmt(r.montantCollecte),
        fmt(r.montantARecouvrir),
      ]);

      (doc as any).autoTable({
        startY: 28,
        head,
        body,
        theme: 'plain',
        styles: {
          fontSize: 7,
          cellPadding: { top: 3, right: 4, bottom: 3, left: 4 },
          lineColor: [226, 232, 240],
          lineWidth: 0.2,
          valign: 'middle',
          overflow: 'linebreak',
          font: 'helvetica',
        },
        headStyles: {
          fillColor: [30, 41, 59],
          textColor: [148, 163, 184],
          fontStyle: 'bold',
          fontSize: 6.5,
          cellPadding: { top: 4, right: 4, bottom: 4, left: 4 },
          halign: 'left',
        },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        bodyStyles: { textColor: [51, 65, 85] },
        columnStyles: {
          0: { cellWidth: 24, fontStyle: 'bold' },
          1: { cellWidth: 26 },
          2: { cellWidth: 26 },
          3: { cellWidth: 14, halign: 'center', fontStyle: 'bold' },
          4: { cellWidth: 26 },
          5: { cellWidth: 20, textColor: [100, 116, 139] },
          6: { cellWidth: 18 },
          7: { cellWidth: 18, halign: 'center' },
          8: { cellWidth: 22 },
          9:  { cellWidth: 20, halign: 'right' },
          10: { cellWidth: 20, halign: 'right' },
          11: { cellWidth: 22, halign: 'right', fontStyle: 'bold' },
        },
        didParseCell: (data: any) => {
          if (data.section !== 'body') return;
          // Statut coloré
          if (data.column.index === 7) {
            const v = data.cell.raw as string;
            if (v === 'En retard') { data.cell.styles.textColor = [220, 38, 38]; data.cell.styles.fontStyle = 'bold'; }
            if (v === 'À jour')    { data.cell.styles.textColor = [22, 163, 74];  data.cell.styles.fontStyle = 'bold'; }
            if (v === 'En avance') { data.cell.styles.textColor = [37, 99, 235];  data.cell.styles.fontStyle = 'bold'; }
          }
          // Montant à recouvrir coloré
          if (data.column.index === 11) {
            const v = (data.cell.raw as string).replace(/\s/g,'');
            if (v !== '0' && v !== '—') data.cell.styles.textColor = [220, 38, 38];
            else data.cell.styles.textColor = [22, 163, 74];
          }
          // Collecté vert si > 0
          if (data.column.index === 10) {
            const v = (data.cell.raw as string).replace(/\s/g,'');
            if (v !== '0') data.cell.styles.textColor = [22, 163, 74];
          }
        },
        didDrawCell: (data: any) => {
          // Ligne séparatrice entre groupes de collecteurs
          if (data.section === 'body' && data.column.index === 0) {
            const idx = data.row.index;
            if (idx > 0) {
              const prevRow = body[idx - 1];
              const curRow  = body[idx];
              if (prevRow && curRow && prevRow[0] !== curRow[0]) {
                doc.setDrawColor(14, 28, 56);
                doc.setLineWidth(0.5);
                doc.line(margin, data.cell.y, W - margin, data.cell.y);
              }
            }
          }
        },
        margin: { left: margin, right: margin, top: 0, bottom: 12 },
      });

      // ── Pied de page ──
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFillColor(248, 250, 252);
        doc.rect(0, 200, W, 10, 'F');
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.3);
        doc.line(0, 200, W, 200);
        doc.setFontSize(6.5); doc.setTextColor(148, 163, 184);
        doc.setFont('helvetica','normal');
        doc.text('KDI Immobilier  ·  Feuille de recouvrement confidentielle', margin, 206);
        doc.text(`Page ${i} / ${pageCount}`, W - margin, 206, { align: 'right' });
        const now = new Date().toLocaleString('fr-FR');
        doc.text(now, W / 2, 206, { align: 'center' });
      }

      const dateFile = new Date().toISOString().slice(0, 10);
      doc.save(`feuille-recouvrement-${dateFile}.pdf`);
      this.showToast('📄 PDF téléchargé');
    });
  }
}