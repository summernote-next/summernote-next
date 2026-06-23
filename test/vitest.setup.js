import $$ from '@/js/core/dom-query.js';
import env from '@/js/core/env';
import { setIconBaseUrl } from '@/js/icons-svg.js';
import { expect } from 'vitest';

// Icons are fetched as separate .svg files at runtime; in the vitest browser
// environment point the loader at the project's source icons served by Vite.
setIconBaseUrl('/src/font/icons/');

expect.extend({
  equalsIgnoreCase: (str1, str2) => {
    str1 = str1.toUpperCase();
    str2 = str2.toUpperCase();

    // [workaround] IE8-10 use &nbsp; instead of bogus br
    if (env.isMSIE && env.browserVersion < 11) {
      str2 = str2.replace(/<BR\/?>/g, '&NBSP;');
      str1 = str1.replace(/<BR\/?>/g, '&NBSP;');
    }

    // [workaround] IE8 str1 markup has newline between tags
    if (env.isMSIE && env.browserVersion < 9) {
      str1 = str1.replace(/\r\n/g, '');
    }

    return {
      pass: str1 === str2,
      message: () => `Expected: ${str1}\nReceived: ${str2}`,
    };
  },

  equalsStyle: ($node, expected, style) => {
    const nodeStyle = window.getComputedStyle($node[0]).getPropertyValue(style);
    const testerStyle = $$('<div></div>').css(style, expected).css(style);

    return {
      pass: nodeStyle === testerStyle,
      message: () => `Expected computed ${style}: ${testerStyle}\nReceived: ${nodeStyle}`,
    };
  },
});
