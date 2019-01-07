import * as util from './util'
import hyperHTML from 'hyperhtml'

window.addEventListener('load', () => {
  if (navigator && navigator.serviceWorker) {
    navigator.serviceWorker.register('serviceworker.js')
    .then(registration => {
      console.log('service worker registered', registration.scope)
    }, err => {
      console.log('service work failed', err)
    })
  }
  
  anagramBuilder(document.getElementById("viewer"))
})


function anagramBuilder(node) {
  const builderWorker = new Worker('builderworker.js')

  const DOUBLE_DOWN_INTERVAL = 500 // this doesn't take into account windows settings
  const NO_SELECT = {row: -1, col: -1}
  const DEFAULT_UI_STATE = {
    select: NO_SELECT,
    dragMode: false,
    lastDownTime: 0
  }
  const INITIAL_STATE = {
    version: 2,
    page: 1,
    difficulty: 'small' as 'small' | 'medium' | 'large',
    mode: 'normal' as 'normal' | 'hint' | 'complete' | 'loading',
    solution: [] as string[],
    puzzle: [] as string[],
    letterStates: [] as ('empty' | 'pinned' | 'resolved' | 'none')[][],
    completed: {small: [], medium: [], large: []},
    ...DEFAULT_UI_STATE
  }
  const WORD_GOAL = { 'small': 6, 'medium': 12, 'large': 100 }
  const PUZZLE_SIZE = { 'small': 6, 'medium': 8, 'large': 10 }
  
  let puzzleEl
  let state
  let animationFrameID
  
  builderWorker.onmessage = (e) => {
    dispatch({type: 'puzzle-built', puzzle: e.data.split('\n') })
  }
  
  const onStateChange = (state, _) => {
    if (state.puzzle.length > 0) { // only store if we have a valid puzzle
      localStorage.setItem("state", JSON.stringify(state))
    }
  }

  const dispatch = (action) => {
    const oldState = state
    state = reducer(state, action)

    if (state !== oldState && !animationFrameID) {
      onStateChange(state, oldState)
      animationFrameID = requestAnimationFrame(() => {
        animationFrameID = undefined
        render(state)
      })
    }
  }

  const log = (msg) => {
    let output = document.getElementById("console")
    if (output) {
      output.textContent = output.textContent.split('\n').slice(-20,).concat(msg).join('\n')
    }
  }

  // shuffles the letters but maintains the position of the spaces (' ')
  const shuffleAnagram = (line) => {
    const characterArray = line.split('')
    const shuffledLetters = util.shuffle(characterArray.filter(c => c !== ' '))
    let i = 0
    return characterArray.map(c => c !== ' ' ? shuffledLetters[i++] : ' ').join('')
  }

  const shufflePuzzle = (puzzle, seed) => {
    util.randomSeed(seed)
    return puzzle.map(line => shuffleAnagram(line))
  }

  const swapCellInRow = (puzzle, from, toCol) => {
    if (from.col === toCol) {
      return puzzle
    }

    return puzzle.map((line, row) => {
      if (row !== from.row) { return line }
      const characterArray = line.split('')
      const copyOfFromCol = characterArray.splice(from.col, 1, characterArray[toCol])[0]
      characterArray.splice(toCol, 1, copyOfFromCol)
      return characterArray.join('')
    })
  }

  const createPuzzle = (page, difficulty) => {
    builderWorker.postMessage([WORD_GOAL[difficulty], PUZZLE_SIZE[difficulty], page])
    // console.log('sent to worker:', WORD_GOAL[difficulty], PUZZLE_SIZE[difficulty], page)
  }

  const isPuzzleEqual = (puzzleA, puzzleB) => {
    return puzzleA.length === puzzleB.length && puzzleA.every((_, row) => puzzleA[row] === puzzleB[row])
  } 

  const getPuzzleCell = (puzzle, cell) => {
    return puzzle[cell.row][cell.col]
  }

  const isMoveableCell = (letterStates, cell) => {
    return getLetterState(letterStates, cell) === 'none'
  }

  const getInitialLetterStates = (puzzle) => {
    return puzzle.map(line => line.split('').map(c => c === ' ' ? 'empty' : 'none'))
  }

  const changeLetterState = (letterStates, cell, newState) => {
    if (letterStates[cell.row][cell.col] === newState) {
      return letterStates
    }
    return letterStates.map((list, row) => row !== cell.row ? list : list.map((state, col) => col !== cell.col ? state : newState))
  }

  const changeCompletedStatus = (completed, difficulty, page, isComplete) => {
    const pageIndex = completed[difficulty].indexOf(page)
    if (!isComplete && pageIndex !== -1) {
      return { ...completed, [difficulty]: completed[difficulty].filter((_,i) => i !== pageIndex) }
    } else if (isComplete && pageIndex === -1) {
      return { ...completed, [difficulty]: completed[difficulty].concat(page) }
    }
    return completed
  }

  const getLetterState = (letterStates, cell) => {
    return letterStates[cell.row][cell.col]
  }

  const reducer = (state = INITIAL_STATE, action) => {
    switch (action.type) {
      case 'difficulty': 
        if (action.difficulty !== state.difficulty) {
          const lastPage = state.completed[action.difficulty].length > 0 ? Math.max(...state.completed[action.difficulty]) : 1
          createPuzzle(lastPage, action.difficulty);
          return { ...state, ...DEFAULT_UI_STATE, puzzle: [], letterStates: [], difficulty: action.difficulty, mode: 'normal', page: lastPage }
        }
        return state

      case 'down': {
        const newSelect = isMoveableCell(state.letterStates, action.cell) ? action.cell : state.select
        return { ...state, select: newSelect, lastDownTime: action.time }
      }

      case 'toggle-hint': 
        return { ...state, ...DEFAULT_UI_STATE, mode: state.mode === 'hint' ? 'normal' : 'hint' }

      case 'move': 
        if (state.select !== NO_SELECT && state.select.col !== action.cell.col) {
          const newCell = { row: state.select.row, col: action.cell.col }

          if (isMoveableCell(state.letterStates, newCell)) {
            const updatedPuzzle = swapCellInRow(state.puzzle, state.select, newCell.col)
            const isPuzzleComplete = isPuzzleEqual(updatedPuzzle, state.solution)
            return { 
              ...state, 
              puzzle: updatedPuzzle, 
              completed: isPuzzleComplete ? changeCompletedStatus(state.completed, state.difficulty, state.page, true) : state.completed, 
              mode: isPuzzleComplete ? 'complete' : state.mode, 
              dragMode: true, 
              lastDownTime: 0, 
              select: isPuzzleComplete ? NO_SELECT : newCell 
            }
          }
        }
        return state.dragMode ? state : { ...state, dragMode: true }

      case 'next': 
        createPuzzle(state.page + 1, state.difficulty);
        return { ...state, ...DEFAULT_UI_STATE, puzzle: [], letterStates: [], page: state.page + 1, mode: 'loading' }

      case 'prev': 
        createPuzzle(state.page - 1, state.difficulty);
        return { ...state, ...DEFAULT_UI_STATE, puzzle: [], letterStates: [], page: state.page - 1, mode: 'loading' }

      case 'puzzle-built': 
        const isPuzzleComplete = state.completed[state.difficulty].includes(state.page) 
        return { 
          ...state, 
          ...DEFAULT_UI_STATE, 
          solution: action.puzzle, 
          puzzle: isPuzzleComplete ? action.puzzle : shufflePuzzle(action.puzzle, state.page), 
          letterStates: getInitialLetterStates(action.puzzle),
          mode: isPuzzleComplete ? 'complete' : 'normal'
        }

      case 'reset':
        return { 
          ...state, 
          ...DEFAULT_UI_STATE, 
          puzzle: shufflePuzzle(state.solution, undefined), // randomize each time
          letterStates: getInitialLetterStates(state.solution),
          completed: changeCompletedStatus(state.completed, state.difficulty, state.page, false),
          mode: 'normal',
        }

      case 'resolve-cell':
        if (getLetterState(state.letterStates, action.cell) !== 'resolved') {
          const correctLetter = getPuzzleCell(state.solution, action.cell)
          const lettersInRow = state.puzzle[action.cell.row].split('')

          // if possible move an unpinned letter
          const unpinnedCol = lettersInRow.findIndex((c,col) => c === correctLetter && getLetterState(state.letterStates, { row: action.cell.row, col }) === 'none')
          const bestCol = unpinnedCol !== -1 ? unpinnedCol : lettersInRow.findIndex((c,col) => c === correctLetter && getLetterState(state.letterStates, { row: action.cell.row, col }) === 'pinned')
          console.assert(bestCol !== -1)
          const updatedPuzzle = swapCellInRow(state.puzzle, action.cell, bestCol)

          // must set 'resolved' last in case action.cell.col == bestCol
          const bestCell = { row: action.cell.row, col: bestCol }
          const updatedLetterStates = changeLetterState(changeLetterState(state.letterStates, bestCell, 'none'), action.cell, 'resolved')
          const isPuzzleComplete = isPuzzleEqual(updatedPuzzle, state.solution)
          return { 
            ...state, 
            puzzle: updatedPuzzle, 
            letterStates: updatedLetterStates, 
            completed: isPuzzleComplete ? changeCompletedStatus(state.completed, state.difficulty, state.page, true) : state.completed, 
            mode: isPuzzleComplete ? 'complete' : state.mode
          }
        }
        return state

      case 'setup': {
        const storedState = JSON.parse(localStorage.getItem("state"))
        if (!storedState || storedState.version !== INITIAL_STATE.version) {
          createPuzzle(state.page, state.difficulty)
          return state
        }
        return { ...storedState, ...DEFAULT_UI_STATE }
      }

      case 'toggle-pinned': {
        const letterState = getLetterState(state.letterStates, action.cell)
        if (letterState === 'pinned' || letterState === 'none') {
          const newLetterState = letterState === 'pinned' ? 'none' : 'pinned'
          return { 
            ...state, 
            letterStates: changeLetterState(state.letterStates, action.cell, newLetterState), 
            lastDownTime: 0 
          }
        }
        return state
      }

      case 'up': 
        return { ...state, select: NO_SELECT, dragMode: false }

      default: {
        console.error('unknown action', action)
        return state
      }
    }
  }

  const xyToCell = (puzzleEl, x, y, puzzleSize) => {
    const clientRect = puzzleEl.getBoundingClientRect()
    const dx = util.clamp((x - clientRect.left)/(clientRect.right - clientRect.left), 0, 0.999)
    const dy = util.clamp((y - clientRect.top)/(clientRect.bottom - clientRect.top), 0, 0.999)
    return { row: Math.floor(dy*puzzleSize[0]), col: Math.floor(dx*puzzleSize[1]) }
  }

  // returns [#rows, #cols]
  const getPuzzleSize = (puzzle) => {
    return [puzzle.length, puzzle.length > 0 ? puzzle[0].length : 0]
  }

  const onClickHint = (e) => dispatch({ type: 'toggle-hint' })
  const onClickReset = (e) => dispatch({ type: 'reset' })
  const onClickPrev = (e) => dispatch({ type: 'prev' })
  const onClickNext = (e) => dispatch({ type: 'next' })
  const onClickDifficulty = (e) => dispatch({ type: 'difficulty', difficulty: e.target.dataset.difficulty })
  const onPointerDownHint = (e) => {
    const pointer = e.changedTouches ? e.changedTouches.item(0) : e
    dispatch({ type: 'resolve-cell', cell: xyToCell(puzzleEl, pointer.clientX, pointer.clientY, getPuzzleSize(state.puzzle)) })
  }
  const onMouseUpBody = (e) => {
    dispatch({ type: 'up' })
  }

  const onPointerDownPuzzle = (e) => {
    e.preventDefault()
    const pointer = e.changedTouches ? e.changedTouches.item(0) : e
    const downTime = Date.now()
    const cell = xyToCell(puzzleEl, pointer.clientX, pointer.clientY, getPuzzleSize(state.puzzle))    
    if (state.lastDownTime + DOUBLE_DOWN_INTERVAL > downTime) {
      dispatch({ type: 'toggle-pinned', cell })
    } else {
      dispatch({ type: 'down', cell, time: downTime })
    }
  }

  const onMouseMoveBody = (e) => {
    dispatch({ type: 'move', cell: xyToCell(puzzleEl, e.clientX, e.clientY, getPuzzleSize(state.puzzle)) })
  }

  // special handling for touch move and end because we need to keep them on the element at all times
  const onTouchEndPuzzle = (e) => {
    e.preventDefault()
    if (state.select !== NO_SELECT) {
      dispatch({ type: 'up' })
    }
  }

  const onTouchMovePuzzle = (e) => {
    e.preventDefault()
    if (state.select !== NO_SELECT) {
      const pointer = e.changedTouches.item(0)
      dispatch({ type: 'move', cell: xyToCell(puzzleEl, pointer.clientX, pointer.clientY, getPuzzleSize(state.puzzle)) })
    }
  }

  const render = (state) => {
    const isHintMode = state.mode === "hint"
    const isNormalMode = state.mode === "normal"
    const isCompleteMode = state.mode === "complete"
    const isSelectActive = state.select !== NO_SELECT

    // once the mouse is down, to read the position over the whole page we need to put the move and up handlers on the body
    // for touch the move and end handlers must be on the element
    if (isSelectActive) {
      document.body.addEventListener('mouseup', onMouseUpBody)
      document.body.addEventListener('mousemove', onMouseMoveBody)
    } else {
      document.body.removeEventListener('mousemove', onMouseMoveBody)
      document.body.removeEventListener('mouseup', onMouseUpBody)
    }

    puzzleEl = hyperHTML.wire()`<div 
      class="puzzle" 
      onmousedown=${isNormalMode ? onPointerDownPuzzle : isHintMode ? onPointerDownHint : undefined} 
      ontouchstart=${isNormalMode ? onPointerDownPuzzle : isHintMode ? onPointerDownHint : undefined} 
      ontouchmove=${onTouchMovePuzzle}
      ontouchend=${onTouchEndPuzzle}>
      ${state.puzzle.map((line, row) => {
        const isRowSelected = state.dragMode && state.select.row === row
        return hyperHTML.wire()`<div class=${"puzzlerow" + (isRowSelected ? " selected" : "")}>
          ${line.split('').map((c, col) => {
            const letterState = getLetterState(state.letterStates, {row, col})
            const isSelected = state.select.row === row && state.select.col === col
            const showCompleted = c !== ' ' && state.mode === 'complete'
            return hyperHTML.wire()`<div class=${"letter " + letterState + (isSelected ? " selected" : "") + (showCompleted ? " resolved" : "")}>${c.toUpperCase()}</div>`
          })}
        </div>`
      })}
    </div>`

    const difficultyEl = hyperHTML.wire()`<div class="difficultyrow">
      ${['small', 'medium', 'large'].map(difficulty => 
        hyperHTML.wire()`<div class=${"difficulty" + (state.difficulty === difficulty ? " selected" : "")} onclick=${onClickDifficulty} data-difficulty=${difficulty}>${difficulty.toUpperCase()}</div>`
      )}
    </div>`
    

    hyperHTML.bind(node)`
    <style>
    body {
      background-color: lightgrey;
      -webkit-user-select: none;
      -moz-user-select: none;
      -khtml-user-select: none;
      -ms-user-select: none;
      font: 18px arial;
    }
    .puzzle {
      cursor: pointer;
      font-size: 30px;
    }
    .anagram2d {
      width: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    .navigation {
      display: flex;
      justify-content: space-evenly;
      width: 50%;
    }
    .disabled {
      pointer-events: none;
      opacity: 0.4;
    }
    .letter {
      display: flex;
      width: 2em;
      height: 2em;
      justify-content: center;
      align-items: center;
    }
    .letter.selected {
      background-color: white;
      color: black;
      cursor: ew-resize;
    }
    .letter.hint {
      color: white;
      background-color: black;
      cursor: help;
    }
    .empty {
      background-color: grey;
    }
    .pinned {
      background-color: orange;
    }
    .resolved {
      background-color: lightblue;
      color: black;
    }
    .puzzlerow {
      display: flex;
      background-color: white;
    }
    .puzzlerow.selected {
      background-color: black;
      color: white;
      cursor: help;
    }
    .difficultyrow {
      display: flex;
      align-self: flex-start;
    }
    .difficulty {
      padding: 5px 10px;
    }
    .selected {
      background-color: black;
      color: white;
    }
    .commandrow {
      display: flex;
      align-items: center;
      align-content: flex-start;
      margin: 10px;
    }
    .command {
      margin: 0px 10px;
    }
    @media (max-width: 640px) {
      .letter {
        font-size: 4.2vmin;
      }
      .navigation {
        width: 100%;
      }
    }
    
    </style>
    <div class="anagram2d">
      ${difficultyEl}
      <div class="navigation">
        <div class=${state.page === 1 ? "disabled" : ""} onclick=${onClickPrev}>&#8592; Previous</div>
        <div>Puzzle # ${state.page}</div>
        <div onclick=${onClickNext}>Next &#8594;</div>
      </div>
      <div class="commandrow">
        <div class="command" onclick=${onClickReset}>&#9842; RESET  </div>
        <div class=${"command" + (isHintMode ? " selected" : (isCompleteMode ? " disabled" : ""))} onclick=${onClickHint}>&#63; HINT  </div>
      </div>
      ${puzzleEl}
    </div>
    <div id="console"></div>
    `
  }

  dispatch({type:'setup'})
}

