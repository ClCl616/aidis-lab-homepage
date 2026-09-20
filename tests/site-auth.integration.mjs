// Explicit live integration check. Uses a disposable account and page; never run as unit tests.
// Operator creates member-integration-check.html in site_pages, approves the printed user,
// then approves the printed activity, and finally removes this test data through a trusted DB tool.
import { activityConfig } from '../activity-config.js';
import { randomBytes } from 'node:crypto';
import assert from 'node:assert/strict';
if (!process.argv.includes('--run')) throw new Error('Explicit --run is required for live testing.');
const email = `integration-${randomBytes(8).toString('hex')}@example.invalid`;
const password = randomBytes(24).toString('base64url');
const base = activityConfig.url;
let token = '';
async function call(path, method = 'GET', body, anonymous = false) {
  const response = await fetch(base + path, { method, headers: { apikey: activityConfig.publishableKey,
    ...(token && !anonymous ? { Authorization: `Bearer ${token}` } : {}),
    'Content-Type':'application/json', Prefer:'return=representation' }, ...(body ? {body:JSON.stringify(body)} : {}) });
  const raw = await response.text(); return {status:response.status, data:raw ? JSON.parse(raw) : null};
}
async function proceed() { process.stdin.resume(); await new Promise(resolve => process.stdin.once('data',resolve)); process.stdin.pause(); }
const signup = await call('/auth/v1/signup','POST',{email,password});
assert.equal(signup.status,200, `Signup failed (${signup.status}); check Auth configuration.`);
assert.ok(signup.data.access_token,'Email confirmation is still required.');
token=signup.data.access_token;
const uid=signup.data.user.id;
const request=await call('/rest/v1/member_requests','POST',{requested_page:'member-integration-check.html',message:'Disposable integration check'});
assert.equal(request.status,201);
const payload={title:'Integration verification',category:'development',summary:'Disposable test',body:'<script> stays plain text'};
assert.equal((await call('/rest/v1/lab_activities','POST',payload)).status,403);
console.log(JSON.stringify({stage:'AWAIT_MEMBER_APPROVAL',user_id:uid}));
await proceed();
const own=await call('/rest/v1/site_pages?page=eq.member-integration-check.html','PATCH',{values:{bio:'Integration check'}});
assert.equal(own.status,200);assert.equal(own.data.length,1);
const other=await call('/rest/v1/site_pages?page=eq.about.html','PATCH',{values:{}});
assert.equal(other.status,200);assert.equal(other.data.length,0);
assert.equal((await call('/rest/v1/lab_activities','POST',{...payload,status:'published'})).status,403);
const pending=await call('/rest/v1/lab_activities','POST',payload);
assert.equal(pending.status,201);const postId=pending.data[0].id;
assert.equal((await call(`/rest/v1/lab_activities?id=eq.${postId}`,'GET',null,true)).data.length,0);
console.log(JSON.stringify({stage:'AWAIT_ACTIVITY_APPROVAL',user_id:uid,post_id:postId}));
await proceed();
assert.equal((await call(`/rest/v1/lab_activities?id=eq.${postId}`,'GET',null,true)).data.length,1);
assert.equal((await call('/auth/v1/logout','POST')).status,204);
const login=await call('/auth/v1/token?grant_type=password','POST',{email,password});
assert.equal(login.status,200);token=login.data.access_token;
assert.equal((await call('/auth/v1/user')).data.id,uid);
await call('/auth/v1/logout','POST'); token='';
console.log(JSON.stringify({stage:'PASS',user_id:uid,post_id:postId,checks:'signup without email, login, ownership, moderation, anonymous visibility, logout'}));
