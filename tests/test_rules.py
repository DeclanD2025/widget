from manager_watch.trigger.rules import classify, normalize_name
from manager_watch.types import NewsItem


def item(headline: str, body: str = "") -> NewsItem:
    return NewsItem(source_name="test", publisher="test", url="http://x/",
                    headline=headline, body_text=body)


def test_official_confirmation_with_name():
    result = classify(item("Motherwell appoint Jane Doe as new manager"))
    assert result.classification == "CONFIRMATION"
    assert result.extracted_name == "jane doe"
    assert not result.is_interim


def test_named_as_head_coach():
    result = classify(item("Stephen Robinson named as Motherwell head coach"))
    assert result.classification == "CONFIRMATION"
    assert result.extracted_name == "stephen robinson"


def test_speculation_blocked():
    result = classify(item("Motherwell linked with move for Jane Doe as manager"))
    assert result.classification == "SPECULATION"


def test_question_headline_blocked():
    result = classify(item("Is Jane Doe set to be appointed Motherwell manager?"))
    assert result.classification == "SPECULATION"


def test_betting_odds_blocked():
    result = classify(item("Next Motherwell manager odds: Jane Doe the favourite"))
    assert result.classification == "SPECULATION"


def test_interim_flag():
    result = classify(item("Motherwell appoint Jane Doe as interim manager"))
    assert result.classification == "CONFIRMATION"
    assert result.is_interim


def test_irrelevant_without_club_mention():
    result = classify(item("Aberdeen appoint John Smith as new manager"))
    assert result.classification == "IRRELEVANT"


def test_departure_news_not_confirmation():
    result = classify(item("Motherwell manager Jane Doe sacked after poor run"))
    assert result.classification == "SPECULATION"  # exclusion: departure pattern


def test_candidate_when_no_name_extractable():
    result = classify(item("Motherwell appoint new manager"))
    assert result.classification == "CANDIDATE"
    assert result.extracted_name is None


def test_diacritics_normalised():
    assert normalize_name("José Mañé") == "jose mane"
