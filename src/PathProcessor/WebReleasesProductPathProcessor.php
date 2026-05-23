<?php

declare(strict_types=1);

namespace Drupal\webreleases\PathProcessor;

use Drupal\Core\Database\Connection;
use Drupal\Core\PathProcessor\InboundPathProcessorInterface;
use Drupal\path_alias\AliasManagerInterface;
use Symfony\Component\HttpFoundation\Request;

/**
 * Rewrites /products/<product slug>/releases to /products/<nid>/releases.
 *
 * The releases view's path is `products/%/releases` with a numeric
 * `field_product.target_id` contextual filter. Editors expect to visit
 * the releases page by the product's pretty URL (e.g.
 * `/products/drupal-cms/releases`, `/products/webship-js/releases`,
 * `/products/webship_js/releases`). This processor resolves whatever
 * <slug> they used to the product's node ID before routing runs, so the
 * one view can serve dashed, underscored, and space-to-dash titles
 * without depending on Views' string contextual filter quirks.
 *
 * Resolution order, all case-insensitive:
 *   1. Path alias lookup: `/products/<slug>` → `/node/<nid>`.
 *   2. Exact product title match.
 *   3. Product title with "-" or "_" treated as " ".
 *
 * If no product matches the request passes through unchanged and Drupal
 * returns the view's "no result" page.
 */
final class WebReleasesProductPathProcessor implements InboundPathProcessorInterface {

  public function __construct(
    private readonly AliasManagerInterface $aliasManager,
    private readonly Connection $database,
  ) {}

  /**
   * {@inheritdoc}
   */
  public function processInbound($path, Request $request): string {
    if (!preg_match('#^/products/([^/]+)/releases$#', $path, $match)) {
      return $path;
    }
    $slug = $match[1];
    // Already a numeric NID — leave the request alone.
    if (ctype_digit($slug)) {
      return $path;
    }

    // 1. Path alias resolution.
    $resolved = $this->aliasManager->getPathByAlias('/products/' . $slug);
    if (preg_match('#^/node/(\d+)$#', $resolved, $nm)) {
      return '/products/' . $nm[1] . '/releases';
    }

    // 2 + 3. Fall back to title lookup (exact, then dash/underscore→space).
    $variants = array_unique([
      $slug,
      str_replace(['-', '_'], ' ', $slug),
    ]);
    $nid = $this->database->select('node_field_data', 'n')
      ->fields('n', ['nid'])
      ->condition('n.type', 'product')
      ->condition('n.title', $variants, 'IN')
      ->range(0, 1)
      ->execute()
      ->fetchField();
    if ($nid) {
      return '/products/' . $nid . '/releases';
    }
    return $path;
  }

}
