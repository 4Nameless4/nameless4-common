import { expect, test } from "@jest/globals";
import { randomColor, deepObjectAssign, deepObjectAssign2 } from "../src/index";

test("random color", () => {
  const ran = randomColor();
  const c1 = ran(0);
  const c2 = ran(1);
  expect(c1).not.toBe(c2);
  expect(ran(0)).toBe(c1);
});

test("object assign deep", () => {
  const a = {
    k1: {
      k1_1: {
        k1_1_1: {
          a: false,
          b: () => {
            console.log("b");
          },
          c: new Map([["a", 1]]),
        },
        k1_1_2: {
          a: true,
          c: {
            cc: "asd",
          },
        },
      },
      k1_2: [1, 2, 3],
    },
    k2: "false",
    k3: {
      c: 1,
      b: 2,
      a: {
        aa: null,
      },
    },
  };
  const b = {
    k1: {
      k1_1: {
        k1_1_1: {
          a: true,
          b: false,
        },
        k1_1_2: () => {},
      },
      k1_2: {
        c: "c",
      },
    },
    k2: {
      k2: "k2",
    },
    k3: {
      a: "a",
    },
    k4: {
      a: 1
    }
  };
  const c = {
    k1: {
      k1_1: {
        k1_1_1: {
          a: true,
          b: false,
          c: a.k1.k1_1.k1_1_1.c,
        },
        k1_1_2: b.k1.k1_1.k1_1_2,
      },
      k1_2: {
        c: "c",
      },
    },
    k2: {
      k2: "k2",
    },
    k3: {
      c: 1,
      b: 2,
      a: "a",
    },
    k4: {
      a: 1
    }
  };
  const d = {
    k4: {
      a: 2,
      c: {
        a: 1
      }
    },
    options: {
      disabled: false
    }
  }
  const result = deepObjectAssign(a, b);
  const result2 = deepObjectAssign2({}, a, b, c, d);
  const r = Object.assign({}, c, d)
  expect(result).toEqual(c);
  expect(result.k4).not.toBe(c.k4);
  expect(result2).toEqual(r);
  expect(result2.k4).not.toBe(d.k4);
  expect(result2.k4).toEqual(d.k4);
  expect(result2.options).toEqual(d.options);
});
