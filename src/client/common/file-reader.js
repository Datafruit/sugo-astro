
//html5 FileReader Promise
const { FileReader } = window

export default function readFile(file) {
  return new Promise((resolve, reject) => {
    let reader = new FileReader()
    reader.onload = (e) => {
      resolve(e.target.result)
    }
    reader.onerror = (e) => {
      resolve({
        error: e
      })
    }
    reader.readAsText(file)
  })
}