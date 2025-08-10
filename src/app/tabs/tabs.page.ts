import { Component, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { DeveloperInfoComponent } from '../components/developer-info/developer-info.component';

@Component({
  selector: 'app-tabs',
  templateUrl: './tabs.page.html',
  styleUrls: ['./tabs.page.scss'],
  standalone: false
})
export class TabsPage implements OnInit {
    private tab2Clicks: number[] = [];
      private clickLimit = 10;
  private timeWindow = 10000; // 10 seconds in ms


  constructor(private modalCtrl: ModalController) { }

  ngOnInit() {
  }

  async handleTab2Click(event: Event) {
    const now = Date.now();

    // Add click timestamp
    this.tab2Clicks.push(now);

    // Keep only clicks within last 10 seconds
    this.tab2Clicks = this.tab2Clicks.filter(
      timestamp => now - timestamp <= this.timeWindow
    );

    // Check if limit reached
    if (this.tab2Clicks.length >= this.clickLimit) {
      this.tab2Clicks = []; // reset to prevent immediate re-trigger

      const modal = await this.modalCtrl.create({
        component: DeveloperInfoComponent,
      });
      await modal.present();

      // Prevent multiple modals during navigation
      event.preventDefault();
      event.stopPropagation();
    }
  }

}
