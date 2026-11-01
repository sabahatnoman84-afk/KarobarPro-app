import { Fyo, t } from 'fyo';
import { DateTime } from 'luxon';
import { ModelNameEnum } from 'models/types';
import { Report } from 'reports/Report';
import { ColumnField, ReportData, ReportRow, ReportCell } from 'reports/types';
import { Field } from 'schemas/types';
import getCommonExportActions from 'reports/commonExporter';
import { safeParseFloat } from 'utils/index';

// Define exact types to satisfy TypeScript
interface RawInvoice {
  name: string;
  party: string;
  date: string;
  netTotal: string | number;
  grandTotal: string | number;
}

interface RawParty {
  name: string;
  ntn?: string;
  cnic?: string;
}

export class SalesTaxReturn extends Report {
  static title = t`FBR Sales Tax Return`;
  static reportName = 'fbr-sales-tax-return';

  loading = false;
  month?: string; // Format: YYYY-MM

  getFilters(): Field[] {
    return [
      {
        fieldtype: 'Data',
        label: t`Tax Period (YYYY-MM)`,
        fieldname: 'month',
        placeholder: t`e.g. 2026-10`,
        required: true,
      },
    ];
  }

  setDefaultFilters(): void {
    if (!this.month) {
      this.month = DateTime.now().toFormat('yyyy-MM');
    }
  }

  getColumns(): ColumnField[] {
    return [
      { fieldname: 'particulars', label: t`Particulars`, fieldtype: 'Data', width: 2 },
      { fieldname: 'invoiceNo', label: t`Invoice #`, fieldtype: 'Data', width: 1.2 },
      { fieldname: 'date', label: t`Date`, fieldtype: 'Data', width: 1 },
      { fieldname: 'party', label: t`Party`, fieldtype: 'Data', width: 1.5 },
      { fieldname: 'ntnCnic', label: t`NTN / CNIC`, fieldtype: 'Data', width: 1.2 },
      { fieldname: 'taxableValue', label: t`Taxable Value`, fieldtype: 'Currency', align: 'right', width: 1.2 },
      { fieldname: 'rate', label: t`Rate %`, fieldtype: 'Data', align: 'right', width: 0.8 },
      { fieldname: 'taxAmount', label: t`Tax Amount`, fieldtype: 'Currency', align: 'right', width: 1.2 },
    ];
  }

  getActions() {
    return getCommonExportActions(this);
  }

  async setReportData(): Promise<void> {
    this.loading = true;
    const reportData: ReportData = [];

    try {
      if (!this.month) this.setDefaultFilters();
      const monthStr = this.month!;

      const startOfMonth = DateTime.fromFormat(monthStr, 'yyyy-MM').startOf('month').toISODate();
      const endOfMonth = DateTime.fromFormat(monthStr, 'yyyy-MM').endOf('month').toISODate();

      // 1. Fetch Sales Invoices (Output Tax)
      const salesInvoices = (await this.fyo.db.getAllRaw(ModelNameEnum.SalesInvoice, {
        filters: { date: ['>=', startOfMonth, '<=', endOfMonth], submitted: true, cancelled: false },
        fields: ['*'],
      })) as unknown as RawInvoice[];

      // 2. Fetch Purchase Invoices (Input Tax)
      const purchaseInvoices = (await this.fyo.db.getAllRaw(ModelNameEnum.PurchaseInvoice, {
        filters: { date: ['>=', startOfMonth, '<=', endOfMonth], submitted: true, cancelled: false },
        fields: ['*'],
      })) as unknown as RawInvoice[];

      // 3. Fetch Parties to get NTN/CNIC
      const partyNames = new Set<string>();
      salesInvoices.forEach((i) => { if (i.party) partyNames.add(i.party); });
      purchaseInvoices.forEach((i) => { if (i.party) partyNames.add(i.party); });

      const parties = (await this.fyo.db.getAllRaw(ModelNameEnum.Party, {
        filters: { name: ['in', Array.from(partyNames)] },
        fields: ['name', 'ntn', 'cnic'],
      })) as unknown as RawParty[];

      const partyMap = parties.reduce((acc, p) => {
        acc[p.name] = p.ntn || p.cnic || '';
        return acc;
      }, {} as Record<string, string>);

      // Variables for Summary
      let outputTaxable = 0;
      let outputTax = 0;
      let inputTaxable = 0;
      let inputTax = 0;

      // --- SECTION 1: OUTPUT TAX (SALES) ---
      reportData.push(this.getHeaderRow(t`ANNEXURE-C: LOCAL TAXABLE SUPPLIES (SALES)`));

      for (const inv of salesInvoices) {
        const netTotal = safeParseFloat(inv.netTotal);
        const grandTotal = safeParseFloat(inv.grandTotal);
        const taxAmt = grandTotal - netTotal;

        if (taxAmt > 0) {
          outputTaxable += netTotal;
          outputTax += taxAmt;
          reportData.push(this.getInvoiceRow(inv, netTotal, taxAmt, partyMap));
        }
      }

      // --- SECTION 2: INPUT TAX (PURCHASES) ---
      reportData.push(this.getSpacerRow());
      reportData.push(this.getHeaderRow(t`ANNEXURE-A/B: INPUT TAX (PURCHASES)`));

      for (const inv of purchaseInvoices) {
        const netTotal = safeParseFloat(inv.netTotal);
        const grandTotal = safeParseFloat(inv.grandTotal);
        const taxAmt = grandTotal - netTotal;

        if (taxAmt > 0) {
          inputTaxable += netTotal;
          inputTax += taxAmt;
          reportData.push(this.getInvoiceRow(inv, netTotal, taxAmt, partyMap));
        }
      }

      // --- SECTION 3: SUMMARY ---
      reportData.push(this.getSpacerRow());
      reportData.push(this.getHeaderRow(t`TAX SUMMARY FOR ${monthStr}`));

      reportData.push(this.getSummaryRow(t`Total Output Tax (Sales)`, outputTaxable, outputTax));
      reportData.push(this.getSummaryRow(t`Total Input Tax (Purchases)`, inputTaxable, inputTax));

      const netPayable = outputTax - inputTax;
      reportData.push(
        this.getSummaryRow(
          netPayable >= 0 ? t`Net Tax Payable` : t`Net Tax Refundable`,
          null,
          Math.abs(netPayable),
          true
        )
      );

      this.reportData = reportData;
    } catch (err) {
      console.error('FBR Report Error:', err);
    } finally {
      this.loading = false;
    }
  }

  // --- UI Helper Methods ---

  private getInvoiceRow(inv: RawInvoice, taxable: number, tax: number, partyMap: Record<string, string>): ReportRow {
    const ntnCnic = partyMap[inv.party] || '-';
    const rate = taxable > 0 ? Math.round((tax / taxable) * 100) : 0;

    return {
      cells: [
        { rawValue: '', value: '', align: 'left', width: 2 },
        { rawValue: inv.name, value: inv.name, align: 'left', width: 1.2 },
        { rawValue: inv.date, value: DateTime.fromISO(inv.date).toFormat('dd-MMM-yy'), align: 'left', width: 1 },
        { rawValue: inv.party, value: inv.party, align: 'left', width: 1.5 },
        { rawValue: ntnCnic, value: ntnCnic, align: 'left', width: 1.2 },
        { rawValue: taxable, value: this.fyo.format(taxable, 'Currency'), align: 'right', width: 1.2 },
        { rawValue: rate, value: `${rate}%`, align: 'right', width: 0.8 },
        { rawValue: tax, value: this.fyo.format(tax, 'Currency'), align: 'right', width: 1.2 },
      ],
    };
  }

  private getSummaryRow(label: string, taxable: number | null, tax: number, isBold = false): ReportRow {
    return {
      cells: [
        { rawValue: label, value: label, align: 'left', width: 2, bold: isBold },
        { rawValue: '', value: '', align: 'left', width: 1.2 },
        { rawValue: '', value: '', align: 'left', width: 1 },
        { rawValue: '', value: '', align: 'left', width: 1.5 },
        { rawValue: '', value: '', align: 'left', width: 1.2 },
        {
          rawValue: taxable ?? '',
          value: taxable !== null ? this.fyo.format(taxable, 'Currency') : '',
          align: 'right', width: 1.2, bold: isBold
        },
        { rawValue: '', value: '', align: 'right', width: 0.8 },
        { rawValue: tax, value: this.fyo.format(tax, 'Currency'), align: 'right', width: 1.2, bold: isBold },
      ],
    };
  }

  private getHeaderRow(title: string): ReportRow {
    const cells: ReportCell[] = this.getColumns().map((c, i) => ({
      rawValue: i === 0 ? title : '',
      value: i === 0 ? title : '',
      align: 'left',
      width: c.width,
      bold: true,
      color: 'green',
    }));
    return { cells, isGroup: true };
  }

  private getSpacerRow(): ReportRow {
    const cells: ReportCell[] = this.getColumns().map((c) => ({
      rawValue: '', value: '', align: 'left', width: c.width,
    }));
    return { cells, isEmpty: true };
  }
}