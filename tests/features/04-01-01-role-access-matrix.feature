Feature: Web Releases access matrix across Standard profile roles
  As a site administrator
  I want to verify product and release access for every default role
  So that I know who can and cannot create or view products and releases

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
    When I navigate to "/admin/content"
    Then I should see "Content"
     And I should see "Add content"

  Scenario: Webmaster can reach the product content-type settings
    Given I am a logged in user with the "Webmaster" user
    When I navigate to "/admin/structure/types/manage/product"
    Then I should see "Product"

  Scenario: Webmaster can reach the release content-type settings
    Given I am a logged in user with the "Webmaster" user
    When I navigate to "/admin/structure/types/manage/release"
    Then I should see "Release"

  # ── Content editor ──────────────────────────────────────────────────────

  Scenario: Content editor cannot reach the product add form by default
    Given I am a logged in user with the "Content editor" user
    When I navigate to "/node/add/product"
    Then I should see "Access denied"

  Scenario: Content editor cannot reach the release add form by default
    Given I am a logged in user with the "Content editor" user
    When I navigate to "/node/add/release"
    Then I should see "Access denied"

  Scenario: Content editor can reach the content admin listing
    Given I am a logged in user with the "Content editor" user
    When I navigate to "/admin/content"
    Then I should see "Content"

  Scenario: Content editor cannot reach the product content-type settings
    Given I am a logged in user with the "Content editor" user
    When I navigate to "/admin/structure/types/manage/product"
    Then I should see "Access denied"

  # ── Authenticated user ─────────────────────────────────────────────────

  Scenario: Authenticated user cannot reach the product add form
    Given I am a logged in user with the "Authenticated user" user
    When I navigate to "/node/add/product"
    Then I should see "Access denied"

  Scenario: Authenticated user cannot reach the release add form
    Given I am a logged in user with the "Authenticated user" user
    When I navigate to "/node/add/release"
    Then I should see "Access denied"

  Scenario: Authenticated user cannot reach the content admin listing
    Given I am a logged in user with the "Authenticated user" user
    When I navigate to "/admin/content"
    Then I should see "Access denied"

  Scenario: Authenticated user can browse the products listing
    Given I am a logged in user with the "Authenticated user" user
    When I navigate to "/products"
    Then I should see "Products"

  # ── Anonymous user ─────────────────────────────────────────────────────

  Scenario: Anonymous user cannot reach the product add form
    Given I am an anonymous user
    When I navigate to "/node/add/product"
    Then I should see "Access denied"

  Scenario: Anonymous user cannot reach the release add form
    Given I am an anonymous user
    When I navigate to "/node/add/release"
    Then I should see "Access denied"

  Scenario: Anonymous user cannot reach the content admin listing
    Given I am an anonymous user
    When I navigate to "/admin/content"
    Then I should see "Access denied"

  Scenario: Anonymous user can browse the products listing
    Given I am an anonymous user
    When I navigate to "/products"
    Then I should see "Products"

  Scenario: Anonymous user can view a published product at its path alias
    Given I am a logged in user with the "Webmaster" user
    When I navigate to "/node/add/product"
     And I fill in "Andromeda" for "Title"
     And I press "Save"
    Then I should see "has been created"
    Given I am an anonymous user
    When I navigate to "/products/andromeda"
    Then I should see "Andromeda"

  Scenario: Anonymous user can view a published release on the product's releases page
    Given I am a logged in user with the "Webmaster" user
    When I navigate to "/node/add/product"
     And I fill in "Orion" for "Title"
     And I press "Save"
    Then I should see "has been created"
    When I navigate to "/node/add/release"
     And I fill in "1.0.0" for "Release tag"
     And I select "Orion" from the "Product" autocomplete
     And I press "Save"
    Then I should see "has been created"
    Given I am an anonymous user
    When I navigate to "/products/orion/releases"
    Then I should see "Releases"
     And I should see "Orion 1.0.0"
