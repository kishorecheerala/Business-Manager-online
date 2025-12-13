# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased] - 2025-12-13

### 🚀 New Features

#### Enterprise Reporting & BI Suite
- **Interactive Report Builder:** Drag-and-drop interface to create custom reports (`ReportsPageV2.tsx`).
- **50+ Pre-Built Templates:** Comprehensive library covering Sales, Inventory, Customers, Purchases, and Financials.
- **Advanced Visualizations:** Added support for **Funnel**, **Treemap** (Heatmap), **Area**, **Scatter**, and **Composed** charts using Recharts.
- **Universal Export:** One-click export to **PDF** and **CSV** for all report types.
- **Smart Metrics:** Automatic calculation of Profit Margins, Stock Value, Customer Churn Risk, and GST Liability.

#### Mobile Optimization & PWA
- **Native App Wrappers:** Added database and build configuration for Capacitor (Android/iOS).
- **Service Worker Enhancements:** background sync and improved offline fetching strategies.
- **Geolocation Integration:** Added "Use Current Location" feature for customer address entry.
- **UPI Deep Linking:** Mobile-first payment integration for instant UPI app launching.

#### Offline AI Intelligence
- **Local Intelligence Engine:** Fallback logic to generate insights and marketing content without API access.
- **Rule-Based Analysis:** Heuristic algorithms for customer segmentation and sales trends when offline.

### 🐛 Bug Fixes
- **Payment Editing:** Fixed critical issues with date parsing and overpayment validation when editing existing payment records.
- **Dashboard Stability:** Resolved syntax errors in the install banner logic.

### 🛠 Improvements
- **Performance:** Optimized chart rendering with `useMemo` for heavy aggregations.
- **Code Structure:** Refactored Reporting logic into `ReportEngine` and `ExportEngine` for modularity.
