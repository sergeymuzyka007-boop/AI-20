// Налаштування для PDF.js (обов'язково для коректної роботи)
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';

// Отримуємо елементи сторінки
const dropArea = document.getElementById('drop-area');
const fileInput = document.getElementById('file-input');
const statusMessage = document.getElementById('status-message');
const loadingSpinner = document.getElementById('loading-spinner');
const messageText = document.getElementById('message-text');
const contentContainer = document.getElementById('content-container');
const originalContent = document.getElementById('original-content');
const annotatedContent = document.getElementById('annotated-content');

// Конфігурація для API Gemini
const apiKey = "AIzaSyB9ZyGuArCl-8zqAdMQWOAF0JthDp9irnQ";
const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;

// Обробник для кліка по області завантаження
dropArea.addEventListener('click', () => {
    // Вызываем клик на прихованому элементе
    fileInput.click();
});

// Обробники для перетягування файлів
['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    dropArea.addEventListener(eventName, preventDefaults, false);
    document.body.addEventListener(eventName, preventDefaults, false);
});

function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

['dragenter', 'dragover'].forEach(eventName => {
    dropArea.addEventListener(eventName, () => dropArea.classList.add('border-blue-500'), false);
});

['dragleave', 'drop'].forEach(eventName => {
    dropArea.addEventListener(eventName, () => dropArea.classList.remove('border-blue-500'), false);
});

dropArea.addEventListener('drop', handleDrop, false);
fileInput.addEventListener('change', handleFile, false);

function handleDrop(e) {
    const dt = e.dataTransfer;
    const files = dt.files;
    handleFile({ target: { files: files } });
}

async function handleFile(e) {
    const file = e.target.files[0];
    if (!file) {
        return;
    }

    // Скидання попередніх результатів
    originalContent.textContent = '';
    annotatedContent.innerHTML = '';
    contentContainer.classList.add('hidden');

    const fileType = file.name.split('.').pop().toLowerCase();
    let text = '';

    try {
        showMessage(`Читання файлу .${fileType}...`, 'info', true);
        
        switch (fileType) {
            case 'txt':
            case 'json':
            case 'csv':
                text = await readFileAsText(file);
                break;
            case 'pdf':
                text = await readPdfFile(file);
                break;
            case 'docx':
                text = await readDocxFile(file);
                break;
            default:
                showMessage(`Непідтримуваний тип файлу: .${fileType}.`, 'error');
                return;
        }

        originalContent.textContent = text;
        showMessage('Файл успішно завантажено. Виконується анотація...', 'info', true);

        const annotatedText = await annotateDocument(text);
        if (annotatedText) {
            annotatedContent.innerHTML = annotatedText;
            showMessage('Анотацію завершено!', 'success');
            contentContainer.classList.remove('hidden');
        } else {
            showMessage('Не вдалося отримати анотацію для цього документа. Будь ласка, спробуйте інший файл або пізніше.', 'error');
        }

    } catch (error) {
        console.error('Помилка обробки файлу:', error);
        showMessage('Помилка під час обробки документа. Будь ласка, спробуйте знову.', 'error');
    }
}

// Допоміжна функція для читання файлу як тексту
function readFileAsText(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = (e) => reject(e.target.error);
        reader.readAsText(file);
    });
}

// Функція для читання PDF-файлів
async function readPdfFile(file) {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let text = '';
    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        text += content.items.map(item => item.str).join(' ');
    }
    return text;
}

// Функція для читання DOCX-файлів
async function readDocxFile(file) {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer: arrayBuffer });
    return result.value;
}

async function annotateDocument(text) {
    const systemPrompt = `Ти — експерт з аналізу документів. Твоя єдина задача — надати дуже коротке резюме документа. Відповідь має складатися з ОДНОГО речення, без додаткового тексту чи заголовків. Не повертай оригінальний документ. Надай лише стисле резюме.`;

    const userQuery = `Про що цей документ: ${text}`;
    const payload = {
        contents: [{ parts: [{ text: userQuery }] }],
        systemInstruction: { parts: [{ text: systemPrompt }] },
    };

    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            console.error('HTTP Error:', response.status, response.statusText);
            throw new Error(`HTTP-помилка! Статус: ${response.status}`);
        }

        const result = await response.json();
        const candidate = result.candidates?.[0];
        
        if (candidate) {
            // Перевірка, чи не був контент заблокований
            if (candidate.finishReason === 'SAFETY') {
                console.warn('Контент заблоковано через правила безпеки.');
                return null;
            }
            
            const annotatedText = candidate.content?.parts?.[0]?.text;
            if (annotatedText) {
                return annotatedText.trim();
            }
        }
        
        return null;
    } catch (error) {
        console.error('Помилка під час виклику API:', error);
        throw error;
    }
}


// Функція для відображення повідомлень користувачу
function showMessage(text, type, showSpinner = false) {
    statusMessage.classList.remove('hidden');
    messageText.textContent = text;
    loadingSpinner.classList.toggle('hidden', !showSpinner);
    
    if (type === 'error') {
        messageText.classList.remove('text-gray-600', 'text-green-600');
        messageText.classList.add('text-red-600');
    } else if (type === 'success') {
        messageText.classList.remove('text-gray-600', 'text-red-600');
        messageText.classList.add('text-green-600');
    } else {
        messageText.classList.remove('text-red-600', 'text-green-600');
        messageText.classList.add('text-gray-600');
    }
}
