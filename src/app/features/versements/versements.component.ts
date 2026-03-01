import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

interface LigneCollecte { produitCode: string; locataireNom: string; periodeMois: string; montant: number; }
interface VersementPropriete {
  versementId: string; proprieteLibelle: string; proprieteAdresse: string;
  periode: string; montantBrut: number; commission: number; retenueTravaux: number;
  montantNet: number; statut: string; dateEffective?: string; collectes: LigneCollecte[];
}
interface RecapProprietaire {
  proprietaireId: string; proprietaireNom: string; telephone: string; email?: string;
  periodicite: string; totalBrut: number; totalCommission: number; totalNet: number;
  nbVersementsEnAttente: number; proprietes: VersementPropriete[]; expanded?: boolean;
}

@Component({
  selector: 'kdi-versements',
  standalone: true,
  imports: [CommonModule, FormsModule, DecimalPipe],
  template: `
    <div class="page">
      <div class="page-header">
        <div>
          <h2 class="page-title">💸 Versements propriétaires</h2>
          <p class="page-subtitle">Reversement des loyers — vue groupée par propriétaire</p>
        </div>
        <div class="header-actions">
          <button class="btn btn-green" (click)="ouvrirPreparer()">
            ⚙️ Préparer versements
          </button>
          <button class="btn btn-outline" (click)="ouvrirAlerteServiceFinancier()">
            📊 Alerter service financier
          </button>
          <button class="btn btn-warning" (click)="ouvrirAlerteRetards()">
            ⚠️ Alerter retards locataires
          </button>
        </div>
      </div>

      <!-- Filtres -->
      <div class="filters-bar">
        <select class="filter-select" [(ngModel)]="filtreMois" (ngModelChange)="load()">
          <option value="">Tous les mois</option>
          <option *ngFor="let m of moisDisponibles" [value]="m.value">{{ m.label }}</option>
        </select>
        <select class="filter-select" [(ngModel)]="filtreStatut" (ngModelChange)="load()">
          <option value="">Tous statuts</option>
          <option value="1">Planifié</option>
          <option value="3">Effectué</option>
          <option value="4">En retard</option>
        </select>
        <div class="stats-bar" *ngIf="recaps().length">
          <span class="stat-chip">{{ recaps().length }} propriétaire(s)</span>
          <span class="stat-chip green">{{ totalNet() | number:'1.0-0' }} MRU net à verser</span>
          <span class="stat-chip orange" *ngIf="nbEnAttente() > 0">{{ nbEnAttente() }} en attente</span>
        </div>
      </div>

      <!-- Liste propriétaires -->
      <div class="chargement" *ngIf="chargement()">Chargement…</div>

      <div class="recap-list" *ngIf="!chargement()">
        <div class="recap-card" *ngFor="let r of recaps()">

          <!-- ── Header propriétaire ── -->
          <div class="recap-header" (click)="r.expanded = !r.expanded">
            <div class="recap-info">
              <div class="recap-nom">{{ r.proprietaireNom }}</div>
              <div class="recap-meta">
                📞 {{ r.telephone }}
                <span *ngIf="r.email"> · 📧 {{ r.email }}</span>
                · Périodicité : <strong>{{ periodiciteLabel(r.periodicite) }}</strong>
              </div>
            </div>
            <div class="recap-totaux">
              <div class="total-item">
                <span class="total-label">Brut</span>
                <span class="total-val">{{ r.totalBrut | number:'1.0-0' }}</span>
              </div>
              <div class="total-item">
                <span class="total-label">Commission</span>
                <span class="total-val text-red">-{{ r.totalCommission | number:'1.0-0' }}</span>
              </div>
              <div class="total-item highlight">
                <span class="total-label">Net MRU</span>
                <span class="total-val">{{ r.totalNet | number:'1.0-0' }}</span>
              </div>
              <span class="badge-attente" *ngIf="r.nbVersementsEnAttente > 0">
                {{ r.nbVersementsEnAttente }} à verser
              </span>
            </div>
            <div class="recap-actions" (click)="$event.stopPropagation()">
              <button class="btn-icon-sm" title="Télécharger PDF" (click)="telechargerPdf(r)">📄</button>
              <button class="btn-icon-sm" title="Envoyer au propriétaire" (click)="ouvrirNotifProp(r)">📣</button>
            </div>
            <span class="expand-icon">{{ r.expanded ? '▲' : '▼' }}</span>
          </div>

          <!-- ── Détail par propriété ── -->
          <div class="recap-detail" *ngIf="r.expanded">
            <div class="propriete-block" *ngFor="let p of r.proprietes">
              <div class="propriete-header">
                <div>
                  <span class="propriete-nom">🏘 {{ p.proprieteLibelle }}</span>
                  <span class="propriete-adresse">{{ p.proprieteAdresse }}</span>
                </div>
                <div class="propriete-actions">
                  <span class="badge" [ngClass]="statutClass(p.statut)">{{ p.statut }}</span>
                  <button *ngIf="p.statut !== 'Effectue'"
                          class="btn-effectuer" (click)="ouvrirEffectuer(p, r)">
                    💳 Effectuer
                  </button>
                  <span *ngIf="p.statut === 'Effectue'" class="text-ok">
                    ✅ {{ p.dateEffective | date:'dd/MM/yyyy' }}
                  </span>
                </div>
              </div>

              <!-- Collectes détail -->
              <table class="collectes-table" *ngIf="p.collectes.length">
                <thead><tr>
                  <th>Produit</th><th>Locataire</th><th>Période</th>
                  <th class="text-right">Montant (MRU)</th>
                </tr></thead>
                <tbody>
                  <tr *ngFor="let c of p.collectes">
                    <td><span class="code">{{ c.produitCode }}</span></td>
                    <td>{{ c.locataireNom }}</td>
                    <td class="text-muted">{{ c.periodeMois }}</td>
                    <td class="text-right font-bold">{{ c.montant | number:'1.0-0' }}</td>
                  </tr>
                </tbody>
              </table>

              <!-- Sous-total propriété -->
              <div class="sous-total">
                <span>Brut : {{ p.montantBrut | number:'1.0-0' }}</span>
                <span class="text-red">Commission : -{{ p.commission | number:'1.0-0' }}</span>
                <span *ngIf="p.retenueTravaux > 0" class="text-orange">
                  Travaux : -{{ p.retenueTravaux | number:'1.0-0' }}
                </span>
                <span class="net-propriete">Net : {{ p.montantNet | number:'1.0-0' }} MRU</span>
              </div>
            </div>
          </div>
        </div>

        <div class="empty" *ngIf="!recaps().length">
          <span>💸</span><p>Aucun versement trouvé</p>
        </div>
      </div>

      <!-- ── Modal : Effectuer versement ── -->
      <div class="overlay" *ngIf="showEffectuer" (click)="fermerEffectuer()">
        <div class="modal" (click)="$event.stopPropagation()">
          <h3 class="modal-title">💳 Effectuer le versement</h3>
          <p class="modal-sub" *ngIf="proprieteSelectionnee">
            {{ proprieteSelectionnee.proprieteLibelle }} —
            <strong>{{ proprieteSelectionnee.montantNet | number:'1.0-0' }} MRU net</strong>
          </p>
          <div class="form-grid">
            <div class="fg"><label>Date effective *</label>
              <input type="date" class="fc" [(ngModel)]="formEff.dateEffective"></div>
            <div class="fg"><label>Mode *</label>
              <select class="fc" [(ngModel)]="formEff.mode">
                <option value="">Choisir…</option>
                <option *ngFor="let m of modes" [value]="m.v">{{ m.l }}</option>
              </select></div>
            <div class="fg"><label>Référence</label>
              <input type="text" class="fc" [(ngModel)]="formEff.reference" placeholder="N° transaction"></div>
            <div class="fg"><label>Retenue travaux (MRU)</label>
              <input type="number" class="fc" [(ngModel)]="formEff.retenueTravaux"></div>
          </div>
          <div class="fg"><label>📎 Bordereau bancaire</label>
            <input type="file" class="fc" accept=".pdf,.jpg,.png" (change)="onBordereau($event)"></div>
          <div class="notif-box">
            <div class="notif-title">📣 Notifier le propriétaire</div>
            <div class="notif-opts">
              <label class="notif-opt"><input type="checkbox" [(ngModel)]="formEff.email"> 📧 Email</label>
              <label class="notif-opt"><input type="checkbox" [(ngModel)]="formEff.whatsapp"> 💬 WhatsApp</label>
              <label class="notif-opt"><input type="checkbox" [(ngModel)]="formEff.sms"> 📱 SMS</label>
            </div>
          </div>
          <div class="modal-actions">
            <button class="btn btn-ghost" (click)="fermerEffectuer()">Annuler</button>
            <button class="btn btn-primary" (click)="confirmerEffectuer()"
                    [disabled]="!formEff.dateEffective || !formEff.mode || enCours()">
              {{ enCours() ? '⏳…' : '✅ Confirmer' }}
            </button>
          </div>
        </div>
      </div>

      <!-- ── Modal : Notifier propriétaire ── -->
      <div class="overlay" *ngIf="showNotifProp" (click)="fermerNotifProp()">
        <div class="modal" (click)="$event.stopPropagation()">
          <h3 class="modal-title">📣 Envoyer récap au propriétaire</h3>
          <p class="modal-sub" *ngIf="recapSelectionne">
            {{ recapSelectionne.proprietaireNom }} — Total net :
            <strong>{{ recapSelectionne.totalNet | number:'1.0-0' }} MRU</strong>
          </p>
          <div class="fg"><label>Mois (YYYY-MM)</label>
            <input type="month" class="fc" [(ngModel)]="formNotifProp.mois"></div>
          <div class="notif-box">
            <div class="notif-opts">
              <label class="notif-opt"><input type="checkbox" [(ngModel)]="formNotifProp.email"> 📧 Email + PDF joint</label>
              <label class="notif-opt"><input type="checkbox" [(ngModel)]="formNotifProp.whatsapp"> 💬 WhatsApp</label>
            </div>
          </div>
          <div class="modal-actions">
            <button class="btn btn-ghost" (click)="fermerNotifProp()">Annuler</button>
            <button class="btn btn-primary" (click)="confirmerNotifProp()" [disabled]="enCours()">
              {{ enCours() ? '⏳…' : '📣 Envoyer' }}
            </button>
          </div>
        </div>
      </div>

      <!-- ── Modal : Alertes retards ── -->
      <div class="overlay" *ngIf="showAlerteRetards" (click)="fermerAlerteRetards()">
        <div class="modal" (click)="$event.stopPropagation()">
          <h3 class="modal-title">⚠️ Alerter les locataires en retard</h3>
          <p class="modal-sub">Envoie un rappel à tous les locataires dont le loyer du mois courant n'est pas payé.</p>
          <div class="notif-box">
            <div class="notif-opts">
              <label class="notif-opt"><input type="checkbox" [(ngModel)]="formRetards.email"> 📧 Email</label>
              <label class="notif-opt"><input type="checkbox" [(ngModel)]="formRetards.whatsapp"> 💬 WhatsApp</label>
              <label class="notif-opt"><input type="checkbox" [(ngModel)]="formRetards.sms"> 📱 SMS</label>
            </div>
          </div>
          <div class="resultat" *ngIf="resultatRetards">
            <div class="res-ok">✅ {{ resultatRetards.nbLocatairesNotifies }} notifiés</div>
            <div class="res-err" *ngIf="resultatRetards.nbEchecs">❌ {{ resultatRetards.nbEchecs }} échecs</div>
            <div class="res-detail" *ngFor="let d of resultatRetards.details">{{ d }}</div>
          </div>
          <div class="modal-actions">
            <button class="btn btn-ghost" (click)="fermerAlerteRetards()">Fermer</button>
            <button class="btn btn-warning" (click)="envoyerAlerteRetards()" [disabled]="enCours()">
              {{ enCours() ? '⏳…' : '📣 Lancer' }}
            </button>
          </div>
        </div>
      </div>

      <!-- ── Modal : Préparer versements ── -->
      <div class="overlay" *ngIf="showPreparer" (click)="fermerPreparer()">
        <div class="modal" (click)="$event.stopPropagation()">
          <h3 class="modal-title">⚙️ Préparer les versements</h3>
          <p class="modal-sub">Génère les versements à partir des collectes validées non encore versées.</p>
          <div class="fg"><label>Période (YYYY-MM) *</label>
            <input type="month" class="fc" [(ngModel)]="formPreparer.periode"></div>
          <div class="fg"><label>Date prévue de versement *</label>
            <input type="date" class="fc" [(ngModel)]="formPreparer.datePrevue"></div>
          <div class="resultat" *ngIf="resultatPreparer">
            <div class="res-ok" *ngIf="resultatPreparer.nbCreees > 0">✅ {{ resultatPreparer.nbCreees }} versement(s) préparé(s)</div>
            <div class="res-err" *ngIf="resultatPreparer.nbEchecs > 0">⚠️ {{ resultatPreparer.nbEchecs }} échec(s)</div>
            <div class="res-detail" *ngFor="let d of resultatPreparer.details">{{ d }}</div>
          </div>
          <div class="modal-actions">
            <button class="btn btn-ghost" (click)="fermerPreparer()">Fermer</button>
            <button class="btn btn-primary" (click)="confirmerPreparer()" [disabled]="!formPreparer.periode || !formPreparer.datePrevue || enCours()">
              {{ enCours() ? '⏳…' : '⚙️ Préparer' }}
            </button>
          </div>
        </div>
      </div>

      <!-- ── Modal : Alerter service financier ── -->
      <div class="overlay" *ngIf="showAlerteFinancier" (click)="fermerAlerteFinancier()">
        <div class="modal" (click)="$event.stopPropagation()">
          <h3 class="modal-title">📊 Alerter le service financier</h3>
          <p class="modal-sub">Notifie les comptables et la direction des versements à effectuer ce mois.</p>
          <div class="notif-box">
            <div class="notif-opts">
              <label class="notif-opt"><input type="checkbox" [(ngModel)]="formFinancier.email"> 📧 Email</label>
              <label class="notif-opt"><input type="checkbox" [(ngModel)]="formFinancier.whatsapp"> 💬 WhatsApp</label>
            </div>
          </div>
          <div class="resultat" *ngIf="resultatFinancier">
            <div class="res-ok">✅ {{ resultatFinancier.nbProprietairesEnAttente }} propriétaires —
              {{ resultatFinancier.totalAVerser | number:'1.0-0' }} MRU</div>
            <div class="res-detail" *ngFor="let d of resultatFinancier.details">{{ d }}</div>
          </div>
          <div class="modal-actions">
            <button class="btn btn-ghost" (click)="fermerAlerteFinancier()">Fermer</button>
            <button class="btn btn-outline" (click)="envoyerAlerteFinancier()" [disabled]="enCours()">
              {{ enCours() ? '⏳…' : '📊 Envoyer alerte' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .page{max-width:1300px;margin:0 auto}
    .page-header{display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:20px}
    .page-title{font-size:24px;font-weight:700;color:#0c1a35;margin:0 0 4px}
    .page-subtitle{font-size:14px;color:#64748b;margin:0}
    .header-actions{display:flex;gap:10px;flex-wrap:wrap}
    .btn{padding:9px 16px;border-radius:8px;font-size:13px;font-weight:500;cursor:pointer;border:none;display:inline-flex;align-items:center;gap:6px}
    .btn-primary{background:#0c1a35;color:#fff}.btn-ghost{background:#f1f5f9;color:#475569}
    .btn-warning{background:#f59e0b;color:#fff}.btn-outline{background:#fff;color:#0c1a35;border:1px solid #0c1a35}
    .btn:disabled{opacity:.4;cursor:not-allowed}
    .btn-green{background:#059669;color:#fff}
    .filters-bar{display:flex;gap:10px;align-items:center;margin-bottom:16px;flex-wrap:wrap}
    .filter-select{padding:8px 12px;border:1px solid #e2e8f0;border-radius:8px;font-size:13px}
    .stats-bar{display:flex;gap:8px;margin-left:auto}
    .stat-chip{padding:4px 12px;border-radius:20px;font-size:12px;font-weight:600;background:#f1f5f9;color:#475569}
    .stat-chip.green{background:#d1fae5;color:#065f46}.stat-chip.orange{background:#fef3c7;color:#92400e}
    .chargement{padding:40px;text-align:center;color:#94a3b8}
    /* Recap cards */
    .recap-list{display:flex;flex-direction:column;gap:12px}
    .recap-card{background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,.08)}
    .recap-header{display:flex;align-items:center;gap:16px;padding:16px 20px;cursor:pointer;border-bottom:1px solid #f1f5f9}
    .recap-header:hover{background:#fafbfc}
    .recap-info{flex:1}
    .recap-nom{font-size:16px;font-weight:700;color:#0c1a35}
    .recap-meta{font-size:12px;color:#64748b;margin-top:2px}
    .recap-totaux{display:flex;align-items:center;gap:16px}
    .total-item{display:flex;flex-direction:column;align-items:flex-end}
    .total-label{font-size:10px;color:#94a3b8;text-transform:uppercase}
    .total-val{font-size:14px;font-weight:600;color:#0c1a35}
    .total-item.highlight{background:#0c1a35;padding:6px 12px;border-radius:8px}
    .total-item.highlight .total-label{color:#94a3b8}
    .total-item.highlight .total-val{color:#c8a96e;font-size:16px}
    .badge-attente{background:#fef3c7;color:#92400e;padding:3px 10px;border-radius:12px;font-size:11px;font-weight:600}
    .recap-actions{display:flex;gap:6px}
    .btn-icon-sm{background:#f1f5f9;border:none;cursor:pointer;padding:6px 10px;border-radius:6px;font-size:16px}
    .btn-icon-sm:hover{background:#e2e8f0}
    .expand-icon{color:#94a3b8;font-size:12px}
    .text-red{color:#ef4444}.text-orange{color:#f59e0b}
    /* Detail */
    .recap-detail{padding:16px 20px;border-top:2px solid #f0f2f5;background:#fafbfc}
    .propriete-block{margin-bottom:20px;background:#fff;border-radius:8px;overflow:hidden;border:1px solid #e2e8f0}
    .propriete-header{display:flex;justify-content:space-between;align-items:center;padding:10px 14px;background:#f8fafc;border-bottom:1px solid #e2e8f0}
    .propriete-nom{font-weight:600;color:#0c1a35;font-size:13px}
    .propriete-adresse{color:#94a3b8;font-size:11px;margin-left:8px}
    .propriete-actions{display:flex;align-items:center;gap:8px}
    .btn-effectuer{background:#dbeafe;color:#1d4ed8;border:none;cursor:pointer;padding:5px 10px;border-radius:6px;font-size:11px;font-weight:600}
    .btn-effectuer:hover{background:#bfdbfe}
    .text-ok{color:#059669;font-size:12px}
    .collectes-table{width:100%;border-collapse:collapse;font-size:12px}
    .collectes-table th{padding:6px 10px;background:#f1f5f9;color:#64748b;text-align:left;font-size:10px;font-weight:600;text-transform:uppercase}
    .collectes-table td{padding:6px 10px;border-bottom:1px solid #f8fafc;color:#334155}
    .collectes-table tr:last-child td{border-bottom:none}
    .code{font-family:monospace;background:#e0e7ef;padding:2px 6px;border-radius:4px;font-size:11px}
    .text-right{text-align:right}.text-muted{color:#94a3b8}.font-bold{font-weight:600}
    .sous-total{display:flex;gap:16px;align-items:center;padding:8px 14px;background:#f0f9ff;font-size:12px;color:#475569}
    .net-propriete{margin-left:auto;font-weight:700;color:#059669;font-size:13px}
    .badge{padding:3px 8px;border-radius:10px;font-size:11px;font-weight:500}
    .badge-Planifie{background:#dbeafe;color:#1d4ed8}
    .badge-Effectue{background:#d1fae5;color:#065f46}
    .badge-EnRetard{background:#fee2e2;color:#991b1b}
    .empty{display:flex;flex-direction:column;align-items:center;padding:60px;color:#94a3b8;font-size:14px;gap:8px}
    /* Modal */
    .overlay{position:fixed;inset:0;background:rgba(0,0,0,.4);z-index:1000;display:flex;align-items:center;justify-content:center}
    .modal{background:#fff;border-radius:16px;padding:28px;width:500px;max-width:92vw;max-height:90vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,.2)}
    .modal-title{font-size:18px;font-weight:700;color:#0c1a35;margin:0 0 4px}
    .modal-sub{font-size:13px;color:#64748b;margin:0 0 20px}
    .form-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px}
    .fg{display:flex;flex-direction:column;gap:5px;margin-bottom:12px}
    label{font-size:12px;font-weight:500;color:#374151}
    .fc{padding:8px 10px;border:1px solid #e2e8f0;border-radius:7px;font-size:13px;font-family:inherit}
    .notif-box{background:#f8fafc;border-radius:10px;padding:12px;margin:12px 0}
    .notif-title{font-size:12px;font-weight:600;color:#374151;margin-bottom:8px}
    .notif-opts{display:flex;gap:10px;flex-wrap:wrap}
    .notif-opt{display:flex;align-items:center;gap:6px;background:#fff;padding:7px 12px;border-radius:7px;border:1px solid #e2e8f0;cursor:pointer;font-size:12px}
    .modal-actions{display:flex;justify-content:flex-end;gap:10px;margin-top:20px}
    .resultat{background:#f0fdf4;border-radius:8px;padding:12px;margin-top:12px;max-height:160px;overflow-y:auto}
    .res-ok{color:#065f46;font-weight:600;font-size:13px}.res-err{color:#991b1b;font-weight:600;font-size:13px}
    .res-detail{font-size:11px;color:#374151;padding:2px 0;border-bottom:1px solid #dcfce7}
  `]
})
export class VersementsComponent implements OnInit {
  private http = inject(HttpClient);

  recaps = signal<RecapProprietaire[]>([]);
  chargement = signal(false);
  enCours = signal(false);

  filtreMois = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
  filtreStatut = '';

  showEffectuer = false;
  showNotifProp = false;
  showAlerteRetards = false;
  showAlerteFinancier = false;

  proprieteSelectionnee: VersementPropriete | null = null;
  recapSelectionne: RecapProprietaire | null = null;
  bordereauFichier: File | null = null;
  resultatRetards: any = null;
  resultatFinancier: any = null;
  showPreparer = false;
  resultatPreparer: any = null;
  formPreparer = {
    periode: `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`,
    datePrevue: new Date(new Date().getFullYear(), new Date().getMonth(), 25).toISOString().slice(0, 10)
  };

  formEff = { dateEffective: new Date().toISOString().slice(0, 10), mode: '', reference: '', retenueTravaux: 0, email: true, whatsapp: true, sms: false };
  formNotifProp = { mois: this.filtreMois, email: true, whatsapp: true };
  formRetards = { email: true, whatsapp: true, sms: false };
  formFinancier = { email: true, whatsapp: true };

  modes = [
    { v: '1', l: 'Espèces' }, { v: '2', l: 'Bankily' }, { v: '3', l: 'Masrvi' },
    { v: '4', l: 'Bimbank' }, { v: '5', l: 'Click' }, { v: '6', l: 'Virement bancaire' }, { v: '7', l: 'Chèque' }
  ];

  moisDisponibles = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(); d.setMonth(d.getMonth() - i);
    return { value: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`, label: d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }) };
  });

  totalNet = () => this.recaps().reduce((s, r) => s + r.totalNet, 0);
  nbEnAttente = () => this.recaps().reduce((s, r) => s + r.nbVersementsEnAttente, 0);

  ngOnInit() { this.load(); }

  load() {
    this.chargement.set(true);
    const params: any = {};
    if (this.filtreMois) params.mois = this.filtreMois;
    if (this.filtreStatut) params.statut = this.filtreStatut;

    this.http.get<any>('/api/versements/par-proprietaire', { params }).subscribe({
      next: r => { this.recaps.set((r.data ?? r).map((x: any) => ({ ...x, expanded: false }))); this.chargement.set(false); },
      error: () => this.chargement.set(false)
    });
  }

  ouvrirEffectuer(p: VersementPropriete, r: RecapProprietaire) {
    this.proprieteSelectionnee = p; this.recapSelectionne = r;
    this.formEff = { dateEffective: new Date().toISOString().slice(0, 10), mode: '', reference: '', retenueTravaux: 0, email: true, whatsapp: true, sms: false };
    this.bordereauFichier = null; this.showEffectuer = true;
  }
  fermerEffectuer() { this.showEffectuer = false; }
  onBordereau(e: Event) { this.bordereauFichier = (e.target as HTMLInputElement).files?.[0] ?? null; }

  confirmerEffectuer() {
    if (!this.proprieteSelectionnee || !this.formEff.dateEffective || !this.formEff.mode) return;
    this.enCours.set(true);
    const fd = new FormData();
    fd.append('DateEffective', this.formEff.dateEffective);
    fd.append('Mode', this.formEff.mode);
    if (this.formEff.reference) fd.append('Reference', this.formEff.reference);
    fd.append('RetenueTravaux', String(this.formEff.retenueTravaux));
    fd.append('NotifierEmail', String(this.formEff.email));
    fd.append('NotifierWhatsApp', String(this.formEff.whatsapp));
    fd.append('NotifierSms', String(this.formEff.sms));
    if (this.bordereauFichier) fd.append('BordereauBanque', this.bordereauFichier);
    this.http.post(`/api/versements/${this.proprieteSelectionnee.versementId}/effectuer`, fd).subscribe({
      next: () => { this.enCours.set(false); this.fermerEffectuer(); this.load(); },
      error: (e) => { this.enCours.set(false); alert(e?.error?.message ?? 'Erreur'); }
    });
  }

  ouvrirNotifProp(r: RecapProprietaire) { this.recapSelectionne = r; this.showNotifProp = true; }
  fermerNotifProp() { this.showNotifProp = false; }
  confirmerNotifProp() {
    if (!this.recapSelectionne) return;
    this.enCours.set(true);
    this.http.post(`/api/versements/par-proprietaire/${this.recapSelectionne.proprietaireId}/notifier`, {
      mois: this.formNotifProp.mois, notifierEmail: this.formNotifProp.email, notifierWhatsApp: this.formNotifProp.whatsapp
    }).subscribe({
      next: () => { this.enCours.set(false); this.fermerNotifProp(); alert('✅ Propriétaire notifié !'); },
      error: (e) => { this.enCours.set(false); alert(e?.error?.message ?? 'Erreur'); }
    });
  }

  telechargerPdf(r: RecapProprietaire) {
    const url = `/api/versements/par-proprietaire/${r.proprietaireId}/pdf?mois=${this.filtreMois}`;
    window.open(url, '_blank');
  }

  ouvrirAlerteRetards() { this.resultatRetards = null; this.showAlerteRetards = true; }
  fermerAlerteRetards() { this.showAlerteRetards = false; }
  envoyerAlerteRetards() {
    this.enCours.set(true);
    this.http.post<any>('/api/versements/alerter-retards', { notifierEmail: this.formRetards.email, notifierWhatsApp: this.formRetards.whatsapp, notifierSms: this.formRetards.sms }).subscribe({
      next: r => { this.enCours.set(false); this.resultatRetards = r.data ?? r; },
      error: (e) => { this.enCours.set(false); alert(e?.error?.message ?? 'Erreur'); }
    });
  }

  ouvrirAlerteServiceFinancier() { this.resultatFinancier = null; this.showAlerteFinancier = true; }
  fermerAlerteFinancier() { this.showAlerteFinancier = false; }
  envoyerAlerteFinancier() {
    this.enCours.set(true);
    this.http.post<any>('/api/versements/alerter-service-financier', { notifierEmail: this.formFinancier.email, notifierWhatsApp: this.formFinancier.whatsapp }).subscribe({
      next: r => { this.enCours.set(false); this.resultatFinancier = r.data ?? r; },
      error: (e) => { this.enCours.set(false); alert(e?.error?.message ?? 'Erreur'); }
    });
  }

  ouvrirPreparer() { this.resultatPreparer = null; this.showPreparer = true; }
  fermerPreparer() { this.showPreparer = false; this.load(); }
  confirmerPreparer() {
    if (!this.formPreparer.periode || !this.formPreparer.datePrevue) return;
    this.enCours.set(true);
    this.http.post<any>('/api/versements/preparer-tous', {
      periode: this.formPreparer.periode,
      datePrevue: this.formPreparer.datePrevue
    }).subscribe({
      next: r => { this.enCours.set(false); this.resultatPreparer = r.data ?? r; },
      error: e => { this.enCours.set(false); this.resultatPreparer = { nbCreees: 0, nbEchecs: 1, details: [e?.error?.message ?? 'Erreur'] }; }
    });
  }

  periodiciteLabel(p: string) {
    return p === '1' ? 'Mensuel' : p === '2' ? 'Bimensuel' : 'Trimestriel';
  }

  statutClass(s: string) {
    return { 'badge-Planifie': s === 'Planifie', 'badge-Effectue': s === 'Effectue', 'badge-EnRetard': s === 'EnRetard' };
  }
}