<template>
  <div class="min-h-screen bg-pink-200 flex flex-col items-center justify-center px-4 relative">
    
    <div class="absolute top-6 left-6">
      <h2 class="text-black text-2xl font-bold tracking-wider">ETL SYSTEM</h2>
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
          <button @click="clearFiles" class="text-red-600 text-xs font-bold hover:underline">Clear All</button>
        </div>

        <div v-for="(file, index) in selectedFiles" :key="index" class="bg-white/40 px-4 py-3 rounded-xl border border-white/50 flex justify-between items-center animate-slide-up shadow-sm">
          <div class="flex items-center gap-3 overflow-hidden">
            <span class="text-xl">📄</span>
            <div class="flex flex-col">
              <span class="text-black font-bold truncate max-w-[200px]">{{ file.name }}</span>
              <span class="text-black/50 text-xs font-medium">{{ (file.size / 1024).toFixed(1) }} KB</span>
            </div>
          </div>
          <button @click="removeFile(index)" class="text-red-500 hover:text-red-700 hover:bg-red-100 rounded-full w-8 h-8 flex items-center justify-center font-bold transition-colors">✕</button>
        </div>
      </div>

      <p v-else class="text-black mt-3 text-lg opacity-60 font-medium">
        {{ isDragging ? "Drop them now!" : "or drop files here" }}
      </p>
    </div>

    <div class="flex gap-6 mt-8">
      
      <button
        class="bg-green-600 text-white px-8 py-3 rounded-full text-lg font-semibold shadow-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-transform active:scale-95"
        @click="uploadFiles"
        :disabled="selectedFiles.length === 0 || isLoading"
      >
        {{ isLoading && currentStep === 'upload' ? '⏳ Uploading...' : 'Upload' }}
      </button>

      <button
        class="bg-green-600 text-white px-8 py-3 rounded-full text-lg font-semibold shadow-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-transform active:scale-95"
        @click="cleanData"
        :disabled="!isUploaded || isLoading"
      >
        {{ isLoading && currentStep === 'clean' ? '⏳ Cleaning...' : 'Clean' }}
      </button>

      <button
        class="bg-green-600 text-white px-8 py-3 rounded-full text-lg font-semibold shadow-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-transform active:scale-95"
        @click="loadData"
        :disabled="!isCleaned || isLoading"
      >
        {{ isLoading && currentStep === 'load' ? '⏳ Loading...' : 'Load' }}
      </button>
    </div>

    <div v-if="uploadedFiles.length > 0" class="mt-8 w-full max-w-xl bg-white/40 rounded-xl p-4">
      <h3 class="text-black font-bold mb-3">✅ Uploaded Files:</h3>
      <div v-for="(file, index) in uploadedFiles" :key="index" class="mb-2 text-sm">
        <p class="text-black"><strong>{{ file.name }}</strong></p>
        <a :href="file.url" target="_blank" class="text-blue-600 hover:underline">View File</a>
      </div>
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
          <span class="text-sm opacity-90">{{ note.message }}</span>
        </div>
      </TransitionGroup>
    </div>

  </div>
</template>

<script setup>
import { ref } from "vue";
import apiService from "../services/api";

// State
const fileInput = ref(null);
const selectedFiles = ref([]);
const uploadedFiles = ref([]);
const isDragging = ref(false);
const notifications = ref([]);
const isLoading = ref(false);
const currentStep = ref(''); // Tracks which action is happening ('upload', 'clean', 'load')

// --- ✨ NEW STATE VARIABLES FOR BUTTON LOCKING ✨ ---
const isUploaded = ref(false); // True only after successful upload
const isCleaned = ref(false);  // True only after successful clean

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
  processFiles(Array.from(event.target.files));
  event.target.value = "";
}

function handleDrop(event) {
  isDragging.value = false;
  processFiles(Array.from(event.dataTransfer.files));
}

function processFiles(files) {
  if (!files.length) return;
  
  // Reset progress if new files are added
  resetProgress();

  files.forEach(file => {
    if (file.type === "text/csv" || file.name.endsWith(".csv")) {
      if (!selectedFiles.value.some(f => f.name === file.name)) {
        selectedFiles.value.push(file);
      }
    } else {
      notify(`Skipped non-CSV file: ${file.name}`, "error");
    }
  });
}

function removeFile(index) {
  selectedFiles.value.splice(index, 1);
  resetProgress(); // Reset if user changes file list
}

function clearFiles() {
  selectedFiles.value = [];
  uploadedFiles.value = [];
  resetProgress();
}

// Reset the button locks
function resetProgress() {
  isUploaded.value = false;
  isCleaned.value = false;
}

// --- API Actions ---

async function uploadFiles() {
  if (selectedFiles.value.length === 0) return;

  isLoading.value = true;
  currentStep.value = 'upload';
  notify(`Uploading files...`, "info");

  let successCount = 0;

  for (const file of selectedFiles.value) {
    try {
      const result = await apiService.uploadFile(file);
      uploadedFiles.value.push(result.file);
      successCount++;
    } catch (error) {
      notify(`Failed to upload ${file.name}`, "error");
    }
  }

  isLoading.value = false;
  currentStep.value = '';

  if (successCount > 0) {
    notify(`✅ Upload successful!`, "success");
    // ✨ Unlock the Clean button
    isUploaded.value = true;
    selectedFiles.value = []; // Clear pending list
  }
}

async function cleanData() {
  isLoading.value = true;
  currentStep.value = 'clean';
  notify(`Cleaning data...`, "info");

  try {
    await apiService.cleanData();
    notify("✅ Cleaning complete!", "success");
    // ✨ Unlock the Load button
    isCleaned.value = true; 
  } catch (error) {
    notify(`Cleaning failed: ${error.message}`, "error");
  } finally {
    isLoading.value = false;
    currentStep.value = '';
  }
}

async function loadData() {
  isLoading.value = true;
  currentStep.value = 'load';
  notify(`Loading to warehouse...`, "info");

  try {
    await apiService.loadData();
    notify("✅ Data loaded successfully!", "success");
  } catch (error) {
    notify(`Loading failed: ${error.message}`, "error");
  } finally {
    isLoading.value = false;
    currentStep.value = '';
  }
}
</script>

<style>
/* Same styles as before */
.toast-enter-active, .toast-leave-active { transition: all 0.4s ease; }
.toast-enter-from, .toast-leave-to { opacity: 0; transform: translateX(30px); }
.animate-slide-up { animation: slideUp 0.3s ease-out; }
@keyframes slideUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
.custom-scrollbar::-webkit-scrollbar { width: 6px; }
.custom-scrollbar::-webkit-scrollbar-track { background: rgba(255, 255, 255, 0.1); }
.custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0, 0, 0, 0.2); border-radius: 10px; }
</style>