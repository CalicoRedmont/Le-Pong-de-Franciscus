# AGENTS.md

## Projet

Ce dépôt contient Bad Pong / Fabien, un jeu rétro arcade avec une esthétique volontairement absurde, vintage, terminal et MS-DOS.

## Règle prioritaire

Ne jamais casser, supprimer ou remplacer le jeu Bad Pong original.

Toute nouvelle fonctionnalité importante doit être développée de manière isolée, avec un retour facile à la version initiale.

Le mode WARGAME.EXE doit être une version alternative complète ou un mode caché séparé, pas une modification invasive du gameplay Pong existant.

## Fallback obligatoire

Le jeu original doit rester le comportement par défaut.

Si WARGAME.EXE dysfonctionne, on doit pouvoir revenir au Bad Pong initial sans devoir réparer tout le projet.

Prévoir si possible une constante, un flag ou une option permettant de désactiver WARGAME.EXE :

ENABLE_WARGAME = true

Si ENABLE_WARGAME est false, Bad Pong doit fonctionner comme avant.

## Architecture

Préférer une architecture par états, scènes ou modules séparés.

Exemples acceptables :

- TITLE
- PONG
- WARGAME_BOOT
- WARGAME
- WARGAME_GAME_OVER
- WARGAME_VICTORY

Ou :

- TitleScene
- PongScene
- WarGameBootScene
- WarGameScene
- WarGameEndScene

Le mode WARGAME doit avoir ses propres données :

- playerAircraft
- enemyMissiles
- playerShots
- heavyMissiles
- cities
- machineNodes
- humanity
- machineCore
- gameOver
- victory

Ne pas réutiliser directement :

- la balle Pong comme missile ;
- le score Pong comme jauge HUMANITY ;
- les collisions Pong comme logique principale de WARGAME ;
- les variables internes de Pong pour gérer l’avion ou les missiles.

## WARGAME.EXE

WARGAME.EXE est un mode caché ou une version alternative accessible depuis l’écran titre quand le joueur tape :

WARGAME

Le jeu doit alors lancer une séquence rétro :

C:\BADPONG> WARGAME
PASSWORD ACCEPTED
ACCESSING DARKWEB NODE
BAD PONG INTERFACE DISCONNECTED
LOADING WARGAME.EXE

L’interface Bad Pong doit donner l’impression de s’ouvrir ou de se décompiler pour révéler une console cachée.

## Concept WARGAME

Le joueur contrôle un avion de chasse fictif du commandement mondial.

L’identité doit évoquer un pilote de l’ONU sans utiliser le logo officiel, l’emblème officiel ou une affiliation réelle.

Identités acceptables :

- UN-50 COMMAND
- GLOBAL DEFENSE PILOT
- PEACEKEEPER-50
- CALLSIGN: FABIEN

MACHINE, une IA ennemie locale et fictive, lance des missiles contre les villes du monde et contre l’avion du joueur.

Le joueur doit :

- piloter l’avion ;
- intercepter les missiles ennemis ;
- protéger les villes ;
- esquiver les missiles chasseurs ;
- lancer des missiles lourds contre les nœuds MACHINE ;
- détruire MACHINE CORE pour gagner.

## Direction artistique

Style visuel :

- rétro MS-DOS ;
- terminal CRT ;
- fond noir ;
- vert phosphore ;
- carte du monde stylisée ;
- radar ou boussole ;
- police monospace ;
- scanlines légères si possible ;
- glitch sobre pendant la transition ;
- explosions simples en pixels ou ASCII.

Ne pas ajouter d’effet moderne réaliste qui casserait l’identité du jeu.

## GAME OVER

Si un missile touche l’avion :

- arrêter immédiatement l’action ;
- écran noir ;
- afficher uniquement :

GAME OVER

Le texte doit être grand, centré, sobre.

Ne pas ajouter de menu moderne ou de texte secondaire au début.

Si HUMANITY tombe à zéro :

HUMANITY LOST
GAME OVER

## Victoire

Si MACHINE CORE est détruit :

MACHINE CORE DESTROYED
GLOBAL STRIKE ABORTED
HUMANITY STATUS: DAMAGED BUT ALIVE
MISSION COMPLETE

## Non-régression

Après chaque modification importante, vérifier :

- Bad Pong démarre encore normalement ;
- le gameplay Pong fonctionne encore ;
- les contrôles Pong ne sont pas cassés ;
- le score Pong fonctionne encore ;
- WARGAME ne se lance que par le mot de passe ou le mécanisme prévu ;
- le retour au titre fonctionne ;
- désactiver WARGAME ne casse pas Bad Pong.

## Méthode de travail

Avant de coder une grosse modification :

1. analyser l’architecture existante ;
2. identifier les fichiers à modifier ;
3. proposer une stratégie d’intégration ;
4. préserver le jeu original ;
5. implémenter une version MVP propre ;
6. tester Bad Pong ;
7. tester WARGAME.

Ne pas tout mélanger dans un seul fichier si l’architecture permet de faire mieux.

## Validation

Si le projet fournit des commandes de build, test ou lint, les exécuter après modification.

Si une commande échoue, expliquer la cause probable et corriger si possible.

À la fin d’une tâche, fournir :

- fichiers créés ;
- fichiers modifiés ;
- méthode pour lancer Bad Pong original ;
- méthode pour débloquer WARGAME.EXE ;
- méthode pour désactiver WARGAME si disponible ;
- contrôles du mode WARGAME ;
- vérifications effectuées ;
- risques restants.
