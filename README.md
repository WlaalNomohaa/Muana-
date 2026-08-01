
# 🤖 Sky Bot
<div align="center">
  <h1>Sky ⭐</h1>
  <p><i>Bot-ka maamulka server-ka (Moderation), Amniga, iyo Madadaalada Discord</i></p>
  <!-- Circle Skill Icons -->
  <p align="center">
    <a href="https://nodejs.org/">
      <img src="https://skillicons.dev/icons?i=nodejs" width="45" height="45" alt="NodeJS" />
    </a>
    &nbsp;
    <a href="https://discord.js.org/">
      <img src="https://skillicons.dev/icons?i=discord" width="45" height="45" alt="Discord" />
    </a>
    &nbsp;
    <a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript">
      <img src="https://skillicons.dev/icons?i=js" width="45" height="45" alt="JS" />
    </a>
  </p>
  <!-- Clickable Action Buttons (Bot Invite & Server Link) -->
  <p align="center">
    <a href="https://discord.com/oauth2/authorize?client_id=1525477004005085287&permissions=8&integration_type=0&scope=bot">
      <img src="https://img.shields.io/badge/🤖_Add_Bot-5865F2?style=for-the-badge" alt="Add Bot" />
    </a>
    &nbsp;
    <a href="https://discord.gg/QxPskp6hm">
      <img src="https://img.shields.io/badge/💬_Server-23272A?style=for-the-badge" alt="Support Server" />
    </a>
  </p>
</div>
---
## 🛠️ Sifooyinka Ugu Muhiimsan (Features)
* **🔒 Channel Lock & Unlock:** Amarrada `/lock` iyo `/unlock` oo si degdeg ah loogu xiro ama looga furo channel-ada xilliga dhibaatadu ka dhacdo server-ka.
* **🛡️ Advanced Anti-Link Protection:** 
  * 1-2 Jeer: Tirtirid fariinta + Digniin (Warning).
  * 3-aad: **30 Seconds Timeout** otomaatig ah.
  * In ka badan 3 jeer: Mute/Communication Disabled + Admin Unmute Button.
* **👋 Fun Commands (`/slap`):** Amarrada madadaalada sida tilaabida/oranta (`/slap`) xubnaha kale oo leh GIF iyo fariimo xioso badan.
* **📚 Search /Help System:** Autocomplete Search Menu leh qeybta **Another Problem** oo toos batoon ugu geynaya Profile-ka Admin-ka (`1483111151469465722`).
* **🚚 Advanced Moderation:**
  * `/move` - U rar user kasta channel-ka aad rabto.
  * `/writemsg` - Fariin ka dir magaca bot-ka.
  * `/add-role` & `/remove-role` - Maaree roles-ka xubnaha.
  * `/autorole` - Si otomaatig ah uga sii role xubnaha cusub.
  * `/slowmode` - Ku samee channel-ka xaddidaad fariimaha ah.
---
## 📜 Amarrada Bot-ka (Slash Commands)
### 🔒 Amniga & Moderation (Security & Mod)

| Amarka | Qeexidda (Description) | Mod Permission |
| :--- | :--- | :--- |
| `/lock` | Ku xir channel-ka si aan fariimo loo dirin | `Manage Channels` |
| `/unlock` | Ka fur xirnaanta channel-ka | `Manage Channels` |
| `/antilink` | Ka shid ama ka dami xakamaynta links-ka (`on`/`off`) | `Administrator` |
| `/slowmode` | Ku samee channel-ka xaddidaad fariimaha ah | `Manage Channels` |
| `/move` | U rar user channel kasta (Voice ama Text) | `Move Members` |
| `/add-role` | Sii user role gaar ah | `Manage Roles` |
| `/remove-role` | Ka qaad user role uu leeyahay | `Manage Roles` |
| `/autorole` | Set-up garee role-ka xubnaha cusub | `Administrator` |

### 🎭 Madadaalada & Caawinaada (Fun & Utility)

| Amarka | Qeexidda (Description) |
| :--- | :--- |
| `/slap` | U dir slap (sampabal/dharbaaxo) user kale adoo isticmaalaya GIF |
| `/help` | Search help center (setup, warning, another problem, etc.) |
| `/writemsg` | Ku amr bot-ka inuu fariin gaar ah ka diro channel-ka |
| `/feedback` | Dhiibo fikrad iyo qiimayn (1-10 stars) |
| `/id` | Soo saar ID-ga User-ka ama Role-ka |

---
## 🛠️ Sida loo kiciyo (Setup)
1. **Install Dependencies:**
   ```bash
   npm install discord.js
