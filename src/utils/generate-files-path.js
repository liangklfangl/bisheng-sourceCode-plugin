'use strict';

const R = require('ramda');
//ramda组件面向函数编程
const exist = require('exist.js');
//exist.js
const join = require('path').join;
//hasParams(item.path)
function hasParams(path) {
  return path.split('/').some((snippet) => snippet.startsWith(':'));
}


function has404(filesPath) {
  return filesPath.indexOf('/404.html') >= 0;
}
/*
  (1)如果没有dataPath，那么赋值为path的属性值
  (2)nestedRoutes表示是最终的路径，是routes下的path和childRoute下的path进行链接后得到的
  (3)R.chain是一个从右到左执行的方式，首先会更新childRoutes中每一个对象的path的属性为最新的属性，然后得到类似于
     childRoutes的集合数组，然后对这个数组进行处理，得到最后的结构如下：
     第一步：更新每一个childRoutes对象的path属性
        childRoutes: [{
          path: '/index-cn',
          component: homeTmpl,
          dataPath: '/',
        }, {
          path: '/docs/practice/:children',
          component: contentTmpl,
        }, {
          path: '/docs/pattern/:children',
          component: contentTmpl,
        }, {
          path: '/docs/react/:children',
          component: contentTmpl,
        }, {
          path: '/changelog',
          component: contentTmpl,
          dataPath: 'CHANGELOG',
        }, {
          path: '/changelog-cn',
          component: contentTmpl,
          dataPath: 'CHANGELOG',
        }, {
          path: '/components/:children/',
          component: contentTmpl,
        }, {
          path: '/docs/spec/:children',
          component: contentTmpl,
        }, {
          path: '/docs/resource/:children',
          component: contentTmpl,
        }]
    第二步：对这数组运行flattenRoutes方法，结果是得到一个数组，该数组中的每一个元素的path修改成为datapath属性
      childRoutes: [{
          dataPath: '/index-cn',
          component: homeTmpl,
          dataPath: '/',
        }, {
          dataPath: '/docs/practice/:children',
          component: contentTmpl,
        }, {
          dataPath: '/docs/pattern/:children',
          component: contentTmpl,
        }, {
          dataPath: '/docs/react/:children',
          component: contentTmpl,
        }, {
          dataPath: '/changelog',
          component: contentTmpl,
          dataPath: 'CHANGELOG',
        }, {
          dataPath: '/changelog-cn',
          component: contentTmpl,
          dataPath: 'CHANGELOG',
        }, {
          dataPath: '/components/:children/',
          component: contentTmpl,
        }, {
          dataPath: '/docs/spec/:children',
          component: contentTmpl,
        }, {
          dataPath: '/docs/resource/:children',
          component: contentTmpl,
        }]
   最后将前面的两个集合合并起来得到如下的内容，其中第一个元素就是最大层级的元素：
    childRoutes: [{
      path: '/',
      component: './template/Layout/index',
      indexRoute: { component: homeTmpl },
      //http://www.ruanyifeng.com/blog/2016/05/react_router.html
      childRoutes: [{
        path: 'index-cn',
        component: homeTmpl,
        dataPath: '/',
      }, {
        path: 'docs/practice/:children',
        component: contentTmpl,
      }, {
        path: 'docs/pattern/:children',
        component: contentTmpl,
      }, {
        path: 'docs/react/:children',
        component: contentTmpl,
      }, {
        path: 'changelog',
        component: contentTmpl,
        dataPath: 'CHANGELOG',
      }, {
        path: 'changelog-cn',
        component: contentTmpl,
        dataPath: 'CHANGELOG',
      }, {
        path: 'components/:children/',
        component: contentTmpl,
      }, {
        path: 'docs/spec/:children',
        component: contentTmpl,
      }, {
        path: 'docs/resource/:children',
        component: contentTmpl,
      }],
    },   
       {
          dataPath: '/index-cn',
          component: homeTmpl,
          dataPath: '/',
        }, {
          dataPath: '/docs/practice/:children',
          component: contentTmpl,
        }, {
          dataPath: '/docs/pattern/:children',
          component: contentTmpl,
        }, {
          dataPath: '/docs/react/:children',
          component: contentTmpl,
        }, {
          dataPath: '/changelog',
          component: contentTmpl,
          dataPath: 'CHANGELOG',
        }, {
          dataPath: '/changelog-cn',
          component: contentTmpl,
          dataPath: 'CHANGELOG',
        }, {
          dataPath: '/components/:children/',
          component: contentTmpl,
        }, {
          dataPath: '/docs/spec/:children',
          component: contentTmpl,
        }, {
          dataPath: '/docs/resource/:children',
          component: contentTmpl,
        }]
  注意：上面并不是把path替换为dataPath，而是两个会同时存在
 (4)使用的是我们的chain函数，虽然每一个map后的元素最后经过flattenRoutes后得到的都是一个数组，但是最后调用concat
    方法都会变成一个对象。例子如下：  
    function flattenRoutes(routes) {
      let flattenedRoutes = [];
      (Array.isArray(routes) ? routes : [routes]).forEach((item) => {
        const copy = Object.assign({}, item);
        if (!copy.dataPath) {
          copy.dataPath = copy.path;
        }
        flattenedRoutes.push(copy);
        if (item.childRoutes) {
          const nestedRoutes = R.chain(flattenRoutes, item.childRoutes.map((child) => {
            return Object.assign({}, child, {
              path: item.path+"/"+child.path
            })
          }));
          //R.chain结束
          flattenedRoutes = flattenedRoutes.concat(nestedRoutes);
        }
      });
      return flattenedRoutes;
    }
     var routes={
        path: '/',
        component: './template/Layout/index',
        //如果路径是/，那么我们就会实例化这个html
        indexRoute: { component: 'hello' },
        //IndexRoute显式指定homeTmpl是根路由的子组件，即指定默认情况下加载的子组件
        //http://www.ruanyifeng.com/blog/2016/05/react_router.html
        childRoutes: [{
          path: 'index-cn',
          component: 'hello',
          dataPath: '/',
        }, {
          path: 'docs/practice/:children',
          component: 'hello',
        }, {
          path: 'docs/pattern/:children',
          component: 'hello',
        }, {
          path: 'docs/react/:children',
          component: 'hello',
        }, {
          path: 'changelog',
          component: 'hello',
          dataPath: 'CHANGELOG',
        }, {
          path: 'changelog-cn',
          component: 'hello',
          dataPath: 'CHANGELOG',
        }, {
          path: 'components/:children/',
          component: 'hello',
        }, {
          path: 'docs/spec/:children',
          component: 'hello',
        }, {
          path: 'docs/resource/:children',
          component: 'hello',
        }],
      }
    flattenRoutes(routes);
  调试地址：http://ramdajs.com/repl/，见utils/flattenRoutes.js
  注意：我们传递给我们的flattenRoutes方法的还是数组的元素，可以参考下面这个demo例子：
     var duplicate = n => [n, n];
    R.chain(duplicate, [1, 2, 3]); //=> [1, 1, 2, 2, 3, 3]
    R.chain(R.append, R.head)([1, 2, 3]); //=> [1, 2, 3, 1]
   虽然，每一个元素运行duplicate方法都是得到一个数组，但是最后通过chain方法得到的依然是一级数组
*/

function flattenRoutes(routes) {
  let flattenedRoutes = [];
  (Array.isArray(routes) ? routes : [routes]).forEach((item) => {
    const copy = Object.assign({}, item);
    if (!copy.dataPath) {
      copy.dataPath = copy.path;
    }
    flattenedRoutes.push(copy);
    if (item.childRoutes) {
      const nestedRoutes = R.chain(flattenRoutes, item.childRoutes.map((child) => {
        return Object.assign({}, child, {
          path: join(item.path, child.path),
        });
      }));
      //R.chain结束
      flattenedRoutes = flattenedRoutes.concat(nestedRoutes);
    }
  });
  return flattenedRoutes;
}
/*（1）产生文件路径，传入的是我们的routes对象（在theme/index.js文件）以及markdown数据
routes: {
    path: '/',
    component: './template/Layout/index',
    //如果路径是/，那么我们就会实例化这个html
    indexRoute: { component: homeTmpl },
    //IndexRoute显式指定homeTmpl是根路由的子组件，即指定默认情况下加载的子组件
    //http://www.ruanyifeng.com/blog/2016/05/react_router.html
    childRoutes: [{
      path: 'index-cn',
      component: homeTmpl,
      dataPath: '/',
    }, {
      path: 'docs/practice/:children',
      component: contentTmpl,
    }, {
      path: 'docs/pattern/:children',
      component: contentTmpl,
    }, {
      path: 'docs/react/:children',
      component: contentTmpl,
    }, {
      path: 'changelog',
      component: contentTmpl,
      dataPath: 'CHANGELOG',
    }, {
      path: 'changelog-cn',
      component: contentTmpl,
      dataPath: 'CHANGELOG',
    }, {
      path: 'components/:children/',
      component: contentTmpl,
    }, {
      path: 'docs/spec/:children',
      component: contentTmpl,
    }, {
      path: 'docs/resource/:children',
      component: contentTmpl,
    }],
  }
  判断path.split('/').some((snippet) => snippet.startsWith(':'));
（2）调用方式如下：
    let filesNeedCreated = generateFilesPath(themeConfig.routes, markdown).map(config.filePathMapper);
(3)chain方法是对flattenedRoutes中每一个元素都会运行这个方法的，如果path以'/'结尾，那么直接返回/index.html，如果有参数
(4)我们的path如果含有参数，那么我们会把里面的参数全部替换掉，如children替换成为具体的文件名
(5)如果path有参数，那么要使用markdown中的相应部分替换掉。如'docs/spec/:children'，最后会得到['spec',':children']
   数组有findIndex方法，得到":children"字段的下标。得到markdowndata的'docs/spec'的数据，然后使用每一个key中file.md中的file部分来替换掉我们的参数children
注意：item.dataPath.split('/').slice(1)，这里的dataPath是更新过的，是像'/docs/pattern/:children'这种类型，也就是最前面已经和
    最外面的那么元素的path合并过了！所以是包含一级目录，这也就是和markdown数据对起来了
*/
module.exports = function generateFilesPath(routes, markdown) {
  const flattenedRoutes = flattenRoutes(routes);
  const filesPath = R.chain((item) => {
    if (hasParams(item.path)) {
      const dataPathSnippets = item.dataPath.split('/').slice(1);
      const firstParamIndex = dataPathSnippets.findIndex((snippet) => snippet.startsWith(':'));
      const firstParam = dataPathSnippets[firstParamIndex];
      const dataSet = exist.get(markdown, dataPathSnippets.slice(0, firstParamIndex), {});
      //注意：这里是获取markdown中的数据的'spec'一直到后面的参数部分，不包含我们的docs部分
      const processedCompleteRoutes = Object.keys(dataSet).map((key) => {
        const pathSnippet = key.replace(/\.md/, '');
        const path = item.path.replace(firstParam, pathSnippet);
        //用dataSet下的key来替换掉我们的children参数占位符
        const dataPath = item.dataPath.replace(firstParam, pathSnippet);
        return { path, dataPath };
      });

      return generateFilesPath(processedCompleteRoutes, markdown);

    } else if (item.path.endsWith('/')) {
      return [`${item.path}index.html`];
    }
    return [`${item.path}.html`];
  }, flattenedRoutes);

  return has404(filesPath) ? filesPath : filesPath.concat('/404.html');
};
