"""
Contratos de dados entre as camadas (definidos pelo F1).

Cada camada só é considerada "pronta" (DoD) quando a sua saída passa na
validação abaixo. O orquestrador (src/pipeline.py) roda essas checagens
automaticamente e interrompe o pipeline se algo quebrar o contrato.
"""
from __future__ import annotations

import pandas as pd

# Colunas mínimas que a Silver (F3) DEVE entregar, em snake_case e sem acento.
COLUNAS_SILVER: list[str] = [
    # tempo (Feature Engineering)
    "data", "ano", "mes", "dia_semana", "hora", "turno", "horario_pico",
    # local
    "bairro", "endereco",
    # ocorrência
    "classificacao", "tipo_acidente", "situacao",
    # modais envolvidos (contagens inteiras)
    "auto", "moto", "ciclom", "ciclista", "pedestre", "onibus", "caminhao",
    # vítimas
    "vitimas", "vitimasfatais", "vitima_fatal", "indice_severidade",
    # contexto (preenchido de fato apenas em 2019–2022 na base real)
    "tempo_clima", "situacao_semaforo", "condicao_via",
]

COLUNAS_NUMERICAS_SILVER: list[str] = [
    "ano", "mes", "auto", "moto", "ciclom", "ciclista", "pedestre",
    "onibus", "caminhao", "vitimas", "vitimasfatais", "indice_severidade",
]

# Colunas que podem ter nulo legítimo: 2022 não tem hora e 2023–2024 têm hora
# ambígua (formato 12 h sem AM/PM) na base da CTTU
COLUNAS_NULO_PERMITIDO = {"hora", "turno", "horario_pico"}

TURNOS_VALIDOS = {"MADRUGADA", "MANHA", "TARDE", "NOITE"}
CLASSES_VALIDAS = {"SEM VITIMA", "COM VITIMA", "VITIMA FATAL"}
UPS_VALIDOS = {1, 4, 6, 13}


class ContratoViolado(Exception):
    """Erro lançado quando uma camada entrega dados fora do contrato."""


def validar_bronze(arquivos: list) -> None:
    if not arquivos:
        raise ContratoViolado(
            "Bronze vazia: nenhum CSV em data/raw. F2 deve rodar a ingestão "
            "(notebooks/01_ingestao_bronze.ipynb) antes do pipeline.")


def validar_silver(df: pd.DataFrame) -> None:
    faltando = [c for c in COLUNAS_SILVER if c not in df.columns]
    if faltando:
        raise ContratoViolado(f"Silver sem colunas obrigatórias: {faltando}")
    if df.empty:
        raise ContratoViolado("Silver vazia após a limpeza")
    for col in COLUNAS_NUMERICAS_SILVER:
        if not pd.api.types.is_numeric_dtype(df[col]):
            raise ContratoViolado(f"Coluna '{col}' deveria ser numérica na Silver")
    turnos = set(df["turno"].dropna().unique()) - TURNOS_VALIDOS
    if turnos:
        raise ContratoViolado(f"Turnos fora do padrão: {turnos}")
    classes = set(df["classificacao"].unique()) - CLASSES_VALIDAS
    if classes:
        raise ContratoViolado(f"Classificações fora do padrão: {classes}")
    ups = set(df["indice_severidade"].unique()) - UPS_VALIDOS
    if ups:
        raise ContratoViolado(f"Índice de severidade fora da escala UPS: {ups}")
    com_nulo = [c for c in COLUNAS_SILVER
                if c not in COLUNAS_NULO_PERMITIDO and df[c].isna().any()]
    if com_nulo:
        raise ContratoViolado(f"Nulos não tratados nas colunas: {com_nulo}")
    if ((df["vitimasfatais"] > 0) != df["vitima_fatal"]).any():
        raise ContratoViolado("vitimasfatais e vitima_fatal inconsistentes")


def validar_gold(tabelas: dict[str, pd.DataFrame]) -> None:
    vazias = [nome for nome, t in tabelas.items() if t is None or t.empty]
    if vazias:
        raise ContratoViolado(f"Tabelas Gold vazias: {vazias}")
