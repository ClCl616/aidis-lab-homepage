import { listActivityPage } from './activity-api.js';
import { categories, element } from './activity-model.js';
const filters = [...document.querySelectorAll('[data-filter]')];
const categoryLinks = [...document.querySelectorAll('.section-menu a')];
const list = document.querySelector('.activity-list');
const legacy = list.querySelector('.activity-card');
const status = document.getElementById('activity-load-status');
const retry = document.getElementById('activity-retry');
const more = document.getElementById('activity-more');
let category = 'all', offset = 0, total = 0, generation = 0;
function card(post) {
  const article = element('article', null, 'activity-card member-activity-card');
  article.dataset.category = post.category; article.dataset.postId = post.id;
  const copy = element('div', null, 'activity-card-copy');
  const heading = element('h2'); const link = element('a', post.title);
  link.href = `activity.html?id=${encodeURIComponent(post.id)}`; heading.append(link);
  copy.append(element('p', [categories[post.category], post.activity_date?.replaceAll('-', '.')].filter(Boolean).join(' · '), 'overline'), heading, element('p', post.summary));
  article.append(copy); return article;
}
async function load(reset = false) {
  const ticket = ++generation;
  if (reset) {
    offset = 0; total = 0;
    list.querySelectorAll('[data-post-id]').forEach(node => node.remove());
  }
  status.textContent = '새 활동을 불러오고 있습니다.'; retry.hidden = true; more.hidden = true;
  document.getElementById('activity-empty').hidden = true;
  try {
    const page = await listActivityPage(category, offset);
    if (ticket !== generation) return;
    for (const post of page.data) {
      if (![...list.querySelectorAll('[data-post-id]')].some(node => node.dataset.postId === post.id)) list.insertBefore(card(post), legacy);
    }
    offset += page.data.length; total = page.count;
    const count = total + Number(!legacy.hidden);
    document.getElementById('activity-count').textContent = `활동 ${count}건`;
    document.getElementById('activity-empty').hidden = count !== 0;
    more.hidden = offset >= total || !page.data.length;
    status.textContent = '';
  } catch {
    if (ticket !== generation) return;
    status.textContent = '새 활동을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.';
    document.getElementById('activity-count').textContent = `현재 표시 중인 활동 ${list.querySelectorAll('[data-post-id]').length + Number(!legacy.hidden)}건`;
    retry.hidden = false;
  }
}
function followActivityCategory() {
  const requested = location.hash.slice(1);
  category = Object.hasOwn(categories, requested) ? requested : 'all';
  filters.forEach(filter => filter.setAttribute('aria-pressed', String(filter.dataset.filter === category)));
  categoryLinks.forEach(link => {
    if (link.hash === `#${category}`) link.setAttribute('aria-current', 'location');
    else link.removeAttribute('aria-current');
  });
  legacy.hidden = category !== 'all' && category !== 'competition';
  document.getElementById('activity-count').textContent = '활동 목록 확인 중';
  void load(true);
}
filters.forEach(button => button.addEventListener('click', () => {
  history.pushState(null, '', `#${button.dataset.filter}`); followActivityCategory();
}));
window.addEventListener('hashchange', followActivityCategory);
window.addEventListener('popstate', followActivityCategory);
window.addEventListener('pageshow', event => { if (event.persisted) followActivityCategory(); });
retry.addEventListener('click', () => { void load(false); });
more.addEventListener('click', () => { void load(false); });
followActivityCategory();
