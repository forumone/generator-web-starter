import globby from 'globby';
import path from 'path';

async function discoverModules(directory: string): Promise<string[]> {
  const modules = await globby('*', { cwd: directory, onlyFiles: false });

  return modules.map(moduleName => path.basename(moduleName, '.js'));
}

export default discoverModules;
