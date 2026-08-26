"""Persona and prompt construction.

This is the logic that actually belongs to this project rather than to a
vendor SDK, so it is the part worth pinning down.
"""

import pytest

from app.personas import build_agent_profile, resolve_persona


def test_resolve_persona_reads_the_voice_table():
    persona = resolve_persona("hi-IN-khyati")

    assert persona.name == "Khyati"
    assert persona.gender == "Female"


def test_resolve_persona_falls_back_for_an_unknown_voice():
    persona = resolve_persona("xx-XX-nobody")

    assert persona.name
    assert persona.gender


def test_real_estate_agent_type_accepts_hyphen_and_underscore():
    hyphenated = build_agent_profile(
        agent_type="real-estate", lead_name="Asha", voice_id="hi-IN-khyati"
    )
    underscored = build_agent_profile(
        agent_type="real_estate", lead_name="Asha", voice_id="hi-IN-khyati"
    )

    assert hyphenated.system_prompt == underscored.system_prompt
    assert hyphenated.greeting == underscored.greeting


def test_real_estate_profile_names_the_property_company():
    profile = build_agent_profile(
        agent_type="real-estate", lead_name="Asha", voice_id="hi-IN-khyati"
    )

    assert "JK Real Estates" in profile.greeting
    assert "Khyati" in profile.greeting
    assert "Asha" in profile.greeting


def test_b2b_is_the_default_for_an_unrecognised_agent_type():
    profile = build_agent_profile(
        agent_type="something-else", lead_name="Sam", voice_id="en-IN-nikhil"
    )

    assert profile.company_name == "VoiceFlow"


def test_the_lead_name_is_carried_into_the_system_prompt():
    profile = build_agent_profile(
        agent_type="b2b", lead_name="Priya Sharma", voice_id="en-IN-anisha"
    )

    assert "Priya Sharma" in profile.system_prompt


@pytest.mark.parametrize("agent_type", ["b2b", "real-estate"])
def test_every_profile_states_the_spoken_language(agent_type):
    profile = build_agent_profile(
        agent_type=agent_type,
        lead_name="Sam",
        voice_id="en-IN-anisha",
        language="hi-IN",
    )

    assert "hi-IN" in profile.system_prompt
