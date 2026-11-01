# 🇵🇰 KarobarPro — Pakistan Localization Master Plan

> **Purpose:** Tracks every step to make KarobarPro a fully Pakistan-ready product.
> **Last Updated:** 2026-10-17
> **Working Directory:** `D:\KarobarPro-app\books`

---

## 📊 Progress Tracker

- **Phase 1 (Urdu Language):** [███] 3/3 ✅ COMPLETE
- **Phase 2 (Pakistan Regional Data):** [███████] 7/7 ✅ COMPLETE
- **Phase 3 (Branding & URLs):** [███████] 7/7 ✅ COMPLETE
- **Phase 4 (Reports & Fixtures):** [███░░] 3/5 ✅ PARTIAL
- **Phase 5 (Testing):** [███] 3/3 ✅ COMPLETE

**Overall Progress:** 23/25 tasks ✅ (92%)
**Status:** App builds successfully, installer works, Khata Book bug fixed. Ready for FBR Reports.

---

## 🚀 Next Session Starting Point: Task 4.2 (FBR Sales Tax Return)

**What we will build:**
A new report under `reports/FBRTax/` that reads all sales/purchase invoices for a selected month and generates the FBR Sales Tax Return format (Annexures A, B, C).

**Files we will need to create/modify:**
1. `reports/FBRTax/SalesTaxReturn.ts` (New Report class)
2. `reports/FBRTax/types.ts` (TypeScript interfaces for FBR data)
3. `reports/index.ts` (Register the new report)
4. `src/utils/sidebarConfig.ts` (Add it to the sidebar menu)
5. `translations/ur.csv` (Add Urdu translations for FBR terms)

---

## ✅ Completed Features Checklist

- [x] Urdu language dropdown, RTL layout, and 130+ translations
- [x] Pakistan schemas (NTN, STRN, CNIC, WhatsApp)
- [x] Pakistan models and auto-populated provinces
- [x] Auto-creation of Federal GST and Provincial Tax templates on setup
- [x] Branding removed from Frappe Books (Icons, URLs, README, package.json)
- [x] JazzCash/EasyPaisa Payment QR code
- [x] Khata Book data query & number parsing bug fixed
- [x] Windows installer successfully built (KarobarPro-v1.0.0-windows.exe)

---

## 🔗 Reference

- **GitHub Repo:** https://github.com/sabahatnoman84-afk/KarobarPro-app
- **Dev Command:** `cd D:\KarobarPro-app\books` → `npm run dev`
- **Build Command:** `npm run build` (Requires Windows Developer Mode)