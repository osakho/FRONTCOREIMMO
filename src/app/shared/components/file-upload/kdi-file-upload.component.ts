import { Component, Input, Output, EventEmitter, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FichiersService, FichierMetaDto, FichierContenuDto, RoleFichier } from '../../core/services/api.services';

/**
 * Composant réutilisable d'upload de fichier en base64.
 *
 * Usage :
 * <kdi-file-upload
 *   entiteType="Proprietaire"
 *   [entiteId]="proprietaireId"
 *   role="PhotoIdentite"
 *   accept="image/*"
 *   label="Photo d'identité"
 *   (uploaded)="onPhotoUploaded($event)"
 * />
 */
@Component({
  selector: 'kdi-file-upload',
  standalone: true,
  imports: [CommonModule],
  template: `
<div class="fu-wrap">
  <div class="fu-label" *ngIf="label">{{ label }}</div>

  <!-- Zone de dépôt -->
  <div class="fu-zone"
       [class.fu-drag]="dragging"
       [class.fu-done]="preview()"
       (click)="input.click()"
       (dragover)="$event.preventDefault(); dragging=true"
       (dragleave)="dragging=false"
       (drop)="onDrop($event)">

    <input #input type="file" [accept]="accept" style="display:none" (change)="onFileChange($event)"/>

    <!-- Aperçu image -->
    <img *ngIf="preview() && isImage()" [src]="preview()" class="fu-img-preview" alt="aperçu"/>

    <!-- Aperçu document -->
    <div *ngIf="preview() && !isImage()" class="fu-doc-preview">
      <svg viewBox="0 0 24 24" fill="none"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
      <span class="fu-doc-name">{{ fileName() }}</span>
      <span class="fu-doc-size">{{ taille() }}</span>
    </div>

    <!-- Placeholder -->
    <div *ngIf="!preview()" class="fu-placeholder">
      <svg viewBox="0 0 24 24" fill="none"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
      <span>Cliquer ou glisser un fichier ici</span>
      <small>{{ acceptLabel }}</small>
    </div>
  </div>

  <!-- Progression upload -->
  <div class="fu-uploading" *ngIf="uploading()">
    <div class="fu-spinner"></div> Enregistrement en base…
  </div>

  <!-- Erreur -->
  <div class="fu-error" *ngIf="erreur()">{{ erreur() }}</div>

  <!-- Fichiers déjà enregistrés -->
  <div class="fu-list" *ngIf="fichiersExistants().length > 0">
    <div class="fu-list-title">Fichiers enregistrés</div>
    <div class="fu-item" *ngFor="let f of fichiersExistants()">
      <svg viewBox="0 0 16 16" fill="none"><path d="M9 2H4a1 1 0 00-1 1v10a1 1 0 001 1h8a1 1 0 001-1V6l-4-4z" stroke="currentColor" stroke-width="1.2"/><path d="M9 2v4h4" stroke="currentColor" stroke-width="1.2"/></svg>
      <span class="fu-item-name">{{ f.nomFichier }}</span>
      <span class="fu-item-size">{{ svc.formatTaille(f.tailleOctets) }}</span>
      <button class="fu-dl" (click)="telecharger(f.id)" title="Télécharger">↓</button>
      <button class="fu-del" (click)="supprimer(f.id)" title="Supprimer">✕</button>
    </div>
  </div>
</div>
  `,
  styles: [`
    :host { display:block; }
    .fu-wrap { display:flex; flex-direction:column; gap:8px; }
    .fu-label { font-size:12px; font-weight:700; color:#475569; }
    .fu-zone { border:2px dashed #E2E8F0; border-radius:10px; padding:24px; text-align:center; cursor:pointer; transition:all .18s; background:#fff; }
    .fu-zone:hover, .fu-drag { border-color:#C9A84C; background:rgba(201,168,76,.04); }
    .fu-done { border-color:#16a34a; border-style:solid; }
    .fu-img-preview { max-height:140px; max-width:100%; border-radius:8px; object-fit:contain; }
    .fu-placeholder { display:flex; flex-direction:column; align-items:center; gap:6px; color:#94a3b8; }
    .fu-placeholder svg { width:32px; height:32px; }
    .fu-placeholder span { font-size:13px; }
    .fu-placeholder small { font-size:11px; }
    .fu-doc-preview { display:flex; align-items:center; gap:8px; justify-content:center; color:#475569; }
    .fu-doc-preview svg { width:28px; height:28px; color:#C9A84C; }
    .fu-doc-name { font-size:13px; font-weight:600; max-width:200px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    .fu-doc-size { font-size:11px; color:#94a3b8; }
    .fu-uploading { display:flex; align-items:center; gap:8px; font-size:12px; color:#475569; }
    .fu-spinner { width:14px; height:14px; border:2px solid #E2E8F0; border-top-color:#0D1B2A; border-radius:50%; animation:spin .7s linear infinite; }
    @keyframes spin { to { transform:rotate(360deg); } }
    .fu-error { font-size:12px; color:#dc2626; }
    .fu-list { border:1px solid #E2E8F0; border-radius:8px; overflow:hidden; }
    .fu-list-title { font-size:10.5px; font-weight:700; color:#94a3b8; text-transform:uppercase; letter-spacing:.5px; padding:6px 10px; background:#F5F7FA; }
    .fu-item { display:flex; align-items:center; gap:8px; padding:7px 10px; border-top:1px solid #F0F4F8; font-size:12.5px; }
    .fu-item svg { width:14px; height:14px; color:#C9A84C; flex-shrink:0; }
    .fu-item-name { flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    .fu-item-size { color:#94a3b8; font-size:11px; flex-shrink:0; }
    .fu-dl, .fu-del { background:none; border:none; cursor:pointer; font-size:13px; padding:2px 5px; border-radius:4px; }
    .fu-dl { color:#1d4ed8; } .fu-dl:hover { background:#dbeafe; }
    .fu-del { color:#dc2626; } .fu-del:hover { background:#fee2e2; }
  `]
})
export class KdiFileUploadComponent {
  @Input() entiteId!:   string;
  @Input() entiteType!: string;
  @Input() role!:       RoleFichier;
  @Input() accept     = '*/*';
  @Input() label      = '';
  @Input() multiple   = false;
  @Input() acceptLabel = 'Tous types de fichiers';

  @Output() uploaded = new EventEmitter<FichierMetaDto>();

  svc       = inject(FichiersService);
  dragging  = false;
  preview   = signal<string | null>(null);
  fileName  = signal('');
  taille    = signal('');
  uploading = signal(false);
  erreur    = signal('');
  fichiersExistants = signal<FichierMetaDto[]>([]);

  private currentMime = '';

  ngOnInit() {
    if (this.entiteId) this.chargerFichiers();
  }

  chargerFichiers() {
    this.svc.getParEntite(this.entiteType, this.entiteId, this.role)
      .subscribe({ next: f => this.fichiersExistants.set(f), error: () => {} });
  }

  isImage(): boolean {
    return this.currentMime.startsWith('image/');
  }

  onFileChange(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (file) this.traiterFichier(file);
  }

  onDrop(e: DragEvent) {
    e.preventDefault();
    this.dragging = false;
    const file = e.dataTransfer?.files?.[0];
    if (file) this.traiterFichier(file);
  }

  private traiterFichier(file: File) {
    this.erreur.set('');
    this.currentMime = file.type;
    this.fileName.set(file.name);
    this.taille.set(this.svc.formatTaille(file.size));

    // Aperçu local immédiat
    const reader = new FileReader();
    reader.onload = () => this.preview.set(reader.result as string);
    reader.readAsDataURL(file);

    // Upload vers la base
    if (this.entiteId) {
      this.uploading.set(true);
      this.svc.uploadFile(this.entiteId, this.entiteType, this.role, file).subscribe({
        next: meta => {
          this.uploading.set(false);
          this.uploaded.emit(meta);
          this.chargerFichiers();
        },
        error: () => {
          this.uploading.set(false);
          this.erreur.set('Erreur lors de l\'enregistrement du fichier.');
        }
      });
    }
  }

  telecharger(id: string) { this.svc.telecharger(id); }

  supprimer(id: string) {
    if (!confirm('Supprimer ce fichier ?')) return;
    this.svc.supprimer(id).subscribe({
      next: () => this.chargerFichiers(),
      error: () => this.erreur.set('Erreur lors de la suppression.')
    });
  }
}
