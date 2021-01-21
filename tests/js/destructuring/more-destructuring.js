// these arguments should be destructured on multiple lines:
function f2({ first: { inner1, inner2 }, second: { inner3, inner4 } }) {}

// small enough for one line:
const reducer1 = ({ first, second : { third } }) => combine(second, third);

// these arguments should be destructured on multiple lines:
const r2 = ({ a: { data1 }, b: { data2, data3 } }) => f(data1, data2, data3);

const obj2 = {
  // these arguments should be destructured on multiple lines:
  func({ a: { info1, info2 }, b: { info3, info4 } }) {}
};

class A2 {
  // these arguments should be destructured on multiple lines:
  func({ a: { info1, info2 }, b: { info3, info4 } }) {}
}

// in arrow function arguments nested inside a function call,
// small enough for one line:
registerReducer(({a: { b, c } }) => combine(b, c))

// in arrow function arguments nested inside a function call,
// should be split into multiple lines:
registerReducer(({a: { b, c }, d: {e, f } }) => combine(b, c, e, f))

// in second arrow function argument nested inside a function call,
// XXX TODO should be split into multiple lines:
registerReducer((event, {a: { b, c }, d: {e, f } }) => combine(b, c, e, f))
