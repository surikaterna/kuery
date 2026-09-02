import { describe, expect, it } from "vitest";
import { compileFilter } from "../filter-compiler.js";
import { Kuery } from "../kuery.js";
import { collection, collectionWithNull, skipCollection } from "./fixtures/v1-data.js";

// ---------------------------------------------------------------------------
// Converted from test/kuery.js (mocha) — 52 tests
// ---------------------------------------------------------------------------

describe("v1 regression — kuery.js", () => {
  it("should return 0 for empty collection", () => {
    const q = new Kuery({});
    expect(q.find([])).toHaveLength(0);
  });

  it("should return all elements for empty query", () => {
    const q = new Kuery({});
    expect(q.find(collection)).toHaveLength(5);
  });

  it("should return correct element for property eq query", () => {
    const q = new Kuery({ id: 2 });
    expect(q.findOne(collection).name).toBe("Sven");
  });

  it("should return correct element for property $eq query", () => {
    const q = new Kuery({ name: { $eq: "Emil" } });
    expect(q.findOne(collection).name).toBe("Emil");
  });

  it("should return correct element for property not eq query", () => {
    const q = new Kuery({ id: { $ne: 2 } });
    expect(q.find(collection)).toHaveLength(4);
  });

  it("should return correct elements for property in query", () => {
    const q = new Kuery({ id: { $in: [1, 2] } });
    expect(q.find(collection)).toHaveLength(2);
  });

  it("should return correct elements for property $nin query", () => {
    const q = new Kuery({ id: { $nin: [1, 2] } });
    expect(q.find(collection)).toHaveLength(3);
  });

  it("should support nested $ne and $in query", () => {
    const q = new Kuery({ status: { $ne: { $in: ["new", "rejected"] } } });
    const terminalVisits = [{ status: "new" }, { status: "rejected" }, { status: "completed" }];

    expect(q.find(terminalVisits)).toEqual([{ status: "completed" }]);
  });

  it("should return all elements for property with empty $nin query", () => {
    const q = new Kuery({ id: { $nin: [] } });
    expect(q.find(collection)).toHaveLength(5);
  });

  it("should return correct elements for property with path eq query", () => {
    const q = new Kuery({ "address.street": "Bellmansgatan" });
    expect(q.find(collection)).toHaveLength(1);
  });

  it("should return correct elements for property with path ne query", () => {
    const q = new Kuery({ "address.street": { $ne: "Bellmansgatan" } });
    expect(q.find(collection)).toHaveLength(4);
  });

  it("should return correct elements for property with path in query", () => {
    const q = new Kuery({ name: { $in: ["Andreas", "Emil"] } });
    expect(q.find(collection)).toHaveLength(2);
  });

  it("should return correct elements for property in with strings query (in)", () => {
    const q = new Kuery({ name: { $in: ["Andreas", "Emil"] } });
    expect(q.find(collection)).toHaveLength(2);
  });

  it("should return correct elements for property in with strings query (nin)", () => {
    const q = new Kuery({ name: { $nin: ["Andreas", "Emil"] } });
    expect(q.find(collection)).toHaveLength(3);
  });

  it("should return correct elements for composite query (in + eq)", () => {
    const q = new Kuery({ name: { $in: ["Andreas", "Emil"] }, id: 1 });
    expect(q.find(collection)).toHaveLength(1);
  });

  it("should return correct elements for composite query (nin + eq)", () => {
    const q = new Kuery({ name: { $nin: ["Andreas", "Emil"] }, id: 2 });
    expect(q.find(collection)).toHaveLength(1);
  });

  it("should return correct elements for composite query (nin + eq no match)", () => {
    const q = new Kuery({ name: { $nin: ["Andreas", "Emil"] }, id: 1 });
    expect(q.find(collection)).toHaveLength(0);
  });

  it("should match when object is null and nested property is checked with $nin", () => {
    const q = new Kuery({ name: "KE", "girlfriends.wife": { $nin: ["Shin Hye-sun"] } });
    expect(q.find(collectionWithNull)).toHaveLength(1);
  });

  it("should match when object is null and nested property is checked with $ne", () => {
    const q = new Kuery({ name: "KE", "girlfriends.wife": { $ne: "Shin Hye-sun" } });
    expect(q.find(collectionWithNull)).toHaveLength(1);
  });

  it("should not match when object is null and nested property is checked with $in", () => {
    const q = new Kuery({ name: "KE", "girlfriends.wife": { $in: ["Shin Hye-sun"] } });
    expect(q.find(collectionWithNull)).toHaveLength(0);
  });

  it("should not match when object is null and nested property is checked with $eq", () => {
    const q = new Kuery({ name: "KE", "girlfriends.wife": { $eq: "Shin Hye-sun" } });
    expect(q.find(collectionWithNull)).toHaveLength(0);
  });

  it("should return correct elements for regex string query", () => {
    const q = new Kuery({ name: { $regex: "Andr.*", $options: "i" } });
    expect(q.find(collection)).toHaveLength(1);
  });

  it("should return correct elements for regex native query", () => {
    const q = new Kuery({ name: { $regex: /andr.*/, $options: "i" } });
    expect(q.find(collection)).toHaveLength(1);
  });

  it("should return correct elements for inline regex query", () => {
    const q = new Kuery({ name: /andr.*/i });
    expect(q.find(collection)).toHaveLength(1);
  });

  it("should return correct elements for negating $elemMatch query", () => {
    const q = new Kuery({ girlfriends: { $not: { $elemMatch: { hotness: 200 } } } });
    expect(q.find(collection)).toHaveLength(4);
  });

  it("should return correct elements for negating $elemMatch regex query", () => {
    const q = new Kuery({ girlfriends: { $not: { $elemMatch: { name: /nny$/i } } } });
    expect(q.find(collection)).toHaveLength(4);
  });

  it("should return correct elements for $or query", () => {
    const q = new Kuery({ $or: [{ name: /andr.*/i }, { name: /emil.*/i }] });
    expect(q.find(collection)).toHaveLength(2);
  });

  it("should return correct elements for $or query when both sides return same element", () => {
    const q = new Kuery({ $or: [{ name: /andr.*/i }, { name: /andr.*/i }] });
    expect(q.find(collection)).toHaveLength(1);
  });

  it("should return correct elements for property with path eq query with arrays", () => {
    const q = new Kuery({ "girlfriends.name": "eve" });
    expect(q.find(collection)).toHaveLength(1);
  });

  it("should return correct element for property gte query", () => {
    const q = new Kuery({ id: { $gte: 2 } });
    expect(q.find(collection)).toHaveLength(4);
  });

  it("should return correct element for property lte query", () => {
    const q = new Kuery({ id: { $lte: 2 } });
    expect(q.find(collection)).toHaveLength(2);
  });

  it("should return correct element for property gt query", () => {
    const q = new Kuery({ id: { $gt: 2 } });
    expect(q.find(collection)).toHaveLength(3);
  });

  it("should return correct element for property lt query", () => {
    const q = new Kuery({ id: { $lt: 2 } });
    expect(q.find(collection)).toHaveLength(1);
  });

  it("should return correct element for property lte date query", () => {
    const q = new Kuery({ born: { $lte: new Date("1981-01-01") } });
    expect(q.find(collection)).toHaveLength(1);
  });

  it("should return correct element for property gte date query", () => {
    const q = new Kuery({ born: { $gte: new Date("1981-01-01") } });
    expect(q.find(collection)).toHaveLength(4);
  });

  it("should return correct element for property gte/lte date query", () => {
    const q = new Kuery({ born: { $gte: new Date("1981-01-01"), $lte: new Date("1990-01-01") } });
    expect(q.find(collection)).toHaveLength(3);
  });

  it("should return no elements for single elemMatch query with no match", () => {
    const q = new Kuery({ girlfriends: { $elemMatch: { hotness: 222 } } });
    expect(q.find(collection)).toHaveLength(0);
  });

  it("should return correct element for single elemMatch query", () => {
    const q = new Kuery({ girlfriends: { $elemMatch: { hotness: 10 } } });
    expect(q.find(collection)).toHaveLength(1);
  });

  it("should not return element when using $elemMatch on an object property", () => {
    const q = new Kuery({ "bikes.bike": { $elemMatch: { brand: "trek" } } });
    expect(q.find(collection)).toHaveLength(0);
  });

  it("should return correct element when using $elemMatch on a nested array property", () => {
    const q = new Kuery({ "bikes.bike.wheels": { $elemMatch: { position: "front" } } });
    expect(q.find(collection)).toHaveLength(1);
  });

  it("should return correct element when using elemMatch on nested optional array property", () => {
    const q = new Kuery({ id: 4, "parts.parts": { $elemMatch: { name: { $eq: "part2.sub1" } } } });
    expect(q.find(collection)).toHaveLength(1);
  });

  it("should return correct element when using $elemMatch on nested array with differing property types", () => {
    const q = new Kuery({ id: 5, "parts.parts": { $elemMatch: { name: { $eq: "part2.sub1" } } } });
    expect(q.find(collection)).toHaveLength(1);
  });

  it("should return correct element when using $elemMatch on nested array where one type is empty string", () => {
    const q = new Kuery({ id: 3, "parts.parts": { $elemMatch: { name: { $eq: "part2.sub1" } } } });
    expect(q.find(collection)).toHaveLength(1);
  });

  it("should return correct element when using $elemMatch with multiple conditions on a nested array property", () => {
    const q = new Kuery({ "bikes.bike.wheels": { $elemMatch: { position: "front", type: "carbon" } } });
    expect(q.find(collection)).toHaveLength(1);
  });

  it("should not return any element when elemMatch does not match on the same item in the array", () => {
    const q = new Kuery({ "bikes.bike.wheels": { $elemMatch: { position: "back", type: "carbon" } } });
    expect(q.find(collection)).toHaveLength(0);
  });

  it("should not return any element when $elemMatch is not matching on nested array property", () => {
    const q = new Kuery({ "bikes.bike.wheels": { $elemMatch: { position: "middle" } } });
    expect(q.find(collection)).toHaveLength(0);
  });

  it("should return correct element for multipart elemMatch query", () => {
    const q = new Kuery({ girlfriends: { $elemMatch: { hotness: 10, name: "fanny" } } });
    expect(q.find(collection)).toHaveLength(1);
  });

  it("should return correct element for multipart elemMatch query asserting with $eq and $ne", () => {
    const q = new Kuery({ girlfriends: { $elemMatch: { hotness: { $eq: 10 }, name: { $ne: "eve" } } } });
    const col = q.find(collection);
    expect(col).toHaveLength(1);
    expect((col[0] as Record<string, unknown>).name).toBe("Emil");
  });

  it("should return no element for multipart elemMatch query matching different array elements", () => {
    const q = new Kuery({ girlfriends: { $elemMatch: { hotness: 10, name: "eve" } } });
    expect(q.find(collection)).toHaveLength(0);
  });

  it("should return correct elements for double nested array elemMatch query", () => {
    const q = new Kuery({ "girlfriends.boyfriends": { $elemMatch: { id: 2, name: "Sven" } } });
    expect(q.find(collection)).toHaveLength(1);
  });

  it("should return correct elements for triple nested array elemMatch query", () => {
    const q = new Kuery({ "girlfriends.boyfriends.girlfriends": { $elemMatch: { hotness: 10, name: "fanny" } } });
    expect(q.find(collection)).toHaveLength(1);
  });

  it("should return correct elements for negated triple nested array elemMatch query", () => {
    const q = new Kuery({
      "girlfriends.boyfriends.girlfriends": { $not: { $elemMatch: { hotness: 10, name: "fanny" } } },
    });
    expect(q.find(collection)).toHaveLength(4);
  });

  it("should return correct elements for property with path $regex with arrays", () => {
    const q = new Kuery({ "girlfriends.name": { $regex: "ev.*", $options: "i" } });
    expect(q.find(collection)).toHaveLength(1);
  });

  it("should return elements where given element exists is true", () => {
    const q = new Kuery({ address: { $exists: true } });
    expect(q.find(collection)).toHaveLength(2);
  });

  it("should return elements where given element exists is false", () => {
    const q = new Kuery({ girlfriends: { $exists: false } });
    expect(q.find(collection)).toHaveLength(1);
  });

  it("should return elements where given element exists deeply", () => {
    const q = new Kuery({ "girlfriends.wife": { $exists: true } });
    expect(q.find(collection)).toHaveLength(2);
  });

  it("should return elements where given element does not exist deeply", () => {
    const q = new Kuery({ "address.zipcode": { $exists: false } });
    expect(q.find(collection)).toHaveLength(5);
  });

  it("should return elements when query for boolean", () => {
    const q = new Kuery({ isActive: true });
    expect(q.find(collection)).toHaveLength(2);
  });

  it("$or should do implicit and on subqueries", () => {
    const q = new Kuery({
      $or: [{ "girlfriends.name": "Hanna", "girlfriends.hotness": 10 }, { "girlfriends.hotness": 1000 }],
    });
    expect(q.find(collection)).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// Converted from test/skip.js (mocha) — 7 tests
// ---------------------------------------------------------------------------

describe("v1 regression — skip/limit/sort", () => {
  it("should skip 2 documents", () => {
    const q = new Kuery({});
    q.skip(2);
    const r = q.find(skipCollection);
    expect(r).toHaveLength(2);
    expect((r[0] as Record<string, unknown>).id).toBe(3);
  });

  it("should skip 2 documents with query", () => {
    const q = new Kuery({ id: { $gt: 1 } });
    q.skip(2);
    const r = q.find(skipCollection);
    expect(r).toHaveLength(1);
    expect((r[0] as Record<string, unknown>).id).toBe(4);
  });

  it("should limit 2 documents", () => {
    const q = new Kuery({});
    q.limit(2);
    const r = q.find(skipCollection);
    expect(r).toHaveLength(2);
    expect((r[0] as Record<string, unknown>).id).toBe(1);
  });

  it("should limit 2 documents with query", () => {
    const q = new Kuery({ id: { $gt: 1 } });
    q.limit(2);
    const r = q.find(skipCollection);
    expect(r).toHaveLength(2);
    expect((r[0] as Record<string, unknown>).id).toBe(2);
  });

  it("should limit 2, skip 1 documents with query", () => {
    const q = new Kuery({ id: { $gt: 1 } });
    q.limit(2).skip(1);
    const r = q.find(skipCollection);
    expect(r).toHaveLength(2);
    expect((r[0] as Record<string, unknown>).id).toBe(3);
  });

  it("should sort on one property", () => {
    const q = new Kuery({});
    q.sort({ born: 1 });
    const r = q.find(skipCollection);
    expect(r).toHaveLength(skipCollection.length);
    expect((r[0] as Record<string, unknown>).born).toEqual(skipCollection[0].born);
    expect((r[1] as Record<string, unknown>).born).toEqual(skipCollection[3].born);
  });

  it("should sort and skip", () => {
    const q = new Kuery({});
    q.sort({ born: -1 });
    q.skip(1);
    const r = q.find(skipCollection);
    expect((r[0] as Record<string, unknown>).name).toBe("Sven");
  });
});

// ---------------------------------------------------------------------------
// Converted from test/compiler.js (mocha) — 3 tests
// ---------------------------------------------------------------------------

describe("v1 regression — compiler", () => {
  it("compile ne null query does not throw", () => {
    expect(() => compileFilter({ attachmentId: { $ne: null } })).not.toThrow();
  });

  it("compile eq query via compileFilter", () => {
    const p = compileFilter({ age: 10 });
    expect(p({ age: 10 })).toBe(true);
  });

  it("compile subquery (array of conditions)", () => {
    // Original tested _subQuery which compiled an array of conditions (used by $or/$and)
    // Equivalent: compileFilter with $and wrapping
    const p = compileFilter({ $and: [{ age: 10 }] });
    expect(p({ age: 10 })).toBe(true);
  });

  it("should sort on a dot-path property", () => {
    const docs = [
      { id: 1, meta: { priority: 3 } },
      { id: 2, meta: { priority: 1 } },
      { id: 3, meta: { priority: 2 } },
    ];
    const r = new Kuery({}).sort({ "meta.priority": 1 }).find(docs);
    expect(r.map((d) => d.id)).toEqual([2, 3, 1]);
  });

  it("should sort descending on a dot-path property", () => {
    const docs = [
      { id: 1, meta: { priority: 3 } },
      { id: 2, meta: { priority: 1 } },
      { id: 3, meta: { priority: 2 } },
    ];
    const r = new Kuery({}).sort({ "meta.priority": -1 }).find(docs);
    expect(r.map((d) => d.id)).toEqual([1, 3, 2]);
  });
});
