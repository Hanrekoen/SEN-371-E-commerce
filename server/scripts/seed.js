"use strict";
/**
 * Seeds the database with categories and products so the catalogue has
 * something to render. Safe to re-run: it clears both collections first.
 *
 *   npm run seed
 *
 * Person 4 owns this file going forward - extend it with users and orders.
 */
//const { connect, disconnect } = require("../src/config/database");
//const Category = require("../src/models/category.model");
//const Product = require("../src/models/product.model");

const bcrypt = require("bcrypt");
const { connect, disconnect } = require("../src/config/database");
const Category = require("../src/models/category.model");
const Product = require("../src/models/product.model");
const User = require("../src/models/user.model");
const Cart = require("../src/models/cart.model");
const Order = require("../src/models/order.model");
const {buildOrder} = require("../src/services/order.factory");

//dev accounts password for seeding
const seed_password = "Password123!";

const USERS = [
  {
    firstName: "Obusitse",
    lastName: "Admin",
    email: "Obusitse.admin@sen371.test",
    role: "admin",
    addresses: [],
  },

  {
    firstName: "Hanre",
    lastName: "Admin",
    email: "Hanre.admin@sen371.test",
    role: "admin",
    addresses: []
  }, 

  { firstName: "Ryno",
    lastName: "Admin",
    email: "Ryno.admin@sen371.test",
    role: "admin",
    addresses: []
  },

  {
    firstName: "Zander",
    lastName: "Admin",
    email: "Zander.admin@sen371.test",
    role: "admin",
    addresses: []
  }, 

  {
    firstName: "Lebo",
    lastName: "Sekgobela",
    email: "Lebo@sen371.test",
    role: "customer",
    addresses: [{
      label: "Home",
      line1: "123 Main Street",
      city: "Cape Town",
      province: "Western Cape",
      postalCode: "8001",
      country: "South Africa",
      isDefault: true,
    }]
  }, 

  {
    firstName: "Sipho",
    lastName: "Mokoena",
    email: "Sipho@sen371.test",
    password: seed_password,
    role: "customer",
    addresses: [{
      label: "Home",
      line1: "456 Oak Avenue",
      city: "Cape Town",
      province: "Western Cape",
      postalCode: "8001",
      country: "South Africa",
      isDefault: true,
    }]
  }, 

  {
    firstName: "Tshepo",
    lastName: "Dlamini",
    email: "Tshepo@sen371.test",
    password: seed_password,
    role: "customer",
    addresses: [{
      label: "Home",
      line1: "789 Pine Road",
      city: "Pretoria",
      province: " Gauteng",
      postalCode: "0118",
      country: "South Africa",
      isDefault: true,
    }]
  }, 

  {
    firstName: "Scott",
    lastName: "Crabtree",
    email: "Scott@sen371.test",
    password: seed_password,
    role: "customer",
    addresses: [{
      label: "Home",
      line1: "101 Maple Lane",
      city: "Pretoria",
      province: " Gauteng",
      postalCode: "0118",
      country: "South Africa",
      isDefault: true,
    }]
  }, 
];

const CATEGORIES = [
  { name: "Audio Architecture", slug: "audio-architecture", icon: "audio",
    description: "Headphones, amplifiers and acoustic hardware." },
  { name: "Modular Keyboards", slug: "modular-keyboards", icon: "keyboard",
    description: "Mechanical and modular input devices." },
  { name: "Optical Sensors", slug: "optical-sensors", icon: "camera",
    description: "Webcams, capture devices and optics." },
  { name: "Neural Displays", slug: "neural-displays", icon: "display",
    description: "High refresh and ultra-wide displays." },
  { name: "Gaming Mice", slug: "gaming-mice", icon: "mouse",
    description: "Precision pointing devices." },
];

const IMG = "https://placehold.co/800x800/0b0f16/3b82f6?text=";

const PRODUCTS = [
  {
    name: "AeroPulse ANC Headset", slug: "aeropulse-anc-headset", sku: "AP-ANC-001",
    brand: "AeroPulse", categorySlug: "audio-architecture", priceCents: 34900, stockQty: 24,
    ratingAverage: 4.8, ratingCount: 1124,
    description: "Audiophile grade electrostatic drivers with hybrid neural noise cancellation.",
    variants: [ { name: "Obsidian Black", hex: "#111418" }, { name: "Arctic Silver", hex: "#C9CED6" }, { name: "Vault Blue", hex: "#2563EB" } ],
    specs: [
      { label: "Driver Tech", value: "46mm Electrostatic" },
      { label: "Freq Response", value: "4Hz - 46kHz" },
      { label: "ANC Level", value: "Hybrid Neural, -46dB" },
      { label: "Battery Life", value: "54 hrs (Active ANC)" },
      { label: "Connectivity", value: "Ultra-Low Latency Wireless + USB-C" },
    ],
  },
  {
    name: "Obsidian X-9 Headset", slug: "obsidian-x-9-headset", sku: "OB-X9-002",
    brand: "Obsidian", categorySlug: "audio-architecture", priceCents: 34900, stockQty: 15,
    ratingAverage: 4.9, ratingCount: 1124,
    description: "Reference class closed-back headset finished in carbon composite.",
    variants: [ { name: "Carbon Black", hex: "#0F1216" }, { name: "Gunmetal", hex: "#5A6270" } ],
    specs: [
      { label: "Driver Tech", value: "40mm Planar" },
      { label: "Freq Response", value: "5Hz - 40kHz" },
      { label: "Battery Life", value: "48 hrs" },
    ],
  },
  {
    name: "NovaKey MX60 Mechanical", slug: "novakey-mx60-mechanical", sku: "NK-MX60-003",
    brand: "NovaKey", categorySlug: "modular-keyboards", priceCents: 18900, stockQty: 2,
    ratingAverage: 4.6, ratingCount: 402,
    description: "Hot-swappable 60% mechanical keyboard with gasket mount and MX Teal switches.",
    variants: [ { name: "Death Wisp", hex: "#1B1F27" }, { name: "Frost", hex: "#E8EDF4" } ],
    specs: [
      { label: "Layout", value: "60% Hot-swap" },
      { label: "Switches", value: "MX Teal Tactile" },
      { label: "Connectivity", value: "USB-C, Bluetooth 5.3" },
    ],
  },
  {
    name: "Cortex Prime Pro Webcam", slug: "cortex-prime-pro-webcam", sku: "CP-CAM-004",
    brand: "Cortex Prime", categorySlug: "optical-sensors", priceCents: 29900, stockQty: 31,
    ratingAverage: 4.7, ratingCount: 288,
    description: "4K60 capture with on-sensor neural framing and ring illumination.",
    variants: [ { name: "Matte Black", hex: "#14181F" } ],
    specs: [
      { label: "Resolution", value: "4K @ 60fps" },
      { label: "Field of View", value: "78 degrees" },
      { label: "Focus", value: "Neural autofocus" },
    ],
  },
  {
    name: "Sonic Labs DAC Amplifier", slug: "sonic-labs-dac-amplifier", sku: "SL-DAC-005",
    brand: "Sonic Labs", categorySlug: "audio-architecture", priceCents: 49900, stockQty: 9,
    ratingAverage: 4.8, ratingCount: 173,
    description: "Balanced desktop DAC and headphone amplifier, 32-bit / 768kHz.",
    variants: [ { name: "Anodised Black", hex: "#0E1116" } ],
    specs: [
      { label: "DAC Chip", value: "ES9038PRO" },
      { label: "Sample Rate", value: "768kHz / 32-bit" },
      { label: "Output", value: "Balanced XLR + 6.35mm" },
    ],
  },
  {
    name: "Apex Pro Neural Display", slug: "apex-pro-neural-display", sku: "AX-DSP-006",
    brand: "Apex", categorySlug: "neural-displays", priceCents: 129900, stockQty: 6,
    ratingAverage: 4.9, ratingCount: 96,
    description: "34 inch ultrawide OLED at 240Hz with hardware colour calibration.",
    variants: [ { name: "Shadow", hex: "#0B0E13" } ],
    specs: [
      { label: "Panel", value: "34in OLED Ultrawide" },
      { label: "Refresh", value: "240Hz" },
      { label: "Response", value: "0.03ms GtG" },
    ],
  },
  {
    name: "Obsidian X-9 Carbon Mouse", slug: "obsidian-x-9-carbon-mouse", sku: "OB-MSE-007",
    brand: "Obsidian", categorySlug: "gaming-mice", priceCents: 14900, stockQty: 42,
    ratingAverage: 4.5, ratingCount: 331,
    description: "38 gram carbon fibre shell with a 32K optical sensor.",
    variants: [ { name: "Carbon", hex: "#15181D" }, { name: "White Out", hex: "#F2F4F7" } ],
    specs: [
      { label: "Weight", value: "38g" },
      { label: "Sensor", value: "32,000 DPI Optical" },
      { label: "Polling", value: "8000Hz" },
    ],
  },
];

async function run() {
  await connect();

  await Category.deleteMany({});
  await Product.deleteMany({});
  await User.deleteMany({});
  await Cart.deleteMany({});
  await Order.deleteMany({});
  console.log("[seed] cleared categories and products");


  const categories = await Category.insertMany(CATEGORIES);
  const bySlug = Object.fromEntries(categories.map((c) => [c.slug, c._id]));
  console.log(`[seed] inserted ${categories.length} categories`);

  const products = PRODUCTS.map((p) => {
    const { categorySlug, ...rest } = p;
    return {
      ...rest,
      categoryId: bySlug[categorySlug],
      images: [
        IMG + encodeURIComponent(p.name),
        IMG + encodeURIComponent(p.name + " 2"),
        IMG + encodeURIComponent(p.name + " 3"),
        IMG + encodeURIComponent(p.name + " 4"),
      ],
      isActive: true,
    };
  });

  const inserted = await Product.insertMany(products);
  console.log(`[seed] inserted ${inserted.length} products`);

  const hashedPassword = await bcrypt.hash(seed_password, 10);
  const users = await User.insertMany(USERS.map((u) => ({ ...u, passwordHash: hashedPassword })));
  console.log(`[seed] inserted ${users.length} users (password: ${seed_password})`);
  const [, , , ,lebo, sipho, tshepo, scott] = users;

  await Cart.create ({ 
    userId: lebo._id, 
    items: [
      { productId: inserted[0]._id, quantity: 1, finish: inserted[0].variants[0]?.name },
      { productId: inserted[2]._id, quantity: 1, finish: inserted[2].variants[0]?.name },
   ],
   });
   console.log(`[seed] created cart for ${lebo.firstName} ${lebo.lastName}`);

   const orderData = buildOrder({
    userId: sipho._id,
    cartItems: [
      { productId: inserted[1]._id, quantity: 1, finish: inserted[1].variants[0]?.name },
      { productId: inserted[3]._id, quantity: 2, finish: inserted[3].variants[0]?.name },
    ],
    products: inserted,
    shippingAddress: sipho.addresses[0],
  });
  orderData.status = "paid"; // Mark the order as paid for seeding purposes
  await Order.create(orderData);
  console.log(`[seed] created paid order for ${sipho.firstName} ${sipho.lastName}`);

  await disconnect();
  console.log("[seed] done");
}

run().catch(async (err) => {
  console.error("[seed] failed:", err);
  await disconnect();
  process.exit(1);
});
