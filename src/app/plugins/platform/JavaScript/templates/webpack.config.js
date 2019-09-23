// @ts-check

const path = require('path');

// Variables
// =========

// These variables control the behavior of your Webpack build.

// Webpack can be told to hash the names of files it outputs. This results in much better behavior
// when using a CDN (like Fastly, CloudFlare, or CloudFront).
const hashFilenames = true;

// This array consists of the full path to any images which look terrible under the image
// optimization options we have configured.
const imagesExcludedFromOptimization = [
  // path.join(__dirname, 'src/images/filename.ext'),
];

// Want to use CSS modules? Change this to true.
// Further reading:
// * https://www.npmjs.com/package/css-loader#modules
// * https://github.com/css-modules/css-modules
const useCSSModules = false;

// It shouldn't be necessary to edit anything below this line.

const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const ExtractCssChunksPlugin = require('extract-css-chunks-webpack-plugin');
const TerserJsPlugin = require('terser-webpack-plugin');
const ForkTsCheckerPlugin = require('fork-ts-checker-webpack-plugin');
const OptimizeCssAssetsPlugin = require('optimize-css-assets-webpack-plugin');

function createFilenameTemplate(filenameTemplate, extension) {
  return filenameTemplate + '.' + extension;
}

function createChunkFilenameTemplate(chunkFilenameTemplate, extension) {
  return chunkFilenameTemplate + '.' + extension;
}

// Production plugins
// If you're used to Webpack <= 3, you're probably wondering where we add production plugins.
// The short answer is: we don't! Webpack 4 has built-in optimization options, and we're leaning on
// its built-in defaults rather than overriding them.

module.exports = ({mode}) => {
  const isProduction = mode === 'production';
  const isDevelopment = !isProduction;

// Derived settings from variables above:

  const templatePrefix = isProduction ? '[id]' : '[name]';
  const templateSuffix = hashFilenames ? '-[chunkhash]' : '';

  const filenameTemplate = '[name]' + templateSuffix;
  const chunkFilenameTemplate = templatePrefix + templateSuffix;
  const imageFilenameTemplate = isProduction
    ? '[hash].[ext]'
    : '[name]-[hash].[ext]';

  // NB. Changing the name of the target directory requires updates to
  // Capistrano and the .gitignore file.
  const targetDirectory = path.join(__dirname, 'public');

// We always use these plugins
  const plugins = [
    // Remove stale build output
    new CleanWebpackPlugin(),

    // Create separate CSS stylesheets
    new ExtractCssChunksPlugin({
      filename: createFilenameTemplate(filenameTemplate, 'css'),
      chunkFilename: createChunkFilenameTemplate(chunkFilenameTemplate,'css'),
    }),

    // Type-check and run TSLint on all files in the project
    new ForkTsCheckerPlugin({
      async: false,
      formatter: 'codeframe',
      eslint: true,
    }),

    // Autogenerate a index.html for SPAs and webpack-dev-server.
    new HtmlWebpackPlugin({
      template: path.join(__dirname, 'src/index.html'),
    }),
  ];

  return {
    context: __dirname,

    mode: isProduction ? 'production' : 'development',

    // Webpack defaults to 'eval' here, but that doesn't do a good job of preserving the TypeScript
    // source maps output by ts-loader, so we use the slower source-map method.
    devtool: isDevelopment && 'source-map',

    optimization: {
      splitChunks: {
        name: isDevelopment,
      },

      minimizer: [
        new TerserJsPlugin({
          terserOptions: {
            ecma: 5, // IE11, man
            output: { comments: false },
          },
        }),

        new OptimizeCssAssetsPlugin(),
      ],
    },

    resolve: {
      extensions: ['.tsx', '.ts', '.js', '.json'],
    },

    output: {
      path: targetDirectory,
      publicPath: '',
      filename: createFilenameTemplate(filenameTemplate,'js'),
      chunkFilename: createChunkFilenameTemplate(chunkFilenameTemplate,'js'),
    },

    devServer: {
      host: '0.0.0.0',
      port: 8000,

      // Show build errors in the browser
      overlay: true,

      // Don't fall back to the filesystem in development.
      contentBase: false,

      // Serve bundles from the project root.
      publicPath: '/',
    },

    plugins,

    module: {
      rules: [
        // Loads image assets and automatically optimizes them
        {
          test: /\.(?:png|svg|jpg)$/,
          exclude: imagesExcludedFromOptimization,
          use: [
            {
              loader: 'file-loader',
              options: {
                name: imageFilenameTemplate,
              },
            },
            {
              loader: 'imagemin-loader',
              options: {
                enabled: isProduction,
                plugins: [
                  {
                    use: 'imagemin-pngquant',
                    options: {
                      quality: [0.5, 0.6],
                    },
                  },
                  {
                    use: 'imagemin-svgo',
                  },
                ],
              },
            },
          ],
        },

        // Loads image assets but does not optimize them
        {
          test: /\.(?:png|svg|jpg)$/,
          include: imagesExcludedFromOptimization,
          use: {
            loader: 'file-loader',
            options: {
              name: imageFilenameTemplate,
            },
          },
        },

        // TypeScript
        {
          test: /\.tsx?$/,
          use: [
            {
              loader: 'babel-loader',
            },
            {
              loader: 'ts-loader',
              options: {
                transpileOnly: true,
              },
            },
          ],
        },

        // Stylesheets
        {
          test: /\.scss$/,
          enforce: 'pre',
          use: {
            loader: 'import-glob',
          },
        },
        {
          test: /\.scss$/,
          use: [
            ExtractCssChunksPlugin.loader,
            {
              loader: 'css-loader',
              options: {
                sourceMap: isDevelopment,
                modules: useCSSModules && {
                  // Include local path in hashed classes. This only applies to CSS modules.
                  localIdentName: isDevelopment
                    ? '[path]__[local]__[hash:base64:5]'
                    : '[hash:base64]',
                },

                // Ensures postcss-loader and sass-loader see any modules imported via the 'composes'
                // directive (This only applies in CSS modules mode, and is not needed for regular
                // sass @import statements.)
                importLoaders: 2,
              },
            },
            {
              loader: 'postcss-loader',
              options: {
                ident: 'postcss',
                sourceMap: isDevelopment,
                plugins: [
                  require('autoprefixer')({
                    // Browser definitions specified in .browserslistrc
                    remove: false,
                  }),
                ],
              },
            },
            {
              loader: 'sass-loader',
              options: {
                sourceMap: isDevelopment,
              },
            },
          ],
        },
      ],
    },
  }
};
