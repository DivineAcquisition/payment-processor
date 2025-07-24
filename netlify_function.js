import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  // Enable CORS for Framer
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      amount,
      service_type,
      home_size,
      original_price,
      discounted_price,
      prepayment_amount,
      discount_applied,
      zipcode,
      customer_email
    } = req.body;

    // Validate required fields
    if (!prepayment_amount || !service_type || !home_size) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(prepayment_amount * 100), // Convert to cents
      currency: 'usd',
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: {
        service_type: service_type,
        home_size: home_size.toString(),
        original_price: original_price ? original_price.toString() : '0',
        discounted_price: discounted_price ? discounted_price.toString() : '0',
        prepayment_amount: prepayment_amount.toString(),
        remaining_balance: discounted_price ? (discounted_price - prepayment_amount).toString() : '0',
        discount_applied: discount_applied ? discount_applied.toString() : '0',
        zipcode: zipcode || '',
        business: 'Bay Area Cleaning Pros',
        payment_type: '50_percent_deposit',
        timestamp: new Date().toISOString()
      },
      description: `50% Deposit: ${service_type} cleaning - ${home_size} sq ft home`,
      receipt_email: customer_email || null,
    });

    return res.status(200).json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id
    });

  } catch (error) {
    console.error('Stripe error:', error);
    return res.status(400).json({
      error: error.message || 'Payment processing failed'
    });
  }
}
