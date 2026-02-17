# Stripe CLI Product and Price Configuration for whyismywebsiteslow

# Products
## Report Unlock (one-time purchase)
# Command to create:
# stripe products create --name "Performance Report Unlock" --description "Unlock a single performance report with detailed fixes"

PRODUCT_REPORT_UNLOCK="prod_XXXXXXXXXXXXXXXX"  # Replace with actual product ID after creation

# Prices
## Single Report Unlock
# Command to create:
# stripe prices create --product=$PRODUCT_REPORT_UNLOCK --unit-amount=1900 --currency=usd --nickname="Report Unlock" --recurring[interval]=onetime

PRICE_REPORT_UNLOCK="price_XXXXXXXXXXXXXXXX"  # Replace with actual price ID after creation

## Pro Monthly Subscription
# Command to create:
# stripe prices create --product=$PRODUCT_REPORT_UNLOCK --unit-amount=9900 --currency=usd --recurring[interval]=month --recurring[usage_type]=licensed --nickname="Pro Monthly"

PRICE_PRO_MONTHLY="price_XXXXXXXXXXXXXXXX"  # Replace with actual price ID after creation

## Pro Annual Subscription (with discount)
# Command to create:
# stripe prices create --product=$PRODUCT_REPORT_UNLOCK --unit-amount=106920 --currency=usd --recurring[interval]=year --recurring[usage_type]=licensed --nickname="Pro Annual" --lookup-key=pro_annual

PRICE_PRO_YEARLY="price_XXXXXXXXXXXXXXXX"  # Replace with actual price ID after creation

## Agency Plan
# Command to create:
# stripe prices create --product=$PRODUCT_REPORT_UNLOCK --unit-amount=29900 --currency=usd --recurring[interval]=month --recurring[usage_type]=licensed --nickname="Agency Plan"

PRICE_AGENCY_MONTHLY="price_XXXXXXXXXXXXXXXX"  # Replace with actual price ID after creation

# Environment Variables to Set
# Add these to your .env file after creating the products/prices:
#
# STRIPE_PRICE_REPORT_UNLOCK=price_XXXXXXXXXXXXXXXX
# STRIPE_PRICE_PRO_MONTHLY=price_XXXXXXXXXXXXXXXX
# STRIPE_PRICE_PRO_YEARLY=price_XXXXXXXXXXXXXXXX
# STRIPE_PRICE_AGENCY_MONTHLY=price_XXXXXXXXXXXXXXXX