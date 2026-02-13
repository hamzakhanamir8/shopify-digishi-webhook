export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).send("Method Not Allowed");
  }

  const DIGISHI_TOKEN = process.env.DIGISHI_TOKEN;
  const SHOPIFY_ACCESS_TOKEN = process.env.SHOPIFY_ADMIN_TOKEN;
  const SHOPIFY_SHOP_DOMAIN = process.env.SHOPIFY_SHOP_DOMAIN;
  const TARGET_LOCATION_ID = 113225695600;

  const topic = req.headers["x-shopify-topic"];
  const body = req.body;

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

  async function fetchInventoryLevel(inventoryItemId) {
    const url = `https://${SHOPIFY_SHOP_DOMAIN}/admin/api/2025-04/inventory_levels.json?inventory_item_ids=${inventoryItemId}&location_ids=${TARGET_LOCATION_ID}`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "X-Shopify-Access-Token": SHOPIFY_ACCESS_TOKEN,
        "Content-Type": "application/json",
      },
    });

    const data = await response.json();

    if (
      data.inventory_levels &&
      data.inventory_levels.length > 0
    ) {
      return data.inventory_levels[0].available;
    }

    return 0;
  }

  try {

    // ==============================
    // PRODUCT UPDATE
    // ==============================
    if (topic === "products/update") {
      if (!body || !Array.isArray(body.variants)) {
        return res.status(200).json({ message: "Invalid product payload" });
      }

      // Inject correct inventory for target location only
      for (const variant of body.variants) {
        if (!variant.inventory_item_id) continue;

        const quantity = await fetchInventoryLevel(
          variant.inventory_item_id
        );

        variant.inventory_quantity = quantity;
      }

      const updatePayload = {
        token: DIGISHI_TOKEN,
        product: body,
      };

      const r1 = await postJson(updateUrl, updatePayload);

      // If product does not exist → create
      if (r1.status === 404) {
        const createPayload = {
          token: DIGISHI_TOKEN,
          product: body,
        };

        await postJson(createUrl, createPayload);
        await postJson(updateUrl, updatePayload);

        return res.status(200).json({
          message: "Create-if-missing executed",
          productId: body.id,
        });
      }

      return res.status(200).json({
        message: "Product synced",
        productId: body.id,
      });
    }

    // ==============================
    // INVENTORY UPDATE
    // ==============================
    if (topic === "inventory_levels/update") {
      if (body.location_id !== TARGET_LOCATION_ID) {
        return res.status(200).json({
          message: "Ignored non-target location",
        });
      }

      const quantity = body.available;
      const inventoryItemId = body.inventory_item_id;

      // Fetch product by inventory item
      const productResponse = await fetch(
        `https://${SHOPIFY_SHOP_DOMAIN}/admin/api/2025-04/variants.json?inventory_item_ids=${inventoryItemId}`,
        {
          headers: {
            "X-Shopify-Access-Token": SHOPIFY_ACCESS_TOKEN,
          },
        }
      );

      const productData = await productResponse.json();

      if (
        !productData.variants ||
        productData.variants.length === 0
      ) {
        return res.status(200).json({
          message: "Variant not found",
        });
      }

      const variant = productData.variants[0];

      const payload = {
        token: DIGISHI_TOKEN,
        product: {
          id: variant.product_id,
          variants: [
            {
              id: variant.id,
              inventory_quantity: quantity,
            },
          ],
        },
      };

      await postJson(updateUrl, payload);

      return res.status(200).json({
        message: "Inventory synced",
        productId: variant.product_id,
      });
    }

    return res.status(200).json({
      message: "Unhandled topic",
      topic,
    });

  } catch (error) {
    console.error("Webhook failed:", error);
    return res.status(500).json({
      error: "Webhook failed",
      details: error.message,
    });
  }
}
