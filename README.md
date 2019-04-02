# generator-web-starter

The Web Starter Kit is a [Yeoman](http://yeoman.io/) generator developed and maintained by [Forum One](http://forumone.com/). It allows you to:

1. Create a container-based project using [Docker Compose](https://docs.docker.com/compose/overview/) or a React SPA using [Webpack](https://webpack.js.org/).
2. Automatically install Drupal, WordPress, and [Gesso](https://github.com/forumone/gesso/).
3. Add deployment utilities like Capistrano.

## Installing

As of `generator-web-starter` 2.0, we no longer recommend installing the generator directly. Instead, install [`forumone-cli`](https://www.npmjs.com/package/forumone-cli), which ensures that the generator is always up to date.

## Using `generator-web-starter`
The command `f1 new` can be used to generate a new project in a freshly-created directory, and `f1 init` can be used to create a project in an existing directory.

After installing, navigate to the directory that will contain the new project and run:

```sh
f1 init
```

## One-off runs with `npx`

This command will temporarily install [`yo`](https://www.npmjs.com/package/yo) - the Yeoman CLI - and `generator-web-starter` to start a project. It can be used in situations where installation of `forumone-cli` is not desired:

```sh
npx --ignore-existing -p yo -p generator-web-starter yo web-starter
```