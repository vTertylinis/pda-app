import { Component, inject } from '@angular/core';
import { IonicModule } from '@ionic/angular';

import { TableService } from '../services/table.service';

@Component({
  selector: 'app-tabs',
  templateUrl: './tabs.page.html',
  styleUrls: ['./tabs.page.scss'],
  standalone: true,
  imports: [IonicModule]
})
export class TabsPage {
  private tableService = inject(TableService);


  connected$ = this.tableService.connected$;

}
