// api/create-checkout.js

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { amount } = req.body;

  if (!amount || amount <= 0) {
    return res.status(400).json({ error: "Invalid amount" });
  }

  const HELIO_SECRET_KEY = process.env.HELIO_SECRET_KEY;
  const PAYLINK_ID = "68ef6f7d89c8017dde33644f"; // your Helio paylink ID

  try {
    const response = await fetch(
      `https://api.hel.io/v1/paylinks/${PAYLINK_ID}/checkout`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${HELIO_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount,
          currency: "USD",
          paymentMethod: "card",
        }),
      }
    );

    const data = await response.json();

    if (response.ok && data.url) {
      res.status(200).json({ checkoutUrl: data.url });
    } else {
      console.error("Helio response:", data);
      res.status(500).json({ error: "Failed to create checkout" });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
}
