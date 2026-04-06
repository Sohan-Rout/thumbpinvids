import { NextResponse } from "next/server";
import crypto from "crypto";

export async function POST(request) {
  try {
    const body = await request.text();
    const signature = request.headers.get("x-razorpay-signature");

    // Verify webhook signature
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!secret) {
      console.warn("RAZORPAY_WEBHOOK_SECRET not set, skipping verification");
    } else {
      const expectedSignature = crypto
        .createHmac("sha256", secret)
        .update(body)
        .digest("hex");

      if (signature !== expectedSignature) {
        return NextResponse.json(
          { error: "Invalid signature" },
          { status: 401 }
        );
      }
    }

    const event = JSON.parse(body);
    const eventType = event.event;

    switch (eventType) {
      case "payment.captured": {
        // Payment successful – add credits to user
        const payment = event.payload.payment.entity;
        const userId = payment.notes?.user_id;
        const credits = parseInt(payment.notes?.credits || "0", 10);

        console.log(`Payment captured: ${payment.id} for user ${userId}, ${credits} credits`);

        // In production: Update user credits in Supabase
        // const supabase = createAdminClient();
        // await supabase.rpc('add_credits', { p_user_id: userId, p_credits: credits });

        break;
      }

      case "subscription.activated": {
        // Pro subscription started
        const subscription = event.payload.subscription.entity;
        const userId = subscription.notes?.user_id;

        console.log(`Subscription activated: ${subscription.id} for user ${userId}`);

        // In production: Update user tier to 'pro' and add 500 credits
        // const supabase = createAdminClient();
        // await supabase.from('users').update({ subscription_tier: 'pro', credits: 500 }).eq('id', userId);

        break;
      }

      case "subscription.cancelled": {
        const subscription = event.payload.subscription.entity;
        const userId = subscription.notes?.user_id;

        console.log(`Subscription cancelled: ${subscription.id} for user ${userId}`);

        // In production: Downgrade user to 'free'
        break;
      }

      default:
        console.log(`Unhandled Razorpay event: ${eventType}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Razorpay webhook error:", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}
