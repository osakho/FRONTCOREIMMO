import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { LocatairesService } from '../../../core/services/api.services';

@Component({
  selector: 'kdi-locataire-detail',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
<div class="lp" *ngIf="loc">

  <!-- ══ HERO ══ -->
  <div class="hero">
    <div class="hero-bg"></div>
    <div class="hero-content">
      <a routerLink="/locataires" class="back-btn">
        <span class="mi">arrow_back</span> Locataires
      </a>
      <div class="hero-body">
        <div class="avatar-wrap">
          <img *ngIf="loc.photoIdentiteUrl" [src]="loc.photoIdentiteUrl" class="avatar-img">
          <div *ngIf="!loc.photoIdentiteUrl" class="avatar-init">{{ initials() }}</div>
          <div class="avatar-status" [class.status-actif]="loc.estActif" [class.status-inactif]="!loc.estActif"></div>
        </div>
        <div class="hero-info">
          <div class="hero-name">{{ loc.nomComplet }}</div>
          <div class="hero-meta">
            <span class="mi">phone</span> {{ loc.telephone }}
            <span *ngIf="loc.email" class="hero-sep">·</span>
            <span *ngIf="loc.email" class="mi">mail</span>
            <span *ngIf="loc.email">{{ loc.email }}</span>
          </div>
          <div class="hero-tags">
            <span class="hero-tag" [class.tag-actif]="loc.estActif" [class.tag-inactif]="!loc.estActif">
              <span class="tag-dot"></span>{{ loc.estActif ? 'Actif' : 'Inactif' }}
            </span>
            <span class="hero-tag tag-neutral" *ngIf="loc.profession">
              <span class="mi">work</span>{{ loc.profession }}
            </span>
            <span class="hero-tag tag-neutral" *ngIf="loc.contratsActifs?.length">
              <span class="mi">home</span>{{ loc.contratsActifs.length }} bail{{ loc.contratsActifs.length > 1 ? 's' : '' }} actif{{ loc.contratsActifs.length > 1 ? 's' : '' }}
            </span>
          </div>
        </div>
        <div class="hero-actions">
          <a [routerLink]="['/contrats-location/nouveau']" [queryParams]="{locataireId: loc.id}" class="btn-primary">
            <span class="mi">add</span> Nouveau bail
          </a>
          <button class="btn-secondary" (click)="editMode = !editMode">
            <span class="mi">edit</span> Modifier
          </button>
        </div>
      </div>
    </div>
  </div>

  <!-- ══ STATS RAPIDES ══ -->
  <div class="stats-row">
    <div class="stat-card">
      <div class="stat-icon ic-blue"><span class="mi">home</span></div>
      <div class="stat-body">
        <div class="stat-val">{{ loc.contratsActifs?.length || 0 }}</div>
        <div class="stat-lbl">Baux actifs</div>
      </div>
    </div>
    <div class="stat-card">
      <div class="stat-icon ic-gold"><span class="mi">payments</span></div>
      <div class="stat-body">
        <div class="stat-val">{{ totalLoyers() | number:'1.0-0' }} <span class="stat-unit">MRU</span></div>
        <div class="stat-lbl">Loyer mensuel total</div>
      </div>
    </div>
    <div class="stat-card">
      <div class="stat-icon ic-green"><span class="mi">folder</span></div>
      <div class="stat-body">
        <div class="stat-val">{{ loc.documents?.length || 0 }}</div>
        <div class="stat-lbl">Documents</div>
      </div>
    </div>
    <div class="stat-card">
      <div class="stat-icon ic-purple"><span class="mi">calendar_today</span></div>
      <div class="stat-body">
        <div class="stat-val">{{ anciennete() }}</div>
        <div class="stat-lbl">Ancienneté</div>
      </div>
    </div>
  </div>

  <!-- ══ GRILLE PRINCIPALE ══ -->
  <div class="main-grid">

    <!-- Infos personnelles -->
    <div class="card">
      <div class="card-hdr">
        <span class="card-ico"><span class="mi">person</span></span>
        <div class="card-hdr-text">
          <div class="card-title">Informations personnelles</div>
          <div class="card-sub">Identité & coordonnées</div>
        </div>
      </div>
      <div class="info-grid">
        <div class="info-item">
          <div class="info-lbl">Date de naissance</div>
          <div class="info-val">{{ loc.dateNaissance | date:'dd MMMM yyyy':'':'fr' }}</div>
        </div>
        <div class="info-item">
          <div class="info-lbl">Lieu de naissance</div>
          <div class="info-val">{{ loc.lieuNaissance || '—' }}</div>
        </div>
        <div class="info-item full">
          <div class="info-lbl">Adresse</div>
          <div class="info-val">{{ loc.adresse }}<span *ngIf="loc.quartier">, {{ loc.quartier }}</span></div>
        </div>
        <div class="info-item">
          <div class="info-lbl">Type de document</div>
          <div class="info-val">{{ loc.typeDocumentLabel }}</div>
        </div>
        <div class="info-item">
          <div class="info-lbl">Numéro de document</div>
          <div class="info-val doc-num">{{ loc.numeroDocument }}</div>
        </div>
        <div class="info-item" *ngIf="loc.profession">
          <div class="info-lbl">Profession</div>
          <div class="info-val">{{ loc.profession }}</div>
        </div>
        <div class="info-item" *ngIf="loc.employeur">
          <div class="info-lbl">Employeur</div>
          <div class="info-val">{{ loc.employeur }}</div>
        </div>
      </div>
    </div>

    <!-- Baux actifs -->
    <div class="card">
      <div class="card-hdr">
        <span class="card-ico ic-blue-bg"><span class="mi">home</span></span>
        <div class="card-hdr-text">
          <div class="card-title">Baux actifs</div>
          <div class="card-sub">{{ loc.contratsActifs?.length || 0 }} contrat(s) en cours</div>
        </div>
        <a [routerLink]="['/contrats-location/nouveau']" [queryParams]="{locataireId: loc.id}" class="card-action">
          <span class="mi">add</span>
        </a>
      </div>

      <div class="bail-empty" *ngIf="!loc.contratsActifs?.length">
        <span class="mi" style="font-size:36px;color:#cbd5e1">home</span>
        <div>Aucun bail actif</div>
        <a [routerLink]="['/contrats-location/nouveau']" [queryParams]="{locataireId: loc.id}" class="btn-link">
          Créer un bail →
        </a>
      </div>

      <div class="bail-list" *ngIf="loc.contratsActifs?.length">
        <div class="bail-card" *ngFor="let c of loc.contratsActifs">
          <div class="bail-left">
            <div class="bail-code">{{ c.produitCode }}</div>
            <div class="bail-info">
              <div class="bail-num">{{ c.numero }}</div>
              <div class="bail-loyer">{{ c.loyer | number:'1.0-0' }} MRU<span class="bail-freq">/mois</span></div>
            </div>
          </div>
          <div class="bail-right">
            <span class="bail-badge">{{ c.statut }}</span>
            <a [routerLink]="['/contrats-location', c.id]" class="bail-link">
              <span class="mi">open_in_new</span>
            </a>
          </div>
        </div>
      </div>
    </div>

  </div>

  <!-- ══ DOCUMENTS ══ -->
  <div class="card card-wide" *ngIf="loc.documents?.length">
    <div class="card-hdr">
      <span class="card-ico ic-green-bg"><span class="mi">folder</span></span>
      <div class="card-hdr-text">
        <div class="card-title">Documents</div>
        <div class="card-sub">{{ loc.documents.length }} fichier(s) attaché(s)</div>
      </div>
    </div>
    <div class="doc-grid">
      <a *ngFor="let d of loc.documents" [href]="d.url" target="_blank" class="doc-card">
        <div class="doc-icon-wrap">
          <span class="mi">{{ docIcon(d.nomFichier) }}</span>
        </div>
        <div class="doc-info">
          <div class="doc-name">{{ d.nomFichier }}</div>
          <div class="doc-type">{{ d.typeLabel }}</div>
        </div>
        <span class="mi doc-dl">download</span>
      </a>
    </div>
  </div>

  <!-- ══ NOTES ══ -->
  <div class="card card-wide notes-card" *ngIf="loc.notes">
    <div class="card-hdr">
      <span class="card-ico ic-amber-bg"><span class="mi">sticky_note_2</span></span>
      <div class="card-hdr-text">
        <div class="card-title">Notes</div>
      </div>
    </div>
    <p class="notes-text">{{ loc.notes }}</p>
  </div>

</div>

<!-- Skeleton loader -->
<div class="skeleton-page" *ngIf="!loc">
  <div class="sk-hero"></div>
  <div class="sk-row">
    <div class="sk-card"></div><div class="sk-card"></div>
  </div>
</div>
  `,
  styles: [`
    @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=DM+Mono:wght@400;500&display=swap');

    :host {
      --navy: #0E1C38;
      --navy-m: #1A2F52;
      --gold: #C9A96E;
      --gold-d: #8B6914;
      --blue: #2563EB;
      --blue-bg: #EFF6FF;
      --green: #16A34A;
      --green-bg: #F0FDF4;
      --amber: #D97706;
      --amber-bg: #FFFBEB;
      --purple: #7C3AED;
      --purple-bg: #F5F3FF;
      --red: #DC2626;
      --muted: #64748B;
      --border: #E2E8F0;
      --surf: #F8FAFC;
      --surf2: #F1F5F9;
      --shadow-sm: 0 1px 3px rgba(14,28,56,.06), 0 1px 2px rgba(14,28,56,.04);
      --shadow: 0 4px 16px rgba(14,28,56,.08);
      --shadow-lg: 0 8px 32px rgba(14,28,56,.12);
      --r: 16px;
      font-family: 'DM Sans', sans-serif;
    }

    /* ── Page layout ── */
    .lp { max-width: 1080px; margin: 0 auto; padding: 0 0 40px; }

    /* ── Hero ── */
    .hero {
      position: relative;
      border-radius: var(--r);
      overflow: hidden;
      margin-bottom: 20px;
      box-shadow: var(--shadow-lg);
    }
    .hero-bg {
      position: absolute; inset: 0;
      background: linear-gradient(135deg, var(--navy) 0%, #1e3a6e 60%, #2a4a8a 100%);
    }
    .hero-bg::after {
      content: '';
      position: absolute; inset: 0;
      background: radial-gradient(ellipse at 80% 50%, rgba(201,169,110,.12) 0%, transparent 60%),
                  url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.02'%3E%3Ccircle cx='30' cy='30' r='4'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
    }
    .hero-content { position: relative; z-index: 1; padding: 20px 28px 28px; }
    .back-btn {
      display: inline-flex; align-items: center; gap: 5px;
      color: rgba(255,255,255,.5); font-size: 13px; font-weight: 500;
      text-decoration: none; margin-bottom: 20px;
      transition: color .15s;
    }
    .back-btn:hover { color: rgba(255,255,255,.85); }
    .back-btn .mi { font-size: 16px; }
    .hero-body { display: flex; align-items: center; gap: 22px; flex-wrap: wrap; }

    /* Avatar */
    .avatar-wrap { position: relative; flex-shrink: 0; }
    .avatar-img, .avatar-init {
      width: 80px; height: 80px; border-radius: 20px;
      border: 3px solid rgba(255,255,255,.15);
      box-shadow: 0 8px 24px rgba(0,0,0,.2);
    }
    .avatar-img { object-fit: cover; }
    .avatar-init {
      background: linear-gradient(135deg, rgba(255,255,255,.1), rgba(201,169,110,.2));
      display: flex; align-items: center; justify-content: center;
      font-size: 28px; font-weight: 700; color: var(--gold); letter-spacing: -1px;
    }
    .avatar-status {
      position: absolute; bottom: 4px; right: 4px;
      width: 14px; height: 14px; border-radius: 50%;
      border: 2px solid var(--navy);
    }
    .status-actif { background: #4ade80; }
    .status-inactif { background: #94a3b8; }

    /* Hero text */
    .hero-info { flex: 1; min-width: 200px; }
    .hero-name { font-size: 26px; font-weight: 700; color: #fff; letter-spacing: -.4px; margin-bottom: 6px; }
    .hero-meta { display: flex; align-items: center; gap: 6px; color: rgba(255,255,255,.55); font-size: 13.5px; margin-bottom: 12px; }
    .hero-meta .mi { font-size: 15px; }
    .hero-sep { margin: 0 2px; }
    .hero-tags { display: flex; gap: 8px; flex-wrap: wrap; }
    .hero-tag {
      display: inline-flex; align-items: center; gap: 5px;
      padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600;
    }
    .hero-tag .mi { font-size: 13px; }
    .tag-dot { width: 6px; height: 6px; border-radius: 50%; background: currentColor; }
    .tag-actif { background: rgba(74,222,128,.15); color: #4ade80; }
    .tag-inactif { background: rgba(148,163,184,.15); color: #94a3b8; }
    .tag-neutral { background: rgba(255,255,255,.08); color: rgba(255,255,255,.6); }

    /* Hero actions */
    .hero-actions { display: flex; gap: 10px; flex-shrink: 0; }
    .btn-primary {
      display: inline-flex; align-items: center; gap: 7px;
      padding: 10px 20px; border-radius: 10px; font-size: 13.5px; font-weight: 600;
      background: var(--gold); color: var(--navy); border: none; cursor: pointer;
      text-decoration: none; transition: all .18s; font-family: inherit;
    }
    .btn-primary:hover { background: #d4b07a; transform: translateY(-1px); box-shadow: 0 4px 12px rgba(201,169,110,.4); }
    .btn-primary .mi { font-size: 16px; }
    .btn-secondary {
      display: inline-flex; align-items: center; gap: 7px;
      padding: 10px 18px; border-radius: 10px; font-size: 13.5px; font-weight: 600;
      background: rgba(255,255,255,.1); color: rgba(255,255,255,.8);
      border: 1px solid rgba(255,255,255,.15); cursor: pointer; font-family: inherit;
      transition: all .18s;
    }
    .btn-secondary:hover { background: rgba(255,255,255,.18); }
    .btn-secondary .mi { font-size: 16px; }

    /* ── Stats ── */
    .stats-row {
      display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px;
      margin-bottom: 20px;
    }
    .stat-card {
      background: #fff; border-radius: 14px; padding: 16px 18px;
      display: flex; align-items: center; gap: 14px;
      box-shadow: var(--shadow-sm); border: 1px solid #e8edf5;
      transition: transform .18s, box-shadow .18s;
    }
    .stat-card:hover { transform: translateY(-2px); box-shadow: var(--shadow); }
    .stat-icon {
      width: 44px; height: 44px; border-radius: 12px; flex-shrink: 0;
      display: flex; align-items: center; justify-content: center;
    }
    .stat-icon .mi { font-size: 20px; }
    .ic-blue { background: var(--blue-bg); color: var(--blue); }
    .ic-gold { background: #FEF9EC; color: var(--gold-d); }
    .ic-green { background: var(--green-bg); color: var(--green); }
    .ic-purple { background: var(--purple-bg); color: var(--purple); }
    .stat-val { font-size: 20px; font-weight: 700; color: var(--navy); line-height: 1; margin-bottom: 3px; }
    .stat-unit { font-size: 12px; font-weight: 500; color: var(--muted); }
    .stat-lbl { font-size: 12px; color: var(--muted); font-weight: 500; }

    /* ── Cards ── */
    .main-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px; }
    .card {
      background: #fff; border-radius: var(--r); padding: 20px 22px;
      box-shadow: var(--shadow-sm); border: 1px solid #e8edf5;
    }
    .card-wide { margin-bottom: 16px; }
    .card-hdr { display: flex; align-items: center; gap: 12px; margin-bottom: 18px; padding-bottom: 14px; border-bottom: 1px solid var(--surf2); }
    .card-ico {
      width: 38px; height: 38px; border-radius: 10px; flex-shrink: 0;
      display: flex; align-items: center; justify-content: center;
      background: var(--surf2); color: var(--navy);
    }
    .card-ico .mi { font-size: 18px; }
    .ic-blue-bg { background: var(--blue-bg); color: var(--blue); }
    .ic-green-bg { background: var(--green-bg); color: var(--green); }
    .ic-amber-bg { background: var(--amber-bg); color: var(--amber); }
    .card-hdr-text { flex: 1; }
    .card-title { font-size: 14px; font-weight: 700; color: var(--navy); }
    .card-sub { font-size: 12px; color: var(--muted); margin-top: 1px; }
    .card-action {
      width: 32px; height: 32px; border-radius: 8px; background: var(--surf2);
      display: flex; align-items: center; justify-content: center;
      color: var(--navy); text-decoration: none; font-size: 18px;
      transition: all .15s;
    }
    .card-action:hover { background: var(--navy); color: var(--gold); }

    /* ── Info grid ── */
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
    .info-item.full { grid-column: 1 / -1; }
    .info-lbl { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: .6px; color: var(--muted); margin-bottom: 4px; }
    .info-val { font-size: 13.5px; font-weight: 500; color: #334155; }
    .doc-num { font-family: 'DM Mono', monospace; font-size: 13px; background: var(--surf2); padding: 2px 8px; border-radius: 6px; display: inline-block; }

    /* ── Baux ── */
    .bail-empty { text-align: center; padding: 24px; color: var(--muted); font-size: 13px; display: flex; flex-direction: column; align-items: center; gap: 8px; }
    .btn-link { color: var(--blue); font-size: 13px; font-weight: 600; text-decoration: none; }
    .bail-list { display: flex; flex-direction: column; gap: 10px; }
    .bail-card {
      display: flex; align-items: center; justify-content: space-between;
      padding: 12px 14px; border-radius: 11px; background: var(--surf);
      border: 1px solid var(--border); transition: all .15s;
    }
    .bail-card:hover { border-color: var(--blue); background: var(--blue-bg); }
    .bail-left { display: flex; align-items: center; gap: 12px; }
    .bail-code {
      font-family: 'DM Mono', monospace; font-size: 11px; font-weight: 500;
      background: var(--navy); color: var(--gold); padding: 4px 9px;
      border-radius: 7px; letter-spacing: .5px;
    }
    .bail-num { font-size: 13px; font-weight: 600; color: var(--navy); }
    .bail-loyer { font-size: 13px; font-weight: 700; color: var(--green); margin-top: 1px; }
    .bail-freq { font-size: 11px; font-weight: 400; color: var(--muted); }
    .bail-right { display: flex; align-items: center; gap: 10px; }
    .bail-badge { background: var(--green-bg); color: var(--green); padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 700; }
    .bail-link { width: 30px; height: 30px; border-radius: 8px; background: var(--surf2); display: flex; align-items: center; justify-content: center; color: var(--muted); text-decoration: none; font-size: 16px; transition: all .15s; }
    .bail-link:hover { background: var(--navy); color: var(--gold); }

    /* ── Documents ── */
    .doc-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 12px; }
    .doc-card {
      display: flex; align-items: center; gap: 12px;
      padding: 12px 14px; border-radius: 11px; background: var(--surf);
      border: 1px solid var(--border); text-decoration: none;
      transition: all .15s;
    }
    .doc-card:hover { border-color: var(--blue); background: var(--blue-bg); transform: translateY(-1px); }
    .doc-icon-wrap { width: 40px; height: 40px; border-radius: 10px; background: #fff; border: 1px solid var(--border); display: flex; align-items: center; justify-content: center; flex-shrink: 0; color: var(--navy); font-size: 20px; }
    .doc-info { flex: 1; min-width: 0; }
    .doc-name { font-size: 13px; font-weight: 600; color: #334155; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .doc-type { font-size: 11px; color: var(--muted); margin-top: 2px; }
    .doc-dl { font-size: 18px; color: var(--muted); flex-shrink: 0; }
    .doc-card:hover .doc-dl { color: var(--blue); }

    /* ── Notes ── */
    .notes-card .notes-text { font-size: 14px; line-height: 1.7; color: #475569; margin: 0; padding: 4px 0; }

    /* ── Skeleton ── */
    .skeleton-page { max-width: 1080px; margin: 0 auto; }
    .sk-hero { height: 200px; border-radius: var(--r); background: linear-gradient(90deg, #e2e8f0 25%, #f1f5f9 50%, #e2e8f0 75%); background-size: 200% 100%; animation: shimmer 1.4s infinite; margin-bottom: 20px; }
    .sk-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .sk-card { height: 280px; border-radius: var(--r); background: linear-gradient(90deg, #e2e8f0 25%, #f1f5f9 50%, #e2e8f0 75%); background-size: 200% 100%; animation: shimmer 1.4s infinite; }
    @keyframes shimmer { to { background-position: -200% 0; } }

    /* ── Responsive ── */
    @media (max-width: 900px) {
      .stats-row { grid-template-columns: 1fr 1fr; }
      .main-grid { grid-template-columns: 1fr; }
    }
    @media (max-width: 600px) {
      .stats-row { grid-template-columns: 1fr 1fr; }
      .hero-body { flex-direction: column; align-items: flex-start; }
      .hero-actions { width: 100%; }
    }
  `]
})
export class LocataireDetailComponent implements OnInit {
  private svc   = inject(LocatairesService);
  private route = inject(ActivatedRoute);
  loc: any = null;
  editMode = false;

  ngOnInit() {
    this.svc.getById(this.route.snapshot.params['id']).subscribe((d: any) => this.loc = d);
  }

  initials(): string {
    return (this.loc?.nomComplet ?? '?')
      .split(' ').slice(0, 2).map((n: string) => n[0]).join('').toUpperCase();
  }

  totalLoyers(): number {
    return (this.loc?.contratsActifs ?? []).reduce((s: number, c: any) => s + (c.loyer ?? 0), 0);
  }

  anciennete(): string {
    if (!this.loc?.creeLe) return '—';
    const months = Math.floor((Date.now() - new Date(this.loc.creeLe).getTime()) / (1000 * 60 * 60 * 24 * 30));
    if (months < 1) return '< 1 mois';
    if (months < 12) return `${months} mois`;
    const years = Math.floor(months / 12);
    const rem = months % 12;
    return rem > 0 ? `${years}a ${rem}m` : `${years} an${years > 1 ? 's' : ''}`;
  }

  docIcon(filename: string): string {
    const ext = filename?.split('.').pop()?.toLowerCase() ?? '';
    if (['pdf'].includes(ext)) return 'picture_as_pdf';
    if (['jpg', 'jpeg', 'png', 'webp'].includes(ext)) return 'image';
    if (['doc', 'docx'].includes(ext)) return 'description';
    if (['xls', 'xlsx'].includes(ext)) return 'table_chart';
    return 'insert_drive_file';
  }
}