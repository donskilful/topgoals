export type MatchStatus = "live" | "finished" | "upcoming";

export interface TickerMatch {
  id: string;
  competition: string;
  home: string;
  away: string;
  homeScore: string;
  awayScore: string;
  status: MatchStatus;
  meta: string; // "76'", "FT", "Today 20:00"
}

export const tickerMatches: TickerMatch[] = [
  {
    id: "m1",
    competition: "Premier League",
    home: "Arsenal",
    away: "Chelsea",
    homeScore: "2",
    awayScore: "1",
    status: "live",
    meta: "76'",
  },
  {
    id: "m2",
    competition: "La Liga",
    home: "Real Madrid",
    away: "Barcelona",
    homeScore: "0",
    awayScore: "0",
    status: "live",
    meta: "34'",
  },
  {
    id: "m3",
    competition: "Premier League",
    home: "Man City",
    away: "Everton",
    homeScore: "3",
    awayScore: "0",
    status: "finished",
    meta: "FT",
  },
  {
    id: "m4",
    competition: "Bundesliga",
    home: "Bayern",
    away: "Dortmund",
    homeScore: "–",
    awayScore: "–",
    status: "upcoming",
    meta: "Today 20:00",
  },
  {
    id: "m5",
    competition: "Ligue 1",
    home: "PSG",
    away: "Marseille",
    homeScore: "–",
    awayScore: "–",
    status: "upcoming",
    meta: "Today 21:00",
  },
];

export interface TipResult {
  id: string;
  result: "W" | "L";
}

export const yesterdaysTips: TipResult[] = [
  { id: "t1", result: "W" },
  { id: "t2", result: "W" },
  { id: "t3", result: "W" },
  { id: "t4", result: "W" },
  { id: "t5", result: "L" },
];

export const tipStats = {
  winRate: "82%",
  units: "+18.4 units",
  period: "Last 30 days",
};

export interface Tip {
  id: string;
  competition: string;
  kickoff: string;
  fixture: string;
  pick: string;
  odds: string;
  confidence: 1 | 2 | 3 | 4;
}

export const todaysTips: Tip[] = [
  {
    id: "tip1",
    competition: "Premier League",
    kickoff: "17:30",
    fixture: "Man United vs Liverpool",
    pick: "Over 2.5 Goals",
    odds: "1.85",
    confidence: 3,
  },
  {
    id: "tip2",
    competition: "Serie A",
    kickoff: "19:45",
    fixture: "Napoli vs Inter Milan",
    pick: "Both Teams to Score",
    odds: "1.72",
    confidence: 2,
  },
  {
    id: "tip3",
    competition: "Eredivisie",
    kickoff: "20:00",
    fixture: "Ajax vs PSV",
    pick: "Ajax to Win",
    odds: "2.10",
    confidence: 4,
  },
];

export interface Highlight {
  id: string;
  duration: string;
  title: string;
}

export const highlights: Highlight[] = [
  { id: "h1", duration: "2:14", title: "Haaland's hat-trick vs Everton" },
  { id: "h2", duration: "0:48", title: "Bellingham's stunner from range" },
  { id: "h3", duration: "3:02", title: "Top 5 goals of the week" },
];

export interface NewsItem {
  id: string;
  tag: "Transfer" | "News";
  title: string;
  time: string;
}

export const latestNews: NewsItem[] = [
  {
    id: "n1",
    tag: "Transfer",
    title: "Mbappé completes move to Real Madrid",
    time: "2 hours ago",
  },
  {
    id: "n2",
    tag: "News",
    title: "Premier League confirms new VAR protocol",
    time: "4 hours ago",
  },
  {
    id: "n3",
    tag: "Transfer",
    title: "Saka signs new long-term deal with Arsenal",
    time: "6 hours ago",
  },
  {
    id: "n4",
    tag: "News",
    title: "Champions League draw: what to expect",
    time: "8 hours ago",
  },
];

export interface StandingRow {
  pos: number;
  team: string;
  played: number;
  gd: string;
  points: number;
  qualifying: boolean;
}

export const standings: StandingRow[] = [
  { pos: 1, team: "Liverpool", played: 24, gd: "+31", points: 58, qualifying: true },
  { pos: 2, team: "Arsenal", played: 24, gd: "+27", points: 54, qualifying: true },
  { pos: 3, team: "Man City", played: 24, gd: "+24", points: 51, qualifying: true },
  { pos: 4, team: "Chelsea", played: 24, gd: "+15", points: 45, qualifying: false },
  { pos: 5, team: "Newcastle", played: 24, gd: "+11", points: 42, qualifying: false },
];

export interface TrendingTip {
  id: string;
  fixture: string;
  pick: string;
  odds: string;
}

export const trendingTips: TrendingTip[] = [
  { id: "tt1", fixture: "Man Utd vs Liverpool", pick: "Over 2.5", odds: "1.85" },
  { id: "tt2", fixture: "Napoli vs Inter", pick: "BTTS", odds: "1.72" },
  { id: "tt3", fixture: "Ajax vs PSV", pick: "Ajax Win", odds: "2.10" },
];

export const heroStory = {
  eyebrow: "Matchday · 76' Live",
  headlineLine1: "Arsenal on the",
  headlineLine2: "brink of a",
  headlineAccent: "statement win",
  description:
    "Bukayo Saka's first-half double has the Emirates rocking as Arsenal push for a statement win over Chelsea in today's marquee Premier League fixture.",
  primaryCta: "Watch Highlights",
  secondaryCta: "Read Match Report",
};

export const heroSideStories: NewsItem[] = [latestNews[0], latestNews[1]];
