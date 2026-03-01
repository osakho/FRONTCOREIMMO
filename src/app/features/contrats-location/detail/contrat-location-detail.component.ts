import { Component, inject, OnInit } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { ContratsLocationService } from '../../../core/services/api.services';

@Component({
  selector: 'kdi-contrat-location-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, DecimalPipe],
  template: `
    <div class="page" *ngIf="c">
      <div class="page-header">
        <div>
          <h2 class="page-title">Bail {{ c.numero }}</h2>
          <p class="page-subtitle">{{ c.locataireNom }} — {{ c.produitCode }}</p>
        </div>
        <div class="ha">
          <button *ngIf="c.statutLabel === 'Brouillon' && c.peutEtreActive"
                  (click)="activer()" class="btn btn-primary">🔑 Remettre les clés</button>
          <a routerLink="/contrats-location" class="btn btn-ghost">← Retour</a>
        </div>
      </div>

      <!-- Status banner -->
      <div class="status-banner" [class.actif]="c.statutLabel==='Actif'" [class.brouillon]="c.statutLabel==='Brouillon'">
        <span class="sb-status">{{ c.statutLabel }}</span>
        <span class="sb-loyer">{{ c.loyer | number:'1.0-0' }} MRU/mois</span>
        <span class="sb-dates">Entrée : {{ c.dateEntree | date:'dd/MM/yyyy' }}</span>
      </div>

      <div class="detail-grid">
        <!-- Informations bail -->
        <div class="dc">
          <h3 class="dc-title">Informations du bail</h3>
          <dl class="il">
            <dt>Locataire</dt><dd>{{ c.locataireNom }}</dd>
            <dt>Téléphone</dt><dd>{{ c.locataireTel }}</dd>
            <dt>Produit</dt><dd>{{ c.produitCode }}</dd>
            <dt>Loyer</dt><dd class="font-bold">{{ c.loyer | number:'1.0-0' }} MRU</dd>
            <dt>Caution</dt><dd>{{ c.caution | number:'1.0-0' }} MRU</dd>
            <dt>Avance</dt><dd>{{ c.avanceLoyer | number:'1.0-0' }} MRU</dd>
            <dt>Périodicité</dt><dd>{{ c.periodiciteLabel }}</dd>
            <dt>Paiement</dt><dd>du {{ c.jourDebutPaiement }} au {{ c.jourFinPaiement }} du mois</dd>
          </dl>
        </div>

        <!-- Checklist entrée -->
        <div class="dc">
          <h3 class="dc-title">Checklist entrée</h3>
          <div class="checklist">
            <div class="cl-row" [class.ok]="c.cautionReglee"><span>{{ c.cautionReglee ? '✅' : '⬜' }}</span> Caution réglée</div>
            <div class="cl-row" [class.ok]="c.avanceLoyerReglee"><span>{{ c.avanceLoyerReglee ? '✅' : '⬜' }}</span> Avance loyer réglée</div>
            <div class="cl-row" [class.ok]="c.contratSigne"><span>{{ c.contratSigne ? '✅' : '⬜' }}</span> Contrat signé</div>
            <div class="cl-row" [class.ok]="c.edlEntreeValide"><span>{{ c.edlEntreeValide ? '✅' : '⬜' }}</span> État des lieux entrée</div>
            <div class="cl-row" [class.ok]="c.photosAvantRemise"><span>{{ c.photosAvantRemise ? '✅' : '⬜' }}</span> Photos avant remise</div>
            <div class="cl-row" *ngIf="c.indexElecEntree !== null">
              <span>⚡</span> Index élec. entrée : <strong>{{ c.indexElecEntree }}</strong>
            </div>
            <div class="cl-row" *ngIf="c.indexEauEntree !== null">
              <span>💧</span> Index eau entrée : <strong>{{ c.indexEauEntree }}</strong>
            </div>
          </div>
        </div>
      </div>

      <!-- Actions rapides -->
      <div class="actions-card" *ngIf="c.statutLabel === 'Actif'">
        <h3 class="dc-title">Actions</h3>
        <div class="action-btns">
          <a [routerLink]="['/collectes/saisir']" [queryParams]="{contratId: c.id}" class="btn btn-primary">💰 Saisir un loyer</a>
          <a [routerLink]="['/collectes']" [queryParams]="{contratId: c.id}" class="btn btn-sec">📊 Historique collectes</a>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .page{max-width:1000px;margin:0 auto}
    .page-header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:24px}
    .page-title{font-size:24px;font-weight:700;color:#0c1a35;margin:0 0 4px}
    .page-subtitle{font-size:14px;color:#64748b;margin:0}
    .ha{display:flex;gap:8px}
    .btn{padding:9px 18px;border-radius:8px;font-size:14px;font-weight:500;cursor:pointer;border:none;text-decoration:none;display:inline-flex;align-items:center;gap:6px}
    .btn-primary{background:#0c1a35;color:#fff}
    .btn-ghost{background:transparent;color:#64748b}
    .btn-sec{background:#fff;color:#334155;border:1px solid #e2e8f0}
    .status-banner{display:flex;align-items:center;gap:20px;padding:14px 20px;border-radius:12px;margin-bottom:24px}
    .status-banner.actif{background:#d1fae5;color:#065f46}
    .status-banner.brouillon{background:#f1f5f9;color:#475569}
    .sb-status{font-size:16px;font-weight:700}
    .sb-loyer{font-size:20px;font-weight:800;margin-left:auto}
    .sb-dates{font-size:14px}
    .detail-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px}
    .dc{background:#fff;border-radius:12px;padding:24px;box-shadow:0 1px 3px rgba(0,0,0,.06)}
    .dc-title{font-size:15px;font-weight:600;color:#0c1a35;margin:0 0 16px;padding-bottom:10px;border-bottom:1px solid #f1f5f9}
    .il{display:grid;grid-template-columns:auto 1fr;gap:8px 16px;font-size:14px;margin:0}
    dt{color:#64748b;font-weight:500}dd{color:#334155;margin:0}.font-bold{font-weight:700;color:#0c1a35}
    .checklist{display:flex;flex-direction:column;gap:8px}
    .cl-row{display:flex;align-items:center;gap:8px;font-size:14px;color:#64748b;padding:6px 8px;border-radius:6px}
    .cl-row.ok{color:#065f46;background:#f0fdf4}
    .actions-card{background:#fff;border-radius:12px;padding:24px;box-shadow:0 1px 3px rgba(0,0,0,.06)}
    .action-btns{display:flex;gap:10px;flex-wrap:wrap}
  `]
})
export class ContratLocationDetailComponent implements OnInit {
  private svc   = inject(ContratsLocationService);
  private route = inject(ActivatedRoute);
  c: any = null;

  ngOnInit() { this.svc['get'] ? null : null;  // placeholder
    // TODO: implémenter getById dans ContratsLocationService
    // this.svc.getById(this.route.snapshot.params['id']).subscribe(d => this.c = d);
    this.c = { numero: 'CL-2026-0001', locataireNom: '...', produitCode: 'CH-01', loyer: 0, statutLabel: 'Actif', peutEtreActive: false };
  }

  activer() {
    this.svc.activer(this.route.snapshot.params['id']).subscribe(() => {
      if (this.c) this.c.statutLabel = 'Actif';
    });
  }
}