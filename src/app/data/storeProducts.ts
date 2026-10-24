import img1 from "../../imports/image-1.webp";
import img2 from "../../imports/image-2.webp";
import img3 from "../../imports/image-3.webp";
import img4 from "../../imports/image-4.webp";
import img9 from "../../imports/image-9.webp";
import heroImage from "../../imports/image.webp";
import type { Product } from "../types";

const optimizedLocalImages: Record<string, string> = {
  "image.png": heroImage,
  "image-1.png": img1,
  "image-2.png": img2,
  "image-3.png": img3,
  "image-4.png": img4,
  "image-9.png": img9,
};

export function upgradeLocalImageReference(source: string): string {
  if (!source || /^(data:|https?:|blob:)/i.test(source)) return source;
  const fileName = source.split(/[?#]/, 1)[0].split("/").pop() ?? "";
  const legacyName = fileName.match(/^(image(?:-\d+)?)(?:-[A-Za-z0-9_-]+)?\.png$/i)?.[1];
  return legacyName ? optimizedLocalImages[`${legacyName}.png`] ?? source : source;
}

export interface StoreProduct {
  id: string;
  name: string;
  styleNumber?: string;
  category: string;
  color: string;
  colorHex: string;
  price: number;
  displayPrice?: number | null;
  image: string;
  isNew?: boolean;
  isBestseller?: boolean;
  description: string;
  details: string[];
  material: string;
  fit: string;
  care: string;
  sizes: string[];
}

export const storeProducts: StoreProduct[] = [
  {
    id: "1",
    name: "Striped Tunic & Trouser Set",
    category: "Sets",
    color: "Burgundy",
    colorHex: "#7a1a1f",
    price: 285,
    image: img1,
    isNew: true,
    description:
      "A sharply striped two-piece set with an elongated tunic, relaxed trousers, and an easy editorial shape for warm evenings.",
    details: ["Longline tunic with side movement", "Pull-on trouser with a fluid leg", "Designed as a complete set"],
    material: "Viscose blend with a soft structured hand",
    fit: "Relaxed through the body with a straight trouser silhouette",
    care: "Dry clean recommended to preserve the stripe finish",
    sizes: ["XS", "S", "M", "L", "XL"],
  },
  {
    id: "2",
    name: "Asymmetric Olive Drape Set",
    category: "Sets",
    color: "Olive",
    colorHex: "#5a6b3a",
    price: 320,
    image: img2,
    description:
      "An olive set built around soft asymmetry, balancing a sculptural drape with everyday comfort.",
    details: ["Asymmetric neckline", "Fluid matching trouser", "Soft waist definition"],
    material: "Matte crepe with gentle stretch",
    fit: "Draped top with relaxed full-length trousers",
    care: "Hand wash cold or dry clean",
    sizes: ["XS", "S", "M", "L"],
  },
  {
    id: "3",
    name: "Dragon Print Maxi Dress",
    category: "Dresses",
    color: "Burgundy",
    colorHex: "#7a1a1f",
    price: 240,
    image: img3,
    isNew: true,
    description:
      "A dramatic maxi dress with a deep burgundy ground and expressive print placement made for statement dressing.",
    details: ["Maxi length", "Placement print", "Softly shaped waist"],
    material: "Lightweight satin viscose",
    fit: "Skims the body with movement through the skirt",
    care: "Dry clean only",
    sizes: ["XS", "S", "M", "L", "XL"],
  },
  {
    id: "4",
    name: "Classic Striped Tunic",
    category: "Tops",
    color: "Burgundy",
    colorHex: "#7a1a1f",
    price: 195,
    image: img4,
    isBestseller: true,
    description:
      "A polished striped tunic with a clean vertical line, designed to layer easily over trousers or slim skirts.",
    details: ["Longline cut", "Side vents", "Graphic stripe layout"],
    material: "Cotton-viscose shirting",
    fit: "Straight, easy fit",
    care: "Machine wash cold, hang dry",
    sizes: ["XS", "S", "M", "L", "XL"],
  },
  {
    id: "5",
    name: "Teal Print Kaftan Dress",
    category: "Dresses",
    color: "Teal",
    colorHex: "#177a7a",
    price: 265,
    image: img2,
    isNew: true,
    description:
      "A relaxed kaftan dress in saturated teal, finished with an expressive print and airy volume.",
    details: ["Kaftan silhouette", "Wide sleeve opening", "Soft side slits"],
    material: "Printed viscose voile",
    fit: "Generous relaxed fit",
    care: "Hand wash cold, reshape while damp",
    sizes: ["S", "M", "L", "XL"],
  },
  {
    id: "6",
    name: "Teal Fluid Cowl Set",
    category: "Sets",
    color: "Teal",
    colorHex: "#177a7a",
    price: 340,
    image: img3,
    description:
      "A fluid teal set with a soft cowl neckline and wide-leg trouser, made for elegant movement.",
    details: ["Cowl neckline", "Wide-leg trouser", "Soft elastic waist"],
    material: "Silky jersey crepe",
    fit: "Relaxed and fluid",
    care: "Dry clean or gentle cold wash",
    sizes: ["XS", "S", "M", "L"],
  },
  {
    id: "7",
    name: "Chenille Button-Front Top",
    category: "Tops",
    color: "Plum",
    colorHex: "#4a1540",
    price: 175,
    image: img4,
    isBestseller: true,
    description:
      "A plush chenille top with a quiet button-front detail and rich plum tone.",
    details: ["Button-front closure", "Soft chenille texture", "Slightly cropped proportion"],
    material: "Chenille knit blend",
    fit: "Neat shoulder with an easy body",
    care: "Fold to store, hand wash cold",
    sizes: ["XS", "S", "M", "L", "XL"],
  },
  {
    id: "8",
    name: "Chenille Cape with Scarf",
    category: "Tops",
    color: "Burgundy",
    colorHex: "#7a1a1f",
    price: 210,
    image: img1,
    description:
      "A burgundy chenille cape with an integrated scarf, designed as a soft finishing layer.",
    details: ["Cape body", "Integrated scarf panel", "Open front"],
    material: "Plush chenille knit",
    fit: "One-size relaxed drape",
    care: "Dry clean recommended",
    sizes: ["OS"],
  },
  {
    id: "9",
    name: "Layered Statement Necklace",
    category: "Accessories",
    color: "Gold",
    colorHex: "#a08040",
    price: 145,
    image: img9,
    description:
      "A layered gold-tone necklace that adds sculptural shine to clean silhouettes.",
    details: ["Layered chain design", "Adjustable closure", "Lightweight statement scale"],
    material: "Gold-tone plated brass",
    fit: "Adjustable necklace length",
    care: "Avoid water, perfume, and abrasive cloths",
    sizes: ["OS"],
  },
  {
    id: "10",
    name: "Chenille Kimono Jacket",
    category: "Outerwear",
    color: "Plum",
    colorHex: "#4a1540",
    price: 295,
    image: img4,
    isBestseller: true,
    description:
      "A plush kimono jacket in deep plum, cut with generous sleeves and a soft wrap shape.",
    details: ["Open kimono front", "Generous sleeve volume", "Textured chenille finish"],
    material: "Chenille knit blend",
    fit: "Relaxed outer layer",
    care: "Dry clean recommended",
    sizes: ["S", "M", "L"],
  },
  {
    id: "11",
    name: "Olive Sleeveless Maxi",
    category: "Dresses",
    color: "Olive",
    colorHex: "#5a6b3a",
    price: 225,
    image: img2,
    description:
      "A sleeveless olive maxi with a spare line and soft movement through the hem.",
    details: ["Sleeveless column shape", "Maxi length", "Subtle hem movement"],
    material: "Soft woven rayon blend",
    fit: "Straight through the body",
    care: "Machine wash cold, line dry",
    sizes: ["XS", "S", "M", "L", "XL"],
  },
];

export const getStoreProduct = (id: string | undefined) =>
  storeProducts.find((product) => product.id === id);

export function toStoreProduct(product: Product): StoreProduct {
  return {
    id: product.id,
    name: product.name,
    styleNumber: product.styleNumber,
    category: product.category,
    color: product.color ?? "DAIRI",
    colorHex: product.colorHex ?? "#111111",
    price: product.price,
    image: product.images[0] ?? "",
    isNew: product.tags.includes("new"),
    isBestseller: product.tags.includes("bestseller"),
    description: product.description,
    details: product.details ?? [product.description],
    material: product.material ?? "Details coming soon",
    fit: product.fit ?? "See product description",
    care: product.care ?? "Follow the garment care label",
    sizes: product.sizes ?? ["XS", "S", "M", "L", "XL"],
  };
}

export function withCustomerPrice(product: Product, wholesale: boolean): StoreProduct {
  const view = toStoreProduct(product);
  const variants = (product.variants ?? []).filter(variant => variant.isActive);
  const prices = variants.map(variant => wholesale ? variant.wholesalePrice : (variant.retailPrice ?? product.price)).filter((price): price is number => price != null && Number.isFinite(price));
  const displayPrice = wholesale ? (prices.length ? Math.min(...prices) : null) : (prices.length ? Math.min(...prices) : product.price);
  return { ...view, displayPrice };
}

export function customerUnitPrice(product: Product, variantId: string, wholesale: boolean): number | null {
  const variant = product.variants?.find(item => item.id === variantId);
  if (!variant) return wholesale ? null : product.price;
  if (wholesale) return variant.wholesalePrice ?? null;
  return variant.retailPrice ?? product.price;
}

export function customerPriceLabel(product: StoreProduct, wholesale: boolean): string {
  const price = product.displayPrice;
  if (price == null) return wholesale ? 'Wholesale pricing on request' : `$${product.price.toFixed(2)}`;
  return `${wholesale ? 'Wholesale from' : 'From'} $${price.toFixed(2)}`;
}
