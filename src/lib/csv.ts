export function csvCell(value: string | number | Date | null | undefined) {

  let text = value instanceof Date ? value.toISOString() : String(value ?? "");

  if (/^[\t\r\n ]*[=+\-@]/.test(text)) text = `'${text}`;
  
  return `"${text.replaceAll('"', '""')}"`;
}

export function csvDocument(headers: string[], rows: Array<Array<string | number | Date | null | undefined>>) {

  return [headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n");
}
