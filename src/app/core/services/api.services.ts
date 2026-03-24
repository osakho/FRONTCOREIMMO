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
  DossierRecouvrementDto, EtapeRecouvrement,
  MoisLoyerDto,
  RecapFinancierContratDto,
  SuiviLoyersGlobalDto,
  FeuilleRecouvrementDto,
  LigneRecouvrementDto
} from '../models/models';
import { environment } from '../../../environments/environment';


// =====================================================================================================================================================
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

// =====================================================================================================================================================
//  AUTH SERVICE
// =====================================================================================================================================================
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

  isLoggedIn(): boolean   { return !!this.getToken(); }
  // isPdg(): boolean        { return this.getUser()?.role === 'Pdg'; }
  isPdg(): boolean { return this.getUser()?.role === 'Direction'; }
  isDirection(): boolean  { return ['Direction', 'Admin', 'Pdg'].includes(this.getUser()?.role ?? ''); }
  isComptable(): boolean  { return ['Comptable', 'Direction', 'Admin', 'Pdg'].includes(this.getUser()?.role ?? ''); }
  isCollecteur(): boolean { return this.getUser()?.role === 'Collecteur'; }

  saveSession(resp: LoginResponse): void {
    localStorage.setItem('kdi_token', resp.token);
    localStorage.setItem('kdi_user', JSON.stringify(resp.utilisateur));
  }
}

// =====================================================================================================================================================
//  PROPRIÃ‰TAIRES SERVICE
// =====================================================================================================================================================
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

// =====================================================================================================================================================
//  PROPRIÃ‰TÃ‰S SERVICE
// =====================================================================================================================================================
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

// =====================================================================================================================================================
//  PRODUITS SERVICE
// =====================================================================================================================================================
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

// =====================================================================================================================================================
//  CONTRATS GESTION SERVICE
// =====================================================================================================================================================
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

// =====================================================================================================================================================
//  LOCATAIRES SERVICE
// =====================================================================================================================================================
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

// =====================================================================================================================================================
//  CONTRATS LOCATION SERVICE
// =====================================================================================================================================================
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

  activer(id: string, payload?: any): Observable<void> {
    return this.http.post<void>(`${this.base}/contrats-location/${id}/activer`, payload ?? {});
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

  creerAvenant(id: string, data: any): Observable<void> {
    return this.http.post<void>(`${this.base}/contrats-location/${id}/avenant`, data);
  }

  getById(id: string): Observable<ContratLocationDto> {
    return this.get<ContratLocationDto>(`/contrats-location/${id}`);
  }
}

// =====================================================================================================================================================
//  COLLECTES SERVICE
// =====================================================================================================================================================
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

// =====================================================================================================================================================
//  PERSONNEL SERVICE
// =====================================================================================================================================================
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

// =====================================================================================================================================================
//  DASHBOARD SERVICE
// =====================================================================================================================================================
@Injectable({ providedIn: 'root' })
export class DashboardService extends ApiService {
  getDashboard(periodeMois?: string): Observable<DashboardDto> {
    const params = periodeMois ? new HttpParams().set('periodeMois', periodeMois) : undefined;
    return this.get<DashboardDto>('/dashboard', params);
  }
}

// =====================================================================================================================================================
//  RECOUVREMENT SERVICE
// =====================================================================================================================================================
@Injectable({ providedIn: 'root' })
export class RecouvrementService extends ApiService {
  getDossiers(): Observable<DossierRecouvrementDto[]> {
    return this.get<DossierRecouvrementDto[]>('/recouvrement/dossiers');
  }

    getDossiersContentieux(): Observable<any[]> {
    return this.get<any[]>('/contentieux');
  }
  
  
  envoyerRelance(contratId: string, message?: string, canal?: string): Observable<void> {
    return this.post<void>(`/recouvrement/${contratId}/relancer`, {
      message: message ?? '',
      canal:   canal   ?? 'email'
    });
  }

  relancerMasse(contratIds: string[]): Observable<void> {
    return this.post<void>('/recouvrement/relancer-masse', { contratIds });
  }

  encaisser(contratId: string, data: { montant: number; mode: string; reference?: string }): Observable<void> {
    return this.post<void>(`/recouvrement/${contratId}/encaisser`, data);
  }

  exportExcel(): Observable<Blob> {
    return this.http.get(`${this.base}/recouvrement/export`, { responseType: 'blob' });
  }
  
  ouvrirDossierContentieux(data: {
    contratId:    string;
    montantDu:    number;
    avocat?:      string;
    huissier?:    string;
    motif:        string;
  }): Observable<{ id: string }> {
    return this.post<{ id: string }>('/contentieux/ouvrir', data);
  }
  
  
  
  getLocatairesEnRetard(): Observable<{ contratId: string; locataireNom: string; montantDu: number }[]> {
    return this.get<{ contratId: string; locataireNom: string; montantDu: number }[]>('/recouvrement/locataires-retard');
  }

  getFeuille(params?: {
    collecteurId?:   string;
    proprietaireId?: string;
    proprieteId?:    string;
    produitCode?:    string;
    statut?:         string;
  }): Observable<FeuilleRecouvrementDto> {
    const qp = Object.entries(params || {})
      .filter(([, v]) => v)
      .map(([k, v]) => `${k}=${encodeURIComponent(v!)}`)
      .join('&');
    return this.get<FeuilleRecouvrementDto>(`/recouvrement/feuille${qp ? '?' + qp : ''}`);
  }
}

// =====================================================================================================================================================
//  TRAVAUX SERVICES
// =====================================================================================================================================================
import {
  TacheDto, TacheCreateDto, StatutTache, PrioriteTache,
  DevisDto, DevisListItemDto, DevisCreateDto, StatutDevis,
  ChantierDto, ChantierListItemDto, StatutChantier,
  EvenementAgendaDto, EvenementCreateDto
} from '../models/models';

@Injectable({ providedIn: 'root' })
export class TachesService extends ApiService {
  getAll(params?: { statut?: StatutTache; priorite?: PrioriteTache; assigneId?: string }): Observable<PagedList<TacheDto>> {
    let p = new HttpParams();
    if (params?.statut)    p = p.set('statut',    params.statut);
    if (params?.priorite)  p = p.set('priorite',  params.priorite);
    if (params?.assigneId) p = p.set('assigneId', params.assigneId);
    return this.get<PagedList<TacheDto>>('/taches', p);
  }
  getById(id: string): Observable<TacheDto>         { return this.get<TacheDto>(`/taches/${id}`); }
  create(dto: TacheCreateDto): Observable<TacheDto>  { return this.post<TacheDto>('/taches', dto); }
  update(id: string, dto: Partial<TacheCreateDto>): Observable<TacheDto> { return this.put<TacheDto>(`/taches/${id}`, dto); }
  cloture(id: string): Observable<TacheDto>          { return this.post<TacheDto>(`/taches/${id}/cloture`, {}); }
  supprimer(id: string): Observable<any>             { return this.http.delete<any>(`${this.base}/taches/${id}`); }
}

@Injectable({ providedIn: 'root' })
export class DevisTravauxService extends ApiService {
  getAll(params?: { statut?: StatutDevis }): Observable<PagedList<DevisListItemDto>> {
    let p = new HttpParams();
    if (params?.statut) p = p.set('statut', params.statut);
    return this.get<PagedList<DevisListItemDto>>('/devis-travaux', p);
  }
  getById(id: string): Observable<DevisDto>              { return this.get<DevisDto>(`/devis-travaux/${id}`); }
  create(dto: DevisCreateDto): Observable<DevisDto>      { return this.post<DevisDto>('/devis-travaux', dto); }
  update(id: string, dto: DevisCreateDto): Observable<DevisDto> { return this.put<DevisDto>(`/devis-travaux/${id}`, dto); }
  accepter(id: string): Observable<DevisDto>             { return this.post<DevisDto>(`/devis-travaux/${id}/accepter`, {}); }
  refuser(id: string): Observable<DevisDto>              { return this.post<DevisDto>(`/devis-travaux/${id}/refuser`, {}); }
  convertirChantier(id: string): Observable<ChantierDto> { return this.post<ChantierDto>(`/devis-travaux/${id}/convertir-chantier`, {}); }
}

@Injectable({ providedIn: 'root' })
export class ChantiersService extends ApiService {
  getAll(params?: { statut?: StatutChantier }): Observable<PagedList<ChantierListItemDto>> {
    let p = new HttpParams();
    if (params?.statut) p = p.set('statut', params.statut);
    return this.get<PagedList<ChantierListItemDto>>('/chantiers', p);
  }
  getById(id: string): Observable<ChantierDto>          { return this.get<ChantierDto>(`/chantiers/${id}`); }
  create(dto: any): Observable<ChantierDto>              { return this.post<ChantierDto>('/chantiers', dto); }
  update(id: string, dto: any): Observable<ChantierDto>  { return this.put<ChantierDto>(`/chantiers/${id}`, dto); }
  validerEtape(id: string, etapeId: string): Observable<ChantierDto> { return this.post<ChantierDto>(`/chantiers/${id}/etapes/${etapeId}/valider`, {}); }
  cloture(id: string): Observable<ChantierDto>           { return this.post<ChantierDto>(`/chantiers/${id}/cloture`, {}); }
}

@Injectable({ providedIn: 'root' })
export class AgendaService extends ApiService {
  getAll(params?: { dateDebut?: string; dateFin?: string; type?: string }): Observable<EvenementAgendaDto[]> {
    let p = new HttpParams();
    if (params?.dateDebut) p = p.set('dateDebut', params.dateDebut);
    if (params?.dateFin)   p = p.set('dateFin',   params.dateFin);
    if (params?.type)      p = p.set('type',       params.type);
    return this.get<EvenementAgendaDto[]>('/agenda', p);
  }
  create(dto: EvenementCreateDto): Observable<EvenementAgendaDto>              { return this.post<EvenementAgendaDto>('/agenda', dto); }
  update(id: string, dto: EvenementCreateDto): Observable<EvenementAgendaDto>  { return this.put<EvenementAgendaDto>(`/agenda/${id}`, dto); }
  supprimer(id: string): Observable<any>                                        { return this.http.delete<any>(`${this.base}/agenda/${id}`); }
}

// =====================================================================================================================================================
//  SUIVI LOYERS SERVICE
// =====================================================================================================================================================
@Injectable({ providedIn: 'root' })
export class SuiviLoyersService extends ApiService {
  getSuivi(): Observable<SuiviLoyersGlobalDto> {
    return this.get<SuiviLoyersGlobalDto>('/contrats-location/suivi-loyers');
  }
}

// =====================================================================================================================================================
//  CHARGES PROPRIETAIRE  DTOs exportes pour le composant
// =====================================================================================================================================================
export type TypeCharge   = 'Avance' | 'Impot' | 'Travaux' | 'Autre';
export type StatutCharge = 'EnAttente' | 'Approuvee' | 'Refusee';

export interface ChargeProprietaireDto {
  id: string;
  type: TypeCharge;
  statut: StatutCharge;
  libelle: string;
  montant: number;
  periodeMois?: string;
  reference?: string;
  notes?: string;
  motifRefus?: string;
  proprieteLibelle?: string;
  chantierNumero?: string;
  locataireNom?: string;
  remboursementMensuel?: number;
  moisRestants?: number;
  creeLe: string;
}

export interface LigneReversement { libelle: string; montant: number; type: string; }

export interface FeuilleChargesDto {
  charges:                ChargeProprietaireDto[];
  loyersCollectes:        number;
  commission:             number;
  totalChargesApprouvees: number;
  netAReverser:           number;
  chargesEnAttenteMontant: number;
  lignesDetail:           LigneReversement[];
  proprietaires:          { id: string; nom: string }[];
  chantiersDisponibles:   { id: string; numero: string; libelle: string; montant: number; proprieteLibelle: string }[];
  locataires:             { id: string; nom: string; produitCode: string }[];
}

// =====================================================================================================================================================
//  CHARGES PROPRIETAIRE SERVICE
//  âœ… HÃ©rite de ApiService à get/post accessibles via protected
// =====================================================================================================================================================
@Injectable({ providedIn: 'root' })
export class ChargesProprietaireService extends ApiService {
  getFeuille(proprietaireId: string, periodeMois: string): Observable<FeuilleChargesDto> {
    const params = new HttpParams()
      .set('proprietaireId', proprietaireId)
      .set('periodeMois', periodeMois);
    return this.get<FeuilleChargesDto>('/charges-proprietaire/feuille', params);
  }
  creer(cmd: any): Observable<void>                    { return this.post<void>('/charges-proprietaire', cmd); }
  approuver(id: string): Observable<void>              { return this.post<void>(`/charges-proprietaire/${id}/approuver`, {}); }
  refuser(id: string, motif: string): Observable<void> { return this.post<void>(`/charges-proprietaire/${id}/refuser`, { motif }); }
}

// =====================================================================================================================================================
//  MOTIFS PRÊT SERVICE  — table de référence des motifs de prêt agence
// =====================================================================================================================================================
export interface MotifPretDto {
  id:      string;
  groupe:  string;
  libelle: string;
  ordre:   number;
}

@Injectable({ providedIn: 'root' })
export class MotifsPretService extends ApiService {
  getAll(): Observable<MotifPretDto[]> {
    return this.get<MotifPretDto[]>('/motifs-pret');
  }
  creer(groupe: string, libelle: string): Observable<string> {
    return this.post<string>('/motifs-pret', { groupe, libelle });
  }
  desactiver(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/motifs-pret/${id}`);
  }
}

// =====================================================================================================================================================
//  FICHIERS SERVICE — stockage base64 en base de données
//  Remplace le stockage sur disque (wwwroot/uploads)
// =====================================================================================================================================================

export interface FichierMetaDto {
  id:           string;
  nomFichier:   string;
  typeMime:     string;
  tailleOctets: number;
  role:         string;
  creeLe:       string;
}

export interface FichierContenuDto extends FichierMetaDto {
  contenuBase64: string;
  dataUrl:       string;   // "data:image/jpeg;base64,..."  prêt pour <img [src]>
}

export type RoleFichier =
  | 'PhotoIdentite'
  | 'DocumentIdentite'
  | 'ContratSigne'
  | 'Avenant'
  | 'PhotoPropriete'
  | 'PlanPropriete'
  | 'Autre';

@Injectable({ providedIn: 'root' })
export class FichiersService extends ApiService {

  /** Upload un fichier à partir d'un objet File (lit le base64 automatiquement) */
  uploadFile(
    entiteId:   string,
    entiteType: string,
    role:       RoleFichier,
    file:       File
  ): Observable<FichierMetaDto> {
    return new Observable(obs => {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        this.post<FichierMetaDto>('/fichiers', {
          entiteId,
          entiteType,
          role,
          nomFichier:    file.name,
          typeMime:      file.type || 'application/octet-stream',
          contenuBase64: dataUrl   // inclut "data:...;base64," — le backend le nettoie
        }).subscribe({ next: r => { obs.next(r); obs.complete(); }, error: e => obs.error(e) });
      };
      reader.onerror = () => obs.error(new Error('Lecture du fichier échouée'));
      reader.readAsDataURL(file);
    });
  }

  /** Upload à partir d'un dataUrl déjà lu (ex : photoPreview déjà disponible) */
  uploadDataUrl(
    entiteId:   string,
    entiteType: string,
    role:       RoleFichier,
    dataUrl:    string,
    nomFichier: string,
    typeMime:   string
  ): Observable<FichierMetaDto> {
    return this.post<FichierMetaDto>('/fichiers', {
      entiteId, entiteType, role, nomFichier, typeMime, contenuBase64: dataUrl
    });
  }

  /** Récupère le contenu base64 + dataUrl d'un fichier */
  getContenu(id: string): Observable<FichierContenuDto> {
    return this.get<FichierContenuDto>(`/fichiers/${id}`);
  }

  /** Liste les métadonnées des fichiers d'une entité (sans le contenu binaire) */
  getParEntite(entiteType: string, entiteId: string, role?: RoleFichier): Observable<FichierMetaDto[]> {
    const params = role ? new HttpParams().set('role', role) : undefined;
    return this.get<FichierMetaDto[]>(`/fichiers/entite/${entiteType}/${entiteId}`, params);
  }

  /** Ouvre le fichier dans un nouvel onglet (téléchargement direct) */
  telecharger(id: string): void {
    window.open(`${this.base}/fichiers/${id}/telecharger`, '_blank');
  }

  supprimer(id: string): Observable<void> {
    return this.delete<void>(`/fichiers/${id}`);
  }

  /** Formate la taille en Ko / Mo */
  formatTaille(octets: number): string {
    if (octets < 1024)       return `${octets} o`;
    if (octets < 1024*1024)  return `${(octets/1024).toFixed(1)} Ko`;
    return `${(octets/1024/1024).toFixed(1)} Mo`;
  }
}


// ══════════════════════════════════════════════════════════════════════════════
//  SERVICE DE NOTIFICATIONS — Email · SMS · WhatsApp
//  Centralise tous les envois de notifications de l'application
//  Endpoints backend :
//    POST /notifications/envoyer          → envoi manuel ad-hoc
//    POST /notifications/envoyer-masse    → envoi groupé
//    GET  /notifications/historique       → journal des envois
//    POST /recouvrement/{id}/relancer     → relance locataire (recouvrement)
//    POST /contrats-location/{id}/notifier-locataire → notif locataire
//    POST /reversements/notifier          → notif propriétaire après versement
// ══════════════════════════════════════════════════════════════════════════════

// Notification types — définis dans models.ts, importés ici
import type {
  CanalNotification, TypeNotification,
  EnvoyerNotificationRequest, EnvoyerMasseRequest,
  HistoriqueNotificationDto, StatutsEnvoiDto,
} from '../models/models';
// Re-export for convenience
export type { CanalNotification, TypeNotification, HistoriqueNotificationDto, StatutsEnvoiDto };

@Injectable({ providedIn: 'root' })
export class NotificationService extends ApiService {

  /** Envoi unique — locataire ou propriétaire */
  envoyer(req: EnvoyerNotificationRequest): Observable<StatutsEnvoiDto> {
    return this.post<StatutsEnvoiDto>('/notifications/envoyer', req);
  }

  /** Envoi en masse (multi-destinataires) */
  envoyerMasse(req: EnvoyerMasseRequest): Observable<{ nbEnvoyes: number; nbEchecs: number }> {
    return this.post<{ nbEnvoyes: number; nbEchecs: number }>('/notifications/envoyer-masse', req);
  }

  /** Historique des notifications envoyées */
  getHistorique(opts: {
    page?: number;
    pageSize?: number;
    typeDestinataire?: string;
    type?: TypeNotification;
    canal?: CanalNotification;
    dateDebut?: string;
    dateFin?: string;
  } = {}): Observable<import('../models/models').PagedList<HistoriqueNotificationDto>> {
    let params = new HttpParams();
    if (opts.page)              params = params.set('page', opts.page);
    if (opts.pageSize)          params = params.set('pageSize', opts.pageSize!);
    if (opts.typeDestinataire)  params = params.set('typeDestinataire', opts.typeDestinataire);
    if (opts.type)              params = params.set('type', opts.type);
    if (opts.canal)             params = params.set('canal', opts.canal);
    if (opts.dateDebut)         params = params.set('dateDebut', opts.dateDebut);
    if (opts.dateFin)           params = params.set('dateFin', opts.dateFin);
    return this.get<import('../models/models').PagedList<HistoriqueNotificationDto>>('/notifications/historique', params);
  }

  /** Relance locataire via recouvrement (compatible existant) */
  relancerLocataire(contratId: string, canal: CanalNotification, message?: string): Observable<void> {
    return this.post<void>(`/recouvrement/${contratId}/relancer`, {
      canal, message: message ?? ''
    });
  }

  /** Notifier locataire (quittance, avis…) */
  notifierLocataire(contratId: string, canal: CanalNotification, type: string): Observable<void> {
    return this.post<void>(`/contrats-location/${contratId}/notifier-locataire`, { canal, type });
  }

  /** Notifier propriétaire après versement */
  notifierProprietaire(req: {
    proprietaireId: string;
    canaux: CanalNotification[];
    type: TypeNotification;
    montant?: number;
    message?: string;
  }): Observable<StatutsEnvoiDto> {
    return this.post<StatutsEnvoiDto>('/reversements/notifier', req);
  }
}