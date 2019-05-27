export default function buildTree(slices) {
  return slices.reduce((before, slice) => {
    before['id' + slice.id] = slice
    return before
  }, {})
}
