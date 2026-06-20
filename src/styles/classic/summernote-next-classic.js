import $$ from '@/js/core/dom-query.js';
import Theme from '@/js/module/Theme.js';
import '@/styles/bs5/summernote-bs5.js';

import './summernote-next-classic.scss';

if ($$.summernote && $$.summernote.options && $$.summernote.options.modules) {
  $$.summernote.options.modules.theme = Theme;
}

if ($$.summernote && $$.summernote.options) {
  $$.summernote.options.darkMode = 'auto';
}

$$.summernote = Object.assign($$.summernote, {
  interface: 'classic',
});

export default $$;
