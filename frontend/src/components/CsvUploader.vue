<template>
  <div class="min-h-screen bg-pink-200 flex flex-col items-center justify-center p-4 relative overflow-hidden">

    <div class="absolute top-6 left-6 z-10">
      <h2 class="text-black text-xl font-bold tracking-wider">ELT SYSTEM</h2>
    </div>

    <div class="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-3 gap-6 items-start mt-12 lg:mt-0">

      <div class="lg:col-span-1 bg-white/30 backdrop-blur-md border border-white/50 p-6 rounded-2xl shadow-lg">
        <h3 class="text-green-900 text-xl font-bold mb-4 border-b border-green-800/20 pb-2">
          Process Guide
        </h3>
        
        <div class="space-y-4">
          <div class="flex gap-3">
            <div class="flex-shrink-0 w-6 h-6 rounded-full bg-green-600 text-white text-sm flex items-center justify-center font-bold shadow-md">1</div>
            <div>
              <h4 class="font-bold text-black text-sm">Upload Files</h4>
              <p class="text-black/70 text-xs leading-relaxed">
                Select or drag CSV files. Click <strong>Upload</strong>.
              </p>
            </div>
          </div>

          <div class="flex gap-3">
            <div class="flex-shrink-0 w-6 h-6 rounded-full bg-green-600 text-white text-sm flex items-center justify-center font-bold shadow-md">2</div>
            <div>
              <h4 class="font-bold text-black text-sm">Clean Data</h4>
              <p class="text-black/70 text-xs leading-relaxed">
                Click <strong>Clean</strong> to sanitize data.
              </p>
            </div>
          </div>

          <div class="flex gap-3">
            <div class="flex-shrink-0 w-6 h-6 rounded-full bg-green-600 text-white text-sm flex items-center justify-center font-bold shadow-md">3</div>
            <div>
              <h4 class="font-bold text-black text-sm">Load Data</h4>
              <p class="text-black/70 text-xs leading-relaxed">
                Click <strong>Load</strong> to transfer to warehouse.
              </p>
            </div>
          </div>

          <div class="flex gap-3">
            <div class="flex-shrink-0 w-6 h-6 rounded-full bg-green-600 text-white text-sm flex items-center justify-center font-bold shadow-md">4</div>
            <div>
              <h4 class="font-bold text-black text-sm">Denormalize</h4>
              <p class="text-black/70 text-xs leading-relaxed">
                Click <strong>Denormalize</strong> for reporting.
                <span class="block mt-1 text-[10px] font-semibold text-red-600 italic">
                  *Perform after all steps are done.
                </span>
              </p>
            </div>
          </div>
        </div>
      </div>

      <div class="lg:col-span-2 flex flex-col items-center w-full">
        
        <h1 class="text-black text-3xl font-bold mb-6 text-center">Upload CSV Files</h1>

        <div
          class="flex flex-col items-center w-full max-w-lg transition-transform duration-300"
          @dragover.prevent="isDragging = true"
          @dragleave.prevent="isDragging = false"
          @drop.prevent="handleDrop"
          :class="{ 'scale-105': isDragging }"
        >
          <div
            class="bg-green-600 w-56 h-12 rounded-full flex items-center justify-center text-white text-md font-semibold cursor-pointer shadow-lg hover:bg-green-700 transition-colors z-10"
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

          <p class="text-black mt-3 text-sm opacity-60 font-medium">
            {{ isDragging ? "Drop them now!" : "or drop files here" }}
          </p>

          <div class="flex flex-wrap justify-center gap-3 mt-4 mb-6">
            <button
              class="bg-green-600 text-white px-5 py-2 rounded-full text-sm font-semibold shadow-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-transform active:scale-95"
              @click="uploadFiles"
              :disabled="selectedFiles.length === 0 || isLoading"
            >
              {{ isLoading && currentStep === 'upload' ? '⏳ Uploading...' : 'Upload' }}
            </button>

            <button
              class="bg-green-600 text-white px-5 py-2 rounded-full text-sm font-semibold shadow-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-transform active:scale-95"
              @click="cleanData"
              :disabled="!isUploaded || isLoading"
            >
              {{ isLoading && currentStep === 'clean' ? '⏳ Cleaning...' : 'Clean' }}
            </button>

            <button
              class="bg-green-600 text-white px-5 py-2 rounded-full text-sm font-semibold shadow-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-transform active:scale-95"
              @click="loadData"
              :disabled="!isCleaned || isLoading"
            >
              {{ isLoading && currentStep === 'load' ? '⏳ Loading...' : 'Load' }}
            </button>

            <button
              class="bg-green-600 text-white px-5 py-2 rounded-full text-sm font-semibold shadow-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-transform active:scale-95"
              @click="denormalizeData"
              :disabled="!isLoaded || isLoading"
            >
              {{ isLoading && currentStep === 'denorm' ? '⏳ Denorm' : 'Denormalize' }}
            </button>
          </div>
          
          <div v-if="selectedFiles.length > 0" class="w-full flex flex-col gap-2 px-2">
            <div class="flex justify-between items-center px-2 mb-1">
              <span class="text-black font-bold text-xs">{{ selectedFiles.length }} file(s) pending</span>
              <button @click="clearFiles" class="text-red-600 text-[10px] font-bold hover:underline">Clear All</button>
            </div>

            <div v-for="(file, index) in selectedFiles" :key="index" class="bg-white/40 px-3 py-2 rounded-lg border border-white/50 flex justify-between items-center animate-slide-up shadow-sm">
              <div class="flex items-center gap-2 overflow-hidden">
                <span class="text-lg">📄</span>
                <div class="flex flex-col">
                  <span class="text-black font-bold truncate max-w-[150px] text-xs">{{ file.name }}</span>
                  <span class="text-black/50 text-[10px] font-medium">{{ (file.size / 1024).toFixed(1) }} KB</span>
                </div>
              </div>
              <button @click="removeFile(index)" class="text-red-500 hover:text-red-700 hover:bg-red-100 rounded-full w-6 h-6 flex items-center justify-center font-bold transition-colors text-xs">✕</button>
            </div>
          </div>
        </div>

        <div v-if="uploadedFiles.length > 0" class="mt-4 w-full max-w-lg">
          <h3 class="text-black font-bold text-sm mb-2 px-1">✅ Uploaded Files:</h3>
          <div class="flex flex-col gap-2">
            <div v-for="(file, index) in uploadedFiles" :key="index" class="flex items-center justify-between text-xs px-2 py-1 border-b border-black/10">
              <span class="text-black font-medium truncate max-w-[250px]">{{ file.name }}</span>
              <a :href="file.url" target="_blank" class="text-blue-600 hover:underline font-semibold">View</a>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="fixed bottom-5 right-5 flex flex-col gap-2 z-50">
      <TransitionGroup name="toast">
        <div
          v-for="note in notifications"
          :key="note.id"
          class="flex items-center gap-3 px-4 py-3 rounded-lg shadow-xl text-white font-medium min-w-[250px]"
          :class="{
            'bg-green-700': note.type === 'success',
            'bg-red-500': note.type === 'error',
            'bg-blue-600': note.type === 'info'
          }"
        >
          <span v-if="note.type === 'success'" class="text-lg">✓</span>
          <span v-if="note.type === 'error'" class="text-lg">✕</span>
          <span v-if="note.type === 'info'" class="text-lg">ℹ</span>
          <span class="text-xs opacity-90">{{ note.message }}</span>
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
const currentStep = ref(''); 

// --- STATE VARIABLES FOR BUTTON LOCKING ---
const isUploaded = ref(false); 
const isCleaned = ref(false);  
const isLoaded = ref(false);   

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
  resetProgress(); 
}

function clearFiles() {
  selectedFiles.value = [];
  uploadedFiles.value = [];
  resetProgress();
}

function resetProgress() {
  isUploaded.value = false;
  isCleaned.value = false;
  isLoaded.value = false;
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
    isUploaded.value = true;
    selectedFiles.value = []; 
  }
}

async function cleanData() {
  isLoading.value = true;
  currentStep.value = 'clean';
  notify(`Cleaning data...`, "info");

  try {
    await apiService.cleanData();
    notify("✅ Cleaning complete!", "success");
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
    isLoaded.value = true;
  } catch (error) {
    notify(`Loading failed: ${error.message}`, "error");
  } finally {
    isLoading.value = false;
    currentStep.value = '';
  }
}

async function denormalizeData() {
  isLoading.value = true;
  currentStep.value = 'denorm';
  notify(`Denormalizing data...`, "info");

  try {
    await apiService.denormalizeData();
    notify("✅ Denormalization complete!", "success");
  } catch (error) {
    notify(`Denormalization failed: ${error.message}`, "error");
  } finally {
    isLoading.value = false;
    currentStep.value = '';
  }
}
</script>

<style>
.toast-enter-active, .toast-leave-active { transition: all 0.4s ease; }
.toast-enter-from, .toast-leave-to { opacity: 0; transform: translateX(30px); }
.animate-slide-up { animation: slideUp 0.3s ease-out; }
@keyframes slideUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
</style>