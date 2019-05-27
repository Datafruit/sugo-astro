/**
 * 不从 source 读入内容，而是从 query.path 读入，主要是为了绕过 path-replace-loader
 * 例子：
 * import Header from 'babel-loader?cacheDirectory!source-loader?path=./src/client/components/Home/header.jsx!~/src/client/components/Home/help.jsx'
 * @param source
 * @returns {string}
 */

var fs = require('fs');
var loaderUtils = require('loader-utils');
var path = require('path')

module.exports = function(ignore) {
  var query = loaderUtils.parseQuery(this.query)
  let absPath = path.resolve(query.path)
  let buf = fs.readFileSync(absPath)
  return buf.toString('utf-8')
}
