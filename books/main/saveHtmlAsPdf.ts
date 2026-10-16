import { App, BrowserWindow } from 'electron';
import fs from 'fs/promises';
import path from 'path';

export async function saveHtmlAsPdf(
  html: string,
  savePath: string,
  app: App,
  width: number, // centimeters
  height: number // centimeters
): Promise<boolean> {
  /**
   * Store received html as a file in a tempdir,
   * this will be loaded into the print view
   */
  const tempRoot = app.getPath('temp');
  const filename = path.parse(savePath).name;
  const htmlPath = path.join(tempRoot, `${filename}.html`);
  await fs.writeFile(htmlPath, html, { encoding: 'utf-8' });

  const effectiveWidth = width > 0 ? width : 21;
  const effectiveHeight = height > 0 ? height : 29.7;

  const printWindow = await getInitializedPrintWindow(htmlPath, effectiveWidth, effectiveHeight);
  const printOptions: any = {
    margins: { top: 0, bottom: 0, left: 0, right: 0 },
    pageSize:
      width > 0 && height > 0
        ? {
            height: height / 2.54,
            width: width / 2.54,
          }
        : 'A4',
    printBackground: true,
  };

  const data = await printWindow.webContents.printToPDF(printOptions);
  await fs.writeFile(savePath, data);
  printWindow.close();
  await fs.unlink(htmlPath);
  return true;
}

export async function getInitializedPrintWindow(
  printFilePath: string,
  width: number,
  height: number
) {
  const winWidth = width > 0 ? width : 21;
  const winHeight = height > 0 ? height : 29.7;

  const printWindow = new BrowserWindow({
    width: Math.floor(winWidth * 28.333333), // pixels
    height: Math.floor(winHeight * 28.333333), // pixels
    show: false,
  });

  await printWindow.loadFile(printFilePath);
  return printWindow;
}
