import test from 'node:test';
import assert from 'node:assert/strict';
import { safeContentUrl, validateContent } from '../site-model.js';
test('CMS links reject executable, protocol-relative, credential-bearing and control URLs',()=>{
  for(const input of ['javascript:alert(1)','data:text/html,x','//evil.test','https://a:b@example.com','https:\\evil.test','java\nscript:alert(1)']) assert.equal(safeContentUrl(input),null);
  assert.equal(safeContentUrl('https://example.com'),'https://example.com');
  assert.equal(safeContentUrl('mailto:lab@example.com'),'mailto:lab@example.com');
  assert.equal(safeContentUrl('assets/members/photo.png','image'),'assets/members/photo.png');
  assert.equal(safeContentUrl('mailto:a@example.com','image'),null);
});
test('Content uses only catalog keys and validates images and limits',()=>{
 const fields=[{key:'name',type:'text',value:'이름',label:'이름'},{key:'photo',type:'image',value:'assets/p.png',label:'사진'}];
 assert.deepEqual(validateContent({name:' <script> ',ignored:'x'},fields),{name:' <script> ',photo:'assets/p.png'});
 assert.throws(()=>validateContent({photo:'javascript:alert(1)'},fields));
 assert.throws(()=>validateContent({name:'a'.repeat(12001)},fields));
});
