Feature: Product and release fields on the Web Releases pages
  As a visitor
  I want product and release pages to show their fields
  So that I can see the product image, its releases, and each release version and date

  Background:
    Given I am a logged in user with the "Webmaster" user

  Scenario: A product page shows its image and its releases
    Given the product "Andromeda" with an image has the following releases:
      | 2.0.0 | 2026-01-15 |
      | 2.1.0 | 2026-06-01 |
    When I navigate to "/products/andromeda"
    Then I should see "Andromeda"
     And I should see an image with the "wide" image style
     And I should see 2 ".node--type-release" elements
     And I should see "2.0.0"
     And I should see "2.1.0"
     And I should see "June 1, 2026"
     And ".node--type-release a[href$='/products/andromeda']" should have a count of 0

  Scenario: A release page shows its version once and its release date
    Given the product "Cassiopeia" with an image has the following releases:
      | 3.0.0 | 2026-03-15 |
    When I navigate to "/products/cassiopeia/releases/300"
    Then "h1" should contain text "3.0.0"
     And ".node--type-release h2" should have a count of 0
     And I should see "March 15, 2026"
     And I should see "Cassiopeia"

  Scenario: The releases page of a product lists its releases and the release breadcrumb links to it
    Given the product "Pegasus" with an image has the following releases:
      | 5.0.0 | 2026-04-01 |
      | 5.1.0 | 2026-08-01 |
    When I navigate to "/products/pegasus/releases"
    Then I should see "5.0.0"
     And I should see "5.1.0"
    When I navigate to "/products/pegasus/releases/510"
    Then "a[href$='/products/pegasus/releases']" should be visible

  Scenario: The products listing shows the product image
    Given the product "Lyra" with an image has the following releases:
      | 4.0.0 | 2026-02-01 |
    When I log out
     And I navigate to "/products"
    Then I should see "Lyra"
     And I should see an image with the "medium" image style
