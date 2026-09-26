# Les Archives HGGSP

**Les Archives HGGSP** est une application statique pour consulter, rechercher,
filtrer et reutiliser les sujets d'annales du baccalaureat general en
**Histoire-Geographie, Geopolitique et Sciences Politiques (HGGSP)**.

L'application a ete pensee pour un usage concret en classe, la preparation des
eleves et la constitution rapide de sujets personnalises.

## Objectifs

Le site permet notamment de :

- retrouver un sujet par annee, lieu, theme ou type d'exercice ;
- rechercher un mot-cle dans les sujets et les transcriptions ;
- distinguer les dissertations et les etudes critiques de documents ;
- consulter les documents transcrits et les images associees ;
- ouvrir le PDF officiel Eduscol de chaque epreuve ;
- ajouter des sujets aux favoris ;
- composer un sujet personnalise a partir de plusieurs exercices ;
- consulter les sujets en mode clair ou sombre ;
- exporter un sujet en PDF, Markdown ZIP, ODT ou DOCX.

Les exports DOCX et ODT integrent les images des documents lorsque celles-ci
sont disponibles dans le dossier `assets/`.

## Apercu

La base actuelle rassemble des sujets HGGSP des sessions 2021 a 2026, repartis
par jour d'epreuve, centre d'examen, theme du programme et exercice.

Les PDF officiels restent la reference. Les transcriptions et les mises en
forme proposees par l'application sont destinees a faciliter la recherche, la
lecture, la projection et la reutilisation pedagogique.

## Fonctionnalites

- **Recherche** par mot-cle, avec prise en compte des accents courants.
- **Filtres** par theme, type d'exercice, annee et lieu.
- **Favoris** conserves dans le stockage local du navigateur.
- **Navigation par sujet**, par jour d'epreuve et par partie.
- **Etudes critiques de documents** avec consignes, transcriptions, sources,
  notes et illustrations.
- **Sujet personnalise** pour rassembler des exercices selectionnes.
- **Liens vers les PDF officiels** publies par Eduscol.
- **Mode sombre** et interface adaptee aux ecrans de projection, ordinateurs,
  tablettes et telephones.
- **Exports** PDF, Markdown ZIP, ODT LibreOffice et DOCX Word.
- **Mise en page d'export** avec titres, consignes, sources, notes et images.

## Fonctionnement technique

Les Archives HGGSP est une application web statique. Elle ne necessite ni
base de donnees, ni compilation, ni installation de dependances locales.

Les principaux fichiers sont :

- `index.html` : structure de la page et controles de l'application ;
- `style.css` : mise en forme, responsive design, mode sombre et impression ;
- `script.js` : recherche, filtres, navigation, favoris, sujet personnalise,
  affichage des sujets et exports ;
- `data.js` : base principale des sujets ;
- `data.json` : copie exploitable de la base de donnees ;
- `documents-2021.js` a `documents-2026.js` : consignes, transcriptions,
  sources, notes et metadonnees des documents HGGSP ;
- `assets/branding/` : identite visuelle de l'application ;
- `assets/documents/` : images des documents et ressources necessaires aux
  exports.

La bibliotheque Markdown `marked` est chargee depuis jsDelivr. Une connexion
Internet est donc recommandee pour beneficier du rendu Markdown complet.

## Utilisation locale

Le fichier `index.html` peut etre ouvert directement dans un navigateur.

Pour lancer l'application avec un serveur local, depuis le dossier du projet :

```bash
python3 -m http.server 8000
```

Puis ouvrir :

```text
http://localhost:8000/
```

Un serveur local est recommande pour tester les exports et les chargements de
ressources dans des conditions proches de GitHub Pages.

## Publication avec GitHub Pages

Le projet peut etre publie directement, sans etape de build.

1. Creer un depot GitHub, par exemple `archives-hggsp`.
2. Envoyer l'ensemble du contenu de ce dossier a la racine du depot.
3. Conserver l'arborescence du dossier `assets/`.
4. Ouvrir **Settings > Pages** dans GitHub.
5. Choisir **Deploy from a branch**.
6. Selectionner la branche `main` et le dossier `/(root)`.
7. Enregistrer.

L'application sera accessible a une adresse de la forme :

```text
https://votre-compte.github.io/archives-hggsp/
```

Le depot doit notamment contenir `index.html`, `style.css`, `script.js`, les
fichiers de donnees et l'ensemble du dossier `assets/`. Les fichiers
`assets/documents/*.export.js` sont necessaires au fonctionnement des exports
hors ligne et doivent etre conserves.

## Mise a jour des contenus

Pour ajouter ou corriger un sujet :

1. mettre a jour les donnees du sujet dans `data.js` ou `data.json` selon le
   flux de travail utilise ;
2. ajouter ou corriger les informations documentaires dans le fichier
   `documents-AAAA.js` correspondant ;
3. placer les nouvelles images dans `assets/documents/` ;
4. verifier les chemins des images, les sources et les liens vers les PDF
   officiels ;
5. tester l'affichage et les exports PDF, ODT et DOCX ;
6. publier les fichiers modifies sur GitHub.

Les PDF officiels Eduscol restent la source de verification pour le contenu,
la transcription et la mise en page d'origine.

## Donnees locales

Le navigateur conserve localement les preferences et selections suivantes :

- sujets favoris ;
- sujets ajoutes au sujet personnalise ;
- choix du mode clair ou sombre.

Ces donnees ne sont pas envoyees a un serveur par l'application.

## Sources et credits

Les sujets proviennent de la banque officielle des annales du baccalaureat
publiee par [Eduscol](https://eduscol.education.gouv.fr/5199/annales-des-epreuves-du-baccalaureat-des-voies-generale-et-technologique).

Projet concu par [Alexandre Balet](https://th.linkedin.com/in/alexandre-balet),
enseignant et formateur en Histoire-Geographie, Bangkok, AEFE, pour
[La Classe d'Histoire](http://www.laclassedhistoire.fr).

Le developpement a ete realise avec l'assistance de Codex et de GPT-5.6 Luna.

Les sujets, documents, images et ressources externes restent soumis aux droits
et conditions d'utilisation de leurs sources respectives. Les liens vers les
sources officielles sont conserves dans l'application lorsque cela est
possible.

## Licence

Sauf mention contraire, le code et les contenus editoriaux originaux de ce
projet sont proposes sous licence
[Creative Commons Attribution - Partage dans les memes conditions 4.0 International (CC BY-SA 4.0)](https://creativecommons.org/licenses/by-sa/4.0/deed.fr).

Vous pouvez partager et adapter le projet, y compris pour un usage commercial,
a condition de citer l'auteur, d'indiquer les modifications eventuelles et de
diffuser toute version adaptee sous la meme licence.
