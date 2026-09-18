// Sort within each member group: leader first, then earlier cohort and entry year.
function sortMemberCards() {
  const numericValue = (card, key) => {
    const raw = card.dataset[key];
    const value = raw == null || raw.trim() === '' ? NaN : Number(raw);
    return Number.isFinite(value) && value >= 0 ? value : Number.MAX_SAFE_INTEGER;
  };
  document.querySelectorAll('.person-grid').forEach(grid => {
    const cards = [...grid.querySelectorAll(':scope > .person-card')];
    cards.sort((a, b) =>
      Number(b.dataset.leader === '1') - Number(a.dataset.leader === '1') ||
      numericValue(a, 'cohort') - numericValue(b, 'cohort') ||
      numericValue(a, 'entryYear') - numericValue(b, 'entryYear')
    );
    cards.forEach(card => grid.append(card));
  });
}
sortMemberCards();


const memberTabs = [...document.querySelectorAll('.people-nav [role="tab"]')];
const memberSearch = document.getElementById('member-search');
const searchClear = document.getElementById('member-search-clear');
const searchStatus = document.getElementById('member-search-status');
const searchEmpty = document.getElementById('member-search-empty');
const normalizeSearch = value => value.normalize('NFKC').toLocaleLowerCase().replace(/\s+/g, ' ').trim();
const memberCards = [...document.querySelectorAll('.person-card')].map(card => ({
  card, text: normalizeSearch(card.textContent),
}));
memberTabs.forEach(tab => {
  const panel = document.getElementById(tab.getAttribute('aria-controls'));
  const count = document.createElement('span');
  count.className = 'member-tab-count';
  count.textContent = panel.querySelectorAll('.person-card').length;
  count.setAttribute('aria-hidden', 'true');
  tab.append(count);
});
document.querySelector('.member-search').hidden = false;

function filterMembers() {
  const query = normalizeSearch(memberSearch.value);
  const words = query.split(' ').filter(Boolean);
  memberCards.forEach(({ card, text }) => {
    card.hidden = !words.every(word => text.includes(word));
  });
  const tab = memberTabs.find(tab => tab.getAttribute('aria-selected') === 'true');
  const panel = document.getElementById(tab.getAttribute('aria-controls'));
  const total = panel.querySelectorAll('.person-card').length;
  const matched = panel.querySelectorAll('.person-card:not([hidden])').length;
  searchClear.hidden = !memberSearch.value;
  searchStatus.hidden = !query;
  searchStatus.textContent = query ? `검색 결과 ${matched}명 · ${tab.id === 'tab-alumni' ? '졸업생' : '재학생'} 전체 ${total}명` : '';
  searchEmpty.hidden = !query || matched !== 0 || total === 0;
  fitMemberTags();
}
function selectMemberTab(index) {
  document.querySelectorAll('.section-menu a[href="#members"], .section-menu a[href="#alumni"]').forEach(link => {
    const selected = link.getAttribute('href') === (index === 1 ? '#alumni' : '#members');
    if (selected) link.setAttribute('aria-current', 'location');
    else link.removeAttribute('aria-current');
  });
  memberTabs.forEach((tab, i) => {
    const selected = i === index;
    tab.setAttribute('aria-selected', String(selected));
    tab.tabIndex = selected ? 0 : -1;
    document.getElementById(tab.getAttribute('aria-controls')).hidden = !selected;
  });
  filterMembers();
}
function followMemberHash() {
  memberSearch.value = new URL(location.href).searchParams.get('q') || '';
  selectMemberTab(['#alumni', '#achievements'].includes(location.hash) ? 1 : 0);
}
function updateSearch() {
  const url = new URL(location.href);
  const query = memberSearch.value.trim();
  if (query) url.searchParams.set('q', query);
  else url.searchParams.delete('q');
  history.replaceState(null, '', url);
  filterMembers();
}
function clearSearch() {
  memberSearch.value = '';
  updateSearch();
  memberSearch.focus();
}
memberSearch.addEventListener('input', updateSearch);
memberSearch.addEventListener('keydown', event => {
  if (event.key === 'Escape') { event.preventDefault(); clearSearch(); }
});
searchClear.addEventListener('click', clearSearch);
document.getElementById('member-search-reset').addEventListener('click', clearSearch);
memberTabs.forEach((tab, index) => {
  tab.addEventListener('click', () => {
    selectMemberTab(index);
    history.pushState(null, '', index === 1 ? '#alumni' : '#members');
  });
  tab.addEventListener('keydown', event => {
    let next;
    if (event.key === 'ArrowRight') next = (index + 1) % memberTabs.length;
    if (event.key === 'ArrowLeft') next = (index + memberTabs.length - 1) % memberTabs.length;
    if (event.key === 'Home') next = 0;
    if (event.key === 'End') next = memberTabs.length - 1;
    if (next === undefined) return;
    event.preventDefault();
    memberTabs[next].focus();
    memberTabs[next].click();
  });
});
followMemberHash();
window.addEventListener('hashchange', followMemberHash);
window.addEventListener('popstate', followMemberHash);
window.addEventListener('pageshow', followMemberHash);

// Keep only complete tags that fit in one desktop row; preserve text for search.
function fitMemberTags() {
  const desktop = window.matchMedia('(min-width: 1000px)').matches;
  document.querySelectorAll('.member-stack-list, .member-interests-list').forEach(list => {
    const items = [...list.children];
    items.forEach(item => { item.hidden = false; });
    if (!desktop || !list.getClientRects().length) return;
    const available = list.clientWidth;
    const gap = parseFloat(getComputedStyle(list).columnGap) || 0;
    let used = 0;
    let visible = 0;
    items.forEach(item => {
      const width = item.getBoundingClientRect().width;
      const next = used + (visible ? gap : 0) + width;
      if (next > available) item.hidden = true;
      else { used = next; visible += 1; }
    });
  });
}
let tagFitFrame;
function scheduleTagFit() {
  cancelAnimationFrame(tagFitFrame);
  tagFitFrame = requestAnimationFrame(fitMemberTags);
}
const tagResizeObserver = new ResizeObserver(scheduleTagFit);
document.querySelectorAll('.member-stack-list, .member-interests-list').forEach(list => tagResizeObserver.observe(list));
window.addEventListener('resize', scheduleTagFit);
document.fonts.ready.then(scheduleTagFit);
fitMemberTags();
