import { activityConfig } from './activity-config.js';
import { validateActivity, isActivityId } from './activity-model.js';

let clientPromise;
export function configured() {
  return /^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/.test(activityConfig.url) &&
    /^sb_publishable_[A-Za-z0-9_-]+$/.test(activityConfig.publishableKey);
}
export async function getClient() {
  if (!configured()) throw new Error('Supabase 연결 설정이 필요합니다. 운영 담당자에게 문의해 주세요.');
  if (!clientPromise) clientPromise = (async () => {
    // Carry over the previous per-tab login once when upgrading to site-wide sessions.
    const storageKey = `sb-${new URL(activityConfig.url).hostname.split('.')[0]}-auth-token`;
    if (!localStorage.getItem(storageKey) && sessionStorage.getItem(storageKey)) {
      localStorage.setItem(storageKey, sessionStorage.getItem(storageKey));
    }
    sessionStorage.removeItem(storageKey);
    if (!globalThis.supabase) await new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = new URL('./assets/vendor/supabase-2.116.0.js', import.meta.url).href;
      script.onload = resolve;
      script.onerror = () => { script.remove(); reject(new Error('로그인 기능을 불러오지 못했습니다. 페이지를 새로고침해 주세요.')); };
      document.head.append(script);
    });
    return globalThis.supabase.createClient(activityConfig.url, activityConfig.publishableKey, {
      auth: { persistSession: true, storage: localStorage, autoRefreshToken: true, detectSessionInUrl: true },
      global: { fetch: async (input, init = {}) => {
        const controller = new AbortController();
        const abort = () => controller.abort();
        if (init.signal?.aborted) abort();
        else init.signal?.addEventListener('abort', abort, { once: true });
        const timer = setTimeout(abort, 15000);
        try { return await fetch(input, { ...init, cache: 'no-store', signal: controller.signal }); }
        finally { clearTimeout(timer); init.signal?.removeEventListener('abort', abort); }
      } },
    });
  })().catch(error => { clientPromise = null; throw error; });
  return clientPromise;
}
const fields = 'id,title,category,activity_date,summary,body,link_url,created_at,updated_at';
export async function listActivityPage(category = 'all', offset = 0, pageSize = 20) {
  const client = await getClient();
  let query = client.from('lab_activities').select(fields, { count: 'exact' }).is('deleted_at', null).eq('status', 'published');
  if (category !== 'all') query = query.eq('category', category);
  const { data, count, error } = await query.order('created_at', { ascending: false })
    .order('id', { ascending: false }).range(offset, offset + pageSize - 1);
  if (error) throw error;
  return { data, count };
}
export async function getActivity(id) {
  if (!isActivityId(id)) return null;
  const client = await getClient();
  const { data, error } = await client.from('lab_activities').select(fields).eq('id', id).is('deleted_at', null).eq('status', 'published').maybeSingle();
  if (error) throw error;
  return data;
}
export async function isAdmin() {
  const client = await getClient();
  const { data: { user }, error: authError } = await client.auth.getUser();
  if (authError || !user) return false;
  const { data, error } = await client.from('activity_admins').select('user_id').eq('user_id', user.id).maybeSingle();
  if (error) throw error;
  return Boolean(data);
}
export async function saveActivity(input, existing) {
  const values = validateActivity(input);
  const client = await getClient();
  const query = existing
    ? client.from('lab_activities').update(values).eq('id', existing.id).eq('updated_at', existing.updated_at).is('deleted_at', null)
    : client.from('lab_activities').insert(values);
  const { data, error } = await query.select(fields).maybeSingle();
  if (error) throw error;
  if (!data) throw new Error('다른 관리자가 변경했거나 권한이 만료되었습니다. 내용을 복사해 두고 목록을 새로 불러와 주세요.');
  return data;
}
export async function archiveActivity(existing) {
  const client = await getClient();
  const { data, error } = await client.from('lab_activities').update({ deleted_at: new Date().toISOString() })
    .eq('id', existing.id).eq('updated_at', existing.updated_at).is('deleted_at', null).select('id').maybeSingle();
  if (error) throw error;
  if (!data) throw new Error('다른 관리자가 변경했거나 권한이 만료되었습니다. 목록을 새로 불러와 주세요.');
}
