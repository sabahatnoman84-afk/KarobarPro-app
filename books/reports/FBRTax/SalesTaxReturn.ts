import { Fyo, t } from 'fyo';
import { DateTime } from 'luxon';
import { ModelNameEnum } from 'models/types';
import { Report } from 'reports/Report';
import { ColumnField, ReportData, ReportRow, ReportCell } from 'reports/types';
import { Field } from 'schemas/types';
import getCommonExportActions from 'reports/commonExporter';
import { safeParseFloat } from 'utils/index';
import { FBRInvoiceRow, FBRSummaryRow } from './types';

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
        default: DateTime.now().toFormat('yyyy-MM'),
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

      // 1. Fetch Invoices (Casted to satisfy TypeScript)
      const salesInvoices = (await this.fyo.db.getAllRaw(ModelNameEnum.SalesInvoice, {
        filters: { date: ['>=', startOfMonth, '<=', endOfMonth], submitted: true, cancelled: false },
        fields: ['*'],
      })) as unknown as RawInvoice[];

      const purchaseInvoices = (await this.fyo.db.getAllRaw(ModelNameEnum.PurchaseInvoice, {
        filters: { date: ['>=', startOfMonth, '<=', endOfMonth], submitted: true, cancelled: false },
        fields: ['*'],
      })) as unknown as RawInvoice[];

      // 2. Fetch Parties for NTN/CNIC
      const partyNames = new Set([
        ...salesInvoices.map((i) => i.party),
        ...purchaseInvoices.map((i) => i.party),
      ]);
      
      const parties = (await this.fyo.db.getAllRaw(ModelNameEnum.Party, {
        filters: { name: ['in', Array.from(partyNames)] },
        fields: ['name', 'ntn', 'cnic'],
      })) as unknown as RawParty[];
      
      const partyMap = parties.reduce((acc, p) => {
        acc[p.name] = (p.ntn as string) || (p.cnic as string) || '-';
        return acc;
      }, {} as Record<string, string>);

      // 3. Process Data using our Types
      const salesTaxable: FBRInvoiceRow[] = [];
      const salesZeroRated: FBRInvoiceRow[] = [];
      const purchasesTaxable: FBRInvoiceRow[] = [];

      let outputTaxable = 0;
      let outputTax = 0;
      let inputTaxable = 0;
      let inputTax = 0;

      // Process Sales
      for (const inv of salesInvoices) {
        const netTotal = safeParseFloat(inv.netTotal);
        const grandTotal = safeParseFloat(inv.grandTotal);
        const taxAmt = grandTotal - netTotal;
        
        const row: FBRInvoiceRow = {
          name: inv.name,
          date: inv.date,
          party: inv.party,
          ntnOrCnic: partyMap[inv.party] || '-',
          invoiceValue: grandTotal,
          taxableValue: netTotal,
          taxAmount: taxAmt,
          taxRate: netTotal > 0 ? (taxAmt / netTotal) * 100 : 0,
        };

        if (taxAmt > 0) {
          salesTaxable.push(row);
          outputTaxable += netTotal;
          outputTax += taxAmt;
        } else {
          salesZeroRated.push(row);
        }
      }

      // Process Purchases
      for (const inv of purchaseInvoices) {
        const netTotal = safeParseFloat(inv.netTotal);
        const grandTotal = safeParseFloat(inv.grandTotal);
        const taxAmt = grandTotal - netTotal;

        if (taxAmt > 0) {
          purchasesTaxable.push({
            name: inv.name,
            date: inv.date,
            party: inv.party,
            ntnOrCnic: partyMap[inv.party] || '-',
            invoiceValue: grandTotal,
            taxableValue: netTotal,
            taxAmount: taxAmt,
            taxRate: netTotal > 0 ? (taxAmt / netTotal) * 100 : 0,
          });
          inputTaxable += netTotal;
          inputTax += taxAmt;
        }
      }

      // --- RENDER REPORT ---
      
      // ANNEXURE C: SALES TAXABLE
      reportData.push(this.getHeaderRow(t`ANNEXURE-C: LOCAL TAXABLE SUPPLIES (SALES)`));
      if (salesTaxable.length > 0) {
        salesTaxable.forEach(row => reportData.push(this.getInvoiceRow(row)));
      } else {
        reportData.push(this.getEmptyMessageRow(t`No taxable sales in this period.`));
      }

      // ANNEXURE D: ZERO RATED SALES
      reportData.push(this.getSpacerRow());
      reportData.push(this.getHeaderRow(t`ANNEXURE-D: ZERO RATED / EXEMPT SUPPLIES`));
      if (salesZeroRated.length > 0) {
        salesZeroRated.forEach(row => reportData.push(this.getInvoiceRow(row)));
      } else {
        reportData.push(this.getEmptyMessageRow(t`No zero-rated sales in this period.`));
      }

      // ANNEXURE A/B: INPUT TAX (PURCHASES)
      reportData.push(this.getSpacerRow());
      reportData.push(this.getHeaderRow(t`ANNEXURE-A/B: INPUT TAX (PURCHASES)`));
      if (purchasesTaxable.length > 0) {
        purchasesTaxable.forEach(row => reportData.push(this.getInvoiceRow(row)));
      } else {
        reportData.push(this.getEmptyMessageRow(t`No taxable purchases in this period.`));
      }

      // SUMMARY
      const netPayable = outputTax - inputTax;
      const summaryRows: FBRSummaryRow[] = [
        { label: t`Total Output Tax (Sales)`, taxableValue: outputTaxable, taxAmount: outputTax },
        { label: t`Total Input Tax (Purchases)`, taxableValue: inputTaxable, taxAmount: inputTax },
        { 
          label: netPayable >= 0 ? t`Net Tax Payable` : t`Net Tax Refundable`, 
          taxableValue: 0, 
          taxAmount: Math.abs(netPayable), 
          isBold: true,
          color: netPayable >= 0 ? 'red' : 'green'
        }
      ];

      reportData.push(this.getSpacerRow());
      reportData.push(this.getHeaderRow(t`TAX SUMMARY FOR ${monthStr}`));
      summaryRows.forEach(row => reportData.push(this.getSummaryRow(row)));

      this.reportData = reportData;
    } catch (err) {
      console.error('FBR Report Error:', err);
    } finally {
      this.loading = false;
    }
  }

  // --- UI Helper Methods ---

  private getInvoiceRow(data: FBRInvoiceRow): ReportRow {
    const rateDisplay = data.taxRate > 0 ? `${Math.round(data.taxRate)}%` : '0% (Exempt)';
    
    const cells: ReportCell[] = [
      { rawValue: '', value: '', align: 'left', width: 2 },
      { rawValue: data.name, value: data.name, align: 'left', width: 1.2 },
      { rawValue: data.date, value: DateTime.fromISO(data.date).toFormat('dd-MMM-yy'), align: 'left', width: 1 },
      { rawValue: data.party, value: data.party, align: 'left', width: 1.5 },
      { rawValue: data.ntnOrCnic, value: data.ntnOrCnic, align: 'left', width: 1.2 },
      { rawValue: data.taxableValue, value: this.fyo.format(data.taxableValue, 'Currency'), align: 'right', width: 1.2 },
      { rawValue: rateDisplay, value: rateDisplay, align: 'right', width: 0.8 },
      { rawValue: data.taxAmount, value: this.fyo.format(data.taxAmount, 'Currency'), align: 'right', width: 1.2 },
    ];
    return { cells };
  }

  private getSummaryRow(data: FBRSummaryRow): ReportRow {
    const cells: ReportCell[] = [
      { rawValue: data.label, value: data.label, align: 'left', width: 2, bold: data.isBold, color: data.color },
      { rawValue: '', value: '', align: 'left', width: 1.2 },
      { rawValue: '', value: '', align: 'left', width: 1 },
      { rawValue: '', value: '', align: 'left', width: 1.5 },
      { rawValue: '', value: '', align: 'left', width: 1.2 },
      { rawValue: data.taxableValue, value: this.fyo.format(data.taxableValue, 'Currency'), align: 'right', width: 1.2, bold: data.isBold },
      { rawValue: '', value: '', align: 'right', width: 0.8 },
      { rawValue: data.taxAmount, value: this.fyo.format(data.taxAmount, 'Currency'), align: 'right', width: 1.2, bold: data.isBold, color: data.color },
    ];
    return { cells };
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

  private getEmptyMessageRow(msg: string): ReportRow {
    const cells: ReportCell[] = this.getColumns().map((c, i) => ({
      rawValue: i === 0 ? msg : '', value: i === 0 ? msg : '',
      align: i === 0 ? 'left' : 'right', width: c.width, italics: true,
    }));
    return { cells };
  }
}