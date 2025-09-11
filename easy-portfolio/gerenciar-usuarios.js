document.addEventListener('DOMContentLoaded', () => {
    // Verifica se o usuário é administrador
    if (sessionStorage.getItem('userRole') !== 'adm') {
        alert('Acesso negado. Esta página é apenas para administradores.');
        window.location.href = 'index.html';
        return;
    }

    // Adiciona o identificador da página para a verificação de permissão
    checkPagePermission('gerenciar-usuarios');

    const userListBody = document.getElementById('user-list-body');
    const editModal = document.getElementById('edit-user-role-modal');
    const closeModalBtn = document.getElementById('close-user-role-modal');
    const editForm = document.getElementById('edit-user-role-form');
    const userEmailSpan = document.getElementById('editing-user-email');
    const roleSelect = document.getElementById('user-role-select');

    let currentlyEditingEmail = null;

    const getUsersFromStorage = () => {
        const usersJSON = localStorage.getItem('appUsers');
        return usersJSON ? JSON.parse(usersJSON) : {};
    };

    const saveUsersToStorage = (users) => {
        localStorage.setItem('appUsers', JSON.stringify(users));
    };

    const renderUserList = () => {
        const allUsers = getUsersFromStorage();
        const loggedInUserEmail = sessionStorage.getItem('userEmail');
        userListBody.innerHTML = ''; // Limpa a tabela

        for (const email in allUsers) {
            const user = allUsers[email];
            const tr = document.createElement('tr');

            const name = user.nome && user.sobrenome ? `${user.nome} ${user.sobrenome}` : 'Nome não definido';

            tr.innerHTML = `
                <td>${name}</td>
                <td>${email}</td>
                <td>${user.role || 'N/A'}</td>
                <td class="user-actions">
                    <button class="edit-user-btn" data-email="${email}"><i class="fas fa-pencil-alt"></i></button>
                    <button class="delete-user-btn" data-email="${email}" ${email === loggedInUserEmail ? 'disabled' : ''}><i class="fas fa-trash-alt"></i></button>
                </td>
            `;
            userListBody.appendChild(tr);
        }

        // Adiciona event listeners aos novos botões
        document.querySelectorAll('.edit-user-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const email = e.currentTarget.dataset.email;
                openEditModal(email);
            });
        });

        document.querySelectorAll('.delete-user-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const email = e.currentTarget.dataset.email;
                deleteUser(email);
            });
        });
    };

    const openEditModal = (email) => {
        const allUsers = getUsersFromStorage();
        const user = allUsers[email];
        if (!user) return;

        currentlyEditingEmail = email;
        userEmailSpan.textContent = email;
        roleSelect.value = user.role;
        editModal.style.display = 'flex';
    };

    const closeEditModal = () => {
        editModal.style.display = 'none';
        currentlyEditingEmail = null;
    };

    const deleteUser = (email) => {
        if (confirm(`Tem certeza que deseja excluir o usuário ${email}? Esta ação não pode ser desfeita.`)) {
            const allUsers = getUsersFromStorage();
            delete allUsers[email];
            saveUsersToStorage(allUsers);
            renderUserList();
        }
    };

    // Listeners do modal
    closeModalBtn.addEventListener('click', closeEditModal);
    editModal.addEventListener('click', (e) => {
        if (e.target === editModal) {
            closeEditModal();
        }
    });

    editForm.addEventListener('submit', (e) => {
        e.preventDefault();
        if (!currentlyEditingEmail) return;

        const newRole = roleSelect.value;
        const allUsers = getUsersFromStorage();
        
        if (allUsers[currentlyEditingEmail]) {
            allUsers[currentlyEditingEmail].role = newRole;
            saveUsersToStorage(allUsers);
            renderUserList();
            closeEditModal();
        } else {
            alert('Erro: Usuário não encontrado.');
        }
    });

    // Inicializa a página
    renderUserList();
});