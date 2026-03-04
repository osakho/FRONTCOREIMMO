import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule, DecimalPipe }          from '@angular/common';
import { RouterLink, ActivatedRoute }          from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ProduitsService, ProprietesService } from '../../../core/services/api.services';
import { ProduitListItemDto, PagedList, TypeProduit, StatutProduit } from '../../../core/models/models';

@Component({
  selector: 'kdi-produits-list',
  standalone: true,
  imports: [CommonModule, DecimalPipe, RouterLink, FormsModule, ReactiveFormsModule],
  template: `

<!-- ══════════════════════════════════════════════
     PAGE
══════════════════════════════════════════════ -->
<div class="page">

  <!-- ── En-tête ── -->
  <div class="page-header">
    <div>
      <h2 class="page-title">Produits locatifs</h2>
      <p class="page-sub">Chambres, appartements, boutiques, garages</p>
    </div>
    <button class="btn-add" (click)="ouvrirModal()">＋ Nouveau produit</button>
  </div>

  <!-- ── KPI types ── -->
  <div class="kpi-types" *ngIf="typesStats().length">
    <div class="kt-card" *ngFor="let t of typesStats()"
         [class.active]="filtreType === t.value"
         (click)="toggleType(t.value)">
      <span class="kt-icon">{{ t.icon }}</span>
      <div class="kt-body">
        <div class="kt-count">{{ t.total }}</div>
        <div class="kt-label">{{ t.label }}</div>
      </div>
      <div class="kt-pills">
        <span class="kp libre"   *ngIf="t.libres">{{ t.libres }}L</span>
        <span class="kp loue"    *ngIf="t.loues">{{ t.loues }}B</span>
        <span class="kp travaux" *ngIf="t.travaux">{{ t.travaux }}T</span>
      </div>
    </div>
  </div>

  <!-- ── Filtres ── -->
  <div class="filter-bar">
    <div class="search-wrap">
      <span class="si">🔍</span>
      <input type="text" placeholder="Code, description, propriété…"
             [(ngModel)]="search" (ngModelChange)="onSearch()" />
      <span *ngIf="search" class="clear-x" (click)="clearSearch()">✕</span>
    </div>
    <div class="chips">
      <button class="chip"         [class.active]="filtreStatut===''"           (click)="setStatut('')">Tous</button>
      <button class="chip libre"   [class.active]="filtreStatut==='Libre'"      (click)="setStatut('Libre')">Libres</button>
      <button class="chip loue"    [class.active]="filtreStatut==='Loue'"       (click)="setStatut('Loue')">Loués</button>
      <button class="chip travaux" [class.active]="filtreStatut==='EnTravaux'"  (click)="setStatut('EnTravaux')">Travaux</button>
      <button class="chip reserve" [class.active]="filtreStatut==='Reserve'"    (click)="setStatut('Reserve')">Réservés</button>
    </div>
    <div class="view-toggle">
      <button [class.vt-act]="vue==='liste'"  (click)="vue='liste'"  title="Liste">☰</button>
      <button [class.vt-act]="vue==='cartes'" (click)="vue='cartes'" title="Cartes">⊞</button>
    </div>
  </div>

  <!-- Loading -->
  <div class="loading-row" *ngIf="loading()">
    <div class="spinner"></div><span>Chargement…</span>
  </div>

  <!-- ══════════════════════════════════
       VUE LISTE
  ══════════════════════════════════ -->
  <div class="table-card" *ngIf="vue==='liste' && !loading() && liste().items.length">
    <table>
      <thead><tr>
        <th>Code</th><th>Propriété</th><th>Type</th>
        <th class="c">Surface</th><th class="r">Loyer réf.</th>
        <th class="c">Statut</th><th></th>
      </tr></thead>
      <tbody>
        <tr *ngFor="let p of liste().items">
          <td><span class="code-badge">{{ p.code }}</span></td>
          <td><div class="cell-prop">{{ p.proprieteLibelle }}</div></td>
          <td>
            <span class="type-tag" [attr.data-t]="p.typeLabel">
              {{ typeIcon(p.typeLabel) }} {{ p.typeLabel }}
            </span>
          </td>
          <td class="c muted sm">{{ p.surface ? p.surface + ' m²' : '—' }}</td>
          <td class="r bold mono">{{ p.loyerReference | number:'1.0-0' }}<span class="mru"> MRU</span></td>
          <td class="c">
            <span class="statut-pill" [attr.data-s]="p.statutLabel">{{ statutLabel(p.statutLabel) }}</span>
          </td>
          <td>
            <div class="row-actions">
              <a [routerLink]="['/produits', p.id]" class="ra-btn">👁 <span>Détail</span></a>
              <a *ngIf="p.statutLabel==='Libre'"
                 [routerLink]="['/contrats-location/nouveau']"
                 [queryParams]="{produitId: p.id}"
                 class="ra-btn ra-green">📋 <span>Bail</span></a>
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  </div>

  <!-- ══════════════════════════════════
       VUE CARTES
  ══════════════════════════════════ -->
  <div class="cards-grid" *ngIf="vue==='cartes' && !loading() && liste().items.length">
    <div *ngFor="let p of liste().items" class="prod-card" [attr.data-s]="p.statutLabel">
      <div class="pc-head">
        <span class="pc-type-icon">{{ typeIcon(p.typeLabel) }}</span>
        <span class="statut-pill sm" [attr.data-s]="p.statutLabel">{{ statutLabel(p.statutLabel) }}</span>
      </div>
      <div class="pc-code">{{ p.code }}</div>
      <div class="pc-prop">{{ p.proprieteLibelle }}</div>
      <div class="pc-loyer">{{ p.loyerReference | number:'1.0-0' }}<span> MRU/mois</span></div>
      <div class="pc-meta">
        <span *ngIf="p.surface">📐 {{ p.surface }} m²</span>
        <span class="type-tag sm" [attr.data-t]="p.typeLabel">{{ p.typeLabel }}</span>
      </div>
      <div class="pc-foot">
        <a [routerLink]="['/produits', p.id]" class="ra-btn sm">👁 Détail</a>
        <a *ngIf="p.statutLabel==='Libre'"
           [routerLink]="['/contrats-location/nouveau']"
           [queryParams]="{produitId: p.id}"
           class="ra-btn sm ra-green">📋 Bail</a>
      </div>
    </div>
  </div>

  <!-- Vide -->
  <div class="empty-state" *ngIf="!loading() && !liste().items.length">
    <div class="es-icon">🏠</div>
    <div class="es-title">Aucun produit trouvé</div>
    <div class="es-sub">{{ search || filtreType || filtreStatut ? 'Modifiez vos filtres' : 'Créez votre premier produit locatif' }}</div>
    <button class="btn-add mt" (click)="ouvrirModal()">＋ Nouveau produit</button>
  </div>

  <!-- Pagination -->
  <div class="pagination" *ngIf="liste().totalPages > 1">
    <button [disabled]="page===1" (click)="goPage(page-1)">‹</button>
    <span>Page {{ page }} / {{ liste().totalPages }}</span>
    <button [disabled]="!liste().hasNext" (click)="goPage(page+1)">›</button>
  </div>

</div>


<!-- ══════════════════════════════════════════════════════
     MODAL — NOUVEAU PRODUIT LOCATIF
══════════════════════════════════════════════════════ -->
<div class="modal-overlay" [class.open]="showModal()" (click)="onOverlay($event)">
  <div class="nv-modal" (click)="$event.stopPropagation()">

    <!-- En-tête -->
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

    <!-- Stepper -->
    <div class="stepper">
      <ng-container *ngFor="let lbl of ['Propriété','Caractéristiques','Confirmation']; let i=index">
        <div class="stepper-step">
          <div class="step-dot"
               [class.step-active]="etape()===i+1"
               [class.step-done]="etape()>i+1">
            {{ etape() > i+1 ? '✓' : i+1 }}
          </div>
          <div class="step-lbl">{{ lbl }}</div>
        </div>
        <div class="step-line" *ngIf="i<2" [class.done]="etape()>i+1"></div>
      </ng-container>
    </div>

    <!-- Corps -->
    <div class="nv-body">

      <!-- ─── Étape 1 : Propriété ─── -->
      <ng-container *ngIf="etape()===1">
        <div class="step-title">🏢 Sélectionner la propriété</div>

        <div class="fg" *ngIf="!propSel">
          <label>Rechercher une propriété <span class="req">*</span></label>
          <div class="search-field">
            <span>🔍</span>
            <input type="text" class="fc-plain" placeholder="Nom de la propriété…"
                   [value]="searchProp" (input)="onSearchProp($event)" />
          </div>
          <div class="ac-list" *ngIf="propResultats.length">
            <div *ngFor="let p of propResultats" class="ac-item" (click)="selectProp(p)">
              <div class="ac-ico">🏢</div>
              <div>
                <div class="ac-nom">{{ p.libelle }}</div>
                <div class="ac-meta">{{ p.proprietaireNom }}</div>
              </div>
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

      <!-- ─── Étape 2 : Caractéristiques ─── -->
      <ng-container *ngIf="etape()===2" [formGroup]="form">
        <div class="step-title">📋 Caractéristiques du produit</div>

        <div class="type-selector">
          <button *ngFor="let t of types" type="button"
                  class="ts-btn" [class.active]="form.get('type')?.value === t.value"
                  (click)="form.get('type')!.setValue(t.value)">
            <span class="ts-icon">{{ t.icon }}</span>
            <span class="ts-lbl">{{ t.label }}</span>
          </button>
        </div>

        <div class="two-col">
          <div class="fg full">
            <label>Description <span class="req">*</span></label>
            <input type="text" class="fc" placeholder="Chambre simple, Appartement F3 meublé…"
                   formControlName="description" />
            <span class="err-msg" *ngIf="fi('description')">Obligatoire</span>
          </div>
          <div class="fg">
            <label>Loyer de référence <span class="req">*</span></label>
            <div class="input-sfx">
              <input type="number" class="fc" placeholder="15 000" formControlName="loyerReference" />
              <span class="sfx">MRU</span>
            </div>
            <span class="err-msg" *ngIf="fi('loyerReference')">Montant requis (> 0)</span>
          </div>
          <div class="fg">
            <label>Surface</label>
            <div class="input-sfx">
              <input type="number" class="fc" placeholder="25" formControlName="surface" />
              <span class="sfx">m²</span>
            </div>
          </div>
          <div class="fg">
            <label>Étage</label>
            <input type="number" class="fc" placeholder="0 = Rez-de-chaussée" formControlName="etage" />
          </div>
          <div class="fg full">
            <label>Notes internes</label>
            <textarea class="fc ta" rows="2" placeholder="Rénovation 2024, climatisation incluse…"
                      formControlName="notes"></textarea>
          </div>
        </div>

        <div class="compteurs">
          <div class="cpt-lbl">Équipements</div>
          <div class="cpt-row">
            <label class="cpt-check" [class.checked]="form.get('hasCompteurElec')?.value">
              <input type="checkbox" formControlName="hasCompteurElec" style="display:none" />
              ⚡ Compteur électricité
            </label>
            <label class="cpt-check" [class.checked]="form.get('hasCompteurEau')?.value">
              <input type="checkbox" formControlName="hasCompteurEau" style="display:none" />
              💧 Compteur eau
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
            <span class="lot-info">
              {{ quantiteLot > 1 ? quantiteLot + ' unités seront créées' : 'Unité individuelle' }}
            </span>
          </div>
        </div>
      </ng-container>

      <!-- ─── Étape 3 : Confirmation ─── -->
      <ng-container *ngIf="etape()===3">
        <div class="step-title">✅ Récapitulatif</div>

        <div class="recap-visual">
          <div class="rv-type">{{ typeIcon(form.get('type')?.value ?? '') }}</div>
          <div class="rv-info">
            <div class="rv-desc">{{ form.get('description')?.value }}</div>
            <div class="rv-prop">{{ propSel?.libelle }}</div>
          </div>
          <div class="rv-loyer">
            {{ form.get('loyerReference')?.value | number:'1.0-0' }}
            <span>MRU/mois</span>
          </div>
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

    <!-- Pied -->
    <div class="nv-footer">
      <button class="btn-ghost" (click)="fermerModal()">Annuler</button>
      <div class="foot-right">
        <button class="btn-sec"     *ngIf="etape()>1"  (click)="etapePrev()">← Précédent</button>
        <button class="btn-primary" *ngIf="etape()<3"  [disabled]="!peutContinuer()" (click)="etapeNext()">Suivant →</button>
        <button class="btn-submit"  *ngIf="etape()===3" [disabled]="!form.valid || !propSel || submitting()" (click)="soumettre()">
          <span *ngIf="!submitting()">{{ quantiteLot > 1 ? '📦 Créer ' + quantiteLot + ' produits' : '🏠 Créer le produit' }}</span>
          <span *ngIf="submitting()" class="spin"></span>
        </button>
      </div>
    </div>

  </div>
</div>
  `,
  styles: [`
    :host {
      --gold:#C9A84C; --gold-l:#E8C96A; --gold-d:#8B6914;
      --ink:#0D0D0D; --ink-mid:#1A1A2E; --ink-soft:#2D2D4A;
      --cream:#F8F4ED; --cream-dk:#EDE8DF; --muted:#8A8899;
      --ok:#1A7A4A; --ok-bg:#E6F5EE;
      --warn:#D4850A; --warn-bg:#FEF3E2;
      --danger:#C0392B; --danger-bg:#FDECEA;
      --blue:#1D4ED8; --blue-bg:#DBEAFE;
      --violet:#5B21B6; --violet-bg:#F5F3FF;
      --r:12px;
    }
    .page{max-width:1200px;margin:0 auto}
    .page-header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:22px;flex-wrap:wrap;gap:12px}
    .page-title{font-size:24px;font-weight:800;color:var(--ink-mid);margin:0 0 4px;font-family:'Playfair Display',Georgia,serif}
    .page-sub{font-size:13px;color:var(--muted);margin:0}
    .btn-add{padding:10px 22px;background:var(--ink-mid);color:var(--gold-l);border:none;border-radius:10px;font-size:14px;font-weight:700;cursor:pointer;font-family:inherit;transition:all .18s}
    .btn-add:hover{background:var(--ink-soft);box-shadow:0 4px 14px rgba(26,26,46,.25)}
    .btn-add.mt{margin-top:16px}

    /* KPI */
    .kpi-types{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:20px}
    .kt-card{background:#fff;border-radius:var(--r);padding:14px 16px;display:flex;align-items:center;gap:12px;box-shadow:0 2px 8px rgba(0,0,0,.06);cursor:pointer;border:2px solid transparent;transition:all .18s}
    .kt-card:hover{border-color:rgba(201,168,76,.4)}
    .kt-card.active{border-color:var(--gold);background:rgba(201,168,76,.04)}
    .kt-icon{font-size:26px;flex-shrink:0}
    .kt-body{flex:1}
    .kt-count{font-size:22px;font-weight:800;color:var(--ink-mid);line-height:1;font-family:'Playfair Display',Georgia,serif}
    .kt-label{font-size:11px;color:var(--muted);font-weight:600;text-transform:uppercase;letter-spacing:.4px;margin-top:2px}
    .kt-pills{display:flex;flex-direction:column;gap:3px}
    .kp{padding:1px 6px;border-radius:10px;font-size:10px;font-weight:700}
    .kp.libre{background:var(--ok-bg);color:var(--ok)}
    .kp.loue{background:var(--blue-bg);color:var(--blue)}
    .kp.travaux{background:var(--warn-bg);color:var(--warn)}

    /* Filtres */
    .filter-bar{display:flex;align-items:center;gap:12px;margin-bottom:18px;flex-wrap:wrap}
    .search-wrap{flex:1;min-width:240px;display:flex;align-items:center;gap:10px;background:#fff;border:1.5px solid var(--cream-dk);border-radius:10px;padding:9px 14px;transition:border-color .18s}
    .search-wrap:focus-within{border-color:var(--gold)}
    .si{font-size:15px;flex-shrink:0}
    .search-wrap input{flex:1;border:none;outline:none;font-size:13.5px;font-family:inherit;background:transparent}
    .search-wrap input::placeholder{color:#c0bcc8}
    .clear-x{color:var(--muted);cursor:pointer;font-size:12px}
    .clear-x:hover{color:var(--danger)}
    .chips{display:flex;gap:7px;flex-wrap:wrap}
    .chip{padding:7px 14px;border-radius:20px;border:1.5px solid var(--cream-dk);background:#fff;font-size:12.5px;font-weight:600;color:var(--muted);cursor:pointer;transition:all .15s}
    .chip.active{background:var(--ink-mid);color:var(--gold-l);border-color:var(--ink-mid)}
    .chip.libre.active{background:var(--ok);border-color:var(--ok);color:#fff}
    .chip.loue.active{background:var(--blue);border-color:var(--blue);color:#fff}
    .chip.travaux.active{background:var(--warn);border-color:var(--warn);color:#fff}
    .chip.reserve.active{background:var(--violet);border-color:var(--violet);color:#fff}
    .view-toggle{display:flex;border:1.5px solid var(--cream-dk);border-radius:8px;overflow:hidden;background:#fff}
    .view-toggle button{padding:7px 12px;border:none;background:transparent;cursor:pointer;font-size:15px;color:var(--muted);transition:all .15s}
    .view-toggle button.vt-act{background:var(--ink-mid);color:var(--gold-l)}
    .loading-row{display:flex;align-items:center;gap:12px;padding:40px;justify-content:center;color:var(--muted)}
    .spinner{width:24px;height:24px;border:2.5px solid var(--cream-dk);border-top-color:var(--ink-mid);border-radius:50%;animation:spin .8s linear infinite}
    @keyframes spin{to{transform:rotate(360deg)}}

    /* Tableau */
    .table-card{background:#fff;border-radius:var(--r);overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.07)}
    table{width:100%;border-collapse:collapse}
    thead th{padding:10px 16px;background:#f8f9fc;font-size:10.5px;font-weight:700;letter-spacing:.6px;text-transform:uppercase;color:var(--muted);border-bottom:1px solid var(--cream-dk);text-align:left}
    th.c{text-align:center}th.r{text-align:right}
    tbody td{padding:12px 16px;border-bottom:1px solid var(--cream-dk);vertical-align:middle;font-size:13px}
    tbody tr:last-child td{border-bottom:none}
    tbody tr:hover td{background:rgba(201,168,76,.03)}
    td.c{text-align:center}td.r{text-align:right}td.muted{color:var(--muted)}td.sm{font-size:12px}td.bold{font-weight:700}td.mono{font-family:monospace}
    .code-badge{font-family:monospace;font-weight:700;background:var(--cream);padding:4px 10px;border-radius:6px;color:var(--ink-mid);font-size:13px}
    .cell-prop{font-size:13px;color:var(--muted)}
    .mru{font-size:11px;color:var(--muted);font-weight:400}
    .type-tag{display:inline-flex;align-items:center;gap:5px;padding:3px 9px;border-radius:6px;font-size:12px;font-weight:600}
    .type-tag[data-t="Chambre"]{background:#fdf2f8;color:#9d174d}
    .type-tag[data-t="Appartement"]{background:var(--blue-bg);color:var(--blue)}
    .type-tag[data-t="Boutique"]{background:var(--warn-bg);color:var(--warn)}
    .type-tag[data-t="Garage"]{background:var(--cream-dk);color:var(--muted)}
    .type-tag.sm{font-size:10.5px;padding:2px 7px}
    .statut-pill{display:inline-flex;padding:4px 11px;border-radius:20px;font-size:11.5px;font-weight:700;white-space:nowrap}
    .statut-pill[data-s="Libre"]{background:var(--ok-bg);color:var(--ok)}
    .statut-pill[data-s="Loue"]{background:var(--blue-bg);color:var(--blue)}
    .statut-pill[data-s="EnTravaux"]{background:var(--warn-bg);color:var(--warn)}
    .statut-pill[data-s="Reserve"]{background:var(--violet-bg);color:var(--violet)}
    .statut-pill[data-s="HorsService"]{background:var(--danger-bg);color:var(--danger)}
    .statut-pill.sm{font-size:10px;padding:2px 8px}
    .row-actions{display:flex;gap:5px;justify-content:flex-end}
    .ra-btn{height:28px;border-radius:7px;border:none;background:var(--cream);color:var(--muted);font-size:12px;font-weight:600;cursor:pointer;display:inline-flex;align-items:center;gap:5px;text-decoration:none;padding:0 10px;transition:all .14s}
    .ra-btn:hover{background:var(--ink-mid);color:var(--gold-l)}
    .ra-btn.ra-green{background:var(--ok-bg);color:var(--ok)}
    .ra-btn.ra-green:hover{background:var(--ok);color:#fff}
    .ra-btn.sm{height:26px;font-size:11px;padding:0 8px}

    /* Cartes */
    .cards-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:14px}
    .prod-card{background:#fff;border-radius:var(--r);padding:18px;box-shadow:0 2px 10px rgba(0,0,0,.07);border:2px solid transparent;transition:all .15s;border-left:3px solid var(--cream-dk)}
    .prod-card:hover{border-color:rgba(201,168,76,.3);transform:translateY(-2px)}
    .prod-card[data-s="Libre"]{border-left-color:var(--ok)}
    .prod-card[data-s="Loue"]{border-left-color:var(--blue)}
    .prod-card[data-s="EnTravaux"]{border-left-color:var(--warn)}
    .prod-card[data-s="Reserve"]{border-left-color:var(--violet)}
    .pc-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:10px}
    .pc-type-icon{font-size:22px}
    .pc-code{font-family:monospace;font-weight:800;font-size:15px;color:var(--ink-mid);margin-bottom:4px}
    .pc-prop{font-size:12px;color:var(--muted);margin-bottom:10px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .pc-loyer{font-size:18px;font-weight:800;color:var(--ink-mid);font-family:'Playfair Display',Georgia,serif;margin-bottom:8px}
    .pc-loyer span{font-size:11px;font-weight:400;color:var(--muted)}
    .pc-meta{display:flex;align-items:center;gap:8px;margin-bottom:12px;font-size:12px;color:var(--muted)}
    .pc-foot{display:flex;gap:7px;padding-top:10px;border-top:1px solid var(--cream-dk)}
    .empty-state{text-align:center;padding:60px 20px;background:#fff;border-radius:var(--r);box-shadow:0 2px 10px rgba(0,0,0,.06)}
    .es-icon{font-size:48px;margin-bottom:12px}
    .es-title{font-size:17px;font-weight:700;color:var(--ink-mid);margin-bottom:6px}
    .es-sub{font-size:13px;color:var(--muted)}
    .pagination{display:flex;align-items:center;justify-content:center;gap:16px;margin-top:18px;font-size:13px;color:var(--muted)}
    .pagination button{width:30px;height:30px;border-radius:7px;border:1.5px solid var(--cream-dk);background:#fff;cursor:pointer}
    .pagination button:disabled{opacity:.4;cursor:not-allowed}

    /* ── MODAL ── */
    .modal-overlay{position:fixed;inset:0;background:rgba(13,13,13,.55);backdrop-filter:blur(4px);z-index:1000;display:flex;align-items:center;justify-content:center;padding:20px;opacity:0;pointer-events:none;transition:opacity .22s}
    .modal-overlay.open{opacity:1;pointer-events:all}
    .nv-modal{background:#fff;border-radius:18px;width:100%;max-width:580px;max-height:90vh;box-shadow:0 24px 80px rgba(13,13,13,.22),0 0 0 1px rgba(201,168,76,.12);display:flex;flex-direction:column;overflow:hidden;transform:translateY(16px) scale(.97);transition:transform .25s}
    .modal-overlay.open .nv-modal{transform:translateY(0) scale(1)}
    .nv-header{padding:20px 24px 16px;background:linear-gradient(135deg,var(--ink-mid),var(--ink-soft));display:flex;align-items:center;justify-content:space-between;flex-shrink:0}
    .nv-hl{display:flex;align-items:center;gap:12px}
    .nv-icon{width:42px;height:42px;border-radius:11px;background:rgba(201,168,76,.18);border:1.5px solid rgba(201,168,76,.35);display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0}
    .nv-title{font-size:17px;font-weight:700;color:var(--gold-l);font-family:'Playfair Display',Georgia,serif}
    .nv-sub{font-size:11.5px;color:rgba(255,255,255,.4);margin-top:2px}
    .close-btn{width:30px;height:30px;border-radius:7px;border:none;background:rgba(255,255,255,.1);color:rgba(255,255,255,.6);font-size:13px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .15s}
    .close-btn:hover{background:rgba(192,57,43,.35);color:#fff}
    .stepper{display:flex;align-items:center;padding:14px 24px 10px;background:var(--cream);border-bottom:1px solid var(--cream-dk);flex-shrink:0}
    .stepper-step{display:flex;flex-direction:column;align-items:center;gap:4px;flex:1}
    .step-dot{width:26px;height:26px;border-radius:50%;background:#fff;border:2px solid var(--cream-dk);display:flex;align-items:center;justify-content:center;font-size:11.5px;font-weight:700;color:var(--muted);transition:all .2s}
    .step-active{background:var(--gold);border-color:var(--gold);color:#fff;box-shadow:0 0 0 4px rgba(201,168,76,.2)}
    .step-done{background:var(--ok);border-color:var(--ok);color:#fff}
    .step-lbl{font-size:10.5px;font-weight:600;color:var(--muted);text-align:center}
    .step-line{flex:1;height:2px;background:var(--cream-dk);margin:0 4px 14px;border-radius:2px;transition:background .3s}
    .step-line.done{background:var(--ok)}
    .nv-body{flex:1;overflow-y:auto;padding:20px 24px}
    .nv-body::-webkit-scrollbar{width:4px}
    .nv-body::-webkit-scrollbar-thumb{background:var(--cream-dk);border-radius:4px}
    .step-title{font-size:13px;font-weight:700;color:var(--ink-soft);margin-bottom:16px;padding-bottom:10px;border-bottom:1px solid var(--cream-dk)}
    .fg{display:flex;flex-direction:column;gap:5px;margin-bottom:10px}
    .fg.full{grid-column:1/-1}
    label{font-size:12px;font-weight:700;color:var(--ink-soft)}
    .req{color:var(--danger);margin-left:2px}
    .search-field{display:flex;align-items:center;gap:8px;background:#fff;border:1.5px solid var(--cream-dk);border-radius:9px;padding:10px 13px;transition:border-color .18s}
    .search-field:focus-within{border-color:var(--gold)}
    .fc-plain{flex:1;border:none;outline:none;font-size:13px;font-family:inherit;background:transparent}
    .ac-list{border:1px solid var(--cream-dk);border-radius:9px;overflow:hidden;margin-top:4px;max-height:200px;overflow-y:auto;background:#fff;box-shadow:0 4px 14px rgba(0,0,0,.1)}
    .ac-item{display:flex;align-items:center;gap:10px;padding:11px 14px;cursor:pointer;border-bottom:1px solid var(--cream-dk);transition:background .12s}
    .ac-item:last-child{border:none}
    .ac-item:hover{background:rgba(201,168,76,.06)}
    .ac-ico{font-size:18px;flex-shrink:0}
    .ac-nom{font-size:13.5px;font-weight:600;color:var(--ink-mid)}
    .ac-meta{font-size:11.5px;color:var(--muted);margin-top:1px}
    .ac-empty{font-size:12.5px;color:var(--muted);padding:10px 0;text-align:center}
    .prop-selected{display:flex;align-items:center;gap:12px;background:var(--ok-bg);border:1.5px solid var(--ok);border-radius:10px;padding:13px 16px}
    .ps-ico{font-size:22px;flex-shrink:0}
    .ps-info{flex:1}
    .ps-nom{font-size:14px;font-weight:700;color:var(--ok)}
    .ps-meta{font-size:12px;color:var(--ok);opacity:.7;margin-top:2px}
    .ps-change{background:rgba(26,122,74,.15);border:1px solid rgba(26,122,74,.3);border-radius:7px;padding:5px 12px;font-size:12px;font-weight:600;color:var(--ok);cursor:pointer;white-space:nowrap}
    .type-selector{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:16px}
    .ts-btn{display:flex;flex-direction:column;align-items:center;gap:5px;padding:12px 8px;border-radius:10px;border:2px solid var(--cream-dk);background:#fff;cursor:pointer;transition:all .18s;font-family:inherit}
    .ts-btn:hover{border-color:var(--gold)}
    .ts-btn.active{border-color:var(--gold);background:rgba(201,168,76,.08)}
    .ts-icon{font-size:22px}
    .ts-lbl{font-size:11.5px;font-weight:700;color:var(--muted)}
    .ts-btn.active .ts-lbl{color:var(--gold-d)}
    .two-col{display:grid;grid-template-columns:1fr 1fr;gap:14px}
    .fc{padding:10px 12px;border:1.5px solid var(--cream-dk);border-radius:9px;font-size:13px;color:var(--ink);font-family:inherit;outline:none;transition:border-color .18s;background:#fff;width:100%;box-sizing:border-box}
    .fc:focus{border-color:var(--gold);box-shadow:0 0 0 3px rgba(201,168,76,.1)}
    .fc::placeholder{color:#c0bcc8}
    .ta{resize:none}
    .input-sfx{display:flex;align-items:center;border:1.5px solid var(--cream-dk);border-radius:9px;overflow:hidden;transition:border-color .18s}
    .input-sfx:focus-within{border-color:var(--gold);box-shadow:0 0 0 3px rgba(201,168,76,.1)}
    .input-sfx .fc{border:none;box-shadow:none;border-radius:0;flex:1}
    .input-sfx .fc:focus{box-shadow:none}
    .sfx{padding:0 12px;background:var(--cream);color:var(--muted);font-size:12px;font-weight:700;border-left:1px solid var(--cream-dk);white-space:nowrap;height:100%;display:flex;align-items:center}
    .err-msg{font-size:11.5px;color:var(--danger)}
    .compteurs{background:var(--cream);border-radius:10px;padding:12px 14px;margin-top:4px;margin-bottom:12px}
    .cpt-lbl{display:block;font-size:11px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px}
    .cpt-row{display:flex;gap:10px;flex-wrap:wrap}
    .cpt-check{display:flex;align-items:center;gap:8px;padding:8px 14px;background:#fff;border-radius:8px;border:1.5px solid var(--cream-dk);cursor:pointer;font-size:13px;font-weight:600;color:var(--muted);transition:all .15s}
    .cpt-check.checked{border-color:var(--gold);color:var(--gold-d);background:rgba(201,168,76,.05)}
    .lot-section{background:var(--blue-bg);border-radius:10px;padding:12px 16px;border:1px solid rgba(29,78,216,.15)}
    .lot-header{margin-bottom:10px}
    .lot-title{font-size:13px;font-weight:700;color:var(--blue)}
    .lot-sub{font-size:11.5px;color:rgba(29,78,216,.6);margin-left:6px}
    .lot-ctrl{display:flex;align-items:center;gap:10px}
    .lot-btn{width:28px;height:28px;border-radius:7px;border:1px solid rgba(29,78,216,.3);background:#fff;color:var(--blue);font-size:16px;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .15s}
    .lot-btn:hover{background:var(--blue);color:#fff}
    .lot-val{font-size:18px;font-weight:800;color:var(--blue);min-width:28px;text-align:center}
    .lot-info{font-size:12px;color:var(--blue);font-weight:600}
    .recap-visual{display:flex;align-items:center;gap:14px;background:var(--cream);border-radius:12px;padding:16px 18px;margin-bottom:14px;border:1px solid var(--cream-dk)}
    .rv-type{width:48px;height:48px;border-radius:12px;background:var(--ink-mid);display:flex;align-items:center;justify-content:center;font-size:22px;flex-shrink:0}
    .rv-info{flex:1}
    .rv-desc{font-size:15px;font-weight:700;color:var(--ink-mid)}
    .rv-prop{font-size:12px;color:var(--muted);margin-top:2px}
    .rv-loyer{text-align:right;font-size:20px;font-weight:800;color:var(--gold-d);font-family:'Playfair Display',Georgia,serif;flex-shrink:0}
    .rv-loyer span{font-size:11px;font-weight:400;color:var(--muted);display:block}
    .recap-grid{background:var(--cream);border-radius:10px;padding:14px 16px;border:1px solid var(--cream-dk)}
    .rg-row{display:flex;justify-content:space-between;align-items:center;padding:7px 0;border-bottom:1px solid var(--cream-dk);font-size:13px}
    .rg-row:last-child{border:none}
    .rg-row span{color:var(--muted);font-size:12px}
    .rg-row strong{color:var(--ink-mid);font-weight:600}
    .rg-row strong.qty{color:var(--blue);font-weight:800}
    .success-banner{display:flex;align-items:center;gap:8px;background:var(--ok-bg);border:1px solid var(--ok);border-radius:9px;padding:11px 14px;font-size:13px;color:var(--ok);font-weight:600;margin-top:12px}
    .error-banner{display:flex;align-items:center;gap:8px;background:var(--danger-bg);border:1px solid var(--danger);border-radius:9px;padding:11px 14px;font-size:13px;color:var(--danger);font-weight:600;margin-top:12px}
    .nv-footer{padding:14px 24px;border-top:1px solid var(--cream-dk);background:var(--cream);display:flex;align-items:center;justify-content:space-between;flex-shrink:0}
    .foot-right{display:flex;gap:9px}
    .btn-ghost{background:none;border:none;cursor:pointer;font-size:13px;color:var(--muted);padding:8px 2px;font-family:inherit}
    .btn-ghost:hover{color:var(--danger)}
    .btn-sec{padding:8px 16px;border-radius:8px;background:#fff;color:var(--ink-soft);border:1.5px solid var(--cream-dk);font-size:13px;font-weight:600;cursor:pointer;font-family:inherit}
    .btn-primary{padding:8px 20px;border-radius:8px;background:var(--ink-mid);color:var(--gold-l);border:none;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit;transition:background .15s}
    .btn-primary:disabled{opacity:.4;cursor:not-allowed}
    .btn-submit{padding:8px 22px;border-radius:8px;background:linear-gradient(135deg,var(--gold-d),var(--gold));color:#fff;border:none;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit;min-width:180px;display:flex;align-items:center;justify-content:center;gap:6px;transition:all .18s}
    .btn-submit:disabled{opacity:.4;cursor:not-allowed}
    .spin{width:16px;height:16px;border:2.5px solid rgba(255,255,255,.35);border-top-color:#fff;border-radius:50%;animation:spin .7s linear infinite;display:inline-block}
    @media(max-width:768px){.kpi-types{grid-template-columns:1fr 1fr}.two-col{grid-template-columns:1fr}.type-selector{grid-template-columns:1fr 1fr}}
    @media(max-width:600px){.nv-modal{border-radius:14px 14px 0 0}.modal-overlay{align-items:flex-end;padding:0}.cards-grid{grid-template-columns:1fr 1fr}}
  `]
})
export class ProduitsListComponent implements OnInit {

  private svc     = inject(ProduitsService);
  private propSvc = inject(ProprietesService);
  private route   = inject(ActivatedRoute);
  private fb      = inject(FormBuilder);

  liste   = signal<PagedList<ProduitListItemDto>>({ items:[], totalCount:0, page:1, pageSize:50, totalPages:0, hasNext:false, hasPrevious:false });
  loading = signal(false);
  page    = 1; search = ''; filtreType = ''; filtreStatut = ''; vue: 'liste'|'cartes' = 'liste';
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
      total:   this.liste().items.filter(i => i.typeLabel === t.value).length,
      libres:  this.liste().items.filter(i => i.typeLabel === t.value && i.statutLabel === 'Libre').length,
      loues:   this.liste().items.filter(i => i.typeLabel === t.value && i.statutLabel === 'Loue').length,
      travaux: this.liste().items.filter(i => i.typeLabel === t.value && i.statutLabel === 'EnTravaux').length,
    })).filter(t => t.total > 0);
  }

  // ── Modal ────────────────────────────────────────
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

  // ── Lifecycle ────────────────────────────────────
  ngOnInit() {
    this.route.queryParams.subscribe((q: Record<string,string>) => {
      this.proprieteIdCtx = q['proprieteId'] || undefined;
      this.load(this.proprieteIdCtx);
    });
  }

  // ── Liste ────────────────────────────────────────
  load(proprieteId?: string) {
    this.loading.set(true);
    this.svc.getAll({
      page: this.page,
      proprieteId: proprieteId ?? this.proprieteIdCtx,
      type:   (this.filtreType   as TypeProduit)  || undefined,
      statut: (this.filtreStatut as StatutProduit) || undefined,
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

  typeIcon(t:string|null|undefined): string { if (!t) return '🏠'; return ({ Chambre:'🛏', Appartement:'🏠', Boutique:'🏪', Garage:'🚗' } as Record<string,string>)[t] ?? '🏠'; }
  statutLabel(s:string) { return ({ Libre:'Libre', Loue:'Loué', EnTravaux:'En travaux', Reserve:'Réservé', HorsService:'Hors service' } as any)[s] ?? s; }

  // ── Modal ────────────────────────────────────────
  ouvrirModal() {
    this.form.reset({ type:'Chambre', etage:0, hasCompteurElec:false, hasCompteurEau:false });
    this.propSel = null; this.propResultats = []; this.searchProp = ''; this.quantiteLot = 1;
    this.etape.set(1); this.successMsg.set(''); this.errorMsg.set('');
    if (this.proprieteIdCtx) {
      this.propSvc.getById(this.proprieteIdCtx).subscribe((p:any) => { this.propSel = p; });
      this.etape.set(2);
    }
    this.showModal.set(true);
  }
  fermerModal()       { this.showModal.set(false); }
  onOverlay(e:Event)  { if ((e.target as HTMLElement).classList.contains('modal-overlay')) this.fermerModal(); }
  etapePrev()         { this.etape.update(e => e-1); }
  etapeNext()         { if (this.peutContinuer()) this.etape.update(e => e+1); }

  peutContinuer(): boolean {
    if (this.etape()===1) return !!this.propSel;
    if (this.etape()===2) return this.form.get('description')!.valid && this.form.get('loyerReference')!.valid;
    return true;
  }
  fi(f:string): boolean { const c=this.form.get(f); return !!(c?.invalid && c?.touched); }

  onSearchProp(e:Event) {
    const val = (e.target as HTMLInputElement).value;
    this.searchProp = val; clearTimeout(this.propTimer);
    if (val.length < 2) { this.propResultats=[]; return; }
    this.propLoading = true;
    this.propTimer = setTimeout(() => {
      this.propSvc.getAll(1, 10, val).subscribe({
        next: r => { this.propResultats=r.items; this.propLoading=false; },
        error: () => { this.propLoading=false; }
      });
    }, 300);
  }
  decLot() { if (this.quantiteLot > 1) this.quantiteLot--; }
  incLot() { if (this.quantiteLot < 50) this.quantiteLot++; }
  selectProp(p:any) { this.propSel=p; this.propResultats=[]; this.searchProp=''; }
  clearProp()       { this.propSel=null; this.searchProp=''; }

  soumettre() {
    if (this.form.invalid || !this.propSel) return;
    this.submitting.set(true); this.errorMsg.set('');
    const onSuccess = () => {
      this.submitting.set(false);
      this.successMsg.set(this.quantiteLot > 1
        ? this.quantiteLot + ' produits créés avec succès !'
        : 'Produit créé avec succès !');
      this.load();
      setTimeout(() => this.fermerModal(), 1500);
    };
    const onError = (err:any) => {
      this.submitting.set(false);
      this.errorMsg.set(err?.error?.message ?? 'Une erreur est survenue.');
    };

    if (this.quantiteLot > 1) {
      this.svc.createBatch({
        proprieteId: this.propSel.id, type: this.form.value.type,
        quantite: this.quantiteLot, loyerReference: this.form.value.loyerReference,
        descriptionGenerique: this.form.value.description,
      }).subscribe({ next: onSuccess, error: onError });
    } else {
      this.svc.create({ ...this.form.value, proprieteId: this.propSel.id })
        .subscribe({ next: onSuccess, error: onError });
    }

  }
}