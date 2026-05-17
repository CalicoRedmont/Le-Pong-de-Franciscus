(function () {
  "use strict";

  const FALLBACK_PLAYER_FIRST_NAMES = [
    "Francisco",
    "Julien",
    "Sandra",
    "Hubert",
    "Louis",
    "Laure-Anne",
    "Olivier",
    "Pascal",
    "Benjamin"
  ];
  const preventKeys = new Set([
    "ArrowUp",
    "ArrowDown",
    "ArrowLeft",
    "ArrowRight",
    " ",
    "=",
    "Enter",
    "Home"
  ]);
  const ENABLE_ACCESS_GATE = false;
  let booted = false;
  let pendingBootMode = "title";

  setupAccessGate();

  function keyName(event) {
    if (event.code === "Equal" || event.key === "=") return "=";
    if (event.key.length === 1) return event.key.toLowerCase();
    return event.key;
  }

  function setupAccessGate() {
    const gate = document.getElementById("accessGate");
    const form = document.getElementById("accessForm");
    const input = document.getElementById("accessPassword");
    const error = document.getElementById("accessError");

    if (!ENABLE_ACCESS_GATE) {
      document.body.classList.remove("access-locked");
      if (gate) gate.remove();
      setCurrentPlayerName("Francisco");
      bootGame();
      return;
    }

    if (!gate || !form || !input) {
      setCurrentPlayerName("Francisco");
      bootGame();
      return;
    }

    form.addEventListener("submit", event => {
      event.preventDefault();
      const password = input.value;
      const playerName = resolveAccessPlayerName(password);

      if (isWarGamePassword(password)) {
        pendingBootMode = "wargame";
        setCurrentPlayerName(playerName || "Francisco");
      } else if (!playerName) {
        if (error) error.textContent = "Mot de passe incorrect.";
        input.select();
        return;
      } else {
        pendingBootMode = "title";
        setCurrentPlayerName(playerName);
      }

      document.body.classList.remove("access-locked");
      gate.remove();
      bootGame();
    });
  }

  function normalizePassword(value) {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim()
      .toLowerCase();
  }

  function isAllowedPassword(value) {
    return !!resolveAccessPlayerName(value);
  }

  function isWarGamePassword(value) {
    const config = window.BadPongConfig || {};
    return config.ENABLE_WARGAME && normalizePassword(value) === "wargame";
  }

  function getAllowedPasswords() {
    const passwords = new Set(FALLBACK_PLAYER_FIRST_NAMES.map(normalizePassword));
    const players = (window.BadPongConfig && window.BadPongConfig.PLAYERS) || [];

    players.forEach(player => {
      if (!player || player.id === "machine") return;
      const firstName = playerFirstName(player.name);
      if (firstName) passwords.add(normalizePassword(firstName));
    });

    return passwords;
  }

  function resolveAccessPlayerName(value) {
    const password = normalizePassword(value);
    const players = (window.BadPongConfig && window.BadPongConfig.PLAYERS) || [];
    const player = players.find(candidate => {
      if (!candidate || candidate.id === "machine") return false;
      return normalizePassword(playerFirstName(candidate.name)) === password;
    });
    if (player) return playerFirstName(player.name) || player.name;

    return FALLBACK_PLAYER_FIRST_NAMES.find(name => normalizePassword(name) === password) || "";
  }

  function setCurrentPlayerName(name, details = {}) {
    const playerName = String(name || "Francisco").trim() || "Francisco";
    window.BadPongCurrentPlayerName = playerName;
    window.BadPongSession = Object.assign({}, window.BadPongSession, {
      playerName,
      playerId: details.playerId || "",
      pilotDisplayName: details.pilotDisplayName || "",
      pilotCallsign: details.pilotCallsign || ""
    });
  }

  function playerFirstName(name) {
    const cleanName = String(name || "").trim();
    if (!cleanName) return "";
    return cleanName.split(/\s+/)[0].replace(/[.,;:]+$/g, "");
  }

  function bootGame() {
    if (booted) return;
    booted = true;

    window.installScreens(window.Game);
    if (window.installWargame) window.installWargame(window.Game);

    const canvas = document.getElementById("game");
    const game = new window.Game(canvas);
    if (pendingBootMode === "wargame" && game.startWarGameBoot) game.startWarGameBoot();
    let last = performance.now();

    window.addEventListener("keydown", event => {
      const key = keyName(event);
      if (shouldPreventDefault(key)) event.preventDefault();
      game.keys.add(key);
      game.audio.init();
      if (key !== "f") game.requestStartupFullscreen();
      if (!event.repeat) game.handleKeyDown(key);
    }, { passive: false });

    window.addEventListener("keyup", event => {
      const key = keyName(event);
      if (shouldPreventDefault(key)) event.preventDefault();
      game.keys.delete(key);
    }, { passive: false });

    window.addEventListener("blur", () => game.keys.clear());

    canvas.addEventListener("click", () => canvas.focus());
    canvas.addEventListener("pointerdown", event => {
      canvas.focus();
      game.requestStartupFullscreen();
      const point = logicalPoint(event);
      if (game.handlePointerDown(point.x, point.y)) {
        game.touchActive = false;
        return;
      }
      game.touchActive = true;
      updateTouch(event);
    });
    canvas.addEventListener("pointermove", event => {
      if (game.touchActive) updateTouch(event);
    });
    canvas.addEventListener("pointerup", () => { game.touchActive = false; });
    canvas.addEventListener("pointercancel", () => { game.touchActive = false; });

    function updateTouch(event) {
      game.touchY = logicalPoint(event).y;
    }

    function logicalPoint(event) {
      const rect = canvas.getBoundingClientRect();
      return {
        x: ((event.clientX - rect.left) / rect.width) * game.width,
        y: ((event.clientY - rect.top) / rect.height) * game.height
      };
    }

    function shouldPreventDefault(key) {
      const controls = game.controls || {};
      return preventKeys.has(key)
        || key === controls.p1Up
        || key === controls.p1Down
        || key === controls.p2Up
        || key === controls.p2Down;
    }

    canvas.focus();
    game.requestStartupFullscreen();

    function frame(now) {
      const dt = (now - last) / 1000;
      last = now;
      game.update(dt);
      game.draw();
      requestAnimationFrame(frame);
    }

    requestAnimationFrame(frame);
  }
})();
