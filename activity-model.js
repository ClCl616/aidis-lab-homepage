export const categories = Object.freeze({
  development: '개발', competition: '공모전·수상', education: '교육·운영', presentation: '발표·공유',
});
export const isActivityId = value => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value || '');
export function safeLink(value) {
  if (!value) return '';
  try {
    const url = new URL(value);
    return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password ? url.href : '';
  } catch { return ''; }
}
export function validateActivity(input) {
  const result = {};
  for (const [field, label, max] of [['title', '제목', 120], ['summary', '요약', 300], ['body', '본문', 30000]]) {
    const value = String(input[field] || '').trim();
    if (!value || [...value].length > max) throw new Error(`${label}을(를) 1~${max}자 이내로 입력해 주세요.`);
    result[field] = value;
  }
  if (!Object.hasOwn(categories, input.category)) throw new Error('활동 분류를 선택해 주세요.');
  result.category = input.category;
  const date = input.activity_date || null;
  if (date && (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date.slice(0, 4) === '0000' ||
    !Number.isFinite(Date.parse(date)) || new Date(date).toISOString().slice(0, 10) !== date)) {
    throw new Error('올바른 활동일을 입력해 주세요.');
  }
  result.activity_date = date;
  const link = String(input.link_url || '').trim();
  if (link && (!safeLink(link) || link.length > 2000)) throw new Error('관련 링크는 2000자 이내의 http 또는 https 주소로 입력해 주세요.');
  result.link_url = link || null;
  return result;
}
export function element(tag, text, className) {
  const node = document.createElement(tag);
  if (text != null) node.textContent = text;
  if (className) node.className = className;
  return node;
}
export function renderActivity(container, post) {
  const meta = [categories[post.category], post.activity_date?.replaceAll('-', '.')].filter(Boolean).join(' · ');
  const title = element('h2', post.title, 'activity-post-title');
  container.replaceChildren(element('p', meta, 'activity-post-meta'), title,
    element('p', post.summary, 'activity-post-summary'), element('div', post.body, 'activity-post-body'));
  const href = safeLink(post.link_url);
  if (href) {
    const link = element('a', '관련 자료 보기 ↗', 'plain-link');
    link.href = href;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    const paragraph = element('p');
    paragraph.append(link);
    container.append(paragraph);
  }
}
