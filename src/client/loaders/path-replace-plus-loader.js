/**
 * 参考 https://github.com/yewumian/path-replace-plus-loader
 * 为了方便调试，将代码拷贝过来了
 */

'use strict';

// see: https://github.com/cvgellhorn/path-replace-loader/blob/master/index.js

var fs = require('fs');
var loaderUtils = require('loader-utils');

module.exports = function(source) {
  this.cacheable && this.cacheable();
  var query = loaderUtils.parseQuery(this.query);
  for (var i = 0; i < query.list.length; i++) {
    if (!query.list.hasOwnProperty(i)) continue;
    if (this.resourcePath.indexOf(query.list[i].path) > -1) {
      var newPath = this.resourcePath.replace(query.list[i].path, query.list[i].replacePath);
      if (fs.existsSync(newPath)) {
        console.log('redirect: ', this.resourcePath, 'to: ', newPath)
        // Introduce file to webpack in order to make them watchable
        this.dependency(newPath);
        return fs.readFileSync(newPath);
      }
    }
  }
  return source;
};

module.exports.raw = true;
