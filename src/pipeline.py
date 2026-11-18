"""
ORQUESTRADOR DO PIPELINE — Arquitetura Medalhão Adaptada.   Responsável: F1

    Bronze (data/raw)  ->  Silver (data/processed)  ->  Gold (data/processed/gold)

Uso (a partir da raiz do repositório):
    python -m src.pipeline              # roda tudo
    python -m src.pipeline --ate silver # para depois da Silver

No Google Colab:
    !git clone https://github.com/<usuario>/dataroute-recife.git
    %cd dataroute-recife
    !pip install -q -r requirements.txt
    !python -m src.pipeline

Ao final grava docs/metricas_pipeline.json com volumetria, regras de limpeza
aplicadas e tempos de execução (fonte da tabela "Antes vs. Depois" e da Seção 4).
"""
from __future__ import annotations

import argparse
import json
import time
from datetime import datetime

import pandas as pd

from src import bronze, gold, silver
from src.config import METRICAS_JSON, ROOT, garantir_pastas
from src.contratos import validar_bronze, validar_gold, validar_silver
from src.utils import configurar_log, log

ETAPAS = ("bronze", "silver", "gold")


def executar(ate: str = "gold") -> dict:
    configurar_log()
    garantir_pastas()
    metricas: dict = {"executado_em": datetime.now().isoformat(timespec="seconds"),
                      "tempos_s": {}}
    alvo = ETAPAS.index(ate)

    # ---------------- BRONZE ----------------
    t0 = time.perf_counter()
    b = bronze.run()
    validar_bronze(b["arquivos"])
    metricas["tempos_s"]["bronze"] = round(time.perf_counter() - t0, 2)
    metricas["bronze"] = {
        "arquivos": [p.name for p in b["arquivos"]],
        "linhas_brutas": b["linhas_brutas"],
        "volumetria": b["volumetria"].to_dict(orient="records"),
    }
    if alvo == 0:
        return _finalizar(metricas)

    # ---------------- SILVER ----------------
    t0 = time.perf_counter()
    s = silver.run(b["arquivos"])
    validar_silver(s["df"])
    metricas["tempos_s"]["silver"] = round(time.perf_counter() - t0, 2)
    metricas["silver"] = s["relatorio"]
    if alvo == 1:
        return _finalizar(metricas)

    # ---------------- GOLD ----------------
    t0 = time.perf_counter()
    g = gold.run(s["df"])
    validar_gold(g["tabelas"])
    metricas["tempos_s"]["gold"] = round(time.perf_counter() - t0, 2)
    metricas["gold"] = {nome: len(t) for nome, t in g["tabelas"].items()}
    return _finalizar(metricas)


def _finalizar(metricas: dict) -> dict:
    METRICAS_JSON.write_text(json.dumps(metricas, ensure_ascii=False, indent=2,
                                        default=str), encoding="utf-8")
    log.info("Métricas salvas em %s", METRICAS_JSON.relative_to(ROOT))
    if "silver" in metricas:
        log.info("\n%s", tabela_antes_depois(metricas).to_string(index=False))
    return metricas


def tabela_antes_depois(metricas: dict) -> pd.DataFrame:
    """Quadro 'Antes vs. Depois da Limpeza' pronto para o relatório (Seção 4)."""
    s = metricas["silver"]
    linhas = [
        ("Registros (chamados -> sinistros)", s["linhas_entrada"], s["linhas_saida"]),
        ("Colunas (união dos layouts anuais -> contrato)", s["colunas_entrada"], s["colunas_saida"]),
        ("Valores nulos", s["nulos_entrada"], s["nulos_saida"]),
        ("Chamados CANCELADA", s["situacao_cancelada_removidas"], 0),
        ("Chamados DUPLICIDADE", s["situacao_duplicidade_removidas"], 0),
        ("Duplicatas exatas", s["duplicatas_exatas_removidas"], 0),
        ("Chamados que não são sinistro (APOIO, OUTROS...)",
         s["classificacao_nao_sinistro_removidas"], 0),
        ("Registros sem data válida", s["sem_data_valida_removidas"], 0),
        ("Datas com ano errado (bug ano-semana ISO) corrigidas", s["datas_ano_iso_corrigidas"], 0),
        ("Datas fora do ano do arquivo", s["datas_fora_do_ano_do_arquivo_removidas"], 0),
        ("Horas ambíguas (formato 12 h sem AM/PM, 2023–2024)", s["hora_formato_12h_anulada"], "nulo"),
        ("Classificação vazia (inferida pelas vítimas)", s["classificacao_inferida"], 0),
        ("Óbitos só na classificação (vitimasfatais corrigido)",
         s["vitimasfatais_corrigidas_pela_classificacao"], 0),
        ("Sinistros com vítima sem contagem (vitimas ajustado para 1)",
         s["vitimas_ajustadas_para_1"], 0),
        ("Bairros distintos", s.get("bairros_distintos_entrada", "-"), s["bairros_distintos_saida"]),
    ]
    return pd.DataFrame(linhas, columns=["Indicador", "Antes (Bronze)", "Depois (Silver)"])


if __name__ == "__main__":
    ap = argparse.ArgumentParser(description="Pipeline DataRoute Recife")
    ap.add_argument("--ate", choices=ETAPAS, default="gold",
                    help="última camada a executar")
    executar(ap.parse_args().ate)
