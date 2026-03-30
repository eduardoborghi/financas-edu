// ===================== SISTEMA MULTI-CONTA =====================
// Estrutura: cada conta tem { senha, transacoes, cartoes }
// Armazenado em localStorage como: contas = { usuario1: {...}, usuario2: {...} }

let contaAtual = null; // nome do usuário logado
let transacoes = [];
let cartoes = [];
let graficoCategorias, graficoPagamentos;

// ================= HELPERS DE ARMAZENAMENTO =================
function getTodasContas() {
    return JSON.parse(localStorage.getItem('financas_contas')) || {};
}

function salvarTodasContas(contas) {
    localStorage.setItem('financas_contas', JSON.stringify(contas));
}

function getDadosConta(usuario) {
    const contas = getTodasContas();
    return contas[usuario] || { senha: '', transacoes: [], cartoes: [] };
}

function salvarDados() {
    if (!contaAtual) return;
    const contas = getTodasContas();
    contas[contaAtual].transacoes = transacoes;
    contas[contaAtual].cartoes = cartoes;
    salvarTodasContas(contas);
}

// ================= INICIALIZAÇÃO =================
window.addEventListener('DOMContentLoaded', () => {
    // Dark mode persistido
    const darkSalvo = localStorage.getItem('financas_darkmode');
    if (darkSalvo === 'true') {
        document.documentElement.classList.add('dark');
    }

    // Migração: se havia conta única antiga, converte para multi-conta
    const senhaAntiga = localStorage.getItem('senha_app');
    const transacoesAntigas = localStorage.getItem('transacoes');
    const cartoesAntigos = localStorage.getItem('cartoes');
    if (senhaAntiga && !getTodasContas()['admin']) {
        const contas = getTodasContas();
        contas['admin'] = {
            senha: senhaAntiga,
            transacoes: JSON.parse(transacoesAntigas) || [],
            cartoes: JSON.parse(cartoesAntigos) || []
        };
        salvarTodasContas(contas);
        localStorage.removeItem('senha_app');
        localStorage.removeItem('transacoes');
        localStorage.removeItem('cartoes');
    }

    renderizarSelectContas();
    renderizarListaContasLogin();

    // Define data padrão no formulário
    const dataInput = document.getElementById('t-data');
    if (dataInput) dataInput.valueAsDate = new Date();
});

// ================= LOGIN / CONTAS =================
function renderizarSelectContas() {
    const select = document.getElementById('select-conta');
    const contas = getTodasContas();
    const nomes = Object.keys(contas);
    select.innerHTML = '<option value="">Selecione uma conta...</option>';
    nomes.forEach(nome => {
        const opt = document.createElement('option');
        opt.value = nome;
        opt.textContent = nome;
        select.appendChild(opt);
    });
}

function renderizarListaContasLogin() {
    const container = document.getElementById('lista-contas-login');
    const label = document.getElementById('label-selecione');
    const contas = getTodasContas();
    const nomes = Object.keys(contas);
    container.innerHTML = '';
    if (nomes.length === 0) {
        label.textContent = 'Nenhuma conta encontrada. Crie uma abaixo.';
        return;
    }
    label.textContent = 'Ou selecione uma conta:';
}

function renderizarListaContasConfig() {
    const container = document.getElementById('lista-contas-config');
    const contas = getTodasContas();
    const nomes = Object.keys(contas);
    container.innerHTML = '';
    if (nomes.length === 0) {
        container.innerHTML = '<p class="text-sm text-gray-400">Nenhuma conta encontrada.</p>';
        return;
    }
    nomes.forEach(nome => {
        const div = document.createElement('div');
        div.className = 'flex items-center justify-between bg-gray-100 dark:bg-gray-700 px-3 py-2 rounded-lg';
        div.innerHTML = `
            <span class="text-sm dark:text-white font-medium">
                <i class="fa-solid fa-user text-blue-400 mr-2"></i>${nome}
                ${nome === contaAtual ? '<span class="ml-2 text-xs text-green-500">(você)</span>' : ''}
            </span>
            ${nome !== contaAtual ? `<button onclick="deletarConta('${nome}')" class="text-red-400 hover:text-red-600 text-xs"><i class="fa-solid fa-trash"></i></button>` : ''}
        `;
        container.appendChild(div);
    });
}

function login() {
    const usuario = document.getElementById('select-conta').value;
    const senha = document.getElementById('password-input').value;
    const erro = document.getElementById('login-error');

    if (!usuario) {
        erro.textContent = 'Selecione uma conta!';
        erro.classList.remove('hidden');
        return;
    }

    const dados = getDadosConta(usuario);
    if (senha !== dados.senha) {
        erro.textContent = 'Senha incorreta!';
        erro.classList.remove('hidden');
        return;
    }

    erro.classList.add('hidden');
    contaAtual = usuario;
    transacoes = dados.transacoes || [];
    cartoes = dados.cartoes || [];

    document.getElementById('nome-usuario-sidebar').textContent = contaAtual;
    document.getElementById('login-screen').classList.add('hidden');
    document.getElementById('dashboard-screen').classList.remove('hidden');
    document.getElementById('password-input').value = '';

    document.getElementById('t-data').valueAsDate = new Date();
    showTab('resumo');
}

function logout() {
    contaAtual = null;
    transacoes = [];
    cartoes = [];
    if (graficoCategorias) { graficoCategorias.destroy(); graficoCategorias = null; }
    if (graficoPagamentos) { graficoPagamentos.destroy(); graficoPagamentos = null; }
    document.getElementById('dashboard-screen').classList.add('hidden');
    document.getElementById('login-screen').classList.remove('hidden');
    document.getElementById('password-input').value = '';
    renderizarSelectContas();
    renderizarListaContasLogin();
    // Fechar menu mobile se aberto
    fecharMenu();
}

function mostrarCriarConta() {
    document.getElementById('painel-login').classList.add('hidden');
    document.getElementById('painel-criar-conta').classList.remove('hidden');
    document.getElementById('cadastro-error').classList.add('hidden');
}

function voltarLogin() {
    document.getElementById('painel-criar-conta').classList.add('hidden');
    document.getElementById('painel-login').classList.remove('hidden');
}

function criarConta() {
    const usuario = document.getElementById('novo-usuario').value.trim();
    const senha = document.getElementById('nova-senha-cadastro').value;
    const confirmar = document.getElementById('confirmar-senha-cadastro').value;
    const erro = document.getElementById('cadastro-error');

    if (usuario.length < 2) {
        erro.textContent = 'O nome de usuário deve ter no mínimo 2 caracteres.';
        erro.classList.remove('hidden');
        return;
    }
    if (senha.length < 3) {
        erro.textContent = 'A senha deve ter no mínimo 3 caracteres.';
        erro.classList.remove('hidden');
        return;
    }
    if (senha !== confirmar) {
        erro.textContent = 'As senhas não coincidem.';
        erro.classList.remove('hidden');
        return;
    }

    const contas = getTodasContas();
    if (contas[usuario]) {
        erro.textContent = 'Este nome de usuário já existe.';
        erro.classList.remove('hidden');
        return;
    }

    contas[usuario] = { senha: senha, transacoes: [], cartoes: [] };
    salvarTodasContas(contas);

    document.getElementById('novo-usuario').value = '';
    document.getElementById('nova-senha-cadastro').value = '';
    document.getElementById('confirmar-senha-cadastro').value = '';
    erro.classList.add('hidden');

    renderizarSelectContas();
    renderizarListaContasLogin();
    voltarLogin();

    // Seleciona a conta recém criada
    document.getElementById('select-conta').value = usuario;
    alert(`Conta "${usuario}" criada com sucesso! Faça login.`);
}

function deletarConta(nome) {
    if (!confirm(`Tem certeza que deseja excluir a conta "${nome}" e todos os seus dados?`)) return;
    const contas = getTodasContas();
    delete contas[nome];
    salvarTodasContas(contas);
    renderizarListaContasConfig();
    alert(`Conta "${nome}" excluída.`);
}

function mudarSenha() {
    const nova = document.getElementById('nova-senha').value;
    if (nova.length < 3) return alert('A senha deve ter no mínimo 3 caracteres.');
    const contas = getTodasContas();
    contas[contaAtual].senha = nova;
    salvarTodasContas(contas);
    alert('Senha atualizada com sucesso!');
    document.getElementById('nova-senha').value = '';
}

// ================= MODO ESCURO =================
function toggleDarkMode() {
    const html = document.documentElement;
    const isDark = html.classList.toggle('dark');
    localStorage.setItem('financas_darkmode', isDark);
}

// ================= MENU MOBILE =================
function toggleMenu() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('menu-overlay');
    const isOpen = !sidebar.classList.contains('-translate-x-full');
    if (isOpen) {
        fecharMenu();
    } else {
        sidebar.classList.remove('-translate-x-full');
        overlay.classList.remove('hidden');
    }
}

function fecharMenu() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('menu-overlay');
    sidebar.classList.add('-translate-x-full');
    overlay.classList.add('hidden');
}

// ================= NAVEGAÇÃO =================
function showTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
    document.getElementById(`tab-${tabId}`).classList.remove('hidden');

    // Destaque do botão ativo
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('bg-slate-700', 'dark:bg-gray-800', 'text-white');
    });
    const btnAtivo = document.querySelector(`.nav-btn[data-tab="${tabId}"]`);
    if (btnAtivo) btnAtivo.classList.add('bg-slate-700', 'dark:bg-gray-800', 'text-white');

    if (tabId === 'resumo') atualizarDashboard();
    if (tabId === 'configuracoes') renderizarListaContasConfig();

    fecharMenu(); // fecha menu mobile ao trocar de aba
}

// ================= TRANSAÇÕES =================
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('form-transacao').addEventListener('submit', function (e) {
        e.preventDefault();
        const transacao = {
            id: Date.now(),
            descricao: document.getElementById('t-descricao').value,
            tipo: document.getElementById('t-tipo').value,
            valor: parseFloat(document.getElementById('t-valor').value),
            qtd: parseInt(document.getElementById('t-qtd').value),
            categoria: document.getElementById('t-categoria').value,
            pagamento: document.getElementById('t-pagamento').value,
            data: document.getElementById('t-data').value
        };
        transacoes.push(transacao);
        salvarDados();
        this.reset();
        document.getElementById('t-data').valueAsDate = new Date();
        renderizarTransacoes();
        atualizarDashboard();
    });

    document.getElementById('form-cartao').addEventListener('submit', function (e) {
        e.preventDefault();
        const cartao = {
            id: Date.now(),
            nome: document.getElementById('c-nome').value,
            banco: document.getElementById('c-banco').value,
            vencimento: document.getElementById('c-vencimento').value
        };
        cartoes.push(cartao);
        salvarDados();
        this.reset();
        renderizarCartoes();
    });
});

function renderizarTransacoes() {
    const tbody = document.getElementById('tabela-transacoes');
    tbody.innerHTML = '';
    const ordenadas = [...transacoes].sort((a, b) => new Date(b.data) - new Date(a.data));
    if (ordenadas.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="p-4 text-center text-gray-400 text-sm">Nenhuma transação cadastrada.</td></tr>`;
        return;
    }
    ordenadas.forEach(t => {
        const total = t.valor * t.qtd;
        const cor = t.tipo === 'receita' ? 'text-green-600' : 'text-red-600';
        const sinal = t.tipo === 'receita' ? '+' : '-';
        tbody.innerHTML += `
            <tr class="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                <td class="p-3 text-sm dark:text-gray-300">${t.data.split('-').reverse().join('/')}</td>
                <td class="p-3 font-medium text-sm dark:text-white">${t.descricao}</td>
                <td class="p-3 hidden md:table-cell"><span class="bg-gray-200 dark:bg-gray-600 dark:text-gray-200 text-xs px-2 py-1 rounded">${t.categoria}</span></td>
                <td class="p-3 text-sm dark:text-gray-300 hidden md:table-cell">${t.pagamento}</td>
                <td class="p-3 text-sm dark:text-gray-300 hidden sm:table-cell">${t.qtd}</td>
                <td class="p-3 font-bold text-sm ${cor}">${sinal} R$ ${total.toFixed(2)}</td>
                <td class="p-3">
                    <button onclick="deletarTransacao(${t.id})" class="text-red-400 hover:text-red-600 transition"><i class="fa-solid fa-trash text-sm"></i></button>
                </td>
            </tr>
        `;
    });
}

function deletarTransacao(id) {
    if (confirm('Apagar esta transação?')) {
        transacoes = transacoes.filter(t => t.id !== id);
        salvarDados();
        renderizarTransacoes();
        atualizarDashboard();
    }
}

// ================= CARTÕES =================
function renderizarCartoes() {
    const lista = document.getElementById('lista-cartoes');
    lista.innerHTML = '';
    if (cartoes.length === 0) {
        lista.innerHTML = `<p class="text-gray-400 text-sm">Nenhum cartão cadastrado.</p>`;
        return;
    }
    cartoes.forEach(c => {
        lista.innerHTML += `
            <div class="bg-gradient-to-r from-slate-700 to-slate-900 text-white p-5 rounded-xl shadow-lg relative">
                <button onclick="deletarCartao(${c.id})" class="absolute top-4 right-4 text-slate-400 hover:text-white transition"><i class="fa-solid fa-trash text-sm"></i></button>
                <i class="fa-solid fa-credit-card text-3xl mb-4 text-slate-300"></i>
                <h4 class="text-lg font-bold uppercase tracking-widest mb-1">${c.nome}</h4>
                <p class="text-slate-400 text-sm mb-3">${c.banco}</p>
                <p class="text-sm">Vence dia: <span class="font-bold text-blue-300">${c.vencimento}</span></p>
            </div>
        `;
    });
}

function deletarCartao(id) {
    if (confirm('Remover este cartão?')) {
        cartoes = cartoes.filter(c => c.id !== id);
        salvarDados();
        renderizarCartoes();
    }
}

// ================= DASHBOARD & GRÁFICOS =================
function atualizarDashboard() {
    let receitas = 0, despesas = 0;
    let gastosPorCat = {}, gastosPorPgto = {};

    transacoes.forEach(t => {
        const total = t.valor * t.qtd;
        if (t.tipo === 'receita') {
            receitas += total;
        } else {
            despesas += total;
            gastosPorCat[t.categoria] = (gastosPorCat[t.categoria] || 0) + total;
            gastosPorPgto[t.pagamento] = (gastosPorPgto[t.pagamento] || 0) + total;
        }
    });

    const saldo = receitas - despesas;

    document.getElementById('total-receitas').innerText = `R$ ${receitas.toFixed(2)}`;
    document.getElementById('total-despesas').innerText = `R$ ${despesas.toFixed(2)}`;

    const elSaldo = document.getElementById('saldo-atual');
    elSaldo.innerText = `R$ ${saldo.toFixed(2)}`;
    elSaldo.className = `text-xl md:text-2xl font-bold ${saldo < 0 ? 'text-red-600' : 'text-blue-600'}`;

    renderizarGraficos(gastosPorCat, gastosPorPgto);
    renderizarTransacoes();
    renderizarCartoes();
}

function renderizarGraficos(dadosCat, dadosPgto) {
    const ctxCat = document.getElementById('chartCategorias');
    const ctxPgto = document.getElementById('chartPagamentos');

    const isDark = document.documentElement.classList.contains('dark');
    const labelColor = isDark ? '#d1d5db' : '#374151';

    if (graficoCategorias) graficoCategorias.destroy();
    if (graficoPagamentos) graficoPagamentos.destroy();

    const pluginDefaults = {
        legend: { labels: { color: labelColor, font: { size: 12 } } }
    };

    graficoCategorias = new Chart(ctxCat, {
        type: 'doughnut',
        data: {
            labels: Object.keys(dadosCat),
            datasets: [{
                data: Object.values(dadosCat),
                backgroundColor: ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6']
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: pluginDefaults
        }
    });

    graficoPagamentos = new Chart(ctxPgto, {
        type: 'bar',
        data: {
            labels: Object.keys(dadosPgto),
            datasets: [{
                label: 'Gastos R$',
                data: Object.values(dadosPgto),
                backgroundColor: '#3b82f6'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: pluginDefaults,
            scales: {
                x: { ticks: { color: labelColor } },
                y: { ticks: { color: labelColor } }
            }
        }
    });
}

// ================= BACKUP =================
function exportarDados() {
    const dados = { usuario: contaAtual, transacoes, cartoes };
    const blob = new Blob([JSON.stringify(dados)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `financas_${contaAtual}_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
}

function importarDados(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function (e) {
        try {
            const dados = JSON.parse(e.target.result);
            transacoes = dados.transacoes || [];
            cartoes = dados.cartoes || [];
            salvarDados();
            alert('Dados importados com sucesso!');
            atualizarDashboard();
        } catch (err) {
            alert('Erro ao importar arquivo. Certifique-se de que é um backup válido.');
        }
    };
    reader.readAsText(file);
    event.target.value = '';
}

function limparTudo() {
    if (confirm('ATENÇÃO: Isso apagará todas as suas transações e cartões. Tem certeza?')) {
        transacoes = [];
        cartoes = [];
        salvarDados();
        atualizarDashboard();
        alert('Dados apagados.');
    }
}
