# Facebook App Setup Guide for Apex CRM

## Prerequisites

1. A Facebook Business Manager account.
2. A Meta Developer Account.
3. Admin access to the ERPNext site (must be publicly accessible via https).

## Step 1: Create Meta App

1. Go to [developers.facebook.com](https://developers.facebook.com).
2. Click **My Apps** > **Create App**.
3. Select **Other** > **Business** as the type.
4. Name it "Apex CRM Integration".

## Step 2: Add Products

1. In the App Dashboard, find **Webhooks** and click **Set Up**.
2. Find **Lead Ads** (if focusing on forms) or generic **Webhooks**.

## Step 3: Configure Webhook

1. **Callback URL**: `https://[your-site-url]/api/method/apex_crm.api.facebook_webhook`
2. **Verify Token**: Enter the secret token defined in your `site_config.json` (key: `facebook_verify_token`).
3. Click **Verify and Save**.

## Step 4: Permissions

1. You need `leads_retrieval` permission to read Lead Data.
2. For "In Development" mode, you can test with your own account.
3. For Production, you must submit the App Review to Meta.

## Step 5: Testing

1. Use the [Get Started - Webhooks](https://developers.facebook.com/docs/graph-api/webhooks/getting-started) tool.
2. Send a test `leadgen` payload to your URL.
3. Check `Apex Interaction Log` in ERPNext.
