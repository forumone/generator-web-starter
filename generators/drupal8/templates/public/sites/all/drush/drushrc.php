<?php
$options['structure-tables']['common'] = array(
  'cache',
  'cache_*',
  'history',
  'search_*',
  'sessions',
  'watchdog',
);
$options['command-specific']['sql-dump'] = array(
  'structure-tables-key' => 'common',
);
