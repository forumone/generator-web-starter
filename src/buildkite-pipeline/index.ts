import assert from 'assert-plus';
import Generator from 'yeoman-generator';

interface BranchMapping {
  readonly remoteTarget: string;
}

class BuildkitePipeline extends Generator {
  async configuring() {
    const projectName = this.config.get('projectName');
    assert.string(projectName, 'config.projectName');

    const deployBranches: Record<string, BranchMapping> =
      this.config.get('deployBranches') || {};

    assert.object(deployBranches, 'config.deployBranches');

    while (true) {
      const { branch } = await this.prompt([
        {
          type: 'input',
          name: 'branch',
          message: 'Name of branch (blank to finish):',
          validate: value => value === '' || value.match(/^\S+$/),
        },
      ]);

      if (!branch) {
        break;
      }

      const values = await this.prompt([
        {
          type: 'input',
          name: 'remoteTarget',
          message: 'Remote branch or Capistrano target:',
          validate: value => value !== '',
        },
      ]);

      deployBranches[branch] = values as BranchMapping;
    }

    this.config.set('deployBranches', deployBranches);
  }

  writing() {
    const branches = this.config.get('deployBranches');
    if (!branches) {
      return;
    }

    const templateData = {
      capistrano: true,
      deployBranches: branches,
    };

    this.fs.copyTpl(
      this.templatePath('pipeline.yml.ejs'),
      this.destinationPath('.buildkite/pipeline.yml'),
      templateData,
    );
  }
}

export = BuildkitePipeline;
