// api/webhook.js
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  const bearerToken = '2a60aed971cd20e137ea6052cab3bbd8'; // keep your token

  // Shopify webhook payload -> req.body (we expect a product object from the bulk script)
  const shopifyProduct = req.body && req.body.product ? req.body.product : req.body;

  // Prepare a reduced payload that includes the common IDs DiGiShi expects
  const productId = shopifyProduct && shopifyProduct.id ? shopifyProduct.id : null;
  // pick first variant's sku (if present)
  const firstVariant = (shopifyProduct && shopifyProduct.variants && shopifyProduct.variants[0]) || null;
  const sku = firstVariant && firstVariant.sku ? firstVariant.sku : null;

  // Build the payload DiGiShi can parse — adjust keys if their doc requires different names
  const payload = {
    product_id: productId,      // numeric Shopify product id
    sku: sku,                   // first sku, if any
    shopify_product: shopifyProduct, // include full product as fallback
  };

  console.log('Forwarding product_id=', productId, ' sku=', sku);

  try {
    const digishiRes = await fetch('https://digisyria.com/module/suppliers/productUpdate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${bearerToken}`,
      },
      body: JSON.stringify(payload),
    });

    const text = await digishiRes.text();
    console.log('DiGiShi status', digishiRes.status, 'respSnippet:', text.slice(0,300));
    // return DiGiShi response back to caller for debug (Shopify test)
    return res.status(200).json({ message: 'Forwarded to DiGiShi', status: digishiRes.status, result: text });
  } catch (err) {
    console.error('Forwarding failed', err);
    return res.status(500).json({ error: 'Forwarding failed', details: err.message });
  }
}
