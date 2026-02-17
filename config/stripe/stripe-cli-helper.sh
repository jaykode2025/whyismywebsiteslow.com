#!/bin/bash
# Stripe CLI Helper Script for whyismywebsiteslow

# This script provides common Stripe CLI operations for managing products and prices

set -e  # Exit on any error

echo "Stripe CLI Helper for whyismywebsiteslow"
echo "========================================"
echo

# Check if Stripe CLI is installed
if ! command -v stripe &> /dev/null; then
    echo "Error: Stripe CLI is not installed. Please install it from https://stripe.com/docs/stripe-cli"
    exit 1
fi

# Check if logged in to Stripe
if ! stripe config --list | grep -q "account"; then
    echo "Warning: You're not logged in to Stripe CLI. Run 'stripe login' first."
    read -p "Continue anyway? (y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Function to create products and prices
create_products_and_prices() {
    echo "Creating products and prices..."
    echo
    
    # Create main product
    echo "Creating Performance Report product..."
    PRODUCT_ID=$(stripe products create \
        --name="Performance Report Unlock" \
        --description="Unlock a single performance report with detailed fixes" \
        --statement-descriptor="WMWS Report Unlock" \
        --archive-on-delete=false \
        --expand=[])
    
    # Extract product ID from response (this is simplified - you'd need to parse the actual response)
    echo "Product created. Please note the product ID for the next steps."
    echo "$PRODUCT_ID"
    echo
    
    # Create report unlock price ($19 one-time)
    echo "Creating Report Unlock price ($19 one-time)..."
    PRICE_REPORT_UNLOCK=$(stripe prices create \
        --product=prod_REPLACE_WITH_ACTUAL_ID \
        --unit-amount=1900 \
        --currency=usd \
        --nickname="Report Unlock" \
        --recurring[interval]=onetime)
    echo "Report Unlock price created:"
    echo "$PRICE_REPORT_UNLOCK"
    echo
    
    # Create Pro monthly price ($99)
    echo "Creating Pro Monthly price ($99)..."
    PRICE_PRO_MONTHLY=$(stripe prices create \
        --product=prod_REPLACE_WITH_ACTUAL_ID \
        --unit-amount=9900 \
        --currency=usd \
        --recurring[interval]=month \
        --recurring[usage_type]=licensed \
        --nickname="Pro Monthly")
    echo "Pro Monthly price created:"
    echo "$PRICE_PRO_MONTHLY"
    echo
    
    # Create Agency monthly price ($299)
    echo "Creating Agency Monthly price ($299)..."
    PRICE_AGENCY_MONTHLY=$(stripe prices create \
        --product=prod_REPLACE_WITH_ACTUAL_ID \
        --unit-amount=29900 \
        --currency=usd \
        --recurring[interval]=month \
        --recurring[usage_type]=licensed \
        --nickname="Agency Plan")
    echo "Agency Monthly price created:"
    echo "$PRICE_AGENCY_MONTHLY"
    echo
    
    echo "Setup complete! Please update your .env file with the following values:"
    echo "STRIPE_PRICE_REPORT_UNLOCK=price_XXXXXXXXXXXXXXXX"
    echo "STRIPE_PRICE_PRO=price_XXXXXXXXXXXXXXXX" 
    echo "STRIPE_PRICE_AGENCY=price_XXXXXXXXXXXXXXXX"
    echo
}

# Function to list current products and prices
list_products_and_prices() {
    echo "Current Products:"
    stripe products list
    echo
    echo "Current Prices:"
    stripe prices list
    echo
}

# Function to update a price
update_price() {
    read -p "Enter the price ID to update: " PRICE_ID
    read -p "Enter the new amount (in cents, e.g., 1900 for $19.00): " AMOUNT
    
    echo "Updating price $PRICE_ID to $$((AMOUNT/100)).$((AMOUNT%100))..."
    stripe prices update "$PRICE_ID" --unit-amount="$AMOUNT" --active=true
    echo "Price updated!"
    echo
}

# Function to deactivate a price
deactivate_price() {
    read -p "Enter the price ID to deactivate: " PRICE_ID
    
    echo "Deactivating price $PRICE_ID..."
    stripe prices update "$PRICE_ID" --active=false
    echo "Price deactivated!"
    echo
}

# Function to reactivate a price
reactivate_price() {
    read -p "Enter the price ID to reactivate: " PRICE_ID
    
    echo "Reactivating price $PRICE_ID..."
    stripe prices update "$PRICE_ID" --active=true
    echo "Price reactivated!"
    echo
}

# Show menu
while true; do
    echo "Select an option:"
    echo "1) Create products and prices (requires manual product ID update)"
    echo "2) List current products and prices"
    echo "3) Update a price"
    echo "4) Deactivate a price"
    echo "5) Reactivate a price"
    echo "6) Exit"
    echo
    read -p "Enter your choice (1-6): " choice
    echo

    case $choice in
        1) create_products_and_prices ;;
        2) list_products_and_prices ;;
        3) update_price ;;
        4) deactivate_price ;;
        5) reactivate_price ;;
        6) echo "Exiting..."; exit 0 ;;
        *) echo "Invalid choice. Please enter 1-6."; echo ;;
    esac
done