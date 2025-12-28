import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Globe, BookOpen, ChevronRight, Search, Zap, DollarSign, FileText, Settings, ShieldCheck, PieChart, Users, Package } from 'lucide-react';
import Card from './Card';
import { useAppContext } from '../context/AppContext';

// Helper to convert hex to rgba
const hexToRgba = (hex: string, alpha: number) => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface HelpSection {
  id: string;
  title: string;
  content: React.ReactNode;
}

// --- HELP CONTENT DATABASE (English & Telugu) ---
const helpContent: Record<string, HelpSection[]> = {
  en: [
    {
      id: 'toc',
      title: '📚 Table of Contents',
      content: (
        <div className="space-y-4">
          <p>Quickly jump to any section:</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
            <button onClick={() => document.getElementById('sec-ui')?.scrollIntoView({ behavior: 'smooth' })} className="text-blue-600 dark:text-blue-400 hover:underline text-left">🎨 UI Customization & Themes</button>
            <button onClick={() => document.getElementById('sec-sales')?.scrollIntoView({ behavior: 'smooth' })} className="text-blue-600 dark:text-blue-400 hover:underline text-left">💰 Sales & Billing</button>
            <button onClick={() => document.getElementById('sec-purchases')?.scrollIntoView({ behavior: 'smooth' })} className="text-blue-600 dark:text-blue-400 hover:underline text-left">🚚 Purchases & Expenses</button>
            <button onClick={() => document.getElementById('sec-inventory')?.scrollIntoView({ behavior: 'smooth' })} className="text-blue-600 dark:text-blue-400 hover:underline text-left">📦 Inventory & Stock</button>
            <button onClick={() => document.getElementById('sec-customers')?.scrollIntoView({ behavior: 'smooth' })} className="text-blue-600 dark:text-blue-400 hover:underline text-left">👥 Customers & Credit</button>
            <button onClick={() => document.getElementById('sec-reports')?.scrollIntoView({ behavior: 'smooth' })} className="text-blue-600 dark:text-blue-400 hover:underline text-left">📊 Reports & Analytics</button>
            <button onClick={() => document.getElementById('sec-admin')?.scrollIntoView({ behavior: 'smooth' })} className="text-blue-600 dark:text-blue-400 hover:underline text-left">⚙️ Admin & Settings</button>
            <button onClick={() => document.getElementById('sec-backup')?.scrollIntoView({ behavior: 'smooth' })} className="text-blue-600 dark:text-blue-400 hover:underline text-left">☁️ Backup & Restore</button>
          </div>
        </div>
      )
    },
    {
      id: 'sec-ui',
      title: '🎨 UI Customization & Themes',
      content: (
        <div className="space-y-6">
          <p>Personalize your Business Manager experience. Follow these steps to change colors, fonts, and layouts.</p>

          <div className="pl-4 border-l-2 border-blue-200 dark:border-blue-900 space-y-6">
            <div>
              <h4 className="font-bold text-indigo-600 dark:text-indigo-400">1. Changing the Theme (Dark/Light Mode)</h4>
              <p className="text-sm mb-2">Switch between Day and Night modes for better visibility.</p>
              <ol className="list-decimal pl-5 space-y-1 text-sm text-gray-700 dark:text-gray-300">
                <li>Tap the <strong>Menu Button</strong> (top-left corner, 3 lines).</li>
                <li>Scroll down to the "Theme & Style" section.</li>
                <li>Find the <strong>Mode</strong> toggle buttons.</li>
                <li>Click the <strong>Sun Icon ☀️</strong> for Light Mode (White background).</li>
                <li>Click the <strong>Moon Icon 🌙</strong> for Dark Mode (Black background, saves battery).</li>
              </ol>
            </div>

            <div>
              <h4 className="font-bold text-indigo-600 dark:text-indigo-400">2. Changing App Colors</h4>
              <p className="text-sm mb-2">Change the color of buttons, headers, and highlights.</p>
              <ol className="list-decimal pl-5 space-y-1 text-sm text-gray-700 dark:text-gray-300">
                <li>Open the <strong>Menu</strong>.</li>
                <li>Under "Theme & Style", look for the row of colored circles.</li>
                <li>Tap any circle to apply that color instanty:
                  <ul className="list-disc pl-5 mt-1">
                    <li><strong>Blue/Indigo:</strong> Professional and clean.</li>
                    <li><strong>Teal/Green:</strong> Calming and fresh.</li>
                    <li><strong>Orange/Red:</strong> Energetic and bold.</li>
                  </ul>
                </li>
                <li><strong>Gradients:</strong> Swipe left on the "Gradients" list below the colors. Tap one (e.g., "Sunset", "Nebula") to give the app a modern, colorful look.</li>
              </ol>
            </div>

            <div>
              <h4 className="font-bold text-indigo-600 dark:text-indigo-400">3. Dashboard Header Customization</h4>
              <p className="text-sm mb-2">Customize the top banner greeting and logo.</p>
              <ol className="list-decimal pl-5 space-y-1 text-sm text-gray-700 dark:text-gray-300">
                <li>Go to <strong>Menu &rarr; UI Preferences</strong> (Settings icon).</li>
                <li>Scroll to the "Dashboard Header" section.</li>
                <li><strong>Greeting Text:</strong>
                  <ul className="list-disc pl-5 mt-1">
                    <li>Toggle "Show Greeting" ON/OFF.</li>
                    <li>Click the <strong>Edit Icon (Pencil)</strong> next to the text.</li>
                    <li>Type your own message (e.g., "Welcome to My Shop", "Om Namo Venkatesaya").</li>
                    <li>Click the <strong>Check Icon</strong> to save.</li>
                  </ul>
                </li>
                <li><strong>Logo Settings:</strong>
                  <ul className="list-disc pl-5 mt-1">
                    <li>Toggle "Show Logo" ON/OFF.</li>
                    <li><strong>Type:</strong> Choose "Profile" (uses your main business logo) or "Custom" (upload a specific image just for the dashboard).</li>
                    <li><strong>Size Sliders:</strong> Drag the "Mobile Size" or "Desktop Size" sliders left/right to make the logo bigger or smaller.</li>
                  </ul>
                </li>
              </ol>
            </div>

            <div>
              <h4 className="font-bold text-indigo-600 dark:text-indigo-400">4. Font & Text Settings</h4>
              <p className="text-sm mb-2">Make text easier to read.</p>
              <ol className="list-decimal pl-5 space-y-1 text-sm text-gray-700 dark:text-gray-300">
                <li>Navigate to <strong>Menu &rarr; UI Preferences</strong>.</li>
                <li><strong>Font Family:</strong> Tap on font names like "Inter", "Roboto", or "Playfair" to see which one you like.</li>
                <li><strong>Google Fonts:</strong> Want a specific font? Type its name (e.g., "Poppins", "Open Sans") in the box and click "Load".</li>
                <li><strong>Text Scale:</strong> Drag the slider to increase/decrease the font size across the ENTIRE application. Great for accessibility.</li>
              </ol>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'sec-sales',
      title: '💰 Sales & Billing',
      content: (
        <div className="space-y-6">
          <p>The core feature of your business. Learn how to create invoices, manage carts, and handle payments efficiently.</p>

          <div className="pl-4 border-l-2 border-green-200 dark:border-green-900 space-y-6">
            <div>
              <h4 className="font-bold text-indigo-600 dark:text-indigo-400">1. Start a New Sale</h4>
              <ol className="list-decimal pl-5 space-y-1 text-sm text-gray-700 dark:text-gray-300">
                <li>On the <strong>Dashboard</strong>, click the large blue <strong>+ New Sale</strong> button.</li>
                <li>You will be taken to the <strong>Cart Page</strong>.</li>
                <li><strong>Select Customer (Optional):</strong>
                  <ul className="list-disc pl-5 mt-1">
                    <li>Click "Select Customer" at the top.</li>
                    <li><strong>Search:</strong> Type name or phone number.</li>
                    <li><strong>Select:</strong> Click on a customer from the list.</li>
                    <li><strong>New:</strong> If they are not in the list, click the <strong>+</strong> icon, enter their Name/Phone, and click Save.</li>
                  </ul>
                </li>
              </ol>
            </div>

            <div>
              <h4 className="font-bold text-indigo-600 dark:text-indigo-400">2. Adding Items to Cart</h4>
              <p className="text-sm mb-2">There are 3 ways to add items:</p>
              <ul className="list-disc pl-5 space-y-2 text-sm text-gray-700 dark:text-gray-300">
                <li><strong>Barcode Scan (Fastest):</strong>
                  <br />Click the <strong>Barcode Icon</strong> next to the search bar. Point your camera at the product. It will be added automatically.
                </li>
                <li><strong>Search & Select:</strong>
                  <br />Type the product name (e.g., "Rice", "Soap") in the search box. Click the item in the dropdown list.
                </li>
                <li><strong>Manual Entry:</strong>
                  <br />If an item is not saved in your inventory, simply type its <strong>Name</strong> and <strong>Price</strong> in the boxes and click "Add".
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-indigo-600 dark:text-indigo-400">3. Checkout & Payment Modes</h4>
              <ol className="list-decimal pl-5 space-y-1 text-sm text-gray-700 dark:text-gray-300">
                <li>Review the items in the cart. You can increase quantities (+) or remove items (Trash icon).</li>
                <li>Click the green <strong>Checkout</strong> button at the bottom.</li>
                <li>You will see the <strong>Payment Modal</strong> with the Total Amount.</li>
                <li><strong>Choose Payment Method:</strong>
                  <ul className="list-disc pl-5 mt-1">
                    <li><strong>Cash:</strong> Customer paid physical cash.</li>
                    <li><strong>Online / UPI:</strong> Customer paid via GPay, PhonePe, Paytm, etc.</li>
                    <li><strong>Credit / Due (Udhaar):</strong> Customer is not paying now. This amount will be added to their <strong>Due Balance</strong>.</li>
                    <li><strong>Split Payment:</strong> Click "Split". Enter how much they paid in Cash vs Online vs Due.</li>
                  </ul>
                </li>
                <li>Click <strong>Complete Sale</strong> to finish. A beautiful invoice will be generated.</li>
              </ol>
            </div>

            <div>
              <h4 className="font-bold text-indigo-600 dark:text-indigo-400">4. Sharing Invoices</h4>
              <p className="text-sm mb-2">After completing a sale:</p>
              <ul className="list-disc pl-5 space-y-1 text-sm text-gray-700 dark:text-gray-300">
                <li><strong>Print Thermal:</strong> Connect a Bluetooth Thermal Printer to print a receipt.</li>
                <li><strong>Download PDF:</strong> Save an A4 size PDF bill.</li>
                <li><strong>Share on WhatsApp:</strong> Click the WhatsApp icon to send the bill directly to the customer's phone number.</li>
              </ul>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'sec-purchases',
      title: '🚚 Purchases & Expenses',
      content: (
        <div className="space-y-6">
          <p>Track what you buy from suppliers to keep your stock simpler and manage your expenses.</p>

          <div className="pl-4 border-l-2 border-purple-200 dark:border-purple-900 space-y-6">
            <div>
              <h4 className="font-bold text-indigo-600 dark:text-indigo-400">1. Adding a Supplier</h4>
              <ol className="list-decimal pl-5 space-y-1 text-sm text-gray-700 dark:text-gray-300">
                <li>Go to the <strong>Purchases</strong> page (Truck icon).</li>
                <li>Click the <strong>Suppliers</strong> tab at the top.</li>
                <li>Click the blue <strong>+ Add Supplier</strong> button.</li>
                <li>Enter their <strong>Name</strong> (e.g., "Raja Distributors") and <strong>Phone Number</strong>.</li>
                <li>Click <strong>Add Supplier</strong>.</li>
              </ol>
            </div>

            <div>
              <h4 className="font-bold text-indigo-600 dark:text-indigo-400">2. Creating a Purchase Bill</h4>
              <p className="text-sm mb-2">When stock arrives at your shop:</p>
              <ol className="list-decimal pl-5 space-y-1 text-sm text-gray-700 dark:text-gray-300">
                <li>On the Purchases page, click <strong>+ Create Purchase</strong>.</li>
                <li><strong>Select Supplier:</strong> Choose who sent the goods.</li>
                <li><strong>Add Items:</strong>
                  <ul className="list-disc pl-5 mt-1">
                    <li>Select the Product (e.g., "Sugar").</li>
                    <li>Enter <strong>Quantity</strong> (e.g., 50 kg).</li>
                    <li>Enter <strong>Purchase Price</strong> (Rate per unit).</li>
                    <li>Click <strong>Add Item</strong>. Repeat for all items in the bill.</li>
                  </ul>
                </li>
                <li><strong>Payment:</strong> Enter how much you paid the supplier now. If you didn't pay anything, leave it as 0 (it becomes "Supplier Due").</li>
                <li><strong>Next Due Date:</strong> Select a date when you promised to pay the balance.</li>
                <li>Click <strong>Save Purchase</strong>.</li>
              </ol>
            </div>

            <div>
              <h4 className="font-bold text-indigo-600 dark:text-indigo-400">3. Automatic Stock Updates</h4>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                <strong>Important:</strong> When you save a Purchase Bill, the quantities you entered are <strong>automatically added</strong> to your Inventory. You do NOT need to update stock manually.
              </p>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'sec-inventory',
      title: '📦 Inventory & Stock Management',
      content: (
        <div className="space-y-6">
          <p>Keep track of every item in your shop. Set prices, manage stock levels, and print barcodes.</p>

          <div className="pl-4 border-l-2 border-amber-200 dark:border-amber-900 space-y-6">
            <div>
              <h4 className="font-bold text-indigo-600 dark:text-indigo-400">1. Adding a New Product</h4>
              <ol className="list-decimal pl-5 space-y-1 text-sm text-gray-700 dark:text-gray-300">
                <li>Go to the <strong>Products</strong> page (Box icon).</li>
                <li>Click the blue <strong>+ Add Product</strong> button.</li>
                <li><strong>Enter Details:</strong>
                  <ul className="list-disc pl-5 mt-1">
                    <li><strong>Product Name:</strong> e.g., "Basmati Rice 1kg".</li>
                    <li><strong>Sell Price (MRP):</strong> The price for customers (e.g., ₹120).</li>
                    <li><strong>Purchase Price:</strong> The price you bought it for (e.g., ₹100). This is used to calculate your Profit.</li>
                    <li><strong>Current Stock:</strong> How many do you have right now?</li>
                  </ul>
                </li>
                <li><strong>Low Stock Alert Level:</strong> Enter a number (e.g., 5). When stock falls below 5, the app will show a red warning.</li>
                <li>Click <strong>Save Product</strong>.</li>
              </ol>
            </div>

            <div>
              <h4 className="font-bold text-indigo-600 dark:text-indigo-400">2. Printing Barcodes</h4>
              <p className="text-sm mb-2">Create professional price stickers for your shelf.</p>
              <ol className="list-decimal pl-5 space-y-1 text-sm text-gray-700 dark:text-gray-300">
                <li>On the Products page, find the item you want.</li>
                <li>Click the small <strong>Barcode Icon</strong> next to the product name.</li>
                <li><strong>Barcode Settings Modal:</strong>
                  <ul className="list-disc pl-5 mt-1">
                    <li><strong>Number of Stickers:</strong> Choose how many labels to print.</li>
                    <li><strong>Paper Size:</strong> Select "A4 Sheet" (standard sticker paper with 24/65 labels) or "Thermal" (if you have a label printer).</li>
                  </ul>
                </li>
                <li>Click <strong>Print</strong>. A PDF will be generated.</li>
              </ol>
            </div>

            <div>
              <h4 className="font-bold text-indigo-600 dark:text-indigo-400">3. Bulk Actions</h4>
              <ul className="list-disc pl-5 space-y-1 text-sm text-gray-700 dark:text-gray-300">
                <li><strong>Editing:</strong> Click the Pencil icon on any row to change price or name.</li>
                <li><strong>Deleting:</strong> Click the Trash icon to remove a product. (Note: Only Admins can delete).</li>
                <li><strong>Search:</strong> Use the search bar to find products quickly by name.</li>
              </ul>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'sec-reports',
      title: '📊 Reports & Analytics',
      content: (
        <div className="space-y-6">
          <p>Master your business data with our comprehensive reporting suite. You can switch between <strong>Standard Mode</strong> (Lists & Tables) and <strong>Enterprise Mode</strong> (Charts & Graphs).</p>

          <div className="pl-4 border-l-2 border-orange-200 dark:border-orange-900 space-y-6">

            {/* Standard Reports */}
            <div>
              <h4 className="font-bold text-lg text-indigo-700 dark:text-indigo-400 mb-2">A. Standard Reports (Tabs)</h4>

              <div className="space-y-4">
                <div className="bg-gray-50 dark:bg-slate-800 p-3 rounded-lg">
                  <h5 className="font-bold text-gray-800 dark:text-gray-200">1. Customer Reports (Dues & Summary)</h5>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Track who owes you money and their purchase history.</p>
                  <ul className="list-disc pl-5 text-sm space-y-1">
                    <li><strong>Customer Dues:</strong> Shows total pending amount per customer.</li>
                    <li><strong>Filters:</strong> Use the "Filter by Area" or "Dues Age" (e.g., &gt; 30 days) to find bad debts.</li>
                    <li><strong>Account Summary:</strong> Shows Total Billed vs Total Paid for every customer.</li>
                    <li><strong>Action:</strong> Click <span className="text-blue-600">Download PDF</span> to send to collection agents or share on WhatsApp.</li>
                  </ul>
                </div>

                <div className="bg-gray-50 dark:bg-slate-800 p-3 rounded-lg">
                  <h5 className="font-bold text-gray-800 dark:text-gray-200">2. Supplier Reports (Payables)</h5>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Manage what you owe to your distributors.</p>
                  <ul className="list-disc pl-5 text-sm space-y-1">
                    <li><strong>Supplier Dues:</strong> Tracks unpaid purchase bills and their Due Dates.</li>
                    <li><strong>Next Due Date:</strong> Helps you plan your cash flow by showing when payments are due.</li>
                    <li><strong>Export:</strong> Download generic reports to reconcile with your supplier's ledger.</li>
                  </ul>
                </div>

                <div className="bg-gray-50 dark:bg-slate-800 p-3 rounded-lg">
                  <h5 className="font-bold text-gray-800 dark:text-gray-200">3. Inventory Reports (Low Stock)</h5>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Never run out of items.</p>
                  <ul className="list-disc pl-5 text-sm space-y-1">
                    <li><strong>Low Stock Reorder:</strong> Automatically lists items with Quantity less than 5.</li>
                    <li><strong>Fast Reorder:</strong> Use this list to place orders with your suppliers immediately.</li>
                    <li><strong>Stock Valuation:</strong> (Available in Enterprise) Shows total value of goods sitting in your shop.</li>
                  </ul>
                </div>

                <div className="bg-gray-50 dark:bg-slate-800 p-3 rounded-lg">
                  <h5 className="font-bold text-gray-800 dark:text-gray-200">4. Tax / GST Reports</h5>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Simplified monthly filing.</p>
                  <ol className="list-decimal pl-5 text-sm space-y-1">
                    <li>Go to the <strong>Tax / GST</strong> tab.</li>
                    <li><strong>Select Month:</strong> Choose the month you are filing for (e.g., September 2024).</li>
                    <li><strong>B2B Report:</strong> Downloads CSV of sales to customers with GSTIN (for GSTR-1).</li>
                    <li><strong>Sales Register:</strong> Complete list of all transactions for your auditor.</li>
                  </ol>
                </div>
              </div>
            </div>

            {/* Enterprise Reports */}
            <div>
              <h4 className="font-bold text-lg text-purple-700 dark:text-purple-400 mb-2">B. Enterprise Reporting (Visuals)</h4>
              <p className="mb-2 text-sm">Click the <strong>Try Enterprise Reporting</strong> button (top right) to switch modes.</p>

              <ul className="list-disc pl-5 text-sm space-y-2">
                <li><strong>Sales Trends:</strong> Line charts showing your daily revenue. Spot your busy days instantly.</li>
                <li><strong>Category Performance:</strong> Pie charts showing which product categories (e.g., "Electronics" vs "Accessories") bring in the most money.</li>
                <li><strong>Custom Builder:</strong> Create your own view! Select "Table" or "Chart", choose the data source (Sales/Inventory), and pick columns to analyze.</li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-green-600 dark:text-green-400">💡 Pro Tip: Google Sheets Export</h4>
              <p className="text-sm mt-1">
                All reports have a green <strong>Sheets</strong> button. Click it to export the live data directly to your private Google Sheet for advanced calculations or sharing with partners.
              </p>
            </div>

          </div>
        </div>
      )
    },
    {
      id: 'sec-customers',
      title: '👥 Customers & Credit',
      content: (
        <div className="space-y-6">
          <p>Manage your loyal customers and keep track of their pending payments (Credit).</p>

          <div className="pl-4 border-l-2 border-pink-200 dark:border-pink-900 space-y-6">
            <div>
              <h4 className="font-bold text-indigo-600 dark:text-indigo-400">1. Adding a New Customer</h4>
              <ol className="list-decimal pl-5 space-y-1 text-sm text-gray-700 dark:text-gray-300">
                <li>Go to the <strong>Customers</strong> page (Users icon).</li>
                <li>Click the <strong>+</strong> button (bottom right or top).</li>
                <li>Enter their <strong>Name</strong> and <strong>Phone Number</strong>.</li>
                <li>(Optional) Enter their <strong>GSTIN</strong> if they are a business customer (B2B).</li>
                <li>Click <strong>Save</strong>.</li>
              </ol>
            </div>

            <div>
              <h4 className="font-bold text-indigo-600 dark:text-indigo-400">2. Viewing Customer History</h4>
              <p className="text-sm mb-2">See what a customer bought previously.</p>
              <ol className="list-decimal pl-5 space-y-1 text-sm text-gray-700 dark:text-gray-300">
                <li>Click on any Customer's name in the list.</li>
                <li>You will see their Profile Modal.</li>
                <li>The <strong>History</strong> tab shows every bill they made.</li>
                <li>You can click on a past bill to reprint it or see details.</li>
              </ol>
            </div>

            <div>
              <h4 className="font-bold text-indigo-600 dark:text-indigo-400">3. Managing Credit (Dues)</h4>
              <p className="text-sm mb-2">How to collect pending payments:</p>
              <ol className="list-decimal pl-5 space-y-1 text-sm text-gray-700 dark:text-gray-300">
                <li>When a customer comes to pay their old due, open their Profile.</li>
                <li>You will see their <strong>Total Due</strong> amount in red.</li>
                <li>Click the <strong>Settle Due</strong> button.</li>
                <li>Enter the amount they are paying now.</li>
                <li>Click <strong>Confirm Payment</strong>. The Due Balance will decrease immediately.</li>
              </ol>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'sec-admin',
      title: '⚙️ Admin & Settings',
      content: (
        <div className="space-y-6">

          <div className="pl-4 border-l-2 border-red-200 dark:border-red-900 space-y-6">
            <div>
              <h4 className="font-bold text-indigo-600 dark:text-indigo-400">1. Staff Mode (Protection)</h4>
              <p className="text-sm mb-2">Prevent your staff from deleting bills or seeing your total profits.</p>
              <ol className="list-decimal pl-5 space-y-1 text-sm text-gray-700 dark:text-gray-300">
                <li>Open the <strong>Menu</strong> tab.</li>
                <li>Click on <strong>Staff Mode</strong> (Shield Icon).</li>
                <li><strong>Set a PIN:</strong> Creating a 4-digit secret PIN (e.g., 1234).</li>
                <li><strong>Enable:</strong> Toggle "Enable Staff Mode" ON.</li>
                <li><strong>Result:</strong> Now, the "Delete" buttons will disappear. The "Reports" page will be locked.</li>
                <li>To disable, go back to Menu and enter your PIN.</li>
              </ol>
            </div>

            <div>
              <h4 className="font-bold text-indigo-600 dark:text-indigo-400">2. Recycle Bin</h4>
              <p className="text-sm mb-2">Did you accidentally delete a bill?</p>
              <ol className="list-decimal pl-5 space-y-1 text-sm text-gray-700 dark:text-gray-300">
                <li>Go to <strong>Menu &rarr; Recycling Bin</strong>.</li>
                <li>Here you will see all deleted Invoices and Products.</li>
                <li>Click <strong>Restore</strong> to bring them back.</li>
                <li>Click <strong>Delete Forever</strong> to remove them permanently (cannot be undone).</li>
              </ol>
            </div>

            <div>
              <h4 className="font-bold text-indigo-600 dark:text-indigo-400">3. System Optimizer</h4>
              <p className="text-sm mb-2">If the app feels slow:</p>
              <ul className="list-disc pl-5 space-y-1 text-sm text-gray-700 dark:text-gray-300">
                <li>Go to <strong>Menu &rarr; System Optimizer</strong>.</li>
                <li>Click <strong>Analyze</strong> to find junk data.</li>
                <li>Click <strong>Clean Up</strong> to make the app faster.</li>
              </ul>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'sec-backup',
      title: '☁️ Backup & Data Safety',
      content: (
        <div className="space-y-6">
          <div className="bg-red-50 dark:bg-red-900/10 p-4 rounded-lg border border-red-200 dark:border-red-800">
            <h4 className="font-bold text-red-600 dark:text-red-400 flex items-center gap-2">⚠️ IMPORTANT WARNING</h4>
            <p className="text-sm mt-1 text-red-700 dark:text-red-300">
              This app works <strong>OFFLINE</strong>. Your data is stored <strong>only on this device</strong>.
              <br />If you lose your phone or clear browser history, <strong>YOU WILL LOSE ALL DATA</strong>.
            </p>
          </div>

          <div>
            <h4 className="font-bold text-indigo-600 dark:text-indigo-400">Solution: Google Drive Sync</h4>
            <p className="text-sm mb-2">Secure your data in the cloud.</p>
            <ol className="list-decimal pl-5 space-y-1 text-sm text-gray-700 dark:text-gray-300">
              <li>Open <strong>Menu</strong>.</li>
              <li>Click the <strong>Sign In with Google</strong> button.</li>
              <li>Select your Google Account.</li>
              <li><strong>That's it!</strong> The app will now automatically backup your data to your private Google Drive every time you make a change.</li>
              <li><strong>Restoring:</strong> If you buy a new phone, simply open this app and Sign In with the SAME Google account. All your data will reappear instantly!</li>
            </ol>
          </div>

          <div>
            <h4 className="font-bold text-indigo-600 dark:text-indigo-400">Manual Backup (JSON)</h4>
            <p className="text-sm mb-2">For extra safety without Google:</p>
            <ol className="list-decimal pl-5 space-y-1 text-sm text-gray-700 dark:text-gray-300">
              <li>Go to <strong>Menu &rarr; Settings</strong>.</li>
              <li>Click <strong>Export Data / Backup</strong>.</li>
              <li>A file (backup.json) will download to your phone. Save this file safely (email it to yourself).</li>
              <li>To restore, use the <strong>Import Data</strong> button and select this file.</li>
            </ol>
          </div>
        </div>
      )
    }
  ],
  te: [
    {
      id: 'toc',
      title: '📚 విషయ సూచిక (Table of Contents)',
      content: (
        <div className="space-y-4">
          <p>మీకు కావలసిన సెక్షన్ కు వెళ్ళండి:</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
            <button onClick={() => document.getElementById('sec-ui')?.scrollIntoView({ behavior: 'smooth' })} className="text-blue-600 dark:text-blue-400 hover:underline text-left">🎨 యాప్ డిజైన్ మార్చుట (Customize)</button>
            <button onClick={() => document.getElementById('sec-sales')?.scrollIntoView({ behavior: 'smooth' })} className="text-blue-600 dark:text-blue-400 hover:underline text-left">💰 బిల్లింగ్ మరియు అమ్మకాలు (Sales)</button>
            <button onClick={() => document.getElementById('sec-purchases')?.scrollIntoView({ behavior: 'smooth' })} className="text-blue-600 dark:text-blue-400 hover:underline text-left">🚚 సరుకు కొనుగోలు (Purchases)</button>
            <button onClick={() => document.getElementById('sec-inventory')?.scrollIntoView({ behavior: 'smooth' })} className="text-blue-600 dark:text-blue-400 hover:underline text-left">📦 స్టాక్ మరియు బార్‌కోడ్ (Inventory)</button>
            <button onClick={() => document.getElementById('sec-customers')?.scrollIntoView({ behavior: 'smooth' })} className="text-blue-600 dark:text-blue-400 hover:underline text-left">👥 కస్టమర్లు మరియు బాకీలు (Customers & Credit)</button>
            <button onClick={() => document.getElementById('sec-reports')?.scrollIntoView({ behavior: 'smooth' })} className="text-blue-600 dark:text-blue-400 hover:underline text-left">📊 లెక్కలు మరియు రిపోర్ట్స్</button>
            <button onClick={() => document.getElementById('sec-admin')?.scrollIntoView({ behavior: 'smooth' })} className="text-blue-600 dark:text-blue-400 hover:underline text-left">⚙️ అడ్మిన్ సెట్టింగ్స్</button>
            <button onClick={() => document.getElementById('sec-backup')?.scrollIntoView({ behavior: 'smooth' })} className="text-blue-600 dark:text-blue-400 hover:underline text-left">☁️ బ్యాకప్ (ముఖ్యమైనది)</button>
          </div>
        </div>
      )
    },
    {
      id: 'sec-ui',
      title: '🎨 యాప్ డిజైన్ మార్చుట (UI Customization)',
      content: (
        <div className="space-y-4">
          <p><strong>Menu</strong> లో ఉన్న సెట్టింగ్స్ ద్వారా యాప్ ని మీకు నచ్చినట్లు మార్చుకోవచ్చు.</p>

          <div className="pl-4 border-l-2 border-blue-200 dark:border-blue-900 space-y-4">
            <div>
              <h4 className="font-bold text-indigo-600 dark:text-indigo-400">1. కలర్స్ మరియు డార్క్ మోడ్</h4>
              <ol className="list-decimal pl-5 space-y-1 mt-1">
                <li>పైన ఎడమ వైపున ఉన్న <strong>Menu</strong> ఓపెన్ చేయండి.</li>
                <li>"Theme & Style" కి వెళ్ళండి.</li>
                <li><strong>Dark Mode:</strong> 'Sun'(ఎండ) లేదా 'Moon'(చంద్రుడు) బొమ్మ నొక్కితే డార్క్ మోడ్ వస్తుంది. రాత్రి పూట కళ్ళకు మంచిది.</li>
                <li><strong>Colors:</strong> అక్కడ ఉన్న రంగు రంగుల సర్కిల్స్ (Teal, Blue, Orange) నొక్కితే యాప్ బటన్స్ కలర్ మారుతుంది.</li>
                <li><strong>Gradients:</strong> "Gradients" లిస్ట్ లో మీకు నచ్చిన కలర్ స్టైల్ (ఉదా: Nebula, Sunset) ఎంచుకుంటే యాప్ మొత్తం చాలా అందంగా మారుతుంది.</li>
              </ol>
            </div>

            <div>
              <h4 className="font-bold text-indigo-600 dark:text-indigo-400">2. హెడర్ (పైన పేరు) మార్చుట</h4>
              <ol className="list-decimal pl-5 space-y-1 mt-1">
                <li><strong>Menu &rarr; UI Preferences</strong> లోకి వెళ్ళండి.</li>
                <li>"Dashboard Header" అనే సెక్షన్ కి వెళ్ళండి.</li>
                <li><strong>Greeting:</strong> "Good Morning" అని పలకరించే మాట కావాలంటే "Show Greeting" ఆన్ చేయండి. ఆ మాటను మీరు మార్చుకోవచ్చు కూడా (ఉదా: "ఓం నమో వేంకటేశాయ").</li>
                <li><strong>Logo:</strong> మీ షాపు లోగో కనిపించాలంటే "Show Logo" ఆన్ చేయండి.</li>
              </ol>
            </div>

            <div>
              <h4 className="font-bold text-indigo-600 dark:text-indigo-400">3. అక్షరాల సైజు (Font)</h4>
              <ol className="list-decimal pl-5 space-y-1 mt-1">
                <li><strong>Menu &rarr; UI Preferences</strong> ఓపెన్ చేయండి.</li>
                <li>"Font Family" లో మీకు నచ్చిన స్టైల్ (Roboto, Playfair) ఎంచుకోండి.</li>
                <li><strong>Text Scale:</strong> స్లైడర్ ని జరిపితే అక్షరాల సైజు పెరుగుతుంది లేదా తగ్గుతుంది. మీకు కనిపించే సైజు పెట్టుకోండి.</li>
              </ol>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'sec-sales',
      title: '💰 బిల్లింగ్ మరియు అమ్మకాలు (Sales)',
      content: (
        <div className="space-y-4">
          <p>కొత్త బిల్ ఎలా వేయాలో ఇక్కడ ఉంది.</p>

          <div className="pl-4 border-l-2 border-green-200 dark:border-green-900 space-y-4">
            <div>
              <h4 className="font-bold text-indigo-600 dark:text-indigo-400">1. కొత్త సేల్ (New Sale)</h4>
              <ul className="list-disc pl-5 space-y-1 mt-1">
                <li>డాష్‌బోర్డ్ లో పెద్ద <strong>+ New Sale</strong> బటన్ నొక్కండి.</li>
                <li><strong>Customer:</strong> కస్టమర్ పేరు సెలెక్ట్ చేయండి, లేదా "+" నొక్కి కొత్త వారి పేరు వ్రాయండి.</li>
                <li><strong>Items (వస్తువులు):</strong>
                  <ul className="list-disc pl-5 mt-1 text-sm text-gray-600 dark:text-gray-400">
                    <li>బార్‌కోడ్ ఉంటే కెమెరా బటన్ నొక్కి స్కాన్ చేయండి.</li>
                    <li>లేదా పేరు టైపు చేసి సెలెక్ట్ చేయండి.</li>
                    <li>లిస్ట్ లో లేని వస్తువు అయితే, మాన్యువల్ గా పేరు మరియు రేటు టైపు చేయవచ్చు!</li>
                  </ul>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-indigo-600 dark:text-indigo-400">2. పేమెంట్ (Cash/Online/Udhaar)</h4>
              <p className="mb-1"><strong>Checkout</strong> నొక్కిన తర్వాత:</p>
              <ul className="list-disc pl-5 space-y-1 mt-1">
                <li><strong>Cash:</strong> డబ్బులు చేతికి ఇస్తే ఇది నొక్కండి.</li>
                <li><strong>Online/UPI:</strong> PhonePe/GPay చేస్తే ఇది నొక్కండి.</li>
                <li><strong>Unpaid (Also called Due/Udhaar):</strong> "అప్పు" ఇస్తే ఇది నొక్కండి. ఇది వారి ఖాతాలో "బాకీ" గా పడుతుంది.</li>
              </ul>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'sec-purchases',
      title: '🚚 సరుకు కొనుగోలు (Purchases)',
      content: (
        <div className="space-y-4">
          <div className="pl-4 border-l-2 border-purple-200 dark:border-purple-900 space-y-4">
            <div>
              <h4 className="font-bold text-indigo-600 dark:text-indigo-400">1. సప్లయర్లు (Suppliers)</h4>
              <p>మీకు సరుకు పంపే వారి వివరాలు.</p>
              <ul className="list-disc pl-5 space-y-1 mt-1">
                <li><strong>Purchases</strong> ట్యాబ్ కి వెళ్ళండి.</li>
                <li>"+" నొక్కి కొత్త సప్లయర్ పేరు మరియు ఫోన్ నెంబర్ యాడ్ చేయండి.</li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-indigo-600 dark:text-indigo-400">2. కొనుగోలు బిల్లు (Purchase Bill)</h4>
              <ol className="list-decimal pl-5 space-y-1 mt-1">
                <li><strong>Create Purchase</strong> నొక్కండి.</li>
                <li>సప్లయర్ ని సెలెక్ట్ చేయండి.</li>
                <li>మీరు కొన్న ఐటమ్స్, క్వాంటిటీ, మరియు కొన్న రేటు (Purchase Price) ఎంటర్ చేయండి.</li>
                <li><strong>Save</strong> కొట్టగానే, ఈ సామాను మీ స్టాక్ (Inventory) లో ఆటోమేటిక్ గా యాడ్ అయిపోతుంది!</li>
              </ol>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'sec-inventory',
      title: '📦 స్టాక్ మరియు బార్‌కోడ్ (Inventory)',
      content: (
        <div className="space-y-4">
          <div className="pl-4 border-l-2 border-amber-200 dark:border-amber-900 space-y-4">
            <div>
              <h4 className="font-bold text-indigo-600 dark:text-indigo-400">1. కొత్త ప్రొడక్ట్ యాడ్ చేయుట</h4>
              <ul className="list-disc pl-5 space-y-1 mt-1">
                <li><strong>Products</strong> పేజీకి వెళ్ళండి.</li>
                <li><strong>+ Add Product</strong> నొక్కండి.</li>
                <li>పేరు, అమ్మే రేటు (Sell Price), కొన్న రేటు (Current Purchase Price) ఎంటర్ చేయండి.</li>
                <li><strong>Low Stock Alert:</strong> ఇక్కడ "5" అని పెడితే, సరుకు 5 కంటే తగ్గినప్పుడు యాప్ మీకు వార్నింగ్ ఇస్తుంది.</li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-indigo-600 dark:text-indigo-400">2. బార్‌కోడ్ స్టిక్కర్లు (Print Stickers)</h4>
              <ol className="list-decimal pl-5 space-y-1 mt-1">
                <li>ప్రొడక్ట్స్ లిస్ట్ లో కనిపించే <strong>Barcode Icon</strong> నొక్కండి.</li>
                <li>ఎన్ని స్టిక్కర్లు కావాలో సెలెక్ట్ చేయండి.</li>
                <li>మీ దగ్గర ఉన్న ప్రింటర్ లో (A4 షీట్) ప్రింట్ తీసుకోండి.</li>
              </ol>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'sec-reports',
      title: '📊 రిపోర్ట్స్ & ఎనలిటిక్స్ (Reports)',
      content: (
        <div className="space-y-6">
          <p>మీ వ్యాపారం లాభాల్లో ఉందో లేదో తెలుసుకోవడానికి రిపోర్ట్స్ చాలా ముఖ్యం. ఇందులో రెండు రకాలు ఉన్నాయి: <strong>Standard Mode</strong> (లిస్టులు) మరియు <strong>Enterprise Mode</strong> (గ్రాఫ్‌లు).</p>

          <div className="pl-4 border-l-2 border-orange-200 dark:border-orange-900 space-y-6">

            {/* Standard Reports */}
            <div>
              <h4 className="font-bold text-lg text-indigo-700 dark:text-indigo-400 mb-2">A. స్టాండర్డ్ రిపోర్ట్స్ (Tabs)</h4>

              <div className="space-y-4">
                <div className="bg-gray-50 dark:bg-slate-800 p-3 rounded-lg">
                  <h5 className="font-bold text-gray-800 dark:text-gray-200">1. కస్టమర్ రిపోర్ట్స్ (బాకీలు)</h5>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">ఎవరెవరు మీకు బాకీ ఉన్నారో చూడండి.</p>
                  <ul className="list-disc pl-5 text-sm space-y-1">
                    <li><strong>Customer Dues:</strong> మొత్తం ఎవరి దగ్గర ఎంత రావాలో లిస్ట్ ఉంటుంది.</li>
                    <li><strong>Filters:</strong> "Area" వారీగా లేదా "Dues Age" (ఎన్ని రోజుల నుండి బాకీ ఉన్నారు) వారీగా చూడొచ్చు.</li>
                    <li><strong>చర్య (Action):</strong> <span className="text-blue-600">Download PDF</span> నొక్కి, ఆ లిస్టును వాట్సాప్ లో పంపొచ్చు లేదా కలెక్షన్ కి వాడొచ్చు.</li>
                  </ul>
                </div>

                <div className="bg-gray-50 dark:bg-slate-800 p-3 rounded-lg">
                  <h5 className="font-bold text-gray-800 dark:text-gray-200">2. సప్లయర్ రిపోర్ట్స్ (చెల్లింపులు)</h5>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">మీరు డిస్ట్రిబ్యూటర్లకు ఇవ్వాల్సిన డబ్బులు.</p>
                  <ul className="list-disc pl-5 text-sm space-y-1">
                    <li><strong>Supplier Dues:</strong> మీరు పెండింగ్ పెట్టిన బిల్లులు.</li>
                    <li><strong>Next Due Date:</strong> ఏ రోజు డబ్బులు కట్టాలో ఇక్కడ చూడొచ్చు.</li>
                  </ul>
                </div>

                <div className="bg-gray-50 dark:bg-slate-800 p-3 rounded-lg">
                  <h5 className="font-bold text-gray-800 dark:text-gray-200">3. ఇన్వెంటరీ రిపోర్ట్స్ (స్టాక్)</h5>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">సరుకు ఎప్పటికీ అయిపోకుండా చూసుకోండి.</p>
                  <ul className="list-disc pl-5 text-sm space-y-1">
                    <li><strong>Low Stock:</strong> ఏ ఐటమ్స్ 5 కంటే తక్కువ ఉన్నాయో ఇక్కడ లిస్ట్ వస్తుంది.</li>
                    <li><strong>Stock Valuation:</strong> మీ షాపులో మొత్తం ఎంత విలువైన సరుకు ఉందో చూడొచ్చు (Enterprise Mode లో).</li>
                  </ul>
                </div>

                <div className="bg-gray-50 dark:bg-slate-800 p-3 rounded-lg">
                  <h5 className="font-bold text-gray-800 dark:text-gray-200">4. GST రిపోర్ట్స్</h5>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">నెలవారీ ఆడిటర్ కి ఇచ్చే రిపోర్ట్స్.</p>
                  <ol className="list-decimal pl-5 text-sm space-y-1">
                    <li><strong>Tax / GST</strong> ట్యాబ్ కి వెళ్ళండి.</li>
                    <li><strong>నెల ఎంచుకోండి:</strong> ఏ నెలకు కావాలో సెలెక్ట్ చేయండి.</li>
                    <li><strong>B2B Report:</strong> GST ఉన్న కస్టమర్ల బిల్లులు (GSTR-1 కోసం).</li>
                    <li><strong>Sales Register:</strong> మొత్తం అమ్మకాల లిస్ట్.</li>
                  </ol>
                </div>
              </div>
            </div>

            {/* Enterprise Reports */}
            <div>
              <h4 className="font-bold text-lg text-purple-700 dark:text-purple-400 mb-2">B. ఎంటర్ప్రైజ్ మోడ్ (Enterprise)</h4>
              <p className="mb-2 text-sm">పైన ఉన్న <strong>Try Enterprise Reporting</strong> బటన్ నొక్కితే గ్రాఫ్స్ వస్తాయి.</p>

              <ul className="list-disc pl-5 text-sm space-y-2">
                <li><strong>Sales Trends:</strong> రోజువారీ అమ్మకాలు ఎలా ఉన్నాయో లైన్ గ్రాఫ్ లో చూడొచ్చు.</li>
                <li><strong>Category Performance:</strong> ఏ రకం సరుకు (ఉదా: రైస్, ఆయిల్) ఎక్కువ లాభం తెస్తుందో 'పై చార్ట్' (Pie Chart) లో చూడొచ్చు.</li>
                <li><strong>Custom Builder:</strong> మీకు కావాల్సిన కాలమ్స్ (Columns) సెలెక్ట్ చేసుకుని మీరే సొంత రిపోర్ట్ తయారు చేసుకోవచ్చు.</li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-green-600 dark:text-green-400">💡 Tip: Google Sheets</h4>
              <p className="text-sm mt-1">
                రిపోర్ట్స్ లో గ్రీన్ కలర్ <strong>Sheets</strong> బటన్ ఉంటుంది. అది నొక్కితే మీ డేటా అంతా 'Google Sheets' (Excel లాగా) లో ఓపెన్ అవుతుంది.
              </p>
            </div>

          </div>
        </div>
      )
    },
    {
      id: 'sec-admin',
      title: '⚙️ అడ్మిన్ & సెట్టింగ్స్ (Admin)',
      content: (
        <div className="space-y-6">

          <div className="pl-4 border-l-2 border-red-200 dark:border-red-900 space-y-6">
            <div>
              <h4 className="font-bold text-indigo-600 dark:text-indigo-400">1. స్టాఫ్ మోడ్ (Staff Mode)</h4>
              <p className="text-sm mb-2">మీ వర్కర్లు బిల్లులు డెలిట్ చేయకుండా లేదా మీ లాభాలు చూడకుండా ఆపడానికి ఇది వాడండి.</p>
              <ol className="list-decimal pl-5 space-y-1 text-sm dark:text-gray-300">
                <li><strong>Menu</strong> ట్యాబ్ ఓపెన్ చేయండి.</li>
                <li><strong>Staff Mode</strong> (షీల్డ్ బొమ్మ) మీద క్లిక్ చేయండి.</li>
                <li><strong>PIN సెట్ చేయండి:</strong> మీకు మాత్రమే తెలిసిన 4 అంకెల పిన్ పెట్టుకోండి (ఉదా: 1234).</li>
                <li><strong>Enable:</strong> "Enable Staff Mode" ని ఆన్ చేయండి.</li>
                <li><strong>ఫలితం:</strong> ఇకపై "Delete" బటన్స్ ఎవరికీ కనిపించవు. "Reports" పేజీ లాక్ అవుతుంది.</li>
                <li>మళ్ళీ ఆఫ్ చేయాలంటే పైన ఉన్న స్టాఫ్ మోడ్ ఐకాన్ నొక్కి మీ పిన్ ఎంటర్ చేయాలి.</li>
              </ol>
            </div>

            <div>
              <h4 className="font-bold text-indigo-600 dark:text-indigo-400">2. రీసైకిల్ బిన్ (Recycle Bin)</h4>
              <p className="text-sm mb-2">పొరపాటున బిల్లు డెలిట్ చేశారా?</p>
              <ol className="list-decimal pl-5 space-y-1 text-sm dark:text-gray-300">
                <li><strong>Menu &rarr; Recycle Bin</strong> కి వెళ్ళండి.</li>
                <li>అక్కడ మీరు డెలిట్ చేసిన బిల్లులు మరియు ప్రొడక్ట్స్ కనిపిస్తాయి.</li>
                <li><strong>Restore</strong> నొక్కితే అవి మళ్ళీ వెనక్కి వచ్చేస్తాయి.</li>
                <li><strong>Delete Forever</strong> నొక్కితే శాశ్వతంగా పోతాయి (మళ్ళీ రావు).</li>
              </ol>
            </div>

            <div>
              <h4 className="font-bold text-indigo-600 dark:text-indigo-400">3. సిస్టం క్లీనింగ్ (System Optimizer)</h4>
              <p className="text-sm mb-2">యాప్ స్లోగా ఉంటే:</p>
              <ul className="list-disc pl-5 space-y-1 text-sm dark:text-gray-300">
                <li><strong>Menu &rarr; System Optimizer</strong> కి వెళ్ళండి.</li>
                <li><strong>Analyze</strong> నొక్కండి (అనవసరమైన డేటా ని వెతుకుతుంది).</li>
                <li><strong>Clean Up</strong> నొక్కండి (యాప్ ఫాస్ట్ అవుతుంది).</li>
              </ul>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'sec-customers',
      title: '👥 కస్టమర్లు మరియు బాకీలు (Customers & Credit)',
      content: (
        <div className="space-y-6">
          <p>మీ కస్టమర్లను మరియు వారి బాకీలను (Credits) మేనేజ్ చేయండి.</p>

          <div className="pl-4 border-l-2 border-pink-200 dark:border-pink-900 space-y-6">
            <div>
              <h4 className="font-bold text-indigo-600 dark:text-indigo-400">1. కొత్త కస్టమర్ ని యాడ్ చేయుట</h4>
              <ol className="list-decimal pl-5 space-y-1 text-sm dark:text-gray-300">
                <li><strong>Customers</strong> పేజీకి (యూజర్ ఐకాన్) వెళ్ళండి.</li>
                <li>కింద లేదా పైన ఉన్న <strong>+</strong> బటన్ నొక్కండి.</li>
                <li>వారి <strong>పేరు</strong> మరియు <strong>ఫోన్ నెంబర్</strong> ఎంటర్ చేయండి.</li>
                <li>(అవసరం అయితే) వారి <strong>GSTIN</strong> నెంబర్ కూడా ఇవ్వొచ్చు.</li>
                <li><strong>Save</strong> నొక్కండి.</li>
              </ol>
            </div>

            <div>
              <h4 className="font-bold text-indigo-600 dark:text-indigo-400">2. కస్టమర్ హిస్టరీ (చరిత్ర)</h4>
              <p className="text-sm mb-2">వారు ఇంతకు ముందు ఏమేమి కొన్నారో చూడటానికి:</p>
              <ol className="list-decimal pl-5 space-y-1 text-sm dark:text-gray-300">
                <li>లిస్టులో కస్టమర్ పేరు మీద క్లిక్ చేయండి.</li>
                <li>వారి ప్రొఫైల్ ఓపెన్ అవుతుంది.</li>
                <li><strong>History</strong> ట్యాబ్ లో పాత బిల్లులన్నీ కనిపిస్తాయి.</li>
                <li>ఏదైనా బిల్లు మీద క్లిక్ చేసి మళ్ళీ ప్రింట్ తీసుకోవచ్చు.</li>
              </ol>
            </div>

            <div>
              <h4 className="font-bold text-indigo-600 dark:text-indigo-400">3. బాకీలు (Credit) వసూలు చేయుట</h4>
              <p className="text-sm mb-2">పాత బాకీ కట్టించుకోవడం ఎలా:</p>
              <ol className="list-decimal pl-5 space-y-1 text-sm dark:text-gray-300">
                <li>కస్టమర్ డబ్బులు ఇవ్వడానికి వచ్చినప్పుడు, వారి ప్రొఫైల్ ఓపెన్ చేయండి.</li>
                <li>పైన రెడ్ కలర్ లో వారి <strong>Total Due</strong> (మొత్తం బాకీ) కనిపిస్తుంది.</li>
                <li><strong>Settle Due</strong> బటన్ నొక్కండి.</li>
                <li>వారు ఇప్పుడు ఎంత ఇస్తున్నారో ఆ అమౌంట్ ఎంటర్ చేయండి.</li>
                <li><strong>Confirm Payment</strong> నొక్కండి. వెంటనే వారి బాకీ తగ్గిపోతుంది.</li>
              </ol>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'sec-backup',
      title: '☁️ బ్యాకప్ & డేటా భద్రత',
      content: (
        <div className="space-y-6">
          <div className="bg-red-50 dark:bg-red-900/10 p-4 rounded-lg border border-red-200 dark:border-red-800">
            <h4 className="font-bold text-red-600 dark:text-red-400 flex items-center gap-2">⚠️ అతి ముఖ్యమైన విషయం (Warning)</h4>
            <p className="text-sm mt-1 text-red-700 dark:text-red-300">
              ఈ యాప్ <strong>OFFLINE</strong> లో పనిచేస్తుంది. డేటా మొత్తం మీ ఫోన్ లోనే ఉంటుంది.
              <br />మీ ఫోన్ పోయినా, లేదా బ్రౌజర్ డేటా క్లియర్ చేసినా <strong>మొత్తం పోతుంది</strong>.
            </p>
          </div>

          <div>
            <h4 className="font-bold text-indigo-600 dark:text-indigo-400">పరిష్కారం: Google Drive Sync</h4>
            <p className="text-sm mb-2">మీ డేటా పోకుండా భద్రంగా ఉండాలంటే:</p>
            <ol className="list-decimal pl-5 space-y-1 text-sm dark:text-gray-300">
              <li><strong>Menu</strong> ఓపెన్ చేయండి.</li>
              <li><strong>Sign In with Google</strong> బటన్ నొక్కండి.</li>
              <li>మీ గూగుల్ అకౌంట్ సెలెక్ట్ చేసుకోండి.</li>
              <li><strong>అంతే!</strong> ఇక మీ డేటా ఆటోమేటిక్ గా మీ పర్సనల్ గూగుల్ డ్రైవ్ లో సేవ్ అవుతుంది.</li>
              <li><strong>డేటా వెనక్కి తేవడం:</strong> మీ ఫోన్ పోయినా, కొత్త ఫోన్ లో ఇదే గూగుల్ అకౌంట్ తో లాగిన్ అయితే చాలు, మొత్తం డేటా చిటికెలో వచ్చేస్తుంది!</li>
            </ol>
          </div>

          <div>
            <h4 className="font-bold text-indigo-600 dark:text-indigo-400">మాన్యువల్ బ్యాకప్ (Manual Backup)</h4>
            <p className="text-sm mb-2">గూగుల్ సింక్ వాడలేకపోతే:</p>
            <ol className="list-decimal pl-5 space-y-1 text-sm dark:text-gray-300">
              <li><strong>Menu &rarr; Settings</strong> కి వెళ్ళండి.</li>
              <li><strong>Export Data / Backup</strong> నొక్కండి.</li>
              <li>ఒక ఫైల్ (backup.json) డౌన్లోడ్ అవుతుంది. దీన్ని మెయిల్ లో లేదా పెన్ డ్రైవ్ లో దాచుకోండి.</li>
              <li>మళ్ళీ కావాలంటే <strong>Import Data</strong> నొక్కి ఈ ఫైల్ ని అప్లోడ్ చేయొచ్చు.</li>
            </ol>
          </div>
        </div>
      )
    }
  ]
};

const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
  // const { state } = useAppContext(); // Not strictly needed for basic rendering but good for theme if we want to sync
  const [lang, setLang] = useState<'en' | 'te'>('en');
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({ 'toc': true });

  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  const toggleSection = (id: string) => {
    setOpenSections(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in-fast" onClick={onClose} />
      <div className="relative z-10 w-full max-w-4xl max-h-[90vh] flex flex-col bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden animate-scale-in">

        {/* Header with Search & Language Toggle */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-4 text-white flex flex-col gap-4 shrink-0">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                <BookOpen size={24} className="text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Help Center / సహాయం</h2>
                <p className="text-xs text-blue-100 opacity-90">Guide for Business Manager</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-full transition-colors"
            >
              <X size={24} />
            </button>
          </div>

          {/* Language Switcher Pills */}
          <div className="flex bg-black/20 p-1 rounded-lg self-start">
            <button
              onClick={() => setLang('en')}
              className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${lang === 'en'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-blue-100 hover:bg-white/10'}`}
            >
              English
            </button>
            <button
              onClick={() => setLang('te')}
              className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${lang === 'te'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-blue-100 hover:bg-white/10'}`}
            >
              తెలుగు (Telugu)
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-grow overflow-y-auto p-4 sm:p-6 bg-slate-50 dark:bg-slate-900 custom-scrollbar">
          <div className="max-w-3xl mx-auto space-y-6">
            {helpContent[lang].map((section) => (
              <div
                key={section.id}
                id={section.id}
                className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden"
              >
                <button
                  onClick={() => toggleSection(section.id)}
                  className="w-full flex items-center justify-between p-4 bg-gray-50/50 dark:bg-slate-800/50 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors text-left"
                >
                  <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200">
                    {section.title}
                  </h3>
                  {openSections[section.id] ? (
                    <ChevronRight className="text-gray-400 rotate-90 transition-transform" size={20} />
                  ) : (
                    <ChevronRight className="text-gray-400 transition-transform" size={20} />
                  )}
                </button>

                <div
                  className={`transition-all duration-300 ease-in-out overflow-hidden ${openSections[section.id] ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
                    }`}
                >
                  <div className="p-4 pt-0 border-t border-gray-100 dark:border-slate-700 text-gray-600 dark:text-gray-300 leading-relaxed text-sm">
                    {section.content}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Footer Contact */}
          <div className="mt-8 text-center pb-4">
            <p className="text-xs text-gray-400 dark:text-gray-500">
              Still need help? Contact Developer Support.
            </p>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default HelpModal;
