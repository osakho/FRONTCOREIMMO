import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { RouterLink } from '@angular/router';

interface ProduitLocatif {
  id: string; code: string; typeLabel: string; loyerReference: number;
  statutLabel: string; locataireNom?: string;
}
interface ProprieteDetail {
  id: string; libelle: string; adresse: string; quartier?: string;
  nombreProduits: number; nombreLoues: number; nombreLibres: number;
  aContratGestion: boolean; collecteurNom?: string; collecteurId?: string;
  produits: ProduitLocatif[]; expandedProduits?: boolean;
}
interface ProprietaireDetail {
  id: string; nomComplet: string; telephone: string; email?: string;
  nombreProprietes: number; totalProduits: number; totalLoues: number;
  montantMensuel: number; proprietes: ProprieteDetail[]; expanded?: boolean;
}
interface Collecteur {
  id: string; nomComplet: string; nbProprietes: number;
}

@Component({
  selector: 'kdi-proprietaires-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, DecimalPipe, RouterLink],
  template: `
<div class="dashboard">

  <!-- ══ Header ══════════════════════════════════════════════ -->
  <div class="dash-header">
    <div class="dash-title-block">
      <h1 class="dash-title">Portefeuille propriétaires</h1>
      <p class="dash-sub">Vue consolidée — loyers, propriétés et produits locatifs</p>
    </div>
    <div class="dash-stats">
      <div class="kpi">
        <span class="kpi-val">{{ proprietaires().length }}</span>
        <span class="kpi-lbl">Propriétaires</span>
      </div>
      <div class="kpi">
        <span class="kpi-val">{{ totalProprietes() }}</span>
        <span class="kpi-lbl">Propriétés</span>
      </div>
      <div class="kpi kpi-gold">
        <span class="kpi-val">{{ totalMensuel() | number:'1.0-0' }}</span>
        <span class="kpi-lbl">MRU/mois</span>
      </div>
      <div class="kpi kpi-green">
        <span class="kpi-val">{{ totalLoues() }}</span>
        <span class="kpi-lbl">Loués</span>
      </div>
    </div>
  </div>

  <!-- ══ Barre outils ═════════════════════════════════════════ -->
  <div class="toolbar">
    <div class="search-wrap">
      <span class="search-icon">🔍</span>
      <input class="search-input" type="text" placeholder="Propriétaire ou résidence…"
             [(ngModel)]="recherche" (ngModelChange)="filtrer()">
      <button *ngIf="recherche" class="search-clear" (click)="recherche=''; filtrer()">✕</button>
    </div>
    <div class="toolbar-right">
      <select class="tb-select" [(ngModel)]="triPar" (ngModelChange)="filtrer()">
        <option value="nom">Trier par nom</option>
        <option value="montant">Trier par loyer</option>
        <option value="proprietes">Trier par nb propriétés</option>
        <option value="loues">Trier par taux occupation</option>
      </select>
      <button class="tb-btn" (click)="toutDeplier()" title="Tout déplier">⊞ Tout</button>
      <button class="tb-btn" (click)="toutReplier()" title="Tout replier">⊟ Tout</button>
    </div>
  </div>

  <!-- ══ Collecteurs sidebar résumé ══════════════════════════ -->
  <div class="collecteurs-bar" *ngIf="collecteurs().length">
    <span class="cb-label">Collecteurs :</span>
    <div class="cb-chips">
      <div *ngFor="let c of collecteurs()" class="cb-chip"
           [class.active]="filtreCollecteur === c.id"
           (click)="filtrerParCollecteur(c.id)">
        <span class="cb-avatar">{{ c.nomComplet.charAt(0) }}</span>
        {{ c.nomComplet }}
        <span class="cb-count">{{ c.nbProprietes }}</span>
      </div>
      <div class="cb-chip cb-chip-all" [class.active]="!filtreCollecteur"
           (click)="filtrerParCollecteur(null)">Tous</div>
    </div>
  </div>

  <!-- ══ Liste vide ═══════════════════════════════════════════ -->
  <div class="chargement" *ngIf="chargement()">
    <div class="spinner-lg"></div><span>Chargement…</span>
  </div>

  <div class="empty-state" *ngIf="!chargement() && !filtres().length">
    <span>🏘️</span><p>Aucun propriétaire trouvé</p>
  </div>

  <!-- ══ Grille propriétaires ═════════════════════════════════ -->
  <div class="prop-list" *ngIf="!chargement()">
    <div class="prop-card" *ngFor="let p of filtres(); trackBy: trackById">

      <!-- ── Ligne propriétaire ────────────────────────────── -->
      <div class="prop-row" (click)="toggleProp(p)">
        <div class="prop-avatar">{{ p.nomComplet.charAt(0) }}</div>
        <div class="prop-info">
          <div class="prop-nom">{{ p.nomComplet }}</div>
          <div class="prop-meta">
            📞 {{ p.telephone }}
            <span *ngIf="p.email"> · {{ p.email }}</span>
          </div>
        </div>
        <div class="prop-kpis">
          <div class="pk">
            <span class="pk-val">{{ p.nombreProprietes }}</span>
            <span class="pk-lbl">Propriétés</span>
          </div>
          <div class="pk">
            <span class="pk-val">{{ p.totalProduits }}</span>
            <span class="pk-lbl">Produits</span>
          </div>
          <div class="pk pk-green">
            <span class="pk-val">{{ p.totalLoues }}</span>
            <span class="pk-lbl">Loués</span>
          </div>
          <div class="pk pk-gold">
            <span class="pk-val">{{ p.montantMensuel | number:'1.0-0' }}</span>
            <span class="pk-lbl">MRU/mois</span>
          </div>
        </div>
        <div class="prop-actions" (click)="$event.stopPropagation()">
          <a [routerLink]="['/proprietaires', p.id]" class="pa-btn" title="Fiche">👁</a>
          <a [routerLink]="['/proprietaires', p.id, 'edit']" class="pa-btn" title="Modifier">✏️</a>
        </div>
        <span class="expand-arrow">{{ p.expanded ? '▲' : '▼' }}</span>
      </div>

      <!-- ── Propriétés du propriétaire ────────────────────── -->
      <div class="proprietes-section" *ngIf="p.expanded">
        <div class="propriete-item" *ngFor="let pr of p.proprietes; trackBy: trackById">

          <!-- Ligne propriété -->
          <div class="pr-row" (click)="togglePropriete(pr)">
            <div class="pr-icon">🏘️</div>
            <div class="pr-info">
              <div class="pr-nom">{{ pr.libelle }}</div>
              <div class="pr-adresse">📍 {{ pr.adresse }}<span *ngIf="pr.quartier">, {{ pr.quartier }}</span></div>
            </div>
            <div class="pr-stats">
              <span class="pr-stat">
                <span class="prs-val green">{{ pr.nombreLoues }}</span>/{{ pr.nombreProduits }} loués
              </span>
              <div class="taux-bar">
                <div class="taux-fill"
                     [style.width]="(pr.nombreProduits > 0 ? (pr.nombreLoues/pr.nombreProduits)*100 : 0) + '%'"
                     [class.taux-low]="pr.nombreLoues/pr.nombreProduits < 0.5">
                </div>
              </div>
            </div>
            <div class="pr-collecteur" (click)="$event.stopPropagation()">
              <div class="pc-label" *ngIf="pr.collecteurNom">
                👤 {{ pr.collecteurNom }}
              </div>
              <button class="pc-btn" *ngIf="!pr.collecteurNom"
                      (click)="ouvrirAffectation(pr, p)">
                ＋ Affecter collecteur
              </button>
              <button class="pc-change" *ngIf="pr.collecteurNom"
                      (click)="ouvrirAffectation(pr, p)">
                ✏️
              </button>
            </div>
            <div class="contrat-badge" [class.actif]="pr.aContratGestion" [class.inactif]="!pr.aContratGestion">
              {{ pr.aContratGestion ? '✓ Géré' : 'Sans contrat' }}
            </div>
            <span class="expand-arrow-sm">{{ pr.expandedProduits ? '▲' : '▼' }}</span>
          </div>

          <!-- Produits locatifs -->
          <div class="produits-section" *ngIf="pr.expandedProduits">
            <table class="produits-table">
              <thead><tr>
                <th>Code</th><th>Type</th><th>Loyer</th><th>Statut</th><th>Locataire</th>
              </tr></thead>
              <tbody>
                <tr *ngFor="let prod of pr.produits" [class.loue]="prod.statutLabel === 'Loue'">
                  <td><span class="code-chip">{{ prod.code }}</span></td>
                  <td class="text-muted">{{ prod.typeLabel }}</td>
                  <td class="loyer">{{ prod.loyerReference | number:'1.0-0' }} MRU</td>
                  <td>
                    <span class="statut-dot" [class.loue]="prod.statutLabel === 'Loue'"
                          [class.libre]="prod.statutLabel === 'Libre'">
                      {{ prod.statutLabel === 'Loue' ? '● Loué' : '○ Libre' }}
                    </span>
                  </td>
                  <td class="text-muted">{{ prod.locataireNom ?? '—' }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- ══ Modal affectation collecteur ════════════════════════ -->
  <div class="overlay" *ngIf="showAffectation" (click)="fermerAffectation()">
    <div class="modal" (click)="$event.stopPropagation()">
      <h3 class="modal-title">👤 Affecter un collecteur</h3>
      <p class="modal-sub" *ngIf="proprieteSelectionnee">
        {{ proprieteSelectionnee.libelle }}
        <span *ngIf="proprieteSelectionnee.collecteurNom">
          — actuellement : <strong>{{ proprieteSelectionnee.collecteurNom }}</strong>
        </span>
      </p>
      <div class="form-group">
        <label>Collecteur *</label>
        <select class="fc" [(ngModel)]="collecteurSelectionne">
          <option value="">-- Choisir un collecteur --</option>
          <option *ngFor="let c of tousCollecteurs()" [value]="c.id">
            {{ c.nomComplet }} ({{ c.nbProprietes }} propriété(s))
          </option>
        </select>
      </div>
      <div class="modal-actions">
        <button class="btn btn-ghost" (click)="fermerAffectation()">Annuler</button>
        <button class="btn btn-primary" (click)="confirmerAffectation()"
                [disabled]="!collecteurSelectionne || enCours()">
          {{ enCours() ? '⏳…' : '✅ Affecter' }}
        </button>
      </div>
    </div>
  </div>

</div>
  `,
  styles: [`
    /* ── Layout ──────────────────────────────────────────── */
    .dashboard { max-width: 1300px; margin: 0 auto; font-family: 'Segoe UI', system-ui, sans-serif; }

    /* ── Header ──────────────────────────────────────────── */
    .dash-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 28px; flex-wrap: wrap; gap: 16px; }
    .dash-title { font-size: 26px; font-weight: 800; color: #0c1a35; margin: 0 0 4px; }
    .dash-sub { font-size: 14px; color: #64748b; margin: 0; }
    .dash-stats { display: flex; gap: 12px; flex-wrap: wrap; }
    .kpi { background: #fff; border-radius: 12px; padding: 12px 20px; text-align: center; box-shadow: 0 1px 4px rgba(0,0,0,.08); border-top: 3px solid #e2e8f0; min-width: 90px; }
    .kpi-gold { border-top-color: #c8a96e; }
    .kpi-green { border-top-color: #10b981; }
    .kpi-val { display: block; font-size: 22px; font-weight: 800; color: #0c1a35; }
    .kpi-lbl { display: block; font-size: 11px; color: #94a3b8; margin-top: 2px; text-transform: uppercase; letter-spacing: .5px; }

    /* ── Toolbar ─────────────────────────────────────────── */
    .toolbar { display: flex; gap: 12px; align-items: center; margin-bottom: 14px; flex-wrap: wrap; }
    .search-wrap { flex: 1; min-width: 240px; display: flex; align-items: center; background: #fff; border: 1px solid #e2e8f0; border-radius: 10px; padding: 0 12px; box-shadow: 0 1px 3px rgba(0,0,0,.04); }
    .search-icon { font-size: 14px; color: #94a3b8; margin-right: 8px; }
    .search-input { border: none; outline: none; font-size: 14px; flex: 1; padding: 10px 0; background: transparent; color: #334155; }
    .search-clear { background: none; border: none; cursor: pointer; color: #94a3b8; font-size: 16px; padding: 4px; }
    .toolbar-right { display: flex; gap: 8px; align-items: center; }
    .tb-select { padding: 9px 12px; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 13px; background: #fff; color: #334155; cursor: pointer; }
    .tb-btn { padding: 8px 14px; border: 1px solid #e2e8f0; border-radius: 8px; background: #fff; font-size: 13px; cursor: pointer; color: #475569; }
    .tb-btn:hover { background: #f8fafc; }

    /* ── Collecteurs bar ─────────────────────────────────── */
    .collecteurs-bar { display: flex; align-items: center; gap: 10px; margin-bottom: 16px; flex-wrap: wrap; }
    .cb-label { font-size: 12px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: .5px; white-space: nowrap; }
    .cb-chips { display: flex; gap: 8px; flex-wrap: wrap; }
    .cb-chip { display: flex; align-items: center; gap: 6px; padding: 5px 12px; border-radius: 20px; background: #f1f5f9; color: #475569; font-size: 12px; cursor: pointer; border: 1px solid transparent; transition: all .15s; }
    .cb-chip:hover { border-color: #0c1a35; }
    .cb-chip.active { background: #0c1a35; color: #fff; }
    .cb-chip-all { background: #e0e7ef; }
    .cb-avatar { width: 18px; height: 18px; border-radius: 50%; background: #c8a96e; color: #fff; font-size: 10px; font-weight: 700; display: flex; align-items: center; justify-content: center; }
    .cb-count { background: rgba(255,255,255,.25); padding: 1px 6px; border-radius: 10px; font-size: 11px; font-weight: 700; }

    /* ── État chargement ─────────────────────────────────── */
    .chargement { display: flex; align-items: center; gap: 12px; justify-content: center; padding: 60px; color: #94a3b8; }
    .spinner-lg { width: 28px; height: 28px; border: 3px solid #e2e8f0; border-top-color: #0c1a35; border-radius: 50%; animation: spin .7s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .empty-state { display: flex; flex-direction: column; align-items: center; padding: 60px; color: #94a3b8; gap: 8px; font-size: 15px; }
    .empty-state span { font-size: 48px; }

    /* ── Propriétaires liste ─────────────────────────────── */
    .prop-list { display: flex; flex-direction: column; gap: 8px; }
    .prop-card { background: #fff; border-radius: 14px; overflow: hidden; box-shadow: 0 1px 4px rgba(0,0,0,.07); border: 1px solid #f1f5f9; transition: box-shadow .2s; }
    .prop-card:hover { box-shadow: 0 4px 16px rgba(0,0,0,.1); }

    /* Ligne propriétaire */
    .prop-row { display: flex; align-items: center; gap: 14px; padding: 16px 20px; cursor: pointer; }
    .prop-row:hover { background: #fafbfc; }
    .prop-avatar { width: 44px; height: 44px; border-radius: 50%; background: #0c1a35; color: #c8a96e; font-size: 18px; font-weight: 800; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .prop-info { flex: 1; min-width: 0; }
    .prop-nom { font-size: 15px; font-weight: 700; color: #0c1a35; }
    .prop-meta { font-size: 12px; color: #64748b; margin-top: 2px; }
    .prop-kpis { display: flex; gap: 20px; }
    .pk { display: flex; flex-direction: column; align-items: center; min-width: 52px; }
    .pk-val { font-size: 18px; font-weight: 800; color: #0c1a35; }
    .pk-lbl { font-size: 10px; color: #94a3b8; text-transform: uppercase; }
    .pk-green .pk-val { color: #059669; }
    .pk-gold .pk-val { color: #c8a96e; }
    .prop-actions { display: flex; gap: 6px; }
    .pa-btn { background: #f1f5f9; border: none; border-radius: 7px; cursor: pointer; font-size: 15px; padding: 6px 9px; text-decoration: none; }
    .pa-btn:hover { background: #e2e8f0; }
    .expand-arrow { color: #94a3b8; font-size: 11px; margin-left: 4px; }

    /* Propriétés section */
    .proprietes-section { border-top: 2px solid #f0f2f5; padding: 12px 16px; background: #fafbfc; display: flex; flex-direction: column; gap: 8px; }
    .propriete-item { background: #fff; border-radius: 10px; overflow: hidden; border: 1px solid #e2e8f0; }

    /* Ligne propriété */
    .pr-row { display: flex; align-items: center; gap: 12px; padding: 12px 16px; cursor: pointer; }
    .pr-row:hover { background: #f8fafc; }
    .pr-icon { font-size: 20px; flex-shrink: 0; }
    .pr-info { flex: 1; min-width: 0; }
    .pr-nom { font-size: 14px; font-weight: 600; color: #0c1a35; }
    .pr-adresse { font-size: 11px; color: #94a3b8; margin-top: 2px; }
    .pr-stats { display: flex; flex-direction: column; align-items: center; gap: 4px; min-width: 100px; }
    .pr-stat { font-size: 12px; color: #475569; white-space: nowrap; }
    .green { color: #059669; font-weight: 700; }
    .taux-bar { width: 80px; height: 4px; background: #e2e8f0; border-radius: 2px; overflow: hidden; }
    .taux-fill { height: 100%; background: #059669; border-radius: 2px; transition: width .3s; }
    .taux-fill.taux-low { background: #f59e0b; }
    .pr-collecteur { display: flex; align-items: center; gap: 6px; min-width: 140px; }
    .pc-label { font-size: 12px; color: #475569; background: #f0f9ff; padding: 4px 8px; border-radius: 6px; }
    .pc-btn { background: #dbeafe; color: #1d4ed8; border: none; cursor: pointer; font-size: 11px; font-weight: 600; padding: 5px 10px; border-radius: 6px; white-space: nowrap; }
    .pc-btn:hover { background: #bfdbfe; }
    .pc-change { background: none; border: none; cursor: pointer; font-size: 13px; padding: 2px 6px; color: #64748b; }
    .contrat-badge { padding: 3px 8px; border-radius: 10px; font-size: 11px; font-weight: 600; white-space: nowrap; }
    .contrat-badge.actif { background: #d1fae5; color: #065f46; }
    .contrat-badge.inactif { background: #fef3c7; color: #92400e; }
    .expand-arrow-sm { color: #94a3b8; font-size: 11px; }
    
    /* Produits table */
    .produits-section { border-top: 1px solid #f1f5f9; background: #fafbfc; padding: 8px 12px; }
    .produits-table { width: 100%; border-collapse: collapse; font-size: 12px; }
    .produits-table th { padding: 6px 10px; background: #f1f5f9; color: #64748b; text-align: left; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .4px; }
    .produits-table td { padding: 7px 10px; border-bottom: 1px solid #f8fafc; color: #334155; }
    .produits-table tr:last-child td { border-bottom: none; }
    .produits-table tr.loue td { background: rgba(5,150,105,.03); }
    .code-chip { font-family: monospace; background: #e0e7ef; padding: 2px 7px; border-radius: 5px; font-size: 11px; color: #0c1a35; font-weight: 700; }
    .loyer { font-weight: 700; color: #0c1a35; }
    .text-muted { color: #94a3b8; }
    .statut-dot { font-size: 11px; font-weight: 600; }
    .statut-dot.loue { color: #059669; }
    .statut-dot.libre { color: #94a3b8; }

    /* ── Modal ───────────────────────────────────────────── */
    .overlay { position: fixed; inset: 0; background: rgba(0,0,0,.4); z-index: 1000; display: flex; align-items: center; justify-content: center; }
    .modal { background: #fff; border-radius: 16px; padding: 28px; width: 440px; max-width: 92vw; box-shadow: 0 20px 60px rgba(0,0,0,.2); }
    .modal-title { font-size: 18px; font-weight: 700; color: #0c1a35; margin: 0 0 4px; }
    .modal-sub { font-size: 13px; color: #64748b; margin: 0 0 20px; }
    .form-group { display: flex; flex-direction: column; gap: 5px; margin-bottom: 16px; }
    label { font-size: 12px; font-weight: 500; color: #374151; }
    .fc { padding: 9px 12px; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 14px; font-family: inherit; }
    .modal-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px; }
    .btn { padding: 9px 18px; border-radius: 8px; font-size: 13px; font-weight: 500; cursor: pointer; border: none; }
    .btn-primary { background: #0c1a35; color: #fff; }
    .btn-ghost { background: #f1f5f9; color: #475569; }
    .btn:disabled { opacity: .4; cursor: not-allowed; }
  `]
})
export class ProprietairesDashboardComponent implements OnInit {
  private http = inject(HttpClient);

  proprietaires = signal<ProprietaireDetail[]>([]);
  filtres = signal<ProprietaireDetail[]>([]);
  collecteurs = signal<Collecteur[]>([]);
  tousCollecteurs = signal<Collecteur[]>([]);
  chargement = signal(true);
  enCours = signal(false);

  recherche = '';
  triPar = 'nom';
  filtreCollecteur: string | null = null;

  showAffectation = false;
  proprieteSelectionnee: ProprieteDetail | null = null;
  proprietaireParent: ProprietaireDetail | null = null;
  collecteurSelectionne = '';

  totalProprietes = computed(() => this.proprietaires().reduce((s, p) => s + p.nombreProprietes, 0));
  totalLoues = computed(() => this.proprietaires().reduce((s, p) => s + p.totalLoues, 0));
  totalMensuel = computed(() => this.proprietaires().reduce((s, p) => s + p.montantMensuel, 0));

  ngOnInit() {
    this.chargerDonnees();
    this.chargerCollecteurs();
  }

  chargerDonnees() {
    this.chargement.set(true);
    this.http.get<any>('/api/proprietaires/dashboard').subscribe({
      next: r => {
        const data = (r.data ?? r).map((p: any) => ({ ...p, expanded: false,
          proprietes: (p.proprietes ?? []).map((pr: any) => ({ ...pr, expandedProduits: false })) }));
        this.proprietaires.set(data);
        this.filtrer();
        this.chargement.set(false);
        this.extraireCollecteurs(data);
      },
      error: () => this.chargement.set(false)
    });
  }

  chargerCollecteurs() {
    this.http.get<any>('/api/personnel?type=Collecteur&pageSize=100').subscribe({
      next: r => {
        const items = r.data?.items ?? r.items ?? [];
        this.tousCollecteurs.set(items.map((c: any) => ({
          id: c.id, nomComplet: c.nomComplet, nbProprietes: c.nbProprietes ?? 0
        })));
      }
    });
  }

  extraireCollecteurs(data: ProprietaireDetail[]) {
    const map = new Map<string, Collecteur>();
    data.forEach(p => p.proprietes.forEach(pr => {
      if (pr.collecteurId && pr.collecteurNom && !map.has(pr.collecteurId))
        map.set(pr.collecteurId, { id: pr.collecteurId, nomComplet: pr.collecteurNom,
          nbProprietes: data.flatMap(x => x.proprietes).filter(x => x.collecteurId === pr.collecteurId).length });
    }));
    this.collecteurs.set(Array.from(map.values()));
  }

  filtrer() {
    let liste = [...this.proprietaires()];
    const q = this.recherche.toLowerCase().trim();

    if (q) {
      liste = liste.filter(p =>
        p.nomComplet.toLowerCase().includes(q) ||
        p.proprietes.some(pr => pr.libelle.toLowerCase().includes(q) || pr.adresse.toLowerCase().includes(q))
      );
      // Auto-déplier si recherche active
      liste.forEach(p => { if (q) p.expanded = true; });
    }

    if (this.filtreCollecteur) {
      liste = liste.filter(p => p.proprietes.some(pr => pr.collecteurId === this.filtreCollecteur));
    }

    liste.sort((a, b) => {
      switch (this.triPar) {
        case 'montant':    return b.montantMensuel - a.montantMensuel;
        case 'proprietes': return b.nombreProprietes - a.nombreProprietes;
        case 'loues':      return b.totalLoues - a.totalLoues;
        default:           return a.nomComplet.localeCompare(b.nomComplet);
      }
    });

    this.filtres.set(liste);
  }

  filtrerParCollecteur(id: string | null) {
    this.filtreCollecteur = this.filtreCollecteur === id ? null : id;
    this.filtrer();
  }

  toggleProp(p: ProprietaireDetail) { p.expanded = !p.expanded; }
  togglePropriete(pr: ProprieteDetail) { pr.expandedProduits = !pr.expandedProduits; }

  toutDeplier() {
    this.filtres().forEach(p => { p.expanded = true; p.proprietes.forEach(pr => pr.expandedProduits = true); });
    this.filtres.set([...this.filtres()]);
  }
  toutReplier() {
    this.filtres().forEach(p => { p.expanded = false; p.proprietes.forEach(pr => pr.expandedProduits = false); });
    this.filtres.set([...this.filtres()]);
  }

  ouvrirAffectation(pr: ProprieteDetail, p: ProprietaireDetail) {
    this.proprieteSelectionnee = pr;
    this.proprietaireParent = p;
    this.collecteurSelectionne = pr.collecteurId ?? '';
    this.showAffectation = true;
  }
  fermerAffectation() { this.showAffectation = false; }

  confirmerAffectation() {
    if (!this.proprieteSelectionnee || !this.collecteurSelectionne) return;
    this.enCours.set(true);
    this.http.post(`/api/proprietes/${this.proprieteSelectionnee.id}/affecter-collecteur`,
      { collecteurId: this.collecteurSelectionne }).subscribe({
      next: () => {
        this.enCours.set(false);
        this.fermerAffectation();
        this.chargerDonnees();
      },
      error: () => this.enCours.set(false)
    });
  }

  trackById = (_: number, item: any) => item.id;
}