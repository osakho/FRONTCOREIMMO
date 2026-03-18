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
<div class="page-enter">

  <!-- ══ HEADER ══ -->
  <div class="pg-header">
    <div class="pg-header-left">
      <h1 class="page-title">Locataires</h1>
      <div class="kpi-pills">
        <span class="kpi-pill">{{ liste().totalCount }} au total</span>
        <span class="kpi-pill ok">{{ nbActifs() }} actifs</span>
        <span class="kpi-pill late" *ngIf="nbEnRetard() > 0">{{ nbEnRetard() }} en retard</span>
        <span class="kpi-pill info">{{ nbAJour() }} à jour</span>
      </div>
    </div>
    <button class="btn-new" (click)="ouvrirCreation()">
      <svg viewBox="0 0 16 16" fill="currentColor"><path d="M8 2a1 1 0 011 1v4h4a1 1 0 010 2H9v4a1 1 0 01-2 0V9H3a1 1 0 010-2h4V3a1 1 0 011-1z"/></svg>
      Nouveau locataire
    </button>
  </div>

  <!-- ══ BARRE OUTILS ══ -->
  <div class="toolbar">
    <div class="search-box">
      <svg class="search-ico" viewBox="0 0 20 20" fill="none">
        <circle cx="8.5" cy="8.5" r="5.5" stroke="currentColor" stroke-width="1.6"/>
        <path d="M13 13l3.5 3.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
      </svg>
      <input placeholder="Nom, téléphone, email…"
             [(ngModel)]="searchTerm" (ngModelChange)="onSearch()" />
      <button class="search-clear" *ngIf="searchTerm" (click)="clearSearch()">✕</button>
    </div>
    <div class="filter-chips">
      <button class="fchip" [class.active]="filtreActif===''"      (click)="setFiltre('')">Tous</button>
      <button class="fchip" [class.active]="filtreActif==='true'"  (click)="setFiltre('true')">Actifs</button>
      <button class="fchip" [class.active]="filtreActif==='false'" (click)="setFiltre('false')">Inactifs</button>
    </div>
    <div class="view-btns">
      <button [class.va]="vue==='liste'"  (click)="vue='liste'"  title="Tableau">
        <svg viewBox="0 0 16 16" fill="currentColor"><path d="M1 3h14v2H1zm0 4h14v2H1zm0 4h14v2H1z"/></svg>
      </button>
      <button [class.va]="vue==='cartes'" (click)="vue='cartes'" title="Cartes">
        <svg viewBox="0 0 16 16" fill="currentColor"><rect x="1" y="1" width="6" height="6" rx="1"/><rect x="9" y="1" width="6" height="6" rx="1"/><rect x="1" y="9" width="6" height="6" rx="1"/><rect x="9" y="9" width="6" height="6" rx="1"/></svg>
      </button>
    </div>
  </div>

    <!-- ── Chargement ── -->
    <div class="loading-bar" *ngIf="loading()">
      <div class="lb-fill"></div>
    </div>

    <!-- ══ VUE TABLEAU ══ -->
    <div class="table-wrap" *ngIf="vue==='liste' && !loading()">
      <table *ngIf="liste().items.length; else empty">
        <thead>
          <tr>
            <th style="width:36px"></th>
            <th>Locataire</th>
            <th>Contact</th>
            <th class="c">Baux</th>
            <th class="c">Paiement</th>
            <th class="c">Statut</th>
            <th class="c">Depuis</th>
            <th style="width:180px"></th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let l of liste().items; let i=index"
              [style.animation-delay]="(i*30)+'ms'">

            <!-- Rang -->
            <td class="rank">{{ (page-1)*20 + i + 1 }}</td>

            <!-- Identité -->
            <td>
              <div class="id-cell">
                <div class="av" [style.background]="avatarColor(l.nomComplet)">
                  {{ initiales(l.nomComplet) }}
                </div>
                <div class="id-info">
                  <div class="id-nom">{{ l.nomComplet }}</div>
                  <div class="id-sub" *ngIf="l.nbContratsActifs > 0">
                    {{ l.nbContratsActifs }} bail{{ l.nbContratsActifs > 1 ? 's' : '' }} actif{{ l.nbContratsActifs > 1 ? 's' : '' }}
                  </div>
                </div>
              </div>
            </td>

            <!-- Contact -->
            <td>
              <div class="contact-cell">
                <span class="phone">{{ l.telephone }}</span>
                <span class="email" *ngIf="l.email">{{ l.email }}</span>
              </div>
            </td>

            <!-- Baux -->
            <td class="c">
              <span class="badge-n" [class.active]="l.nbContratsActifs > 0">
                {{ l.nbContratsActifs }}
              </span>
            </td>

            <!-- Paiement -->
            <td class="c">
              <div class="pay-chip" *ngIf="l.nbContratsActifs > 0"
                   [class.ok]="estAJour(l)" [class.late]="!estAJour(l)">
                <span class="pay-dot"></span>
                {{ estAJour(l) ? 'À jour' : 'En retard' }}
              </div>
              <span class="muted-dash" *ngIf="l.nbContratsActifs === 0">—</span>
            </td>

            <!-- Statut -->
            <td class="c">
              <span class="status-pill" [class.on]="l.estActif" [class.off]="!l.estActif">
                {{ l.estActif ? 'Actif' : 'Inactif' }}
              </span>
            </td>

            <!-- Date -->
            <td class="c date-cell">{{ l.creeLe | date:'dd MMM yyyy' }}</td>

            <!-- Actions -->
            <td>
              <div class="acts">
                <a [routerLink]="['/locataires', l.id]" class="act-btn" title="Dossier">
                  <svg viewBox="0 0 16 16" fill="none"><path d="M8 1a7 7 0 100 14A7 7 0 008 1zm0 3a1.5 1.5 0 110 3 1.5 1.5 0 010-3zm0 8a5 5 0 01-3.9-1.87C4.26 9.2 6 8.5 8 8.5s3.74.7 3.9 1.63A5 5 0 018 12z" fill="currentColor"/></svg>
                  Dossier
                </a>
                <a [routerLink]="['/locataires', l.id, 'paiements']" class="act-btn blue" title="Paiements">
                  <svg viewBox="0 0 16 16" fill="none"><rect x="1" y="4" width="14" height="10" rx="1.5" stroke="currentColor" stroke-width="1.4"/><path d="M1 7h14" stroke="currentColor" stroke-width="1.4"/><path d="M4 10h2m3 0h2" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>
                  Paiements
                </a>
                <button class="act-del"
                        [disabled]="l.nbContratsActifs > 0"
                        [title]="l.nbContratsActifs > 0 ? 'Bail actif' : 'Supprimer'"
                        (click)="supprimer(l.id, l.nomComplet)">
                  <svg viewBox="0 0 16 16" fill="none"><path d="M2 4h12M5 4V2.5A.5.5 0 015.5 2h5a.5.5 0 01.5.5V4M6 7v5m4-5v5M3 4l.8 9.5A.5.5 0 004.3 14h7.4a.5.5 0 00.5-.5L13 4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      <ng-template #empty>
        <div class="empty">
          <div class="empty-illu">🧑‍🤝‍🧑</div>
          <div class="empty-h">Aucun locataire trouvé</div>
          <p class="empty-p">Modifiez vos filtres ou ajoutez un nouveau locataire.</p>
          <button class="btn-new" (click)="ouvrirCreation()">＋ Nouveau locataire</button>
        </div>
      </ng-template>
    </div>

    <!-- ══ VUE CARTES ══ -->
    <div class="cards-grid" *ngIf="vue==='cartes' && !loading()">
      <div class="loc-card" *ngFor="let l of liste().items; let i=index"
           [style.animation-delay]="(i*40)+'ms'">
        <div class="lc-top">
          <div class="av lg" [style.background]="avatarColor(l.nomComplet)">
            {{ initiales(l.nomComplet) }}
          </div>
          <div class="lc-badges">
            <span class="status-pill sm" [class.on]="l.estActif" [class.off]="!l.estActif">
              {{ l.estActif ? 'Actif' : 'Inactif' }}
            </span>
            <div class="pay-chip sm" *ngIf="l.nbContratsActifs > 0"
                 [class.ok]="estAJour(l)" [class.late]="!estAJour(l)">
              <span class="pay-dot"></span>
              {{ estAJour(l) ? 'À jour' : 'Retard' }}
            </div>
          </div>
        </div>
        <div class="lc-nom">{{ l.nomComplet }}</div>
        <div class="lc-contact">
          <span>📞 {{ l.telephone }}</span>
          <span *ngIf="l.email" class="lc-email">✉ {{ l.email }}</span>
        </div>
        <div class="lc-bottom">
          <span class="badge-n sm" [class.active]="l.nbContratsActifs > 0">
            {{ l.nbContratsActifs }} bail{{ l.nbContratsActifs > 1 ? 's' : '' }}
          </span>
          <div class="lc-actions">
            <a [routerLink]="['/locataires', l.id]" class="act-btn sm">Dossier</a>
            <a [routerLink]="['/locataires', l.id, 'paiements']" class="act-btn sm blue">Paiements</a>
          </div>
        </div>
      </div>
    </div>

    <!-- Pagination -->
    <div class="pager" *ngIf="liste().totalPages > 1">
      <button [disabled]="page===1" (click)="goPage(page-1)">
        <svg viewBox="0 0 16 16" fill="currentColor"><path d="M10 3L5 8l5 5"/></svg>
      </button>
      <div class="pager-pages">
        <span *ngFor="let p of pageRange()"
              class="pager-dot"
              [class.cur]="p === page"
              (click)="goPage(p)">{{ p }}</span>
      </div>
      <button [disabled]="!liste().hasNext" (click)="goPage(page+1)">
        <svg viewBox="0 0 16 16" fill="currentColor"><path d="M6 3l5 5-5 5"/></svg>
      </button>
    </div>

</div>

<!-- ══ MODAL NOUVEAU LOCATAIRE ══ -->
<div class="modal-bg" [class.open]="showCreation()" (click)="onOverlayClick($event)">
  <div class="modal" (click)="$event.stopPropagation()">

    <div class="modal-head">
      <div class="mh-left">
        <div class="mh-icon">👤</div>
        <div>
          <div class="mh-title">Nouveau locataire</div>
          <div class="mh-sub">Étape {{ etape() }} sur 4 · {{ stepLabels[etape()-1] }}</div>
        </div>
      </div>
      <button class="mh-close" (click)="fermerCreation()">
        <svg viewBox="0 0 16 16" fill="none"><path d="M3 3l10 10M13 3L3 13" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
      </button>
    </div>

    <!-- Progress bar -->
    <div class="modal-progress">
      <div class="mp-track">
        <div class="mp-fill" [style.width]="(etape()/4*100)+'%'"></div>
      </div>
      <div class="mp-steps">
        <span *ngFor="let lbl of stepLabels; let i=index"
              [class.cur]="etape()===i+1" [class.done]="etape()>i+1">
          {{ lbl }}
        </span>
      </div>
    </div>

    <div class="modal-body" [formGroup]="form">

      <!-- Étape 1 -->
      <ng-container *ngIf="etape()===1">
        <div class="step-head">👤 Identité</div>
        <div class="fg-grid">
          <div class="fg"><label>Prénom <em>*</em></label>
            <input class="fc" type="text" placeholder="Aminata" formControlName="prenom"/>
            <span class="fe" *ngIf="invalid('prenom')">Obligatoire</span></div>
          <div class="fg"><label>Nom <em>*</em></label>
            <input class="fc" type="text" placeholder="Diallo" formControlName="nom"/>
            <span class="fe" *ngIf="invalid('nom')">Obligatoire</span></div>
          <div class="fg"><label>Date de naissance</label>
            <input class="fc" type="date" formControlName="dateNaissance"/></div>
          <div class="fg"><label>Lieu de naissance</label>
            <input class="fc" type="text" placeholder="Nouakchott" formControlName="lieuNaissance"/></div>
        </div>
        <div class="fg" style="margin-top:4px"><label>Photo d'identité</label>
          <div class="drop-zone" (click)="photoInput.click()"
               (drop)="onDrop($event)" (dragover)="$event.preventDefault()"
               [class.has]="photoPreview">
            <input #photoInput type="file" accept="image/*" style="display:none" (change)="onPhotoChange($event)"/>
            <div *ngIf="!photoPreview" class="dz-empty"><span>📸</span><p>Cliquer ou glisser</p></div>
            <img *ngIf="photoPreview" [src]="photoPreview" class="dz-img"/>
          </div>
        </div>
      </ng-container>

      <!-- Étape 2 -->
      <ng-container *ngIf="etape()===2">
        <div class="step-head">📞 Coordonnées</div>
        <div class="fg-grid">
          <div class="fg"><label>Téléphone <em>*</em></label>
            <input class="fc" type="text" placeholder="+222 36 XX XX XX" formControlName="telephone"/>
            <span class="fe" *ngIf="invalid('telephone')">Obligatoire</span></div>
          <div class="fg"><label>Téléphone secondaire</label>
            <input class="fc" type="text" formControlName="telephoneSecondaire"/></div>
          <div class="fg"><label>Email</label>
            <input class="fc" type="email" placeholder="exemple@mail.com" formControlName="email"/></div>
          <div class="fg"><label>Quartier</label>
            <input class="fc" type="text" placeholder="Tevragh Zeina" formControlName="quartier"/></div>
          <div class="fg span2"><label>Adresse complète <em>*</em></label>
            <textarea class="fc ta" rows="2" formControlName="adresse" placeholder="Avenue principale…"></textarea>
            <span class="fe" *ngIf="invalid('adresse')">Obligatoire</span></div>
        </div>
      </ng-container>

      <!-- Étape 3 -->
      <ng-container *ngIf="etape()===3">
        <div class="step-head">🪪 Document officiel</div>
        <div class="fg-grid">
          <div class="fg"><label>Type de document <em>*</em></label>
            <select class="fc" formControlName="typeDocumentId">
              <option value="CarteNationaleIdentite">Carte nationale d'identité</option>
              <option value="Passeport">Passeport</option>
              <option value="CarteDeSejour">Carte de séjour</option>
              <option value="CarteConsulaire">Carte consulaire</option>
              <option value="Autre">Autre</option>
            </select></div>
          <div class="fg"><label>Numéro <em>*</em></label>
            <input class="fc" type="text" placeholder="NNI-001-85-MR" formControlName="numeroDocument"/>
            <span class="fe" *ngIf="invalid('numeroDocument')">Obligatoire</span></div>
          <div class="fg span2"><label>Joindre le document</label>
            <div class="drop-sm" (click)="docInput.click()">
              <input #docInput type="file" accept=".pdf,image/*" style="display:none" (change)="onDocChange($event)"/>
              <span *ngIf="!docFile">📎 PDF ou image</span>
              <span *ngIf="docFile" class="doc-ok">✓ {{ docFile.name }}</span>
            </div></div>
          <div class="fg"><label>Profession</label>
            <input class="fc" type="text" placeholder="Commerçant…" formControlName="profession"/></div>
          <div class="fg"><label>Employeur</label>
            <input class="fc" type="text" placeholder="Société…" formControlName="employeur"/></div>
          <div class="fg span2"><label>Notes</label>
            <textarea class="fc ta" rows="2" formControlName="notes" placeholder="Observations…"></textarea></div>
        </div>
      </ng-container>

      <!-- Étape 4 -->
      <ng-container *ngIf="etape()===4">
        <div class="step-head">✅ Récapitulatif</div>
        <div class="recap">
          <div class="recap-row"><span>Nom complet</span><strong>{{ form.get('prenom')?.value }} {{ form.get('nom')?.value }}</strong></div>
          <div class="recap-row"><span>Téléphone</span><strong>{{ form.get('telephone')?.value }}</strong></div>
          <div class="recap-row" *ngIf="form.get('email')?.value"><span>Email</span><strong>{{ form.get('email')?.value }}</strong></div>
          <div class="recap-row"><span>Adresse</span><strong>{{ form.get('adresse')?.value }}</strong></div>
          <div class="recap-row"><span>Document</span><strong>{{ form.get('typeDocumentId')?.value }} — {{ form.get('numeroDocument')?.value }}</strong></div>
          <div class="recap-row" *ngIf="form.get('profession')?.value"><span>Profession</span><strong>{{ form.get('profession')?.value }}</strong></div>
        </div>
        <div class="banner ok" *ngIf="successMsg()">✅ {{ successMsg() }}</div>
        <div class="banner err" *ngIf="errorMsg()">⚠️ {{ errorMsg() }}</div>
      </ng-container>

    </div>

    <div class="modal-foot">
      <button class="mf-cancel" (click)="fermerCreation()">Annuler</button>
      <div class="mf-right">
        <button class="mf-prev" *ngIf="etape()>1" (click)="etapePrev()">← Précédent</button>
        <button class="mf-next" *ngIf="etape()<4" [disabled]="!peutContinuer()" (click)="etapeNext()">
          Suivant →
        </button>
        <button class="mf-submit" *ngIf="etape()===4" [disabled]="!form.valid || submitting()" (click)="soumettre()">
          <span *ngIf="!submitting()">✓ Créer le locataire</span>
          <span *ngIf="submitting()" class="spin"></span>
        </button>
      </div>
    </div>
  </div>
</div>
  `,
  styles: [`
    /* ══ TOKENS ══ */
    :host {
      --navy:   #0D1B2A;
      --navy2:  #1B2B3A;
      --gold:   #C9A84C;
      --gold-l: #E8C96A;
      --gold-d: #9A7A2E;
      --ok:     #16a34a;
      --ok-bg:  #dcfce7;
      --late:   #dc2626;
      --late-bg:#fee2e2;
      --blue:   #1d4ed8;
      --blue-bg:#dbeafe;
      --surf:   #F5F7FA;
      --surf2:  #EEF1F6;
      --bord:   #E2E8F0;
      --t1:     #0F172A;
      --t2:     #475569;
      --t3:     #94a3b8;
      --r:      10px;
      --r2:     14px;
      --shadow: 0 1px 3px rgba(0,0,0,.08), 0 4px 16px rgba(0,0,0,.06);
      display: block;
      font-family: 'DM Sans', 'Segoe UI', sans-serif;
    }

    /* ══ HEADER ══ */
    .pg-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      margin-bottom: 18px;
      gap: 16px;
      flex-wrap: wrap;
    }
    .page-title { font-size: 22px; font-weight: 800; color: var(--t1); margin: 0 0 8px; }
    .kpi-pills  { display: flex; gap: 7px; flex-wrap: wrap; }
    .kpi-pill {
      padding: 3px 11px; border-radius: 20px;
      font-size: 12px; font-weight: 600;
      background: var(--surf2); color: var(--t3);
    }
    .kpi-pill.ok   { background: var(--ok-bg);   color: var(--ok); }
    .kpi-pill.late { background: var(--late-bg);  color: var(--late); }
    .kpi-pill.info { background: var(--blue-bg);  color: var(--blue); }

    .btn-new {
      display: inline-flex; align-items: center; gap: 8px;
      padding: 10px 20px;
      background: var(--navy); color: var(--gold-l);
      border: none; border-radius: var(--r);
      font-size: 13.5px; font-weight: 700;
      cursor: pointer; font-family: inherit;
      transition: all .18s; white-space: nowrap; flex-shrink: 0;
    }
    .btn-new svg { width: 14px; height: 14px; flex-shrink: 0; }
    .btn-new:hover { background: var(--navy2); box-shadow: 0 4px 14px rgba(13,27,42,.25); transform: translateY(-1px); }

    /* ══ TOOLBAR ══ */
    .toolbar {
      display: flex; align-items: center; gap: 10px;
      margin-bottom: 16px; flex-wrap: wrap;
    }
    .search-box {
      display: flex; align-items: center; gap: 8px;
      background: #fff; border: 1.5px solid var(--bord);
      border-radius: 9px; padding: 8px 13px;
      flex: 1; min-width: 220px; max-width: 340px;
      transition: border-color .15s;
    }
    .search-box:focus-within { border-color: var(--gold); }
    .search-ico { width: 15px; height: 15px; color: var(--t3); flex-shrink: 0; }
    .search-box input { flex: 1; border: none; outline: none; font-size: 13px; background: transparent; font-family: inherit; color: var(--t1); }
    .search-box input::placeholder { color: var(--t3); }
    .search-clear { background: none; border: none; color: var(--t3); cursor: pointer; font-size: 11px; padding: 0; }
    .filter-chips { display: flex; gap: 6px; }
    .fchip {
      padding: 7px 14px; border-radius: 20px;
      border: 1.5px solid var(--bord); background: #fff;
      font-size: 12.5px; font-weight: 600; color: var(--t2);
      cursor: pointer; transition: all .14s; font-family: inherit;
    }
    .fchip:hover  { border-color: var(--navy); color: var(--navy); }
    .fchip.active { background: var(--navy); color: var(--gold-l); border-color: var(--navy); }
    .view-btns {
      display: flex; border: 1.5px solid var(--bord);
      border-radius: 8px; overflow: hidden; margin-left: auto;
    }
    .view-btns button {
      width: 34px; height: 34px; border: none; background: #fff;
      color: var(--t3); cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      transition: all .14s;
    }
    .view-btns button svg { width: 15px; height: 15px; }
    .view-btns button.va { background: var(--navy); color: var(--gold-l); }

    /* Loading bar */
    .loading-bar { height: 3px; background: var(--bord); border-radius: 3px; overflow: hidden; margin-bottom: 16px; }
    .lb-fill { height: 100%; width: 40%; background: var(--gold); animation: slide 1.2s ease-in-out infinite; }
    @keyframes slide { 0% { transform: translateX(-100%); } 100% { transform: translateX(350%); } }

    /* ══ TABLEAU ══ */
    .table-wrap { background: #fff; border-radius: var(--r2); box-shadow: var(--shadow); overflow: hidden; }
    table { width: 100%; border-collapse: collapse; }
    thead th {
      padding: 11px 14px;
      background: var(--navy); color: rgba(255,255,255,.5);
      font-size: 10.5px; font-weight: 700;
      text-transform: uppercase; letter-spacing: .7px;
      text-align: left; white-space: nowrap;
    }
    th.c { text-align: center; }
    tbody tr { border-bottom: 1px solid var(--surf2); animation: fadeUp .3s ease both; transition: background .12s; }
    @keyframes fadeUp { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
    tbody tr:last-child { border-bottom: none; }
    tbody tr:hover { background: var(--surf); }
    tbody td { padding: 12px 14px; vertical-align: middle; }
    td.c { text-align: center; }
    .rank { font-size: 11px; color: var(--t3); font-weight: 600; width: 36px; text-align: center; }
    .id-cell { display: flex; align-items: center; gap: 11px; }
    .av {
      width: 38px; height: 38px; border-radius: 10px;
      display: flex; align-items: center; justify-content: center;
      font-size: 13px; font-weight: 800; color: #fff; flex-shrink: 0;
    }
    .av.lg { width: 48px; height: 48px; font-size: 16px; border-radius: 12px; }
    .id-nom { font-size: 13.5px; font-weight: 700; color: var(--t1); }
    .id-sub { font-size: 11.5px; color: var(--t3); margin-top: 1px; }
    .contact-cell { display: flex; flex-direction: column; gap: 2px; }
    .phone { font-size: 12.5px; font-family: monospace; color: var(--t2); }
    .email { font-size: 11.5px; color: var(--t3); }
    .badge-n { display: inline-flex; width: 26px; height: 26px; align-items: center; justify-content: center; border-radius: 7px; font-size: 12px; font-weight: 700; background: var(--surf2); color: var(--t3); }
    .badge-n.active { background: var(--blue-bg); color: var(--blue); }
    .badge-n.sm { width: 22px; height: 22px; font-size: 11px; border-radius: 5px; }
    .pay-chip { display: inline-flex; align-items: center; gap: 5px; padding: 4px 10px; border-radius: 20px; font-size: 11.5px; font-weight: 700; }
    .pay-chip.ok   { background: var(--ok-bg);   color: var(--ok); }
    .pay-chip.late { background: var(--late-bg);  color: var(--late); }
    .pay-chip.sm   { padding: 3px 8px; font-size: 10.5px; }
    .pay-dot { width: 5px; height: 5px; border-radius: 50%; background: currentColor; }
    .muted-dash { color: var(--t3); }
    .status-pill { display: inline-flex; padding: 4px 11px; border-radius: 20px; font-size: 11.5px; font-weight: 700; }
    .status-pill.on  { background: var(--ok-bg);  color: var(--ok); }
    .status-pill.off { background: var(--surf2);   color: var(--t3); }
    .status-pill.sm  { padding: 3px 8px; font-size: 10.5px; }
    .date-cell { font-size: 12px; color: var(--t2); white-space: nowrap; }
    .acts { display: flex; align-items: center; gap: 5px; justify-content: flex-end; }
    .act-btn { display: inline-flex; align-items: center; gap: 5px; height: 30px; padding: 0 10px; border-radius: 7px; border: 1.5px solid var(--bord); background: #fff; color: var(--t2); font-size: 11.5px; font-weight: 600; text-decoration: none; cursor: pointer; transition: all .14s; white-space: nowrap; }
    .act-btn svg { width: 13px; height: 13px; flex-shrink: 0; }
    .act-btn:hover { background: var(--navy); color: var(--gold-l); border-color: var(--navy); }
    .act-btn.blue { background: var(--blue-bg); color: var(--blue); border-color: transparent; }
    .act-btn.blue:hover { background: var(--blue); color: #fff; }
    .act-btn.sm { height: 26px; padding: 0 9px; font-size: 11px; }
    .act-del { width: 30px; height: 30px; border-radius: 7px; border: 1.5px solid var(--bord); background: #fff; color: var(--t3); display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all .14s; flex-shrink: 0; }
    .act-del svg { width: 13px; height: 13px; }
    .act-del:hover:not(:disabled) { background: var(--late-bg); color: var(--late); border-color: transparent; }
    .act-del:disabled { opacity: .3; cursor: not-allowed; }

    /* ══ VUE CARTES ══ */
    .cards-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 14px; }
    .loc-card { background: #fff; border-radius: var(--r2); padding: 18px; box-shadow: var(--shadow); border: 1.5px solid transparent; transition: all .18s; animation: fadeUp .35s ease both; }
    .loc-card:hover { border-color: var(--gold); transform: translateY(-2px); box-shadow: 0 6px 24px rgba(0,0,0,.1); }
    .lc-top { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 12px; }
    .lc-badges { display: flex; flex-direction: column; align-items: flex-end; gap: 4px; }
    .lc-nom { font-size: 14px; font-weight: 700; color: var(--t1); margin-bottom: 6px; }
    .lc-contact { display: flex; flex-direction: column; gap: 3px; font-size: 12px; color: var(--t3); font-family: monospace; }
    .lc-email { font-family: sans-serif; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 180px; }
    .lc-bottom { display: flex; align-items: center; justify-content: space-between; margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--surf2); }
    .lc-actions { display: flex; gap: 5px; }

    /* États vides */
    .empty { text-align: center; padding: 60px 20px; }
    .empty-illu { font-size: 52px; margin-bottom: 14px; }
    .empty-h { font-size: 17px; font-weight: 700; color: var(--t1); margin-bottom: 7px; }
    .empty-p { font-size: 13px; color: var(--t3); margin: 0; }

    /* Pagination */
    .pager { display: flex; align-items: center; justify-content: center; gap: 10px; padding: 16px 0 4px; }
    .pager button { width: 32px; height: 32px; border-radius: 8px; border: 1.5px solid var(--bord); background: #fff; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all .14s; }
    .pager button svg { width: 14px; height: 14px; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
    .pager button:hover:not(:disabled) { background: var(--navy); color: var(--gold-l); border-color: var(--navy); }
    .pager button:disabled { opacity: .35; cursor: not-allowed; }
    .pager-pages { display: flex; gap: 5px; }
    .pager-dot { width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; border-radius: 8px; font-size: 13px; font-weight: 600; color: var(--t2); cursor: pointer; transition: all .12s; }
    .pager-dot:hover { background: var(--surf2); }
    .pager-dot.cur { background: var(--navy); color: var(--gold-l); }

    /* ══ MODAL ══ */
    .modal-bg {
      position: fixed; inset: 0;
      background: rgba(13,27,42,.6);
      backdrop-filter: blur(5px);
      z-index: 1000;
      display: flex; align-items: center; justify-content: center;
      padding: 20px;
      opacity: 0; pointer-events: none;
      transition: opacity .2s;
    }
    .modal-bg.open { opacity: 1; pointer-events: all; }
    .modal {
      background: #fff;
      border-radius: 18px;
      width: 100%; max-width: 580px; max-height: 92vh;
      display: flex; flex-direction: column;
      box-shadow: 0 30px 80px rgba(0,0,0,.25);
      transform: translateY(20px) scale(.96);
      transition: transform .25s;
      overflow: hidden;
    }
    .modal-bg.open .modal { transform: none; }

    .modal-head {
      display: flex; align-items: center; justify-content: space-between;
      padding: 20px 22px 16px;
      background: var(--navy);
      flex-shrink: 0;
    }
    .mh-left { display: flex; align-items: center; gap: 12px; }
    .mh-icon {
      width: 40px; height: 40px; border-radius: 10px;
      background: rgba(201,168,76,.18); border: 1.5px solid rgba(201,168,76,.3);
      display: flex; align-items: center; justify-content: center;
      font-size: 18px; flex-shrink: 0;
    }
    .mh-title { font-size: 16px; font-weight: 700; color: var(--gold-l); }
    .mh-sub   { font-size: 11.5px; color: rgba(255,255,255,.4); margin-top: 2px; }
    .mh-close {
      width: 28px; height: 28px; border-radius: 7px;
      border: none; background: rgba(255,255,255,.1); color: rgba(255,255,255,.5);
      display: flex; align-items: center; justify-content: center;
      cursor: pointer; transition: all .14s; flex-shrink: 0;
    }
    .mh-close svg { width: 13px; height: 13px; }
    .mh-close:hover { background: rgba(192,57,43,.4); color: #fff; }

    .modal-progress { padding: 14px 22px 10px; background: var(--surf); border-bottom: 1px solid var(--bord); flex-shrink: 0; }
    .mp-track { height: 4px; background: var(--bord); border-radius: 4px; overflow: hidden; margin-bottom: 10px; }
    .mp-fill  { height: 100%; background: var(--gold); border-radius: 4px; transition: width .3s ease; }
    .mp-steps { display: flex; justify-content: space-between; }
    .mp-steps span { font-size: 10.5px; font-weight: 600; color: var(--t3); transition: color .2s; }
    .mp-steps span.cur  { color: var(--gold-d); }
    .mp-steps span.done { color: var(--ok); }

    .modal-body { flex: 1; overflow-y: auto; padding: 20px 22px; }
    .modal-body::-webkit-scrollbar { width: 4px; }
    .modal-body::-webkit-scrollbar-thumb { background: var(--bord); border-radius: 4px; }
    .step-head { font-size: 12.5px; font-weight: 700; color: var(--navy); padding-bottom: 12px; margin-bottom: 16px; border-bottom: 1px solid var(--surf2); }
    .fg-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 13px; }
    .fg { display: flex; flex-direction: column; gap: 5px; }
    .fg.span2 { grid-column: 1 / -1; }
    label { font-size: 11.5px; font-weight: 700; color: var(--t2); }
    label em { color: var(--late); font-style: normal; margin-left: 2px; }
    .fc { padding: 9px 11px; border: 1.5px solid var(--bord); border-radius: 8px; font-size: 13px; color: var(--t1); font-family: inherit; outline: none; transition: border-color .15s, box-shadow .15s; background: #fff; }
    .fc:focus { border-color: var(--gold); box-shadow: 0 0 0 3px rgba(201,168,76,.1); }
    .fc::placeholder { color: var(--t3); }
    .ta { resize: none; }
    .fe { font-size: 11px; color: var(--late); }
    .drop-zone { border: 2px dashed var(--bord); border-radius: 10px; padding: 22px; text-align: center; cursor: pointer; transition: all .18s; margin-top: 2px; }
    .drop-zone:hover, .drop-zone.has { border-color: var(--gold); background: rgba(201,168,76,.03); }
    .dz-empty { display: flex; flex-direction: column; align-items: center; gap: 6px; color: var(--t3); font-size: 13px; }
    .dz-empty span { font-size: 26px; }
    .dz-empty p { margin: 0; }
    .dz-img { max-height: 110px; border-radius: 8px; }
    .drop-sm { border: 1.5px dashed var(--bord); border-radius: 8px; padding: 10px 13px; cursor: pointer; font-size: 13px; color: var(--t3); transition: all .16s; }
    .drop-sm:hover { border-color: var(--gold); }
    .doc-ok { color: var(--ok); font-weight: 600; }
    .recap { background: var(--surf); border-radius: 10px; padding: 14px 16px; border: 1px solid var(--bord); }
    .recap-row { display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid var(--bord); font-size: 13px; }
    .recap-row:last-child { border: none; }
    .recap-row span { color: var(--t3); font-size: 12px; }
    .recap-row strong { color: var(--t1); font-weight: 600; }
    .banner { display: flex; align-items: center; gap: 8px; padding: 11px 14px; border-radius: 9px; font-size: 13px; font-weight: 600; margin-top: 12px; }
    .banner.ok  { background: var(--ok-bg);  border: 1px solid var(--ok);   color: var(--ok); }
    .banner.err { background: var(--late-bg); border: 1px solid var(--late); color: var(--late); }

    .modal-foot { padding: 13px 22px; border-top: 1px solid var(--bord); background: var(--surf); display: flex; align-items: center; justify-content: space-between; flex-shrink: 0; }
    .mf-right { display: flex; gap: 8px; }
    .mf-cancel { background: none; border: none; cursor: pointer; font-size: 13px; color: var(--t3); padding: 8px; font-family: inherit; }
    .mf-cancel:hover { color: var(--late); }
    .mf-prev { padding: 9px 16px; border-radius: 8px; background: #fff; color: var(--t2); border: 1.5px solid var(--bord); font-size: 13px; font-weight: 600; cursor: pointer; font-family: inherit; transition: all .14s; }
    .mf-prev:hover { border-color: var(--navy); color: var(--navy); }
    .mf-next { padding: 9px 20px; border-radius: 8px; background: var(--navy); color: var(--gold-l); border: none; font-size: 13px; font-weight: 700; cursor: pointer; font-family: inherit; transition: all .15s; }
    .mf-next:disabled { opacity: .4; cursor: not-allowed; }
    .mf-next:not(:disabled):hover { background: var(--navy2); }
    .mf-submit { padding: 9px 22px; border-radius: 8px; min-width: 155px; background: linear-gradient(135deg, var(--gold-d), var(--gold)); color: #fff; border: none; font-size: 13px; font-weight: 700; cursor: pointer; font-family: inherit; display: flex; align-items: center; justify-content: center; transition: all .18s; }
    .mf-submit:disabled { opacity: .4; cursor: not-allowed; }
    .mf-submit:not(:disabled):hover { box-shadow: 0 4px 14px rgba(201,168,76,.45); transform: translateY(-1px); }
    .spin { width: 16px; height: 16px; border: 2.5px solid rgba(255,255,255,.3); border-top-color: #fff; border-radius: 50%; animation: rot .7s linear infinite; display: inline-block; }
    @keyframes rot { to { transform: rotate(360deg); } }
  `]
})
export class LocatairesListComponent implements OnInit {

  private svc  = inject(LocatairesService);
  private http = inject(HttpClient);
  private fb   = inject(FormBuilder);

  liste   = signal<PagedList<LocataireListItemDto>>({ items:[], totalCount:0, page:1, pageSize:20, totalPages:0, hasNext:false, hasPrevious:false });
  loading = signal(false);
  page    = 1; searchTerm = ''; filtreActif = ''; vue: 'liste'|'cartes' = 'liste';
  private timer: any;

  nbActifs()   { return this.liste().items.filter(l => l.estActif).length; }
  nbAJour()    { return this.liste().items.filter(l => this.estAJour(l)).length; }
  nbEnRetard() { return this.liste().items.filter(l => l.estActif && l.nbContratsActifs > 0 && !this.estAJour(l)).length; }

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

  ngOnInit() { this.load(); }

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

  pageRange(): number[] {
    const t = this.liste().totalPages;
    const c = this.page;
    const r: number[] = [];
    for (let i = Math.max(1, c-2); i <= Math.min(t, c+2); i++) r.push(i);
    return r;
  }

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

  estAJour(l: LocataireListItemDto): boolean {
    return l.estActif && l.nbContratsActifs > 0;
  }

  avatarColor(nom: string): string {
    const colors = ['#0D1B2A','#1B3A5C','#0F3460','#1A4731','#533483','#7B3F00','#2B4865'];
    let h = 0; for (const c of nom) h = (h*31 + c.charCodeAt(0)) & 0xFFFFFF;
    return colors[Math.abs(h) % colors.length];
  }
  initiales(nom: string): string {
    return nom.split(' ').map((w:string) => w[0]).join('').toUpperCase().slice(0,2);
  }

  ouvrirCreation() {
    this.form.reset({ typeDocumentId:'CarteNationaleIdentite' });
    this.photoFile=undefined; this.photoPreview=undefined; this.docFile=undefined;
    this.etape.set(1); this.successMsg.set(''); this.errorMsg.set('');
    this.showCreation.set(true);
  }
  fermerCreation() { this.showCreation.set(false); }
  onOverlayClick(e:Event) { if ((e.target as HTMLElement).classList.contains('modal-bg')) this.fermerCreation(); }

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