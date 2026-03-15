import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule, DecimalPipe, DatePipe }         from '@angular/common';
import { RouterLink }                                   from '@angular/router';
import { DashboardService, AuthService, CollectesService } from '../../core/services/api.services';
import { DashboardDto, StatCollecteur, RapportCollecteurDto } from '../../core/models/models';

@Component({
  selector: 'kdi-dashboard',
  standalone: true,
  imports: [CommonModule, DecimalPipe, DatePipe, RouterLink],
  template: `
<div class="db">
  <div class="db-header">
    <div class="db-header-left">
      <div class="db-eyebrow">Vue d'ensemble</div>
      <h1 class="db-title">Tableau de bord</h1>
      <p class="db-sub">{{ today | date:'EEEE d MMMM yyyy':'':'fr' }}</p>
    </div>
    <div class="db-header-right">
      <select class="period-sel" (change)="onPeriodChange($event)">
        <option *ngFor="let m of derniersMois" [value]="m.value">{{ m.label }}</option>
      </select>
      <a routerLink="/collectes/saisir" class="btn-primary">＋ Nouvelle collecte</a>
    </div>
  </div>

  <ng-container *ngIf="data(); else loading">

    <div class="kpi-band">
      <div class="kpi-tile kpi-navy">
        <div class="kpi-tile-inner">
          <div class="kpi-icon">🏠</div>
          <div class="kpi-num">{{ data()!.totalProduits }}</div>
          <div class="kpi-label">Produits locatifs</div>
          <div class="kpi-sub">{{ data()!.produitsLoues }} loués · {{ data()!.produitsLibres }} libres</div>
        </div>
        <div class="kpi-ring">
          <svg viewBox="0 0 36 36">
            <circle cx="18" cy="18" r="15.9" fill="none" stroke="rgba(255,255,255,.15)" stroke-width="2.5"/>
            <circle cx="18" cy="18" r="15.9" fill="none" stroke="rgba(255,255,255,.8)" stroke-width="2.5"
              [attr.stroke-dasharray]="data()!.tauxOccupation + ' ' + (100 - data()!.tauxOccupation)"
              stroke-dashoffset="25" stroke-linecap="round"/>
            <text x="18" y="21" text-anchor="middle" fill="white" font-size="6.5" font-weight="700">{{ data()!.tauxOccupation }}%</text>
          </svg>
        </div>
      </div>
      <div class="kpi-tile kpi-gold">
        <div class="kpi-tile-inner">
          <div class="kpi-icon">💰</div>
          <div class="kpi-num">{{ data()!.collectesMoisCourant / 1000 | number:'1.0-0' }}<span class="kpi-unit">k</span></div>
          <div class="kpi-label">Encaissé ce mois</div>
          <span class="kpi-badge" [class.badge-up]="data()!.evolutionCollectePct >= 0" [class.badge-dn]="data()!.evolutionCollectePct < 0">
            {{ data()!.evolutionCollectePct >= 0 ? '▲' : '▼' }} {{ data()!.evolutionCollectePct | number:'1.1-1' }}% vs M-1
          </span>
        </div>
        <div class="kpi-deco">MRU</div>
      </div>
      <div class="kpi-tile kpi-teal">
        <div class="kpi-tile-inner">
          <div class="kpi-icon">📋</div>
          <div class="kpi-num">{{ data()!.nbContratsActifs }}</div>
          <div class="kpi-label">Contrats actifs</div>
          <div class="kpi-sub">Baux en cours</div>
        </div>
      </div>
      <div class="kpi-tile" [class.kpi-danger]="data()!.nbRetardsPaiement > 0" [class.kpi-ok]="data()!.nbRetardsPaiement === 0">
        <div class="kpi-tile-inner">
          <div class="kpi-icon">{{ data()!.nbRetardsPaiement > 0 ? '⚠️' : '✅' }}</div>
          <div class="kpi-num">{{ data()!.nbRetardsPaiement }}</div>
          <div class="kpi-label">Retards paiement</div>
          <div class="kpi-sub" *ngIf="data()!.nbRetardsPaiement > 0">{{ data()!.montantRetards | number:'1.0-0' }} MRU</div>
          <div class="kpi-sub" *ngIf="data()!.nbRetardsPaiement === 0">Tous à jour ✓</div>
        </div>
      </div>
    </div>

    <ng-container *ngIf="isDirection()">
      <div class="sh"><span>🏆</span><span class="sh-t">Gains agence</span><span class="sh-badge">Direction</span></div>
      <div class="gains-strip">
        <div class="gi"><div class="gi-l">Ce mois</div><div class="gi-v">{{ data()!.gainsAgenceMoisCourant | number:'1.0-0' }} <span>MRU</span></div></div>
        <div class="gs"></div>
        <div class="gi"><div class="gi-l">Année en cours</div><div class="gi-v">{{ data()!.gainsAgenceAnneeEnCours | number:'1.0-0' }} <span>MRU</span></div></div>
        <div class="gs"></div>
        <div class="gi"><div class="gi-l">Mois précédent</div><div class="gi-v">{{ data()!.collectesMoisPrecedent | number:'1.0-0' }} <span>MRU</span></div></div>
      </div>
    </ng-container>

    <div class="sh"><span>📊</span><span class="sh-t">Évolution — 12 mois</span></div>
    <div class="chart-wrap">
      <div class="chart-gl"><div class="gl" *ngFor="let _ of [0,1,2,3]"></div></div>
      <div class="chart-row">
        <div *ngFor="let p of data()!.graphiqueCollectes" class="bc" [title]="p.mois + ' : ' + (p.montant | number:'1.0-0') + ' MRU'">
          <div class="ba">{{ p.montant > 0 ? (p.montant/1000 | number:'1.0-0') + 'k' : '' }}</div>
          <div class="bb"><div class="bf" [class.bf-cur]="p.mois === selectedPeriod" [style.height.%]="getBarHeight(p.montant)"></div></div>
          <div class="bl">{{ p.mois.slice(5) }}/{{ p.mois.slice(2,4) }}</div>
        </div>
      </div>
    </div>

    <div class="main-grid">
      <div class="panel">
        <div class="ph">
          <div class="pt">👷 Performance collecteurs <span class="pb">S{{ semaineEnCours }}</span></div>
          <a routerLink="/collectes/rapport" class="pl">Rapport →</a>
        </div>
        <ng-container *ngIf="data()!.statsCollecteurs.length; else noC">
          <div class="podium-row">
            <div *ngFor="let c of top3(); let i = index" class="pc" [ngClass]="'p'+(i+1)">
              <div class="pm">{{ i===0?'🥇':i===1?'🥈':'🥉' }}</div>
              <div class="pa">{{ getInitiales(c) }}</div>
              <div class="pn">{{ c.nom }}</div>
              <div class="ps-row">
                <div class="psi"><div class="psv">{{ c.nbCollectesSemaine }}</div><div class="psl">coll.</div></div>
                <div class="psi"><div class="psv">{{ c.montantSemaine/1000 | number:'1.0-0' }}k</div><div class="psl">MRU</div></div>
                <div class="psi"><div class="psv" [ngClass]="getRateClass(c.tauxEncaissement)">{{ c.tauxEncaissement > 0 ? (c.tauxEncaissement+'%') : '—' }}</div><div class="psl">taux</div></div>
              </div>
              <div class="pbb"><div class="pbf" [ngClass]="'pbf'+(i+1)" [style.width.%]="getVolumePct(c)"></div></div>
            </div>
          </div>
          <div class="ct-wrap">
            <table class="ct">
              <thead><tr><th>#</th><th>Collecteur</th><th class="r">Coll.</th><th class="r">Montant</th><th class="r">Taux</th><th class="r">Retards</th></tr></thead>
              <tbody>
                <tr *ngFor="let c of data()!.statsCollecteurs; let i = index">
                  <td class="rtd"><span *ngIf="i===0">🥇</span><span *ngIf="i===1">🥈</span><span *ngIf="i===2">🥉</span><span *ngIf="i>2" class="rn">{{ i+1 }}</span></td>
                  <td><div class="cr"><div class="cas">{{ getInitiales(c) }}</div><span class="cn">{{ c.nom }}</span></div></td>
                  <td class="r mono">{{ c.nbCollectesSemaine }}</td>
                  <td class="r mono">{{ c.montantSemaine | number:'1.0-0' }}</td>
                  <td class="r"><span class="rp" [ngClass]="getRateBadge(c.tauxEncaissement)">{{ c.tauxEncaissement > 0 ? (c.tauxEncaissement+'%') : '—' }}</span></td>
                  <td class="r"><span *ngIf="c.nbRetards>0" class="rd">{{ c.nbRetards }}</span><span *ngIf="c.nbRetards===0" class="rod">✓</span></td>
                </tr>
              </tbody>
            </table>
          </div>
        </ng-container>
        <ng-template #noC><div class="pe">📭 Aucune collecte cette semaine.</div></ng-template>
      </div>

      <div class="right-col">
        <div class="panel" *ngIf="rapport()">
          <div class="ph"><div class="pt">📑 Rapport S{{ semaineEnCours }}</div><a routerLink="/collectes/rapport" class="pl">Voir tout →</a></div>
          <div class="rk-row">
            <div class="rk"><div class="rkv ok">{{ rapport()!.lignesPayees.length }}</div><div class="rkl">Payés</div></div>
            <div class="rk"><div class="rkv danger">{{ rapport()!.lignesNonPayees.length }}</div><div class="rkl">Non payés</div></div>
            <div class="rk"><div class="rkv warn">{{ rapport()!.lignesRattrapage.length }}</div><div class="rkl">Rattrap.</div></div>
            <div class="rk"><div class="rkv gold">{{ rapport()!.totalCollecte/1000 | number:'1.0-0' }}k</div><div class="rkl">MRU</div></div>
          </div>
          <div class="rl-wrap">
            <div *ngFor="let l of rapport()!.lignesPayees | slice:0:4" class="rl rl-ok">
              <span class="rlc">{{ l.produitCode }}</span><span class="rln">{{ l.locataireNom }}</span>
              <span class="rla">{{ l.montantEncaisse | number:'1.0-0' }}</span><span class="rlb ok">✓</span>
            </div>
            <div *ngFor="let l of rapport()!.lignesNonPayees | slice:0:2" class="rl rl-err">
              <span class="rlc">{{ l.produitCode }}</span><span class="rln">{{ l.locataireNom }}</span>
              <span class="rla danger">{{ l.montantAttendu | number:'1.0-0' }}</span><span class="rlb danger">⚠</span>
            </div>
          </div>
        </div>

        <div class="panel">
          <div class="ph"><div class="pt">🕒 Activités récentes</div></div>
          <div class="af">
            <div *ngFor="let a of data()!.dernieresActivites" class="afi">
              <div class="afd" [ngClass]="getActivityDotClass(a.type)"></div>
              <div><div class="afdesc">{{ a.description }}</div><div class="aft">{{ a.date | date:'dd/MM HH:mm' }}</div></div>
            </div>
            <div *ngIf="!data()!.dernieresActivites.length" class="pe">Aucune activité.</div>
          </div>
        </div>
      </div>
    </div>

  </ng-container>
  <ng-template #loading><div class="lw"><div class="ld"></div><p>Chargement…</p></div></ng-template>
</div>
  `,
  styles: [`
    :host {
      --gold:#C9A84C; --gold-lt:#E8C96A; --gold-dk:#8B6914;
      --ink:#0B1120; --ink2:#1E293B; --ink3:#334155;
      --mu:#94A3B8; --bo:#E2E8F0; --bg:#F5F7FB; --wh:#FFFFFF;
      --ok:#059669; --okb:#D1FAE5;
      --wa:#D97706; --wab:#FEF3C7;
      --da:#DC2626; --dab:#FEE2E2;
      --r:14px; --sh:0 1px 3px rgba(0,0,0,.06),0 4px 16px rgba(0,0,0,.06);
    }
    .db { max-width:1440px; margin:0 auto; padding:0 2px 40px; }
    .db-header { display:flex; justify-content:space-between; align-items:flex-end; margin-bottom:28px; gap:16px; flex-wrap:wrap; }
    .db-eyebrow { font-size:11px; font-weight:700; letter-spacing:1.5px; text-transform:uppercase; color:var(--gold); margin-bottom:4px; }
    .db-title { font-size:26px; font-weight:800; color:var(--ink); margin:0 0 4px; letter-spacing:-.5px; }
    .db-sub { font-size:13px; color:var(--mu); margin:0; }
    .db-header-right { display:flex; align-items:center; gap:10px; }
    .period-sel { padding:8px 14px; border:1.5px solid var(--bo); border-radius:9px; font-size:13px; background:var(--wh); cursor:pointer; outline:none; }
    .btn-primary { display:flex; align-items:center; gap:6px; padding:9px 18px; background:var(--ink); color:var(--gold-lt); border-radius:9px; text-decoration:none; font-size:13px; font-weight:700; transition:all .2s; }
    .btn-primary:hover { background:var(--ink2); transform:translateY(-1px); }
    .kpi-band { display:grid; grid-template-columns:repeat(4,1fr); gap:14px; margin-bottom:28px; }
    .kpi-tile { border-radius:var(--r); padding:22px 24px; position:relative; overflow:hidden; box-shadow:var(--sh); display:flex; align-items:stretch; min-height:140px; }
    .kpi-tile-inner { display:flex; flex-direction:column; gap:4px; flex:1; z-index:1; }
    .kpi-navy   { background:linear-gradient(135deg,#0B1120,#1E3A5F); }
    .kpi-gold   { background:linear-gradient(135deg,#92400E,#C9A84C); }
    .kpi-teal   { background:linear-gradient(135deg,#064E3B,#0D9488); }
    .kpi-ok     { background:linear-gradient(135deg,#064E3B,#059669); }
    .kpi-danger { background:linear-gradient(135deg,#7F1D1D,#DC2626); }
    .kpi-icon { font-size:22px; margin-bottom:6px; }
    .kpi-num { font-size:36px; font-weight:800; line-height:1; letter-spacing:-1px; color:white; }
    .kpi-unit { font-size:18px; opacity:.8; }
    .kpi-label { font-size:12px; font-weight:600; opacity:.85; margin-top:4px; color:white; }
    .kpi-sub { font-size:11px; opacity:.6; color:white; }
    .kpi-deco { position:absolute; right:16px; bottom:14px; font-size:42px; font-weight:900; opacity:.08; color:white; }
    .kpi-badge { display:inline-flex; margin-top:6px; padding:3px 9px; border-radius:20px; font-size:11px; font-weight:700; }
    .badge-up { background:rgba(255,255,255,.2); color:white; }
    .badge-dn { background:rgba(0,0,0,.25); color:rgba(255,255,255,.85); }
    .kpi-ring { width:72px; height:72px; flex-shrink:0; align-self:center; margin-left:auto; }
    .kpi-ring svg { width:100%; height:100%; }
    .sh { display:flex; align-items:center; gap:8px; margin:28px 0 14px; font-size:15px; font-weight:700; color:var(--ink); }
    .sh-t { flex:1; }
    .sh-badge { font-size:10px; font-weight:700; letter-spacing:.8px; text-transform:uppercase; background:var(--wab); color:var(--wa); padding:3px 9px; border-radius:20px; }
    .gains-strip { display:flex; background:var(--ink); border-radius:var(--r); padding:22px 28px; margin-bottom:4px; box-shadow:var(--sh); }
    .gi { flex:1; }
    .gs { width:1px; background:rgba(255,255,255,.1); margin:0 28px; }
    .gi-l { font-size:11px; font-weight:700; letter-spacing:.8px; text-transform:uppercase; color:rgba(255,255,255,.4); margin-bottom:8px; }
    .gi-v { font-size:28px; font-weight:800; color:var(--gold-lt); letter-spacing:-1px; }
    .gi-v span { font-size:14px; font-weight:400; color:var(--gold); margin-left:4px; }
    .chart-wrap { background:var(--wh); border-radius:var(--r); padding:20px 20px 0; box-shadow:var(--sh); margin-bottom:28px; position:relative; }
    .chart-gl { position:absolute; top:20px; left:20px; right:20px; bottom:48px; display:flex; flex-direction:column; justify-content:space-between; pointer-events:none; }
    .gl { border-top:1px dashed var(--bo); }
    .chart-row { display:flex; align-items:flex-end; gap:4px; height:160px; padding-bottom:32px; position:relative; }
    .bc { flex:1; display:flex; flex-direction:column; align-items:center; gap:2px; }
    .ba { font-size:9px; color:var(--mu); font-family:monospace; height:14px; }
    .bb { flex:1; width:100%; display:flex; align-items:flex-end; }
    .bf { width:100%; border-radius:5px 5px 0 0; min-height:3px; background:linear-gradient(to top,#1E293B,#475569); cursor:pointer; transition:filter .2s; }
    .bf:hover { filter:brightness(1.2); }
    .bf-cur { background:linear-gradient(to top,var(--gold-dk),var(--gold-lt)); }
    .bl { font-size:9.5px; color:var(--mu); font-family:monospace; position:absolute; bottom:6px; white-space:nowrap; }
    .main-grid { display:grid; grid-template-columns:1fr 360px; gap:18px; align-items:start; }
    .right-col { display:flex; flex-direction:column; gap:16px; }
    .panel { background:var(--wh); border-radius:var(--r); box-shadow:var(--sh); overflow:hidden; }
    .ph { display:flex; align-items:center; justify-content:space-between; padding:16px 20px; border-bottom:1px solid var(--bo); }
    .pt { font-size:14px; font-weight:700; color:var(--ink); display:flex; align-items:center; gap:7px; }
    .pb { font-size:10px; font-weight:700; background:var(--ink); color:var(--gold-lt); padding:2px 8px; border-radius:20px; }
    .pl { font-size:12px; color:var(--gold-dk); font-weight:700; text-decoration:none; }
    .pl:hover { text-decoration:underline; }
    .pe { padding:24px; text-align:center; color:var(--mu); font-size:13px; }
    .podium-row { display:grid; grid-template-columns:repeat(3,1fr); gap:12px; padding:16px; border-bottom:1px solid var(--bo); }
    .pc { border-radius:10px; padding:14px 12px; display:flex; flex-direction:column; align-items:center; gap:6px; }
    .p1 { background:linear-gradient(160deg,#FFFBEB,#FEF3C7); border:1px solid #FDE68A; }
    .p2 { background:linear-gradient(160deg,#F8FAFC,#F1F5F9); border:1px solid #E2E8F0; }
    .p3 { background:linear-gradient(160deg,#FFF7ED,#FFEDD5); border:1px solid #FED7AA; }
    .pm { font-size:20px; }
    .pa { width:44px; height:44px; border-radius:12px; background:var(--ink); display:flex; align-items:center; justify-content:center; font-size:14px; font-weight:700; color:var(--gold-lt); }
    .p1 .pa { background:linear-gradient(135deg,var(--gold-dk),var(--gold-lt)); }
    .pn { font-size:12px; font-weight:700; color:var(--ink); text-align:center; }
    .ps-row { display:flex; gap:8px; }
    .psi { text-align:center; }
    .psv { font-size:16px; font-weight:800; color:var(--ink); line-height:1; }
    .psl { font-size:9px; color:var(--mu); text-transform:uppercase; letter-spacing:.5px; }
    .pbb { width:100%; height:4px; background:rgba(0,0,0,.08); border-radius:4px; overflow:hidden; }
    .pbf { height:100%; border-radius:4px; transition:width .5s; }
    .pbf1 { background:linear-gradient(90deg,var(--gold-dk),var(--gold-lt)); }
    .pbf2 { background:linear-gradient(90deg,#64748B,#94A3B8); }
    .pbf3 { background:linear-gradient(90deg,#92400E,#D97706); }
    .ct-wrap { overflow-x:auto; }
    .ct { width:100%; border-collapse:collapse; }
    .ct thead th { padding:8px 14px; background:#f8fafc; font-size:10px; font-weight:700; color:var(--mu); text-transform:uppercase; letter-spacing:.5px; border-bottom:1px solid var(--bo); text-align:left; }
    .ct thead th.r { text-align:right; }
    .ct tbody td { padding:10px 14px; font-size:13px; color:var(--ink3); border-bottom:1px solid var(--bo); }
    .ct tbody tr:last-child td { border-bottom:none; }
    .ct tbody tr:hover td { background:rgba(201,168,76,.04); }
    .ct td.r { text-align:right; }
    .ct td.mono { font-family:monospace; font-weight:600; }
    .rtd { text-align:center; width:36px; font-size:16px; }
    .rn { font-size:12px; font-weight:700; color:var(--mu); }
    .cr { display:flex; align-items:center; gap:8px; }
    .cas { width:28px; height:28px; border-radius:7px; background:var(--ink); display:flex; align-items:center; justify-content:center; font-size:10px; font-weight:700; color:var(--gold-lt); }
    .cn { font-size:13px; font-weight:600; color:var(--ink); }
    .rp { display:inline-flex; padding:2px 8px; border-radius:20px; font-size:11px; font-weight:700; }
    .badge-ok { background:var(--okb); color:var(--ok); }
    .badge-warn { background:var(--wab); color:var(--wa); }
    .badge-danger { background:var(--dab); color:var(--da); }
    .rd { display:inline-flex; align-items:center; justify-content:center; width:22px; height:22px; border-radius:50%; background:var(--dab); color:var(--da); font-size:11px; font-weight:700; }
    .rod { color:var(--ok); font-weight:700; }
    .ok { color:var(--ok); } .warn { color:var(--wa); } .danger { color:var(--da); }
    .rk-row { display:flex; padding:14px 16px; border-bottom:1px solid var(--bo); }
    .rk { flex:1; text-align:center; padding:0 8px; border-right:1px solid var(--bo); }
    .rk:last-child { border-right:none; }
    .rkv { font-size:22px; font-weight:800; color:var(--ink); }
    .rkv.ok { color:var(--ok); } .rkv.danger { color:var(--da); } .rkv.warn { color:var(--wa); } .rkv.gold { color:var(--gold-dk); }
    .rkl { font-size:10px; color:var(--mu); font-weight:600; text-transform:uppercase; letter-spacing:.5px; margin-top:2px; }
    .rl-wrap { padding:8px 12px; display:flex; flex-direction:column; gap:4px; }
    .rl { display:flex; align-items:center; gap:8px; padding:7px 10px; border-radius:8px; font-size:12px; }
    .rl-ok { background:#f0fdf9; } .rl-err { background:#fff8f8; }
    .rlc { font-family:monospace; font-weight:700; background:#e8edf5; padding:2px 6px; border-radius:5px; font-size:11px; color:var(--ink); }
    .rln { flex:1; color:var(--ink3); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
    .rla { font-family:monospace; font-weight:700; color:var(--ink2); font-size:12px; }
    .rla.danger { color:var(--da); }
    .rlb { width:20px; height:20px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:10px; font-weight:700; }
    .rlb.ok { background:var(--okb); color:var(--ok); } .rlb.danger { background:var(--dab); color:var(--da); }
    .af { padding:8px 0; }
    .afi { display:flex; gap:12px; padding:10px 16px; transition:background .15s; }
    .afi:hover { background:var(--bg); }
    .afd { width:8px; height:8px; border-radius:50%; background:var(--gold); flex-shrink:0; margin-top:6px; }
    .afd.ok { background:var(--ok); } .afd.danger { background:var(--da); } .afd.warn { background:var(--wa); } .afd.info { background:#3B82F6; }
    .afdesc { font-size:13px; color:var(--ink3); line-height:1.5; }
    .aft { font-size:11px; color:var(--mu); font-family:monospace; margin-top:2px; }
    .lw { display:flex; flex-direction:column; align-items:center; gap:16px; padding:80px; color:var(--mu); }
    .ld { width:36px; height:36px; border:3px solid var(--bo); border-top-color:var(--ink); border-radius:50%; animation:spin .7s linear infinite; }
    @keyframes spin { to { transform:rotate(360deg); } }
    @media(max-width:1200px) {
      .kpi-band { grid-template-columns:repeat(2,1fr); }
      .main-grid { grid-template-columns:1fr; }
      .right-col { display:grid; grid-template-columns:1fr 1fr; }
    }
    @media(max-width:768px) {
      .kpi-band { grid-template-columns:1fr 1fr; }
      .gains-strip { flex-direction:column; gap:16px; }
      .gs { display:none; }
      .podium-row,.right-col { grid-template-columns:1fr; }
    }
  `]
})
export class DashboardComponent implements OnInit {
  private dashSvc    = inject(DashboardService);
  private collectSvc = inject(CollectesService);
  private auth       = inject(AuthService);

  data    = signal<DashboardDto | null>(null);
  rapport = signal<RapportCollecteurDto | null>(null);

  today          = new Date();
  maxMontant     = 0;
  semaineEnCours = this.getWeekNumber(new Date());
  derniersMois   = this.buildDerniersMois();
  selectedPeriod = this.currentMonth();

  top3 = computed(() => (this.data()?.statsCollecteurs ?? []).slice(0, 3));

  ngOnInit(): void { this.load(); this.loadRapport(); }

  load(period?: string): void {
    if (period) this.selectedPeriod = period;
    this.dashSvc.getDashboard(period).subscribe(d => {
      if (!d) return;
      this.data.set({ ...d, graphiqueCollectes: d.graphiqueCollectes ?? [], statsCollecteurs: d.statsCollecteurs ?? [], dernieresActivites: d.dernieresActivites ?? [] });
      this.maxMontant = Math.max(...(d.graphiqueCollectes ?? []).map(p => p.montant), 1);
    });
  }

  loadRapport(): void {
    const user = this.auth.getUser();
    if (!user?.id) return;
    this.collectSvc.getRapportCollecteur(user.id, this.semaineEnCours, this.today.getFullYear())
      .subscribe({ next: r => this.rapport.set(r), error: () => this.rapport.set(null) });
  }

  onPeriodChange(e: Event): void { this.load((e.target as HTMLSelectElement).value); }

  getBarHeight(m: number): number { return this.maxMontant === 0 ? 2 : Math.max((m / this.maxMontant) * 100, 2); }

  getInitiales(c: StatCollecteur): string {
    if (c.initiales) return c.initiales;
    return c.nom.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2);
  }

  getVolumePct(c: StatCollecteur): number {
    const max = Math.max(...(this.data()?.statsCollecteurs ?? []).map(x => x.montantSemaine), 1);
    return Math.round((c.montantSemaine / max) * 100);
  }

  getEvolutionPct(c: StatCollecteur): number {
    if (!c.montantSemainePrec || c.montantSemainePrec === 0) return 0;
    return ((c.montantSemaine - c.montantSemainePrec) / c.montantSemainePrec) * 100;
  }
  getEvolutionSymbol(c: StatCollecteur): string { return this.getEvolutionPct(c) >= 0 ? '▲' : '▼'; }
  getEvolutionClass(c: StatCollecteur):  string { return this.getEvolutionPct(c) >= 0 ? 'trend-up' : 'trend-down'; }
  getRateClass(t: number):    string { return t >= 80 ? 'ok'         : t >= 65 ? 'warn'        : 'danger'; }
  getRateBadge(t: number):    string { return t >= 80 ? 'badge-ok'   : t >= 65 ? 'badge-warn'  : 'badge-danger'; }

  getActivityDotClass(type: string): string {
    const t = (type ?? '').toLowerCase();
    if (t.includes('collecte') || t.includes('valid')) return 'ok';
    if (t.includes('retard')   || t.includes('rejet')) return 'danger';
    if (t.includes('relance')  || t.includes('alerte')) return 'warn';
    return 'info';
  }

  isDirection(): boolean { return this.auth.isDirection(); }

  currentMonth(): string {
    return this.today.getFullYear() + '-' + String(this.today.getMonth() + 1).padStart(2, '0');
  }

  buildDerniersMois(): { value: string; label: string }[] {
    return Array.from({ length: 12 }, (_, i) => {
      const d = new Date(this.today.getFullYear(), this.today.getMonth() - i, 1);
      const v = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
      return { value: v, label: v };
    });
  }

  getWeekNumber(d: Date): number {
    const utc = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    utc.setUTCDate(utc.getUTCDate() + 4 - (utc.getUTCDay() || 7));
    const y = new Date(Date.UTC(utc.getUTCFullYear(), 0, 1));
    return Math.ceil((((utc as any) - (y as any)) / 86400000 + 1) / 7);
  }
}
