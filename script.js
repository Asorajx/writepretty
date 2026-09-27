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
  const words = removeProtectedText(text).match(/[A-Za-z]+(?:'[A-Za-z]+)?/g) || [];

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

  const words = removeProtectedText(text).match(/\b[a-z][A-Za-z']*\b/g) || [];

  return words.filter(word =>
    isPossibleCapitalisationIssue(word)
  );
}

/* Finds ambiguous cases that may be missing a space after a full stop. */
function detectFormattingIssues(text) {
  const issues = [];
  const matches = text.matchAll(/\.([A-Za-z]+)/g);

  for (const match of matches) {
    const word = match[1];
    const wordStart = match.index + 1;

    const beforePeriod = text.slice(0, match.index);
    const previousWord = beforePeriod.match(/([A-Za-z]+)$/);

    /* Ignore obvious URLs and email addresses. */
    const nearbyText = text.slice(
      Math.max(0, match.index - 50),
      match.index
    );

    if (
      /https?:\/\/\S*$/i.test(nearbyText) ||
      /www\.\S*$/i.test(nearbyText) ||
      /@\S*$/i.test(nearbyText)
    ) {
      continue;
    }

    issues.push({
      word,
      index: wordStart
    });
  }

  return issues;
}

/* Removes URLs and email addresses from text before language checks. */
function removeProtectedText(text) {
  return text
    .replace(/\b(?:https?:\/\/|www\.)\S+/gi, " ")
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, " ");
}

/* Escapes user text before displaying it inside the highlight layer. */
function escapeHtml(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/* Displays spelling, capitalisation, and formatting issues behind the input. */
function updateHighlights(text) {
  const spellingErrors = new Set(
    detectSpellingErrors(text).map(word => word.toLowerCase())
  );

  const capitalisationIssues = new Set(
    detectCapitalisationIssues(text).map(word => word.toLowerCase())
  );

  const formattingIssues = detectFormattingIssues(text);

  const formattingIndexes = new Set(
    formattingIssues.map(issue => issue.index)
  );

  const wordPattern = /[A-Za-z]+(?:'[A-Za-z]+)?/g;

  let highlightedText = "";
  let lastIndex = 0;
  let match;

  while ((match = wordPattern.exec(text)) !== null) {
    highlightedText += escapeHtml(
      text.slice(lastIndex, match.index)
    );

    const word = match[0];
    const lowerCaseWord = word.toLowerCase();

    if (formattingIndexes.has(match.index)) {
      highlightedText +=
        `<span class="formatting-issue">${escapeHtml(word)}</span>`;
    } else if (capitalisationIssues.has(lowerCaseWord)) {
      highlightedText +=
        `<span class="capitalisation-issue">${escapeHtml(word)}</span>`;
    } else if (spellingErrors.has(lowerCaseWord)) {
      highlightedText +=
        `<span class="misspelled">${escapeHtml(word)}</span>`;
    } else {
      highlightedText += escapeHtml(word);
    }

    lastIndex = wordPattern.lastIndex;
  }

  highlightedText += escapeHtml(
    text.slice(lastIndex)
  );

  highlightLayer.innerHTML =
    highlightedText.replace(/\n/g, "<br>");
}

loadDictionary();


/* =========================
   Main Text Processor
   ========================= */

/* Protects Markdown code so cleanup rules do not change its contents. */
function protectMarkdownContent(text) {
  const protectedParts = [];

  /* Stores protected content and leaves a temporary token in its place. */
  function protect(match) {
    const token =
      `@@WRITEPRETTY_PROTECTED_${protectedParts.length}@@`;

    protectedParts.push(match);
    return token;
  }

  /* Protect fenced code blocks, including unfinished blocks at the end of the text. */
  let protectedText = text.replace(
    /```[\s\S]*?(?:```|(?![\s\S]))|~~~[\s\S]*?(?:~~~|(?![\s\S]))/g,
    protect
  );

  /* Protect inline code. */
  protectedText = protectedText.replace(
    /`[^`\n]*`/g,
    protect
  );

  /* Protect Markdown code created using indentation. */
  protectedText = protectedText.replace(
    /^(?: {4}|\t).+$/gm,
    protect
  );

  /* Normalises the URL scheme, then protects the rest of the URL from cleanup. */
  protectedText = protectedText.replace(
    /\b(?:https?:\/\/|www\.)\S+/gi,
    match => {
      const normalisedUrl = match.replace(
        /^https?:\/\//i,
        scheme => scheme.toLowerCase()
      );

      return protect(normalisedUrl);
    }
  );

  /* Protect email addresses from text cleanup. */
  protectedText = protectedText.replace(
    /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi,
    protect
  );

  return {
    text: protectedText,
    protectedParts
  };
}

/* Restores protected Markdown content after text cleanup is complete. */
function restoreMarkdownContent(text, protectedParts) {
  let restoredText = text;

  protectedParts.forEach((content, index) => {
    const token = `@@WRITEPRETTY_PROTECTED_${index}@@`;

    restoredText = restoredText.replace(
      token,
      () => content
    );
  });

  return restoredText;
}

/* Runs each cleanup step while protecting Markdown code from changes. */
function cleanText(text) {
  const markdown = protectMarkdownContent(text);
  let cleanedText = markdown.text;

  cleanedText = removeExtraWhitespace(cleanedText);
  cleanedText = fixPunctuationSpacing(cleanedText);
  cleanedText = trimWhitespace(cleanedText);
  cleanedText = correctCapitalisation(cleanedText);

  return restoreMarkdownContent(
    cleanedText,
    markdown.protectedParts
  );
}

/* Cleans repeated spaces inside lines without changing Markdown indentation or line breaks. */
function removeExtraWhitespace(text) {
  return text
    .split("\n")
    .map(line => {
      const leadingWhitespace = line.match(/^[ \t]*/)[0];

      const trailingWhitespace = line.match(/[ \t]*$/)[0];

      const content = line.slice(
        leadingWhitespace.length,
        line.length - trailingWhitespace.length
      );

      const cleanedContent = content.replace(/[ \t]+/g, " ");

      return (
        leadingWhitespace +
        cleanedContent +
        trailingWhitespace
      );
    })
    .join("\n");
}

/* Fixes clear spacing issues around common punctuation marks. */
function fixPunctuationSpacing(text) {
  return text
    .replace(/\s+([,.!?;:])/g, "$1")
    .replace(/([.,;:!?])(?=[A-Za-z])/g, "$1 ");
}

/* Removes outer blank lines without changing Markdown indentation. */
function trimWhitespace(text) {
  return text.replace(
    /^(?:[ \t]*\n)+|(?:\n[ \t]*)+$/g,
    ""
  );
}

/* Corrects capitalisation only when the intended change is clear. */
function correctCapitalisation(text) {
  let correctedText = text;

  /* Capitalise sentence and paragraph starts, including Markdown emphasis. */
  correctedText = correctedText.replace(
    /(^|[.!?]\s+|\n[ \t]*\n[ \t]*)([*_~]{0,3})([a-z])/g,
    (match, prefix, markdown, letter) =>
      prefix + markdown + letter.toUpperCase()
  );

  /* Capitalise the readable text at the start of common Markdown blocks. */
  correctedText = correctedText.replace(
    /^([ \t]*(?:#{1,6}[ \t]+|>[ \t]*|[-+*][ \t]+|\d+[.)][ \t]+)(?:\[[ xX]\][ \t]+)?[*_~]{0,3})([a-z])/gm,
    (match, prefix, letter) =>
      prefix + letter.toUpperCase()
  );

  /* The standalone pronoun "i" should always be uppercase. */
  correctedText = correctedText.replace(
    /\bi\b/g,
    "I"
  );

  return correctedText;
}


/* =========================
   Event Listeners
   ========================= */

/* Keeps the highlight layer aligned with the textarea while scrolling. */
function syncHighlightScroll() {
  highlightLayer.scrollTop = inputText.scrollTop;
  highlightLayer.scrollLeft = inputText.scrollLeft;
}

/* Processes the text and refreshes highlights as the user types. */
inputText.addEventListener("input", () => {
  outputText.value = cleanText(inputText.value);
  updateHighlights(inputText.value);
  syncHighlightScroll();
});

/* Moves the highlight layer together with the original text. */
inputText.addEventListener("scroll", syncHighlightScroll);

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