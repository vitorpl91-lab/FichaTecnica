/**
 * Sisteminha de Ficha Técnica — Home Burger
 * Backend Google Apps Script (Web App) sobre Google Sheets.
 *
 * Como usar (veja COMO-PUBLICAR.md para o passo a passo completo):
 * 1. Cole o ID da sua planilha em SHEET_ID abaixo.
 * 2. Rode a função configurarPlanilha() uma vez (menu Executar).
 * 3. Publique como Web App (Implantar > Nova implantação > Web App).
 * 4. Cole a URL do Web App no index.html (constante API_BASE_URL).
 */

var SHEET_ID = 'COLE_AQUI_O_ID_DA_SUA_PLANILHA'; // fica na URL, entre /d/ e /edit

var ABA_INSUMOS = 'Insumos';
var ABA_FICHAS = 'FichaTecnica';
var ABA_INGREDIENTES = 'FichaIngredientes';
var ABA_CONFIG = 'Configuracoes';

function getSheet_(nome) {
  return SpreadsheetApp.openById(SHEET_ID).getSheetByName(nome);
}

/** Rode isso UMA VEZ pelo editor do Apps Script (Executar > configurarPlanilha) para criar as abas e cabeçalhos. */
function configurarPlanilha() {
  var ss = SpreadsheetApp.openById(SHEET_ID);

  criarAba_(ss, ABA_INSUMOS, ['ID', 'Nome', 'Unidade', 'Preco', 'FatorCorrecao', 'PesoInicial', 'PesoFinal', 'Atualizado', 'FichaOrigemId']);
  criarAba_(ss, ABA_FICHAS, ['ID', 'Nome', 'PrecoVenda', 'RendimentoQuantidade', 'RendimentoUnidade', 'RendimentoNota', 'InsumoVinculadoId', 'FichaPaiId']);
  criarAba_(ss, ABA_INGREDIENTES, ['ID', 'FichaId', 'InsumoId', 'Quantidade', 'MedidaPratica']);
  criarAba_(ss, ABA_CONFIG, ['Parametro', 'Valor']);

  var configSheet = getSheet_(ABA_CONFIG);
  if (configSheet.getLastRow() < 2) {
    configSheet.getRange(2, 1, 2, 2).setValues([
      ['CUSTO_FIXO_PERCENT', 15],
      ['DESPESA_VARIAVEL_PERCENT', 8]
    ]);
  }

  // Evita que Sheets "corrija" sozinho texto parecido com data/número (ex: IDs, medidas) — força tudo como texto.
  [ABA_INSUMOS, ABA_FICHAS, ABA_INGREDIENTES].forEach(function (nome) {
    var sh = getSheet_(nome);
    var largura = sh.getLastColumn();
    sh.getRange(2, 1, Math.max(sh.getMaxRows() - 1, 1), largura).setNumberFormat('@');
  });

  SpreadsheetApp.flush();
  Logger.log('Planilha configurada com sucesso.');
}

function criarAba_(ss, nome, cabecalho) {
  var sh = ss.getSheetByName(nome);
  if (!sh) {
    sh = ss.insertSheet(nome);
  }
  if (sh.getLastRow() === 0) {
    sh.getRange(1, 1, 1, cabecalho.length).setValues([cabecalho]);
    sh.setFrozenRows(1);
  }
}

/* ================= LEITURA (doGet) ================= */

function doGet(e) {
  var action = e && e.parameter && e.parameter.action;
  var resultado;
  if (action === 'getTudo') {
    resultado = { ok: true, insumos: lerInsumos_(), fichas: lerFichas_(), configuracoes: lerConfiguracoes_() };
  } else {
    resultado = { ok: false, erro: 'Ação desconhecida: ' + action };
  }
  return responder_(resultado);
}

function lerInsumos_() {
  var sh = getSheet_(ABA_INSUMOS);
  var linhas = sh.getDataRange().getValues();
  linhas.shift();
  return linhas.filter(function (l) { return l[0]; }).map(function (l) {
    return {
      id: String(l[0]),
      nome: l[1],
      unidade: l[2],
      preco: Number(l[3]) || 0,
      fc: Number(l[4]) || 1,
      pesoInicial: l[5] === '' ? null : Number(l[5]),
      pesoFinal: l[6] === '' ? null : Number(l[6]),
      atualizado: l[7],
      fichaOrigemId: l[8] ? String(l[8]) : null
    };
  });
}

function lerFichas_() {
  var sh = getSheet_(ABA_FICHAS);
  var linhas = sh.getDataRange().getValues();
  linhas.shift();
  var ingredientesPorFicha = lerIngredientesAgrupados_();
  return linhas.filter(function (l) { return l[0]; }).map(function (l) {
    var id = String(l[0]);
    return {
      id: id,
      nome: l[1],
      precoVenda: Number(l[2]) || 0,
      rendimento: { quantidade: Number(l[3]) || 1, unidade: l[4] || 'un', nota: l[5] || '' },
      insumoVinculadoId: l[6] ? String(l[6]) : null,
      fichaPaiId: l[7] ? String(l[7]) : null,
      ingredientes: ingredientesPorFicha[id] || []
    };
  });
}

function lerIngredientesAgrupados_() {
  var sh = getSheet_(ABA_INGREDIENTES);
  var linhas = sh.getDataRange().getValues();
  linhas.shift();
  var mapa = {};
  linhas.forEach(function (l) {
    if (!l[1]) return;
    var fichaId = String(l[1]);
    if (!mapa[fichaId]) mapa[fichaId] = [];
    mapa[fichaId].push({ insumoId: String(l[2]), quantidade: Number(l[3]) || 0, medida: l[4] || '' });
  });
  return mapa;
}

function lerConfiguracoes_() {
  var sh = getSheet_(ABA_CONFIG);
  var linhas = sh.getDataRange().getValues();
  linhas.shift();
  var cfg = { custoFixoPercent: 15, despesaVariavelPercent: 8 };
  linhas.forEach(function (l) {
    if (l[0] === 'CUSTO_FIXO_PERCENT') cfg.custoFixoPercent = Number(l[1]);
    if (l[0] === 'DESPESA_VARIAVEL_PERCENT') cfg.despesaVariavelPercent = Number(l[1]);
  });
  return cfg;
}

/* ================= ESCRITA (doPost) ================= */

function doPost(e) {
  var body;
  try {
    body = JSON.parse(e.postData.contents);
  } catch (err) {
    return responder_({ ok: false, erro: 'JSON inválido recebido pelo servidor.' });
  }
  if (body.action === 'salvarTudo') {
    return responder_(salvarTudo_(body.payload || {}));
  }
  return responder_({ ok: false, erro: 'Ação desconhecida: ' + body.action });
}

function responder_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

/**
 * Reescreve as abas Insumos, FichaTecnica e FichaIngredientes inteiras a partir
 * do estado atual mandado pelo front-end. Simples e robusto para o volume de
 * dados de uma hamburgueria — a troca é que a planilha não deve ser editada à
 * mão enquanto o app está em uso, porque a próxima gravação sobrescreve tudo.
 */
function salvarTudo_(payload) {
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    escreverInsumos_(payload.insumos || []);
    escreverFichas_(payload.fichas || []);
    if (payload.configuracoes) escreverConfiguracoes_(payload.configuracoes);
    SpreadsheetApp.flush();
    return { ok: true, salvoEm: new Date().toISOString() };
  } catch (err) {
    return { ok: false, erro: String(err) };
  } finally {
    lock.releaseLock();
  }
}

function escreverInsumos_(insumos) {
  var sh = getSheet_(ABA_INSUMOS);
  limparDados_(sh);
  if (!insumos.length) return;
  var linhas = insumos.map(function (i) {
    return [i.id, i.nome, i.unidade, i.preco, i.fc || 1,
      i.pesoInicial == null ? '' : i.pesoInicial,
      i.pesoFinal == null ? '' : i.pesoFinal,
      i.atualizado || '', i.fichaOrigemId || ''];
  });
  sh.getRange(2, 1, linhas.length, linhas[0].length).setNumberFormat('@').setValues(linhas);
}

function escreverFichas_(fichas) {
  var shFichas = getSheet_(ABA_FICHAS);
  var shIngr = getSheet_(ABA_INGREDIENTES);
  limparDados_(shFichas);
  limparDados_(shIngr);
  if (!fichas.length) return;

  var linhasFichas = fichas.map(function (f) {
    var r = f.rendimento || { quantidade: 1, unidade: 'un', nota: '' };
    return [f.id, f.nome, f.precoVenda || 0, r.quantidade || 1, r.unidade || 'un', r.nota || '', f.insumoVinculadoId || '', f.fichaPaiId || ''];
  });
  shFichas.getRange(2, 1, linhasFichas.length, linhasFichas[0].length).setNumberFormat('@').setValues(linhasFichas);

  var linhasIngr = [];
  fichas.forEach(function (f) {
    (f.ingredientes || []).forEach(function (ing, idx) {
      linhasIngr.push([f.id + '-' + idx, f.id, ing.insumoId, ing.quantidade, ing.medida || '']);
    });
  });
  if (linhasIngr.length) {
    shIngr.getRange(2, 1, linhasIngr.length, linhasIngr[0].length).setNumberFormat('@').setValues(linhasIngr);
  }
}

function escreverConfiguracoes_(cfg) {
  var sh = getSheet_(ABA_CONFIG);
  limparDados_(sh);
  sh.getRange(2, 1, 2, 2).setValues([
    ['CUSTO_FIXO_PERCENT', cfg.custoFixoPercent != null ? cfg.custoFixoPercent : 15],
    ['DESPESA_VARIAVEL_PERCENT', cfg.despesaVariavelPercent != null ? cfg.despesaVariavelPercent : 8]
  ]);
}

function limparDados_(sh) {
  var last = sh.getLastRow();
  if (last > 1) sh.getRange(2, 1, last - 1, sh.getLastColumn()).clearContent();
}
