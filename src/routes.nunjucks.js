'use strict';

const chain = require('ramda/src/chain');
const toReactComponent = require('jsonml-to-react-component');
//引入jsonml-to-react-component
const exist = require('exist.js');
const NProgress = require('nprogress');
//引入nprogress
const NotFound = require('{{ themePath }}/template/NotFound');
//我们的NotFound这个组件的位置，传入的themePath就是我们的'cwd()/site/theme'这个路径

/*(1)调用方式如下：
    const propsPath = calcPropsPath(dataPath, nextState.params);
   这个函数的作用就是：把相应位置的参数用参数的值进行替换就可以了，也就是说计算参数的值
*/
function calcPropsPath(dataPath, params) {
  return Object.keys(params).reduce(
    (path, param) => path.replace(`:${param}`, params[param]),
    dataPath
  );
}

/*表示是否有参数*/
function hasParams(dataPath) {
  return dataPath.split('/').some((snippet) => snippet.startsWith(':'));
}

function defaultCollect(nextProps, callback) {
  callback(null, nextProps);
}
/*
(1)调用方式如下：
    function getRoutesPath(themePath) {
    const routesPath = path.join(__dirname, '..', 'tmp', 'routes.js');
    fs.writeFileSync(
      routesPath,
      nunjucks.renderString(routesTemplate, { themePath })
    );
    return routesPath;
  }
所以，我们是写入一个文件到cwd/tmp/routes.js，传入的themePath就是我们的'cwd/site/theme'这个路径
(2)获取其中的converters集合，然后创建一个utils对象，同时这个对象的toReactComponent方法会接受这个
   converters作为转换数组，同时把plugins中原来具有的utils对象的方法全部封装到我们的现在的新的util中
(3)获取我们在theme/index.js中配置的路由文件,并把这个routes对象封装到数组里面去
   routes: {
    path: '/',
    component: './template/Layout/index',
    indexRoute: { component: homeTmpl },
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
};
*/
module.exports = function getRoutes(data) {
  const plugins = data.plugins;
  const converters = chain((plugin) => plugin.converters || [], plugins);
  const utils = {
    get: exist.get,
    toReactComponent(jsonml) {
      return toReactComponent(jsonml, converters);
    },
  };
  plugins.map((plugin) => plugin.utils || {})
    .forEach((u) => Object.assign(utils, u));
  /*
   (1)调用方法如下：
     templateWrapper(route.component, route.dataPath || route.path),其中传入的routes.component参数是一个字符串
      const homeTmpl = './template/Home/index';
      const contentTmpl = './template/Content/index';
     所以，此时Template变量获取的就是一个明确的路径的文件了，但是templateWrapper返回的是一个闭包函数，接受nextState和callback参数
  (2)计算得到我们最后的替换了参数后的值
     calcPropsPath(dataPath, nextState.params)
  (3)我们会查找每一个指定的组件是否含有collect方法，如果有就会调用
     const collect = Template.collect || defaultCollect;
  */
  function templateWrapper(template, dataPath = '') {
    const Template = require('{{ themePath }}/template' + template.replace(/^\.\/template/, ''));
    return (nextState, callback) => {
      const propsPath = calcPropsPath(dataPath, nextState.params);
      const pageData = exist.get(data.markdown, propsPath.replace(/^\//, '').split('/'));
      const collect = Template.collect || defaultCollect;
      //传入的值包括nextState，还有{data:{},picked:{},pageData:{},utils:{}}
      //回调函数的第二个函数参数就是上面的这个对象
      collect(Object.assign({}, nextState, {
        data: data.markdown,
        picked: data.picked,
        pageData,
        utils,
      }), (err, nextProps) => {
        //如果是ES6的export default来导出的，那么需要加入.default，而module.exports是不需要的
        const Comp = (hasParams(dataPath) || pageData) && err !== 404 ?
                Template.default || Template : NotFound.default || NotFound;
         //如果不是404，那么执行exports.default对象，否则执行组件NotFound这个Component
        const dynamicPropsKey = nextState.location.pathname;
        //获取下一个pathname
        Comp[dynamicPropsKey] = nextProps;
        //为Comp组件添加props属性，可以通过this.props来获取
        //这个要实例化的组件传入我们的值，其中key为dynamicPropsKey，nextProps就是变换url后组件的数据
        //在create-element中是如此配置的：<Component {...props} {...Component[dynamicPropsKey]} />
        callback(err === 404 ? null : err, Comp);
        //为我们的callback传入组件，可以在这个链接查看getComponent的返回值https://react-guide.github.io/react-router-cn/docs/guides/advanced/DynamicRouting.html
      });
    };
  }

  const theme = require('{{ themePath }}');
  const routes = Array.isArray(theme.routes) ? theme.routes : [theme.routes];
  function processRoutes(route) {
    if (Array.isArray(route)) {
      return route.map(processRoutes);
    }
     /*
      (1)为我们的每一个route对象封装一个onEnter/component/getComponent/indexRoute/childRoutes
      (2)为这个数组中添加一个对象为表示未发现这个组件的：
           {
            path: '*',
            getComponents: templateWrapper('./template/NotFound'),
          }
     (3)getComponent: templateWrapper(route.component, route.dataPath || route.path)我们是调用templateWrapper
        并传入route.component和route.path
     (4)对childRoutes中每一个元素都进行同样的处理，为他们添加component，getComponent等方法
        route.childRoutes && route.childRoutes.map(processRoutes)
      所以最后得到的结果类似于：
        {
        path: 'index-cn',
        component: null,
        dataPath: '/',
        onEnter:function(){},
        getComponent: templateWrapper(route.component, route.dataPath || route.path),
        childRoutes:[]
      }
     (4)onEnter钩子函数的作用如下：（http://www.ruanyifeng.com/blog/2016/05/react_router.html）
        onEnter(nextState, replace, callback?)
        Called when a route is about to be entered. It provides the next router state and a function to redirect to another path. 
        this will be the route instance that triggered the hook.If callback is listed as a 3rd argument, this hook will run 
        asynchronously, and the transition will block until callback is called.

      注意：当路由满足某一个Router的路径匹配的时候，我们就会实力化这个router
     */
    return Object.assign({}, route, {
      onEnter: () => {
        if (typeof document !== 'undefined') {
          NProgress.start();
        }
      },
      component: undefined,
      //Same as component but asynchronous, useful for code-splitting.
      //getComponent用法：https://github.com/liangklfang/react-router/blob/master/docs/API.md#getcomponentsnextstate-callback
      //这里是使用了懒加载：http://www.mtons.com/content/61.htm
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
  }

  const processedRoutes = processRoutes(routes);
  processedRoutes.push({
    path: '*',
    getComponents: templateWrapper('./template/NotFound'),
  });

  return processedRoutes;
};
