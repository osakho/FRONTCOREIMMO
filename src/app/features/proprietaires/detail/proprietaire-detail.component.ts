import { Component, inject, OnInit, signal, ViewChild, ElementRef } from '@angular/core';
import { CommonModule, DatePipe }             from '@angular/common';
import { RouterLink, ActivatedRoute, Router } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { ProprietairesService }               from '../../../core/services/api.services';
import { ProprietaireDto }                    from '../../../core/models/models';

@Component({
  selector: 'kdi-proprietaire-detail',
  standalone: true,
  imports: [CommonModule, DatePipe, RouterLink, ReactiveFormsModule],
  template: `

<div class="loading-full" *ngIf="!p()"><div class="spinner"></div></div>

<div class="page" *ngIf="p()">

  <!-- ══ HERO ══ -->
  <div class="hero">
    <div class="hero-glow"></div>
    <div class="hero-inner">
      <div class="hero-id">
        <div class="avatar-wrap">
          <img *ngIf="p()!.photoIdentiteUrl" [src]="p()!.photoIdentiteUrl" class="avatar-img" alt="Photo" />
          <div *ngIf="!p()!.photoIdentiteUrl" class="avatar-initials">
            {{ p()!.prenom[0] }}{{ p()!.nom[0] }}
          </div>
          <span class="avatar-dot" [class.ok]="p()!.estActif"></span>
        </div>
        <div class="hero-name-block">
          <div class="hero-prenom">{{ p()!.prenom }}</div>
          <div class="hero-nom">{{ p()!.nom }}</div>
          <div class="hero-contacts">
            <span class="hc">📞 {{ p()!.telephone }}</span>
            <span *ngIf="p()!.telephoneSecondaire" class="hc">📞 {{ p()!.telephoneSecondaire }}</span>
            <span *ngIf="p()!.email" class="hc">✉️ {{ p()!.email }}</span>
          </div>
          <span class="statut-pill ok"  *ngIf="p()!.estActif">● Actif</span>
          <span class="statut-pill off" *ngIf="!p()!.estActif">● Inactif</span>
        </div>
      </div>
      <div class="hero-right">
        <div class="hero-actions">
          <button class="ha-btn edit" (click)="ouvrirModal()">✏️ Modifier</button>
          <a routerLink="/proprietaires" class="ha-btn back">← Retour</a>
        </div>
        <div class="patrimoine-kpi">
          <div class="pk-val">{{ p()!.nombreProprietes }}</div>
          <div class="pk-lbl">Propriété{{ p()!.nombreProprietes !== 1 ? 's' : '' }}</div>
          <a [routerLink]="['/proprietes']" [queryParams]="{proprietaireId: p()!.id}" class="pk-link">Voir le patrimoine →</a>
        </div>
      </div>
    </div>
  </div>

  <!-- ══ CORPS ══ -->
  <div class="body-grid">
    <div class="col-l">
      <div class="card">
        <div class="card-hd"><span>👤</span><h3>Informations personnelles</h3></div>
        <div class="info-rows">
          <div class="ir"><span class="ir-lbl">Date de naissance</span><span class="ir-val">{{ p()!.dateNaissance | date:'dd/MM/yyyy' }}</span></div>
          <div class="ir"><span class="ir-lbl">Lieu de naissance</span><span class="ir-val">{{ p()!.lieuNaissance }}</span></div>
          <div class="ir"><span class="ir-lbl">Adresse</span><span class="ir-val">{{ p()!.adresse }}<span *ngIf="p()!.quartier">, {{ p()!.quartier }}</span></span></div>
          <div class="ir"><span class="ir-lbl">Document</span><span class="ir-val"><span class="doc-tag">{{ p()!.typeDocumentLabel }}</span><span class="doc-num">{{ p()!.numeroDocument }}</span></span></div>
          <div class="ir" *ngIf="p()!.telephoneSecondaire"><span class="ir-lbl">Tél. secondaire</span><span class="ir-val">{{ p()!.telephoneSecondaire }}</span></div>
        </div>
        <div class="notes-block" *ngIf="p()!.notes"><div class="nb-lbl">📝 Notes</div><div class="nb-txt">{{ p()!.notes }}</div></div>
      </div>
      <div class="card" *ngIf="p()!.documents.length">
        <div class="card-hd"><span>📎</span><h3>Documents</h3><span class="hd-count">{{ p()!.documents.length }}</span></div>
        <div class="docs-list">
          <div *ngFor="let d of p()!.documents" class="doc-row">
            <div class="dr-icon">📄</div>
            <div class="dr-info"><div class="dr-nom">{{ d.nomFichier }}</div><div class="dr-meta">{{ d.typeLabel }} · {{ d.creeLe | date:'dd/MM/yyyy' }}</div></div>
            <a [href]="d.url" target="_blank" class="dr-dl">⬇</a>
          </div>
        </div>
      </div>
    </div>
    <div class="col-r">
      <div class="card" *ngIf="p()!.comptes.length">
        <div class="card-hd"><span>🏦</span><h3>Comptes bancaires</h3></div>
        <div class="finance-list">
          <div *ngFor="let c of p()!.comptes" class="fin-row" [class.principal]="c.estPrincipal">
            <div><div class="fr-bank">{{ c.banque }}</div><div class="fr-num">{{ c.numero }}<span *ngIf="c.agence"> · {{ c.agence }}</span></div></div>
            <span class="fr-badge principal" *ngIf="c.estPrincipal">★ Principal</span>
            <span class="fr-badge sec" *ngIf="!c.estPrincipal">Secondaire</span>
          </div>
        </div>
      </div>
      <div class="card" *ngIf="p()!.plateformes.length">
        <div class="card-hd"><span>📱</span><h3>Plateformes mobiles</h3></div>
        <div class="finance-list">
          <div *ngFor="let pf of p()!.plateformes" class="fin-row" [class.principal]="pf.estPrincipal">
            <div><div class="fr-bank">{{ pf.nom }}</div><div class="fr-num">{{ pf.numero }}</div></div>
            <span class="fr-badge principal" *ngIf="pf.estPrincipal">★ Principal</span>
            <span class="fr-badge sec" *ngIf="!pf.estPrincipal">Secondaire</span>
          </div>
        </div>
      </div>
      <div class="card card-empty-pay" *ngIf="!p()!.comptes.length && !p()!.plateformes.length">
        <div class="ep-icon">💳</div>
        <div class="ep-title">Aucun moyen de paiement</div>
        <div class="ep-sub">Ajoutez un compte bancaire ou une plateforme mobile</div>
        <button class="ep-btn" (click)="ouvrirModal()">✏️ Modifier le profil</button>
      </div>
      <div class="card card-resume">
        <div class="card-hd"><span>📋</span><h3>Fiche résumée</h3></div>
        <div class="resume-rows">
          <div class="rr"><span class="rr-lbl">Enregistré le</span><span class="rr-val">{{ p()!.creeLe | date:'dd/MM/yyyy' }}</span></div>
          <div class="rr"><span class="rr-lbl">Statut</span><span class="rr-val"><span class="statut-pill sm ok" *ngIf="p()!.estActif">● Actif</span><span class="statut-pill sm off" *ngIf="!p()!.estActif">● Inactif</span></span></div>
          <div class="rr"><span class="rr-lbl">Propriétés</span><span class="rr-val bold gold">{{ p()!.nombreProprietes }}</span></div>
          <div class="rr"><span class="rr-lbl">Comptes banc.</span><span class="rr-val">{{ p()!.comptes.length }}</span></div>
          <div class="rr"><span class="rr-lbl">Plateformes</span><span class="rr-val">{{ p()!.plateformes.length }}</span></div>
        </div>
      </div>
    </div>
  </div>
</div>


<!-- ══════════════════════════════════════════════════════
     MODAL MODIFICATION
══════════════════════════════════════════════════════ -->
<div class="modal-overlay" [class.open]="showModal()" (click)="onOverlay($event)">
  <div class="nv-modal" (click)="$event.stopPropagation()">

    <!-- Header -->
    <div class="nv-header">
      <div class="nv-hl">
        <div class="nv-icon">✏️</div>
        <div>
          <div class="nv-title">Modifier le propriétaire</div>
          <div class="nv-sub">{{ p()?.nomComplet }}</div>
        </div>
      </div>
      <button class="close-btn" (click)="fermerModal()">✕</button>
    </div>

    <!-- Stepper -->
    <div class="stepper">
      <ng-container *ngFor="let lbl of stepLabels; let i=index">
        <div class="step">
          <div class="step-dot" [class.active]="etape()===i" [class.done]="etape()>i">
            {{ etape()>i ? '✓' : i+1 }}
          </div>
          <div class="step-lbl">{{ lbl }}</div>
        </div>
        <div class="step-line" *ngIf="i<stepLabels.length-1" [class.done]="etape()>i"></div>
      </ng-container>
    </div>

    <!-- Corps -->
    <div class="nv-body" *ngIf="form" [formGroup]="form">

      <!-- ─ Étape 0 : Identité ─ -->
      <ng-container *ngIf="etape()===0">
        <div class="step-title">👤 Identité & coordonnées</div>
        <div class="two-col">
          <div class="fg">
            <label>Prénom <span class="req">*</span></label>
            <input class="fc" formControlName="prenom" placeholder="Amadou" />
            <span class="err" *ngIf="fi('prenom')">Obligatoire</span>
          </div>
          <div class="fg">
            <label>Nom <span class="req">*</span></label>
            <input class="fc" formControlName="nom" placeholder="Ba" />
            <span class="err" *ngIf="fi('nom')">Obligatoire</span>
          </div>
          <div class="fg">
            <label>Date de naissance <span class="req">*</span></label>
            <input class="fc" type="date" formControlName="dateNaissance" />
          </div>
          <div class="fg">
            <label>Lieu de naissance <span class="req">*</span></label>
            <input class="fc" formControlName="lieuNaissance" placeholder="Nouakchott" />
          </div>
          <div class="fg">
            <label>Téléphone principal <span class="req">*</span></label>
            <input class="fc" formControlName="telephone" placeholder="+222 36 XX XX XX" />
            <span class="err" *ngIf="fi('telephone')">Format invalide</span>
          </div>
          <div class="fg">
            <label>Téléphone secondaire</label>
            <input class="fc" formControlName="telephoneSecondaire" placeholder="+222 22 XX XX XX" />
          </div>
          <div class="fg">
            <label>Email</label>
            <input class="fc" type="email" formControlName="email" placeholder="exemple@mail.com" />
          </div>
          <div class="fg">
            <label>Quartier / Zone</label>
            <input class="fc" formControlName="quartier" placeholder="Tevragh Zeina" />
          </div>
          <div class="fg full">
            <label>Adresse complète <span class="req">*</span></label>
            <textarea class="fc ta" rows="2" formControlName="adresse" placeholder="Numéro, rue, quartier…"></textarea>
          </div>
        </div>

        <!-- Photo -->
        <div class="fg" style="margin-top:4px">
          <label>Photo d'identité</label>
          <div class="upload-zone" (click)="photoInput.click()" (drop)="onDrop($event)" (dragover)="$event.preventDefault()">
            <input #photoInput type="file" accept="image/*" style="display:none" (change)="onPhotoChange($event)" />
            <img *ngIf="photoPreview" [src]="photoPreview" class="photo-preview" alt="Aperçu" />
            <div *ngIf="!photoPreview" class="upload-placeholder">
              <span style="font-size:28px">📸</span>
              <div>Cliquer ou glisser une photo ici</div>
              <div class="upload-hint">JPG, PNG — max 5 Mo</div>
            </div>
          </div>
        </div>
      </ng-container>

      <!-- ─ Étape 1 : Document ─ -->
      <ng-container *ngIf="etape()===1">
        <div class="step-title">🪪 Document officiel</div>
        <div class="two-col">
          <div class="fg">
            <label>Type de document <span class="req">*</span></label>
            <select class="fc" formControlName="typeDocumentId">
              <option value="CarteNationaleIdentite">Carte nationale d'identité</option>
              <option value="Passeport">Passeport</option>
              <option value="CarteDeSejour">Carte de séjour</option>
              <option value="CarteConsulaire">Carte consulaire</option>
              <option value="RegistreCommerce">Registre de commerce</option>
              <option value="Autre">Autre</option>
            </select>
          </div>
          <div class="fg">
            <label>Numéro du document <span class="req">*</span></label>
            <input class="fc" formControlName="numeroDocument" placeholder="MR-001-2024" />
            <span class="err" *ngIf="fi('numeroDocument')">Obligatoire</span>
          </div>
        </div>

        <!-- Comptes bancaires -->
        <div class="section-sep">
          <span>🏦 Comptes bancaires</span>
          <button type="button" class="btn-add-sub" (click)="addCompte()">＋ Ajouter</button>
        </div>
        <div formArrayName="comptes">
          <div *ngFor="let c of comptes.controls; let i=index" [formGroupName]="i" class="sub-row">
            <div class="two-col">
              <div class="fg"><label>Banque</label><input class="fc" formControlName="banque" placeholder="BMCI, SGM…"/></div>
              <div class="fg"><label>Numéro</label><input class="fc" formControlName="numero"/></div>
              <div class="fg"><label>Agence</label><input class="fc" formControlName="agence"/></div>
              <div class="fg center-v">
                <label class="check-lbl"><input type="checkbox" formControlName="estPrincipal"/> Principal</label>
              </div>
            </div>
            <button type="button" class="sub-remove" (click)="removeCompte(i)">✕</button>
          </div>
          <div class="sub-empty" *ngIf="!comptes.length">Aucun compte bancaire</div>
        </div>

        <!-- Plateformes -->
        <div class="section-sep" style="margin-top:16px">
          <span>📱 Plateformes mobiles</span>
          <button type="button" class="btn-add-sub" (click)="addPlateforme()">＋ Ajouter</button>
        </div>
        <div formArrayName="plateformes">
          <div *ngFor="let pl of plateformes.controls; let i=index" [formGroupName]="i" class="sub-row">
            <div class="two-col">
              <div class="fg">
                <label>Plateforme</label>
                <select class="fc" formControlName="nom">
                  <option value="Bankily">Bankily</option>
                  <option value="Masrvi">Masrvi</option>
                  <option value="Bimbank">Bimbank</option>
                  <option value="Click">Click</option>
                  <option value="Autre">Autre</option>
                </select>
              </div>
              <div class="fg"><label>Numéro</label><input class="fc" formControlName="numero" placeholder="+222…"/></div>
              <div class="fg center-v">
                <label class="check-lbl"><input type="checkbox" formControlName="estPrincipal"/> Principal</label>
              </div>
            </div>
            <button type="button" class="sub-remove" (click)="removePlateforme(i)">✕</button>
          </div>
          <div class="sub-empty" *ngIf="!plateformes.length">Aucune plateforme mobile</div>
        </div>
      </ng-container>

      <!-- ─ Étape 2 : Notes ─ -->
      <ng-container *ngIf="etape()===2">
        <div class="step-title">📝 Notes & observations</div>
        <div class="fg">
          <label>Notes internes</label>
          <textarea class="fc ta" rows="5" formControlName="notes"
                    placeholder="Observations, informations complémentaires…"></textarea>
        </div>
        <div class="recap-box" *ngIf="p()">
          <div class="rb-title">Récapitulatif</div>
          <div class="rb-grid">
            <div class="rb-row"><span>Nom complet</span><strong>{{ form.value.prenom }} {{ form.value.nom }}</strong></div>
            <div class="rb-row"><span>Téléphone</span><strong>{{ form.value.telephone }}</strong></div>
            <div class="rb-row" *ngIf="form.value.email"><span>Email</span><strong>{{ form.value.email }}</strong></div>
            <div class="rb-row"><span>Document</span><strong>{{ form.value.numeroDocument }}</strong></div>
            <div class="rb-row"><span>Comptes banc.</span><strong>{{ comptes.length }}</strong></div>
            <div class="rb-row"><span>Plateformes</span><strong>{{ plateformes.length }}</strong></div>
          </div>
        </div>
        <div class="success-banner" *ngIf="successMsg()">✅ {{ successMsg() }}</div>
        <div class="error-banner"   *ngIf="errorMsg()">⚠️ {{ errorMsg() }}</div>
      </ng-container>

    </div>

    <!-- Pied -->
    <div class="nv-footer">
      <button class="btn-ghost" (click)="fermerModal()">Annuler</button>
      <div class="foot-right">
        <button class="btn-sec"     *ngIf="etape()>0"           (click)="etapePrev()">← Précédent</button>
        <button class="btn-primary" *ngIf="etape()<2"           [disabled]="!peutContinuer()" (click)="etapeNext()">Suivant →</button>
        <button class="btn-submit"  *ngIf="etape()===2" [disabled]="form.invalid || submitting()" (click)="submit()">
          <span *ngIf="!submitting()">💾 Enregistrer</span>
          <span *ngIf="submitting()" class="spin-w"></span>
        </button>
      </div>
    </div>

  </div>
</div>
  `,
  styles: [`
    :host{--gold:#C9A84C;--gold-l:#E8C96A;--gold-d:#8B6914;--ink:#0D0D0D;--ink-mid:#1A1A2E;--ink-soft:#2D2D4A;--cream:#F8F4ED;--cream-dk:#EDE8DF;--muted:#8A8899;--ok:#1A7A4A;--ok-bg:#E6F5EE;--warn:#D4850A;--danger:#C0392B;--blue:#1D4ED8;--blue-bg:#DBEAFE;--r:14px}
    .loading-full{display:flex;align-items:center;justify-content:center;height:50vh}
    .spinner{width:36px;height:36px;border:3px solid var(--cream-dk);border-top-color:var(--ink-mid);border-radius:50%;animation:spin .8s linear infinite}
    @keyframes spin{to{transform:rotate(360deg)}}
    .page{max-width:1100px;margin:0 auto}

    /* HERO */
    .hero{background:linear-gradient(135deg,#0D1B2A 0%,#1C1810 55%,#0D1B2A 100%);border-radius:var(--r);overflow:hidden;margin-bottom:22px;position:relative}
    .hero-glow{position:absolute;inset:0;pointer-events:none;background:radial-gradient(ellipse at 20% 50%,rgba(201,168,76,.12) 0%,transparent 50%),radial-gradient(ellipse at 80% 30%,rgba(26,26,46,.4) 0%,transparent 55%)}
    .hero-inner{position:relative;display:flex;align-items:center;justify-content:space-between;padding:28px 36px;gap:24px;flex-wrap:wrap}
    .avatar-wrap{position:relative;flex-shrink:0}
    .avatar-img{width:80px;height:80px;border-radius:18px;object-fit:cover;border:2.5px solid rgba(201,168,76,.35)}
    .avatar-initials{width:80px;height:80px;border-radius:18px;background:rgba(201,168,76,.15);border:2.5px solid rgba(201,168,76,.35);display:flex;align-items:center;justify-content:center;font-size:26px;font-weight:800;color:var(--gold-l);font-family:'Playfair Display',Georgia,serif;letter-spacing:1px}
    .avatar-dot{position:absolute;bottom:4px;right:4px;width:14px;height:14px;border-radius:50%;border:2px solid #0D1B2A;background:#6b7280}
    .avatar-dot.ok{background:#22c55e}
    .hero-id{display:flex;align-items:center;gap:20px;flex:1}
    .hero-prenom{font-size:13px;font-weight:600;color:rgba(255,255,255,.4);text-transform:uppercase;letter-spacing:2px;margin-bottom:2px}
    .hero-nom{font-size:28px;font-weight:900;color:#fff;font-family:'Playfair Display',Georgia,serif;line-height:1;margin-bottom:10px}
    .hero-contacts{display:flex;gap:14px;flex-wrap:wrap;margin-bottom:10px}
    .hc{font-size:12.5px;color:rgba(255,255,255,.5)}
    .statut-pill{display:inline-flex;align-items:center;gap:6px;padding:4px 12px;border-radius:20px;font-size:12px;font-weight:700}
    .statut-pill.ok{background:rgba(26,122,74,.25);color:#6ee7b7;border:1px solid rgba(110,231,183,.2)}
    .statut-pill.off{background:rgba(107,114,128,.2);color:rgba(255,255,255,.4);border:1px solid rgba(255,255,255,.1)}
    .statut-pill.sm{font-size:11.5px;padding:3px 10px}
    .hero-right{display:flex;flex-direction:column;align-items:flex-end;gap:16px}
    .hero-actions{display:flex;gap:8px}
    .ha-btn{padding:9px 18px;border-radius:9px;font-size:13px;font-weight:700;cursor:pointer;text-decoration:none;display:inline-flex;align-items:center;gap:6px;transition:all .18s;font-family:inherit;border:none}
    .ha-btn.edit{background:linear-gradient(135deg,var(--gold-d),var(--gold));color:#fff}
    .ha-btn.edit:hover{box-shadow:0 4px 16px rgba(201,168,76,.4)}
    .ha-btn.back{background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.15);color:rgba(255,255,255,.7)}
    .ha-btn.back:hover{background:rgba(255,255,255,.14);color:#fff}
    .patrimoine-kpi{background:rgba(255,255,255,.07);border:1px solid rgba(201,168,76,.2);border-radius:12px;padding:14px 22px;text-align:center;min-width:140px}
    .pk-val{font-size:36px;font-weight:900;color:var(--gold-l);font-family:'Playfair Display',Georgia,serif;line-height:1}
    .pk-lbl{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:rgba(255,255,255,.35);margin:4px 0 10px}
    .pk-link{font-size:12px;font-weight:600;color:rgba(201,168,76,.8);text-decoration:none}
    .pk-link:hover{color:var(--gold-l)}

    /* CORPS */
    .body-grid{display:grid;grid-template-columns:1.2fr 1fr;gap:18px}
    .col-l,.col-r{display:flex;flex-direction:column;gap:16px}
    .card{background:#fff;border-radius:var(--r);padding:22px 24px;box-shadow:0 2px 12px rgba(0,0,0,.07);border:1.5px solid var(--cream-dk)}
    .card-hd{display:flex;align-items:center;gap:10px;margin-bottom:18px}
    .card-hd span{font-size:17px}
    .card-hd h3{font-size:14.5px;font-weight:700;color:var(--ink-mid);margin:0;flex:1;font-family:'Playfair Display',Georgia,serif}
    .hd-count{display:inline-flex;width:22px;height:22px;border-radius:50%;background:var(--ink-mid);color:var(--gold-l);font-size:11px;font-weight:700;align-items:center;justify-content:center}
    .info-rows{display:flex;flex-direction:column;margin-bottom:14px}
    .ir{display:flex;align-items:baseline;padding:9px 0;border-bottom:1px solid var(--cream-dk)}
    .ir:last-child{border:none}
    .ir-lbl{width:130px;font-size:11.5px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.4px;flex-shrink:0}
    .ir-val{font-size:13.5px;color:var(--ink-soft);flex:1;display:flex;align-items:center;gap:8px;flex-wrap:wrap}
    .doc-tag{display:inline-flex;padding:2px 8px;border-radius:6px;background:var(--blue-bg);color:var(--blue);font-size:11.5px;font-weight:700}
    .doc-num{font-family:monospace;font-weight:700;color:var(--ink-mid);font-size:13px}
    .notes-block{background:rgba(201,168,76,.06);border:1px solid rgba(201,168,76,.2);border-radius:9px;padding:12px 14px}
    .nb-lbl{font-size:11px;font-weight:700;color:var(--gold-d);text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px}
    .nb-txt{font-size:13px;color:var(--ink-soft);line-height:1.6;white-space:pre-wrap}
    .docs-list{display:flex;flex-direction:column}
    .doc-row{display:flex;align-items:center;gap:12px;padding:11px 0;border-bottom:1px solid var(--cream-dk)}
    .doc-row:last-child{border:none}
    .dr-icon{width:36px;height:36px;background:var(--cream);border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0}
    .dr-info{flex:1}
    .dr-nom{font-size:13px;font-weight:600;color:var(--ink-mid)}
    .dr-meta{font-size:11.5px;color:var(--muted);margin-top:2px}
    .dr-dl{width:30px;height:30px;background:var(--cream);border-radius:7px;display:flex;align-items:center;justify-content:center;text-decoration:none;font-size:14px;transition:all .14s;color:var(--ink-soft)}
    .dr-dl:hover{background:var(--blue);color:#fff}
    .finance-list{display:flex;flex-direction:column;gap:8px}
    .fin-row{display:flex;align-items:center;justify-content:space-between;padding:12px 14px;border-radius:9px;border:1.5px solid var(--cream-dk);transition:all .15s}
    .fin-row.principal{border-color:rgba(201,168,76,.3);background:rgba(201,168,76,.04)}
    .fin-row:hover{box-shadow:0 2px 8px rgba(0,0,0,.07)}
    .fr-bank{font-size:13.5px;font-weight:700;color:var(--ink-mid)}
    .fr-num{font-size:12px;font-family:monospace;color:var(--muted);margin-top:2px}
    .fr-badge{display:inline-flex;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700}
    .fr-badge.principal{background:rgba(201,168,76,.15);color:var(--gold-d);border:1px solid rgba(201,168,76,.3)}
    .fr-badge.sec{background:var(--cream);color:var(--muted);border:1px solid var(--cream-dk)}
    .card-empty-pay{text-align:center;padding:32px}
    .ep-icon{font-size:36px;margin-bottom:10px}
    .ep-title{font-size:15px;font-weight:700;color:var(--ink-mid);margin-bottom:5px}
    .ep-sub{font-size:13px;color:var(--muted);margin-bottom:14px}
    .ep-btn{display:inline-flex;align-items:center;gap:6px;padding:9px 18px;background:var(--ink-mid);color:var(--gold-l);border:none;border-radius:9px;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit;transition:all .18s}
    .resume-rows{display:flex;flex-direction:column;gap:4px}
    .rr{display:flex;align-items:center;justify-content:space-between;padding:9px 12px;border-radius:8px;background:var(--cream)}
    .rr-lbl{font-size:11.5px;font-weight:700;text-transform:uppercase;letter-spacing:.4px;color:var(--muted)}
    .rr-val{font-size:13.5px;font-weight:600;color:var(--ink-mid)}
    .rr-val.bold{font-weight:800;font-size:16px}
    .rr-val.gold{color:var(--gold-d);font-family:'Playfair Display',Georgia,serif}

    /* ── MODAL ── */
    .modal-overlay{position:fixed;inset:0;background:rgba(13,13,13,.6);backdrop-filter:blur(4px);z-index:1000;display:flex;align-items:center;justify-content:center;padding:20px;opacity:0;pointer-events:none;transition:opacity .22s}
    .modal-overlay.open{opacity:1;pointer-events:all}
    .nv-modal{background:#fff;border-radius:18px;width:100%;max-width:640px;max-height:90vh;box-shadow:0 24px 80px rgba(13,13,13,.22),0 0 0 1px rgba(201,168,76,.12);display:flex;flex-direction:column;overflow:hidden;transform:translateY(16px) scale(.97);transition:transform .25s}
    .modal-overlay.open .nv-modal{transform:translateY(0) scale(1)}
    .nv-header{padding:20px 24px 16px;background:linear-gradient(135deg,var(--ink-mid),var(--ink-soft));display:flex;align-items:center;justify-content:space-between;flex-shrink:0}
    .nv-hl{display:flex;align-items:center;gap:12px}
    .nv-icon{width:42px;height:42px;border-radius:11px;background:rgba(201,168,76,.18);border:1.5px solid rgba(201,168,76,.35);display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0}
    .nv-title{font-size:17px;font-weight:700;color:var(--gold-l);font-family:'Playfair Display',Georgia,serif}
    .nv-sub{font-size:11.5px;color:rgba(255,255,255,.4);margin-top:2px}
    .close-btn{width:30px;height:30px;border-radius:7px;border:none;background:rgba(255,255,255,.1);color:rgba(255,255,255,.6);font-size:13px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .15s}
    .close-btn:hover{background:rgba(192,57,43,.35);color:#fff}
    .stepper{display:flex;align-items:center;padding:14px 24px 10px;background:var(--cream);border-bottom:1px solid var(--cream-dk);flex-shrink:0}
    .step{display:flex;flex-direction:column;align-items:center;gap:4px;flex:1}
    .step-dot{width:26px;height:26px;border-radius:50%;background:#fff;border:2px solid var(--cream-dk);display:flex;align-items:center;justify-content:center;font-size:11.5px;font-weight:700;color:var(--muted);transition:all .2s}
    .step-dot.active{background:var(--gold);border-color:var(--gold);color:#fff;box-shadow:0 0 0 4px rgba(201,168,76,.2)}
    .step-dot.done{background:var(--ok);border-color:var(--ok);color:#fff}
    .step-lbl{font-size:10.5px;font-weight:600;color:var(--muted)}
    .step-line{flex:1;height:2px;background:var(--cream-dk);margin:0 4px 14px;border-radius:2px;transition:background .3s}
    .step-line.done{background:var(--ok)}
    .nv-body{flex:1;overflow-y:auto;padding:20px 24px}
    .nv-body::-webkit-scrollbar{width:4px}
    .nv-body::-webkit-scrollbar-thumb{background:var(--cream-dk);border-radius:4px}
    .step-title{font-size:13px;font-weight:700;color:var(--ink-soft);margin-bottom:16px;padding-bottom:10px;border-bottom:1px solid var(--cream-dk)}
    .two-col{display:grid;grid-template-columns:1fr 1fr;gap:14px}
    .fg{display:flex;flex-direction:column;gap:5px;margin-bottom:2px}
    .fg.full{grid-column:1/-1}
    label{font-size:12px;font-weight:700;color:var(--ink-soft)}
    .req{color:var(--danger)}
    .fc{padding:10px 12px;border:1.5px solid var(--cream-dk);border-radius:9px;font-size:13px;font-family:inherit;outline:none;transition:border-color .18s;background:#fff;width:100%;box-sizing:border-box}
    .fc:focus{border-color:var(--gold);box-shadow:0 0 0 3px rgba(201,168,76,.1)}
    .fc::placeholder{color:#c0bcc8}
    .ta{resize:none}
    .err{font-size:11.5px;color:var(--danger)}
    .center-v{justify-content:flex-end;padding-bottom:2px}
    .check-lbl{display:flex;align-items:center;gap:8px;font-size:13px;font-weight:600;color:var(--ink-soft);cursor:pointer;padding:8px 0}

    /* Upload */
    .upload-zone{border:2px dashed var(--cream-dk);border-radius:10px;padding:20px;text-align:center;cursor:pointer;transition:border-color .15s;margin-top:4px}
    .upload-zone:hover{border-color:var(--gold)}
    .upload-placeholder{display:flex;flex-direction:column;align-items:center;gap:6px;color:var(--muted);font-size:13px}
    .upload-hint{font-size:11.5px;color:#c0bcc8}
    .photo-preview{max-height:130px;border-radius:8px}

    /* Sub rows */
    .section-sep{display:flex;align-items:center;justify-content:space-between;padding:12px 0 8px;border-top:1px solid var(--cream-dk);font-size:13px;font-weight:700;color:var(--ink-soft)}
    .btn-add-sub{padding:5px 12px;background:var(--cream);border:1.5px solid var(--cream-dk);border-radius:7px;font-size:12px;font-weight:700;color:var(--ink-soft);cursor:pointer;font-family:inherit;transition:all .14s}
    .btn-add-sub:hover{border-color:var(--gold);color:var(--gold-d)}
    .sub-row{background:var(--cream);border-radius:9px;padding:12px 14px;margin-bottom:8px;position:relative}
    .sub-remove{position:absolute;top:10px;right:10px;background:none;border:none;color:var(--danger);cursor:pointer;font-size:14px;padding:2px 6px;border-radius:5px}
    .sub-remove:hover{background:rgba(192,57,43,.1)}
    .sub-empty{text-align:center;padding:14px;font-size:12.5px;color:var(--muted);background:var(--cream);border-radius:8px}

    /* Recap */
    .recap-box{background:var(--cream);border-radius:10px;padding:14px 16px;margin-top:16px;border:1px solid var(--cream-dk)}
    .rb-title{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.6px;color:var(--muted);margin-bottom:10px}
    .rb-grid{display:flex;flex-direction:column;gap:0}
    .rb-row{display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px solid var(--cream-dk);font-size:13px}
    .rb-row:last-child{border:none}
    .rb-row span{color:var(--muted);font-size:12px}
    .rb-row strong{color:var(--ink-mid);font-weight:600}
    .success-banner{background:var(--ok-bg);border:1px solid var(--ok);border-radius:9px;padding:11px 14px;font-size:13px;color:var(--ok);font-weight:600;margin-top:12px}
    .error-banner{background:#FDECEA;border:1px solid var(--danger);border-radius:9px;padding:11px 14px;font-size:13px;color:var(--danger);font-weight:600;margin-top:12px}

    /* Footer modal */
    .nv-footer{padding:14px 24px;border-top:1px solid var(--cream-dk);background:var(--cream);display:flex;align-items:center;justify-content:space-between;flex-shrink:0}
    .foot-right{display:flex;gap:9px}
    .btn-ghost{background:none;border:none;cursor:pointer;font-size:13px;color:var(--muted);padding:8px 2px;font-family:inherit}
    .btn-ghost:hover{color:var(--danger)}
    .btn-sec{padding:8px 16px;border-radius:8px;background:#fff;color:var(--ink-soft);border:1.5px solid var(--cream-dk);font-size:13px;font-weight:600;cursor:pointer;font-family:inherit}
    .btn-primary{padding:8px 20px;border-radius:8px;background:var(--ink-mid);color:var(--gold-l);border:none;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit}
    .btn-primary:disabled{opacity:.4;cursor:not-allowed}
    .btn-submit{padding:8px 22px;border-radius:8px;background:linear-gradient(135deg,var(--gold-d),var(--gold));color:#fff;border:none;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit;min-width:160px;display:flex;align-items:center;justify-content:center;gap:6px;transition:all .18s}
    .btn-submit:disabled{opacity:.4;cursor:not-allowed}
    .spin-w{width:16px;height:16px;border:2.5px solid rgba(255,255,255,.35);border-top-color:#fff;border-radius:50%;animation:spin .7s linear infinite;display:inline-block}

    @media(max-width:900px){.body-grid{grid-template-columns:1fr}.hero-inner{flex-direction:column;align-items:flex-start}.hero-right{align-items:flex-start;width:100%}.patrimoine-kpi{text-align:left;width:100%;box-sizing:border-box}}
    @media(max-width:600px){.hero-id{flex-direction:column;align-items:flex-start}.hero-nom{font-size:22px}.two-col{grid-template-columns:1fr}}
  `]
})
export class ProprietaireDetailComponent implements OnInit {

  @ViewChild('photoInput') photoInputRef!: ElementRef<HTMLInputElement>;

  private svc    = inject(ProprietairesService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private fb    = inject(FormBuilder);

  p          = signal<ProprietaireDto | null>(null);
  showModal  = signal(false);
  etape      = signal(0);
  submitting = signal(false);
  successMsg = signal('');
  errorMsg   = signal('');

  form!: FormGroup;
  photoFile?: File;
  photoPreview?: string;

  stepLabels = ['Identité', 'Documents & Finances', 'Notes'];

  ngOnInit() {
    this.svc.getById(this.route.snapshot.params['id']).subscribe(d => {
      this.p.set(d);
      // Auto-ouvre le modal si on arrive depuis /edit
      if (this.route.snapshot.queryParams['edit'] === '1') {
        this.ouvrirModal();
        // Nettoyer l'URL sans recharger
        this.router.navigate([], {
          relativeTo: this.route,
          queryParams: {},
          replaceUrl: true
        });
      }
    });
  }

  // ── Modal ──────────────────────────────────────────────
  ouvrirModal() {
    const prop = this.p();
    if (!prop) return;
    this.buildForm(prop);
    this.photoPreview = prop.photoIdentiteUrl ?? undefined;
    this.photoFile    = undefined;
    this.etape.set(0);
    this.successMsg.set('');
    this.errorMsg.set('');
    this.showModal.set(true);
  }
  fermerModal()      { this.showModal.set(false); }
  onOverlay(e:Event) { if ((e.target as HTMLElement).classList.contains('modal-overlay')) this.fermerModal(); }

  peutContinuer(): boolean {
    if (this.etape() === 0) {
      return ['prenom','nom','dateNaissance','lieuNaissance','telephone','adresse']
        .every(f => this.form.get(f)?.valid);
    }
    if (this.etape() === 1) {
      return this.form.get('typeDocumentId')!.valid && this.form.get('numeroDocument')!.valid;
    }
    return true;
  }
  fi(f: string): boolean { const c = this.form.get(f); return !!(c?.invalid && c?.touched); }

  // ── FormArray helpers ──────────────────────────────────
  get comptes()     { return this.form.get('comptes')    as FormArray; }
  get plateformes() { return this.form.get('plateformes') as FormArray; }

  addCompte() {
    this.comptes.push(this.fb.group({
      banque: ['', Validators.required], numero: ['', Validators.required],
      agence: [''], estPrincipal: [false]
    }));
  }
  removeCompte(i: number)     { this.comptes.removeAt(i); }

  addPlateforme() {
    this.plateformes.push(this.fb.group({
      nom: ['Bankily', Validators.required], numero: ['', Validators.required], estPrincipal: [false]
    }));
  }
  removePlateforme(i: number) { this.plateformes.removeAt(i); }

  // ── Photo ──────────────────────────────────────────────
  onPhotoChange(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.photoFile = file;
    const r = new FileReader();
    r.onload = ev => this.photoPreview = ev.target?.result as string;
    r.readAsDataURL(file);
  }
  onDrop(e: DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer?.files[0];
    if (file?.type.startsWith('image/')) {
      this.photoFile = file;
      const r = new FileReader();
      r.onload = ev => this.photoPreview = ev.target?.result as string;
      r.readAsDataURL(file);
    }
  }

  // ── Soumission ─────────────────────────────────────────
  submit() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.submitting.set(true);
    this.errorMsg.set('');
    const id = this.p()!.id;
    const fd = this.svc.buildFormData(this.form.value, this.photoFile);
    this.svc.update(id, fd).subscribe({
      next: () => {
        this.submitting.set(false);
        this.successMsg.set('Modifications enregistrées avec succès !');
        this.svc.getById(id).subscribe(d => this.p.set(d));
        setTimeout(() => this.fermerModal(), 1400);
      },
      error: (err: any) => {
        this.submitting.set(false);
        this.errorMsg.set(err?.error?.message ?? 'Une erreur est survenue.');
      }
    });
  }

  // ── Initialiser le formulaire avec les données existantes ──
  etapePrev() { this.etape.update(e => e - 1); }
  etapeNext() { this.etape.update(e => e + 1); }

  private buildForm(prop: ProprietaireDto) {
    this.form = this.fb.group({
      nom:                 [prop.nom,                 Validators.required],
      prenom:              [prop.prenom,              Validators.required],
      dateNaissance:       [prop.dateNaissance?.slice(0,10) ?? '', Validators.required],
      lieuNaissance:       [prop.lieuNaissance,       Validators.required],
      adresse:             [prop.adresse,             Validators.required],
      quartier:            [prop.quartier ?? ''],
      telephone:           [prop.telephone,           [Validators.required, Validators.pattern(/^\+?[\d\s\-]{8,}$/)]],
      telephoneSecondaire: [prop.telephoneSecondaire ?? ''],
      email:               [prop.email ?? '',         Validators.email],
      typeDocumentId:      ['CarteNationaleIdentite',  Validators.required],
      numeroDocument:      [prop.numeroDocument,      Validators.required],
      notes:               [prop.notes ?? ''],
      comptes:             this.fb.array(
        prop.comptes.map(c => this.fb.group({
          banque: [c.banque, Validators.required], numero: [c.numero, Validators.required],
          agence: [c.agence ?? ''], estPrincipal: [c.estPrincipal]
        }))
      ),
      plateformes: this.fb.array(
        prop.plateformes.map(pf => this.fb.group({
          nom: [pf.nom, Validators.required], numero: [pf.numero, Validators.required],
          estPrincipal: [pf.estPrincipal]
        }))
      ),
    });
  }
}