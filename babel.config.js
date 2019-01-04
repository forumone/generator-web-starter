module.exports = api => {
  api.cache.forever();

  return {
    presets: [['@babel/env', { targets: { node: '8' } }]],
  };
};
