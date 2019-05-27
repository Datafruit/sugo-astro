module.exports = exports.default = function (source) {
  this.cacheable()
  return source
    .replace(/\s+debug\(.+\n/g, '\n')
  
}
