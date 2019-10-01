import Dependency from './Dependency';

const pdo: Dependency = {
  builtins: ['pdo_mysql', 'pdo_pgsql'],
  packages: ['postgresql-dev'],
};

export default pdo;
