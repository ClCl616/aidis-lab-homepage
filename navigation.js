// Preserve links shared before the single-page site was split into pages.
const legacyPages = {
  about: 'about.html', professor: 'professor.html', research: 'research.html',
  members: 'members.html', projects: 'professor.html#projects', contact: 'contact.html',
};
function followLegacyLink() {
  const destination = legacyPages[location.hash.slice(1)];
  if (destination) location.replace(new URL(destination, location.href));
}
followLegacyLink();
window.addEventListener('hashchange', followLegacyLink);
