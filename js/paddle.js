(function () {
  "use strict";

  class Paddle {
    constructor(side, x, typeId, color) {
      this.side = side;
      this.x = x;
      const defaultType = (window.BadPongConfig && window.BadPongConfig.DEFAULT_PADDLE_TYPE) || "round";
      this.typeId = typeId || defaultType;
      this.color = color;
      this.baseSpeed = (window.BadPongConfig && window.BadPongConfig.PADDLE_BASE_SPEED) || 390;
      this.speed = this.baseSpeed;
      this.score = 0;
      this.setType(this.typeId);
      this.y = 270 - this.h / 2;
    }

    setType(typeId) {
      const type = window.BadPongConfig.paddleTypeById(typeId);
      this.typeId = type.id;
      this.type = type;
      this.w = type.width;
      this.h = type.height;
    }

    get cx() { return this.x + this.w / 2; }
    get cy() { return this.y + this.h / 2; }

    updateManual(dt, up, down, bounds) {
      let dir = 0;
      if (up) dir -= 1;
      if (down) dir += 1;
      this.y += dir * this.speed * dt;
      this.clamp(bounds);
    }

    moveToward(targetY, dt, maxSpeed, bounds) {
      const delta = targetY - this.cy;
      const step = Math.max(-maxSpeed * dt, Math.min(maxSpeed * dt, delta));
      this.y += step;
      this.clamp(bounds);
    }

    clamp(bounds) {
      this.y = Math.max(bounds.top, Math.min(bounds.bottom - this.h, this.y));
    }

    impact(ball) {
      const rel = Math.max(-1, Math.min(1, (ball.y - this.cy) / (this.h / 2)));
      let angleFactor = rel;
      let speedFactor = this.type.speedFactor || 1;
      if (this.typeId === "round") angleFactor *= 1.22;
      if (this.typeId === "triangle") {
        angleFactor *= 1.48;
      }
      if (this.typeId === "weird") {
        angleFactor += (Math.random() - 0.5) * 0.35;
      }
      return { angleFactor: Math.max(-1.35, Math.min(1.35, angleFactor)), speedFactor };
    }
  }

  window.Paddle = Paddle;
})();
