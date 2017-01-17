'use strict';

require('babel-polyfill');
require('nprogress/nprogress.css');

/* eslint-disable no-unused-vars */
var React = require('react');
/* eslint-enable no-unused-vars */
var ReactDOM = require('react-dom');
var ReactRouter = require('react-router');
var history = require('history');
var data = require('../lib/utils/data.js');
var createElement = require('../lib/utils/create-element');
var routes = require('/Users/qingtian/Desktop/sy-standard-project/node_modules/bisheng/tmp/routes.js')(data);

var _window$location = window.location,
    pathname = _window$location.pathname,
    search = _window$location.search,
    hash = _window$location.hash;

var location = '' + pathname + search + hash;
var basename = '/';
ReactRouter.match({ routes: routes, location: location, basename: basename }, function () {
  var router = React.createElement(ReactRouter.Router, {
    history: ReactRouter.useRouterHistory(history.createHistory)({ basename: basename }),
    routes: routes,
    createElement: createElement
  });
  ReactDOM.render(router, document.getElementById('react-content'));
});