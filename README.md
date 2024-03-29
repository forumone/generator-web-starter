*Note: at the time of this writing Forum One has switched to DDev for local development.  This repo is no longer being used or maintained and you should reference either https://github.com/forumone/drupal-project or https://github.com/forumone/wordpress-project to start a new project.*

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

## Enhancing this project / Setup instructions

- Clone repository
- `npm ci` - install dependencies
- Perform changes
- `npm pack` - Create a tarball for testing purposes
- `npx -p <path to generator.tgz> -p yo -- yo web-starter`  - Execute web starter with the modifications you just made
- Review input / output after making selections that you're testing for and ensure changes are captured

## Debugging

To support easier debugging, verbose logging may be enabled during execution using the [logging mechanism built into
Yeoman](https://yeoman.io/authoring/debugging.html) by default. Logging for any specified generator may be done by
setting various values into the `DEBUG` environment variable before execution.

For all logging:
```bash
export DEBUG=\*
```

For more targeted debugging within a given generator or sub-generator other values may be set including:

* Everything: `DEBUG=\*`
* Yeoman generator flow: `DEBUG='yeoman:generator'`
* Main app generator: `DEBUG='web-starter:app'`
* All Web Starter sub-generators: `DEBUG='web-starter:*'`
