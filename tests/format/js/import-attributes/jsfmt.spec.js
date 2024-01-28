const errors = {
  acorn: [
    "dynamic-import.js",
    "empty.js",
    "multi-types.js",
    "static-import.js",
    "re-export.js",
    "without-from.js",
    "non-type.js",
    "keyword-detect.js",
    "quoted-keys.js",
  ],
  espree: [
    "dynamic-import.js",
    "empty.js",
    "multi-types.js",
    "static-import.js",
    "re-export.js",
    "without-from.js",
    "non-type.js",
    "keyword-detect.js",
    "quoted-keys.js",
  ],
  meriyah: [
    "dynamic-import.js",
    "empty.js",
    "multi-types.js",
    "static-import.js",
    "re-export.js",
    "without-from.js",
    "non-type.js",
    "keyword-detect.js",
    "quoted-keys.js",
  ],
};
run_spec(import.meta, ["babel", "typescript"], { errors });
run_spec(import.meta, ["babel", "typescript"], {
  quoteProps: "consistent",
  errors,
});
run_spec(import.meta, ["babel", "typescript"], {
  quoteProps: "preserve",
  errors,
});
