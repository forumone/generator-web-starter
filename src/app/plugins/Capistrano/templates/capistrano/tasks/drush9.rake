# A set of tasks to trigger operations with Drush 9 on the remote system during deployment
#
# Since Drush 9 will only work with Drupal 8.4+ no back support for Drupal 7 is required.
#
# Tasks:
# - :initialize: Creates a ~/.drush directory and copies aliases from the release
# - :initialize:drushdir: Creates ~/.drush/sites directory if it's missing
# - :initialize:aliases: Copies any aliases from the root checkout to the logged in user's ~/.drush directory
# - :site:install: Triggers drush site-install
# - :rsync: Copies files from a remote Drupal site, assumes ENV['source'] provided which is a drush alias
# - :cacheclear: Clears or rebuilds the Drupal cache
# - :cr: (Drupal 8) Rebuilds the entire Drupal cache
# - :update: Runs all pending updates, including DB updates, Features and Configuration -- if set to use those
# - :db:update: Runs update hooks
# - :db:revert: Drop the current database and roll back to the last database backup
# - :db:dump: Dumps the database to the current revision's file system
# - :db:sync: Copies a database from a remote Drupal site, assumes ENV['source'] provided which is a drush alias
# - :db:drop: Drops the database and all content
# - :configuration:import: (Drupal 8) Import Configuration into the database from the config management directory
# - :sapi:reindex: Clear Search API indexes and reindex each
#
# Variables:
# - :drupal_db_updates: Whether to run update hooks on deployment -- defaults to TRUE

namespace :load do
  task :defaults do
    set :drupal_db_updates, true
    set :settings_file_perms, '644'
    set :site_directory_perms, '750'
  end
end

namespace :drush9 do

  namespace :initialize do
    desc "Initializes drush directory and aliases"
    task :defaults do
      invoke 'drush9::initialize:drushdir'
      invoke 'drush9:initialize:aliases'
    end

    desc "Creates ~/.drush/sites directory if it's missing"
    task :drushdir do
      on roles(:all) do
        home = capture(:echo, '$HOME')
        unless test "[ -d #{home}/.drush/sites ]"
          execute :mkdir, "-p #{home}/.drush/sites"
        end
      end
    end

    desc "Copies any aliases from the root checkout to the logged in user's ~/.drush directory"
    task :aliases do
      on roles(:all) do
        within "#{release_path}" do
          home = capture(:echo, '$HOME')
          execute :cp, "*.site.yml", "#{home}/.drush/sites", "|| :"
        end
      end
    end
  end

  namespace :site do
    desc "Triggers drush site-install"
    task :install do
      on roles(:db) do
        command = "-y -r #{current_path}/#{fetch(:app_webroot, 'public')} site-install "

        if ENV['profile']
          command << ENV['profile']
        end

        execute :drush, command
      end
    end
  end

  desc "(Deprecated) Triggers drush sql-sync to copy databases between environments"
  task :sqlsync do
    warn "[DEPRECATION] drush9:sqlsync is deprectated. Use drush9:db:sync instead."
    invoke "drush9:db:sync"

    invoke 'drush9:update'
  end

  desc "Triggers drush rsync to copy files between environments"
  task :rsync do
    on roles(:app) do
      if ENV['path']
        path = ENV['path']
      else
        path = '%files'
      end

      if ENV['source']
        within "#{release_path}/#{fetch(:app_webroot, 'public')}" do
          execute :drush, "-y -r #{current_path}/#{fetch(:app_webroot, 'public')} -l #{fetch(:site_url)[0]} rsync #{ENV['source']}:#{path} @self:#{path} --mode=rz"
        end
      end
    end
  end

  desc "(Deprecated) Creates database backup"
  task :sqldump do
    warn "[DEPRECATION] drush9:sqldump is deprectated. Use drush9:db:dump instead."
    invoke "drush9:db:dump"
  end

  desc "(Deprecated) Runs all pending update hooks"
  task :updatedb do
    warn "[DEPRECATION] drush9:updatedb is deprectated. Use drush9:db:update instead."
    invoke "drush9:db:update"
  end

  desc "(Deprecated) Drop the current database and roll back to the last database backup"
  task :revertdb do
    warn "[DEPRECATION] drush9:revertdb is deprectated. Use drush9:db:revert instead."
    invoke "drush9:db:revert"
  end

  desc "Clears or rebuilds the Drupal caches"
  task :cacheclear do
    invoke 'drush9:cr'
  end

  desc "(Drupal 8) Rebuilds the Drupal cache"
  task :cr do
    on roles(:db) do
      within "#{release_path}/#{fetch(:app_webroot, 'public')}" do
        fetch(:site_url).each do |site|
          execute :drush, "-y -r #{current_path}/#{fetch(:app_webroot, 'public')} -l #{site}", 'cr'
        end
      end
    end
  end

  desc "Apply all updates"
  task :update do
    if fetch(:drupal_db_updates)
      invoke 'drush9:db:update'
    end

    invoke 'drush9:cacheclear'

    # Import all configuration updates
    invoke 'drush9:configuration:import'
  end

  namespace :db do
    desc "Runs all pending update hooks"
    task :update do
      if fetch(:drupal_db_updates)
        on roles(:db) do
          within "#{release_path}/#{fetch(:app_webroot, 'public')}" do
            fetch(:site_url).each do |site|
              execute :drush, "-y -r #{current_path}/#{fetch(:app_webroot, 'public')} -l #{site}", 'updatedb'
            end
          end
        end
      end
    end

    desc "Drop the current database and roll back to the last database backup"
    task :revert do
      on roles(:db) do
        within "#{release_path}" do
          invoke "drush9:db:drop"
          execute :drush, "--yes", "sql:connect < #{last_release_path}/db.sql"
        end
      end
    end

    desc "Creates database backup"
    task :dump do
      on roles(:db) do
        unless test " [ -f #{release_path}/db.sql.gz ]"
          within "#{release_path}/#{fetch(:app_webroot, 'public')}" do
            # Capture the output from drush status
            status = JSON.parse(capture(:drush, 'status --format=json'))

            # Ensure that we are connected to the database and were able to bootstrap Drupal
            if ('Connected' == status['db-status'] && 'Successful' == status['bootstrap'])
              execute :drush, "-r #{current_path}/#{fetch(:app_webroot, 'public')} -l #{fetch(:site_url)[0]} sql-dump -y --gzip --result-file=#{release_path}/db.sql"
            end
          end
        end
      end
    end

    desc "Triggers drush sql-sync to copy databases between environments"
    task :sync do
      on roles(:db) do
        if ENV['source']
          within "#{release_path}/#{fetch(:app_webroot, 'public')}" do
            execute :drush, "-r #{current_path}/#{fetch(:app_webroot, 'public')} -l #{fetch(:site_url)[0]} sql-sync #{ENV['source']} @self -y"
          end
        end
      end

      invoke 'drush9:update'
    end

    desc "Drops the database and all content"
    task :drop do
      on roles(:db) do
        within "#{release_path}" do
          execute :drush, "--yes", "sql:drop"
        end
      end
    end
  end

  namespace :configuration do
    desc "(Drupal 8) Import Configuration into the database from the config management directory"
    task :import do
      on roles(:db) do
        within "#{release_path}/#{fetch(:app_webroot, 'public')}" do
          execute :drush, "-y -r #{current_path}/#{fetch(:app_webroot, 'public')} -l #{fetch(:site_url)}", 'config-import'
        end
      end

      invoke 'drush9:cacheclear'
    end

    invoke 'drush9:cacheclear'
  end

  namespace :sapi do
    desc "Reindex Search API Indexes"
    task :reindex do
      on roles(:db) do
        within "#{release_path}/#{fetch(:app_webroot, 'public')}" do
          # For each site
          fetch(:site_url).each do |site|
            # Clear all indexes
            execute :drush, "-y -r #{current_path}/#{fetch(:app_webroot, 'public')} -l #{site}", 'sapi-c'
            if (0 != fetch(:search_indexes, []).length)
              # Re-index each defined index individually
              # Sometimes search_api hangs after running the first of multiple indexing operations
              fetch(:search_indexes).each do |index|
                execute :drush, "-y -r #{current_path}/#{fetch(:app_webroot, 'public')} -l #{site}", 'sapi-i', index
              end
            else
              # Index without arguments to run for all enabled indexes
              execute :drush, "-y -r #{current_path}/#{fetch(:app_webroot, 'public')} -l #{site}", 'sapi-i'
            end
          end
        end
      end

      invoke 'drush9:cacheclear'
    end
  end
end
