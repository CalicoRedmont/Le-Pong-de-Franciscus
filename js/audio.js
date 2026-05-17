(function () {
  "use strict";

  const SOUND_ENABLED = true;

  class ArcadeAudio {
    constructor() {
      this.enabled = SOUND_ENABLED;
      this.ctx = null;
    }

    init() {
      if (!this.enabled || this.ctx) return;
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      this.ctx = new AudioContext();
      if (this.ctx.state === "suspended") this.ctx.resume();
    }

    toggle() {
      this.enabled = !this.enabled;
      if (this.enabled) this.init();
      this.play("menu");
      return this.enabled;
    }

    play(type) {
      if (!this.enabled || !this.ctx) return;
      const map = {
        menu: [260, 330, "square", 0.08],
        validate: [440, 660, "square", 0.09],
        bounce: [210, 160, "triangle", 0.045],
        destroy: [620, 920, "square", 0.075],
        bad: [220, 100, "sawtooth", 0.075],
        bonus: [520, 760, "square", 0.075],
        power: [360, 920, "square", 0.09],
        countdown: [520, 520, "square", 0.065],
        go: [780, 1180, "square", 0.095],
        goal: [330, 990, "square", 0.12],
        win: [520, 1040, "square", 0.11],
        lose: [180, 80, "sawtooth", 0.11],
        alert: [880, 440, "sawtooth", 0.075]
      };
      const [start, end, wave, volume] = map[type] || map.menu;
      const now = this.ctx.currentTime;
      const gain = this.ctx.createGain();
      const osc = this.ctx.createOscillator();
      gain.connect(this.ctx.destination);
      osc.connect(gain);
      osc.type = wave;
      osc.frequency.setValueAtTime(start, now);
      osc.frequency.exponentialRampToValueAtTime(Math.max(1, end), now + 0.13);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(volume, now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.19);
      osc.start(now);
      osc.stop(now + 0.21);
    }

    playPeplum() {
      if (!this.enabled || !this.ctx) return;
      const now = this.ctx.currentTime;
      const notes = [
        [392, 0.00, 0.16], [523, 0.16, 0.16], [659, 0.32, 0.16], [784, 0.48, 0.24],
        [659, 0.78, 0.12], [784, 0.92, 0.12], [1046, 1.06, 0.34],
        [784, 1.48, 0.16], [659, 1.66, 0.16], [523, 1.84, 0.16], [392, 2.02, 0.36],
        [330, 2.46, 0.14], [392, 2.62, 0.14], [523, 2.78, 0.36]
      ];
      notes.forEach(([freq, offset, duration], index) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = index % 3 === 0 ? "triangle" : "square";
        osc.frequency.setValueAtTime(freq, now + offset);
        gain.gain.setValueAtTime(0.0001, now + offset);
        gain.gain.exponentialRampToValueAtTime(0.055, now + offset + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + duration);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now + offset);
        osc.stop(now + offset + duration + 0.03);
      });
    }
  }

  window.ArcadeAudio = ArcadeAudio;
})();
