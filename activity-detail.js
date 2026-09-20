import { getActivity } from './activity-api.js';
import { isActivityId, renderActivity } from './activity-model.js';
const status = document.getElementById('activity-status');
const retry = document.getElementById('detail-retry');
async function load() {
  retry.hidden = true;
  const id = new URL(location.href).searchParams.get('id');
  if (!isActivityId(id)) { status.textContent = '활동 주소가 올바르지 않습니다. 목록에서 다시 선택해 주세요.'; return; }
  status.textContent = '활동을 불러오고 있습니다.';
  try {
    const post = await getActivity(id);
    if (!post) { status.textContent = '삭제되었거나 존재하지 않는 활동입니다.'; return; }
    renderActivity(document.getElementById('activity-content'), post);
    document.title = `${post.title} | AIDIS Lab`;
    status.textContent = '';
    document.querySelectorAll('.section-menu a').forEach(link => {
      if (link.hash === `#${post.category}`) link.setAttribute('aria-current', 'location');
    });
  } catch { status.textContent = '활동을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.'; retry.hidden = false; }
}
retry.addEventListener('click', load);
void load();
