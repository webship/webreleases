'use strict';

const path = require('path');
const { Before, BeforeStep, AfterStep, After, Given, When, Then } = require('@cucumber/cucumber');
const { friendly } = require('webship-js/tests/step-definitions/webship');
const {
  navigate,
  submitInPage,
  isAuthenticated,
  loginWithForm,
  resolveUser,
  sessionStatus,
  joinUrl,
} = require('@webship-js/drupal-core-steps/tests/step-definitions/drupal-helpers');

// ---------------------------------------------------------------------------
// What a scenario creates, it removes
// ---------------------------------------------------------------------------
//
// Every product, release and image a scenario creates, through the seeding
// steps below or through a node add form it saves, is deleted after the
// scenario, also after a failure: the site is left as the suite found it, and
// the suite can run again on the same site. The deletion is the Webmaster's
// work; a scenario that ends as a visitor is logged in as the Webmaster for it.

/**
 * The id of the node whose own page is open: what a node add form opens once
 * the node is saved ("node/<nid>" in drupalSettings). Nothing else on the
 * page counts, so a form that did not save gives nothing.
 *
 * @param {object} page Playwright page.
 * @returns {Promise<string|null>}
 */
async function savedNodeId(page) {
  await page.waitForLoadState('load').catch(() => {});
  return page.evaluate(() => {
    const settings = window.drupalSettings && window.drupalSettings.path;
    const match = settings && typeof settings.currentPath === 'string' && settings.currentPath.match(/^node\/(\d+)$/);
    return match ? match[1] : null;
  }).catch(() => null);
}

/**
 * Remember an entity the scenario created, to delete it after the scenario.
 *
 * @param {object} world The World.
 * @param {string} type  "node" or "media".
 * @param {string|number|null} id The entity id.
 */
function remember(world, type, id) {
  if (!id) return;
  const created = world.webreleasesCreated || (world.webreleasesCreated = []);
  if (!created.some((item) => item.type === type && item.id === String(id))) {
    created.push({ type, id: String(id) });
  }
}

/**
 * Delete one entity through its delete form. An entity that is gone already
 * (the scenario deleted it) is skipped. Its edit form tells whether it is
 * there: a media item has no page of its own unless the site gives media
 * standalone URLs.
 *
 * @param {object} world The World.
 * @param {{type: string, id: string}} item The entity.
 * @returns {Promise<boolean>} Whether the entity is gone.
 */
async function deleteCreated(world, item) {
  const url = joinUrl(world.launchUrl, `/${item.type}/${item.id}/edit`);
  if ((await sessionStatus(world.page, url)) === 404) return true;
  await navigate(world, `/${item.type}/${item.id}/delete`);
  const form = 'form.confirmation';
  if ((await world.page.locator(form).count()) === 0) return false;
  await submitInPage(world, `${form} #edit-submit, ${form} [data-drupal-selector="edit-submit"]`, form);
  return (await sessionStatus(world.page, url)) === 404;
}

Before(function () {
  this.webreleasesCreated = [];
});

// A node add form that a step saves opens the new node: remember it.
BeforeStep(function () {
  this.webreleasesAddForm = Boolean(this.page) && /\/node\/add\/[^/?#]+/.test(this.page.url());
});

AfterStep(async function () {
  if (!this.webreleasesAddForm || !this.page) return;
  remember(this, 'node', await savedNodeId(this.page));
});

After({ timeout: 10 * 60 * 1000 }, async function () {
  // The newest first: the releases before their product, the product before
  // its image.
  const created = (this.webreleasesCreated || []).slice().reverse();
  if (!created.length || !this.page) return;
  const admin = resolveUser(this, 'Webmaster');
  if (!(await isAuthenticated(this))) {
    await loginWithForm(this, admin.username, admin.password);
  }
  let left = [];
  for (const item of created) {
    if (!(await deleteCreated(this, item).catch(() => false))) left.push(item);
  }
  if (left.length) {
    // Another account's session cannot delete them: once more as the Webmaster.
    await loginWithForm(this, admin.username, admin.password);
    const again = left;
    left = [];
    for (const item of again) {
      if (!(await deleteCreated(this, item).catch(() => false))) left.push(item);
    }
  }
  this.webreleasesCreated = [];
  if (left.length) {
    throw friendly({
      message: 'The scenario could not remove what it created.',
      cause: left.map((item) => `${item.type} ${item.id}`).join(', '),
      hint: 'Delete them on the site before the next run.',
    });
  }
});

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
  return savedNodeId(page);
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
  return savedNodeId(page);
}

/**
 * Upload an image media item through the Drupal "Add Image" media form.
 *
 * The media name comes from the uploaded file name.
 *
 * @param {object} page    Playwright page.
 * @param {string} baseUrl launchUrl.
 * @param {string} alt     Alternative text for the image.
 */
async function createImageMediaViaUi(page, baseUrl, alt) {
  await page.goto(`${baseUrl}/media/add/image`);
  await page
    .locator('input[type="file"][name="files[field_media_image_0]"]')
    .setInputFiles(path.resolve(__dirname, '../files/nasa-pia17172.jpg'));
  const altField = page.locator('input[name="field_media_image[0][alt]"]');
  await altField.waitFor({ state: 'visible', timeout: 20000 });
  await altField.fill(alt);
  await page.locator('#edit-submit').click();
  await page.waitForLoadState('networkidle');
}

/**
 * Create a product with an image through the "Add Product" form, picking
 * the newest image from the media library widget.
 *
 * @param {object} page    Playwright page.
 * @param {string} baseUrl launchUrl.
 * @param {string} title   Product title to create.
 */
async function createProductWithImageViaUi(page, baseUrl, title) {
  await page.goto(`${baseUrl}/node/add/product`);
  await page.locator('#edit-title-0-value').fill(title);
  await page.locator('input[name="field_image-media-library-open-button"]').click();
  const dialog = page.locator('.ui-dialog');
  // The media library lists the newest media first.
  const item = dialog.locator('.js-media-library-item').first();
  await item.waitFor({ state: 'visible', timeout: 20000 });
  await item.locator('input[type="checkbox"]').check();
  await dialog.locator('.ui-dialog-buttonpane button').filter({ hasText: 'Insert selected' }).click();
  await page
    .locator('[data-drupal-selector="edit-field-image-selection-0-remove-button"]')
    .waitFor({ state: 'visible', timeout: 20000 });
  const mediaId = await page
    .locator('input[name="field_image[selection][0][target_id]"]')
    .inputValue()
    .catch(() => null);
  await page.locator('#edit-submit').click();
  await page.waitForLoadState('networkidle');
  return { mediaId, productId: await savedNodeId(page) };
}

/**
 * Seed a product with an image and a list of releases with release dates.
 *
 * Each table row is a release tag and its release date (YYYY-MM-DD), which
 * is saved as the release "Authored on" date. The image is uploaded to the
 * media library first and picked on the product form.
 *
 * Caller must be logged in as admin first.
 *
 * Example:
 *   Given the product "Andromeda" with an image has the following releases:
 *     | 2.0.0 | 2026-01-15 |
 *     | 2.1.0 | 2026-06-01 |
 */
Given(/^the product "([^"]*)" with an image has the following releases:$/, { timeout: 10 * 60 * 1000 }, async function (product, table) {
  const base = this.parameters.launchUrl;
  await createImageMediaViaUi(this.page, base, `${product} image`);
  const { mediaId, productId } = await createProductWithImageViaUi(this.page, base, product);
  remember(this, 'media', mediaId);
  remember(this, 'node', productId);
  for (const [tag, date] of table.raw()) {
    await this.page.goto(`${base}/node/add/release`);
    await this.page.locator('#edit-title-0-value').fill(tag.trim());
    if (date && date.trim()) {
      const dateField = this.page.locator('#edit-created-0-value-date');
      // The "Authored on" date sits in the collapsed authoring details.
      await dateField.evaluate((element) => {
        const details = element.closest('details');
        if (details) details.open = true;
      });
      await dateField.fill(date.trim());
      await this.page.locator('#edit-created-0-value-time').fill('10:00:00');
    }
    const productField = this.page.getByLabel('Product', { exact: false }).first();
    await productField.click();
    await productField.pressSequentially(product, { delay: 80 });
    await this.page
      .locator('ul.ui-autocomplete li.ui-menu-item')
      .filter({ hasText: product })
      .first()
      .waitFor({ state: 'visible', timeout: 10000 });
    await productField.press('ArrowDown');
    await productField.press('Enter');
    await this.page.locator('#edit-submit').click();
    await this.page.waitForLoadState('networkidle');
    remember(this, 'node', await savedNodeId(this.page));
  }
});

/**
 * Assert that an image rendered with the given image style is visible.
 *
 * Example #1: Then I should see an image with the "large" image style
 * Example #2: And I should see an image with the "medium" image style
 */
Then(/^(?:I |we )?should see an image with the "([^"]*)" image style$/, async function (style) {
  await attempt(async () => {
    const image = this.page.locator(`img[src*="/styles/${style}/"]`).first();
    await image.waitFor({ state: 'visible', timeout: 10000 });
  }, `Expected to see an image with the "${style}" image style`);
});

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
  remember(this, 'node', await createProductViaUi(this.page, base, product));
  const total = parseInt(count, 10);
  // Release titles intentionally do NOT include the product name —
  // webreleases_preprocess_node() prepends it on render — so we seed
  // with the version string only.
  for (let i = 1; i <= total; i += 1) {
    remember(this, 'node', await createReleaseViaUi(this.page, base, `1.0.${i - 1}`, product));
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
  remember(this, 'node', await createProductViaUi(this.page, base, product));
  for (const releaseTitle of titles) {
    remember(this, 'node', await createReleaseViaUi(this.page, base, releaseTitle, product));
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
