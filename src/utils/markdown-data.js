'use strict';

const fs = require('fs');
const path = require('path');
const R = require('ramda');
const markTwain = require('mark-twain');


/*
 (1)如果是数组那么原样返回，否则变化为数组
*/
function ensureToBeArray(maybeArray) {
  return Array.isArray(maybeArray) ?
    maybeArray : [maybeArray];
}

/*
 (1)判断是否是directory也就是文件夹
*/
function isDirectory(filename) {
  return fs.statSync(filename).isDirectory();
}

/*
（1）path.extname('index.coffee.md')返回后面的文件的后缀，如这里就是返回'.md'
（2）作用：通过名字就知道是返回我们的markdown文件！
*/
function isMDFile(filename) {
  const ext = path.extname(filename);
  return !isDirectory(filename) && ext === '.md';
}

/*
 (1)调用方式： const mds = findMDFile(ensureToBeArray(source))，其中pipe方法表示从左到右管道式调用，其中either
    只要满足一个条件就是可以了，所以这里我们只会处理文件夹和markdown文件！
 (2)如果是一个文件夹，lib/index1.js和lib/index2.js，而且我们传入的是lib，那么返回的数组就是['lib/index.js','lib/index1.js']
    最后返回的就是[['lib/index.js'],['lib/index1.js']],如果传入的就是一个文件['lib/index.js']
 (3)测试函数：
   function recursive(val){
     if(Array.isArray(val)){
      return val.map(function(v){return [v]})
      }
    }
   测试数据recursive(['name','sex'])，最后得到[[],[]]这种数据格式
(4)我们的source是如下配置的：
 source: [
      './components',
      './docs',
      'CHANGELOG.zh-CN.md', // TODO: fix it in bisheng
      'CHANGELOG.en-US.md',
    ]
(5)返回的格式是['components/alert/index']这样的数组
*/
function findMDFile(source) {
  return R.pipe(
    R.filter(R.either(isDirectory, isMDFile)),
    R.chain((filename) => {
      if (isDirectory(filename)) {
        const subFiles = fs.readdirSync(filename)
                .map((subFile) => path.join(filename, subFile));
        return findMDFile(subFiles);
      }
      return [filename];
    })
  )(source);
}


const rxSep = new RegExp(`[${path.sep}.]`);
 /*
  (1)findMDFile会返回一个路径的数组，如果是文件夹最后返回的就是[['lib/index.md','lib/index1.md']],
    如果传入的就是一个文件['lib/index.js']。这个数组会传入到这个文件里面
  (2)R.lensPath方法如下：
       var xHeadYLens = R.lensPath(['x', 0, 'y']);
       R.view(xHeadYLens, {x: [{y: 2, z: 3}, {y: 4, z: 5}]});
      //=> 2
  (3)propLens返回的是一个函数，lensPath接受的是一个对象的查询路径，如这里有可能是['lib','index'],如果这里传入的
    files集合为['lib/index.js']，那么fileTree就是一个{}，然后filename就是'lib/index.js'，而propLens最后
    得到的就是返回一个指定路径，即['lib','index']路径的函数，所以最后fileTree得到的结果如下：
     var filesTree=
     {
       lib:{
           index:"lib/index"
         }
     }
    那么最后就是:
         posts
          ├── a.md
          └── b.md
    转化为：
        {
          posts: {
            a: {...},
            b: {...},
          },
        }
  如文件名为:'components/button/index.zh-CN.md',那么propLens最后得到的就是R.lensPath(['components','button',index.zh-CN])
   {
      components：{
          button:{
              index.zh-CN:'components/button/index.zh-CN.md',
              index.en-US:'components/button/index.en-US.md'
          },
          alert:{
              index.zh-CN:'components/alert/index.zh-CN.md',
              index.en-US:'components/alert/index.en-US.md'
          }
      }
   }
*/
function filesToTreeStructure(files) {
  return files.reduce((filesTree, filename) => {
    const propLens = R.lensPath(filename.replace(/\.md$/i, '').split(rxSep));
    return R.set(propLens, filename, filesTree);
  }, {});
}

/*
  (1)调用方式如下：
    stringifyObject(nodePath, obj, lazyLoad, isSSR, depth)
  (2)R.toPairs使用如下：
    R.toPairs({a: 1, b: 2, c: 3}); //=> [['a', 1], ['b', 2], ['c', 3]]

*/
function stringifyObject(nodePath, obj, lazyLoad, isSSR, depth) {
  const indent = '  '.repeat(depth);
  const kvStrings = R.pipe(
    R.toPairs,
    R.map((kv) => //这每一个rv对象都是这样的['a','1']第一个元素是key，第二个为value
          `${indent}  '${kv[0]}': ${stringify(nodePath + '/' + kv[0], kv[1], lazyLoad, isSSR, depth + 1)},`)
  )(obj);
  return kvStrings.join('\n');
}

/*
 (1)调用方式如下：
    lazyLoadWrapper(filePath, nodePath.replace(/^\/+/, ''), isSSR);
 (2)require.ensure方法的使用如下：
   http://www.injectjs.com/docs/0.4.x/api/require.ensure.html
 (3)下面是这个函数的一个测试例子：
   var result=lazyLoadWrapper('/bisheng/lib/','index.js',false);
    result;
    测试返回内容如下：
   function () {
    return new Promise(function (resolve) {
      require.ensure([], function (require) {
        resolve(require('/bisheng/lib/'));
      }, 'index.js');
    });
  }
  如果第三个参数为true，那么就会返回下面的部分：
   function () {
      return new Promise(function (resolve) {
          resolve(require('/bisheng/lib/'));
      });
    }
 (4) require-ensure参数
  说明: require.ensure在需要的时候才下载依赖的模块，当参数指定的模块都下载下来了（下载下来的模块还没执行），便执行参数指定的回调函数。require.ensure会创建一个chunk，且可以指定该chunk的名称，如果这个chunk名已经存在了，则将本次依赖的模块合并到已经存在的chunk中，最后这个chunk在webpack构建的时候会单独生成一个文件。
  语法: require.ensure(dependencies: String[], callback: function([require]), [chunkName: String])
  dependencies: 依赖的模块数组
  callback: 回调函数，该函数调用时会传一个require参数
  chunkName: 模块名，用于构建时生成文件时命名使用
  注意点：requi.ensure的模块只会被下载下来，不会被执行，只有在回调函数使用require(模块名)后，这个模块才会被执行。
  详见：http://blog.csdn.net/zhbhun/article/details/46826129
 （5）Every loader is allowed to deliver its result as String or as Buffer. The compiler converts them between loaders.
     也就是说我们的loader虽然返回的是字符串，但是编辑器可以把它在Buffer/Strint之间自动转化
*/
function lazyLoadWrapper(filePath, filename, isSSR) {
  return 'function () {\n' +
    '  return new Promise(function (resolve) {\n' +
    (isSSR ? '' : '    require.ensure([], function (require) {\n') +
    `      resolve(require('${filePath}'));\n` +
    (isSSR ? '' : `    }, '${filename}');\n`) +
    '  });\n' +
    '}';
}

/*
  (1)如果第三个参数lazyload是一个函数，那么我们直接调用这个函数，同时传入我们的nodePath和nodeValue参数；
     如果传入的nodeValue是一个对象，那么不会懒加载
*/
function shouldLazyLoad(nodePath, nodeValue, lazyLoad) {
  if (typeof lazyLoad === 'function') {
    return lazyLoad(nodePath, nodeValue);
  }
  return typeof nodeValue === 'object' ? false : lazyLoad;
}

/*(1)调用方式如下，其中参数markdown是调用这个文件的generate方法返回的：
   markdownData.stringify(markdown, config.lazyLoad, isSSR)
  (2)R.cond的用法如下：
     var fn = R.cond([
      [R.equals(0),   R.always('water freezes at 0°C')],
      [R.equals(100), R.always('water boils at 100°C')],
      [R.T,           temp => 'nothing special happens at ' + temp + '°C']
    ]);
    fn(0); //=> 'water freezes at 0°C'
    fn(50); //=> 'nothing special happens at 50°C'
    fn(100); //=> 'water boils at 100°C'
*/
function stringify(nodePath, nodeValue, lazyLoad, isSSR, depth) {
  const indent = '  '.repeat(depth);
  const shouldBeLazy = shouldLazyLoad(nodePath, nodeValue, lazyLoad);
  return R.cond([
    [(n) => typeof n === 'object', (obj) => { //这里会接受到后面的nodeValue作为参数
      if (shouldBeLazy) {
        const filePath = path.join(
          __dirname, '..', '..', 'tmp',
          nodePath.replace(/^\/+/, '').replace(/\//g, '-')
        );
        const fileContent = 'module.exports = ' +
                `{\n${stringifyObject(nodePath, obj, false, isSSR, 1)}\n}`;
          //对内容进行string化
        fs.writeFileSync(filePath, fileContent);
        //写到temp目录下我们的文件
        return lazyLoadWrapper(filePath, nodePath.replace(/^\/+/, ''), isSSR);
      }
       //如果不需要懒加载，那么我们直接调用stringifyObject就可以了
      return `{\n${stringifyObject(nodePath, obj, lazyLoad, isSSR, depth)}\n${indent}}`;
    }],
    [R.T, (filename) => {
      const filePath = path.join(process.cwd(), filename);
      if (shouldBeLazy) {
        return lazyLoadWrapper(filePath, filename, isSSR);
      }
      return `require('${filePath}')`;
    }],
  ])(nodeValue);
}

/*
 (1)调用方式为markdownData.generate(config.source);如果source是Object对象，但是不是数组，那么对对象里面的值进行
    操作；在bisheng.js中是如下配置的：
      source: [
      './components',
      './docs',
      'CHANGELOG.zh-CN.md', // TODO: fix it in bisheng
      'CHANGELOG.en-US.md',
    ]
 (2)使用mapObjIndexed方法如下：
      var values = { x: 1, y: 2, z: 3 };
      var prependKeyAndDouble = (num, key, obj) => key + (num * 2);
      R.mapObjIndexed(prependKeyAndDouble, values); //=> { x: 'x2', y: 'y4', z: 'z6' }
(3)findMDFile会返回一个路径的数组，如果是文件夹最后返回的就是[['lib/index.js','lib/index1.js']],
    如果传入的就是一个文件['lib/index.js']
*/
exports.generate = function generate(source) {
  if (R.is(Object, source) && !Array.isArray(source)) {
    return R.mapObjIndexed((value) => generate(value), source);
  } else {
    const mds = findMDFile(ensureToBeArray(source));
    const filesTree = filesToTreeStructure(mds);
    return filesTree;
  }
};

exports.stringify = (filesTree, lazyLoad, isSSR) =>
  stringify('/', filesTree, lazyLoad, isSSR, 0);


/*
 （1）traverse的作用就是如果key对应的value是一个字符串，那么我们直接把这个字符串作为参数传入到我们的第二个函数中执行
      否则继续遍历这个对象，直到遍历出来字符串
*/
exports.traverse = function traverse(filesTree, fn) {
  Object.keys(filesTree).forEach((key) => {
    const value = filesTree[key];
    if (typeof value === 'string') {
      fn(value);
      return;
    }

    traverse(value, fn);
  });
};
/*
 (1)调用方式如下，其作用是对markdown进行解析：
   const parsedMarkdown = markdownData.process(filename, content, plugins, query.isBuild);
(2)我们没法直接处理markdown，所以我们可以通过mark-twain把他解析成为jsonML，然后进一步处理
  const fs = require('fs');
  const jsonML = MT(fs.readFileSync('something.md').toString());
(3)为解析出来的markdown添加meta.filename为
*/
exports.process = (filename, fileContent, plugins, isBuild/* 'undefined' | true */) => {
  const markdown = markTwain(fileContent);
  markdown.meta.filename = filename;
  /*
   这里的plugins中每一个元素都是如下的格式：
   [
      resolvedPlugin,
      pluginQuery,
    ]
  */
  const parsedMarkdown = plugins.reduce(
    (markdownData, plugin) =>
      require(plugin[0])(markdownData, plugin[1], isBuild === true),
    markdown
  );
  return parsedMarkdown;
};
