import lists from './lists';
import func from './func';

const KEY_MAP = {
  'BACKSPACE': 8,
  'TAB': 9,
  'ENTER': 13,
  'ESCAPE': 27,
  'SPACE': 32,
  'DELETE': 46,

  'LEFT': 37,
  'UP': 38,
  'RIGHT': 39,
  'DOWN': 40,

  'NUM0': 48,
  'NUM1': 49,
  'NUM2': 50,
  'NUM3': 51,
  'NUM4': 52,
  'NUM5': 53,
  'NUM6': 54,
  'NUM7': 55,
  'NUM8': 56,

  'B': 66,
  'E': 69,
  'I': 73,
  'J': 74,
  'K': 75,
  'L': 76,
  'R': 82,
  'S': 83,
  'U': 85,
  'V': 86,
  'Y': 89,
  'Z': 90,

  'SLASH': 191,
  'LEFTBRACKET': 219,
  'BACKSLASH': 220,
  'RIGHTBRACKET': 221,

  'HOME': 36,
  'END': 35,
  'PAGEUP': 33,
  'PAGEDOWN': 34,
};

export default {
  /* @param {Number} @return {Boolean} */
  isEdit: (keyCode) => {
    return lists.contains([
      KEY_MAP.BACKSPACE,
      KEY_MAP.TAB,
      KEY_MAP.ENTER,
      KEY_MAP.SPACE,
      KEY_MAP.DELETE,
    ], keyCode);
  },
  /* @param {Number} @return {Boolean} */
  isRemove: (keyCode) => { 
    return lists.contains([
      KEY_MAP.BACKSPACE,
      KEY_MAP.DELETE,
    ], keyCode);
  },
  /* @param {Number} @return {Boolean} */
  isMove: (keyCode) => {
    return lists.contains([
      KEY_MAP.LEFT,
      KEY_MAP.UP,
      KEY_MAP.RIGHT,
      KEY_MAP.DOWN,
    ], keyCode);
  },
  /* @param {Number} @return {Boolean} */
  isNavigation: (keyCode) => {
    return lists.contains([
      KEY_MAP.HOME,
      KEY_MAP.END,
      KEY_MAP.PAGEUP,
      KEY_MAP.PAGEDOWN,
    ], keyCode);
  },
  
  nameFromCode: func.invertObject(KEY_MAP),
  code: KEY_MAP,
};