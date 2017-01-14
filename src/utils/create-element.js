'use strict';

/* eslint-disable no-unused-vars */
const React = require('react');
/* eslint-enable no-unused-vars */
const NProgress = require('nprogress');
//为ajax应用添加一个进度条
//https://github.com/liangklfang/react-router/blob/master/docs/API.md
module.exports = function createElement(Component, props) {
  NProgress.done();
  const dynamicPropsKey = props.location.pathname;
  //获取location中的pathname
  return <Component {...props} {...Component[dynamicPropsKey]} />;
};
