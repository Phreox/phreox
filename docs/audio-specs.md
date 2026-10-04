# Phreox Audio Specs

Status: implementation spec v1.0 · 2026-10-04
Scope: everything audio/voice: the local voice engine in `phreox-backend`, the media datagram format, media E2EE details, and the voice responsibilities of the `phreox-space` media runtime (SFU/Edge).

> **What the "Phreox codec" really is.** Phreox does not implement its own codec (Gesamtkonzept §29: "Der Codec wird nicht selbst neu implementiert"). A clean-room codec that beats Opus is not the plan: Opus is the state of the art for real-time speech and music, and its 1.5/1.6 neural extensions do exactly what a new codec would try to do:
> - DRED: neural redundancy of up to about 1 s;
> - Deep PLC;
> - LACE/NoLACE (OSCE speech enhancement);
> - BWE (neural wideband→fullband) and QEXT/Opus HD (up to 96 kHz).
>
> The "Phreox codec" is therefore **our own build of libopus 1.6.1** with these extensions enabled (section 2), plus a better pipeline around it:
> - protection that scales with measured loss (no fixed FEC tax on clean links);
> - a recovery-aware adaptive jitter buffer;
> - deadline-bounded hop-by-hop retransmission at the SFU;
> - redundancy shaped per receiver;
> - 48 kHz float DSP without artifacts.
>
> Discord uses the same base codec (Opus via libwebrtc) but none of these extensions. Our advantage comes from configuration and pipeline, so it must be **proven by measurement** (section 16), not asserted.

---

## 0. Document status and precedence

| Document | Role for audio |
|---|---|
| `docs/PHREOX_TECHNISCHES_GESAMTKONZEPT.md` | Architecture, authorities, voice goals (§28-39, §54-56). **Authoritative.** |
| `docs/PXP.md` | Protocol, transport, MLS, media E2EE (sections "Voice, Kamera und Screenshare", "Media Security und SFU", "Transport"). **Authoritative.** |
| `docs/PURELINE_SPECIFICATION_1.2.md` | Code style for all code written from this spec. **Mandatory.** |
| `docs/audio-specs.md` (this file) | Fills in everything audio-related that the two documents above do not define yet. |

Rules:
- If this file contradicts the Gesamtkonzept or PXP, **those documents win**. Fix this file, do not work around them.
- Where those documents already define something, this file only references and refines it (section 1). Everything else in this file is new definition.
- Things this file proposes that would also change PXP (for example the compact media datagram header) are marked **[PXP-PROPOSAL]** and listed in section 18.2. They need the owner's confirmation before they become protocol.
- All code follows Pureline 1.2. For this spec the rules that matter most:
  - at most **8 production top-level types per package** (PL-STRUCT-002); section 13 is already split accordingly;
  - interfaces use the `I` prefix (`IAudioDevice`, `IAudioProcessor`);
  - guard clauses, no `else`, always braces, records for immutable data, explicit `if (x == null)`;
  - no `util`/`helper` dumping grounds (PL-JAVA-001);
  - lifecycle symmetry: every native handle, thread, stream and subscription has a matching close/stop/unsubscribe (PL-JAVA-010);
  - hot paths optimised deliberately (Pureline §18): no allocation, no blocking, no reflection on capture/receive/playout threads.

---

## 1. Already defined elsewhere (adopted, binding)

Implementers must follow these. They are summarised here so this file is self-contained; the source is the reference.

| Topic | Binding definition | Source |
|---|---|---|
| Where the engine runs | Voice engine, audio capture/playback, media E2EE, recording run in the local Java backend (`phreox-backend`). React only shows controls and diagnostics; no voice internals in the frontend. | Gesamtkonzept §4.2, §4.3; PXP "Lokale Phreox-Architektur" |
| Where the SFU runs | Voice channels belong to the **`phreox-space` media runtime** (module `media`). It is an SFU/Edge and routes encrypted frames without decrypting. `phreox-service` has no voice role. | Gesamtkonzept §3.2, §3.3, §10, §38 |
| Codec | Native libopus via FFM, not reimplemented. Direction: Opus, FEC, PLC, DRED, Deep PLC, Neural BWE, newer Opus quality modes, adaptive bitrate, adaptive frame size, adaptive loss settings. 2.5/5 ms frames allowed in low-latency profiles, not as a global default. | Gesamtkonzept §29 |
| libopus version | libopus 1.6 with DRED/OSCE. DRED capability is negotiated per room because the 1.6 DRED model is not bitstream-compatible with 1.5. | PXP "Voice, Kamera und Screenshare" |
| Pipeline | Microphone → native capture → audio processing → Opus encode → media E2EE → realtime transport → phreox-space SFU/Edge → realtime transport → adaptive jitter buffer → DRED/FEC/PLC → Opus decode → mixing → native playback. Late packets are dropped rather than waited for. "Latenz minimieren, solange Qualität und Verständlichkeit stabil bleiben." | Gesamtkonzept §30 |
| Jitter buffer principles | Dynamic; considers jitter, loss, RTT, burst loss, stability, DRED availability, FEC configuration, device buffering. No fixed target. Aggressively low on stable networks, rises only as needed, falls again when stable. | Gesamtkonzept §31 |
| Native audio paths | Windows → WASAPI, Linux → PipeWire, macOS → CoreAudio, via FFM or a small native layer. The orchestrator stays Java. | Gesamtkonzept §32, §57 |
| Session states | `CONNECTED → DEGRADED → RECONNECTING → CONNECTED`; short outages do not cause leave/join; grace period; `SESSION_RESUME`; avoid permission reloads, rejoins, state rebuilds and key renegotiation. | Gesamtkonzept §33 |
| Path migration | Network changes (WiFi → mobile) keep the same session; QUIC connection IDs and path migration. | Gesamtkonzept §34 |
| Edges | Regional edges; selection by RTT, jitter, loss, stability, route quality, capacity, not ping alone. A distributed voice fabric (edge-to-edge forwarding) comes later. | Gesamtkonzept §35, §36 |
| Tracks | `AUDIO/MICROPHONE`, `AUDIO/SYSTEM` (and video tracks). A device may publish several tracks at once; no artificial per-user limits. System audio is its own track. | PXP; Gesamtkonzept §37 |
| Transport | QUIC, ALPN `pxp/1`. Reliable streams for control (JOIN, LEAVE, MUTE, KEY_ROTATE, SYNC, SESSION_RESUME). Realtime media over QUIC DATAGRAM (RFC 9221) without retransmits. Fallback when UDP is blocked: WebSocket over TLS with identical frame format. Netty-based networking. | PXP "Transport"; Gesamtkonzept §20 |
| PXP framing | 34-byte big-endian frame header (`protocolVersion`, `frameType`, `flags`, `cipherSuite`, `conversationId`, `sequence`, `payloadLength`). Frame type `MEDIA_CONTROL` (0x40) exists. Implemented in `talk.phreox.api.pxp`. | PXP "Frame-Header" |
| Media E2EE | Always on, also in `PUBLIC` spaces. One MLS group per voice call (current participant devices). SFrame (RFC 9605). `base_key = MLS-Exporter("pxp media v1", context, 32)` with context `audio/<device>`, `system-audio/<device>/<track>`. New epoch on membership change → new keys. SFrame KID encodes epoch and sender/track. Previous epoch key valid for a short transition window. Cipher suite AEAD, e.g. `AES_128_GCM_SHA256_128`. Replay window per KID on the SFrame counter. | PXP "Media Security und SFU", "Replay-Schutz"; Gesamtkonzept §38 |
| What the SFU may see | Session, sender, track ID, media type, layer, sequence/timing, network metrics. Nothing else. | PXP "Was der SFU sehen darf" |
| MLS access | Through the native `libphreox_mls` facade (`px_mls_export` etc.) via FFM. Voice never touches OpenMLS types. | PXP "Native MLS-Fassade"; Gesamtkonzept §58 |
| Local bridge security | Bridge binds `127.0.0.1` only; random session token per start that only the Phreox app receives; `Host` and `Origin` checks (DNS rebinding). Routes under `/api/v1`, own annotations, controllers do not know the HTTP library. | PXP "Lokale Frontend-Bridge"; Gesamtkonzept §5 |
| Capability vs entitlement | Capability = can the runtime do it; entitlement = may this user/space use it (signed by `phreox-service`). Example feature id `media.voice.hd`. Spaces advertise capabilities such as `media`. | Gesamtkonzept §15.3, §15.4, §61 |
| Voice UI and diagnostics | Normal users see "18 ms · Excellent". Power users see latency, jitter, packet loss, codec, frame size, edge, transport, encryption, DRED status. Speaking = subtle violet-blue aura. | Gesamtkonzept §54, §55 |
| Observability | Metrics include RTT, jitter, packet loss, resume rate, voice decode errors, DRED usage. No private content in diagnostics. | Gesamtkonzept §56 |
| Recording | Runs in the Java backend: incoming media → decrypt → decode → mix or separate tracks → recording encoder → file. Frontend gets only status and controls (`recording.started`, `recording.stopped`, `recording.duration`). Server-side recording must join as an explicit participant with keys. | Gesamtkonzept §39 |
| Latency promise | No universal "< 30 ms" promise; the whole chain (capture, frame accumulation, encode, network, jitter buffer, decode, device buffering) counts. | Gesamtkonzept §28 |

---

## 2. Binding decision: we build libopus 1.6.1 ourselves and ship it

Phreox **always** uses its own build of libopus **1.6.1**, bundled with the app on every platform. The OS-provided libopus is never used in production.

Why:
1. **DRED model compatibility.** The DRED model of Opus 1.6 is incompatible with 1.5. Source (opus-codec.org/demo/opus-1.6): "Since DRED is signaled in the bitstream, the new model is incompatible with the version in Opus 1.5 … using a 1.5 encoder with a 1.6 decoder (or vice versa) will not result in any unwanted sounds, but any DRED information will not be available to an incompatible decoder." A mismatch is **silent**: no artifacts, but zero DRED recovery while the DRED bits are still paid for. Only one pinned build on every client prevents this.
2. **Features depend on build flags.** The Arch Linux system lib 1.6.1 on the dev machine has DRED, Deep PLC and LACE/NoLACE, but `OPUS_SET_OSCE_BWE` (4054) and `OPUS_SET_QEXT` (4056) return `-5` (`OPUS_UNIMPLEMENTED`) on that build. Per the official 1.6 notes, BWE needs `--enable-osce` and QEXT needs `--enable-qext`; which exact flag the distro build lacks does not matter, because we never rely on a distro build. Windows and macOS ship no libopus at all.
3. **Reproducibility.** The benchmark (section 16) must measure the exact binary users get.

Build definition:
- Source: the official libopus **1.6.1** release tarball; its SHA-256 is pinned in the build script and verified before building.
- Configure (autotools): `--enable-dred --enable-osce --enable-qext`. Float build. Model weights compiled in, so `OPUS_SET_DNN_BLOB` is never needed. The equivalent CMake option names must be read from the 1.6.1 `CMakeLists.txt` if CMake is used (open question Q1).
- Optimisation: `-O3`, x86-64-v2 baseline plus libopus' own runtime CPU dispatch; arm64 with NEON.
- Targets: linux-x64, linux-arm64, windows-x64, macos-arm64, macos-x64.
- Output goes to `phreox-backend/src/main/resources/natives/<os>-<arch>/` through the Maven profile `natives`; `NativeLoader` extracts it by SHA-256 (section 12.3).
- License: libopus is BSD-3-Clause; the notice ships in the app's third-party licenses.

Runtime rules:
- At startup `OpusCapabilities` (section 12.3) checks: version string is exactly the pinned `1.6.1`; DRED, OSCE BWE (decoder complexity ≥ 4 required at runtime) and QEXT ctls return 0; the functional DRED check passes.
- **CI gate:** the build of every target fails if any of these checks fails.
- Developer override: `PHREOX_NATIVE_OPUS=/path/to/libopus.so` is allowed for local experiments only. It is reported as `degraded` in `/capabilities` and in diagnostics, and DRED is announced with the DRED model that the probe actually detects.
- Each client announces `opusVersion` and `dredModel` (`"1.6"`) in its media JOIN (section 9.5). The SFU computes the room's common `dredModel`. If any receiver differs, senders set `DRED_DURATION = 0` and protect with LBRR/FEC instead, so no bits are wasted.
- Upgrade policy: a future libopus with a new DRED model is a coordinated rollout. Bump `dredModel`; mixed rooms fall back to LBRR automatically until all clients are updated.

---

## 3. Verified ground truth (dev machine, 2026-10-04)

Verified on the dev machine against `/usr/lib/libopus.so.0` (1.6.1, float build) and the headers in `/usr/include`. The probes were throwaway C/Java programs; every fact below that the code relies on is re-checked by a unit test (section 16.7).

| Fact | Consequence for the design |
|---|---|
| The system libopus has DRED, deep PLC and LACE/NoLACE. **OSCE BWE (4054) and QEXT (4056) return -5 (OPUS_UNIMPLEMENTED).** | We never use the distro build (section 2). Our own build enables both; the probe checks them at runtime. No quality target depends on them until measured. |
| With APPLICATION_AUDIO + SIGNAL_VOICE, constrained VBR, FEC0 and PLP0, the encoder is **hybrid at 40-60 kbps** and **CELT-only from 64 kbps**. | The CELT fullband advantage exists only at 64k and above. The STD 48k tier is hybrid. |
| **Any PLP > 0 forces hybrid at 64k with SIGNAL_VOICE**, even with FEC0 and DRED0. At 128k, FEC0/PLP3 stays CELT. SIGNAL_MUSIC with FEC0/PLP3 at 64k stays CELT. | Clean-tier protection policy (section 6.4). |
| DRED is emitted only when PLP > 0, and its size depends on PLP, bitrate and FEC. With FEC=1, LBRR competes with DRED for bits (64k/PLP5/FEC1 gives 0 ms DRED; 64k/PLP5/FEC0 gives 416 ms). There is no DRED at 24k or below, and only about 15 ms at 32k with PLP20. | The DRED-aware policy table in section 6.4. Never claim "DRED is always on". |
| DRED shrinks the primary stream **and** pushes the total above `OPUS_SET_BITRATE` (64k/PLP20/FEC1 gives 71.6 kbps total, of which 37.0 kbps is primary). | The rate controller budgets with **measured packet bytes**, never with the configured bitrate. |
| Unconstrained VBR in CELT mode overshoots: a 64k target gave **113 kbps**. Constrained VBR gives 64.4. | Constrained VBR (`VBR_CONSTRAINT=1`) everywhere. An earlier design's "LSD 7.8 vs 12.2 dB" clean claim was probably measured at about 113 vs 60 kbps and is **void until re-measured** at equal wire bitrate (slice 2). |
| Valid DRED offsets satisfy `dred_end < offset <= parse_ret`. `opus_decoder_dred_decode_float` returns `frame_size` **even outside coverage, and when `opus_dred_process` was never called after a deferred parse**. In both cases it silently produces PLC. | The application must check both bounds and process explicitly, and must count DRED only after those checks pass (section 10.3). |
| RNNoise has a **960-sample (20 ms) algorithmic delay**. speexdsp preprocess delay equals its frame size. | RNNoise is an opt-in STRONG mode. The dry signal must be delayed 960 samples before wet/dry mixing. The 20 ms appears in the latency budget and the UI. |
| Cost at decoder complexity 10, per 20 ms frame: normal decode 33-110 µs, **deep PLC 510-675 µs**, DRED decode 300-350 µs. Encode costs 90-240 µs. | CPU budgets are sized for concealment bursts, not for normal decodes. |
| `OPUS_SET_APPLICATION` after the first encode returns -1. | Changing the application needs a new encoder. All normal tiers use AUDIO, so no switch is needed. Competitive mode uses a separate encoder that is swapped in during silence. |
| The system PortAudio is V19.7.0-devel with **ALSA, OSS and JACK only (no PulseAudio host API)**. The ALSA `default` device reports 44100 Hz. Blocking xruns appear only as return codes −9981 and −9980. | Only relevant for the PortAudio fallback (section 8.1): it reaches PipeWire through pipewire-alsa, must open 48 kHz explicitly, and counts xruns from those return codes. |
| `webrtc-audio-processing-2` has C++ API only. `residual_echo_likelihood` is filled only when an EchoDetector is injected, and none is installed. | Use an extern "C" shim (`libphreox_apm`). EchoPolicy uses ERLE and `divergent_filter_fraction` only. |
| `javax.crypto` AES-GCM needs a new `GCMParameterSpec` and `Cipher.init` per packet, which allocates a little. | Accepted for v1 (section 9.4); a zero-allocation alternative is Q14. |
| **DRED model 1.6 ≠ 1.5.** opus-codec.org/demo/opus-1.6: "Since DRED is signaled in the bitstream, the new model is incompatible with the version in Opus 1.5 … any DRED information will not be available to an incompatible decoder." A mismatch is silent: no artifacts, but zero DRED recovery while the DRED bits are still spent. | **Hard requirement: libopus ≥ 1.6 on every client, always our bundled build** (never the OS lib in production). The DRED model generation is a negotiated capability (`dredModel`, sections 2 and 9.5). DRED is enabled for a sender only if **every current receiver in the room** reports the same `dredModel`; otherwise `DRED_DURATION=0` and the bits go to the primary stream (LBRR policy instead). |
| BWE needs a libopus built with `--enable-osce` **and** decoder complexity ≥ 4 at runtime (`OPUS_SET_OSCE_BWE(1)`). QEXT/Opus HD needs `--enable-qext` and `OPUS_SET_QEXT(1)` on the encoder; decoders consume HD layers automatically unless `IGNORE_EXTENSIONS(1)`. New 24-bit API: `opus_encode24`/`opus_decode24`/`opus_decoder_dred_decode24` (opus_int32, low 24 bits). Source: opus-codec.org/demo/opus-1.6. | Resolves most of Q1: the bundled build uses `--enable-dred --enable-osce --enable-qext` (autotools; CMake equivalents to be read from the 1.6.1 tree). Our decoders run at complexity 10, so the ≥ 4 condition always holds. |
| `DRED_DURATION` accepts 0..104 (in 10 ms units). It is an encoder-only ctl. | We set 100 (1 s). |
| Repo state (2026-10-04): `phreox-backend` has the module system (`AppRuntime` on 127.0.0.1:8080, `ModuleManager`, `IBackendModule`, `IEventBus`, `FrontendBridge`, `WorkEngine`, a `message` module). `ApiRoutes` has `HEALTH`, `BACKEND_STATE`, `BACKEND_EVENTS`. `phreox-api` has `talk.phreox.api.pxp` (`FrameHeader` 34 B, `FrameType` incl. `MEDIA_CONTROL` 0x40, `CipherSuite`). `phreox-space` and `phreox-service` exist as modules without media code. | Voice is a new backend module (`VoiceModule`) in new packages (section 13). It reuses `IEventBus`, `FrontendBridge` and the PXP classes and does not restructure existing code. |

---

## 4. Goals and measurable targets compared with Discord

**Product goal:** far surpass Discord in voice quality, resilience and latency. In line with Gesamtkonzept §28 there is no universal latency promise; every latency target below names its exact conditions.
**Discord-like baseline (B0)**, defined exactly in section 16.2:
- Opus via libwebrtc, VOIP mode, 64 kbps, 20 ms frames, in-band FEC, PLP following the measured loss.
- No DRED. Decoder complexity 0 (classic PLC).
- NetEq-like jitter buffer with a P95 target and accelerate/expand.
- Krisp noise suppression. We compare our NS with DNSMOS separately.

B0 measured on the system lib: VOIP 64k FEC1 PLP10 DRED0 gives **60.1 kbps, hybrid, LBRR in 609/724 packets**.

All quality targets are judged on **paired, per-utterance differences with 95% bootstrap confidence intervals**:
- "Better" means the lower CI bound is above the margin.
- "No worse" means the lower CI bound is at least −tolerance.

Equal-bitrate claims compare **measured wire kbps within ±3%**. The harness calibrates B0's target to hit Phreox's measured kbps.

| # | Dimension | Condition | Metric | Pass threshold (Phreox − B0) | Gate |
|---|---|---|---|---|---|
| T1 | Clean fidelity | 0% loss, HD vs B0 at equal wire kbps | ViSQOL v3 audio mode (48 kHz) MOS-LQO | ≥ +0.15 | CI |
| T2 | Clean, no regression | 0% loss | NISQA MOS, PESQ-WB | ≥ −0.05 NISQA (PESQ is reported only, because of its known bias against CELT) | CI |
| T3 | Light loss | Gilbert-Elliott (GE) 5%, mean burst 1.5 | PESQ-WB / ViSQOL speech | ≥ +0.10 / ≥ +0.10 | CI |
| T4 | Moderate loss | GE 10%, burst 2.5 | PESQ-WB; residual frame loss after recovery | ≥ +0.30; residual ≤ 0.3× B0; hard-PLC frames ≤ 1% of all frames | CI |
| T5 | Heavy loss | GE 20%, burst 3 | PESQ-WB; eSTOI; ViSQOL speech | ≥ +0.40; ≥ +0.02; ≥ +0.40 | CI |
| T6 | Extreme loss | GE 30%, burst 3 | ViSQOL speech | ≥ +0.50 | nightly |
| T7 | Fairness | T4/T5 conditions with **P-eq** (Phreox constrained to B0's total wire kbps) | PESQ-WB | ≥ +0.20 | CI |
| T8 | Outage | single 200 ms outage in speech | audible-gap ms (PLC + comfort noise) | ≤ 60 ms (B0 is expected to be about 180 ms) | CI |
| T9 | Adaptation | onset of 10% bursty loss | time from first loss to the new encoder config on the wire | ≤ 250 ms (1 feedback tick + RTT) | CI (simulated) |
| T10 | Latency, local pipeline | HD, 20 ms frames, NATURAL NS, JB at floor, localhost through a local phreox-space | mouth-to-ear (click test) | p50 ≤ 80 ms, p95 ≤ 95 ms | E2E |
| T11 | Latency, Competitive | 10 ms frames, low-delay NS, JB floor 10 ms | mouth-to-ear | p50 ≤ 55 ms; and ≥ 25 ms below the real libwebrtc baseline measured in the same rig (section 16.6) | E2E |
| T12 | Jitter-buffer delay | clean/low-jitter traces (σ ≤ 5 ms) | added JB delay | p50 ≤ 30 ms; late-loss < 0.5% on all jitter traces | CI |
| T13 | CPU | dev box, single core | capture chain + encode | ≤ 2% of a core; playout tick p99 ≤ 3 ms with 8 streams, of which 2 are concealing | JMH/JFR |
| T14 | Real-time hygiene | 30 min soak | Java allocation on capture/rx/playout threads; ZGC pause; xruns | 0 B/frame outside SFrame crypto (crypto is reported separately, 9.4); p99.9 < 1 ms; ≤ 1 xrun / 30 min | soak |
| T15 | Subjective | MUSHRA, ≥ 20 listeners | preference HD 64k vs B0 64k | ≥ 70% (binomial p < 0.01) | release |

Claims from the design phase that were **removed or downgraded**:
- "CELT-only at 48k": false.
- "Clean LSD 7.8 vs 12.2 dB": invalid because the bitrates were unequal. It is re-measured in slice 2.
- Every BWE or QEXT benefit: not part of any target until slice 2 measures it.

---

## 5. Architecture and thread model

### 5.1 Topology

```
 Electron shell + React UI (phreox-app, phreox-frontend)
        |  local bridge: HTTP + WS on 127.0.0.1, session token, Host/Origin check (control + events only, never audio)
        v
 phreox-backend (local JVM, one per user)                    phreox-space (Home node of the space)
 +---------------------------------------------+             +-------------------------------------------+
 | VoiceModule (IBackendModule)                |   QUIC      | media module (SFU / Edge)                 |
 |  VoiceEngine                                |  "pxp/1"    |                                           |
 |   MediaControlClient  -- reliable stream -->|<----------->|  MEDIA_CONTROL: join/leave/mute/resume,   |
 |                          (MEDIA_CONTROL)    |             |  room caps, tier hints, forward state     |
 |   MediaTransport      == QUIC DATAGRAM ===> |<===========>|  DatagramIngress -> SpeakerRanker ->      |
 |                          (media, feedback)  |             |  PacketCache (NACK) -> DownlinkShaper     |
 |   Capture / NetRx / Playout / Control       |  fallback:  |  FeedbackAggregator, EgressBudget         |
 |   MediaKeyRing <- MLS service (px_mls_export)|  WSS, same  |  never decrypts, never decodes            |
 +---------------------------------------------+  frames     +-------------------------------------------+
```

- The backend's existing `SpaceConnectionManager` concept (Gesamtkonzept §6) owns the QUIC connection to each space node. Voice opens its streams and datagram channel **on that connection** when one exists; it does not open a second connection to the same node.
- The MLS group of a call is managed by the backend's MLS service (PXP). Voice only consumes exported keys and epoch changes (section 9.4).

### 5.2 Media pipeline

```
SEND (CaptureThread, platform thread, MAX_PRIORITY, zero alloc)
 IAudioDevice.read(480 fr, f32, 48 kHz)                    -- native backend per OS (section 8)
   -> [Resampler (speex q10) only if device != 48 kHz]
   -> APM#1 (HPF, AEC3 if EchoPolicy=on, NS kLow/kModerate if NATURAL)
   -> [RNNoise if STRONG: +20 ms, dry path delayed 960 samples]
   -> APM#2 (AGC2 adaptive digital + limiter)
   -> VadGate (V bit, level dBov, talkspurt M bit, TX gating with 300 ms hangover)
   -> FrameAccumulator (2 x 10 ms -> 960 samples; 480/240/120 in low-latency profiles)
   -> OpusEncoderHandle.encode (cx10, CVBR, config from EncoderController via AtomicReference)
   -> SendRing (primary + DRED-stripped copy via opus_packet_unpad)
   -> SframeCipher.encrypt (primary; RED copies are separate SFrame objects, section 9.4)
   -> MediaDatagramCodec: media header | [RED section] | SFrame(primary)
   -> MediaTransport.send (QUIC DATAGRAM; never blocks the capture thread)

RECEIVE (transport receive callback, e.g. Netty event loop; must not block)
 datagram -> MediaDatagramCodec.parse -> extend seq (ROC) -> ReplayWindow (per KID, SFrame CTR)
   -> SframeCipher.decrypt primary (+RED blocks only if their slots are empty)
   -> RemoteStream.slotRing.publish(extSeq) -> DelayEstimator.onArrival -> NackTracker.onGap

PLAYOUT (PlayoutThread, platform thread, MAX_PRIORITY, master clock, zero alloc)
 every 10 ms, for each RemoteStream:
    JitterBuffer.pull10ms() -> (every 2nd tick) LossConcealer.produceFrame(n)
       ladder: packet/RED/ARQ -> LBRR(n+1) -> DRED(earliest m>n, validated) -> deep PLC -> CNG
    -> DriftCorrector (speex_resampler_set_rate_frac, +/-0.1%) -> [Wsola if |buf-target| > 40 ms in speech]
    -> per-peer gain -> Spatializer (mono->stereo) -> [RecordingTap, section 8.4]
 Mixer (float sum) -> opus_pcm_soft_clip -> APM#1.ProcessReverseStream (AEC reference, downmix)
   -> IAudioDevice.write(480 fr, stereo f32)

CONTROL (ControlThread, platform thread, 100 ms tick)
 FeedbackProcessor, BandwidthEstimator (trendline + loss classifier), LossStateMachine ->
 EncoderController -> AtomicReference<EncoderConfig>, NACK aging, session state machine, stats snapshot

BRIDGE (existing FrontendBridge/Javalin, virtual threads): reads stats snapshots only, never touches audio.
MEDIA CONTROL: reliable QUIC stream (PXP MEDIA_CONTROL frames), handled on the transport's executor.
DECODE POOL (optional): 2-4 platform threads, used when > 6 active streams or > 2 streams concealing.
```

### 5.3 Thread handoffs (all lock-free, all preallocated)

| From → To | Mechanism |
|---|---|
| Receive → Playout (packets) | One `JitterSlotRing` per stream: 64 slots indexed by `extSeq & 63`. Each slot has a preallocated `byte[1500]`, len, extSeq, arrivalNanos and flags. The receiver writes the slot first, then publishes `extSeq` with `VarHandle.setRelease`. Playout reads it with `getAcquire`. |
| Control → Capture (encoder config) | `AtomicReference<EncoderConfig>`. Capture reads it once per frame, diffs it against the previously applied config, and calls only the ctls that changed. |
| Playout → Capture (AEC reference) | `ProcessReverseStream` is called on PlayoutThread. APM serialises render and capture internally. For the speex fallback, an `SpscFloatRing` carries the far-end signal. |
| Receive/Playout → Control (stats) | `LongAdder` / `AtomicLongArray` counters and fixed-bin histograms (`VoiceMetrics`). |
| Capture/Control → transport | A bounded SPSC queue of preallocated datagram buffers drained by the transport's own thread when the QUIC library's send API is not safe to call from foreign threads. Never block the capture thread; if the queue is full, drop the oldest RED-only datagram first, then count a send drop. |
| MLS service → crypto | `MediaKeyRing` receives epoch changes as immutable records and swaps them in with one volatile write (section 9.4). |

JVM flags:
```
--enable-native-access=ALL-UNNAMED -XX:+UseZGC -Xms128m -Xmx256m -XX:+AlwaysPreTouch
```
The jar manifest also sets `Enable-Native-Access: ALL-UNNAMED`. At startup, a 2 s warm-up encodes, decodes, conceals, encrypts and DSP-processes silence before the first join.

---

## 6. Codec configuration

### 6.1 Encoder creation and static ctls

```
opus_encoder_create(48000, ch, OPUS_APPLICATION_AUDIO=2049, &err)   // ch=1 voice, 2 MUSIC/STAGE
```

| ctl | id | value |
|---|---|---|
| SET_COMPLEXITY | 4010 | 10 |
| SET_SIGNAL | 4024 | 3001 VOICE. In CLEAN-G and MUSIC/STAGE, 3002 MUSIC (see 6.4). |
| SET_VBR | 4006 | 1 |
| SET_VBR_CONSTRAINT | 4020 | **1** (constrained). This fixes the 113 kbps overshoot. |
| SET_MAX_BANDWIDTH | 4004 | 1105 FULLBAND |
| SET_LSB_DEPTH | 4036 | 24 |
| SET_DTX | 4016 | **0**. VadGate stops transmission after its hangover instead. The encoder keeps encoding silence frames and discards them, so its state stays warm. |
| SET_PREDICTION_DISABLED | 4042 | 0. SEVERE A/B variant: 1. |
| SET_FORCE_CHANNELS | 4022 | -1000 AUTO |
| SET_EXPERT_FRAME_DURATION | 4040 | 5000 FRAMESIZE_ARG. Pass exactly 960 samples (480 in Competitive). Passing more than the selected duration silently encodes only the first part, and passing fewer returns -1. |
| SET_DRED_DURATION | 4050 | 100 (1 s; the encoder accepts up to 104). The DRED actually emitted is decided by PLP, bitrate and FEC. |
| SET_QEXT | 4056 | 1 only in STAGE (≥ 256 kbps stereo), after the probe confirmed it (always true with our build, section 2). Never in other tiers: the 1.6 header warns that QEXT hurts quality unless the bitrate is high. |
| GET_LOOKAHEAD | 4027 | Read once: 312 samples for AUDIO, 120 for RESTRICTED_LOWDELAY. Used for latency accounting and bench alignment. |

Dynamic ctls, changed only between frames and never with an encoder reset:
- SET_BITRATE 4002
- SET_INBAND_FEC 4012
- SET_PACKET_LOSS_PERC 4014
- SET_SIGNAL 4024

### 6.2 Decoder

```
opus_decoder_create(48000, streamChannels, &err)
```
- SET_COMPLEXITY 4010 = **10**. This enables deep PLC (≥ 5), LACE (6) and NoLACE (≥ 7). The decoder default is 0, so it must be set.
  - CPU guard: streams ranked 7th or lower by level drop to 7 (NoLACE, deep PLC).
  - If the decode pool is saturated, they drop to 5 (deep PLC only).
- SET_OSCE_BWE 4054 = 1 when the probe returned 0 (our build). It needs decoder complexity ≥ 4, which always holds here. It only changes **wideband** streams (RESCUE/LOW tiers, Bluetooth-HFP senders), so its gain is at low bitrates.
- SET_IGNORE_EXTENSIONS 4058 = 0. This does not affect DRED.
- SET_GAIN 4034 = 0. Gain is applied in the mixer.
- DRED objects:
  - one `OpusDREDDecoder` per decoding thread (`opus_dred_decoder_create`);
  - per stream, a pool of 4 `OpusDRED` (`opus_dred_alloc`) used as a cache keyed by `extSeq`.

### 6.3 Tier ladder (bitrate ceilings)

Tiers are user- or auto-selected ceilings. The LossState (6.4) chooses the protection inside a tier. Wire kbps values are measured on the system lib with espeak speech, 20 ms frames and CVBR. Add about 39 kbps of QUIC/SFrame/IP header overhead at 50 pps (9.2).

| Tier | Target | Ch | Notes |
|---|---|---|---|
| RESCUE | 24k | 1 | hybrid/SILK, **no DRED is possible at this rate**. LBRR plus deep PLC only. 40 ms frames if total bandwidth is below 40 kbps. |
| LOW | 32k | 1 | DRED is negligible (about 15 ms at PLP20). LBRR plus ARQ. |
| STD | 48k | 1 | **Hybrid in every state.** No CELT claim. |
| **HD (default)** | 64k | 1 | CELT FB in CLEAN, hybrid when protected. |
| STUDIO | 128k | 1 | CLEAN-with-DRED: FEC0 PLP3 gives **CELT 86.6 kbps primary + 685 ms DRED**, 139.8 kbps total. Protected and fullband at the same time. |
| MUSIC | 160-256k | 2 | SIGNAL_MUSIC, FEC0, PLP per LossState. |
| STAGE | 320-510k | 2 | Plus QEXT=1 (our build, probe-checked). |

### 6.4 DRED-aware loss policy (EncoderController)

Inputs, every 100 ms tick:
- receiver/SFU FEEDBACK;
- a short window: loss and bursts over the last 500 ms;
- a long window: EWMA with a 10 s time constant;
- mean burst length from a Gilbert-Elliott fit over 10 s;
- `classifier ∈ {RANDOM, CONGESTION}` from the BandwidthEstimator (9.7);
- the SFU's `protectionHint` (max residual loss across this sender's receivers).

Rules:
- **Escalate** on the short window, immediately: any burst of 2 or more frames, or loss ≥ 2% in 500 ms. A slow EWMA (α = 0.1) could not meet a 300 ms reaction time.
- **De-escalate** one state only after 10 s with long-window loss below 0.6× the lower threshold.

Values for HD (64k), with measured results:

| State | Trigger | FEC | PLP | SIGNAL | Bitrate | Measured: total / primary kbps, DRED reach, LBRR | RED |
|---|---|---|---|---|---|---|---|
| **CLEAN** | loss < 0.5% and no burst ≥ 2 in 10 s | 0 | 0 | VOICE | 64k | 64.4 / 64.4, 0 ms, none. **CELT FB** | onset only |
| **CLEAN-G** *(A/B candidate)* | same | 0 | 3 | **MUSIC** | 64k | 69.8 / 45.6, **153 ms**, none. **CELT** | onset only |
| LIGHT | 0.5-3%, mean burst < 1.5 | 1 | 5 | VOICE | 64k | 60.6 / 60.6, 0 ms, LBRR 84% | depth 1 if BWE ≥ 2× codec rate |
| MODERATE | 3-10%, or mean burst ≥ 1.5 | 1 | 10 | VOICE | 64k | 66.8 / 48.6, 74 ms, LBRR | off |
| MODERATE-B *(burst-dominant A/B)* | mean burst ≥ 2.5 | **0** | 5 | VOICE | 64k | 74.3 / 33.4, **416 ms**, none | off |
| SEVERE, RANDOM | > 10%, no delay-gradient overuse | 1 | 20 | VOICE | **step up to 96k** if BWE ≥ 1.3 × (106 + 26) kbps | 106.1 / 48.3, **830 ms**, LBRR | off |
| SEVERE, CONGESTION | > 10% with OVERUSE or RTT > 1.5× minimum | 1 | 20 | VOICE | **step down**: 48k, then 40k | 53.9 / 31.3, 268 ms; then 45.1 / 28.4, 114 ms | off |
| floor | BWE < 70 kbps total | 1 | 20 | VOICE | 32k, then RESCUE 24k | DRED ≤ 15 ms / none | off |

Rules that come out of the measurements:
1. **CLEAN is the only state where HD is CELT fullband.** Any PLP > 0 under SIGNAL_VOICE makes it hybrid. CLEAN-G keeps CELT with SIGNAL_MUSIC plus a DRED guard, at the cost of about 19 kbps less primary. Slice 2 decides between CLEAN and CLEAN-G on a mix of clean (weight 0.7) and 1% random loss (weight 0.3), scored by ViSQOL audio. Both are implemented. The loser stays available as a setting.
2. In CLEAN (no LBRR, no DRED), the first losses of an episode are covered by **talkspurt-onset RED** (9.2), **SFU ARQ** and **deep PLC**, and then by the fast escalation above.
3. **DRED needs bitrate.** Under random loss, raise the bitrate and never lower it. Lower the bitrate only on congestion. Below 40k, DRED is effectively gone and the policy relies on LBRR and ARQ.
4. **Wire bitrate is above the target** whenever PLP > 0. BandwidthEstimator and the tier fit use the **measured EWMA of bytes sent** (codec + RED + headers), never `OPUS_SET_BITRATE`.
5. The per-state values for STUDIO, MUSIC, STD and LOW use the same table logic. They are filled in from a `pol.c`-style sweep in slice 2 and stored in `PolicyTable` as data, not code.
6. `protectionHint` from the SFU: if the max residual loss across receivers exceeds 1%, raise the state by one even if the sender's own uplink is clean (downstream receivers are failing).

### 6.5 Competitive mode (opt-in)

- A separate encoder: `OPUS_APPLICATION_RESTRICTED_LOWDELAY` (2051), CELT only, 120-sample lookahead, 10 ms frames (480 samples, `FRAMESIZE_10_MS` 5003), 96k, CVBR, FEC 0.
- PLP is 0 when clean, and 3 or more when loss is above 0.5%. Measured cost: PLP3 shrinks the RLD primary drastically (96k/5 ms: 97.6 primary falls to 39.2 kbps), so protection is used only when loss is present.
- Header overhead doubles at 100 pps (about 78 kbps with QUIC + SFrame headers).
- 5 ms (240 samples, `FRAMESIZE_5_MS` 5002) and 2.5 ms frames are allowed in this profile (Gesamtkonzept §29), but header overhead grows to about 155 / 310 kbps, so they are only offered on LAN-like paths (RTT < 10 ms, no loss).
- Allowed only when RTT to the SFU is under 30 ms and loss is under 0.5% for 10 s. It falls back to HD at the first loss state above CLEAN.
- The swap happens at the next VAD silence, because the application cannot change on a live encoder.

### 6.6 Tier availability

A tier can only be selected if it is both technically possible and licensed: `capability ∧ entitlement` (section 14.4). The adaptive policy may always fall back to RESCUE, LOW and STD.

---

## 7. DSP: NS, AEC, AGC and VAD, and which native libraries

All blocks are 10 ms, 480 samples, 48 kHz float. Each processor implements `int algorithmicDelaySamples()`, which is verified by an impulse and cross-correlation test and summed into the live latency figure shown in the UI.

| Stage | Primary implementation | Fallback | Delay |
|---|---|---|---|
| HPF | APM `high_pass_filter{enabled, apply_in_full_band=true}` | Java 80 Hz 2nd-order Butterworth biquad | ~0 |
| AEC | APM AEC3 via `libphreox_apm`. Linux zero-code option: PipeWire `libpipewire-module-echo-cancel`, selectable as the input device. | speexdsp: `speex_echo_state_init(480, 4800)` + `speex_preprocess` with `SET_ECHO_STATE` (24). Clearly worse; the UI says so. | measured in slice 4 |
| NS | Mode `AUTO` (default), `OFF`, `NATURAL`, `STRONG` or `FAST` (see below). | | |
| AGC | APM #2 `gain_controller2` (see below) | Java envelope AGC (−18 dBFS target, +30 dB max, attack 10 ms, release 500 ms, frozen while VAD=0) + limiter at −1 dBFS | 0 |
| VAD | `VadGate`: fused RNNoise probability (when RNNoise runs) + energy/SNR VAD (noise floor + 9 dB), 30 ms attack, 300 ms hangover | speex `SET_VAD` (4) / `GET_PROB` (45) | 0 |

**NS modes:**
- `NATURAL`: APM NS `kLow`, or `kModerate` if the noise floor is above −45 dBFS. Used when the noise is stationary (low spectral flux).
- `STRONG`: RNNoise, for non-stationary noise such as keyboards. `rnnoise_process_frame(st, out, in)` on 480 samples scaled ×32768.
  - It adds **20 ms**, shown in the UI.
  - Wet/dry 0.85/0.15 only with **the dry path delayed 960 samples** (a preallocated delay line). Otherwise the mix comb-filters.
  - The return value feeds VadGate.
- `FAST` (Competitive): speexdsp `speex_preprocess_state_init(120, 48000)` run 4× per 10 ms with `SET_DENOISE` (0) = 1 and `SET_NOISE_SUPPRESS` (18) = −25. Adds 2.5 ms.
- `AUTO`: noise floor below −65 dBFS means OFF; stationary noise means NATURAL; non-stationary noise means STRONG; Competitive forces FAST.
- APM NS and RNNoise are **never stacked**.

**AGC2 config** (field names verified in `audio_processing.h`):
- `enabled=true`
- `input_volume_controller.enabled=false`, so the OS microphone volume is never touched
- `adaptive_digital{enabled=true, headroom_db=5, max_gain_db=30 (header default 50 is too aggressive), initial_gain_db=10, max_gain_change_db_per_second=6, max_output_noise_level_dbfs=-50}`
- `fixed_digital.gain_db=0`
- AGC2's built-in limiter
- GC1 and transient suppression are off.

**EchoPolicy AUTO:**
- AEC is off when the output is a headset or headphones (device or port name heuristic, Bluetooth A2DP/HFP, user toggle).
- AEC is re-enabled when AEC3 stats show echo: `echo_return_loss_enhancement < 6 dB` while far-end is active and `divergent_filter_fraction > 0.3` for 2 s.
- `residual_echo_likelihood` is **not** used, because it needs an EchoDetector that is not available.
- `set_stream_delay_ms = round(input + output latency from IAudioDevice.latency(), in ms) + 10`, refined every 5 s by cross-correlating the far-end and near-end signals.

**Playout DSP:**
1. per-peer gain;
2. Spatializer: ITD up to 0.6 ms, ILD up to 6 dB, head-shadow shelf; HRTF later;
3. Mixer;
4. `opus_pcm_soft_clip`, with one float of state per channel.

**DeepFilterNet3** (48 kHz, libdf C API) is a later `VOICE_ISOLATION` mode, judged by DNSMOS against RNNoise. It is the answer to Krisp.

---

## 8. Native audio I/O and audio tracks

### 8.1 Device backends

The Gesamtkonzept (§32) fixes the native paths: WASAPI on Windows, PipeWire on Linux, CoreAudio on macOS. These APIs are callback-driven and partly C++/Objective-C, so Java does not bind them directly. Instead there is one small native shim, **`libphreox_audio`**, with a stable C ABI, the same pattern as the MLS facade:
- opaque handles, no OS types across the boundary;
- errors only as status codes;
- `phx_audio_abi_version()` is checked at load; an incompatible version means the shim is not used;
- the OS callback runs inside the shim and moves samples through a lock-free ring buffer; Java does blocking `read`/`write` calls. **No upcalls into Java**, so no JVM thread ever runs on an OS audio thread.

Proposed ABI (new definition):
```c
uint32_t phx_audio_abi_version(void);

typedef struct { char id[256]; char name[256]; int is_input; int is_default; int max_channels;
                 int default_rate; int low_latency_frames; int headset_hint; } phx_audio_device;
typedef struct { const char* device_id; int is_input; int channels; int sample_rate; int period_frames;
                 int exclusive; } phx_audio_config;
typedef struct { int device_latency_frames; int ring_latency_frames; int actual_rate; int actual_period_frames; } phx_audio_latency;

int  phx_audio_enumerate(phx_audio_device* out, int max_devices);              // returns count or < 0
int  phx_audio_open(const phx_audio_config* cfg, phx_audio_stream** out);
int  phx_audio_start(phx_audio_stream*);
int  phx_audio_read(phx_audio_stream*, float* interleaved, int frames, int timeout_ms);   // frames read or < 0
int  phx_audio_write(phx_audio_stream*, const float* interleaved, int frames, int timeout_ms);
int  phx_audio_latency(phx_audio_stream*, phx_audio_latency* out);
long phx_audio_xruns(phx_audio_stream*);
int  phx_audio_stop(phx_audio_stream*);
void phx_audio_close(phx_audio_stream*);
int  phx_audio_poll_device_change(void);                                         // > 0 when the device list changed
```

| OS | Implementation inside the shim | Notes |
|---|---|---|
| Linux | PipeWire `pw_stream` (libpipewire-0.3), `PW_KEY_NODE_LATENCY = 480/48000` | The PipeWire echo-cancel module stays a selectable input (section 7). |
| Windows | WASAPI shared mode, event-driven, `IAudioClient3` low-latency periods where available; exclusive mode optional | |
| macOS | CoreAudio AUHAL (`kAudioUnitSubType_HALOutput`) | Microphone permission via the signed app bundle (section 12.4). |

Java classes:
- `IAudioDevice`: `read(float[] frame, int frames)`, `write(float[] frame, int frames)`, `latency()`, `xruns()`, `close()`.
- `NativeAudioDevice`: `libphreox_audio`, the production path.
- `PortAudioDevice`: PortAudio in blocking mode. **Interim and fallback only**: it lets slice 4 start before the shim exists, and it is used if the shim fails to load. On Linux the distro PortAudio 19.7.0 has ALSA/OSS/JACK only and reaches PipeWire through pipewire-alsa (higher latency, flagged `degraded`).
- `FileAudioDevice`: deterministic WAV in/out with a virtual clock for tests and the benchmark.
- `NullAudioDevice`: for headless runs.

All devices are opened at 48 kHz float. If the device refuses 48 kHz, the speex resampler (q10) converts and its delay is added to the latency figure.

### 8.2 Device handling

- `DeviceRegistry` enumerates devices, polls `phx_audio_poll_device_change` every 2 s, applies the headset heuristic (port/device names, Bluetooth A2DP/HFP) and publishes `voice.device` events.
- Hot swap (`PUT /voice/devices`) replaces the `IAudioDevice` between two frames without leaving the session; the jitter buffers and decoders stay untouched.
- Bluetooth HFP (16 kHz mono microphone) is detected and shown; the encoder tier is not lowered automatically because of it.

### 8.3 Track `AUDIO/MICROPHONE` and track `AUDIO/SYSTEM`

Both are PXP media tracks with their own SFrame context (PXP): `audio/<device>` and `system-audio/<device>/<track>`.

| | `AUDIO/MICROPHONE` | `AUDIO/SYSTEM` |
|---|---|---|
| Capture | input device | OS loopback (below) |
| DSP | full capture chain (section 7) | **none** (no HPF, NS, AEC, AGC, VAD gate) |
| Encoder | voice tiers (section 6.3) | MUSIC tier, stereo, `SIGNAL_MUSIC`, FEC0, PLP per LossState, DTX 0 |
| Silence | VadGate stops TX after hangover | sends continuously while the share is active (comfort of music) |
| Ranking | level byte drives top-N speaker selection | never counted as a speaker; forwarded while the share is subscribed |

System-audio capture must **exclude Phreox's own playout**, otherwise the other participants hear themselves:
- Windows: process loopback with `PROCESS_LOOPBACK_MODE_EXCLUDE_TARGET_PROCESS_TREE` for the Phreox process tree.
- Linux: link to the sink monitor but exclude the Phreox playback node (PipeWire node filtering).
- macOS: Core Audio process tap (macOS 14.4+) excluding the Phreox process; older macOS versions do not offer system audio.
These three mechanisms must be verified per OS in slice 11 (open question Q10).

### 8.4 Recording tap

Recording (Gesamtkonzept §39) runs in the backend. The voice engine exposes a `RecordingTap` at two points of the playout path:
- per remote track after concealment and drift correction (separate-track recording);
- after the mixer (mixed recording).
The tap copies into a preallocated SPSC ring that a recording thread drains; the playout thread never waits for it. Recording events are `recording.started`, `recording.stopped`, `recording.duration` on the event bus.

---

## 9. Media transport, datagram format and media E2EE

PXP fixes the frame: QUIC with ALPN `pxp/1`, control on reliable streams, realtime media on QUIC DATAGRAM, WSS fallback with identical frames, SFrame E2EE with MLS-exported keys. This section defines the audio details PXP leaves open.

### 9.1 Channels on the QUIC connection

| Channel | Carries | Reliability |
|---|---|---|
| Reliable stream, PXP frames with `frameType = MEDIA_CONTROL (0x40)`, `conversationId` = voice channel id | join, leave, mute, track publish, resume, room capabilities, hints, forward state (9.5) | reliable, ordered |
| QUIC DATAGRAM | AUDIO, FEEDBACK, PING, FAST_CONTROL (9.2, 9.3) | unreliable, never retransmitted by QUIC |
| MLS traffic for the call group | commits/proposals (`MLS_HANDSHAKE`), handled by the backend's MLS service | reliable (PXP) |

### 9.2 Media datagram header **[PXP-PROPOSAL]**

The 34-byte PXP frame header is meant for stream frames. On every 20 ms audio datagram it would cost 13.6 kbps by itself, so media datagrams use a compact header that still starts with a version (PXP: "Versionierung ist von Anfang an Teil jedes Frames"). All multi-byte fields are big-endian. Unknown version → drop and count; unknown type → ignore.

```
byte0:  bit 7-6  ver = 01
        bit 5-3  type: 0 AUDIO, 1 FEEDBACK, 2 PING, 3 FAST_CONTROL, 4-7 reserved (video later)
        bit 2    X  (AUDIO: redundancy section present; others 0)
        bit 1    reserved, must be 0
        bit 0    M  (AUDIO: first packet of a talkspurt)
```

**AUDIO (type 0):**
```
off len field
 0   1  byte0
 1   1  V(1) voice active | level(7) = -dBov 0..127 (RFC 6464 semantics)     -- cleartext, for SFU speaker ranking
 2   2  seq      u16, +1 per SENT packet (contiguous across silence); receiver extends to 64 bit (ROC)
 4   4  ts       u32, 48 kHz sample clock of the first sample, random start, jumps across silence
 8   4  trackId  u32, assigned by phreox-space when the track is published, unique per room
12   1  cfg: frameCode(3: 0=2.5, 1=5, 2=10, 3=20, 4=40, 5=60 ms) | stereo(1) | tier(4)
-- if X=1:
13   1  redCount u8 (1..3)
14  5n  n x { seqDelta u8, tsDelta u16, len u16 }       (oldest first)
     *  n x RED SFrame objects (len bytes each)
-- always:
     *  primary SFrame object = SFrame header | ciphertext | tag(16)   (rest of the datagram)
```

Mapping to PXP's "Was der SFU sehen darf": session = the QUIC connection; sender/track = `trackId`; media type = `type` plus the track registry; sequence/timing = `seq`, `ts`; network metrics = FEEDBACK. **`V`/`level` is not in PXP's list yet.** It is needed for top-N speaker forwarding (every SFU, including Discord's, uses it). Proposal: add "audio level / voice activity" to the PXP list (open question Q12). Without it, the SFU must forward all speakers.

**RED copies are DRED-stripped:**
- After encoding, the capture thread stores in `SendRing` the primary packet and `opus_packet_unpad(copy)`. Unpad strips DRED and all extensions (verified: `opus_dred_parse` returns 0 afterwards).
- The stripped copy is encrypted once as its **own SFrame object with its own counter** (9.4), so a RED block never reuses the primary's nonce.
- RED blocks are complete SFrame objects, so the SFU can remove them per receiver without decrypting.

**When RED is sent:**
- **Talkspurt-onset protection:** packets 2-4 of every talkspurt carry RED depth 2, covering packets 1-3. At onset there is no DRED or LBRR history, and in CLEAN there is none at all.
- LIGHT state: depth 1 when the bandwidth headroom allows it.
- Never in MODERATE or SEVERE (DRED and LBRR are better there; prototype result: RED 2.70 vs DRED+LBRR 3.14 PESQ-WB).

**Overhead** per 20 ms AUDIO datagram, no RED: media header 13 B + SFrame header about 10 B + tag 16 B + QUIC short header and DATAGRAM frame about 30 B (incl. QUIC's own 16 B AEAD tag) + IPv4/UDP 28 B ≈ **97 B, about 39 kbps at 50 pps**. Discord's RTP/SRTP is about 50 B. This is the price of QUIC plus E2EE. The rate controller and every equal-bitrate comparison use measured wire bytes, so it is accounted for, and Q13 asks whether to reduce it later.

### 9.3 Other datagram types

**FEEDBACK (type 1).** Sent every 100 ms, and immediately when a NACK is due. Client → SFU about its downlink; SFU → client about its uplink.
```
reporterTrack u32 | fbSeq u16 | nReports u8
nReports x 24 B { trackId u32, extHighestSeq u32, cumLost u24, fracLostQ8 u8, jitter u16 (0.1 ms),
                  jbTargetMs u16, meanBurstQ4 u8, residualLossPermille u16,
                  recovered{red,arq,lbrr,dred,plc} 5 x u8 }
nArrival u8 | arrTrack u32 | firstSeq u16 | nArrival x i16 arrivalDelta (0.25 ms units, 0x8000 = lost)
nNack u8 | nNack x { trackId u32, pid u16, blp u16 }      // RFC 4585 PID/BLP, up to 17 frames each
```

**PING (type 2):** `tSendUs u64 | [echo: serverHoldUs u32] | [padding for probe trains]`. Once per second; five-packet trains every 10 s serve as bandwidth probes and as edge probes before join (section 11.3). QUIC's own RTT estimate is used too where the library exposes it; PING additionally measures SFU processing time.

**FAST_CONTROL (type 3):** `subtype u8 | body`, only for hints that are refreshed periodically and may be lost:
- `0 PROTECTION_HINT {maxResidualPermille u16, worstBurstQ4 u8}`, SFU → sender, every 500 ms.

There is no BIND packet: QUIC handles NAT binding, keepalive (PING frames, idle timeout) and path migration.

### 9.4 Media E2EE (SFrame details)

Defined by PXP: MLS group per call, `base_key = MLS-Exporter("pxp media v1", context, 32)`, contexts `audio/<device>` and `system-audio/<device>/<track>`, new keys on every epoch, KID encodes epoch and sender/track, short transition window, AEAD cipher suite, replay window per KID. Defined here:

**Cipher suite:** `AES_128_GCM_SHA256_128` (RFC 9605 registry value 0x0004; verify against the RFC). Nk = 16, Nn = 12, tag 16 B. It is the suite PXP names and the only one implemented in v1.

**KID layout** (fits in 5 bytes of the variable-length SFrame KID field):
```
KID = (epoch mod 2^16) << 24 | leafIndex(u16) << 8 | trackSlot(u8)
```
- `leafIndex` is the sender device's MLS leaf index in the call group.
- `trackSlot`: 0 = microphone, 1..255 = system-audio tracks in publish order.
- 16 bits of epoch are enough because only the current and previous epochs are ever valid.

**Key and salt derivation** per RFC 9605 §4.4.2, with `base_key` from PXP:
```
sframe_secret = HKDF-Extract(salt = "", ikm = base_key)                         // SHA-256
sframe_key    = HKDF-Expand(sframe_secret, "SFrame 1.0 Secret key "  || KID(8 B BE) || suite(2 B BE), 16)
sframe_salt   = HKDF-Expand(sframe_secret, "SFrame 1.0 Secret salt " || KID(8 B BE) || suite(2 B BE), 12)
nonce         = sframe_salt XOR (CTR left-padded to 12 B)
```
The implementation must pass the RFC 9605 test vectors before anything else uses it. Java: `javax.crypto.KDF` (HKDF, final since JDK 25) and `Cipher "AES/GCM/NoPadding"` (AES-NI/CLMUL intrinsics).

**Counter:** `CTR = extSeq * 2 + variant`, variant 0 = primary, 1 = DRED-stripped RED copy. `extSeq` never repeats for a KID, so nonces are unique.

**AAD:** SFrame header || metadata, with `metadata = ts(4) || cfg(1)` of the protected frame (for RED blocks: `ts - tsDelta` and the block's cfg). Fields the SFU may change (byte0, RED section, `trackId`) are deliberately not in the AAD; `trackId` is bound indirectly because the KID identifies the sender and track.

**Epoch transition** (PXP's "kurzes Übergangsfenster" = **2 s**):
- The sender switches to the new KID as soon as its MLS service has processed the commit.
- Receivers keep the previous epoch's keys for 2 s after they processed the commit.
- A datagram with a KID of an epoch the receiver has not processed yet waits up to 150 ms in a per-stream pending queue (8 slots); if the epoch does not arrive in time it is dropped, concealed and counted as `keyMiss`.

**Replay:** 1024-bit bitmap per KID over CTR (PXP).

**Allocation:** JDK AES-GCM needs a `GCMParameterSpec` and `Cipher.init` per packet, a small allocation. v1 accepts it and measures it in the soak (T14 counts crypto separately). A zero-allocation path (OpenSSL `EVP_AEAD`/`EVP_CIPHER` over FFM) is an optional optimisation (Q14).

### 9.5 MEDIA_CONTROL messages (reliable stream)

PXP does not define the payload encoding of `MEDIA_CONTROL` yet. Voice uses whatever PXP decides for `CONTROL` payloads; until then each message is `subtype u8 | fields` in big-endian with length-prefixed strings. Messages:

| Subtype | Direction | Fields |
|---|---|---|
| `JOIN` | client → space | channelId, deviceId, tracks[{kind, slot}], opusVersion, dredModel, capabilities, edgeProbe results |
| `JOIN_ACK` | space → client | sessionId, trackIds, roster[{deviceId, leafIndex, trackIds}], resumeToken, forwardLimit |
| `LEAVE` | client → space | – |
| `MUTE` | client → space | track, muted, deafened. Server-side voice state; the SFU stops forwarding a muted track. |
| `PUBLISH_TRACK` / `UNPUBLISH_TRACK` | client ↔ space | kind (`AUDIO/SYSTEM`), slot → trackId |
| `ROOM_CAPS` | space → clients | dredModelCommon (string or null). Sent on every join/leave. Null means senders set `DRED_DURATION = 0`. |
| `TIER_HINT` | space → client | maxTier (egress budget) |
| `FORWARD_STATE` | space → client | trackId, state (0 paused, 1 resumed), atSeq. The receiver does not count the gap as loss and resets its jitter state at `atSeq`. |
| `KEY_ROTATE` | client → space | epoch now in use. Informational for diagnostics; the keys themselves come only from MLS. |
| `SESSION_RESUME` / `RESUME_ACK` | client ↔ space | resumeToken, last extSeq per track (section 11) |

### 9.6 Transport behaviour

- **QUIC library:** still open in PXP (Netty QUIC or kwik). Voice requirements for the choice:
  - RFC 9221 DATAGRAM support with a send call that does not block;
  - datagrams are not held back by stream flow control;
  - connection migration (Gesamtkonzept §34);
  - access to RTT and loss statistics;
  - its congestion controller must not silently queue datagrams for long; if it drops them, the drop must be observable so `BandwidthEstimator` can react.
- Datagrams count against the QUIC congestion window. `BandwidthEstimator` keeps media below it; QUIC-level drops are counted as `sendDrop` and treated like congestion loss.
- Max datagram size 1200 B (UDP payload). DSCP EF (0xB8) if the library lets us set it; Windows ignores it without a QoS policy.
- **Fallback (PXP):** WebSocket over TLS 443 with identical frames when no QUIC handshake succeeds within 2 s. In this mode: session marked `DEGRADED`, RED and ARQ off, frames older than 100 ms dropped at the sender, jitter-buffer minimum 80 ms.
- **ARQ is deadline-bounded.** A receiver NACKs a frame only if a retransmission can arrive before that frame's playout deadline; playout never waits for it (Gesamtkonzept §20/§30: "Voice-Frames sollen nicht auf alte Retransmits warten"). The SFU answers from its packet cache with the original bytes. This is application-level and does not use QUIC retransmission; whether it matches PXP's "ohne Retransmits" is listed as Q11.

### 9.7 Rate control and loss classification (BandwidthEstimator)

- **Delay gradient:** a GCC trendline over the arrival-delta block in FEEDBACK. Linear regression over 20 packet groups of smoothed one-way delay variation, with an adaptive threshold (γ in 6-600 ms, k_up 0.0087, k_down 0.039). Output: OVERUSE, NORMAL or UNDERUSE.
- **Classifier**, per 500 ms window:
  - loss with NORMAL and no RTT rise means `RANDOM` (WiFi or mobile);
  - loss with OVERUSE, or RTT above 1.5× its 10 s minimum, or QUIC `sendDrop`, means `CONGESTION`.
- **AIMD:**
  - OVERUSE: ×0.85.
  - NORMAL with loss < 2%: +8 kbps every 2 s.
  - Upgrades need 10 s of stability plus a successful probe train.
- **Budget:** `allowedTotal = 0.85 × estimate`. The tier and state are the highest whose **measured** wire kbps (codec + RED + all headers, about 97 B per packet) fits.

---

## 10. Jitter buffer and loss concealment

### 10.1 AdaptiveJitterBuffer (one per RemoteStream)

- **Storage:** the `JitterSlotRing` from 5.3: 64 slots, 1.28 s at 20 ms. Each slot has flags {present, viaRed, viaArq, hasLbrr (from `opus_packet_has_lbrr`), late, dredParsed, dredProcessed}.
- **Delay statistics:**
  - `d_i = arrivalMs_i − ts_i/48`, normalised to the minimum over 2 s;
  - retransmits and RED-filled slots are excluded;
  - 1 ms-bin histogram over a 2 s window with exponential forgetting (λ = 0.995 per packet);
  - RFC 3550 jitter for reporting.
- **Target delay:**
  ```
  jitterTarget = max(frameMs + 5, P97(d) + 5)                      // quality-first P97 instead of NetEq-ish P95
  hold h*      = argmin_{h in 0..3 frames}  [ 400ms * R(h) + h * frameMs ]    // recovery hold
  target       = clamp(jitterTarget + h* * frameMs, frameMs + 5, latencyCap)
  latencyCap   = competitive 80 | balanced 150 (default) | resilient 250 ms
  ```
  `R(h)` is the expected residual frame-loss fraction:
  - `BurstStatistics` keeps the empirical burst-length histogram B over the last 10 s.
  - For each burst length L and position i (1..L), a lost frame counts as recoverable with hold h if any of these hold:
    - (a) `i == L` and the current encoder state has LBRR (from the sender's tier in `cfg`) and `h ≥ 1`;
    - (b) recent packets show DRED reach ≥ `(L−i+1)·frame` and `h ≥ L−i+1`;
    - (c) `rttSfu + 5 ms ≤ slack + h·frame` (ARQ);
    - (d) RED depth k ≥ the distance to the first surviving packet.
  - Weight: 1% residual loss costs as much as 4 ms of delay. This constant is tuned in slice 3.
- **Spike mode** (WiFi scan or handover):
  - Entered when a packet arrives with `d > target + 40 ms` and `d > 3σ`.
  - On entry: `target = observed d` at once; playout continues with concealment instead of discarding late packets.
  - Left after 2 s without a spike; the target then decays.
- **Target changes:**
  - Rising: immediate (insert concealment frames).
  - Falling: at most 1 ms per 100 ms.
    1. Preferably drop whole frames during VAD silence (`V=0`, level < −50 dBov).
    2. Otherwise, only if `|buffer − target| > 40 ms` during speech, `Wsola` at 0.97-1.03× (10 ms analysis, 5 ms overlap, pitch-synchronous search).
- **Clock drift:** `DriftCorrector` fits the long-term buffer-level slope and applies `speex_resampler_set_rate_frac` within ±0.1% (±1000 ppm) to the decoded stream. WSOLA is not used for drift.
- **Late packets** (arrived after their slot was concealed):
  - not played;
  - counted as late-loss;
  - their DRED is parsed into the cache, because it can still cover later gaps;
  - they update the delay statistics, which can trigger spike mode.
- **NACK** (deadline-bounded, 9.6): on a gap, `NackTracker` sends NACK for frame n at once if `now + rttSfu + 5 ms < deadline(n)`.
  - At most 2 retries.
  - Never for frames already covered by validated LBRR or DRED.
  - NACK items go in FEEDBACK to the SFU (hop-by-hop).

### 10.2 Playout and decode timing

PlayoutThread runs every 10 ms. A 20 ms frame is decoded on demand at the latest moment, on every second pull, so the concealment decision sees as many later packets as possible. The second half of the frame is cached.

### 10.3 Concealment ladder (LossConcealer)

Run for missing frame n at its deadline. `fs` = samples per frame from `cfg`, or `opus_packet_get_nb_samples` of the neighbouring packets. It must be a multiple of 2.5 ms.

```java
int produceFrame(long n, float[] pcm) {
  Slot s = ring.get(n);
  if (s.present())                                   // original, RED copy, or SFU retransmission
      return stat(PRIMARY_OR_RED_OR_ARQ, opus.decodeFloat(dec, s.data, s.len, pcm, fs, 0));

  Slot next = ring.get(n + 1);
  if (next.present() && next.hasLbrr())              // in-band FEC of frame n lives in packet n+1
      return stat(LBRR, opus.decodeFloat(dec, next.data, next.len, pcm, fs, 1));   // frame_size == missing duration

  for (long m = n + 1; m <= ring.newest(); m++) {    // EARLIEST later packet first: smallest offset
      Slot c = ring.get(m);
      if (!c.present() && !c.lateButKept()) continue;
      DredEntry d = dredCache.parseIfAbsent(m, c);   // opus_dred_parse(dd, dred, data, len, 48000, 48000, &end, 1)
      int offset = (int) ((m - n) * fs);             // samples BEFORE the start of packet m
      if (d.reach <= 0 || offset > d.reach) continue;
      if (offset <= d.dredEnd) continue;             // region not encoded (silence) -> PLC/CNG is correct there
      if (!d.processed) { opus.dredProcess(dd, d.dred, d.dred); d.processed = true; } // MANDATORY, else silent PLC
      return stat(DRED, opus.decoderDredDecodeFloat(dec, d.dred, offset, pcm, fs));
  }

  int r = opus.decodeFloat(dec, MemorySegment.NULL, 0, pcm, fs, 0);   // deep PLC (decoder cx >= 5)
  return stat(plcRunMs(n) > 120 ? CNG_FADE : PLC, r);   // after 120 ms: 20 ms crossfade to comfort noise
}
```

Rules:
- A single `OpusDecoder` per stream goes through every path, so its state stays continuous.
- After an LBRR or DRED frame, the next present packet decodes normally.
- A new talkspurt (M bit) or a `FORWARD_STATE resumed` resets the PLC run counter and the comfort-noise state.
- Statistics count `DRED` only when the validity checks passed **and** process was called. A unit test asserts that a deferred-but-unprocessed DRED decode is bit-identical to PLC, so this regression cannot slip in.
- `dredCache` holds 4 `OpusDRED` objects per stream with LRU by `extSeq`. One parse serves a whole burst.
- CPU budget per concealed 20 ms frame: deep PLC up to 0.7 ms, DRED 0.35 ms plus process.
  - When more than 2 streams are concealing in the same tick, `DecodePool` spreads the work.
  - The playout tick p99 must stay ≤ 3 ms (T13).

---

## 11. Session states, resume and edge selection

### 11.1 States (Gesamtkonzept §33)

| State | Entered when | Behaviour |
|---|---|---|
| `CONNECTING` | join requested | edge probe, QUIC connect, `JOIN` |
| `CONNECTED` | `JOIN_ACK` or `RESUME_ACK` | normal |
| `DEGRADED` | WSS fallback active, or residual loss > 5% for 5 s, or RTT > 300 ms for 5 s | everything keeps running; the UI shows the reason |
| `RECONNECTING` | no datagram received for 1 s **and** QUIC reports the path dead, or the connection closes | capture keeps running (frames are discarded), playout conceals and then plays comfort noise; all codec, jitter-buffer and key state is kept |
| `DISCONNECTED` | grace period expired, or `LEAVE` | everything is released |

### 11.2 Resume

- **Grace period: 15 s** (defined here; the Gesamtkonzept only says "Grace Period").
- QUIC connection migration (Gesamtkonzept §34) handles most path changes (WiFi → mobile) without any application step: same connection, same session.
- If the connection itself is lost, the backend opens a new one to the same edge and sends `SESSION_RESUME {resumeToken, last extSeq per track}`. The space keeps the session (trackIds, roster position, mute state, forwarding state) for the grace period.
- After `RESUME_ACK`:
  - encoders, decoders, jitter buffers and `MediaKeyRing` continue unchanged; there is no key renegotiation unless the MLS epoch changed meanwhile;
  - `seq` continues, so receivers see a gap and conceal, not a new stream;
  - no permission reload and no channel rejoin (Gesamtkonzept §33).
- Metric `resumeRate` (Gesamtkonzept §56) = resumes / (resumes + full rejoins).

### 11.3 Edge selection (Gesamtkonzept §35)

- Before `JOIN`, the backend gets the space's media edge candidates from its space connection (endpoint list of the node identity, Gesamtkonzept §12).
- It sends a PING train (5 packets, 20 ms apart) to each candidate in parallel and scores: `score = rttMs + 4 × jitterMs + 40 × lossPct`, minus a capacity hint if the space provides one.
- Lowest score wins. Re-probing happens only on `DEGRADED`, never in the middle of normal speech.
- The distributed voice fabric (edge-to-edge forwarding, Gesamtkonzept §36) is not v1. The SFU design keeps `trackId` room-unique and the datagram format forwardable without rewriting, so an edge can later relay to another edge unchanged.

---

## 12. FFM native binding layer

### 12.1 Rules

- One `final` class per library. All handles are `static final MethodHandle`, resolved once with `SymbolLookup.libraryLookup(Path, Arena.global())` and `findOrThrow`.
- Short, non-blocking, callback-free hot calls use `Linker.Option.critical(true)` (heap access allowed). Callers pass `MemorySegment.ofArray(float[]/byte[])`, with no copy and no allocation. Such calls must take ≤ 1 ms and must never block. The critical calls are:
  - `opus_encode_float`, `opus_decode_float` (incl. PLC);
  - `opus_packet_has_lbrr`, `opus_packet_unpad`, `opus_pcm_soft_clip`;
  - `rnnoise_process_frame`;
  - `phx_apm_process_*`;
  - `speex_preprocess_run`, `speex_resampler_process_float`;
- **Non-critical:**
  - all `create`/`destroy`/`ctl` calls;
  - `opus_dred_parse`, `opus_dred_process`, `opus_decoder_dred_decode_float` (heavier; these use preallocated native segments);
  - `phx_audio_read`/`phx_audio_write` and `Pa_ReadStream`/`Pa_WriteStream`, which block.
- Out-parameters (`int* error`, `int* dred_end`) are preallocated native segments from a per-thread `Arena.ofConfined()`.
- **There are no upcalls anywhere.** `libphreox_audio` and PortAudio are used in blocking mode.
- C `long` and `unsigned long`: `C_LONG = Linker.nativeLinker().canonicalLayouts().get("long")`. It is 8 B on Linux/macOS (LP64) and 4 B on Windows (LLP64).
  - Handles that take `unsigned long` are adapted with `MethodHandles.explicitCastArguments`, so callers always pass a Java `long`.
- Variadic `opus_*_ctl` is **always** bound with `Linker.Option.firstVariadicArg(2)`. Declaring it non-variadic breaks on macOS arm64.

```java
static final Linker L = Linker.nativeLinker();
static final SymbolLookup OPUS = NativeLoader.lookup(NativeLibrary.OPUS);
static final MethodHandle ENCODE_FLOAT = L.downcallHandle(OPUS.findOrThrow("opus_encode_float"),
    FunctionDescriptor.of(JAVA_INT, ADDRESS, ADDRESS, JAVA_INT, ADDRESS, JAVA_INT), Linker.Option.critical(true));
static final MethodHandle ENC_CTL_SET_INT = L.downcallHandle(OPUS.findOrThrow("opus_encoder_ctl"),
    FunctionDescriptor.of(JAVA_INT, ADDRESS, JAVA_INT, JAVA_INT), Linker.Option.firstVariadicArg(2));
static final MethodHandle ENC_CTL_GET_INT = L.downcallHandle(OPUS.findOrThrow("opus_encoder_ctl"),
    FunctionDescriptor.of(JAVA_INT, ADDRESS, JAVA_INT, ADDRESS), Linker.Option.firstVariadicArg(2));
```

### 12.2 Signature map (C to FunctionDescriptor)

Notation: `I`=JAVA_INT, `P`=ADDRESS, `D`=JAVA_DOUBLE, `F`=JAVA_FLOAT, `J`=JAVA_LONG, `CL`=C_LONG, `[c]`=critical.

**libopus** (`OpusBindings`). All of these exist in libopus 1.6.1 (verified on the distro build).

| C | Descriptor |
|---|---|
| `const char* opus_get_version_string(void)` | `(P)` |
| `const char* opus_strerror(int)` | `(P, I)` |
| `OpusEncoder* opus_encoder_create(opus_int32 Fs, int ch, int app, int* err)` | `(P, I,I,I,P)` |
| `opus_int32 opus_encode_float(OpusEncoder*, const float*, int frame_size, unsigned char*, opus_int32 max)` | `(I, P,P,I,P,I)` [c] |
| `int opus_encoder_ctl(OpusEncoder*, int req, ...)` | set `(I, P,I,I)` / get `(I, P,I,P)`, `firstVariadicArg(2)` |
| `void opus_encoder_destroy(OpusEncoder*)` | `(void, P)` |
| `OpusDecoder* opus_decoder_create(opus_int32 Fs, int ch, int* err)` | `(P, I,I,P)` |
| `int opus_decode_float(OpusDecoder*, const unsigned char* data, opus_int32 len, float* pcm, int frame_size, int decode_fec)` | `(I, P,P,I,P,I,I)` [c]. `data=MemorySegment.NULL, len=0` for PLC. |
| `int opus_decoder_ctl(OpusDecoder*, int req, ...)` | same as the encoder |
| `void opus_decoder_destroy(OpusDecoder*)` | `(void, P)` |
| `OpusDREDDecoder* opus_dred_decoder_create(int* err)` / `void opus_dred_decoder_destroy(OpusDREDDecoder*)` | `(P, P)` / `(void, P)` |
| `OpusDRED* opus_dred_alloc(int* err)` / `void opus_dred_free(OpusDRED*)` | `(P, P)` / `(void, P)` |
| `int opus_dred_parse(OpusDREDDecoder*, OpusDRED*, const unsigned char*, opus_int32 len, opus_int32 max_dred_samples, opus_int32 sampling_rate, int* dred_end, int defer_processing)` | `(I, P,P,P,I,I,I,P,I)` |
| `int opus_dred_process(OpusDREDDecoder*, const OpusDRED* src, OpusDRED* dst)` | `(I, P,P,P)`. src == dst is allowed. |
| `int opus_decoder_dred_decode_float(OpusDecoder*, const OpusDRED*, opus_int32 dred_offset, float* pcm, opus_int32 frame_size)` | `(I, P,P,I,P,I)` |
| `int opus_packet_has_lbrr(const unsigned char[], opus_int32)` | `(I, P,I)` [c] |
| `int opus_packet_get_nb_samples(const unsigned char[], opus_int32, opus_int32 Fs)` | `(I, P,I,I)` [c] |
| `int opus_packet_get_bandwidth(const unsigned char*)` | `(I, P)` [c] |
| `opus_int32 opus_packet_unpad(unsigned char*, opus_int32)` | `(I, P,I)` [c] |
| `void opus_pcm_soft_clip(float* pcm, int frame_size, int channels, float* softclip_mem)` | `(void, P,I,I,P)` [c] |

`OpusCtl` constants:
- requests: 4002, 4004, 4006, 4010, 4012, 4014, 4016, 4020, 4022, 4024, 4027, 4034, 4036, 4040, 4042, 4050/4051, 4054/4055, 4056/4057, 4058/4059
- `OK=0`, `BAD_ARG=-1`, `UNIMPLEMENTED=-5`, `AUTO=-1000`
- applications: 2048, 2049, 2051
- signals: 3001, 3002
- bandwidths: 1101..1105
- frame sizes: 5000..5009

**librnnoise** (`RnnoiseBindings`):
- `DenoiseState* rnnoise_create(RNNModel*)` `(P,P)`, called with NULL
- `float rnnoise_process_frame(DenoiseState*, float* out, const float* in)` `(F, P,P,P)` [c]
- `int rnnoise_get_frame_size(void)` `(I)`, asserted == 480
- `void rnnoise_destroy(DenoiseState*)`

**libspeexdsp** (`SpeexDspBindings`). `*_ctl` is **not** variadic: `(I, P,I,P)`.
- `speex_resampler_init(spx_uint32_t nb_ch, in_rate, out_rate, int quality, int* err)` `(P, I,I,I,I,P)`
- `speex_resampler_process_float(st, spx_uint32_t ch, const float* in, spx_uint32_t* in_len, float* out, spx_uint32_t* out_len)` `(I, P,I,P,P,P,P)` [c]
- `speex_resampler_set_rate_frac(st, num, den, in_rate, out_rate)` `(I, P,I,I,I,I)`
- `speex_preprocess_state_init(int frame, int rate)` `(P, I,I)`
- `speex_preprocess_run(st, spx_int16_t*)` `(I, P,P)` [c]
- `speex_preprocess_ctl(st, int, void*)` `(I, P,I,P)`
- `speex_echo_state_init(int frame, int filter_len)` `(P, I,I)`
- `speex_echo_cancellation(st, const spx_int16_t* rec, const spx_int16_t* play, spx_int16_t* out)` `(void, P,P,P,P)` [c]
- `speex_echo_ctl(st, int, void*)` `(I, P,I,P)`
- the matching `*_destroy` functions

**libphreox_audio** (`AudioShimBindings`): the ABI in section 8.1; all calls are plain C; `read`/`write` are non-critical because they block.

**libportaudio** (`PortAudioBindings`, fallback only, section 8.1):
- `Pa_Initialize()`, `Pa_Terminate()` `(I)`
- `Pa_GetDeviceCount()`, `Pa_GetDefaultInputDevice()`, `Pa_GetDefaultOutputDevice()` `(I)`
- `const PaDeviceInfo* Pa_GetDeviceInfo(int)` `(P, I)`
- `const PaHostApiInfo* Pa_GetHostApiInfo(int)` `(P, I)`
- `PaError Pa_OpenStream(PaStream**, const PaStreamParameters* in, const PaStreamParameters* out, double rate, unsigned long framesPerBuffer, unsigned long flags, PaStreamCallback* /*NULL*/, void* user)` `(I, P,P,P,D,CL,CL,P,P)`
- `Pa_StartStream`, `Pa_StopStream`, `Pa_CloseStream` `(I, P)`
- `PaError Pa_ReadStream(PaStream*, void*, unsigned long)` and `Pa_WriteStream(PaStream*, const void*, unsigned long)` `(I, P,P,CL)`. **Non-critical.** Return codes: `paInputOverflowed=-9981`, `paOutputUnderflowed=-9980` (counted as xruns, not fatal).
- `signed long Pa_GetStreamReadAvailable/WriteAvailable(PaStream*)` `(CL, P)`
- `const PaStreamInfo* Pa_GetStreamInfo(PaStream*)` `(P, P)`
- `const char* Pa_GetErrorText(PaError)` `(P, I)`
- `paFloat32 = 0x1`

Struct layouts (LP64 offsets verified; Windows keeps the same offsets through padding):

```
PaStreamParameters (32): int device@0, int channelCount@4, C_LONG sampleFormat@8 (+pad4 on Win), double suggestedLatency@16, ptr hostApiSpecificStreamInfo@24
PaDeviceInfo (72):       int structVersion@0, pad4, ptr name@8, int hostApi@16, int maxInputChannels@20, int maxOutputChannels@24, pad4,
                         double defaultLowInputLatency@32, defaultLowOutputLatency@40, defaultHighInputLatency@48, defaultHighOutputLatency@56, defaultSampleRate@64
PaStreamInfo (32):       int structVersion@0, pad4, double inputLatency@8, double outputLatency@16, double sampleRate@24
```

**libphreox_apm** (our extern "C" shim, `native/apm/phreox_apm.cpp`, about 250 lines, `ApmBindings`):
```c
typedef struct { int hpf, aec, ns_enabled, ns_level /*0..3*/, agc2;
                 float agc2_headroom_db, agc2_max_gain_db, agc2_initial_gain_db,
                       agc2_max_change_db_s, agc2_max_noise_dbfs; } phx_apm_config;   // flat POD, 4-byte fields
typedef struct { float erl_db, erle_db, divergent_fraction; int delay_median_ms, delay_ms; } phx_apm_stats;
phx_apm* phx_apm_create(int sample_rate_hz, int num_channels, const phx_apm_config* cfg);
int  phx_apm_apply_config(phx_apm*, const phx_apm_config*);
int  phx_apm_process_capture(phx_apm*, const float* const* in, float* const* out);   // 10 ms, deinterleaved, [-1,1]
int  phx_apm_process_render(phx_apm*, const float* const* in);
int  phx_apm_set_stream_delay_ms(phx_apm*, int);
int  phx_apm_get_stats(phx_apm*, phx_apm_stats* out);
void phx_apm_destroy(phx_apm*);
```
Internally the shim calls `AudioProcessingBuilder().Create()`, `ApplyConfig`, `ProcessStream(const float* const*, StreamConfig, StreamConfig, float* const*)`, `ProcessReverseStream(..., dest)`, `set_stream_delay_ms` and `GetStatistics()`.
- Linux build: `g++ -std=c++17 -O2 -fPIC -shared phreox_apm.cpp $(pkg-config --cflags --libs webrtc-audio-processing-2) -o libphreox_apm.so`.
- Distribution build: link webrtc-apm and abseil statically.
- Windows: MSVC via meson.

### 12.3 Library loading (NativeLoader)

Per-library resolution order:
- **libopus:** only the bundled copy from jar resources `natives/<os>-<arch>/`, extracted to the cache dir by SHA-256. `PHREOX_NATIVE_OPUS` is a development override and marks the engine `degraded`. The system soname is never used (section 2).
- **All other libraries:** 1. bundled copy; 2. env override `PHREOX_NATIVE_<LIB>`; 3. system soname; 4. degraded feature (below).

Load in dependency order (on Windows `LoadLibrary` reuses already-loaded modules by name):
1. opus
2. speexdsp
3. rnnoise
4. phreox_audio
5. portaudio (only if phreox_audio is unavailable)
6. phreox_apm

Cache dir:
- Linux: `~/.cache/phreox/natives/<sha>/`
- Windows: `%LOCALAPPDATA%\Phreox\natives\<sha>\`
- macOS: `~/Library/Caches/Phreox/natives/<sha>/`

| Lib | Linux | Windows | macOS | Missing: what degrades |
|---|---|---|---|---|
| opus | libopus.so.0 | opus.dll | libopus.0.dylib | **fatal** in production if the bundled copy is missing or fails the probe. Dev override allowed, flagged `degraded`. |
| speexdsp | libspeexdsp.so.1 | libspeexdsp.dll | libspeexdsp.1.dylib | Java linear resampler; no FAST NS; no speex AEC |
| rnnoise | librnnoise.so.0 | rnnoise.dll | librnnoise.0.dylib | no STRONG NS |
| phreox_audio | libphreox_audio.so | phreox_audio.dll | libphreox_audio.dylib | PortAudio fallback (flagged) |
| portaudio | libportaudio.so.2 | portaudio.dll | libportaudio.2.dylib | `NullAudioDevice` plus an error, if phreox_audio is missing too |
| phreox_apm | libphreox_apm.so | phreox_apm.dll | libphreox_apm.dylib | speexdsp AEC/preprocess + Java HPF/AGC |

**OpusCapabilities probe** at startup, exposed at `/capabilities`:
- the version string must equal the pinned `libopus 1.6.1`; anything else is `degraded`, and a 1.5 lib also disables DRED because its DRED model is incompatible;
- record `dredModel` = the libopus major.minor of the DRED model (`"1.6"`), sent in signaling `JOIN`/`CAPS` and compared per room;
- symbols `opus_dred_parse` and `opus_decoder_dred_decode_float` must be present;
- `SET_DRED_DURATION(100)` must return 0 on a throwaway encoder;
- **functional DRED check:** encode 1 s of the built-in speech-like test signal at 64k, PLP20, FEC1. At least 90% of packets must have `opus_dred_parse > 0`;
- `SET_OSCE_BWE` on a decoder (complexity ≥ 4): 0 means available, −5 means absent; must be 0 with our build;
- `SET_QEXT` on an encoder: same; must be 0 with our build;
- decoder complexity 10 accepted.

### 12.4 Packaging per OS

- **libopus:** our own 1.6.1 build for all 5 targets, see section 2.
- **libphreox_audio, libphreox_apm:** built in the same CI matrix; webrtc-audio-processing and abseil are linked statically into phreox_apm; Windows via MSVC/meson.
- **rnnoise, speexdsp:** static where possible.
- **PortAudio (fallback):** Windows WASAPI, macOS CoreAudio, Linux ALSA + JACK.
- Maven profile `natives` copies the CI artifacts into `phreox-backend/src/main/resources/natives/<os>-<arch>/`.
- The jlink'd Temurin runtime ships inside the Electron app resources.
  - macOS: the backend runs as a child process of the signed `.app` (TCC attribution via `NSMicrophoneUsageDescription`). Natives are signed with the same Team ID; otherwise the hardened runtime needs `com.apple.security.cs.disable-library-validation`.

---

## 13. Code layout (Pureline-compliant)

Every package below has at most 8 production top-level types (PL-STRUCT-002). Interfaces carry the `I` prefix. Test and benchmark code lives in test sources and does not count.

### 13.1 `phreox-backend`: `talk.phreox.backend.voice.*`

| Package | Types | Responsibility |
|---|---|---|
| `voice` | `VoiceModule`, `VoiceEngine`, `VoiceSettings`, `QualityTier`, `LatencyMode`, `VoiceSessionState` | `VoiceModule implements IBackendModule` (name `"voice"`) is registered in `AppRuntime.registerModules()`. `start()` loads natives and warms up; `stop()` leaves, stops threads and frees every native handle in reverse order. `VoiceEngine` is the lifecycle facade: open devices, join, leave, apply settings atomically. |
| `voice.natives` | `NativeLoader`, `NativeLibrary`, `NativeLayouts` | Extraction, lookup order, dependency order, load report (12.3); per-OS `C_LONG` and struct layouts. |
| `voice.natives.opus` | `OpusBindings`, `OpusCtl`, `OpusCapabilities` | libopus handles and constants (12.2); startup probe (12.3). |
| `voice.natives.dsp` | `RnnoiseBindings`, `SpeexDspBindings`, `ApmBindings` | DSP library bindings. |
| `voice.natives.device` | `AudioShimBindings`, `PortAudioBindings` | `libphreox_audio` and the PortAudio fallback. |
| `voice.codec` | `OpusEncoderHandle`, `OpusDecoderHandle`, `DredCache`, `EncoderConfig`, `PolicyTable`, `EncoderController`, `LossState` | Codec handles with preallocated segments; DRED cache with explicit process and validity; policy as data; loss-state machine publishing `AtomicReference<EncoderConfig>`. |
| `voice.device` | `IAudioDevice`, `NativeAudioDevice`, `PortAudioDevice`, `FileAudioDevice`, `NullAudioDevice`, `DeviceRegistry` | Section 8.1/8.2. |
| `voice.runtime` | `CaptureThread`, `PlayoutThread`, `ControlThread`, `DecodePool`, `SpscFloatRing`, `LatencyHistogram` | Threads and the two real-time primitives they share. |
| `voice.dsp` | `IAudioProcessor`, `CaptureProcessor`, `EchoPolicy`, `NsMode`, `EchoMode`, `VadGate` | Capture chain orchestration. `IAudioProcessor`: `process(float[])` and `algorithmicDelaySamples()`. |
| `voice.dsp.stage` | `ApmProcessor`, `RnnoiseProcessor`, `SpeexNsProcessor`, `SpeexAecProcessor`, `HighPassFilter`, `EnvelopeAgc` | Stage implementations and their fallbacks. |
| `voice.dsp.playout` | `Spatializer`, `Mixer`, `SoftClip`, `Wsola`, `DriftCorrector`, `RecordingTap` | Playout-side processing. |
| `voice.jitter` | `JitterSlotRing`, `DelayEstimator`, `BurstStatistics`, `AdaptiveJitterBuffer`, `LossConcealer`, `RemoteStream` | Section 10. |
| `voice.transport` | `MediaTransport`, `MediaDatagramCodec`, `SendRing`, `MediaControlClient`, `EdgeSelector`, `SessionResumer` | QUIC datagram + WSS fallback adapter on the space connection; media control stream; edge probe; resume. |
| `voice.transport.feedback` | `FeedbackProcessor`, `NackTracker`, `BandwidthEstimator`, `RttEstimator` | FEEDBACK, deadline-aware NACKs, trendline + classifier + AIMD. |
| `voice.crypto` | `SframeCipher`, `SframeHeader`, `MediaKeyRing`, `ReplayWindow` | Section 9.4. `MediaKeyRing` subscribes to the MLS service's epoch changes and unsubscribes on stop. |
| `voice.api` | `VoiceController`, `VoiceEvents` | Local API (section 14) with Phreox annotations; event publishing on `IEventBus`. |
| `voice.stats` | `VoiceMetrics`, `QualityRating` | Counters/histograms; the "18 ms · Excellent" rating (section 14.3). |

Test sources (`src/test/java/.../voice/bench`): `BenchmarkRunner`, `ChannelSimulator`, `TraceReplayer`, `Profiles`, `QualityMetrics`, `Alignment`, `Report`, `NetemProxy` (section 16).

### 13.2 `phreox-api`

- `ApiRoutes`: add `VOICE = PREFIX + "/voice"` and the sub-route constants.
- `talk.phreox.api.voice`: records `VoiceCapabilities`, `AudioDeviceView`, `VoiceSettingsView`, `JoinVoiceRequest`, `PeerSettings`, `VoiceStatsView`, `VoiceDiagnosticsView`.
- `talk.phreox.api.pxp.media` (shared by backend and space, both must parse it): `MediaDatagramHeader` (record + read/write like `FrameHeader`), `MediaDatagramType`, `MediaControlType`, `MediaControlMessage` (sealed interface with one record per subtype in 9.5; the records count toward the limit, so put them in `talk.phreox.api.pxp.media.control` if they exceed it).

### 13.3 `phreox-space`: `talk.phreox.space.media.*`

| Package | Types | Responsibility |
|---|---|---|
| `space.media` | `MediaModule`, `MediaSessionRegistry`, `RoomState`, `RoomCapabilities` | Module lifecycle, sessions, rooms, trackId allocation, common `dredModel`. |
| `space.media.control` | `MediaControlHandler`, `ResumeRegistry` | `MEDIA_CONTROL` stream handling, resume tokens and grace period. |
| `space.media.forward` | `DatagramIngress`, `SpeakerRanker`, `PacketCache`, `DownlinkShaper`, `EgressBudget` | Forwarding hot path (section 15). |
| `space.media.feedback` | `FeedbackAggregator` | Per-hop feedback and hints. |

---

## 14. Local API for the frontend

### 14.1 Rules

- Security is backend-wide, not voice-specific, and is defined in PXP "Lokale Frontend-Bridge": `127.0.0.1` only (already in `AppRuntime`), random session token per start that only the Phreox app gets, `Host` and `Origin` checks. It is implemented once in `FrontendBridge`; voice adds no auth of its own. Media keys never reach the renderer.
- Routes live under `ApiRoutes.VOICE` (`/api/v1/voice`) and are written with the Phreox annotations (`@GET`, `@POST`, `@PUT`, `@Path`, `@Body`, `@PathParam`); `VoiceController` does not know Javalin (Gesamtkonzept §5). `VoiceModule` returns it from `IBackendModule.controllers()`, and the annotation router (`talk.phreox.backend.bridge.route`) registers it.
- Events go through the existing `IEventBus` with type prefix `voice.` and reach the frontend over `ApiRoutes.BACKEND_EVENTS`. If 20 Hz level events turn out too chatty for the shared bus, a dedicated `/api/v1/voice/levels` WS may be added; nothing else gets its own socket.
- The frontend never names servers or tokens: it names a space and a channel; the backend resolves the space connection itself (Gesamtkonzept §6).

### 14.2 Endpoints (prefix `/api/v1/voice`)

| Method & path | Body / response |
|---|---|
| `GET /capabilities` | `{opusVersion, dredModel, dred, deepPlc, osce, osceBwe, qext, apm, rnnoise, speexdsp, audioBackend, degraded[]}`, plus per tier `{capability, entitlement, enabled}` (14.4) |
| `GET /devices` | `{inputs[], outputs[]}`, each `{id, name, defaultSampleRate, lowLatencyMs, headsetGuess}` |
| `PUT /devices` | `{inputId, outputId}`: hot swap without leaving |
| `GET /settings`, `PUT /settings` | `{tier: auto|rescue|low|std|hd|studio|music|stage, maxKbps, latencyMode: competitive|balanced|resilient, ns: auto|off|natural|strong|fast, aec: auto|on|off|system, agc, spatial, cleanPolicy: auto|clean|cleanG, vad: auto|ptt}` |
| `POST /session/join` | `{spaceId, channelId}` → `{sessionId, state}` |
| `POST /session/leave` | – |
| `PUT /self` | `{micMuted, deafened}` |
| `POST /ptt` | `{down}` |
| `PUT /peers/{deviceId}` | `{volume 0..2, muted, azimuthDeg}` |
| `POST /tracks/system-audio` / `DELETE /tracks/system-audio/{slot}` | start/stop an `AUDIO/SYSTEM` track |
| `GET /stats` | full stats snapshot |
| `GET /diagnostics` | the power-user view (14.3) |
| `POST /test/loopback` | `{enabled, simulatedLossPct, burst, jitterMs, delayMs}`: microphone → DSP → encode → `ChannelSimulator` → full receive path → speakers; reports the measured latency |
| `POST /bench/listening-test`, `GET /bench/listening-test/{id}` | hidden-label MUSHRA clip sets from the user's own voice (B0 vs P vs anchors) |

### 14.3 Events and diagnostics

Events on `IEventBus`:
- `voice.levels`, 20 Hz: `{self:{dbov, speaking}, peers:[{deviceId, dbov, speaking}]}`. Drives the speaking aura (Gesamtkonzept §54).
- `voice.stats`, 1 Hz:
  - per peer: `{lossPct, residualLossPct, jitterMs, jbTargetMs, recovered:{red,arq,lbrr,dred,plc,cng}, kbps, tier, state}`
  - self: `{rttMs, uplinkLossPct, sendKbps, tier, lossState, classifier, cpuPct, latency:{captureMs, dspMs, frameMs, lookaheadMs, jbMs, playoutMs, totalEstMs}}`
- `voice.state`: `CONNECTING | CONNECTED | DEGRADED | RECONNECTING | DISCONNECTED`, with a reason.
- `voice.device`: hot-plug.
- `voice.error`.
- `recording.started`, `recording.stopped`, `recording.duration` (Gesamtkonzept §39).

`/diagnostics` fills exactly the Gesamtkonzept §55 view:

| Field | Source |
|---|---|
| Latency | `totalEstMs` (mouth-to-ear estimate: capture + DSP + frame + lookahead + network one-way + JB + playout) |
| Jitter | RFC 3550 jitter of the incoming streams (median over peers) |
| Packet Loss | residual loss after recovery, with raw loss as detail |
| Codec | `Opus <rate> kHz`, plus `DRED/OSCE/QEXT` flags |
| Frame Size | current frame duration |
| Edge | chosen edge name |
| Transport | `QUIC` or `WSS fallback` |
| Encryption | `E2EE` + current epoch |
| DRED | `active` / `off (room mismatch)` / `off (bitrate)` / `unavailable` |

`QualityRating` turns the numbers into the short label for normal users: **Excellent** (residual loss < 0.5%, latency < 80 ms, no `DEGRADED`), **Good** (< 2%, < 150 ms), **Fair** (< 5%, < 250 ms), otherwise **Poor**. The label shows the latency next to it, as in "18 ms · Excellent" (there the latency shown is the network RTT to the edge; the full mouth-to-ear estimate is in the details).

### 14.4 Tiers, capability and entitlement

A tier is usable only if `capability ∧ entitlement` (Gesamtkonzept §15.3):
- capability: the probe says the local libopus and devices can do it (e.g. STAGE needs QEXT) **and** the space advertises `media` with the tier;
- entitlement: a signed entitlement from `phreox-service` with feature id `media.voice.<tier>` (`media.voice.hd` is the example in the Gesamtkonzept).
Which tiers are core (always on) and which need an entitlement is a product decision (Q15). Technically, RESCUE, LOW and STD must always be available, because the adaptive policy falls back to them under bad network conditions.

---

## 15. phreox-space media runtime (SFU/Edge)

phreox-space's media module is the SFU (Gesamtkonzept §3.2, §38). It **never decrypts media and never decodes or transcodes**, and it sees only what PXP allows (plus the level byte if Q12 is accepted). Because it never decodes, it does not care which libopus version clients use; it only compares the announced `dredModel` values.

| Type | Responsibility |
|---|---|
| `MediaModule` | Module lifecycle inside the phreox-space runtime; registers the `MEDIA_CONTROL` handler and the datagram handler on the PXP transport. |
| `MediaSessionRegistry` / `RoomState` | Sessions per QUIC connection; rooms per voice channel; `trackId` allocation (room-unique); roster with deviceId and MLS leaf index. |
| `RoomCapabilities` | Stores each member's `{opusVersion, dredModel}` and broadcasts `ROOM_CAPS {dredModelCommon}` on every join and leave. |
| `MediaControlHandler` | `JOIN`, `LEAVE`, `MUTE`, `PUBLISH_TRACK`, `UNPUBLISH_TRACK`, `KEY_ROTATE` (logging only). Permission checks (Join/Speak, join power) use the space's permission engine; a muted or not-allowed-to-speak track is not forwarded. |
| `ResumeRegistry` | Resume tokens; keeps session state for the 15 s grace period (section 11.2). |
| `DatagramIngress` | Parses the media header (version, type, trackId must belong to this connection), rate limits per track (packets per second and bytes), dispatches. |
| `SpeakerRanker` | Top-N forwarding (N = 6 plus pinned users) by EWMA (300 ms) of the level byte, with 1 s hold-on. Switches only at talkspurt boundaries and announces each switch with `FORWARD_STATE`. System-audio tracks are not ranked; they are forwarded while subscribed. |
| `PacketCache` | Per track, a ring of 128 datagrams (2.56 s). Answers receiver NACKs with the **original bytes** (same SFrame CTR, so it is safe). Retransmits are capped at 30% of the stream bitrate per receiver. NACKs upstream for uplink gaps (hop-by-hop, deadline-bounded, 9.6). |
| `DownlinkShaper` | Per receiver, from that receiver's FEEDBACK: strips RED blocks when downlink loss is under 0.5%; keeps them when it is lossy; adds a **time-diversity duplicate** (the same datagram again 40-60 ms later) for receivers with residual loss above 2% and bandwidth headroom. |
| `FeedbackAggregator` | Acts as the uplink receiver: loss, bursts and arrival deltas per sender, FEEDBACK to the sender every 100 ms; consumes receiver FEEDBACK; sends `PROTECTION_HINT` (max residual loss over receivers) to each sender; answers PING. |
| `EgressBudget` | Per-room egress cap (stereo and high tiers × N receivers). Sends `TIER_HINT` when the cap is exceeded. |

Server targets:
- forwarding p99 < 200 µs at 1000 pps per core (excluding QUIC crypto, measured separately);
- no per-packet allocation on the forwarding path beyond what the QUIC library itself does (pooled buffers);
- load test in slice 6.

---

## 16. Benchmark and test harness

The goal is to prove objectively that Phreox beats a Discord-like baseline under loss and jitter. Everything runs **fully offline** once the corpus and tools are cached.

### 16.1 Setup

Entry point:
```
mvn -pl phreox-backend -Pbench exec:java -Dexec.classpathScope=test -Dexec.mainClass=talk.phreox.backend.voice.bench.BenchmarkRunner \
    -Dexec.args="--matrix quick|full --seeds 3 --out target/bench"
```
then
```
scripts/bench/score.py target/bench
```
Python runs in a venv with `pesq`, `pystoi`, NISQA (PyTorch) and DNSMOS (ONNX), plus a ViSQOL v3 binary built once with Bazel and cached in `~/.cache/phreox/tools`.

- **Corpus:**
  - about 30 min of 48 kHz fullband clean speech: EARS or VCTK-48k (CC BY 4.0), 20 or more speakers, M/F, several languages including German;
  - plus 10 min of the user's own recordings;
  - music snippets for MUSIC;
  - DNS-Challenge noisy mixes for NS tests, reported separately.
  - Normalised to −26 dBov (P.56).
  - Fetched once into `~/.cache/phreox/corpus` and cached in CI.
  - espeak-ng is used only for smoke tests.
- **Runner:**
  - uses the **real production classes** (`OpusEncoderHandle`, `EncoderController`, `AdaptiveJitterBuffer`, `LossConcealer`, `CaptureProcessor` in bypass or on) under a **virtual clock** with `FileAudioDevice`;
  - each packet gets a simulated departure time, impairment, and arrival time;
  - feedback is delivered with the simulated RTT, so adaptation is exercised;
  - ARQ is simulated with a configurable SFU RTT.

### 16.2 Systems under test

All arms use the same libopus binary, so only configuration and algorithms differ.

| Arm | Definition |
|---|---|
| **B0 Discord-like** | VOIP 2048, CVBR, complexity 10, 20 ms, FEC=1, PLP = smoothed measured loss (libwebrtc behaviour; variant B0-fixed10), DRED 0, **decoder complexity 0**, no RED, no ARQ. NetEq-like JB: P95 target, accelerate/expand, FEC lookahead of 1 packet. Target 64k (measured 60.1 kbps). |
| B0+ | B0 with decoder complexity 10. This shows how much of the gain is "just the decoder". |
| B-eq | B0 with its bitrate target auto-calibrated so its measured wire kbps matches P within ±3%. |
| **P** | Full Phreox HD (adaptive policy, recovery-hold JB, onset RED, ARQ). |
| P-eq | P with its bitrate ceiling lowered until its measured wire kbps matches B0 within ±3% (fairness, T7). |
| P-STD, P-LOW | Phreox at 48k and 32k. |
| Ablations | P−DRED, P−ARQ, P−onsetRED, P−hold (fixed JB), P with FEC always on, CLEAN vs CLEAN-G, MODERATE vs MODERATE-B, P with decoder complexity 7. |

### 16.3 Channel matrix (ChannelSimulator, seeded)

- **Gilbert-Elliott** loss in {0, 1, 2, 5, 10, 15, 20, 30}% × mean burst in {1, 1.5, 2.5, 3, 5} frames, with `r = 1/burst` and `p = loss·r/(1−loss)`.
- **Outages:** 100, 200 and 500 ms.
- **Jitter:** Gaussian σ in {5, 20, 40} ms; Pareto spikes (1% of packets +50-200 ms); WiFi-scan pattern (250 ms every 10 s); handover (500 ms blackout followed by a burst); 1% reordering.
- **Rate caps:** 48, 32 and 24 kbps uplink, and a step from 150 down to 80 kbps (exercises congestion vs random classification).
- **Time-varying scripts:** clean, then 10% burst, then clean (adaptation T9); random loss with no delay rise vs bottleneck-induced loss (classifier).
- **SFU RTT:** 20, 40 and 80 ms.
- **Trace replay:** WiFi and LTE traces (seq, arrival time) recorded with PING trains.
- **Matrices:**
  - `quick`, for CI: 6 conditions × 2 min of corpus × 1 seed, about 3 min wall time.
  - `full`, nightly: everything × 3 seeds.

### 16.4 Metrics

Alignment: codec lookahead (312 samples) plus the logged playout offset, refined by cross-correlation within ±30 ms.

| Metric | Use |
|---|---|
| ViSQOL v3 **audio mode 48 kHz** | Primary clean-channel and fullband metric (T1). |
| ViSQOL v3 speech mode 16 kHz | Loss conditions (T3, T5, T6). |
| PESQ-WB P.862.2 (pip `pesq`) | Loss conditions (T3, T4, T5, T7). **Not decisive for clean CELT vs hybrid**, because it has a known bias toward hybrid. |
| eSTOI (`pystoi`) | Intelligibility (T5). |
| NISQA, DNSMOS P.835 | Non-intrusive (T2); NS and AEC evaluation. |
| Java `QualityMetrics`: fullband LSD (1024 Hann, 10 ms hop, 50 Hz-20 kHz, active frames), mel-LSD, high-band (8-20 kHz) retention, concealment-window LSD | Diagnostics and regression. |
| Residual frame loss after recovery; per-stage recovery counts (DRED counted only when validated); audible gaps (100 ms windows where the output is more than 20 dB below the reference while it is active); longest gap | T4, T8. |
| JB delay p50/p95, late-loss %, and wire kbps (codec, RED, headers, measured) | T7, T12; fairness check. |
| SegSNR | Lossless and bypass sanity checks only. |

Statistics:
- paired per-utterance differences, bootstrap 95% CI (2000 resamples);
- pass and fail exactly as defined in section 4;
- output `results.csv`, plus `report.html` with: MOS vs loss per burst length, delay vs quality Pareto, recovery-stage stacked bars, kbps per arm.

### 16.5 CI gate (GitHub Actions, Linux)

Each run does the following:
1. Unit and FFM tests.
2. Quick matrix.
3. Fail the build if any of these holds:
   - any CI-gated target in section 4 misses its threshold;
   - P regresses by more than 0.05 MOS against the previous main-branch result on any condition;
   - the DRED-validity unit test fails;
   - the probe on our libopus build fails (section 2).

### 16.6 End-to-end and real-baseline tests (Linux, automatable)

- **E2E:**
  - two `phreox-backend` instances plus a local `phreox-space` with the media module;
  - traffic goes through `NetemProxy`, an in-process Java UDP impairment proxy that needs no root;
  - optionally `unshare -rn` network namespaces with veth pairs and `tc netem gemodel`.
- **Audio:** `FileAudioDevice`, or PipeWire null-sinks with `pw-loopback`, `pw-play` and `pw-record`.
- **Click test:** a 1 ms click every 500 ms gives a mouth-to-ear histogram (T10, T11).
- **Real libwebrtc baseline:**
  - headless Electron 44/Chromium runs a loopback `RTCPeerConnection` pair (Opus `useinbandfec=1; maxaveragebitrate=64000`, real NetEq);
  - `--use-fake-device-for-media-stream --use-file-for-fake-audio-capture=<wav>`, with output recorded;
  - routed through the same netem namespaces;
  - scored with the same metrics.
  - This is the most honest Discord-like baseline available offline.
- **Optional, not in CI:** the same PipeWire click rig against the real Discord desktop client, to measure its latency.
- **Soak:** 30 min with JFR (`jdk.ObjectAllocationSample` filtered to voice threads, GC pauses), plus xrun counts from `IAudioDevice.xruns()` (T14).
- **DSP tests:**
  - impulse and cross-correlation delay per processor (RNNoise must report 960);
  - AEC3 ERLE and double-talk on ICASSP AEC-Challenge vectors, AUTO vs always-on;
  - DNSMOS for RNNoise vs APM NS;
  - LUFS spread for AGC.

### 16.7 Unit and FFM tests (JUnit 5)

- Surefire `argLine=--enable-native-access=ALL-UNNAMED`.
- Opus round trip with lookahead-aligned correlation above 0.9.
- Every ctl used returns 0, or the expected −5, matching `OpusCapabilities`.
- `GET_DRED_DURATION` returns what was set.
- DRED reach > 0 at 64k/PLP20/FEC1.
- `has_lbrr == 1` at FEC1/PLP5.
- `opus_packet_unpad` removes DRED (parse returns 0 afterwards).
- DRED validity: offset ≤ dredEnd is rejected; offset > reach is rejected; deferred-but-unprocessed decode equals PLC.
- The frame-size contract (−1 on a mismatch).
- PortAudio struct offsets per `C_LONG` size.
- `MediaDatagramHeader`/`MediaDatagramCodec` fuzzing (jqwik).
- SFrame: RFC 9605 test vectors; KID layout round trip; epoch transition window; replay window.
- Nonce uniqueness across variants.
- JitterBuffer properties: no frame emitted twice; monotonic order when there is no loss; zero allocation (JFR).
- JMH: encode, decode, PLC, DRED, rnnoise, SFrame AES-GCM; critical vs non-critical.

---

## 17. Ordered implementation slices

Each slice can be built and tested on its own. "Done when" is the acceptance test. Slices 6-8 depend on PXP work outside voice (QUIC transport, MLS facade); slices 0-5 do not.

| # | Slice | Contents | Done when |
|---|---|---|---|
| 0 | Skeleton | `VoiceModule` registered in `AppRuntime.registerModules()` (no-op start/stop); packages from section 13; `ApiRoutes.VOICE`; `talk.phreox.api.voice` records; surefire `argLine=--enable-native-access=ALL-UNNAMED`; manifest `Enable-Native-Access: ALL-UNNAMED`. | `mvn -q verify` green; backend starts; the module shows `RUNNING` in `/api/v1/backend/state`. |
| 1 | Own libopus + FFM foundation | Build script for libopus 1.6.1 (pinned SHA-256, `--enable-dred --enable-osce --enable-qext`) for **linux-x64** first; `NativeLoader`, `OpusBindings`, `OpusCtl`, `OpusCapabilities`, codec handles, `DredCache`; `GET /voice/capabilities`. | Unit tests in 16.7 pass **against our build**; capabilities show DRED, BWE and QEXT = yes; the same tests with the distro lib via override show BWE/QEXT = no and `degraded`. |
| 2 | Offline proof v1 | `ChannelSimulator` (GE loss, outages), `Profiles` B0/B0+/P (static states)/ablations, `LossConcealer`, fixed-delay JB, `QualityMetrics`, `score.py`, report, CI quick gate. **Re-measure the clean claim at equal wire kbps; decide CLEAN vs CLEAN-G and MODERATE vs MODERATE-B; fill `PolicyTable` for all tiers by sweep.** | The report reproduces the prototype loss deltas; T3/T4/T5/T7 pass with static states; the clean decision is written into section 6.4. |
| 3 | Adaptive JB and policy in simulation | `DelayEstimator`, `BurstStatistics` R(h), spike mode, `AdaptiveJitterBuffer`, `Wsola`, `DriftCorrector`, `EncoderController`, `BandwidthEstimator` (simulated feedback), time-varying scripts. | T8, T9 and T12 pass in simulation; classifier ≥ 90% correct on the random vs bottleneck scripts; zero allocation in JFR. |
| 4 | Local audio I/O | `PortAudioDevice` (interim) and `libphreox_audio` for Linux/PipeWire; `DeviceRegistry`; `CaptureThread`, `PlayoutThread`; `POST /voice/test/loopback`; device endpoints. | Loopback is audible on both backends; the click test gives local latency (PipeWire path ≤ PortAudio path); xrun counters work; a 10 min run shows no allocations. |
| 5 | Capture DSP | `libphreox_apm` shim plus `ApmBindings`, RNNoise with dry delay, speex FAST NS and fallback AEC, `CaptureProcessor` AUTO, `EchoPolicy`, `VadGate`, per-stage delay reporting, `voice.levels` events. | Impulse-delay tests pass; DNSMOS/ERLE/LUFS reports are generated. |
| 6 | Network MVP | `MediaDatagramCodec` (+ shared `talk.phreox.api.pxp.media`), `SframeCipher` with **static test keys** (RFC 9605 test vectors first), `ReplayWindow`, `MediaTransport` on the PXP QUIC connection, `MediaControlClient`. Space: `MediaModule`, `MediaSessionRegistry`, `MediaControlHandler`, `DatagramIngress`, `SpeakerRanker`, plain forwarding. | Two local backends hold a call through a local phreox-space; the E2E click test meets T10; the space load test meets forwarding p99 < 200 µs. |
| 7 | Resilience and resume | FEEDBACK, `NackTracker`, `SendRing`, onset RED, `PacketCache` (ARQ both hops), `DownlinkShaper`, `FeedbackAggregator` (`PROTECTION_HINT`), `FORWARD_STATE`, real bandwidth estimation, WSS fallback, session states and `SESSION_RESUME`, `ResumeRegistry`. | The E2E run through `NetemProxy` meets T3-T9 within 0.1 of the offline numbers; pulling the network for 5 s resumes without rejoin and without key renegotiation. |
| 8 | Media E2EE with MLS | `MediaKeyRing` on top of the MLS service (`px_mls_export`), KID layout, epoch transition with the 2 s window and the 150 ms pending queue, `ROOM_CAPS`, `KEY_ROTATE`. | A membership change during speech causes < 1 concealed frame; a removed device cannot decrypt the next epoch (test). |
| 9 | Multi-party, UI and diagnostics | `Mixer`, `Spatializer`, per-peer controls, `DecodePool`, `voice.stats`, `/voice/diagnostics`, `QualityRating`; frontend voice panel (aura, "18 ms · Excellent", details view). | An 8-speaker run meets T13; the soak meets T14. |
| 10 | Packaging | Own libopus 1.6.1 and all other natives (speexdsp, rnnoise, phreox_apm, phreox_audio, PortAudio fallback) for all 5 targets in CI; jlink runtime; Electron starts the backend with port and session token; macOS signing. | The probe passes in CI on every target; a fresh install works on Windows, macOS and Linux. |
| 11 | Premium, system audio and proof | Competitive mode (RLD encoder swap), STUDIO/MUSIC/STAGE, `AUDIO/SYSTEM` track with self-exclusion per OS, edge probing, `RecordingTap`, real libwebrtc baseline in netem namespaces, MUSHRA "Hörtest" page and study, optional DeepFilterNet. | T11 and T15 pass; the real-baseline report is published; system audio never contains Phreox's own playout. |

---

## 18. Risks and open questions

### 18.1 Risks

1. **The clean-channel win is unproven at equal bitrate.** The earlier 7.8 vs 12.2 dB LSD figure likely compared about 113 vs 60 kbps. If CVBR CELT at 64.4 kbps does not beat hybrid+LBRR at about 60 kbps on ViSQOL audio mode, T1 fails. The fallback is to claim a clean "no worse" result and win only on loss. Slice 2 decides this early.
2. **CLEAN has no in-band protection** (PLP0 means no DRED and no LBRR, because any PLP forces hybrid). The first burst of a loss episode depends on onset RED, ARQ (needs RTT to the SFU within the JB slack) and deep PLC. CLEAN-G is the hedge.
3. **DRED is expensive in bits.** At 64k/PLP20 the primary falls to 37 kbps, and at SEVERE 96k the total is about 132 kbps with headers. Bad tuning makes Phreox sound worse than Discord at moderate loss. The policy table must be tuned against the harness.
4. **Wire bitrate exceeds the configured bitrate** whenever DRED is on, and QUIC + SFrame add about 97 B per packet. Rate control and egress caps must use measured bytes, or congestion follows.
5. **QUIC congestion control vs. our rate control.** Datagrams count against the QUIC congestion window; a QUIC library that queues or drops datagrams invisibly would undermine the jitter buffer and the bandwidth estimate. The library choice must satisfy 9.6.
6. **Concealment CPU spikes:** deep PLC costs up to 0.7 ms per 20 ms per stream. Many concealing streams at once (a shared bad downlink) can blow the playout tick. Mitigations: `DecodePool`, complexity step-down for low-ranked streams.
7. **Building libopus ourselves for 5 targets** means build maintenance, and the 1.6.x neural APIs could change. The CI probe is the safety net.
8. **Java real-time behaviour:** no RT scheduling by default, JIT, safepoints during critical calls. Mitigations: platform threads, warm-up, zero allocation, ZGC, critical calls ≤ 1 ms. Underruns on loaded systems remain a risk.
9. **Native audio shim** (`libphreox_audio`): three OS implementations in C/C++/Objective-C. Until it exists, PortAudio on Linux goes through pipewire-alsa with higher latency.
10. **AEC3 shim build engineering:** C++ ABI, static abseil, Windows meson. Until it ships, speexdsp AEC is clearly worse than Discord on speakers.
11. **RNNoise is weaker than Krisp and costs 20 ms.** Users in noisy rooms may prefer Discord until DeepFilterNet arrives.
12. **Top-N forwarding plus seq-gap loss accounting** depends on `FORWARD_STATE` being correct. If it is wrong, loss is miscounted and protection is raised for no reason.
13. **MLS epoch timing:** if receivers process a commit much later than the sender, frames wait in the pending queue or are concealed. Large calls with frequent joins cause frequent epochs.
14. **macOS:** TCC microphone attribution and library validation for extracted natives.
15. **Mobile (Capacitor) cannot run this JVM sidecar.** Mobile needs a native port of the engine; out of scope here.
16. **Metric validity:** PESQ has a bias against CELT and mis-scores generative concealment, and espeak underrates DRED. The final claim rests on ViSQOL, NISQA and MUSHRA with natural speech.
17. Voice does not go through Chromium WebRTC. Video and screenshare will need their own path (separate spec).

### 18.2 Open questions

- **Q1:** Exact CMake option names in libopus 1.6.1 for DRED, OSCE/BWE and QEXT (autotools flags are fixed in section 2). The CI probe is the backstop.
- **Q2:** Is the PortAudio fallback still needed once `libphreox_audio` exists on all three OSes, or is it dropped in slice 10?
- **Q3:** CLEAN vs CLEAN-G and MODERATE vs MODERATE-B: decided by slice 2 data.
- **Q4:** The R(h) cost constant (4 ms per 1% residual loss), the latency-cap defaults, and whether `balanced` (150 ms cap) is the right default for gamers.
- **Q5:** APM AEC3 and NS algorithmic delay at 48 kHz: measured in slice 5, then added to the latency budget.
- **Q6:** Should the SFU forward more than 6 speakers in large rooms? This trades egress against conversational realism.
- **Q7:** Whether the libwebrtc version in Electron 44 enables decoder complexity above 0 or DRED by field trial. That would change the B0 definition, so verify against the real-baseline arm.
- **Q8:** *(resolved)* Key management uses MLS + SFrame as defined in PXP; the earlier custom X25519 key wrap is dropped.
- **Q9:** Grace period 15 s, epoch transition window 2 s, pending-key wait 150 ms: values defined here; confirm or adjust.
- **Q10:** System-audio self-exclusion per OS (section 8.3): verify the three mechanisms; decide whether macOS < 14.4 gets no system audio.
- **Q11:** **[PXP]** Is deadline-bounded SFU retransmission (9.6) compatible with PXP's "Realtime-Media … ohne Retransmits", or should PXP say "no transport retransmits; application NACK only within the playout deadline"?
- **Q12:** **[PXP]** Add "audio level / voice activity" to the metadata the SFU may see (needed for speaker ranking, 9.2).
- **Q13:** **[PXP]** Accept the compact media datagram header (9.2) instead of the 34-byte frame header for media datagrams; and later, whether per-packet overhead (≈ 97 B) should be reduced.
- **Q14:** Zero-allocation AES-GCM via OpenSSL over FFM, or accept the JDK's small per-packet allocation permanently.
- **Q15:** Which voice tiers are core and which need an entitlement (`media.voice.<tier>`)? Technically RESCUE/LOW/STD must always be available.
- **Q16:** `MEDIA_CONTROL` payload encoding: follow whatever PXP defines for `CONTROL` payloads (9.5).
