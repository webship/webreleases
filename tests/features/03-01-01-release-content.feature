Feature: Release content type
  As an admin user
  I want to create Release content linked to a product
  So that I can publish releases for that product

  Every product and release a scenario creates is deleted after the
  scenario (tests/README.md), so the suite can run again on the same site.

  Background:
    Given I am a logged in user with the "Webmaster" user

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
     And I save the content
    Then I should see "has been created"
    When I navigate to "/node/add/release"
     And I fill in "11.0.0" for "Release tag"
     And I select "Drupal" from the "Product" autocomplete
     And I save the content
    Then I should see "has been created"
     And "h1" should contain text "11.0.0"
     And I should see "Drupal"
