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

/* Returns words that are not recognised by the dictionary. */
function detectSpellingErrors(text) {
  if (!dictionaryReady) {
    return [];
  }

  const errors = [];

  text.split(" ").forEach(word => {
    const cleanWord = word.replace(/[.,!?]/g, "");

    if (cleanWord && !spellChecker.check(cleanWord)) {
      errors.push(cleanWord);
    }
  });

  return errors;
}

/* Displays misspelled words using the highlight layer behind the input. */
function updateHighlights(text) {
  const errors = detectSpellingErrors(text);
  let highlightedText = text;

  errors.forEach(word => {
    const regex = new RegExp(
      "\\b" + word + "\\b",
      "gi"
    );

    highlightedText = highlightedText.replace(
      regex,
      `<span class="misspelled">$&</span>`
    );
  });

  highlightLayer.innerHTML = highlightedText.replace(/\n/g, "<br>");
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
  return text.replace(/\s+/g, " ");
}

/* Removes unnecessary spaces before common punctuation marks. */
function fixPunctuationSpacing(text) {
  return text.replace(/\s+([,.!?])/g, "$1");
}

/* Removes whitespace from the beginning and end of the text. */
function trimWhitespace(text) {
  return text.trim();
}

/* Placeholder for the capitalisation correction feature. */
function correctCapitalisation(text) {
  return text;
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