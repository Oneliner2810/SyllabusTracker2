// ==================== CONSTANTS ====================
const SUBJECT_COLORS = [
    '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#14b8a6',
    '#ec4899', '#ef4444', '#6366f1', '#84cc16', '#06b6d4'
];

// ==================== STATE ====================
let subjects = [];
let draggedItem = null;
let dragType = null;
let dragParentId = null;
let modalCallback = null;

// ==================== STORAGE ====================
function loadData() {
    try {
        const saved = localStorage.getItem('sscSyllabusData');
        if (saved) {
            subjects = JSON.parse(saved);
        }
        
        const theme = localStorage.getItem('sscTheme');
        if (theme === 'dark') {
            document.documentElement.setAttribute('data-theme', 'dark');
            document.querySelector('.theme-toggle').textContent = '☀️';
        }
    } catch (e) {
        console.error('Error loading data:', e);
        subjects = [];
    }
}

function saveData() {
    try {
        localStorage.setItem('sscSyllabusData', JSON.stringify(subjects));
    } catch (e) {
        console.error('Error saving data:', e);
    }
    updateStats();
}

// ==================== THEME ====================
function toggleTheme() {
    const html = document.documentElement;
    const btn = document.querySelector('.theme-toggle');
    
    if (html.getAttribute('data-theme') === 'dark') {
        html.removeAttribute('data-theme');
        btn.textContent = '🌙';
        localStorage.setItem('sscTheme', 'light');
    } else {
        html.setAttribute('data-theme', 'dark');
        btn.textContent = '☀️';
        localStorage.setItem('sscTheme', 'dark');
    }
}

// ==================== EXPORT/IMPORT ====================
function exportData() {
    const dataStr = JSON.stringify(subjects, null, 2);
    showExportModal(dataStr);
}

function showExportModal(data) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay active';
    modal.id = 'exportModal';
    modal.innerHTML = `
        <div class="modal" style="max-width: 600px;">
            <h3 class="modal-title">📤 Export Your Data</h3>
            <p class="modal-message">Choose how to save your backup:</p>
            
            <div style="display: flex; gap: 12px; margin-bottom: 20px;">
                <button class="modal-btn primary" style="flex: 1; padding: 16px;" onclick="downloadAsFile()">
                    📁 Download File<br><small style="opacity: 0.8;">Best for PC</small>
                </button>
                <button class="modal-btn" style="flex: 1; padding: 16px; background: var(--success); color: white;" onclick="showCopySection()">
                    📋 Copy to Clipboard<br><small style="opacity: 0.8;">Best for Mobile</small>
                </button>
            </div>
            
            <div id="copySection" style="display: none;">
                <textarea id="exportTextarea" readonly style="
                    width: 100%;
                    height: 120px;
                    padding: 12px;
                    border: 2px solid var(--border);
                    border-radius: 8px;
                    font-family: 'JetBrains Mono', monospace;
                    font-size: 0.7rem;
                    background: var(--bg-primary);
                    color: var(--text-primary);
                    resize: vertical;
                    margin-bottom: 12px;
                ">${data}</textarea>
                <button class="modal-btn" style="width: 100%; background: var(--success); color: white;" onclick="copyToClipboard()">
                    📋 Copy to Clipboard
                </button>
            </div>
            
            <div class="modal-actions" style="margin-top: 16px;">
                <button class="modal-btn cancel" onclick="closeExportModal()">Close</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

function showCopySection() {
    document.getElementById('copySection').style.display = 'block';
    document.getElementById('exportTextarea').select();
}

function downloadAsFile() {
    const dataStr = JSON.stringify(subjects, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const date = new Date().toISOString().split('T')[0];
    a.href = url;
    a.download = `ssc_syllabus_backup_${date}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('File downloaded! 💾');
    closeExportModal();
}

function copyToClipboard() {
    const textarea = document.getElementById('exportTextarea');
    textarea.select();
    
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(textarea.value)
            .then(() => showToast('Copied to clipboard! 📋'))
            .catch(() => {
                document.execCommand('copy');
                showToast('Copied! 📋');
            });
    } else {
        document.execCommand('copy');
        showToast('Copied! 📋');
    }
}

function closeExportModal() {
    const modal = document.getElementById('exportModal');
    if (modal) modal.remove();
}

function showImportModal() {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay active';
    modal.id = 'importModal';
    modal.innerHTML = `
        <div class="modal" style="max-width: 600px;">
            <h3 class="modal-title">📥 Import Your Data</h3>
            <p class="modal-message">Restore from your backup:</p>
            
            <div style="display: flex; gap: 12px; margin-bottom: 20px;">
                <button class="modal-btn primary" style="flex: 1; padding: 16px;" onclick="document.getElementById('importInput').click();">
                    📁 Select File<br><small style="opacity: 0.8;">Best for PC</small>
                </button>
                <button class="modal-btn" style="flex: 1; padding: 16px; background: var(--success); color: white;" onclick="showPasteSection()">
                    📋 Paste Data<br><small style="opacity: 0.8;">Best for Mobile</small>
                </button>
            </div>
            
            <div id="pasteSection" style="display: none;">
                <textarea id="importTextarea" placeholder="Paste your backup data here..." style="
                    width: 100%;
                    height: 120px;
                    padding: 12px;
                    border: 2px solid var(--border);
                    border-radius: 8px;
                    font-family: 'JetBrains Mono', monospace;
                    font-size: 0.7rem;
                    background: var(--bg-primary);
                    color: var(--text-primary);
                    resize: vertical;
                    margin-bottom: 12px;
                "></textarea>
                <button class="modal-btn primary" style="width: 100%;" onclick="importFromPaste()">
                    📥 Import Data
                </button>
            </div>
            
            <div class="modal-actions" style="margin-top: 16px;">
                <button class="modal-btn cancel" onclick="closeImportModal()">Cancel</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

function showPasteSection() {
    document.getElementById('pasteSection').style.display = 'block';
    document.getElementById('importTextarea').focus();
}

function closeImportModal() {
    const modal = document.getElementById('importModal');
    if (modal) modal.remove();
}

function importFromFile(event) {
    const file = event?.target?.files?.[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            processImport(e.target.result);
            closeImportModal();
        };
        reader.readAsText(file);
        event.target.value = '';
    }
}

function importFromPaste() {
    const data = document.getElementById('importTextarea').value.trim();
    if (data) {
        processImport(data);
        closeImportModal();
    } else {
        showToast('Please paste your backup data! ⚠️');
    }
}

function processImport(dataStr) {
    try {
        const imported = JSON.parse(dataStr);
        if (Array.isArray(imported)) {
            subjects = imported;
            saveData();
            renderSubjects();
            showToast('Data imported successfully! 🎉');
        } else {
            throw new Error('Invalid format');
        }
    } catch (e) {
        showToast('Invalid data format! ❌');
    }
}

// ==================== TOAST ====================
function showToast(message) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2500);
}

// ==================== CONFETTI ====================
function triggerConfetti() {
    const container = document.getElementById('confettiContainer');
    const colors = ['#6366f1', '#ec4899', '#10b981', '#f59e0b', '#3b82f6', '#8b5cf6'];
    
    for (let i = 0; i < 50; i++) {
        const confetti = document.createElement('div');
        confetti.className = 'confetti';
        confetti.style.left = Math.random() * 100 + '%';
        confetti.style.background = colors[Math.floor(Math.random() * colors.length)];
        confetti.style.animationDelay = Math.random() * 0.5 + 's';
        confetti.style.borderRadius = Math.random() > 0.5 ? '50%' : '0';
        container.appendChild(confetti);
        setTimeout(() => confetti.remove(), 3500);
    }
}

// ==================== PIE CHART ====================
function createPieChart(completed, total, size = 140) {
    const radius = size * 0.38;
    const circumference = 2 * Math.PI * radius;
    const percentage = total === 0 ? 0 : (completed / total) * 100;
    const offset = circumference - (percentage / 100) * circumference;
    
    let strokeColor = 'var(--primary)';
    if (percentage >= 100) strokeColor = 'var(--success)';
    else if (percentage >= 70) strokeColor = '#84cc16';
    else if (percentage >= 40) strokeColor = 'var(--warning)';
    else if (percentage > 0) strokeColor = '#f97316';

    return `
        <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
            <circle cx="${size/2}" cy="${size/2}" r="${radius}" fill="none" stroke="var(--border)" stroke-width="${size * 0.08}"/>
            <circle cx="${size/2}" cy="${size/2}" r="${radius}" fill="none" stroke="${strokeColor}" stroke-width="${size * 0.08}"
                stroke-dasharray="${circumference}" stroke-dashoffset="${offset}" stroke-linecap="round"
                style="transition: stroke-dashoffset 0.5s ease, stroke 0.3s ease;"/>
        </svg>
        <div class="pie-chart-text">
            <div class="pie-percentage">${percentage.toFixed(0)}%</div>
            <div class="pie-label">Complete</div>
        </div>
    `;
}

function createMiniPie(completed, total) {
    const size = 36;
    const radius = 13;
    const circumference = 2 * Math.PI * radius;
    const percentage = total === 0 ? 0 : (completed / total) * 100;
    const offset = circumference - (percentage / 100) * circumference;
    
    let strokeColor = 'var(--primary)';
    if (percentage >= 100) strokeColor = 'var(--success)';
    else if (percentage >= 70) strokeColor = '#84cc16';
    else if (percentage >= 40) strokeColor = 'var(--warning)';
    else if (percentage > 0) strokeColor = '#f97316';

    return `
        <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" style="transform: rotate(-90deg);">
            <circle cx="18" cy="18" r="${radius}" fill="none" stroke="var(--border)" stroke-width="4"/>
            <circle cx="18" cy="18" r="${radius}" fill="none" stroke="${strokeColor}" stroke-width="4"
                stroke-dasharray="${circumference}" stroke-dashoffset="${offset}" stroke-linecap="round"
                style="transition: stroke-dashoffset 0.3s ease;"/>
        </svg>
        <span class="mini-pie-text">${completed}/${total}</span>
    `;
}

// ==================== STATS ====================
function updateStats() {
    let total = 0;
    let completed = 0;
    let today = 0;
    const todayStr = new Date().toDateString();

    subjects.forEach(subject => {
        subject.topics?.forEach(topic => {
            topic.subtopics?.forEach(subtopic => {
                total++;
                if (subtopic.completed) {
                    completed++;
                    if (subtopic.completedAt && new Date(subtopic.completedAt).toDateString() === todayStr) {
                        today++;
                    }
                }
            });
        });
    });

    document.getElementById('mainPieChart').innerHTML = createPieChart(completed, total);
    document.getElementById('totalCount').textContent = total;
    document.getElementById('completedCount').textContent = completed;
    document.getElementById('remainingCount').textContent = total - completed;
    document.getElementById('todayCount').textContent = today;
}

// ==================== MODAL ====================
function showModal(title, message, onConfirm) {
    document.getElementById('modalTitle').textContent = title;
    document.getElementById('modalMessage').textContent = message;
    document.getElementById('confirmModal').classList.add('active');
    modalCallback = onConfirm;
    document.getElementById('modalConfirmBtn').onclick = () => {
        if (modalCallback) modalCallback();
        closeModal();
    };
}

function closeModal() {
    document.getElementById('confirmModal').classList.remove('active');
    modalCallback = null;
}

// ==================== SUBJECTS ====================
function addSubject() {
    const input = document.getElementById('subjectInput');
    const name = input.value.trim();
    if (name) {
        subjects.push({
            id: Date.now(),
            name: name,
            colorIndex: subjects.length % SUBJECT_COLORS.length,
            collapsed: false,
            topics: []
        });
        input.value = '';
        saveData();
        renderSubjects();
        showToast('Subject added! 📗');
    }
}

function handleSubjectKeypress(e) {
    if (e.key === 'Enter') addSubject();
}

function toggleSubject(id) {
    const subject = subjects.find(s => s.id === id);
    if (subject) {
        subject.collapsed = !subject.collapsed;
        saveData();
        renderSubjects();
    }
}

function editSubject(e, id) {
    e.stopPropagation();
    const subject = subjects.find(s => s.id === id);
    const el = document.getElementById(`subject-name-${id}`);
    el.innerHTML = `<input type="text" class="subject-name-input" value="${subject.name}" 
        onblur="finishEditSubject(${id}, this.value)"
        onkeypress="if(event.key==='Enter')this.blur()"
        onclick="event.stopPropagation()">`;
    el.querySelector('input').focus();
    el.querySelector('input').select();
}

function finishEditSubject(id, newName) {
    const subject = subjects.find(s => s.id === id);
    if (subject && newName.trim()) {
        subject.name = newName.trim();
        saveData();
    }
    renderSubjects();
}

function deleteSubject(e, id) {
    e.stopPropagation();
    const subject = subjects.find(s => s.id === id);
    showModal('Delete Subject', `Delete "${subject.name}" and all its contents? This cannot be undone.`, () => {
        subjects = subjects.filter(s => s.id !== id);
        saveData();
        renderSubjects();
        showToast('Subject deleted! 🗑️');
    });
}

// ==================== TOPICS ====================
function addTopic(subjectId) {
    const input = document.getElementById(`topic-input-${subjectId}`);
    const name = input.value.trim();
    if (name) {
        const subject = subjects.find(s => s.id === subjectId);
        if (subject) {
            subject.topics.push({
                id: Date.now(),
                name: name,
                collapsed: false,
                subtopics: []
            });
            input.value = '';
            saveData();
            renderSubjects();
            showToast('Topic added! 📖');
        }
    }
}

function handleTopicKeypress(e, subjectId) {
    if (e.key === 'Enter') addTopic(subjectId);
}

function toggleTopic(subjectId, topicId) {
    const subject = subjects.find(s => s.id === subjectId);
    const topic = subject?.topics?.find(t => t.id === topicId);
    if (topic) {
        topic.collapsed = !topic.collapsed;
        saveData();
        renderSubjects();
    }
}

function editTopic(e, subjectId, topicId) {
    e.stopPropagation();
    const subject = subjects.find(s => s.id === subjectId);
    const topic = subject?.topics?.find(t => t.id === topicId);
    const el = document.getElementById(`topic-name-${topicId}`);
    el.innerHTML = `<input type="text" class="topic-name-input" value="${topic.name}"
        onblur="finishEditTopic(${subjectId}, ${topicId}, this.value)"
        onkeypress="if(event.key==='Enter')this.blur()"
        onclick="event.stopPropagation()">`;
    el.querySelector('input').focus();
    el.querySelector('input').select();
}

function finishEditTopic(subjectId, topicId, newName) {
    const subject = subjects.find(s => s.id === subjectId);
    const topic = subject?.topics?.find(t => t.id === topicId);
    if (topic && newName.trim()) {
        topic.name = newName.trim();
        saveData();
    }
    renderSubjects();
}

function deleteTopic(e, subjectId, topicId) {
    e.stopPropagation();
    const subject = subjects.find(s => s.id === subjectId);
    const topic = subject?.topics?.find(t => t.id === topicId);
    showModal('Delete Topic', `Delete "${topic.name}" and all subtopics? This cannot be undone.`, () => {
        subject.topics = subject.topics.filter(t => t.id !== topicId);
        saveData();
        renderSubjects();
        showToast('Topic deleted! 🗑️');
    });
}

// ==================== SUBTOPICS ====================
function addSubtopic(subjectId, topicId) {
    const input = document.getElementById(`subtopic-input-${topicId}`);
    const name = input.value.trim();
    if (name) {
        const subject = subjects.find(s => s.id === subjectId);
        const topic = subject?.topics?.find(t => t.id === topicId);
        if (topic) {
            topic.subtopics.push({
                id: Date.now(),
                name: name,
                completed: false,
                completedAt: null
            });
            input.value = '';
            saveData();
            renderSubjects();
        }
    }
}

function handleSubtopicKeypress(e, subjectId, topicId) {
    if (e.key === 'Enter') addSubtopic(subjectId, topicId);
}

function toggleSubtopic(subjectId, topicId, subtopicId) {
    const subject = subjects.find(s => s.id === subjectId);
    const topic = subject?.topics?.find(t => t.id === topicId);
    const subtopic = topic?.subtopics?.find(st => st.id === subtopicId);
    
    if (subtopic) {
        const wasCompleted = subtopic.completed;
        subtopic.completed = !wasCompleted;
        subtopic.completedAt = subtopic.completed ? new Date().toISOString() : null;
        
        // Check if topic just completed
        if (!wasCompleted && subtopic.completed) {
            const allDone = topic.subtopics.every(st => st.completed);
            if (allDone) triggerConfetti();
        }
        
        saveData();
        renderSubjects();
    }
}

function editSubtopic(e, subjectId, topicId, subtopicId) {
    e.stopPropagation();
    const subject = subjects.find(s => s.id === subjectId);
    const topic = subject?.topics?.find(t => t.id === topicId);
    const subtopic = topic?.subtopics?.find(st => st.id === subtopicId);
    const el = document.getElementById(`subtopic-name-${subtopicId}`);
    el.innerHTML = `<input type="text" class="subtopic-name-input" value="${subtopic.name}"
        onblur="finishEditSubtopic(${subjectId}, ${topicId}, ${subtopicId}, this.value)"
        onkeypress="if(event.key==='Enter')this.blur()"
        onclick="event.stopPropagation()">`;
    el.querySelector('input').focus();
    el.querySelector('input').select();
}

function finishEditSubtopic(subjectId, topicId, subtopicId, newName) {
    const subject = subjects.find(s => s.id === subjectId);
    const topic = subject?.topics?.find(t => t.id === topicId);
    const subtopic = topic?.subtopics?.find(st => st.id === subtopicId);
    if (subtopic && newName.trim()) {
        subtopic.name = newName.trim();
        saveData();
    }
    renderSubjects();
}

function deleteSubtopic(e, subjectId, topicId, subtopicId) {
    e.stopPropagation();
    const subject = subjects.find(s => s.id === subjectId);
    const topic = subject?.topics?.find(t => t.id === topicId);
    const subtopic = topic?.subtopics?.find(st => st.id === subtopicId);
    showModal('Delete Subtopic', `Delete "${subtopic.name}"?`, () => {
        topic.subtopics = topic.subtopics.filter(st => st.id !== subtopicId);
        saveData();
        renderSubjects();
        showToast('Subtopic deleted! 🗑️');
    });
}

// ==================== DRAG & DROP ====================
function handleDragStart(e, type, id, parentId = null) {
    draggedItem = id;
    dragType = type;
    dragParentId = parentId;
    e.target.closest(`.${type}-card, .subject-card`)?.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
}

function handleDragEnd(e) {
    document.querySelectorAll('.dragging, .drag-over').forEach(el => {
        el.classList.remove('dragging', 'drag-over');
    });
    draggedItem = null;
    dragType = null;
    dragParentId = null;
}

function handleDragOver(e, type, parentId = null) {
    e.preventDefault();
    if (dragType === type && (type === 'subject' || dragParentId === parentId)) {
        e.target.closest(`.${type}-card, .subject-card`)?.classList.add('drag-over');
    }
}

function handleDragLeave(e, type) {
    e.target.closest(`.${type}-card, .subject-card`)?.classList.remove('drag-over');
}

function handleDrop(e, type, targetId, parentId = null) {
    e.preventDefault();
    
    if (dragType !== type || draggedItem === targetId) return;
    
    let array, draggedIndex, targetIndex;
    
    if (type === 'subject') {
        array = subjects;
        draggedIndex = array.findIndex(s => s.id === draggedItem);
        targetIndex = array.findIndex(s => s.id === targetId);
    } else if (type === 'topic' && dragParentId === parentId) {
        const subject = subjects.find(s => s.id === parentId);
        array = subject.topics;
        draggedIndex = array.findIndex(t => t.id === draggedItem);
        targetIndex = array.findIndex(t => t.id === targetId);
    } else {
        return;
    }
    
    if (draggedIndex !== -1 && targetIndex !== -1) {
        const [removed] = array.splice(draggedIndex, 1);
        array.splice(targetIndex, 0, removed);
        saveData();
        renderSubjects();
    }
    
    document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
}

// ==================== FORMAT DATE ====================
function formatDate(isoString) {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short'
    });
}

// ==================== RENDER ====================
function renderSubjects() {
    const container = document.getElementById('subjectsContainer');
    
    if (subjects.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📚</div>
                <h3 class="empty-state-title">No Subjects Yet</h3>
                <p class="empty-state-text">Add your first subject to start tracking!</p>
            </div>
        `;
        updateStats();
        return;
    }

    container.innerHTML = subjects.map(subject => {
        const subjectColor = SUBJECT_COLORS[subject.colorIndex % SUBJECT_COLORS.length];
        
        // Calculate subject progress
        let subjectTotal = 0, subjectCompleted = 0;
        subject.topics?.forEach(topic => {
            topic.subtopics?.forEach(st => {
                subjectTotal++;
                if (st.completed) subjectCompleted++;
            });
        });
        const subjectPercent = subjectTotal > 0 ? Math.round((subjectCompleted / subjectTotal) * 100) : 0;

        return `
            <div class="subject-card ${subject.collapsed ? 'collapsed' : ''}"
                 style="--subject-color: ${subjectColor}"
                 draggable="true"
                 ondragstart="handleDragStart(event, 'subject', ${subject.id})"
                 ondragend="handleDragEnd(event)"
                 ondragover="handleDragOver(event, 'subject')"
                 ondragleave="handleDragLeave(event, 'subject')"
                 ondrop="handleDrop(event, 'subject', ${subject.id})">
                
                <div class="subject-header" onclick="toggleSubject(${subject.id})">
                    <div class="subject-header-left">
                        <span class="drag-handle" onclick="event.stopPropagation()" title="Drag to reorder">⋮⋮</span>
                        <span class="collapse-icon">▼</span>
                        <span class="subject-name" id="subject-name-${subject.id}">${subject.name}</span>
                        <span class="subject-badge">${subjectPercent}% • ${subject.topics?.length || 0} topics</span>
                    </div>
                    <div class="subject-actions">
                        <button class="btn-icon edit" onclick="editSubject(event, ${subject.id})" title="Edit">✏️</button>
                        <button class="btn-icon danger" onclick="deleteSubject(event, ${subject.id})" title="Delete">🗑️</button>
                    </div>
                </div>
                
                <div class="subject-content">
                    ${(subject.topics || []).map(topic => {
                        // Calculate topic progress
                        const topicTotal = topic.subtopics?.length || 0;
                        const topicCompleted = topic.subtopics?.filter(st => st.completed).length || 0;

                        return `
                            <div class="topic-card ${topic.collapsed ? 'collapsed' : ''}"
                                 draggable="true"
                                 ondragstart="handleDragStart(event, 'topic', ${topic.id}, ${subject.id})"
                                 ondragend="handleDragEnd(event)"
                                 ondragover="handleDragOver(event, 'topic', ${subject.id})"
                                 ondragleave="handleDragLeave(event, 'topic')"
                                 ondrop="handleDrop(event, 'topic', ${topic.id}, ${subject.id})">
                                
                                <div class="topic-header" onclick="toggleTopic(${subject.id}, ${topic.id})">
                                    <div class="topic-header-left">
                                        <span class="drag-handle" onclick="event.stopPropagation()">⋮⋮</span>
                                        <span class="collapse-icon">▼</span>
                                        <span class="topic-name" id="topic-name-${topic.id}">${topic.name}</span>
                                        <span class="topic-badge">${topicCompleted}/${topicTotal}</span>
                                    </div>
                                    <div class="topic-header-right">
                                        <div class="mini-pie">${createMiniPie(topicCompleted, topicTotal)}</div>
                                        <button class="btn-icon edit" onclick="editTopic(event, ${subject.id}, ${topic.id})" title="Edit">✏️</button>
                                        <button class="btn-icon danger" onclick="deleteTopic(event, ${subject.id}, ${topic.id})" title="Delete">🗑️</button>
                                    </div>
                                </div>
                                
                                <div class="topic-content">
                                    ${(topic.subtopics || []).map(subtopic => `
                                        <div class="subtopic-item ${subtopic.completed ? 'completed' : ''}"
                                             onclick="toggleSubtopic(${subject.id}, ${topic.id}, ${subtopic.id})">
                                            <input type="checkbox" class="subtopic-checkbox"
                                                   ${subtopic.completed ? 'checked' : ''}
                                                   onclick="event.stopPropagation(); toggleSubtopic(${subject.id}, ${topic.id}, ${subtopic.id})">
                                            <span class="subtopic-name" id="subtopic-name-${subtopic.id}">${subtopic.name}</span>
                                            ${subtopic.completed && subtopic.completedAt ? 
                                                `<span class="subtopic-date">✓ ${formatDate(subtopic.completedAt)}</span>` : ''}
                                            <div class="subtopic-actions">
                                                <button class="btn-icon edit" onclick="editSubtopic(event, ${subject.id}, ${topic.id}, ${subtopic.id})" title="Edit">✏️</button>
                                                <button class="btn-icon danger" onclick="deleteSubtopic(event, ${subject.id}, ${topic.id}, ${subtopic.id})" title="Delete">🗑️</button>
                                            </div>
                                        </div>
                                    `).join('')}
                                    
                                    <div class="add-row" style="--subject-color: ${subjectColor}">
                                        <input type="text" id="subtopic-input-${topic.id}"
                                               placeholder="Add subtopic..."
                                               onkeypress="handleSubtopicKeypress(event, ${subject.id}, ${topic.id})">
                                        <button onclick="addSubtopic(${subject.id}, ${topic.id})">➕ Add</button>
                                    </div>
                                </div>
                            </div>
                        `;
                    }).join('')}
                    
                    <div class="add-row" style="--subject-color: ${subjectColor}">
                        <input type="text" id="topic-input-${subject.id}"
                               placeholder="Add new topic..."
                               onkeypress="handleTopicKeypress(event, ${subject.id})">
                        <button onclick="addTopic(${subject.id})">➕ Add Topic</button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
    
    updateStats();
}

// ==================== EVENT LISTENERS ====================
document.getElementById('confirmModal').addEventListener('click', function(e) {
    if (e.target === this) closeModal();
});

document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        closeModal();
        closeExportModal();
        closeImportModal();
    }
});

// ==================== INIT ====================
loadData();
renderSubjects();
