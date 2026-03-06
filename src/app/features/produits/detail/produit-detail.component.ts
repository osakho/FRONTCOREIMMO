import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule, DecimalPipe, DatePipe } from '@angular/common';
import { RouterLink, ActivatedRoute }           from '@angular/router';
import { FormsModule }                          from '@angular/forms';
import { ProduitsService }                      from '../../../core/services/api.services';
import { ProduitLocatifDto }                    from '../../../core/models/models';

@Component({
  selector: 'kdi-produit-detail',
  standalone: true,
  imports: [CommonModule, DecimalPipe, DatePipe, RouterLink, FormsModule],
  template: `

<!-- ── Chargement ── -->
<div class="loading-full" *ngIf="!p()">
  <div class="spinner"></div>
</div>

<!-- ══════════════════════════════════════════════
     PAGE
══════════════════════════════════════════════ -->
<div class="page" *ngIf="p()">

  <!-- ══ HERO ══ -->
  <div class="hero" [attr.data-s]="p()!.statut">
    <div class="hero-bg"></div>

    <div class="hero-content">
      <!-- Gauche -->
      <div class="hero-left">
        <div class="hero-code">{{ p()!.code }}</div>
        <div class="hero-info">
          <div class="hero-title">{{ p()!.description }}</div>
          <div class="hero-prop">
            <span class="hero-prop-icon">🏢</span>
            {{ p()!.proprieteLibelle }}
          </div>
          <div class="hero-badges">
            <span class="type-badge" [attr.data-t]="p()!.type">
              {{ typeIcon(p()!.type) }} {{ p()!.typeLabel }}
            </span>
            <span class="statut-badge" [attr.data-s]="p()!.statut">
              {{ statutIcon(p()!.statut) }} {{ p()!.statutLabel }}
            </span>
            <span class="etage-badge" *ngIf="p()!.etage !== null">
              {{ p()!.etage === 0 ? 'RDC' : 'Étage ' + p()!.etage }}
            </span>
            <span class="surf-badge" *ngIf="p()!.surface">
              📐 {{ p()!.surface }} m²
            </span>
          </div>
        </div>
      </div>

      <!-- Droite : loyer + actions -->
      <div class="hero-right">
        <div class="loyer-card">
          <div class="lc-label">Loyer de référence</div>
          <div class="lc-amount">
            <span *ngIf="!editLoyer">{{ p()!.loyerReference | number:'1.0-0' }}</span>
            <input *ngIf="editLoyer" type="number" class="loyer-input"
                   [(ngModel)]="newLoyer" (keyup.enter)="saveLoyer()" />
            <span class="lc-cur">MRU</span>
          </div>
          <div class="lc-sub">/ mois</div>
          <div class="lc-actions" *ngIf="!editLoyer">
            <button class="btn-edit-loyer" (click)="startEditLoyer()">✏️ Modifier</button>
          </div>
          <div class="lc-actions" *ngIf="editLoyer">
            <button class="btn-save" (click)="saveLoyer()" [disabled]="savingLoyer()">
              <span *ngIf="!savingLoyer()">✓ Enregistrer</span>
              <span *ngIf="savingLoyer()" class="spin"></span>
            </button>
            <button class="btn-cancel" (click)="editLoyer=false">Annuler</button>
          </div>
        </div>

        <div class="hero-cta">
          <a *ngIf="p()!.statut==='Libre'"
             [routerLink]="['/contrats-location/nouveau']"
             [queryParams]="{produitId: p()!.id}"
             class="btn-bail">📋 Créer un bail</a>
          <a routerLink="/produits" class="btn-retour">← Retour</a>
        </div>
      </div>
    </div>
  </div>

  <!-- ══ CORPS ══ -->
  <div class="body-grid">

    <!-- ── Colonne gauche ── -->
    <div class="col-left">

      <!-- Caractéristiques -->
      <div class="card">
        <div class="card-header">
          <span class="card-icon">📋</span>
          <h3>Caractéristiques</h3>
        </div>
        <div class="specs-grid">
          <div class="spec-item">
            <div class="spec-label">Type</div>
            <div class="spec-val">
              <span class="type-badge sm" [attr.data-t]="p()!.type">
                {{ typeIcon(p()!.type) }} {{ p()!.typeLabel }}
              </span>
            </div>
          </div>
          <div class="spec-item">
            <div class="spec-label">Étage</div>
            <div class="spec-val bold">{{ p()!.etage === 0 ? 'Rez-de-chaussée' : 'Étage ' + p()!.etage }}</div>
          </div>
          <div class="spec-item">
            <div class="spec-label">Surface</div>
            <div class="spec-val bold">{{ p()!.surface ? p()!.surface + ' m²' : '—' }}</div>
          </div>
          <div class="spec-item">
            <div class="spec-label">Ajouté le</div>
            <div class="spec-val muted">{{ p()!.creeLe | date:'dd/MM/yyyy' }}</div>
          </div>
        </div>

        <!-- Équipements -->
        <div class="equip-row">
          <div class="equip" [class.on]="p()!.hasCompteurElec">
            <span class="eq-icon">⚡</span>
            <div>
              <div class="eq-lbl">Électricité</div>
              <div class="eq-val">{{ p()!.hasCompteurElec ? 'Compteur présent' : 'Pas de compteur' }}</div>
            </div>
            <span class="eq-status">{{ p()!.hasCompteurElec ? '✓' : '—' }}</span>
          </div>
          <div class="equip" [class.on]="p()!.hasCompteurEau">
            <span class="eq-icon">💧</span>
            <div>
              <div class="eq-lbl">Eau</div>
              <div class="eq-val">{{ p()!.hasCompteurEau ? 'Compteur présent' : 'Pas de compteur' }}</div>
            </div>
            <span class="eq-status">{{ p()!.hasCompteurEau ? '✓' : '—' }}</span>
          </div>
        </div>

        <!-- Notes -->
        <div class="notes-block" *ngIf="p()!.notes">
          <div class="notes-label">📝 Notes internes</div>
          <div class="notes-text">{{ p()!.notes }}</div>
        </div>
      </div>

      <!-- Propriété liée -->
      <div class="card card-prop">
        <div class="card-header">
          <span class="card-icon">🏢</span>
          <h3>Propriété</h3>
        </div>
        <div class="prop-link">
          <div class="pl-nom">{{ p()!.proprieteLibelle }}</div>
          <a [routerLink]="['/proprietes', p()!.proprieteId]" class="btn-voir-prop">
            Voir la propriété →
          </a>
        </div>
      </div>

    </div>

    <!-- ── Colonne droite ── -->
    <div class="col-right">

      <!-- Bail actuel -->
      <div class="card card-bail" *ngIf="p()!.contratActif">
        <div class="card-header">
          <span class="card-icon">🔑</span>
          <h3>Bail actuel</h3>
          <span class="bail-statut-pill">{{ p()!.contratActif!.statut }}</span>
        </div>
        <div class="bail-body">
          <div class="bail-locataire">
            <div class="bl-avatar">{{ initiales(p()!.contratActif!.locataireNom) }}</div>
            <div>
              <div class="bl-nom">{{ p()!.contratActif!.locataireNom }}</div>
              <div class="bl-num">{{ p()!.contratActif!.numero }}</div>
            </div>
          </div>
          <a [routerLink]="['/contrats-location', p()!.contratActif!.id]" class="btn-voir-bail">
            Voir le bail complet →
          </a>
        </div>
      </div>

      <!-- Pas de bail -->
      <div class="card card-libre" *ngIf="!p()!.contratActif && p()!.statut==='Libre'">
        <div class="card-header">
          <span class="card-icon">🔓</span>
          <h3>Disponible à la location</h3>
        </div>
        <div class="libre-body">
          <div class="libre-icon">🏠</div>
          <p>Ce produit est actuellement libre.<br>Vous pouvez créer un nouveau bail dès maintenant.</p>
          <a [routerLink]="['/contrats-location/nouveau']"
             [queryParams]="{produitId: p()!.id}"
             class="btn-bail-full">📋 Créer un bail</a>
        </div>
      </div>

      <!-- Statut travaux / hors service -->
      <div class="card card-warn"
           *ngIf="p()!.statut==='EnTravaux' || p()!.statut==='HorsService' || p()!.statut==='Reserve'">
        <div class="warn-icon">{{ statutIcon(p()!.statut) }}</div>
        <div class="warn-label">{{ p()!.statutLabel }}</div>
        <div class="warn-sub">Ce produit n'est pas disponible pour une location.</div>
      </div>

      <!-- Loyer historique / infos financières -->
      <div class="card card-finance">
        <div class="card-header">
          <span class="card-icon">💰</span>
          <h3>Finances</h3>
        </div>
        <div class="finance-grid">
          <div class="fg-item gold">
            <div class="fg-lbl">Loyer mensuel</div>
            <div class="fg-val">{{ p()!.loyerReference | number:'1.0-0' }} <span>MRU</span></div>
          </div>
          <div class="fg-item">
            <div class="fg-lbl">Loyer annuel estimé</div>
            <div class="fg-val">{{ p()!.loyerReference * 12 | number:'1.0-0' }} <span>MRU</span></div>
          </div>
        </div>
        <button class="btn-modifier-loyer" (click)="startEditLoyer()">
          ✏️ Modifier le loyer
        </button>
      </div>

    </div>
  </div>

</div><!-- /page -->
  `,
  styles: [`
    :host {
      --gold:    #C9A84C; --gold-l: #E8C96A; --gold-d: #8B6914;
      --ink:     #0D0D0D; --ink-mid:#1A1A2E; --ink-soft:#2D2D4A;
      --cream:   #F8F4ED; --cream-dk:#EDE8DF; --muted: #8A8899;
      --ok:      #1A7A4A; --ok-bg:  #E6F5EE;
      --warn:    #D4850A; --warn-bg:#FEF3E2;
      --danger:  #C0392B; --danger-bg:#FDECEA;
      --blue:    #1D4ED8; --blue-bg:#DBEAFE;
      --violet:  #5B21B6; --violet-bg:#F5F3FF;
      --r: 14px;
    }

    .loading-full { display:flex; align-items:center; justify-content:center; height:50vh; }
    .spinner { width:36px; height:36px; border:3px solid var(--cream-dk); border-top-color:var(--ink-mid); border-radius:50%; animation:spin .8s linear infinite; }
    @keyframes spin { to { transform:rotate(360deg); } }
    .spin { width:14px; height:14px; border:2px solid rgba(255,255,255,.3); border-top-color:#fff; border-radius:50%; animation:spin .7s linear infinite; display:inline-block; }

    .page { max-width:1100px; margin:0 auto; }

    /* ══ HERO ══ */
    .hero { border-radius:var(--r); overflow:hidden; margin-bottom:24px; position:relative; }
    .hero[data-s="Libre"]      { background:linear-gradient(135deg, #0D1B2A 0%, #1A3A2A 100%); }
    .hero[data-s="Loue"]       { background:linear-gradient(135deg, #0D1B2A 0%, #0F2A4A 100%); }
    .hero[data-s="EnTravaux"]  { background:linear-gradient(135deg, #1A1208 0%, #2A1E0A 100%); }
    .hero[data-s="Reserve"]    { background:linear-gradient(135deg, #0D0D2A 0%, #1A0A2E 100%); }
    .hero[data-s="HorsService"]{ background:linear-gradient(135deg, #1A0808 0%, #2A0D0D 100%); }
    .hero-bg {
      position:absolute; inset:0; opacity:.06;
      background-image: radial-gradient(circle at 20% 50%, var(--gold) 0%, transparent 50%),
                        radial-gradient(circle at 80% 20%, #fff 0%, transparent 40%);
      pointer-events:none;
    }
    .hero-content { position:relative; display:flex; align-items:center; justify-content:space-between; padding:32px 36px; gap:24px; flex-wrap:wrap; }

    /* Hero gauche */
    .hero-left  { display:flex; align-items:center; gap:20px; }
    .hero-code  { font-family:monospace; font-size:22px; font-weight:900; background:rgba(201,168,76,.15); border:1.5px solid rgba(201,168,76,.3); color:var(--gold-l); padding:10px 18px; border-radius:10px; letter-spacing:2px; white-space:nowrap; }
    .hero-title { font-size:22px; font-weight:800; color:#fff; margin-bottom:5px; font-family:'Playfair Display',Georgia,serif; }
    .hero-prop  { font-size:13px; color:rgba(255,255,255,.5); display:flex; align-items:center; gap:6px; margin-bottom:10px; }
    .hero-prop-icon { font-size:14px; }
    .hero-badges { display:flex; gap:8px; flex-wrap:wrap; }

    .type-badge   { display:inline-flex; align-items:center; gap:5px; padding:4px 12px; border-radius:20px; font-size:12px; font-weight:700; }
    .type-badge[data-t="Chambre"]     { background:rgba(157,23,77,.25); color:#f9a8d4; border:1px solid rgba(249,168,212,.2); }
    .type-badge[data-t="Appartement"] { background:rgba(29,78,216,.25); color:#93c5fd; border:1px solid rgba(147,197,253,.2); }
    .type-badge[data-t="Boutique"]    { background:rgba(212,133,10,.25); color:#fcd34d; border:1px solid rgba(252,211,77,.2); }
    .type-badge[data-t="Garage"]      { background:rgba(255,255,255,.1); color:rgba(255,255,255,.6); border:1px solid rgba(255,255,255,.15); }
    .type-badge.sm { font-size:11.5px; padding:3px 10px; }
    .type-badge.sm[data-t="Chambre"]     { background:#fdf2f8; color:#9d174d; border:none; }
    .type-badge.sm[data-t="Appartement"]{ background:var(--blue-bg); color:var(--blue); border:none; }
    .type-badge.sm[data-t="Boutique"]   { background:var(--warn-bg); color:var(--warn); border:none; }
    .type-badge.sm[data-t="Garage"]     { background:var(--cream-dk); color:var(--muted); border:none; }

    .statut-badge { display:inline-flex; align-items:center; gap:5px; padding:4px 12px; border-radius:20px; font-size:12px; font-weight:700; }
    .statut-badge[data-s="Libre"]      { background:rgba(26,122,74,.25); color:#6ee7b7; border:1px solid rgba(110,231,183,.2); }
    .statut-badge[data-s="Loue"]       { background:rgba(29,78,216,.25); color:#93c5fd; border:1px solid rgba(147,197,253,.2); }
    .statut-badge[data-s="EnTravaux"]  { background:rgba(212,133,10,.25); color:#fcd34d; border:1px solid rgba(252,211,77,.2); }
    .statut-badge[data-s="Reserve"]    { background:rgba(91,33,182,.25); color:#c4b5fd; border:1px solid rgba(196,181,253,.2); }
    .statut-badge[data-s="HorsService"]{ background:rgba(192,57,43,.25); color:#fca5a5; border:1px solid rgba(252,165,165,.2); }

    .etage-badge { display:inline-flex; align-items:center; padding:4px 12px; border-radius:20px; font-size:12px; font-weight:600; background:rgba(255,255,255,.1); color:rgba(255,255,255,.6); border:1px solid rgba(255,255,255,.1); }
    .surf-badge  { display:inline-flex; align-items:center; gap:5px; padding:4px 12px; border-radius:20px; font-size:12px; font-weight:600; background:rgba(255,255,255,.1); color:rgba(255,255,255,.6); border:1px solid rgba(255,255,255,.1); }

    /* Hero droite */
    .hero-right { display:flex; flex-direction:column; gap:14px; align-items:flex-end; }

    .loyer-card { background:rgba(255,255,255,.07); border:1px solid rgba(201,168,76,.2); border-radius:12px; padding:16px 22px; text-align:right; min-width:220px; backdrop-filter:blur(8px); }
    .lc-label   { font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:.8px; color:rgba(255,255,255,.4); margin-bottom:4px; }
    .lc-amount  { display:flex; align-items:baseline; gap:6px; justify-content:flex-end; }
    .lc-amount span:first-child { font-size:32px; font-weight:900; color:var(--gold-l); font-family:'Playfair Display',Georgia,serif; }
    .loyer-input { width:130px; font-size:26px; font-weight:800; color:var(--gold-l); background:rgba(255,255,255,.1); border:1.5px solid var(--gold); border-radius:8px; padding:4px 10px; text-align:right; font-family:'Playfair Display',Georgia,serif; outline:none; }
    .lc-cur     { font-size:14px; font-weight:700; color:var(--gold); }
    .lc-sub     { font-size:12px; color:rgba(255,255,255,.3); text-align:right; margin-top:2px; }
    .lc-actions { display:flex; gap:8px; justify-content:flex-end; margin-top:10px; }
    .btn-edit-loyer { padding:6px 14px; background:rgba(201,168,76,.15); border:1px solid rgba(201,168,76,.3); border-radius:7px; color:var(--gold-l); font-size:12px; font-weight:600; cursor:pointer; transition:all .15s; }
    .btn-edit-loyer:hover { background:rgba(201,168,76,.25); }
    .btn-save   { padding:6px 14px; background:var(--ok); border:none; border-radius:7px; color:#fff; font-size:12px; font-weight:700; cursor:pointer; display:flex; align-items:center; gap:6px; transition:all .15s; }
    .btn-save:disabled { opacity:.5; cursor:not-allowed; }
    .btn-cancel { padding:6px 12px; background:rgba(255,255,255,.08); border:1px solid rgba(255,255,255,.15); border-radius:7px; color:rgba(255,255,255,.5); font-size:12px; font-weight:600; cursor:pointer; }

    .hero-cta { display:flex; gap:10px; flex-wrap:wrap; justify-content:flex-end; }
    .btn-bail  { padding:10px 22px; background:linear-gradient(135deg,var(--gold-d),var(--gold)); color:#fff; border:none; border-radius:9px; font-size:13px; font-weight:700; cursor:pointer; text-decoration:none; display:inline-flex; align-items:center; gap:7px; transition:all .18s; }
    .btn-bail:hover { box-shadow:0 4px 18px rgba(201,168,76,.4); transform:translateY(-1px); }
    .btn-retour { padding:10px 18px; background:rgba(255,255,255,.08); border:1px solid rgba(255,255,255,.15); color:rgba(255,255,255,.6); border-radius:9px; font-size:13px; font-weight:600; cursor:pointer; text-decoration:none; transition:all .15s; }
    .btn-retour:hover { background:rgba(255,255,255,.14); color:#fff; }

    /* ══ CORPS ══ */
    .body-grid { display:grid; grid-template-columns:1.1fr 1fr; gap:18px; }
    .col-left,.col-right { display:flex; flex-direction:column; gap:16px; }

    /* Cards */
    .card { background:#fff; border-radius:var(--r); padding:22px 24px; box-shadow:0 2px 12px rgba(0,0,0,.07); border:1.5px solid var(--cream-dk); }
    .card-header { display:flex; align-items:center; gap:10px; margin-bottom:18px; }
    .card-icon   { font-size:18px; }
    .card-header h3 { font-size:15px; font-weight:700; color:var(--ink-mid); margin:0; flex:1; font-family:'Playfair Display',Georgia,serif; }

    /* Specs */
    .specs-grid { display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:18px; }
    .spec-item  { background:var(--cream); border-radius:9px; padding:11px 14px; }
    .spec-label { font-size:10.5px; font-weight:700; text-transform:uppercase; letter-spacing:.5px; color:var(--muted); margin-bottom:4px; }
    .spec-val   { font-size:14px; color:var(--ink-soft); }
    .spec-val.bold { font-weight:700; color:var(--ink-mid); }
    .spec-val.muted { color:var(--muted); font-size:13px; }

    /* Équipements */
    .equip-row { display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:14px; }
    .equip     { display:flex; align-items:center; gap:10px; background:var(--cream); border-radius:9px; padding:11px 14px; border:1.5px solid var(--cream-dk); transition:all .15s; }
    .equip.on  { border-color:rgba(26,122,74,.25); background:var(--ok-bg); }
    .eq-icon   { font-size:18px; flex-shrink:0; }
    .eq-lbl    { font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:.4px; color:var(--muted); }
    .eq-val    { font-size:12.5px; color:var(--ink-soft); font-weight:500; margin-top:1px; }
    .equip.on .eq-val { color:var(--ok); }
    .eq-status { margin-left:auto; font-size:15px; font-weight:800; color:var(--muted); }
    .equip.on .eq-status { color:var(--ok); }

    /* Notes */
    .notes-block { background:rgba(201,168,76,.06); border:1px solid rgba(201,168,76,.2); border-radius:9px; padding:12px 14px; }
    .notes-label { font-size:11px; font-weight:700; color:var(--gold-d); text-transform:uppercase; letter-spacing:.5px; margin-bottom:6px; }
    .notes-text  { font-size:13px; color:var(--ink-soft); line-height:1.6; }

    /* Prop card */
    .card-prop .prop-link { display:flex; align-items:center; justify-content:space-between; background:var(--cream); border-radius:9px; padding:14px 16px; }
    .pl-nom { font-size:14px; font-weight:700; color:var(--ink-mid); }
    .btn-voir-prop { font-size:12.5px; font-weight:600; color:var(--blue); text-decoration:none; padding:6px 12px; background:var(--blue-bg); border-radius:7px; transition:all .14s; }
    .btn-voir-prop:hover { background:var(--blue); color:#fff; }

    /* Bail actuel */
    .card-bail .bail-statut-pill { padding:3px 10px; border-radius:20px; background:var(--ok-bg); color:var(--ok); font-size:11px; font-weight:700; }
    .bail-body { display:flex; flex-direction:column; gap:14px; }
    .bail-locataire { display:flex; align-items:center; gap:12px; background:var(--cream); border-radius:10px; padding:14px 16px; }
    .bl-avatar { width:40px; height:40px; border-radius:10px; background:var(--ink-mid); display:flex; align-items:center; justify-content:center; font-size:14px; font-weight:800; color:var(--gold-l); flex-shrink:0; font-family:'Playfair Display',Georgia,serif; }
    .bl-nom    { font-size:14px; font-weight:700; color:var(--ink-mid); }
    .bl-num    { font-size:12px; font-family:monospace; color:var(--muted); margin-top:2px; }
    .btn-voir-bail { display:flex; align-items:center; justify-content:center; padding:10px 16px; background:var(--ink-mid); color:var(--gold-l); border-radius:9px; font-size:13px; font-weight:700; text-decoration:none; transition:all .18s; }
    .btn-voir-bail:hover { background:var(--ink-soft); box-shadow:0 4px 14px rgba(26,26,46,.2); }

    /* Libre */
    .card-libre .libre-body { text-align:center; padding:10px 0; }
    .libre-icon { font-size:36px; margin-bottom:10px; }
    .card-libre p { font-size:13px; color:var(--muted); line-height:1.6; margin:0 0 14px; }
    .btn-bail-full { display:inline-flex; align-items:center; gap:7px; padding:11px 22px; background:linear-gradient(135deg,var(--gold-d),var(--gold)); color:#fff; border:none; border-radius:9px; font-size:13px; font-weight:700; cursor:pointer; text-decoration:none; transition:all .18s; }
    .btn-bail-full:hover { box-shadow:0 4px 16px rgba(201,168,76,.35); }

    /* Warn */
    .card-warn { text-align:center; padding:28px; }
    .warn-icon  { font-size:36px; margin-bottom:10px; }
    .warn-label { font-size:16px; font-weight:700; color:var(--ink-mid); margin-bottom:6px; }
    .warn-sub   { font-size:13px; color:var(--muted); }

    /* Finances */
    .finance-grid { display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:14px; }
    .fg-item      { background:var(--cream); border-radius:9px; padding:13px 16px; border:1.5px solid var(--cream-dk); }
    .fg-item.gold { border-color:rgba(201,168,76,.3); background:rgba(201,168,76,.06); }
    .fg-lbl { font-size:10.5px; font-weight:700; text-transform:uppercase; letter-spacing:.5px; color:var(--muted); margin-bottom:5px; }
    .fg-val { font-size:20px; font-weight:800; color:var(--ink-mid); font-family:'Playfair Display',Georgia,serif; }
    .fg-val span { font-size:12px; font-weight:600; color:var(--muted); }
    .fg-item.gold .fg-val { color:var(--gold-d); }
    .btn-modifier-loyer { width:100%; padding:10px; background:var(--cream); border:1.5px solid var(--cream-dk); border-radius:9px; font-size:13px; font-weight:600; color:var(--ink-soft); cursor:pointer; transition:all .15s; font-family:inherit; }
    .btn-modifier-loyer:hover { border-color:var(--gold); color:var(--gold-d); background:rgba(201,168,76,.05); }

    @media(max-width:900px) {
      .hero-content { flex-direction:column; align-items:flex-start; }
      .hero-right   { align-items:flex-start; width:100%; }
      .loyer-card   { text-align:left; width:100%; box-sizing:border-box; }
      .lc-amount    { justify-content:flex-start; }
      .lc-actions   { justify-content:flex-start; }
      .hero-cta     { justify-content:flex-start; }
      .body-grid    { grid-template-columns:1fr; }
    }
    @media(max-width:600px) {
      .hero-left  { flex-direction:column; align-items:flex-start; gap:12px; }
      .hero-code  { font-size:18px; }
      .specs-grid, .equip-row, .finance-grid { grid-template-columns:1fr; }
    }
  `]
})
export class ProduitDetailComponent implements OnInit {

  private svc   = inject(ProduitsService);
  private route = inject(ActivatedRoute);

  p           = signal<ProduitLocatifDto | null>(null);
  savingLoyer = signal(false);
  editLoyer   = false;
  newLoyer    = 0;

  ngOnInit() {
    this.svc.getById(this.route.snapshot.params['id']).subscribe(d => {
      this.p.set(d);
      this.newLoyer = d.loyerReference;
    });
  }

  typeIcon(t: string): string {
    return ({ Chambre:'🛏', Appartement:'🏠', Boutique:'🏪', Garage:'🚗' } as Record<string,string>)[t] ?? '🏠';
  }
  statutIcon(s: string): string {
    return ({ Libre:'🔓', Loue:'🔑', EnTravaux:'🔧', Reserve:'📌', HorsService:'⛔' } as Record<string,string>)[s] ?? '?';
  }
  initiales(nom: string): string {
    return (nom || '').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  }

  startEditLoyer() { this.editLoyer = true; }

  saveLoyer() {
    const prod = this.p();
    if (!prod) return;
    this.savingLoyer.set(true);
    this.svc.updateLoyer(prod.id, this.newLoyer).subscribe({
      next: () => {
        this.p.update(p => p ? { ...p, loyerReference: this.newLoyer } : p);
        this.editLoyer = false;
        this.savingLoyer.set(false);
      },
      error: () => this.savingLoyer.set(false)
    });
  }
}