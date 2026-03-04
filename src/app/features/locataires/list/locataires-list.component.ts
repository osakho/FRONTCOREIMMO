import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule, DatePipe }            from '@angular/common';
import { RouterLink }                         from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { HttpClient }                         from '@angular/common/http';
import { LocatairesService }                  from '../../../core/services/api.services';
import { LocataireListItemDto, PagedList }    from '../../../core/models/models';

@Component({
  selector: 'kdi-locataires-list',
  standalone: true,
  imports: [CommonModule, DatePipe, RouterLink, FormsModule, ReactiveFormsModule],
  template: `

<!-- ══════════════════════════════════════════════
     PAGE
══════════════════════════════════════════════ -->
<div class="page">

  <!-- ── En-tête ── -->
  <div class="page-header">
    <div>
      <h2 class="page-title">Locataires</h2>
      <p class="page-sub">
        <span class="stat-pill">{{ liste().totalCount }} au total</span>
        <span class="stat-pill ok">{{ nbActifs() }} actifs</span>
        <span class="stat-pill warn">{{ nbAJour() }} à jour</span>
      </p>
    </div>
    <button class="btn-add" (click)="ouvrirCreation()">＋ Nouveau locataire</button>
  </div>

  <!-- ── Filtres ── -->
  <div class="filter-bar">
    <div class="search-wrap">
      <span class="si">🔍</span>
      <input type="text" placeholder="Nom, téléphone, email…"
             [(ngModel)]="searchTerm" (ngModelChange)="onSearch()" />
      <span *ngIf="searchTerm" class="clear-x" (click)="clearSearch()">✕</span>
    </div>
    <div class="chips">
      <button class="chip" [class.active]="filtreActif===''"     (click)="setFiltre('')">Tous</button>
      <button class="chip" [class.active]="filtreActif==='true'" (click)="setFiltre('true')">Actifs</button>
      <button class="chip" [class.active]="filtreActif==='false'"(click)="setFiltre('false')">Inactifs</button>
    </div>
    <div class="view-toggle">
      <button [class.vt-active]="vue==='liste'"  (click)="vue='liste'"  title="Liste">☰</button>
      <button [class.vt-active]="vue==='cartes'" (click)="vue='cartes'" title="Cartes">⊞</button>
    </div>
  </div>

  <!-- ══════════════════════════════════
       VUE LISTE
  ══════════════════════════════════ -->
  <div class="table-card" *ngIf="vue==='liste' && liste().items.length && !loading()">
    <table>
      <thead>
        <tr>
          <th>Locataire</th>
          <th>Téléphone</th>
          <th>Email</th>
          <th class="r">Baux actifs</th>
          <th class="c">Paiement</th>
          <th class="c">Statut</th>
          <th class="c">Inscrit le</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        <tr *ngFor="let l of liste().items">
          <td>
            <div class="cell-locataire">
              <div class="avatar" [style.background]="avatarColor(l.nomComplet)">
                {{ initiales(l.nomComplet) }}
              </div>
              <div>
                <div class="l-nom">{{ l.nomComplet }}</div>
                <div class="l-meta" *ngIf="l.nbContratsActifs > 0">
                  {{ l.nbContratsActifs }} bail{{ l.nbContratsActifs > 1 ? 's' : '' }} actif{{ l.nbContratsActifs > 1 ? 's' : '' }}
                </div>
              </div>
            </div>
          </td>
          <td class="mono">{{ l.telephone }}</td>
          <td class="muted sm">{{ l.email || '—' }}</td>
          <td class="r">
            <span class="badge-num" [class.blue]="l.nbContratsActifs > 0">
              {{ l.nbContratsActifs }}
            </span>
          </td>
          <td class="c">
            <div class="paiement-badge" [class.vert]="estAJour(l)" [class.rouge]="!estAJour(l) && l.nbContratsActifs > 0" [class.gris]="l.nbContratsActifs === 0">
              <span class="paiement-dot"></span>
              <span *ngIf="l.nbContratsActifs === 0">—</span>
              <span *ngIf="l.nbContratsActifs > 0 && estAJour(l)">À jour</span>
              <span *ngIf="l.nbContratsActifs > 0 && !estAJour(l)">En retard</span>
            </div>
          </td>
          <td class="c">
            <span class="badge-statut" [class.ok]="l.estActif" [class.off]="!l.estActif">
              {{ l.estActif ? 'Actif' : 'Inactif' }}
            </span>
          </td>
          <td class="c muted sm">{{ l.creeLe | date:'dd/MM/yyyy' }}</td>
          <td>
            <div class="row-actions">
              <a [routerLink]="['/locataires', l.id]" class="ra-btn ra-labeled" title="Voir le dossier">
                👁 <span>Dossier</span>
              </a>
              <a [routerLink]="['/locataires', l.id, 'paiements']"
                 class="ra-btn ra-labeled ra-blue" title="Historique des paiements">
                💳 <span>Paiements</span>
              </a>
              <button class="ra-btn ra-del"
                      [disabled]="l.nbContratsActifs > 0"
                      [title]="l.nbContratsActifs > 0 ? 'Bail actif en cours' : 'Supprimer'"
                      (click)="supprimer(l.id, l.nomComplet)">🗑</button>
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  </div>

  <!-- ══════════════════════════════════
       VUE CARTES
  ══════════════════════════════════ -->
  <div class="cards-grid" *ngIf="vue==='cartes' && liste().items.length && !loading()">
    <div *ngFor="let l of liste().items" class="loc-card">
      <div class="lc-head">
        <div class="avatar lg" [style.background]="avatarColor(l.nomComplet)">
          {{ initiales(l.nomComplet) }}
        </div>
        <div class="lc-paiement" [class.vert]="estAJour(l)" [class.rouge]="!estAJour(l) && l.nbContratsActifs > 0" [class.gris]="l.nbContratsActifs === 0">
          <span class="paiement-dot"></span>
          <span *ngIf="l.nbContratsActifs === 0">Aucun bail</span>
          <span *ngIf="l.nbContratsActifs > 0 && estAJour(l)">À jour</span>
          <span *ngIf="l.nbContratsActifs > 0 && !estAJour(l)">En retard</span>
        </div>
      </div>
      <div class="lc-nom">{{ l.nomComplet }}</div>
      <div class="lc-tel">📞 {{ l.telephone }}</div>
      <div class="lc-email" *ngIf="l.email">✉ {{ l.email }}</div>
      <div class="lc-foot">
        <span class="badge-statut sm" [class.ok]="l.estActif" [class.off]="!l.estActif">
          {{ l.estActif ? 'Actif' : 'Inactif' }}
        </span>
        <span class="badge-num sm" [class.blue]="l.nbContratsActifs > 0">
          {{ l.nbContratsActifs }} bail{{ l.nbContratsActifs > 1 ? 's' : '' }}
        </span>
      </div>
    </div>
  </div>

  <!-- État vide / chargement -->
  <div class="empty-state" *ngIf="!liste().items.length && !loading()">
    <div class="empty-icon">🧑‍🤝‍🧑</div>
    <div class="empty-title">Aucun locataire trouvé</div>
    <div class="empty-sub">Ajoutez votre premier locataire pour commencer</div>
    <button class="btn-add" style="margin-top:18px" (click)="ouvrirCreation()">＋ Nouveau locataire</button>
  </div>
  <div class="loading-state" *ngIf="loading()">
    <div class="spinner"></div><p>Chargement…</p>
  </div>

  <!-- Pagination -->
  <div class="pagination" *ngIf="liste().totalPages > 1">
    <button [disabled]="page===1" (click)="goPage(page-1)">‹</button>
    <span>Page {{ page }} / {{ liste().totalPages }}</span>
    <button [disabled]="!liste().hasNext" (click)="goPage(page+1)">›</button>
  </div>

</div>


<!-- ══════════════════════════════════════════════════════
     MODAL — NOUVEAU LOCATAIRE
══════════════════════════════════════════════════════ -->
<div class="modal-overlay" [class.open]="showCreation()" (click)="onOverlayClick($event)">
  <div class="nv-modal" (click)="$event.stopPropagation()">

    <!-- En-tête -->
    <div class="nv-header">
      <div class="nv-header-left">
        <div class="nv-icon">🧑</div>
        <div>
          <div class="nv-title">Nouveau locataire</div>
          <div class="nv-sub">Enregistrement avec documents obligatoires</div>
        </div>
      </div>
      <button class="close-btn" (click)="fermerCreation()">✕</button>
    </div>

    <!-- Stepper -->
    <div class="stepper">
      <ng-container *ngFor="let lbl of stepLabels; let i = index">
        <div class="stepper-step">
          <div class="step-dot"
               [class.step-active]="etape() === i+1"
               [class.step-done]="etape() > i+1">
            {{ etape() > i+1 ? '✓' : i+1 }}
          </div>
          <div class="step-label">{{ lbl }}</div>
        </div>
        <div class="step-line" *ngIf="i < stepLabels.length-1" [class.done]="etape() > i+1"></div>
      </ng-container>
    </div>

    <!-- Corps -->
    <div class="nv-body" [formGroup]="form">

      <!-- ─── Étape 1 : Identité ─── -->
      <ng-container *ngIf="etape() === 1">
        <div class="step-title">👤 Identité</div>
        <div class="two-col">
          <div class="fg">
            <label>Prénom <span class="req">*</span></label>
            <input type="text" class="fc" placeholder="Aminata" formControlName="prenom" />
            <span class="err-msg" *ngIf="invalid('prenom')">Obligatoire</span>
          </div>
          <div class="fg">
            <label>Nom <span class="req">*</span></label>
            <input type="text" class="fc" placeholder="Diallo" formControlName="nom" />
            <span class="err-msg" *ngIf="invalid('nom')">Obligatoire</span>
          </div>
          <div class="fg">
            <label>Date de naissance</label>
            <input type="date" class="fc" formControlName="dateNaissance" />
          </div>
          <div class="fg">
            <label>Lieu de naissance</label>
            <input type="text" class="fc" placeholder="Nouakchott" formControlName="lieuNaissance" />
          </div>
        </div>

        <!-- Photo identité -->
        <div class="fg" style="margin-top:4px">
          <label>Photo d'identité</label>
          <div class="file-drop" (click)="photoInput.click()"
               (drop)="onDrop($event)" (dragover)="$event.preventDefault()"
               [class.has-file]="photoPreview">
            <input #photoInput type="file" accept="image/*" style="display:none"
                   (change)="onPhotoChange($event)" />
            <div *ngIf="!photoPreview" class="fd-empty">
              <span>📸</span><p>Cliquer ou glisser la photo</p>
            </div>
            <img *ngIf="photoPreview" [src]="photoPreview" class="fd-img" />
          </div>
        </div>
      </ng-container>

      <!-- ─── Étape 2 : Coordonnées ─── -->
      <ng-container *ngIf="etape() === 2">
        <div class="step-title">📞 Coordonnées</div>
        <div class="two-col">
          <div class="fg">
            <label>Téléphone principal <span class="req">*</span></label>
            <input type="text" class="fc" placeholder="+222 36 XX XX XX" formControlName="telephone" />
            <span class="err-msg" *ngIf="invalid('telephone')">Obligatoire</span>
          </div>
          <div class="fg">
            <label>Téléphone secondaire</label>
            <input type="text" class="fc" formControlName="telephoneSecondaire" />
          </div>
          <div class="fg">
            <label>Email</label>
            <input type="email" class="fc" placeholder="exemple@mail.com" formControlName="email" />
          </div>
          <div class="fg">
            <label>Quartier</label>
            <input type="text" class="fc" placeholder="Tevragh Zeina" formControlName="quartier" />
          </div>
          <div class="fg full">
            <label>Adresse complète <span class="req">*</span></label>
            <textarea class="fc ta" rows="2" formControlName="adresse"
                      placeholder="Avenue principale, Tevragh Zeina…"></textarea>
            <span class="err-msg" *ngIf="invalid('adresse')">Obligatoire</span>
          </div>
        </div>
      </ng-container>

      <!-- ─── Étape 3 : Document ─── -->
      <ng-container *ngIf="etape() === 3">
        <div class="step-title">🪪 Document officiel</div>
        <div class="two-col">
          <div class="fg">
            <label>Type de document <span class="req">*</span></label>
            <select class="fc" formControlName="typeDocumentId">
              <option value="CarteNationaleIdentite">Carte nationale d'identité</option>
              <option value="Passeport">Passeport</option>
              <option value="CarteDeSejour">Carte de séjour</option>
              <option value="CarteConsulaire">Carte consulaire</option>
              <option value="Autre">Autre</option>
            </select>
            <span class="err-msg" *ngIf="invalid('typeDocumentId')">Obligatoire</span>
          </div>
          <div class="fg">
            <label>Numéro du document <span class="req">*</span></label>
            <input type="text" class="fc" placeholder="NNI-001-85-MR" formControlName="numeroDocument" />
            <span class="err-msg" *ngIf="invalid('numeroDocument')">Obligatoire</span>
          </div>
          <div class="fg full">
            <label>Joindre le document</label>
            <div class="file-drop-sm" (click)="docInput.click()">
              <input #docInput type="file" accept=".pdf,image/*" style="display:none"
                     (change)="onDocChange($event)" />
              <span *ngIf="!docFile">📎 Cliquer pour joindre (PDF ou image)</span>
              <span *ngIf="docFile" class="fname">✓ {{ docFile.name }}</span>
            </div>
          </div>
          <div class="fg">
            <label>Profession</label>
            <input type="text" class="fc" placeholder="Commerçant, Fonctionnaire…" formControlName="profession" />
          </div>
          <div class="fg">
            <label>Employeur</label>
            <input type="text" class="fc" placeholder="Ministère, Société…" formControlName="employeur" />
          </div>
          <div class="fg full">
            <label>Notes</label>
            <textarea class="fc ta" rows="2" formControlName="notes"
                      placeholder="Observations complémentaires…"></textarea>
          </div>
        </div>
      </ng-container>

      <!-- ─── Étape 4 : Récap ─── -->
      <ng-container *ngIf="etape() === 4">
        <div class="step-title">✅ Récapitulatif</div>
        <div class="recap-card">
          <div class="recap-row"><span>Nom complet</span><strong>{{ form.get('prenom')?.value }} {{ form.get('nom')?.value }}</strong></div>
          <div class="recap-row"><span>Téléphone</span><strong>{{ form.get('telephone')?.value }}</strong></div>
          <div class="recap-row" *ngIf="form.get('email')?.value"><span>Email</span><strong>{{ form.get('email')?.value }}</strong></div>
          <div class="recap-row"><span>Adresse</span><strong>{{ form.get('adresse')?.value }}</strong></div>
          <div class="recap-row"><span>Document</span><strong>{{ form.get('typeDocumentId')?.value }} — {{ form.get('numeroDocument')?.value }}</strong></div>
          <div class="recap-row" *ngIf="form.get('profession')?.value"><span>Profession</span><strong>{{ form.get('profession')?.value }}</strong></div>
        </div>
        <div class="success-banner" *ngIf="successMsg()">✅ {{ successMsg() }}</div>
        <div class="error-banner"   *ngIf="errorMsg()">⚠️ {{ errorMsg() }}</div>
      </ng-container>

    </div><!-- /nv-body -->

    <!-- Pied -->
    <div class="nv-footer">
      <button class="btn-ghost" (click)="fermerCreation()">Annuler</button>
      <div class="foot-right">
        <button class="btn-sec" *ngIf="etape() > 1" (click)="etapePrev()">← Précédent</button>
        <button class="btn-primary" *ngIf="etape() < 4" [disabled]="!peutContinuer()" (click)="etapeNext()">
          Suivant →
        </button>
        <button class="btn-submit" *ngIf="etape() === 4" [disabled]="!form.valid || submitting()" (click)="soumettre()">
          <span *ngIf="!submitting()">✓ Créer le locataire</span>
          <span *ngIf="submitting()" class="spin"></span>
        </button>
      </div>
    </div>

  </div>
</div>

  `,
  styles: [`
    :host {
      --gold:    #C9A84C; --gold-l:  #E8C96A; --gold-d:  #8B6914;
      --ink:     #0D0D0D; --ink-mid: #1A1A2E; --ink-soft:#2D2D4A;
      --cream:   #F8F4ED; --cream-dk:#EDE8DF; --muted:   #8A8899;
      --ok:      #1A7A4A; --ok-bg:   #E6F5EE;
      --warn:    #D4850A; --warn-bg: #FEF3E2;
      --danger:  #C0392B; --danger-bg:#FDECEA;
      --blue:    #1D4ED8; --blue-bg: #DBEAFE;
      --r: 12px;
    }

    /* ─ Page ─ */
    .page { max-width:1200px; margin:0 auto; }

    /* En-tête */
    .page-header { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:22px; flex-wrap:wrap; gap:12px; }
    .page-title  { font-size:24px; font-weight:800; color:var(--ink-mid); margin:0 0 6px; font-family:'Playfair Display',Georgia,serif; }
    .page-sub    { display:flex; gap:7px; flex-wrap:wrap; margin:0; }
    .stat-pill   { padding:3px 10px; border-radius:20px; font-size:12px; font-weight:600; background:var(--cream-dk); color:var(--muted); }
    .stat-pill.ok{ background:var(--ok-bg); color:var(--ok); }
    .stat-pill.warn { background:var(--warn-bg); color:var(--warn); }

    .btn-add { padding:10px 22px; background:var(--ink-mid); color:var(--gold-l); border:none; border-radius:10px; font-size:14px; font-weight:700; cursor:pointer; font-family:inherit; transition:all .18s; }
    .btn-add:hover { background:var(--ink-soft); box-shadow:0 4px 14px rgba(26,26,46,.25); }

    /* Filtres */
    .filter-bar { display:flex; align-items:center; gap:12px; margin-bottom:18px; flex-wrap:wrap; }
    .search-wrap { flex:1; min-width:240px; display:flex; align-items:center; gap:10px; background:#fff; border:1.5px solid var(--cream-dk); border-radius:10px; padding:9px 14px; transition:border-color .18s; }
    .search-wrap:focus-within { border-color:var(--gold); }
    .si { font-size:15px; flex-shrink:0; }
    .search-wrap input { flex:1; border:none; outline:none; font-size:13.5px; font-family:inherit; background:transparent; }
    .search-wrap input::placeholder { color:#c0bcc8; }
    .clear-x { color:var(--muted); cursor:pointer; font-size:12px; }
    .clear-x:hover { color:var(--danger); }
    .chips { display:flex; gap:7px; }
    .chip { padding:7px 14px; border-radius:20px; border:1.5px solid var(--cream-dk); background:#fff; font-size:12.5px; font-weight:600; color:var(--muted); cursor:pointer; transition:all .15s; }
    .chip.active { background:var(--ink-mid); color:var(--gold-l); border-color:var(--ink-mid); }
    .chip:hover:not(.active) { border-color:var(--ink-mid); color:var(--ink-mid); }
    .view-toggle { display:flex; border:1.5px solid var(--cream-dk); border-radius:8px; overflow:hidden; background:#fff; }
    .view-toggle button { padding:7px 12px; border:none; background:transparent; cursor:pointer; font-size:15px; color:var(--muted); transition:all .15s; }
    .view-toggle button.vt-active { background:var(--ink-mid); color:var(--gold-l); }

    /* ─ Tableau ─ */
    .table-card { background:#fff; border-radius:var(--r); overflow:hidden; box-shadow:0 2px 12px rgba(0,0,0,.07); }
    table { width:100%; border-collapse:collapse; }
    thead th { padding:11px 16px; background:#f8f9fc; font-size:11px; font-weight:700; letter-spacing:.6px; text-transform:uppercase; color:var(--muted); border-bottom:1px solid var(--cream-dk); text-align:left; }
    th.r { text-align:right; } th.c { text-align:center; }
    tbody td { padding:13px 16px; border-bottom:1px solid var(--cream-dk); vertical-align:middle; }
    tbody tr:last-child td { border-bottom:none; }
    /* lignes non cliquables — hover subtil uniquement */
    td.r { text-align:right; } td.c { text-align:center; }
    td.muted { color:var(--muted); } td.sm { font-size:12.5px; } td.mono { font-family:monospace; font-size:13px; }

    /* Cellule locataire */
    .cell-locataire { display:flex; align-items:center; gap:11px; }
    .avatar { width:36px; height:36px; border-radius:9px; display:flex; align-items:center; justify-content:center; font-size:13px; font-weight:700; color:#fff; flex-shrink:0; font-family:'Playfair Display',Georgia,serif; }
    .avatar.lg { width:46px; height:46px; font-size:16px; border-radius:11px; }
    .l-nom  { font-weight:600; font-size:13.5px; color:var(--ink-mid); }
    .l-meta { font-size:11.5px; color:var(--muted); margin-top:1px; }

    /* Badges */
    .badge-num   { display:inline-flex; width:24px; height:24px; border-radius:6px; align-items:center; justify-content:center; font-size:12px; font-weight:700; background:var(--cream-dk); color:var(--muted); }
    .badge-num.blue { background:var(--blue-bg); color:var(--blue); }
    .badge-num.sm { width:20px; height:20px; font-size:10.5px; border-radius:5px; }
    .badge-statut { display:inline-flex; padding:3px 10px; border-radius:20px; font-size:11.5px; font-weight:700; }
    .badge-statut.ok  { background:var(--ok-bg); color:var(--ok); }
    .badge-statut.off { background:var(--cream-dk); color:var(--muted); }
    .badge-statut.sm  { font-size:10.5px; padding:2px 8px; }

    /* Badge paiement */
    .paiement-badge { display:inline-flex; align-items:center; gap:5px; padding:4px 10px; border-radius:20px; font-size:11.5px; font-weight:700; }
    .paiement-badge.vert  { background:var(--ok-bg);   color:var(--ok); }
    .paiement-badge.rouge { background:var(--danger-bg); color:var(--danger); }
    .paiement-badge.gris  { background:var(--cream-dk);  color:var(--muted); }
    .paiement-dot { width:6px; height:6px; border-radius:50%; background:currentColor; flex-shrink:0; }

    /* Actions ligne */
    .row-actions { display:flex; gap:5px; justify-content:flex-end; }
    .ra-btn { height:30px; border-radius:7px; border:none; background:var(--cream); color:var(--muted); font-size:13px; cursor:pointer; display:flex; align-items:center; justify-content:center; text-decoration:none; transition:all .14s; padding:0 8px; gap:5px; white-space:nowrap; }
    .ra-btn:hover { background:var(--cream-dk); color:var(--ink); }
    .ra-labeled { font-weight:600; font-size:12px; }
    .ra-labeled:hover { background:var(--ink-mid); color:var(--gold-l); }
    .ra-blue { background:var(--blue-bg); color:var(--blue); }
    .ra-blue:hover { background:var(--blue); color:#fff; }
    .ra-del:hover:not(:disabled) { background:var(--danger-bg); color:var(--danger); }
    .ra-del:disabled { opacity:.3; cursor:not-allowed; }

    /* ─ Vue cartes ─ */
    .cards-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(240px,1fr)); gap:14px; }
    .loc-card { background:#fff; border-radius:var(--r); padding:18px; box-shadow:0 2px 10px rgba(0,0,0,.07); cursor:pointer; transition:all .15s; border:1.5px solid transparent; }
    .loc-card:hover { border-color:var(--gold); box-shadow:0 4px 18px rgba(0,0,0,.1); transform:translateY(-2px); }
    .lc-head  { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:12px; }
    .lc-nom   { font-size:14.5px; font-weight:700; color:var(--ink-mid); margin-bottom:5px; }
    .lc-tel   { font-size:12.5px; color:var(--muted); margin-bottom:3px; font-family:monospace; }
    .lc-email { font-size:12px; color:var(--muted); margin-bottom:10px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
    .lc-foot  { display:flex; justify-content:space-between; align-items:center; margin-top:10px; padding-top:10px; border-top:1px solid var(--cream-dk); }

    /* États */
    .empty-state { text-align:center; padding:60px 20px; }
    .empty-icon  { font-size:48px; margin-bottom:12px; }
    .empty-title { font-size:17px; font-weight:700; color:var(--ink); margin-bottom:6px; }
    .empty-sub   { font-size:13px; color:var(--muted); }
    .loading-state { display:flex; flex-direction:column; align-items:center; padding:60px; gap:14px; color:var(--muted); }
    .spinner { width:30px; height:30px; border:3px solid var(--cream-dk); border-top-color:var(--ink-mid); border-radius:50%; animation:spin .8s linear infinite; }

    /* Pagination */
    .pagination { display:flex; align-items:center; justify-content:center; gap:16px; margin-top:18px; font-size:13px; color:var(--muted); }
    .pagination button { width:30px; height:30px; border-radius:7px; border:1.5px solid var(--cream-dk); background:#fff; cursor:pointer; font-size:14px; }
    .pagination button:disabled { opacity:.4; cursor:not-allowed; }

    /* ══════════════════════════════════════
       MODAL
    ══════════════════════════════════════ */
    .modal-overlay { position:fixed; inset:0; background:rgba(13,13,13,.55); backdrop-filter:blur(4px); z-index:1000; display:flex; align-items:center; justify-content:center; padding:20px; opacity:0; pointer-events:none; transition:opacity .22s; }
    .modal-overlay.open { opacity:1; pointer-events:all; }
    .nv-modal { background:#fff; border-radius:18px; width:100%; max-width:600px; max-height:90vh; box-shadow:0 24px 80px rgba(13,13,13,.22), 0 0 0 1px rgba(201,168,76,.15); display:flex; flex-direction:column; overflow:hidden; transform:translateY(16px) scale(.97); transition:transform .25s; }
    .modal-overlay.open .nv-modal { transform:translateY(0) scale(1); }

    /* En-tête modal */
    .nv-header { padding:20px 24px 16px; background:linear-gradient(to right,var(--ink-mid),var(--ink-soft)); display:flex; align-items:center; justify-content:space-between; flex-shrink:0; }
    .nv-header-left { display:flex; align-items:center; gap:12px; }
    .nv-icon { width:42px; height:42px; border-radius:11px; background:rgba(201,168,76,.18); border:1.5px solid rgba(201,168,76,.35); display:flex; align-items:center; justify-content:center; font-size:19px; flex-shrink:0; }
    .nv-title { font-size:17px; font-weight:700; color:var(--gold-l); font-family:'Playfair Display',Georgia,serif; }
    .nv-sub   { font-size:11.5px; color:rgba(255,255,255,.4); margin-top:2px; }
    .close-btn { width:30px; height:30px; border-radius:7px; border:none; background:rgba(255,255,255,.1); color:rgba(255,255,255,.6); font-size:13px; cursor:pointer; transition:all .15s; display:flex; align-items:center; justify-content:center; }
    .close-btn:hover { background:rgba(192,57,43,.3); color:#fff; }

    /* Stepper */
    .stepper { display:flex; align-items:center; padding:14px 24px 10px; background:var(--cream); border-bottom:1px solid var(--cream-dk); flex-shrink:0; }
    .stepper-step { display:flex; flex-direction:column; align-items:center; gap:4px; flex:1; }
    .step-dot { width:26px; height:26px; border-radius:50%; background:#fff; border:2px solid var(--cream-dk); display:flex; align-items:center; justify-content:center; font-size:11.5px; font-weight:700; color:var(--muted); transition:all .2s; }
    .step-active { background:var(--gold); border-color:var(--gold); color:#fff; box-shadow:0 0 0 4px rgba(201,168,76,.2); }
    .step-done   { background:var(--ok);   border-color:var(--ok);   color:#fff; }
    .step-label  { font-size:10.5px; font-weight:600; color:var(--muted); text-align:center; }
    .step-line   { flex:1; height:2px; background:var(--cream-dk); margin:0 4px 14px; border-radius:2px; transition:background .3s; }
    .step-line.done { background:var(--ok); }

    /* Corps modal */
    .nv-body { flex:1; overflow-y:auto; padding:20px 24px; }
    .nv-body::-webkit-scrollbar { width:4px; }
    .nv-body::-webkit-scrollbar-thumb { background:var(--cream-dk); border-radius:4px; }
    .step-title { font-size:13px; font-weight:700; color:var(--ink-soft); margin-bottom:16px; padding-bottom:10px; border-bottom:1px solid var(--cream-dk); }

    /* Champs */
    .two-col { display:grid; grid-template-columns:1fr 1fr; gap:14px; }
    .fg { display:flex; flex-direction:column; gap:5px; margin-bottom:2px; }
    .fg.full { grid-column:1/-1; }
    label { font-size:12px; font-weight:700; color:var(--ink-soft); letter-spacing:.2px; }
    .req { color:var(--danger); margin-left:2px; }
    .fc { padding:10px 12px; border:1.5px solid var(--cream-dk); border-radius:9px; font-size:13px; color:var(--ink); font-family:inherit; outline:none; transition:border-color .18s; background:#fff; }
    .fc:focus { border-color:var(--gold); box-shadow:0 0 0 3px rgba(201,168,76,.1); }
    .fc::placeholder { color:#c0bcc8; }
    .ta { resize:none; }
    .err-msg { font-size:11.5px; color:var(--danger); }

    /* Photo drop */
    .file-drop { border:2px dashed var(--cream-dk); border-radius:10px; padding:20px; text-align:center; cursor:pointer; transition:all .18s; margin-top:2px; }
    .file-drop:hover,.file-drop.has-file { border-color:var(--gold); background:rgba(201,168,76,.03); }
    .fd-empty { display:flex; flex-direction:column; align-items:center; gap:6px; color:var(--muted); font-size:13px; }
    .fd-empty span { font-size:28px; }
    .fd-empty p { margin:0; }
    .fd-img  { max-height:120px; border-radius:8px; }
    .file-drop-sm { border:1.5px dashed var(--cream-dk); border-radius:8px; padding:11px 14px; cursor:pointer; font-size:13px; color:var(--muted); transition:all .18s; }
    .file-drop-sm:hover { border-color:var(--gold); }
    .fname { color:var(--ok); font-weight:600; }

    /* Récap */
    .recap-card { background:var(--cream); border-radius:10px; padding:16px 18px; border:1px solid var(--cream-dk); }
    .recap-row  { display:flex; justify-content:space-between; align-items:center; padding:8px 0; border-bottom:1px solid var(--cream-dk); font-size:13px; }
    .recap-row:last-child { border:none; }
    .recap-row span { color:var(--muted); font-size:12px; }
    .recap-row strong { color:var(--ink-mid); font-weight:600; }
    .success-banner { display:flex; align-items:center; gap:8px; background:var(--ok-bg); border:1px solid var(--ok); border-radius:9px; padding:11px 14px; font-size:13px; color:var(--ok); font-weight:600; margin-top:12px; }
    .error-banner   { display:flex; align-items:center; gap:8px; background:var(--danger-bg); border:1px solid var(--danger); border-radius:9px; padding:11px 14px; font-size:13px; color:var(--danger); font-weight:600; margin-top:12px; }

    /* Pied modal */
    .nv-footer { padding:14px 24px; border-top:1px solid var(--cream-dk); background:var(--cream); display:flex; align-items:center; justify-content:space-between; flex-shrink:0; }
    .foot-right { display:flex; gap:9px; }
    .btn-ghost   { background:none; border:none; cursor:pointer; font-size:13px; color:var(--muted); padding:8px 2px; font-family:inherit; }
    .btn-ghost:hover { color:var(--danger); }
    .btn-sec     { padding:8px 16px; border-radius:8px; background:#fff; color:var(--ink-soft); border:1.5px solid var(--cream-dk); font-size:13px; font-weight:600; cursor:pointer; font-family:inherit; }
    .btn-primary { padding:8px 20px; border-radius:8px; background:var(--ink-mid); color:var(--gold-l); border:none; font-size:13px; font-weight:600; cursor:pointer; font-family:inherit; transition:background .15s; }
    .btn-primary:disabled { opacity:.4; cursor:not-allowed; }
    .btn-submit  { padding:8px 22px; border-radius:8px; background:linear-gradient(135deg,var(--gold-d),var(--gold)); color:#fff; border:none; font-size:13px; font-weight:700; cursor:pointer; font-family:inherit; min-width:160px; display:flex; align-items:center; justify-content:center; transition:all .18s; }
    .btn-submit:disabled { opacity:.4; cursor:not-allowed; }
    .spin { width:16px; height:16px; border:2.5px solid rgba(255,255,255,.35); border-top-color:#fff; border-radius:50%; animation:spin .7s linear infinite; display:inline-block; }
    @keyframes spin { to { transform:rotate(360deg); } }

    @media(max-width:600px) {
      .two-col { grid-template-columns:1fr; }
      .nv-modal { border-radius:14px 14px 0 0; }
      .modal-overlay { align-items:flex-end; padding:0; }
      .cards-grid { grid-template-columns:1fr 1fr; }
    }
  `]
})
export class LocatairesListComponent implements OnInit {

  private svc  = inject(LocatairesService);
  private http = inject(HttpClient);
  private fb   = inject(FormBuilder);

  // ── Liste ────────────────────────────────────────
  liste   = signal<PagedList<LocataireListItemDto>>({ items:[], totalCount:0, page:1, pageSize:20, totalPages:0, hasNext:false, hasPrevious:false });
  loading = signal(false);
  page    = 1; searchTerm = ''; filtreActif = ''; vue: 'liste'|'cartes' = 'liste';
  private timer: any;

  // Stats
  nbActifs() { return this.liste().items.filter(l => l.estActif).length; }
  nbAJour()  { return this.liste().items.filter(l => this.estAJour(l)).length; }

  // ── Modal création ────────────────────────────────
  showCreation = signal(false);
  etape        = signal(1);
  submitting   = signal(false);
  successMsg   = signal('');
  errorMsg     = signal('');
  stepLabels   = ['Identité', 'Coordonnées', 'Document', 'Confirmation'];
  photoFile?: File; photoPreview?: string; docFile?: File;

  form = this.fb.group({
    nom:                ['', Validators.required],
    prenom:             ['', Validators.required],
    dateNaissance:      [''],
    lieuNaissance:      [''],
    adresse:            ['', Validators.required],
    quartier:           [''],
    telephone:          ['', Validators.required],
    telephoneSecondaire:[''],
    email:              ['', Validators.email],
    typeDocumentId:     ['CarteNationaleIdentite', Validators.required],
    numeroDocument:     ['', Validators.required],
    profession:         [''],
    employeur:          [''],
    notes:              [''],
  });

  // ── Lifecycle ────────────────────────────────────
  ngOnInit() { this.load(); }

  // ── Liste ────────────────────────────────────────
  load() {
    this.loading.set(true);
    const actif = this.filtreActif === '' ? undefined : this.filtreActif === 'true';
    this.svc.getAll(this.page, 20, this.searchTerm || undefined, actif).subscribe({
      next: r  => { this.liste.set(r); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  onSearch()         { clearTimeout(this.timer); this.timer = setTimeout(() => { this.page=1; this.load(); }, 350); }
  clearSearch()      { this.searchTerm=''; this.page=1; this.load(); }
  setFiltre(v:string){ this.filtreActif=v; this.page=1; this.load(); }
  goPage(p:number)   { this.page=p; this.load(); }


  supprimer(id:string, nom:string) {
    if (!confirm(`Supprimer définitivement ${nom} ?`)) return;
    this.svc.supprimer(id).subscribe({
      next: () => {
        const cur = this.liste();
        this.liste.set({ ...cur, items: cur.items.filter(l => l.id !== id), totalCount: cur.totalCount-1 });
        this.load();
      },
      error: (err:any) => alert(err?.error?.message ?? 'Erreur')
    });
  }

  // Paiement : à jour si nbContratsActifs > 0 (simulé — à remplacer par champ API si disponible)
  estAJour(l: LocataireListItemDto): boolean {
    return l.estActif && l.nbContratsActifs > 0;
  }

  // Avatar couleur déterministe
  avatarColor(nom: string): string {
    const colors = ['#1A1A2E','#16213E','#0F3460','#533483','#2B4865','#1A4731','#7B3F00'];
    let h = 0; for (const c of nom) h = (h*31 + c.charCodeAt(0)) & 0xFFFFFF;
    return colors[Math.abs(h) % colors.length];
  }
  initiales(nom: string): string {
    return nom.split(' ').map((w:string) => w[0]).join('').toUpperCase().slice(0,2);
  }

  // ── Modal création ────────────────────────────────
  ouvrirCreation() {
    this.form.reset({ typeDocumentId:'CarteNationaleIdentite' });
    this.photoFile=undefined; this.photoPreview=undefined; this.docFile=undefined;
    this.etape.set(1); this.successMsg.set(''); this.errorMsg.set('');
    this.showCreation.set(true);
  }
  fermerCreation() { this.showCreation.set(false); }
  onOverlayClick(e:Event) { if ((e.target as HTMLElement).classList.contains('modal-overlay')) this.fermerCreation(); }

  etapePrev() { this.etape.update(e => e-1); }
  etapeNext() { if (this.peutContinuer()) this.etape.update(e => e+1); }

  peutContinuer(): boolean {
    if (this.etape() === 1) return !!this.form.get('prenom')?.valid && !!this.form.get('nom')?.valid;
    if (this.etape() === 2) return !!this.form.get('telephone')?.valid && !!this.form.get('adresse')?.valid;
    if (this.etape() === 3) return !!this.form.get('typeDocumentId')?.valid && !!this.form.get('numeroDocument')?.valid;
    return true;
  }

  invalid(f:string): boolean { const c=this.form.get(f); return !!(c?.invalid && c?.touched); }

  onPhotoChange(e:Event) {
    const file = (e.target as HTMLInputElement).files?.[0]; if (!file) return;
    this.photoFile = file;
    const r=new FileReader(); r.onload=ev=>this.photoPreview=ev.target?.result as string; r.readAsDataURL(file);
  }
  onDrop(e:DragEvent) {
    e.preventDefault();
    const file=e.dataTransfer?.files[0]; if (!file?.type.startsWith('image/')) return;
    this.photoFile=file;
    const r=new FileReader(); r.onload=ev=>this.photoPreview=ev.target?.result as string; r.readAsDataURL(file);
  }
  onDocChange(e:Event) { this.docFile=(e.target as HTMLInputElement).files?.[0]; }

  soumettre() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.submitting.set(true); this.errorMsg.set('');
    const fd=new FormData();
    Object.entries(this.form.value).forEach(([k,v]) => { if (v!=null && v!=='') fd.append(k, v as string); });
    if (this.photoFile) fd.append('photoIdentite', this.photoFile);
    if (this.docFile) {
      fd.append('Documents[0].Fichier', this.docFile);
      fd.append('Documents[0].Type', 'CarteIdentite');
      fd.append('Documents[0].Description', 'Document identité principal');
    }
    this.svc.create(fd).subscribe({
      next: () => {
        this.submitting.set(false);
        this.successMsg.set('Locataire créé avec succès !');
        this.load();
        setTimeout(() => this.fermerCreation(), 1500);
      },
      error: (err:any) => {
        this.submitting.set(false);
        this.errorMsg.set(err?.error?.message ?? 'Une erreur est survenue.');
      }
    });
  }
}