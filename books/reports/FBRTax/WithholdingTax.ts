import { Fyo, t } from 'fyo';
import { DateTime } from 'luxon';
import { ModelNameEnum } from 'models/types';
import { Report } from 'reports/Report';
import { ColumnField, ReportData, ReportRow, ReportCell } from 'reports/types';
import { Field } from 'schemas/types';
import getCommonExportActions from 'reports/commonExporter';
import { safeParseFloat } from 'utils/index';

interface RawInvoice {
  name: string;
  party: string;
  date: string;
  netTotal: string | number;
  taxes?: { account: string; rate: number; amount: string | number }[];
}

interface RawParty {
  name: string;
  ntn?: string;
  cnic?: string;
}

export class WithholdingTax extends Report {
  static title = t`Withholding Tax Statement`;
  static reportName = 'fbr-withholding-tax';

  loading = false;
  month?: string;

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
      { fieldname: 'particulars', label: t`Particulars`, fieldtype: 'Data', width: 1.5 },
      { fieldname: 'invoiceNo', label: t`Invoice #`, fieldtype: 'Data', width: 1.2 },
      { fieldname: 'date', label: t`Date`, fieldtype: 'Data', width: 1 },
      { fieldname: 'party', label: t`Party`, fieldtype: 'Data', width: 1.5 },
      { fieldname: 'ntnCnic', label: t`NTN / CNIC`, fieldtype: 'Data', width: 1.2 },
      { fieldname: 'taxableValue', label: t`Taxable Value`, fieldtype: 'Currency', align: 'right', width: 1.2 },
      { fieldname: 'rate', label: t`Rate %`, fieldtype: 'Data', align: 'right', width: 0.8 },
      { fieldname: 'taxAmount', label: t`WHT Amount`, fieldtype: 'Currency', align: 'right', width: 1.2 },
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

      // Fetch Purchase Invoices
      const purchaseInvoices = (await this.fyo.db.getAllRaw(ModelNameEnum.PurchaseInvoice, {
        filters: { date: ['>=', startOfMonth, '<=', endOfMonth], submitted: true, cancelled: false },
        fields: ['*'],
      })) as unknown as RawInvoice[];

      // Fetch Parties for NTN
      const partyNames = new Set<string>();
      purchaseInvoices.forEach((i) => { if (i.party) partyNames.add(i.party); });
      
      const parties = (await this.fyo.db.getAllRaw(ModelNameEnum.Party, {
        filters: { name: ['in', Array.from(partyNames)] },
        fields: ['name', 'ntn', 'cnic'],
      })) as unknown as RawParty[];

      const partyMap = parties.reduce((acc, p) => {
        acc[p.name] = p.ntn || p.cnic || '';
        return acc;
      }, {} as Record<string, string>);

      let totalTaxable = 0;
      let totalWht = 0;

      reportData.push(this.getHeaderRow(t`WITHHOLDING TAX DEDUCTED AT SOURCE (PURCHASES)`));

      for (const inv of purchaseInvoices) {
        if (!inv.taxes || !Array.isArray(inv.taxes)) continue;

        // Find the withholding tax lines (negative rates)
        const whtLines = inv.taxes.filter((tx) => tx.rate < 0);

        for (const line of whtLines) {
          const taxAmt = Math.abs(safeParseFloat(line.amount));
          const netTotal = safeParseFloat(inv.netTotal);
          const rate = Math.abs(line.rate);

          totalTaxable += netTotal;
          totalWht += taxAmt;

          const ntnCnic = partyMap[inv.party] || '-';

          const row: ReportRow = {
            cells: [
              { rawValue: line.account, value: line.account, align: 'left', width: 1.5 },
              { rawValue: inv.name, value: inv.name, align: 'left', width: 1.2 },
              { rawValue: inv.date, value: DateTime.fromISO(inv.date).toFormat('dd-MMM-yy'), align: 'left', width: 1 },
              { rawValue: inv.party, value: inv.party, align: 'left', width: 1.5 },
              { rawValue: ntnCnic, value: ntnCnic, align: 'left', width: 1.2 },
              { rawValue: netTotal, value: this.fyo.format(netTotal, 'Currency'), align: 'right', width: 1.2 },
              { rawValue: rate, value: `${rate}%`, align: 'right', width: 0.8 },
              { rawValue: taxAmt, value: this.fyo.format(taxAmt, 'Currency'), align: 'right', width: 1.2 },
            ],
          };
          reportData.push(row);
        }
      }

      // Add summary if data exists
      if (totalWht > 0) {
        reportData.push(this.getSpacerRow());
        reportData.push(this.getHeaderRow(t`WHT SUMMARY FOR ${monthStr}`));
        reportData.push(this.getSummaryRow(t`Total Taxable Value`, totalTaxable));
        reportData.push(this.getSummaryRow(t`Total WHT Payable to FBR`, null, totalWht, true));
      } else {
        reportData.push(this.getSpacerRow());
        reportData.push(this.getEmptyMessageRow(t`No withholding tax recorded in this period.`));
      }

      this.reportData = reportData;
    } catch (err) {
      console.error('WHT Report Error:', err);
    } finally {
      this.loading = false;
    }
  }

  // --- UI Helper Methods ---

  private getSummaryRow(label: string, taxable: number | null, tax: number | null = null, isBold = false): ReportRow {
    return {
      cells: [
        { rawValue: label, value: label, align: 'left', width: 1.5, bold: isBold },
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
        { rawValue: tax ?? '', value: tax !== null ? this.fyo.format(tax, 'Currency') : '', align: 'right', width: 1.2, bold: isBold },
      ],
    };
  }

  private getHeaderRow(title: string): ReportRow {
    const cells: ReportCell[] = this.getColumns().map((c, i) => ({
      rawValue: i === 0 ? title : '', value: i === 0 ? title : '',
      align: 'left', width: c.width, bold: true, color: 'green',
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