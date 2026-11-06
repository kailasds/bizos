/*
 * Playwright smoke test — Milestone 3 intelligence experience:
 * honest fallback, understanding (evidence, suggestions, questions), approach comparison and
 * step inspection, contextual AI Architect, resource catalogue and detail, worker reject/approve,
 * blueprint sections, version compare and rollback, readiness, registry and detail, persisted
 * approvals, widgets, responsive screenshots, and demo-data reset.
 * Requires the `playwright` package and a Chromium browser (not a project dependency).
 *   npm run build && npx vite preview --port 4173 &
 *   node e2e/intelligence.cjs [screenshot-dir]
 */
const { chromium } = require('playwright');
const dir = process.argv[2] || 'e2e/screenshots'; require('fs').mkdirSync(dir, { recursive: true });
(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  let fails = 0;
  const check = (name, cond) => { if (!cond) fails++; console.log((cond ? 'PASS ' : 'FAIL ') + name); };
  const shot = (n) => page.screenshot({ path: `${dir}/m3-${n}.png` });
  const studio = page.locator('section[aria-label="Application Studio"]');
  const panel = studio.getByRole('complementary', { name: 'AI Architect' });
  const T = 15000;
  const text = () => studio.innerText();

  await page.goto(process.env.BASE_URL || 'http://localhost:4173');
  await page.getByRole('button', { name: 'Create Application, opens Application Studio' }).click();
  await studio.waitFor({ timeout: T });

  // ── Honest fallback for an unmatched description
  await studio.getByLabel('What should the application help your teams achieve?').fill('We need a tool to plan staff holidays. It should show who is on leave across teams.');
  await studio.getByRole('button', { name: 'Start discovery' }).click();
  await studio.getByText('I don’t have a scripted understanding for this description').waitFor({ timeout: T });
  check('fallback does not pretend to understand', (await text()).includes('has not interpreted your text'));
  check('fallback keeps the user points', (await text()).includes('We need a tool to plan staff holidays'));
  await shot('01-fallback');
  await studio.getByRole('button', { name: 'Rewrite the description' }).click();

  // ── Understanding (brief example prompt)
  await studio.getByLabel('What should the application help your teams achieve?').fill('I want to automate insurance claims processing and reduce manual intervention.');
  await studio.getByRole('button', { name: 'Start discovery' }).click();
  await studio.getByRole('region', { name: 'Summary of understanding' }).waitFor({ timeout: T });
  check('summary sentence', (await text()).includes('You want an application that takes insurance claims'));
  await studio.getByRole('button', { name: 'Evidence' }).click(); // reasoning is shown on request
  check('evidence cue from description', (await text()).includes('Based on your words'));
  check('fraud not assumed when not mentioned', !(await studio.getByRole('group', { name: 'What the application must do' }).innerText()).includes('fraud'));
  await studio.getByRole('button', { name: 'Accept: Screen claims for potential fraud before payment.' }).click();
  check('accepted suggestion becomes a capability', (await studio.getByRole('group', { name: 'What the application must do' }).innerText()).includes('Screen claims for potential fraud'));
  await studio.getByRole('button', { name: 'Reject: Retain claim documents for the regulatory period' }).click();
  check('rejected suggestion marked', (await studio.getByRole('region', { name: 'Possibly missing' }).innerText()).includes('Rejected'));
  await studio.getByRole('group', { name: 'Which claims should the first version handle?' }).getByRole('button', { name: 'Motor and home' }).click();
  await studio.getByRole('group', { name: 'Who should approve settlements that need a human decision?' }).getByRole('button', { name: 'Claims managers' }).click();
  await studio.getByRole('button', { name: /^Constraints/ }).click();
  check('answer adds a constraint with its source', /First version handles motor and home claims\s+From your answer/.test(await studio.getByRole('group', { name: 'Important constraints' }).innerText()));
  await studio.getByRole('button', { name: /^People/ }).click();
  check('domain-sourced items are labelled', (await studio.getByRole('group', { name: 'Target users' }).innerText()).includes('From the Insurance domain pack'));
  await shot('02-understanding');
  await studio.getByRole('button', { name: /Confirm understanding/ }).click();
  await studio.getByRole('heading', { name: 'Requirement specification' }).waitFor({ timeout: T });
  check('approver answer reaches Define', (await text()).includes('Approver for decisions with several candidates: Claims managers'));
  await studio.getByRole('button', { name: 'Confirm requirements' }).click();

  // ── Architect: compare, inspect, contextual architect
  await studio.getByRole('tablist', { name: 'Solution approaches' }).waitFor({ timeout: T });
  const tabs = await studio.getByRole('tablist', { name: 'Solution approaches' }).innerText();
  check('brief approach names', ['Assisted Claims Processing', 'AI-Driven Claims Automation', 'Intelligent Claims Operations'].every((n) => tabs.includes(n)));
  await studio.getByRole('button', { name: 'Compare all' }).click();
  const compare = await studio.getByRole('table').innerText();
  check('compare table shows human involvement', compare.includes('Human involvement') && /\d of \d+ steps/.test(compare));
  check('compare table lists new resources', compare.includes('New resources needed') && compare.includes('Fraud investigation'));
  await shot('03-compare');
  await studio.getByRole('button', { name: 'Explore' }).click();
  await studio.getByRole('button', { name: /^Step \d+: Prepare investigation$/ }).click();
  check('inspector shows a missing worker', (await studio.getByRole('region', { name: 'Step details: Prepare investigation' }).innerText()).includes('a new worker would be needed'));
  await studio.getByRole('button', { name: /^Step \d+: Validate coverage$/ }).click();
  check('inspector names the resource', (await studio.getByRole('region', { name: 'Step details: Validate coverage' }).innerText()).includes('Coverage Analyst Worker'));
  await studio.getByRole('button', { name: 'About Coverage Analyst Worker' }).click();
  const sheet = page.getByRole('dialog');
  await sheet.waitFor({ timeout: T });
  check('resource detail is business-first', (await sheet.innerText()).includes('Business responsibilities') && !(await sheet.innerText()).includes('mock://'));
  await sheet.getByRole('button', { name: 'Technical details' }).click();
  check('technical details on request', (await sheet.innerText()).includes('mock://awp/workers/WRK-coverage'));
  await page.keyboard.press('Escape');
  check('approver applied to approach', (await studio.getByRole('figure').innerText()).includes('Claims managers'));
  await shot('04-explore');

  await panel.getByRole('button', { name: 'Can we reduce human intervention?' }).click();
  const reduce = await panel.innerText();
  check('architect reply references approaches', reduce.includes('people on') || reduce.includes('people do'));
  check('architect reply cites sources', reduce.includes('Based on:'));
  check('architect respects approval constraint', reduce.includes('cannot be removed entirely'));
  await panel.getByRole('button', { name: /^Look at / }).last().click();
  check('look-at focuses without selecting', (await studio.getByRole('tab', { name: /Intelligent Claims Operations/ }).getAttribute('aria-selected')) === 'true' && !(await studio.getByRole('tablist').innerText()).includes('Selected'));
  await panel.getByLabel('Ask the AI Architect').fill('What happens if the Fraud Investigation capability is unavailable?');
  await panel.getByRole('button', { name: 'Send' }).click();
  check('unavailability answer is scenario-specific', (await panel.innerText()).includes('Assisted Claims Processing'));
  await panel.getByLabel('Ask the AI Architect').fill('What is the weather tomorrow?');
  await panel.getByRole('button', { name: 'Send' }).click();
  check('unscripted question gets an honest reply', (await panel.innerText()).includes('I have scripted answers about'));
  await studio.getByRole('tab', { name: /AI-Driven Claims Automation/ }).click();
  await studio.getByRole('button', { name: 'Select this approach' }).click();
  await studio.getByRole('button', { name: /Use AI-Driven Claims Automation/ }).click();

  // ── Compose: catalogue, detail, reject → reconsider → approve
  await studio.getByRole('list', { name: 'Capability coverage' }).waitFor({ timeout: T });
  check('coverage uses explicit labels', /available/i.test(await text()) && (await text()).includes('Missing') && !/\d+\s?%/.test(await text()));
  await studio.getByRole('button', { name: 'Resource catalogue' }).click();
  await studio.getByLabel('Search resources').fill('fraud');
  check('catalogue search', (await text()).includes('Fraud Signals Worker'));
  await studio.getByLabel('Search resources').fill('');
  await studio.getByRole('group', { name: 'Resource type' }).getByRole('button', { name: /^Agents/ }).click();
  check('catalogue filter by type', (await text()).includes('Intake Agent') && !(await text()).includes('Coverage Analyst Worker'));
  await studio.getByRole('button', { name: /^Intake Agent/ }).click();
  await sheet.waitFor({ timeout: T });
  check('detail shows used by', (await sheet.innerText()).includes('Claims Intelligence'));
  await shot('05-resource-detail');
  await page.keyboard.press('Escape');
  await studio.getByRole('button', { name: 'Coverage' }).click();
  await studio.getByRole('button', { name: 'Reject' }).click();
  check('rejection explains consequence', (await text()).includes('You rejected the proposed Fraud Investigation Worker'));
  check('rejection offers an alternative', await studio.getByRole('button', { name: 'Look at Assisted Claims Processing' }).isVisible());
  await studio.getByRole('button', { name: 'Reconsider the proposal' }).click();
  await studio.getByRole('button', { name: /Select all available/ }).click();
  await studio.getByRole('button', { name: 'Review configuration' }).first().click();
  check('configuration explained before selecting', (await text()).includes('thresholds'));
  await studio.getByRole('button', { name: 'Confirm and select' }).click();
  await studio.getByRole('button', { name: 'Approve and compose worker' }).click();
  await studio.getByText(/composed for this application/).first().waitFor({ timeout: T });
  await shot('06-coverage');
  await studio.getByRole('button', { name: 'Generate blueprint' }).click();

  // ── Blueprint sections, version compare and rollback
  await studio.getByRole('list', { name: 'Blueprint sections' }).waitFor({ timeout: T });
  check('overview lists ten sections', (await studio.getByRole('list', { name: 'Blueprint sections' }).getByRole('button').count()) === 10);
  check('sections show not validated', (await text()).includes('Not validated'));
  await shot('07-blueprint-overview');
  const sections = studio.getByRole('navigation', { name: 'Blueprint sections' });
  await sections.getByRole('button', { name: 'Workflow' }).click();
  check('approver pre-assigned from answer', (await studio.getByLabel('Decided by').inputValue()) === 'claims-manager');
  await sections.getByRole('button', { name: 'Data model' }).click();
  await studio.getByLabel('New field').fill('Investigation notes');
  await studio.getByRole('button', { name: 'Add field' }).click();
  await sections.getByRole('button', { name: 'Version history' }).click();
  check('two versions recorded', (await studio.getByRole('list', { name: 'Blueprint versions' }).getByRole('listitem').count()) === 2);
  check('version explains why', (await text()).includes('Why: Field added in the Data model section.'));
  await studio.getByRole('button', { name: 'Compare versions' }).click();
  const diff = await studio.getByRole('region', { name: 'Compare versions' }).innerText();
  check('compare identifies changed section', diff.includes('Data model') && diff.includes('Added Claim field “Investigation notes”'));
  await shot('08-compare-versions');
  await studio.getByRole('button', { name: 'Restore v0.1.0' }).click();
  const dialog = page.getByRole('alertdialog');
  check('rollback confirmation is honest', (await dialog.innerText()).includes('no runtime is changed'));
  await dialog.getByRole('button', { name: 'Restore as new draft' }).click();
  check('rollback creates a new version', (await text()).includes('v0.1.2') && (await text()).includes('Restored the content of v0.1.0'));
  await studio.getByLabel('Base version').selectOption('0.1.1');
  await studio.getByLabel('Target version').selectOption('0.1.2');
  check('compare after rollback', (await studio.getByRole('region', { name: 'Compare versions' }).innerText()).includes('Removed Claim field “Investigation notes”'));
  await studio.getByRole('button', { name: 'Continue to validation' }).click();
  await studio.getByRole('button', { name: 'Run validation' }).click();
  await studio.getByText(/of 8 checks passed/).waitFor({ timeout: T });
  check('no approver issue when answered', !(await text()).includes('Nobody is assigned to approve'));
  check('rolled-back field issue detected', (await text()).includes('shows a field the data model does not have'));
  check('readiness: needs attention', (await studio.getByRole('region', { name: 'Readiness' }).innerText()).includes('Needs attention'));
  await studio.getByRole('list', { name: 'Validation issues' }).getByRole('button', { name: 'Details' }).first().click(); // reasoning opens on request
  check('issue explains why it matters', (await text()).includes('Why it matters'));
  await shot('09-readiness');
  await studio.getByRole('button', { name: 'Accept as known gap' }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Accept known gap' }).click();
  check('readiness: accepted with known gaps', (await studio.getByRole('region', { name: 'Readiness' }).innerText()).includes('Accepted with known gaps'));
  await studio.getByRole('button', { name: /Continue to publish/ }).click();
  await studio.getByRole('button', { name: 'Publish application' }).click();
  await studio.getByText(/^Published v0\.1\.2$/).waitFor({ timeout: T });
  await shot('10-published');
  await studio.getByRole('button', { name: 'Back to desktop' }).last().click();

  // ── Registry and detail
  await page.getByRole('navigation', { name: 'Dock' }).getByRole('button', { name: 'System Explorer' }).click();
  const explorer = page.locator('section[aria-label="System Explorer"]');
  await explorer.getByRole('button', { name: 'Applications' }).click();
  await explorer.getByLabel('Search applications').fill('hub');
  check('registry search', (await explorer.getByRole('list', { name: 'Applications' }).getByRole('listitem').count()) === 1);
  await explorer.getByLabel('Search applications').fill('');
  await explorer.getByLabel('Lifecycle').selectOption('preview');
  check('registry lifecycle filter', (await explorer.getByRole('list', { name: 'Applications' }).innerText()).includes('Workflow Studio') && !(await explorer.getByRole('list', { name: 'Applications' }).innerText()).includes('Claims Processing Hub'));
  await explorer.getByLabel('Lifecycle').selectOption('all');
  await explorer.getByLabel('Domain').selectOption('insurance');
  await explorer.getByLabel('Sort by').selectOption('name');
  const names = await explorer.getByRole('list', { name: 'Applications' }).getByRole('listitem').allInnerTexts();
  check('registry sort and domain filter', names[0].startsWith('Analytics Workspace') && names.some((n) => n.includes('Claims Processing Hub')));
  await shot('11-registry');
  await explorer.getByRole('button', { name: 'Claims Processing Hub — details' }).click();
  const detail = await explorer.innerText();
  check('detail sections', ['Purpose', 'Business workflow', 'Associated resources', 'Version history', 'Governance', 'Recent activity'].every((s) => detail.includes(s)));
  check('detail shows publication activity', detail.includes('Published v0.1.2'));
  await shot('12-app-detail');
  await explorer.getByRole('button', { name: 'Open application' }).click();
  const hub = page.locator('section[aria-label="Claims Processing Hub"]');
  await hub.getByText('Generated by Application Studio').waitFor({ timeout: T });
  await hub.getByRole('navigation').getByRole('button', { name: 'Approvals' }).click();
  await hub.getByRole('button', { name: 'Approve' }).first().click();
  await page.getByRole('button', { name: 'Close Claims Processing Hub' }).click();
  await page.getByRole('button', { name: 'Close System Explorer' }).click();
  const widgets = page.locator('aside[aria-label="System overview"]');
  check('approvals widget includes generated app', /Claims Processing Hub\s+2 awaiting/.test(await widgets.innerText()));
  check('application activity: recently published', (await widgets.innerText()).includes('Recently published'));
  check('platform activity shows your events', (await widgets.innerText()).includes('You'));

  // ── Persistence after reload
  await page.reload();
  await page.waitForTimeout(500);
  check('generated app approval persisted', /Claims Processing Hub\s+2 awaiting/.test(await page.locator('aside[aria-label="System overview"]').innerText()));
  await shot('13-desktop-after-reload');

  // ── Responsive screenshots of the Studio
  await page.getByRole('navigation', { name: 'Dock' }).getByRole('button', { name: 'Application Studio' }).click();
  await studio.getByRole('navigation', { name: 'Studio stages' }).getByRole('button', { name: /Architect/ }).click();
  for (const [w, h] of [[1280, 800], [1024, 768], [390, 844]]) {
    await page.setViewportSize({ width: w, height: h });
    await page.waitForTimeout(300);
    await shot(`14-architect-${w}`);
  }
  await page.setViewportSize({ width: 1440, height: 900 });
  await studio.getByRole('navigation', { name: 'Studio stages' }).getByRole('button', { name: /Compose/ }).click();
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.waitForTimeout(300);
  await shot('15-compose-1024');
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.waitForTimeout(300);

  // ── Reset demo data
  await page.getByRole('button', { name: /^Settings/ }).click(); // settings moved to the top bar's right section
  const settings = page.locator('section[aria-label="Settings"]');
  await settings.getByRole('button', { name: 'Demo data' }).click();
  check('demo data counts drafts', /Application Studio drafts\s+1/.test(await settings.innerText()));
  await settings.getByRole('button', { name: 'Reset demo data' }).click();
  await Promise.all([page.waitForEvent('load'), page.getByRole('alertdialog').getByRole('button', { name: 'Reset and reload' }).click()]);
  await page.waitForTimeout(500);
  check('reset removes published app', (await page.getByRole('button', { name: 'Claims Processing Hub, application' }).count()) === 0);

  console.log('FAILS', fails);
  console.log('ERRORS:', errors.length ? errors.join('\n') : 'none');
  await browser.close();
})().catch((e) => { console.error('CRASH', e.message); process.exit(1); });
