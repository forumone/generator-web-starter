module.exports = api => {
  const isProduction = api.env('production');
  const isDevelopment = !isProduction;

  return {
    presets: [['@babel/preset-react', { development: isDevelopment }]],
  };
};
