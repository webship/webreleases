Feature: Product content type
  As an admin user
  I want to create and view Product content
  So that I can describe the products that have releases

  Background:
    Given I am logged in as admin

  Scenario: Admin can access the product add form
    When I navigate to "/node/add/product"
    Then I should see "Create Product"
     And I should see a "Title" field
     And I should see the button "Save"

  Scenario: Admin can create a product
    When I navigate to "/node/add/product"
     And I fill in "Acme" for "Title"
     And I press "Save"
    Then I should see "has been created"
     And I should see "Acme"

  Scenario: A created product is reachable at its products path
    When I navigate to "/node/add/product"
     And I fill in "Falcon" for "Title"
     And I press "Save"
    Then I should see "has been created"
    When I navigate to "/products/falcon"
    Then I should see "Falcon"
