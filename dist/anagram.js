(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
/*! (c) Andrea Giammarchi - ISC */
var createContent = (function (document) {'use strict';
  var FRAGMENT = 'fragment';
  var TEMPLATE = 'template';
  var HAS_CONTENT = 'content' in create(TEMPLATE);

  var createHTML = HAS_CONTENT ?
    function (html) {
      var template = create(TEMPLATE);
      template.innerHTML = html;
      return template.content;
    } :
    function (html) {
      var content = create(FRAGMENT);
      var template = create(TEMPLATE);
      var childNodes = null;
      if (/^[^\S]*?<(col(?:group)?|t(?:head|body|foot|r|d|h))/i.test(html)) {
        var selector = RegExp.$1;
        template.innerHTML = '<table>' + html + '</table>';
        childNodes = template.querySelectorAll(selector);
      } else {
        template.innerHTML = html;
        childNodes = template.childNodes;
      }
      append(content, childNodes);
      return content;
    };

  return function createContent(markup, type) {
    return (type === 'svg' ? createSVG : createHTML)(markup);
  };

  function append(root, childNodes) {
    var length = childNodes.length;
    while (length--)
      root.appendChild(childNodes[0]);
  }

  function create(element) {
    return element === FRAGMENT ?
      document.createDocumentFragment() :
      document.createElementNS('http://www.w3.org/1999/xhtml', element);
  }

  // it could use createElementNS when hasNode is there
  // but this fallback is equally fast and easier to maintain
  // it is also battle tested already in all IE
  function createSVG(svg) {
    var content = create(FRAGMENT);
    var template = create('div');
    template.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg">' + svg + '</svg>';
    append(content, template.firstChild.childNodes);
    return content;
  }

}(document));
module.exports = createContent;

},{}],2:[function(require,module,exports){
/*! (c) Andrea Giammarchi - ISC */
var self = this || /* istanbul ignore next */ {};
self.CustomEvent = typeof CustomEvent === 'function' ?
  CustomEvent :
  (function (__p__) {
    CustomEvent[__p__] = new CustomEvent('').constructor[__p__];
    return CustomEvent;
    function CustomEvent(type, init) {
      if (!init) init = {};
      var e = document.createEvent('CustomEvent');
      e.initCustomEvent(type, !!init.bubbles, !!init.cancelable, init.detail);
      return e;
    }
  }('prototype'));
module.exports = self.CustomEvent;

},{}],3:[function(require,module,exports){
/*! (c) Andrea Giammarchi - ISC */
var self = this || /* istanbul ignore next */ {};
try { self.Map = Map; }
catch (Map) {
  self.Map = function Map() {
    var i = 0;
    var k = [];
    var v = [];
    return {
      delete: function (key) {
        var had = contains(key);
        if (had) {
          k.splice(i, 1);
          v.splice(i, 1);
        }
        return had;
      },
      get: function get(key) {
        return contains(key) ? v[i] : void 0;
      },
      has: function has(key) {
        return contains(key);
      },
      set: function set(key, value) {
        v[contains(key) ? i : (k.push(key) - 1)] = value;
        return this;
      }
    };
    function contains(v) {
      i = k.indexOf(v);
      return -1 < i;
    }
  };
}
module.exports = self.Map;

},{}],4:[function(require,module,exports){
/*! (c) Andrea Giammarchi - ISC */
var self = this || /* istanbul ignore next */ {};
try { self.WeakSet = WeakSet; }
catch (WeakSet) {
  (function (id, dP) {
    var proto = WeakSet.prototype;
    proto.add = function (object) {
      if (!this.has(object))
        dP(object, this._, {value: true, configurable: true});
      return this;
    };
    proto.has = function (object) {
      return this.hasOwnProperty.call(object, this._);
    };
    proto.delete = function (object) {
      return this.has(object) && delete object[this._];
    };
    self.WeakSet = WeakSet;
    function WeakSet() {'use strict';
      dP(this, '_', {value: '_@ungap/weakmap' + id++});
    }
  }(Math.random(), Object.defineProperty));
}
module.exports = self.WeakSet;

},{}],5:[function(require,module,exports){
/*! (c) Andrea Giammarchi - ISC */
var importNode = (function (
  document,
  appendChild,
  cloneNode,
  createTextNode,
  importNode
) {
  var native = importNode in document;
  // IE 11 has problems with cloning templates:
  // it "forgets" empty childNodes. This feature-detects that.
  var fragment = document.createDocumentFragment();
  fragment[appendChild](document[createTextNode]('g'));
  fragment[appendChild](document[createTextNode](''));
  var content = native ?
    document[importNode](fragment, true) :
    fragment[cloneNode](true);
  return content.childNodes.length < 2 ?
    function importNode(node, deep) {
      var clone = node[cloneNode]();
      for (var
        childNodes = node.childNodes || [],
        length = childNodes.length,
        i = 0; deep && i < length; i++
      ) {
        clone[appendChild](importNode(childNodes[i], deep));
      }
      return clone;
    } :
    (native ?
      document[importNode] :
      function (node, deep) {
        return node[cloneNode](!!deep);
      }
    );
}(
  document,
  'appendChild',
  'cloneNode',
  'createTextNode',
  'importNode'
));
module.exports = importNode;

},{}],6:[function(require,module,exports){
var isArray = Array.isArray || (function (toString) {
  var $ = toString.call([]);
  return function isArray(object) {
    return toString.call(object) === $;
  };
}({}.toString));
module.exports = isArray;

},{}],7:[function(require,module,exports){
var templateLiteral = (function () {'use strict';
  var RAW = 'raw';
  var isNoOp = false;
  var templateLiteral = function (tl) {
    if (
      // for badly transpiled literals
      !(RAW in tl) ||
      // for some version of TypeScript
      tl.propertyIsEnumerable(RAW) ||
      // and some other version of TypeScript
      !Object.isFrozen(tl.raw) ||
      (
        // or for Firefox < 55
        /Firefox\/(\d+)/.test(
          (document.defaultView.navigator || {}).userAgent
        ) &&
        parseFloat(RegExp.$1) < 55
      )
    ) {
      var forever = {};
      templateLiteral = function (tl) {
        var key = RAW + tl.join(RAW);
        return forever[key] || (forever[key] = tl);
      };
      return templateLiteral(tl);
    } else {
      isNoOp = true;
      return tl;
    }
  };
  return function (tl) {
    return isNoOp ? tl : templateLiteral(tl);
  };
}());
module.exports = templateLiteral;

},{}],8:[function(require,module,exports){
var trim = ''.trim || function () {
  return String(this).replace(/^\s+|\s+/g, '');
};
module.exports = trim;

},{}],9:[function(require,module,exports){
/*! (c) Andrea Giammarchi - ISC */
var self = this || /* istanbul ignore next */ {};
try { self.WeakMap = WeakMap; }
catch (WeakMap) {
  // this could be better but 90% of the time
  // it's everything developers need as fallback
  self.WeakMap = (function (id, Object) {'use strict';
    var dP = Object.defineProperty;
    var hOP = Object.hasOwnProperty;
    var proto = WeakMap.prototype;
    proto.delete = function (key) {
      return this.has(key) && delete key[this._];
    };
    proto.get = function (key) {
      return this.has(key) ? key[this._] : void 0;
    };
    proto.has = function (key) {
      return hOP.call(key, this._);
    };
    proto.set = function (key, value) {
      dP(key, this._, {configurable: true, value: value});
      return this;
    };
    return WeakMap;
    function WeakMap(iterable) {
      dP(this, '_', {value: '_@ungap/weakmap' + id++});
      if (iterable)
        iterable.forEach(add, this);
    }
    function add(pair) {
      this.set(pair[0], pair[1]);
    }
  }(Math.random(), Object));
}
module.exports = self.WeakMap;

},{}],10:[function(require,module,exports){
/*! (c) Andrea Giammarchi */
function disconnected(poly) {'use strict';
  var CONNECTED = 'connected';
  var DISCONNECTED = 'dis' + CONNECTED;
  var Event = poly.Event;
  var WeakSet = poly.WeakSet;
  var notObserving = true;
  var observer = new WeakSet;
  return function observe(node) {
    if (notObserving) {
      notObserving = !notObserving;
      startObserving(node.ownerDocument);
    }
    observer.add(node);
    return node;
  };
  function startObserving(document) {
    var dispatched = null;
    try {
      (new MutationObserver(changes)).observe(
        document,
        {subtree: true, childList: true}
      );
    }
    catch(o_O) {
      var timer = 0;
      var records = [];
      var reschedule = function (record) {
        records.push(record);
        clearTimeout(timer);
        timer = setTimeout(
          function () {
            changes(records.splice(timer = 0, records.length));
          },
          0
        );
      };
      document.addEventListener(
        'DOMNodeRemoved',
        function (event) {
          reschedule({addedNodes: [], removedNodes: [event.target]});
        },
        true
      );
      document.addEventListener(
        'DOMNodeInserted',
        function (event) {
          reschedule({addedNodes: [event.target], removedNodes: []});
        },
        true
      );
    }
    function changes(records) {
      dispatched = new Tracker;
      for (var
        record,
        length = records.length,
        i = 0; i < length; i++
      ) {
        record = records[i];
        dispatchAll(record.removedNodes, DISCONNECTED, CONNECTED);
        dispatchAll(record.addedNodes, CONNECTED, DISCONNECTED);
      }
      dispatched = null;
    }
    function dispatchAll(nodes, type, counter) {
      for (var
        node,
        event = new Event(type),
        length = nodes.length,
        i = 0; i < length;
        (node = nodes[i++]).nodeType === 1 &&
        dispatchTarget(node, event, type, counter)
      );
    }
    function dispatchTarget(node, event, type, counter) {
      if (observer.has(node) && !dispatched[type].has(node)) {
        dispatched[counter].delete(node);
        dispatched[type].add(node);
        node.dispatchEvent(event);
        /*
        // The event is not bubbling (perf reason: should it?),
        // hence there's no way to know if
        // stop/Immediate/Propagation() was called.
        // Should DOM Level 0 work at all?
        // I say it's a YAGNI case for the time being,
        // and easy to implement in user-land.
        if (!event.cancelBubble) {
          var fn = node['on' + type];
          if (fn)
            fn.call(node, event);
        }
        */
      }
      for (var
        // apparently is node.children || IE11 ... ^_^;;
        // https://github.com/WebReflection/disconnected/issues/1
        children = node.children || [],
        length = children.length,
        i = 0; i < length;
        dispatchTarget(children[i++], event, type, counter)
      );
    }
    function Tracker() {
      this[CONNECTED] = new WeakSet;
      this[DISCONNECTED] = new WeakSet;
    }
  }
}
module.exports = disconnected;

},{}],11:[function(require,module,exports){
'use strict';
/*! (c) 2018 Andrea Giammarchi (ISC) */

const {
  eqeq, identity, indexOf, isReversed, next, append, remove, smartDiff
} = require('./utils.js');

const domdiff = (
  parentNode,     // where changes happen
  currentNodes,   // Array of current items/nodes
  futureNodes,    // Array of future items/nodes
  options         // optional object with one of the following properties
                  //  before: domNode
                  //  compare(generic, generic) => true if same generic
                  //  node(generic) => Node
) => {
  if (!options)
    options = {};

  const compare = options.compare || eqeq;
  const get = options.node || identity;
  const before = options.before == null ? null : get(options.before, 0);

  const currentLength = currentNodes.length;
  let currentEnd = currentLength;
  let currentStart = 0;

  let futureEnd = futureNodes.length;
  let futureStart = 0;

  // common prefix
  while (
    currentStart < currentEnd &&
    futureStart < futureEnd &&
    compare(currentNodes[currentStart], futureNodes[futureStart])
  ) {
    currentStart++;
    futureStart++;
  }

  // common suffix
  while (
    currentStart < currentEnd &&
    futureStart < futureEnd &&
    compare(currentNodes[currentEnd - 1], futureNodes[futureEnd - 1])
  ) {
    currentEnd--;
    futureEnd--;
  }

  const currentSame = currentStart === currentEnd;
  const futureSame = futureStart === futureEnd;

  // same list
  if (currentSame && futureSame)
    return futureNodes;

  // only stuff to add
  if (currentSame && futureStart < futureEnd) {
    append(
      get,
      parentNode,
      futureNodes,
      futureStart,
      futureEnd,
      next(get, currentNodes, currentStart, currentLength, before)
    );
    return futureNodes;
  }

  // only stuff to remove
  if (futureSame && currentStart < currentEnd) {
    remove(
      get,
      parentNode,
      currentNodes,
      currentStart,
      currentEnd
    );
    return futureNodes;
  }

  const currentChanges = currentEnd - currentStart;
  const futureChanges = futureEnd - futureStart;
  let i = -1;

  // 2 simple indels: the shortest sequence is a subsequence of the longest
  if (currentChanges < futureChanges) {
    i = indexOf(
      futureNodes,
      futureStart,
      futureEnd,
      currentNodes,
      currentStart,
      currentEnd,
      compare
    );
    // inner diff
    if (-1 < i) {
      append(
        get,
        parentNode,
        futureNodes,
        futureStart,
        i,
        get(currentNodes[currentStart], 0)
      );
      append(
        get,
        parentNode,
        futureNodes,
        i + currentChanges,
        futureEnd,
        next(get, currentNodes, currentEnd, currentLength, before)
      );
      return futureNodes;
    }
  }
  /* istanbul ignore else */
  else if (futureChanges < currentChanges) {
    i = indexOf(
      currentNodes,
      currentStart,
      currentEnd,
      futureNodes,
      futureStart,
      futureEnd,
      compare
    );
    // outer diff
    if (-1 < i) {
      remove(
        get,
        parentNode,
        currentNodes,
        currentStart,
        i
      );
      remove(
        get,
        parentNode,
        currentNodes,
        i + futureChanges,
        currentEnd
      );
      return futureNodes;
    }
  }

  // common case with one replacement for many nodes
  // or many nodes replaced for a single one
  /* istanbul ignore else */
  if ((currentChanges < 2 || futureChanges < 2)) {
    append(
      get,
      parentNode,
      futureNodes,
      futureStart,
      futureEnd,
      get(currentNodes[currentStart], 0)
    );
    remove(
      get,
      parentNode,
      currentNodes,
      currentStart,
      currentEnd
    );
    return futureNodes;
  }

  // the half match diff part has been skipped in petit-dom
  // https://github.com/yelouafi/petit-dom/blob/bd6f5c919b5ae5297be01612c524c40be45f14a7/src/vdom.js#L391-L397
  // accordingly, I think it's safe to skip in here too
  // if one day it'll come out like the speediest thing ever to do
  // then I might add it in here too

  // Extra: before going too fancy, what about reversed lists ?
  //        This should bail out pretty quickly if that's not the case.
  if (
    currentChanges === futureChanges &&
    isReversed(
      futureNodes,
      futureEnd,
      currentNodes,
      currentStart,
      currentEnd,
      compare
    )
  ) {
    append(
      get,
      parentNode,
      futureNodes,
      futureStart,
      futureEnd,
      next(get, currentNodes, currentEnd, currentLength, before)
    );
    return futureNodes;
  }

  // last resort through a smart diff
  smartDiff(
    get,
    parentNode,
    futureNodes,
    futureStart,
    futureEnd,
    futureChanges,
    currentNodes,
    currentStart,
    currentEnd,
    currentChanges,
    currentLength,
    compare,
    before
  );

  return futureNodes;
};

Object.defineProperty(exports, '__esModule', {value: true}).default = domdiff;

},{"./utils.js":12}],12:[function(require,module,exports){
'use strict';
const Map = (require('@ungap/essential-map'));

const append = (get, parent, children, start, end, before) => {
  if ((end - start) < 2)
    parent.insertBefore(get(children[start], 1), before);
  else {
    const fragment = parent.ownerDocument.createDocumentFragment();
    while (start < end)
      fragment.appendChild(get(children[start++], 1));
    parent.insertBefore(fragment, before);
  }
};
exports.append = append;

const eqeq = (a, b) => a == b;
exports.eqeq = eqeq;

const identity = O => O;
exports.identity = identity;

const indexOf = (
  moreNodes,
  moreStart,
  moreEnd,
  lessNodes,
  lessStart,
  lessEnd,
  compare
) => {
  const length = lessEnd - lessStart;
  /* istanbul ignore if */
  if (length < 1)
    return -1;
  while ((moreEnd - moreStart) >= length) {
    let m = moreStart;
    let l = lessStart;
    while (
      m < moreEnd &&
      l < lessEnd &&
      compare(moreNodes[m], lessNodes[l])
    ) {
      m++;
      l++;
    }
    if (l === lessEnd)
      return moreStart;
    moreStart = m + 1;
  }
  return -1;
};
exports.indexOf = indexOf;

const isReversed = (
  futureNodes,
  futureEnd,
  currentNodes,
  currentStart,
  currentEnd,
  compare
) => {
  while (
    currentStart < currentEnd &&
    compare(
      currentNodes[currentStart],
      futureNodes[futureEnd - 1]
    )) {
      currentStart++;
      futureEnd--;
    };
  return futureEnd === 0;
};
exports.isReversed = isReversed;

const next = (get, list, i, length, before) => i < length ?
              get(list[i], 0) :
              (0 < i ?
                get(list[i - 1], -0).nextSibling :
                before);
exports.next = next;

const remove = (get, parent, children, start, end) => {
  if ((end - start) < 2)
    parent.removeChild(get(children[start], -1));
  else {
    const range = parent.ownerDocument.createRange();
    range.setStartBefore(get(children[start], -1));
    range.setEndAfter(get(children[end - 1], -1));
    range.deleteContents();
  }
};
exports.remove = remove;

// - - - - - - - - - - - - - - - - - - -
// diff related constants and utilities
// - - - - - - - - - - - - - - - - - - -

const DELETION = -1;
const INSERTION = 1;
const SKIP = 0;
const SKIP_OND = 50;

const HS = (
  futureNodes,
  futureStart,
  futureEnd,
  futureChanges,
  currentNodes,
  currentStart,
  currentEnd,
  currentChanges
) => {

  let k = 0;
  /* istanbul ignore next */
  let minLen = futureChanges < currentChanges ? futureChanges : currentChanges;
  const link = Array(minLen++);
  const tresh = Array(minLen);
  tresh[0] = -1;

  for (let i = 1; i < minLen; i++)
    tresh[i] = currentEnd;

  const keymap = new Map;
  for (let i = currentStart; i < currentEnd; i++)
    keymap.set(currentNodes[i], i);

  for (let i = futureStart; i < futureEnd; i++) {
    const idxInOld = keymap.get(futureNodes[i]);
    if (idxInOld != null) {
      k = findK(tresh, minLen, idxInOld);
      /* istanbul ignore else */
      if (-1 < k) {
        tresh[k] = idxInOld;
        link[k] = {
          newi: i,
          oldi: idxInOld,
          prev: link[k - 1]
        };
      }
    }
  }

  k = --minLen;
  --currentEnd;
  while (tresh[k] > currentEnd) --k;

  minLen = currentChanges + futureChanges - k;
  const diff = Array(minLen);
  let ptr = link[k];
  --futureEnd;
  while (ptr) {
    const {newi, oldi} = ptr;
    while (futureEnd > newi) {
      diff[--minLen] = INSERTION;
      --futureEnd;
    }
    while (currentEnd > oldi) {
      diff[--minLen] = DELETION;
      --currentEnd;
    }
    diff[--minLen] = SKIP;
    --futureEnd;
    --currentEnd;
    ptr = ptr.prev;
  }
  while (futureEnd >= futureStart) {
    diff[--minLen] = INSERTION;
    --futureEnd;
  }
  while (currentEnd >= currentStart) {
    diff[--minLen] = DELETION;
    --currentEnd;
  }
  return diff;
};

// this is pretty much the same petit-dom code without the delete map part
// https://github.com/yelouafi/petit-dom/blob/bd6f5c919b5ae5297be01612c524c40be45f14a7/src/vdom.js#L556-L561
const OND = (
  futureNodes,
  futureStart,
  rows,
  currentNodes,
  currentStart,
  cols,
  compare
) => {
  const length = rows + cols;
  const v = [];
  let d, k, r, c, pv, cv, pd;
  outer: for (d = 0; d <= length; d++) {
    /* istanbul ignore if */
    if (d > SKIP_OND)
      return null;
    pd = d - 1;
    /* istanbul ignore next */
    pv = d ? v[d - 1] : [0, 0];
    cv = v[d] = [];
    for (k = -d; k <= d; k += 2) {
      if (k === -d || (k !== d && pv[pd + k - 1] < pv[pd + k + 1])) {
        c = pv[pd + k + 1];
      } else {
        c = pv[pd + k - 1] + 1;
      }
      r = c - k;
      while (
        c < cols &&
        r < rows &&
        compare(
          currentNodes[currentStart + c],
          futureNodes[futureStart + r]
        )
      ) {
        c++;
        r++;
      }
      if (c === cols && r === rows) {
        break outer;
      }
      cv[d + k] = c;
    }
  }

  const diff = Array(d / 2 + length / 2);
  let diffIdx = diff.length - 1;
  for (d = v.length - 1; d >= 0; d--) {
    while (
      c > 0 &&
      r > 0 &&
      compare(
        currentNodes[currentStart + c - 1],
        futureNodes[futureStart + r - 1]
      )
    ) {
      // diagonal edge = equality
      diff[diffIdx--] = SKIP;
      c--;
      r--;
    }
    if (!d)
      break;
    pd = d - 1;
    /* istanbul ignore next */
    pv = d ? v[d - 1] : [0, 0];
    k = c - r;
    if (k === -d || (k !== d && pv[pd + k - 1] < pv[pd + k + 1])) {
      // vertical edge = insertion
      r--;
      diff[diffIdx--] = INSERTION;
    } else {
      // horizontal edge = deletion
      c--;
      diff[diffIdx--] = DELETION;
    }
  }
  return diff;
};

const applyDiff = (
  diff,
  get,
  parentNode,
  futureNodes,
  futureStart,
  currentNodes,
  currentStart,
  currentLength,
  before
) => {
  const live = new Map;
  const length = diff.length;
  let currentIndex = currentStart;
  let i = 0;
  while (i < length) {
    switch (diff[i++]) {
      case SKIP:
        futureStart++;
        currentIndex++;
        break;
      case INSERTION:
        // TODO: bulk appends for sequential nodes
        live.set(futureNodes[futureStart], 1);
        append(
          get,
          parentNode,
          futureNodes,
          futureStart++,
          futureStart,
          currentIndex < currentLength ?
            get(currentNodes[currentIndex], 1) :
            before
        );
        break;
      case DELETION:
        currentIndex++;
        break;
    }
  }
  i = 0;
  while (i < length) {
    switch (diff[i++]) {
      case SKIP:
        currentStart++;
        break;
      case DELETION:
        // TODO: bulk removes for sequential nodes
        if (live.has(currentNodes[currentStart]))
          currentStart++;
        else
          remove(
            get,
            parentNode,
            currentNodes,
            currentStart++,
            currentStart
          );
        break;
    }
  }
};

const findK = (ktr, length, j) => {
  let lo = 1;
  let hi = length;
  while (lo < hi) {
    const mid = ((lo + hi) / 2) >>> 0;
    if (j < ktr[mid])
      hi = mid;
    else
      lo = mid + 1;
  }
  return lo;
}

const smartDiff = (
  get,
  parentNode,
  futureNodes,
  futureStart,
  futureEnd,
  futureChanges,
  currentNodes,
  currentStart,
  currentEnd,
  currentChanges,
  currentLength,
  compare,
  before
) => {
  applyDiff(
    OND(
      futureNodes,
      futureStart,
      futureChanges,
      currentNodes,
      currentStart,
      currentChanges,
      compare
    ) ||
    HS(
      futureNodes,
      futureStart,
      futureEnd,
      futureChanges,
      currentNodes,
      currentStart,
      currentEnd,
      currentChanges
    ),
    get,
    parentNode,
    futureNodes,
    futureStart,
    currentNodes,
    currentStart,
    currentLength,
    before
  );
};
exports.smartDiff = smartDiff;

},{"@ungap/essential-map":3}],13:[function(require,module,exports){
'use strict';
// Custom
var UID = '-' + Math.random().toFixed(6) + '%';
//                           Edge issue!
if (!(function (template, content, tabindex) {
  return content in template && (
    (template.innerHTML = '<p ' + tabindex + '="' + UID + '"></p>'),
    template[content].childNodes[0].getAttribute(tabindex) == UID
  );
}(document.createElement('template'), 'content', 'tabindex'))) {
  UID = '_dt: ' + UID.slice(1, -1) + ';';
}
var UIDC = '<!--' + UID + '-->';

// DOM
var COMMENT_NODE = 8;
var DOCUMENT_FRAGMENT_NODE = 11;
var ELEMENT_NODE = 1;
var TEXT_NODE = 3;

var SHOULD_USE_TEXT_CONTENT = /^(?:style|textarea)$/i;
var VOID_ELEMENTS = /^(?:area|base|br|col|embed|hr|img|input|keygen|link|menuitem|meta|param|source|track|wbr)$/i;

exports.UID = UID;
exports.UIDC = UIDC;
exports.COMMENT_NODE = COMMENT_NODE;
exports.DOCUMENT_FRAGMENT_NODE = DOCUMENT_FRAGMENT_NODE;
exports.ELEMENT_NODE = ELEMENT_NODE;
exports.TEXT_NODE = TEXT_NODE;
exports.SHOULD_USE_TEXT_CONTENT = SHOULD_USE_TEXT_CONTENT;
exports.VOID_ELEMENTS = VOID_ELEMENTS;

},{}],14:[function(require,module,exports){
'use strict';
// globals
const WeakMap = (m => m.__esModule ? /* istanbul ignore next */ m.default : /* istanbul ignore next */ m)(require('@ungap/weakmap'));

// utils
const createContent = (m => m.__esModule ? /* istanbul ignore next */ m.default : /* istanbul ignore next */ m)(require('@ungap/create-content'));
const importNode = (m => m.__esModule ? /* istanbul ignore next */ m.default : /* istanbul ignore next */ m)(require('@ungap/import-node'));
const trim = (m => m.__esModule ? /* istanbul ignore next */ m.default : /* istanbul ignore next */ m)(require('@ungap/trim'));

// local
const sanitize = (m => m.__esModule ? /* istanbul ignore next */ m.default : /* istanbul ignore next */ m)(require('./sanitizer.js'));
const {find, parse} = require('./walker.js');

// the domtagger 🎉
Object.defineProperty(exports, '__esModule', {value: true}).default = domtagger;

var parsed = new WeakMap;
var referenced = new WeakMap;

function createInfo(options, template) {
  var markup = sanitize(template);
  var transform = options.transform;
  if (transform)
    markup = transform(markup);
  var content = createContent(markup, options.type);
  cleanContent(content);
  var holes = [];
  parse(content, holes, template.slice(0), []);
  var info = {
    content: content,
    updates: function (content) {
      var callbacks = [];
      var len = holes.length;
      var i = 0;
      while (i < len) {
        var info = holes[i++];
        var node = find(content, info.path);
        switch (info.type) {
          case 'any':
            callbacks.push(options.any(node, []));
            break;
          case 'attr':
            callbacks.push(options.attribute(node, info.name, info.node));
            break;
          case 'text':
            callbacks.push(options.text(node));
            node.textContent = '';
            break;
        }
      }
      return function () {
        var length = arguments.length;
        var values = length - 1;
        var i = 1;
        if (len !== values) {
          throw new Error(
            values + ' values instead of ' + len + '\n' +
            template.join(', ')
          );
        }
        while (i < length)
          callbacks[i - 1](arguments[i++]);
        return content;
      };
    }
  };
  parsed.set(template, info);
  return info;
}

function createDetails(options, template) {
  var info = parsed.get(template) || createInfo(options, template);
  var content = importNode.call(document, info.content, true);
  var details = {
    content: content,
    template: template,
    updates: info.updates(content)
  };
  referenced.set(options, details);
  return details;
}

function domtagger(options) {
  return function (template) {
    var details = referenced.get(options);
    if (details == null || details.template !== template)
      details = createDetails(options, template);
    details.updates.apply(null, arguments);
    return details.content;
  };
}

function cleanContent(fragment) {
  var childNodes = fragment.childNodes;
  var i = childNodes.length;
  while (i--) {
    var child = childNodes[i];
    if (
      child.nodeType !== 1 &&
      trim.call(child.textContent).length === 0
    ) {
      fragment.removeChild(child);
    }
  }
}

},{"./sanitizer.js":15,"./walker.js":16,"@ungap/create-content":1,"@ungap/import-node":5,"@ungap/trim":8,"@ungap/weakmap":9}],15:[function(require,module,exports){
'use strict';
const {UID, UIDC, VOID_ELEMENTS} = require('./constants.js');

Object.defineProperty(exports, '__esModule', {value: true}).default = function (template) {
  return template.join(UIDC)
          .replace(selfClosing, fullClosing)
          .replace(attrSeeker, attrReplacer);
}

var spaces = ' \\f\\n\\r\\t';
var almostEverything = '[^ ' + spaces + '\\/>"\'=]+';
var attrName = '[ ' + spaces + ']+' + almostEverything;
var tagName = '<([A-Za-z]+[A-Za-z0-9:_-]*)((?:';
var attrPartials = '(?:\\s*=\\s*(?:\'[^\']*?\'|"[^"]*?"|<[^>]*?>|' + almostEverything + '))?)';

var attrSeeker = new RegExp(tagName + attrName + attrPartials + '+)([ ' + spaces + ']*/?>)', 'g');
var selfClosing = new RegExp(tagName + attrName + attrPartials + '*)([ ' + spaces + ']*/>)', 'g');
var findAttributes = new RegExp('(' + attrName + '\\s*=\\s*)([\'"]?)' + UIDC + '\\2', 'gi');

function attrReplacer($0, $1, $2, $3) {
  return '<' + $1 + $2.replace(findAttributes, replaceAttributes) + $3;
}

function replaceAttributes($0, $1, $2) {
  return $1 + ($2 || '"') + UID + ($2 || '"');
}

function fullClosing($0, $1, $2) {
  return VOID_ELEMENTS.test($1) ? $0 : ('<' + $1 + $2 + '></' + $1 + '>');
}

},{"./constants.js":13}],16:[function(require,module,exports){
'use strict';
const Map = (m => m.__esModule ? /* istanbul ignore next */ m.default : /* istanbul ignore next */ m)(require('@ungap/essential-map'));
const trim = (m => m.__esModule ? /* istanbul ignore next */ m.default : /* istanbul ignore next */ m)(require('@ungap/trim'));

const {
  UID, UIDC, COMMENT_NODE, ELEMENT_NODE, SHOULD_USE_TEXT_CONTENT, TEXT_NODE
} = require('./constants.js');

exports.find = find;
exports.parse = parse;

function create(type, node, path, name) {
  return {name: name, node: node, path: path, type: type};
}

function find(node, path) {
  var length = path.length;
  var i = 0;
  while (i < length)
    node = node.childNodes[path[i++]];
  return node;
}

function parse(node, holes, parts, path) {
  var childNodes = node.childNodes;
  var length = childNodes.length;
  var i = 0;
  while (i < length) {
    var child = childNodes[i];
    switch (child.nodeType) {
      case ELEMENT_NODE:
        var childPath = path.concat(i);
        parseAttributes(child, holes, parts, childPath);
        parse(child, holes, parts, childPath);
        break;
      case COMMENT_NODE:
        if (child.textContent === UID) {
          parts.shift();
          holes.push(
            // basicHTML or other non standard engines
            // might end up having comments in nodes
            // where they shouldn't, hence this check.
            SHOULD_USE_TEXT_CONTENT.test(node.nodeName) ?
              create('text', node, path) :
              create('any', child, path.concat(i))
          );
        }
        break;
      case TEXT_NODE:
        // the following ignore is actually covered by browsers
        // only basicHTML ends up on previous COMMENT_NODE case
        // instead of TEXT_NODE because it knows nothing about
        // special style or textarea behavior
        /* istanbul ignore if */
        if (
          SHOULD_USE_TEXT_CONTENT.test(node.nodeName) &&
          trim.call(child.textContent) === UIDC
        ) {
          parts.shift();
          holes.push(create('text', node, path));
        }
        break;
    }
    i++;
  }
}

function parseAttributes(node, holes, parts, path) {
  var cache = new Map;
  var attributes = node.attributes;
  var remove = [];
  var array = remove.slice.call(attributes, 0);
  var length = array.length;
  var i = 0;
  while (i < length) {
    var attribute = array[i++];
    if (attribute.value === UID) {
      var name = attribute.name;
      // the following ignore is covered by IE
      // and the IE9 double viewBox test
      /* istanbul ignore else */
      if (!cache.has(name)) {
        var realName = parts.shift().replace(/^(?:|[\S\s]*?\s)(\S+?)\s*=\s*['"]?$/, '$1');
        var value = attributes[realName] ||
                      // the following ignore is covered by browsers
                      // while basicHTML is already case-sensitive
                      /* istanbul ignore next */
                      attributes[realName.toLowerCase()];
        cache.set(name, value);
        holes.push(create('attr', value, path, realName));
      }
      remove.push(attribute);
    }
  }
  length = remove.length;
  i = 0;
  while (i < length) {
    // Edge HTML bug #16878726
    var attr = remove[i++];
    if (/^id$/i.test(attr.name))
      node.removeAttribute(attr.name);
    // standard browsers would work just fine here
    else
      node.removeAttributeNode(attr);
  }

  // This is a very specific Firefox/Safari issue
  // but since it should be a not so common pattern,
  // it's probably worth patching regardless.
  // Basically, scripts created through strings are death.
  // You need to create fresh new scripts instead.
  // TODO: is there any other node that needs such nonsense?
  var nodeName = node.nodeName;
  if (/^script$/i.test(nodeName)) {
    // this used to be like that
    // var script = createElement(node, nodeName);
    // then Edge arrived and decided that scripts created
    // through template documents aren't worth executing
    // so it became this ... hopefully it won't hurt in the wild
    var script = document.createElement(nodeName);
    length = attributes.length;
    i = 0;
    while (i < length)
      script.setAttributeNode(attributes[i++].cloneNode(true));
    script.textContent = node.textContent;
    node.parentNode.replaceChild(script, node);
  }
}

},{"./constants.js":13,"@ungap/essential-map":3,"@ungap/trim":8}],17:[function(require,module,exports){
/*! (c) Andrea Giammarchi - ISC */
var hyperStyle = (function (){'use strict';
  // from https://github.com/developit/preact/blob/33fc697ac11762a1cb6e71e9847670d047af7ce5/src/varants.js
  var IS_NON_DIMENSIONAL = /acit|ex(?:s|g|n|p|$)|rph|ows|mnc|ntw|ine[ch]|zoo|^ord/i;
  var hyphen = /([^A-Z])([A-Z]+)/g;
  return function hyperStyle(node, original) {
    return 'ownerSVGElement' in node ? svg(node, original) : update(node.style, false);
  };
  function ized($0, $1, $2) {
    return $1 + '-' + $2.toLowerCase();
  }
  function svg(node, original) {
    var style;
    if (original)
      style = original.cloneNode(true);
    else {
      node.setAttribute('style', '--hyper:style;');
      style = node.getAttributeNode('style');
    }
    style.value = '';
    node.setAttributeNode(style);
    return update(style, true);
  }
  function toStyle(object) {
    var key, css = [];
    for (key in object)
      css.push(key.replace(hyphen, ized), ':', object[key], ';');
    return css.join('');
  }
  function update(style, isSVG) {
    var oldType, oldValue;
    return function (newValue) {
      var info, key, styleValue, value;
      switch (typeof newValue) {
        case 'object':
          if (newValue) {
            if (oldType === 'object') {
              if (!isSVG) {
                if (oldValue !== newValue) {
                  for (key in oldValue) {
                    if (!(key in newValue)) {
                      style[key] = '';
                    }
                  }
                }
              }
            } else {
              if (isSVG)
                style.value = '';
              else
                style.cssText = '';
            }
            info = isSVG ? {} : style;
            for (key in newValue) {
              value = newValue[key];
              styleValue = typeof value === 'number' &&
                                  !IS_NON_DIMENSIONAL.test(key) ?
                                  (value + 'px') : value;
              if (!isSVG && /^--/.test(key))
                info.setProperty(key, styleValue);
              else
                info[key] = styleValue;
            }
            oldType = 'object';
            if (isSVG)
              style.value = toStyle((oldValue = info));
            else
              oldValue = newValue;
            break;
          }
        default:
          if (oldValue != newValue) {
            oldType = 'string';
            oldValue = newValue;
            if (isSVG)
              style.value = newValue || '';
            else
              style.cssText = newValue || '';
          }
          break;
      }
    };
  }
}());
module.exports = hyperStyle;

},{}],18:[function(require,module,exports){
'use strict';
const CustomEvent = (m => m.__esModule ? /* istanbul ignore next */ m.default : /* istanbul ignore next */ m)(require('@ungap/custom-event'));
const Map = (m => m.__esModule ? /* istanbul ignore next */ m.default : /* istanbul ignore next */ m)(require('@ungap/essential-map'));
const WeakMap = (m => m.__esModule ? /* istanbul ignore next */ m.default : /* istanbul ignore next */ m)(require('@ungap/weakmap'));

// hyperHTML.Component is a very basic class
// able to create Custom Elements like components
// including the ability to listen to connect/disconnect
// events via onconnect/ondisconnect attributes
// Components can be created imperatively or declaratively.
// The main difference is that declared components
// will not automatically render on setState(...)
// to simplify state handling on render.
function Component() {
  return this; // this is needed in Edge !!!
}
Object.defineProperty(exports, '__esModule', {value: true}).default = Component

// Component is lazily setup because it needs
// wire mechanism as lazy content
function setup(content) {
  // there are various weakly referenced variables in here
  // and mostly are to use Component.for(...) static method.
  const children = new WeakMap;
  const create = Object.create;
  const createEntry = (wm, id, component) => {
    wm.set(id, component);
    return component;
  };
  const get = (Class, info, context, id) => {
    const relation = info.get(Class) || relate(Class, info);
    switch (typeof id) {
      case 'object':
      case 'function':
        const wm = relation.w || (relation.w = new WeakMap);
        return wm.get(id) || createEntry(wm, id, new Class(context));
      default:
        const sm = relation.p || (relation.p = create(null));
        return sm[id] || (sm[id] = new Class(context));
    }
  };
  const relate = (Class, info) => {
    const relation = {w: null, p: null};
    info.set(Class, relation);
    return relation;
  };
  const set = context => {
    const info = new Map;
    children.set(context, info);
    return info;
  };
  // The Component Class
  Object.defineProperties(
    Component,
    {
      // Component.for(context[, id]) is a convenient way
      // to automatically relate data/context to children components
      // If not created yet, the new Component(context) is weakly stored
      // and after that same instance would always be returned.
      for: {
        configurable: true,
        value(context, id) {
          return get(
            this,
            children.get(context) || set(context),
            context,
            id == null ?
              'default' : id
          );
        }
      }
    }
  );
  Object.defineProperties(
    Component.prototype,
    {
      // all events are handled with the component as context
      handleEvent: {value(e) {
        const ct = e.currentTarget;
        this[
          ('getAttribute' in ct && ct.getAttribute('data-call')) ||
          ('on' + e.type)
        ](e);
      }},
      // components will lazily define html or svg properties
      // as soon as these are invoked within the .render() method
      // Such render() method is not provided by the base class
      // but it must be available through the Component extend.
      // Declared components could implement a
      // render(props) method too and use props as needed.
      html: lazyGetter('html', content),
      svg: lazyGetter('svg', content),
      // the state is a very basic/simple mechanism inspired by Preact
      state: lazyGetter('state', function () { return this.defaultState; }),
      // it is possible to define a default state that'd be always an object otherwise
      defaultState: {get() { return {}; }},
      // dispatch a bubbling, cancelable, custom event
      // through the first known/available node
      dispatch: {value(type, detail) {
        const {_wire$} = this;
        if (_wire$) {
          const event = new CustomEvent(type, {
            bubbles: true,
            cancelable: true,
            detail
          });
          event.component = this;
          return (_wire$.dispatchEvent ?
                    _wire$ :
                    _wire$.childNodes[0]
                  ).dispatchEvent(event);
        }
        return false;
      }},
      // setting some property state through a new object
      // or a callback, triggers also automatically a render
      // unless explicitly specified to not do so (render === false)
      setState: {value(state, render) {
        const target = this.state;
        const source = typeof state === 'function' ? state.call(this, target) : state;
        for (const key in source) target[key] = source[key];
        if (render !== false)
          this.render();
        return this;
      }}
    }
  );
}
exports.setup = setup

// instead of a secret key I could've used a WeakMap
// However, attaching a property directly will result
// into better performance with thousands of components
// hanging around, and less memory pressure caused by the WeakMap
const lazyGetter = (type, fn) => {
  const secret = '_' + type + '$';
  return {
    get() {
      return this[secret] || setValue(this, secret, fn.call(this, type));
    },
    set(value) {
      setValue(this, secret, value);
    }
  };
};

// shortcut to set value on get or set(value)
const setValue = (self, secret, value) =>
  Object.defineProperty(self, secret, {
    configurable: true,
    value: typeof value === 'function' ?
      function () {
        return (self._wire$ = value.apply(this, arguments));
      } :
      value
  })[secret]
;

},{"@ungap/custom-event":2,"@ungap/essential-map":3,"@ungap/weakmap":9}],19:[function(require,module,exports){
'use strict';
const { append, doc, fragment } = require('../shared/utils.js');

function Wire(childNodes) {
  this.childNodes = childNodes;
  this.length = childNodes.length;
  this.first = childNodes[0];
  this.last = childNodes[this.length - 1];
  this._ = null;
}
Object.defineProperty(exports, '__esModule', {value: true}).default = Wire

// when a wire is inserted, all its nodes will follow
Wire.prototype.valueOf = function valueOf(different) {
  const noFragment = this._ == null;
  if (noFragment)
    this._ = fragment(this.first);
  /* istanbul ignore else */
  if (noFragment || different)
    append(this._, this.childNodes);
  return this._;
};

// when a wire is removed, all its nodes must be removed as well
Wire.prototype.remove = function remove() {
  this._ = null;
  const first = this.first;
  const last = this.last;
  if (this.length === 2) {
    last.parentNode.removeChild(last);
  } else {
    const range = doc(first).createRange();
    range.setStartBefore(this.childNodes[1]);
    range.setEndAfter(last);
    range.deleteContents();
  }
  return first;
};

},{"../shared/utils.js":26}],20:[function(require,module,exports){
'use strict';
const WeakMap = (m => m.__esModule ? /* istanbul ignore next */ m.default : /* istanbul ignore next */ m)(require('@ungap/weakmap'));

const {OWNER_SVG_ELEMENT} = require('../shared/constants.js');
const {Tagger} = require('../objects/Updates.js');
const {reArguments} = require('../shared/utils.js');

// a weak collection of contexts that
// are already known to hyperHTML
const bewitched = new WeakMap;

// better known as hyper.bind(node), the render is
// the main tag function in charge of fully upgrading
// or simply updating, contexts used as hyperHTML targets.
// The `this` context is either a regular DOM node or a fragment.
function render() {
  const wicked = bewitched.get(this);
  const args = reArguments.apply(null, arguments);
  if (wicked && wicked.template === args[0]) {
    wicked.tagger.apply(null, args);
  } else {
    upgrade.apply(this, args);
  }
  return this;
}

// an upgrade is in charge of collecting template info,
// parse it once, if unknown, to map all interpolations
// as single DOM callbacks, relate such template
// to the current context, and render it after cleaning the context up
function upgrade() {
  const args = reArguments.apply(null, arguments);
  const type = OWNER_SVG_ELEMENT in this ? 'svg' : 'html';
  const tagger = new Tagger(type);
  bewitched.set(this, {tagger, template: args[0]});
  this.textContent = '';
  this.appendChild(tagger.apply(null, args));
}

Object.defineProperty(exports, '__esModule', {value: true}).default = render;

},{"../objects/Updates.js":24,"../shared/constants.js":25,"../shared/utils.js":26,"@ungap/weakmap":9}],21:[function(require,module,exports){
'use strict';
const WeakMap = (m => m.__esModule ? /* istanbul ignore next */ m.default : /* istanbul ignore next */ m)(require('@ungap/weakmap'));

const Wire = (m => m.__esModule ? /* istanbul ignore next */ m.default : /* istanbul ignore next */ m)(require('../classes/Wire.js'));

const {Tagger} = require('../objects/Updates.js');
const {reArguments, slice} = require('../shared/utils.js');

// all wires used per each context
const wires = new WeakMap;

// A wire is a callback used as tag function
// to lazily relate a generic object to a template literal.
// hyper.wire(user)`<div id=user>${user.name}</div>`; => the div#user
// This provides the ability to have a unique DOM structure
// related to a unique JS object through a reusable template literal.
// A wire can specify a type, as svg or html, and also an id
// via html:id or :id convention. Such :id allows same JS objects
// to be associated to different DOM structures accordingly with
// the used template literal without losing previously rendered parts.
const wire = (obj, type) => obj == null ?
  content(type || 'html') :
  weakly(obj, type || 'html');

// A wire content is a virtual reference to one or more nodes.
// It's represented by either a DOM node, or an Array.
// In both cases, the wire content role is to simply update
// all nodes through the list of related callbacks.
// In few words, a wire content is like an invisible parent node
// in charge of updating its content like a bound element would do.
const content = type => {
  let wire, tagger, template;
  return function () {
    const args = reArguments.apply(null, arguments);
    if (template !== args[0]) {
      template = args[0];
      tagger = new Tagger(type);
      wire = wireContent(tagger.apply(tagger, args));
    } else {
      tagger.apply(tagger, args);
    }
    return wire;
  };
};

// wires are weakly created through objects.
// Each object can have multiple wires associated
// and this is thanks to the type + :id feature.
const weakly = (obj, type) => {
  const i = type.indexOf(':');
  let wire = wires.get(obj);
  let id = type;
  if (-1 < i) {
    id = type.slice(i + 1);
    type = type.slice(0, i) || 'html';
  }
  if (!wire)
    wires.set(obj, wire = {});
  return wire[id] || (wire[id] = content(type));
};

// A document fragment loses its nodes 
// as soon as it is appended into another node.
// This has the undesired effect of losing wired content
// on a second render call, because (by then) the fragment would be empty:
// no longer providing access to those sub-nodes that ultimately need to
// stay associated with the original interpolation.
// To prevent hyperHTML from forgetting about a fragment's sub-nodes,
// fragments are instead returned as an Array of nodes or, if there's only one entry,
// as a single referenced node which, unlike fragments, will indeed persist
// wire content throughout multiple renderings.
// The initial fragment, at this point, would be used as unique reference to this
// array of nodes or to this single referenced node.
const wireContent = node => {
  const childNodes = node.childNodes;
  return childNodes.length === 1 ?
    childNodes[0] :
    new Wire(slice.call(childNodes, 0));
};

exports.content = content;
exports.weakly = weakly;
Object.defineProperty(exports, '__esModule', {value: true}).default = wire;

},{"../classes/Wire.js":19,"../objects/Updates.js":24,"../shared/utils.js":26,"@ungap/weakmap":9}],22:[function(require,module,exports){
'use strict';
/*! (c) Andrea Giammarchi (ISC) */
const WeakMap = (m => m.__esModule ? /* istanbul ignore next */ m.default : /* istanbul ignore next */ m)(require('@ungap/weakmap'));
const WeakSet = (m => m.__esModule ? /* istanbul ignore next */ m.default : /* istanbul ignore next */ m)(require('@ungap/essential-weakset'));

const diff = (m => m.__esModule ? /* istanbul ignore next */ m.default : /* istanbul ignore next */ m)(require('domdiff'));
const Component = (m => m.__esModule ? /* istanbul ignore next */ m.default : /* istanbul ignore next */ m)(require('./classes/Component.js'));
const {setup} = require('./classes/Component.js');
const Intent = (m => m.__esModule ? /* istanbul ignore next */ m.default : /* istanbul ignore next */ m)(require('./objects/Intent.js'));
const {observe, Tagger} = require('./objects/Updates.js');
const wire = (m => m.__esModule ? /* istanbul ignore next */ m.default : /* istanbul ignore next */ m)(require('./hyper/wire.js'));
const {content, weakly} = require('./hyper/wire.js');
const render = (m => m.__esModule ? /* istanbul ignore next */ m.default : /* istanbul ignore next */ m)(require('./hyper/render.js'));

// all functions are self bound to the right context
// you can do the following
// const {bind, wire} = hyperHTML;
// and use them right away: bind(node)`hello!`;
const bind = context => render.bind(context);
const define = Intent.define;
const tagger = Tagger.prototype;

hyper.Component = Component;
hyper.bind = bind;
hyper.define = define;
hyper.diff = diff;
hyper.hyper = hyper;
hyper.observe = observe;
hyper.tagger = tagger;
hyper.wire = wire;

// exported as shared utils
// for projects based on hyperHTML
// that don't necessarily need upfront polyfills
// i.e. those still targeting IE
hyper._ = {
  WeakMap,
  WeakSet
};

// the wire content is the lazy defined
// html or svg property of each hyper.Component
setup(content);

// everything is exported directly or through the
// hyperHTML callback, when used as top level script
exports.Component = Component;
exports.bind = bind;
exports.define = define;
exports.diff = diff;
exports.hyper = hyper;
exports.observe = observe;
exports.tagger = tagger;
exports.wire = wire;

// by default, hyperHTML is a smart function
// that "magically" understands what's the best
// thing to do with passed arguments
function hyper(HTML) {
  return arguments.length < 2 ?
    (HTML == null ?
      content('html') :
      (typeof HTML === 'string' ?
        hyper.wire(null, HTML) :
        ('raw' in HTML ?
          content('html')(HTML) :
          ('nodeType' in HTML ?
            hyper.bind(HTML) :
            weakly(HTML, 'html')
          )
        )
      )) :
    ('raw' in HTML ?
      content('html') : hyper.wire
    ).apply(null, arguments);
}
Object.defineProperty(exports, '__esModule', {value: true}).default = hyper

},{"./classes/Component.js":18,"./hyper/render.js":20,"./hyper/wire.js":21,"./objects/Intent.js":23,"./objects/Updates.js":24,"@ungap/essential-weakset":4,"@ungap/weakmap":9,"domdiff":11}],23:[function(require,module,exports){
'use strict';
const attributes = {};
const intents = {};
const keys = [];
const hasOwnProperty = intents.hasOwnProperty;

let length = 0;

Object.defineProperty(exports, '__esModule', {value: true}).default = {

  // used to invoke right away hyper:attributes
  attributes,

  // hyperHTML.define('intent', (object, update) => {...})
  // can be used to define a third parts update mechanism
  // when every other known mechanism failed.
  // hyper.define('user', info => info.name);
  // hyper(node)`<p>${{user}}</p>`;
  define: (intent, callback) => {
    if (intent.indexOf('-') < 0) {
      if (!(intent in intents)) {
        length = keys.push(intent);
      }
      intents[intent] = callback;
    } else {
      attributes[intent] = callback;
    }
  },

  // this method is used internally as last resort
  // to retrieve a value out of an object
  invoke: (object, callback) => {
    for (let i = 0; i < length; i++) {
      let key = keys[i];
      if (hasOwnProperty.call(object, key)) {
        return intents[key](object[key], callback);
      }
    }
  }
};

},{}],24:[function(require,module,exports){
'use strict';
const CustomEvent = (m => m.__esModule ? /* istanbul ignore next */ m.default : /* istanbul ignore next */ m)(require('@ungap/custom-event'));
const WeakSet = (m => m.__esModule ? /* istanbul ignore next */ m.default : /* istanbul ignore next */ m)(require('@ungap/essential-weakset'));
const isArray = (m => m.__esModule ? /* istanbul ignore next */ m.default : /* istanbul ignore next */ m)(require('@ungap/is-array'));
const createContent = (m => m.__esModule ? /* istanbul ignore next */ m.default : /* istanbul ignore next */ m)(require('@ungap/create-content'));

const disconnected = (m => m.__esModule ? /* istanbul ignore next */ m.default : /* istanbul ignore next */ m)(require('disconnected'));
const domdiff = (m => m.__esModule ? /* istanbul ignore next */ m.default : /* istanbul ignore next */ m)(require('domdiff'));
const domtagger = (m => m.__esModule ? /* istanbul ignore next */ m.default : /* istanbul ignore next */ m)(require('domtagger'));
const hyperStyle = (m => m.__esModule ? /* istanbul ignore next */ m.default : /* istanbul ignore next */ m)(require('hyperhtml-style'));

const {
  CONNECTED, DISCONNECTED, DOCUMENT_FRAGMENT_NODE, OWNER_SVG_ELEMENT
} = require('../shared/constants.js');

const Component = (m => m.__esModule ? /* istanbul ignore next */ m.default : /* istanbul ignore next */ m)(require('../classes/Component.js'));
const Wire = (m => m.__esModule ? /* istanbul ignore next */ m.default : /* istanbul ignore next */ m)(require('../classes/Wire.js'));
const Intent = (m => m.__esModule ? /* istanbul ignore next */ m.default : /* istanbul ignore next */ m)(require('./Intent.js'));
const { slice, text } = require('../shared/utils.js');

const observe = disconnected({Event: CustomEvent, WeakSet});

exports.Tagger = Tagger;
exports.observe = observe;

// returns an intent to explicitly inject content as html
const asHTML = html => ({html});

// returns nodes from wires and components
const asNode = (item, i) => {
  return 'ELEMENT_NODE' in item ?
    item :
    (item.constructor === Wire ?
      // in the Wire case, the content can be
      // removed, post-pended, inserted, or pre-pended and
      // all these cases are handled by domdiff already
      /* istanbul ignore next */
      ((1 / i) < 0 ?
        (i ? item.remove() : item.last) :
        (i ? item.valueOf(true) : item.first)) :
      asNode(item.render(), i));
}

// returns true if domdiff can handle the value
const canDiff = value =>
                  'ELEMENT_NODE' in value ||
                  value instanceof Wire ||
                  value instanceof Component;

// when a Promise is used as interpolation value
// its result must be parsed once resolved.
// This callback is in charge of understanding what to do
// with a returned value once the promise is resolved.
const invokeAtDistance = (value, callback) => {
  callback(value.placeholder);
  if ('text' in value) {
    Promise.resolve(value.text).then(String).then(callback);
  } else if ('any' in value) {
    Promise.resolve(value.any).then(callback);
  } else if ('html' in value) {
    Promise.resolve(value.html).then(asHTML).then(callback);
  } else {
    Promise.resolve(Intent.invoke(value, callback)).then(callback);
  }
};

// quick and dirty way to check for Promise/ish values
const isPromise_ish = value => value != null && 'then' in value;

// list of attributes that should not be directly assigned
const readOnly = /^(?:form|list)$/i;

function Tagger(type) {
  this.type = type;
  return domtagger(this);
}

Tagger.prototype = {

  // there are four kind of attributes, and related behavior:
  //  * events, with a name starting with `on`, to add/remove event listeners
  //  * special, with a name present in their inherited prototype, accessed directly
  //  * regular, accessed through get/setAttribute standard DOM methods
  //  * style, the only regular attribute that also accepts an object as value
  //    so that you can style=${{width: 120}}. In this case, the behavior has been
  //    fully inspired by Preact library and its simplicity.
  attribute(node, name, original) {
    const isSVG = OWNER_SVG_ELEMENT in node;
    let oldValue;
    // if the attribute is the style one
    // handle it differently from others
    if (name === 'style')
      return hyperStyle(node, original, isSVG);
    // the name is an event one,
    // add/remove event listeners accordingly
    else if (/^on/.test(name)) {
      let type = name.slice(2);
      if (type === CONNECTED || type === DISCONNECTED) {
        observe(node);
      }
      else if (name.toLowerCase()
        in node) {
        type = type.toLowerCase();
      }
      return newValue => {
        if (oldValue !== newValue) {
          if (oldValue)
            node.removeEventListener(type, oldValue, false);
          oldValue = newValue;
          if (newValue)
            node.addEventListener(type, newValue, false);
        }
      };
    }
    // the attribute is special ('value' in input)
    // and it's not SVG *or* the name is exactly data,
    // in this case assign the value directly
    else if (
      name === 'data' ||
      (!isSVG && name in node && !readOnly.test(name))
    ) {
      return newValue => {
        if (oldValue !== newValue) {
          oldValue = newValue;
          if (node[name] !== newValue) {
            node[name] = newValue;
            if (newValue == null) {
              node.removeAttribute(name);
            }
          }
        }
      };
    }
    else if (name in Intent.attributes) {
      return any => {
        oldValue = Intent.attributes[name](node, any);
        node.setAttribute(name, oldValue == null ? '' : oldValue);
      };
    }
    // in every other case, use the attribute node as it is
    // update only the value, set it as node only when/if needed
    else {
      let owner = false;
      const attribute = original.cloneNode(true);
      return newValue => {
        if (oldValue !== newValue) {
          oldValue = newValue;
          if (attribute.value !== newValue) {
            if (newValue == null) {
              if (owner) {
                owner = false;
                node.removeAttributeNode(attribute);
              }
              attribute.value = newValue;
            } else {
              attribute.value = newValue;
              if (!owner) {
                owner = true;
                node.setAttributeNode(attribute);
              }
            }
          }
        }
      };
    }
  },

  // in a hyper(node)`<div>${content}</div>` case
  // everything could happen:
  //  * it's a JS primitive, stored as text
  //  * it's null or undefined, the node should be cleaned
  //  * it's a component, update the content by rendering it
  //  * it's a promise, update the content once resolved
  //  * it's an explicit intent, perform the desired operation
  //  * it's an Array, resolve all values if Promises and/or
  //    update the node with the resulting list of content
  any(node, childNodes) {
    const diffOptions = {node: asNode, before: node};
    const nodeType = OWNER_SVG_ELEMENT in node ? /* istanbul ignore next */ 'svg' : 'html';
    let fastPath = false;
    let oldValue;
    const anyContent = value => {
      switch (typeof value) {
        case 'string':
        case 'number':
        case 'boolean':
          if (fastPath) {
            if (oldValue !== value) {
              oldValue = value;
              childNodes[0].textContent = value;
            }
          } else {
            fastPath = true;
            oldValue = value;
            childNodes = domdiff(
              node.parentNode,
              childNodes,
              [text(node, value)],
              diffOptions
            );
          }
          break;
        case 'function':
          anyContent(value(node));
          break;
        case 'object':
        case 'undefined':
          if (value == null) {
            fastPath = false;
            childNodes = domdiff(
              node.parentNode,
              childNodes,
              [],
              diffOptions
            );
            break;
          }
        default:
          fastPath = false;
          oldValue = value;
          if (isArray(value)) {
            if (value.length === 0) {
              if (childNodes.length) {
                childNodes = domdiff(
                  node.parentNode,
                  childNodes,
                  [],
                  diffOptions
                );
              }
            } else {
              switch (typeof value[0]) {
                case 'string':
                case 'number':
                case 'boolean':
                  anyContent({html: value});
                  break;
                case 'object':
                  if (isArray(value[0])) {
                    value = value.concat.apply([], value);
                  }
                  if (isPromise_ish(value[0])) {
                    Promise.all(value).then(anyContent);
                    break;
                  }
                default:
                  childNodes = domdiff(
                    node.parentNode,
                    childNodes,
                    value,
                    diffOptions
                  );
                  break;
              }
            }
          } else if (canDiff(value)) {
            childNodes = domdiff(
              node.parentNode,
              childNodes,
              value.nodeType === DOCUMENT_FRAGMENT_NODE ?
                slice.call(value.childNodes) :
                [value],
              diffOptions
            );
          } else if (isPromise_ish(value)) {
            value.then(anyContent);
          } else if ('placeholder' in value) {
            invokeAtDistance(value, anyContent);
          } else if ('text' in value) {
            anyContent(String(value.text));
          } else if ('any' in value) {
            anyContent(value.any);
          } else if ('html' in value) {
            childNodes = domdiff(
              node.parentNode,
              childNodes,
              slice.call(
                createContent(
                  [].concat(value.html).join(''),
                  nodeType
                ).childNodes
              ),
              diffOptions
            );
          } else if ('length' in value) {
            anyContent(slice.call(value));
          } else {
            anyContent(Intent.invoke(value, anyContent));
          }
          break;
      }
    };
    return anyContent;
  },

  // style or textareas don't accept HTML as content
  // it's pointless to transform or analyze anything
  // different from text there but it's worth checking
  // for possible defined intents.
  text(node) {
    let oldValue;
    const textContent = value => {
      if (oldValue !== value) {
        oldValue = value;
        const type = typeof value;
        if (type === 'object' && value) {
          if (isPromise_ish(value)) {
            value.then(textContent);
          } else if ('placeholder' in value) {
            invokeAtDistance(value, textContent);
          } else if ('text' in value) {
            textContent(String(value.text));
          } else if ('any' in value) {
            textContent(value.any);
          } else if ('html' in value) {
            textContent([].concat(value.html).join(''));
          } else if ('length' in value) {
            textContent(slice.call(value).join(''));
          } else {
            textContent(Intent.invoke(value, textContent));
          }
        } else if (type === 'function') {
          textContent(value(node));
        } else {
          node.textContent = value == null ? '' : value;
        }
      }
    };
    return textContent;
  }
};

},{"../classes/Component.js":18,"../classes/Wire.js":19,"../shared/constants.js":25,"../shared/utils.js":26,"./Intent.js":23,"@ungap/create-content":1,"@ungap/custom-event":2,"@ungap/essential-weakset":4,"@ungap/is-array":6,"disconnected":10,"domdiff":11,"domtagger":14,"hyperhtml-style":17}],25:[function(require,module,exports){
'use strict';
// Node.CONSTANTS
// 'cause some engine has no global Node defined
// (i.e. Node, NativeScript, basicHTML ... )
const ELEMENT_NODE = 1;
exports.ELEMENT_NODE = ELEMENT_NODE;
const DOCUMENT_FRAGMENT_NODE = 11;
exports.DOCUMENT_FRAGMENT_NODE = DOCUMENT_FRAGMENT_NODE;

// SVG related constants
const OWNER_SVG_ELEMENT = 'ownerSVGElement';
exports.OWNER_SVG_ELEMENT = OWNER_SVG_ELEMENT;

// Custom Elements / MutationObserver constants
const CONNECTED = 'connected';
exports.CONNECTED = CONNECTED;
const DISCONNECTED = 'dis' + CONNECTED;
exports.DISCONNECTED = DISCONNECTED;

},{}],26:[function(require,module,exports){
'use strict';
const unique = (m => m.__esModule ? /* istanbul ignore next */ m.default : /* istanbul ignore next */ m)(require('@ungap/template-literal'));

// these are tiny helpers to simplify most common operations needed here
const doc = node => node.ownerDocument || node;
exports.doc = doc;
const fragment = node => doc(node).createDocumentFragment();
exports.fragment = fragment;
const text = (node, text) => doc(node).createTextNode(text);
exports.text = text;

// appends an array of nodes
// to a generic node/fragment
// When available, uses append passing all arguments at once
// hoping that's somehow faster, even if append has more checks on type
// istanbul ignore next
const append = 'append' in fragment(document) ?
  (node, childNodes) => {
    node.append.apply(node, childNodes);
  } :
  (node, childNodes) => {
    const length = childNodes.length;
    for (let i = 0; i < length; i++) {
      node.appendChild(childNodes[i]);
    }
  };
exports.append = append;

// normalizes the template once for all arguments cases
const reArguments = function (template) {
  const args = [unique(template)];
  for (let i = 1, length = arguments.length; i < length; i++)
    args[i] = arguments[i];
  return args;
}
exports.reArguments = reArguments

// just recycling a one-off array to use slice
// in every needed place
const slice = [].slice;
exports.slice = slice;

},{"@ungap/template-literal":7}],27:[function(require,module,exports){
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

},{}],28:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const util = require("./util");
const hyperhtml_1 = require("hyperhtml");
window.addEventListener('load', () => {
    if (navigator && 'serviceWorker' in navigator) {
        navigator.serviceWorker.register('serviceworker.js')
            .then(registration => {
            console.log('service worker registered', registration.scope);
        }, err => {
            console.log('service work failed', err);
        });
    }
    anagramBuilder(document.getElementById("viewer"));
});
function anagramBuilder(node) {
    const builderWorker = new Worker('builderworker.js');
    const DOUBLE_DOWN_INTERVAL = 500; // this doesn't take into account windows settings
    const NO_SELECT = { row: -1, col: -1 };
    const DEFAULT_UI_STATE = {
        select: NO_SELECT,
        dragMode: false,
        lastDownTime: 0
    };
    const INITIAL_STATE = Object.assign({ version: 3, page: 1, difficulty: 'small', mode: 'normal', solution: [], puzzle: [], letterStates: [], completed: { small: [], medium: [], large: [] } }, DEFAULT_UI_STATE);
    const WORD_GOAL = { 'small': 6, 'medium': 12, 'large': 100 };
    const PUZZLE_SIZE = { 'small': 6, 'medium': 8, 'large': 10 };
    let puzzleEl;
    let state;
    let animationFrameID;
    builderWorker.onmessage = (e) => {
        dispatch({ type: 'puzzle-built', puzzle: e.data.split('\n') });
    };
    const onStateChange = (state, _) => {
        if (state.puzzle.length > 0) { // only store if we have a valid puzzle
            localStorage.setItem("state", JSON.stringify(state));
        }
    };
    const dispatch = (action) => {
        const oldState = state;
        state = reducer(state, action);
        if (state !== oldState && !animationFrameID) {
            onStateChange(state, oldState);
            animationFrameID = requestAnimationFrame(() => {
                animationFrameID = undefined;
                render(state);
            });
        }
    };
    const log = (msg) => {
        let output = document.getElementById("console");
        if (output) {
            output.textContent = output.textContent.split('\n').slice(-20).concat(msg).join('\n');
        }
    };
    // shuffles the letters but maintains the position of the spaces (' ')
    const shuffleAnagram = (line) => {
        const characterArray = line.split('');
        const shuffledLetters = util.shuffle(characterArray.filter(c => c !== ' '));
        let i = 0;
        return characterArray.map(c => c !== ' ' ? shuffledLetters[i++] : ' ').join('');
    };
    const shufflePuzzle = (puzzle, seed) => {
        util.randomSeed(seed);
        return puzzle.map(line => shuffleAnagram(line));
    };
    const swapCellInRow = (puzzle, from, toCol) => {
        if (from.col === toCol) {
            return puzzle;
        }
        return puzzle.map((line, row) => {
            if (row !== from.row) {
                return line;
            }
            const characterArray = line.split('');
            const copyOfFromCol = characterArray.splice(from.col, 1, characterArray[toCol])[0];
            characterArray.splice(toCol, 1, copyOfFromCol);
            return characterArray.join('');
        });
    };
    const createPuzzle = (page, difficulty) => {
        builderWorker.postMessage([WORD_GOAL[difficulty], PUZZLE_SIZE[difficulty], page]);
        // console.log('sent to worker:', WORD_GOAL[difficulty], PUZZLE_SIZE[difficulty], page)
    };
    const isPuzzleEqual = (puzzleA, puzzleB) => {
        return puzzleA.length === puzzleB.length && puzzleA.every((_, row) => puzzleA[row] === puzzleB[row]);
    };
    const getPuzzleCell = (puzzle, cell) => {
        return puzzle[cell.row][cell.col];
    };
    const isMoveableCell = (letterStates, cell) => {
        return getLetterState(letterStates, cell) === 'none';
    };
    const getInitialLetterStates = (puzzle) => {
        return puzzle.map(line => line.split('').map(c => c === ' ' ? 'empty' : 'none'));
    };
    const changeLetterState = (letterStates, cell, newState) => {
        if (letterStates[cell.row][cell.col] === newState) {
            return letterStates;
        }
        return letterStates.map((list, row) => row !== cell.row ? list : list.map((state, col) => col !== cell.col ? state : newState));
    };
    // returns -1 if the sortedList is empty
    const indexOfClosestLowerValue = (sortedList, v) => {
        let i = -1;
        while (i + 1 < sortedList.length && v >= sortedList[i + 1]) {
            i++;
        }
        return i;
    };
    // compress the status into the new format
    const completedV2toV3 = (completed) => {
        let newCompleted = { small: [], medium: [], large: [] };
        for (let difficulty in completed) {
            for (let page of completed[difficulty]) {
                newCompleted = changeCompletedStatus(newCompleted, difficulty, page, true);
            }
        }
        return newCompleted;
    };
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
        const i = indexOfClosestLowerValue(completed[difficulty], page);
        const wasComplete = i >= 0 ? (i % 2 === 0 ? true : false) : false;
        if (wasComplete !== isComplete) {
            let newCompleted = completed[difficulty].slice();
            newCompleted.splice(i + 1, 0, page, page + 1);
            if (newCompleted.length > 1) {
                const n = newCompleted.length;
                newCompleted = newCompleted.filter((x, i, list) => (i === 0 || x !== list[i - 1]) && (i === n - 1 || x !== list[i + 1])); // strip duplicates
            }
            return Object.assign({}, completed, { [difficulty]: newCompleted });
        }
        return completed;
    };
    // console.log(changeCompletedStatus({small:[]}, 'small', 1, true))
    // console.log(changeCompletedStatus({small:[1,2]}, 'small', 1, true))
    // console.log(changeCompletedStatus({small:[1,2]}, 'small', 2, true))
    // console.log(changeCompletedStatus({small:[2,5]}, 'small', 1, true))
    // console.log(changeCompletedStatus({small:[2,5]}, 'small', 10, true))
    // console.log(changeCompletedStatus({small:[1,3]}, 'small', 2, false))
    // console.log(changeCompletedStatus({small:[1,10]}, 'small', 2, false))
    // console.log(changeCompletedStatus({small:[1,2]}, 'small', 1, false))
    const isCompleted = (completed, difficulty, page) => {
        const i = indexOfClosestLowerValue(completed[difficulty], page);
        return i >= 0 ? (i % 2 === 0 ? true : false) : false;
    };
    // returns 1 if none are completed
    const getLastCompleted = (completed, difficulty) => {
        const n = completed[difficulty].length;
        return n > 0 ? completed[difficulty][n - 1] - 1 : 1;
    };
    const getLetterState = (letterStates, cell) => {
        return letterStates[cell.row][cell.col];
    };
    const reducer = (state = INITIAL_STATE, action) => {
        switch (action.type) {
            case 'difficulty':
                if (action.difficulty !== state.difficulty) {
                    const lastPage = getLastCompleted(state.completed, action.difficulty);
                    createPuzzle(lastPage, action.difficulty);
                    return Object.assign({}, state, DEFAULT_UI_STATE, { puzzle: [], letterStates: [], difficulty: action.difficulty, mode: 'normal', page: lastPage });
                }
                return state;
            case 'down': {
                const newSelect = isMoveableCell(state.letterStates, action.cell) ? action.cell : state.select;
                return Object.assign({}, state, { select: newSelect, lastDownTime: action.time });
            }
            case 'toggle-hint':
                return Object.assign({}, state, DEFAULT_UI_STATE, { mode: state.mode === 'hint' ? 'normal' : 'hint' });
            case 'move':
                if (state.select !== NO_SELECT && state.select.col !== action.cell.col) {
                    const newCell = { row: state.select.row, col: action.cell.col };
                    if (isMoveableCell(state.letterStates, newCell)) {
                        const updatedPuzzle = swapCellInRow(state.puzzle, state.select, newCell.col);
                        const isPuzzleComplete = isPuzzleEqual(updatedPuzzle, state.solution);
                        return Object.assign({}, state, { puzzle: updatedPuzzle, completed: isPuzzleComplete ? changeCompletedStatus(state.completed, state.difficulty, state.page, true) : state.completed, mode: isPuzzleComplete ? 'complete' : state.mode, dragMode: true, lastDownTime: 0, select: isPuzzleComplete ? NO_SELECT : newCell });
                    }
                }
                return state.dragMode ? state : Object.assign({}, state, { dragMode: true });
            case 'next':
                createPuzzle(state.page + 1, state.difficulty);
                return Object.assign({}, state, DEFAULT_UI_STATE, { puzzle: [], letterStates: [], page: state.page + 1, mode: 'loading' });
            case 'prev':
                createPuzzle(state.page - 1, state.difficulty);
                return Object.assign({}, state, DEFAULT_UI_STATE, { puzzle: [], letterStates: [], page: state.page - 1, mode: 'loading' });
            case 'puzzle-built':
                const isPuzzleComplete = isCompleted(state.completed, state.difficulty, state.page);
                return Object.assign({}, state, DEFAULT_UI_STATE, { solution: action.puzzle, puzzle: isPuzzleComplete ? action.puzzle : shufflePuzzle(action.puzzle, state.page), letterStates: getInitialLetterStates(action.puzzle), mode: isPuzzleComplete ? 'complete' : 'normal' });
            case 'reset':
                if (state.mode !== 'loading') {
                    return Object.assign({}, state, DEFAULT_UI_STATE, { puzzle: shufflePuzzle(state.solution, undefined), letterStates: getInitialLetterStates(state.solution), completed: changeCompletedStatus(state.completed, state.difficulty, state.page, false), mode: 'normal' });
                }
                else {
                    return state;
                }
            case 'resolve-cell': {
                const currentLetterState = getLetterState(state.letterStates, action.cell);
                if (currentLetterState !== 'resolved' && currentLetterState !== 'empty') {
                    const correctLetter = getPuzzleCell(state.solution, action.cell);
                    const lettersInRow = state.puzzle[action.cell.row].split('');
                    // if possible move an unpinned letter
                    const unpinnedCol = lettersInRow.findIndex((c, col) => c === correctLetter && getLetterState(state.letterStates, { row: action.cell.row, col }) === 'none');
                    const bestCol = unpinnedCol !== -1 ? unpinnedCol : lettersInRow.findIndex((c, col) => c === correctLetter && getLetterState(state.letterStates, { row: action.cell.row, col }) === 'pinned');
                    console.assert(bestCol !== -1);
                    const updatedPuzzle = swapCellInRow(state.puzzle, action.cell, bestCol);
                    // must set 'resolved' last in case action.cell.col == bestCol
                    const bestCell = { row: action.cell.row, col: bestCol };
                    const updatedLetterStates = changeLetterState(changeLetterState(state.letterStates, bestCell, 'none'), action.cell, 'resolved');
                    const isPuzzleComplete = isPuzzleEqual(updatedPuzzle, state.solution);
                    return Object.assign({}, state, { puzzle: updatedPuzzle, letterStates: updatedLetterStates, completed: isPuzzleComplete ? changeCompletedStatus(state.completed, state.difficulty, state.page, true) : state.completed, mode: isPuzzleComplete ? 'complete' : state.mode });
                }
                return state;
            }
            case 'setup': {
                const storedState = JSON.parse(localStorage.getItem("state"));
                if (!storedState || storedState.version !== INITIAL_STATE.version) {
                    if (storedState.version === 2) {
                        return Object.assign({}, storedState, DEFAULT_UI_STATE, { completed: completedV2toV3(storedState.completed) });
                    }
                    else {
                        createPuzzle(state.page, state.difficulty);
                    }
                    return state;
                }
                return Object.assign({}, storedState, DEFAULT_UI_STATE);
            }
            case 'toggle-pin': {
                return Object.assign({}, state, DEFAULT_UI_STATE, { mode: state.mode === 'pin' ? 'normal' : 'pin' });
            }
            case 'toggle-pin-letter': {
                const letterState = getLetterState(state.letterStates, action.cell);
                if (letterState === 'pinned' || letterState === 'none') {
                    const newLetterState = letterState === 'pinned' ? 'none' : 'pinned';
                    return Object.assign({}, state, { letterStates: changeLetterState(state.letterStates, action.cell, newLetterState), lastDownTime: 0 });
                }
                return state;
            }
            case 'up':
                return Object.assign({}, state, { select: NO_SELECT, dragMode: false });
            default: {
                console.error('unknown action', action);
                return state;
            }
        }
    };
    const xyToCell = (puzzleEl, x, y, puzzleSize) => {
        const clientRect = puzzleEl.getBoundingClientRect();
        const dx = util.clamp((x - clientRect.left) / (clientRect.right - clientRect.left), 0, 0.999);
        const dy = util.clamp((y - clientRect.top) / (clientRect.bottom - clientRect.top), 0, 0.999);
        return { row: Math.floor(dy * puzzleSize[0]), col: Math.floor(dx * puzzleSize[1]) };
    };
    // returns [#rows, #cols]
    const getPuzzleSize = (puzzle) => {
        return [puzzle.length, puzzle.length > 0 ? puzzle[0].length : 0];
    };
    const onClickHint = (e) => dispatch({ type: 'toggle-hint' });
    const onClickPin = (e) => dispatch({ type: 'toggle-pin' });
    const onClickReset = (e) => dispatch({ type: 'reset' });
    const onClickPrev = (e) => dispatch({ type: 'prev' });
    const onClickNext = (e) => dispatch({ type: 'next' });
    const onClickDifficulty = (e) => {
        dispatch({ type: 'difficulty', difficulty: e.target.dataset.difficulty });
    };
    const onPointerDownHint = (e) => {
        const pointer = e.changedTouches ? e.changedTouches.item(0) : e;
        dispatch({ type: 'resolve-cell', cell: xyToCell(puzzleEl, pointer.clientX, pointer.clientY, getPuzzleSize(state.puzzle)) });
    };
    const onPointerDownPin = (e) => {
        const pointer = e.changedTouches ? e.changedTouches.item(0) : e;
        dispatch({ type: 'toggle-pin-letter', cell: xyToCell(puzzleEl, pointer.clientX, pointer.clientY, getPuzzleSize(state.puzzle)) });
    };
    const onMouseUpBody = (e) => {
        dispatch({ type: 'up' });
    };
    const onPointerDownPuzzle = (e) => {
        e.preventDefault();
        const pointer = e.changedTouches ? e.changedTouches.item(0) : e;
        const downTime = Date.now();
        const cell = xyToCell(puzzleEl, pointer.clientX, pointer.clientY, getPuzzleSize(state.puzzle));
        if (state.lastDownTime + DOUBLE_DOWN_INTERVAL > downTime) {
            dispatch({ type: 'toggle-pin-letter', cell });
        }
        else {
            dispatch({ type: 'down', cell, time: downTime });
        }
    };
    const onMouseMoveBody = (e) => {
        dispatch({ type: 'move', cell: xyToCell(puzzleEl, e.clientX, e.clientY, getPuzzleSize(state.puzzle)) });
    };
    // special handling for touch move and end because we need to keep them on the element at all times
    const onTouchEndPuzzle = (e) => {
        e.preventDefault();
        if (state.select !== NO_SELECT) {
            dispatch({ type: 'up' });
        }
    };
    const onTouchMovePuzzle = (e) => {
        e.preventDefault();
        if (state.select !== NO_SELECT) {
            const pointer = e.changedTouches.item(0);
            dispatch({ type: 'move', cell: xyToCell(puzzleEl, pointer.clientX, pointer.clientY, getPuzzleSize(state.puzzle)) });
        }
    };
    const render = (state) => {
        const isHintMode = state.mode === "hint";
        const isNormalMode = state.mode === "normal";
        const isPinMode = state.mode === "pin";
        const isHintDisabled = state.mode === "complete" || state.mode === "loading";
        const isPinDisabled = state.mode === "complete" || state.mode === "loading";
        const isSelectActive = state.select !== NO_SELECT;
        // once the mouse is down, to read the position over the whole page we need to put the move and up handlers on the body
        // for touch the move and end handlers must be on the element
        if (isSelectActive) {
            document.body.addEventListener('mouseup', onMouseUpBody);
            document.body.addEventListener('mousemove', onMouseMoveBody);
        }
        else {
            document.body.removeEventListener('mousemove', onMouseMoveBody);
            document.body.removeEventListener('mouseup', onMouseUpBody);
        }
        puzzleEl = hyperhtml_1.default.wire() `<div 
      class=${"puzzle " + state.difficulty}
      onmousedown=${isNormalMode ? onPointerDownPuzzle : isHintMode ? onPointerDownHint : isPinMode ? onPointerDownPin : undefined} 
      ontouchstart=${isNormalMode ? onPointerDownPuzzle : isHintMode ? onPointerDownHint : isPinMode ? onPointerDownPin : undefined} 
      ontouchmove=${onTouchMovePuzzle}
      ontouchend=${onTouchEndPuzzle}>

      ${state.puzzle.map((line, row) => {
            const isRowSelected = state.dragMode && state.select.row === row;
            return hyperhtml_1.default.wire() `<div class=${"puzzlerow" + (isRowSelected ? " selected" : "")}>
          ${line.split('').map((c, col) => {
                const letterState = getLetterState(state.letterStates, { row, col });
                const isSelected = state.select.row === row && state.select.col === col;
                const isBlank = c === ' ';
                const showCompleted = !isBlank && state.mode === 'complete';
                return hyperhtml_1.default.wire() `<div class=${"letter " + letterState + (isSelected ? " selected" : "") + (showCompleted ? " resolved" : "") + (isHintMode && !isBlank ? " hint" : "")}>${c.toUpperCase()}</div>`;
            })}
        </div>`;
        })}
    </div>`;
        const difficultyEl = hyperhtml_1.default.wire() `<div class="difficultyrow">
      ${['small', 'medium', 'large'].map(difficulty => hyperhtml_1.default.wire() `<div class=${"difficulty" + (state.difficulty === difficulty ? " selected" : "")} onclick=${onClickDifficulty} data-difficulty=${difficulty}>${difficulty.toUpperCase()}</div>`)}
    </div>`;
        hyperhtml_1.default.bind(node) `
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
    `;
    };
    dispatch({ type: 'setup' });
}

},{"./util":27,"hyperhtml":22}]},{},[28]);
