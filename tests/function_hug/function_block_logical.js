// A
f(x => { y }, err.message.includes("asd") && err.message.includes("id") &&
     err.message.includes('"1"') && err.message.includes("Model") &&
     err.message.includes("/id") && err.message.includes("identifier(number)")
)

// B
var a = err.message.includes("asd") && err.message.includes("id") &&
     err.message.includes('"1"') && err.message.includes("Model") &&
     err.message.includes("/id") && err.message.includes("identifier(number)")

// C
f(err.message.includes("asd") && err.message.includes("id") &&
     err.message.includes('"1"') && err.message.includes("Model") &&
     err.message.includes("/id") && err.message.includes("identifier(number)") )

// D
f(x, y, err.message.includes("asd") && err.message.includes("id") &&
     err.message.includes('"1"') && err.message.includes("Model") &&
     err.message.includes("/id") && err.message.includes("identifier(number)"),z,zz)

// E
f(x => y, err.message.includes("asd") && err.message.includes("id") &&
     err.message.includes('"1"') && err.message.includes("Model") &&
     err.message.includes("/id") && err.message.includes("identifier(number)"))

// F
f(function x() { y }, err.message.includes("asd") && err.message.includes("id") &&
     err.message.includes('"1"') && err.message.includes("Model") &&
     err.message.includes("/id") && err.message.includes("identifier(number)"))

// G
f(x => {}, err.message.includes("asd") && err.message.includes("id") &&
     err.message.includes('"1"') && err.message.includes("Model") &&
     err.message.includes("/id") && err.message.includes("identifier(number)"))

// H
f(x => { y }, err.message.includes("asd") && err.message.includes("id") &&
     err.message.includes('"1"') && err.message.includes("Model") &&
     err.message.includes("/id") && err.message.includes("identifier(number)"))

// I
f(
  // a comment
  x => { y },
  err.message.includes("asd") && err.message.includes("id") &&
     err.message.includes('"1"') && err.message.includes("Model") &&
     err.message.includes("/id") && err.message.includes("identifier(number)"))
