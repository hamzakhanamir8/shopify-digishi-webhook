export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).send("Method Not Allowed");

  const DIGISHI_TOKEN = process.env.DIGISHI_TOKEN;
  const SHOPIFY_TOKEN = process.env.SHOPIFY_ADMIN_TOKEN;
  const SHOP = process.env.SHOPIFY_SHOP;
  const LOCATION_ID = "113225695600";

  const shopifyProduct = req.body?.product ? req.body.product : req.body;

  const updateUrl = "https://digisyria.com/module/suppliers/productUpdate";
  const createUrl = "https://digisyria.com/module/suppliers/createNewProduct";

  async function postJson(url, payload) {
    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const text = await r.text();
    return { status: r.status, text };
  }

  try {
    // 1️⃣ Collect inventory_item_ids
    const inventoryItemIds = shopifyProduct.variants
      .map(v => v.inventory_item_id)
      .filter(Boolean);

    let inventoryMap = {};

    if (inventoryItemIds.length > 0) {
      const inventoryUrl =
        `https://${SHOP}/admin/api/2025-04/inventory_levels.json` +
        `?inventory_item_ids=${inventoryItemIds.join(",")}` +
        `&location_ids=${LOCATION_ID}`;

      const invRes = await fetch(inventoryUrl, {
        headers: {
          "X-Shopify-Access-Token": SHOPIFY_TOKEN,
          "Content-Type": "application/json"
        }
      });

      const invData = await invRes.json();

      if (invData.inventory_levels) {
        invData.inventory_levels.forEach(level => {
          inventoryMap[level.inventory_item_id] = level.available;
        });
      }
    }

    // 2️⃣ Inject correct location-based quantity
    shopifyProduct.variants = shopifyProduct.variants.map(variant => {
      const correctQty = inventoryMap[variant.inventory_item_id] ?? 0;
      return {
        ...variant,
        inventory_quantity: correctQty
      };
    });

    const updatePayload = { token: DIGISHI_TOKEN, product: shopifyProduct };
    const createPayload = { token: DIGISHI_TOKEN, product: shopifyProduct };

    // 3️⃣ Update flow
    let r1 = await postJson(updateUrl, updatePayload);

    if (r1.status === 404) {
      await postJson(createUrl, createPayload);
      await postJson(updateUrl, updatePayload);
    }

    return res.status(200).json({
      message: "Location-filtered update sent",
      productId: shopifyProduct?.id
    });

  } catch (err) {
    console.error("Webhook failed:", err);
    return res.status(500).json({ error: "Webhook failed", details: err.message });
  }
}
