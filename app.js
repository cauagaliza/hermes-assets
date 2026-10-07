document.addEventListener('DOMContentLoaded', () => {
    const hermesApp = document.getElementById('hermes-app');
    const themeToggleIcon = document.getElementById('theme-toggle-icon');

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

    if (!hermesApp) {
        console.error('[Hermes] Elemento #hermes-app não encontrado na página. ' +
            'O style.css inteiro é escopado em #hermes-app e o JS depende dele ' +
            '— confira se o wrapper raiz da página tem exatamente esse id.');
    }

    // --- Estado ---
    let allTransferenciaData = [];
    let allPhaseoutData = [];
    let currentMode = '';

    // =========================================================================
    // ASSOCIAÇÃO URA + FILA DISTRIBUIDOR — 100% NO CÓDIGO, SEM TABELA AUXILIAR
    //
    // A tabela de Transferência na wiki só precisa ter as 5 colunas originais:
    //   Nome do produto;Diretoria de Produto;Segmento;Transferencia Chat;Transferencia Telefone
    //
    // A chave "Transferência Telefone" já vem, na maioria dos produtos, com o
    // slug da categoria de atendimento (ex.: "seguranca_cftv",
    // "controle_acesso_corporativo"). É isso que usamos pra buscar aqui.
    //
    // Fonte: cruzamento de ~4.935 produtos reais da tabela de transferência
    // (18 categorias confirmadas diretamente nos dados) + Exemplo A, aprovado
    // por você, pras 8 categorias que ainda não tinham Fila preenchida.
    // =========================================================================
    const INFO_POR_TIME_ATENDIMENTO = {
        // --- Confirmadas diretamente nos dados reais (URA e Fila já batiam) ---
        'comunicacao_analogico':                 { ura: '433', fila: 'Telecom Dedicado' },
        'comunicacao_hibrido':                   { ura: '449', fila: 'Telecom Dedicado' },
        'controle_acesso_condominial_ip':        { ura: '450', fila: 'Condominial Dedicado' },
        'controle_acesso_residencial':           { ura: '452', fila: 'Varejo Dedicado' },
        'controle_acesso_sistemas_automatizados':{ ura: '464', fila: 'Controle de acesso Dedicado/ GTC Controle de Acesso SC' },
        'energia':                                { ura: '482', fila: 'Energia Dedicado' },
        'redes_cabeamento_estruturado':          { ura: '478', fila: 'Redes Dedicado' },
        'redes_empresariais':                    { ura: '476', fila: 'Redes Dedicado' },
        'redes_fibra_optica':                    { ura: '478', fila: 'Redes Dedicado' },
        'seguranca_cftv':                        { ura: '458', fila: 'Segurança Dedicado' },
        'seguranca_linha_future_tmr':            { ura: '490', fila: 'Segurança Dedicado' },
        'solar_offgrid':                         { ura: '494', fila: 'Energia Dedicado' },
        'solar_ongrid':                          { ura: '492', fila: 'Energia Dedicado' },
        'varejo_comunicacao':                    { ura: '407', fila: 'Varejo Dedicado' },
        'varejo_controle_acesso':                { ura: '453', fila: 'Varejo Dedicado' },
        'varejo_energia':                        { ura: '484', fila: 'Varejo Dedicado' },
        'varejo_mibo':                           { ura: '357', fila: 'Varejo Dedicado' },
        'varejo_redes':                          { ura: '475', fila: 'Varejo Dedicado' },

        // --- Exemplo A: URA já existia nos dados, Fila preenchida por analogia (aprovado) ---
        'controle_acesso_corporativo':           { ura: '466', fila: 'Controle de acesso Dedicado/ GTC Controle de Acesso SC' },
        'seguranca_alarmes_sensores':            { ura: '454', fila: 'Alarmes Dedicado' },
        'controle_acesso_incendio_iluminacao':   { ura: '461', fila: 'Controle de acesso Dedicado/ GTC Controle de Acesso SC' },
        'varejo_casa_inteligente':               { ura: '493', fila: 'Varejo Dedicado' },
        'controle_acesso_condominial_analogico': { ura: '451', fila: 'Condominial Dedicado' },
        'comunicacao_perifericos':                { ura: '402', fila: 'Telecom Dedicado' },
        'redes_5g':                               { ura: '478', fila: 'Redes Dedicado' },
        'redes_home_office':                      { ura: '475', fila: 'Varejo Dedicado' }, // confirmado por você

        // --- Extra, não confirmado nos dados atuais (categoria da Tabela_ura antiga,
        //     não apareceu em nenhum produto na amostra analisada). Se aparecer um
        //     "Transferência Telefone" = redes_linha_future, cai aqui; revise se precisar. ---
        'redes_linha_future':                     { ura: '479', fila: 'Redes Dedicado' },

    };

    // =========================================================================
    // FALLBACK POR SEGMENTO — para produtos com "Transferência Telefone" vazio
    // cujo slugify(Segmento) não bate com nenhuma chave acima.
    // Chave: Segmento normalizado (sem acento, minúsculo). Valor: chave de
    // INFO_POR_TIME_ATENDIMENTO. Mapeamento confirmado pelo dono em 2026-10-06.
    // RENOVIGI fica de fora de propósito (sem categoria, mostra "—").
    // =========================================================================
    const INFO_POR_SEGMENTO = {
        'comunicacao ho':        'redes_home_office',
        'redes opticas':         'redes_fibra_optica',
        'redes empresariais':    'redes_empresariais',
        'cameras plug and play': 'varejo_mibo',
        'fechaduras digitais':   'varejo_controle_acesso',
        'energia ho':            'varejo_casa_inteligente',
        'cftv ip':               'seguranca_cftv',
    };

    // === CSV HELPERS ===
    function normalizarChave(texto) {
        return (texto || '').toString()
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
            .toLowerCase().trim().replace(/\s+/g, ' ');
    }

    // Converte um texto humano (ex.: "Controle De Acesso Condominial Ip")
    // num slug snake_case removendo palavras de ligação comuns em
    // português. Usado só como FALLBACK, quando "Transferência Telefone"
    // vem vazio — tenta inferir a categoria a partir do "Segmento".
    const STOPWORDS_PT = new Set(['de', 'da', 'do', 'das', 'dos', 'e']);
    function slugify(texto) {
        const palavras = normalizarChave(texto).split(' ').filter(p => p && !STOPWORDS_PT.has(p));
        return palavras.join('_').replace(/[^a-z0-9_]/g, '');
    }

    function obterValorColuna(item, nomeAlvoNormalizado) {
        for (const chave of Object.keys(item)) {
            if (normalizarChave(chave) === nomeAlvoNormalizado) return item[chave];
        }
        return '';
    }

    function parseCSV(texto) {
        const limpo = texto.replace(/<pre>/gi, '').replace(/<\/pre>/gi, '').trim();
        const linhas = limpo.split('\n');
        const resultado = [];
        let cabecalhos = [];

        for (const linha of linhas) {
            const linhaAtual = linha.trim();
            if (!linhaAtual) continue;
            const colunas = linhaAtual.split(';');
            if (cabecalhos.length === 0) {
                cabecalhos = colunas.map(c => c.trim().replace(/^\uFEFF/, ''));
            } else {
                const obj = {};
                cabecalhos.forEach((cab, idx) => {
                    obj[cab] = colunas[idx] ? colunas[idx].trim() : '';
                });
                resultado.push(obj);
            }
        }
        return resultado;
    }

    // -------------------------------------------------------
    // Resolve { ura, fila } de um produto:
    // 1) tenta bater o valor cru de "Transferência Telefone" direto no
    //    dicionário (é a chave mais confiável, já vem como slug pronto);
    // 2) se vier vazio ou não bater, tenta um slug gerado a partir do
    //    "Segmento" (fallback, cobre alguns casos sem telefone);
    // 3) se não, tenta o Segmento normalizado em INFO_POR_SEGMENTO;
    // 4) se nada bater, registra em `pendentes` (resumido no console ao
    //    final da carga) e devolve vazio (não quebra a página, só não preenche).
    // -------------------------------------------------------
    function resolverInfoUraFila(telefoneRaw, segmento, nomeProduto, pendentes) {
        const chaveDireta = (telefoneRaw || '').trim();
        if (chaveDireta && INFO_POR_TIME_ATENDIMENTO[chaveDireta]) {
            return INFO_POR_TIME_ATENDIMENTO[chaveDireta];
        }

        const slug = slugify(segmento);
        if (slug && INFO_POR_TIME_ATENDIMENTO[slug]) {
            return INFO_POR_TIME_ATENDIMENTO[slug];
        }

        const porSegmento = INFO_POR_SEGMENTO[normalizarChave(segmento)];
        if (porSegmento && INFO_POR_TIME_ATENDIMENTO[porSegmento]) {
            return INFO_POR_TIME_ATENDIMENTO[porSegmento];
        }

        pendentes.push({ produto: nomeProduto, segmento: segmento, telefone: telefoneRaw });
        return { ura: '', fila: '' };
    }

    // Um único aviso no console, agrupado por Segmento, em vez de um por produto.
    function avisarPendentes(pendentes) {
        if (pendentes.length === 0) return;
        const porSegmento = {};
        for (const p of pendentes) {
            const chave = (p.segmento || '(vazio)') + ' | telefone="' + (p.telefone || '') + '"';
            porSegmento[chave] = (porSegmento[chave] || 0) + 1;
        }
        console.warn(
            '[Hermes] ' + pendentes.length + ' produto(s) sem URA/Fila (mostram "—"). ' +
            'RENOVIGI é esperado. Para os demais, adicione a categoria em ' +
            'INFO_POR_TIME_ATENDIMENTO ou o Segmento em INFO_POR_SEGMENTO no app.js.',
            porSegmento
        );
        console.debug('[Hermes] Produtos sem URA/Fila:', pendentes);
    }

    // === TEMA ===
    function setTheme(theme) {
        if (!hermesApp) return;
        if (theme === 'dark') {
            hermesApp.classList.add('dark-mode');
            if (themeToggleIcon) themeToggleIcon.textContent = '🌙';
        } else {
            hermesApp.classList.remove('dark-mode');
            if (themeToggleIcon) themeToggleIcon.textContent = '☀️';
        }
        localStorage.setItem('hermes-theme', theme);
    }

    const savedTheme = localStorage.getItem('hermes-theme') || 'dark';
    setTheme(savedTheme);

    if (themeToggleIcon) {
        themeToggleIcon.addEventListener('click', () => {
            setTheme(hermesApp && hermesApp.classList.contains('dark-mode') ? 'light' : 'dark');
        });
    }

    // === MODAIS ===
    function openModal(modal) { if (modal) modal.classList.add('active'); }
    function closeModal(modal) { if (modal) modal.classList.remove('active'); }

    // === FETCH DADOS DA WIKI ===
    // Só busca as duas tabelas de produto — nada de Tabela_ura/Tabela_gtc,
    // a associação agora é 100% local, via INFO_POR_TIME_ATENDIMENTO.
    async function fetchAllData() {
        try {
            const [resT, resP] = await Promise.all([
                fetch('https://suporte.intelbras.com.br/index.php?title=Teste_hermes_tranferencia&action=raw'),
                fetch('https://suporte.intelbras.com.br/index.php?title=Teste_hermes_phaseout&action=raw'),
            ]);

            // Phase Out
            if (resP.ok) {
                allPhaseoutData = parseCSV(await resP.text()).map(raw => {
                    const vals = Object.values(raw);
                    return {
                        unidade:            vals[0] || '',
                        segmento:           vals[1] || '',
                        item:               vals[2] || '',
                        descricao:          vals[3] || '',
                        modelo:             vals[4] || '',
                        data_phase_out:     vals[5] || '',
                        descricao_subs_dir: vals[7] || '',
                        descricao_subs_ind: vals[9] || '',
                    };
                });
            }

            // Transferência — só as 5 colunas originais; URA/Fila vêm do dicionário.
            if (resT.ok) {
                const pendentes = [];
                allTransferenciaData = parseCSV(await resT.text()).map(raw => {
                    const produto = obterValorColuna(raw, 'nome do produto');
                    const segmento = obterValorColuna(raw, 'segmento');
                    const telefone = obterValorColuna(raw, 'transferencia telefone');
                    const info = resolverInfoUraFila(telefone, segmento, produto, pendentes);

                    return {
                        produto: produto,
                        unidade_negocio: obterValorColuna(raw, 'diretoria de produto')
                                      || obterValorColuna(raw, 'unidade de negocio'),
                        segmento: segmento,
                        transferencia_chat: obterValorColuna(raw, 'transferencia chat'),
                        transferencia_telefone: telefone,
                        ura: info.ura,
                        fila_distribuidor: info.fila,
                    };
                });
                avisarPendentes(pendentes);
            }

            console.log('[Hermes] ✅ Dados carregados!');
            console.log('[Hermes] Transferência (amostra):', allTransferenciaData.slice(0, 3));
            console.log('[Hermes] Phase Out (amostra):', allPhaseoutData.slice(0, 2));

        } catch (err) {
            console.error('[Hermes] Erro ao carregar dados:', err);
        }
    }

    // === RENDERIZAÇÃO DE TABELAS ===
    const EMPTY_MSG = (cols) =>
        `<tr><td colspan="${cols}" style="text-align:center;padding:1rem;color:#999;">
            Nenhum produto encontrado.
        </td></tr>`;

    const SEARCH_HINT = (cols) =>
        `<tr><td colspan="${cols}" style="text-align:center;padding:1rem;color:#999;">
            Digite para pesquisar.
        </td></tr>`;

    function renderTransferenciaTable(data, hint = false) {
        tableHeadersRow.innerHTML = `
            <th>Nome do produto</th><th>Unidade de Negócio</th><th>Segmento</th>
            <th>Transf. Chat</th><th>Transf. Telefone</th>
            <th>URA (Atual)</th><th>Fila distribuidor</th>`;

        if (hint) { searchResultsTableBody.innerHTML = SEARCH_HINT(7); return; }
        if (!data || data.length === 0) { searchResultsTableBody.innerHTML = EMPTY_MSG(7); return; }

        searchResultsTableBody.innerHTML = '';
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
                <td><strong>${item.ura || '—'}</strong></td>
                <td>${item.fila_distribuidor || '—'}</td>`;
            searchResultsTableBody.appendChild(row);
        });
    }

    function renderPhaseoutTable(data, hint = false) {
        tableHeadersRow.innerHTML = `
            <th>Unidade</th><th>Segmento</th><th>Descrição</th><th>Modelo</th>
            <th>Data Phase Out</th><th>Subst. Direto</th><th>Subst. Indireto</th>`;

        if (hint) { searchResultsTableBody.innerHTML = SEARCH_HINT(7); return; }
        if (!data || data.length === 0) { searchResultsTableBody.innerHTML = EMPTY_MSG(7); return; }

        searchResultsTableBody.innerHTML = '';
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
                <td>${item.descricao_subs_ind || ''}</td>`;
            searchResultsTableBody.appendChild(row);
        });
    }

    // === BUSCA ===
    function performSearch() {
        const term = (searchInput.value || '').toLowerCase().trim();
        if (!term) {
            currentMode === 'transferencia'
                ? renderTransferenciaTable([], true)
                : renderPhaseoutTable([], true);
            return;
        }

        if (currentMode === 'transferencia') {
            const filtered = allTransferenciaData.filter(item =>
                Object.values(item).some(v => v && String(v).toLowerCase().includes(term))
            );
            renderTransferenciaTable(filtered);
        } else {
            const filtered = allPhaseoutData.filter(item =>
                Object.values(item).some(v => v && String(v).toLowerCase().includes(term))
            );
            renderPhaseoutTable(filtered);
        }
    }

    // === DETALHES ===
    function criarBotaoCopiar(texto) {
        if (!texto || texto === '—') return '';
        const safe = texto.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
        return `<button class="copy-button" data-copy="${safe}">COPIAR</button>`;
    }

    function bindCopyButtons(container) {
        container.querySelectorAll('.copy-button[data-copy]').forEach(btn => {
            btn.addEventListener('click', () => {
                const text = btn.dataset.copy;
                const original = btn.textContent;
                const done = () => { btn.textContent = 'COPIADO!'; setTimeout(() => btn.textContent = original, 1500); };
                if (navigator.clipboard && window.isSecureContext) {
                    navigator.clipboard.writeText(text).then(done).catch(() => fallback(text, done));
                } else {
                    fallback(text, done);
                }
            });
        });
    }

    function fallback(text, done) {
        const t = document.createElement('textarea');
        t.value = text; t.style.position = 'fixed'; t.style.top = '-9999px';
        document.body.appendChild(t); t.focus(); t.select();
        try { document.execCommand('copy'); done(); } catch (_) { alert('Não foi possível copiar.'); }
        t.remove();
    }

    function row(label, value) {
        return `<div class="product-detail-item">
            <div><strong>${label}:</strong> <span>${value || '—'}</span></div>
            ${criarBotaoCopiar(value)}
        </div>`;
    }

    function displayTransferenciaDetails(item) {
        productInfoDetails.innerHTML = `
            ${row('Nome do produto',        item.produto)}
            ${row('Unidade de Negócio',     item.unidade_negocio)}
            ${row('Segmento',               item.segmento)}
            ${row('Transferência Chat',     item.transferencia_chat)}
            ${row('Transferência Telefone', item.transferencia_telefone)}
            ${row('URA (Atual)',            item.ura)}
            ${row('Fila distribuidor',      item.fila_distribuidor)}
        `;
        bindCopyButtons(productInfoDetails);
        closeModal(requestModalContainer);
        openModal(sectorModalContainer);
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
        closeModal(requestModalContainer);
        openModal(phaseoutInfoModalContainer);
    }

    // === EVENTOS ===
    if (openTransferModalBtn) {
        openTransferModalBtn.addEventListener('click', () => {
            currentMode = 'transferencia';
            requestModalTitle.textContent = 'Pesquisar Produto para Transferência';
            searchInput.placeholder = 'Nome do produto, segmento, URA...';
            searchInput.value = '';
            renderTransferenciaTable([], true);
            openModal(requestModalContainer);
            setTimeout(() => searchInput.focus(), 100);
        });
    }

    if (openPhaseoutModalBtn) {
        openPhaseoutModalBtn.addEventListener('click', () => {
            currentMode = 'phaseout';
            requestModalTitle.textContent = 'Pesquisar Phase Out';
            searchInput.placeholder = 'Descrição, modelo, segmento...';
            searchInput.value = '';
            renderPhaseoutTable([], true);
            openModal(requestModalContainer);
            setTimeout(() => searchInput.focus(), 100);
        });
    }

    if (sendRequestBtn) sendRequestBtn.addEventListener('click', performSearch);
    if (searchInput) searchInput.addEventListener('keypress', e => { if (e.key === 'Enter') performSearch(); });

    if (searchResultsTableBody) {
        searchResultsTableBody.addEventListener('click', e => {
            const row = e.target.closest('tr');
            if (!row || !row.dataset.itemData) return;
            const item = JSON.parse(row.dataset.itemData);
            if (currentMode === 'transferencia') displayTransferenciaDetails(item);
            else displayPhaseoutDetails(item);
        });
    }

    // Botões fechar
    [
        [closeRequestModalBtn,      requestModalContainer],
        [closeSectorModalBtn,       sectorModalContainer],
        [okSectorBtn,               sectorModalContainer],
        [closePhaseoutInfoModalBtn, phaseoutInfoModalContainer],
        [okPhaseoutBtn,             phaseoutInfoModalContainer],
        [closeSuggestionModalBtn,   suggestionModalContainer],
        [closeChatModalBtn,         chatModalContainer],
        [okChatBtn,                 chatModalContainer],
    ].forEach(([btn, modal]) => {
        if (btn && modal) btn.addEventListener('click', () => closeModal(modal));
    });

    if (openSuggestionIcon) openSuggestionIcon.addEventListener('click', () => openModal(suggestionModalContainer));
    if (openChatIcon)       openChatIcon.addEventListener('click',       () => openModal(chatModalContainer));

    window.addEventListener('click', e => {
        if (e.target.classList.contains('modal-container') && e.target.classList.contains('active')) {
            closeModal(e.target);
        }
    });

    if (suggestionForm) {
        suggestionForm.addEventListener('submit', async e => {
            e.preventDefault();
            try {
                const res = await fetch(e.target.action, {
                    method: 'POST',
                    body: new FormData(e.target),
                    headers: { 'Accept': 'application/json' }
                });
                if (res.ok) {
                    alert('Sugestão enviada com sucesso!');
                    e.target.reset();
                    closeModal(suggestionModalContainer);
                } else {
                    alert('Erro ao enviar sugestão.');
                }
            } catch {
                alert('Erro de conexão.');
            }
        });
    }

    // Inicia o carregamento
    fetchAllData();
});
