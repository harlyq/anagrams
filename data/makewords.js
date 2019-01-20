const fs = require('fs')

const regexLowercaseWord = /^[a-z]{2,}$/
// const data = fs.readFileSync('dict_words', 'utf8')
const data = fs.readFileSync('simplewords.txt', 'utf8')
const words = data.split('\n').reduce((r,x) => {
  if (regexLowercaseWord.test(x)) {
    r.push(x)
  } 
  return r
}, [])

const sowpods = fs.readFileSync('sowpods.txt', 'utf8').split('\n')
const vulgar = fs.readFileSync('vulgar.txt', 'utf8').split('\n')
const sexual = fs.readFileSync('sexual.txt', 'utf8').split('\n')
const extraPluralsToSkip = ["ashes", "authorities", "knives", "potatoes", "wishes", "wives", "worries", "yourselves"]

const sortedVulgar = vulgar.slice().sort()
const sortedSexual = sexual.slice().sort()

console.log("vulgar.txt out of order", sortedVulgar.find((word,i) => word !== vulgar[i]))
console.log("sexual.txt out of order", sortedSexual.find((word,i) => word !== sexual[i]))

const uniqueWords = words.sort().filter((x,i,list) => x !== list[i-1])
const safeWords = uniqueWords.filter(word => binarySearch(sowpods, word) >= 0 && binarySearch(vulgar, word) === -1 && binarySearch(sexual, word) === -1)
const noPlurals = safeWords.filter(word => word[word.length - 1] !== 's' || (binarySearch(safeWords, word.slice(0,-1)) === -1 && !extraPluralsToSkip.includes(word)))

uniqueWords.forEach(word => {
  if (binarySearch(noPlurals, word) === -1) console.log("removed", word)
})

fs.writeFileSync('../data/words.txt', noPlurals.join('\n'))

function binarySearch(list, value) {
  let lo = 0, hi = list.length - 1, mid;
  while (lo <= hi) {
    mid = Math.floor((lo+hi)/2);
    if (list[mid] > value)
      hi = mid - 1;
    else if (list[mid] < value)
      lo = mid + 1;
    else
      return mid;
  }
  return -1;
}