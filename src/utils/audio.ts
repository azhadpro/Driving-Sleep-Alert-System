import React, { useEffect, useRef } from 'react';

class AlertSound {
  private audioCtx: AudioContext | null = null;
  private oscillator: OscillatorNode | null = null;
  private gainNode: GainNode | null = null;

  init() {
    if (!this.audioCtx) {
      this.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
  }

  play() {
    this.init();
    if (!this.audioCtx) return;
    if (this.oscillator) return; // Already playing

    this.oscillator = this.audioCtx.createOscillator();
    this.gainNode = this.audioCtx.createGain();

    this.oscillator.type = 'square';
    this.oscillator.frequency.setValueAtTime(880, this.audioCtx.currentTime); // A5
    
    this.gainNode.gain.setValueAtTime(0, this.audioCtx.currentTime);
    this.gainNode.gain.linearRampToValueAtTime(0.2, this.audioCtx.currentTime + 0.1);

    this.oscillator.connect(this.gainNode);
    this.gainNode.connect(this.audioCtx.destination);

    this.oscillator.start();
  }

  stop() {
    if (this.oscillator && this.gainNode && this.audioCtx) {
      const ct = this.audioCtx.currentTime;
      this.gainNode.gain.linearRampToValueAtTime(0, ct + 0.1);
      this.oscillator.stop(ct + 0.2);
      this.oscillator = null;
      this.gainNode = null;
    }
  }
}

export const alertSound = new AlertSound();
