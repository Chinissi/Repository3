foo(/* HTML */ `<!-- bar1 --> bar <!-- bar2 -->`);
foo(/* GraphQL */ `query { foo { bar } }`);
foo(/* ... */ css`color:magenta`);
const a = b => /* HTML */ `<!-- bar1 --> bar <!-- bar2 -->`
