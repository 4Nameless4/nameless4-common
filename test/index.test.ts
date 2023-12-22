import { describe, expect, test } from "@jest/globals";
import { run1 } from "../src/index";

describe("sum module 3", () => {
  test("adds 1 + 1 + (2 + 2 * 3) + 3 to equal 13", () => {
    expect(run1(3)).toBe(13);
  });
});
