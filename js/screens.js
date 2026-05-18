(function () {
  "use strict";

  const CFG = window.BadPongConfig;

  function installScreens(Game) {
    Game.prototype.draw = function () {
      if (this.screen === "title") this.drawTitle();
      else if (this.screen === "how") this.drawHow();
      else if (this.screen === "credits") this.drawCredits();
      else if (this.screen === "commands") this.drawCommands();
      else if (this.screen === "playerSelect") this.drawPlayerSelect();
      else if (this.screen === "opponentSelect") this.drawOpponentSelect();
      else if (this.screen === "setupSelect") this.drawSetupSelect();
      else if (this.screen === "matchIntro") this.drawMatchIntro();
      else if (this.screen === "tournamentOpponents") this.drawTournamentOpponents();
      else if (this.screen === "tournamentSetup") this.drawTournamentSetup();
      else if (this.screen === "tournamentBracket") this.drawTournamentBracket();
      else if (this.screen === "tournamentVictory") this.drawTournamentVictory();
      else if (this.screen === "tournamentIntro") this.drawTournamentIntro();
      else if (this.screen === "tournamentPhaseTransition") this.drawTournamentPhaseTransition();
      else if (this.screen === "tournamentSummary") this.drawTournamentSummary();
      else if (this.screen === "play") this.drawPlay();
      else if (this.screen === "pause") this.drawPause();
      else if (this.screen === "matchEnd") this.drawMatchEnd();
      else if (this.screen === "tournamentEnd") this.drawTournamentEnd();
      else this.drawTitle();
      if (this.tournamentExitPrompt) this.drawTournamentExitPrompt();
    };

    Game.prototype.drawText = function (str, x, y, size, color = this.colors.green, align = "left") {
      if (!str) return;
      const ctx = this.ctx;
      ctx.save();
      ctx.font = `${size}px "Courier New", Courier, monospace`;
      ctx.textAlign = align;
      ctx.textBaseline = "alphabetic";
      ctx.shadowColor = color;
      ctx.shadowBlur = 7;
      ctx.fillStyle = color;
      ctx.fillText(str, x, y);
      ctx.restore();
    };

    Game.prototype.neon = function (str, x, y, size, color = this.colors.green, align = "left") {
      const ctx = this.ctx;
      ctx.save();
      ctx.font = `bold ${size}px "Courier New", Courier, monospace`;
      ctx.textAlign = align;
      ctx.textBaseline = "alphabetic";
      ctx.lineWidth = Math.max(3, size / 9);
      ctx.strokeStyle = "rgba(0,0,0,0.92)";
      ctx.strokeText(str, x, y);
      ctx.shadowColor = color;
      ctx.shadowBlur = 14;
      ctx.fillStyle = color;
      ctx.fillText(str, x, y);
      ctx.fillStyle = "rgba(239,255,242,0.52)";
      ctx.shadowBlur = 2;
      ctx.fillText(str, x + 1, y - 1);
      ctx.restore();
    };

    Game.prototype.panel = function (x, y, w, h, alpha = 0.78) {
      const ctx = this.ctx;
      ctx.save();
      ctx.fillStyle = `rgba(0,0,0,${alpha})`;
      ctx.fillRect(x, y, w, h);
      ctx.strokeStyle = this.colors.greenSoft;
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, w, h);
      ctx.restore();
    };

    Game.prototype.fillBackground = function () {
      const ctx = this.ctx;
      const g = ctx.createRadialGradient(this.width / 2, this.height / 2, 20, this.width / 2, this.height / 2, this.width * 0.75);
      g.addColorStop(0, "#041509");
      g.addColorStop(1, "#010201");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, this.width, this.height);
    };

    Game.prototype.drawFrame = function () {
      const ctx = this.ctx;
      ctx.save();
      ctx.strokeStyle = this.colors.greenSoft;
      ctx.lineWidth = 4;
      ctx.shadowColor = this.colors.green;
      ctx.shadowBlur = 12;
      ctx.strokeRect(18, 18, this.width - 36, this.height - 36);
      ctx.lineWidth = 1;
      ctx.shadowBlur = 4;
      ctx.strokeRect(34, 34, this.width - 68, this.height - 68);
      ctx.restore();
    };

    Game.prototype.drawScanlines = function () {
      const ctx = this.ctx;
      ctx.save();
      ctx.globalAlpha = 0.16;
      ctx.fillStyle = "#000";
      for (let y = 0; y < this.height; y += 4) ctx.fillRect(0, y, this.width, 2);
      ctx.globalAlpha = 0.18 + Math.sin(performance.now() / 120) * 0.03;
      const g = ctx.createRadialGradient(this.width / 2, this.height / 2, 120, this.width / 2, this.height / 2, this.width * 0.7);
      g.addColorStop(0, "rgba(0,0,0,0)");
      g.addColorStop(1, "rgba(0,0,0,0.85)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, this.width, this.height);
      ctx.restore();
      if (this.drawHomeButton) this.drawHomeButton();
    };

    Game.prototype.drawHomeButton = function () {
      if (!this.shouldShowHomeButton || !this.shouldShowHomeButton()) return;
      const rect = this.homeButtonRect();
      const selected = !!this.homeButtonFocused;
      this.drawArcadeButton(rect.x, rect.y, rect.w, rect.h, "ACCUEIL", selected ? this.colors.amber : this.colors.green);
      if (selected) this.drawText("▶", rect.x - 18, rect.y + 18, 14, this.colors.amber);
    };

    Game.prototype.wrapText = function (str, x, y, maxWidth, lineHeight, color = this.colors.green, align = "left") {
      const ctx = this.ctx;
      ctx.save();
      ctx.font = `${Math.max(12, lineHeight - 5)}px "Courier New", Courier, monospace`;
      ctx.textAlign = align;
      ctx.fillStyle = color;
      ctx.shadowColor = color;
      ctx.shadowBlur = 6;
      let yy = y;
      const xx = align === "center" ? x + maxWidth / 2 : x;
      const lines = this.wrapTextLines(str, maxWidth, lineHeight);
      lines.forEach((line) => {
        ctx.fillText(line, xx, yy);
        yy += lineHeight;
      });
      ctx.restore();
    };

    Game.prototype.wrapTextLines = function (str, maxWidth, lineHeight) {
      const ctx = this.ctx;
      const words = String(str).split(" ");
      const lines = [];
      let line = "";
      ctx.save();
      ctx.font = `${Math.max(12, lineHeight - 5)}px "Courier New", Courier, monospace`;
      for (const word of words) {
        const test = line ? `${line} ${word}` : word;
        if (ctx.measureText(test).width > maxWidth && line) {
          lines.push(line);
          line = word;
        } else {
          line = test;
        }
      }
      if (line) lines.push(line);
      ctx.restore();
      return lines;
    };

    Game.prototype.smooth = function (start, end, t) {
      if (t <= start) return 0;
      if (t >= end) return 1;
      const p = (t - start) / (end - start);
      return p * p * (3 - 2 * p);
    };

    Game.prototype.drawPhoto = function (options = {}) {
      const mode = typeof options === "string" ? options : (options.mode || "panel");
      const alpha = typeof options === "number" ? options : (options.alpha ?? 1);
      const ctx = this.ctx;
      const w = this.width;
      const h = this.height;
      this.fillBackground();
      ctx.save();
      ctx.globalAlpha = alpha;
      if (this.photoLoaded) {
        if (mode === "title") {
          const targetH = h * 1.02;
          const targetW = targetH * (this.photo.width / this.photo.height);
          const portraitX = w - targetW - 54;
          const portraitY = 0;
          ctx.drawImage(this.photo, portraitX, portraitY, targetW, targetH);
        } else {
          const coverScale = Math.max(w / this.photo.width, h / this.photo.height);
          const coverW = this.photo.width * coverScale;
          const coverH = this.photo.height * coverScale;
          ctx.drawImage(this.photo, (w - coverW) / 2, (h - coverH) / 2, coverW, coverH);
          ctx.fillStyle = "rgba(0,0,0,0.82)";
          ctx.fillRect(0, 0, w, h);
        }
      } else {
        ctx.fillStyle = "rgba(57,255,104,0.12)";
        ctx.fillRect(560, 64, 300, 408);
        this.drawText("FRANCISCO SIGNAL", 710, 250, 24, this.colors.green, "center");
        this.drawText("PHOTO DE SECOURS", 710, 286, 16, this.colors.white, "center");
      }

      const sideShade = ctx.createLinearGradient(0, 0, w, 0);
      if (mode === "title") {
        sideShade.addColorStop(0, "rgba(0,0,0,0.85)");
        sideShade.addColorStop(0.45, "rgba(0,0,0,0.58)");
        sideShade.addColorStop(1, "rgba(0,0,0,0.18)");
      } else {
        sideShade.addColorStop(0, "rgba(0,0,0,0.80)");
        sideShade.addColorStop(0.5, "rgba(0,0,0,0.68)");
        sideShade.addColorStop(1, "rgba(0,0,0,0.72)");
      }
      ctx.fillStyle = sideShade;
      ctx.fillRect(0, 0, w, h);

      const bottom = ctx.createLinearGradient(0, 250, 0, h);
      bottom.addColorStop(0, "rgba(0,0,0,0)");
      bottom.addColorStop(1, mode === "title" ? "rgba(0,0,0,0.72)" : "rgba(0,0,0,0.92)");
      ctx.fillStyle = bottom;
      ctx.fillRect(0, 0, w, h);
      ctx.restore();
    };

    Game.prototype.drawTitle = function () {
      const t = performance.now() / 1000 - this.titleStartedAt;
      this.drawPhoto({ mode: "title", alpha: Math.min(1, t / 0.8) });
      this.drawFrame();
      this.ctx.save();
      this.ctx.globalAlpha = this.smooth(0.3, 1.2, t);
      this.neon("LE PONG", 54, 90, 64, this.colors.green);
      this.neon("DE FRANCISCUS", 56, 136, 32, this.colors.white);
      this.drawText(CFG.TITLE_TAGLINE, 60, 161, 14, this.colors.green);
      this.ctx.restore();
      this.ctx.save();
      this.ctx.globalAlpha = this.smooth(0.9, 1.9, t);
      this.drawText("PRESS ENTER TO KICK OFF", 60, 188, 15, this.colors.amber);
      this.ctx.restore();
      this.ctx.save();
      this.ctx.globalAlpha = this.smooth(1.4, 2.5, t);
      this.drawMainMenu();
      this.ctx.restore();
      if (this.fullscreenMessageTime > 0) this.drawText("FULL SCREEN NON DISPONIBLE", 480, 516, 13, this.colors.amber, "center");
      this.drawScanlines();
    };

    Game.prototype.drawMainMenu = function () {
      const x = 54;
      const y = 242;
      this.panel(42, 204, 372, 286, 0.68);
      this.drawText("MAIN MENU", x + 18, y - 18, 16, this.colors.white);
      this.menuItems.forEach((item, index) => {
        const selected = index === this.menuIndex;
        const yy = y + index * 31;
        if (selected) {
          this.ctx.fillStyle = "rgba(57,255,104,0.14)";
          this.ctx.fillRect(x + 18, yy - 23, 286, 28);
          if (Math.sin(performance.now() / 115) > -0.25) this.drawText("▶", x - 4, yy, 18, this.colors.amber);
        }
        this.neon(item.label, x + 28, yy, selected ? 20 : 17, selected ? this.colors.amber : this.colors.green);
      });
      this.drawText("↑↓ SELECT   ENTER START   1/2 DIRECT", x + 18, 464, 11, this.colors.white);
      this.drawText(`= SOUND ${this.audio.enabled ? "ON" : "OFF"}   F FULL SCREEN`, x + 18, 482, 11, this.colors.green);
    };

    Game.prototype.drawHow = function () {
      this.drawPhoto({ mode: "panel", alpha: 0.52 });
      this.drawFrame();
      this.panel(78, 58, 804, 424, 0.82);
      this.neon("HOW TO PLAY", 480, 105, 34, this.colors.green, "center");
      const lines = [
        "Le Pong de Franciscus est un Pong football rétro.",
        "Renvoyez le ballon, défendez votre cage et visez le but adverse.",
        "Premier à 5 buts.",
        "Choisissez joueur, adversaire, style de gardien et mode de match.",
        "En tournoi : match à élimination directe, La Machine complète le tableau si besoin.",
        "",
        "FOOT TURBO : mode par défaut, le ballon accélère à chaque échange.",
        "MULTIBALLS : un nouveau ballon toutes les 20 secondes.",
        "CLASSIC : un ballon, règles simples, cages ouvertes.",
        "",
        "STYLES : Libéro souple, Numéro 10 précis, Attaquant nerveux.",
        "ATTAQUANT : la vitesse du match augmente de 30% toutes les 30 secondes.",
        "Fatal Booster : appuie haut + bas en même temps pour une frappe indécente.",
        `Contrôles par défaut : J1 ${this.keyLabel(this.controls.p1Up)} / ${this.keyLabel(this.controls.p1Down)}   J2 ${this.keyLabel(this.controls.p2Up)} / ${this.keyLabel(this.controls.p2Down)}`
      ];
      lines.forEach((line, index) => {
        const color = index >= 6 && index <= 8 ? this.colors.amber : this.colors.white;
        this.drawText(line, 120, 138 + index * 20, line ? 14 : 1, color);
      });
      this.drawText("Espace pause   haut+bas Fatal Booster   R replay   = son   F plein écran   Échap menu", 480, 434, 13, this.colors.green, "center");
      this.drawText("Entrée ou Échap : retour", 480, 462, 13, this.colors.amber, "center");
      this.drawScanlines();
    };

    Game.prototype.drawCredits = function () {
      this.drawPhoto({ mode: "panel", alpha: 0.52 });
      this.drawFrame();
      this.panel(92, 54, 776, 438, 0.84);
      this.neon("LE PONG DE FRANCISCUS", 480, 96, 34, this.colors.green, "center");
      this.neon("FOOTBALL RETRO DOS", 480, 130, 22, this.colors.white, "center");
      this.drawText(CFG.TITLE_TAGLINE, 480, 156, 14, this.colors.green, "center");
      this.wrapText(this.creditIntroText, 170, 208, 620, 24, this.colors.white, "center");
      const names = CFG.PLAYERS.map(player => player.name).join(", ");
      this.wrapText(`Avec : ${names}.`, 150, 292, 660, 24, this.colors.green, "center");
      this.drawText(CFG.CREDIT_CREATION_TEXT, 480, 402, 15, this.colors.white, "center");
      this.drawText("Entrée ou Échap : retour", 480, 468, 13, this.colors.green, "center");
      this.drawScanlines();
    };

    Game.prototype.drawCommands = function () {
      this.drawPhoto({ mode: "panel", alpha: 0.5 });
      this.drawFrame();
      this.panel(140, 64, 680, 416, 0.84);
      this.neon("COMMANDES", 480, 110, 32, this.colors.green, "center");
      const rows = [
        ["Joueur 1 haut", "p1Up"],
        ["Joueur 1 bas", "p1Down"],
        ["Joueur 2 haut", "p2Up"],
        ["Joueur 2 bas", "p2Down"],
        ["RESET DEFAULTS", "reset"]
      ];
      rows.forEach((row, index) => {
        const selected = index === this.commandsCursor;
        const y = 170 + index * 48;
        if (selected) {
          this.ctx.fillStyle = "rgba(57,255,104,0.13)";
          this.ctx.fillRect(218, y - 28, 524, 36);
          this.drawText("▶", 190, y, 18, this.colors.amber);
        }
        this.drawText(row[0], 236, y, 18, selected ? this.colors.amber : this.colors.white);
        if (row[1] !== "reset") this.drawText(this.keyLabel(this.controls[row[1]]), 712, y, 18, this.colors.green, "right");
      });
      if (this.waitingControl) {
        this.drawText("APPUYEZ SUR UNE TOUCHE - ÉCHAP ANNULE", 480, 448, 15, this.colors.amber, "center");
      } else if (this.hasControlConflict()) {
        this.drawText("CONFLIT : deux actions utilisent la même touche.", 480, 448, 14, this.colors.red, "center");
      } else {
        this.drawText("Entrée modifier   Échap menu", 480, 448, 14, this.colors.green, "center");
      }
      this.drawScanlines();
    };

    Game.prototype.drawPlayerSelect = function () {
      this.fillBackground();
      this.drawFrame();
      const title = this.flow === "duel-p2" ? "JOUEUR 2" : this.flow === "duel-p1" ? "JOUEUR 1" : this.flow === "tournament-player" ? "TOURNAMENT PLAYER" : "1 PLAYER";
      this.neon(title, 54, 70, 28, this.colors.green);
      const entries = this.playerSelectEntries();
      const duel = this.flow === "duel-p1" || this.flow === "duel-p2";
      const help = duel
        ? "Choisis un joueur humain. La Machine est réservée au solo."
        : this.flow === "solo"
          ? "Choisis ton joueur. La Machine sera forcément à droite."
          : "Choisis un joueur. Entrée valide. Échap menu.";
      this.drawText(help, 54, 98, 14, this.colors.white);
      const grid = { x: 54, y: 120, cols: 4, tileW: 132, tileH: 70, gapY: 10 };
      const rows = Math.max(1, Math.ceil(entries.length / grid.cols));
      const gridH = rows * grid.tileH + (rows - 1) * grid.gapY;
      const side = { x: 620, y: grid.y, w: 278 };
      this.drawPlayerGrid(entries, this.playerCursor, grid.x, grid.y, grid.cols, grid.tileW, grid.tileH);
      const picked = entries[this.playerCursor] || entries[0];
      this.drawSelectedCard(picked, side.x, side.y, side.w, gridH);
      this.drawScanlines();
      this.drawPlayerGridNames(entries, this.playerCursor, grid.x, grid.y, grid.cols, grid.tileW, grid.tileH);
    };

    Game.prototype.drawOpponentSelect = function () {
      this.fillBackground();
      this.drawFrame();
      this.neon("ADVERSAIRE", 54, 70, 28, this.colors.green);
      this.drawText("Choisis un adversaire local. La Machine ne contacte aucune API.", 54, 98, 14, this.colors.white);
      const entries = CFG.PLAYERS.concat([{ id: "random", name: "RANDOM", initials: "?", difficulty: "???", line: "TIRAGE AU SORT", files: [] }]);
      this.drawPlayerGrid(entries, this.opponentCursor, 54, 120, 4, 132, 70, this.selected.humanId);
      const selected = entries[this.opponentCursor];
      if (this.randomRoulette.active) {
        const choices = this.randomOpponentChoices();
        this.drawSelectedCard(choices[this.randomRoulette.cursor] || selected, 620, 122, 278, 330, "ROULETTE");
      } else {
        this.drawSelectedCard(selected, 620, 122, 278, 330);
      }
      this.drawScanlines();
      this.drawPlayerGridNames(entries, this.opponentCursor, 54, 120, 4, 132, 70, this.selected.humanId);
    };

    Game.prototype.drawSetupSelect = function () {
      this.fillBackground();
      this.drawFrame();
      const duel = this.flow === "duel-setup";
      this.neon(duel ? "MATCH 2 PLAYERS" : "MATCH 1 PLAYER", 480, 88, 34, this.colors.green, "center");
      this.panel(145, 128, 670, 292, 0.82);
      const rows = [
        ["MODE", CFG.matchModeById(this.selected.matchMode).label, CFG.matchModeById(this.selected.matchMode).description],
        ["STYLE J1", CFG.paddleTypeById(this.selected.p1Paddle).label, CFG.paddleTypeById(this.selected.p1Paddle).description]
      ];
      if (duel) rows.push(["STYLE J2", CFG.paddleTypeById(this.selected.p2Paddle).label, CFG.paddleTypeById(this.selected.p2Paddle).description]);
      else {
        const ai = CFG.aiDifficultyById(this.selected.aiDifficulty);
        rows.push(["NIVEAU IA", ai.label, ai.description]);
      }
      rows.forEach((row, index) => this.drawOptionRow(row, index, 184 + index * 72, index === this.setupCursor));
      const startSelected = this.setupCursor === rows.length;
      this.drawText("← → changer   ↑ ↓ ligne   Entrée lancer", 480, 384, 14, this.colors.amber, "center");
      this.drawArcadeButton(390, 398, 180, 34, "START", startSelected ? this.colors.amber : this.colors.green);
      if (startSelected) this.drawText("▶", 366, 420, 18, this.colors.amber);
      const left = duel ? CFG.playerById(this.selected.p1Id) : CFG.playerById(this.selected.humanId);
      const right = duel ? CFG.playerById(this.selected.p2Id) : CFG.playerById(this.selected.opponentId);
      this.drawText(`${left.name}  VS  ${right.name}`, 480, 456, 18, this.colors.white, "center");
      this.drawScanlines();
    };

    Game.prototype.drawMatchIntro = function () {
      const config = this.pendingMatchConfig;
      if (!config) return this.drawSetupSelect();
      const left = this.resolvePlayerForMatch(config.leftPlayerId);
      const right = this.resolvePlayerForMatch(config.rightPlayerId);
      const mode = CFG.matchModeById(config.modeId || "speed");
      const leftStyle = CFG.paddleTypeById(config.leftPaddleType || "round");
      const rightStyle = CFG.paddleTypeById(config.rightPaddleType || "round");
      const solo = config.kind === "solo";

      this.fillBackground();
      this.drawFrame();
      this.neon(solo ? "1 PLAYER" : "2 PLAYERS", 480, 62, 26, this.colors.green, "center");
      this.drawText("FACE À FACE", 480, 98, 20, this.colors.amber, "center");

      const portraitY = 126;
      const portraitSize = 248;
      this.drawMatchIntroPlayer(left, 82, portraitY, portraitSize, "JOUEUR 1", this.colors.green, leftStyle.label);
      this.drawMatchIntroPlayer(right, 630, portraitY, portraitSize, solo ? "ADVERSAIRE" : "JOUEUR 2", this.colors.red, rightStyle.label);

      this.neon("VS", 480, 256, 54, this.colors.white, "center");
      this.drawText(mode.label, 480, 338, 18, this.colors.green, "center");
      this.drawText(mode.description, 480, 366, 13, this.colors.white, "center");
      this.drawText(`${left.name}  /  ${right.name}`, 480, 404, 18, this.colors.amber, "center");
      const launchFocused = !this.homeButtonFocused && this.matchIntroFocus !== "home";
      this.drawArcadeButton(340, 456, 280, 38, "LANCER LE MATCH", launchFocused ? this.colors.amber : this.colors.green);
      if (launchFocused) this.drawText("▶", 316, 480, 18, this.colors.amber);
      this.drawText("←↑→↓ choisir   Entrée/Espace valider   Échap réglages", 480, 516, 13, this.colors.green, "center");
      this.drawScanlines();
    };

    Game.prototype.drawMatchIntroPlayer = function (player, x, y, size, role, color, styleLabel) {
      const labelY = y + size + 32;
      this.drawPortrait(player, x, y, size, size, true);
      this.drawText(role, x + size / 2, y - 18, 13, color, "center");
      this.neon(player.name, x + size / 2, labelY, 22, color, "center");
      this.drawText(styleLabel, x + size / 2, labelY + 30, 13, this.colors.white, "center");
    };

    Game.prototype.drawTournamentOpponents = function () {
      this.fillBackground();
      this.drawFrame();
      this.neon("FRANCISCUS CUP", 54, 70, 28, this.colors.green);
      this.drawText("Entrée sélectionne. TOUT LE MONDE inscrit tous les joueurs et mélange l'ordre. START crée le tableau.", 54, 98, 12, this.colors.white);
      const players = this.tournamentSelectablePlayers ? this.tournamentSelectablePlayers() : CFG.PLAYERS.filter(player => player.id !== "machine");
      const tournamentCount = this.selected.tournamentOpponents.length + 1;
      const entries = players.concat([
        { id: "all-random", name: "TOUT LE MONDE", initials: "ALL", difficulty: "MIX", line: "Sélectionne tout le monde et mélange l'ordre d'inscription.", files: [] },
        { id: "start", name: "START", initials: "GO", difficulty: `${tournamentCount} JOUEUR${tournamentCount > 1 ? "S" : ""}`, line: "Lancer la configuration", files: [] }
      ]);
      this.drawPlayerGrid(entries, this.tournamentCursor, 54, 120, 4, 132, 70, this.selected.humanId, this.selected.tournamentOpponents);
      const picked = entries[this.tournamentCursor];
      this.drawSelectedCard(picked, 620, 122, 278, 330);
      this.drawText(`Inscrits : ${[this.selected.humanId].concat(this.selected.tournamentOpponents).map(id => CFG.playerById(id).name).join(", ")}`, 480, 492, 13, this.colors.amber, "center");
      this.drawScanlines();
      this.drawPlayerGridNames(entries, this.tournamentCursor, 54, 120, 4, 132, 70, this.selected.humanId);
    };

    Game.prototype.drawTournamentSetup = function () {
      this.fillBackground();
      this.drawFrame();
      this.neon("TOURNAMENT SETUP", 480, 94, 34, this.colors.green, "center");
      this.panel(150, 128, 660, 292, 0.84);
      const rows = [
        ["MODE TOURNOI", CFG.matchModeById(this.selected.tournamentMode).label, CFG.matchModeById(this.selected.tournamentMode).description],
        ["STYLE", CFG.paddleTypeById(this.selected.tournamentPaddle).label, CFG.paddleTypeById(this.selected.tournamentPaddle).description],
        ["MACHINES", "AUTO", "Ajoutées pour compléter le tableau, matchs Machine simulés."]
      ];
      rows.forEach((row, index) => this.drawOptionRow(row, index, 178 + index * 74, index === this.setupCursor));
      this.drawText("Élimination directe. Tableau mélangé, seed stable, puissance de 2 supérieure.", 480, 432, 13, this.colors.white, "center");
      this.drawText("← → changer   Entrée créer le tableau", 480, 460, 15, this.colors.amber, "center");
      this.drawScanlines();
    };

    Game.prototype.drawTournamentIntro = function () {
      this.fillBackground();
      this.drawFrame();
      const item = this.getCurrentTournamentMatch && this.getCurrentTournamentMatch();
      if (!item) return this.drawTournamentBracket();
      const playerA = this.tournamentSlotValue(item, "A");
      const playerB = this.tournamentSlotValue(item, "B");
      const mode = CFG.matchModeById(this.tournament.modeId);
      this.neon("NEXT MATCH", 480, 94, 34, this.colors.green, "center");
      this.panel(145, 130, 670, 292, 0.84);
      this.drawText(`${item.id}  ROUND ${item.roundIndex + 1}/${this.tournament.rounds.length}`, 480, 174, 20, this.colors.amber, "center");
      this.drawText(`${playerA.label} VS ${playerB.label}`, 480, 218, 28, this.colors.white, "center");
      this.drawText("Joueur gauche : touches J1. Joueur droite : touches J2. Machine : IA.", 480, 260, 15, this.colors.green, "center");
      this.drawText(`Mode : ${mode.label}   Style : ${CFG.paddleTypeById(this.tournament.paddleType).label}`, 480, 296, 15, this.colors.white, "center");
      this.drawText("Niveau Machine : NORMAL", 480, 320, 14, this.colors.green, "center");
      this.drawText("Premier à 5 points.", 480, 350, 15, this.colors.amber, "center");
      this.drawText("Entrée : lancer le match   Échap/Home : accueil", 480, 386, 15, this.colors.green, "center");
      this.drawScanlines();
    };

    Game.prototype.drawTournamentBracket = function () {
      this.fillBackground();
      this.drawFrame();
      this.neon("LE PONG DE FRANCISCUS", 480, 50, 26, this.colors.green, "center");
      this.neon("FRANCISCUS CUP", 480, 78, 17, this.colors.white, "center");
      this.drawText(CFG.TITLE_TAGLINE, 480, 99, 12, this.colors.green, "center");
      this.neon("TABLEAU DU TOURNOI", 480, 134, 25, this.colors.green, "center");

      if (!this.tournament) {
        this.drawText("Aucun tournoi chargé. Même le tableau refuse le néant.", 480, 270, 16, this.colors.amber, "center");
        this.drawScanlines();
        return;
      }

      this.drawBracketGrid(42, 166, 620, 270);
      this.drawTournamentSidePanel(684, 166, 230, 270);
      const humans = this.tournament.humanParticipants ? this.tournament.humanParticipants.length : Math.max(0, (this.tournament.participants || []).length - (this.tournament.machineCount || 0));
      const machines = this.tournament.machineCount || 0;
      const total = this.tournament.participants ? this.tournament.participants.length : humans + machines;
      this.drawText(`SEED ${this.tournament.seed}   JOUEURS ${humans}   MACHINES ${machines}   PARTICIPANTS ${total}`, 42, 448, 10, this.colors.green);

      const fromPause = this.tournamentBracketContext === "pause";
      if (fromPause) {
        this.drawText("Consultation en pause : le match reste exactement en place.", 480, 462, 12, this.colors.white, "center");
        this.drawArcadeButton(330, 474, 300, 34, "REPRENDRE LA PARTIE", this.colors.amber);
        this.drawText("Entrée/Espace : reprendre   Échap : pause", 480, 524, 12, this.colors.green, "center");
      } else if (this.tournament.result && this.tournament.result.championId) {
        this.drawText(`CHAMPION : ${this.tournament.result.championName}`, 480, 462, 18, this.colors.amber, "center");
        this.drawArcadeButton(320, 474, 320, 34, "RETOUR AU MENU", this.colors.green);
        this.drawText("Entrée ou Échap : menu", 480, 524, 12, this.colors.green, "center");
      } else {
        const next = this.getCurrentTournamentMatch && this.getCurrentTournamentMatch();
        this.drawText(next ? `PROCHAIN MATCH : ${this.tournamentMatchLabel(next)}` : "Calcul du prochain match...", 480, 462, 12, this.colors.white, "center");
        this.drawArcadeButton(320, 474, 320, 34, "LANCER LE PROCHAIN MATCH", this.colors.amber);
        const summaryId = this.tournamentSummaryMatchId || this.tournament.lastSimulatedMatchId;
        const summaryMatch = summaryId && this.findTournamentMatch ? this.findTournamentMatch(summaryId) : null;
        const summaryHint = summaryMatch && summaryMatch.status === "simulated" ? "   V : résumé simulé" : "";
        this.drawText(`Entrée : lancer${summaryHint}   Échap/Home : accueil`, 480, 524, 12, this.colors.green, "center");
      }
      this.drawScanlines();
    };

    Game.prototype.drawBracketGrid = function (x, y, w, h) {
      const rounds = this.tournament.rounds;
      const colW = w / rounds.length;
      const positions = {};
      rounds.forEach((round, roundIndex) => {
        const boxW = Math.min(142, Math.max(86, colW - 16));
        const slotH = h / round.length;
        const boxH = Math.min(42, Math.max(24, slotH * 0.72));
        const xx = x + roundIndex * colW + Math.max(0, (colW - boxW) / 2);
        this.drawText(round.label || (round[0] && round[0].roundLabel) || roundLabel(roundIndex, rounds.length), xx + boxW / 2, y - 10, 10, this.colors.green, "center");
        round.forEach((match, matchIndex) => {
          const yy = y + matchIndex * slotH + slotH / 2 - boxH / 2;
          positions[match.id] = { x: xx, y: yy, w: boxW, h: boxH, cy: yy + boxH / 2 };
        });
      });

      const ctx = this.ctx;
      ctx.save();
      ctx.strokeStyle = "rgba(57,255,104,0.42)";
      ctx.lineWidth = 1;
      rounds.slice(0, -1).forEach(round => {
        round.forEach(match => {
          const pos = positions[match.id];
          const next = positions[match.nextMatchId];
          if (!pos || !next) return;
          const midX = (pos.x + pos.w + next.x) / 2;
          ctx.beginPath();
          ctx.moveTo(pos.x + pos.w, pos.cy);
          ctx.lineTo(midX, pos.cy);
          ctx.lineTo(midX, next.cy);
          ctx.lineTo(next.x, next.cy);
          ctx.stroke();
        });
      });
      ctx.restore();

      rounds.forEach(round => {
        round.forEach(match => this.drawTournamentMatchBox(match, positions[match.id]));
      });
    };

    Game.prototype.drawTournamentMatchBox = function (match, pos) {
      if (!pos) return;
      const a = this.tournamentSlotValue(match, "A");
      const b = this.tournamentSlotValue(match, "B");
      const current = this.tournament.currentMatchId === match.id && match.status === "current";
      const completed = this.isTournamentMatchResolved ? this.isTournamentMatchResolved(match) : match.status === "completed";
      const scored = this.isTournamentMatchScored ? this.isTournamentMatchScored(match) : match.status === "completed";
      const simulated = match.status === "simulated";
      const advanced = match.status === "advanced";
      const ctx = this.ctx;
      const border = current ? this.colors.amber : simulated ? this.colors.blue : advanced ? this.colors.amber : completed ? this.colors.green : this.colors.white;
      const font = pos.h < 30 ? 8 : 10;
      ctx.save();
      ctx.fillStyle = current ? "rgba(255,208,79,0.13)" : simulated ? "rgba(112,168,255,0.12)" : advanced ? "rgba(255,208,79,0.10)" : "rgba(0,0,0,0.86)";
      ctx.fillRect(pos.x, pos.y, pos.w, pos.h);
      ctx.strokeStyle = border;
      ctx.lineWidth = current || completed ? 2 : 1;
      ctx.strokeRect(pos.x, pos.y, pos.w, pos.h);
      this.drawText(match.id, pos.x + 4, pos.y + 10, 8, current ? this.colors.amber : this.colors.green);
      if (scored) this.drawText(`${match.scoreA}-${match.scoreB}`, pos.x + pos.w - 5, pos.y + 10, 9, this.colors.amber, "right");
      if (simulated) this.drawText("SIM", pos.x + pos.w - 29, pos.y + pos.h - 5, 7, this.colors.blue);
      if (advanced) this.drawText("QUALIF", pos.x + pos.w - 43, pos.y + pos.h - 5, 7, this.colors.amber);
      const yA = pos.y + pos.h * 0.46;
      const yB = pos.y + pos.h * 0.82;
      this.drawTournamentSlotLine(a, completed && !!a.id && match.winner === a.id, pos.x + 11, yA, pos.w - 18, font);
      this.drawTournamentSlotLine(b, completed && !!b.id && match.winner === b.id, pos.x + 11, yB, pos.w - 18, font);
      if (current && Math.sin(performance.now() / 120) > -0.2) this.drawText("▶", pos.x - 12, pos.y + pos.h / 2 + 4, 12, this.colors.amber);
      ctx.restore();
    };

    Game.prototype.drawTournamentSlotLine = function (slot, winner, x, y, maxChars, size) {
      const color = winner ? this.colors.amber : slot.id ? this.colors.white : this.colors.greenSoft;
      const prefix = winner ? "✓ " : "";
      const text = prefix + compactName(slot.label, Math.max(7, Math.floor(maxChars / 7)));
      this.drawText(text, x, y, size, color);
    };

    Game.prototype.drawTournamentSidePanel = function (x, y, w, h) {
      this.panel(x, y, w, h, 0.78);
      if (this.tournament.result && this.tournament.result.championId) {
        this.drawText("CHAMPION", x + w / 2, y + 34, 15, this.colors.amber, "center");
        this.neon(compactName(this.tournament.result.championName, 15), x + w / 2, y + 82, 22, this.colors.green, "center");
        this.drawText(`${this.tournament.completedTournamentMatches.length} matches joués`, x + w / 2, y + 124, 12, this.colors.white, "center");
        return;
      }

      const current = this.getCurrentTournamentMatch && this.getCurrentTournamentMatch();
      this.drawText(this.tournamentBracketContext === "pause" ? "MATCH EN COURS" : "MATCHES À VENIR", x + w / 2, y + 28, 13, this.colors.amber, "center");
      const upcoming = this.tournament.matches.filter(match => {
        if (match.status !== "current" && match.status !== "upcoming") return false;
        const a = this.tournamentSlotValue(match, "A");
        const b = this.tournamentSlotValue(match, "B");
        return a.resolved && b.resolved && !!a.id && !!b.id;
      }).sort((a, b) => {
        if (this.compareTournamentPlayableMatches) return this.compareTournamentPlayableMatches(a, b);
        return a.matchIndex - b.matchIndex;
      }).slice(0, 8);
      if (!upcoming.length) {
        this.drawText("Calcul en cours...", x + 16, y + 64, 12, this.colors.white);
      } else upcoming.forEach((match, index) => {
        const isCurrent = current && current.id === match.id;
        const yy = y + 62 + index * 24;
        const label = compactName(this.tournamentMatchLabel(match), 28);
        this.drawText(`${isCurrent ? "▶ " : "  "}${label}`, x + 14, yy, 10, isCurrent ? this.colors.amber : this.colors.green);
      });

      const locked = this.tournament.matches.filter(match => {
        if (match.status !== "upcoming") return false;
        const a = this.tournamentSlotValue(match, "A");
        const b = this.tournamentSlotValue(match, "B");
        return !a.resolved || !b.resolved || !a.id || !b.id;
      }).slice(0, 4);
      if (locked.length) {
        const startY = y + 62 + Math.min(upcoming.length, 5) * 24 + 22;
        this.drawText("VERROUILLÉS", x + w / 2, startY, 10, this.colors.cold, "center");
        locked.forEach((match, index) => {
          this.drawText(compactName(this.tournamentMatchLabel(match), 30), x + 14, startY + 22 + index * 20, 9, this.colors.cold);
        });
      }

      const summaryId = this.tournamentSummaryMatchId || this.tournament.lastSimulatedMatchId;
      const summaryMatch = summaryId && this.findTournamentMatch ? this.findTournamentMatch(summaryId) : null;
      if (summaryMatch && summaryMatch.summaryData && summaryMatch.status === "simulated") {
        const playerA = this.tournamentSlotValue(summaryMatch, "A");
        const playerB = this.tournamentSlotValue(summaryMatch, "B");
        this.drawText("MATCH SIMULÉ", x + w / 2, y + h - 58, 11, this.colors.blue, "center");
        this.drawText(`${compactName(playerA.label, 9)} ${summaryMatch.scoreA}-${summaryMatch.scoreB} ${compactName(playerB.label, 9)}`, x + w / 2, y + h - 40, 10, this.colors.amber, "center");
        this.drawArcadeButton(708, 404, 182, 24, "VOIR LE RÉSUMÉ", this.colors.blue);
      } else {
        const automaticId = this.tournament.lastAutomaticMatchId;
        const automaticMatch = automaticId && this.findTournamentMatch ? this.findTournamentMatch(automaticId) : null;
        if (automaticMatch && automaticMatch.status === "advanced") {
          const winner = this.tournamentPlayerById(automaticMatch.winner);
          this.drawText("QUALIF HUMAIN", x + w / 2, y + h - 50, 11, this.colors.amber, "center");
          this.drawText(`${compactName(winner.name, 18)} avance`, x + w / 2, y + h - 30, 10, this.colors.white, "center");
        }
      }
    };

    Game.prototype.drawTournamentPhaseTransition = function () {
      const phase = this.tournamentPhaseTransition;
      if (!phase) return this.drawTournamentBracket();
      const t = performance.now() / 1000 - (phase.startedAt || performance.now() / 1000);
      this.fillBackground();
      this.drawPhaseBackdrop(t);
      this.drawFrame();
      this.ctx.save();
      this.ctx.globalAlpha = this.smooth(0, 0.45, t);
      this.neon(phase.title, 480, 82, phase.count === 2 ? 58 : 48, this.colors.amber, "center");
      this.neon(phase.subtitle, 480, 122, 22, this.colors.green, "center");
      this.ctx.restore();

      if (phase.count === 2) {
        this.drawFinalistsFaceOff(phase.participants, t);
      } else {
        this.drawQualifiedGrid(phase.participants, phase.count === 8 ? 4 : 2, t);
      }

      this.drawArcadeButton(340, 476, 280, 34, "CONTINUER", this.colors.amber);
      this.drawText("Entrée / Espace / clic : continuer", 480, 528, 12, this.colors.green, "center");
      this.drawScanlines();
    };

    Game.prototype.drawPhaseBackdrop = function (t) {
      const ctx = this.ctx;
      ctx.save();
      ctx.fillStyle = "rgba(0,0,0,0.58)";
      ctx.fillRect(0, 0, this.width, this.height);
      ctx.strokeStyle = "rgba(57,255,104,0.16)";
      ctx.lineWidth = 1;
      const offset = (t * 22) % 32;
      for (let x = -32 + offset; x < this.width + 32; x += 32) {
        ctx.beginPath();
        ctx.moveTo(x, 40);
        ctx.lineTo(x - 160, this.height - 42);
        ctx.stroke();
      }
      ctx.fillStyle = "rgba(255,208,79,0.06)";
      ctx.fillRect(42, 146, 876, 284);
      ctx.restore();
    };

    Game.prototype.drawQualifiedGrid = function (participants, cols, t) {
      const count = participants.length;
      const rows = Math.ceil(count / cols);
      const tileW = cols === 4 ? 184 : 214;
      const tileH = cols === 4 ? 122 : 148;
      const gapX = cols === 4 ? 18 : 34;
      const gapY = 18;
      const totalW = cols * tileW + (cols - 1) * gapX;
      const totalH = rows * tileH + (rows - 1) * gapY;
      const startX = (this.width - totalW) / 2;
      const startY = cols === 4 ? 158 : 168;
      participants.forEach((player, index) => {
        const col = index % cols;
        const row = Math.floor(index / cols);
        const p = this.smooth(0.12 + index * 0.04, 0.62 + index * 0.04, t);
        const x = startX + col * (tileW + gapX);
        const y = startY + row * (tileH + gapY) + (1 - p) * 18;
        this.ctx.save();
        this.ctx.globalAlpha = p;
        this.drawQualifiedCard(player, x, y, tileW, Math.min(tileH, totalH), cols === 4 ? 64 : 82);
        this.ctx.restore();
      });
    };

    Game.prototype.drawQualifiedCard = function (player, x, y, w, h, portraitSize) {
      this.ctx.save();
      this.ctx.fillStyle = "rgba(0,0,0,0.82)";
      this.ctx.fillRect(x, y, w, h);
      this.ctx.strokeStyle = this.isMachinePlayer && this.isMachinePlayer(player, player.id) ? this.colors.blue : this.colors.green;
      this.ctx.lineWidth = 2;
      this.ctx.strokeRect(x, y, w, h);
      this.drawPortrait(player, x + 12, y + 14, portraitSize, portraitSize, true);
      this.drawTileName(player.name, x + portraitSize + 26, y + 42, w - portraitSize - 38, this.colors.white);
      this.drawText(this.participantTypeLabel(player), x + portraitSize + 26, y + 74, 11, this.colors.amber);
      this.ctx.restore();
    };

    Game.prototype.drawFinalistsFaceOff = function (participants, t) {
      const left = participants[0];
      const right = participants[1];
      const p = this.smooth(0.1, 0.7, t);
      this.ctx.save();
      this.ctx.globalAlpha = p;
      if (left) this.drawFinalistCard(left, 126 - (1 - p) * 34, 172, 260, 244, "FINALISTE A");
      if (right) this.drawFinalistCard(right, 574 + (1 - p) * 34, 172, 260, 244, "FINALISTE B");
      this.neon("VS", 480, 310, 54, this.colors.red, "center");
      this.ctx.restore();
    };

    Game.prototype.drawFinalistCard = function (player, x, y, w, h, label) {
      this.ctx.save();
      this.ctx.fillStyle = "rgba(0,0,0,0.86)";
      this.ctx.fillRect(x, y, w, h);
      this.ctx.strokeStyle = this.colors.amber;
      this.ctx.lineWidth = 3;
      this.ctx.strokeRect(x, y, w, h);
      this.drawText(label, x + w / 2, y + 28, 13, this.colors.green, "center");
      this.drawPortrait(player, x + 55, y + 48, 150, 150, true);
      this.neon(compactName(player.name, 15), x + w / 2, y + 220, 24, this.colors.white, "center");
      this.drawText(this.participantTypeLabel(player), x + w / 2, y + 238, 12, this.colors.amber, "center");
      this.ctx.restore();
    };

    Game.prototype.participantTypeLabel = function (player) {
      if (this.isMachinePlayer && this.isMachinePlayer(player, player && player.id)) return "Machine";
      return "Humain";
    };

    Game.prototype.drawTournamentSummary = function () {
      const match = this.findTournamentMatch ? this.findTournamentMatch(this.tournamentSummaryMatchId) : null;
      const summary = match && match.summaryData;
      this.fillBackground();
      this.drawFrame();
      this.neon("RÉSUMÉ DU MATCH", 480, 86, 34, this.colors.blue, "center");
      if (!match || !summary) {
        this.drawText("Aucun résumé disponible.", 480, 260, 18, this.colors.amber, "center");
        this.drawArcadeButton(350, 476, 260, 34, "RETOUR AU TABLEAU", this.colors.green);
        this.drawScanlines();
        return;
      }
      const a = this.tournamentSlotValue(match, "A");
      const b = this.tournamentSlotValue(match, "B");
      const winner = this.tournamentPlayerById(summary.winnerId);
      this.panel(126, 126, 708, 316, 0.84);
      this.drawText(`${match.id} ${match.roundLabel}`, 480, 164, 16, this.colors.green, "center");
      this.neon(`${compactName(a.label, 14)} ${match.scoreA}-${match.scoreB} ${compactName(b.label, 14)}`, 480, 212, 28, this.colors.amber, "center");
      this.drawText(`Vainqueur : ${winner.name}`, 480, 246, 17, this.colors.white, "center");
      const events = summary.events || [];
      events.slice(0, 5).forEach((event, index) => {
        this.drawText(`> ${event}`, 170, 296 + index * 24, 13, index === events.length - 1 ? this.colors.amber : this.colors.green);
      });
      this.drawArcadeButton(350, 476, 260, 34, "RETOUR AU TABLEAU", this.colors.green);
      this.drawText("Entrée / Espace / Échap : retour", 480, 528, 12, this.colors.green, "center");
      this.drawScanlines();
    };

    Game.prototype.drawTournamentExitPrompt = function () {
      const ctx = this.ctx;
      ctx.save();
      ctx.fillStyle = "rgba(0,0,0,0.74)";
      ctx.fillRect(0, 0, this.width, this.height);
      this.panel(210, 166, 540, 230, 0.92);
      this.neon("Quitter le tournoi ?", 480, 218, 28, this.colors.amber, "center");
      const saved = this.tournamentExitPrompt && this.tournamentExitPrompt.saved;
      const text = saved
        ? "Votre progression dans le tournoi en cours sera sauvegardée. Voulez-vous vraiment retourner à l'accueil ?"
        : "La progression actuelle risque d'être perdue. Voulez-vous vraiment quitter ?";
      this.wrapText(text, 265, 256, 430, 22, this.colors.white, "center");
      const buttons = this.tournamentExitButtons ? this.tournamentExitButtons() : [];
      buttons.forEach((button, index) => {
        const selected = index === this.tournamentExitConfirmIndex;
        const color = index === 0 ? this.colors.green : this.colors.red;
        this.drawArcadeButton(button.x, button.y, button.w, button.h, button.label, selected ? this.colors.amber : color);
        if (selected) this.drawText("▶", button.x - 18, button.y + 23, 16, this.colors.amber);
      });
      this.drawText("Échap : continuer le tournoi", 480, 386, 12, this.colors.green, "center");
      ctx.restore();
    };

    Game.prototype.drawTournamentVictory = function () {
      const championId = this.tournamentChampionId || (this.tournament && this.tournament.result && this.tournament.result.championId);
      const champion = this.tournamentPlayerById ? this.tournamentPlayerById(championId) : CFG.playerById(championId);
      const t = performance.now() / 1000 - (this.tournamentVictoryStartedAt || performance.now() / 1000);
      this.fillBackground();
      this.drawVictoryRays(t);
      this.drawVictoryFireworks(t);
      this.drawFrame();

      this.neon("TRIOMPHE HOMOLOGUÉ", 480, 70, 34, this.colors.amber, "center");
      this.neon("CHAMPION DU TOURNOI", 480, 106, 25, this.colors.green, "center");

      this.drawChampionPortrait(champion, 360, 150, 240, 240, t);
      this.drawTrophy(480, 404, 0.86 + Math.sin(t * 4) * 0.02);

      this.neon(champion.name, 480, 444, champion.name.length > 10 ? 30 : 36, this.colors.white, "center");
      this.drawText("EN VERT ET AU SOMMET", 480, 471, 15, this.colors.green, "center");
      this.drawArcadeButton(350, 488, 260, 34, "ENTRÉE : RETOUR", this.colors.amber);
      this.drawText("Échap : menu", 480, 532, 11, this.colors.green, "center");
      this.drawScanlines();
    };

    Game.prototype.drawVictoryRays = function (t) {
      const ctx = this.ctx;
      ctx.save();
      ctx.translate(480, 292);
      for (let i = 0; i < 20; i++) {
        const a = i * Math.PI * 2 / 20 + t * 0.08;
        ctx.rotate(a);
        ctx.fillStyle = i % 2 ? "rgba(255,208,79,0.035)" : "rgba(57,255,104,0.035)";
        ctx.beginPath();
        ctx.moveTo(0, -8);
        ctx.lineTo(620, -18);
        ctx.lineTo(620, 18);
        ctx.closePath();
        ctx.fill();
        ctx.rotate(-a);
      }
      ctx.restore();
    };

    Game.prototype.drawVictoryFireworks = function (t) {
      const bursts = [
        [190, 160, 0.00, this.colors.green],
        [755, 155, 0.22, this.colors.amber],
        [215, 322, 0.46, this.colors.white],
        [742, 326, 0.68, this.colors.green],
        [480, 180, 0.84, this.colors.red]
      ];
      const ctx = this.ctx;
      ctx.save();
      bursts.forEach(([x, y, offset, color], burstIndex) => {
        const phase = (t * 0.52 + offset) % 1;
        const radius = 12 + phase * 76;
        const alpha = Math.max(0, 1 - phase);
        ctx.globalAlpha = alpha * 0.85;
        ctx.fillStyle = color;
        ctx.shadowColor = color;
        ctx.shadowBlur = 12;
        for (let i = 0; i < 18; i++) {
          const angle = i * Math.PI * 2 / 18 + burstIndex * 0.21;
          const px = x + Math.cos(angle) * radius;
          const py = y + Math.sin(angle) * radius;
          const size = phase < 0.16 ? 5 : 3;
          ctx.fillRect(px - size / 2, py - size / 2, size, size);
        }
        if (phase < 0.12) {
          ctx.globalAlpha = 0.7;
          ctx.fillRect(x - 8, y - 8, 16, 16);
        }
      });
      ctx.restore();
    };

    Game.prototype.drawChampionPortrait = function (player, x, y, w, h, t) {
      const ctx = this.ctx;
      const asset = this.playerAssets[player.assetId || player.id];
      const pulse = 1 + Math.sin(t * 3.2) * 0.012;
      ctx.save();
      ctx.translate(x + w / 2, y + h / 2);
      ctx.scale(pulse, pulse);
      ctx.translate(-w / 2, -h / 2);
      ctx.fillStyle = "rgba(0,0,0,0.92)";
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = this.colors.amber;
      ctx.lineWidth = 4;
      ctx.shadowColor = this.colors.amber;
      ctx.shadowBlur = 18;
      ctx.strokeRect(0, 0, w, h);
      ctx.strokeStyle = this.colors.green;
      ctx.lineWidth = 1;
      ctx.strokeRect(10, 10, w - 20, h - 20);
      if (asset && asset.loaded) {
        const img = asset.img;
        const scale = Math.max((w - 22) / img.width, (h - 22) / img.height);
        const iw = img.width * scale;
        const ih = img.height * scale;
        ctx.save();
        ctx.beginPath();
        ctx.rect(11, 11, w - 22, h - 22);
        ctx.clip();
        ctx.drawImage(img, (w - iw) / 2, (h - ih) / 2, iw, ih);
        ctx.restore();
      } else {
        ctx.fillStyle = "rgba(57,255,104,0.10)";
        ctx.fillRect(14, 14, w - 28, h - 28);
        ctx.strokeStyle = this.colors.green;
        ctx.beginPath();
        ctx.arc(w / 2, h / 2 - 22, 42, 0, Math.PI * 2);
        ctx.stroke();
        ctx.strokeRect(w / 2 - 46, h / 2 + 30, 92, 60);
        this.neon(player.initials || "?", w / 2, h / 2 + 4, 42, this.colors.green, "center");
      }
      ctx.restore();
    };

    Game.prototype.drawTrophy = function (cx, cy, scale) {
      const ctx = this.ctx;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(scale, scale);
      ctx.shadowColor = this.colors.amber;
      ctx.shadowBlur = 18;
      ctx.fillStyle = this.colors.amber;
      ctx.strokeStyle = "rgba(1,2,1,0.72)";
      ctx.lineWidth = 2;

      ctx.beginPath();
      ctx.moveTo(-48, -58);
      ctx.lineTo(48, -58);
      ctx.lineTo(34, 12);
      ctx.quadraticCurveTo(0, 32, -34, 12);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.fillRect(-10, 22, 20, 38);
      ctx.fillRect(-42, 60, 84, 18);
      ctx.fillRect(-58, 78, 116, 14);
      ctx.fillStyle = "rgba(1,2,1,0.65)";
      ctx.fillRect(-28, -28, 56, 16);
      this.drawText("FC", 0, 74, 13, this.colors.black, "center");
      ctx.restore();
    };

    Game.prototype.drawOptionRow = function (row, index, y, selected) {
      if (selected) {
        this.ctx.fillStyle = "rgba(57,255,104,0.14)";
        this.ctx.fillRect(190, y - 30, 580, 48);
        this.drawText("▶", 166, y, 18, this.colors.amber);
      }
      this.drawText(row[0], 210, y, 16, selected ? this.colors.amber : this.colors.white);
      this.neon(row[1], 550, y, 21, selected ? this.colors.amber : this.colors.green, "center");
      this.drawText(row[2], 550, y + 24, 12, this.colors.white, "center");
    };

    Game.prototype.drawPlayerGrid = function (entries, cursor, x, y, cols, tileW, tileH, disabledId, selectedIds = []) {
      entries.forEach((entry, index) => {
        const col = index % cols;
        const row = Math.floor(index / cols);
        const xx = x + col * (tileW + 8);
        const yy = y + row * (tileH + 10);
        const selected = index === cursor;
        const disabled = entry.id === disabledId;
        const chosen = selectedIds.includes(entry.id);
        this.drawPlayerTile(entry, xx, yy, tileW, tileH, selected, disabled, chosen);
      });
    };

    Game.prototype.drawPlayerTile = function (player, x, y, w, h, selected, disabled, chosen) {
      if (player.id === "start") return this.drawStartTile(x, y, w, h, selected);
      const ctx = this.ctx;
      ctx.save();
      ctx.globalAlpha = disabled ? 0.42 : 1;
      ctx.fillStyle = selected ? "rgba(255,208,79,0.14)" : "rgba(0,0,0,0.72)";
      ctx.fillRect(x, y, w, h);
      ctx.strokeStyle = chosen ? this.colors.amber : selected ? this.colors.white : this.colors.greenSoft;
      ctx.lineWidth = selected || chosen ? 3 : 1;
      ctx.strokeRect(x, y, w, h);
      if (chosen) this.drawText("✓", x + w - 15, y + 18, 16, this.colors.amber, "center");
      const portraitSize = Math.min(54, h - 16);
      const portraitX = x + 6;
      const textX = portraitX + portraitSize + 8;
      this.drawPortrait(player, portraitX, y + 8, portraitSize, portraitSize, selected);
      this.drawTileName(player.name, textX, y + 38, x + w - textX - 8, selected ? this.colors.amber : "#8bff98");
      ctx.restore();
    };

    Game.prototype.drawPlayerGridNames = function (entries, cursor, x, y, cols, tileW, tileH, disabledId) {
      entries.forEach((entry, index) => {
        if (entry.id === "start") return;
        const col = index % cols;
        const row = Math.floor(index / cols);
        const xx = x + col * (tileW + 8);
        const yy = y + row * (tileH + 10);
        const portraitSize = Math.min(54, tileH - 16);
        const textX = xx + 6 + portraitSize + 8;
        const selected = index === cursor;
        const disabled = entry.id === disabledId;
        this.ctx.save();
        this.ctx.globalAlpha = disabled ? 0.42 : 1;
        this.drawTileName(entry.name, textX, yy + 38, xx + tileW - textX - 8, selected ? this.colors.amber : "#baffb5");
        this.ctx.restore();
      });
    };

    Game.prototype.drawTileName = function (name, x, y, maxWidth, color) {
      const ctx = this.ctx;
      let size = 14;
      let lines = [name];
      x = Math.round(x);
      y = Math.round(y);
      maxWidth = Math.floor(maxWidth);
      ctx.save();
      ctx.font = `bold ${size}px "Courier New", Courier, monospace`;
      if (ctx.measureText(name).width > maxWidth) {
        const splitAt = name.includes(" ") ? " " : name.includes("-") ? "-" : "";
        if (splitAt) {
          const pieces = name.split(splitAt).filter(Boolean);
          if (pieces.length === 2) {
            lines = splitAt === "-" ? [`${pieces[0]}-`, pieces[1]] : pieces;
            size = 12;
            ctx.font = `bold ${size}px "Courier New", Courier, monospace`;
          }
        }
      }
      while (Math.max(...lines.map(line => ctx.measureText(line).width)) > maxWidth && size > 9) {
        size -= 1;
        ctx.font = `bold ${size}px "Courier New", Courier, monospace`;
      }
      const lineHeight = Math.ceil(size + 3);
      const firstY = lines.length > 1 ? y - 6 : y;
      ctx.fillStyle = "rgba(0,0,0,0.88)";
      ctx.fillRect(x - 4, firstY - size - 4, maxWidth + 8, lines.length * lineHeight + 7);
      ctx.textAlign = "left";
      ctx.textBaseline = "alphabetic";
      ctx.lineJoin = "round";
      ctx.lineWidth = 3;
      ctx.strokeStyle = "rgba(0,0,0,1)";
      ctx.shadowBlur = 0;
      ctx.fillStyle = color;
      lines.forEach((line, index) => {
        const yy = firstY + index * lineHeight;
        ctx.strokeText(line, x, yy);
        ctx.fillText(line, x, yy);
        ctx.fillText(line, x, yy);
      });
      ctx.restore();
    };

    Game.prototype.drawStartTile = function (x, y, w, h, selected) {
      const ctx = this.ctx;
      ctx.save();
      ctx.fillStyle = selected ? "rgba(255,208,79,0.14)" : "rgba(0,0,0,0.72)";
      ctx.fillRect(x, y, w, h);
      ctx.strokeStyle = selected ? this.colors.white : this.colors.greenSoft;
      ctx.lineWidth = selected ? 3 : 2;
      ctx.strokeRect(x, y, w, h);
      this.neon("START", x + w / 2, y + h / 2 + 7, selected ? 20 : 17, selected ? this.colors.amber : this.colors.green, "center");
      ctx.restore();
    };

    Game.prototype.drawSelectedCard = function (player, x, y, w, h, label) {
      if (player.id === "start") return this.drawStartCard(x, y, w, h);
      const flavor = CFG.playerFlavorProfile ? CFG.playerFlavorProfile(player) : null;
      const quote = flavor ? flavor.quote : (player.line || "Placeholder prêt pour portrait futur.");
      const compact = h < 280;
      const portraitSize = compact ? 126 : 156;
      const portraitY = compact ? y + 16 : y + 24;
      const nameY = compact ? y + 170 : y + 218;
      const labelSize = label ? (compact ? 20 : 23) : (compact ? 23 : 26);
      const detailY = compact ? y + 194 : y + 246;
      const quoteInset = compact ? 28 : 34;
      const quoteLineH = compact ? 17 : 20;
      const quoteMaxWidth = w - quoteInset * 2;
      const quoteLines = this.wrapTextLines(quote, quoteMaxWidth, quoteLineH);
      const quoteFontSize = Math.max(12, quoteLineH - 5);
      const nameBaseline = label ? detailY : nameY;
      const quoteAreaTop = nameBaseline + (compact ? 18 : 24);
      const quoteAreaBottom = y + h - (compact ? 16 : 22);
      const quoteVisualH = quoteFontSize + Math.max(0, quoteLines.length - 1) * quoteLineH;
      const centeredQuoteY = quoteAreaTop
        + Math.max(0, (quoteAreaBottom - quoteAreaTop - quoteVisualH) / 2)
        + quoteFontSize;
      this.panel(x, y, w, h, 0.78);
      this.drawPortrait(player, x + (w - portraitSize) / 2, portraitY, portraitSize, portraitSize, true);
      this.neon(label || player.name, x + w / 2, nameY, labelSize, this.colors.green, "center");
      if (label) this.drawText(player.name, x + w / 2, detailY, compact ? 15 : 17, this.colors.amber, "center");
      this.wrapText(quote, x + quoteInset, centeredQuoteY, quoteMaxWidth, quoteLineH, this.colors.amber, "center");
    };

    Game.prototype.drawSoloMachineOpponent = function (x, y, w, h) {
      const machine = CFG.playerById("machine");
      if (!machine) return;
      this.panel(x, y, w, h, 0.82);
      this.drawPortrait(machine, x + 10, y + 10, 46, 46, false);
      this.drawText("ADVERSAIRE FIXE", x + 68, y + 20, 11, this.colors.amber);
      this.drawText(machine.name || "La Machine", x + 68, y + 42, 17, this.colors.green);
      this.drawText("IA normale à droite", x + w - 12, y + 58, 10, this.colors.white, "right");
    };

    Game.prototype.drawStartCard = function (x, y, w, h) {
      this.panel(x, y, w, h, 0.78);
      this.drawArcadeButton(x + 58, y + 136, w - 116, 58, "START", this.colors.green);
    };

    Game.prototype.drawPortrait = function (player, x, y, w, h, selected) {
      const ctx = this.ctx;
      const asset = this.playerAssets[player.assetId || player.id];
      ctx.save();
      ctx.fillStyle = "rgba(0,0,0,0.88)";
      ctx.fillRect(x, y, w, h);
      ctx.strokeStyle = selected ? this.colors.amber : this.colors.greenSoft;
      ctx.lineWidth = selected ? 2 : 1;
      ctx.strokeRect(x, y, w, h);
      if (asset && asset.loaded) {
        const img = asset.img;
        const scale = Math.max(w / img.width, h / img.height);
        const iw = img.width * scale;
        const ih = img.height * scale;
        ctx.save();
        ctx.beginPath();
        ctx.rect(x + 2, y + 2, w - 4, h - 4);
        ctx.clip();
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(img, x + (w - iw) / 2, y + (h - ih) / 2, iw, ih);
        ctx.restore();
      } else {
        ctx.fillStyle = "rgba(57,255,104,0.08)";
        ctx.fillRect(x + 5, y + 5, w - 10, h - 10);
        ctx.strokeStyle = this.colors.greenSoft;
        ctx.beginPath();
        ctx.arc(x + w / 2, y + h / 2 - 8, Math.max(10, w * 0.16), 0, Math.PI * 2);
        ctx.stroke();
        ctx.strokeRect(x + w * 0.34, y + h * 0.52, w * 0.32, h * 0.25);
        this.drawText(player.initials || "?", x + w / 2, y + h / 2 + 7, Math.max(14, w * 0.18), this.colors.green, "center");
      }
      ctx.restore();
    };

    Game.prototype.drawPlay = function () {
      this.fillBackground();
      this.drawCourt();
      this.drawHud();
      this.drawPaddle(this.left);
      this.drawPaddle(this.right);
      this.drawShuttles();
      this.drawParticles();
      this.drawMessageBar();
      this.drawMatchButtons();
      this.drawCountdown();
      this.drawGoalFlash();
      this.drawScanlines();
    };

    Game.prototype.drawCountdown = function () {
      if (!this.matchCountdown || this.matchCountdown <= 0) return;
      const value = this.countdownLabel();
      const pulse = 1 + Math.sin(performance.now() / 80) * 0.05;
      this.ctx.save();
      this.ctx.fillStyle = "rgba(0,0,0,0.48)";
      this.ctx.fillRect(0, 0, this.width, this.height);
      this.ctx.translate(this.width / 2, this.height / 2 + 12);
      this.ctx.scale(pulse, pulse);
      const finalCue = value === "GO!" || value === "REPRISE";
      const size = value === "REPRISE" ? 62 : value === "GO!" ? 72 : 96;
      this.neon(value, 0, 0, size, finalCue ? this.colors.amber : this.colors.green, "center");
      this.drawText(this.countdownKind === "resume" ? "REPRISE DU MATCH" : "READY FOR FOOT PONG", 0, 46, 15, this.colors.white, "center");
      this.ctx.restore();
    };

    Game.prototype.drawGoalFlash = function () {
      if (!this.goalFlashTime || this.goalFlashTime <= 0) return;
      const side = this.goalFlashSide || "";
      const color = side === "left" ? this.colors.green : this.colors.red;
      const alpha = Math.max(0, Math.min(1, this.goalFlashTime / 1.1));
      const pulse = 1 + Math.sin(performance.now() / 42) * 0.035;
      this.ctx.save();
      this.ctx.globalAlpha = 0.2 * alpha;
      this.ctx.fillStyle = color;
      this.ctx.fillRect(0, 0, this.width, this.height);
      this.ctx.globalAlpha = alpha;
      this.ctx.translate(this.width / 2, this.height / 2 + 8);
      this.ctx.scale(pulse, pulse);
      this.neon("GOAL", 0, 0, 78, color, "center");
      this.drawText(side ? this.sideName(side) : "", 0, 40, 18, this.colors.white, "center");
      this.ctx.restore();
    };

    Game.prototype.drawCourt = function () {
      const ctx = this.ctx;
      const goal = this.goalBounds ? this.goalBounds() : { top: 180, bottom: 360 };
      const goalDepth = CFG.GOAL_DEPTH || 34;
      this.drawFrame();
      ctx.save();
      ctx.fillStyle = "rgba(57,255,104,0.045)";
      ctx.fillRect(this.bounds.left, this.bounds.top, this.bounds.right - this.bounds.left, this.bounds.bottom - this.bounds.top);
      ctx.strokeStyle = "rgba(57,255,104,0.28)";
      ctx.lineWidth = 2;
      ctx.strokeRect(this.bounds.left, this.bounds.top, this.bounds.right - this.bounds.left, this.bounds.bottom - this.bounds.top);

      ctx.strokeStyle = "rgba(57,255,104,0.24)";
      ctx.lineWidth = 2;
      ctx.setLineDash([10, 12]);
      ctx.beginPath();
      ctx.moveTo(this.width / 2, this.bounds.top);
      ctx.lineTo(this.width / 2, this.bounds.bottom);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.strokeStyle = "rgba(57,255,104,0.32)";
      ctx.beginPath();
      ctx.arc(this.width / 2, (this.bounds.top + this.bounds.bottom) / 2, 62, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = this.colors.green;
      ctx.fillRect(this.width / 2 - 3, (this.bounds.top + this.bounds.bottom) / 2 - 3, 6, 6);

      this.drawPenaltyBox(this.bounds.left, "left");
      this.drawPenaltyBox(this.bounds.right, "right");
      const leftGoalX = Math.max(4, this.bounds.left - goalDepth);
      const rightGoalW = Math.min(goalDepth, this.width - 4 - this.bounds.right);
      this.drawGoalCage(leftGoalX, goal.top, this.bounds.left - leftGoalX, goal.bottom - goal.top, "left");
      this.drawGoalCage(this.bounds.right, goal.top, rightGoalW, goal.bottom - goal.top, "right");

      ctx.strokeStyle = "rgba(57,255,104,0.08)";
      ctx.lineWidth = 1;
      for (let y = this.bounds.top + 24; y < this.bounds.bottom; y += 32) {
        ctx.beginPath();
        ctx.moveTo(this.bounds.left, y);
        ctx.lineTo(this.bounds.right, y);
        ctx.stroke();
      }
      ctx.strokeStyle = "rgba(57,255,104,0.08)";
      for (let x = this.bounds.left; x <= this.bounds.right; x += 48) {
        ctx.beginPath();
        ctx.moveTo(x, this.bounds.top);
        ctx.lineTo(x, this.bounds.bottom);
        ctx.stroke();
      }
      ctx.restore();
    };

    Game.prototype.drawPenaltyBox = function (lineX, side) {
      const ctx = this.ctx;
      const centerY = (this.bounds.top + this.bounds.bottom) / 2;
      const dir = side === "left" ? 1 : -1;
      const boxW = 154;
      const boxH = 232;
      const smallW = 70;
      const smallH = 128;
      const x = side === "left" ? lineX : lineX - boxW;
      const sx = side === "left" ? lineX : lineX - smallW;
      ctx.save();
      ctx.strokeStyle = "rgba(57,255,104,0.22)";
      ctx.lineWidth = 2;
      ctx.strokeRect(x, centerY - boxH / 2, boxW, boxH);
      ctx.strokeRect(sx, centerY - smallH / 2, smallW, smallH);
      ctx.beginPath();
      ctx.arc(lineX + dir * 110, centerY, 4, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([6, 8]);
      ctx.beginPath();
      ctx.arc(lineX + dir * 116, centerY, 40, side === "left" ? -Math.PI / 2 : Math.PI / 2, side === "left" ? Math.PI / 2 : Math.PI * 1.5);
      ctx.stroke();
      ctx.restore();
    };

    Game.prototype.drawGoalCage = function (x, y, w, h, side) {
      const ctx = this.ctx;
      const postColor = side === "left" ? this.colors.green : this.colors.red;
      ctx.save();
      ctx.fillStyle = "rgba(0,0,0,0.78)";
      ctx.fillRect(x, y, w, h);
      ctx.strokeStyle = postColor;
      ctx.lineWidth = 3;
      ctx.shadowColor = postColor;
      ctx.shadowBlur = 10;
      ctx.strokeRect(x, y, w, h);
      ctx.globalAlpha = 0.34;
      ctx.lineWidth = 1;
      ctx.shadowBlur = 0;
      ctx.strokeStyle = postColor;
      for (let yy = y + 12; yy < y + h; yy += 18) {
        ctx.beginPath();
        ctx.moveTo(x, yy);
        ctx.lineTo(x + w, yy);
        ctx.stroke();
      }
      for (let xx = x + 9; xx < x + w; xx += 11) {
        ctx.beginPath();
        ctx.moveTo(xx, y);
        ctx.lineTo(xx, y + h);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      ctx.fillStyle = postColor;
      ctx.fillRect(x - 2, y - 5, w + 4, 5);
      ctx.fillRect(x - 2, y + h, w + 4, 5);
      ctx.restore();
    };

    Game.prototype.drawHud = function () {
      const ctx = this.ctx;
      ctx.save();
      ctx.fillStyle = "rgba(0,0,0,0.92)";
      ctx.fillRect(0, 0, this.width, 78);
      this.drawText(this.leftPlayer.name, 40, 28, 17, this.colors.green);
      this.drawText(this.rightPlayer.name, this.width - 40, 28, 17, this.colors.red, "right");
      this.neon(String(this.left.score), 354, 49, 42, this.colors.green, "center");
      this.neon(String(this.right.score), 606, 49, 42, this.colors.red, "center");
      this.drawText("LE PONG DE FRANCISCUS", 480, 25, 16, this.colors.white, "center");
      this.drawText(`${this.currentMatchMode.label}  ${formatTime(this.elapsed)}`, 480, 55, 12, this.colors.amber, "center");
      this.drawSpeedBoosterMeter(this.left, 40, 50);
      this.drawSpeedBoosterMeter(this.right, this.width - 210, 50);
      ctx.restore();
    };

    Game.prototype.drawSpeedBoosterMeter = function (paddle, x, y) {
      const w = 170;
      const activeShuttle = this.shuttles.find(shuttle => shuttle.speedBoostActive && shuttle.speedBoostOwner === paddle.side);
      const active = !!activeShuttle;
      const armed = this.speedBoosterArmed && this.speedBoosterArmed[paddle.side];
      const p = active || armed ? 1 : Math.max(0, Math.min(1, (paddle.power || 0) / 100));
      const labelKey = this.boostComboLabelForSide(paddle.side);
      this.ctx.fillStyle = "rgba(57,255,104,0.08)";
      this.ctx.fillRect(x, y, w, 9);
      this.ctx.fillStyle = active || armed || p >= 1 ? this.colors.amber : this.colors.greenSoft;
      this.ctx.fillRect(x, y, w * p, 9);
      this.ctx.strokeStyle = this.colors.greenSoft;
      this.ctx.strokeRect(x, y, w, 9);
      const boostLabel = this.speedBoostLabel ? this.speedBoostLabel() : `x${CFG.SPEED_BOOST_MULTIPLIER}`;
      const text = active ? `BOOST ${boostLabel}` : armed ? "BOOST ARMÉ" : `${CFG.FATAL_BOOSTER_LABEL}${p >= 1 && labelKey ? ` PRESS ${labelKey}` : ""}`;
      this.drawText(text, x, y + 23, 9, active || armed || p >= 1 ? this.colors.amber : this.colors.green);
    };

    Game.prototype.drawPaddle = function (paddle) {
      const ctx = this.ctx;
      const side = paddle.side;
      const color = side === "left" ? this.colors.green : this.colors.red;
      ctx.save();
      ctx.shadowColor = color;
      ctx.shadowBlur = 10;
      ctx.fillStyle = "rgba(0,0,0,0.86)";
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      keeperShapePath(ctx, paddle.typeId, paddle.x, paddle.y, paddle.w, paddle.h, side);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = color;
      ctx.globalAlpha = 0.35;
      ctx.fillRect(paddle.x + 4, paddle.y + 8, Math.max(4, paddle.w - 8), Math.max(8, paddle.h - 16));
      ctx.restore();
    };

    Game.prototype.drawShuttles = function () {
      for (const shuttle of this.shuttles) this.drawShuttle(shuttle);
    };

    Game.prototype.drawShuttle = function (shuttle) {
      const ctx = this.ctx;
      const speed = shuttle.speed || Math.hypot(shuttle.vx || 0, shuttle.vy || 0);
      const speedRatio = Math.min(2.2, speed / CFG.BASE_SPEED);
      const boosted = !!shuttle.speedBoostActive;
      const color = boosted || speedRatio > 1.75 ? this.colors.amber : this.colors.green;
      const s = shuttle.r;
      const scale = s / 12;
      const trailSize = Math.max(4, Math.round(6 * scale));
      ctx.save();
      shuttle.trail.forEach((p, index) => {
        ctx.globalAlpha = 0.16 * (1 - index / Math.max(1, shuttle.trail.length));
        ctx.fillStyle = color;
        ctx.fillRect(Math.round(p.x) - trailSize / 2, Math.round(p.y) - trailSize / 2, trailSize, trailSize);
      });
      ctx.globalAlpha = 1;
      ctx.translate(shuttle.x, shuttle.y);
      ctx.rotate((shuttle.x + shuttle.y) * 0.035);
      ctx.shadowColor = color;
      ctx.shadowBlur = 14;

      if (boosted) {
        const flicker = 0.82 + Math.sin(performance.now() / 38) * 0.18;
        ctx.save();
        ctx.shadowColor = this.colors.red;
        ctx.shadowBlur = 18;
        ctx.globalAlpha = flicker;
        ctx.fillStyle = this.colors.red;
        ctx.fillRect(-s * 2.4, -s * 0.35, s * 1.1, s * 0.7);
        ctx.fillStyle = this.colors.amber;
        ctx.fillRect(-s * 1.9, -s * 0.18, s * 0.72, s * 0.36);
        ctx.restore();
      }

      ctx.fillStyle = "rgba(1,2,1,0.96)";
      ctx.strokeStyle = color;
      ctx.lineWidth = 3 * scale;
      ctx.beginPath();
      ctx.arc(0, 0, s, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = color;
      ctx.fillRect(-3 * scale, -3 * scale, 6 * scale, 6 * scale);
      const patches = [
        [-9, -6, 5, 5],
        [5, -8, 5, 5],
        [-8, 5, 5, 5],
        [4, 5, 6, 5]
      ];
      patches.forEach(([x, y, w, h]) => ctx.fillRect(x * scale, y * scale, w * scale, h * scale));

      ctx.strokeStyle = color;
      ctx.lineWidth = 2 * scale;
      ctx.beginPath();
      ctx.moveTo(-3 * scale, -3 * scale);
      ctx.lineTo(-9 * scale, -6 * scale);
      ctx.moveTo(3 * scale, -3 * scale);
      ctx.lineTo(9 * scale, -8 * scale);
      ctx.moveTo(-3 * scale, 3 * scale);
      ctx.lineTo(-8 * scale, 9 * scale);
      ctx.moveTo(3 * scale, 3 * scale);
      ctx.lineTo(10 * scale, 8 * scale);
      ctx.stroke();

      ctx.strokeStyle = "rgba(239,255,242,0.72)";
      ctx.lineWidth = Math.max(1, scale);
      ctx.beginPath();
      ctx.arc(0, 0, s - 4 * scale, -0.2, Math.PI * 1.1);
      ctx.stroke();
      ctx.fillStyle = "rgba(239,255,242,0.75)";
      ctx.fillRect(-s * 0.38, -s * 0.74, 4 * scale, 2 * scale);
      ctx.restore();
    };

    Game.prototype.drawParticles = function () {
      const ctx = this.ctx;
      ctx.save();
      for (const p of this.particles) {
        ctx.globalAlpha = Math.max(0, p.life / 0.55);
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x, p.y, p.size, p.size);
      }
      ctx.restore();
    };

    Game.prototype.drawMessageBar = function () {
      if (this.messageTime <= 0) return;
      this.ctx.save();
      this.ctx.fillStyle = "rgba(0,0,0,0.76)";
      this.ctx.fillRect(70, 510, 610, 24);
      this.drawText(this.messageText, 375, 528, 12, this.colors.amber, "center");
      this.ctx.restore();
    };

    Game.prototype.drawMatchButtons = function () {
      this.drawArcadeButton(694, 511, 64, 22, "ACCUEIL", this.colors.green);
      this.drawArcadeButton(766, 511, 76, 22, "J1 STYLE", this.colors.amber);
      if (this.rightControl === "p2") this.drawArcadeButton(850, 511, 76, 22, "J2 STYLE", this.colors.amber);
      this.drawText(`ESPACE PAUSE   J1 ${this.boostComboLabelForSide("left")} / J2 ${this.boostComboLabelForSide("right")} Fatal Booster   = SON`, 480, 75, 10, this.colors.green, "center");
    };

    Game.prototype.drawArcadeButton = function (x, y, w, h, label, color) {
      this.ctx.save();
      this.ctx.fillStyle = "rgba(0,0,0,0.78)";
      this.ctx.fillRect(x, y, w, h);
      this.ctx.strokeStyle = color;
      this.ctx.lineWidth = 1;
      this.ctx.strokeRect(x, y, w, h);
      this.drawText(label, x + w / 2, y + 15, 10, color, "center");
      this.ctx.restore();
    };

    Game.prototype.drawPause = function () {
      this.drawPlay();
      this.ctx.fillStyle = "rgba(0,0,0,0.74)";
      this.ctx.fillRect(0, 0, this.width, this.height);
      this.neon("PAUSE", 480, 96, 44, this.colors.green, "center");
      this.drawText(CFG.PAUSE_TAGLINE, 480, 132, 15, this.colors.amber, "center");
      this.drawText("FORME DES GARDIENS", 480, 164, 17, this.colors.white, "center");
      const buttons = this.pauseActionButtons ? this.pauseActionButtons() : [];
      buttons.forEach(button => {
        if (button.kind === "keeper-shape") this.drawKeeperShapeOption(button);
        else this.drawArcadeButton(button.x, button.y, button.w, button.h, button.label, button.color);
      });
      const hints = [];
      if (this.sideForRole && this.sideForRole("p1")) hints.push("1 : J1 suivant");
      if (this.sideForRole && this.sideForRole("p2")) hints.push("2 : J2 suivant");
      if (this.currentMatchConfig && this.currentMatchConfig.tournamentMatch) hints.push("T : tableau");
      this.drawText("← → forme   Entrée valider   ↑ accueil / ↓ joueur   Espace reprendre", 480, 488, 13, this.colors.amber, "center");
      this.drawText(hints.join("   "), 480, 516, 12, this.colors.white, "center");
      this.drawScanlines();
    };

    Game.prototype.drawKeeperShapeOption = function (button) {
      const ctx = this.ctx;
      const color = button.selected ? this.colors.amber : button.color;
      if (button.showRoleLabel) this.drawText(button.roleLabel, button.x - 34, button.y + 40, 18, this.colors.white, "center");
      ctx.save();
      ctx.fillStyle = button.selected ? "rgba(255,208,79,0.12)" : "rgba(0,0,0,0.62)";
      ctx.strokeStyle = color;
      ctx.shadowColor = color;
      ctx.shadowBlur = button.selected ? 12 : 6;
      ctx.lineWidth = button.selected ? 2 : 1;
      ctx.fillRect(button.x, button.y, button.w, button.h);
      ctx.strokeRect(button.x, button.y, button.w, button.h);
      if (button.focused) {
        ctx.strokeStyle = this.colors.white;
        ctx.lineWidth = 1;
        ctx.setLineDash([5, 4]);
        ctx.strokeRect(button.x - 4, button.y - 4, button.w + 8, button.h + 8);
      }
      ctx.restore();

      this.drawKeeperShapePreview(button.typeId, button.x + 18, button.y + 9, 30, 46, color, button.side);
      this.drawText(button.label, button.x + button.w - 12, button.y + 25, 10, color, "right");
      this.drawText(button.selected ? "ACTIF" : "CHOISIR", button.x + button.w - 12, button.y + 47, 9, button.selected ? this.colors.white : this.colors.greenSoft, "right");
    };

    Game.prototype.drawKeeperShapePreview = function (typeId, x, y, w, h, color, side = "left") {
      const ctx = this.ctx;
      ctx.save();
      ctx.fillStyle = "rgba(0,0,0,0.86)";
      ctx.strokeStyle = color;
      ctx.shadowColor = color;
      ctx.shadowBlur = 10;
      ctx.lineWidth = 2;
      keeperShapePath(ctx, typeId, x, y, w, h, side);
      ctx.fill();
      ctx.stroke();
      ctx.globalAlpha = 0.3;
      ctx.fillStyle = color;
      keeperShapePath(ctx, typeId, x, y, w, h, side);
      ctx.clip();
      ctx.fillRect(x + 6, y + 8, Math.max(4, w - 12), Math.max(8, h - 16));
      ctx.restore();
    };

    Game.prototype.drawMatchEnd = function () {
      this.fillBackground();
      this.drawFrame();
      this.neon(this.endTitle, 480, 152, 42, this.endWinnerSide === "left" ? this.colors.green : this.colors.red, "center");
      this.drawText(this.endSub, 480, 202, 22, this.colors.amber, "center");
      this.wrapText(this.endMessage, 190, 238, 580, 24, this.colors.white, "center");
      this.wrapText(this.endLoserComment, 170, 306, 620, 22, this.colors.amber, "center");
      if (this.currentMatchConfig && this.currentMatchConfig.tournamentMatch) {
        this.drawText("Entrée : tableau du tournoi   Échap/Home : accueil", 480, 404, 16, this.colors.green, "center");
      } else {
        this.drawText("R ou Entrée : replay   Échap : menu principal", 480, 404, 16, this.colors.green, "center");
      }
      this.drawScanlines();
    };

    Game.prototype.drawTournamentEnd = function () {
      const r = this.tournament.result;
      this.fillBackground();
      this.drawFrame();
      this.neon("TOURNAMENT COMPLETE", 480, 102, 34, r.won ? this.colors.green : this.colors.red, "center");
      this.panel(130, 136, 700, 310, 0.82);
      this.drawText(`Adversaires battus : ${r.beaten}   perdus : ${r.lost}`, 480, 190, 20, this.colors.white, "center");
      this.drawText(`Score cumulé : ${r.totalHuman} - ${r.totalOpponents}`, 480, 230, 24, this.colors.amber, "center");
      const best = r.best ? (this.tournamentPlayerById ? this.tournamentPlayerById(r.best.id).name : CFG.playerById(r.best.id).name) : "-";
      const worst = r.worst ? (this.tournamentPlayerById ? this.tournamentPlayerById(r.worst.id).name : CFG.playerById(r.worst.id).name) : "-";
      this.drawText(`Meilleur duel : ${best}`, 480, 280, 16, this.colors.green, "center");
      this.drawText(`Pire duel : ${worst}`, 480, 312, 16, this.colors.red, "center");
      this.drawText("R ou Entrée : replay tournament   Échap : main menu", 480, 396, 15, this.colors.white, "center");
      this.drawScanlines();
    };
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  function keeperShapePath(ctx, typeId, x, y, w, h, side) {
    if (typeId === "triangle") {
      ctx.beginPath();
      if (side === "left") {
        ctx.moveTo(x, y);
        ctx.lineTo(x, y + h);
        ctx.lineTo(x + w, y + h / 2);
      } else {
        ctx.moveTo(x + w, y);
        ctx.lineTo(x + w, y + h);
        ctx.lineTo(x, y + h / 2);
      }
      ctx.closePath();
      return;
    }

    if (typeId === "weird") {
      ctx.beginPath();
      if (side === "left") {
        ctx.moveTo(x, y);
        ctx.lineTo(x, y + h);
        ctx.ellipse(x, y + h / 2, w, h / 2, 0, Math.PI / 2, -Math.PI / 2, true);
      } else {
        ctx.moveTo(x + w, y);
        ctx.lineTo(x + w, y + h);
        ctx.ellipse(x + w, y + h / 2, w, h / 2, 0, Math.PI / 2, Math.PI * 1.5, false);
      }
      ctx.closePath();
      return;
    }

    roundRect(ctx, x, y, w, h, Math.min(8, w / 2));
  }

  function formatTime(seconds) {
    const total = Math.max(0, Math.floor(seconds));
    const m = Math.floor(total / 60);
    const s = String(total % 60).padStart(2, "0");
    return `${m}:${s}`;
  }

  function roundLabel(index, total) {
    const remaining = total - index;
    if (remaining === 1) return "FINALE";
    if (remaining === 2) return "DEMIS";
    if (remaining === 3) return "QUARTS";
    if (remaining === 4) return "HUITIÈMES";
    return `R${index + 1}`;
  }

  function compactName(value, max = 18) {
    const str = String(value || "");
    if (str.length <= max) return str;
    return `${str.slice(0, Math.max(3, max - 1))}…`;
  }

  window.installScreens = installScreens;
})();
