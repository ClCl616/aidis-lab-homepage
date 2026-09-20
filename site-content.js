import { getClient } from './activity-api.js';
import { catalog, result } from './site-api.js';
import { safeContentUrl } from './site-model.js';

function apply(root, values) {
  root.querySelectorAll('[data-cms]').forEach(el => {
    const key = el.dataset.cms;
    if (Object.hasOwn(values, key) && typeof values[key] === 'string') {
      if (el.tagName === 'IMG') { const url = safeContentUrl(values[key], 'image'); if (url) el.src = url; }
      else el.textContent = values[key];
    }
    if (el.tagName === 'A' && Object.hasOwn(values, key + '-href')) {
      const url = safeContentUrl(values[key + '-href']);
      if (url) { el.href = url; el.rel = 'noopener noreferrer'; }
    }
  });
}
async function loadContent() {
  const page = location.pathname.split('/').pop() || 'index.html';
  const c = await getClient();
  const rows = await result(c.from('site_pages').select('page,values').in('page', page === 'members.html' ? Object.keys(await catalog()) : [page]));
  apply(document, rows.find(row => row.page === page)?.values || {});
  const bio = document.querySelector('.member-bio');
  if (bio) bio.closest('section').hidden = !bio.textContent.trim() || bio.textContent.trim() === '—';
  if (page !== 'members.html') return;
  const definitions = await catalog();
  document.querySelectorAll('.person-card').forEach(card => {
    const href = card.querySelector('a.member-identity-link')?.getAttribute('href');
    const def = definitions[href], values = rows.find(row => row.page === href)?.values;
    if (!def || !values || !Object.keys(values).length) return;
    const value = key => values[key] ?? def.fields.find(f => f.key === key)?.value;
    const name = value(def.nameKey);
    if (name) { card.querySelector('h3').textContent = name; card.querySelector('a').setAttribute('aria-label', `${name} 상세보기`); }
    const photo = safeContentUrl(value(def.photoKey), 'image');
    if (photo) { card.querySelector('img').src = photo; card.querySelector('img').alt = `${name} 프로필 사진`; }
    let year = card.querySelector('.person-year');
    if (!year && def.factKeys?.학적) { year = document.createElement('p'); year.className='person-year'; card.querySelector('h3').after(year); }
    if (year && def.factKeys?.학적) year.textContent = value(def.factKeys.학적);
    const cohort = card.querySelector('.member-cohort');
    if (cohort && def.factKeys?.기수) cohort.textContent = value(def.factKeys.기수);
    for (const [label, selector] of [['기술 스택','.member-stack-list'],['관심 분야','.member-interests-list']]) {
      let list = card.querySelector(selector); const key = def.factKeys?.[label];
      if (!list && key && value(key) && value(key) !== '—') {
        let facts = card.querySelector('.member-card-facts');
        if (!facts) { facts = document.createElement('dl'); facts.className='member-card-facts'; card.append(facts); }
        const row = document.createElement('div'), term = document.createElement('dt'), detail = document.createElement('dd');
        term.textContent=label; list=document.createElement('ul'); list.className=selector.slice(1); detail.append(list); row.append(term,detail); facts.append(row);
      }
      if (list && key) list.replaceChildren(...String(value(key)).split(' · ').map(text => { const li = document.createElement('li'); li.textContent = text; return li; }));
    }
  });
  document.dispatchEvent(new Event('members-updated'));
}
loadContent().catch(() => { /* Static public content stays readable during outages. */ });
