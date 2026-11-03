#!/usr/bin/env python3
"""
Entity extraction script using spaCy.

Reads text from stdin, writes JSON to stdout with:
- entities: named entities (PERSON, ORG, GPE, LOC, etc.)
- keywords: top noun phrases by frequency

Usage:
    echo "some text" | python3 extract_entities.py
"""

import json
import sys
from collections import Counter

import spacy


def extract(text, max_keywords=20):
    nlp = spacy.load("en_core_web_sm")

    # Truncate very long texts to avoid memory issues
    max_chars = 500_000
    if len(text) > max_chars:
        text = text[:max_chars]

    doc = nlp(text)

    # Extract named entities, deduplicating by (label, text)
    seen_entities = set()
    entities = []
    for ent in doc.ents:
        key = (ent.label_, ent.text.strip())
        if key not in seen_entities and ent.text.strip():
            seen_entities.add(key)
            entities.append({"type": ent.label_, "text": ent.text.strip()})

    # Extract keywords from noun chunks
    chunks = [
        chunk.text.strip().lower()
        for chunk in doc.noun_chunks
        if len(chunk.text.strip()) > 2
    ]
    chunk_counts = Counter(chunks)
    keywords = [
        {"text": text, "score": round(count / max(len(chunks), 1), 4)}
        for text, count in chunk_counts.most_common(max_keywords)
    ]

    return {"entities": entities, "keywords": keywords}


def main():
    # Accept a file path argument, or read from stdin
    if len(sys.argv) > 1:
        with open(sys.argv[1], "r", encoding="utf-8", errors="replace") as f:
            text = f.read()
    else:
        text = sys.stdin.read()

    if not text.strip():
        json.dump({"entities": [], "keywords": []}, sys.stdout)
        return

    result = extract(text)
    json.dump(result, sys.stdout)


if __name__ == "__main__":
    main()
