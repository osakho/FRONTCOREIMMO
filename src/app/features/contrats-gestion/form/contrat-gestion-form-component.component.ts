import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'kdi-contrat-gestion-form-component',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `<div style="padding:24px"><h2 style="color:#0c1a35">ContratGestionFormComponent</h2><p style="color:#64748b;margin:12px 0">Module en cours d\'implémentation.</p><a routerLink="/contrats-gestion" style="color:#0c1a35;font-weight:500">← Retour</a></div>`
})
export class ContratGestionFormComponent { }
