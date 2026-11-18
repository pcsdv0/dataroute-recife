# Auditoria da base real · DataRoute Recife

Responsável: **F1 (Tech Lead)** · Auditoria feita em 15/11/2026 sobre os 10 CSVs oficiais da CTTU.
Os números abaixo saem de `python -m src.pipeline` (fonte: `docs/metricas_pipeline.json`). **Qualquer número do relatório tem que bater com eles.**

## 1. Fonte

- **Conjunto:** *Chamados de Sinistros (Acidentes) de Trânsito com e sem vítimas 2015 a 2024*. CTTU, Portal de Dados Abertos da Prefeitura do Recife, licença ODbL.
- **Página:** https://dados.recife.pe.gov.br/dataset/acidentes-de-transito-com-e-sem-vitimas
- **Links de cada arquivo:** `src/bronze.py` → `FONTES`.
- **Aviso do próprio portal:** os dados de 2015 começam em junho. A base registra **chamados** e pode divergir dos relatórios anuais de segurança viária da CTTU.

## 2. Volumetria bruta (Bronze)

| Arquivo | Registros | Colunas | Disco (MB) | Memória no pandas (MB) |
|---|---:|---:|---:|---:|
| sinistros_2015.csv | 7.273 | 20 | 1,40 | 7,10 |
| sinistros_2016.csv | 11.263 | 26 | 3,04 | 14,52 |
| sinistros_2017.csv | 11.758 | 25 | 2,96 | 14,37 |
| sinistros_2018.csv | 11.411 | 41 | 3,84 | 20,58 |
| sinistros_2019.csv | 12.062 | 41 | 4,70 | 23,99 |
| sinistros_2020.csv | 4.092 | 38 | 1,45 | 7,53 |
| sinistros_2021.csv | 2.380 | 37 | 0,77 | 4,49 |
| sinistros_2022.csv | 2.669 | 38 | 0,95 | 5,21 |
| sinistros_2023.csv | 4.032 | 37 | 1,09 | 6,77 |
| sinistros_2024.csv | 5.315 | 37 | 1,45 | 8,92 |
| **Total** | **72.255** | **45 (união)** | **21,65** | **113,48** |

> ⚠️ **Volume:** a base de sinistros tem cerca de **72 mil registros**, não "centenas de milhares". Só dá para falar em centenas de milhares se a base de velocidade das vias (fotossensores) for de fato processada. Caso contrário, o relatório tem que trazer o número real.

## 3. Achados (o que a base real tem de diferente do plano)

| # | Achado | Impacto | Tratamento no pipeline |
|---|---|---|---|
| 1 | **Layout muda a cada período.** A coluna "com/sem vítima" se chama `tipo` (2015), `natureza_acidente` (2016–2021) e `natureza` (2022–2024). O tipo de colisão fica na outra coluna. | Ler por nome mistura as duas informações. | A coluna é detectada pelo **conteúdo** e vira `classificacao` + `tipo_acidente` |
| 2 | **Vírgula decimal** a partir de 2022 (`"1,0"`). | Conversão ingênua zera todas as vítimas de 2022–2024. | `_numero()` troca `,` por `.` |
| 3 | **Chamados que não são sinistros:** 11.563 CANCELADA e 455 DUPLICIDADE. | Inflam a contagem em cerca de 17%. | Removidos |
| 4 | **Óbito subnotificado no campo numérico:** `vitimasfatais` não existe em 2015 e está ~99,7% vazio em 2016–2020. | Somar `vitimasfatais` subestima as mortes. | Óbito = classificação "VÍTIMA FATAL" **ou** `vitimasfatais > 0` |
| 5 | **Datas no ano errado:** 32 registros de 29–31/12 no arquivo de 2024 aparecem como 2025. | Cria um "ano 2025" falso. | Devolvidos ao ano do arquivo. É o erro clássico de formatar data com o *ano da semana ISO* (esses dias caem na semana 1 de 2025). |
| 6 | **Hora ausente em 2022** (100% vazia). | O heatmap dia×hora fica sem 2022. | Hora mantida como nulo, nada é descartado. |
| 6b | **Hora ambígua em 2023–2024:** formato de 12 horas sem AM/PM (só existem valores de 01 a 12, nenhum de 13h a 23h). Achado na revisão do F4. | "07:00" pode ser 7h ou 19h. Sem tratamento, a correlação hora×ano dá −0,48 e a madrugada parece menos letal do que é. | As 8.504 horas desses arquivos viram nulo (detecção automática por arquivo). `hora`, `turno` e `horario_pico` são as únicas colunas com nulo permitido no contrato. |
| 7 | **Clima e condição da via** só são confiáveis em 2019–2022: 85–96% dos sinistros válidos preenchidos (75–83% nos arquivos brutos, porque os chamados cancelados quase nunca têm clima). Não existem em 2015–2017, cobrem 19% em 2018 e estão vazios em 2023–2024. | A análise de clima não vale para a série inteira. | A tabela Gold de clima usa só 2019–2022 (`config.ANOS_CLIMA`) e exclui `NAO INFORMADO`: 16.903 sinistros. O texto tem que deixar claro esse recorte. |
| 8 | **Quebra estrutural em jul/2020:** os sinistros SEM vítima caem de 8.104 (2019) para 435 (2021). Coincide com o lançamento do **Bate-Pronto** (17/07/2020), registro online de colisão sem vítima feito pelo próprio cidadão, que não entra nesta base. | Uma série "total de sinistros" mostra uma queda falsa. | Comparação entre anos **só com sinistros COM vítima** (ver tabela 4) |
| 9 | **Grafias de bairro:** 126 grafias brutas viram **92 dos 94 bairros oficiais + NAO INFORMADO** (93 valores). Exemplos: IPESEP→IPSEP, JOANA BEZERRA→ILHA JOANA BEZERRA, SETÚBAL→BOA VIAGEM (Setúbal é localidade, não bairro oficial). Dois nomes de agentes digitados no campo bairro (MARCELO, 2015; FABIO, 2017) viram NAO INFORMADO (achado do F3). Pau-Ferro e Peixinhos, bairros oficiais, não têm nenhuma ocorrência registrada. | Rankings fragmentados. | Remoção de acentos, caixa alta e `CORRECAO_BAIRROS` |
| 10 | **Encoding:** todos os arquivos são UTF-8 com separador `;`. | O plano cita UTF-8 x Latin-1, mas nesta base não houve Latin-1. | O leitor mantém a detecção automática, por robustez. **O relatório não deve afirmar que havia Latin-1.** |

## 4. Antes vs. Depois da Limpeza (quadro oficial da Seção 4)

| Indicador | Antes (Bronze) | Depois (Silver) |
|---|---:|---:|
| Registros (chamados → sinistros) | 72.255 | 60.225 |
| Colunas (união dos layouts → contrato) | 45 | 27 |
| Chamados CANCELADA | 11.563 | 0 |
| Chamados DUPLICIDADE | 455 | 0 |
| Duplicatas exatas | 4 | 0 |
| Chamados que não são sinistro (APOIO, OUTROS…) | 8 | 0 |
| Datas com ano errado (ano-semana ISO) | 32 | 0 (corrigidas) |
| Classificação vazia | 28 | 0 (inferida pelas vítimas) |
| Óbitos só na classificação | 24 | 0 (`vitimasfatais` corrigido) |
| Sinistros com vítima sem contagem de vítimas | 212 | 0 (ajustado para 1) |
| Bairros distintos | 126 | 93 (92 dos 94 oficiais + NAO INFORMADO) |
| Horas ambíguas (formato 12 h, 2023–2024) | 8.504 | nulo |
| Valores nulos | 1.733.304 | 32.838 (só `hora`, `turno` e `horario_pico` de 2022–2024) |

Tempo de execução do pipeline completo: cerca de 4 s (Bronze 0,6 s · Silver 3,0 s · Gold 0,1 s).

**Sinistros com vítima por ano** (série comparável): 2015*: 1.192 · 2016: 1.877 · 2017: 1.981 · 2018: 1.864 · 2019: 2.064 · 2020: 1.614 · 2021: 1.655 · 2022: 1.906 · 2023: 3.054 · 2024: 4.372. (*2015 cobre só jun–dez.)
Na Silver: 24.872 vítimas, das quais 290 fatais.

> ⚠️ **2023–2024:** os sinistros com vítima sobem 60% em 2023 e mais 43% em 2024, enquanto os SEM vítima seguem estáveis em ~480–560 por ano. Antes de chamar isso de "aumento real", F4 e F6 devem tratar a hipótese de mudança no registro (protocolo novo a partir de 2022) como limitação.

## 5. Escala de severidade (UPS)

Unidade Padrão de Severidade, com os pesos do Programa PARE (Ministério dos Transportes, 2002) / DENATRAN:

| Tipo de sinistro | Peso | Registros na Silver |
|---|---:|---:|
| Somente danos materiais (sem vítima) | 1 | 38.646 |
| Com feridos | 4 | 19.567 |
| Com feridos envolvendo pedestre | 6 | 1.736 |
| Com vítima fatal | 13 | 276 |

## 6. Regras para quem analisa (F4/F5)

1. Para comparar anos, use só `classificacao != "SEM VITIMA"`.
2. Clima/via: recorte de 2019–2022, sem `NAO INFORMADO`, e gravidade medida **só entre sinistros com vítima** (a tabela Gold já faz isso). Os dias de chuva se concentram em 2021–2022, depois do Bate-Pronto: comparar todos os sinistros mistura o efeito do clima com a mudança de registro. Resultado: tempo bom/via seca 1,16% com óbito x chuva/via molhada 2,00%, diferença não significativa (p = 0,08).
3. Horário (heatmap, pico, turno): só 2015–2021. 2022 não tem hora e 2023–2024 têm hora ambígua (12 h). Diga isso na legenda.
4. Mortes: use `vitimasfatais` ou `vitima_fatal` da Silver, que já estão corrigidos.
5. Bairros: 93 valores (92 dos 94 oficiais + NAO INFORMADO). Qualquer número diferente indica que a padronização foi pulada.
