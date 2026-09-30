/* =========================
   DOM Elements
   ========================= */

const inputText = document.getElementById("inputText");
const outputText = document.getElementById("outputText");
const copyButton = document.getElementById("copyButton");
const downloadButton = document.getElementById("downloadButton");
const historyToggleButton = document.getElementById("historyToggleButton");
const historyTabs = document.querySelector(".history-tabs");
const historyTabList = document.getElementById("historyTabList");
const newHistoryButton = document.getElementById("newHistoryButton");
const combineHistoryButton = document.getElementById("combineHistoryButton");
const originalPanel = document.querySelector(".original-panel");
const wordCount = document.getElementById("wordCount");
const characterCount = document.getElementById("characterCount");
const controlsButton = document.getElementById("controlsButton");
const controlsView = document.getElementById("controlsView");
const controlsSaveButton = document.getElementById("controlsSaveButton");
const editorWrapper = document.querySelector(".editor-wrapper");
const editorView = document.getElementById("editorView");


/* =========================
   Application State
   ========================= */

let historyModeEnabled = false;
const historyEntries = [];
let activeHistoryId = null;
let nextHistoryId = 1;
let combinedViewActive = false;

/* Tracks text areas moved automatically so their scroll events are not synced back. */
const synchronisedScrollTargets = new WeakSet();

/* Max number of tabs allowed */
const MAX_HISTORY_ENTRIES = 5;


/* =========================
   Formatting Checks
   ========================= */

/* Finds punctuation that may be missing a space after it. */
function detectFormattingIssues(text) {
  const issues = [];
  const matches = text.matchAll(/([.,;:!?])([A-Za-z]+)/g);

  for (const match of matches) {
    const punctuation = match[1];
    const word = match[2];
    const wordStart = match.index + punctuation.length;

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
   Editor Display Helpers
   ========================= */

/* Updates the processed text word and character counts. */
function updateTextStats(text) {
  const trimmedText = text.trim();

  const words =
    trimmedText === ""
      ? 0
      : trimmedText.split(/\s+/).length;

  const characters = text.length;

  wordCount.textContent =
    `${words} ${words === 1 ? "word" : "words"}`;

  characterCount.textContent =
    `${characters} ${characters === 1 ? "character" : "characters"}`;
}

/* Refreshes the processed output and related editor UI. */
function refreshEditor(text) {
  outputText.value = cleanText(text);

  updateTextStats(outputText.value);
  updateDownloadButton();
}

/* Displays text in both editor panels and refreshes the highlight layer. */
function displayText(text) {
  inputText.value = text;
  refreshEditor(text);
}

/* Updates the editor when entering or leaving the combined history preview. */
function setCombinedView(active) {
  combinedViewActive = active;
  inputText.readOnly = active;

  originalPanel.classList.toggle(
    "combined-preview",
    active
  );
}

/* Disables downloading when there is no processed text. */
function updateDownloadButton() {
  downloadButton.disabled =
    outputText.value.trim() === "";
}

/* Returns the current scroll position as a proportion of the available scroll area. */
function getScrollRatio(element) {
  const maxScroll =
    element.scrollHeight - element.clientHeight;

  if (maxScroll <= 0) {
    return 0;
  }

  return element.scrollTop / maxScroll;
}

/* Scrolls another text area to the same proportional position. */
function syncTextScroll(source, target) {
  const ratio = getScrollRatio(source);

  const targetMaxScroll =
    target.scrollHeight - target.clientHeight;

  synchronisedScrollTargets.add(target);

  target.scrollTop =
    ratio * targetMaxScroll;
}


/* =========================
   History Mode
   ========================= */

/* Returns the history entry currently open in the editor. */
function getActiveHistoryEntry() {
  return historyEntries.find(
    entry => entry.id === activeHistoryId
  );
}

/* Saves the editor text into the currently active history entry. */
function saveActiveHistoryEntry() {
  if (combinedViewActive) {
    return;
  }

  const activeEntry = getActiveHistoryEntry();

  if (!activeEntry) {
    return;
  }

  activeEntry.text = inputText.value;
}

/* Creates the numbered buttons shown inside the history rail. */
function renderHistoryTabs() {
  historyTabList.innerHTML = "";

  historyEntries.forEach((entry, index) => {
    const item = document.createElement("div");
    item.classList.add("history-tab-item");

    const tab = document.createElement("button");

    tab.classList.add("history-tab");
    tab.type = "button";
    tab.textContent = index + 1;

    tab.setAttribute(
      "aria-label",
      `History entry ${index + 1}`
    );

    if (entry.id === activeHistoryId && !combinedViewActive) {
      tab.classList.add("active");
    }

    tab.addEventListener("click", () => {
      switchHistoryEntry(entry.id);
    });

    const deleteButton = document.createElement("button");

    deleteButton.classList.add("history-delete-button");
    deleteButton.type = "button";
    deleteButton.textContent = "×";

    deleteButton.setAttribute(
      "aria-label",
      `Delete history entry ${index + 1}`
    );

    deleteButton.addEventListener("click", event => {
      event.stopPropagation();
      deleteHistoryEntry(entry.id);
    });

    item.appendChild(tab);
    item.appendChild(deleteButton);

    historyTabList.appendChild(item);
  });

  newHistoryButton.disabled =
    historyEntries.length >= MAX_HISTORY_ENTRIES;

  combineHistoryButton.classList.toggle(
    "active",
    combinedViewActive
  );

  combineHistoryButton.setAttribute(
    "aria-label",
    combinedViewActive
      ? "Return to active history entry"
      : "Show combined history"
  );

  combineHistoryButton.disabled =
    historyEntries.length < 2;
}

/* Opens one stored entry in the editor. */
function switchHistoryEntry(id) {
  if (!historyModeEnabled) {
    return;
  }

  if (id === activeHistoryId && !combinedViewActive) {
    return;
  }

  saveActiveHistoryEntry();

  const entry = historyEntries.find(
    historyEntry => historyEntry.id === id
  );

  if (!entry) {
    return;
  }

  setCombinedView(false);

  activeHistoryId = entry.id;

  displayText(entry.text);
  renderHistoryTabs();
}

/* Creates and opens a new history entry. */
function createHistoryEntry(text = "") {
  if (!historyModeEnabled) {
    return;
  }

  if (historyEntries.length >= MAX_HISTORY_ENTRIES) {
    return;
  }

  saveActiveHistoryEntry();

  setCombinedView(false);

  const entry = {
    id: nextHistoryId,
    text
  };

  nextHistoryId += 1;

  historyEntries.push(entry);
  activeHistoryId = entry.id;

  displayText(text);
  renderHistoryTabs();
}

/* Removes one history entry and updates the current history view. */
function deleteHistoryEntry(id) {
  if (!historyModeEnabled) {
    return;
  }

  const entryIndex = historyEntries.findIndex(
    entry => entry.id === id
  );

  if (entryIndex === -1) {
    return;
  }

  const deletingActiveEntry = id === activeHistoryId;

  historyEntries.splice(entryIndex, 1);

  if (historyEntries.length === 0) {
    createHistoryEntry("");
    return;
  }

  /* Keep Combined View updated after an entry is deleted. */
  if (combinedViewActive) {
    if (deletingActiveEntry) {
      const nextIndex = Math.min(
        entryIndex,
        historyEntries.length - 1
      );

      activeHistoryId = historyEntries[nextIndex].id;
    }

    /* Combined View is no longer needed when only one entry remains. */
    if (historyEntries.length === 1) {
      activeHistoryId = historyEntries[0].id;

      setCombinedView(false);
      displayText(historyEntries[0].text);
      renderHistoryTabs();
      return;
    }

    const combinedText = historyEntries
      .map(entry => entry.text)
      .join("\n");

    displayText(combinedText);
    renderHistoryTabs();
    return;
  }

  if (deletingActiveEntry) {
    const nextIndex = Math.min(
      entryIndex,
      historyEntries.length - 1
    );

    activeHistoryId = historyEntries[nextIndex].id;

    const activeEntry = historyEntries[nextIndex];

    displayText(activeEntry.text);
  }

  renderHistoryTabs();
}

/* Combine all history entries together without creating a new entry. */
function showCombinedHistory() {
  if (!historyModeEnabled || historyEntries.length < 2) {
    return;
  }

  saveActiveHistoryEntry();

  setCombinedView(true);

  const combinedText = historyEntries
    .map(entry => entry.text)
    .join("\n");

  displayText(combinedText);
  renderHistoryTabs();
}

/* Leaves the combined preview and returns to the previously active entry. */
function leaveCombinedHistory() {
  if (!combinedViewActive) {
    return;
  }

  const activeEntry = getActiveHistoryEntry();

  setCombinedView(false);

  if (activeEntry) {
    displayText(activeEntry.text);
  }

  renderHistoryTabs();
}


/* =========================
   Event Listeners
   ========================= */

/* Processes the text as the user types. */
inputText.addEventListener("input", () => {
  refreshEditor(inputText.value);

  if (historyModeEnabled) {
    saveActiveHistoryEntry();
  }
});

/* Switch to Control menu */
controlsButton.addEventListener("click", () => {
  editorView.classList.add("hidden");
  controlsView.classList.remove("hidden");
  controlsButton.classList.add("active");
});

controlsSaveButton.addEventListener("click", () => {
  controlsView.classList.add("hidden");
  editorView.classList.remove("hidden");
  controlsButton.classList.remove("active");
});

/* Keeps the processed text and highlight layer aligned while the original text scrolls. */
inputText.addEventListener("scroll", () => {

  if (synchronisedScrollTargets.has(inputText)) {
    synchronisedScrollTargets.delete(inputText);
    return;
  }

  syncTextScroll(inputText, outputText);
});

/* Keeps the original text aligned while the processed text scrolls. */
outputText.addEventListener("scroll", () => {
  if (synchronisedScrollTargets.has(outputText)) {
    synchronisedScrollTargets.delete(outputText);
    return;
  }

  syncTextScroll(outputText, inputText);
});

/* Downloads the processed text as a plain text file. */
downloadButton.addEventListener("click", () => {
  const file = new Blob(
    [outputText.value],
    { type: "text/plain" }
  );

  const downloadUrl = URL.createObjectURL(file);
  const link = document.createElement("a");

  link.href = downloadUrl;
  link.download = "writepretty-output.txt";

  link.click();

  URL.revokeObjectURL(downloadUrl);
});

/* Copies the processed text and briefly confirms that it was copied. */
copyButton.addEventListener("click", () => {
  navigator.clipboard.writeText(outputText.value);

  copyButton.textContent = "Copied!";

  setTimeout(() => {
    copyButton.textContent = "Copy";
  }, 1500);
});

/* Turns History Mode on or off. */
historyToggleButton.addEventListener("click", () => {
  historyModeEnabled = !historyModeEnabled;

  historyToggleButton.classList.toggle(
    "active",
    historyModeEnabled
  );

  historyToggleButton.setAttribute(
    "aria-pressed",
    historyModeEnabled
  );

  historyTabs.classList.toggle(
    "hidden",
    !historyModeEnabled
  );

  /* Set up the editor when History Mode is turned on. */
  if (historyModeEnabled) {
    combinedViewActive = false;
    inputText.readOnly = false;

    /* Use the current editor text as the first history entry. */
    if (historyEntries.length === 0) {
      createHistoryEntry(inputText.value);
      return;
    }

    /* Keep edits made while History Mode was off. */
    const activeEntry = getActiveHistoryEntry();

    if (activeEntry) {
      activeEntry.text = inputText.value;
    }

    renderHistoryTabs();
    return;
  }

  /* Combined view is only available while History Mode is enabled. */
  if (combinedViewActive) {
    combinedViewActive = false;
    inputText.readOnly = false;

    const activeEntry = getActiveHistoryEntry();

    if (activeEntry) {
      displayText(activeEntry.text);
    }
  }

  renderHistoryTabs();
});

/* Creates a blank history entry when the plus button is clicked. */
newHistoryButton.addEventListener("click", () => {
  if (!historyModeEnabled) {
    return;
  }

  createHistoryEntry("");
  inputText.focus();
});

/* Creates a new history entry when pasting over existing text. */
inputText.addEventListener("paste", event => {
  if (!historyModeEnabled || inputText.value === "") {
    return;
  }

  event.preventDefault();

  const pastedText =
    event.clipboardData.getData("text");

  const selectionStart = inputText.selectionStart;
  const selectionEnd = inputText.selectionEnd;

  const currentText = inputText.value;

  const newText =
    currentText.slice(0, selectionStart) +
    pastedText +
    currentText.slice(selectionEnd);

  createHistoryEntry(newText);

  /* Place the cursor immediately after the pasted content. */
  const newCursorPosition =
    selectionStart + pastedText.length;

  inputText.setSelectionRange(
    newCursorPosition,
    newCursorPosition
  );

  inputText.focus();
});

/* Opens the combined history preview. */
combineHistoryButton.addEventListener("click", () => {
  if (combinedViewActive) {
    leaveCombinedHistory();
    return;
  }

  showCombinedHistory();
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

  /* Shorter / longer droplets */
  drop.style.height = (12 + Math.random() * 20) + "px";

  /* Slight variation in thickness */
  drop.style.width = (1 + Math.random() * 1.2) + "px";

  /* Different visibility */
  drop.style.opacity = 0.3 + Math.random() * 0.5;

  drop.style.animationDuration =
    (1.4 + Math.random() * 1.8) + "s";

  drop.style.animationDelay =
    -(Math.random() * 3) + "s";

  background.appendChild(drop);
}