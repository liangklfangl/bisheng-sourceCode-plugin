'use strict';

const path = require('path');
const R = require('ramda');
const loaderUtils = require('loader-utils');
//获取加载器的配置
const resolve = require('resolve');
//实现了node的require.resolve方法，你可以同步或者异步的解析一个文件

function resolvePlugin(plugin) {
  let result;
  try {
    //resolve如果第一个参数不是相对路径，如'.','..'等，那么只会逐级查找node_modules下的模块和node的核心模块或者缓存
    //模块，否则会查找具体的文件
    result = resolve.sync(plugin, {
      basedir: process.cwd(),
    });
  } catch (e) {} 
  return result;
}

/*
  (1)调用方式 const pluginsConfig = resolvePlugins(config.plugins, 'config');
  (2)pluginName最后得到的：问号前面的内容/lib/config,其中snippets[0]表示的是plugin的名称
  (3)Use the internal require() machinery to look up the location of a module, but rather than loading the module, just return the resolved filename.
  函数作用：传入一个插件，返回这个插件在process.cwd()下的路径，以及这个插件本身的查询参数！
  (3)在bisheng.config.js中我们配置的plugins如下所示：
      plugins: [
        'bisheng-plugin-description',//抽取markdown文件的中间的description部分
        'bisheng-plugin-toc?maxDepth=2&keepElem',//产生一个table
        'bisheng-plugin-react?lang=__react',//将markdown书写的jsx转换成为React.createElement
        'bisheng-plugin-antd',
      ]
  注意：我们这个函数返回的resolvedPlugin参数，也就是数组的第一个元素是我们的路径，也就是这个模块的绝对路径
*/
module.exports = function resolvePlugins(plugins, moduleName) {
  return plugins.map((plugin) => {
    const snippets = plugin.split('?');//得到'bisheng-plugin-description'
    const pluginName = path.join(snippets[0], 'lib', moduleName);//得到'bisheng-plugin-description/lib/config'
    const pluginQuery = loaderUtils.parseQuery(snippets[1] ? `?${snippets[1]}` : '');
    const resolvedPlugin = resolvePlugin(pluginName);//resolvePlugin会从顶级目录也就是cwd进行查找并得到路径
    //解析插件
    if (!resolvedPlugin) {
      return false;
    }
    //返回插件和插件的查询字符串
    return [
      resolvedPlugin,
      pluginQuery,
    ];
  }).filter(R.identity);
};
