namespace :load do
  task :defaults do
    set :wordpress_wpcfm, false
  end
end

namespace :wpcli do
  task :dbexport do
    on roles(:db) do
      if test " [ -f #{current_path}/#{fetch(:app_webroot, 'public')}/wp-config.php ]"
        unless test " [ -f #{release_path}/db.sql ]"
          within "#{release_path}/#{fetch(:app_webroot, 'public')}" do
            execute :wp, "db export", "#{release_path}/db.sql"
          end
          
          within "#{release_path}/#{fetch(:app_webroot, 'public')}" do
            execute :gzip, "#{release_path}/db.sql"
          end
        end
      end
    end
  end
  
  namespace :wpcfm do
    desc "Pull all configuration"
    task :pull do
      on roles(:db) do
        within "#{release_path}/#{fetch(:app_webroot, 'public')}" do
          execute :wp, "config", "pull all"
        end
      end
    end
  end
  
  task :update do
    if fetch(:wordpress_wpcfm)
      invoke "wpcli:wpcfm:pull"
    end
  end
end
