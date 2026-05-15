'use strict';
// auth-widget.js — petit indicateur de session en haut à droite.
// Auto-injecté via <script src="/auth-widget.js" defer></script>.
// Si user connecté : "email · Déconnexion". Sinon : "Se connecter".

(function () {
  const STYLE = `
.wendio-auth-widget{position:fixed;top:12px;right:12px;z-index:1000;font:500 13px/1.3 'Inter','Segoe UI',sans-serif;display:flex;align-items:center;gap:10px;background:rgba(34,23,16,.78);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);border:1px solid rgba(244,231,211,.10);border-radius:20px;padding:6px 10px 6px 14px;color:#b89978;box-shadow:0 4px 14px rgba(0,0,0,.25)}
.wendio-auth-widget .email{color:#e8a85a;font-weight:600;letter-spacing:.02em;max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.wendio-auth-widget a,.wendio-auth-widget button{background:transparent;border:none;color:#b89978;cursor:pointer;font:inherit;text-decoration:none;padding:4px 8px;border-radius:12px;transition:background .14s,color .14s}
.wendio-auth-widget a:hover,.wendio-auth-widget button:hover{background:rgba(244,231,211,.06);color:#f4e7d3}
.wendio-auth-widget.login a{color:#e8a85a;font-weight:600}
@media (max-width:540px){.wendio-auth-widget{font-size:12px}.wendio-auth-widget .email{max-width:120px}}
@media print{.wendio-auth-widget{display:none!important}}
`;

  function injectStyle() {
    if (document.getElementById('wendio-auth-style')) return;
    const s = document.createElement('style');
    s.id = 'wendio-auth-style';
    s.appendChild(document.createTextNode(STYLE));
    document.head.appendChild(s);
  }

  function el(tag, props, ...children) {
    const e = document.createElement(tag);
    for (const k in (props || {})) {
      const v = props[k];
      if (v == null || v === false) continue;
      if (k.startsWith('on') && typeof v === 'function') e.addEventListener(k.slice(2).toLowerCase(), v);
      else if (k === 'class') e.className = v;
      else e.setAttribute(k, v);
    }
    for (const c of children.flat()) {
      if (c == null || c === false) continue;
      e.append(c instanceof Node ? c : document.createTextNode(String(c)));
    }
    return e;
  }

  async function render() {
    injectStyle();
    let user = null;
    try {
      const r = await fetch('/auth/me', { credentials: 'same-origin' });
      if (r.ok) user = await r.json();
    } catch (_e) { /* offline ou pas de backend */ }

    // Cherche un placeholder, sinon crée en fixed
    const placeholder = document.querySelector('[data-wendio-auth-slot]');
    const container = placeholder || el('div');
    if (!placeholder) document.body.appendChild(container);

    const widget = el('div', { class: 'wendio-auth-widget' + (user ? '' : ' login') });

    if (user) {
      widget.append(
        el('span', { class: 'email', title: user.email }, user.email),
        el('button', {
          type: 'button',
          onclick: async () => {
            try {
              await fetch('/auth/logout', { method: 'POST', credentials: 'same-origin' });
            } catch (_e) {}
            window.location.href = '/';
          },
        }, 'Déconnexion'),
      );
    } else {
      const next = encodeURIComponent(location.pathname + location.search);
      widget.append(
        el('a', { href: '/login?next=' + next }, '🔑 Se connecter'),
      );
    }

    container.replaceChildren(widget);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', render);
  } else {
    render();
  }
})();
