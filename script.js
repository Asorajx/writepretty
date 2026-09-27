/* =========================
   DOM Elements
   ========================= */

const inputText = document.getElementById("inputText");
const outputText = document.getElementById("outputText");
const highlightLayer = document.getElementById("highlightLayer");
const copyButton = document.getElementById("copyButton");


/* =========================
   Spell Checker
   ========================= */

let spellChecker = null;
let dictionaryReady = false;

/* Loads the local Hunspell dictionary before spelling checks can run. */
async function loadDictionary() {
  const aff = await fetch("dictionaries/en_US-large.aff")
    .then(response => response.text());

  const dic = await fetch("dictionaries/en_US-large.dic")
    .then(response => response.text());

  spellChecker = new Typo("en_US", aff, dic);
  dictionaryReady = true;
}

/* Checks whether a lowercase word is rejected but its capitalised form is recognised. */
function isPossibleCapitalisationIssue(word) {
  if (!dictionaryReady || !/^[a-z][A-Za-z']*$/.test(word)) {
    return false;
  }

  const capitalisedWord =
    word.charAt(0).toUpperCase() + word.slice(1);

  return (
    !spellChecker.check(word) &&
    spellChecker.check(capitalisedWord)
  );
}

/* Returns words that are not recognised by the dictionary. */
function detectSpellingErrors(text) {
  if (!dictionaryReady) {
    return [];
  }

  const errors = [];
  const words = text.match(/[A-Za-z]+(?:'[A-Za-z]+)?/g) || [];

  words.forEach(word => {
    if (
      !spellChecker.check(word) &&
      !isPossibleCapitalisationIssue(word)
    ) {
      errors.push(word);
    }
  });

  return errors;
}

/* Returns lowercase words that may need to begin with a capital letter. */
function detectCapitalisationIssues(text) {
  if (!dictionaryReady) {
    return [];
  }

  const words = text.match(/\b[a-z][A-Za-z']*\b/g) || [];

  return words.filter(word =>
    isPossibleCapitalisationIssue(word)
  );
}

/* Escapes user text before displaying it inside the highlight layer. */
function escapeHtml(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/* Displays spelling and possible capitalisation issues behind the input. */
function updateHighlights(text) {
  const spellingErrors = new Set(
    detectSpellingErrors(text).map(word => word.toLowerCase())
  );

  const capitalisationIssues = new Set(
    detectCapitalisationIssues(text).map(word => word.toLowerCase())
  );

  const parts = text.split(/(\b[A-Za-z]+(?:'[A-Za-z]+)?\b)/g);

  const highlightedText = parts.map(part => {
    const lowerCasePart = part.toLowerCase();

    if (capitalisationIssues.has(lowerCasePart)) {
      return `<span class="capitalisation-issue">${escapeHtml(part)}</span>`;
    }

    if (spellingErrors.has(lowerCasePart)) {
      return `<span class="misspelled">${escapeHtml(part)}</span>`;
    }

    return escapeHtml(part);
  }).join("");

  highlightLayer.innerHTML =
    highlightedText.replace(/\n/g, "<br>");
}

loadDictionary();


/* =========================
   Main Text Processor
   ========================= */

/* Runs each cleanup step in order and returns the processed text. */
function cleanText(text) {
  text = removeExtraWhitespace(text);
  text = fixPunctuationSpacing(text);
  text = trimWhitespace(text);
  text = correctCapitalisation(text);

  return text;
}

/* Replaces repeated whitespace with a single space. */
function removeExtraWhitespace(text) {
  return text.replace(/[ \t]+/g, " ");
}

/* Removes unnecessary spaces before common punctuation marks. */
function fixPunctuationSpacing(text) {
  return text.replace(/\s+([,.!?])/g, "$1");
}

/* Removes whitespace from the beginning and end of the text. */
function trimWhitespace(text) {
  return text.trim();
}

/* Corrects capitalisation only when the intended change is clear. */
function correctCapitalisation(text) {
  let correctedText = text;

  /* Capitalise the first letter of the text and letters after sentence-ending punctuation. */
  correctedText = correctedText.replace(
    /(^\s*|[.!?]\s+)([a-z])/g,
    (match, prefix, letter) => prefix + letter.toUpperCase()
  );

  /* The standalone pronoun "i" should always be uppercase. */
  correctedText = correctedText.replace(/\bi\b/g, "I");

  return correctedText;
}


/* =========================
   Event Listeners
   ========================= */

/* Processes the text and refreshes spelling highlights as the user types. */
inputText.addEventListener("input", () => {
  outputText.value = cleanText(inputText.value);
  updateHighlights(inputText.value);
});

/* Copies the processed text and briefly confirms that it was copied. */
copyButton.addEventListener("click", () => {
  navigator.clipboard.writeText(outputText.value);

  copyButton.textContent = "Copied!";

  setTimeout(() => {
    copyButton.textContent = "Copy";
  }, 1500);
});


/* =========================
   Rain Effect
   ========================= */

/* Creates rain drops with random positions, speeds, and starting delays. */
const background = document.querySelector(".ambient-background");

for (let i = 0; i < 70; i++) {
  const drop = document.createElement("span");
  drop.classList.add("rain-drop");
  drop.style.left = Math.random() * 100 + "%";

  // Shorter / longer droplets
  drop.style.height = (12 + Math.random() * 20) + "px";

  // Slight variation in thickness
  drop.style.width = (1 + Math.random() * 1.2) + "px";

  // Different visibility
  drop.style.opacity = 0.3 + Math.random() * 0.5;

  drop.style.animationDuration =
    (1.4 + Math.random() * 1.8) + "s";

  drop.style.animationDelay =
    -(Math.random() * 3) + "s";

  background.appendChild(drop);
}