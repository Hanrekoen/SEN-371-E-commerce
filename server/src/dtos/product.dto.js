"use strict";

function toProductDTO(product, { isAdmin = false } = {}) {
    const p = typeof product.toObject === "function" ? product.toObject() : product;
    
    const category =
    p.categoryId && typeof p.categoryId === "object" && p.categoryId.name
    ? { id: String(p.categoryId._id), name: p.categoryId.name, slug: p.categoryId.slug }
    : { id: String(p.categoryId), name: null, slug: null };

    const dto = {
        id: String(p._id),
        name: p.name,
        slug: p.slug,
        sku: p.sku,
        brand: p.brand,
        description: p.description,
        priceCents: p.priceCents, category,   
        images: p.images,
        variants: p.variants,
        specs: p.specs,
        ratingAverage: p.ratingAverage,
        ratingCount: p.ratingCount,
        inStock: p.stockQty > 0,
        isActive: p.isActive,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
    };

    if (isAdmin) dto.stockQty = p.stockQty;
    return dto;
}

function toProductListDTO(products, opts) {
    return products.map((p) => toProductDTO(p, opts));
}

module.exports = {
    toProductDTO,
    toProductListDTO,
};