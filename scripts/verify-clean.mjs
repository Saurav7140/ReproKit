import assert from 'node:assert/strict';
import {cpSync,existsSync,mkdirSync,mkdtempSync,rmSync} from 'node:fs';
import {basename,isAbsolute,join,relative,resolve} from 'node:path';
import {spawnSync} from 'node:child_process';

const root=process.cwd();const parent=resolve('.verification');mkdirSync(parent,{recursive:true});
const checkout=mkdtempSync(join(parent,'clean-'));const npm=process.env.npm_execpath;
assert(npm&&isAbsolute(npm),'Run this check through npm run test:clean.');
const exclude=new Set(['node_modules','dist','.git','.temp','test-results','playwright-report']);
const filter=(path)=>{const name=basename(path);return !exclude.has(name)&&(!name.startsWith('.env')||name==='.env.example');};
let passed=false;
try{
  for(const path of ['package.json','package-lock.json','tsconfig.json','playwright.config.ts','README.md','PRODUCT.md','DESIGN.md','CONTRIBUTING.md','SECURITY.md','LICENSE','LICENSE-STATUS.md','apps','packages','supabase','tests','scripts','docs'])cpSync(join(root,path),join(checkout,path),{recursive:true,filter});
  mkdirSync(join(checkout,'docs/screenshots'),{recursive:true});
  assert(!existsSync(join(checkout,'apps/dashboard/.env.local'))&&!existsSync(join(checkout,'apps/sdk-demo/.env.local'))&&!existsSync(join(checkout,'supabase/functions/.env')),'Private configuration must not enter the clean checkout.');
  const env=Object.fromEntries(Object.entries(process.env).filter(([name])=>!/^(VITE_|SUPABASE_|REPROKIT_)/.test(name)));
  for(const args of [['ci','--ignore-scripts','--no-audit','--no-fund'],['run','check'],['exec','--','playwright','test','tests/capture.spec.ts','tests/investigation.spec.ts','--grep','real extension captures demo evidence|real capture exports and imports']]){
    console.log(`Clean checkout: npm ${args.join(' ')}`);
    const result=spawnSync(process.execPath,[npm,...args],{cwd:checkout,env,stdio:'inherit',windowsHide:true});
    assert.equal(result.status,0,'Clean-checkout command failed.');
  }
  passed=true;console.log('Clean source checkout passed install, types, builds, unit/database/server tests and actual local capture/export/import without private configuration.');
}finally{
  const within=relative(parent,checkout);assert(within&&!within.startsWith('..')&&!isAbsolute(within),'Refuse cleanup outside the verification directory.');
  if(passed)rmSync(checkout,{recursive:true,force:true});else console.error(`Failed checkout retained for inspection: ${checkout}`);
}
