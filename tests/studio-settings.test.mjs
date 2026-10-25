import test from 'node:test';
import assert from 'node:assert/strict';
import {studioSettings,DEFAULT_BACKEND} from '../src/studioSettings.mjs';
test('missing Studio flag/API configuration uses existing backend',()=>{
 assert.equal(studioSettings({},'clipper-frontend.onrender.com').api,DEFAULT_BACKEND+'/studios-api');
 assert.equal(studioSettings({VITE_API_BASE:'https://existing.example/'},'site.example').api,'https://existing.example/studios-api');
});
test('explicit override is retained and prefix is not duplicated',()=>{
 assert.equal(studioSettings({VITE_STUDIOS_API_BASE:'https://api.example/studios-api/'},'site.example').api,'https://api.example/studios-api');
});
test('offline mode cannot bypass authentication on deployed hosts',()=>{
 assert.equal(studioSettings({VITE_STUDIOS_LOCAL_ONLY:'true'},'site.example').offline,false);
 assert.equal(studioSettings({VITE_STUDIOS_LOCAL_ONLY:'true'},'localhost').offline,true);
});
test('deployed clients never use a stale localhost Studio override',()=>{
 assert.equal(studioSettings({VITE_STUDIOS_API_BASE:'http://localhost:8000',VITE_API_BASE:'https://api.example'},'site.example').api,'https://api.example/studios-api');
});
