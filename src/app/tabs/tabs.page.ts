import { Component, inject } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { AsyncPipe } from '@angular/common';

import { TableService } from '../services/table.service';

@Component({
  selector: 'app-tabs',
  templateUrl: './tabs.page.html',
  styleUrls: ['./tabs.page.scss'],
  standalone: true,
  imports: [IonicModule, AsyncPipe]
})
export class TabsPage {
  private tableService = inject(TableService);

  connected$ = this.tableService.connected$;
}
