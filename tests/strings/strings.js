[
  "abc",
  'abc',

  '\'',

  '"',
  '\"',
  '\\"',

  "'",
  "\'",
  "\\'",

  "'\"",
  '\'"',

  '\\',
  "\\",

  '\0',
  '🐶',

  '\uD801\uDC28',
];

foo(`a long string ${ 1 + 2 + 3 + 2 + 3 + 2 + 3 + 2 + 3 + 2 + 3 + 2 + 3 + 2 + 3 + 2 + 3 } with expr`);

const x = `a long string ${ 1 + 2 + 3 + 2 + 3 + 2 + 3 + 2 + 3 + 2 + 3 + 2 + ( function() {return 3 })() + 3 + 2 + 3 + 2 + 3 } with expr`;

foo(`a long string ${ 1 + 2 + 3 + 2 + 3 + 2 + 3 + 2 + 3 + 2 + 3 + 2 + ( function() {
  const x = 5;

  return x;
 })() + 3 + 2 + 3 + 2 + 3 } with expr`);
