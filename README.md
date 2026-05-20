<div align="center">

![KANDO Logo](/public/KANDOlogo.png)

# 🐝 KANDO

## Decentralized | Censorship-Resistant | Gas-Free Social Network Protocol

[![License: AGPL-3.0](https://img.shields.io/badge/License-AGPL--3.0-blue.svg)](LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-16.2.5-black?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4.0-38B2AC?logo=tailwind-css)](https://tailwindcss.com/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)
[![GitHub Stars](https://img.shields.io/github/stars/comfyuse/Kando?style=social)](https://github.com/comfyuse/Kando/stargazers)
[![GitHub Forks](https://img.shields.io/github/forks/comfyuse/Kando?style=social)](https://github.com/comfyuse/Kando/network/members)

</div>

---

## 📖 About

**KANDO** is a decentralized, censorship-resistant, and gas‑free social network protocol. 

No blockchain, no gas fees, no central servers – just a self‑organising hexagonal mesh network based on the **3-Approval Rule**.

> Built on the research of complex contagion (Damon Centola, UPenn), KANDO turns scientific theory into a practical, open, and uncensorable communication layer.

---

## ✨ Key Features

| Feature | Description |
|---------|-------------|
| 🔒 **Censorship-Resistant** | Works over internet and offline mesh (Bluetooth, Wi‑Fi Direct, LoRa). No central point of control. |
| ⛽️ **Gas‑Free** | Zero transaction costs – no blockchain, no tokens, no hidden fees. |
| 🌐 **Decentralised** | DHT‑based, self‑healing network with local voting and relocation. |
| 🧠 **3-Approval Rule** | Messages spread only after 3 out of 6 neighbors approve – stopping fake news and spam at the first ring. |
| 🎮 **Network Simulator** | Interactive hexagonal grid simulation to visualize the protocol in action. |
| 🆔 **Portable Identity** | Non‑transferable cNFT / DID passport – use across all KANDO‑compatible apps. |
| 🧩 **Open Source** | AGPLv3 licensed – transparent, auditable, and community‑driven. |

---

## 📊 1-Approval Propagation Rule
```mermaid
flowchart TD
    Start([Start: Node creates content]) --> Step201[201: Content shared with 6 direct neighbors]
    Step201 --> Step202[202: Each neighbor may send an approval]
    Step202 --> Decision203{203: ≥3 approvals\ncollected within timeout?}
    Decision203 -->|Yes| Step204["204: Content advances to next ring\n(distance +1)"]
    Step204 --> Decision205{205: Next ring exists?}
    Decision205 -->|Yes| Step201
    Decision205 -->|No| End([End: Propagation complete])
    Decision203 -->|No| Step206[206: Timeout expires]
    Step206 --> End2([End: Propagation halted])
```

## 📊 2-Co‑eclosion Citizenship Protocol (RESERVED → CANDIDATE → CITIZEN)

```mermaid
flowchart TD
    Start([Start: Node invited by a citizen]) --> Step301[301: Node becomes RESERVED]
    Step301 --> Decision302{302: All six neighbor\npositions occupied?}
    Decision302 -->|No| Wait[Wait & retry]
    Wait --> Decision302
    Decision302 -->|Yes| Step303[303: Node becomes CANDIDATE]
    Step303 --> Step304[304: For each of the six neighbors,\ncheck if they have ≥6 neighbors each]
    Step304 --> Decision305{305: All six neighbors\neach have ≥6 neighbors?}
    Decision305 -->|No| Wait2[Wait & retry]
    Wait2 --> Step304
    Decision305 -->|Yes| Step306[306: Node becomes CITIZEN\nIssue non‑transferable certificate]
    Step306 --> End([End: Citizen active in network])
  ```
  ## 📊 3-Local Voting & Relocation
  ```mermaid
   flowchart TD
    Start([Start: Citizen inactive for 30 days]) --> Step401[401: Status becomes INACTIVE]
    Step401 --> Step402[402: Living neighbors may initiate a vote]
    Step402 --> Decision403[s20]
    
    Decision403 -->|No| Step404[404: Wait another 30 days]
    Step404 --> Decision405[s21]
    Decision405 -->|No| Step406["406: Node becomes DEAD\n(certificate remains as history)"]
    Decision405 -->|Yes| Decision403
    
    Decision403 -->|Yes| Step407[407: Node becomes DISPLACED\nCoordinates freed]
    Step407 --> Step408[408: DISPLACED node requests relocation\nto an empty coordinate]
    Step408 --> SelectType[Select move type]
    
    SelectType --> TypeA[Type A: Voluntary move\nof an active citizen]
    SelectType --> TypeB[Type B: DISPLACED to\ndifferent empty coordinate]
    SelectType --> TypeC["Type C: Return to previous\ncoordinate (if empty)"]
    
    TypeA --> Req4[Need 4 approvals]
    TypeB --> Req3[Need 3 approvals]
    TypeC --> Req2[Need 2 approvals]
    
    Req4 --> Decision410[s24]
    Req3 --> Decision410
    Req2 --> Decision410
    
    Decision410 -->|Yes| Step411[411: Node moves to new coordinate\nStatus becomes CITIZEN again]
    Decision410 -->|No| Step412[412: Relocation fails\nnode remains DISPLACED]
    
    Step411 --> End([End: Citizen active])
    Step406 --> End2([End: Dead])
    Step412 --> End3([End: Displaced])
 ```
