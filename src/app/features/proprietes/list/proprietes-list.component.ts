import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule }                       from '@angular/common';
import { RouterLink }                         from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ProprietesService, ProprietairesService } from '../../../core/services/api.services';
import { ProprieteListItemDto, ProprietaireListItemDto } from '../../../core/models/models';

@Component({
  selector: 'kdi-proprietes-list',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, ReactiveFormsModule],
  template: `
<div class="page">

  <!-- ══ HEADER ══ -->
  <div class="page-header">
    <div>
      <div class="page-eyebrow">Patrimoine</div>
      <div class="page-title">Propriétés</div>
      <div class="page-sub">{{ liste().totalCount }} propriété(s) · {{ totalProduits() }} produits locatifs</div>
    </div>
    <button class="btn-new" (click)="ouvrirModal()"><span>＋</span> Nouvelle propriété</button>
  </div>

  <!-- ══ KPIs ══ -->
  <div class="kpi-row" *ngIf="liste().items.length && !loading()">
    <div class="kpi k-navy">
      <div class="kpi-label">Total propriétés</div>
      <div class="kpi-val">{{ liste().totalCount }}</div>
      <div class="kpi-sub">{{ totalProduits() }} produits locatifs</div>
    </div>
    <div class="kpi k-green">
      <div class="kpi-label">Produits loués</div>
      <div class="kpi-val kv-green">{{ totalLoues() }}</div>
      <div class="kpi-sub">{{ totalProduits() > 0 ? (totalLoues() / totalProduits() * 100 | number:'1.0-0') : 0 }}% d'occupation</div>
    </div>
    <div class="kpi k-amber">
      <div class="kpi-label">Produits libres</div>
      <div class="kpi-val kv-amber">{{ totalLibres() }}</div>
      <div class="kpi-sub">À commercialiser</div>
    </div>
    <div class="kpi k-gold">
      <div class="kpi-label">Contrats gestion</div>
      <div class="kpi-val kv-gold">{{ nbAvecContrat() }}</div>
      <div class="kpi-sub">{{ liste().totalCount - nbAvecContrat() }} sans contrat</div>
    </div>
  </div>

  <!-- ══ FILTRES ══ -->
  <div class="filter-bar">
    <div class="search-wrap">
      <span class="search-ico">🔍</span>
      <input type="text" placeholder="Rechercher par nom, adresse, propriétaire…"
             [(ngModel)]="searchQuery" (input)="onSearch()">
      <span class="clear-btn" *ngIf="searchQuery" (click)="clearSearch()">✕</span>
    </div>
    <select class="filter-sel" [(ngModel)]="filtreContrat" (ngModelChange)="applyFilter()">
      <option value="">Contrat gestion</option>
      <option value="oui">✓ Actif</option>
      <option value="non">— Aucun</option>
    </select>
    <div class="view-toggle">
      <button class="vt-btn" [class.active]="vue==='grid'" (click)="vue='grid'" title="Vue grille">⊞</button>
      <button class="vt-btn" [class.active]="vue==='list'" (click)="vue='list'" title="Vue liste">☰</button>
    </div>
  </div>

  <!-- ══ VUE GRILLE ══ -->
  <div class="props-grid" *ngIf="vue==='grid' && itemsFiltres().length && !loading()">
    <div class="prop-card" *ngFor="let p of itemsFiltres()">
      <div class="card-banner" [style.background]="bannerGradient(p)">
        <div class="building-icon">{{ buildingIcon(p) }}</div>
        <div class="banner-bg-icon">{{ buildingIcon(p) }}</div>
        <div class="banner-right">
          <span class="cg-badge" [class.cg-actif]="p.aContratGestion" [class.cg-none]="!p.aContratGestion">
            {{ p.aContratGestion ? '✓ CG actif' : '— Aucun CG' }}
          </span>
          <span class="prod-counter">{{ p.nombreProduits }} produit(s)</span>
        </div>
      </div>
      <div class="card-body">
        <div class="prop-name">{{ p.libelle }}</div>
        <div class="prop-zone">{{ p.quartier }}</div>
        <div class="proprio-row">
          <div class="proprio-av" [style.background]="avatarColor(p.proprietaireNom)">{{ initiales(p.proprietaireNom) }}</div>
          <span class="proprio-name">{{ p.proprietaireNom }}</span>
        </div>
        <div class="stats-row">
          <div class="stat-chip sc-total"><div class="stat-num">{{ p.nombreProduits }}</div><div class="stat-lbl">Total</div></div>
          <div class="stat-chip sc-loues"><div class="stat-num">{{ p.nombreProduits - p.nombreLibres }}</div><div class="stat-lbl">Loués</div></div>
          <div class="stat-chip sc-libres"><div class="stat-num">{{ p.nombreLibres }}</div><div class="stat-lbl">Libres</div></div>
        </div>
      </div>
      <div class="card-footer">
        <span class="cf-adresse">{{ p.adresse }}</span>
        <a [routerLink]="['/proprietes', p.id]" class="btn-voir">Voir →</a>
      </div>
    </div>
  </div>

  <!-- ══ VUE LISTE ══ -->
  <div class="table-wrap" *ngIf="vue==='list' && itemsFiltres().length && !loading()">
    <table class="data-table">
      <thead><tr>
        <th>Propriété</th><th>Propriétaire</th><th>Adresse</th>
        <th class="tc">Produits</th><th class="tc">Loués</th><th class="tc">Libres</th>
        <th class="tc">Contrat gestion</th><th class="tc">Actions</th>
      </tr></thead>
      <tbody>
        <tr *ngFor="let p of itemsFiltres()">
          <td>
            <div class="list-prop">
              <div class="list-icon" [style.background]="bannerGradient(p)">{{ buildingIcon(p) }}</div>
              <div>
                <div class="prop-name">{{ p.libelle }}</div>
                <div class="prop-zone" style="margin:0">{{ p.quartier }}</div>
              </div>
            </div>
          </td>
          <td>
            <div class="proprio-row" style="margin:0">
              <div class="proprio-av sm" [style.background]="avatarColor(p.proprietaireNom)">{{ initiales(p.proprietaireNom) }}</div>
              <span style="font-size:13px">{{ p.proprietaireNom }}</span>
            </div>
          </td>
          <td class="text-muted">{{ p.adresse }}</td>
          <td class="tc"><span class="num-badge">{{ p.nombreProduits }}</span></td>
          <td class="tc"><span class="num-badge green">{{ p.nombreProduits - p.nombreLibres }}</span></td>
          <td class="tc"><span class="num-badge" [class.amber]="p.nombreLibres > 0">{{ p.nombreLibres }}</span></td>
          <td class="tc">
            <span class="statut-badge" [class.sb-ok]="p.aContratGestion" [class.sb-none]="!p.aContratGestion">
              {{ p.aContratGestion ? '✓ Actif' : '— Aucun' }}
            </span>
          </td>
          <td class="tc"><a [routerLink]="['/proprietes', p.id]" class="btn-voir">Voir →</a></td>
        </tr>
      </tbody>
    </table>
    <div class="pagination" *ngIf="liste().totalPages > 1">
      <button [disabled]="page===1" (click)="goTo(page-1)">‹</button>
      <span>Page {{ page }} / {{ liste().totalPages }}</span>
      <button [disabled]="page===liste().totalPages" (click)="goTo(page+1)">›</button>
    </div>
  </div>

  <!-- ══ EMPTY / LOADING ══ -->
  <div class="loading-state" *ngIf="loading()">
    <div class="spinner"></div><p>Chargement…</p>
  </div>
  <div class="empty-state" *ngIf="!loading() && !itemsFiltres().length">
    <div style="font-size:48px">🏢</div>
    <div class="empty-title">Aucune propriété trouvée</div>
    <div class="empty-sub">Cliquez sur « + Nouvelle propriété » pour commencer</div>
    <button class="btn-new" style="margin-top:16px" (click)="ouvrirModal()">＋ Nouvelle propriété</button>
  </div>

</div>

<!-- ══════════════════════════════════════════════════════════
     MODAL NOUVELLE PROPRIÉTÉ (inline)
══════════════════════════════════════════════════════════ -->
<div class="modal-overlay" [class.open]="modalOuvert()" (click)="onOverlayClick($event)">
  <div class="nv-modal" (click)="$event.stopPropagation()">
    <div class="nv-header">
      <div class="nv-header-left">
        <div class="nv-icon">🏢</div>
        <div>
          <div class="nv-title">Nouvelle propriété</div>
          <div class="nv-sub">Enregistrer un immeuble ou bâtiment</div>
        </div>
      </div>
      <button class="modal-close-btn" (click)="fermerModal()">✕</button>
    </div>
    <div class="stepper">
      <div class="stepper-step" *ngFor="let l of stepLabels; let i = index">
        <div class="step-dot" [class.step-active]="etape()===i+1" [class.step-done]="etape()>i+1">
          {{ etape() > i+1 ? '✓' : i+1 }}
        </div>
        <div class="step-label">{{ l }}</div>
      </div>
    </div>
    <div class="nv-body" [formGroup]="form">
      <!-- Étape 1 -->
      <ng-container *ngIf="etape()===1">
        <div class="step-title">👤 Sélectionner le propriétaire</div>
        <div class="field-group">
          <label class="field-lbl">Propriétaire <span class="req">*</span></label>
          <div class="field-row-input" [class.focused]="propFocused">
            <span class="fi">🔍</span>
            <input type="text" class="fi-input" placeholder="Rechercher par nom, téléphone…"
                   [(ngModel)]="searchProp" [ngModelOptions]="{standalone:true}"
                   (input)="rechercherProp()" (focus)="propFocused=true" (blur)="onPropBlur()" autocomplete="off"/>
            <span *ngIf="searchProp" class="clear-x" (click)="clearProp()">✕</span>
          </div>
          <div class="ac-list" *ngIf="propResultats.length && showPropResults">
            <div *ngFor="let p of propResultats" class="ac-item"
                 [class.ac-selected]="propSel?.id===p.id" (click)="selectProp(p)">
              <div class="ac-avatar">{{ initiales(p.nomComplet) }}</div>
              <div class="ac-info"><div class="ac-name">{{ p.nomComplet }}</div><div class="ac-detail">{{ p.telephone }}</div></div>
              <span *ngIf="propSel?.id===p.id" class="ac-check">✓</span>
            </div>
          </div>
          <div class="selected-item" *ngIf="propSel && !showPropResults">
            <div class="ac-avatar ac-ok">{{ initiales(propSel.nomComplet) }}</div>
            <div class="ac-info"><div class="ac-name">{{ propSel.nomComplet }}</div><div class="ac-detail">{{ propSel.telephone }}</div></div>
            <button class="btn-change" (click)="clearProp()">Changer</button>
          </div>
          <p class="hint" *ngIf="!propSel">Tapez au moins 2 caractères pour rechercher</p>
        </div>
      </ng-container>
      <!-- Étape 2 -->
      <ng-container *ngIf="etape()===2">
        <div class="step-title">📍 Localisation de la propriété</div>
        <div class="two-col">
          <div class="field-group">
            <label class="field-lbl">Libellé / Nom <span class="req">*</span></label>
            <div class="field-input-wrap" [class.err]="invalid('libelle')">
              <span class="fi">🏢</span><input type="text" class="fi-input" placeholder="Ex : Résidence Les Palmiers" formControlName="libelle"/>
            </div>
            <span class="err-msg" *ngIf="invalid('libelle')">Champ obligatoire</span>
          </div>
          <div class="field-group">
            <label class="field-lbl">Ville <span class="req">*</span></label>
            <div class="field-input-wrap" [class.err]="invalid('ville')">
              <span class="fi">🌍</span><input type="text" class="fi-input" placeholder="Ex : Nouakchott" formControlName="ville"/>
            </div>
            <span class="err-msg" *ngIf="invalid('ville')">Champ obligatoire</span>
          </div>
        </div>
        <div class="two-col">
          <div class="field-group">
            <label class="field-lbl">Adresse <span class="req">*</span></label>
            <div class="field-input-wrap" [class.err]="invalid('adresse')">
              <span class="fi">📍</span><input type="text" class="fi-input" placeholder="Ex : Avenue principale" formControlName="adresse"/>
            </div>
            <span class="err-msg" *ngIf="invalid('adresse')">Champ obligatoire</span>
          </div>
          <div class="field-group">
            <label class="field-lbl">Quartier</label>
            <div class="field-input-wrap">
              <span class="fi">🗺️</span><input type="text" class="fi-input" placeholder="Ex : Tevragh Zeina" formControlName="quartier"/>
            </div>
          </div>
        </div>
        <div class="field-group">
          <label class="field-lbl">Code zone</label>
          <div class="field-input-wrap" style="max-width:200px">
            <span class="fi">🔖</span><input type="text" class="fi-input" placeholder="Ex : TZ-01" formControlName="zoneCode"/>
          </div>
          <p class="hint">Optionnel — code interne de la zone géographique</p>
        </div>
      </ng-container>
      <!-- Étape 3 -->
      <ng-container *ngIf="etape()===3">
        <div class="step-title">📋 Détails & confirmation</div>
        <div class="field-group">
          <label class="field-lbl">Description</label>
          <textarea class="fi-textarea" placeholder="Type de construction, état général, particularités…" formControlName="description" rows="3"></textarea>
          <p class="hint">Optionnel</p>
        </div>
        <div class="recap-card">
          <div class="recap-title">Récapitulatif</div>
          <div class="recap-grid">
            <div class="recap-item"><div class="rc-lbl">Propriétaire</div><div class="rc-val">{{ propSel?.nomComplet || '—' }}</div></div>
            <div class="recap-item"><div class="rc-lbl">Libellé</div><div class="rc-val">{{ form.get('libelle')?.value || '—' }}</div></div>
            <div class="recap-item"><div class="rc-lbl">Adresse</div><div class="rc-val">{{ form.get('adresse')?.value || '—' }}</div></div>
            <div class="recap-item"><div class="rc-lbl">Ville</div><div class="rc-val">{{ form.get('ville')?.value || '—' }}</div></div>
          </div>
        </div>
        <div class="success-banner" *ngIf="successMsg()">✅ {{ successMsg() }}</div>
        <div class="error-banner"   *ngIf="errorMsg()">⚠️ {{ errorMsg() }}</div>
      </ng-container>
    </div>
    <div class="nv-footer">
      <button class="btn-ghost" (click)="fermerModal()">Annuler</button>
      <div class="footer-right">
        <button class="btn-sec" *ngIf="etape()>1" (click)="etapePrev()">← Précédent</button>
        <button class="btn-primary" *ngIf="etape()<3" [disabled]="!peutContinuer()" (click)="etapeNext()">Suivant →</button>
        <button class="btn-submit" *ngIf="etape()===3" [disabled]="!form.valid||!propSel||submitting()" (click)="soumettre()">
          <span *ngIf="!submitting()">✓ Enregistrer</span>
          <span *ngIf="submitting()" class="spin-inline"></span>
        </button>
      </div>
    </div>
  </div>
</div>
  `,
  styles: [`
    .page { width:100%; }

    /* ── Header ── */
    .page-header { display:flex; justify-content:space-between; align-items:flex-end; margin-bottom:22px; flex-wrap:wrap; gap:12px; }
    .page-eyebrow { font-size:10px; font-weight:700; letter-spacing:1.5px; text-transform:uppercase; color:#c9a96e; margin-bottom:4px; }
    .page-title { font-size:26px; font-weight:800; color:#0e1c38; }
    .page-sub { font-size:13px; color:#64748b; margin-top:3px; }
    .btn-new { display:inline-flex; align-items:center; gap:8px; background:#0e1c38; color:#fff; padding:10px 22px; border-radius:10px; border:none; font-size:14px; font-weight:600; cursor:pointer; transition:all .15s; font-family:inherit; }
    .btn-new:hover { background:#162d52; box-shadow:0 4px 20px rgba(14,28,56,.25); }

    /* ── KPIs ── */
    .kpi-row { display:grid; grid-template-columns:repeat(4,1fr); gap:14px; margin-bottom:20px; }
    .kpi { background:#fff; border-radius:12px; padding:16px 18px; border:1px solid #e2e8f0; box-shadow:0 2px 8px rgba(14,28,56,.05); }
    .kpi-label { font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:.6px; color:#64748b; margin-bottom:6px; }
    .kpi-val { font-size:22px; font-weight:800; color:#0e1c38; }
    .kpi-sub { font-size:11px; color:#64748b; margin-top:3px; }
    .kpi.k-green { border-top:3px solid #16a34a; } .kpi.k-amber { border-top:3px solid #d97706; }
    .kpi.k-navy  { border-top:3px solid #0e1c38; } .kpi.k-gold  { border-top:3px solid #c9a96e; }
    .kv-green { color:#16a34a !important; } .kv-amber { color:#d97706 !important; } .kv-gold { color:#c9a96e !important; }

    /* ── Filtres ── */
    .filter-bar { display:flex; gap:10px; align-items:center; background:#fff; border-radius:12px; padding:12px 16px; border:1px solid #e2e8f0; margin-bottom:18px; box-shadow:0 2px 8px rgba(14,28,56,.05); }
    .search-wrap { position:relative; flex:1; }
    .search-wrap input { width:100%; padding:8px 14px 8px 36px; border:1.5px solid #e2e8f0; border-radius:9px; font-size:13px; background:#f4f7fb; outline:none; transition:border-color .15s; font-family:inherit; }
    .search-wrap input:focus { border-color:#0e1c38; background:#fff; }
    .search-ico { position:absolute; left:11px; top:50%; transform:translateY(-50%); color:#94a3b8; pointer-events:none; }
    .clear-btn { position:absolute; right:11px; top:50%; transform:translateY(-50%); color:#94a3b8; cursor:pointer; font-size:12px; }
    .filter-sel { padding:8px 12px; border:1.5px solid #e2e8f0; border-radius:9px; font-size:13px; background:#f4f7fb; outline:none; cursor:pointer; font-family:inherit; }
    .view-toggle { display:flex; gap:3px; background:#e8edf5; border-radius:8px; padding:3px; }
    .vt-btn { width:32px; height:32px; border:none; border-radius:6px; background:none; cursor:pointer; color:#64748b; font-size:16px; display:flex; align-items:center; justify-content:center; transition:all .15s; }
    .vt-btn.active { background:#fff; color:#0e1c38; box-shadow:0 1px 4px rgba(14,28,56,.1); }

    /* ── Grille ── */
    .props-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:18px; }
    .prop-card { background:#fff; border-radius:16px; border:1px solid #e2e8f0; box-shadow:0 2px 12px rgba(14,28,56,.07); overflow:hidden; cursor:pointer; transition:transform .18s,box-shadow .18s; display:flex; flex-direction:column; }
    .prop-card:hover { transform:translateY(-3px); box-shadow:0 8px 30px rgba(14,28,56,.13); }
    .card-banner { height:88px; display:flex; align-items:center; justify-content:space-between; padding:0 18px; position:relative; overflow:hidden; }
    .building-icon { width:50px; height:50px; border-radius:13px; display:flex; align-items:center; justify-content:center; font-size:24px; background:rgba(255,255,255,.2); border:2px solid rgba(255,255,255,.3); position:relative; z-index:1; }
    .banner-bg-icon { font-size:68px; opacity:.12; position:absolute; right:10px; top:50%; transform:translateY(-50%); pointer-events:none; }
    .banner-right { display:flex; flex-direction:column; align-items:flex-end; gap:5px; position:relative; z-index:1; }
    .cg-badge { padding:3px 10px; border-radius:20px; font-size:11px; font-weight:700; }
    .cg-actif { background:rgba(22,163,74,.25); color:#d1fae5; border:1px solid rgba(22,163,74,.4); }
    .cg-none  { background:rgba(255,255,255,.12); color:rgba(255,255,255,.7); border:1px solid rgba(255,255,255,.2); }
    .prod-counter { font-size:11px; color:rgba(255,255,255,.65); background:rgba(0,0,0,.15); padding:2px 8px; border-radius:10px; }
    .card-body { padding:14px 16px; flex:1; }
    .prop-name { font-size:14px; font-weight:700; color:#0e1c38; margin-bottom:2px; }
    .prop-zone { font-size:11px; color:#64748b; margin-bottom:10px; }
    .prop-zone::before { content:'📍'; font-size:10px; margin-right:3px; }
    .proprio-row { display:flex; align-items:center; gap:7px; margin-bottom:10px; }
    .proprio-av { width:26px; height:26px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:10px; font-weight:700; color:#fff; flex-shrink:0; }
    .proprio-av.sm { width:22px; height:22px; font-size:9px; }
    .proprio-name { font-size:12px; font-weight:600; color:#334155; }
    .stats-row { display:flex; gap:6px; }
    .stat-chip { flex:1; text-align:center; padding:6px 4px; border-radius:8px; border:1px solid #e2e8f0; }
    .stat-num { font-size:16px; font-weight:800; }
    .stat-lbl { font-size:9px; font-weight:600; text-transform:uppercase; letter-spacing:.4px; color:#64748b; margin-top:1px; }
    .sc-total { background:#f4f7fb; } .sc-total .stat-num { color:#0e1c38; }
    .sc-loues { background:#d1fae5; border-color:#86efac; } .sc-loues .stat-num { color:#16a34a; }
    .sc-libres { background:#fef3c7; border-color:#fde68a; } .sc-libres .stat-num { color:#d97706; }
    .card-footer { padding:10px 16px; border-top:1px solid #f1f5f9; display:flex; align-items:center; justify-content:space-between; background:#f8fafc; }
    .cf-adresse { font-size:11px; color:#94a3b8; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:200px; }
    .btn-voir { display:inline-flex; align-items:center; padding:5px 12px; border-radius:7px; background:#0e1c38; color:#fff; font-size:11px; font-weight:600; border:none; cursor:pointer; text-decoration:none; white-space:nowrap; flex-shrink:0; transition:background .15s; }
    .btn-voir:hover { background:#162d52; }

    /* ── Liste ── */
    .table-wrap { background:#fff; border-radius:14px; overflow:hidden; box-shadow:0 2px 12px rgba(14,28,56,.08); border:1px solid #e2e8f0; }
    .data-table { width:100%; border-collapse:collapse; }
    .data-table th { padding:10px 13px; background:#f8fafc; font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:.5px; color:#64748b; border-bottom:2px solid #e2e8f0; text-align:left; }
    .data-table td { padding:11px 13px; font-size:13px; color:#334155; border-bottom:1px solid #f8fafc; vertical-align:middle; }
    .data-table tr:last-child td { border-bottom:none; }
    .data-table tr:hover td { background:#fafbff; }
    .tc { text-align:center; }
    .text-muted { color:#94a3b8; font-size:12px; }
    .list-prop { display:flex; align-items:center; gap:10px; }
    .list-icon { width:38px; height:38px; border-radius:10px; display:flex; align-items:center; justify-content:center; font-size:18px; flex-shrink:0; }
    .num-badge { font-family:monospace; background:#f1f5f9; padding:2px 8px; border-radius:6px; font-size:12px; font-weight:700; color:#0e1c38; }
    .num-badge.green { background:#d1fae5; color:#16a34a; }
    .num-badge.amber { background:#fef3c7; color:#d97706; }
    .statut-badge { padding:3px 10px; border-radius:20px; font-size:11px; font-weight:600; }
    .sb-ok   { background:#d1fae5; color:#065f46; }
    .sb-none { background:#f1f5f9; color:#94a3b8; }
    .pagination { display:flex; align-items:center; justify-content:center; gap:16px; padding:14px; border-top:1px solid #e2e8f0; font-size:13px; color:#64748b; background:#f8fafc; }
    .pagination button { width:30px; height:30px; border-radius:7px; border:1.5px solid #e2e8f0; background:#fff; cursor:pointer; font-size:14px; }
    .pagination button:disabled { opacity:.4; cursor:not-allowed; }

    /* ── Empty / Loading ── */
    .empty-state { text-align:center; padding:60px 20px; }
    .empty-title { font-size:16px; font-weight:700; color:#0e1c38; margin:8px 0 4px; }
    .empty-sub { font-size:13px; color:#64748b; }
    .loading-state { display:flex; flex-direction:column; align-items:center; padding:60px; gap:14px; color:#94a3b8; }
    .spinner { width:32px; height:32px; border:3px solid #e2e8f0; border-top-color:#0e1c38; border-radius:50%; animation:spin .8s linear infinite; }
    @keyframes spin { to { transform:rotate(360deg); } }

    /* ── Responsive ── */
    @media(max-width:1100px) { .props-grid { grid-template-columns:repeat(2,1fr); } }
    @media(max-width:700px)  { .props-grid { grid-template-columns:1fr; } .kpi-row { grid-template-columns:1fr 1fr; } }

    /* ══ MODAL ══ */
    .modal-overlay { position:fixed; inset:0; background:rgba(13,13,13,.55); backdrop-filter:blur(4px); z-index:1000; display:flex; align-items:center; justify-content:center; padding:20px; opacity:0; pointer-events:none; transition:opacity .22s; }
    .modal-overlay.open { opacity:1; pointer-events:all; }
    .nv-modal { background:#fff; border-radius:18px; width:100%; max-width:620px; max-height:90vh; box-shadow:0 24px 80px rgba(13,13,13,.22),0 0 0 1px rgba(201,168,76,.15); display:flex; flex-direction:column; overflow:hidden; transform:translateY(16px) scale(.97); transition:transform .25s; }
    .modal-overlay.open .nv-modal { transform:translateY(0) scale(1); }
    .nv-header { padding:20px 24px 16px; background:linear-gradient(to right,#1A1A2E,#2D2D4A); display:flex; align-items:center; justify-content:space-between; flex-shrink:0; }
    .nv-header-left { display:flex; align-items:center; gap:13px; }
    .nv-icon { width:42px; height:42px; border-radius:11px; background:rgba(201,168,76,.18); border:1.5px solid rgba(201,168,76,.35); display:flex; align-items:center; justify-content:center; font-size:19px; flex-shrink:0; }
    .nv-title { font-size:17px; font-weight:700; color:#E8C96A; }
    .nv-sub   { font-size:11.5px; color:rgba(255,255,255,.4); margin-top:2px; }
    .modal-close-btn { width:30px; height:30px; border-radius:7px; border:none; background:rgba(255,255,255,.1); color:rgba(255,255,255,.6); font-size:13px; cursor:pointer; transition:all .15s; display:flex; align-items:center; justify-content:center; }
    .modal-close-btn:hover { background:rgba(192,57,43,.3); color:#fff; }
    .stepper { display:flex; align-items:center; justify-content:center; padding:16px 24px 12px; background:#F8F4ED; border-bottom:1px solid #EDE8DF; flex-shrink:0; }
    .stepper-step { display:flex; flex-direction:column; align-items:center; gap:5px; flex:1; }
    .step-dot { width:28px; height:28px; border-radius:50%; background:#fff; border:2px solid #EDE8DF; display:flex; align-items:center; justify-content:center; font-size:12px; font-weight:700; color:#8A8899; transition:all .2s; }
    .step-active { background:#C9A84C; border-color:#C9A84C; color:#fff; box-shadow:0 0 0 4px rgba(201,168,76,.2); }
    .step-done   { background:#1A7A4A; border-color:#1A7A4A; color:#fff; }
    .step-label  { font-size:11px; font-weight:600; color:#8A8899; text-align:center; }
    .nv-body { flex:1; overflow-y:auto; padding:22px 24px; }
    .step-title { font-size:13px; font-weight:700; color:#2D2D4A; margin-bottom:16px; padding-bottom:10px; border-bottom:1px solid #EDE8DF; }
    .two-col { display:grid; grid-template-columns:1fr 1fr; gap:14px; }
    .field-group { margin-bottom:14px; }
    .field-lbl { display:block; font-size:12px; font-weight:700; color:#2D2D4A; margin-bottom:6px; }
    .req { color:#C0392B; margin-left:2px; }
    .hint { font-size:11.5px; color:#8A8899; margin-top:4px; }
    .err-msg { font-size:11.5px; color:#C0392B; margin-top:4px; display:block; }
    .field-input-wrap, .field-row-input { display:flex; align-items:center; border:1.5px solid #EDE8DF; border-radius:9px; background:#fff; transition:all .18s; overflow:hidden; }
    .field-input-wrap:focus-within, .field-row-input.focused { border-color:#C9A84C; box-shadow:0 0 0 3px rgba(201,168,76,.1); }
    .field-input-wrap.err { border-color:#C0392B; }
    .fi { padding:0 11px; font-size:14px; flex-shrink:0; }
    .fi-input { flex:1; border:none; outline:none; padding:10px 11px 10px 0; font-size:13px; color:#0D0D0D; font-family:inherit; background:transparent; }
    .fi-input::placeholder { color:#c0bcc8; }
    .fi-textarea { width:100%; border:1.5px solid #EDE8DF; border-radius:9px; padding:11px 14px; font-size:13px; color:#0D0D0D; resize:none; font-family:inherit; outline:none; background:#fff; line-height:1.6; transition:border-color .18s; }
    .fi-textarea:focus { border-color:#C9A84C; }
    .fi-textarea::placeholder { color:#c0bcc8; }
    .clear-x { padding:0 11px; color:#8A8899; cursor:pointer; font-size:12px; }
    .clear-x:hover { color:#C0392B; }
    .ac-list { border:1.5px solid #EDE8DF; border-radius:9px; overflow:hidden; margin-top:6px; background:#fff; max-height:220px; overflow-y:auto; box-shadow:0 4px 16px rgba(0,0,0,.08); }
    .ac-item { display:flex; align-items:center; gap:10px; padding:10px 13px; cursor:pointer; border-bottom:1px solid #EDE8DF; transition:background .14s; }
    .ac-item:last-child { border:none; }
    .ac-item:hover, .ac-item.ac-selected { background:rgba(201,168,76,.06); }
    .ac-avatar { width:32px; height:32px; border-radius:8px; background:linear-gradient(135deg,#1A1A2E,#2D2D4A); display:flex; align-items:center; justify-content:center; font-size:11px; color:#E8C96A; font-weight:700; flex-shrink:0; }
    .ac-avatar.ac-ok { background:linear-gradient(135deg,#1A7A4A,#2EA862); }
    .ac-info { flex:1; }
    .ac-name { font-size:13px; font-weight:600; color:#0D0D0D; }
    .ac-detail { font-size:11px; color:#8A8899; margin-top:1px; }
    .ac-check { color:#1A7A4A; font-weight:700; }
    .selected-item { display:flex; align-items:center; gap:10px; padding:11px 14px; border-radius:9px; background:#E6F5EE; border:1.5px solid #1A7A4A; margin-top:6px; }
    .btn-change { font-size:11.5px; color:#1A7A4A; font-weight:700; background:none; border:1px solid #1A7A4A; border-radius:6px; padding:3px 10px; cursor:pointer; transition:all .15s; font-family:inherit; }
    .btn-change:hover { background:#1A7A4A; color:#fff; }
    .recap-card { background:#F8F4ED; border-radius:9px; padding:14px 16px; border:1px solid #EDE8DF; margin-top:4px; }
    .recap-title { font-size:12px; font-weight:700; color:#2D2D4A; margin-bottom:10px; }
    .recap-grid { display:grid; grid-template-columns:1fr 1fr; gap:8px; }
    .rc-lbl { font-size:10.5px; color:#8A8899; font-weight:700; text-transform:uppercase; letter-spacing:.5px; }
    .rc-val { font-size:13px; color:#0D0D0D; font-weight:600; margin-top:2px; }
    .success-banner { display:flex; align-items:center; gap:8px; background:#E6F5EE; border:1px solid #1A7A4A; border-radius:9px; padding:11px 14px; font-size:13px; color:#1A7A4A; font-weight:600; margin-top:12px; }
    .error-banner   { display:flex; align-items:center; gap:8px; background:#FDECEA; border:1px solid #C0392B; border-radius:9px; padding:11px 14px; font-size:13px; color:#C0392B; font-weight:600; margin-top:12px; }
    .nv-footer { padding:14px 24px; border-top:1px solid #EDE8DF; background:#F8F4ED; display:flex; align-items:center; justify-content:space-between; flex-shrink:0; }
    .footer-right { display:flex; gap:9px; }
    .btn-ghost   { background:none; border:none; cursor:pointer; font-size:13px; color:#8A8899; padding:8px 2px; font-family:inherit; transition:color .15s; }
    .btn-ghost:hover { color:#C0392B; }
    .btn-sec     { padding:8px 16px; border-radius:8px; background:#fff; color:#2D2D4A; border:1.5px solid #EDE8DF; font-size:13px; font-weight:600; cursor:pointer; font-family:inherit; transition:all .15s; }
    .btn-sec:hover { border-color:#2D2D4A; }
    .btn-primary { padding:8px 20px; border-radius:8px; background:#1A1A2E; color:#E8C96A; border:none; font-size:13px; font-weight:600; cursor:pointer; font-family:inherit; transition:background .18s; }
    .btn-primary:hover:not(:disabled) { background:#2D2D4A; }
    .btn-primary:disabled { opacity:.4; cursor:not-allowed; }
    .btn-submit  { padding:8px 22px; border-radius:8px; background:linear-gradient(135deg,#8B6914,#C9A84C); color:#fff; border:none; font-size:13px; font-weight:700; cursor:pointer; font-family:inherit; min-width:150px; display:flex; align-items:center; justify-content:center; transition:all .18s; }
    .btn-submit:hover:not(:disabled) { box-shadow:0 4px 14px rgba(201,168,76,.35); }
    .btn-submit:disabled { opacity:.4; cursor:not-allowed; }
    .spin-inline { width:16px; height:16px; border:2.5px solid rgba(255,255,255,.35); border-top-color:#fff; border-radius:50%; animation:spin .7s linear infinite; display:inline-block; }
    @media(max-width:600px) { .two-col { grid-template-columns:1fr; } .recap-grid { grid-template-columns:1fr; } }
  `]
})
export class ProprietesListComponent implements OnInit {
  private svc      = inject(ProprietesService);
  private propSvc2 = inject(ProprietairesService);
  private fb       = inject(FormBuilder);

  // ── Liste ──
  liste   = signal<any>({ items:[], totalCount:0, totalPages:1 });
  loading = signal(false);
  page    = 1;
  searchQuery  = '';
  filtreContrat = '';
  vue = 'grid';
  private timer: any;

  // ── Modal ──
  modalOuvert = signal(false);
  etape       = signal(1);
  submitting  = signal(false);
  successMsg  = signal('');
  errorMsg    = signal('');
  stepLabels  = ['Propriétaire', 'Localisation', 'Détails'];
  searchProp      = '';
  propFocused     = false;
  showPropResults = false;
  propResultats:  ProprietaireListItemDto[] = [];
  propSel:        ProprietaireListItemDto | null = null;
  private timer2: any;

  form = this.fb.group({
    libelle:     ['', Validators.required],
    adresse:     ['', Validators.required],
    ville:       ['', Validators.required],
    quartier:    [''],
    zoneCode:    [''],
    description: [''],
  });

  ngOnInit(): void { this.charger(); }

  charger(): void {
    this.loading.set(true);
    this.svc.getAll(this.page, 20, this.searchQuery || undefined).subscribe({
      next:  res => { this.liste.set(res); this.loading.set(false); },
      error: ()  => this.loading.set(false)
    });
  }

  onSearch(): void { clearTimeout(this.timer); this.timer = setTimeout(() => { this.page=1; this.charger(); }, 350); }
  clearSearch(): void { this.searchQuery=''; this.page=1; this.charger(); }
  goTo(p: number): void { this.page=p; this.charger(); }
  applyFilter(): void { /* itemsFiltres() est recalculé automatiquement */ }

  // KPIs
  totalProduits() { return (this.liste().items as ProprieteListItemDto[]).reduce((s,p)=>s+p.nombreProduits,0); }
  totalLoues()    { return (this.liste().items as ProprieteListItemDto[]).reduce((s,p)=>s+(p.nombreProduits-p.nombreLibres),0); }
  totalLibres()   { return (this.liste().items as ProprieteListItemDto[]).reduce((s,p)=>s+p.nombreLibres,0); }
  nbAvecContrat() { return (this.liste().items as ProprieteListItemDto[]).filter(p=>p.aContratGestion).length; }

  itemsFiltres(): ProprieteListItemDto[] {
    return (this.liste().items as ProprieteListItemDto[]).filter(p => {
      if (this.filtreContrat==='oui' && !p.aContratGestion) return false;
      if (this.filtreContrat==='non' &&  p.aContratGestion) return false;
      return true;
    });
  }

  // Modal
  ouvrirModal(): void { this.resetModal(); this.modalOuvert.set(true); }
  fermerModal(): void { this.modalOuvert.set(false); setTimeout(()=>this.resetModal(),250); }
  onOverlayClick(e: Event): void { if((e.target as HTMLElement).classList.contains('modal-overlay')) this.fermerModal(); }
  resetModal(): void { this.etape.set(1); this.form.reset(); this.searchProp=''; this.propSel=null; this.propResultats=[]; this.showPropResults=false; this.successMsg.set(''); this.errorMsg.set(''); this.submitting.set(false); }
  peutContinuer(): boolean {
    if(this.etape()===1) return !!this.propSel;
    if(this.etape()===2) return !!this.form.get('libelle')?.valid && !!this.form.get('adresse')?.valid && !!this.form.get('ville')?.valid;
    return true;
  }
  rechercherProp(): void {
    clearTimeout(this.timer2);
    const q = this.searchProp.trim();
    if(q.length<2){ this.propResultats=[]; this.showPropResults=false; return; }
    this.timer2 = setTimeout(()=>{
      this.propSvc2.getAll(1,10,q).subscribe({ next:res=>{ this.propResultats=res.items??[]; this.showPropResults=true; }, error:()=>{ this.propResultats=[]; } });
    }, 250);
  }
  onPropBlur(): void { setTimeout(()=>{ this.propFocused=false; if(!this.propSel) this.showPropResults=false; },200); }
  selectProp(p: ProprietaireListItemDto): void { this.propSel=p; this.searchProp=p.nomComplet; this.showPropResults=false; }
  clearProp(): void { this.propSel=null; this.searchProp=''; this.propResultats=[]; this.showPropResults=false; }
  etapePrev(): void { this.etape.update(e=>e-1); }
  etapeNext(): void { if(this.peutContinuer()) this.etape.update(e=>e+1); }
  soumettre(): void {
    if(!this.form.valid||!this.propSel) return;
    this.submitting.set(true); this.errorMsg.set('');
    const payload = { proprietaireId:this.propSel.id, ...this.form.value };
    this.svc.create(payload).subscribe({
      next:()=>{ this.submitting.set(false); this.successMsg.set('Propriété créée avec succès !'); this.charger(); setTimeout(()=>this.fermerModal(),1500); },
      error:(err:any)=>{ this.submitting.set(false); this.errorMsg.set(err?.error?.message??'Une erreur est survenue.'); }
    });
  }
  invalid(f: string): boolean { const c=this.form.get(f); return !!(c?.invalid&&c?.touched); }
  initiales(nom: string): string { return (nom??'?').split(' ').map((w:string)=>w[0]).join('').toUpperCase().slice(0,2); }

  // ── Helpers visuels ──
  buildingIcon(p: ProprieteListItemDto): string {
    const l = p.libelle?.toLowerCase()??'';
    if(l.includes('commerce')||l.includes('commercial')||l.includes('boutique')) return '🏪';
    if(l.includes('villa')) return '🏡';
    if(l.includes('terrain')) return '🌿';
    if(l.includes('résidence')||l.includes('residence')) return '🏛️';
    return '🏢';
  }
  bannerGradient(p: ProprieteListItemDto): string {
    const l = p.libelle?.toLowerCase()??'';
    if(l.includes('commerce')||l.includes('commercial')) return 'linear-gradient(135deg,#92400e,#b45309)';
    if(l.includes('villa')) return 'linear-gradient(135deg,#065f46,#047857)';
    if(l.includes('terrain')) return 'linear-gradient(135deg,#4c1d95,#6d28d9)';
    if(l.includes('résidence')||l.includes('residence')) return 'linear-gradient(135deg,#1e3a5f,#2563eb)';
    const colors=['linear-gradient(135deg,#0e1c38,#1e3a6e)','linear-gradient(135deg,#1e3a5f,#2563eb)','linear-gradient(135deg,#065f46,#047857)','linear-gradient(135deg,#7c2d12,#c2410c)'];
    let hash=0; for(const c of p.libelle??'') hash=(hash*31+c.charCodeAt(0))&0xffff;
    return colors[hash%colors.length];
  }
  avatarColor(nom: string): string {
    const colors=['#0e1c38','#065f46','#92400e','#4c1d95','#1e3a5f','#7c2d12'];
    let hash=0; for(const c of nom??'') hash=(hash*31+c.charCodeAt(0))&0xffff;
    return colors[hash%colors.length];
  }
}