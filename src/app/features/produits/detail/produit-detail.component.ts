import { Component, inject, OnInit } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ProduitsService } from '../../../core/services/api.services';

@Component({
  selector: 'kdi-produit-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, DecimalPipe],
  template: `
    <div class="page" *ngIf="p">
      <div class="page-header">
        <div class="ph-left">
          <div class="code-big">{{ p.code }}</div>
          <div>
            <h2 class="page-title">{{ p.description }}</h2>
            <p class="page-subtitle">{{ p.proprieteLibelle }}</p>
          </div>
        </div>
        <div class="ha">
          <a *ngIf="p.statut==='Libre'" [routerLink]="['/contrats-location/nouveau']" [queryParams]="{produitId:p.id}" class="btn btn-primary">📋 Créer un bail</a>
          <a routerLink="/produits" class="btn btn-ghost">← Retour</a>
        </div>
      </div>

      <div class="status-banner" [class.loue]="p.statut==='Loue'" [class.libre]="p.statut==='Libre'" [class.travaux]="p.statut==='EnTravaux'">
        <span class="sb-icon">{{ statutIcon(p.statut) }}</span>
        <span class="sb-text">{{ p.statutLabel }}</span>
        <span class="sb-loyer">Loyer de référence : {{ p.loyerReference|number:'1.0-0' }} MRU/mois</span>
      </div>

      <div class="detail-grid">
        <div class="dc">
          <h3 class="dc-title">Caractéristiques</h3>
          <dl class="il">
            <dt>Type</dt><dd>{{ p.typeLabel }}</dd>
            <dt>Étage</dt><dd>{{ p.etage === 0 ? 'RDC' : 'Étage ' + p.etage }}</dd>
            <dt>Surface</dt><dd>{{ p.surface ? p.surface + ' m²' : 'Non renseigné' }}</dd>
            <dt>Compteur élec.</dt><dd>{{ p.hasCompteurElec ? 'Oui ✓' : 'Non' }}</dd>
            <dt>Compteur eau</dt><dd>{{ p.hasCompteurEau ? 'Oui ✓' : 'Non' }}</dd>
          </dl>
          <p class="notes" *ngIf="p.notes">{{ p.notes }}</p>
        </div>

        <!-- Loyer modifiable -->
        <div class="dc">
          <h3 class="dc-title">Loyer de référence</h3>
          <div class="loyer-edit">
            <div class="le-current">{{ p.loyerReference|number:'1.0-0' }} MRU</div>
            <div class="le-form" *ngIf="editLoyer">
              <input type="number" [(ngModel)]="newLoyer" class="form-control-sm">
              <button class="btn btn-sm btn-primary" (click)="saveLoyer()">Enregistrer</button>
              <button class="btn btn-sm" (click)="editLoyer=false">Annuler</button>
            </div>
            <button *ngIf="!editLoyer" class="btn btn-sm" (click)="startEditLoyer()">✏️ Modifier</button>
          </div>
        </div>
      </div>

      <!-- Bail actuel -->
      <div *ngIf="p.contratActif" class="contrat-actuel">
        <h3 class="dc-title">🔑 Bail actuel</h3>
        <div class="ca-info">
          <div><strong>{{ p.contratActif.locataireNom }}</strong></div>
          <div class="ca-num">{{ p.contratActif.numero }}</div>
          <span class="badge bg-blue">{{ p.contratActif.statut }}</span>
          <a [routerLink]="['/contrats-location', p.contratActif.id]" class="btn btn-sm">Voir le bail →</a>
        </div>
      </div>
    </div>`,
  styles: [`
    .page{max-width:900px;margin:0 auto}.page-header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:24px}.ph-left{display:flex;align-items:center;gap:16px}.code-big{font-family:monospace;font-size:28px;font-weight:800;background:#0c1a35;color:#c8a96e;padding:8px 16px;border-radius:10px}.page-title{font-size:24px;font-weight:700;color:#0c1a35;margin:0 0 4px}.page-subtitle{font-size:14px;color:#64748b;margin:0}.ha{display:flex;gap:8px}.btn{padding:9px 18px;border-radius:8px;font-size:14px;font-weight:500;cursor:pointer;border:none;text-decoration:none;display:inline-flex;align-items:center;gap:6px}.btn-primary{background:#0c1a35;color:#fff}.btn-ghost{background:transparent;color:#64748b}.btn-sm{padding:6px 12px;font-size:13px;background:#f1f5f9;border:1px solid #e2e8f0;border-radius:6px;cursor:pointer;display:inline-flex;align-items:center;gap:4px;text-decoration:none}.btn-sm.btn-primary{background:#0c1a35;color:#fff;border-color:#0c1a35}.status-banner{display:flex;align-items:center;gap:16px;padding:16px 20px;border-radius:12px;margin-bottom:24px;font-size:15px}.status-banner.loue{background:#eff6ff;color:#1d4ed8}.status-banner.libre{background:#f0fdf4;color:#166534}.status-banner.travaux{background:#fef3c7;color:#92400e}.sb-icon{font-size:24px}.sb-text{font-weight:600}.sb-loyer{margin-left:auto;font-size:18px;font-weight:700}.detail-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:24px}.dc{background:#fff;border-radius:12px;padding:24px;box-shadow:0 1px 3px rgba(0,0,0,.06)}.dc-title{font-size:15px;font-weight:600;color:#0c1a35;margin:0 0 16px;padding-bottom:10px;border-bottom:1px solid #f1f5f9}.il{display:grid;grid-template-columns:auto 1fr;gap:8px 16px;font-size:14px;margin:0}dt{color:#64748b;font-weight:500}dd{color:#334155;margin:0}.notes{font-size:14px;color:#475569;margin-top:12px}.loyer-edit{display:flex;flex-direction:column;gap:12px}.le-current{font-size:32px;font-weight:800;color:#0c1a35}.le-form{display:flex;gap:8px;align-items:center}.form-control-sm{padding:8px 12px;border:1px solid #e2e8f0;border-radius:8px;font-size:14px;width:140px}.contrat-actuel{background:#fff;border-radius:12px;padding:24px;box-shadow:0 1px 3px rgba(0,0,0,.06)}.ca-info{display:flex;align-items:center;gap:16px;font-size:14px}.ca-num{font-family:monospace;color:#64748b}.badge{padding:3px 10px;border-radius:12px;font-size:12px;font-weight:500}.bg-blue{background:#dbeafe;color:#1d4ed8}
  `]
})
export class ProduitDetailComponent implements OnInit {
  private svc = inject(ProduitsService);
  private route = inject(ActivatedRoute);
  p: any = null; editLoyer=false; newLoyer=0;

  ngOnInit() { this.svc.getById(this.route.snapshot.params['id']).subscribe(d=>{ this.p=d; this.newLoyer=d.loyerReference; }); }

  statutIcon(s:string) { return {Libre:'🔓',Loue:'🔑',EnTravaux:'🔧',Reserve:'📌',HorsService:'⛔'}[s]||'?'; }
  startEditLoyer() { this.editLoyer=true; }
  saveLoyer() {
    this.svc.updateLoyer(this.p.id, this.newLoyer).subscribe(()=>{ this.p.loyerReference=this.newLoyer; this.editLoyer=false; });
  }
}