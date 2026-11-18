"""
CAMADA SILVER — Limpeza, ETL e Feature Engineering.   Responsável: F3 | Aprovador: F1

Regras da camada (válidas para a base real da CTTU 2015–2024, auditada pelo F1):
- Entrada: somente arquivos da Bronze (data/raw). Saída: data/processed/sinistros_silver.csv
- Colunas em snake_case, sem acento; categorias em MAIÚSCULO sem acento.
- Deve passar em src/contratos.validar_silver (o orquestrador confere).
- Toda regra de limpeza é contabilizada em `relatorio` (tabela "Antes vs. Depois").

Particularidades da base real tratadas aqui (ver docs/AUDITORIA_DADOS.md):
1. A coluna "com/sem vítima" muda de nome: `tipo` (2015), `natureza_acidente`
   (2016–2021) e `natureza` (2022–2024). O tipo de colisão fica na outra coluna.
   -> detecção pelo CONTEÚDO, não pelo nome.
2. De 2022 em diante os números vêm com vírgula decimal ("1,0").
3. A base é de CHAMADOS: há chamados CANCELADA e DUPLICIDADE, que não são sinistros.
4. `vitimasfatais` está ~99,7% vazio em 2016–2020; a morte é registrada na
   classificação "VÍTIMA FATAL" -> o óbito é derivado das duas fontes.
"""
from __future__ import annotations

from pathlib import Path

import numpy as np
import pandas as pd

from src.config import PICO_MANHA, PICO_TARDE, SILVER_SINISTROS
from src.contratos import CLASSES_VALIDAS, COLUNAS_SILVER
from src.utils import ler_csv_robusto, log, normalizar_texto, salvar_csv, snake_case

# Variações de nome de coluna -> nome oficial (após snake_case)
ALIASES = {
    "data_acidente": "data", "data_ocorrencia": "data",
    "hora_acidente": "hora", "hora_ocorrencia": "hora",
    "vitimas_fatais": "vitimasfatais",
    "ciclomotor": "ciclom",
}
COLUNAS_CANDIDATAS_CLASSIFICACAO = ["natureza_acidente", "natureza", "tipo"]
MODAIS = ["auto", "moto", "ciclom", "ciclista", "pedestre", "onibus", "caminhao", "viatura", "outros"]
CATEGORICAS = ["bairro", "situacao", "classificacao", "tipo_acidente",
               "tempo_clima", "situacao_semaforo", "condicao_via"]
SITUACOES_EXCLUIDAS = {"CANCELADA", "DUPLICIDADE"}   # chamados que não são sinistros
DIAS = {0: "SEGUNDA", 1: "TERCA", 2: "QUARTA", 3: "QUINTA",
        4: "SEXTA", 5: "SABADO", 6: "DOMINGO"}

# Grafias divergentes de bairro encontradas na base real (após remover acentos).
# F3: ampliar conforme o relatório de bairros do notebook 02.
CORRECAO_BAIRROS: dict[str, str] = {
    "IPESEP": "IPSEP",                          # erro de digitação
    "JOANA BEZERRA": "ILHA JOANA BEZERRA",      # nome oficial do bairro
    "SETUBAL": "BOA VIAGEM",                    # localidade; oficialmente parte de Boa Viagem
    # Nomes de agentes digitados por engano no campo bairro (achado do F3/Wagner)
    "MARCELO": "NAO INFORMADO",                 # 2015, 1 registro
    "FABIO": "NAO INFORMADO",                   # 2017, 1 registro
}


def _turno(h: float) -> str | float:
    if pd.isna(h):
        return np.nan
    h = int(h)
    return ("MADRUGADA" if h < 6 else "MANHA" if h < 12 else
            "TARDE" if h < 18 else "NOITE")


def _numero(serie: pd.Series) -> pd.Series:
    """'1,0' / '1.0' / '1' / '' -> float (vírgula decimal a partir de 2022)."""
    s = serie.astype("string").str.strip().str.replace(",", ".", regex=False)
    return pd.to_numeric(s, errors="coerce")


def _harmonizar_layout(df: pd.DataFrame, origem: str) -> pd.DataFrame:
    """Padroniza nomes e separa classificação (com/sem vítima) do tipo de colisão."""
    df.columns = [ALIASES.get(snake_case(c), snake_case(c)) for c in df.columns]
    # a coluna de classificação é a que contém "VITIMA" na maioria dos registros
    def taxa_vitima(col: str) -> float:
        if col not in df.columns:
            return 0.0
        v = normalizar_texto(df[col]).fillna("")
        return float(v.str.contains("VITIMA").mean())
    taxas = {c: taxa_vitima(c) for c in COLUNAS_CANDIDATAS_CLASSIFICACAO}
    col_class = max(taxas, key=taxas.get)
    if taxas[col_class] < 0.5:
        raise ValueError(f"{origem}: coluna de classificação não identificada {taxas}")
    col_tipo = "natureza" if col_class == "tipo" else "tipo"
    df = df.rename(columns={col_class: "classificacao"})
    df["tipo_acidente"] = df[col_tipo] if col_tipo in df.columns else np.nan
    log.info("%s: classificação='%s', tipo de colisão='%s'", origem, col_class, col_tipo)
    return df


def unificar(arquivos: list[Path]) -> pd.DataFrame:
    partes = []
    for arq in arquivos:
        df = _harmonizar_layout(ler_csv_robusto(arq), arq.name)
        df["arquivo_origem"] = arq.name
        partes.append(df)
    return pd.concat(partes, ignore_index=True, sort=False)


def limpar(df: pd.DataFrame) -> tuple[pd.DataFrame, dict]:
    rel: dict = {"linhas_entrada": len(df), "colunas_entrada": df.shape[1],
                 "nulos_entrada": int(df.isna().sum().sum())}

    for col in ["data", "hora", "endereco", "vitimas", "vitimasfatais", *CATEGORICAS, *MODAIS]:
        if col not in df.columns:
            df[col] = np.nan
    rel["bairros_distintos_entrada"] = int(df["bairro"].astype("string").str.strip().nunique())
    for col in CATEGORICAS:
        df[col] = normalizar_texto(df[col])

    # 1) chamados que não são sinistros
    for sit in sorted(SITUACOES_EXCLUIDAS):
        mask = df["situacao"].eq(sit)
        rel[f"situacao_{sit.lower()}_removidas"] = int(mask.sum())
        df = df[~mask].copy()

    # 2) duplicatas exatas (ignora identificadores administrativos)
    ignorar = {"arquivo_origem", "protocolo"}
    antes = len(df)
    df = df.drop_duplicates(subset=[c for c in df.columns if c not in ignorar])
    rel["duplicatas_exatas_removidas"] = antes - len(df)

    # 3) datas e horas (2022 não tem hora preenchida: fica NaN, não é descartado)
    df["data"] = pd.to_datetime(df["data"].astype("string").str.strip(),
                                format="mixed", dayfirst=False, errors="coerce")
    antes = len(df)
    df = df.dropna(subset=["data"]).copy()
    rel["sem_data_valida_removidas"] = antes - len(df)
    # 3b) ano da data x ano do arquivo. O arquivo de 2024 traz 29–31/dez com ano 2025:
    #     erro típico de formatação com "ano da semana ISO" (esses dias caem na
    #     semana 1 de 2025). Corrige-se para o ano do arquivo; outros desvios saem.
    ano_arquivo = pd.to_numeric(df["arquivo_origem"].str.extract(r"(\d{4})")[0], errors="coerce")
    iso_bug = ((df["data"].dt.year == ano_arquivo + 1) & (df["data"].dt.month == 12)
               & (df["data"].dt.day >= 29))
    df.loc[iso_bug, "data"] = df.loc[iso_bug, "data"] - pd.DateOffset(years=1)
    rel["datas_ano_iso_corrigidas"] = int(iso_bug.sum())
    fora = ano_arquivo.notna() & (df["data"].dt.year != ano_arquivo)
    rel["datas_fora_do_ano_do_arquivo_removidas"] = int(fora.sum())
    df = df[~fora].copy()
    hora = pd.to_datetime(df["hora"].astype("string").str.strip().str[:5],
                          format="%H:%M", errors="coerce")
    df["hora"] = hora.dt.hour
    # 3c) Arquivos com hora em formato de 12 h sem AM/PM (2023 e 2024 na base real):
    #     só existem valores de 1 a 12, então "07:00" pode ser 7h ou 19h. A hora
    #     desses arquivos é ambígua e vira nulo (achado na revisão do F4).
    h_max = df.groupby("arquivo_origem")["hora"].transform("max")
    formato_12h = h_max.notna() & (h_max <= 12)
    rel["hora_formato_12h_anulada"] = int((formato_12h & df["hora"].notna()).sum())
    rel["arquivos_hora_12h"] = sorted(df.loc[formato_12h, "arquivo_origem"].unique().tolist())
    df.loc[formato_12h, "hora"] = np.nan
    rel["sem_hora_mantidas"] = int(df["hora"].isna().sum())

    # 4) numéricos: vírgula decimal e vazio = 0 (campo de contagem não preenchido)
    nums = MODAIS + ["vitimas", "vitimasfatais"]
    convertidos = df[nums].apply(_numero)
    rel["nulos_numericos_imputados_zero"] = int(convertidos.isna().sum().sum())
    df[nums] = convertidos.fillna(0).clip(lower=0).astype(int)

    # 5) classificação: infere quando vazia, descarta chamados que não são sinistro
    vazia = df["classificacao"].isna()
    df.loc[vazia, "classificacao"] = np.select(
        [df.loc[vazia, "vitimasfatais"] > 0, df.loc[vazia, "vitimas"] > 0],
        ["VITIMA FATAL", "COM VITIMA"], default="SEM VITIMA")
    rel["classificacao_inferida"] = int(vazia.sum())
    invalida = ~df["classificacao"].isin(CLASSES_VALIDAS)
    rel["classificacao_nao_sinistro_removidas"] = int(invalida.sum())
    df = df[~invalida].copy()

    # 6) óbito: classificação "VITIMA FATAL" OU vitimasfatais > 0
    df["vitima_fatal"] = df["classificacao"].eq("VITIMA FATAL") | (df["vitimasfatais"] > 0)
    corrigir = df["vitima_fatal"] & (df["vitimasfatais"] == 0)
    rel["vitimasfatais_corrigidas_pela_classificacao"] = int(corrigir.sum())
    df.loc[corrigir, "vitimasfatais"] = 1
    df.loc[df["vitima_fatal"], "classificacao"] = "VITIMA FATAL"
    # sinistro com vítima tem ao menos 1 vítima registrada
    sem_contagem = df["classificacao"].ne("SEM VITIMA") & (df["vitimas"] == 0)
    rel["vitimas_ajustadas_para_1"] = int(sem_contagem.sum())
    df.loc[sem_contagem, "vitimas"] = 1

    # 7) categorias
    df["bairro"] = df["bairro"].replace(CORRECAO_BAIRROS)
    df[CATEGORICAS] = df[CATEGORICAS].fillna("NAO INFORMADO")
    df["endereco"] = normalizar_texto(df["endereco"]).fillna("NAO INFORMADO")

    # 8) Feature Engineering
    df["ano"] = df["data"].dt.year
    df["mes"] = df["data"].dt.month
    df["dia_semana"] = df["data"].dt.dayofweek.map(DIAS)
    df["turno"] = df["hora"].map(_turno)
    # pico desconhecido quando a hora é desconhecida (nulo, e não "falso")
    df["horario_pico"] = df["hora"].isin(list(PICO_MANHA) + list(PICO_TARDE)).astype("boolean")
    df.loc[df["hora"].isna(), "horario_pico"] = pd.NA
    # UPS — Unidade Padrão de Severidade (Programa PARE, Ministério dos Transportes, 2002):
    # danos materiais = 1 | com feridos = 4 | feridos envolvendo pedestre = 6 | com óbito = 13
    com_ferido = df["classificacao"].eq("COM VITIMA")
    df["indice_severidade"] = np.select(
        [df["vitima_fatal"], com_ferido & (df["pedestre"] > 0), com_ferido],
        [13, 6, 4], default=1)

    df = df[COLUNAS_SILVER + ["arquivo_origem"]].reset_index(drop=True)
    rel.update({"linhas_saida": len(df), "colunas_saida": df.shape[1],
                "nulos_saida": int(df[COLUNAS_SILVER].isna().sum().sum()),
                "bairros_distintos_saida": int(df["bairro"].nunique())})
    return df, rel


def run(arquivos: list[Path]) -> dict:
    df, relatorio = limpar(unificar(arquivos))
    salvar_csv(df, SILVER_SINISTROS)
    log.info("SILVER: %d -> %d linhas", relatorio["linhas_entrada"], relatorio["linhas_saida"])
    return {"df": df, "relatorio": relatorio}
