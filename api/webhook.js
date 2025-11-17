// api/webhook.js
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  const bearerToken = '2a60aed971cd20e137ea6052cab3bbd8';

  // Shopify sends full product object -> req.body
  const shopifyProduct = req.body;

  // We MUST wrap EXACTLY like DiGiShi documentation:
  const payload = {
    product: shopifyProduct
  };

  console.log('Forwarding product ID:', shopifyProduct?.id);

  try {
    const digishiRes = await fetch('https://digisyria.com/module/suppliers/productUpdate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${bearerToken}`,
      },
      body: JSON.stringify(payload),
    });

    const snippet = await digishiRes.text();
    console.log('DiGiShi status', digishiRes.status, snippet.slice(0, 300));

    return res.status(200).json({ forwarded: true, digishiStatus: digishiRes.status, snippet });
  } catch (err) {
    console.error('Forwarding failed:', err);
    return res.status(500).json({ error: 'Forwarding failed' });
  }
}
