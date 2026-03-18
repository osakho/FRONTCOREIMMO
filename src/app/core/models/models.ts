// ══════════════════════════════════════════════════════════════
//  ENUMS
// ══════════════════════════════════════════════════════════════
export enum TypeDocument {
  CarteNationaleIdentite = 'CarteNationaleIdentite',
  Passeport              = 'Passeport',
  CarteDeSejour          = 'CarteDeSejour',
  CarteConsulaire        = 'CarteConsulaire',
  RegistreCommerce       = 'RegistreCommerce',
  Autre                  = 'Autre'
}

export enum TypeProduit {
  Chambre     = 'Chambre',
  Appartement = 'Appartement',
  Boutique    = 'Boutique',
  Garage      = 'Garage'
}

export enum StatutProduit {
  Libre       = 'Libre',
  Loue        = 'Loue',
  EnTravaux   = 'EnTravaux',
  Reserve     = 'Reserve',
  HorsService = 'HorsService'
}

export enum StatutContrat {
  Brouillon = 'Brouillon',
  EnAttente = 'EnAttente',
  Actif     = 'Actif',
  Suspendu  = 'Suspendu',
  Termine   = 'Termine',
  Resilie   = 'Resilie'
}

export enum PeriodiciteLoyer {
  Mensuel     = 'Mensuel',
  Bimensuel   = 'Bimensuel',
  Trimestriel = 'Trimestriel'
}

export enum PeriodiciteVersement {
  Mensuel     = 'Mensuel',
  Bimensuel   = 'Bimensuel',
  Trimestriel = 'Trimestriel'
}

export enum ModePaiement {
  Especes          = 'Especes',
  Bankily          = 'Bankily',
  Masrvi           = 'Masrvi',
  Bimbank          = 'Bimbank',
  Click            = 'Click',
  VirementBancaire = 'VirementBancaire',
  Cheque           = 'Cheque'
}

export enum StatutCollecte {
  Saisie          = 'Saisie',
  SoumisComptable = 'SoumisComptable',
  Valide          = 'Valide',
  Rejete          = 'Rejete',
  Annule          = 'Annule'
}

export enum TypePersonnel {
  Comptable     = 'Comptable',
  Collecteur    = 'Collecteur',
  ChargeTravaux = 'ChargeTravaux',
  Menage        = 'Menage',
  Communication = 'Communication',
  Assistante    = 'Assistante',
  Direction     = 'Direction',
  Autre         = 'Autre'
}

export enum TypeDocumentEntite {
  PhotoIdentite       = 'PhotoIdentite',
  CarteIdentite       = 'CarteIdentite',
  Passeport           = 'Passeport',
  TitreProprietee     = 'TitreProprietee',
  AutorisationExploit = 'AutorisationExploit',
  PhotoEtatLieux      = 'PhotoEtatLieux',
  ContratSigne        = 'ContratSigne',
  BordereauVersement  = 'BordereauVersement',
  ContratTravail      = 'ContratTravail',
  Autre               = 'Autre'
}

// ══════════════════════════════════════════════════════════════
//  INTERFACES COMMUNES
// ══════════════════════════════════════════════════════════════
export interface PagedList<T> {
  items:      T[];
  totalCount: number;
  page:       number;
  pageSize:   number;
  totalPages: number;
  hasNext:    boolean;
  hasPrevious:boolean;
}

export interface ApiResponse<T> {
  success: boolean;
  data?:   T;
  message?:string;
  errors?: Record<string, string[]>;
}

// ══════════════════════════════════════════════════════════════
//  PROPRIÉTAIRES
// ══════════════════════════════════════════════════════════════
export interface CompteBancaireDto {
  id:           string;
  banque:       string;
  numero:       string;
  agence?:      string;
  estPrincipal: boolean;
}

export interface PlateformeElectroniqueDto {
  id:           string;
  nom:          string;
  numero:       string;
  estPrincipal: boolean;
}

export interface DocumentDto {
  id:            string;
  typeLabel:     string;
  nomFichier:    string;
  url:           string;
  estObligatoire:boolean;
  creeLe:        string;
}

export interface ProprietaireListItemDto {
  id:               string;
  nomComplet:       string;
  telephone:        string;
  email?:           string;
  nombreProprietes: number;
  estActif:         boolean;
  creeLe:           string;
}

export interface ProprietaireDto {
  id:                  string;
  nom:                 string;
  prenom:              string;
  nomComplet:          string;
  dateNaissance:       string;
  lieuNaissance:       string;
  adresse:             string;
  quartier?:           string;
  telephone:           string;
  telephoneSecondaire?:string;
  email?:              string;
  typeDocumentLabel:   string;
  numeroDocument:      string;
  photoIdentiteUrl?:   string;
  notes?:              string;
  estActif:            boolean;
  creeLe:              string;
  nombreProprietes:    number;
  comptes:             CompteBancaireDto[];
  plateformes:         PlateformeElectroniqueDto[];
  documents:           DocumentDto[];
}

export interface CreerProprietaireRequest {
  nom:                 string;
  prenom:              string;
  dateNaissance:       string;
  lieuNaissance:       string;
  adresse:             string;
  quartier?:           string;
  telephone:           string;
  telephoneSecondaire?:string;
  email?:              string;
  typeDocumentId:      TypeDocument;
  numeroDocument:      string;
  notes?:              string;
  photoIdentite?:      File;
  comptes:             { banque: string; numero: string; agence?: string; estPrincipal: boolean }[];
  plateformes:         { nom: string; numero: string; estPrincipal: boolean }[];
}

// ══════════════════════════════════════════════════════════════
//  PROPRIÉTÉS
// ══════════════════════════════════════════════════════════════
export interface ProprieteListItemDto {
  id:                string;
  proprietaireId:    string;
  proprietaireNom:   string;
  libelle:           string;
  adresse:           string;
  quartier?:         string;
  nombreProduits:    number;
  nombreLibres:      number;
  aContratGestion:   boolean;
  creeLe:            string;
}

export interface ProprieteDto {
  id:                  string;
  proprietaireId:      string;
  proprietaireNom:     string;
  libelle:             string;
  adresse:             string;
  quartier?:           string;
  ville:               string;
  zoneCode?:           string;
  description?:        string;
  latitude?:           number;
  longitude?:          number;
  creeLe:              string;
  nombreProduits:      number;
  nombreProduitsLibres:number;
  nombreProduitsLoues: number;
  aContratGestion:     boolean;
  produits:            ProduitResume[];
  collecteurActuel?: CollecteurAffecteDto;
}

export interface ProduitResume {
  id:             string;
  code:           string;
  typeLabel:      string;
  loyerReference: number;
  statutLabel:    string;
}

// ══════════════════════════════════════════════════════════════
//  PRODUITS LOCATIFS
// ══════════════════════════════════════════════════════════════
export interface ProduitListItemDto {
  id:               string;
  proprieteId:      string;
  proprieteLibelle: string;
  code:             string;
  typeLabel:        string;
  type?:            TypeProduit;  // présent si le backend le retourne
  hasCompteurElec?: boolean;
  hasCompteurEau?:  boolean;
  loyerReference:   number;
  statutLabel:      string;
  surface?:         number;
}

export interface ProduitLocatifDto {
  id:               string;
  proprieteId:      string;
  proprieteLibelle: string;
  code:             string;
  typeLabel:        string;
  type:             TypeProduit;
  description:      string;
  surface?:         number;
  etage:            number;
  hasCompteurElec:  boolean;
  hasCompteurEau:   boolean;
  loyerReference:   number;
  statutLabel:      string;
  statut:           StatutProduit;
  notes?:           string;
  creeLe:           string;
  contratActif?:    ContratLocationResumeDto;
}

export interface ContratLocationResumeDto {
  id:           string;
  numero:       string;
  locataireNom: string;
  statut:       string;
}

// ══════════════════════════════════════════════════════════════
//  CONTRATS DE GESTION
// ══════════════════════════════════════════════════════════════
export interface ContratGestionDto {
  id:                     string;
  proprieteId:            string;
  proprieteLibelle:       string;
  numero:                 string;
  dateDebut:              string;
  dateFin?:               string;
  tauxCommission:         number;
  periodiciteLabel:       string;
  statutLabel:            string;
  conditionsParticulieres?:string;
  docIdentiteOk:          boolean;
  photosEdlOk:            boolean;
  docAutorisationOk:      boolean;
  peutEtreActive:         boolean;
  creeLe:                 string;
}

// ══════════════════════════════════════════════════════════════
//  LOCATAIRES
// ══════════════════════════════════════════════════════════════
export interface LocataireListItemDto {
  id:               string;
  nomComplet:       string;
  telephone:        string;
  email?:           string;
  estActif:         boolean;
  creeLe:           string;
  nbContratsActifs: number;
}

export interface LocataireDto {
  id:                  string;
  nom:                 string;
  prenom:              string;
  nomComplet:          string;
  dateNaissance:       string;
  lieuNaissance:       string;
  adresse:             string;
  quartier?:           string;
  telephone:           string;
  telephoneSecondaire?:string;
  email?:              string;
  typeDocumentLabel:   string;
  numeroDocument:      string;
  photoIdentiteUrl?:   string;
  profession?:         string;
  employeur?:          string;
  notes?:              string;
  estActif:            boolean;
  creeLe:              string;
  contratsActifs:      ContratLocationResumeLocataire[];
  documents:           DocumentDto[];
}

export interface ContratLocationResumeLocataire {
  id:          string;
  numero:      string;
  produitCode: string;
  statut:      string;
  loyer:       number;
}

// ══════════════════════════════════════════════════════════════
//  CONTRATS DE LOCATION
// ══════════════════════════════════════════════════════════════
export interface ContratLocationListItemDto {
  id:                  string;
  numero:              string;
  produitCode:         string;
  locataireNom:        string;
  loyer:               number;
  caution:             number;
  avanceLoyer:         number;
  cautionReglee:       boolean;
  avanceLoyerReglee:   boolean;
  statutLabel:         string;
  dateEntree:          string;
  dateSortiePrevue?:   string;
  estEnRetard:         boolean;
}

export interface ContratLocationDto {
  id:                     string;
  numero:                 string;
  produitLocatifId:       string;
  produitCode:            string;
  locataireId:            string;
  locataireNom:           string;
  locataireTel:           string;
  loyer:                  number;
  caution:                number;
  avanceLoyer:            number;
  periodiciteLabel:       string;
  dateEntree:             string;
  dateSortiePrevue?:      string;
  jourDebutPaiement:      number;
  jourFinPaiement:        number;
  statutLabel:            string;
  cautionReglee:          boolean;
  avanceLoyerReglee:      boolean;
  contratSigne:           boolean;
  edlEntreeValide:        boolean;
  photosAvantRemise:      boolean;
  indexElecEntree?:       number;
  indexEauEntree?:        number;
  edlSortieValide:        boolean;
  photosAvantRestitution: boolean;
  indexElecSortie?:       number;
  indexEauSortie?:        number;
  retenueSurCaution?:     number;
  peutEtreActive:         boolean;
  conditionsParticulieres?:string;
  destinationBien?:       string;
  creeLe:                 string;
}

// ══════════════════════════════════════════════════════════════
//  COLLECTES & BORDEREAUX
// ══════════════════════════════════════════════════════════════
export interface CollecteDto {
  id:                string;
  contratLocationId: string;
  contratNumero:     string;
  produitCode:       string;
  proprieteLibelle:  string;
  locataireNom:      string;
  locataireTel:      string;
  periodeMois:       string;
  montantAttendu:    number;
  montantEncaisse:   number;
  ecart:             number;
  modeLabel:         string;
  reference?:        string;
  commentaire?:      string;
  collecteurNom:     string;
  statutLabel:       string;
  dateSaisie:        string;
  motifRejet?:       string;
  numeroSemaine:     number;
  anneeSemaine:      number;
}

export interface RapportCollecteurDto {
  collecteurNom:    string;
  semaine:          number;
  annee:            number;
  lignesPayees:     LigneRapportCollecte[];
  lignesNonPayees:  LigneRapportCollecte[];
  lignesRattrapage: LigneRapportCollecte[];
  totalCollecte:    number;
}

export interface LigneRapportCollecte {
  proprieteLibelle: string;
  produitCode:      string;
  locataireNom:     string;
  locataireTel:     string;
  periodeMois:      string;
  montantAttendu:   number;
  montantEncaisse:  number;
  statut:           string;
  estRattrapage:    boolean;
}

// ══════════════════════════════════════════════════════════════
//  PERSONNEL
// ══════════════════════════════════════════════════════════════
export interface PersonnelListItemDto {
  id:           string;
  nomComplet:   string;
  typeLabel:    string;
  poste:        string;
  statutLabel:  string;
  estActif:     boolean;
}

// ══════════════════════════════════════════════════════════════
//  DASHBOARD
// ══════════════════════════════════════════════════════════════
export interface DashboardDto {
  totalProduits:            number;
  produitsLoues:            number;
  produitsLibres:           number;
  tauxOccupation:           number;
  collectesMoisCourant:     number;
  collectesMoisPrecedent:   number;
  evolutionCollectePct:     number;
  nbContratsActifs:         number;
  nbRetardsPaiement:        number;
  montantRetards:           number;
  gainsAgenceMoisCourant:   number;
  gainsAgenceAnneeEnCours:  number;
  statsCollecteurs:         StatCollecteur[];
  nbAlertesNonLues:         number;
  dernieresActivites:       DerniereActivite[];
  graphiqueCollectes:       PointGraphique[];
}

export interface StatCollecteur {
  collecteurId:        string;
  nom:                 string;
  initiales:           string;
  typeLabel:           string;
  nbCollectesSemaine:  number;
  montantSemaine:      number;
  montantSemainePrec:  number;
  tauxEncaissement:    number;
  nbRetards:           number;
  score:               number;
}

export interface DerniereActivite {
  type:        string;
  description: string;
  date:        string;
}

export interface PointGraphique {
  mois:    string;
  montant: number;
}

// ══════════════════════════════════════════════════════════════
//  AUTH
// ══════════════════════════════════════════════════════════════
export interface LoginRequest  { email: string; motDePasse: string; }
export interface LoginResponse { token: string; expiration: string; utilisateur: UtilisateurInfo; }
export interface UtilisateurInfo {
  id:         string;
  nom:        string;
  email:      string;
  role:       string;
  photoUrl?:  string;
}

// ══════════════════════════════════════════════════════════════
//  À AJOUTER dans models.ts
// ══════════════════════════════════════════════════════════════

// ── Dashboard Propriétaires ───────────────────────────────────
export interface DashboardProduitDto {
  id:              string;
  code:            string;
  typeLabel:       string;
  loyerReference:  number;
  statutLabel:     string;
  locataireNom?:   string;
  contratNumero?:  string;
}

export interface DashboardProprieteDto {
  id:                string;
  libelle:           string;
  adresse:           string;
  quartier?:         string;
  ville:             string;
  aContratGestion:   boolean;
  nombreProduits:    number;
  produitsLoues:     number;
  produitsLibres:    number;
  totalLoyerMensuel: number;
  produits:          DashboardProduitDto[];
}

export interface DashboardProprietaireDto {
  id:                        string;
  nomComplet:                string;
  telephone:                 string;
  email?:                    string;
  initiales:                 string;
  estActif:                  boolean;
  // KPIs
  nombreProprietes:          number;
  totalProduits:             number;
  produitsLoues:             number;
  produitsLibres:            number;
  totalLoyerMensuel:         number;
  // Contrat
  aContratGestion:           boolean;
  statutContratLabel?:       string;
  periodiciteVersementLabel?:string;
  // Collecteur
  collecteurId?:             string;
  collecteurNom?:            string;
  // Détail
  proprietes:                DashboardProprieteDto[];
}

export interface StatsDashboardProprietairesDto {
  totalProprietaires: number;
  totalProprietes:    number;
  totalProduits:      number;
  totalLoues:         number;
  totalLibres:        number;
  tauxOccupation:     number;
  totalLoyerMensuel:  number;
  nbCollecteurs:      number;
}

export interface DashboardProprietairesResult {
  items: PagedList<DashboardProprietaireDto>;
  stats: StatsDashboardProprietairesDto;
}

export interface CollecteurAffecteDto {
  collecteurId:  string;
  collecteurNom: string;
  dateDebut:     string;
}


// ══════════════════════════════════════════════════════════════
//  RECOUVREMENT
// ══════════════════════════════════════════════════════════════
export type EtapeRecouvrement = 'Relance1' | 'Relance2' | 'Relance3' | 'Contentieux';

export interface DossierRecouvrementDto {
  contratId:        string;
  contratNumero:    string;
  locataireId:      string;
  locataireNom:     string;
  locataireTel:     string;
  produitCode:      string;
  proprieteLibelle: string;
  loyer:            number;
  montantDu:        number;
  joursRetard:      number;
  derniereRelance?: string;
  etape:            EtapeRecouvrement;
  loading?:         boolean;
}
// ══════════════════════════════════════════════════════════════
//  TRAVAUX & CHANTIERS
// ══════════════════════════════════════════════════════════════

export type PrioriteTache = 'Urgente' | 'Moyenne' | 'Faible';
export type StatutTache   = 'AouvFaire' | 'EnCours' | 'EnAttente' | 'Cloturee' | 'Annulee';
export type CategorieTache = 'TravauxChantier' | 'GestionLocative' | 'Administration' | 'Contentieux' | 'Finance' | 'Autre';

export interface TacheDto {
  id:            string;
  titre:         string;
  description?:  string;
  categorie:     CategorieTache;
  categorieLabel:string;
  priorite:      PrioriteTache;
  prioriteLabel: string;
  statut:        StatutTache;
  statutLabel:   string;
  proprieteTitre?:  string;
  proprieteId?:     string;
  assigneId?:       string;
  assigneNom?:      string;
  dateEcheance?:    string;
  dateCreation:     string;
  dateCloture?:     string;
  avancement:       number;   // 0-100
  devisId?:         string;
  chantierId?:      string;
  historique?:      TacheHistoriqueDto[];
}

export interface TacheHistoriqueDto {
  date:        string;
  auteur:      string;
  description: string;
}

export interface TacheCreateDto {
  titre:         string;
  description?:  string;
  categorie:     CategorieTache;
  priorite:      PrioriteTache;
  proprieteId?:  string;
  assigneId?:    string;
  dateEcheance?: string;
}

// ── Devis ────────────────────────────────────────────────────
export type StatutDevis = 'Brouillon' | 'Emis' | 'EnAttente' | 'Accepte' | 'Refuse' | 'Expire';

export interface LigneDevisDto {
  id?:          string;
  designation:  string;
  quantite:     number;
  unite:        string;
  prixUnitaire: number;
  total:        number;
}

export interface DevisDto {
  id:              string;
  numero:          string;
  proprieteTitre:  string;
  proprieteId:     string;
  natureTravaux:   string;
  entrepreneur:    string;
  statut:          StatutDevis;
  statutLabel:     string;
  dateEmission:    string;
  dateValidite:    string;
  lignes:          LigneDevisDto[];
  sousTotal:       number;
  tva:             number;
  totalTtc:        number;
  conditions?:     string;
  chantierId?:     string;
}

export interface DevisListItemDto {
  id:             string;
  numero:         string;
  proprieteTitre: string;
  natureTravaux:  string;
  entrepreneur:   string;
  statut:         StatutDevis;
  statutLabel:    string;
  dateEmission:   string;
  totalTtc:       number;
  chantierId?:    string;
}

export interface DevisCreateDto {
  proprieteId:    string;
  natureTravaux:  string;
  entrepreneur:   string;
  dateEmission:   string;
  dateValidite:   string;
  lignes:         Omit<LigneDevisDto, 'id' | 'total'>[];
  conditions?:    string;
}

// ── Chantier ─────────────────────────────────────────────────
export type StatutChantier = 'Planifie' | 'EnCours' | 'EnPause' | 'Termine' | 'Annule';

export interface EtapeChantierDto {
  id:            string;
  titre:         string;
  dateDebut?:    string;
  dateFin?:      string;
  statut:        'AouvFaire' | 'EnCours' | 'Terminee';
  statutLabel:   string;
  ordre:         number;
}

export interface ChantierDto {
  id:              string;
  intitule:        string;
  proprieteId:     string;
  proprieteTitre:  string;
  proprieteAdresse:string;
  devisId?:        string;
  devisNumero?:    string;
  entrepreneur:    string;
  responsableId?:  string;
  responsableNom?: string;
  statut:          StatutChantier;
  statutLabel:     string;
  dateDebut:       string;
  dateFinPrevue:   string;
  dateFinReelle?:  string;
  budget:          number;
  avancement:      number;  // 0-100
  joursRestants:   number;
  joursDepassement:number;
  etapes:          EtapeChantierDto[];
}

export interface ChantierListItemDto {
  id:              string;
  intitule:        string;
  proprieteTitre:  string;
  proprieteAdresse:string;
  entrepreneur:    string;
  statut:          StatutChantier;
  statutLabel:     string;
  avancement:      number;
  budget:          number;
  joursRestants:   number;
  joursDepassement:number;
  nbEtapesTotal:   number;
  nbEtapesOk:      number;
}

// ── Agenda ───────────────────────────────────────────────────
export type TypeEvenement = 'RDV' | 'Visite' | 'Travaux' | 'Deadline' | 'Reunion' | 'Autre';

export interface EvenementAgendaDto {
  id:           string;
  titre:        string;
  type:         TypeEvenement;
  typeLabel:    string;
  date:         string;
  heure?:       string;
  proprieteId?: string;
  proprieteTitre?: string;
  notes?:       string;
  participants?:string[];
  tacheId?:     string;
  chantierId?:  string;
}

export interface EvenementCreateDto {
  titre:        string;
  type:         TypeEvenement;
  date:         string;
  heure?:       string;
  proprieteId?: string;
  notes?:       string;
}

// ── Suivi Loyers ─────────────────────────────────────────────
export interface MoisLoyerDto {
  periode:     string;
  label:       string;
  montant:     number;
  montantPaye: number;
  statut:      'Paye' | 'Partiel' | 'Impaye' | 'Futur' | 'Avance';
}

export interface RecapFinancierContratDto {
  contratId:         string;
  locataireNom:      string;
  produitCode:       string;
  loyer:             number;
  caution:           number;
  cautionReglee:     boolean;
  avanceLoyer:       number;
  avanceLoyerReglee: boolean;
  moisDepuisEntree:  number;
  moisPayes:         number;
  moisEnAvance:      number;
  moisEnRetard:      number;
  montantDu:         number;
  montantPaye:       number;
  solde:             number;
  statutLoyer:       'AJour' | 'EnRetard' | 'Credit' | 'NonCommence';
  statutLoyerLabel:  string;
  dernierPaiement?:  string;
  dateEntree:        string;
  mois:              MoisLoyerDto[];
}

export interface SuiviLoyersGlobalDto {
  totalDu:       number;
  totalPaye:     number;
  totalSolde:    number;
  nbAJour:       number;
  nbEnRetard:    number;
  nbCredit:      number;
  nbNonCommence: number;
  contrats:      RecapFinancierContratDto[];
}

export interface LigneRecouvrementDto {
  contratId:         string;   // ← ajouté
  collecteurId:      string;
  collecteurNom:     string;
  proprietaireId:    string;
  proprietaireNom:   string;
  proprieteLibelle:  string;
  produitId:         string;
  produitCode:       string;
  loyerReference:    number;
  locataireId:       string;
  locataireNom:      string;
  locataireTel:      string;
  zone:              string;
  statut:            'retard' | 'ajour' | 'avance' | 'attente';
  moisImpayes:       string[];
  montantARecouvrir: number;
  montantCollecte:   number;
  montantAttendu:    number;
}

export interface FeuilleRecouvrementDto {
  lignes:        LigneRecouvrementDto[];
  collecteurs:   { id: string; nom: string }[];
  proprietaires: { id: string; nom: string }[];
  proprietes:    { id: string; nom: string }[];
}

// ══════════════════════════════════════════════════════════════
//  TABLEAU DE BORD FINANCIER AGENCE
// ══════════════════════════════════════════════════════════════

export interface TableauBordAgenceDto {
  mois:                  string;
  loyersCollectesMois:   number;
  commissionsbrutesMois: number;
  fraisGestionMois:      number;
  commissionsNettesMois: number;
  nbContratsActifs:      number;
  tauxCommissionMoyen:   number;
  netAReverserMois:      number;
  chargesSalaires:       number;
  chargesFrais:          number;
  resultatNet:           number;
  commissionsParContrat: CommissionContratAgenceDto[];
  fraisAgence:           FraisAgenceDto[];
  creancesProprietaires: CreanceProprietaireDto[];
  salairesMois:          SalaireMoisDto[];
}

export interface CommissionContratAgenceDto {
  contratId:        string;
  contratNumero:    string;
  proprieteLibelle: string;
  proprietaireNom:  string;
  loyer:            number;
  tauxCommission:   number;
  commissionBrute:  number;
  fraisImputes:     number;
  commissionNette:  number;
}

export interface FraisAgenceDto {
  id:           string;
  categorie:    string;
  libelle:      string;
  montant:      number;
  statut:       'Paye' | 'EnAttente' | 'Impaye';
  dateEcheance?: string;
}

export interface CreanceProprietaireDto {
  id:                    string;
  proprietaireId:        string;
  proprietaireNom:       string;
  proprietaireInitiales: string;
  proprietaireColor:     string;
  proprietes:            string[];
  motif:                 string;
  typeMotif:             'AvanceFrais' | 'TropPercu' | 'CommissionNonVersee' | 'Autre';
  montantTotal:          number;
  montantPaye:           number;
  montantRestant:        number;
  nbEcheances:           number;
  echeancesPaye:         number;
  montantEcheance:       number;
  dateCreation:          string;
  dateDernierPaiement?:  string;
  statut:                'EnCours' | 'Solde' | 'EnAttente' | 'EnRetard';
}

export interface SalaireMoisDto {
  personnelId:    string;
  nomComplet:     string;
  initiales:      string;
  avatarColor:    string;
  poste:          string;
  typeContrat:    string;
  montant:        number;
  statut:         'Verse' | 'EnAttente' | 'Partiel';
  dateVersement?: string;
}

export interface LigneProduitVersementDto {
  produitCode:      string;
  proprieteLibelle: string;
  statutProduit:    'Loue' | 'Vacant' | 'LoyersEnAttente';
  montantEncaisse:  number;
  montantAttendu:   number;
  nbCollectes:      number;
}

export interface DeductionVersementDto {
  type:    string;
  libelle: string;
  montant: number;
}

export interface PeriodeVersementDto {
  periodeId:      string;
  versementId?:   string;  // GUID du versement en base
  moisConcernes:  string[];
  datePrevue:     string;
  dateEffective?: string;
  montantBrut:    number;
  montantReporte: number;
  commission:     number;
  retenueTravaux: number;
  retenueAvance:  number;
  montantNet:     number;
  statut:         'Planifie' | 'EnAttente' | 'Effectue' | 'EnRetard' | 'Annule' | 'Derogation';
  statutLabel:    string;
  reference?:     string;
  lignes:         LigneProduitVersementDto[];
  deductions:     DeductionVersementDto[];
}

export interface SuiviVersementProprieteDto {
  proprieteId:       string;
  contratGestionId:  string;  // pour preparer versement
  proprieteLibelle:  string;
  proprieteAdresse:  string;
  periodicite:       string;
  periodiciteLabel:  string;
  tauxCommission:    number;
  totalBrut:         number;
  totalNet:          number;
  nbProduitsLoues:   number;
  nbProduitsVacants: number;
  periodes:          PeriodeVersementDto[];
}

export interface SuiviVersementProprietaireDto {
  proprietaireId:             string;
  proprietaireNom:            string;
  proprietaireTel:            string;
  proprietes:                 SuiviVersementProprieteDto[];
  totalBrutGlobal:            number;
  totalNetGlobal:             number;
  totalCommissionGlobal:      number;
  totalRetenueTravauxGlobal:  number;
  nbPeriodesEnRetard:         number;
  nbPeriodesTotalPeriodes:    number;
}

export interface SuiviVersementsGlobalDto {
  totalBrutGlobal:         number;
  totalNetGlobal:          number;
  totalCommissionGlobal:   number;
  nbProprietaires:         number;
  nbPeriodesTotalEnRetard: number;
  nbPeriodesTotalAVenir:   number;
  proprietaires:           SuiviVersementProprietaireDto[];
}

export interface MotifPretDto {
  id:      string;
  groupe:  string;
  libelle: string;
  ordre:   number;
}
