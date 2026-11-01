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
}

interface RawItem {
  item: string;
  quantity: string | number;
  unit: string;
  parent: string;
}

export class DailyDeliverySummary extends Report {
  static title = t`Daily Delivery Summary`;
  static reportName = 'daily-delivery-summary';

  loading = false;
  date?: string;

  getFilters(): Field[] {
    return [
      {
        fieldtype: 'Date',
        label: t`Delivery Date`,
        fieldname: 'date',
        required: true,
      },
    ];
  }

  setDefaultFilters(): void {
    if (!this.date) {
      this.date = DateTime.now().toISODate() ?? '';
    }
  }

  getColumns(): ColumnField[] {
    return [
      { fieldname: 'item', label: t`Item Name`, fieldtype: 'Data', width: 2 },
      { fieldname: 'quantity', label: t`Total Quantity`, fieldtype: 'Float', align: 'right', width: 1 },
      { fieldname: 'unit', label: t`Unit`, fieldtype: 'Data', align: 'center', width: 1 },
      { fieldname: 'invoices', label: t`Invoice Numbers`, fieldtype: 'Data', width: 3 },
    ];
  }

  getActions() {
    return getCommonExportActions(this);
  }

  async setReportData(): Promise<void> {
    this.loading = true;
    const reportData: ReportData = [];

    try {
      if (!this.date) this.setDefaultFilters();
      const reportDate = this.date!; // TypeScript safe

      // Format dates properly for the database query
      const startOfDay = DateTime.fromISO(reportDate).startOf('day').toISO();
      const endOfDay = DateTime.fromISO(reportDate).endOf('day').toISO();

      // 1. Fetch all submitted invoices for the selected date
      const invoices = (await this.fyo.db.getAllRaw(ModelNameEnum.SalesInvoice, {
        filters: { 
          date: ['>=', startOfDay, '<=', endOfDay],
          submitted: true, 
          cancelled: false 
        },
        fields: ['name'],
      })) as unknown as RawInvoice[];

      if (invoices.length === 0) {
        reportData.push(this.getEmptyMessageRow(t`No invoices found for this date.`));
        this.reportData = reportData;
        return;
      }

      const invoiceNames = invoices.map((i) => i.name);

      // 2. Fetch all items belonging to those invoices
      const items = (await this.fyo.db.getAllRaw(ModelNameEnum.SalesInvoiceItem, {
        filters: { parent: ['in', invoiceNames] },
        fields: ['item', 'quantity', 'unit', 'parent'],
      })) as unknown as RawItem[];

      // 3. Aggregate the items (e.g., 3 phones from Invoice A + 2 from Invoice B = 5 phones)
      const aggregatedData: Record<string, { qty: number; unit: string; invs: Set<string> }> = {};

      for (const row of items) {
        const itemName = row.item;
        const qty = safeParseFloat(row.quantity);

        if (!aggregatedData[itemName]) {
          aggregatedData[itemName] = { qty: 0, unit: row.unit || '-', invs: new Set() };
        }

        aggregatedData[itemName].qty += qty;
        aggregatedData[itemName].invs.add(row.parent);
      }

      // 4. Convert the aggregated data into rows for the table
      reportData.push(this.getHeaderRow(t`DELIVERY PICKING LIST: ${reportDate}`));

      const sortedItemNames = Object.keys(aggregatedData).sort();

      for (const itemName of sortedItemNames) {
        const data = aggregatedData[itemName];
        const invoiceList = Array.from(data.invs).join(', ');

        const row: ReportRow = {
          cells: [
            { rawValue: itemName, value: itemName, align: 'left', width: 2, bold: true },
            { rawValue: data.qty, value: this.fyo.format(data.qty, 'Float'), align: 'right', width: 1, bold: true },
            { rawValue: data.unit, value: data.unit, align: 'center', width: 1 },
            { rawValue: invoiceList, value: invoiceList, align: 'left', width: 3 },
          ],
        };
        reportData.push(row);
      }

      this.reportData = reportData;
    } catch (err) {
      console.error('Daily Delivery Summary Error:', err);
    } finally {
      this.loading = false;
    }
  }

  // --- UI Helper Methods ---

  private getHeaderRow(title: string): ReportRow {
    const cells: ReportCell[] = this.getColumns().map((c, i) => ({
      rawValue: i === 0 ? title : '', value: i === 0 ? title : '',
      align: 'left', width: c.width, bold: true, color: 'green',
    }));
    return { cells, isGroup: true };
  }

  private getEmptyMessageRow(msg: string): ReportRow {
    const cells: ReportCell[] = this.getColumns().map((c, i) => ({
      rawValue: i === 0 ? msg : '', value: i === 0 ? msg : '',
      align: i === 0 ? 'left' : 'right', width: c.width, italics: true,
    }));
    return { cells };
  }
}