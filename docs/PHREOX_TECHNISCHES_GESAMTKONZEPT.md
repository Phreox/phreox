# Phreox – Technisches Gesamtkonzept

> **Stand:** zusammengeführtes Konzept aus dem ursprünglichen Phreox-Entwurf und der aktuellen Architektur.  
> **Priorität:** Alle neueren Architekturentscheidungen haben Vorrang. Punkte aus dem alten Konzept wurden nur übernommen, wenn sie weiterhin passen oder sinnvoll angepasst werden konnten.

---

# 1. Grundidee

**Phreox** ist eine moderne Realtime-Kommunikationsplattform unter **phreox.talk**.

Phreox soll nicht einfach ein Discord-Klon mit anderer Oberfläche sein, sondern zentrale Bereiche bewusst neu denken:

- Privacy
- Realtime Networking
- Voice
- Video und Screensharing
- Permissions
- Moderation
- Selfhosting
- Customization
- Transparenz für Power User
- kontrollierbare Monetarisierung ohne Selfhosting wertlos zu machen

Der wichtigste technische Grundsatz bleibt:

> **Privacy by architecture.**

Dienste sollen Daten möglichst gar nicht erst erhalten, wenn sie diese nicht benötigen.

Ein zweiter Grundsatz kommt durch die aktuelle Architektur hinzu:

> **Authority by architecture.**

Nicht jeder Server darf jede Art von Phreox-Funktion darstellen. Der Client weiß eindeutig, welche Authority für welche Daten und Aktionen zuständig ist.

Phreox wird deshalb in zwei Serverwelten getrennt:

- **phreox-service** – zentrale, private Phreox-Plattform
- **phreox-space** – öffentliche Community-Runtime für Phreox Cloud und Selfhoster

---

# 2. Gesamtarchitektur

```text
                            PHREOX CLIENT
                              PRIVATE
                                 │
                    ┌────────────┴────────────┐
                    │                         │
                    ▼                         ▼

              phreox-service             phreox-space
             PRIVATE AUTHORITY          PUBLIC RUNTIME
                    │                         │
                    │                         ├── Phreox Cloud
                    │                         └── Selfhost
                    │
                    └──── REQUIRED ───────────┘
```

Der Client benötigt **immer phreox-service**.

Ein `phreox-space` ist keine eigenständige Phreox-Plattform und kein eigener Homeserver wie bei klassischer Federation. Er ist eine Community-Runtime innerhalb des Phreox-Netzwerks.

Selfhosting bedeutet deshalb:

> **Ich hoste meinen eigenen Space.**

Nicht:

> **Ich hoste mein eigenes unabhängiges Phreox.**

---

# 3. Trust- und Authority-Modell

Phreox trennt globale und Community-bezogene Zuständigkeiten.

## 3.1 phreox-service Authority

`phreox-service` ist für globale und persönliche Funktionen zuständig.

Dazu gehören:

- Accounts
- Authentication
- Device Identity
- Device Trust
- Friends
- DMs
- Group DMs
- Account Recovery
- Device Recovery
- Node Registry
- Space Directory
- Subscriptions
- Payments
- Entitlements
- Feature Management
- Global Moderation
- Trust & Safety
- globale Abuse-Systeme
- zentrale Trust Roots
- Service Signing Keys

Diese Funktionen werden **nicht selfhosted**.

---

## 3.2 phreox-space Authority

`phreox-space` ist für einen oder mehrere Spaces zuständig.

Dazu gehören:

- Spaces
- Channels
- Categories
- Mitglieder
- Rollen
- Permissions
- Invites
- Space Messages
- Threads
- Reactions
- lokale Moderation
- Space Audit Log
- Attachments
- Storage
- Search
- Voice
- Video
- Camera
- Screenshare
- System Audio
- Media Routing / SFU

Ein Space ist für seine eigenen Community-Daten autoritativ, aber niemals für globale Phreox-Daten.

---

## 3.3 Grundregel

```text
GLOBAL / PERSONAL
→ phreox-service

SPACE / COMMUNITY
→ phreox-space
```

Beispiele:

```text
DM zwischen zwei Nutzern
→ phreox-service

Freundschaft
→ phreox-service

Account Feature
→ phreox-service

#general in einem Space
→ Home phreox-space

Rolle "Moderator"
→ Home phreox-space

Voice Channel
→ phreox-space Media Runtime

Globaler Report
→ phreox-service
```

---

# 4. Client-Architektur

Der aktuelle Desktop-Client besteht aus drei klar getrennten Bereichen:

```text
Phreox Desktop
│
├── Electron
│
├── React + TypeScript
│
└── Java Backend / Core
```

Die frühere Astro-/Svelte-Idee ist verworfen.

---

## 4.1 Electron

Electron ist hauptsächlich die Desktop-Shell.

Aufgaben:

- App Lifecycle
- Fensterverwaltung
- Tray
- Deep Links
- Update-Integration
- Starten und Überwachen des Java-Core
- sichere Bridge zwischen Renderer und lokalem Backend

Electron soll **keine zweite Business-Logic-Schicht** werden.

---

## 4.2 React Frontend

Aktueller Frontend-Stack:

```text
React 19
React DOM 19
React Router 8
TypeScript 7
Vite 8
Tailwind CSS 4
Iconify
Electron
```

Das Frontend ist hauptsächlich Presentation Layer.

Es übernimmt:

- UI
- Navigation
- Chat-Darstellung
- Settings
- Space-Oberflächen
- Voice Controls
- Moderationsoberflächen
- Plugin-Oberflächen
- Animationen
- lokale UI-Zustände
- Formulare
- visuelle Diagnoseansichten

Das Frontend soll nicht unnötig enthalten:

- Voice Internals
- Crypto Internals
- Netzwerkzustände
- Message-Deduplizierung
- Sync-Logik
- Permission Engine
- File Transfer Engine
- komplexe Caches
- Device Trust
- Recording Engine

---

## 4.3 Java Client Backend / Core

Der Java-Core ist die eigentliche Phreox-Engine auf dem Client.

Er übernimmt unter anderem:

- PXP Networking
- phreox-service Verbindung
- phreox-space Verbindungen
- Voice
- Audio Capture
- Audio Playback
- Video
- Screenshare
- System Audio
- E2EE
- Crypto
- Files
- lokale Datenhaltung
- Sync
- Search
- Notifications
- Recordings
- Device Integration
- Permission Evaluation
- Plugin Runtime
- Session Recovery
- Feature / Entitlement State

Grundsatz:

> **React zeigt Phreox. Java betreibt Phreox.**

---

# 5. Lokale Client-API

Frontend und Java-Core kommunizieren über eine klar definierte lokale API.

Der lokale Server bindet ausschließlich an:

```text
127.0.0.1
```

und ist nicht als LAN-Service gedacht.

Versionierung:

```text
/api/v1/...
```

Die API-Version wird zentral definiert.

Beispiel:

```java
public final class ApiRoutes {

    public static final int VERSION = 1;
    public static final String ROOT = "/api";
    public static final String PREFIX = ROOT + "/v" + VERSION;

    private ApiRoutes() {
    }
}
```

Für REST-Endpunkte verwendet Phreox eigene Annotationen, nicht Jakarta.

Beispielsweise:

```text
@GET
@POST
@PUT
@PATCH
@DELETE
@Path
@PathParam
@QueryParam
@Header
@Body
@DefaultValue
```

Der Router mappt diese intern auf die lokale HTTP-Implementation.

Controller sollen die konkrete HTTP-Library nicht kennen.

---

# 6. Client Connection Model

Das lokale Backend hält mindestens eine permanente Verbindung zu `phreox-service`.

Zusätzlich verwaltet es Verbindungen zu den Home-Nodes der Spaces.

```text
                     phreox-backend
                           │
              ┌────────────┴─────────────┐
              │                          │
              ▼                          ▼

       ServiceConnection          SpaceConnectionManager
              │                          │
              ▼                 ┌────────┼────────┐
       phreox-service            ▼        ▼        ▼
                              Space A  Space B  Space C
```

Ein Nutzer kann gleichzeitig Spaces auf verschiedenen Nodes verwenden.

Beispiel:

```text
BlueNet
→ official-eu2.phreox.talk

Gaming Community
→ community.example.com

Private Group
→ another-selfhost.net
```

Für den Nutzer bleibt alles eine einheitliche Phreox-App.

---

# 7. Server-Runtime-Modell

Phreox verwendet zwei echte Runtime-Ebenen.

```text
                 gemeinsame Server-Basis
                         │
                Server Runtime API
                  /             \
                 /               \
                ▼                 ▼

        phreox-service       phreox-space
           PRIVATE              PUBLIC
```

Beide teilen generische Infrastruktur, aber nicht dieselben Produkt-Authorities.

---

# 8. Gemeinsame Server-Basis

Gemeinsame Module können enthalten:

```text
phreox-server-api
phreox-server-common
phreox-protocol
```

Aufgaben:

- PXP Transport
- Connection Management
- Runtime Lifecycle
- Module System
- Event Bus
- Threading
- Config
- Metrics
- Health
- Serialization
- Database Interfaces
- Cluster-Basics
- Crypto Wrapper
- Logging
- Rate Limit primitives
- Service Registry

Keine Produktentscheidung wie DMs oder Space Roles gehört in diese gemeinsame Basis.

---

# 9. phreox-service

`phreox-service` ist private Phreox-Infrastruktur.

Mögliche Module:

```text
phreox-service-runtime
├── identity
├── auth
├── devices
├── friends
├── dm
├── group-dm
├── recovery
├── licensing
├── entitlements
├── directory
├── node-registry
├── abuse
└── trust-safety
```

Der Source wird nicht als Selfhost-Runtime veröffentlicht.

---

# 10. phreox-space

`phreox-space` ist öffentlich und selfhostbar.

Mögliche Module:

```text
phreox-space-runtime
├── guild
├── channels
├── messaging
├── permissions
├── moderation
├── storage
├── search
└── media
```

Phreox Cloud verwendet dieselbe Runtime.

Damit gilt:

```text
Official Space
→ phreox-space

Selfhosted Space
→ phreox-space
```

Die Deployment-Größe ist unterschiedlich, die logische Runtime nicht.

---

# 11. Module sind keine Prozesse

Ein Modul beschreibt eine Fähigkeit, nicht automatisch einen eigenen Prozess.

Kleiner Selfhost:

```text
eine JVM
├── Guild
├── Messaging
├── Permissions
├── Moderation
├── Storage
├── Search
└── Media
```

Große Phreox Cloud:

```text
JVM A
├── Guild
└── Messaging

JVM B
├── Storage
└── Search

JVM C
└── Media

JVM D
└── Media
```

Intern kann Phreox deshalb horizontal skalieren, ohne ein anderes Produktmodell zu benötigen.

---

# 12. Space Node Identity

Jeder `phreox-space` besitzt eine registrierte Node Identity.

Beispiel:

```text
SpaceNodeIdentity
├── nodeId
├── ownerId
├── publicKey
├── endpoints
├── capabilities
└── expiresAt
```

Die Identity wird von `phreox-service` signiert.

Der Client kann dadurch prüfen:

- ist der Node registriert?
- ist die Node Identity gültig?
- passt die Domain / Endpoint-Zuordnung?
- welche Capabilities wurden angekündigt?
- ist der Node für diesen Space zuständig?

Ein Selfhost kann sich nicht als `phreox-service` ausgeben.

---

# 13. Space Home Authority

Jeder Space besitzt zunächst genau eine logische Home Authority.

```text
Space X
→ community.example.com
```

Der Node kann intern ein Cluster sein:

```text
community.example.com
│
├── Node 01
├── Node 02
└── Node 03
```

Für PXP bleibt es jedoch eine Authority.

Das vermeidet anfangs komplexe Multi-Writer-Konflikte.

---

# 14. Federation

Die frühere Matrix-/Federation-Idee wird ersetzt.

Phreox verwendet **keine klassische offene Homeserver-Federation** als Basis.

Gründe:

- Identity soll global konsistent bleiben
- DMs sollen immer über Phreox laufen
- Device Trust soll zentral verifizierbar bleiben
- Features und Entitlements müssen kontrollierbar bleiben
- globale Moderation muss zuverlässig erreichbar bleiben
- Selfhosting soll nicht automatisch ein komplett unabhängiges Phreox-Netz erzeugen
- Daten sollen nicht unkontrolliert auf fremde Homeserver repliziert werden

Später kann ein Server-to-Server-Modell ergänzt werden, wenn konkrete Use Cases entstehen.

Es ist aber kein Grundpfeiler von Phreox 1.0.

---

# 15. Feature- und Entitlement-System

Selfhosting bedeutet nicht, dass automatisch alle Produktfeatures kostenlos sind.

Phreox trennt:

```text
Hosting
→ Wer stellt Infrastruktur?

Features
→ Welche Produktfunktionen sind freigeschaltet?
```

---

## 15.1 Feature-Typen

Es gibt mindestens:

- Core Features
- auswählbare Premium Features
- accountbezogene Features
- spacebezogene Features
- serviceabhängige Features
- optionale Add-ons

Core Features sind immer verfügbar.

Premium Features werden über Entitlements gesteuert.

---

## 15.2 Selfhost-Bonus

Selfhoster erhalten gegenüber dem normalen Free-/Cloud-Basismodell:

> **5 zusätzliche frei wählbare Feature-Slots.**

Das bedeutet nicht automatisch fünf Slots insgesamt, sondern fünf zusätzliche kostenlose Slots gegenüber dem jeweiligen Standardmodell.

Beispiel:

```text
Cloud Free
→ X freie auswählbare Features

Selfhost Free
→ X + 5 freie auswählbare Features
```

Selfhosting bleibt dadurch attraktiv, ohne Phreox Premium vollständig kostenlos zu machen.

---

## 15.3 Capability vs. Entitlement

Diese Begriffe werden strikt getrennt.

**Capability**

> Kann diese Runtime dieses Feature technisch?

**Entitlement**

> Darf dieser Nutzer / Space dieses Feature verwenden?

Beispiel:

```text
media.voice.hd

Capability
→ SUPPORTED

Entitlement
→ ALLOWED

Result
→ ENABLED
```

Oder:

```text
SUPPORTED
+
NOT LICENSED
=
DISABLED
```

---

## 15.4 Signierte Entitlements

Entitlements werden durch `phreox-service` ausgestellt und signiert.

Beispiel:

```text
Entitlement
├── subjectType
├── subjectId
├── featureId
├── issuedAt
├── expiresAt
└── signature
```

Subjects können beispielsweise sein:

```text
USER
SPACE
NODE
ORGANIZATION
```

Ein Selfhost kann dem offiziellen Client nicht einfach glaubhaft vortäuschen, sämtliche Premium Features zu besitzen.

---

## 15.5 Offline- und Grace-Period

Ein temporärer Ausfall des Licensing-Service darf einen Selfhost nicht sofort unbrauchbar machen.

Prinzip:

```text
signierte Entitlements lokal cachen
→ regelmäßig erneuern
→ ausreichend lange Lease
→ Grace Period bei Ausfall
```

Core-Funktionen eines Spaces dürfen nicht wegen eines kurzen Licensing-Ausfalls komplett ausfallen.

---

# 16. Public vs. Private Source

Vorgesehene Grenze:

## Öffentlich

```text
phreox-protocol
phreox-server-api
phreox-server-common

phreox-space-runtime
Space Module APIs
offizielle Free Space Module
Selfhost Docker Images
Server SDK
```

## Privat

```text
Phreox Client
phreox-backend Implementation
phreox-service-runtime
Identity Services
DM Services
Recovery
Licensing Backend
Entitlement Backend
Trust & Safety
interne Cloud Services
proprietäre Premium Implementierungen
```

Premium-Funktionen, deren lokale Implementierung nicht offenliegen soll, können als proprietäre Module ausgeliefert werden.

---

# 17. PXP – Phreox Protocol

Phreox verwendet ein eigenes Protokoll: **PXP**.

PXP ist die gemeinsame Kommunikationsschicht zwischen:

- Client und phreox-service
- Client und phreox-space
- internen Phreox-Komponenten
- Media Control
- möglicherweise später Server-to-Server-Kommunikation

PXP darf eigene Framing- und Produktsemantik besitzen, aber **keine selbst erfundenen kryptografischen Primitive**.

---

# 18. PXP Namespaces

PXP wird logisch in Authority-Bereiche getrennt.

```text
PXP

SERVICE/*
├── AUTH
├── IDENTITY
├── DEVICE
├── FRIEND
├── DM
├── GROUP_DM
├── RECOVERY
├── ENTITLEMENT
├── DIRECTORY
└── GLOBAL_REPORT

SPACE/*
├── SPACE
├── CHANNEL
├── MEMBER
├── ROLE
├── MESSAGE
├── THREAD
├── REACTION
├── MODERATION
├── STORAGE
└── SEARCH

MEDIA/*
├── SESSION
├── AUDIO
├── VIDEO
├── SCREEN
└── SYSTEM_AUDIO
```

Ein `phreox-space` darf keine `SERVICE/*` Authority darstellen.

---

# 19. PXP Framing

Protokollversionierung existiert von Anfang an.

Frames enthalten mindestens logisch:

```text
protocolVersion
frameType
flags
security / cipher version
context / session
sequence
payload length
payload
```

Replay Protection, Sequencing und Kompatibilitätsregeln werden früh berücksichtigt.

---

# 20. Networking

Networking soll stark auf Java und Netty basieren.

Mögliche Transportarten:

- QUIC
- QUIC Streams
- QUIC DATAGRAM
- UDP
- TCP, wo sinnvoll
- WebSocket nur dort, wo es einen klaren Grund gibt

Zuverlässige und unzuverlässige Daten werden getrennt.

Beispiel:

```text
QUIC Connection
│
├── Reliable Streams
│   ├── JOIN
│   ├── LEAVE
│   ├── MUTE
│   ├── KEY_ROTATE
│   ├── SYNC
│   └── SESSION_RESUME
│
└── QUIC DATAGRAM
    └── Realtime Media Frames
```

Voice-Frames sollen nicht auf alte Retransmits warten.

---

# 21. Messaging-Modell

Messaging wird nach Kommunikationsart getrennt.

---

## 21.1 DMs

DMs laufen immer über `phreox-service`.

```text
Client A
   │
   ▼
phreox-service
   │
   ▼
Client B
```

Sie werden nicht durch Selfhoster bereitgestellt.

---

## 21.2 Group DMs

Group DMs gehören ebenfalls zu `phreox-service`.

Sie sind persönliche Kommunikation und nicht Bestandteil eines Space-Nodes.

---

## 21.3 Öffentliche Space-Channels

Öffentliche Community-Channels sind bewusst server-readable.

```text
Client
 ↓
PXP / TLS
 ↓
phreox-space
 ↓
Message Store
```

Damit sind möglich:

- vollständige History
- Server Search
- normale Moderation
- Indizierung
- Retention
- einfache Join-Semantik
- große Community-Kanäle

Das alte Prinzip "E2EE überall" wird deshalb angepasst.

---

## 21.4 Private Space-Channels

Private Space-Channels können E2EE verwenden.

Dort kann `phreox-space` Membership, Permissions, Routing und Ciphertext verwalten, ohne den Nachrichteninhalt zwingend zu kennen.

Die genaue History-Semantik wird bewusst von öffentlichen Channels getrennt.

---

# 22. E2EE-Grundsätze

Phreox verwendet bewährte Kryptographie.

Grundregel:

> **Eigene Protokolle ja, eigene Kryptoprimitive nein.**

Für private Gruppenkommunikation ist MLS die bevorzugte Richtung.

Für Media wird eine SFrame-ähnliche E2EE-Schicht verwendet.

Die Sicherheit darf nicht davon abhängen, dass das Verfahren geheim ist.

Geheim bleiben:

- private Device Keys
- Service Trust Keys
- Moderation Private Keys
- Session Secrets
- Recovery Secrets

---

# 23. Multi-Device und Recovery

Phreox soll keine schlechte Multi-Device-Erfahrung erzeugen.

Zwei primäre Recovery-Wege:

## Trusted Device Pairing

```text
neues Gerät
 ↓
QR / SAS
 ↓
bereits vertrauenswürdiges Gerät
 ↓
Identity / benötigter State
```

## Encrypted Backup

Falls kein vertrauenswürdiges Gerät verfügbar ist:

```text
verschlüsseltes Backup
→ Server speichert nur Ciphertext
→ Recovery Key bleibt beim Nutzer
```

Der Server darf kein Recovery-Backdoor-Key besitzen.

---

# 24. Device Security und Anti-Abuse

Klassische HWID-Fingerprints werden nicht zum Kernmodell.

Stattdessen:

```text
Device
 ↓
lokale Device Identity
 ↓
Device Key
```

Zusätzlich:

- Device Reputation
- Rate Limits
- Challenges
- Passkeys
- CAPTCHA, falls notwendig
- temporäre Abuse-Buckets
- Edge-basierte IP-Abuse-Signale
- Account Reputation
- Risk Scoring

Roh-IP-Adressen sollen nicht unnötig dauerhaft in internen Plattformdiensten gespeichert werden.

---

# 25. IP Privacy

Phreox verspricht nicht:

> Niemand sieht deine IP.

Technisch korrekt ist:

> Nur die notwendige Transportkante soll die IP sehen.

Beispiel:

```text
User
 ↓
Privacy / Transport Edge
 ↓
opaque session
 ↓
Platform Service
```

Interne Dienste erhalten möglichst nur abgeleitete Session- oder Routinginformationen.

---

# 26. Moderationsmodell

Phreox trennt lokale und globale Moderation.

---

## 26.1 Space Moderation

Authority:

```text
phreox-space
```

Aufgaben:

- Mute
- Kick
- Space Ban
- Channel Moderation
- Message Deletion
- lokale Reports
- Rollenmaßnahmen
- Audit Log
- Space Policies

Der jeweilige Betreiber kontrolliert diese Moderation.

---

## 26.2 Global Moderation

Authority:

```text
phreox-service
```

Aufgaben:

- globale Reports
- Trust & Safety
- Spam
- Scam
- Malware
- schwere Plattformverstöße
- Account-Maßnahmen
- Device-Maßnahmen
- Abuse über mehrere Spaces hinweg

Ein Selfhoster besitzt keine globale Moderationsauthority.

---

# 27. Selektives Global Reporting

Für E2EE-Inhalte erhält die globale Moderation keinen dauerhaften Zugriff.

Der Client stellt lokal ein Evidence Bundle zusammen.

Beispielsweise:

```text
Reported Message
Context Messages
Event IDs
Sender IDs
Timestamps
Hashes
Attachments
Auth / MLS Evidence
Server Receipt
```

Vor dem Absenden zeigt der Client exakt an, welche Inhalte geteilt werden.

---

## 27.1 Global Report Encryption

Für globale Reports verwendet Phreox einen eigenen Report-Pfad über `phreox-service`.

Ablauf:

```text
Evidence Bundle
      ↓
frischer zufälliger ReportKey
      ↓
Evidence verschlüsseln
      ↓
ReportKey mit Phreox Moderation Public Key wrappen
      ↓
direkt an phreox-service
```

Nur die globale Moderationsinfrastruktur besitzt den zugehörigen privaten Key.

`phreox-space` erhält:

- keinen globalen Moderation Private Key
- keine globale Report-Decryption-Authority
- keinen Zwang, den Report zu transportieren

Globale Reports gehen direkt vom Client zu `phreox-service`.

Dadurch kann ein bösartiger Selfhost globale Reports nicht einfach blockieren.

---

## 27.2 Report Preview

Vor dem Absenden:

```text
Diese Inhalte werden mit Phreox Trust & Safety geteilt:
```

Danach zeigt der Client die tatsächlich ausgewählten Nachrichten und Anhänge.

Es gibt keine automatische Freigabe des gesamten Chats.

---

# 28. Voice als Kernfeature

Voice bleibt eines der wichtigsten technischen Alleinstellungsmerkmale von Phreox.

Langfristig wird eine eigene Voice-Engine verwendet.

Ziele:

- sehr niedrige Mouth-to-Ear-Latenz
- hohe Qualität
- schnelle Anpassung an Netzprobleme
- minimale hörbare Unterbrechungen
- Session Recovery
- Path Migration
- regionale Edge-Auswahl
- E2EE
- transparente Diagnose
- gute Qualität auch bei Verlust und Jitter

Unter optimalen regionalen Bedingungen soll eine sehr niedrige Latenz möglich sein.

Ein pauschales universelles `<30 ms`-Versprechen wird vermieden, weil Capture, Frame-Accumulation, Encode, Netzwerk, Jitter Buffer, Decode und Audio-Device-Buffering zusammen betrachtet werden müssen.

---

# 29. Opus und Audio Codec

Phreox verwendet native **libopus**.

Der Codec wird nicht selbst neu implementiert.

Java bindet ihn über FFM an.

Aktuelle Voice-Richtung:

- Opus
- FEC
- PLC
- DRED
- Deep PLC, sofern sinnvoll
- Neural BWE, sofern sinnvoll
- optionale neuere Opus-Qualitätsmodi
- adaptive Bitrate
- adaptive Frame Size
- adaptive Loss Settings

Sehr kleine Frames wie 2.5 ms oder 5 ms können in Low-Latency-Profilen genutzt werden, sind aber kein global erzwungener Default.

---

# 30. Voice Audio Pipeline

```text
Microphone
    │
    ▼
Native Capture
    │
    ▼
Audio Processing
    │
    ▼
Opus Encode
    │
    ▼
Media E2EE
    │
    ▼
Realtime Transport
    │
    ▼
phreox-space SFU / Edge
    │
    ▼
Realtime Transport
    │
    ▼
Adaptive Jitter Buffer
    │
    ▼
DRED / FEC / PLC
    │
    ▼
Opus Decode
    │
    ▼
Mixing
    │
    ▼
Native Playback
```

Zu späte Pakete werden eher verworfen als unnötig lange nachgeholt.

Grundprinzip:

> **Latenz minimieren, solange Qualität und Verständlichkeit stabil bleiben.**

---

# 31. Adaptive Jitter Buffer

Der Jitter Buffer arbeitet dynamisch.

Er berücksichtigt unter anderem:

- Jitter
- Packet Loss
- RTT
- Burst Loss
- Netzstabilität
- DRED-Verfügbarkeit
- FEC-Konfiguration
- Audio Device Buffering

Es gibt keinen starren Zielwert, der immer eingehalten werden muss.

Bei stabilem Netz wird aggressiv niedrig gefahren.

Bei schlechterem Netz steigt der Buffer nur so stark wie nötig.

Sobald die Verbindung wieder stabil ist, wird die zusätzliche Latenz wieder reduziert.

---

# 32. Native Audio

Desktop verwendet möglichst native Audio-Pfade:

```text
Windows
→ WASAPI

Linux
→ PipeWire

macOS
→ CoreAudio
```

Java greift über FFM oder eine kleine native Abstraktionsschicht darauf zu.

Der eigentliche Voice-Orchestrator bleibt Java.

---

# 33. Voice Session Recovery

Voice kennt mehr Zustände als nur Connected / Disconnected.

Beispiel:

```text
CONNECTED
 ↓
DEGRADED
 ↓
RECONNECTING
 ↓
CONNECTED
```

Kurze Netzabbrüche erzeugen nicht sofort ein vollständiges Leave/Join.

Die Session bleibt während einer Grace Period erhalten.

```text
Netz weg
 ↓
RECONNECTING
 ↓
neuer Pfad
 ↓
SESSION_RESUME
 ↓
Voice läuft weiter
```

Dabei sollen unnötige:

- Permission Reloads
- Channel Rejoins
- Voice State Rebuilds
- Key-Neuverhandlungen

vermieden werden.

---

# 34. Network Path Migration

Netzwerkwechsel sollen möglichst transparent sein.

Beispiel:

```text
WiFi
 ↓
Verbindung instabil
 ↓
Mobilfunk
 ↓
gleiche Session
```

QUIC Connection IDs und Path Migration sind dafür wichtige Bausteine.

Später können mehrere Netzwerkpfade vorbereitet werden.

---

# 35. Voice Edge Infrastructure

Voice läuft über regionale Edges.

Beispielregionen:

```text
Deutschland
→ Frankfurt / Stuttgart / München

UK
→ London

USA
→ East / Central / West

Japan
→ Tokyo
```

Edge-Auswahl berücksichtigt nicht nur Ping, sondern:

- RTT
- Jitter
- Packet Loss
- Stability
- Route Quality
- verfügbare Kapazität

---

# 36. Distributed Voice Fabric

Langfristig muss ein großer Voice-Channel nicht an einen einzelnen zentralen SFU gebunden sein.

```text
DE Users
   ↓
Frankfurt Edge
   │
   ├──── Voice Fabric ────┐
   │                      │
UK Users                  │
   ↓                      │
London Edge ──────────────┘
```

Jeder Nutzer verbindet sich möglichst mit einem nahen Edge.

Zwischen Edges werden Media-Streams intelligent weitergeleitet und nicht unnötig pro Empfänger dupliziert.

---

# 37. Media Tracks

Media wird als Track-System modelliert.

```text
AUDIO
├── MICROPHONE
└── SYSTEM

VIDEO
├── CAMERA
├── SCREEN
└── WINDOW
```

Ein Nutzer kann mehrere Tracks gleichzeitig publizieren.

Ein künstliches Protokolllimit wie "nur ein Screenshare pro Nutzer" wird vermieden.

---

# 38. Media E2EE

Der `phreox-space` Media-Server arbeitet bevorzugt als SFU.

Er routet verschlüsselte Frames, ohne den Inhalt entschlüsseln zu müssen.

```text
Client A
   ↓ encrypted media
phreox-space SFU
   ↓ encrypted media
Client B
```

Media Keys werden aus einer sicheren Gruppen-Key-Architektur abgeleitet.

Separate Kontexte pro Sender / Track verhindern unnötige Kopplung.

Beispiele:

```text
audio/<device>
camera/<device>
screen/<device>/<track>
system-audio/<device>/<track>
```

Bei Membership- oder Epoch-Wechseln werden Media Keys rotiert.

---

# 39. Voice Recording

Aufnahmen laufen im Java Client Backend.

```text
Incoming Media
    ↓
Java Backend
    ↓
Decrypt
    ↓
Decode
    ↓
Mix / Separate Tracks
    ↓
Recording Encoder
    ↓
File
```

Das Frontend erhält nur Status und Controls.

Beispiele:

```text
recording.started
recording.stopped
recording.duration
```

Serverseitige Aufnahmen müssen bei E2EE explizit als Teilnehmer / Recorder in die Session aufgenommen werden und passende Keys erhalten.

---

# 40. Storage und Attachments

`phreox-space` kann unterschiedliche Storage Backends unterstützen:

- Filesystem
- S3
- MinIO
- kompatible Object Stores

Ein kleiner Selfhost kann mit lokalem Storage starten.

Ein größerer Betreiber kann Object Storage verwenden.

E2EE-Dateien werden clientseitig mit einem zufälligen File Key verschlüsselt.

Der Server speichert dann nur den verschlüsselten Blob.

---

# 41. Search

Search hängt von der Kommunikationsart ab.

Öffentliche Space-Channels:

```text
Server-side Search möglich
```

E2EE-Kommunikation:

```text
Client-side / lokal indizierte Search
```

Phreox behauptet nicht, gleichzeitig vollständige serverseitige Suche und echte Inhaltsblindheit zu bieten, wenn diese technisch im Konflikt stehen.

---

# 42. Permission-System

Phreox bekommt ein deutlich mächtigeres Permission-System als Discord, bleibt aber nachvollziehbarer als klassische TeamSpeak-Konfigurationen.

Es gibt:

```text
Simplified
Advanced
```

Beide verwenden exakt dieselbe Permission Engine.

---

# 43. Simplified Permissions

Der Simplified Mode richtet sich an normale Space-Admins.

Beispiel:

```text
General
✓ View Channels
✓ Send Messages
✓ Join Voice
✓ Speak

Moderation
✓ Manage Messages
✓ Move Members
✕ Kick Members
✕ Ban Members

Administration
✕ Manage Channels
✕ Manage Roles
```

Komplexe Details werden automatisch verwaltet.

---

# 44. Advanced Permissions

Normale Permissions sind Tri-State:

```text
ALLOW
DENY
INHERIT
```

Mögliche Scopes:

- Space
- Category
- Channel
- Role
- User

Die Engine berechnet daraus einen Effective Permission State.

---

# 45. Power-System

Zusätzlich zu normalen Permissions existiert ein Power-Modell.

Beispiele:

```text
joinPower
requiredJoinPower

kickPower
requiredKickPower

banPower
requiredBanPower

movePower
requiredMovePower

modifyPower
requiredModifyPower
```

Beispiel:

```text
User Join Power = 1000
Channel Required Join Power = 800

1000 >= 800

→ Join erlaubt
```

Oder:

```text
Moderator Kick Power = 500
Target Required Kick Power = 700

500 < 700

→ Kick nicht erlaubt
```

---

# 46. Power Datentyp

Power wird als Java `short` gespeichert.

Nutzbarer positiver Bereich:

```text
0–32767
```

mit:

```java
Short.MAX_VALUE == 32767
```

---

# 47. Automatische Power-Verteilung

Die Reihenfolge der Rollen ist standardmäßig Source of Truth.

Beispiel:

```text
Owner
Admin
Moderator
Helper
Member
Guest
```

Phreox verteilt automatisch Power-Werte über den verfügbaren Bereich.

Beispiel:

```text
Owner            32767
Admin            26214
Moderator        19660
Helper           13107
Member            6553
Guest                0
```

Wenn Rollen verschoben oder eingefügt werden, werden automatische Werte neu verteilt.

---

# 48. Manuelle Power Overrides

Im Advanced Mode können einzelne Power-Werte auf `MANUAL` gesetzt werden.

Beispiel:

```text
Join Power      AUTO
Kick Power      AUTO
Ban Power       MANUAL
Move Power      AUTO
```

Manuelle Werte bleiben bei Rangänderungen erhalten.

Sie können jederzeit wieder auf automatische Berechnung zurückgesetzt werden.

---

# 49. Permission Explain

Phreox kann erklären, warum etwas erlaubt oder verboten wurde.

Beispiel:

```text
Why can't I join?

Required Join Power: 5000
Your Effective Power: 2500

Moderator Role: +2500

2500 < 5000

Result: DENIED
```

Für normale Permissions:

```text
Send Messages: DENIED

Space Default       ALLOW
Muted Role          DENY
Channel Override    INHERIT

Final Result: DENY
```

Permission Explain ist ein Kernwerkzeug, damit das Advanced-System trotz seiner Tiefe verständlich bleibt.

---

# 50. Plugin-System

Plugins werden stark sandboxed.

Es gibt keine freie Java-Code-Ausführung im Client.

Logik:

```text
WASM
+
Capability API
```

UI:

```text
isolierte Renderer-Fläche
+
strikte CSP
+
RPC
+
keine Node Integration
```

Ein Plugin muss Berechtigungen explizit anfordern.

Beispiele:

```text
space.members.read
widget.render
storage.private
network.example.com
```

Manifest-Beispiel:

```yaml
permissions:
  - space.members.read
  - widget.render

storage:
  quota: 5mb
```

---

# 51. Plugin Security

Plugins erhalten niemals automatisch Zugriff auf:

- Device Private Keys
- MLS State
- Recovery Secrets
- globale Files
- beliebige Netzwerkziele
- komplette lokale Datenbank
- native Audio APIs
- alle Spaces

Capabilities werden minimal vergeben.

---

# 52. Customization

Space-Admins können eigene Oberflächen und Widgets bauen.

Nicht veränderbar:

- globale Navigation
- Security UI
- grundlegende Chat-Struktur
- Trust Dialoge
- Voice-Grundcontrols
- Report-Sicherheitsdialoge

Anpassbar:

- Dashboards
- Widgets
- Space Home
- Event Pages
- Statistiken
- Space Actions
- Branding innerhalb klarer Grenzen

Fehlerhafte Customizations werden durch Graceful Degradation abgefangen.

---

# 53. UI / Design

Phreox soll nicht wie typische Cybersecurity- oder Gaming-Software aussehen.

Kein:

- Matrix-Grün
- aggressives RGB
- Gaming-Neon
- riesige Glow-Effekte
- überall Schloss-Symbole

Stattdessen:

- sehr dunkles Graphit
- Anthrazit
- Violett
- Indigo
- leichtes Electric Blue
- viel negative Fläche
- subtile Layer
- wenige Borders
- ruhige Animationen
- moderne geometrische Sans-Serif

Ungefähre Farbrichtung:

```text
Background
#0B0D12

Surface
#11141B

Elevated Surface
#171B24

Primary
#7567FF

Secondary
#4CA6FF

Text
#F4F5F7

Muted
#8C93A3
```

Privacy wird eher durch Verhalten und kleine Statusinformationen vermittelt als durch aggressive Security-Symbolik.

---

# 54. Voice UI

Voice ist visuell ein Kernbereich der App.

Normaler Nutzer:

```text
Development

Jason       David       Alex
  ◉           ◉           ◉

18 ms · Excellent

🎙   🎧   ⚙   ↗
```

Wenn jemand spricht, erhält der Avatar eine subtile violett-blaue Aura.

Keine aggressive grüne Dauerumrandung.

---

# 55. Voice Diagnostics

Normale Nutzer sehen nur komprimierte Qualitätsinformationen.

Beispiel:

```text
18 ms · Excellent
```

Power User können Details öffnen:

```text
Latency        18 ms
Jitter          1.8 ms
Packet Loss     0.02 %
Codec           Opus 48 kHz
Frame Size      5 ms
Edge            Frankfurt
Transport       QUIC
Encryption      E2EE
DRED            active
```

Phreox bleibt damit für normale Nutzer simpel und für Power User transparent.

---

# 56. Observability

Server und Client erhalten strukturierte Diagnosemöglichkeiten.

Mögliche Metriken:

- Connection Count
- Active Sessions
- RTT
- Jitter
- Packet Loss
- Resume Rate
- Voice Decode Errors
- DRED Usage
- Storage Latency
- Search Latency
- Queue Depth
- Module Health
- PXP Protocol Errors

Diagnose darf keine unnötigen privaten Inhalte loggen.

---

# 57. Java-first Architektur

Java bleibt die Hauptsprache für schwere Logik.

```text
Java
├── Client Backend
├── phreox-service
├── phreox-space
├── PXP
├── Realtime
├── Permissions
├── Sync
├── Files
└── Orchestration
```

Native Libraries werden dort verwendet, wo sie technisch sinnvoll sind.

Beispiele:

```text
libopus
→ FFM

OpenMLS / native MLS facade
→ FFM

WASAPI / PipeWire / CoreAudio
→ FFM / kleine native Bridge
```

Phreox ist damit **Java-first**, aber nicht dogmatisch "100 % Pure Java".

---

# 58. MLS Integration

Für MLS soll nicht direkt eine große fremde Rust-API nach Java gespiegelt werden.

Stattdessen:

```text
OpenMLS
   ↓
eigene kleine libphreox_mls Rust Facade
   ↓
stabile C ABI
   ↓
Java FFM
```

Mögliche Funktionen:

```text
px_mls_group_create
px_mls_group_join
px_mls_add
px_mls_remove
px_mls_process
px_mls_encrypt
px_mls_decrypt
px_mls_export
px_mls_serialize
px_mls_destroy
```

Dadurch bleibt Java von internen API-Änderungen der MLS-Library abgeschirmt.

---

# 59. Repository-Zielbild

Eine mögliche Struktur:

```text
phreox/
│
├── protocol/
│   └── phreox-protocol
│
├── client/                         PRIVATE
│   ├── phreox-client
│   ├── phreox-backend
│   └── phreox-frontend
│
├── server-common/
│   ├── phreox-server-api
│   └── phreox-server-common
│
├── service/                        PRIVATE
│   ├── phreox-service-runtime
│   ├── identity
│   ├── auth
│   ├── devices
│   ├── friends
│   ├── dm
│   ├── recovery
│   ├── licensing
│   ├── entitlements
│   ├── directory
│   └── trust-safety
│
└── space/                          PUBLIC
    ├── phreox-space-runtime
    ├── guild
    ├── messaging
    ├── permissions
    ├── moderation
    ├── storage
    ├── search
    └── media
```

---

# 60. Selfhost Deployment

Der Standard-Selfhost soll möglichst einfach startbar sein.

Beispielsweise:

```text
Docker Compose
├── phreox-space
├── PostgreSQL
└── optional Object Storage
```

Ein kleiner Space kann alles in einer Runtime betreiben.

Ein großer Betreiber kann Module auf mehrere Prozesse oder Maschinen verteilen.

---

# 61. Space Capability Advertisement

Ein Space teilt dem Client seine technischen Fähigkeiten mit.

Beispiel:

```json
{
  "protocol": 1,
  "capabilities": [
    "guild",
    "messaging",
    "moderation",
    "storage",
    "search",
    "media"
  ]
}
```

Premium-Freischaltungen werden dadurch **nicht** bewiesen.

Dafür braucht der Client zusätzlich gültige Entitlements von `phreox-service`.

---

# 62. Private Kommunikation vs. öffentliche Community-Kommunikation

Das ursprüngliche "E2EE standardmäßig" wird präziser formuliert:

> **Private Kommunikation ist E2EE by default. Öffentliche Community-Kommunikation ist server-readable by design.**

Dadurch erhält Phreox:

- echte private DMs
- private Gruppenkommunikation
- E2EE Media
- optional private E2EE Space-Channels

und gleichzeitig:

- funktionierende große öffentliche Communities
- serverseitige Moderation
- History
- Search
- Retention
- einfache Join-Semantik

Privacy wird nicht als Marketing-Absolutismus behandelt, sondern als bewusstes Datenmodell.

---

# 63. Security Non-Goals

Phreox behauptet nicht:

- dass kein Server jemals eine IP sieht
- dass öffentliche Space-Channels serverblind sind
- dass Selfhoster keine modifizierte Software bauen können
- dass closed source automatisch Sicherheit bedeutet
- dass geheime Algorithmen sichere Kryptographie ersetzen
- dass jeder lokale Premium-Check auf fremder Hardware unknackbar wäre

Stattdessen werden Trust-Grenzen, Signaturen, Keys, Authorities und klare Datenflüsse verwendet.

---

# 64. Produktphilosophie

Phreox soll gleichzeitig:

- einfach für normale Nutzer
- mächtig für Admins
- transparent für Power User
- technisch interessant für Entwickler
- attraktiv für Selfhoster
- kontrollierbar für die Plattform
- privacy-first ohne unrealistische Versprechen

sein.

Die zentralen technischen Gedanken lauten:

> **React zeigt Phreox. Java betreibt Phreox.**

> **phreox-service definiert das Phreox-Netzwerk.**

> **phreox-space hostet Communities.**

> **Selfhosting gibt Infrastrukturkontrolle, aber ersetzt nicht die globale Phreox Authority.**

> **Privacy ist kein einzelnes Feature, sondern eine Eigenschaft der Architektur.**

> **Security basiert auf kontrollierten Keys und Trust-Grenzen, nicht auf geheimen Algorithmen.**

---

# 65. Finale Systemübersicht

```text
                           PHREOX CLIENT
                 Electron + React + Java Core
                              PRIVATE
                                 │
                 ┌───────────────┴───────────────┐
                 │                               │
                 ▼                               ▼

           phreox-service                   phreox-space
          PRIVATE AUTHORITY                PUBLIC RUNTIME

          Accounts                         Spaces
          Identity                         Channels
          Devices                          Messages
          Friends                          Members
          DMs                              Roles
          Group DMs                        Permissions
          Recovery                         Space Moderation
          Licensing                        Search
          Features                         Storage
          Entitlements                     Voice
          Directory                        Camera
          Global Moderation                Screenshare
          Trust & Safety                   Media SFU
                 │                               │
                 │                    ┌──────────┴──────────┐
                 │                    │                     │
                 │              Phreox Cloud            Selfhost
                 │
                 └──────── REQUIRED BY EVERY SPACE ────────┘
```

---

# 66. Kurzfassung

Phreox besteht aus einer zentralen Plattform-Authority und einer verteilbaren Community-Runtime.

**phreox-service** bleibt unter Kontrolle von Phreox und besitzt globale Funktionen wie Accounts, DMs, Device Trust, Licensing, Features und globale Moderation.

**phreox-space** ist öffentlich, modular und selfhostbar. Dieselbe Runtime wird von Phreox Cloud verwendet. Sie betreibt Spaces, Channels, Space-Nachrichten, Rollen, Permissions, lokale Moderation, Storage, Search und Media.

Der offizielle Client bleibt closed source und besteht aus Electron + React als UI sowie einem schweren Java Client-Core.

Private Kommunikation und Media werden E2EE ausgelegt. Öffentliche Space-Channels bleiben bewusst server-readable, damit große Communities, Search, History und Moderation sinnvoll funktionieren.

Selfhosting bedeutet Infrastrukturkontrolle, aber nicht automatisch unbegrenzte Premium-Funktionen. Features werden durch `phreox-service` verwaltet; Selfhoster erhalten gegenüber dem normalen Basismodell fünf zusätzliche frei wählbare kostenlose Feature-Slots.

PXP bildet die gemeinsame Protokollschicht. Security basiert auf etablierten Kryptoverfahren, signierten Authorities, Device Keys, Entitlements und klaren Trust-Grenzen.

Phreox soll damit keine Kopie bestehender Plattformen werden, sondern eine eigenständige Realtime-Kommunikationsplattform mit starkem Voice-Stack, moderner Privacy-Architektur, mächtigem Permission-System, sicherem Selfhosting und einer klaren Trennung zwischen globaler Plattform und Community-Infrastruktur.
