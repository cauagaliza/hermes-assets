document.addEventListener('DOMContentLoaded', () => {
    const body = document.body;
    const themeToggleIcon = document.getElementById('theme-toggle-icon');
    const savedTheme = localStorage.getItem('theme');

    // UI Elements
    const openTransferModalBtn = document.getElementById('open-transfer-modal-btn');
    const openPhaseoutModalBtn = document.getElementById('open-phaseout-modal-btn');
    const requestModalContainer = document.getElementById('request-modal-container');
    const closeRequestModalBtn = document.getElementById('close-request-modal');
    const requestModalTitle = document.getElementById('request-modal-title');
    const searchInput = document.getElementById('search-input');
    const sendRequestBtn = document.getElementById('send-request-btn');
    const searchResultsTableBody = document.getElementById('search-results-table-body');
    const tableHeadersRow = document.getElementById('table-headers-row');
    const sectorModalContainer = document.getElementById('sector-modal-container');
    const closeSectorModalBtn = document.getElementById('close-sector-modal');
    const productInfoDetails = document.getElementById('product-info-details');
    const okSectorBtn = document.getElementById('ok-sector-btn');
    const phaseoutInfoModalContainer = document.getElementById('phaseout-info-modal-container');
    const closePhaseoutInfoModalBtn = document.getElementById('close-phaseout-info-modal');
    const phaseoutInfoDetails = document.getElementById('phaseout-info-details');
    const okPhaseoutBtn = document.getElementById('ok-phaseout-btn');
    const openSuggestionIcon = document.getElementById('open-suggestion-icon');
    const suggestionModalContainer = document.getElementById('suggestion-modal-container');
    const closeSuggestionModalBtn = document.getElementById('close-suggestion-modal');
    const suggestionForm = document.getElementById('suggestion-form');
    const openChatIcon = document.getElementById('open-chat-icon');
    const chatModalContainer = document.getElementById('chat-modal-container');
    const closeChatModalBtn = document.getElementById('close-chat-modal');
    const okChatBtn = document.getElementById('ok-chat-btn');

    // Data Storage
    let allTransferenciaData = [];
    let allPhaseoutData = [];
    let currentMode = '';
    let mapaCodigoParaUra = {};
    let mapaFilaPorSegmento = {};

    // Mapa manual URA -> GTC
    const mapaSegmentoPorTimeAtendimento = {
        'comunicacao_hibrido': 'COMUNICAÇÃO HIBRIDO',
        'comunicacao_analogico': 'COMUNICAÇÃO ANALÓGICO',
        'comunicacao_perifericos': 'COMUNICAÇÃO HIBRIDO',
        'varejo_comunicacao': 'VAREJO GERAL',
        'varejo_mibo': 'MIBO CAM',
        'varejo_controle_acesso': 'VAREJO GERAL',
        'varejo_energia': 'VAREJO GERAL',
        'varejo_casa_inteligente': 'LINHA IZY',
        'controle_acesso_condominial_ip': 'CONDOMINIAL',
        'controle_acesso_condominial_analogico': 'CONDOMINIAL',
        'controle_acesso_residencial': 'PORTEIROS',
        'controle_acesso_incendio_iluminacao': 'IFIRE(Incêndio) / Sistemas Automatizados',
        'controle_acesso_sistemas_automatizados': 'IFIRE(Incêndio) / Sistemas Automatizados',
        'controle_acesso_corporativo': 'IFIRE(Incêndio) / Sistemas Automatizados',
        'seguranca_alarmes_sensores': 'ALARMES',
        'seguranca_cftv': 'CFTV',
        'seguranca_linha_future_tmr': 'CFTV',
        'redes_empresariais': 'REDES EMPRESARIAIS',
        'redes_home_office': 'REDES HOME OFFICE',
        'redes_fibra_optica': 'REDES FIBRA OPTICA',
        'redes_linha_future': 'REDES FIBRA OPTICA',
        'energia': 'ENERGIA CORPORATIVO',
        'energia_solar': 'ENERGIA SOLAR'
    };

    // --- Helpers de Parse CSV e normalização ---
    function normalizarChave(texto) {
        return (texto || '').toString().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim().replace(/\s+/g, ' ');
    }

    function obterValorColuna(item, nomeAlvoNormalizado) {
        const chaves = Object.keys(item);
        for (let i = 0; i < chaves.length; i++) {
            if (normalizarChave(chaves[i]) === nomeAlvoNormalizado) return item[chaves[i]];
        }
        return '';
    }

    function dividirCodigos(texto) {
        if (!texto) return [];
        const codigos = [];
        texto.split(',').forEach(parte => {
            parte.split(/ ou /i).forEach(sub => {
                const limpo = sub.trim();
                if (limpo === '') return;
                if (normalizarChave(limpo) === 'nao existe') return;
                codigos.push(limpo);
            });
        });
        return codigos;
    }

    function parseCSV(texto) {
        let limpo = texto.replace(/<pre>/gi, '').replace(/<\/pre>/gi, '').trim();
        const linhas = limpo.split('\n');
        const resultado = [];
        let cabeçalhos = [];

        for (let i = 0; i < linhas.length; i++) {
            let linhaAtual = linhas[i].trim();
            if (!linhaAtual) continue;
            const colunas = linhaAtual.split(';');

            if (cabeçalhos.length === 0) {
                cabeçalhos = colunas.map(c => c.trim().replace(/^\uFEFF/, '')); // Remove BOM do primeiro header
            } else {
                let obj = {};
                cabeçalhos.forEach((cabecalho, idx) => {
                    obj[cabecalho] = colunas[idx] ? colunas[idx].trim() : '';
                });
                resultado.push(obj);
            }
        }
        return resultado;
    }

    function montarMapaUra(linhas) {
        mapaCodigoParaUra = {};
        linhas.forEach(linha => {
            const timeAtendimento = obterValorColuna(linha, 'time atendimento').trim();
            const codigoNovo = obterValorColuna(linha, 'novo codigo unificado').trim();
            const codigosAntigos = dividirCodigos(obterValorColuna(linha, 'codigo atual'));
            codigosAntigos.forEach(codigo => {
                mapaCodigoParaUra[codigo] = { codigoAtual: codigoNovo, timeAtendimento: timeAtendimento };
            });
        });
    }

    function montarMapaGtc(linhas) {
        mapaFilaPorSegmento = {};
        linhas.forEach(linha => {
            const segmento = obterValorColuna(linha, 'segmento');
            const chave = normalizarChave(segmento);
            if (!chave) return;
            mapaFilaPorSegmento[chave] = obterValorColuna(linha, 'fila').trim();
        });
    }

    // --- Theme Management ---
    function setTheme(theme) {
        if (theme === 'dark') {
            body.classList.add('dark-mode');
            themeToggleIcon.textContent = '🌙';
            localStorage.setItem('theme', 'dark');
        } else {
            body.classList.remove('dark-mode');
            themeToggleIcon.textContent = '☀️';
            localStorage.setItem('theme', 'light');
        }
    }

    if (savedTheme) {
        setTheme(savedTheme);
    } else {
        setTheme('dark');
    }

    themeToggleIcon.addEventListener('click', () => {
        const currentTheme = localStorage.getItem('theme') || 'dark';
        setTheme(currentTheme === 'dark' ? 'light' : 'dark');
    });

    // --- Helper Functions ---
    function openModal(modal) { modal.classList.add('active'); }
    function closeModal(modal) { modal.classList.remove('active'); }

    // --- Fetch Data do MEDIAWIKI (Sem servidor node!) ---
    async function fetchAllData() {
        try {
            const charE = String.fromCharCode(38); // Evita problemas de serialização '&' na Wiki
            const urlTransf = 'https://suporte.intelbras.com.br/index.php?title=Teste_hermes_tranferencia' + charE + 'action=raw';
            const urlPhase = 'https://suporte.intelbras.com.br/index.php?title=Teste_hermes_phaseout' + charE + 'action=raw';
            const urlUra = 'https://suporte.intelbras.com.br/index.php?title=Tabela_ura' + charE + 'action=raw';
            const urlGtc = 'https://suporte.intelbras.com.br/index.php?title=Tabela_gtc' + charE + 'action=raw';

            const [resT, resP, resUra, resGtc] = await Promise.all([
                fetch(urlTransf), fetch(urlPhase), fetch(urlUra), fetch(urlGtc)
            ]);

            // Primeiro prepara os mapas (GTC e URA) se existirem
            if (resUra.ok) montarMapaUra(parseCSV(await resUra.text()));
            if (resGtc.ok) montarMapaGtc(parseCSV(await resGtc.text()));

            // Processa Phaseout
            if (resP.ok) {
                const rawPhaseout = parseCSV(await resP.text());
                allPhaseoutData = rawPhaseout.map(raw => {
                    const vals = Object.values(raw);
                    return {
                        unidade: vals[0] || '',
                        segmento: vals[1] || '',
                        item: vals[2] || '',
                        descricao: vals[3] || '',
                        modelo: vals[4] || '',
                        data_phase_out: vals[5] || '',
                        substituto_direto: vals[6] || '',
                        descricao_subs_dir: vals[7] || '',
                        substituto_indicacao: vals[8] || '',
                        descricao_subs_ind: vals[9] || ''
                    };
                });
            }

            // Processa Transferencia resolvendo cruzamento de URA e Fila
            if (resT.ok) {
                const rawTransf = parseCSV(await resT.text());
                allTransferenciaData = rawTransf.map(raw => {
                    let codigoUraAtual = '';
                    let fila = '';
                    
                    const rawUraAntigo = obterValorColuna(raw, 'ura').trim();
                    if (rawUraAntigo && mapaCodigoParaUra[rawUraAntigo]) {
                        const infoUra = mapaCodigoParaUra[rawUraAntigo];
                        codigoUraAtual = infoUra.codigoAtual;
                        const segmentoGtc = mapaSegmentoPorTimeAtendimento[infoUra.timeAtendimento] || '';
                        if (segmentoGtc) {
                            fila = mapaFilaPorSegmento[normalizarChave(segmentoGtc)] || '';
                        }
                    }

                    return {
                        produto: obterValorColuna(raw, 'nome do produto') || raw['Nome do produto'] || '',
                        unidade_negocio: obterValorColuna(raw, 'unidade de negocio') || raw['Unidade de Negócio'] || '',
                        segmento: obterValorColuna(raw, 'segmento') || raw['Segmento'] || '',
                        transferencia_chat: obterValorColuna(raw, 'transferencia chat') || raw['Transferência Chat'] || '',
                        transferencia_telefone: obterValorColuna(raw, 'transferencia telefone') || raw['Transferência Telefone'] || '',
                        ura: codigoUraAtual || rawUraAntigo,
                        fila_distribuidor: fila || obterValorColuna(raw, 'fila distribuidor')
                    };
                });
            }

            console.log('✅ Dados carregados e formatados (Via MediaWiki CSVs).');
            console.log(`📊 Transferência: ${allTransferenciaData.length}`);
            console.log(`📊 Phaseout: ${allPhaseoutData.length}`);

        } catch (error) {
            console.error('Erro ao buscar todos os dados:', error);
            alert('Não foi possível carregar os dados da Wiki. Verifique a conexão.');
        }
    }

    // --- Render Table Functions ---
    function renderTransferenciaTable(data) {
        searchResultsTableBody.innerHTML = '';
        tableHeadersRow.innerHTML = `
            <th>Nome do produto</th>
            <th>Unidade de Negócio</th>
            <th>Segmento</th>
            <th>Transferência Chat</th>
            <th>Transferência Telefone</th>
            <th>URA (Atual)</th>
            <th>Fila distribuidor</th>
        `;

        if (data.length === 0) {
            searchResultsTableBody.innerHTML = '<tr><td colspan="7">Nenhum produto de transferência encontrado.</td></tr>';
            return;
        }

        data.sort((a, b) => (a.produto || '').localeCompare(b.produto || ''));

        data.forEach(item => {
            const row = document.createElement('tr');
            row.dataset.itemData = JSON.stringify(item);
            row.innerHTML = `
                <td>${item.produto || ''}</td>
                <td>${item.unidade_negocio || ''}</td>
                <td>${item.segmento || ''}</td>
                <td>${item.transferencia_chat || ''}</td>
                <td>${item.transferencia_telefone || ''}</td>
                <td>${item.ura || ''}</td>
                <td>${item.fila_distribuidor || ''}</td>
            `;
            searchResultsTableBody.appendChild(row);
        });
    }

    function renderPhaseoutTable(data) {
        tableHeadersRow.innerHTML = `
        <th>Unidade</th>
        <th>Segmento</th>
        <th>Descrição</th>
        <th>Modelo</th>
        <th>Data Phase Out</th>
        <th>Subst. Direto</th>
        <th>Subst. Indireto</th>
    `;
        searchResultsTableBody.innerHTML = '';

        if (data.length === 0) {
            searchResultsTableBody.innerHTML = '<tr><td colspan="7">Nenhum produto de phaseout encontrado.</td></tr>';
            return;
        }

        data.sort((a, b) => (a.descricao || '').localeCompare(b.descricao || ''));

        data.forEach(item => {
            const row = document.createElement('tr');
            row.dataset.itemData = JSON.stringify(item);
            row.innerHTML = `
            <td>${item.unidade || ''}</td>
            <td>${item.segmento || ''}</td>
            <td>${item.descricao || ''}</td>
            <td>${item.modelo || ''}</td>
            <td>${item.data_phase_out || ''}</td>
            <td>${item.descricao_subs_dir || ''}</td>
            <td>${item.descricao_subs_ind || ''}</td>
        `;
            searchResultsTableBody.appendChild(row);
        });
    }

    // --- Lógica de busca ---
    function performSearch() {
        const searchTerm = searchInput.value.toLowerCase().trim();
        if (searchTerm === '') {
            searchResultsTableBody.innerHTML = '<tr><td colspan="7">Digite para pesquisar.</td></tr>';
            return;
        }

        if (currentMode === 'transferencia') {
            const filtered = allTransferenciaData.filter(item =>
                (item.produto && item.produto.toLowerCase().includes(searchTerm)) ||
                (item.segmento && item.segmento.toLowerCase().includes(searchTerm)) ||
                (item.unidade_negocio && item.unidade_negocio.toLowerCase().includes(searchTerm)) ||
                (item.ura && item.ura.toLowerCase().includes(searchTerm))
            );
            renderTransferenciaTable(filtered);
        } else if (currentMode === 'phaseout') {
            const filtered = allPhaseoutData.filter(item =>
                (item.item && item.item.toLowerCase().includes(searchTerm)) ||
                (item.descricao && item.descricao.toLowerCase().includes(searchTerm)) ||
                (item.modelo && item.modelo.toLowerCase().includes(searchTerm))
            );
            renderPhaseoutTable(filtered);
        }
    }

    // --- Display Detail Modals ---
    function displayTransferenciaDetails(item) {
        productInfoDetails.innerHTML = `
            <div class="product-detail-item"><strong>Nome do produto:</strong> <span>${item.produto || ''}</span></div>
            <div class="product-detail-item"><strong>Unidade de Negócio:</strong> <span>${item.unidade_negocio || ''}</span></div>
            <div class="product-detail-item"><strong>Segmento:</strong> <span>${item.segmento || 'N/A'}</span></div>
            <div class="product-detail-item">
                <div><strong>Transferência Chat:</strong> <span>${item.transferencia_chat || ''}</span></div>
                <button class="copy-button" data-text="${item.transferencia_chat || ''}">COPIAR</button>
            </div>
            <div class="product-detail-item">
                <div><strong>Transferência Telefone:</strong> <span>${item.transferencia_telefone || ''}</span></div>
                <button class="copy-button" data-text="${item.transferencia_telefone || ''}">COPIAR</button>
            </div>
            <div class="product-detail-item">
                <div><strong>URA (Atual):</strong> <span>${item.ura || ''}</span></div>
                <button class="copy-button" data-text="${item.ura || ''}">COPIAR</button>
            </div>
            <div class="product-detail-item">
                <div><strong>Fila distribuidor:</strong> <span>${item.fila_distribuidor || ''}</span></div>
                <button class="copy-button" data-text="${item.fila_distribuidor || ''}">COPIAR</button>
            </div>
        `;
        openModal(sectorModalContainer);
        sectorModalContainer.querySelectorAll('.copy-button').forEach(button => {
            button.addEventListener('click', (e) => {
                navigator.clipboard.writeText(e.target.dataset.text).then(() => {
                    const originalText = e.target.textContent;
                    e.target.textContent = 'COPIADO!';
                    setTimeout(() => e.target.textContent = originalText, 1500);
                });
            });
        });
    }

    function displayPhaseoutDetails(item) {
        phaseoutInfoDetails.innerHTML = `
            <div class="phaseout-detail-item"><strong>Unidade:</strong> <span>${item.unidade || ''}</span></div>
            <div class="phaseout-detail-item"><strong>Segmento:</strong> <span>${item.segmento || ''}</span></div>
            <div class="phaseout-detail-item"><strong>Descrição:</strong> <span>${item.descricao || ''}</span></div>
            <div class="phaseout-detail-item"><strong>Modelo:</strong> <span>${item.modelo || ''}</span></div>
            <div class="phaseout-detail-item"><strong>Data Phase Out:</strong> <span>${item.data_phase_out || ''}</span></div>
            <div class="phaseout-detail-item"><strong>Substituto Direto:</strong> <span>${item.descricao_subs_dir || ''}</span></div>
            <div class="phaseout-detail-item"><strong>Substituto Indicação:</strong> <span>${item.descricao_subs_ind || ''}</span></div>
        `;
        openModal(phaseoutInfoModalContainer);
    }

    // --- Event Listeners ---
    openTransferModalBtn.addEventListener('click', () => {
        currentMode = 'transferencia';
        requestModalTitle.textContent = 'Pesquisar Produto para Transferência';
        searchInput.placeholder = 'Digite o nome, segmento, URA...';
        searchInput.value = '';
        renderTransferenciaTable([]);
        searchResultsTableBody.innerHTML = '<tr><td colspan="7">Digite para pesquisar.</td></tr>';
        openModal(requestModalContainer);
    });

    openPhaseoutModalBtn.addEventListener('click', () => {
        currentMode = 'phaseout';
        requestModalTitle.textContent = 'Pesquisar Phase Out';
        searchInput.placeholder = 'Digite o Item, Descrição ou Modelo...';
        searchInput.value = '';
        renderPhaseoutTable([]);
        searchResultsTableBody.innerHTML = '<tr><td colspan="7">Digite para pesquisar.</td></tr>';
        openModal(requestModalContainer);
    });

    sendRequestBtn.addEventListener('click', performSearch);
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') performSearch();
    });

    searchResultsTableBody.addEventListener('click', (event) => {
        const row = event.target.closest('tr');
        if (!row || !row.dataset.itemData) return;

        const selectedItem = JSON.parse(row.dataset.itemData);
        closeModal(requestModalContainer);
        if (currentMode === 'transferencia') {
            displayTransferenciaDetails(selectedItem);
        } else if (currentMode === 'phaseout') {
            displayPhaseoutDetails(selectedItem);
        }
    });

    [closeRequestModalBtn, okSectorBtn, closeSectorModalBtn, closePhaseoutInfoModalBtn, okPhaseoutBtn, closeSuggestionModalBtn, closeChatModalBtn, okChatBtn].forEach(btn => {
        btn.addEventListener('click', () => {
            closeModal(btn.closest('.modal-container'));
        });
    });

    openSuggestionIcon.addEventListener('click', () => openModal(suggestionModalContainer));
    openChatIcon.addEventListener('click', () => openModal(chatModalContainer));

    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal-container')) closeModal(e.target);
    });

    if (suggestionForm) {
        suggestionForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const form = e.target;
            try {
                const response = await fetch(form.action, {
                    method: form.method,
                    body: new FormData(form),
                    headers: { 'Accept': 'application/json' }
                });
                if (response.ok) {
                    alert('Sugestão enviada com sucesso!');
                    form.reset();
                    closeModal(suggestionModalContainer);
                } else alert('Houve um erro ao enviar sua sugestão.');
            } catch (error) {
                alert('Erro de conexão ao enviar sugestão.');
            }
        });
    }

    // Dispara a busca inicial
    fetchAllData();
});
