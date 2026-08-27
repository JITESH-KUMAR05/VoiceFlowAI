"""Agent personas: voice identity and the prompts built from it.

Both shipped agents run the same pipeline. They differ only in the system
prompt, the opening line, and the voice used to speak it, so all three are
constructed here rather than inline in the request handler.
"""

from __future__ import annotations

from dataclasses import dataclass

DEFAULT_VOICE_ID = "en-IN-anisha"


@dataclass(frozen=True)
class Persona:
    """The human identity the agent presents as."""

    name: str
    gender: str


@dataclass(frozen=True)
class AgentProfile:
    """Everything needed to start a conversation as a given agent."""

    persona: Persona
    company_name: str
    system_prompt: str
    greeting: str


# Murf voice id -> the persona the agent introduces itself as. The name has to
# match the voice; a female voice introducing itself as "Nikhil" is jarring
# enough that callers comment on it.
VOICE_PERSONAS: dict[str, Persona] = {
    # English (India)
    "en-IN-anisha": Persona("Anisha", "Female"),
    "en-IN-anusha": Persona("Anusha", "Female"),
    "en-IN-nikhil": Persona("Nikhil", "Male"),
    "en-IN-samar": Persona("Samar", "Male"),
    "en-IN-tanushree": Persona("Tanushree", "Female"),
    # Hindi (India)
    "hi-IN-aman": Persona("Aman", "Male"),
    "hi-IN-karan": Persona("Karan", "Male"),
    "hi-IN-khyati": Persona("Khyati", "Female"),
    "hi-IN-namrita": Persona("Namrita", "Female"),
    "hi-IN-sunaina": Persona("Sunaina", "Female"),
    # English (US)
    "en-US-ronnie": Persona("Ronnie", "Male"),
    "en-US-zion": Persona("Zion", "Male"),
    "en-US-josie": Persona("Josie", "Female"),
    "en-US-alicia": Persona("Alicia", "Female"),
    "en-US-lia": Persona("Lia", "Female"),
    # Punjabi (India)
    "pa-IN-harman": Persona("Harman", "Male"),
}

FALLBACK_PERSONA = Persona("Alex", "Male")

REAL_ESTATE_COMPANY = "JK Real Estates"
B2B_COMPANY = "VoiceFlow"


def resolve_persona(voice_id: str) -> Persona:
    """Return the persona for a voice, or a neutral fallback if unmapped."""
    return VOICE_PERSONAS.get(voice_id, FALLBACK_PERSONA)


# Details arrive in a public request body and are interpolated into the system
# prompt, so each value is capped rather than passed through whole.
MAX_DETAIL_CHARS = 80
MAX_DETAILS_CHARS = 400

# Keys whose meaning is not obvious from the key name alone.
DETAIL_LABELS = {
    "is_rent": "Looking to",
}


def _render_value(key: str, value: object) -> str | None:
    """Turn one detail into something worth saying out loud."""
    if isinstance(value, bool):
        if key == "is_rent":
            return "rent" if value else "buy"
        return "yes" if value else "no"

    text = str(value).strip()
    return text[:MAX_DETAIL_CHARS] if text else None


def format_details(details: dict[str, object] | None) -> str:
    """Render known lead details as a short, readable list.

    Empty values are dropped rather than stated as blanks: telling the model
    "Budget: " is worse than not mentioning budget at all, because it invites
    the agent to treat the field as answered.
    """
    if not details:
        return ""

    parts: list[str] = []
    for key, value in details.items():
        rendered = _render_value(key, value)
        if rendered is None:
            continue
        label = DETAIL_LABELS.get(key, key.replace("_", " ").capitalize())
        parts.append(f"{label}: {rendered}")

    return "; ".join(parts)[:MAX_DETAILS_CHARS]


def _known_section(details: dict[str, object] | None) -> str:
    """A sentence listing what the caller already told the form, if anything."""
    rendered = format_details(details)
    if not rendered:
        return ""
    return (
        f" Already known from their enquiry - {rendered}. "
        "Do not ask them to repeat any of this; acknowledge it and build on it."
    )


def _known_keys(details: dict[str, object] | None) -> set[str]:
    """Which details actually carry a usable value."""
    if not details:
        return set()
    return {
        key
        for key, value in details.items()
        if _render_value(key, value) is not None
    }


def _real_estate_steps(details: dict[str, object] | None) -> str:
    """The discovery steps still worth taking, given what is already known.

    Anything the enquiry form captured is dropped from this list. Leaving it
    in contradicts the known-details sentence directly above it.
    """
    known = _known_keys(details)
    steps = ["Find out whether this is for investment or self-use."]

    if "location" not in known:
        steps.append("Establish their preferred location.")
    if "budget" not in known:
        steps.append("Establish their budget range.")

    steps.append(
        "Once you understand what they want, suggest a site visit."
    )
    return " ".join(steps)


def _real_estate_prompt(
    persona: Persona,
    lead_name: str,
    lead_company: str | None,
    language: str,
    details: dict[str, object] | None = None,
) -> str:
    return (
        f"You are {persona.name}, a {persona.gender} Senior Property Consultant "
        f"at {REAL_ESTATE_COMPANY}. You are calling {lead_name}. "
        f"You are speaking in {language}. "
        f"Context: {lead_company or 'Interested in property'}."
        f"{_known_section(details)} "
        "Your goal is to understand their needs before pitching anything. "
        f"{_real_estate_steps(details)} "
        "Be professional, warm and empathetic. Do not rush to the close. "
        "Keep every reply under two sentences."
    )


def _b2b_prompt(
    persona: Persona,
    lead_name: str,
    language: str,
    details: dict[str, object] | None = None,
) -> str:
    return (
        f"You are {persona.name}, a {persona.gender} Solutions Consultant at "
        f"{B2B_COMPANY}. We help businesses automate sales using AI agents. "
        f"You are calling {lead_name}. You are speaking in {language}."
        f"{_known_section(details)} "
        "Sell consultatively. Start by asking about their current sales "
        "process and listen for the pain points behind the answer, such as "
        "call volume or poor conversion. Explain how the product addresses "
        "the specific problem they raised, then gently propose a demo. "
        "Be curious and helpful rather than pushy. Keep replies concise."
    )


def build_agent_profile(
    agent_type: str,
    lead_name: str,
    voice_id: str = DEFAULT_VOICE_ID,
    lead_company: str | None = None,
    language: str = "en-IN",
    details: dict[str, object] | None = None,
) -> AgentProfile:
    """Build the prompt, greeting and identity for one conversation.

    ``agent_type`` accepts either hyphen or underscore spelling because the
    frontend routes use "real-estate" while the stored records use
    "real_estate". Anything unrecognised falls back to the B2B agent.

    ``details`` is whatever the enquiry form captured - budget, location,
    property type. Passing it in stops the agent opening the call by asking
    for information the caller has already given.
    """
    persona = resolve_persona(voice_id)
    normalised = agent_type.replace("-", "_").strip().lower()

    if normalised == "real_estate":
        return AgentProfile(
            persona=persona,
            company_name=REAL_ESTATE_COMPANY,
            system_prompt=_real_estate_prompt(
                persona, lead_name, lead_company, language, details
            ),
            greeting=(
                f"Hello {lead_name}, this is {persona.name} from "
                f"{REAL_ESTATE_COMPANY}. I received your inquiry regarding a "
                "property. Is this a good time to talk?"
            ),
        )

    return AgentProfile(
        persona=persona,
        company_name=B2B_COMPANY,
        system_prompt=_b2b_prompt(persona, lead_name, language, details),
        greeting=(
            f"Hi {lead_name}, this is {persona.name} from {B2B_COMPANY}. "
            "I noticed you're looking to improve sales efficiency. "
            "Do you have a minute?"
        ),
    )
