// Dados do sistema
let produtos = [];
let vendas = [];
let carrinhoVenda = [];
let editandoId = null;

// Inicialização do sistema
document.addEventListener('DOMContentLoaded', function() {
    carregarDados();
    showSection('dashboard');
});

// Sistema de navegação
function showSection(sectionName) {
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.remove('active');
    });
    
    document.getElementById(`${sectionName}-section`).classList.add('active');
    
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    
    document.querySelector(`.nav-item[onclick="showSection('${sectionName}')"]`).classList.add('active');
}

// Sistema de arquivos JSON
function salvarDadosJSON() {
    const dados = {
        produtos: produtos,
        vendas: vendas,
        ultimaAtualizacao: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(dados, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'dados_xandaocar.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showAlert('Arquivo dados_xandaocar.json baixado com sucesso!', 'success');
}

function importarDadosJSON(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const dados = JSON.parse(e.target.result);
            
            if (confirm('Isso substituirá todos os dados atuais. Continuar?')) {
                produtos = dados.produtos || [];
                vendas = dados.vendas || [];
                
                salvarDados();
                carregarProdutos();
                carregarSelectProdutos();
                atualizarDashboard();
                
                showAlert('Dados importados com sucesso!', 'success');
            }
        } catch (error) {
            showAlert('Erro ao importar arquivo. Verifique se é um JSON válido.', 'error');
        }
    };
    reader.readAsText(file);
    event.target.value = '';
}

// Sistema LocalStorage como backup
function salvarDados() {
    const dados = {
        produtos: produtos,
        vendas: vendas,
        ultimaAtualizacao: new Date().toISOString()
    };
    localStorage.setItem('xandaocar_dados', JSON.stringify(dados));
}

function carregarDados() {
    const dadosSalvos = localStorage.getItem('xandaocar_dados');
    if (dadosSalvos) {
        try {
            const dados = JSON.parse(dadosSalvos);
            produtos = dados.produtos || [];
            vendas = dados.vendas || [];
        } catch (error) {
            console.error('Erro ao carregar dados:', error);
            produtos = [];
            vendas = [];
        }
    }
    carregarProdutos();
    carregarSelectProdutos();
    atualizarDashboard();
}

// Gerenciamento de produtos
document.getElementById('form-produto').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const produto = {
        id: editandoId || Date.now().toString(),
        codigo: document.getElementById('codigo').value,
        nome: document.getElementById('nome').value,
        preco: parseFloat(document.getElementById('preco').value),
        estoque: parseInt(document.getElementById('estoque').value)
    };

    if (editandoId) {
        const index = produtos.findIndex(p => p.id === editandoId);
        produtos[index] = produto;
        showAlert('Peça atualizada com sucesso!', 'success');
    } else {
        produtos.push(produto);
        showAlert('Peça cadastrada com sucesso!', 'success');
    }

    salvarDados();
    limparFormulario();
    carregarProdutos();
    carregarSelectProdutos();
    atualizarDashboard();
});

function carregarProdutos() {
    const tbody = document.getElementById('tabela-produtos');
    tbody.innerHTML = '';

    if (produtos.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="text-center text-muted">
                    Nenhuma peça cadastrada
                </td>
            </tr>
        `;
        return;
    }

    produtos.forEach(produto => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${produto.codigo}</strong></td>
            <td>${produto.nome}</td>
            <td>R$ ${produto.preco.toFixed(2)}</td>
            <td>
                <span class="${produto.estoque < 5 ? 'estoque-baixo' : 'estoque-normal'}">
                    ${produto.estoque}
                </span>
            </td>
            <td>
                <button class="btn btn-warning btn-sm" onclick="editarProduto('${produto.id}')">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-danger btn-sm" onclick="excluirProduto('${produto.id}')">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function editarProduto(id) {
    const produto = produtos.find(p => p.id === id);
    document.getElementById('produto-id').value = produto.id;
    document.getElementById('codigo').value = produto.codigo;
    document.getElementById('nome').value = produto.nome;
    document.getElementById('preco').value = produto.preco;
    document.getElementById('estoque').value = produto.estoque;
    editandoId = id;
    
    showSection('produtos');
}

function excluirProduto(id) {
    if (confirm('Tem certeza que deseja excluir esta peça?')) {
        produtos = produtos.filter(p => p.id !== id);
        salvarDados();
        carregarProdutos();
        carregarSelectProdutos();
        atualizarDashboard();
        showAlert('Peça excluída com sucesso!', 'success');
    }
}

function limparFormulario() {
    document.getElementById('form-produto').reset();
    document.getElementById('produto-id').value = '';
    editandoId = null;
}

// Sistema de vendas
function carregarSelectProdutos() {
    const select = document.getElementById('venda-produto');
    select.innerHTML = '<option value="">Selecione uma peça</option>';
    
    produtos.filter(p => p.estoque > 0).forEach(produto => {
        const option = document.createElement('option');
        option.value = produto.id;
        option.textContent = `${produto.codigo} - ${produto.nome} (Estoque: ${produto.estoque})`;
        option.dataset.preco = produto.preco;
        select.appendChild(option);
    });
}

function adicionarItemVenda() {
    const select = document.getElementById('venda-produto');
    const quantidadeInput = document.getElementById('venda-quantidade');
    
    const produtoId = select.value;
    const quantidade = parseInt(quantidadeInput.value);
    
    if (!produtoId || quantidade < 1) {
        showAlert('Selecione uma peça e informe a quantidade!', 'error');
        return;
    }
    
    const produto = produtos.find(p => p.id === produtoId);
    
    if (quantidade > produto.estoque) {
        showAlert('Quantidade indisponível em estoque!', 'error');
        return;
    }
    
    const itemExistente = carrinhoVenda.find(item => item.produtoId === produtoId);
    if (itemExistente) {
        itemExistente.quantidade += quantidade;
    } else {
        carrinhoVenda.push({
            produtoId: produtoId,
            codigo: produto.codigo,
            nome: produto.nome,
            preco: produto.preco,
            quantidade: quantidade
        });
    }
    
    atualizarCarrinhoVenda();
    quantidadeInput.value = 1;
    select.value = '';
}

function atualizarCarrinhoVenda() {
    const lista = document.getElementById('lista-venda');
    const totalElement = document.getElementById('total-venda');
    
    lista.innerHTML = '';
    
    if (carrinhoVenda.length === 0) {
        lista.innerHTML = '<p class="text-muted">Nenhum item adicionado</p>';
        totalElement.textContent = 'R$ 0,00';
        return;
    }
    
    let totalVenda = 0;
    
    carrinhoVenda.forEach((item, index) => {
        const subtotal = item.preco * item.quantidade;
        totalVenda += subtotal;
        
        const div = document.createElement('div');
        div.className = 'item-venda';
        div.innerHTML = `
            <div>
                <strong>${item.codigo}</strong> - ${item.nome}
                <br>
                <small>${item.quantidade} x R$ ${item.preco.toFixed(2)} = R$ ${subtotal.toFixed(2)}</small>
            </div>
            <button class="btn btn-danger btn-sm" onclick="removerItemVenda(${index})">
                <i class="fas fa-times"></i>
            </button>
        `;
        lista.appendChild(div);
    });
    
    totalElement.textContent = `R$ ${totalVenda.toFixed(2)}`;
}

function removerItemVenda(index) {
    carrinhoVenda.splice(index, 1);
    atualizarCarrinhoVenda();
}

function finalizarVenda() {
    if (carrinhoVenda.length === 0) {
        showAlert('Adicione itens à venda antes de finalizar!', 'error');
        return;
    }
    
    const venda = {
        id: Date.now().toString(),
        data: new Date().toISOString(),
        itens: [...carrinhoVenda],
        total: carrinhoVenda.reduce((total, item) => total + (item.preco * item.quantidade), 0)
    };
    
    venda.itens.forEach(itemVenda => {
        const produto = produtos.find(p => p.id === itemVenda.produtoId);
        if (produto) {
            produto.estoque -= itemVenda.quantidade;
        }
    });
    
    vendas.push(venda);
    
    salvarDados();
    
    showAlert(`Venda finalizada com sucesso! Total: R$ ${venda.total.toFixed(2)}`, 'success');
    
    carrinhoVenda = [];
    atualizarCarrinhoVenda();
    carregarProdutos();
    carregarSelectProdutos();
    atualizarDashboard();
}

// Dashboard
function atualizarDashboard() {
    const totalVendas = vendas.reduce((total, venda) => total + venda.total, 0);
    const totalEstoque = produtos.reduce((total, produto) => total + produto.estoque, 0);
    
    document.getElementById('total-vendas').textContent = `R$ ${totalVendas.toFixed(2)}`;
    document.getElementById('total-estoque').textContent = totalEstoque;
    document.getElementById('total-produtos').textContent = produtos.length;
    
    atualizarChartMaisVendidos();
}

function atualizarChartMaisVendidos() {
    const chartContainer = document.getElementById('chart-mais-vendidos');
    
    const vendasPorProduto = {};
    vendas.forEach(venda => {
        venda.itens.forEach(item => {
            if (!vendasPorProduto[item.produtoId]) {
                vendasPorProduto[item.produtoId] = {
                    nome: item.nome,
                    quantidade: 0
                };
            }
            vendasPorProduto[item.produtoId].quantidade += item.quantidade;
        });
    });
    
    const produtosMaisVendidos = Object.values(vendasPorProduto)
        .sort((a, b) => b.quantidade - a.quantidade)
        .slice(0, 5);
    
    if (produtosMaisVendidos.length === 0) {
        chartContainer.innerHTML = '<p class="text-muted">Nenhuma venda registrada ainda</p>';
        return;
    }
    
    let chartHTML = '';
    produtosMaisVendidos.forEach(produto => {
        const porcentagem = (produto.quantidade / Math.max(...produtosMaisVendidos.map(p => p.quantidade))) * 100;
        chartHTML += `
            <div class="chart-item">
                <div class="chart-bar">
                    <div class="chart-fill" style="width: ${porcentagem}%"></div>
                </div>
                <div class="chart-info">
                    <span>${produto.nome}</span>
                    <strong>${produto.quantidade} vendas</strong>
                </div>
            </div>
        `;
    });
    
    chartContainer.innerHTML = chartHTML;
}

// Sistema de alertas
function showAlert(mensagem, tipo = 'info') {
    const alertasAntigos = document.querySelectorAll('.alerta-temporario');
    alertasAntigos.forEach(alerta => alerta.remove());

    const alerta = document.createElement('div');
    alerta.className = `alerta alerta-${tipo} alerta-temporario`;
    alerta.innerHTML = `
        <div class="d-flex justify-content-between align-items-start">
            <div>
                <strong>${tipo === 'success' ? '✓' : tipo === 'error' ? '✗' : 'ℹ'} ${mensagem}</strong>
            </div>
            <button type="button" class="btn-close" onclick="this.parentElement.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;
    
    const container = document.createElement('div');
    container.className = 'alertas-sistema';
    container.appendChild(alerta);
    document.body.appendChild(container);

    setTimeout(() => {
        if (alerta.parentElement) {
            alerta.remove();
        }
    }, 5000);
}
// Sistema de alertas de estoque
function verificarEstoqueBaixo() {
    const produtosEstoqueBaixo = produtos.filter(produto => produto.estoque <= 1);
    const alertasContainer = document.getElementById('alertas-estoque');
    
    alertasContainer.innerHTML = '';
    
    if (produtosEstoqueBaixo.length === 0) {
        alertasContainer.innerHTML = `
            <div class="text-center text-muted">
                <i class="fas fa-check-circle fa-2x mb-2"></i>
                <p>Nenhum alerta de estoque baixo</p>
            </div>
        `;
        return;
    }
    
    produtosEstoqueBaixo.forEach(produto => {
        const alerta = document.createElement('div');
        alerta.className = `alerta-item ${produto.estoque === 0 ? 'critico' : ''}`;
        alerta.innerHTML = `
            <div>
                <strong>${produto.codigo} - ${produto.nome}</strong>
                <br>
                <span>Estoque: ${produto.estoque} unidade(s)</span>
            </div>
            <div>
                <button class="btn btn-primary btn-sm" onclick="editarProduto('${produto.id}')">
                    <i class="fas fa-edit"></i> Repor
                </button>
            </div>
        `;
        alertasContainer.appendChild(alerta);
    });
    
    // Mostrar alerta visual se houver produtos com estoque crítico
    if (produtosEstoqueBaixo.some(p => p.estoque === 0)) {
        showAlert('⚠️ ATENÇÃO: Há produtos com estoque ZERADO!', 'error');
    } else if (produtosEstoqueBaixo.some(p => p.estoque === 1)) {
        showAlert('📦 Alerta: Há produtos com estoque baixo (1 unidade)', 'warning');
    }
}

// Função para zerar vendas
function zerarVendas() {
    if (vendas.length === 0) {
        showAlert('Não há vendas para zerar!', 'info');
        return;
    }
    
    if (confirm(`Tem certeza que deseja zerar TODAS as ${vendas.length} vendas?\n\n⚠️ Esta ação não pode ser desfeita!`)) {
        const totalVendas = vendas.length;
        const valorTotal = vendas.reduce((total, venda) => total + venda.total, 0);
        
        vendas = [];
        salvarDados();
        atualizarDashboard();
        carregarRelatorioVendas();
        verificarEstoqueBaixo();
        
        showAlert(`✅ ${totalVendas} vendas zeradas (Total: R$ ${valorTotal.toFixed(2)})`, 'success');
    }
}

// Gerar relatório de vendas
function gerarRelatorioVendas() {
    if (vendas.length === 0) {
        showAlert('Não há vendas para gerar relatório!', 'info');
        return;
    }
    
    const relatorio = {
        titulo: "Relatório de Vendas - Xandãocar",
        periodo: new Date().toLocaleDateString('pt-BR'),
        totalVendas: vendas.length,
        valorTotal: vendas.reduce((total, venda) => total + venda.total, 0),
        vendas: vendas.map(venda => ({
            data: new Date(venda.data).toLocaleDateString('pt-BR'),
            hora: new Date(venda.data).toLocaleTimeString('pt-BR'),
            itens: venda.itens.length,
            total: venda.total,
            detalhes: venda.itens.map(item => `${item.quantidade}x ${item.nome}`).join(', ')
        })),
        produtosMaisVendidos: calcularProdutosMaisVendidos()
    };
    
    const blob = new Blob([JSON.stringify(relatorio, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `relatorio_vendas_xandaocar_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showAlert(`Relatório com ${vendas.length} vendas exportado com sucesso!`, 'success');
}

// Calcular produtos mais vendidos para o relatório
function calcularProdutosMaisVendidos() {
    const vendasPorProduto = {};
    
    vendas.forEach(venda => {
        venda.itens.forEach(item => {
            if (!vendasPorProduto[item.produtoId]) {
                vendasPorProduto[item.produtoId] = {
                    codigo: item.codigo,
                    nome: item.nome,
                    quantidade: 0,
                    totalVendido: 0
                };
            }
            vendasPorProduto[item.produtoId].quantidade += item.quantidade;
            vendasPorProduto[item.produtoId].totalVendido += item.preco * item.quantidade;
        });
    });
    
    return Object.values(vendasPorProduto)
        .sort((a, b) => b.quantidade - a.quantidade)
        .slice(0, 10);
}

// Carregar relatório de vendas na tela
function carregarRelatorioVendas() {
    const listaVendas = document.getElementById('lista-vendas');
    
    if (vendas.length === 0) {
        listaVendas.innerHTML = `
            <div class="text-center text-muted">
                <i class="fas fa-receipt fa-2x mb-2"></i>
                <p>Nenhuma venda registrada</p>
            </div>
        `;
        return;
    }
    
    listaVendas.innerHTML = '';
    
    // Mostrar últimas 10 vendas
    vendas.slice(-10).reverse().forEach(venda => {
        const vendaDiv = document.createElement('div');
        vendaDiv.className = 'venda-item';
        vendaDiv.innerHTML = `
            <div class="venda-info">
                <strong>${venda.itens.length} item(s)</strong>
                <div class="venda-data">
                    ${new Date(venda.data).toLocaleDateString('pt-BR')} - 
                    ${new Date(venda.data).toLocaleTimeString('pt-BR')}
                </div>
                <small>${venda.itens.map(item => `${item.quantidade}x ${item.nome}`).join(', ')}</small>
            </div>
            <div class="venda-total">
                R$ ${venda.total.toFixed(2)}
            </div>
        `;
        listaVendas.appendChild(vendaDiv);
    });
}

// Atualizar a função showSection para incluir a nova seção
function showSection(sectionName) {
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.remove('active');
    });
    
    document.getElementById(`${sectionName}-section`).classList.add('active');
    
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    
    document.querySelector(`.nav-item[onclick="showSection('${sectionName}')"]`).classList.add('active');
    
    // Atualizar dados específicos da seção
    if (sectionName === 'relatorios') {
        verificarEstoqueBaixo();
        carregarRelatorioVendas();
    }
}

// Atualizar a função salvarDados para verificar estoque
function salvarDados() {
    const dados = {
        produtos: produtos,
        vendas: vendas,
        ultimaAtualizacao: new Date().toISOString()
    };
    localStorage.setItem('xandaocar_dados', JSON.stringify(dados));
    
    // Sempre verificar estoque após salvar
    verificarEstoqueBaixo();
}

// Atualizar a função finalizarVenda para verificar estoque
function finalizarVenda() {
    if (carrinhoVenda.length === 0) {
        showAlert('Adicione itens à venda antes de finalizar!', 'error');
        return;
    }
    
    const venda = {
        id: Date.now().toString(),
        data: new Date().toISOString(),
        itens: [...carrinhoVenda],
        total: carrinhoVenda.reduce((total, item) => total + (item.preco * item.quantidade), 0)
    };
    
    venda.itens.forEach(itemVenda => {
        const produto = produtos.find(p => p.id === itemVenda.produtoId);
        if (produto) {
            produto.estoque -= itemVenda.quantidade;
        }
    });
    
    vendas.push(venda);
    
    salvarDados();
    
    showAlert(`Venda finalizada com sucesso! Total: R$ ${venda.total.toFixed(2)}`, 'success');
    
    carrinhoVenda = [];
    atualizarCarrinhoVenda();
    carregarProdutos();
    carregarSelectProdutos();
    atualizarDashboard();
    
    // Verificar estoque após venda
    verificarEstoqueBaixo();
}

// Adicionar item ao menu de navegação no HTML
// Adicione este item no seu sidebar-nav:
// <a href="#" class="nav-item" onclick="showSection('relatorios')">
//     <i class="fas fa-chart-bar"></i>
//     <span>Relatórios</span>
// </a>