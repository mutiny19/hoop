// Renders the #meshnet invite image (assets/meshnet-invite.png, every time zone on one picture) from tools/meshnet_invite.html,
// and copies it to meshnet-invite-utc.png, a filename from when there were two.
// Run by hand when the wording, time, or colors change; needs Node with Playwright installed:
//     node tools/meshnet_invite.js
// Keep the filenames, then bump the ?v= on the images in meshnet/index.html.
const { chromium } = require('playwright'); const fs=require('fs'); const path=require('path');
(async () => { const repo=path.resolve(__dirname,'..'), S=require('os').tmpdir(); const tpl=fs.readFileSync(path.join(__dirname,'meshnet_invite.html'),'utf8').replaceAll('FONTS','file://'+repo+'/assets/fonts').replace('MARK','file://'+repo+'/assets/mark.svg');
 const WHEN = '<p>6:00–6:10 Central · 5:00–5:10 Mountain<br>4:00–4:10 Pacific · 3:00–3:10 Alaska<br><span class="u">UTC</span> 00:00–00:10 Mon/Fri · 23:00–23:10 Sun/Thu summer</p>';
 const b = await chromium.launch({args:['--allow-file-access-from-files']}); const p = await b.newPage({ viewport:{width:1080,height:1350}, deviceScaleFactor:1 });
 const f=path.join(S,'meshnet-invite.html'); fs.writeFileSync(f, tpl.replace('WHENLINES', WHEN)); await p.goto('file://'+f); await p.waitForTimeout(700);
 const h = await p.evaluate(()=>document.querySelector('main').getBoundingClientRect().bottom); console.log('content bottom',Math.round(h),'of 1350');
 const out=path.join(repo,'assets','meshnet-invite.png'); await p.screenshot({path:out});
 fs.copyFileSync(out, path.join(repo,'assets','meshnet-invite-utc.png'));   // the old second filename, kept so links already shared still open
 await b.close(); })();
