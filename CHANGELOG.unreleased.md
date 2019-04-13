<!--

Format:

- Category: Title ([#PR] by [@user])

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

- TypeScript: Correctly handle `//` in TSX ([#5728] by [@JamesHenry])

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

- JavaScript: Don't break simple template literals ([#5979] by [@jwbay])

  <!-- prettier-ignore -->
  ```js
  // Input
  console.log(chalk.white(`Covered Lines below threshold: ${coverageSettings.lines}%. Actual: ${coverageSummary.total.lines.pct}%`))

  // Output (Prettier stable)
  console.log(
    chalk.white(
      `Covered Lines below threshold: ${coverageSettings.lines}%. Actual: ${
        coverageSummary.total.lines.pct
      }%`
    )
  );

  // Output (Prettier master)
  console.log(
    chalk.white(
      `Covered Lines below threshold: ${coverageSettings.lines}%. Actual: ${coverageSummary.total.lines.pct}%`
    )
  );
  ```
