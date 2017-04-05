switch (node && node.type) {
  case "Property":
  case "MethodDefinition":
    prop = node.key;
    break;

  case "MemberExpression":
    prop = node.property;
    break;

  // no default
}

switch (foo) {
  case "bar":
    doThing()

  // no default
}

switch (token) {
  case TOKEN_TRUE:
    a; // Comment

  case TOKEN_FALSE:
    b;
}
