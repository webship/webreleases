'use strict';

const { Given, When, Then } = require('@cucumber/cucumber');
const { friendly } = require('webship-js/tests/step-definitions/webship');

/**
 * Run a step body and rethrow any failure as a tester-friendly error.
 *
 * @param {Function} body  - async function performing the step.
 * @param {string} message - human-readable description for failures.
 */
async function attempt(body, message) {
  try {
    await body();
  } catch (err) {
    throw friendly(message, err);
  }
}

/**
 * Log in as a named test user defined in cucumber.js worldParameters.users.
 *
 * The Webmaster row is the site-install super-admin. Every other row is
 * provisioned by `Given I add testing users` (see below). The same
 * phrasing is used by webpage / webblog suites so suites can move between
 * projects without re-learning step names.
 *
 * Example #1: Given I am a logged in user with the "Webmaster" user
 * Example #2: Given I am a logged in user with the "Content editor" user
 * Example #3: Given I am a logged in user with the "Authenticated user" user
 * Example #4: Given I am a logged in user with the username "Content editor" user
 * Example #5: Given I am a logged in user with "Webmaster"
 */
Given(/^I am a logged in user with( the)*( username)* "([^"]*)?"( user)?$/, async function (theCase, usernameCase, key, userCase) {
  const users = this.parameters.users || {};
  if (!(key in users)) {
    throw new Error(`No user named "${key}" in cucumber.js worldParameters.users`);
  }
  const { username, password } = users[key];
  if (!username || !password) {
    throw new Error(`User "${key}" is missing username or password in worldParameters.users`);
  }
  await this.page.goto(`${this.parameters.launchUrl}/user/login`);
  await this.page.getByLabel('Username').fill(username);
  await this.page.getByLabel('Password').fill(password);
  await this.page.locator('input[value="Log in"]').click();
  await this.page.waitForLoadState('networkidle');
});

/**
 * Provision every non-admin user from cucumber.js worldParameters.users via
 * Drupal's /admin/people/create form. Entries flagged isAdmin: true are
 * skipped (the site-install Webmaster already exists). Idempotent — a
 * second run reports "name is already taken" and the step swallows it.
 *
 * Must be invoked while logged in as the Webmaster (or any user with the
 * "administer users" permission).
 *
 * Example #1: Given I add testing users
 * Example #2: And I add testing users
 * Example #3: When I add testing users
 * Example #4: Given I add the testing users
 * Example #5: And we add testing users
 */
Given(/^(?:I |we )?add( the)? testing users$/, async function (theCase) {
  const users = this.parameters.users || {};
  for (const [key, info] of Object.entries(users)) {
    if (info.isAdmin) continue;
    await this.page.goto(`${this.parameters.launchUrl}/admin/people/create`);
    await this.page.locator('#edit-name').fill(info.username);
    await this.page.locator('#edit-mail').fill(info.email || `${info.username}@example.test`);
    await this.page.locator('#edit-pass-pass1').fill(info.password);
    await this.page.locator('#edit-pass-pass2').fill(info.password);
    for (const role of info.roles || []) {
      const cb = this.page.locator(`input[name="roles[${role}]"]`);
      if (await cb.count() > 0) await cb.check();
    }
    await this.page.locator('#edit-submit').click();
    await this.page.waitForLoadState('networkidle');
  }
});

/**
 * Create a product with the given title through the Drupal "Add Product"
 * UI form. The caller must be logged in as a user that can create products
 * (e.g. via `Given I am a logged in user with the "Webmaster" user`).
 *
 * @param {object} page    Playwright page.
 * @param {string} baseUrl launchUrl.
 * @param {string} title   Product title to create.
 */
async function createProductViaUi(page, baseUrl, title) {
  await page.goto(`${baseUrl}/node/add/product`);
  await page.locator('#edit-title-0-value').fill(title);
  await page.locator('input[value="Save"]').click();
  await page.waitForLoadState('networkidle');
}

/**
 * Create a single release linked to a product through the Drupal "Add
 * Release" UI form. The caller must be logged in.
 *
 * Picks the product from the entity-reference autocomplete the same way
 * `When I select "X" from the "Product" autocomplete` does.
 *
 * @param {object} page          Playwright page.
 * @param {string} baseUrl       launchUrl.
 * @param {string} releaseTitle  Release tag / title.
 * @param {string} productTitle  Product to link to.
 */
async function createReleaseViaUi(page, baseUrl, releaseTitle, productTitle) {
  await page.goto(`${baseUrl}/node/add/release`);
  await page.locator('#edit-title-0-value').fill(releaseTitle);
  const productField = page.getByLabel('Product', { exact: false }).first();
  await productField.waitFor({ state: 'visible', timeout: 10000 });
  await productField.click();
  await productField.fill('');
  await productField.pressSequentially(productTitle, { delay: 80 });
  await page
    .locator('ul.ui-autocomplete li.ui-menu-item')
    .filter({ hasText: productTitle })
    .first()
    .waitFor({ state: 'visible', timeout: 10000 });
  await productField.press('ArrowDown');
  await productField.press('Enter');
  await page.locator('input[value="Save"]').click();
  await page.waitForLoadState('networkidle');
}

/**
 * Seed a product and a number of releases linked to it, all through the
 * Drupal UI forms — no shell-outs, no eval. Slower than back-end seeding
 * but keeps the suite portable (any HTTP target, no drush dependency).
 *
 * Caller must be logged in as admin first.
 *
 * Example #1: Given the product "Alpha" has 3 releases
 * Example #2: Given the product "Bravo" has 12 releases
 * Example #3: Given the product "Charlie" has 0 releases
 */
Given(/^the product "([^"]*)" has (\d+) releases?$/, { timeout: 10 * 60 * 1000 }, async function (product, count) {
  const base = this.parameters.launchUrl;
  await createProductViaUi(this.page, base, product);
  const total = parseInt(count, 10);
  // Release titles intentionally do NOT include the product name —
  // webreleases_preprocess_node() prepends it on render — so we seed
  // with the version string only.
  for (let i = 1; i <= total; i += 1) {
    await createReleaseViaUi(this.page, base, `1.0.${i - 1}`, product);
  }
});

/**
 * Seed a product and an explicit list of release titles via the UI.
 *
 * Same idea as `Given the product "X" has N releases` but the release
 * titles are taken verbatim from a Gherkin data table — useful when a
 * scenario needs to cover specific release channels (alpha / beta / rc /
 * stable) or any other named release set.
 *
 * Caller must be logged in as admin first.
 *
 * Example:
 *   Given the product "Lyra" has the following releases:
 *     | Lyra 1.0.0-alpha1 |
 *     | Lyra 1.0.0-beta1  |
 *     | Lyra 1.0.0-rc1    |
 *     | Lyra 1.0.0        |
 */
Given(/^the product "([^"]*)" has the following releases:$/, { timeout: 10 * 60 * 1000 }, async function (product, table) {
  const base = this.parameters.launchUrl;
  const titles = table
    .raw()
    .map((row) => row[0].trim())
    .filter(Boolean);
  await createProductViaUi(this.page, base, product);
  for (const releaseTitle of titles) {
    await createReleaseViaUi(this.page, base, releaseTitle, product);
  }
});

/**
 * Assert that a form field with the given label is visible on the page.
 *
 * Example #1: Then I should see a "Title" field
 * Example #2: Then I should see a "Product" field
 * Example #3: Then I should see a "Release tag" field
 * Example #4: Then I should see a "Username" field
 * Example #5: Then I should see a "Password" field
 */
Then(/^(?:I |we )?should see a "([^"]*)" field$/, async function (label) {
  await attempt(async () => {
    const locator = this.page.getByLabel(label, { exact: false }).first();
    await locator.waitFor({ state: 'visible', timeout: 10000 });
  }, `Expected to find a field labeled "${label}"`);
});

/**
 * Assert that a form field with the given label (with article "an") is visible.
 *
 * Example #1: Then I should see an "Image" field
 * Example #2: Then I should see an "Author" field
 * Example #3: Then I should see an "Options" field
 * Example #4: And I should see an "Image" field
 * Example #5: And I should see an "Author" field
 */
Then(/^(?:I |we )?should see an "([^"]*)" field$/, async function (label) {
  await attempt(async () => {
    const locator = this.page.getByLabel(label, { exact: false }).first();
    await locator.waitFor({ state: 'visible', timeout: 10000 });
  }, `Expected to find a field labeled "${label}"`);
});

/**
 * Assert that a button with the given text is visible on the page.
 *
 * Example #1: Then I should see the button "Save"
 * Example #2: Then I should see the button "Log in"
 * Example #3: Then I should see the button "Delete"
 * Example #4: Then I should see the button "Preview"
 * Example #5: Then I should see the button "Submit"
 */
Then(/^(?:I |we )?should see the button "([^"]*)"$/, async function (text) {
  await attempt(async () => {
    const locator = this.page.getByRole('button', { name: text, exact: false }).first();
    await locator.waitFor({ state: 'visible', timeout: 10000 });
  }, `Expected to find a button with text "${text}"`);
});

/**
 * Select a value from a Drupal entity-reference autocomplete field.
 *
 * Types the value into the field labeled <label>, waits for the jQuery UI
 * suggestions menu, and picks the first match with the keyboard so Drupal
 * stores the "Title (id)" value the reference field needs. Fails loudly if
 * the field is not resolved to a "... (id)" value.
 *
 * Example #1: When I select "Webship" from the "Product" autocomplete
 * Example #2: When I select "Alpha" from the "Product" autocomplete
 * Example #3: And I select "Drupal" from the "Product" autocomplete
 */
When(/^(?:I |we )?select "([^"]*)" from the "([^"]*)" autocomplete$/, async function (value, label) {
  await attempt(async () => {
    const field = this.page.getByLabel(label, { exact: false }).first();
    await field.waitFor({ state: 'visible', timeout: 10000 });
    await field.click();
    await field.fill('');
    await field.pressSequentially(value, { delay: 80 });
    await this.page
      .locator('ul.ui-autocomplete li.ui-menu-item')
      .filter({ hasText: value })
      .first()
      .waitFor({ state: 'visible', timeout: 10000 });
    await field.press('ArrowDown');
    await field.press('Enter');
    const resolved = await field.inputValue();
    if (!/\(\d+\)\s*$/.test(resolved)) {
      throw new Error(`autocomplete did not resolve to an entity, value is "${resolved}"`);
    }
  }, `Expected to select "${value}" from the "${label}" autocomplete`);
});

/**
 * Log the current user out by visiting Drupal's logout confirmation form
 * and submitting it. Idempotent — does nothing if already anonymous.
 *
 * Example #1: When I log out
 * Example #2: And I log out
 */
When(/^(?:I |we )?log out$/, async function () {
  await attempt(async () => {
    await this.page.goto(`${this.parameters.launchUrl}/user/logout`);
    // Drupal 11 shows a confirmation form at /user/logout/confirm.
    const submit = this.page.locator('form#user-logout-confirm input[type="submit"]');
    if (await submit.count()) {
      await submit.first().click();
      await this.page.waitForLoadState('networkidle');
    }
  }, 'Expected to log out of the site');
});
