export default async function handler(req, res) {
  console.log('🚀 Webhook received');

  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }

  const bearerToken = '2a60aed971cd20e137ea6052cab3bbd8';

  try {
    const response = await fetch('https://digisyria.com/module/suppliers/productUpdate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${bearerToken}`,
      },
      body: JSON.stringify({ product: req.body }), // ✅ Wrap properly
    });

    const result = await response.json();
    console.log('✅ Forwarded to DiGiShi:', result);

    res.status(200).json({ message: 'Forwarded to DiGiShi', result });
  } catch (err) {
    console.error('❌ Forwarding failed:', err);
    res.status(500).json({ error: 'Forwarding failed' });
  }
}
