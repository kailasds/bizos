/*
 * Playwright smoke test — Milestone 2 full Application Studio journey (Insurance), publish, reload, invalidation
 * Requires the `playwright` package and a Chromium browser (not a project dependency).
 * Run against a production preview:
 *   npm run build && npx vite preview --port 4173 &
 *   node e2e/studio-journey.cjs [screenshot-dir]
 * Each run starts with empty browser storage. Exits after printing PASS/FAIL lines.
 */
const { chromium } = require('playwright');
const dir = process.argv[2] || 'e2e/screenshots'; require('fs').mkdirSync(dir, { recursive: true });
(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  page.on('dialog', d => d.accept());
  let fails = 0;
  const check = (name, cond) => { if (!cond) fails++; console.log((cond ? 'PASS ' : 'FAIL ') + name); };
  const shot = (n) => page.screenshot({ path: `${dir}/${n}.png` });
  const studio = page.locator('section[aria-label="Application Studio"]');
  const T = 15000;

  await page.goto(process.env.BASE_URL || 'http://localhost:4173');
  await page.waitForTimeout(400);
  await shot('00-desktop');

  // 1. open studio from desktop entry point
  await page.getByRole('button', { name: 'Create Application, opens Application Studio' }).click();
  await studio.waitFor({ timeout: T });
  await page.waitForTimeout(300); // let the 150ms open animation settle before measuring
  const sb = await studio.boundingBox();
  check('studio opens maximized', sb.width >= 1430);

  // error state: too short
  await studio.getByLabel('What should the application help your teams achieve?').fill('claims app');
  await studio.getByRole('button', { name: 'Start discovery' }).click();
  check('short prompt shows error', await studio.getByText(/at least 24 characters/).isVisible());

  // 2. enter requirement
  await studio.getByLabel('What should the application help your teams achieve?').fill('I want an application that helps insurance teams process claims, detect potential fraud and route complex cases for human review.');
  check('insurance suggested', await studio.getByRole('radio', { name: /Insurance.*Suggested/ }).isVisible());
  await shot('01-discover');
  await studio.getByRole('button', { name: 'Start discovery' }).click();
  check('thinking state shown', await studio.getByText('Understanding your request…').isVisible());
  await studio.getByRole('region', { name: 'Summary of understanding' }).waitFor({ timeout: T });
  const interp = await studio.innerText();
  check('interpretation has fraud + routing', interp.includes('Identify potential fraud indicators and investigate flagged claims.') && interp.includes('Route complex cases to human reviewers.'))

  // 3. edit interpretation: add a point, accept a suggestion
  await studio.getByRole('button', { name: 'Add a capability' }).click();
  await studio.getByLabel('Add a capability').fill('Let customers upload photos of damage');
  await studio.getByRole('button', { name: 'Add', exact: true }).click();
  check('custom point added', (await studio.getByRole('group', { name: 'What the application must do' }).innerText()).includes('upload photos'));
  await studio.getByRole('button', { name: 'Accept: Ask customers for missing information automatically' }).click();
  await shot('02-interpretation');
  await studio.getByRole('button', { name: /Confirm understanding/ }).click();

  // Define
  await studio.getByRole('heading', { name: 'Requirement specification' }).waitFor({ timeout: T });
  check('define has users', (await studio.getByRole('region', { name: 'Users' }).innerText()).includes('Fraud investigators'));
  check('custom capability carried into spec', (await studio.getByRole('region', { name: 'Business capabilities' }).innerText()).includes('upload photos'));
  check('accepted suggestion carried into outputs', (await studio.getByRole('region', { name: 'Outputs' }).innerText()).includes('Ask customers for missing information'));
  await studio.getByRole('button', { name: 'Ask the architect about Coverage validation' }).click();
  check('architect explains item', (await studio.getByRole('complementary', { name: 'AI Architect' }).innerText()).includes('Coverage validation'));
  await shot('03-define');
  await studio.getByRole('button', { name: 'Confirm requirements' }).click();

  // 4-5. Architect
  await studio.getByRole('tablist', { name: 'Solution approaches' }).waitFor({ timeout: T });
  check('three approaches', await studio.getByRole('tablist', { name: 'Solution approaches' }).getByRole('tab').count() === 3);
  check('no percentages in approaches', !/\d+\s?%/.test(await studio.innerText()));
  await studio.getByRole('tab', { name: /AI-Driven Claims Automation/ }).click();
  await studio.getByRole('button', { name: 'Select this approach' }).click();
  check('flow visualization shown', await studio.getByRole('figure', { name: /AI-Driven Claims Automation workflow/ }).isVisible());
  await shot('04-architect');
  await studio.getByRole('button', { name: /Use AI-Driven Claims Automation/ }).click();

  // 6-7. Compose
  await studio.getByRole('region', { name: /Missing capability: Fraud investigation/ }).waitFor({ timeout: T });
  check('generate disabled while missing', await studio.getByRole('button', { name: 'Generate blueprint' }).isDisabled());
  check('proposal marked as proposed', await studio.getByText('Proposed — not created').isVisible());
  await shot('05-compose-gap');
  await studio.getByRole('button', { name: /Select all available/ }).click();
  await studio.getByRole('button', { name: 'Review configuration' }).first().click();
  await studio.getByRole('button', { name: 'Confirm and select' }).click();
  await studio.getByRole('button', { name: 'Approve and compose worker' }).click();
  check('composition sequence shown', await studio.getByRole('list', { name: 'Worker composition' }).isVisible());
  await studio.getByText(/composed for this application/).first().waitFor({ timeout: T });
  check('worker now created', !(await studio.getByRole('region', { name: /Missing capability/ }).count()));
  check('generate enabled once every need is selected', await studio.getByRole('button', { name: 'Generate blueprint' }).isEnabled());
  await shot('06-compose-done');
  await studio.getByRole('button', { name: 'Generate blueprint' }).click();

  // 8-9. Generate
  await studio.getByRole('heading', { name: 'Application Blueprint' }).waitFor({ timeout: T });
  check('blueprint v0.1.0', (await studio.innerText()).includes('v0.1.0'));
  await shot('07-generate-overview');
  await studio.getByRole('navigation', { name: 'Blueprint sections' }).getByRole('button', { name: 'Experience and screens' }).click();
  await page.waitForTimeout(200);
  check('preview renders claims workspace', await studio.getByRole('region', { name: 'All claims' }).isVisible());
  await studio.getByRole('navigation', { name: /screens/ }).getByRole('button', { name: 'Investigation workspace' }).click();
  check('preview exposes missing notes field', await studio.getByText(/Nothing can be saved here yet/).isVisible());
  await shot('08-generate-preview');
  await studio.getByRole('navigation', { name: 'Blueprint sections' }).getByRole('button', { name: 'Technical view (JSON)' }).click();
  check('json view', (await studio.locator('pre').innerText()).includes('"applicationId": "app-claims-processing-hub-001"'));
  await studio.getByRole('button', { name: 'Continue to validation' }).click();

  // 10-11. Validate
  await studio.getByRole('button', { name: 'Run validation' }).click();
  check('validation progress shown', await studio.getByRole('list', { name: 'Validation checks' }).isVisible());
  await studio.getByText(/of 8 checks passed/).waitFor({ timeout: T });
  const vtext = await studio.innerText();
  check('blocked approver found', vtext.includes('Nobody is assigned to approve'));
  check('ui/data issue found', vtext.includes('shows a field the data model does not have'));
  check('custom requirement flagged', vtext.includes('has no matching capability'));
  check('publish blocked', await studio.getByRole('button', { name: /Continue to publish/ }).isDisabled());
  await shot('09-validate-issues');
  await studio.getByLabel('Choose the approver role').selectOption('claims-manager');
  check('stale banner after fix', await studio.getByText(/since this run/).isVisible());
  await studio.getByRole('button', { name: /Add “Investigation Notes” field/ }).click();
  await studio.getByRole('button', { name: 'Re-run validation' }).first().click();
  await studio.getByText(/of 8 checks passed/).waitFor({ timeout: T });
  await page.waitForTimeout(200);
  const v2 = await studio.innerText();
  check('approver issue resolved', !v2.includes('Nobody is assigned to approve'));
  check('ui issue resolved', !v2.includes('shows a field the data model does not have'));
  await studio.getByRole('button', { name: 'Accept as known gap' }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Accept known gap' }).click();
  check('ready after acceptance', await studio.getByRole('button', { name: /Continue to publish/ }).isEnabled());
  await shot('10-validate-passed');
  await studio.getByRole('button', { name: /Continue to publish/ }).click();

  // 12. Publish
  await shot('11-publish-review');
  await studio.getByRole('button', { name: 'Publish application' }).click();
  check('publishing progress', await studio.getByRole('list', { name: 'Publishing' }).isVisible());
  await studio.getByText(/^Published v0\.1\.2$/).waitFor({ timeout: T });
  check('lifecycle published', (await studio.innerText()).includes('Published v0.1.2') && !(await studio.innerText()).includes('changes pending'));
  await shot('12-published');

  // 13-14. Back to desktop, open new app
  await studio.getByRole('button', { name: 'Back to desktop' }).last().click();
  await studio.waitFor({ state: 'hidden' }); // minimize animates into the dock
  check('studio minimized', !(await studio.isVisible()));
  const icon = page.getByRole('button', { name: 'Claims Processing Hub, application' });
  check('new app on desktop', await icon.isVisible());
  await icon.click();
  const appWin = page.locator('section[aria-label="Claims Processing Hub"]');
  await appWin.getByText('Generated by Application Studio').waitFor({ timeout: T });
  check('generated app window open', (await appWin.innerText()).includes('Generated by Application Studio'));
  await appWin.getByRole('navigation').getByRole('button', { name: 'Approvals' }).click();
  await appWin.getByRole('button', { name: 'Approve' }).first().click();
  await shot('13-generated-app');
  check('dock shows generated app', await page.getByRole('navigation', { name: 'Dock' }).getByRole('button', { name: /Claims Processing Hub/ }).count() === 1);
  // folder
  await page.getByRole('button', { name: 'Minimize Claims Processing Hub' }).click();
  await appWin.waitFor({ state: 'hidden' });
  await page.getByRole('button', { name: /^Insurance, folder, 4 applications/ }).click();
  await page.locator('section[aria-label="Folders"]').getByText('Claims Processing Hub').waitFor({ timeout: T }).catch(() => {});
  check('insurance folder lists new app', (await page.locator('section[aria-label="Folders"]').innerText()).includes('Claims Processing Hub'));
  await page.getByRole('button', { name: 'Close Folders' }).click();

  // notification of publish
  await page.getByRole('button', { name: /Notifications, \d+ unread/ }).click();
  check('publish notification', await page.getByText('Claims Processing Hub published').isVisible());
  await page.keyboard.press('Escape');

  // 15. existing desktop still works
  await page.keyboard.press('Control+k'); await page.waitForTimeout(150); await page.keyboard.type('Claims Intelligence'); await page.waitForTimeout(150); await page.keyboard.press('Enter'); await page.getByRole('dialog').waitFor({ state: 'hidden' }); // closed apps open from the launcher; the dock lists open apps
  await page.locator('section[aria-label="Claims Intelligence"]').waitFor();
  check('claims intelligence opens', await page.locator('section[aria-label="Claims Intelligence"]').isVisible());
  await page.getByRole('button', { name: 'Maximize Claims Intelligence' }).click();
  await page.getByRole('button', { name: 'Restore Claims Intelligence' }).click();
  await page.getByRole('button', { name: 'Close Claims Intelligence' }).click();
  await page.keyboard.press('Control+k');
  await page.keyboard.type('processing hub');
  await page.waitForTimeout(200);
  check('launcher finds generated app', await page.getByRole('option', { name: /Claims Processing Hub/ }).count() > 0);
  await page.keyboard.press('Escape');

  // Refresh & restore
  await page.reload();
  await page.waitForTimeout(500);
  check('generated app persists after reload', await page.getByRole('button', { name: 'Claims Processing Hub, application' }).isVisible());
  await page.getByRole('navigation', { name: 'Dock' }).getByRole('button', { name: 'Application Studio' }).click();
  await studio.getByText('Review and publish').waitFor({ timeout: T }).catch(() => {});
  check('draft restored after reload', (await studio.innerText()).includes('Claims Processing Hub') && (await studio.innerText()).includes('Review and publish'));

  // Change an upstream decision → downstream invalidated
  await studio.getByRole('navigation', { name: 'Studio stages' }).getByRole('button', { name: /Architect/ }).click();
  await studio.getByRole('tab', { name: /Assisted Claims Processing/ }).click();
  await studio.getByRole('button', { name: 'Select this approach' }).click();
  const navText = await studio.getByRole('navigation', { name: 'Studio stages' }).innerHTML();
  check('downstream marked needs review', (navText.match(/Needs review/g) || []).length >= 4);
  check('lifecycle changes pending', (await studio.innerText()).includes('Changes pending'));
  await shot('14-needs-review');

  // reopen draft via All projects
  await studio.getByRole('button', { name: 'All projects' }).click();
  await shot('15-projects');
  await studio.getByRole('button', { name: 'Open', exact: true }).click();
  check('draft reopened', await studio.getByRole('navigation', { name: 'Studio stages' }).isVisible());

  // width: restore window and narrow viewport
  await page.getByRole('button', { name: 'Restore Application Studio' }).click();
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.waitForTimeout(300);
  await shot('16-studio-1024');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(300);
  await shot('17-studio-mobile');

  console.log('FAILS', fails);
  console.log('ERRORS:', errors.length ? errors.join('\n') : 'none');
  await browser.close();
})().catch(e => { console.error('CRASH', e.message); process.exit(1); });
