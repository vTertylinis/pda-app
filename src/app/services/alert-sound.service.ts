import { Injectable } from '@angular/core';

/**
 * Plays a looping alert sound that keeps going until explicitly stopped.
 * Used to force the cashier to respond to incoming online orders.
 *
 * Handles browser/WebView autoplay restrictions by "unlocking" audio on the
 * first user interaction with the app.
 */
@Injectable({ providedIn: 'root' })
export class AlertSoundService {
  private audio: HTMLAudioElement;
  private unlocked = false;
  private wantPlaying = false;

  constructor() {
    this.audio = new Audio('assets/alert.mp3');
    this.audio.loop = true;
    this.audio.preload = 'auto';

    // Unlock audio on the first user gesture (autoplay policy).
    const unlock = () => {
      this.unlocked = true;
      // If something asked to play before we were unlocked, start now.
      if (this.wantPlaying) {
        this.audio.play().catch(() => {});
      }
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
      window.removeEventListener('touchstart', unlock);
    };
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);
    window.addEventListener('touchstart', unlock);
  }

  /** Start (or keep) the looping alarm. Safe to call repeatedly. */
  start() {
    this.wantPlaying = true;
    if (!this.unlocked) return; // will auto-start once unlocked
    if (this.audio.paused) {
      this.audio.currentTime = 0;
      this.audio.play().catch((err) => {
        console.warn('Alert sound could not play yet:', err?.message || err);
      });
    }
  }

  /** Stop the looping alarm. */
  stop() {
    this.wantPlaying = false;
    if (!this.audio.paused) {
      this.audio.pause();
      this.audio.currentTime = 0;
    }
  }

  get isPlaying(): boolean {
    return this.wantPlaying;
  }
}
