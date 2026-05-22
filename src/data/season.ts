export const COLORS = {
  gold: '#F5A623',
  maroon: '#8B1A2D',
  bg: '#0D0D0D',
  white: '#FFFFFF',
  grey: '#555555',
  lightGrey: '#999999',
  highlightBg: 'rgba(245,166,35,0.08)',
  green: '#1F7A3A',
  blue: '#1B4EC8',
  orange: '#C85A00',
};

export const FONT = "Arial, 'Helvetica Neue', Helvetica, sans-serif";

export interface TableRow {
  pos: number;
  team: string;
  w: number;
  d: number;
  l: number;
  gd: number;
  pts: number;
  badge?: string;
  badgeColor?: string;
  borderColor?: string;
  highlight?: boolean;
}

export const leagueTable: TableRow[] = [
  {pos: 1, team: 'Celtic',        w: 26, d:  4, l:  8, gd:  32, pts: 82, badge: 'UCL',  badgeColor: COLORS.blue,   borderColor: COLORS.blue},
  {pos: 2, team: 'Hearts',        w: 24, d:  8, l:  6, gd:  33, pts: 80, badge: 'UCL',  badgeColor: COLORS.blue,   borderColor: COLORS.blue},
  {pos: 3, team: 'Rangers',       w: 20, d: 12, l:  6, gd:  33, pts: 72, badge: 'UEL',  badgeColor: COLORS.orange, borderColor: COLORS.orange},
  {pos: 4, team: 'Motherwell',    w: 16, d: 13, l:  9, gd:  23, pts: 61, badge: 'UECL', badgeColor: COLORS.green,  borderColor: COLORS.green, highlight: true},
  {pos: 5, team: 'Hibernian',     w: 15, d: 12, l: 11, gd:  14, pts: 57},
  {pos: 6, team: 'Falkirk',       w: 14, d:  7, l: 17, gd: -12, pts: 49},
  {pos: 7, team: 'Dundee United', w: 10, d: 15, l: 13, gd: -11, pts: 45},
  {pos: 8, team: 'Dundee',        w: 11, d:  9, l: 18, gd: -19, pts: 42},
  {pos: 9, team: 'Aberdeen',      w: 11, d:  7, l: 20, gd: -15, pts: 40},
  {pos: 10, team: 'Kilmarnock',   w: 10, d: 10, l: 18, gd: -18, pts: 40},
  {pos: 11, team: 'St. Mirren',   w:  8, d: 10, l: 20, gd: -25, pts: 34, badge: 'PO',  badgeColor: COLORS.gold,   borderColor: COLORS.gold},
  {pos: 12, team: 'Livingston',   w:  2, d: 15, l: 21, gd: -35, pts: 21, badge: 'REL', badgeColor: COLORS.maroon, borderColor: COLORS.maroon},
];

export interface PlayerGoals {
  name: string;
  goals: number;
  assists: number;
}

export const goalsAssists: PlayerGoals[] = [
  {name: 'Maswanhise',      goals: 15, assists: 3},
  {name: 'Just',            goals:  7, assists: 7},
  {name: 'Stamatelopoulos', goals:  7, assists: 3},
  {name: 'Longelo',         goals:  5, assists: 4},
  {name: 'Watt',            goals:  4, assists: 4},
  {name: 'Slattery',        goals:  3, assists: 8},
];

export interface MonthData {
  month: string;
  ppg: number;
  isGolden: boolean;
  isBad?: boolean;
}

export const pointsPerMonth: MonthData[] = [
  {month: 'Aug', ppg: 1.0,  isGolden: false},
  {month: 'Sep', ppg: 2.0,  isGolden: true},
  {month: 'Oct', ppg: 2.0,  isGolden: true},
  {month: 'Nov', ppg: 2.0,  isGolden: true},
  {month: 'Dec', ppg: 2.33, isGolden: true},
  {month: 'Jan', ppg: 2.5,  isGolden: true},
  {month: 'Feb', ppg: 2.5,  isGolden: true},
  {month: 'Mar', ppg: 0.2,  isGolden: false, isBad: true},
  {month: 'Apr', ppg: 1.5,  isGolden: false},
  {month: 'May', ppg: 1.0,  isGolden: false},
];

export interface OpponentData {
  opponent: string;
  pts: number;
  category: 'high' | 'mid' | 'low';
}

export const pointsByOpponent: OpponentData[] = [
  {opponent: 'Livingston',  pts: 9, category: 'high'},
  {opponent: 'Hibernian',   pts: 8, category: 'mid'},
  {opponent: 'St. Mirren',  pts: 7, category: 'high'},
  {opponent: 'Kilmarnock',  pts: 7, category: 'high'},
  {opponent: 'Aberdeen',    pts: 6, category: 'high'},
  {opponent: 'Dundee Utd',  pts: 6, category: 'high'},
  {opponent: 'Rangers',     pts: 5, category: 'mid'},
  {opponent: 'Dundee',      pts: 4, category: 'mid'},
  {opponent: 'Celtic',      pts: 3, category: 'low'},
  {opponent: 'Hearts',      pts: 3, category: 'low'},
  {opponent: 'Falkirk',     pts: 1, category: 'low'},
];

export interface PlayerMinutes {
  name: string;
  pos: string;
  mins: number;
  posColor: string;
}

export const minutesPlayed: PlayerMinutes[] = [
  {name: 'Calum Ward',    pos: 'GK', mins: 3330, posColor: COLORS.maroon},
  {name: 'L. Fadinger',   pos: 'MF', mins: 2907, posColor: COLORS.blue},
  {name: 'Elliot Watt',   pos: 'MF', mins: 2894, posColor: COLORS.blue},
  {name: 'Paul McGinn',   pos: 'DF', mins: 2882, posColor: COLORS.grey},
  {name: 'T. Maswanhise', pos: 'FW', mins: 2852, posColor: COLORS.gold},
  {name: 'E. Longelo',    pos: 'DF', mins: 2720, posColor: COLORS.grey},
  {name: 'Eli Just',      pos: 'MF', mins: 2683, posColor: COLORS.blue},
  {name: 'C. Slattery',   pos: 'MF', mins: 2313, posColor: COLORS.blue},
  {name: 'Stephen Welsh', pos: 'DF', mins: 2277, posColor: COLORS.grey},
  {name: 'Ibrahim Sa\'id',pos: 'MF', mins: 2247, posColor: COLORS.blue},
  {name: 'S. O\'Donnell', pos: 'DF', mins: 2180, posColor: COLORS.grey},
  {name: 'Tom Sparrow',   pos: 'DF', mins: 1542, posColor: COLORS.grey},
];
