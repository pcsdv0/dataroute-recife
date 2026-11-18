// Relatório técnico final — DataRoute Recife (ABNT, A4, Arial 12, 1,5)
const fs = require("fs");
const path = require("path");
const {
  Document, Packer, Paragraph, TextRun, ImageRun, Table, TableRow, TableCell,
  AlignmentType, WidthType, BorderStyle, ShadingType, Header, PageNumber,
  LevelFormat, HeadingLevel, LineRuleType,
} = require("docx");

const FIG = path.join(__dirname, "..", "figuras");
const ARIAL = "Arial";
const CM = 567;                       // 1 cm em DXA
const LARGURA_TEXTO = 9071;           // 21 cm - 3 cm - 2 cm = 16 cm

// ---------- helpers de texto ----------
function runs(texto, base = {}) {
  // **negrito** e _itálico_ simples
  const out = [];
  texto.replace(/`/g, "").split(/(\*\*[^*]+\*\*|~[^~]+~)/g).filter(Boolean).forEach((t) => {
    if (t.startsWith("**")) out.push(new TextRun({ text: t.slice(2, -2), bold: true, font: ARIAL, ...base }));
    else if (t.startsWith("~") && t.endsWith("~") && t.length > 2) out.push(new TextRun({ text: t.slice(1, -1), italics: true, font: ARIAL, ...base }));
    else out.push(new TextRun({ text: t, font: ARIAL, ...base }));
  });
  return out;
}
const P = (texto, o = {}) => new Paragraph({
  children: runs(texto),
  alignment: o.align ?? AlignmentType.JUSTIFIED,
  indent: o.semRecuo ? undefined : { firstLine: Math.round(1.25 * CM) },
  spacing: { line: 360, before: 0, after: o.after ?? 0 },
  keepNext: o.keepNext,
});
const H1 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun({ text: t, bold: true, font: ARIAL, size: 24 })] });
const H2 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun({ text: t, bold: true, font: ARIAL, size: 24 })] });
const CENTRO = (t, o = {}) => new Paragraph({
  alignment: AlignmentType.CENTER, spacing: { line: o.line ?? 360, after: o.after ?? 0, before: o.before ?? 0 },
  children: runs(t, o.bold ? { size: o.size ?? 24, bold: true } : { size: o.size ?? 24 }),
});
const LEGENDA = (t) => new Paragraph({
  alignment: AlignmentType.CENTER, keepNext: true, spacing: { line: 240, before: 160, after: 80 },
  children: runs(t, { size: 20 }),
});
const FONTE = (t = "Fonte: Elaborado pelos autores (2026), com dados da CTTU/Portal de Dados Abertos do Recife.") => new Paragraph({
  alignment: AlignmentType.LEFT, spacing: { line: 240, before: 60, after: 160 },
  children: runs(t, { size: 20 }),
});
const ITEM = (t) => new Paragraph({
  numbering: { reference: "itens", level: 0 }, alignment: AlignmentType.JUSTIFIED,
  spacing: { line: 360 }, children: runs(t),
});
const ALINEA = (letra, t) => new Paragraph({
  alignment: AlignmentType.JUSTIFIED, spacing: { line: 360 },
  indent: { left: Math.round(1.25 * CM), hanging: 400 }, children: runs(`${letra}) ${t}`),
});
const REF = (t) => new Paragraph({ alignment: AlignmentType.LEFT, spacing: { line: 240, after: 200 }, children: runs(t) });

function figura(arquivo, larguraPx) {
  const buf = fs.readFileSync(path.join(FIG, arquivo));
  const w = buf.readUInt32BE(16), h = buf.readUInt32BE(20);   // PNG IHDR
  const altura = Math.round(larguraPx * h / w);
  return new Paragraph({
    alignment: AlignmentType.CENTER, keepNext: true, spacing: { before: 0, after: 0, line: 240, lineRule: LineRuleType.AUTO },
    children: [new ImageRun({ type: "png", data: buf, transformation: { width: larguraPx, height: altura } })],
  });
}

// ---------- tabelas ----------
const borda = { style: BorderStyle.SINGLE, size: 4, color: "000000" };
const bordas = { top: borda, bottom: borda, left: borda, right: borda };
function tabela(cabecalho, linhas, larguras, o = {}) {
  const total = larguras.reduce((a, b) => a + b, 0);
  const cel = (txt, i, cab, destaque) => new TableCell({
    borders: bordas, width: { size: larguras[i], type: WidthType.DXA },
    shading: cab ? { fill: "D9D9D9", type: ShadingType.CLEAR, color: "auto" } : (destaque ? { fill: "F2F2F2", type: ShadingType.CLEAR, color: "auto" } : undefined),
    margins: { top: 40, bottom: 40, left: 80, right: 80 },
    children: [new Paragraph({
      alignment: (i === 0 || o.esquerda?.includes(i)) ? AlignmentType.LEFT : AlignmentType.CENTER,
      spacing: { line: 240 },
      children: runs(String(txt), { size: 20, bold: cab || destaque }),
    })],
  });
  return new Table({
    width: { size: total, type: WidthType.DXA }, columnWidths: larguras,
    alignment: AlignmentType.CENTER,
    rows: [
      new TableRow({ tableHeader: true, children: cabecalho.map((t, i) => cel(t, i, true)) }),
      ...linhas.map((l, k) => new TableRow({ children: l.map((t, i) => cel(t, i, false, o.ultimaDestaque && k === linhas.length - 1)) })),
    ],
  });
}

// =====================================================================
const c = [];

// ---------- IDENTIFICAÇÃO INSTITUCIONAL ----------
c.push(CENTRO("**CENTRO UNIVERSITÁRIO MAURÍCIO DE NASSAU — UNINASSAU**", { line: 276 }));
c.push(CENTRO("UNIDADE RECIFE/OLINDA", { line: 276 }));
c.push(CENTRO("BACHARELADO EM SISTEMAS DE INFORMAÇÃO — 6º PERÍODO NOTURNO", { line: 276 }));
c.push(CENTRO("DISCIPLINA: BIG DATA — DOCENTE: PROF. EDUARDO HERNANDES", { line: 276, after: 240 }));
c.push(CENTRO("**MOBILIDADE URBANA, SINISTROS DE TRÂNSITO E TRANSPORTE METROPOLITANO NO RECIFE: ANÁLISE DE PADRÕES ESPAÇO-TEMPORAIS, FLUXO VIÁRIO E GARGALOS OPERACIONAIS VIA BIG DATA**", { line: 276, after: 240 }));
c.push(CENTRO("Grupo DataRoute Recife", { line: 276, size: 22 }));
c.push(CENTRO("Paulo César Santos de Vasconcelos (F1) · Bruno Vinicius (F2) · Wagner (F3) · Lucy (F4) · Thomas (F5) · Douglas (F6)", { line: 276, size: 22 }));
c.push(CENTRO("Repositório: github.com/pcsdv0/dataroute-recife", { line: 276, size: 22 }));
c.push(CENTRO("Recife, 18 de novembro de 2026", { line: 276, size: 22, after: 360 }));

// ---------- 1 INTRODUÇÃO ----------
c.push(H1("1 INTRODUÇÃO"));
c.push(P("Os corredores arteriais do Recife, como as avenidas Agamenon Magalhães, Mascarenhas de Morais, Abdias de Carvalho, Recife e Caxangá, concentram parte expressiva dos sinistros de trânsito atendidos pela Autarquia de Trânsito e Transporte Urbano do Recife (CTTU). Motociclistas, pedestres e ciclistas são os grupos mais expostos, e a retenção nos horários de pico afeta a circulação de toda a Região Metropolitana."));
c.push(P("A Prefeitura publica esses atendimentos no Portal de Dados Abertos do Recife, em dez arquivos anuais que cobrem de junho de 2015 a dezembro de 2024 (RECIFE, 2026). Os dados, porém, não estão prontos para orientar decisões: os arquivos têm três layouts diferentes, misturam chamados cancelados e duplicados com ocorrências reais e apresentam falhas de preenchimento que mudam de um ano para outro."));
c.push(P("Este trabalho aplica técnicas de Big Data para transformar esse material em informação acionável. Um pipeline em Python, organizado em camadas Bronze, Silver e Gold, processou 72.255 chamados e chegou a 60.225 sinistros válidos, dos quais 21.579 tiveram vítima. Ao todo, foram 24.872 vítimas e 290 óbitos registrados."));

// ---------- 2 OBJETIVOS ----------
c.push(H1("2 OBJETIVOS"));
c.push(H2("2.1 Objetivo geral"));
c.push(P("Transformar os chamados de sinistros de trânsito da CTTU de 2015 a 2024 em informação acionável sobre onde, quando e em que condições ocorrem os sinistros mais graves no Recife, por meio de um pipeline de dados reprodutível."));
c.push(H2("2.2 Objetivos específicos"));
c.push(ALINEA("a", "**Onde:** identificar os 10 bairros e os 5 corredores arteriais com maior concentração de sinistros e de severidade, medida pela Unidade Padrão de Severidade (UPS)."));
c.push(ALINEA("b", "**Quando:** medir a evolução dos sinistros com vítima entre 2015 e 2024 e sua distribuição por dia da semana e faixa horária, com a letalidade de cada período."));
c.push(ALINEA("c", "**Quem:** quantificar a vulnerabilidade por modal (moto, automóvel, pedestre, ciclista, ônibus e caminhão) e por tipo de sinistro."));
c.push(ALINEA("d", "**Em que condições:** avaliar se o clima e a condição da via alteram a letalidade dos sinistros com vítima no período de 2019 a 2022."));

// ---------- 3 FUNDAMENTAÇÃO TEÓRICA ----------
c.push(H1("3 FUNDAMENTAÇÃO TEÓRICA"));
c.push(H2("3.1 Big Data e os 5 Vs aplicados aos dados da CTTU"));
c.push(P("Laney (2001) caracterizou os desafios de dados em três dimensões: volume, velocidade e variedade. Demchenko ~et al.~ (2013) ampliaram o modelo para cinco dimensões, acrescentando veracidade e valor. A seguir, cada dimensão é relacionada aos dados deste projeto."));
c.push(ITEM("**Volume:** 10 arquivos com 72.255 registros, 21,7 MB em disco e 113 MB em memória. É um volume moderado, mas a arquitetura foi desenhada para crescer (por exemplo, com os fotossensores de velocidade) sem mudar o código das camadas."));
c.push(ITEM("**Velocidade:** a CTTU publica os dados em lotes anuais, e cada chamado tem data e hora. O pipeline completo roda em cerca de 4 segundos, o que permite reprocessar toda a série a cada nova publicação."));
c.push(ITEM("**Variedade:** três layouts anuais, com 20 a 41 colunas (45 na união), combinando contagens numéricas, categorias (clima, via, semáforo), texto livre (endereço) e campos de data e hora."));
c.push(ITEM("**Veracidade:** foi o maior desafio do projeto. A base tinha 11.563 chamados cancelados e 455 duplicados, 126 grafias para os bairros, vírgula decimal a partir de 2022, datas gravadas no ano errado e horários ambíguos, todos tratados na Seção 4."));
c.push(ITEM("**Valor:** identificar os locais, horários e grupos de maior letalidade para orientar a fiscalização preventiva e a política de segurança viária."));
c.push(H2("3.2 Engenharia de dados e arquitetura Medalhão"));
c.push(P("O processo de extração, transformação e carga (ETL) organiza a passagem dos dados brutos para estruturas prontas para análise (KIMBALL; CASERTA, 2004). Na variante ELT, os dados são carregados antes de serem transformados. A arquitetura Medalhão aplica essa ideia em camadas de qualidade crescente: bruta (Bronze), validada (Silver) e agregada para consumo (Gold) (DATABRICKS, 2026). Cada camada só lê a anterior, o que garante rastreabilidade até a fonte."));
c.push(H2("3.3 Medida de severidade (UPS)"));
c.push(P("Para comparar locais com perfis diferentes, adotou-se a Unidade Padrão de Severidade do Programa PARE (BRASIL, 2002). Ela atribui peso 1 ao sinistro só com danos materiais, 4 ao sinistro com feridos, 6 ao sinistro com feridos envolvendo pedestre e 13 ao sinistro com vítima fatal."));

// ---------- 4 METODOLOGIA ----------
c.push(H1("4 METODOLOGIA / PIPELINE DE DADOS"));
c.push(H2("4.1 Arquitetura do pipeline"));
c.push(P("O processamento segue a Arquitetura Medalhão Adaptada (Figura 1). Cada camada tem uma pasta no repositório e um responsável na equipe. O módulo `src/pipeline.py` executa as três camadas em sequência com um único comando (`python -m src.pipeline`) e, ao fim de cada uma, valida a saída contra um contrato de dados: colunas obrigatórias, tipos, categorias válidas, escala UPS e ausência de nulos não tratados. Todos os caminhos são relativos à raiz do repositório (biblioteca `pathlib`), o que permite rodar o projeto em qualquer máquina e no Google Colab."));
c.push(LEGENDA("**Figura 1 – Arquitetura Medalhão Adaptada do pipeline DataRoute Recife**"));
c.push(figura("fig00_arquitetura_pipeline.png", 340));
c.push(FONTE("Fonte: Elaborado pelos autores (2026)."));
c.push(H2("4.2 Fontes de dados e volumetria (Camada Bronze)"));
c.push(P("A fonte é o conjunto ~Chamados de sinistros (acidentes) de trânsito com e sem vítimas 2015 a 2024~, da CTTU (RECIFE, 2026), sob licença ODbL. Os arquivos foram versionados em `data/raw` como cópias idênticas às do portal (Tabela 1). Todos usam codificação UTF-8 e separador ponto e vírgula."));
c.push(LEGENDA("**Tabela 1 – Volumetria bruta dos arquivos da CTTU**"));
c.push(tabela(["Ano", "Registros", "Colunas", "MB", "Ano", "Registros", "Colunas", "MB"], [
  ["2015¹", "7.273", "20", "1,40", "2020", "4.092", "38", "1,45"],
  ["2016", "11.263", "26", "3,04", "2021", "2.380", "37", "0,77"],
  ["2017", "11.758", "25", "2,96", "2022", "2.669", "38", "0,95"],
  ["2018", "11.411", "41", "3,84", "2023", "4.032", "37", "1,09"],
  ["2019", "12.062", "41", "4,70", "2024", "5.315", "37", "1,45"],
  ["Total", "72.255", "45²", "21,65", "", "", "", ""],
], [1000, 1300, 1000, 1235, 1000, 1300, 1000, 1236], { ultimaDestaque: true }));
c.push(FONTE("Fonte: Elaborado pelos autores (2026), com dados da CTTU/Portal de Dados Abertos do Recife. ¹Junho a dezembro. ²Colunas na união dos layouts."));

c.push(P("O dicionário completo, com as 340 variáveis dos 10 arquivos, está em `docs/dicionario_dados_bronze.csv`. O Quadro 1 resume as variáveis da base limpa usadas na análise."));
c.push(LEGENDA("**Quadro 1 – Dicionário resumido das variáveis da base limpa (Silver)**"));
c.push(tabela(["Variável", "Tipo", "Descrição"], [
  ["data, ano, mes, dia_semana", "data / inteiro / texto", "Data do sinistro e partes derivadas"],
  ["hora, turno, horario_pico", "inteiro / texto / lógico", "Hora (0–23), turno e pico (6h–8h59 e 17h–19h59); válidos em 2015–2021"],
  ["bairro, endereco", "texto", "92 dos 94 bairros oficiais + NAO INFORMADO; logradouro"],
  ["classificacao", "texto", "SEM VITIMA, COM VITIMA ou VITIMA FATAL"],
  ["tipo_acidente", "texto", "Colisão, atropelamento, colisão com ciclista etc."],
  ["auto, moto, ciclista, pedestre, onibus, caminhao, ciclom", "inteiro", "Quantidade de cada modal envolvido"],
  ["vitimas, vitimasfatais, vitima_fatal", "inteiro / lógico", "Vítimas, óbitos e indicador de sinistro com óbito"],
  ["indice_severidade", "inteiro", "UPS: 1, 4, 6 ou 13"],
  ["tempo_clima, condicao_via", "texto", "Clima e condição da via; consistentes em 2019–2022"],
], [3100, 2100, 3871], { esquerda: [2] }));
c.push(FONTE());
c.push(H2("4.3 Limpeza e Feature Engineering (Camada Silver)"));
c.push(P("A Camada Silver aplica regras de higienização definidas a partir de uma auditoria da base real, cada uma contabilizada automaticamente pelo pipeline:"));
c.push(ITEM("**Harmonização de layouts:** a coluna que indica se houve vítima muda de nome (`tipo` em 2015, `natureza_acidente` em 2016–2021 e `natureza` em 2022–2024) e é identificada pelo conteúdo dos registros, e não pelo nome."));
c.push(ITEM("**Chamados que não são sinistros:** remoção de chamados cancelados, duplicados e de apoio."));
c.push(ITEM("**Números e datas:** conversão da vírgula decimal adotada a partir de 2022 e correção de 32 registros de 29 a 31/12/2024 gravados como 2025, padrão típico de formatação pelo \"ano da semana\" ISO."));
c.push(ITEM("**Horário:** 2022 não tem hora, e em 2023–2024 a hora vem no formato de 12 horas sem AM/PM (só existem valores de 1 a 12). Essas 8.504 horas ambíguas foram tratadas como ausentes."));
c.push(ITEM("**Óbitos:** o campo `vitimasfatais` está quase vazio em 2016–2020, então o óbito é derivado da classificação \"VÍTIMA FATAL\" ou do campo numérico."));
c.push(ITEM("**Bairros:** remoção de acentos, caixa alta e correção de grafias (IPESEP para IPSEP, SETÚBAL para BOA VIAGEM, nomes de agentes digitados no campo bairro para NAO INFORMADO)."));
c.push(ITEM("**Variáveis derivadas:** ano, mês, dia da semana, turno, horário de pico e índice de severidade (UPS)."));
c.push(LEGENDA("**Tabela 2 – Antes vs. Depois da Limpeza**"));
c.push(tabela(["Indicador", "Antes (Bronze)", "Depois (Silver)"], [
  ["Registros (chamados → sinistros)", "72.255", "60.225"],
  ["Colunas (união dos layouts → contrato)", "45", "27"],
  ["Chamados cancelados", "11.563", "0"],
  ["Chamados duplicados (DUPLICIDADE)", "455", "0"],
  ["Duplicatas exatas", "4", "0"],
  ["Chamados que não são sinistro (APOIO, OUTROS)", "8", "0"],
  ["Datas com ano errado (ano da semana ISO)", "32", "0 (corrigidas)"],
  ["Horas ambíguas (formato 12 h, 2023–2024)", "8.504", "tratadas como nulo"],
  ["Classificação vazia", "28", "0 (inferida pelas vítimas)"],
  ["Óbitos só na classificação", "24", "0 (campo corrigido)"],
  ["Sinistros com vítima sem contagem de vítimas", "212", "0 (ajustado para 1)"],
  ["Bairros distintos", "126", "93 (92 oficiais + NAO INFORMADO)"],
  ["Valores nulos", "1.733.304", "32.838 (só hora, turno e pico)"],
], [4671, 2000, 2400]));
c.push(FONTE());
c.push(H2("4.4 Agregações analíticas (Camada Gold)"));
c.push(P("A Camada Gold gera cinco tabelas, uma por gráfico da Seção 6 (série temporal, bairros, dia × hora, modais e clima × via). As métricas de cada execução ficam em `docs/metricas_pipeline.json`, fonte de todos os números deste relatório."));

// ---------- 5 FERRAMENTAS ----------
c.push(H1("5 FERRAMENTAS UTILIZADAS"));
c.push(P("O Quadro 2 apresenta a stack do projeto, registrada no arquivo `requirements.txt` do repositório."));
c.push(LEGENDA("**Quadro 2 – Ferramentas utilizadas no projeto**"));
c.push(tabela(["Ferramenta", "Uso no projeto"], [
  ["Python 3.10+", "Linguagem de todo o pipeline e das análises"],
  ["Pandas e NumPy", "Ingestão, limpeza, Feature Engineering e agregações"],
  ["SciPy", "Testes estatísticos (qui-quadrado, Spearman, Mann-Whitney, intervalos de Wilson)"],
  ["Matplotlib e Seaborn", "Gráficos definitivos em 300 DPI"],
  ["PySpark", "Avaliado para processamento distribuído; dispensável no volume atual (113 MB em memória)"],
  ["Google Colab e Jupyter", "Notebooks de cada camada, executáveis sem instalação local"],
  ["Git e GitHub", "Versionamento, revisão por Pull Request e reprodutibilidade"],
], [2800, 6271], { esquerda: [1] }));
c.push(FONTE("Fonte: Elaborado pelos autores (2026)."));

// ---------- 6 RESULTADOS ----------
c.push(H1("6 RESULTADOS OBTIDOS"));
c.push(H2("6.1 Evolução temporal"));
c.push(P("Para comparar anos, a análise usa só sinistros com vítima: a partir de julho de 2020, a CTTU passou a registrar colisões sem vítima pelo Bate-Pronto, um sistema online (DIARIO DE PERNAMBUCO, 2020). Com isso, os sinistros sem vítima caem de 8.104 em 2019 para 435 em 2021 nesta base (Figura 2)."));
c.push(LEGENDA("**Figura 2 – Sinistros com vítima por mês no Recife (jun./2015 a dez./2024)**"));
c.push(figura("fig01_serie_temporal.png", 500));
c.push(FONTE());
c.push(P("A série cresce (Spearman ρ = 0,39; p < 0,001), mas o crescimento se concentra em 2023–2024. Nesses anos o volume mensal é 2,09 vezes o de 2021–2022 (p < 0,001), enquanto os óbitos sobem 1,41 vez, sem significância estatística (p = 0,08). A letalidade cai de 1,73 óbito por 100 vítimas em 2015 para 0,83 em 2024. Esse padrão sugere que parte do salto vem de mudança no registro, e não de uma piora equivalente da segurança viária. Em 2020, a queda de 21,8% no volume mensal é compatível com a menor circulação durante a pandemia."));
c.push(H2("6.2 Dia da semana e horário"));
c.push(P("Os sinistros não se distribuem igualmente na semana (χ² = 495,1; p < 0,001): cada dia útil concentra de 14,9% a 16,0% dos sinistros com vítima, contra 9,7% no domingo. A Figura 3 mostra que o volume se concentra entre 7h e 18h nos dias úteis, com pico às 8h."));
c.push(LEGENDA("**Figura 3 – Sinistros por dia da semana e hora do dia (2015–2021)**"));
c.push(figura("fig03_heatmap_dia_hora.png", 520));
c.push(FONTE());
c.push(P("A gravidade segue o caminho inverso do volume (Tabela 3). A madrugada responde por só 5,1% dos sinistros com vítima, mas 6,77% deles têm óbito, cerca de 6,7 vezes a proporção da manhã. É a associação mais forte entre as variáveis de tempo (V de Cramér = 0,10; p < 0,001)."));
c.push(LEGENDA("**Tabela 3 – Sinistros com vítima e letalidade por período do dia (2015–2021)**"));
c.push(tabela(["Período", "Sinistros com vítima", "% do total", "% com óbito", "IC 95%"], [
  ["Madrugada (0h–5h)", "620", "5,1", "6,77", "5,05–9,03"],
  ["Manhã (6h–11h)", "4.127", "33,7", "1,02", "0,75–1,37"],
  ["Tarde (12h–17h)", "4.470", "36,6", "1,07", "0,81–1,42"],
  ["Noite (18h–23h)", "3.012", "24,6", "1,99", "1,55–2,56"],
], [2671, 1900, 1400, 1500, 1600]));
c.push(FONTE());
c.push(H2("6.3 Bairros e corredores críticos"));
c.push(P("Os 10 bairros da Figura 4 concentram 42,5% dos sinistros com vítima, e 34 dos 93 valores de bairro somam 80% deles. Boa Viagem lidera com folga, com 7.392 sinistros e 14.254 UPS. A letalidade entre esses 10 bairros, porém, não difere estatisticamente (χ² = 6,20; p = 0,72). O ranking mede volume, não risco, porque não há dados de população nem de fluxo de veículos por bairro."));
c.push(LEGENDA("**Figura 4 – Top 10 bairros por severidade acumulada (UPS, 2015–2024)**"));
c.push(figura("fig02_top10_bairros.png", 380));
c.push(FONTE());
c.push(P("Os cinco corredores arteriais somam 3.566 sinistros com vítima, 16,5% do total da cidade (Tabela 4). A Agamenon Magalhães tem o maior volume, mas letalidade abaixo da média. Já a Av. Recife (2,30%) e a Abdias de Carvalho (2,25%) chegam perto do dobro da média da cidade (1,28%). A letalidade varia entre os corredores e as demais vias de forma pequena, porém significativa (χ²; p = 0,024)."));
c.push(LEGENDA("**Tabela 4 – Sinistros com vítima nos corredores arteriais (2015–2024)**"));
c.push(tabela(["Corredor", "Sinistros com vítima", "Óbitos", "% com óbito", "IC 95%"], [
  ["Av. Agamenon Magalhães", "921", "10", "1,09", "0,59–1,99"],
  ["Av. Caxangá", "839", "16", "1,91", "1,18–3,08"],
  ["Av. Mascarenhas de Morais", "751", "12", "1,60", "0,92–2,77"],
  ["Av. Recife", "610", "14", "2,30", "1,37–3,82"],
  ["Av. Abdias de Carvalho", "445", "13", "2,25", "1,23–4,09"],
], [3171, 1900, 1200, 1300, 1500]));
c.push(FONTE());
c.push(H2("6.4 Vulnerabilidade por modal e tipo de sinistro"));
c.push(P("A Figura 5 separa o volume de vítimas da letalidade. As motos estão no maior número de vítimas (18.756), e 77,3% dos sinistros com moto têm vítima. Os pedestres, porém, são os mais vulneráveis: 98,5% dos sinistros com pedestre têm vítima, com 46,0 óbitos por mil sinistros, seguidos dos ciclistas (22,9 por mil). Para comparação, nos sinistros com automóvel a taxa é de 2,4 por mil."));
c.push(LEGENDA("**Figura 5 – Vítimas e letalidade por modal envolvido (2015–2024)**"));
c.push(figura("fig04_modais_vitimas.png", 540));
c.push(FONTE());
c.push(P("O tipo de sinistro confirma esse padrão (V de Cramér = 0,10; p < 0,001). Nos atropelamentos, 4,25% dos sinistros com vítima têm óbito (IC 95%: 3,23–5,57), e nas colisões com ciclista, 2,62%. Na colisão traseira, a proporção é de 0,23%, cerca de 19 vezes menor que no atropelamento. Já o número de vítimas por sinistro não se relaciona com o óbito (|ρ| ≤ 0,03): a gravidade depende de quem está exposto, não de quantos estão envolvidos."));
c.push(H2("6.5 Clima e condição da via"));
c.push(P("Clima e condição da via só são registrados de forma consistente em 2019–2022. Nesse período, os dias de chuva se concentram em 2021–2022, quando o Bate-Pronto já tinha tirado quase todos os sinistros sem vítima da base. Por isso, a comparação usa só os 6.870 sinistros com vítima (Figura 6)."));
c.push(LEGENDA("**Figura 6 – Sinistros com vítima que tiveram óbito, por clima e condição da via (2019–2022)**"));
c.push(figura("fig05_clima_via_severidade.png", 430));
c.push(FONTE());
c.push(P("Com chuva e via molhada, 2,00% dos sinistros com vítima tiveram óbito, contra 1,16% com tempo bom e via seca. A diferença não é estatisticamente significativa (p = 0,08), e a severidade média é praticamente igual (4,34 contra 4,31 UPS; Mann-Whitney, p = 0,37). Comparados dentro de cada ano, os sinistros com chuva também não mostram gravidade maior de forma consistente. Assim, nesta base, não há evidência de que o clima explique a gravidade dos sinistros."));

// ---------- 7 DISCUSSÃO E LIMITAÇÕES ----------
c.push(H1("7 DISCUSSÃO E LIMITAÇÕES"));
c.push(P("Os resultados respondem aos quatro objetivos: o volume se concentra em poucos bairros e corredores, mas a letalidade é maior na Av. Recife e na Abdias de Carvalho; o pico de volume ocorre às 8h dos dias úteis, e a madrugada é o período mais letal; pedestres e ciclistas são os mais vulneráveis, e as motos somam mais vítimas; o clima não mostrou efeito significativo."));
c.push(P("O principal desafio de engenharia foi a veracidade dos dados abertos: três layouts, vírgula decimal, chamados que não eram sinistros, datas no ano errado e horários em formato de 12 horas. Essas falhas só apareceram porque cada camada foi validada contra os dados reais, e cada correção ficou registrada no pipeline. As principais limitações são:"));
c.push(ITEM("**Subnotificação de sinistros sem vítima:** desde julho de 2020, esses sinistros são registrados pelo Bate-Pronto e quase não aparecem na base. Por isso, toda comparação entre anos usa só sinistros com vítima."));
c.push(ITEM("**Falhas de preenchimento manual:** a hora falta em 2022 e é ambígua em 2023–2024 (8.504 registros), clima e via só existem de forma consistente em 2019–2022, e o campo de óbitos está quase vazio em 2016–2020."));
c.push(ITEM("**Recorte temporal e de fonte:** 2015 começa em junho, a base registra chamados (e pode divergir dos relatórios anuais da CTTU) e óbitos ocorridos depois do atendimento não entram."));
c.push(ITEM("**Volume, não risco:** sem dados de população e de fluxo de veículos por bairro e por corredor, os rankings indicam concentração, e não taxa de risco."));
c.push(ITEM("**Bases não integradas:** os sinistros têm endereço em texto, e os fotossensores de velocidade têm coordenadas. O cruzamento exige geocodificação, que fica como trabalho futuro."));

// ---------- 8 CONCLUSÃO ----------
c.push(H1("8 CONCLUSÃO"));
c.push(P("O projeto entregou um pipeline reprodutível que transforma 72.255 chamados da CTTU em 60.225 sinistros auditados e em indicadores sobre onde, quando e com quem ocorrem os sinistros mais graves no Recife. O valor gerado está em separar volume de gravidade: os locais e horários com mais sinistros não são os mais letais. Para a gestão viária do Recife, os resultados indicam quatro recomendações:"));
c.push(ALINEA("a", "Fiscalização de velocidade à noite e de madrugada, período em que a proporção de sinistros com óbito chega a 6,77%, com prioridade para a Av. Recife e a Abdias de Carvalho."));
c.push(ALINEA("b", "Travessias seguras e redução de velocidade em áreas de pedestres e ciclistas, grupos com 46,0 e 22,9 óbitos por mil sinistros."));
c.push(ALINEA("c", "Ações dirigidas a motociclistas, presentes nos sinistros com o maior número de vítimas (18.756)."));
c.push(ALINEA("d", "Qualidade de dados: registrar a hora no formato de 24 horas, manter os campos de clima e via e integrar o Bate-Pronto à base aberta."));
c.push(P("Como trabalhos futuros, propõem-se geocodificar os endereços para cruzá-los com os fotossensores de velocidade, incorporar os registros do Bate-Pronto, calcular taxas de risco com dados de população e fluxo, e automatizar a ingestão pela API do portal."));

// ---------- REFERÊNCIAS ----------
c.push(H1("REFERÊNCIAS"));
[
  "BRASIL. Ministério dos Transportes. **Programa PARE**: procedimentos para o tratamento de locais críticos de acidentes de trânsito. Brasília, DF: Ministério dos Transportes, 2002.",
  "DATABRICKS. **What is the medallion lakehouse architecture?** San Francisco: Databricks, 2026. Disponível em: https://docs.databricks.com/aws/en/lakehouse/medallion. Acesso em: 18 nov. 2026.",
  "DEMCHENKO, Y.; GROSSO, P.; DE LAAT, C.; MEMBREY, P. Addressing big data issues in Scientific Data Infrastructure. ~In~: INTERNATIONAL CONFERENCE ON COLLABORATION TECHNOLOGIES AND SYSTEMS (CTS), 2013, San Diego. **Proceedings** [...]. Piscataway: IEEE, 2013. p. 48-55.",
  "DIARIO DE PERNAMBUCO. CTTU lança Bate-Pronto, sistema de registro eletrônico para acidente de trânsito sem vítima. **Diario de Pernambuco**, Recife, 14 jul. 2020. Disponível em: https://www.diariodepernambuco.com.br/noticia/vidaurbana/2020/07/cttu-lanca-bate-pronto-sistema-de-registro-eletronico-para-acidente.html. Acesso em: 18 nov. 2026.",
  "KIMBALL, R.; CASERTA, J. **The data warehouse ETL toolkit**: practical techniques for extracting, cleaning, conforming, and delivering data. Indianapolis: Wiley, 2004.",
  "LANEY, D. **3-D data management**: controlling data volume, velocity and variety. Stamford: META Group, 2001.",
  "RECIFE. Autarquia de Trânsito e Transporte Urbano do Recife (CTTU). **Chamados de sinistros (acidentes) de trânsito com e sem vítimas 2015 a 2024**. Recife: Portal de Dados Abertos da Prefeitura do Recife, 2026. Disponível em: https://dados.recife.pe.gov.br/dataset/acidentes-de-transito-com-e-sem-vitimas. Acesso em: 15 nov. 2026.",
].forEach((r) => c.push(REF(r)));

// =====================================================================
const doc = new Document({
  creator: "Grupo DataRoute Recife",
  title: "Projeto Final Big Data — DataRoute Recife",
  styles: {
    default: { document: { run: { font: ARIAL, size: 24 } } },
    paragraphStyles: [
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { font: ARIAL, size: 24, bold: true },
        paragraph: { spacing: { before: 240, after: 120, line: 360 }, keepNext: true, keepLines: true, outlineLevel: 0 } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { font: ARIAL, size: 24, bold: true },
        paragraph: { spacing: { before: 200, after: 60, line: 360 }, keepNext: true, keepLines: true, outlineLevel: 1 } },
    ],
  },
  numbering: { config: [{ reference: "itens", levels: [{ level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT,
    style: { paragraph: { indent: { left: Math.round(1.25 * CM) + 360, hanging: 360 } } } }] }] },
  sections: [{
    properties: { page: { size: { width: 11906, height: 16838 },
      margin: { top: 3 * CM, left: 3 * CM, bottom: 2 * CM, right: 2 * CM, header: Math.round(1.5 * CM) } } },
    headers: { default: new Header({ children: [new Paragraph({ alignment: AlignmentType.RIGHT,
      children: [new TextRun({ children: [PageNumber.CURRENT], font: ARIAL, size: 20 })] })] }) },
    children: c,
  }],
});
const saida = path.join(__dirname, "Projeto_Final_BigData_DataRoute_Recife.docx");
Packer.toBuffer(doc).then((b) => { fs.writeFileSync(saida, b); console.log("ok", saida); });
