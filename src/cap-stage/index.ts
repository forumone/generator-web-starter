import assert from 'assert-plus';
import { posix } from 'path';
import validFilename from 'valid-filename';
import Generator from 'yeoman-generator';

interface StageDefinition {
  readonly url: string;
  readonly deployPath: string;
  readonly branch: string;
  readonly role: string;
}

class CapStage extends Generator {
  public constructor(
    args: string | string[],
    opts: Generator.GeneratorOptions,
  ) {
    super(args, opts);

    this.option('uninteractive', {
      type: Boolean,
      description: 'Prevent all prompts and use saved answers.',
      default: false,
    });
  }

  async configuring() {
    const projectName = this.config.get('projectName');
    assert.string(projectName, 'config.projectName');

    const stages: Record<string, StageDefinition> =
      this.config.get('stages') || {};

    assert.object(stages, 'config.stages');

    if (!this.options.uninteractive) {
      this.debug('Interactively prompting for stage configuration.');
      while (true) {
        const { stage } = await this.prompt([
          {
            type: 'input',
            name: 'stage',
            message: 'Name of stage (blank to finish):',
            validate: value => value === '' || validFilename(value),
          },
        ]);

        if (!stage) {
          break;
        }

        const values = await this.prompt([
          {
            type: 'input',
            name: 'url',
            message: 'Site URL:',
            validate: value => value !== '',
          },
          {
            type: 'input',
            name: 'deployPath',
            message: 'Path to deploy to on the server:',
            default: posix.join('/var/www/vhosts', `${projectName}.${stage}`),
            validate: value => value !== '',
          },
          {
            type: 'input',
            name: 'branch',
            message: 'Git branch to deploy:',
            default: 'master',
            validate: value => value !== '',
          },
          {
            type: 'input',
            name: 'role',
            message: 'Role name (user@host):',
            validate: value => value !== '',
          },
        ]);

        stages[stage] = values as StageDefinition;
      }
      this.config.set('stages', stages);
    } else {
      this.debug('Assuming uninteractive stage configuration:\n%O');
    }
  }

  writing() {
    const stages = this.config.get('stages');
    if (!stages) {
      return;
    }

    for (const [name, stage] of Object.entries<StageDefinition>(stages)) {
      const data = {
        stage_name: name,
        site_url: stage.url,
        deploy_path: stage.deployPath,
        app_role: stage.role,
        web_role: stage.role,
        db_role: stage.role,
        branch: stage.branch,
      };

      this.fs.copyTpl(
        this.templatePath('stage.rb.ejs'),
        this.destinationPath('capistrano/deploy', `${name}.rb`),
        data,
      );
    }
  }
}

export = CapStage;
