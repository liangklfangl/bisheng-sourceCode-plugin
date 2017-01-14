'use strict';

require('babel-polyfill');
require('nprogress/nprogress.css');

const React = require('react');
const ReactDOM = require('react-dom');
const ReactRouter = require('react-router');
const history = require('history');
const data = require('../lib/utils/data.js');
//这个文件只有一句代码"use strict;"
const createElement = require('../lib/utils/create-element');
const routes = require('{{ routesPath }}')(data);
/*注意：这个返回的routes既然可以作为ReactRouter.match的参数，那么表示他肯定是一个组件的嵌套类型数据
   格式如下：
   let routes = <Route path="/" component={App}>
    <Route path="/repos" component={Repos}/>
      <Route path="/about" component={About}/>
    </Route>;
    <Router routes={routes} history={browserHistory}/>
当然，我们这里获取到的data，即data = require('../lib/utils/data.js');是一个'use strict'，所以如果我们需要
配置插件，可以在这个data.js中：
*/


/*
(1)routes.nunjucks.js中会有一个导出的方法，叫做getRoutes，我们会给他传入我们的上面的一句代码'use strict;'
(2)注意这个函数的返回值是如下的形式：
    return Object.assign({}, route, {
      onEnter: () => {
        if (typeof document !== 'undefined') {
          NProgress.start();
        }
      },
      component: undefined,
      getComponent: templateWrapper(route.component, route.dataPath || route.path),
      indexRoute: route.indexRoute && Object.assign({}, route.indexRoute, {
        component: undefined,
        getComponent: templateWrapper(
          route.indexRoute.component,
          route.indexRoute.dataPath || route.indexRoute.path
        ),
      }),
      childRoutes: route.childRoutes && route.childRoutes.map(processRoutes),
    });
  也就是说这个函数返回的是一个对象，这个对象的getComponet和indexRoute都是一个函数，而childRoutes是一个数组
*/
const { pathname, search, hash } = window.location;
//获取window.location上面的属性pathname,search,hash值
const location = `${pathname}${search}${hash}`;
const basename = '{{ root }}';
/*
(1)调用方式：
  function getRoutesPath(themePath) {//传入参数为cwd/site/theme
    const routesPath = path.join(__dirname, '..', 'tmp', 'routes.js');
    fs.writeFileSync(
      routesPath,
      nunjucks.renderString(routesTemplate, { themePath })
    );
    return routesPath;
  }
   const routesPath = getRoutesPath(path.join(process.cwd(), configTheme));
   nunjucks.renderString(entryTemplate, { routesPath, root })
  所以我们传入的routesPath就是cwd/tmp/routes.js
 注意：在render这个模块的时候我们会传入routesPath表示cwd/tmp/routes.js，也就是routes文件的路径已经我们的root的变量值
(2)routes其实就是children的别名，就是路由嵌套的时候需要
(3)match方法/useHistory方法详解请参加：https://github.com/liangklfang/react-router/blob/master/docs/API.md
(4)ReactRouter的match方法用于服务端渲染，callback(error, redirectLocation, renderProps)是回调函数
*/
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
