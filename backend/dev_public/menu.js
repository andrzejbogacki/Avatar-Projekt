'use strict';

// Wspólne menu modułów dla stron podglądu deweloperskiego.
// Jedno źródło prawdy o liście modułów — dołączane przez <script src="/menu.js">
// nad elementem <nav id="menu-moduly"></nav>. Kolejność wg ROADMAPA_BACKEND.md.
(function () {
    const MODULY = [
        { id: 'qac', nazwa: 'QAC', href: '/', stan: 'gotowy' },
        { id: 'auth', nazwa: 'Auth', href: '/auth.html', stan: 'gotowy' },
        { id: 'ps', nazwa: 'Protokół Suwerenności', href: '/ps.html', stan: 'gotowy' },
        { id: 'wymiennik', nazwa: 'Wymiennik (Gebo)', href: '/wymiennik.html', stan: 'gotowy' },
        { id: 'rezonator', nazwa: 'Rezonator Kwantowy', href: '/rezonator.html', stan: 'gotowy' },
        { id: 'glosariusz', nazwa: 'Glosariusz', href: '/glosariusz.html', stan: 'gotowy' },
        { id: 'dokumentacja', nazwa: 'Dokumentacja', href: '/dokumenty.html', stan: 'gotowy' },
    ];

    const CSS = `
    #menu-moduly { margin-bottom: 20px; }
    #menu-moduly .pasek { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
    #menu-moduly .pozycja { display: inline-flex; align-items: center; gap: 8px;
        border: 1px solid rgba(212,175,55,0.4); border-radius: 6px; padding: 6px 14px;
        font-size: 0.85rem; letter-spacing: 1px; text-transform: uppercase;
        color: var(--accent, #d4af37); text-decoration: none; background: none; }
    #menu-moduly a.pozycja:hover:not(.aktywny) { background: rgba(212,175,55,0.15); }
    #menu-moduly .pozycja.aktywny { background: var(--accent, #d4af37); color: #000; font-weight: bold; }
    #menu-moduly .pozycja.nieaktywny { opacity: 0.45; cursor: default; border-style: dashed; }
    #menu-moduly .badz { font-size: 0.6rem; letter-spacing: 0; text-transform: none;
        border: 1px solid currentColor; border-radius: 10px; padding: 1px 7px; opacity: 0.85; }
    #menu-moduly .hamburger { display: none; background: #1a1a1a;
        border: 1px solid var(--accent, #d4af37); color: var(--accent, #d4af37);
        border-radius: 6px; padding: 8px 14px; font-size: 1rem; cursor: pointer; width: 100%;
        text-align: left; }
    #menu-moduly .hamburger::before { content: '☰  '; }
    @media (max-width: 640px) {
        #menu-moduly .hamburger { display: block; }
        #menu-moduly .pasek { display: none; flex-direction: column; align-items: stretch;
            margin-top: 8px; gap: 6px; }
        #menu-moduly .pasek.otwarte { display: flex; }
        #menu-moduly .pozycja { justify-content: space-between; }
    }`;

    function zbuduj() {
        const kontener = document.getElementById('menu-moduly');
        if (!kontener) return;

        const styl = document.createElement('style');
        styl.textContent = CSS;
        document.head.appendChild(styl);

        const przycisk = document.createElement('button');
        przycisk.className = 'hamburger';
        przycisk.type = 'button';
        przycisk.textContent = 'Moduły';
        przycisk.setAttribute('aria-expanded', 'false');

        const pasek = document.createElement('div');
        pasek.className = 'pasek';

        const tutaj = location.pathname === '/podglad.html' ? '/' : location.pathname;
        for (const m of MODULY) {
            let el;
            if (m.href) {
                el = document.createElement('a');
                el.href = m.href;
                el.className = 'pozycja' + (m.href === tutaj ? ' aktywny' : '');
                el.textContent = m.nazwa;
            } else {
                el = document.createElement('span');
                el.className = 'pozycja nieaktywny';
                el.title = `Moduł w przygotowaniu (roadmapa: ${m.stan})`;
                el.textContent = m.nazwa;
                const badz = document.createElement('span');
                badz.className = 'badz';
                badz.textContent = m.stan;
                el.appendChild(badz);
            }
            pasek.appendChild(el);
        }

        przycisk.addEventListener('click', () => {
            const otwarte = pasek.classList.toggle('otwarte');
            przycisk.setAttribute('aria-expanded', String(otwarte));
        });

        kontener.appendChild(przycisk);
        kontener.appendChild(pasek);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', zbuduj);
    } else {
        zbuduj();
    }
})();
