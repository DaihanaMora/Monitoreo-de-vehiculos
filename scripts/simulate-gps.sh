#!/usr/bin/env bash
# ==========================================================================
# Simulador de movimiento GPS continuo contra un servidor Traccar real,
# usando el protocolo OsmAnd (puerto 5055 por defecto en demo4.traccar.org).
#
# Por qué existe: un solo `curl` manda UNA posición una sola vez -- eso
# hace que el dispositivo aparezca "en línea" un instante y luego se quede
# desactualizado/offline otra vez. Este script manda una posición nueva
# cada pocos segundos, con coordenadas que avanzan en línea recta, para
# poder ver tracking en vivo de verdad en el mapa (marcador moviéndose,
# velocidad > 0, "Actualizado hace instantes") usando el polling REST que
# YA está implementado -- sin tocar nada de arquitectura.
#
# Uso:
#   ./scripts/simulate-gps.sh MI_UNIQUE_ID
#   TRACCAR_HOST=otro-servidor.com ./scripts/simulate-gps.sh MI_UNIQUE_ID
#
# MI_UNIQUE_ID es el identificador del dispositivo tal como lo creaste en
# Traccar (Configuración > Dispositivos > Identificador). NO es el nombre
# visible ("Camión 07"), es el campo "Identificador único"/uniqueId.
# ==========================================================================

set -euo pipefail

UNIQUE_ID="${1:?Uso: ./scripts/simulate-gps.sh <uniqueId-del-dispositivo>}"
HOST="${TRACCAR_HOST:-demo4.traccar.org}"
PORT="${TRACCAR_OSMAND_PORT:-5055}"
INTERVAL_SECONDS="${INTERVAL_SECONDS:-4}"

# Punto de partida: Bogotá, mismo centro que usan los mockups de UX.
LAT="${START_LAT:-4.7110}"
LNG="${START_LNG:--74.0721}"
COURSE=45            # grados, 0=norte, avanza hacia el noreste
SPEED_KNOTS=12        # ~22 km/h, visible como "en movimiento" (> 1 km/h)
STEP=0.0006           # grados por tick -- desplazamiento visible pero suave

echo "Simulando GPS para uniqueId='${UNIQUE_ID}' contra http://${HOST}:${PORT}"
echo "Un ping cada ${INTERVAL_SECONDS}s. Ctrl+C para detener."
echo

RAD=$(python -c "import math; print(math.radians(${COURSE}))")
DLAT=$(python -c "import math; print(math.cos(${RAD}) * ${STEP})")
DLNG=$(python -c "import math; print(math.sin(${RAD}) * ${STEP})")

while true; do
  TS=$(date +%s)
  URL="http://${HOST}:${PORT}/?id=${UNIQUE_ID}&lat=${LAT}&lon=${LNG}&speed=${SPEED_KNOTS}&bearing=${COURSE}&timestamp=${TS}"
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "${URL}")
  echo "[$(date '+%H:%M:%S')] lat=${LAT} lng=${LNG} -> HTTP ${HTTP_CODE}"

  LAT=$(python -c "print(${LAT} + ${DLAT})")
  LNG=$(python -c "print(${LNG} + ${DLNG})")

  sleep "${INTERVAL_SECONDS}"
done
