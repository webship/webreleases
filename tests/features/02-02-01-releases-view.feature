Feature: Releases view page
  As a site visitor
  I want to see the releases listed for a product
  So that I can browse a product's releases

  Scenario: The releases page lists a product's releases
    Given I am logged in as admin
    When I navigate to "/node/add/product"
     And I fill in "Webship" for "Title"
     And I press "Save"
    Then I should see "has been created"
    When I navigate to "/node/add/release"
     And I fill in "Webship Edge" for "Release tag"
     And I select "Webship" from the "Product" autocomplete
     And I press "Save"
    Then I should see "has been created"
    When I navigate to "/products/webship/releases"
    Then I should see "Releases"
     And I should see "Webship Edge"

  Scenario: The releases page is reachable for a product
    Given I am logged in as admin
    When I navigate to "/node/add/product"
     And I fill in "Hawk" for "Title"
     And I press "Save"
    Then I should see "has been created"
    When I navigate to "/products/hawk/releases"
    Then I should see "Releases"
