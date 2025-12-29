export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).send("Method Not Allowed");

const TOKEN = process.env.DIGISHI_TOKEN;

  // Shopify sends product object (either direct or wrapped)
  const shopifyProduct = req.body?.product ? req.body.product : req.body;

  const updateUrl = "https://digisyria.com/module/suppliers/productUpdate";
  const createUrl = "https://digisyria.com/module/suppliers/createNewProduct";

  // Product Update expects { product: {...} } (your earlier working format)
const updatePayload = { token: TOKEN, product: shopifyProduct };
  
  // Create New Product expects { token: "...", product: {...} }
  const createPayload = { token: TOKEN, product: shopifyProduct };

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
    // 1) Try update
    let r1 = await postJson(updateUrl, updatePayload);
    console.log("productUpdate status:", r1.status, r1.text.slice(0, 300));

    // 2) If DiGiShi says product not found (404), create then retry update
    if (r1.status === 404) {
      console.log("Product not found. Creating in DiGiShi:", shopifyProduct?.id);

      const c = await postJson(createUrl, createPayload);
      console.log("createNewProduct status:", c.status, c.text.slice(0, 300));

      // Retry update after create (even if create returns 200/OK)
      const r2 = await postJson(updateUrl, updatePayload);
      console.log("productUpdate retry status:", r2.status, r2.text.slice(0, 300));

      return res.status(200).json({
        message: "Create-if-missing flow executed",
        productId: shopifyProduct?.id,
        firstUpdate: { status: r1.status, body: r1.text },
        create: { status: c.status, body: c.text },
        retryUpdate: { status: r2.status, body: r2.text },
      });
    }

    // Normal success / other errors
    return res.status(200).json({
      message: "Update attempted",
      productId: shopifyProduct?.id,
      update: { status: r1.status, body: r1.text },
    });
  } catch (err) {
    console.error("Webhook failed:", err);
    return res.status(500).json({ error: "Webhook failed", details: err.message });
  }
}
