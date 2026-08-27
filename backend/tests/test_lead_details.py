"""Known lead details reach the system prompt.

The call form collects budget, location, property type and buy-vs-rent, and
sent them to the API as `details`. The schema accepted the field and nothing
read it, so the agent opened by asking the caller for information the caller
had just typed into the form.
"""

from app.personas import build_agent_profile, format_details


def test_a_budget_is_stated_in_readable_form():
    assert "50L-1Cr" in format_details({"budget": "50L-1Cr"})


def test_buy_versus_rent_is_rendered_as_a_word_not_a_boolean():
    rental = format_details({"is_rent": True})
    purchase = format_details({"is_rent": False})

    assert "rent" in rental.lower()
    assert "True" not in rental
    assert "buy" in purchase.lower() or "purchase" in purchase.lower()


def test_snake_case_keys_become_readable_labels():
    assert "property type" in format_details({"property_type": "3BHK"}).lower()


def test_blank_values_are_dropped_rather_than_stated_as_empty():
    rendered = format_details({"budget": "", "location": "Hyderabad"})

    assert "Hyderabad" in rendered
    assert "budget" not in rendered.lower()


def test_no_details_renders_nothing():
    assert format_details({}) == ""
    assert format_details(None) == ""


def test_the_real_estate_prompt_carries_the_known_details():
    profile = build_agent_profile(
        agent_type="real-estate",
        lead_name="Asha",
        voice_id="hi-IN-khyati",
        details={"budget": "50L-1Cr", "location": "Hyderabad"},
    )

    assert "50L-1Cr" in profile.system_prompt
    assert "Hyderabad" in profile.system_prompt


def test_the_agent_is_told_not_to_ask_again_for_what_it_knows():
    profile = build_agent_profile(
        agent_type="real-estate",
        lead_name="Asha",
        voice_id="hi-IN-khyati",
        details={"budget": "50L-1Cr"},
    )

    assert "not ask" in profile.system_prompt.lower()


def test_a_prompt_without_details_has_no_dangling_section():
    profile = build_agent_profile(
        agent_type="real-estate", lead_name="Asha", voice_id="hi-IN-khyati"
    )

    assert "Already known" not in profile.system_prompt


def test_an_overlong_detail_value_is_truncated():
    """Details come from a public request body and land in the system prompt.

    A caller-supplied value is untrusted input reaching the model, so its
    length is capped rather than passed through whole.
    """
    rendered = format_details({"location": "x" * 5000})

    assert len(rendered) < 500


def test_a_known_budget_removes_the_instruction_to_establish_one():
    """The step list has to agree with the known-details sentence.

    Stating both "do not ask them to repeat this" and "establish their budget
    range" leaves the model to reconcile the two, and it tends to just ask.
    """
    profile = build_agent_profile(
        agent_type="real-estate",
        lead_name="Asha",
        voice_id="hi-IN-khyati",
        details={"budget": "50L-1Cr", "location": "Gachibowli"},
    )

    assert "Establish their budget range" not in profile.system_prompt
    assert "Establish their preferred location" not in profile.system_prompt


def test_an_unknown_budget_keeps_the_instruction_to_establish_one():
    profile = build_agent_profile(
        agent_type="real-estate",
        lead_name="Asha",
        voice_id="hi-IN-khyati",
        details={"location": "Gachibowli"},
    )

    assert "Establish their budget range" in profile.system_prompt
    assert "Establish their preferred location" not in profile.system_prompt


def test_with_nothing_known_both_instructions_are_present():
    profile = build_agent_profile(
        agent_type="real-estate", lead_name="Asha", voice_id="hi-IN-khyati"
    )

    assert "Establish their budget range" in profile.system_prompt
    assert "Establish their preferred location" in profile.system_prompt
