const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

exports.handler = async (event, context) => {
  // CORS headers for all responses
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  // Handle preflight OPTIONS request
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  }

  try {
    // Parse request body
    const {
      amount,
      service_type,
      home_size,
      original_price,
      discounted_price,
      prepayment_amount,
      discount_applied,
      zipcode
    } = JSON.parse(event.body);

    // Validate required fields
    if (!service_type || !home_size || !prepayment_amount || !zipcode) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing required fields' })
      };
    }

    // Create payment intent with Stripe
    const paymentIntent = await stripe.paymentIntents.create({
      amount: prepayment_amount, // Amount in cents (50% of discounted price)
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
        zipcode: zipcode,
        business: 'Bay Area Cleaning Pros',
        payment_type: '50_percent_deposit',
        timestamp: new Date().toISOString()
      },
      description: `50% Deposit: ${service_type} cleaning service - ${home_size} sq ft home (ZIP: ${zipcode})`,
      receipt_email: null, // Will be collected in the payment form
    });

    // Return the client secret to the frontend
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id
      })
    };

  } catch (error) {
    console.error('Payment intent creation failed:', error);
    
    // Return appropriate error message
    const errorMessage = error.type === 'StripeCardError' 
      ? error.message 
      : 'Payment processing failed. Please try again.';

    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({
        error: errorMessage,
        type: error.type || 'unknown_error'
      })
    };
  }
};