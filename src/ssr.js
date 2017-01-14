'use strict';

const React = require('react');
const ReactDOMServer = require('react-dom/server');
const ReactRouter = require('react-router');
const createElement = require('./utils/create-element');

/*
  （1）实例化代码如下：
       ssr(routes, filenameToUrl(file), (content) => {
            const fileContent = nunjucks
                    .renderString(template, { root: config.root, content });
            fs.writeFileSync(output, fileContent);
            console.log('Created: ', output);
            resolve();
          });
*/
module.exports = function ssr(routes, url, callback) {
  ReactRouter.match({ routes, location: url }, (error, redirectLocation, renderProps) => {
    if (error) {
      callback('');
    } else if (redirectLocation) {
      callback(''); 
    } else if (renderProps) {
      const content = ReactDOMServer.renderToString(
        <ReactRouter.RouterContext {...renderProps} createElement={createElement} />
      );
      callback(content);
    } else {
      callback(''); 
    }
  });
};


