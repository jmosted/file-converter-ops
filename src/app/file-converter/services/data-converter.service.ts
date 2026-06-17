import { Injectable } from '@angular/core';

export type DataType = 'json' | 'csv' | 'xml' | 'yaml' | 'base64';

const TYPE_LABELS: Record<DataType, string> = {
  json: 'JSON',
  csv: 'CSV',
  xml: 'XML',
  yaml: 'YAML',
  base64: 'BASE64',
};

@Injectable({ providedIn: 'root' })
export class DataConverterService {

  convert(input: string, source: DataType, target: DataType): string {
    if (!input.trim()) return '';

    try {
      const parsed = this.parse(input, source);
      return this.serialize(parsed, target);
    } catch {
      return `No se pudo convertir de ${TYPE_LABELS[source]} a ${TYPE_LABELS[target]}. Revisá que los datos de entrada sean válidos para el formato seleccionado.`;
    }
  }

  /* ── Parse ─────────────────────────────────── */

  private parse(input: string, type: DataType): any {
    switch (type) {
      case 'json':   return JSON.parse(input);
      case 'csv':    return this.parseCSV(input);
      case 'xml':    return this.parseXML(input);
      case 'yaml':   return this.parseYAML(input);
      case 'base64': return JSON.parse(atob(input.trim()));
    }
  }

  private parseCSV(input: string): Record<string, string>[] {
    const lines = input.trim().split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length < 2) throw new Error('CSV debe tener al menos encabezados y una fila');

    const headers = this.parseCSVLine(lines[0]);
    return lines.slice(1).map(line => {
      const values = this.parseCSVLine(line);
      const row: Record<string, string> = {};
      headers.forEach((h, i) => { row[h] = values[i] ?? ''; });
      return row;
    });
  }

  private parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
        else { inQuotes = !inQuotes; }
      } else if (ch === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += ch;
      }
    }
    result.push(current.trim());
    return result;
  }

  private parseXML(input: string): any {
    const xml = input.trim();
    const rootMatch = xml.match(/<(\w+)>/);
    if (!rootMatch) throw new Error('XML inválido: no se encontró etiqueta raíz');

    const rootTag = rootMatch[1];
    const inner = xml.replace(`<${rootTag}>`, '').replace(`</${rootTag}>`, '').trim();

    return this.parseXMLNodes(inner);
  }

  private parseXMLNodes(xml: string): any {
    const items: string[] = [];
    const regex = /<(\w+)>([\s\S]*?)<\/\1>/g;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(xml)) !== null) {
      const tag = match[1];
      const content = match[2].trim();

      const hasNested = new RegExp(`<(${tag})\\b`).test(content) && /\S/.test(content.replace(/<\w+>[\s\S]*?<\/\w+>/g, '').trim());
      const childMatch = [...content.matchAll(/<(\w+)>([\s\S]*?)<\/\1>/g)];

      if (childMatch.length > 0) {
        const obj: any = {};
        for (const cm of childMatch) {
          const childContent = cm[2].trim();
          if (this.isXMLTag(childContent)) {
            obj[cm[1]] = this.parseXMLNodes(`<${cm[1]}>${childContent}</${cm[1]}>`);
          } else {
            obj[cm[1]] = childContent;
          }
        }
        items.push(JSON.stringify(obj));
      } else {
        items.push(content);
      }
    }

    if (items.length === 1) {
      const parsed = JSON.parse(items[0]);
      return typeof parsed === 'object' ? parsed : items[0];
    }
    return items.map(i => {
      try { return JSON.parse(i); } catch { return i; }
    });
  }

  private isXMLTag(s: string): boolean {
    return /^<\w+>[\s\S]*<\/\w+>$/.test(s.trim());
  }

  private parseYAML(input: string): any {
    const lines = input.split('\n');
    const result: any = {};
    const stack: { indent: number; obj: any }[] = [{ indent: -1, obj: result }];

    for (const line of lines) {
      const trimmed = line.trimEnd();
      if (!trimmed.trim() || trimmed.trim().startsWith('#')) continue;

      const indent = trimmed.search(/\S/);
      const content = trimmed.trim();
      const colonIdx = content.indexOf(':');

      if (colonIdx === -1) continue;

      const key = content.slice(0, colonIdx).trim();
      const value = content.slice(colonIdx + 1).trim();

      while (stack.length > 1 && indent <= stack[stack.length - 1].indent) {
        stack.pop();
      }

      const current = stack[stack.length - 1].obj;

      if (value === '') {
        const newObj: any = {};
        if (Array.isArray(current)) {
          current.push(newObj);
          stack.push({ indent, obj: newObj });
        } else {
          current[key] = newObj;
          stack.push({ indent, obj: newObj });
        }
      } else {
        const finalValue = value === 'true' ? true : value === 'false' ? false : !isNaN(Number(value)) ? Number(value) : value;
        if (Array.isArray(current)) {
          const last = current[current.length - 1];
          last[key] = finalValue;
        } else {
          current[key] = finalValue;
        }
      }
    }

    return result;
  }

  /* ── Serialize ──────────────────────────────── */

  private serialize(data: any, type: DataType): string {
    switch (type) {
      case 'json':   return JSON.stringify(data, null, 2);
      case 'csv':    return this.serializeCSV(data);
      case 'xml':    return this.serializeXML(data);
      case 'yaml':   return this.serializeYAML(data);
      case 'base64': return btoa(JSON.stringify(data));
    }
  }

  private serializeCSV(data: any): string {
    if (!Array.isArray(data)) data = [data];
    if (data.length === 0) return '';

    const headers = Object.keys(data[0]);
    const esc = (v: any) => {
      const s = String(v ?? '');
      return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
    };

    return [
      headers.join(','),
      ...data.map((row: Record<string, string>) => headers.map(h => esc(row[h])).join(','))
    ].join('\n');
  }

  private serializeXML(data: any, root = 'root'): string {
    const toXML = (obj: any, tag: string): string => {
      if (obj === null || obj === undefined) return `<${tag}/>`;
      if (typeof obj !== 'object') return `<${tag}>${String(obj)}</${tag}>`;

      if (Array.isArray(obj)) {
        return obj.map(item => toXML(item, tag.slice(0, -1) || 'item')).join('\n');
      }

      return Object.entries(obj).map(([k, v]) => {
        if (Array.isArray(v)) {
          return v.map(item => toXML(item, k)).join('\n');
        }
        if (typeof v === 'object' && v !== null) {
          return `<${k}>\n${this.indent(toXML(v, k))}\n</${k}>`;
        }
        return `<${k}>${String(v)}</${k}>`;
      }).join('\n');
    };

    const isArray = Array.isArray(data);
    const body = isArray
      ? data.map(item => toXML(item, 'item')).join('\n')
      : toXML(data, root.length > 0 && root !== 'root' ? root : Object.keys(data)[0] || 'root');

    return isArray
      ? `<root>\n${this.indent(body)}\n</root>`
      : body;
  }

  private serializeYAML(data: any, indent = 0): string {
    const pad = '  '.repeat(indent);
    let out = '';

    if (data === null || data === undefined) return `${pad}null\n`;
    if (typeof data !== 'object') return `${pad}${String(data)}\n`;

    if (Array.isArray(data)) {
      for (const item of data) {
        if (typeof item === 'object' && item !== null) {
          out += `${pad}- ${this.serializeYAMLLine(item, indent + 1).trimStart()}\n`;
        } else {
          out += `${pad}- ${String(item)}\n`;
        }
      }
      return out;
    }

    for (const [key, value] of Object.entries(data)) {
      if (typeof value === 'object' && value !== null && !(Array.isArray(value) && value.every(v => typeof v !== 'object' || v === null))) {
        out += `${pad}${key}:\n`;
        out += this.serializeYAML(value as any, indent + 1);
      } else {
        out += `${pad}${key}: ${this.serializeYAMLLine(value, indent)}`;
      }
    }
    return out;
  }

  private serializeYAMLLine(value: any, _indent: number): string {
    if (value === null || value === undefined) return 'null\n';
    if (typeof value === 'string') {
      const needsQuotes = /[:\{\}\]\[\],#]/.test(value);
      return needsQuotes ? `"${value}"\n` : `${value}\n`;
    }
    if (Array.isArray(value)) return `[${value.join(', ')}]\n`;
    return `${String(value)}\n`;
  }

  private indent(s: string): string {
    return s.split('\n').map(l => `  ${l}`).join('\n');
  }
}
