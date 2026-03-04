import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule }                                   from '@angular/common';
import { RouterLink }                                    from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ProprietesService, ProprietairesService }       from '../../../core/services/api.services';
import { ProprieteListItemDto, ProprietaireListItemDto } from '../../../core/models/models';

@Component({
  selector: 'kdi-proprietes-list',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, ReactiveFormsModule],
  template: `

<div class="page">

  <!-- ════════════════════════════════════════════
       EN-TÊTE
  ════════════════════════════════════════════ -->
  <div class="page-header">
    <div>
      <div class="page-title">🏢 Propriétés</div>
      <div class="page-sub">{{ liste().totalCount }} propriété(s) enregistrée(s)</div>
    </div>
    <button class="btn-add" (click)="ouvrirModal()">+ Nouvelle propriété</button>
  </div>

  <!-- ════════════════════════════════════════════
       BARRE RECHERCHE
  ════════════════════════════════════════════ -->
  <div class="search-bar">
    <span>🔍</span>
    <input
      type="text"
      placeholder="Rechercher par nom, adresse, propriétaire…"
      [(ngModel)]="searchQuery"
      (input)="onSearch()"
    />
    <span *ngIf="searchQuery" class="clear-x" (click)="clearSearch()">✕</span>
  </div>

  <!-- ════════════════════════════════════════════
       TABLEAU
  ════════════════════════════════════════════ -->
  <div class="table-card" *ngIf="liste().items.length && !loading(); else emptyOrLoading">
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
        <tr *ngFor="let p of liste().items">
          <td>
            <div class="prop-name">{{ p.libelle }}</div>
            <div class="prop-meta">{{ p.quartier }}</div>
          </td>
          <td>{{ p.proprietaireNom }}</td>
          <td class="td-muted">{{ p.adresse }}</td>
          <td class="r mono">{{ p.nombreProduits }}</td>
          <td class="r">
            <span class="badge" [class.badge-ok]="p.nombreLibres === 0"
                                [class.badge-warn]="p.nombreLibres > 0">
              {{ p.nombreLibres }}
            </span>
          </td>
          <td>
            <span class="badge" [class.badge-ok]="p.aContratGestion"
                                [class.badge-muted]="!p.aContratGestion">
              {{ p.aContratGestion ? '✓ Actif' : '— Aucun' }}
            </span>
          </td>
          <td>
            <a [routerLink]="['/proprietes', p.id]" class="btn-link">Voir →</a>
          </td>
        </tr>
      </tbody>
    </table>

    <!-- Pagination -->
    <div class="pagination" *ngIf="liste().totalPages > 1">
      <button [disabled]="page === 1" (click)="goTo(page - 1)">‹</button>
      <span>Page {{ page }} / {{ liste().totalPages }}</span>
      <button [disabled]="page === liste().totalPages" (click)="goTo(page + 1)">›</button>
    </div>
  </div>

  <ng-template #emptyOrLoading>
    <div class="loading-state" *ngIf="loading()">
      <div class="spinner"></div><p>Chargement…</p>
    </div>
    <div class="empty-state" *ngIf="!loading()">
      <div class="empty-icon">🏢</div>
      <div class="empty-title">Aucune propriété trouvée</div>
      <div class="empty-sub">Cliquez sur « + Nouvelle propriété » pour commencer</div>
      <button class="btn-add" style="margin-top:18px" (click)="ouvrirModal()">
        + Nouvelle propriété
      </button>
    </div>
  </ng-template>

</div>


<!-- ════════════════════════════════════════════════════════
     MODAL — NOUVELLE PROPRIÉTÉ (intégré dans le même fichier)
════════════════════════════════════════════════════════ -->
<div class="modal-overlay" [class.open]="modalOuvert()" (click)="onOverlayClick($event)">
  <div class="nv-modal" (click)="$event.stopPropagation()">

    <!-- En-tête modal -->
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

    <!-- Stepper -->
    <div class="stepper">
      <div class="stepper-step" *ngFor="let l of stepLabels; let i = index">
        <div class="step-dot"
             [class.step-active]="etape() === i+1"
             [class.step-done]="etape() > i+1">
          {{ etape() > i+1 ? '✓' : i+1 }}
        </div>
        <div class="step-label">{{ l }}</div>
      </div>
    </div>

    <!-- Corps -->
    <div class="nv-body" [formGroup]="form">

      <!-- ─── Étape 1 : Propriétaire ─── -->
      <ng-container *ngIf="etape() === 1">
        <div class="step-title">👤 Sélectionner le propriétaire</div>

        <div class="field-group">
          <label class="field-lbl">Propriétaire <span class="req">*</span></label>
          <div class="field-row-input" [class.focused]="propFocused">
            <span class="fi">🔍</span>
            <input
              type="text"
              class="fi-input"
              placeholder="Rechercher par nom, téléphone…"
              [(ngModel)]="searchProp"
              [ngModelOptions]="{standalone:true}"
              (input)="rechercherProp()"
              (focus)="propFocused=true"
              (blur)="onPropBlur()"
              autocomplete="off"
            />
            <span *ngIf="searchProp" class="clear-x" (click)="clearProp()">✕</span>
          </div>

          <!-- Résultats -->
          <div class="ac-list" *ngIf="propResultats.length && showPropResults">
            <div *ngFor="let p of propResultats"
                 class="ac-item"
                 [class.ac-selected]="propSel?.id === p.id"
                 (click)="selectProp(p)">
              <div class="ac-avatar">{{ initiales(p.nomComplet) }}</div>
              <div class="ac-info">
                <div class="ac-name">{{ p.nomComplet }}</div>
                <div class="ac-detail">{{ p.telephone }}</div>
              </div>
              <span *ngIf="propSel?.id === p.id" class="ac-check">✓</span>
            </div>
          </div>

          <!-- Sélectionné -->
          <div class="selected-item" *ngIf="propSel && !showPropResults">
            <div class="ac-avatar ac-ok">{{ initiales(propSel.nomComplet) }}</div>
            <div class="ac-info">
              <div class="ac-name">{{ propSel.nomComplet }}</div>
              <div class="ac-detail">{{ propSel.telephone }}</div>
            </div>
            <button class="btn-change" (click)="clearProp()">Changer</button>
          </div>

          <p class="hint" *ngIf="!propSel">Tapez au moins 2 caractères pour rechercher</p>
        </div>
      </ng-container>

      <!-- ─── Étape 2 : Localisation ─── -->
      <ng-container *ngIf="etape() === 2">
        <div class="step-title">📍 Localisation de la propriété</div>

        <div class="two-col">
          <div class="field-group">
            <label class="field-lbl">Libellé / Nom <span class="req">*</span></label>
            <div class="field-input-wrap" [class.err]="invalid('libelle')">
              <span class="fi">🏢</span>
              <input type="text" class="fi-input" placeholder="Ex : Résidence Les Palmiers"
                     formControlName="libelle" />
            </div>
            <span class="err-msg" *ngIf="invalid('libelle')">Champ obligatoire</span>
          </div>

          <div class="field-group">
            <label class="field-lbl">Ville <span class="req">*</span></label>
            <div class="field-input-wrap" [class.err]="invalid('ville')">
              <span class="fi">🌍</span>
              <input type="text" class="fi-input" placeholder="Ex : Nouakchott"
                     formControlName="ville" />
            </div>
            <span class="err-msg" *ngIf="invalid('ville')">Champ obligatoire</span>
          </div>
        </div>

        <div class="two-col">
          <div class="field-group">
            <label class="field-lbl">Adresse <span class="req">*</span></label>
            <div class="field-input-wrap" [class.err]="invalid('adresse')">
              <span class="fi">📍</span>
              <input type="text" class="fi-input" placeholder="Ex : Avenue principale"
                     formControlName="adresse" />
            </div>
            <span class="err-msg" *ngIf="invalid('adresse')">Champ obligatoire</span>
          </div>

          <div class="field-group">
            <label class="field-lbl">Quartier</label>
            <div class="field-input-wrap">
              <span class="fi">🗺️</span>
              <input type="text" class="fi-input" placeholder="Ex : Tevragh Zeina"
                     formControlName="quartier" />
            </div>
          </div>
        </div>

        <div class="field-group">
          <label class="field-lbl">Code zone</label>
          <div class="field-input-wrap" style="max-width:200px">
            <span class="fi">🔖</span>
            <input type="text" class="fi-input" placeholder="Ex : TZ-01"
                   formControlName="zoneCode" />
          </div>
          <p class="hint">Optionnel — code interne de la zone géographique</p>
        </div>
      </ng-container>

      <!-- ─── Étape 3 : Détails ─── -->
      <ng-container *ngIf="etape() === 3">
        <div class="step-title">📋 Détails & confirmation</div>

        <div class="field-group">
          <label class="field-lbl">Description</label>
          <textarea class="fi-textarea"
                    placeholder="Type de construction, état général, particularités…"
                    formControlName="description" rows="3"></textarea>
          <p class="hint">Optionnel</p>
        </div>

        <!-- Récap -->
        <div class="recap-card">
          <div class="recap-title">Récapitulatif</div>
          <div class="recap-grid">
            <div class="recap-item">
              <div class="rc-lbl">Propriétaire</div>
              <div class="rc-val">{{ propSel?.nomComplet || '—' }}</div>
            </div>
            <div class="recap-item">
              <div class="rc-lbl">Libellé</div>
              <div class="rc-val">{{ form.get('libelle')?.value || '—' }}</div>
            </div>
            <div class="recap-item">
              <div class="rc-lbl">Adresse</div>
              <div class="rc-val">{{ form.get('adresse')?.value || '—' }}</div>
            </div>
            <div class="recap-item">
              <div class="rc-lbl">Ville</div>
              <div class="rc-val">{{ form.get('ville')?.value || '—' }}</div>
            </div>
          </div>
        </div>

        <div class="success-banner" *ngIf="successMsg()">✅ {{ successMsg() }}</div>
        <div class="error-banner"   *ngIf="errorMsg()">⚠️ {{ errorMsg() }}</div>
      </ng-container>

    </div><!-- /nv-body -->

    <!-- Pied modal -->
    <div class="nv-footer">
      <button class="btn-ghost" (click)="fermerModal()">Annuler</button>
      <div class="footer-right">
        <button class="btn-sec" *ngIf="etape() > 1" (click)="etapePrev()">
          ← Précédent
        </button>
        <button class="btn-primary" *ngIf="etape() < 3"
                [disabled]="!peutContinuer()"
                (click)="etapeNext()">
          Suivant →
        </button>
        <button class="btn-submit" *ngIf="etape() === 3"
                [disabled]="!form.valid || !propSel || submitting()"
                (click)="soumettre()">
          <span *ngIf="!submitting()">✓ Enregistrer</span>
          <span *ngIf="submitting()" class="spin-inline"></span>
        </button>
      </div>
    </div>

  </div><!-- /nv-modal -->
</div><!-- /modal-overlay -->
  `,
  styles: [`
    :host {
      --gold:      #C9A84C; --gold-l:    #E8C96A; --gold-d:   #8B6914;
      --ink:       #0D0D0D; --ink-mid:   #1A1A2E; --ink-soft: #2D2D4A;
      --cream:     #F8F4ED; --cream-dk:  #EDE8DF; --muted:    #8A8899;
      --ok:        #1A7A4A; --ok-bg:     #E6F5EE;
      --warn:      #D4850A; --warn-bg:   #FEF3E2;
      --danger:    #C0392B; --danger-bg: #FDECEA;
      --r:         12px;    --sh:        0 2px 10px rgba(0,0,0,.07);
    }

    /* ─ Page ─ */
    .page { max-width:1300px; margin:0 auto; }
    .page-header { display:flex; justify-content:space-between; align-items:flex-end; margin-bottom:22px; flex-wrap:wrap; gap:12px; }
    .page-title  { font-size:22px; font-weight:700; color:var(--ink); margin-bottom:3px; }
    .page-sub    { font-size:13px; color:var(--muted); }

    .btn-add {
      padding:9px 20px; background:var(--ink-mid); color:var(--gold-l);
      border:none; border-radius:9px; font-size:13.5px; font-weight:600;
      cursor:pointer; font-family:inherit; transition:background .18s;
    }
    .btn-add:hover { background:var(--ink-soft); }

    /* ─ Recherche ─ */
    .search-bar {
      display:flex; align-items:center; gap:10px; background:#fff;
      border:1.5px solid var(--cream-dk); border-radius:10px;
      padding:10px 16px; margin-bottom:18px; transition:border-color .18s;
    }
    .search-bar:focus-within { border-color:var(--gold); }
    .search-bar input { flex:1; border:none; outline:none; font-size:13.5px; font-family:inherit; background:transparent; }
    .search-bar input::placeholder { color:#c0bcc8; }
    .clear-x { color:var(--muted); cursor:pointer; font-size:12px; }
    .clear-x:hover { color:var(--danger); }

    /* ─ Tableau ─ */
    .table-card { background:#fff; border-radius:var(--r); overflow:hidden; box-shadow:var(--sh); }
    table    { width:100%; border-collapse:collapse; }
    thead th { padding:11px 15px; background:#f8f9fc; font-size:11px; font-weight:700; letter-spacing:.7px; text-transform:uppercase; color:var(--muted); border-bottom:1px solid var(--cream-dk); text-align:left; }
    thead th.r { text-align:right; }
    tbody td { padding:13px 15px; font-size:13.5px; color:var(--ink-soft); border-bottom:1px solid var(--cream-dk); vertical-align:middle; }
    tbody tr:last-child td { border-bottom:none; }
    tbody tr:hover td { background:rgba(201,168,76,.03); }
    td.r { text-align:right; }
    td.mono { font-family:monospace; font-weight:600; }
    td.td-muted { color:var(--muted); font-size:12.5px; }
    .prop-name { font-weight:600; }
    .prop-meta { font-size:11.5px; color:var(--muted); margin-top:2px; }

    .badge       { display:inline-flex; padding:3px 9px; border-radius:20px; font-size:11px; font-weight:700; }
    .badge-ok    { background:var(--ok-bg);     color:var(--ok); }
    .badge-warn  { background:var(--warn-bg);    color:var(--warn); }
    .badge-muted { background:var(--cream-dk);   color:var(--muted); }
    .btn-link    { font-size:12.5px; color:var(--gold-d); font-weight:700; text-decoration:none; }
    .btn-link:hover { text-decoration:underline; }

    .pagination { display:flex; align-items:center; justify-content:center; gap:16px; padding:14px; border-top:1px solid var(--cream-dk); font-size:13px; color:var(--muted); }
    .pagination button { width:30px; height:30px; border-radius:7px; border:1.5px solid var(--cream-dk); background:#fff; cursor:pointer; font-size:14px; }
    .pagination button:disabled { opacity:.4; cursor:not-allowed; }

    .empty-state { text-align:center; padding:60px 20px; }
    .empty-icon  { font-size:46px; margin-bottom:12px; }
    .empty-title { font-size:16px; font-weight:700; color:var(--ink); margin-bottom:6px; }
    .empty-sub   { font-size:13px; color:var(--muted); }
    .loading-state { display:flex; flex-direction:column; align-items:center; padding:60px; gap:14px; color:var(--muted); }
    .spinner { width:30px; height:30px; border:3px solid var(--cream-dk); border-top-color:var(--ink-mid); border-radius:50%; animation:spin .8s linear infinite; }
    @keyframes spin { to { transform:rotate(360deg); } }

    /* ══════════════════════════════════════════════
       MODAL OVERLAY
    ══════════════════════════════════════════════ */
    .modal-overlay {
      position:fixed; inset:0;
      background:rgba(13,13,13,.55); backdrop-filter:blur(4px);
      z-index:1000; display:flex; align-items:center; justify-content:center; padding:20px;
      opacity:0; pointer-events:none; transition:opacity .22s;
    }
    .modal-overlay.open { opacity:1; pointer-events:all; }

    .nv-modal {
      background:#fff; border-radius:18px;
      width:100%; max-width:620px; max-height:90vh;
      box-shadow:0 24px 80px rgba(13,13,13,.22), 0 0 0 1px rgba(201,168,76,.15);
      display:flex; flex-direction:column; overflow:hidden;
      transform:translateY(16px) scale(.97); transition:transform .25s;
    }
    .modal-overlay.open .nv-modal { transform:translateY(0) scale(1); }

    /* En-tête modal */
    .nv-header {
      padding:20px 24px 16px;
      background:linear-gradient(to right, var(--ink-mid), var(--ink-soft));
      display:flex; align-items:center; justify-content:space-between; flex-shrink:0;
    }
    .nv-header-left { display:flex; align-items:center; gap:13px; }
    .nv-icon {
      width:42px; height:42px; border-radius:11px;
      background:rgba(201,168,76,.18); border:1.5px solid rgba(201,168,76,.35);
      display:flex; align-items:center; justify-content:center; font-size:19px; flex-shrink:0;
    }
    .nv-title { font-size:17px; font-weight:700; color:var(--gold-l); font-family:'Playfair Display',Georgia,serif; }
    .nv-sub   { font-size:11.5px; color:rgba(255,255,255,.4); margin-top:2px; }
    .modal-close-btn {
      width:30px; height:30px; border-radius:7px; border:none;
      background:rgba(255,255,255,.1); color:rgba(255,255,255,.6);
      font-size:13px; cursor:pointer; transition:all .15s;
      display:flex; align-items:center; justify-content:center;
    }
    .modal-close-btn:hover { background:rgba(192,57,43,.3); color:#fff; }

    /* Stepper */
    .stepper {
      display:flex; align-items:center; justify-content:center;
      padding:16px 24px 12px; gap:0;
      background:var(--cream); border-bottom:1px solid var(--cream-dk); flex-shrink:0;
    }
    .stepper-step { display:flex; flex-direction:column; align-items:center; gap:5px; flex:1; }
    .step-dot {
      width:28px; height:28px; border-radius:50%;
      background:#fff; border:2px solid var(--cream-dk);
      display:flex; align-items:center; justify-content:center;
      font-size:12px; font-weight:700; color:var(--muted); transition:all .2s;
    }
    .step-active { background:var(--gold); border-color:var(--gold); color:#fff; box-shadow:0 0 0 4px rgba(201,168,76,.2); }
    .step-done   { background:var(--ok);   border-color:var(--ok);   color:#fff; }
    .step-label  { font-size:11px; font-weight:600; color:var(--muted); text-align:center; }
    .stepper-step:has(.step-active) .step-label { color:var(--gold-d); }
    .stepper-step:has(.step-done)   .step-label { color:var(--ok); }

    /* Corps modal */
    .nv-body {
      flex:1; overflow-y:auto; padding:22px 24px;
    }
    .nv-body::-webkit-scrollbar { width:4px; }
    .nv-body::-webkit-scrollbar-thumb { background:var(--cream-dk); border-radius:4px; }

    .step-title { font-size:13px; font-weight:700; color:var(--ink-soft); margin-bottom:16px; padding-bottom:10px; border-bottom:1px solid var(--cream-dk); }

    /* Champs */
    .two-col { display:grid; grid-template-columns:1fr 1fr; gap:14px; }
    .field-group { margin-bottom:14px; }
    .field-lbl { display:block; font-size:12px; font-weight:700; color:var(--ink-soft); margin-bottom:6px; letter-spacing:.2px; }
    .req { color:var(--danger); margin-left:2px; }
    .hint { font-size:11.5px; color:var(--muted); margin-top:4px; }
    .err-msg { font-size:11.5px; color:var(--danger); margin-top:4px; display:block; }

    .field-input-wrap, .field-row-input {
      display:flex; align-items:center;
      border:1.5px solid var(--cream-dk); border-radius:9px; background:#fff;
      transition:all .18s; overflow:hidden;
    }
    .field-input-wrap:focus-within, .field-row-input.focused {
      border-color:var(--gold); box-shadow:0 0 0 3px rgba(201,168,76,.1);
    }
    .field-input-wrap.err { border-color:var(--danger); }
    .fi { padding:0 11px; font-size:14px; flex-shrink:0; }
    .fi-input {
      flex:1; border:none; outline:none; padding:10px 11px 10px 0;
      font-size:13px; color:var(--ink); font-family:inherit; background:transparent;
    }
    .fi-input::placeholder { color:#c0bcc8; }
    .fi-textarea {
      width:100%; border:1.5px solid var(--cream-dk); border-radius:9px;
      padding:11px 14px; font-size:13px; color:var(--ink); resize:none;
      font-family:inherit; outline:none; background:#fff; line-height:1.6; transition:border-color .18s;
    }
    .fi-textarea:focus { border-color:var(--gold); }
    .fi-textarea::placeholder { color:#c0bcc8; }

    /* Autocomplete */
    .ac-list { border:1.5px solid var(--cream-dk); border-radius:9px; overflow:hidden; margin-top:6px; background:#fff; max-height:220px; overflow-y:auto; box-shadow:0 4px 16px rgba(0,0,0,.08); }
    .ac-item { display:flex; align-items:center; gap:10px; padding:10px 13px; cursor:pointer; border-bottom:1px solid var(--cream-dk); transition:background .14s; }
    .ac-item:last-child { border:none; }
    .ac-item:hover, .ac-item.ac-selected { background:rgba(201,168,76,.06); }
    .ac-avatar {
      width:32px; height:32px; border-radius:8px;
      background:linear-gradient(135deg, var(--ink-mid), var(--ink-soft));
      display:flex; align-items:center; justify-content:center;
      font-size:11px; color:var(--gold-l); font-weight:700; flex-shrink:0;
    }
    .ac-avatar.ac-ok { background:linear-gradient(135deg, var(--ok), #2EA862); }
    .ac-info { flex:1; }
    .ac-name   { font-size:13px; font-weight:600; color:var(--ink); }
    .ac-detail { font-size:11px; color:var(--muted); margin-top:1px; }
    .ac-check  { color:var(--ok); font-weight:700; }

    .selected-item { display:flex; align-items:center; gap:10px; padding:11px 14px; border-radius:9px; background:var(--ok-bg); border:1.5px solid var(--ok); margin-top:6px; }
    .btn-change { font-size:11.5px; color:var(--ok); font-weight:700; background:none; border:1px solid var(--ok); border-radius:6px; padding:3px 10px; cursor:pointer; transition:all .15s; }
    .btn-change:hover { background:var(--ok); color:#fff; }

    /* Récap */
    .recap-card { background:var(--cream); border-radius:9px; padding:14px 16px; border:1px solid var(--cream-dk); margin-top:4px; }
    .recap-title { font-size:12px; font-weight:700; color:var(--ink-soft); margin-bottom:10px; }
    .recap-grid { display:grid; grid-template-columns:1fr 1fr; gap:8px; }
    .recap-item { }
    .rc-lbl { font-size:10.5px; color:var(--muted); font-weight:700; text-transform:uppercase; letter-spacing:.5px; }
    .rc-val { font-size:13px; color:var(--ink); font-weight:600; margin-top:2px; }

    .success-banner { display:flex; align-items:center; gap:8px; background:var(--ok-bg); border:1px solid var(--ok); border-radius:9px; padding:11px 14px; font-size:13px; color:var(--ok); font-weight:600; margin-top:12px; }
    .error-banner   { display:flex; align-items:center; gap:8px; background:var(--danger-bg); border:1px solid var(--danger); border-radius:9px; padding:11px 14px; font-size:13px; color:var(--danger); font-weight:600; margin-top:12px; }

    /* Pied modal */
    .nv-footer {
      padding:14px 24px; border-top:1px solid var(--cream-dk);
      background:var(--cream); display:flex; align-items:center; justify-content:space-between; flex-shrink:0;
    }
    .footer-right { display:flex; gap:9px; }
    .btn-ghost    { background:none; border:none; cursor:pointer; font-size:13px; color:var(--muted); padding:8px 2px; font-family:inherit; transition:color .15s; }
    .btn-ghost:hover { color:var(--danger); }
    .btn-sec      { padding:8px 16px; border-radius:8px; background:#fff; color:var(--ink-soft); border:1.5px solid var(--cream-dk); font-size:13px; font-weight:600; cursor:pointer; font-family:inherit; transition:all .15s; }
    .btn-sec:hover { border-color:var(--ink-soft); }
    .btn-primary  { padding:8px 20px; border-radius:8px; background:var(--ink-mid); color:var(--gold-l); border:none; font-size:13px; font-weight:600; cursor:pointer; font-family:inherit; transition:background .18s; }
    .btn-primary:hover:not(:disabled) { background:var(--ink-soft); }
    .btn-primary:disabled { opacity:.4; cursor:not-allowed; }
    .btn-submit   { padding:8px 22px; border-radius:8px; background:linear-gradient(135deg,var(--gold-d),var(--gold)); color:#fff; border:none; font-size:13px; font-weight:700; cursor:pointer; font-family:inherit; min-width:150px; display:flex; align-items:center; justify-content:center; transition:all .18s; }
    .btn-submit:hover:not(:disabled) { box-shadow:0 4px 14px rgba(201,168,76,.35); }
    .btn-submit:disabled { opacity:.4; cursor:not-allowed; }
    .spin-inline { width:16px; height:16px; border:2.5px solid rgba(255,255,255,.35); border-top-color:#fff; border-radius:50%; animation:spin .7s linear infinite; display:inline-block; }

    @media(max-width:600px) {
      .two-col { grid-template-columns:1fr; }
      .recap-grid { grid-template-columns:1fr; }
      .nv-modal { border-radius:14px 14px 0 0; }
      .modal-overlay { align-items:flex-end; padding:0; }
    }
  `]
})
export class ProprietesListComponent implements OnInit {

  private svc      = inject(ProprietesService);
  private propSvc2 = inject(ProprietairesService);
  private fb       = inject(FormBuilder);

  // ── Liste ────────────────────────────────────────
  liste   = signal<any>({ items:[], totalCount:0, totalPages:1 });
  loading = signal(false);
  page    = 1;
  searchQuery = '';
  private timer: any;

  // ── Modal ─────────────────────────────────────────
  modalOuvert = signal(false);
  etape       = signal(1);
  submitting  = signal(false);
  successMsg  = signal('');
  errorMsg    = signal('');
  stepLabels  = ['Propriétaire', 'Localisation', 'Détails'];

  // Recherche propriétaire
  searchProp      = '';
  propFocused     = false;
  showPropResults = false;
  propResultats:  ProprietaireListItemDto[] = [];
  propSel:        ProprietaireListItemDto | null = null;
  private timer2: any;

  // Formulaire
  form = this.fb.group({
    libelle:     ['', Validators.required],
    adresse:     ['', Validators.required],
    ville:       ['', Validators.required],
    quartier:    [''],
    zoneCode:    [''],
    description: [''],
  });

  // ── Lifecycle ────────────────────────────────────
  ngOnInit(): void { this.charger(); }

  // ── Liste : chargement ───────────────────────────
  charger(): void {
    this.loading.set(true);
    this.svc.getAll(this.page, 20, this.searchQuery || undefined).subscribe({
      next:  res => { this.liste.set(res); this.loading.set(false); },
      error: ()  => this.loading.set(false)
    });
  }

  onSearch(): void {
    clearTimeout(this.timer);
    this.timer = setTimeout(() => { this.page = 1; this.charger(); }, 350);
  }

  clearSearch(): void { this.searchQuery = ''; this.page = 1; this.charger(); }
  goTo(p: number): void { this.page = p; this.charger(); }

  // ── Modal : ouverture / fermeture ────────────────
  ouvrirModal(): void {
    this.resetModal();
    this.modalOuvert.set(true);
  }

  fermerModal(): void {
    this.modalOuvert.set(false);
    setTimeout(() => this.resetModal(), 250);
  }

  onOverlayClick(e: Event): void {
    if ((e.target as HTMLElement).classList.contains('modal-overlay')) this.fermerModal();
  }

  resetModal(): void {
    this.etape.set(1);
    this.form.reset();
    this.searchProp = '';
    this.propSel = null;
    this.propResultats = [];
    this.showPropResults = false;
    this.successMsg.set('');
    this.errorMsg.set('');
    this.submitting.set(false);
  }

  // ── Navigation étapes ────────────────────────────
  peutContinuer(): boolean {
    if (this.etape() === 1) return !!this.propSel;
    if (this.etape() === 2)
      return !!this.form.get('libelle')?.valid
          && !!this.form.get('adresse')?.valid
          && !!this.form.get('ville')?.valid;
    return true;
  }

  // ── Recherche propriétaire ───────────────────────
  rechercherProp(): void {
    clearTimeout(this.timer2);
    const q = this.searchProp.trim();
    if (q.length < 2) { this.propResultats = []; this.showPropResults = false; return; }
    this.timer2 = setTimeout(() => {
      this.propSvc2.getAll(1, 10, q).subscribe({
        next: res => { this.propResultats = res.items ?? []; this.showPropResults = true; },
        error: () => { this.propResultats = []; }
      });
    }, 250);
  }

  onPropBlur(): void {
    setTimeout(() => {
      this.propFocused = false;
      if (!this.propSel) this.showPropResults = false;
    }, 200);
  }

  selectProp(p: ProprietaireListItemDto): void {
    this.propSel = p;
    this.searchProp = p.nomComplet;
    this.showPropResults = false;
  }

  clearProp(): void {
    this.propSel = null;
    this.searchProp = '';
    this.propResultats = [];
    this.showPropResults = false;
  }

  etapePrev(): void { this.etape.update(e => e - 1); }
  etapeNext(): void { if (this.peutContinuer()) this.etape.update(e => e + 1); }

  // ── Soumission ───────────────────────────────────
  soumettre(): void {
    if (!this.form.valid || !this.propSel) return;
    this.submitting.set(true);
    this.errorMsg.set('');

    const payload = { proprietaireId: this.propSel.id, ...this.form.value };
    this.svc.create(payload).subscribe({
      next: () => {
        this.submitting.set(false);
        this.successMsg.set('Propriété créée avec succès !');
        this.charger();
        setTimeout(() => this.fermerModal(), 1500);
      },
      error: (err: any) => {
        this.submitting.set(false);
        this.errorMsg.set(err?.error?.message ?? 'Une erreur est survenue. Réessayez.');
      }
    });
  }

  // ── Helpers ──────────────────────────────────────
  invalid(f: string): boolean {
    const c = this.form.get(f);
    return !!(c?.invalid && c?.touched);
  }

  initiales(nom: string): string {
    return (nom ?? '?').split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2);
  }
}