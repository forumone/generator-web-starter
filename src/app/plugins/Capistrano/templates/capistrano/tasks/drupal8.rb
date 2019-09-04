# Use version of Drush supplied via Composer
SSHKit.config.command_map[:drush] = "./services/drupal/vendor/drush/drush/drush"

# Revert the database when a rollback occurs
Rake::Task["deploy:rollback_release_path"].enhance do
  invoke "drupal8:revert_database"
end

# Backup the database when publishing a new release
Rake::Task["deploy:published"].enhance ["drupal8:dbbackup"]

# Copy drush aliases after linking the new release
Rake::Task["deploy:symlink:release"].enhance ["drush:initialize"]

# After publication run updates
Rake::Task["deploy:published"].enhance do
  Rake::Task["drush9:custom:update"].invoke
end

namespace :drupal8 do
  desc "Install Drupal"
  task :install do
    invoke 'drush:siteinstall'
  end

  desc "Copy Drupal and web server configuration files"
  task :settings do
    on roles(:app) do
      webroot = "#{current_path}/#{fetch(:app_webroot, 'public')}"
      drupal_root = "#{webroot}"

      fetch(:site_folder).each do |folder|
        site_root = "#{drupal_root}/sites/#{folder}"

        # Link environment-specific settings.php file into place if it exists
        if test "[ -e #{site_root}/settings.#{fetch(:stage)}.php ]"
          # Remove old settings.php file
          if test "[ -e #{site_root}/settings.php ]"
            execute :rm, "-f", "#{site_root}/settings.php"
          end
          # Link (new) environment-specific settings.php file
          execute :ln, "-s", "#{site_root}/settings.#{fetch(:stage)}.php", "#{site_root}/settings.php"
        end

        # Set permissions on settings files so Drupal doesn't complain.
        # The permission values are set in lib/capistrano/tasks/drush.rake.
        if test "[ -f #{site_root}/settings.#{fetch(:stage)}.php ]"
          execute :chmod, fetch(:settings_file_perms), "#{site_root}/settings.#{fetch(:stage)}.php"
        elsif test "[ -f #{site_root}/settings.php ]"
          execute :chmod, fetch(:settings_file_perms), "#{site_root}/settings.php"
        end

        # Link environment-specific services.yml file into place if it exists
        if test "[ -e #{site_root}/services.#{fetch(:stage)}.yml ]"
          # Remove old services.yml file
          if test "[ -e #{site_root}/services.yml ]"
            execute :rm, "-f", "#{site_root}/services.yml"
          end
          # Link (new) environment-specific services.yml file
          execute :ln, "-s", "#{site_root}/services.#{fetch(:stage)}.yml", "#{site_root}/services.yml"
        end

        # Set permissions on services files so Drupal doesn't complain.
        # The permission values are set in lib/capistrano/tasks/drush.rake.
        if test "[ -f #{site_root}/services.#{fetch(:stage)}.yml ]"
          execute :chmod, fetch(:settings_file_perms), "#{site_root}/services.#{fetch(:stage)}.yml"
        elsif test "[ -f #{site_root}/services.yml ]"
          execute :chmod, fetch(:settings_file_perms), "#{site_root}/services.yml"
        end

        # Set permissions on the site directory so Drupal doesn't complain.
        # The permission values are set in lib/capistrano/tasks/drush.rake.
        execute :chmod, fetch(:site_directory_perms), "#{site_root}"
      end

      # Symlink the stage-specific .htaccess file if one exists
      if test " [ -f #{webroot}/htaccess.#{fetch(:stage)} ]"
        # Remove the existing .htaccess file if one exists
        if test " [ -f #{webroot}/.htaccess ]"
          execute :rm, "#{webroot}/.htaccess"
        end

        execute :ln, "-s", "#{webroot}/htaccess.#{fetch(:stage)}", "#{webroot}/.htaccess"
      end

      # Symlink the stage-specific robots.txt file if one exists
      if test " [ -f #{webroot}/robots.#{fetch(:stage)}.txt ]"
        # Remove the existing robots.txt file if one exists
        if test " [ -f #{webroot}/robots.txt ]"
          execute :rm, "#{webroot}/robots.txt"
        end

        execute :ln, "-s", "#{webroot}/robots.#{fetch(:stage)}.txt", "#{webroot}/robots.txt"
      end
    end
  end

  desc "Revert the database"
  task :revert_database do
    on roles(:db) do
      last_release = capture(:ls, "-xr", releases_path).split.first
      last_release_path = releases_path.join(last_release)

      within "#{last_release_path}" do
        execute :gunzip, "#{last_release_path}/db.sql.gz"
        invoke "drush9:revertdb"
      end
    end
  end

  desc "Backup the database"
  task :dbbackup do
    invoke "drush9:sqldump"
  end
end
