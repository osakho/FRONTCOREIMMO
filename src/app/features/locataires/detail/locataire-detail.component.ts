import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { LocatairesService } from '../../../core/services/api.services';

@Component({
  selector: 'kdi-locataire-detail',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="page" *ngIf="loc">
      <div class="page-header">
        <div class="ph-left">
          <div class="avatar" *ngIf="!loc.photoIdentiteUrl">{{ loc.nomComplet.charAt(0) }}</div>
          <img *ngIf="loc.photoIdentiteUrl" [src]="loc.photoIdentiteUrl" class="photo">
          <div>
            <h2 class="page-title">{{ loc.nomComplet }}</h2>
            <p class="page-subtitle">{{ loc.telephone }}<span *ngIf="loc.email"> — {{ loc.email }}</span></p>
            <span class="badge" [class.bg]="loc.estActif" [class.bgray]="!loc.estActif">{{ loc.estActif ? 'Actif' : 'Inactif' }}</span>
          </div>
        </div>
        <div class="ha">
          <a [routerLink]="['/contrats-location/nouveau']" [queryParams]="{locataireId:loc.id}" class="btn btn-primary">📋 Nouveau bail</a>
          <a routerLink="/locataires" class="btn btn-ghost">← Retour</a>
        </div>
      </div>

      <div class="detail-grid">
        <div class="dc">
          <h3 class="dc-title">Informations personnelles</h3>
          <dl class="il">
            <dt>Date naissance</dt><dd>{{ loc.dateNaissance | date:'dd/MM/yyyy' }}</dd>
            <dt>Lieu naissance</dt><dd>{{ loc.lieuNaissance||'—' }}</dd>
            <dt>Adresse</dt><dd>{{ loc.adresse }}<span *ngIf="loc.quartier">, {{ loc.quartier }}</span></dd>
            <dt>Document</dt><dd>{{ loc.typeDocumentLabel }} — {{ loc.numeroDocument }}</dd>
            <dt *ngIf="loc.profession">Profession</dt><dd *ngIf="loc.profession">{{ loc.profession }}</dd>
            <dt *ngIf="loc.employeur">Employeur</dt><dd *ngIf="loc.employeur">{{ loc.employeur }}</dd>
          </dl>
        </div>
        <div class="dc">
          <h3 class="dc-title">Baux actifs ({{ loc.contratsActifs?.length || 0 }})</h3>
          <div *ngFor="let c of loc.contratsActifs" class="contrat-item">
            <div class="ci-code">{{ c.produitCode }}</div>
            <div class="ci-info">{{ c.numero }} — {{ c.loyer|number:'1.0-0' }} MRU/mois</div>
            <span class="badge bg">{{ c.statut }}</span>
            <a [routerLink]="['/contrats-location', c.id]" class="btn-icon">👁</a>
          </div>
          <div *ngIf="!loc.contratsActifs?.length" class="empty-mini">Aucun bail actif.</div>
        </div>
      </div>

      <!-- Documents -->
      <div class="dc" *ngIf="loc.documents?.length">
        <h3 class="dc-title">Documents ({{ loc.documents.length }})</h3>
        <div *ngFor="let d of loc.documents" class="doc-item">
          <span class="doc-icon">📄</span>
          <div><div class="doc-name">{{ d.nomFichier }}</div><div class="doc-type">{{ d.typeLabel }}</div></div>
          <a [href]="d.url" target="_blank" class="btn-icon">⬇️</a>
        </div>
      </div>

      <div class="dc" *ngIf="loc.notes" style="margin-top:16px">
        <h3 class="dc-title">Notes</h3>
        <p class="notes-text">{{ loc.notes }}</p>
      </div>
    </div>`,
  styles: [`
    .page{max-width:1000px;margin:0 auto}.page-header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:24px}.ph-left{display:flex;align-items:center;gap:16px}.avatar{width:64px;height:64px;border-radius:50%;background:#0c1a35;color:#c8a96e;font-size:28px;font-weight:700;display:flex;align-items:center;justify-content:center}.photo{width:64px;height:64px;border-radius:50%;object-fit:cover}.page-title{font-size:24px;font-weight:700;color:#0c1a35;margin:0 0 4px}.page-subtitle{font-size:14px;color:#64748b;margin:0 0 6px}.ha{display:flex;gap:8px}.btn{padding:9px 18px;border-radius:8px;font-size:14px;font-weight:500;cursor:pointer;border:none;text-decoration:none;display:inline-flex;align-items:center;gap:6px}.btn-primary{background:#0c1a35;color:#fff}.btn-ghost{background:transparent;color:#64748b}.btn-icon{background:none;border:none;cursor:pointer;font-size:16px;text-decoration:none;padding:4px}.badge,.bg,.bgray{padding:3px 10px;border-radius:12px;font-size:12px;font-weight:500}.bg{background:#d1fae5;color:#065f46}.bgray{background:#f1f5f9;color:#64748b}.detail-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px}.dc{background:#fff;border-radius:12px;padding:24px;box-shadow:0 1px 3px rgba(0,0,0,.06)}.dc-title{font-size:15px;font-weight:600;color:#0c1a35;margin:0 0 16px;padding-bottom:10px;border-bottom:1px solid #f1f5f9}.il{display:grid;grid-template-columns:auto 1fr;gap:8px 16px;font-size:14px;margin:0}dt{color:#64748b;font-weight:500}dd{color:#334155;margin:0}.contrat-item{display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid #f1f5f9;font-size:14px}.contrat-item:last-child{border:none}.ci-code{font-family:monospace;font-weight:700;background:#e0e7ef;padding:3px 8px;border-radius:6px;color:#0c1a35;font-size:12px}.ci-info{flex:1;color:#64748b;font-size:13px}.doc-item{display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid #f1f5f9}.doc-item:last-child{border:none}.doc-icon{font-size:24px}.doc-name{font-size:14px;font-weight:500;color:#334155}.doc-type{font-size:12px;color:#94a3b8}.notes-text{font-size:14px;color:#475569;line-height:1.6;margin:0}.empty-mini{font-size:14px;color:#94a3b8;padding:8px 0}
  `]
})
export class LocataireDetailComponent implements OnInit {
  private svc = inject(LocatairesService);
  private route = inject(ActivatedRoute);
  loc: any = null;
  ngOnInit() { this.svc.getById(this.route.snapshot.params['id']).subscribe(d=>this.loc=d); }
}