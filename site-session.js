import { getClient } from './activity-api.js';
import { identity, catalog, pageData } from './site-api.js';
const link = document.querySelector('[data-account-link]');
if (link) {
  getClient().then(c => {
    let generation = 0;
    const update = async session => {
      const ticket = ++generation;
      document.querySelectorAll('[data-admin-only]').forEach(el => { el.hidden = true; });
      link.textContent = session ? '회원님' : 'Login';
      link.setAttribute('aria-label', session ? '마이페이지' : 'Login');
      if (!session) return;
      try {
        const who = await identity();
        if (ticket !== generation || !who.user) return;
        let name = String(who.user.user_metadata?.display_name || '').trim();
        if (!name && who.membership?.status === 'approved') {
          const page = who.membership.member_page;
          const [definitions, row] = await Promise.all([catalog(), pageData(page)]);
          const def = definitions[page];
          name = String(row.values[def?.nameKey] || def?.title || '').trim();
        }
        if (ticket !== generation) return;
        link.textContent = `${name || (who.admin ? '관리자' : '회원')}님`;
        link.setAttribute('aria-label', `${link.textContent} 마이페이지`);
        document.querySelectorAll('[data-admin-only]').forEach(el => { el.hidden = !who.admin; });
      } catch { /* Keep a safe label and hide administrative shortcuts if lookup fails. */ }
    };
    c.auth.getSession().then(({ data }) => update(data.session));
    // Do not call Auth APIs from inside its own state-change callback.
    c.auth.onAuthStateChange((_event, session) => { setTimeout(() => update(session), 0); });
    document.addEventListener('account-name-updated', () => c.auth.getSession().then(({data}) => update(data.session)));
  }).catch(() => { link.textContent = 'Login'; });
}
