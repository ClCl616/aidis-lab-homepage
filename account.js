import { getClient } from './activity-api.js';
import { catalog, identity, pageData, savePage, result, submitActivity, updateActivity, settings } from './site-api.js';
import { categories, renderActivity, validateActivity, element } from './activity-model.js';
import { safeContentUrl } from './site-model.js';
const $ = id => document.getElementById(id);
let client, definitions, who, featureSettings, signup = false, editing = null, postOffset = 0, busy = false;
const dirtyForms = new Set();
const dirty = () => dirtyForms.size > 0;
const statusNames = { pending: '승인 대기', published: '공개', rejected: '반려', approved: '연결 완료' };
function status(message) {
  const notice = $('account-status');
  const panel = ['recovery-panel', 'auth-panel'].map($).find(node => !node.hidden);
  const host = panel || $('account-shell-status');
  if (notice.parentElement !== host) host.prepend(notice);
  notice.textContent = message;
}
function button(text, action, secondary = true) {
  const b = element('button', text, `editor-button${secondary ? ' secondary' : ''}`); b.type = 'button';
  b.addEventListener('click', () => run(action)); return b;
}
async function run(action) {
  if (busy) return;
  busy = true;
  status('처리 중입니다…');
  for (const id of ['workspace','auth-panel','recovery-panel']) $(id).inert = true;
  const buttons = [...document.querySelectorAll('.account-page button')].filter(b => !b.disabled);
  buttons.forEach(b => { b.disabled = true; });
  try { await action(); } catch (e) { status(e.message && !/jwt|fetch|schema|policy|permission|duplicate|violates|rate limit/i.test(e.message) ? e.message : '처리하지 못했습니다. 연결·권한을 확인하고 다시 시도해 주세요. 동일 프로필이 다른 계정에 연결돼 있는지도 확인해 주세요.'); }
  finally { busy = false; for (const id of ['workspace','auth-panel','recovery-panel']) $(id).inert = false; buttons.forEach(b => { b.disabled = false; }); }
}
function confirmAction(message) {
  $('confirm-message').textContent = message;
  const dialog = $('confirm-dialog'); dialog.returnValue = ''; dialog.showModal();
  return new Promise(resolve => dialog.addEventListener('close', () => resolve(dialog.returnValue === 'ok'), { once: true }));
}
function options(select, kind) {
  select.replaceChildren(...Object.entries(definitions).filter(([, d]) => !kind || d.kind === kind).map(([page, d]) => { const o = element('option', d.title); o.value = page; return o; }));
}
function switchPanel(name) {
  if (!['profile','activities','members','content','settings'].includes(name) || (!who?.admin && ['members','content','settings'].includes(name))) name = 'profile';
  document.querySelectorAll('.workspace-panel').forEach(p => { p.hidden = p.id !== `panel-${name}`; });
  document.querySelectorAll('[data-panel]').forEach(b => { if (b.dataset.panel === name) b.setAttribute('aria-current','page'); else b.removeAttribute('aria-current'); });
}
async function refreshIdentity() {
  [who, featureSettings] = await Promise.all([identity(), settings()]);
  $('auth-panel').hidden = Boolean(who.user); $('workspace').hidden = !who.user;
  if (!who.user) { status('로그인하거나 회원가입해 주세요.'); return; }
  $('account-email').textContent = who.user.email;
  $('display-name').value = who.user.user_metadata?.display_name || '';
  $('account-role').textContent = who.admin ? '관리자' : who.membership?.status === 'approved' ? '구성원' : '프로필 연결 대기';
  document.querySelectorAll('[data-admin]').forEach(n => { n.hidden = !who.admin; });
  options($('requested-page'), 'member');
  $('request-form').hidden = Boolean(who.membership) || who.admin || !featureSettings.membership_open;
  $('membership-info').replaceChildren(); $('profile-editor').replaceChildren();
  if (who.membership?.status === 'approved') {
    $('membership-info').textContent = `${definitions[who.membership.member_page]?.title || '구성원'} 프로필에 연결되었습니다.`;
    if (featureSettings.profile_editing || who.admin) await contentEditor(who.membership.member_page, $('profile-editor'));
    else $('membership-info').append(element('p','현재 본인 프로필 수정 기능이 중지되어 있습니다.'));
  } else if (who.admin) $('membership-info').textContent = '관리자는 사이트 콘텐츠 메뉴에서 모든 구성원의 프로필을 편집할 수 있습니다.';
  else if (who.membership) $('membership-info').textContent = who.membership.status === 'pending' ? '관리자가 프로필 연결 요청을 확인하고 있습니다. 승인되면 프로필 편집과 활동 제출이 가능합니다.' : '연결 요청이 반려되었습니다. 연구실 관리자에게 확인을 요청해 주세요.';
  else $('membership-info').textContent = featureSettings.membership_open ? '먼저 본인의 프로필 연결을 요청해 주세요.' : '현재 프로필 연결 신청 접수가 중지되어 있습니다.';
  const canPost = who.admin || (who.membership?.status === 'approved' && featureSettings.activity_submissions);
  $('new-post').hidden = !canPost;
  $('post-help').textContent = who.admin ? '대기 중인 활동을 검토해 공개하거나 반려할 수 있습니다. 삭제한 활동은 복구할 수 있습니다.' : canPost ? '작성한 활동은 관리자 승인 후 공개됩니다. 제출 후 수정이 필요하면 관리자에게 알려주세요.' : '구성원 프로필 연결이 승인되면 활동을 제출할 수 있습니다.';
  if (who.admin) { options($('content-page')); await loadRequests(); await contentEditor($('content-page').value, $('content-editor')); renderSettings(); }
  await loadPosts(true);
  switchPanel(location.hash.slice(1)); status('');
}
function renderSettings() {
  const form = $('settings-form'); form.replaceChildren();
  const flags = [['membership_open','프로필 연결 신청 접수','새 계정이 기존 구성원 프로필 연결을 요청할 수 있습니다.'],['profile_editing','구성원의 본인 프로필 수정','관리자는 이 설정과 관계없이 프로필을 수정할 수 있습니다.'],['activity_submissions','구성원의 활동 제출','제출한 활동은 항상 관리자 승인 후 공개됩니다.'],['activities_visible','승인된 새 활동 공개 표시','끄면 일반 방문자에게 새 활동이 숨겨집니다. 기존 K-PaaS 기록은 유지됩니다.']];
  for (const [key,label,help] of flags) {
    const row=element('div',null,'setting-row'), input=element('input');input.type='checkbox';input.id=key;input.checked=featureSettings[key];
    const caption=element('label',label);caption.htmlFor=key; row.append(input,caption,element('p',help,'editor-help'));form.append(row);
  }
  const save=element('button','설정 저장','editor-button');save.type='submit';form.append(save);
}
async function contentEditor(page, host) {
  const row = await pageData(page), def = definitions[page];
  const form = element('form', null, 'editor-panel cms-editor'); form.dataset.page = page;
  form.append(element('h3', def.title));
  const link = element('a','공개 페이지 보기 ↗','plain-link'); link.href = page; link.target='_blank'; link.rel='noopener'; form.append(link);
  const fields = element('div', null, 'cms-fields');
  const inputMap = new Map();
  for (const field of def.fields) {
    const label = element('label', field.label); const id = `${host.id}-${field.key}`; label.htmlFor = id;
    const input = element(field.type === 'text' && (field.value.length > 85 || field.key === 'bio') ? 'textarea' : 'input'); input.id = id;
    input.value = row.values[field.key] ?? field.value; input.maxLength=12000;
    if (input.tagName === 'TEXTAREA') input.rows = 3;
    fields.append(label, input); inputMap.set(field.key, input);
    if (field.type === 'image') {
      const image = element('img'); image.alt='현재 사진'; image.src=safeContentUrl(input.value,'image') || field.value; fields.append(image);
      const uploadLabel = element('label','사진 업로드 (JPG·PNG·WebP, 5MB 이하)'); uploadLabel.htmlFor=id+'-upload';
      const upload = element('input'); upload.type='file'; upload.id=id+'-upload'; upload.accept='image/jpeg,image/png,image/webp';
      upload.addEventListener('change', () => run(async () => {
        const file = upload.files[0]; if (!file) return;
        if (!['image/jpeg','image/png','image/webp'].includes(file.type) || file.size>5*1024*1024) throw new Error('JPG·PNG·WebP 이미지 5MB 이하만 업로드할 수 있습니다.');
        const ext = { 'image/jpeg':'jpg','image/png':'png','image/webp':'webp' }[file.type];
        const path = `${page}/${crypto.randomUUID()}.${ext}`;
        await result(client.storage.from('profile-photos').upload(path,file,{ contentType:file.type, upsert:false }));
        input.value=client.storage.from('profile-photos').getPublicUrl(path).data.publicUrl; image.src=input.value; dirtyForms.add(form);
        status('사진을 업로드했습니다. 아래 저장 버튼을 눌러 프로필에 반영해 주세요.');
      })); fields.append(uploadLabel,upload);
    }
  }
  form.append(fields);
  const save = element('button','변경 내용 저장','editor-button'); save.type='submit';
  const actions = element('div',null,'editor-actions'); actions.append(save); form.append(actions);
  form.addEventListener('input',()=>{dirtyForms.add(form);});
  let current = row;
  form.addEventListener('submit', event => { event.preventDefault(); run(async()=>{
    const values=Object.fromEntries([...inputMap].map(([k,input])=>[k,input.value]));
    current=await savePage(current, values, def.fields); dirtyForms.delete(form); status('저장했습니다. 공개 페이지에 반영되었습니다.');
  }); });
  host.replaceChildren(form);
}
async function loadRequests() {
  const rows = await result(client.from('member_requests').select('*').order('created_at',{ascending:false}).limit(500));
  const host=$('requests'); host.replaceChildren();
  if (!rows.length) host.append(element('p','아직 연결 요청이 없습니다.'));
  for (const row of rows) {
    const item=element('article',null,'workspace-item'); item.append(element('h3',definitions[row.requested_page]?.title || row.requested_page),element('span',statusNames[row.status],`status-badge status-${row.status}`),element('p',row.email),element('p',row.message));
    const select=element('select'); select.setAttribute('aria-label',`${row.email} 연결할 프로필`); options(select,'member'); select.value=row.member_page || row.requested_page; item.append(select);
    const actions=element('div',null,'editor-actions');
    async function update(approved) {
      if (!await confirmAction(approved ? `${definitions[select.value].title} 프로필 편집 권한을 이 계정에 연결할까요? 실제 구성원인지 확인해 주세요.` : '프로필 연결을 해제하고 요청을 반려할까요?')) return;
      const saved=await result(client.from('member_requests').update({status:approved?'approved':'rejected',member_page:approved?select.value:null}).eq('user_id',row.user_id).eq('updated_at',row.updated_at).select().maybeSingle());
      if (!saved) throw new Error('요청이 변경되었습니다. 목록을 새로 불러와 주세요.');
      await loadRequests(); status(approved?'프로필 연결을 승인했습니다.':'연결을 해제하고 반려했습니다.');
    }
    actions.append(button('연결 승인',()=>update(true),false),button(row.status==='approved'?'연결 해제':'반려',()=>update(false))); item.append(actions); host.append(item);
  }
}
async function loadPosts(reset=false) {
  if(reset) { postOffset=0; $('posts').replaceChildren(); }
  let q=client.from('lab_activities').select('*',{count:'exact'}).order('created_at',{ascending:false}).order('id',{ascending:false}).range(postOffset,postOffset+19);
  if(!who.admin) q=q.eq('author_id',who.user.id).is('deleted_at',null);
  const {data, count,error}=await q; if(error) throw error;
  postOffset+=data.length; $('more-posts').hidden=postOffset>=count;
  if(reset && !data.length) $('posts').append(element('p','등록한 활동이 없습니다.'));
  for(const post of data) {
    const item=element('article',null,'workspace-item'); item.append(element('h3',post.title),element('span',post.deleted_at?'삭제됨':statusNames[post.status],`status-badge status-${post.status}`),element('p',post.summary));
    if(post.review_note) item.append(element('p',`관리자 의견: ${post.review_note}`));
    const detail=element('details'); const summary=element('summary','내용 보기'); detail.append(summary); const body=element('div'); renderActivity(body,post); detail.append(body); item.append(detail);
    if(who.admin) {
      const actions=element('div',null,'editor-actions');
      if(!post.deleted_at) {
        actions.append(button('수정',()=>openPost(post)));
        if(post.status!=='published') actions.append(button('승인·공개',async()=>{
          if(!await confirmAction('이 활동을 모든 방문자에게 공개할까요?'))return;
          await updateActivity(post,{status:'published',review_note:''}); await loadPosts(true); status('활동을 공개했습니다.');
        },false));
        const note=element('textarea'); note.placeholder='반려 사유 (선택)'; note.setAttribute('aria-label',`${post.title} 반려 사유`); note.maxLength=1000;
        item.append(note);
        actions.append(button('반려·비공개',async()=>{ if(!await confirmAction('이 활동을 반려하고 비공개로 바꿀까요?'))return; await updateActivity(post,{status:'rejected',review_note:note.value.trim()}); await loadPosts(true); status('활동을 반려했습니다.'); }));
      }
      actions.append(button(post.deleted_at?'복구':'삭제',async()=>{
        if(!await confirmAction(post.deleted_at?'활동을 승인 대기 상태로 복구할까요?':'활동을 목록에서 삭제할까요? 나중에 복구할 수 있습니다.'))return;
        await updateActivity(post,post.deleted_at?{deleted_at:null,status:'pending'}:{deleted_at:new Date().toISOString()}); await loadPosts(true); status(post.deleted_at?'승인 대기 상태로 복구했습니다.':'삭제했습니다.');
      })); item.append(actions);
    }
    $('posts').append(item);
  }
}
async function openPost(post=null) {
  if(dirtyForms.has($('post-form')) && !await confirmAction('작성 중인 활동을 버리고 다른 활동을 열까요?')) return;
  editing=post; $('post-form').reset(); $('post-preview').replaceChildren();
  if(post) for(const key of ['title','category','activity_date','summary','body','link_url']) $('post-form').elements[key].value=post[key] || '';
  $('post-editor-heading').textContent=post?'활동 수정':'새 활동 작성';
  $('post-submit').textContent=post?'변경 내용 저장':who.admin?'활동 게시':'승인 요청';
  $('post-editor').hidden=false; dirtyForms.delete($('post-form')); $('post-title').focus(); $('post-editor').scrollIntoView({block:'start',behavior:'smooth'});
}
$('auth-mode').addEventListener('click',()=>{signup=!signup; $('auth-heading').textContent=signup?'회원가입':'로그인'; $('auth-submit').textContent=signup?'회원가입':'로그인'; $('auth-mode').textContent=signup?'로그인으로 돌아가기':'회원가입'; $('password').autocomplete=signup?'new-password':'current-password'; $('password').minLength=signup?8:1;});
$('auth-form').addEventListener('submit',event=>{event.preventDefault();run(async()=>{
  const credentials={email:$('email').value.trim(),password:$('password').value};
  const {error}=signup?await client.auth.signUp({...credentials,options:{emailRedirectTo:new URL('account.html',location.href).href}}):await client.auth.signInWithPassword(credentials);
  if(error) throw new Error(signup?'회원가입을 완료하지 못했습니다. 이메일·비밀번호를 확인하고 다시 시도해 주세요.':'로그인하지 못했습니다. 이메일과 비밀번호를 확인해 주세요.');
  $('password').value='';
  if(signup) { await refreshIdentity(); status(who.user ? '가입했습니다. 본인의 프로필 연결을 요청해 주세요.' : '가입 요청을 처리했습니다. 로그인해 주세요. 인증 메일이 도착한 경우 인증 설정을 관리자에게 확인해 주세요.'); }
  else await refreshIdentity();
});});
$('forgot-password').addEventListener('click',()=>run(async()=>{
  if(!$('email').reportValidity())return;
  await result(client.auth.resetPasswordForEmail($('email').value.trim(),{redirectTo:new URL('account.html',location.href).href})); status('가입된 이메일이면 비밀번호 재설정 메일이 발송됩니다. 메일함을 확인해 주세요.');
}));
$('recovery-form').addEventListener('submit',e=>{e.preventDefault();run(async()=>{await result(client.auth.updateUser({password:$('new-password').value})); $('new-password').value=''; $('recovery-panel').hidden=true; status('비밀번호를 변경했습니다.');});});
$('logout').addEventListener('click',()=>run(async()=>{if(dirty()&&!await confirmAction('저장하지 않은 입력을 버리고 로그아웃할까요?'))return; await result(client.auth.signOut({scope:'local'})); dirtyForms.clear(); location.reload();}));
$('request-form').addEventListener('submit',e=>{e.preventDefault();run(async()=>{await result(client.from('member_requests').insert({requested_page:$('requested-page').value,message:$('request-message').value.trim()})); await refreshIdentity(); status('프로필 연결을 요청했습니다. 관리자 승인을 기다려 주세요.');});});
document.querySelectorAll('[data-panel]').forEach(b=>b.addEventListener('click',()=>{location.hash=b.dataset.panel;}));
addEventListener('hashchange',()=>switchPanel(location.hash.slice(1)));
$('content-page').addEventListener('change',()=>run(async()=>{const old=$('content-editor').querySelector('form');if(dirtyForms.has(old)&&!await confirmAction('저장하지 않은 내용을 버리고 다른 페이지를 불러올까요?')){ $('content-page').value=old.dataset.page; return; } await contentEditor($('content-page').value,$('content-editor'));dirtyForms.delete(old);}));
$('reload-requests').addEventListener('click',()=>run(loadRequests));
$('display-name-form').addEventListener('submit',event=>{event.preventDefault();run(async()=>{
  const name=$('display-name').value.trim();
  if([...name].length>40)throw new Error('표시 이름을 40자 이내로 입력해 주세요.');
  await result(client.auth.updateUser({data:{display_name:name}}));
  document.dispatchEvent(new Event('account-name-updated'));
  status('상단에 표시할 이름을 저장했습니다.');
});});
$('settings-form').addEventListener('submit',e=>{e.preventDefault();run(async()=>{
  const values=Object.fromEntries(['membership_open','profile_editing','activity_submissions','activities_visible'].map(key=>[key,$(key).checked]));
  const saved=await result(client.from('site_settings').update(values).eq('id',true).eq('updated_at',featureSettings.updated_at).select().maybeSingle());
  if(!saved)throw new Error('다른 관리자가 설정을 변경했습니다. 새로고침 후 다시 시도해 주세요.');
  featureSettings=saved;status('운영 설정을 저장했습니다. 화면과 데이터베이스 권한에 적용됩니다.');
});});
$('new-post').addEventListener('click',()=>run(()=>openPost()));
$('more-posts').addEventListener('click',()=>run(()=>loadPosts()));
$('post-form').addEventListener('input',()=>{dirtyForms.add($('post-form'));});
$('cancel-post').addEventListener('click',()=>run(async()=>{if(dirtyForms.has($('post-form'))&&!await confirmAction('작성 중인 활동을 버릴까요?'))return;dirtyForms.delete($('post-form')); $('post-editor').hidden=true;}));
$('preview-post').addEventListener('click',()=>run(async()=>{const post=validateActivity(Object.fromEntries(new FormData($('post-form'))));renderActivity($('post-preview'),post);}));
$('post-form').addEventListener('submit',e=>{e.preventDefault();run(async()=>{
  const values=Object.fromEntries(new FormData($('post-form')));
  await submitActivity(values,editing,editing?editing.status:who.admin?'published':'pending'); dirtyForms.delete($('post-form')); $('post-editor').hidden=true;
  status(who.admin?'활동을 저장했습니다.':'활동 승인을 요청했습니다. 승인 후 공개됩니다.');
  try{await loadPosts(true);}catch{status('활동은 저장됐지만 목록을 갱신하지 못했습니다. 페이지를 새로고침해 주세요.');}
});});
addEventListener('beforeunload',e=>{if(dirty()){e.preventDefault();e.returnValue='';}});
try {
  [client,definitions]=await Promise.all([getClient(),catalog()]);
  client.auth.onAuthStateChange((event,session)=>{
    if(event==='PASSWORD_RECOVERY') $('recovery-panel').hidden=false;
    if(event==='SIGNED_OUT') { who=null; $('workspace').hidden=true; $('auth-panel').hidden=false; status('로그아웃되었습니다.'); }
    if(event==='SIGNED_IN' && !who?.user) setTimeout(()=>{if(!busy)run(refreshIdentity);},0);
  });
  await run(refreshIdentity);
} catch { status('계정 서비스를 불러오지 못했습니다. 잠시 후 새로고침해 주세요. 공개 페이지는 계속 이용할 수 있습니다.'); $('auth-panel').hidden=false; }
