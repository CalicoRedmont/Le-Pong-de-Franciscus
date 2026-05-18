(function () {
  "use strict";

  const CFG = window.BadPongConfig;

  class Game {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext("2d");
      this.ctx.imageSmoothingEnabled = false;
      this.width = 960;
      this.height = 540;
      this.bounds = { top: 82, bottom: 506, left: 28, right: 932 };
      this.colors = {
        black: "#010201",
        green: "#39ff68",
        greenSoft: "#177c37",
        greenDark: "#061b0c",
        red: "#ff3855",
        white: "#effff2",
        amber: "#ffd04f",
        blue: "#70a8ff",
        cold: "#7c91a8"
      };

      this.audio = new window.ArcadeAudio();
      this.stats = window.BadPongStorage.loadStats();
      this.controls = window.BadPongStorage.loadControls();
      this.creditIntroText = this.pickCreditIntro();
      this.keys = new Set();
      this.touchActive = false;
      this.touchY = this.height / 2;

      this.screen = "title";
      this.mode = "solo";
      this.tournamentBracketContext = "setup";
      this.titleStartedAt = performance.now() / 1000;
      this.messageText = "Renvoie le ballon. Garde la cage debout.";
      this.messageTime = 0;
      this.fullscreenMessageTime = 0;
      this.startupFullscreenPending = true;
      this.lastLoserCommentIndex = -1;
      this.tournamentChampionId = "";
      this.tournamentVictoryStartedAt = 0;
      this.tournamentExitPrompt = null;
      this.tournamentExitConfirmIndex = 0;
      this.tournamentPhaseTransition = null;
      this.tournamentSummaryMatchId = "";
      this.countdownKind = "start";
      this.homeButtonFocused = false;
      this.pendingMatchConfig = null;

      this.menuIndex = 0;
      this.menuItems = [
        { id: "solo", label: "1 PLAYER" },
        { id: "duel", label: "2 PLAYERS" },
        { id: "tournament", label: "TOURNAMENT" },
        { id: "commands", label: "COMMANDES" },
        { id: "how", label: "HOW TO PLAY" },
        { id: "fullscreen", label: "FULL SCREEN" },
        { id: "credits", label: "CREDITS" }
      ];

      this.photo = new Image();
      this.photoLoaded = false;
      this.tryTitlePhoto(CFG.HOME_PHOTO_FILES || ["Francis-Home.png", "Francisco.jpg"], 0);

      this.playerAssets = {};
      this.loadPlayerImages();
      this.resetSelectionState();
      this.resetMatchState();
    }

    loadPlayerImages() {
      for (const player of CFG.PLAYERS) {
        const asset = { img: new Image(), loaded: false, failed: false, file: "" };
        this.playerAssets[player.id] = asset;
        this.tryPlayerImage(player, 0);
      }
    }

    pickCreditIntro() {
      const list = CFG.CREDIT_INTRO_TEXTS || [];
      return list[Math.floor(Math.random() * list.length)] || "Un duel pixelisé à usage festif strictement discutable.";
    }

    tryTitlePhoto(files, index) {
      if (index >= files.length) {
        this.photoLoaded = false;
        return;
      }
      const img = new Image();
      img.onload = () => {
        this.photo = img;
        this.photoLoaded = true;
      };
      img.onerror = () => this.tryTitlePhoto(files, index + 1);
      img.src = `assets/images/${files[index]}`;
    }

    tryPlayerImage(player, index) {
      const asset = this.playerAssets[player.id];
      if (!asset || index >= player.files.length) {
        if (asset) asset.failed = true;
        return;
      }
      const file = player.files[index];
      const img = new Image();
      img.onload = () => {
        asset.img = img;
        asset.loaded = true;
        asset.failed = false;
        asset.file = file;
      };
      img.onerror = () => this.tryPlayerImage(player, index + 1);
      img.src = `assets/images/${file}`;
    }

    resetSelectionState() {
      this.flow = "solo";
      this.playerCursor = 0;
      this.opponentCursor = CFG.PLAYERS.findIndex(player => player.id === "machine");
      this.modeCursor = Math.max(0, CFG.MATCH_MODES.findIndex(mode => mode.id === "speed"));
      this.paddleCursor = 0;
      this.aiDifficultyCursor = this.aiDifficultyIndex("easy");
      this.setupCursor = 0;
      this.tournamentCursor = 0;
      this.commandsCursor = 0;
      this.pauseKeeperRole = "p1";
      this.pauseKeeperShapeFocus = {};
      this.waitingControl = null;
      this.selected = {
        humanId: "francisco",
        p1Id: "francisco",
        p2Id: "julien",
        opponentId: "machine",
        matchMode: "speed",
        aiDifficulty: "easy",
        p1Paddle: "round",
        p2Paddle: "round",
        tournamentMode: "speed",
        tournamentDifficulty: "normal",
        tournamentPaddle: "round",
        tournamentOpponents: []
      };
      this.randomRoulette = {
        active: false,
        timer: 0,
        tick: 0,
        cursor: 0,
        finalId: null
      };
    }

    resetMatchState() {
      this.left = new window.Paddle("left", 50, "round", this.colors.green);
      this.right = new window.Paddle("right", this.width - 70, "round", this.colors.red);
      this.left.power = 0;
      this.right.power = 0;
      this.leftPlayer = CFG.playerById("francisco");
      this.rightPlayer = CFG.playerById("machine");
      this.leftControl = "p1";
      this.rightControl = "ai";
      this.leftAI = null;
      this.rightAI = null;
      this.shuttles = [];
      this.particles = [];
      this.elapsed = 0;
      this.nextMultiballAt = CFG.MULTIBALL_INTERVAL_SECONDS;
      this.scoreCooldown = 0;
      this.goalFlashTime = 0;
      this.goalFlashSide = "";
      this.paddleSpeedMultiplier = 1;
      this.attackerSpeedupLevel = 0;
      this.attackerSpeedupActive = false;
      this.nextAttackerSpeedupAt = CFG.ATTACKER_SPEEDUP_INTERVAL_SECONDS || 30;
      this.matchCountdown = 0;
      this.lastCountdownCue = "";
      this.countdownKind = "start";
      this.machineBoosterTimer = 2.5;
      this.scoreToWin = CFG.SCORE_TO_WIN;
      this.currentMatchConfig = null;
      this.currentMatchMode = CFG.matchModeById("speed");
      this.lastScoredSide = "";
      this.endTitle = "";
      this.endMessage = "";
      this.endSub = "";
      this.endWinnerSide = "";
      this.endLoserComment = "";
      this.speedBoosterArmed = { left: false, right: false };
      this.tournament = null;
      this.tournamentBracketContext = "setup";
      this.tournamentChampionId = "";
      this.tournamentVictoryStartedAt = 0;
      this.tournamentExitPrompt = null;
      this.tournamentExitConfirmIndex = 0;
      this.tournamentPhaseTransition = null;
      this.tournamentSummaryMatchId = "";
      this.pendingMatchConfig = null;
    }

    key(name) {
      return this.keys.has(name);
    }

    startTitle() {
      this.homeButtonFocused = false;
      this.screen = "title";
      this.titleStartedAt = performance.now() / 1000;
      this.message("Menu principal. Aucun sport raisonnable détecté.", 2);
    }

    startSoloFlow() {
      this.flow = "solo";
      if (this.selected.humanId === "machine") this.selected.humanId = "francisco";
      this.selected.opponentId = "machine";
      this.playerCursor = this.playerIndexInEntries(this.selected.humanId, this.playerSelectEntries("solo"));
      this.screen = "playerSelect";
      this.message("Choisis ton héros de surface de réparation.", 2);
    }

    startDuelFlow() {
      this.flow = "duel-p1";
      if (this.selected.p1Id === "machine") this.selected.p1Id = "francisco";
      if (this.selected.p2Id === "machine") this.selected.p2Id = "julien";
      this.playerCursor = this.playerIndexInEntries(this.selected.p1Id, this.playerSelectEntries("duel-p1"));
      this.screen = "playerSelect";
      this.message("Joueur 1 choisit son champion.", 2);
    }

    startTournamentFlow() {
      this.flow = "tournament-player";
      if (this.selected.humanId === "machine") this.selected.humanId = "francisco";
      this.playerCursor = this.playerIndexInEntries(this.selected.humanId, this.playerSelectEntries("tournament-player"));
      this.screen = "playerSelect";
      this.message("Sélection tournoi : Francisco par défaut, gloire possible.", 2);
    }

    playerIndex(id) {
      return Math.max(0, CFG.PLAYERS.findIndex(player => player.id === id));
    }

    playerIndexInEntries(id, entries) {
      return Math.max(0, entries.findIndex(player => player.id === id));
    }

    playerSelectEntries(flow = this.flow) {
      if (flow === "solo" || flow === "duel-p1" || flow === "duel-p2" || flow === "tournament-player") {
        return CFG.PLAYERS.filter(player => player.id !== "machine");
      }
      return CFG.PLAYERS;
    }

    firstDuelPlayerIdExcept(id) {
      const entry = this.playerSelectEntries("duel-p2").find(player => player.id !== id);
      return entry ? entry.id : "francisco";
    }

    tournamentSelectablePlayers() {
      return CFG.PLAYERS.filter(player => player.id !== "machine");
    }

    currentPlayerList(options = {}) {
      let list = CFG.PLAYERS;
      if (options.excludeHuman) list = list.filter(player => player.id !== this.selected.humanId);
      return list;
    }

    beginSetup(flow) {
      this.flow = flow;
      if (flow === "solo-setup") this.selected.opponentId = "machine";
      this.setupCursor = 0;
      this.modeCursor = this.modeIndex(this.selected.matchMode);
      this.paddleCursor = this.paddleIndex(this.selected.p1Paddle);
      this.aiDifficultyCursor = this.aiDifficultyIndex(this.selected.aiDifficulty);
      this.screen = "setupSelect";
    }

    modeIndex(id) {
      return Math.max(0, CFG.MATCH_MODES.findIndex(mode => mode.id === id));
    }

    paddleIndex(id) {
      return Math.max(0, CFG.PADDLE_TYPES.findIndex(paddle => paddle.id === id));
    }

    aiDifficultyIndex(id) {
      return Math.max(0, CFG.AI_DIFFICULTY_IDS.indexOf(id));
    }

    randomOpponentChoices() {
      return CFG.PLAYERS.filter(player => player.id !== this.selected.humanId);
    }

    startRandomOpponent() {
      this.randomRoulette.active = true;
      this.randomRoulette.timer = 1.05;
      this.randomRoulette.tick = 0;
      this.randomRoulette.cursor = 0;
      this.audio.play("menu");
      this.message("Tirage au sort. Le destin porte un survêtement fluo.", 2);
    }

    updateRandomRoulette(dt) {
      if (!this.randomRoulette.active) return;
      const choices = this.randomOpponentChoices();
      if (!choices.length) {
        this.randomRoulette.active = false;
        return;
      }
      this.randomRoulette.timer -= dt;
      this.randomRoulette.tick -= dt;
      if (this.randomRoulette.tick <= 0) {
        this.randomRoulette.cursor = Math.floor(Math.random() * choices.length);
        this.randomRoulette.tick = Math.max(0.045, 0.14 * Math.max(0.2, this.randomRoulette.timer));
        this.audio.play("menu");
      }
      if (this.randomRoulette.timer <= 0) {
        const picked = choices[this.randomRoulette.cursor] || choices[0];
        this.selected.opponentId = picked.id;
        this.opponentCursor = this.playerIndex(picked.id);
        this.randomRoulette.active = false;
        this.message(`${picked.name} entre en piste. Volant conseillé.`, 2.8);
        this.beginSetup("solo-setup");
      }
    }

    update(dt) {
      const safeDt = Math.min(0.033, dt);
      this.messageTime = Math.max(0, this.messageTime - safeDt);
      this.fullscreenMessageTime = Math.max(0, this.fullscreenMessageTime - safeDt);

      if (this.tournamentExitPrompt) return;
      if (this.screen === "opponentSelect") this.updateRandomRoulette(safeDt);
      if (this.screen !== "play") return;

      if (this.matchCountdown > 0) {
        this.playCountdownCue();
        this.matchCountdown = Math.max(0, this.matchCountdown - safeDt);
        return;
      }

      this.elapsed += safeDt;
      this.updateAttackerSpeedup();
      this.scoreCooldown = Math.max(0, this.scoreCooldown - safeDt);
      this.goalFlashTime = Math.max(0, this.goalFlashTime - safeDt);
      this.updateAdaptivePaddleSpeed();
      this.updatePaddle(this.left, this.leftControl, this.leftAI, safeDt, "left");
      this.updatePaddle(this.right, this.rightControl, this.rightAI, safeDt, "right");
      this.updateMachineBooster(safeDt);
      this.updateShuttles(safeDt);
      this.updateParticles(safeDt);

      if (this.currentMatchMode.id === "multi" && this.elapsed >= this.nextMultiballAt) {
        if (this.shuttles.length < CFG.MULTIBALL_MAX && !this.isDeucePoint()) {
          this.addShuttle(this.shuttles.length % 2 === 0 ? 1 : -1);
          this.message("MULTIBALLS : un nouveau ballon entre sans licence.", 2.5);
          this.audio.play("bonus");
        }
        this.nextMultiballAt += CFG.MULTIBALL_INTERVAL_SECONDS;
      }
    }

    updateAdaptivePaddleSpeed() {
      const count = Math.max(1, this.shuttles.length);
      const cappedMax = CFG.BASE_SPEED * CFG.PADDLE_SPEED_SHUTTLE_CAP_MULTIPLIER;
      let fastest = CFG.BASE_SPEED;
      for (const shuttle of this.shuttles || []) {
        fastest = Math.max(fastest, Math.min(cappedMax, shuttle.speed));
      }

      const shuttleBoost = Math.max(0, fastest / CFG.BASE_SPEED - 1) * CFG.PADDLE_SPEED_SHUTTLE_INFLUENCE;
      const multiballBoost = Math.max(0, count - 1) * CFG.PADDLE_SPEED_MULTIBALL_BONUS;
      const multiplier = Math.min(
        CFG.PADDLE_SPEED_MAX_MULTIPLIER,
        Math.max(1, 1 + shuttleBoost + multiballBoost)
      );

      this.paddleSpeedMultiplier = multiplier;
      if (this.left) this.left.speed = this.left.baseSpeed * multiplier;
      if (this.right) this.right.speed = this.right.baseSpeed * multiplier;
    }

    updatePaddle(paddle, role, ai, dt, side) {
      if (role === "ai") {
        if (ai) ai.update(dt, this, side);
        return;
      }

      const up = role === "p1" ? this.controls.p1Up : this.controls.p2Up;
      const down = role === "p1" ? this.controls.p1Down : this.controls.p2Down;
      if (this.touchActive && role === "p1") {
        paddle.moveToward(this.touchY, dt, paddle.speed * 1.35, this.bounds);
      } else {
        paddle.updateManual(dt, this.key(up), this.key(down), this.bounds);
      }
    }

    sideForRole(role) {
      if (this.leftControl === role) return "left";
      if (this.rightControl === role) return "right";
      return "";
    }

    controlsForRole(role) {
      if (role === "p1") return { up: this.controls.p1Up, down: this.controls.p1Down };
      if (role === "p2") return { up: this.controls.p2Up, down: this.controls.p2Down };
      return { up: "", down: "" };
    }

    boostComboLabelForSide(side) {
      const role = side === "left" ? this.leftControl : this.rightControl;
      const controls = this.controlsForRole(role);
      if (!controls.up || !controls.down) return "AUTO";
      return `${this.keyLabel(controls.up)}+${this.keyLabel(controls.down)}`;
    }

    currentBaseSpeed() {
      if (this.currentMatchMode && this.currentMatchMode.id === "normal") {
        return CFG.BASE_SPEED * (CFG.BORING_INITIAL_SPEED_MULTIPLIER || 1.5);
      }
      return CFG.BASE_SPEED;
    }

    currentServeSpeed() {
      return this.currentBaseSpeed() * this.attackerGameSpeedMultiplier();
    }

    attackerGameSpeedMultiplier() {
      const step = CFG.ATTACKER_SPEEDUP_MULTIPLIER || 1.3;
      const level = Math.max(0, this.attackerSpeedupLevel || 0);
      return Math.pow(step, level);
    }

    resetAttackerSpeedupClock() {
      this.attackerSpeedupLevel = 0;
      this.attackerSpeedupActive = this.hasAttackerStyleActive();
      this.nextAttackerSpeedupAt = CFG.ATTACKER_SPEEDUP_INTERVAL_SECONDS || 30;
    }

    hasAttackerStyleActive() {
      return (this.left && this.left.typeId === "weird") || (this.right && this.right.typeId === "weird");
    }

    updateAttackerSpeedup() {
      const interval = CFG.ATTACKER_SPEEDUP_INTERVAL_SECONDS || 30;
      if (!this.hasAttackerStyleActive() || interval <= 0) {
        this.attackerSpeedupActive = false;
        this.nextAttackerSpeedupAt = (this.elapsed || 0) + Math.max(1, interval);
        return;
      }

      if (!this.attackerSpeedupActive) {
        this.attackerSpeedupActive = true;
        this.nextAttackerSpeedupAt = (this.elapsed || 0) + interval;
        return;
      }

      let applied = 0;
      while ((this.elapsed || 0) >= this.nextAttackerSpeedupAt) {
        this.attackerSpeedupLevel += 1;
        this.nextAttackerSpeedupAt += interval;
        applied += 1;
      }
      if (applied > 0) {
        this.applyAttackerSpeedup(Math.pow(CFG.ATTACKER_SPEEDUP_MULTIPLIER || 1.3, applied));
      }
    }

    applyAttackerSpeedup(multiplier) {
      if (!Number.isFinite(multiplier) || multiplier <= 0) return;
      for (const shuttle of this.shuttles || []) {
        const currentSpeed = Math.max(1, shuttle.speed || CFG.BASE_SPEED);
        const baseSpeed = Math.max(1, shuttle.baseSpeed || CFG.BASE_SPEED);
        shuttle.baseSpeed = baseSpeed * multiplier;
        if (shuttle.speedBoostActive) {
          const boostBase = Math.max(1, shuttle.speedBoostBaseSpeed || baseSpeed);
          shuttle.speedBoostBaseSpeed = boostBase * multiplier;
          shuttle.normalizeTo(shuttle.speedBoostBaseSpeed * this.speedBoostMultiplier());
        } else if (this.currentMatchMode && this.currentMatchMode.id === "speed") {
          shuttle.normalizeTo(shuttle.baseSpeed * (shuttle.speedMultiplier || 1));
        } else {
          shuttle.normalizeTo(currentSpeed * multiplier);
        }
      }
      const percent = Math.round((multiplier - 1) * 100);
      if (typeof this.message === "function") this.message(`ATTAQUANT : vitesse du match +${percent}%.`, 2.2);
      if (this.audio && typeof this.audio.play === "function") this.audio.play("power");
    }

    speedBoostMultiplier() {
      if (this.currentMatchMode && this.currentMatchMode.id === "normal") {
        return CFG.BORING_SPEED_BOOST_MULTIPLIER || 3;
      }
      return CFG.SPEED_BOOST_MULTIPLIER;
    }

    speedBoostLabel() {
      const multiplier = this.speedBoostMultiplier();
      if (this.currentMatchMode && this.currentMatchMode.id === "normal") {
        return `+${Math.round((multiplier - 1) * 100)}%`;
      }
      return `x${multiplier}`;
    }

    tryArmSpeedBoosterCombo(role, key) {
      const controls = this.controlsForRole(role);
      if (key !== controls.up && key !== controls.down) return false;
      if (!this.key(controls.up) || !this.key(controls.down)) return false;
      const side = this.sideForRole(role);
      if (!side) return false;
      this.armSpeedBooster(side);
      return true;
    }

    updateMachineBooster(dt) {
      const machineSide = this.rightControl === "ai" && this.rightPlayer && this.isMachinePlayerId(this.rightPlayer.id)
        ? "right"
        : this.leftControl === "ai" && this.leftPlayer && this.isMachinePlayerId(this.leftPlayer.id)
          ? "left"
          : "";
      if (!machineSide) return;

      const paddle = machineSide === "left" ? this.left : this.right;
      if (!paddle || this.speedBoosterArmed[machineSide] || (paddle.power || 0) < 100) {
        this.machineBoosterTimer = Math.max(0.8, this.machineBoosterTimer || 1.4);
        return;
      }

      this.machineBoosterTimer -= dt;
      if (this.machineBoosterTimer > 0) return;
      this.armSpeedBooster(machineSide);
      this.machineBoosterTimer = 4 + Math.random() * 6;
    }

    updateShuttles(dt) {
      for (const shuttle of this.shuttles) {
        shuttle.update(dt, this);
        this.collidePaddle(shuttle, this.left, "left");
        this.collidePaddle(shuttle, this.right, "right");

        this.resolveGoalLine(shuttle);
        if (this.screen !== "play") return;
      }
    }

    resolveGoalLine(shuttle) {
      if (shuttle.x - shuttle.r <= this.bounds.left && shuttle.vx < 0) {
        if (this.isInGoalMouth(shuttle.y, shuttle.r)) {
          this.scorePoint("right", shuttle);
        } else {
          shuttle.x = this.bounds.left + shuttle.r;
          shuttle.vx = Math.abs(shuttle.vx);
          this.onWallHit(shuttle);
        }
      }

      if (shuttle.x + shuttle.r >= this.bounds.right && shuttle.vx > 0) {
        if (this.isInGoalMouth(shuttle.y, shuttle.r)) {
          this.scorePoint("left", shuttle);
        } else {
          shuttle.x = this.bounds.right - shuttle.r;
          shuttle.vx = -Math.abs(shuttle.vx);
          this.onWallHit(shuttle);
        }
      }
    }

    goalBounds() {
      const h = CFG.GOAL_HEIGHT || 176;
      const cy = (this.bounds.top + this.bounds.bottom) / 2;
      return {
        top: cy - h / 2,
        bottom: cy + h / 2
      };
    }

    isInGoalMouth(y, margin = 0) {
      const goal = this.goalBounds();
      return y >= goal.top + margin && y <= goal.bottom - margin;
    }

    updateParticles(dt) {
      for (let i = this.particles.length - 1; i >= 0; i--) {
        const p = this.particles[i];
        p.life -= dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        if (p.life <= 0) this.particles.splice(i, 1);
      }
    }

    collidePaddle(shuttle, paddle, side) {
      if (side === "left" && shuttle.vx >= 0) return;
      if (side === "right" && shuttle.vx <= 0) return;
      if (!this.circleRect(shuttle.x, shuttle.y, shuttle.r, paddle.x, paddle.y, paddle.w, paddle.h)
        && !this.sweptCircleRect(shuttle, paddle)) return;

      const dir = side === "left" ? 1 : -1;
      const speedBoostArrived = shuttle.speedBoostActive && shuttle.speedBoostTarget === side;
      const boostedSaveReward = speedBoostArrived ? (CFG.BOOSTED_SAVE_REWARD || 50) : 0;
      if (speedBoostArrived) this.deactivateSpeedBoost(shuttle, side);
      shuttle.x = side === "left" ? paddle.x + paddle.w + shuttle.r : paddle.x - shuttle.r;
      const impact = paddle.impact(shuttle);
      let speed = Math.max(CFG.BASE_SPEED, shuttle.speed) * impact.speedFactor;

      if (this.currentMatchMode.id === "speed") {
        shuttle.speedMultiplier = Math.min(CFG.SPEEDUP_MAX_MULTIPLIER, shuttle.speedMultiplier * CFG.SPEEDUP_PADDLE_HIT * impact.speedFactor);
        speed = shuttle.baseSpeed * shuttle.speedMultiplier;
      }

      const vxBase = Math.max(CFG.BASE_SPEED * 0.42, speed * (1 - Math.min(0.58, Math.abs(impact.angleFactor) * 0.25)));
      shuttle.vx = dir * vxBase;
      shuttle.vy = impact.angleFactor * speed * 0.72;
      shuttle.normalizeTo(speed);
      if (this.speedBoosterArmed[side] && !shuttle.speedBoostActive) {
        this.activateSpeedBoostShot(shuttle, side, speed);
        this.speedBoosterArmed[side] = false;
      }
      this.chargeSpeedBooster(side, 8 + boostedSaveReward);
      this.explosion(shuttle.x, shuttle.y, side === "left" ? this.colors.green : this.colors.red, 8);
      this.audio.play("bounce");
    }

    sweptCircleRect(shuttle, paddle) {
      const dx = shuttle.x - shuttle.prevX;
      const dy = shuttle.y - shuttle.prevY;
      const steps = Math.max(2, Math.ceil(Math.hypot(dx, dy) / Math.max(4, shuttle.r)));
      for (let i = 1; i <= steps; i++) {
        const t = i / steps;
        const x = shuttle.prevX + dx * t;
        const y = shuttle.prevY + dy * t;
        if (this.circleRect(x, y, shuttle.r, paddle.x, paddle.y, paddle.w, paddle.h)) return true;
      }
      return false;
    }

    onWallHit(shuttle) {
      if (this.currentMatchMode.id === "speed") {
        shuttle.speedMultiplier = Math.min(CFG.SPEEDUP_MAX_MULTIPLIER, shuttle.speedMultiplier * CFG.SPEEDUP_WALL_HIT);
        const normalSpeed = shuttle.baseSpeed * shuttle.speedMultiplier;
        if (shuttle.speedBoostActive) {
          shuttle.speedBoostBaseSpeed = normalSpeed;
          shuttle.normalizeTo(normalSpeed * CFG.SPEED_BOOST_MULTIPLIER);
        } else {
          shuttle.normalizeTo(normalSpeed);
        }
      }
      this.audio.play("bounce");
    }

    scorePoint(side, shuttle) {
      if (shuttle.safeTime > 0) return;
      const scoringPaddle = side === "left" ? this.left : this.right;
      const losingSide = side === "left" ? "right" : "left";
      const serveDir = losingSide === "left" ? -1 : 1;
      this.clearSpeedBoosterState();

      if (this.scoreCooldown <= 0) {
        scoringPaddle.score += 1;
        this.chargeSpeedBooster(side, 18);
        this.lastScoredSide = side;
        this.goalFlashTime = 1.1;
        this.goalFlashSide = side;
        this.message(`GOAL ${this.sideName(side)}. Premier à ${this.scoreToWin}.`, 2.2);
        this.audio.play("goal");
        this.scoreCooldown = CFG.SCORE_COOLDOWN_SECONDS;
      }

      shuttle.reset(this.width / 2, this.height / 2, serveDir, this.currentServeSpeed());
      if (scoringPaddle.score >= this.scoreToWin) this.finishMatch(side);
    }

    finishMatch(winnerSide) {
      winnerSide = this.applyTournamentHumanMachineRule(winnerSide);
      const loserSide = winnerSide === "left" ? "right" : "left";
      this.endWinnerSide = winnerSide;
      this.endTitle = `${this.sideName(winnerSide)} GAGNE`;
      this.endMessage = winnerSide === "left"
        ? "La cage tient debout. Le ballon aussi, globalement."
        : "La Machine sourit. Quelqu'un a rangé les crampons trop tôt.";
      this.endSub = `${this.sideName(winnerSide)} ${this.sideScore(winnerSide)} - ${this.sideScore(loserSide)} ${this.sideName(loserSide)}`;
      this.prepareLoserComment(loserSide);
      this.audio.play(winnerSide === "left" ? "win" : "lose");

      if (this.currentMatchConfig && this.currentMatchConfig.tournamentMatch) {
        this.recordTournamentMatch(winnerSide);
        if (this.tournament && this.tournament.result && this.tournament.result.championId) {
          this.showTournamentVictory();
        } else {
          this.showNextTournamentScreen("afterMatch");
        }
        return;
      } else {
        this.stats = window.BadPongStorage.recordMatch(winnerSide);
      }
      this.screen = "matchEnd";
    }

    applyTournamentHumanMachineRule(winnerSide) {
      if (!this.currentMatchConfig || !this.currentMatchConfig.tournamentMatch) return winnerSide;
      const leftMachine = this.isMachinePlayerId(this.currentMatchConfig.leftPlayerId);
      const rightMachine = this.isMachinePlayerId(this.currentMatchConfig.rightPlayerId);
      if (leftMachine === rightMachine) return winnerSide;
      const humanSide = leftMachine ? "right" : "left";
      if (winnerSide !== humanSide) this.forceMatchWinner(humanSide);
      return humanSide;
    }

    forceMatchWinner(winnerSide) {
      const loserSide = winnerSide === "left" ? "right" : "left";
      const winner = winnerSide === "left" ? this.left : this.right;
      const loser = loserSide === "left" ? this.left : this.right;
      winner.score = Math.max(winner.score || 0, this.scoreToWin);
      loser.score = Math.min(loser.score || 0, Math.max(0, this.scoreToWin - 1));
      return winnerSide;
    }

    isMachinePlayer(player, id) {
      const candidateId = id || (player && player.id);
      if (this.isMachinePlayerId(candidateId)) return true;
      if (player && (player.baseId === "machine" || player.assetId === "machine")) return true;
      const name = this.normalizedPlayerLabel(player && player.name);
      return name === "machine" || name === "lamachine" || name === "ordinateur" || name === "ia" || name === "cpu";
    }

    normalizedPlayerLabel(value) {
      return String(value || "")
        .trim()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, "")
        .toLowerCase();
    }

    recordTournamentMatch(winnerSide) {
      if (!this.tournament || !this.currentMatchConfig) return;
      const item = this.currentMatchConfig.tournamentMatch;
      const leftScore = this.left.score;
      const rightScore = this.right.score;
      item.scoreA = leftScore;
      item.scoreB = rightScore;
      item.score = { A: leftScore, B: rightScore };
      item.winner = winnerSide === "left" ? this.currentMatchConfig.leftPlayerId : this.currentMatchConfig.rightPlayerId;
      item.winnerId = item.winner;
      item.status = "completed";
      item.completedAt = Date.now();
      if (!this.tournament.completedTournamentMatches.includes(item.id)) {
        this.tournament.completedTournamentMatches.push(item.id);
      }
      const next = this.setNextTournamentMatch();
      if (!next) this.finishTournament();
    }

    advanceTournament() {
      if (!this.tournament) return this.startTitle();
      if (this.tournament.result && this.tournament.result.championId) return this.startTitle();
      this.showNextTournamentScreen("afterMatch");
    }

    finishTournament() {
      if (!this.tournament || this.tournament.result) return;
      const final = this.tournament.rounds[this.tournament.rounds.length - 1][0];
      const championId = final ? final.winner : null;
      if (!championId) return;

      const humanId = this.tournament.humanId;
      const completed = this.tournament.matches.filter(match => this.isTournamentMatchScored(match));
      let totalHuman = 0;
      let totalOpponents = 0;
      let best = null;
      let worst = null;

      for (const match of completed) {
        const playerA = this.tournamentSlotValue(match, "A");
        const playerB = this.tournamentSlotValue(match, "B");
        if (playerA.id !== humanId && playerB.id !== humanId) continue;
        const humanScore = playerA.id === humanId ? match.scoreA : match.scoreB;
        const otherScore = playerA.id === humanId ? match.scoreB : match.scoreA;
        const otherId = playerA.id === humanId ? playerB.id : playerA.id;
        const diff = humanScore - otherScore;
        totalHuman += humanScore || 0;
        totalOpponents += otherScore || 0;
        if (!best || diff > best.diff) best = { id: otherId, diff };
        if (!worst || diff < worst.diff) worst = { id: otherId, diff };
      }

      this.tournament.result = {
        championId,
        championName: this.tournamentPlayerById(championId).name,
        beaten: championId === humanId ? Math.max(0, this.tournament.participants.length - 1) : 0,
        lost: championId === humanId ? 0 : 1,
        totalHuman,
        totalOpponents,
        best,
        worst,
        won: championId === humanId
      };
      this.tournament.status = "completed";
      this.stats = window.BadPongStorage.recordTournament(this.tournament.result);
      this.audio.play(this.tournament.result.won ? "win" : "lose");
    }

    showTournamentVictory() {
      if (!this.tournament || !this.tournament.result || !this.tournament.result.championId) return this.startTitle();
      this.tournamentChampionId = this.tournament.result.championId;
      this.tournamentVictoryStartedAt = performance.now() / 1000;
      this.screen = "tournamentVictory";
      if (this.audio.playPeplum) this.audio.playPeplum();
      else this.audio.play("win");
    }

    sideName(side) {
      const player = side === "left" ? this.leftPlayer : this.rightPlayer;
      return player ? player.name : side.toUpperCase();
    }

    loserName(side) {
      const name = this.sideName(side);
      return name && String(name).trim() ? String(name).trim() : "Joueur";
    }

    prepareLoserComment(loserSide) {
      const name = this.loserName(loserSide);
      const comments = CFG.LOSER_COMMENTS || [];
      if (!comments.length) {
        this.endLoserComment = `${name}, la partie a choisi son camp. C'était audacieux.`;
        return;
      }

      let index = Math.floor(Math.random() * comments.length);
      if (comments.length > 1 && index === this.lastLoserCommentIndex) {
        index = (index + 1 + Math.floor(Math.random() * (comments.length - 1))) % comments.length;
      }
      this.lastLoserCommentIndex = index;
      this.endLoserComment = comments[index].replaceAll("{prenom}", name);
    }

    sideScore(side) {
      return side === "left" ? this.left.score : this.right.score;
    }

    isDeucePoint() {
      return this.left.score === CFG.SCORE_TO_WIN - 1 && this.right.score === CFG.SCORE_TO_WIN - 1;
    }

    circleRect(cx, cy, r, rx, ry, rw, rh) {
      const closestX = Math.max(rx, Math.min(cx, rx + rw));
      const closestY = Math.max(ry, Math.min(cy, ry + rh));
      const dx = cx - closestX;
      const dy = cy - closestY;
      return dx * dx + dy * dy <= r * r;
    }

    predictY(shuttle, side) {
      if (!shuttle) return this.height / 2;
      const targetX = side === "right" ? this.right.x : this.left.x + this.left.w;
      const time = (targetX - shuttle.x) / Math.max(1, Math.abs(shuttle.vx)) * (shuttle.vx < 0 ? -1 : 1);
      if (time < 0 || !Number.isFinite(time)) return shuttle.y;
      let y = shuttle.y + shuttle.vy * time;
      const top = this.bounds.top + shuttle.r;
      const bottom = this.bounds.bottom - shuttle.r;
      const span = bottom - top;
      while (y < top || y > bottom) {
        if (y < top) y = top + (top - y);
        if (y > bottom) y = bottom - (y - bottom);
      }
      return Math.max(top, Math.min(bottom, y + (Math.random() - 0.5) * Math.min(12, span * 0.03)));
    }

    addShuttle(dir) {
      const shuttle = new window.Shuttle(this.width / 2, this.height / 2, dir || (Math.random() > 0.5 ? 1 : -1), this.currentServeSpeed());
      shuttle.vy += (Math.random() - 0.5) * 90;
      this.shuttles.push(shuttle);
      return shuttle;
    }

    beginMatch(config) {
      this.pendingMatchConfig = null;
      this.mode = config.kind || "solo";
      this.currentMatchConfig = Object.assign({}, config);
      this.currentMatchMode = CFG.matchModeById(config.modeId || "speed");
      this.scoreToWin = config.scoreToWin || CFG.SCORE_TO_WIN;
      this.leftPlayer = this.resolvePlayerForMatch(config.leftPlayerId);
      this.rightPlayer = this.resolvePlayerForMatch(config.rightPlayerId);
      this.left = new window.Paddle("left", 50, config.leftPaddleType || "round", this.colors.green);
      this.right = new window.Paddle("right", this.width - 70, config.rightPaddleType || "round", this.colors.red);
      this.left.power = 0;
      this.right.power = 0;
      this.leftControl = config.leftControl || "p1";
      this.rightControl = config.rightControl || "ai";
      this.leftAI = this.leftControl === "ai" ? new window.LocalPongAI(this.left, config.leftDifficulty || this.leftPlayer.difficulty) : null;
      this.rightAI = this.rightControl === "ai" ? new window.LocalPongAI(this.right, config.rightDifficulty || this.rightPlayer.difficulty) : null;
      this.shuttles = [];
      this.particles = [];
      this.elapsed = 0;
      this.nextMultiballAt = CFG.MULTIBALL_INTERVAL_SECONDS;
      this.scoreCooldown = 0;
      this.goalFlashTime = 0;
      this.goalFlashSide = "";
      this.paddleSpeedMultiplier = 1;
      this.resetAttackerSpeedupClock();
      this.matchCountdown = 4;
      this.lastCountdownCue = "";
      this.countdownKind = "start";
      this.machineBoosterTimer = 1.8 + Math.random() * 2.8;
      this.lastScoredSide = "";
      this.speedBoosterArmed = { left: false, right: false };
      this.addShuttle(Math.random() > 0.5 ? 1 : -1);
      this.screen = "play";
      this.message(`${this.leftPlayer.name} vs ${this.rightPlayer.name} - ${this.currentMatchMode.label}`, 3);
      this.audio.play("validate");
    }

    startSoloMatch() {
      this.selected.opponentId = "machine";
      this.startMatchIntro({
        kind: "solo",
        leftPlayerId: this.selected.humanId,
        rightPlayerId: "machine",
        leftControl: "p1",
        rightControl: "ai",
        modeId: this.selected.matchMode,
        leftPaddleType: this.selected.p1Paddle,
        rightPaddleType: "round",
        rightDifficulty: this.selected.aiDifficulty
      });
    }

    startDuelMatch() {
      if (this.selected.p1Id === "machine") this.selected.p1Id = "francisco";
      if (this.selected.p2Id === "machine") this.selected.p2Id = this.firstDuelPlayerIdExcept(this.selected.p1Id);
      this.startMatchIntro({
        kind: "duel",
        leftPlayerId: this.selected.p1Id,
        rightPlayerId: this.selected.p2Id,
        leftControl: "p1",
        rightControl: "p2",
        modeId: this.selected.matchMode,
        leftPaddleType: this.selected.p1Paddle,
        rightPaddleType: this.selected.p2Paddle
      });
    }

    startMatchIntro(config) {
      this.pendingMatchConfig = Object.assign({}, config);
      this.screen = "matchIntro";
      const left = this.resolvePlayerForMatch(config.leftPlayerId);
      const right = this.resolvePlayerForMatch(config.rightPlayerId);
      this.message(`${left.name} vs ${right.name}. Les visages ont demandé le protocole.`, 2.4);
      this.audio.play("validate");
    }

    launchPendingMatch() {
      if (!this.pendingMatchConfig) return false;
      const config = Object.assign({}, this.pendingMatchConfig);
      this.beginMatch(config);
      return true;
    }

    buildTournament() {
      const participants = this.normalizeTournamentParticipants();
      if (participants.length < 1) {
        this.message("Il faut au moins un joueur pour faire un tableau. Même absurde.", 2.6);
        return;
      }

      const seed = createTournamentSeed();
      const bracket = createTournamentBracket(participants, { seed });

      this.tournament = {
        tournamentId: `tour-${seed.toString(16)}-${Date.now().toString(36)}`,
        seed,
        humanId: this.selected.humanId,
        humanParticipants: participants,
        participants: bracket.participants,
        bracketSlots: bracket.bracketSlots,
        playersById: bracket.playersById,
        bracketSize: bracket.bracketSize,
        machineCount: bracket.machineCount,
        rounds: bracket.rounds,
        matches: bracket.rounds.flat(),
        modeId: this.selected.tournamentMode,
        aiDifficulty: this.selected.tournamentDifficulty,
        paddleType: this.selected.tournamentPaddle,
        currentMatchId: null,
        currentPhase: "setup",
        status: "active",
        shownTransitions: {},
        lastSimulatedMatchId: "",
        lastAutomaticMatchId: "",
        summaryReturnContext: "afterMatch",
        completedTournamentMatches: [],
        result: null
      };
      this.setNextTournamentMatch();
      this.showNextTournamentScreen("setup");
    }

    normalizeTournamentParticipants() {
      const ids = [];
      const add = id => {
        const player = CFG.playerById(id);
        if (!player || player.id === "machine" || ids.includes(player.id)) return;
        ids.push(player.id);
      };
      add(this.selected.humanId);
      this.selected.tournamentOpponents.forEach(add);
      return ids;
    }

    randomTournamentOpponents(count) {
      const pool = this.tournamentSelectablePlayers()
        .filter(player => player.id !== this.selected.humanId)
        .map(player => player.id)
        .sort(() => Math.random() - 0.5);
      const targetCount = Number.isFinite(count) ? count : pool.length;
      return pool.slice(0, Math.min(targetCount, pool.length));
    }

    findTournamentMatch(id) {
      return this.tournament && this.tournament.matches
        ? this.tournament.matches.find(match => match.id === id)
        : null;
    }

    tournamentPlayerById(id) {
      if (this.tournament && this.tournament.playersById && this.tournament.playersById[id]) {
        return this.tournament.playersById[id];
      }
      return CFG.playerById(id);
    }

    resolvePlayerForMatch(id) {
      return this.tournamentPlayerById(id);
    }

    isMachinePlayerId(id) {
      if (!id) return false;
      const player = this.tournament && this.tournament.playersById ? this.tournament.playersById[id] : null;
      return id === "machine" || /^machine-\d+$/.test(String(id)) || (player && player.baseId === "machine");
    }

    tournamentSlotValue(match, slot) {
      const playerKey = slot === "A" ? "playerA" : "playerB";
      const sourceKey = slot === "A" ? "sourceA" : "sourceB";
      if (!match) return { resolved: false, id: null, label: "À définir" };
      if (!match[sourceKey]) {
        return {
          resolved: !!match[playerKey],
          id: match[playerKey] || null,
          label: match[playerKey] ? this.tournamentPlayerById(match[playerKey]).name : "À définir"
        };
      }
      const source = this.findTournamentMatch(match[sourceKey]);
      if (!source || !this.isTournamentMatchResolved(source)) {
        return { resolved: false, id: null, label: `Vainqueur ${match[sourceKey]}` };
      }
      return {
        resolved: !!source.winner,
        id: source.winner || null,
        label: source.winner ? this.tournamentPlayerById(source.winner).name : `Vainqueur ${match[sourceKey]}`
      };
    }

    tournamentMatchLabel(match) {
      const a = this.tournamentSlotValue(match, "A");
      const b = this.tournamentSlotValue(match, "B");
      return `${match.id} ${a.label} vs ${b.label}`;
    }

    isTournamentMatchResolved(match) {
      return !!match && (match.status === "completed" || match.status === "simulated" || match.status === "advanced");
    }

    isTournamentMatchScored(match) {
      return !!match && (match.status === "completed" || match.status === "simulated" || match.status === "advanced");
    }

    completeTournamentSimulation(match, slotA, slotB) {
      if (!match || !slotA.id || !slotB.id || this.isTournamentMatchResolved(match)) return false;
      const summary = this.simulateMachineMatchSummary(match, slotA.id, slotB.id);
      match.scoreA = summary.scoreA;
      match.scoreB = summary.scoreB;
      match.score = { A: summary.scoreA, B: summary.scoreB };
      match.winner = summary.winnerId;
      match.winnerId = summary.winnerId;
      match.status = "simulated";
      match.simulated = true;
      match.completedAt = Date.now();
      match.summaryData = summary;
      if (!this.tournament.completedTournamentMatches.includes(match.id)) {
        this.tournament.completedTournamentMatches.push(match.id);
      }
      this.tournament.lastSimulatedMatchId = match.id;
      this.tournamentSummaryMatchId = match.id;
      return true;
    }

    completeTournamentHumanAdvancement(match, slotA, slotB, options = {}) {
      if (!match || !slotA.id || !slotB.id) return false;
      if (this.isTournamentMatchResolved(match) && !options.force) return false;
      const pairing = this.tournamentHumanMachinePairing(slotA, slotB);
      if (!pairing) return false;

      const winnerSlot = pairing.human;
      const humanIsA = winnerSlot.id === slotA.id;
      match.scoreA = humanIsA ? CFG.SCORE_TO_WIN : 0;
      match.scoreB = humanIsA ? 0 : CFG.SCORE_TO_WIN;
      match.score = { A: match.scoreA, B: match.scoreB };
      match.winner = winnerSlot.id;
      match.winnerId = winnerSlot.id;
      match.status = "advanced";
      match.automatic = true;
      match.automaticReason = options.played ? "played-human-over-machine" : "human-over-machine";
      match.completedAt = Date.now();
      if (!this.tournament.completedTournamentMatches.includes(match.id)) {
        this.tournament.completedTournamentMatches.push(match.id);
      }
      this.tournament.lastAutomaticMatchId = match.id;
      return true;
    }

    tournamentHumanMachinePairing(slotA, slotB) {
      if (!slotA || !slotB || !slotA.id || !slotB.id) return null;
      const aMachine = this.isMachinePlayerId(slotA.id);
      const bMachine = this.isMachinePlayerId(slotB.id);
      if (aMachine === bMachine) return null;
      return {
        human: aMachine ? slotB : slotA,
        machine: aMachine ? slotA : slotB
      };
    }

    hasHumanPlayedTournamentMatch(humanId, excludedMatchId = "") {
      if (!this.tournament || !humanId) return false;
      return this.tournament.matches.some(match => {
        return match.id !== excludedMatchId
          && match.status === "completed"
          && match.winner === humanId;
      });
    }

    reopenTournamentMatchAndDependents(match) {
      if (!this.tournament || !match) return false;
      const reopened = new Set();
      const reopen = item => {
        if (!item || reopened.has(item.id)) return;
        reopened.add(item.id);
        item.winner = null;
        item.winnerId = null;
        item.status = "upcoming";
        item.scoreA = null;
        item.scoreB = null;
        item.score = null;
        item.automatic = false;
        item.automaticReason = "";
        item.simulated = false;
        item.summaryData = null;
        item.completedAt = null;
        if (this.tournament.currentMatchId === item.id) this.tournament.currentMatchId = null;
        this.tournament.completedTournamentMatches = this.tournament.completedTournamentMatches.filter(id => id !== item.id);
        this.tournament.matches.forEach(candidate => {
          if (candidate.sourceA === item.id || candidate.sourceB === item.id) reopen(candidate);
        });
      };
      reopen(match);
      if (this.tournament.lastAutomaticMatchId && reopened.has(this.tournament.lastAutomaticMatchId)) {
        this.tournament.lastAutomaticMatchId = "";
      }
      if (this.tournament.lastSimulatedMatchId && reopened.has(this.tournament.lastSimulatedMatchId)) {
        this.tournament.lastSimulatedMatchId = "";
      }
      if (this.tournamentSummaryMatchId && reopened.has(this.tournamentSummaryMatchId)) {
        this.tournamentSummaryMatchId = "";
      }
      if (this.tournament.result) this.tournament.result = null;
      return reopened.size > 0;
    }

    simulateMachineMatchSummary(match, playerAId, playerBId) {
      const playerA = this.tournamentPlayerById(playerAId);
      const playerB = this.tournamentPlayerById(playerBId);
      const rng = createSeededRandom(hashTournamentSeed(`${this.tournament.seed}:${match.id}:${playerAId}:${playerBId}`));
      const ratingA = this.machineRating(playerA);
      const ratingB = this.machineRating(playerB);
      const pressure = ratingA - ratingB + (rng() - 0.5) * 1.8;
      const winnerSide = pressure >= 0 ? "A" : "B";
      const scoreToWin = CFG.SCORE_TO_WIN;
      const loserScore = Math.max(0, Math.min(scoreToWin - 1, Math.floor(rng() * scoreToWin)));
      const closeBonus = Math.abs(pressure) < 0.45 && loserScore < scoreToWin - 1 ? 1 : 0;
      const finalLoserScore = Math.min(scoreToWin - 1, loserScore + closeBonus);
      const scoreA = winnerSide === "A" ? scoreToWin : finalLoserScore;
      const scoreB = winnerSide === "B" ? scoreToWin : finalLoserScore;
      const winnerId = winnerSide === "A" ? playerAId : playerBId;
      const loserId = winnerSide === "A" ? playerBId : playerAId;
      const winner = this.tournamentPlayerById(winnerId);
      const loser = this.tournamentPlayerById(loserId);
      const events = [
        "Handshake protocolaire entre deux IA locales.",
        `${winner.name} prend l'avantage sur une trajectoire impossible à justifier.`,
        `${loser.name} tente une correction tardive. Le score refuse.`,
        `Résultat validé : ${playerA.name} ${scoreA} - ${scoreB} ${playerB.name}.`
      ];
      return {
        type: "simulation",
        seed: hashTournamentSeed(`${this.tournament.seed}:${match.id}`),
        matchId: match.id,
        roundLabel: match.roundLabel,
        playerAId,
        playerBId,
        winnerId,
        scoreA,
        scoreB,
        events
      };
    }

    machineRating(player) {
      const id = player && player.difficulty ? player.difficulty : this.tournament.aiDifficulty;
      const order = { easy: 1, normal: 2, hard: 3, boss: 4 };
      return order[id] || order.normal;
    }

    advanceAutomaticTournamentMatches() {
      if (!this.tournament) return false;
      let changed = false;
      let keepGoing = true;
      while (keepGoing) {
        keepGoing = false;
        for (const match of this.tournament.matches) {
          const a = this.tournamentSlotValue(match, "A");
          const b = this.tournamentSlotValue(match, "B");
          const aMachine = a.id && this.isMachinePlayerId(a.id);
          const bMachine = b.id && this.isMachinePlayerId(b.id);
          if (this.isTournamentMatchResolved(match)) {
            const pairing = this.tournamentHumanMachinePairing(a, b);
            const humanPlayed = pairing && this.hasHumanPlayedTournamentMatch(pairing.human.id, match.id);
            if (pairing && match.status === "advanced" && match.automaticReason === "human-over-machine" && !humanPlayed) {
              keepGoing = this.reopenTournamentMatchAndDependents(match) || keepGoing;
              changed = changed || keepGoing;
              continue;
            }
            if (pairing && this.isMachinePlayerId(match.winner) && (match.status === "completed" || humanPlayed)) {
              keepGoing = this.completeTournamentHumanAdvancement(match, a, b, { force: true, played: match.status === "completed" }) || keepGoing;
            }
            changed = changed || keepGoing;
            continue;
          }
          if (!a.resolved || !b.resolved) continue;
          const pairing = this.tournamentHumanMachinePairing(a, b);
          if (pairing && this.hasHumanPlayedTournamentMatch(pairing.human.id, match.id)) {
            keepGoing = this.completeTournamentHumanAdvancement(match, a, b) || keepGoing;
          } else if (a.id && b.id && aMachine && bMachine) {
            keepGoing = this.completeTournamentSimulation(match, a, b) || keepGoing;
          }
          changed = changed || keepGoing;
        }
      }

      const final = this.tournament.rounds[this.tournament.rounds.length - 1][0];
      if (final && this.isTournamentMatchResolved(final) && final.winner && !this.tournament.result) {
        this.finishTournament();
      }
      return changed;
    }

    isTournamentMatchReady(match) {
      if (!match || (match.status !== "upcoming" && match.status !== "current")) return false;
      const a = this.tournamentSlotValue(match, "A");
      const b = this.tournamentSlotValue(match, "B");
      return a.resolved && b.resolved && !!a.id && !!b.id;
    }

    tournamentMatchPlayPriority(match) {
      if (!this.isTournamentMatchReady(match)) return 99;
      const a = this.tournamentSlotValue(match, "A");
      const b = this.tournamentSlotValue(match, "B");
      const aMachine = this.isMachinePlayerId(a.id);
      const bMachine = this.isMachinePlayerId(b.id);
      if (!aMachine && !bMachine) return 0;
      if (aMachine !== bMachine) return 1;
      return 2;
    }

    compareTournamentPlayableMatches(a, b) {
      const priority = this.tournamentMatchPlayPriority(a) - this.tournamentMatchPlayPriority(b);
      if (priority) return priority;
      const round = a.roundIndex - b.roundIndex;
      if (round) return round;
      return a.matchIndex - b.matchIndex;
    }

    setNextTournamentMatch() {
      if (!this.tournament) return null;
      this.advanceAutomaticTournamentMatches();
      if (this.tournament.result && this.tournament.result.championId) {
        this.tournament.currentMatchId = null;
        return null;
      }
      for (const match of this.tournament.matches) {
        if (match.status === "current") match.status = "upcoming";
      }
      const playable = this.tournament.matches
        .filter(match => this.isTournamentMatchReady(match))
        .sort((a, b) => this.compareTournamentPlayableMatches(a, b));
      const next = playable[0] || null;
      this.tournament.currentMatchId = next ? next.id : null;
      if (next) next.status = "current";
      return next || null;
    }

    getCurrentTournamentMatch() {
      if (!this.tournament || !this.tournament.currentMatchId) return null;
      return this.findTournamentMatch(this.tournament.currentMatchId);
    }

    showTournamentBracket(context = "afterMatch") {
      this.tournamentBracketContext = context;
      this.screen = "tournamentBracket";
      this.audio.play("menu");
    }

    showNextTournamentScreen(context = "afterMatch") {
      if (!this.tournament) return this.startTitle();
      if (this.tournament.result && this.tournament.result.championId) return this.showTournamentVictory();
      const next = this.setNextTournamentMatch() || this.getCurrentTournamentMatch();
      const transition = next ? this.pendingTournamentPhaseTransition(next) : null;
      if (transition) {
        this.openTournamentPhaseTransition(transition, context);
        return;
      }
      this.showTournamentBracket(context);
    }

    pendingTournamentPhaseTransition(nextMatch) {
      if (!this.tournament || !nextMatch || nextMatch.roundIndex < 0) return null;
      const entrants = this.qualifiedParticipantsForRound(nextMatch.roundIndex);
      const count = entrants.length;
      if (count !== 8 && count !== 4 && count !== 2) return null;
      const key = `top${count}`;
      if (this.tournament.shownTransitions && this.tournament.shownTransitions[key]) return null;
      return {
        key,
        count,
        title: count === 8 ? "TOP 8" : count === 4 ? "TOP 4" : "FINALE",
        subtitle: count === 8 ? "ENTRÉE EN QUARTS DE FINALE" : count === 4 ? "ENTRÉE EN DEMI-FINALES" : "DERNIER DUEL",
        participants: entrants
      };
    }

    qualifiedParticipantsForRound(roundIndex) {
      if (!this.tournament) return [];
      const ids = [];
      if (roundIndex === 0) {
        const slots = this.tournament.bracketSlots || [];
        slots.forEach(id => {
          if (id && !ids.includes(id)) ids.push(id);
        });
      } else {
        const previous = this.tournament.rounds[roundIndex - 1] || [];
        previous.forEach(match => {
          if (this.isTournamentMatchResolved(match) && match.winner && !ids.includes(match.winner)) {
            ids.push(match.winner);
          }
        });
      }
      return ids.map(id => this.tournamentPlayerById(id)).filter(Boolean);
    }

    openTournamentPhaseTransition(transition, returnContext) {
      this.tournament.shownTransitions[transition.key] = true;
      this.tournament.currentPhase = transition.key;
      this.tournamentPhaseTransition = Object.assign({ returnContext }, transition, {
        startedAt: performance.now() / 1000
      });
      this.screen = "tournamentPhaseTransition";
      this.audio.play("validate");
    }

    continueTournamentPhaseTransition() {
      const context = this.tournamentPhaseTransition ? this.tournamentPhaseTransition.returnContext : "afterMatch";
      this.tournamentPhaseTransition = null;
      this.showTournamentBracket(context);
    }

    viewTournamentMatchSummary(matchId) {
      const match = this.findTournamentMatch(matchId);
      if (!match || !match.summaryData) return false;
      this.tournamentSummaryMatchId = match.id;
      if (this.tournament) this.tournament.summaryReturnContext = this.tournamentBracketContext || "afterMatch";
      this.screen = "tournamentSummary";
      this.audio.play("menu");
      return true;
    }

    returnFromTournamentSummary() {
      const context = this.tournament && this.tournament.summaryReturnContext ? this.tournament.summaryReturnContext : "afterMatch";
      this.showTournamentBracket(context);
    }

    startTournamentMatch() {
      if (!this.tournament) return this.startTitle();
      const item = this.setNextTournamentMatch();
      if (!item) {
        if (this.tournament.result && this.tournament.result.championId) return this.showTournamentVictory();
        return this.showTournamentBracket("afterMatch");
      }
      const playerA = this.tournamentSlotValue(item, "A");
      const playerB = this.tournamentSlotValue(item, "B");
      if (!playerA.resolved || !playerB.resolved || !playerA.id || !playerB.id) {
        this.setNextTournamentMatch();
        return this.showTournamentBracket("afterMatch");
      }
      item.status = "current";
      this.tournament.currentMatchId = item.id;
      const leftIsMachine = this.isMachinePlayerId(playerA.id);
      const rightIsMachine = this.isMachinePlayerId(playerB.id);
      this.beginMatch({
        kind: "tournament",
        leftPlayerId: playerA.id,
        rightPlayerId: playerB.id,
        leftControl: leftIsMachine ? "ai" : "p1",
        rightControl: rightIsMachine ? "ai" : "p2",
        modeId: this.tournament.modeId,
        leftPaddleType: leftIsMachine ? "round" : this.tournament.paddleType,
        rightPaddleType: rightIsMachine ? "round" : this.tournament.paddleType,
        leftDifficulty: leftIsMachine ? "normal" : undefined,
        rightDifficulty: rightIsMachine ? "normal" : undefined,
        scoreToWin: CFG.SCORE_TO_WIN,
        tournamentMatch: item
      });
    }

    restartCurrentMatch() {
      if (this.currentMatchConfig) {
        if (this.currentMatchConfig.tournamentMatch) this.beginMatch(this.currentMatchConfig);
        else this.startMatchIntro(this.currentMatchConfig);
      }
      else this.startTitle();
    }

    quitMatch() {
      if (this.currentMatchConfig && this.currentMatchConfig.tournamentMatch && this.openTournamentExitPrompt("match")) return;
      this.message("Partie quittée. Le gardien nie toute responsabilité.", 2);
      this.startTitle();
    }

    cycleRacketForRole(role) {
      const side = this.leftControl === role ? "left" : this.rightControl === role ? "right" : "";
      if (!side) return false;
      const paddle = side === "left" ? this.left : this.right;
      const index = this.paddleIndex(paddle.typeId);
      const next = CFG.PADDLE_TYPES[wrap(index + 1, CFG.PADDLE_TYPES.length)];
      return this.setRacketForRole(role, next.id);
    }

    setRacketForRole(role, typeId) {
      const side = this.leftControl === role ? "left" : this.rightControl === role ? "right" : "";
      if (!side) return false;
      const paddle = side === "left" ? this.left : this.right;
      const next = CFG.paddleTypeById(typeId);
      paddle.setType(next.id);
      paddle.clamp(this.bounds);
      if (this.currentMatchConfig) {
        if (side === "left") this.currentMatchConfig.leftPaddleType = next.id;
        else this.currentMatchConfig.rightPaddleType = next.id;
      }
      if (role === "p1") this.selected.p1Paddle = next.id;
      if (role === "p2") this.selected.p2Paddle = next.id;
      this.setPauseKeeperFocusedType(role, next.id);
      this.message(`${role.toUpperCase()} gardien : ${next.shapeLabel || next.label}.`, 2);
      this.audio.play("menu");
      return true;
    }

    pauseKeeperRoles() {
      const roles = [];
      if (this.sideForRole("p1")) roles.push("p1");
      if (this.sideForRole("p2")) roles.push("p2");
      return roles;
    }

    ensurePauseKeeperRole() {
      const roles = this.pauseKeeperRoles();
      if (!roles.length) return "";
      if (!roles.includes(this.pauseKeeperRole)) this.pauseKeeperRole = roles[0];
      return this.pauseKeeperRole;
    }

    pauseKeeperCurrentType(role) {
      const side = this.sideForRole(role);
      const paddle = side === "left" ? this.left : this.right;
      return paddle ? paddle.typeId : CFG.PADDLE_TYPES[0].id;
    }

    pauseKeeperFocusedType(role = this.pauseKeeperRole) {
      const current = this.pauseKeeperCurrentType(role);
      const focused = this.pauseKeeperShapeFocus && this.pauseKeeperShapeFocus[role];
      return CFG.PADDLE_TYPES.some(type => type.id === focused) ? focused : current;
    }

    setPauseKeeperFocusedType(role, typeId) {
      if (!this.pauseKeeperShapeFocus) this.pauseKeeperShapeFocus = {};
      const type = CFG.paddleTypeById(typeId);
      this.pauseKeeperShapeFocus[role] = type.id;
      return type.id;
    }

    syncPauseKeeperFocus(role = this.pauseKeeperRole) {
      const current = this.pauseKeeperCurrentType(role);
      this.setPauseKeeperFocusedType(role, current);
      return current;
    }

    movePauseKeeperRole(dir) {
      const roles = this.pauseKeeperRoles();
      if (!roles.length) return false;
      const current = this.ensurePauseKeeperRole();
      const index = Math.max(0, roles.indexOf(current));
      this.pauseKeeperRole = roles[wrap(index + dir, roles.length)];
      this.syncPauseKeeperFocus(this.pauseKeeperRole);
      this.audio.play("menu");
      return true;
    }

    changePauseKeeperShape(dir) {
      const role = this.ensurePauseKeeperRole();
      if (!role) return false;
      const index = this.paddleIndex(this.pauseKeeperFocusedType(role));
      const next = CFG.PADDLE_TYPES[wrap(index + dir, CFG.PADDLE_TYPES.length)];
      this.setPauseKeeperFocusedType(role, next.id);
      this.audio.play("menu");
      return true;
    }

    validatePauseKeeperShape() {
      const role = this.ensurePauseKeeperRole();
      if (!role) return false;
      return this.setRacketForRole(role, this.pauseKeeperFocusedType(role));
    }

    focusPauseHomeButton() {
      this.homeButtonFocused = true;
      this.audio.play("menu");
      return true;
    }

    blurPauseHomeButton() {
      this.homeButtonFocused = false;
      this.ensurePauseKeeperRole();
      this.syncPauseKeeperFocus(this.pauseKeeperRole);
      this.audio.play("menu");
      return true;
    }

    applyPauseKeeperShape(dir) {
      const role = this.ensurePauseKeeperRole();
      if (!role) return false;
      const side = this.sideForRole(role);
      const paddle = side === "left" ? this.left : this.right;
      if (!paddle) return false;
      const index = this.paddleIndex(paddle.typeId);
      const next = CFG.PADDLE_TYPES[wrap(index + dir, CFG.PADDLE_TYPES.length)];
      return this.setRacketForRole(role, next.id);
    }

    pauseActionButtons() {
      const defs = [];
      const roles = this.pauseKeeperRoles();
      this.ensurePauseKeeperRole();
      const optionW = 132;
      const optionH = 64;
      const roleW = 60;
      const gap = 12;
      const rowGap = 88;
      const top = roles.length > 1 ? 188 : 244;
      const totalW = roleW + CFG.PADDLE_TYPES.length * optionW + Math.max(0, CFG.PADDLE_TYPES.length - 1) * gap;
      const startX = (this.width - totalW) / 2;
      roles.forEach((role, rowIndex) => {
        const side = this.sideForRole(role);
        const paddle = side === "left" ? this.left : this.right;
        const y = top + rowIndex * rowGap;
        CFG.PADDLE_TYPES.forEach((type, typeIndex) => {
          const selected = paddle && paddle.typeId === type.id;
          const focusedType = this.pauseKeeperFocusedType(role);
          defs.push({
            action: `racket-${role}-${type.id}`,
            kind: "keeper-shape",
            role,
            roleLabel: role === "p1" ? "J1" : "J2",
            showRoleLabel: typeIndex === 0,
            side,
            typeId: type.id,
            label: type.shapeLabel || type.label,
            selected,
            focused: !this.homeButtonFocused && this.pauseKeeperRole === role && focusedType === type.id,
            x: startX + roleW + typeIndex * (optionW + gap),
            y,
            w: optionW,
            h: optionH,
            color: selected ? this.colors.amber : this.colors.green
          });
        });
      });
      if (this.currentMatchConfig && this.currentMatchConfig.tournamentMatch) {
        defs.push({
          action: "bracket",
          label: "TABLEAU DU TOURNOI",
          x: 366,
          y: top + roles.length * rowGap + 10,
          w: 228,
          h: 30,
          color: this.colors.green
        });
      }
      return defs;
    }

    homeButtonRect() {
      return { x: this.width - 140, y: 42, w: 96, h: 26 };
    }

    shouldShowHomeButton() {
      return this.screen !== "title" && this.screen !== "play";
    }

    handleHomeButtonPointer(x, y) {
      if (!this.shouldShowHomeButton()) return false;
      const rect = this.homeButtonRect();
      if (!inside(x, y, rect.x, rect.y, rect.w, rect.h)) return false;
      this.audio.play("validate");
      this.goHome();
      return true;
    }

    handleHomeButtonKey(key) {
      if (!this.shouldShowHomeButton()) return false;
      if (this.homeButtonFocused) {
        if (key === "Enter") {
          this.audio.play("validate");
          this.goHome();
          return true;
        }
        if (this.isDirectionalKey(key)) {
          this.homeButtonFocused = false;
          this.audio.play("menu");
          return true;
        }
        return false;
      }
      if (!this.shouldFocusHomeButtonFromKey(key)) return false;
      this.homeButtonFocused = true;
      this.audio.play("menu");
      return true;
    }

    isDirectionalKey(key) {
      return key === "ArrowUp" || key === "ArrowDown" || key === "ArrowLeft" || key === "ArrowRight"
        || key === "z" || key === "s" || key === "q" || key === "d";
    }

    shouldFocusHomeButtonFromKey(key) {
      if (key !== "ArrowUp" && key !== "z") {
        const passiveScreens = ["how", "credits", "tournamentBracket", "tournamentVictory", "tournamentIntro", "tournamentPhaseTransition", "tournamentSummary", "matchEnd", "tournamentEnd", "pause"];
        return passiveScreens.includes(this.screen) && this.isDirectionalKey(key);
      }
      if (this.screen === "commands") return this.commandsCursor === 0;
      if (this.screen === "setupSelect" || this.screen === "tournamentSetup") return this.setupCursor === 0;
      if (this.screen === "playerSelect") return this.playerCursor < 4;
      if (this.screen === "opponentSelect") return this.opponentCursor < 4;
      if (this.screen === "tournamentOpponents") return this.tournamentCursor < 4;
      return ["how", "credits", "tournamentBracket", "tournamentVictory", "tournamentIntro", "tournamentPhaseTransition", "tournamentSummary", "matchEnd", "tournamentEnd", "pause"].includes(this.screen);
    }

    goHome() {
      if (this.openTournamentExitPrompt("home")) return true;
      this.startTitle();
      return true;
    }

    isTournamentInProgress() {
      return !!(this.tournament && (!this.tournament.result || !this.tournament.result.championId));
    }

    isTournamentScreen() {
      if (this.screen === "play" || this.screen === "pause" || this.screen === "matchEnd") {
        return !!(this.currentMatchConfig && this.currentMatchConfig.tournamentMatch);
      }
      return [
        "tournamentBracket",
        "tournamentIntro",
        "tournamentPhaseTransition",
        "tournamentSummary"
      ].includes(this.screen);
    }

    openTournamentExitPrompt(reason = "home") {
      if (!this.isTournamentInProgress() || !this.isTournamentScreen()) return false;
      this.tournamentExitPrompt = {
        reason,
        openedFrom: this.screen,
        resumeCountdown: this.screen === "play" && !!(this.currentMatchConfig && this.currentMatchConfig.tournamentMatch),
        saved: !!(window.BadPongStorage && window.BadPongStorage.saveTournamentState)
      };
      this.tournamentExitConfirmIndex = 0;
      this.audio.play("menu");
      return true;
    }

    cancelTournamentExit() {
      const shouldCountdown = this.tournamentExitPrompt && this.tournamentExitPrompt.resumeCountdown;
      this.tournamentExitPrompt = null;
      this.tournamentExitConfirmIndex = 0;
      if (shouldCountdown) this.armTournamentResumeCountdown();
      this.audio.play("menu");
    }

    armTournamentResumeCountdown() {
      this.matchCountdown = 3;
      this.lastCountdownCue = "";
      this.countdownKind = "resume";
      this.message("Reprise dans 3 secondes.", 1.4);
    }

    confirmTournamentExit() {
      if (window.BadPongStorage && window.BadPongStorage.saveTournamentState && this.tournament) {
        this.captureTournamentLiveState();
        window.BadPongStorage.saveTournamentState(this.tournament);
      }
      this.tournamentExitPrompt = null;
      this.tournamentPhaseTransition = null;
      this.tournamentSummaryMatchId = "";
      this.currentMatchConfig = null;
      this.tournament = null;
      this.startTitle();
    }

    captureTournamentLiveState() {
      if (!this.currentMatchConfig || !this.currentMatchConfig.tournamentMatch) return;
      const match = this.currentMatchConfig.tournamentMatch;
      match.inProgressState = {
        scoreA: this.left ? this.left.score : null,
        scoreB: this.right ? this.right.score : null,
        elapsed: this.elapsed || 0,
        screen: this.screen
      };
    }

    handleTournamentExitPromptKey(key) {
      if (!this.tournamentExitPrompt) return false;
      if (key === "Escape") {
        this.cancelTournamentExit();
        return true;
      }
      if (key === "ArrowLeft" || key === "ArrowRight" || key === "q" || key === "d") {
        this.tournamentExitConfirmIndex = this.tournamentExitConfirmIndex === 0 ? 1 : 0;
        this.audio.play("menu");
        return true;
      }
      if (key === "Enter" || key === " ") {
        if (this.tournamentExitConfirmIndex === 0) this.cancelTournamentExit();
        else this.confirmTournamentExit();
        return true;
      }
      return true;
    }

    handleTournamentExitPromptPointer(x, y) {
      if (!this.tournamentExitPrompt) return false;
      const buttons = this.tournamentExitButtons();
      for (let index = 0; index < buttons.length; index++) {
        const button = buttons[index];
        if (!inside(x, y, button.x, button.y, button.w, button.h)) continue;
        this.tournamentExitConfirmIndex = index;
        if (index === 0) this.cancelTournamentExit();
        else this.confirmTournamentExit();
        return true;
      }
      return true;
    }

    tournamentExitButtons() {
      return [
        { x: 260, y: 332, w: 210, h: 36, label: "CONTINUER LE TOURNOI" },
        { x: 490, y: 332, w: 210, h: 36, label: "QUITTER VERS L'ACCUEIL" }
      ];
    }

    handlePauseAction(action) {
      const match = /^racket-(p[12])-(.+)$/.exec(action);
      if (match) {
        this.pauseKeeperRole = match[1];
        return this.setRacketForRole(match[1], match[2]);
      }
      if (action === "racket-p1") return this.cycleRacketForRole("p1");
      if (action === "racket-p2") return this.cycleRacketForRole("p2");
      if (action === "bracket" && this.currentMatchConfig && this.currentMatchConfig.tournamentMatch) {
        this.showTournamentBracket("pause");
        return true;
      }
      return false;
    }

    handlePointerDown(x, y) {
      if (this.tournamentExitPrompt) return this.handleTournamentExitPromptPointer(x, y);
      if (this.screen === "title") return this.handleTitlePointer(x, y);
      if (this.handleHomeButtonPointer(x, y)) return true;
      if (this.screen === "playerSelect") return this.handlePlayerSelectPointer(x, y);
      if (this.screen === "opponentSelect") return this.handleOpponentSelectPointer(x, y);
      if (this.screen === "setupSelect") return this.handleSetupPointer(x, y);
      if (this.screen === "matchIntro") return this.handleMatchIntroPointer(x, y);
      if (this.screen === "tournamentOpponents") return this.handleTournamentOpponentsPointer(x, y);
      if (this.screen === "tournamentSetup") return this.handleTournamentSetupPointer(x, y);
      if (this.screen === "tournamentBracket") return this.handleTournamentBracketPointer(x, y);
      if (this.screen === "tournamentVictory") return this.handleTournamentVictoryPointer(x, y);
      if (this.screen === "tournamentPhaseTransition") return this.handleTournamentPhaseTransitionPointer(x, y);
      if (this.screen === "tournamentSummary") return this.handleTournamentSummaryPointer(x, y);
      if (this.screen === "tournamentIntro") {
        if (inside(x, y, 145, 130, 670, 292)) this.startTournamentMatch();
        return true;
      }
      if (this.screen === "pause") return this.handlePausePointer(x, y);
      if (this.screen !== "play") return false;
      if (inside(x, y, 694, 511, 64, 22)) {
        this.goHome();
        return true;
      }
      if (inside(x, y, 766, 511, 76, 22)) return this.cycleRacketForRole("p1");
      if (this.rightControl === "p2" && inside(x, y, 850, 511, 76, 22)) return this.cycleRacketForRole("p2");
      return false;
    }

    handleTitlePointer(x, y) {
      const index = menuIndexAt(x, y, 72, 219, 286, 28, 31, this.menuItems.length);
      if (index < 0) return false;
      this.menuIndex = index;
      this.handleTitleKey("Enter");
      return true;
    }

    handlePlayerSelectPointer(x, y) {
      const entries = this.playerSelectEntries();
      const index = gridIndexAt(x, y, entries.length);
      if (index < 0) return false;
      this.playerCursor = index;
      this.handlePlayerSelectKey("Enter");
      return true;
    }

    handleOpponentSelectPointer(x, y) {
      const total = CFG.PLAYERS.length + 1;
      const index = gridIndexAt(x, y, total);
      if (index < 0) return false;
      this.opponentCursor = index;
      this.handleOpponentSelectKey("Enter");
      return true;
    }

    handleSetupPointer(x, y) {
      const row = optionRowAt(x, y, 184, 72, 3);
      if (row >= 0) {
        this.setupCursor = row;
        if (x > 430) this.changeSetupValue(1);
        return true;
      }
      if (inside(x, y, 390, 398, 180, 34)) {
        if (this.flow === "solo-setup") this.startSoloMatch();
        else this.startDuelMatch();
        return true;
      }
      return false;
    }

    handleMatchIntroPointer(x, y) {
      if (inside(x, y, 340, 456, 280, 38)) {
        this.launchPendingMatch();
        return true;
      }
      return true;
    }

    handleTournamentOpponentsPointer(x, y) {
      const players = this.tournamentSelectablePlayers();
      const total = players.length + 2;
      const index = gridIndexAt(x, y, total);
      if (index < 0) return false;
      this.tournamentCursor = index;
      this.handleTournamentOpponentsKey("Enter");
      return true;
    }

    handleTournamentSetupPointer(x, y) {
      const row = optionRowAt(x, y, 178, 74, 3);
      if (row >= 0) {
        this.setupCursor = row;
        if (x > 430) this.changeTournamentSetup(1);
        return true;
      }
      if (inside(x, y, 300, 438, 360, 36)) {
        this.buildTournament();
        return true;
      }
      return false;
    }

    handleTournamentBracketPointer(x, y) {
      if (!this.tournament) return false;
      if (this.tournamentBracketContext === "pause") {
        if (inside(x, y, 330, 474, 300, 34)) {
          this.screen = "play";
          this.audio.play("validate");
          return true;
        }
        return false;
      }
      const summaryId = this.tournamentSummaryMatchId || this.tournament.lastSimulatedMatchId;
      if (summaryId && inside(x, y, 708, 404, 182, 24)) {
        return this.viewTournamentMatchSummary(summaryId);
      }
      if (inside(x, y, 320, 474, 320, 34)) {
        if (this.tournament.result && this.tournament.result.championId) this.goHome();
        else this.startTournamentMatch();
        return true;
      }
      return false;
    }

    handlePausePointer(x, y) {
      const buttons = this.pauseActionButtons();
      for (const button of buttons) {
        if (inside(x, y, button.x, button.y, button.w, button.h)) {
          return this.handlePauseAction(button.action);
        }
      }
      return false;
    }

    handleTournamentVictoryPointer(x, y) {
      if (inside(x, y, 350, 488, 260, 34)) {
        this.startTitle();
        return true;
      }
      return false;
    }

    handleTournamentPhaseTransitionPointer(x, y) {
      if (inside(x, y, 340, 476, 280, 34) || inside(x, y, 0, 0, this.width, this.height)) {
        this.continueTournamentPhaseTransition();
        return true;
      }
      return false;
    }

    handleTournamentSummaryPointer(x, y) {
      if (inside(x, y, 350, 476, 260, 34)) {
        this.returnFromTournamentSummary();
        return true;
      }
      return false;
    }

    chargeSpeedBooster(side, amount) {
      const paddle = side === "left" ? this.left : this.right;
      const before = paddle.power || 0;
      paddle.power = Math.min(100, before + amount);
      if (before < 100 && paddle.power >= 100) {
        const combo = this.boostComboLabelForSide(side);
        const suffix = combo === "AUTO" ? " Activation automatique." : ` Appuie ${combo}.`;
        this.message(`${this.sideName(side)} prêt pour ${CFG.FATAL_BOOSTER_LABEL}.${suffix}`, 2.4);
      }
    }

    activateSpeedBoostShot(shuttle, side, normalSpeed) {
      const target = side === "left" ? "right" : "left";
      const baseSpeed = Math.max(1, normalSpeed || shuttle.speed);
      const multiplier = this.speedBoostMultiplier();
      shuttle.speedBoostActive = true;
      shuttle.speedBoostOwner = side;
      shuttle.speedBoostTarget = target;
      shuttle.speedBoostBaseSpeed = baseSpeed;
      shuttle.normalizeTo(baseSpeed * multiplier);
      this.message(`${CFG.FATAL_BOOSTER_LABEL} ${this.speedBoostLabel()} déclenché par ${this.sideName(side)}.`, 2.4);
      this.explosion(shuttle.x, shuttle.y, this.colors.amber, 18);
      this.audio.play("power");
    }

    deactivateSpeedBoost(shuttle, side) {
      shuttle.normalizeTo(Math.max(CFG.BASE_SPEED, shuttle.speedBoostBaseSpeed || CFG.BASE_SPEED));
      shuttle.clearSpeedBoost();
      if (side) this.message(`${CFG.FATAL_BOOSTER_LABEL} réceptionné par ${this.sideName(side)}. Vitesse normale.`, 1.8);
    }

    clearSpeedBoosterState() {
      this.speedBoosterArmed = { left: false, right: false };
      for (const shuttle of this.shuttles) {
        if (shuttle.speedBoostActive) {
          shuttle.normalizeTo(Math.max(CFG.BASE_SPEED, shuttle.speedBoostBaseSpeed || CFG.BASE_SPEED));
        }
        if (shuttle.clearSpeedBoost) shuttle.clearSpeedBoost();
      }
    }

    armSpeedBooster(side) {
      const paddle = side === "left" ? this.left : this.right;
      const label = this.boostComboLabelForSide(side);
      if (this.speedBoosterArmed[side]) {
        this.message(`${CFG.FATAL_BOOSTER_LABEL} ${this.sideName(side)} déjà armé. Prochain contact ballon.`, 2);
        return;
      }
      if ((paddle.power || 0) < 100) {
        this.message(`${CFG.FATAL_BOOSTER_LABEL} ${this.sideName(side)} pas prêt. Recharge encore avant ${label}.`, 1.8);
        return;
      }
      paddle.power = 0;
      this.speedBoosterArmed[side] = true;
      this.message(`${CFG.FATAL_BOOSTER_LABEL} ${this.sideName(side)} armé. Prochaine frappe : vitesse ${this.speedBoostLabel()}.`, 3);
      this.audio.play("power");
    }

    explosion(x, y, color, count = 14) {
      for (let i = 0; i < count; i++) {
        const a = Math.random() * Math.PI * 2;
        const s = 60 + Math.random() * 140;
        this.particles.push({
          x,
          y,
          vx: Math.cos(a) * s,
          vy: Math.sin(a) * s,
          size: 2 + Math.random() * 4,
          color,
          life: 0.25 + Math.random() * 0.35
        });
      }
    }

    message(text, time = 2.5) {
      this.messageText = text;
      this.messageTime = time;
    }

    countdownLabel() {
      if (this.countdownKind === "resume") {
        if (this.matchCountdown > 2) return "3";
        if (this.matchCountdown > 1) return "2";
        if (this.matchCountdown > 0.25) return "1";
        if (this.matchCountdown > 0) return "REPRISE";
        return "";
      }
      if (this.matchCountdown > 3) return "3";
      if (this.matchCountdown > 2) return "2";
      if (this.matchCountdown > 1) return "1";
      if (this.matchCountdown > 0) return "GO!";
      return "";
    }

    playCountdownCue() {
      const label = this.countdownLabel();
      if (!label || label === this.lastCountdownCue) return;
      this.lastCountdownCue = label;
      this.audio.play(label === "GO!" || label === "REPRISE" ? "go" : "countdown");
    }

    handleKeyDown(key) {
      if (key === CFG.SOUND_TOGGLE_KEY) {
        this.audio.toggle();
        return;
      }
      if (key === "f") {
        this.toggleFullscreen();
        return;
      }

      if (this.waitingControl) {
        this.captureControl(key);
        return;
      }

      if (this.tournamentExitPrompt) return this.handleTournamentExitPromptKey(key);
      if (key === "Home") return this.goHome();
      if (this.screen === "pause") return this.handlePauseKey(key);
      if (this.handleHomeButtonKey(key)) return;
      if (this.screen === "title") return this.handleTitleKey(key);
      if (this.screen === "how" || this.screen === "credits") return this.handleSimplePanelKey(key);
      if (this.screen === "commands") return this.handleCommandsKey(key);
      if (this.screen === "playerSelect") return this.handlePlayerSelectKey(key);
      if (this.screen === "opponentSelect") return this.handleOpponentSelectKey(key);
      if (this.screen === "setupSelect") return this.handleSetupKey(key);
      if (this.screen === "matchIntro") return this.handleMatchIntroKey(key);
      if (this.screen === "tournamentOpponents") return this.handleTournamentOpponentsKey(key);
      if (this.screen === "tournamentSetup") return this.handleTournamentSetupKey(key);
      if (this.screen === "tournamentBracket") return this.handleTournamentBracketKey(key);
      if (this.screen === "tournamentVictory") return this.handleTournamentVictoryKey(key);
      if (this.screen === "tournamentPhaseTransition") return this.handleTournamentPhaseTransitionKey(key);
      if (this.screen === "tournamentSummary") return this.handleTournamentSummaryKey(key);
      if (this.screen === "tournamentIntro") return this.handleTournamentIntroKey(key);
      if (this.screen === "play") return this.handlePlayKey(key);
      if (this.screen === "matchEnd") return this.handleMatchEndKey(key);
      if (this.screen === "tournamentEnd") return this.handleTournamentEndKey(key);
    }

    handleTitleKey(key) {
      if (key === "1") return this.startSoloFlow();
      if (key === "2") return this.startDuelFlow();
      if (key === "ArrowUp" || key === "z") return this.moveMenu(-1, this.menuItems.length, "menuIndex");
      if (key === "ArrowDown" || key === "s") return this.moveMenu(1, this.menuItems.length, "menuIndex");
      if (key !== "Enter") return;
      const selected = this.menuItems[this.menuIndex].id;
      this.audio.play("validate");
      if (selected === "solo") this.startSoloFlow();
      if (selected === "duel") this.startDuelFlow();
      if (selected === "tournament") this.startTournamentFlow();
      if (selected === "commands") this.screen = "commands";
      if (selected === "how") this.screen = "how";
      if (selected === "fullscreen") this.toggleFullscreen();
      if (selected === "credits") {
        this.stats = window.BadPongStorage.loadStats();
        this.screen = "credits";
      }
    }

    handleSimplePanelKey(key) {
      if (key === "Escape" || key === "Enter") this.startTitle();
    }

    handleCommandsKey(key) {
      const rows = 5;
      if (key === "Escape") return this.startTitle();
      if (key === "ArrowUp" || key === "z") return this.moveMenu(-1, rows, "commandsCursor");
      if (key === "ArrowDown" || key === "s") return this.moveMenu(1, rows, "commandsCursor");
      if (key === "Enter") {
        if (this.commandsCursor === rows - 1) {
          this.controls = window.BadPongStorage.resetControls();
          this.message("Commandes réinitialisées. Le clavier respire.", 2);
          this.audio.play("validate");
        } else {
          this.waitingControl = ["p1Up", "p1Down", "p2Up", "p2Down"][this.commandsCursor];
          this.message("Appuie sur une nouvelle touche. Échap annule.", 2);
          this.audio.play("menu");
        }
      }
    }

    captureControl(key) {
      if (key === "Escape") {
        this.waitingControl = null;
        this.message("Modification annulée.", 1.5);
        return;
      }
      this.controls[this.waitingControl] = key;
      window.BadPongStorage.saveControls(this.controls);
      this.waitingControl = null;
      this.message("Commande enregistrée. Le clavier accepte son destin.", 2);
      this.audio.play("validate");
    }

    handlePlayerSelectKey(key) {
      const entries = this.playerSelectEntries();
      if (key === "Escape") return this.startTitle();
      if (key === "ArrowLeft" || key === "q") return this.moveGrid(-1, entries.length, "playerCursor");
      if (key === "ArrowRight" || key === "d") return this.moveGrid(1, entries.length, "playerCursor");
      if (key === "ArrowUp" || key === "z") return this.moveGridVertical(-1, entries.length, "playerCursor");
      if (key === "ArrowDown" || key === "s") return this.moveGridVertical(1, entries.length, "playerCursor");
      if (key !== "Enter") return;

      const picked = entries[this.playerCursor] || entries[0];
      this.audio.play("validate");
      if (this.flow === "solo") {
        this.selected.humanId = picked.id;
        this.selected.opponentId = "machine";
        this.beginSetup("solo-setup");
      } else if (this.flow === "duel-p1") {
        this.selected.p1Id = picked.id;
        this.flow = "duel-p2";
        const nextId = this.selected.p2Id === picked.id || this.selected.p2Id === "machine"
          ? this.firstDuelPlayerIdExcept(picked.id)
          : this.selected.p2Id;
        this.playerCursor = this.playerIndexInEntries(nextId, this.playerSelectEntries());
      } else if (this.flow === "duel-p2") {
        if (picked.id === "machine") {
          this.message("La Machine reste au vestiaire en 2 joueurs.", 2);
          return;
        }
        this.selected.p2Id = picked.id;
        this.beginSetup("duel-setup");
      } else if (this.flow === "tournament-player") {
        this.selected.humanId = picked.id;
        this.selected.tournamentOpponents = this.selected.tournamentOpponents.filter(id => id !== picked.id);
        this.tournamentCursor = 0;
        this.screen = "tournamentOpponents";
      }
    }

    handleOpponentSelectKey(key) {
      const total = CFG.PLAYERS.length + 1;
      if (key === "Escape") return this.startSoloFlow();
      if (this.randomRoulette.active) return;
      if (key === "ArrowLeft" || key === "q") return this.moveGrid(-1, total, "opponentCursor");
      if (key === "ArrowRight" || key === "d") return this.moveGrid(1, total, "opponentCursor");
      if (key === "ArrowUp" || key === "z") return this.moveGridVertical(-1, total, "opponentCursor");
      if (key === "ArrowDown" || key === "s") return this.moveGridVertical(1, total, "opponentCursor");
      if (key === "Enter") {
        if (this.opponentCursor >= CFG.PLAYERS.length) return this.startRandomOpponent();
        const picked = CFG.PLAYERS[this.opponentCursor];
        if (picked.id === this.selected.humanId) {
          this.message("Choisis quelqu'un d'autre, sinon le match devient une réunion miroir.", 2);
          return;
        }
        this.selected.opponentId = picked.id;
        this.audio.play("validate");
        this.beginSetup("solo-setup");
      }
    }

    handleSetupKey(key) {
      const optionRows = 3;
      const maxRows = optionRows + 1;
      if (key === "Escape") {
        if (this.flow === "solo-setup") this.startSoloFlow();
        else this.startDuelFlow();
        return;
      }
      if (key === "ArrowUp" || key === "z") return this.moveMenu(-1, maxRows, "setupCursor");
      if (key === "ArrowDown" || key === "s") return this.moveMenu(1, maxRows, "setupCursor");
      if (key === "ArrowLeft" || key === "q") return this.changeSetupValue(-1);
      if (key === "ArrowRight" || key === "d") return this.changeSetupValue(1);
      if (key === "Enter") {
        if (this.flow === "solo-setup") this.startSoloMatch();
        else this.startDuelMatch();
      }
    }

    handleMatchIntroKey(key) {
      if (key === "Escape") {
        this.screen = "setupSelect";
        this.audio.play("menu");
        return;
      }
      if (key === "Enter" || key === " ") {
        this.launchPendingMatch();
      }
    }

    changeSetupValue(dir) {
      if (this.setupCursor >= 3) return;
      if (this.setupCursor === 0) {
        this.modeCursor = wrap(this.modeCursor + dir, CFG.MATCH_MODES.length);
        this.selected.matchMode = CFG.MATCH_MODES[this.modeCursor].id;
      } else if (this.setupCursor === 1) {
        this.paddleCursor = wrap(this.paddleCursor + dir, CFG.PADDLE_TYPES.length);
        this.selected.p1Paddle = CFG.PADDLE_TYPES[this.paddleCursor].id;
      } else if (this.flow === "solo-setup") {
        this.aiDifficultyCursor = wrap(this.aiDifficultyCursor + dir, CFG.AI_DIFFICULTY_IDS.length);
        this.selected.aiDifficulty = CFG.AI_DIFFICULTY_IDS[this.aiDifficultyCursor];
      } else {
        const idx = this.paddleIndex(this.selected.p2Paddle);
        this.selected.p2Paddle = CFG.PADDLE_TYPES[wrap(idx + dir, CFG.PADDLE_TYPES.length)].id;
      }
      this.audio.play("menu");
    }

    handleTournamentOpponentsKey(key) {
      const players = this.tournamentSelectablePlayers();
      const total = players.length + 2;
      if (key === "Escape") return this.startTournamentFlow();
      if (key === "ArrowLeft" || key === "q") return this.moveGrid(-1, total, "tournamentCursor");
      if (key === "ArrowRight" || key === "d") return this.moveGrid(1, total, "tournamentCursor");
      if (key === "ArrowUp" || key === "z") return this.moveGridVertical(-1, total, "tournamentCursor");
      if (key === "ArrowDown" || key === "s") return this.moveGridVertical(1, total, "tournamentCursor");
      if (key !== "Enter" && key !== " ") return;
      if (this.tournamentCursor === players.length) {
        this.selected.tournamentOpponents = this.randomTournamentOpponents();
        this.message("TOUT LE MONDE : liste complète mélangée avant tirage du tableau.", 2.3);
      } else if (this.tournamentCursor === players.length + 1) {
        this.screen = "tournamentSetup";
        this.setupCursor = 0;
      } else {
        const picked = players[this.tournamentCursor];
        if (picked.id === this.selected.humanId) {
          this.message("Le tournoi contre soi-même est une réunion de copropriété.", 2);
          return;
        }
        const list = this.selected.tournamentOpponents;
        const existing = list.indexOf(picked.id);
        if (existing >= 0) list.splice(existing, 1);
        else list.push(picked.id);
      }
      this.audio.play("validate");
    }

    handleTournamentSetupKey(key) {
      if (key === "Escape") {
        this.screen = "tournamentOpponents";
        return;
      }
      if (key === "ArrowUp" || key === "z") return this.moveMenu(-1, 3, "setupCursor");
      if (key === "ArrowDown" || key === "s") return this.moveMenu(1, 3, "setupCursor");
      if (key === "ArrowLeft" || key === "q") return this.changeTournamentSetup(-1);
      if (key === "ArrowRight" || key === "d") return this.changeTournamentSetup(1);
      if (key === "Enter") {
        this.audio.play("validate");
        this.buildTournament();
      }
    }

    changeTournamentSetup(dir) {
      if (this.setupCursor === 0) {
        const idx = this.modeIndex(this.selected.tournamentMode);
        this.selected.tournamentMode = CFG.MATCH_MODES[wrap(idx + dir, CFG.MATCH_MODES.length)].id;
      } else if (this.setupCursor === 1) {
        const idx = this.paddleIndex(this.selected.tournamentPaddle);
        this.selected.tournamentPaddle = CFG.PADDLE_TYPES[wrap(idx + dir, CFG.PADDLE_TYPES.length)].id;
      } else {
        this.message("Machines ajoutées automatiquement, simulations IA prêtes.", 1.8);
      }
      this.audio.play("menu");
    }

    handleTournamentIntroKey(key) {
      if (key === "Escape") return this.goHome();
      if (key === "Enter") return this.startTournamentMatch();
    }

    handleTournamentBracketKey(key) {
      if (!this.tournament) return this.startTitle();
      if (this.tournamentBracketContext === "pause") {
        if (key === "Enter" || key === CFG.PAUSE_KEY) {
          this.screen = "play";
          this.audio.play("validate");
        } else if (key === "Escape") {
          this.screen = "pause";
          this.audio.play("menu");
        }
        return;
      }
      const summaryId = this.tournamentSummaryMatchId || this.tournament.lastSimulatedMatchId;
      if ((key === "v" || key === "r") && summaryId) return this.viewTournamentMatchSummary(summaryId);
      if (key === "Escape") return this.goHome();
      if (key === "Enter" || key === "r") {
        if (this.tournament.result && this.tournament.result.championId) return this.goHome();
        return this.startTournamentMatch();
      }
    }

    handleTournamentVictoryKey(key) {
      if (key === "Enter" || key === "Escape" || key === "r") this.startTitle();
    }

    handleTournamentPhaseTransitionKey(key) {
      if (key === "Escape") return this.goHome();
      if (key === "Enter" || key === " ") return this.continueTournamentPhaseTransition();
    }

    handleTournamentSummaryKey(key) {
      if (key === "Escape" || key === "Enter" || key === " ") return this.returnFromTournamentSummary();
    }

    handlePlayKey(key) {
      if (key === CFG.PAUSE_KEY) {
        this.ensurePauseKeeperRole();
        this.syncPauseKeeperFocus(this.pauseKeeperRole);
        this.homeButtonFocused = false;
        this.screen = "pause";
        this.audio.play("menu");
      } else if (key === "r") {
        this.restartCurrentMatch();
      } else if (key === "Escape") {
        if (this.currentMatchConfig && this.currentMatchConfig.tournamentMatch) this.goHome();
        else this.quitMatch();
      } else if (this.tryArmSpeedBoosterCombo("p1", key)) {
        return;
      } else if (this.tryArmSpeedBoosterCombo("p2", key)) {
        return;
      }
    }

    handlePauseKey(key) {
      if (this.homeButtonFocused) {
        if (key === "Enter") return this.goHome();
        if (key === "ArrowDown" || key === "s") return this.blurPauseHomeButton();
        if (key === "Escape") {
          this.homeButtonFocused = false;
          if (this.currentMatchConfig && this.currentMatchConfig.tournamentMatch) this.goHome();
          else this.quitMatch();
          return;
        }
        if (key === CFG.PAUSE_KEY) {
          this.homeButtonFocused = false;
          this.screen = "play";
          return;
        }
        return true;
      }

      if (key === CFG.PAUSE_KEY) this.screen = "play";
      if (key === "ArrowLeft" || key === "q") return this.changePauseKeeperShape(-1);
      if (key === "ArrowRight" || key === "d") return this.changePauseKeeperShape(1);
      if (key === "ArrowUp" || key === "z") {
        const roles = this.pauseKeeperRoles();
        const index = roles.indexOf(this.ensurePauseKeeperRole());
        if (index <= 0) return this.focusPauseHomeButton();
        return this.movePauseKeeperRole(-1);
      }
      if (key === "ArrowDown" || key === "s") return this.movePauseKeeperRole(1);
      if (key === "Enter") return this.validatePauseKeeperShape();
      if (key === "1") {
        this.pauseKeeperRole = "p1";
        this.applyPauseKeeperShape(1);
      }
      if (key === "2") {
        this.pauseKeeperRole = "p2";
        this.applyPauseKeeperShape(1);
      }
      if (key === "t" && this.currentMatchConfig && this.currentMatchConfig.tournamentMatch) {
        this.showTournamentBracket("pause");
      }
      if (key === "r") this.restartCurrentMatch();
      if (key === "Escape") {
        if (this.currentMatchConfig && this.currentMatchConfig.tournamentMatch) this.goHome();
        else this.quitMatch();
      }
    }

    handleMatchEndKey(key) {
      if (key === "Escape") {
        if (this.currentMatchConfig && this.currentMatchConfig.tournamentMatch) return this.goHome();
        return this.startTitle();
      }
      if (this.currentMatchConfig && this.currentMatchConfig.tournamentMatch) {
        if (key === "Enter" || key === "r") return this.advanceTournament();
      } else {
        if (key === "r" || key === "Enter") return this.restartCurrentMatch();
      }
    }

    handleTournamentEndKey(key) {
      if (key === "Escape") return this.startTitle();
      if (key === "r" || key === "Enter") {
        this.buildTournament();
      }
    }

    moveMenu(delta, length, prop) {
      this[prop] = wrap(this[prop] + delta, length);
      this.audio.play("menu");
    }

    moveGrid(delta, length, prop) {
      this[prop] = wrap(this[prop] + delta, length);
      this.audio.play("menu");
    }

    moveGridVertical(deltaRows, length, prop) {
      const cols = 4;
      const rows = Math.ceil(length / cols);
      const current = this[prop];
      const col = current % cols;
      let row = Math.floor(current / cols);
      for (let attempt = 0; attempt < rows; attempt++) {
        row = wrap(row + deltaRows, rows);
        const next = row * cols + col;
        if (next < length) {
          this[prop] = next;
          break;
        }
      }
      this.audio.play("menu");
    }

    hasControlConflict() {
      const values = [
        this.controls.p1Up,
        this.controls.p1Down,
        this.controls.p2Up,
        this.controls.p2Down
      ];
      return new Set(values).size !== values.length;
    }

    keyLabel(key) {
      const map = {
        ArrowUp: "↑",
        ArrowDown: "↓",
        ArrowLeft: "←",
        ArrowRight: "→",
        " ": "SPACE",
        Enter: "ENTER",
        Escape: "ESC"
      };
      return map[key] || String(key).toUpperCase();
    }

    toggleFullscreen() {
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
      else this.requestFullscreen(false);
    }

    requestFullscreen(silent = false) {
      const root = document.querySelector(".cabinet") || this.canvas;
      if (!document.fullscreenEnabled) {
        if (!silent) {
          this.fullscreenMessageTime = 2;
          this.message("Plein écran indisponible dans ce navigateur.", 2);
        }
        return Promise.resolve(false);
      }
      return root.requestFullscreen()
        .then(() => {
          this.canvas.focus();
          return true;
        })
        .catch(() => {
          if (!silent) {
            this.fullscreenMessageTime = 2;
            this.message("Plein écran refusé. La borne reste en civil.", 2);
          }
          return false;
        });
    }

    requestStartupFullscreen() {
      if (!this.startupFullscreenPending || document.fullscreenElement) return;
      this.requestFullscreen(true).then(success => {
        this.startupFullscreenPending = !success;
      });
    }
  }

  function wrap(value, length) {
    return ((value % length) + length) % length;
  }

  function nextPowerOfTwo(value) {
    let n = 2;
    while (n < value) n *= 2;
    return n;
  }

  function createTournamentBracket(humanParticipants, options = {}) {
    const seed = Number.isFinite(options.seed) ? options.seed : createTournamentSeed();
    const rng = createSeededRandom(seed);
    const enteredParticipants = humanParticipants.slice();
    const bracketSize = nextPowerOfTwo(Math.max(2, enteredParticipants.length));
    const machineCount = bracketSize - enteredParticipants.length;
    const machines = createTournamentMachines(machineCount);
    const bracketSlots = createSmartFirstRoundSlots(enteredParticipants, machines.map(player => player.id), rng);
    const participants = bracketSlots.slice();
    const playersById = {};

    enteredParticipants.forEach(id => { playersById[id] = CFG.playerById(id); });
    machines.forEach(player => { playersById[player.id] = player; });

    const rounds = [];
    const roundCount = Math.log2(bracketSize);
    let matchNumber = 1;

    for (let roundIndex = 0; roundIndex < roundCount; roundIndex++) {
      const matchCount = bracketSize / Math.pow(2, roundIndex + 1);
      const label = mainRoundLabel(roundIndex, roundCount);
      const round = [];
      round.label = label;

      for (let matchIndex = 0; matchIndex < matchCount; matchIndex++) {
        if (roundIndex === 0) {
          round.push(createTournamentMatch(matchNumber++, roundIndex, matchIndex, label, {
            playerA: bracketSlots[matchIndex * 2],
            playerB: bracketSlots[matchIndex * 2 + 1]
          }));
        } else {
          const previousRound = rounds[roundIndex - 1];
          round.push(createTournamentMatch(matchNumber++, roundIndex, matchIndex, label, {
            sourceA: previousRound[matchIndex * 2].id,
            sourceB: previousRound[matchIndex * 2 + 1].id
          }));
        }
      }

      rounds.push(round);
    }

    assignTournamentNextLinks(rounds);
    return { seed, bracketSize, machineCount, participants, bracketSlots, playersById, rounds };
  }

  function createSmartFirstRoundSlots(enteredParticipants, addedMachines, rng) {
    const humanIds = [];
    const machineIds = [];
    enteredParticipants.forEach(id => {
      if (isTournamentMachineSeed(id)) machineIds.push(id);
      else humanIds.push(id);
    });
    addedMachines.forEach(id => machineIds.push(id));

    const humans = shuffleSeeded(humanIds, rng);
    const machines = shuffleSeeded(machineIds, rng);
    const pairs = [];

    while (humans.length >= 2) {
      pairs.push(randomizedTournamentPair(humans.pop(), humans.pop(), rng));
    }

    if (humans.length && machines.length) {
      pairs.push(randomizedTournamentPair(humans.pop(), machines.pop(), rng));
    }

    while (machines.length >= 2) {
      pairs.push(randomizedTournamentPair(machines.pop(), machines.pop(), rng));
    }

    return shuffleSeeded(pairs, rng).flat();
  }

  function randomizedTournamentPair(a, b, rng) {
    return rng() < 0.5 ? [a, b] : [b, a];
  }

  function createTournamentMachines(count) {
    const base = (CFG.PLAYERS || []).find(player => player.id === "machine") || {
      id: "machine",
      name: "Machine",
      initials: "CPU",
      files: [],
      difficulty: "normal"
    };
    const machines = [];
    for (let index = 0; index < count; index++) {
      const machineNumber = index + 1;
      const id = `machine-${machineNumber}`;
      machines.push(Object.assign({}, base, {
        id,
        baseId: "machine",
        assetId: "machine",
        name: `Machine ${machineNumber}`,
        initials: "CPU",
        controlType: "cpu",
        type: "machine",
        difficulty: "normal"
      }));
    }
    return machines;
  }

  function isTournamentMachineSeed(id) {
    if (!id) return false;
    if (id === "machine" || /^machine-\d+$/.test(String(id))) return true;
    const player = CFG.playerById ? CFG.playerById(id) : null;
    if (player && (player.baseId === "machine" || player.assetId === "machine")) return true;
    const label = normalizeTournamentSeedLabel(player && player.name);
    return label === "machine" || label === "lamachine" || label === "ordinateur" || label === "ia" || label === "cpu";
  }

  function normalizeTournamentSeedLabel(value) {
    return String(value || "")
      .trim()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, "")
      .toLowerCase();
  }

  function createTournamentSeed() {
    return Math.floor(Math.random() * 0xffffffff) >>> 0;
  }

  function hashTournamentSeed(value) {
    let hash = 2166136261;
    const str = String(value || "");
    for (let index = 0; index < str.length; index++) {
      hash ^= str.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  function createSeededRandom(seed) {
    let state = (seed >>> 0) || 0x6d2b79f5;
    return function seededRandom() {
      state += 0x6d2b79f5;
      let t = state;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function shuffleSeeded(values, rng) {
    const shuffled = values.slice();
    for (let index = shuffled.length - 1; index > 0; index--) {
      const swapIndex = Math.floor(rng() * (index + 1));
      const tmp = shuffled[index];
      shuffled[index] = shuffled[swapIndex];
      shuffled[swapIndex] = tmp;
    }
    return shuffled;
  }

  function createTournamentMatch(number, roundIndex, matchIndex, roundLabelText, slots) {
    return {
      id: `M${number}`,
      roundIndex,
      matchIndex,
      roundLabel: roundLabelText,
      playerA: slots.playerA || null,
      playerB: slots.playerB || null,
      sourceA: slots.sourceA || null,
      sourceB: slots.sourceB || null,
      nextMatchId: null,
      nextSlot: null,
      winner: null,
      winnerId: null,
      status: "upcoming",
      scoreA: null,
      scoreB: null,
      score: null,
      simulated: false,
      summaryData: null,
      automatic: false,
      automaticReason: ""
    };
  }

  function assignTournamentNextLinks(rounds) {
    const byId = {};
    rounds.flat().forEach(match => { byId[match.id] = match; });
    rounds.flat().forEach(match => {
      [["sourceA", "A"], ["sourceB", "B"]].forEach(([sourceKey, slot]) => {
        const source = byId[match[sourceKey]];
        if (!source) return;
        source.nextMatchId = match.id;
        source.nextSlot = slot;
      });
    });
  }

  function mainRoundLabel(index, total) {
    const remaining = total - index;
    if (remaining === 1) return "FINALE";
    if (remaining === 2) return "DEMIS";
    if (remaining === 3) return "QUARTS";
    if (remaining === 4) return "HUITIÈMES";
    return `R${index + 1}`;
  }

  function inside(x, y, bx, by, bw, bh) {
    return x >= bx && x <= bx + bw && y >= by && y <= by + bh;
  }

  function menuIndexAt(x, y, left, top, width, height, gap, total) {
    for (let i = 0; i < total; i++) {
      if (inside(x, y, left, top + i * gap, width, height)) return i;
    }
    return -1;
  }

  function gridIndexAt(x, y, total, startX = 54, startY = 120, cols = 4, tileW = 132, tileH = 70, gapX = 8, gapY = 10) {
    for (let i = 0; i < total; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const xx = startX + col * (tileW + gapX);
      const yy = startY + row * (tileH + gapY);
      if (inside(x, y, xx, yy, tileW, tileH)) return i;
    }
    return -1;
  }

  function optionRowAt(x, y, firstY, gap, total) {
    for (let i = 0; i < total; i++) {
      if (inside(x, y, 190, firstY - 30 + i * gap, 580, 48)) return i;
    }
    return -1;
  }

  window.BadPongTournament = {
    createTournamentBracket,
    createTournamentSeed,
    createSeededRandom,
    hashTournamentSeed,
    nextPowerOfTwo,
    createTournamentMachines
  };
  window.Game = Game;
})();
