export const cleanDictionary = (dictionary, badDictionary) => {
  let newDictionary = {}
  for (let key in dictionary) {
    if (badDictionary[key]) {
      newDictionary[key] = dictionary[key].filter(word => !badDictionary[word.length].includes(word))
    } else {
      newDictionary[key] = dictionary[key]
    }
  }
  return newDictionary
}

export const createDictionary = (words) => {
  return words.reduce((r,x) => {
    const n = x.length
    if (!r[n]) { r[n] = [] }
    r[n].push(x)
    return r
  }, {})
}

export const isWord = (dictionary, word) => {
  const size = word.length
  return dictionary[size] && dictionary[size].indexOf(word) !== -1
}

export const clamp = (v, min, max) => {
  return v < min ? min : v > max ? max : v
}

export const isArrayEqual = (as,bs) => {
  return as.length == bs.length && as.every((a,i) => a === bs[i])
}

export const range = (n) => Array.from({ length: n }, (_,i) => i )

// console.assert(isArrayEqual(range(0), []))
// console.assert(isArrayEqual(range(1), [0]))
// console.assert(isArrayEqual(range(5), [0,1,2,3,4]))

export const transposeStrings = (rows) => {
  let transpose = []
  for (let row of rows) {
    for (let i = 0, m = row.length; i < m; i++) {
      if (!transpose[i]) { transpose[i] = '' }
      transpose[i] += row[i]
    }
  }
  return transpose
}

// console.assert(transposeStrings(['ABC','DEF']).join('') === 'ADBECF')
// console.assert(transposeStrings(['ABC','DEF']).length === 3)


export const randomInt = (n) => {
  return Math.floor(random()*n)
}

export const randomValue = (list) => {
  return list[Math.floor(random()*list.length)]
}

export const shuffle = (list) => {
  let newList = list.slice()
  const n = newList.length
  for (let i = 0; i < n - 1; i++) {
    const j = Math.floor(random()*(n - i)) + i
    const t = newList[i]
    newList[i] = newList[j]
    newList[j] = t
  }
  return newList
}

let seed = -1
export const randomSeed = (s) => {
  seed = s
}

export const random = () => {
  if (seed && seed >= 0) {
    seed = (1664525*seed + 1013904223) % 0xffffffff
    return seed/0xffffffff
  } else {
    return Math.random()
  }
}
