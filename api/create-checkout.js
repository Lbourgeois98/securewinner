// api/create-checkout.js
import fetch from "node-fetch"; // Node 18+ has fetch built-in

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { amount } = req.body;
  if (!amount || amount <= 0) {
    return res.status(400).json({ error: "Invalid amount" });
  }

  const HELIO_SECRET_KEY = process.env.HELIO_SECRET_KEY; // stored in Vercel

  try {
    const response = await fetch("https://api.hel.io/v1/payments", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${HELIO_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: amount,
        currency: "USD",
        payment_methods: ["card"], // card-only
      }),
    });

    const data = await response.json();

    if (data.checkout_url) {
      res.status(200).json({ checkoutUrl: data.checkout_url });
    } else {
      res.status(500).json({ error: "Failed to create checkout" });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
}
