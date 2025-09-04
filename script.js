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
dropArea.addEventListener('click', () => fileInput.click());

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
        showMessage(`Чтение файла .${fileType}... | Читання файлу .${fileType}...`, 'info', true);
        
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
                showMessage(`Неподдерживаемый тип файла: .${fileType}. | Непідтримуваний тип файлу: .${fileType}.`, 'error');
                return;
        }

        originalContent.textContent = text;
        showMessage('Файл успешно загружен. Выполняется аннотация... | Файл успішно завантажено. Виконується анотація...', 'info', true);

        const annotatedText = await annotateDocument(text);
        annotatedContent.innerHTML = annotatedText;
        showMessage('Аннотация завершена! | Анотацію завершено!', 'success');
        contentContainer.classList.remove('hidden');

    } catch (error) {
        console.error('Ошибка обработки файла:', error);
        showMessage('Ошибка при обработке документа. Пожалуйста, попробуйте снова. | Помилка під час обробки документа. Будь ласка, спробуйте знову.', 'error');
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
    const systemPrompt = `Ты — эксперт по аннотации документов. 
    Твоя задача — проанализировать предоставленный текст и разметить ключевые фразы, даты, имена, места и другие важные термины, используя теги <span class="annotation">...</span>. 
    Аннотируй только самые важные и релевантные термины. 
    Если в тексте нет ничего, что можно было бы аннотировать, верни исходный текст без изменений.
    Твой ответ должен содержать только размеченный HTML-код.
    Например, "Изучение Марса началось <span class="annotation">в 1960-х годах</span>."
    
    Твоя задача также — распознать язык документа (русский или украинский) и разметить термины, используя правила языка, на котором написан документ. Если документ написан на русском языке, аннотируй на русском. Если на украинском, то на украинском.
    `;

    const userQuery = `Разметь следующий документ: ${text}`;
    const payload = {
        contents: [{ parts: [{ text: userQuery }] }],
        systemInstruction: { parts: [{ text: systemPrompt }] },
    };

    const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        throw new Error(`HTTP-ошибка! Статус: ${response.status}`);
    }

    const result = await response.json();
    const candidate = result.candidates?.[0];
    if (candidate && candidate.content?.parts?.[0]?.text) {
        return candidate.content.parts[0].text;
    } else {
        throw new Error("Не удалось получить результат от ИИ.");
    }
}

// Функция для отображения сообщений пользователю
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
