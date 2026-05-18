const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");

function loadGame(playerIds) {
  const ids = playerIds.includes("machine") ? playerIds.slice() : playerIds.concat("machine");
  const players = ids.map(id => ({
    id,
    name: id === "machine" ? "Machine" : id.replace(/-/g, " ").toUpperCase(),
    initials: id === "machine" ? "CPU" : id.slice(0, 2).toUpperCase(),
    files: [],
    difficulty: id.startsWith("machine") ? "normal" : "easy",
    baseId: id.startsWith("machine") ? "machine" : undefined,
    assetId: id.startsWith("machine") ? "machine" : id
  }));
  const paddleTypes = [
    { id: "round", label: "LIBÉRO", shapeLabel: "NORMAL", height: 72, width: 18, speedFactor: 1 },
    { id: "triangle", label: "NUMÉRO 10", shapeLabel: "TRIANGULAIRE", height: 70, width: 18, speedFactor: 1.5 },
    { id: "weird", label: "ATTAQUANT", shapeLabel: "DEMI-CERCLE", height: 74, width: 18, speedFactor: 2 }
  ];
  const byId = new Map(players.map(player => [player.id, player]));
  const context = {
    console,
    Date,
    Math,
    performance: { now: () => 1000 },
    window: {
      BadPongConfig: {
        PLAYERS: players,
        BASE_SPEED: 350,
        BOOSTED_SAVE_REWARD: 50,
        SPEEDUP_PADDLE_HIT: 1.06,
        SPEEDUP_MAX_MULTIPLIER: 2.2,
        SCORE_TO_WIN: 5,
        MULTIBALL_INTERVAL_SECONDS: 20,
        ATTACKER_SPEEDUP_INTERVAL_SECONDS: 30,
        ATTACKER_SPEEDUP_MULTIPLIER: 1.3,
        PADDLE_TYPES: paddleTypes,
        playerById(id) {
          return byId.get(id) || players[0];
        },
        matchModeById(id) {
          return { id, label: "TEST", description: "" };
        },
        paddleTypeById(id) {
          return paddleTypes.find(type => type.id === id) || paddleTypes[0];
        }
      },
      BadPongStorage: {
        recordTournament(result) {
          return { tournamentWins: result.won ? 1 : 0, tournamentLosses: result.won ? 0 : 1 };
        }
      }
    }
  };
  vm.createContext(context);
  const gameSource = fs.readFileSync(path.join(root, "js/game.js"), "utf8");
  vm.runInContext(gameSource, context);
  return context.window;
}

function loadTargets() {
  const context = { window: {} };
  vm.createContext(context);
  const targetsSource = fs.readFileSync(path.join(root, "js/targets.js"), "utf8");
  vm.runInContext(targetsSource, context);
  return context.window.BadPongConfig;
}

function loadPaddleWithConfig(config) {
  const context = {
    window: {
      BadPongConfig: config
    }
  };
  vm.createContext(context);
  const paddleSource = fs.readFileSync(path.join(root, "js/paddle.js"), "utf8");
  vm.runInContext(paddleSource, context);
  return context.window.Paddle;
}

function loadBall() {
  const context = { window: {}, Math };
  vm.createContext(context);
  const ballSource = fs.readFileSync(path.join(root, "js/ball.js"), "utf8");
  vm.runInContext(ballSource, context);
  return context.window.Shuttle;
}

function loadWargameHarness() {
  const players = [
    { id: "francisco", name: "Francisco", assetId: "francisco", difficulty: "normal" },
    { id: "olivier", name: "Olivier", assetId: "olivier", difficulty: "normal" },
    { id: "machine", name: "La Machine", assetId: "machine", difficulty: "boss" }
  ];
  const byId = new Map(players.map(player => [player.id, player]));
  const context = {
    console,
    Math,
    Date,
    performance: { now: () => 1000 },
    setTimeout() { return 1; },
    clearTimeout() {},
    window: {
      BadPongConfig: {
        ENABLE_WARGAME: true,
        SOUND_TOGGLE_KEY: "=",
        PLAYERS: players,
        playerById(id) {
          return byId.get(id) || players[0];
        }
      },
      BadPongSession: {},
      BadPongCurrentPlayerName: "Francisco"
    }
  };
  vm.createContext(context);
  vm.runInContext(`
    function Game() {
      this.screen = "title";
      this.audio = { play() {} };
      this.keys = { clear() {} };
    }
    Game.prototype.draw = function () {};
    Game.prototype.update = function () {};
    Game.prototype.handleKeyDown = function () {};
    Game.prototype.startTitle = function () { this.screen = "title"; };
    Game.prototype.stopWarGameRadarLoop = function () {};
    window.Game = Game;
  `, context);
  const wargameSource = fs.readFileSync(path.join(root, "js/wargame.js"), "utf8");
  vm.runInContext(wargameSource, context);
  vm.runInContext("window.installWargame(window.Game);", context);
  return context.window;
}

function createGameWithTournament(windowRef, bracket, humanId = "p1") {
  const game = Object.create(windowRef.Game.prototype);
  game.audio = { play() {} };
  game.stats = {};
  game.tournamentSummaryMatchId = "";
  game.tournament = {
    seed: bracket.seed,
    humanId,
    participants: bracket.participants,
    bracketSlots: bracket.bracketSlots,
    playersById: bracket.playersById,
    bracketSize: bracket.bracketSize,
    machineCount: bracket.machineCount,
    rounds: bracket.rounds,
    matches: bracket.rounds.flat(),
    aiDifficulty: "normal",
    completedTournamentMatches: [],
    shownTransitions: {},
    lastAutomaticMatchId: "",
    result: null
  };
  return game;
}

function isGeneratedMachine(id) {
  return /^machine-\d+$/.test(String(id));
}

function firstRoundTypeCounts(bracket) {
  const counts = {
    humanHuman: 0,
    humanMachine: 0,
    machineMachine: 0
  };
  bracket.rounds[0].forEach(match => {
    const aMachine = isGeneratedMachine(match.playerA);
    const bMachine = isGeneratedMachine(match.playerB);
    if (aMachine && bMachine) counts.machineMachine += 1;
    else if (aMachine || bMachine) counts.humanMachine += 1;
    else counts.humanHuman += 1;
  });
  return counts;
}

test("bracket sizes are completed with real machine participants", () => {
  const cases = [
    [2, 0],
    [3, 1],
    [5, 3],
    [8, 0],
    [12, 4],
    [16, 0],
    [17, 15]
  ];
  for (const [count, expectedMachines] of cases) {
    const ids = Array.from({ length: count }, (_, index) => `p${index + 1}`);
    const windowRef = loadGame(ids);
    const bracket = windowRef.BadPongTournament.createTournamentBracket(ids, { seed: 1234 });
    const expectedSize = windowRef.BadPongTournament.nextPowerOfTwo(Math.max(2, count));
    assert.equal(bracket.bracketSize, expectedSize, `${count} participants bracket size`);
    assert.equal(bracket.machineCount, expectedMachines, `${count} participants machine count`);
    assert.equal(bracket.participants.length, expectedSize);
    assert.equal(bracket.bracketSlots.length, expectedSize);
    assert.equal(bracket.bracketSlots.filter(slot => slot === null).length, 0);
    assert.equal(bracket.bracketSlots.filter(id => /^machine-\d+$/.test(id)).length, expectedMachines);

    const firstRoundPairs = [];
    for (let index = 0; index < bracket.bracketSlots.length; index += 2) {
      firstRoundPairs.push(bracket.bracketSlots.slice(index, index + 2));
    }
    assert.ok(firstRoundPairs.every(pair => pair[0] && pair[1]), `${count} participants has only real matches`);
  }
});

test("football players are generated from local portrait filenames", () => {
  const config = loadTargets();
  const names = config.PLAYERS.map(player => player.name);
  assert.equal(JSON.stringify(names), JSON.stringify([
    "Francisco",
    "Julien",
    "Sandra",
    "Hubert",
    "Louis",
    "Olivier",
    "Benjamin",
    "Pascal",
    "Patricia",
    "Kamar",
    "Yohan",
    "Vijay",
    "Audrey",
    "Alexis",
    "Mostapha",
    "Louis-L",
    "Stéphanie",
    "Lauriane",
    "Cécile",
    "Florence",
    "La Machine"
  ]));
  assert.equal(config.PLAYERS[0].id, "francisco");
  for (const file of config.PLAYER_IMAGE_FILES) {
    assert.equal(fs.existsSync(path.join(root, "assets/images", file)), true, `${file} exists`);
  }
});

test("football match modes include multiballs", () => {
  const config = loadTargets();
  const modes = config.MATCH_MODES.map(mode => mode.id);
  assert.equal(JSON.stringify(modes), JSON.stringify(["speed", "multi", "normal"]));
  assert.equal(config.matchModeById("multi").label, "MULTIBALLS");
});

test("football ball is fifteen percent smaller", () => {
  const Shuttle = loadBall();
  const shuttle = new Shuttle(480, 270, 1, 350);

  assert.equal(Math.round(shuttle.r * 10), 102);
});

test("keeper styles expose fifty and one hundred percent speed bonuses", () => {
  const config = loadTargets();
  const Paddle = loadPaddleWithConfig(config);
  const numero10 = new Paddle("left", 50, "triangle", "#39ff68");
  const attaquant = new Paddle("left", 50, "weird", "#39ff68");

  assert.equal(config.paddleTypeById("round").speedFactor, 1);
  assert.equal(config.paddleTypeById("triangle").speedFactor, 1.5);
  assert.equal(config.paddleTypeById("weird").speedFactor, 2);
  assert.equal(JSON.stringify(config.PADDLE_TYPES.map(type => type.label)), JSON.stringify(["LIBÉRO", "NUMÉRO 10", "ATTAQUANT"]));
  assert.equal(JSON.stringify(config.PADDLE_TYPES.map(type => type.shapeLabel)), JSON.stringify(["NORMAL", "TRIANGULAIRE", "DEMI-CERCLE"]));
  assert.equal(numero10.impact({ y: numero10.cy }).speedFactor, 1.5);
  assert.equal(attaquant.impact({ y: attaquant.cy }).speedFactor, 2);
});

test("attaquant style raises match speed by thirty percent every thirty seconds", () => {
  const windowRef = loadGame(["p1", "p2"]);
  const game = Object.create(windowRef.Game.prototype);
  const shuttle = {
    vx: 100,
    vy: 0,
    baseSpeed: 100,
    speedMultiplier: 1,
    speedBoostActive: false,
    get speed() {
      return Math.hypot(this.vx, this.vy);
    },
    normalizeTo(speed) {
      this.vx = speed;
      this.vy = 0;
    }
  };

  game.currentMatchMode = { id: "normal" };
  game.left = { typeId: "weird" };
  game.right = { typeId: "round" };
  game.shuttles = [shuttle];
  game.audio = { play() {} };
  game.message = () => {};
  game.elapsed = 0;
  game.attackerSpeedupLevel = 0;
  game.attackerSpeedupActive = true;
  game.nextAttackerSpeedupAt = 30;

  game.updateAttackerSpeedup();
  assert.equal(shuttle.speed, 100);

  game.elapsed = 30;
  game.updateAttackerSpeedup();
  assert.equal(game.attackerSpeedupLevel, 1);
  assert.equal(Math.round(shuttle.speed), 130);
  assert.equal(Math.round(shuttle.baseSpeed), 130);

  game.elapsed = 60;
  game.updateAttackerSpeedup();
  assert.equal(game.attackerSpeedupLevel, 2);
  assert.equal(Math.round(shuttle.speed), 169);
  assert.equal(Math.round(shuttle.baseSpeed), 169);
  assert.equal(Math.round(game.currentServeSpeed()), Math.round(350 * 1.5 * 1.69));
});

test("wargame Olivier access skips identity check screen", () => {
  const windowRef = loadWargameHarness();
  const game = new windowRef.Game();

  for (const key of "OLIVIER".toLowerCase()) {
    game.captureWarGameUnlock(key);
  }

  assert.equal(game.screen, "wargameBoot");
  assert.notEqual(game.screen, "wargameOlivierSelect");
  assert.equal(game.wargame.selectedPilot.displayName, "OLIVIER");
  assert.equal(windowRef.BadPongSession.playerId, "olivier");
  assert.equal(game.warGameBootLines().some(line => /IDENTITY/i.test(line)), false);
});

test("wargame sanctuary is GEOSTOCK", () => {
  const windowRef = loadWargameHarness();
  const game = new windowRef.Game();

  game.resetWarGameState();
  const sanctuary = game.wargame.cities.find(city => city.type === "sanctuary");

  assert.equal(sanctuary.id, "geostock");
  assert.equal(sanctuary.name, "GEOSTOCK");
  assert.equal(sanctuary.displayName, "GEOSTOCK");
  assert.equal(game.wargame.lastStatus, "GEOSTOCK ONLINE");
});

test("wargame end restart button starts a fresh mission", () => {
  const windowRef = loadWargameHarness();
  const game = new windowRef.Game();

  game.resetWarGameState();
  game.wargame.humanity = 12;
  game.startWarGameGameOver("aircraft");

  assert.equal(game.screen, "wargameGameOver");
  assert.equal(game.wargame.gameOver, true);
  assert.equal(game.wargame.gameOverElapsed, 0);
  assert.equal(game.warGameRestartButtonAlpha(), 0);

  game.handleWarGameEndPointer(480, 384);
  assert.equal(game.screen, "wargameGameOver");

  game.handleWarGameKey("Enter", () => {});
  assert.equal(game.screen, "wargameGameOver");

  game.updateWarGameGameOver(4.6);
  assert.equal(game.warGameRestartButtonReady(), true);
  assert.ok(game.warGameRestartButtonAlpha() > 0);
  assert.ok(game.warGameRestartButtonAlpha() < 1);

  game.handleWarGameEndPointer(480, 384);

  assert.equal(game.screen, "wargame");
  assert.equal(game.wargame.gameOver, false);
  assert.equal(game.wargame.humanity, 100);
  assert.equal(game.wargame.playerAircraft.destroyed, false);
});

test("solo and duel matches show player faces before kickoff", () => {
  const windowRef = loadGame(["francisco", "julien"]);
  const game = Object.create(windowRef.Game.prototype);
  game.audio = { play() {} };
  game.message = () => {};
  game.resolvePlayerForMatch = id => ({ id, name: id.toUpperCase() });
  game.selected = {
    humanId: "francisco",
    p1Id: "francisco",
    p2Id: "julien",
    opponentId: "machine",
    matchMode: "speed",
    aiDifficulty: "easy",
    p1Paddle: "round",
    p2Paddle: "triangle"
  };

  game.startSoloMatch();
  assert.equal(game.screen, "matchIntro");
  assert.equal(game.pendingMatchConfig.kind, "solo");
  assert.equal(game.pendingMatchConfig.leftPlayerId, "francisco");
  assert.equal(game.pendingMatchConfig.rightPlayerId, "machine");

  game.startDuelMatch();
  assert.equal(game.screen, "matchIntro");
  assert.equal(game.pendingMatchConfig.kind, "duel");
  assert.equal(game.pendingMatchConfig.leftPlayerId, "francisco");
  assert.equal(game.pendingMatchConfig.rightPlayerId, "julien");

  let launchedConfig = null;
  game.beginMatch = config => {
    launchedConfig = config;
    game.pendingMatchConfig = null;
    game.screen = "play";
  };
  game.handleMatchIntroKey("Enter");
  assert.equal(game.screen, "play");
  assert.equal(launchedConfig.kind, "duel");
  assert.equal(game.pendingMatchConfig, null);
});

test("match intro arrows can move focus between launch and home", () => {
  const windowRef = loadGame(["francisco", "julien"]);
  const game = Object.create(windowRef.Game.prototype);
  let wentHome = false;
  let launched = false;

  game.audio = { play() {} };
  game.screen = "matchIntro";
  game.waitingControl = null;
  game.tournamentExitPrompt = null;
  game.homeButtonFocused = false;
  game.matchIntroFocus = "launch";
  game.goHome = () => {
    wentHome = true;
    return true;
  };
  game.launchPendingMatch = () => {
    launched = true;
    return true;
  };

  game.handleKeyDown("ArrowUp");
  assert.equal(game.homeButtonFocused, true);
  assert.equal(game.matchIntroFocus, "home");

  game.handleKeyDown("ArrowDown");
  assert.equal(game.homeButtonFocused, false);
  assert.equal(game.matchIntroFocus, "launch");

  game.handleKeyDown("Enter");
  assert.equal(launched, true);
  assert.equal(wentHome, false);

  launched = false;
  game.handleKeyDown("ArrowRight");
  game.handleKeyDown("Enter");
  assert.equal(wentHome, true);
  assert.equal(launched, false);
});

test("pause arrow keys select keeper shapes", () => {
  const windowRef = loadGame(["francisco", "julien"]);
  const game = Object.create(windowRef.Game.prototype);
  game.audio = { play() {} };
  game.message = () => {};
  game.bounds = { top: 82, bottom: 506 };
  game.leftControl = "p1";
  game.rightControl = "p2";
  game.selected = { p1Paddle: "round", p2Paddle: "round" };
  game.currentMatchConfig = { leftPaddleType: "round", rightPaddleType: "round" };
  game.left = {
    typeId: "round",
    setType(id) { this.typeId = id; },
    clamp() {}
  };
  game.right = {
    typeId: "round",
    setType(id) { this.typeId = id; },
    clamp() {}
  };

  game.pauseKeeperRole = "p1";
  game.handlePauseKey("ArrowRight");
  assert.equal(game.left.typeId, "round");
  assert.equal(game.pauseKeeperFocusedType("p1"), "triangle");
  game.handlePauseKey("Enter");
  assert.equal(game.left.typeId, "triangle");
  assert.equal(game.selected.p1Paddle, "triangle");
  assert.equal(game.currentMatchConfig.leftPaddleType, "triangle");

  game.handlePauseKey("ArrowDown");
  assert.equal(game.pauseKeeperRole, "p2");
  game.handlePauseKey("ArrowRight");
  assert.equal(game.right.typeId, "round");
  assert.equal(game.pauseKeeperFocusedType("p2"), "triangle");
  game.handlePauseKey("Enter");
  assert.equal(game.right.typeId, "triangle");
  assert.equal(game.selected.p2Paddle, "triangle");
  assert.equal(game.currentMatchConfig.rightPaddleType, "triangle");

  game.handlePauseKey("ArrowLeft");
  assert.equal(game.pauseKeeperFocusedType("p2"), "round");
  assert.equal(game.right.typeId, "triangle");
  game.handlePauseKey("Enter");
  assert.equal(game.right.typeId, "round");
});

test("pause arrow keys are handled before home button focus", () => {
  const windowRef = loadGame(["francisco", "julien"]);
  const game = Object.create(windowRef.Game.prototype);
  let handledKey = "";
  game.screen = "pause";
  game.waitingControl = null;
  game.tournamentExitPrompt = null;
  game.handlePauseKey = key => { handledKey = key; };
  game.handleHomeButtonKey = () => {
    throw new Error("home focus should not intercept pause arrows");
  };

  game.handleKeyDown("ArrowRight");

  assert.equal(handledKey, "ArrowRight");
});

test("pause up and down arrows can reach and leave the home button", () => {
  const windowRef = loadGame(["francisco", "julien"]);
  const game = Object.create(windowRef.Game.prototype);
  game.audio = { play() {} };
  game.message = () => {};
  game.bounds = { top: 82, bottom: 506 };
  game.leftControl = "p1";
  game.rightControl = "p2";
  game.selected = { p1Paddle: "round", p2Paddle: "round" };
  game.currentMatchConfig = { leftPaddleType: "round", rightPaddleType: "round" };
  game.left = {
    typeId: "round",
    setType(id) { this.typeId = id; },
    clamp() {}
  };
  game.right = {
    typeId: "round",
    setType(id) { this.typeId = id; },
    clamp() {}
  };

  game.pauseKeeperRole = "p1";
  game.handlePauseKey("ArrowUp");
  assert.equal(game.homeButtonFocused, true);

  game.handlePauseKey("ArrowDown");
  assert.equal(game.homeButtonFocused, false);
  assert.equal(game.pauseKeeperRole, "p1");
});

test("football goal line scores only through the goal mouth", () => {
  const windowRef = loadGame(["p1", "p2"]);
  const game = Object.create(windowRef.Game.prototype);
  game.bounds = { top: 82, bottom: 506, left: 28, right: 932 };
  let scored = "";
  let bounced = false;
  game.scorePoint = side => { scored = side; };
  game.onWallHit = () => { bounced = true; };

  game.resolveGoalLine({ x: 34, y: 294, r: 12, vx: -120, vy: 0 });
  assert.equal(scored, "right");
  assert.equal(bounced, false);

  scored = "";
  bounced = false;
  const outsideGoal = { x: 34, y: 96, r: 12, vx: -120, vy: 0 };
  game.resolveGoalLine(outsideGoal);
  assert.equal(scored, "");
  assert.equal(bounced, true);
  assert.ok(outsideGoal.vx > 0);
});

test("stopping an opponent boosted shot rewards the defender booster gauge", () => {
  const windowRef = loadGame(["p1", "p2"]);
  const game = Object.create(windowRef.Game.prototype);
  const defender = {
    side: "right",
    x: 900,
    y: 200,
    w: 18,
    h: 72,
    power: 10,
    get cy() { return this.y + this.h / 2; },
    impact() { return { angleFactor: 0, speedFactor: 1 }; }
  };
  const boostedShot = {
    x: 900,
    y: 236,
    r: 12,
    vx: 420,
    vy: 0,
    baseSpeed: 350,
    speedMultiplier: 1,
    speedBoostActive: true,
    speedBoostTarget: "right",
    speedBoostOwner: "left",
    speedBoostBaseSpeed: 350,
    get speed() { return Math.hypot(this.vx, this.vy); },
    normalizeTo(speed) { this.vx = speed; this.vy = 0; },
    clearSpeedBoost() { this.speedBoostActive = false; this.speedBoostTarget = ""; this.speedBoostOwner = ""; }
  };
  game.currentMatchMode = { id: "normal" };
  game.speedBoosterArmed = { left: false, right: false };
  game.right = defender;
  game.colors = { green: "#39ff68", red: "#ff3855" };
  game.audio = { play() {} };
  game.message = () => {};
  game.sideName = () => "La Machine";
  game.explosion = () => {};

  game.collidePaddle(boostedShot, defender, "right");

  assert.equal(defender.power, 68);
  assert.equal(boostedShot.speedBoostActive, false);
});

test("smart seeding maximizes human versus human first round matches", () => {
  const cases = [
    [5, { humanHuman: 2, humanMachine: 1, machineMachine: 1 }],
    [6, { humanHuman: 3, humanMachine: 0, machineMachine: 1 }],
    [7, { humanHuman: 3, humanMachine: 1, machineMachine: 0 }],
    [3, { humanHuman: 1, humanMachine: 1, machineMachine: 0 }]
  ];
  for (const [count, expected] of cases) {
    const ids = Array.from({ length: count }, (_, index) => `p${index + 1}`);
    const windowRef = loadGame(ids);
    const bracket = windowRef.BadPongTournament.createTournamentBracket(ids, { seed: 2026 + count });
    assert.deepEqual(firstRoundTypeCounts(bracket), expected, `${count} humans should preserve human pairings`);
  }
});

test("five humans never produce three human versus machine matches", () => {
  const ids = Array.from({ length: 5 }, (_, index) => `p${index + 1}`);
  const windowRef = loadGame(ids);
  for (let seed = 1; seed <= 20; seed++) {
    const bracket = windowRef.BadPongTournament.createTournamentBracket(ids, { seed });
    const counts = firstRoundTypeCounts(bracket);
    assert.equal(counts.humanHuman, 2, `seed ${seed} should keep two human pairs`);
    assert.notEqual(counts.humanMachine, 3, `seed ${seed} should not scatter machines onto humans`);
  }
});

test("first human versus machine match must be played", () => {
  const windowRef = loadGame(["p1"]);
  const bracket = windowRef.BadPongTournament.createTournamentBracket(["p1"], { seed: 404 });
  const game = createGameWithTournament(windowRef, bracket);
  const next = game.setNextTournamentMatch();
  const match = game.tournament.matches[0];
  assert.equal(next, match);
  assert.equal(match.status, "current");
  assert.equal(match.winner, null);
  assert.equal(game.tournament.result, null);
});

test("played human versus machine match is awarded to the human", () => {
  const windowRef = loadGame(["p1"]);
  const game = createGameWithTournament(windowRef, {
    seed: 405,
    participants: ["p1", "machine-1"],
    bracketSlots: ["p1", "machine-1"],
    playersById: {
      p1: windowRef.BadPongConfig.playerById("p1"),
      "machine-1": { id: "machine-1", name: "Machine 1", baseId: "machine", assetId: "machine" }
    },
    bracketSize: 2,
    machineCount: 1,
    rounds: [[{
      id: "M1",
      number: 1,
      roundIndex: 0,
      matchIndex: 0,
      roundLabel: "FINALE",
      playerA: "p1",
      playerB: "machine-1",
      sourceA: null,
      sourceB: null,
      winner: null,
      winnerId: null,
      status: "current",
      scoreA: null,
      scoreB: null,
      score: null,
      simulated: false,
      summaryData: null,
      automatic: false,
      automaticReason: ""
    }]]
  });
  game.currentMatchConfig = {
    tournamentMatch: game.tournament.matches[0],
    leftPlayerId: "p1",
    rightPlayerId: "machine-1"
  };
  game.left = { score: 1 };
  game.right = { score: 5 };
  game.scoreToWin = 5;
  assert.equal(game.applyTournamentHumanMachineRule("right"), "left");
  assert.equal(game.left.score, 5);
  assert.equal(game.right.score, 4);
});

test("playable tournament matches prioritize human pairings", () => {
  const ids = Array.from({ length: 5 }, (_, index) => `p${index + 1}`);
  const windowRef = loadGame(ids);
  const bracket = windowRef.BadPongTournament.createTournamentBracket(ids, { seed: 505 });
  const game = createGameWithTournament(windowRef, bracket);
  const next = game.setNextTournamentMatch();
  const a = game.tournamentSlotValue(next, "A");
  const b = game.tournamentSlotValue(next, "B");
  assert.equal(isGeneratedMachine(a.id), false);
  assert.equal(isGeneratedMachine(b.id), false);
  assert.equal(next.status, "current");
});

test("same seed is reproducible and different seeds can shuffle differently", () => {
  const ids = Array.from({ length: 12 }, (_, index) => `p${index + 1}`);
  const windowRef = loadGame(ids);
  const first = windowRef.BadPongTournament.createTournamentBracket(ids, { seed: 777 });
  const second = windowRef.BadPongTournament.createTournamentBracket(ids, { seed: 777 });
  const third = windowRef.BadPongTournament.createTournamentBracket(ids, { seed: 778 });
  assert.deepEqual(first.bracketSlots, second.bracketSlots);
  assert.notDeepEqual(first.bracketSlots, third.bracketSlots);
});

test("missing slots only create real machine filler matches", () => {
  const ids = ["p1", "p2", "p3"];
  const windowRef = loadGame(ids);
  const bracket = windowRef.BadPongTournament.createTournamentBracket(ids, { seed: 42 });
  const game = createGameWithTournament(windowRef, bracket);
  const next = game.setNextTournamentMatch();
  const advanced = game.tournament.matches.filter(match => match.status === "advanced");
  assert.equal(advanced.length, 0);
  assert.ok(next);
  assert.equal(next.status, "current");
});

test("machine versus machine matches are simulated and advance the winner", () => {
  const ids = ["machine-1", "machine-2"];
  const windowRef = loadGame(ids);
  const bracket = windowRef.BadPongTournament.createTournamentBracket(ids, { seed: 99 });
  const game = createGameWithTournament(windowRef, bracket, "machine-1");
  const next = game.setNextTournamentMatch();
  const match = game.tournament.matches[0];
  assert.equal(next, null);
  assert.equal(match.status, "simulated");
  assert.equal(match.simulated, true);
  assert.ok(match.winner);
  assert.equal(Math.max(match.scoreA, match.scoreB), 5);
  assert.ok(match.summaryData);
  assert.equal(game.tournament.result.championId, match.winner);
  assert.deepEqual(game.tournament.completedTournamentMatches, [match.id]);
});

test("human versus machine is playable when it is the human first match", () => {
  const ids = ["p1"];
  const windowRef = loadGame(ids);
  const bracket = windowRef.BadPongTournament.createTournamentBracket(ids, { seed: 11 });
  const game = createGameWithTournament(windowRef, bracket);
  const next = game.setNextTournamentMatch();
  assert.equal(next, game.tournament.matches[0]);
  assert.equal(game.tournament.matches[0].status, "current");
  assert.equal(game.tournament.result, null);
});

test("machine versus human semifinals wait if humans have not played yet", () => {
  const windowRef = loadGame(["p1", "p2"]);
  const makeMatch = (id, roundIndex, matchIndex, slots) => ({
    id,
    number: Number(id.slice(1)),
    roundIndex,
    matchIndex,
    roundLabel: roundIndex === 0 ? "DEMIS" : "FINALE",
    playerA: slots.playerA || null,
    playerB: slots.playerB || null,
    sourceA: slots.sourceA || null,
    sourceB: slots.sourceB || null,
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
  });
  const rounds = [
    [
      makeMatch("M1", 0, 0, { playerA: "machine-1", playerB: "p1" }),
      makeMatch("M2", 0, 1, { playerA: "machine-2", playerB: "p2" })
    ],
    [
      makeMatch("M3", 1, 0, { sourceA: "M1", sourceB: "M2" })
    ]
  ];
  const bracket = {
    seed: 909,
    participants: ["machine-1", "p1", "machine-2", "p2"],
    bracketSlots: ["machine-1", "p1", "machine-2", "p2"],
    playersById: {
      p1: windowRef.BadPongConfig.playerById("p1"),
      p2: windowRef.BadPongConfig.playerById("p2"),
      "machine-1": { id: "machine-1", name: "Machine 1", baseId: "machine", assetId: "machine" },
      "machine-2": { id: "machine-2", name: "Machine 2", baseId: "machine", assetId: "machine" }
    },
    bracketSize: 4,
    machineCount: 2,
    rounds
  };
  const game = createGameWithTournament(windowRef, bracket);
  const next = game.setNextTournamentMatch();
  assert.equal(rounds[0][0].status, "current");
  assert.equal(rounds[0][0].winner, null);
  assert.equal(rounds[0][1].status, "upcoming");
  assert.equal(rounds[0][1].winner, null);
  assert.equal(next.id, "M1");
  assert.equal(next.status, "current");
});

test("machine versus human semifinals auto-resolve after humans have played", () => {
  const windowRef = loadGame(["p1", "p2", "p3", "p4"]);
  const makeMatch = (id, roundIndex, matchIndex, slots, overrides = {}) => Object.assign({
    id,
    number: Number(id.slice(1)),
    roundIndex,
    matchIndex,
    roundLabel: roundIndex === 0 ? "QUARTS" : roundIndex === 1 ? "DEMIS" : "FINALE",
    playerA: slots.playerA || null,
    playerB: slots.playerB || null,
    sourceA: slots.sourceA || null,
    sourceB: slots.sourceB || null,
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
  }, overrides);
  const rounds = [
    [
      makeMatch("M1", 0, 0, { playerA: "p1", playerB: "p3" }, { winner: "p1", winnerId: "p1", status: "completed", scoreA: 5, scoreB: 2, score: { A: 5, B: 2 } }),
      makeMatch("M2", 0, 1, { playerA: "machine-1", playerB: "machine-3" }, { winner: "machine-1", winnerId: "machine-1", status: "simulated", scoreA: 5, scoreB: 3, score: { A: 5, B: 3 }, simulated: true }),
      makeMatch("M3", 0, 2, { playerA: "p2", playerB: "p4" }, { winner: "p2", winnerId: "p2", status: "completed", scoreA: 5, scoreB: 1, score: { A: 5, B: 1 } }),
      makeMatch("M4", 0, 3, { playerA: "machine-2", playerB: "machine-4" }, { winner: "machine-2", winnerId: "machine-2", status: "simulated", scoreA: 5, scoreB: 4, score: { A: 5, B: 4 }, simulated: true })
    ],
    [
      makeMatch("M5", 1, 0, { sourceA: "M1", sourceB: "M2" }),
      makeMatch("M6", 1, 1, { sourceA: "M3", sourceB: "M4" })
    ],
    [
      makeMatch("M7", 2, 0, { sourceA: "M5", sourceB: "M6" })
    ]
  ];
  const playersById = {
    p1: windowRef.BadPongConfig.playerById("p1"),
    p2: windowRef.BadPongConfig.playerById("p2"),
    p3: windowRef.BadPongConfig.playerById("p3"),
    p4: windowRef.BadPongConfig.playerById("p4")
  };
  ["machine-1", "machine-2", "machine-3", "machine-4"].forEach(id => {
    playersById[id] = { id, name: id.replace("-", " "), baseId: "machine", assetId: "machine" };
  });
  const game = createGameWithTournament(windowRef, {
    seed: 909,
    participants: Object.keys(playersById),
    bracketSlots: Object.keys(playersById),
    playersById,
    bracketSize: 8,
    machineCount: 4,
    rounds
  });
  const next = game.setNextTournamentMatch();
  assert.equal(rounds[1][0].status, "advanced");
  assert.equal(rounds[1][0].winner, "p1");
  assert.equal(rounds[1][1].status, "advanced");
  assert.equal(rounds[1][1].winner, "p2");
  assert.equal(next.id, "M7");
  assert.equal(game.tournamentSlotValue(next, "A").id, "p1");
  assert.equal(game.tournamentSlotValue(next, "B").id, "p2");
});

test("previous machine wins over humans are corrected on bracket recalculation", () => {
  const windowRef = loadGame(["p1", "p2"]);
  const rounds = [
    [
      {
        id: "M1",
        number: 1,
        roundIndex: 0,
        matchIndex: 0,
        roundLabel: "DEMIS",
        playerA: "p1",
        playerB: "machine-1",
        sourceA: null,
        sourceB: null,
        winner: "machine-1",
        winnerId: "machine-1",
        status: "completed",
        scoreA: 0,
        scoreB: 5,
        score: { A: 0, B: 5 },
        simulated: false,
        summaryData: null,
        automatic: false,
        automaticReason: ""
      },
      {
        id: "M2",
        number: 2,
        roundIndex: 0,
        matchIndex: 1,
        roundLabel: "DEMIS",
        playerA: "p2",
        playerB: "machine-2",
        sourceA: null,
        sourceB: null,
        winner: "machine-2",
        winnerId: "machine-2",
        status: "completed",
        scoreA: 0,
        scoreB: 5,
        score: { A: 0, B: 5 },
        simulated: false,
        summaryData: null,
        automatic: false,
        automaticReason: ""
      }
    ],
    [
      {
        id: "M3",
        number: 3,
        roundIndex: 1,
        matchIndex: 0,
        roundLabel: "FINALE",
        playerA: null,
        playerB: null,
        sourceA: "M1",
        sourceB: "M2",
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
      }
    ]
  ];
  const bracket = {
    seed: 910,
    participants: ["p1", "machine-1", "p2", "machine-2"],
    bracketSlots: ["p1", "machine-1", "p2", "machine-2"],
    playersById: {
      p1: windowRef.BadPongConfig.playerById("p1"),
      p2: windowRef.BadPongConfig.playerById("p2"),
      "machine-1": { id: "machine-1", name: "Machine 1", baseId: "machine", assetId: "machine" },
      "machine-2": { id: "machine-2", name: "Machine 2", baseId: "machine", assetId: "machine" }
    },
    bracketSize: 4,
    machineCount: 2,
    rounds
  };
  const game = createGameWithTournament(windowRef, bracket);
  const next = game.setNextTournamentMatch();
  assert.equal(rounds[0][0].status, "advanced");
  assert.equal(rounds[0][0].winner, "p1");
  assert.equal(rounds[0][1].status, "advanced");
  assert.equal(rounds[0][1].winner, "p2");
  assert.equal(next.id, "M3");
  assert.equal(game.tournamentSlotValue(next, "A").id, "p1");
  assert.equal(game.tournamentSlotValue(next, "B").id, "p2");
});

test("premature human machine qualification is reopened until the human plays", () => {
  const windowRef = loadGame(["p1", "p2", "p3", "p4", "p5"]);
  const makeMatch = (id, roundIndex, matchIndex, slots, overrides = {}) => Object.assign({
    id,
    number: Number(id.slice(1)),
    roundIndex,
    matchIndex,
    roundLabel: roundIndex === 0 ? "QUARTS" : roundIndex === 1 ? "DEMIS" : "FINALE",
    playerA: slots.playerA || null,
    playerB: slots.playerB || null,
    sourceA: slots.sourceA || null,
    sourceB: slots.sourceB || null,
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
  }, overrides);
  const rounds = [
    [
      makeMatch("M1", 0, 0, { playerA: "p1", playerB: "p2" }, { winner: "p1", winnerId: "p1", status: "completed", scoreA: 5, scoreB: 2, score: { A: 5, B: 2 } }),
      makeMatch("M2", 0, 1, { playerA: "p3", playerB: "p4" }, { winner: "p3", winnerId: "p3", status: "completed", scoreA: 5, scoreB: 1, score: { A: 5, B: 1 } }),
      makeMatch("M3", 0, 2, { playerA: "machine-3", playerB: "machine-2" }, { winner: "machine-2", winnerId: "machine-2", status: "simulated", scoreA: 4, scoreB: 5, score: { A: 4, B: 5 }, simulated: true }),
      makeMatch("M4", 0, 3, { playerA: "p5", playerB: "machine-1" }, { winner: "p5", winnerId: "p5", status: "advanced", scoreA: 5, scoreB: 0, score: { A: 5, B: 0 }, automatic: true, automaticReason: "human-over-machine" })
    ],
    [
      makeMatch("M5", 1, 0, { sourceA: "M1", sourceB: "M2" }, { winner: "p1", winnerId: "p1", status: "completed", scoreA: 5, scoreB: 3, score: { A: 5, B: 3 } }),
      makeMatch("M6", 1, 1, { sourceA: "M3", sourceB: "M4" }, { winner: "p5", winnerId: "p5", status: "advanced", scoreA: 0, scoreB: 5, score: { A: 0, B: 5 }, automatic: true, automaticReason: "human-over-machine" })
    ],
    [
      makeMatch("M7", 2, 0, { sourceA: "M5", sourceB: "M6" })
    ]
  ];
  const playersById = {
    p1: windowRef.BadPongConfig.playerById("p1"),
    p2: windowRef.BadPongConfig.playerById("p2"),
    p3: windowRef.BadPongConfig.playerById("p3"),
    p4: windowRef.BadPongConfig.playerById("p4"),
    p5: windowRef.BadPongConfig.playerById("p5")
  };
  ["machine-1", "machine-2", "machine-3"].forEach(id => {
    playersById[id] = { id, name: id.replace("-", " "), baseId: "machine", assetId: "machine" };
  });
  const game = createGameWithTournament(windowRef, {
    seed: 911,
    participants: Object.keys(playersById),
    bracketSlots: Object.keys(playersById),
    playersById,
    bracketSize: 8,
    machineCount: 3,
    rounds
  });
  game.tournament.completedTournamentMatches = ["M1", "M2", "M3", "M4", "M5", "M6"];
  game.tournament.lastAutomaticMatchId = "M6";
  const next = game.setNextTournamentMatch();
  assert.equal(rounds[0][3].status, "current");
  assert.equal(rounds[0][3].winner, null);
  assert.equal(rounds[1][1].status, "upcoming");
  assert.equal(rounds[1][1].winner, null);
  assert.equal(rounds[2][0].status, "upcoming");
  assert.equal(game.tournament.completedTournamentMatches.includes("M4"), false);
  assert.equal(game.tournament.completedTournamentMatches.includes("M6"), false);
  assert.equal(next.id, "M4");
});

test("top eight transition data is prepared from the actual qualified players", () => {
  const ids = Array.from({ length: 8 }, (_, index) => `p${index + 1}`);
  const windowRef = loadGame(ids);
  const bracket = windowRef.BadPongTournament.createTournamentBracket(ids, { seed: 123 });
  const game = createGameWithTournament(windowRef, bracket);
  const next = game.setNextTournamentMatch();
  const transition = game.pendingTournamentPhaseTransition(next);
  assert.equal(transition.key, "top8");
  assert.equal(transition.participants.length, 8);
  assert.equal(
    JSON.stringify(Array.from(transition.participants.map(player => player.id)).sort()),
    JSON.stringify(ids.slice().sort())
  );
});

test("future matches stay locked until previous winners exist", () => {
  const ids = ["p1", "p2", "p3", "p4"];
  const windowRef = loadGame(ids);
  const bracket = windowRef.BadPongTournament.createTournamentBracket(ids, { seed: 55 });
  const game = createGameWithTournament(windowRef, bracket);
  const next = game.setNextTournamentMatch();
  const final = game.tournament.rounds[1][0];
  assert.ok(next);
  assert.equal(next.roundIndex, 0);
  assert.equal(final.status, "upcoming");
  assert.equal(game.tournamentSlotValue(final, "A").resolved, false);
  assert.equal(game.tournamentSlotValue(final, "B").resolved, false);
  assert.match(game.tournamentMatchLabel(final), /Vainqueur M1 vs Vainqueur M2/);
});

test("tournament interface no longer contains empty-slot labels", () => {
  const screensSource = fs.readFileSync(path.join(root, "js/screens.js"), "utf8");
  const gameSource = fs.readFileSync(path.join(root, "js/game.js"), "utf8");
  const retiredLabel = ["B", "Y", "E"].join("");
  const retiredWord = new RegExp(`\\b${retiredLabel}S?\\b`, "i");
  assert.equal(retiredWord.test(screensSource), false);
  assert.equal(retiredWord.test(gameSource), false);
});

test("exit prompt pauses active play updates", () => {
  const windowRef = loadGame(["p1", "p2"]);
  const game = Object.create(windowRef.Game.prototype);
  game.screen = "play";
  game.tournamentExitPrompt = { resumeCountdown: true };
  game.messageTime = 0;
  game.fullscreenMessageTime = 0;
  game.elapsed = 12;
  game.update(5);
  assert.equal(game.elapsed, 12);
});

test("continuing an interrupted match arms a three second resume countdown", () => {
  const windowRef = loadGame(["p1", "p2"]);
  const game = Object.create(windowRef.Game.prototype);
  game.audio = { play() {} };
  game.tournamentExitPrompt = { resumeCountdown: true };
  game.tournamentExitConfirmIndex = 1;
  game.matchCountdown = 0;
  game.lastCountdownCue = "GO!";
  game.cancelTournamentExit();
  assert.equal(game.tournamentExitPrompt, null);
  assert.equal(game.tournamentExitConfirmIndex, 0);
  assert.equal(game.matchCountdown, 3);
  assert.equal(game.lastCountdownCue, "");
  assert.equal(game.countdownKind, "resume");
  assert.equal(game.countdownLabel(), "3");
});
