
//通用dom class方法

function addClass (elem, ...classes) {
  let cls = elem.className || ''
  elem.className = cls + (cls ? ' ' : '') + classes.join(' ')
}

function hasClass (elem, clst) {
  let cls = elem.className
  if(!cls) return false
  cls = ' ' + cls.split(/\s+/).join(' ') + ' '
  let reg = new RegExp(' ' + clst + ' ')
  return reg.test(cls)
}

function removeClass (elem, ...classes) {
  let cls = elem.className
  if(!cls) return
  cls = '  ' + cls.split(/\s+/).join('  ') + '  '
  let clst = classes.join(' ').split(/\s+/)
  let reg = new RegExp(' ' + clst.join(' | ') + ' ', 'g')
  cls = cls.replace(reg, '')
            .replace(/^\s+|\s+$/g, '')
            .replace(/ {2,}/g, ' ')

  elem.className = cls
}

export default {
  addClass,
  hasClass,
  removeClass
}
