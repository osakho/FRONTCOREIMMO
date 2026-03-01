import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { ProprietairesService } from '../../../core/services/api.services';

@Component({
  selector: 'kdi-proprietaire-detail',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="page" *ngIf="proprietaire">
      <div class="page-header">
        <div class="detail-header-main">
          <div class="detail-avatar" *ngIf="!proprietaire.photoIdentiteUrl">
            {{ proprietaire.nomComplet.charAt(0) }}
          </div>
          <img *ngIf="proprietaire.photoIdentiteUrl" [src]="proprietaire.photoIdentiteUrl"
               class="detail-photo" alt="Photo">
          <div>
            <h2 class="page-title">{{ proprietaire.nomComplet }}</h2>
            <!-- <p class="page-subtitle">{{ proprietaire.telephone }} — {{ proprietaire.email ?? 'Pas d\'email' }}</p> -->
            <p class="page-subtitle">{{ proprietaire.telephone }} — {{ proprietaire.email ?? "Pas d'email" }}</p>
            <span class="badge" [class.badge-green]="proprietaire.estActif" [class.badge-gray]="!proprietaire.estActif">
              {{ proprietaire.estActif ? 'Actif' : 'Inactif' }}
            </span>
          </div>
        </div>
        <div class="header-actions">
          <a [routerLink]="['/proprietaires', proprietaire.id, 'edit']" class="btn btn-secondary">✏️ Modifier</a>
          <a routerLink="/proprietaires" class="btn btn-ghost">← Retour</a>
        </div>
      </div>

      <div class="detail-grid">
        <!-- Infos personnelles -->
        <div class="detail-card">
          <h3 class="detail-card-title">Informations personnelles</h3>
          <dl class="info-list">
            <dt>Date de naissance</dt><dd>{{ proprietaire.dateNaissance | date:'dd/MM/yyyy' }}</dd>
            <dt>Lieu de naissance</dt><dd>{{ proprietaire.lieuNaissance }}</dd>
            <dt>Adresse</dt><dd>{{ proprietaire.adresse }}<span *ngIf="proprietaire.quartier">, {{ proprietaire.quartier }}</span></dd>
            <dt>Document</dt><dd>{{ proprietaire.typeDocumentLabel }} — {{ proprietaire.numeroDocument }}</dd>
          </dl>
        </div>

        <!-- Statistiques -->
        <div class="detail-card">
          <h3 class="detail-card-title">Patrimoine géré</h3>
          <div class="stat-grid">
            <div class="stat-item">
              <div class="stat-val">{{ proprietaire.nombreProprietes }}</div>
              <div class="stat-lbl">Propriétés</div>
            </div>
          </div>
          <a [routerLink]="['/proprietes']" [queryParams]="{proprietaireId: proprietaire.id}" class="btn btn-sm mt-2">Voir les propriétés →</a>
        </div>

        <!-- Comptes bancaires -->
        <div class="detail-card" *ngIf="proprietaire.comptes.length">
          <h3 class="detail-card-title">Comptes bancaires</h3>
          <div *ngFor="let c of proprietaire.comptes" class="sub-item">
            <div class="sub-item-main">{{ c.banque }} — {{ c.numero }}</div>
            <span class="badge badge-green" *ngIf="c.estPrincipal">Principal</span>
          </div>
        </div>

        <!-- Plateformes mobiles -->
        <div class="detail-card" *ngIf="proprietaire.plateformes.length">
          <h3 class="detail-card-title">Plateformes mobiles</h3>
          <div *ngFor="let p of proprietaire.plateformes" class="sub-item">
            <div class="sub-item-main">{{ p.nom }} — {{ p.numero }}</div>
            <span class="badge badge-green" *ngIf="p.estPrincipal">Principal</span>
          </div>
        </div>

        <!-- Documents -->
        <div class="detail-card" *ngIf="proprietaire.documents.length">
          <h3 class="detail-card-title">Documents attachés</h3>
          <div *ngFor="let d of proprietaire.documents" class="doc-item">
            <span class="doc-icon">📄</span>
            <div>
              <div class="doc-name">{{ d.nomFichier }}</div>
              <div class="doc-type">{{ d.typeLabel }} — {{ d.creeLe | date:'dd/MM/yyyy' }}</div>
            </div>
            <a [href]="d.url" target="_blank" class="btn-icon">⬇️</a>
          </div>
        </div>

        <!-- Notes -->
        <div class="detail-card" *ngIf="proprietaire.notes">
          <h3 class="detail-card-title">Notes</h3>
          <p class="notes-text">{{ proprietaire.notes }}</p>
        </div>
      </div>
    </div>
  `,
  styles: [`
  .page { max-width: 1100px; margin: 0 auto; }
  .page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; }
  .page-title { font-size: 24px; font-weight: 700; color: #0c1a35; margin: 0 0 4px; }
  .page-subtitle { font-size: 14px; color: #64748b; margin: 0 0 8px; }
  .detail-header-main { display: flex; align-items: center; gap: 20px; }
  .detail-avatar { width: 64px; height: 64px; border-radius: 50%; background: #0c1a35; color: #c8a96e; font-size: 28px; font-weight: 700; display: flex; align-items: center; justify-content: center; }
  .detail-photo { width: 64px; height: 64px; border-radius: 50%; object-fit: cover; }
  .header-actions { display: flex; gap: 8px; }

  .btn { padding: 9px 18px; border-radius: 8px; font-size: 14px; font-weight: 500; cursor: pointer; border: none; text-decoration: none; display: inline-flex; align-items: center; gap: 6px; }
  .btn-secondary { background: #fff; color: #334155; border: 1px solid #e2e8f0; }
  .btn-ghost { background: transparent; color: #64748b; }
  .btn-sm { padding: 6px 12px; font-size: 13px; background: #f1f5f9; border: 1px solid #e2e8f0; border-radius: 6px; cursor: pointer; text-decoration: none; }

  .badge { padding: 3px 10px; border-radius: 12px; font-size: 12px; font-weight: 500; }
  .badge-green { background: #d1fae5; color: #065f46; }
  .badge-gray  { background: #f1f5f9; color: #64748b; }

  .detail-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
  .detail-card { background: #fff; border-radius: 12px; padding: 24px; box-shadow: 0 1px 3px rgba(0,0,0,.06); }
  .detail-card-title { font-size: 15px; font-weight: 600; color: #0c1a35; margin: 0 0 16px; padding-bottom: 10px; border-bottom: 1px solid #f1f5f9; }

  .info-list { margin: 0; display: grid; grid-template-columns: auto 1fr; gap: 8px 16px; font-size: 14px; }
  dt { color: #64748b; font-weight: 500; white-space: nowrap; }
  dd { color: #334155; margin: 0; }

  .stat-grid { display: flex; gap: 24px; }
  .stat-item { text-align: center; }
  .stat-val { font-size: 32px; font-weight: 700; color: #0c1a35; }
  .stat-lbl { font-size: 12px; color: #64748b; }
  .mt-2 { margin-top: 16px; }

  .sub-item { display: flex; align-items: center; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #f1f5f9; }
  .sub-item:last-child { border-bottom: none; }
  .sub-item-main { font-size: 14px; color: #334155; }

  .doc-item { display: flex; align-items: center; gap: 12px; padding: 10px 0; border-bottom: 1px solid #f1f5f9; }
  .doc-item:last-child { border-bottom: none; }
  .doc-icon { font-size: 24px; }
  .doc-name { font-size: 14px; color: #334155; font-weight: 500; }
  .doc-type { font-size: 12px; color: #94a3b8; }
  .btn-icon { font-size: 16px; text-decoration: none; padding: 4px; }

  .notes-text { font-size: 14px; color: #475569; line-height: 1.6; white-space: pre-wrap; margin: 0; }
`]
})
export class ProprietaireDetailComponent implements OnInit {
  private svc   = inject(ProprietairesService);
  private route = inject(ActivatedRoute);
  proprietaire: any;

  ngOnInit() {
    const id = this.route.snapshot.params['id'];
    this.svc.getById(id).subscribe(p => this.proprietaire = p);
  }
}