Feature: Web Releases recipe + views thorough check
  As a tester
  I want to thoroughly exercise the module, the default recipe, the
  Products listing view, and the per-product Releases view
  So that we catch regressions in any of those four moving parts

  # All seeding in this feature is done through the Drupal UI (Add Product
  # / Add Release forms) — no shell, no PHP eval — so the suite stays
  # portable to any HTTP target.
  #
  # Product names intentionally cover three slug styles editors hit in
  # the wild:
  #   * literal dash  "Webship-JS"      → /products/webship-js
  #   * space-to-dash "Webshop Portal"  → /products/webshop-portal
  #   * mixed-case +  "Drupal CMS"      → /products/drupal-cms
  # All three resolve to the same view through the module's
  # WebReleasesProductPathProcessor.
  #
  # Release titles follow Semantic Versioning 2.0.0 (https://semver.org)
  # and store ONLY the version string ("1.0.0", "1.0.0-alpha.1", ...).
  # webreleases_preprocess_node() prepends the linked product label at
  # render time so the page reads "<product> <version>" without forcing
  # editors to type the product name twice.
  #
  # NOTE on scenario isolation:
  # The "the product 'X' has N releases" step picks the first matching
  # product from the entity-reference autocomplete, so a release created
  # in scenario A and a release created in scenario B for the same name
  # share one product node. The scenarios below avoid that by using
  # *distinct* product names per scenario (or by exercising everything
  # for a given product in a single scenario).

  # ── Recipe + landing page (anonymous baseline) ───────────────────────────

  Scenario: The default recipe ships the Products landing webpage
    Given I am an anonymous user
    When I navigate to "/products"
    Then I should see "Products"

  Scenario: The default recipe adds a Products link to the main menu
    Given I am an anonymous user
    When I navigate to "/"
    Then I should see "Products"

  # ── Big slug-style + listing + filtering scenario ───────────────────────
  #
  # Exercises the three "real" product names (Webship-JS / Webshop Portal /
  # Drupal CMS) in a single scenario so the path processor's slug-style
  # coverage is verified end-to-end without cross-scenario data leakage.

  Scenario: The three named products work end-to-end across listing, filtering and slug styles
    Given I am a logged in user with the "Webmaster" user
     And the product "Webship-JS" has 3 releases
     And the product "Webshop Portal" has 4 releases
     And the product "Drupal CMS" has 2 releases
    When I navigate to "/products"
    Then I should see "Products"
     And I should see "Webship-JS"
     And I should see "Webshop Portal"
     And I should see "Drupal CMS"
    # Literal-dash slug.
    When I navigate to "/products/webship-js/releases"
    Then I should see "Releases"
     And I should see 3 ".node--type-release" elements
     And I should see "Webship-JS 1.0.0"
    # Space-to-dash slug.
    When I navigate to "/products/webshop-portal/releases"
    Then I should see "Releases"
     And I should see 4 ".node--type-release" elements
     And I should see "Webshop Portal 1.0.0"
    # Multi-word title slug (also space-to-dash, different casing).
    When I navigate to "/products/drupal-cms/releases"
    Then I should see "Releases"
     And I should see 2 ".node--type-release" elements
     And I should see "Drupal CMS 1.0.0"

  # ── SemVer 2.0.0 release-channel coverage ───────────────────────────────
  #
  # Uses a product name unique to this scenario so the assertion counts
  # don't collide with the named-products scenario above.

  Scenario: A product can carry alpha, beta, rc and stable SemVer releases
    Given I am a logged in user with the "Webmaster" user
     And the product "SemVer Sample" has the following releases:
      | 1.0.0-alpha.1 |
      | 1.0.0-alpha.2 |
      | 1.0.0-alpha.3 |
      | 1.0.0-beta.1  |
      | 1.0.0-beta.2  |
      | 1.0.0-beta.3  |
      | 1.0.0-rc.1    |
      | 1.0.0-rc.2    |
      | 1.0.0-rc.3    |
      | 1.0.0         |
    When I navigate to "/products/semver-sample/releases"
    Then I should see "Releases"
     And I should see 9 ".node--type-release" elements
     And I should see "SemVer Sample 1.0.0"
    When I navigate to "/products/semver-sample/releases?page=1"
    Then I should see 1 ".node--type-release" elements
     And I should see "SemVer Sample 1.0.0-alpha.1"
