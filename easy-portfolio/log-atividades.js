document.addEventListener('DOMContentLoaded', () => {
    // --- Proteção de Rota ---
    if (typeof userPermissions === 'undefined' || sessionStorage.getItem('userRole') !== 'adm') {
        alert('Acesso negado. Esta página é apenas para administradores.');
        window.location.href = 'index.html';
        return;
    }

    // --- Seletores ---
    const logListContainer = document.getElementById('log-list-container');
    const paginationControls = document.getElementById('pagination-controls');
    const prevPageBtn = document.getElementById('prev-page-btn');
    const nextPageBtn = document.getElementById('next-page-btn');
    const pageInfo = document.getElementById('page-info');

    // --- Estado da Paginação ---
    let currentPage = 1;
    const logsPerPage = 15;

    // --- Funções ---
    const getLogsFromStorage = () => {
        const logsJSON = localStorage.getItem('appActivityLog');
        try {
            return logsJSON ? JSON.parse(logsJSON) : [];
        } catch (e) {
            console.error("Erro ao analisar logs do localStorage:", e);
            return [];
        }
    };

    const renderLogs = () => {
        const allLogs = getLogsFromStorage();
        logListContainer.innerHTML = '';

        // Calcular paginação
        const totalPages = Math.ceil(allLogs.length / logsPerPage);
        const startIndex = (currentPage - 1) * logsPerPage;
        const endIndex = startIndex + logsPerPage;
        const paginatedLogs = allLogs.slice(startIndex, endIndex);

        if (paginatedLogs.length === 0) {
            logListContainer.innerHTML = '<p style="text-align: center; color: var(--cor-texto-secundario);">Nenhuma atividade registrada.</p>';
        } else {
            paginatedLogs.forEach(log => {
                const logItem = document.createElement('div');
                logItem.className = 'log-item';

                const formattedDate = new Date(log.timestamp).toLocaleString('pt-BR');

                logItem.innerHTML = `
                    <p class="log-action">${log.action}</p>
                    <p class="log-meta">Por: <strong>${log.admin}</strong> em ${formattedDate}</p>
                `;
                logListContainer.appendChild(logItem);
            });
        }

        // Renderizar controles de paginação
        if (totalPages <= 1) {
            paginationControls.style.display = 'none';
        } else {
            paginationControls.style.display = 'flex';
            pageInfo.textContent = `Página ${currentPage} de ${totalPages}`;
            prevPageBtn.disabled = currentPage === 1;
            nextPageBtn.disabled = currentPage === totalPages;
        }
    };

    // --- Event Listeners ---
    prevPageBtn.addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            renderLogs();
        }
    });

    nextPageBtn.addEventListener('click', () => {
        const allLogs = getLogsFromStorage();
        const totalPages = Math.ceil(allLogs.length / logsPerPage);
        if (currentPage < totalPages) {
            currentPage++;
            renderLogs();
        }
    });

    // --- Inicialização ---
    renderLogs();
});