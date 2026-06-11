from manager_watch.monitor.dedup import (
    canonical_url,
    dedup_hash,
    is_fuzzy_duplicate,
    normalize_headline,
)


def test_normalize_headline():
    assert normalize_headline("  Motherwell APPOINT  Doe! ") == "motherwell appoint doe"


def test_canonical_url_strips_tracking_and_slash():
    url_a = "https://Example.com/news/story/?utm_source=x&id=1"
    url_b = "https://example.com/news/story?id=1"
    assert canonical_url(url_a) == canonical_url(url_b)


def test_dedup_hash_stable_across_variants():
    hash_a = dedup_hash("https://example.com/a/?utm_campaign=z", "Big News Today")
    hash_b = dedup_hash("https://example.com/a", "big news   today!")
    assert hash_a == hash_b


def test_fuzzy_duplicate():
    recent = ["Motherwell appoint Jane Doe as new manager"]
    assert is_fuzzy_duplicate("Jane Doe appointed as new Motherwell manager", recent)
    assert not is_fuzzy_duplicate("Motherwell sign striker on loan", recent)
