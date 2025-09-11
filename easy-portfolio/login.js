document.addEventListener('DOMContentLoaded', () => {
    // Form containers
    const loginContainer = document.getElementById('login-container');
    const registerContainer = document.getElementById('register-container');

    // Forms
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');

    // Error message elements
    const loginErrorElement = document.getElementById('login-error');
    const registerErrorElement = document.getElementById('register-error');

    // Toggle links
    const showRegisterLink = document.getElementById('show-register-link');
    const showLoginLink = document.getElementById('show-login-link');

    // --- USER DATA MANAGEMENT (using localStorage) ---

    // IMPORTANTE: Senhas nunca devem ser guardadas no código assim em um ambiente real.
    const defaultUsers = {
        'adm@email.com': { password: 'adm123', role: 'adm', nome: 'Admin', sobrenome: 'do Site' },
        'rangner@email.com': { password: 'rangner123', role: 'adm', nome: 'Rangner', sobrenome: 'Luiz' },
        'rangner.luiz@energiasirius.com': { password: 'sirius123', role: 'adm', nome: 'Rangner', sobrenome: 'Sirius' },
        'producao@email.com': { password: 'prod123', role: 'producao', nome: 'Usuário', sobrenome: 'Produção' },
        'transportadora@email.com': { password: 'trans123', role: 'transportadora', nome: 'Usuário', sobrenome: 'Transporte' }
    };

    const getUsers = () => {
        const usersJSON = localStorage.getItem('appUsers');
        let storedUsers = {};

        if (!usersJSON) {
            // Se não houver usuários no armazenamento, inicializa com os padrões.
            localStorage.setItem('appUsers', JSON.stringify(defaultUsers));
            return defaultUsers;
        }

        try {
            storedUsers = JSON.parse(usersJSON);
        } catch (e) {
            console.error("Erro ao analisar usuários do localStorage, redefinindo para o padrão.", e);
            localStorage.setItem('appUsers', JSON.stringify(defaultUsers));
            return defaultUsers;
        }

        // Mescla os usuários padrão com os armazenados.
        // Isso garante que os usuários padrão (como ADM) sempre tenham os dados corretos do código,
        // corrigindo qualquer informação desatualizada no localStorage.
        // A ordem é importante: os dados armazenados (storedUsers) devem sobrescrever os padrões (defaultUsers).
        const finalUsers = { ...defaultUsers, ...storedUsers };

        // Salva a lista mesclada de volta para garantir que o localStorage esteja sempre correto.
        // Isso corrige o problema de um usuário padrão ter um perfil antigo salvo no navegador.
        saveUsers(finalUsers);

        return finalUsers;
    };

    const saveUsers = (users) => {
        localStorage.setItem('appUsers', JSON.stringify(users));
    };

    // --- VIEW TOGGLING ---

    showRegisterLink.addEventListener('click', (e) => {
        e.preventDefault();
        loginContainer.style.display = 'none';
        registerContainer.style.display = 'block';
    });

    showLoginLink.addEventListener('click', (e) => {
        e.preventDefault();
        registerContainer.style.display = 'none';
        loginContainer.style.display = 'block';
    });

    // --- LOGIN LOGIC ---

    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = loginForm.email.value;
        const password = loginForm.password.value;
        const users = getUsers();
        const user = users[email];

        if (user && user.password === password) {
            sessionStorage.setItem('userRole', user.role);
            sessionStorage.setItem('userEmail', email);
            window.location.href = 'index.html';
        } else {
            loginErrorElement.textContent = 'Email ou senha incorretos.';
            loginForm.password.value = '';
        }
    });

    // --- REGISTRATION LOGIC ---

    registerForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = registerForm.email.value;
        const password = registerForm.password.value;
        const confirmPassword = registerForm['confirm-password'].value;
        const role = registerForm.role.value;
        const nome = registerForm.nome.value.trim();
        const sobrenome = registerForm.sobrenome.value.trim();
        const contato = registerForm.contato.value.trim();
        
        registerErrorElement.textContent = ''; // Clear previous errors

        if (!nome || !sobrenome || !contato) {
            registerErrorElement.textContent = 'Todos os campos são obrigatórios.';
            return;
        }

        if (password !== confirmPassword) {
            registerErrorElement.textContent = 'As senhas não coincidem.';
            return;
        }

        const users = getUsers();

        if (users[email]) {
            registerErrorElement.textContent = 'Este email já está cadastrado.';
            return;
        }

        // Add new user
        users[email] = { password, role, nome, sobrenome, contato };
        saveUsers(users);

        alert('Conta criada com sucesso! Por favor, faça o login.');
        // Switch back to login view
        showLoginLink.click();
        loginForm.email.value = email;
        loginForm.password.value = '';
        registerForm.reset();
    });
});