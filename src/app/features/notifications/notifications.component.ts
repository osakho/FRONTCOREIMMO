// ══════════════════════════════════════════════════════════════════════════════
//  PAGE NOTIFICATIONS
//  Envoi groupé + historique des notifications Email · SMS · WhatsApp
// ══════════════════════════════════════════════════════════════════════════════

import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

import {
  NotificationService,
  ProprietairesService,
  LocatairesService,
} from '../../core/services/api.services';
import type {
  HistoriqueNotificationDto,
  CanalNotification,
  TypeNotification,
} from '../../core/models/models';
import { NotificationModalComponent, NotificationModalConfig } from '../../shared/components/notification-modal.component';

// ── Config visuelle ────────────────────────────────────────────────────────────
const TYPE_LABELS: Record<TypeNotification, { lbl: string; ico: string; pour: 'locataire'|'proprietaire'|'tous' }> = {
  // ── Locataires ──────────────────────────────────────────────────────────
  QuittanceLoyer:      { lbl: 'Quittance de loyer',           ico: '🧾', pour: 'locataire'    },
  RelancePaiement:     { lbl: 'Relance loyer impayé',         ico: '⚠️', pour: 'locataire'    },
  AvisEcheance:        { lbl: "Avis d'échéance",              ico: '📅', pour: 'locataire'    },
  ConfirmationEntree:  { lbl: 'Confirmation entrée dans les lieux', ico: '🏠', pour: 'locataire' },
  // ── Propriétaires ───────────────────────────────────────────────────────
  AvisVersement:       { lbl: 'Avis de versement',            ico: '💳', pour: 'proprietaire' },
  BordereauVersement:  { lbl: 'Bordereau / preuve de versement', ico: '💸', pour: 'proprietaire' },
  ReleveCompte:        { lbl: 'Relevé de compte mensuel',     ico: '📊', pour: 'proprietaire' },
  DevisAValider:       { lbl: 'Devis travaux à valider',      ico: '📋', pour: 'proprietaire' },
  AvancementChantier:  { lbl: 'Avancement de chantier',       ico: '🔧', pour: 'proprietaire' },
  AvisImpot:           { lbl: 'Avis impôt / taxe foncière',   ico: '🏛', pour: 'proprietaire' },
  RelanceProprietaire: { lbl: 'Relance propriétaire',         ico: '📩', pour: 'proprietaire' },
  // ── Commun ──────────────────────────────────────────────────────────────
  MessageLibre:        { lbl: 'Message libre',                ico: '✉️', pour: 'tous'         },
};

@Component({
  selector: 'kdi-notifications',
  standalone: true,
  imports: [CommonModule, FormsModule, NotificationModalComponent],
  template: `
<div class="notif-root page-enter">

  <!-- ══ HEADER ══ -->
  <div class="page-header">
    <div>
      <div class="page-eyebrow">Communication</div>
      <div class="page-title"><span class="mi">notifications</span> Notifications</div>
      <div class="page-subtitle">Envoi Email · SMS · WhatsApp — locataires et propriétaires</div>
    </div>
    <div class="notif-header-actions">
      <button class="btn btn-secondary" (click)="activeTab='historique'">
        <span class="mi">history</span> Historique
      </button>
      <button class="btn btn-gold" (click)="ouvrirEnvoiGroupe()">
        <span class="mi">send</span> Envoi groupé
      </button>
    </div>
  </div>

  <!-- ══ TABS ══ -->
  <div class="notif-tabs">
    <button class="ntab" [class.active]="activeTab==='envoyer'" (click)="activeTab='envoyer'">
      📤 Envoyer
    </button>
    <button class="ntab" [class.active]="activeTab==='historique'" (click)="activeTab='historique'; chargerHistorique()">
      📋 Historique
      <span class="ntab-count" *ngIf="histTotal() > 0">{{ histTotal() }}</span>
    </button>
    <button class="ntab" [class.active]="activeTab==='stats'" (click)="activeTab='stats'">
      📊 Statistiques
    </button>
  </div>

  <!-- ══ ONGLET ENVOYER ══ -->
  <div *ngIf="activeTab==='envoyer'" class="notif-content">

    <!-- Sélection du type -->
    <div class="notif-card">
      <div class="notif-card-head">
        <span class="mi" style="color:#c9a84c">tune</span> Configurer la notification
      </div>
      <div class="notif-card-body">

        <div class="nf-row">
          <div class="nf-group">
            <label class="nf-label">Destinataires</label>
            <select class="nf-sel" [ngModel]="typeDestinataire()" (ngModelChange)="typeDestinataire.set($event); onTypeDestChange()">
              <option value="Locataire">👤 Locataires</option>
              <option value="Proprietaire">🏠 Propriétaires</option>
            </select>
          </div>
          <div class="nf-group">
            <label class="nf-label">Type de notification</label>
            <select class="nf-sel" [ngModel]="typeNotification()" (ngModelChange)="typeNotification.set($event)">
              <option *ngFor="let t of typesDisponibles()" [value]="t.val">
                {{ t.ico }} {{ t.lbl }}
              </option>
            </select>
          </div>
        </div>

        <!-- Canaux -->
        <div class="nf-group">
          <label class="nf-label">Canaux d'envoi</label>
          <div class="nf-canaux">
            <label class="nf-canal" [class.active-sms]="canalSms" (click)="canalSms=!canalSms">
              <span class="nf-canal-ico">💬</span> SMS
              <span class="nf-check" *ngIf="canalSms">✓</span>
            </label>
            <label class="nf-canal" [class.active-wa]="canalWa" (click)="canalWa=!canalWa">
              <span class="nf-canal-ico">📱</span> WhatsApp
              <span class="nf-check" *ngIf="canalWa">✓</span>
            </label>
            <label class="nf-canal" [class.active-email]="canalEmail" (click)="canalEmail=!canalEmail">
              <span class="nf-canal-ico">📧</span> Email
              <span class="nf-check" *ngIf="canalEmail">✓</span>
            </label>
          </div>
        </div>

      </div>
    </div>

    <!-- Sélection destinataire individuel -->
    <div class="notif-card">
      <div class="notif-card-head">
        <span class="mi" style="color:#c9a84c">person</span> Choisir un destinataire
        <span class="notif-card-sub">ou utilisez l'envoi groupé pour plusieurs</span>
      </div>
      <div class="notif-card-body">
        <div class="nf-row">
          <div class="nf-group" style="flex:1">
            <input class="nf-input" type="text" [ngModel]="recherche()" (ngModelChange)="recherche.set($event)"
                   placeholder="Rechercher par nom ou téléphone…">
          </div>
        </div>

        <!-- Liste destinataires filtrés -->
        <div class="nf-dest-list" *ngIf="destinatairesFiltres().length">
          <div class="nf-dest-item" *ngFor="let d of destinatairesFiltres().slice(0,8)"
               (click)="selectionnerEtOuvrir(d)">
            <div class="nf-dest-av">{{ d.ini }}</div>
            <div class="nf-dest-info">
              <div class="nf-dest-nom">{{ d.nom }}</div>
              <div class="nf-dest-coords">
                <span *ngIf="d.tel">📱 {{ d.tel }}</span>
                <span *ngIf="d.email">📧 {{ d.email }}</span>
              </div>
            </div>
            <button class="nf-dest-btn">
              <span class="mi" style="font-size:16px">send</span>
            </button>
          </div>
          <div class="nf-dest-more" *ngIf="destinatairesFiltres().length > 8">
            + {{ destinatairesFiltres().length - 8 }} résultat(s) — affinez la recherche
          </div>
        </div>

        <div class="nf-empty" *ngIf="recherche() && !destinatairesFiltres().length">
          Aucun résultat pour "{{ recherche() }}"
        </div>
        <div class="nf-empty" *ngIf="!recherche()">
          Tapez un nom pour rechercher un destinataire
        </div>
      </div>
    </div>

    <!-- Envoi groupé -->
    <div class="notif-card notif-card-masse">
      <div class="notif-card-head">
        <span class="mi" style="color:#7c3aed">group</span> Envoi groupé
        <span class="notif-card-sub">À tous les {{ typeDestinataire() === 'Locataire' ? 'locataires' : 'propriétaires' }}</span>
      </div>
      <div class="notif-card-body">
        <div class="nf-group">
          <label class="nf-label">Message (optionnel — sinon template automatique)</label>
          <textarea class="nf-textarea" [(ngModel)]="messageMasse" rows="3"
                    placeholder="Laissez vide pour utiliser le template automatique selon le type de notification…"></textarea>
        </div>
        <div class="nf-masse-footer">
          <div class="nf-masse-info">
            <span *ngIf="!canauxActifs().length" class="nf-warn">⚠ Sélectionnez au moins un canal</span>
            <span *ngIf="canauxActifs().length">
              Envoi via <b>{{ canauxLabel() }}</b> à tous les {{ typeDestinataire() === 'Locataire' ? 'locataires' : 'propriétaires' }}
            </span>
          </div>
          <button class="btn btn-gold"
                  [disabled]="canauxActifs().length === 0 || envoiMasse()"
                  (click)="envoyerGroupe()">
            <span *ngIf="!envoiMasse()">📤 Envoyer à tous</span>
            <span *ngIf="envoiMasse()">⏳ Envoi en cours…</span>
          </button>
        </div>

        <div class="nf-masse-result" *ngIf="resultatMasse()">
          ✅ {{ resultatMasse()!.nbEnvoyes }} envoi(s) réussi(s)
          <span *ngIf="resultatMasse()!.nbEchecs > 0" class="nf-echecs">
            · ⚠ {{ resultatMasse()!.nbEchecs }} échec(s)
          </span>
        </div>
      </div>
    </div>

  </div>

  <!-- ══ ONGLET HISTORIQUE ══ -->
  <div *ngIf="activeTab==='historique'" class="notif-content">

    <!-- Filtres historique -->
    <div class="notif-card">
      <div class="notif-card-body" style="flex-direction:row;align-items:center;flex-wrap:wrap;gap:10px">
        <select class="nf-sel" [(ngModel)]="histFiltreCanal" (change)="chargerHistorique()">
          <option value="">Tous les canaux</option>
          <option value="email">📧 Email</option>
          <option value="sms">💬 SMS</option>
          <option value="whatsapp">📱 WhatsApp</option>
        </select>
        <select class="nf-sel" [(ngModel)]="histFiltreType" (change)="chargerHistorique()">
          <option value="">Tous les types</option>
          <option *ngFor="let t of tousTypes()" [value]="t.val">{{ t.ico }} {{ t.lbl }}</option>
        </select>
        <input type="date" class="nf-input" style="width:140px" [(ngModel)]="histFiltreDebut" (change)="chargerHistorique()">
        <span style="color:#6a8aaa;font-size:11px">→</span>
        <input type="date" class="nf-input" style="width:140px" [(ngModel)]="histFiltreFin" (change)="chargerHistorique()">
        <div style="margin-left:auto;font-size:11px;color:#6a8aaa">
          {{ historique().length }} notification(s)
        </div>
      </div>
    </div>

    <!-- Loading -->
    <div class="notif-loading" *ngIf="histLoading()">
      <div class="notif-spinner"></div> Chargement de l'historique…
    </div>

    <!-- Table historique -->
    <div class="notif-card" *ngIf="!histLoading()">
      <div class="notif-table-wrap">
        <table class="notif-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Destinataire</th>
              <th>Type</th>
              <th>Canaux</th>
              <th>Statut</th>
              <th>Aperçu message</th>
              <th>Par</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let h of historique()">
              <td>
                <div class="ht-date">{{ h.dateEnvoi | date:'dd/MM/yyyy' }}</div>
                <div class="ht-time">{{ h.dateEnvoi | date:'HH:mm' }}</div>
              </td>
              <td>
                <div class="ht-nom">{{ h.destinataireNom }}</div>
                <div class="ht-coord">
                  <span *ngIf="h.destinataireTel">📱 {{ h.destinataireTel }}</span>
                </div>
              </td>
              <td>
                <span class="ht-type">
                  {{ typeIco(h.type) }} {{ typeLbl(h.type) }}
                </span>
              </td>
              <td>
                <div class="ht-canaux">
                  <span *ngFor="let c of h.canaux" class="ht-canal" [ngClass]="canalCls(c)">
                    {{ canalIco(c) }}
                  </span>
                </div>
              </td>
              <td>
                <span class="ht-statut"
                      [class.st-ok]="h.statut==='Envoye'"
                      [class.st-err]="h.statut==='Echec'"
                      [class.st-wait]="h.statut==='EnAttente'">
                  {{ h.statut === 'Envoye' ? '✓ Envoyé' : h.statut === 'Echec' ? '✗ Échec' : '⏳ En attente' }}
                </span>
                <div class="ht-erreur" *ngIf="h.erreur">{{ h.erreur }}</div>
              </td>
              <td class="ht-apercu">{{ h.apercuMessage }}</td>
              <td class="ht-par">{{ h.envoyePar }}</td>
            </tr>
            <tr *ngIf="!historique().length && !histLoading()">
              <td colspan="7" class="notif-empty">Aucune notification dans cette période.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

  </div>

  <!-- ══ ONGLET STATS ══ -->
  <div *ngIf="activeTab==='stats'" class="notif-content">
    <div class="notif-stats-grid">
      <div class="nstat" *ngFor="let s of stats()">
        <div class="nstat-ico">{{ s.ico }}</div>
        <div class="nstat-val">{{ s.val }}</div>
        <div class="nstat-lbl">{{ s.lbl }}</div>
      </div>
    </div>

    <!-- Répartition par canal -->
    <div class="notif-card">
      <div class="notif-card-head"><span class="mi" style="color:#c9a84c">donut_large</span> Répartition par canal</div>
      <div class="notif-card-body">
        <div class="nf-repartition">
          <div class="nf-rep-item" *ngFor="let r of repartition()">
            <div class="nf-rep-ico" [ngClass]="canalCls(r.canal)">{{ canalIco(r.canal) }}</div>
            <div class="nf-rep-info">
              <div class="nf-rep-canal">{{ r.label }}</div>
              <div class="nf-rep-bar-wrap">
                <div class="nf-rep-bar" [style.width.%]="r.pct" [ngClass]="canalBarCls(r.canal)"></div>
              </div>
            </div>
            <div class="nf-rep-nb">{{ r.nb }}</div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- ══ MODAL NOTIFICATION ══ -->
  <kdi-notification-modal
    *ngIf="modalConfig()"
    [config]="modalConfig()!"
    (closed)="onModalClose($event)">
  </kdi-notification-modal>

  <!-- Toast -->
  <div class="notif-toast" [class.visible]="toastVisible" [class.ok]="toastType==='ok'" [class.err]="toastType==='err'">
    {{ toastMsg }}
  </div>

</div>
  `,
  styles: [`
    .notif-root { }
    .page-header { display:flex; align-items:flex-start; justify-content:space-between; margin-bottom:20px; }
    .page-eyebrow { font-size:11px; font-weight:600; color:#c9a84c; text-transform:uppercase; letter-spacing:.8px; margin-bottom:3px; }
    .page-title { font-size:24px; font-weight:800; color:#0e1c38; display:flex; align-items:center; gap:8px; }
    .page-subtitle { font-size:13px; color:#64748b; margin-top:3px; }
    .notif-header-actions { display:flex; gap:8px; }

    /* Tabs */
    .notif-tabs { display:flex; gap:0; border-bottom:2px solid #e2e8f0; margin-bottom:20px; }
    .ntab { padding:10px 20px; border:none; background:none; font-family:inherit; font-size:13px; font-weight:500; color:#64748b; cursor:pointer; border-bottom:2px solid transparent; margin-bottom:-2px; transition:all .15s; display:flex; align-items:center; gap:6px; }
    .ntab:hover { color:#0e1c38; }
    .ntab.active { color:#0e1c38; border-bottom-color:#c9a84c; font-weight:700; }
    .ntab-count { font-size:10px; background:#e2e8f0; color:#64748b; border-radius:20px; padding:1px 6px; font-weight:600; }

    /* Content */
    .notif-content { display:flex; flex-direction:column; gap:16px; }

    /* Card */
    .notif-card { background:#fff; border:1px solid #e2e8f0; border-radius:12px; overflow:hidden; box-shadow:0 2px 8px rgba(14,28,56,.06); }
    .notif-card-masse { border-color:#ede9fe; }
    .notif-card-head { padding:12px 18px; background:#f8fafc; border-bottom:1px solid #e2e8f0; font-size:13px; font-weight:700; color:#0e1c38; display:flex; align-items:center; gap:8px; }
    .notif-card-sub { font-size:11px; font-weight:400; color:#64748b; margin-left:4px; }
    .notif-card-body { padding:16px 18px; display:flex; flex-direction:column; gap:14px; }

    /* Form controls */
    .nf-row { display:flex; gap:14px; flex-wrap:wrap; }
    .nf-group { display:flex; flex-direction:column; gap:5px; flex:1; min-width:160px; }
    .nf-label { font-size:11px; font-weight:600; color:#64748b; text-transform:uppercase; letter-spacing:.5px; }
    .nf-sel, .nf-input {
      height:36px; padding:0 12px; border:1px solid #e2e8f0; border-radius:8px;
      font-family:inherit; font-size:13px; color:#0e1c38; background:#f8fafc;
      outline:none; cursor:pointer; transition:border-color .15s;
    }
    .nf-sel:focus, .nf-input:focus { border-color:#c9a84c; background:#fff; }
    .nf-textarea {
      padding:10px 12px; border:1px solid #e2e8f0; border-radius:8px;
      font-family:inherit; font-size:13px; color:#0e1c38; line-height:1.55;
      background:#f8fafc; outline:none; resize:vertical; width:100%;
      transition:border-color .15s;
    }
    .nf-textarea:focus { border-color:#c9a84c; background:#fff; }

    /* Canaux inline */
    .nf-canaux { display:flex; gap:8px; flex-wrap:wrap; }
    .nf-canal {
      display:flex; align-items:center; gap:7px;
      padding:8px 14px; border:2px solid #e2e8f0; border-radius:9px;
      cursor:pointer; font-size:13px; font-weight:500; color:#64748b;
      transition:all .15s; position:relative; user-select:none; background:#fff;
    }
    .nf-canal:hover { border-color:#9ab0c8; }
    .nf-canal.active-sms   { border-color:#f59e0b; background:#fffbeb; color:#92400e; }
    .nf-canal.active-wa    { border-color:#25d366; background:#f0fdf4; color:#166534; }
    .nf-canal.active-email { border-color:#2563eb; background:#eff6ff; color:#1d4ed8; }
    .nf-canal-ico { font-size:15px; }
    .nf-check { font-size:11px; font-weight:700; margin-left:2px; }

    /* Destinataires liste */
    .nf-dest-list { display:flex; flex-direction:column; gap:4px; max-height:320px; overflow-y:auto; }
    .nf-dest-item {
      display:flex; align-items:center; gap:10px; padding:10px 12px;
      border:1px solid #e2e8f0; border-radius:9px; cursor:pointer;
      transition:all .1s; background:#fff;
    }
    .nf-dest-item:hover { background:#f0f7ff; border-color:#bfd6f0; }
    .nf-dest-av {
      width:36px; height:36px; border-radius:50%; background:#1d4ed8;
      color:#fff; display:flex; align-items:center; justify-content:center;
      font-weight:700; font-size:13px; flex-shrink:0;
    }
    .nf-dest-info { flex:1; min-width:0; }
    .nf-dest-nom { font-size:13px; font-weight:600; color:#0e1c38; }
    .nf-dest-coords { font-size:11px; color:#64748b; display:flex; gap:10px; margin-top:2px; }
    .nf-dest-btn { padding:6px 10px; border:1px solid #e2e8f0; border-radius:7px; background:#f8fafc; cursor:pointer; color:#0e1c38; display:flex; align-items:center; }
    .nf-dest-btn:hover { background:#0e1c38; color:#c9a84c; }
    .nf-dest-more { font-size:11px; color:#64748b; text-align:center; padding:8px; }
    .nf-empty { font-size:13px; color:#94a3b8; text-align:center; padding:24px 0; }

    /* Masse footer */
    .nf-masse-footer { display:flex; align-items:center; justify-content:space-between; gap:12px; flex-wrap:wrap; }
    .nf-masse-info { font-size:13px; color:#64748b; }
    .nf-masse-result { background:#d1fae5; color:#065f46; border:1px solid #6ee7b7; border-radius:8px; padding:10px 14px; font-size:13px; font-weight:600; }
    .nf-echecs { color:#dc2626; }
    .nf-warn { color:#dc2626; font-weight:600; }

    /* Table historique */
    .notif-table-wrap { overflow-x:auto; }
    .notif-table { width:100%; border-collapse:collapse; font-size:12px; }
    .notif-table thead tr { background:#f8fafc; }
    .notif-table th { padding:8px 14px; font-size:10px; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:.5px; text-align:left; border-bottom:2px solid #e2e8f0; white-space:nowrap; }
    .notif-table tbody tr { border-bottom:1px solid #f1f5f9; transition:background .08s; }
    .notif-table tbody tr:hover { background:#f8fafc; }
    .notif-table td { padding:10px 14px; vertical-align:middle; }
    .ht-date { font-family:monospace; font-size:12px; font-weight:500; color:#0e1c38; }
    .ht-time { font-family:monospace; font-size:10px; color:#94a3b8; margin-top:1px; }
    .ht-nom  { font-weight:600; color:#0e1c38; }
    .ht-coord{ font-size:10px; color:#94a3b8; margin-top:2px; }
    .ht-type { font-size:11px; }
    .ht-canaux { display:flex; gap:4px; }
    .ht-canal { width:24px; height:24px; border-radius:6px; display:flex; align-items:center; justify-content:center; font-size:13px; }
    .canal-sms   { background:#fef9e5; }
    .canal-wa    { background:#f0fdf4; }
    .canal-email { background:#eff6ff; }
    .ht-statut { font-size:10px; font-weight:600; padding:3px 8px; border-radius:20px; }
    .st-ok   { background:#d1fae5; color:#065f46; }
    .st-err  { background:#fee2e2; color:#991b1b; }
    .st-wait { background:#fef3c7; color:#92400e; }
    .ht-erreur { font-size:10px; color:#dc2626; margin-top:2px; }
    .ht-apercu { font-size:11px; color:#94a3b8; max-width:200px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    .ht-par    { font-size:11px; color:#64748b; }
    .notif-empty { text-align:center; padding:40px; color:#94a3b8; font-size:13px; }

    /* Stats */
    .notif-stats-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:14px; margin-bottom:20px; }
    .nstat { background:#fff; border:1px solid #e2e8f0; border-radius:12px; padding:18px; text-align:center; box-shadow:0 2px 8px rgba(14,28,56,.06); }
    .nstat-ico { font-size:28px; margin-bottom:8px; }
    .nstat-val { font-family:monospace; font-size:24px; font-weight:700; color:#0e1c38; }
    .nstat-lbl { font-size:11px; color:#64748b; margin-top:4px; }

    /* Répartition */
    .nf-repartition { display:flex; flex-direction:column; gap:12px; }
    .nf-rep-item { display:flex; align-items:center; gap:12px; }
    .nf-rep-ico { width:32px; height:32px; border-radius:8px; display:flex; align-items:center; justify-content:center; font-size:16px; flex-shrink:0; }
    .nf-rep-info { flex:1; }
    .nf-rep-canal { font-size:12px; font-weight:600; color:#0e1c38; margin-bottom:4px; }
    .nf-rep-bar-wrap { height:6px; background:#f1f5f9; border-radius:3px; overflow:hidden; }
    .nf-rep-bar { height:100%; border-radius:3px; transition:width .4s ease; }
    .bar-sms   { background:#f59e0b; }
    .bar-wa    { background:#25d366; }
    .bar-email { background:#2563eb; }
    .nf-rep-nb { font-family:monospace; font-size:14px; font-weight:600; color:#0e1c38; min-width:30px; text-align:right; }

    /* Loading */
    .notif-loading { display:flex; align-items:center; gap:10px; padding:40px; justify-content:center; color:#64748b; }
    .notif-spinner { width:18px; height:18px; border:2px solid #e2e8f0; border-top-color:#0e1c38; border-radius:50%; animation:spin .7s linear infinite; }
    @keyframes spin { to { transform:rotate(360deg); } }

    /* Toast */
    .notif-toast { position:fixed; bottom:28px; right:28px; z-index:9999; padding:13px 20px; border-radius:12px; font-size:14px; font-weight:600; box-shadow:0 8px 28px rgba(0,0,0,.15); max-width:380px; transform:translateY(80px); opacity:0; transition:transform .3s,opacity .3s; pointer-events:none; }
    .notif-toast.visible { transform:translateY(0); opacity:1; }
    .notif-toast.ok  { background:#d1fae5; color:#065f46; border:1px solid #6ee7b7; }
    .notif-toast.err { background:#fee2e2; color:#991b1b; border:1px solid #fca5a5; }
  `]
})
export class NotificationsComponent implements OnInit {
  private notifSvc = inject(NotificationService);
  private propSvc  = inject(ProprietairesService);
  private locSvc   = inject(LocatairesService);

  activeTab: 'envoyer' | 'historique' | 'stats' = 'envoyer';

  // ── Envoi ─────────────────────────────────────────────────────────────────
  typeDestinataire = signal<'Locataire' | 'Proprietaire'>('Locataire');
  typeNotification = signal<TypeNotification>('RelancePaiement');
  canalSms    = true;
  canalWa     = false;
  canalEmail  = false;
  messageMasse = '';
  recherche   = signal('');
  envoiMasse  = signal(false);
  resultatMasse = signal<{ nbEnvoyes: number; nbEchecs: number } | null>(null);

  // ── Modal ─────────────────────────────────────────────────────────────────
  modalConfig = signal<NotificationModalConfig | null>(null);

  // ── Historique ────────────────────────────────────────────────────────────
  histLoading   = signal(false);
  historique    = signal<HistoriqueNotificationDto[]>([]);
  histTotal     = computed(() => this.historique().length);
  histFiltreCanal = '';
  histFiltreType  = '';
  histFiltreDebut = '';
  histFiltreFin   = '';

  // ── Destinataires ─────────────────────────────────────────────────────────
  private tousDestinataires = signal<{
    id:string; nom:string; ini:string; tel?:string; email?:string;
  }[]>([]);

  // ── Toast ─────────────────────────────────────────────────────────────────
  toastMsg  = ''; toastType = ''; toastVisible = false;
  private _tt: any;

  // ── Init ──────────────────────────────────────────────────────────────────
  ngOnInit() { this.chargerDestinataires(); }

  private chargerDestinataires() {
    forkJoin({
      props: this.propSvc.getAll(1, 100).pipe(catchError(() => of({ items: [], total: 0, page: 1, pageSize: 100 }))),
      locs:  this.locSvc.getAll(1, 100).pipe(catchError(() => of({ items: [], total: 0, page: 1, pageSize: 100 }))),
    }).subscribe(({ props, locs }) => {
      const proprietaires = props.items.map((p, i) => ({
        id: p.id, nom: p.nomComplet,
        ini: p.nomComplet.split(' ').filter(Boolean).slice(0,2).map((s:string)=>s[0]).join('').toUpperCase(),
        tel: p.telephone, email: p.email,
        type: 'Proprietaire' as const,
      }));
      const locataires = locs.items.map((l, i) => ({
        id: l.id, nom: l.nomComplet,
        ini: l.nomComplet.split(' ').filter(Boolean).slice(0,2).map((s:string)=>s[0]).join('').toUpperCase(),
        tel: l.telephone, email: undefined,
        type: 'Locataire' as const,
      }));
      this.tousDestinataires.set([...locataires, ...proprietaires]);
    });
  }

  destinatairesFiltres = computed(() => {
    const q = this.recherche().toLowerCase();
    const type = this.typeDestinataire();
    if (!q) return [];
    return this.tousDestinataires()
      .filter((d: any) => d.type === type &&
        (d.nom.toLowerCase().includes(q) || (d.tel ?? '').includes(q))
      );
  });

  // ── Computed ──────────────────────────────────────────────────────────────
  canauxActifs = computed((): CanalNotification[] => {
    const c: CanalNotification[] = [];
    if (this.canalSms)   c.push('sms');
    if (this.canalWa)    c.push('whatsapp');
    if (this.canalEmail) c.push('email');
    return c;
  });

  canauxLabel(): string {
    const m: Record<CanalNotification,string> = { email:'Email', sms:'SMS', whatsapp:'WhatsApp' };
    return this.canauxActifs().map(c => m[c]).join(' + ') || '—';
  }

  typesDisponibles = computed(() => {
    const dest = this.typeDestinataire() === 'Locataire' ? 'locataire' : 'proprietaire';
    return Object.entries(TYPE_LABELS)
      .filter(([, cfg]) => cfg.pour === dest || cfg.pour === 'tous')
      .map(([val, { lbl, ico }]) => ({ val: val as TypeNotification, lbl, ico }));
  });

  tousTypes = computed(() =>
    Object.entries(TYPE_LABELS).map(([val, { lbl, ico }]) => ({ val: val as TypeNotification, lbl, ico }))
  );

  stats = computed(() => [
    { ico: '📤', val: this.historique().length, lbl: 'Notifications envoyées' },
    { ico: '✅', val: this.historique().filter(h => h.statut === 'Envoye').length, lbl: 'Réussies' },
    { ico: '❌', val: this.historique().filter(h => h.statut === 'Echec').length, lbl: 'Échecs' },
    { ico: '⏳', val: this.historique().filter(h => h.statut === 'EnAttente').length, lbl: 'En attente' },
  ]);

  repartition = computed(() => {
    const total = this.historique().length || 1;
    const canaux: CanalNotification[] = ['sms', 'whatsapp', 'email'];
    const labels: Record<CanalNotification, string> = { sms:'SMS', whatsapp:'WhatsApp', email:'Email' };
    return canaux.map(c => {
      const nb = this.historique().filter(h => h.canaux.includes(c)).length;
      return { canal: c, label: labels[c], nb, pct: Math.round(nb / total * 100) };
    });
  });

  // ── Actions ───────────────────────────────────────────────────────────────
  onTypeDestChange() {
    // typeDestinataire signal updated by template — reset type to first available
    const first = this.typesDisponibles()[0]?.val ?? 'MessageLibre';
    this.typeNotification.set(first);
    this.recherche.set('');
    this.resultatMasse.set(null);
  }

  // filtrerDestinataires — computed() réagit automatiquement au signal recherche()

  selectionnerEtOuvrir(d: any) {
    this.modalConfig.set({
      id:               d.id,
      typeDestinataire: this.typeDestinataire(),
      nomDestinataire:  d.nom,
      telephone:        d.tel,
      email:            d.email,
      type:             this.typeNotification(),
      canauxDefaut:     this.canauxActifs(),
    });
  }

  ouvrirEnvoiGroupe() {
    this.activeTab = 'envoyer';
  }

  envoyerGroupe() {
    if (!this.canauxActifs().length) return;
    this.envoiMasse.set(true);
    this.resultatMasse.set(null);

    this.notifSvc.envoyerMasse({
      destinataireIds:  [],          // vide = tous
      typeDestinataire: this.typeDestinataire(),
      type:             this.typeNotification(),
      canaux:           this.canauxActifs(),
      message:          this.messageMasse || undefined,
    }).subscribe({
      next: r => {
        this.envoiMasse.set(false);
        this.resultatMasse.set(r);
        this.toast(`✅ ${r.nbEnvoyes} notification(s) envoyée(s)`, 'ok');
      },
      error: () => {
        this.envoiMasse.set(false);
        this.toast('❌ Erreur lors de l\'envoi groupé.', 'err');
      }
    });
  }

  onModalClose(result: any) {
    this.modalConfig.set(null);
    if (result.envoye) {
      this.toast(`✅ Notification envoyée via ${result.canaux?.join(' + ')}`, 'ok');
    }
  }

  chargerHistorique() {
    this.histLoading.set(true);
    this.notifSvc.getHistorique({
      page: 1, pageSize: 50,
      canal:     this.histFiltreCanal  as CanalNotification || undefined,
      type:      this.histFiltreType   as TypeNotification  || undefined,
      dateDebut: this.histFiltreDebut  || undefined,
      dateFin:   this.histFiltreFin    || undefined,
    }).subscribe({
      next:  r => { this.historique.set(r.items); this.histLoading.set(false); },
      error: () => { this.historique.set([]); this.histLoading.set(false); }
    });
  }

  // ── Helpers visuels ───────────────────────────────────────────────────────
  typeIco(t: TypeNotification): string { return TYPE_LABELS[t]?.ico ?? '✉️'; }
  typeLbl(t: TypeNotification): string { return TYPE_LABELS[t]?.lbl ?? t; }
  canalIco(c: CanalNotification): string { const m: Record<CanalNotification,string> = { sms:'💬', whatsapp:'📱', email:'📧' }; return m[c] ?? c; }
  canalCls(c: CanalNotification): string { const m: Record<CanalNotification,string> = { sms:'canal-sms', whatsapp:'canal-wa', email:'canal-email' }; return m[c] ?? ''; }
  canalBarCls(c: CanalNotification): string { const m: Record<CanalNotification,string> = { sms:'bar-sms', whatsapp:'bar-wa', email:'bar-email' }; return m[c] ?? ''; }

  private toast(msg: string, type: 'ok' | 'err') {
    this.toastMsg = msg; this.toastType = type; this.toastVisible = true;
    clearTimeout(this._tt);
    this._tt = setTimeout(() => this.toastVisible = false, 4500);
  }
}