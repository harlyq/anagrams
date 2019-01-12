(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const util = require("./util");
let verbose = false;
const log = msg => {
    if (verbose) {
        console.log(msg);
    }
};
const getPuzzleLetters = (puzzle, row, col, size) => puzzle[row].slice(col, col + size);
const setPuzzleLetters = (puzzle, row, col, word) => {
    puzzle[row] = puzzle[row].slice(0, col) + word + puzzle[row].slice(col + word.length);
};
const getFirstInvalidWord = (dictionary, line) => {
    const periodParts = line.split('.');
    const periodOrSpaceParts = periodParts.reduce((words, part) => part ? words.concat(part.split(' ')) : words, []);
    return periodOrSpaceParts.find(word => word.length >= 2 && !util.isWord(dictionary, word));
};
const isPuzzleValid = (dictionary, puzzle) => puzzle.every(line => !getFirstInvalidWord(dictionary, line));
const regexNonBlank = /[a-z]/;
const getPuzzlePartsForRow = (line, size, allowBlanks, includingCol = undefined) => {
    let rowParts = [];
    for (let col = 0; col <= line.length - size; col++) {
        if (includingCol && (col > includingCol || col + size < includingCol)) {
            continue;
        }
        const startOK = col === 0 || line[col - 1] === '.' || line[col - 1] === ' ';
        const endOK = col + size === line.length || line[col + size] === '.' || line[col + size] === ' ';
        const puzzlePart = line.slice(col, col + size);
        const blankCheckOK = allowBlanks || regexNonBlank.test(puzzlePart);
        // to be valid there must be letters to add (e.g. '.') and no spaces
        if (startOK && endOK && puzzlePart.includes('.') && !puzzlePart.includes(' ') && blankCheckOK) {
            rowParts.push(col);
        }
    }
    return rowParts;
};
const getPuzzleParts = (puzzle, size, allowBlanks) => {
    let allParts = [];
    for (let row = 0; row < puzzle.length; row++) {
        const rowParts = getPuzzlePartsForRow(puzzle[row], size, allowBlanks);
        allParts.push(...rowParts.map(col => { return { row, col, size }; }));
    }
    return allParts;
};
const getPuzzlePartsForFirstInvalidRow = (dictionary, puzzle, maxSize) => {
    let invalidParts = [];
    const invalidRow = puzzle.findIndex(line => getFirstInvalidWord(dictionary, line));
    if (invalidRow !== -1) {
        const invalidLine = puzzle[invalidRow];
        const invalidWord = getFirstInvalidWord(dictionary, invalidLine);
        const invalidCol = invalidLine.indexOf(invalidWord);
        for (let size = 2; size <= maxSize; size++) {
            invalidParts.push(...getPuzzlePartsForRow(invalidLine, size, false, invalidCol).map(col => { return { row: invalidRow, col, size }; }));
        }
    }
    return invalidParts;
};
const getWordList = (dictionary, puzzle, row, col, size, excludedWords) => {
    const puzzlePart = getPuzzleLetters(puzzle, row, col, size);
    const regex = new RegExp('^' + puzzlePart + '$');
    const words = dictionary[size].filter(word => regex.test(word));
    return words.filter(word => !excludedWords.includes(word));
};
const setPuzzleWord = (puzzle, row, col, word) => {
    if (col > 0) {
        setPuzzleLetters(puzzle, row, col - 1, ' ');
    }
    if (col + word.length < puzzle[0].length) {
        setPuzzleLetters(puzzle, row, col + word.length, ' ');
    }
    return setPuzzleLetters(puzzle, row, col, word);
};
exports.buildPuzzle = (dictionary, wordCountGoal, maxWordSize, puzzleSeed) => {
    util.randomSeed(puzzleSeed);
    const MIN_WORD_SIZE = 3;
    const puzzleRow = '.'.repeat(maxWordSize); // use . because it represents any character in regex
    let checkpoint = { puzzle: undefined, usedWords: [], maxWordSize: 0, puzzleWordCount: 0 };
    let puzzleWordCount = 0;
    let puzzle = Array.from({ length: maxWordSize }, () => puzzleRow);
    let isValid = true;
    let isFirstWord = true;
    let remainingAttempts = 100;
    let usedWords = []; // to prevent the same word appearing twice
    while (remainingAttempts > 0 && (!isValid || (puzzleWordCount < wordCountGoal && maxWordSize >= MIN_WORD_SIZE))) {
        const wordSize = util.randomInt(maxWordSize - MIN_WORD_SIZE) + MIN_WORD_SIZE;
        if (isValid) {
            checkpoint.puzzle = puzzle.slice();
            checkpoint.usedWords = usedWords;
            checkpoint.maxWordSize = maxWordSize;
            checkpoint.puzzleWordCount = puzzleWordCount;
        }
        const puzzleParts = isValid ? getPuzzleParts(puzzle, wordSize, isFirstWord) : getPuzzlePartsForFirstInvalidRow(dictionary, puzzle, maxWordSize);
        const shuffledParts = util.shuffle(puzzleParts);
        const part = shuffledParts.find(part => getWordList(dictionary, puzzle, part.row, part.col, part.size, usedWords).length > 0);
        if (part) {
            const word = util.randomValue(getWordList(dictionary, puzzle, part.row, part.col, part.size, usedWords));
            setPuzzleWord(puzzle, part.row, part.col, word);
            usedWords.push(word);
            puzzleWordCount++;
            isFirstWord = false;
        }
        else if (isValid) {
            log("no parts, try a smaller word size");
            maxWordSize--;
        }
        else {
            log("unable to complete puzzle, rollback to last checkpoint");
            remainingAttempts--;
            puzzle = checkpoint.puzzle.slice();
            usedWords = checkpoint.usedWords;
            maxWordSize = checkpoint.maxWordSize;
            puzzleWordCount = checkpoint.puzzleWordCount;
        }
        // alternate adding rows and columns by transposing valid puzzles
        isValid = isPuzzleValid(dictionary, puzzle);
        if (isValid) {
            puzzle = util.transposeStrings(puzzle);
            isValid = isPuzzleValid(dictionary, puzzle);
        }
    }
    puzzle = puzzle.map(line => line.replace(/\./g, ' '));
    const status = remainingAttempts <= 0 || maxWordSize < MIN_WORD_SIZE ? "failed" : "success";
    return { status, puzzle };
};
// if (process && process.versions && process.versions.node) {
//   verbose = true
//   const fs = require('fs')
//   const dictionary = util.createDictionary(fs.readFileSync('words.txt', 'utf8').split('\n'))
//   const results = buildPuzzle(dictionary, 100, 14, undefined)
//   console.log(results.status.toUpperCase())
//   console.log(results.puzzle.join('\n'))
// }

},{"./util":3}],2:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const builder = require("./builder");
const util = require("./util");
let dictionary;
let lastMessage;
fetch('words.txt')
    .then(response => response.text())
    .then(data => {
    dictionary = util.createDictionary(data.split('\n'));
    processMessages();
});
self.onmessage = (e) => {
    lastMessage = e.data;
    // console.log('received:', e.data)
    processMessages();
};
const processMessages = () => {
    if (lastMessage && dictionary) {
        const [wordCountGoal, maxWordSize, seed] = lastMessage;
        // console.log('building:', lastMessage.join(' '))
        lastMessage = undefined;
        const results = builder.buildPuzzle(dictionary, wordCountGoal, maxWordSize, seed);
        self.postMessage(results.puzzle.join('\n'));
        // console.log('reply:')
    }
};

},{"./builder":1,"./util":3}],3:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cleanDictionary = (dictionary, badDictionary) => {
    let newDictionary = {};
    for (let key in dictionary) {
        if (badDictionary[key]) {
            newDictionary[key] = dictionary[key].filter(word => !badDictionary[word.length].includes(word));
        }
        else {
            newDictionary[key] = dictionary[key];
        }
    }
    return newDictionary;
};
exports.createDictionary = (words) => {
    return words.reduce((r, x) => {
        const n = x.length;
        if (!r[n]) {
            r[n] = [];
        }
        r[n].push(x);
        return r;
    }, {});
};
exports.isWord = (dictionary, word) => {
    const size = word.length;
    return dictionary[size] && dictionary[size].indexOf(word) !== -1;
};
exports.clamp = (v, min, max) => {
    return v < min ? min : v > max ? max : v;
};
exports.isArrayEqual = (as, bs) => {
    return as.length == bs.length && as.every((a, i) => a === bs[i]);
};
exports.range = (n) => Array.from({ length: n }, (_, i) => i);
// console.assert(isArrayEqual(range(0), []))
// console.assert(isArrayEqual(range(1), [0]))
// console.assert(isArrayEqual(range(5), [0,1,2,3,4]))
exports.transposeStrings = (rows) => {
    let transpose = [];
    for (let row of rows) {
        for (let i = 0, m = row.length; i < m; i++) {
            if (!transpose[i]) {
                transpose[i] = '';
            }
            transpose[i] += row[i];
        }
    }
    return transpose;
};
// console.assert(transposeStrings(['ABC','DEF']).join('') === 'ADBECF')
// console.assert(transposeStrings(['ABC','DEF']).length === 3)
exports.randomInt = (n) => {
    return Math.floor(exports.random() * n);
};
exports.randomValue = (list) => {
    return list[Math.floor(exports.random() * list.length)];
};
exports.shuffle = (list) => {
    let newList = list.slice();
    const n = newList.length;
    for (let i = 0; i < n - 1; i++) {
        const j = Math.floor(exports.random() * (n - i)) + i;
        const t = newList[i];
        newList[i] = newList[j];
        newList[j] = t;
    }
    return newList;
};
let seed = -1;
exports.randomSeed = (s) => {
    seed = s;
};
exports.random = () => {
    if (seed && seed >= 0) {
        seed = (1664525 * seed + 1013904223) % 0xffffffff;
        return seed / 0xffffffff;
    }
    else {
        return Math.random();
    }
};

},{}]},{},[2]);
