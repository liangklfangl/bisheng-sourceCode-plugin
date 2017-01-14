'use strict';

const fs = require('fs');
const path = require('path');

//默认的bisheng配置
/*
(1)我们这个文件是bisheng这个解析器默认的配置文件，在index.js中我们会默认读取这里的配置文件

*/
const defaultConfig = {
  port: 8000,
  source: './posts',
  output: './_site',
  theme: './_theme',
  htmlTemplate: path.join(__dirname, '../template.html'),
  lazyLoad: false,
  plugins: [],
  doraConfig: {},
  webpackConfig(config) {
    return config;
  },
  entryName: 'index',
  root: '/',
  filePathMapper(filePath) {
    return filePath;
  },
};

const pluginHighlight = path.join(__dirname, '..', 'bisheng-plugin-highlight');
//获取到我们的默认的插件bisheng-plugin-highlight
function isRelative(filepath) {
  return filepath.charAt(0) === '.';
}

/*
  (1)首先获取我们自己指定的配置文件,也就是项目根目录的bisheng.config.js文件的配置文件内容
  (2)把我们自己指定的配置文件和默认的配置合并起来
  (3)注意，我们的plugins是如下的样式：
      plugins: [
      'bisheng-plugin-description',//抽取markdown文件的中间的description部分
      'bisheng-plugin-toc?maxDepth=2&keepElem',//产生一个table
      'bisheng-plugin-react?lang=__react',//将markdown书写的jsx转换成为React.createElement
      'bisheng-plugin-antd',
    ]
   所以，我们返回的config的plugins会得到下面的形式(其实不是，因为我们配置的时候不是相对路径的)：
  plugins: [
      'process.cwd()/bisheng-plugin-description',//抽取markdown文件的中间的description部分
      'process.cwd()/bisheng-plugin-toc?maxDepth=2&keepElem',//产生一个table
      'process.cwd()/bisheng-plugin-react?lang=__react',//将markdown书写的jsx转换成为React.createElement
      'process.cwd()/bisheng-plugin-antd',
    ]
  注意：我们该方法返回的路径都是绝对路径了，而不再是相对路径了
*/
module.exports = function getConfig(configFile) {
  const customizedConfig = fs.existsSync(configFile) ? require(configFile) : {};
  const config = Object.assign({}, defaultConfig, customizedConfig);
  config.plugins = [pluginHighlight].concat(config.plugins.map(
    (plugin) => isRelative(plugin) ? path.join(process.cwd(), plugin) : plugin
  ));
  return config;
};
