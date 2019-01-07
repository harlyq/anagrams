import * as builder from './builder'
import * as util from './util'

let dictionary
let lastMessage

fetch('words.txt')
  .then(response => response.text())
  .then(data => {
    dictionary = util.createDictionary(data.split('\n'))
    processMessages()
  })

self.onmessage = (e) => {
  lastMessage = e.data
  // console.log('received:', e.data)
  processMessages()
}

const processMessages = () => {
  if (lastMessage && dictionary) {
    const [wordCountGoal, maxWordSize, seed] = lastMessage
    // console.log('building:', lastMessage.join(' '))
    lastMessage = undefined
    const results = builder.buildPuzzle(dictionary, wordCountGoal, maxWordSize, seed);
    (self as any).postMessage(results.puzzle.join('\n'))
    // console.log('reply:')
  }
}
