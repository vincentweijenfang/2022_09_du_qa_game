/* eslint max-len:0 */
const path = require('path')
const MiniCssExtractPlugin = require('mini-css-extract-plugin')
const webpack = require('webpack')
const { VueLoaderPlugin } = require('vue-loader')
const FriendlyErrorsPlugin = require('friendly-errors-webpack-plugin')
const CopyWebpackPlugin = require('copy-webpack-plugin')
const ScriptExtHtmlWebpackPlugin = require('script-ext-html-webpack-plugin')
const OptimizeCSSAssetsPlugin = require('optimize-css-assets-webpack-plugin')
const launchEditorMiddleware = require('launch-editor-middleware')
const WebpackBar = require('webpackbar')
const chokidar = require('chokidar')

const {
  toFilename,
  createPugHtmlLoaderOptions,
  createHtmlWebpackPlugin,
} = require('./util')

const DEV_MODE = process.env.NODE_ENV === 'development'
const config = require('../../config')

const { publicPath = '/' } = config

const productionPages = [
  // 首頁
  createHtmlWebpackPlugin({
    template: 'html/01-index.pug',
    filename: 'index.html',
    chunks: ['01-index', 'commons', 'vendors'],
  }, { }),
  // 答題頁
  createHtmlWebpackPlugin({
    template: 'html/02-question.pug',
    filename: 'question.html',
    chunks: ['02-question', 'commons', 'vendors'],
  }, { }),
  // 解答頁
  createHtmlWebpackPlugin({
    template: 'html/03-answer.pug',
    filename: 'answer.html',
    chunks: ['03-answer', 'commons', 'vendors'],
  }, { }),
  // 完結頁
  createHtmlWebpackPlugin({
    template: 'html/04-ending.pug',
    filename: 'ending.html',
    chunks: ['01-index', 'commons', 'vendors'],
  }, { }),
]

const publishPages = productionPages

const webpackConfig = {
  mode: process.env.NODE_ENV,
  context: path.resolve('src'),
  entry: {
    '00-main': ['./00-main.js'],

    '01-index': ['./01-index.js'],
    '02-question': ['./02-question.js'],
    '03-answer': ['./03-answer.js'],
  },
  devtool: DEV_MODE ? 'inline-source-map' : false,
  output: {
    path: process.env.APP_ENV == 'stage' ? path.resolve('dist-stage') : path.resolve('dist'),
    filename: toFilename('assets/js/[name]'),
    chunkFilename: toFilename('assets/js/[name]-chunk'),
    publicPath,
  },
  resolve: {
    modules: [
      path.resolve('src'),
      path.resolve('src/assets'),
      path.resolve('node_modules'),
    ],
    alias: {
      '@': path.resolve('src'),

      // 取消 webpack 對 vue runtime-only
      // https://stackoverflow.com/questions/47332728/you-are-using-the-runtime-only-build-of-vue-where-the-template-compiler-is-not-a
      // vue: 'vue/dist/vue.js', 
    },
  },
  /*
    ██     ██  ███████  ████████  ██     ██ ██       ████████
    ███   ███ ██     ██ ██     ██ ██     ██ ██       ██
    ████ ████ ██     ██ ██     ██ ██     ██ ██       ██
    ██ ███ ██ ██     ██ ██     ██ ██     ██ ██       ██████
    ██     ██ ██     ██ ██     ██ ██     ██ ██       ██
    ██     ██ ██     ██ ██     ██ ██     ██ ██       ██
    ██     ██  ███████  ████████   ███████  ████████ ████████
  */
  module: {
    noParse: /jquery/,
    rules: [
      {
        test: /\.(js|jsx)$/,
        use: {
          loader: 'babel-loader',
          options: {
            // presets: ['@babel/preset-env']
            // presets: ['es2015']
          },
        },
        exclude: /node_modules\/(?!(dom7|swiper)\/).*/,
      },
      {
        test: /\.vue$/,
        use: [
          {
            loader: 'vue-loader',
            // https://forum.vuejs.org/t/how-to-remove-attributes-from-tags-inside-vue-components/24138/9
            options: {
              compilerOptions: {
                modules: [
                  {
                    // remove html attribute data-testid
                    preTransformNode(astEl) {
                      const attribute = 'data-testid'
                      if (process.env.NODE_ENV === 'production') {
                        const { attrsMap, attrsList } = astEl
                        if (attrsMap[attribute]) {
                          delete attrsMap[attribute]
                          const index = attrsList.findIndex((x) => x.name === attribute)
                          attrsList.splice(index, 1)
                        }
                      }
                      return astEl
                    },
                  },
                ],
              },
            },
          },
        ],
        exclude: /node_modules/,
      },
      {
        test: /\.(ttf|woff|mp4|eot)$/,
        use: {
          // https://github.com/webpack-contrib/file-loader
          loader: 'file-loader',
          options: {
            name: '[path][name].[ext]',
            esModule: false,
          },
        },
        exclude: /node_modules/,
      },
      {
        test: /\.(png|jpe?g|gif|svg)$/,
        use: {
          loader: 'url-loader',
          options: {
            name: '[path][name].[ext]',
            esModule: false,
            limit: 0 * 1024, // 小於 2k 的圖片變 base64
          },
        },
        exclude: /node_modules/,
      },
      {
        test: /\.pug$/,
        oneOf: [
          {
            resourceQuery: /^\?vue/,
            use: [
              {
                loader: 'pug-plain-loader',
                options: {
                  data: {
                    DEV_MODE,
                    APP_ENV: process.env.APP_ENV,
                  },
                },
              },
            ],
          },
          {
            // 這個沒用到，因為 util.js 裡的 createHtmlWebpackPlugin 取代
            use: [
              {
                loader: 'html-loader',
                options: {
                  interpolate: true, // <img src="${require(`./images/gallery.png`)}">
                  // attrs: ['img:src', 'video:src', 'img:srcset', 'source:srcset'],
                },
              },
              {
                loader: 'pug-html-loader',
                options: createPugHtmlLoaderOptions(),
              },
            ],
            include: path.resolve('src/html'),
          },
        ],
      },
      {
        test: /\.(styl|stylus)?$/,
        use: [
          {
            loader: MiniCssExtractPlugin.loader,
            options: {
              publicPath: publicPath.substr(0, 1) === '/' ? publicPath : '../../',
              hmr: DEV_MODE,
            },
          },
          {
            loader: 'css-loader',
            options: { sourceMap: true },
          },
          {
            loader: 'postcss-loader',
            options: {
              sourceMap: true,
              plugins: () => [
                // https://github.com/luisrudge/postcss-flexbugs-fixes
                require('postcss-flexbugs-fixes'),
                // https://github.com/postcss/autoprefixer█options
                require('autoprefixer')({
                  flexbox: 'no-2009',
                }),
              ],
            },
          },
          {
            loader: 'stylus-loader',
            options: {
              paths: ['src/css/', 'src/assets/', 'src/'],
              sourceMap: true,
              define: {
                DEV_MODE,
              },
              preferPathResolver: 'webpack',
              import: [path.resolve('src/css/mixins/_index.styl')],
            },
          },
        ],
        exclude: /node_modules/,
      },
    ],
  },
  /*
    ████████  ██       ██     ██  ██████   ████ ██    ██  ██████
    ██     ██ ██       ██     ██ ██    ██   ██  ███   ██ ██    ██
    ██     ██ ██       ██     ██ ██         ██  ████  ██ ██
    ████████  ██       ██     ██ ██   ████  ██  ██ ██ ██  ██████
    ██        ██       ██     ██ ██    ██   ██  ██  ████       ██
    ██        ██       ██     ██ ██    ██   ██  ██   ███ ██    ██
    ██        ████████  ███████   ██████   ████ ██    ██  ██████
  */
  plugins: [
    new VueLoaderPlugin(),
    new MiniCssExtractPlugin({
      filename: toFilename('assets/css/[name]', 'css?' + new Date().getTime()),
      chunkFilename: toFilename('assets/css/[name]-chunk', 'css?' + new Date().getTime()),
    }),
    ...publishPages,
    new ScriptExtHtmlWebpackPlugin({
      defaultAttribute: 'defer',
    }),
    new CopyWebpackPlugin([
      { from: 'assets/copy', to: './', ignore: ['.*'] },
    ]),
    new webpack.DefinePlugin({
      'process.env': {
        VUE_ENV: JSON.stringify('client'),
        ...Object.keys(config).reduce((o, key) => {
          const value = config[key]
          o[key] = ['boolean', 'number'].indexOf(typeof value) !== -1
            ? value
            : JSON.stringify(value)
          return o
        }, {}),
      },
    }),
    new WebpackBar(),
    ...DEV_MODE
      ? [
        new FriendlyErrorsPlugin(),
      ]
      : [
        new webpack.ids.HashedModuleIdsPlugin(),
        new OptimizeCSSAssetsPlugin({}),
      ],
  ],
  /*
    ████████  ████████  ████████ ████ ██     ██ ████ ████████    ███    ████████ ████  ███████  ██    ██
    ██     ██ ██     ██    ██     ██  ███   ███  ██       ██    ██ ██      ██     ██  ██     ██ ███   ██
    ██     ██ ██     ██    ██     ██  ████ ████  ██      ██    ██   ██     ██     ██  ██     ██ ████  ██
    ██     ██ ████████     ██     ██  ██ ███ ██  ██     ██    ██     ██    ██     ██  ██     ██ ██ ██ ██
    ██     ██ ██           ██     ██  ██     ██  ██    ██     █████████    ██     ██  ██     ██ ██  ████
    ██     ██ ██           ██     ██  ██     ██  ██   ██      ██     ██    ██     ██  ██     ██ ██   ███
    ████████  ██           ██    ████ ██     ██ ████ ████████ ██     ██    ██    ████  ███████  ██    ██
  */
  optimization: {
    splitChunks: {
      chunks: 'all',
      minSize: 100,
      minChunks: 1,
      automaticNameDelimiter: '-',
      name: false,
      cacheGroups: {
        commons: {
          name: 'commons',
          chunks: 'all',
          minChunks: 2,
          maxInitialRequests: 5,
          minSize: 0,
        },
        vendors: {
          name: 'vendors',
          chunks: 'all',
          test: /[\\/]node_modules[\\/]/,
          priority: 10,
          enforce: true,
        },
      },
    },
  },
  performance: {
    maxEntrypointSize: 300000,
    hints: !DEV_MODE ? 'warning' : false,
  },
  externals: {
    // 如果有用到 cdnjs script src jquery 的話，可以把這一段加入
    jquery: '$',
    Vue: 'Vue',
    axios: 'axios',
  },
  /*
    ████████  ████████ ██     ██  ██████  ████████ ████████  ██     ██ ████████ ████████
    ██     ██ ██       ██     ██ ██    ██ ██       ██     ██ ██     ██ ██       ██     ██
    ██     ██ ██       ██     ██ ██       ██       ██     ██ ██     ██ ██       ██     ██
    ██     ██ ██████   ██     ██  ██████  ██████   ████████  ██     ██ ██████   ████████
    ██     ██ ██        ██   ██        ██ ██       ██   ██    ██   ██  ██       ██   ██
    ██     ██ ██         ██ ██   ██    ██ ██       ██    ██    ██ ██   ██       ██    ██
    ████████  ████████    ███     ██████  ████████ ██     ██    ███    ████████ ██     ██
  */
  devServer: {
    before(app, server) {
      app.use('/__open-in-editor', launchEditorMiddleware(null, 'src', () => console.log(
        'To specify an editor, specify the EDITOR env variable or '
        + 'add "editor" field to your Vue project config.\n',
      )))
      // hot reload for html, pug, 如果是開發 vue 專案，chokidar 就可以不用寫
      chokidar.watch('src/html/**/*').on('all', () => {
        server.sockWrite(server.sockets, 'content-changed')
      })
    },
    historyApiFallback: true,
    noInfo: true,
    port: 3000,
    hot: true,
    stats: {
      colors: true,
      hash: false,
      chunks: false,
      chunkModules: false,
      children: false,
    },
    host: '0.0.0.0',
    disableHostCheck: true,
    /*  proxy: [
      {
        context: ['/upload', '/api'],
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    ], */
  },

}

module.exports = webpackConfig
