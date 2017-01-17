'use strict';

var chain = require('ramda/src/chain');
var _toReactComponent = require('jsonml-to-react-component');
var exist = require('exist.js');
//这里引入了exist和_toReactComponent方法
var NProgress = require('nprogress');
var NotFound = require('/Users/qingtian/Desktop/sy-standard-project/site/theme/template/NotFound');

function calcPropsPath(dataPath, params) {
  return Object.keys(params).reduce(function (path, param) {
    return path.replace(':' + param, params[param]);
  }, dataPath);
}

function hasParams(dataPath) {
  return dataPath.split('/').some(function (snippet) {
    return snippet.startsWith(':');
  });
}

function defaultCollect(nextProps, callback) {
  callback(null, nextProps);
}

module.exports = function getRoutes(data) {
  var plugins = data.plugins;
  var converters = chain(function (plugin) {
    return plugin.converters || [];
  }, plugins);


 //utils有exists对象的get方法，以及toReactComponent方法
  var utils = {
    get: exist.get,
    toReactComponent: function toReactComponent(jsonml) {
      return _toReactComponent(jsonml, converters);
    }
  };


  plugins.map(function (plugin) {
    return plugin.utils || {};
  }).forEach(function (u) {
    return Object.assign(utils, u);
  });
  //把原本的其他插件的utils全部封装到当前的utils对象上面

  function templateWrapper(template) {
    var dataPath = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : '';

    var Template = require('/Users/qingtian/Desktop/sy-standard-project/site/theme/template' + template.replace(/^\.\/template/, ''));

    return function (nextState, callback) {
      var propsPath = calcPropsPath(dataPath, nextState.params);
      var pageData = exist.get(data.markdown, propsPath.replace(/^\//, '').split('/'));
      var collect = Template.collect || defaultCollect;
      collect(Object.assign({}, nextState, {
        data: data.markdown,
        picked: data.picked,
        pageData: pageData,
        utils: utils
      }), function (err, nextProps) {
        var Comp = (hasParams(dataPath) || pageData) && err !== 404 ? Template.default || Template : NotFound.default || NotFound;
        var dynamicPropsKey = nextState.location.pathname;
        Comp[dynamicPropsKey] = nextProps;
        callback(err === 404 ? null : err, Comp);
      });
    };
  }

  var theme = require('/Users/qingtian/Desktop/sy-standard-project/site/theme');
  var routes = Array.isArray(theme.routes) ? theme.routes : [theme.routes];

  function processRoutes(route) {
    if (Array.isArray(route)) {
      return route.map(processRoutes);
    }

    return Object.assign({}, route, {
      onEnter: function onEnter() {
        if (typeof document !== 'undefined') {
          NProgress.start();
        }
      },
      component: undefined,
      getComponent: templateWrapper(route.component, route.dataPath || route.path),
      indexRoute: route.indexRoute && Object.assign({}, route.indexRoute, {
        component: undefined,
        getComponent: templateWrapper(route.indexRoute.component, route.indexRoute.dataPath || route.indexRoute.path)
      }),
      childRoutes: route.childRoutes && route.childRoutes.map(processRoutes)
    });
  }

  var processedRoutes = processRoutes(routes);
  processedRoutes.push({
    path: '*',
    getComponents: templateWrapper('./template/NotFound')
  });

  return processedRoutes;
};