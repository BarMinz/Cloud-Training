export const SIMULATION_TICKETS = [
  {
    id: "KYK-1042",
    subject: "All staff unable to access company intranet",
    priority: "critical",
    customer: { name: "Sarah Chen", email: "s.chen@acmecorp.com", company: "ACME Corp" },
    createdAt: "10:32",
    messages: [
      {
        from: "customer",
        text: "Hi, our entire office (150 employees) has been unable to access the company intranet for the past 30 minutes. Nobody can work. This is extremely urgent — please help immediately!",
        time: "10:32",
      },
    ],
    followUps: [
      "We checked — all other websites load fine from our network. It's specifically the intranet URL (https://intranet.acmecorp.com) that times out. The error in Chrome is ERR_CONNECTION_TIMED_OUT.",
      "Our IT lead found that the Apache service on the intranet server had crashed. He restarted it and the site is loading now. But what caused this and how do we prevent it from happening again?",
      "Thank you for the explanation and the monitoring tip. I really appreciate how quickly you responded — this was a real crisis and you handled it professionally. I'll mark this as resolved.",
    ],
  },
  {
    id: "KYK-1039",
    subject: "Cannot send or receive emails since this morning",
    priority: "high",
    customer: { name: "David Levi", email: "d.levi@techstart.io", company: "TechStart" },
    createdAt: "09:15",
    messages: [
      {
        from: "customer",
        text: "Hi team, I haven't been able to send or receive any emails since this morning. This is really impacting my work — I have client communication pending. Please advise.",
        time: "09:15",
      },
    ],
    followUps: [
      "I'm using Outlook 2019. When I try to send, I get: 'The connection to your mail server was interrupted. If this problem continues, contact your server administrator.' I haven't changed any settings recently.",
      "I found the outgoing SMTP port was set to 25 — I changed it to 587 with TLS as you suggested and now I can send! However I'm still not receiving any new emails. My inbox is empty since 7am.",
      "IT just checked and my inbox quota was at 100% (18 GB full). After archiving old emails, new messages started arriving immediately. All fixed now — thank you for walking me through this!",
    ],
  },
  {
    id: "KYK-1035",
    subject: "VPN drops connection every few minutes",
    priority: "medium",
    customer: { name: "Mia Torres", email: "m.torres@remote-team.net", company: "RemoteTeam" },
    createdAt: "Yesterday, 16:47",
    messages: [
      {
        from: "customer",
        text: "Hello, one of our remote developers has been having VPN issues all day. It connects successfully but drops after 3–5 minutes, forcing a manual reconnect. This is making it very hard to work.",
        time: "16:47",
      },
    ],
    followUps: [
      "She's using Cisco AnyConnect on Windows 11. When it drops, the error says 'VPN session ended by server'. She's on home broadband (~150 Mbps). It seems worse during video calls.",
      "She tried the DPD keepalive setting you suggested (30 seconds). Drops are less frequent but still happening. The video call issue is probably related — her upload is only 20 Mbps.",
      "Switching from the TCP to the UDP profile made a massive difference — she's been connected for 2 hours straight now with no drops. Consider this resolved. Thank you!",
    ],
  },
  {
    id: "KYK-1028",
    subject: "Request: install Adobe Acrobat Pro on my workstation",
    priority: "low",
    customer: { name: "Jake Patel", email: "j.patel@acmecorp.com", company: "ACME Corp" },
    createdAt: "Yesterday, 11:20",
    messages: [
      {
        from: "customer",
        text: "Hi, I need Adobe Acrobat Pro installed on my workstation. I frequently need to edit and sign PDF contracts, but currently I can only view PDFs. Can this be arranged?",
        time: "11:20",
      },
    ],
    followUps: [
      "My manager is David Levi (d.levi@acmecorp.com). I'll ask him to send the approval email now. My machine is a Dell Latitude 5540, Windows 11 Pro, with about 120 GB free disk space.",
      "David has just sent the approval email. Once confirmed, is there an estimated time for the installation? I'd like to plan around it if you need remote access to my machine.",
      "Installation went perfectly — Acrobat Pro is working and I can now edit and sign PDFs. The whole process was very smooth. Thank you!",
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
