<template>
    <div class="dataset-detail container mx-auto px-4 py-8">
        <!-- Loading State -->
        <div v-if="loading" class="flex justify-center items-center py-12">
            <ProgressSpinner />
        </div>

        <!-- Error State -->
        <div v-else-if="error" class="text-center py-8">
            <Message severity="error" :closable="false">
                {{ error }}
            </Message>
            <Button label="Go Home" icon="pi pi-home" @click="router.push('/')" class="mt-4" />
        </div>

        <!-- Dataset Content -->
        <div v-else>
            <!-- Dataset Header -->
            <Card class="dataset-header mb-6">
                <template #header>
                    <div class="relative h-48 rounded-t-lg overflow-hidden">
                        <!-- Header Photo or Fallback -->
                        <img v-if="datasetData.header_photo_url" :src="getDatasetHeaderUrl(datasetData)"
                            :alt="datasetData.dataset_name" class="object-cover" />
                        <div v-else
                            class="w-full h-full bg-gradient-to-br from-blue-600 to-gray-300 flex items-center justify-center text-white">
                            <i class="pi pi-box text-5xl"></i>
                        </div>
                    </div>
                </template>

                <template #content>
                    <!-- Dataset Name + Privacy Icon -->
                    <div class="flex items-center gap-3 mb-2">
                        <h1 class="text-3xl font-bold text-gray-900">{{ datasetData.dataset_name }}</h1>
                        <i v-if="isOwner || authStore.user?.isAdmin"
                            :class="datasetData.is_public ? 'pi pi-lock-open text-green-500' : 'pi pi-lock text-red-500'"
                            class="text-xl" :title="datasetData.is_public ? 'Public' : 'Private'"></i>
                    </div>

                    <!-- Description -->
                    <p class="text-gray-600 text-lg mb-4">{{ datasetData.description }}</p>

                    <!-- Author Info -->
                    <div class="flex items-center gap-3 mb-4" @click="goToProfile(datasetData.owner.username)">
                        <Avatar v-if="datasetData.owner.avatarUrl" :image="getAvatarUrl(datasetData.owner)"
                            shape="circle" size="normal" :alt="datasetData.owner.username" />
                        <Avatar v-else :label="getInitials(datasetData.owner.fullName)" shape="circle" size="normal"
                            :class="getUserAvatarClasses(datasetData.owner.username)" />
                        <div>
                            <p class="font-medium text-gray-900">{{ datasetData.owner.fullName }}</p>
                            <p class="text-gray-500 text-sm">@{{ datasetData.owner.username }}</p>
                        </div>
                    </div>

                    <!-- Current User Vote Display -->
                    <div v-if="hasUserVoted && authStore.isLoggedIn && !isOwner" class="mb-4 p-3 bg-blue-50 rounded-lg">
                        <div class="flex items-center gap-2">
                            <i class="pi pi-star text-yellow-500"></i>
                            <span class="font-medium">Your rating:</span>
                            <Rating :modelValue="userCurrentRating" :readonly="true" :cancel="false" />
                            <span class="text-gray-600">({{ userCurrentRating }} stars)</span>
                        </div>
                    </div>

                    <!-- Action Buttons -->
                    <div class="flex flex-wrap gap-2">
                        <Button v-if="!isOwner" :label="hasUserVoted ? 'Revote' : 'Vote'" icon="pi pi-star"
                            @click="openVoteDialog" :severity="hasUserVoted ? 'warning' : 'primary'" />
                        <Button label="Clone" icon="pi pi-copy" @click="cloneDataset" />
                        <Button label="Download" icon="pi pi-download" @click="downloadDataset" />
                    </div>
                </template>
            </Card>

            <!-- Content Tabs -->
            <Tabs v-model:value="activeTab">
                <TabList>
                    <Tab value="data">
                        <span class="flex items-center gap-2">
                            <i class="pi pi-file"></i>
                            Data
                        </span>
                    </Tab>
                    <Tab value="discussion">
                        <span class="flex items-center gap-2">
                            <i class="pi pi-comments"></i>
                            Discussion
                        </span>
                    </Tab>
                    <Tab value="activity">
                        <span class="flex items-center gap-2">
                            <i class="pi pi-chart-line"></i>
                            Activity
                        </span>
                    </Tab>
                    <Tab v-if="isOwner" value="settings">
                        <span class="flex items-center gap-2">
                            <i class="pi pi-cog"></i>
                            Settings
                        </span>
                    </Tab>
                </TabList>

                <!-- Data Tab -->
                <TabPanel value="data">
                    <!-- Files Section -->
                    <Card class="mb-6">
                        <template #content>
                            <DataTable :value="datasetData.files" :paginator="true" :rows="10"
                                paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport"
                                currentPageReportTemplate="Showing {first} to {last} of {totalRecords} files">
                                <Column field="file_name" header="File Name" sortable></Column>
                                <Column field="file_size_bytes" header="Size" sortable>
                                    <template #body="slotProps">
                                        {{ formatFileSize(slotProps.data.file_size_bytes) }}
                                    </template>
                                </Column>
                                <Column field="mime_type" header="Type" sortable></Column>
                                <Column header="Actions">
                                    <template #body="slotProps">
                                        <Button icon="pi pi-download" label="Download" severity="secondary" size="small"
                                            @click="downloadFile(slotProps.data.download_url, slotProps.data.file_name)" />
                                    </template>
                                </Column>
                            </DataTable>
                        </template>
                    </Card>

                    <!-- Tutorial Video Section -->
                    <Card v-if="datasetData.tutorial_video" class="mb-6">
                        <template #title>
                            <div class="flex items-center gap-2">
                                <i class="pi pi-video text-red-500"></i>
                                <span>Tutorial Video</span>
                            </div>
                        </template>
                        <template #content>
                            <div class="video-container">
                                <iframe v-if="datasetData.tutorial_video.platform === 'youtube'"
                                    :src="getYouTubeEmbedUrl(datasetData.tutorial_video.url)" width="100%" height="400"
                                    frameborder="0" allowfullscreen></iframe>
                                <iframe v-else-if="datasetData.tutorial_video.platform === 'vimeo'"
                                    :src="getVimeoEmbedUrl(datasetData.tutorial_video.url)" width="100%" height="400"
                                    frameborder="0" allowfullscreen></iframe>
                                <div v-else class="text-center py-8 text-gray-500">
                                    <i class="pi pi-exclamation-triangle text-2xl mb-2"></i>
                                    <p>Video platform not supported for embedding</p>
                                    <Button :label="`Watch on ${datasetData.tutorial_video.platform}`"
                                        icon="pi pi-external-link"
                                        @click="openExternalVideo(datasetData.tutorial_video.url)" class="mt-2" />
                                </div>
                            </div>
                        </template>
                    </Card>
                </TabPanel>

                <!-- Discussion Tab -->
                <TabPanel value="discussion">
                    <Card>
                        <template #content>
                            <div class="discussion-container">
                                <!-- Comment Form for Top-Level Comments -->
                                <CommentForm v-if="authStore.isLoggedIn && isDatasetAccessible"
                                    :datasetId="route.params.id" @submit="handleNewComment" class="mb-6" />

                                <Divider type="dotted" />

                                <!-- Loading State -->
                                <div v-if="loadingComments" class="flex justify-center py-8">
                                    <ProgressSpinner />
                                </div>

                                <!-- Error State -->
                                <div v-else-if="commentsError" class="text-center py-8 text-red-500">
                                    <i class="pi pi-exclamation-triangle text-2xl mb-2"></i>
                                    <p>Failed to load comments</p>
                                    <Button label="Retry" icon="pi pi-refresh" @click="loadComments" class="mt-2" />
                                </div>

                                <!-- Empty State -->
                                <div v-else-if="commentCount === 0" class="text-center py-8 text-gray-500">
                                    <i class="pi pi-comments text-4xl mb-3"></i>
                                    <p>No comments yet</p>
                                    <p class="text-sm">Be the first to start the discussion!</p>
                                </div>

                                <!-- Comments Thread -->
                                <CommentThread v-else :comments="commentsData"
                                    :datasetOwnerUsername="datasetData.owner?.username"
                                    @comment-updated="loadComments" />
                            </div>
                        </template>
                    </Card>
                </TabPanel>

                <!-- Activity Tab -->
                <TabPanel value="activity">
                    <Accordion :activeIndex="[0]">
                        <!-- Voting Details -->
                        <AccordionPanel value="0">
                            <AccordionHeader>
                                <div class="flex items-center gap-2">
                                    <i class="pi pi-star text-yellow-500"></i>
                                    <span>Votes</span>
                                    <Badge :value="votesData.totalVotes" severity="secondary" class="ml-2" />
                                </div>
                            </AccordionHeader>
                            <AccordionContent>
                                <!-- Voting Stats Cards -->
                                <div v-if="votesData.votes.length !== 0"
                                    class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                                    <Card>
                                        <template #content>
                                            <div class="text-center">
                                                <i class="pi pi-users text-purple-500 text-2xl mb-2"></i>
                                                <h3 class="text-xl font-bold">{{ votesData.totalVotes }}</h3>
                                                <p class="text-gray-600">Total Votes</p>
                                            </div>
                                        </template>
                                    </Card>
                                    <Card>
                                        <template #content>
                                            <div class="text-center">
                                                <i class="pi pi-star text-yellow-500 text-2xl mb-2"></i>
                                                <h3 class="text-xl font-bold">{{ votesData.averageRating }}/5</h3>
                                                <p class="text-gray-600">Average Rating</p>
                                            </div>
                                        </template>
                                    </Card>
                                </div>

                                <!-- Votes Table -->
                                <DataTable v-if="votesData.votes.length !== 0" :value="votesData.votes"
                                    :paginator="true" :rows="10" class="mb-4">
                                    <Column header="Voter">
                                        <template #body="slotProps">
                                            <div class="flex items-center gap-2"
                                                @click="goToProfile(slotProps.data.voter.username)">
                                                <Avatar v-if="slotProps.data.voter.avatarUrl"
                                                    :image="getAvatarUrl(slotProps.data.voter)" shape="circle"
                                                    size="small" />
                                                <Avatar v-else :label="getInitials(slotProps.data.voter.fullName)"
                                                    shape="circle" size="small"
                                                    :class="getUserAvatarClasses(slotProps.data.voter.username)" />
                                                <span>{{ slotProps.data.voter.fullName }}</span>
                                            </div>
                                        </template>
                                    </Column>
                                    <Column field="rating" header="Rating">
                                        <template #body="slotProps">
                                            <Rating :modelValue="slotProps.data.rating" :readonly="true"
                                                :cancel="false" />
                                        </template>
                                    </Column>
                                    <Column field="created_at" header="Date">
                                        <template #body="slotProps">
                                            {{ formatDate(slotProps.data.created_at) }}
                                        </template>
                                    </Column>
                                </DataTable>

                                <!-- Empty State for Votes -->
                                <div v-if="votesData.votes.length === 0" class="text-center py-8 text-gray-500">
                                    <i class="pi pi-star text-4xl mb-3"></i>
                                    <p>No votes yet</p>
                                    <p class="text-sm">Be the first to rate this dataset!</p>
                                </div>
                            </AccordionContent>
                        </AccordionPanel>

                        <!-- Dataset Clones -->
                        <AccordionPanel value="1">
                            <AccordionHeader>
                                <div class="flex items-center gap-2">
                                    <i class="pi pi-copy text-blue-500"></i>
                                    <span>Clones</span>
                                    <Badge :value="filteredClones.length" severity="secondary" class="ml-2" />
                                </div>
                            </AccordionHeader>
                            <AccordionContent>
                                <!-- Clones Stats Card -->
                                <div v-if="filteredClones.length !== 0"
                                    class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                                    <Card>
                                        <template #content>
                                            <div class="text-center">
                                                <i class="pi pi-copy text-blue-500 text-2xl mb-2"></i>
                                                <h3 class="text-xl font-bold">{{ filteredClones.length }}</h3>
                                                <p class="text-gray-600">Total Clones</p>
                                            </div>
                                        </template>
                                    </Card>
                                    <Card>
                                        <template #content>
                                            <div class="text-center">
                                                <i class="pi pi-calendar text-orange-500 text-2xl mb-2"></i>
                                                <h3 class="text-xl font-bold">{{
                                                    formatDate(filteredClones[0].created_at) }} </h3>
                                                <p class="text-gray-600">Lastest Clone</p>
                                            </div>
                                        </template>
                                    </Card>
                                </div>

                                <!-- Clones Table -->
                                <DataTable v-if="filteredClones.length !== 0" :value="filteredClones" :paginator="true"
                                    :rows="10" class="mb-4">
                                    <Column header="Clone">
                                        <template #body="slotProps">
                                            <div class="flex items-center gap-2">
                                                <a @click="navigateToDataset(slotProps.data.dataset_id)"
                                                    class="text-blue-600 hover:underline cursor-pointer font-medium">
                                                    {{ slotProps.data.dataset_name }}
                                                </a>
                                                <div v-if="authStore.user?.username === slotProps.data.owner?.username">
                                                    <Tag v-if="slotProps.data.status === 'pending'" value="PENDING"
                                                        severity="info" />
                                                    <Tag v-else-if="slotProps.data.status === 'rejected'"
                                                        value="REJECTED" severity="danger" />
                                                    <Tag v-else-if="slotProps.data.status === 'approved'"
                                                        value="APPROVED" severity="success" />
                                                </div>
                                            </div>
                                        </template>
                                    </Column>
                                    <Column header="Owner">
                                        <template #body="slotProps">
                                            <div class="flex items-center gap-2"
                                                @click="goToProfile(slotProps.data.owner.username)">
                                                <Avatar v-if="slotProps.data.owner.avatarUrl"
                                                    :image="getAvatarUrl(slotProps.data.owner)" shape="circle"
                                                    size="small" />
                                                <Avatar v-else :label="getInitials(slotProps.data.owner.fullName)"
                                                    shape="circle" size="small"
                                                    :class="getUserAvatarClasses(slotProps.data.owner.username)" />
                                                <span>{{ slotProps.data.owner.fullName }}</span>
                                            </div>
                                        </template>
                                    </Column>
                                    <Column field="created_at" header="Date">
                                        <template #body="slotProps">
                                            {{ formatDate(slotProps.data.created_at) }}
                                        </template>
                                    </Column>
                                </DataTable>

                                <!-- Empty State for Clones -->
                                <div v-if="filteredClones.length === 0" class="text-center py-8 text-gray-500">
                                    <i class="pi pi-copy text-4xl mb-3"></i>
                                    <p>No clones yet</p>
                                    <p class="text-sm">Be the first to clone this dataset!</p>
                                </div>
                            </AccordionContent>
                        </AccordionPanel>

                        <!-- Download Statistics -->
                        <AccordionPanel value="2">
                            <AccordionHeader>
                                <div class="flex items-center gap-2">
                                    <i class="pi pi-download text-green-500"></i>
                                    <span>Downloads</span>
                                    <Badge :value="downloadStats.statistics.totalDownloads" severity="secondary"
                                        class="ml-2" />
                                </div>
                            </AccordionHeader>
                            <AccordionContent>
                                <!-- Download Stats Cards -->
                                <div v-if="downloadStats.statistics.recentDownloads.length !== 0"
                                    class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                                    <Card>
                                        <template #content>
                                            <div class="text-center">
                                                <i class="pi pi-download text-blue-500 text-2xl mb-2"></i>
                                                <h3 class="text-xl font-bold">{{ downloadStats.statistics.totalDownloads
                                                    }}</h3>
                                                <p class="text-gray-600">Total Downloads</p>
                                            </div>
                                        </template>
                                    </Card>
                                    <Card>
                                        <template #content>
                                            <div class="text-center">
                                                <i class="pi pi-calendar text-orange-500 text-2xl mb-2"></i>
                                                <h3 class="text-xl font-bold">{{ lastDownloadDate }}</h3>
                                                <p class="text-gray-600">Lastest Download</p>
                                            </div>
                                        </template>
                                    </Card>
                                </div>

                                <!-- Download Chart (Owner Only) -->
                                <div v-if="isOwner && downloadStats.statistics.recentDownloads.length !== 0"
                                    class="mb-6">
                                    <Card>
                                        <template #content>
                                            <h4 class="font-semibold mb-4">Download History</h4>
                                            <Chart type="line" :data="downloadChartData" :options="chartOptions"
                                                class="h-80" />
                                        </template>
                                    </Card>
                                </div>

                                <!-- Download History Table (Owner Only) -->
                                <div v-if="isOwner && downloadStats.statistics.recentDownloads.length !== 0"
                                    class="mt-6">
                                    <Card>
                                        <template #content>
                                            <h4 class="font-semibold mb-4">Downloads Details</h4>
                                            <DataTable v-if="downloadStats.statistics.recentDownloads.length !== 0"
                                                :value="downloadStats.statistics.recentDownloads" :paginator="true"
                                                :rows="10">
                                                <Column header="User">
                                                    <template #body="slotProps">
                                                        <div class="flex items-center gap-2"
                                                            @click="goToProfile(slotProps.data.username)">
                                                            <Avatar v-if="slotProps.data.avatarUrl"
                                                                :image="getAvatarUrl(slotProps.data)" shape="circle"
                                                                size="small" />
                                                            <Avatar v-else :label="getInitials(slotProps.data.fullName)"
                                                                shape="circle" size="small"
                                                                :class="getUserAvatarClasses(slotProps.data.username)" />
                                                            <span>{{ slotProps.data.fullName }}</span>
                                                        </div>
                                                    </template>
                                                </Column>
                                                <Column field="downloadedAt" header="Date">
                                                    <template #body="slotProps">
                                                        {{ formatDate(slotProps.data.downloadedAt) }}
                                                    </template>
                                                </Column>
                                            </DataTable>
                                        </template>
                                    </Card>
                                </div>
                                <!-- Empty State for Downloads -->
                                <div v-if="downloadStats.statistics.recentDownloads.length === 0"
                                    class="text-center py-8 text-gray-500">
                                    <i class="pi pi-download text-4xl mb-3"></i>
                                    <p>No downloads yet</p>
                                    <p class="text-sm">Be the first to download this dataset!</p>
                                </div>
                            </AccordionContent>
                        </AccordionPanel>
                    </Accordion>
                </TabPanel>

                <!-- Settings Tab (Owner Only) -->
                <TabPanel v-if="isOwner" value="settings">
                    <Card>
                        <template #content>
                            <div class="space-y-6">
                                <!-- Privacy & Visibility -->
                                <div class="space-y-4">
                                    <h3 class="text-lg font-semibold"><i class="pi pi-unlock"></i> Privacy</h3>
                                    <div class="flex items-center justify-between mt-4 rounded-lg">
                                        <div>
                                            <h4 class="font-medium">Dataset Access</h4>
                                            <p class="text-sm text-gray-600">
                                                {{ datasetData.is_public ?
                                                    'Visible to all users' :
                                                    'Only visible to you'
                                                }}
                                            </p>
                                        </div>
                                        <ToggleSwitch v-model="visibilityModel" @change="handleVisibilityToggle"
                                            :disabled="!isDatasetApproved" />
                                    </div>

                                    <Message v-if="!isDatasetApproved && datasetData.is_public" severity="warn"
                                        :closable="false">
                                        <div class="flex items-center gap-2">
                                            <i class="pi pi-exclamation-triangle"></i>
                                            <span>Only approved datasets can be made public</span>
                                        </div>
                                    </Message>
                                </div>

                                <Divider class="mb-10" />

                                <!-- Approval Status -->
                                <div class="space-y-4">
                                    <h3 class="text-lg font-semibold"><i class="pi pi-list-check"></i> Moderation</h3>

                                    <div class="p-4 rounded-lg" :class="statusStyle.class">
                                        <div class="flex items-center gap-2" :class="statusStyle.textColor">
                                            <i :class="statusStyle.icon"></i>
                                            <span class="font-medium">{{ datasetData.status?.toUpperCase() }}</span>
                                        </div>
                                        <p class="text-sm mt-1" :class="statusStyle.textColor">
                                            {{ statusStyle.message }}
                                        </p>
                                        <p v-if="datasetData.reviewed_at" class="text-sm mt-1"
                                            :class="statusStyle.textColor">
                                            {{ statusStyle.dateLabel }}: {{ formatDate(datasetData.reviewed_at) }}
                                        </p>
                                        <p v-if="datasetData.admin_review"
                                            class="text-sm mt-1 text-gray-600 font-medium">
                                            Admin feedback: <i>{{ datasetData.admin_review }}</i>
                                        </p>
                                    </div>

                                    <Button v-if="datasetData.status !== 'approved' && datasetData.status !== 'pending'"
                                        label="Request Approval" icon="pi pi-send" @click="requestApproval"
                                        class="w-full" />
                                </div>

                                <Divider class="mb-10" />

                                <!-- Dataset Information -->
                                <div class="space-y-4">
                                    <div class="flex justify-between items-center">
                                        <h3 class="text-lg font-semibold"><i class="pi pi-id-card"></i> Details</h3>
                                        <Button :label="editMode ? 'Cancel' : 'Edit'"
                                            :icon="editMode ? 'pi pi-times' : 'pi pi-pencil'" @click="toggleEditMode"
                                            :severity="editMode ? 'danger' : 'secondary'" />
                                    </div>

                                    <!-- Header Photo -->
                                    <div v-if="datasetData.header_photo_url" class="rounded-lg">
                                        <h4 class="font-medium mb-2">Header Photo</h4>
                                        <div class="flex items-center gap-4">
                                            <img :src="getDatasetHeaderUrl(datasetData)" :alt="datasetData.dataset_name"
                                                class="w-2x1 h-50 object-cover rounded-lg" />
                                            <div class="flex-1">
                                                <Button v-if="editMode" label="Change" icon="pi pi-image"
                                                    severity="secondary" size="small" @click="triggerHeaderUpload"
                                                    class="mt-1" />
                                            </div>
                                        </div>
                                        <input v-if="editMode" ref="headerUploadRef" type="file" accept="image/*"
                                            @change="handleHeaderPhotoChange" class="hidden" />
                                    </div>

                                    <!-- Edit Form -->
                                    <div class="space-y-4">
                                        <div class="grid grid-cols-1 gap-4">
                                            <div>
                                                <label class="font-medium text-sm">Dataset Name</label>
                                                <InputText v-model="editForm.dataset_name" :disabled="!editMode"
                                                    :class="{ 'p-invalid': editFormErrors.dataset_name }"
                                                    class="w-full mt-1" placeholder="Dataset name" />
                                                <small class="p-error">{{ editFormErrors.dataset_name }}</small>
                                            </div>

                                            <div>
                                                <label class="font-medium text-sm">Description</label>
                                                <Textarea v-model="editForm.description" :disabled="!editMode" rows="3"
                                                    :class="{ 'p-invalid': editFormErrors.description }"
                                                    class="w-full mt-1" placeholder="Dataset description" />
                                                <small class="p-error">{{ editFormErrors.description }}</small>
                                            </div>

                                            <div>
                                                <label class="font-medium text-sm">Tags</label>
                                                <InputChips v-model="editForm.tags" :disabled="!editMode" separator=","
                                                    class="w-full mt-1" placeholder="Dataset tags" />
                                            </div>

                                            <div>
                                                <label class="font-medium text-sm">Tutorial Video URL</label>
                                                <InputText v-model="editForm.tutorial_video_url" :disabled="!editMode"
                                                    placeholder="https://youtube.com/..." class="w-full mt-1" />
                                            </div>
                                        </div>

                                        <Button v-if="editMode" label="Save Changes" icon="pi pi-check"
                                            @click="saveDatasetChanges" :loading="editLoading" class="w-full" />
                                    </div>
                                </div>

                                <Divider class="mb-10" />

                                <!-- File Management -->
                                <div class="space-y-4">
                                    <div class="flex justify-between items-center">
                                        <h3 class="text-lg font-semibold"><i class="pi pi-folder-open"></i> File
                                            Management</h3>
                                        <Button label="Add Files" icon="pi pi-plus" @click="openFileUploadDialog"
                                            :disabled="remainingFileSlots <= 0" />
                                    </div>

                                    <p class="text-sm text-gray-600">
                                        {{ datasetData.files?.length || 0 }} of {{ maxFiles }} files ({{
                                            remainingFileSlots }} remaining)
                                    </p>

                                    <DataTable :value="datasetData.files" class="p-datatable-sm" :rows="5" paginator
                                        paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport"
                                        currentPageReportTemplate="Showing {first} to {last} of {totalRecords} files">
                                        <Column field="file_name" header="File Name" sortable></Column>
                                        <Column field="file_size_bytes" header="Size" sortable>
                                            <template #body="slotProps">
                                                {{ formatFileSize(slotProps.data.file_size_bytes) }}
                                            </template>
                                        </Column>
                                        <Column field="mime_type" header="Type" sortable></Column>
                                        <Column header="Actions" style="width: 120px">
                                            <template #body="slotProps">
                                                <div class="flex gap-1">
                                                    <Button icon="pi pi-download" severity="info" text rounded
                                                        size="small"
                                                        @click="downloadFile(slotProps.data.download_url, slotProps.data.file_name)" />
                                                    <Button icon="pi pi-trash" severity="danger" text rounded
                                                        size="small" @click="confirmFileDelete(slotProps.data)" />
                                                </div>
                                            </template>
                                        </Column>
                                    </DataTable>
                                </div>

                                <!-- Danger Zone -->
                                <div class="space-y-4">
                                    <h3 class="text-lg font-semibold text-red-600"><i
                                            class="pi pi-exclamation-triangle"></i> Danger Zone
                                    </h3>
                                    <div class="p-4 border border-red-200 rounded-lg bg-red-50">
                                        <div class="flex items-center justify-between">
                                            <div>
                                                <h4 class="font-semibold text-red-800">Delete Dataset</h4>
                                                <p class="text-sm text-red-600">
                                                    This will permanently delete the dataset and all associated files.
                                                </p>
                                            </div>
                                            <Button label="Delete" icon="pi pi-trash" severity="danger"
                                                @click="confirmDatasetDelete" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <ConfirmDialog />
                        </template>
                    </Card>
                </TabPanel>
            </Tabs>
        </div>
        <!-- Vote Dialog -->
        <Dialog v-model:visible="showVoteDialog" :style="{ width: '600px' }" :modal="true">
            <template #header>
                <div class="inline-flex items-center justify-center gap-2">
                    <span>
                        <h2>{{ datasetData.dataset_name }}</h2>
                    </span>
                </div>
            </template>
            <div class="p-fluid">
                <div class="field">
                    <label class="block mb-3 text-lg font-semibold">How would you rate this dataset?</label>
                    <div class="flex justify-center my-4">
                        <Rating v-model="selectedRating" :stars="5" :cancel="false" />
                    </div>
                    <div class="text-center text-gray-600 mt-2">
                        <span v-if="selectedRating === 0">Select your rating</span>
                        <span v-else>{{ selectedRating }} star{{ selectedRating > 1 ? 's' : '' }}</span>
                    </div>
                </div>
            </div>
            <template #footer>
                <div class="flex flex-wrap gap-2">
                    <Button label="Cancel" icon="pi pi-times" text @click="showVoteDialog = false" />
                    <Button v-if="hasUserVoted" label="Unvote" icon="pi pi-trash" severity="danger" @click="removeVote"
                        :loading="votingLoading" />
                    <Button label="Vote" icon="pi pi-check" @click="submitVote" :loading="votingLoading"
                        :disabled="!selectedRating" />
                </div>
            </template>
        </Dialog>
    </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useToast } from 'primevue/usetoast'
import { useConfirm } from "primevue/useconfirm"
import api from '@/services/api'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const toast = useToast()
const confirm = useConfirm();

/**
 * Reactive state management
 */
const datasetData = ref({})
const votesData = ref({ votes: [], totalVotes: 0, averageRating: 0 })
const downloadStats = ref({ statistics: { totalDownloads: 0, uniqueUsers: 0, recentDownloads: [] } })
const clonesData = ref([])
const loading = ref(true)
const activeTab = ref('data')
const error = ref('')
const userVote = ref(null)
const votingLoading = ref(false)
const showVoteDialog = ref(false)
const selectedRating = ref(0)
const commentsData = ref([])
const loadingComments = ref(false)
const commentsError = ref('')
const commentCount = ref(0)
const editMode = ref(false)
const visibilityModel = ref(false)
const maxFiles = 10

// Edit form
const editForm = ref({
    dataset_name: '',
    description: '',
    tags: [],
    tutorial_video_url: ''
})

const editFormErrors = ref({})

const downloadChartData = ref({
    labels: [],
    datasets: [
        {
            label: 'Monthly Downloads',
            data: [],
            fill: true,
            borderColor: '#42A5F5',
            backgroundColor: 'rgba(66, 165, 245, 0.1)',
            tension: 0.4
        }
    ]
})

const chartOptions = ref({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
        tooltip: {
            callbacks: {
                label: function (context) {
                    return `Downloads: ${context.parsed.y}`
                }
            }
        }
    },
    scales: {
        y: {
            beginAtZero: true,
            ticks: {
                stepSize: 1
            },
            title: {
                display: true,
                text: 'Number of Downloads'
            }
        },
        x: {
            title: {
                display: true,
                text: 'Month'
            }
        }
    }
})

/**
 * Computed properties for derived state
 */
const isOwner = computed(() => {
    return authStore.isLoggedIn && authStore.user?.username === datasetData.value.owner?.username
})

const lastDownloadDate = computed(() => {
    if (!downloadStats.value.statistics.recentDownloads.length) return 'Never'
    return formatDate(downloadStats.value.statistics.recentDownloads[0].downloadedAt)
})

const hasUserVoted = computed(() => {
    return userVote.value !== null
})

const userCurrentRating = computed(() => {
    return userVote.value?.rating || 0
})

const filteredClones = computed(() => {
    return clonesData.value.filter(clone => {
        // Show approved clones to everyone
        if (clone.status === 'approved') return true;
        // // Show pending clones only to the clone owner or dataset owner
        // if (clone.status === 'pending' || clone.status === 'rejected') {
        //     const isCloneOwner = authStore.isLoggedIn && authStore.user?.username === clone.owner?.username;
        //     const isDatasetOwner = isOwner.value;
        //     return isCloneOwner || isDatasetOwner;
        // }

        return false;
    });
});

const isDatasetAccessible = computed(() => {
    return datasetData.value.status === 'approved' && datasetData.value.is_public
})

const isDatasetApproved = computed(() => {
    return datasetData.value.status === 'approved'
})

const remainingFileSlots = computed(() => {
    return maxFiles - (datasetData.value.files?.length || 0)
})

const statusStyle = computed(() => {
    const styles = {
        approved: {
            class: 'bg-green-50 border border-green-200',
            textColor: 'text-green-700',
            icon: 'pi pi-check',
            message: 'Your dataset is approved and publicly accessible',
            dateLabel: 'Approved on'
        },
        pending: {
            class: 'bg-blue-50 border border-blue-200',
            textColor: 'text-blue-700',
            icon: 'pi pi-clock',
            message: 'Your dataset is pending admin review',
            dateLabel: 'Submitted on'
        },
        rejected: {
            class: 'bg-red-50 border border-red-200',
            textColor: 'text-red-700',
            icon: 'pi pi-times',
            message: 'Your dataset was rejected',
            dateLabel: 'Reviewed on'
        }
    }
    return styles[datasetData.value.status] || styles.pending
})

/**
 * Lifecycle hooks
 */
onMounted(() => {
    loadDatasetData()
})

watch(() => route.params.id, () => {
    loadDatasetData()
})

watch(() => datasetData.value.is_public, (newValue) => {
    visibilityModel.value = newValue
}, { immediate: true })

watch(() => datasetData.value, (newDataset) => {
    if (newDataset) {
        editForm.value = {
            dataset_name: newDataset.dataset_name || '',
            description: newDataset.description || '',
            tags: newDataset.tags ? [...newDataset.tags] : [],
            tutorial_video_url: newDataset.tutorial_video?.url || ''
        }
    }
}, { immediate: true })

/**
 * Delete the entire dataset
 */
const deleteDataset = async () => {
    try {
        await api.delete(`/datasets/${route.params.id}`)

        toast.add({
            severity: 'success',
            summary: 'Dataset Deleted',
            detail: 'Dataset has been permanently deleted',
            life: 3000
        })

        // Redirect to user profile
        router.push(`/profile/${authStore.user?.username}`)
    } catch (error) {
        console.error('Error deleting dataset:', error)
        toast.add({
            severity: 'error',
            summary: 'Delete Failed',
            detail: error.response?.data?.error || 'Failed to delete dataset',
            life: 5000
        })
    }
}

/**
 * Confirm dataset deletion
 */
const confirmDatasetDelete = () => {
    confirm.require({
        message: `Are you sure you want to delete "${datasetData.value.dataset_name}"? This will permanently delete all files and data.`,
        header: 'Confirm Dataset Deletion',
        icon: 'pi pi-exclamation-triangle',
        acceptClass: 'p-button-danger',
        accept: () => deleteDataset(),
        reject: () => {
            // Optional rejection handler
        }
    })
}

const loadComments = async () => {
    if (!isDatasetAccessible.value) return

    loadingComments.value = true
    commentsError.value = ''

    try {
        const response = await api.get(`/datasets/${route.params.id}/comments`)
        commentsData.value = response.data.comments
        commentCount.value = response.data.comment_count
    } catch (error) {
        console.error('Error loading comments:', error)
        commentsError.value = 'Failed to load comments'
    } finally {
        loadingComments.value = false
    }
}

const handleNewComment = () => {
    loadComments() // Reload comments after new comment
}

const toggleEditMode = () => {
    editMode.value = !editMode.value
    if (!editMode.value) {
        // Reset form on cancel
        editForm.value = {
            dataset_name: datasetData.value.dataset_name || '',
            description: datasetData.value.description || '',
            tags: datasetData.value.tags ? [...datasetData.value.tags] : [],
            tutorial_video_url: datasetData.value.tutorial_video?.url || ''
        }
        editFormErrors.value = {}
    }
}

const handleVisibilityToggle = async () => {
    try {
        const response = await api.patch(`/datasets/${route.params.id}/visibility`, {
            is_public: visibilityModel.value
        })
        datasetData.value.is_public = visibilityModel.value
        toast.add({ severity: 'success', summary: 'Visibility Updated', detail: `Dataset is now ${visibilityModel.value ? 'public' : 'private'}`, life: 3000 })
    } catch (error) {
        console.error('Error updating visibility:', error)
        visibilityModel.value = !visibilityModel.value
        toast.add({ severity: 'error', summary: 'Update Failed', detail: error.response?.data?.error || 'Failed to update visibility', life: 5000 })
    }
}

/**
 * Loads all dataset-related data
 */
const loadDatasetData = async () => {
    loading.value = true
    error.value = ''

    try {
        await Promise.all([
            loadDatasetDetails(),
            loadVotesData(),
            loadDownloadStats(),
            loadClonesData(),
            loadUserVote()
        ])

        if (isDatasetAccessible.value) {
            await loadComments()
        }
    } catch (err) {
        error.value = 'Failed to load dataset data'
        console.error('Error loading dataset data:', err)
    } finally {
        loading.value = false
    }
}

/**
 * Fetches dataset details
 */
const loadDatasetDetails = async () => {
    try {
        const response = await api.get(`/datasets/${route.params.id}`)
        datasetData.value = response.data.dataset
    } catch (err) {
        if (err.response?.status === 404) {
            error.value = 'Dataset not found'
        } else {
            throw err
        }
    }
}

/**
 * Fetches votes data
 */
const loadVotesData = async () => {
    try {
        const response = await api.get(`/datasets/${route.params.id}/votes`)
        votesData.value = response.data
    } catch (err) {
        console.error('Error loading votes:', err)
        votesData.value = { votes: [], totalVotes: 0, averageRating: 0 }
    }
}

/**
 * Fetches download statistics
 */
const loadDownloadStats = async () => {
    try {
        const response = await api.get(`/datasets/${route.params.id}/downloads`)
        downloadStats.value = response.data

        // Prepare chart data after loading stats
        prepareChartData()
    } catch (err) {
        console.error('Error loading download stats:', err)
        downloadStats.value = { statistics: { totalDownloads: 0, uniqueUsers: 0, recentDownloads: [] } }
    }
}

/**
 * Fetches clones data
 */
const loadClonesData = async () => {
    try {
        const response = await api.get(`/datasets/${route.params.id}/clones`)
        clonesData.value = response.data.clones || []
    } catch (err) {
        console.error('Error loading clones:', err)
        clonesData.value = []
    }
}

/**
 * Gets avatar background color classes
 */
const getUserAvatarClasses = (username) => {
    const colors = ['bg-emerald-500', 'bg-blue-500', 'bg-purple-500', 'bg-amber-500', 'bg-rose-500', 'bg-cyan-500']
    const index = (username?.charCodeAt(0) || 0) % colors.length
    return `${colors[index]} text-white`
}

/**
 * Loads current user's vote for this dataset
 */
const loadUserVote = async () => {
    if (!authStore.isLoggedIn || isOwner.value) {
        userVote.value = null
        return
    }

    try {
        const response = await api.get(`/datasets/${route.params.id}/votes/me`)
        userVote.value = response.data.hasVoted ? response.data.vote : null
    } catch (err) {
        console.error('Error loading user vote:', err)
        userVote.value = null
    }
}

/**
 * Gets initials for avatar fallback
 */
const getInitials = (fullName) => {
    if (!fullName) return 'U'
    return fullName
        .split(' ')
        .map(name => name.charAt(0))
        .join('')
        .toUpperCase()
        .substring(0, 2)
}

/**
 * Gets avatar URL with proper CouchDB file handling
 */
const getAvatarUrl = (user) => {
    if (!user?.avatarUrl) return null

    try {
        const url = new URL(user.avatarUrl)
        const pathParts = url.pathname.split('/').filter(part => part)

        if (pathParts.length < 3) return null

        const documentId = pathParts[1]
        const filename = pathParts[2]

        return `http://localhost:3000/api/files/${documentId}/${filename}`
    } catch {
        return null
    }
}

/**
 * Formats date for display
 */
const formatDate = (dateString) => {
    if (!dateString) return 'N/A'

    const date = new Date(dateString)
    const now = new Date()
    const diffTime = Math.abs(now - date)
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays === 1) return '1 day ago'
    if (diffDays < 7) return `${diffDays} days ago`
    if (diffDays < 30) return `${Math.ceil(diffDays / 7)} weeks ago`

    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    })
}

/**
 * Formats file size for display
 */
const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

/**
 * Gets YouTube embed URL
 */
const getYouTubeEmbedUrl = (url) => {
    const videoId = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/)?.[1]
    return videoId ? `https://www.youtube.com/embed/${videoId}` : url
}

/**
 * Gets Vimeo embed URL
 */
const getVimeoEmbedUrl = (url) => {
    const videoId = url.match(/vimeo\.com\/(\d+)/)?.[1]
    return videoId ? `https://player.vimeo.com/video/${videoId}` : url
}

/**
 * Opens external video in new tab
 */
const openExternalVideo = (url) => {
    window.open(url, '_blank')
}

/**
 * Extracts the document ID from a CouchDB URL
 * @param {string} url - The full CouchDB URL
 * @returns {string|null} The document ID or null if not found
 */
function extractFileID(url) {
    const parts = url.split('/');
    return parts.length >= 5 ? parts[4] : null;
}

/**
 * Downloads a single file
 */
const downloadFile = async (fileURL, fileName) => {
    try {
        // Implementation for single file download
        const fileID = extractFileID(fileURL)
        const response = await api.get(`/datasets/${route.params.id}/files/${fileID}`, { responseType: 'blob' })
        const blob = new Blob([response.data])
        const link = document.createElement('a')
        link.href = URL.createObjectURL(blob)
        link.download = fileName
        link.click()
        URL.revokeObjectURL(link.href)

        toast.add({
            severity: 'success',
            summary: 'Download Started',
            detail: `Downloading ${fileName}`,
            life: 3000
        })
    } catch (err) {
        console.error('Error downloading file:', err)
        toast.add({
            severity: 'error',
            summary: 'Download Failed',
            detail: err.message,
            life: 5000
        })
    }
}

/**
 * Downloads complete dataset as ZIP
 */
const downloadDataset = async () => {
    try {
        const response = await api.get(`/datasets/${route.params.id}/download`, { responseType: 'blob' })
        const blob = new Blob([response.data])
        const link = document.createElement('a')
        link.href = URL.createObjectURL(blob)
        link.download = `${datasetData.value.dataset_name}.zip`
        link.click()
        URL.revokeObjectURL(link.href)

        toast.add({
            severity: 'success',
            summary: 'Download Started',
            detail: 'Downloading dataset as ZIP',
            life: 3000
        })
    } catch (err) {
        console.error('Error downloading dataset:', err)
        toast.add({
            severity: 'error',
            summary: 'Download Failed',
            detail: err.message,
            life: 5000
        })
    }
}

/**
 * Opens vote dialog and loads user's current vote
 */
const openVoteDialog = async () => {
    if (!authStore.isLoggedIn) {
        router.push('/login')
        return
    }

    showVoteDialog.value = true
    selectedRating.value = userVote.value?.rating || 0
}

/**
 * Submits user's vote
 */
const submitVote = async () => {
    if (!selectedRating.value) {
        toast.add({
            severity: 'warn',
            summary: 'Select Rating',
            detail: 'Please select a rating between 1 and 5 stars',
            life: 3000
        })
        return
    }

    votingLoading.value = true

    try {
        await api.post(`/datasets/${route.params.id}/votes`, {
            rating: selectedRating.value
        })

        // Reload votes data
        await loadVotesData()

        // Reload user's vote
        await loadUserVote()

        toast.add({
            severity: 'success',
            summary: 'Vote Submitted',
            detail: `You rated this dataset ${selectedRating.value} stars`,
            life: 3000
        })

        showVoteDialog.value = false
    } catch (err) {
        console.error('Error submitting vote:', err)
        toast.add({
            severity: 'error',
            summary: 'Vote Failed',
            detail: err.response?.data?.error || 'Failed to submit vote',
            life: 5000
        })
    } finally {
        votingLoading.value = false
    }
}

/**
 * Removes user's vote
 */
const removeVote = async () => {
    votingLoading.value = true

    try {
        await api.delete(`/datasets/${route.params.id}/votes`)

        // Reload votes data and user vote
        await loadVotesData()
        await loadUserVote()
        selectedRating.value = 0

        toast.add({
            severity: 'success',
            summary: 'Vote Removed',
            detail: 'Your vote has been removed',
            life: 3000
        })

        showVoteDialog.value = false
    } catch (err) {
        console.error('Error removing vote:', err)
        toast.add({
            severity: 'error',
            summary: 'Remove Failed',
            detail: err.response?.data?.error || 'Failed to remove vote',
            life: 5000
        })
    } finally {
        votingLoading.value = false
    }
}

/**
 * Clones the dataset
 */
const cloneDataset = async () => {
    try {
        const newName = prompt(`Enter a new name for the cloned dataset:`, `${datasetData.value.dataset_name}-clone`)
        if (!newName) return

        const response = await api.post(`/datasets/${route.params.id}/clone`, {
            new_dataset_name: newName
        })

        toast.add({
            severity: 'success',
            summary: 'Dataset Cloned',
            detail: 'Dataset cloned successfully',
            life: 3000
        })

        // Navigate to the new cloned dataset
        if (response.data.dataset) {
            router.push(`/datasets/${response.data.dataset.dataset_id}`)
        }
    } catch (err) {
        console.error('Error cloning dataset:', err)
        toast.add({
            severity: 'error',
            summary: 'Clone Failed',
            detail: err.response?.data?.error || 'Failed to clone dataset',
            life: 5000
        })
    }
}

/**
 * Prepare complete monthly chart data showing all downloads
 */
const prepareChartData = () => {
    if (!isOwner.value || !downloadStats.value.statistics.recentDownloads.length) {
        return
    }

    const downloads = [...downloadStats.value.statistics.recentDownloads]

    // Get all unique year-months from the data
    const allYearMonths = new Set()
    const monthlyCounts = {}

    // First pass: collect all unique year-months and count downloads
    downloads.forEach(download => {
        const date = new Date(download.downloadedAt)
        const year = date.getFullYear()
        const month = date.getMonth() // 0-11
        const yearMonth = `${year}-${month}`
        const label = date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short'
        })

        allYearMonths.add(yearMonth)
        monthlyCounts[yearMonth] = {
            label: label,
            count: (monthlyCounts[yearMonth]?.count || 0) + 1
        }
    })

    // Convert to arrays and sort chronologically
    const sortedYearMonths = Array.from(allYearMonths).sort()

    const labels = sortedYearMonths.map(ym => monthlyCounts[ym].label)
    const data = sortedYearMonths.map(ym => monthlyCounts[ym].count)

    downloadChartData.value = {
        labels: labels,
        datasets: [
            {
                label: 'Downloads per Month',
                data: data,
                fill: true,
                borderColor: '#42A5F5',
                backgroundColor: 'rgba(66, 165, 245, 0.1)',
                tension: 0.4,
                borderWidth: 2
            }
        ]
    }
}

// Retrieve datasets header photo
const getDatasetHeaderUrl = (dataset) => {
    if (!dataset.header_photo_url) return null;

    const url = new URL(dataset.header_photo_url);
    const pathParts = url.pathname.split('/').filter(part => part);

    if (pathParts.length < 3) return null;

    const documentId = pathParts[1];
    const filename = pathParts[2];

    return `http://localhost:3000/api/files/${documentId}/${filename}`;
};

/**
 * Navigates to user's profile page
 */
const goToProfile = (username) => {
    if (username) {
        router.push(`/profile/${username}`)
    }
}

/**
 * Navigates to dataset detail page
 */
const navigateToDataset = (datasetId) => {
    router.push(`/datasets/${datasetId}`)
}

</script>

<style scoped>
.dataset-detail {
    max-width: 1200px;
}

.video-container {
    position: relative;
    padding-bottom: 56.25%;
    /* 16:9 aspect ratio */
    height: 0;
    overflow: hidden;
}

.video-container iframe {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    border-radius: 8px;
}

:deep(.p-Tabs-nav) {
    border-bottom: 1px solid #e5e7eb;
}

:deep(.p-Tabs-nav-link) {
    padding: 1rem 1.5rem;
}
</style>