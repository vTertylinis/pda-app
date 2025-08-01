import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { Tab2PageRoutingModule } from './tab2-routing.module';

import { Tab2Page } from './tab2.page';
import { TableManagementModalComponent } from '../components/table-management-modal/table-management-modal.component';
import { SelectTableComponent } from '../components/select-table/select-table.component';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    Tab2PageRoutingModule
  ],
  declarations: [
    Tab2Page,
    TableManagementModalComponent,
    SelectTableComponent
  ]
})
export class Tab2PageModule { }
