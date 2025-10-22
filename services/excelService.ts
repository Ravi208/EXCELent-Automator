
import * as XLSX from 'xlsx';

// This lets TypeScript know that the 'XLSX' object is available globally,
// as it's loaded from a <script> tag in index.html.
declare const XLSX: any;

type Data = (string | number | boolean | null)[][];

export const processExcelFile = (file: File): Promise<Data> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        if (!data) {
            throw new Error("File could not be read.");
        }
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        resolve(jsonData as Data);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = (err) => {
        reject(err);
    }
    reader.readAsArrayBuffer(file);
  });
};

export const downloadExcelFile = (data: Data, fileName: string) => {
  const worksheet = XLSX.utils.aoa_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
  
  // Ensure the filename ends with .xlsx
  const finalFileName = fileName.endsWith('.xlsx') ? fileName : `${fileName}.xlsx`;
  
  XLSX.writeFile(workbook, finalFileName);
};
