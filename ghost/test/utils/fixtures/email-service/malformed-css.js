// Author-written CSS that CSS inlining must pass through without throwing
const styleAttributes = {
  'nameless declaration first': 'foo; color: red',
  'nameless declaration last': 'color: red; foo;',
  'property without a colon': 'color',
  'template placeholder': '{{accent_color}}',
  'wrapped replacement placeholder': '{%%{accent_color}%%}',
  'declaration without a value': 'a{b}',
  'value without a property': ': red',
  'comment only': '/* note */',
  'lone semicolon': ';',
  'property without a value': 'color:',
  'bare custom property name': '--brand',
  'lone important flag': '!important',
  'stray opening brace': '{',
  'stray closing brace': '}',
  'custom property usage': '--brand: red; color: var(--brand)',
  'empty value': '',
};

const styleTags = {
  'style tag nameless declaration': 'p { foo; color: red }',
  'style tag property without a colon': 'p { color }',
};

const malformedCssCases = [
  ...Object.entries(styleAttributes).map(([name, style]) => ({
    name,
    html: `<p style="${style}">Malformed CSS case: ${name}</p>`,
  })),
  ...Object.entries(styleTags).map(([name, css]) => ({
    name,
    html: `<style>${css}</style><p>Malformed CSS case: ${name}</p>`,
  })),
];

module.exports = {
  malformedCssCases,
};
