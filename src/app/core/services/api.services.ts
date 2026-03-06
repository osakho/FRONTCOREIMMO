import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import {
  ApiResponse, PagedList,
  ProprietaireDto, ProprietaireListItemDto,
  ProprieteDto, ProprieteListItemDto,
  ProduitLocatifDto, ProduitListItemDto,
  ContratGestionDto,
  LocataireDto, LocataireListItemDto,
  ContratLocationDto, ContratLocationListItemDto,
  CollecteDto, RapportCollecteurDto,
  PersonnelListItemDto, DashboardDto,
  StatutContrat, StatutCollecte, TypeProduit, StatutProduit,
  LoginRequest, LoginResponse,
  DashboardProprietairesResult,
  DossierRecouvrementDto, EtapeRecouvrement
} from '../models/models';
import { environment } from '../../../environments/environment';

// ── Base Service ─────────────────────────────────────────────
@Injectable({ providedIn: 'root' })
export class ApiService {
  protected http = inject(HttpClient);
  protected base = environment.apiUrl;

  protected get<T>(path: string, params?: HttpParams): Observable<T> {
    return this.http.get<ApiResponse<T>>(`${this.base}${path}`, { params })
      .pipe(map(r => r.data!));
  }

  protected post<T>(path: string, body: unknown): Observable<T> {
    return this.http.post<ApiResponse<T>>(`${this.base}${path}`, body)
      .pipe(map(r => r.data!));
  }

  protected postForm<T>(path: string, form: FormData): Observable<T> {
    return this.http.post<ApiResponse<T>>(`${this.base}${path}`, form)
      .pipe(map(r => r.data!));
  }

  protected put<T>(path: string, body: unknown): Observable<T> {
    return this.http.put<ApiResponse<T>>(`${this.base}${path}`, body)
      .pipe(map(r => r.data!));
  }

  protected putForm<T>(path: string, form: FormData): Observable<T> {
    return this.http.put<ApiResponse<T>>(`${this.base}${path}`, form)
      .pipe(map(r => r.data!));
  }

  protected patch<T>(path: string, body: unknown): Observable<T> {
    return this.http.patch<ApiResponse<T>>(`${this.base}${path}`, body)
      .pipe(map(r => r.data!));
  }

  protected delete<T>(path: string): Observable<T> {
    return this.http.delete<ApiResponse<T>>(`${this.base}${path}`)
      .pipe(map(r => r.data!));
  }
}

// ══════════════════════════════════════════════════════════════
//  AUTH SERVICE
// ══════════════════════════════════════════════════════════════
@Injectable({ providedIn: 'root' })
export class AuthService extends ApiService {
  login(req: LoginRequest): Observable<LoginResponse> {
    return this.http.post<any>(`${this.base}/auth/login`, req).pipe(
      map(r => r.data)
    );
  }

  logout(): void {
    localStorage.removeItem('kdi_token');
    localStorage.removeItem('kdi_user');
  }

  getToken(): string | null { return localStorage.getItem('kdi_token'); }

  getUser(): any {
    const u = localStorage.getItem('kdi_user');
    try { return u ? JSON.parse(u) : null; }
    catch { return null; }
  }

  isLoggedIn(): boolean  { return !!this.getToken(); }

  // ── Rôles — Pdg hérite de tous les droits Direction ──────────
  isPdg(): boolean       { return this.getUser()?.role === 'Pdg'; }
  isDirection(): boolean { return ['Direction', 'Admin', 'Pdg'].includes(this.getUser()?.role ?? ''); }
  isComptable(): boolean { return ['Comptable', 'Direction', 'Admin', 'Pdg'].includes(this.getUser()?.role ?? ''); }
  isCollecteur(): boolean{ return this.getUser()?.role === 'Collecteur'; }

  saveSession(resp: LoginResponse): void {
    localStorage.setItem('kdi_token', resp.token);
    localStorage.setItem('kdi_user', JSON.stringify(resp.utilisateur));
  }
}

// ══════════════════════════════════════════════════════════════
//  PROPRIÉTAIRES SERVICE
// ══════════════════════════════════════════════════════════════
@Injectable({ providedIn: 'root' })
export class ProprietairesService extends ApiService {
  getAll(page = 1, pageSize = 20, search?: string, estActif?: boolean): Observable<PagedList<ProprietaireListItemDto>> {
    let params = new HttpParams().set('page', page).set('pageSize', pageSize);
    if (search)                 params = params.set('search', search);
    if (estActif !== undefined) params = params.set('estActif', estActif);
    return this.get<PagedList<ProprietaireListItemDto>>('/proprietaires', params);
  }

  getById(id: string): Observable<ProprietaireDto> {
    return this.get<ProprietaireDto>(`/proprietaires/${id}`);
  }

  create(data: FormData): Observable<string> {
    return this.postForm<string>('/proprietaires', data);
  }

  update(id: string, data: FormData): Observable<void> {
    return this.http.put<void>(`${this.base}/proprietaires/${id}`, data);
  }

  addDocument(id: string, data: FormData): Observable<string> {
    return this.postForm<string>(`/proprietaires/${id}/documents`, data);
  }

  getDashboard(opts: {
    page?:         number;
    pageSize?:     number;
    search?:       string;
    sortBy?:       string;
    sortAsc?:      boolean;
    collecteurId?: string;
  } = {}): Observable<DashboardProprietairesResult> {
    let params = new HttpParams()
      .set('page',     opts.page     ?? 1)
      .set('pageSize', opts.pageSize ?? 15)
      .set('sortBy',   opts.sortBy   ?? 'nom')
      .set('sortAsc',  opts.sortAsc  ?? true);
    if (opts.search)       params = params.set('search', opts.search);
    if (opts.collecteurId) params = params.set('collecteurId', opts.collecteurId);
    return this.get<DashboardProprietairesResult>('/proprietaires/dashboard', params);
  }

  buildFormData(req: any, photo?: File): FormData {
    const fd = new FormData();
    Object.entries(req).forEach(([k, v]) => {
      if (v !== undefined && v !== null && k !== 'photoIdentite' && k !== 'comptes' && k !== 'plateformes')
        fd.append(k, v as string);
    });
    if (photo) fd.append('NouvellePhoto', photo);
    (req.comptes ?? []).forEach((c: any, i: number) => {
      Object.entries(c).forEach(([k, v]) => fd.append(`Comptes[${i}].${k}`, v as string));
    });
    (req.plateformes ?? []).forEach((p: any, i: number) => {
      Object.entries(p).forEach(([k, v]) => fd.append(`Plateformes[${i}].${k}`, v as string));
    });
    return fd;
  }
}

// ══════════════════════════════════════════════════════════════
//  PROPRIÉTÉS SERVICE
// ══════════════════════════════════════════════════════════════
@Injectable({ providedIn: 'root' })
export class ProprietesService extends ApiService {
  getAll(page = 1, pageSize = 20, search?: string, proprietaireId?: string): Observable<PagedList<ProprieteListItemDto>> {
    let params = new HttpParams().set('page', page).set('pageSize', pageSize);
    if (search)         params = params.set('search', search);
    if (proprietaireId) params = params.set('proprietaireId', proprietaireId);
    return this.get<PagedList<ProprieteListItemDto>>('/proprietes', params);
  }

  getById(id: string): Observable<ProprieteDto> {
    return this.get<ProprieteDto>(`/proprietes/${id}`);
  }

  create(data: any): Observable<string> {
    return this.post<string>('/proprietes', data);
  }

  update(id: string, data: any): Observable<void> {
    return this.http.put<void>(`${this.base}/proprietes/${id}`, data);
  }

  affecterCollecteur(proprieteId: string, collecteurId: string): Observable<void> {
    return this.post<string>(`/proprietes/${proprieteId}/affecter-collecteur`, { collecteurId })
      .pipe(map(() => void 0));
  }
}

// ══════════════════════════════════════════════════════════════
//  PRODUITS SERVICE
// ══════════════════════════════════════════════════════════════
@Injectable({ providedIn: 'root' })
export class ProduitsService extends ApiService {
  getAll(opts: { page?: number; pageSize?: number; proprieteId?: string; type?: TypeProduit; statut?: StatutProduit; search?: string } = {}): Observable<PagedList<ProduitListItemDto>> {
    let params = new HttpParams().set('page', opts.page ?? 1).set('pageSize', opts.pageSize ?? 50);
    if (opts.proprieteId) params = params.set('proprieteId', opts.proprieteId);
    if (opts.type)        params = params.set('type', opts.type);
    if (opts.statut)      params = params.set('statut', opts.statut);
    if (opts.search)      params = params.set('search', opts.search);
    return this.get<PagedList<ProduitListItemDto>>('/produits', params);
  }

  getById(id: string): Observable<ProduitLocatifDto> {
    return this.get<ProduitLocatifDto>(`/produits/${id}`);
  }

  create(data: any): Observable<string> {
    return this.post<string>('/produits', data);
  }

  createBatch(data: any): Observable<string[]> {
    return this.post<string[]>('/produits/batch', data);
  }

  updateLoyer(id: string, loyer: number): Observable<void> {
    return this.http.patch<void>(`${this.base}/produits/${id}/loyer`, loyer);
  }
}

// ══════════════════════════════════════════════════════════════
//  CONTRATS GESTION SERVICE
// ══════════════════════════════════════════════════════════════
@Injectable({ providedIn: 'root' })
export class ContratsGestionService extends ApiService {
  getAll(page = 1, pageSize = 20, proprieteId?: string, statut?: StatutContrat): Observable<PagedList<ContratGestionDto>> {
    let params = new HttpParams().set('page', page).set('pageSize', pageSize);
    if (proprieteId) params = params.set('proprieteId', proprieteId);
    if (statut)      params = params.set('statut', statut);
    return this.get<PagedList<ContratGestionDto>>('/contrats-gestion', params);
  }
  
  create(data: FormData): Observable<string> {
    return this.postForm<string>('/contrats-gestion', data);
  }
  
  activer(id: string): Observable<void> {
    return this.post<string>(`/contrats-gestion/${id}/activer`, {}).pipe(map(() => void 0));
  }
  creerAvenant(id: string, data: FormData): Observable<void> {
    return this.postForm<void>(`/contrats-gestion/${id}/avenant`, data);
  }
  
}

// ══════════════════════════════════════════════════════════════
//  LOCATAIRES SERVICE
// ══════════════════════════════════════════════════════════════
@Injectable({ providedIn: 'root' })
export class LocatairesService extends ApiService {
  getAll(page = 1, pageSize = 20, search?: string, estActif?: boolean): Observable<PagedList<LocataireListItemDto>> {
    let params = new HttpParams().set('page', page).set('pageSize', pageSize);
    if (search)                 params = params.set('search', search);
    if (estActif !== undefined) params = params.set('estActif', estActif);
    return this.get<PagedList<LocataireListItemDto>>('/locataires', params);
  }

  getById(id: string): Observable<LocataireDto> {
    return this.get<LocataireDto>(`/locataires/${id}`);
  }

  create(data: FormData): Observable<string> {
    return this.postForm<string>('/locataires', data);
  }
  
  supprimer(id: string): Observable<void> {
    return this.delete<void>(`/locataires/${id}`);
  }
}

// ══════════════════════════════════════════════════════════════
//  CONTRATS LOCATION SERVICE
// ══════════════════════════════════════════════════════════════
@Injectable({ providedIn: 'root' })
export class ContratsLocationService extends ApiService {
  getAll(opts: { page?: number; produitId?: string; locataireId?: string; statut?: StatutContrat; search?: string } = {}): Observable<PagedList<ContratLocationListItemDto>> {
    let params = new HttpParams().set('page', opts.page ?? 1).set('pageSize', 20);
    if (opts.produitId)   params = params.set('produitId', opts.produitId);
    if (opts.locataireId) params = params.set('locataireId', opts.locataireId);
    if (opts.statut)      params = params.set('statut', opts.statut);
    if (opts.search)      params = params.set('search', opts.search);
    return this.get<PagedList<ContratLocationListItemDto>>('/contrats-location', params);
  }
  
  create(data: FormData): Observable<string> {
    return this.postForm<string>('/contrats-location', data);
  }
  
  activer(id: string): Observable<void> {
    return this.http.post<void>(`${this.base}/contrats-location/${id}/activer`, {});
  }
  
  validerChecklistEntree(id: string, data: any): Observable<void> {
    return this.http.post<void>(`${this.base}/contrats-location/${id}/checklist-entree`, data);
  }
  
  cloturer(id: string, data: any): Observable<void> {
    return this.http.post<void>(`${this.base}/contrats-location/${id}/cloturer`, data);
  }
  
  resilier(id: string, motifResiliation: string, dateResiliation: Date): Observable<void> {
    return this.http.post<void>(`${this.base}/contrats-location/${id}/resilier`, {
      motifResiliation,
      dateResiliation: dateResiliation.toISOString()
    });
  }
  getById(id: string): Observable<ContratLocationListItemDto> {
    return this.get<ContratLocationListItemDto>(`/contrats-location/${id}/resume`);
  }
}

// ══════════════════════════════════════════════════════════════
//  COLLECTES SERVICE
// ══════════════════════════════════════════════════════════════
@Injectable({ providedIn: 'root' })
export class CollectesService extends ApiService {
  getAll(opts: { page?: number; contratId?: string; collecteurId?: string; periodeMois?: string; statut?: StatutCollecte; semaine?: number } = {}): Observable<PagedList<CollecteDto>> {
    let params = new HttpParams().set('page', opts.page ?? 1).set('pageSize', 30);
    if (opts.contratId)    params = params.set('contratId', opts.contratId);
    if (opts.collecteurId) params = params.set('collecteurId', opts.collecteurId);
    if (opts.periodeMois)  params = params.set('periodeMois', opts.periodeMois);
    if (opts.statut)       params = params.set('statut', opts.statut);
    if (opts.semaine)      params = params.set('numeroSemaine', opts.semaine);
    return this.get<PagedList<CollecteDto>>('/collectes', params);
  }

  saisir(data: any): Observable<string> {
    return this.post<string>('/collectes', data);
  }

  soumettre(id: string): Observable<void> {
    return this.http.post<void>(`${this.base}/collectes/${id}/soumettre`, {});
  }

  valider(id: string, commentaire?: string): Observable<void> {
    return this.http.post<void>(`${this.base}/collectes/${id}/valider`, commentaire);
  }

  rejeter(id: string, motif: string): Observable<void> {
    return this.http.post<void>(`${this.base}/collectes/${id}/rejeter`, motif);
  }

  getRapportCollecteur(collecteurId: string, semaine: number, annee: number): Observable<RapportCollecteurDto> {
    const params = new HttpParams().set('semaine', semaine).set('annee', annee);
    return this.get<RapportCollecteurDto>(`/collectes/rapport-collecteur/${collecteurId}`, params);
  }

  creerBordereau(data: any): Observable<string> {
    return this.post<string>('/bordereaux', data);
  }

  validerBordereau(id: string): Observable<void> {
    return this.http.post<void>(`${this.base}/bordereaux/${id}/valider`, {});
  }
}

// ══════════════════════════════════════════════════════════════
//  PERSONNEL SERVICE
// ══════════════════════════════════════════════════════════════
@Injectable({ providedIn: 'root' })
export class PersonnelService extends ApiService {
  getAll(page = 1): Observable<PagedList<PersonnelListItemDto>> {
    return this.get<PagedList<PersonnelListItemDto>>('/personnel', new HttpParams().set('page', page));
  }

  create(data: FormData): Observable<string> {
    return this.postForm<string>('/personnel', data);
  }

  affecterPropriete(collecteurId: string, proprieteId: string, dateDebut: string): Observable<void> {
    return this.http.post<void>(`${this.base}/personnel/${collecteurId}/affecter-propriete`, { proprieteId, dateDebut });
  }
}

// ══════════════════════════════════════════════════════════════
//  DASHBOARD SERVICE
// ══════════════════════════════════════════════════════════════
// @Injectable({ providedIn: 'root' })
// export class DashboardService extends ApiService {
//   getDashboard(periodeMois?: string): Observable<DashboardDto> {
//     const params = periodeMois ? new HttpParams().set('periodeMois', periodeMois) : undefined;
//     return this.http.get<DashboardDto>(`${this.base}/dashboard`, { params });
//   }
// }
@Injectable({ providedIn: 'root' })
export class DashboardService extends ApiService {
  getDashboard(periodeMois?: string): Observable<DashboardDto> {
    const params = periodeMois ? new HttpParams().set('periodeMois', periodeMois) : undefined;
    return this.get<DashboardDto>('/dashboard', params);
  }
}

// ══════════════════════════════════════════════════════════════
//  RECOUVREMENT SERVICE
//  Construit les dossiers impayés à partir de contrats-location
//  actifs (estEnRetard) + collectes pour calculer montants dus
// ══════════════════════════════════════════════════════════════
@Injectable({ providedIn: 'root' })
export class RecouvrementService extends ApiService {

  /** Récupère tous les dossiers impayés */
  getDossiers(): Observable<DossierRecouvrementDto[]> {
    return this.get<DossierRecouvrementDto[]>('/recouvrement/dossiers');
  }

  /** Envoie une relance (email/SMS) pour un contrat */
  envoyerRelance(contratId: string, message?: string): Observable<void> {
    return this.post<void>(`/recouvrement/${contratId}/relancer`, { message: message ?? '' });
  }

  /** Relance en masse */
  relancerMasse(contratIds: string[]): Observable<void> {
    return this.post<void>('/recouvrement/relancer-masse', { contratIds });
  }

  /** Enregistre un encaissement (crée une collecte) */
  encaisser(contratId: string, data: { montant: number; mode: string; reference?: string }): Observable<void> {
    return this.post<void>(`/recouvrement/${contratId}/encaisser`, data);
  }

  /** Export Excel */
  exportExcel(): Observable<Blob> {
    return this.http.get(`${this.base}/recouvrement/export`, { responseType: 'blob' });
  }
}