//safe id for plyql
// no '-' no '$'

import { generate } from 'shortid'
export default function sid () {
  let ret
  for (; ;) {
    ret = generate()
    if (ret.indexOf('-') < 0) break
  }
  return ret
}
