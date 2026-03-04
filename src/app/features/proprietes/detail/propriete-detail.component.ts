import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { map } from 'rxjs/operators';
import { ProprietesService, PersonnelService, AuthService } from '../../../core/services/api.services';
import { PersonnelListItemDto, CollecteurAffecteDto } from '../../../core/models/models';

@Component({
  selector: 'kdi-propriete-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, DecimalPipe, FormsModule],
  template: `
    <div class="page" *ngIf="p">
      <div class="page-header">
        <div>
          <h2 class="page-title">{{ p.libelle }}</h2>
          <p class="page-subtitle">{{ p.proprietaireNom }} — {{ p.adresse }}</p>
        </div>
        <div class="ha">
          <a [routerLink]="['/contrats-gestion']" [queryParams]="{proprieteId: p.id}" class="btn btn-sec">🤝 Contrat gestion</a>
          <a [routerLink]="['/produits']" [queryParams]="{proprieteId: p.id}" class="btn btn-sec">🏠 Produits</a>
          <a routerLink="/proprietes" class="btn btn-ghost">← Retour</a>
        </div>
      </div>

      <!-- Stats -->
      <div class="stats-row">
        <div class="sc navy"><div class="sc-val">{{ p.nombreProduits }}</div><div class="sc-lbl">Total produits</div></div>
        <div class="sc green"><div class="sc-val">{{ p.nombreProduitsLoues }}</div><div class="sc-lbl">Loués</div></div>
        <div class="sc orange"><div class="sc-val">{{ p.nombreProduitsLibres }}</div><div class="sc-lbl">Libres</div></div>
        <div class="sc gold">
          <div class="sc-val">
            {{ p.nombreProduits > 0 ? ((p.nombreProduitsLoues / p.nombreProduits) * 100 | number:'1.0-0') : 0 }}%
          </div>
          <div class="sc-lbl">Taux d'occupation</div>
        </div>
      </div>

      <!-- Infos -->
      <div class="detail-grid">
        <div class="dc">
          <h3 class="dc-title">Localisation</h3>
          <dl class="il">
            <dt>Adresse</dt>    <dd>{{ p.adresse }}</dd>
            <dt>Quartier</dt>   <dd>{{ p.quartier || '—' }}</dd>
            <dt>Ville</dt>      <dd>{{ p.ville }}</dd>
            <dt>Zone</dt>       <dd>{{ p.zoneCode || '—' }}</dd>
            <dt>GPS</dt>
            <dd>
              <span *ngIf="p.latitude && p.longitude">{{ p.latitude }}, {{ p.longitude }}</span>
              <span *ngIf="!p.latitude || !p.longitude">—</span>
            </dd>
          </dl>
          <p class="notes" *ngIf="p.description">{{ p.description }}</p>
        </div>
        <div class="dc">
          <h3 class="dc-title">Statut de gestion</h3>
          <div class="gestion-status">
            <span class="badge-big" [class.ok]="p.aContratGestion" [class.warn]="!p.aContratGestion">
              {{ p.aContratGestion ? '✅ Contrat de gestion actif' : '⚠️ Sans contrat de gestion' }}
            </span>
          </div>
          <div class="gestion-actions" *ngIf="!p.aContratGestion">
            <a [routerLink]="['/contrats-gestion/nouveau']" [queryParams]="{proprieteId: p.id}"
               class="btn btn-primary mt">＋ Créer le contrat de gestion</a>
          </div>
        </div>
      </div>

      <!-- ══════════════════════════════════════════════════ -->
      <!-- SECTION COLLECTEUR                                 -->
      <!-- ══════════════════════════════════════════════════ -->
      <div class="dc mb" *ngIf="isDirection()">
        <div class="section-header">
          <h3 class="dc-title" style="margin:0;border:none;padding:0">👷 Collecteur affecté</h3>
          <button
            class="btn btn-sm btn-outline"
            (click)="showAffectationForm = !showAffectationForm"
            *ngIf="p.aContratGestion">
            {{ showAffectationForm ? '✕ Annuler' : (p.collecteurActuel ? '🔄 Changer' : '＋ Affecter') }}
          </button>
        </div>

        <!-- Pas de contrat de gestion -->
        <div class="alert alert-warn" *ngIf="!p.aContratGestion">
          ⚠ Un contrat de gestion actif est requis avant d'affecter un collecteur.
        </div>

        <!-- Collecteur actuel -->
        <div class="collecteur-card" *ngIf="p.collecteurActuel && !showAffectationForm">
          <div class="collecteur-avatar">{{ initiales(p.collecteurActuel.collecteurNom) }}</div>
          <div class="collecteur-info">
            <div class="collecteur-nom">{{ p.collecteurActuel.collecteurNom }}</div>
            <div class="collecteur-meta">Depuis le {{ p.collecteurActuel.dateDebut | date:'dd/MM/yyyy' }}</div>
          </div>
          <span class="badge-statut loue">✓ Actif</span>
        </div>

        <!-- Aucun collecteur -->
        <div class="empty-mini" *ngIf="!p.collecteurActuel && !showAffectationForm && p.aContratGestion">
          👷 Aucun collecteur affecté —
          <a class="link" (click)="showAffectationForm = true" style="cursor:pointer">Affecter maintenant →</a>
        </div>

        <!-- Formulaire d'affectation -->
        <div class="affectation-form" *ngIf="showAffectationForm">
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Collecteur <span class="required">*</span></label>
              <select class="form-select" [(ngModel)]="affectation.collecteurId">
                <option value="">— Sélectionner —</option>
                <option *ngFor="let c of collecteurs()" [value]="c.id">{{ c.nomComplet }}</option>
              </select>
            </div>
          </div>

          <div class="alert alert-info" *ngIf="p.collecteurActuel">
            ℹ <strong>{{ p.collecteurActuel.collecteurNom }}</strong> sera automatiquement clôturé.
          </div>

          <div class="form-actions">
            <button
              class="btn btn-primary"
              [disabled]="!affectation.collecteurId || saving()"
              (click)="confirmerAffectation()">
              {{ saving() ? '⏳ Enregistrement…' : '✔ Confirmer' }}
            </button>
          </div>
        </div>
      </div>

      <!-- Produits -->
      <div class="sec-title">🏠 Produits locatifs ({{ p.produits?.length || 0 }})</div>
      <div class="produits-table" *ngIf="p.produits?.length; else noProduits">
        <div *ngFor="let prod of p.produits" class="prod-row">
          <span class="prod-code">{{ prod.code }}</span>
          <span class="prod-type">{{ prod.typeLabel }}</span>
          <span class="prod-loyer">{{ prod.loyerReference | number:'1.0-0' }} MRU/mois</span>
          <span class="badge-statut" [class.loue]="prod.statutLabel === 'Loue'" [class.libre]="prod.statutLabel === 'Libre'">
            {{ prod.statutLabel }}
          </span>
          <a [routerLink]="['/produits', prod.id]" class="btn-icon" title="Voir">👁</a>
        </div>
      </div>
      <ng-template #noProduits>
        <div class="empty-mini">
          Aucun produit locatif pour cette propriété.
          <a [routerLink]="['/produits/nouveau']" [queryParams]="{proprieteId: p.id}" class="link">Créer →</a>
        </div>
      </ng-template>
    </div>

    <div class="loading" *ngIf="!p">
      <div class="spinner"></div>
    </div>
  `,
  styles: [`
    .page{max-width:1100px;margin:0 auto}
    .page-header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:24px}
    .page-title{font-size:24px;font-weight:700;color:#0c1a35;margin:0 0 4px}
    .page-subtitle{font-size:14px;color:#64748b;margin:0}
    .ha{display:flex;gap:8px;flex-wrap:wrap}
    .btn{padding:9px 18px;border-radius:8px;font-size:14px;font-weight:500;cursor:pointer;border:none;text-decoration:none;display:inline-flex;align-items:center;gap:6px;transition:all .15s}
    .btn-primary{background:#0c1a35;color:#fff}
    .btn-primary:hover{background:#1e3a5f}
    .btn-primary:disabled{opacity:.5;cursor:not-allowed}
    .btn-sec{background:#fff;color:#334155;border:1px solid #e2e8f0}
    .btn-ghost{background:transparent;color:#64748b}
    .btn-sm{padding:6px 12px;font-size:12px}
    .btn-outline{background:#fff;border:1px solid #e2e8f0;color:#334155;border-radius:7px;cursor:pointer}
    .btn-outline:hover{border-color:#0c1a35;color:#0c1a35}
    .mt{margin-top:16px}
    .mb{margin-bottom:16px}

    /* Stats */
    .stats-row{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:24px}
    .sc{background:#fff;border-radius:12px;padding:20px;text-align:center;box-shadow:0 1px 3px rgba(0,0,0,.06);border-top:3px solid transparent}
    .sc.navy{border-top-color:#0c1a35}.sc.green{border-top-color:#10b981}.sc.orange{border-top-color:#f59e0b}.sc.gold{border-top-color:#c8a96e}
    .sc-val{font-size:28px;font-weight:800;color:#0c1a35}.sc-lbl{font-size:12px;color:#64748b;margin-top:4px}

    /* Cards */
    .detail-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px}
    .dc{background:#fff;border-radius:12px;padding:24px;box-shadow:0 1px 3px rgba(0,0,0,.06)}
    .dc-title{font-size:15px;font-weight:600;color:#0c1a35;margin:0 0 16px;padding-bottom:10px;border-bottom:1px solid #f1f5f9}
    .il{display:grid;grid-template-columns:auto 1fr;gap:8px 16px;font-size:14px;margin:0}
    dt{color:#64748b;font-weight:500}dd{color:#334155;margin:0}
    .notes{font-size:14px;color:#475569;margin-top:12px;line-height:1.6}
    .gestion-status{margin-bottom:12px}
    .badge-big{display:inline-block;padding:8px 16px;border-radius:10px;font-size:14px;font-weight:500}
    .badge-big.ok{background:#d1fae5;color:#065f46}.badge-big.warn{background:#fef3c7;color:#92400e}

    /* Section header collecteur */
    .section-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;padding-bottom:10px;border-bottom:1px solid #f1f5f9}

    /* Collecteur card */
    .collecteur-card{display:flex;align-items:center;gap:14px;padding:14px;background:#f8fafc;border-radius:10px;border:1px solid #e2e8f0}
    .collecteur-avatar{width:40px;height:40px;border-radius:50%;background:linear-gradient(135deg,#0c1a35,#2d5282);color:#fff;font-weight:700;font-size:14px;display:flex;align-items:center;justify-content:center;flex-shrink:0}
    .collecteur-nom{font-size:14px;font-weight:600;color:#0c1a35}
    .collecteur-meta{font-size:12px;color:#64748b;margin-top:2px}
    .collecteur-info{flex:1}

    /* Alerts */
    .alert{padding:10px 14px;border-radius:8px;font-size:13px;margin:12px 0}
    .alert-warn{background:#fef3c7;color:#92400e;border:1px solid #fde68a}
    .alert-info{background:#dbeafe;color:#1e40af;border:1px solid #bfdbfe}

    /* Formulaire affectation */
    .affectation-form{padding-top:14px}
    .form-row{display:grid;grid-template-columns:1fr;gap:14px;margin-bottom:14px}
    .form-group{display:flex;flex-direction:column;gap:6px}
    .form-label{font-size:12px;font-weight:600;color:#374151}
    .required{color:#ef4444}
    .form-select{padding:9px 12px;border:1px solid #e2e8f0;border-radius:8px;font-size:13px;color:#0c1a35;background:#fff;outline:none}
    .form-select:focus{border-color:#2d5282;box-shadow:0 0 0 3px rgba(45,82,130,.1)}
    .form-actions{display:flex;justify-content:flex-end;margin-top:12px}

    /* Produits */
    .sec-title{font-size:16px;font-weight:600;color:#0c1a35;margin-bottom:12px}
    .produits-table{background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.06)}
    .prod-row{display:grid;grid-template-columns:90px 1fr 150px 100px 40px;align-items:center;gap:12px;padding:12px 16px;border-bottom:1px solid #f1f5f9;font-size:14px}
    .prod-row:last-child{border:none}.prod-row:hover{background:#fafbfc}
    .prod-code{font-family:monospace;font-weight:700;background:#e0e7ef;padding:3px 8px;border-radius:6px;color:#0c1a35;font-size:12px}
    .prod-type{color:#64748b}
    .prod-loyer{font-weight:600;color:#0c1a35}
    .badge-statut{padding:3px 10px;border-radius:10px;font-size:12px;font-weight:500}
    .badge-statut.loue{background:#d1fae5;color:#065f46}
    .badge-statut.libre{background:#f1f5f9;color:#64748b}
    .btn-icon{background:none;border:none;cursor:pointer;font-size:16px;text-decoration:none;padding:4px;border-radius:6px}
    .btn-icon:hover{background:#f1f5f9}
    .empty-mini{background:#f8fafc;border-radius:10px;padding:24px;text-align:center;color:#94a3b8;font-size:14px}
    .link{color:#0c1a35;font-weight:500;text-decoration:none}
    .loading{display:flex;justify-content:center;padding:60px}
    .spinner{width:36px;height:36px;border:3px solid #e2e8f0;border-top-color:#0c1a35;border-radius:50%;animation:spin .8s linear infinite}
    @keyframes spin{to{transform:rotate(360deg)}}
    @media(max-width:768px){.stats-row{grid-template-columns:1fr 1fr}.detail-grid{grid-template-columns:1fr}}
  `]
})
export class ProprieteDetailComponent implements OnInit {
  private svc          = inject(ProprietesService);
  private personnelSvc = inject(PersonnelService);
  private auth         = inject(AuthService);
  private route        = inject(ActivatedRoute);

  p: any = null;
  collecteurs   = signal<PersonnelListItemDto[]>([]);
  saving        = signal(false);
  showAffectationForm = false;

  affectation = { collecteurId: '' };

  ngOnInit() {
    this.loadPropriete();
    this.loadCollecteurs();
  }

  loadPropriete() {
    this.svc.getById(this.route.snapshot.params['id']).subscribe(d => this.p = d);
  }

  loadCollecteurs() {
    this.personnelSvc.getAll(1).subscribe(r => {
      this.collecteurs.set(r.items.filter(p => p.typeLabel === 'Collecteur' && p.estActif));
    });
  }

  confirmerAffectation() {
    if (!this.affectation.collecteurId) return;
    this.saving.set(true);
    this.svc.affecterCollecteur(this.p.id, this.affectation.collecteurId).subscribe({
      next: () => {
        this.saving.set(false);
        this.showAffectationForm = false;
        this.affectation.collecteurId = '';
        this.loadPropriete();
      },
      error: (err: any) => {
        this.saving.set(false);
        alert(err?.error?.message ?? 'Erreur lors de l\'affectation');
      }
    });
  }

  initiales(nom: string): string {
    return nom.split(' ').map((p: string) => p[0]).join('').substring(0, 2).toUpperCase();
  }

  isDirection(): boolean { return this.auth.isDirection(); }
}