import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { IonicModule, ModalController } from '@ionic/angular';

@Component({
  selector: 'app-tabs',
  templateUrl: './tabs.page.html',
  styleUrls: ['./tabs.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonicModule,
  ],
})
export class TabsPage implements OnInit {
    private tab2Clicks: number[] = [];
      private clickLimit = 10;
  private timeWindow = 10000; // 10 seconds in ms


  constructor(private modalCtrl: ModalController) { }

  ngOnInit() {
  }

}
