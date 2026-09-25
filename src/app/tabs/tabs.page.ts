import { Component, inject, ChangeDetectionStrategy } from '@angular/core';

import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { AsyncPipe } from '@angular/common';

import { TableService } from '../services/table.service';

@Component({
  selector: 'app-tabs',
  templateUrl: './tabs.page.html',
  styleUrls: ['./tabs.page.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [AsyncPipe, RouterOutlet, RouterLink, RouterLinkActive]
})
export class TabsPage {
  private tableService = inject(TableService);


  connected$ = this.tableService.connected$;

}
