// Renders the two #meshnet invite images (assets/meshnet-invite.png and -utc.png) from tools/meshnet_invite.html.
// Run by hand when the wording, time, or colors change; needs Node with Playwright installed:
//     node tools/meshnet_invite.js
// Keep the filenames, then bump the ?v= on the images in meshnet/index.html.
const { chromium } = require('playwright'); const fs=require('fs'); const path=require('path');
(async () => { const repo=path.resolve(__dirname,'..'), S=require('os').tmpdir(); const tpl=fs.readFileSync(path.join(__dirname,'meshnet_invite.html'),'utf8').replaceAll('FONTS','file://'+repo+'/assets/fonts').replace('MARK','file://'+repo+'/assets/mark.svg');
 const v={ 'meshnet-invite': '<p>6:00–6:10 Central · 5:00–5:10 Mountain<br>4:00–4:10 Pacific · 3:00–3:10 Alaska<br><span class="u">UTC</span> 00:00–00:10 Mon/Fri · 23:00–23:10 Sun/Thu summer</p>',
           'meshnet-invite-utc': '<p><span class="u">00:00 to 00:10 UTC</span> Mon and Fri in winter<br><span class="u">23:00 to 23:10 UTC</span> Sun and Thu in summer</p>' };
 const b = await chromium.launch({args:['--allow-file-access-from-files']}); const p = await b.newPage({ viewport:{width:1080,height:1350}, deviceScaleFactor:1 });
 for (const k in v) { const f=path.join(S,k+'.html'); fs.writeFileSync(f, tpl.replace('WHENLINES', v[k])); await p.goto('file://'+f); await p.waitForTimeout(700);
  const h = await p.evaluate(()=>document.querySelector('main').getBoundingClientRect().bottom); console.log(k,'content bottom',Math.round(h));
  await p.screenshot({path:path.join(repo,'assets',k+'.png')}); }
 await b.close(); })();
