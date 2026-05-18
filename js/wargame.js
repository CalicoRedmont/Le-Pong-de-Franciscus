(function () {
  "use strict";

  const CFG = window.BadPongConfig || {};
  const WAR_BOOT_LINES = [
    "C:\\BADPONG> WARGAME",
    "PASSWORD ACCEPTED",
    "ACCESSING DARKWEB NODE",
    "BAD PONG INTERFACE DISCONNECTED",
    "LOADING WARGAME.EXE"
  ];
  const WAR = {
    bootLineDelay: 0.68,
    bootExitDelay: 0.95,
    playerSpeed: 260,
    rapidCooldown: 0.13,
    heavyCooldown: 1.65,
    rapidSpeed: 560,
    heavySpeed: 330,
    standardSpawnBase: 2.15,
    hunterSpawnBase: 7.8,
    hunterTurnRate: 2.7,
    hunterLife: 5,
    hunterLockMinInterval: 0.095,
    hunterLockMaxInterval: 0.68,
    hunterLockNearDistance: 34,
    hunterLockFarDistance: 360,
    hunterLockThreatRiseRate: 1.45,
    radarPingInterval: 2,
    radarSample: "assets/sounds/wargame-sonar.wav",
    radarSampleSliceDuration: 0.95,
    radarSampleVolume: 0.32,
    humanityLoss: 14,
    sanctuaryHumanityLoss: 25,
    ropaInitial: 6.4,
    ropaDangerThreshold: 1,
    coreHp: 6,
    gameOverRestartDelay: 4,
    gameOverRestartFadeDuration: 1.2
  };
  const WAR_RADAR = {
    left: 66,
    top: 160,
    width: 828,
    height: 328,
    centerX: 480,
    centerY: 300,
    radius: 170,
    outerRadius: 222
  };
  const WAR_CITY_LAYOUT = [
    { id: "vcgp", name: "VCGP", costM: 46, ropaLoss: 0.9, x: 222, y: 222, labelDx: -18, labelDy: -22, labelAlign: "right", link: true },
    { id: "spiecapag", name: "Spiecapag", costM: 38, ropaLoss: 0.8, x: 326, y: 286, labelDx: -18, labelDy: -22, labelAlign: "right", link: true },
    { id: "geocean", name: "Géocéan", costM: 30, ropaLoss: 0.7, x: 428, y: 202, labelDx: -10, labelDy: -22, labelAlign: "right", link: true },
    { id: "geostock", name: "GEOSTOCK", displayName: "GEOSTOCK", costM: 64, ropaLoss: 1.6, x: 480, y: 300, type: "sanctuary", labelDx: 0, labelDy: 44, labelAlign: "center" },
    { id: "entrepose", name: "Entrepose", costM: 42, ropaLoss: 0.9, x: 620, y: 306, labelDx: 12, labelDy: -22, labelAlign: "left", link: true },
    { id: "vinci_construction", name: "VINCI Construction", costM: 70, ropaLoss: 1.2, x: 806, y: 286, labelDx: 0, labelDy: -24, labelAlign: "center", link: true, lock: true },
    { id: "soletanche_bachy", name: "Soletanche Bachy", costM: 55, ropaLoss: 1.1, x: 314, y: 392, labelDx: -12, labelDy: -22, labelAlign: "right", link: true }
  ];
  const WAR_SCOPE_BLIPS = [
    { x: 156, y: 272, kind: "chevron" },
    { x: 202, y: 244, kind: "square" },
    { x: 248, y: 324, kind: "dot" },
    { x: 366, y: 220, kind: "triangle" },
    { x: 402, y: 380, kind: "bars" },
    { x: 454, y: 414, kind: "square" },
    { x: 548, y: 318, kind: "dot" },
    { x: 590, y: 382, kind: "squareRed" },
    { x: 666, y: 350, kind: "squareRed" },
    { x: 730, y: 232, kind: "bars" },
    { x: 760, y: 356, kind: "triangle" },
    { x: 852, y: 318, kind: "dot" }
  ];

  function installWargame(Game) {
    const baseDraw = Game.prototype.draw;
    const baseUpdate = Game.prototype.update;
    const baseHandleKeyDown = Game.prototype.handleKeyDown;
    const baseHandlePointerDown = Game.prototype.handlePointerDown;
    const baseStartTitle = Game.prototype.startTitle;

    Game.prototype.isWarGameScreen = function () {
      return this.screen === "wargameBoot"
        || this.screen === "wargame"
        || this.screen === "wargameGameOver"
        || this.screen === "wargameVictory";
    };

    Game.prototype.startTitle = function () {
      this.stopWarGameRadarLoop();
      this.resetWarGameUnlock();
      this.wargamePilotOverride = null;
      if (this.wargame) this.wargame.returningToTitle = true;
      return baseStartTitle.call(this);
    };

    Game.prototype.draw = function () {
      if (this.screen === "wargameBoot") return this.drawWarGameBoot();
      if (this.screen === "wargame") return this.drawWarGame();
      if (this.screen === "wargameGameOver") return this.drawWarGameGameOver();
      if (this.screen === "wargameVictory") return this.drawWarGameVictory();
      return baseDraw.call(this);
    };

    Game.prototype.update = function (dt) {
      const safeDt = Math.min(0.033, dt);
      if (this.screen === "wargameBoot") return this.updateWarGameBoot(safeDt);
      if (this.screen === "wargame") return this.updateWarGame(safeDt);
      if (this.screen === "wargameGameOver") return this.updateWarGameGameOver(safeDt);
      return baseUpdate.call(this, dt);
    };

    Game.prototype.handleKeyDown = function (key) {
      if (this.screen === "title" && this.captureWarGameUnlock(key)) return;
      if (!this.isWarGameScreen()) return baseHandleKeyDown.call(this, key);
      return this.handleWarGameKey(key, baseHandleKeyDown);
    };

    Game.prototype.handlePointerDown = function (x, y) {
      if (this.screen === "wargameGameOver" || this.screen === "wargameVictory") {
        return this.handleWarGameEndPointer(x, y);
      }
      if (this.isWarGameScreen()) return true;
      return baseHandlePointerDown.call(this, x, y);
    };

    Game.prototype.resetWarGameUnlock = function () {
      this.wargameUnlockBuffer = "";
    };

    Game.prototype.captureWarGameUnlock = function (key) {
      if (!CFG.ENABLE_WARGAME || this.screen !== "title") return false;
      if (key === "3") {
        this.wargamePilotOverride = null;
        this.startWarGameBoot();
        return true;
      }
      if (!key || key.length !== 1 || !/[a-z]/i.test(key)) return false;
      this.wargameUnlockBuffer = `${this.wargameUnlockBuffer || ""}${key.toUpperCase()}`.slice(-7);
      if (this.wargameUnlockBuffer === "OLIVIER") {
        const pilot = this.resolveWarGameNamedPilot("Olivier");
        this.wargamePilotOverride = pilot;
        if (pilot) this.saveWarGamePilotSession(pilot);
        this.startWarGameBoot();
        return true;
      }
      if (this.wargameUnlockBuffer !== "WARGAME") return false;
      this.wargamePilotOverride = null;
      this.startWarGameBoot();
      return true;
    };

    Game.prototype.startWarGameBoot = function () {
      if (!CFG.ENABLE_WARGAME) return;
      this.resetWarGameState();
      this.wargame.bootTime = 0;
      this.wargame.glitch = 0.45;
      this.screen = "wargameBoot";
      this.audio.play("validate");
    };

    Game.prototype.resetWarGameState = function () {
      const cities = WAR_CITY_LAYOUT.map(createWarCity);
      const machineNodes = [
        createWarNode({ name: "ARCTIC SERVER", x: 486, y: 184, hp: 3 }),
        createWarNode({ name: "ORBITAL UPLINK", x: 704, y: 246, hp: 3 }),
        createWarNode({ name: "PACIFIC RELAY", x: 814, y: 386, hp: 3 }),
        createWarNode({ name: "MACHINE CORE", x: 866, y: 258, hp: WAR.coreHp, core: true })
      ];

      this.wargame = {
        bootTime: 0,
        time: 0,
        playerAircraft: {
          x: 480,
          y: 460,
          r: 15,
          vx: 0,
          vy: 0,
          state: "idle",
          fireFlash: 0,
          thrustAlpha: 0,
          thrustPhase: 0,
          destroyed: false
        },
        enemyMissiles: [],
        playerShots: [],
        heavyMissiles: [],
        cities,
        machineNodes,
        machineCore: machineNodes.find(node => node.core),
        humanity: 100,
        ropa: WAR.ropaInitial,
        costM: 0,
        financeFlash: 0,
        financeReport: null,
        president: "Patrick Sulliot",
        executiveChanged: false,
        executiveReplacement: null,
        radarPingTimer: 0.85,
        gameOver: false,
        gameOverReason: "",
        gameOverElapsed: 0,
        pendingGameOverReason: "",
        victory: false,
        spawnGrace: 3,
        spawnTimer: 3,
        hunterTimer: 9,
        rapidCooldown: 0,
        heavyCooldown: 0,
        explosions: [],
        selectedPilot: this.resolveWarGameSelectedPilot(),
        lastStatus: "GEOSTOCK ONLINE",
        lastStatusDetail: `PRESIDENT: Patrick Sulliot`,
        machineGlitch: 0,
        returningToTitle: false,
        glitch: 0
      };
    };

    Game.prototype.startWarGame = function () {
      if (!this.wargame) this.resetWarGameState();
      this.wargame.bootTime = 0;
      this.wargame.time = 0;
      this.wargame.spawnGrace = 3;
      this.wargame.spawnTimer = 3;
      this.wargame.hunterTimer = 9;
      this.screen = "wargame";
      this.audio.play("bonus");
      this.preloadWarGameRadarSample();
    };

    Game.prototype.restartWarGame = function () {
      if (this.keys && this.keys.clear) this.keys.clear();
      this.resetWarGameState();
      this.startWarGame();
    };

    Game.prototype.handleWarGameKey = function (key, baseHandle) {
      if (key === CFG.SOUND_TOGGLE_KEY || key === "f") return baseHandle.call(this, key);
      if (this.screen === "wargameGameOver" || this.screen === "wargameVictory") {
        if (key === "Enter" || key === " " || key === "r") {
          if (this.warGameRestartButtonReady()) this.restartWarGame();
          return;
        }
        if (key === "Escape") {
          this.keys.clear();
          this.resetWarGameState();
          this.startTitle();
        }
        return;
      }
      if (this.screen === "wargame") {
        if (key === "x" || key === "Control") this.fireWarGameHeavyMissile();
        if (key === "Escape") {
          this.keys.clear();
          this.resetWarGameState();
          this.startTitle();
        }
      }
    };

    Game.prototype.updateWarGameBoot = function (dt) {
      if (!this.wargame) this.resetWarGameState();
      this.wargame.bootTime += dt;
      this.wargame.glitch = Math.max(0, this.wargame.glitch - dt);
      const bootLines = this.warGameBootLines();
      const bootDuration = bootLines.length * WAR.bootLineDelay + WAR.bootExitDelay;
      if (this.wargame.bootTime >= bootDuration) this.startWarGame();
    };

    Game.prototype.updateWarGame = function (dt) {
      if (!this.wargame) this.resetWarGameState();
      const state = this.wargame;
      if (state.gameOver || state.victory) return;

      state.time += dt;
      state.rapidCooldown = Math.max(0, state.rapidCooldown - dt);
      state.heavyCooldown = Math.max(0, state.heavyCooldown - dt);
      state.playerAircraft.fireFlash = Math.max(0, state.playerAircraft.fireFlash - dt);
      state.glitch = Math.max(0, state.glitch - dt);
      state.machineGlitch = Math.max(0, state.machineGlitch - dt);
      state.financeFlash = Math.max(0, state.financeFlash - dt);
      this.updateWarFinanceReport(dt);
      if (state.gameOver || state.victory) return;
      this.updateWarGameRadarSound(dt);

      this.updateWarGamePlayer(dt);
      if (this.key(" ")) this.fireWarGameRapidShot();
      if (state.spawnGrace > 0) {
        state.spawnGrace = Math.max(0, state.spawnGrace - dt);
        this.updateWarGameProjectiles(dt);
        this.updateWarGameExplosions(dt);
        return;
      }
      this.updateWarGameSpawns(dt);
      this.updateWarGameProjectiles(dt);
      this.updateWarGameExplosions(dt);
      this.checkWarGameEndStates();
    };

    Game.prototype.updateWarGameGameOver = function (dt) {
      if (!this.wargame) return;
      this.wargame.gameOverElapsed = (this.wargame.gameOverElapsed || 0) + dt;
    };

    Game.prototype.updateWarGamePlayer = function (dt) {
      const p = this.wargame.playerAircraft;
      let dx = 0;
      let dy = 0;
      if (this.key("ArrowLeft") || this.key("q") || this.key("a")) dx -= 1;
      if (this.key("ArrowRight") || this.key("d")) dx += 1;
      if (this.key("ArrowUp") || this.key("z") || this.key("w")) dy -= 1;
      if (this.key("ArrowDown") || this.key("s")) dy += 1;

      const len = Math.hypot(dx, dy) || 1;
      p.vx = (dx / len) * WAR.playerSpeed;
      p.vy = (dy / len) * WAR.playerSpeed;
      p.x = clamp(p.x + p.vx * dt, 72, this.width - 72);
      p.y = clamp(p.y + p.vy * dt, 104, this.height - 54);
      p.state = dx < 0 ? "bank_left" : dx > 0 ? "bank_right" : p.fireFlash > 0 ? "firing" : "idle";
      const moving = dx !== 0 || dy !== 0;
      p.thrustPhase += dt * (moving ? 26 : 18);
      p.thrustAlpha = moving
        ? Math.min(1, p.thrustAlpha + dt * 12)
        : Math.max(0, p.thrustAlpha - dt * 24);
      if (p.thrustAlpha < 0.03) p.thrustAlpha = 0;
    };

    Game.prototype.updateWarGameSpawns = function (dt) {
      const state = this.wargame;
      state.spawnTimer -= dt;
      state.hunterTimer -= dt;

      if (state.spawnTimer <= 0) {
        this.spawnWarGameMissile("standard");
        const difficulty = Math.min(1.15, state.time / 120);
        state.spawnTimer = Math.max(0.72, WAR.standardSpawnBase - difficulty + Math.random() * 0.7);
      }

      if (state.hunterTimer <= 0) {
        this.spawnWarGameMissile("hunter");
        const difficulty = Math.min(2.2, state.time / 70);
        state.hunterTimer = Math.max(3.8, WAR.hunterSpawnBase - difficulty + Math.random() * 3.4);
      }
    };

    Game.prototype.spawnWarGameMissile = function (type) {
      const state = this.wargame;
      const liveNodes = state.machineNodes.filter(node => !node.destroyed);
      const target = type === "hunter"
        ? state.playerAircraft
        : randomItem(state.cities.filter(city => city.active));
      if (!target) return;
      const source = liveNodes[Math.floor(Math.random() * liveNodes.length)]
        || { x: clamp(target.x + Math.random() * 280 - 140, 84, this.width - 84), y: 92 };
      if (type === "standard" && isWarSanctuary(target)) {
        state.lastStatus = "MACHINE: GEOSTOCK TARGETED";
        state.lastStatusDetail = "";
      }
      if (type === "hunter") {
        state.lastStatus = "ENEMY LOCK: SEEKER INBOUND";
        state.lastStatusDetail = "SEEKER ACTIVE: 5S";
      }

      const speed = type === "hunter"
        ? 118 + Math.min(58, state.time * 0.35)
        : 84 + Math.min(72, state.time * 0.42);
      const angle = Math.atan2(target.y - source.y, target.x - source.x);
      state.enemyMissiles.push({
        type,
        x: source.x,
        y: source.y,
        prevX: source.x,
        prevY: source.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        speed,
        turnRate: type === "hunter" ? WAR.hunterTurnRate : 0,
        lockBeepTimer: 0,
        lockThreat: 0,
        lockPhase: Math.random() * Math.PI * 2,
        targetName: target.displayName || target.name || "PEACEKEEPER-50",
        target,
        r: type === "hunter" ? 6 : 5,
        life: type === "hunter" ? WAR.hunterLife : 12
      });
    };

    Game.prototype.fireWarGameRapidShot = function () {
      const state = this.wargame;
      if (state.rapidCooldown > 0 || state.gameOver || state.victory) return;
      const p = state.playerAircraft;
      state.playerShots.push({
        x: p.x,
        y: p.y - 18,
        prevX: p.x,
        prevY: p.y - 18,
        vx: 0,
        vy: -WAR.rapidSpeed,
        r: 3,
        life: 1.5
      });
      p.fireFlash = 0.09;
      state.rapidCooldown = WAR.rapidCooldown;
      this.audio.play("bounce");
    };

    Game.prototype.fireWarGameHeavyMissile = function () {
      const state = this.wargame;
      if (state.heavyCooldown > 0 || state.gameOver || state.victory) return;
      const target = this.nextWarGameNodeTarget();
      if (!target) return;
      const p = state.playerAircraft;
      const angle = Math.atan2(target.y - p.y, target.x - p.x);
      state.heavyMissiles.push({
        x: p.x,
        y: p.y - 12,
        prevX: p.x,
        prevY: p.y - 12,
        vx: Math.cos(angle) * WAR.heavySpeed,
        vy: Math.sin(angle) * WAR.heavySpeed,
        target,
        r: 6,
        life: 3.2
      });
      p.fireFlash = 0.18;
      state.heavyCooldown = WAR.heavyCooldown;
      state.lastStatus = `HEAVY MISSILE -> ${target.name}`;
      state.lastStatusDetail = "";
      this.audio.play("validate");
    };

    Game.prototype.nextWarGameNodeTarget = function () {
      const state = this.wargame;
      const alive = state.machineNodes.filter(node => !node.destroyed);
      if (!alive.length) return null;
      const p = state.playerAircraft;
      return alive.reduce((best, node) => {
        if (!best) return node;
        return warDistance(p, node) < warDistance(p, best) ? node : best;
      }, null);
    };

    Game.prototype.updateWarGameProjectiles = function (dt) {
      const state = this.wargame;
      moveWarList(state.playerShots, dt);
      moveWarList(state.heavyMissiles, dt);
      this.updateWarGameEnemyMissiles(dt);

      for (let i = state.playerShots.length - 1; i >= 0; i--) {
        const shot = state.playerShots[i];
        if (shot.life <= 0 || shot.y < 70) {
          state.playerShots.splice(i, 1);
          continue;
        }
        for (let j = state.enemyMissiles.length - 1; j >= 0; j--) {
          const missile = state.enemyMissiles[j];
          if (!warCircleHit(shot, missile, shot.r + missile.r + 8)) continue;
          this.addWarExplosion(missile.x, missile.y, this.colors.green, 10);
          state.enemyMissiles.splice(j, 1);
          state.playerShots.splice(i, 1);
          state.lastStatus = "MISSILE INTERCEPTED";
          state.lastStatusDetail = "";
          this.audio.play("destroy");
          break;
        }
      }

      for (let i = state.heavyMissiles.length - 1; i >= 0; i--) {
        const heavy = state.heavyMissiles[i];
        if (heavy.life <= 0 || heavy.x < 0 || heavy.x > this.width || heavy.y < 0 || heavy.y > this.height) {
          state.heavyMissiles.splice(i, 1);
          continue;
        }
        const target = heavy.target;
        if (!target || target.destroyed || !warCircleHit(heavy, target, heavy.r + 15)) continue;
        target.hp = Math.max(0, target.hp - 1);
        this.addWarExplosion(target.x, target.y, this.colors.amber, 16);
        state.heavyMissiles.splice(i, 1);
        state.lastStatus = `${target.name} DAMAGED`;
        state.lastStatusDetail = "";
        state.machineGlitch = 0.34;
        this.audio.play(target.hp <= 0 ? "win" : "destroy");
        if (target.hp <= 0) {
          target.destroyed = true;
          target.active = false;
          state.lastStatus = `${target.name} DESTROYED`;
          if (target.core) this.startWarGameVictory();
        }
      }

      for (let i = state.enemyMissiles.length - 1; i >= 0; i--) {
        const missile = state.enemyMissiles[i];
        if (missile.life <= 0 || missile.x < -40 || missile.x > this.width + 40 || missile.y < -40 || missile.y > this.height + 40) {
          if (missile.life <= 0 && missile.type === "hunter") {
            this.addWarExplosion(missile.x, missile.y, this.colors.amber, 14);
            state.lastStatus = "SEEKER DISINTEGRATED";
            state.lastStatusDetail = "LOCK TIMEOUT";
            this.audio.play("destroy");
          }
          state.enemyMissiles.splice(i, 1);
          continue;
        }
        if (missile.type === "hunter" && warCircleHit(missile, state.playerAircraft, missile.r + state.playerAircraft.r)) {
          this.addWarExplosion(state.playerAircraft.x, state.playerAircraft.y, this.colors.red, 24);
          this.startWarGameGameOver("aircraft");
          return;
        }
        if (missile.type === "standard" && missile.target && missile.target.active && warCircleHit(missile, missile.target, missile.r + 8)) {
          const target = missile.target;
          state.enemyMissiles.splice(i, 1);
          this.applyWarSiteLoss(target);
          this.audio.play("lose");
        }
      }
    };

    Game.prototype.applyWarSiteLoss = function (target) {
      const state = this.wargame;
      const sanctuary = isWarSanctuary(target);
      const humanityLoss = sanctuary ? WAR.sanctuaryHumanityLoss : WAR.humanityLoss;
      const costM = Math.max(0, Math.round(target.costM || 0));
      const previousCostM = state.costM;
      const ropaLoss = Math.max(0, Number(target.ropaLoss) || 0);
      const previousRopa = state.ropa;

      target.active = false;
      target.lost = true;
      state.humanity = Math.max(0, state.humanity - humanityLoss);
      state.costM += costM;
      state.ropa = Math.max(0, state.ropa - ropaLoss);
      state.financeFlash = 2.4;

      const executiveChange = this.checkWarExecutiveChange(previousRopa);
      this.startWarFinanceReport(target, {
        costM,
        totalFrom: previousCostM,
        totalTo: state.costM,
        ropaLoss,
        previousRopa,
        ropa: state.ropa,
        executiveChange
      });

      state.lastStatus = sanctuary ? "GEOSTOCK BREACHED" : `${target.name.toUpperCase()} LOST`;
      state.lastStatusDetail = `${formatWarCost(costM)} / ROPA -${formatWarRopaPoints(ropaLoss)}`;
      if (executiveChange) {
        state.lastStatus = "PATRICK SULLIOT DEMISSION";
        state.lastStatusDetail = `${executiveChange.replacementName.toUpperCase()} PREND LE RELAIS`;
      }
      this.addWarExplosion(target.x, target.y, this.colors.red, sanctuary ? 24 : 18);
      return executiveChange;
    };

    Game.prototype.checkWarExecutiveChange = function (previousRopa) {
      const state = this.wargame;
      if (!state || state.executiveChanged) return null;
      if (previousRopa < WAR.ropaDangerThreshold || state.ropa >= WAR.ropaDangerThreshold) return null;
      const replacement = this.randomWarExecutiveReplacement();
      const replacementName = replacement ? replacement.name : "CALLSIGN FABIEN";
      state.executiveChanged = true;
      state.executiveReplacement = replacement;
      state.president = replacementName;
      return {
        replacement,
        replacementName,
        message: `Patrick Sulliot démissionne. ${replacementName} prend le relais.`
      };
    };

    Game.prototype.randomWarExecutiveReplacement = function () {
      const players = (CFG.PLAYERS || []).filter(player => player && player.id !== "machine");
      return players.length ? randomItem(players) : null;
    };

    Game.prototype.updateWarGameEnemyMissiles = function (dt) {
      const state = this.wargame;
      const aircraft = state.playerAircraft;
      for (const missile of state.enemyMissiles) {
        missile.prevX = missile.x;
        missile.prevY = missile.y;
        if (missile.type === "hunter") {
          const speed = missile.speed || Math.hypot(missile.vx, missile.vy) || 120;
          const desiredAngle = Math.atan2(aircraft.y - missile.y, aircraft.x - missile.x);
          const currentAngle = Math.atan2(missile.vy, missile.vx);
          const nextAngle = rotateWarAngleTowards(currentAngle, desiredAngle, (missile.turnRate || WAR.hunterTurnRate) * dt);
          missile.vx = Math.cos(nextAngle) * speed;
          missile.vy = Math.sin(nextAngle) * speed;
          this.updateWarGameHunterLockBeep(missile, aircraft, dt);
        }
        missile.x += missile.vx * dt;
        missile.y += missile.vy * dt;
        missile.life -= dt;
      }
    };

    Game.prototype.updateWarGameHunterLockBeep = function (missile, aircraft, dt) {
      const distance = warDistance(missile, aircraft);
      const proximity = 1 - clamp(
        (distance - WAR.hunterLockNearDistance) / (WAR.hunterLockFarDistance - WAR.hunterLockNearDistance),
        0,
        1
      );
      const currentThreat = missile.lockThreat || 0;
      const risingThreat = Math.min(proximity, currentThreat + WAR.hunterLockThreatRiseRate * dt);
      missile.lockThreat = Math.max(currentThreat, risingThreat);
      const threatCurve = 1 - Math.pow(1 - missile.lockThreat, 1.75);
      const nextInterval = WAR.hunterLockMaxInterval - (WAR.hunterLockMaxInterval - WAR.hunterLockMinInterval) * threatCurve;
      missile.lockBeepTimer = Math.max(0, (missile.lockBeepTimer || 0) - dt);
      if (missile.lockBeepTimer > 0) return;
      this.playWarGameLockBeep(missile.lockThreat);
      missile.lockBeepTimer = nextInterval;
    };

    Game.prototype.startWarFinanceReport = function (site, details) {
      this.wargame.financeReport = {
        siteName: site.name,
        costM: details.costM,
        totalFrom: details.totalFrom,
        totalTo: details.totalTo,
        ropaLoss: details.ropaLoss,
        previousRopa: details.previousRopa,
        ropa: details.ropa,
        executiveChange: details.executiveChange || null,
        elapsed: 0,
        duration: 1.25,
        hold: 1.05
      };
    };

    Game.prototype.updateWarFinanceReport = function (dt) {
      const report = this.wargame.financeReport;
      if (!report) return;
      report.elapsed += dt;
      if (report.elapsed >= report.duration + report.hold) {
        this.wargame.financeReport = null;
        if (this.wargame.pendingGameOverReason) {
          const reason = this.wargame.pendingGameOverReason;
          this.wargame.pendingGameOverReason = "";
          this.startWarGameGameOver(reason);
        }
      }
    };

    Game.prototype.warFinanceReportProgress = function () {
      const report = this.wargame && this.wargame.financeReport;
      if (!report) return 1;
      const t = clamp(report.elapsed / report.duration, 0, 1);
      return 1 - Math.pow(1 - t, 3);
    };

    Game.prototype.warDisplayedCost = function () {
      const state = this.wargame;
      const report = state && state.financeReport;
      if (!report) return state ? state.costM : 0;
      const progress = this.warFinanceReportProgress();
      return Math.round(report.totalFrom + (report.totalTo - report.totalFrom) * progress);
    };

    Game.prototype.warDisplayedEventCost = function () {
      const report = this.wargame && this.wargame.financeReport;
      if (!report) return 0;
      return Math.round(report.costM * this.warFinanceReportProgress());
    };

    Game.prototype.updateWarGameExplosions = function (dt) {
      const list = this.wargame.explosions;
      for (let i = list.length - 1; i >= 0; i--) {
        const explosion = list[i];
        explosion.life -= dt;
        explosion.r += explosion.grow * dt;
        if (explosion.life <= 0) list.splice(i, 1);
      }
    };

    Game.prototype.checkWarGameEndStates = function () {
      const state = this.wargame;
      if (state.gameOver || state.victory) return;
      const citiesLost = state.cities.every(city => !city.active);
      if (state.humanity <= 0 || citiesLost) {
        if (state.financeReport) {
          state.pendingGameOverReason = "humanity";
          return;
        }
        this.startWarGameGameOver("humanity");
      }
    };

    Game.prototype.startWarGameGameOver = function (reason) {
      const state = this.wargame;
      state.gameOver = true;
      state.gameOverReason = reason;
      state.gameOverElapsed = 0;
      state.playerAircraft.destroyed = true;
      state.enemyMissiles.length = 0;
      state.playerShots.length = 0;
      state.heavyMissiles.length = 0;
      this.stopWarGameRadarLoop();
      this.screen = "wargameGameOver";
      this.audio.play("lose");
    };

    Game.prototype.startWarGameVictory = function () {
      const state = this.wargame;
      state.victory = true;
      state.enemyMissiles.length = 0;
      state.playerShots.length = 0;
      state.heavyMissiles.length = 0;
      this.stopWarGameRadarLoop();
      this.screen = "wargameVictory";
      this.audio.play("win");
    };

    Game.prototype.addWarExplosion = function (x, y, color, radius) {
      this.wargame.explosions.push({ x, y, r: 3, maxR: radius, grow: radius * 2.4, life: 0.36, color });
    };

    Game.prototype.playWarGameLockBeep = function (threat = 0) {
      const ctx = this.warGameAudioContext();
      if (!ctx) return;
      const now = ctx.currentTime;
      const pressure = clamp(threat, 0, 1);
      const freq = 840 + pressure * 210;
      const gap = 0.06 - pressure * 0.022;
      const duration = 0.048 - pressure * 0.012;
      const volume = 0.095 + pressure * 0.05;
      [
        0,
        gap
      ].forEach(offset => {
        const osc = ctx.createOscillator();
        const harmonic = ctx.createOscillator();
        const gain = ctx.createGain();
        const harmonicGain = ctx.createGain();
        const filter = ctx.createBiquadFilter();
        osc.type = "square";
        harmonic.type = "triangle";
        osc.frequency.setValueAtTime(freq, now + offset);
        harmonic.frequency.setValueAtTime(freq * 2.01, now + offset);
        filter.type = "bandpass";
        filter.frequency.setValueAtTime(freq * 1.12, now + offset);
        filter.Q.setValueAtTime(8 + pressure * 10, now + offset);
        gain.gain.setValueAtTime(0.0001, now + offset);
        gain.gain.exponentialRampToValueAtTime(volume, now + offset + 0.006);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + duration);
        harmonicGain.gain.setValueAtTime(0.0001, now + offset);
        harmonicGain.gain.exponentialRampToValueAtTime(0.018 + pressure * 0.02, now + offset + 0.004);
        harmonicGain.gain.exponentialRampToValueAtTime(0.0001, now + offset + duration * 0.82);
        osc.connect(filter);
        filter.connect(gain);
        harmonic.connect(harmonicGain);
        gain.connect(ctx.destination);
        harmonicGain.connect(ctx.destination);
        osc.start(now + offset);
        harmonic.start(now + offset);
        osc.stop(now + offset + duration + 0.02);
        harmonic.stop(now + offset + duration + 0.02);
      });
      this.playWarGameLockClick(now, pressure);
    };

    Game.prototype.playWarGameLockClick = function (now, pressure) {
      const ctx = this.warGameAudioContext();
      if (!ctx) return;
      const length = Math.floor(ctx.sampleRate * 0.026);
      const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < length; i++) {
        const fade = 1 - i / length;
        data[i] = (Math.random() * 2 - 1) * fade * fade;
      }
      const noise = ctx.createBufferSource();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();
      noise.buffer = buffer;
      filter.type = "highpass";
      filter.frequency.setValueAtTime(1800 + pressure * 900, now);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.025 + pressure * 0.018, now + 0.004);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.026);
      noise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      noise.start(now);
      noise.stop(now + 0.035);
    };

    Game.prototype.updateWarGameRadarSound = function (dt) {
      const state = this.wargame;
      if (!this.syncWarGameRadarSample()) return;
      state.radarPingTimer -= dt;
      if (state.radarPingTimer > 0) return;
      this.playWarGameRadarPing();
      state.radarPingTimer = WAR.radarPingInterval;
    };

    Game.prototype.syncWarGameRadarSample = function () {
      if (!this.wargame || this.screen !== "wargame" || this.wargame.gameOver || this.wargame.victory) {
        this.stopWarGameRadarLoop();
        return false;
      }
      if (!this.audio || !this.audio.enabled) {
        this.stopWarGameRadarLoop();
        return false;
      }
      this.preloadWarGameRadarSample();
      return true;
    };

    Game.prototype.preloadWarGameRadarSample = function () {
      if (!this.audio || !this.audio.enabled || typeof Audio === "undefined") return false;
      if (!this.warGameRadarLoop) {
        const sample = new Audio(WAR.radarSample);
        sample.loop = false;
        sample.preload = "auto";
        sample.volume = WAR.radarSampleVolume;
        sample.addEventListener("error", () => {
          sample.failed = true;
        });
        this.warGameRadarLoop = sample;
      }
      this.warGameRadarLoop.volume = WAR.radarSampleVolume;
      return !this.warGameRadarLoop.failed;
    };

    Game.prototype.stopWarGameRadarLoop = function () {
      const loop = this.warGameRadarLoop;
      if (!loop) return;
      if (this.warGameRadarSampleStopTimer) {
        clearTimeout(this.warGameRadarSampleStopTimer);
        this.warGameRadarSampleStopTimer = null;
      }
      loop.pause();
      try {
        loop.currentTime = 0;
      } catch (error) {
        // Some browsers can reject currentTime resets before metadata is ready.
      }
    };

    Game.prototype.playWarGameRadarPing = function () {
      if (this.playWarGameRadarSample()) return;
      const ctx = this.warGameAudioContext();
      if (!ctx) return;
      const now = ctx.currentTime;
      [
        { offset: 0, volume: 0.034, start: 940, end: 520, duration: 0.42 },
        { offset: 0.22, volume: 0.014, start: 720, end: 410, duration: 0.34 }
      ].forEach(ping => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(ping.start, now + ping.offset);
        osc.frequency.exponentialRampToValueAtTime(ping.end, now + ping.offset + ping.duration);
        gain.gain.setValueAtTime(0.0001, now + ping.offset);
        gain.gain.exponentialRampToValueAtTime(ping.volume, now + ping.offset + 0.018);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + ping.offset + ping.duration);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + ping.offset);
        osc.stop(now + ping.offset + ping.duration + 0.03);
      });
    };

    Game.prototype.playWarGameRadarSample = function () {
      if (!this.preloadWarGameRadarSample()) return false;
      const sample = this.warGameRadarLoop;
      if (!sample || sample.failed) return false;
      if (this.warGameRadarSampleStopTimer) {
        clearTimeout(this.warGameRadarSampleStopTimer);
        this.warGameRadarSampleStopTimer = null;
      }
      sample.pause();
      try {
        sample.currentTime = 0;
      } catch (error) {
        return false;
      }
      const play = sample.play();
      if (play && play.catch) {
        play.catch(() => {
          sample.failed = true;
        });
      }
      this.warGameRadarSampleStopTimer = setTimeout(() => {
        sample.pause();
        try {
          sample.currentTime = 0;
        } catch (error) {
          // Resetting can fail before metadata is ready; the next ping will retry.
        }
        this.warGameRadarSampleStopTimer = null;
      }, WAR.radarSampleSliceDuration * 1000);
      return true;
    };

    Game.prototype.warGameAudioContext = function () {
      const audio = this.audio;
      if (!audio || !audio.enabled || !audio.ctx) return null;
      if (audio.ctx.state === "suspended") audio.ctx.resume();
      return audio.ctx;
    };

    Game.prototype.warGameBootLines = function () {
      const pilot = this.wargame && this.wargame.selectedPilot;
      if (!pilot) return WAR_BOOT_LINES;
      return [
        "C:\\BADPONG> WARGAME",
        `PILOT SELECTED: ${pilot.displayName}`,
        "ACCESSING DARKWEB NODE",
        "BAD PONG INTERFACE DISCONNECTED",
        "LOADING WARGAME.EXE"
      ];
    };

    Game.prototype.drawWarGameBoot = function () {
      const ctx = this.ctx;
      const state = this.wargame || { bootTime: 0, glitch: 0 };
      const bootLines = this.warGameBootLines();
      ctx.save();
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, this.width, this.height);
      this.drawWarConsoleGrid(0.18);
      this.drawWarGlitch(state.glitch);

      this.drawText("BAD PONG INTERFACE SHELL", 48, 54, 14, this.colors.green);
      const visible = Math.min(bootLines.length, Math.floor(state.bootTime / WAR.bootLineDelay) + 1);
      for (let i = 0; i < visible; i++) {
        const y = 132 + i * 42;
        const color = i === 0 ? this.colors.white : i === visible - 1 ? this.colors.amber : this.colors.green;
        this.drawText(bootLines[i], 86, y, i === 0 ? 22 : 20, color);
      }

      const cursorOn = Math.floor(performance.now() / 160) % 2 === 0;
      if (cursorOn) this.drawText("_", 86, 132 + visible * 42, 20, this.colors.green);
      this.drawWarScanlines();
      ctx.restore();
    };

    Game.prototype.drawWarGame = function () {
      const ctx = this.ctx;
      ctx.save();
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, this.width, this.height);
      this.drawWarMap();
      this.drawWarCities();
      this.drawWarMachineNodes();
      this.drawWarProjectiles();
      this.drawWarAircraft();
      this.drawWarExplosions();
      this.drawWarHud();
      this.drawWarFinanceReportOverlay();
      this.drawWarScanlines();
      ctx.restore();
    };

    Game.prototype.drawWarMap = function () {
      const ctx = this.ctx;
      const state = this.wargame;
      this.drawWarConsoleGrid(0.16);
      this.drawWarMapAxes();
      this.drawWarRadarOverlay();
      this.drawWarScopeBlips();
      this.drawWarSanctuaryCore();

      ctx.save();
      const core = state && state.machineCore;
      if (core && !core.destroyed) {
        ctx.strokeStyle = "rgba(255,208,79,0.36)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(WAR_RADAR.centerX + 160, WAR_RADAR.top + 38);
        ctx.lineTo(core.x - 42, WAR_RADAR.top + 38);
        ctx.lineTo(core.x - 18, core.y - 24);
        ctx.stroke();
      }
      ctx.restore();
    };

    Game.prototype.drawWarRadarOverlay = function () {
      const ctx = this.ctx;
      const cx = WAR_RADAR.centerX;
      const cy = WAR_RADAR.centerY;
      const radius = WAR_RADAR.radius;
      const outerRadius = WAR_RADAR.outerRadius;
      const now = performance.now() / 1000;
      const sweep = now * 0.72 - Math.PI / 2;

      ctx.save();
      ctx.strokeStyle = "rgba(57,255,104,0.52)";
      ctx.shadowColor = this.colors.green;
      ctx.shadowBlur = 4;
      ctx.lineWidth = 1.3;
      ctx.setLineDash([8, 10]);
      ctx.beginPath();
      ctx.arc(cx, cy, outerRadius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.globalAlpha = 0.38;
      ctx.lineWidth = 1;
      for (const ring of [42, 82, 124, radius]) {
        ctx.beginPath();
        ctx.arc(cx, cy, ring, 0, Math.PI * 2);
        ctx.stroke();
      }

      ctx.globalAlpha = 0.32;
      for (let deg = 0; deg < 360; deg += 30) {
        const a = (Math.PI * deg) / 180;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a) * 30, cy + Math.sin(a) * 30);
        ctx.lineTo(cx + Math.cos(a) * outerRadius, cy + Math.sin(a) * outerRadius);
        ctx.stroke();
      }

      ctx.globalAlpha = 0.96;
      const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius + 26);
      gradient.addColorStop(0, "rgba(255,208,79,0.20)");
      gradient.addColorStop(0.45, "rgba(57,255,104,0.15)");
      gradient.addColorStop(1, "rgba(57,255,104,0)");
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, radius + 26, sweep - 0.16, sweep + 0.13);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = "rgba(255,208,79,0.44)";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(sweep) * (radius + 26), cy + Math.sin(sweep) * (radius + 26));
      ctx.stroke();

      ctx.strokeStyle = "rgba(57,255,104,0.78)";
      ctx.fillStyle = "rgba(57,255,104,0.10)";
      ctx.shadowBlur = 3;
      ctx.beginPath();
      ctx.arc(cx, cy, 24, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx, cy, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    };

    Game.prototype.drawWarMapAxes = function () {
      const ctx = this.ctx;
      const left = WAR_RADAR.left;
      const top = WAR_RADAR.top;
      const right = WAR_RADAR.left + WAR_RADAR.width;
      const bottom = WAR_RADAR.top + WAR_RADAR.height;
      ctx.save();
      ctx.strokeStyle = "rgba(57,255,104,0.30)";
      ctx.fillStyle = this.colors.green;
      ctx.shadowColor = this.colors.green;
      ctx.shadowBlur = 2;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(left, top);
      ctx.lineTo(left, bottom);
      ctx.lineTo(right, bottom);
      ctx.stroke();

      for (let x = left + 20; x <= right; x += 20) {
        const tall = (x - left) % 80 === 0;
        ctx.beginPath();
        ctx.moveTo(x, bottom - (tall ? 10 : 5));
        ctx.lineTo(x, bottom + (tall ? 10 : 5));
        ctx.stroke();
      }
      for (let y = top + 20; y <= bottom; y += 20) {
        const tall = (y - top) % 80 === 0;
        ctx.beginPath();
        ctx.moveTo(left - (tall ? 10 : 5), y);
        ctx.lineTo(left + (tall ? 10 : 5), y);
        ctx.stroke();
      }

      [
        ["090", top + 34],
        ["060", top + 92],
        ["030", top + 150],
        ["000", top + 206],
        ["030", top + 264],
        ["060", top + 322]
      ].forEach(([label, y]) => this.drawText(label, left - 38, y + 4, 9, this.colors.green));

      [
        ["270", left + 44],
        ["300", left + 180],
        ["330", left + 316],
        ["000", WAR_RADAR.centerX],
        ["030", left + 586],
        ["060", left + 724],
        ["090", right - 12]
      ].forEach(([label, x]) => this.drawText(label, x, bottom + 18, 9, this.colors.green, "center"));

      ctx.globalAlpha = 0.2;
      ctx.beginPath();
      ctx.moveTo(WAR_RADAR.centerX, top);
      ctx.lineTo(WAR_RADAR.centerX, bottom);
      ctx.moveTo(left, WAR_RADAR.centerY);
      ctx.lineTo(right, WAR_RADAR.centerY);
      ctx.stroke();
      ctx.restore();
    };

    Game.prototype.drawWarScopeBlips = function () {
      const ctx = this.ctx;
      const flicker = 0.72 + Math.sin(performance.now() / 210) * 0.18;
      for (const blip of WAR_SCOPE_BLIPS) {
        ctx.save();
        const red = blip.kind === "squareRed";
        ctx.strokeStyle = red ? "rgba(255,56,85,0.72)" : "rgba(57,255,104,0.58)";
        ctx.fillStyle = red ? "rgba(255,56,85,0.58)" : "rgba(57,255,104,0.48)";
        ctx.globalAlpha = red ? flicker : 0.5;
        ctx.shadowColor = red ? this.colors.red : this.colors.green;
        ctx.shadowBlur = red ? 4 : 2;
        if (blip.kind === "chevron") {
          ctx.beginPath();
          ctx.moveTo(blip.x + 14, blip.y - 8);
          ctx.lineTo(blip.x, blip.y);
          ctx.lineTo(blip.x + 14, blip.y + 8);
          ctx.moveTo(blip.x + 20, blip.y - 8);
          ctx.lineTo(blip.x + 6, blip.y);
          ctx.lineTo(blip.x + 20, blip.y + 8);
          ctx.stroke();
        } else if (blip.kind === "triangle") {
          ctx.beginPath();
          ctx.moveTo(blip.x, blip.y - 5);
          ctx.lineTo(blip.x + 5, blip.y + 5);
          ctx.lineTo(blip.x - 5, blip.y + 5);
          ctx.closePath();
          ctx.stroke();
        } else if (blip.kind === "bars") {
          for (let i = 0; i < 6; i++) {
            ctx.fillRect(blip.x + i * 5, blip.y - i * 4, 2, 12 + i * 4);
          }
        } else if (blip.kind === "dot") {
          ctx.fillRect(blip.x - 2, blip.y - 2, 4, 4);
        } else {
          ctx.strokeRect(blip.x - 5, blip.y - 5, 10, 10);
        }
        ctx.restore();
      }
      this.drawWarMiniWave(92, 204, 72, 28);
      this.drawWarMiniWave(792, 404, 80, 44);
    };

    Game.prototype.drawWarMiniWave = function (x, y, w, h) {
      const ctx = this.ctx;
      ctx.save();
      ctx.strokeStyle = "rgba(57,255,104,0.46)";
      ctx.fillStyle = "rgba(57,255,104,0.35)";
      ctx.shadowColor = this.colors.green;
      ctx.shadowBlur = 2;
      ctx.strokeRect(x, y, w, h);
      for (let i = 0; i < 13; i++) {
        const bar = 4 + Math.abs(Math.sin(i * 0.85 + performance.now() / 420)) * (h - 8);
        ctx.fillRect(x + 10 + i * 5, y + h - bar - 4, 2, bar);
      }
      ctx.restore();
    };

    Game.prototype.drawWarSanctuaryCore = function () {
      const ctx = this.ctx;
      const cx = WAR_RADAR.centerX;
      const cy = WAR_RADAR.centerY;
      const pulse = 0.5 + Math.sin(performance.now() / 160) * 0.5;

      ctx.save();
      ctx.strokeStyle = "rgba(57,255,104,0.78)";
      ctx.shadowColor = this.colors.green;
      ctx.shadowBlur = 4 + pulse * 4;
      ctx.lineWidth = 1.2;
      for (const r of [34, 52, 70]) {
        ctx.globalAlpha = 0.22 + pulse * 0.1;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.globalAlpha = 0.82;
      ctx.strokeRect(cx - 15, cy - 15, 30, 30);
      ctx.beginPath();
      ctx.moveTo(cx - 46, cy);
      ctx.lineTo(cx - 18, cy);
      ctx.moveTo(cx + 18, cy);
      ctx.lineTo(cx + 46, cy);
      ctx.moveTo(cx, cy - 46);
      ctx.lineTo(cx, cy - 18);
      ctx.moveTo(cx, cy + 18);
      ctx.lineTo(cx, cy + 46);
      ctx.stroke();
      ctx.restore();
    };

    Game.prototype.drawWarLabelText = function (str, x, y, size, color, align = "left") {
      if (!str) return;
      const ctx = this.ctx;
      ctx.save();
      ctx.font = `${size}px "Courier New", Courier, monospace`;
      ctx.textAlign = align;
      ctx.textBaseline = "alphabetic";
      const width = ctx.measureText(str).width;
      const left = align === "center" ? x - width / 2 : align === "right" ? x - width : x;
      ctx.fillStyle = "rgba(0,0,0,0.78)";
      ctx.fillRect(left - 4, y - size - 3, width + 8, size + 6);
      ctx.shadowColor = color;
      ctx.shadowBlur = 2;
      ctx.fillStyle = color;
      ctx.fillText(str, x, y);
      ctx.restore();
    };

    Game.prototype.drawWarCities = function () {
      const ctx = this.ctx;
      for (const city of this.wargame.cities) {
        ctx.save();
        const sanctuary = isWarSanctuary(city);
        const label = city.name;
        const pulse = 0.55 + Math.sin(performance.now() / 150) * 0.45;
        const color = city.active ? this.colors.green : this.colors.red;
        const ringRadius = sanctuary ? 18 : 13;
        ctx.strokeStyle = color;
        ctx.fillStyle = city.active ? "rgba(57,255,104,0.20)" : "rgba(255,56,85,0.18)";
        ctx.shadowColor = color;
        ctx.shadowBlur = sanctuary && city.active ? 9 : city.active ? 4 : 7;
        ctx.globalAlpha = city.active ? 0.9 : 0.7;
        ctx.lineWidth = sanctuary ? 1.6 : 1.2;
        ctx.beginPath();
        ctx.arc(city.x, city.y, ringRadius + pulse * (city.active ? 2 : 0), 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = city.active ? 0.62 : 0.36;
        ctx.beginPath();
        ctx.arc(city.x, city.y, ringRadius - 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.globalAlpha = 1;
        ctx.fillRect(city.x - 2, city.y - 2, 4, 4);
        if (sanctuary) {
          ctx.strokeRect(city.x - 8, city.y - 8, 16, 16);
        }
        if (city.lock) this.drawWarLockBrackets(city.x, city.y, color);
        const labelX = city.x + (city.labelDx ?? 10);
        const labelY = city.y + (city.labelDy ?? (sanctuary ? 16 : -8));
        if (sanctuary) {
          this.drawWarLabelText(city.lost ? "GEOSTOCK LOST" : "GEOSTOCK", labelX, labelY, 10, color, "center");
        } else {
          this.drawWarLabelText(city.lost ? `${label} OFFLINE` : label, labelX, labelY, 10, color, city.labelAlign || "left");
        }
        ctx.restore();
      }
    };

    Game.prototype.drawWarLockBrackets = function (x, y, color) {
      const ctx = this.ctx;
      const r = 28;
      const l = 9;
      ctx.save();
      ctx.strokeStyle = color;
      ctx.shadowColor = color;
      ctx.shadowBlur = 3;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(x - r, y - r + l);
      ctx.lineTo(x - r, y - r);
      ctx.lineTo(x - r + l, y - r);
      ctx.moveTo(x + r - l, y - r);
      ctx.lineTo(x + r, y - r);
      ctx.lineTo(x + r, y - r + l);
      ctx.moveTo(x - r, y + r - l);
      ctx.lineTo(x - r, y + r);
      ctx.lineTo(x - r + l, y + r);
      ctx.moveTo(x + r - l, y + r);
      ctx.lineTo(x + r, y + r);
      ctx.lineTo(x + r, y + r - l);
      ctx.stroke();
      ctx.restore();
    };

    Game.prototype.drawWarMachineNodes = function () {
      const ctx = this.ctx;
      for (const node of this.wargame.machineNodes) {
        ctx.save();
        const color = node.destroyed ? "rgba(57,255,104,0.22)" : node.core ? this.colors.amber : this.colors.red;
        ctx.strokeStyle = color;
        ctx.fillStyle = node.destroyed ? "rgba(0,0,0,0.35)" : "rgba(255,56,85,0.16)";
        ctx.shadowColor = color;
        ctx.shadowBlur = node.destroyed ? 0 : 10;
        ctx.strokeRect(node.x - 11, node.y - 11, 22, 22);
        ctx.fillRect(node.x - 9, node.y - 9, 18, 18);
        const hp = node.destroyed ? "OFFLINE" : `${Math.ceil((node.hp / node.maxHp) * 100)}%`;
        this.drawText(`${node.name} ${hp}`, node.x - 70, node.y - 18, 10, color);
        ctx.restore();
      }
    };

    Game.prototype.drawWarProjectiles = function () {
      const ctx = this.ctx;
      for (const shot of this.wargame.playerShots) {
        this.drawWarTrail(shot.prevX, shot.prevY, shot.x, shot.y, this.colors.green);
        ctx.save();
        ctx.fillStyle = this.colors.green;
        ctx.shadowColor = this.colors.green;
        ctx.shadowBlur = 8;
        ctx.fillRect(shot.x - 1, shot.y - 5, 3, 9);
        ctx.restore();
      }
      for (const heavy of this.wargame.heavyMissiles) {
        this.drawWarTrail(heavy.prevX, heavy.prevY, heavy.x, heavy.y, this.colors.amber);
        ctx.save();
        ctx.fillStyle = this.colors.amber;
        ctx.shadowColor = this.colors.amber;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(heavy.x, heavy.y, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      for (const missile of this.wargame.enemyMissiles) {
        const color = missile.type === "hunter" ? this.colors.amber : this.colors.red;
        this.drawWarTrail(missile.prevX, missile.prevY, missile.x, missile.y, color);
        ctx.save();
        ctx.translate(missile.x, missile.y);
        ctx.rotate(Math.atan2(missile.vy, missile.vx) + Math.PI / 2);
        ctx.fillStyle = color;
        ctx.shadowColor = color;
        ctx.shadowBlur = missile.type === "hunter" ? 14 : 9;
        ctx.beginPath();
        ctx.moveTo(0, -8);
        ctx.lineTo(5, 6);
        ctx.lineTo(0, 3);
        ctx.lineTo(-5, 6);
        ctx.closePath();
        ctx.fill();
        if (missile.type === "hunter") {
          ctx.strokeStyle = color;
          ctx.lineWidth = 1;
          ctx.setLineDash([2, 3]);
          ctx.beginPath();
          ctx.arc(0, 0, 12 + Math.sin(performance.now() / 95 + missile.lockPhase) * 2, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.restore();
      }
    };

    Game.prototype.drawWarAircraft = function () {
      const ctx = this.ctx;
      const p = this.wargame.playerAircraft;
      const bankAngle = p.state === "bank_left" ? -0.18 : p.state === "bank_right" ? 0.18 : 0;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(bankAngle);
      this.drawWarAircraftIcon(p, bankAngle);
      ctx.restore();
    };

    Game.prototype.drawWarAircraftIcon = function (p, bankAngle) {
      const ctx = this.ctx;
      this.drawWarAircraftThrust(p, bankAngle);
      ctx.strokeStyle = this.colors.green;
      ctx.fillStyle = "rgba(57,255,104,0.07)";
      ctx.shadowColor = this.colors.green;
      ctx.shadowBlur = p.fireFlash > 0 ? 18 : 10;
      ctx.lineWidth = 1.8;
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(0, -24);
      ctx.lineTo(4, -10);
      ctx.lineTo(18, 8);
      ctx.lineTo(7, 5);
      ctx.lineTo(7, 16);
      ctx.lineTo(3, 13);
      ctx.lineTo(2, 22);
      ctx.lineTo(0, 17);
      ctx.lineTo(-2, 22);
      ctx.lineTo(-3, 13);
      ctx.lineTo(-7, 16);
      ctx.lineTo(-7, 5);
      ctx.lineTo(-18, 8);
      ctx.lineTo(-4, -10);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.save();
      ctx.globalAlpha = 0.82;
      ctx.strokeStyle = this.colors.green;
      ctx.shadowBlur = 6;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, -17);
      ctx.lineTo(0, 14);
      ctx.stroke();
      ctx.fillStyle = this.colors.white;
      ctx.fillRect(-2, -7, 4, 9);
      ctx.restore();

      ctx.save();
      ctx.globalAlpha = 0.42;
      ctx.strokeStyle = this.colors.greenSoft || this.colors.green;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(-5, -3);
      ctx.lineTo(5, -3);
      ctx.moveTo(-6, 9);
      ctx.lineTo(6, 9);
      ctx.stroke();
      ctx.restore();

      if (p.fireFlash > 0) {
        ctx.save();
        ctx.fillStyle = this.colors.amber;
        ctx.shadowColor = this.colors.amber;
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.moveTo(0, -32);
        ctx.lineTo(5, -22);
        ctx.lineTo(-5, -22);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
    };

    Game.prototype.drawWarAircraftThrust = function (p, bankAngle) {
      const ctx = this.ctx;
      const speed = Math.hypot(p.vx, p.vy);
      if (speed < 1 || p.thrustAlpha <= 0) return;

      const pulse = 0.74 + Math.sin(p.thrustPhase) * 0.18 + Math.sin(p.thrustPhase * 1.7) * 0.08;
      const length = 8 + pulse * 5;
      const worldX = -p.vx / speed;
      const worldY = -p.vy / speed;
      const cos = Math.cos(bankAngle);
      const sin = Math.sin(bankAngle);
      const localX = cos * worldX + sin * worldY;
      const localY = -sin * worldX + cos * worldY;
      const alpha = Math.min(0.68, p.thrustAlpha * pulse);
      const engines = [-4.5, 4.5];

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = "rgba(190,255,198,0.92)";
      ctx.fillStyle = "rgba(190,255,198,0.55)";
      ctx.shadowColor = this.colors.green;
      ctx.shadowBlur = 7;
      ctx.lineWidth = 2;
      ctx.lineCap = "round";
      for (const engineX of engines) {
        const startX = engineX;
        const startY = 18;
        const tipX = startX + localX * length;
        const tipY = startY + localY * length;
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(tipX, tipY);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(tipX, tipY, 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    };

    Game.prototype.drawWarExplosions = function () {
      const ctx = this.ctx;
      for (const explosion of this.wargame.explosions) {
        ctx.save();
        ctx.globalAlpha = Math.max(0, explosion.life / 0.36);
        ctx.strokeStyle = explosion.color;
        ctx.shadowColor = explosion.color;
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.arc(explosion.x, explosion.y, explosion.r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = explosion.color;
        for (let i = 0; i < 8; i++) {
          const a = (Math.PI * 2 * i) / 8;
          ctx.fillRect(explosion.x + Math.cos(a) * explosion.r, explosion.y + Math.sin(a) * explosion.r, 3, 3);
        }
        ctx.restore();
      }
    };

    Game.prototype.drawWarHud = function () {
      const state = this.wargame;
      const selectedPilot = state.selectedPilot;
      const pilot = this.warGamePilotPlayer();
      const machine = CFG.playerById ? CFG.playerById("machine") : null;
      const pilotName = formatWarPilotName(pilot, selectedPilot);
      const callsign = formatWarPilotCallsign(pilot, selectedPilot);
      const lost = state.cities.filter(city => !city.active).length;
      const corePct = Math.max(0, Math.round((state.machineCore.hp / state.machineCore.maxHp) * 100));
      this.drawWarHudPanel(12, 12, 286, 146);
      this.drawText("WARGAME.EXE", 30, 38, 17, this.colors.green);
      this.drawWarPilotPortrait(pilot, 28, 54, 88, 82);
      this.drawText("PILOT", 132, 64, 10, this.colors.amber);
      this.drawText(pilotName, 132, 84, 14, this.colors.white);
      this.drawText(`CALLSIGN: ${callsign}`, 132, 104, 10, this.colors.white);
      this.drawText("AIRCRAFT: PEACEKEEPER-50", 132, 124, 10, this.colors.white);
      this.drawText(`ROPA: ${formatWarRopa(state.ropa)}`, 30, 146, 11, state.ropa < WAR.ropaDangerThreshold ? this.colors.red : this.colors.green);
      this.drawText(`SITES LOST: ${lost} / ${state.cities.length}`, 164, 146, 11, lost ? this.colors.red : this.colors.green);

      this.drawWarHudPanel(346, 14, 270, 72);
      this.drawText("WAR CONSOLE", 364, 38, 13, this.colors.white);
      this.drawWarHudMeter(468, 27, 126, 7, state.ropa / WAR.ropaInitial);
      const statusDanger = state.lastStatus.includes("LOST")
        || state.lastStatus.includes("BREACHED")
        || state.lastStatus.includes("DEMISSION")
        || state.lastStatus.includes("ENEMY LOCK");
      const statusColor = statusDanger ? this.colors.red : this.colors.green;
      this.drawText(state.lastStatus, 364, 64, 10, statusColor);
      if (state.lastStatusDetail) this.drawText(state.lastStatusDetail, 364, 82, 9, this.colors.amber);
      this.drawWarFinanceCounter(346, 94, 270, 58, lost);

      this.drawWarHudPanel(662, 12, 286, 110);
      this.drawWarMachinePortrait(machine, 850, 28, 84, 84, corePct);
      this.drawText("MACHINE", 680, 38, 15, this.colors.red);
      this.drawText("STATUS: ACTIVE", 680, 64, 11, this.colors.green);
      this.drawText(`CORE: ${corePct}%`, 680, 88, 12, corePct <= 30 ? this.colors.red : this.colors.amber);
      this.drawText(`HEAVY: ${state.heavyCooldown <= 0 ? "READY" : `${state.heavyCooldown.toFixed(1)}S`}`, 680, 112, 11, this.colors.white);

      this.drawWarGlobalStatusLegend();
      this.drawWarBottomStatusBar();
    };

    Game.prototype.drawWarFinanceCounter = function (x, y, w, h, lost) {
      const state = this.wargame;
      const displayedCost = this.warDisplayedCost();
      const alert = state.costM > 0 || state.ropa < WAR.ropaDangerThreshold;
      const flash = state.financeFlash > 0 && Math.floor(performance.now() / 90) % 2 === 0;
      const color = flash || alert ? this.colors.red : this.colors.green;
      this.drawWarHudPanel(x, y, w, h, color);
      this.drawText("COST / ROPA DROP", x + 16, y + 18, 9, color);
      this.drawText(formatWarCost(displayedCost), x + w - 16, y + 40, 18, color, "right");
      this.drawText(`ROPA ${formatWarRopa(state.ropa)}   SITES ${lost}/${state.cities.length}`, x + 16, y + 52, 8, alert ? this.colors.amber : this.colors.green);
    };

    Game.prototype.drawWarFinanceReportOverlay = function () {
      const report = this.wargame && this.wargame.financeReport;
      if (!report) return;
      const ctx = this.ctx;
      const costM = this.warDisplayedEventCost();
      const progress = clamp(report.elapsed / report.duration, 0, 1);
      const finalHold = progress >= 1;
      const alpha = report.elapsed > report.duration
        ? Math.max(0, 1 - (report.elapsed - report.duration) / report.hold)
        : 1;
      const pulse = 0.72 + Math.sin(performance.now() / 55) * 0.18;

      ctx.save();
      ctx.globalAlpha = alpha;
      const x = 300;
      const y = report.executiveChange ? 424 : 450;
      const w = 360;
      const h = report.executiveChange ? 64 : 46;
      this.drawWarHudPanel(x, y, w, h, this.colors.red);
      ctx.strokeStyle = this.colors.red;
      ctx.shadowColor = this.colors.red;
      ctx.shadowBlur = finalHold ? 5 : 9;
      ctx.globalAlpha = alpha * (finalHold ? 0.28 : 0.18 + pulse * 0.08);
      ctx.strokeRect(x + 7, y + 6, w - 14, h - 12);
      ctx.globalAlpha = alpha;
      this.drawText(`SITE LOST: ${report.siteName.toUpperCase()}`, 480, y + 16, 9, this.colors.red, "center");
      this.drawText(`${formatWarCost(costM)}   ROPA -${formatWarRopaPoints(report.ropaLoss)}`, 480, y + 35, 14, this.colors.red, "center");
      if (report.executiveChange) {
        this.drawText("PATRICK SULLIOT DEMISSIONNE", 480, y + 52, 10, this.colors.amber, "center");
        this.drawText(`${report.executiveChange.replacementName.toUpperCase()} PREND LE RELAIS`, 480, y + 63, 9, this.colors.white, "center");
      }
      ctx.restore();
    };

    Game.prototype.drawWarHudPanel = function (x, y, w, h, color = this.colors.green) {
      const ctx = this.ctx;
      ctx.save();
      ctx.fillStyle = "rgba(0,0,0,0.76)";
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.2;
      ctx.shadowColor = color;
      ctx.shadowBlur = 4;
      ctx.fillRect(x, y, w, h);
      ctx.strokeRect(x, y, w, h);
      ctx.globalAlpha = 0.22;
      ctx.strokeRect(x + 4, y + 4, w - 8, h - 8);
      ctx.restore();
    };

    Game.prototype.drawWarHudMeter = function (x, y, w, h, pct) {
      const ctx = this.ctx;
      const value = clamp(pct || 0, 0, 1);
      ctx.save();
      ctx.strokeStyle = "rgba(57,255,104,0.82)";
      ctx.fillStyle = "rgba(57,255,104,0.16)";
      ctx.strokeRect(x, y, w, h);
      ctx.fillRect(x + 2, y + 2, Math.max(0, (w - 4) * value), h - 4);
      ctx.restore();
    };

    Game.prototype.drawWarGlobalStatusLegend = function () {
      const ctx = this.ctx;
      const x = 52;
      const y = 344;
      const w = 136;
      const h = 126;
      this.drawWarHudPanel(x, y, w, h);
      this.drawText("VINCI STATUS", x + 12, y + 24, 10, this.colors.green);
      const rows = [
        { label: "ACTIVE SITE", color: this.colors.green, kind: "box" },
        { label: "OFFLINE SITE", color: this.colors.red, kind: "box" },
        { label: "CRITICAL TARGET", color: this.colors.amber, kind: "box" },
        { label: "FILIALE / NODE", color: this.colors.green, kind: "circle" },
        { label: "RADAR RANGE", color: this.colors.green, kind: "dash" }
      ];
      rows.forEach((row, index) => {
        const yy = y + 42 + index * 16;
        ctx.save();
        ctx.strokeStyle = row.color;
        ctx.fillStyle = row.kind === "box" ? "rgba(57,255,104,0.08)" : row.color;
        ctx.shadowColor = row.color;
        ctx.shadowBlur = 3;
        if (row.kind === "box") {
          ctx.strokeRect(x + 12, yy - 10, 12, 12);
        } else if (row.kind === "circle") {
          ctx.beginPath();
          ctx.arc(x + 18, yy - 4, 5, 0, Math.PI * 2);
          ctx.stroke();
          ctx.fillRect(x + 17, yy - 5, 2, 2);
        } else if (row.kind === "double") {
          ctx.beginPath();
          ctx.arc(x + 18, yy - 4, 6, 0, Math.PI * 2);
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(x + 18, yy - 4, 2, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.setLineDash([5, 5]);
          ctx.beginPath();
          ctx.moveTo(x + 12, yy - 4);
          ctx.lineTo(x + 28, yy - 4);
          ctx.stroke();
        }
        ctx.restore();
        this.drawText(row.label, x + 36, yy, 9, row.color);
      });
    };

    Game.prototype.drawWarBottomStatusBar = function () {
      const now = new Date();
      const utc = now.toISOString().slice(11, 19);
      const state = this.wargame;
      const liveCities = state.cities.filter(city => city.active).length;
      const threat = liveCities <= 3 || state.ropa < WAR.ropaDangerThreshold ? "HIGH" : state.enemyMissiles.length > 3 ? "ELEVATED" : "GUARDED";
      const threatColor = threat === "HIGH" ? this.colors.red : threat === "ELEVATED" ? this.colors.amber : this.colors.green;
      this.drawWarHudPanel(12, 502, 132, 26);
      this.drawText(`UTC ${utc}`, 30, 520, 11, this.colors.green);
      this.drawWarHudPanel(152, 502, 620, 26);
      this.drawText("[ ARROWS / ZQSD ] MOVE", 180, 520, 11, this.colors.green);
      this.drawText("[ SPACE ] FIRE", 376, 520, 11, this.colors.green);
      this.drawText("[ X / CTRL ] HEAVY", 522, 520, 11, this.colors.green);
      this.drawText("[ ESC ] TITLE", 676, 520, 11, this.colors.green);
      this.drawWarHudPanel(780, 502, 168, 26, threatColor);
      this.drawText(`THREAT LEVEL: ${threat}`, 794, 520, 11, threatColor);
    };

    Game.prototype.warGamePilotPlayer = function () {
      const players = CFG.PLAYERS || [];
      const selectedPilot = this.wargame && this.wargame.selectedPilot;
      if (selectedPilot && selectedPilot.playerId) {
        return this.warGamePilotById(selectedPilot.playerId);
      }
      const session = window.BadPongSession || {};
      if (session.playerId) {
        const sessionPilot = this.warGamePilotById(session.playerId);
        if (sessionPilot) return sessionPilot;
      }
      const playerName = String(session.playerName || window.BadPongCurrentPlayerName || "Francisco").trim();
      const normalizedName = normalizeWarName(warFirstName(playerName));
      return players.find(player => player.id !== "machine" && normalizeWarName(warFirstName(player.name)) === normalizedName)
        || (CFG.playerById && CFG.playerById("francisco"))
        || players.find(player => player.id !== "machine")
        || null;
    };

    Game.prototype.warGamePilotById = function (playerId) {
      const players = CFG.PLAYERS || [];
      if (!playerId) return null;
      const player = (CFG.playerById && CFG.playerById(playerId))
        || players.find(candidate => candidate.id === playerId)
        || null;
      return player && player.id !== "machine" ? player : null;
    };

    Game.prototype.saveWarGamePilotSession = function (pilot) {
      const player = this.warGamePilotById(pilot && pilot.playerId);
      const playerName = (player && player.name) || (pilot && pilot.displayName) || "Olivier";
      window.BadPongCurrentPlayerName = playerName;
      window.BadPongSession = Object.assign({}, window.BadPongSession, {
        playerName,
        playerId: pilot.playerId,
        pilotDisplayName: pilot.displayName,
        pilotCallsign: pilot.callsign
      });
    };

    Game.prototype.resolveWarGameNamedPilot = function (name) {
      const players = CFG.PLAYERS || [];
      const normalizedName = normalizeWarName(warFirstName(name));
      const player = players.find(candidate => candidate.id !== "machine" && normalizeWarName(warFirstName(candidate.name)) === normalizedName)
        || (CFG.playerById && CFG.playerById(normalizedName))
        || null;
      if (!player || player.id === "machine") return null;
      const displayName = String(player.name || name || "UNKNOWN").trim().toUpperCase();
      const callsign = displayName.replace(/[.\s]+/g, "-").replace(/-+$/g, "").toUpperCase();
      return {
        playerId: player.id,
        displayName,
        callsign: callsign || displayName || "UNKNOWN"
      };
    };

    Game.prototype.resolveWarGameSelectedPilot = function () {
      if (this.wargamePilotOverride) return Object.assign({}, this.wargamePilotOverride);
      const session = window.BadPongSession || {};
      const player = this.warGamePilotById(session.playerId);
      if (!player) return null;
      const displayName = String(session.pilotDisplayName || player.name || session.playerName || "UNKNOWN").trim();
      const callsign = String(session.pilotCallsign || displayName.replace(/[.\s]+/g, "-").replace(/-+$/g, "")).trim();
      return {
        playerId: player.id,
        displayName: displayName.toUpperCase() || "UNKNOWN",
        callsign: callsign.toUpperCase() || "UNKNOWN"
      };
    };

    Game.prototype.drawWarPilotPortrait = function (player, x, y, w, h) {
      if (this.drawWarPhotoPortrait(player, x, y, w, h, this.colors.green)) return;
      const ctx = this.ctx;
      ctx.save();
      ctx.fillStyle = "rgba(0,0,0,0.88)";
      ctx.fillRect(x, y, w, h);
      ctx.strokeStyle = this.colors.greenSoft;
      ctx.lineWidth = 1;
      ctx.strokeRect(x, y, w, h);
      ctx.strokeStyle = this.colors.green;
      ctx.fillStyle = "rgba(57,255,104,0.10)";
      ctx.shadowColor = this.colors.green;
      ctx.shadowBlur = 8;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.arc(x + w / 2, y + 28, 19, Math.PI * 1.08, Math.PI * 1.92);
      ctx.lineTo(x + w / 2 + 21, y + 46);
      ctx.lineTo(x + w / 2 - 21, y + 46);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "rgba(239,255,242,0.18)";
      ctx.fillRect(x + 21, y + 28, 32, 8);
      ctx.strokeRect(x + 20, y + 27, 34, 10);
      ctx.beginPath();
      ctx.moveTo(x + 54, y + 36);
      ctx.lineTo(x + 63, y + 42);
      ctx.lineTo(x + 63, y + 49);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x + 24, y + 54);
      ctx.lineTo(x + 50, y + 54);
      ctx.lineTo(x + 60, y + 67);
      ctx.lineTo(x + 14, y + 67);
      ctx.closePath();
      ctx.stroke();
      ctx.globalAlpha = 0.5;
      for (let yy = y + 8; yy < y + h - 4; yy += 7) {
        ctx.beginPath();
        ctx.moveTo(x + 6, yy);
        ctx.lineTo(x + w - 6, yy);
        ctx.stroke();
      }
      ctx.restore();
    };

    Game.prototype.drawWarMachinePortrait = function (machine, x, y, w, h, corePct) {
      const ctx = this.ctx;
      const glitch = this.wargame ? this.wargame.machineGlitch : 0;
      if (this.drawWarPhotoPortrait(machine, x, y, w, h, corePct <= 30 ? this.colors.red : this.colors.green, { glitch })) return;
      ctx.save();
      ctx.fillStyle = "rgba(0,0,0,0.9)";
      ctx.fillRect(x, y, w, h);
      ctx.strokeStyle = corePct <= 30 ? this.colors.red : this.colors.greenSoft;
      ctx.lineWidth = 1;
      ctx.strokeRect(x, y, w, h);
      ctx.strokeStyle = corePct <= 30 ? this.colors.red : this.colors.green;
      ctx.fillStyle = "rgba(57,255,104,0.08)";
      ctx.shadowColor = ctx.strokeStyle;
      ctx.shadowBlur = glitch > 0 ? 16 : 9;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(x + 16, y + 12, 38, 38);
      ctx.fillRect(x + 18, y + 14, 34, 34);
      ctx.fillStyle = ctx.strokeStyle;
      ctx.fillRect(x + 24, y + 24, 8, 7);
      ctx.fillRect(x + 40, y + 24, 8, 7);
      ctx.strokeRect(x + 28, y + 39, 16, 6);
      for (let i = 0; i < 4; i++) ctx.fillRect(x + 30 + i * 4, y + 40, 1, 5);
      ctx.beginPath();
      ctx.moveTo(x + 35, y + 50);
      ctx.lineTo(x + 35, y + 60);
      ctx.moveTo(x + 22, y + 60);
      ctx.lineTo(x + 48, y + 60);
      ctx.stroke();
      if (glitch > 0) {
        ctx.globalAlpha = Math.min(0.7, glitch * 2.2);
        ctx.fillStyle = this.colors.green;
        ctx.fillRect(x + 7, y + 18, 16, 2);
        ctx.fillRect(x + 42, y + 34, 20, 2);
        ctx.fillRect(x + 15, y + 54, 28, 2);
      }
      ctx.restore();
    };

    Game.prototype.drawWarPhotoPortrait = function (player, x, y, w, h, tint, options = {}) {
      const asset = player && this.playerAssets && this.playerAssets[player.assetId || player.id];
      if (!asset || !asset.loaded) return false;
      const ctx = this.ctx;
      const glitch = options.glitch || 0;
      const inset = 4;
      const innerW = w - inset * 2;
      const innerH = h - inset * 2;
      const img = asset.img;
      const scale = Math.max(innerW / img.width, innerH / img.height);
      const iw = Math.ceil(img.width * scale);
      const ih = Math.ceil(img.height * scale);
      const ix = Math.floor(x + inset + (innerW - iw) / 2);
      const iy = Math.floor(y + inset + (innerH - ih) / 2);

      ctx.save();
      ctx.fillStyle = "rgba(0,0,0,0.9)";
      ctx.fillRect(x, y, w, h);
      ctx.strokeStyle = tint;
      ctx.lineWidth = 1;
      ctx.shadowColor = tint;
      ctx.shadowBlur = glitch > 0 ? 16 : 8;
      ctx.strokeRect(x, y, w, h);
      ctx.beginPath();
      ctx.rect(x + inset, y + inset, innerW, innerH);
      ctx.clip();
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.filter = "grayscale(0.78) contrast(1.12) brightness(0.92) sepia(0.7) hue-rotate(58deg) saturate(2.2)";
      ctx.drawImage(img, ix, iy, iw, ih);
      ctx.filter = "none";
      ctx.globalCompositeOperation = "screen";
      ctx.globalAlpha = 0.14;
      ctx.fillStyle = tint;
      ctx.fillRect(x + inset, y + inset, innerW, innerH);
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 0.18;
      ctx.fillStyle = "#000";
      for (let yy = y + inset; yy < y + h - inset; yy += 5) ctx.fillRect(x + inset, yy, innerW, 1);
      if (glitch > 0) {
        ctx.globalAlpha = Math.min(0.68, glitch * 2.1);
        ctx.fillStyle = tint;
        ctx.fillRect(x + 9, y + 18, 24, 2);
        ctx.fillRect(x + 32, y + 44, 30, 2);
      }
      ctx.restore();
      return true;
    };

    Game.prototype.drawWarGameGameOver = function () {
      const ctx = this.ctx;
      const state = this.wargame || { gameOverReason: "aircraft" };
      ctx.save();
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, this.width, this.height);
      if (state.gameOverReason === "humanity") {
        this.neon("ROPA COLLAPSED", this.width / 2, 242, 42, this.colors.red, "center");
        this.neon("GAME OVER", this.width / 2, 300, 58, this.colors.red, "center");
        this.drawText("PATRICK KADRI IS FIRED", this.width / 2, 346, 18, this.colors.amber, "center");
      } else {
        this.neon("GAME OVER", this.width / 2, 284, 72, this.colors.red, "center");
      }
      this.drawWarGameRestartButton(this.warGameRestartButtonAlpha());
      ctx.restore();
    };

    Game.prototype.warGameVictoryPlayerName = function () {
      const selectedPilot = this.wargame && this.wargame.selectedPilot;
      if (selectedPilot && selectedPilot.displayName) return selectedPilot.displayName;
      const session = window.BadPongSession || {};
      const playerName = String(session.playerName || window.BadPongCurrentPlayerName || "Francisco").trim();
      return playerName || "Francisco";
    };

    Game.prototype.drawWarGameVictory = function () {
      const ctx = this.ctx;
      const playerName = this.warGameVictoryPlayerName();
      ctx.save();
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, this.width, this.height);
      this.drawWarConsoleGrid(0.16);
      this.neon("MACHINE CORE DESTROYED", 480, 178, 32, this.colors.green, "center");
      this.drawText("GLOBAL STRIKE ABORTED", 480, 232, 23, this.colors.white, "center");
      this.drawText("ROPA STATUS: DAMAGED BUT ALIVE", 480, 272, 19, this.colors.amber, "center");
      this.neon("MISSION COMPLETE", 480, 330, 42, this.colors.green, "center");
      this.drawText(`${playerName} a sauvé l'humanité. Merci.`, 480, 382, 18, this.colors.white, "center");
      this.drawWarGameRestartButton();
      this.drawText("ÉCHAP : RETOUR TITRE", 480, 478, 13, this.colors.white, "center");
      this.drawWarScanlines();
      ctx.restore();
    };

    Game.prototype.warGameRestartButton = function () {
      return {
        x: 350,
        y: this.screen === "wargameVictory" ? 414 : 366,
        w: 260,
        h: 36,
        label: "RECOMMENCER"
      };
    };

    Game.prototype.warGameRestartButtonAlpha = function () {
      if (this.screen !== "wargameGameOver") return 1;
      const elapsed = this.wargame ? this.wargame.gameOverElapsed || 0 : 0;
      return clamp(
        (elapsed - WAR.gameOverRestartDelay) / WAR.gameOverRestartFadeDuration,
        0,
        1
      );
    };

    Game.prototype.warGameRestartButtonReady = function () {
      if (this.screen !== "wargameGameOver") return true;
      const elapsed = this.wargame ? this.wargame.gameOverElapsed || 0 : 0;
      return elapsed >= WAR.gameOverRestartDelay;
    };

    Game.prototype.drawWarGameRestartButton = function (alpha = 1) {
      if (alpha <= 0) return;
      const ctx = this.ctx;
      const button = this.warGameRestartButton();
      ctx.save();
      ctx.globalAlpha *= clamp(alpha, 0, 1);
      if (this.drawArcadeButton) {
        this.drawArcadeButton(button.x, button.y, button.w, button.h, button.label, this.colors.amber);
        ctx.restore();
        return;
      }
      ctx.strokeStyle = this.colors.amber;
      ctx.strokeRect(button.x, button.y, button.w, button.h);
      this.drawText(button.label, button.x + button.w / 2, button.y + 22, 13, this.colors.amber, "center");
      ctx.restore();
    };

    Game.prototype.handleWarGameEndPointer = function (x, y) {
      if (!this.warGameRestartButtonReady()) return true;
      const button = this.warGameRestartButton();
      if (warInside(x, y, button.x, button.y, button.w, button.h)) {
        this.restartWarGame();
      }
      return true;
    };

    Game.prototype.drawWarConsoleGrid = function (alpha) {
      const ctx = this.ctx;
      ctx.save();
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, this.width, this.height);
      ctx.globalAlpha = alpha * 0.42;
      ctx.strokeStyle = "rgba(57,255,104,0.30)";
      ctx.lineWidth = 1;
      for (let x = 0; x <= this.width; x += 10) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, this.height);
        ctx.stroke();
      }
      for (let y = 0; y <= this.height; y += 10) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(this.width, y);
        ctx.stroke();
      }
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = this.colors.greenSoft;
      for (let x = 40; x < this.width; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, this.height);
        ctx.stroke();
      }
      for (let y = 80; y < this.height; y += 32) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(this.width, y);
        ctx.stroke();
      }
      ctx.globalAlpha = 0.16;
      ctx.fillStyle = this.colors.green;
      for (let x = 4; x < this.width; x += 20) {
        for (let y = 4; y < this.height; y += 20) {
          ctx.fillRect(x, y, 1, 1);
        }
      }
      ctx.restore();
    };

    Game.prototype.drawWarTrail = function (x1, y1, x2, y2, color) {
      const ctx = this.ctx;
      ctx.save();
      ctx.strokeStyle = color;
      ctx.globalAlpha = 0.42;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
      ctx.restore();
    };

    Game.prototype.drawWarGlitch = function (amount) {
      if (!amount) return;
      const ctx = this.ctx;
      ctx.save();
      ctx.globalAlpha = Math.min(0.35, amount);
      ctx.fillStyle = this.colors.green;
      for (let i = 0; i < 14; i++) {
        const x = Math.random() * this.width;
        const y = Math.random() * this.height;
        ctx.fillRect(x, y, 24 + Math.random() * 70, 2);
      }
      ctx.restore();
    };

    Game.prototype.drawWarScanlines = function () {
      const ctx = this.ctx;
      ctx.save();
      ctx.globalAlpha = 0.15;
      ctx.fillStyle = "#000";
      for (let y = 0; y < this.height; y += 4) ctx.fillRect(0, y, this.width, 2);
      ctx.globalAlpha = 0.22;
      const halo = ctx.createRadialGradient(this.width / 2, this.height / 2, 120, this.width / 2, this.height / 2, this.width * 0.72);
      halo.addColorStop(0, "rgba(57,255,104,0.06)");
      halo.addColorStop(0.58, "rgba(0,0,0,0)");
      halo.addColorStop(1, "rgba(0,0,0,0.88)");
      ctx.fillStyle = halo;
      ctx.fillRect(0, 0, this.width, this.height);
      ctx.globalAlpha = 0.052 + Math.sin(performance.now() / 180) * 0.018;
      ctx.fillStyle = this.colors.green;
      ctx.fillRect(0, 0, this.width, this.height);
      ctx.restore();
    };
  }

  function createWarCity(options) {
    return Object.assign({}, options, {
      active: true,
      lost: false
    });
  }

  function createWarNode(options) {
    return {
      name: options.name,
      x: options.x,
      y: options.y,
      hp: options.hp,
      maxHp: options.hp,
      active: true,
      destroyed: false,
      core: !!options.core
    };
  }

  function rotateWarAngleTowards(from, to, step) {
    const delta = normalizeWarAngle(to - from);
    if (Math.abs(delta) <= step) return to;
    return from + Math.sign(delta) * step;
  }

  function normalizeWarAngle(angle) {
    let value = angle;
    while (value > Math.PI) value -= Math.PI * 2;
    while (value < -Math.PI) value += Math.PI * 2;
    return value;
  }

  function moveWarList(list, dt) {
    for (let i = list.length - 1; i >= 0; i--) {
      const item = list[i];
      item.prevX = item.x;
      item.prevY = item.y;
      item.x += item.vx * dt;
      item.y += item.vy * dt;
      item.life -= dt;
    }
  }

  function warDistance(a, b) {
    return Math.hypot((a.x || 0) - (b.x || 0), (a.y || 0) - (b.y || 0));
  }

  function warCircleHit(a, b, radius) {
    return warDistance(a, b) <= radius;
  }

  function warInside(x, y, bx, by, bw, bh) {
    return x >= bx && x <= bx + bw && y >= by && y <= by + bh;
  }

  function isWarSanctuary(city) {
    return !!city && (city.type === "sanctuary" || city.isSanctuary);
  }

  function warFirstName(name) {
    const cleanName = String(name || "").trim();
    if (!cleanName) return "";
    return cleanName.split(/\s+/)[0].replace(/[.,;:]+$/g, "");
  }

  function normalizeWarName(name) {
    return warFirstName(name)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
  }

  function formatWarPilotName(player, selectedPilot) {
    const name = (selectedPilot && selectedPilot.displayName) || warFirstName(player && player.name) || "Francisco";
    const label = name.trim().toUpperCase() || "UNKNOWN";
    return label.length > 16 ? `${label.slice(0, 15)}~` : label;
  }

  function formatWarPilotCallsign(player, selectedPilot) {
    const callsign = (selectedPilot && selectedPilot.callsign) || formatWarPilotName(player, null);
    const label = callsign.trim().toUpperCase() || "UNKNOWN";
    return label.length > 18 ? `${label.slice(0, 17)}~` : label;
  }

  function randomItem(list) {
    return list[Math.floor(Math.random() * list.length)];
  }

  function formatWarCost(value) {
    const amount = Math.max(0, Math.round(Number(value) || 0));
    return `${amount} M€`;
  }

  function formatWarRopa(value) {
    const number = Math.max(0, Number(value) || 0);
    return `${number.toFixed(1)}%`;
  }

  function formatWarRopaPoints(value) {
    const number = Math.max(0, Number(value) || 0);
    return `${number.toFixed(1)} pt`;
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  window.installWargame = installWargame;
})();
