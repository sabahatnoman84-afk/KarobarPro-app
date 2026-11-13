import { Fyo, t } from 'fyo';
import { Doc } from 'fyo/model/doc';
import { Invoice } from 'models/baseModels/Invoice/Invoice';
import { ModelNameEnum } from 'models/types';
import { FieldTypeEnum, Schema, TargetField } from 'schemas/types';
import { getValueMapFromList } from 'utils/index';
import { TemplateFile } from 'utils/types';
import { showToast } from './interactive';
import { PrintValues } from './types';
import {
  getDocFromNameIfExistsElseNew,
  getSavePath,
  showExportInFolder,
} from './ui';
import { Money } from 'pesa';
import { SalesInvoice } from 'models/baseModels/SalesInvoice/SalesInvoice';
import { Payment } from 'models/baseModels/Payment/Payment';
import QRCode from 'qrcode';

export type PrintTemplateHint = {
  [key: string]: string | PrintTemplateHint | PrintTemplateHint[];
};
type PrintTemplateData = Record<string, unknown>;
type TemplateUpdateItem = {
  name: string;
  template: string;
  type: string;
  width: number;
  height: number;
};

const printSettingsFields = [
  'logo',
  'displayLogo',
  'color',
  'font',
  'email',
  'phone',
  'address',
  'companyName',
  'amountInWords',
  'displaytermsandconditions',
  'termsAndConditions',
  'upiId',
  'displayPaymentQR',
];
const accountingSettingsFields = ['gstin', 'taxId'];

export async function getPrintTemplatePropValues(
  doc: Doc
): Promise<PrintValues> {
  const fyo = doc.fyo;
  let paymentId;
  let sinvDoc;

  const values: PrintValues = { doc: {}, print: {} };
  values.doc = await getPrintTemplateDocValues(doc);

  if (
    values.doc.entryType === ModelNameEnum.SalesInvoice ||
    values.doc.entryType === ModelNameEnum.PurchaseInvoice
  ) {
    paymentId = await (doc as SalesInvoice).getPaymentIds();

    if (paymentId && paymentId.length) {
      const paymentDetails = await getPaymentDetails(doc, paymentId);
      (values.doc as PrintTemplateData).paymentDetails = paymentDetails;
    }
  }

  if (doc.referenceType == ModelNameEnum.SalesInvoice) {
    const referenceName = (doc as Payment)?.for![0]?.referenceName;

    if (referenceName) {
      sinvDoc = await fyo.doc.getDoc(ModelNameEnum.SalesInvoice, referenceName);

      if (sinvDoc.taxes) {
        (values.doc as PrintTemplateData).taxes = sinvDoc.taxes;
      }
    }
  }

  let totalTax;

  if (values.doc.entryType !== ModelNameEnum.Shipment) {
    totalTax = await ((sinvDoc as Invoice) ?? (doc as Payment))?.getTotalTax();
  }

  if (doc.schema.name == ModelNameEnum.Payment) {
    (values.doc as PrintTemplateData).amountPaidInWords = getGrandTotalInWords(
      (doc.amountPaid as Money)?.float
    );
  }

  (values.doc as PrintTemplateData).subTotal = doc.fyo.format(
    ((doc.grandTotal as Money) ?? (doc.amount as Money)).sub(totalTax || 0),
    ModelNameEnum.Currency
  );

  const printSettings = await fyo.doc.getDoc(ModelNameEnum.PrintSettings);
  const printValues = await getPrintTemplateDocValues(
    printSettings,
    printSettingsFields
  );

  const accountingSettings = await fyo.doc.getDoc(
    ModelNameEnum.AccountingSettings
  );
  const accountingValues = await getPrintTemplateDocValues(
    accountingSettings,
    accountingSettingsFields
  );

  values.print = {
    ...printValues,
    ...accountingValues,
  };
  const discountSchema = ['Invoice', 'Quote'];
  if (discountSchema.some((value) => doc.schemaName?.endsWith(value))) {
    (values.doc as PrintTemplateData).totalDiscount =
      formattedTotalDiscount(doc);
  }
  (values.doc as PrintTemplateData).showHSN = showHSN(doc);

  (values.doc as PrintTemplateData).grandTotalInWords = getGrandTotalInWords(
    ((doc.grandTotal as Money) ?? (doc.amount as Money)).float
  );

  (values.doc as PrintTemplateData).date = getDate(doc.date as string);

  if (printSettings.displayTime) {
    (values.doc as PrintTemplateData).time = getTime(doc.date as string);
  }

  if (printSettings.displayDescription) {
    (values.doc as PrintTemplateData).description = showDescription(doc);
  }

  // Generate Pakistani Payment QR Code (JazzCash / EasyPaisa / IBAN)
  const paymentAccount =
    (printSettings.upiId as string) ||
    (printSettings.phone
      ? String(printSettings.phone).replace(/[^0-9+]/g, '')
      : '');

  if (paymentAccount && printSettings.displayPaymentQR !== false) {
    const rawTotal =
      ((doc.grandTotal as Money) ?? (doc.amount as Money))?.float ?? 0;
    const payeeName = printSettings.companyName || 'KarobarPro Store';

    // QR content: readable text with account and amount.
    // Works with any Pakistani bank/wallet QR scanner.
    const paymentText = [
      `${payeeName}`,
      `Account: ${paymentAccount}`,
      rawTotal ? `Amount: Rs. ${rawTotal}` : '',
      doc.name ? `Invoice: ${doc.name}` : '',
    ]
      .filter(Boolean)
      .join('\n');

    try {
      const qrDataUrl = await QRCode.toDataURL(paymentText, {
        width: 220,
        margin: 1,
      });
      (values.doc as PrintTemplateData).paymentQr = qrDataUrl;
      (values.doc as PrintTemplateData).paymentAccount = paymentAccount;
      (values.doc as PrintTemplateData).paymentQrText = paymentText;
    } catch {
      (values.doc as PrintTemplateData).paymentQr = '';
    }
  }

  return values;
}

async function getPaymentDetails(doc: Doc, paymentId: string[]) {
  const paymentIds = paymentId.sort();
  const paymentDetails = [];
  let outstandingAmount = doc.grandTotal as Money;

  for (const payment of paymentIds) {
    const paymentDoc = await doc.fyo.doc.getDoc(ModelNameEnum.Payment, payment);
    outstandingAmount = outstandingAmount.sub(paymentDoc.amount as Money);

    paymentDetails.push({
      amount: doc.fyo.format(paymentDoc.amount, ModelNameEnum.Currency),
      amountPaid: doc.fyo.format(paymentDoc.amountPaid, ModelNameEnum.Currency),
      paymentMethod: paymentDoc.paymentMethod as string,
      outstandingAmount: doc.fyo.format(
        outstandingAmount,
        ModelNameEnum.Currency
      ),
    });
  }

  return paymentDetails;
}

function getDate(dateString: string): string {
  const date = new Date(dateString);
  date.setMonth(date.getMonth());

  return `${date.toLocaleString('default', {
    month: 'short',
  })} ${date.getDate()}, ${date.getFullYear()}`;
}

function getTime(dateString: string): string {
  const date = new Date(dateString);

  return date.toTimeString().split(' ')[0];
}

export function getPrintTemplatePropHints(schemaName: string, fyo: Fyo) {
  const hints: PrintTemplateHint = {};
  const schema = fyo.schemaMap[schemaName]!;
  hints.doc = getPrintTemplateDocHints(schema, fyo);

  const printSettingsHints = getPrintTemplateDocHints(
    fyo.schemaMap[ModelNameEnum.PrintSettings]!,
    fyo,
    printSettingsFields
  );
  const accountingSettingsHints = getPrintTemplateDocHints(
    fyo.schemaMap[ModelNameEnum.AccountingSettings]!,
    fyo,
    accountingSettingsFields
  );

  hints.print = {
    ...printSettingsHints,
    ...accountingSettingsHints,
  };

  if (schemaName?.endsWith('Invoice')) {
    (hints.doc as PrintTemplateData).totalDiscount = fyo.t`Total Discount`;
    (hints.doc as PrintTemplateData).showHSN = fyo.t`Show HSN`;
  }

  return hints;
}

// --- UPGRADED PAKISTANI NUMBER TO WORDS (LAKH / CRORE) ---
function getGrandTotalInWords(total: number) {
  const formattedTotal = total.toFixed(2);
  const [integerPart, decimalPart] = formattedTotal.split('.');

  const ones = ['', t`One`, t`Two`, t`Three`, t`Four`, t`Five`, t`Six`, t`Seven`, t`Eight`, t`Nine`, t`Ten`, t`Eleven`, t`Twelve`, t`Thirteen`, t`Fourteen`, t`Fifteen`, t`Sixteen`, t`Seventeen`, t`Eighteen`, t`Nineteen`];
  const tens = ['', '', t`Twenty`, t`Thirty`, t`Forty`, t`Fifty`, t`Sixty`, t`Seventy`, t`Eighty`, t`Ninety`];

  function convertTwoDigits(num: number): string {
    if (num < 20) return ones[num];
    const ten = Math.floor(num / 10);
    const one = num % 10;
    return tens[ten] + (one > 0 ? ' ' + ones[one] : '');
  }

  let num = parseInt(integerPart);
  if (num === 0) return t`Zero Rupees`;

  let words = '';

  const crores = Math.floor(num / 10000000);
  num %= 10000000;
  const lakhs = Math.floor(num / 100000);
  num %= 100000;
  const thousands = Math.floor(num / 1000);
  num %= 1000;
  const hundreds = Math.floor(num / 100);
  const tensOnes = num % 100;

  if (crores > 0) words += convertTwoDigits(crores) + ` ${t`Crore`} `;
  if (lakhs > 0) words += convertTwoDigits(lakhs) + ` ${t`Lakh`} `;
  if (thousands > 0) words += convertTwoDigits(thousands) + ` ${t`Thousand`} `;
  if (hundreds > 0) words += ones[hundreds] + ` ${t`Hundred`} `;
  if (tensOnes > 0) {
    if (words !== '') words += ` ${t`And`} `;
    words += convertTwoDigits(tensOnes);
  }

  words = words.trim() + ` ${t`Rupees`}`;

  const decimalCents = parseInt(decimalPart);
  if (decimalCents !== 0) {
    words += ` ${t`And`} ` + convertTwoDigits(decimalCents) + ` ${t`Paisa`}`;
  }

  return words + ` ${t`Only`}`;
}

function showHSN(doc: Doc): boolean {
  const items = doc.items;
  if (!Array.isArray(items)) {
    return false;
  }

  return items.map((i: Doc) => i.hsnCode).every(Boolean);
}

function showDescription(doc: Doc): boolean {
  const description = Array.isArray(doc.items)
    ? doc.items.map((item: Doc) => item.description).filter(Boolean)
    : [];
  return description.length > 0;
}

function formattedTotalDiscount(doc: Doc): string {
  if (!(doc instanceof Invoice)) {
    return '';
  }

  const totalDiscount = doc.getTotalDiscount();
  if (!totalDiscount?.float) {
    return '';
  }

  return doc.fyo.format(totalDiscount, ModelNameEnum.Currency);
}

function getPrintTemplateDocHints(
  schema: Schema,
  fyo: Fyo,
  fieldnames?: string[],
  linkLevel?: number
): PrintTemplateHint {
  linkLevel ??= 0;
  const hints: PrintTemplateHint = {};
  const links: PrintTemplateHint = {};

  let fields = schema.fields;
  if (fieldnames) {
    fields = fields.filter((f) => fieldnames.includes(f.fieldname));
  }

  for (const field of fields) {
    const { fieldname, fieldtype, label, meta } = field;
    if (fieldtype === FieldTypeEnum.Attachment || meta) {
      continue;
    }

    hints[fieldname] = label ?? fieldname;
    const { target } = field as TargetField;
    const targetSchema = fyo.schemaMap[target];
    if (fieldtype === FieldTypeEnum.Link && targetSchema && linkLevel < 2) {
      links[fieldname] = getPrintTemplateDocHints(
        targetSchema,
        fyo,
        undefined,
        linkLevel + 1
      );
    }

    if (fieldtype === FieldTypeEnum.Table && targetSchema) {
      hints[fieldname] = [getPrintTemplateDocHints(targetSchema, fyo)];
    }
  }

  hints.submitted = fyo.t`Submitted`;
  hints.entryType = fyo.t`Entry Type`;
  hints.entryLabel = fyo.t`Entry Label`;

  if (Object.keys(links).length) {
    hints.links = links;
  }
  return hints;
}

async function getPrintTemplateDocValues(doc: Doc, fieldnames?: string[]) {
  const values: PrintTemplateData = {};
  if (!(doc instanceof Doc)) {
    return values;
  }

  let fields = doc.schema.fields;
  if (fieldnames) {
    fields = fields.filter((f) => fieldnames.includes(f.fieldname));
  }

  // Set Formatted Doc Data
  for (const field of fields) {
    const { fieldname, fieldtype, meta } = field;
    if (fieldtype === FieldTypeEnum.Attachment || meta) {
      continue;
    }

    const value = doc.get(fieldname);

    if (!value) {
      values[fieldname] = '';
      continue;
    }

    if (!Array.isArray(value)) {
      values[fieldname] = doc.fyo.format(value, field, doc);
      continue;
    }

    const table: PrintTemplateData[] = [];
    for (const row of value) {
      const rowProps = await getPrintTemplateDocValues(row);
      table.push(rowProps);
    }

    values[fieldname] = table;
  }

  values.submitted = doc.submitted;
  values.entryType = doc.schema.name;
  values.entryLabel = doc.schema.label;

  // Set Formatted Doc Link Data
  await doc.loadLinks();
  const links: PrintTemplateData = {};
  for (const [linkName, linkDoc] of Object.entries(doc.links ?? {})) {
    if (fieldnames && !fieldnames.includes(linkName)) {
      continue;
    }

    links[linkName] = await getPrintTemplateDocValues(linkDoc);
  }

  if (Object.keys(links).length) {
    values.links = links;
  }
  return values;
}

export async function getPathAndMakePDF(
  name: string,
  innerHTML: string,
  width: number,
  height: number,
  shouldPrint?: boolean
) {
  if (!shouldPrint) {
    const { filePath: savePath } = await getSavePath(name, 'pdf');
    if (!savePath) {
      return;
    }

    const html = constructPrintDocument(innerHTML);
    const success = await ipc.makePDF(html, savePath, width, height);
    if (success) {
      showExportInFolder(t`Save as PDF Successful`, savePath);
    } else {
      showToast({ message: t`Export Failed`, type: 'error' });
    }
  } else {
    const html = constructPrintDocument(innerHTML);
    const success = await ipc.printDocument(html, width, height);
    if (success) {
      showToast({ message: t`Print Successful`, type: 'success' });
    } else {
      showToast({ message: t`Print Failed`, type: 'error' });
    }
  }
}

function constructPrintDocument(innerHTML: string) {
  const html = document.createElement('html');
  const head = document.createElement('head');
  const body = document.createElement('body');
  const style = getAllCSSAsStyleElem();

  const printCSS = document.createElement('style');
  printCSS.innerHTML = `
    @media print {
      html, body {
        margin: 0 !important;
        padding: 0 !important;
        background: white;
      }

      @page {
        margin: 0;
      }

      * {
        box-sizing: border-box;
        margin: 0;
        padding: 0;
      }
    }
  `;

  head.innerHTML = [
    '<meta charset="UTF-8">',
    '<title>Print Window</title>',
  ].join('\n');

  head.append(style, printCSS);

  body.innerHTML = innerHTML;
  html.append(head, body);
  return html.outerHTML;
}

function getAllCSSAsStyleElem() {
  const cssTexts: string[] = [];
  for (const sheet of document.styleSheets) {
    for (const rule of sheet.cssRules) {
      cssTexts.push(rule.cssText);
    }

    if (sheet.ownerRule) {
      cssTexts.push(sheet.ownerRule.cssText);
    }
  }

  const styleElem = document.createElement('style');
  styleElem.innerHTML = cssTexts.join('\n');
  return styleElem;
}

export async function updatePrintTemplates(fyo: Fyo) {
  const templateFiles = await ipc.getTemplates(
    fyo.singles.PrintSettings?.posPrintWidth as number
  );
  const existingTemplates = (await fyo.db.getAll(ModelNameEnum.PrintTemplate, {
    fields: ['name', 'modified'],
    filters: { isCustom: false },
  })) as { name: string; modified: Date }[];

  const nameModifiedMap = getValueMapFromList(
    existingTemplates,
    'name',
    'modified'
  );

  const updateList: TemplateUpdateItem[] = [];
  for (const templateFile of templateFiles) {
    const updates = getPrintTemplateUpdateList(
      templateFile,
      nameModifiedMap,
      fyo
    );

    updateList.push(...updates);
  }

  const isLogging = fyo.store.skipTelemetryLogging;
  fyo.store.skipTelemetryLogging = true;
  for (const { name, type, template, width, height } of updateList) {
    const doc = await getDocFromNameIfExistsElseNew(
      ModelNameEnum.PrintTemplate,
      name
    );

    const updateData = {
      name,
      type,
      template,
      isCustom: false,
      ...(width ? { width } : {}),
      ...(height ? { height } : {}),
    };

    await doc.set(updateData);
    await doc.sync();
  }
  fyo.store.skipTelemetryLogging = isLogging;
}

function getPrintTemplateUpdateList(
  { file, template, modified: modifiedString, width, height }: TemplateFile,
  nameModifiedMap: Record<string, Date>,
  fyo: Fyo
): TemplateUpdateItem[] {
  const templateList: TemplateUpdateItem[] = [];
  const dbModified = new Date(modifiedString);

  for (const { name, type } of getNameAndTypeFromTemplateFile(file, fyo)) {
    const fileModified = nameModifiedMap[name];
    if (fileModified && dbModified.valueOf() <= fileModified.valueOf()) {
      continue;
    }

    templateList.push({
      height,
      width,
      name,
      type,
      template,
    });
  }
  return templateList;
}

function getNameAndTypeFromTemplateFile(
  file: string,
  fyo: Fyo
): { name: string; type: string }[] {
  /**
   * Template File Name Format:
   * TemplateName[.SchemaName].template.html
   *
   * If the SchemaName is absent then it is assumed
   * that the SchemaName is:
   * - SalesInvoice
   * - SalesQuote
   * - PurchaseInvoice
   */

  const fileName = file.split('.template.html')[0];
  const name = fileName.split('.')[0];
  const schemaName = fileName.split('.')[1];

  if (schemaName) {
    const label = fyo.schemaMap[schemaName]?.label ?? schemaName;
    return [{ name: `${name} - ${label}`, type: schemaName }];
  }

  return [
    ModelNameEnum.SalesInvoice,
    ModelNameEnum.SalesQuote,
    ModelNameEnum.PurchaseInvoice,
  ].map((schemaName) => {
    const label = fyo.schemaMap[schemaName]?.label ?? schemaName;
    return { name: `${name} - ${label}`, type: schemaName };
  });
}

// --- UPGRADED FULL PAKISTANI INVOICE TEMPLATE ---
export const baseTemplate = `
<main class="h-full w-full bg-white text-gray-800 font-sans p-6" style="font-family: {{ print.font }};">

  <!-- Header -->
  <header class="flex justify-between items-start border-b pb-4 mb-6">
    <div>
      <h1 class="text-3xl font-bold mb-1" style="color: {{ print.color }}">
        {{ print.companyName }}
      </h1>
      <p class="text-sm text-gray-500">{{ print.address }}</p>
      <p class="text-sm text-gray-500" v-if="print.phone">Phone: {{ print.phone }}</p>
      <p class="text-sm text-gray-500" v-if="print.taxId">NTN: {{ print.taxId }}</p>
      <p class="text-sm text-gray-500" v-if="print.gstin">STRN: {{ print.gstin }}</p>
    </div>
    <div class="text-right">
      <h2 class="text-2xl font-semibold">{{ doc.entryLabel }}</h2>
      <p class="text-sm font-medium mt-1"># {{ doc.name }}</p>
      <p class="text-sm text-gray-500">Date: {{ doc.date }}</p>
    </div>
  </header>

  <!-- Customer & QR Code -->
  <div class="flex justify-between items-start mb-6">
    <div>
      <h3 class="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Billed To</h3>
      <p class="font-semibold text-lg">{{ doc.links.party.name }}</p>
      <p class="text-sm" v-if="doc.links.party.ntn">NTN: {{ doc.links.party.ntn }}</p>
      <p class="text-sm" v-if="doc.links.party.cnic">CNIC: {{ doc.links.party.cnic }}</p>
      <p class="text-sm" v-if="doc.links.party.phone">Phone: {{ doc.links.party.phone }}</p>
    </div>
    
    <!-- JazzCash/EasyPaisa QR Code -->
    <div class="text-right" v-if="doc.paymentQr">
      <h3 class="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Scan to Pay</h3>
      <img src="{{ doc.paymentQr }}" class="w-24 h-24 inline-block border p-1 rounded" alt="Payment QR" />
      <p class="text-xs text-gray-500 mt-1">{{ doc.paymentAccount }}</p>
    </div>
  </div>

  <!-- Items Table -->
  <div class="mb-6">
    <table class="w-full text-left border-collapse">
      <thead>
        <tr class="border-b-2 border-gray-300 bg-gray-50">
          <th class="p-2 text-sm font-semibold">Item</th>
          <th class="p-2 text-sm font-semibold text-right">Qty</th>
          <th class="p-2 text-sm font-semibold text-right">Rate</th>
          <th class="p-2 text-sm font-semibold text-right">Amount</th>
        </tr>
      </thead>
      <tbody>
        <tr class="border-b" v-for="item in doc.items">
          <td class="p-2 text-sm">{{ item.item }}</td>
          <td class="p-2 text-sm text-right">{{ item.quantity }}</td>
          <td class="p-2 text-sm text-right">{{ item.rate }}</td>
          <td class="p-2 text-sm text-right">{{ item.amount }}</td>
        </tr>
      </tbody>
    </table>
  </div>

  <!-- Totals -->
  <div class="flex justify-end mb-10">
    <div class="w-1/2">
      <div class="flex justify-between py-1 border-b border-gray-200">
        <span class="text-sm text-gray-600">Subtotal</span>
        <span class="text-sm font-medium">{{ doc.subTotal }}</span>
      </div>
      <div class="flex justify-between py-1 border-b border-gray-200" v-if="doc.taxes" v-for="tax in doc.taxes">
        <span class="text-sm text-gray-600">{{ tax.account }}</span>
        <span class="text-sm font-medium">{{ tax.amount }}</span>
      </div>
      <div class="flex justify-between py-2 mt-1 text-lg font-bold">
        <span>Total</span>
        <span style="color: {{ print.color }}">{{ doc.grandTotal }}</span>
      </div>
    </div>
  </div>

  <!-- Footer -->
  <div class="border-t pt-4">
    <p class="text-sm italic text-gray-600"><strong>In Words:</strong> {{ doc.grandTotalInWords }}</p>
    <p class="text-xs text-gray-400 mt-6 text-center">Generated by KarobarPro - Made in Pakistan</p>
  </div>
</main>
`;