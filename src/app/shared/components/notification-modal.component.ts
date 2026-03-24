// ══════════════════════════════════════════════════════════════════════════════
//  COMPOSANT MODAL NOTIFICATION
//  Usage : <kdi-notification-modal [config]="cfg" (closed)="onClose($event)" />
//
//  Envoi Email · SMS · WhatsApp vers locataire ou propriétaire,
//  avec sélection de canal, prévisualisation du message, et retour statut.
// ══════════════════════════════════════════════════════════════════════════════

import {
  Component, Input, Output, EventEmitter,
  inject, signal, OnInit, OnChanges
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  NotificationService,
} from '../../core/services/api.services';
import type {
  CanalNotification,
  TypeNotification,
  StatutsEnvoiDto,
} from '../../core/models/models';

// ── Config passée par le composant parent ─────────────────────────────────────
export interface NotificationModalConfig {
  // Identifiant de l'entité
  id:               string;   // contratId, proprietaireId, etc.
  typeDestinataire: 'Locataire' | 'Proprietaire' | 'Contact';

  // Infos affichées
  nomDestinataire:  string;
  telephone?:       string;
  email?:           string;
  whatsapp?:        string;   // si différent du tel, sinon on utilise telephone

  // Type de message
  type:             TypeNotification;
  sujetDefaut?:     string;
  messageDefaut?:   string;   // pré-rempli, modifiable
  parametres?:      Record<string, string>;

  // Canaux activés par défaut
  canauxDefaut?:    CanalNotification[];
}

// ── Résultat renvoyé au parent ────────────────────────────────────────────────
export interface NotificationResult {
  envoye:   boolean;
  statuts?: StatutsEnvoiDto;
  canaux?:  CanalNotification[];
}

// ── Libellés des types de notification ───────────────────────────────────────
const TYPE_LABELS: Record<TypeNotification, string> = {
  QuittanceLoyer:      'Quittance de loyer',
  RelancePaiement:     'Relance loyer impayé',
  AvisEcheance:        "Avis d'échéance",
  ConfirmationEntree:  'Confirmation entrée dans les lieux',
  AvisVersement:       'Avis de versement',
  BordereauVersement:  'Bordereau / preuve de versement',
  ReleveCompte:        'Relevé de compte mensuel',
  DevisAValider:       'Devis travaux à valider',
  AvancementChantier:  'Avancement de chantier',
  AvisImpot:           'Avis impôt / taxe foncière',
  RelanceProprietaire: 'Relance propriétaire',
  MessageLibre:        'Message libre',
};

@Component({
  selector: 'kdi-notification-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
<div class="nm-backdrop" (click)="fermer(false)">
  <div class="nm-modal" (click)="$event.stopPropagation()">

    <!-- ── En-tête ── -->
    <div class="nm-header">
      <div class="nm-header-left">
        <div class="nm-ico">📣</div>
        <div>
          <div class="nm-title">Envoyer une notification</div>
          <div class="nm-sub">{{ typeLabel() }} · {{ config.nomDestinataire }}</div>
        </div>
      </div>
      <button class="nm-close" (click)="fermer(false)">✕</button>
    </div>

    <!-- ── Destinataire ── -->
    <div class="nm-dest-card">
      <div class="nm-dest-avatar">{{ initiales() }}</div>
      <div class="nm-dest-info">
        <div class="nm-dest-nom">{{ config.nomDestinataire }}</div>
        <div class="nm-dest-coords">
          <span *ngIf="config.telephone" class="nm-coord">
            <span class="nm-coord-ico">📱</span> {{ config.telephone }}
          </span>
          <span *ngIf="config.email" class="nm-coord">
            <span class="nm-coord-ico">📧</span> {{ config.email }}
          </span>
        </div>
      </div>
      <span class="nm-type-badge">{{ typeLabel() }}</span>
    </div>

    <!-- ── Canaux ── -->
    <div class="nm-section">
      <div class="nm-section-title">Canaux d'envoi</div>
      <div class="nm-canaux">

        <button class="nm-canal"
                [class.nm-canal-active-sms]="canalActif('sms')"
                [class.nm-canal-disabled]="!config.telephone"
                (click)="toggleCanal('sms')"
                [title]="config.telephone ? '' : 'Aucun téléphone renseigné'">
          <div class="nm-canal-ico sms-ico">💬</div>
          <div class="nm-canal-body">
            <div class="nm-canal-name">SMS</div>
            <div class="nm-canal-info">{{ config.telephone || 'Non renseigné' }}</div>
          </div>
          <div class="nm-canal-check" *ngIf="canalActif('sms')">✓</div>
          <div class="nm-canal-lock" *ngIf="!config.telephone">🔒</div>
        </button>

        <button class="nm-canal"
                [class.nm-canal-active-wa]="canalActif('whatsapp')"
                [class.nm-canal-disabled]="!config.telephone && !config.whatsapp"
                (click)="toggleCanal('whatsapp')"
                [title]="(config.telephone || config.whatsapp) ? '' : 'Aucun numéro renseigné'">
          <div class="nm-canal-ico wa-ico">
            <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
          </div>
          <div class="nm-canal-body">
            <div class="nm-canal-name">WhatsApp</div>
            <div class="nm-canal-info">{{ config.whatsapp || config.telephone || 'Non renseigné' }}</div>
          </div>
          <div class="nm-canal-check" *ngIf="canalActif('whatsapp')">✓</div>
          <div class="nm-canal-lock" *ngIf="!config.telephone && !config.whatsapp">🔒</div>
        </button>

        <button class="nm-canal"
                [class.nm-canal-active-email]="canalActif('email')"
                [class.nm-canal-disabled]="!config.email"
                (click)="toggleCanal('email')"
                [title]="config.email ? '' : 'Aucun email renseigné'">
          <div class="nm-canal-ico email-ico">📧</div>
          <div class="nm-canal-body">
            <div class="nm-canal-name">Email</div>
            <div class="nm-canal-info">{{ config.email || 'Non renseigné' }}</div>
          </div>
          <div class="nm-canal-check" *ngIf="canalActif('email')">✓</div>
          <div class="nm-canal-lock" *ngIf="!config.email">🔒</div>
        </button>

      </div>
    </div>

    <!-- ── Sujet (email seulement) ── -->
    <div class="nm-section" *ngIf="canalActif('email')">
      <div class="nm-section-title">Sujet de l'email</div>
      <input class="nm-input" type="text" [(ngModel)]="sujet"
             placeholder="Ex : Quittance de loyer — Janvier 2026">
    </div>

    <!-- ── Message ── -->
    <div class="nm-section">
      <div class="nm-section-title">
        Message
        <span class="nm-char-count" [class.warn]="message.length > 160 && !canalActif('email')">
          {{ message.length }} / {{ canalActif('email') ? '∞' : '160' }} car.
          <span *ngIf="canalActif('sms') && message.length > 160" class="nm-sms-pages">
            · {{ nbPagesSMS() }} SMS
          </span>
        </span>
      </div>
      <textarea class="nm-textarea" [(ngModel)]="message" rows="5"
                placeholder="Saisissez votre message ou laissez vide pour utiliser le template automatique…">
      </textarea>
      <div class="nm-msg-hints">
        <button class="nm-hint" (click)="insererVariable('{nom}')">👤 Nom</button>
        <button class="nm-hint" (click)="insererVariable('{montant}')">💰 Montant</button>
        <button class="nm-hint" (click)="insererVariable('{periode}')">📅 Période</button>
        <button class="nm-hint" (click)="insererVariable('{reference}')">🔖 Référence</button>
      </div>
    </div>

    <!-- ── Prévisualisation ── -->
    <div class="nm-preview" *ngIf="message.trim()">
      <div class="nm-preview-title">Aperçu</div>
      <div class="nm-preview-body" [innerHTML]="messageRendu()"></div>
    </div>

    <!-- ── Résultat d'envoi ── -->
    <div class="nm-result" *ngIf="resultat()">
      <div class="nm-result-row" *ngFor="let r of resultatRows()">
        <span class="nm-result-ico">{{ r.ico }}</span>
        <span class="nm-result-canal">{{ r.canal }}</span>
        <span class="nm-result-st" [class.ok]="r.ok" [class.err]="!r.ok">
          {{ r.ok ? '✓ Envoyé' : '✗ Échec' }}
        </span>
      </div>
    </div>

    <!-- ── Erreur ── -->
    <div class="nm-error" *ngIf="erreur()">
      ⚠️ {{ erreur() }}
    </div>

    <!-- ── Actions ── -->
    <div class="nm-footer">
      <div class="nm-footer-left">
        <span class="nm-canaux-sel" *ngIf="canauxSelectionnes().length">
          {{ canauxSelectionnes().length }} canal(aux) sélectionné(s)
        </span>
        <span class="nm-no-canal" *ngIf="!canauxSelectionnes().length">
          ⚠ Aucun canal sélectionné
        </span>
      </div>
      <div class="nm-footer-right">
        <button class="nm-btn-cancel" (click)="fermer(false)" [disabled]="envoi()">
          Annuler
        </button>
        <button class="nm-btn-send"
                [disabled]="canauxSelectionnes().length === 0 || envoi()"
                (click)="envoyer()">
          <span *ngIf="!envoi()">
            📤 Envoyer via {{ canauxLabel() }}
          </span>
          <span *ngIf="envoi()">
            <div class="nm-spinner"></div> Envoi en cours…
          </span>
        </button>
      </div>
    </div>

  </div>
</div>
  `,
  styles: [`
    /* Backdrop */
    .nm-backdrop {
      position: fixed; inset: 0; z-index: 1000;
      background: rgba(8,21,42,.55);
      backdrop-filter: blur(3px);
      display: flex; align-items: center; justify-content: center;
      padding: 20px;
      animation: fadeIn .2s ease;
    }
    @keyframes fadeIn { from { opacity:0 } to { opacity:1 } }

    /* Modal */
    .nm-modal {
      background: #fff;
      border-radius: 16px;
      width: 100%; max-width: 560px;
      max-height: 90vh;
      overflow-y: auto;
      box-shadow: 0 24px 80px rgba(8,21,42,.25);
      animation: slideUp .25s ease;
    }
    @keyframes slideUp { from { opacity:0; transform:translateY(16px) } to { opacity:1; transform:translateY(0) } }

    /* Header */
    .nm-header {
      background: linear-gradient(135deg, #08152a, #0f2240);
      border-radius: 16px 16px 0 0;
      padding: 16px 20px;
      display: flex; align-items: center; justify-content: space-between;
      border-bottom: 2px solid #c8982a;
    }
    .nm-header-left { display:flex; align-items:center; gap:12px; }
    .nm-ico { font-size:22px; }
    .nm-title { font-size:15px; font-weight:700; color:#fff; }
    .nm-sub   { font-size:11px; color:rgba(255,255,255,.4); margin-top:2px; }
    .nm-close {
      background: rgba(255,255,255,.08); border: 1px solid rgba(255,255,255,.1);
      color: rgba(255,255,255,.6); border-radius: 7px; padding: 5px 10px;
      cursor: pointer; font-size: 13px; transition: all .15s;
    }
    .nm-close:hover { background: rgba(255,255,255,.15); color: #fff; }

    /* Destinataire */
    .nm-dest-card {
      display: flex; align-items: center; gap: 12px;
      padding: 14px 20px;
      background: #f8fafd;
      border-bottom: 1px solid #eaf0f8;
    }
    .nm-dest-avatar {
      width: 38px; height: 38px; border-radius: 50%;
      background: linear-gradient(135deg,#1d4ed8,#3b82f6);
      display: flex; align-items: center; justify-content: center;
      font-weight: 700; font-size: 14px; color: #fff; flex-shrink: 0;
    }
    .nm-dest-nom { font-size: 13px; font-weight: 600; color: #0a1828; }
    .nm-dest-coords { display: flex; gap: 10px; margin-top: 3px; flex-wrap: wrap; }
    .nm-coord { font-size: 11px; color: #6a8aaa; display: flex; align-items: center; gap: 4px; }
    .nm-coord-ico { font-size: 12px; }
    .nm-dest-info { flex: 1; min-width: 0; }
    .nm-type-badge {
      font-size: 10px; font-weight: 600; padding: 3px 10px; border-radius: 20px;
      background: #fdf7e8; color: #c8982a; border: 1px solid #f0dfa0;
      white-space: nowrap; flex-shrink: 0;
    }

    /* Sections */
    .nm-section { padding: 14px 20px; border-bottom: 1px solid #f0f4fa; }
    .nm-section-title {
      font-size: 11px; font-weight: 700; color: #3d5570;
      text-transform: uppercase; letter-spacing: .6px;
      margin-bottom: 10px; display: flex; align-items: center; justify-content: space-between;
    }
    .nm-char-count { font-size: 10px; font-weight: 400; color: #9ab0c8; text-transform: none; }
    .nm-char-count.warn { color: #c02840; }
    .nm-sms-pages { color: #b85a08; }

    /* Canaux */
    .nm-canaux { display: grid; grid-template-columns: repeat(3,1fr); gap: 8px; }
    .nm-canal {
      display: flex; align-items: center; gap: 8px;
      padding: 10px 12px; border: 2px solid #d8e4f0; border-radius: 10px;
      cursor: pointer; background: #fff; text-align: left;
      transition: all .15s; position: relative;
      font-family: inherit;
    }
    .nm-canal:hover:not(.nm-canal-disabled) { border-color: #9ab0c8; background: #f8fafd; }
    .nm-canal-disabled { opacity: .45; cursor: not-allowed; }
    .nm-canal-active-sms   { border-color: #f59e0b !important; background: #fffbeb !important; }
    .nm-canal-active-wa    { border-color: #25d366 !important; background: #f0fdf4 !important; }
    .nm-canal-active-email { border-color: #2563eb !important; background: #eff6ff !important; }
    .nm-canal-ico {
      width: 32px; height: 32px; border-radius: 8px;
      display: flex; align-items: center; justify-content: center;
      font-size: 16px; flex-shrink: 0;
    }
    .sms-ico   { background: #fef9e5; color: #b45309; }
    .wa-ico    { background: #f0fdf4; color: #25d366; }
    .email-ico { background: #eff6ff; color: #2563eb; }
    .nm-canal-name { font-size: 12px; font-weight: 600; color: #0a1828; }
    .nm-canal-info { font-size: 10px; color: #9ab0c8; margin-top: 1px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 90px; }
    .nm-canal-check { position: absolute; top: 6px; right: 8px; font-size: 11px; font-weight: 700; color: #0c7a62; }
    .nm-canal-lock  { position: absolute; top: 6px; right: 8px; font-size: 11px; }

    /* Inputs */
    .nm-input {
      width: 100%; height: 36px; padding: 0 12px;
      border: 1px solid #d8e4f0; border-radius: 8px;
      font-family: inherit; font-size: 13px; color: #0a1828;
      background: #f8fafd; outline: none; transition: border-color .15s;
    }
    .nm-input:focus { border-color: #c8982a; background: #fff; }
    .nm-textarea {
      width: 100%; padding: 10px 12px;
      border: 1px solid #d8e4f0; border-radius: 8px;
      font-family: inherit; font-size: 13px; color: #0a1828; line-height: 1.55;
      background: #f8fafd; outline: none; resize: vertical;
      transition: border-color .15s;
    }
    .nm-textarea:focus { border-color: #c8982a; background: #fff; }

    /* Variables hint */
    .nm-msg-hints { display: flex; gap: 6px; margin-top: 8px; flex-wrap: wrap; }
    .nm-hint {
      font-size: 11px; padding: 3px 10px; border-radius: 20px;
      border: 1px solid #d8e4f0; background: #f8fafd; color: #3d5570;
      cursor: pointer; font-family: inherit; transition: all .1s;
    }
    .nm-hint:hover { background: #e8f0f8; border-color: #9ab0c8; }

    /* Prévisualisation */
    .nm-preview {
      margin: 0 20px 14px;
      background: #f0f7ff;
      border: 1px solid #bfd6f0;
      border-radius: 10px;
      padding: 12px 14px;
    }
    .nm-preview-title { font-size: 10px; font-weight: 700; color: #1a52a8; text-transform: uppercase; letter-spacing: .5px; margin-bottom: 8px; }
    .nm-preview-body { font-size: 13px; color: #0a1828; white-space: pre-wrap; line-height: 1.55; }

    /* Résultat */
    .nm-result {
      margin: 0 20px 14px;
      background: #f0fdf4;
      border: 1px solid #86efac;
      border-radius: 10px;
      padding: 12px 16px;
      display: flex; flex-direction: column; gap: 6px;
    }
    .nm-result-row { display: flex; align-items: center; gap: 10px; }
    .nm-result-ico { font-size: 16px; }
    .nm-result-canal { font-size: 13px; font-weight: 600; color: #0a1828; flex: 1; }
    .nm-result-st { font-size: 12px; font-weight: 600; }
    .nm-result-st.ok  { color: #16a34a; }
    .nm-result-st.err { color: #c02840; }

    /* Erreur */
    .nm-error {
      margin: 0 20px 14px;
      background: #fdeaed;
      border: 1px solid #fca5a5;
      border-radius: 10px;
      padding: 12px 16px;
      font-size: 13px; color: #c02840;
    }

    /* Footer */
    .nm-footer {
      padding: 14px 20px;
      border-top: 1px solid #eaf0f8;
      display: flex; align-items: center; justify-content: space-between; gap: 12px;
    }
    .nm-footer-right { display: flex; gap: 8px; }
    .nm-canaux-sel { font-size: 12px; color: #0c7a62; font-weight: 600; }
    .nm-no-canal   { font-size: 12px; color: #c02840; }
    .nm-btn-cancel {
      padding: 8px 18px; border-radius: 8px; border: 1px solid #d8e4f0;
      background: #fff; color: #3d5570; font-family: inherit;
      font-size: 13px; font-weight: 500; cursor: pointer; transition: all .15s;
    }
    .nm-btn-cancel:hover:not(:disabled) { background: #f8fafd; }
    .nm-btn-send {
      padding: 8px 22px; border-radius: 8px; border: none;
      background: linear-gradient(135deg,#0c7a62,#10a37f);
      color: #fff; font-family: inherit; font-size: 13px; font-weight: 700;
      cursor: pointer; transition: all .15s;
      display: flex; align-items: center; gap: 8px;
    }
    .nm-btn-send:hover:not(:disabled) { opacity: .9; }
    .nm-btn-send:disabled { opacity: .5; cursor: not-allowed; }
    .nm-spinner {
      width: 14px; height: 14px;
      border: 2px solid rgba(255,255,255,.4);
      border-top-color: #fff;
      border-radius: 50%;
      animation: spin .7s linear infinite;
      display: inline-block;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    ::-webkit-scrollbar { width: 4px; }
    ::-webkit-scrollbar-thumb { background: #d8e4f0; border-radius: 2px; }
  `]
})
export class NotificationModalComponent implements OnInit {
  @Input()  config!: NotificationModalConfig;
  @Output() closed = new EventEmitter<NotificationResult>();

  private notifSvc = inject(NotificationService);

  // ── State ─────────────────────────────────────────────────────────────────
  envoi    = signal(false);
  resultat = signal<StatutsEnvoiDto | null>(null);
  erreur   = signal('');

  sujet   = '';
  message = '';

  private _canaux = new Set<CanalNotification>();

  // ── Init ──────────────────────────────────────────────────────────────────
  ngOnInit() {
    this.sujet   = this.config.sujetDefaut   ?? '';
    this.message = this.config.messageDefaut ?? '';

    // Canaux par défaut
    const def = this.config.canauxDefaut ?? ['sms'];
    def.forEach(c => {
      if (this.peutUtiliserCanal(c)) this._canaux.add(c);
    });
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
  typeLabel(): string { return TYPE_LABELS[this.config.type] ?? this.config.type; }

  initiales(): string {
    return this.config.nomDestinataire
      .split(' ').filter(Boolean).slice(0, 2)
      .map(s => s[0]).join('').toUpperCase();
  }

  peutUtiliserCanal(c: CanalNotification): boolean {
    if (c === 'email')    return !!this.config.email;
    if (c === 'sms')      return !!this.config.telephone;
    if (c === 'whatsapp') return !!(this.config.whatsapp || this.config.telephone);
    return false;
  }

  canalActif(c: CanalNotification): boolean { return this._canaux.has(c); }

  toggleCanal(c: CanalNotification) {
    if (!this.peutUtiliserCanal(c)) return;
    this._canaux.has(c) ? this._canaux.delete(c) : this._canaux.add(c);
  }

  canauxSelectionnes(): CanalNotification[] { return [...this._canaux]; }

  canauxLabel(): string {
    const m: Record<CanalNotification, string> = {
      email:'Email', sms:'SMS', whatsapp:'WhatsApp'
    };
    return this.canauxSelectionnes().map(c => m[c]).join(' + ') || '—';
  }

  nbPagesSMS(): number { return Math.ceil(this.message.length / 160); }

  messageRendu(): string {
    const p = this.config.parametres ?? {};
    return this.message
      .replace(/{nom}/g,       this.config.nomDestinataire)
      .replace(/{montant}/g,   p['montant']  ?? '—')
      .replace(/{periode}/g,   p['periode']  ?? '—')
      .replace(/{reference}/g, p['reference'] ?? '—')
      .replace(/\n/g, '<br>');
  }

  resultatRows(): { ico: string; canal: string; ok: boolean }[] {
    const r = this.resultat();
    if (!r) return [];
    const map: Record<string, { ico: string; canal: string }> = {
      email:    { ico: '📧', canal: 'Email'    },
      sms:      { ico: '💬', canal: 'SMS'      },
      whatsapp: { ico: '📱', canal: 'WhatsApp' },
    };
    return Object.entries(r)
      .filter(([, v]) => v !== 'ignore')
      .map(([k, v]) => ({ ...map[k], ok: v === 'ok' }));
  }

  insererVariable(v: string) {
    this.message += v;
  }

  // ── Envoi ─────────────────────────────────────────────────────────────────
  envoyer() {
    if (this.canauxSelectionnes().length === 0) return;
    this.envoi.set(true);
    this.erreur.set('');
    this.resultat.set(null);

    this.notifSvc.envoyer({
      destinataireId:   this.config.id,
      typeDestinataire: this.config.typeDestinataire,
      type:             this.config.type,
      canaux:           this.canauxSelectionnes(),
      sujet:            this.sujet || undefined,
      message:          this.message || undefined,
      parametres:       this.config.parametres,
    }).subscribe({
      next: statuts => {
        this.envoi.set(false);
        this.resultat.set(statuts);
        // Fermer après 2s si tout ok
        const tousOk = Object.values(statuts).every(v => v === 'ok' || v === 'ignore');
        if (tousOk) {
          setTimeout(() => this.fermer(true, statuts), 2000);
        }
      },
      error: (err) => {
        this.envoi.set(false);
        this.erreur.set(err?.error?.message ?? 'Erreur lors de l\'envoi. Vérifiez la connexion.');
      }
    });
  }

  fermer(envoye: boolean, statuts?: StatutsEnvoiDto) {
    this.closed.emit({
      envoye,
      statuts,
      canaux: envoye ? this.canauxSelectionnes() : undefined,
    });
  }
}