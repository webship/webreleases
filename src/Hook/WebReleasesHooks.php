<?php

declare(strict_types=1);

namespace Drupal\webreleases\Hook;

use Drupal\Component\Utility\Html;
use Drupal\Core\Entity\Display\EntityViewDisplayInterface;
use Drupal\Core\Hook\Attribute\Hook;
use Drupal\Core\Render\Element;
use Drupal\node\NodeInterface;

/**
 * Hook implementations for the Web Releases module.
 */
class WebReleasesHooks {

  /**
   * The bundles provided by Web Releases.
   */
  private const BUNDLES = ['product', 'release'];

  /**
   * Implements hook_ENTITY_TYPE_view_alter() for node entities.
   *
   * Display Builder renders the product and release displays without the node
   * template. Keep the node classes on its wrapper, so themes and listings can
   * still target them, and keep the sources apart as separate lines.
   */
  #[Hook('node_view_alter')]
  public function nodeViewAlter(
    array &$build,
    NodeInterface $node,
    EntityViewDisplayInterface $display,
  ): void {
    if (empty($build['#display_builder_entity_view'])) {
      return;
    }
    if (!\in_array($node->bundle(), self::BUNDLES, TRUE)) {
      return;
    }

    $view_mode = (string) ($build['#view_mode'] ?? $display->getMode());
    $build['#attributes']['class'][] = 'node';
    $build['#attributes']['class'][] = 'node--type-'
      . Html::getClass($node->bundle());
    $build['#attributes']['class'][] = 'node--view-mode-'
      . Html::getClass($view_mode);

    if (!isset($build['content']) || !\is_array($build['content'])) {
      return;
    }
    foreach (Element::children($build['content']) as $key) {
      $suffix = $build['content'][$key]['#suffix'] ?? '';
      $build['content'][$key]['#suffix'] = $suffix . "\n";
    }
  }

}
