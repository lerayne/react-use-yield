"use strict";

require("core-js/modules/es.array.is-array.js");

require("core-js/modules/es.array.slice.js");

require("core-js/modules/es.function.name.js");

require("core-js/modules/es.array.from.js");

require("core-js/modules/es.regexp.exec.js");

require("core-js/modules/es.object.define-property.js");

require("core-js/modules/es.object.keys.js");

require("core-js/modules/es.array.filter.js");

require("core-js/modules/es.object.get-own-property-descriptor.js");

require("core-js/modules/es.array.for-each.js");

require("core-js/modules/web.dom-collections.for-each.js");

require("core-js/modules/es.object.get-own-property-descriptors.js");

require("core-js/modules/es.object.define-properties.js");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = useYield;

require("core-js/modules/es.symbol.js");

require("core-js/modules/es.symbol.description.js");

require("core-js/modules/es.object.to-string.js");

require("core-js/modules/es.symbol.iterator.js");

require("core-js/modules/es.array.iterator.js");

require("core-js/modules/es.string.iterator.js");

require("core-js/modules/web.dom-collections.iterator.js");

var _react = require("react");

var _es = _interopRequireDefault(require("fast-deep-equal/es6"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); enumerableOnly && (symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; })), keys.push.apply(keys, symbols); } return keys; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = null != arguments[i] ? arguments[i] : {}; i % 2 ? ownKeys(Object(source), !0).forEach(function (key) { _defineProperty(target, key, source[key]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)) : ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } return target; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

function _slicedToArray(arr, i) { return _arrayWithHoles(arr) || _iterableToArrayLimit(arr, i) || _unsupportedIterableToArray(arr, i) || _nonIterableRest(); }

function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }

function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }

function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }

function _iterableToArrayLimit(arr, i) { var _i = arr == null ? null : typeof Symbol !== "undefined" && arr[Symbol.iterator] || arr["@@iterator"]; if (_i == null) return; var _arr = []; var _n = true; var _d = false; var _s, _e; try { for (_i = _i.call(arr); !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"] != null) _i["return"](); } finally { if (_d) throw _e; } } return _arr; }

function _arrayWithHoles(arr) { if (Array.isArray(arr)) return arr; }

function _typeof(obj) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (obj) { return typeof obj; } : function (obj) { return obj && "function" == typeof Symbol && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }, _typeof(obj); }

function useYield(initialState) {
  if (!(_typeof(initialState) === 'object' && initialState instanceof Object)) {
    throw new Error('useYield only accepts object as initialState');
  }

  var state = (0, _react.useRef)(initialState); // setCounter is used here only to force a render
  // eslint-disable-next-line react/hook-use-state,id-match

  var _useState = (0, _react.useState)(0),
      _useState2 = _slicedToArray(_useState, 2),
      _ = _useState2[0],
      setCounter = _useState2[1];

  var getState = (0, _react.useCallback)(function () {
    return _objectSpread({}, state.current);
  }, [state]);
  var updateState = (0, _react.useCallback)(function (value) {
    var signal = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;

    // it's important to return the same object, if no changes to the state was made, in this
    // way other hooks can use this state as a respectful dependency
    if (signal && signal.aborted) {
      return state.current;
    }

    var newState = _objectSpread(_objectSpread({}, state.current), value);

    if ((0, _es["default"])(state.current, newState)) {
      return state.current;
    } // this call causes re-render and returns new object only if states are different


    state.current = newState;
    setCounter(function (c) {
      return c + 1;
    });
    return newState;
  }, [state]); // this function is always the same, so it's safe to include it into deps

  var run = (0, _react.useCallback)(function (stateChanger, options) {
    var _options$abortable;

    var abortController = (_options$abortable = options === null || options === void 0 ? void 0 : options.abortable) !== null && _options$abortable !== void 0 ? _options$abortable : new window.AbortController();

    function pull(asyncGenerator) {
      function onYield(_ref) {
        var done = _ref.done,
            value = _ref.value;

        if (!done) {
          updateState(value, abortController.signal);
          asyncGenerator.next().then(onYield);
        }
      }

      asyncGenerator.next().then(onYield);
    }

    var stateChangerResult = stateChanger(getState, abortController.signal, options.action);

    if (stateChangerResult.next) {
      // if generator is passed as stateChanger
      pull(stateChangerResult);
      return abortController;
    } else if (stateChangerResult.then) {
      // if regular async function is passed as stateChanger
      stateChangerResult.then(function (result) {
        updateState(result, abortController.signal);
      });
      return abortController;
    } else {
      // if stateChanger is a regular function
      updateState(stateChangerResult);
      return null;
    }
  }, [getState, updateState]);
  return [state.current, run];
}
//# sourceMappingURL=useYield.js.map