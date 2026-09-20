import { getClient, isAdmin } from './activity-api.js';
import { validateContent } from './site-model.js';
import { validateActivity } from './activity-model.js';
let catalogPromise;
export function catalog() {
  return catalogPromise ||= fetch('cms-catalog.json').then(r => { if (!r.ok) throw new Error('편집 항목을 불러오지 못했습니다.'); return r.json(); });
}
export async function result(query) {
  const { data, error } = await query;
  if (error) throw error;
  return data;
}
export async function identity() {
  const c = await getClient();
  const { data: { user }, error } = await c.auth.getUser();
  if (error || !user) return { user: null, admin: false, membership: null };
  const [admin, membership] = await Promise.all([isAdmin(), result(c.from('member_requests').select('*').eq('user_id', user.id).maybeSingle())]);
  return { user, admin, membership };
}
export async function pageData(page) {
  const c = await getClient();
  return result(c.from('site_pages').select('*').eq('page', page).single());
}
export async function settings() {
  return result((await getClient()).from('site_settings').select('*').eq('id', true).single());
}
export async function savePage(row, input, fields) {
  const values = validateContent(input, fields);
  const c = await getClient();
  const data = await result(c.from('site_pages').update({ values }).eq('page', row.page).eq('updated_at', row.updated_at).select().maybeSingle());
  if (!data) throw new Error('다른 사람이 변경했거나 권한이 만료되었습니다. 입력 내용을 보관하고 새로 불러와 주세요.');
  return data;
}
export async function submitActivity(input, existing = null, status = 'pending') {
  const values = { ...validateActivity(input), status };
  const c = await getClient();
  const q = existing ? c.from('lab_activities').update(values).eq('id', existing.id).eq('updated_at', existing.updated_at) : c.from('lab_activities').insert(values);
  const row = await result(q.select().maybeSingle());
  if (!row) throw new Error('활동이 변경되었거나 권한이 만료되었습니다. 새로고침 후 다시 시도해 주세요.');
  return row;
}
export async function updateActivity(row, values) {
  const c = await getClient();
  const saved = await result(c.from('lab_activities').update(values).eq('id', row.id).eq('updated_at', row.updated_at).select().maybeSingle());
  if (!saved) throw new Error('활동이 변경되었거나 권한이 만료되었습니다. 다시 불러와 주세요.');
  return saved;
}
