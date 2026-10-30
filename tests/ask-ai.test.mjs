import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {askAiReply} from '../src/askAi.mjs';

test('Assistant chat shows the response field /ask-ai returns',()=>{
  assert.equal(askAiReply(true,{response:'Three hooks: ...'}),'Three hooks: ...');
  assert.equal(askAiReply(true,{reply:'old field'}),'Error contacting AI.');
});

test('Assistant chat shows server errors instead of a blank message',()=>{
  assert.equal(askAiReply(false,{detail:'Too many AI requests. Try again in 42 seconds.'}),'Too many AI requests. Try again in 42 seconds.');
  assert.equal(askAiReply(false,{error:'Prompt is required'}),'Prompt is required');
  assert.equal(askAiReply(false,null),'Error contacting AI.');
});

test('Assistant chat uses the shared reply parser',()=>{
  assert.match(readFileSync(new URL('../src/components/AssistantChat.jsx',import.meta.url),'utf8'),/askAiReply\(res\.ok, data\)/);
});
