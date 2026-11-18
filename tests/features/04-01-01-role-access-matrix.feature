Feature: Web Releases access matrix across Standard profile roles
  As a site administrator
  I want to verify product and release access for every default role
  So that I know who can and cannot create or view products and releases

  Access is checked by route: a refused request is a 403 or 404, the login
  form, or the "Access denied" page, whatever the theme writes on it. A
  visitor's view of a published product or release is a request without a
  session (the API steps send it outside the browser), so those scenarios log
  in once. Every product and release a scenario creates is deleted after the
  scenario (tests/README.md).

  # ── Webmaster ───────────────────────────────────────────────────────────

  Scenario: Webmaster can reach the product add form
    Given I am a logged in user with the "Webmaster" user
    When I navigate to "/node/add/product"
    Then I should see "Create Product"
     And I should see a "Title" field

  Scenario: Webmaster can reach the release add form
    Given I am a logged in user with the "Webmaster" user
    When I navigate to "/node/add/release"
    Then I should see "Create Release"
     And I should see a "Release tag" field
     And I should see a "Product" field

  Scenario: Webmaster can reach the content admin listing
    Given I am a logged in user with the "Webmaster" user
    Then I should be allowed access to "/admin/content"

  Scenario: Webmaster can reach the product content-type settings
    Given I am a logged in user with the "Webmaster" user
    Then I should be allowed access to "/admin/structure/types/manage/product"

  Scenario: Webmaster can reach the release content-type settings
    Given I am a logged in user with the "Webmaster" user
    Then I should be allowed access to "/admin/structure/types/manage/release"

  # ── Content editor ──────────────────────────────────────────────────────

  # A Standard site with the module's recipe does not let content editors
  # create products or releases; a Webship site template does (@standard-profile).
  @standard-profile
  Scenario: Content editor cannot reach the product add form by default
    Given I am a logged in user with the "Content editor" user
    Then I should be denied access to "/node/add/product"

  @standard-profile
  Scenario: Content editor cannot reach the release add form by default
    Given I am a logged in user with the "Content editor" user
    Then I should be denied access to "/node/add/release"

  Scenario: Content editor can reach the content admin listing
    Given I am a logged in user with the "Content editor" user
    Then I should be allowed access to "/admin/content"

  Scenario: Content editor cannot reach the product content-type settings
    Given I am a logged in user with the "Content editor" user
    Then I should be denied access to "/admin/structure/types/manage/product"

  # ── Authenticated user ─────────────────────────────────────────────────

  Scenario: Authenticated user cannot reach the product add form
    Given I am a logged in user with the "Authenticated user" user
    Then I should be denied access to "/node/add/product"

  Scenario: Authenticated user cannot reach the release add form
    Given I am a logged in user with the "Authenticated user" user
    Then I should be denied access to "/node/add/release"

  Scenario: Authenticated user cannot reach the content admin listing
    Given I am a logged in user with the "Authenticated user" user
    Then I should be denied access to "/admin/content"

  Scenario: Authenticated user can browse the products listing
    Given I am a logged in user with the "Authenticated user" user
    When I navigate to "/products"
    Then I should see "Products"

  # ── Anonymous user ─────────────────────────────────────────────────────

  Scenario: Anonymous user cannot reach the product add form
    Given I am an anonymous user
    Then I should be denied access to "/node/add/product"

  Scenario: Anonymous user cannot reach the release add form
    Given I am an anonymous user
    Then I should be denied access to "/node/add/release"

  Scenario: Anonymous user cannot reach the content admin listing
    Given I am an anonymous user
    Then I should be denied access to "/admin/content"

  Scenario: Anonymous user can browse the products listing
    Given I am an anonymous user
    When I navigate to "/products"
    Then I should see "Products"

  Scenario: Anonymous user can view a published product at its path alias
    Given I am a logged in user with the "Webmaster" user
    When I navigate to "/node/add/product"
     And I fill in "Andromeda" for "Title"
     And I save the content
    Then I should see "has been created"
    When the API base URL is "/"
     And I send a GET request to "/products/andromeda"
    Then the API response code should be 200
     And the API response should contain "Andromeda"

  Scenario: Anonymous user can view a published release on the product's releases page
    Given I am a logged in user with the "Webmaster" user
    When I navigate to "/node/add/product"
     And I fill in "Orion" for "Title"
     And I save the content
    Then I should see "has been created"
    When I navigate to "/node/add/release"
     And I fill in "1.0.0" for "Release tag"
     And I select "Orion" from the "Product" autocomplete
     And I save the content
    Then I should see "has been created"
    When the API base URL is "/"
     And I send a GET request to "/products/orion/releases"
    Then the API response code should be 200
     And the API response should contain "Releases"
     And the API response should contain "1.0.0"
