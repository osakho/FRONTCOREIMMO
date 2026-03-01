import { Routes } from '@angular/router';
import { authGuard, directionGuard } from './core/guards/auth.guard';
import { VersementsComponent } from './features/versements/versements.component';

export const routes: Routes = [
  { path: 'login', loadComponent: () => import('./features/auth/login.component').then(m => m.LoginComponent) },

  {
    path: '',
    loadComponent: () => import('./shared/layout/shell.component').then(m => m.ShellComponent),
    canActivate: [authGuard],
    children: [
      { path: '',          redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent) },

      // Propriétaires
      { path: 'proprietaires',         loadComponent: () => import('./features/proprietaires/list/proprietaires-list.component').then(m => m.ProprietairesListComponent) },
      { path: 'proprietaires/nouveau', loadComponent: () => import('./features/proprietaires/form/proprietaire-form.component').then(m => m.ProprietaireFormComponent) },
      { path: 'proprietaires/:id',     loadComponent: () => import('./features/proprietaires/detail/proprietaire-detail.component').then(m => m.ProprietaireDetailComponent) },
      { path: 'proprietaires/:id/edit',loadComponent: () => import('./features/proprietaires/form/proprietaire-form.component').then(m => m.ProprietaireFormComponent) },

      // Propriétés
      { path: 'proprietes',         loadComponent: () => import('./features/proprietes/list/proprietes-list.component').then(m => m.ProprietesListComponent) },
      { path: 'proprietes/nouvelle',loadComponent: () => import('./features/proprietes/form/propriete-form.component').then(m => m.ProprieteFormComponent) },
      { path: 'proprietes/:id',     loadComponent: () => import('./features/proprietes/detail/propriete-detail.component').then(m => m.ProprieteDetailComponent) },

      // Produits
      { path: 'produits',        loadComponent: () => import('./features/produits/list/produits-list.component').then(m => m.ProduitsListComponent) },
      { path: 'produits/nouveau',loadComponent: () => import('./features/produits/form/produit-form.component').then(m => m.ProduitFormComponent) },
      { path: 'produits/:id',    loadComponent: () => import('./features/produits/detail/produit-detail.component').then(m => m.ProduitDetailComponent) },

      // Contrats de gestion
      { path: 'contrats-gestion',         loadComponent: () => import('./features/contrats-gestion/list/contrats-gestion-list.component').then(m => m.ContratsGestionListComponent), canActivate: [directionGuard] },
      { path: 'contrats-gestion/nouveau', loadComponent: () => import('./features/contrats-gestion/form/contrat-gestion-form.component').then(m => m.ContratGestionFormComponent), canActivate: [directionGuard] },

      // Locataires
      { path: 'locataires',         loadComponent: () => import('./features/locataires/list/locataires-list.component').then(m => m.LocatairesListComponent) },
      { path: 'locataires/nouveau', loadComponent: () => import('./features/locataires/form/locataire-form.component').then(m => m.LocataireFormComponent) },
      { path: 'locataires/:id',     loadComponent: () => import('./features/locataires/detail/locataire-detail.component').then(m => m.LocataireDetailComponent) },

      // Contrats de location (bail)
      { path: 'contrats-location',         loadComponent: () => import('./features/contrats-location/list/contrats-location-list.component').then(m => m.ContratsLocationListComponent) },
      { path: 'contrats-location/nouveau', loadComponent: () => import('./features/contrats-location/form/contrat-location-form.component').then(m => m.ContratLocationFormComponent) },
      { path: 'contrats-location/:id',     loadComponent: () => import('./features/contrats-location/detail/contrat-location-detail.component').then(m => m.ContratLocationDetailComponent) },

      // Collectes
      { path: 'collectes',           loadComponent: () => import('./features/collectes/list/collectes-list.component').then(m => m.CollectesListComponent) },
      { path: 'collectes/saisir',    loadComponent: () => import('./features/collectes/saisie/collecte-saisie.component').then(m => m.CollecteSaisieComponent) },
      { path: 'collectes/bordereau', loadComponent: () => import('./features/collectes/bordereau/bordereau.component').then(m => m.BordereauComponent) },
      { path: 'collectes/rapport',   loadComponent: () => import('./features/collectes/rapport/rapport-collecteur.component').then(m => m.RapportCollecteurComponent) },

      // Personnel
      { path: 'personnel',         loadComponent: () => import('./features/personnel/list/personnel-list.component').then(m => m.PersonnelListComponent), canActivate: [directionGuard] },
      { path: 'personnel/nouveau', loadComponent: () => import('./features/personnel/form/personnel-form.component').then(m => m.PersonnelFormComponent), canActivate: [directionGuard] },
      
      //Verements
      {path: 'versements', component:VersementsComponent},

      // Dashboard propriétaires (remplace ou complète la liste simple)
      { path: 'proprietaires/dashboard', loadComponent: () => import('./features/proprietaires/dashboard/proprietaires-dashboard.component').then(m => m.ProprietairesDashboardComponent),
        canActivate: [directionGuard]
      },
    ]
  },

  { path: '**', redirectTo: 'dashboard' }
];
