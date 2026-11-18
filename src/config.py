"""
Configuração central do pipeline DataRoute Recife.

REGRA DE OURO (F1): nenhum script, notebook ou módulo usa caminho absoluto
(ex.: "C:/Users/..." ou "/content/drive/..."). Todo caminho é derivado de
ROOT, calculado a partir da localização deste arquivo com pathlib.Path.
Assim o projeto roda igual no Windows, Linux, Mac e Google Colab.
"""
from __future__ import annotations

from pathlib import Path

# Raiz do repositório: src/config.py -> src/ -> raiz
ROOT: Path = Path(__file__).resolve().parent.parent

# ---------------------------------------------------------------------------
# Arquitetura Medalhão Adaptada
# ---------------------------------------------------------------------------
DATA_DIR: Path = ROOT / "data"
BRONZE_DIR: Path = DATA_DIR / "raw"            # Bronze: arquivos originais, intocados
SILVER_DIR: Path = DATA_DIR / "processed"      # Silver: base limpa e enriquecida
GOLD_DIR: Path = SILVER_DIR / "gold"           # Gold: agregações analíticas

DOCS_DIR: Path = ROOT / "docs"
FIGURAS_DIR: Path = DOCS_DIR / "figuras"       # Gráficos 300 DPI (F5)
NOTEBOOKS_DIR: Path = ROOT / "notebooks"

# ---------------------------------------------------------------------------
# Nomes padronizados de arquivos (contrato entre as camadas)
# ---------------------------------------------------------------------------
# Bronze: F2 salva os CSVs originais com o prefixo da base, ex.:
#   sinistros_2019.csv, sinistros_2020.csv, velocidade_2024_03.csv, malha_cicloviaria.csv
PREFIXO_SINISTROS = "sinistros_"
PREFIXO_VELOCIDADE = "velocidade_"
PREFIXO_MALHA = "malha_"

# Silver: saída única e oficial da limpeza (F3)
SILVER_SINISTROS: Path = SILVER_DIR / "sinistros_silver.csv"

# Gold: uma tabela por objetivo específico / gráfico (F4 e F5)
GOLD_ARQUIVOS: dict[str, Path] = {
    "serie_temporal": GOLD_DIR / "gold_serie_temporal.csv",
    "top10_bairros": GOLD_DIR / "gold_top10_bairros.csv",
    "dia_hora": GOLD_DIR / "gold_heatmap_dia_hora.csv",
    "modais": GOLD_DIR / "gold_modais_vitimas.csv",
    "clima_via": GOLD_DIR / "gold_clima_via_severidade.csv",
}

# Métricas automáticas do pipeline (alimentam a tabela "Antes vs. Depois")
METRICAS_JSON: Path = DOCS_DIR / "metricas_pipeline.json"

# ---------------------------------------------------------------------------
# Padrões de leitura/escrita
# ---------------------------------------------------------------------------
ENCODINGS_ENTRADA = ("utf-8", "utf-8-sig", "latin-1")  # tentativas em ordem
ENCODING_SAIDA = "utf-8"
SEP_SAIDA = ","
DPI_FIGURAS = 300

# Recorte da análise de clima/condição da via: únicos anos com o campo preenchido
# de forma consistente na base da CTTU (ver docs/AUDITORIA_DADOS.md, achado 7)
ANOS_CLIMA = range(2019, 2023)  # 2019–2022

# Lançamento do Bate-Pronto (registro online de sinistro sem vítima) — quebra da série
DATA_BATE_PRONTO = "2020-07-17"

# Horários de pico (definição única para todo o grupo)
PICO_MANHA = range(6, 9)    # 06:00–08:59
PICO_TARDE = range(17, 20)  # 17:00–19:59


def garantir_pastas() -> None:
    """Cria as pastas do pipeline caso não existam (útil no Colab)."""
    for pasta in (BRONZE_DIR, SILVER_DIR, GOLD_DIR, FIGURAS_DIR):
        pasta.mkdir(parents=True, exist_ok=True)


if __name__ == "__main__":
    garantir_pastas()
    print(f"ROOT    = {ROOT}")
    print(f"BRONZE  = {BRONZE_DIR.relative_to(ROOT)}")
    print(f"SILVER  = {SILVER_DIR.relative_to(ROOT)}")
    print(f"GOLD    = {GOLD_DIR.relative_to(ROOT)}")
    print(f"FIGURAS = {FIGURAS_DIR.relative_to(ROOT)}")
