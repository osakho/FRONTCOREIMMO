import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule, DecimalPipe }          from '@angular/common';
import { RouterLink, ActivatedRoute }         from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ProduitsService, ProprietesService } from '../../../core/services/api.services';
import { ProduitListItemDto, PagedList, TypeProduit, StatutProduit } from '../../../core/models/models';

@Component({
  selector: 'kdi-produits-list',
  standalone: true,
  imports: [CommonModule, DecimalPipe, RouterLink, FormsModule, ReactiveFormsModule],
  template: `
<div class="page">

  <!-- ══ HEADER ══ -->
  <div class="page-header">
    <div>
      <div class="eyebrow">Parc locatif</div>
      <div class="page-title">Produits locatifs</div>
      <div class="page-sub">{{ liste().totalCount }} produit(s) · Chambres, appartements, boutiques, garages</div>
    </div>
    <button class="btn-new" (click)="ouvrirModal()">＋ Nouveau produit</button>
  </div>

  <!-- ══ TYPE CARDS ══ -->
  <div class="type-row" *ngIf="typesStats().length && !loading()">
    <div class="type-card" [class.active]="filtreType===''"
         (click)="toggleType('')">
      <div class="tc-icon" style="background:#f1f5f9">📦</div>
      <div class="tc-main">
        <div class="tc-count">{{ liste().totalCount }}</div>
        <div class="tc-label">Tous</div>
        <div class="tc-badges">
          <span class="tb tb-l">{{ totalLoues() }}L</span>
          <span class="tb tb-b">{{ totalLibres() }}B</span>
        </div>
      </div>
    </div>
    <div class="type-card" *ngFor="let t of typesStats()"
         [class.active]="filtreType===t.value"
         (click)="toggleType(t.value)">
      <div class="tc-icon" [style.background]="typeBg(t.value)">{{ t.icon }}</div>
      <div class="tc-main">
        <div class="tc-count">{{ t.total }}</div>
        <div class="tc-label">{{ t.label }}</div>
        <div class="tc-badges">
          <span class="tb tb-l" *ngIf="t.loues">{{ t.loues }}L</span>
          <span class="tb tb-b" *ngIf="t.libres">{{ t.libres }}B</span>
        </div>
      </div>
    </div>
  </div>

  <!-- ══ BULK BAR ══ -->
  <div class="bulk-bar" *ngIf="selection.size > 0">
    <span class="bulk-count">{{ selection.size }} sélectionné(s)</span>
    <div class="bulk-actions">
      <button class="bulk-btn bb-bail">📄 Créer baux</button>
      <button class="bulk-btn bb-export">⬇ Exporter</button>
      <button class="bulk-btn bb-clear" (click)="clearSelection()">✕ Désélectionner</button>
    </div>
  </div>

  <!-- ══ TOOLBAR ══ -->
  <div class="toolbar">
    <div class="search-w">
      <span class="si">🔍</span>
      <input type="text" placeholder="Code, description, propriété…"
             [(ngModel)]="search" (ngModelChange)="onSearch()">
      <span class="clear-x" *ngIf="search" (click)="clearSearch()">✕</span>
    </div>
    <div class="chips">
      <button class="chip"         [class.on]="filtreStatut===''"          (click)="setStatut('')">Tous</button>
      <button class="chip c-libre" [class.on]="filtreStatut==='Libre'"     (click)="setStatut('Libre')">Libres</button>
      <button class="chip c-loue"  [class.on]="filtreStatut==='Loue'"      (click)="setStatut('Loue')">Loués</button>
      <button class="chip c-trav"  [class.on]="filtreStatut==='EnTravaux'" (click)="setStatut('EnTravaux')">Travaux</button>
      <button class="chip c-res"   [class.on]="filtreStatut==='Reserve'"   (click)="setStatut('Reserve')">Réservés</button>
    </div>
    <div class="view-tog">
      <button class="vb" [class.on]="vue==='liste'"  (click)="vue='liste'"  title="Liste">☰</button>
      <button class="vb" [class.on]="vue==='cartes'" (click)="vue='cartes'" title="Grille">⊞</button>
    </div>
  </div>

  <!-- Loader -->
  <div class="loading-row" *ngIf="loading()">
    <div class="spinner"></div><span>Chargement…</span>
  </div>

  <!-- ══ VUE LISTE ══ -->
  <div class="table-wrap" *ngIf="vue==='liste' && !loading() && liste().items.length">
    <table class="data-table">
      <thead><tr>
        <th style="width:36px">
          <input type="checkbox" class="cb" (change)="toggleAll($event)">
        </th>
        <th>Code</th>
        <th>Propriété</th>
        <th>Type</th>
        <th class="tc">Surface</th>
        <th class="tr">Loyer réf.</th>
        <th class="tc">Statut</th>
        <th class="tr">Actions</th>
      </tr></thead>
      <tbody>
        <tr *ngFor="let p of liste().items" [class.selected]="selection.has(p.id)">
          <td><input type="checkbox" class="cb" [checked]="selection.has(p.id)" (change)="toggleRow(p.id)"></td>
          <td><span class="code-badge">{{ p.code }}</span></td>
          <td class="td-prop">{{ p.proprieteLibelle }}</td>
          <td>
            <span class="type-chip" [attr.data-t]="p.typeLabel">
              {{ typeIcon(p.typeLabel) }} {{ p.typeLabel }}
            </span>
          </td>
          <td class="tc td-muted">{{ p.surface ? p.surface + ' m²' : '—' }}</td>
          <td class="tr">
            <span class="loyer-val">{{ p.loyerReference | number:'1.0-0' }}</span>
            <span class="loyer-cur"> MRU</span>
          </td>
          <td class="tc">
            <span class="statut-pill" [attr.data-s]="p.statutLabel">
              <span class="dot" [attr.data-s]="p.statutLabel"></span>
              {{ statutLabel(p.statutLabel) }}
            </span>
          </td>
          <td class="tr">
            <div class="row-actions">
              <a [routerLink]="['/produits', p.id]" class="act-btn ab-detail">👁 Détail</a>
              <a *ngIf="p.statutLabel==='Libre'"
                 [routerLink]="['/contrats-location/nouveau']"
                 [queryParams]="{produitId: p.id}"
                 class="act-btn ab-bail">📋 Bail</a>
            </div>
          </td>
        </tr>
      </tbody>
    </table>
    <div class="pagination">
      <span class="pag-info">{{ liste().totalCount }} résultat(s)</span>
      <div class="pag-btns">
        <button class="pag-btn" [disabled]="page===1" (click)="goPage(page-1)">‹</button>
        <button class="pag-btn" *ngFor="let n of pageNumbers()"
                [class.cur]="n===page" (click)="goPage(n)">{{ n }}</button>
        <button class="pag-btn" [disabled]="!liste().hasNext" (click)="goPage(page+1)">›</button>
      </div>
    </div>
  </div>

  <!-- ══ VUE GRILLE ══ -->
  <div class="grid-wrap" *ngIf="vue==='cartes' && !loading() && liste().items.length">
    <div class="g-card" *ngFor="let p of liste().items">
      <div class="g-top" [style.background]="typeGradient(p.typeLabel)">
        <span class="g-code">{{ p.code }}</span>
        <span class="statut-pill sm" [attr.data-s]="p.statutLabel">
          <span class="dot" [attr.data-s]="p.statutLabel"></span>
          {{ statutLabel(p.statutLabel) }}
        </span>
        <span class="g-bg-icon">{{ typeIcon(p.typeLabel) }}</span>
      </div>
      <div class="g-body">
        <div class="g-prop">{{ p.proprieteLibelle }}</div>
        <div class="g-loyer">
          {{ p.loyerReference | number:'1.0-0' }}
          <span class="g-cur">MRU/mois</span>
        </div>
        <div class="g-surf">{{ p.surface ? p.surface + ' m²' : 'Surface non renseignée' }}</div>
      </div>
      <div class="g-foot">
        <span class="type-chip sm" [attr.data-t]="p.typeLabel">{{ typeIcon(p.typeLabel) }} {{ p.typeLabel }}</span>
        <div style="display:flex;gap:5px">
          <a [routerLink]="['/produits', p.id]" class="act-btn ab-detail sm">Détail</a>
          <a *ngIf="p.statutLabel==='Libre'"
             [routerLink]="['/contrats-location/nouveau']"
             [queryParams]="{produitId: p.id}"
             class="act-btn ab-bail sm">Bail</a>
        </div>
      </div>
    </div>
  </div>

  <!-- ══ EMPTY / LOADING ══ -->
  <div class="empty-state" *ngIf="!loading() && !liste().items.length">
    <div style="font-size:48px">🏠</div>
    <div class="empty-title">Aucun produit trouvé</div>
    <div class="empty-sub">{{ search || filtreType || filtreStatut ? 'Modifiez vos filtres' : 'Créez votre premier produit locatif' }}</div>
    <button class="btn-new" style="margin-top:16px" (click)="ouvrirModal()">＋ Nouveau produit</button>
  </div>

</div>

<!-- ══════════════════════════════════════════════════
     MODAL NOUVEAU PRODUIT (inline — conservé)
══════════════════════════════════════════════════ -->
<div class="modal-overlay" [class.open]="showModal()" (click)="onOverlay($event)">
  <div class="nv-modal" (click)="$event.stopPropagation()">
    <div class="nv-header">
      <div class="nv-hl">
        <div class="nv-icon">🏠</div>
        <div>
          <div class="nv-title">Nouveau produit locatif</div>
          <div class="nv-sub">Ajouter une unité louable à une propriété</div>
        </div>
      </div>
      <button class="close-btn" (click)="fermerModal()">✕</button>
    </div>
    <div class="stepper">
      <ng-container *ngFor="let lbl of ['Propriété','Caractéristiques','Confirmation']; let i=index">
        <div class="stepper-step">
          <div class="step-dot" [class.step-active]="etape()===i+1" [class.step-done]="etape()>i+1">
            {{ etape() > i+1 ? '✓' : i+1 }}
          </div>
          <div class="step-lbl">{{ lbl }}</div>
        </div>
        <div class="step-line" *ngIf="i<2" [class.done]="etape()>i+1"></div>
      </ng-container>
    </div>
    <div class="nv-body">

      <!-- Étape 1 -->
      <ng-container *ngIf="etape()===1">
        <div class="step-title">🏢 Sélectionner la propriété</div>
        <div class="fg" *ngIf="!propSel">
          <label>Rechercher une propriété <span class="req">*</span></label>
          <div class="search-field">
            <span>🔍</span>
            <input type="text" class="fc-plain" placeholder="Nom de la propriété…"
                   [value]="searchProp" (input)="onSearchProp($event)"/>
          </div>
          <div class="ac-list" *ngIf="propResultats.length">
            <div *ngFor="let p of propResultats" class="ac-item" (click)="selectProp(p)">
              <div class="ac-ico">🏢</div>
              <div><div class="ac-nom">{{ p.libelle }}</div><div class="ac-meta">{{ p.proprietaireNom }}</div></div>
            </div>
          </div>
          <div class="ac-empty" *ngIf="searchProp.length>=2 && !propResultats.length && !propLoading">
            Aucune propriété trouvée pour "{{ searchProp }}"
          </div>
        </div>
        <div class="prop-selected" *ngIf="propSel">
          <div class="ps-ico">🏢</div>
          <div class="ps-info">
            <div class="ps-nom">{{ propSel.libelle }}</div>
            <div class="ps-meta">{{ propSel.proprietaireNom }}</div>
          </div>
          <button class="ps-change" (click)="clearProp()">Changer</button>
        </div>
      </ng-container>

      <!-- Étape 2 -->
      <ng-container *ngIf="etape()===2" [formGroup]="form">
        <div class="step-title">📋 Caractéristiques du produit</div>
        <div class="type-selector">
          <button *ngFor="let t of types" type="button" class="ts-btn"
                  [class.active]="form.get('type')?.value===t.value"
                  (click)="form.get('type')!.setValue(t.value)">
            <span class="ts-icon">{{ t.icon }}</span>
            <span class="ts-lbl">{{ t.label }}</span>
          </button>
        </div>
        <div class="two-col">
          <div class="fg full">
            <label>Description <span class="req">*</span></label>
            <input type="text" class="fc" placeholder="Chambre simple, Appartement F3 meublé…" formControlName="description"/>
            <span class="err-msg" *ngIf="fi('description')">Obligatoire</span>
          </div>
          <div class="fg">
            <label>Loyer de référence <span class="req">*</span></label>
            <div class="input-sfx">
              <input type="number" class="fc" placeholder="15 000" formControlName="loyerReference"/>
              <span class="sfx">MRU</span>
            </div>
            <span class="err-msg" *ngIf="fi('loyerReference')">Montant requis (> 0)</span>
          </div>
          <div class="fg">
            <label>Surface</label>
            <div class="input-sfx">
              <input type="number" class="fc" placeholder="25" formControlName="surface"/>
              <span class="sfx">m²</span>
            </div>
          </div>
          <div class="fg">
            <label>Étage</label>
            <input type="number" class="fc" placeholder="0 = Rez-de-chaussée" formControlName="etage"/>
          </div>
          <div class="fg full">
            <label>Notes internes</label>
            <textarea class="fc ta" rows="2" placeholder="Rénovation 2024, climatisation incluse…" formControlName="notes"></textarea>
          </div>
        </div>
        <div class="compteurs">
          <div class="cpt-lbl">Équipements</div>
          <div class="cpt-row">
            <label class="cpt-check" [class.checked]="form.get('hasCompteurElec')?.value">
              <input type="checkbox" formControlName="hasCompteurElec" style="display:none"/>⚡ Compteur électricité
            </label>
            <label class="cpt-check" [class.checked]="form.get('hasCompteurEau')?.value">
              <input type="checkbox" formControlName="hasCompteurEau" style="display:none"/>💧 Compteur eau
            </label>
          </div>
        </div>
        <div class="lot-section">
          <div class="lot-header">
            <span class="lot-title">📦 Création en lot</span>
            <span class="lot-sub">Créer plusieurs unités identiques en une fois</span>
          </div>
          <div class="lot-ctrl">
            <button type="button" class="lot-btn" (click)="decLot()">−</button>
            <span class="lot-val">{{ quantiteLot }}</span>
            <button type="button" class="lot-btn" (click)="incLot()">+</button>
            <span class="lot-info">{{ quantiteLot > 1 ? quantiteLot + ' unités seront créées' : 'Unité individuelle' }}</span>
          </div>
        </div>
      </ng-container>

      <!-- Étape 3 -->
      <ng-container *ngIf="etape()===3">
        <div class="step-title">✅ Récapitulatif</div>
        <div class="recap-visual">
          <div class="rv-type">{{ typeIcon(form.get('type')?.value ?? '') }}</div>
          <div class="rv-info">
            <div class="rv-desc">{{ form.get('description')?.value }}</div>
            <div class="rv-prop">{{ propSel?.libelle }}</div>
          </div>
          <div class="rv-loyer">{{ form.get('loyerReference')?.value | number:'1.0-0' }}<span>MRU/mois</span></div>
        </div>
        <div class="recap-grid">
          <div class="rg-row"><span>Propriété</span><strong>{{ propSel?.libelle }}</strong></div>
          <div class="rg-row"><span>Propriétaire</span><strong>{{ propSel?.proprietaireNom }}</strong></div>
          <div class="rg-row"><span>Type</span><strong>{{ typeIcon(form.get('type')?.value ?? '') }} {{ form.get('type')?.value }}</strong></div>
          <div class="rg-row"><span>Description</span><strong>{{ form.get('description')?.value }}</strong></div>
          <div class="rg-row"><span>Loyer réf.</span><strong>{{ form.get('loyerReference')?.value | number:'1.0-0' }} MRU</strong></div>
          <div class="rg-row" *ngIf="form.get('surface')?.value"><span>Surface</span><strong>{{ form.get('surface')?.value }} m²</strong></div>
          <div class="rg-row" *ngIf="quantiteLot>1"><span>Quantité</span><strong class="qty">{{ quantiteLot }} unités</strong></div>
        </div>
        <div class="success-banner" *ngIf="successMsg()">✅ {{ successMsg() }}</div>
        <div class="error-banner"   *ngIf="errorMsg()">⚠️ {{ errorMsg() }}</div>
      </ng-container>
    </div>
    <div class="nv-footer">
      <button class="btn-ghost" (click)="fermerModal()">Annuler</button>
      <div class="foot-right">
        <button class="btn-sec"     *ngIf="etape()>1"  (click)="etapePrev()">← Précédent</button>
        <button class="btn-primary" *ngIf="etape()<3"  [disabled]="!peutContinuer()" (click)="etapeNext()">Suivant →</button>
        <button class="btn-submit"  *ngIf="etape()===3" [disabled]="!form.valid||!propSel||submitting()" (click)="soumettre()">
          <span *ngIf="!submitting()">{{ quantiteLot > 1 ? '📦 Créer ' + quantiteLot + ' produits' : '🏠 Créer le produit' }}</span>
          <span *ngIf="submitting()" class="spin"></span>
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
    .eyebrow { font-size:10px; font-weight:700; letter-spacing:1.5px; text-transform:uppercase; color:#c9a96e; margin-bottom:4px; }
    .page-title { font-size:26px; font-weight:800; color:#0e1c38; }
    .page-sub { font-size:13px; color:#64748b; margin-top:3px; }
    .btn-new { display:inline-flex; align-items:center; gap:8px; background:#0e1c38; color:#fff; padding:10px 22px; border-radius:10px; border:none; font-size:14px; font-weight:600; cursor:pointer; font-family:inherit; transition:all .15s; }
    .btn-new:hover { background:#162d52; box-shadow:0 4px 20px rgba(14,28,56,.25); }

    /* ── Type cards ── */
    .type-row { display:flex; gap:14px; margin-bottom:20px; overflow-x:auto; padding-bottom:4px; }
    .type-card { background:#fff; border-radius:14px; padding:14px 18px; border:2px solid transparent; cursor:pointer; transition:all .18s; display:flex; align-items:center; gap:12px; min-width:160px; box-shadow:0 2px 8px rgba(14,28,56,.06); flex-shrink:0; }
    .type-card:hover { transform:translateY(-2px); box-shadow:0 6px 20px rgba(14,28,56,.1); }
    .type-card.active { border-color:#0e1c38; box-shadow:0 4px 18px rgba(14,28,56,.15); }
    .tc-icon { width:46px; height:46px; border-radius:12px; display:flex; align-items:center; justify-content:center; font-size:22px; flex-shrink:0; }
    .tc-count { font-size:22px; font-weight:800; color:#0e1c38; line-height:1; }
    .tc-label { font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:.5px; color:#64748b; margin-top:2px; }
    .tc-badges { display:flex; gap:4px; margin-top:5px; }
    .tb { padding:2px 7px; border-radius:10px; font-size:10px; font-weight:700; }
    .tb-l { background:#d1fae5; color:#16a34a; }
    .tb-b { background:#fef3c7; color:#d97706; }

    /* ── Bulk bar ── */
    .bulk-bar { display:flex; align-items:center; gap:12px; background:#0e1c38; color:#fff; padding:10px 16px; border-radius:10px; margin-bottom:12px; font-size:13px; flex-wrap:wrap; }
    .bulk-count { font-weight:700; }
    .bulk-actions { display:flex; gap:8px; margin-left:auto; }
    .bulk-btn { padding:6px 14px; border-radius:7px; font-size:12px; font-weight:600; border:none; cursor:pointer; font-family:inherit; }
    .bb-bail { background:#c9a96e; color:#0e1c38; }
    .bb-export { background:rgba(255,255,255,.15); color:#fff; }
    .bb-clear { background:rgba(255,255,255,.1); color:#fff; }

    /* ── Toolbar ── */
    .toolbar { display:flex; gap:10px; align-items:center; background:#fff; border-radius:12px; padding:10px 14px; border:1px solid #e2e8f0; margin-bottom:16px; box-shadow:0 2px 8px rgba(14,28,56,.05); flex-wrap:wrap; }
    .search-w { position:relative; flex:1; min-width:200px; }
    .search-w input { width:100%; padding:8px 32px 8px 34px; border:1.5px solid #e2e8f0; border-radius:9px; font-size:13px; background:#f4f7fb; outline:none; font-family:inherit; transition:border-color .15s; }
    .search-w input:focus { border-color:#0e1c38; background:#fff; }
    .si { position:absolute; left:11px; top:50%; transform:translateY(-50%); color:#94a3b8; pointer-events:none; }
    .clear-x { position:absolute; right:11px; top:50%; transform:translateY(-50%); color:#94a3b8; cursor:pointer; font-size:12px; }
    .chips { display:flex; gap:6px; flex-wrap:wrap; }
    .chip { padding:6px 14px; border-radius:20px; font-size:12px; font-weight:600; border:1.5px solid #e2e8f0; background:#fff; cursor:pointer; transition:all .15s; color:#64748b; font-family:inherit; }
    .chip:hover { border-color:#0e1c38; color:#0e1c38; }
    .chip.on { background:#0e1c38; color:#fff; border-color:#0e1c38; }
    .chip.c-libre.on { background:#16a34a; border-color:#16a34a; }
    .chip.c-loue.on  { background:#2563eb; border-color:#2563eb; }
    .chip.c-trav.on  { background:#7c3aed; border-color:#7c3aed; }
    .chip.c-res.on   { background:#0891b2; border-color:#0891b2; }
    .view-tog { display:flex; gap:3px; background:#e8edf5; border-radius:8px; padding:3px; flex-shrink:0; }
    .vb { width:32px; height:32px; border:none; border-radius:6px; background:none; cursor:pointer; color:#64748b; font-size:16px; display:flex; align-items:center; justify-content:center; transition:all .15s; }
    .vb.on { background:#fff; color:#0e1c38; box-shadow:0 1px 4px rgba(14,28,56,.1); }

    /* ── Loading / empty ── */
    .loading-row { display:flex; align-items:center; gap:12px; padding:50px; justify-content:center; color:#64748b; }
    .spinner { width:24px; height:24px; border:2.5px solid #e2e8f0; border-top-color:#0e1c38; border-radius:50%; animation:spin .8s linear infinite; }
    @keyframes spin { to { transform:rotate(360deg); } }
    .empty-state { text-align:center; padding:60px 20px; background:#fff; border-radius:14px; border:1px solid #e2e8f0; }
    .empty-title { font-size:16px; font-weight:700; color:#0e1c38; margin:8px 0 4px; }
    .empty-sub { font-size:13px; color:#64748b; }

    /* ── Table ── */
    .table-wrap { background:#fff; border-radius:14px; border:1px solid #e2e8f0; overflow:hidden; box-shadow:0 2px 12px rgba(14,28,56,.07); }
    .data-table { width:100%; border-collapse:collapse; }
    .data-table th { padding:11px 14px; background:#f8fafc; font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:.5px; color:#64748b; border-bottom:2px solid #e2e8f0; text-align:left; white-space:nowrap; }
    .data-table th.tc { text-align:center; } .data-table th.tr { text-align:right; }
    .data-table td { padding:0 14px; height:54px; border-bottom:1px solid #f1f5f9; vertical-align:middle; font-size:13px; color:#334155; }
    .data-table tr:last-child td { border-bottom:none; }
    .data-table tr:hover td { background:#fafbff; }
    .data-table tr.selected td { background:#eff6ff; }
    .cb { width:15px; height:15px; accent-color:#0e1c38; cursor:pointer; }
    .code-badge { font-family:'JetBrains Mono',monospace; font-size:12px; font-weight:600; background:#f1f5f9; padding:3px 8px; border-radius:6px; color:#0e1c38; white-space:nowrap; }
    .td-prop { font-size:13px; color:#64748b; }
    .td-muted { color:#94a3b8; font-size:12px; text-align:center; }
    .loyer-val { font-family:'JetBrains Mono',monospace; font-size:13px; font-weight:600; color:#0e1c38; }
    .loyer-cur { font-size:10px; color:#94a3b8; }
    .type-chip { display:inline-flex; align-items:center; gap:5px; padding:4px 10px; border-radius:20px; font-size:11px; font-weight:600; white-space:nowrap; }
    .type-chip.sm { font-size:10px; padding:3px 8px; }
    .type-chip[data-t="Appartement"] { background:#dbeafe; color:#1d4ed8; }
    .type-chip[data-t="Chambre"]     { background:#fef3c7; color:#92400e; }
    .type-chip[data-t="Boutique"]    { background:#d1fae5; color:#065f46; }
    .type-chip[data-t="Garage"]      { background:#ede9fe; color:#5b21b6; }
    .statut-pill { display:inline-flex; align-items:center; gap:5px; padding:4px 10px; border-radius:20px; font-size:11px; font-weight:700; white-space:nowrap; }
    .statut-pill.sm { font-size:10px; padding:3px 8px; }
    .statut-pill[data-s="Libre"]      { background:#fef3c7; color:#92400e; }
    .statut-pill[data-s="Loue"]       { background:#d1fae5; color:#065f46; }
    .statut-pill[data-s="EnTravaux"]  { background:#ede9fe; color:#5b21b6; }
    .statut-pill[data-s="Reserve"]    { background:#dbeafe; color:#1d4ed8; }
    .statut-pill[data-s="HorsService"]{ background:#fee2e2; color:#991b1b; }
    .dot { width:6px; height:6px; border-radius:50%; flex-shrink:0; display:inline-block; }
    .dot[data-s="Libre"]      { background:#d97706; }
    .dot[data-s="Loue"]       { background:#16a34a; }
    .dot[data-s="EnTravaux"]  { background:#7c3aed; }
    .dot[data-s="Reserve"]    { background:#2563eb; }
    .dot[data-s="HorsService"]{ background:#dc2626; }
    .row-actions { display:flex; gap:5px; justify-content:flex-end; }
    .act-btn { padding:5px 10px; border-radius:7px; font-size:11px; font-weight:600; border:none; cursor:pointer; display:inline-flex; align-items:center; gap:4px; transition:all .15s; white-space:nowrap; text-decoration:none; font-family:inherit; }
    .act-btn.sm { padding:4px 9px; font-size:10px; }
    .ab-detail { background:#f1f5f9; color:#334155; } .ab-detail:hover { background:#e2e8f0; }
    .ab-bail   { background:#0e1c38; color:#fff; }    .ab-bail:hover   { background:#162d52; }

    /* Pagination */
    .pagination { display:flex; align-items:center; justify-content:space-between; padding:12px 16px; border-top:1px solid #e2e8f0; background:#f8fafc; }
    .pag-info { font-size:12px; color:#64748b; }
    .pag-btns { display:flex; gap:4px; }
    .pag-btn { width:30px; height:30px; border-radius:7px; border:1.5px solid #e2e8f0; background:#fff; cursor:pointer; font-size:12px; display:flex; align-items:center; justify-content:center; font-family:inherit; transition:all .15s; }
    .pag-btn:hover { border-color:#0e1c38; color:#0e1c38; }
    .pag-btn.cur { background:#0e1c38; color:#fff; border-color:#0e1c38; }
    .pag-btn:disabled { opacity:.35; cursor:not-allowed; }

    /* ── Grid ── */
    .grid-wrap { display:grid; grid-template-columns:repeat(4,1fr); gap:14px; }
    .g-card { background:#fff; border-radius:14px; border:1px solid #e2e8f0; overflow:hidden; box-shadow:0 2px 10px rgba(14,28,56,.06); cursor:pointer; transition:all .18s; }
    .g-card:hover { transform:translateY(-2px); box-shadow:0 6px 24px rgba(14,28,56,.11); }
    .g-top { height:70px; display:flex; align-items:center; justify-content:space-between; padding:0 14px; position:relative; overflow:hidden; }
    .g-code { font-family:'JetBrains Mono',monospace; font-size:13px; font-weight:600; color:#fff; background:rgba(0,0,0,.25); padding:3px 8px; border-radius:6px; position:relative; z-index:1; }
    .g-bg-icon { font-size:56px; opacity:.12; position:absolute; right:-4px; top:50%; transform:translateY(-50%); pointer-events:none; }
    .g-body { padding:12px 14px; }
    .g-prop { font-size:11px; color:#94a3b8; margin-bottom:4px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
    .g-loyer { display:flex; align-items:baseline; gap:4px; }
    .g-loyer-val { font-family:'JetBrains Mono',monospace; font-size:16px; font-weight:700; color:#0e1c38; }
    .g-cur { font-size:10px; color:#94a3b8; }
    .g-surf { font-size:11px; color:#94a3b8; margin-top:3px; }
    .g-foot { padding:8px 14px; border-top:1px solid #f1f5f9; display:flex; align-items:center; justify-content:space-between; background:#f8fafc; }

    @media(max-width:1300px) { .grid-wrap { grid-template-columns:repeat(3,1fr); } }
    @media(max-width:900px)  { .grid-wrap { grid-template-columns:repeat(2,1fr); } }
    @media(max-width:600px)  { .grid-wrap { grid-template-columns:1fr; } }

    /* ══ MODAL (identique à l'original) ══ */
    .modal-overlay { position:fixed; inset:0; background:rgba(13,13,13,.55); backdrop-filter:blur(4px); z-index:1000; display:flex; align-items:center; justify-content:center; padding:20px; opacity:0; pointer-events:none; transition:opacity .22s; }
    .modal-overlay.open { opacity:1; pointer-events:all; }
    .nv-modal { background:#fff; border-radius:18px; width:100%; max-width:580px; max-height:90vh; box-shadow:0 24px 80px rgba(13,13,13,.22),0 0 0 1px rgba(201,168,76,.12); display:flex; flex-direction:column; overflow:hidden; transform:translateY(16px) scale(.97); transition:transform .25s; }
    .modal-overlay.open .nv-modal { transform:translateY(0) scale(1); }
    .nv-header { padding:20px 24px 16px; background:linear-gradient(135deg,#1A1A2E,#2D2D4A); display:flex; align-items:center; justify-content:space-between; flex-shrink:0; }
    .nv-hl { display:flex; align-items:center; gap:12px; }
    .nv-icon { width:42px; height:42px; border-radius:11px; background:rgba(201,168,76,.18); border:1.5px solid rgba(201,168,76,.35); display:flex; align-items:center; justify-content:center; font-size:20px; flex-shrink:0; }
    .nv-title { font-size:17px; font-weight:700; color:#E8C96A; }
    .nv-sub { font-size:11.5px; color:rgba(255,255,255,.4); margin-top:2px; }
    .close-btn { width:30px; height:30px; border-radius:7px; border:none; background:rgba(255,255,255,.1); color:rgba(255,255,255,.6); font-size:13px; cursor:pointer; display:flex; align-items:center; justify-content:center; transition:all .15s; }
    .close-btn:hover { background:rgba(192,57,43,.35); color:#fff; }
    .stepper { display:flex; align-items:center; padding:14px 24px 10px; background:#F8F4ED; border-bottom:1px solid #EDE8DF; flex-shrink:0; }
    .stepper-step { display:flex; flex-direction:column; align-items:center; gap:4px; flex:1; }
    .step-dot { width:26px; height:26px; border-radius:50%; background:#fff; border:2px solid #EDE8DF; display:flex; align-items:center; justify-content:center; font-size:11.5px; font-weight:700; color:#8A8899; transition:all .2s; }
    .step-active { background:#C9A84C; border-color:#C9A84C; color:#fff; box-shadow:0 0 0 4px rgba(201,168,76,.2); }
    .step-done { background:#1A7A4A; border-color:#1A7A4A; color:#fff; }
    .step-lbl { font-size:10.5px; font-weight:600; color:#8A8899; text-align:center; }
    .step-line { flex:1; height:2px; background:#EDE8DF; margin:0 4px 14px; border-radius:2px; transition:background .3s; }
    .step-line.done { background:#1A7A4A; }
    .nv-body { flex:1; overflow-y:auto; padding:20px 24px; }
    .nv-body::-webkit-scrollbar { width:4px; }
    .nv-body::-webkit-scrollbar-thumb { background:#EDE8DF; border-radius:4px; }
    .step-title { font-size:13px; font-weight:700; color:#2D2D4A; margin-bottom:16px; padding-bottom:10px; border-bottom:1px solid #EDE8DF; }
    .fg { display:flex; flex-direction:column; gap:5px; margin-bottom:10px; }
    .fg.full { grid-column:1/-1; }
    label { font-size:12px; font-weight:700; color:#2D2D4A; }
    .req { color:#C0392B; margin-left:2px; }
    .search-field { display:flex; align-items:center; gap:8px; background:#fff; border:1.5px solid #EDE8DF; border-radius:9px; padding:10px 13px; transition:border-color .18s; }
    .search-field:focus-within { border-color:#C9A84C; }
    .fc-plain { flex:1; border:none; outline:none; font-size:13px; font-family:inherit; background:transparent; }
    .ac-list { border:1px solid #EDE8DF; border-radius:9px; overflow:hidden; margin-top:4px; max-height:200px; overflow-y:auto; background:#fff; box-shadow:0 4px 14px rgba(0,0,0,.1); }
    .ac-item { display:flex; align-items:center; gap:10px; padding:11px 14px; cursor:pointer; border-bottom:1px solid #EDE8DF; transition:background .12s; }
    .ac-item:last-child { border:none; }
    .ac-item:hover { background:rgba(201,168,76,.06); }
    .ac-ico { font-size:18px; flex-shrink:0; }
    .ac-nom { font-size:13.5px; font-weight:600; color:#1A1A2E; }
    .ac-meta { font-size:11.5px; color:#8A8899; margin-top:1px; }
    .ac-empty { font-size:12.5px; color:#8A8899; padding:10px 0; text-align:center; }
    .prop-selected { display:flex; align-items:center; gap:12px; background:#E6F5EE; border:1.5px solid #1A7A4A; border-radius:10px; padding:13px 16px; }
    .ps-ico { font-size:22px; flex-shrink:0; }
    .ps-info { flex:1; }
    .ps-nom { font-size:14px; font-weight:700; color:#1A7A4A; }
    .ps-meta { font-size:12px; color:#1A7A4A; opacity:.7; margin-top:2px; }
    .ps-change { background:rgba(26,122,74,.15); border:1px solid rgba(26,122,74,.3); border-radius:7px; padding:5px 12px; font-size:12px; font-weight:600; color:#1A7A4A; cursor:pointer; white-space:nowrap; font-family:inherit; }
    .type-selector { display:grid; grid-template-columns:repeat(4,1fr); gap:8px; margin-bottom:16px; }
    .ts-btn { display:flex; flex-direction:column; align-items:center; gap:5px; padding:12px 8px; border-radius:10px; border:2px solid #EDE8DF; background:#fff; cursor:pointer; transition:all .18s; font-family:inherit; }
    .ts-btn:hover { border-color:#C9A84C; }
    .ts-btn.active { border-color:#C9A84C; background:rgba(201,168,76,.08); }
    .ts-icon { font-size:22px; }
    .ts-lbl { font-size:11.5px; font-weight:700; color:#8A8899; }
    .ts-btn.active .ts-lbl { color:#8B6914; }
    .two-col { display:grid; grid-template-columns:1fr 1fr; gap:14px; }
    .fc { padding:10px 12px; border:1.5px solid #EDE8DF; border-radius:9px; font-size:13px; color:#0D0D0D; font-family:inherit; outline:none; transition:border-color .18s; background:#fff; width:100%; }
    .fc:focus { border-color:#C9A84C; box-shadow:0 0 0 3px rgba(201,168,76,.1); }
    .fc::placeholder { color:#c0bcc8; }
    .ta { resize:none; }
    .input-sfx { display:flex; align-items:center; border:1.5px solid #EDE8DF; border-radius:9px; overflow:hidden; transition:border-color .18s; }
    .input-sfx:focus-within { border-color:#C9A84C; box-shadow:0 0 0 3px rgba(201,168,76,.1); }
    .input-sfx .fc { border:none; box-shadow:none; border-radius:0; flex:1; }
    .input-sfx .fc:focus { box-shadow:none; }
    .sfx { padding:0 12px; background:#F8F4ED; color:#8A8899; font-size:12px; font-weight:700; border-left:1px solid #EDE8DF; white-space:nowrap; display:flex; align-items:center; }
    .err-msg { font-size:11.5px; color:#C0392B; }
    .compteurs { background:#F8F4ED; border-radius:10px; padding:12px 14px; margin-top:4px; margin-bottom:12px; }
    .cpt-lbl { display:block; font-size:11px; font-weight:700; color:#8A8899; text-transform:uppercase; letter-spacing:.5px; margin-bottom:8px; }
    .cpt-row { display:flex; gap:10px; flex-wrap:wrap; }
    .cpt-check { display:flex; align-items:center; gap:8px; padding:8px 14px; background:#fff; border-radius:8px; border:1.5px solid #EDE8DF; cursor:pointer; font-size:13px; font-weight:600; color:#8A8899; transition:all .15s; }
    .cpt-check.checked { border-color:#C9A84C; color:#8B6914; background:rgba(201,168,76,.05); }
    .lot-section { background:#dbeafe; border-radius:10px; padding:12px 16px; border:1px solid rgba(29,78,216,.15); }
    .lot-header { margin-bottom:10px; }
    .lot-title { font-size:13px; font-weight:700; color:#1d4ed8; }
    .lot-sub { font-size:11.5px; color:rgba(29,78,216,.6); margin-left:6px; }
    .lot-ctrl { display:flex; align-items:center; gap:10px; }
    .lot-btn { width:28px; height:28px; border-radius:7px; border:1px solid rgba(29,78,216,.3); background:#fff; color:#1d4ed8; font-size:16px; font-weight:700; cursor:pointer; display:flex; align-items:center; justify-content:center; transition:all .15s; font-family:inherit; }
    .lot-btn:hover { background:#1d4ed8; color:#fff; }
    .lot-val { font-size:18px; font-weight:800; color:#1d4ed8; min-width:28px; text-align:center; }
    .lot-info { font-size:12px; color:#1d4ed8; font-weight:600; }
    .recap-visual { display:flex; align-items:center; gap:14px; background:#F8F4ED; border-radius:12px; padding:16px 18px; margin-bottom:14px; border:1px solid #EDE8DF; }
    .rv-type { width:48px; height:48px; border-radius:12px; background:#1A1A2E; display:flex; align-items:center; justify-content:center; font-size:22px; flex-shrink:0; }
    .rv-info { flex:1; }
    .rv-desc { font-size:15px; font-weight:700; color:#1A1A2E; }
    .rv-prop { font-size:12px; color:#8A8899; margin-top:2px; }
    .rv-loyer { text-align:right; font-size:20px; font-weight:800; color:#8B6914; flex-shrink:0; }
    .rv-loyer span { font-size:11px; font-weight:400; color:#8A8899; display:block; }
    .recap-grid { background:#F8F4ED; border-radius:10px; padding:14px 16px; border:1px solid #EDE8DF; }
    .rg-row { display:flex; justify-content:space-between; align-items:center; padding:7px 0; border-bottom:1px solid #EDE8DF; font-size:13px; }
    .rg-row:last-child { border:none; }
    .rg-row span { color:#8A8899; font-size:12px; }
    .rg-row strong { color:#1A1A2E; font-weight:600; }
    .rg-row strong.qty { color:#1d4ed8; font-weight:800; }
    .success-banner { display:flex; align-items:center; gap:8px; background:#E6F5EE; border:1px solid #1A7A4A; border-radius:9px; padding:11px 14px; font-size:13px; color:#1A7A4A; font-weight:600; margin-top:12px; }
    .error-banner   { display:flex; align-items:center; gap:8px; background:#FDECEA; border:1px solid #C0392B; border-radius:9px; padding:11px 14px; font-size:13px; color:#C0392B; font-weight:600; margin-top:12px; }
    .nv-footer { padding:14px 24px; border-top:1px solid #EDE8DF; background:#F8F4ED; display:flex; align-items:center; justify-content:space-between; flex-shrink:0; }
    .foot-right { display:flex; gap:9px; }
    .btn-ghost { background:none; border:none; cursor:pointer; font-size:13px; color:#8A8899; padding:8px 2px; font-family:inherit; }
    .btn-ghost:hover { color:#C0392B; }
    .btn-sec { padding:8px 16px; border-radius:8px; background:#fff; color:#2D2D4A; border:1.5px solid #EDE8DF; font-size:13px; font-weight:600; cursor:pointer; font-family:inherit; }
    .btn-primary { padding:8px 20px; border-radius:8px; background:#1A1A2E; color:#E8C96A; border:none; font-size:13px; font-weight:600; cursor:pointer; font-family:inherit; }
    .btn-primary:disabled { opacity:.4; cursor:not-allowed; }
    .btn-submit { padding:8px 22px; border-radius:8px; background:linear-gradient(135deg,#8B6914,#C9A84C); color:#fff; border:none; font-size:13px; font-weight:700; cursor:pointer; font-family:inherit; min-width:180px; display:flex; align-items:center; justify-content:center; gap:6px; transition:all .18s; }
    .btn-submit:disabled { opacity:.4; cursor:not-allowed; }
    .spin { width:16px; height:16px; border:2.5px solid rgba(255,255,255,.35); border-top-color:#fff; border-radius:50%; animation:spin .7s linear infinite; display:inline-block; }
    @media(max-width:768px) { .type-selector { grid-template-columns:1fr 1fr; } .two-col { grid-template-columns:1fr; } }
  `]
})
export class ProduitsListComponent implements OnInit {
  private svc     = inject(ProduitsService);
  private propSvc = inject(ProprietesService);
  private route   = inject(ActivatedRoute);
  private fb      = inject(FormBuilder);

  liste   = signal<PagedList<ProduitListItemDto>>({ items:[], totalCount:0, page:1, pageSize:50, totalPages:0, hasNext:false, hasPrevious:false });
  loading = signal(false);
  page    = 1;
  search  = '';
  filtreType   = '';
  filtreStatut = '';
  vue: 'liste'|'cartes' = 'liste';
  selection = new Set<string>();
  private timer: any;
  private proprieteIdCtx?: string;

  types = [
    { value:'Chambre',     label:'Chambre',     icon:'🛏' },
    { value:'Appartement', label:'Appartement', icon:'🏠' },
    { value:'Boutique',    label:'Boutique',    icon:'🏪' },
    { value:'Garage',      label:'Garage',      icon:'🚗' },
  ];

  typesStats() {
    return this.types.map(t => ({
      ...t,
      total:  this.liste().items.filter(i => i.typeLabel === t.value).length,
      libres: this.liste().items.filter(i => i.typeLabel === t.value && i.statutLabel === 'Libre').length,
      loues:  this.liste().items.filter(i => i.typeLabel === t.value && i.statutLabel === 'Loue').length,
    })).filter(t => t.total > 0);
  }

  totalLoues()  { return this.liste().items.filter(i => i.statutLabel === 'Loue').length; }
  totalLibres() { return this.liste().items.filter(i => i.statutLabel === 'Libre').length; }

  pageNumbers(): number[] {
    const total = this.liste().totalPages;
    const cur   = this.page;
    const pages: number[] = [];
    for (let i = Math.max(1, cur-2); i <= Math.min(total, cur+2); i++) pages.push(i);
    return pages;
  }

  // ── Modal ──
  showModal  = signal(false);
  etape      = signal(1);
  submitting = signal(false);
  successMsg = signal('');
  errorMsg   = signal('');
  propSel: any = null; propResultats: any[] = []; searchProp = ''; propLoading = false;
  quantiteLot = 1;
  private propTimer: any;

  form = this.fb.group({
    type:            ['Chambre', Validators.required],
    description:     ['', Validators.required],
    loyerReference:  [null as number|null, [Validators.required, Validators.min(1)]],
    surface:         [null as number|null],
    etage:           [0],
    hasCompteurElec: [false],
    hasCompteurEau:  [false],
    notes:           [''],
  });

  ngOnInit() {
    this.route.queryParams.subscribe((q: Record<string,string>) => {
      this.proprieteIdCtx = q['proprieteId'] || undefined;
      this.load(this.proprieteIdCtx);
    });
  }

  load(proprieteId?: string) {
    this.loading.set(true);
    this.svc.getAll({
      page: this.page,
      proprieteId: proprieteId ?? this.proprieteIdCtx,
      type:   (this.filtreType   as TypeProduit)   || undefined,
      statut: (this.filtreStatut as StatutProduit)  || undefined,
      search: this.search || undefined,
    }).subscribe({
      next:  r  => { this.liste.set(r); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  onSearch()          { clearTimeout(this.timer); this.timer = setTimeout(() => { this.page=1; this.load(); }, 350); }
  clearSearch()       { this.search=''; this.page=1; this.load(); }
  setStatut(v:string) { this.filtreStatut=v; this.page=1; this.load(); }
  toggleType(v:string){ this.filtreType = this.filtreType===v ? '' : v; this.page=1; this.load(); }
  goPage(p:number)    { this.page=p; this.load(); }

  toggleRow(id: string)      { this.selection.has(id) ? this.selection.delete(id) : this.selection.add(id); }
  toggleAll(e: Event)        { const cb = e.target as HTMLInputElement; this.liste().items.forEach(p => cb.checked ? this.selection.add(p.id) : this.selection.delete(p.id)); }
  clearSelection()           { this.selection.clear(); }

  typeIcon(t:string|null|undefined): string { if(!t) return '🏠'; return ({Chambre:'🛏',Appartement:'🏠',Boutique:'🏪',Garage:'🚗'} as any)[t] ?? '🏠'; }
  statutLabel(s:string): string { return ({Libre:'Libre',Loue:'Loué',EnTravaux:'En travaux',Reserve:'Réservé',HorsService:'Hors service'} as any)[s] ?? s; }
  typeBg(t:string): string { return ({Chambre:'#fef3c7',Appartement:'#dbeafe',Boutique:'#d1fae5',Garage:'#ede9fe'} as any)[t] ?? '#f1f5f9'; }
  typeGradient(t:string): string { return ({Chambre:'linear-gradient(135deg,#92400e,#d97706)',Appartement:'linear-gradient(135deg,#1d4ed8,#3b82f6)',Boutique:'linear-gradient(135deg,#065f46,#16a34a)',Garage:'linear-gradient(135deg,#4c1d95,#7c3aed)'} as any)[t] ?? 'linear-gradient(135deg,#0e1c38,#1e3a6e)'; }

  ouvrirModal() {
    this.form.reset({ type:'Chambre', etage:0, hasCompteurElec:false, hasCompteurEau:false });
    this.propSel=null; this.propResultats=[]; this.searchProp=''; this.quantiteLot=1;
    this.etape.set(1); this.successMsg.set(''); this.errorMsg.set('');
    if (this.proprieteIdCtx) {
      this.propSvc.getById(this.proprieteIdCtx).subscribe((p:any) => { this.propSel=p; });
      this.etape.set(2);
    }
    this.showModal.set(true);
  }
  fermerModal()      { this.showModal.set(false); }
  onOverlay(e:Event) { if ((e.target as HTMLElement).classList.contains('modal-overlay')) this.fermerModal(); }
  etapePrev()        { this.etape.update(e=>e-1); }
  etapeNext()        { if (this.peutContinuer()) this.etape.update(e=>e+1); }

  peutContinuer(): boolean {
    if (this.etape()===1) return !!this.propSel;
    if (this.etape()===2) return this.form.get('description')!.valid && this.form.get('loyerReference')!.valid;
    return true;
  }
  fi(f:string): boolean { const c=this.form.get(f); return !!(c?.invalid&&c?.touched); }

  onSearchProp(e:Event) {
    const val=(e.target as HTMLInputElement).value;
    this.searchProp=val; clearTimeout(this.propTimer);
    if (val.length<2) { this.propResultats=[]; return; }
    this.propLoading=true;
    this.propTimer=setTimeout(()=>{
      this.propSvc.getAll(1,10,val).subscribe({ next:r=>{this.propResultats=r.items;this.propLoading=false;}, error:()=>{this.propLoading=false;} });
    }, 300);
  }
  decLot()          { if (this.quantiteLot>1) this.quantiteLot--; }
  incLot()          { if (this.quantiteLot<50) this.quantiteLot++; }
  selectProp(p:any) { this.propSel=p; this.propResultats=[]; this.searchProp=''; }
  clearProp()       { this.propSel=null; this.searchProp=''; }

  soumettre() {
    if (this.form.invalid||!this.propSel) return;
    this.submitting.set(true); this.errorMsg.set('');
    const onSuccess=()=>{ this.submitting.set(false); this.successMsg.set(this.quantiteLot>1?this.quantiteLot+' produits créés !':'Produit créé !'); this.load(); setTimeout(()=>this.fermerModal(),1500); };
    const onError=(err:any)=>{ this.submitting.set(false); this.errorMsg.set(err?.error?.message??'Une erreur est survenue.'); };
    if (this.quantiteLot>1) {
      this.svc.createBatch({ proprieteId:this.propSel.id, type:this.form.value.type, quantite:this.quantiteLot, loyerReference:this.form.value.loyerReference, descriptionGenerique:this.form.value.description }).subscribe({next:onSuccess,error:onError});
    } else {
      this.svc.create({...this.form.value,proprieteId:this.propSel.id}).subscribe({next:onSuccess,error:onError});
    }
  }
}