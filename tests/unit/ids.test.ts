import { describe, expect, it } from "vitest";
import { parseIdList } from "@/lib/ids";

describe("parseIdList", () => {
  const id = (n: number) => `00000000-0000-4000-8000-00000000000${n}`;
  it("filtert ongeldige id's en dubbelen en beperkt tot het maximum", () => {
    expect(parseIdList(`${id(1)},${id(1)},foo,${id(2)},${id(3)}`, 2)).toEqual([id(1), id(2)]);
    expect(parseIdList(undefined, 4)).toEqual([]);
    expect(parseIdList([id(1), id(2)], 4)).toEqual([id(1), id(2)]);
  });
});
