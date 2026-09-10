const memberTabs = [...document.querySelectorAll('.people-nav [role="tab"]')];

function selectMemberTab(index) {
  memberTabs.forEach((tab, i) => {
    const selected = i === index;
    tab.setAttribute('aria-selected', String(selected));
    tab.tabIndex = selected ? 0 : -1;
    document.getElementById(tab.getAttribute('aria-controls')).hidden = !selected;
  });
}

function followMemberHash() {
  selectMemberTab(['#alumni', '#achievements'].includes(location.hash) ? 1 : 0);
}

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
