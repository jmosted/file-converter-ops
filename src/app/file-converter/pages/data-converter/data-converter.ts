import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DataConverterService, DataType } from '../../services/data-converter.service';

interface Dataset  {
  label: string,
  value: string
}

@Component({
  selector: 'app-data-converter',
  imports: [FormsModule],
  templateUrl: './data-converter.html'
})
export class DataConverter {
  sourceType = signal<DataType>('json');
  targetType = signal<DataType>('csv');
  inputData = signal('');
  outputData = signal('');

  dataList: Dataset [] = [
    {value: 'json',label: 'JSON'},
    {value: 'csv',label: 'CSV'},
    {value: 'xml',label: 'XML'},
    {value: 'yaml',label: 'YAML'},
    {value: 'base64',label: 'BASE64'},
  ];

  constructor(private converter: DataConverterService) {}

  convert(): void {
    this.outputData.set('');
    if (this.sourceType() === this.targetType()) return;

    const result = this.converter.convert(this.inputData(), this.sourceType(), this.targetType());
    this.outputData.set(result);
  }
}
