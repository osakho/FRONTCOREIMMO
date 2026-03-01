import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router, ActivatedRoute } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { ContratsGestionService, ProprietesService } from '../../../core/services/api.services';

@Component({
  selector: 'kdi-contrat-gestion-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, FormsModule],
  template: `
    <div class="page">
      <div class="page-header">
        <div>
          <h2 class="page-title">Nouveau contrat de gestion</h2>
          <p class="page-subtitle">Mandat de gestion locative — Accès Direction</p>
        </div>
        <a routerLink="/contrats-gestion" class="btn btn-secondary">← Retour</a>
      </div>

      <!-- Alerte Documents obligatoires -->
      <div class="docs-alert">
        <div class="da-title">📋 Documents obligatoires pour activer le contrat</div>
        <div class="da-list">
          <div class="da-item" [class.ok]="docIdentite">
            <span class="da-icon">{{ docIdentite ? '✅' : '⬜' }}</span>
            CNI / Passeport du propriétaire
          </div>
          <div class="da-item" [class.ok]="photosEdl.length > 0">
            <span class="da-icon">{{ photosEdl.length > 0 ? '✅' : '⬜' }}</span>
            Photos état des lieux initial ({{ photosEdl.length }} fichier(s))
          </div>
          <div class="da-item" [class.ok]="docAutorisation">
            <span class="da-icon">{{ docAutorisation ? '✅' : '⬜' }}</span>
            Document autorisation d'exploitation
          </div>
        </div>
      </div>

      <form [formGroup]="form" (ngSubmit)="submit()">

        <!-- Propriété -->
        <div class="form-card">
          <h3 class="form-card-title">Propriété concernée *</h3>
          <div class="form-group">
            <label>Rechercher la propriété</label>
            <input type="text" class="form-control" placeholder="🔍 Nom de la propriété…"
                   [value]="searchProp" (input)="onSearchProp($event)">
            <div class="ac-list" *ngIf="propResultats.length && !propSel">
              <div *ngFor="let p of propResultats" class="ac-item" (click)="selectProp(p)">
                <strong>{{ p.libelle }}</strong> — {{ p.proprietaireNom }}
                <span class="ac-warn" *ngIf="p.aContratGestion">⚠️ Contrat existant</span>
              </div>
            </div>
            <div class="selected-chip" *ngIf="propSel">
              🏘️ {{ propSel.libelle }} ({{ propSel.proprietaireNom }})
              <button type="button" (click)="clearProp()">✕</button>
            </div>
          </div>
        </div>

        <div *ngIf="propSel">
          <!-- Conditions financières (CONFIDENTIELLES) -->
          <div class="form-card confidentiel">
            <div class="fc-header">
              <h3 class="form-card-title">💰 Conditions financières — CONFIDENTIEL</h3>
              <span class="confidentiel-badge">🔒 Direction uniquement</span>
            </div>
            <div class="form-grid-2">
              <div class="form-group">
                <label>Taux de commission (%) *</label>
                <div class="input-pct">
                  <input formControlName="tauxCommission" type="number" class="form-control"
                         min="0" max="100" step="0.1" placeholder="10">
                  <span class="pct-suffix">%</span>
                </div>
                <span class="form-hint">Pourcentage prélevé sur les loyers collectés</span>
              </div>
              <div class="form-group">
                <label>Périodicité de versement *</label>
                <select formControlName="periodicite" class="form-control">
                  <option value="Mensuel">Mensuel</option>
                  <option value="Bimensuel">Bimensuel (tous les 2 mois)</option>
                  <option value="Trimestriel">Trimestriel</option>
                </select>
              </div>
            </div>
          </div>

          <!-- Période du contrat -->
          <div class="form-card">
            <h3 class="form-card-title">Période du contrat</h3>
            <div class="form-grid-2">
              <div class="form-group">
                <label>Date de début *</label>
                <input formControlName="dateDebut" type="date" class="form-control">
              </div>
              <div class="form-group">
                <label>Date de fin (optionnelle)</label>
                <input formControlName="dateFin" type="date" class="form-control">
              </div>
              <div class="form-group fg-full">
                <label>Conditions particulières</label>
                <textarea formControlName="conditionsParticulieres" class="form-control" rows="3"
                          placeholder="Clauses spéciales, exonérations, accords particuliers…"></textarea>
              </div>
            </div>
          </div>

          <!-- Documents OBLIGATOIRES -->
          <div class="form-card">
            <h3 class="form-card-title">Documents obligatoires</h3>

            <div class="doc-upload-row">
              <div class="dur-label">
                <span class="dur-req">*</span> CNI / Passeport du propriétaire
              </div>
              <div class="file-zone" [class.uploaded]="docIdentite" (click)="docIdentiteInput.click()">
                <input #docIdentiteInput type="file" accept=".pdf,.jpg,.jpeg,.png"
                       style="display:none" (change)="onDocIdentite($event)">
                <span *ngIf="!docIdentite">📎 Cliquer pour joindre</span>
                <span *ngIf="docIdentite" class="file-ok">✅ {{ docIdentite.name }}</span>
              </div>
            </div>

            <div class="doc-upload-row">
              <div class="dur-label">
                <span class="dur-req">*</span> Photos état des lieux initial
              </div>
              <div class="file-zone multi" [class.uploaded]="photosEdl.length > 0" (click)="photosEdlInput.click()">
                <input #photosEdlInput type="file" accept="image/*" multiple
                       style="display:none" (change)="onPhotosEdl($event)">
                <span *ngIf="!photosEdl.length">📸 Joindre les photos (multiple)</span>
                <span *ngIf="photosEdl.length" class="file-ok">✅ {{ photosEdl.length }} photo(s)</span>
              </div>
            </div>

            <div class="doc-upload-row">
              <div class="dur-label">
                <span class="dur-req">*</span> Autorisation d'exploitation
              </div>
              <div class="file-zone" [class.uploaded]="docAutorisation" (click)="docAutorisationInput.click()">
                <input #docAutorisationInput type="file" accept=".pdf,.jpg,.jpeg,.png"
                       style="display:none" (change)="onDocAutorisation($event)">
                <span *ngIf="!docAutorisation">📎 Cliquer pour joindre</span>
                <span *ngIf="docAutorisation" class="file-ok">✅ {{ docAutorisation.name }}</span>
              </div>
            </div>
          </div>

          <!-- Versement -->
          <div class="form-card">
            <h3 class="form-card-title">Modalités de versement au propriétaire (optionnel)</h3>
            <div class="form-grid-2">
              <div class="form-group">
                <label>Banque / Compte préféré</label>
                <input formControlName="compteBancaireId" class="form-control" placeholder="ID du compte bancaire">
                <span class="form-hint">Renseigner depuis la fiche propriétaire</span>
              </div>
              <div class="form-group">
                <label>Plateforme mobile préférée</label>
                <input formControlName="plateformeId" class="form-control" placeholder="ID de la plateforme">
              </div>
            </div>
          </div>

          <div class="form-actions">
            <a routerLink="/contrats-gestion" class="btn btn-secondary">Annuler</a>
            <button type="submit" class="btn btn-primary" [disabled]="form.invalid || submitting">
              <span *ngIf="submitting" class="spinner"></span>
              {{ submitting ? 'Création…' : '🤝 Créer le contrat de gestion' }}
            </button>
          </div>
        </div>
      </form>
    </div>
  `,
  styles: [`
    .page{max-width:860px;margin:0 auto}
    .page-header{display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:24px}
    .page-title{font-size:24px;font-weight:700;color:#0c1a35;margin:0 0 4px}
    .page-subtitle{font-size:14px;color:#64748b;margin:0}
    .btn{padding:9px 18px;border-radius:8px;font-size:14px;font-weight:500;cursor:pointer;border:none;text-decoration:none;display:inline-flex;align-items:center;gap:6px}
    .btn-primary{background:#0c1a35;color:#fff}.btn-primary:hover{background:#1a2d52}
    .btn-primary:disabled{opacity:.5;cursor:not-allowed}
    .btn-secondary{background:#fff;color:#334155;border:1px solid #e2e8f0}

    .docs-alert{background:#fffbeb;border:1px solid #fde68a;border-radius:12px;padding:16px 20px;margin-bottom:20px}
    .da-title{font-size:14px;font-weight:600;color:#92400e;margin-bottom:12px}
    .da-list{display:flex;flex-direction:column;gap:8px}
    .da-item{display:flex;align-items:center;gap:10px;font-size:14px;color:#78350f;padding:6px 10px;border-radius:8px;background:rgba(253,230,138,.3)}
    .da-item.ok{background:rgba(187,247,208,.4);color:#065f46}
    .da-icon{font-size:16px}

    .form-card{background:#fff;border-radius:12px;padding:24px;margin-bottom:16px;box-shadow:0 1px 3px rgba(0,0,0,.06)}
    .form-card.confidentiel{border:2px solid #fde68a;background:#fffdf5}
    .fc-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;padding-bottom:12px;border-bottom:1px solid #f1f5f9}
    .form-card-title{font-size:16px;font-weight:600;color:#0c1a35;margin:0}
    .confidentiel-badge{background:#fef3c7;color:#92400e;padding:4px 10px;border-radius:8px;font-size:12px;font-weight:600}

    .form-grid-2{display:grid;grid-template-columns:1fr 1fr;gap:16px}
    .form-group{display:flex;flex-direction:column;gap:6px}
    .fg-full{grid-column:1/-1}
    label{font-size:13px;font-weight:500;color:#374151}
    .form-control{padding:9px 12px;border:1px solid #e2e8f0;border-radius:8px;font-size:14px}
    .form-control:focus{outline:none;border-color:#0c1a35;box-shadow:0 0 0 3px rgba(12,26,53,.08)}
    .form-hint{font-size:12px;color:#94a3b8}
    .input-pct{position:relative;display:flex;align-items:center}
    .input-pct .form-control{padding-right:36px;flex:1}
    .pct-suffix{position:absolute;right:12px;color:#64748b;font-weight:600}

    .doc-upload-row{display:flex;align-items:center;gap:16px;padding:12px 0;border-bottom:1px solid #f1f5f9}
    .doc-upload-row:last-child{border:none}
    .dur-label{flex:1;font-size:14px;color:#334155;font-weight:500;display:flex;align-items:center;gap:6px}
    .dur-req{color:#dc2626;font-weight:700}
    .file-zone{flex:1;border:2px dashed #e2e8f0;border-radius:8px;padding:10px 14px;cursor:pointer;font-size:13px;color:#64748b;text-align:center;transition:all .15s}
    .file-zone:hover{border-color:#c8a96e;background:#fffbf0}
    .file-zone.uploaded{border-color:#10b981;background:#f0fdf4}
    .file-ok{color:#065f46;font-weight:500}

    .form-actions{display:flex;justify-content:flex-end;gap:12px}
    .spinner{width:14px;height:14px;border:2px solid rgba(255,255,255,.3);border-top-color:#fff;border-radius:50%;animation:spin .7s linear infinite}
    @keyframes spin{to{transform:rotate(360deg)}}

    .ac-list{border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;margin-top:4px;background:#fff}
    .ac-item{padding:10px 14px;cursor:pointer;font-size:14px;border-bottom:1px solid #f1f5f9;display:flex;align-items:center;gap:8px}
    .ac-item:last-child{border:none}.ac-item:hover{background:#f8fafc}
    .ac-warn{font-size:12px;color:#d97706;margin-left:auto}
    .selected-chip{display:flex;align-items:center;justify-content:space-between;background:#f0f9ff;border:1px solid #bae6fd;border-radius:8px;padding:10px 14px;margin-top:4px;font-size:14px;color:#0c4a6e}
    .selected-chip button{background:none;border:none;cursor:pointer;color:#64748b;font-size:16px}
  `]
})
export class ContratGestionFormComponent implements OnInit {
  private fb      = inject(FormBuilder);
  private svc     = inject(ContratsGestionService);
  private propSvc = inject(ProprietesService);
  private router  = inject(Router);
  private route   = inject(ActivatedRoute);

  form = this.fb.group({
    dateDebut:              [new Date().toISOString().substring(0,10), Validators.required],
    dateFin:                [''],
    tauxCommission:         [null as number | null, [Validators.required, Validators.min(0), Validators.max(100)]],
    periodicite:            ['Mensuel', Validators.required],
    conditionsParticulieres:[''],
    compteBancaireId:       [''],
    plateformeId:           ['']
  });

  propSel: any = null;
  propResultats: any[] = [];
  searchProp = '';
  docIdentite: File | null = null;
  photosEdl: File[] = [];
  docAutorisation: File | null = null;
  submitting = false;
  timer: any;

  ngOnInit() {
    const pid = this.route.snapshot.queryParams['proprieteId'];
    if (pid) this.propSvc.getById(pid).subscribe(p => this.propSel = p);
  }

  onSearchProp(e: Event) {
    const val = (e.target as HTMLInputElement).value;
    this.searchProp = val;
    clearTimeout(this.timer);
    if (val.length < 2) { this.propResultats = []; return; }
    this.timer = setTimeout(() => {
      this.propSvc.getAll(1, 10, val).subscribe(r => this.propResultats = r.items);
    }, 350);
  }

  selectProp(p: any) { this.propSel = p; this.propResultats = []; }
  clearProp() { this.propSel = null; this.searchProp = ''; }

  onDocIdentite(e: Event) {
    this.docIdentite = (e.target as HTMLInputElement).files?.[0] || null;
  }
  onPhotosEdl(e: Event) {
    this.photosEdl = Array.from((e.target as HTMLInputElement).files || []);
  }
  onDocAutorisation(e: Event) {
    this.docAutorisation = (e.target as HTMLInputElement).files?.[0] || null;
  }

  submit() {
    if (this.form.invalid || !this.propSel) return;
    this.submitting = true;

    const fd = new FormData();
    fd.append('proprieteId', this.propSel.id);
    const v = this.form.value;
    Object.entries(v).forEach(([k, val]) => {
      if (val !== null && val !== undefined && val !== '')
        fd.append(k, String(val));
    });
    // Convertir taux en décimal (10% -> 0.10)
    const taux = Number(v.tauxCommission) / 100;
    fd.set('tauxCommission', String(taux));

    if (this.docIdentite)    fd.append('docIdentiteProprietaire', this.docIdentite);
    if (this.docAutorisation) fd.append('docAutorisation', this.docAutorisation);
    this.photosEdl.forEach(f => fd.append('photosEtatLieux', f));

    this.svc.create(fd).subscribe({
      next: () => this.router.navigate(['/contrats-gestion']),
      error: () => { this.submitting = false; }
    });
  }
}
