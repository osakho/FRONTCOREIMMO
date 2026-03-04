import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

interface LigneCollecte {
  produitCode: string; locataireNom: string; periodeMois: string; montant: number;
}
interface VersementPropriete {
  versementId: string; proprieteLibelle: string; proprieteAdresse: string;
  quartier?: string; ville?: string;
  periode: string; periodeLabel?: string;
  montantBrut: number; commission: number; retenueTravaux: number;
  montantNet: number; statut: string; dateEffective?: string;
  datePrevue?: string; joursRetard?: number;
  bordereau?: string;
  collectes: LigneCollecte[];
}
interface RecapProprietaire {
  proprietaireId: string; proprietaireNom: string; telephone: string; email?: string;
  periodicite: string; totalBrut: number; totalCommission: number; totalNet: number;
  nbVersementsEnAttente: number; proprietes: VersementPropriete[]; expanded?: boolean;
}

@Component({
  selector: 'kdi-versements',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page-enter">

      <!-- ── PAGE HEADER ── -->
      <div class="page-header">
        <div>
          <div class="page-title">
            <span class="mi">account_balance_wallet</span>
            Versements propriétaires
          </div>
        </div>
        <div class="header-actions">
          <button class="btn btn-gold" (click)="ouvrirPreparer()">
            <span class="mi">auto_fix_high</span>
            Générer {{ filtreMois }}
          </button>
        </div>
      </div>

      <!-- ── ALERTES EN RETARD ── -->
      <div *ngIf="versementsEnRetard().length > 0"
           class="alert-box danger" style="margin-bottom:16px">
        <div class="alert-title">
          <span class="mi">warning</span>
          {{ versementsEnRetard().length }} versement{{ versementsEnRetard().length > 1 ? 's' : '' }} en retard
        </div>
        <div *ngFor="let item of versementsEnRetard()" class="alert-item">
          <div class="avatar" style="width:34px;height:34px;font-size:.68rem;flex-shrink:0"
               [style.background]="avatarColor(item.recap.proprietaireNom)">
            {{ initiales(item.recap.proprietaireNom) }}
          </div>
          <div style="flex:1">
            <div style="font-weight:600;font-size:.82rem">
              {{ item.recap.proprietaireNom }} · {{ item.prop.proprieteLibelle }}
            </div>
            <div class="cell-sub" style="color:var(--er)">
              <span class="mi mi-xs">warning</span>
              Urgent · {{ item.prop.joursRetard }} jours de retard ·
              {{ item.prop.montantNet | number:'1.0-0' }} MRU
            </div>
          </div>
          <button class="btn btn-primary btn-sm" (click)="ouvrirEffectuer(item.prop, item.recap)">
            <span class="mi">credit_card</span> Effectuer
          </button>
        </div>
      </div>

      <!-- ── KPI ── -->
      <div class="kpi-grid" style="margin-bottom:16px">
        <div class="kpi-card kpi-gold">
          <div class="kpi-icon"><span class="mi">schedule</span></div>
          <div class="kpi-value">{{ stats().planifies }}</div>
          <div class="kpi-label">Planifiés</div>
          <div class="kpi-trend">
            <span class="mi">payments</span>
            {{ stats().montantPlanifie | number:'1.0-0' }} MRU
          </div>
        </div>
        <div class="kpi-card kpi-green">
          <div class="kpi-icon"><span class="mi">check_circle</span></div>
          <div class="kpi-value">{{ stats().effectues }}</div>
          <div class="kpi-label">Effectués</div>
          <div class="kpi-trend trend-up">
            <span class="mi">payments</span>
            {{ stats().montantEffectue | number:'1.0-0' }} MRU
          </div>
        </div>
        <div class="kpi-card kpi-red">
          <div class="kpi-icon"><span class="mi">warning</span></div>
          <div class="kpi-value">{{ stats().enRetard }}</div>
          <div class="kpi-label">En retard</div>
        </div>
        <div class="kpi-card kpi-navy">
          <div class="kpi-icon"><span class="mi">account_balance</span></div>
          <div class="kpi-value">{{ stats().totalNet | number:'1.0-0' }}</div>
          <div class="kpi-label">Total net (MRU)</div>
        </div>
      </div>

      <!-- ── FILTER BAR ── -->
      <div class="filter-bar">
        <button class="filter-chip" [class.active]="filtreStatut === ''"        (click)="setFiltre('')">Tous</button>
        <button class="filter-chip" [class.active]="filtreStatut === 'Planifie'" (click)="setFiltre('Planifie')">
          <span class="mi mi-sm" style="color:var(--in)">calendar_month</span> Planifiés
        </button>
        <button class="filter-chip" [class.active]="filtreStatut === 'Effectue'" (click)="setFiltre('Effectue')">
          <span class="mi mi-sm" style="color:var(--ok)">check</span> Effectués
        </button>
        <button class="filter-chip" [class.active]="filtreStatut === 'EnRetard'" (click)="setFiltre('EnRetard')">
          <span class="mi mi-sm" style="color:var(--er)">warning</span> En retard
        </button>

        <div class="filter-spacer"></div>

        <input type="month" class="form-control" style="width:160px;padding:5px 10px"
               [(ngModel)]="filtreMois" (change)="load()">

        <div class="search-inline">
          <span class="mi">search</span>
          <input placeholder="Propriétaire…" [(ngModel)]="recherche">
        </div>
      </div>

      <!-- ── LOADING ── -->
      <div *ngIf="chargement()" style="text-align:center;padding:48px;color:var(--t3)">
        <span class="mi" style="font-size:32px;display:block;margin-bottom:8px">hourglass_empty</span>
        Chargement…
      </div>

      <!-- ── LISTE VERSEMENTS ── -->
      <div *ngIf="!chargement()" class="table-card">
        <!-- Empty -->
        <div *ngIf="lignesFiltrees().length === 0" class="empty-state">
          <span class="mi">account_balance_wallet</span>
          <div class="empty-title">Aucun versement</div>
          <div class="empty-sub">Générez les versements du mois via le bouton "Générer"</div>
        </div>

        <!-- Table -->
        <table *ngIf="lignesFiltrees().length > 0" class="data-table">
          <thead>
            <tr>
              <th style="width:40px"></th>
              <th>PROPRIÉTAIRE</th>
              <th>PÉRIODE</th>
              <th>MONTANTS</th>
              <th>PRÉVU</th>
              <th>STATUT</th>
              <th style="text-align:right">ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            <ng-container *ngFor="let item of lignesFiltrees()">
              <!-- Ligne principale -->
              <tr [class.highlighted]="item.prop.statut === 'EnRetard'"
                  style="cursor:pointer"
                  (click)="toggleDetail(item)">
                <td>
                  <span class="mi" style="font-size:16px;color:var(--t3);transition:transform .2s"
                        [style.transform]="item.expanded ? 'rotate(90deg)' : ''">
                    chevron_right
                  </span>
                </td>

                <!-- Propriétaire + Propriété -->
                <td>
                  <div class="cell-avatar">
                    <div class="avatar" [style.background]="avatarColor(item.recap.proprietaireNom)">
                      {{ initiales(item.recap.proprietaireNom) }}
                    </div>
                    <div>
                      <div class="cell-name">{{ item.recap.proprietaireNom }}</div>
                      <div class="cell-sub">
                        {{ item.prop.proprieteLibelle }}
                        <span *ngIf="item.prop.quartier"> · {{ item.prop.quartier }}</span>
                      </div>
                    </div>
                  </div>
                </td>

                <!-- Période -->
                <td>
                  <span class="tag">{{ item.prop.periode }}</span>
                  <div class="cell-sub" *ngIf="item.prop.periodeLabel">{{ item.prop.periodeLabel }}</div>
                </td>

                <!-- Montants -->
                <td>
                  <div style="font-size:.71rem;color:var(--t3)">
                    Brut : {{ item.prop.montantBrut | number:'1.0-0' }} MRU
                    <span *ngIf="item.prop.retenueTravaux > 0" style="color:var(--wa)">
                      · Travaux : -{{ item.prop.retenueTravaux | number:'1.0-0' }} MRU
                    </span>
                  </div>
                  <div style="font-size:1.05rem;font-weight:800;color:var(--t1);font-family:'Syne',sans-serif">
                    Net : {{ item.prop.montantNet | number:'1.0-0' }}<span style="font-size:.7rem;font-weight:500"> MRU</span>
                  </div>
                </td>

                <!-- Date prévue -->
                <td>
                  <div style="font-size:.8rem;color:var(--t2)">Prévu :</div>
                  <div style="font-weight:600;font-size:.82rem"
                       [style.color]="item.prop.statut === 'EnRetard' ? 'var(--er)' : 'var(--t1)'">
                    {{ item.prop.datePrevue | date:'dd/MM/yyyy' }}
                  </div>
                  <div *ngIf="item.prop.statut === 'Effectue'" class="cell-sub" style="color:var(--ok)">
                    Effectué {{ item.prop.dateEffective | date:'dd/MM' }}
                  </div>
                  <div *ngIf="item.prop.statut === 'EnRetard' && item.prop.joursRetard" class="cell-sub" style="color:var(--er)">
                    {{ item.prop.joursRetard }} jours retard
                  </div>
                </td>

                <!-- Statut -->
                <td>
                  <span class="badge"
                    [class.badge-blue]="item.prop.statut === 'Planifie'"
                    [class.badge-green]="item.prop.statut === 'Effectue'"
                    [class.badge-amber]="item.prop.statut === 'EnRetard'">
                    <span class="mi" style="font-size:11px">
                      {{ item.prop.statut === 'Effectue' ? 'check_circle' : item.prop.statut === 'EnRetard' ? 'warning' : 'calendar_month' }}
                    </span>
                    {{ statutLabel(item.prop.statut) }}
                  </span>
                </td>

                <!-- Actions -->
                <td (click)="$event.stopPropagation()">
                  <div class="row-actions">
                    <!-- Bordereau si effectué -->
                    <button *ngIf="item.prop.statut === 'Effectue' && item.prop.bordereau"
                            class="action-btn view" title="Bordereau"
                            (click)="voirBordereau(item.prop)">
                      <span class="mi">receipt</span>
                    </button>
                    <span *ngIf="item.prop.statut === 'Effectue' && !item.prop.bordereau"
                          class="action-btn" style="cursor:default;color:var(--t3)" title="Bordereau">
                      <span class="mi">receipt</span>
                    </span>
                    <!-- Effectuer -->
                    <button *ngIf="item.prop.statut !== 'Effectue'"
                            class="btn btn-primary btn-sm"
                            (click)="ouvrirEffectuer(item.prop, item.recap)">
                      <span class="mi">credit_card</span> Effectuer
                    </button>
                    <span *ngIf="item.prop.statut === 'Effectue'"
                          class="badge badge-green" style="white-space:nowrap">
                      <span class="mi" style="font-size:11px">check_circle</span> Bordereau
                    </span>
                  </div>
                </td>
              </tr>

              <!-- Ligne de détail expandable -->
              <tr *ngIf="item.expanded">
                <td colspan="7" style="padding:0;background:var(--surf)">
                  <div style="padding:14px 20px 14px 72px">
                    <div style="font-size:.67rem;text-transform:uppercase;letter-spacing:.08em;color:var(--t3);margin-bottom:8px;font-weight:500">
                      Détail des collectes
                    </div>
                    <table class="data-table" style="background:var(--wh);border-radius:var(--r);overflow:hidden;box-shadow:var(--s1)">
                      <thead>
                        <tr>
                          <th>PRODUIT</th>
                          <th>LOCATAIRE</th>
                          <th>PÉRIODE</th>
                          <th style="text-align:right">MONTANT</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr *ngFor="let c of item.prop.collectes">
                          <td><span style="font-family:monospace;background:var(--surf2);padding:2px 7px;border-radius:5px;font-size:.72rem;font-weight:700">{{ c.produitCode }}</span></td>
                          <td style="font-size:.79rem">{{ c.locataireNom }}</td>
                          <td><span class="tag">{{ c.periodeMois }}</span></td>
                          <td style="text-align:right;font-weight:600">{{ c.montant | number:'1.0-0' }} MRU</td>
                        </tr>
                      </tbody>
                    </table>
                    <!-- Sous-total -->
                    <div style="display:flex;gap:20px;align-items:center;padding:10px 14px;background:var(--wh);border-radius:var(--r);margin-top:8px;box-shadow:var(--s0)">
                      <span style="font-size:.78rem;color:var(--t3)">Brut : <strong style="color:var(--t1)">{{ item.prop.montantBrut | number:'1.0-0' }}</strong></span>
                      <span style="font-size:.78rem;color:var(--er)">Commission : <strong>-{{ item.prop.commission | number:'1.0-0' }}</strong></span>
                      <span *ngIf="item.prop.retenueTravaux > 0" style="font-size:.78rem;color:var(--wa)">Travaux : <strong>-{{ item.prop.retenueTravaux | number:'1.0-0' }}</strong></span>
                      <span style="margin-left:auto;font-weight:700;color:var(--ok);font-size:.9rem">Net : {{ item.prop.montantNet | number:'1.0-0' }} MRU</span>
                    </div>
                  </div>
                </td>
              </tr>
            </ng-container>
          </tbody>
        </table>
      </div>
    </div>

    <!-- ══ MODAL EFFECTUER ══════════════════════════════════════ -->
    <div class="modal-overlay" [class.open]="showEffectuer">
      <div class="modal" style="width:500px">
        <div class="modal-header">
          <div class="modal-title">
            <span class="mi">credit_card</span>
            Effectuer le versement
          </div>
          <button class="modal-close" (click)="fermerEffectuer()"><span class="mi">close</span></button>
        </div>
        <div class="modal-body" *ngIf="proprieteSelectionnee">
          <!-- Résumé -->
          <div style="background:var(--surf);border-radius:8px;padding:12px 14px;margin-bottom:16px">
            <div style="font-weight:600;font-size:.85rem;margin-bottom:4px">
              {{ recapSelectionne?.proprietaireNom }} · {{ proprieteSelectionnee.proprieteLibelle }}
            </div>
            <div style="font-size:.78rem;color:var(--t2)">
              Montant net : <strong style="color:var(--ok);font-size:.95rem">{{ proprieteSelectionnee.montantNet | number:'1.0-0' }} MRU</strong>
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Date effective *</label>
              <input type="date" class="form-control" [(ngModel)]="formEff.dateEffective">
            </div>
            <div class="form-group">
              <label class="form-label">Mode *</label>
              <select class="form-control" [(ngModel)]="formEff.mode">
                <option value="">Choisir…</option>
                <option value="Especes">Espèces</option>
                <option value="Bankily">Bankily</option>
                <option value="Masrvi">Masrvi</option>
                <option value="Bimbank">Bimbank</option>
                <option value="Click">Click</option>
                <option value="VirementBancaire">Virement bancaire</option>
                <option value="Cheque">Chèque</option>
              </select>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Référence / N° transaction</label>
              <input type="text" class="form-control" [(ngModel)]="formEff.reference" placeholder="TXN-…">
            </div>
            <div class="form-group">
              <label class="form-label">Retenue travaux (MRU)</label>
              <input type="number" class="form-control" [(ngModel)]="formEff.retenueTravaux">
            </div>
          </div>
          <div class="form-group" style="margin-bottom:14px">
            <label class="form-label">Bordereau bancaire (PDF / image)</label>
            <input type="file" class="form-control" accept=".pdf,.jpg,.png" (change)="onBordereau($event)"
                   style="padding:5px">
          </div>

          <!-- Notifications -->
          <div style="background:var(--surf);border-radius:8px;padding:12px;margin-bottom:0">
            <div style="font-size:.72rem;font-weight:600;color:var(--t2);margin-bottom:8px;text-transform:uppercase;letter-spacing:.05em">
              Notifier le propriétaire
            </div>
            <div style="display:flex;gap:8px;flex-wrap:wrap">
              <label style="display:flex;align-items:center;gap:6px;background:var(--wh);padding:6px 12px;border-radius:7px;border:1px solid var(--bord);cursor:pointer;font-size:.78rem">
                <input type="checkbox" [(ngModel)]="formEff.email"> Email
              </label>
              <label style="display:flex;align-items:center;gap:6px;background:var(--wh);padding:6px 12px;border-radius:7px;border:1px solid var(--bord);cursor:pointer;font-size:.78rem">
                <input type="checkbox" [(ngModel)]="formEff.whatsapp"> WhatsApp
              </label>
              <label style="display:flex;align-items:center;gap:6px;background:var(--wh);padding:6px 12px;border-radius:7px;border:1px solid var(--bord);cursor:pointer;font-size:.78rem">
                <input type="checkbox" [(ngModel)]="formEff.sms"> SMS
              </label>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" (click)="fermerEffectuer()">Annuler</button>
          <button class="btn btn-primary"
                  [disabled]="!formEff.dateEffective || !formEff.mode || enCours()"
                  (click)="confirmerEffectuer()">
            <span class="mi">check_circle</span>
            {{ enCours() ? 'En cours…' : 'Confirmer' }}
          </button>
        </div>
      </div>
    </div>

    <!-- ══ MODAL GÉNÉRER ════════════════════════════════════════ -->
    <div class="modal-overlay" [class.open]="showPreparer">
      <div class="modal" style="width:420px">
        <div class="modal-header">
          <div class="modal-title"><span class="mi">auto_fix_high</span> Générer les versements</div>
          <button class="modal-close" (click)="fermerPreparer()"><span class="mi">close</span></button>
        </div>
        <div class="modal-body">
          <p style="font-size:.8rem;color:var(--t2);margin-bottom:16px">
            Génère les versements à partir des collectes validées non encore versées.
          </p>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Période *</label>
              <input type="month" class="form-control" [(ngModel)]="formPreparer.periode">
            </div>
            <div class="form-group">
              <label class="form-label">Date prévue *</label>
              <input type="date" class="form-control" [(ngModel)]="formPreparer.datePrevue">
            </div>
          </div>
          <div *ngIf="resultatPreparer" class="alert-box info" style="margin-top:12px;margin-bottom:0">
            <div class="alert-title"><span class="mi">info</span> Résultat</div>
            <p style="font-size:.8rem">
              <strong>{{ resultatPreparer.nbCreees }}</strong> versement(s) préparé(s)
              <span *ngIf="resultatPreparer.nbEchecs > 0" style="color:var(--er)">
                · {{ resultatPreparer.nbEchecs }} échec(s)
              </span>
            </p>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" (click)="fermerPreparer()">Fermer</button>
          <button class="btn btn-gold"
                  [disabled]="!formPreparer.periode || !formPreparer.datePrevue || enCours()"
                  (click)="confirmerPreparer()">
            <span class="mi">auto_fix_high</span>
            {{ enCours() ? 'Génération…' : 'Générer' }}
          </button>
        </div>
      </div>
    </div>
  `
})
export class VersementsComponent implements OnInit {
  private http = inject(HttpClient);
  private base = environment.apiUrl;

  recaps     = signal<RecapProprietaire[]>([]);
  chargement = signal(false);
  enCours    = signal(false);

  filtreMois   = new Date().toISOString().slice(0, 7);
  filtreStatut = '';
  recherche    = '';

  // Modal effectuer
  showEffectuer        = false;
  proprieteSelectionnee: VersementPropriete | null = null;
  recapSelectionne:     RecapProprietaire | null = null;
  bordereauFichier:     File | null = null;
  formEff = { dateEffective: new Date().toISOString().slice(0, 10), mode: '', reference: '', retenueTravaux: 0, email: true, whatsapp: true, sms: false };

  // Modal générer
  showPreparer    = false;
  resultatPreparer: any = null;
  formPreparer = {
    periode:   new Date().toISOString().slice(0, 7),
    datePrevue: new Date(new Date().getFullYear(), new Date().getMonth(), 25).toISOString().slice(0, 10)
  };

  // ── Computed ──

  /** Toutes les lignes à plat (une propriété = une ligne) */
  toutesLignes = computed(() => {
    const lignes: { recap: RecapProprietaire; prop: VersementPropriete; expanded: boolean }[] = [];
    this.recaps().forEach(r => {
      r.proprietes.forEach(p => lignes.push({ recap: r, prop: p, expanded: false }));
    });
    return lignes;
  });

  lignesFiltrees = computed(() => {
    let list = this.toutesLignes();
    if (this.filtreStatut) list = list.filter(l => l.prop.statut === this.filtreStatut);
    if (this.recherche.trim()) {
      const q = this.recherche.toLowerCase();
      list = list.filter(l =>
        l.recap.proprietaireNom.toLowerCase().includes(q) ||
        l.prop.proprieteLibelle.toLowerCase().includes(q)
      );
    }
    return list;
  });

  versementsEnRetard = computed(() =>
    this.toutesLignes().filter(l => l.prop.statut === 'EnRetard')
  );

  stats = computed(() => {
    const all = this.toutesLignes();
    return {
      planifies:      all.filter(l => l.prop.statut === 'Planifie').length,
      effectues:      all.filter(l => l.prop.statut === 'Effectue').length,
      enRetard:       all.filter(l => l.prop.statut === 'EnRetard').length,
      montantPlanifie: all.filter(l => l.prop.statut === 'Planifie').reduce((s, l) => s + l.prop.montantNet, 0),
      montantEffectue: all.filter(l => l.prop.statut === 'Effectue').reduce((s, l) => s + l.prop.montantNet, 0),
      totalNet:        all.reduce((s, l) => s + l.prop.montantNet, 0),
    };
  });

  // ── Lifecycle ──
  ngOnInit() { this.load(); }

  load() {
    this.chargement.set(true);
    const params: any = {};
    if (this.filtreMois) params.mois = this.filtreMois;

    this.http.get<any>(`${this.base}/versements/par-proprietaire`, { params }).subscribe({
      next: r => {
        const data = r.data ?? r;
        this.recaps.set(Array.isArray(data) ? data.map((x: any) => ({ ...x, expanded: false })) : []);
        this.chargement.set(false);
      },
      error: () => this.chargement.set(false)
    });
  }

  setFiltre(statut: string) {
    this.filtreStatut = statut;
  }

  toggleDetail(item: { expanded: boolean }) {
    item.expanded = !item.expanded;
  }

  // ── Modal effectuer ──
  ouvrirEffectuer(p: VersementPropriete, r: RecapProprietaire) {
    this.proprieteSelectionnee = p;
    this.recapSelectionne = r;
    this.formEff = { dateEffective: new Date().toISOString().slice(0, 10), mode: '', reference: '', retenueTravaux: 0, email: true, whatsapp: true, sms: false };
    this.bordereauFichier = null;
    this.showEffectuer = true;
  }

  fermerEffectuer() { this.showEffectuer = false; }

  onBordereau(e: Event) {
    this.bordereauFichier = (e.target as HTMLInputElement).files?.[0] ?? null;
  }

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

    this.http.post(`${this.base}/versements/${this.proprieteSelectionnee.versementId}/effectuer`, fd).subscribe({
      next: () => { this.enCours.set(false); this.fermerEffectuer(); this.load(); },
      error: (e) => { this.enCours.set(false); console.error(e); }
    });
  }

  voirBordereau(p: VersementPropriete) {
    if (p.bordereau) window.open(p.bordereau, '_blank');
  }

  // ── Modal générer ──
  ouvrirPreparer() { this.resultatPreparer = null; this.showPreparer = true; }
  fermerPreparer() { this.showPreparer = false; this.load(); }

  confirmerPreparer() {
    if (!this.formPreparer.periode || !this.formPreparer.datePrevue) return;
    this.enCours.set(true);
    this.http.post<any>(`${this.base}/versements/preparer-tous`, {
      periode:    this.formPreparer.periode,
      datePrevue: this.formPreparer.datePrevue
    }).subscribe({
      next: r => { this.enCours.set(false); this.resultatPreparer = r.data ?? r; },
      error: e => { this.enCours.set(false); this.resultatPreparer = { nbCreees: 0, nbEchecs: 1, details: [e?.error?.message ?? 'Erreur'] }; }
    });
  }

  // ── Helpers ──
  statutLabel(s: string) {
    return s === 'Effectue' ? 'Effectué' : s === 'EnRetard' ? 'En retard' : 'Planifié';
  }

  initiales(nom: string) {
    return nom.split(' ').slice(0, 2).map(n => n[0] ?? '').join('').toUpperCase();
  }

  avatarColor(nom: string) {
    const colors = ['#2057c8', '#0d9f5a', '#d07a0c', '#0e1c38', '#7b3fa8', '#c9263e'];
    let hash = 0;
    for (const ch of nom) hash = ch.charCodeAt(0) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
  }
}