'use strict';

const path = require('path');
const loaderUtils = require('loader-utils');
//一种获取webpack配置的推荐方式
const getConfig = require('../utils/get-config');
const resolvePlugins = require('../utils/resolve-plugins');
const markdownData = require('../utils/markdown-data');

function stringify(node, depth = 0) {
  const indent = '  '.repeat(depth);
  //字符串有repeat方法了
  if (Array.isArray(node)) {
    return `[\n` +
      node.map(item => `${indent}  ${stringify(item, depth + 1)}`).join(',\n') +
      `\n${indent}]`;
  }
  //如果是数组，那么对其中每一个元素进行处理
  if (
    typeof node === 'object' &&
      node !== null &&
      !(node instanceof Date)
  ) {
    if (node.__BISHENG_EMBEDED_CODE) {
      return node.code;
    }
    return `{\n` +
      Object.keys(node).map((key) => {
        const value = node[key];
        return `${indent}  "${key}": ${stringify(value, depth + 1)}`;
      }).join(',\n') +
      `\n${indent}}`;
  }
  //否则通过JSON.stringify来处理
  return JSON.stringify(node, null, 2);
}

/*
 (1)这是一个markdown解析器，可以学会如何编写一个webpack的loader。loaderUtils的使用方式如下：
    config = loaderUtils.getLoaderConfig(this, "myLoader");
 (2)如果有cacheable，那么调用cacheable方法
 (3)得到剩下的最后一个loader，同时获取这个最后的一个loader的相对路径
 (4)插件调用的时候是如下进行的：
       webpackConfig.module.loaders.push({
          test: /\.md$/,
          exclude: /node_modules/,
          loaders: [
            'babel',
            `${path.join(bishengLibLoaders, 'markdown-loader')}` +
              `?config=${configFile}&isBuild=${isBuild}`,
          ],
        });
    所以在这一步，我们要获取其中的query信息，同时解析出我们的configFile集合中的所有的plugins
(5)把最后一个插件的路径，以及传入的content信息，配置文件中的plugins集合，以及查询参数中的isBuild参数传入进行
   解析，解析得出我们已经解析过的markdown数据
(6)我们的getRemaindingRequest源码如下：
      exports.getRemainingRequest = function(loaderContext) {
      if(loaderContext.remainingRequest)
        return loaderContext.remainingRequest;
      var request = loaderContext.loaders.slice(loaderContext.loaderIndex+1).map(dotRequest).concat([loaderContext.resource]);
      return request.join("!");
    };
(7)cachable表示模块是否缓存，Webpack Loader 同样可以利用缓存来提高效率，并且只需在一个可缓存的 Loader 上加一句 
   this.cacheable(); 就是这么简单

 注意：这里是一个插件，只会在webpackConfig.module.loaders中push进去，而不会直接调用。这里的content是整个文件的内容，
      是webpack以utf-8的形式读取的文件的内容
*/
module.exports = function markdownLoader(content) {
  if (this.cacheable) {
    this.cacheable();
  }
  const webpackRemainingChain = loaderUtils.getRemainingRequest(this).split('!');
  const fullPath = webpackRemainingChain[webpackRemainingChain.length - 1];
  const filename = path.relative(process.cwd(), fullPath);
  //从cwd开始查找我们的这个模块的路径
  const query = loaderUtils.parseQuery(this.query);
  const plugins = resolvePlugins(getConfig(query.config).plugins, 'node');
  //获取site/bisheng.cfg.js文件下的plugins插件，经过process处理后返回的plugins是如下的格式：
  const parsedMarkdown = markdownData.process(filename, content, plugins, query.isBuild);
  //这里得到已经解析后的markdown数据
  return `module.exports = ${stringify(parsedMarkdown)};`;
};

module.exports.stringify = stringify;
