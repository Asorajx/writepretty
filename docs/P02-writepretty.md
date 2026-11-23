# Write Pretty

Personal Project 02

30th September 2026

## 1. Overview

WritePretty is a lightweight text cleanup tool that improves the consistency and readability of written text using simple, rule-based processing.

It can clean spacing and punctuation, correct clear capitalisation issues, remove selected Markdown formatting, and use the browser's built-in spellcheck to help identify possible spelling mistakes.

WritePretty does not use AI to rewrite the user's text. Its purpose is to make small, predictable improvements while preserving the user's original wording.

### 1.1 Problem

Many users write content in plain text or Markdown but spend extra time manually fixing:

- spelling mistakes
- inconsistent capitalisation
- spacing and punctuation issues
- unnecessary line breaks
- unwanted Markdown formatting

Many existing tools focus on grammar improvement or AI rewriting when only simple, predictable cleanup may be needed.

### 1.2 Solution

WritePretty is a lightweight text formatting and correction tool that improves text consistency and readability without using AI. The tool:

- corrects clear spacing, punctuation, and capitalisation issues
- allows users to enable or disable individual cleanup rules
- optionally removes selected Markdown formatting and extra line breaks
- uses the browser's built-in spellcheck for spelling detection
- protects code, URLs, and email addresses from normal cleanup
- preserves the user's original wording

### 1.3 Goals

The main goals of WritePretty are to:

- reduce time spent on simple text cleanup
- keep text processing easy to understand
- produce predictable results
- preserve the user's original wording and structure
- give users control over which cleanup rules are applied
- keep user text private by processing it locally

### 1.4 Features

| Test Input | Description |
|---|---|
| **Text Cleanup** | Removes unnecessary spacing and fixes clear punctuation and capitalisation issues. |
| **Processing Controls** | Allows users to enable or disable cleanup rules, including optional Markdown and line-break removal. |
| **Browser Spellcheck** | Uses the browser's built-in spellcheck to identify possible spelling mistakes. |
| **Protected Content** | Avoids changing explicit URLs, email addresses, inline code, and code blocks. |
| **Side-by-Side View** | Shows the Original and Pretty text together for easy comparison. |
| **History Mode** | Stores up to five text entries and allows users to switch between or combine them. |
| **Synchronised Scrolling** | Keeps the Original and Pretty panels at approximately the same scroll position. |
| **Text Statistics** | Displays word and character counts for both Original and Pretty text. |
| **Help & Tooltips** | Provides built-in guidance and explanations for buttons and controls. |
| **Copy & Download** | Allows the processed text to be copied or downloaded as a text file. |
| **Responsive Layout** | Adapts the interface for smaller screens and mobile devices. |
| **Local Autosave** | Saves the current text, History Mode entries, active history entry, and cleanup settings in the browser and restores them when the page is reopened. |
| **Workspace Reset** | Clears saved text, history, and cleanup settings and restores WritePretty to its default state after confirmation. |
| **Local Processing** | Processes user text directly in the browser. |

## 2. Scope

### 2.1 In Scope

- English text input and processing
- spacing and punctuation cleanup
- clear capitalisation correction
- browser-based spelling detection
- user-selectable cleanup controls
- optional removal of extra line breaks
- optional removal of selected Markdown formatting
- protection of code, explicit URLs, and email addresses
- side-by-side comparison
- History Mode
- combined history preview
- synchronised scrolling
- word and character counts for Original and Pretty text
- copying processed text
- downloading processed text
- Help guidance and tooltips
- responsive layout for smaller screens
- local autosave of text, History Mode entries, and cleanup settings
- restoration of the previous workspace after reopening or refreshing the page
- local browser-based processing

### 2.2 Out of Scope

The current version does not provide:

- AI-based rewriting
- advanced grammar correction
- automatic spelling correction
- content generation
- plagiarism detection
- languages other than English
- cloud document storage
- user accounts

## 3. Requirements

### 3.1 Functional Requirements

- Allow users to enter or paste text
- Process text automatically as the user types
- Correct clear spacing, punctuation, and capitalisation issues
- Allow individual cleanup rules to be enabled or disabled
- Allow optional removal of extra line breaks
- Allow optional removal of selected Markdown formatting
- Use the browser's built-in spellcheck for spelling detection
- Protect inline code, fenced code blocks, indented code, explicit URLs, and email addresses
- Display the original and processed text side by side
- Display word and character counts for both Original and Pretty text
- Allow up to five History Mode entries
- Allow users to switch between, delete, and combine history entries
- Keep both text panels synchronised while scrolling
- Allow users to copy processed text
- Allow users to download processed text as a .txt file
- Provide Help information and tooltips
- Adapt the interface for smaller screens
- Automatically save the current text, History Mode entries, active history entry, and cleanup settings in the browser
- Restore the saved workspace after refreshing or reopening the page
- Allow users to reset text, history, and cleanup settings to their defaults
- Require confirmation before performing a workspace reset

### 3.2 Non-Functional Requirements

- Respond quickly for normal text inputs
- Have a simple interface
- Process user text locally
- Give the same result for the same input and settings
- Avoid unnecessary changes to user content
- Remain easy to maintain and extend
- Work in modern web browsers
- Remain usable on smaller screen sizes

## 4. Setup & Design

### 4.1 Technology Stack

WritePretty is a client-side web application built with:

- HTML for application structure
- CSS for styling and responsive behaviour
- JavaScript for text processing and interaction
- the browser's built-in spellcheck for spelling detection
- the Web Storage API (localStorage) for local workspace persistence

### 4.2 System Architecture

- WritePretty uses a simple browser-based processing flow: User Input → Selected Cleanup Rules → Rule-Based Processing → Processed Output → User Review
- Text cleanup is performed in the browser and updates when the user types or changes a cleanup control.
- Browser spellcheck operates independently from WritePretty's cleanup rules.
- Workspace state is stored locally in the browser so text, History Mode entries, and cleanup settings can be restored between sessions.

### 4.3 Design Decisions

- User text is processed in the browser instead of being sent to an AI rewriting service.
- Rule-based processing is used to produce predictable and consistent results.
- Only clear issues are changed automatically. Text is left unchanged when the intended correction is uncertain.
- Spelling detection is handled by the browser instead of a custom spelling system.
- Spelling mistakes are not automatically replaced because the intended word may not always be clear.
- Cleanup rules can be individually enabled or disabled so users control how their text is processed.
- Markdown formatting and extra line breaks are preserved by default and are only removed when the corresponding controls are enabled.
- Code, URLs, and email addresses are protected where possible so cleanup rules do not accidentally change meaningful content.
- The Original and Pretty panels allow users to review changes before copying or downloading the result.
- Workspace data is saved using browser local storage so autosave can work without requiring user accounts or cloud storage.
- Reset requires confirmation because it permanently clears the locally saved workspace and restores the default settings.

## 5. Limitations & Risks

WritePretty has several limitations due to its rule-based approach:

- The system cannot understand sentence meaning or context as deeply as a grammar or AI writing tool.
- Complex grammar errors are outside the current scope.
- Only English is currently supported.
- Spelling detection depends on the browser and may vary between browsers, operating systems, and user settings.
- Names, brands, technical terms, or uncommon words may be marked as misspelled by the browser.
- Bare domains such as “example.com” may sometimes be treated like normal punctuation because they do not contain an explicit URL prefix.
- Code is protected from cleanup, which means issues inside protected code are intentionally left unchanged.
- Optional Markdown and line-break removal can change document structure when enabled.
- A single line break by itself is not treated as the start of a new sentence.
- Rule-based processing may occasionally make an incorrect change or fail to detect an issue.
- Autosaved workspace data is stored only in the current browser and may be lost if browser storage is cleared.

## 6. Testings and Findings

Screenshots referenced as Figures are in [P02-test-results.pdf](P02-test-results.pdf).

## 7. Challenges

| Challenges | How it was handled |
|---|---|
| It can be difficult to know when capitalisation is definitely wrong. | Only clear cases are corrected automatically, while uncertain cases are left unchanged. |
| The original custom spelling and highlighting system became too complex for the scope of the project. | The implementation was simplified by using the browser's built-in spellcheck instead. |
| Normal cleanup rules can accidentally change Markdown or code. | Code and other protected content are temporarily excluded from normal cleanup. |
| It was difficult to tell whether unusual spacing was accidental or intentional. | Conservative formatting rules are used, while more structural cleanup is kept optional. |
| Bare domains such as “example.com” can look like punctuation mistakes. | Explicit URLs and email addresses are protected, while bare domains remain a known limitation. |

## 8. Improvements

- **Custom Terms**
  - Let users define preferred spellings or capitalisation for names, brands, and technical terms.
  - Detect inconsistent use of those terms.
- **Spelling Suggestions**
  - Show possible replacements for spelling mistakes while leaving the final choice to the user.
- **Additional Cleanup Rules**
  - Add more optional cleanup rules where they can be applied predictably.
- **Accessibility Improvements**
  - Continue improving keyboard and screen-reader support.
  - Improve tooltip behaviour on touch devices where needed.
