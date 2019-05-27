/**
 * Created on 10/05/2017.
 */

/**
 * @param {String} mark
 * @return {String}
 */
function creator (mark) {
  return `model-data-source-${mark}`
}

export default {
  query: creator('query'),
  create: creator('create'),
  update: creator('update'),
  del: creator('del')
}
