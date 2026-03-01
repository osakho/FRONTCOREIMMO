import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { LocatairesService } from '../../../core/services/api.services';
import { LocataireListItemDto, PagedList } from '../../../core/models/models';

@Component({
  selector: 'kdi-locataires-list',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  template: `
    <div class="page">
      <div class="page-header">
        <div><h2 class="page-title">Locataires</h2><p class="page-subtitle">Gestion des locataires et leurs baux</p></div>
        <a routerLink="/locataires/nouveau" class="btn btn-primary">＋ Nouveau locataire</a>
      </div>
      <div class="filters-bar">
        <input type="text" class="search-input" placeholder="🔍 Nom, téléphone, email…"
               [(ngModel)]="searchTerm" (ngModelChange)="onSearch()">
        <select class="filter-select" [(ngModel)]="filtreActif" (ngModelChange)="load()">
          <option value="">Tous</option>
          <option value="true">Actifs</option>
          <option value="false">Inactifs</option>
        </select>
      </div>
      <div class="table-card">
        <table class="data-table" *ngIf="liste().items.length; else empty">
          <thead><tr>
            <th>Locataire</th><th>Téléphone</th><th>Email</th>
            <th class="text-center">Baux actifs</th><th class="text-center">Statut</th>
            <th class="text-center">Inscrit le</th><th></th>
          </tr></thead>
          <tbody>
            <tr *ngFor="let l of liste().items">
              <td><div class="cell-main">{{ l.nomComplet }}</div></td>
              <td>{{ l.telephone }}</td>
              <td class="text-muted">{{ l.email ?? '—' }}</td>
              <td class="text-center">
                <span class="badge" [class.badge-blue]="l.nbContratsActifs>0" [class.badge-gray]="l.nbContratsActifs===0">
                  {{ l.nbContratsActifs }}
                </span>
              </td>
              <td class="text-center">
                <span class="badge" [class.badge-green]="l.estActif" [class.badge-gray]="!l.estActif">
                  {{ l.estActif ? 'Actif' : 'Inactif' }}
                </span>
              </td>
              <td class="text-center text-muted">{{ l.creeLe | date:'dd/MM/yyyy' }}</td>
              <td>
                <div class="row-actions">
                  <a [routerLink]="['/locataires', l.id]" class="btn-icon" title="Voir">👁</a>
                  <a [routerLink]="['/contrats-location']" [queryParams]="{locataireId:l.id}"
                     class="btn-icon" title="Voir les baux">📋</a>
                  <button class="btn-alerte" (click)="ouvrirAlerte(l)"
                          title="Envoyer un rappel">
                    🔔 Rappel
                  </button>
                  <button class="btn-action btn-supprimer"
                          [disabled]="l.nbContratsActifs > 0"
                          [title]="l.nbContratsActifs > 0 ? 'Contrat actif en cours' : 'Supprimer'"
                          (click)="supprimer(l.id, l.nomComplet)">
                    🗑
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
        <ng-template #empty>
          <div class="empty-state"><span class="empty-icon">🧑‍🤝‍🧑</span><p>Aucun locataire trouvé</p>
            <a routerLink="/locataires/nouveau" class="btn btn-primary">Créer le premier</a></div>
        </ng-template>
      </div>
      <div class="pagination" *ngIf="liste().totalPages > 1">
        <button [disabled]="page===1" (click)="goPage(page-1)" class="page-btn">‹</button>
        <span class="page-info">{{ page }} / {{ liste().totalPages }}</span>
        <button [disabled]="!liste().hasNext" (click)="goPage(page+1)" class="page-btn">›</button>
      </div>
    </div>

    <!-- ── Modal : Alerte locataire ── -->
    <div class="overlay" *ngIf="showAlerte" (click)="fermerAlerte()">
      <div class="modal" (click)="$event.stopPropagation()">
        <h3 class="modal-title">🔔 Envoyer un rappel</h3>
        <p class="modal-sub" *ngIf="locataireSelectionne">
          {{ locataireSelectionne.nomComplet }}
          <span *ngIf="locataireSelectionne.nbContratsActifs === 0" class="badge badge-gray">Pas de bail actif</span>
        </p>

        <div class="fg">
          <label>Message personnalisé (optionnel)</label>
          <textarea class="fc" rows="4" [(ngModel)]="formAlerte.message"
                    placeholder="Laissez vide pour utiliser le message par défaut…"></textarea>
        </div>

        <div class="notif-box">
          <div class="notif-title">📣 Canaux de notification</div>
          <div class="notif-opts">
            <label class="notif-opt">
              <input type="checkbox" [(ngModel)]="formAlerte.whatsapp"> 💬 WhatsApp
            </label>
            <label class="notif-opt">
              <input type="checkbox" [(ngModel)]="formAlerte.email"
                     [disabled]="!locataireSelectionne?.email">
              📧 Email
              <small *ngIf="!locataireSelectionne?.email">(pas d'email)</small>
            </label>
            <label class="notif-opt">
              <input type="checkbox" [(ngModel)]="formAlerte.sms"> 📱 SMS
            </label>
          </div>
        </div>

        <div class="resultat" *ngIf="resultatAlerte">
          <div [class]="resultatAlerte.succes ? 'res-ok' : 'res-err'">
            {{ resultatAlerte.succes ? '✅ Rappel envoyé via : ' + resultatAlerte.canauxEnvoyes.join(', ') : '❌ ' + resultatAlerte.erreur }}
          </div>
        </div>

        <div class="modal-actions">
          <button class="btn btn-ghost" (click)="fermerAlerte()">Fermer</button>
          <button class="btn btn-primary" (click)="envoyerAlerte()"
                  [disabled]="enCours() || (!formAlerte.whatsapp && !formAlerte.email && !formAlerte.sms)">
            {{ enCours() ? '⏳ Envoi…' : '📣 Envoyer le rappel' }}
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .page{max-width:1100px;margin:0 auto}.page-header{display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:24px}.page-title{font-size:24px;font-weight:700;color:#0c1a35;margin:0 0 4px}.page-subtitle{font-size:14px;color:#64748b;margin:0}.btn{padding:9px 18px;border-radius:8px;font-size:14px;font-weight:500;cursor:pointer;border:none;text-decoration:none;display:inline-flex;align-items:center;gap:6px}.btn-primary{background:#0c1a35;color:#fff}.btn-ghost{background:#f1f5f9;color:#475569}.filters-bar{display:flex;gap:12px;margin-bottom:16px}.search-input{flex:1;padding:9px 14px;border:1px solid #e2e8f0;border-radius:8px;font-size:14px}.filter-select{padding:9px 14px;border:1px solid #e2e8f0;border-radius:8px;font-size:14px;background:#fff}.table-card{background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.06)}.data-table{width:100%;border-collapse:collapse}.data-table th{padding:12px 16px;background:#f8fafc;font-size:12px;font-weight:600;color:#64748b;text-align:left;border-bottom:1px solid #e2e8f0}.data-table td{padding:10px 16px;font-size:13px;color:#334155;border-bottom:1px solid #f1f5f9}.data-table tr:hover td{background:#fafbfc}.data-table tr:last-child td{border-bottom:none}.cell-main{font-weight:500;color:#0c1a35}.text-center{text-align:center}.text-muted{color:#94a3b8;font-size:12px}.badge{padding:3px 10px;border-radius:12px;font-size:12px;font-weight:500}.badge-green{background:#d1fae5;color:#065f46}.badge-blue{background:#dbeafe;color:#1d4ed8}.badge-gray{background:#f1f5f9;color:#64748b}.row-actions{display:flex;gap:6px;justify-content:flex-end;align-items:center}.btn-icon{background:none;border:none;cursor:pointer;font-size:16px;padding:4px;border-radius:6px;text-decoration:none}.btn-icon:hover{background:#f1f5f9}
    .btn-alerte{background:#fef3c7;color:#92400e;border:none;cursor:pointer;font-size:11px;font-weight:600;padding:4px 8px;border-radius:6px}
    .btn-alerte:hover{background:#fde68a}
    .btn-action{border:none;cursor:pointer;font-size:14px;padding:4px 8px;border-radius:6px}.btn-supprimer{background:#fee2e2;color:#991b1b}.btn-supprimer:hover:not(:disabled){background:#fecaca}.btn-supprimer:disabled{opacity:.3;cursor:not-allowed}.empty-state{display:flex;flex-direction:column;align-items:center;padding:60px;gap:12px;color:#94a3b8}.empty-icon{font-size:48px}.pagination{display:flex;align-items:center;justify-content:center;gap:12px;margin-top:16px}.page-btn{padding:6px 14px;border:1px solid #e2e8f0;border-radius:6px;background:#fff;cursor:pointer}.page-btn:disabled{opacity:.4}.page-info{font-size:14px;color:#64748b}
    /* Modal */
    .overlay{position:fixed;inset:0;background:rgba(0,0,0,.4);z-index:1000;display:flex;align-items:center;justify-content:center}
    .modal{background:#fff;border-radius:16px;padding:28px;width:480px;max-width:92vw;box-shadow:0 20px 60px rgba(0,0,0,.2)}
    .modal-title{font-size:18px;font-weight:700;color:#0c1a35;margin:0 0 4px}
    .modal-sub{font-size:13px;color:#64748b;margin:0 0 20px;display:flex;align-items:center;gap:8px}
    .fg{display:flex;flex-direction:column;gap:5px;margin-bottom:12px}
    label{font-size:12px;font-weight:500;color:#374151}
    .fc{padding:8px 10px;border:1px solid #e2e8f0;border-radius:7px;font-size:13px;font-family:inherit}
    .notif-box{background:#f8fafc;border-radius:10px;padding:12px;margin:12px 0}
    .notif-title{font-size:12px;font-weight:600;color:#374151;margin-bottom:8px}
    .notif-opts{display:flex;gap:10px;flex-wrap:wrap}
    .notif-opt{display:flex;align-items:center;gap:6px;background:#fff;padding:7px 12px;border-radius:7px;border:1px solid #e2e8f0;cursor:pointer;font-size:12px}
    .notif-opt small{color:#94a3b8}
    .modal-actions{display:flex;justify-content:flex-end;gap:10px;margin-top:20px}
    .resultat{border-radius:8px;padding:10px;margin-top:10px}
    .res-ok{color:#065f46;font-size:13px;font-weight:500}.res-err{color:#991b1b;font-size:13px}
  `]
})
export class LocatairesListComponent implements OnInit {
  private svc = inject(LocatairesService);
  private http = inject(HttpClient);

  liste = signal<PagedList<LocataireListItemDto>>({
    items: [], totalCount: 0, page: 1, pageSize: 20, totalPages: 0, hasNext: false, hasPrevious: false
  });
  enCours = signal(false);
  page = 1; searchTerm = ''; filtreActif = ''; timer: any;

  showAlerte = false;
  locataireSelectionne: LocataireListItemDto | null = null;
  resultatAlerte: any = null;
  formAlerte = { message: '', whatsapp: true, email: true, sms: false };

  ngOnInit() { this.load(); }

  load() {
    const actif = this.filtreActif === '' ? undefined : this.filtreActif === 'true';
    this.svc.getAll(this.page, 20, this.searchTerm || undefined, actif).subscribe(r => this.liste.set(r));
  }

  onSearch() { clearTimeout(this.timer); this.timer = setTimeout(() => { this.page = 1; this.load(); }, 400); }
  goPage(p: number) { this.page = p; this.load(); }

  // supprimer(id: string, nom: string) {
  //   if (!confirm(`Supprimer définitivement ${nom} ?`)) return;
  //   this.svc.supprimer(id).subscribe({
  //     next: () => this.load(),
  //     error: (err) => alert(err?.error?.message ?? 'Erreur lors de la suppression')
  //   });
  // }
  supprimer(id: string, nom: string) {
    if (!confirm(`Supprimer définitivement ${nom} ?`)) return;
    this.svc.supprimer(id).subscribe({
      next: () => {
        // Retirer immédiatement de la liste locale sans attendre le reload
        const current = this.liste();
        this.liste.set({
          ...current,
          items: current.items.filter(l => l.id !== id),
          totalCount: current.totalCount - 1
        });
        // Puis recharger depuis le serveur
        this.load();
      },
      error: (err) => alert(err?.error?.message ?? 'Erreur lors de la suppression')
    });
  }

  ouvrirAlerte(l: LocataireListItemDto) {
    this.locataireSelectionne = l;
    this.formAlerte = { message: '', whatsapp: true, email: !!l.email, sms: false };
    this.resultatAlerte = null;
    this.showAlerte = true;
  }
  
  fermerAlerte() { this.showAlerte = false; this.locataireSelectionne = null; }

  envoyerAlerte() {
    if (!this.locataireSelectionne) return;
    this.enCours.set(true);
    this.http.post<any>(`/api/versements/alerter-locataire/${this.locataireSelectionne.id}`, {
      messagePersonnalise: this.formAlerte.message || null,
      notifierEmail: this.formAlerte.email,
      notifierWhatsApp: this.formAlerte.whatsapp,
      notifierSms: this.formAlerte.sms
    }).subscribe({
      next: r => { this.enCours.set(false); this.resultatAlerte = r.data ?? r; },
      error: e => { this.enCours.set(false); this.resultatAlerte = { succes: false, canauxEnvoyes: [], erreur: e?.error?.message ?? 'Erreur' }; }
    });
  }
}
