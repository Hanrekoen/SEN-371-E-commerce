"use strict";

function toProductDTO(product, { isAdmin = false } = {}) {
    const P = typeof product.toObject === "function" ? product.toObject() : product;
    
    const category =
    p.catgoryID &&  typeof p.category === "object" && p.category.name
        ? { id: String(p.categoryID._id), name: p.category.name, slug: p.categoryID.slug }
        : { id: String(p.categoryID), name: null, slug: null };

    const dto = {
        id: String(p._id),
        name: p.name,
        slug: p.slug,
        sku: p.sku,
        brand: p.brand,
        description: p.description,
        priceCents: p.priceCents, category,
        stock: p.stock,   
        images: p.images,
        variants: p.variants,
        specs: p.specs,
        ratingsAverage: p.ratingsAverage,
        ratingsCount: p.ratingsCount,
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