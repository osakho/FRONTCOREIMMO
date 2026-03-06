// ─────────────────────────────────────────────────────────────
//  confirm-modal.ts  —  à placer dans src/app/core/utils/
//  Usage : await kdiConfirm({ title, message, confirmLabel? })
// ─────────────────────────────────────────────────────────────

export interface KdiConfirmOptions {
  title:         string;
  message:       string;
  confirmLabel?: string;     // défaut : "Confirmer"
  cancelLabel?:  string;     // défaut : "Annuler"
  danger?:       boolean;    // bouton rouge si true
  icon?:         string;     // emoji ou texte
}

export function kdiConfirm(opts: KdiConfirmOptions): Promise<boolean> {
  return new Promise(resolve => {
    const {
      title,
      message,
      confirmLabel = 'Confirmer',
      cancelLabel  = 'Annuler',
      danger       = false,
      icon         = danger ? '⚠️' : '✦',
    } = opts;

    const btnColor = danger
      ? 'background:#dc2626;color:#fff'
      : 'background:linear-gradient(135deg,#c9a96e,#dfc28e);color:#0e1c38';

    const html = `
      <div id="kdi-confirm-overlay"
        style="font-family:'Instrument Sans',sans-serif;position:fixed;inset:0;background:rgba(14,28,56,.55);
               backdrop-filter:blur(4px);z-index:999999;display:flex;align-items:center;justify-content:center;
               animation:kdi-fade-in .15s ease">
        <div style="background:#fff;border-radius:14px;width:400px;max-width:92vw;
                    box-shadow:0 20px 60px rgba(14,28,56,.22),0 4px 16px rgba(14,28,56,.1);
                    display:flex;flex-direction:column;overflow:hidden;
                    animation:kdi-slide-up .18s ease">
          <!-- Header -->
          <div style="padding:22px 22px 0;display:flex;align-items:flex-start;gap:12px">
            <div style="width:40px;height:40px;border-radius:10px;background:${danger?'#fee2e2':'#f2f5fa'};
                        display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0">
              ${icon}
            </div>
            <div style="flex:1;padding-top:2px">
              <div style="font-weight:700;font-size:.95rem;color:#0e1c38;margin-bottom:5px">${title}</div>
              <div style="font-size:.82rem;color:#4a5878;line-height:1.5">${message}</div>
            </div>
          </div>
          <!-- Footer -->
          <div style="display:flex;align-items:center;justify-content:flex-end;gap:8px;padding:20px 22px">
            <button id="kdi-confirm-cancel"
              style="padding:8px 18px;border-radius:8px;font-family:inherit;font-size:.82rem;font-weight:500;
                     cursor:pointer;border:1.5px solid #e3e8f0;background:#fff;color:#4a5878;
                     transition:background .15s">
              ${cancelLabel}
            </button>
            <button id="kdi-confirm-ok"
              style="padding:8px 20px;border-radius:8px;font-family:inherit;font-size:.82rem;font-weight:600;
                     cursor:pointer;border:none;${btnColor};
                     box-shadow:0 2px 8px rgba(14,28,56,.15);transition:opacity .15s">
              ${confirmLabel}
            </button>
          </div>
        </div>
      </div>
      <style>
        @keyframes kdi-fade-in  { from { opacity:0 } to { opacity:1 } }
        @keyframes kdi-slide-up { from { opacity:0;transform:translateY(10px) scale(.97) } to { opacity:1;transform:none } }
        #kdi-confirm-cancel:hover { background:#f2f5fa !important }
        #kdi-confirm-ok:hover     { opacity:.88 }
      </style>`;

    const wrapper = document.createElement('div');
    wrapper.innerHTML = html;
    const overlay = wrapper.firstElementChild as HTMLElement;
    document.body.appendChild(overlay);
    document.body.style.overflow = 'hidden';

    const cleanup = (result: boolean) => {
      overlay.remove();
      document.body.style.overflow = '';
      resolve(result);
    };
    
    overlay.querySelector('#kdi-confirm-ok')    ?.addEventListener('click', () => cleanup(true));
    overlay.querySelector('#kdi-confirm-cancel')?.addEventListener('click', () => cleanup(false));

    // Fermer sur clic overlay (hors modale)
    overlay.addEventListener('click', (e) => {
      if ((e.target as HTMLElement).id === 'kdi-confirm-overlay') cleanup(false);
    });

    // Raccourcis clavier
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter')  { document.removeEventListener('keydown', onKey); cleanup(true);  }
      if (e.key === 'Escape') { document.removeEventListener('keydown', onKey); cleanup(false); }
    };
    document.addEventListener('keydown', onKey);

    // Focus automatique sur le bouton OK
    setTimeout(() => (overlay.querySelector('#kdi-confirm-ok') as HTMLElement)?.focus(), 50);
  });
}