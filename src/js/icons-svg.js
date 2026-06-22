const rawIcons = import.meta.glob('../font/icons/*.svg', {
  query: '?raw',
  import: 'default',
  eager: true,
});

function normalizeSvg(raw) {
  return raw
    .replace(/<\?xml[^>]*>\s*/g, '')
    .replace(/<!DOCTYPE[^>]*>\s*/g, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<metadata>[\s\S]*?<\/metadata>\s*/gi, '')
    .replace(/<defs>[\s\S]*?<\/defs>\s*/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>\s*/gi, '')
    .replace(/\sclass="cls-\d+"/g, ' fill="currentColor"')
    .replace(/\sclass="st0"/g, ' fill="currentColor"')
    .replace(/\sfill="#[0-9a-fA-F]{3,8}"/g, ' fill="currentColor"')
    .replace(/(style="[^"]*fill:\s*)#[0-9a-fA-F]+/gi, '$1currentColor')
    .replace(/\swidth="[^"]*"/, '')
    .replace(/\sheight="[^"]*"/, '')
    .trim();
}

export const ICONS = {};

for (const [path, raw] of Object.entries(rawIcons)) {
  const name = path.replace(/^.*\//, '').replace(/\.svg$/, '');
  ICONS[name] = normalizeSvg(raw);
}

export function getIconSvg(name) {
  return ICONS[name] || null;
}

export const ICON_PREFIX = 'note-icon-';
