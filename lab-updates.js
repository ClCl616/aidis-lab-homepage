// Public events only. Dates use YYYY-MM-DD in Korea time.
// Add { title, date, location, url } after the schedule is confirmed.
const labEvents = [];
const koreaToday = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit',
}).format(new Date());
const upcoming = labEvents.filter(event => event.date >= koreaToday)
  .sort((a, b) => a.date.localeCompare(b.date)).slice(0, 3);
const eventContainer = document.getElementById('upcoming-events');
if (upcoming.length) {
  eventContainer.replaceChildren();
  upcoming.forEach(event => {
    const article = document.createElement('article');
    article.className = 'event-item';
    const time = document.createElement('time');
    time.dateTime = event.date;
    time.textContent = event.date.replaceAll('-', '.');
    const title = document.createElement('h3');
    title.textContent = event.title;
    const location = document.createElement('p');
    location.textContent = event.location || '';
    article.append(time, title, location);
    if (event.url) {
      const url = new URL(event.url, document.baseURI);
      if (['http:', 'https:'].includes(url.protocol)) {
        const link = document.createElement('a');
        link.href = url.href;
        link.className = 'plain-link';
        link.textContent = '일정 상세보기 ↗';
        article.append(link);
      }
    }
    eventContainer.append(article);
  });
}
