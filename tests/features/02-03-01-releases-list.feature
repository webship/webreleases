Feature: Releases listing for multiple products
  As a site visitor
  I want each product's releases page to list all of its releases
  So that I can browse a full, paginated set of releases per product

  Scenario Outline: A product releases page lists its seeded releases
    Given the product "<product>" has <count> releases
    When I navigate to "/products/<slug>/releases"
    Then I should see "Releases"
     And I should see 9 ".node--type-release" elements
     And I should see "<product> release"
     And I should see "Next"

    Examples:
      | product | slug    | count |
      | Alpha   | alpha   | 10    |
      | Bravo   | bravo   | 12    |
      | Charlie | charlie | 16    |
      | Delta   | delta   | 20    |

  Scenario: The releases list paginates beyond the first page
    Given the product "Echo" has 14 releases
    When I navigate to "/products/echo/releases"
    Then I should see "Releases"
     And I should see 9 ".node--type-release" elements
     And I should see "Next"
    When I navigate to "/products/echo/releases?page=1"
    Then I should see 5 ".node--type-release" elements
     And I should see "Echo release"
