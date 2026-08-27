# Live integration tests

These hit real providers: Azure OpenAI, Murf, Salesforce, and a
credentials-only check against Twilio. They are **not** part of the default
test run and **not** part of CI — `pyproject.toml` sets `testpaths = ["tests"]`,
so a bare `pytest` or `uv run pytest` never collects this directory.

## Cost

Each run spends a small amount of real API credit:

| Provider     | What it does                                  | Approx. cost |
| ------------ | ---------------------------------------------- | ------------ |
| Azure OpenAI | One short chat completion, one analysis call  | a few cents  |
| Murf         | One short speech synthesis                    | a few cents  |
| Salesforce   | Creates, reads, and deletes one test Lead      | free (API calls, not licensed seats) |
| Twilio       | Fetches account + phone number info only       | free — **no call is ever placed** |

Nothing here dials a real phone number. `test_twilio_live.py` deliberately
stops short of `initiate_call`.

## Running

Requires a real `backend/.env` with the credentials you want to test. Missing
credentials cause that file's tests to skip cleanly, not fail — you can run
the whole directory with only some providers configured.

```sh
cd backend
uv run pytest tests_integration -v
```

Run one provider at a time while you're setting things up:

```sh
uv run pytest tests_integration/test_salesforce_live.py -v
```

## Cleanup

`test_salesforce_live.py` and `test_full_pipeline_live.py` create a Lead
tagged with a distinctive marker (`LeadSource="VoiceFlow"` and an
`@integration-test.invalid` email) and delete it in a `finally` block, so a
failed assertion still cleans up. If a run is killed hard enough to skip that
(a crashed process, `Ctrl+C` mid-request), search Salesforce for
`Email LIKE '%@integration-test.invalid'` and delete what's left.

## Why these live outside `tests/`

`tests/conftest.py` sets dummy credentials on `os.environ` for the entire
unit suite, so importing the app never touches a real provider. Putting live
tests in the same directory would mean whichever conftest loaded first won
for the whole process. A separate directory gives this suite its own
conftest, with no dummy values anywhere in it.
