import { t } from 'fyo';
import { ModelNameEnum } from 'models/types';
import { Report } from 'reports/Report';
import { ColumnField, ReportData, ReportRow, ReportCell } from 'reports/types';
import { Field } from 'schemas/types';
import getCommonExportActions from 'reports/commonExporter';
import { safeParseFloat } from 'utils/index';
import { ValuationMethod } from 'models/inventory/types';
import { 
  getRawStockLedgerEntries, 
  getStockLedgerEntries, 
  getStockBalanceEntries 
} from './helpers';

export class LowStockReport extends Report {
  static title = t`Low Stock Alert`;
  static reportName = 'low-stock-report';
  static isInventory = true;

  loading = false;
  threshold = 5; // Default limit

  getFilters(): Field[] {
    return [
      {
        fieldtype: 'Float',
        label: t`Show items with stock less than or equal to`,
        fieldname: 'threshold',
        required: true,
        default: 5,
      },
    ];
  }

  setDefaultFilters(): void {
    if (this.threshold === undefined) {
      this.threshold = 5;
    }
  }

  getColumns(): ColumnField[] {
    return [
      { fieldname: 'item', label: t`Item Name`, fieldtype: 'Data', width: 2 },
      { fieldname: 'itemGroup', label: t`Item Group`, fieldtype: 'Data', width: 1.5 },
      { fieldname: 'stock', label: t`Current Stock`, fieldtype: 'Float', align: 'right', width: 1 },
      { fieldname: 'unit', label: t`Unit`, fieldtype: 'Data', align: 'center', width: 1 },
      { fieldname: 'rate', label: t`Selling Rate`, fieldtype: 'Currency', align: 'right', width: 1 },
    ];
  }

  getActions() {
    return getCommonExportActions(this);
  }

  async setReportData(): Promise<void> {
    this.loading = true;
    const reportData: ReportData = [];

    try {
      if (this.threshold === undefined) this.setDefaultFilters();
      const limit = this.threshold!;

      // 1. Fetch all items
      const items = await this.fyo.db.getAllRaw(ModelNameEnum.Item, {
        fields: ['name', 'itemGroup', 'unit', 'rate'],
        filters: { trackItem: true }, // Only inventory items
      });

      // 2. Fetch stock balances
      const rawSLEs = await getRawStockLedgerEntries(this.fyo);
      const computedSLEs = getStockLedgerEntries(rawSLEs, ValuationMethod.FIFO);
      const stockBalances = getStockBalanceEntries(computedSLEs, {});

      // 3. Map stock to items
      const stockMap: Record<string, number> = {};
      for (const balance of stockBalances) {
        if (!stockMap[balance.item]) stockMap[balance.item] = 0;
        stockMap[balance.item] += balance.balanceQuantity;
      }

      // 4. Filter items
      reportData.push(this.getHeaderRow(t`LOW STOCK ITEMS (<= ${limit})`));
      
      let count = 0;
      for (const item of items) {
        const itemName = item.name as string;
        const currentStock = stockMap[itemName] || 0;

        if (currentStock <= limit) {
          count++;
          
          const itemGroup = (item.itemGroup as string) || '-';
          const unit = (item.unit as string) || '-';
          const rate = safeParseFloat(item.rate);

          const row: ReportRow = {
            cells: [
              { rawValue: itemName, value: itemName, align: 'left', width: 2, bold: true },
              { rawValue: itemGroup, value: itemGroup, align: 'left', width: 1.5 },
              { 
                rawValue: currentStock, 
                value: this.fyo.format(currentStock, 'Float'), 
                align: 'right', width: 1, 
                color: currentStock <= 0 ? 'red' : undefined 
              },
              { rawValue: unit, value: unit, align: 'center', width: 1 },
              { rawValue: rate, value: this.fyo.format(rate, 'Currency'), align: 'right', width: 1 },
            ],
          };
          reportData.push(row);
        }
      }

      if (count === 0) {
        reportData.push(this.getEmptyMessageRow(t`All items are sufficiently stocked above ${limit}.`));
      }

      this.reportData = reportData;
    } catch (err) {
      console.error('Low Stock Report Error:', err);
    } finally {
      this.loading = false;
    }
  }

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