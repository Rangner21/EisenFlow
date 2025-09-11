document.addEventListener('DOMContentLoaded', () => {
    // Verifica se o usuário é administrador
    if (sessionStorage.getItem('userRole') !== 'adm') {
        alert('Acesso negado. Esta página é apenas para administradores.');
        window.location.href = 'index.html';
        return;
    }

    // Adiciona o identificador da página para a verificação de permissão
    checkPagePermission('dashboard');

    // --- FUNÇÕES DE DADOS ---
    const getPostsFromStorage = () => {
        const postsJSON = localStorage.getItem('easyPortfolioPosts');
        return postsJSON ? JSON.parse(postsJSON) : { producao: [], expedicao: [], entregas: [] };
    };

    const getUsersFromStorage = () => {
        const usersJSON = localStorage.getItem('appUsers');
        return usersJSON ? JSON.parse(usersJSON) : {};
    };

    // --- CÁLCULO E RENDERIZAÇÃO DAS ESTATÍSTICAS ---
    const renderDashboardStats = () => {
        const allPostsDataFromStorage = getPostsFromStorage();
        const allUsers = getUsersFromStorage();
        const startDate = document.getElementById('date-start').value;
        const endDate = document.getElementById('date-end').value;

        const dateFilter = (post) => {
            if (!startDate && !endDate) return true; // Nenhum filtro, retorna tudo
            const postDate = post.data;
            const isAfterStart = startDate ? postDate >= startDate : true;
            const isBeforeEnd = endDate ? postDate <= endDate : true;
            return isAfterStart && isBeforeEnd;
        };

        // Filtra os posts de cada categoria
        const producaoPosts = (allPostsDataFromStorage.producao || []).filter(dateFilter);
        const expedicaoPosts = (allPostsDataFromStorage.expedicao || []).filter(dateFilter);
        const entregasPosts = (allPostsDataFromStorage.entregas || []).filter(dateFilter);

        // Combina todos os posts filtrados para estatísticas gerais
        const allFilteredPosts = [...producaoPosts, ...expedicaoPosts, ...entregasPosts];

        // 1. Preenche os cards de estatísticas
        document.getElementById('total-posts-stat').textContent = allFilteredPosts.length;
        document.getElementById('producao-posts-stat').textContent = producaoPosts.length;
        document.getElementById('expedicao-posts-stat').textContent = expedicaoPosts.length;
        document.getElementById('entregas-posts-stat').textContent = entregasPosts.length;

        // 2. Calcula e renderiza posts por usuário
        const postsPerUser = allFilteredPosts.reduce((acc, post) => {
            const email = post.creatorEmail || 'Desconhecido';
            acc[email] = (acc[email] || 0) + 1;
            return acc;
        }, {});

        const userListElement = document.getElementById('user-posts-list');
        userListElement.innerHTML = ''; // Limpa a lista
        
        // Ordena usuários por número de posts
        const sortedUsers = Object.entries(postsPerUser).sort(([, a], [, b]) => b - a);

        sortedUsers.forEach(([email, count]) => {
            const user = allUsers[email];
            const userName = user ? `${user.nome} ${user.sobrenome}` : email;
            const listItem = document.createElement('li');
            listItem.innerHTML = `<span>${userName}</span> <strong>${count}</strong>`;
            userListElement.appendChild(listItem);
        });

        // 3. Prepara dados e renderiza o gráfico
        renderActivityChart(allFilteredPosts);
    };

    const renderActivityChart = (posts) => {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const postsInLast30Days = posts.filter(post => new Date(post.data) >= thirtyDaysAgo);

        const postsByDay = postsInLast30Days.reduce((acc, post) => {
            const date = new Date(post.data).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
            acc[date] = (acc[date] || 0) + 1;
            return acc;
        }, {});

        // Garante que todos os dias dos últimos 30 dias estejam no gráfico, mesmo que com 0 posts
        const labels = [];
        const data = [];
        for (let i = 29; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const formattedDate = date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
            labels.push(formattedDate);
            data.push(postsByDay[formattedDate] || 0);
        }

        const ctx = document.getElementById('posts-chart').getContext('2d');
        new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Posts por Dia',
                    data: data,
                    backgroundColor: 'rgba(0, 123, 255, 0.2)',
                    borderColor: 'rgba(0, 123, 255, 1)',
                    borderWidth: 2,
                    tension: 0.3,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false
            }
        });
    };

    // Adiciona listeners para os filtros de data
    const dateStartInput = document.getElementById('date-start');
    const dateEndInput = document.getElementById('date-end');
    dateStartInput.addEventListener('change', renderDashboardStats);
    dateEndInput.addEventListener('change', renderDashboardStats);

    // Inicializa o dashboard
    renderDashboardStats();
});