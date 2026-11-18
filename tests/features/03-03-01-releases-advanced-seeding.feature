Feature: Advanced Web Releases — sample products and releases
  As a tester
  I want to seed sample products and releases to verify the full module flow
  So that I can verify both products listing and product release pages end-to-end

  The default recipe ships no sample content: each scenario seeds its own
  products and releases, and they are deleted after the scenario
  (tests/README.md), so the seeding scenarios can run again on the same site.

  Background:
    Given I am a logged in user with the "Webmaster" user

  Scenario: Seeded products show on the products listing page
    Given the product "Quasar" has 3 releases
     And the product "Pulsar" has 2 releases
    When I navigate to "/products"
    Then I should see "Products"
     And I should see "Quasar"
     And I should see "Pulsar"

  Scenario: Each seeded product has a dedicated releases page
    Given the product "Vega" has 3 releases
    When I navigate to "/products/vega/releases"
    Then I should see "Releases"
     And I should see 3 ".node--type-release" elements
     And I should see "Vega 1.0.0"

  Scenario: A product without releases still has a reachable releases page
    Given the product "Nebula" has 0 releases
    When I navigate to "/products/nebula/releases"
    Then I should see "Releases"

  Scenario: Releases page paginates after 9 items
    Given the product "Comet" has 10 releases
    When I navigate to "/products/comet/releases"
    Then I should see 9 ".node--type-release" elements
     And I should see "Next"
    When I navigate to "/products/comet/releases?page=1"
    Then I should see 1 ".node--type-release" elements
    # The pager heading follows the h2 of the releases, on the releases page
    # and on the product page.
    When I log out
     And I navigate to "/products/comet/releases"
    Then the heading hierarchy should be valid
    When I navigate to "/products/comet"
    Then I should see "Next"
     And the heading hierarchy should be valid

  # The lists start their headings at h2, under the h1 of the page: the
  # products page, the releases page of a product and the releases on the
  # product page.
  Scenario: Anonymous user can browse seeded products and releases
    Given the product "Stellar" has 4 releases
    When I log out
     And I navigate to "/products"
    Then I should see "Stellar"
     And the heading hierarchy should be valid
    When I navigate to "/products/stellar/releases"
    Then I should see "Releases"
     And I should see 4 ".node--type-release" elements
     And the heading hierarchy should be valid
    When I navigate to "/products/stellar"
    Then I should see 4 ".node--type-release" elements
     And the heading hierarchy should be valid
