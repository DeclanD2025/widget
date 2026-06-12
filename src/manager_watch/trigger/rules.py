"""Confirmation/exclusion rule engine (design §3 step 2).

Evaluation order on headline + first 300 chars of body:
  1. no club alias        -> IRRELEVANT
  2. exclusion match      -> SPECULATION
  3. confirmation match   -> CONFIRMATION (CANDIDATE when no name extracted)
  4. otherwise            -> IRRELEVANT
Interim patterns set is_interim without affecting classification.
Name extraction is deterministic: the capitalised 2-4 token sequence nearest
the appointment verb, filtered by a stoplist, NFKD-normalised.
"""
from __future__ import annotations

import re
import unicodedata
from dataclasses import dataclass, field
from functools import lru_cache

import yaml

from manager_watch.settings import settings
from manager_watch.types import NewsItem

LEDE_CHARS = 300

NAME_SEQ = re.compile(r"\b([A-Z][\w'’-]+(?:\s+[A-Z][\w'’-]+){1,3})\b")


@dataclass
class RuleSet:
    club_aliases: list[str]
    confirmation: list[dict]
    exclusion: list[dict]
    interim: list[dict]
    name_stoplist: set[str]

    def __post_init__(self):
        for group in (self.confirmation, self.exclusion, self.interim):
            for rule in group:
                rule["compiled"] = re.compile(rule["pattern"], re.IGNORECASE)


@dataclass
class Classification:
    classification: str  # IRRELEVANT | SPECULATION | CANDIDATE | CONFIRMATION
    extracted_name: str | None = None
    is_interim: bool = False
    matched_patterns: list[str] = field(default_factory=list)


@lru_cache(maxsize=1)
def load_rules(path: str | None = None) -> RuleSet:
    config = yaml.safe_load(open(path or settings.patterns_file))
    return RuleSet(
        club_aliases=[alias.lower() for alias in config["club_aliases"]],
        confirmation=config["confirmation"],
        exclusion=config["exclusion"],
        interim=config["interim"],
        name_stoplist={token.lower() for token in config["name_stoplist"]},
    )


def normalize_name(name: str) -> str:
    text = unicodedata.normalize("NFKD", name)
    text = text.encode("ascii", "ignore").decode("ascii")
    return re.sub(r"\s+", " ", text).strip().lower()


def extract_name(text: str, verb_span: tuple[int, int], stoplist: set[str]) -> str | None:
    """Capitalised token sequence nearest the matched appointment verb."""
    candidates = []
    for match in NAME_SEQ.finditer(text):
        tokens = match.group(1).split()
        cleaned: list[str] = []
        for token in tokens:
            if token.lower().strip(".,'’-") in stoplist:
                # stoplist token ends the sequence (e.g. "Jane Doe Motherwell")
                break
            cleaned.append(token)
        if len(cleaned) < 2:
            continue
        distance = min(
            abs(match.start() - verb_span[1]), abs(verb_span[0] - match.end())
        )
        candidates.append((distance, " ".join(cleaned)))
    if not candidates:
        return None
    candidates.sort(key=lambda pair: pair[0])
    return normalize_name(candidates[0][1])


def classify(item: NewsItem, rules: RuleSet | None = None) -> Classification:
    rules = rules or load_rules()
    text = f"{item.headline} {item.body_text[:LEDE_CHARS]}".strip()
    lowered = text.lower()

    if not any(alias in lowered for alias in rules.club_aliases):
        return Classification("IRRELEVANT")

    matched: list[str] = []
    is_interim = any(rule["compiled"].search(text) for rule in rules.interim)

    for rule in rules.exclusion:
        target = item.headline if rule.get("headline_only") else text
        if rule["compiled"].search(target):
            matched.append(rule["id"])
    if matched:
        return Classification("SPECULATION", is_interim=is_interim, matched_patterns=matched)

    for rule in rules.confirmation:
        verb_match = rule["compiled"].search(text)
        if verb_match:
            matched.append(rule["id"])
            name = extract_name(text, verb_match.span(), rules.name_stoplist)
            if name:
                return Classification(
                    "CONFIRMATION", extracted_name=name,
                    is_interim=is_interim, matched_patterns=matched,
                )
            return Classification(
                "CANDIDATE", is_interim=is_interim, matched_patterns=matched
            )

    return Classification("IRRELEVANT", is_interim=is_interim)
