import * as XLSX from 'xlsx';

export async function GET() {
  const wb = XLSX.utils.book_new();

  // Instructions sheet
  const infoData = [
    ['SmartPro — საწყობის იმპორტის შაბლონი'],
    [''],
    ['გთხოვთ შეავსოთ მე-6 სტრიქონიდან (ყვითელი სათაურის ქვემოდან)'],
    ['სავალდებულო ველები: დასახელება, რაოდენობა, შეძ.ფასი'],
    [''],
    ['#', 'დასახელება *', 'კატეგ.', 'მომწოდ.', 'რაოდ *', 'ერთ.', 'მინ.მარ.', 'შეძ.ფასი *', 'ნამ.%', 'გასაყ.(ავტო)', 'SKU', 'ქვეყ.', 'კომ.'],
    [1, 'HDMI კაბელი 1m', 'კაბელი', 'Hitech', 50, 'ც', 5, 12.00, 25, '=I7*(1+J7/100)', 'HDMI-1M', 'China', ''],
    [2, 'IP კამერა 4MP', 'კამ.', 'Dahua', 10, 'ც', 2, 85.00, 25, '=I8*(1+J8/100)', 'CAM-4MP', 'China', ''],
    [3, '', '', '', '', 'ც', 0, 0, 25, '', '', '', ''],
  ];

  const ws = XLSX.utils.aoa_to_sheet(infoData);

  // Column widths
  ws['!cols'] = [
    { wch: 4 }, { wch: 24 }, { wch: 12 }, { wch: 14 },
    { wch: 8 }, { wch: 6 }, { wch: 8 }, { wch: 10 },
    { wch: 7 }, { wch: 12 }, { wch: 12 }, { wch: 10 }, { wch: 20 },
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'პროდუქცია');

  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

  return new Response(buf, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="warehouse-template.xlsx"',
    },
  });
}
