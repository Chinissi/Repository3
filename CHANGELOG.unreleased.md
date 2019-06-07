<!--

NOTE: Don't forget to add a link to your GitHub profile and the PR in the end of the file.

Format:

#### Category: Title ([#PR] by [@user])

Description

```
// Input
Code Sample

// Output (Prettier stable)
Code Sample

// Output (Prettier master)
Code Sample
```

Details:

  Description: optional if the `Title` is enough to explain everything.

Examples:

#### TypeScript: Correctly handle `//` in TSX ([#5728] by [@JamesHenry])

Previously, putting `//` as a child of a JSX element in TypeScript led to an error
because it was interpreted as a comment. Prettier master fixes this issue.

<!-- prettier-ignore --\>
```js
// Input
const link = <a href="example.com">http://example.com</a>

// Output (Prettier stable)
// Error: Comment location overlaps with node location

// Output (Prettier master)
const link = <a href="example.com">http://example.com</a>;
```

-->

#### TypeScript: Add trailing comma in tsx, only for arrow function ([#6190] by [@sosukesuzuki])

Prettier inserts a trailing comma to single type parameter for arrow functions in tsx, since v 1.18. But, this feature inserts a trailing comma to type parameter for besides arrow functions too (e.g, function , interface). This change fix it.

<!-- prettier-ignore -->
```tsx
// Input
interface Interface1<T> {
  one: "one";
}
function function1<T>() {
  return "one";
}

// Output (Prettier stable)
interface Interface1<T,> {
  one: "one";
}
function function1<T,>() {
  return "one";
}

// Output (Prettier master)
interface Interface1<T> {
  one: "one";
}
function function1<T>() {
  return "one";
}
```

#### Config: Match dotfiles in config overrides ([#6194] by [@duailibe])

When using [`overrides`](https://prettier.io/docs/en/configuration.html#configuration-overrides) in the config file, Prettier was not matching dotfiles (files that start with `.`). This was fixed in 1.18.1

[#6190]: https://github.com/prettier/prettier/pull/6190
[#6194]: https://github.com/prettier/prettier/pull/6194
[@duailibe]: https://github.com/duailibe
[@sosukesuzuki]: https://github.com/sosukesuzuki
