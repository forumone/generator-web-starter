import globby from 'globby';
import path from 'path';

/**
 * Function to list plugins from a specific directory. The returned array consists of module names
 * relative to the passed-in directory.
 */
async function discoverModules(directory: string): Promise<string[]> {
  // Given the tree structure below, this function returns the array ['Foo', 'Bar', 'Baz']:
  // * plugins/
  //   * Foo/
  //   * Bar.js
  //   * Baz/
  //
  // Here's how:
  // 1. globby('*', cwd: plugins) => [Foo, Bar.js, Baz] (directories don't have suffixes)
  // 2. path.basename(module, .js) => [Foo, Bar, Baz] (extension in basename() is optional)
  //
  // We use path.basename() to prettify the module names. It's compatible with how require() sees
  // the world, as it will attempt to add the .js extension back before falling back to finding
  // an index.js file in the named directory. So long as the modules are given good names, they
  // can be presented to the user directly in a menu or printed out for debugging.
  const modules = await globby('*', { cwd: directory, onlyFiles: false });

  return modules.map(moduleName => path.basename(moduleName, '.js'));
}

export default discoverModules;
