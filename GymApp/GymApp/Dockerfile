FROM python:3.13-slim

WORKDIR /app

COPY requirements.txt .

# Offline install: place .whl files in ./wheels/ before building (see scripts/download_wheels.ps1).
# Online install: leave wheels/ empty or omit it; pip will fetch from PyPI.
COPY wheels/ /wheels/
RUN if [ -n "$(ls -A /wheels 2>/dev/null)" ]; then \
        pip install --no-cache-dir --no-index --find-links=/wheels -r requirements.txt; \
    else \
        pip install --no-cache-dir -r requirements.txt; \
    fi

COPY _read_xlsx.py .
COPY Complete_60Days_Lean_Bulk_Plan.xlsx .

CMD ["python", "_read_xlsx.py"]
