import test from 'node:test';
import assert from 'node:assert/strict';
import { validateActivity, safeLink, isActivityId, renderActivity } from '../activity-model.js';
const base = {title:' 새 소식 ', category:'development', summary:' 요약 ', body:'첫 문단\n\n둘째 문단', activity_date:'2026-09-21', link_url:'https://example.com'};
test('입력 정규화와 본문 줄바꿈 보존', () => {
 const result = validateActivity(base); assert.equal(result.title,'새 소식'); assert.equal(result.body,base.body);
 assert.equal(validateActivity({...base,activity_date:'',link_url:''}).activity_date,null);
});
test('잘못된 날짜, 빈 본문, 길이와 분류 검사', () => {
 for (const value of [{activity_date:'2026-02-30'},{category:'unknown'},{body:' '},{title:'a'.repeat(121)},{summary:'a'.repeat(301)}]) assert.throws(()=>validateActivity({...base,...value}));
});
test('위험한 링크와 인물 정보 포함 URL 차단', () => {
 for(const link of ['javascript:alert(1)','data:text/html,test','//evil.test','https://user:password@example.com']) {assert.equal(safeLink(link),'');assert.throws(()=>validateActivity({...base,link_url:link}));}
 assert.equal(safeLink('https://example.com/a'),'https://example.com/a');
});
test('상세 ID 검증', () => {assert.ok(isActivityId('11111111-1111-4111-8111-111111111111'));assert.ok(!isActivityId('../admin'));});
test('본문과 제목은 HTML로 해석하지 않고 링크는 안전하게 표시', () => {
 const make = tag => ({tag,children:[],textContent:'',append(...nodes){this.children.push(...nodes);},replaceChildren(...nodes){this.children=nodes;}});
 globalThis.document = {createElement:make};
 const container=make('article');renderActivity(container,{...base,title:'<img src=x onerror=alert(1)>',body:'<script>alert(1)</script>'});
 assert.equal(container.children[1].textContent,'<img src=x onerror=alert(1)>');
 assert.equal(container.children[3].textContent,'<script>alert(1)</script>');
 assert.equal(container.children[4].children[0].rel,'noopener noreferrer');
 delete globalThis.document;
});
