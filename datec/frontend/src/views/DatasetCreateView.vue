<template>
    <div class="dataset-create container mx-auto px-4 py-8">
        <!-- Authentication Check -->
        <div v-if="!authStore.isLoggedIn" class="text-center py-12">
            <Card class="max-w-md mx-auto">
                <template #content>
                    <div class="flex flex-col items-center gap-4">
                        <i class="pi pi-lock text-6xl text-gray-400"></i>
                        <h2 class="text-2xl font-bold text-gray-900">Authentication Required</h2>
                        <p class="text-gray-600">Please log in to create a dataset</p>
                        <Button label="Go to Login" icon="pi pi-sign-in" @click="router.push('/login')" />
                    </div>
                </template>
            </Card>
        </div>

        <!-- Main Create Form -->
        <div v-else>
            <!-- Header -->
            <div class="text-center mb-8">
                <h1 class="text-3xl font-bold text-gray-900 mb-2">Create New Dataset</h1>
                <p class="text-gray-600">Share your data with the community</p>
            </div>

            <!-- Stepper -->
            <Card class="mb-6">
                <template #content>
                    <div class="card flex justify-center">
                        <Stepper v-model:value="currentStep" linear class="basis-[50rem]">
                            <StepList>
                                <Step value="0">
                                    <i class="pi pi-info-circle mr-2"></i>
                                    <span>Basic</span>
                                </Step>
                                <Step value="1">
                                    <i class="pi pi-file mr-2"></i>
                                    <span>Files</span>
                                    <Badge v-if="formData.data_files.length > 0" :value="formData.data_files.length"
                                        severity="info" class="ml-2" />
                                </Step>
                                <Step value="2">
                                    <i class="pi pi-image mr-2"></i>
                                    <span>Media</span>
                                </Step>
                                <Step value="3">
                                    <i class="pi pi-check-circle mr-2"></i>
                                    <span>Review</span>
                                </Step>
                            </StepList>
                            <StepPanels>
                                <!-- Step 1: Basic Information -->
                                <StepPanel v-slot="{ activateCallback }" value="0">
                                    <div class="step-content">
                                        <h3 class="text-xl font-semibold mb-6">Basic Information</h3>
                                        <div class="grid grid-cols-1 gap-6">
                                            <!-- Dataset Name -->
                                            <div class="field">
                                                <FloatLabel>
                                                    <InputText id="dataset_name" v-model="formData.dataset_name"
                                                        :class="{ 'p-invalid': validationErrors.dataset_name }"
                                                        class="w-full" @blur="validateField('dataset_name')" />
                                                    <label for="dataset_name">Dataset Name *</label>
                                                </FloatLabel>
                                                <small class="p-error">{{ validationErrors.dataset_name }}</small>
                                                <small class="text-gray-500">3-100 characters, will be normalized to
                                                    lowercase with hyphens</small>
                                            </div>

                                            <!-- Description -->
                                            <div class="field">
                                                <FloatLabel>
                                                    <Textarea id="description" v-model="formData.description" rows="5"
                                                        :class="{ 'p-invalid': validationErrors.description }"
                                                        class="w-full" @blur="validateField('description')" />
                                                    <label for="description">Description *</label>
                                                </FloatLabel>
                                                <small class="p-error">{{ validationErrors.description }}</small>
                                                <small class="text-gray-500">10-5000 characters describing your
                                                    dataset</small>
                                            </div>

                                            <!-- Tags -->
                                            <div class="field">
                                                <FloatLabel>
                                                    <AutoComplete id="tags" v-model="formData.tags" multiple
                                                        :typeahead="true" class="w-full" placeholder="Add tags..." />
                                                    <label for="tags">Tags</label>
                                                </FloatLabel>
                                                <small class="text-gray-500">Optional, comma-separated tags (max
                                                    10)</small>
                                            </div>
                                        </div>
                                    </div>
                                    <div class="flex pt-6 justify-end">
                                        <Button label="Next" icon="pi pi-arrow-right" iconPos="right"
                                            @click="activateCallback('1')" :disabled="!canProceedToStep(1)" />
                                    </div>
                                </StepPanel>

                                <!-- Step 2: Data Files -->
                                <StepPanel v-slot="{ activateCallback }" value="1">
                                    <div class="step-content">
                                        <h3 class="text-xl font-semibold mb-6">Data Files</h3>
                                        <div class="field">
                                            <label class="block font-medium mb-3">Upload Data Files *</label>
                                            <FileUpload name="data_files[]" :multiple="true" :maxFileSize="1073741824"
                                                :fileLimit="10"
                                                accept=".csv,.xlsx,.xls,.json,.txt,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/json,text/plain"
                                                chooseLabel="Browse" uploadLabel="Upload" cancelLabel="Cancel"
                                                :customUpload="true" @select="onFileSelect" @remove="onFileRemove"
                                                @clear="onFileClear">
                                                <template #empty>
                                                    <div
                                                        class="flex flex-col items-center justify-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
                                                        <i class="pi pi-cloud-upload text-4xl text-gray-400 mb-3"></i>
                                                        <p class="font-medium">Drag and drop files here or click to
                                                            browse</p>
                                                        <p class="text-sm text-gray-500 mt-2">
                                                            Supported: CSV, Excel, JSON, TXT • Max: 10 files, 1GB each
                                                        </p>
                                                    </div>
                                                </template>
                                            </FileUpload>
                                            <small class="p-error">{{ validationErrors.data_files }}</small>

                                            <!-- Uploaded Files List -->
                                            <div v-if="formData.data_files.length > 0" class="mt-4">
                                                <h4 class="font-medium mb-2">Uploaded Files ({{
                                                    formData.data_files.length }}/10):</h4>
                                                <DataTable :value="getFileList()" class="p-datatable-sm">
                                                    <Column field="name" header="File Name"></Column>
                                                    <Column field="size" header="Size">
                                                        <template #body="slotProps">
                                                            {{ formatFileSize(slotProps.data.size) }}
                                                        </template>
                                                    </Column>
                                                    <Column field="type" header="Type"></Column>
                                                    <Column header="Actions">
                                                        <template #body="slotProps">
                                                            <Button icon="pi pi-times" severity="danger" text rounded
                                                                @click="removeFile(slotProps.data)" />
                                                        </template>
                                                    </Column>
                                                </DataTable>
                                            </div>
                                        </div>
                                    </div>
                                    <div class="flex pt-6 justify-between">
                                        <Button label="Back" severity="secondary" icon="pi pi-arrow-left"
                                            @click="activateCallback('0')" />
                                        <Button label="Next" icon="pi pi-arrow-right" iconPos="right"
                                            @click="activateCallback('2')" :disabled="!canProceedToStep(2)" />
                                    </div>
                                </StepPanel>

                                <!-- Step 3: Media -->
                                <StepPanel v-slot="{ activateCallback }" value="2">
                                    <div class="step-content">
                                        <h3 class="text-xl font-semibold mb-6">Media (Optional)</h3>
                                        <div class="grid grid-cols-1 gap-6">
                                            <!-- Header Photo -->
                                            <div class="field">
                                                <label class="block font-medium mb-3">Header Photo</label>
                                                <FileUpload name="header_photo" :multiple="false" :maxFileSize="5242880"
                                                    accept="image/*" chooseLabel="Browse" uploadLabel="Upload"
                                                    cancelLabel="Cancel" :customUpload="true"
                                                    @select="onHeaderPhotoSelect" @remove="onHeaderPhotoRemove">
                                                    <template #empty>
                                                        <div
                                                            class="flex flex-col items-center justify-center py-6 border-2 border-dashed border-gray-300 rounded-lg">
                                                            <i class="pi pi-image text-3xl text-gray-400 mb-2"></i>
                                                            <p class="font-medium">Choose header photo</p>
                                                            <p class="text-sm text-gray-500">Max: 5MB, JPEG/PNG/WebP</p>
                                                        </div>
                                                    </template>
                                                </FileUpload>

                                                <!-- Header Photo Preview -->
                                                <div v-if="formData.header_photo" class="mt-3">
                                                    <p class="text-sm font-medium mb-2">Preview:</p>
                                                    <img :src="getHeaderPhotoPreview()" alt="Header photo preview"
                                                        class="max-w-xs max-h-32 object-cover rounded-lg border" />
                                                </div>
                                            </div>

                                            <!-- Tutorial Video -->
                                            <div class="field">
                                                <FloatLabel>
                                                    <InputText id="tutorial_video_url"
                                                        v-model="formData.tutorial_video_url" class="w-full"
                                                        placeholder="https://youtube.com/... or https://vimeo.com/..." />
                                                    <label for="tutorial_video_url">Tutorial Video URL</label>
                                                </FloatLabel>
                                                <small class="text-gray-500">Optional YouTube or Vimeo URL for tutorial
                                                    videos</small>

                                                <!-- Video Preview -->
                                                <div v-if="formData.tutorial_video_url && isValidVideoUrl" class="mt-3">
                                                    <p class="text-sm font-medium mb-2">Preview:</p>
                                                    <div class="bg-gray-100 rounded-lg p-4">
                                                        <p class="text-sm text-gray-600">
                                                            Video from {{ videoPlatform }} will be embedded
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div class="flex pt-6 justify-between">
                                        <Button label="Back" severity="secondary" icon="pi pi-arrow-left"
                                            @click="activateCallback('1')" />
                                        <Button label="Next" icon="pi pi-arrow-right" iconPos="right"
                                            @click="activateCallback('3')" :disabled="!canProceedToStep(3)" />
                                    </div>
                                </StepPanel>

                                <!-- Step 4: Review -->
                                <StepPanel v-slot="{ activateCallback }" value="3">
                                    <div class="step-content">
                                        <h3 class="text-xl font-semibold mb-6">Review & Submit</h3>
                                        <div class="space-y-6">
                                            <!-- Basic Information Review -->
                                            <Card>
                                                <template #title>
                                                    <div class="flex justify-between items-center">
                                                        <span>Basic Information</span>
                                                        <Button label="Edit" icon="pi pi-pencil" severity="secondary"
                                                            size="small" @click="activateCallback('0')" />
                                                    </div>
                                                </template>
                                                <template #content>
                                                    <dl class="grid grid-cols-1 gap-3">
                                                        <div>
                                                            <dt class="font-medium text-gray-500">Dataset Name</dt>
                                                            <dd>{{ formData.dataset_name || 'Not provided' }}</dd>
                                                        </div>
                                                        <div>
                                                            <dt class="font-medium text-gray-500">Description</dt>
                                                            <dd class="whitespace-pre-wrap">{{ formData.description ||
                                                                'Not provided' }}</dd>
                                                        </div>
                                                        <div>
                                                            <dt class="font-medium text-gray-500">Tags</dt>
                                                            <dd>
                                                                <div v-if="formData.tags.length > 0"
                                                                    class="flex flex-wrap gap-1">
                                                                    <Chip v-for="tag in formData.tags" :key="tag"
                                                                        :label="tag" class="text-sm" />
                                                                </div>
                                                                <span v-else class="text-gray-400">No tags</span>
                                                            </dd>
                                                        </div>
                                                    </dl>
                                                </template>
                                            </Card>

                                            <!-- Data Files Review -->
                                            <Card>
                                                <template #title>
                                                    <div class="flex justify-between items-center">
                                                        <span>Data Files ({{ formData.data_files.length }})</span>
                                                        <Button label="Edit" icon="pi pi-pencil" severity="secondary"
                                                            size="small" @click="activateCallback('1')" />
                                                    </div>
                                                </template>
                                                <template #content>
                                                    <ul class="space-y-2">
                                                        <li v-for="file in formData.data_files" :key="file.name"
                                                            class="flex justify-between items-center py-2 border-b">
                                                            <div>
                                                                <i class="pi pi-file text-gray-400 mr-2"></i>
                                                                <span>{{ file.name }}</span>
                                                            </div>
                                                            <span class="text-sm text-gray-500">{{
                                                                formatFileSize(file.size) }}</span>
                                                        </li>
                                                    </ul>
                                                    <div v-if="formData.data_files.length === 0"
                                                        class="text-center py-4 text-gray-500">
                                                        <i class="pi pi-exclamation-circle mr-2"></i>
                                                        No files uploaded
                                                    </div>
                                                </template>
                                            </Card>

                                            <!-- Media Review -->
                                            <Card>
                                                <template #title>
                                                    <div class="flex justify-between items-center">
                                                        <span>Media</span>
                                                        <Button label="Edit" icon="pi pi-pencil" severity="secondary"
                                                            size="small" @click="activateCallback('2')" />
                                                    </div>
                                                </template>
                                                <template #content>
                                                    <dl class="grid grid-cols-1 gap-3">
                                                        <div>
                                                            <dt class="font-medium text-gray-500">Header Photo</dt>
                                                            <dd>
                                                                <span v-if="formData.header_photo"
                                                                    class="text-green-600">
                                                                    <i class="pi pi-check-circle mr-1"></i>Uploaded
                                                                </span>
                                                                <span v-else class="text-gray-400">Not provided</span>
                                                            </dd>
                                                        </div>
                                                        <div>
                                                            <dt class="font-medium text-gray-500">Tutorial Video</dt>
                                                            <dd>
                                                                <span v-if="formData.tutorial_video_url"
                                                                    class="text-green-600">
                                                                    <i class="pi pi-check-circle mr-1"></i>{{
                                                                        formData.tutorial_video_url }}
                                                                </span>
                                                                <span v-else class="text-gray-400">Not provided</span>
                                                            </dd>
                                                        </div>
                                                    </dl>
                                                </template>
                                            </Card>
                                        </div>
                                    </div>
                                    <div class="flex pt-6 justify-between">
                                        <Button label="Back" severity="secondary" icon="pi pi-arrow-left"
                                            @click="activateCallback('2')" />
                                        <Button label="Create Dataset" icon="pi pi-check" @click="submitDataset"
                                            :loading="submitting" :disabled="!canSubmit" />
                                    </div>
                                </StepPanel>
                            </StepPanels>
                        </Stepper>
                    </div>
                </template>
            </Card>
        </div>

        <!-- Confirm Dialog -->
        <ConfirmDialog />
        <Toast />
    </div>
</template>

<script setup>
import { ref, computed, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useToast } from 'primevue/usetoast'
import { useConfirm } from 'primevue/useconfirm'
import api from '@/services/api'

/**
 * @file DatasetCreateView.vue
 * @desc Multi-step form for creating new datasets with file uploads
 * @component DatasetCreateView
 * @version 1.0.0
 * 
 * @example
 * <DatasetCreateView />
 */

const router = useRouter()
const authStore = useAuthStore()
const toast = useToast()
const confirm = useConfirm()

/**
 * Current active step in the stepper
 * @type {import('vue').Ref<string>}
 */
const currentStep = ref('0')

/**
 * Loading state for form submission
 * @type {import('vue').Ref<boolean>}
 */
const submitting = ref(false)

/**
 * Form data structure for dataset creation
 * @type {import('vue').UnwrapNestedRefs<{
 *   dataset_name: string,
 *   description: string,
 *   tags: string[],
 *   data_files: File[],
 *   header_photo: File|null,
 *   tutorial_video_url: string
 * }>}
 */
const formData = reactive({
    dataset_name: '',
    description: '',
    tags: [],
    data_files: [],
    header_photo: null,
    tutorial_video_url: ''
})

/**
 * Validation errors object
 * @type {import('vue').UnwrapNestedRefs<{
 *   dataset_name: string,
 *   description: string,
 *   data_files: string
 * }>}
 */
const validationErrors = reactive({
    dataset_name: '',
    description: '',
    data_files: ''
})

/**
 * Computed property to check if form can be submitted
 * @type {import('vue').ComputedRef<boolean>}
 */
const canSubmit = computed(() => {
    return formData.dataset_name.trim().length >= 3 &&
        formData.dataset_name.trim().length <= 100 &&
        formData.description.trim().length >= 10 &&
        formData.description.trim().length <= 5000 &&
        formData.data_files.length > 0
})

/**
 * Computed property to check if video URL is valid
 * @type {import('vue').ComputedRef<boolean>}
 */
const isValidVideoUrl = computed(() => {
    if (!formData.tutorial_video_url) return false
    return formData.tutorial_video_url.includes('youtube') ||
        formData.tutorial_video_url.includes('youtu.be') ||
        formData.tutorial_video_url.includes('vimeo')
})

/**
 * Computed property to detect video platform from URL
 * @type {import('vue').ComputedRef<string>}
 */
const videoPlatform = computed(() => {
    if (!formData.tutorial_video_url) return ''
    if (formData.tutorial_video_url.includes('youtube') || formData.tutorial_video_url.includes('youtu.be')) {
        return 'YouTube'
    } else if (formData.tutorial_video_url.includes('vimeo')) {
        return 'Vimeo'
    }
    return 'Unknown'
})

/**
 * Check if user can proceed to the specified step
 * @param {number} step - The target step number
 * @returns {boolean} True if user can proceed to the step
 */
const canProceedToStep = (step) => {
    switch (step) {
        case 1: // Basic Info → Data Files
            return formData.dataset_name.trim().length >= 3 &&
                formData.dataset_name.trim().length <= 100 &&
                formData.description.trim().length >= 10 &&
                formData.description.trim().length <= 5000
        case 2: // Data Files → Media
            return formData.data_files.length > 0 && formData.data_files.length <= 10
        case 3: // Media → Review
            return true // Media is optional
        default:
            return false
    }
}

/**
 * Validate a specific form field
 * @param {string} fieldName - The name of the field to validate
 */
const validateField = (fieldName) => {
    switch (fieldName) {
        case 'dataset_name':
            if (formData.dataset_name.trim().length < 3) {
                validationErrors.dataset_name = 'Dataset name must be at least 3 characters'
            } else if (formData.dataset_name.trim().length > 100) {
                validationErrors.dataset_name = 'Dataset name must not exceed 100 characters'
            } else {
                validationErrors.dataset_name = ''
            }
            break

        case 'description':
            if (formData.description.trim().length < 10) {
                validationErrors.description = 'Description must be at least 10 characters'
            } else if (formData.description.trim().length > 5000) {
                validationErrors.description = 'Description must not exceed 5000 characters'
            } else {
                validationErrors.description = ''
            }
            break
    }
}

/**
 * Handle file selection for data files
 * @param {Event} event - File upload event
 */
const onFileSelect = (event) => {
    const files = Array.from(event.files)

    // Check if adding these files would exceed the limit
    if (formData.data_files.length + files.length > 10) {
        toast.add({
            severity: 'error',
            summary: 'File Limit Exceeded',
            detail: 'Maximum 10 files allowed per dataset',
            life: 5000
        })
        return
    }

    // Validate file types and sizes
    for (const file of files) {
        const isValidType = validateDatasetFileType(file)
        const isValidSize = file.size <= 1073741824 // 1GB

        if (!isValidType) {
            toast.add({
                severity: 'error',
                summary: 'Invalid File Type',
                detail: `${file.name}: Only CSV, Excel, JSON, and TXT files are allowed`,
                life: 5000
            })
            continue
        }

        if (!isValidSize) {
            toast.add({
                severity: 'error',
                summary: 'File Too Large',
                detail: `${file.name}: Maximum file size is 1GB`,
                life: 5000
            })
            continue
        }

        // Add to form data
        formData.data_files.push(file)
    }

    // Clear validation error if files are added
    if (formData.data_files.length > 0) {
        validationErrors.data_files = ''
    }
}

/**
 * Handle file removal from data files
 * @param {Event} event - File remove event
 */
const onFileRemove = (event) => {
    const fileName = event.file.name
    formData.data_files = formData.data_files.filter(file => file.name !== fileName)
}

/**
 * Handle clearing all data files
 */
const onFileClear = () => {
    formData.data_files = []
    validationErrors.data_files = 'At least one data file is required'
}

/**
 * Remove specific file from data files
 * @param {File} file - File to remove
 */
const removeFile = (file) => {
    formData.data_files = formData.data_files.filter(f => f.name !== file.name)
}

/**
 * Handle header photo selection
 * @param {Event} event - File upload event
 */
const onHeaderPhotoSelect = (event) => {
    const file = event.files[0]

    // Validate image type and size
    const isValidType = validateImageType(file)
    const isValidSize = file.size <= 5242880 // 5MB

    if (!isValidType) {
        toast.add({
            severity: 'error',
            summary: 'Invalid Image Type',
            detail: 'Only JPEG, PNG, and WebP images are allowed',
            life: 5000
        })
        return
    }

    if (!isValidSize) {
        toast.add({
            severity: 'error',
            summary: 'Image Too Large',
            detail: 'Maximum header photo size is 5MB',
            life: 5000
        })
        return
    }

    formData.header_photo = file
}

/**
 * Handle header photo removal
 */
const onHeaderPhotoRemove = () => {
    formData.header_photo = null
}

/**
 * Validate dataset file type
 * @param {File} file - File to validate
 * @returns {boolean} True if file type is valid
 */
const validateDatasetFileType = (file) => {
    const allowedTypes = [
        'text/csv',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/json',
        'text/plain'
    ]
    const allowedExtensions = ['.csv', '.xlsx', '.xls', '.json', '.txt']

    const fileExtension = '.' + file.name.split('.').pop().toLowerCase()

    return allowedTypes.includes(file.type) || allowedExtensions.includes(fileExtension)
}

/**
 * Validate image file type
 * @param {File} file - File to validate
 * @returns {boolean} True if file type is valid image
 */
const validateImageType = (file) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    return allowedTypes.includes(file.type)
}

/**
 * Get file list for DataTable display
 * @returns {Array} Array of file objects for display
 */
const getFileList = () => {
    return formData.data_files.map(file => ({
        name: file.name,
        size: file.size,
        type: file.type || 'Unknown'
    }))
}

/**
 * Get header photo preview URL
 * @returns {string} Object URL for image preview
 */
const getHeaderPhotoPreview = () => {
    if (formData.header_photo) {
        return URL.createObjectURL(formData.header_photo)
    }
    return ''
}

/**
 * Format file size for display
 * @param {number} bytes - File size in bytes
 * @returns {string} Formatted file size string
 */
const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

/**
 * Submit dataset form to backend API
 * @returns {Promise<void>}
 */
const submitDataset = async () => {
    if (!canSubmit.value) return

    submitting.value = true

    try {
        // Create FormData for multipart upload
        const formDataToSend = new FormData()

        // Add basic fields
        formDataToSend.append('dataset_name', formData.dataset_name)
        formDataToSend.append('description', formData.description)
        if (formData.tags.length > 0) {
            formDataToSend.append('tags', JSON.stringify(formData.tags))
        }
        if (formData.tutorial_video_url) {
            formDataToSend.append('tutorial_video_url', formData.tutorial_video_url)
        }

        // Add data files
        formData.data_files.forEach((file) => {
            formDataToSend.append('data_files', file)
        })

        // Add header photo if exists
        if (formData.header_photo) {
            formDataToSend.append('header_photo', formData.header_photo)
        }

        // Submit to API (auth token is automatically handled by api service)
        const response = await api.post('/datasets', formDataToSend, {
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        })

        if (response.data.success) {
            toast.add({
                severity: 'success',
                summary: 'Dataset Created',
                detail: 'Your dataset has been created successfully and is pending approval',
                life: 5000
            })

            // Redirect to the new dataset
            router.push(`/datasets/${response.data.dataset.dataset_id}`)
        }

    } catch (error) {
        console.error('Error creating dataset:', error)

        let errorMessage = 'Failed to create dataset'
        if (error.response?.data?.error) {
            errorMessage = error.response.data.error
        } else if (error.response?.status === 409) {
            errorMessage = 'You already have a dataset with this name'
        } else if (error.response?.status === 401) {
            errorMessage = 'Authentication failed. Please log in again.'
            router.push('/login')
        }

        toast.add({
            severity: 'error',
            summary: 'Creation Failed',
            detail: errorMessage,
            life: 5000
        })
    } finally {
        submitting.value = false
    }
}

// Check authentication on mount
onMounted(() => {
    if (!authStore.isLoggedIn) {
        toast.add({
            severity: 'warn',
            summary: 'Authentication Required',
            detail: 'Please log in to create datasets',
            life: 3000
        })
    }
})
</script>

<style scoped>
.dataset-create {
    max-width: 1000px;
}

.step-content {
    padding: 1.5rem 0;
}

.field {
    margin-bottom: 1.5rem;
}

:deep(.p-stepper) {
    margin-bottom: 0;
}

:deep(.p-stepper-nav) {
    margin-bottom: 2rem;
}

:deep(.p-fileupload) {
    border: none;
}

:deep(.p-fileupload-content) {
    border: none;
    padding: 0;
}
</style>