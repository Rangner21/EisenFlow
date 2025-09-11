document.addEventListener('DOMContentLoaded', () => {
    // Seletores de elementos
    const modal = document.getElementById('post-form-modal');
    const addPostButtons = document.querySelectorAll('.add-post-btn');
    const closeModalBtn = document.querySelector('#post-form-modal .close-btn');
    const submitPostBtn = document.getElementById('submit-post-btn');

    // Seletores do Menu
    const menuToggle = document.getElementById('menu-toggle');
    const mainMenu = document.getElementById('main-menu');

    // Seletores do formulário
    const postNfInput = document.getElementById('post-nf');
    const postDataInput = document.getElementById('post-data');
    const postObservacaoInput = document.getElementById('post-observacao');
    const postImageInput = document.getElementById('post-image');
    const dropZone = document.getElementById('drop-zone');
    const dropZonePrompt = document.getElementById('drop-zone-prompt');
    const imagePreviewContainer = document.getElementById('image-preview-container');

    const imageZoomModal = document.getElementById('image-zoom-modal');
    const zoomedImage = document.getElementById('zoomed-image');
    const zoomCloseBtn = document.querySelector('.zoom-close-btn');

    // Seletores do Modal de Fonte de Imagem
    const imageSourceModal = document.getElementById('image-source-modal');
    const closeSourceModalBtn = document.getElementById('close-source-modal');
    const sourceFilesBtn = document.getElementById('source-files-btn');
    const sourceCameraBtn = document.getElementById('source-camera-btn');

    // Campos dinâmicos do formulário
    const fieldGroups = {
        produtor: document.getElementById('field-group-produtor'),
        destino: document.getElementById('field-group-destino'),
        conferente: document.getElementById('field-group-conferente'),
        transportadora: document.getElementById('field-group-transportadora')
    };
    const inputs = {
        produtor: document.getElementById('post-produtor'),
        destino: document.getElementById('post-destino'),
        conferente: document.getElementById('post-conferente'),
        transportadora: document.getElementById('post-transportadora')
    };

    // Determina a aba ativa com base no botão que tem a classe 'active' na página atual
    const activeTabButton = document.querySelector('.tab-button.active');
    const currentPage = activeTabButton ? activeTabButton.dataset.tab : null;

    let selectedImageFiles = []; // Array para armazenar os arquivos de imagem selecionados
    let currentEditPostId = null; // Armazena o ID do post que está sendo editado
    let allPostsCache = []; // Cache para evitar ler do localStorage a todo momento

    // --- USER DATA MANAGEMENT (using localStorage) ---
    // Esta lista deve ser mantida em sincronia com a de login.js
    const defaultUsers = {
        'adm@email.com': { password: 'adm123', role: 'adm', nome: 'Admin', sobrenome: 'do Site' },
        'rangner@email.com': { password: 'rangner123', role: 'adm', nome: 'Rangner', sobrenome: 'Luiz' },
        'rangner.luiz@energiasirius.com': { password: 'sirius123', role: 'adm', nome: 'Rangner', sobrenome: 'Sirius' },
        'producao@email.com': { password: 'prod123', role: 'producao', nome: 'Usuário', sobrenome: 'Produção' },
        'transportadora@email.com': { password: 'trans123', role: 'transportadora', nome: 'Usuário', sobrenome: 'Transporte' }
    };

    const getUsersFromStorage = () => {
        const usersJSON = localStorage.getItem('appUsers');
        if (!usersJSON) {
            // Se não houver usuários, retorna apenas os padrões.
            // A página de login é a principal responsável por criar o item no localStorage.
            return defaultUsers;
        }
        try {
            const storedUsers = JSON.parse(usersJSON);
            // Mescla para garantir que os usuários padrão estejam sempre corretos,
            // mas os dados salvos pelo usuário tenham prioridade.
            return { ...defaultUsers, ...storedUsers };
        } catch (e) {
            console.error("Erro ao analisar usuários do localStorage:", e);
            return defaultUsers;
        }
    };

    // --- Funções de Persistência (localStorage) ---

    /**
     * Busca todos os posts salvos no localStorage.
     * @returns {object} Um objeto com arrays de posts para cada categoria.
     */
    const getPostsFromStorage = () => {
        const postsJSON = localStorage.getItem('easyPortfolioPosts');
        if (!postsJSON) {
            return { producao: [], expedicao: [], entregas: [] };
        }
        try {
            // Garante que as imagens sejam arrays, mesmo que os dados antigos não tivessem.
            const posts = JSON.parse(postsJSON);
            for (const key in posts) {
                posts[key].forEach(post => {
                    if (!post.imageUrls) post.imageUrls = [];
                });
            }
            return posts;
        } catch (e) {
            console.error("Erro ao analisar os posts do localStorage:", e);
            return { producao: [], expedicao: [], entregas: [] };
        }
    };

    /**
     * Salva um novo post no localStorage.
     * @param {object} postData - O objeto de dados do post a ser salvo.
     * @param {string} page - A página (categoria) onde o post deve ser salvo.
     */
    const savePostToStorage = (postData, pageIdentifier) => {
        if (!pageIdentifier) return;
        const allPosts = getPostsFromStorage();
        // Adiciona o novo post no início do array da página correta
        allPosts[pageIdentifier].unshift(postData);
        localStorage.setItem('easyPortfolioPosts', JSON.stringify(allPosts));
    };

    // --- LÓGICA DO MENU HAMBURGER ---
    menuToggle.addEventListener('click', (e) => {
        e.stopPropagation(); // Impede que o clique se propague para a janela
        menuToggle.classList.toggle('is-active');
        mainMenu.classList.toggle('is-open');
    });

    // Fecha o menu ao clicar fora dele
    window.addEventListener('click', (e) => {
        if (mainMenu.classList.contains('is-open') && !mainMenu.contains(e.target)) {
            menuToggle.classList.remove('is-active');
            mainMenu.classList.remove('is-open');
        }
    });

    // --- LÓGICA DO MODAL DE POSTAGEM ---
    addPostButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Se não conseguirmos determinar a aba ativa, não abre o modal.
            if (!currentPage) {
                console.error("Não foi possível determinar a aba ativa.");
                return;
            }

            // Oculta todos os grupos de campos dinâmicos primeiro
            Object.values(fieldGroups).forEach(group => group.style.display = 'none');

            // Exibe os campos corretos com base na aba ativa
            if (currentPage === 'producao') {
                fieldGroups.produtor.style.display = 'block';
                fieldGroups.conferente.style.display = 'block';
            } else if (currentPage === 'expedicao') {
                fieldGroups.conferente.style.display = 'block';
                fieldGroups.destino.style.display = 'block';
            } else if (currentPage === 'entregas') {
                fieldGroups.transportadora.style.display = 'block';
                fieldGroups.destino.style.display = 'block';
            }

            modal.style.display = 'flex';
        });
    });

    const closeModal = () => {
        modal.style.display = 'none';
        // Limpa todos os campos do formulário
        postNfInput.value = '';
        postDataInput.value = '';
        Object.values(inputs).forEach(input => input.value = '');
        postObservacaoInput.value = '';
        postImageInput.value = ''; // Limpa o input de arquivo
        selectedImageFiles = []; // Limpa os arquivos selecionados
        imagePreviewContainer.innerHTML = ''; // Limpa as pré-visualizações
        dropZonePrompt.textContent = 'Arraste uma imagem aqui ou clique para selecionar (até 50)';
    };

    const resetModalToCreateMode = () => {
        currentEditPostId = null;
        if (modal) {
            const title = modal.querySelector('h3');
            if (title) title.textContent = 'Adicionar Novo Post';
        }
        if (submitPostBtn) {
            submitPostBtn.textContent = 'Postar';
            submitPostBtn.style.backgroundColor = '#28a745'; // Cor original de criar
        }
    };

    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', closeModal);
    }
    // O listener de clique na janela para fechar o modal é seguro, pois verifica o objeto 'modal'
    // que pode ser nulo em 'home', mas o listener não vai disparar a lógica interna.

    // --- LÓGICA DO MODAL DE ESCOLHA DE FONTE DE IMAGEM ---
    const openSourceModal = (e) => {
        e.preventDefault(); // Impede que o clique no drop-zone abra o seletor de arquivos diretamente
        e.stopPropagation();
        imageSourceModal.style.display = 'flex';
    };

    const closeSourceModal = () => {
        imageSourceModal.style.display = 'none';
    };

    // Abre o modal de escolha ao clicar na área de drop
    if (dropZone) {
        dropZone.addEventListener('click', openSourceModal);
    }

    if (closeSourceModalBtn) {
        closeSourceModalBtn.addEventListener('click', closeSourceModal);
    }
    if (imageSourceModal) {
        imageSourceModal.addEventListener('click', (e) => {
            if (e.target === imageSourceModal) {
                closeSourceModal();
            }
        });
    }

    if (sourceFilesBtn) {
        sourceFilesBtn.addEventListener('click', () => {
            // Garante que o modo câmera não esteja ativo, caso tenha sido usado antes.
            postImageInput.removeAttribute('capture');
        });
    }
    if (sourceCameraBtn) {
        sourceCameraBtn.addEventListener('click', () => {
            // Apenas define o atributo. O clique na label (agora é uma label) cuidará de abrir a câmera.
            postImageInput.setAttribute('capture', 'environment');
        });
    }

    // --- LÓGICA DE DRAG AND DROP E SELEÇÃO DE ARQUIVOS ---
    const handleFiles = (files) => {
        const MAX_IMAGES = 50;
        if (files.length > MAX_IMAGES) {
            alert(`Você pode selecionar no máximo ${MAX_IMAGES} imagens.`);
            return;
        }
        selectedImageFiles = Array.from(files);
        updateImagePreviews();
    };

    if (dropZone) {
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
            }, false);
        });

        ['dragenter', 'dragover'].forEach(eventName => {
            dropZone.addEventListener(eventName, () => dropZone.classList.add('drag-over'), false);
        });

        ['dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, () => dropZone.classList.remove('drag-over'), false);
        });

        dropZone.addEventListener('drop', (e) => {
            handleFiles(e.dataTransfer.files);
        }, false);
    }

    // Ouve por mudanças no input de arquivo, seja por clique, galeria ou câmera.
    if (postImageInput) {
        postImageInput.addEventListener('change', () => {
            if (postImageInput.files && postImageInput.files.length > 0) {
                handleFiles(postImageInput.files);
            }
            closeSourceModal();
        });
    }

    function updateImagePreviews() {
        imagePreviewContainer.innerHTML = '';
        if (selectedImageFiles.length > 0) {
            dropZonePrompt.textContent = `${selectedImageFiles.length} imagem(ns) selecionada(s)`;
            selectedImageFiles.forEach(file => {
                if (file.type.startsWith('image/')) {
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        const imgPreview = document.createElement('img');
                        imgPreview.src = e.target.result;
                        imgPreview.classList.add('modal-image-preview');
                        imagePreviewContainer.appendChild(imgPreview);
                    };
                    reader.readAsDataURL(file);
                }
            });
        } else {
            dropZonePrompt.textContent = 'Arraste uma imagem aqui ou clique para selecionar (até 50)';
        }
    }

    // --- LÓGICA DE CRIAÇÃO DE POST ---
    if (submitPostBtn) {
        submitPostBtn.addEventListener('click', (e) => {
            e.preventDefault();

            // Lógica de Edição
            if (currentEditPostId) {
                const allPosts = getPostsFromStorage();
                const postIndex = allPosts[currentPage].findIndex(p => p.id === currentEditPostId);
                if (postIndex === -1) return;

                const originalPost = allPosts[currentPage][postIndex];

                const updatedPostData = {
                    creatorEmail: originalPost.creatorEmail, // Preserva o criador original
                    id: currentEditPostId,
                    nf: postNfInput.value.trim(),
                    data: postDataInput.value,
                    observacao: postObservacaoInput.value.trim(),
                    produtor: inputs.produtor.value.trim(),
                    conferente: inputs.conferente.value.trim(),
                    destino: inputs.destino.value.trim(),
                    transportadora: inputs.transportadora.value.trim(),
                    imageUrls: originalPost.imageUrls // Mantém as imagens antigas por padrão
                };

                // Se novas imagens foram selecionadas, processa e substitui as antigas.
                if (selectedImageFiles.length > 0) {
                    const imagePromises = selectedImageFiles.map(file => {
                        return new Promise((resolve) => {
                            const reader = new FileReader();
                            reader.onload = (e) => resolve(e.target.result);
                            reader.readAsDataURL(file);
                        });
                    });

                    Promise.all(imagePromises).then(imageUrls => {
                        updatedPostData.imageUrls = imageUrls;
                        allPosts[currentPage][postIndex] = updatedPostData;
                        localStorage.setItem('easyPortfolioPosts', JSON.stringify(allPosts));
                        reloadAllPostsOnPage();
                        closeModal();
                    });
                } else {
                    // Se não houver novas imagens, salva os dados atualizados e mantém as imagens existentes.
                    allPosts[currentPage][postIndex] = updatedPostData;
                    localStorage.setItem('easyPortfolioPosts', JSON.stringify(allPosts));
                    reloadAllPostsOnPage();
                    closeModal();
                }

            } else {
                // Lógica de Criação (existente)
                const postData = {
                    id: Date.now(), // Adiciona um ID único ao novo post
                    creatorEmail: sessionStorage.getItem('userEmail'), // Salva quem criou o post
                    nf: postNfInput.value.trim(),
                    data: postDataInput.value,
                    observacao: postObservacaoInput.value.trim(),
                    produtor: inputs.produtor.value.trim(),
                    conferente: inputs.conferente.value.trim(),
                    destino: inputs.destino.value.trim(),
                    transportadora: inputs.transportadora.value.trim(),
                };

                const imageFilesToProcess = [...selectedImageFiles];

                if (!postData.nf || !postData.data) {
                    alert('Os campos "NF" e "DATA" são obrigatórios.');
                    return;
                }

                const imagePromises = imageFilesToProcess.map(file => {
                    return new Promise((resolve) => {
                        const reader = new FileReader();
                        reader.onload = (e) => resolve(e.target.result);
                        reader.readAsDataURL(file);
                    });
                });

                Promise.all(imagePromises).then(imageUrls => {
                    postData.imageUrls = imageUrls;
                    savePostToStorage(postData, currentPage);
                    reloadAllPostsOnPage();
                    closeModal();
                });
            }
        });
    }

    const createAndAppendPost = (postData, method = 'append') => {
        const { id, nf, data, observacao, produtor, conferente, destino, transportadora, imageUrls, creatorEmail } = postData;
        
        const postItem = document.createElement('div');
        postItem.classList.add('post-item');
        postItem.dataset.nf = nf;
        postItem.dataset.id = id;

        // Adiciona o listener para expandir/recolher
        postItem.addEventListener('click', (e) => {
            // Não faz nada se o clique foi nos botões de ação ou nas imagens
            if (e.target.closest('.post-actions') || e.target.closest('.post-image-container')) {
                return;
            }
            postItem.classList.toggle('expanded');
        });

        // 1. Cria o Cabeçalho do Post
        const header = document.createElement('div');
        header.classList.add('post-header');

        // Cria um contêiner para as informações de texto do cabeçalho
        const infoContainer = document.createElement('div');
        infoContainer.className = 'post-header-info';

        // Cria um contêiner para os botões de ação
        const actionsContainer = document.createElement('div');
        actionsContainer.className = 'post-actions';

        // Lógica de permissão por tempo e propriedade
        const postTimestamp = id;
        const sixtyMinutesInMs = 60 * 60 * 1000;
        const isWithinTimeLimit = (Date.now() - postTimestamp) < sixtyMinutesInMs;
        const currentUserEmail = sessionStorage.getItem('userEmail');
        const currentUserRole = sessionStorage.getItem('userRole');
        const isOwner = currentUserEmail === creatorEmail;

        // Define se o usuário atual pode modificar o post.
        const canModify = (isOwner && isWithinTimeLimit) || currentUserRole === 'adm';

        if (canModify) {
            // Adiciona o botão de editar se o usuário tiver permissão no perfil
            if (userPermissions.canEdit.includes(currentPage)) {
                const editBtn = document.createElement('button');
                editBtn.className = 'edit-post-btn';
                editBtn.innerHTML = '<i class="fas fa-pencil-alt"></i>';
                editBtn.setAttribute('aria-label', 'Editar Post');
                editBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    openModalForEdit(id);
                });
                actionsContainer.appendChild(editBtn);
            }

            // Adiciona o botão de deletar se o usuário tiver permissão no perfil
            if (userPermissions.canDelete.includes(currentPage)) {
                const deleteBtn = document.createElement('button');
                deleteBtn.className = 'delete-post-btn';
                deleteBtn.innerHTML = '<i class="fas fa-trash-alt"></i>';
                deleteBtn.setAttribute('aria-label', 'Excluir Post');
                deleteBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    deletePost(id);
                });
                actionsContainer.appendChild(deleteBtn);
            }
        }

        const createHeaderP = (label, value) => {
            if (value) {
                const p = document.createElement('p');
                p.innerHTML = `<strong>${label}:</strong> ${value}`;
                infoContainer.appendChild(p);
            }
        };

        header.appendChild(infoContainer);
        header.appendChild(actionsContainer);

        createHeaderP('NF', nf);
        if (data) {
            const [year, month, day] = data.split('-');
            createHeaderP('DATA', `${day}/${month}/${year}`);
        }

        if (currentPage === 'producao') {
            createHeaderP('PRODUTOR', produtor);
            createHeaderP('CONFERENTE', conferente);
        } else if (currentPage === 'expedicao') {
            createHeaderP('CONFERENTE', conferente);
            createHeaderP('DESTINO', destino);
        } else if (currentPage === 'entregas') {
            createHeaderP('TRANSPORTADORA', transportadora);
            createHeaderP('DESTINO', destino);
        }
        postItem.appendChild(header);

        // Cria o corpo do post que será expansível
        const postBody = document.createElement('div');
        postBody.className = 'post-body';

        // 2. Adiciona o contêiner de imagens
        if (imageUrls && imageUrls.length > 0) {
            const imageContainer = document.createElement('div');
            imageContainer.classList.add('post-image-container');
            imageUrls.forEach(url => {
                const img = document.createElement('img');
                img.src = url;
                imageContainer.appendChild(img);
            });
            postBody.appendChild(imageContainer);
        }

        // 3. Adiciona a Observação
        if (observacao) {
            const p = document.createElement('p');
            p.classList.add('observation-text');
            p.textContent = observacao;
            postBody.appendChild(p);
        }

        postItem.appendChild(postBody);

        // Como cada página tem apenas um .post-grid, podemos selecioná-lo diretamente.
        const activeGrid = document.querySelector('.post-grid');
        if (!activeGrid) {
            console.error("Elemento .post-grid não encontrado na página.");
            return;
        }
        activeGrid[method](postItem);
    };

    const openModalForEdit = (postId) => {
        const allPosts = getPostsFromStorage();
        const postToEdit = allPosts[currentPage].find(p => p.id === postId);
        if (!postToEdit) return;

        resetModalToCreateMode(); // Garante que o modal esteja limpo
        currentEditPostId = postId;

        // Altera a aparência do modal para o modo de edição
        modal.querySelector('h3').textContent = 'Editar Post';
        submitPostBtn.textContent = 'Salvar Alterações';
        submitPostBtn.style.backgroundColor = '#007bff'; // Cor azul para editar

        // Preenche o formulário com os dados do post
        postNfInput.value = postToEdit.nf;
        postDataInput.value = postToEdit.data;
        postObservacaoInput.value = postToEdit.observacao;
        inputs.produtor.value = postToEdit.produtor;
        inputs.conferente.value = postToEdit.conferente;
        inputs.destino.value = postToEdit.destino;
        inputs.transportadora.value = postToEdit.transportadora;

        // Mostra as imagens existentes
        imagePreviewContainer.innerHTML = '';
        if (postToEdit.imageUrls && postToEdit.imageUrls.length > 0) {
            dropZonePrompt.textContent = `${postToEdit.imageUrls.length} imagem(ns) existente(s). Adicione novas para substituir.`;
            postToEdit.imageUrls.forEach(url => {
                const img = document.createElement('img');
                img.src = url;
                img.classList.add('modal-image-preview');
                imagePreviewContainer.appendChild(img);
            });
        }

        // Abre o modal de postagem (que agora está em modo de edição)
        addPostButtons[0].click(); // Simula o clique para mostrar os campos dinâmicos corretos
    };

    const deletePost = (postId) => {
        if (!confirm('Tem certeza que deseja excluir este post? Esta ação não pode ser desfeita.')) {
            return;
        }

        const allPosts = getPostsFromStorage();
        if (!allPosts[currentPage]) return;

        const updatedPosts = allPosts[currentPage].filter(p => p.id !== postId);
        allPosts[currentPage] = updatedPosts;

        localStorage.setItem('easyPortfolioPosts', JSON.stringify(allPosts));
        reloadAllPostsOnPage();
    };

    // --- LÓGICA DE ZOOM DA IMAGEM ---
    document.querySelector('.container').addEventListener('click', (e) => {
        if (e.target.tagName === 'IMG' && e.target.closest('.post-image-container')) {
            zoomedImage.src = e.target.src;
            imageZoomModal.style.display = 'flex';
        }
    });

    const closeZoomModal = () => {
        imageZoomModal.style.display = 'none';
    };

    if (zoomCloseBtn) {
        zoomCloseBtn.addEventListener('click', closeZoomModal);
    }
    if (imageZoomModal) {
        imageZoomModal.addEventListener('click', (e) => {
            if (e.target === imageZoomModal) {
                closeZoomModal();
            }
        });
    }

    const reloadAllPostsOnPage = () => {
        const grid = document.querySelector('.post-grid');
        if (grid) {
            const allPosts = getPostsFromStorage();
            allPostsCache = allPosts[currentPage] || [];
            renderPosts();
        }
    };

    // --- LÓGICA DE FILTRO E ORDENAÇÃO ---
    const renderPosts = () => {
        const grid = document.querySelector('.post-grid');
        if (!grid) return;

        const filterBy = document.getElementById('filter-by').value;
        const sortBy = document.getElementById('sort-by').value;
        
        let searchTerm = '';
        if (filterBy === 'data') {
            const dateInput = document.getElementById('date-input');
            searchTerm = dateInput ? dateInput.value : '';
        } else {
            const searchInput = document.getElementById('search-input');
            searchTerm = searchInput ? searchInput.value.toLowerCase() : '';
        }

        let postsToRender = [...allPostsCache];

        // 1. Ordena os posts
        postsToRender.sort((a, b) => {
            switch (sortBy) {
                case 'date_asc':
                    return new Date(a.data) - new Date(b.data);
                case 'nf_asc':
                    return a.nf.localeCompare(b.nf, undefined, { numeric: true });
                case 'date_desc':
                default:
                    return new Date(b.data) - new Date(a.data);
            }
        });

        // 2. Filtra os posts
        if (searchTerm) {
            postsToRender = postsToRender.filter(post => {
                if (filterBy === 'data') {
                    return post.data === searchTerm;
                } else {
                    const fieldValue = (post[filterBy] || '').toLowerCase();
                    return fieldValue.includes(searchTerm);
                }
            });
        }

        // 3. Renderiza na tela
        grid.innerHTML = '';
        postsToRender.forEach(postData => {
            createAndAppendPost(postData, 'append');
        });
    };

    const initializePage = () => {
        reloadAllPostsOnPage(); // Carrega os dados iniciais e renderiza

        const filterByEl = document.getElementById('filter-by');
        const sortByEl = document.getElementById('sort-by');
        const searchInputEl = document.getElementById('search-input');
        const dateInputEl = document.getElementById('date-input');
        const searchToggleBtn = document.getElementById('search-toggle-btn');
        const searchControls = document.getElementById('search-controls');

        if (filterByEl && sortByEl && searchInputEl && dateInputEl) {
            filterByEl.addEventListener('change', () => {
                if (filterByEl.value === 'data') {
                    searchInputEl.style.display = 'none';
                    dateInputEl.style.display = 'inline-block';
                    dateInputEl.value = '';
                } else {
                    searchInputEl.style.display = 'inline-block';
                    dateInputEl.style.display = 'none';
                    searchInputEl.value = '';
                }
                renderPosts();
            });

            sortByEl.addEventListener('change', renderPosts);
            searchInputEl.addEventListener('input', renderPosts);
            dateInputEl.addEventListener('input', renderPosts);
        }

        if (searchToggleBtn && searchControls) {
            searchToggleBtn.addEventListener('click', () => {
                const isOpen = searchControls.classList.toggle('is-open');
                if (isOpen) {
                    searchInputEl.focus();
                }
            });
        }
    };

    const displayUserName = () => {
        const userEmail = sessionStorage.getItem('userEmail');
        const userRole = sessionStorage.getItem('userRole');
        const userDisplayNameElement = document.getElementById('user-display-name');
        const userDisplayRoleElement = document.getElementById('user-display-role');

        if (userEmail && userDisplayNameElement) {
            const allUsers = getUsersFromStorage();
            const currentUser = allUsers[userEmail];
            if (currentUser && currentUser.nome && currentUser.sobrenome) {
                userDisplayNameElement.textContent = `${currentUser.nome} ${currentUser.sobrenome}`;
            } else {
                userDisplayNameElement.textContent = 'Usuário';
            }
        }

        if (userRole && userDisplayRoleElement) {
            userDisplayRoleElement.textContent = userRole;
        }
    };

    // --- CONTROLE DE ACESSO E LÓGICA DE LOGOUT ---
    // A variável 'userPermissions' vem do arquivo auth.js
    if (typeof userPermissions !== 'undefined' && currentPage) {
        // 1. Verifica se o usuário pode ver esta página
        checkPagePermission(currentPage);

        // Exibe o nome do usuário no menu
        displayUserName();

        // 2. Controla a visibilidade do botão "Adicionar Novo Post"
        const canAddPost = userPermissions.canAdd.includes(currentPage);
        addPostButtons.forEach(button => {
            if (!canAddPost) {
                button.style.display = 'none';
            }
        });

        // 3. Filtra os links de navegação (abas)
        const navTabs = document.querySelectorAll('.tabs .tab-button');
        navTabs.forEach(tab => {
            const tabIdentifier = tab.dataset.tab;
            if (!userPermissions.canView.includes(tabIdentifier)) {
                tab.style.display = 'none';
            }
        });
    }

    // Carrega os posts salvos quando a página é iniciada
    initializePage();

    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            sessionStorage.removeItem('userEmail');
            sessionStorage.removeItem('userRole');
            window.location.href = 'login.html';
        });
    }

    // --- LÓGICA DO MODAL DE EDIÇÃO DE PERFIL ---
    const editProfileBtn = document.getElementById('edit-profile-btn');
    const editProfileModal = document.getElementById('edit-profile-modal');

    if (editProfileModal && editProfileBtn) {
        const closeProfileModalBtn = document.getElementById('close-profile-modal');
        const editProfileForm = document.getElementById('edit-profile-form');
        const profileSuccessMsg = document.getElementById('profile-success');
        const profileErrorMsg = document.getElementById('profile-error');

        const oldPasswordInput = document.getElementById('profile-old-password');
        const profileNomeInput = document.getElementById('profile-nome');
        const profileSobrenomeInput = document.getElementById('profile-sobrenome');
        const profileContatoInput = document.getElementById('profile-contato');
        const profileEmailInput = document.getElementById('profile-email');
        const showPasswordChangeBtn = document.getElementById('show-password-change-btn');
        const passwordChangeFields = document.getElementById('password-change-fields');
        const profileNewPasswordInput = document.getElementById('profile-new-password');
        const profileConfirmPasswordInput = document.getElementById('profile-confirm-password');

        const openProfileModal = () => {
            const userEmail = sessionStorage.getItem('userEmail');
            if (!userEmail) return;

            const allUsers = getUsersFromStorage();
            const currentUser = allUsers[userEmail];

            if (currentUser) {
                profileEmailInput.value = userEmail;
                profileNomeInput.value = currentUser.nome || '';
                profileSobrenomeInput.value = currentUser.sobrenome || '';
                profileContatoInput.value = currentUser.contato || '';
            }
            
            // Limpa campos e mensagens ao abrir
            if (passwordChangeFields) {
                passwordChangeFields.style.display = 'none';
                if(oldPasswordInput) oldPasswordInput.value = '';
                profileNewPasswordInput.value = '';
                profileConfirmPasswordInput.value = '';
            }
            if (showPasswordChangeBtn) {
                showPasswordChangeBtn.style.display = 'block';
            }
            profileSuccessMsg.textContent = '';
            profileErrorMsg.textContent = '';
            editProfileModal.style.display = 'flex';
        };

        const closeProfileModal = () => {
            editProfileModal.style.display = 'none';
        };

        editProfileBtn.addEventListener('click', (e) => {
            e.preventDefault();
            openProfileModal();
        });

        if (showPasswordChangeBtn) {
            showPasswordChangeBtn.addEventListener('click', () => {
                passwordChangeFields.style.display = 'block';
                showPasswordChangeBtn.style.display = 'none';
            });
        }

        if (closeProfileModalBtn) {
            closeProfileModalBtn.addEventListener('click', closeProfileModal);
        }

        editProfileModal.addEventListener('click', (e) => {
            if (e.target === editProfileModal) {
                closeProfileModal();
            }
        });

        if (editProfileForm) {
            editProfileForm.addEventListener('submit', (e) => {
                e.preventDefault();
                profileErrorMsg.textContent = '';
                profileSuccessMsg.textContent = '';

                const userEmail = sessionStorage.getItem('userEmail');
                if (!userEmail) return;

                const allUsers = getUsersFromStorage();
                const currentUser = allUsers[userEmail];
                
                // Lógica de alteração de senha
                const newPassword = profileNewPasswordInput.value;
                const confirmPassword = profileConfirmPasswordInput.value;

                // Só valida a senha se a seção estiver visível e algum campo de senha foi preenchido
                if (passwordChangeFields.style.display === 'block' && (oldPasswordInput.value || newPassword || confirmPassword)) {
                    if (currentUser.password !== oldPasswordInput.value) {
                        profileErrorMsg.textContent = 'A senha antiga está incorreta.';
                        return;
                    }
                    if (!newPassword) {
                        profileErrorMsg.textContent = 'A nova senha não pode estar em branco.';
                        return;
                    }
                    if (newPassword !== confirmPassword) {
                        profileErrorMsg.textContent = 'As novas senhas não coincidem.';
                        return;
                    }
                    allUsers[userEmail].password = newPassword;
                }

                // Atualiza os outros dados do usuário
                allUsers[userEmail].nome = profileNomeInput.value.trim();
                allUsers[userEmail].sobrenome = profileSobrenomeInput.value.trim();
                allUsers[userEmail].contato = profileContatoInput.value.trim();

                // Salva de volta no localStorage
                localStorage.setItem('appUsers', JSON.stringify(allUsers));

                // Atualiza o nome no menu
                displayUserName();

                // Mostra mensagem de sucesso e fecha o modal
                profileSuccessMsg.textContent = 'Dados salvos com sucesso!';
                setTimeout(() => {
                    closeProfileModal();
                }, 1500); // Close after 1.5 seconds
            });
        }
    }
});
