import * as util from './util'

const MATCH_ANY_LETTER_CHAR = '?'

// remove letters in wordB from wordA
const removeLetters = (wordA, wordB) => {
  const letters = wordA.split('')
  for (let b of wordB) {
    const i = letters.indexOf(b)
    if (i !== -1) {
      letters.splice(i, 1)
    }
  }
  return letters.join('')
}

// console.assert(removeLetters('abc', 'cat') === 'b')
// console.assert(removeLetters('cat', 'pyre') === 'cat')
// console.assert(removeLetters('cat', '') === 'cat')

const anagram = (dictionary, letters, size) => {
  if (size === 0) {
    return ['']
  } else if (size <= 2) { // missing two letter words can break a whole puzzle so just ignore them
    const uniqueFilter = (x,i,list) => i === 0 || x !== list[i - 1]
    const allLetters = letters.split('').sort()
    const oneLetterWords = allLetters.filter(uniqueFilter)
    const twoLetterWords = allLetters.flatMap((letter, i) => allLetters.slice(i+1,).map(letter2 => letter + letter2)).sort().filter(uniqueFilter)
    return [...oneLetterWords, ...twoLetterWords]
  } else {
    return dictionary[size].filter(word => removeLetters(letters, word).length === letters.length - word.length) // may return an empty list
  }
}

// console.assert(isArrayEqual(anagram('abcd', 3), ['bad', 'cab', 'cad', 'dab']))
// console.assert(isArrayEqual(anagram('abcde', 0), ['']))
// console.assert(isArrayEqual(anagram('bccddeeaa', 1), ['a','b','c','d','e']))


const dictionaryWords = (dictionary, size, regex) => {
  if (size === 0) {
    return ['']
  } else if (size <= 2) { // missing two letter words can break a whole puzzle so just ignore them
    return [MATCH_ANY_LETTER_CHAR.repeat(size)]
  } else if (!dictionary[size]) {
    return []
  } else {
    return regex ? dictionary[size].filter(word => regex.test(word)) : dictionary[size]
  }
}

// console.assert(isArrayEqual(dictionaryWords(0, /.*/), ['']))
// console.assert(isArrayEqual(dictionaryWords(1, /[cat]/), [MATCH_ANY_LETTER_CHAR]))
// console.assert(isArrayEqual(dictionaryWords(2, /[iar][tn]/), ['an','at','in','it']))

const lineToWords = (str) => str.split(' ')
const wordsToLine = (words) => words.join(' ')
const wordSizes = (line) => lineToWords(line).map(x => x.length) // double spaces will give a length of 0


const anagramCombos = (dictionary, letters, sizes) => {
  const matches = anagram(dictionary, letters, sizes.pop())
  if (sizes.length === 0) {
    return matches
  }

  let results = []
  for (let match of matches) {
    const subMatches = anagramCombos(dictionary, removeLetters(letters, match), sizes.slice())
    for (let subMatch of subMatches) {
      if (Array.isArray(subMatch)) {
        results.push([...subMatch, match])
      } else {
        results.push([subMatch, match])
      }
    }
  }

  return results
}
// console.log(anagramCombos('HUGEHATCH', [4,0,5]))


const dictionaryWordCombos = (dictionary, sizes, regexs) => {
  console.assert(regexs.length === sizes.length)
  const matches = dictionaryWords(dictionary, sizes.pop(), regexs.pop())
  if (sizes.length === 0) {
    return matches
  }

  let results = []
  for (let match of matches) {
    const subMatches = dictionaryWordCombos(dictionary, sizes.slice(), regexs.slice())
    for (let subMatch of subMatches) {
      if (Array.isArray(subMatch)) {
        results.push([...subMatch, match])
      } else {
        results.push([subMatch, match])
      }
    }
  }
  return results
}
// console.log(dictionaryWordCombos([2,0,2], [/[ABC][DNT]/, /./, /[OIN][DCO]/]))


// for each column build the regexs to match that column
const regExsPerColumn = (rowLetters, columnSizes) => {
  let start = 0
  return columnSizes.map(size => {
    const regex = new RegExp('^' + rowLetters.slice(start, start + size).map(letters => '[' + letters + ']').join('') + '$')
    start += size + 1 // add 1 to skip the space
    return regex
  })
}


// remove all of the rows that don't match the partials
const filterCombos = (rows, partials) => {
  return rows.map((row, i) => {
    const regex = new RegExp('^' + partials[i] + '$')
    return row.filter(words => {
      let str = Array.isArray(words) ? words.join(' ') : words
      if (str.indexOf(MATCH_ANY_LETTER_CHAR) !== -1) {
        str = str.split('').map((c,j) => c === MATCH_ANY_LETTER_CHAR ? partials[i][j] : c).join('') // replace the ANY_LETTER with the expected character from the partial
      }

      return regex.test(str)
    })
  })
}


const solvePuzzleInternal = (blankPuzzle, puzzleRowCombos, puzzleColumnCombos) => {
  let choices = []
  let allSolutions = [] // a list of all possible solutions found using our dictionary
  let bestIncompleteSolution
  let bestIncompleteWordCount = 0

  do {
    let rowCombos = puzzleRowCombos
    let columnCombos = puzzleColumnCombos
    let prevSolved = 0
    let solvedRows = blankPuzzle.slice()
    let choiceIndex = 0

    const assignRow = (i, row) => {
      const rowStr = Array.isArray(row) ? row.join(' ') : row // TODO rows should always be arrays
      console.assert(new RegExp('^' + solvedRows[i] + '$').test(rowStr))
      solvedRows[i] = rowStr
    }

    // the choices list represents a list of decisions that have been made during this attempt to solve
    // the puzzle.  If the attempt fails, then nextChoice() will increment the value of the last choice.
    // If that increment exceeds the value for the last choice, then remove that choice, and increment
    // the previous choice.  This strategy ensures that we will evaluate all possible choice options.
    const nextChoice = () => {
      let validChoice = false
      while (!validChoice && choices.length > 0) {
        const [choice, max] = choices.pop()
        if (choice + 1 < max) {
          choices.push([choice + 1, max])
          validChoice = true
        }
      }
    }
    
    while (rowCombos.some(row => row.length > 1) || columnCombos.some(col => col.length > 1)) {
      let solved = 0
  
      rowCombos.forEach((row, i) => {
        if (row.length === 1) {
          assignRow(i, row[0])
          solved++
        }
      })
  
      columnCombos.forEach((col, j) => {
        if (col.length === 1) {
          const colStr = Array.isArray(col[0]) ? wordsToLine(col[0]) : col[0] // TODO columns should always be arrays
          for (let i = 0; i < colStr.length; i++) {
            if (colStr[i] === MATCH_ANY_LETTER_CHAR) { continue }
            const c = solvedRows[i][j]
            console.assert(c === '.' || c === colStr[i])
            solvedRows[i] = solvedRows[i].slice(0,j) + colStr[i] + solvedRows[i].slice(j+1)
          }
          solved++
        }
      })
  
      if (solved <= prevSolved) {
        // all entries have more than one option so we must make a choice
        const min = Math.min(...rowCombos.map(row => row.length).filter(x => x > 1))
        const minIndex = rowCombos.findIndex(row => row.length === min)
        const choice = choiceIndex < choices.length ? choices[choiceIndex][0] : 0
        assignRow(minIndex, rowCombos[minIndex][choice])
        choices[choiceIndex] = [choice, rowCombos[minIndex].length]
        choiceIndex++
        solved++
      }
  
      rowCombos = filterCombos(rowCombos, solvedRows)
      columnCombos = filterCombos(columnCombos, util.transposeStrings(solvedRows))
  
      // if we have reached a point where nothing works, then reset and try again with the next choice branch
      if ( rowCombos.some(row => row.length === 0) || columnCombos.some(column => column.length === 0) ) {
        const wordCount = rowCombos.filter(row => row.length === 1).length + columnCombos.filter(column => column.length === 1).length
        if (wordCount > bestIncompleteWordCount) {
          bestIncompleteWordCount = wordCount
          bestIncompleteSolution = solvedRows.slice()
        }

        rowCombos = puzzleRowCombos
        columnCombos = puzzleColumnCombos
        solvedRows = blankPuzzle.slice()
        solved = 0
        choiceIndex = 0
  
        nextChoice()
  
        if (choices.length === 0) {
          if (allSolutions.length > 0) { 
            return { status: 'complete', solutions: allSolutions }
          } else {
            return { status: 'unsolved', solutions: [bestIncompleteSolution] }
          }
        }
      }
  
      prevSolved = solved
    }

    // don't used solvedRows as there can still be '.' in the strings of the last row
    allSolutions.push(rowCombos.map(row => Array.isArray(row[0]) ? wordsToLine(row[0]) : row[0]))

    nextChoice()
  } while (choices.length > 0)

  return { status: 'complete', solutions: allSolutions }
}


export const solvePuzzle = (dictionary, puzzle) => {
  const maxRowLength = Math.max(...puzzle.split('\n').map(x => x.length))
  const puzzleRows = puzzle.split('\n').map(row => row.padEnd(maxRowLength, ' ')) // rows must be padded for the transpose
  const rowLetters = puzzleRows.map(row => row.replace(/ /g, ''))
  
  const puzzleRowCombos = puzzleRows.map(row => anagramCombos(dictionary, row.replace(/ /g, ''), wordSizes(row)))
  // console.log(puzzleRowCombos)
  
  const emptyRows = util.range(puzzleRowCombos.length).filter(i => puzzleRowCombos[i].length === 0)
  console.assert(emptyRows.length == 0, 'unable to resolve rows: ' + emptyRows.join(','))
  
  const puzzleColumnCombos = util.transposeStrings(puzzleRows).map(col => {
    const columnSizes = wordSizes(col)
    return dictionaryWordCombos(dictionary, columnSizes, regExsPerColumn(rowLetters, columnSizes))
  })
  // console.log(puzzleColumnCombos)
  
  const emptyColumns = util.range(puzzleColumnCombos.length).filter(j => puzzleColumnCombos[j].length === 0)
  console.assert(emptyColumns.length == 0, 'unable to resolve columns: ' + emptyColumns.join(','))
  
  const blankPuzzle = puzzleRows.map(row => '.'.repeat(row.length))

  return solvePuzzleInternal(blankPuzzle, puzzleRowCombos, puzzleColumnCombos)
}

if (process && process.versions && process.versions.node) {

// Example with two solutions
// const mat=
// `os o d snam
// noituniit e
// ayrreb l re
//  elrh aletd
// ege c e aln
//  i  vaseveh
// sblie l rst
// sa  a tdth 
// e et h  yda
//  rcniye a p
// tdedraiss s`

// const mat=
// `gsustge
// no a lw
// sc eoan
// eraoakk
// wt infi
// enn  t
// a eimgg`

// const mat=
// `pre ptahse
// litrintyqau
//  teabu doo
// elo r  ipte
//  ereln g a
// als tdiimeg
// er  ni   l
// i ylfstluiw
// yh  i eh s
// itm  vtae
// dndirc eest`

// // // Example with no solution ('ew' is not in the dictionary), but useExhaustiveSearch gives a good response
//   const mat=
// `eoh s
// dnipe
// w otl
// ral e
// rta s`

  const mat=
`host  l a
hambaipin
i userend
t e  song
hdeuun s
i a  o tr
ns oeagr
gdenni we
deei ssar`

  const fs = require('fs')
  const dictionary = util.createDictionary(fs.readFileSync('sowpods.txt', 'utf8').split('\n'))

  const results = solvePuzzle(dictionary, mat)
  console.log(results.status.toUpperCase())
  console.log(results.solutions.map(solution => solution.join('\n')).join('\n\n'))
}
