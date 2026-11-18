// Renders assets/social.png, the picture link previews show, from tools/social_image.html.
// Run by hand when the logo or the headline changes; needs Node with Playwright installed:
//     node tools/social_image.js
// Then bump the ?v= on og:image and twitter:image on every page: chat apps and social sites keep the old
// picture until the image's address changes.
const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path');
(async () => {
  const repo = path.resolve(__dirname, '..'), tmp = path.join(require('os').tmpdir(), 'hoop-social.html');
  fs.writeFileSync(tmp, fs.readFileSync(path.join(__dirname, 'social_image.html'), 'utf8').replaceAll('FONTS', 'file://' + repo + '/assets/fonts').replace('MARK', 'file://' + repo + '/assets/mark.svg'));
  const b = await chromium.launch({ args: ['--allow-file-access-from-files'] }); const p = await b.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
  await p.goto('file://' + tmp); await p.waitForTimeout(700);
  await p.screenshot({ path: path.join(repo, 'assets', 'social.png') }); await b.close();
})();
