# generator-web-starter

The ```Web Starter Kit``` is a [yeoman](http://yeoman.io/) generator developed and maintained by [Forum One](http://forumone.com/). It allows you to:

1. Create a container-based project using [Docker Compose](https://docs.docker.com/compose/overview/) or a React SPA using [Webpack](https://webpack.js.org/).
2. Automatically install Drupal, WordPress, and [Gesso](https://github.com/forumone/gesso/).
3. Add deployment utilities like Capistrano.

## Installing
1. Install the [Yeoman CLI](https://www.npmjs.com/package/yo) tool (if you don't already have it) -- note that you may need to run this as a user with elevated privileges:
  ```sh
  npm install -g yo
  ```

2. Install the generator -- note that you may need to run this as a user with elevated privileges:
  ```sh
  npm install -g generator-web-starter
  ```

To update your version of `generator-web-starter`, run:
```sh
npm install -g generator-web-starter
```

## Using `generator-web-starter`
After installing, navigate to the directory that will contain the new project and run:
```sh
yo web-starter
```
This will bring up an interactive menu for setting up your new web-starter project.

If your version of `npm` is new enough, you can use [`npx`](https://www.npmjs.com/package/npx) to run the tool instead, ensuring you always have the latest version:

```sh
npx --ignore-existing -p yo -p generator-web-starter yo web-starter
```