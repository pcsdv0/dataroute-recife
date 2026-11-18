"""
CAMADA GOLD — Agregações analíticas.   Responsável: F4 | Aprovador: F1

Regras da camada:
- Entrada: somente data/processed/sinistros_silver.csv (nunca a Bronze).
- Uma tabela por objetivo específico / gráfico, nomes definidos em config.GOLD_ARQUIVOS.
- F5 gera os gráficos LENDO estas tabelas (não recalcula nada no notebook de dataviz).

Baseline do F1: as 5 tabelas que respondem aos 4 objetivos específicos.
O F4 acrescenta estatística descritiva (média, mediana, quartis, correlações).
"""
from __future__ import annotations

import pandas as pd

from src.config import ANOS_CLIMA, GOLD_ARQUIVOS
from src.utils import log, salvar_csv

MODAIS = ["auto", "moto", "ciclom", "ciclista", "pedestre", "onibus", "caminhao"]
CLASSES_COM_VITIMA = ["COM VITIMA", "VITIMA FATAL"]
ORDEM_DIAS = ["SEGUNDA", "TERCA", "QUARTA", "QUINTA", "SEXTA", "SABADO", "DOMINGO"]


def serie_temporal(df: pd.DataFrame) -> pd.DataFrame:
    """Mensal e por classificação. ATENÇÃO na leitura: a partir de jul/2020 os
    sinistros SEM vítima passaram a ser registrados pelo Bate-Pronto (online) e
    quase somem desta base; compare anos usando COM VITIMA + VITIMA FATAL."""
    return (df.groupby(["ano", "mes", "classificacao"])
              .agg(sinistros=("data", "size"), vitimas=("vitimas", "sum"),
                   fatais=("vitimasfatais", "sum"))
              .reset_index())


def top10_bairros(df: pd.DataFrame) -> pd.DataFrame:
    g = (df[df["bairro"].ne("NAO INFORMADO")]
         .groupby("bairro")
         .agg(sinistros=("data", "size"), vitimas=("vitimas", "sum"),
              fatais=("vitimasfatais", "sum"), ups=("indice_severidade", "sum"))
         .sort_values("ups", ascending=False).head(10).reset_index())
    g["letalidade_pct"] = (100 * g["fatais"] / g["sinistros"]).round(2)
    return g


def heatmap_dia_hora(df: pd.DataFrame) -> pd.DataFrame:
    t = (df.dropna(subset=["hora"])
           .pivot_table(index="dia_semana", columns="hora", values="data",
                        aggfunc="size", fill_value=0))
    return t.reindex(ORDEM_DIAS).fillna(0).astype(int).reset_index()


def modais_vitimas(df: pd.DataFrame) -> pd.DataFrame:
    linhas = []
    for m in MODAIS:
        sub = df[df[m] > 0]
        linhas.append({"modal": m.upper(), "sinistros_envolvidos": len(sub),
                       "sinistros_com_vitima": int(sub["classificacao"].isin(CLASSES_COM_VITIMA).sum()),
                       "vitimas": int(sub["vitimas"].sum()),
                       "fatais": int(sub["vitimasfatais"].sum())})
    t = pd.DataFrame(linhas)
    t["pct_com_vitima"] = (100 * t["sinistros_com_vitima"] / t["sinistros_envolvidos"]).round(1)
    t["fatais_por_mil"] = (1000 * t["fatais"] / t["sinistros_envolvidos"]).round(1)
    return t.sort_values("vitimas", ascending=False)


def clima_via(df: pd.DataFrame) -> pd.DataFrame:
    """Recorte 2019–2022 (config.ANOS_CLIMA), só com clima E via informados.

    A gravidade é medida ENTRE OS SINISTROS COM VÍTIMA: os dias de chuva se
    concentram em 2021–2022, quando o Bate-Pronto já tinha tirado quase todos os
    sinistros sem vítima da base. Comparar a severidade de todos os sinistros
    misturaria o efeito do clima com essa mudança de registro.
    """
    base = df[df["ano"].isin(list(ANOS_CLIMA))
              & df["tempo_clima"].ne("NAO INFORMADO") & df["condicao_via"].ne("NAO INFORMADO")]
    com_vitima = base[base["classificacao"].isin(CLASSES_COM_VITIMA)]
    total = base.groupby(["tempo_clima", "condicao_via"]).size().rename("sinistros")
    g = (com_vitima.groupby(["tempo_clima", "condicao_via"])
         .agg(sinistros_com_vitima=("data", "size"),
              severidade_media_com_vitima=("indice_severidade", "mean"),
              fatais=("vitimasfatais", "sum"),
              sinistros_com_obito=("vitima_fatal", "sum")))
    g = pd.concat([total, g], axis=1).fillna(0)
    g["pct_com_obito"] = (100 * g["sinistros_com_obito"] / g["sinistros_com_vitima"]).round(2)
    g["severidade_media_com_vitima"] = g["severidade_media_com_vitima"].round(2)
    sem_base = g["sinistros_com_vitima"] == 0
    g.loc[sem_base, "severidade_media_com_vitima"] = float("nan")
    inteiros = ["sinistros", "sinistros_com_vitima", "fatais", "sinistros_com_obito"]
    g[inteiros] = g[inteiros].astype(int)
    return g.reset_index().sort_values("sinistros", ascending=False)


def run(df: pd.DataFrame) -> dict:
    tabelas = {
        "serie_temporal": serie_temporal(df),
        "top10_bairros": top10_bairros(df),
        "dia_hora": heatmap_dia_hora(df),
        "modais": modais_vitimas(df),
        "clima_via": clima_via(df),
    }
    for nome, tabela in tabelas.items():
        salvar_csv(tabela, GOLD_ARQUIVOS[nome])
    log.info("GOLD: %d tabelas geradas", len(tabelas))
    return {"tabelas": tabelas}
