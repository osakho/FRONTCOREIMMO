import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ContratsLocationService, ProduitsService, LocatairesService } from '../../../core/services/api.services';
import { ContratLocationListItemDto, PagedList, StatutContrat } from '../../../core/models/models';

@Component({
  selector: 'kdi-contrats-location-list',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, ReactiveFormsModule],
  template: `
    <div class="page-enter">

      <!-- ── PAGE HEADER ── -->
      <div class="page-header">
        <div>
          <div class="page-title"><span class="mi">description</span> Contrats de location</div>
          <div class="page-subtitle">Bail · Workflow d'activation complet</div>
        </div>
        <div class="header-actions">
          <button class="btn btn-secondary"><span class="mi">download</span> Export</button>
          <button class="btn btn-gold" (click)="ouvrirModal()">
            <span class="mi">add</span> Nouveau contrat
          </button>
        </div>
      </div>

      <!-- ── FILTER CHIPS ── -->
      <div class="filter-bar" style="margin-bottom:16px">
        <button class="filter-chip" [class.active]="filtreStatut===''"          (click)="setFiltre('')">Tous</button>
        <button class="filter-chip" [class.active]="filtreStatut==='Brouillon'" (click)="setFiltre('Brouillon')">Brouillons</button>
        <button class="filter-chip" [class.active]="filtreStatut==='Actif'"     (click)="setFiltre('Actif')">Actifs</button>
        <button class="filter-chip" [class.active]="filtreStatut==='EnAttente'" (click)="setFiltre('EnAttente')">
          <span class="mi mi-sm" style="color:var(--wa)">hourglass_empty</span> En attente activation
        </button>
        <button class="filter-chip" [class.active]="filtreStatut==='Resilie'"   (click)="setFiltre('Resilie')">Résiliés</button>
        <div class="filter-spacer"></div>
        <span style="font-size:.75rem;color:var(--t3);align-self:center">{{ liste().totalCount }} contrats</span>
        <div class="search-inline">
          <span class="mi">search</span>
          <input placeholder="Locataire, N° contrat…" [(ngModel)]="search" (ngModelChange)="onSearch()">
        </div>
      </div>

      <!-- ── LISTE ── -->
      <div *ngIf="loading()" style="text-align:center;padding:48px;color:var(--t3)">
        <span class="mi" style="font-size:32px;display:block;margin-bottom:8px">hourglass_empty</span>Chargement…
      </div>

      <div *ngIf="!loading()">
        <div *ngIf="liste().items.length===0" class="card">
          <div class="empty-state">
            <span class="mi">description</span>
            <div class="empty-title">Aucun contrat trouvé</div>
            <div class="empty-sub">Créez le premier contrat de location</div>
            <button class="btn btn-gold" style="margin-top:8px" (click)="ouvrirModal()">
              <span class="mi">add</span> Nouveau contrat
            </button>
          </div>
        </div>

        <div class="contrats-list">
          <div *ngFor="let c of liste().items" class="contrat-row"
               [class.cr-actif]="c.statutLabel==='Actif'"
               [class.cr-brouillon]="c.statutLabel==='Brouillon'"
               [class.cr-resilie]="c.statutLabel==='Resilie'||c.statutLabel==='Resilié'"
               [class.cr-retard]="c.estEnRetard">
            <div class="cr-numero">
              <div style="font-family:monospace;font-weight:700;font-size:.82rem;color:var(--gold)">{{ c.numero }}</div>
              <div class="cell-sub">{{ c.dateEntree | date:'dd/MM/yyyy' }}</div>
            </div>
            <div class="cr-locataire">
              <div class="cell-avatar">
                <div class="avatar" style="width:36px;height:36px;font-size:.7rem" [style.background]="avatarColor(c.locataireNom)">{{ initiales(c.locataireNom) }}</div>
                <div>
                  <div class="cell-name">{{ c.locataireNom }}</div>
                  <div class="cell-sub" style="color:var(--t3)">—</div>
                </div>
              </div>
            </div>
            <div class="cr-produit">
              <div style="display:flex;align-items:center;gap:6px">
                <span class="mi mi-sm" style="color:var(--gold)">meeting_room</span>
                <span style="font-family:monospace;font-weight:700;font-size:.82rem;color:var(--navy)">{{ c.produitCode }}</span>
              </div>
              <div class="cell-sub">—</div>
            </div>
            <div class="cr-loyer">
              <div style="font-family:'Syne',sans-serif;font-weight:800;font-size:1.05rem;color:var(--t1)">
                {{ c.loyer | number:'1.0-0' }}<span style="font-size:.65rem;font-weight:500;color:var(--t3)"> MRU/mois</span>
              </div>
              <div class="cell-sub">Mensuel</div>
            </div>
            <div class="cr-checklist">
              <div class="check-item ok"><span class="mi" style="font-size:13px">check_circle</span> Signé</div>
              <div class="check-item" [class.ok]="c.statutLabel==='Actif'">
                <span class="mi" style="font-size:13px">{{ c.statutLabel==='Actif' ? 'check_circle' : 'radio_button_unchecked' }}</span> EDL entrée
              </div>
              <div class="check-item" [class.ok]="c.statutLabel==='Actif'">
                <span class="mi" style="font-size:13px">{{ c.statutLabel==='Actif' ? 'check_circle' : 'radio_button_unchecked' }}</span> Caution
              </div>
              <div *ngIf="c.statutLabel==='Brouillon'" class="check-item warn">
                <span class="mi" style="font-size:13px">warning</span> EDL manquant
              </div>
            </div>
            <div class="cr-statut">
              <span class="badge"
                [class.badge-green]="c.statutLabel==='Actif'"
                [class.badge-gray]="c.statutLabel==='Brouillon'"
                [class.badge-amber]="c.statutLabel==='EnAttente'||c.statutLabel==='Suspendu'"
                [class.badge-red]="c.statutLabel==='Resilie'||c.statutLabel==='Resilié'||c.statutLabel==='Termine'">
                {{ statutDisplay(c.statutLabel) }}
              </span>
            </div>
            <div class="cr-actions">
              <a [routerLink]="['/contrats-location', c.id]" class="action-btn view" title="Voir"><span class="mi">description</span></a>
              <button *ngIf="c.statutLabel==='Brouillon'" class="btn btn-secondary btn-sm" style="font-size:.72rem" (click)="activer(c.id)">
                <span class="mi">hourglass_empty</span> EDL
              </button>
              <a *ngIf="c.statutLabel==='Actif'" [routerLink]="['/collectes/saisir']" [queryParams]="{contratId:c.id}"
                 class="btn btn-gold btn-sm" style="font-size:.72rem">
                <span class="mi">payments</span> Bail
              </a>
              <button *ngIf="c.statutLabel==='Actif'||c.statutLabel==='Brouillon'"
                      class="action-btn del" title="Résilier" (click)="ouvrirResiliation(c.id)">
                <span class="mi">cancel</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Pagination -->
        <div class="pagination" *ngIf="liste().totalPages>1" style="margin-top:16px">
          <div class="pagination-info">{{ (page-1)*20+1 }}–{{ min(page*20, liste().totalCount) }} sur {{ liste().totalCount }}</div>
          <div class="pagination-pages">
            <button class="page-btn" [disabled]="page===1" (click)="goPage(page-1)"><span class="mi">chevron_left</span></button>
            <button *ngFor="let p of pages()" class="page-btn" [class.active]="p===page" (click)="goPage(p)">{{ p }}</button>
            <button class="page-btn" [disabled]="!liste().hasNext" (click)="goPage(page+1)"><span class="mi">chevron_right</span></button>
          </div>
        </div>
      </div>
    </div>

    <!-- ══════════════════════════════════════════════════════════
         MODAL NOUVEAU CONTRAT — 3 ÉTAPES
    ══════════════════════════════════════════════════════════════ -->
    <div class="modal-overlay" [class.open]="modalOuvert()">
      <div class="nv-modal">

        <!-- Header -->
        <div class="nv-header">
          <div class="modal-title" style="font-size:.95rem">
            <span class="mi" style="color:var(--gold)">add_circle</span>
            Nouveau contrat de location
          </div>
          <button class="modal-close" (click)="fermerModal()"><span class="mi">close</span></button>
        </div>

        <!-- Stepper -->
        <div class="stepper">
          <ng-container *ngFor="let s of [1,2,3]; let last=last">
            <div class="stepper-step">
              <div class="step-dot" [class.step-active]="etape()===s" [class.step-done]="etape()>s">
                <span *ngIf="etape()<=s">{{ s }}</span>
                <span *ngIf="etape()>s" class="mi" style="font-size:14px">check</span>
              </div>
              <div class="step-label">{{ stepLabels[s-1] }}</div>
            </div>
            <div *ngIf="!last" class="step-line" [class.step-line-done]="etape()>s"></div>
          </ng-container>
        </div>

        <!-- Body -->
        <div class="nv-body">

          <!-- ── ÉTAPE 1 : Bien & Locataire ── -->
          <div *ngIf="etape()===1">
            <div class="step-title">Sélection du bien &amp; du locataire</div>

            <!-- Produit -->
            <div class="form-group" style="margin-bottom:14px">
              <label class="form-label">Produit locatif libre</label>
              <ng-container *ngIf="!produitSel">
                <input type="text" class="form-control" placeholder="Rechercher un produit…"
                       [value]="searchProduit" (input)="onSearchProduit($event)">
                <div *ngIf="produitResultats.length" class="ac-list">
                  <div *ngFor="let p of produitResultats" class="ac-item" (click)="selectProduit(p)">
                    <span class="tag">{{ p.code }}</span>
                    <span style="flex:1;font-size:.8rem">{{ p.proprieteLibelle }}</span>
                    <span style="font-weight:600;font-size:.8rem;color:var(--ok)">{{ p.loyerReference | number:'1.0-0' }} MRU/mois</span>
                  </div>
                </div>
                <!-- Fallback select si pas de résultats de recherche -->
                <select *ngIf="!produitResultats.length && !searchProduit" class="form-control" style="margin-top:8px"
                        (change)="onSelectProduit($event)">
                  <option value="" disabled selected>— ou choisir dans la liste —</option>
                  <option *ngFor="let p of produitsAll()" [value]="p.id">{{ p.code }} · {{ p.proprieteLibelle }} ({{ p.loyerReference | number:'1.0-0' }} MRU)</option>
                </select>
              </ng-container>
              <div *ngIf="produitSel" class="selected-item">
                <span class="mi mi-sm" style="color:var(--gold)">meeting_room</span>
                <div style="flex:1;font-size:.82rem">
                  <strong>{{ produitSel.code }}</strong> · {{ produitSel.proprieteLibelle }}
                  <span style="color:var(--ok);font-weight:600;margin-left:8px">{{ produitSel.loyerReference | number:'1.0-0' }} MRU/mois</span>
                </div>
                <button class="modal-close" style="width:24px;height:24px" (click)="clearProduit()"><span class="mi" style="font-size:14px">close</span></button>
              </div>
            </div>

            <!-- Locataire -->
            <div class="form-group">
              <label class="form-label">Locataire</label>
              <ng-container *ngIf="!locataireSel">
                <input type="text" class="form-control" placeholder="Rechercher un locataire…"
                       [value]="searchLocataire" (input)="onSearchLocataire($event)">
                <div *ngIf="locataireResultats.length" class="ac-list">
                  <div *ngFor="let l of locataireResultats" class="ac-item" (click)="selectLocataire(l)">
                    <div class="avatar" style="width:26px;height:26px;font-size:.58rem;flex-shrink:0" [style.background]="avatarColor(l.nomComplet)">{{ initiales(l.nomComplet) }}</div>
                    <span style="flex:1;font-size:.8rem"><strong>{{ l.nomComplet }}</strong></span>
                    <span style="font-size:.75rem;color:var(--t3)">{{ l.telephone }}</span>
                  </div>
                </div>
                <select *ngIf="!locataireResultats.length && !searchLocataire" class="form-control" style="margin-top:8px"
                        (change)="onSelectLocataire($event)">
                  <option value="" disabled selected>— ou choisir dans la liste —</option>
                  <option *ngFor="let l of locatairesAll()" [value]="l.id">{{ l.nomComplet }} — {{ l.telephone }}</option>
                </select>
              </ng-container>
              <div *ngIf="locataireSel" class="selected-item">
                <div class="avatar" style="width:28px;height:28px;font-size:.6rem;flex-shrink:0" [style.background]="avatarColor(locataireSel.nomComplet)">{{ initiales(locataireSel.nomComplet) }}</div>
                <div style="flex:1;font-size:.82rem">
                  <strong>{{ locataireSel.nomComplet }}</strong>
                  <span style="color:var(--t3);margin-left:8px">{{ locataireSel.telephone }}</span>
                </div>
                <button class="modal-close" style="width:24px;height:24px" (click)="clearLocataire()"><span class="mi" style="font-size:14px">close</span></button>
              </div>
            </div>
          </div>

          <!-- ── ÉTAPE 2 : Conditions financières & Dates ── -->
          <div *ngIf="etape()===2" [formGroup]="form">
            <div class="step-title">Conditions financières &amp; durée</div>
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Loyer mensuel (MRU) *</label>
                <input type="number" class="form-control" formControlName="loyer">
              </div>
              <div class="form-group">
                <label class="form-label">Caution (MRU) *</label>
                <input type="number" class="form-control" formControlName="caution">
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Avance loyer (MRU)</label>
                <input type="number" class="form-control" formControlName="avanceLoyer">
              </div>
              <div class="form-group">
                <label class="form-label">Périodicité</label>
                <select class="form-control" formControlName="periodicite">
                  <option value="Mensuel">Mensuel</option>
                  <option value="Bimensuel">Bimensuel</option>
                  <option value="Trimestriel">Trimestriel</option>
                </select>
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Date d'entrée *</label>
                <input type="date" class="form-control" formControlName="dateEntree">
              </div>
              <div class="form-group">
                <label class="form-label">Date de sortie prévue</label>
                <input type="date" class="form-control" formControlName="dateSortiePrevue">
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Jour début paiement</label>
                <input type="number" min="1" max="28" class="form-control" formControlName="jourDebutPaiement">
              </div>
              <div class="form-group">
                <label class="form-label">Jour limite paiement</label>
                <input type="number" min="1" max="28" class="form-control" formControlName="jourFinPaiement">
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">Conditions particulières</label>
              <textarea class="form-control" rows="2" formControlName="conditionsParticulieres"
                        placeholder="Clauses spécifiques…" style="resize:vertical"></textarea>
            </div>
          </div>

          <!-- ── ÉTAPE 3 : Checklist d'entrée ── -->
          <div *ngIf="etape()===3" [formGroup]="form">
            <div class="step-title">Checklist — Conditions d'entrée</div>

            <!-- Indicateur avant-soumission -->
            <div class="checklist-banner">
              <span class="ci" [class.ok]="form.get('contratSigne')?.value"><span class="mi" style="font-size:13px">{{ form.get('contratSigne')?.value ? 'check_circle' : 'radio_button_unchecked' }}</span> Contrat signé</span>
              <span class="ci" [class.ok]="form.get('edlEntreeValide')?.value"><span class="mi" style="font-size:13px">{{ form.get('edlEntreeValide')?.value ? 'check_circle' : 'radio_button_unchecked' }}</span> État des lieux</span>
              <span class="ci" [class.ok]="form.get('cautionReglee')?.value"><span class="mi" style="font-size:13px">{{ form.get('cautionReglee')?.value ? 'check_circle' : 'radio_button_unchecked' }}</span> Caution</span>
              <span class="ci" [class.ok]="form.get('avanceLoyerReglee')?.value"><span class="mi" style="font-size:13px">{{ form.get('avanceLoyerReglee')?.value ? 'check_circle' : 'radio_button_unchecked' }}</span> Avance</span>
              <span class="ci" [class.ok]="photosAvant.length>0"><span class="mi" style="font-size:13px">{{ photosAvant.length>0 ? 'check_circle' : 'radio_button_unchecked' }}</span> Photos</span>
            </div>

            <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:16px">
              <label class="checklist-item">
                <input type="checkbox" formControlName="cautionReglee">
                <span class="mi" style="font-size:18px" [style.color]="form.get('cautionReglee')?.value ? 'var(--ok)' : 'var(--t4)'">{{ form.get('cautionReglee')?.value ? 'check_circle' : 'radio_button_unchecked' }}</span>
                Caution réglée
              </label>
              <label class="checklist-item">
                <input type="checkbox" formControlName="avanceLoyerReglee">
                <span class="mi" style="font-size:18px" [style.color]="form.get('avanceLoyerReglee')?.value ? 'var(--ok)' : 'var(--t4)'">{{ form.get('avanceLoyerReglee')?.value ? 'check_circle' : 'radio_button_unchecked' }}</span>
                Avance loyer réglée
              </label>
              <label class="checklist-item">
                <input type="checkbox" formControlName="contratSigne">
                <span class="mi" style="font-size:18px" [style.color]="form.get('contratSigne')?.value ? 'var(--ok)' : 'var(--t4)'">{{ form.get('contratSigne')?.value ? 'check_circle' : 'radio_button_unchecked' }}</span>
                Contrat signé par les deux parties
              </label>
              <label class="checklist-item">
                <input type="checkbox" formControlName="edlEntreeValide">
                <span class="mi" style="font-size:18px" [style.color]="form.get('edlEntreeValide')?.value ? 'var(--ok)' : 'var(--t4)'">{{ form.get('edlEntreeValide')?.value ? 'check_circle' : 'radio_button_unchecked' }}</span>
                État des lieux d'entrée signé
              </label>
            </div>

            <!-- Index compteurs si produit concerné -->
            <div *ngIf="produitSel?.hasCompteurElec || produitSel?.hasCompteurEau" class="form-row" style="margin-bottom:14px">
              <div class="form-group" *ngIf="produitSel?.hasCompteurElec">
                <label class="form-label"><span class="mi mi-sm">bolt</span> Index électricité</label>
                <input type="number" class="form-control" formControlName="indexElecEntree" placeholder="0000">
              </div>
              <div class="form-group" *ngIf="produitSel?.hasCompteurEau">
                <label class="form-label"><span class="mi mi-sm">water_drop</span> Index eau</label>
                <input type="number" class="form-control" formControlName="indexEauEntree" placeholder="0000">
              </div>
            </div>

            <!-- Photos -->
            <div class="form-group">
              <label class="form-label">Photos avant remise des clés</label>
              <div class="file-zone" [class.has-files]="photosAvant.length" (click)="photosInput.click()">
                <input #photosInput type="file" accept="image/*" multiple style="display:none" (change)="onPhotos($event)">
                <span class="mi" style="font-size:22px;color:var(--t4)">{{ photosAvant.length ? 'check_circle' : 'add_photo_alternate' }}</span>
                <span *ngIf="!photosAvant.length" style="font-size:.8rem;color:var(--t3)">Ajouter des photos</span>
                <span *ngIf="photosAvant.length" style="font-size:.8rem;color:var(--ok);font-weight:600">{{ photosAvant.length }} photo(s) jointe(s)</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="nv-footer">
          <button class="btn btn-secondary" (click)="etape()>1 ? etape.set(etape()-1) : fermerModal()">
            <span class="mi">{{ etape()>1 ? 'arrow_back' : 'close' }}</span>
            {{ etape()>1 ? 'Précédent' : 'Annuler' }}
          </button>
          <button *ngIf="etape()<3" class="btn btn-primary" [disabled]="!etapeValide()" (click)="etape.set(etape()+1)">
            Suivant <span class="mi">arrow_forward</span>
          </button>
          <button *ngIf="etape()===3" class="btn btn-gold" [disabled]="submitting()||form.invalid" (click)="soumettre()">
            <span class="mi">{{ submitting() ? 'hourglass_empty' : 'check_circle' }}</span>
            {{ submitting() ? 'Création…' : 'Créer le bail' }}
          </button>
        </div>
      </div>
    </div>

    <!-- ══ MODAL RÉSILIATION ═════════════════════════════════════ -->
    <div class="modal-overlay" [class.open]="showModalResiliation">
      <div class="modal" style="width:460px">
        <div class="modal-header">
          <div class="modal-title"><span class="mi">cancel</span> Résilier le contrat</div>
          <button class="modal-close" (click)="annulerResiliation()"><span class="mi">close</span></button>
        </div>
        <div class="modal-body">
          <div class="alert-box danger" style="margin-bottom:14px">
            <div class="alert-title"><span class="mi">warning</span> Action irréversible</div>
            <p style="font-size:.8rem">La résiliation est définitive et ne peut pas être annulée.</p>
          </div>
          <div class="form-group" style="margin-bottom:12px">
            <label class="form-label">Motif de résiliation *</label>
            <textarea [(ngModel)]="motifResiliation" class="form-control" rows="3"
                      placeholder="Ex: Départ volontaire, non-paiement…" style="resize:vertical"></textarea>
          </div>
          <div class="form-group">
            <label class="form-label">Date de résiliation *</label>
            <input type="date" [(ngModel)]="dateResiliation" class="form-control">
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" (click)="annulerResiliation()">Annuler</button>
          <button class="btn btn-danger" [disabled]="!motifResiliation||!dateResiliation" (click)="confirmerResiliation()">
            <span class="mi">cancel</span> Confirmer
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    /* ── Contrat rows ── */
    .contrats-list { display:flex; flex-direction:column; gap:2px; }
    .contrat-row {
      display:grid; grid-template-columns:130px 200px 130px 160px 140px 100px auto;
      align-items:center; gap:12px; background:var(--wh); border:1px solid var(--bord);
      border-left:3px solid var(--bord2); border-radius:var(--r); padding:14px 16px; transition:var(--tr);
    }
    .contrat-row:hover { box-shadow:var(--s1); }
    .cr-actif     { border-left-color:var(--ok); }
    .cr-brouillon { border-left-color:var(--wa); }
    .cr-resilie   { border-left-color:var(--er); opacity:.75; }
    .cr-retard    { background:#fffcf4; border-left-color:var(--er); }
    .check-item   { display:flex; align-items:center; gap:4px; font-size:.7rem; color:var(--t3); line-height:1.6; }
    .check-item .mi { color:var(--t4); }
    .check-item.ok  { color:var(--ok); } .check-item.ok .mi  { color:var(--ok); }
    .check-item.warn{ color:var(--wa); } .check-item.warn .mi{ color:var(--wa); }
    .cr-actions   { display:flex; align-items:center; gap:4px; justify-content:flex-end; }

    /* ── Modal nouveau contrat ── */
    .nv-modal {
      background: var(--wh);
      border-radius: var(--r2);
      width: 520px;
      max-width: 94vw;
      max-height: 90vh;
      overflow-y: auto;
      box-shadow: var(--s3);
      display: flex;
      flex-direction: column;
    }
    .nv-header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 18px 22px 14px; border-bottom: 1px solid var(--bord);
    }
    .nv-body   { padding: 20px 22px; flex: 1; }
    .nv-footer {
      display: flex; align-items: center; justify-content: space-between;
      padding: 14px 22px; border-top: 1px solid var(--bord);
      background: var(--surf);
    }

    /* Stepper */
    .stepper {
      display: flex; align-items: center; justify-content: center;
      padding: 18px 22px 0; gap: 0;
    }
    .stepper-step { display:flex; flex-direction:column; align-items:center; gap:4px; }
    .step-dot {
      width: 34px; height: 34px; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      background: var(--surf2); color: var(--t3);
      font-family: 'Syne', sans-serif; font-weight: 700; font-size: .82rem;
      transition: var(--tr);
    }
    .step-active { background: var(--navy); color: #fff; box-shadow: 0 0 0 4px rgba(14,28,56,.12); }
    .step-done   { background: var(--ok);   color: #fff; }
    .step-label  { font-size: .63rem; color: var(--t3); text-align: center; width: 80px; }
    .step-line   { flex: 1; height: 2px; background: var(--bord2); margin: 0 6px; margin-bottom: 18px; min-width: 36px; }
    .step-line-done { background: var(--ok); }

    /* Step title */
    .step-title {
      font-size: .85rem; font-weight: 600; color: var(--navy);
      margin-bottom: 16px; padding-bottom: 10px; border-bottom: 1px solid var(--bord);
    }

    /* Autocomplete */
    .ac-list { border:1px solid var(--bord); border-radius:8px; overflow:hidden; margin-top:6px; background:var(--wh); max-height:200px; overflow-y:auto; }
    .ac-item { display:flex; align-items:center; gap:8px; padding:9px 12px; cursor:pointer; border-bottom:1px solid var(--bord); font-size:.8rem; }
    .ac-item:last-child { border:none; }
    .ac-item:hover { background:var(--surf); }

    /* Selected item */
    .selected-item {
      display:flex; align-items:center; gap:10px;
      background:var(--surf); border:1px solid var(--bord2);
      border-radius:8px; padding:10px 12px;
    }

    /* Checklist banner */
    .checklist-banner {
      display:flex; gap:8px; flex-wrap:wrap;
      background:var(--surf); border-radius:8px; padding:10px 12px; margin-bottom:14px;
    }
    .ci {
      display:flex; align-items:center; gap:4px;
      padding:3px 10px; border-radius:10px; font-size:.72rem; font-weight:500;
      background:var(--surf2); color:var(--t3);
    }
    .ci.ok { background:#d1fae5; color:#065f46; }

    /* Checklist items */
    .checklist-item {
      display:flex; align-items:center; gap:10px;
      padding:10px 12px; border-radius:8px; cursor:pointer;
      font-size:.82rem; color:var(--t1);
      background:var(--surf); border:1px solid var(--bord);
      transition:var(--tr);
    }
    .checklist-item:hover { background:var(--surf2); }
    .checklist-item input[type=checkbox] { display:none; }

    /* File zone */
    .file-zone {
      display:flex; align-items:center; justify-content:center; flex-direction:column; gap:4px;
      border:2px dashed var(--bord2); border-radius:8px; padding:16px; cursor:pointer;
      transition:var(--tr);
    }
    .file-zone:hover, .file-zone.has-files { border-color:var(--ok); background:#f0fdf4; }
  `]
})
export class ContratsLocationListComponent implements OnInit {
  private svc          = inject(ContratsLocationService);
  private produitSvc   = inject(ProduitsService);
  private locataireSvc = inject(LocatairesService);
  private fb           = inject(FormBuilder);

  // ── Liste ──
  liste = signal<PagedList<ContratLocationListItemDto>>({
    items: [], totalCount: 0, page: 1, pageSize: 20, totalPages: 0, hasNext: false, hasPrevious: false
  });
  loading = signal(false);
  page = 1; search = ''; filtreStatut = ''; timer: any;
  min = Math.min;

  pages = computed(() => {
    const tp = this.liste().totalPages, p = this.page;
    const arr: number[] = [];
    for (let i = Math.max(1, p-2); i <= Math.min(tp, p+2); i++) arr.push(i);
    return arr;
  });

  // ── Modal nouveau contrat ──
  modalOuvert = signal(false);
  etape       = signal(1);
  submitting  = signal(false);
  stepLabels  = ['Bien & locataire', 'Conditions', 'Checklist'];

  produitsAll   = signal<any[]>([]);
  locatairesAll = signal<any[]>([]);
  produitResultats:   any[] = [];
  locataireResultats: any[] = [];
  searchProduit   = '';
  searchLocataire = '';
  produitSel:   any = null;
  locataireSel: any = null;
  photosAvant:  File[] = [];
  timer1: any; timer2: any;

  form = this.fb.group({
    loyer:                   [null as number|null, [Validators.required, Validators.min(1)]],
    caution:                 [null as number|null, [Validators.required, Validators.min(0)]],
    avanceLoyer:             [null as number|null, [Validators.required, Validators.min(0)]],
    periodicite:             ['Mensuel', Validators.required],
    dateEntree:              [new Date().toISOString().slice(0,10), Validators.required],
    dateSortiePrevue:        [''],
    jourDebutPaiement:       [1,  [Validators.required, Validators.min(1), Validators.max(28)]],
    jourFinPaiement:         [5,  [Validators.required, Validators.min(1), Validators.max(28)]],
    conditionsParticulieres: [''],
    cautionReglee:           [false],
    avanceLoyerReglee:       [false],
    contratSigne:            [false],
    edlEntreeValide:         [false],
    indexElecEntree:         [null as number|null],
    indexEauEntree:          [null as number|null],
  });

  // ── Modal résiliation ──
  showModalResiliation = false;
  contratAResilier: string|null = null;
  motifResiliation = '';
  dateResiliation  = new Date().toISOString().slice(0,10);

  ngOnInit() {
    this.load();
    this.produitSvc.getAll({ statut: 'Libre' as any, pageSize: 100 })
      .subscribe(r => this.produitsAll.set(r.items));
    this.locataireSvc.getAll(1, 100)
      .subscribe(r => this.locatairesAll.set(r.items));
  }

  load() {
    this.loading.set(true);
    this.svc.getAll({ statut: this.filtreStatut as StatutContrat || undefined, search: this.search || undefined, page: this.page })
      .subscribe({ next: r => { this.liste.set(r); this.loading.set(false); }, error: () => this.loading.set(false) });
  }

  setFiltre(s: string) { this.filtreStatut = s; this.page = 1; this.load(); }
  onSearch() { clearTimeout(this.timer); this.timer = setTimeout(() => { this.page = 1; this.load(); }, 400); }
  goPage(p: number) { this.page = p; this.load(); }

  // ── Modal ──
  ouvrirModal() {
    this.etape.set(1);
    this.produitSel = null; this.locataireSel = null;
    this.searchProduit = ''; this.searchLocataire = '';
    this.produitResultats = []; this.locataireResultats = [];
    this.photosAvant = [];
    this.form.reset({
      loyer: null, caution: null, avanceLoyer: null, periodicite: 'Mensuel',
      dateEntree: new Date().toISOString().slice(0,10), dateSortiePrevue: '',
      jourDebutPaiement: 1, jourFinPaiement: 5, conditionsParticulieres: '',
      cautionReglee: false, avanceLoyerReglee: false, contratSigne: false, edlEntreeValide: false,
      indexElecEntree: null, indexEauEntree: null
    });
    this.modalOuvert.set(true);
  }

  fermerModal() { this.modalOuvert.set(false); }

  // Recherche produit
  onSearchProduit(e: Event) {
    const val = (e.target as HTMLInputElement).value; this.searchProduit = val;
    clearTimeout(this.timer1);
    if (val.length < 2) { this.produitResultats = []; return; }
    this.timer1 = setTimeout(() =>
      this.produitSvc.getAll({ search: val, statut: 'Libre' as any })
        .subscribe(r => this.produitResultats = r.items), 350);
  }
  selectProduit(p: any) {
    this.produitSel = p; this.produitResultats = []; this.searchProduit = '';
    this.form.patchValue({ loyer: p.loyerReference, caution: p.loyerReference * 2, avanceLoyer: p.loyerReference });
  }
  onSelectProduit(e: Event) {
    const id = (e.target as HTMLSelectElement).value;
    const p = this.produitsAll().find(x => x.id === id);
    if (p) this.selectProduit(p);
  }
  clearProduit() { this.produitSel = null; this.searchProduit = ''; }

  // Recherche locataire
  onSearchLocataire(e: Event) {
    const val = (e.target as HTMLInputElement).value; this.searchLocataire = val;
    clearTimeout(this.timer2);
    if (val.length < 2) { this.locataireResultats = []; return; }
    this.timer2 = setTimeout(() =>
      this.locataireSvc.getAll(1, 10, val)
        .subscribe(r => this.locataireResultats = r.items), 350);
  }
  selectLocataire(l: any) { this.locataireSel = l; this.locataireResultats = []; this.searchLocataire = ''; }
  onSelectLocataire(e: Event) {
    const id = (e.target as HTMLSelectElement).value;
    const l = this.locatairesAll().find(x => x.id === id);
    if (l) this.selectLocataire(l);
  }
  clearLocataire() { this.locataireSel = null; this.searchLocataire = ''; }

  onPhotos(e: Event) { this.photosAvant = Array.from((e.target as HTMLInputElement).files ?? []); }

  etapeValide(): boolean {
    if (this.etape() === 1) return !!this.produitSel && !!this.locataireSel;
    if (this.etape() === 2) return !!(this.form.get('loyer')?.value) && !!(this.form.get('dateEntree')?.value);
    return true;
  }

  soumettre() {
    if (!this.produitSel || !this.locataireSel || this.form.invalid) return;
    this.submitting.set(true);
    const fd = new FormData();
    fd.append('produitLocatifId', this.produitSel.id);
    fd.append('locataireId',      this.locataireSel.id);
    Object.entries(this.form.value).forEach(([k, v]) => {
      if (v !== null && v !== undefined && v !== '') fd.append(k, String(v));
    });
    this.photosAvant.forEach(f => fd.append('photosAvant', f));
    this.svc.create(fd).subscribe({
      next: () => { this.submitting.set(false); this.fermerModal(); this.load(); },
      error: () => this.submitting.set(false)
    });
  }

  // ── Résiliation ──
  activer(id: string) {
    if (!confirm('Activer ce contrat ?')) return;
    this.svc.activer(id).subscribe({ next: () => this.load(), error: () => alert("Erreur lors de l'activation") });
  }
  ouvrirResiliation(id: string) {
    this.contratAResilier = id; this.motifResiliation = '';
    this.dateResiliation  = new Date().toISOString().slice(0,10);
    this.showModalResiliation = true;
  }
  annulerResiliation() { this.showModalResiliation = false; this.contratAResilier = null; }
  confirmerResiliation() {
    if (!this.contratAResilier || !this.motifResiliation || !this.dateResiliation) return;
    this.svc.resilier(this.contratAResilier, this.motifResiliation, new Date(this.dateResiliation)).subscribe({
      next: () => { this.annulerResiliation(); this.load(); },
      error: () => alert('Erreur lors de la résiliation')
    });
  }

  // ── Helpers ──
  statutDisplay(s: string) {
    return ({Actif:'Actif',Brouillon:'Brouillon',EnAttente:'En attente',Suspendu:'Suspendu',Termine:'Terminé',Resilie:'Résilié',Resilié:'Résilié'} as any)[s] ?? s;
  }
  initiales(nom: string) { return nom.split(' ').slice(0,2).map(n=>n[0]??'').join('').toUpperCase(); }
  avatarColor(nom: string) {
    const c=['#2057c8','#0d9f5a','#d07a0c','#0e1c38','#7b3fa8','#c9263e'];
    let h=0; for(const ch of nom) h=ch.charCodeAt(0)+((h<<5)-h);
    return c[Math.abs(h)%c.length];
  }
}