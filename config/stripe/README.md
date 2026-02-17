# Stripe Pricing Management for whyismywebsiteslow

This document explains how to manage pricing tiers using the Stripe CLI.

## Prerequisites

1. Install the Stripe CLI: https://stripe.com/docs/stripe-cli
2. Login to your Stripe account: `stripe login`
3. Set your environment to test mode initially: `stripe listen` (to verify webhook endpoints)

## Creating Products and Prices

### 1. Create the main product:

```bash
stripe products create \
  --name "Performance Report Unlock" \
  --description "Unlock a single performance report with detailed fixes" \
  --statement-descriptor "WMWS Report Unlock"
```

### 2. Create the one-time report unlock price:

```bash
stripe prices create \
  --product=prod_XXXXXXXXXXXXXXXX \
  --unit-amount=1900 \
  --currency=usd \
  --nickname="Report Unlock" \
  --recurring[interval]=onetime
```

### 3. Create the Pro monthly subscription:

```bash
stripe prices create \
  --product=prod_XXXXXXXXXXXXXXXX \
  --unit-amount=9900 \
  --currency=usd \
  --recurring[interval]=month \
  --recurring[usage_type]=licensed \
  --nickname="Pro Monthly"
```

### 4. Create the Pro annual subscription:

```bash
stripe prices create \
  --product=prod_XXXXXXXXXXXXXXXX \
  --unit-amount=106920 \
  --currency=usd \
  --recurring[interval]=year \
  --recurring[usage_type]=licensed \
  --nickname="Pro Annual" \
  --lookup-key=pro_annual
```

### 5. Create the Agency plan:

```bash
stripe prices create \
  --product=prod_XXXXXXXXXXXXXXXX \
  --unit-amount=29900 \
  --currency=usd \
  --recurring[interval]=month \
  --recurring[usage_type]=licensed \
  --nickname="Agency Plan"
```

## Updating Existing Prices

To update an existing price (e.g., change the amount):

```bash
stripe prices update price_XXXXXXXXXXXXXXXX \
  --unit-amount=2000 \
  --active=true
```

## Activating/Deactivating Prices

To deactivate a price (customers can't subscribe to it anymore):

```bash
stripe prices update price_XXXXXXXXXXXXXXXX \
  --active=false
```

To reactivate:

```bash
stripe prices update price_XXXXXXXXXXXXXXXX \
  --active=true
```

## Listing Current Products and Prices

```bash
stripe products list
stripe prices list
```

## Environment Configuration

Once you've created your products and prices, update your `.env` file with the new price IDs:

```bash
STRIPE_PRICE_REPORT_UNLOCK=price_XXXXXXXXXXXXXXXX
STRIPE_PRICE_PRO_MONTHLY=price_XXXXXXXXXXXXXXXX
STRIPE_PRICE_PRO_YEARLY=price_XXXXXXXXXXXXXXXX
STRIPE_PRICE_AGENCY_MONTHLY=price_XXXXXXXXXXXXXXXX
```

## Testing Webhooks

To test webhook delivery:

```bash
stripe trigger customer.subscription.created
stripe trigger checkout.session.completed
```

## Best Practices

1. Always test pricing changes in test mode first
2. Use descriptive nicknames for easy identification
3. Document price changes and reasons
4. Monitor subscription churn when changing prices
5. Consider grandfathering existing customers when raising prices