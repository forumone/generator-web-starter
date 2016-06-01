# generator-web-starter

The ```Web Starter Kit``` is a [yeoman](http://yeoman.io/) generator developed and maintained by [Forum One](http://forumone.com/). It allows you to:

1. Create a [drupal](https://github.com/forumone/generator-web-starter-drupal), [angularjs](https://github.com/forumone/generator-web-starter-angularjs) or [wordpress](https://github.com/forumone/generator-web-starter-wordpress) project.
2. Add a default theme like the [gesso theme](https://github.com/forumone/generator-web-starter-gesso/).
3. Add common preconfigure common utilities like [grunt tasks](https://github.com/forumone/generator-web-starter-grunt/), capistrano or puppet.

## Installing
1. Clone the repository:
  ```sh
  git clone https://github.com/forumone/generator-web-starter.git
  ```

2. Install the [Yeoman CLI](https://github.com/yeoman/yo) tool (if you don't already have it) -- note that you may need to run this as a user with elevated privileges:
  ```sh
  npm install -g yo
  ```

3. Link the project and install all dependencies -- note that you may need to run this as a user with elevated privileges:
  ```sh
  npm link
  ```

To update your version of `generator-web-starter`, navigate to the directory where you cloned `generator-web-starter` to, and run:
```sh
git pull
```

## Using `generator-web-starter`
After installing, navigate to the directory that will contain the new project and run:
```sh
yo web-starter
```
This will bring up an interactive menu for setting up your new web-starter project.
