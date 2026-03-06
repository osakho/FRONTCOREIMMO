import { Component, OnInit, inject } from '@angular/core';
import { Router, ActivatedRoute }    from '@angular/router';

/**
 * Redirige /proprietaires/:id/edit → /proprietaires/:id?edit=1
 * Le modal d'édition s'ouvre automatiquement grâce au query param.
 */
@Component({
  selector: 'kdi-proprietaire-edit-redirect',
  standalone: true,
  template: ``
})
export class ProprietaireEditRedirectComponent implements OnInit {
  private router = inject(Router);
  private route  = inject(ActivatedRoute);

  ngOnInit() {
    const id = this.route.snapshot.params['id'];
    this.router.navigate(['/proprietaires', id], {
      queryParams: { edit: '1' },
      replaceUrl: true
    });
  }
}