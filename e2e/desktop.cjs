/*
 * Playwright smoke test — Milestone 1 desktop, windows, dock, launcher, widgets, notifications
 * Requires the `playwright` package and a Chromium browser (not a project dependency).
 * Run against a production preview:
 *   npm run build && npx vite preview --port 4173 &
 *   node e2e/desktop.cjs [screenshot-dir]
 * Each run starts with empty browser storage. Exits after printing PASS/FAIL lines.
 */
const { chromium } = require('playwright');
const dir = process.argv[2] || 'e2e/screenshots'; require('fs').mkdirSync(dir, { recursive: true });
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  const check = (name, cond) => console.log((cond ? 'PASS ' : 'FAIL ') + name);
  await page.goto(process.env.BASE_URL || 'http://localhost:4173');
  await page.waitForTimeout(500);
  await page.screenshot({ path: dir + '/01-desktop.png' });

  // open claims from desktop icon
  await page.getByRole('button', { name: /^Insurance, folder/ }).click();
  check('domain panel opens', await page.getByRole('dialog').getByRole('button', { name: 'Document AI, application' }).isVisible());
  await page.getByRole('dialog').getByRole('button', { name: 'Claims Intelligence, application' }).click();
  await page.waitForTimeout(300);
  check('claims window open', await page.locator('section[aria-label="Claims Intelligence"]').isVisible());
  // open document ai (closed apps are not in the dock; it lists open apps)
  await page.keyboard.press('Control+k'); await page.waitForTimeout(150); await page.keyboard.type('Document AI'); await page.waitForTimeout(150); await page.keyboard.press('Enter'); await page.getByRole('dialog').waitFor({ state: 'hidden' }); // closed apps open from the launcher; the dock lists open apps
  await page.waitForTimeout(300);
  check('two windows', await page.locator('section[aria-label="Document AI"]').isVisible() && await page.locator('section[aria-label="Claims Intelligence"]').isVisible());
  check('doc ai focused', (await page.locator('section[aria-label="Document AI"]').getAttribute('data-focused')) === 'true');
  check('dock shows active doc ai', await page.getByRole('button', { name: 'Document AI · Active' }).count() === 1);
  await page.screenshot({ path: dir + '/02-two-windows.png' });

  // click claims window to focus
  await page.locator('section[aria-label="Claims Intelligence"] header h2').click();
  check('claims focused after click', (await page.locator('section[aria-label="Claims Intelligence"]').getAttribute('data-focused')) === 'true');

  // minimize claims
  await page.getByRole('button', { name: 'Minimize Claims Intelligence' }).click();
  await page.locator('section[aria-label="Claims Intelligence"]').waitFor({ state: 'hidden' }); // minimize animates into the dock
  check('claims hidden after minimize', !(await page.locator('section[aria-label="Claims Intelligence"]').isVisible()));
  check('dock shows minimized', await page.getByRole('button', { name: 'Claims Intelligence · Minimized' }).count() === 1);
  // restore via dock
  await page.getByRole('button', { name: 'Claims Intelligence · Minimized' }).click();
  check('claims restored', await page.locator('section[aria-label="Claims Intelligence"]').isVisible());
  // dock click on focused -> minimize
  await page.getByRole('button', { name: 'Claims Intelligence · Active' }).click();
  await page.locator('section[aria-label="Claims Intelligence"]').waitFor({ state: 'hidden' });
  check('dock click on active minimizes', !(await page.locator('section[aria-label="Claims Intelligence"]').isVisible()));
  await page.getByRole('button', { name: 'Claims Intelligence · Minimized' }).click();

  // maximize/restore
  await page.waitForTimeout(600); // let the restore animation finish before measuring
  const box0 = await page.locator('section[aria-label="Claims Intelligence"]').boundingBox();
  await page.getByRole('button', { name: 'Maximize Claims Intelligence' }).click();
  await page.waitForTimeout(300);
  const box1 = await page.locator('section[aria-label="Claims Intelligence"]').boundingBox();
  console.log(JSON.stringify({box0,box1}));
  check('maximized fills width', box1.width >= 1430);
  await page.getByRole('button', { name: 'Restore Claims Intelligence' }).click();
  await page.waitForTimeout(300);
  const box2 = await page.locator('section[aria-label="Claims Intelligence"]').boundingBox();
  check('restored to original size', Math.abs(box2.width - box0.width) < 2);

  // drag
  const hdr = page.locator('section[aria-label="Claims Intelligence"] header');
  const hb = await hdr.boundingBox();
  await page.mouse.move(hb.x + 200, hb.y + 20); await page.mouse.down();
  await page.mouse.move(hb.x + 100, hb.y + 80, { steps: 5 }); await page.mouse.up();
  const box3 = await page.locator('section[aria-label="Claims Intelligence"]').boundingBox();
  check('drag moved window', Math.abs(box3.x - box2.x) > 50);

  // resize from bottom-right handle
  const rb = await page.locator('section[aria-label="Claims Intelligence"]').boundingBox();
  await page.mouse.move(rb.x + rb.width - 9, rb.y + rb.height - 9); await page.mouse.down();
  await page.mouse.move(rb.x + rb.width - 150, rb.y + rb.height - 100, { steps: 6 }); await page.mouse.up();
  const rb2 = await page.locator('section[aria-label="Claims Intelligence"]').boundingBox();
  check('resize shrank window', rb2.width < rb.width - 100 && rb2.height < rb.height - 50);

  // claims interactions: select claim, approve
  await page.locator('section[aria-label="Claims Intelligence"]').getByRole('button', { name: /Harriet Okafor/ }).first().click();
  await page.waitForTimeout(200);
  await page.screenshot({ path: dir + '/03-claim-detail.png' });
  await page.getByRole('button', { name: 'Approve settlement' }).click();
  await page.waitForTimeout(300);
  check('approval reduces pending widget', /\b2\s+decisions awaiting/.test(await page.locator('aside[aria-label="System overview"]').innerText()));

  // launcher search
  await page.keyboard.press('Control+k');
  await page.waitForTimeout(200);
  await page.keyboard.type('workflow');
  await page.waitForTimeout(200);
  await page.screenshot({ path: dir + '/04-launcher.png' });
  await page.keyboard.press('Enter');
  await page.waitForTimeout(300);
  check('launcher opened workflow studio', await page.locator('section[aria-label="Workflow Studio"]').isVisible());

  // folder (minimize covering windows first)
  for (const n of ['Workflow Studio','Claims Intelligence','Document AI']) {
    if (await page.locator(`section[aria-label="${n}"]`).isVisible()) { await page.getByRole('button', { name: 'Minimize ' + n }).click(); await page.locator(`section[aria-label="${n}"]`).waitFor({ state: 'hidden' }); }
  }
  await page.getByRole('button', { name: /^Insurance, folder/ }).click();
  await page.getByRole('button', { name: 'Open Insurance in Folders' }).click();
  await page.getByRole('dialog').waitFor({ state: 'hidden' }); // the folder finishes collapsing first
  await page.waitForTimeout(300);
  check('folder browser open', await page.locator('section[aria-label="Folders"]').isVisible());
  check('dock shows folders', await page.getByRole('navigation', { name: 'Dock' }).getByRole('button', { name: /Folders/ }).count() === 1);

  // widget click -> system explorer workers
  // close windows covering widgets first
  await page.screenshot({ path: dir + '/04b-folder.png' });
  await page.getByRole('button', { name: 'Close Folders' }).click();
  for (const n of ['Workflow Studio','Claims Intelligence','Document AI']) {
    await page.getByRole('button', { name: new RegExp('^' + n + ' · Minimized') }).click();
    await page.getByRole('button', { name: 'Close ' + n }).click();
  }
  await page.waitForFunction(() => document.querySelectorAll('main section[aria-label][data-focused]').length === 0, null, { timeout: 3000 }).catch(() => {}); // close animation
  check('all closed', await page.locator('main section[aria-label][data-focused]').count() === 0);
  check('desktop has exactly three widgets', await page.getByRole('complementary', { name: 'System overview' }).locator('section').count() === 3);
  check('no create button on the desktop', await page.getByRole('button', { name: /Create Application/i }).count() === 0);
  check('desktop widgets fit without scrolling', await page.evaluate(() => { const a = document.querySelector('aside[aria-label="System overview"]'); const b = a.parentElement; return b.scrollHeight <= b.clientHeight + 1; }));
  await page.getByRole('button', { name: /Platform health — open/ }).click();
  await page.waitForTimeout(300);
  check('widget opened explorer', await page.locator('section[aria-label="System Explorer"]').isVisible());
  await page.screenshot({ path: dir + '/05-explorer.png' });
  await page.getByRole('button', { name: 'Close System Explorer' }).click();

  // pending approvals widget -> claims approvals
  await page.getByRole('button', { name: 'Review' }).click();
  await page.waitForTimeout(300);
  check('approvals deep link', (await page.locator('section[aria-label="Claims Intelligence"]').innerText()).includes('Your decision is required'));
  await page.getByRole('button', { name: 'Close Claims Intelligence' }).click();

  // notifications
  await page.getByRole('button', { name: /Notifications, 3 unread/ }).click();
  await page.waitForTimeout(200);
  await page.screenshot({ path: dir + '/06-notifications.png' });
  await page.getByRole('button', { name: 'Dismiss: Worker in validation' }).click();
  check('unread decreased', await page.getByRole('button', { name: /Notifications, 2 unread/ }).count() === 1);
  await page.getByRole('button', { name: 'Open document' }).click();
  await page.waitForTimeout(300);
  check('notification opened doc ai at DOC-7812', (await page.locator('section[aria-label="Document AI"]').innerText()).includes("couldn't be read"));
  await page.screenshot({ path: dir + '/07-docai-failed.png' });
  await page.getByRole('button', { name: /^Notifications/ }).click(); // notifications moved to the top bar's right section
  await page.getByRole('button', { name: 'Clear all' }).click();
  check('notifications empty state', await page.getByText("You're all caught up").isVisible());
  await page.keyboard.press('Escape');

  // doc ai normal doc
  await page.locator('section[aria-label="Document AI"]').getByRole('button', { name: /Repair estimate/ }).click();
  await page.locator('section[aria-label="Document AI"]').getByRole('button', { name: /Total incl. VAT/ }).click();
  await page.screenshot({ path: dir + '/08-docai.png' });

  check('global Ask AI is gone', await page.getByRole('button', { name: /Ask AI|^Assistant$/ }).count() === 0);

  // settings: hide widget
  await page.getByRole('button', { name: /^Settings/ }).click(); // settings moved to the top bar's right section
  await page.waitForTimeout(300);
  await page.getByRole('switch', { name: /Platform activity/ }).click();
  check('widget hidden', await page.getByRole('button', { name: /Platform activity — open/ }).count() === 0);
  await page.getByRole('button', { name: 'Reset widgets' }).click();

  // analytics
  await page.keyboard.press('Control+k'); await page.waitForTimeout(150); await page.keyboard.type('Analytics Workspace'); await page.waitForTimeout(150); await page.keyboard.press('Enter'); await page.getByRole('dialog').waitFor({ state: 'hidden' }); // closed apps open from the launcher; the dock lists open apps
  await page.waitForTimeout(300);
  await page.getByRole('button', { name: 'Last 30 days' }).click();
  await page.screenshot({ path: dir + '/10-analytics.png' });

  // small viewport
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(400);
  await page.screenshot({ path: dir + '/11-mobile-window.png' });
  await page.getByRole('button', { name: 'Close settings' }).click().catch(()=>{});
  for (const n of ['Analytics Workspace','Settings','Document AI']) await page.getByRole('button', { name: 'Close ' + n }).click().catch(()=>{});
  await page.waitForTimeout(200);
  await page.screenshot({ path: dir + '/12-mobile-desktop.png' });

  console.log('ERRORS:', errors.length ? errors.join('\n') : 'none');
  await browser.close();
})();
