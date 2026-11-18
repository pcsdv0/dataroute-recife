# DataRoute Recife — Roteiro de falas da apresentação

Projeto Final de Big Data · UNINASSAU · 6º período noturno · Prof. Eduardo Hernandes · 18/11/2026

Tempo total: 11 minutos, 10 slides. O mesmo texto está nas notas do apresentador de cada slide do arquivo DataRoute_Recife_Apresentacao.pptx.

| Slide | Quem | Tempo |
|---|---|---|
| 1. Capa | F1 Paulo César | 00:00–00:30 |
| 2. O problema | F1 Paulo César | 00:30–01:15 |
| 3. Pergunta e objetivos | F1 Paulo César | 01:15–02:00 |
| 4. Fonte dos dados e 5 Vs | F2 Bruno Vinicius | 02:00–03:15 |
| 5. Pipeline Medalhão | F3 Wagner | 03:15–04:30 |
| 6. Quando: evolução e período do dia | F4 Lucy | 04:30–05:30 |
| 7. Onde: bairros e corredores | F4 Lucy | 05:30–06:30 |
| 8. Quem: modais, tipo de sinistro e clima | F5 Thomas | 06:30–08:30 |
| 9. Discussão e limitações | F6 Douglas | 08:30–09:45 |
| 10. Conclusão e recomendações | F6 Douglas | 09:45–11:00 |

## Slide 1 — Capa
**F1 Paulo César · 00:00–00:30**

Boa noite, professor Eduardo e colegas. Somos o grupo DataRoute Recife. Eu sou o Paulo César, líder e arquiteto do projeto, e comigo estão o Bruno, o Wagner, a Lucy, o Thomas e o Douglas. Nosso projeto usa técnicas de Big Data para responder uma pergunta prática: onde, quando e com quem acontecem os sinistros de trânsito mais graves do Recife, olhando dez anos de dados, de 2015 a 2024.

## Slide 2 — O problema
**F1 Paulo César · 00:30–01:15**

A Prefeitura publica os chamados de sinistros da CTTU no Portal de Dados Abertos. São 72.255 chamados em dez anos. Depois de tratar a base, chegamos a 60.225 sinistros válidos, com 24.872 vítimas e 290 óbitos. O problema é que esses dados não estão prontos para orientar decisões: os arquivos têm três layouts diferentes, misturam chamados cancelados e duplicados com ocorrências reais e têm falhas de preenchimento que mudam de um ano para outro. Ou seja, existe muito dado, mas pouca informação confiável para a gestão do trânsito.

## Slide 3 — Pergunta e objetivos
**F1 Paulo César · 01:15–02:00**

Por isso, definimos uma pergunta central e quatro objetivos. Onde: quais são os 10 bairros e os 5 corredores arteriais com mais sinistros e mais severidade, medida pela UPS, a Unidade Padrão de Severidade do Programa PARE. Quando: como os sinistros evoluíram de 2015 a 2024 e como se distribuem por dia da semana e horário. Quem: quais modais são mais vulneráveis. E em que condições: se o clima e a via alteram a letalidade. Para responder com segurança, construímos um pipeline Bronze, Silver e Gold reprodutível, que está todo no GitHub. Agora o Bruno apresenta as fontes de dados.

## Slide 4 — Fonte dos dados e 5 Vs
**F2 Bruno Vinicius · 02:00–03:15**

Obrigado, Paulo. Nossa fonte é o Portal de Dados Abertos do Recife, com os chamados de sinistros da CTTU: dez arquivos CSV, um por ano, de junho de 2015 a dezembro de 2024, em UTF-8 e com ponto e vírgula como separador. Vamos olhar esses dados pelos 5 Vs do Big Data. Volume: são 72.255 registros, 21,7 megabytes em disco e 113 em memória. É um volume moderado, mas a arquitetura foi pensada para crescer sem mudar o código. Velocidade: a CTTU publica em lotes anuais, e o nosso pipeline inteiro roda em cerca de 4 segundos, então dá para reprocessar tudo a cada nova publicação. Variedade: são três layouts, de 20 a 41 colunas, 45 na união, com números, categorias, texto livre, data e hora. Veracidade foi o maior desafio: 11.563 chamados cancelados, 455 duplicados e 126 grafias diferentes para os bairros. E o Valor é identificar os locais, horários e grupos mais letais para orientar a fiscalização. Agora o Wagner mostra como tratamos isso no pipeline.

## Slide 5 — Pipeline Medalhão
**F3 Wagner · 03:15–04:30**

Obrigado, Bruno. Nosso pipeline segue a arquitetura Medalhão: cada camada só lê a anterior, o que garante rastreabilidade até a fonte. Na Bronze ficam os dez CSVs originais, sem alteração. Na Silver acontece a limpeza: harmonizamos os três layouts pelo conteúdo, convertemos a vírgula decimal, que a partir de 2022 zeraria as vítimas se não fosse tratada, e removemos 11.563 chamados cancelados, 455 duplicidades, 4 duplicatas exatas e 8 chamados que não eram sinistro. Assim saímos de 72.255 chamados para 60.225 sinistros válidos. Também corrigimos 32 datas gravadas no ano errado e anulamos 8.504 horas que estavam no formato de 12 horas, sem AM ou PM, porque não dava para saber se eram de manhã ou de noite. Padronizamos os bairros em 93 valores: 92 oficiais mais "não informado". Contratos de dados validam cada camada antes de seguir. Na Gold ficam as 5 tabelas agregadas que alimentam a análise. Agora a Lucy apresenta os resultados.

## Slide 6 — Quando: evolução e período do dia
**F4 Lucy · 04:30–05:30**

Obrigada, Wagner. Começando pelo quando. Para comparar anos, usamos só sinistros com vítima, porque desde julho de 2020 as colisões sem vítima passaram a ser registradas pelo Bate-Pronto e quase sumiram da base. A série cresce, com correlação de Spearman de 0,39, mas o crescimento se concentra em 2023 e 2024: o volume mensal é 2,09 vezes o de 2021 e 2022, enquanto os óbitos sobem só 1,41 vez, sem significância estatística. A letalidade até cai, de 1,73 para 0,83 óbito por 100 vítimas. Nos dias úteis, o volume se concentra nos dias úteis entre 7h e 18h, com pico às 8h; o domingo tem só 9,7%. Mas a gravidade segue o caminho inverso, como mostra o gráfico ao lado: a madrugada tem só 5,1% dos sinistros com vítima, e 6,77% deles têm óbito, cerca de 6,7 vezes a proporção da manhã.

## Slide 7 — Onde: bairros e corredores
**F4 Lucy · 05:30–06:30**

Agora o onde. Os 10 bairros com maior severidade concentram 42,5% dos sinistros com vítima, e Boa Viagem lidera com folga: 7.392 sinistros e 14.254 UPS. Só que a letalidade entre esses bairros não difere estatisticamente, com p de 0,72. Por isso é importante dizer: esse ranking mede volume, não risco, porque não temos população nem fluxo de veículos por bairro. Nos corredores, a história muda. Os cinco corredores arteriais somam 3.566 sinistros com vítima, 16,5% da cidade. A Agamenon Magalhães tem o maior volume, mas letalidade abaixo da média da cidade, que é 1,28%. Já a Avenida Recife, com 2,30%, e a Abdias de Carvalho, com 2,25%, chegam perto do dobro da média. A diferença é pequena, mas estatisticamente significativa, com p de 0,024. Agora o Thomas fala sobre quem são as vítimas.

## Slide 8 — Quem: modais, tipo de sinistro e clima
**F5 Thomas · 06:30–08:30**

Obrigado, Lucy. Agora o quem. Este gráfico separa duas coisas que costumam ser confundidas: quantidade de vítimas e letalidade. As motos aparecem no maior número de vítimas, 18.756, e 77,3% dos sinistros com moto têm vítima. Mas, como mostram as barras em amarelo, os mais vulneráveis são os pedestres: 98,5% dos sinistros com pedestre têm vítima, com 46,0 óbitos por mil sinistros. Depois vêm os ciclistas, com 22,9 por mil. Para comparação, nos sinistros com automóvel a taxa é de 2,4 por mil. O tipo de sinistro confirma esse padrão: nos atropelamentos, 4,25% dos sinistros com vítima têm óbito; na colisão traseira, só 0,23%, cerca de 19 vezes menos. E o número de vítimas por sinistro não se relaciona com o óbito: a gravidade depende de quem está exposto, não de quantos estão envolvidos.

À direita, testamos o clima. Clima e via só são registrados de forma consistente entre 2019 e 2022, então usamos só os 6.870 sinistros com vítima desse período. Com chuva e via molhada, 2,00% tiveram óbito, contra 1,16% com tempo bom e via seca. Parece uma diferença, mas não é estatisticamente significativa, com p de 0,08, e a severidade média é praticamente igual: 4,34 contra 4,31 UPS. Então, nesta base, o clima não explica a gravidade. A interpretação para a gestão é clara: as ações devem focar em pedestres, ciclistas e motociclistas, e não nas condições do tempo. Agora o Douglas fecha com a discussão e a conclusão.

## Slide 9 — Discussão e limitações
**F6 Douglas · 08:30–09:45**

Obrigado, Thomas. Juntando tudo, os resultados respondem aos quatro objetivos. O volume se concentra em poucos bairros e corredores, mas a letalidade é maior na Avenida Recife e na Abdias de Carvalho. O pico de volume é às 8h dos dias úteis, e a madrugada é o período mais letal. Pedestres e ciclistas são os mais vulneráveis, e as motos somam mais vítimas. E o clima não mostrou efeito significativo. O maior desafio de engenharia foi a veracidade dos dados, e temos limitações que precisam ser ditas. Primeiro, desde julho de 2020 os sinistros sem vítima vão para o Bate-Pronto: eram 8.104 em 2019 e só 435 em 2021 na base, por isso comparamos os anos só com sinistros com vítima. Segundo, a hora falta em 2022 e é ambígua em 2023 e 2024, e clima e via só existem de 2019 a 2022. Terceiro, sem dados de população e de fluxo, os rankings mostram volume, não risco. E quarto, os endereços estão em texto, então cruzar com os fotossensores de velocidade exige geocodificação.

## Slide 10 — Conclusão e recomendações
**F6 Douglas · 09:45–11:00**

Para concluir: o projeto entregou um pipeline reprodutível que transforma 72.255 chamados em 60.225 sinistros auditados e em indicadores sobre onde, quando e com quem ocorrem os sinistros mais graves. A principal lição é separar volume de gravidade: os lugares e horários com mais sinistros não são os mais letais. Daí vêm quatro recomendações. Primeira: fiscalização de velocidade à noite e de madrugada, quando a proporção de sinistros com óbito chega a 6,77%, com prioridade para a Avenida Recife e a Abdias de Carvalho. Segunda: travessias seguras e redução de velocidade em áreas de pedestres e ciclistas, que têm 46,0 e 22,9 óbitos por mil sinistros. Terceira: ações dirigidas a motociclistas, que somam 18.756 vítimas. Quarta: qualidade de dados, registrando a hora no formato de 24 horas, mantendo os campos de clima e via e integrando o Bate-Pronto à base aberta. Como trabalho futuro, propomos geocodificar os endereços e cruzá-los com os fotossensores. Todo o código está no GitHub, no link do slide. Obrigado! Estamos abertos a perguntas.
