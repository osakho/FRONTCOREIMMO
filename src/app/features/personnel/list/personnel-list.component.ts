import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule }        from '@angular/common';
import { RouterLink }          from '@angular/router';
import { FormsModule }         from '@angular/forms';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { PersonnelService, ProprietesService } from '../../../core/services/api.services';
import { PersonnelListItemDto, ProprieteListItemDto, PagedList } from '../../../core/models/models';

@Component({
  selector: 'kdi-personnel-list',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, ReactiveFormsModule],
  template: `

<!-- ══ HERO HEADER ══ -->
<div class="hero">
  <div class="hero-glow"></div>
  <div class="hero-inner">
    <div class="hero-left">
      <div class="hero-icon">👥</div>
      <div>
        <h1 class="hero-title">Personnel</h1>
        <p class="hero-sub">Équipe KDI Immo — Collecteurs, Comptables, Assistantes…</p>
      </div>
    </div>
    <button class="btn-new" (click)="ouvrirModal()">＋ Nouveau membre</button>
  </div>
  <!-- KPIs -->
  <div class="hero-kpis">
    <div class="hk" *ngFor="let k of kpis()">
      <div class="hk-val">{{ k.val }}</div>
      <div class="hk-lbl">{{ k.lbl }}</div>
    </div>
  </div>
</div>

<!-- ══ FILTRES ══ -->
<div class="filters">
  <div class="search-wrap">
    <span>🔍</span>
    <input [(ngModel)]="search" placeholder="Rechercher un membre…" (ngModelChange)="onSearch()" />
    <button *ngIf="search" (click)="search='';onSearch()" class="clr">✕</button>
  </div>
  <div class="type-chips">
    <button class="chip" [class.active]="filtreType()===''"
            (click)="filtreType.set('')">Tous</button>
    <button *ngFor="let t of types" class="chip"
            [class.active]="filtreType()===t.val"
            (click)="filtreType.set(t.val)">
      {{ t.ico }} {{ t.lbl }}
    </button>
  </div>
  <div class="vue-toggle">
    <button class="vt-btn" [class.active]="vue()==='grille'" (click)="vue.set('grille')" title="Vue grille">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
        <rect x="1" y="1" width="6" height="6" rx="1.5"/><rect x="9" y="1" width="6" height="6" rx="1.5"/>
        <rect x="1" y="9" width="6" height="6" rx="1.5"/><rect x="9" y="9" width="6" height="6" rx="1.5"/>
      </svg>
    </button>
    <button class="vt-btn" [class.active]="vue()==='tableau'" (click)="vue.set('tableau')" title="Vue tableau">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
        <rect x="1" y="2" width="14" height="2.5" rx="1"/><rect x="1" y="6.75" width="14" height="2.5" rx="1"/>
        <rect x="1" y="11.5" width="14" height="2.5" rx="1"/>
      </svg>
    </button>
  </div>
</div>

<!-- ══ LOADING ══ -->
<div class="spinner-wrap" *ngIf="loading()">
  <div class="spinner"></div><span>Chargement…</span>
</div>

<!-- ══ GRILLE CARTES ══ -->
<div class="cards-grid" *ngIf="!loading() && affiches().length && vue()==='grille'">
  <div *ngFor="let p of affiches()" class="member-card"
       [class.inactive]="!p.estActif">
    <div class="mc-top">
      <div class="mc-avatar" [attr.data-type]="typeKey(p.typeLabel)">
        {{ initiales(p.nomComplet) }}
      </div>
      <div class="mc-status" [class.ok]="p.estActif"></div>
    </div>
    <div class="mc-nom">{{ p.nomComplet }}</div>
    <div class="mc-type-row">
      <span class="type-pill" [attr.data-t]="typeKey(p.typeLabel)">
        {{ typeIco(p.typeLabel) }} {{ p.typeLabel }}
      </span>
    </div>
    <div class="mc-poste">{{ p.poste }}</div>
    <div class="mc-footer">
      <span class="stat-dot" [class.ok]="p.estActif">
        {{ p.estActif ? '● Actif' : '● Inactif' }}
      </span>
      <div class="mc-actions">
        <button *ngIf="typeKey(p.typeLabel)==='collecteur'"
                class="mc-btn" title="Affecter propriété"
                (click)="affecterPropriete(p)">🏘️</button>
        <button class="mc-btn" title="Voir le profil"
                [routerLink]="['/personnel', p.id]">👁</button>
      </div>
    </div>
  </div>
</div>

<!-- ══ VUE TABLEAU ══ -->
<div class="table-card" *ngIf="!loading() && affiches().length && vue()==='tableau'">
  <table class="tbl">
    <thead>
      <tr>
        <th>Membre</th>
        <th>Fonction</th>
        <th>Poste</th>
        <th class="tc">Statut</th>
        <th class="tc">Actions</th>
      </tr>
    </thead>
    <tbody>
      <tr *ngFor="let p of affiches()" [class.row-inactive]="!p.estActif">
        <td>
          <div class="tbl-membre">
            <div class="tbl-avatar" [attr.data-type]="typeKey(p.typeLabel)">{{ initiales(p.nomComplet) }}</div>
            <div>
              <div class="tbl-nom">{{ p.nomComplet }}</div>
            </div>
          </div>
        </td>
        <td>
          <span class="type-pill" [attr.data-t]="typeKey(p.typeLabel)">
            {{ typeIco(p.typeLabel) }} {{ p.typeLabel }}
          </span>
        </td>
        <td class="tbl-poste">{{ p.poste }}</td>
        <td class="tc">
          <span class="stat-pill" [class.ok]="p.estActif">
            {{ p.estActif ? '● Actif' : '● Inactif' }}
          </span>
        </td>
        <td class="tc">
          <div class="tbl-acts">
            <button *ngIf="typeKey(p.typeLabel)==='collecteur'"
                    class="mc-btn" title="Affecter propriété"
                    (click)="affecterPropriete(p)">🏘️</button>
            <button class="mc-btn" title="Voir le profil"
                    [routerLink]="['/personnel', p.id]">👁</button>
          </div>
        </td>
      </tr>
    </tbody>
  </table>
</div>

<!-- ══ TABLE (vue alternative) ══ -->
<div class="table-card" *ngIf="!loading() && !affiches().length && !search && !filtreType()">
  <div class="empty">
    <div class="e-icon">👥</div>
    <div class="e-title">Aucun membre du personnel</div>
    <div class="e-sub">Cliquez sur "Nouveau membre" pour commencer</div>
    <button class="btn-new sm" (click)="ouvrirModal()">＋ Ajouter le premier</button>
  </div>
</div>

<div class="no-result" *ngIf="!loading() && !affiches().length && (search || filtreType())">
  <span>🔍</span> Aucun résultat pour ce filtre
</div>

<!-- ══════════════════════════════════════════════════
     MODAL AFFECTATION PROPRIÉTÉ
══════════════════════════════════════════════════ -->
<div class="ov" [class.open]="showAffect()" (click)="closeAffect($event)">
<div class="modal modal-affect" (click)="$event.stopPropagation()" *ngIf="collecteurActif()">
  <div class="mhd">
    <div class="mhd-l">
      <div class="mhd-ico">🏘️</div>
      <div>
        <div class="mhd-title">Affecter une propriété</div>
        <div class="mhd-sub">{{ collecteurActif()!.nomComplet }}</div>
      </div>
    </div>
    <button class="mhd-close" (click)="showAffect.set(false)">✕</button>
  </div>
  <div class="mbody">
    <!-- Collecteur info -->
    <div class="affect-collecteur">
      <div class="ac-avatar" [attr.data-type]="typeKey(collecteurActif()!.typeLabel)">
        {{ initiales(collecteurActif()!.nomComplet) }}
      </div>
      <div>
        <div class="ac-nom">{{ collecteurActif()!.nomComplet }}</div>
        <div class="ac-poste">{{ collecteurActif()!.poste }}</div>
      </div>
    </div>

    <!-- Recherche propriété -->
    <div class="affect-search">
      <span>🔍</span>
      <input [(ngModel)]="searchPropriete"
             (ngModelChange)="chargerProprietes()"
             placeholder="Rechercher une propriété…" />
    </div>

    <!-- Spinner propriétés -->
    <div class="affect-loading" *ngIf="loadingProprietes()">
      <div class="spinner sm"></div><span>Chargement…</span>
    </div>

    <!-- Liste propriétés -->
    <div class="proprietes-list" *ngIf="!loadingProprietes()">
      <div *ngIf="!proprietes().length" class="affect-empty">
        Aucune propriété disponible
      </div>
      <div *ngFor="let p of proprietes()"
           class="prop-row"
           [class.selected]="proprieteSelectee()===p.id"
           (click)="proprieteSelectee.set(p.id)">
        <div class="prop-sel-dot">
          <div class="dot-inner" [class.filled]="proprieteSelectee()===p.id"></div>
        </div>
        <div class="prop-info">
          <div class="prop-libelle">{{ p.libelle }}</div>
          <div class="prop-meta">
            <span class="prop-adr">📍 {{ p.adresse }}{{ p.quartier ? ' — '+p.quartier : '' }}</span>
            <span class="prop-owner">👤 {{ p.proprietaireNom }}</span>
          </div>
        </div>
        <div class="prop-stats">
          <span class="ps-chip" [class.libre]="p.nombreLibres>0">
            {{ p.nombreLibres }} libre{{ p.nombreLibres>1?'s':'' }}
          </span>
          <span class="ps-total">/ {{ p.nombreProduits }}</span>
        </div>
      </div>
    </div>

    <div class="banner ok" *ngIf="affectOk()">✅ {{ affectOk() }}</div>
    <div class="banner err" *ngIf="affectErr()">⚠️ {{ affectErr() }}</div>
  </div>
  <div class="mfoot">
    <button class="btn-ghost" (click)="showAffect.set(false)">Annuler</button>
    <button class="btn-submit"
            [disabled]="!proprieteSelectee() || affectant()"
            (click)="confirmerAffectation()">
      <span *ngIf="!affectant()">🏘️ Confirmer l'affectation</span>
      <span *ngIf="affectant()" class="sxs w"></span>
    </button>
  </div>
</div>
</div>

<!-- ══════════════════════════════════════════════════
     MODAL NOUVEAU MEMBRE
══════════════════════════════════════════════════ -->
<div class="ov" [class.open]="showModal()" (click)="onOvClick($event)">
<div class="modal" (click)="$event.stopPropagation()">

  <!-- Header -->
  <div class="mhd">
    <div class="mhd-l">
      <div class="mhd-ico">👤</div>
      <div>
        <div class="mhd-title">Nouveau membre du personnel</div>
        <div class="mhd-sub">Enregistrement d'un collaborateur</div>
      </div>
    </div>
    <button class="mhd-close" (click)="fermerModal()">✕</button>
  </div>

  <!-- Docs checklist -->
  <div class="docs-bar">
    <span class="db-lbl">📋 Documents requis :</span>
    <span class="doc-chip" [class.ok]="photoFile">📸 Photo identité</span>
    <span class="doc-chip" [class.ok]="docFile">🪪 Document officiel</span>
    <span class="doc-chip" [class.ok]="contratFile">📄 Contrat de travail</span>
  </div>

  <!-- Stepper -->
  <div class="stepper">
    <ng-container *ngFor="let s of steps; let i=index">
      <div class="step" [class.active]="etape===i" [class.done]="etape>i">
        <div class="step-dot">{{ etape>i ? '✓' : i+1 }}</div>
        <div class="step-lbl">{{ s }}</div>
      </div>
      <div class="step-line" [class.done]="etape>i" *ngIf="i<steps.length-1"></div>
    </ng-container>
  </div>

  <!-- Corps -->
  <div class="mbody" *ngIf="form" [formGroup]="form">

    <!-- Étape 0 : Identité -->
    <ng-container *ngIf="etape===0">
      <div class="step-title">👤 Identité & coordonnées</div>
      <div class="two-col">
        <div class="fg"><label>Prénom <span class="req">*</span></label>
          <input class="fc" formControlName="prenom" placeholder="Mohamed" />
          <span class="err" *ngIf="fi('prenom')">Obligatoire</span>
        </div>
        <div class="fg"><label>Nom <span class="req">*</span></label>
          <input class="fc" formControlName="nom" placeholder="Ould Ahmed" />
          <span class="err" *ngIf="fi('nom')">Obligatoire</span>
        </div>
        <div class="fg"><label>Date de naissance <span class="req">*</span></label>
          <input class="fc" type="date" formControlName="dateNaissance" />
        </div>
        <div class="fg"><label>Téléphone <span class="req">*</span></label>
          <input class="fc" formControlName="telephone" placeholder="+222 36…" />
          <span class="err" *ngIf="fi('telephone')">Obligatoire</span>
        </div>
        <div class="fg"><label>Email</label>
          <input class="fc" type="email" formControlName="email" placeholder="exemple@mail.com" />
        </div>
        <div class="fg"><label>Adresse</label>
          <input class="fc" formControlName="adresse" placeholder="Quartier, ville…" />
        </div>
      </div>
      <!-- Photo identité -->
      <div class="fg mt">
        <label>Photo d'identité <span class="req">*</span></label>
        <div class="upload-zone" (click)="photoIn.click()"
             (drop)="onDrop($event,'photo')" (dragover)="$event.preventDefault()"
             [class.has-file]="photoFile">
          <input #photoIn type="file" accept="image/*" style="display:none"
                 (change)="onFile($event,'photo')" />
          <img *ngIf="photoPreview" [src]="photoPreview" class="photo-prev" />
          <div *ngIf="!photoPreview" class="uz-ph">
            <span>📸</span><div>Cliquer ou glisser une photo ici</div>
            <div class="uz-hint">JPG, PNG — max 5 Mo</div>
          </div>
        </div>
      </div>
    </ng-container>

    <!-- Étape 1 : Document & Poste -->
    <ng-container *ngIf="etape===1">
      <div class="step-title">🪪 Document officiel</div>
      <div class="two-col">
        <div class="fg"><label>Type <span class="req">*</span></label>
          <select class="fc" formControlName="typeDocumentId">
            <option value="CarteNationaleIdentite">Carte nationale d'identité</option>
            <option value="Passeport">Passeport</option>
            <option value="CarteDeSejour">Carte de séjour</option>
          </select>
        </div>
        <div class="fg"><label>Numéro <span class="req">*</span></label>
          <input class="fc" formControlName="numeroDocument" placeholder="MR-001-2024" />
          <span class="err" *ngIf="fi('numeroDocument')">Obligatoire</span>
        </div>
      </div>
      <div class="fg mt">
        <label>Joindre le document <span class="req">*</span></label>
        <div class="upload-zone sm" (click)="docIn.click()" [class.has-file]="docFile">
          <input #docIn type="file" accept=".pdf,.jpg,.png" style="display:none"
                 (change)="onFile($event,'doc')" />
          <div class="uz-ph" *ngIf="!docFile"><span>📎</span><div>Cliquer pour joindre (PDF, JPG)</div></div>
          <div class="file-ok" *ngIf="docFile">✅ {{ docFile.name }}</div>
        </div>
      </div>

      <div class="sep">💼 Poste & contrat</div>
      <div class="two-col">
        <div class="fg"><label>Fonction <span class="req">*</span></label>
          <select class="fc" formControlName="typePersonnel">
            <option value="Comptable">🧾 Comptable</option>
            <option value="Collecteur">💼 Collecteur</option>
            <option value="ChargeTravaux">🔧 Chargé travaux</option>
            <option value="Menage">🧹 Ménage</option>
            <option value="Communication">📢 Communication</option>
            <option value="Assistante">👩‍💼 Assistante</option>
            <option value="Direction">👔 Direction</option>
          </select>
        </div>
        <div class="fg"><label>Intitulé du poste <span class="req">*</span></label>
          <input class="fc" formControlName="poste" placeholder="Collecteur terrain zone Nord" />
          <span class="err" *ngIf="fi('poste')">Obligatoire</span>
        </div>
        <div class="fg"><label>Date d'embauche <span class="req">*</span></label>
          <input class="fc" type="date" formControlName="dateEmbauche" />
        </div>
        <div class="fg"><label>Salaire de base (MRU)</label>
          <input class="fc" type="number" formControlName="salaireBase" placeholder="25 000" />
        </div>
      </div>
      <div class="fg mt">
        <label>Contrat de travail signé <span class="req">*</span></label>
        <div class="upload-zone sm" (click)="contratIn.click()" [class.has-file]="contratFile">
          <input #contratIn type="file" accept=".pdf" style="display:none"
                 (change)="onFile($event,'contrat')" />
          <div class="uz-ph" *ngIf="!contratFile"><span>📄</span><div>Joindre le contrat (PDF)</div></div>
          <div class="file-ok" *ngIf="contratFile">✅ {{ contratFile.name }}</div>
        </div>
      </div>
    </ng-container>

    <!-- Étape 2 : Récap -->
    <ng-container *ngIf="etape===2">
      <div class="step-title">✅ Récapitulatif</div>
      <div class="recap">
        <div class="recap-avatar" [attr.data-type]="typeKey(form.value.typePersonnel||'')">
          {{ initiales((form.value.prenom||'') + ' ' + (form.value.nom||'')) }}
        </div>
        <div class="recap-info">
          <div class="ri-nom">{{ form.value.prenom }} {{ form.value.nom }}</div>
          <div class="ri-sub">{{ typeIco(form.value.typePersonnel||'') }} {{ form.value.typePersonnel }} — {{ form.value.poste }}</div>
        </div>
      </div>
      <div class="recap-grid">
        <div class="rg-row"><span>Téléphone</span><strong>{{ form.value.telephone }}</strong></div>
        <div class="rg-row" *ngIf="form.value.email"><span>Email</span><strong>{{ form.value.email }}</strong></div>
        <div class="rg-row"><span>Document</span><strong>{{ form.value.numeroDocument }}</strong></div>
        <div class="rg-row"><span>Embauche</span><strong>{{ form.value.dateEmbauche }}</strong></div>
        <div class="rg-row" *ngIf="form.value.salaireBase"><span>Salaire</span><strong class="gold">{{ form.value.salaireBase | number }} MRU</strong></div>
      </div>
      <div class="docs-recap">
        <span class="dr-item" [class.ok]="photoFile">
          {{ photoFile ? '✅' : '❌' }} Photo identité
        </span>
        <span class="dr-item" [class.ok]="docFile">
          {{ docFile ? '✅' : '❌' }} Document officiel
        </span>
        <span class="dr-item" [class.ok]="contratFile">
          {{ contratFile ? '✅' : '❌' }} Contrat de travail
        </span>
      </div>
      <div class="banner ok" *ngIf="okMsg">✅ {{ okMsg }}</div>
      <div class="banner err" *ngIf="errMsg">⚠️ {{ errMsg }}</div>
    </ng-container>

  </div>

  <!-- Footer -->
  <div class="mfoot">
    <button class="btn-ghost" (click)="fermerModal()">Annuler</button>
    <div class="foot-r">
      <button class="btn-prev" *ngIf="etape>0" (click)="prevStep()">← Précédent</button>
      <button class="btn-next" *ngIf="etape<2" [disabled]="!peutContinuer()" (click)="nextStep()">
        Suivant →
      </button>
      <button class="btn-submit" *ngIf="etape===2"
              [disabled]="form.invalid || !photoFile || submitting()"
              (click)="submit()">
        <span *ngIf="!submitting()">👥 Enregistrer</span>
        <span *ngIf="submitting()" class="sxs w"></span>
      </button>
    </div>
  </div>

</div>
</div>
  `,
  styles: [`
    :host{--gold:#C9A84C;--gold-l:#E8C96A;--gold-d:#8B6914;--ink:#0D0D0D;--ink-mid:#1A1A2E;--ink-soft:#2D2D4A;--cream:#F8F4ED;--cream-dk:#EDE8DF;--muted:#8A8899;--ok:#1A7A4A;--ok-bg:#E6F5EE;--warn:#D4850A;--warn-bg:#FEF3E2;--danger:#C0392B;--danger-bg:#FDECEA;--blue:#1D4ED8;--r:14px}

    /* ── HERO ── */
    .hero{background:linear-gradient(135deg,#0c1a35 0%,#1e3a5f 55%,#0D1B2A 100%);border-radius:var(--r);margin-bottom:22px;position:relative;overflow:hidden}
    .hero-glow{position:absolute;inset:0;pointer-events:none;background:radial-gradient(ellipse at 15% 60%,rgba(201,168,76,.12) 0%,transparent 50%)}
    .hero-inner{position:relative;display:flex;align-items:center;justify-content:space-between;padding:24px 32px;gap:16px;flex-wrap:wrap}
    .hero-left{display:flex;align-items:center;gap:16px}
    .hero-icon{width:52px;height:52px;border-radius:14px;background:rgba(201,168,76,.15);border:2px solid rgba(201,168,76,.3);display:flex;align-items:center;justify-content:center;font-size:24px}
    .hero-title{font-size:24px;font-weight:900;color:#fff;font-family:'Playfair Display',Georgia,serif;margin:0 0 4px}
    .hero-sub{font-size:13px;color:rgba(255,255,255,.4);margin:0}
    .btn-new{padding:10px 22px;background:linear-gradient(135deg,var(--gold-d),var(--gold));color:#fff;border:none;border-radius:10px;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit;transition:all .18s;white-space:nowrap}
    .btn-new:hover{box-shadow:0 4px 16px rgba(201,168,76,.4)}
    .btn-new.sm{margin-top:14px;padding:8px 18px;font-size:13px}
    .hero-kpis{position:relative;display:flex;gap:0;border-top:1px solid rgba(255,255,255,.08);padding:0 32px}
    .hk{flex:1;padding:14px 0;text-align:center;border-right:1px solid rgba(255,255,255,.07)}
    .hk:last-child{border:none}
    .hk-val{font-size:22px;font-weight:800;color:var(--gold-l);font-family:'Playfair Display',Georgia,serif}
    .hk-lbl{font-size:10.5px;font-weight:700;text-transform:uppercase;letter-spacing:.6px;color:rgba(255,255,255,.3);margin-top:2px}

    /* ── FILTRES ── */
    .filters{display:flex;align-items:center;justify-content:space-between;margin-bottom:18px;gap:12px;flex-wrap:wrap}
    .search-wrap{display:flex;align-items:center;gap:8px;background:#fff;border:1.5px solid var(--cream-dk);border-radius:10px;padding:8px 13px;min-width:220px;transition:border-color .18s}
    .search-wrap:focus-within{border-color:var(--gold)}
    .search-wrap span{font-size:14px;flex-shrink:0}
    .search-wrap input{border:none;outline:none;font-size:13px;font-family:inherit;color:var(--ink-mid);flex:1;background:transparent}
    .search-wrap input::placeholder{color:var(--muted)}
    .clr{background:none;border:none;cursor:pointer;color:var(--muted);font-size:13px;line-height:1;padding:0}
    .type-chips{display:flex;gap:8px;flex-wrap:wrap}
    .chip{padding:6px 13px;border-radius:20px;font-size:12px;font-weight:600;cursor:pointer;border:1.5px solid var(--cream-dk);background:#fff;color:var(--muted);font-family:inherit;transition:all .15s}
    .chip.active{background:var(--ink-mid);color:var(--gold-l);border-color:var(--ink-mid)}
    .chip:not(.active):hover{border-color:var(--gold)}

    /* ── CARDS GRILLE ── */
    .cards-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:16px}
    .member-card{background:#fff;border-radius:var(--r);padding:20px 18px 16px;box-shadow:0 2px 12px rgba(0,0,0,.07);border:1.5px solid var(--cream-dk);transition:all .18s;cursor:default;display:flex;flex-direction:column;gap:8px}
    .member-card:hover{box-shadow:0 6px 24px rgba(0,0,0,.1);border-color:rgba(201,168,76,.35);transform:translateY(-2px)}
    .member-card.inactive{opacity:.6}
    .mc-top{display:flex;align-items:center;justify-content:space-between}
    .mc-avatar{width:48px;height:48px;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:17px;font-weight:800;font-family:'Playfair Display',Georgia,serif;flex-shrink:0}
    .mc-avatar[data-type="collecteur"]{background:rgba(212,133,10,.12);color:var(--warn)}
    .mc-avatar[data-type="comptable"]{background:rgba(29,78,216,.1);color:var(--blue)}
    .mc-avatar[data-type="direction"]{background:rgba(201,168,76,.15);color:var(--gold-d)}
    .mc-avatar[data-type="assistante"]{background:rgba(91,33,182,.1);color:#5B21B6}
    .mc-avatar[data-type="chargetravaux"]{background:rgba(192,57,43,.08);color:var(--danger)}
    .mc-avatar[data-type="menage"]{background:rgba(26,122,74,.1);color:var(--ok)}
    .mc-avatar[data-type="communication"]{background:rgba(6,182,212,.1);color:#0891b2}
    .mc-avatar[data-type=""]{background:var(--cream);color:var(--muted)}
    .mc-status{width:10px;height:10px;border-radius:50%;background:#e2e8f0}
    .mc-status.ok{background:#22c55e}
    .mc-nom{font-size:14.5px;font-weight:800;color:var(--ink-mid);line-height:1.2}
    .mc-type-row{display:flex}
    .type-pill{display:inline-flex;padding:3px 10px;border-radius:20px;font-size:11.5px;font-weight:700}
    .type-pill[data-t="collecteur"]{background:var(--warn-bg);color:var(--warn)}
    .type-pill[data-t="comptable"]{background:var(--blue-bg,#DBEAFE);color:var(--blue)}
    .type-pill[data-t="direction"]{background:rgba(201,168,76,.15);color:var(--gold-d)}
    .type-pill[data-t="assistante"]{background:#F5F3FF;color:#5B21B6}
    .type-pill[data-t="chargetravaux"]{background:var(--danger-bg,#FDECEA);color:var(--danger)}
    .type-pill[data-t="menage"]{background:var(--ok-bg);color:var(--ok)}
    .type-pill[data-t="communication"]{background:#ECFEFF;color:#0891b2}
    .mc-poste{font-size:12px;color:var(--muted);flex:1}
    .mc-footer{display:flex;align-items:center;justify-content:space-between;padding-top:8px;border-top:1px solid var(--cream-dk);margin-top:4px}
    .stat-dot{font-size:11.5px;font-weight:700;color:var(--muted)}
    .stat-dot.ok{color:var(--ok)}
    .mc-actions{display:flex;gap:6px}
    .mc-btn{width:28px;height:28px;border-radius:7px;background:var(--cream);border:1px solid var(--cream-dk);cursor:pointer;font-size:13px;display:flex;align-items:center;justify-content:center;text-decoration:none;transition:all .14s;color:var(--ink-soft)}
    .mc-btn:hover{background:var(--ink-mid);color:var(--gold-l)}

    /* ── VIDE ── */
    .table-card{background:#fff;border-radius:var(--r);box-shadow:0 2px 10px rgba(0,0,0,.07);border:1.5px solid var(--cream-dk)}
    .empty{text-align:center;padding:70px 20px;display:flex;flex-direction:column;align-items:center}
    .e-icon{font-size:52px;margin-bottom:14px}
    .e-title{font-size:18px;font-weight:700;color:var(--ink-mid);margin-bottom:6px}
    .e-sub{font-size:13px;color:var(--muted);margin-bottom:0}
    .no-result{text-align:center;padding:40px;font-size:14px;color:var(--muted)}
    .spinner-wrap{display:flex;align-items:center;justify-content:center;gap:12px;padding:60px;color:var(--muted);font-size:14px}
    .spinner{width:28px;height:28px;border:3px solid var(--cream-dk);border-top-color:var(--ink-mid);border-radius:50%;animation:spin .8s linear infinite}
    @keyframes spin{to{transform:rotate(360deg)}}
    .sxs{width:14px;height:14px;border:2px solid rgba(0,0,0,.15);border-top-color:currentColor;border-radius:50%;animation:spin .7s linear infinite;display:inline-block}
    .sxs.w{border-color:rgba(255,255,255,.3);border-top-color:#fff}

    /* ── MODAL ── */
    .ov{position:fixed;inset:0;background:rgba(13,13,13,.6);backdrop-filter:blur(4px);z-index:1000;display:flex;align-items:center;justify-content:center;padding:20px;opacity:0;pointer-events:none;transition:opacity .22s}
    .ov.open{opacity:1;pointer-events:all}
    .modal{background:#fff;border-radius:18px;width:100%;max-width:580px;max-height:90vh;box-shadow:0 24px 80px rgba(13,13,13,.22),0 0 0 1px rgba(201,168,76,.1);display:flex;flex-direction:column;overflow:hidden;transform:translateY(16px) scale(.97);transition:transform .25s}
    .ov.open .modal{transform:translateY(0) scale(1)}
    .mhd{padding:20px 24px 14px;background:linear-gradient(135deg,var(--ink-mid),var(--ink-soft));display:flex;align-items:center;justify-content:space-between;flex-shrink:0}
    .mhd-l{display:flex;align-items:center;gap:12px}
    .mhd-ico{width:42px;height:42px;border-radius:11px;background:rgba(201,168,76,.18);border:1.5px solid rgba(201,168,76,.3);display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0}
    .mhd-title{font-size:16px;font-weight:700;color:var(--gold-l);font-family:'Playfair Display',Georgia,serif}
    .mhd-sub{font-size:11.5px;color:rgba(255,255,255,.4);margin-top:2px}
    .mhd-close{width:30px;height:30px;border-radius:7px;border:none;background:rgba(255,255,255,.1);color:rgba(255,255,255,.6);font-size:13px;cursor:pointer;display:flex;align-items:center;justify-content:center}
    .mhd-close:hover{background:rgba(192,57,43,.3);color:#fff}
    .docs-bar{display:flex;align-items:center;gap:8px;background:rgba(255,251,235,.9);border-bottom:1px solid #fde68a;padding:10px 24px;font-size:12px;flex-shrink:0;flex-wrap:wrap}
    .db-lbl{font-weight:700;color:var(--warn);font-size:12px}
    .doc-chip{padding:3px 10px;border-radius:20px;background:#e0e7ef;color:#475569;font-size:11.5px;font-weight:600;transition:all .2s}
    .doc-chip.ok{background:rgba(26,122,74,.15);color:var(--ok)}
    .stepper{display:flex;align-items:center;padding:12px 24px 8px;background:var(--cream);border-bottom:1px solid var(--cream-dk);flex-shrink:0}
    .step{display:flex;flex-direction:column;align-items:center;gap:4px;flex:1}
    .step-dot{width:26px;height:26px;border-radius:50%;background:#fff;border:2px solid var(--cream-dk);display:flex;align-items:center;justify-content:center;font-size:11.5px;font-weight:700;color:var(--muted);transition:all .2s}
    .step.active .step-dot{background:var(--gold);border-color:var(--gold);color:#fff;box-shadow:0 0 0 4px rgba(201,168,76,.2)}
    .step.done  .step-dot{background:var(--ok);border-color:var(--ok);color:#fff}
    .step-lbl{font-size:10.5px;font-weight:600;color:var(--muted)}
    .step-line{flex:1;height:2px;background:var(--cream-dk);margin:0 4px 14px;border-radius:2px;transition:background .3s}
    .step-line.done{background:var(--ok)}
    .mbody{flex:1;overflow-y:auto;padding:20px 24px}
    .mbody::-webkit-scrollbar{width:4px}
    .mbody::-webkit-scrollbar-thumb{background:var(--cream-dk);border-radius:4px}
    .step-title{font-size:13px;font-weight:700;color:var(--ink-soft);margin-bottom:16px;padding-bottom:10px;border-bottom:1px solid var(--cream-dk)}
    .two-col{display:grid;grid-template-columns:1fr 1fr;gap:13px}
    .fg{display:flex;flex-direction:column;gap:5px}
    .fg.mt{margin-top:6px}
    label{font-size:12px;font-weight:700;color:var(--ink-soft)}
    .req{color:var(--danger)}.err{font-size:11.5px;color:var(--danger);font-weight:600}
    .fc{padding:10px 12px;border:1.5px solid var(--cream-dk);border-radius:9px;font-size:13px;font-family:inherit;outline:none;transition:border-color .18s;background:#fff;width:100%;box-sizing:border-box;color:var(--ink-mid)}
    .fc:focus{border-color:var(--gold);box-shadow:0 0 0 3px rgba(201,168,76,.1)}
    .fc::placeholder{color:#c0bcc8}
    .upload-zone{border:2px dashed var(--cream-dk);border-radius:10px;padding:20px;text-align:center;cursor:pointer;transition:all .18s}
    .upload-zone.sm{padding:12px}
    .upload-zone:hover,.upload-zone.has-file{border-color:var(--ok);background:rgba(26,122,74,.04)}
    .uz-ph{display:flex;flex-direction:column;align-items:center;gap:6px;color:var(--muted);font-size:13px}
    .uz-ph span{font-size:28px}
    .uz-hint{font-size:11.5px;color:#c0bcc8}
    .photo-prev{max-height:120px;border-radius:8px}
    .file-ok{font-size:13px;color:var(--ok);font-weight:600}
    .sep{font-size:12.5px;font-weight:700;color:var(--ink-soft);padding:14px 0 10px;border-top:1px solid var(--cream-dk);margin-top:6px}
    /* Recap */
    .recap{display:flex;align-items:center;gap:14px;margin-bottom:16px;padding:14px;background:var(--cream);border-radius:10px}
    .recap-avatar{width:50px;height:50px;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:800;font-family:'Playfair Display',Georgia,serif;flex-shrink:0}
    .recap-avatar[data-type="Collecteur"]{background:rgba(212,133,10,.12);color:var(--warn)}
    .recap-avatar[data-type="Comptable"]{background:rgba(29,78,216,.1);color:var(--blue)}
    .recap-avatar[data-type="Direction"]{background:rgba(201,168,76,.15);color:var(--gold-d)}
    .recap-avatar[data-type="Assistante"]{background:#F5F3FF;color:#5B21B6}
    .recap-avatar[data-type=""]{background:var(--cream-dk);color:var(--muted)}
    .ri-nom{font-size:16px;font-weight:800;color:var(--ink-mid);font-family:'Playfair Display',Georgia,serif}
    .ri-sub{font-size:12px;color:var(--muted);margin-top:3px}
    .recap-grid{display:flex;flex-direction:column;gap:0}
    .rg-row{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--cream-dk);font-size:13px}
    .rg-row:last-child{border:none}
    .rg-row span{color:var(--muted);font-size:12px}
    .rg-row strong{color:var(--ink-mid);font-weight:600}
    .rg-row strong.gold{color:var(--gold-d)}
    .docs-recap{display:flex;gap:10px;margin-top:14px;flex-wrap:wrap}
    .dr-item{padding:5px 12px;border-radius:20px;font-size:12px;font-weight:600;background:var(--danger-bg);color:var(--danger)}
    .dr-item.ok{background:var(--ok-bg);color:var(--ok)}
    .banner{border-radius:9px;padding:11px 14px;font-size:13px;font-weight:600;margin-top:10px}
    .banner.ok{background:var(--ok-bg);color:var(--ok);border:1px solid var(--ok)}
    .banner.err{background:var(--danger-bg);color:var(--danger);border:1px solid var(--danger)}
    /* Footer */
    .mfoot{padding:14px 24px;border-top:1px solid var(--cream-dk);background:var(--cream);display:flex;align-items:center;justify-content:space-between;flex-shrink:0}
    .foot-r{display:flex;gap:9px}
    .btn-ghost{background:none;border:none;cursor:pointer;font-size:13px;color:var(--muted);padding:8px 2px;font-family:inherit}
    .btn-ghost:hover{color:var(--danger)}
    .btn-prev{padding:8px 16px;border-radius:8px;background:#fff;color:var(--ink-soft);border:1.5px solid var(--cream-dk);font-size:13px;font-weight:600;cursor:pointer;font-family:inherit}
    .btn-next{padding:8px 20px;border-radius:8px;background:var(--ink-mid);color:var(--gold-l);border:none;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit;transition:all .18s}
    .btn-next:disabled{opacity:.35;cursor:not-allowed}
    .btn-submit{padding:8px 22px;border-radius:8px;background:linear-gradient(135deg,var(--gold-d),var(--gold));color:#fff;border:none;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit;min-width:150px;display:flex;align-items:center;justify-content:center;gap:7px}
    .btn-submit:disabled{opacity:.4;cursor:not-allowed}

    /* ── VUE TOGGLE ── */
    .vue-toggle{display:flex;gap:2px;background:var(--cream);border:1.5px solid var(--cream-dk);border-radius:9px;padding:3px}
    .vt-btn{width:32px;height:32px;border:none;background:none;border-radius:6px;cursor:pointer;color:var(--muted);display:flex;align-items:center;justify-content:center;transition:all .15s}
    .vt-btn.active{background:#fff;color:var(--ink-mid);box-shadow:0 1px 4px rgba(0,0,0,.1)}
    .vt-btn:hover:not(.active){color:var(--ink-mid)}
    /* ── TABLE VIEW ── */
    .tbl{width:100%;border-collapse:collapse}
    .tbl th{padding:11px 16px;font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.5px;color:var(--muted);background:var(--cream);border-bottom:1.5px solid var(--cream-dk);text-align:left;white-space:nowrap}
    .tbl td{padding:12px 16px;font-size:13.5px;color:var(--ink-soft);border-bottom:1px solid var(--cream-dk);vertical-align:middle}
    .tbl tr:last-child td{border:none}
    .tbl tbody tr{transition:background .12s}
    .tbl tbody tr:hover td{background:rgba(201,168,76,.03)}
    .tbl tbody tr.row-inactive td{opacity:.55}
    .tbl-membre{display:flex;align-items:center;gap:10px}
    .tbl-avatar{width:36px;height:36px;border-radius:9px;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:800;font-family:'Playfair Display',Georgia,serif;flex-shrink:0}
    .tbl-avatar[data-type="collecteur"]{background:rgba(212,133,10,.12);color:var(--warn)}
    .tbl-avatar[data-type="comptable"]{background:rgba(29,78,216,.1);color:var(--blue)}
    .tbl-avatar[data-type="direction"]{background:rgba(201,168,76,.15);color:var(--gold-d)}
    .tbl-avatar[data-type="assistante"]{background:#F5F3FF;color:#5B21B6}
    .tbl-avatar[data-type="chargetravaux"]{background:rgba(192,57,43,.08);color:var(--danger)}
    .tbl-avatar[data-type="menage"]{background:rgba(26,122,74,.1);color:var(--ok)}
    .tbl-avatar[data-type="communication"]{background:rgba(6,182,212,.1);color:#0891b2}
    .tbl-nom{font-weight:700;color:var(--ink-mid);font-size:13.5px}
    .tbl-poste{color:var(--muted);font-size:13px}
    .tc{text-align:center}
    .tbl-acts{display:flex;gap:6px;justify-content:center}
    .stat-pill{font-size:12px;font-weight:700;color:var(--muted)}
    .stat-pill.ok{color:var(--ok)}
    /* ── MODAL AFFECTATION ── */
    .modal-affect{max-width:540px}
    .affect-collecteur{display:flex;align-items:center;gap:12px;padding:12px 14px;background:var(--cream);border-radius:10px;margin-bottom:16px}
    .ac-avatar{width:40px;height:40px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:15px;font-weight:800;font-family:'Playfair Display',Georgia,serif;flex-shrink:0;background:rgba(212,133,10,.12);color:var(--warn)}
    .ac-nom{font-weight:700;color:var(--ink-mid);font-size:14px}
    .ac-poste{font-size:12px;color:var(--muted);margin-top:2px}
    .affect-search{display:flex;align-items:center;gap:8px;background:#fff;border:1.5px solid var(--cream-dk);border-radius:9px;padding:9px 13px;margin-bottom:12px;transition:border-color .18s}
    .affect-search:focus-within{border-color:var(--gold)}
    .affect-search span{font-size:14px;flex-shrink:0}
    .affect-search input{border:none;outline:none;font-size:13px;font-family:inherit;color:var(--ink-mid);flex:1;background:transparent}
    .affect-search input::placeholder{color:var(--muted)}
    .affect-loading{display:flex;align-items:center;gap:10px;padding:20px;color:var(--muted);font-size:13px;justify-content:center}
    .spinner.sm{width:18px;height:18px;border-width:2px}
    .proprietes-list{display:flex;flex-direction:column;gap:6px;max-height:300px;overflow-y:auto}
    .proprietes-list::-webkit-scrollbar{width:4px}
    .proprietes-list::-webkit-scrollbar-thumb{background:var(--cream-dk);border-radius:4px}
    .affect-empty{text-align:center;padding:30px;color:var(--muted);font-size:13px}
    .prop-row{display:flex;align-items:center;gap:12px;padding:12px 14px;border:1.5px solid var(--cream-dk);border-radius:10px;cursor:pointer;transition:all .15s;background:#fff}
    .prop-row:hover{border-color:rgba(201,168,76,.4);background:rgba(201,168,76,.03)}
    .prop-row.selected{border-color:var(--gold);background:rgba(201,168,76,.06)}
    .prop-sel-dot{width:18px;height:18px;border-radius:50%;border:2px solid var(--cream-dk);display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:border-color .15s}
    .prop-row.selected .prop-sel-dot{border-color:var(--gold)}
    .dot-inner{width:9px;height:9px;border-radius:50%;background:transparent;transition:background .15s}
    .prop-row.selected .dot-inner{background:var(--gold)}
    .prop-info{flex:1;min-width:0}
    .prop-libelle{font-weight:700;color:var(--ink-mid);font-size:13.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .prop-meta{display:flex;gap:10px;flex-wrap:wrap;margin-top:3px}
    .prop-adr,.prop-owner{font-size:11.5px;color:var(--muted)}
    .prop-stats{display:flex;align-items:center;gap:4px;flex-shrink:0}
    .ps-chip{padding:3px 9px;border-radius:20px;font-size:11.5px;font-weight:700;background:var(--cream-dk);color:var(--muted)}
    .ps-chip.libre{background:var(--ok-bg);color:var(--ok)}
    .ps-total{font-size:11.5px;color:var(--muted)}
    @media(max-width:700px){.cards-grid{grid-template-columns:1fr 1fr}.two-col{grid-template-columns:1fr}.hero-kpis{display:grid;grid-template-columns:repeat(2,1fr)}}
    @media(max-width:500px){.cards-grid{grid-template-columns:1fr}}
  `]
})
export class PersonnelListComponent implements OnInit {
  private svc      = inject(PersonnelService);
  private propSvc  = inject(ProprietesService);
  private fb       = inject(FormBuilder);

  liste       = signal<PersonnelListItemDto[]>([]);
  loading     = signal(true);
  filtreType  = signal('');
  vue         = signal<'grille'|'tableau'>('grille');
  search      = '';

  showModal   = signal(false);
  submitting  = signal(false);
  etape       = 0;
  steps       = ['Identité', 'Document & Poste', 'Récapitulatif'];
  form!: ReturnType<typeof this.buildForm>;

  photoFile:   File | null = null;
  docFile:     File | null = null;
  contratFile: File | null = null;
  photoPreview: string | null = null;
  okMsg  = '';
  errMsg = '';

  // ── Affectation ──────────────────────────────────────────────
  showAffect        = signal(false);
  collecteurActif   = signal<PersonnelListItemDto | null>(null);
  proprietes        = signal<ProprieteListItemDto[]>([]);
  proprieteSelectee = signal('');
  loadingProprietes = signal(false);
  affectant         = signal(false);
  affectOk          = signal('');
  affectErr         = signal('');
  searchPropriete   = '';

  types = [
    { val:'Collecteur',    lbl:'Collecteur',    ico:'💼' },
    { val:'Comptable',     lbl:'Comptable',     ico:'🧾' },
    { val:'Direction',     lbl:'Direction',     ico:'👔' },
    { val:'Assistante',    lbl:'Assistante',    ico:'👩‍💼' },
    { val:'ChargeTravaux', lbl:'Travaux',       ico:'🔧' },
    { val:'Menage',        lbl:'Ménage',        ico:'🧹' },
    { val:'Communication', lbl:'Communication', ico:'📢' },
  ];

  affiches = computed(() => {
    let l = [...this.liste()];
    if (this.filtreType()) l = l.filter(p => p.typeLabel === this.filtreType());
    if (this.search.trim()) {
      const q = this.search.toLowerCase();
      l = l.filter(p => p.nomComplet.toLowerCase().includes(q) ||
                        p.poste?.toLowerCase().includes(q));
    }
    return l;
  });

  kpis = computed(() => {
    const l = this.liste();
    const actifs = l.filter(p => p.estActif).length;
    const collect = l.filter(p => p.typeLabel === 'Collecteur').length;
    return [
      { val: l.length,   lbl: 'Membres' },
      { val: actifs,     lbl: 'Actifs' },
      { val: collect,    lbl: 'Collecteurs' },
      { val: l.filter(p => p.typeLabel === 'Comptable' || p.typeLabel === 'Direction').length, lbl: 'Management' },
    ];
  });

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    this.svc.getAll().subscribe({
      next:  r => { this.liste.set(r.items); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  onSearch() { /* signal computed réagit automatiquement */ }

  // ── Modal ────────────────────────────────────────────────────
  ouvrirModal() {
    this.form = this.buildForm();
    this.photoFile = this.docFile = this.contratFile = null;
    this.photoPreview = null;
    this.etape = 0; this.okMsg = ''; this.errMsg = '';
    this.showModal.set(true);
  }
  fermerModal() { this.showModal.set(false); }
  onOvClick(e: Event) { if ((e.target as HTMLElement).classList.contains('ov')) this.fermerModal(); }

  prevStep() { if (this.etape > 0) this.etape--; }
  nextStep()  { if (this.etape < 2) this.etape++; }

  peutContinuer(): boolean {
    if (this.etape === 0)
      return ['prenom','nom','dateNaissance','telephone'].every(f => this.form.get(f)?.valid);
    if (this.etape === 1)
      return this.form.get('typeDocumentId')!.valid &&
             this.form.get('numeroDocument')!.valid &&
             this.form.get('typePersonnel')!.valid &&
             this.form.get('poste')!.valid;
    return true;
  }

  fi(f: string) { const c = this.form.get(f); return !!(c?.invalid && c?.touched); }

  // ── Upload ───────────────────────────────────────────────────
  onFile(e: Event, target: 'photo' | 'doc' | 'contrat') {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    if (target === 'photo') {
      this.photoFile = file;
      const r = new FileReader();
      r.onload = ev => this.photoPreview = ev.target?.result as string;
      r.readAsDataURL(file);
    } else if (target === 'doc')    { this.docFile = file; }
    else                             { this.contratFile = file; }
  }

  onDrop(e: DragEvent, target: 'photo' | 'doc' | 'contrat') {
    e.preventDefault();
    const file = e.dataTransfer?.files[0];
    if (!file) return;
    const fakeEvent = { target: { files: [file] } } as any;
    this.onFile(fakeEvent, target);
  }

  // ── Submit ───────────────────────────────────────────────────
  submit() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.submitting.set(true);
    const fd = new FormData();
    Object.entries(this.form.value).forEach(([k, v]) => {
      if (v !== null && v !== undefined && v !== '') fd.append(k, String(v));
    });
    if (this.photoFile)   fd.append('photoIdentite', this.photoFile);
    if (this.docFile)     fd.append('docIdentite', this.docFile);
    if (this.contratFile) fd.append('contratTravail', this.contratFile);

    this.svc.create(fd).subscribe({
      next: () => {
        this.submitting.set(false);
        this.okMsg = 'Membre enregistré avec succès !';
        this.load();
        setTimeout(() => this.fermerModal(), 1400);
      },
      error: (e: any) => {
        this.submitting.set(false);
        this.errMsg = e?.error?.message ?? 'Une erreur est survenue.';
      }
    });
  }

  // ── Helpers ──────────────────────────────────────────────────
  typeIco(t: string) {
    const m: Record<string,string> = {
      Comptable:'🧾', Collecteur:'💼', ChargeTravaux:'🔧',
      Menage:'🧹', Communication:'📢', Assistante:'👩‍💼', Direction:'👔'
    };
    return m[t] ?? '👤';
  }

  typeKey(t: string): string { return (t || '').toLowerCase().replace(/\s/g,''); }

  initiales(nom: string): string {
    return nom.trim().split(' ').filter(Boolean).slice(0,2).map(w => w[0]).join('').toUpperCase();
  }

  affecterPropriete(p: PersonnelListItemDto) {
    this.collecteurActif.set(p);
    this.proprieteSelectee.set('');
    this.affectOk.set(''); this.affectErr.set('');
    this.searchPropriete = '';
    this.showAffect.set(true);
    this.chargerProprietes();
  }

  closeAffect(e: Event) {
    if ((e.target as HTMLElement).classList.contains('ov')) this.showAffect.set(false);
  }

  chargerProprietes() {
    this.loadingProprietes.set(true);
    this.propSvc.getAll(1, 50, this.searchPropriete || undefined).subscribe({
      next: r => { this.proprietes.set(r.items); this.loadingProprietes.set(false); },
      error: () => this.loadingProprietes.set(false)
    });
  }

  confirmerAffectation() {
    const col  = this.collecteurActif();
    const prop = this.proprieteSelectee();
    if (!col || !prop) return;
    this.affectant.set(true);
    const dateDebut = new Date().toISOString().substring(0, 10);
    this.svc.affecterPropriete(col.id, prop, dateDebut).subscribe({
      next: () => {
        this.affectant.set(false);
        this.affectOk.set('Affectation enregistrée avec succès !');
        setTimeout(() => this.showAffect.set(false), 1400);
      },
      error: (e: any) => {
        this.affectant.set(false);
        this.affectErr.set(e?.error?.message ?? "Erreur lors de l'affectation.");
      }
    });
  }

  private buildForm() {
    return this.fb.group({
      nom:            ['', Validators.required],
      prenom:         ['', Validators.required],
      dateNaissance:  ['', Validators.required],
      adresse:        [''],
      telephone:      ['', Validators.required],
      email:          ['', Validators.email],
      typeDocumentId: ['CarteNationaleIdentite', Validators.required],
      numeroDocument: ['', Validators.required],
      typePersonnel:  ['Collecteur', Validators.required],
      poste:          ['', Validators.required],
      dateEmbauche:   [new Date().toISOString().substring(0,10), Validators.required],
      salaireBase:    [null as number|null]
    });
  }
}