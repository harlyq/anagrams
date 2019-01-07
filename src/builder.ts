import * as util from './util'

let verbose = false
const log = msg => { 
  if (verbose) { console.log(msg) }
}

const getPuzzleLetters = (puzzle, row, col, size) => puzzle[row].slice(col, col + size)

const setPuzzleLetters = (puzzle, row, col, word) => {
  puzzle[row] = puzzle[row].slice(0, col) + word + puzzle[row].slice(col + word.length)
}

const getFirstInvalidWord = (dictionary, line) => {
  const periodParts = line.split('.')
  const periodOrSpaceParts = periodParts.reduce((words, part) => part ? words.concat(part.split(' ')) : words, [])
  return periodOrSpaceParts.find(word => word.length >= 2 && !util.isWord(dictionary, word))
}

const isPuzzleValid = (dictionary, puzzle) => puzzle.every(line => !getFirstInvalidWord(dictionary, line))

const regexNonBlank = /[a-z]/

const getPuzzlePartsForRow = (line, size, allowBlanks, includingCol = undefined) => {
  let rowParts = []
  for (let col = 0; col <= line.length - size; col++) {
    if (includingCol && (col > includingCol || col + size < includingCol)) {
      continue
    }

    const startOK = col === 0 || line[col - 1] === '.' || line[col - 1] === ' '
    const endOK = col + size === line.length || line[col + size] === '.' || line[col + size] === ' '
    const puzzlePart = line.slice(col, col + size)
    const blankCheckOK = allowBlanks || regexNonBlank.test(puzzlePart)

    // to be valid there must be letters to add (e.g. '.') and no spaces
    if (startOK && endOK && puzzlePart.includes('.') && !puzzlePart.includes(' ') && blankCheckOK) {
      rowParts.push(col)
    }
  }

  return rowParts
}

const getPuzzleParts = (puzzle, size, allowBlanks) => {
  let allParts = []

  for (let row = 0; row < puzzle.length; row++) {
    const rowParts = getPuzzlePartsForRow(puzzle[row], size, allowBlanks)
    allParts.push(...rowParts.map(col => { return {row, col, size} }))
  }

  return allParts
}

const getPuzzlePartsForFirstInvalidRow = (dictionary, puzzle, maxSize) => {
  let invalidParts = []
  const invalidRow = puzzle.findIndex(line => getFirstInvalidWord(dictionary, line))
  if (invalidRow !== -1) {
    const invalidLine = puzzle[invalidRow]
    const invalidWord = getFirstInvalidWord(dictionary, invalidLine)
    const invalidCol = invalidLine.indexOf(invalidWord)

    for (let size = 2; size <= maxSize; size++) {
      invalidParts.push(...getPuzzlePartsForRow(invalidLine, size, false, invalidCol).map(col => { return { row: invalidRow, col, size } }))
    }
  }

  return invalidParts
}

const getWordList = (dictionary, puzzle, row, col, size, excludedWords) => {
  const puzzlePart = getPuzzleLetters(puzzle, row, col, size)
  const regex = new RegExp('^' + puzzlePart + '$')
  const words = dictionary[size].filter(word => regex.test(word))
  return words.filter(word => !excludedWords.includes(word))
}

const setPuzzleWord = (puzzle, row, col, word) => {
  if (col > 0) {
    setPuzzleLetters(puzzle, row, col - 1, ' ')
  }

  if (col + word.length < puzzle[0].length) { 
    setPuzzleLetters(puzzle, row, col + word.length, ' ') 
  }

  return setPuzzleLetters(puzzle, row, col, word)
}

export const buildPuzzle = (dictionary, wordCountGoal, maxWordSize, puzzleSeed) => {
  util.randomSeed(puzzleSeed)

  const MIN_WORD_SIZE = 3
  const puzzleRow = '.'.repeat(maxWordSize) // use . because it represents any character in regex

  let checkpoint = { puzzle: undefined, usedWords: [], maxWordSize: 0, puzzleWordCount: 0 }
  let puzzleWordCount = 0
  let puzzle = Array.from({length: maxWordSize}, () => puzzleRow)
  let isValid = true
  let isFirstWord = true
  let remainingAttempts = 20
  let usedWords = [] // to prevent the same word appearing twice
  
  while (remainingAttempts > 0 && (!isValid || (puzzleWordCount < wordCountGoal && maxWordSize >= MIN_WORD_SIZE))) {
    const wordSize = util.randomInt(maxWordSize - MIN_WORD_SIZE) + MIN_WORD_SIZE
  
    if (isValid) {
      checkpoint.puzzle = puzzle.slice()
      checkpoint.usedWords = usedWords
      checkpoint.maxWordSize = maxWordSize
      checkpoint.puzzleWordCount = puzzleWordCount
    }
  
    const puzzleParts = isValid ? getPuzzleParts(puzzle, wordSize, isFirstWord) : getPuzzlePartsForFirstInvalidRow(dictionary, puzzle, maxWordSize)
    const shuffledParts = util.shuffle(puzzleParts)
    const part = shuffledParts.find(part => getWordList(dictionary, puzzle, part.row, part.col, part.size, usedWords).length > 0)
  
    if (part) {
      const word = util.randomValue(getWordList(dictionary, puzzle, part.row, part.col, part.size, usedWords))
      setPuzzleWord(puzzle, part.row, part.col, word)
      usedWords.push(word)
      puzzleWordCount++
      isFirstWord = false
    } else if (isValid) {
      log("no parts, try a smaller word size")
      maxWordSize--
    } else {
      log("unable to complete puzzle, rollback to last checkpoint")
      remainingAttempts--
      puzzle = checkpoint.puzzle.slice()
      usedWords = checkpoint.usedWords
      maxWordSize = checkpoint.maxWordSize
      puzzleWordCount = checkpoint.puzzleWordCount
    }
  
    // alternate adding rows and columns by transposing valid puzzles
    isValid = isPuzzleValid(dictionary, puzzle)
    if (isValid) {
      puzzle = util.transposeStrings(puzzle)
      isValid = isPuzzleValid(dictionary, puzzle)
    }
  }

  puzzle = puzzle.map(line => line.replace(/\./g, ' '))
  const status = remainingAttempts <= 0 || maxWordSize < MIN_WORD_SIZE ? "failed" : "success"
  return { status, puzzle }
}

// if (process && process.versions && process.versions.node) {
//   verbose = true
//   const fs = require('fs')
//   const dictionary = util.createDictionary(fs.readFileSync('words.txt', 'utf8').split('\n'))
//   const results = buildPuzzle(dictionary, 100, 14, undefined)
  
//   console.log(results.status.toUpperCase())
//   console.log(results.puzzle.join('\n'))
// }
