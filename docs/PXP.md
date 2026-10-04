# Phreox Protocol (PXP)

Status: Konzept v0.2 · Stand 2026-10-04

## Ziel

Phreox soll nicht auf Matrix angewiesen sein, sondern ein eigenes Kommunikationsprotokoll besitzen.

**Eigenes Protokoll, aber keine eigene Kryptographie.**
Für Security werden etablierte und auditierbare Standards verwendet (TLS 1.3, QUIC, MLS / RFC 9420, SFrame / RFC 9605).

PXP deckt nativ ab:

- Textnachrichten
- DMs, Gruppen und Community-Spaces
- Dateien und Anhänge
- Voice, Kamera, Screenshare, Systemaudio
- Presence / Realtime Events
- Moderation und Reports

Das Sicherheitsniveau soll mindestens in Richtung Matrix gehen, ohne zwangsläufig kryptografisch „besser als Matrix“ sein zu müssen.

---

## Grundentscheidungen v1

| Bereich | Schutz | Eigenschaften |
|---|---|---|
| **Public Community** | TLS/QUIC (Transport) | Server-readable, voller Verlauf, Suche, normale Moderation |
| **Private Communication** (DMs, Gruppen, private Channels) | MLS E2EE | Forward Secrecy, Post-Compromise Security |
| **Media** (Voice, Kamera, Screen, Systemaudio) | MLS Group Key Agreement + SFrame-artige E2EE | Exporter-basierte Media Keys, SFU ohne Content-Zugriff |

---

## Ebenen

1. **Control Plane**
   Auth, Devices, Presence, Memberships, Permissions, Track-Steuerung, Session-State, MLS Delivery Service.

2. **Messaging Plane**
   Events für Nachrichten, Reactions, Edits, Threads usw. – je nach Conversation-Modus im Klartext (über TLS/QUIC) oder als MLS-Ciphertext.

3. **Media Plane**
   Ende-zu-Ende verschlüsselte Voice-, Kamera-, Screenshare- und Systemaudio-Streams.

Der Server ist für Routing und autoritativen State zuständig. In privaten Conversations sieht er keinen Inhalt.

---

## Conversation-Modi

Jede Conversation hat genau einen Modus, der beim Erstellen festgelegt wird.

| Modus | Verwendung | Krypto | Verlauf für neue Mitglieder |
|---|---|---|---|
| `PUBLIC` | öffentliche Community-Channels | TLS/QUIC | ja, vollständig |
| `PRIVATE` | DMs, Gruppen, private Channels | MLS | nein (ab Beitritt) |

Begründung: Große Communities würden mit MLS permanente Commits bei jedem Join/Leave erzeugen, und neue Mitglieder hätten keinen Verlauf. Öffentliche Channels brauchen außerdem Suche und normale Moderation.

Ein Moduswechsel einer bestehenden Conversation ist in v1 nicht vorgesehen.

**Nicht v1:** Ein dritter Modus für private Channels mit expliziter History-Übertragung an neue Mitglieder.

---

## Identity und Devices

Ein Account besitzt mehrere kryptografisch eigenständige Devices.

```text
User
├── Desktop
├── Laptop
└── Smartphone
```

- Jedes Device besitzt eigene private Schlüssel (Signatur-Key für MLS-Credentials, Device-Identity-Key).
- Private Device-Keys verlassen das Device nie und liegen nie auf dem Phreox-Server.
- Jedes Device ist in jeder privaten Conversation ein eigenes MLS-Leaf.
- Neue Devices werden verifiziert, z. B. per QR-Code oder Short Authentication String.

### Multi-Device und Recovery

Zwei Wege, beide in v1:

1. **Device-Pairing:** Ein vorhandenes, verifiziertes Device provisioniert das neue Device per QR-Code/Pairing direkt (Device-zu-Device, Ende-zu-Ende verschlüsselt). Übertragen werden Account-Identität, Cross-Signing des neuen Devices und optional lokaler Verlauf.
2. **Verschlüsseltes Server-Backup:** Ist kein Device mehr verfügbar, stellt der Nutzer aus einem Backup wieder her.
   - Das Backup wird clientseitig mit einem Key verschlüsselt, der aus dem **Recovery-Key** abgeleitet ist.
   - Den Recovery-Key besitzt ausschließlich der Nutzer.
   - Für Phreox ist das Backup nur ein Ciphertext-Blob.

Account-Recovery (z. B. per E-Mail) stellt nur den **Account** wieder her, nie die E2EE-Inhalte. Es gibt keinen Recovery-Weg, der eine E2EE-Backdoor darstellt.

---

## MLS Delivery Service und Membership

PXP folgt einem DAVE-artigen Modell: Der Server ist autoritativ für Membership, kann aber keine Inhalte lesen.

- Der Server kennt Membership und Permissions jeder privaten Conversation.
- Der Server ist als **External Sender** in der MLS-Gruppe eingetragen (RFC 9420, `external_senders`). Er erzeugt Add/Remove-Proposals selbst, sobald eine Membership-Änderung autorisiert ist.
- Clients committen diese Proposals. Ein Commit mit nicht autorisierten Add/Remove-Proposals wird vom Server abgelehnt.
- **Handshake-/Commit-Nachrichten laufen als `PublicMessage`**, damit der Server Membership-Transitions validieren kann.
- **Application Content läuft immer als `PrivateMessage`.**
- Pro Gruppe und Epoche akzeptiert der Server genau einen Commit (den ersten gültigen). Konkurrierende Commits werden abgelehnt; der Client verarbeitet den akzeptierten Commit und versucht es ggf. in der neuen Epoche erneut.
- Jede Membership-Änderung erzeugt eine neue Epoche. Entfernte Devices können zukünftige Inhalte nicht mehr entschlüsseln.

```text
Conversation (PRIVATE)
    ↓
MLS Group (Server = External Sender, ordnet Commits)
    ↓
PrivateMessage(Event)
```

---

## Event-Modell

Nachrichten sind Events, z. B.:

```text
message.create
message.edit
message.delete
reaction.add
reaction.remove
thread.create
```

- `PUBLIC`: Events gehen im Klartext über TLS/QUIC an den Server, der sie speichert, indexiert und ausliefert.
- `PRIVATE`: Der Event-Inhalt ist MLS-Application-Data. Der Server speichert und routet Ciphertext plus notwendige Routing-Metadaten.

---

## Authentizität, Reports und Moderation

### Keine zusätzliche Phreox-Signatur

MLS signiert jede Nachricht bereits mit dem Signatur-Key des sendenden Devices (`FramedContent` + Signatur innerhalb der `PrivateMessage`). Eine zusätzliche Phreox-Nachrichtensignatur ist nicht nötig, sofern die MLS-Authentizität korrekt verwendet und das MLS-Credential an das registrierte Device gebunden ist.

### Server-Receipt

Der Server stellt für jedes Event einen signierten Receipt aus:

- Event-ID
- Ciphertext-Hash
- Conversation-ID
- Sender-Device
- Server-Zeitstempel

### Report-Ablauf

Reports sind eine **explizite, freiwillige Freigabe durch den meldenden Client**. Der Nutzer wählt aus, welche Evidence übertragen wird (gemeldete Nachricht, Kontextnachrichten, Anhänge, weitere relevante Events). Der Client zeigt klar an, was freigegeben wird.

```text
Client entschlüsselt ausgewählte Evidence lokal
↓
authentifizierter MLS-Inhalt (FramedContent, Signatur, Epoch/GroupContext, Sender-Credential)
+ Server-Receipt / Ciphertext-Hash
↓
EvidenceBundle
↓
frischer zufälliger ReportKey → AEAD → EncryptedEvidence
↓
ReportKey mit Moderation-Public-Key wrappen → EncryptedReportKey
```

Optional zweistufig:

```text
REPORT_PREPARE → EncryptedEvidence hochladen
REPORT_COMMIT  → EncryptedReportKey übertragen
```

Wird der Report abgebrochen, bleibt die Evidence unlesbar und wird nach kurzer TTL gelöscht.

Regeln:

- Nur die Moderations-Infrastruktur besitzt den privaten Moderation-Key.
- Es gibt **keinen statischen geheimen Phreox-Master-Key im Client**.
- Einzelne MLS-Message-Keys werden **nicht** langfristig gespeichert oder freigegeben, das würde Forward Secrecy untergraben. Falls OpenMLS später einen sauberen Weg bietet, einzelne Nachrichten kryptografisch freizugeben, ohne Keys unnötig lange vorzuhalten, kann das gezielt ergänzt werden.

### Bewusster Trade-off: keine Deniability gegenüber Moderation

Gemeldete Inhalte können über die MLS-Signatur kryptografisch einem Device zugeordnet werden. E2EE bedeutet in PXP daher **nicht** Deniability gegenüber einer bewusst durchgeführten Moderationsfreigabe.

### Bekannte Grenze v1

Die MLS-Signatur beweist die **Autorschaft** des Inhalts. Der Server-Receipt beweist, dass ein Event mit diesem Ciphertext-Hash transportiert wurde. Dass genau dieser Klartext zu genau diesem Ciphertext gehört, ist in v1 ohne Freigabe des Message-Keys nicht kryptografisch bewiesen, sondern nur über Konsistenz von Conversation, Epoche, Sender-Device und Zeitpunkt.

---

## Voice, Kamera und Screenshare

Media-Tracks sind ein allgemeines Konzept:

```text
Media Track
├── AUDIO / MICROPHONE
├── AUDIO / SYSTEM
├── VIDEO / CAMERA
├── VIDEO / SCREEN
└── VIDEO / WINDOW
```

Ein Device darf mehrere Tracks gleichzeitig veröffentlichen:

```text
Jason/Desktop
├── microphone
├── camera
├── screen-1
└── system-audio-1
```

Voice nutzt den eigenen Opus-Stack (libopus 1.6 mit DRED/OSCE, adaptivem Jitterbuffer, FEC/PLC, Neural Processing). DRED-Fähigkeit wird pro Raum ausgehandelt, da das 1.6-DRED-Modell nicht bitstream-kompatibel zu 1.5 ist.

Video/Screenshare mit Codec-Negotiation (AV1, VP9, H.264, spätere Codecs).

Kamera:
- adaptive Bitrate
- Simulcast oder SVC
- dynamische Auflösung/FPS

Screenshare:
- hohe Textschärfe
- Modi für Text/Desktop, Video und Games
- hohe FPS optional
- Systemaudio als eigener Track

---

## Media Security und SFU

Voice und Video sind immer Ende-zu-Ende verschlüsselt, auch in Voice-Channels von `PUBLIC`-Communities. Jeder Voice-Call hat dafür eine eigene MLS-Gruppe der aktuellen Teilnehmer-Devices.

```text
Capture → Encode → SFrame encrypt → PXP Media Transport
→ Phreox SFU →
PXP Media Transport → SFrame decrypt → Decode
```

### Media-Key-Ableitung

Media-Keys werden pro MLS-Epoche über den MLS-Exporter abgeleitet, mit **getrenntem Context pro Sender und Track**:

```text
base_key = MLS-Exporter("pxp media v1", context, 32)

context:
  audio/<device>
  camera/<device>
  screen/<device>/<track>
  system-audio/<device>/<track>
```

- Membership-Wechsel → neue MLS-Epoche → neue Media-Keys.
- Die SFrame-KID kodiert Epoche sowie Sender/Track, damit Empfänger den richtigen Key wählen.
- Beim Epochenwechsel bleibt der Key der vorherigen Epoche für ein kurzes Übergangsfenster gültig, damit Frames im Flug nicht verloren gehen.
- SFrame-Cipher-Suite: AEAD, z. B. `AES_128_GCM_SHA256_128` (RFC 9605).

### Was der SFU sehen darf

Der SFU routet Streams und wählt Quality-Layer, kann den Inhalt aber nicht entschlüsseln. Er kennt nur Routing-Metadaten:

- Session, Sender, Track-ID, Media-Typ
- Layer
- Sequenz / Timing
- Netzwerkmetriken

---

## Dateien

```text
File → zufälliger FileKey → AEAD → Encrypted Blob → Phreox Storage/CDN
```

- In `PRIVATE`-Conversations werden Anhänge clientseitig verschlüsselt. Dateiname, MIME-Type, FileKey und weitere Metadaten liegen im E2EE-Nachrichteninhalt. Der Storage-Server besitzt keinen FileKey.
- In `PUBLIC`-Conversations liegen Anhänge server-readable vor, damit Moderation und Vorschauen funktionieren.

---

## Transport

TLS/QUIC ist immer aktiv, zusätzlich zu E2EE.

```text
QUIC Connection (ALPN "pxp/1")
├── Control
├── Messaging
├── Presence
├── Sync
└── Media Control
```

- Fallback, wenn UDP blockiert ist: WebSocket über TLS mit identischem Frame-Format.
- Realtime-Media läuft über QUIC-Datagrams (RFC 9221) bzw. einen gleichwertigen unzuverlässigen Realtime-Transport, ohne Retransmits.

### Frame-Header

Versionierung ist von Anfang an Teil jedes Frames. Byte-Order: Big Endian.

| Feld | Größe | Bedeutung |
|---|---|---|
| `protocolVersion` | u8 | PXP-Wire-Version, aktuell `1` |
| `frameType` | u8 | Art des Frames (siehe unten) |
| `flags` | u16 | Bitfeld, unbekannte Bits müssen 0 sein |
| `cipherSuite` | u16 | `0x0000` = nur Transport, sonst MLS-Cipher-Suite-ID (RFC 9420) |
| `conversationId` | 16 Byte | Conversation-Kontext, Null-ID für verbindungsweite Frames |
| `sequence` | u64 | streng monoton pro Verbindung und Richtung |
| `payloadLength` | u32 | Länge des folgenden Payloads, maximal 16 MiB |

Header-Größe v1: 34 Byte. Größere Daten (Dateien) laufen nicht über Frames, sondern als Blob über Storage/CDN. Das Limit schützt den Empfänger vor Speicher-DoS. Optimierung (z. B. Varints) ist später möglich, ohne dass Versionierung nachträglich drangeklebt werden muss.

Frame-Typen v1 (Auszug): `HELLO`, `HELLO_ACK`, `PING`, `PONG`, `ERROR`, `CONTROL`, `EVENT`, `MLS_HANDSHAKE`, `MLS_APPLICATION`, `MEDIA_CONTROL`, `ACK`.

Flags v1:
- Bit 0 `CRITICAL`: Empfänger muss den Frame-Typ verstehen, sonst `ERROR` und Abbruch. Ohne `CRITICAL` werden unbekannte Frame-Typen ignoriert.
- Bit 1 `ACK_REQUESTED`: Empfänger bestätigt mit `ACK`.

Versionsaushandlung: Der Client nennt in `HELLO` seine unterstützten Protokollversionen und Cipher-Suites, der Server wählt in `HELLO_ACK`. Unbekannte `protocolVersion` → `ERROR` und Verbindungsabbruch.

### Replay-Schutz

- Transport: `sequence` ist streng monoton; der Empfänger verwirft Frames mit `sequence <= letzte gesehene`.
- MLS: Epoche und Generation pro Sender schützen Application-Messages zusätzlich Ende-zu-Ende.
- Media: SFrame-Counter mit Replay-Fenster pro KID.

---

## Native MLS-Fassade

MLS kommt von **OpenMLS** (Rust). Java bindet OpenMLS nicht direkt an, sondern eine kleine eigene native Fassade mit **stabiler C-ABI**. Java nutzt sie über FFM (Panama) und kennt keine internen OpenMLS-Typen.

```c
uint32_t px_mls_abi_version(void);

px_status px_mls_group_create(const px_mls_config*, px_bytes group_id, px_mls_group** out);
px_status px_mls_group_join  (const px_mls_config*, px_bytes welcome, px_mls_group** out);
px_status px_mls_add         (px_mls_group*, px_bytes key_packages, px_buf* out_commit, px_buf* out_welcome);
px_status px_mls_remove      (px_mls_group*, px_bytes leaf_indices, px_buf* out_commit);
px_status px_mls_process     (px_mls_group*, px_bytes message, px_mls_result* out);
px_status px_mls_encrypt     (px_mls_group*, px_bytes plaintext, px_buf* out_ciphertext);
px_status px_mls_decrypt     (px_mls_group*, px_bytes ciphertext, px_mls_result* out);
px_status px_mls_export      (px_mls_group*, px_bytes label, px_bytes context, uint32_t len, px_buf* out);
px_status px_mls_serialize   (px_mls_group*, px_buf* out_state);
void      px_mls_destroy     (px_mls_group*);
void      px_buf_free        (px_buf*);
```

Regeln für die Fassade:

- Opake Handles, keine Rust-Typen über die Grenze.
- Ausgabe-Buffer gehören der Fassade und werden mit `px_buf_free` freigegeben.
- Fehler nur über `px_status`, niemals Panics über die FFI-Grenze (`catch_unwind`).
- `px_mls_abi_version` wird beim Laden geprüft; inkompatible Version → Backend startet MLS nicht.
- Ein Handle ist nicht thread-safe; das Java-Backend serialisiert Zugriffe pro Gruppe.
- Serialisierter Gruppenzustand wird vor dem Speichern mit dem Local-Master-Key verschlüsselt.

---

## Lokale Phreox-Architektur

`phreox-backend` ist die lokale Java Application Engine auf dem Rechner des Nutzers. Dort liegt die schwere Client-Logik:

- PXP Client (Transport, Frames, Sync)
- Crypto, Device Identity, MLS State (über die native Fassade)
- Voice Engine, Video/Screenshare Engine, Media Processing
- Local Cache, Search
- Upload/Download, Notifications

Das Frontend übernimmt Darstellung und Interaktion.

> **Frontend entscheidet Darstellung. Backend entscheidet Verhalten. Server entscheidet Wahrheit.**

### Lokale Schlüssel

Device-, Recovery- und Local-Master-Keys liegen im jeweiligen OS-Keystore:

- Windows → DPAPI/CNG
- macOS → Keychain
- Linux → Secret Service / libsecret

Private Keys liegen **nie** im Klartext in PolyDB oder Config-Dateien. PolyDB speichert nur Daten, die mit dem Local-Master-Key verschlüsselt sind.

### Lokale Frontend-Bridge

Das Backend hält entschlüsselte Inhalte. Die lokale HTTP/WebSocket-Bridge auf `127.0.0.1` muss deshalb abgesichert sein:

- zufälliges Session-Token pro Start, das nur die Phreox-App erhält
- Prüfung von `Host`- und `Origin`-Header (Schutz gegen Zugriffe aus dem Browser und DNS-Rebinding)

---

## Metadaten

PXP v1 schützt **Inhalte**, versucht aber **nicht**, sämtliche Metadaten vor Phreox zu verstecken. Es gibt keine „Zero Knowledge“-Versprechen.

Der Server kennt bzw. muss je nach Funktion kennen:

- Accounts, Devices und Memberships
- Kommunikationszeitpunkte
- IP- und Verbindungsdaten
- Traffic-Größen
- Routing-Informationen (Conversation, Sender-Device, Media-Tracks)
- Inhalte von `PUBLIC`-Conversations

---

## Security-Grundsätze

- Kein selbst erfundener Cipher.
- Keine geheimen globalen Keys im Client.
- Private Device-Keys bleiben lokal, im OS-Keystore.
- Forward Secrecy und Post-Compromise Security für `PRIVATE`.
- E2EE für private Messages, private Dateien, Voice und Video.
- Server kann in `PRIVATE` und bei Media keinen Content entschlüsseln.
- Reports sind gezielte, freiwillige Offenlegung einzelner Inhalte.
- Local Storage und Crypto-State sind geschützt.
- Recovery hebelt E2EE nicht durch eine serverseitige Backdoor aus.
- Protokoll und Crypto-State-Machines werden gefuzzed und getestet.
- Vor einer Aussage wie „Matrix-Level Security erreicht“ ist ein externer Security/Crypto-Audit notwendig.

---

## Offene Punkte

- **Föderation:** Annahme für v1 ist ein einzelnes autoritatives Phreox-Netz ohne Föderation. Muss noch bestätigt werden.
- **QUIC in Java:** Auswahl der Implementierung (z. B. Netty QUIC, kwik).
- **History-Modus** für private Channels (nicht v1).
- **Header-Optimierung** nach ersten Messungen.
