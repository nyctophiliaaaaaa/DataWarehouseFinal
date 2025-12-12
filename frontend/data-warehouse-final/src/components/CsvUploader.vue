<template>
  <div class="min-h-screen bg-pink-200 flex flex-col items-center justify-center px-4 relative">
    
    <div class="absolute top-6 left-6">
      <h2 class="text-black text-2xl font-bold tracking-wider">ELT SYSTEM</h2>
    </div>

    <h1 class="text-black text-4xl font-bold mb-8">Upload CSV Files</h1>

    <div
      class="flex flex-col items-center transition-all duration-300 w-full max-w-xl"
      @dragover.prevent="isDragging = true"
      @dragleave.prevent="isDragging = false"
      @drop.prevent="handleDrop"
      :class="{ 'scale-105': isDragging }"
    >
      <div
        class="bg-green-600 w-80 h-24 rounded-3xl flex items-center justify-center text-white text-2xl font-semibold cursor-pointer shadow-lg hover:bg-green-700 transition-colors z-10"
        @click="triggerFileInput"
      >
        Select Files
      </div>

      <input
        type="file"
        ref="fileInput"
        class="hidden"
        accept=".csv"
        multiple
        @change="handleFileSelect"
      />

      <div v-if="selectedFiles.length > 0" class="mt-6 w-full flex flex-col gap-2 max-h-60 overflow-y-auto px-2 custom-scrollbar">
        
        <div class="flex justify-between items-center px-2 mb-1">
          <span class="text-black font-bold text-sm">{{ selectedFiles.length }} file(s) selected</span>
          <button @click="selectedFiles = []" class="text-red-600 text-xs font-bold hover:underline">Clear All</button>
        </div>

        <div 
          v-for="(file, index) in selectedFiles" 
          :key="index" 
          class="bg-white/40 px-4 py-3 rounded-xl border border-white/50 flex justify-between items-center animate-slide-up shadow-sm"
        >
          <div class="flex items-center gap-3 overflow-hidden">
            <span class="text-xl">📄</span>
            <div class="flex flex-col">
              <span class="text-black font-bold truncate max-w-[200px]">{{ file.name }}</span>
              <span class="text-black/50 text-xs font-medium">{{ (file.size / 1024).toFixed(1) }} KB</span>
            </div>
          </div>
          <button 
            @click="removeFile(index)" 
            class="text-red-500 hover:text-red-700 hover:bg-red-100 rounded-full w-8 h-8 flex items-center justify-center font-bold transition-colors"
          >
            ✕
          </button>
        </div>
      </div>

      <p v-else class="text-black mt-3 text-lg opacity-60 font-medium">
        {{ isDragging ? "Drop them now!" : "or drop files here" }}
      </p>
    </div>

    <div class="flex gap-6 mt-8">
      <button
        class="bg-green-600 text-white px-8 py-3 rounded-full text-lg font-semibold shadow-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-transform active:scale-95"
        @click="uploadFile"
        :disabled="selectedFiles.length === 0"
      >
        Upload
      </button>

      <button
        class="bg-green-600 text-white px-8 py-3 rounded-full text-lg font-semibold shadow-md hover:bg-green-700 transition-transform active:scale-95"
        @click="cleanData"
      >
        Clean
      </button>

      <button
        class="bg-green-600 text-white px-8 py-3 rounded-full text-lg font-semibold shadow-md hover:bg-green-700 transition-transform active:scale-95"
        @click="loadData"
      >
        Load
      </button>
    </div>

    <div class="fixed bottom-5 right-5 flex flex-col gap-3 z-50">
      <TransitionGroup name="toast">
        <div
          v-for="note in notifications"
          :key="note.id"
          class="flex items-center gap-3 px-6 py-4 rounded-xl shadow-xl text-white font-medium min-w-[300px]"
          :class="{
            'bg-green-700': note.type === 'success',
            'bg-red-500': note.type === 'error',
            'bg-blue-600': note.type === 'info'
          }"
        >
          <span v-if="note.type === 'success'" class="text-xl">✓</span>
          <span v-if="note.type === 'error'" class="text-xl">✕</span>
          <span v-if="note.type === 'info'" class="text-xl">ℹ</span>
          
          <div class="flex flex-col">
             <span class="text-sm opacity-90">{{ note.message }}</span>
          </div>
        </div>
      </TransitionGroup>
    </div>

  </div>
</template>

<script setup>
import { ref } from "vue";

// State
const fileInput = ref(null);
const selectedFiles = ref([]); 
const isDragging = ref(false);
const notifications = ref([]);

// NEW: Simulates if a file exists in the database
const isDataUploaded = ref(false); 

// --- Notification Logic ---
function notify(message, type = 'success') {
  const id = Date.now() + Math.random();
  notifications.value.push({ id, message, type });
  setTimeout(() => {
    notifications.value = notifications.value.filter(n => n.id !== id);
  }, 3000);
}

// --- File Handling ---
function triggerFileInput() {
  fileInput.value.click();
}

function handleFileSelect(event) {
  const files = Array.from(event.target.files);
  processFiles(files);
  event.target.value = "";
}

function handleDrop(event) {
  isDragging.value = false;
  const files = Array.from(event.dataTransfer.files);
  processFiles(files);
}

function processFiles(files) {
  if (!files || files.length === 0) return;

  let addedCount = 0;
  let errorCount = 0;

  files.forEach(file => {
    if (file.type !== "text/csv" && !file.name.endsWith(".csv")) {
      errorCount++;
    } else {
      const isDuplicate = selectedFiles.value.some(f => f.name === file.name);
      if (!isDuplicate) {
        selectedFiles.value.push(file);
        addedCount++;
      }
    }
  });

  if (errorCount > 0) notify(`${errorCount} file(s) skipped (Not CSV).`, "error");
  if (addedCount > 0) notify(`${addedCount} file(s) added.`, "info");
}

function removeFile(index) {
  selectedFiles.value.splice(index, 1);
}

// --- Button Actions ---

// 1. Upload Logic
async function uploadFile() {
  if (selectedFiles.value.length === 0) return;
  
  notify(`Uploading ${selectedFiles.value.length} files...`, "info");
  
  await new Promise(r => setTimeout(r, 1500));
  
  // SUCCESS: Mark data as uploaded
  isDataUploaded.value = true;
  notify("Files uploaded to database successfully!", "success");
  
  // Optional: Clear list after upload so we can test the "Clean without files" feature
  // selectedFiles.value = []; 
}

// 2. Clean Logic
async function cleanData() {
  // Scenario A: Files are currently in the list
  if (selectedFiles.value.length > 0) {
    notify(`Cleaning newly selected files...`, "info");
    await new Promise(r => setTimeout(r, 2000));
    notify("Cleaning complete!", "success");
    return;
  }

  // Scenario B: No files in list, check database
  if (isDataUploaded.value) {
    notify("Cleaning uploaded data from database...", "info");
    await new Promise(r => setTimeout(r, 2000));
    notify("Database cleaning complete!", "success");
  } 
  // Scenario C: No files, No database data
  else {
    notify("No data/file uploaded to clean.", "error");
  }
}

// 3. Load Logic
async function loadData() {
  // Scenario A: Files are currently in the list
  if (selectedFiles.value.length > 0) {
    notify("Loading selected files...", "info");
    await new Promise(r => setTimeout(r, 1500));
    notify("Loading complete!", "success");
    return;
  }

  // Scenario B: No files in list, check database
  if (isDataUploaded.value) {
    notify("Loading existing data from database...", "info");
    await new Promise(r => setTimeout(r, 1500));
    notify("Database load complete!", "success");
  } 
  // Scenario C: No files, No database data
  else {
    notify("No data/file uploaded to load.", "error");
  }
}
</script>

<style>
/* Transitions */
.toast-enter-active,
.toast-leave-active {
  transition: all 0.4s ease;
}
.toast-enter-from {
  opacity: 0;
  transform: translateX(30px);
}
.toast-leave-to {
  opacity: 0;
  transform: translateX(30px);
}

/* Slide Up Animation */
.animate-slide-up {
  animation: slideUp 0.3s ease-out;
}
@keyframes slideUp {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

/* Custom Scrollbar */
.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.1);
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.2);
  border-radius: 10px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: rgba(0, 0, 0, 0.4);
}
</style>