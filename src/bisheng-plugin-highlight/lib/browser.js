'use strict';

var React = require('react');
var JsonML = require('jsonml.js/lib/utils');

module.exports = function() {
  return {
    converters: [
    //converters是一个数组，里面每一个元素都是一个数组
      [
        function(node) { return JsonML.isElement(node) && JsonML.getTagName(node) === 'pre'; },
        //第一个函数是获取我们的pre标签
        function(node, index) {
          var attr = JsonML.getAttributes(node);
          //获取我们的pre标签的属性
          return React.createElement('pre', {
            key: index,
            className: 'language-' + attr.lang,
          }, React.createElement('code', {
            dangerouslySetInnerHTML: { __html: attr.highlighted },
            //创建我们的code标签，其中的内容是我们的highlighted属性值
          }));
        },
      ],
    ],
  };
};
