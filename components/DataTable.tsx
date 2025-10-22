import React from 'react';

type Data = (string | number | boolean | null)[][];

interface DataTableProps {
  data: Data | null;
}

const MAX_PREVIEW_ROWS = 200;

export const DataTable: React.FC<DataTableProps> = ({ data }) => {
  if (!data || data.length <= 1) { // Also check for header-only array
    return (
      <div className="h-full flex items-center justify-center text-center text-slate-500 py-10">
        <p>No data to display.</p>
      </div>
    );
  }

  const headers = data[0];
  const dataRows = data.slice(1);
  const totalRows = dataRows.length;
  const isTruncated = totalRows > MAX_PREVIEW_ROWS;
  const rowsToDisplay = isTruncated ? dataRows.slice(0, MAX_PREVIEW_ROWS) : dataRows;

  return (
    <div className="flex flex-col h-full">
      <div className="overflow-auto flex-grow border border-slate-200 rounded-lg bg-white">
        <table className="w-full text-sm text-left text-slate-500 table-auto">
          <thead className="text-xs text-slate-700 uppercase bg-slate-100 sticky top-0 z-10">
            <tr>
              {headers.map((header, index) => (
                <th key={index} scope="col" className="px-4 py-3 font-semibold whitespace-nowrap">
                  {String(header)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rowsToDisplay.map((row, rowIndex) => (
              <tr key={rowIndex} className="bg-white border-b last:border-b-0 hover:bg-slate-50">
                {row.map((cell, cellIndex) => (
                  <td key={cellIndex} className="px-4 py-2 whitespace-nowrap">
                    {String(cell === null || cell === undefined ? '' : cell)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {isTruncated && (
        <div className="text-center text-xs text-slate-500 pt-2 flex-shrink-0">
          Showing first {MAX_PREVIEW_ROWS} of {totalRows} rows. The full dataset is processed and can be downloaded.
        </div>
      )}
    </div>
  );
};
