export function safeContentUrl(value, type = 'link') {
  const raw = String(value || '').trim();
  if (!raw || /[\u0000-\u0020\\]/.test(raw)) return null;
  if (/^(?:assets\/|[a-z0-9-]+\.html(?:[?#]|$)|#)/i.test(raw)) return raw;
  try {
    const url = new URL(raw);
    if (url.username || url.password) return null;
    if (type === 'image') return url.protocol === 'https:' ? raw : null;
    return ['https:', 'http:', 'mailto:', 'tel:'].includes(url.protocol) ? raw : null;
  } catch { return null; }
}
export function validateContent(values, fields) {
  const result = {};
  for (const field of fields) {
    const raw = String(values[field.key] ?? field.value);
    const value = field.type === 'text' ? raw : raw.trim();
    if (value.length > 12000) throw new Error(`${field.label}: 12,000자 이내로 입력해 주세요.`);
    if (field.type !== 'text' && !safeContentUrl(value, field.type)) throw new Error(`${field.label}: 올바른 링크를 입력해 주세요.`);
    result[field.key] = value;
  }
  if (JSON.stringify(result).length > 100000) throw new Error('페이지 내용이 너무 깁니다.');
  return result;
}
