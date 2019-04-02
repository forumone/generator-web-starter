import { Dockerfile } from 'dockerfilejs';

function createGessoDockerfile(nodeImageTag: string): Dockerfile {
  return new Dockerfile()
    .from({ image: 'node', tag: nodeImageTag })
    .workdir('/app')
    .comment('Install Grunt globally')
    .run('npm i -g grunt-cli')
    .comment('Copy package.json and install dependencies')
    .copy({ src: 'package.json', dest: './' })
    .run('npm install')
    .comment('Copy Gruntfile and tasks')
    .copy({ src: 'Gruntfile.js', dest: './' })
    .copy({ src: 'tasks', dest: './tasks' })
    .comment('By default, build Gesso')
    .cmd({ executable: 'grunt', params: ['gessoBuildStyles'] });
}

export default createGessoDockerfile;
