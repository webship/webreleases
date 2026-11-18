<?php

/**
 * @file
 * Post update functions for Web Releases.
 */

declare(strict_types=1);

use Drupal\Core\Entity\Display\EntityViewDisplayInterface;

/**
 * Print the titles and the pager headings of the lists as h2, under the h1.
 *
 * The products page, the releases page of a product and the releases on a
 * product page printed the titles of their items as h3, right after the h1
 * of the page, and their pager heading as an h4. The teaser and product
 * release displays that still print the title as an h3, and the pagers of
 * the products and releases views that still have an h4 heading, get an h2.
 */
function webreleases_post_update_list_title_heading(): void {
  $storage = \Drupal::entityTypeManager()->getStorage('entity_view_display');
  foreach (['node.product.teaser', 'node.release.teaser', 'node.release.product_release'] as $id) {
    $display = $storage->load($id);
    if (!$display instanceof EntityViewDisplayInterface) {
      continue;
    }
    $changed = FALSE;
    $component = $display->getComponent('title');
    if (($component['type'] ?? NULL) === 'title' && ($component['settings']['tag'] ?? NULL) === 'h3') {
      $component['settings']['tag'] = 'h2';
      $display->setComponent('title', $component);
      $changed = TRUE;
    }
    $sources = $display->getThirdPartySetting('display_builder', 'sources');
    if (\is_array($sources) && _webreleases_title_heading_h2($sources, 'field_formatter:node:' . $display->getTargetBundle() . ':title')) {
      $display->setThirdPartySetting('display_builder', 'sources', $sources);
      $changed = TRUE;
    }
    if ($changed) {
      // Saved as a configuration import: Display Builder makes the new sources
      // the present state of the builder too.
      $display->setSyncing(TRUE)->save();
    }
  }

  $view_storage = \Drupal::entityTypeManager()->getStorage('view');
  $pagers = [
    'products' => ['default'],
    'releases' => ['releases_block', 'releases_page'],
  ];
  foreach ($pagers as $view_id => $display_ids) {
    $view = $view_storage->load($view_id);
    if (!$view) {
      continue;
    }
    $displays = $view->get('display');
    $changed = FALSE;
    foreach ($display_ids as $display_id) {
      $pager = $displays[$display_id]['display_options']['pager'] ?? NULL;
      if (($pager['type'] ?? NULL) === 'full' && ($pager['options']['pagination_heading_level'] ?? 'h4') === 'h4') {
        $displays[$display_id]['display_options']['pager']['options']['pagination_heading_level'] = 'h2';
        $changed = TRUE;
      }
    }
    if ($changed) {
      $view->set('display', $displays)->save();
    }
  }
}

/**
 * Turns the title formatter sources that print an h3 into h2.
 *
 * @param array $data
 *   Display Builder sources, changed in place, at any depth.
 * @param string $source_id
 *   The source ID of the title formatter, like
 *   field_formatter:node:product:title.
 *
 * @return bool
 *   TRUE when a source changed.
 */
function _webreleases_title_heading_h2(array &$data, string $source_id): bool {
  $changed = FALSE;
  if (($data['source_id'] ?? NULL) === $source_id && ($data['source']['type'] ?? NULL) === 'title' && ($data['source']['settings']['tag'] ?? NULL) === 'h3') {
    $data['source']['settings']['tag'] = 'h2';
    $changed = TRUE;
  }
  foreach ($data as &$value) {
    if (\is_array($value) && _webreleases_title_heading_h2($value, $source_id)) {
      $changed = TRUE;
    }
  }
  unset($value);
  return $changed;
}
