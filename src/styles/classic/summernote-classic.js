import $$ from '@/js/core/dom-query.js';
import '@/styles/bs5/summernote-bs5.js';

import './summernote-classic.scss';

$$.summernote = Object.assign($$.summernote, {
  interface: 'classic',
});

export default $$;
