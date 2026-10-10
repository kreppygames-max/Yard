import fs from 'fs';
import {CASES,NIVEIS} from './supabase/functions/game/cases.js';
const meta=CASES.map(({i,id,num,titulo,d,k,l,m,lvl,tag,yard,xp})=>({i,id,num,titulo,d,k,l,m,lvl,tag,yard,xp}));
const metaJs=`const CASES=${JSON.stringify(meta)};\nconst NIVEIS=${JSON.stringify(NIVEIS)};`;
let engine=fs.readFileSync('./engine.js','utf8');
let t=fs.readFileSync('tpl.html','utf8');
t=t.replace('/*ENGINE*/',()=>engine).replace('/*META*/',()=>metaJs).replace('/*APP*/',()=>fs.readFileSync('app.js','utf8'));
fs.mkdirSync('dist',{recursive:true});fs.writeFileSync('dist/index.html',t);
console.log('built',t.length,meta.length);
