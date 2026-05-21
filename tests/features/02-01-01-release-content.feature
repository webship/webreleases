Feature: Release content type
  As an admin user
  I want to create Release content linked to a product
  So that I can publish releases for that product

  Background:
    Given I am logged in as admin

  Scenario: Admin can access the release add form
    When I navigate to "/node/add/release"
    Then I should see "Create Release"
     And I should see a "Release tag" field
     And I should see a "Product" field
     And I should see the button "Save"

  Scenario: Release requires a product
    When I navigate to "/node/add/release"
     And browser validation for the form "#node-release-form" is disabled
     And I fill in "Orphan Release" for "Release tag"
     And I press "Save"
    Then I should see "field is required"

  Scenario: Admin can create a release for a product
    When I navigate to "/node/add/product"
     And I fill in "Drupal" for "Title"
     And I press "Save"
    Then I should see "has been created"
    When I navigate to "/node/add/release"
     And I fill in "Drupal 11 Release" for "Release tag"
     And I select "Drupal" from the "Product" autocomplete
     And I press "Save"
    Then I should see "has been created"
     And I should see "Drupal 11 Release"
