Feature: Advanced Web Releases — sample products and releases
  As a tester
  I want to seed sample products and releases to verify the full module flow
  So that I can verify both products listing and product release pages end-to-end

  # The default recipe no longer ships sample content. Each scenario below
  # seeds its own products and releases through the step definitions so the
  # tests stay deterministic and idempotent.

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

  Scenario: Anonymous user can browse seeded products and releases
    Given the product "Stellar" has 4 releases
    When I log out
     And I navigate to "/products"
    Then I should see "Stellar"
    When I navigate to "/products/stellar/releases"
    Then I should see "Releases"
     And I should see 4 ".node--type-release" elements
