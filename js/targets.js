(function () {
  "use strict";

  const HOME_PHOTO_FILES = ["Francis-Home.png", "Francisco.jpg"];
  const PLAYER_IMAGE_FILES = [
    "Francisco.jpg",
    "Julien.jpg",
    "Sandra.jpg",
    "Hubert.jpg",
    "Louis.jpg",
    "Olivier.jpg",
    "Benjamin.jpg",
    "Pascal.jpg",
    "Patricia.jpg",
    "Kamar.jpg",
    "Yohan.jpg",
    "Vijay.jpg",
    "Audrey.jpg",
    "Alexis.jpg",
    "Mostapha.jpg",
    "Louis_L.jpg",
    "Stephanie.jpg",
    "Lauriane.jpg",
    "Cecile.jpg",
    "Florence.jpg",
    "La_Machine.jpg"
  ];
  const MACHINE_IMAGE_FILE = "La_Machine.jpg";
  const PLAYER_NAME_OVERRIDES = {
    Cecile: "Cécile",
    Louis: "Louis-G",
    Louis_L: "Louis-L",
    Stephanie: "Stéphanie"
  };

  const PLAYER_LINES = {
    francisco: "Capitaine local. Le ballon lui obéit uniquement quand il y pense.",
    julien: "Pressing haut, lucidité basse, danger permanent.",
    sandra: "Contrôle orienté vers la gloire et les ennuis.",
    hubert: "Défense sobre. Regard de mur porteur.",
    louisg: "Jeune prodige homologué par aucun comité.",
    olivier: "Forfait le dimanche matin.",
    benjamin: "Grand blond avec une chaussure... rien qu'une chaussure.",
    pascal: "Libéro de terminal, relance au phosphore.",
    patricia: "Le ski l'a ralentie une fois. Le ballon n'a pas cette chance.",
    kamar: "Intemporel. Il redémarre les légendes sans perdre le ticket.",
    yohan: "Humeur versatile, ping stable, patience variable.",
    vijay: "Calme apparent, regard de terminal. Le ballon attend son autorisation.",
    audrey: "Elle lit les règles, puis les dribble avec le sourire.",
    alexis: "Calme au départ, précis au tacle administratif.",
    mostapha: "Il fait parler les chiffres, puis le tableau d'affichage.",
    louisl: "Il calcule l'angle impossible, puis le rend obligatoire.",
    stephanie: "Sourire contrôlé, carton vert ou silence immédiat.",
    lauriane: "Elle classe les humeurs et parfois les adversaires.",
    cecile: "Sourire en coin. Le ballon croit partir libre, erreur de procédure.",
    florence: "Un peu sèche. Elle tamponne les ego sans bavure."
  };

  const PLAYER_DIFFICULTIES = {
    francisco: "normal",
    julien: "hard",
    sandra: "hard",
    hubert: "normal",
    louisg: "easy",
    olivier: "normal",
    benjamin: "normal",
    pascal: "normal",
    patricia: "normal",
    kamar: "normal",
    yohan: "hard",
    vijay: "normal",
    audrey: "normal",
    alexis: "normal",
    mostapha: "normal",
    louisl: "hard",
    stephanie: "normal",
    lauriane: "normal",
    cecile: "normal",
    florence: "normal"
  };

  const PLAYERS = PLAYER_IMAGE_FILES
    .filter(file => file !== MACHINE_IMAGE_FILE)
    .map(file => createPlayerFromImage(file))
    .concat([{
      id: "machine",
      name: "La Machine",
      initials: "CPU",
      files: [MACHINE_IMAGE_FILE, "OLD/La_Machine.png"],
      difficulty: "boss",
      line: "IA locale. Sourire inquiétant. Hors-jeu moral permanent."
    }]);

  const PLAYER_FLAVOR_PROFILES = {
    francisco: { shortProfile: "capitaine CRT", profile: "capitaine CRT", quote: PLAYER_LINES.francisco },
    julien: { shortProfile: "pressing nerveux", profile: "pressing nerveux", quote: PLAYER_LINES.julien },
    sandra: { shortProfile: "contrôle sec", profile: "contrôle sec", quote: PLAYER_LINES.sandra },
    hubert: { shortProfile: "mur porteur", profile: "mur porteur", quote: PLAYER_LINES.hubert },
    louisg: { shortProfile: "appel profond", profile: "appel profond", quote: PLAYER_LINES.louisg },
    olivier: { shortProfile: "tacle poli", profile: "tacle poli", quote: PLAYER_LINES.olivier },
    benjamin: { shortProfile: "frappe nette", profile: "frappe nette", quote: PLAYER_LINES.benjamin },
    pascal: { shortProfile: "relance verte", profile: "relance verte", quote: PLAYER_LINES.pascal },
    patricia: { shortProfile: "ski suspect", profile: "ski suspect", quote: PLAYER_LINES.patricia },
    kamar: { shortProfile: "ticket éternel", profile: "ticket éternel", quote: PLAYER_LINES.kamar },
    yohan: { shortProfile: "humeur variable", profile: "humeur variable", quote: PLAYER_LINES.yohan },
    vijay: { shortProfile: "calme terminal", profile: "contrôle silencieux", quote: PLAYER_LINES.vijay },
    audrey: { shortProfile: "règles dribblées", profile: "règles dribblées", quote: PLAYER_LINES.audrey },
    alexis: { shortProfile: "tacle précis", profile: "tacle précis", quote: PLAYER_LINES.alexis },
    mostapha: { shortProfile: "score bavard", profile: "score bavard", quote: PLAYER_LINES.mostapha },
    louisl: { shortProfile: "angle impossible", profile: "angle impossible", quote: PLAYER_LINES.louisl },
    stephanie: { shortProfile: "carton vert", profile: "carton vert", quote: PLAYER_LINES.stephanie },
    lauriane: { shortProfile: "humeurs classées", profile: "humeurs classées", quote: PLAYER_LINES.lauriane },
    cecile: { shortProfile: "procédure surprise", profile: "procédure surprise", quote: PLAYER_LINES.cecile },
    florence: { shortProfile: "ego tamponné", profile: "ego tamponné", quote: PLAYER_LINES.florence }
  };

  const LOSER_COMMENTS = [
    "{prenom}, la victoire était à portée de main. Puis elle a vu ton score.",
    "{prenom}, tu n’as pas perdu. Tu as juste exploré l’autre fin possible.",
    "{prenom}, ta stratégie restera dans les mémoires. Pas pour les bonnes raisons, mais tout de même.",
    "{prenom}, la partie t’a regardé droit dans les yeux avant de choisir quelqu’un d’autre.",
    "{prenom}, tu as combattu avec courage, précision et un résultat regrettable.",
    "{prenom}, le suspense était intense jusqu’au moment où tu as joué.",
    "{prenom}, ton score raconte une histoire. Une histoire courte, mais sincère.",
    "{prenom}, tu as frôlé la victoire. De très loin, mais l’intention est notée.",
    "{prenom}, le jeu ne t’en veut pas. Il t’a juste classé correctement.",
    "{prenom}, ta défaite a une certaine élégance administrative. C’est rare.",
    "{prenom}, tu as perdu avec une constance presque professionnelle.",
    "{prenom}, la victoire a préféré garder ses distances. On respecte son choix.",
    "{prenom}, ton plan était audacieux. Le résultat, lui, était beaucoup plus traditionnel.",
    "{prenom}, cette partie avait besoin d’un perdant. Tu as répondu présent.",
    "{prenom}, personne ne peut t’enlever ça : tu étais là jusqu’à la fin.",
    "{prenom}, la défaite ne te définit pas. Elle insiste juste beaucoup aujourd’hui.",
    "{prenom}, tu as transformé l’espoir en anecdote. C’est une forme d’art.",
    "{prenom}, ton parcours fut bref, fragile et statistiquement cohérent.",
    "{prenom}, tu as donné une chance aux autres de briller. Beaucoup trop généreux.",
    "{prenom}, la victoire n’était pas contre toi. Elle était simplement ailleurs.",
    "{prenom}, le destin t’a envoyé un brouillon. Tu l’as signé.",
    "{prenom}, le tableau des scores n’a pas négocié.",
    "{prenom}, tu as fait ce qu’on appelle une présence.",
    "{prenom}, ton ambition était là. Le résultat, lui, avait pris congé.",
    "{prenom}, tu étais peut-être à une décision de mieux perdre.",
    "{prenom}, même la chance a demandé un peu de recul.",
    "{prenom}, on cherchait le perdant. Tu as levé la main avec efficacité.",
    "{prenom}, ta performance a suivi une ligne claire : descendante.",
    "{prenom}, tu as perdu sans te disperser. C’est presque une qualité.",
    "{prenom}, le jeu t’a donné le rôle ingrat. Tu l’as joué avec un naturel inquiétant.",
    "{prenom}, tu as visé la gloire et touché le mobilier.",
    "{prenom}, tu as eu une idée. Le jeu avait des règles.",
    "{prenom}, ton score a gardé un silence très parlant.",
    "{prenom}, tu as brillé, mais à contre-jour.",
    "{prenom}, la victoire est passée. Tu étais probablement en pause mentale.",
    "{prenom}, ta défaite a été validée par l’ensemble des témoins.",
    "{prenom}, tu n’as pas échoué. Tu as fourni un exemple pédagogique.",
    "{prenom}, les statistiques avaient préparé ça depuis longtemps.",
    "{prenom}, ton courage mérite mieux que ton résultat.",
    "{prenom}, on ne dira pas que c’était mauvais. On dira que c’était informatif.",
    "{prenom}, la partie t’a confié une mission : ne pas gagner.",
    "{prenom}, ton ego vient de recevoir une notification.",
    "{prenom}, tu as perdu avec une sobriété inquiétante.",
    "{prenom}, le hasard t’a vu arriver et a fermé la porte.",
    "{prenom}, on sentait une stratégie. Elle aussi semblait perdue.",
    "{prenom}, tu as respecté le thème de la défaite jusqu’au bout.",
    "{prenom}, la victoire n’a pas fui. Elle s’est organisée.",
    "{prenom}, ton score est modeste, mais il assume.",
    "{prenom}, tu as fait reculer les attentes. C’est une gestion de crise.",
    "{prenom}, ton talent était probablement sur un autre serveur.",
    "{prenom}, tu as failli surprendre tout le monde. Puis non.",
    "{prenom}, la partie a été rude, surtout pour ton classement.",
    "{prenom}, tu as perdu, mais les archives ont apprécié l’effort.",
    "{prenom}, ton dernier coup restera un mystère utile aux chercheurs.",
    "{prenom}, tu as pris des risques. Le résultat aussi.",
    "{prenom}, tu n’as pas manqué de volonté, seulement de tout le reste.",
    "{prenom}, l’univers t’a envoyé un message. Il était classé dernier.",
    "{prenom}, ton score est bas, mais ton implication est bruyante.",
    "{prenom}, tu as inventé une nouvelle façon d’être juste à côté.",
    "{prenom}, la partie t’a laissé une chance. Tu l’as décorée puis rendue.",
    "{prenom}, tu as été constant dans l’imprévu. Ça ne veut rien dire, mais ça sonne bien.",
    "{prenom}, ton plan B attend encore le plan A.",
    "{prenom}, tu as semé le doute. Principalement sur tes propres choix.",
    "{prenom}, la victoire t’a salué de loin, par politesse.",
    "{prenom}, la défaite t’a reconnu immédiatement.",
    "{prenom}, tu es arrivé en finale de ton propre optimisme.",
    "{prenom}, ton score a le charme discret des petites ambitions.",
    "{prenom}, tu as confondu panache et dégâts collatéraux.",
    "{prenom}, la partie t’a demandé un vainqueur. Tu as proposé autre chose.",
    "{prenom}, tu t’es battu comme si le résultat était facultatif.",
    "{prenom}, ce n’était pas une déroute. C’était une visite guidée.",
    "{prenom}, ton timing était précis, surtout pour rater le bon moment.",
    "{prenom}, tu as perdu dans les règles. Ça sauve un peu les meubles.",
    "{prenom}, la victoire a hésité, puis elle a vu la concurrence.",
    "{prenom}, ton score est un poème court, sans rime et sans espoir.",
    "{prenom}, tu as joué avec ton cœur. Les points demandaient autre chose.",
    "{prenom}, ton classement prouve qu’il y avait plusieurs issues, dont celle-ci.",
    "{prenom}, tu as frôlé l’exploit, si on élargit beaucoup la définition.",
    "{prenom}, la partie ne t’a pas oublié. Elle t’a juste placé en bas.",
    "{prenom}, tu as transformé la pression en décoration.",
    "{prenom}, ton effort mérite une médaille imaginaire.",
    "{prenom}, la victoire t’a contourné avec une efficacité administrative.",
    "{prenom}, tu as montré que perdre aussi demande une méthode.",
    "{prenom}, ton score n’est pas faible. Il est minimaliste.",
    "{prenom}, tu as tenté l’impossible. Il est resté impossible.",
    "{prenom}, tu as donné du relief au tableau des scores.",
    "{prenom}, ton parcours a eu une grande qualité : il est terminé.",
    "{prenom}, tu as laissé la victoire aux autres avec un altruisme suspect.",
    "{prenom}, on a vu passer l’espoir, puis ton tour est arrivé.",
    "{prenom}, ton résultat a demandé le silence par respect.",
    "{prenom}, la partie a tranché, et elle n’a pas tremblé.",
    "{prenom}, tu as joué comme quelqu’un qui voulait enrichir le folklore.",
    "{prenom}, ton score n’a pas gagné, mais il a raconté quelque chose.",
    "{prenom}, la victoire était possible. Voilà pour la partie théorique.",
    "{prenom}, tu as perdu avec une sincérité presque touchante.",
    "{prenom}, ton approche était originale, surtout dans son inefficacité.",
    "{prenom}, tu as offert au jeu une conclusion très lisible.",
    "{prenom}, la chance a consulté ton dossier et s’est abstenue.",
    "{prenom}, tu as rejoint le panthéon discret des fins de classement.",
    "{prenom}, cette partie aura au moins servi à identifier le perdant."
  ];

  const CREDIT_INTRO_TEXTS = [
    "Un programme d’affrontement pixelisé conçu pour régler des différends qui n’existaient pas encore.",
    "Une expérience compétitive de haute absurdité, validée par personne mais assumée par tous.",
    "Le seul jeu capable de transformer une simple présence en rivalité parfaitement inutile.",
    "Un dispositif sportif approximatif pensé pour départager les ego avec une élégance discutable.",
    "Une borne de duel social où le panache compte presque autant que le score.",
    "Une simulation de prestige, de réflexes et de décisions regrettables.",
    "Un concentré de pixels, de tension et de jugement silencieux entre amis.",
    "Un jeu de précision douteuse pour personnes beaucoup trop sûres d’elles.",
    "Une célébration numérique du mauvais timing, du bon chaos et des revers humiliants.",
    "Un monument technologique modeste dédié à la gloire, à la chute, et au ballon carré."
  ];
  const CREDIT_CREATION_TEXT = "Édition locale 2026 - football clandestin en pixels";
  const TITLE_TAGLINE = "Football rétro en vert et contre tous";
  const PAUSE_TAGLINE = "Le jeu régressif qui tacle le sérieux";
  const ENABLE_WARGAME = true;

  const AI_DIFFICULTIES = {
    easy: { label: "EASY", speed: 190, reaction: 0.44, error: 96, description: "La Machine regarde ses crampons." },
    normal: { label: "NORMAL", speed: 260, reaction: 0.32, error: 62, description: "Correcte, mais pas voyante." },
    hard: { label: "HARD", speed: 335, reaction: 0.23, error: 38, description: "Elle commence à lire le ballon." },
    boss: { label: "BOSS", speed: 392, reaction: 0.17, error: 24, description: "Très forte, jamais parfaite." }
  };
  const AI_DIFFICULTY_IDS = Object.keys(AI_DIFFICULTIES);

  const MATCH_MODES = [
    { id: "speed", label: "FOOT TURBO", description: "Le ballon accélère à chaque échange." },
    { id: "multi", label: "MULTIBALLS", description: "Un nouveau ballon toutes les 20 secondes." },
    { id: "normal", label: "CLASSIC", description: "Un ballon, cages ouvertes, dignité fermée." }
  ];

  const PADDLE_TYPES = [
    { id: "round", label: "LIBÉRO", shapeLabel: "NORMAL", description: "Style compact, angles souples.", height: 72, width: 18, speedFactor: 1 },
    { id: "triangle", label: "NUMÉRO 10", shapeLabel: "TRIANGULAIRE", description: "Créatif et précis, +50% vitesse.", height: 70, width: 18, speedFactor: 1.5 },
    { id: "weird", label: "ATTAQUANT", shapeLabel: "DEMI-CERCLE", description: "Petit et brutal, +100% vitesse. Match +30% toutes les 30s.", height: 74, width: 18, speedFactor: 2 }
  ];

  const SCORE_TO_WIN = 5;
  const BASE_SPEED = 350;
  const PADDLE_BASE_SPEED = 390;
  const PADDLE_SPEED_SHUTTLE_INFLUENCE = 0.38;
  const PADDLE_SPEED_MULTIBALL_BONUS = 0.12;
  const PADDLE_SPEED_MAX_MULTIPLIER = 1.75;
  const PADDLE_SPEED_SHUTTLE_CAP_MULTIPLIER = 2.2;
  const SPEEDUP_PADDLE_HIT = 1.06;
  const SPEEDUP_WALL_HIT = 1.02;
  const SPEEDUP_MAX_MULTIPLIER = 2.2;
  const FATAL_BOOSTER_LABEL = "Fatal Booster";
  const BOOSTED_SAVE_REWARD = 50;
  const BORING_INITIAL_SPEED_MULTIPLIER = 1.5;
  const SPEED_BOOST_MULTIPLIER = 3.6;
  const BORING_SPEED_BOOST_MULTIPLIER = 4.59;
  const PAUSE_KEY = " ";
  const SOUND_TOGGLE_KEY = "=";
  const MULTIBALL_INTERVAL_SECONDS = 20;
  const MULTIBALL_MAX = 4;
  const ATTACKER_SPEEDUP_INTERVAL_SECONDS = 30;
  const ATTACKER_SPEEDUP_MULTIPLIER = 1.3;
  const SCORE_COOLDOWN_SECONDS = 1;
  const GOAL_HEIGHT = 176;
  const GOAL_DEPTH = 34;

  function createPlayerFromImage(file) {
    const name = displayNameFromImageFile(file);
    const id = playerIdFromName(name);
    return {
      id,
      name,
      initials: initialsFromName(name),
      files: playerImageFallbacks(file),
      difficulty: PLAYER_DIFFICULTIES[id] || "normal",
      line: PLAYER_LINES[id] || "Frappe non homologuée, confiance excessive."
    };
  }

  function displayNameFromImageFile(file) {
    const name = baseName(file);
    return (PLAYER_NAME_OVERRIDES[name] || name)
      .replace(/_/g, " ")
      .replace(/-/g, "-")
      .trim();
  }

  function playerIdFromName(name) {
    return String(name || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9]+/g, "")
      .toLowerCase();
  }

  function initialsFromName(name) {
    const parts = String(name || "")
      .split(/[\s-]+/)
      .filter(Boolean);
    if (!parts.length) return "?";
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return parts.slice(0, 2).map(part => part[0]).join("").toUpperCase();
  }

  function playerImageFallbacks(file) {
    const name = baseName(file);
    const fallbacks = [file, `OLD/${name}.png`];
    if (name === "Cecile") fallbacks.push("OLD/Cécile.png");
    if (name === "Julien") fallbacks.push("OLD/Julien-1.png");
    return fallbacks;
  }

  function baseName(file) {
    return String(file || "").replace(/^.*\//, "").replace(/\.[^.]+$/, "");
  }

  function playerById(id) {
    return PLAYERS.find(player => player.id === id) || PLAYERS[0];
  }

  function matchModeById(id) {
    return MATCH_MODES.find(mode => mode.id === id) || MATCH_MODES[0];
  }

  function paddleTypeById(id) {
    return PADDLE_TYPES.find(type => type.id === id) || PADDLE_TYPES[0];
  }

  function aiDifficultyById(id) {
    return AI_DIFFICULTIES[id] || AI_DIFFICULTIES.normal;
  }

  function playerFlavorProfile(player) {
    if (!player) {
      return {
        shortProfile: "profil non homologué",
        profile: "profil non homologué",
        quote: "Les archives refusent de commenter."
      };
    }
    if (player.assetId === "machine" || player.id === "machine" || String(player.id || "").startsWith("machine-")) {
      return {
        shortProfile: "IA normale",
        profile: "IA normale",
        quote: player.line || "IA locale. Sourire inquiétant."
      };
    }
    if (player.id === "random" || player.id === "random-all" || player.id === "all-random") {
      return {
        shortProfile: "tirage au sort",
        profile: "tirage au sort",
        quote: player.line || "Le hasard met un survêtement discret."
      };
    }
    if (player.id === "start") {
      return {
        shortProfile: "lancer",
        profile: "lancer le tournoi",
        quote: player.line || "Le tableau attend son destin."
      };
    }
    const flavor = PLAYER_FLAVOR_PROFILES[player.id];
    if (flavor) return flavor;
    return {
      shortProfile: "profil non homologué",
      profile: "profil non homologué",
      quote: player.line || "Les archives refusent de commenter."
    };
  }

  window.BadPongConfig = {
    HOME_PHOTO_FILES,
    PLAYER_IMAGE_FILES,
    PLAYERS,
    PLAYER_FLAVOR_PROFILES,
    LOSER_COMMENTS,
    CREDIT_INTRO_TEXTS,
    CREDIT_CREATION_TEXT,
    TITLE_TAGLINE,
    PAUSE_TAGLINE,
    ENABLE_WARGAME,
    AI_DIFFICULTIES,
    AI_DIFFICULTY_IDS,
    MATCH_MODES,
    PADDLE_TYPES,
    SCORE_TO_WIN,
    BASE_SPEED,
    PADDLE_BASE_SPEED,
    PADDLE_SPEED_SHUTTLE_INFLUENCE,
    PADDLE_SPEED_MULTIBALL_BONUS,
    PADDLE_SPEED_MAX_MULTIPLIER,
    PADDLE_SPEED_SHUTTLE_CAP_MULTIPLIER,
    SPEEDUP_PADDLE_HIT,
    SPEEDUP_WALL_HIT,
    SPEEDUP_MAX_MULTIPLIER,
    FATAL_BOOSTER_LABEL,
    BOOSTED_SAVE_REWARD,
    BORING_INITIAL_SPEED_MULTIPLIER,
    SPEED_BOOST_MULTIPLIER,
    BORING_SPEED_BOOST_MULTIPLIER,
    PAUSE_KEY,
    SOUND_TOGGLE_KEY,
    MULTIBALL_INTERVAL_SECONDS,
    MULTIBALL_MAX,
    ATTACKER_SPEEDUP_INTERVAL_SECONDS,
    ATTACKER_SPEEDUP_MULTIPLIER,
    SCORE_COOLDOWN_SECONDS,
    GOAL_HEIGHT,
    GOAL_DEPTH,
    playerById,
    matchModeById,
    paddleTypeById,
    aiDifficultyById,
    playerFlavorProfile
  };
})();
