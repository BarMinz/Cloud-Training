const GREETING_KEYWORDS = ["hello", "hi ", "hey ", "good morning", "good afternoon", "good evening", "dear", "thank you for contacting", "thanks for reaching", "greetings"]
const GREETING_REMARK = [
  "Quick note — a greeting would have been a nice touch at the start! But here's the update anyway:",
  "A simple 'hello' at the beginning goes a long way in support, but I'll answer regardless:",
]

const CLOSING_KEYWORDS = ["great day", "good day", "have a great", "have a good", "reach out", "don't hesitate", "feel free", "here to help", "happy to help", "take care", "anytime", "whenever", "need anything", "best regards", "if you need", "always here", "pleasure"]
const CLOSING_REMARK = [
  "Issue sorted — though a friendly sign-off like 'feel free to reach out anytime' would have been a nice touch!",
  "All good on our end! Just a small note: ending with 'have a great day' or 'don't hesitate to contact us' makes the experience feel much more professional.",
]

export const SIMULATION_TICKETS = [
  {
    id: "KYK-2201",
    subject: "VPN keeps dropping every few minutes",
    priority: "high",
    customer: { name: "Noa Shapiro", email: "n.shapiro@globaltech.co", company: "GlobalTech" },
    createdAt: "08:47",
    messages: [
      {
        from: "customer",
        text: "Hi, our VPN keeps dropping every few minutes. We use it to connect to our servers on Kamatera and it's making work completely impossible.",
        time: "08:47",
      },
    ],
    followUps: [
      "Sure — the server is vpn-kamatera-01 (IP: 185.84.141.50). As for credentials, I'd prefer to send them securely — what method do you recommend? Also, for more context: the VPN drops after about 10–15 minutes of idle time. We're using OpenVPN, and the error log shows 'TLS Error: TLS key negotiation failed to occur within 60 seconds' right before it disconnects.",
      "Got it, I'll use that to send the credentials securely — thank you!\n\nOne last thing, and this is purely a bonus question since you're still new to the team: based on what I've described, do you have any initial thoughts on what might be causing the drops? No pressure at all — we don't expect a full diagnosis at this stage. It's just a great learning exercise to think through!",
      "Interesting thoughts — appreciate you giving it a go! We'll have a senior engineer dig into it from here. Thanks so much for your help today, really appreciate the quick response!",
    ],
    exchanges: [
      {
        keywords: ["error", "message", "log", "drop", "when", "how", "often", "frequently", "client", "vpn", "openvpn", "describe", "happen", "see", "detail", "minutes", "disconnect", "idle", "what", "version", "which", "information", "provide", "additional", "elaborate", "clarify", "explain", "understand", "further", "regarding", "share", "assist", "investigate", "concern", "situation", "look", "review", "gather", "more", "issue", "problem", "credential", "server", "ip", "access", "name", "hostname"],
        confusion: [
          "I'm not sure that helps. The VPN just keeps dropping. Could you ask me something specific — like what error message appears, what server it's on, or how long it stays connected before dropping?",
          "We just need the VPN to stop disconnecting. Could you ask me about the error logs, when exactly it drops, or request the server details?",
        ],
        hint: "Ask the customer for more details — when the VPN drops, what error message appears, or request the server name/IP and credentials to investigate directly.",
        mannersKeywords: GREETING_KEYWORDS,
        mannersRemark: GREETING_REMARK,
        mannersPosition: "before",
      },
      {
        keywords: ["keepalive", "timeout", "idle", "inactive", "config", "setting", "server", "directive", "session", "expire", "interval", "alive", "connection", "parameter", "timer", "time", "duration", "check", "review", "look", "configuration", "file", "openvpn", "one-time", "onetime", "onetimesecret", "pwpush", "secure", "safely", "link", "password manager", "lastpass", "bitwarden", "encrypted", "transfer", "send", "method", "way"],
        confusion: [
          "You mentioned a TLS error and idle-based drops. Is there something in the OpenVPN server configuration I should check — like an idle timeout or keepalive setting? Or if you'd like to access the server directly, let me know a safe way to send the credentials.",
          "The connection drops when idle. Should I look for a timeout directive in the config? Or if you're logging in yourself, how should I securely share the server credentials?",
        ],
        hint: "The customer gave you server details and mentioned idle drops with a TLS error. Either suggest a secure way to receive credentials (e.g. a one-time link), or ask them to check the OpenVPN server config for a timeout or keepalive setting.",
      },
      {
        // Bonus diagnosis exchange — very permissive, any attempt counts
        keywords: ["think", "maybe", "could", "might", "vpn", "timeout", "idle", "inactive", "openvpn", "config", "setting", "drop", "disconnect", "not sure", "unsure", "suspect", "believe", "perhaps", "probably", "possibly", "session", "connection", "keepalive", "timer", "expire", "time", "minutes", "server", "firewall", "network", "tls", "error", "log", "issue", "cause", "reason", "seems", "looks", "guess", "idea", "thought", "theory", "investigate", "check", "review", "suggest", "feel", "sense"],
        confusion: [
          "No worries at all! Just share any initial thought — there's genuinely no wrong answer here. What does your gut tell you?",
          "Really, anything goes here! Even a hunch counts. What comes to mind when you think about the drops happening after 10–15 minutes of idle time?",
        ],
        hint: "Bonus question! Think about what the customer told you: the VPN drops after 10–15 minutes of idle time. In OpenVPN, there's a configuration directive called 'inactive' that terminates sessions after a period of inactivity. That's likely the culprit — mention anything along those lines.",
        mannersKeywords: CLOSING_KEYWORDS,
        mannersRemark: CLOSING_REMARK,
        mannersPosition: "after",
      },
    ],
  },

  {
    id: "KYK-2198",
    subject: "Request: create a new server on our Kamatera account",
    priority: "low",
    customer: { name: "Amir Cohen", email: "a.cohen@devteam.io", company: "DevTeam" },
    createdAt: "Yesterday, 13:05",
    messages: [
      {
        from: "customer",
        text: "Hello, I need a new server created on our Kamatera account for a project we're starting. Can you set this up for us?",
        time: "13:05",
      },
    ],
    followUps: [
      "Sure! We need Windows Server 2022, 4 vCPUs, 16 GB RAM, 200 GB SSD, in the IL-TA zone under our existing account. Please name it PROD-APP-03, place it on the same VLAN as PROD-APP-01 and PROD-APP-02, and send the initial admin credentials to a.cohen@devteam.io once it's ready. Thanks!",
    ],
    exchanges: [
      {
        keywords: ["spec", "os", "operating", "cpu", "vcpu", "ram", "memory", "storage", "disk", "size", "name", "hostname", "zone", "region", "account", "resource", "config", "what", "need", "require", "detail", "which", "information", "provide", "additional", "elaborate", "clarify", "explain", "understand", "further", "regarding", "share", "assist", "investigate", "concern", "situation", "look", "review", "gather", "more", "request", "requirement", "network", "vlan", "credential", "email", "send"],
        confusion: [
          "I just need a new server on our Kamatera account. What details do you need from me to create it — OS, specs, that kind of thing?",
          "I'm not sure what information you need. Could you ask me about the server specs, zone, and what we'd like to name it?",
        ],
        hint: "Ask the customer for the server specifications: OS, CPU, RAM, storage size, hostname, zone, VLAN placement, and where to send the credentials once it's ready.",
        mannersKeywords: GREETING_KEYWORDS,
        mannersRemark: GREETING_REMARK,
        mannersPosition: "before",
      },
    ],
  },

  {
    id: "KYK-2205",
    subject: "Entire environment is down",
    priority: "critical",
    customer: { name: "Rachel Blum", email: "r.blum@financeplus.com", company: "FinancePlus" },
    createdAt: "14:31",
    messages: [
      {
        from: "customer",
        text: "The entire environment is down. HELP!",
        time: "14:31",
      },
    ],
    followUps: [
      "All our servers are hosted on Kamatera. The main ones are web (185.84.140.10), DB (185.84.140.20), and app server (185.84.140.30). They were all working fine this morning. Since about an hour ago nobody can reach any of them from outside. In the Kamatera CWM portal the servers all show as 'Running' — but no external connections are going through.",
      "One of our team members was working on the network setup earlier. Looking at the CWM console right now — we have a standalone external firewall appliance and it's showing as Powered Off. Could that be causing everything to go down?",
      "Yes please, go ahead and power it on!",
    ],
    exchanges: [
      {
        keywords: ["server", "ip", "address", "name", "kamatera", "which", "what", "describe", "affect", "access", "error", "specific", "detail", "tell", "more", "service", "host", "machine", "reach", "symptom", "happen", "system", "check", "environment", "information", "provide", "additional", "elaborate", "clarify", "explain", "understand", "further", "regarding", "share", "assist", "investigate", "concern", "situation", "look", "review", "gather", "issue", "problem", "affect", "impact", "down", "portal", "cwm"],
        confusion: [
          "Everything is just down — I don't know what else to say! What do you need from me to help? Which servers, which IPs?",
          "I'm panicking here. Can you ask me something specific — like which servers are affected or what you can see in the Kamatera CWM portal?",
        ],
        hint: "This is a critical outage — ask which servers are affected (names or IPs), what the customer sees in the Kamatera CWM portal, and whether any external access is working at all.",
        mannersKeywords: GREETING_KEYWORDS,
        mannersRemark: GREETING_REMARK,
        mannersPosition: "before",
      },
      {
        keywords: ["firewall", "fw", "network", "rule", "change", "recent", "modified", "cwm", "portal", "security", "acl", "block", "filter", "traffic", "policy", "who", "admin", "setting", "touch", "edit", "configuration", "access", "inbound", "external", "route", "gateway", "connectivity"],
        confusion: [
          "I don't know what's happening! The servers all show as Running in the CWM portal but nothing is reachable from outside. What else should I be checking? We're losing business every minute!",
          "That's not helping us get back online. Everything was fine this morning and now it's all gone. Where should we even start looking?",
        ],
        hint: "The servers are running but unreachable from outside — this points to a network or firewall issue. Ask if anyone recently changed firewall or security settings in the Kamatera CWM portal.",
      },
      {
        keywords: ["power", "turn on", "turn it", "power on", "enable", "start", "switch on", "would you like", "shall i", "should i", "can i", "want me to", "like me to", "may i", "boot", "spin up", "bring it", "bring up"],
        // If trainee proactively powers it on themselves → different customer reply
        branchKeywords: ["i turned", "i powered", "i switched", "turned it on", "powered it on", "switched it on", "have turned", "have powered", "already on", "it's back on", "back online", "done, please check", "done — please", "it is now on", "i've turned", "i've powered"],
        branchFollowUp: "Oh it's already back! Everything came back immediately — all three servers are reachable again. You're an absolute lifesaver, thank you so much!",
        confusion: [
          "The firewall is just sitting there as 'Powered Off' in the console. What should we do — can you do something from your end, or do I need to action this myself?",
          "It's showing as off in CWM. Is there anything you can do, or should I be trying to power it back on from the console?",
        ],
        hint: "The standalone firewall is powered off. Either power it on yourself and let the customer know to check, or ask if they'd like you to do so.",
        mannersKeywords: CLOSING_KEYWORDS,
        mannersRemark: CLOSING_REMARK,
        mannersPosition: "after",
      },
    ],
  },

  {
    id: "KYK-2193",
    subject: "Cloud server on Kamatera is very slow",
    priority: "medium",
    customer: { name: "Lior Ben-David", email: "l.bendavid@manufacturing-co.com", company: "ManufacturingCo" },
    createdAt: "Yesterday, 10:18",
    messages: [
      {
        from: "customer",
        text: "Hi, our cloud server on Kamatera is very slow today. Everything is lagging badly. Can you help?",
        time: "10:18",
      },
    ],
    followUps: [
      "It's a Windows Server 2022 VM that our whole team accesses via Remote Desktop. Everyone has been complaining since this morning. The server has 8 GB RAM and 4 vCPUs. I just opened Task Manager and RAM is at 94%, CPU is bouncing between 60–80%. We haven't made any changes to the server itself.",
      "I sorted by memory in Task Manager. There are 6 Chrome browser instances open — one per user session — each with loads of tabs. On top of that there are 4 large Excel files open and several other programs. The users have basically never closed anything since they logged in. Is that the problem?",
      "We asked all users to close unused Chrome tabs, close Excel files they're not actively working on, and disconnect and reconnect their RDP sessions. RAM dropped to 44% and CPU is sitting at 15%. Server is running smoothly again. We'll set some usage guidelines for the team. Thank you!",
    ],
    exchanges: [
      {
        keywords: ["task", "manager", "resource", "cpu", "ram", "memory", "usage", "process", "running", "application", "what", "check", "monitor", "performance", "rdp", "user", "session", "open", "consume", "utilization", "metric", "how many", "logged", "information", "provide", "additional", "elaborate", "clarify", "explain", "understand", "further", "regarding", "share", "assist", "investigate", "concern", "situation", "look", "review", "gather", "more", "issue", "problem", "slow", "lag", "affect"],
        confusion: [
          "The server is just really slow. What should I check — is there a way to see what's consuming the resources?",
          "Everyone is complaining about lag. Can you tell me what to look at? Should I open Task Manager or something to see what's going on?",
        ],
        hint: "Ask the customer to check Task Manager on the server and report CPU and RAM usage, and how many users are currently connected via RDP.",
        mannersKeywords: GREETING_KEYWORDS,
        mannersRemark: GREETING_REMARK,
        mannersPosition: "before",
      },
      {
        keywords: ["chrome", "browser", "excel", "application", "app", "tab", "process", "memory", "ram", "close", "open", "consuming", "heavy", "usage", "software", "program", "session", "user", "resource", "causing", "running", "sort", "highest", "most", "identify", "which", "top", "list", "find"],
        confusion: [
          "Task Manager shows RAM at 94% and high CPU. There are multiple users connected via RDP. What should I look at specifically to find what's eating up all the resources?",
          "The memory and CPU are both very high. Is there a specific process or type of application I should be looking for in Task Manager?",
        ],
        hint: "Resources are nearly maxed out with multiple RDP sessions active. Ask the customer to sort Task Manager by memory and identify which applications are consuming the most — look for browsers and heavy Office files.",
      },
      {
        keywords: ["close", "quit", "exit", "terminate", "tab", "browser", "excel", "application", "free", "resource", "memory", "restart", "session", "clear", "guideline", "policy", "usage", "reduce", "limit", "disconnect", "reconnect", "ask", "user", "instruct", "tell"],
        confusion: [
          "There are a ton of Chrome windows and Excel files open across all the user sessions — nobody has closed anything. Is that likely the cause, and what should we ask users to do?",
          "The users have loads of apps open and never close them. Should we have them close Chrome tabs and Excel? Will that actually free up enough RAM and CPU?",
        ],
        hint: "Multiple Chrome sessions and large Excel files from different RDP users are using up all the RAM and CPU. Instruct users to close unused tabs and applications, then disconnect and reconnect their RDP sessions to free up memory.",
        mannersKeywords: CLOSING_KEYWORDS,
        mannersRemark: CLOSING_REMARK,
        mannersPosition: "after",
      },
    ],
  },
]

export const PRIORITY_META = {
  unassigned: { label: "Unassigned", color: "text-slate-500", bg: "bg-slate-500/10", border: "border-slate-500/20", dot: "bg-slate-600" },
  critical:   { label: "Critical",   color: "text-red-400",    bg: "bg-red-500/15",    border: "border-red-500/30",    dot: "bg-red-500"    },
  high:       { label: "High",       color: "text-orange-400", bg: "bg-orange-500/15", border: "border-orange-500/30", dot: "bg-orange-500" },
  medium:     { label: "Medium",     color: "text-amber-400",  bg: "bg-amber-500/15",  border: "border-amber-500/30",  dot: "bg-amber-400"  },
  low:        { label: "Low",        color: "text-sky-400",    bg: "bg-sky-500/15",    border: "border-sky-500/30",    dot: "bg-sky-400"    },
}
