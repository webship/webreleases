Feature: Product and release life cycle — create, edit, and view
  As an admin
  I want to exercise the full life cycle of products and releases
  So that the Web Releases module behaves correctly for editors and visitors

  Background:
    Given I am a logged in user with the "Webmaster" user

  Scenario: A product can be created, edited, and re-viewed
    When I navigate to "/node/add/product"
     And I fill in "Aurora" for "Title"
     And I press "Save"
    Then I should see "has been created"
     And I should see "Aurora"
    When I navigate to "/products/aurora"
    Then I should see "Aurora"

  Scenario: A release links to its product and renders on the product releases page
    When I navigate to "/node/add/product"
     And I fill in "Polaris" for "Title"
     And I press "Save"
    Then I should see "has been created"
    When I navigate to "/node/add/release"
     And I fill in "1.0.0" for "Release tag"
     And I select "Polaris" from the "Product" autocomplete
     And I press "Save"
    Then I should see "has been created"
     And I should see "Polaris 1.0.0"
    When I navigate to "/products/polaris/releases"
    Then I should see "Releases"
     And I should see "Polaris 1.0.0"

  Scenario: The product teaser shows on the products listing
    When I navigate to "/node/add/product"
     And I fill in "Vega" for "Title"
     And I press "Save"
    Then I should see "has been created"
    When I navigate to "/products"
    Then I should see "Vega"

  Scenario: A release without a product fails to save
    When I navigate to "/node/add/release"
     And browser validation for the form "#node-release-form" is disabled
     And I fill in "0.1.0" for "Release tag"
     And I press "Save"
    Then I should see "field is required"
