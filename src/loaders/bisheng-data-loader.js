'use strict';

const fs = require('fs');
const path = require('path');
const loaderUtils = require('loader-utils');
const getConfig = require('../utils/get-config');
const markdownData = require('../utils/markdown-data');
const resolvePlugins = require('../utils/resolve-plugins');

/*(1)在webpack中是通过如下方式进行配置的：
      webpackConfig.module.loaders.push({
      test(filename) {
        return filename === path.join(bishengLib, 'utils', 'data.js') ||
          filename === path.join(bishengLib, 'utils', 'ssr-data.js');
      },
      loader: `${path.join(bishengLibLoaders, 'bisheng-data-loader')}` +
        `?config=${configFile}&isBuild=${isBuild}`,
    });
 (2)  const isSSR = fullPath.endsWith('ssr-data.js');
     该代码用来判断是否是ssr


*/
module.exports = function bishengDataLoader(/* content */) {
  if (this.cacheable) {
    this.cacheable();
  }
  const webpackRemainingChain = loaderUtils.getRemainingRequest(this).split('!');
  const fullPath = webpackRemainingChain[webpackRemainingChain.length - 1];
  const isSSR = fullPath.endsWith('ssr-data.js');
  const query = loaderUtils.parseQuery(this.query);
  const config = getConfig(query.config);

  const markdown = markdownData.generate(config.source);
  //得到所有的source部分的markdown数据
  const browserPlugins = resolvePlugins(config.plugins, 'browser');
  //解析所有的浏览器的plugin，也就是解析的是每一个模块的lib/browser
  // const pluginName = path.join(snippets[0], 'lib', moduleName);
  const pluginsString = browserPlugins.map(
    (plugin) =>
      `require('${plugin[0]}')(${JSON.stringify(plugin[1])})`
  ).join(',\n');
 //加载所有的browser模块，并通过join方法来合并起来
  const picked = {};
  if (config.pick) {
    const nodePlugins = resolvePlugins(config.plugins, 'node');//解析node模块
    markdownData.traverse(markdown, (filename) => {
      const fileContent = fs.readFileSync(path.join(process.cwd(), filename)).toString();
      //得到文件的内容
      const parsedMarkdown = markdownData.process(filename, fileContent, nodePlugins, query.isBuild);
      //使用模块下面的node进行处理
      Object.keys(config.pick).forEach((key) => {
        if (!picked[key]) {
          picked[key] = [];
        }

        const picker = config.pick[key];
        const pickedData = picker(parsedMarkdown);
        //对于每一个picker中的方法都会传入已经解析好的markdown数据，把得到的结果作为picked传入到数组中返回
        if (pickedData) {
          picked[key].push(pickedData);
        }
      });
    });
  }
  //作为一个loader，我们必须按照指定的格式进行返回;但是必须是node的这种返回格式，也就是module.exports这种方式，这是CMD的方式
  return 'var Promise = require(\'bluebird\');\n' +
    'module.exports = {' +
    `\n  markdown: ${markdownData.stringify(markdown, config.lazyLoad, isSSR)},` +
    `\n  plugins: [\n${pluginsString}\n],` +
    `\n  picked: ${JSON.stringify(picked, null, 2)},` +
    `\n};`;
};
