const filters = [...document.querySelectorAll('[data-filter]')];
const activityCards = [...document.querySelectorAll('[data-category]')];
filters.forEach(button => button.addEventListener('click', () => {
  filters.forEach(filter => filter.setAttribute('aria-pressed', String(filter === button)));
  let count = 0;
  activityCards.forEach(card => {
    card.hidden = button.dataset.filter !== 'all' && card.dataset.category !== button.dataset.filter;
    if (!card.hidden) count++;
  });
  document.getElementById('activity-count').textContent = `활동 ${count}건`;
  document.getElementById('activity-empty').hidden = count !== 0;
}));
