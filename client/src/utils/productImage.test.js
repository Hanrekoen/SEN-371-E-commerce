import { describe, expect, test, vi } from "vitest";
import { productImage, productImages, onImageError, FALLBACK_IMAGE } from "./productImage";

// UNIT TESTS.
//
// This module exists because of a real defect: images rendered on Home and the
// catalogue but not on the product detail page. The cause was that `images`
// does not always arrive as a clean array - a product typed into the admin
// form can produce a plain string, and indexing a string with [0] yields one
// character. Every shape that caused or could cause that is pinned here.

const LOCAL = "/product-pictures/Obsidian%20x9%20black.jpg";

describe("productImages normalises whatever the API sends", () => {
  test("a proper array passes through", () => {
    expect(productImages({ images: [LOCAL, "/b.jpg"] })).toEqual([LOCAL, "/b.jpg"]);
  });

  // The bug that started this: "/a.jpg"[0] === "/", so the page requested "/"
  // and rendered nothing.
  test("a single string is treated as one image, not a list of characters", () => {
    expect(productImages({ images: LOCAL })).toEqual([LOCAL]);
  });

  test("a comma-separated string becomes separate images", () => {
    expect(productImages({ images: `${LOCAL},/b.jpg` })).toEqual([LOCAL, "/b.jpg"]);
  });

  test("surrounding whitespace is trimmed", () => {
    expect(productImages({ images: ["  /a.jpg  "] })).toEqual(["/a.jpg"]);
  });

  test.each([
    ["placehold.co", "https://placehold.co/600x600"],
    ["via.placeholder", "https://via.placeholder.com/600"],
    ["dummyimage", "https://dummyimage.com/600"],
    ["unsplash", "https://images.unsplash.com/photo-1518770660439?w=1200"],
  ])("a %s placeholder is discarded - it never resolves offline", (_label, url) => {
    expect(productImages({ images: [url] })).toEqual([]);
  });

  test.each([
    ["null", null],
    ["undefined", undefined],
    ["an empty array", []],
    ["a number", 42],
    ["an object", { nope: true }],
  ])("%s yields no images rather than throwing", (_label, images) => {
    expect(productImages({ images })).toEqual([]);
  });

  test("a single-character entry is discarded, since no path is one character", () => {
    expect(productImages({ images: ["/"] })).toEqual([]);
  });
});

describe("productImage always returns something usable", () => {
  test("prefers the first real image", () => {
    expect(productImage({ images: [LOCAL, "/b.jpg"] })).toBe(LOCAL);
  });

  test("a known slug wins, so a seeded product always looks right", () => {
    expect(productImage({ slug: "obsidian-x-9-headset", images: [] })).toContain("Obsidian");
  });

  test.each([
    ["no images", { images: [] }],
    ["a placeholder URL", { images: ["https://placehold.co/600"] }],
    ["a malformed field", { images: 42 }],
    ["nothing at all", {}],
    ["null", null],
  ])("%s falls back rather than rendering an empty box", (_label, product) => {
    expect(productImage(product)).toBe(FALLBACK_IMAGE);
  });

  test("a caller can supply its own fallback", () => {
    expect(productImage({ images: [] }, "/custom.jpg")).toBe("/custom.jpg");
  });
});

describe("onImageError", () => {
  test("swaps a broken image for the fallback", () => {
    const img = { dataset: {}, src: "/missing.jpg" };
    onImageError({ currentTarget: img });
    expect(img.src).toBe(FALLBACK_IMAGE);
  });

  // Without the guard, a missing fallback would fire onError again and loop
  // forever, hammering the server.
  test("only swaps once, so a missing fallback cannot loop", () => {
    const img = { dataset: {}, src: "/missing.jpg" };
    onImageError({ currentTarget: img });
    img.src = "/still-missing.jpg";
    onImageError({ currentTarget: img });
    expect(img.src).toBe("/still-missing.jpg");
  });
});
