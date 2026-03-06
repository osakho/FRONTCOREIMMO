import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule, DecimalPipe, DatePipe } from '@angular/common';
import { RouterLink, ActivatedRoute }           from '@angular/router';
import { FormsModule }                          from '@angular/forms';
import { ProprietesService, PersonnelService, AuthService } from '../../../core/services/api.services';
import { ProprieteDto, PersonnelListItemDto }   from '../../../core/models/models';

@Component({
  selector: 'kdi-propriete-detail',
  standalone: true,
  imports: [CommonModule, DecimalPipe, DatePipe, RouterLink, FormsModule],
  template: `
<div class="loading-full" *ngIf="!p()"><div class="spinner"></div></div>

<div class="page" *ngIf="p()">

  <!-- ══ HERO ══ -->
  <div class="hero">
    <div class="hero-glow"></div>
    <div class="hero-top">
      <div class="hero-left">
        <div class="hero-icon">🏢</div>
        <div>
          <h1 class="hero-title">{{ p()!.libelle }}</h1>
          <div class="hero-meta">
            <span>👤 {{ p()!.proprietaireNom }}</span>
            <span class="sep">·</span>
            <span>📍 {{ p()!.adresse }}</span>
            <span *ngIf="p()!.ville" class="sep">·</span>
            <span *ngIf="p()!.ville">{{ p()!.ville }}</span>
          </div>
          <span class="gestion-pill ok"   *ngIf="p()!.aContratGestion">✅ Contrat de gestion actif</span>
          <span class="gestion-pill warn" *ngIf="!p()!.aContratGestion">⚠️ Sans contrat de gestion</span>
        </div>
      </div>
      <div class="hero-actions">
        <a [routerLink]="['/contrats-gestion']" [queryParams]="{proprieteId:p()!.id}" class="ha-btn gold">🤝 Contrat gestion</a>
        <a [routerLink]="['/produits']"          [queryParams]="{proprieteId:p()!.id}" class="ha-btn ghost">🏠 Produits</a>
        <a routerLink="/proprietes" class="ha-btn text">← Retour</a>
      </div>
    </div>
    <!-- KPIs -->
    <div class="hero-kpis">
      <div class="kpi-item">
        <div class="kpi-val">{{ p()!.nombreProduits }}</div>
        <div class="kpi-lbl">Total produits</div>
        <div class="kpi-bar" style="--pct:100%"></div>
      </div>
      <div class="kpi-sep"></div>
      <div class="kpi-item">
        <div class="kpi-val blue">{{ p()!.nombreProduitsLoues }}</div>
        <div class="kpi-lbl">Loués</div>
        <div class="kpi-bar blue" [style]="'--pct:'+pctLoues()+'%'"></div>
      </div>
      <div class="kpi-sep"></div>
      <div class="kpi-item">
        <div class="kpi-val green">{{ p()!.nombreProduitsLibres }}</div>
        <div class="kpi-lbl">Libres</div>
        <div class="kpi-bar green" [style]="'--pct:'+pctLibres()+'%'"></div>
      </div>
      <div class="kpi-sep"></div>
      <div class="kpi-item">
        <div class="kpi-val gold">{{ tauxOccupation() }}%</div>
        <div class="kpi-lbl">Taux d'occupation</div>
        <div class="kpi-bar gold" [style]="'--pct:'+tauxOccupation()+'%'"></div>
      </div>
    </div>
  </div>

  <!-- ══ CORPS ══ -->
  <div class="body-grid">

    <!-- COL GAUCHE -->
    <div class="col-l">
      <div class="card">
        <div class="card-hd"><span>📍</span><h3>Localisation</h3></div>
        <div class="loc-list">
          <div class="loc-row"><span class="ll">Adresse</span><span class="lv bold">{{ p()!.adresse }}</span></div>
          <div class="loc-row" *ngIf="p()!.quartier"><span class="ll">Quartier</span><span class="lv">{{ p()!.quartier }}</span></div>
          <div class="loc-row"><span class="ll">Ville</span><span class="lv">{{ p()!.ville }}</span></div>
          <div class="loc-row" *ngIf="p()!.zoneCode"><span class="ll">Zone</span><span class="lv"><span class="zone-tag">{{ p()!.zoneCode }}</span></span></div>
          <div class="loc-row" *ngIf="p()!.latitude && p()!.longitude">
            <span class="ll">GPS</span>
            <span class="lv mono">{{ p()!.latitude }}, {{ p()!.longitude }}</span>
          </div>
        </div>
        <div class="desc-box" *ngIf="p()!.description">
          <div class="db-lbl">📝 Description</div>
          <div class="db-txt">{{ p()!.description }}</div>
        </div>
        <a *ngIf="p()!.latitude && p()!.longitude"
           [href]="'https://maps.google.com/?q='+p()!.latitude+','+p()!.longitude"
           target="_blank" class="map-link">🗺 Voir sur la carte →</a>
      </div>

      <div class="card">
        <div class="card-hd"><span>📅</span><h3>Informations</h3></div>
        <div class="info-rows">
          <div class="info-row">
            <span class="ir-lbl">Propriétaire</span>
            <a [routerLink]="['/proprietaires', p()!.proprietaireId]" class="ir-link">{{ p()!.proprietaireNom }}</a>
          </div>
          <div class="info-row">
            <span class="ir-lbl">Enregistrée le</span>
            <span class="ir-val">{{ p()!.creeLe | date:'dd/MM/yyyy' }}</span>
          </div>
          <div class="info-row" *ngIf="!p()!.aContratGestion">
            <span class="ir-lbl">Contrat gestion</span>
            <a [routerLink]="['/contrats-gestion']"
               [queryParams]="{proprieteId:p()!.id,proprieteLibelle:p()!.libelle,proprietaireNom:p()!.proprietaireNom}"
               class="btn-creer">＋ Créer</a>
          </div>
        </div>
      </div>
    </div>

    <!-- COL DROITE -->
    <div class="col-r">
      <!-- Collecteur (direction) -->
      <div class="card" *ngIf="isDirection()">
        <div class="card-hd">
          <span>👷</span><h3>Collecteur affecté</h3>
          <button *ngIf="p()!.aContratGestion && !showForm()" class="btn-sm-out" (click)="showForm.set(true)">
            {{ p()!.collecteurActuel ? '🔄 Changer' : '＋ Affecter' }}
          </button>
          <button *ngIf="showForm()" class="btn-sm-ghost" (click)="showForm.set(false)">✕</button>
        </div>
        <div class="alert-warn" *ngIf="!p()!.aContratGestion">⚠ Contrat de gestion requis avant d'affecter un collecteur.</div>
        <div class="coll-card" *ngIf="p()!.collecteurActuel && !showForm()">
          <div class="coll-av">{{ initiales(p()!.collecteurActuel!.collecteurNom) }}</div>
          <div class="coll-info">
            <div class="coll-nom">{{ p()!.collecteurActuel!.collecteurNom }}</div>
            <div class="coll-since">Depuis le {{ p()!.collecteurActuel!.dateDebut | date:'dd/MM/yyyy' }}</div>
          </div>
          <span class="coll-badge">✓ Actif</span>
        </div>
        <div class="coll-empty" *ngIf="!p()!.collecteurActuel && !showForm() && p()!.aContratGestion">
          <div class="ce-ico">👷</div>
          <div>Aucun collecteur affecté</div>
          <button class="btn-affecter" (click)="showForm.set(true)">Affecter maintenant →</button>
        </div>
        <div class="aff-form" *ngIf="showForm()">
          <div class="alert-info" *ngIf="p()!.collecteurActuel">ℹ <strong>{{ p()!.collecteurActuel!.collecteurNom }}</strong> sera automatiquement clôturé.</div>
          <div class="fg">
            <label>Collecteur <span class="req">*</span></label>
            <select class="fc" [(ngModel)]="affectation.collecteurId">
              <option value="">— Sélectionner —</option>
              <option *ngFor="let c of collecteurs()" [value]="c.id">{{ c.nomComplet }}</option>
            </select>
          </div>
          <div class="aff-foot">
            <button class="btn-confirmer" [disabled]="!affectation.collecteurId||saving()" (click)="confirmerAffectation()">
              <span *ngIf="!saving()">✔ Confirmer</span>
              <span *ngIf="saving()" class="spin"></span>
            </button>
          </div>
        </div>
      </div>

      <!-- Donut -->
      <div class="card card-donut">
        <div class="card-hd"><span>📊</span><h3>Taux d'occupation</h3></div>
        <div class="donut-wrap">
          <svg viewBox="0 0 80 80" class="donut-svg">
            <circle cx="40" cy="40" r="32" fill="none" stroke="#EDE8DF" stroke-width="9"/>
            <circle cx="40" cy="40" r="32" fill="none"
                    stroke="#C9A84C" stroke-width="9"
                    [attr.stroke-dasharray]="donutDash()+' 201'"
                    stroke-dashoffset="50"
                    stroke-linecap="round"
                    transform="rotate(-90 40 40)"/>
          </svg>
          <div class="donut-center">
            <div class="donut-pct">{{ tauxOccupation() }}<span>%</span></div>
            <div class="donut-sub">Occupé</div>
          </div>
        </div>
        <div class="donut-legend">
          <div class="dl blue"><span class="dot"></span>{{ p()!.nombreProduitsLoues }} loués</div>
          <div class="dl green"><span class="dot"></span>{{ p()!.nombreProduitsLibres }} libres</div>
        </div>
      </div>
    </div>
  </div>

  <!-- ══ PRODUITS ══ -->
  <div class="produits-section">
    <div class="ps-hd">
      <div class="psh-l"><span>🏠</span><h3>Produits locatifs</h3><span class="ps-badge">{{ p()!.produits.length||0 }}</span></div>
      <a [routerLink]="['/produits']" [queryParams]="{proprieteId:p()!.id}" class="btn-voir-all">Voir tous →</a>
    </div>

    <div class="prod-empty" *ngIf="!p()!.produits.length">
      <div class="pe-ico">🏠</div>
      <div class="pe-title">Aucun produit locatif</div>
      <div class="pe-sub">Ajoutez des unités à cette propriété</div>
      <a [routerLink]="['/produits/nouveau']" [queryParams]="{proprieteId:p()!.id}" class="btn-add-prod">＋ Ajouter un produit</a>
    </div>

    <div class="prod-grid" *ngIf="p()!.produits.length">
      <div *ngFor="let prod of p()!.produits" class="prod-card" [attr.data-s]="prod.statutLabel">
        <div class="pc-l">
          <span class="pc-code">{{ prod.code }}</span>
          <span class="pc-ico">{{ typeIcon(prod.typeLabel) }}</span>
          <div>
            <div class="pc-type">{{ prod.typeLabel }}</div>
            <div class="pc-loyer">{{ prod.loyerReference | number:'1.0-0' }} <span>MRU/mois</span></div>
          </div>
        </div>
        <div class="pc-r">
          <span class="pc-st" [attr.data-s]="prod.statutLabel">{{ statutLabel(prod.statutLabel) }}</span>
          <a [routerLink]="['/produits', prod.id]" class="pc-eye">👁</a>
        </div>
      </div>
    </div>
  </div>

</div>
  `,
  styles: [`
    :host{--gold:#C9A84C;--gold-l:#E8C96A;--gold-d:#8B6914;--ink:#0D0D0D;--ink-mid:#1A1A2E;--ink-soft:#2D2D4A;--cream:#F8F4ED;--cream-dk:#EDE8DF;--muted:#8A8899;--ok:#1A7A4A;--ok-bg:#E6F5EE;--warn:#D4850A;--warn-bg:#FEF3E2;--danger:#C0392B;--blue:#1D4ED8;--blue-bg:#DBEAFE;--r:14px}
    .loading-full{display:flex;align-items:center;justify-content:center;height:50vh}
    .spinner{width:36px;height:36px;border:3px solid var(--cream-dk);border-top-color:var(--ink-mid);border-radius:50%;animation:spin .8s linear infinite}
    @keyframes spin{to{transform:rotate(360deg)}}
    .spin{width:14px;height:14px;border:2px solid rgba(255,255,255,.3);border-top-color:#fff;border-radius:50%;animation:spin .7s linear infinite;display:inline-block}
    .page{max-width:1100px;margin:0 auto}

    /* HERO */
    .hero{background:linear-gradient(135deg,#0D1B2A 0%,#14251A 60%,#0A1A2A 100%);border-radius:var(--r);overflow:hidden;margin-bottom:22px;position:relative}
    .hero-glow{position:absolute;inset:0;pointer-events:none;background:radial-gradient(ellipse at 15% 40%,rgba(201,168,76,.1) 0%,transparent 55%),radial-gradient(ellipse at 85% 60%,rgba(26,122,74,.07) 0%,transparent 45%)}
    .hero-top{position:relative;display:flex;align-items:flex-start;justify-content:space-between;padding:28px 32px 20px;gap:20px;flex-wrap:wrap}
    .hero-left{display:flex;align-items:flex-start;gap:16px;flex:1}
    .hero-icon{width:52px;height:52px;border-radius:13px;background:rgba(201,168,76,.15);border:1.5px solid rgba(201,168,76,.3);display:flex;align-items:center;justify-content:center;font-size:22px;flex-shrink:0;margin-top:2px}
    .hero-title{font-size:24px;font-weight:800;color:#fff;margin:0 0 6px;font-family:'Playfair Display',Georgia,serif}
    .hero-meta{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:10px;font-size:12.5px;color:rgba(255,255,255,.5)}
    .sep{color:rgba(255,255,255,.2)}
    .gestion-pill{display:inline-flex;align-items:center;gap:6px;padding:4px 12px;border-radius:20px;font-size:12px;font-weight:700}
    .gestion-pill.ok{background:rgba(26,122,74,.25);color:#6ee7b7;border:1px solid rgba(110,231,183,.2)}
    .gestion-pill.warn{background:rgba(212,133,10,.25);color:#fcd34d;border:1px solid rgba(252,211,77,.2)}
    .hero-actions{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
    .ha-btn{padding:9px 18px;border-radius:9px;font-size:13px;font-weight:700;cursor:pointer;text-decoration:none;display:inline-flex;align-items:center;gap:6px;transition:all .18s;font-family:inherit}
    .ha-btn.gold{background:linear-gradient(135deg,var(--gold-d),var(--gold));color:#fff;border:none}
    .ha-btn.gold:hover{box-shadow:0 4px 16px rgba(201,168,76,.4)}
    .ha-btn.ghost{background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.15);color:rgba(255,255,255,.7)}
    .ha-btn.ghost:hover{background:rgba(255,255,255,.14);color:#fff}
    .ha-btn.text{background:transparent;border:none;color:rgba(255,255,255,.4);font-weight:600}
    .ha-btn.text:hover{color:rgba(255,255,255,.7)}
    .hero-kpis{position:relative;display:grid;grid-template-columns:1fr 16px 1fr 16px 1fr 16px 1fr;align-items:center;padding:14px 32px 22px}
    .kpi-item{text-align:center}
    .kpi-val{font-size:28px;font-weight:900;color:rgba(255,255,255,.9);font-family:'Playfair Display',Georgia,serif}
    .kpi-val.blue{color:#93c5fd}.kpi-val.green{color:#6ee7b7}.kpi-val.gold{color:var(--gold-l)}
    .kpi-lbl{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.7px;color:rgba(255,255,255,.3);margin:3px 0 8px}
    .kpi-bar{height:3px;background:rgba(255,255,255,.1);border-radius:3px;margin:0 auto;width:60%;overflow:hidden;position:relative}
    .kpi-bar::after{content:'';position:absolute;inset-block:0;left:0;width:var(--pct,0%);background:rgba(255,255,255,.3);border-radius:3px}
    .kpi-bar.blue::after{background:#93c5fd}.kpi-bar.green::after{background:#6ee7b7}.kpi-bar.gold::after{background:var(--gold)}
    .kpi-sep{width:1px;height:40px;background:rgba(255,255,255,.1);margin:0 auto}

    /* BODY */
    .body-grid{display:grid;grid-template-columns:1.15fr 1fr;gap:18px;margin-bottom:22px}
    .col-l,.col-r{display:flex;flex-direction:column;gap:16px}
    .card{background:#fff;border-radius:var(--r);padding:22px 24px;box-shadow:0 2px 12px rgba(0,0,0,.07);border:1.5px solid var(--cream-dk)}
    .card-hd{display:flex;align-items:center;gap:10px;margin-bottom:18px}
    .card-hd span{font-size:17px}
    .card-hd h3{font-size:14.5px;font-weight:700;color:var(--ink-mid);margin:0;flex:1;font-family:'Playfair Display',Georgia,serif}
    .loc-list{display:flex;flex-direction:column;margin-bottom:14px}
    .loc-row{display:flex;align-items:baseline;padding:8px 0;border-bottom:1px solid var(--cream-dk)}
    .loc-row:last-child{border:none}
    .ll{width:80px;font-size:11.5px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.4px;flex-shrink:0}
    .lv{font-size:13.5px;color:var(--ink-soft);flex:1}
    .lv.bold{font-weight:700;color:var(--ink-mid)}
    .lv.mono{font-family:monospace;font-size:12px}
    .zone-tag{display:inline-flex;padding:2px 9px;border-radius:6px;background:var(--blue-bg);color:var(--blue);font-size:11.5px;font-weight:700}
    .desc-box{background:rgba(201,168,76,.06);border:1px solid rgba(201,168,76,.2);border-radius:9px;padding:11px 14px;margin-bottom:12px}
    .db-lbl{font-size:11px;font-weight:700;color:var(--gold-d);text-transform:uppercase;letter-spacing:.5px;margin-bottom:5px}
    .db-txt{font-size:13px;color:var(--ink-soft);line-height:1.6}
    .map-link{display:inline-flex;align-items:center;gap:6px;font-size:12.5px;font-weight:600;color:var(--blue);text-decoration:none;padding:6px 12px;background:var(--blue-bg);border-radius:7px;transition:all .14s}
    .map-link:hover{background:var(--blue);color:#fff}
    .info-rows{display:flex;flex-direction:column;gap:10px}
    .info-row{display:flex;align-items:center;justify-content:space-between;padding:9px 12px;background:var(--cream);border-radius:8px}
    .ir-lbl{font-size:11.5px;font-weight:700;text-transform:uppercase;letter-spacing:.4px;color:var(--muted)}
    .ir-val{font-size:13.5px;font-weight:600;color:var(--ink-mid)}
    .ir-link{font-size:13.5px;font-weight:700;color:var(--blue);text-decoration:none}
    .ir-link:hover{text-decoration:underline}
    .btn-creer{display:inline-flex;align-items:center;gap:5px;padding:5px 12px;background:linear-gradient(135deg,var(--gold-d),var(--gold));color:#fff;border-radius:7px;font-size:12px;font-weight:700;text-decoration:none;transition:all .15s}
    .btn-creer:hover{box-shadow:0 3px 10px rgba(201,168,76,.35)}

    /* COLLECTEUR */
    .btn-sm-out{padding:5px 12px;background:var(--cream);border:1.5px solid var(--cream-dk);border-radius:7px;font-size:12px;font-weight:600;color:var(--ink-soft);cursor:pointer;transition:all .14s;font-family:inherit}
    .btn-sm-out:hover{border-color:var(--ink-mid)}
    .btn-sm-ghost{padding:5px 10px;background:none;border:none;color:var(--muted);cursor:pointer;font-size:13px}
    .alert-warn{background:var(--warn-bg);border:1px solid rgba(212,133,10,.25);border-radius:8px;padding:10px 14px;font-size:13px;color:var(--warn);margin-bottom:10px}
    .alert-info{background:var(--blue-bg);border:1px solid rgba(29,78,216,.2);border-radius:8px;padding:10px 14px;font-size:12.5px;color:var(--blue);margin-bottom:12px}
    .coll-card{display:flex;align-items:center;gap:12px;background:var(--ok-bg);border:1.5px solid rgba(26,122,74,.2);border-radius:10px;padding:14px 16px}
    .coll-av{width:40px;height:40px;border-radius:10px;background:var(--ink-mid);color:var(--gold-l);font-weight:800;font-size:14px;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-family:'Playfair Display',Georgia,serif}
    .coll-info{flex:1}
    .coll-nom{font-size:14px;font-weight:700;color:var(--ink-mid)}
    .coll-since{font-size:12px;color:var(--muted);margin-top:2px}
    .coll-badge{padding:3px 10px;background:var(--ok-bg);border:1px solid rgba(26,122,74,.3);border-radius:20px;font-size:11px;font-weight:700;color:var(--ok)}
    .coll-empty{text-align:center;padding:16px;color:var(--muted);font-size:13px}
    .ce-ico{font-size:28px;margin-bottom:8px}
    .btn-affecter{background:none;border:none;cursor:pointer;font-size:12.5px;font-weight:600;color:var(--blue);text-decoration:underline;margin-top:8px;display:block;margin:8px auto 0}
    .fg{display:flex;flex-direction:column;gap:5px;margin-bottom:12px}
    label{font-size:12px;font-weight:700;color:var(--ink-soft)}
    .req{color:var(--danger)}
    .fc{padding:10px 12px;border:1.5px solid var(--cream-dk);border-radius:9px;font-size:13px;font-family:inherit;outline:none;transition:border-color .18s;background:#fff;width:100%;box-sizing:border-box}
    .fc:focus{border-color:var(--gold);box-shadow:0 0 0 3px rgba(201,168,76,.1)}
    .aff-form{padding-top:4px}
    .aff-foot{display:flex;justify-content:flex-end;margin-top:12px}
    .btn-confirmer{padding:9px 20px;background:var(--ink-mid);color:var(--gold-l);border:none;border-radius:9px;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit;display:flex;align-items:center;justify-content:center;gap:7px;min-width:140px;transition:all .18s}
    .btn-confirmer:disabled{opacity:.4;cursor:not-allowed}

    /* DONUT */
    .card-donut{display:flex;flex-direction:column;align-items:center}
    .donut-wrap{position:relative;width:140px;height:140px;margin:8px 0 14px}
    .donut-svg{width:100%;height:100%}
    .donut-center{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center}
    .donut-pct{font-size:26px;font-weight:900;color:var(--gold-d);font-family:'Playfair Display',Georgia,serif;line-height:1}
    .donut-pct span{font-size:14px}
    .donut-sub{font-size:10.5px;font-weight:700;text-transform:uppercase;letter-spacing:.6px;color:var(--muted);margin-top:2px}
    .donut-legend{display:flex;gap:18px}
    .dl{display:flex;align-items:center;gap:6px;font-size:12.5px;font-weight:600;color:var(--muted)}
    .dl .dot{width:8px;height:8px;border-radius:50%;background:currentColor}
    .dl.blue{color:var(--blue)}.dl.green{color:var(--ok)}

    /* PRODUITS */
    .produits-section{}
    .ps-hd{display:flex;align-items:center;justify-content:space-between;margin-bottom:14px}
    .psh-l{display:flex;align-items:center;gap:10px}
    .psh-l span{font-size:18px}
    .psh-l h3{font-size:17px;font-weight:800;color:var(--ink-mid);margin:0;font-family:'Playfair Display',Georgia,serif}
    .ps-badge{display:inline-flex;width:26px;height:26px;border-radius:50%;background:var(--ink-mid);color:var(--gold-l);font-size:12px;font-weight:700;align-items:center;justify-content:center}
    .btn-voir-all{font-size:13px;font-weight:600;color:var(--blue);text-decoration:none;padding:7px 14px;background:var(--blue-bg);border-radius:8px;transition:all .14s}
    .btn-voir-all:hover{background:var(--blue);color:#fff}
    .prod-empty{text-align:center;padding:48px 20px;background:#fff;border-radius:var(--r);box-shadow:0 2px 10px rgba(0,0,0,.06);border:1.5px dashed var(--cream-dk)}
    .pe-ico{font-size:40px;margin-bottom:10px}
    .pe-title{font-size:16px;font-weight:700;color:var(--ink-mid);margin-bottom:5px}
    .pe-sub{font-size:13px;color:var(--muted);margin-bottom:14px}
    .btn-add-prod{display:inline-flex;align-items:center;gap:6px;padding:10px 20px;background:var(--ink-mid);color:var(--gold-l);border:none;border-radius:9px;font-size:13px;font-weight:700;text-decoration:none;cursor:pointer;transition:all .18s}
    .btn-add-prod:hover{background:var(--ink-soft)}
    .prod-grid{display:flex;flex-direction:column;gap:8px}
    .prod-card{background:#fff;border-radius:10px;padding:13px 18px;display:flex;align-items:center;justify-content:space-between;box-shadow:0 1px 6px rgba(0,0,0,.06);border:1.5px solid var(--cream-dk);border-left:4px solid var(--cream-dk);transition:all .15s}
    .prod-card:hover{border-color:rgba(201,168,76,.3);border-left-color:var(--gold);box-shadow:0 3px 12px rgba(0,0,0,.1)}
    .prod-card[data-s="Libre"]{border-left-color:var(--ok)}
    .prod-card[data-s="Loue"]{border-left-color:var(--blue)}
    .prod-card[data-s="EnTravaux"]{border-left-color:var(--warn)}
    .prod-card[data-s="Reserve"]{border-left-color:#5B21B6}
    .pc-l{display:flex;align-items:center;gap:14px}
    .pc-code{font-family:monospace;font-weight:800;font-size:13px;background:var(--cream);padding:4px 10px;border-radius:7px;color:var(--ink-mid);white-space:nowrap}
    .pc-ico{font-size:20px;flex-shrink:0}
    .pc-type{font-size:11.5px;color:var(--muted);font-weight:600;text-transform:uppercase;letter-spacing:.4px}
    .pc-loyer{font-size:14px;font-weight:700;color:var(--ink-mid);margin-top:1px}
    .pc-loyer span{font-size:11px;font-weight:400;color:var(--muted)}
    .pc-r{display:flex;align-items:center;gap:10px}
    .pc-st{display:inline-flex;padding:4px 12px;border-radius:20px;font-size:11.5px;font-weight:700}
    .pc-st[data-s="Libre"]{background:var(--ok-bg);color:var(--ok)}
    .pc-st[data-s="Loue"]{background:var(--blue-bg);color:var(--blue)}
    .pc-st[data-s="EnTravaux"]{background:var(--warn-bg);color:var(--warn)}
    .pc-st[data-s="Reserve"]{background:#F5F3FF;color:#5B21B6}
    .pc-eye{width:32px;height:32px;border-radius:8px;background:var(--cream);border:none;display:flex;align-items:center;justify-content:center;font-size:15px;text-decoration:none;cursor:pointer;transition:all .14s}
    .pc-eye:hover{background:var(--ink-mid)}

    @media(max-width:900px){.body-grid{grid-template-columns:1fr}.hero-kpis{grid-template-columns:1fr 1fr;gap:12px}.kpi-sep{display:none}}
    @media(max-width:600px){.hero-top{flex-direction:column}.hero-kpis{grid-template-columns:1fr 1fr}}
  `]
})
export class ProprieteDetailComponent implements OnInit {

  private svc          = inject(ProprietesService);
  private personnelSvc = inject(PersonnelService);
  private auth         = inject(AuthService);
  private route        = inject(ActivatedRoute);

  p           = signal<ProprieteDto | null>(null);
  collecteurs = signal<PersonnelListItemDto[]>([]);
  saving      = signal(false);
  showForm    = signal(false);
  affectation = { collecteurId: '' };

  ngOnInit() { this.loadPropriete(); this.loadCollecteurs(); }

  loadPropriete() {
    this.svc.getById(this.route.snapshot.params['id']).subscribe(d => this.p.set(d));
  }
  loadCollecteurs() {
    this.personnelSvc.getAll(1).subscribe(r => {
      this.collecteurs.set(r.items.filter(p => p.typeLabel === 'Collecteur' && p.estActif));
    });
  }
  confirmerAffectation() {
    const prop = this.p(); if (!prop || !this.affectation.collecteurId) return;
    this.saving.set(true);
    this.svc.affecterCollecteur(prop.id, this.affectation.collecteurId).subscribe({
      next: () => { this.saving.set(false); this.showForm.set(false); this.affectation.collecteurId = ''; this.loadPropriete(); },
      error: (err: any) => { this.saving.set(false); alert(err?.error?.message ?? "Erreur lors de l'affectation"); }
    });
  }

  tauxOccupation(): number {
    const p = this.p(); if (!p || p.nombreProduits === 0) return 0;
    return Math.round(p.nombreProduitsLoues / p.nombreProduits * 100);
  }
  pctLoues():  number { const p = this.p(); return p && p.nombreProduits ? Math.round(p.nombreProduitsLoues  / p.nombreProduits * 100) : 0; }
  pctLibres(): number { const p = this.p(); return p && p.nombreProduits ? Math.round(p.nombreProduitsLibres / p.nombreProduits * 100) : 0; }
  donutDash(): number { return Math.round(this.tauxOccupation() / 100 * 201); }

  typeIcon(t: string): string    { return ({ Chambre:'🛏', Appartement:'🏠', Boutique:'🏪', Garage:'🚗' } as Record<string,string>)[t] ?? '🏠'; }
  statutLabel(s: string): string { return ({ Libre:'Libre', Loue:'Loué', EnTravaux:'En travaux', Reserve:'Réservé', HorsService:'Hors service' } as Record<string,string>)[s] ?? s; }
  initiales(nom: string): string { return (nom || '').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2); }
  isDirection(): boolean         { return this.auth.isDirection(); }
}