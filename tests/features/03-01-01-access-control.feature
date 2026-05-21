Feature: Access Control
  As a site administrator
  I want proper access control on Web Releases pages
  So that only authorized users can create products and releases

  Scenario: Anonymous user cannot access the product add form
    Given I am an anonymous user
    When I navigate to "/node/add/product"
    Then I should see "Access denied"

  Scenario: Anonymous user cannot access the release add form
    Given I am an anonymous user
    When I navigate to "/node/add/release"
    Then I should see "Access denied"

  Scenario: Anonymous user cannot access the content admin page
    Given I am an anonymous user
    When I navigate to "/admin/content"
    Then I should see "Access denied"

  Scenario: Admin user can access the content admin page
    Given I am logged in as admin
    When I navigate to "/admin/content"
    Then I should see "Content"
     And I should see "Add content"

  Scenario: Anonymous user can access a product releases page
    Given I am an anonymous user
    When I navigate to "/products/any/releases"
    Then I should see "Releases"
