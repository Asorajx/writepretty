/* =========================
   DOM Elements
   ========================= */

/* Input Screen */
const inputText = document.getElementById("inputText");
const originalPanelTitle = document.getElementById("originalPanelTitle");
const editorView = document.getElementById("editorView");

const controlsButton = document.getElementById("controlsButton");
const controlsView = document.getElementById("controlsView");
const controlsCloseButton = document.getElementById("controlsCloseButton");

const helpButton = document.getElementById("helpButton");
const helpView = document.getElementById("helpView");
const helpControlsLink = document.getElementById("helpControlsLink");

const extraSpacesControl = document.getElementById("extraSpacesControl");
const punctuationControl = document.getElementById("punctuationControl");
const capitalisationControl = document.getElementById("capitalisationControl");
const extraLineBreaksControl = document.getElementById("extraLineBreaksControl");
const headingControl = document.getElementById("headingControl");
const bulletControl = document.getElementById("bulletControl");
const numberedListControl = document.getElementById("numberedListControl");
const quoteControl = document.getElementById("quoteControl");
const emphasisControl = document.getElementById("emphasisControl");

/* Output Screen */
const outputText = document.getElementById("outputText");
const copyButton = document.getElementById("copyButton");
const downloadButton = document.getElementById("downloadButton");
const historyToggleButton = document.getElementById("historyToggleButton");

const historyTabs = document.querySelector(".history-tabs");
const historyTabList = document.getElementById("historyTabList");
const newHistoryButton = document.getElementById("newHistoryButton");
const combineHistoryButton = document.getElementById("combineHistoryButton");
const originalPanel = document.querySelector(".original-panel");

const originalWordCount = document.getElementById("originalWordCount");
const originalCharacterCount = document.getElementById("originalCharacterCount");
const wordCount = document.getElementById("wordCount");
const characterCount = document.getElementById("characterCount");


/* =========================
   Application State
   ========================= */

let historyModeEnabled = false;
const historyEntries = [];
let activeHistoryId = null;
let nextHistoryId = 1;
let combinedViewActive = false;

/* Clean up based on options selected. */
const cleanupOptions = {
  spaces: true,
  punctuation: true,
  capitalisation: true,
  extraLineBreaks: false,
  markdownHeadings: false,
  markdownBullets: false,
  markdownNumberedLists: false,
  markdownQuotes: false,
  markdownEmphasis: false
};

/* Tracks text areas moved automatically so their scroll events are not synced back. */
const synchronisedScrollTargets = new WeakSet();

/* Maximum number of history tabs allowed. */
const MAX_HISTORY_ENTRIES = 5;

/* Key used to save the current workspace in the browser. */
const AUTOSAVE_KEY = "writepretty-autosave";


/* =========================
   Main Text Processor
   ========================= */

/* Protects code, URLs, and email addresses so cleanup rules do not change them. */
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

/* Restores protected content after text cleanup is complete. */
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

/* Runs only the cleanup rules currently enabled in the Controls panel. */
function cleanText(text) {
  const protectedContent = protectMarkdownContent(text);
  let cleanedText = protectedContent.text;

  if (cleanupOptions.spaces) {
    cleanedText = removeExtraWhitespace(cleanedText);
    cleanedText = trimWhitespace(cleanedText);
  }

  if (cleanupOptions.punctuation) {
    cleanedText = fixPunctuationSpacing(cleanedText);
  }

  if (cleanupOptions.capitalisation) {
    cleanedText = correctCapitalisation(cleanedText);
  }

  if (cleanupOptions.extraLineBreaks) {
    cleanedText = removeExtraLineBreaks(cleanedText);
  }

  if (cleanupOptions.markdownQuotes) {
    cleanedText = removeMarkdownQuotes(cleanedText);
  }

  if (cleanupOptions.markdownHeadings) {
    cleanedText = removeMarkdownHeadings(cleanedText);
  }

  if (cleanupOptions.markdownBullets) {
    cleanedText = removeMarkdownBullets(cleanedText);
  }

  if (cleanupOptions.markdownNumberedLists) {
    cleanedText = removeMarkdownNumberedLists(cleanedText);
  }

  if (cleanupOptions.markdownEmphasis) {
    cleanedText = removeMarkdownEmphasis(cleanedText);
  }

  return restoreMarkdownContent(
    cleanedText,
    protectedContent.protectedParts
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

/* Removes empty lines while keeping normal single line breaks. */
function removeExtraLineBreaks(text) {
  return text.replace(
    /\n(?:[ \t]*\n)+/g,
    "\n"
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

/* Removes leading and optional closing markers from Markdown headings. */
function removeMarkdownHeadings(text) {
  return text.replace(
    /^([ \t]*)#{1,6}[ \t]+(.+?)(?:[ \t]+#+[ \t]*)?$/gm,
    "$1$2"
  );
}

/* Removes dash bullet markers while keeping the list text and indentation. */
function removeMarkdownBullets(text) {
  return text.replace(
    /^([ \t]*)-[ \t]+/gm,
    "$1"
  );
}

/* Removes Markdown numbered-list markers while keeping the item text. */
function removeMarkdownNumberedLists(text) {
  return text.replace(
    /^([ \t]*)\d+[.)][ \t]+/gm,
    "$1"
  );
}

/* Removes Markdown quote markers while keeping the quoted text. */
function removeMarkdownQuotes(text) {
  return text.replace(
    /^([ \t]*)(?:>[ \t]*)+/gm,
    "$1"
  );
}

/* Removes asterisk emphasis markers without changing the text between them. */
function removeMarkdownEmphasis(text) {
  return text
    .replace(/\*\*\*(\S(?:[^\n]*?\S)?)\*\*\*/g, "$1")
    .replace(/\*\*(\S(?:[^\n]*?\S)?)\*\*/g, "$1")
    .replace(/\*(\S(?:[^*\n]*?\S)?)\*/g, "$1");
}


/* =========================
   Editor Display Helpers
   ========================= */

/* Updates the word and character counts for a text area. */
function updateTextStats(text, wordElement, characterElement) {
  const wordMatches = text.match(
    /[A-Za-z0-9]+(?:['’-][A-Za-z0-9]+)*/g
  );

  const words = wordMatches ? wordMatches.length : 0;
  const characters = text.length;

  wordElement.textContent =
    `${words} ${words === 1 ? "word" : "words"}`;

  characterElement.textContent =
    `${characters} ${characters === 1 ? "character" : "characters"}`;
}

/* Refreshes the processed output and related editor UI. */
function refreshEditor(text) {
  outputText.value = cleanText(text);

  /* Count the original text before cleanup. */
  updateTextStats(
    text,
    originalWordCount,
    originalCharacterCount
  );

  /* Count the processed Pretty text after cleanup. */
  updateTextStats(
    outputText.value,
    wordCount,
    characterCount
  );

  updateDownloadButton();
}

/* Displays text in both editor panels and refreshes the processed output. */
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

/* Gives mouse-wheel scrolling a smooth gliding effect. */
function enableSmoothWheelScroll(element) {
  let targetScrollTop = element.scrollTop;
  let animationFrame = null;

  element.addEventListener(
    "wheel",
    event => {
      /* Keep Ctrl + wheel available for normal browser zooming. */
      if (event.ctrlKey) {
        return;
      }

      event.preventDefault();

      targetScrollTop += event.deltaY * 0.7; /* Controls how far each wheel movement travels. */

      const maxScroll =
        element.scrollHeight - element.clientHeight;

      targetScrollTop = Math.max(
        0,
        Math.min(targetScrollTop, maxScroll)
      );

      if (animationFrame === null) {
        animateScroll();
      }
    },
    { passive: false }
  );

  function animateScroll() {
    const distance =
      targetScrollTop - element.scrollTop;

    element.scrollTop += distance * 0.10; /* Controls how quickly it catches up. Higher = faster. */

    if (Math.abs(distance) < 0.5) {
      element.scrollTop = targetScrollTop;
      animationFrame = null;
      return;
    }

    animationFrame =
      requestAnimationFrame(animateScroll);
  }
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
   Controls Panel
   ========================= */

const cleanupControls = [
  { element: extraSpacesControl, option: "spaces" },
  { element: punctuationControl, option: "punctuation" },
  { element: capitalisationControl, option: "capitalisation" },
  { element: extraLineBreaksControl, option: "extraLineBreaks" },
  { element: headingControl, option: "markdownHeadings" },
  { element: bulletControl, option: "markdownBullets" },
  { element: numberedListControl, option: "markdownNumberedLists" },
  { element: quoteControl, option: "markdownQuotes" },
  { element: emphasisControl, option: "markdownEmphasis" }
];

/* Keeps the visual toggle and accessibility state in sync. */
function updateCleanupControl(element, enabled) {
  element.classList.toggle("active", enabled);
  element.setAttribute("aria-checked", enabled);
}

/* Changes one cleanup rule and immediately refreshes the Pretty output. */
function toggleCleanupOption(option, element) {
  cleanupOptions[option] = !cleanupOptions[option];

  updateCleanupControl(
    element,
    cleanupOptions[option]
  );

  refreshEditor(inputText.value);

  saveWorkspace();
}

/* Makes the existing checkbox-style controls clickable and keyboard accessible. */
function setupCleanupControls() {
  cleanupControls.forEach(({ element, option }) => {
    element.setAttribute("role", "checkbox");
    element.setAttribute("tabindex", "0");

    updateCleanupControl(
      element,
      cleanupOptions[option]
    );

    element.addEventListener("click", () => {
      toggleCleanupOption(option, element);
    });

    element.addEventListener("keydown", event => {
      if (event.key !== "Enter" && event.key !== " ") {
        return;
      }

      event.preventDefault();
      toggleCleanupOption(option, element);
    });
  });
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
    tab.dataset.tooltip = `Open history entry ${index + 1}`;

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
    deleteButton.dataset.tooltip = `Delete history entry ${index + 1}`;

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
  saveWorkspace();
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
  saveWorkspace();
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

      saveWorkspace();
      return;
    }

    const combinedText = historyEntries
      .map(entry => entry.text)
      .join("\n");

    displayText(combinedText);
    renderHistoryTabs();
    saveWorkspace();
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
  saveWorkspace();
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
   Local Autosave
   ========================= */

/* Saves the current workspace to the browser. */
function saveWorkspace() {
  const workspace = {
    currentText: inputText.value,
    historyModeEnabled,
    historyEntries,
    activeHistoryId,
    cleanupOptions
  };

  try {
    localStorage.setItem(
      AUTOSAVE_KEY,
      JSON.stringify(workspace)
    );
  } catch (error) {
    console.warn("WritePretty could not save the workspace.", error);
  }
}

/* Restores the previously saved workspace when WritePretty opens. */
function loadWorkspace() {
  let savedWorkspace;

  try {
    const savedData =
      localStorage.getItem(AUTOSAVE_KEY);

    if (!savedData) {
      refreshEditor(inputText.value);
      renderHistoryTabs();
      return;
    }

    savedWorkspace = JSON.parse(savedData);
  } catch (error) {
    console.warn("WritePretty could not restore the workspace.", error);

    refreshEditor(inputText.value);
    renderHistoryTabs();
    return;
  }

  /* Restore cleanup settings that still exist in the current version. */
  if (
    savedWorkspace.cleanupOptions &&
    typeof savedWorkspace.cleanupOptions === "object"
  ) {
    Object.keys(cleanupOptions).forEach(option => {
      if (
        typeof savedWorkspace.cleanupOptions[option] === "boolean"
      ) {
        cleanupOptions[option] =
          savedWorkspace.cleanupOptions[option];
      }
    });
  }

  /* Restore saved History Mode entries. */
  if (Array.isArray(savedWorkspace.historyEntries)) {
    const validEntries =
      savedWorkspace.historyEntries
        .filter(entry =>
          Number.isInteger(entry.id) &&
          typeof entry.text === "string"
        )
        .slice(0, MAX_HISTORY_ENTRIES);

    historyEntries.push(...validEntries);
  }

  /* Restore the next available history ID. */
  if (historyEntries.length > 0) {
    nextHistoryId =
      Math.max(
        ...historyEntries.map(entry => entry.id)
      ) + 1;
  }

  historyModeEnabled =
    savedWorkspace.historyModeEnabled === true;

  /* Restore the previously active history entry where possible. */
  const savedActiveEntry =
    historyEntries.find(
      entry =>
        entry.id === savedWorkspace.activeHistoryId
    );

  if (savedActiveEntry) {
    activeHistoryId = savedActiveEntry.id;
  } else if (historyEntries.length > 0) {
    activeHistoryId = historyEntries[0].id;
  }

  /* Combined View is temporary, return to a normal editor view. */
  combinedViewActive = false;
  inputText.readOnly = false;

  originalPanel.classList.remove(
    "combined-preview"
  );

  /* Restore the History button and rail. */
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

  /* Restore the correct text in the editor. */
  if (historyModeEnabled && savedActiveEntry) {
    displayText(savedActiveEntry.text);
  } else if (
    historyModeEnabled &&
    historyEntries.length > 0
  ) {
    displayText(historyEntries[0].text);
  } else {
    displayText(
      typeof savedWorkspace.currentText === "string"
        ? savedWorkspace.currentText
        : ""
    );
  }

  renderHistoryTabs();
}


/* =========================
   Event Listeners
   ========================= */

/* Enables smooth mouse-wheel scrolling for both text areas. */
enableSmoothWheelScroll(inputText);
enableSmoothWheelScroll(outputText);

/* Restore saved text, history, and cleanup settings. */
loadWorkspace();

setupCleanupControls();

/* Processes the text as the user types. */
inputText.addEventListener("input", () => {
  refreshEditor(inputText.value);

  if (historyModeEnabled) {
    saveActiveHistoryEntry();
  }

  saveWorkspace();
});

/* Opens the Controls panel without changing the current text. */
controlsButton.addEventListener("click", () => {
  editorView.classList.add("hidden");
  helpView.classList.add("hidden");
  controlsView.classList.remove("hidden");

  controlsButton.classList.add("active");
  helpButton.classList.remove("active");

  originalPanelTitle.textContent = "Controls";
});

/* Closes the Controls panel and returns to the editor. */
controlsCloseButton.addEventListener("click", () => {
  controlsView.classList.add("hidden");
  editorView.classList.remove("hidden");

  controlsButton.classList.remove("active");

  originalPanelTitle.textContent = "Original";
});

/* Opens and closes the Help view. */
helpButton.addEventListener("click", () => {
  const helpIsOpen =
    !helpView.classList.contains("hidden");

  /* Return to the editor when Help is clicked again. */
  if (helpIsOpen) {
    helpView.classList.add("hidden");
    editorView.classList.remove("hidden");

    helpButton.classList.remove("active");
    originalPanelTitle.textContent = "Original";

    return;
  }

  /* Hide the other views before opening Help. */
  editorView.classList.add("hidden");
  controlsView.classList.add("hidden");
  helpView.classList.remove("hidden");

  controlsButton.classList.remove("active");
  helpButton.classList.add("active");

  originalPanelTitle.textContent = "Help";
});

/* Opens Controls directly from the Help description. */
helpControlsLink.addEventListener("click", () => {
  helpView.classList.add("hidden");
  editorView.classList.add("hidden");
  controlsView.classList.remove("hidden");

  helpButton.classList.remove("active");
  controlsButton.classList.add("active");

  originalPanelTitle.textContent = "Controls";
});

/* Keeps the processed text aligned while the original text scrolls. */
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
    saveWorkspace();
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
  saveWorkspace();
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

  drop.style.height = (12 + Math.random() * 20) + "px";
  drop.style.width = (1 + Math.random() * 1.2) + "px";
  drop.style.opacity = 0.3 + Math.random() * 0.5;

  drop.style.animationDuration =
    (1.4 + Math.random() * 1.8) + "s";

  drop.style.animationDelay =
    -(Math.random() * 3) + "s";

  background.appendChild(drop);
}