<?php
$options['structure-tables']['common'] = array(
  'accesslog',
  'cache',
  'cache_*',
  'ctools_css_cache',
  'ctools_object_cache',
  'history',
  'sessions',
  'watchdog',
  'search_index',
  'search_dataset',
  'search_node_links',
  'search_total',
);
$options['command-specific']['sql-dump'] = array(
  'structure-tables-key' => 'common',
);
