import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router, ActivatedRoute } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, Validators, FormsModule } from '@angular/forms';
import { CollectesService, ContratsLocationService, AuthService } from '../../../core/services/api.services';
import { CollecteDto, ContratLocationListItemDto, StatutCollecte, StatutContrat } from '../../../core/models/models';
import { PagedList } from '../../../core/models/models';

interface ContratAvecCollecte {
  contrat:  ContratLocationListItemDto;
  collecte: CollecteDto | null;
  statut:   'validee' | 'soumise' | 'saisie' | 'rejetee' | 'a_saisir';
}

@Component({
  selector: 'kdi-collecte-saisie',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  template: `
    <div class="page-enter">

      <!-- ── PAGE HEADER ── -->
      <div class="page-header">
        <div>
          <div class="page-title">
            <span class="mi">payments</span>
            Mes collectes
          </div>
          <div class="page-subtitle">
            Collecteur : {{ nomCollecteur() }} · Période :
            <span style="color:var(--gold);font-weight:600">{{ periodeLabel() }}</span>
          </div>
        </div>
        <div class="header-actions">
          <!-- Sélecteur de période -->
          <div style="display:flex;align-items:center;gap:6px;background:var(--wh);border:1px solid var(--bord);border-radius:8px;padding:5px 12px">
            <span class="mi mi-sm" style="color:var(--t3)">calendar_month</span>
            <input type="month" style="border:none;background:none;outline:none;font-family:inherit;font-size:.8rem;color:var(--t1)"
                   [(ngModel)]="periodeMois" (change)="charger()">
          </div>
          <!-- Soumettre tout -->
          <button class="btn btn-primary"
                  [disabled]="nbASoumettre() === 0 || soumission()"
                  (click)="soumettreTout()">
            <span class="mi">send</span>
            {{ soumission() ? 'Envoi…' : 'Soumettre (' + nbASoumettre() + ') à compta' }}
          </button>
        </div>
      </div>

      <!-- ── KPI ── -->
      <div class="stat-row" style="grid-template-columns:repeat(4,1fr);margin-bottom:16px">
        <div class="stat-card">
          <div class="stat-icon amber"><span class="mi">pending_actions</span></div>
          <div>
            <div class="stat-value">{{ stats().aSaisir }}</div>
            <div class="stat-label">À saisir</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon blue"><span class="mi">edit_note</span></div>
          <div>
            <div class="stat-value">{{ stats().saisies }}</div>
            <div class="stat-label">Saisies</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon navy"><span class="mi">send</span></div>
          <div>
            <div class="stat-value">{{ stats().soumises }}</div>
            <div class="stat-label">Soumises compta</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon green"><span class="mi">verified</span></div>
          <div>
            <div class="stat-value">{{ stats().validees }}</div>
            <div class="stat-label">Validées</div>
          </div>
        </div>
      </div>

      <!-- ── BARRE PROGRESSION ── -->
      <div class="card" style="padding:14px 18px;margin-bottom:16px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
          <span style="font-size:.78rem;color:var(--t2);font-weight:500">Avancement du mois</span>
          <span style="font-size:.78rem;font-weight:700;color:var(--navy)">{{ avancement() }}%</span>
        </div>
        <div class="progress-bar" style="height:7px">
          <div class="progress-fill" [style.width]="avancement() + '%'"></div>
        </div>
      </div>

      <!-- ── ALERTES REJETÉES ── -->
      <div *ngIf="stats().rejetees > 0"
           class="alert-box danger" style="margin-bottom:16px">
        <div class="alert-title">
          <span class="mi">warning</span>
          {{ stats().rejetees }} collecte{{ stats().rejetees > 1 ? 's rejetées' : ' rejetée' }} — correction requise
        </div>
        <div *ngFor="let item of contratsAvecCollecte()" >
          <div *ngIf="item.statut === 'rejetee'" class="alert-item">
            <div class="avatar" style="width:32px;height:32px;font-size:.65rem;flex-shrink:0"
                 [style.background]="avatarColor(item.contrat.locataireNom)">
              {{ initiales(item.contrat.locataireNom) }}
            </div>
            <div style="flex:1">
              <div style="font-weight:600;font-size:.8rem">{{ item.contrat.locataireNom }}</div>
              <div class="cell-sub">{{ item.contrat.produitCode }} · Motif : {{ item.collecte?.motifRejet ?? '—' }}</div>
            </div>
            <button class="btn btn-danger btn-sm" (click)="ouvrirSaisie(item)">
              <span class="mi">edit</span> Corriger
            </button>
          </div>
        </div>
      </div>

      <!-- ── CONTRATS DU MOIS ── -->
      <div style="margin-bottom:12px">
        <div class="section-title">
          <span class="mi">receipt_long</span>
          Contrats à saisir ce mois ({{ contratsAvecCollecte().length }})
        </div>
      </div>

      <!-- Loading -->
      <div *ngIf="loading()" style="text-align:center;padding:48px;color:var(--t3)">
        <span class="mi" style="font-size:32px;display:block;margin-bottom:8px">hourglass_empty</span>
        Chargement…
      </div>

      <!-- Cards contrats -->
      <div *ngIf="!loading()" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:12px">
        <div *ngFor="let item of contratsAvecCollecte()"
             class="contrat-card"
             [class.cc-validee]="item.statut === 'validee'"
             [class.cc-soumise]="item.statut === 'soumise'"
             [class.cc-saisie]="item.statut === 'saisie'"
             [class.cc-rejetee]="item.statut === 'rejetee'"
             [class.cc-asaisir]="item.statut === 'a_saisir'">

          <!-- Dot statut -->
          <div class="cc-dot"
               [class.dot-green]="item.statut === 'validee'"
               [class.dot-blue]="item.statut === 'soumise'"
               [class.dot-amber]="item.statut === 'saisie'"
               [class.dot-red]="item.statut === 'rejetee'"
               [class.dot-gray]="item.statut === 'a_saisir'">
          </div>

          <!-- Avatar + nom -->
          <div class="cell-avatar" style="margin-bottom:10px">
            <div class="avatar" style="width:36px;height:36px;font-size:.7rem;flex-shrink:0"
                 [style.background]="avatarColor(item.contrat.locataireNom)">
              {{ initiales(item.contrat.locataireNom) }}
            </div>
            <div>
              <div class="cell-name" style="font-size:.82rem">{{ item.contrat.locataireNom }}</div>
              <div class="cell-sub" style="color:var(--gold);font-weight:600">{{ item.contrat.produitCode }}</div>
              <div class="cell-sub">{{ proprieteNom(item.contrat) }}</div>
            </div>
          </div>

          <!-- Montant -->
          <div style="font-size:1rem;font-weight:700;color:var(--t1);margin-bottom:10px">
            {{ (item.collecte?.montantEncaisse ?? item.contrat.loyer) | number:'1.0-0' }} MRU
          </div>

          <!-- Action -->
          <div style="margin-top:auto">
            <!-- Validée -->
            <span *ngIf="item.statut === 'validee'" class="badge badge-green" style="width:100%;justify-content:center">
              <span class="mi" style="font-size:11px">check_circle</span> Validée
            </span>
            <!-- Soumise -->
            <span *ngIf="item.statut === 'soumise'" class="badge badge-navy" style="width:100%;justify-content:center">
              <span class="mi" style="font-size:11px">send</span> Soumise
            </span>
            <!-- Saisie — modifier -->
            <button *ngIf="item.statut === 'saisie'" class="btn btn-secondary btn-sm" style="width:100%;justify-content:center"
                    (click)="ouvrirSaisie(item)">
              <span class="mi">edit</span> Modifier
            </button>
            <!-- À saisir -->
            <button *ngIf="item.statut === 'a_saisir'" class="btn btn-gold btn-sm" style="width:100%;justify-content:center"
                    (click)="ouvrirSaisie(item)">
              <span class="mi">add</span> Saisir
            </button>
            <!-- Rejetée -->
            <button *ngIf="item.statut === 'rejetee'" class="btn btn-danger btn-sm" style="width:100%;justify-content:center"
                    (click)="ouvrirSaisie(item)">
              <span class="mi">edit</span> Corriger
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- ══ MODAL SAISIE ══════════════════════════════════════════ -->
    <div class="modal-overlay" [class.open]="modalOuvert()">
      <div class="modal" style="width:520px">
        <div class="modal-header">
          <div class="modal-title">
            <span class="mi">payments</span>
            {{ itemEnCours()?.collecte ? 'Modifier la collecte' : 'Saisir la collecte' }}
          </div>
          <button class="modal-close" (click)="fermerModal()"><span class="mi">close</span></button>
        </div>

        <div class="modal-body" *ngIf="itemEnCours()">
          <!-- Contrat résumé -->
          <div style="background:var(--surf);border-radius:8px;padding:12px 14px;margin-bottom:16px;display:flex;align-items:center;gap:12px">
            <div class="avatar" style="flex-shrink:0" [style.background]="avatarColor(itemEnCours()!.contrat.locataireNom)">
              {{ initiales(itemEnCours()!.contrat.locataireNom) }}
            </div>
            <div>
              <div style="font-weight:600;font-size:.85rem">{{ itemEnCours()!.contrat.locataireNom }}</div>
              <div class="cell-sub">
                <span style="color:var(--gold);font-weight:600">{{ itemEnCours()!.contrat.produitCode }}</span>
                · Loyer attendu :
                <strong>{{ itemEnCours()!.contrat.loyer | number:'1.0-0' }} MRU</strong>
              </div>
            </div>
          </div>

          <!-- Formulaire -->
          <form [formGroup]="form">
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Période *</label>
                <input formControlName="periodeMois" type="month" class="form-control">
              </div>
              <div class="form-group">
                <label class="form-label">Montant encaissé (MRU) *</label>
                <input formControlName="montantEncaisse" type="number" class="form-control"
                       [placeholder]="itemEnCours()!.contrat.loyer.toString()">
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Mode de paiement *</label>
                <select formControlName="modePaiement" class="form-control">
                  <option value="Especes">Espèces</option>
                  <option value="Bankily">Bankily</option>
                  <option value="Masrvi">Masrvi</option>
                  <option value="Bimbank">Bimbank</option>
                  <option value="Click">Click</option>
                  <option value="VirementBancaire">Virement bancaire</option>
                  <option value="Cheque">Chèque</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">Référence / N° transaction</label>
                <input formControlName="reference" class="form-control" placeholder="TXN-…">
              </div>
            </div>
            <div class="form-group" style="margin-bottom:0">
              <label class="form-label">Commentaire</label>
              <textarea formControlName="commentaire" class="form-control" rows="2"
                        placeholder="Observations, retard justifié…" style="resize:vertical"></textarea>
            </div>
          </form>

          <!-- Récap écart -->
          <div *ngIf="ecart() !== null"
               style="display:flex;gap:20px;background:var(--surf);border-radius:8px;padding:12px 16px;margin-top:14px">
            <div>
              <div style="font-size:.67rem;color:var(--t3);text-transform:uppercase;letter-spacing:.05em">Attendu</div>
              <div style="font-size:1.1rem;font-weight:700;color:var(--t1)">
                {{ itemEnCours()!.contrat.loyer | number:'1.0-0' }} MRU
              </div>
            </div>
            <div>
              <div style="font-size:.67rem;color:var(--t3);text-transform:uppercase;letter-spacing:.05em">Encaissé</div>
              <div style="font-size:1.1rem;font-weight:700;color:var(--t1)">
                {{ form.get('montantEncaisse')?.value | number:'1.0-0' }} MRU
              </div>
            </div>
            <div>
              <div style="font-size:.67rem;color:var(--t3);text-transform:uppercase;letter-spacing:.05em">Écart</div>
              <div style="font-size:1.1rem;font-weight:700"
                   [style.color]="ecart()! < 0 ? 'var(--er)' : ecart()! > 0 ? 'var(--ok)' : 'var(--t3)'">
                {{ ecart()! > 0 ? '+' : '' }}{{ ecart() | number:'1.0-0' }} MRU
              </div>
            </div>
          </div>
        </div>

        <div class="modal-footer">
          <button class="btn btn-secondary" (click)="fermerModal()">Annuler</button>
          <button class="btn btn-primary" [disabled]="form.invalid || submitting()" (click)="enregistrer()">
            <span class="mi">save</span>
            {{ submitting() ? 'Enregistrement…' : 'Enregistrer' }}
          </button>
        </div>
      </div>
      <!-- ── Toast notification ── -->
  <div class="kdi-toast" [class.visible]="toastVisible()" [class.ok]="toastType()==='ok'" [class.err]="toastType()==='err'">
    {{ toastMsg() }}
  </div>

</div>
  `,
  styles: [`
    /* ── Contrat cards ── */
    .contrat-card {
      background: var(--wh);
      border: 1.5px solid var(--bord);
      border-radius: var(--r2);
      padding: 14px;
      display: flex;
      flex-direction: column;
      min-height: 160px;
      position: relative;
      transition: var(--tr);
      box-shadow: var(--s1);
    }
    .contrat-card:hover { box-shadow: var(--s2); transform: translateY(-2px); }

    .cc-validee { border-color: var(--ok);  border-left-width: 3px; }
    .cc-soumise { border-color: var(--in);  border-left-width: 3px; }
    .cc-saisie  { border-color: var(--wa);  border-left-width: 3px; }
    .cc-rejetee { border-color: var(--er);  border-left-width: 3px; }
    .cc-asaisir { border-color: var(--bord2); border-left-width: 3px; }

    /* Toast */
    .kdi-toast {
      position: fixed; bottom: 28px; right: 28px; z-index: 9999;
      padding: 14px 22px; border-radius: 12px; font-size: 14px; font-weight: 600;
      box-shadow: 0 8px 28px rgba(0,0,0,.18); max-width: 380px;
      transform: translateY(80px); opacity: 0;
      transition: transform .3s ease, opacity .3s ease;
      pointer-events: none;
    }
    .kdi-toast.visible  { transform: translateY(0); opacity: 1; }
    .kdi-toast.ok  { background: #d1fae5; color: #065f46; border: 1px solid #6ee7b7; }
    .kdi-toast.err { background: #fee2e2; color: #991b1b; border: 1px solid #fca5a5; }

    /* Dot indicateur */
    .cc-dot {
      position: absolute;
      top: 12px; right: 12px;
      width: 8px; height: 8px;
      border-radius: 50%;
    }
    .dot-green { background: var(--ok); }
    .dot-blue  { background: var(--in); }
    .dot-amber { background: var(--wa); }
    .dot-red   { background: var(--er); }
    .dot-gray  { background: var(--t4); }
  `]
})
export class CollecteSaisieComponent implements OnInit {
  private fb         = inject(FormBuilder);
  private svc        = inject(CollectesService);
  private contratSvc = inject(ContratsLocationService);
  private authSvc    = inject(AuthService);
  private router     = inject(Router);
  private route      = inject(ActivatedRoute);

  // ── State ──
  loading    = signal(true);
  soumission = signal(false);
  submitting  = signal(false);
  toastMsg    = signal('');
  toastType   = signal<'ok'|'err'>('ok');
  toastVisible = signal(false);

  private showToast(msg: string, type: 'ok'|'err') {
    this.toastMsg.set(msg);
    this.toastType.set(type);
    this.toastVisible.set(true);
    setTimeout(() => this.toastVisible.set(false), 4000);
  }

  periodeMois = new Date().toISOString().slice(0, 7);

  contrats  = signal<ContratLocationListItemDto[]>([]);
  collectes = signal<CollecteDto[]>([]);

  modalOuvert  = signal(false);
  itemEnCours  = signal<ContratAvecCollecte | null>(null);

  form = this.fb.group({
    periodeMois:     [this.periodeMois, Validators.required],
    montantEncaisse: [null as number | null, [Validators.required, Validators.min(0)]],
    modePaiement:    ['Especes', Validators.required],
    reference:       [''],
    commentaire:     ['']
  });

  // ── Computed ──
  nomCollecteur = computed(() => this.authSvc.getUser()?.nom ?? '—');

  periodeLabel = computed(() => {
    const [y, m] = this.periodeMois.split('-');
    return new Date(+y, +m - 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  });

  contratsAvecCollecte = computed((): ContratAvecCollecte[] => {
    return this.contrats().map(contrat => {
      const collecte = this.collectes().find(c => c.contratLocationId === contrat.id) ?? null;
      let statut: ContratAvecCollecte['statut'] = 'a_saisir';
      if (collecte) {
        const s = collecte.statutLabel;
        if (s === 'Valide' || s === 'Validee')                          statut = 'validee';
        else if (s === 'SoumisComptable' || s === 'Soumise')            statut = 'soumise';
        else if (s === 'Rejete' || s === 'Rejetee')                     statut = 'rejetee';
        else if (s === 'Saisie')                                         statut = 'saisie';
      }
      return { contrat, collecte, statut };
    });
  });

  stats = computed(() => {
    const items = this.contratsAvecCollecte();
    return {
      aSaisir:  items.filter(i => i.statut === 'a_saisir').length,
      saisies:  items.filter(i => i.statut === 'saisie').length,
      soumises: items.filter(i => i.statut === 'soumise').length,
      validees: items.filter(i => i.statut === 'validee').length,
      rejetees: items.filter(i => i.statut === 'rejetee').length,
    };
  });

  nbASoumettre = computed(() =>
    this.contratsAvecCollecte().filter(i => i.statut === 'saisie').length
  );

  avancement = computed(() => {
    const total = this.contratsAvecCollecte().length;
    if (total === 0) return 0;
    const faits = this.contratsAvecCollecte().filter(i =>
      i.statut === 'soumise' || i.statut === 'validee'
    ).length;
    return Math.round((faits / total) * 100);
  });

  ecart = computed(() => {
    const item = this.itemEnCours();
    const montant = this.form.get('montantEncaisse')?.value;
    if (!item || montant == null) return null;
    return montant - item.contrat.loyer;
  });

  // ── Lifecycle ──
  ngOnInit() {
    this.charger();

    // Écoute changement montant pour recalcul écart
    this.form.get('montantEncaisse')?.valueChanges.subscribe(() => {});

    // queryParam contratId → ouvrir directement le modal
    const contratId = this.route.snapshot.queryParamMap.get('contratId');
    if (contratId) {
      // On attend que les données soient chargées
      const waitAndOpen = () => {
        const item = this.contratsAvecCollecte().find(i => i.contrat.id === contratId);
        if (item) {
          this.ouvrirSaisie(item);
        }
      };
      // Retry après chargement
      setTimeout(waitAndOpen, 800);
    }
  }

  charger() {
    this.loading.set(true);
    const collecteurId = this.authSvc.getUser()?.id;

    // Charger les contrats actifs du collecteur
    this.contratSvc.getAll({ statut: StatutContrat.Actif }).subscribe({
      next: (res) => {
        this.contrats.set(res.items);

        // Charger les collectes du mois pour ce collecteur
        this.svc.getAll({
          periodeMois:  this.periodeMois,
          collecteurId: collecteurId,
          page: 1,
        }).subscribe({
          next: (cr) => {
            this.collectes.set(cr.items);
            this.loading.set(false);
          },
          error: () => this.loading.set(false)
        });
      },
      error: () => this.loading.set(false)
    });
  }

  // ── Modal saisie ──
  ouvrirSaisie(item: ContratAvecCollecte) {
    this.itemEnCours.set(item);
    this.form.patchValue({
      periodeMois:     item.collecte?.periodeMois ?? this.periodeMois,
      montantEncaisse: item.collecte?.montantEncaisse ?? item.contrat.loyer,
      modePaiement:    item.collecte?.modeLabel ?? 'Especes',
      reference:       item.collecte?.reference ?? '',
      commentaire:     item.collecte?.commentaire ?? '',
    });
    this.modalOuvert.set(true);
  }

  fermerModal() {
    this.modalOuvert.set(false);
    this.itemEnCours.set(null);
  }

  enregistrer() {
    const item = this.itemEnCours();
    if (this.form.invalid || !item) return;
    this.submitting.set(true);

    const payload = {
      contratLocationId: item.contrat.id,
      ...this.form.value
    };

    this.svc.saisir(payload).subscribe({
      next: () => {
        this.submitting.set(false);
        this.fermerModal();
        this.charger();
        this.showToast('✅ Collecte enregistrée avec succès', 'ok');
      },
      error: (err: any) => {
        this.submitting.set(false);
        const msg = err?.error?.message ?? err?.message ?? 'Une erreur est survenue';
        this.showToast('❌ ' + msg, 'err');
      }
    });
  }

  // ── Soumettre toutes les collectes saisies ──
  soumettreTout() {
    const aSoumettre = this.contratsAvecCollecte()
      .filter(i => i.statut === 'saisie' && i.collecte)
      .map(i => i.collecte!.id);

    if (aSoumettre.length === 0) return;
    this.soumission.set(true);
    let done = 0;

    aSoumettre.forEach(id =>
      this.svc.soumettre(id).subscribe({
        next: () => { if (++done === aSoumettre.length) { this.soumission.set(false); this.charger(); } },
        error: () => { if (++done === aSoumettre.length) { this.soumission.set(false); this.charger(); } }
      })
    );
  }

  // ── Helpers ──
  proprieteNom(c: ContratLocationListItemDto): string {
    // Le DTO contient locataireNom + produitCode; la propriété n'est pas dans ce DTO
    // On extrait le quartier depuis le code si dispo, sinon on laisse vide
    return '';
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