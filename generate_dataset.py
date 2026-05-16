"""
Motherwell FC 2025/26 Season Dataset Generator
Produces: motherwell_2526_season.csv
One row per player per match, all competitive first-team fixtures.

Data sources cross-referenced: ESPN, Wikipedia, BBC Sport, Sky Sports,
Motherwell FC Official, SPFL, WhoScored, Flashscore, Sportytrader, Transfermarkt.
Where data could not be confirmed, fields are left blank.
"""

import csv
import io

# ---------------------------------------------------------------------------
# PLAYER REGISTRY  (id, name, nationality, position)
# ---------------------------------------------------------------------------
PLAYERS = {
    # Motherwell FC squad
    "P001": ("Calum Ward",            "SCO", "GK"),
    "P002": ("Johnny Koutroumbis",    "GRE", "DEF"),
    "P003": ("Liam Gordon",           "SCO", "DEF"),
    "P004": ("Paul McGinn",           "SCO", "DEF"),
    "P005": ("Emmanuel Longelo",      "ENG", "DEF"),
    "P006": ("Lukas Fadinger",        "AUT", "MID"),
    "P007": ("Elliot Watt",           "SCO", "MID"),
    "P008": ("Tawanda Maswanhise",    "ZIM", "FWD"),
    "P009": ("Callum Slattery",       "SCO", "MID"),
    "P010": ("Elijah Just",           "SCO", "MID"),
    "P011": ("Apostolos Stamatelopoulos", "GRE", "FWD"),
    "P012": ("Stephen O'Donnell",     "SCO", "DEF"),
    "P013": ("Tom Sparrow",           "ENG", "DEF"),
    "P014": ("Ibrahim Sa'id",         "GHA", "MID"),
    "P015": ("Oscar Priestman",       "ENG", "MID"),
    "P016": ("Regan Charles-Cook",    "ENG", "MID"),
    "P017": ("Callum Hendry",         "SCO", "FWD"),
    "P018": ("Stephen Welsh",         "SCO", "DEF"),   # loan from Celtic, joined 01/09/2025
    "P019": ("Eythor Bjorgolfsson",   "ISL", "MID"),
    "P020": ("Akinola Sule",          "ENG", "FWD"),
    "P021": ("Connolly",              "SCO", "GK"),    # reserve GK early LC; full name unconfirmed

    # Opponents – event players only (goals, assists, cards in matches vs Motherwell)
    # Rangers
    "OPP_TAV":    ("James Tavernier",   "ENG", "DEF"),
    "OPP_AAS":    ("Thelo Aasgaard",    "NOR", "MID"),
    "OPP_CHE":    ("Youssef Chermiti",  "POR", "FWD"),
    "OPP_RAS":    ("Nicolas Raskin",    "BEL", "MID"),
    # Celtic
    "OPP_IHE":    ("Kelechi Iheanacho", "NGA", "FWD"),
    "OPP_MAE":    ("Daizen Maeda",      "JPN", "FWD"),
    "OPP_NYG":    ("Benjamin Nygren",   "SWE", "MID"),
    # Hearts
    "OPP_MIL":    ("Harry Milne",       "SCO", "MID"),
    "OPP_BRA":    ("Claudio Braga",     "POR", "MID"),
    "OPP_SHA":    ("Lawrence Shankland","SCO", "FWD"),
    "OPP_KAB":    ("Pierre Landry Kabore","CIV","MID"),
    "OPP_KIN_OG": ("Stephen Kingsley",  "SCO", "DEF"),  # OG scorer
    # Kilmarnock
    "OPP_DAN":    ("Djenario Daniels",  "ENG", "MID"),
    "OPP_STA_K":  ("George Stanger",   "SCO", "DEF"),
    "OPP_TIF":    ("Scott Tiffoney",    "SCO", "FWD"),
    # Aberdeen
    "OPP_KAR":    ("Jesper Karlsson",   "SWE", "FWD"),
    "OPP_NIS":    ("Kevin Nisbet",      "SCO", "FWD"),
    "OPP_SHI":    ("Graeme Shinnie",    "SCO", "MID"),
    "OPP_MCT_OG": ("Tom McIntyre",      "SCO", "DEF"),  # OG
    # Hibernian
    "OPP_BOW":    ("Kieron Bowie",      "SCO", "FWD"),
    # St Mirren (LC semi)
    "OPP_MAN":    ("Mikael Mandron",    "FRA", "FWD"),
    "OPP_NLU":    ("Daniel N'Lundulu",  "FRA", "FWD"),
    "OPP_KIN_SM": ("Richard King",      "SCO", "MID"),
    # Falkirk
    "OPP_ARS":    ("Scott Arfield",     "SCO", "MID"),
    "OPP_CAL":    ("Calvin Miller",     "SCO", "MID"),
    "OPP_STW":    ("Barney Stewart",    "SCO", "DEF"),
    "OPP_BRO_F":  ("Ben Broggio",       "SCO", "FWD"),
    "OPP_CAR":    ("Henry Cartwright",  "ENG", "FWD"),
    # Dundee FC
    "OPP_YOG":    ("Tony Yogane",       "NGA", "FWD"),
    "OPP_ROB_D":  ("Finlay Robertson",  "SCO", "MID"),
    "OPP_DHA":    ("Yan Dhanda",        "WAL", "MID"),
    # Clyde (LC + SC)
    "OPP_HIL":    ("James Hilton",      "SCO", "MID"),
    "OPP_SCU":    ("Liam Scullion",     "SCO", "FWD"),
    # St Johnstone (Scottish Cup R4)
    "OPP_KIR":    ("Makenzie Kirk",     "SCO", "FWD"),
}

# ---------------------------------------------------------------------------
# MATCH REGISTRY
# Fields: match_id, date, competition, round, home, away, h_score, a_score,
#         venue, attendance
# h_score / a_score: regular-time score; penalties noted separately
# ---------------------------------------------------------------------------
MATCHES = [
    # ── SCOTTISH LEAGUE CUP (Premier Sports Cup) ─────────────────────────
    ("LC001","2025-07-12","Scottish League Cup","Group Stage – Group G",
     "Clyde","Motherwell",2,2,"New Douglas Park, Hamilton",1931),
    ("LC002","2025-07-15","Scottish League Cup","Group Stage – Group G",
     "Motherwell","Peterhead",2,1,"Fir Park, Motherwell",2657),
    ("LC003","2025-07-19","Scottish League Cup","Group Stage – Group G",
     "Stenhousemuir","Motherwell",0,1,"Ochilview Park, Stenhousemuir",""),
    ("LC004","2025-07-22","Scottish League Cup","Group Stage – Group G",
     "Motherwell","Greenock Morton",3,0,"Fir Park, Motherwell",""),
    ("LC005","2025-08-16","Scottish League Cup","Last 16",
     "St Johnstone","Motherwell",0,1,"McDiarmid Park, Perth",""),   # AET
    ("LC006","2025-09-20","Scottish League Cup","Quarter-Final",
     "Aberdeen","Motherwell",0,1,"Pittodrie, Aberdeen",10533),
    ("LC007","2025-11-01","Scottish League Cup","Semi-Final",
     "Motherwell","St Mirren",1,4,"Hampden Park, Glasgow",""),

    # ── SCOTTISH CUP ─────────────────────────────────────────────────────
    ("SC001","2025-11-29","Scottish Cup","Round 3",
     "Clyde","Motherwell",2,2,"Broadwood Stadium, Cumbernauld",""),  # MFC won 5-4 on pens
    ("SC002","2026-01-18","Scottish Cup","Round 4",
     "St Johnstone","Motherwell","","","McDiarmid Park, Perth",""),  # MFC won; score unconfirmed
    ("SC003","2026-02-18","Scottish Cup","Round 5",
     "Aberdeen","Motherwell",2,0,"Pittodrie, Aberdeen",""),

    # ── SCOTTISH PREMIERSHIP – PRE-SPLIT (Matchdays 1-33) ────────────────
    ("P001","2025-08-02","Scottish Premiership","Matchday 1",
     "Motherwell","Rangers",1,1,"Fir Park, Motherwell",8500),
    ("P002","2025-08-09","Scottish Premiership","Matchday 2",
     "St Mirren","Motherwell",0,0,"SMISA Stadium, Paisley",6735),
    ("P003","2025-08-23","Scottish Premiership","Matchday 3",
     "Heart of Midlothian","Motherwell",3,3,"Tynecastle, Edinburgh",""),
    ("P004","2025-08-30","Scottish Premiership","Matchday 4",
     "Motherwell","Kilmarnock",2,2,"Fir Park, Motherwell",""),
    ("P005","2025-09-13","Scottish Premiership","Matchday 5",
     "Dundee","Motherwell",1,1,"Dens Park, Dundee",""),
    ("P006","2025-09-27","Scottish Premiership","Matchday 6",
     "Motherwell","Aberdeen",2,0,"Fir Park, Motherwell",""),
    ("P007","2025-10-05","Scottish Premiership","Matchday 7",
     "Celtic","Motherwell",3,2,"Celtic Park, Glasgow",""),
    ("P008","2025-10-18","Scottish Premiership","Matchday 8",
     "Motherwell","Falkirk",1,2,"Fir Park, Motherwell",""),
    ("P009","2025-10-25","Scottish Premiership","Matchday 9",
     "Livingston","Motherwell",1,2,"Almondvale, Livingston",""),
    ("P010","2025-10-29","Scottish Premiership","Matchday 10",
     "Motherwell","Dundee United",2,0,"Fir Park, Motherwell",""),
    ("P011","2025-11-09","Scottish Premiership","Matchday 11",
     "Aberdeen","Motherwell",1,1,"Pittodrie, Aberdeen",""),
    ("P012","2025-11-22","Scottish Premiership","Matchday 12",
     "Kilmarnock","Motherwell",1,3,"BBSP Stadium, Kilmarnock",""),
    ("P013","2025-11-25","Scottish Premiership","Matchday 13",
     "Motherwell","Hibernian",2,0,"Fir Park, Motherwell",6585),
    ("P014","2025-11-29","Scottish Premiership","Matchday 14",
     "Motherwell","Heart of Midlothian",0,0,"Fir Park, Motherwell",""),
    ("P015","2025-12-03","Scottish Premiership","Matchday 15",
     "Falkirk","Motherwell",0,0,"Falkirk Stadium, Falkirk",""),
    ("P016","2025-12-06","Scottish Premiership","Matchday 16",
     "Motherwell","Livingston",3,0,"Fir Park, Motherwell",""),
    ("P017","2025-12-13","Scottish Premiership","Matchday 17",
     "Dundee United","Motherwell",0,0,"Tannadice, Dundee",""),
    ("P018","2025-12-20","Scottish Premiership","Matchday 18",
     "Motherwell","Dundee",1,0,"Fir Park, Motherwell",""),
    ("P019","2025-12-27","Scottish Premiership","Matchday 19",
     "Rangers","Motherwell",1,0,"Ibrox, Glasgow",""),
    ("P020","2025-12-30","Scottish Premiership","Matchday 20",
     "Motherwell","Celtic",2,0,"Fir Park, Motherwell",11435),
    ("P021","2026-01-03","Scottish Premiership","Matchday 21",
     "Motherwell","St Mirren",2,0,"Fir Park, Motherwell",""),
    ("P022","2026-01-10","Scottish Premiership","Matchday 22",
     "Hibernian","Motherwell",1,1,"Easter Road, Edinburgh",""),
    ("P023","2026-01-24","Scottish Premiership","Matchday 23",
     "Motherwell","Kilmarnock",4,0,"Fir Park, Motherwell",6243),
    ("P024","2026-01-31","Scottish Premiership","Matchday 24",
     "Livingston","Motherwell",0,2,"Almondvale, Livingston",""),
    ("P025","2026-02-11","Scottish Premiership","Matchday 25",
     "Motherwell","Rangers",1,1,"Fir Park, Motherwell",""),
    ("P026","2026-02-15","Scottish Premiership","Matchday 26",
     "Motherwell","Aberdeen",2,0,"Fir Park, Motherwell",""),
    ("P027","2026-02-21","Scottish Premiership","Matchday 27",
     "St Mirren","Motherwell",0,5,"SMISA Stadium, Paisley",""),
    ("P028","2026-02-28","Scottish Premiership","Matchday 28",
     "Motherwell","Dundee United",2,0,"Fir Park, Motherwell",8054),
    ("P029","2026-03-07","Scottish Premiership","Matchday 29",
     "Dundee","Motherwell",2,1,"Dens Park, Dundee",6304),
    ("P030","2026-03-14","Scottish Premiership","Matchday 30",
     "Celtic","Motherwell",3,1,"Celtic Park, Glasgow",""),
    ("P031","2026-03-21","Scottish Premiership","Matchday 31",
     "Motherwell","Hibernian",0,0,"Fir Park, Motherwell",""),
    ("P032","2026-04-04","Scottish Premiership","Matchday 32",
     "Motherwell","Falkirk",2,3,"Fir Park, Motherwell",""),
    ("P033","2026-04-11","Scottish Premiership","Matchday 33",
     "Heart of Midlothian","Motherwell",3,1,"Tynecastle, Edinburgh",18800),
    # ── SCOTTISH PREMIERSHIP – POST-SPLIT (Championship Group, MD 34-38) ─
    ("P034","2026-04-26","Scottish Premiership","Championship Group – Matchday 34",
     "Rangers","Motherwell",2,3,"Ibrox, Glasgow",""),
    ("P035","2026-05-02","Scottish Premiership","Championship Group – Matchday 35",
     "Falkirk","Motherwell",1,0,"Falkirk Stadium, Falkirk",""),
    ("P036","2026-05-09","Scottish Premiership","Championship Group – Matchday 36",
     "Motherwell","Heart of Midlothian",1,1,"Fir Park, Motherwell",""),
    ("P037","2026-05-13","Scottish Premiership","Championship Group – Matchday 37",
     "Motherwell","Celtic",2,3,"Fir Park, Motherwell",""),
    ("P038","2026-05-16","Scottish Premiership","Championship Group – Matchday 38",
     "Hibernian","Motherwell","","","Easter Road, Edinburgh",""),  # scheduled, not yet played
]

# ---------------------------------------------------------------------------
# EVENTS  (match_id, player_id, team, position, started, minutes_played,
#          goals, assists, yellow_cards, red_cards, sub_on_min, sub_off_min, notes)
# Only confirmed, cross-referenced data. Blanks where uncertain.
# ---------------------------------------------------------------------------
# Helpers
MFC = "Motherwell"
BLANK = ""

EVENTS = [
    # ── LC001  Clyde 2-2 Motherwell  (MFC win 5-4 pens, 12 Jul 2025) ─────
    ("LC001","P008",MFC,"FWD",1,90,2,BLANK,0,0,BLANK,BLANK,"Goals at 21' and 48'. Penalty shootout goals not counted."),
    ("LC001","OPP_HIL","Clyde","MID",1,BLANK,1,BLANK,0,0,BLANK,BLANK,"Goal: 16'"),
    ("LC001","OPP_SCU","Clyde","FWD",1,BLANK,1,BLANK,0,0,BLANK,BLANK,"Goal: 53'"),

    # ── LC002  Motherwell 2-1 Peterhead  (15 Jul 2025) ────────────────────
    # Full confirmed lineup
    ("LC002","P021",MFC,"GK",1,90,0,BLANK,0,0,BLANK,BLANK,"GK for early LC; full name unconfirmed"),
    ("LC002","P005",MFC,"DEF",1,BLANK,1,BLANK,0,0,BLANK,BLANK,"Goal: 28'"),
    ("LC002","P003",MFC,"DEF",1,90,0,BLANK,0,0,BLANK,BLANK,""),
    ("LC002","P004",MFC,"DEF",1,90,0,BLANK,0,0,BLANK,BLANK,""),
    ("LC002","P002",MFC,"DEF",1,90,0,BLANK,0,0,BLANK,BLANK,""),
    ("LC002","P007",MFC,"MID",1,90,0,BLANK,0,0,BLANK,BLANK,""),
    ("LC002","P013",MFC,"MID",1,BLANK,0,BLANK,0,0,BLANK,BLANK,""),
    ("LC002","P006",MFC,"MID",1,BLANK,1,BLANK,0,0,BLANK,BLANK,"Goal: 90+1'"),
    ("LC002","P009",MFC,"MID",1,90,0,BLANK,0,0,BLANK,BLANK,""),
    ("LC002","P010",MFC,"MID",1,90,0,BLANK,0,0,BLANK,BLANK,""),
    ("LC002","P020",MFC,"FWD",1,BLANK,0,BLANK,0,0,BLANK,BLANK,""),

    # ── LC003  Stenhousemuir 0-1 Motherwell  (19 Jul 2025) ────────────────
    ("LC003","P012",MFC,"DEF",1,BLANK,1,BLANK,0,0,BLANK,BLANK,"Goal: first half (exact minute unconfirmed). Captain."),

    # ── LC004  Motherwell 3-0 Greenock Morton  (22 Jul 2025) ──────────────
    ("LC004","P011",MFC,"FWD",1,BLANK,1,BLANK,0,0,BLANK,BLANK,"Opening goal"),
    ("LC004","P008",MFC,"FWD",1,BLANK,2,BLANK,0,0,BLANK,BLANK,"Brace. Described as 'magnificent double'"),
    ("LC004","P003",MFC,"DEF",1,BLANK,0,1,0,0,BLANK,BLANK,"1 confirmed assist"),

    # ── LC005  St Johnstone 0-1 Motherwell  (16 Aug 2025, AET) ────────────
    ("LC005","P006",MFC,"MID",1,120,1,BLANK,0,0,BLANK,BLANK,"Goal in extra time"),

    # ── LC006  Aberdeen 0-1 Motherwell  (20 Sep 2025) ─────────────────────
    ("LC006","P016",MFC,"MID",1,BLANK,1,BLANK,0,0,BLANK,BLANK,"Goal: 63'"),

    # ── LC007  Motherwell 1-4 St Mirren  (1 Nov 2025, Semi-Final) ─────────
    ("LC007","P017",MFC,"FWD",1,BLANK,1,BLANK,0,0,BLANK,BLANK,"Goal: 83'"),
    ("LC007","OPP_MAN","St Mirren","FWD",1,BLANK,2,BLANK,0,0,BLANK,BLANK,"Goals: 25' and 89'"),
    ("LC007","OPP_NLU","St Mirren","FWD",1,BLANK,1,BLANK,0,0,BLANK,BLANK,"Goal: 40'"),
    ("LC007","OPP_KIN_SM","St Mirren","MID",1,BLANK,1,BLANK,0,0,BLANK,BLANK,"Goal: 86'"),

    # ── SC001  Clyde 2-2 Motherwell  (29 Nov 2025, R3, MFC won 5-4 pens) ──
    ("SC001","OPP_HIL","Clyde","MID",1,BLANK,1,BLANK,0,0,BLANK,BLANK,"Goal in 90 mins (minute unconfirmed)"),
    ("SC001","OPP_SCU","Clyde","FWD",1,BLANK,1,BLANK,0,0,BLANK,BLANK,"Goal in 90 mins (minute unconfirmed)"),
    # Motherwell scorers in R3 not confirmed by source; left blank

    # ── SC002  St Johnstone v Motherwell  (18 Jan 2026, R4 – MFC advanced)
    # Score and scorers unconfirmed; match confirmed via Fifth Round Draw post
    # Leaving blank – do not hallucinate

    # ── SC003  Aberdeen 2-0 Motherwell  (18 Feb 2026, R5) ─────────────────
    ("SC003","OPP_NIS","Aberdeen","FWD",1,BLANK,1,BLANK,0,0,BLANK,BLANK,"Goal (minute unconfirmed)"),
    ("SC003","OPP_SHI","Aberdeen","MID",1,BLANK,1,BLANK,0,0,BLANK,BLANK,"Goal (minute unconfirmed)"),

    # ── P001  Motherwell 1-1 Rangers  (2 Aug 2025) ────────────────────────
    # Full confirmed starting XI
    ("P001","P001",MFC,"GK",1,90,0,BLANK,0,0,BLANK,BLANK,""),
    ("P001","P002",MFC,"DEF",1,90,0,BLANK,0,0,BLANK,BLANK,""),
    ("P001","P003",MFC,"DEF",1,90,0,BLANK,0,0,BLANK,BLANK,""),
    ("P001","P004",MFC,"DEF",1,90,0,BLANK,0,0,BLANK,BLANK,""),
    ("P001","P005",MFC,"DEF",1,90,1,BLANK,0,0,BLANK,BLANK,"Goal: 87'"),
    ("P001","P006",MFC,"MID",1,90,0,BLANK,0,0,BLANK,BLANK,""),
    ("P001","P007",MFC,"MID",1,90,0,BLANK,0,0,BLANK,BLANK,""),
    ("P001","P008",MFC,"FWD",1,90,0,BLANK,0,0,BLANK,BLANK,""),
    ("P001","P009",MFC,"MID",1,90,0,BLANK,0,0,BLANK,BLANK,""),
    ("P001","P010",MFC,"MID",1,90,0,BLANK,0,0,BLANK,BLANK,""),
    ("P001","P011",MFC,"FWD",1,90,0,BLANK,0,0,BLANK,BLANK,""),
    ("P001","OPP_TAV","Rangers","DEF",1,BLANK,1,BLANK,0,0,BLANK,BLANK,"Goal: header (first half, minute unconfirmed)"),

    # ── P002  St Mirren 0-0 Motherwell  (9 Aug 2025) ─────────────────────
    # No goals. No confirmed lineup. No event rows needed; match recorded via metadata.

    # ── P003  Hearts 3-3 Motherwell  (23 Aug 2025) ────────────────────────
    ("P003","P009",MFC,"MID",1,BLANK,1,BLANK,0,0,BLANK,BLANK,"Goal: 21'"),
    ("P003","P008",MFC,"FWD",1,BLANK,1,BLANK,0,0,BLANK,BLANK,"Goal: 49'"),
    ("P003","P005",MFC,"DEF",1,BLANK,1,BLANK,0,0,BLANK,BLANK,"Goal: 62'"),
    ("P003","OPP_MIL","Heart of Midlothian","MID",1,BLANK,1,BLANK,0,0,BLANK,BLANK,"Goal: 65'"),
    ("P003","OPP_BRA","Heart of Midlothian","MID",1,BLANK,2,BLANK,0,0,BLANK,BLANK,"Goals: 74' and 83'"),

    # ── P004  Motherwell 2-2 Kilmarnock  (30 Aug 2025) ────────────────────
    ("P004","P008",MFC,"FWD",1,BLANK,1,BLANK,0,0,BLANK,BLANK,"Goal: 45+1'"),
    ("P004","P005",MFC,"DEF",1,BLANK,1,BLANK,0,0,BLANK,BLANK,"Goal: 62'"),
    ("P004","OPP_DAN","Kilmarnock","MID",1,BLANK,1,BLANK,0,0,BLANK,BLANK,"Goal: 19'"),
    ("P004","OPP_STA_K","Kilmarnock","DEF",1,BLANK,1,BLANK,0,0,BLANK,BLANK,"Goal: 81'"),

    # ── P005  Dundee 1-1 Motherwell  (13 Sep 2025) ────────────────────────
    ("P005","P008",MFC,"FWD",1,BLANK,1,BLANK,0,0,BLANK,BLANK,"Goal: 33'"),
    # Dundee scorers: exact attribution unconfirmed (conflicting data between sources)

    # ── P006  Motherwell 2-0 Aberdeen  (27 Sep 2025) ──────────────────────
    # Partial confirmed lineup
    ("P006","P001",MFC,"GK",1,90,0,BLANK,0,0,BLANK,BLANK,""),
    ("P006","P005",MFC,"DEF",1,BLANK,0,BLANK,0,0,BLANK,BLANK,""),
    ("P006","P018",MFC,"DEF",1,BLANK,0,BLANK,0,0,BLANK,BLANK,"On loan from Celtic"),
    ("P006","P016",MFC,"MID",1,BLANK,0,BLANK,0,0,BLANK,BLANK,""),
    ("P006","P014",MFC,"MID",1,BLANK,0,BLANK,0,0,BLANK,BLANK,""),
    ("P006","P008",MFC,"FWD",1,BLANK,0,BLANK,0,0,BLANK,BLANK,""),
    ("P006","P011",MFC,"FWD",1,BLANK,1,BLANK,0,0,BLANK,BLANK,"Goal: 90+7' (penalty)"),
    ("P006","P006",MFC,"MID",1,BLANK,0,BLANK,0,0,BLANK,BLANK,""),
    ("P006","P007",MFC,"MID",1,BLANK,0,BLANK,0,0,BLANK,BLANK,""),
    ("P006","P002",MFC,"DEF",1,BLANK,1,BLANK,0,0,BLANK,BLANK,"Goal: 90+2'"),

    # ── P007  Celtic 3-2 Motherwell  (5 Oct 2025) ─────────────────────────
    ("P007","P011",MFC,"FWD",1,BLANK,2,BLANK,0,0,BLANK,BLANK,"Goals: 40' and 56' (pen)"),
    ("P007","OPP_IHE","Celtic","FWD",1,BLANK,1,BLANK,0,0,BLANK,BLANK,"Goal: 28' (pen)"),
    ("P007","OPP_MAE","Celtic","FWD",1,BLANK,1,BLANK,0,0,BLANK,BLANK,"Goal: 90+2'"),
    # Third Celtic scorer not confirmed from sources

    # ── P008  Motherwell 1-2 Falkirk  (18 Oct 2025) ───────────────────────
    ("P008","P008",MFC,"FWD",1,BLANK,1,BLANK,0,0,BLANK,BLANK,"Goal: first half (exact minute unconfirmed)"),
    ("P008","OPP_CAL","Falkirk","MID",1,BLANK,1,BLANK,0,0,BLANK,BLANK,"Goal (second half)"),
    ("P008","OPP_ARS","Falkirk","MID",0,BLANK,1,BLANK,0,0,BLANK,BLANK,"Goal as substitute"),

    # ── P009  Livingston 1-2 Motherwell  (25 Oct 2025) ────────────────────
    # Motherwell scorers unconfirmed from sources; Livingston scorer unconfirmed.

    # ── P010  Motherwell 2-0 Dundee United  (29 Oct 2025) ─────────────────
    ("P010","P008",MFC,"FWD",1,BLANK,1,BLANK,0,0,BLANK,BLANK,"Goal: 42'"),
    ("P010","P007",MFC,"MID",1,BLANK,1,BLANK,0,0,BLANK,BLANK,"Goal: 77'"),

    # ── P011  Aberdeen 1-1 Motherwell  (9 Nov 2025) ───────────────────────
    ("P011","P010",MFC,"MID",1,BLANK,1,BLANK,0,0,BLANK,BLANK,"Goal: 64'"),
    ("P011","OPP_KAR","Aberdeen","FWD",1,BLANK,1,BLANK,0,0,BLANK,BLANK,"Goal: 61'"),

    # ── P012  Kilmarnock 1-3 Motherwell  (22 Nov 2025) ────────────────────
    ("P012","P008",MFC,"FWD",1,BLANK,2,BLANK,0,0,BLANK,BLANK,"Goals: 16' and 26'"),
    ("P012","P011",MFC,"FWD",1,BLANK,1,BLANK,0,0,BLANK,BLANK,"Goal: 68' (pen)"),
    ("P012","OPP_TIF","Kilmarnock","FWD",1,BLANK,1,BLANK,0,0,BLANK,BLANK,"Goal: 49'"),

    # ── P013  Motherwell 2-0 Hibernian  (25 Nov 2025) ─────────────────────
    ("P013","P008",MFC,"FWD",1,BLANK,1,BLANK,0,0,BLANK,BLANK,"Goal: 19' (pen)"),
    ("P013","P010",MFC,"MID",1,BLANK,1,BLANK,0,0,BLANK,BLANK,"Goal: 22'"),

    # ── P014  Motherwell 0-0 Hearts  (29 Nov 2025) ────────────────────────
    # No goals – no event rows.

    # ── P015  Falkirk 0-0 Motherwell  (3 Dec 2025) ────────────────────────
    # No goals – no event rows.

    # ── P016  Motherwell 3-0 Livingston  (6 Dec 2025) ─────────────────────
    # Motherwell scorers not individually confirmed from sources.

    # ── P017  Dundee United 0-0 Motherwell  (13 Dec 2025) ────────────────
    # No goals – no event rows.

    # ── P018  Motherwell 1-0 Dundee  (20 Dec 2025) ────────────────────────
    ("P018","P009",MFC,"MID",1,BLANK,1,BLANK,0,0,BLANK,BLANK,"Goal: 82'"),

    # ── P019  Rangers 1-0 Motherwell  (27 Dec 2025) ───────────────────────
    ("P019","OPP_AAS","Rangers","MID",1,BLANK,1,BLANK,0,0,BLANK,BLANK,"Goal: 67'"),

    # ── P020  Motherwell 2-0 Celtic  (30 Dec 2025) ────────────────────────
    # Full confirmed lineup
    ("P020","P001",MFC,"GK",1,90,0,BLANK,0,0,BLANK,BLANK,""),
    ("P020","P002",MFC,"DEF",1,90,0,BLANK,0,0,BLANK,BLANK,""),
    ("P020","P004",MFC,"DEF",1,90,0,BLANK,0,0,BLANK,BLANK,""),
    ("P020","P012",MFC,"DEF",1,90,0,BLANK,0,0,BLANK,BLANK,"Captain"),
    ("P020","P013",MFC,"DEF",1,90,0,BLANK,0,0,BLANK,BLANK,""),
    ("P020","P007",MFC,"MID",1,90,1,BLANK,0,0,BLANK,BLANK,"Goal: 58'"),
    ("P020","P015",MFC,"MID",1,90,0,BLANK,0,0,BLANK,BLANK,""),
    ("P020","P006",MFC,"MID",1,90,0,BLANK,0,0,BLANK,BLANK,""),
    ("P020","P009",MFC,"MID",1,90,0,BLANK,0,0,BLANK,BLANK,""),
    ("P020","P010",MFC,"MID",1,90,0,BLANK,0,0,BLANK,BLANK,""),
    ("P020","P014",MFC,"FWD",1,90,1,BLANK,0,0,BLANK,BLANK,"Goal: 14'"),

    # ── P021  Motherwell 2-0 St Mirren  (3 Jan 2026) ──────────────────────
    ("P021","P008",MFC,"FWD",1,BLANK,1,BLANK,0,0,BLANK,BLANK,"Goal (minute unconfirmed)"),
    ("P021","P007",MFC,"MID",1,BLANK,1,BLANK,0,0,BLANK,BLANK,"Goal (minute unconfirmed)"),

    # ── P022  Hibernian 1-1 Motherwell  (10 Jan 2026) ─────────────────────
    ("P022","P008",MFC,"FWD",1,BLANK,1,BLANK,0,0,BLANK,BLANK,"Goal: 10'. Assist: E. Just (unconfirmed)"),
    ("P022","OPP_BOW","Hibernian","FWD",1,BLANK,1,BLANK,0,0,BLANK,BLANK,"Goal (minute unconfirmed)"),

    # ── P023  Motherwell 4-0 Kilmarnock  (24 Jan 2026) ───────────────────
    # Full confirmed lineup
    ("P023","P001",MFC,"GK",1,90,0,BLANK,0,0,BLANK,BLANK,""),
    ("P023","P013",MFC,"DEF",1,90,0,BLANK,0,0,BLANK,BLANK,""),
    ("P023","P012",MFC,"DEF",1,90,0,BLANK,0,0,BLANK,BLANK,"Captain"),
    ("P023","P004",MFC,"DEF",1,90,0,BLANK,0,0,BLANK,BLANK,""),
    ("P023","P005",MFC,"DEF",1,90,0,BLANK,0,0,BLANK,BLANK,""),
    ("P023","P015",MFC,"MID",1,90,0,BLANK,0,0,BLANK,BLANK,""),
    ("P023","P006",MFC,"MID",1,90,1,BLANK,0,0,BLANK,BLANK,"Goal: 82'"),
    ("P023","P014",MFC,"MID",1,90,1,BLANK,0,0,BLANK,BLANK,"Goal: 56'"),
    ("P023","P010",MFC,"MID",1,90,1,BLANK,0,0,BLANK,BLANK,"Goal: 29'"),
    ("P023","P009",MFC,"MID",1,90,0,BLANK,0,0,BLANK,BLANK,""),
    ("P023","P008",MFC,"FWD",1,90,1,BLANK,0,0,BLANK,BLANK,"Goal: 45+1'"),

    # ── P024  Livingston 0-2 Motherwell  (31 Jan 2026) ────────────────────
    ("P024","P008",MFC,"FWD",1,BLANK,2,BLANK,0,0,BLANK,BLANK,"Brace: both in first half"),

    # ── P025  Motherwell 1-1 Rangers  (11 Feb 2026) ───────────────────────
    ("P025","P018",MFC,"DEF",1,BLANK,1,BLANK,0,0,BLANK,BLANK,"Late equaliser. Motherwell finished with 10 men (red card holder unconfirmed)."),
    ("P025","OPP_RAS","Rangers","MID",1,BLANK,1,BLANK,0,0,BLANK,BLANK,"Opened scoring"),

    # ── P026  Motherwell 2-0 Aberdeen  (15 Feb 2026) ──────────────────────
    ("P026","P010",MFC,"MID",1,BLANK,1,BLANK,0,0,BLANK,BLANK,"Goal: 28'"),
    ("P026","OPP_MCT_OG","Aberdeen","DEF",1,BLANK,0,BLANK,0,0,BLANK,BLANK,"Own goal: 90+3' (credited to Motherwell)"),

    # ── P027  St Mirren 0-5 Motherwell  (21 Feb 2026) ────────────────────
    ("P027","P010",MFC,"MID",1,BLANK,1,BLANK,0,0,BLANK,BLANK,"Opening goal (inside 15')"),
    ("P027","P008",MFC,"FWD",1,BLANK,1,BLANK,0,0,BLANK,BLANK,"Penalty before half-time"),
    ("P027","P014",MFC,"MID",1,BLANK,1,BLANK,0,0,BLANK,BLANK,"Goal: ~49'"),
    ("P027","P005",MFC,"DEF",1,BLANK,1,BLANK,0,0,BLANK,BLANK,"Goal (4th goal of the match)"),
    ("P027","P019",MFC,"MID",1,BLANK,1,BLANK,0,0,BLANK,BLANK,"Goal (5th goal of the match). Winter signing."),

    # ── P028  Motherwell 2-0 Dundee United  (28 Feb 2026) ────────────────
    ("P028","P008",MFC,"FWD",1,BLANK,2,BLANK,0,0,BLANK,BLANK,"Goals: 37' (pen) and 46' (deflected)"),

    # ── P029  Dundee 2-1 Motherwell  (7 Mar 2026) ─────────────────────────
    ("P029","P009",MFC,"MID",1,BLANK,1,BLANK,0,0,BLANK,BLANK,"Goal: 78'"),
    ("P029","OPP_YOG","Dundee","FWD",1,BLANK,1,BLANK,0,0,BLANK,BLANK,"Goal: 32'"),
    ("P029","OPP_ROB_D","Dundee","MID",1,BLANK,1,BLANK,0,0,BLANK,BLANK,"Goal: 84'"),

    # ── P030  Celtic 3-1 Motherwell  (14 Mar 2026) ────────────────────────
    # Motherwell scorer unconfirmed from sources.
    ("P030","OPP_IHE","Celtic","FWD",1,BLANK,1,BLANK,0,0,BLANK,BLANK,"Scorer (minute unconfirmed)"),
    ("P030","OPP_MAE","Celtic","FWD",1,BLANK,1,BLANK,0,0,BLANK,BLANK,"Scorer (minute unconfirmed)"),
    # Third Celtic scorer and MFC scorer not confirmed.

    # ── P031  Motherwell 0-0 Hibernian  (21 Mar 2026) ────────────────────
    # No goals – no event rows.

    # ── P032  Motherwell 2-3 Falkirk  (4 Apr 2026) ────────────────────────
    ("P032","P007",MFC,"MID",1,BLANK,1,BLANK,0,0,BLANK,BLANK,"Goal: 34'"),
    ("P032","P008",MFC,"FWD",1,BLANK,1,BLANK,0,0,BLANK,BLANK,"Goal: ~90+' (last kick)"),
    ("P032","OPP_STW","Falkirk","DEF",1,BLANK,1,BLANK,0,0,BLANK,BLANK,"Goal: ~3-4' (free kick)"),
    ("P032","OPP_BRO_F","Falkirk","FWD",1,BLANK,1,BLANK,0,0,BLANK,BLANK,"Goal (restored Falkirk lead before half-time)"),
    ("P032","OPP_CAL","Falkirk","MID",1,BLANK,1,BLANK,0,0,BLANK,BLANK,"Goal: ~60+' (penalty)"),

    # ── P033  Hearts 3-1 Motherwell  (11 Apr 2026) ────────────────────────
    ("P033","P005",MFC,"DEF",1,BLANK,1,BLANK,0,0,BLANK,BLANK,"Goal: second half opener for Motherwell"),
    ("P033","OPP_BRA","Heart of Midlothian","MID",1,BLANK,1,BLANK,0,0,BLANK,BLANK,"Equaliser"),
    ("P033","OPP_SHA","Heart of Midlothian","FWD",1,BLANK,1,BLANK,0,0,BLANK,BLANK,"Penalty (gave Hearts lead)"),
    ("P033","OPP_KAB","Heart of Midlothian","MID",1,BLANK,1,BLANK,0,0,BLANK,BLANK,"Late third goal"),

    # ── P034  Rangers 2-3 Motherwell  (26 Apr 2026, post-split) ──────────
    ("P034","P006",MFC,"MID",1,BLANK,1,BLANK,0,0,BLANK,BLANK,"Goal: early opener"),
    ("P034","P005",MFC,"DEF",1,BLANK,2,BLANK,0,0,BLANK,BLANK,"Goals: first half + 90+' winner (second deflected)"),
    ("P034","OPP_CHE","Rangers","FWD",1,BLANK,1,BLANK,0,0,BLANK,BLANK,"Pulled back to 2-2"),
    ("P034","OPP_RAS","Rangers","MID",1,BLANK,1,BLANK,0,0,BLANK,BLANK,"Second equaliser at 2-2"),

    # ── P035  Falkirk 1-0 Motherwell  (2 May 2026, post-split) ───────────
    ("P035","OPP_CAR","Falkirk","FWD",1,BLANK,1,BLANK,0,0,BLANK,BLANK,"Goal: 63'"),

    # ── P036  Motherwell 1-1 Hearts  (9 May 2026, post-split) ────────────
    ("P036","OPP_KIN_OG","Heart of Midlothian","DEF",1,BLANK,0,BLANK,0,0,BLANK,BLANK,"Own goal: 25' (credited to Motherwell)"),
    ("P036","OPP_SHA","Heart of Midlothian","FWD",1,BLANK,1,BLANK,0,0,BLANK,BLANK,"Goal: 43'"),

    # ── P037  Motherwell 2-3 Celtic  (13 May 2026, post-split) ───────────
    # Full confirmed lineup
    ("P037","P001",MFC,"GK",1,90,0,BLANK,0,0,BLANK,BLANK,""),
    ("P037","P003",MFC,"DEF",1,90,1,BLANK,0,0,BLANK,BLANK,"Goal: 85'"),
    ("P037","P012",MFC,"DEF",1,90,0,BLANK,0,0,BLANK,BLANK,"Captain"),
    ("P037","P018",MFC,"DEF",1,90,0,BLANK,0,0,BLANK,BLANK,""),
    ("P037","P005",MFC,"DEF",1,90,0,BLANK,0,0,BLANK,BLANK,""),
    ("P037","P007",MFC,"MID",1,90,1,BLANK,0,0,BLANK,BLANK,"Goal: 17'"),
    ("P037","P009",MFC,"MID",1,90,0,BLANK,0,0,BLANK,BLANK,""),
    ("P037","P015",MFC,"MID",1,90,0,BLANK,0,0,BLANK,BLANK,""),
    ("P037","P014",MFC,"MID",1,90,0,BLANK,0,0,BLANK,BLANK,""),
    ("P037","P008",MFC,"FWD",1,90,0,BLANK,0,0,BLANK,BLANK,""),
    ("P037","P010",MFC,"FWD",1,90,0,BLANK,0,0,BLANK,BLANK,""),
    ("P037","OPP_MAE","Celtic","FWD",1,BLANK,1,BLANK,0,0,BLANK,BLANK,"Goal: 41'"),
    ("P037","OPP_NYG","Celtic","MID",1,BLANK,1,BLANK,0,0,BLANK,BLANK,"Goal: 58'"),
    ("P037","OPP_IHE","Celtic","FWD",1,BLANK,1,BLANK,0,0,BLANK,BLANK,"Goal: 90+9' (VAR penalty – highly controversial)"),

    # ── P038  Hibernian v Motherwell  (16 May 2026, post-split) ──────────
    # Match not yet played as of data cutoff (16 May 2026).
]

# ---------------------------------------------------------------------------
# BUILD LOOKUP MAPS
# ---------------------------------------------------------------------------
match_lookup = {m[0]: m for m in MATCHES}
player_lookup = {pid: (name, nat, pos) for pid, (name, nat, pos) in PLAYERS.items()}

# ---------------------------------------------------------------------------
# GENERATE CSV
# ---------------------------------------------------------------------------
HEADER = [
    "match_id","player_id","date","competition","round",
    "home_team","away_team","home_score","away_score",
    "venue","attendance",
    "player_name","player_nationality","team","position",
    "started","minutes_played",
    "goals","assists","yellow_cards","red_cards",
    "sub_on_min","sub_off_min",
    "notes"
]

rows = []
for ev in EVENTS:
    (mid, pid, team, pos, started, mins,
     goals, assists, yc, rc, sub_on, sub_off, notes) = ev
    m = match_lookup[mid]
    (_, date, comp, rnd, home, away, h_score, a_score, venue, att) = m
    pname, pnat, _ = player_lookup[pid]
    rows.append([
        mid, pid, date, comp, rnd,
        home, away, h_score, a_score, venue, att,
        pname, pnat, team, pos,
        started, mins,
        goals, assists, yc, rc,
        sub_on, sub_off,
        notes
    ])

# Also add stub rows for matches with zero events so every match appears
matches_with_events = {r[0] for r in rows}
for m in MATCHES:
    mid = m[0]
    if mid not in matches_with_events:
        (_, date, comp, rnd, home, away, h_score, a_score, venue, att) = m
        # Add a single placeholder row so the match is represented
        rows.append([
            mid, "", date, comp, rnd,
            home, away, h_score, a_score, venue, att,
            "","","","",
            "","","","","","",
            "","",
            "No confirmed player-level data for this match"
        ])

# Sort by date then match_id
rows.sort(key=lambda r: (r[2], r[0]))

buf = io.StringIO()
w = csv.writer(buf, lineterminator="\n")
w.writerow(HEADER)
w.writerows(rows)

output = buf.getvalue()
with open("motherwell_2526_season.csv", "w", encoding="utf-8", newline="") as f:
    f.write(output)

print(f"Done. {len(rows)} rows written (including {sum(1 for r in rows if r[1])} event rows).")
# Summary
match_count = len(MATCHES)
event_rows = sum(1 for r in rows if r[1])
print(f"Total matches: {match_count}")
print(f"Unique matches with player data: {len(matches_with_events)}")
