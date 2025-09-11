// --- SISTEMA DE AUTENTICAÇÃO E PERMISSÕES ---
// Este arquivo deve ser incluído em todas as páginas protegidas.

/**
 * Objeto de permissões. 
 * Aqui você pode facilmente editar o que cada perfil pode ver e fazer.
 * - canView: array de páginas que o perfil pode visualizar.
 * - canAdd: array de páginas onde o perfil pode criar novos posts.
 * - startPage: página para onde o usuário é redirecionado se tentar acessar um local proibido.
 */
const PERMISSIONS = {
    adm: {
        canView: ['home', 'producao', 'expedicao', 'entregas'],
        canAdd: ['producao', 'expedicao', 'entregas'],
        canEdit: ['producao', 'expedicao', 'entregas'],
        canDelete: ['producao', 'expedicao', 'entregas'],
        startPage: 'index.html'
    },
    producao: {
        canView: ['home', 'producao', 'expedicao', 'entregas'],
        canAdd: ['producao'],
        canEdit: ['producao'],
        canDelete: [],
        startPage: 'index.html'
    },
    transportadora: {
        canView: ['home', 'expedicao', 'entregas'],
        canAdd: ['entregas'],
        canEdit: ['entregas'],
        canDelete: [],
        startPage: 'expedicao.html'
    }
};

const userRole = sessionStorage.getItem('userRole');

if (!userRole || !PERMISSIONS[userRole]) {
    sessionStorage.removeItem('userRole');
    window.location.href = 'login.html';
}

const userPermissions = PERMISSIONS[userRole];

const checkPagePermission = (pageIdentifier) => {
    if (pageIdentifier && !userPermissions.canView.includes(pageIdentifier)) {
        alert('Você não tem permissão para acessar esta página.');
        window.location.href = userPermissions.startPage;
    }
};