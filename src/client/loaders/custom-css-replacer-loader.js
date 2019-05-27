module.exports = exports.default = function (source) {
  this.cacheable()
  return source
    .replace(/border-radius: ?0 6px 6px 0/g, 'border-radius:0 3px 3px 0')
    .replace(/border-radius: ?6px 0 0 6px/g, 'border-radius:3px 0 0 3px')
    .replace(/border-radius: ?6px/g, 'border-radius:3px')
    .replace(/border-radius: ?0 6px/g, 'border-radius:0 3px')
    .replace(/#49a9ee/g, '#504762')
    .replace(/#108ee9/g, '#504762')
    .replace(/#ecf6fd/g, '#e0e0e0')
}
