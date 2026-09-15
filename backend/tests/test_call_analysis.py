"""CallAnalysis tolerates the shapes the model actually returns.

Found live, not hypothetically: running a real conversation through Azure
OpenAI, the model returned `pain_points` as a JSON array of strings rather
than a single string, even though nothing in the prompt says "list." Pydantic
rejected the whole analysis on that one field, and analyze_call's except
clause discarded everything - the real score, the real summary, the drafted
email - falling back to full neutral defaults over one field's shape.

The prompt is tightened to ask for a string explicitly, but that's a
request, not a guarantee - a model that ignores formatting instructions is
exactly the kind of thing this project's own docs (docs/architecture.md,
"score against stated weights, then validate") already say not to trust
blindly. So the model itself also tolerates a list, coercing it rather than
rejecting it.
"""

from __future__ import annotations

import pytest
from pydantic import ValidationError

from app.models.schemas import CallAnalysis


def test_a_plain_string_passes_through_unchanged():
    analysis = CallAnalysis(pain_points="Manual follow-up is too slow.")

    assert analysis.pain_points == "Manual follow-up is too slow."


def test_a_list_of_strings_is_joined_into_one_string():
    analysis = CallAnalysis(
        pain_points=[
            "Sales team overwhelmed by lead volume",
            "Leads go cold due to delayed callbacks",
        ]
    )

    assert analysis.pain_points == (
        "Sales team overwhelmed by lead volume; "
        "Leads go cold due to delayed callbacks"
    )


def test_a_single_item_list_has_no_dangling_separator():
    analysis = CallAnalysis(pain_points=["Only one thing mentioned"])

    assert analysis.pain_points == "Only one thing mentioned"


def test_an_empty_list_becomes_an_empty_string_not_the_default():
    # Distinguishing "the model said there were none" from "the field was
    # never set" - both are valid, but they're different facts.
    analysis = CallAnalysis(pain_points=[])

    assert analysis.pain_points == ""


def test_omitting_the_field_entirely_still_uses_the_default():
    analysis = CallAnalysis()

    assert analysis.pain_points == "Not identified"


def test_a_shape_that_is_not_a_string_or_a_list_still_fails():
    # The coercion targets the one real failure mode observed, not every
    # conceivable shape. A dict or a number is still a genuine validation
    # error, and analyze_call's except clause is what turns that into safe
    # defaults - that fallback path is exactly what test_openai_service-style
    # coverage exercises, not this file.
    with pytest.raises(ValidationError):
        CallAnalysis(pain_points={"unexpected": "shape"})
