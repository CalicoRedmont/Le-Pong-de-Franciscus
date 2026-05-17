(function () {
  "use strict";

  class Shuttle {
    constructor(x, y, dir, speed) {
      this.x = x;
      this.y = y;
      this.vx = dir * speed;
      this.vy = (Math.random() - 0.5) * speed * 0.55;
      this.baseSpeed = speed;
      this.speedMultiplier = 1;
      this.r = 12;
      this.trail = [];
      this.safeTime = 0.35;
      this.prevX = x;
      this.prevY = y;
      this.speedBoostActive = false;
      this.speedBoostOwner = "";
      this.speedBoostTarget = "";
      this.speedBoostBaseSpeed = speed;
    }

    get speed() {
      return Math.hypot(this.vx, this.vy);
    }

    update(dt, game) {
      this.safeTime = Math.max(0, this.safeTime - dt);
      this.trail.unshift({ x: this.x, y: this.y });
      this.trail.length = Math.min(this.trail.length, this.speedBoostActive ? 12 : this.speedMultiplier > 1.8 ? 8 : this.speedMultiplier > 1.3 ? 6 : 4);
      this.prevX = this.x;
      this.prevY = this.y;
      this.x += this.vx * dt;
      this.y += this.vy * dt;
      if (this.y - this.r < game.bounds.top) {
        this.y = game.bounds.top + this.r;
        this.vy = Math.abs(this.vy);
        game.onWallHit(this);
      }
      if (this.y + this.r > game.bounds.bottom) {
        this.y = game.bounds.bottom - this.r;
        this.vy = -Math.abs(this.vy);
        game.onWallHit(this);
      }
    }

    reset(x, y, dir, speed) {
      this.x = x;
      this.y = y;
      this.vx = dir * speed;
      this.vy = (Math.random() - 0.5) * speed * 0.55;
      this.baseSpeed = speed;
      this.speedMultiplier = 1;
      this.trail = [];
      this.safeTime = 0.45;
      this.prevX = x;
      this.prevY = y;
      this.clearSpeedBoost();
      this.speedBoostBaseSpeed = speed;
    }

    normalizeTo(speed) {
      const current = Math.max(1, this.speed);
      this.vx = (this.vx / current) * speed;
      this.vy = (this.vy / current) * speed;
    }

    clearSpeedBoost() {
      this.speedBoostActive = false;
      this.speedBoostOwner = "";
      this.speedBoostTarget = "";
      this.speedBoostBaseSpeed = this.baseSpeed || this.speedBoostBaseSpeed;
    }
  }

  window.Shuttle = Shuttle;
})();
