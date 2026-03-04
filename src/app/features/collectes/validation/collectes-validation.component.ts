import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CollectesService } from '../../../core/services/api.services';
import { CollecteDto, StatutCollecte, PagedList } from '../../../core/models/models';

@Component({
  selector: 'app-collectes-validation',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="page-enter">

      <!-- ── PAGE HEADER ── -->
      <div class="page-header">
        <div>
          <div class="page-title">
            <span class="mi">fact_check</span>
            Validation collectes
          </div>
          <div class="page-subtitle">Comptabilité · {{ periodeLabel() }}</div>
        </div>
        <div class="header-actions">
          <button class="btn btn-primary" [disabled]="selection().length === 0" (click)="ouvrirModalValidation()">
            <span class="mi">check_circle</span>
            Valider sélection ({{ selection().length }})
          </button>
          <button class="btn btn-gold" routerLink="/collectes/saisir">
            <span class="mi">add</span>
            Saisie directe
          </button>
        </div>
      </div>

      <!-- ── KPI CARDS ── -->
      <div class="kpi-grid" style="margin-bottom:18px">
        <div class="kpi-card kpi-gold">
          <div class="kpi-icon"><span class="mi">pending</span></div>
          <div class="kpi-value">{{ stats().enAttente }}</div>
          <div class="kpi-label">En attente</div>
          <div class="kpi-trend trend-down">
            <span class="mi">payments</span>
            {{ stats().montantEnAttente | number:'1.0-0' }} MRU
          </div>
        </div>
        <div class="kpi-card kpi-green">
          <div class="kpi-icon"><span class="mi">verified</span></div>
          <div class="kpi-value">{{ stats().validees }}</div>
          <div class="kpi-label">Validées</div>
          <div class="kpi-trend trend-up">
            <span class="mi">payments</span>
            {{ stats().montantValide | number:'1.0-0' }} MRU
          </div>
        </div>
        <div class="kpi-card kpi-red">
          <div class="kpi-icon"><span class="mi">cancel</span></div>
          <div class="kpi-value">{{ stats().rejetees }}</div>
          <div class="kpi-label">Rejetées</div>
        </div>
        <div class="kpi-card kpi-navy">
          <div class="kpi-icon"><span class="mi">account_balance</span></div>
          <div class="kpi-value">{{ (stats().montantEnAttente + stats().montantValide) | number:'1.0-0' }}</div>
          <div class="kpi-label">Total (MRU)</div>
        </div>
      </div>

      <!-- ── FILTER BAR ── -->
      <div class="filter-bar">
        <button class="filter-chip" [class.active]="filtreStatut === null" (click)="setFiltre(null)">Toutes</button>
        <button class="filter-chip" [class.active]="filtreStatut === StatutCollecte.SoumisComptable"
                (click)="setFiltre(StatutCollecte.SoumisComptable)">
          Soumises ({{ stats().enAttente }})
        </button>
        <button class="filter-chip" [class.active]="filtreStatut === StatutCollecte.Valide"
                (click)="setFiltre(StatutCollecte.Valide)">Validées</button>
        <button class="filter-chip" [class.active]="filtreStatut === StatutCollecte.Rejete"
                (click)="setFiltre(StatutCollecte.Rejete)">Rejetées</button>
        <button class="filter-chip" [class.active]="filtreEcarts" (click)="toggleEcarts()">
          <span class="mi mi-sm" style="color:var(--wa)">warning</span>
          Écarts
        </button>

        <div class="filter-spacer"></div>

        <input type="month" class="form-control" style="width:160px;padding:5px 10px"
               [(ngModel)]="periodeMois" (change)="charger()">

        <div class="search-inline">
          <span class="mi">search</span>
          <input placeholder="Locataire, bien…" [(ngModel)]="recherche">
        </div>
      </div>

      <!-- ── TABLE ── -->
      <div class="table-card">
        <table class="data-table">
          <thead>
            <tr>
              <th style="width:40px">
                <input type="checkbox"
                       [checked]="allSelected()"
                       [indeterminate]="someSelected()"
                       (change)="toggleAll($event)">
              </th>
              <th>LOCATAIRE &amp; BIEN</th>
              <th>PÉRIODE</th>
              <th>MONTANTS</th>
              <th>MODE</th>
              <th>COLLECTEUR</th>
              <th>STATUT</th>
              <th style="text-align:right">ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngIf="loading()">
              <td colspan="8" style="text-align:center;padding:40px;color:var(--t3)">
                <span class="mi" style="font-size:28px;display:block;margin-bottom:8px">hourglass_empty</span>
                Chargement…
              </td>
            </tr>

            <tr *ngIf="!loading() && collectesFiltrees().length === 0">
              <td colspan="8">
                <div class="empty-state">
                  <span class="mi">fact_check</span>
                  <div class="empty-title">Aucune collecte</div>
                  <div class="empty-sub">Aucune collecte ne correspond aux filtres sélectionnés</div>
                </div>
              </td>
            </tr>

            <tr *ngFor="let c of collectesFiltrees()" [class.highlighted]="isSelected(c.id)">
              <td>
                <input type="checkbox"
                       *ngIf="estSoumis(c)"
                       [checked]="isSelected(c.id)"
                       (change)="toggleOne(c.id)">
              </td>

              <td>
                <div class="cell-avatar">
                  <div class="avatar" [style.background]="avatarColor(c.locataireNom)">{{ initiales(c.locataireNom) }}</div>
                  <div>
                    <div class="cell-name">{{ c.locataireNom }}</div>
                    <div class="cell-sub">{{ c.produitCode }}</div>
                  </div>
                </div>
              </td>

              <td><span class="tag">{{ c.periodeMois }}</span></td>

              <td>
                <div style="font-size:.72rem;color:var(--t3)">Attendu: {{ c.montantAttendu | number:'1.0-0' }}</div>
                <div style="font-weight:600" [style.color]="c.ecart !== 0 ? 'var(--wa)' : 'var(--ok)'">
                  Enc: {{ c.montantEncaisse | number:'1.0-0' }} MRU
                </div>
                <div *ngIf="c.ecart !== 0" style="font-size:.7rem;color:var(--er)">
                  Écart: {{ c.ecart | number:'1.0-0' }}
                </div>
              </td>

              <td>
                <span style="display:flex;align-items:center;gap:5px;font-size:.79rem">
                  <span class="mi mi-sm">{{ c.modeLabel === 'Especes' ? 'payments' : 'account_balance' }}</span>
                  {{ c.modeLabel }}
                </span>
                <div *ngIf="c.reference" class="cell-sub">{{ c.reference }}</div>
              </td>

              <td>
                <div class="cell-name" style="font-size:.79rem">{{ c.collecteurNom }}</div>
                <div class="cell-sub">{{ c.dateSaisie | date:'dd/MM HH:mm' }}</div>
              </td>

              <td>
                <span class="badge"
                  [class.badge-amber]="estSoumis(c)"
                  [class.badge-green]="estValide(c)"
                  [class.badge-red]="estRejete(c)"
                  [class.badge-gray]="c.statutLabel === 'Saisie'">
                  <span class="mi" style="font-size:11px">
                    {{ estValide(c) ? 'check_circle' : estRejete(c) ? 'cancel' : estSoumis(c) ? 'schedule' : 'edit' }}
                  </span>
                  {{ statutDisplay(c.statutLabel) }}
                </span>
              </td>

              <td>
                <div class="row-actions">
                  <button class="action-btn view" title="Détail"><span class="mi">description</span></button>
                  <button class="action-btn ok" title="Valider" *ngIf="estSoumis(c)" (click)="validerUne(c)">
                    <span class="mi">check_circle</span>
                  </button>
                  <button class="action-btn del" title="Rejeter" *ngIf="estSoumis(c)" (click)="ouvrirRejet(c)">
                    <span class="mi">cancel</span>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>

        <div class="pagination" *ngIf="total() > 0">
          <div class="pagination-info">
            {{ (page() - 1) * pageSize + 1 }}–{{ min(page() * pageSize, total()) }} sur {{ total() }} collectes
          </div>
          <div class="pagination-pages">
            <button class="page-btn" [disabled]="page() === 1" (click)="goPage(page() - 1)">
              <span class="mi">chevron_left</span>
            </button>
            <button *ngFor="let p of pages()" class="page-btn" [class.active]="p === page()" (click)="goPage(p)">{{ p }}</button>
            <button class="page-btn" [disabled]="page() === totalPages()" (click)="goPage(page() + 1)">
              <span class="mi">chevron_right</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- ── MODAL REJET ── -->
    <div class="modal-overlay" [class.open]="modalRejet()">
      <div class="modal" style="width:420px">
        <div class="modal-header">
          <div class="modal-title"><span class="mi">cancel</span> Rejeter la collecte</div>
          <button class="modal-close" (click)="modalRejet.set(false)"><span class="mi">close</span></button>
        </div>
        <div class="modal-body">
          <div *ngIf="collecteEnCours()" style="margin-bottom:14px">
            <div class="cell-avatar">
              <div class="avatar" [style.background]="avatarColor(collecteEnCours()!.locataireNom)">
                {{ initiales(collecteEnCours()!.locataireNom) }}
              </div>
              <div>
                <div class="cell-name">{{ collecteEnCours()!.locataireNom }}</div>
                <div class="cell-sub">{{ collecteEnCours()!.produitCode }} · {{ collecteEnCours()!.periodeMois }}</div>
              </div>
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Motif du rejet *</label>
            <textarea class="form-control" rows="3" [(ngModel)]="motifRejet"
                      placeholder="Expliquez la raison du rejet…" style="resize:vertical"></textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" (click)="modalRejet.set(false)">Annuler</button>
          <button class="btn btn-danger" [disabled]="!motifRejet.trim() || enTraitement()" (click)="confirmerRejet()">
            <span class="mi">cancel</span>
            {{ enTraitement() ? 'En cours…' : 'Confirmer le rejet' }}
          </button>
        </div>
      </div>
    </div>

    <!-- ── MODAL VALIDATION ── -->
    <div class="modal-overlay" [class.open]="modalValidation()">
      <div class="modal" style="width:420px">
        <div class="modal-header">
          <div class="modal-title"><span class="mi">check_circle</span> Valider {{ selection().length }} collecte(s)</div>
          <button class="modal-close" (click)="modalValidation.set(false)"><span class="mi">close</span></button>
        </div>
        <div class="modal-body">
          <div class="alert-box info" style="margin-bottom:14px">
            <div class="alert-title"><span class="mi">info</span> Confirmation requise</div>
            <p style="font-size:.8rem;color:var(--t2)">
              Vous allez valider <strong>{{ selection().length }} collecte(s)</strong>
              pour un montant total de <strong>{{ montantSelection() | number:'1.0-0' }} MRU</strong>.
              Cette action est irréversible.
            </p>
          </div>
          <div class="form-group">
            <label class="form-label">Commentaire (optionnel)</label>
            <textarea class="form-control" rows="2" [(ngModel)]="commentaireValidation"
                      placeholder="Note comptable…"></textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" (click)="modalValidation.set(false)">Annuler</button>
          <button class="btn btn-primary" [disabled]="enTraitement()" (click)="confirmerValidation()">
            <span class="mi">check_circle</span>
            {{ enTraitement() ? 'Validation…' : 'Valider' }}
          </button>
        </div>
      </div>
    </div>
  `
})
export class CollectesValidationComponent implements OnInit {
  private svc = inject(CollectesService);

  readonly StatutCollecte = StatutCollecte;

  loading    = signal(true);
  collectes  = signal<CollecteDto[]>([]);
  total      = signal(0);
  page       = signal(1);
  pageSize   = 30;

  filtreStatut: StatutCollecte | null = StatutCollecte.SoumisComptable;
  filtreEcarts = false;
  periodeMois  = new Date().toISOString().slice(0, 7);
  recherche    = '';

  selection  = signal<string[]>([]);

  modalRejet       = signal(false);
  modalValidation  = signal(false);
  collecteEnCours  = signal<CollecteDto | null>(null);
  motifRejet       = '';
  commentaireValidation = '';
  enTraitement     = signal(false);

  min = Math.min;

  collectesFiltrees = computed(() => {
    let list = this.collectes();
    if (this.filtreEcarts) list = list.filter(c => c.ecart !== 0);
    if (this.recherche.trim()) {
      const q = this.recherche.toLowerCase();
      list = list.filter(c =>
        c.locataireNom.toLowerCase().includes(q) ||
        c.produitCode.toLowerCase().includes(q)
      );
    }
    return list;
  });

  stats = computed(() => {
    const all = this.collectes();
    return {
      enAttente:        all.filter(c => this.estSoumis(c)).length,
      validees:         all.filter(c => this.estValide(c)).length,
      rejetees:         all.filter(c => this.estRejete(c)).length,
      montantEnAttente: all.filter(c => this.estSoumis(c)).reduce((s, c) => s + c.montantEncaisse, 0),
      montantValide:    all.filter(c => this.estValide(c)).reduce((s, c) => s + c.montantEncaisse, 0),
    };
  });

  periodeLabel = computed(() => {
    if (!this.periodeMois) return '';
    const [y, m] = this.periodeMois.split('-');
    return new Date(+y, +m - 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  });

  totalPages = computed(() => Math.max(1, Math.ceil(this.total() / this.pageSize)));
  pages      = computed(() => {
    const tp = this.totalPages(), p = this.page();
    const arr: number[] = [];
    for (let i = Math.max(1, p - 2); i <= Math.min(tp, p + 2); i++) arr.push(i);
    return arr;
  });

  allSelected  = computed(() => {
    const soumises = this.collectesFiltrees().filter(c => this.estSoumis(c));
    return soumises.length > 0 && soumises.every(c => this.selection().includes(c.id));
  });
  someSelected = computed(() => this.selection().length > 0 && !this.allSelected());

  montantSelection = computed(() =>
    this.collectes().filter(c => this.selection().includes(c.id))
      .reduce((s, c) => s + c.montantEncaisse, 0)
  );

  ngOnInit() { this.charger(); }

  charger() {
    this.loading.set(true);
    this.selection.set([]);
    this.svc.getAll({
      page:        this.page(),
      periodeMois: this.periodeMois,
      statut:      this.filtreStatut ?? undefined,
    }).subscribe({
      next: (res: PagedList<CollecteDto>) => {
        this.collectes.set(res.items);
        this.total.set(res.totalCount);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  setFiltre(statut: StatutCollecte | null) {
    this.filtreStatut = statut;
    this.page.set(1);
    this.charger();
  }

  toggleEcarts() { this.filtreEcarts = !this.filtreEcarts; }

  goPage(p: number) {
    if (p < 1 || p > this.totalPages()) return;
    this.page.set(p);
    this.charger();
  }

  isSelected(id: string) { return this.selection().includes(id); }

  toggleOne(id: string) {
    this.selection.update(sel =>
      sel.includes(id) ? sel.filter(s => s !== id) : [...sel, id]
    );
  }

  toggleAll(e: Event) {
    const checked = (e.target as HTMLInputElement).checked;
    this.selection.set(
      checked ? this.collectesFiltrees().filter(c => this.estSoumis(c)).map(c => c.id) : []
    );
  }

  estSoumis(c: CollecteDto) { return c.statutLabel === 'SoumisComptable' || c.statutLabel === 'Soumise'; }
  estValide(c: CollecteDto) { return c.statutLabel === 'Valide' || c.statutLabel === 'Validee'; }
  estRejete(c: CollecteDto) { return c.statutLabel === 'Rejete' || c.statutLabel === 'Rejetee'; }

  statutDisplay(label: string): string {
    const map: Record<string, string> = {
      SoumisComptable: 'Soumise', Soumise: 'Soumise',
      Valide: 'Validée', Validee: 'Validée',
      Rejete: 'Rejetée', Rejetee: 'Rejetée',
      Saisie: 'Saisie', Annule: 'Annulée',
    };
    return map[label] ?? label;
  }

  validerUne(c: CollecteDto) {
    this.selection.set([c.id]);
    this.modalValidation.set(true);
  }

  ouvrirModalValidation() {
    if (this.selection().length === 0) return;
    this.modalValidation.set(true);
  }

  confirmerValidation() {
    this.enTraitement.set(true);
    const ids = [...this.selection()];
    let done = 0;
    const onDone = () => {
      if (++done === ids.length) {
        this.enTraitement.set(false);
        this.modalValidation.set(false);
        this.commentaireValidation = '';
        this.charger();
      }
    };
    ids.forEach(id => this.svc.valider(id, this.commentaireValidation || undefined)
      .subscribe({ next: onDone, error: onDone }));
  }

  ouvrirRejet(c: CollecteDto) {
    this.collecteEnCours.set(c);
    this.motifRejet = '';
    this.modalRejet.set(true);
  }

  confirmerRejet() {
    const c = this.collecteEnCours();
    if (!c || !this.motifRejet.trim()) return;
    this.enTraitement.set(true);
    this.svc.rejeter(c.id, this.motifRejet).subscribe({
      next: () => { this.enTraitement.set(false); this.modalRejet.set(false); this.motifRejet = ''; this.charger(); },
      error: () => { this.enTraitement.set(false); this.modalRejet.set(false); }
    });
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