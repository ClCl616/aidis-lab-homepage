const filters = [...document.querySelectorAll('[data-filter]')];
const activityCards = [...document.querySelectorAll('[data-category]')];
const categoryLinks = [...document.querySelectorAll('.section-menu a')];
function selectActivityCategory(category) {
  const selected = filters.some(filter => filter.dataset.filter === category) ? category : 'all';
  filters.forEach(filter => filter.setAttribute('aria-pressed', String(filter.dataset.filter === selected)));
  categoryLinks.forEach(link => {
    if (link.hash === `#${selected}`) link.setAttribute('aria-current', 'location');
    else link.removeAttribute('aria-current');
  });
  let count = 0;
  activityCards.forEach(card => {
    card.hidden = selected !== 'all' && card.dataset.category !== selected;
    if (!card.hidden) count++;
  });
  document.getElementById('activity-count').textContent = `활동 ${count}건`;
  document.getElementById('activity-empty').hidden = count !== 0;
}
function followActivityCategory() {
  selectActivityCategory(location.hash.slice(1));
}
filters.forEach(button => button.addEventListener('click', () => {
  history.pushState(null, '', `#${button.dataset.filter}`);
  selectActivityCategory(button.dataset.filter);
}));
window.addEventListener('hashchange', followActivityCategory);
window.addEventListener('popstate', followActivityCategory);
window.addEventListener('pageshow', followActivityCategory);
followActivityCategory();
