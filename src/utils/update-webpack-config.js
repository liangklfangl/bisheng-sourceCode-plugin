'use strict';

const path = require('path');
const webpack = require('atool-build/lib/webpack');
//引入atool-build下的webpack,其主要是引入我们的webpack
const getConfig = require('./get-config');
const resolvePlugins = require('./resolve-plugins');
const bishengLib = path.join(__dirname, '..');
//表示在src目录下
const bishengLibLoaders = path.join(bishengLib, 'loaders');
//bishengLibLoaders表示的是src下的loaders文件夹
/*
  (1)调用方式：updateWebpackConfig(getWebpackCommonConfig({ cwd: process.cwd() }), configFile, true)
     其中configFile表示path.join(process.cwd(), program.config || 'bisheng.config.js')配置文件
 （2）isBuild表示是否是编译，如果是编译那么更新output的path/publicPath路径
      {
        output:{
             path:{//这里是config.output},
             publicPath:{//这里是config.root}
        }
      }
 (3)添加相应的loader,直接在webackConfig.module.loaders这个数组中添加就可以了
      {
      module: {
          loaders: [
              { test: /\.jade$/, loader: "jade" },
              // => "jade" loader is used for ".jade" files

              { test: /\.css$/, loader: "style!css" },
              // => "style" and "css" loader is used for ".css" files
              // Alternative syntax:
              { test: /\.css$/, loaders: ["style", "css"] },
          ]
      }
  }
(4)对于我们的src下的utils/data.js和utils/ssr-data.js使用我们的自己的loader来处理
(5)对plugin集合运行resolvePlugins函数，传入一个插件，返回这个插件在process.cwd()下的路径，
   以及这个插件本身的查询参数！该函数返回的内容为如下格式：
     [[resolvedPlugin,pluginQuery],[resolvedPlugin,pluginQuery]]
(6)require(pluginConfig[0])(pluginConfig[1]).webpackConfig(webpackConfig, webpack);
   加载我们的插件，并调用插件的webpackConfig方法，传入我们的webpackConfig，webpack参数。也就是
   说每一个plugin里面放置的内容都有一个webpackConfig方法，允许我们新增插件，如bisheng.js
    webpackConfig(config) {
    config.resolve.alias = {
      'antd/lib': path.join(process.cwd(), 'components'),
      antd: process.cwd(),
      site: path.join(process.cwd(), 'site'),
      'react-router': 'react-router/umd/ReactRouter',
    };
    config.plugins.push(new CSSSplitWebpackPlugin({ preserve: true }));
    config.babel.plugins.push([
      require.resolve('babel-plugin-transform-runtime'),
      {
        polyfill: false,
        //不会改变实例方法
        regenerator: true,
        //Automatically requires babel-runtime/regenerator when you use generators/async functions.
      },
    ]);

    config.babel.plugins.push([
      require.resolve('babel-plugin-import'),
      {
        style: true,//style设置为true表示引入less文件和js文件，否则只是引入js文件，如果style设置为'css'表示只会引入js/css而不会引入less
        libraryName: 'antd',//名称
        libraryDirectory: 'components',//目录，默认是'lib'目录
      },
    ]);
    //这是一个模块加载插件，兼容antd,antd-mobile方法
    return config;
  }
这一步会分别对plugins中的插件处理，以及对我们bisheng.js中配置的webpackConfig进行处理
(7)我们不允许在bisheng.js中配置entry，否则报错。customizedWebpackConfig返回的时候会返回一个entry
   其值表示src的同级目录下的tmp/entry.index.js

*/

module.exports = function updateWebpackConfig(webpackConfig, configFile, isBuild) {
  const config = getConfig(configFile);
  webpackConfig.entry = {};
  if (isBuild) {
    webpackConfig.output.path = config.output;
  }
  webpackConfig.output.publicPath = isBuild ? config.root : '/';
  webpackConfig.module.loaders.push({
    test(filename) {
      return filename === path.join(bishengLib, 'utils', 'data.js') ||
        filename === path.join(bishengLib, 'utils', 'ssr-data.js');
    },
    loader: `${path.join(bishengLibLoaders, 'bisheng-data-loader')}` +
      `?config=${configFile}&isBuild=${isBuild}`,
  });

  webpackConfig.module.loaders.push({
    test: /\.md$/,
    exclude: /node_modules/,
    loaders: [
      'babel',
      `${path.join(bishengLibLoaders, 'markdown-loader')}` +
        `?config=${configFile}&isBuild=${isBuild}`,
    ],
  });
  const pluginsConfig = resolvePlugins(config.plugins, 'config');
  pluginsConfig.forEach((pluginConfig) => {
    require(pluginConfig[0])(pluginConfig[1]).webpackConfig(webpackConfig, webpack);
  });

  const customizedWebpackConfig = config.webpackConfig(webpackConfig, webpack);

  const entryPath = path.join(bishengLib, '..', 'tmp', 'entry.' + config.entryName + '.js');
  if (customizedWebpackConfig.entry[config.entryName]) {
    throw new Error('Should not set `webpackConfig.entry.' + config.entryName + '`!');
  }
  customizedWebpackConfig.entry[config.entryName] = entryPath;
  return customizedWebpackConfig;
};
