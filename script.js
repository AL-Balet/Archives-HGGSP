const state = {
  chapter: "Tous",
  exerciseType: "Tous",
  year: "Tous",
  place: "Tous",
  query: "",
  sort: "recent",
  favoritesOnly: false,
  selectedId: null,
  selectedChapter: null,
  correctionVisible: false,
  printingSheet: false
};

const exercises = [];
const favorites = new Set(loadFavorites());
const sheetSelections = loadSheetSelections();
const yearColors = {
  2021: "#55a65a",
  2022: "#249b8e",
  2023: "#3387c8",
  2024: "#6f63c8",
  2025: "#b44bb6",
  2026: "#d9486e"
};

const officialChapters = [
  "Thème 1 - De nouveaux espaces de conquête",
  "Thème 2 - Faire la guerre, faire la paix : formes de conflits et modes de résolution",
  "Thème 3 - Histoire et mémoires",
  "Thème 4 - Identifier, protéger et valoriser le patrimoine : enjeux géopolitiques",
  "Thème 5 - L'environnement, entre exploitation et protection : un enjeu planétaire",
  "Thème 6 - L'enjeu de la connaissance"
];

const els = {
  topActions: document.querySelector(".top-actions"),
  listPage: document.querySelector("#listPage"),
  detailPage: document.querySelector("#detailPage"),
  backButton: document.querySelector("#backButton"),
  aboutButton: document.querySelector("#aboutButton"),
  aboutOverlay: document.querySelector("#aboutOverlay"),
  aboutClose: document.querySelector("#aboutClose"),
  sheetButton: document.querySelector("#sheetButton"),
  sheetCount: document.querySelector("#sheetCount"),
  sheetOverlay: document.querySelector("#sheetOverlay"),
  sheetClose: document.querySelector("#sheetClose"),
  sheetMeta: document.querySelector("#sheetMeta"),
  sheetSelection: document.querySelector("#sheetSelection"),
  sheetPreview: document.querySelector("#sheetPreview"),
  sheetClearButton: document.querySelector("#sheetClearButton"),
  themeToggle: document.querySelector("#themeToggle"),
  searchInput: document.querySelector("#searchInput"),
  favoriteOnly: document.querySelector("#favoriteOnly"),
  mobileStatsSlot: document.querySelector("#mobileStatsSlot"),
  chapterSelect: document.querySelector("#chapterSelect"),
  exerciseTypeSelect: document.querySelector("#exerciseTypeSelect"),
  yearSelect: document.querySelector("#yearSelect"),
  placeSelect: document.querySelector("#placeSelect"),
  sortSelect: document.querySelector("#sortSelect"),
  resetButton: document.querySelector("#resetButton"),
  resultCount: document.querySelector("#resultCount"),
  exerciseList: document.querySelector("#exerciseList"),
  viewerMeta: document.querySelector("#viewerMeta"),
  viewerTitle: document.querySelector("#viewerTitle"),
  subjectView: document.querySelector("#subjectView"),
  correctionPanel: document.querySelector("#correctionPanel"),
  correctionView: document.querySelector("#correctionView"),
  toggleCorrection: document.querySelector("#toggleCorrection")
};

const mobileStatsMedia = window.matchMedia("(max-width: 720px)");

applyStoredTheme();

function setLoadingState(message) {
  if (els.resultCount) {
    els.resultCount.textContent = message;
  }
  if (els.exerciseList) {
    els.exerciseList.innerHTML = `<div class="empty-state">${escapeHtml(message)}</div>`;
  }
}

function loadDataScript() {
  return new Promise((resolve, reject) => {
    if (Array.isArray(window.HGGSP_EXERCISES) && window.HGGSP_EXERCISES.length) {
      resolve(window.HGGSP_EXERCISES);
      return;
    }

    const existingScript = document.querySelector('script[data-hggsp-data="true"]');
    if (existingScript) {
      existingScript.addEventListener("load", () => resolve(window.HGGSP_EXERCISES || []), { once: true });
      existingScript.addEventListener("error", () => reject(new Error("Chargement de data.js impossible")), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = "./data.js?v=2";
    script.defer = true;
    script.dataset.hggspData = "true";
    script.onload = () => resolve(window.HGGSP_EXERCISES || []);
    script.onerror = () => reject(new Error("Chargement de data.js impossible"));
    document.head.appendChild(script);
  });
}

async function loadExercises() {
  if (Array.isArray(window.HGGSP_EXERCISES) && window.HGGSP_EXERCISES.length) {
    exercises.splice(0, exercises.length, ...window.HGGSP_EXERCISES);
    return;
  }

  if (window.location.protocol === "file:") {
    const localData = await loadDataScript();
    if (Array.isArray(localData) && localData.length) {
      exercises.splice(0, exercises.length, ...localData);
      return;
    }
  }

  const response = await fetch(`./data.json?v=2`, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Chargement impossible (${response.status})`);
  }

  const data = await response.json();
  exercises.splice(0, exercises.length, ...data);
}

function normalize(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[œŒ]/g, "oe")
    .replace(/[æÆ]/g, "ae")
    .toLowerCase();
}

function renderMarkdown(markdown) {
  const helperIcon =
    '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 1 1 3 3L7 19l-4 1 1-4Z"/></svg>';
  const questionHintPattern = /\(((?:r|R)[ée]ponse(?:\s+longue)?(?:\s*:\s*[^)]+|\s+courte)|\s*\d+(?:[,.]\d+)?\s*(?:points?|pts?)\s*)\)/g;

  if (window.marked) {
    marked.setOptions({ breaks: true, gfm: true });
    return marked.parse(markdown || "")
      .replace(
        /<p><strong>((?:Document|Documents)\s+[\s\S]*?)<\/strong><\/p>/g,
        '<p class="document-label"><strong>$1</strong></p>'
      )
      .replace(
        /<p>Pour vous aider,([\s\S]*?)<\/p>/g,
        (_, text) => {
          const helperText = String(text || "").replace(/^\s*vous\b/i, "Vous");
          return `<p class="helper-note"><span class="helper-note-icon">${helperIcon}</span><span><strong>Pour vous aider</strong><br>${helperText}</span></p>`;
        }
      )
      .replace(
        /<li>([\s\S]*?)<\/li>/g,
        (match, content) => `<li>${content.replace(questionHintPattern, `<span class="answer-hint">($1)</span>`)}</li>`
      )
      .replace(
        /<p>([\s\S]*?)<\/p>/g,
        (match, content) => `<p>${content.replace(questionHintPattern, `<span class="answer-hint">($1)</span>`)}</p>`
      );
  }

  return `<pre>${escapeHtml(markdown || "")}</pre>`;
}

function pencilIconMarkup() {
  return `
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M12 20h9"/>
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>
    </svg>
  `;
}

function paperIconMarkup() {
  return `
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/>
      <path d="M14 2v6h6"/>
      <path d="M8 13h8"/>
      <path d="M8 17h6"/>
    </svg>
  `;
}

function cleanHggspTopicTitle(title) {
  return String(title || "")
    .replace(/^Étude critique de documents?\s*(?:\([^)]+\))?\s*\d*\s*[:–-]\s*/i, "")
    .replace(/^Etude critique de documents?\s*(?:\([^)]+\))?\s*\d*\s*[:–-]\s*/i, "")
    .replace(/\s+Consigne\s*[:–-]?\s*[\s\S]*$/i, "")
    .trim()
    .replace(/^(\s*[«"“‘'([{]*\s*)([a-zà-ÿ])/u, (_, prefix, first) => prefix + first.toLocaleUpperCase("fr-FR"));
}

const hggspDocumentInstructions = Object.assign({}, window.HGGSP_DOCUMENT_INSTRUCTIONS || {}, {
  "transmettre la memoire de la shoah": "Consigne : En analysant les documents, en les confrontant, et en vous appuyant sur vos connaissances, vous montrerez comment se transmet la mémoire de la Shoah.",
  "permanences et mutations des formes de guerre": "Consigne : En analysant les documents, en les confrontant, et en vous appuyant sur vos connaissances, vous montrerez les permanences et les mutations des formes de la guerre dans le monde contemporain."
});

const hggspDocumentTranscriptions = Object.assign({}, window.HGGSP_DOCUMENT_TRANSCRIPTIONS || {}, {
  "transmettre la memoire de la shoah": [
    {
      title: "Liat Benhabib, directrice du Centre de documentation visuelle de Yad Vashem, présente, lors d’un entretien, le film Shoah, réalisé par Claude Lanzmann.",
      paragraphs: [
        "[Ce] film est révolutionnaire. [Lanzmann] entame son travail sur Shoah en 1975 et prend alors une décision artistique et morale très importante. Non seulement il parle de la Shoah, de la Solution finale et de la volonté d'extermination nazie, mais il le fait de façon très différente. Son film ne repose que sur le témoignage. Vous n'y trouverez pas un seul plan d'images d'archives.",
        "Pourquoi Lanzmann ne voulait-il pas utiliser des images d'archives ?",
        "Les images d'archives sont soit des images filmées par les nazis, et donc des images de propagande, soit des images tournées par les forces alliées - les Russes, les Britanniques, les Américains - à la libération des camps […]. Cela posait deux problèmes à Lanzmann. Car même s'il s'agit d'images au plus proche de ce qui s'était passé dans les camps, ce sont des images prises après les actions. Comme un policier qui arrive sur une scène de crime, après le crime. Il peut procéder à une reconstitution, mais n'aura jamais d'images du crime lui-même. Et, deuxième point, ce sont des images très dures à regarder, à la limite du supportable. Lanzmann ne voulait pas permettre au spectateur de baisser les yeux, ne serait-ce qu'une seconde, de l'écran.",
        "Sur quoi s'appuie-t-il pour raconter la Shoah ?",
        "Claude Lanzmann va alors prendre le parti-pris de ne faire appel qu'aux témoignages. Il va planifier et tourner plus de 200 interviews, 10 ans durant. Il ne filme pas uniquement des rescapés juifs, mais aussi des Justes, des nazis. C'est un tournant décisif sur la façon dont le cinéma s'intéresse à la Shoah. Lanzmann ouvre son film avec la parole de Simon Srebnik, un jeune Juif de 13 ans et demi, Sonderkommando à Chelmno. Pendant plusieurs minutes, Srebnik explique qu'il est impossible de comprendre ce qui s'est passé : « personne ne peut saisir, même moi qui était sur place, je ne peux pas réaliser ce qui s'est réellement passé ». Lanzmann passe alors un pacte avec les spectateurs. Comme s'il leur disait : « Vous ne pourrez pas comprendre, mais on va vous raconter cette histoire, encore et encore, en profondeur, pendant 9 heures, en partant de plusieurs points de vue, de plusieurs interlocuteurs, de plusieurs endroits, pour essayer de se rapprocher au plus près de ce qu'il est possible de comprendre ». C'est une décision cinématographique très courageuse. Il a réalisé plus de 200 interviews de témoins, qui jusque-là n'étaient pas dans le cadre et qui soudain, occupent le premier plan.",
        "Peut-on construire un film documentaire uniquement sur des témoignages ?",
        "Le rapport de Claude Lanzmann au témoignage est très important. La valeur du témoignage soulève des questions historiques, mais aussi psychologiques. Comment la mémoire fonctionne-t-elle ? De quoi se souvient-on ? Les souvenirs sont-ils objectifs ? Comment reconstituer l'histoire à partir d'expériences personnelles ? Comment amener un individu à raconter des souvenirs vieux de plusieurs décennies sans lui faire revivre un traumatisme ? Toutes ces questions se retrouvent dans le film de Lanzmann. Le réalisateur s'y intéresse alors qu'il tourne. Comme par exemple, dans cette scène devenue culte avec Abraham Bomba, le coiffeur [...]. Il lutte avec lui-même pour témoigner, supplie Lanzmann de le laisser en paix. Le spectateur assiste à sa souffrance. Lanzmann filme tous leurs échanges. On le voit et l'entend parler, rassurer, réussir à convaincre l'interviewé de livrer sa parole. On assiste à tout le processus psychologique que traverse le témoin. Ce sont des données très importantes pour le devoir de mémoire.",
        "A qui s'adresse ce film ?",
        "A tout le monde, partout sur la planète. Il est sorti dans le monde entier, traduit en plus de 20 langues. En Israël, des projections sont organisées dans les lycées, en 3 parties de 3 heures chacune. Il est parfois projeté en 2 parties de 4,5 heures. C'est un des films de référence sur la Shoah. Par exemple, quand nous avons ouvert le Centre de documentation visuelle en novembre 2005, il faisait bien évidemment partie de la liste des 1 000 films sur la Shoah que nous proposions alors au public.",
        "Trente ans après sa sortie, Shoah continue-t-il d'être un film de référence ?",
        "Avant Lanzmann, il y avait les films d'archives. Avec Lanzmann, il y a eu les films de témoignages. Aujourd'hui, on combine les deux. Les jeunes réalisateurs reviennent aux images d'archives qui grâce à l'ère digitale sont de plus en plus disponibles, mais continuent d'utiliser ou de faire référence aux images de Shoah de Lanzmann, qui reste un exemple en la matière."
      ],
      source: [
        "Source : d'après le Blog de l'Institut International pour la Mémoire de la Shoah - Yad Vashem, texte mis en ligne le 09 juillet 2018, en hommage au réalisateur Claude Lanzmann, mort le 5 juillet 2018.",
        "URL : https://www.yadvashem.org/fr/blog/shoah-de-lanzmann.html"
      ],
      notes: [
        "1. Sonderkommando : membre d’une équipe « spéciale » de déportés juifs employés sous la contrainte dans les installations de mise à mort.",
        "2. Abraham Bomba a été déporté à Treblinka et forcé à couper les cheveux des femmes avant qu’elles ne soient assassinées par le gaz."
      ]
    },
    {
      title: "Capture d’écran de la page d’accueil du site de présentation du projet Stolpersteine en France (consulté en novembre 2025).",
      image: "assets/documents/an2026-j1-doc2.png?v=1",
      imageAlt: "Capture du site Stolpersteine en France",
      paragraphs: [
        "Les Stolpersteine (ou pierres d'achoppements) sont des pavés en métal insérés dans le sol près des endroits où vivait une victime de la Shoah. Elles indiquent le nom de celle-ci, ses dates de naissance et de mort. L’artiste allemand Gunter Demnig est à l’initiative du projet, qui a connu une reconnaissance officielle en 1997. Plus de 100 000 pavés sont aujourd’hui installés dans 25 villes européennes."
      ],
      source: [
        "Source : site internet de l’association Stolpersteine en France",
        "URL : https://stolpersteine.fr/"
      ]
    }
  ],
  "permanences et mutations des formes de guerre": [
    {
      title: "Carte publiée par Courrier International.",
      image: "assets/documents/an2026-j2-doc1.png?v=2",
      imageAlt: "Carte des ramifications intercontinentales de Daech",
      source: [
        "Source : Courrier International, publié le 27 octobre 2015."
      ],
      notes: [
        "Abréviations : AL. Albanie ; AU. Autriche ; KI. Kirghizistan ; KO. Kosovo ; KOW. Koweït ; SE. Serbie ; TA. Tadjikistan."
      ]
    },
    {
      title: "Extrait d'une conférence de presse du chef d'état-major des armées françaises.",
      paragraphs: [
        "« […] C'est pourquoi je voudrais avec vous ici aujourd'hui faire un tour d'horizon sur notre environnement stratégique et sur les menaces que les armées doivent se préparer à affronter. Je vais évidemment me concentrer sur ce qui concerne plus directement les armées, mais les armées ne sont pas les seules à défendre les Français : il y a les forces de sécurité intérieure, il y a les services de renseignement, la diplomatie, les services de secours et bien d'autres qui y contribuent tous les jours.",
        "En préambule, je pense que, comme moi, vous constatez que l'environnement stratégique est marqué par des crises qui se multiplient et se superposent. […] En ce qui concerne les menaces qui touchent directement les Français au quotidien, ces menaces-là, sont caractéristiques de la période qu'on vit, qui est une période de compétition. [...] Une compétition qui s'exerce dans tous les champs de l'activité humaine. Ces menaces sont souvent hybrides et difficiles à attribuer. C'est pour ça qu'elles sont utilisées assez facilement par nos compétiteurs. Je constate qu'elles visent à tester notre détermination, nos capacités de réaction et à fragiliser notre cohésion nationale. J'y reviendrai. Je commencerai par les menaces terroristes et la criminalité. La menace terroriste : ce n’est pas parce que la guerre de haute intensité est revenue que la menace terroriste a disparu. Au contraire, elle reste présente. Elle reste présente en particulier sur le territoire national, même si nos forces de sécurité intérieure, nos services de renseignement ont beaucoup progressé et sont aujourd'hui plutôt capables de déjouer les attaques qui sont prévues, que devoir les traiter en gérant les conséquences. C'est quelque chose qui est très bien. Ça peut paraître un peu moins visible mais il y a une vraie menace et elle est traitée. [...]",
        "La menace est aussi liée à ce qui se passe dans le reste du monde et en particulier au Proche et Moyen-Orient qui est généralement un peu le bassin, ou en tout cas le vivier des risques de menaces exportées avec des risques de répercussion sur le territoire national. De fait, les armées, indirectement, sont engagées sur ces théâtres-là, par exemple en Irak, pour essayer de contrer au plus loin possible cette menace et limiter ses capacités de projection. C'est le cas en Irak, je l'ai dit, mais elles n'agissent pas seules. Les services de renseignement sont également mobilisés. Cela passe aussi par le contrôle des trafics d'armement dans l'océan Indien et la Corne de l'Afrique. […]",
        "Pour conclure, dans le monde que je viens de décrire, je pense qu’il y a quatre marqueurs qui permettent de comprendre et de voir ce à quoi on est confronté. Le premier marqueur, c’est un emploi de la force désinhibé. L’emploi de la force aujourd’hui, c’est l’outil principal des relations internationales. Beaucoup de pays considèrent que c’est le moyen le plus simple et le plus rapide d’obtenir des résultats et que dans ce domaine-là, quand on choisit des modes d’action où on produit le plus de pertes possibles, c’est quelque chose qui permet d’afficher sa détermination. La deuxième chose, le deuxième marqueur, c’est la contestation de l’Occident et de l’ordre établi après 1945. Un ordre qui s’appuie sur le droit international, qui aujourd’hui est contesté avec une vraie volonté de mettre en place un ordre alternatif. Poutine est le chef de file de cette volonté de désoccidentalisation et il en tire profit [...]. Le troisième marqueur c’est la puissance de l’information. L’information sous tous ses aspects : en termes de renseignement pour être capable de comprendre, en termes de champs informationnels, guerre informationnelle dans le champ des perceptions pour attaquer, en particulier la cohésion nationale de ses adversaires. Le dernier marqueur qui peut vous sembler d’un niveau différent, mais je pense que pour autant, c’est quelque chose qui est extrêmement important et pour beaucoup de pays, en fait, c’est l’impact du changement climatique, catalyseur du chaos. C’est une vraie préoccupation. [...] »"
      ],
      source: [
        "Source : conférence de presse du chef d’état-major des armées françaises, le général Thierry Burkhard, 11 juillet 2025."
      ],
      notes: [
        "1. Désinhibé : sans retenue, ni dissimulation."
      ]
    }
  ]
});

function hggspFindDocumentEntry(map, topic) {
  if (topic.documentKey && map[topic.documentKey]) {
    return map[topic.documentKey];
  }
  const looseTitle = normalize(cleanHggspTopicTitle(topic.title)).replace(/[^a-z0-9]+/g, " ").trim();
  const looseDayKey = normalize(`${topic.dayId || ""} ${cleanHggspTopicTitle(topic.title)}`).replace(/[^a-z0-9]+/g, " ").trim();
  if (topic.dayId) {
    const looseDayId = normalize(topic.dayId).replace(/[^a-z0-9]+/g, " ").trim();
    const exactDayAndTitleEntry = Object.entries(map).find(([needle]) => {
      const looseNeedle = normalize(needle).replace(/[^a-z0-9]+/g, " ").trim();
      return looseNeedle.includes(looseDayId) && looseTitle && looseNeedle.includes(looseTitle);
    });
    if (exactDayAndTitleEntry) return exactDayAndTitleEntry[1];

    const titleWords = new Set(looseTitle.split(" ").filter((word) => word.length > 2));
    const sameDayCandidates = Object.entries(map)
      .map(([needle, value]) => {
        const looseNeedle = normalize(needle).replace(/[^a-z0-9]+/g, " ").trim();
        const needleWords = new Set(looseNeedle.split(" ").filter((word) => word.length > 2));
        const overlap = [...titleWords].filter((word) => needleWords.has(word)).length;
        return { needle: looseNeedle, value, overlap };
      })
      .filter((candidate) => candidate.needle.includes(looseDayId) && candidate.overlap > 0)
      .sort((a, b) => b.overlap - a.overlap);
    if (sameDayCandidates[0]) return sameDayCandidates[0].value;

    const exactDayEntry = Object.entries(map).find(([needle]) => {
      const looseNeedle = normalize(needle).replace(/[^a-z0-9]+/g, " ").trim();
      return looseNeedle === looseDayId;
    });
    if (exactDayEntry) return exactDayEntry[1];
  }
  const looseKeys = [looseDayKey, looseTitle].filter(Boolean);
  return Object.entries(map)
    .map(([needle, value]) => {
      const looseNeedle = normalize(needle).replace(/[^a-z0-9]+/g, " ").trim();
      const score = Math.max(
        ...looseKeys.map((key) => {
          if (!key || !looseNeedle) return 0;
          const needleWords = looseNeedle.split(" ").filter((word) => !/^\d+$/.test(word));
          const needleTails = [8, 7, 6, 5, 4, 3].map((size) => needleWords.slice(-size).join(" "));
          if (key.includes(looseNeedle)) return 4;
          if (looseNeedle.includes(key)) return 3;
          if (looseTitle && looseNeedle.endsWith(looseTitle)) return 2;
          if (looseTitle && needleTails.some((tail) => tail && looseTitle.includes(tail))) return 2;
          if (looseTitle && looseTitle.includes(looseNeedle)) return 1;
          return 0;
        })
      );
      return { value, looseNeedle, score };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || b.looseNeedle.length - a.looseNeedle.length)[0]?.value;
}

function hggspDocumentsForTopic(topic) {
  return hggspFindDocumentEntry(hggspDocumentTranscriptions, topic) || [];
}

function hggspInstructionForTopic(topic) {
  return hggspFindDocumentEntry(hggspDocumentInstructions, topic) || "";
}

function htmlForMarkdown(html) {
  return String(html || "")
    .replace(/(<img\b[^>]*>)/gi, "\n$1\n")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .join("\n");
}

function hggspDocumentParagraphContent(doc, paragraph, paragraphIndex) {
  const styleRanges = [
    ...(doc.italicRanges || []).map((item) => ({ ...item, tag: "em" })),
    ...(doc.underlineRanges || []).map((item) => ({ ...item, tag: "u" })),
    ...(doc.boldRanges || []).map((item) => ({ ...item, tag: "strong" }))
  ]
    .filter((item) => item.paragraphIndex === paragraphIndex && item.text)
    .map((item) => ({ ...item, start: paragraph.indexOf(item.text) }))
    .filter((item) => item.start >= 0)
    .map((item) => ({ ...item, end: item.start + item.text.length }));

  if (!styleRanges.length) return escapeHtml(paragraph);

  const boundaries = [...new Set([
    0,
    paragraph.length,
    ...styleRanges.flatMap((range) => [range.start, range.end])
  ])].sort((left, right) => left - right);
  const addLineBreaks = Boolean(doc.boldRangeLineBreaks);
  const chunks = [];

  for (let index = 0; index < boundaries.length - 1; index += 1) {
    const start = boundaries[index];
    const end = boundaries[index + 1];
    if (start === end) continue;
    const activeRanges = styleRanges.filter((range) => range.start <= start && range.end >= end);
    let content = escapeHtml(paragraph.slice(start, end));
    activeRanges
      .sort((left, right) => ({ em: 1, u: 2, strong: 3 }[left.tag] || 0) - ({ em: 1, u: 2, strong: 3 }[right.tag] || 0))
      .forEach((range) => {
        content = `<${range.tag}>${content}</${range.tag}>`;
      });
    if (addLineBreaks && activeRanges.some((range) => range.tag === "strong" && range.end === end && end < paragraph.length)) {
      content += "<br>";
    }
    if (activeRanges.some((range) => range.lineBreakAfter && range.end === end)) {
      content += "<br>";
    }
    chunks.push(content);
  }

  return chunks.join("");
}

function renderHggspDocument(doc, index) {
  const bodyParagraphs = (doc.paragraphs || [])
    .map((paragraph, paragraphIndex) => {
      const content = hggspDocumentParagraphContent(doc, paragraph, paragraphIndex);
      const className = (doc.subheadingParagraphs || []).includes(paragraphIndex)
        ? ' class="hggsp-document-subheading"'
        : '';
      return (doc.italicParagraphs || []).includes(paragraphIndex)
        ? `<p${className}><em>${content}</em></p>`
        : `<p${className}>${content}</p>`;
    });
  const body = bodyParagraphs.join("");
  const image = doc.image
    ? `<img class="hggsp-document-image" src="${escapeHtml(doc.image)}" alt="${escapeHtml(doc.imageAlt || doc.title || `Document ${index + 1}`)}">`
    : "";
  const imageAfterParagraphs = Number.isInteger(doc.imageAfterParagraphs)
    ? Math.max(0, Math.min(doc.imageAfterParagraphs, bodyParagraphs.length))
    : null;
  const documentContent = imageAfterParagraphs === null
    ? `${image}${body}`
    : `${bodyParagraphs.slice(0, imageAfterParagraphs).join("")}${image}${bodyParagraphs.slice(imageAfterParagraphs).join("")}`;
  const source = (doc.source || [])
    .map((line) => `<p>${escapeHtml(line)}</p>`)
    .join("");
  const notes = (doc.notes || [])
    .map((line) => `<p>${escapeHtml(line)}</p>`)
    .join("");

  const documentClass = doc.plain ? "hggsp-document-block hggsp-document-plain" : "hggsp-document-block";
  const documentTitle = doc.title
    ? ` - ${doc.titleItalic ? `<em>${escapeHtml(doc.title)}</em>` : escapeHtml(doc.title)}`
    : "";
  return `
    <section class="${documentClass}">
      <h3>Document ${index + 1}${documentTitle}</h3>
      <div class="hggsp-document-content">
        ${documentContent}
      </div>
      ${notes ? `<div class="hggsp-document-notes"><strong>Notes</strong>${notes}</div>` : ""}
      ${source ? `<div class="hggsp-document-source">${source}</div>` : ""}
    </section>
  `;
}

function renderHggspDocuments(topic) {
  const documents = hggspDocumentsForTopic(topic);
  if (!documents.length) return "";
  const instruction = hggspInstructionForTopic(topic);
  const moveIconToInstruction = Boolean(instruction);
  const instructionIcon = moveIconToInstruction
    ? `<span class="hggsp-document-instruction-icon hggsp-paper-icon">${paperIconMarkup()}</span>`
    : "";
  return `
    <div class="hggsp-documents">
      ${instruction ? `<p class="hggsp-document-instruction">${instructionIcon}<span>${escapeHtml(instruction)}</span></p>` : ""}
      ${documents.map(renderHggspDocument).join("")}
    </div>
  `;
}

function hggspTopicMarkup(topic, sheetContext = null) {
  const title = cleanHggspTopicTitle(topic.title);
  const isDocumentStudy = hggspTopicPart(topic) === "hggsp-document-study";
  const moveIconToInstruction = isDocumentStudy && Boolean(hggspInstructionForTopic(topic));
  return `
    <article class="hggsp-topic-card">
      <div class="hggsp-topic-theme">${escapeHtml(topic.theme || "Thème à vérifier")}</div>
      <p class="hggsp-topic-title">
        ${moveIconToInstruction ? "" : `<span class="hggsp-topic-icon ${isDocumentStudy ? "hggsp-paper-icon" : "hggsp-pencil-icon"}">${isDocumentStudy ? paperIconMarkup() : pencilIconMarkup()}</span>`}
        <strong>${escapeHtml(title)}</strong>
        ${sheetContext ? sheetTopicButtonMarkup(sheetContext.exerciseId, sheetContext.chapter) : ""}
      </p>
      ${isDocumentStudy ? renderHggspDocuments(topic) : ""}
    </article>
  `;
}

function hggspTopicSheetContext(topic, ownerExerciseId) {
  const exerciseId = topic.dayId || ownerExerciseId;
  return {
    exerciseId,
    chapter: hggspTopicKey({ id: exerciseId }, topic, topic.topicIndex)
  };
}

function hggspTopicKey(exercise, topic, index) {
  return `__hggsp-topic::${topic.dayId || subjectIdentity(exercise)}::${topic.topicIndex ?? index}`;
}

function hggspTopicPart(topic) {
  return normalize(topic.type).includes("etude critique")
    ? "hggsp-document-study"
    : "hggsp-dissertation";
}

function hggspTopicsForTheme(exercise, theme = "") {
  const topics = exercise.classifiedSubjects || [];
  if (!theme) return topics;

  if (String(theme).startsWith("__hggsp-topic::")) {
    return topics.filter((topic, index) => hggspTopicKey(exercise, topic, index) === theme);
  }

  return topics.filter((topic) => topic.theme === theme);
}

function hggspTopicGroupTitle(topics) {
  const hasDissertation = topics.some((topic) => normalize(topic.type).includes("dissertation"));
  const hasDocumentStudy = topics.some((topic) => normalize(topic.type).includes("etude critique"));

  if (hasDissertation && hasDocumentStudy) return "Sujet sélectionné";
  if (hasDocumentStudy) return "Étude critique de documents";
  return "Dissertation";
}

function hggspChoiceNote(topics) {
  const documentStudies = topics.filter((topic) => normalize(topic.type).includes("etude critique"));
  return documentStudies.length > 1
    ? `<p class="hggsp-choice-note">Au choix : une étude critique de documents parmi les deux sujets proposés.</p>`
    : "";
}

function hggspTopicMarkdownLine(topic) {
  const title = cleanHggspTopicTitle(topic.title);
  const theme = topic.theme ? `\n\n_Thème du programme : ${topic.theme}_` : "";
  return `- **${title}**${theme}`;
}

function hggspTopicSheetMarkdownLine(topic) {
  const isDocumentStudy = hggspTopicPart(topic) === "hggsp-document-study";
  const icon = isDocumentStudy ? paperIconMarkup() : pencilIconMarkup();
  const iconClass = isDocumentStudy ? "hggsp-paper-icon" : "hggsp-pencil-icon";
  const exerciseLabel = isDocumentStudy ? "Étude critique de documents" : "Dissertation";
  const documents = isDocumentStudy
    ? htmlForMarkdown(renderHggspDocuments(topic)) || `<p class="empty-state">Documents non transcrits pour cet extrait.</p>`
    : "";
  return `<p class="sheet-topic-title" data-exercise-kind="${isDocumentStudy ? "document" : "dissertation"}"><span class="hggsp-topic-icon ${iconClass}">${icon}</span><strong>${escapeHtml(exerciseLabel)} :</strong> ${escapeHtml(cleanHggspTopicTitle(topic.title))}</p>\n\n${documents}`;
}

function hggspTopicsForExport(exercise, theme = "") {
  if (!exercise.days?.length) {
    return hggspTopicsForTheme(exercise, theme);
  }

  return exercise.days.flatMap((day) => {
    const dayTopics = (day.classifiedSubjects || []).map((topic, topicIndex) => ({
      ...topic,
      dayId: subjectIdentity(day),
      dayLabel: `Jour ${dayNumber(day)}`,
      topicIndex: topic.topicIndex ?? topicIndex
    }));
    return hggspTopicsForTheme({ ...day, classifiedSubjects: dayTopics }, theme);
  });
}

function buildHggspSheetMarkdown(exercise, theme = "") {
  const topics = hggspTopicsForExport(exercise, theme);
  const topicContent = topics.length
    ? topics.map(hggspTopicSheetMarkdownLine).join("\n\n")
    : "Aucun sujet isolé pour ce thème.";

  return `## ${hggspTopicGroupTitle(topics)}\n\n${topicContent}`;
}

function renderStructuredHggspDay(day, activeTheme = "", ownerExerciseId = "") {
  const dayTopics = (day.classifiedSubjects || []).map((topic, topicIndex) => ({
    ...topic,
    dayId: subjectIdentity(day),
    dayLabel: `Jour ${dayNumber(day)}`,
    topicIndex: topic.topicIndex ?? topicIndex
  }));
  const visibleTopics = hggspTopicsForTheme({ ...day, classifiedSubjects: dayTopics }, activeTheme);
  const dissertations = visibleTopics.filter((topic) => normalize(topic.type).includes("dissertation"));
  const documentStudies = visibleTopics.filter((topic) => normalize(topic.type).includes("etude critique"));
  const showDissertations = !activeTheme || dissertations.length;
  const showDocumentStudies = !activeTheme || documentStudies.length;
  const renderTopic = (topic) => hggspTopicMarkup(topic, hggspTopicSheetContext(topic, ownerExerciseId));

  if (activeTheme && !visibleTopics.length) return "";

  return `
    <section class="hggsp-day-block" id="jour-${escapeHtml(dayNumber(day))}">
      <header class="hggsp-day-header">
        <span>Jour ${dayNumber(day)}</span>
        <strong>${escapeHtml(day.title)}</strong>
      </header>

      ${showDissertations ? `<section class="hggsp-topic-section">
        <h2>Première partie - Dissertations <small>(10 points)</small></h2>
        <div class="hggsp-topic-list">
          ${dissertations.map(renderTopic).join("") || `<p class="empty-state">Aucune dissertation détectée pour ce sujet.</p>`}
        </div>
      </section>` : ""}

      ${showDocumentStudies ? `<section class="hggsp-topic-section">
        <h2>Deuxième partie - Étude critique de documents <small>(10 points)</small></h2>
        ${hggspChoiceNote(documentStudies)}
        <div class="hggsp-topic-list">
          ${documentStudies.map(renderTopic).join("") || `<p class="empty-state">Aucune étude critique détectée pour ce sujet.</p>`}
        </div>
      </section>` : ""}
    </section>
  `;
}

function renderStructuredHggspSubject(exercise, activeTheme = "") {
  if (exercise.days?.length) {
    const hasDay2 = exercise.days.some((day) => dayNumber(day) === 2);
    return `
      <section class="hggsp-structured">
        <div class="hggsp-clean-meta">
          <p class="hggsp-session-line">${escapeHtml(exercise.year || "")} - ${escapeHtml(exercise.session || "")} - ${escapeHtml(exercise.place || "")}</p>
          <p class="hggsp-code-line"><strong>Codes épreuve :</strong> <code>${escapeHtml(exercise.examCode || "")}</code></p>
        </div>

        <p class="cleaned-note"><strong>Sujet nettoyé.</strong> Des erreurs peuvent apparaître par rapport au sujet initial ; les PDF officiels restent la référence.</p>

        ${hasDay2 ? `<button class="hggsp-day-jump" type="button" data-jump-day="2">Aller au sujet du JOUR 2</button>` : ""}

        ${exercise.days.map((day) => renderStructuredHggspDay(day, activeTheme, exercise.id)).join("") || `<p class="empty-state">Aucun sujet ne correspond au thème sélectionné.</p>`}
      </section>
    `;
  }

  const topics = (exercise.classifiedSubjects || []).map((topic, topicIndex) => ({
    ...topic,
    dayId: topic.dayId || subjectIdentity(exercise),
    topicIndex: topic.topicIndex ?? topicIndex
  }));
  const visibleTopics = activeTheme
    ? hggspTopicsForTheme({ ...exercise, classifiedSubjects: topics }, activeTheme)
    : topics;
  const dissertations = visibleTopics.filter((topic) => normalize(topic.type).includes("dissertation"));
  const documentStudies = visibleTopics.filter((topic) => normalize(topic.type).includes("etude critique"));
  const showDissertations = !activeTheme || dissertations.length;
  const showDocumentStudies = !activeTheme || documentStudies.length;
  const renderTopic = (topic) => hggspTopicMarkup(topic, hggspTopicSheetContext(topic, exercise.id));

  return `
    <section class="hggsp-structured">
      <div class="hggsp-clean-meta">
        <p class="hggsp-session-line">${escapeHtml(exercise.year || "")} - ${escapeHtml(exercise.session || "")} - ${escapeHtml(exercise.place || "")}</p>
        <p class="hggsp-code-line"><strong>Code épreuve :</strong> <code>${escapeHtml(exercise.examCode || "")}</code></p>
      </div>

      <p class="cleaned-note"><strong>Sujet nettoyé.</strong> Des erreurs peuvent apparaître par rapport au sujet initial ; le PDF officiel reste la référence.</p>

      ${showDissertations ? `<section class="hggsp-topic-section">
        <h2>Première partie - Dissertations <small>(10 points)</small></h2>
        <div class="hggsp-topic-list">
          ${dissertations.map(renderTopic).join("") || `<p class="empty-state">Aucune dissertation détectée pour ce sujet.</p>`}
        </div>
      </section>` : ""}

      ${showDocumentStudies ? `<section class="hggsp-topic-section">
        <h2>Deuxième partie - Étude critique de documents <small>(10 points)</small></h2>
        ${hggspChoiceNote(documentStudies)}
        <div class="hggsp-topic-list">
          ${documentStudies.map(renderTopic).join("") || `<p class="empty-state">Aucune étude critique détectée pour ce sujet.</p>`}
        </div>
      </section>` : ""}
    </section>
  `;
}

function renderSubjectContent(exercise, markdown, activeTheme = "") {
  if (exercise.subject === "HGGSP" && (exercise.classifiedSubjects || []).length) {
    return renderStructuredHggspSubject(exercise, activeTheme);
  }

  return renderMarkdown(markdown);
}

function escapeXml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getYearColor(year) {
  return yearColors[year] || "#276d61";
}

function fileSlug(value) {
  return normalize(value)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90) || "sujet-hggsp";
}

function cleanMarkdownText(value) {
  return String(value || "")
    .replace(/<p class="cleaned-note"><strong>(.*?)<\/strong>\s*(.*?)<\/p>/g, "$1 $2")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/<[^>]+>/g, "")
    .trim();
}

function decodeHtmlEntities(value) {
  const entities = {
    amp: "&",
    apos: "'",
    gt: ">",
    lt: "<",
    nbsp: " ",
    quot: '"'
  };

  return String(value || "").replace(/&(?:amp|apos|gt|lt|nbsp|quot);|&#0*39;|&#x27;/gi, (entity) => {
    if (entity.startsWith("&#")) return "'";
    return entities[entity.slice(1, -1).toLowerCase()] || entity;
  });
}

function plainInlineText(value) {
  return String(value || "")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<sup>(.*?)<\/sup>/gi, "$1")
    .replace(/<[^>]+>/g, " ")
    .replace(/&(?:amp|apos|gt|lt|nbsp|quot);|&#0*39;|&#x27;/gi, (entity) => decodeHtmlEntities(entity))
    .replace(/\s+/g, " ")
    .trim();
}

function markdownImageRefs(markdown) {
  const refs = [];
  const pattern = /!\[([^\]]*)\]\(([^)]+)\)/g;
  let match = pattern.exec(markdown);

  while (match) {
    refs.push({ alt: match[1] || "Illustration", src: match[2] });
    match = pattern.exec(markdown);
  }

  const htmlPattern = /<img\b[^>]*>/gi;
  let htmlMatch = htmlPattern.exec(markdown);
  while (htmlMatch) {
    const ref = htmlImageRef(htmlMatch[0]);
    if (ref) refs.push(ref);
    htmlMatch = htmlPattern.exec(markdown);
  }

  return refs;
}

function htmlImageRef(value) {
  const tag = String(value || "").match(/<img\b[^>]*>/i)?.[0] || "";
  const src = tag.match(/\bsrc\s*=\s*["']([^"']+)["']/i)?.[1];
  if (!src) return null;
  const alt = tag.match(/\balt\s*=\s*["']([^"']*)["']/i)?.[1] || "Illustration";
  return { alt, src };
}

async function fetchLocalAsset(path) {
  const decodedPath = decodeHtmlEntities(path);
  const assetPath = resolveAssetPath(decodedPath);
  let fetchError;

  try {
    const response = await fetch(assetPath);
    if (!response.ok) throw new Error(`Asset introuvable : ${path}`);
    return {
      bytes: new Uint8Array(await response.arrayBuffer()),
      mime: response.headers.get("content-type") || "image/jpeg"
    };
  } catch (error) {
    fetchError = error;
  }

  try {
    for (const candidatePath of [...new Set([assetPath, decodedPath])]) {
      try {
        const xhrAsset = await fetchLocalAssetWithXhr(candidatePath);
        if (xhrAsset) return xhrAsset;
      } catch {
        // Certains navigateurs n'acceptent que le chemin relatif pour les fichiers locaux.
      }
    }
  } catch {
    // Le chargement par XHR peut être bloqué par le navigateur en file://.
  }

  for (const candidatePath of [...new Set([assetPath, decodedPath])]) {
    try {
      return await fetchLocalAssetFromImage(candidatePath);
    } catch {
      // On essaie le chemin suivant, puis l'image déjà rendue dans la page.
    }
  }

  try {
    return await fetchLocalAssetFromRenderedImage(decodedPath);
  } catch {
    try {
      return await fetchLocalAssetFromEmbeddedFile(decodedPath);
    } catch {
      throw fetchError || new Error(`Asset introuvable : ${path}`);
    }
  }
}

function resolveAssetPath(path) {
  const decodedPath = decodeHtmlEntities(path);
  if (/^(?:data:|blob:|https?:|file:)/i.test(decodedPath)) return decodedPath;
  try {
    return new URL(decodedPath, document.baseURI).href;
  } catch {
    return decodedPath;
  }
}

function fetchLocalAssetWithXhr(path) {
  return new Promise((resolve, reject) => {
    if (typeof XMLHttpRequest === "undefined") {
      reject(new Error("XMLHttpRequest indisponible"));
      return;
    }

    const request = new XMLHttpRequest();
    request.open("GET", path, true);
    request.responseType = "arraybuffer";
    request.onload = () => {
      if (request.status !== 0 && (request.status < 200 || request.status >= 300)) {
        reject(new Error(`Asset introuvable : ${path}`));
        return;
      }

      const mime = request.getResponseHeader("Content-Type")
        || (/\.png(?:\?|$)/i.test(path) ? "image/png" : "image/jpeg");
      resolve({ bytes: new Uint8Array(request.response), mime });
    };
    request.onerror = () => reject(new Error(`Lecture impossible : ${path}`));
    request.send();
  });
}

function fetchLocalAssetFromImage(path) {
  return new Promise((resolve, reject) => {
    if (typeof Image === "undefined" || typeof document === "undefined" || !document.createElement) {
      reject(new Error("Chargement d’image indisponible"));
      return;
    }

    const image = new Image();
    image.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = image.naturalWidth || image.width;
        canvas.height = image.naturalHeight || image.height;
        const context = canvas.getContext("2d");
        if (!context || !canvas.width || !canvas.height) {
          throw new Error(`Image vide : ${path}`);
        }

        context.drawImage(image, 0, 0);
        const base64 = canvas.toDataURL("image/png").split(",")[1] || "";
        const binary = atob(base64);
        const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
        resolve({ bytes, mime: "image/png" });
      } catch (error) {
        reject(error);
      }
    };
    image.onerror = () => reject(new Error(`Lecture impossible : ${path}`));
    image.src = path;
  });
}

function fetchLocalAssetFromRenderedImage(path) {
  return new Promise((resolve, reject) => {
    if (typeof document === "undefined") {
      reject(new Error("Document indisponible"));
      return;
    }

    const decodedPath = decodeHtmlEntities(path);
    const resolvedPath = resolveAssetPath(decodedPath);
    const withoutQuery = (value) => String(value || "").split(/[?#]/, 1)[0];
    const normalizedCandidates = new Set([
      decodedPath,
      resolvedPath,
      withoutQuery(decodedPath),
      withoutQuery(resolvedPath)
    ]);
    const image = [...document.images].find((candidate) => {
      const sources = [candidate.currentSrc, candidate.src, candidate.getAttribute("src")]
        .filter(Boolean)
        .flatMap((value) => [value, withoutQuery(value)]);
      return sources.some((source) => normalizedCandidates.has(source)
        || source.endsWith(`/${withoutQuery(decodedPath).replace(/^\.\//, "")}`));
    });

    if (!image) {
      reject(new Error(`Image affichée introuvable : ${path}`));
      return;
    }

    const readImage = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = image.naturalWidth || image.width;
        canvas.height = image.naturalHeight || image.height;
        const context = canvas.getContext("2d");
        if (!context || !canvas.width || !canvas.height) throw new Error(`Image vide : ${path}`);
        context.drawImage(image, 0, 0);
        const base64 = canvas.toDataURL("image/png").split(",")[1] || "";
        const binary = atob(base64);
        resolve({
          bytes: Uint8Array.from(binary, (character) => character.charCodeAt(0)),
          mime: "image/png"
        });
      } catch (error) {
        reject(error);
      }
    };

    if (image.complete && (image.naturalWidth || image.width)) {
      readImage();
    } else {
      image.addEventListener("load", readImage, { once: true });
      image.addEventListener("error", () => reject(new Error(`Lecture impossible : ${path}`)), { once: true });
    }
  });
}

const embeddedAssetLoads = new Map();

function embeddedAssetKey(path) {
  const decodedPath = decodeHtmlEntities(path);
  if (/^file:/i.test(decodedPath)) {
    try {
      const localPath = decodeURIComponent(new URL(decodedPath).pathname);
      const marker = localPath.indexOf("/assets/documents/");
      if (marker >= 0) return localPath.slice(marker + 1).split(/[?#]/, 1)[0];
    } catch {
      // Le chemin sera traité comme une référence relative ci-dessous.
    }
  }
  return decodedPath.replace(/^\.\//, "").split(/[?#]/, 1)[0];
}

function fetchLocalAssetFromEmbeddedFile(path) {
  return new Promise((resolve, reject) => {
    const key = embeddedAssetKey(path);
    const assets = window.__HGGSP_EMBEDDED_ASSETS__ || {};
    const readEmbeddedAsset = () => {
      const entry = (window.__HGGSP_EMBEDDED_ASSETS__ || {})[key];
      if (!entry?.base64) {
        reject(new Error(`Ressource embarquée introuvable : ${key}`));
        return;
      }
      try {
        const binary = atob(entry.base64);
        resolve({
          bytes: Uint8Array.from(binary, (character) => character.charCodeAt(0)),
          mime: entry.mime || "image/png"
        });
      } catch (error) {
        reject(error);
      }
    };

    if (assets[key]) {
      readEmbeddedAsset();
      return;
    }

    if (embeddedAssetLoads.has(key)) {
      embeddedAssetLoads.get(key).then(readEmbeddedAsset, reject);
      return;
    }

    const load = new Promise((loadResolve, loadReject) => {
      const script = document.createElement("script");
      script.src = resolveAssetPath(`${key}.export.js`);
      script.onload = () => loadResolve();
      script.onerror = () => loadReject(new Error(`Ressource embarquée introuvable : ${key}`));
      document.head.append(script);
    });
    embeddedAssetLoads.set(key, load);
    load.then(readEmbeddedAsset, reject);
  });
}

async function assetsFromMarkdown(markdown) {
  const refs = markdownImageRefs(markdown);
  const assets = [];

  for (const [index, ref] of refs.entries()) {
    if (/^https?:\/\//i.test(ref.src)) continue;
    try {
      const asset = await fetchLocalAsset(ref.src);
      const extension = asset.mime.includes("png") ? "png" : "jpg";
      assets.push({
        ...ref,
        ...asset,
        name: `image-${String(index + 1).padStart(2, "0")}.${extension}`
      });
    } catch {
      // L'export reste possible même si une image locale n'est plus disponible.
    }
  }

  return assets;
}

const crcTable = (() => {
  const table = [];
  for (let index = 0; index < 256; index += 1) {
    let code = index;
    for (let bit = 0; bit < 8; bit += 1) {
      code = code & 1 ? 0xedb88320 ^ (code >>> 1) : code >>> 1;
    }
    table[index] = code >>> 0;
  }
  return table;
})();

function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function bytesFromText(text) {
  return new TextEncoder().encode(text);
}

function concatBytes(chunks) {
  const total = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const output = new Uint8Array(total);
  let offset = 0;
  chunks.forEach((chunk) => {
    output.set(chunk, offset);
    offset += chunk.length;
  });
  return output;
}

function numberBytes(value, length) {
  const bytes = new Uint8Array(length);
  for (let index = 0; index < length; index += 1) {
    bytes[index] = (value >>> (index * 8)) & 0xff;
  }
  return bytes;
}

function zipDateParts(date = new Date()) {
  const time = (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2);
  const day = ((date.getFullYear() - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate();
  return { time, day };
}

function makeZip(files) {
  const localParts = [];
  const centralParts = [];
  let offset = 0;
  const { time, day } = zipDateParts();

  files.forEach((file) => {
    const name = bytesFromText(file.name);
    const content = file.bytes || bytesFromText(file.content || "");
    const crc = crc32(content);
    const localHeader = concatBytes([
      numberBytes(0x04034b50, 4),
      numberBytes(20, 2),
      numberBytes(0x0800, 2),
      numberBytes(0, 2),
      numberBytes(time, 2),
      numberBytes(day, 2),
      numberBytes(crc, 4),
      numberBytes(content.length, 4),
      numberBytes(content.length, 4),
      numberBytes(name.length, 2),
      numberBytes(0, 2),
      name
    ]);
    localParts.push(localHeader, content);
    centralParts.push(concatBytes([
      numberBytes(0x02014b50, 4),
      numberBytes(20, 2),
      numberBytes(20, 2),
      numberBytes(0x0800, 2),
      numberBytes(0, 2),
      numberBytes(time, 2),
      numberBytes(day, 2),
      numberBytes(crc, 4),
      numberBytes(content.length, 4),
      numberBytes(content.length, 4),
      numberBytes(name.length, 2),
      numberBytes(0, 2),
      numberBytes(0, 2),
      numberBytes(0, 2),
      numberBytes(0, 2),
      numberBytes(0, 4),
      numberBytes(offset, 4),
      name
    ]));
    offset += localHeader.length + content.length;
  });

  const central = concatBytes(centralParts);
  const end = concatBytes([
    numberBytes(0x06054b50, 4),
    numberBytes(0, 2),
    numberBytes(0, 2),
    numberBytes(files.length, 2),
    numberBytes(files.length, 2),
    numberBytes(central.length, 4),
    numberBytes(offset, 4),
    numberBytes(0, 2)
  ]);

  return concatBytes([...localParts, central, end]);
}

function downloadBytes(filename, mime, bytes) {
  const blob = new Blob([bytes], { type: mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function loadFavorites() {
  try {
    return JSON.parse(localStorage.getItem("hggspFavorites") || "[]");
  } catch {
    return [];
  }
}

function loadSheetSelections() {
  try {
    const stored = JSON.parse(localStorage.getItem("hggspSheetSelections") || "[]");
    return Array.isArray(stored) ? stored : [];
  } catch {
    return [];
  }
}

function loadTheme() {
  try {
    return localStorage.getItem("hggspTheme") || "light";
  } catch {
    return "light";
  }
}

function saveTheme(theme) {
  try {
    localStorage.setItem("hggspTheme", theme);
  } catch {
    // Le thème reste utilisable même si le stockage local est indisponible.
  }
}

function applyTheme(theme) {
  const isDark = theme === "dark";
  document.body.dataset.theme = isDark ? "dark" : "light";
  els.themeToggle?.setAttribute("aria-pressed", isDark ? "true" : "false");
  els.themeToggle?.setAttribute("aria-label", isDark ? "Activer le mode clair" : "Activer le mode sombre");
}

function applyStoredTheme() {
  applyTheme(loadTheme());
}

function syncStatsPlacement() {
  const statsBox = els.resultCount?.parentElement;
  if (!statsBox || !els.mobileStatsSlot || !els.topActions) {
    return;
  }

  if (mobileStatsMedia.matches) {
    els.mobileStatsSlot.append(statsBox);
  } else {
    els.topActions.append(statsBox);
  }
}

function toggleTheme() {
  const nextTheme = document.body.dataset.theme === "dark" ? "light" : "dark";
  applyTheme(nextTheme);
  saveTheme(nextTheme);
}

function openAbout() {
  els.aboutOverlay.hidden = false;
  els.aboutButton.setAttribute("aria-expanded", "true");
  els.aboutClose.focus();
}

function closeAbout() {
  els.aboutOverlay.hidden = true;
  els.aboutButton.setAttribute("aria-expanded", "false");
  els.aboutButton.focus();
}

function saveFavorites() {
  localStorage.setItem("hggspFavorites", JSON.stringify([...favorites]));
}

function saveSheetSelections() {
  localStorage.setItem("hggspSheetSelections", JSON.stringify(sheetSelections));
}

function isFavorite(exerciseId) {
  return favorites.has(exerciseId);
}

function toggleFavorite(exerciseId) {
  if (isFavorite(exerciseId)) {
    favorites.delete(exerciseId);
  } else {
    favorites.add(exerciseId);
  }

  saveFavorites();
  update();
}

function sheetSelectionKey(exerciseId, chapter = "") {
  return `${exerciseId}::${chapterParam(chapter)}`;
}

function findSheetSelectionIndex(exerciseId, chapter = "") {
  const key = sheetSelectionKey(exerciseId, chapter);
  return sheetSelections.findIndex((item) => item.key === key);
}

function isSheetSelected(exerciseId, chapter = "") {
  return findSheetSelectionIndex(exerciseId, chapter) >= 0;
}

function addSheetSelection(exerciseId, chapter = "") {
  if (isSheetSelected(exerciseId, chapter)) return;
  sheetSelections.push({
    key: sheetSelectionKey(exerciseId, chapter),
    exerciseId,
    chapter: chapterParam(chapter)
  });
  saveSheetSelections();
  renderSheetState();
  update();
}

function removeSheetSelection(exerciseId, chapter = "") {
  const index = findSheetSelectionIndex(exerciseId, chapter);
  if (index < 0) return;
  sheetSelections.splice(index, 1);
  saveSheetSelections();
  renderSheetState();
  update();
}

function toggleSheetSelection(exerciseId, chapter = "") {
  const scrollX = window.scrollX;
  const scrollY = window.scrollY;

  if (isSheetSelected(exerciseId, chapter)) {
    removeSheetSelection(exerciseId, chapter);
  } else {
    addSheetSelection(exerciseId, chapter);
  }

  window.scrollTo(scrollX, scrollY);
}

function moveSheetSelection(index, direction) {
  const target = index + direction;
  if (target < 0 || target >= sheetSelections.length) return;
  const [item] = sheetSelections.splice(index, 1);
  sheetSelections.splice(target, 0, item);
  saveSheetSelections();
  renderSheetState();
}

function clearSheetSelections() {
  sheetSelections.splice(0, sheetSelections.length);
  saveSheetSelections();
  renderSheetState();
  update();
}

function currentSheetLabel(exercise, chapter = "") {
  if (exercise.subject === "HGGSP" && chapter) {
    const topics = hggspTopicsForTheme(exercise, chapter);
    if (topics.length) {
      return topics.map((topic) => cleanHggspTopicTitle(topic.title)).join(" / ");
    }
  }

  return chapter ? accessLabel(exercise, chapter) : "Sujet complet";
}

function sheetItemTitle(entry, fallbackLabel = "") {
  if (entry?.part === "hggsp-dissertation") return "Dissertation";
  if (entry?.part === "hggsp-document-study") return "Étude critique de documents";
  if (entry?.part === "hggsp-mixed") return "Sujet sélectionné";
  if (entry?.part === "development") return "Développement construit";
  if (entry?.part === "repere") return "Repères";
  return fallbackLabel || "Sujet complet";
}

function sheetButtonMarkup(exercise, chapter = "") {
  const active = isSheetSelected(exercise.id, chapter);
  const label = chapter ? "Ajouter l'extrait à mon sujet" : "Ajouter le sujet à mon sujet";
  return `
    <button class="sheet-select-button" type="button" data-sheet-chapter="${escapeHtml(chapterParam(chapter))}" aria-pressed="${active ? "true" : "false"}">
      ${active ? "Retirer de mon sujet" : label}
    </button>
  `;
}

function sheetTopicButtonMarkup(exerciseId, chapter = "") {
  const active = isSheetSelected(exerciseId, chapter);
  const label = active ? "Retirer cet exercice de mon sujet" : "Ajouter cet exercice à mon sujet";
  return `
    <button class="sheet-topic-add-button" type="button" data-sheet-exercise-id="${escapeHtml(exerciseId)}" data-sheet-chapter="${escapeHtml(chapterParam(chapter))}" aria-pressed="${active ? "true" : "false"}" aria-label="${escapeHtml(label)}" title="${escapeHtml(label)}">${active ? "-" : "+"}</button>
  `;
}

function favoriteButtonMarkup(exercise) {
  const active = isFavorite(exercise.id);
  return `
    <button class="favorite-button" type="button" aria-pressed="${active ? "true" : "false"}" aria-label="${active ? "Retirer des favoris" : "Ajouter aux favoris"}">
      <span aria-hidden="true">${active ? "★" : "☆"}</span>
    </button>
  `;
}

function formatLabel(value) {
  const labels = {
    Geographie: "Géographie",
    Developpement: "Développement",
    "Developpement construit": "Développement construit",
    Reperes: "Repères",
    "Reperes historiques": "Repères histoire",
    "Reperes geographiques": "Repères géo",
    "Sujet - Jour 1": "Jour 1",
    "Sujet - Jour 2": "Jour 2",
    "Épreuves normales": "Épreuves normales",
    "Épreuves de remplacement": "Remplacement"
  };

  return labels[value] || value;
}

function getChapterPrefix(chapter) {
  const normalized = normalize(chapter);
  const codedPrefix = String(chapter || "").trim().match(/^(H|G|EMC)-\d+/i);

  if (codedPrefix) {
    return codedPrefix[1].toUpperCase();
  }

  if (
    normalized.includes("premiere guerre mondiale") ||
    normalized.includes("democraties fragilisees") ||
    normalized.includes("experiences totalitaires") ||
    normalized.includes("deuxieme guerre mondiale") ||
    normalized.includes("france defaite") ||
    normalized.includes("regime de vichy") ||
    normalized.includes("independances") ||
    normalized.includes("guerre froide") ||
    normalized.includes("projet europeen") ||
    normalized.includes("apres 1989") ||
    normalized.includes("refonder la republique") ||
    normalized.includes("ve republique") ||
    normalized.includes("societe des annees")
  ) {
    return "H";
  }

  if (
    normalized.includes("aires urbaines") ||
    normalized.includes("espaces productifs") ||
    normalized.includes("faible densite") ||
    normalized.includes("amenager") ||
    normalized.includes("territoires ultra") ||
    normalized.includes("union europeenne") ||
    normalized.includes("france et l'europe") ||
    normalized.includes("france et l’europe")
  ) {
    return "G";
  }

  if (
    normalized.startsWith("emc") ||
    normalized.includes("citoyennete") ||
    normalized.includes("democratie") ||
    normalized.includes("defense") ||
    normalized.includes("engagement") ||
    normalized.includes("harcelement") ||
    normalized.includes("valeurs") ||
    normalized.includes("droits") ||
    normalized.includes("libertes")
  ) {
    return "EMC";
  }

  return "H";
}

function formatOptionLabel(value, key) {
  if (key === "chapter" && value !== "Tous") {
    if (/^Thème\s+\d+\s*-/i.test(String(value))) {
      return value;
    }

    if (/^(H|G|EMC)-\d+\s*:/i.test(String(value))) {
      return value;
    }

    return `${getChapterPrefix(value)} - ${value}`;
  }

  return formatLabel(value);
}

function formatChapterChip(chapter) {
  return String(chapter)
    .replace(/^EMC\s*:\s*/i, "")
    .replace(/^(H|G|EMC)-\d+\s*:\s*/i, "");
}

function shortThemeLabel(label) {
  const value = String(label || "");
  const labels = {
    "Thème 1 - De nouveaux espaces de conquête": "Nouveaux espaces",
    "Thème 2 - Faire la guerre, faire la paix : formes de conflits et modes de résolution": "Guerre et paix",
    "Thème 3 - Histoire et mémoires": "Histoire et mémoires",
    "Thème 4 - Identifier, protéger et valoriser le patrimoine : enjeux géopolitiques": "Patrimoine",
    "Thème 5 - L'environnement, entre exploitation et protection : un enjeu planétaire": "Environnement",
    "Thème 6 - L'enjeu de la connaissance": "Connaissance"
  };
  return labels[value] || value;
}

function chapterTitle(chapter) {
  return formatChapterChip(chapter);
}

function chapterParam(chapter) {
  return String(chapter || "").trim();
}

function uniqueValues(key) {
  if (key === "chapter") {
    const available = new Set(exercises.flatMap((exercise) => exercise.chapters || [exercise.chapter]).filter(Boolean));
    return officialChapters.filter((chapter) => available.has(chapter));
  }

  const values = exercises.flatMap((exercise) => {
    if (key === "type") return exercise.types || [exercise.type];
    return [exercise[key]];
  });

  return [...new Set(values.filter(Boolean))].sort((a, b) => {
    if (key === "year") return b - a;
    if (key === "chapter") return compareChapters(a, b);
    return String(a).localeCompare(String(b), "fr");
  });
}

function compareChapters(a, b) {
  const order = { H: 0, G: 1, EMC: 2 };
  const prefixA = getChapterPrefix(a);
  const prefixB = getChapterPrefix(b);

  if (prefixA !== prefixB) {
    return order[prefixA] - order[prefixB];
  }

  const codeA = String(a).match(/^(?:H|G|EMC)-(\d+)/i);
  const codeB = String(b).match(/^(?:H|G|EMC)-(\d+)/i);

  if (codeA && codeB) {
    return Number(codeA[1]) - Number(codeB[1]);
  }

  return String(a).localeCompare(String(b), "fr");
}

function fillSelect(select, values, selectedValue, key) {
  select.innerHTML = "";
  ["Tous", ...values].forEach((value) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = formatOptionLabel(value, key);
    option.selected = String(value) === String(selectedValue);
    select.append(option);
  });
}

function buildFilters() {
  fillSelect(els.chapterSelect, uniqueValues("chapter"), state.chapter, "chapter");
  els.exerciseTypeSelect.value = state.exerciseType;
  fillSelect(els.yearSelect, uniqueValues("year"), state.year, "year");
  fillSelect(els.placeSelect, uniqueValues("place"), state.place, "place");
}

function getSearchTopicTerms(exercise) {
  const topics = [
    ...(exercise.classifiedSubjects || []),
    ...(exercise.days || []).flatMap((day) => day.classifiedSubjects || [])
  ];

  return topics.flatMap((topic) => [
    topic.title,
    topic.theme,
    topic.type,
    topic.themeId,
    ...(topic.themeMatches || [])
  ]);
}

function getSearchHaystack(exercise) {
  return normalize([
    exercise.title,
    exercise.subject,
    ...(exercise.subjects || []),
    exercise.chapter,
    exercise.type,
    ...(exercise.types || []),
    exercise.place,
    exercise.year,
    exercise.session,
    exercise.source,
    ...(exercise.keywords || []),
    ...(exercise.links || []).map((link) => `${link.label} ${link.url}`),
    exercise.indexedText,
    exercise.subjectMarkdown,
    exercise.correctionMarkdown,
    ...getSearchTopicTerms(exercise)
  ].join(" "));
}

function searchQueryMatches(haystack, query) {
  if (!query) return true;
  if (haystack.includes(query)) return true;

  return query
    .split(/\s+/)
    .filter(Boolean)
    .every((token) => haystack.includes(token));
}

function dayNumber(exercise) {
  return Number(String(exercise.type || exercise.title || "").match(/Jour\s+(\d+)/i)?.[1] || 0);
}

// The Eduscol exam code is display metadata only: some sessions reuse it.
function subjectIdentity(exercise) {
  if (exercise?.id) return String(exercise.id);
  return [
    exercise?.year,
    normalize(exercise?.place),
    normalize(exercise?.session),
    normalize(exercise?.type),
    normalize(exercise?.examCode)
  ].filter(Boolean).join("::");
}

function standaloneCardDayLabel(exercise) {
  const day = dayNumber(exercise);
  if (Number(exercise.year) === 2025 && exercise.place === "Amérique du Sud" && day) return `Jour ${day}`;
  if (Number(exercise.year) === 2023 && exercise.place === "Asie" && day === 1) return "Jour 1";
  if (Number(exercise.year) === 2023 && exercise.place === "Centres étrangers - Groupe 1" && day === 3) return "Jour 1";
  if (Number(exercise.year) === 2023 && exercise.place === "Centres étrangers - Groupe 1" && day === 4) return "Jour 2";
  return "";
}

function hideStandaloneCardTitle(exercise) {
  if (standaloneCardDayLabel(exercise)) return true;
  return [
    "2024 - Centres étrangers - Groupe 1 - Sujet",
    "2021 - Amérique du Nord - Sujet",
    "2021 - Asie - Sujet"
  ].includes(exercise.title);
}

function displayExerciseTitle(exercise) {
  return isReplacementSession(exercise) && !/épreuves de remplacement/i.test(exercise.title || "")
    ? `${exercise.title} - Épreuves de remplacement`
    : exercise.title;
}

function isPairableExamDay(exercise) {
  const day = dayNumber(exercise);
  return exercise.subject === "HGGSP" && (day === 1 || day === 2);
}

function uniqueFlat(values) {
  return [...new Set(values.flat().filter(Boolean))];
}

function groupSlug(value) {
  return normalize(value)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72) || "sujet";
}

function examDayGroupKey(exercise) {
  return `${exercise.year}||${exercise.place}||${exercise.session}`;
}

function examDayGroupId(exercise) {
  const sessionSlug = normalize(exercise.session).includes("remplacement") ? "-remplacement" : "";
  return `hggsp-${exercise.year}-${groupSlug(exercise.place)}${sessionSlug}`;
}

function examGroupTitle(exercise) {
  return `${exercise.year} - ${exercise.place}${isReplacementSession(exercise) ? " - Épreuves de remplacement" : ""}`;
}

function isReplacementSession(exercise) {
  const session = exercise.session || "";
  return /remplacement/i.test(session) && !/normales?\s*\/\s*.*remplacement/i.test(session);
}

function makeExamDayGroup(days) {
  const sortedDays = [...days].sort((a, b) => dayNumber(a) - dayNumber(b));
  const links = sortedDays.flatMap((day) => (day.links || []).map((link) => ({
    ...link,
    dayLabel: `Jour ${dayNumber(day)}`
  })));
  const classifiedSubjects = sortedDays.flatMap((day) => (day.classifiedSubjects || []).map((topic, topicIndex) => ({
    ...topic,
    dayId: subjectIdentity(day),
    dayLabel: `Jour ${dayNumber(day)}`,
    topicIndex
  })));

  return {
    ...sortedDays[0],
    id: examDayGroupId(sortedDays[0]),
    title: examGroupTitle(sortedDays[0]),
    type: "Sujet - Jour 1 et Jour 2",
    types: uniqueFlat(sortedDays.map((day) => day.types || [day.type])),
    chapters: uniqueFlat(sortedDays.map((day) => day.chapters || [day.chapter])),
    chapter: sortedDays[0].chapter,
    links,
    primaryPdf: "",
    examCode: sortedDays.map((day) => day.examCode).filter(Boolean).join(" / "),
    keywords: uniqueFlat(sortedDays.map((day) => day.keywords || [])),
    indexedText: sortedDays.map((day) => day.indexedText || "").join(" "),
    subjectMarkdown: sortedDays.map((day) => day.subjectMarkdown || "").join("\n\n"),
    classifiedSubjects,
    days: sortedDays
  };
}

function groupedExamDaySubjects(source = exercises) {
  const groups = new Map();
  const singles = [];

  source.forEach((exercise) => {
    if (!isPairableExamDay(exercise)) {
      singles.push(exercise);
      return;
    }

    const key = examDayGroupKey(exercise);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(exercise);
  });

  const output = [...singles];
  groups.forEach((days) => {
    const availableDays = new Set(days.map(dayNumber));
    if (availableDays.has(1) && availableDays.has(2)) {
      output.push(makeExamDayGroup(days));
    } else {
      output.push(...days);
    }
  });

  return output;
}

function findExerciseById(exerciseId) {
  return groupedExamDaySubjects(exercises).find((item) => item.id === exerciseId)
    || exercises.find((item) => item.id === exerciseId)
    || null;
}

function filteredExercises() {
  const query = normalize(state.query.trim());
  const source = groupedExamDaySubjects(exercises);

  const filtered = source.filter((exercise) => {
    const entries = accessEntries(exercise);
    const matchesChapter = state.chapter === "Tous" || entries.some((entry) => entry.chapter === state.chapter);
    const matchesExerciseType = state.exerciseType === "Tous" || entries.some((entry) => (
      entry.part === state.exerciseType
      && (state.chapter === "Tous" || entry.chapter === state.chapter)
    ));
    const matchesYear = state.year === "Tous" || String(exercise.year) === String(state.year);
    const matchesPlace = state.place === "Tous" || exercise.place === state.place;
    const matchesFavorite = !state.favoritesOnly || isFavorite(exercise.id);
    const matchesQuery = searchQueryMatches(getSearchHaystack(exercise), query);

    return matchesChapter && matchesExerciseType && matchesYear && matchesPlace && matchesFavorite && matchesQuery;
  });

  return filtered.sort((a, b) => {
    if (state.sort === "oldest") return a.year - b.year || a.title.localeCompare(b.title, "fr");
    if (state.sort === "subject") return a.subject.localeCompare(b.subject, "fr") || b.year - a.year;
    return b.year - a.year || a.title.localeCompare(b.title, "fr");
  });
}

function getRouteExerciseId() {
  const hash = window.location.hash.replace(/^#/, "");
  const params = new URLSearchParams(hash);
  return params.get("sujet");
}

function getRouteChapter() {
  const hash = window.location.hash.replace(/^#/, "");
  const params = new URLSearchParams(hash);
  return params.get("chapitre");
}

function openExercise(exerciseId, chapter = "") {
  const params = new URLSearchParams();
  params.set("sujet", exerciseId);
  if (chapterParam(chapter)) {
    params.set("chapitre", chapterParam(chapter));
  }
  window.location.hash = params.toString();
}

function showListPage() {
  els.listPage.hidden = false;
  els.detailPage.hidden = true;
  state.selectedId = null;
  state.selectedChapter = null;
  state.correctionVisible = false;
  document.title = "Les Archives HGGSP";
}

function showDetailPage(exercise, chapter = "") {
  els.listPage.hidden = true;
  els.detailPage.hidden = false;
  els.detailPage.style.setProperty("--year-color", getYearColor(exercise.year));
  state.selectedId = exercise.id;
  state.selectedChapter = chapterParam(chapter);
  document.title = `${state.selectedChapter ? `${accessLabel(exercise, state.selectedChapter)} - ` : ""}${displayExerciseTitle(exercise)} - Archives HGGSP`;
  renderViewer(exercise, state.selectedChapter);
  window.scrollTo({ top: 0, behavior: "instant" });
}

function applyRoute() {
  const exerciseId = getRouteExerciseId();
  const chapter = getRouteChapter();
  const exercise = findExerciseById(exerciseId);

  if (exerciseId && exercise && (!exercise.days || exercise.days.length)) {
    showDetailPage(exercise, chapter);
    return;
  }

  if (exerciseId && !exercise) {
    history.replaceState(null, "", window.location.pathname + window.location.search);
  }

  showListPage();
}

function renderList(items) {
  els.resultCount.textContent = `${items.length} sujet${items.length > 1 ? "s" : ""}`;
  els.exerciseList.innerHTML = "";

  if (!items.length) {
    els.exerciseList.innerHTML = `<div class="empty-state">${state.favoritesOnly ? "Aucun favori ne correspond aux filtres." : "Aucun sujet ne correspond aux filtres."}</div>`;
    return;
  }

  items.forEach((exercise) => {
    const entries = accessEntries(exercise);
    const dissertationEntries = entries.filter((entry) => entry.part === "hggsp-dissertation");
    const documentStudyEntries = entries.filter((entry) => entry.part === "hggsp-document-study");
    const otherEntries = entries.filter((entry) => entry.part !== "hggsp-dissertation" && entry.part !== "hggsp-document-study");
    const cardTagButton = (entry) => `<button class="tag chapter-tag tag-tone-${escapeHtml(accessEntryTone(entry))}" type="button" data-chapter="${escapeHtml(entry.key)}">${escapeHtml(listAccessLabel(entry.label))}</button>`;
    const cardTagsMarkup = exercise.subject === "HGGSP"
      ? `
        ${dissertationEntries.length ? `<div class="card-tag-section"><span class="card-tag-label">Dissertations</span><span class="tags tag-row tag-row-dissertations">${dissertationEntries.map(cardTagButton).join("")}</span></div>` : ""}
        ${documentStudyEntries.length ? `<div class="card-tag-section"><span class="card-tag-label">Études critiques de documents</span><span class="tags tag-row tag-row-documents">${documentStudyEntries.map(cardTagButton).join("")}</span></div>` : ""}
        ${otherEntries.length ? `<span class="tags tag-row">${otherEntries.map(cardTagButton).join("")}</span>` : ""}
      `
      : `<span class="tags">${entries.map(cardTagButton).join("")}</span>`;
    const cardDayLabel = standaloneCardDayLabel(exercise);
    const cardTitle = exercise.days?.length || hideStandaloneCardTitle(exercise) ? "" : displayExerciseTitle(exercise);
    const card = document.createElement("article");
    card.className = "exercise-card";
    card.dataset.id = exercise.id;
    card.dataset.subject = exercise.subject;
    card.dataset.year = exercise.year;
    card.style.setProperty("--year-color", getYearColor(exercise.year));
    card.innerHTML = `
      <div class="card-topline">
        <span class="card-meta-pills">
          <span class="year-ribbon">${escapeHtml(exercise.year)}</span>
          <button class="place-ribbon" type="button" disabled>${escapeHtml(exercise.place)}</button>
          ${cardDayLabel ? `<button class="day-ribbon" type="button" disabled>${escapeHtml(cardDayLabel)}</button>` : ""}
        </span>
        ${favoriteButtonMarkup(exercise)}
      </div>
      ${cardTitle ? `<span class="card-title">${escapeHtml(cardTitle)}</span>` : ""}
      <div class="card-tag-groups">${cardTagsMarkup}</div>
      <div class="card-actions">
        <button class="open-card-button" type="button">Ouvrir le sujet</button>
        ${exercise.primaryPdf ? `<a class="pdf-card-link" href="${escapeHtml(exercise.primaryPdf)}" target="_blank" rel="noopener" download>Télécharger le PDF</a>` : ""}
      </div>
    `;
    card.querySelector(".open-card-button").addEventListener("click", () => {
      state.correctionVisible = false;
      openExercise(exercise.id);
    });
    card.querySelectorAll(".chapter-tag").forEach((button) => {
      button.addEventListener("click", () => {
        state.correctionVisible = false;
        openExercise(exercise.id, button.dataset.chapter);
      });
    });
    card.querySelector(".favorite-button").addEventListener("click", () => {
      toggleFavorite(exercise.id);
    });
    els.exerciseList.append(card);
  });
}

function renderViewer(exercise, selectedChapter = "") {
  if (!exercise) {
    els.viewerMeta.textContent = "Selectionnez un sujet";
    els.viewerTitle.hidden = false;
    els.viewerTitle.textContent = "Sujet";
    els.subjectView.innerHTML = `<p class="empty-state">Modifiez les filtres ou la recherche pour afficher un sujet.</p>`;
    els.correctionPanel.hidden = true;
    els.toggleCorrection.hidden = true;
    return;
  }

  const chapter = chapterParam(selectedChapter);
  const isGroupedHggsp = exercise.subject === "HGGSP" && Boolean(exercise.days?.length);
  const markdown = exercise.subject === "HGGSP" ? exercise.subjectMarkdown : (chapter ? buildChapterMarkdown(exercise, chapter) : exercise.subjectMarkdown);
  const exportMarkdown = exercise.subject === "HGGSP" && (exercise.classifiedSubjects?.length || exercise.days?.length)
    ? buildHggspSheetMarkdown(exercise, chapter)
    : markdown;
  els.viewerMeta.innerHTML = `${isGroupedHggsp ? "" : `<span class="viewer-year">${escapeHtml(exercise.year)}</span> `}${escapeHtml(exercise.subject)} · ${escapeHtml(exercise.place)} · ${chapter ? escapeHtml(accessLabel(exercise, chapter)) : escapeHtml(exercise.type)}`;
  els.viewerTitle.hidden = isGroupedHggsp;
  els.viewerTitle.textContent = exercise.title;
  els.subjectView.innerHTML = renderThemeActions(exercise, chapter) + renderQuickAccess(exercise, chapter) + renderSubjectContent(exercise, markdown, chapter) + renderLinks(exercise);
  const detailFavorite = els.subjectView.querySelector(".detail-favorite .favorite-button");
  if (detailFavorite) {
    detailFavorite.addEventListener("click", () => toggleFavorite(exercise.id));
  }
  els.subjectView.querySelectorAll(".detail-chapter-button").forEach((button) => {
    button.addEventListener("click", () => {
      state.correctionVisible = false;
      openExercise(exercise.id, button.dataset.chapter);
    });
  });
  const fullSubjectButton = els.subjectView.querySelector(".full-subject-button");
  if (fullSubjectButton) {
    fullSubjectButton.addEventListener("click", () => {
      state.correctionVisible = false;
      openExercise(exercise.id);
    });
  }
  els.subjectView.querySelectorAll(".export-option").forEach((button) => {
    button.addEventListener("click", async () => {
      button.disabled = true;
      try {
        await exportSubject(exercise, chapter, exportMarkdown, button.dataset.exportFormat);
      } finally {
        button.disabled = false;
      }
    });
  });
  els.subjectView.querySelectorAll(".sheet-select-button, .sheet-topic-add-button").forEach((button) => {
    button.addEventListener("click", () => toggleSheetSelection(button.dataset.sheetExerciseId || exercise.id, button.dataset.sheetChapter || chapter));
  });
  els.subjectView.querySelectorAll("[data-jump-day]").forEach((button) => {
    button.addEventListener("click", () => {
      const target = els.subjectView.querySelector(`#jour-${button.dataset.jumpDay}`);
      target?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });

  const hasCorrection = Boolean((exercise.correctionMarkdown || "").trim());
  els.toggleCorrection.hidden = !hasCorrection;
  els.correctionPanel.hidden = !hasCorrection || !state.correctionVisible;
  els.toggleCorrection.textContent = state.correctionVisible ? "Masquer la correction" : "Afficher la correction";
  els.correctionView.innerHTML = hasCorrection ? renderMarkdown(exercise.correctionMarkdown) : "";
}

function markdownTitle(markdown) {
  const match = String(markdown || "").match(/^#\s+(.+)$/m);
  return match ? match[1].trim() : "";
}

function markdownExamCode(markdown) {
  const match = String(markdown || "").match(/\*\*Code épreuve :\*\*\s*`([^`]+)`/);
  return match ? match[1].trim() : "";
}

function exerciseSections(markdown) {
  const lines = String(markdown || "").split("\n");
  const sections = [];
  let current = null;

  lines.forEach((line) => {
    if (/^##\s+Exercice\s+\d+/i.test(line)) {
      if (current) sections.push(current);
      current = { heading: line, lines: [line] };
      return;
    }

    if (current) current.lines.push(line);
  });

  if (current) sections.push(current);

  return sections.filter((section) => {
    const body = section.lines.join("\n");
    return /(^|\n)###\s+|(^|\n)\*\*Document|(^|\n)\*\*Questions\*\*/i.test(body) || body.length > 500;
  });
}

function sectionMatchesChapter(section, chapter) {
  const normalizedChapter = normalize(chapterTitle(chapter));
  const normalizedBody = normalize(section.lines.join("\n"));
  const prefix = getChapterPrefix(chapter);

  if (normalizedChapter && normalizedBody.includes(normalizedChapter)) {
    return true;
  }

  if (prefix === "H") return normalizedBody.includes("histoire");
  if (prefix === "G") return normalizedBody.includes("geographie");
  if (prefix === "EMC") return /enseignement moral et civique|situation pratique|emc|harcelement/.test(normalizedBody);

  return false;
}

function buildChapterMarkdown(exercise, chapter) {
  const customEntry = accessEntry(exercise, chapter);
  if (customEntry && chapter.startsWith("__")) {
    return buildCustomAccessMarkdown(exercise, customEntry);
  }

  return buildStandardChapterMarkdown(exercise, chapter, customEntry?.label || chapterTitle(chapter));
}

function buildStandardChapterMarkdown(exercise, chapter, label = chapterTitle(chapter), options = {}) {
  const title = markdownTitle(exercise.subjectMarkdown) || exercise.title;
  const code = markdownExamCode(exercise.subjectMarkdown) || exercise.examCode || "";
  const sections = exerciseSections(exercise.subjectMarkdown);
  const prefix = getChapterPrefix(chapter);
  const forcedSection = options.exerciseNumber
    ? findExerciseSection(sections, options.exerciseNumber)
    : null;
  const matchingSections = forcedSection
    ? [forcedSection]
    : sections.filter((item) => sectionMatchesChapter(item, chapter));
  const section = prefix === "EMC" && !forcedSection
    ? matchingSections.find((item) => /exercice\s+3/i.test(item.heading)) || matchingSections[0]
    : matchingSections[0];
  const codeLine = code ? `**Code épreuve :** \`${code}\`\n\n` : "";

  if (!section) {
    return `# ${title}\n\n${codeLine}## Extrait : ${label}\n\nCette partie du sujet n'a pas pu être isolée automatiquement. Utilisez le bouton « Accéder au sujet dans son intégralité » pour consulter le sujet complet.`;
  }

  return `# ${title}\n\n${codeLine}## Extrait : ${label}\n\n${trimSectionForChapter(section.lines, chapter).join("\n").trim()}`;
}

function findExerciseSection(sections, exerciseNumber) {
  return sections.find((section) => new RegExp(`^##\\s+Exercice\\s+${exerciseNumber}\\b`, "i").test(section.heading));
}

function splitExercisePartLines(lines, part) {
  const markerIndex = lines.findIndex((line, index) => index > 0 && (
    /<p class="exercise-part-title[^"]*"><span>2<\/span>/i.test(line)
    || /^\s*2\.\s+(Comprendre et pratiquer|Sur le planisphere|Sur le planisphère|Sur l'annexe|Sur le tableau|Sur la frise|Rep[eè]res)/i.test(line.trim())
  ));

  if (markerIndex < 0) return lines;
  if (part === "development") return lines.slice(0, markerIndex);

  if (part === "repere") {
    const intro = lines.slice(0, markerIndex).filter((line) => /^##\s+Exercice/i.test(line) || /^###\s+/i.test(line) || !line.trim());
    return [...intro, ...(!intro[intro.length - 1]?.trim() ? [] : [""]), ...lines.slice(markerIndex)];
  }

  return lines;
}

function buildCustomAccessMarkdown(exercise, entry) {
  if (entry.chapter) {
    return buildStandardChapterMarkdown(exercise, entry.chapter, entry.label, {
      exerciseNumber: entry.exerciseNumber || inferredCustomChapterExerciseNumber(entry)
    });
  }

  const title = markdownTitle(exercise.subjectMarkdown) || exercise.title;
  const code = markdownExamCode(exercise.subjectMarkdown) || exercise.examCode || "";
  const codeLine = code ? `**Code épreuve :** \`${code}\`\n\n` : "";
  const section = findExerciseSection(exerciseSections(exercise.subjectMarkdown), entry.exerciseNumber);

  if (!section) {
    return `# ${title}\n\n${codeLine}## Extrait : ${entry.label}\n\nCette partie du sujet n'a pas pu être isolée automatiquement. Utilisez le bouton « Accéder au sujet dans son intégralité » pour consulter le sujet complet.`;
  }

  return `# ${title}\n\n${codeLine}## Extrait : ${entry.label}\n\n${splitExercisePartLines(section.lines, entry.part).join("\n").trim()}`;
}

function inferredCustomChapterExerciseNumber(entry) {
  const prefix = getChapterPrefix(entry.chapter);
  const marker = normalize(`${entry.key || ""} ${entry.label || ""}`);

  if (prefix === "EMC" || marker.includes("emc")) return 3;
  return 1;
}

function stripMarkdownFrontMatter(markdown) {
  const lines = String(markdown || "").split("\n");
  const output = [...lines];

  while (output.length && !output[0].trim()) output.shift();
  if (output[0]?.startsWith("# ")) output.shift();
  while (output.length && !output[0].trim()) output.shift();
  if (/^\*\*Code épreuve :\*\*/.test(output[0] || "")) {
    output.shift();
    while (output.length && !output[0].trim()) output.shift();
  }
  if (/^<p class="cleaned-note">/.test(output[0] || "")) {
    output.shift();
    while (output.length && !output[0].trim()) output.shift();
  }
  if (/^##\s+Extrait\s*:/i.test(output[0] || "")) {
    output.shift();
    while (output.length && !output[0].trim()) output.shift();
  }

  return output.join("\n").trim();
}

function sheetSourceExercise(item) {
  const dayId = item.entry?.topic?.dayId;
  return (dayId && item.exercise.days?.find((day) => day.id === dayId)) || item.exercise;
}

function sheetItemSourceMarkdown(item) {
  const sourceExercise = sheetSourceExercise(item);
  const datePlace = [sourceExercise.year, sourceExercise.place].filter(Boolean).join(" - ");
  const code = markdownExamCode(sourceExercise.subjectMarkdown) || sourceExercise.examCode || "";
  const theme = item.entry?.chapter || item.label || "";
  const parts = [
    datePlace ? escapeHtml(datePlace) : "",
    code ? `Code épreuve : <code>${escapeHtml(code)}</code>` : "",
    theme ? escapeHtml(theme) : ""
  ].filter(Boolean);

  return `<p class="sheet-source-note"><strong>Source :</strong> ${parts.join(" - ")}</p>`;
}

function markdownWithSheetSource(markdown, sourceLine) {
  const lines = stripMarkdownFrontMatter(markdown).split("\n");
  const titleIndex = lines.findIndex((line) => /^##\s+/.test(line.trim()));

  if (titleIndex < 0) {
    return `${sourceLine}\n\n${lines.join("\n").trim()}`;
  }

  const output = [...lines];
  output.splice(titleIndex + 1, 0, "", sourceLine);
  return output.join("\n").trim();
}

function sheetSelectionItems() {
  return sheetSelections
    .map((selection) => {
      const exercise = findExerciseById(selection.exerciseId);
      if (!exercise) return null;
      const chapter = chapterParam(selection.chapter);
      const entry = chapter ? accessEntry(exercise, chapter) : null;
      const markdown = exercise.subject === "HGGSP" && chapter
        ? buildHggspSheetMarkdown(exercise, chapter)
        : chapter
          ? buildChapterMarkdown(exercise, chapter)
          : exercise.subjectMarkdown;
      const label = currentSheetLabel(exercise, chapter);
      return {
        ...selection,
        exercise,
        chapter,
        entry,
        label,
        sheetTitle: sheetItemTitle(entry, label),
        markdown
      };
    })
    .filter(Boolean);
}

function sheetCompiledMarkdown() {
  const items = sheetSelectionItems();
  const intro = '<p class="cleaned-note"><strong>Sujet personnalisé.</strong> Sélection préparée pour l\'impression et la distribution en classe à partir des sujets officiels. Des erreurs peuvent apparaître par rapport au sujet initial ; le PDF officiel reste la référence.</p>';

  if (!items.length) {
    return `# Mon sujet personnalisé\n\n${intro}\n\nAjoutez des sujets ou des extraits pour composer un entraînement à distribuer à vos élèves.`;
  }

  const sections = items.map((item) => markdownWithSheetSource(item.markdown, sheetItemSourceMarkdown(item)));

  return `# Mon sujet personnalisé\n\n${intro}\n\n${sections.join("\n\n")}`;
}

function sheetVirtualExercise() {
  return {
    id: "sheet-personnalisee",
    title: "Mon sujet personnalisé",
    year: new Date().getFullYear(),
    subject: "HGGSP",
    place: "Sélection personnelle",
    type: "Sujet",
    subjectMarkdown: sheetCompiledMarkdown(),
    correctionMarkdown: "",
    links: [],
    primaryPdf: "",
    examCode: ""
  };
}

function openSheet() {
  renderSheetState();
  els.sheetOverlay.hidden = false;
  els.sheetButton.setAttribute("aria-expanded", "true");
  els.sheetClose.focus();
}

function closeSheet() {
  els.sheetOverlay.hidden = true;
  els.sheetButton.setAttribute("aria-expanded", "false");
  els.sheetButton.focus();
}

function renderSheetState() {
  const items = sheetSelectionItems();
  if (els.sheetCount) els.sheetCount.textContent = String(items.length);
  if (els.sheetMeta) {
    els.sheetMeta.textContent = items.length
      ? `${items.length} élément${items.length > 1 ? "s" : ""} dans mon sujet`
      : "Ajoutez des sujets ou des extraits pour composer un entraînement à distribuer.";
  }
  if (els.sheetSelection) {
    if (!items.length) {
      els.sheetSelection.innerHTML = `<p class="empty-state">Aucune sélection pour le moment.</p>`;
    } else {
      els.sheetSelection.innerHTML = items.map((item, index) => `
        <article class="sheet-item">
          <div class="sheet-item-main">
            <strong>${escapeHtml(item.sheetTitle)}</strong>
            <span class="sheet-item-topic">${escapeHtml(item.label)}</span>
            <span>${escapeHtml(item.exercise.title)}</span>
          </div>
          <div class="sheet-item-actions">
            <button class="sheet-move-button" type="button" data-sheet-move="${index}" data-sheet-direction="-1" aria-label="Monter">↑</button>
            <button class="sheet-move-button" type="button" data-sheet-move="${index}" data-sheet-direction="1" aria-label="Descendre">↓</button>
            <button class="sheet-remove-button" type="button" data-sheet-remove="${escapeHtml(item.key)}">Retirer</button>
          </div>
        </article>
      `).join("");

      els.sheetSelection.querySelectorAll("[data-sheet-move]").forEach((button) => {
        button.addEventListener("click", () => moveSheetSelection(Number(button.dataset.sheetMove), Number(button.dataset.sheetDirection)));
      });
      els.sheetSelection.querySelectorAll("[data-sheet-remove]").forEach((button) => {
        button.addEventListener("click", () => {
          const item = items.find((entry) => entry.key === button.dataset.sheetRemove);
          if (item) removeSheetSelection(item.exercise.id, item.chapter);
        });
      });
    }
  }

  if (els.sheetPreview) {
    els.sheetPreview.innerHTML = renderMarkdown(sheetCompiledMarkdown());
  }
}

function trimSectionForChapter(lines, chapter) {
  const prefix = getChapterPrefix(chapter);
  const markerByPrefix = {
    H: /^(###\s*)?histoire\s*[:\-–—]/i,
    G: /^(###\s*)?(geographie|géographie)\s*[:\-–—]/i,
    EMC: /^(###\s*)?(situation pratique|emc|enseignement moral et civique)/i
  };
  const marker = markerByPrefix[prefix];
  if (!marker) return lines;

  const start = lines.findIndex((line) => marker.test(line.trim()));
  if (start <= 0) return lines;

  let end = lines.length;
  for (let index = start + 1; index < lines.length; index += 1) {
    const current = lines[index].trim();
    if (/^##\s+Exercice\s+\d+/i.test(current)) {
      end = index;
      break;
    }
    if (/^###\s+(histoire|geographie|géographie|situation pratique|emc|enseignement moral et civique)/i.test(current)) {
      end = index;
      break;
    }
  }

  return lines.slice(start, end);
}

function exportFileBase(exercise, chapter = "") {
  return fileSlug(`${exercise.title}${chapter ? `-${chapterTitle(chapter)}` : "-sujet-integral"}`);
}

function markdownWithExportAssets(markdown, assets) {
  let output = markdown;
  assets.forEach((asset) => {
    output = output.replaceAll(`](${asset.src})`, `](assets/${asset.name})`);
    output = output.replaceAll(`src="${asset.src}"`, `src="assets/${asset.name}"`);
    output = output.replaceAll(`src='${asset.src}'`, `src='assets/${asset.name}'`);
  });
  return output;
}

async function exportMarkdownZip(exercise, chapter, markdown) {
  const base = exportFileBase(exercise, chapter);
  const assets = await assetsFromMarkdown(markdown);
  const md = markdownWithExportAssets(markdown, assets);
  const files = [
    { name: `${base}.md`, content: md },
    ...assets.map((asset) => ({ name: `assets/${asset.name}`, bytes: asset.bytes }))
  ];
  downloadBytes(`${base}-markdown.zip`, "application/zip", makeZip(files));
}

function markdownBlocks(markdown) {
  const blocks = [];
  const lines = String(markdown || "").split("\n");

  lines.forEach((line) => {
    const raw = line.trim();
    const text = plainInlineText(raw);
    const image = raw.match(/!\[([^\]]*)\]\(([^)]+)\)/);
    const htmlImage = image ? null : htmlImageRef(raw);
    const exerciseTitle = raw.match(/^<p class="exercise-part-title([^"]*)"><span>(.*?)<\/span>([\s\S]*?)<\/p>$/i);
    const cleanedNote = raw.match(/^<p class="cleaned-note">([\s\S]*?)<\/p>$/i);
    const documentLabel = raw.match(/^\*\*((?:Document|Documents)\s+[^*]+)\*\*$/);
    const hggspTopicTitle = raw.match(/^<p class="sheet-topic-title" data-exercise-kind="(dissertation|document)">([\s\S]*?)<\/p>$/i);
    const hggspDocumentInstruction = raw.match(/^<p class="hggsp-document-instruction">([\s\S]*?)<\/p>$/i);
    const htmlHeading = raw.match(/^<h([1-6])>([\s\S]*?)<\/h\1>$/i);

    if (hggspTopicTitle) {
      blocks.push({ type: "hggspTopicTitle", kind: hggspTopicTitle[1].toLowerCase(), text: plainInlineText(hggspTopicTitle[2]) });
    } else if (hggspDocumentInstruction) {
      blocks.push({ type: "hggspInstruction", text: plainInlineText(hggspDocumentInstruction[1]) });
    } else if (image || htmlImage) {
      const imageRef = image
        ? { alt: image[1] || "Illustration", src: image[2] }
        : htmlImage;
      blocks.push({ type: "image", ...imageRef });
    } else if (exerciseTitle) {
      const classes = exerciseTitle[1] || "";
      blocks.push({ type: /\bquestion-title\b/i.test(classes) ? "questionTitle" : "exerciseTitle", text: plainInlineText(exerciseTitle[3]) });
    } else if (cleanedNote) {
      blocks.push({ type: "cleanedNote", text: plainInlineText(cleanedNote[1]) });
    } else if (documentLabel) {
      blocks.push({ type: "documentLabel", text: plainInlineText(documentLabel[1]) });
    } else if (htmlHeading) {
      const headingText = plainInlineText(htmlHeading[2]);
      blocks.push({
        type: /^Document\s+\d+\b/i.test(headingText) ? "documentTitle" : `h${htmlHeading[1]}`,
        text: headingText
      });
    } else if (/^###\s+/.test(raw)) {
      blocks.push({ type: "h3", text: text.replace(/^###\s+/, "") });
    } else if (/^##\s+/.test(raw)) {
      blocks.push({ type: "h2", text: text.replace(/^##\s+/, "") });
    } else if (/^#\s+/.test(raw)) {
      blocks.push({ type: "h1", text: text.replace(/^#\s+/, "") });
    } else if (/^>\s+/.test(raw)) {
      blocks.push({ type: "quote", text: text.replace(/^>\s+/, "") });
    } else if (/^[-•]\s+/.test(raw)) {
      blocks.push({ type: "bullet", text: text.replace(/^[-•]\s+/, "") });
    } else if (/^\d+\.\s+/.test(raw)) {
      blocks.push({ type: "number", text });
    } else if (text) {
      blocks.push({ type: "p", text });
    }
  });

  return blocks;
}

function blocksWithOfficeBreaks(blocks) {
  let exerciseCount = 0;
  const spacedBlocks = [];

  blocks.forEach((block, index) => {
    if (block.type === "h2" && /^Exercice\b/i.test(block.text)) {
      exerciseCount += 1;
      if (exerciseCount > 1) {
        spacedBlocks.push({ type: "blank" }, { type: "blank" });
      }
    }

    spacedBlocks.push(block);

    if (block.type === "h2" && /^Exercice\b/i.test(block.text) && blocks[index + 1]) {
      spacedBlocks.push({ type: "blank" });
    }

    if (block.type === "h3" && blocks[index + 1]) {
      spacedBlocks.push({ type: "blank" });
    }

    if (/\bSource\s*:/i.test(block.text || "") && ["documentLabel", "exerciseTitle", "questionTitle"].includes(blocks[index + 1]?.type)) {
      spacedBlocks.push({ type: "blank" });
    }
  });

  return spacedBlocks;
}

function docxParagraph(text, style = "Normal", options = {}) {
  const styleXml = style ? `<w:pPr><w:pStyle w:val="${style}"/></w:pPr>` : "";
  const runProperties = options.bold ? "<w:rPr><w:b/></w:rPr>" : "";
  return `<w:p>${styleXml}<w:r>${runProperties}<w:t xml:space="preserve">${escapeXml(text)}</w:t></w:r></w:p>`;
}

function docxImage(asset, relationshipId) {
  return `
    <w:p>
      <w:pPr>
        <w:jc w:val="center"/>
        <w:spacing w:before="40" w:after="90"/>
        <w:keepNext/>
      </w:pPr>
      <w:r>
        <w:drawing>
          <wp:inline distT="0" distB="0" distL="0" distR="0" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing">
            <wp:extent cx="4860000" cy="3060000"/>
            <wp:docPr id="${relationshipId.replace("rId", "")}" name="${escapeXml(asset.alt)}"/>
            <a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
              <a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">
                <pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">
                  <pic:nvPicPr><pic:cNvPr id="0" name="${escapeXml(asset.name)}"/><pic:cNvPicPr/></pic:nvPicPr>
                  <pic:blipFill><a:blip r:embed="${relationshipId}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill>
                  <pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="4860000" cy="3060000"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr>
                </pic:pic>
              </a:graphicData>
            </a:graphic>
          </wp:inline>
        </w:drawing>
      </w:r>
    </w:p>
  `;
}

async function exportDocx(exercise, chapter, markdown) {
  const base = exportFileBase(exercise, chapter);
  const assets = await assetsFromMarkdown(markdown);
  const assetBySrc = new Map(assets.map((asset, index) => [asset.src, { ...asset, relationshipId: `rId${index + 2}` }]));
  const body = blocksWithOfficeBreaks(markdownBlocks(markdown)).map((block) => {
    if (block.type === "blank") return docxParagraph("");
    if (block.type === "hggspTopicTitle") {
      return docxParagraph(block.text, block.kind === "document" ? "QuestionTitle" : "ExerciseTitle", { bold: true });
    }
    if (block.type === "hggspInstruction") return docxParagraph(block.text, "DocumentLabel", { bold: true });
    if (block.type === "image") {
      const asset = assetBySrc.get(block.src);
      return asset ? docxImage(asset, asset.relationshipId) : docxParagraph(block.alt, "Quote");
    }
    if (block.type === "documentTitle") return docxParagraph(block.text, "Heading3", { bold: true });
    if (block.type === "h1") return docxParagraph(block.text, "Heading1");
    if (block.type === "h2") return docxParagraph(block.text, "Heading2");
    if (block.type === "h3") return docxParagraph(block.text, "Heading3");
    if (block.type === "exerciseTitle") return docxParagraph(block.text, "ExerciseTitle", { bold: true });
    if (block.type === "questionTitle") return docxParagraph(block.text, "QuestionTitle", { bold: true });
    if (block.type === "documentLabel") return docxParagraph(block.text, "DocumentLabel", { bold: true });
    if (block.type === "cleanedNote") return docxParagraph(block.text, "CleanNote");
    if (block.type === "quote") return docxParagraph(block.text, "Quote");
    if (block.type === "bullet") return docxParagraph(block.text, "BulletList");
    if (block.type === "number") return docxParagraph(block.text, "NumberList");
    return docxParagraph(block.text);
  }).join("");
  const relationships = [
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>',
    ...assets.map((asset) => `<Relationship Id="${assetBySrc.get(asset.src).relationshipId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/${asset.name}"/>`)
  ].join("");
  const files = [
    { name: "[Content_Types].xml", content: `<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="jpg" ContentType="image/jpeg"/><Default Extension="png" ContentType="image/png"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/></Types>` },
    { name: "_rels/.rels", content: `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>` },
    { name: "word/_rels/document.xml.rels", content: `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${relationships}</Relationships>` },
    { name: "word/styles.xml", content: `<?xml version="1.0" encoding="UTF-8"?><w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Aptos" w:hAnsi="Aptos"/><w:sz w:val="21"/><w:lang w:val="fr-FR"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="45" w:line="252" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/><w:rPr><w:sz w:val="21"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:keepNext/><w:keepLines/><w:spacing w:before="0" w:after="110"/></w:pPr><w:rPr><w:b/><w:color w:val="1F4E46"/><w:sz w:val="28"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="heading 2"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:keepNext/><w:keepLines/><w:spacing w:before="120" w:after="65"/></w:pPr><w:rPr><w:b/><w:color w:val="1F4E46"/><w:sz w:val="24"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="Heading3"><w:name w:val="heading 3"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:keepNext/><w:keepLines/><w:spacing w:before="90" w:after="50"/><w:ind w:left="120"/><w:shd w:val="clear" w:color="auto" w:fill="EEF4F7"/></w:pPr><w:rPr><w:b/><w:color w:val="315F9E"/><w:sz w:val="22"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="ExerciseTitle"><w:name w:val="Exercise Title"/><w:basedOn w:val="Normal"/><w:qFormat/><w:pPr><w:keepNext/><w:keepLines/><w:spacing w:before="90" w:after="45"/><w:ind w:left="120"/><w:shd w:val="clear" w:color="auto" w:fill="F3F5F6"/><w:pBdr><w:left w:val="single" w:sz="16" w:space="0" w:color="315F9E"/></w:pBdr></w:pPr><w:rPr><w:b/><w:color w:val="1D3557"/><w:sz w:val="22"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="QuestionTitle"><w:name w:val="Question Title"/><w:basedOn w:val="Normal"/><w:qFormat/><w:pPr><w:keepNext/><w:keepLines/><w:spacing w:before="100" w:after="45"/><w:ind w:left="120"/><w:shd w:val="clear" w:color="auto" w:fill="ECEFF2"/><w:pBdr><w:left w:val="single" w:sz="18" w:space="0" w:color="6B7280"/></w:pBdr></w:pPr><w:rPr><w:b/><w:color w:val="243B53"/><w:sz w:val="22"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="DocumentLabel"><w:name w:val="Document Label"/><w:basedOn w:val="Normal"/><w:qFormat/><w:pPr><w:keepNext/><w:keepLines/><w:spacing w:before="65" w:after="35"/></w:pPr><w:rPr><w:b/><w:color w:val="17212B"/><w:sz w:val="21"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="CleanNote"><w:name w:val="Clean Note"/><w:basedOn w:val="Normal"/><w:pPr><w:spacing w:before="0" w:after="50"/></w:pPr><w:rPr><w:color w:val="5F6B76"/><w:sz w:val="18"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="Quote"><w:name w:val="Quote"/><w:basedOn w:val="Normal"/><w:pPr><w:spacing w:before="25" w:after="45"/><w:ind w:left="250"/></w:pPr><w:rPr><w:i/><w:color w:val="4A5560"/><w:sz w:val="19"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="BulletList"><w:name w:val="Bullet List"/><w:basedOn w:val="Normal"/><w:pPr><w:spacing w:before="0" w:after="20"/><w:ind w:left="300" w:hanging="160"/></w:pPr></w:style><w:style w:type="paragraph" w:styleId="NumberList"><w:name w:val="Number List"/><w:basedOn w:val="Normal"/><w:pPr><w:spacing w:before="0" w:after="20"/><w:ind w:left="270" w:hanging="160"/></w:pPr></w:style></w:styles>` },
    { name: "word/document.xml", content: `<?xml version="1.0" encoding="UTF-8"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><w:body>${body}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="700" w:right="760" w:bottom="760" w:left="760"/><w:cols w:space="500"/></w:sectPr></w:body></w:document>` },
    ...assets.map((asset) => ({ name: `word/media/${asset.name}`, bytes: asset.bytes }))
  ];
  downloadBytes(`${base}.docx`, "application/vnd.openxmlformats-officedocument.wordprocessingml.document", makeZip(files));
}

function odtParagraph(text, style = "P1") {
  return `<text:p text:style-name="${style}">${escapeXml(text)}</text:p>`;
}

function odtImage(asset) {
  return `<text:p text:style-name="ImagePara"><draw:frame draw:style-name="ImageFrame" draw:name="${escapeXml(asset.name)}" text:anchor-type="paragraph" svg:width="14.8cm" svg:height="9.3cm"><draw:image xlink:href="Pictures/${escapeXml(asset.name)}" xlink:type="simple" xlink:show="embed" xlink:actuate="onLoad"/></draw:frame></text:p>`;
}

async function exportOdt(exercise, chapter, markdown) {
  const base = exportFileBase(exercise, chapter);
  const assets = await assetsFromMarkdown(markdown);
  const assetBySrc = new Map(assets.map((asset) => [asset.src, asset]));
  const body = blocksWithOfficeBreaks(markdownBlocks(markdown)).map((block) => {
    if (block.type === "blank") return odtParagraph("");
    if (block.type === "hggspTopicTitle") {
      return odtParagraph(block.text, block.kind === "document" ? "QuestionTitle" : "ExerciseTitle");
    }
    if (block.type === "hggspInstruction") return odtParagraph(block.text, "DocumentLabel");
    if (block.type === "image") {
      const asset = assetBySrc.get(block.src);
      return asset ? odtImage(asset) : odtParagraph(block.alt);
    }
    if (block.type === "documentTitle") return odtParagraph(block.text, "Heading2");
    if (block.type === "h1") return odtParagraph(block.text, "Title");
    if (block.type === "h2") return odtParagraph(block.text, "Heading1");
    if (block.type === "h3") return odtParagraph(block.text, "Heading2");
    if (block.type === "exerciseTitle") return odtParagraph(block.text, "ExerciseTitle");
    if (block.type === "questionTitle") return odtParagraph(block.text, "QuestionTitle");
    if (block.type === "documentLabel") return odtParagraph(block.text, "DocumentLabel");
    if (block.type === "cleanedNote") return odtParagraph(block.text, "CleanNote");
    if (block.type === "quote") return odtParagraph(block.text, "Quote");
    if (block.type === "bullet") return odtParagraph(`• ${block.text}`, "Bullet");
    if (block.type === "number") return odtParagraph(block.text, "Number");
    return odtParagraph(block.text);
  }).join("");
  const manifestImages = assets.map((asset) => `<manifest:file-entry manifest:full-path="Pictures/${escapeXml(asset.name)}" manifest:media-type="${escapeXml(asset.mime)}"/>`).join("");
  const automaticStyles = `<?xml version="1.0" encoding="UTF-8"?>
<office:document-styles xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style:1.0" xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0" xmlns:fo="urn:oasis:names:tc:opendocument:xmlns:xsl-fo-compatible:1.0" xmlns:draw="urn:oasis:names:tc:opendocument:xmlns:drawing:1.0" xmlns:svg="urn:oasis:names:tc:opendocument:xmlns:svg-compatible:1.0" office:version="1.2"><office:styles><style:default-style style:family="paragraph"><style:paragraph-properties fo:orphans="3" fo:widows="3" fo:text-align="start"/><style:text-properties style:font-name="Aptos" fo:font-size="10.5pt"/></style:default-style><style:style style:name="P1" style:family="paragraph"><style:paragraph-properties fo:margin-bottom="0.08cm" fo:line-height="126%"/></style:style><style:style style:name="Title" style:family="paragraph"><style:paragraph-properties fo:margin-bottom="0.16cm" fo:keep-with-next="always"/><style:text-properties fo:font-size="15pt" fo:font-weight="bold" fo:color="#1F4E46"/></style:style><style:style style:name="Heading1" style:family="paragraph"><style:paragraph-properties fo:margin-top="0.18cm" fo:margin-bottom="0.08cm" fo:keep-with-next="always"/><style:text-properties fo:font-size="12.2pt" fo:font-weight="bold" fo:color="#1F4E46"/></style:style><style:style style:name="Heading2" style:family="paragraph"><style:paragraph-properties fo:margin-top="0.14cm" fo:margin-bottom="0.08cm" fo:margin-left="0.12cm" fo:padding="0.08cm 0.12cm 0.08cm 0.14cm" fo:background-color="#EEF4F7" fo:border-left="0.06cm solid #315F9E" fo:keep-with-next="always"/><style:text-properties fo:font-size="11.2pt" fo:font-weight="bold" fo:color="#315F9E"/></style:style><style:style style:name="ExerciseTitle" style:family="paragraph"><style:paragraph-properties fo:margin-top="0.14cm" fo:margin-bottom="0.08cm" fo:margin-left="0.12cm" fo:padding="0.08cm 0.12cm 0.08cm 0.14cm" fo:background-color="#F3F5F6" fo:border-left="0.06cm solid #315F9E" fo:keep-with-next="always"/><style:text-properties fo:font-size="11.1pt" fo:font-weight="bold" fo:color="#1D3557"/></style:style><style:style style:name="QuestionTitle" style:family="paragraph"><style:paragraph-properties fo:margin-top="0.14cm" fo:margin-bottom="0.08cm" fo:margin-left="0.12cm" fo:padding="0.08cm 0.12cm 0.08cm 0.14cm" fo:background-color="#ECEFF2" fo:border-left="0.06cm solid #6B7280" fo:keep-with-next="always"/><style:text-properties fo:font-size="11.1pt" fo:font-weight="bold" fo:color="#243B53"/></style:style><style:style style:name="DocumentLabel" style:family="paragraph"><style:paragraph-properties fo:margin-top="0.1cm" fo:margin-bottom="0.05cm" fo:keep-with-next="always"/><style:text-properties fo:font-size="10.6pt" fo:font-weight="bold" fo:color="#17212B"/></style:style><style:style style:name="CleanNote" style:family="paragraph"><style:paragraph-properties fo:margin-bottom="0.08cm"/><style:text-properties fo:font-size="9pt" fo:color="#5F6B76"/></style:style><style:style style:name="Quote" style:family="paragraph"><style:paragraph-properties fo:margin-left="0.45cm" fo:margin-bottom="0.08cm" fo:line-height="122%"/><style:text-properties fo:font-size="9.4pt" fo:font-style="italic" fo:color="#4A5560"/></style:style><style:style style:name="Bullet" style:family="paragraph"><style:paragraph-properties fo:margin-left="0.5cm" fo:text-indent="-0.25cm" fo:margin-bottom="0.03cm" fo:line-height="124%"/></style:style><style:style style:name="Number" style:family="paragraph"><style:paragraph-properties fo:margin-left="0.45cm" fo:text-indent="-0.25cm" fo:margin-bottom="0.03cm" fo:line-height="124%"/></style:style><style:style style:name="ImagePara" style:family="paragraph"><style:paragraph-properties fo:text-align="center" fo:margin-top="0.08cm" fo:margin-bottom="0.12cm" fo:keep-together="always"/></style:style><style:style style:name="ImageFrame" style:family="graphic"><style:graphic-properties style:wrap="none" style:vertical-pos="top" style:vertical-rel="paragraph" style:horizontal-pos="center" style:horizontal-rel="paragraph"/></style:style></office:styles><office:automatic-styles><style:page-layout style:name="pm1"><style:page-layout-properties fo:page-width="21cm" fo:page-height="29.7cm" style:print-orientation="portrait" fo:margin-top="0.8cm" fo:margin-bottom="0.85cm" fo:margin-left="0.8cm" fo:margin-right="0.8cm"/></style:page-layout></office:automatic-styles><office:master-styles><style:master-page style:name="Standard" style:page-layout-name="pm1"/></office:master-styles></office:document-styles>`;
  const files = [
    { name: "mimetype", content: "application/vnd.oasis.opendocument.text" },
    { name: "META-INF/manifest.xml", content: `<?xml version="1.0" encoding="UTF-8"?><manifest:manifest xmlns:manifest="urn:oasis:names:tc:opendocument:xmlns:manifest:1.0" manifest:version="1.2"><manifest:file-entry manifest:full-path="/" manifest:media-type="application/vnd.oasis.opendocument.text"/><manifest:file-entry manifest:full-path="content.xml" manifest:media-type="text/xml"/><manifest:file-entry manifest:full-path="styles.xml" manifest:media-type="text/xml"/>${manifestImages}</manifest:manifest>` },
    { name: "styles.xml", content: automaticStyles },
    { name: "content.xml", content: `<?xml version="1.0" encoding="UTF-8"?><office:document-content xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0" xmlns:draw="urn:oasis:names:tc:opendocument:xmlns:drawing:1.0" xmlns:xlink="http://www.w3.org/1999/xlink" xmlns:svg="urn:oasis:names:tc:opendocument:xmlns:svg-compatible:1.0" office:version="1.2"><office:automatic-styles/><office:body><office:text text:use-soft-page-breaks="true">${body}</office:text></office:body></office:document-content>` },
    ...assets.map((asset) => ({ name: `Pictures/${asset.name}`, bytes: asset.bytes }))
  ];
  downloadBytes(`${base}.odt`, "application/vnd.oasis.opendocument.text", makeZip(files));
}

async function exportSubject(exercise, chapter, markdown, format) {
  if (format === "pdf") {
    if (exercise.id === "sheet-personnalisee") {
      state.printingSheet = true;
      document.body.classList.add("printing-sheet");
      els.sheetOverlay.hidden = false;
      setTimeout(() => window.print(), 30);
      return;
    }
    window.print();
    return;
  }

  if (format === "markdown") {
    await exportMarkdownZip(exercise, chapter, markdown);
    return;
  }

  if (format === "odt") {
    await exportOdt(exercise, chapter, markdown);
    return;
  }

  if (format === "docx") {
    await exportDocx(exercise, chapter, markdown);
  }
}

function renderDetailFavorite(exercise) {
  return `<div class="detail-favorite">${favoriteButtonMarkup(exercise)}</div>`;
}

function renderThemeActions(exercise, activeChapter = "") {
  return `<div class="theme-actions">${renderChapterNav(exercise, activeChapter)}</div>`;
}

const accessButtonOverrides = {};

function sectionByExerciseNumber(exercise, number) {
  return findExerciseSection(exerciseSections(exercise.subjectMarkdown), number);
}

function inferSectionDiscipline(section) {
  const text = normalize((section?.lines || []).slice(0, 8).join("\n"));
  if (/geographie|géographie/.test(text)) return "G";
  if (/histoire/.test(text)) return "H";
  if (/situation pratique|enseignement moral et civique/.test(text)) return "EMC";
  return "";
}

function chapterByPrefix(chapters, prefix, excluded = new Set()) {
  return (chapters || []).find((chapter) => getChapterPrefix(chapter) === prefix && !excluded.has(chapter)) || "";
}

function inferRepereLabel(exercise, prefix) {
  const repereTypes = (exercise.types || []).filter((type) => normalize(type).includes("reperes"));
  const repereType = repereTypes.find((type) => (
    (prefix === "H" && normalize(type).includes("histor"))
    || (prefix === "G" && normalize(type).includes("geo"))
  )) || repereTypes[0];
  if (repereType) return formatLabel(repereType);
  if (prefix === "H") return "Repères historiques";
  if (prefix === "G") return "Repères géographiques";
  return "Repères";
}

function repereDisciplineLabel(prefix, fallback = "Repères") {
  if (prefix === "H") return "Repères histoire";
  if (prefix === "G") return "Repères géo";
  return fallback;
}

function sectionSubjectLabel(section) {
  const heading = (section?.lines || []).find((line) => /^###\s+/.test(line));
  if (!heading) return "";

  const label = heading
    .replace(/^###\s+/, "")
    .replace(/\*\*/g, "")
    .replace(/^(HISTOIRE|G[ÉE]OGRAPHIE|EMC)\s*(?:[:–-]\s*)?/i, "")
    .replace(/^Sous-thème\s*:\s*/i, "")
    .trim()
    .replace(/\s+/g, " ")
    .replace(/\.$/, "");

  if (!label || /^annexe\b/i.test(label) || /^questions\b/i.test(label)) return "";
  return label;
}

function reperePrefixFromEntry(exercise, entry, section) {
  const entryLabel = normalize(entry?.label || "");
  if (entryLabel.includes("geo")) return "G";
  if (entryLabel.includes("histor")) return "H";

  const normalized = normalize((exercise.types || []).join(" "));
  if (normalized.includes("geo")) return "G";
  if (normalized.includes("histor")) return "H";
  return inferSectionDiscipline(section) || "";
}

function shortRepereSubjectLabel(subject, prefix) {
  const label = String(subject || "").trim();
  if (
    /^pourquoi et comment aménager le territoire\s*\??$/i.test(label)
    || /^aménager pour répondre aux inégalités croissantes entre territoires français à toutes les échelles\s*$/i.test(label)
  ) {
    return "Aménager le territoire";
  }
  if (/^les espaces de faible densité\s*\(espaces ruraux/i.test(label)) {
    return "Les espaces de faible densité";
  }
  if (/^les espaces productifs et leurs évolutions\s*$/i.test(label)) {
    return "Les espaces productifs";
  }
  if (/^démocraties fragilisées et expériences totalitaires dans l[’']europe de l[’']entre-\s*deux-guerres\s*$/i.test(label)) {
    return "Entre deux-guerres";
  }

  return label
    .replace(/\s*,\s+.*$/, "")
    .replace(/\s*:\s+.*$/, "")
    .trim();
}

function repereLabelWithSubject(exercise, entry) {
  if (entry?.part !== "repere") return entry?.label || "";

  const currentLabel = entry.label || "";
  const normalizedLabel = normalize(currentLabel);
  if (!/^reperes(?:\s+(histoire|historiques|geo|geographiques))?$/i.test(normalizedLabel)) {
    return currentLabel;
  }

  const section = sectionByExerciseNumber(exercise, entry.exerciseNumber || 2);
  const prefix = reperePrefixFromEntry(exercise, entry, section);
  const subject = sectionSubjectLabel(section)
    || formatChapterChip(chapterByPrefix(exercise.chapters || [], prefix));
  const shortSubject = shortRepereSubjectLabel(subject, prefix);
  const base = repereDisciplineLabel(prefix, currentLabel || inferRepereLabel(exercise, prefix));

  if (shortSubject && prefix === "H") return shortSubject;
  return shortSubject ? `${base} : ${shortSubject}` : base;
}

function derivedAccessEntries(exercise) {
  const chapters = exercise.chapters || (exercise.chapter ? [exercise.chapter] : []);
  if (!chapters.length) return [];

  const section1 = sectionByExerciseNumber(exercise, 1);
  const section2 = sectionByExerciseNumber(exercise, 2);
  const section3 = sectionByExerciseNumber(exercise, 3);

  const discipline1 = inferSectionDiscipline(section1);
  let discipline2 = inferSectionDiscipline(section2);
  const used = new Set();

  const chapter1 = chapterByPrefix(chapters, discipline1, used);
  if (chapter1) used.add(chapter1);

  if (!discipline2) {
    discipline2 = ["H", "G"].find((prefix) => chapterByPrefix(chapters, prefix, used)) || "";
  }

  const chapter2 = chapterByPrefix(chapters, discipline2, used);
  if (chapter2) used.add(chapter2);

  const chapter3 = chapterByPrefix(chapters, "EMC", used) || chapterByPrefix(chapters, inferSectionDiscipline(section3), used);
  const entries = [];

  if (chapter1) {
    entries.push({ key: chapter1, label: formatChapterChip(chapter1), chapter: chapter1 });
  }

  if (chapter2) {
    entries.push({
      key: `__${exercise.id}-development`,
      label: formatChapterChip(chapter2),
      exerciseNumber: 2,
      part: "development"
    });

    if ((exercise.types || []).some((type) => normalize(type).includes("reperes"))) {
      entries.push({
        key: `__${exercise.id}-repere`,
        label: inferRepereLabel(exercise, discipline2),
        exerciseNumber: 2,
        part: "repere"
      });
    }
  }

  if (chapter3) {
    entries.push({ key: chapter3, label: formatChapterChip(chapter3), chapter: chapter3 });
  }

  return entries;
}

function accessEntries(exercise) {
  if (exercise.subject === "HGGSP") {
    const topics = exercise.classifiedSubjects || [];
    const hggspOrder = {
      "hggsp-dissertation": 0,
      "hggsp-document-study": 1
    };
    return topics.map((topic, index) => {
      const part = hggspTopicPart(topic);
      return {
        key: hggspTopicKey(exercise, topic, index),
        label: shortThemeLabel(topic.theme),
        chapter: topic.theme,
        part,
        topic
      };
    }).sort((a, b) => {
      const typeOrder = (hggspOrder[a.part] ?? 9) - (hggspOrder[b.part] ?? 9);
      if (typeOrder) return typeOrder;
      const dayOrder = dayNumber({ type: a.topic?.dayLabel }) - dayNumber({ type: b.topic?.dayLabel });
      if (dayOrder) return dayOrder;
      return compareChapters(a.chapter, b.chapter);
    });
  }

  const overrides = accessButtonOverrides[exercise.id];
  const entries = overrides?.length ? overrides : derivedAccessEntries(exercise);
  return entries.map((entry) => entry.part === "repere"
    ? { ...entry, label: repereLabelWithSubject(exercise, entry) }
    : entry);
}

function accessEntry(exercise, key) {
  return accessEntries(exercise).find((entry) => entry.key === key) || null;
}

function accessLabel(exercise, key) {
  return accessEntry(exercise, key)?.label || formatChapterChip(key);
}

function listAccessLabel(label) {
  return shortThemeLabel(label)
    .replace(/^(Repères?\s+(?:histoire|historiques|géo|geo|géographiques|geographiques))\s*:\s*/i, "")
    .replace(/^(Géo|Geo|Histoire|Hist|EMC)\s*:\s*/i, "")
    .trim();
}

function accessEntryTone(entry) {
  if (!entry) return "analysis";
  if (entry.part === "hggsp-dissertation") return "hggsp-dissertation";
  if (entry.part === "hggsp-document-study") return "hggsp-document-study";
  if (entry.part === "development") return "development";
  if (entry.part === "repere") {
    const normalized = normalize(entry.label);
    if (normalized.includes("geo")) return "repere-geo";
    return "repere-history";
  }
  const chapter = String(entry.chapter || entry.key || "");
  if (/^EMC-\d+/i.test(chapter)) return "emc";
  return "analysis";
}

function renderChapterNav(exercise, activeChapter = "") {
  const entries = accessEntries(exercise);
  if (!entries.length) return "";

  return `
    <div class="chapter-nav" aria-label="Parties du sujet">
      ${entries.map((entry) => `<button class="tag chapter-tag detail-chapter-button tag-tone-${escapeHtml(accessEntryTone(entry))}" type="button" data-chapter="${escapeHtml(entry.key)}" aria-pressed="${entry.key === activeChapter ? "true" : "false"}">${escapeHtml(listAccessLabel(entry.label))}</button>`).join("")}
    </div>
  `;
}

function renderQuickAccess(exercise, activeChapter = "") {
  const dayPdfLinks = exercise.days?.length
    ? exercise.days.map((day) => day.primaryPdf
      ? `<a class="primary-resource" href="${escapeHtml(day.primaryPdf)}" target="_blank" rel="noopener">Ouvrir le PDF Jour ${escapeHtml(dayNumber(day))}</a>`
      : "").join("")
    : "";
  return `
    <div class="quick-access">
      <details class="export-menu">
        <summary class="secondary-resource export-menu-button">Exporter</summary>
        <div class="export-options">
          <button class="export-option" type="button" data-export-format="pdf">PDF</button>
          <button class="export-option" type="button" data-export-format="markdown">Markdown ZIP</button>
          <button class="export-option" type="button" data-export-format="odt">ODT LibreOffice</button>
          <button class="export-option" type="button" data-export-format="docx">DOCX Word</button>
        </div>
      </details>
      ${activeChapter ? sheetButtonMarkup(exercise, activeChapter) : ""}
      ${activeChapter ? `<button class="primary-resource full-subject-button" type="button">Accéder au sujet dans son intégralité</button>` : ""}
      ${dayPdfLinks}
      ${exercise.primaryPdf ? `<a class="primary-resource" href="${escapeHtml(exercise.primaryPdf)}" target="_blank" rel="noopener">Ouvrir le PDF</a>` : ""}
      ${renderDetailFavorite(exercise)}
    </div>
  `;
}

const PROGRAM_URL = "https://eduscol.education.fr/5802/programmes-et-ressources-en-histoire-geographie-geopolitique-et-sciences-politiques-voie-g";

function renderLinks(exercise) {
  const links = exercise.links || [];
  const subjectLinks = links.filter((link) => link.kind === "pdf" && (link.label === "Sujet" || link.label === "Sujet de l'épreuve"));
  const fallbackSubjectLink = links.find((link) => link.kind === "pdf");
  const primaryLinks = subjectLinks.length
    ? subjectLinks
    : fallbackSubjectLink
      ? [fallbackSubjectLink]
      : [];
  const secondaryLinks = links.filter((link) => !primaryLinks.includes(link));
  const accessibleLinks = secondaryLinks.filter((link) => link.kind === "pdf" || link.kind === "zip" || /Arial|Braille/i.test(link.label || ""));
  const otherLinks = secondaryLinks.filter((link) => !accessibleLinks.includes(link));
  const exerciseDayLabel = dayNumber(exercise) ? `Jour ${dayNumber(exercise)}` : "";
  const linkMarkup = (link, { primary = false } = {}) => {
    const label = primary
      ? `Sujet de l'épreuve${link.dayLabel || exerciseDayLabel ? ` - ${link.dayLabel || exerciseDayLabel}` : ""}`
      : link.kind === "pdf" && link.label
        ? `Sujet de l'épreuve - ${link.label}`
        : link.label;
    return `<a class="resource-link" href="${escapeHtml(link.url)}" target="_blank" rel="noopener">${escapeHtml(label)}</a>`;
  };
  const items = [
    ...primaryLinks.map((link) => linkMarkup(link, { primary: true })),
    ...otherLinks.map((link) => linkMarkup(link)),
    accessibleLinks.length
      ? `<details class="resource-variants"><summary class="resource-link resource-variants-summary">Versions accessibles (${accessibleLinks.length})</summary><div class="resource-variant-links">${accessibleLinks.map((link) => linkMarkup(link)).join("")}</div></details>`
      : "",
    linkMarkup({ label: "Programme officiel HGGSP", url: PROGRAM_URL })
  ].join("");

  return `
    <div class="resource-panel">
      <div class="panel-title">Ressources officielles</div>
      <div class="resource-links">${items}</div>
    </div>
  `;
}

function update() {
  buildFilters();
  renderList(filteredExercises());
  renderSheetState();
  applyRoute();
}

els.searchInput.addEventListener("input", (event) => {
  state.query = event.target.value;
  update();
});

els.aboutButton.addEventListener("click", openAbout);
els.aboutClose.addEventListener("click", closeAbout);
els.aboutOverlay.addEventListener("click", (event) => {
  if (event.target === els.aboutOverlay) {
    closeAbout();
  }
});

els.sheetButton.addEventListener("click", openSheet);
els.sheetClose.addEventListener("click", closeSheet);
els.sheetOverlay.addEventListener("click", (event) => {
  if (event.target === els.sheetOverlay) {
    closeSheet();
  }
});
els.sheetClearButton.addEventListener("click", clearSheetSelections);
els.sheetOverlay.querySelectorAll("[data-sheet-export-format]").forEach((button) => {
  button.addEventListener("click", async () => {
    button.disabled = true;
    try {
      const sheet = sheetVirtualExercise();
      await exportSubject(sheet, "", sheet.subjectMarkdown, button.dataset.sheetExportFormat);
    } finally {
      button.disabled = false;
    }
  });
});

els.themeToggle.addEventListener("click", toggleTheme);

els.favoriteOnly.addEventListener("change", (event) => {
  state.favoritesOnly = event.target.checked;
  update();
});

[
  ["chapter", els.chapterSelect],
  ["exerciseType", els.exerciseTypeSelect],
  ["year", els.yearSelect],
  ["place", els.placeSelect]
].forEach(([key, select]) => {
  select.addEventListener("change", (event) => {
    state[key] = event.target.value;
    update();
  });
});

els.sortSelect.addEventListener("change", (event) => {
  state.sort = event.target.value;
  update();
});

els.resetButton.addEventListener("click", () => {
  state.chapter = "Tous";
  state.exerciseType = "Tous";
  state.year = "Tous";
  state.place = "Tous";
  state.query = "";
  state.sort = "recent";
  state.favoritesOnly = false;
  state.selectedId = null;
  state.correctionVisible = false;
  els.searchInput.value = "";
  els.exerciseTypeSelect.value = "Tous";
  els.favoriteOnly.checked = false;
  els.sortSelect.value = "recent";
  update();
});

els.backButton.addEventListener("click", () => {
  history.pushState(null, "", window.location.pathname + window.location.search);
  applyRoute();
});

els.toggleCorrection.addEventListener("click", () => {
  state.correctionVisible = !state.correctionVisible;
  renderViewer(findExerciseById(state.selectedId), state.selectedChapter);
});

window.addEventListener("hashchange", applyRoute);
mobileStatsMedia.addEventListener("change", syncStatsPlacement);
window.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !els.aboutOverlay.hidden) {
    closeAbout();
  }
  if (event.key === "Escape" && !els.sheetOverlay.hidden) {
    closeSheet();
  }
});

window.addEventListener("afterprint", () => {
  if (state.printingSheet) {
    state.printingSheet = false;
    document.body.classList.remove("printing-sheet");
  }
});

async function initApp() {
  syncStatsPlacement();
  renderSheetState();
  setLoadingState("Chargement des sujets...");

  try {
    await loadExercises();
    update();
  } catch (error) {
    console.error(error);
    const localHint = window.location.protocol === "file:"
      ? " Le chargement local a echoue pour data.js et data.json."
      : "";
    setLoadingState(`Impossible de charger les donnees du site.${localHint}`);
  }
}

initApp();
