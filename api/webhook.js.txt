export default async function handler(req, res) {
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
      body: JSON.stringify(req.body),
    });

    const result = await response.json();
    res.status(200).json({ message: 'Forwarded to DiGiShi', result });
  } catch (err) {
    console.error('Forward failed:', err);
    res.status(500).json({ error: 'Forwarding failed' });
  }
}
