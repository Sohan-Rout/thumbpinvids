import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    const body = await request.json();
    const { amount, credits, user_id } = body;

    // Validate
    if (!amount || !credits || !user_id) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const RAZORPAY_KEY_ID = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
    const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;

    if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
      // Mock order for development
      return NextResponse.json({
        id: `order_mock_${Date.now()}`,
        amount: amount * 100, // Razorpay expects paise
        currency: "INR",
        notes: { user_id, credits: credits.toString() },
      });
    }

    // Create Razorpay order
    const Razorpay = (await import("razorpay")).default;
    const razorpay = new Razorpay({
      key_id: RAZORPAY_KEY_ID,
      key_secret: RAZORPAY_KEY_SECRET,
    });

    const order = await razorpay.orders.create({
      amount: amount * 100, // Amount in paise
      currency: "INR",
      receipt: `credits_${user_id}_${Date.now()}`,
      notes: {
        user_id,
        credits: credits.toString(),
      },
    });

    return NextResponse.json(order);
  } catch (error) {
    console.error("Create order error:", error);
    return NextResponse.json(
      { error: "Failed to create order" },
      { status: 500 }
    );
  }
}
