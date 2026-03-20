import { Component, inject, OnInit } from '@angular/core';
import { CommonModule }               from '@angular/common';
import { RouterLink, Router, ActivatedRoute } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { ProprietairesService, FichiersService } from '../../../core/services/api.services';

@Component({
  selector: 'kdi-proprietaire-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
<div class="shell">

  <!-- ══ TOPBAR ══ -->
  <div class="topbar">
    <div class="tb-left">
      <div class="tb-icon">{{ isEdit ? '✏️' : '＋' }}</div>
      <div>
        <div class="tb-title">{{ isEdit ? 'Modifier le propriétaire' : 'Nouveau propriétaire' }}</div>
        <div class="tb-sub">{{ isEdit ? 'Mise à jour des informations' : 'Saisie des informations du propriétaire' }}</div>
      </div>
    </div>
    <a [routerLink]="isEdit ? ['/proprietaires', editId] : ['/proprietaires']" class="btn-back">← Retour</a>
  </div>

  <!-- ══ STEPPER ══ -->
  <div class="stepper">
    <ng-container *ngFor="let lbl of steps; let i=index">
      <div class="step" [class.active]="etape===i" [class.done]="etape>i" (click)="goStep(i)">
        <div class="step-dot">{{ etape>i ? '✓' : i+1 }}</div>
        <div class="step-lbl">{{ lbl }}</div>
      </div>
      <div class="step-line" *ngIf="i<steps.length-1" [class.done]="etape>i"></div>
    </ng-container>
  </div>

  <!-- ══ FORMULAIRE ══ -->
  <div class="form-wrap" *ngIf="form" [formGroup]="form">

    <!-- ── Étape 0 : Identité ── -->
    <ng-container *ngIf="etape===0">
      <div class="section-card">
        <div class="sc-header"><span class="sc-ico">👤</span><h3>Identité</h3></div>
        <div class="two-col">
          <div class="fg">
            <label>Prénom <span class="req">*</span></label>
            <input class="fc" formControlName="prenom" placeholder="Amadou" />
            <span class="err" *ngIf="fi('prenom')">Champ obligatoire</span>
          </div>
          <div class="fg">
            <label>Nom <span class="req">*</span></label>
            <input class="fc" formControlName="nom" placeholder="Ba" />
            <span class="err" *ngIf="fi('nom')">Champ obligatoire</span>
          </div>
          <div class="fg">
            <label>Date de naissance <span class="req">*</span></label>
            <input class="fc" type="date" formControlName="dateNaissance" />
          </div>
          <div class="fg">
            <label>Lieu de naissance <span class="req">*</span></label>
            <input class="fc" formControlName="lieuNaissance" placeholder="Nouakchott" />
          </div>
        </div>

        <div class="fg mt">
          <label>Photo d'identité</label>
          <div class="upload-zone" (click)="photoInput.click()" (drop)="onDrop($event)" (dragover)="$event.preventDefault()">
            <input #photoInput type="file" accept="image/*" style="display:none" (change)="onPhotoChange($event)" />
            <img *ngIf="photoPreview" [src]="photoPreview" class="photo-preview" alt="Aperçu" />
            <div *ngIf="!photoPreview" class="upload-ph">
              <span class="up-ico">📸</span>
              <div class="up-txt">Cliquer ou glisser une photo ici</div>
              <div class="up-hint">JPG, PNG — max 5 Mo</div>
            </div>
          </div>
        </div>
      </div>

      <div class="section-card">
        <div class="sc-header"><span class="sc-ico">📞</span><h3>Coordonnées</h3></div>
        <div class="two-col">
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
      </div>
    </ng-container>

    <!-- ── Étape 1 : Document ── -->
    <ng-container *ngIf="etape===1">
      <div class="section-card">
        <div class="sc-header"><span class="sc-ico">🪪</span><h3>Document officiel</h3></div>
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
            <span class="err" *ngIf="fi('numeroDocument')">Champ obligatoire</span>
          </div>
        </div>
      </div>

      <!-- Comptes bancaires -->
      <div class="section-card">
        <div class="sc-header">
          <span class="sc-ico">🏦</span><h3>Comptes bancaires</h3>
          <button type="button" class="btn-add" (click)="addCompte()">＋ Ajouter</button>
        </div>
        <div formArrayName="comptes">
          <div *ngFor="let c of comptes.controls; let i=index" [formGroupName]="i" class="sub-card">
            <div class="sub-card-hd">
              <span class="sc-num">{{ i+1 }}</span>
              <button type="button" class="sub-rm" (click)="removeCompte(i)">✕ Supprimer</button>
            </div>
            <div class="three-col">
              <div class="fg"><label>Banque <span class="req">*</span></label><input class="fc" formControlName="banque" placeholder="BMCI, SGM…"/></div>
              <div class="fg"><label>Numéro <span class="req">*</span></label><input class="fc" formControlName="numero"/></div>
              <div class="fg"><label>Agence</label><input class="fc" formControlName="agence"/></div>
            </div>
            <label class="check-lbl"><input type="checkbox" formControlName="estPrincipal"/> Compte principal</label>
          </div>
          <div class="sub-empty" *ngIf="!comptes.length">
            <span>🏦</span> Aucun compte bancaire — cliquez sur "＋ Ajouter" pour en ajouter un
          </div>
        </div>
      </div>

      <!-- Plateformes -->
      <div class="section-card">
        <div class="sc-header">
          <span class="sc-ico">📱</span><h3>Plateformes mobiles</h3>
          <button type="button" class="btn-add" (click)="addPlateforme()">＋ Ajouter</button>
        </div>
        <div formArrayName="plateformes">
          <div *ngFor="let p of plateformes.controls; let i=index" [formGroupName]="i" class="sub-card">
            <div class="sub-card-hd">
              <span class="sc-num">{{ i+1 }}</span>
              <button type="button" class="sub-rm" (click)="removePlateforme(i)">✕ Supprimer</button>
            </div>
            <div class="two-col">
              <div class="fg">
                <label>Plateforme <span class="req">*</span></label>
                <select class="fc" formControlName="nom">
                  <option value="Bankily">Bankily</option>
                  <option value="Masrvi">Masrvi</option>
                  <option value="Bimbank">Bimbank</option>
                  <option value="Click">Click</option>
                  <option value="Autre">Autre</option>
                </select>
              </div>
              <div class="fg"><label>Numéro <span class="req">*</span></label><input class="fc" formControlName="numero" placeholder="+222…"/></div>
            </div>
            <label class="check-lbl"><input type="checkbox" formControlName="estPrincipal"/> Plateforme principale</label>
          </div>
          <div class="sub-empty" *ngIf="!plateformes.length">
            <span>📱</span> Aucune plateforme mobile — cliquez sur "＋ Ajouter" pour en ajouter une
          </div>
        </div>
      </div>
    </ng-container>

    <!-- ── Étape 2 : Notes & Confirmation ── -->
    <ng-container *ngIf="etape===2">
      <div class="section-card">
        <div class="sc-header"><span class="sc-ico">📝</span><h3>Notes & observations</h3></div>
        <div class="fg">
          <label>Notes internes</label>
          <textarea class="fc ta" rows="4" formControlName="notes"
                    placeholder="Observations, informations complémentaires…"></textarea>
        </div>
      </div>

      <!-- Récapitulatif -->
      <div class="section-card recap-card">
        <div class="sc-header"><span class="sc-ico">✅</span><h3>Récapitulatif</h3></div>
        <div class="recap-grid">
          <div class="rg-section">
            <div class="rgs-title">Identité</div>
            <div class="rg-row"><span>Nom complet</span><strong>{{ form.value.prenom }} {{ form.value.nom }}</strong></div>
            <div class="rg-row"><span>Date de naissance</span><strong>{{ form.value.dateNaissance }}</strong></div>
            <div class="rg-row"><span>Lieu de naissance</span><strong>{{ form.value.lieuNaissance }}</strong></div>
          </div>
          <div class="rg-section">
            <div class="rgs-title">Coordonnées</div>
            <div class="rg-row"><span>Téléphone</span><strong>{{ form.value.telephone }}</strong></div>
            <div class="rg-row" *ngIf="form.value.email"><span>Email</span><strong>{{ form.value.email }}</strong></div>
            <div class="rg-row" *ngIf="form.value.adresse"><span>Adresse</span><strong>{{ form.value.adresse }}</strong></div>
          </div>
          <div class="rg-section">
            <div class="rgs-title">Document & Finances</div>
            <div class="rg-row"><span>Document</span><strong>{{ form.value.numeroDocument }}</strong></div>
            <div class="rg-row"><span>Comptes bancaires</span><strong class="gold">{{ comptes.length }}</strong></div>
            <div class="rg-row"><span>Plateformes mobiles</span><strong class="gold">{{ plateformes.length }}</strong></div>
          </div>
        </div>
      </div>

      <div class="success-banner" *ngIf="successMsg">✅ {{ successMsg }}</div>
      <div class="error-banner"   *ngIf="errorMsg">⚠️ {{ errorMsg }}</div>
    </ng-container>

  </div>

  <!-- ══ NAVIGATION BAS ══ -->
  <div class="nav-bar">
    <div class="nb-left">
      <a [routerLink]="isEdit ? ['/proprietaires', editId] : ['/proprietaires']" class="btn-cancel">Annuler</a>
    </div>
    <div class="nb-right">
      <button class="btn-prev" *ngIf="etape>0" (click)="prevStep()">← Précédent</button>
      <button class="btn-next" *ngIf="etape<2" [disabled]="!peutContinuer()" (click)="nextStep()">
        Suivant →
      </button>
      <button class="btn-submit" *ngIf="etape===2" [disabled]="form.invalid || submitting" (click)="submit()">
        <span *ngIf="submitting" class="spin-w"></span>
        <span *ngIf="!submitting">{{ isEdit ? '💾 Enregistrer les modifications' : '＋ Créer le propriétaire' }}</span>
      </button>
    </div>
  </div>

</div>
  `,
  styles: [`
    :host{--gold:#C9A84C;--gold-l:#E8C96A;--gold-d:#8B6914;--ink:#0D0D0D;--ink-mid:#1A1A2E;--ink-soft:#2D2D4A;--cream:#F8F4ED;--cream-dk:#EDE8DF;--muted:#8A8899;--ok:#1A7A4A;--ok-bg:#E6F5EE;--warn:#D4850A;--warn-bg:#FEF3E2;--danger:#C0392B;--blue:#1D4ED8;--blue-bg:#DBEAFE;--r:12px}

    .shell{max-width:860px;margin:0 auto;padding-bottom:40px}

    /* TOPBAR */
    .topbar{display:flex;align-items:center;justify-content:space-between;margin-bottom:24px}
    .tb-left{display:flex;align-items:center;gap:14px}
    .tb-icon{width:46px;height:46px;border-radius:12px;background:linear-gradient(135deg,var(--ink-mid),var(--ink-soft));display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0}
    .tb-title{font-size:22px;font-weight:800;color:var(--ink-mid);font-family:'Playfair Display',Georgia,serif}
    .tb-sub{font-size:13px;color:var(--muted);margin-top:2px}
    .btn-back{padding:9px 18px;border-radius:9px;background:#fff;border:1.5px solid var(--cream-dk);color:var(--ink-soft);font-size:13px;font-weight:600;text-decoration:none;transition:all .15s}
    .btn-back:hover{border-color:var(--ink-mid);color:var(--ink-mid)}

    /* STEPPER */
    .stepper{display:flex;align-items:center;background:#fff;border-radius:var(--r);padding:16px 24px;margin-bottom:20px;box-shadow:0 2px 10px rgba(0,0,0,.06);border:1.5px solid var(--cream-dk)}
    .step{display:flex;flex-direction:column;align-items:center;gap:5px;cursor:pointer;flex:1;transition:opacity .15s}
    .step:not(.active):not(.done){opacity:.5}
    .step-dot{width:28px;height:28px;border-radius:50%;background:var(--cream-dk);display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:var(--muted);transition:all .22s}
    .step.active .step-dot{background:var(--gold);color:#fff;box-shadow:0 0 0 4px rgba(201,168,76,.2)}
    .step.done  .step-dot{background:var(--ok);color:#fff}
    .step-lbl{font-size:11px;font-weight:700;color:var(--ink-soft);text-align:center}
    .step-line{flex:1;height:2px;background:var(--cream-dk);margin:0 6px 14px;border-radius:2px;transition:background .3s}
    .step-line.done{background:var(--ok)}

    /* SECTIONS */
    .form-wrap{display:flex;flex-direction:column;gap:16px}
    .section-card{background:#fff;border-radius:var(--r);padding:24px;box-shadow:0 2px 10px rgba(0,0,0,.06);border:1.5px solid var(--cream-dk)}
    .sc-header{display:flex;align-items:center;gap:10px;margin-bottom:22px;padding-bottom:14px;border-bottom:1.5px solid var(--cream-dk)}
    .sc-ico{font-size:18px}
    .sc-header h3{font-size:15px;font-weight:700;color:var(--ink-mid);margin:0;flex:1;font-family:'Playfair Display',Georgia,serif}
    .btn-add{padding:6px 14px;background:var(--cream);border:1.5px solid var(--cream-dk);border-radius:8px;font-size:12.5px;font-weight:700;color:var(--ink-soft);cursor:pointer;font-family:inherit;transition:all .14s}
    .btn-add:hover{border-color:var(--gold);color:var(--gold-d)}
    .mt{margin-top:4px}

    /* Grid */
    .two-col{display:grid;grid-template-columns:1fr 1fr;gap:16px}
    .three-col{display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px}
    .fg{display:flex;flex-direction:column;gap:5px}
    .fg.full{grid-column:1/-1}
    label{font-size:12px;font-weight:700;color:var(--ink-soft)}
    .req{color:var(--danger)}
    .fc{padding:10px 13px;border:1.5px solid var(--cream-dk);border-radius:9px;font-size:13.5px;font-family:inherit;outline:none;transition:border-color .18s;background:#fff;width:100%;box-sizing:border-box;color:var(--ink-mid)}
    .fc:focus{border-color:var(--gold);box-shadow:0 0 0 3px rgba(201,168,76,.1)}
    .fc::placeholder{color:#c0bcc8}
    .ta{resize:none}
    .err{font-size:11.5px;color:var(--danger);font-weight:600}

    /* Upload */
    .upload-zone{border:2px dashed var(--cream-dk);border-radius:10px;padding:28px;text-align:center;cursor:pointer;transition:all .18s}
    .upload-zone:hover{border-color:var(--gold);background:rgba(201,168,76,.03)}
    .upload-ph{display:flex;flex-direction:column;align-items:center;gap:8px}
    .up-ico{font-size:36px}
    .up-txt{font-size:14px;color:var(--muted);font-weight:500}
    .up-hint{font-size:12px;color:#c0bcc8}
    .photo-preview{max-height:150px;border-radius:9px}

    /* Sub cards */
    .sub-card{background:var(--cream);border-radius:10px;padding:16px;margin-bottom:10px;border:1.5px solid var(--cream-dk)}
    .sub-card:last-child{margin-bottom:0}
    .sub-card-hd{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px}
    .sc-num{display:inline-flex;width:22px;height:22px;border-radius:50%;background:var(--ink-mid);color:var(--gold-l);font-size:11px;font-weight:700;align-items:center;justify-content:center}
    .sub-rm{background:none;border:none;cursor:pointer;font-size:12px;color:var(--danger);font-weight:600;padding:4px 8px;border-radius:6px;transition:all .14s;font-family:inherit}
    .sub-rm:hover{background:rgba(192,57,43,.1)}
    .sub-empty{text-align:center;padding:20px;font-size:13px;color:var(--muted);display:flex;align-items:center;justify-content:center;gap:8px;background:var(--cream);border-radius:9px;border:1.5px dashed var(--cream-dk)}
    .check-lbl{display:inline-flex;align-items:center;gap:8px;font-size:13px;font-weight:600;color:var(--ink-soft);cursor:pointer;margin-top:10px;padding:6px 10px;border-radius:7px;background:#fff;border:1.5px solid var(--cream-dk)}
    .check-lbl input{accent-color:var(--gold)}

    /* Recap */
    .recap-card{border-color:rgba(201,168,76,.25);background:rgba(201,168,76,.02)}
    .recap-grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px}
    .rg-section{}
    .rgs-title{font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.7px;color:var(--muted);margin-bottom:10px}
    .rg-row{display:flex;flex-direction:column;gap:1px;padding:7px 0;border-bottom:1px solid var(--cream-dk)}
    .rg-row:last-child{border:none}
    .rg-row span{font-size:11px;color:var(--muted);font-weight:600}
    .rg-row strong{font-size:13px;color:var(--ink-mid)}
    .rg-row strong.gold{color:var(--gold-d);font-size:16px;font-family:'Playfair Display',Georgia,serif}
    .success-banner{background:var(--ok-bg);border:1.5px solid var(--ok);border-radius:10px;padding:13px 16px;font-size:13px;color:var(--ok);font-weight:700;margin-top:4px}
    .error-banner{background:#FDECEA;border:1.5px solid var(--danger);border-radius:10px;padding:13px 16px;font-size:13px;color:var(--danger);font-weight:700;margin-top:4px}

    /* NAV BAR */
    .nav-bar{display:flex;align-items:center;justify-content:space-between;background:#fff;border-radius:var(--r);padding:14px 24px;box-shadow:0 2px 10px rgba(0,0,0,.06);border:1.5px solid var(--cream-dk);margin-top:8px;position:sticky;bottom:16px}
    .nb-right{display:flex;gap:10px}
    .btn-cancel{padding:9px 18px;border-radius:9px;background:#fff;border:1.5px solid var(--cream-dk);color:var(--muted);font-size:13px;font-weight:600;text-decoration:none;transition:all .15s;display:inline-flex;align-items:center}
    .btn-cancel:hover{color:var(--danger);border-color:var(--danger)}
    .btn-prev{padding:9px 18px;border-radius:9px;background:var(--cream);border:1.5px solid var(--cream-dk);color:var(--ink-soft);font-size:13px;font-weight:600;cursor:pointer;font-family:inherit;transition:all .15s}
    .btn-prev:hover{border-color:var(--ink-mid)}
    .btn-next{padding:9px 22px;border-radius:9px;background:var(--ink-mid);color:var(--gold-l);border:none;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit;transition:all .18s}
    .btn-next:disabled{opacity:.35;cursor:not-allowed}
    .btn-next:not(:disabled):hover{background:var(--ink-soft);box-shadow:0 4px 14px rgba(26,26,46,.2)}
    .btn-submit{padding:9px 26px;border-radius:9px;background:linear-gradient(135deg,var(--gold-d),var(--gold));color:#fff;border:none;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit;display:flex;align-items:center;gap:8px;min-width:200px;justify-content:center;transition:all .18s}
    .btn-submit:disabled{opacity:.4;cursor:not-allowed}
    .btn-submit:not(:disabled):hover{box-shadow:0 4px 16px rgba(201,168,76,.4)}
    .spin-w{width:16px;height:16px;border:2.5px solid rgba(255,255,255,.35);border-top-color:#fff;border-radius:50%;animation:spin .7s linear infinite;display:inline-block}
    @keyframes spin{to{transform:rotate(360deg)}}

    @media(max-width:700px){.two-col,.three-col{grid-template-columns:1fr}.recap-grid{grid-template-columns:1fr}.nav-bar{position:static;flex-direction:column;gap:10px;align-items:stretch}.nb-right{justify-content:flex-end}.btn-submit{width:100%}}
  `]
})
export class ProprietaireFormComponent implements OnInit {

  private fb     = inject(FormBuilder);
  private svc        = inject(ProprietairesService) as ProprietairesService;
  private fichiersSvc = inject(FichiersService) as FichiersService;
  private router = inject(Router);
  private route  = inject(ActivatedRoute);

  form!: FormGroup;
  photoFile?: File;
  photoPreview?: string;
  submitting = false;
  isEdit     = false;
  editId     = '';
  successMsg = '';
  errorMsg   = '';
  etape      = 0;

  steps = ['Identité & coordonnées', 'Documents & Finances', 'Notes & Confirmation'];

  ngOnInit() {
    this.isEdit = !!this.route.snapshot.params['id'];
    this.editId = this.route.snapshot.params['id'] ?? '';
    this.buildForm();

    if (this.isEdit) {
      this.svc.getById(this.editId).subscribe((p: any) => {
        this.form.patchValue({
          nom: p.nom, prenom: p.prenom,
          dateNaissance: p.dateNaissance?.slice(0, 10),
          lieuNaissance: p.lieuNaissance,
          adresse: p.adresse, quartier: p.quartier ?? '',
          telephone: p.telephone, telephoneSecondaire: p.telephoneSecondaire ?? '',
          email: p.email ?? '',
          typeDocumentId: p.typeDocumentId ?? 'CarteNationaleIdentite',
          numeroDocument: p.numeroDocument,
          notes: p.notes ?? ''
        });
        p.comptes?.forEach((c: any) => this.comptes.push(this.fb.group({
          banque: [c.banque, Validators.required], numero: [c.numero, Validators.required],
          agence: [c.agence ?? ''], estPrincipal: [c.estPrincipal ?? false]
        })));
        p.plateformes?.forEach((pl: any) => this.plateformes.push(this.fb.group({
          nom: [pl.nom, Validators.required], numero: [pl.numero, Validators.required],
          estPrincipal: [pl.estPrincipal ?? false]
        })));
        if (p.photoIdentiteUrl) this.photoPreview = p.photoIdentiteUrl;
      });
    }
  }

  buildForm() {
    this.form = this.fb.group({
      nom:                 ['', Validators.required],
      prenom:              ['', Validators.required],
      dateNaissance:       ['', Validators.required],
      lieuNaissance:       ['', Validators.required],
      adresse:             ['', Validators.required],
      quartier:            [''],
      telephone:           ['', [Validators.required, Validators.pattern(/^\+?[\d\s\-]{8,}$/)]],
      telephoneSecondaire: [''],
      email:               ['', Validators.email],
      typeDocumentId:      ['CarteNationaleIdentite', Validators.required],
      numeroDocument:      ['', Validators.required],
      notes:               [''],
      comptes:             this.fb.array([]),
      plateformes:         this.fb.array([])
    });
  }

  fi(f: string): boolean { const c = this.form.get(f); return !!(c?.invalid && c?.touched); }
  field(name: string) { return this.form.get(name); }
  get comptes()     { return this.form.get('comptes')    as FormArray; }
  get plateformes() { return this.form.get('plateformes') as FormArray; }

  peutContinuer(): boolean {
    if (this.etape === 0) {
      return ['prenom','nom','dateNaissance','lieuNaissance','telephone','adresse']
        .every(f => this.form.get(f)?.valid);
    }
    if (this.etape === 1) {
      return this.form.get('typeDocumentId')!.valid && this.form.get('numeroDocument')!.valid;
    }
    return true;
  }

  prevStep() { if (this.etape > 0) this.etape--; }
  nextStep() { if (this.etape < 2) this.etape++; }
  goStep(i: number) { if (i < this.etape) this.etape = i; }

  addCompte() {
    this.comptes.push(this.fb.group({
      banque: ['', Validators.required], numero: ['', Validators.required],
      agence: [''], estPrincipal: [false]
    }));
  }
  removeCompte(i: number) { this.comptes.removeAt(i); }

  addPlateforme() {
    this.plateformes.push(this.fb.group({
      nom: ['Bankily', Validators.required], numero: ['', Validators.required], estPrincipal: [false]
    }));
  }
  removePlateforme(i: number) { this.plateformes.removeAt(i); }

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

  submit() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.submitting = true;
    this.errorMsg   = '';
    // Soumettre les données texte sans FormData
    const fd = this.svc.buildFormData(this.form.value); // sans photo

    const uploadPhotoSiPresent = (proprietaireId: string) => {
      if (this.photoFile) {
        this.fichiersSvc.uploadFile(proprietaireId, 'Proprietaire', 'PhotoIdentite', this.photoFile)
          .subscribe({ error: () => console.warn('Photo non uploadée') });
      }
    };

    if (this.isEdit) {
      this.svc.update(this.editId, fd).subscribe({
        next: () => {
          uploadPhotoSiPresent(this.editId);
          this.submitting = false;
          this.successMsg = 'Modifications enregistrées avec succès !';
          setTimeout(() => this.router.navigate(['/proprietaires', this.editId]), 1500);
        },
        error: (err: any) => {
          this.submitting = false;
          this.errorMsg   = err?.error?.message ?? 'Une erreur est survenue.';
        }
      });
    } else {
      this.svc.create(fd).subscribe({
        next: (id: any) => {
          uploadPhotoSiPresent(id);
          this.router.navigate(['/proprietaires']);
        },
        error: (err: any) => { this.submitting = false; this.errorMsg = err?.error?.message ?? 'Erreur.'; }
      });
    }
  }
}