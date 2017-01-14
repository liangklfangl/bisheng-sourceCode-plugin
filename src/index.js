'use strict';

const fs = require('fs');
const path = require('path');
const mkdirp = require('mkdirp');
//创建文件夹
const nunjucks = require('nunjucks');
//其是一个javascript模块引擎
const dora = require('dora');
//配置dora
const webpack = require('atool-build/lib/webpack');
const getWebpackCommonConfig = require('atool-build/lib/getWebpackCommonConfig');
//引入getWebpackCommonConfig
const Promise = require('bluebird');
const R = require('ramda');
const ghPages = require('gh-pages');
//把文件发布到github的gh-pages分支
const getConfig = require('./utils/get-config');
//获取配置文件
const markdownData = require('./utils/markdown-data');
const generateFilesPath = require('./utils/generate-files-path');
const updateWebpackConfig = require('./utils/update-webpack-config');
/*入口文件是：entry.nunjucks.js*/
const entryTemplate = fs.readFileSync(path.join(__dirname, 'entry.nunjucks.js')).toString();
/*入口的路由文件，也就是entry.nunjucks.js*/
const routesTemplate = fs.readFileSync(path.join(__dirname, 'routes.nunjucks.js')).toString();
//入口的路由文件，即routes.nunjucks.js
mkdirp.sync(path.join(__dirname, '..', 'tmp'));
//在当前目录上一层目录，也就是src同级目录下创建一个路径，为tmp文件夹
/*
  (1)调用方式： getRoutesPath(path.join(process.cwd(), configTheme));
    routesPath表示当前目录的上一级目录temp/routes.js,其中内容是通过为routesTemplate文件进行渲染后得到的！
    函数作用：在src同级目录temp下写入一个使用routes.nunjucks.js渲染得到的文件routes.js


    注意：这个routes.js是渲染相应的组件，所以他需要知道组件的具体位置，也就是'cwd/site/theme'，template不需要自己制定
        默认就是cwd/site/theme/template目录
    const Template = require('{{ themePath }}/template' + template.replace(/^\.\/template/, ''));
        const theme = require('{{ themePath }}');
   此时他会渲染相应路径的组件并做相应的处理，所以在我们的entry.index.js文件中需要知道这个文件的路径，进而调用，调用方式如下：
*/
function getRoutesPath(themePath) {
  const routesPath = path.join(__dirname, '..', 'tmp', 'routes.js');
  fs.writeFileSync(
    routesPath,
    nunjucks.renderString(routesTemplate, { themePath })
  );
  return routesPath;
}
/*
 (1)generateEntryFile(config.theme, config.entryName, config.root);传入的参数是指定的theme，入口名称，以及root
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
(2)获取入口文件的地址，当前目录的上一层目录/temp/entry.index.js，routesPath表示当前目录下的
(3)注意，process.cwd()与__dirname的区别。前者进程发起时的位置，后者是脚本的位置，两者可能是不一致的。
   比如，node ./code/program.js，对于process.cwd()来说，返回的是当前目录（.）；对于__dirname来说，
   返回是脚本所在目录，即./code/program.js。这里是在src同级目录，也就是tmp/entry.index.js写入一个文件内容
(4)routesPath返回的是path.join(__dirname, '..', 'tmp', 'routes.js')
 函数作用：在src同级目录temp下写入一个使用entry.nunjucks.js渲染得到的文件entry.index.js，其中entry.nunjucks.js
         中的root被替换为path.join(__dirname, '..', 'tmp', 'routes.js');

注意：在这个函数里面渲染的是入口文件entryTemplate，入口表示的是ReactRouter.match的文件，对于http，入口就是路由，但是这个入口
    文件需要的是一个routesPath/root参数，用于获取相同目录下的routes.js，这个routes.js可以对数据进行进一步增强。比如：
       const routes = require('{{ routesPath }}')(data);
entry.index.js内容如下：
  ReactRouter.match({ routes, location, basename }, () => {
    const router =
      <ReactRouter.Router
        history={ReactRouter.useRouterHistory(history.createHistory)({ basename })}
        routes={routes}
        createElement={createElement}
      />;
    ReactDOM.render(
      router,
      document.getElementById('react-content')
    );
  });
因为我们接受一个routes，这个routes必须是一个实例化组件嵌套结构，所以这个结构的获取必须获取到routes.js。routes.js会在
cwd/site/theme/index.js中每一个配置的routes都封装onEnter/component/getComponent/indexRoute/childRoutes等。
通过getComponent会返回一个函数：(nextState, callback)
*/
function generateEntryFile(configTheme, configEntryName, root) {
  const entryPath = path.join(__dirname, '..', 'tmp', 'entry.' + configEntryName + '.js');
  const routesPath = getRoutesPath(path.join(process.cwd(), configTheme));
  fs.writeFileSync(
    entryPath,
    nunjucks.renderString(entryTemplate, { routesPath, root })
  );
}
/*
  (1)bisheng start命令运行的结果
  (2)start后如果没有文件名称，那么直接获取当前目录下的bisheng.config.js，否则读取start后的option的config属性
  (3)获取config文件内容，config = Object.assign({}, defaultConfig, customizedConfig);并创建一个目录./_site
     这是为什么我们存在：sy-standard-project/_site这个目录。
  (4)template表示通过htmlTemplate指定的内容，templatePath表示的是output指定的路径下的index.html，其是通过对
     htmlTemplate指定的模板进行渲染后得到的html。配置如下：
         htmlTemplate: './site/theme/static/template.html'
     所以，最终我们生成的html的目录是：sy-standard-project/_site/index.html
  （8）config.theme的配置如下：
      theme: './site/theme'
      entryName: 'index'
  (5)配置dora,要获取get-config中自己配置的插件，还有我们在这里添加的插件plugins集合，然后把这个集合放置在dora中。
     其中cwd表示把那个目录布置到dora服务器，这里是'./_site'目录，这个目录是输出目录！
  (6)require.resolve用于获取模块的绝对路径
    注意：在package.json中是如下配置的内容
         "start": "bisheng start -c ./site/bisheng.config.js --no-livereload",
    我们再来看看bisheng.js是如何进行调用我们的start命令的：
    BiSheng.start(program);  
    也就是说configFile最后调用的命令传入的配置文件是:'cwd/site/bisheng.config.js'，也就是网站根目录下的bisheng的配置文件
  (7)在getConfig方法中，我们把所有的插件的位置转化为绝对路径了：
       plugins: [
        'process.cwd()/bisheng-plugin-description',//抽取markdown文件的中间的description部分
        'process.cwd()/bisheng-plugin-toc?maxDepth=2&keepElem',//产生一个table
        'process.cwd()/bisheng-plugin-react?lang=__react',//将markdown书写的jsx转换成为React.createElement
        'process.cwd()/bisheng-plugin-antd',
      ]
  （8）这里的路径你可能都是没法理解的，我们分析下：
     因为我们的script是配置在package.json下的，也就是项目根目录的，所以我们node运行的目录相当于项目根目录，所以cwd就是根目录
     同时我们的当目录，也就是'.'这个目录也就是项目根目录了！
 顺序如下：
   .读取配置文件
   .创建cwd/_site目录
   .渲染我们的htmlTemplate文件(替换root变量)到cwd/_site目录下。在bisheng.js中，我们进行了如下的配置：
       htmlTemplate: './site/theme/static/template.html'//这也是为什么说我们的site和soure目录是必须的原因，因为我们需要他提供html配置文件，否则只能用我们默认的html配置文件
   .创建temp目录下的entry.index.js和routes.js文件（给entry.nunjucks.js传入routesPath, root两个变量，给routes.nunjucks.js传入themePath）
    因为我们的routes.nunjucks.js表示的是路由，所以它需要找到我们的theme路径来渲染不同的组件，比如NotFound等都是在theme目录下的，这也是为什么说theme
    目录是必须的！而entry.nunjucks.js中使用的ReactRouter，所以我们需要routesPath和root变量


  注意：时刻记住，_site目录是输出目录，而site和source目录是必须的，因为我们要读取site下的配置文件如htmlTemplate，同时也
      要读取site下的theme中配置的routes文件，里面配置我们的子路由和数据。所以site下的文件结构如下：
      site
         theme//'./site/theme'也就是config.theme的值
            static//存放css和html模板资源，htmlTemplate
            template//React相关显示组件
            index.js//路由，子路由和数据
            en-US.js
            zh-CN.js//国际化资源
         bisheng.config.js

     _site
        index.html//渲染后得到的html文件
        demo1.html
        demo2.html//渲染后得到的demo文件  

    node_modules/bisheng
        component-button-demo//组件渲染得到的demo内容，内容如下
        entry.index.js
        routes.js

    module.exports = {
    'basic': require('/Users/qingtian/Desktop/sy-standard-project/components/button/demo/basic.md'),
    'button-group': require('/Users/qingtian/Desktop/sy-standard-project/components/button/demo/button-group.md'),
    'disabled': require('/Users/qingtian/Desktop/sy-standard-project/components/button/demo/disabled.md'),
    'icon': require('/Users/qingtian/Desktop/sy-standard-project/components/button/demo/icon.md'),
    'loading': require('/Users/qingtian/Desktop/sy-standard-project/components/button/demo/loading.md'),
    'multiple': require('/Users/qingtian/Desktop/sy-standard-project/components/button/demo/multiple.md'),
    'size': require('/Users/qingtian/Desktop/sy-standard-project/components/button/demo/size.md'),
}
*/
exports.start = function start(program) {
  const configFile = path.join(process.cwd(), program.config || 'bisheng.config.js');
  const config = getConfig(configFile);
  mkdirp.sync(config.output);

  const template = fs.readFileSync(config.htmlTemplate).toString();
  const templatePath = path.join(process.cwd(), config.output, 'index.html');
  fs.writeFileSync(templatePath, nunjucks.renderString(template, { root: '/' }));
  generateEntryFile(config.theme, config.entryName, '/');

  const doraConfig = Object.assign({}, {
    cwd: path.join(process.cwd(), config.output),
    port: config.port,
  }, config.doraConfig);
  doraConfig.plugins = [
    [require.resolve('dora-plugin-webpack'), {
      //获取webpack基础配置并更新;手动调用webpack开始编译文件，把静态资源吐给服务器;监听文件变化
      disableNpmInstall: true,
      cwd: process.cwd(),//在'middleware.before'中会默认读取cwd下的配置文件webpack.config.js
      config: 'bisheng-inexistent.config.js',//但是在这里就是读取我们的'bisheng-inexistent.config.js'
    }],
    [path.join(__dirname, 'dora-plugin-bisheng'), {
      config: configFile,
    }],
    //根据我们shell中配置的configFile进一步更新webpackConfig,在'webpack.updateConfig'中更新配置
    //更新下：这里先后是没有影响的，因为只要'dora-plugin-webpack'被加载就会执行这两个钩子了，而且是因为把所有的插件都遍历一次，没有的
    //插件不会执行，而有这个'webpack.updateConfig'钩子的插件才会执行，所以顺序没有关系
    require.resolve('dora-plugin-browser-history'),
    //为单页面应用添加路由跳转，该插件是注册在'middleware'阶段的,服务器还没有启动，但是webpack已经开始编译。所以这里
    //没有修改我们的配置内容
  ];
  const usersDoraPlugin = config.doraConfig.plugins || [];
  doraConfig.plugins = doraConfig.plugins.concat(usersDoraPlugin);

 //其中涉及webpack生命周期的那些方法值得好好研究
  if (program.livereload) {
    doraConfig.plugins.push(require.resolve('dora-plugin-livereload'));
  }
  dora(doraConfig);
};

const ssr = require('./ssr');

//把html文件转化为URL路径
function filenameToUrl(filename) {
  if (filename.endsWith('index.html')) {
    return filename.replace(/index\.html$/, '');
  }
  return filename.replace(/\.html$/, '');
}


/*
  (1)调用方式：exports.build(program, () => pushToGhPages(basePath));其中program是调用deploy时候传入的参数
  (2)创建一个文件夹，也即是在get-config.js中通过output指定的文件路径
  (3)调用generateEntryFile的参数为：'./_theme'，'index'，‘/’,在src同级目录下temp产生entry.index.js和routes.js
  (4)使用webpack.DefinePlugin来定义一个字符串的值
  (5)ssrWebpackConfig是对webpackConfig进行了部分更新后得到的结果:
     {
        entry:{data:"__dirname/ssr-data.js"},
        target:"node",
        output:{path:process.cwd()/tmp,libraryTarget:'commonjs'},
        plugins:[!webpack.optimize.CommonsChunkPlugin]
      }
  (6)markdownData.generate(config.source)就是将我们的source中的markdown文件解析：
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
   不过解析出来的仅仅是我们的属性结构，而没有真实的读取数据
（7）其中这里是读取了theme下的index.js文件，传入的参数markdown就是filesToTreeStructure返回的结果，就是文件树形结构：
    let filesNeedCreated = generateFilesPath(themeConfig.routes, markdown).map(config.filePathMapper);
*/
exports.build = function build(program, callback) {
  const configFile = path.join(process.cwd(), program.config || 'bisheng.config.js');
  const config = getConfig(configFile);
  mkdirp.sync(config.output);

  generateEntryFile(config.theme, config.entryName, config.root);

  const webpackConfig =
          updateWebpackConfig(getWebpackCommonConfig({ cwd: process.cwd() }), configFile, true);

  webpackConfig.UglifyJsPluginConfig = {
    output: {
      ascii_only: true,
    },
    compress: {
      warnings: false,
    },
  };
  webpackConfig.plugins.push(new webpack.DefinePlugin({
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'production'),
  }));

  const ssrWebpackConfig = Object.assign({}, webpackConfig);
  ssrWebpackConfig.entry = {
    data: path.join(__dirname, './utils/ssr-data.js'),
  };
  ssrWebpackConfig.target = 'node';
  const ssrDataPath = path.join(__dirname, '..', 'tmp');
  ssrWebpackConfig.output = Object.assign({}, ssrWebpackConfig.output, {
    path: ssrDataPath,
    libraryTarget: 'commonjs',
  });
  ssrWebpackConfig.plugins = ssrWebpackConfig.plugins
    .filter(plugin => !(plugin instanceof webpack.optimize.CommonsChunkPlugin));

  //直接运行webpack函数
  webpack([webpackConfig, ssrWebpackConfig], function(err, stats) {
    if (err !== null) {
      return console.error(err);
    }

    if (stats.hasErrors()) {
      console.log(stats.toString('errors-only'));
      return;
    }

    const markdown = markdownData.generate(config.source);
    //返回的是文件树结构
    const themeConfig = require(path.join(process.cwd(), config.theme));
    //获取theme配置theme: './site/theme'
    let filesNeedCreated = generateFilesPath(themeConfig.routes, markdown).map(config.filePathMapper);
    //把themeConfig中的参数children用markdown中的文件路径进行替换，然后运行filePathMapper，其中generateFilesPath是
    //把含有参数的路径解析为绝对的路径！下面是filePathMapper的配置：
    /*
       filePathMapper(filePath) {
        if (filePath === '/index.html') {
          return ['/index.html', '/index-cn.html'];
        }
        if (filePath.endsWith('/index.html')) {
          return [filePath, filePath.replace(/\/index\.html$/, '-cn/index.html')];
        }
        if (filePath !== '/404.html' && filePath !== '/index-cn.html') {
          return [filePath, filePath.replace(/\.html$/, '-cn.html')];
        }
        return filePath;
      }
    */

    filesNeedCreated = R.unnest(filesNeedCreated);
    //创建文件，下面是unnest的用法：
    /*
      R.unnest([1, [2], [[3]]]); //=> [1, 2, [3]]
      R.unnest([[1, 2], [3, 4], [5, 6]]); //=> [1, 2, 3, 4, 5, 6]
      去掉一层括号
    */
  
    const template = fs.readFileSync(config.htmlTemplate).toString();
    //获取html模板文件
    if (program.ssr) {
      //如果build的时候传入的第一个参数含有ssr属性，那么我们执行这里的逻辑
      const routesPath = getRoutesPath(path.join(process.cwd(), config.theme));
      //在src同级目录temp下创建一个routes.js，是对routes.nunjucks.js进行渲染后得到的结果
      const data = require(path.join(ssrDataPath, 'data'));
      //其中ssrDataPath表示的就是我们在src同级目录下创建的temp目录
      const routes = require(routesPath)(data);
      //加载我们在cwd/site/theme下配置的index.js，其中配置的是路由文件，然后同时把我们的temp/data目录传入到这个文件中
      const fileCreatedPromises = filesNeedCreated.map((file) => {
        const output = path.join(config.output, file);
        mkdirp.sync(path.dirname(output));
        //创建文件
        return new Promise((resolve) => {
          ssr(routes, filenameToUrl(file), (content) => {
            const fileContent = nunjucks
                    .renderString(template, { root: config.root, content });
            //渲染我们的theme下的html模板，传入root和content
            fs.writeFileSync(output, fileContent);
            //写入文件到输出路径
            console.log('Created: ', output);
            resolve();
            //resolve我们的promise
          });
        });
      });
      Promise.all(fileCreatedPromises)
        .then(() => {
          if (callback) {
            callback();
          }
        });
    } else {
      //第一个参数没有ssr属性的情况下
      const fileContent = nunjucks.renderString(template, { root: config.root });
      filesNeedCreated.forEach((file) => {
        const output = path.join(config.output, file);
        mkdirp.sync(path.dirname(output));
        fs.writeFileSync(output, fileContent);
        console.log('Created: ', output);
      });

      if (callback) {
        callback();
      }
    }
  });
};
/*
  (1)basePath的参数值为path.join(process.cwd(), output);
*/
function pushToGhPages(basePath) {
  const options = {
    depth: 1,
    logger(message) {
      console.log(message);
    },
  };
  if (process.env.RUN_ENV_USER) {
    options.user = {
      name: process.env.RUN_ENV_USER,
      email: process.env.RUN_ENV_EMAIL,
    };
  }
  ghPages.publish(basePath, options, (err) => {
    if (err) {
      throw err;
    }
    console.log('Site has been published!');
  });
}
/*
   (1)下面是package.json中对于deploy的配置（https://www.zybuluo.com/yangfch3/note/249328）：
     "deploy": "npm run clean && npm run site && bisheng gh-pages --push-only"。
     如果有pushonly和没有pushonly是两个不同的逻辑。pushOnly表示是否只是把文件发布到github
   (2)如果不仅仅是发布，那么我们找到配置文件，也就是bisheng.config.js然后调用build命令
*/
exports.deploy = function deploy(program) {
  if (program.pushOnly) {
    const output = typeof program.pushOnly === 'string' ? program.pushOnly : './_site';
    const basePath = path.join(process.cwd(), output);
    pushToGhPages(basePath);
  } else {
    const configFile = path.join(process.cwd(), program.config || 'bisheng.config.js');
    const config = getConfig(configFile);
    const basePath = path.join(process.cwd(), config.output);
    exports.build(program, () => pushToGhPages(basePath));
  }
};
