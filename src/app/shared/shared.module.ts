import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { ItemDetailModalComponent } from '../components/item-detail-modal/item-detail-modal.component';

@NgModule({
  imports: [CommonModule, FormsModule, IonicModule],
  declarations: [ItemDetailModalComponent],
  exports: [ItemDetailModalComponent],
})
export class SharedModule {}
