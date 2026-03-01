import { Component, inject, OnInit } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { ProprietesService } from '../../../core/services/api.services';

@Component({
  selector: 'kdi-propriete-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, DecimalPipe],
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
    .btn{padding:9px 18px;border-radius:8px;font-size:14px;font-weight:500;cursor:pointer;border:none;text-decoration:none;display:inline-flex;align-items:center;gap:6px}
    .btn-primary{background:#0c1a35;color:#fff}
    .btn-sec{background:#fff;color:#334155;border:1px solid #e2e8f0}
    .btn-ghost{background:transparent;color:#64748b}
    .mt{margin-top:16px}
    .stats-row{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:24px}
    .sc{background:#fff;border-radius:12px;padding:20px;text-align:center;box-shadow:0 1px 3px rgba(0,0,0,.06);border-top:3px solid transparent}
    .sc.navy{border-top-color:#0c1a35}.sc.green{border-top-color:#10b981}.sc.orange{border-top-color:#f59e0b}.sc.gold{border-top-color:#c8a96e}
    .sc-val{font-size:28px;font-weight:800;color:#0c1a35}.sc-lbl{font-size:12px;color:#64748b;margin-top:4px}
    .detail-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:24px}
    .dc{background:#fff;border-radius:12px;padding:24px;box-shadow:0 1px 3px rgba(0,0,0,.06)}
    .dc-title{font-size:15px;font-weight:600;color:#0c1a35;margin:0 0 16px;padding-bottom:10px;border-bottom:1px solid #f1f5f9}
    .il{display:grid;grid-template-columns:auto 1fr;gap:8px 16px;font-size:14px;margin:0}
    dt{color:#64748b;font-weight:500}dd{color:#334155;margin:0}
    .notes{font-size:14px;color:#475569;margin-top:12px;line-height:1.6}
    .gestion-status{margin-bottom:12px}
    .badge-big{display:inline-block;padding:8px 16px;border-radius:10px;font-size:14px;font-weight:500}
    .badge-big.ok{background:#d1fae5;color:#065f46}.badge-big.warn{background:#fef3c7;color:#92400e}
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
  private svc   = inject(ProprietesService);
  private route = inject(ActivatedRoute);
  p: any = null;
  ngOnInit() { this.svc.getById(this.route.snapshot.params['id']).subscribe(d => this.p = d); }
}
