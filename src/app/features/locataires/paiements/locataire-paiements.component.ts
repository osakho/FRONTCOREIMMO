import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule, DecimalPipe, DatePipe }         from '@angular/common';
import { RouterLink, ActivatedRoute }                   from '@angular/router';
import {
  LocatairesService,
  ContratsLocationService,
  CollectesService
} from '../../../core/services/api.services';
import {
  LocataireDto,
  ContratLocationListItemDto,
  CollecteDto
} from '../../../core/models/models';

interface BailAvecCollectes {
  bail:      ContratLocationListItemDto;
  collectes: CollecteDto[];
  loading:   boolean;
  ouvert:    boolean;
}

@Component({
  selector: 'kdi-locataire-paiements',
  standalone: true,
  imports: [CommonModule, DecimalPipe, DatePipe, RouterLink],
  template: `

<!-- ══════════════════════════════════════════════
     CHARGEMENT
══════════════════════════════════════════════ -->
<div class="loading-full" *ngIf="chargement()">
  <div class="spinner"></div>
  <p>Chargement du dossier…</p>
</div>

<!-- ══════════════════════════════════════════════
     PAGE
══════════════════════════════════════════════ -->
<div class="page" *ngIf="!chargement() && locataire()">

  <!-- ── En-tête ── -->
  <div class="page-header">
    <div class="ph-left">
      <div class="avatar" [style.background]="avatarColor(locataire()!.nomComplet)">
        {{ initiales(locataire()!.nomComplet) }}
      </div>
      <div>
        <h2 class="page-title">{{ locataire()!.nomComplet }}</h2>
        <div class="page-meta">
          <span>📞 {{ locataire()!.telephone }}</span>
          <span *ngIf="locataire()!.email">✉ {{ locataire()!.email }}</span>
          <span class="badge-statut" [class.ok]="locataire()!.estActif" [class.off]="!locataire()!.estActif">
            {{ locataire()!.estActif ? 'Actif' : 'Inactif' }}
          </span>
        </div>
      </div>
    </div>
    <div class="ph-actions">
      <a [routerLink]="['/locataires', locataire()!.id]" class="btn-sec">👁 Voir le dossier</a>
      <a routerLink="/locataires" class="btn-ghost">← Retour</a>
    </div>
  </div>

  <!-- ── KPIs ── -->
  <div class="kpi-row">
    <div class="kpi-card">
      <div class="kpi-val">{{ bails().length }}</div>
      <div class="kpi-lbl">Baux total</div>
    </div>
    <div class="kpi-card green">
      <div class="kpi-val">{{ nbBailsActifs() }}</div>
      <div class="kpi-lbl">Baux actifs</div>
    </div>
    <div class="kpi-card gold">
      <div class="kpi-val">{{ totalEncaisse() | number:'1.0-0' }}</div>
      <div class="kpi-lbl">Total encaissé (MRU)</div>
    </div>
    <div class="kpi-card" [class.danger]="totalEcart() < 0">
      <div class="kpi-val">{{ totalEcart() | number:'1.0-0' }}</div>
      <div class="kpi-lbl">Écart cumulé (MRU)</div>
    </div>
    <div class="kpi-card" [class.ok]="statutGlobal() === 'À jour'" [class.danger]="statutGlobal() === 'En retard'">
      <div class="kpi-icon">{{ statutGlobal() === 'À jour' ? '✅' : statutGlobal() === 'En retard' ? '🔴' : '⚫' }}</div>
      <div class="kpi-lbl">{{ statutGlobal() }}</div>
    </div>
  </div>

  <!-- ── Message vide ── -->
  <div class="empty-bails" *ngIf="!bails().length">
    <div class="eb-icon">📋</div>
    <div class="eb-title">Aucun bail enregistré</div>
    <div class="eb-sub">Ce locataire n'a pas encore de contrat de location</div>
  </div>

  <!-- ══════════════════════════════════
       BAILS + HISTORIQUE PAIEMENTS
  ══════════════════════════════════ -->
  <div class="bail-section" *ngFor="let item of bails(); let i = index">

    <!-- En-tête du bail (cliquable pour déplier) -->
    <div class="bail-header" (click)="toggleBail(item)">
      <div class="bh-left">
        <div class="bail-num">{{ item.bail.numero }}</div>
        <div class="bail-info">
          <span class="bi-produit">🏠 {{ item.bail.produitCode }}</span>
          <span class="bi-loyer">{{ item.bail.loyer | number:'1.0-0' }} MRU/mois</span>
          <span class="bi-dates">
            {{ item.bail.dateEntree | date:'dd/MM/yyyy' }}
            <span *ngIf="item.bail.dateSortiePrevue"> → {{ item.bail.dateSortiePrevue | date:'dd/MM/yyyy' }}</span>
          </span>
        </div>
      </div>
      <div class="bh-right">
        <div class="bail-stats" *ngIf="item.collectes.length">
          <span class="bs-item ok">{{ nbPayes(item.collectes) }} payés</span>
          <span class="bs-item warn" *ngIf="nbPartiel(item.collectes)">{{ nbPartiel(item.collectes) }} partiels</span>
          <span class="bs-item danger" *ngIf="nbImpaye(item.collectes)">{{ nbImpaye(item.collectes) }} impayés</span>
        </div>
        <span class="badge-statut sm" [class.ok]="item.bail.statutLabel==='Actif'" [class.off]="item.bail.statutLabel!=='Actif'">
          {{ item.bail.statutLabel }}
        </span>
        <span class="chevron" [class.open]="item.ouvert">›</span>
      </div>
    </div>

    <!-- Corps : historique paiements -->
    <div class="bail-body" [class.open]="item.ouvert">

      <!-- Chargement collectes -->
      <div class="collectes-loading" *ngIf="item.loading">
        <div class="mini-spin"></div> Chargement des paiements…
      </div>

      <!-- Aucune collecte -->
      <div class="collectes-empty" *ngIf="!item.loading && !item.collectes.length">
        📭 Aucun paiement enregistré pour ce bail
      </div>

      <!-- Tableau collectes -->
      <div class="collectes-table" *ngIf="!item.loading && item.collectes.length">

        <!-- Résumé financier du bail -->
        <div class="bail-summary">
          <div class="bs-kpi">
            <span class="bs-lbl">Attendu</span>
            <span class="bs-val">{{ totalAttendu(item.collectes) | number:'1.0-0' }} MRU</span>
          </div>
          <div class="bs-kpi green">
            <span class="bs-lbl">Encaissé</span>
            <span class="bs-val">{{ totalEncaisseContrat(item.collectes) | number:'1.0-0' }} MRU</span>
          </div>
          <div class="bs-kpi" [class.red]="totalEcartContrat(item.collectes) < 0" [class.ok]="totalEcartContrat(item.collectes) >= 0">
            <span class="bs-lbl">Écart</span>
            <span class="bs-val">{{ totalEcartContrat(item.collectes) | number:'1.0-0' }} MRU</span>
          </div>
          <div class="bs-kpi">
            <span class="bs-lbl">Paiements</span>
            <span class="bs-val">{{ item.collectes.length }}</span>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Période</th>
              <th>Mode</th>
              <th>Référence</th>
              <th class="r">Attendu</th>
              <th class="r">Encaissé</th>
              <th class="r">Écart</th>
              <th class="c">Statut</th>
              <th class="c">Date saisie</th>
              <th>Collecteur</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let c of item.collectes" [class.tr-retard]="c.statutLabel==='Rejeté'" [class.tr-partiel]="c.ecart < 0 && c.statutLabel==='Validé'">
              <td>
                <div class="periode-badge">{{ formatPeriode(c.periodeMois) }}</div>
              </td>
              <td class="muted sm">{{ c.modeLabel }}</td>
              <td class="mono sm">{{ c.reference || '—' }}</td>
              <td class="r mono">{{ c.montantAttendu | number:'1.0-0' }}</td>
              <td class="r mono bold" [class.txt-ok]="c.montantEncaisse >= c.montantAttendu" [class.txt-warn]="c.montantEncaisse < c.montantAttendu && c.montantEncaisse > 0">
                {{ c.montantEncaisse | number:'1.0-0' }}
              </td>
              <td class="r mono" [class.txt-danger]="c.ecart < 0" [class.txt-ok]="c.ecart >= 0">
                {{ c.ecart >= 0 ? '+' : '' }}{{ c.ecart | number:'1.0-0' }}
              </td>
              <td class="c">
                <span class="statut-pill"
                      [class.pill-ok]="c.statutLabel==='Validé' && c.ecart >= 0"
                      [class.pill-warn]="c.statutLabel==='Validé' && c.ecart < 0"
                      [class.pill-danger]="c.statutLabel==='Rejeté'"
                      [class.pill-pending]="c.statutLabel==='EnAttente'||c.statutLabel==='Soumis'">
                  {{ c.statutLabel === 'Validé' && c.ecart < 0 ? 'Partiel' : c.statutLabel }}
                </span>
              </td>
              <td class="c muted sm">{{ c.dateSaisie | date:'dd/MM/yy' }}</td>
              <td class="muted sm">{{ c.collecteurNom }}</td>
            </tr>
          </tbody>
        </table>
      </div>

    </div><!-- /bail-body -->
  </div><!-- /bail-section -->

</div><!-- /page -->
  `,
  styles: [`
    :host {
      --gold:    #C9A84C; --gold-l:  #E8C96A; --gold-d:  #8B6914;
      --ink:     #0D0D0D; --ink-mid: #1A1A2E; --ink-soft:#2D2D4A;
      --cream:   #F8F4ED; --cream-dk:#EDE8DF; --muted:   #8A8899;
      --ok:      #1A7A4A; --ok-bg:   #E6F5EE;
      --warn:    #D4850A; --warn-bg: #FEF3E2;
      --danger:  #C0392B; --danger-bg:#FDECEA;
      --blue:    #1D4ED8; --blue-bg: #DBEAFE;
      --r: 12px;
    }

    /* ─ Page ─ */
    .page { max-width:1200px; margin:0 auto; }

    .loading-full { display:flex; flex-direction:column; align-items:center; justify-content:center; height:40vh; gap:16px; color:var(--muted); }
    .spinner { width:36px; height:36px; border:3px solid var(--cream-dk); border-top-color:var(--ink-mid); border-radius:50%; animation:spin .8s linear infinite; }
    @keyframes spin { to { transform:rotate(360deg); } }

    /* ─ En-tête ─ */
    .page-header { display:flex; justify-content:space-between; align-items:center; margin-bottom:24px; flex-wrap:wrap; gap:14px; }
    .ph-left     { display:flex; align-items:center; gap:14px; }
    .avatar      { width:52px; height:52px; border-radius:13px; display:flex; align-items:center; justify-content:center; font-size:18px; font-weight:800; color:#fff; flex-shrink:0; font-family:'Playfair Display',Georgia,serif; }
    .page-title  { font-size:22px; font-weight:800; color:var(--ink-mid); margin:0 0 5px; font-family:'Playfair Display',Georgia,serif; }
    .page-meta   { display:flex; align-items:center; gap:12px; font-size:13px; color:var(--muted); flex-wrap:wrap; }
    .ph-actions  { display:flex; gap:9px; }

    .btn-sec  { padding:9px 18px; background:#fff; color:var(--ink-soft); border:1.5px solid var(--cream-dk); border-radius:9px; font-size:13px; font-weight:600; cursor:pointer; text-decoration:none; display:inline-flex; align-items:center; gap:6px; transition:all .15s; }
    .btn-sec:hover { border-color:var(--ink-mid); }
    .btn-ghost { padding:9px 14px; background:transparent; color:var(--muted); border:none; border-radius:9px; font-size:13px; font-weight:600; cursor:pointer; text-decoration:none; transition:color .15s; }
    .btn-ghost:hover { color:var(--ink); }

    .badge-statut { display:inline-flex; padding:3px 10px; border-radius:20px; font-size:11.5px; font-weight:700; }
    .badge-statut.ok  { background:var(--ok-bg); color:var(--ok); }
    .badge-statut.off { background:var(--cream-dk); color:var(--muted); }
    .badge-statut.sm  { font-size:10.5px; padding:2px 8px; }

    /* ─ KPIs ─ */
    .kpi-row { display:grid; grid-template-columns:repeat(5,1fr); gap:12px; margin-bottom:28px; }
    .kpi-card { background:#fff; border-radius:var(--r); padding:16px 18px; box-shadow:0 2px 10px rgba(0,0,0,.06); border-top:3px solid var(--cream-dk); text-align:center; transition:all .18s; }
    .kpi-card.green  { border-top-color:#10B981; }
    .kpi-card.gold   { border-top-color:var(--gold); }
    .kpi-card.ok     { border-top-color:var(--ok); background:var(--ok-bg); }
    .kpi-card.danger { border-top-color:var(--danger); background:var(--danger-bg); }
    .kpi-val  { font-size:26px; font-weight:800; color:var(--ink-mid); margin-bottom:4px; font-family:'Playfair Display',Georgia,serif; }
    .kpi-icon { font-size:24px; margin-bottom:4px; }
    .kpi-lbl  { font-size:11.5px; font-weight:600; color:var(--muted); text-transform:uppercase; letter-spacing:.5px; }

    /* ─ Vide ─ */
    .empty-bails { text-align:center; padding:60px; background:#fff; border-radius:var(--r); box-shadow:0 2px 10px rgba(0,0,0,.06); }
    .eb-icon  { font-size:48px; margin-bottom:12px; }
    .eb-title { font-size:17px; font-weight:700; color:var(--ink-mid); margin-bottom:6px; }
    .eb-sub   { font-size:13px; color:var(--muted); }

    /* ─ Section bail ─ */
    .bail-section { background:#fff; border-radius:var(--r); box-shadow:0 2px 10px rgba(0,0,0,.06); margin-bottom:14px; overflow:hidden; border:1.5px solid var(--cream-dk); transition:border-color .18s; }
    .bail-section:hover { border-color:rgba(201,168,76,.3); }

    .bail-header { display:flex; align-items:center; justify-content:space-between; padding:16px 20px; cursor:pointer; gap:14px; user-select:none; transition:background .14s; }
    .bail-header:hover { background:rgba(201,168,76,.03); }
    .bh-left  { display:flex; align-items:center; gap:14px; flex:1; flex-wrap:wrap; }
    .bh-right { display:flex; align-items:center; gap:10px; flex-shrink:0; }

    .bail-num { font-size:13.5px; font-weight:800; color:var(--ink-mid); background:var(--cream); padding:4px 12px; border-radius:7px; font-family:monospace; white-space:nowrap; }
    .bail-info { display:flex; align-items:center; gap:12px; flex-wrap:wrap; font-size:13px; }
    .bi-produit { font-weight:600; color:var(--ink-soft); }
    .bi-loyer   { color:var(--gold-d); font-weight:700; }
    .bi-dates   { color:var(--muted); font-size:12px; }

    .bail-stats { display:flex; gap:6px; }
    .bs-item    { padding:2px 8px; border-radius:10px; font-size:11px; font-weight:700; }
    .bs-item.ok     { background:var(--ok-bg); color:var(--ok); }
    .bs-item.warn   { background:var(--warn-bg); color:var(--warn); }
    .bs-item.danger { background:var(--danger-bg); color:var(--danger); }

    .chevron { font-size:18px; color:var(--muted); transition:transform .22s; display:inline-block; }
    .chevron.open { transform:rotate(90deg); }

    /* Corps bail */
    .bail-body { max-height:0; overflow:hidden; transition:max-height .3s ease; }
    .bail-body.open { max-height:2000px; }

    .collectes-loading { display:flex; align-items:center; gap:10px; padding:20px; color:var(--muted); font-size:13px; border-top:1px solid var(--cream-dk); }
    .mini-spin { width:16px; height:16px; border:2px solid var(--cream-dk); border-top-color:var(--ink-mid); border-radius:50%; animation:spin .7s linear infinite; flex-shrink:0; }
    .collectes-empty { padding:24px 20px; color:var(--muted); font-size:13px; border-top:1px solid var(--cream-dk); text-align:center; }

    .collectes-table { border-top:1px solid var(--cream-dk); }

    /* Résumé financier */
    .bail-summary { display:flex; gap:0; background:var(--cream); border-bottom:1px solid var(--cream-dk); }
    .bs-kpi { flex:1; padding:12px 16px; text-align:center; border-right:1px solid var(--cream-dk); }
    .bs-kpi:last-child { border-right:none; }
    .bs-kpi.green { background:var(--ok-bg); }
    .bs-kpi.red   { background:var(--danger-bg); }
    .bs-kpi.ok    { background:var(--ok-bg); }
    .bs-lbl { font-size:10.5px; font-weight:700; text-transform:uppercase; letter-spacing:.5px; color:var(--muted); display:block; margin-bottom:3px; }
    .bs-val { font-size:15px; font-weight:800; color:var(--ink-mid); font-family:'Playfair Display',Georgia,serif; }

    /* Tableau collectes */
    table { width:100%; border-collapse:collapse; }
    thead th { padding:9px 14px; background:#f8f9fc; font-size:10.5px; font-weight:700; letter-spacing:.6px; text-transform:uppercase; color:var(--muted); border-bottom:1px solid var(--cream-dk); text-align:left; }
    th.r { text-align:right; } th.c { text-align:center; }
    tbody td { padding:11px 14px; font-size:13px; color:var(--ink-soft); border-bottom:1px solid var(--cream-dk); vertical-align:middle; }
    tbody tr:last-child td { border-bottom:none; }
    tbody tr.tr-retard td { background:rgba(192,57,43,.03); }
    tbody tr.tr-partiel td { background:rgba(212,133,10,.02); }
    tbody tr:hover td { background:rgba(201,168,76,.03); }
    td.r    { text-align:right; } td.c { text-align:center; }
    td.muted{ color:var(--muted); } td.sm { font-size:12px; } td.mono { font-family:monospace; } td.bold { font-weight:700; }
    .txt-ok     { color:var(--ok); font-weight:700; }
    .txt-warn   { color:var(--warn); font-weight:700; }
    .txt-danger { color:var(--danger); font-weight:700; }

    .periode-badge { display:inline-flex; padding:3px 9px; border-radius:6px; background:var(--blue-bg); color:var(--blue); font-size:11.5px; font-weight:700; font-family:monospace; white-space:nowrap; }

    .statut-pill { display:inline-flex; padding:3px 10px; border-radius:20px; font-size:11px; font-weight:700; white-space:nowrap; }
    .pill-ok      { background:var(--ok-bg);      color:var(--ok); }
    .pill-warn    { background:var(--warn-bg);     color:var(--warn); }
    .pill-danger  { background:var(--danger-bg);   color:var(--danger); }
    .pill-pending { background:var(--cream-dk);    color:var(--muted); }

    @media(max-width:900px) { .kpi-row { grid-template-columns:repeat(3,1fr); } }
    @media(max-width:600px) { .kpi-row { grid-template-columns:1fr 1fr; } .bail-info { gap:7px; } }
  `]
})
export class LocatairePaiementsComponent implements OnInit {

  private locataireSvc = inject(LocatairesService);
  private contratSvc   = inject(ContratsLocationService);
  private collecteSvc  = inject(CollectesService);
  private route        = inject(ActivatedRoute);

  chargement = signal(true);
  locataire  = signal<LocataireDto | null>(null);
  bails      = signal<BailAvecCollectes[]>([]);

  // ── KPIs calculés ───────────────────────────────
  nbBailsActifs() { return this.bails().filter(b => b.bail.statutLabel === 'Actif').length; }

  totalEncaisse() {
    return this.bails().reduce((s, b) =>
      s + b.collectes.reduce((sc, c) => sc + c.montantEncaisse, 0), 0);
  }
  totalEcart() {
    return this.bails().reduce((s, b) =>
      s + b.collectes.reduce((sc, c) => sc + c.ecart, 0), 0);
  }
  statutGlobal(): string {
    const actifs = this.bails().filter(b => b.bail.statutLabel === 'Actif');
    if (!actifs.length) return 'Aucun bail actif';
    const retard = actifs.some(b => b.collectes.some(c => c.ecart < 0 && c.statutLabel === 'Validé'));
    return retard ? 'En retard' : 'À jour';
  }

  // ── Lifecycle ────────────────────────────────────
  ngOnInit() {
    const id = this.route.snapshot.params['id'];
    this.locataireSvc.getById(id).subscribe({
      next: loc => {
        this.locataire.set(loc);
        this.chargerBails(id);
      },
      error: () => this.chargement.set(false)
    });
  }

  chargerBails(locataireId: string) {
    this.contratSvc.getAll({ locataireId, page: 1 }).subscribe({
      next: res => {
        const items: BailAvecCollectes[] = res.items.map(b => ({
          bail: b, collectes: [], loading: false, ouvert: false
        }));
        this.bails.set(items);
        this.chargement.set(false);
        // Ouvrir et charger le premier bail actif automatiquement
        const premier = items.find(b => b.bail.statutLabel === 'Actif') ?? items[0];
        if (premier) this.toggleBail(premier);
      },
      error: () => this.chargement.set(false)
    });
  }

  // ── Toggle bail + chargement collectes ──────────
  toggleBail(item: BailAvecCollectes) {
    item.ouvert = !item.ouvert;
    // Charger les collectes si pas encore chargées
    if (item.ouvert && !item.collectes.length && !item.loading) {
      item.loading = true;
      this.collecteSvc.getAll({ contratId: item.bail.id, page: 1 }).subscribe({
        next: res => {
          item.collectes = res.items.sort((a, b) =>
            b.periodeMois.localeCompare(a.periodeMois) // plus récent en premier
          );
          item.loading = false;
          this.bails.update(b => [...b]); // forcer la détection
        },
        error: () => { item.loading = false; this.bails.update(b => [...b]); }
      });
    }
    this.bails.update(b => [...b]);
  }

  // ── Calculs par contrat ──────────────────────────
  totalAttendu(cs: CollecteDto[])        { return cs.reduce((s,c) => s + c.montantAttendu, 0); }
  totalEncaisseContrat(cs: CollecteDto[]) { return cs.reduce((s,c) => s + c.montantEncaisse, 0); }
  totalEcartContrat(cs: CollecteDto[])    { return cs.reduce((s,c) => s + c.ecart, 0); }
  nbPayes(cs: CollecteDto[])   { return cs.filter(c => c.statutLabel === 'Validé' && c.ecart >= 0).length; }
  nbPartiel(cs: CollecteDto[]) { return cs.filter(c => c.statutLabel === 'Validé' && c.ecart < 0).length; }
  nbImpaye(cs: CollecteDto[])  { return cs.filter(c => c.statutLabel === 'Rejeté').length; }

  // ── Helpers ──────────────────────────────────────
  formatPeriode(p: string): string {
    // "2026-03" → "Mars 2026"
    if (!p) return '—';
    const [y, m] = p.split('-');
    const mois = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'];
    return `${mois[+m - 1] ?? m} ${y}`;
  }

  avatarColor(nom: string): string {
    const colors = ['#1A1A2E','#16213E','#0F3460','#533483','#2B4865','#1A4731','#7B3F00'];
    let h = 0; for (const c of nom) h = (h * 31 + c.charCodeAt(0)) & 0xFFFFFF;
    return colors[Math.abs(h) % colors.length];
  }
  initiales(nom: string): string {
    return nom.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2);
  }
}