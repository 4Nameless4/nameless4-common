import { expect, test } from "@jest/globals";
import { randomColor } from "../src/index";

test("random color", () => {
  const ran = randomColor();
  const c1 = ran(0);
  const c2 = ran(1);
  expect(c1).not.toBe(c2);
  expect(ran(0)).toBe(c1);
});
