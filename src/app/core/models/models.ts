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
  id:               string;
  numero:           string;
  produitCode:      string;
  locataireNom:     string;
  loyer:            number;
  statutLabel:      string;
  dateEntree:       string;
  dateSortiePrevue?:string;
  estEnRetard:      boolean;
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
  nom:                string;
  nbCollectesSemaine: number;
  montantSemaine:     number;
  nbRetards:          number;
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
