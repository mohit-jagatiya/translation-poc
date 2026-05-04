// API Keys moved to Node.js backend (.env)

// Language Data Mapping
const languages = [
  { code: "AR", name: "Arabic", iso: "ara", engine: "gpt" },
  { code: "EN", name: "English", iso: "eng", engine: "deepl" },
  { code: "FR", name: "French", iso: "fre", engine: "deepl" },
  { code: "IT", name: "Italian", iso: "ita", engine: "deepl" },
  { code: "JP", name: "Japanese", iso: "jpn", engine: "deepl" },
  { code: "KO", name: "Korean", iso: "kor", engine: "deepl" },
  { code: "PL", name: "Polish", iso: "pol", engine: "deepl" },
  { code: "RO", name: "Romanian", iso: "rum", engine: "deepl" },
  { code: "RU", name: "Russian", iso: "rus", engine: "deepl" },
  { code: "SE", name: "Spanish", iso: "spa", engine: "deepl" },
  { code: "VI", name: "Vietnamese", iso: "vie", engine: "gpt" },
  { code: "SO", name: "Somali", iso: "som", engine: "gpt" },
  { code: "CM", name: "Mandarin (Simplified)", iso: "chi", engine: "deepl" },
  { code: "CT", name: "Mandarin (Traditional)", iso: "zh-tw", engine: "deepl" },
  { code: "CC", name: "Cantonese", iso: "zh-tw-c", engine: "gpt" },
  { code: "BN", name: "Bengali", iso: "ben", engine: "gpt" },
  { code: "MY", name: "Burmese", iso: "bur", engine: "gpt" },
  { code: "FA", name: "Farsi", iso: "per", engine: "gpt" },
  { code: "HT", name: "Haitian Creole", iso: "hat", engine: "gpt" },
  { code: "PB", name: "Portuguese (Brazil)", iso: "por", engine: "deepl" },
  { code: "SH", name: "Swahili", iso: "swa", engine: "gpt" },
  { code: "YI", name: "Yiddish", iso: "yid", engine: "gpt" },
  { code: "KR", name: "Karen", iso: "kar", engine: "gpt" },
  { code: "KM", name: "Khmer", iso: "khm", engine: "gpt" },
  { code: "TL", name: "Tagalog", iso: "tgl", engine: "gpt" },
  { code: "HM", name: "Hmong: White", iso: "hmn", engine: "gpt" },
  { code: "AM", name: "Amharic", iso: "amh", engine: "gpt" },
  { code: "HY", name: "Armenian", iso: "arm", engine: "gpt" },
  { code: "NE", name: "Nepali", iso: "nep", engine: "gpt" },
  { code: "PS", name: "Pashto", iso: "pus", engine: "gpt" },
  { code: "MU", name: "Burmese (U)", iso: "myu", engine: "gpt" },
  { code: "LO", name: "Laotian", iso: "lao", engine: "gpt" },
];

let uploadedData = [];
let translatedData = [];
let selectedLanguage = null;

// DOM Elements
const langSelect = document.getElementById("language-select");
const fileInput = document.getElementById("csv-file");
const dropZone = document.getElementById("drop-zone");
const translateBtn = document.getElementById("translate-btn");
const downloadBtn = document.getElementById("download-btn");
const emptyState = document.getElementById("empty-state");
const tableContainer = document.getElementById("table-container");
const tableBody = document.getElementById("table-body");
const modal = document.getElementById("progress-modal");
const progressBar = document.getElementById("progress-bar");
const progressText = document.getElementById("progress-text");

// Initialize Dropdown
function initDropdown() {
  languages
    .sort((a, b) => a.name.localeCompare(b.name))
    .forEach((lang) => {
      const option = document.createElement("option");
      option.value = lang.code;
      option.textContent = `${lang.name} (${lang.code}) - ${lang.engine === "deepl" ? "DeepL" : "GPT-4o"}`;
      langSelect.appendChild(option);
    });
}

// Event Listeners
langSelect.addEventListener("change", (e) => {
  selectedLanguage = languages.find((l) => l.code === e.target.value);
  checkReadyState();
});

fileInput.addEventListener("change", handleFileUpload);
dropZone.addEventListener("dragover", (e) => {
  e.preventDefault();
  dropZone.classList.add("dragover");
});
dropZone.addEventListener("dragleave", () =>
  dropZone.classList.remove("dragover"),
);
dropZone.addEventListener("drop", (e) => {
  e.preventDefault();
  dropZone.classList.remove("dragover");
  if (e.dataTransfer.files.length) {
    fileInput.files = e.dataTransfer.files;
    handleFileUpload();
  }
});

translateBtn.addEventListener("click", startTranslationReal);
downloadBtn.addEventListener("click", downloadCSV);

function handleFileUpload() {
  const file = fileInput.files[0];
  if (!file) return;

  // Update UI
  const uploadText = dropZone.querySelector("p");
  uploadText.innerHTML = `Loaded: <span class="file-name-display">${file.name}</span>`;

  // Parse CSV using PapaParse
  Papa.parse(file, {
    header: true,
    skipEmptyLines: true,
    complete: function (results) {
      // Filter to only rows that have Label_Code and Label_Text
      uploadedData = results.data.filter(
        (row) => row.Label_Code && row.Label_Text,
      );
      checkReadyState();
    },
  });
}

function checkReadyState() {
  if (selectedLanguage && uploadedData.length > 0) {
    translateBtn.disabled = false;
  } else {
    translateBtn.disabled = true;
  }
}

// Live Translation Process
async function startTranslationReal() {
  translateBtn.disabled = true;
  translateBtn.querySelector(".btn-text").style.display = "none";
  translateBtn.querySelector(".spinner").style.display = "block";

  modal.style.display = "flex";
  translatedData = [];
  tableBody.innerHTML = ""; // clear table

  // Set Header Info
  document.getElementById("total-rows").textContent = uploadedData.length;
  document.getElementById("target-lang-display").textContent =
    selectedLanguage.name;

  const engineDisplay = document.getElementById("active-engine-display");
  if (selectedLanguage.engine === "deepl") {
    engineDisplay.textContent = "DeepL Pro (Glossary)";
    engineDisplay.className = "stat-value engine-value engine-deepl";
  } else {
    engineDisplay.textContent = "OpenAI GPT-4o";
    engineDisplay.className = "stat-value engine-value engine-gpt";
  }

  // Mock processing with artificial delay
  const total = uploadedData.length;
  const batchSize = Math.ceil(total / 20); // 20 UI updates

  for (let i = 0; i < total; i++) {
    const row = uploadedData[i];
    // console.log(selectedLanguage);

    // Live fetch call to the respective API
    const translatedText = await realTranslate(
      row.Label_Text,
      selectedLanguage,
    );
    // console.log(translatedText);
    translatedData.push({
      Label_Code: row.Label_Code,
      Label_Text: row.Label_Text,
      Converted: translatedText,
      Target_Lang: selectedLanguage.code,
    });

    // Add slight delay to prevent 429 Too Many Requests
    await new Promise((r) => setTimeout(r, 250));

    // Update Progress UI occasionally
    if (i % batchSize === 0 || i === total - 1) {
      const percent = Math.round(((i + 1) / total) * 100);
      progressBar.style.width = `${percent}%`;
      progressText.textContent = `Routing to ${selectedLanguage.engine === "deepl" ? "DeepL" : "GPT-4o"}... ${i + 1}/${total} rows`;
    }
  }

  // Finish
  setTimeout(() => {
    modal.style.display = "none";
    translateBtn.querySelector(".btn-text").style.display = "block";
    translateBtn.querySelector(".spinner").style.display = "none";
    translateBtn.disabled = false;

    renderTable();

    emptyState.style.display = "none";
    tableContainer.style.display = "block";
    downloadBtn.style.display = "flex";
  }, 500);
}

async function realTranslate(text, langInfo) {
  if (!text) return "";

  try {
    const response = await fetch("/api/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: text,
        langInfo: langInfo
      })
    });

    const data = await response.json();
    
    if (!response.ok) {
      return `[API Error] ${data.error || "Unknown Error"}`;
    }

    return data.translatedText;
  } catch (e) {
    return `[Fetch Error] Ensure Node.js server is running (node server.js). Details: ${e.message}`;
  }
}

function renderTable() {
  // Render top 100 to avoid locking the DOM for massive files
  const displayData = translatedData.slice(0, 100);

  displayData.forEach((row) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
            <td><span class="label-code">${row.Label_Code}</span></td>
            <td>${row.Label_Text}</td>
            <td style="color: var(--accent-blue);">${row.Converted}</td>
            <td><span class="status-badge status-done">Success</span></td>
        `;
    tableBody.appendChild(tr);
  });

  if (translatedData.length > 100) {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td colspan="4" style="text-align:center; color: var(--text-secondary);">Showing 100 of ${translatedData.length} rows...</td>`;
    tableBody.appendChild(tr);
  }
}

function downloadCSV() {
  if (translatedData.length === 0) return;

  // We want Output: Generated translated file
  // Naming format: output_file
  // "Ensure proper language-wise mapping (e.g., Korean and other languages using language codes)"

  // Format for CSV: Label_Code, Label_Text, [TargetLangCode]
  const csvData = translatedData.map((row) => {
    const obj = {
      Label_Code: row.Label_Code,
      Label_Text: row.Label_Text,
    };
    obj[selectedLanguage.code] = row.Converted; // Map language code column
    return obj;
  });

  const csvStr = Papa.unparse(csvData);
  const blob = new Blob([csvStr], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = `output_file_${selectedLanguage.code}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

// Initialize
initDropdown();
