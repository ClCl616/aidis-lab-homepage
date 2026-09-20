import { getClient } from './activity-api.js';
const link = document.querySelector('[data-account-link]');
if (link) {
  getClient().then(c => {
    const update = session => { link.textContent = session ? '마이페이지' : '로그인'; };
    c.auth.getSession().then(({ data }) => update(data.session));
    c.auth.onAuthStateChange((_event, session) => update(session));
  }).catch(() => { link.textContent = '로그인'; });
}
