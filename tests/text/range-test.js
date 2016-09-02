/*global System, declare, it, xit, describe, xdescribe, beforeEach, afterEach, before, after*/
import { Range } from "../../text/range.js";
import { expect } from "mocha-es6";


describe("range", () => {

  describe("merge", () => {

    it("bordered", () =>
      expect(Range.create(0,0, 1, 4).merge(Range.create(1, 4, 1, 5)))
        .stringEquals("Range(0/0 -> 1/5)"));

    it("bordered reverse", () =>
      expect(Range.create(1, 4, 1, 5).merge(Range.create(0,3, 1, 4)))
        .stringEquals("Range(0/3 -> 1/5)"));

    it("overlapping ", () =>
      expect(Range.create(0,0, 1, 4).merge(Range.create(1, 2, 1, 5)))
        .stringEquals("Range(0/0 -> 1/5)"));

    it("overlapping reverse", () =>
      expect(Range.create(1, 2, 1, 5).merge(Range.create(0,3, 1, 4)))
        .stringEquals("Range(0/3 -> 1/5)"));

    it("non overlapping", () =>
      expect(Range.create(1, 2, 1, 5).merge(Range.create(1, 6, 1, 8)))
        .stringEquals("Range(1/2 -> 1/5)"));

  });

  describe("subtract", () => {

    it("overlapping", () =>
      expect(Range.create(0,0, 1, 4).without(Range.create(1, 2, 1, 5)))
        .stringEquals("Range(0/0 -> 1/5)"));

    it("non-overlapping 1", () =>
      expect(Range.create(0,0, 1, 1).without(Range.create(1, 2, 1, 5)))
        .stringEquals("Range(0/0 -> 1/1)"));

    it("non-overlapping 2", () =>
      expect(Range.create(1, 2, 1, 5).without(Range.create(0,0, 1, 1)))
        .stringEquals("Range(1/2 -> 1/5)"));

  });

});