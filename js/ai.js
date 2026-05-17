(function () {
  "use strict";

  class LocalPongAI {
    constructor(paddle, difficultyId) {
      this.paddle = paddle;
      this.setDifficulty(difficultyId || "normal");
      this.error = 0;
      this.reaction = 0;
    }

    setDifficulty(difficultyId) {
      this.difficultyId = difficultyId;
      this.params = window.BadPongConfig.AI_DIFFICULTIES[difficultyId] || window.BadPongConfig.AI_DIFFICULTIES.normal;
    }

    update(dt, game, side) {
      this.reaction -= dt;
      if (this.reaction <= 0) {
        this.error = (Math.random() - 0.5) * this.params.error * 2;
        this.reaction = this.params.reaction;
      }
      const incoming = game.shuttles
        .filter(shuttle => side === "right" ? shuttle.vx > 0 : shuttle.vx < 0)
        .sort((a, b) => side === "right" ? b.x - a.x : a.x - b.x);
      const shuttle = incoming[0] || game.shuttles[0];
      const predicted = shuttle ? game.predictY(shuttle, side) : game.height / 2;
      const adaptiveMultiplier = game.paddleSpeedMultiplier || 1;
      this.paddle.moveToward(predicted + this.error, dt, this.params.speed * adaptiveMultiplier, game.bounds);
    }
  }

  window.LocalPongAI = LocalPongAI;
})();
