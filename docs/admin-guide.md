# DAIRI admin guide

This guide describes the current local app. Store prices are in USD. Checkout saves an unpaid order for studio review; it does not collect payment.

## Sign in

Open `/auth/login` and use a DAIRI administrator account. Staff accounts need the `admin` role in Supabase. Customer accounts use `/auth/customer-login` and cannot open the admin workspace.

## Add or update a product

1. Open **Products** and choose **Add Product**, or open an existing product to edit it.
2. Upload up to six product images. Images are optimized and stored in Supabase Storage.
3. Enter the product name, USD base price, one of the client’s product categories, collection, style number, description, and fabric, fit, and care details.
4. Add one variant for each color and size combination. Set a unique SKU and the available stock. Retail price overrides and wholesale prices are optional. If wholesale access will be offered, enter a wholesale price for every variant that retailers may order.
5. Choose **Published** and turn on **Show on Website** to list the product in the storefront. Draft or hidden products remain out of the storefront.
6. Save the product. A variant with zero stock cannot be added to a retail order.

To place an item in the closeout section, add the `closeout` tag. Tags such as `new` and `bestseller` control the corresponding storefront sections.

## Collections and lookbooks

- Create a collection in **Collections**, then choose its name in each product’s Collection field.
- In **Lookbooks**, choose the products and add a title and cover image. Preview the pages, then choose **Download PDF** and save the browser print dialog as a PDF.
- Lookbook format and layout defaults are under **Settings**. Product names, style numbers, prices, the saved brand logo, and configured studio contact email appear in the export. The website appears only after the production domain is configured.

## Wholesale applications

Open **Wholesale Applications** to review a retailer. Approve or reject the application and set its minimum order quantity when approving. Approved customers see wholesale prices after signing in; checkout enforces the configured minimum quantity.

## Orders and customer requests

- **Client Activity** lists unpaid orders, support requests, and newsletter signups.
- Canceling a pending order releases its reserved stock.
- To ship an order, choose a carrier, enter the tracking number, and save. The customer account then shows the tracking link. Order and shipment email delivery requires the studio’s Resend key and a verified sender; otherwise the messages stay queued for retry.
- Customer checkout does not collect payment. Online payment and gift cards are deferred.

## Store settings

- **Brand Identity** controls the name, logo, colors, and typography. Set the studio contact email here; it is used in the store footer and lookbook.
- **Shipping & Tax Rules** configure manual flat USD shipping and tax estimates by country or region. Leave a value blank when the studio needs to confirm it. These rules do not quote carrier rates or calculate tax obligations.
- **Discount Codes** create and deactivate codes. The server validates eligibility and redemption limits when an unpaid order is saved.
- **Import Products** accepts a basic CSV with Name and Price columns plus optional Category, Collection, Description, Tags, Image URL, and Status. Imported rows need variants, SKUs, and stock added in the product editor before customers can order them.

## Still needed before customer launch

DAIRI must supply and approve product content, actual shipping and tax rules, returns and legal policies, the contact email and any public address or phone, and the production domain. Carrier-rate quotes, domain transfer, Search Console verification, backup policy, and support arrangements depend on the relevant client accounts and hosting configuration. These are not created by the local admin app.
