"""SOQL string literal escaping.

The lead lookup interpolated a caller-supplied email straight into a query:

    SELECT Id FROM Lead WHERE Email = '{email}' LIMIT 1

lead_email arrives from the public call-initiation endpoint, so a crafted
address could close the literal early and change what the query matched.
"""

from app.services.salesforce_service import soql_escape


def test_an_ordinary_address_is_unchanged():
    assert soql_escape("priya@example.com") == "priya@example.com"


def test_a_single_quote_is_escaped_rather_than_closing_the_literal():
    assert soql_escape("o'brien@example.com") == r"o\'brien@example.com"


def test_a_backslash_is_escaped_first_so_it_cannot_mask_a_quote():
    # A lone backslash before a quote would otherwise escape the escape,
    # leaving the quote live.
    assert soql_escape("a\\'b") == r"a\\\'b"


def test_an_injected_predicate_cannot_escape_the_literal():
    escaped = soql_escape("x' OR Email != '")
    query = f"SELECT Id FROM Lead WHERE Email = '{escaped}' LIMIT 1"

    # Exactly two unescaped quotes remain: the ones this query opened with.
    unescaped_quotes = query.count("'") - query.count(r"\'")
    assert unescaped_quotes == 2
