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
      // Handles both: "ask for error details" AND "ask for server/credentials" paths
      "Sure — the server is vpn-kamatera-01 (IP: 185.84.141.50). As for credentials, I'd prefer to send them securely — what method do you recommend? Also, for more context: the VPN drops after about 10–15 minutes of idle time. We're using OpenVPN, and the error log shows 'TLS Error: TLS key negotiation failed to occur within 60 seconds' right before it disconnects.",
      // Handles both: "one-time link / secure transfer" AND "check config for timeout" paths
      "Got it, I'll use that to send the credentials securely. I also went ahead and checked the OpenVPN server config on the Kamatera VM — I can see a line that says 'inactive 600'. That's 10 minutes. Is that what's causing the drops? Should I change or remove it?",
      "I commented out the 'inactive 600' line and added 'keepalive 10 120' to both the server and client configs, then restarted the OpenVPN service. The VPN has been stable for over an hour with no drops at all. Thank you! Resolved.",
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
        keywords: ["keepalive", "inactive", "config", "edit", "change", "remove", "comment", "add", "restart", "reload", "service", "openvpn", "apply", "update", "modify", "set", "value", "line", "fix", "directive", "disable"],
        confusion: [
          "I found the 'inactive 600' line in the server config. Do I need to remove it or change it, and is there a keepalive directive I should add alongside that?",
          "So the 10-minute idle timeout is causing the drops. Should I just delete that line, or is there a better setting to replace it with? And do I need to restart the service after?",
        ],
        hint: "The root cause is the 'inactive 600' directive in the OpenVPN config. Tell the customer to comment it out, add 'keepalive 10 120' to both server and client configs, then restart the OpenVPN service.",
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
      "We need Windows Server 2022, 4 vCPUs, 16 GB RAM, 200 GB SSD. It should be in the IL-TA zone under our existing account. Please name it PROD-APP-03.",
      "Yes, go ahead. For networking — put it on the same VLAN as PROD-APP-01 and PROD-APP-02. Please send the initial admin credentials to me at a.cohen@devteam.io once it's up.",
      "The server is up, I received the credentials, and RDP access is working perfectly. It's on the correct network. Thank you for the quick turnaround — request complete!",
    ],
    exchanges: [
      {
        keywords: ["spec", "os", "operating", "cpu", "vcpu", "ram", "memory", "storage", "disk", "size", "name", "hostname", "zone", "region", "account", "resource", "config", "what", "need", "require", "detail", "which", "information", "provide", "additional", "elaborate", "clarify", "explain", "understand", "further", "regarding", "share", "assist", "investigate", "concern", "situation", "look", "review", "gather", "more", "issue", "request", "requirement"],
        confusion: [
          "I just need a new server on our Kamatera account. What details do you need from me to create it — OS, specs, that kind of thing?",
          "I'm not sure what information you need. Could you ask me about the server specs, zone, and what we'd like to name it?",
        ],
        hint: "Ask the customer for the server specifications: OS, CPU, RAM, storage size, hostname, and which region/zone in their Kamatera account.",
        mannersKeywords: GREETING_KEYWORDS,
        mannersRemark: GREETING_REMARK,
        mannersPosition: "before",
      },
      {
        keywords: ["confirm", "proceed", "network", "vlan", "credential", "password", "email", "send", "username", "admin", "connect", "connectivity", "ready", "go", "create", "same", "existing", "provision", "start", "begin", "setup"],
        confusion: [
          "I've given you the specs — Windows 2022, 4 vCPUs, 16 GB RAM, 200 GB SSD, IL-TA zone, named PROD-APP-03. Are we good to proceed, or do you need network and credential delivery details first?",
          "The specs are set. Do you need to know which network to put it on, or where to send the credentials once it's created?",
        ],
        hint: "You have all the specs. Confirm you're ready to proceed and ask about network placement (VLAN) and how to deliver the initial credentials.",
      },
      {
        keywords: ["create", "provision", "spin", "build", "done", "complete", "ready", "credential", "password", "send", "rdp", "access", "ip", "address", "when", "status", "setup", "deploy", "email", "time", "long", "eta"],
        confusion: [
          "All the details are confirmed. When can the server be provisioned, and how will I receive the access credentials once it's ready?",
          "We're all set on our end. How long will it take to spin up, and will the credentials come by email?",
        ],
        hint: "Confirm the provisioning timeline and let the customer know the credentials will be sent to their email once the server is ready.",
        mannersKeywords: CLOSING_KEYWORDS,
        mannersRemark: CLOSING_REMARK,
        mannersPosition: "after",
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
      "One of our team members was adjusting the firewall settings in the CWM portal earlier today. I just went in and checked — the firewall is enabled on our account, but it looks like all the inbound rules were deleted by mistake. Nothing is being allowed through.",
      "We re-added the rules — SSH (22), RDP (3389), HTTP (80), and HTTPS (443) for each server. Everything came back immediately. We've also exported the ruleset as a backup so this never happens again. Thank you for pointing us to the firewall! Resolved.",
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
          "The servers show as running in the CWM portal but nothing from outside can reach them. Could it be a network or firewall issue? Someone was working on settings earlier.",
          "Kamatera portal says servers are up, but external access is completely gone. Should we be looking at the firewall rules or network settings in CWM?",
        ],
        hint: "The servers are running but unreachable from outside — this points to a network or firewall issue. Ask if anyone recently changed firewall or security settings in the Kamatera CWM portal.",
      },
      {
        keywords: ["rule", "add", "restore", "create", "port", "allow", "permit", "ssh", "rdp", "http", "https", "443", "80", "22", "3389", "open", "enable", "inbound", "traffic", "firewall", "config", "re-add", "recreate", "fix", "recover"],
        confusion: [
          "All the firewall inbound rules are gone — someone deleted them. What rules do we need to add back to restore access to our servers?",
          "The firewall rules were wiped. Do we just recreate the standard allow rules for SSH, RDP, HTTP, HTTPS? Is there a specific way to do it in CWM?",
        ],
        hint: "All CWM firewall inbound rules were accidentally deleted. Guide the customer to recreate rules for SSH (22), RDP (3389), HTTP (80), and HTTPS (443) for each server.",
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
