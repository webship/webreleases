Feature: Releases view page
  As a site visitor
  I want to see the releases listed for a product
  So that I can browse a product's releases

  Every product and release a scenario creates is deleted after the
  scenario (tests/README.md), so the suite can run again on the same site.

  Scenario: The releases page lists a product's releases
    Given I am a logged in user with the "Webmaster" user
    When I navigate to "/node/add/product"
     And I fill in "Webship" for "Title"
     And I save the content
    Then I should see "has been created"
    When I navigate to "/node/add/release"
     And I fill in "1.0.0" for "Release tag"
     And I select "Webship" from the "Product" autocomplete
     And I save the content
    Then I should see "has been created"
    When I navigate to "/products/webship/releases"
    Then I should see "Releases"
     And I should see "Webship 1.0.0"

  Scenario: The releases page is reachable for a product
    Given I am a logged in user with the "Webmaster" user
    When I navigate to "/node/add/product"
     And I fill in "Hawk" for "Title"
     And I save the content
    Then I should see "has been created"
    When I navigate to "/products/hawk/releases"
    Then I should see "Releases"
