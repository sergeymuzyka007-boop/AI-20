body {
    font-family: 'Inter', sans-serif;
    background: linear-gradient(135deg, #111827 0%, #061123 100%);
    background-attachment: fixed;
}

.animate-spin {
    animation: spin 1s linear infinite;
}

@keyframes spin {
    from {
        transform: rotate(0deg);
    }
    to {
        transform: rotate(360deg);
    }
}

/* Додаткові стилі для покращення вигляду */
.drop-area-container {
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
    transition: all 0.3s ease-in-out;
}

.drop-area-container:hover {
    box-shadow: 0 15px 35px rgba(0, 0, 0, 0.5);
    transform: translateY(-2px);
}

#status-message.success {
    background-color: rgba(34, 197, 94, 0.2);
    color: #22c55e;
}

#status-message.error {
    background-color: rgba(239, 68, 68, 0.2);
    color: #ef4444;
}

/* Кастомний стиль для скролбару */
div.overflow-auto::-webkit-scrollbar {
    width: 8px;
}

div.overflow-auto::-webkit-scrollbar-track {
    background: #1f2937;
    border-radius: 10px;
}

div.overflow-auto::-webkit-scrollbar-thumb {
    background-color: #4b5563;
    border-radius: 10px;
    border: 2px solid #1f2937;
}

div.overflow-auto::-webkit-scrollbar-thumb:hover {
    background-color: #6b7280;
}
