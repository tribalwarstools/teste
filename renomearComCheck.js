(function () {
  const delay = (ms) => new Promise((res) => setTimeout(res, ms));
  let interromper = false;
  let renomearAtivo = false;

  function montarNome(contador, digitos, prefixo, textoBase, sufixo, usarNumeracao, usarPrefixo, usarTexto, usarSufixo, coordenadas) {
    let partes = [];
    if (usarNumeracao) partes.push(String(contador).padStart(digitos, '0'));
    if (usarPrefixo) partes.push(prefixo);
    if (usarTexto) partes.push(textoBase);
    if (coordenadas) partes.push(coordenadas);
    if (usarSufixo) partes.push(sufixo);
    return partes.filter(Boolean).join(' ').trim();
  }

  function atualizarPreview(config) {
    const listaPreview = document.getElementById('listaPreview');
    if (!listaPreview) return;

    const icones = [...document.querySelectorAll('.rename-icon')].filter(el => el.offsetParent !== null);
    const nomesAtuais = icones.map(el => el.closest('tr').querySelector('span.quickedit-label')?.innerText || '');
    let aldeias = icones.map((el, i) => ({ el, nome: nomesAtuais[i], id: i }));

    if (config.filtrar) {
      try {
        const re = config.regex ? new RegExp(config.filtroNome) : null;
        aldeias = aldeias.filter(a => config.regex ? re.test(a.nome) : a.nome.includes(config.filtroNome));
      } catch {
        listaPreview.innerHTML = '<li style="color:red;">Filtro regex inválido</li>';
        return;
      }
    }

    if (config.ordem === 'desc') aldeias.reverse();
    let contador = config.inicio || 1;

    listaPreview.innerHTML = '';
    aldeias.forEach((aldeia, idx) => {
      const coords = aldeia.el.closest('tr').querySelector('span.quickedit-label')?.innerText.match(/\d+\|\d+/)?.[0] || '';
      const nomePreview = montarNome(
        contador + idx,
        config.digitos,
        config.prefixo,
        config.textoBase,
        config.sufixo,
        config.usarNumeracao,
        config.usarPrefixo,
        config.usarTexto,
        config.usarSufixo,
        config.incluirCoords ? coords : ''
      );

      const li = document.createElement('li');
      li.style.marginBottom = '4px';

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = true;
      checkbox.dataset.index = aldeia.id;
      checkbox.style.marginRight = '4px';

      li.appendChild(checkbox);
      li.append(`${aldeia.nome} → ${nomePreview}`);
      listaPreview.appendChild(li);
    });

    if (aldeias.length === 0) {
      listaPreview.innerHTML = '<li>Nenhuma aldeia visível para pré-visualizar</li>';
    }
  }

  async function renomearAldeias(config) {
    const icones = [...document.querySelectorAll('.rename-icon')].filter(el => el.offsetParent !== null);
    const nomesAtuais = icones.map(el => el.closest('tr').querySelector('span.quickedit-label')?.innerText || '');
    let aldeias = icones.map((el, i) => ({ el, nome: nomesAtuais[i], id: i }));

    if (config.filtrar) {
      try {
        const re = config.regex ? new RegExp(config.filtroNome) : null;
        aldeias = aldeias.filter(a => config.regex ? re.test(a.nome) : a.nome.includes(config.filtroNome));
      } catch {
        UI.ErrorMessage('Expressão regular inválida.');
        renomearAtivo = false;
        return;
      }
    }

    if (config.ordem === 'desc') aldeias.reverse();

    const selecionadas = [...document.querySelectorAll('#listaPreview input[type=checkbox]')]
      .filter(cb => cb.checked)
      .map(cb => parseInt(cb.dataset.index));

    aldeias = aldeias.filter((_, idx) => selecionadas.includes(idx));
    let contador = config.inicio || 1;

    const barraProgresso = document.getElementById('barraProgresso');
    const barraTexto = document.getElementById('barraTexto');
    const btnParar = document.getElementById('btnParar');

    btnParar.disabled = false;
    btnParar.textContent = 'Parar';
    interromper = false;

    for (let i = 0; i < aldeias.length; i++) {
      if (interromper) break;
      const { el } = aldeias[i];
      el.click();
      await delay(300);

      const input = document.querySelector('.vis input[type="text"]');
      const confirmar = document.querySelector('.vis input[type="button"]');
      const coords = el.closest('tr').querySelector('span.quickedit-label')?.innerText.match(/\d+\|\d+/)?.[0];

      if (input && confirmar) {
        const novoNome = montarNome(
          contador,
          config.digitos,
          config.prefixo,
          config.textoBase,
          config.sufixo,
          config.usarNumeracao,
          config.usarPrefixo,
          config.usarTexto,
          config.usarSufixo,
          config.incluirCoords ? coords : ''
        );
        input.value = novoNome;
        input.dispatchEvent(new Event('input', { bubbles: true }));
        await delay(200);
        confirmar.click();
        contador++;

        const progresso = ((i + 1) / aldeias.length) * 100;
        barraProgresso.style.width = progresso + '%';
        barraTexto.textContent = progresso.toFixed(1) + '%';
      }

      await delay(config.delay);
    }

    UI.SuccessMessage(interromper ? 'Renomeação interrompida pelo usuário.' : 'Renomeação finalizada.');
    btnParar.textContent = 'Parar';
    btnParar.disabled = true;
    interromper = false;
    renomearAtivo = false;
  }

  window.abrirPainelAvancado = function () {
    if (!window.location.href.includes('screen=overview_villages') || !window.location.href.includes('mode=combined')) {
      return alert('Acesse a tela de Visão Geral (modo combinado) antes de rodar o script.');
    }

    Dialog.show('painelAvancado', `
  <div style="font-size:13px; padding:10px; max-width:650px; margin:auto;">
    <div style="display:flex; gap:10px;">
      <div style="flex:1; min-width:280px;">
        <h3 style="text-align:center; margin-bottom:10px;">Configuração de Renomeação</h3>
        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:8px;">
          <label><input id="numeracao" type="checkbox" checked> Numeração</label>
          <label style="display:flex; align-items:center;">Digitos: <input id="digitos" type="number" value="2" min="1" max="10" style="width:50px; margin-left:4px;"></label>

          <label><input id="prefixcheck" type="checkbox"> Prefixo</label>
          <input id="prefixbox" type="text" placeholder="Ex: K55" style="width:100%;">

          <label><input id="textocheck" type="checkbox"> Texto base</label>
          <input id="textbox" type="text" placeholder="Ex: Aldeia" style="width:100%;">

          <label><input id="suffixcheck" type="checkbox"> Sufixo</label>
          <input id="suffixbox" type="text" placeholder="Ex: Norte" style="width:100%;">

          <label style="grid-column:2; display:flex; align-items:center;">Início contador: <input id="contadorInicio" type="number" value="1" style="width:60px; margin-left:4px;"></label>

          <label style="grid-column:2; display:flex; align-items:center;">Delay (ms): <input id="delay" type="number" value="400" style="width:60px; margin-left:4px;"></label>

          <label><input id="coords" type="checkbox"> Incluir coordenadas</label>
          <label><input id="filtercheck" type="checkbox"> Filtro por nome</label>
          <input id="filtertext" type="text" placeholder="Texto ou regex" style="width:100%;" />
          
          <label><input id="regexcheck" type="checkbox"> Usar regex</label>

          <label for="ordem">Ordem</label>
          <select id="ordem" style="width:100%;">
            <option value="asc">Crescente</option>
            <option value="desc">Decrescente</option>
          </select>
        </div>
        <div style="margin-top:8px; display:flex; justify-content:center; gap:8px;">
          <button id="btnExecutar" class="btn btn-confirm-yes" >Executar</button>
          <button id="btnParar" class="btn btn-confirm-no" disabled>Parar</button>
          <button id="btnSalvar" class="btn btn-confirm-yes" >Salvar</button>
          <button id="btnResetar" class="btn btn-confirm-no" >Resetar</button>
        </div>
      </div>

      <div style="flex:1; min-width:300px; max-height:400px; overflow-y:auto; border:1px solid #ccc; border-radius:6px; padding:6px; background:#fafafa;">
        <h3 style="text-align:center; margin:0 0 8px;">Pré-visualização de nomes</h3>
        <ul id="listaPreview" style="list-style:none; padding-left:8px; font-size:10px; line-height:1.3; color:#444; margin:0;">
          <li>Nenhuma aldeia visível para pré-visualizar</li>
        </ul>
      </div>
    </div>

    <div style="height:16px; background:#ddd; margin-top:10px; border-radius:8px; overflow:hidden; width:100%;">
      <div id="barraProgresso" style="height:16px; width:0%; background: linear-gradient(90deg,#4caf50,#81c784);"></div>
    </div>
    <div id="barraTexto" style="text-align:center; margin-top:4px; font-weight:bold;">0%</div>
  </div>
`);

    const getConfig = () => ({
      usarNumeracao: document.getElementById('numeracao').checked,
      digitos: parseInt(document.getElementById('digitos').value) || 2,
      usarPrefixo: document.getElementById('prefixcheck').checked,
      prefixo: document.getElementById('prefixbox').value.trim(),
      usarTexto: document.getElementById('textocheck').checked,
      textoBase: document.getElementById('textbox').value.trim(),
      usarSufixo: document.getElementById('suffixcheck').checked,
      sufixo: document.getElementById('suffixbox').value.trim(),
      inicio: parseInt(document.getElementById('contadorInicio').value) || 1,
      delay: parseInt(document.getElementById('delay').value) || 400,
      incluirCoords: document.getElementById('coords').checked,
      filtrar: document.getElementById('filtercheck').checked,
      filtroNome: document.getElementById('filtertext').value.trim(),
      regex: document.getElementById('regexcheck').checked,
      ordem: document.getElementById('ordem').value
    });

    document.getElementById('btnExecutar').onclick = async () => {
      if (renomearAtivo) return;
      renomearAtivo = true;
      await renomearAldeias(getConfig());
    };

    document.getElementById('btnParar').onclick = () => {
      interromper = true;
    };

    document.getElementById('btnSalvar').onclick = () => {
      const config = getConfig();
      localStorage.setItem('configRenomearAvancado', JSON.stringify(config));
      UI.SuccessMessage('Configuração salva com sucesso.');
    };

    document.getElementById('btnResetar').onclick = () => {
      localStorage.removeItem('configRenomearAvancado');
      document.querySelectorAll('#painelAvancado input[type=checkbox]').forEach(cb => cb.checked = false);
      document.querySelectorAll('#painelAvancado input[type=text], #painelAvancado input[type=number]').forEach(inp => inp.value = '');
      document.getElementById('digitos').value = 2;
      document.getElementById('contadorInicio').value = 1;
      document.getElementById('delay').value = 400;
      document.getElementById('ordem').value = 'asc';
      atualizarPreview(getConfig());
      UI.SuccessMessage('Configuração resetada.');
    };

    const atualizar = () => atualizarPreview(getConfig());

    const configSalva = localStorage.getItem('configRenomearAvancado');
    if (configSalva) {
      try {
        const config = JSON.parse(configSalva);
        document.getElementById('numeracao').checked = config.usarNumeracao;
        document.getElementById('digitos').value = config.digitos;
        document.getElementById('prefixcheck').checked = config.usarPrefixo;
        document.getElementById('prefixbox').value = config.prefixo;
        document.getElementById('textocheck').checked = config.usarTexto;
        document.getElementById('textbox').value = config.textoBase;
        document.getElementById('suffixcheck').checked = config.usarSufixo;
        document.getElementById('suffixbox').value = config.sufixo;
        document.getElementById('contadorInicio').value = config.inicio;
        document.getElementById('delay').value = config.delay;
        document.getElementById('coords').checked = config.incluirCoords;
        document.getElementById('filtercheck').checked = config.filtrar;
        document.getElementById('filtertext').value = config.filtroNome;
        document.getElementById('regexcheck').checked = config.regex;
        document.getElementById('ordem').value = config.ordem;
      } catch (e) {
        console.error('Erro ao restaurar configuração:', e);
      }
    }

    document.querySelectorAll('#painelAvancado input, #painelAvancado select').forEach(el => {
      el.addEventListener('change', atualizar);
      el.addEventListener('input', atualizar);
    });

    atualizar();
  };

  const btn = document.createElement('button');
  btn.textContent = 'Abrir Painel Renomeação';
  btn.style.position = 'fixed';
  btn.style.bottom = '20px';
  btn.style.right = '20px';
  btn.style.zIndex = 9999;
  btn.className = 'btn';
  btn.onclick = () => abrirPainelAvancado();
  document.body.appendChild(btn);
})();
