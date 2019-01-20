import * as util from './util'
import hyperHTML from 'hyperhtml'

window.addEventListener('load', () => {
  if (navigator && 'serviceWorker' in navigator) {
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
    version: 3,
    page: 1,
    difficulty: 'small' as 'small' | 'medium' | 'large',
    mode: 'normal' as 'normal' | 'hint' | 'complete' | 'loading' | 'pin',
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

  // returns -1 if the sortedList is empty
  const indexOfClosestLowerValue = (sortedList, v) => {
    let i = -1
    while (i + 1 < sortedList.length && v >= sortedList[i + 1]) {
      i++
    }
    return i
  }

  // compress the status into the new format
  const completedV2toV3 = (completed) => {
    let newCompleted = {small: [], medium: [], large: []}
    for (let difficulty in completed) {
      for (let page of completed[difficulty]) {
        newCompleted = changeCompletedStatus(newCompleted, difficulty, page, true)
      }
    }
    return newCompleted
  }

  // generally the players will complete puzzles sequentially, occasionally skipping a difficult
  // puzzle. Rather than storing a list of completed puzzles, which can get into the thousands, we
  // represent the list as an alternating sequence of completed and uncompleted indices
  // e.g. if we've completed 3,7,8,9,10 then the list becomes
  // [3,4,7,11] so incomplete below 3, complete from 3 to 4-1, incomplete from 4 to 7-1, complete from 7 to 11-1
  //
  // thus the 0th, 2nd, 4th, ... indices represent the start of complete sequences and
  // 1st, 3rd, 5th, ... indices represent the beginning of incomplete squences
  // the last number will always represent the last completed puzzle + 1
  const changeCompletedStatus = (completed, difficulty, page, isComplete) => {
    const i = indexOfClosestLowerValue(completed[difficulty], page)
    const wasComplete = i >= 0 ? (i % 2 === 0 ? true : false) : false
    if (wasComplete !== isComplete) {
      let newCompleted = completed[difficulty].slice()
      newCompleted.splice(i + 1, 0, page, page + 1)
      if (newCompleted.length > 1) {
        const n = newCompleted.length
        newCompleted = newCompleted.filter((x,i,list) => (i === 0 || x !== list[i-1]) && (i === n - 1 || x !== list[i+1])) // strip duplicates
      }
      return { ...completed, [difficulty]: newCompleted }
    }

    return completed
  }
  // console.log(changeCompletedStatus({small:[]}, 'small', 1, true))
  // console.log(changeCompletedStatus({small:[1,2]}, 'small', 1, true))
  // console.log(changeCompletedStatus({small:[1,2]}, 'small', 2, true))
  // console.log(changeCompletedStatus({small:[2,5]}, 'small', 1, true))
  // console.log(changeCompletedStatus({small:[2,5]}, 'small', 10, true))
  // console.log(changeCompletedStatus({small:[1,3]}, 'small', 2, false))
  // console.log(changeCompletedStatus({small:[1,10]}, 'small', 2, false))
  // console.log(changeCompletedStatus({small:[1,2]}, 'small', 1, false))

  const isCompleted = (completed, difficulty, page) => {
    const i = indexOfClosestLowerValue(completed[difficulty], page)
    return i >= 0 ? (i % 2 === 0 ? true : false) : false
  }

  // returns 1 if none are completed
  const getLastCompleted = (completed, difficulty) => {
    const n = completed[difficulty].length
    return n > 0 ? completed[difficulty][n - 1] - 1 : 1
  }

  const getLetterState = (letterStates, cell) => {
    return letterStates[cell.row][cell.col]
  }

  const reducer = (state: typeof INITIAL_STATE = INITIAL_STATE, action): typeof INITIAL_STATE => {
    switch (action.type) {
      case 'difficulty': 
        if (action.difficulty !== state.difficulty) {
          const lastPage = getLastCompleted(state.completed, action.difficulty)
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
        const isPuzzleComplete = isCompleted(state.completed, state.difficulty, state.page)
        return { 
          ...state, 
          ...DEFAULT_UI_STATE, 
          solution: action.puzzle, 
          puzzle: isPuzzleComplete ? action.puzzle : shufflePuzzle(action.puzzle, state.page), 
          letterStates: getInitialLetterStates(action.puzzle),
          mode: isPuzzleComplete ? 'complete' : 'normal'
        }

      case 'reset':
        if (state.mode !== 'loading') {
          return { 
            ...state, 
            ...DEFAULT_UI_STATE, 
            puzzle: shufflePuzzle(state.solution, undefined), // randomize each time
            letterStates: getInitialLetterStates(state.solution),
            completed: changeCompletedStatus(state.completed, state.difficulty, state.page, false),
            mode: 'normal',
          }
        } else {
          return state
        }

      case 'resolve-cell': {
        const currentLetterState = getLetterState(state.letterStates, action.cell)
        if (currentLetterState !== 'resolved' && currentLetterState !== 'empty') {
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
      }

      case 'setup': {
        const storedState = JSON.parse(localStorage.getItem("state"))
        if (!storedState || storedState.version !== INITIAL_STATE.version) {
          if (storedState.version === 2) {
            return { ...storedState, ...DEFAULT_UI_STATE, completed: completedV2toV3(storedState.completed) }
          } else {
            createPuzzle(state.page, state.difficulty)
          }
          return state
        }
        return { ...storedState, ...DEFAULT_UI_STATE }
      }

      case 'toggle-pin': {
        return { ...state, ...DEFAULT_UI_STATE, mode: state.mode === 'pin' ? 'normal' : 'pin' }
      }

      case 'toggle-pin-letter': {
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
  const onClickPin = (e) => dispatch({ type: 'toggle-pin' })
  const onClickReset = (e) => dispatch({ type: 'reset' })
  const onClickPrev = (e) => dispatch({ type: 'prev' })
  const onClickNext = (e) => dispatch({ type: 'next' })

  const onClickDifficulty = (e) => {
    dispatch({ type: 'difficulty', difficulty: e.target.dataset.difficulty })
  }

  const onPointerDownHint = (e) => {
    const pointer = e.changedTouches ? e.changedTouches.item(0) : e
    dispatch({ type: 'resolve-cell', cell: xyToCell(puzzleEl, pointer.clientX, pointer.clientY, getPuzzleSize(state.puzzle)) })
  }

  const onPointerDownPin = (e) => {
    const pointer = e.changedTouches ? e.changedTouches.item(0) : e
    dispatch({ type: 'toggle-pin-letter', cell: xyToCell(puzzleEl, pointer.clientX, pointer.clientY, getPuzzleSize(state.puzzle)) })
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
      dispatch({ type: 'toggle-pin-letter', cell })
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
    const isPinMode = state.mode === "pin"
    const isHintDisabled = state.mode === "complete" || state.mode === "loading"
    const isPinDisabled = state.mode === "complete" || state.mode === "loading"
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
      class=${"puzzle "  + state.difficulty}
      onmousedown=${isNormalMode ? onPointerDownPuzzle : isHintMode ? onPointerDownHint : isPinMode ? onPointerDownPin : undefined} 
      ontouchstart=${isNormalMode ? onPointerDownPuzzle : isHintMode ? onPointerDownHint : isPinMode ? onPointerDownPin : undefined} 
      ontouchmove=${onTouchMovePuzzle}
      ontouchend=${onTouchEndPuzzle}>

      ${state.puzzle.map((line, row) => {
        const isRowSelected = state.dragMode && state.select.row === row
        return hyperHTML.wire()`<div class=${"puzzlerow" + (isRowSelected ? " selected" : "")}>
          ${line.split('').map((c, col) => {
            const letterState = getLetterState(state.letterStates, {row, col})
            const isSelected = state.select.row === row && state.select.col === col
            const isBlank = c === ' '
            const showCompleted = !isBlank && state.mode === 'complete'
            return hyperHTML.wire()`<div class=${"letter " + letterState + (isSelected ? " selected" : "") + (showCompleted ? " resolved" : "") + (isHintMode && !isBlank ? " hint" : "")}>${c.toUpperCase()}</div>`
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
    .puzzle.large {
      font-size: 25px;
    }
    .puzzle.medium {
      font-size: 31px;
    }
    .puzzle.small {
      font-size: 42px;
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
    .letter.hint {
      color: white;
      background-color: black;
      cursor: help;
    }
    .letter.selected {
      background-color: lightgrey;
      color: black;
    }
    .letter.pinned {
      background-color: orange;
    }
    .letter.resolved {
      background-color: lightblue;
      color: black;
    }
    .empty {
      background-color: grey;
    }
    .puzzlerow {
      display: flex;
      background-color: white;
    }
    .puzzlerow.selected {
      background-color: black;
      color: white;
      cursor: ew-resize;
    }
    .difficultyrow {
      display: flex;
      align-self: flex-start;
    }
    .difficulty {
      margin: 0 0 10px 0;
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
      padding: 5px 10px;
      height: 1.5em;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .smallerfont {
      font-size: 0.8em;
    }
    #hint {
      background-color: lightblue;
    }
    #hint.selected {
      background-color: black;
      color: white;
    }
    #hint.disabled {
      background-color: transparent;
    }
    #pin {
      background-color: orange;
    }
    #pin.selected {
      background-color: black;
      color: white;
    }
    #pin.disabled {
      background-color: transparent;
    }
    @media (max-width: 640px) {
      .puzzle.large {
        font-size: 4.7vmin;
      }
      .puzzle.medium {
        font-size: 6vmin;
      }
      .puzzle.small {
        font-size: 7.8vmin;
      }
      .navigation {
        width: 100%;
      }
    }
    
    </style>
    <div class="anagram2d">
      ${difficultyEl}
      <div class="navigation">
        <div class=${state.page === 1 ? "disabled" : ""} onclick=${onClickPrev}>< Previous</div>
        <div>Puzzle # ${state.page}</div>
        <div onclick=${onClickNext}>Next ></div>
      </div>
      <div class="commandrow">
        <div class="command" onclick=${onClickReset}>&#9842; RESET  </div>
        <div id="hint" class=${"command" + (isHintMode ? " selected" : (isHintDisabled ? " disabled" : ""))} onclick=${onClickHint}>&#63; HINT  </div>
        <div id="pin" class=${"command" + (isPinMode ? " selected" : (isPinDisabled ? " disabled" : ""))} onclick=${onClickPin}><span class="smallerfont">&#128204;</span> PIN  </div>
      </div>
      ${puzzleEl}
    </div>
    <div id="console"></div>
    `
  }

  dispatch({type:'setup'})
}

