import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule, DatePipe }              from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { AgendaService }                       from '../../../core/services/api.services';
import { EvenementAgendaDto, EvenementCreateDto, TypeEvenement } from '../../../core/models/models';

@Component({
  selector: 'kdi-agenda',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, DatePipe],
  template: `
<div class="page">

  <!-- ── Header ── -->
  <div class="page-header">
    <div>
      <h2 class="page-title">Agenda de l'Agence</h2>
      <p class="page-subtitle">Rendez-vous, visites, réunions et deadlines</p>
    </div>
    <div class="header-actions">
      <button class="btn btn-primary" (click)="openForm()">＋ Nouvel événement</button>
    </div>
  </div>

  <div class="agenda-layout">

    <!-- ── Colonne gauche : calendrier + légende ── -->
    <div class="aside-col">

      <!-- Mini calendrier -->
      <div class="cal-card">
        <div class="cal-header">
          <button class="cal-nav" (click)="prevMonth()">‹</button>
          <span class="cal-month">{{ monthLabel }}</span>
          <button class="cal-nav" (click)="nextMonth()">›</button>
        </div>
        <div class="cal-grid">
          <div class="cal-dname" *ngFor="let d of dayNames">{{ d }}</div>
          <div class="cal-day"
            *ngFor="let cell of calCells"
            [class.other-month]="!cell.current"
            [class.today]="cell.isToday"
            [class.has-event]="cell.hasEvent"
            [class.selected]="cell.date === selectedDate"
            (click)="selectDate(cell)">
            {{ cell.day }}
          </div>
        </div>
        <div class="legende">
          <div class="leg-item"><span class="leg-dot dot-visite"></span> Visite</div>
          <div class="leg-item"><span class="leg-dot dot-travaux"></span> Travaux</div>
          <div class="leg-item"><span class="leg-dot dot-rdv"></span> RDV</div>
          <div class="leg-item"><span class="leg-dot dot-deadline"></span> Deadline</div>
          <div class="leg-item"><span class="leg-dot dot-reunion"></span> Réunion</div>
        </div>
      </div>

      <!-- Résumé rapide -->
      <div class="quick-stats">
        <div class="qs-item"><span class="qs-val text-gold">{{ total }}</span><span class="qs-lbl">Ce mois</span></div>
        <div class="qs-item"><span class="qs-val text-blue">{{ nbVisites }}</span><span class="qs-lbl">Visites</span></div>
        <div class="qs-item"><span class="qs-val text-red">{{ nbDeadlines }}</span><span class="qs-lbl">Deadlines</span></div>
      </div>
    </div>

    <!-- ── Colonne droite : liste événements ── -->
    <div class="events-col">
      <div class="events-header">
        <span class="events-title">{{ selectedDate ? 'Événements du ' + (selectedDate | date:'EEEE d MMMM':'':'fr') : 'Tous les événements' }}</span>
        <div class="tab-group">
          <button class="tab-btn" [class.active]="filtreType === ''"          (click)="filtreType = ''">Tous</button>
          <button class="tab-btn" [class.active]="filtreType === 'Visite'"    (click)="filtreType = 'Visite'">Visites</button>
          <button class="tab-btn" [class.active]="filtreType === 'Travaux'"   (click)="filtreType = 'Travaux'">Travaux</button>
          <button class="tab-btn" [class.active]="filtreType === 'RDV'"       (click)="filtreType = 'RDV'">RDV</button>
          <button class="tab-btn" [class.active]="filtreType === 'Deadline'"  (click)="filtreType = 'Deadline'">Deadlines</button>
        </div>
      </div>

      <div *ngIf="groupedEvents.length; else noEvents">
        <div class="day-group" *ngFor="let g of groupedEvents">
          <div class="day-label">{{ g.date | date:'EEEE d MMMM yyyy':'':'fr' | titlecase }}</div>
          <div class="event-item" *ngFor="let e of g.events"
            [ngClass]="'ev-' + e.type.toLowerCase()">
            <div class="ev-time">{{ e.heure ?? '—' }}</div>
            <div class="ev-body">
              <div class="ev-titre">{{ e.titre }}</div>
              <div class="ev-detail text-muted small">
                <span *ngIf="e.proprieteTitre">📍 {{ e.proprieteTitre }}</span>
                <span *ngIf="e.notes"> · {{ e.notes }}</span>
              </div>
            </div>
            <span class="badge" [ngClass]="typeClass(e.type)">{{ e.typeLabel }}</span>
            <button class="btn-rm" title="Supprimer" (click)="deleteEvent(e)">✕</button>
          </div>
        </div>
      </div>

      <ng-template #noEvents>
        <div class="empty-state">
          <span class="empty-icon">📅</span>
          <p>Aucun événement{{ selectedDate ? ' ce jour' : '' }}</p>
          <button class="btn btn-primary" (click)="openForm()">Ajouter un événement</button>
        </div>
      </ng-template>
    </div>
  </div>

  <!-- ── Modal Nouvel Événement ── -->
  <div class="modal-overlay" *ngIf="showForm" (click)="closeForm()">
    <div class="modal" (click)="$event.stopPropagation()">
      <div class="modal-header">
        <div class="modal-title">📅 Nouvel événement</div>
        <button class="modal-close" (click)="closeForm()">×</button>
      </div>
      <form [formGroup]="form" (ngSubmit)="submit()">
        <div class="modal-body">
          <div class="form-group">
            <label>Titre *</label>
            <input formControlName="titre" class="form-control" placeholder="Ex: Visite état des lieux — Appt 7C">
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Type *</label>
              <select formControlName="type" class="form-control">
                <option value="RDV">📅 RDV</option>
                <option value="Visite">🏠 Visite</option>
                <option value="Travaux">🔧 Travaux</option>
                <option value="Deadline">⚠️ Deadline</option>
                <option value="Reunion">👥 Réunion</option>
                <option value="Autre">📌 Autre</option>
              </select>
            </div>
            <div class="form-group">
              <label>Propriété (optionnel)</label>
              <input formControlName="proprieteId" class="form-control" placeholder="ID ou nom propriété">
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Date *</label>
              <input formControlName="date" type="date" class="form-control">
            </div>
            <div class="form-group">
              <label>Heure</label>
              <input formControlName="heure" type="time" class="form-control">
            </div>
          </div>
          <div class="form-group">
            <label>Notes</label>
            <textarea formControlName="notes" class="form-control" rows="3" placeholder="Informations complémentaires…"></textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" (click)="closeForm()">Annuler</button>
          <button type="submit" class="btn btn-primary" [disabled]="form.invalid || submitting">
            {{ submitting ? 'Enregistrement…' : '✅ Enregistrer' }}
          </button>
        </div>
      </form>
    </div>
  </div>

</div>
  `,
  styles: [`
    .page { max-width: 1200px; margin: 0 auto; }
    .page-header { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 24px; }
    .page-title { font-size: 24px; font-weight: 700; color: #0c1a35; margin: 0 0 4px; }
    .page-subtitle { font-size: 14px; color: #64748b; margin: 0; }
    .header-actions { display: flex; gap: 8px; }
    .btn { padding: 9px 18px; border-radius: 8px; font-size: 14px; font-weight: 500; cursor: pointer; border: none; display: inline-flex; align-items: center; gap: 6px; transition: opacity .2s; }
    .btn:disabled { opacity:.5; cursor:not-allowed; }
    .btn-primary { background: #0c1a35; color: #fff; }
    .btn-secondary { background: #fff; color: #334155; border: 1px solid #e2e8f0; }
    .btn-sm { padding: 5px 10px; font-size: 12px; }

    .agenda-layout { display: grid; grid-template-columns: 280px 1fr; gap: 20px; }

    /* Calendrier */
    .cal-card { background: #fff; border-radius: 12px; padding: 16px; box-shadow: 0 1px 4px rgba(0,0,0,.06); margin-bottom: 12px; }
    .cal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
    .cal-month { font-size: 14px; font-weight: 700; color: #0c1a35; }
    .cal-nav { background: none; border: 1px solid #e2e8f0; border-radius: 6px; width: 28px; height: 28px; cursor: pointer; font-size: 16px; display: flex; align-items: center; justify-content: center; color: #64748b; transition: all .15s; }
    .cal-nav:hover { background: #f1f5f9; color: #0c1a35; }
    .cal-grid { display: grid; grid-template-columns: repeat(7,1fr); gap: 2px; }
    .cal-dname { text-align: center; font-size: 10px; color: #94a3b8; padding: 4px 0; font-weight: 600; }
    .cal-day { text-align: center; font-size: 12px; padding: 6px 2px; border-radius: 6px; cursor: pointer; color: #334155; transition: all .15s; position: relative; }
    .cal-day:hover { background: #f1f5f9; }
    .cal-day.today { background: #0c1a35; color: #fff; font-weight: 700; }
    .cal-day.selected { background: #c8a96e; color: #fff; font-weight: 700; }
    .cal-day.other-month { color: #cbd5e1; }
    .cal-day.has-event::after { content: ''; position: absolute; bottom: 2px; left: 50%; transform: translateX(-50%); width: 4px; height: 4px; border-radius: 50%; background: #3b82f6; }
    .cal-day.today.has-event::after { background: #c8a96e; }

    .legende { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; padding-top: 12px; border-top: 1px solid #f1f5f9; }
    .leg-item { display: flex; align-items: center; gap: 5px; font-size: 11px; color: #64748b; }
    .leg-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
    .dot-visite { background: #3b82f6; } .dot-travaux { background: #f59e0b; }
    .dot-rdv { background: #c8a96e; } .dot-deadline { background: #ef4444; } .dot-reunion { background: #8b5cf6; }

    .quick-stats { background: #fff; border-radius: 12px; padding: 14px; box-shadow: 0 1px 4px rgba(0,0,0,.06); display: flex; justify-content: space-around; }
    .qs-item { display: flex; flex-direction: column; align-items: center; gap: 2px; }
    .qs-val { font-size: 20px; font-weight: 700; }
    .qs-lbl { font-size: 10px; color: #94a3b8; text-transform: uppercase; letter-spacing: .5px; }
    .text-gold { color: #c8a96e; } .text-blue { color: #3b82f6; } .text-red { color: #ef4444; }
    .text-muted { color: #94a3b8; } .small { font-size: 12px; }

    /* Events */
    .events-col { background: #fff; border-radius: 12px; box-shadow: 0 1px 4px rgba(0,0,0,.06); overflow: hidden; }
    .events-header { padding: 16px 20px; border-bottom: 1px solid #f1f5f9; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; }
    .events-title { font-size: 14px; font-weight: 700; color: #0c1a35; }
    .tab-group { display: flex; background: #f1f5f9; border-radius: 8px; padding: 3px; }
    .tab-btn { padding: 5px 10px; border-radius: 6px; border: none; background: none; cursor: pointer; font-size: 12px; color: #64748b; transition: all .15s; }
    .tab-btn.active { background: #fff; color: #0c1a35; font-weight: 600; box-shadow: 0 1px 2px rgba(0,0,0,.1); }

    .day-group { padding: 0 20px; margin-bottom: 4px; }
    .day-label { font-size: 11px; font-weight: 700; color: #c8a96e; letter-spacing: 1px; text-transform: uppercase; padding: 14px 0 8px; }
    .event-item { display: flex; align-items: center; gap: 12px; padding: 10px 14px; border-radius: 8px; margin-bottom: 6px; background: #f8fafc; border-left: 3px solid #e2e8f0; transition: border-color .2s; }
    .event-item:hover { border-left-color: #c8a96e; }
    .ev-rdv        { border-left-color: #c8a96e !important; background: #fffdf7; }
    .ev-visite     { border-left-color: #3b82f6 !important; background: #f0f7ff; }
    .ev-travaux    { border-left-color: #f59e0b !important; background: #fffbf0; }
    .ev-deadline   { border-left-color: #ef4444 !important; background: #fff5f5; }
    .ev-reunion    { border-left-color: #8b5cf6 !important; background: #faf5ff; }
    .ev-time { font-size: 12px; color: #94a3b8; width: 40px; flex-shrink: 0; }
    .ev-body { flex: 1; }
    .ev-titre { font-size: 13px; font-weight: 500; color: #0f172a; }
    .ev-detail { margin-top: 3px; }
    .btn-rm { background: none; border: none; cursor: pointer; color: #cbd5e1; font-size: 14px; padding: 0 4px; transition: color .15s; }
    .btn-rm:hover { color: #ef4444; }

    .badge { font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 20px; text-transform: uppercase; letter-spacing: .5px; flex-shrink: 0; }
    .badge-rdv      { background: #fffbeb; color: #c8a96e; }
    .badge-visite   { background: #eff6ff; color: #2563eb; }
    .badge-travaux  { background: #fffbeb; color: #d97706; }
    .badge-deadline { background: #fef2f2; color: #dc2626; }
    .badge-reunion  { background: #f5f3ff; color: #7c3aed; }
    .badge-autre    { background: #f1f5f9; color: #475569; }

    .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.5); backdrop-filter: blur(3px); z-index: 200; display: flex; align-items: center; justify-content: center; }
    .modal { background: #fff; border-radius: 16px; width: 560px; max-height: 90vh; overflow-y: auto; box-shadow: 0 20px 60px rgba(0,0,0,.2); animation: slideUp .2s ease; }
    @keyframes slideUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
    .modal-header { padding: 20px 24px; border-bottom: 1px solid #f1f5f9; display: flex; align-items: center; justify-content: space-between; }
    .modal-title { font-size: 16px; font-weight: 700; color: #0c1a35; }
    .modal-close { background: none; border: none; font-size: 22px; cursor: pointer; color: #94a3b8; line-height: 1; }
    .modal-body { padding: 24px; }
    .modal-footer { padding: 16px 24px; border-top: 1px solid #f1f5f9; display: flex; justify-content: flex-end; gap: 10px; }
    .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .form-group { display: flex; flex-direction: column; gap: 6px; margin-bottom: 14px; }
    label { font-size: 13px; font-weight: 500; color: #374151; }
    .form-control { padding: 9px 12px; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 14px; font-family: inherit; }
    .form-control:focus { outline: none; border-color: #c8a96e; }
    textarea.form-control { resize: vertical; }

    .empty-state { display: flex; flex-direction: column; align-items: center; padding: 60px; gap: 12px; color: #94a3b8; text-align: center; }
    .empty-icon { font-size: 48px; }
  `]
})
export class AgendaComponent implements OnInit {
  private svc = inject(AgendaService);
  private fb  = inject(FormBuilder);

  evenements:  EvenementAgendaDto[] = [];
  filtreType   = '';
  selectedDate = '';
  showForm     = false;
  submitting   = false;

  // Calendrier
  today      = new Date();
  viewYear   = this.today.getFullYear();
  viewMonth  = this.today.getMonth();
  dayNames   = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

  get monthLabel() {
    return new Date(this.viewYear, this.viewMonth, 1)
      .toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  }

  get total()       { return this.evenements.length; }
  get nbVisites()   { return this.evenements.filter(e => e.type === 'Visite').length; }
  get nbDeadlines() { return this.evenements.filter(e => e.type === 'Deadline').length; }

  get calCells() {
    const first = new Date(this.viewYear, this.viewMonth, 1);
    const last  = new Date(this.viewYear, this.viewMonth + 1, 0);
    let dow = first.getDay(); // 0=dim
    dow = dow === 0 ? 6 : dow - 1; // lundi = 0

    const cells: { day: number; date: string; current: boolean; isToday: boolean; hasEvent: boolean }[] = [];

    // jours mois précédent
    const prevLast = new Date(this.viewYear, this.viewMonth, 0).getDate();
    for (let i = dow - 1; i >= 0; i--) {
      const d = prevLast - i;
      cells.push({ day: d, date: '', current: false, isToday: false, hasEvent: false });
    }
    // jours du mois
    for (let d = 1; d <= last.getDate(); d++) {
      const dateStr = `${this.viewYear}-${String(this.viewMonth + 1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      const isToday = d === this.today.getDate() && this.viewMonth === this.today.getMonth() && this.viewYear === this.today.getFullYear();
      const hasEvent = this.evenements.some(e => e.date.startsWith(dateStr));
      cells.push({ day: d, date: dateStr, current: true, isToday, hasEvent });
    }
    // compléter 6 semaines
    const rem = 42 - cells.length;
    for (let d = 1; d <= rem; d++) cells.push({ day: d, date: '', current: false, isToday: false, hasEvent: false });
    return cells;
  }

  get groupedEvents() {
    let list = this.evenements;
    if (this.filtreType)  list = list.filter(e => e.type === this.filtreType);
    if (this.selectedDate) list = list.filter(e => e.date.startsWith(this.selectedDate));

    const map = new Map<string, EvenementAgendaDto[]>();
    list.forEach(e => {
      const k = e.date.substring(0, 10);
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(e);
    });
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, events]) => ({ date, events: events.sort((a,b) => (a.heure??'').localeCompare(b.heure??'')) }));
  }

  form = this.fb.group({
    titre:      ['', Validators.required],
    type:       ['RDV', Validators.required],
    date:       [new Date().toISOString().substring(0,10), Validators.required],
    heure:      [''],
    proprieteId:[''],
    notes:      ['']
  });

  ngOnInit() { this.load(); }

  load() {
    this.svc.getAll().subscribe({ next: r => this.evenements = r, error: () => this.evenements = [] });
  }

  prevMonth() { if (this.viewMonth === 0) { this.viewMonth = 11; this.viewYear--; } else this.viewMonth--; }
  nextMonth() { if (this.viewMonth === 11) { this.viewMonth = 0; this.viewYear++; } else this.viewMonth++; }

  selectDate(cell: { date: string; current: boolean }) {
    if (!cell.current) return;
    this.selectedDate = this.selectedDate === cell.date ? '' : cell.date;
  }

  deleteEvent(e: EvenementAgendaDto) {
    this.svc.supprimer(e.id).subscribe(() => this.load());
  }

  openForm()  { this.showForm = true; }
  closeForm() { this.showForm = false; this.form.reset({ type: 'RDV', date: new Date().toISOString().substring(0,10) }); }

  submit() {
    if (this.form.invalid) return;
    this.submitting = true;
    const v = this.form.value as any;
    const payload: EvenementCreateDto = {
      ...v,
      heure:       v.heure       || null,
      proprieteId: v.proprieteId || null,
    };
    this.svc.create(payload).subscribe({
      next: () => { this.submitting = false; this.closeForm(); this.load(); },
      error: () => { this.submitting = false; }
    });
  }

  typeClass(t: TypeEvenement) {
    return {
      'badge-rdv': t === 'RDV', 'badge-visite': t === 'Visite',
      'badge-travaux': t === 'Travaux', 'badge-deadline': t === 'Deadline',
      'badge-reunion': t === 'Reunion', 'badge-autre': t === 'Autre'
    };
  }
}
