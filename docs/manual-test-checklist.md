# Manual test checklist

Things automation in this repo cannot verify: audio quality, real telephony,
visual design across two themes, and behaviour under conditions the
automated suites don't reproduce. Run through this before treating a change
as done, or before a demo.

## Voice quality

- [ ] Start a browser call for each shipped voice (`en-IN-anisha`,
      `en-IN-nikhil`, `hi-IN-khyati`, `hi-IN-sunaina`, `pa-IN-harman`, at
      least). Confirm the greeting is intelligible and the pacing sounds
      natural, not clipped.
- [ ] Run a Hindi (`hi-IN`) conversation end to end. Confirm the model's
      replies are actually in Hindi, not English with a Hindi voice reading
      it — the language comes from `InitiateCallRequest.language`, and a
      mismatch between the persona's stated language and the voice's locale
      is a silent failure the pipeline won't catch.
- [ ] Listen for a truncated final word at the end of a reply. If it's
      happening consistently, check `MurfService.create_audio_stream`'s
      exception handling — it stops yielding on any mid-stream error.

## Real phone calls

Requires `TWILIO_PHONE_NUMBER` and a `BASE_URL` reachable from the internet
(ngrok in development).

- [ ] Place one real outbound call to a phone you control. Confirm:
  - the greeting plays before the `<Gather>` starts listening (talking over
    it means the timing in `TwilioService.create_response` needs tuning)
  - a normal pause doesn't end the call early, and a long pause does end it
    (`speechTimeout="auto"` behaviour is  Twilio's own tuning, not ours —
    confirm it still feels right)
  - hanging up up triggers the post-call pipeline: check the backend logs
    for "Post-call processing for `<CallSid>`"
- [ ] Confirm the call shows up in Twilio's console with the status
      callback events firing (`completed`, or `busy`/`no-answer`/`failed` if
      you decline it).

## Browser call — failure paths

`LiveCallInterface` is designed to recover from these; confirm it actually
does, in a real browser (Chrome or Edge — Web Speech API is Chromium-only):

- [ ] Deny microphone permission when prompted. Expect: an inline message
      about the denial, not a silently dead mic button.
- [ ] Start a call, then stop the backend process mid-conversation. Send a
      message. Expect: an inline error with a working state, not a stuck
      spinner.
- [ ] Open the same page in Firefox or Safari. Expect: the "no speech
      recognition in this browser" notice, not a crash.
- [ ] Trigger autoplay blocking — some browsers require a page interaction
      before audio plays. Reload directly into a call. Expect: the "playback
      was blocked" message rather than a stuck "speaking" state forever.

## CORS and security, from a real browser

- [ ] With the frontend running on its configured origin, confirm API calls
      succeed (open the Network tab, check no CORS errors).
- [ ] From the browser console on any *other* origin (e.g. open
      `https://example.com` and run a `fetch` against your API from its
      devtools console), confirm the request is blocked by CORS.
- [ ] `curl` a Twilio webhook route with no signature header and confirm
      `403`:
  ```sh
  curl -i -X POST http://localhost:8000/api/phone/twiml/start -d "CallSid=CA123"
  ```

## Visual — both themes, every page

Toggle the OS/browser theme (or however the app picks it up) and check each
page in both:

- [ ] Landing page, both agent dashboards, CRM/leads/calls/people views,
      analytics, the test/call screen, 404.
- [ ] Every semantic color still reads correctly in dark mode — the `live`
      amber, `connected` green, `destructive` red should not wash out or
      invert oddly.
- [ ] No `:root`-only token accidentally missing its dark redefinition (this
      is exactly the bug the original `.dark` block had before the redesign —
      identical values to light, so the toggle did nothing).

## Empty and loading states

- [ ] Point `VITE_API_BASE_URL` at a backend with no Salesforce configured.
      Every CRM/analytics view should show its empty state, not a blank
      screen or a console error.
- [ ] Throttle the network (devtools) and confirm loading skeletons appear
      before data, rather than a flash of empty content.

## Accessibility spot check

- [ ] Tab through the B2B dashboard using only the keyboard. Every
      interactive element should get a visible focus ring
      (`:focus-visible` in `index.css`).
- [ ] Run the browser's built-in accessibility audit (Lighthouse or similar)
      against one page. No pass/fail bar here — just confirm nothing
      egregious (missing labels, contrast failures on real text) crept in.

## Known gap this checklist doesn't close

`run_post_call_actions` runs as a FastAPI `BackgroundTask` — in-process,
in-memory. If the server process is killed between the webhook response
being sent and the background task finishing, the scoring, Salesforce sync,
and follow-up email for that call are silently lost; nothing retries them.
There's no manual test that reliably catches this (it needs killing the
process at exactly the right moment), and no automated one either. Worth
knowing before a demo, and it's why the fix — a durable task queue instead
of an in-process background task — is called out in
[`docs/architecture.md`](architecture.md) rather than treated as covered.
