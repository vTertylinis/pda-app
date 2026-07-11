import { Component, EventEmitter, Input, Output } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { CustomTable } from '../../services/table.service';

export interface TableOption {
  name: string;          // cart key (number, barX, or custom table id)
  displayName: string;   // what the cashier sees
  isCustom: boolean;
  customTableId?: string;
}

export interface TableActivity {
  count: number;
  total: number;
  unprinted: number;
}

/** Single source of truth for the room's predefined tables. */
export const PREDEFINED_TABLE_NAMES: string[] = Array.from({ length: 40 }, (_, i) => (i + 1).toString());
export const BAR_TABLE_NAMES: string[] = ['bar1', 'bar2', 'bar3', 'bar4'];

@Component({
  selector: 'app-table-grid',
  templateUrl: './table-grid.component.html',
  styleUrls: ['./table-grid.component.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule]
})
export class TableGridComponent {
  /** Custom tables map from TableService. */
  @Input() set customTables(value: { [key: string]: CustomTable } | null) {
    this.customTableOptions = Object.values(value || {})
      .filter(ct => ct.active)
      .map(ct => ({
        name: ct.id,
        displayName: ct.name,
        isCustom: true,
        customTableId: ct.id
      }));
  }

  /** Activity per table id (item count / total / unprinted) for highlighting. */
  @Input() activity: { [tableId: string]: TableActivity } = {};

  /** Table id to render as disabled (e.g. the source table when moving items). */
  @Input() disabledTable: string | null = null;

  /** Show delete button on custom tables. */
  @Input() allowDelete = false;

  @Output() tableSelected = new EventEmitter<TableOption>();
  @Output() deleteTable = new EventEmitter<string>();

  numberTables: TableOption[] = PREDEFINED_TABLE_NAMES.map(name => ({
    name,
    displayName: name,
    isCustom: false
  }));

  barTables: TableOption[] = BAR_TABLE_NAMES.map((name, i) => ({
    name,
    displayName: `Bar ${i + 1}`,
    isCustom: false
  }));

  customTableOptions: TableOption[] = [];

  select(table: TableOption) {
    if (table.name === this.disabledTable) {
      return;
    }
    this.tableSelected.emit(table);
  }

  onDelete(table: TableOption, event: Event) {
    event.stopPropagation();
    if (table.customTableId) {
      this.deleteTable.emit(table.customTableId);
    }
  }

  isOccupied(table: TableOption): boolean {
    return (this.activity[table.name]?.count || 0) > 0;
  }

  itemCount(table: TableOption): number {
    return this.activity[table.name]?.count || 0;
  }

  trackByName(index: number, table: TableOption): string {
    return table.name;
  }
}
