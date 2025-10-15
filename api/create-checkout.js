// Backend server to create Helio charges using API keys
import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';

const app = express();

app.use(cors());
app.use(express.json());

// ============================================
// CONFIGURATION - Add your API keys here
// ============================================
const HELIO_CONFIG = {
  // Get these from: https://app.hel.io/ -> Settings -> API
  // These will automatically pull from Vercel environment variables
  publicApiKey: process.env.HELIO_PUBLIC_KEY || 'HELIO_PUBLIC_KEY',
  secretApiKey: process.env.HELIO_SECRET_KEY || 'HELIO_SECRET_KEY',
  
  // Your Helio wallet ID from Settings -> Manage Wallets -> Copy Helio ID
  walletId: process.env.HELIO_WALLET_ID || '68d51417b75b14c25b97d4c8',
  
  // API endpoint (use api.hel.io/v1 for production, api.dev.hel.io/v1 for testing)
  apiEndpoint: process.env.HELIO_API_ENDPOINT || 'https://api.hel.io/v1',
  
  // Currency IDs - Get from: https://docs.hel.io/reference/currencycontroller_getallcurrencies
  // Common ones:
  // USDC (Solana): "6340313846e4f91b8abc519b"
  // SOL: "63d7b5f3e0e0e00d8d0e0e0a"
  pricingCurrencyId: process.env.HELIO_PRICING_CURRENCY_ID || '6340313846e4f91b8abc519b', // USDC
  recipientCurrencyId: process.env.HELIO_RECIPIENT_CURRENCY_ID || '6340313846e4f91b8abc519b' // USDC
};

// ============================================
// Create Charge Endpoint
// ============================================
app.post('/api/create-charge', async (req, res) => {
  try {
    const { amount, currency = 'USD' } = req.body;

    // Validate input
    if (!amount || amount <= 0) {
      return res.status(400).json({ 
        error: 'Invalid amount',
        message: 'Amount must be greater than 0' 
      });
    }

    // Check if API keys are configured
    if (HELIO_CONFIG.publicApiKey === 'HELIO_PUBLIC_KEY') {
      return res.status(500).json({ 
        error: 'Configuration error',
        message: 'Please configure your Helio API keys in the backend code' 
      });
    }

    // Create charge via Helio API
    const chargeData = {
      pricingCurrency: HELIO_CONFIG.pricingCurrencyId,
      pricingAmount: amount,
      recipients: [
        {
          walletId: HELIO_CONFIG.walletId,
          currencyId: HELIO_CONFIG.recipientCurrencyId
        }
      ],
      // Optional: Add metadata
      additionalJSON: {
        customerTimestamp: new Date().toISOString(),
        orderId: `order_${Date.now()}`,
        amount: amount,
        currency: currency
      }
    };

    console.log('Creating charge:', chargeData);

    // Call Helio API
    const response = await fetch(`${HELIO_CONFIG.apiEndpoint}/charge`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': HELIO_CONFIG.publicApiKey,
        'x-secret-key': HELIO_CONFIG.secretApiKey
      },
      body: JSON.stringify(chargeData)
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Helio API error:', errorData);
      return res.status(response.status).json({
        error: 'Failed to create charge',
        message: errorData.message || 'Unknown error from Helio API',
        details: errorData
      });
    }

    const charge = await response.json();
    console.log('Charge created successfully:', charge);

    // Return the charge token to the frontend
    res.json({
      success: true,
      chargeToken: charge.token,
      chargeId: charge.id,
      amount: amount,
      currency: currency
    });

  } catch (error) {
    console.error('Error creating charge:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

// ============================================
// Webhook endpoint to verify payments
// ============================================
app.post('/api/webhook/helio', async (req, res) => {
  try {
    const webhookData = req.body;
    
    console.log('Received webhook:', webhookData);

    // Verify the webhook signature (recommended)
    // const signature = req.headers['x-helio-signature'];
    // if (!verifySignature(webhookData, signature)) {
    //   return res.status(401).json({ error: 'Invalid signature' });
    // }

    // Handle different webhook events
    switch (webhookData.event) {
      case 'PAYMENT_SUCCESS':
        console.log('Payment successful:', webhookData);
        // Update your database, fulfill order, etc.
        break;
      
      case 'PAYMENT_FAILED':
        console.log('Payment failed:', webhookData);
        // Handle failed payment
        break;
      
      case 'PAYMENT_PENDING':
        console.log('Payment pending:', webhookData);
        // Handle pending payment
        break;
      
      default:
        console.log('Unknown event:', webhookData.event);
    }

    // Acknowledge receipt
    res.json({ received: true });

  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

// ============================================
// Health check endpoint
// ============================================
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok',
    configured: HELIO_CONFIG.publicApiKey !== 'HELIO_PUBLIC_KEY'
  });
});

// Serve static files
app.use(express.static('.'));

// ============================================
// Start server
// ============================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Helio API configured: ${HELIO_CONFIG.publicApiKey !== 'HELIO_PUBLIC_KEY'}`);
  
  if (HELIO_CONFIG.publicApiKey === 'HELIO_PUBLIC_KEY') {
    console.log('\n⚠️  WARNING: Please configure your Helio API keys!');
    console.log('   1. Go to https://app.hel.io/ -> Settings -> API');
    console.log('   2. Enable API and copy your keys');
    console.log('   3. Update HELIO_CONFIG in this file\n');
  }
});
