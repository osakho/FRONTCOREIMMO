import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule, DecimalPipe, DatePipe }          from '@angular/common';
import { RouterLink }                                    from '@angular/router';
import { FormsModule }                                   from '@angular/forms';
import { RecouvrementService }                           from '../../core/services/api.services';
import { DossierRecouvrementDto }                        from '../../core/models/models';

@Component({
  selector: 'kdi-recouvrement',
  standalone: true,
  imports: [CommonModule, DecimalPipe, DatePipe, RouterLink, FormsModule],
  template: `

<!-- ══ HEADER ══ -->
<div class="page-hd">
  <div>
    <h1 class="page-title">Recouvrement des loyers</h1>
    <p class="page-sub">Suivi des impayés et gestion des relances</p>
  </div>
  <div class="hd-actions">
    <button class="btn-export" (click)="exportExcel()">📥 Export Excel</button>
    <button class="btn-relance-mass"
            [disabled]="!selectionIds().length"
            (click)="ouvrirRelanceMasse()">
      📧 Envoyer relance
      <span class="badge-sel" *ngIf="selectionIds().length">{{ selectionIds().length }}</span>
    </button>
  </div>
</div>

<!-- ══ KPI CARDS ══ -->
<div class="kpi-grid">
  <div class="kpi-card border-danger">
    <div class="kc-top">
      <div class="kc-label">TOTAL IMPAYÉS</div>
      <span class="kc-ico">⚠️</span>
    </div>
    <div class="kc-val danger">{{ totalImpayes() | number:'1.0-0' }}</div>
    <div class="kc-sub">MRU — {{ dossiers().length }} locataires</div>
  </div>
  <div class="kpi-card border-warn">
    <div class="kc-top">
      <div class="kc-label">RETARD 1–30 JOURS</div>
      <span class="kc-ico">🕐</span>
    </div>
    <div class="kc-val warn">{{ retard1_30().length }}</div>
    <div class="kc-sub">dossiers — Relance 1</div>
  </div>
  <div class="kpi-card border-orange">
    <div class="kc-top">
      <div class="kc-label">RETARD 31–90 JOURS</div>
      <span class="kc-ico">📋</span>
    </div>
    <div class="kc-val orange">{{ retard31_90().length }}</div>
    <div class="kc-sub">dossiers — Relances 2–3</div>
  </div>
  <div class="kpi-card border-ok">
    <div class="kc-top">
      <div class="kc-label">MONTANT À RECOUVRER</div>
      <span class="kc-ico">💰</span>
    </div>
    <div class="kc-val ok">{{ totalImpayes() | number:'1.0-0' }}</div>
    <div class="kc-sub">MRU total</div>
  </div>
</div>

<!-- ══ FILTRES ══ -->
<div class="filters-bar">
  <div class="chips">
    <button class="chip" [class.active]="filtre()===''"        (click)="filtre.set('')">
      Tous ({{ dossiers().length }})
    </button>
    <button class="chip warn"   [class.active]="filtre()==='Relance1'" (click)="filtre.set('Relance1')">
      1ère relance ({{ retard1_30().length }})
    </button>
    <button class="chip orange" [class.active]="filtre()==='Relance2'" (click)="filtre.set('Relance2')">
      2ème relance ({{ nbRelance2() }})
    </button>
    <button class="chip danger" [class.active]="filtre()==='Relance3'" (click)="filtre.set('Relance3')">
      3ème relance / MED ({{ retard31_90().length }})
    </button>
  </div>
  <div class="search-box">
    <span>🔍</span>
    <input [(ngModel)]="search" placeholder="Rechercher locataire, bien…" />
    <button *ngIf="search" (click)="search=''" class="clr">✕</button>
  </div>
</div>

<!-- ══ SPINNER ══ -->
<div class="spinner-wrap" *ngIf="loading()">
  <div class="spinner"></div>
  <span>Chargement des dossiers…</span>
</div>

<!-- ══ TABLEAU ══ -->
<div class="table-card" *ngIf="!loading()">

  <!-- Empty -->
  <div class="empty" *ngIf="!dossiersAffiches().length">
    <div style="font-size:48px;margin-bottom:12px">✅</div>
    <div class="e-title">Aucun impayé</div>
    <div class="e-sub">Tous les loyers sont à jour pour ce filtre</div>
  </div>

  <table *ngIf="dossiersAffiches().length">
    <thead>
      <tr>
        <th class="th-chk">
          <input type="checkbox" [checked]="tousCoches()" (change)="toggleTous($event)" />
        </th>
        <th>Locataire</th>
        <th>Bien</th>
        <th>Montant dû</th>
        <th>Retard</th>
        <th>Dernière relance</th>
        <th>Étape</th>
        <th>Actions</th>
      </tr>
    </thead>
    <tbody>
      <tr *ngFor="let d of dossiersAffiches()"
          [class.selected]="coche(d.contratId)">
        <td class="td-chk">
          <input type="checkbox" [checked]="coche(d.contratId)"
                 (change)="toggleCoche(d.contratId)" />
        </td>
        <td>
          <div class="l-nom">{{ d.locataireNom }}</div>
          <div class="l-tel">{{ d.locataireTel }}</div>
        </td>
        <td>
          <span class="code-badge">{{ d.produitCode }}</span>
          <span class="prop-lbl">{{ d.proprieteLibelle }}</span>
        </td>
        <td>
          <span class="montant">{{ d.montantDu | number:'1.0-0' }}</span>
          <span class="mru"> MRU</span>
        </td>
        <td>
          <span class="retard" [attr.data-lvl]="lvl(d.joursRetard)">
            {{ d.joursRetard }} jours
          </span>
        </td>
        <td>
          <span class="date-txt" *ngIf="d.derniereRelance">{{ d.derniereRelance | date:'dd/MM/yyyy' }}</span>
          <span class="no-date" *ngIf="!d.derniereRelance">—</span>
        </td>
        <td>
          <span class="etape-tag" [attr.data-e]="d.etape">{{ etapeLbl(d.etape) }}</span>
        </td>
        <td>
          <div class="acts">
            <button class="a-btn relancer"
                    *ngIf="d.etape==='Relance1'||d.etape==='Relance2'"
                    [disabled]="d.loading"
                    (click)="ouvrirRelance(d)">
              <span *ngIf="!d.loading">📧 Relancer</span>
              <span *ngIf="d.loading" class="sxs"></span>
            </button>
            <button class="a-btn med"
                    *ngIf="d.etape==='Relance3'"
                    (click)="ouvrirRelance(d)">
              ⚖️ Mise en demeure
            </button>
            <button class="a-btn contentieux"
                    *ngIf="d.etape==='Contentieux'"
                    [routerLink]="['/contrats-location', d.contratId]">
              📁 Voir dossier
            </button>
            <button class="a-btn historique"
                    *ngIf="d.etape==='Relance3'||d.etape==='Contentieux'"
                    [routerLink]="['/contrats-location', d.contratId]">
              🗒 Historique
            </button>
            <button class="a-btn encaisser" (click)="ouvrirEncaissement(d)">
              💳 Encaisser
            </button>
          </div>
        </td>
      </tr>
    </tbody>
  </table>
</div>

<!-- ══════════════════════
     MODAL RELANCE
══════════════════════ -->
<div class="ov" [class.open]="mRelance()" (click)="mRelance.set(false)">
<div class="modal" (click)="$event.stopPropagation()" *ngIf="actif()">
  <div class="mhd">
    <div class="mhd-l">
      <div class="mhd-ico">📧</div>
      <div>
        <div class="mhd-title">{{ actif()!.etape==='Relance3' ? 'Mise en demeure' : 'Envoyer une relance' }}</div>
        <div class="mhd-sub">{{ actif()!.locataireNom }}</div>
      </div>
    </div>
    <button class="mhd-close" (click)="mRelance.set(false)">✕</button>
  </div>
  <div class="mbody">
    <div class="info-grid">
      <div class="ig-row"><span>Montant dû</span><strong class="danger">{{ actif()!.montantDu | number:'1.0-0' }} MRU</strong></div>
      <div class="ig-row"><span>Retard</span><strong>{{ actif()!.joursRetard }} jours</strong></div>
      <div class="ig-row"><span>Bien</span><strong>{{ actif()!.produitCode }} — {{ actif()!.proprieteLibelle }}</strong></div>
      <div class="ig-row"><span>Étape actuelle</span><span class="etape-tag" [attr.data-e]="actif()!.etape">{{ etapeLbl(actif()!.etape) }}</span></div>
    </div>
    <div class="fg mt">
      <label>Message personnalisé <span class="opt">(optionnel)</span></label>
      <textarea class="fc ta" rows="3" [(ngModel)]="msgRelance"
                placeholder="Laisser vide pour utiliser le message standard…"></textarea>
    </div>
    <div class="info-note">
      ℹ Le locataire sera contacté par SMS au {{ actif()!.locataireTel }}
    </div>
  </div>
  <div class="mfoot">
    <button class="btn-ghost" (click)="mRelance.set(false)">Annuler</button>
    <button class="btn-send" [disabled]="envoyant()" (click)="confirmerRelance()">
      <span *ngIf="!envoyant()">📧 Envoyer</span>
      <span *ngIf="envoyant()" class="sxs w"></span>
    </button>
  </div>
</div>
</div>

<!-- ══════════════════════
     MODAL ENCAISSEMENT
══════════════════════ -->
<div class="ov" [class.open]="mEncaisser()" (click)="mEncaisser.set(false)">
<div class="modal" (click)="$event.stopPropagation()" *ngIf="actif()">
  <div class="mhd ok">
    <div class="mhd-l">
      <div class="mhd-ico">💳</div>
      <div>
        <div class="mhd-title">Enregistrer un paiement</div>
        <div class="mhd-sub">{{ actif()!.locataireNom }}</div>
      </div>
    </div>
    <button class="mhd-close" (click)="mEncaisser.set(false)">✕</button>
  </div>
  <div class="mbody">
    <div class="info-grid">
      <div class="ig-row"><span>Montant dû</span><strong class="danger">{{ actif()!.montantDu | number:'1.0-0' }} MRU</strong></div>
      <div class="ig-row"><span>Bien</span><strong>{{ actif()!.produitCode }}</strong></div>
    </div>
    <div class="two-col mt">
      <div class="fg">
        <label>Montant encaissé <span class="req">*</span></label>
        <input class="fc" type="number" [(ngModel)]="montant" [placeholder]="actif()!.montantDu" />
      </div>
      <div class="fg">
        <label>Mode de paiement</label>
        <select class="fc" [(ngModel)]="mode">
          <option value="Especes">Espèces</option>
          <option value="Bankily">Bankily</option>
          <option value="Masrvi">Masrvi</option>
          <option value="VirementBancaire">Virement bancaire</option>
          <option value="Cheque">Chèque</option>
        </select>
      </div>
      <div class="fg full">
        <label>Référence</label>
        <input class="fc" [(ngModel)]="ref" placeholder="N° reçu, référence transaction…" />
      </div>
    </div>
    <div class="banner ok" *ngIf="okMsg()">✅ {{ okMsg() }}</div>
    <div class="banner err" *ngIf="errMsg()">⚠️ {{ errMsg() }}</div>
  </div>
  <div class="mfoot">
    <button class="btn-ghost" (click)="mEncaisser.set(false)">Annuler</button>
    <button class="btn-ok" [disabled]="!montant||envoyant()" (click)="confirmerEncaissement()">
      <span *ngIf="!envoyant()">✔ Confirmer le paiement</span>
      <span *ngIf="envoyant()" class="sxs w"></span>
    </button>
  </div>
</div>
</div>

<!-- ══════════════════════
     MODAL RELANCE MASSE
══════════════════════ -->
<div class="ov" [class.open]="mMasse()" (click)="mMasse.set(false)">
<div class="modal" (click)="$event.stopPropagation()">
  <div class="mhd">
    <div class="mhd-l">
      <div class="mhd-ico">📧</div>
      <div>
        <div class="mhd-title">Relance groupée</div>
        <div class="mhd-sub">{{ selectionIds().length }} dossier(s) sélectionné(s)</div>
      </div>
    </div>
    <button class="mhd-close" (click)="mMasse.set(false)">✕</button>
  </div>
  <div class="mbody">
    <div class="info-note warn">
      ⚠️ Une relance sera envoyée à <strong>{{ selectionIds().length }}</strong> locataire(s) simultanément.
    </div>
    <div class="banner ok" *ngIf="okMsg()">✅ {{ okMsg() }}</div>
    <div class="banner err" *ngIf="errMsg()">⚠️ {{ errMsg() }}</div>
  </div>
  <div class="mfoot">
    <button class="btn-ghost" (click)="mMasse.set(false)">Annuler</button>
    <button class="btn-send" [disabled]="envoyant()" (click)="confirmerMasse()">
      <span *ngIf="!envoyant()">📧 Envoyer {{ selectionIds().length }} relance(s)</span>
      <span *ngIf="envoyant()" class="sxs w"></span>
    </button>
  </div>
</div>
</div>
  `,
  styles: [`
    :host{--gold:#C9A84C;--gold-l:#E8C96A;--gold-d:#8B6914;--ink:#0D0D0D;--ink-mid:#1A1A2E;--ink-soft:#2D2D4A;--cream:#F8F4ED;--cream-dk:#EDE8DF;--muted:#8A8899;--ok:#1A7A4A;--ok-bg:#E6F5EE;--warn:#D4850A;--warn-bg:#FEF3E2;--orange:#C25A0A;--orange-bg:#FEF0E7;--danger:#C0392B;--danger-bg:#FDECEA;--r:12px}

    /* PAGE HEADER */
    .page-hd{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:24px;gap:14px;flex-wrap:wrap}
    .page-title{font-size:24px;font-weight:800;color:var(--ink-mid);margin:0 0 4px;font-family:'Playfair Display',Georgia,serif}
    .page-sub{font-size:13px;color:var(--muted);margin:0}
    .hd-actions{display:flex;gap:10px;flex-wrap:wrap}
    .btn-export{padding:9px 16px;background:#fff;border:1.5px solid var(--cream-dk);border-radius:9px;font-size:13px;font-weight:600;color:var(--ink-soft);cursor:pointer;font-family:inherit;transition:all .15s}
    .btn-export:hover{border-color:var(--ok);color:var(--ok)}
    .btn-relance-mass{padding:9px 18px;background:linear-gradient(135deg,var(--gold-d),var(--gold));color:#fff;border:none;border-radius:9px;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit;display:flex;align-items:center;gap:8px;transition:all .18s}
    .btn-relance-mass:disabled{opacity:.4;cursor:not-allowed}
    .btn-relance-mass:not(:disabled):hover{box-shadow:0 4px 14px rgba(201,168,76,.4)}
    .badge-sel{display:inline-flex;width:20px;height:20px;border-radius:50%;background:rgba(255,255,255,.3);font-size:11px;font-weight:800;align-items:center;justify-content:center}

    /* KPI */
    .kpi-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:22px}
    .kpi-card{background:#fff;border-radius:var(--r);padding:20px 22px;box-shadow:0 2px 10px rgba(0,0,0,.07);border:1.5px solid var(--cream-dk);border-left:4px solid var(--cream-dk)}
    .kpi-card.border-danger{border-left-color:var(--danger)}
    .kpi-card.border-warn{border-left-color:var(--warn)}
    .kpi-card.border-orange{border-left-color:var(--orange)}
    .kpi-card.border-ok{border-left-color:var(--ok)}
    .kc-top{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px}
    .kc-label{font-size:10.5px;font-weight:800;text-transform:uppercase;letter-spacing:.7px;color:var(--muted)}
    .kc-ico{font-size:20px;opacity:.4}
    .kc-val{font-size:28px;font-weight:900;color:var(--ink-mid);font-family:'Playfair Display',Georgia,serif;line-height:1;margin-bottom:4px}
    .kc-val.danger{color:var(--danger)}.kc-val.warn{color:var(--warn)}.kc-val.orange{color:var(--orange)}.kc-val.ok{color:var(--ok)}
    .kc-sub{font-size:12px;color:var(--muted)}

    /* FILTRES */
    .filters-bar{display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;gap:12px;flex-wrap:wrap}
    .chips{display:flex;gap:8px;flex-wrap:wrap}
    .chip{padding:6px 14px;border-radius:20px;font-size:12.5px;font-weight:600;cursor:pointer;border:1.5px solid var(--cream-dk);background:#fff;color:var(--muted);transition:all .15s;font-family:inherit}
    .chip.active{background:var(--ink-mid);color:#fff;border-color:var(--ink-mid)}
    .chip.warn.active{background:var(--warn);border-color:var(--warn);color:#fff}
    .chip.orange.active{background:var(--orange);border-color:var(--orange);color:#fff}
    .chip.danger.active{background:var(--danger);border-color:var(--danger);color:#fff}
    .chip:not(.active):hover{border-color:var(--gold)}
    .search-box{display:flex;align-items:center;gap:8px;background:#fff;border:1.5px solid var(--cream-dk);border-radius:9px;padding:7px 13px;transition:border-color .18s;min-width:240px}
    .search-box:focus-within{border-color:var(--gold)}
    .search-box span{font-size:14px;flex-shrink:0}
    .search-box input{border:none;outline:none;font-size:13px;font-family:inherit;color:var(--ink-mid);flex:1;background:transparent}
    .search-box input::placeholder{color:var(--muted)}
    .clr{background:none;border:none;cursor:pointer;color:var(--muted);font-size:14px;line-height:1;padding:0}

    /* LOADING */
    .spinner-wrap{display:flex;align-items:center;justify-content:center;gap:12px;padding:60px;color:var(--muted);font-size:14px}
    .spinner{width:28px;height:28px;border:3px solid var(--cream-dk);border-top-color:var(--ink-mid);border-radius:50%;animation:spin .8s linear infinite}
    @keyframes spin{to{transform:rotate(360deg)}}
    .sxs{width:13px;height:13px;border:2px solid rgba(0,0,0,.15);border-top-color:currentColor;border-radius:50%;animation:spin .7s linear infinite;display:inline-block;vertical-align:middle}
    .sxs.w{border-color:rgba(255,255,255,.3);border-top-color:#fff}

    /* TABLE */
    .table-card{background:#fff;border-radius:var(--r);box-shadow:0 2px 10px rgba(0,0,0,.07);border:1.5px solid var(--cream-dk);overflow:hidden}
    table{width:100%;border-collapse:collapse}
    th{padding:11px 14px;font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.5px;color:var(--muted);background:var(--cream);border-bottom:1.5px solid var(--cream-dk);text-align:left;white-space:nowrap}
    .th-chk,.td-chk{width:40px;text-align:center}
    tr{border-bottom:1px solid var(--cream-dk);transition:background .12s}
    tr:last-child{border:none}
    tbody tr:hover{background:rgba(201,168,76,.03)}
    tbody tr.selected{background:rgba(201,168,76,.06)}
    td{padding:13px 14px;font-size:13.5px;color:var(--ink-soft);vertical-align:middle}
    .l-nom{font-weight:700;color:var(--ink-mid)}
    .l-tel{font-size:12px;color:var(--muted);margin-top:2px}
    .code-badge{display:inline-flex;padding:2px 8px;border-radius:6px;background:var(--cream);font-family:monospace;font-size:12px;font-weight:700;color:var(--ink-mid);margin-right:6px}
    .prop-lbl{font-size:12px;color:var(--muted)}
    .montant{font-size:15px;font-weight:800;color:var(--danger);font-family:'Playfair Display',Georgia,serif}
    .mru{font-size:11px;font-weight:600;color:var(--muted)}
    .retard{display:inline-flex;padding:4px 11px;border-radius:20px;font-size:12px;font-weight:700}
    .retard[data-lvl="low"]{background:var(--warn-bg);color:var(--warn)}
    .retard[data-lvl="mid"]{background:var(--orange-bg);color:var(--orange)}
    .retard[data-lvl="high"]{background:var(--danger-bg);color:var(--danger)}
    .date-txt{font-size:12.5px;color:var(--muted)}
    .no-date{color:var(--cream-dk);font-size:18px;font-weight:300}
    .etape-tag{display:inline-flex;padding:4px 11px;border-radius:20px;font-size:11.5px;font-weight:700;white-space:nowrap}
    .etape-tag[data-e="Relance1"]{background:var(--warn-bg);color:var(--warn)}
    .etape-tag[data-e="Relance2"]{background:var(--orange-bg);color:var(--orange)}
    .etape-tag[data-e="Relance3"]{background:var(--danger-bg);color:var(--danger)}
    .etape-tag[data-e="Contentieux"]{background:#F5F3FF;color:#5B21B6}
    .acts{display:flex;gap:6px;flex-wrap:wrap}
    .a-btn{padding:5px 11px;border-radius:7px;font-size:11.5px;font-weight:700;cursor:pointer;border:none;font-family:inherit;transition:all .14s;white-space:nowrap;display:inline-flex;align-items:center;gap:5px}
    .a-btn:disabled{opacity:.4;cursor:not-allowed}
    .a-btn.relancer{background:var(--warn-bg);color:var(--warn)}
    .a-btn.relancer:hover:not(:disabled){background:var(--warn);color:#fff}
    .a-btn.med{background:var(--danger-bg);color:var(--danger)}
    .a-btn.med:hover{background:var(--danger);color:#fff}
    .a-btn.contentieux{background:#F5F3FF;color:#5B21B6}
    .a-btn.contentieux:hover{background:#5B21B6;color:#fff}
    .a-btn.historique{background:var(--cream);color:var(--muted);text-decoration:none}
    .a-btn.historique:hover{background:var(--cream-dk)}
    .a-btn.encaisser{background:var(--ok-bg);color:var(--ok)}
    .a-btn.encaisser:hover{background:var(--ok);color:#fff}
    .empty{text-align:center;padding:60px 20px}
    .e-title{font-size:18px;font-weight:700;color:var(--ink-mid);margin-bottom:6px}
    .e-sub{font-size:13px;color:var(--muted)}

    /* MODALS */
    .ov{position:fixed;inset:0;background:rgba(13,13,13,.6);backdrop-filter:blur(4px);z-index:1000;display:flex;align-items:center;justify-content:center;padding:20px;opacity:0;pointer-events:none;transition:opacity .22s}
    .ov.open{opacity:1;pointer-events:all}
    .modal{background:#fff;border-radius:16px;width:100%;max-width:480px;box-shadow:0 24px 80px rgba(13,13,13,.22);overflow:hidden;transform:translateY(12px) scale(.97);transition:transform .24s}
    .ov.open .modal{transform:translateY(0) scale(1)}
    .mhd{padding:18px 22px;background:linear-gradient(135deg,var(--ink-mid),var(--ink-soft));display:flex;align-items:center;justify-content:space-between}
    .mhd.ok{background:linear-gradient(135deg,#0A2E1A,#14402A)}
    .mhd-l{display:flex;align-items:center;gap:12px}
    .mhd-ico{width:40px;height:40px;border-radius:10px;background:rgba(201,168,76,.18);border:1.5px solid rgba(201,168,76,.35);display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0}
    .mhd-title{font-size:16px;font-weight:700;color:var(--gold-l);font-family:'Playfair Display',Georgia,serif}
    .mhd-sub{font-size:11.5px;color:rgba(255,255,255,.4);margin-top:2px}
    .mhd-close{background:rgba(255,255,255,.1);border:none;color:rgba(255,255,255,.6);width:28px;height:28px;border-radius:7px;cursor:pointer;font-size:13px;display:flex;align-items:center;justify-content:center}
    .mbody{padding:18px 22px;display:flex;flex-direction:column;gap:12px}
    .info-grid{display:flex;flex-direction:column;gap:8px}
    .ig-row{display:flex;justify-content:space-between;align-items:center;padding:8px 12px;background:var(--cream);border-radius:8px;font-size:13px}
    .ig-row span{color:var(--muted);font-size:11.5px;font-weight:700;text-transform:uppercase}
    .ig-row strong{font-weight:700;color:var(--ink-mid)}
    .ig-row strong.danger{color:var(--danger);font-family:'Playfair Display',Georgia,serif;font-size:15px}
    .info-note{background:var(--cream);border:1px solid var(--cream-dk);border-radius:8px;padding:10px 14px;font-size:12.5px;color:var(--muted)}
    .info-note.warn{background:var(--warn-bg);border-color:rgba(212,133,10,.25);color:var(--warn)}
    .fg{display:flex;flex-direction:column;gap:5px}
    .fg.mt{margin-top:4px}
    .two-col{display:grid;grid-template-columns:1fr 1fr;gap:12px}
    .two-col .fg.full{grid-column:1/-1}
    label{font-size:12px;font-weight:700;color:var(--ink-soft)}
    .req{color:var(--danger)}.opt{color:var(--muted);font-weight:400}
    .fc{padding:10px 12px;border:1.5px solid var(--cream-dk);border-radius:9px;font-size:13.5px;font-family:inherit;outline:none;width:100%;box-sizing:border-box;transition:border-color .18s}
    .fc:focus{border-color:var(--gold)}
    .ta{resize:none}
    .banner{border-radius:8px;padding:10px 14px;font-size:13px;font-weight:600}
    .banner.ok{background:var(--ok-bg);color:var(--ok);border:1px solid var(--ok)}
    .banner.err{background:var(--danger-bg);color:var(--danger);border:1px solid var(--danger)}
    .mfoot{padding:14px 22px;border-top:1px solid var(--cream-dk);background:var(--cream);display:flex;justify-content:flex-end;gap:10px}
    .btn-ghost{padding:8px 16px;background:#fff;border:1.5px solid var(--cream-dk);border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit;transition:all .15s}
    .btn-ghost:hover{color:var(--danger);border-color:var(--danger)}
    .btn-send{padding:8px 22px;background:linear-gradient(135deg,var(--gold-d),var(--gold));color:#fff;border:none;border-radius:8px;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit;min-width:150px;display:flex;align-items:center;justify-content:center;gap:7px}
    .btn-ok{padding:8px 22px;background:var(--ok);color:#fff;border:none;border-radius:8px;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit;min-width:150px;display:flex;align-items:center;justify-content:center;gap:7px}
    .btn-send:disabled,.btn-ok:disabled{opacity:.4;cursor:not-allowed}

    @media(max-width:900px){.kpi-grid{grid-template-columns:1fr 1fr}.filters-bar{flex-direction:column;align-items:flex-start}}
    @media(max-width:600px){.kpi-grid{grid-template-columns:1fr}.page-hd{flex-direction:column}.two-col{grid-template-columns:1fr}}
  `]
})
export class RecouvrementComponent implements OnInit {

  private svc = inject(RecouvrementService);

  dossiers    = signal<DossierRecouvrementDto[]>([]);
  loading     = signal(true);
  filtre      = signal('');
  search      = '';
  sel         = signal<Set<string>>(new Set());

  mRelance    = signal(false);
  mEncaisser  = signal(false);
  mMasse      = signal(false);
  actif       = signal<DossierRecouvrementDto | null>(null);
  envoyant    = signal(false);

  msgRelance  = '';
  montant: number | null = null;
  mode        = 'Especes';
  ref         = '';
  okMsg       = signal('');
  errMsg      = signal('');

  // ── Computed ────────────────────────────────────────────────
  retard1_30  = computed(() => this.dossiers().filter(d => d.joursRetard <= 30));
  retard31_90 = computed(() => this.dossiers().filter(d => d.joursRetard > 30));
  nbRelance2  = computed(() => this.dossiers().filter(d => d.etape === 'Relance2').length);
  totalImpayes = computed(() => this.dossiers().reduce((s, d) => s + d.montantDu, 0));
  selectionIds = computed(() => Array.from(this.sel()));

  dossiersAffiches = computed(() => {
    let list = [...this.dossiers()];
    if (this.filtre()) list = list.filter(d => d.etape === this.filtre());
    if (this.search.trim()) {
      const q = this.search.toLowerCase();
      list = list.filter(d =>
        d.locataireNom.toLowerCase().includes(q) ||
        d.produitCode.toLowerCase().includes(q) ||
        (d.proprieteLibelle || '').toLowerCase().includes(q)
      );
    }
    return list;
  });

  tousCoches = computed(() =>
    this.dossiersAffiches().length > 0 &&
    this.dossiersAffiches().every(d => this.sel().has(d.contratId))
  );

  ngOnInit() { this.charger(); }

  charger() {
    this.loading.set(true);
    this.svc.getDossiers().subscribe({
      next:  d  => { this.dossiers.set(d); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  // ── Sélection ────────────────────────────────────────────────
  coche(id: string) { return this.sel().has(id); }
  toggleCoche(id: string) {
    this.sel.update(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }
  toggleTous(e: Event) {
    const chk = (e.target as HTMLInputElement).checked;
    this.sel.set(chk ? new Set(this.dossiersAffiches().map(d => d.contratId)) : new Set());
  }

  // ── Modals ───────────────────────────────────────────────────
  ouvrirRelance(d: DossierRecouvrementDto) {
    this.actif.set(d); this.msgRelance = '';
    this.okMsg.set(''); this.errMsg.set('');
    this.mRelance.set(true);
  }
  ouvrirEncaissement(d: DossierRecouvrementDto) {
    this.actif.set(d);
    this.montant = d.montantDu; this.mode = 'Especes'; this.ref = '';
    this.okMsg.set(''); this.errMsg.set('');
    this.mEncaisser.set(true);
  }
  ouvrirRelanceMasse() {
    this.okMsg.set(''); this.errMsg.set('');
    this.mMasse.set(true);
  }

  // ── Actions backend ──────────────────────────────────────────
  confirmerRelance() {
    const d = this.actif(); if (!d) return;
    this.envoyant.set(true);
    this.svc.envoyerRelance(d.contratId, this.msgRelance).subscribe({
      next:  () => { this.envoyant.set(false); this.mRelance.set(false); this.charger(); },
      error: (e: any) => { this.envoyant.set(false); this.errMsg.set(e?.error?.message ?? 'Erreur.'); }
    });
  }

  confirmerEncaissement() {
    const d = this.actif(); if (!d || !this.montant) return;
    this.envoyant.set(true);
    this.svc.encaisser(d.contratId, { montant: this.montant, mode: this.mode, reference: this.ref }).subscribe({
      next:  () => {
        this.envoyant.set(false);
        this.okMsg.set('Paiement enregistré avec succès !');
        setTimeout(() => { this.mEncaisser.set(false); this.charger(); }, 1400);
      },
      error: (e: any) => { this.envoyant.set(false); this.errMsg.set(e?.error?.message ?? 'Erreur.'); }
    });
  }

  confirmerMasse() {
    const ids = this.selectionIds(); if (!ids.length) return;
    this.envoyant.set(true);
    this.svc.relancerMasse(ids).subscribe({
      next:  () => {
        this.envoyant.set(false);
        this.okMsg.set(`${ids.length} relance(s) envoyée(s) !`);
        this.sel.set(new Set());
        setTimeout(() => { this.mMasse.set(false); this.charger(); }, 1400);
      },
      error: (e: any) => { this.envoyant.set(false); this.errMsg.set(e?.error?.message ?? 'Erreur.'); }
    });
  }

  exportExcel() {
    this.svc.exportExcel().subscribe(blob => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'recouvrement.xlsx'; a.click();
      URL.revokeObjectURL(url);
    });
  }

  // ── Helpers ──────────────────────────────────────────────────
  lvl(j: number): string { return j <= 30 ? 'low' : j <= 90 ? 'mid' : 'high'; }

  etapeLbl(e: string): string {
    return ({Relance1:'Relance 1',Relance2:'Relance 2',Relance3:'Relance 3',Contentieux:'MED + Contentieux'} as Record<string,string>)[e] ?? e;
  }
}