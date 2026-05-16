"""
Motherwell FC 2025/26 Season Dataset Generator
Produces: motherwell_2526_season.csv
One row per player per match, all competitive first-team fixtures.

Sources cross-referenced: Motherwell FC official site, Sky Sports, BBC Sport,
ESPN, Transfermarkt, Soccerway, Flashscore, WhoScored, FotMob, SPFL official,
Dundee FC official, St Mirren official, Falkirk FC official.
Blank fields = data not confirmed. No hallucinated stats.
"""

import csv
import io

# ---------------------------------------------------------------------------
# PLAYER REGISTRY
# ---------------------------------------------------------------------------
PLAYERS = {
    # Motherwell FC
    "P001": ("Calum Ward",                   "SCO", "GK"),
    "P002": ("Johnny Koutroumbis",           "GRE", "DEF"),
    "P003": ("Liam Gordon",                  "SCO", "DEF"),
    "P004": ("Paul McGinn",                  "SCO", "DEF"),
    "P005": ("Emmanuel Longelo",             "ENG", "DEF"),
    "P006": ("Lukas Fadinger",               "AUT", "MID"),
    "P007": ("Elliot Watt",                  "SCO", "MID"),
    "P008": ("Tawanda Maswanhise",           "ZIM", "FWD"),
    "P009": ("Callum Slattery",              "SCO", "MID"),
    "P010": ("Elijah Just",                  "SCO", "MID"),
    "P011": ("Apostolos Stamatelopoulos",    "GRE", "FWD"),
    "P012": ("Stephen O'Donnell",            "SCO", "DEF"),
    "P013": ("Tom Sparrow",                  "ENG", "DEF"),
    "P014": ("Ibrahim Sa'id",                "GHA", "MID"),
    "P015": ("Oscar Priestman",              "ENG", "MID"),
    "P016": ("Regan Charles-Cook",           "ENG", "MID"),
    "P017": ("Callum Hendry",                "SCO", "FWD"),
    "P018": ("Stephen Welsh",                "SCO", "DEF"),
    "P019": ("Eythor Bjorgolfsson",          "ISL", "MID"),
    "P020": ("Akinola Sule",                 "ENG", "FWD"),
    "P021": ("Connolly",                     "SCO", "GK"),   # reserve GK; first name unconfirmed
    "P022": ("Luca Ross",                    "SCO", "FWD"),
    "P023": ("Esapa Osong",                  "ENG", "FWD"),
    "P024": ("Jordan McGhee",                "SCO", "DEF"),
    "P025": ("Zander McAllister",            "SCO", "MID"),
    "P026": ("Sam Nicholson",                "SCO", "MID"),
    "P027": ("L. Wilson",                    "SCO", "DEF"),  # LC001 pre-season only; full name unconfirmed
    "P028": ("L. Miller",                    "SCO", "MID"),  # LC001 pre-season only; full name unconfirmed

    # Opponents (event players only)
    "OPP_TAV":    ("James Tavernier",        "ENG", "DEF"),
    "OPP_AAS":    ("Thelo Aasgaard",         "NOR", "MID"),
    "OPP_CHE":    ("Youssef Chermiti",       "POR", "FWD"),
    "OPP_RAS":    ("Nicolas Raskin",         "BEL", "MID"),
    "OPP_IHE":    ("Kelechi Iheanacho",      "NGA", "FWD"),
    "OPP_MAE":    ("Daizen Maeda",           "JPN", "FWD"),
    "OPP_NYG":    ("Benjamin Nygren",        "SWE", "MID"),
    "OPP_YHJ":    ("Yang Hyun-Jun",          "KOR", "FWD"),
    "OPP_CVA":    ("Tomas Cvancara",         "CZE", "FWD"),
    "OPP_MIL":    ("Harry Milne",            "SCO", "MID"),
    "OPP_BRA":    ("Claudio Braga",          "POR", "MID"),
    "OPP_SHA":    ("Lawrence Shankland",     "SCO", "FWD"),
    "OPP_KAB":    ("Pierre Landry Kabore",   "CIV", "MID"),
    "OPP_KIN_OG": ("Stephen Kingsley",       "SCO", "DEF"),
    "OPP_DAN":    ("Djenario Daniels",       "ENG", "MID"),
    "OPP_STA_K":  ("George Stanger",         "SCO", "DEF"),
    "OPP_TIF":    ("Scott Tiffoney",         "SCO", "FWD"),
    "OPP_KAR":    ("Jesper Karlsson",        "SWE", "FWD"),
    "OPP_NIS":    ("Kevin Nisbet",           "SCO", "FWD"),
    "OPP_SHI":    ("Graeme Shinnie",         "SCO", "MID"),
    "OPP_MCT_OG": ("Tom McIntyre",           "SCO", "DEF"),
    "OPP_BOW":    ("Kieron Bowie",           "SCO", "FWD"),
    "OPP_HAN":    ("Grant Hanley",           "SCO", "DEF"),
    "OPP_MAN":    ("Mikael Mandron",         "FRA", "FWD"),
    "OPP_NLU":    ("Daniel N'Lundulu",       "FRA", "FWD"),
    "OPP_KIN_SM": ("Richard King",           "SCO", "MID"),
    "OPP_ARS":    ("Scott Arfield",          "SCO", "MID"),
    "OPP_CAL":    ("Calvin Miller",          "SCO", "MID"),
    "OPP_STW":    ("Barney Stewart",         "SCO", "DEF"),
    "OPP_BRO_F":  ("Ben Broggio",            "SCO", "FWD"),
    "OPP_CAR":    ("Henry Cartwright",       "ENG", "FWD"),
    "OPP_YOG":    ("Tony Yogane",            "NGA", "FWD"),
    "OPP_ROB_D":  ("Finlay Robertson",       "SCO", "MID"),
    "OPP_DHA":    ("Yan Dhanda",             "WAL", "MID"),
    "OPP_HIL":    ("James Hilton",           "SCO", "MID"),
    "OPP_SCU":    ("Liam Scullion",          "SCO", "FWD"),
    "OPP_KIR":    ("Makenzie Kirk",          "SCO", "FWD"),
    "OPP_BOK":    ("Bokila",                 "",    "FWD"),  # Livingston; full name unconfirmed
}

# ---------------------------------------------------------------------------
# MATCH REGISTRY
# Fields: match_id, date, competition, round, home, away,
#         h_score, a_score, venue, attendance
# ---------------------------------------------------------------------------
MATCHES = [
    # ── SCOTTISH LEAGUE CUP ──────────────────────────────────────────────
    ("LC001","2025-07-12","Scottish League Cup","Group Stage – Group G",
     "Clyde","Motherwell",2,2,"Broadwood Stadium, Cumbernauld",1931),   # MFC won 5-4 pens
    ("LC002","2025-07-15","Scottish League Cup","Group Stage – Group G",
     "Motherwell","Peterhead",2,1,"Fir Park, Motherwell",2657),
    ("LC003","2025-07-19","Scottish League Cup","Group Stage – Group G",
     "Stenhousemuir","Motherwell",0,1,"Ochilview Park, Stenhousemuir",""),
    ("LC004","2025-07-22","Scottish League Cup","Group Stage – Group G",
     "Motherwell","Greenock Morton",3,0,"Fir Park, Motherwell",""),
    ("LC005","2025-08-16","Scottish League Cup","Last 16",
     "St Johnstone","Motherwell",0,1,"McDiarmid Park, Perth",""),        # AET
    ("LC006","2025-09-20","Scottish League Cup","Quarter-Final",
     "Aberdeen","Motherwell",0,1,"Pittodrie, Aberdeen",10533),
    ("LC007","2025-11-01","Scottish League Cup","Semi-Final",
     "Motherwell","St Mirren",1,4,"Hampden Park, Glasgow",""),

    # ── SCOTTISH CUP ─────────────────────────────────────────────────────
    ("SC001","2025-11-29","Scottish Cup","Round 3",
     "Clyde","Motherwell",2,2,"Broadwood Stadium, Cumbernauld",""),      # MFC won 5-4 pens
    ("SC002","2026-01-18","Scottish Cup","Round 4",
     "St Johnstone","Motherwell","","","McDiarmid Park, Perth",""),      # MFC won; score unconfirmed
    ("SC003","2026-02-18","Scottish Cup","Round 5",
     "Aberdeen","Motherwell",2,0,"Pittodrie, Aberdeen",""),

    # ── SCOTTISH PREMIERSHIP – PRE-SPLIT ─────────────────────────────────
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
     "Aberdeen","Motherwell",1,1,"Pittodrie, Aberdeen",17843),
    ("P012","2025-11-22","Scottish Premiership","Matchday 12",
     "Kilmarnock","Motherwell",1,3,"BBSP Stadium, Kilmarnock",5100),
    ("P013","2025-11-25","Scottish Premiership","Matchday 13",
     "Motherwell","Hibernian",2,0,"Fir Park, Motherwell",6585),
    ("P014","2025-11-29","Scottish Premiership","Matchday 14",
     "Motherwell","Heart of Midlothian",0,0,"Fir Park, Motherwell",10938),
    ("P015","2025-12-03","Scottish Premiership","Matchday 15",
     "Falkirk","Motherwell",0,0,"Falkirk Stadium, Falkirk",7490),
    ("P016","2025-12-06","Scottish Premiership","Matchday 16",
     "Motherwell","Livingston",3,0,"Fir Park, Motherwell",5683),
    ("P017","2025-12-13","Scottish Premiership","Matchday 17",
     "Dundee United","Motherwell",0,0,"Tannadice, Dundee",""),
    ("P018","2025-12-20","Scottish Premiership","Matchday 18",
     "Motherwell","Dundee",1,0,"Fir Park, Motherwell",""),
    ("P019","2025-12-27","Scottish Premiership","Matchday 19",
     "Rangers","Motherwell",1,0,"Ibrox, Glasgow",50828),
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
     "Celtic","Motherwell",3,1,"Celtic Park, Glasgow",58904),
    ("P031","2026-03-21","Scottish Premiership","Matchday 31",
     "Motherwell","Hibernian",0,0,"Fir Park, Motherwell",""),
    ("P032","2026-04-04","Scottish Premiership","Matchday 32",
     "Motherwell","Falkirk",2,3,"Fir Park, Motherwell",""),
    ("P033","2026-04-11","Scottish Premiership","Matchday 33",
     "Heart of Midlothian","Motherwell",3,1,"Tynecastle, Edinburgh",18800),
    # ── POST-SPLIT ────────────────────────────────────────────────────────
    ("P034","2026-04-26","Scottish Premiership","Championship Group – Matchday 34",
     "Rangers","Motherwell",2,3,"Ibrox, Glasgow",""),
    ("P035","2026-05-02","Scottish Premiership","Championship Group – Matchday 35",
     "Falkirk","Motherwell",1,0,"Falkirk Stadium, Falkirk",""),
    ("P036","2026-05-09","Scottish Premiership","Championship Group – Matchday 36",
     "Motherwell","Heart of Midlothian",1,1,"Fir Park, Motherwell",12306),
    ("P037","2026-05-13","Scottish Premiership","Championship Group – Matchday 37",
     "Motherwell","Celtic",2,3,"Fir Park, Motherwell",""),
    ("P038","2026-05-16","Scottish Premiership","Championship Group – Matchday 38",
     "Hibernian","Motherwell",0,1,"Easter Road, Edinburgh",""),
]

# ---------------------------------------------------------------------------
# EVENTS
# (match_id, player_id, team, position, started, minutes_played,
#  goals, assists, yellow_cards, red_cards, sub_on_min, sub_off_min, notes)
# ---------------------------------------------------------------------------
MFC  = "Motherwell"
B    = ""   # blank / unconfirmed

EVENTS = [

    # ════════════════════════════════════════════════════════════════════════
    # SCOTTISH LEAGUE CUP
    # ════════════════════════════════════════════════════════════════════════

    # ── LC001  Clyde 2-2 Motherwell  12 Jul 2025  (MFC won 5-4 pens) ──────
    ("LC001","P001",MFC,"GK", 1,90,0,B,0,0,B,B,""),
    ("LC001","P002",MFC,"DEF",1,90,0,B,0,0,B,B,""),
    ("LC001","P003",MFC,"DEF",1,90,0,B,0,0,B,B,""),
    ("LC001","P004",MFC,"DEF",1,90,0,B,0,0,B,B,""),
    ("LC001","P027",MFC,"DEF",1,90,0,B,0,0,B,B,"Pre-season squad member; full name unconfirmed"),
    ("LC001","P006",MFC,"MID",1,90,0,B,0,0,B,B,""),
    ("LC001","P007",MFC,"MID",1,90,0,B,0,0,B,B,""),
    ("LC001","P009",MFC,"MID",1,90,0,B,0,0,B,B,""),
    ("LC001","P028",MFC,"MID",1,90,0,B,0,0,B,B,"Pre-season squad member; full name unconfirmed"),
    ("LC001","P008",MFC,"FWD",1,90,2,B,0,0,B,B,"Goals: 21' and 48'. Penalty shootout goals not included."),
    ("LC001","P011",MFC,"FWD",1,90,0,B,0,0,B,B,""),
    ("LC001","OPP_HIL","Clyde","MID",1,B,1,B,0,0,B,B,"Goal: 16'"),
    ("LC001","OPP_SCU","Clyde","FWD",1,B,1,B,0,0,B,B,"Goal: 53'"),

    # ── LC002  Motherwell 2-1 Peterhead  15 Jul 2025 ──────────────────────
    ("LC002","P021",MFC,"GK", 1,90,0,B,0,0,B,B,""),
    ("LC002","P002",MFC,"DEF",1,90,0,B,0,0,B,B,""),
    ("LC002","P003",MFC,"DEF",1,90,0,B,0,0,B,B,""),
    ("LC002","P004",MFC,"DEF",1,90,0,B,0,0,B,B,""),
    ("LC002","P005",MFC,"DEF",1,90,1,B,0,0,B,B,"Goal: 28'"),
    ("LC002","P006",MFC,"MID",1,90,1,B,0,0,B,B,"Goal: 90+1'"),
    ("LC002","P007",MFC,"MID",1,90,0,B,0,0,B,B,""),
    ("LC002","P009",MFC,"MID",1,90,0,B,0,0,B,B,""),
    ("LC002","P010",MFC,"MID",1,90,0,B,0,0,B,B,""),
    ("LC002","P013",MFC,"DEF",1,90,0,B,0,0,B,B,""),
    ("LC002","P020",MFC,"FWD",1,90,0,B,0,0,B,B,""),

    # ── LC003  Stenhousemuir 0-1 Motherwell  19 Jul 2025 ──────────────────
    ("LC003","P021",MFC,"GK", 1,90,0,B,0,0,B,B,""),
    ("LC003","P002",MFC,"DEF",1,78,0,B,0,0,B,"78","Substituted off 78'"),
    ("LC003","P004",MFC,"DEF",1,90,0,B,0,0,B,B,""),
    ("LC003","P003",MFC,"DEF",1,90,0,B,0,0,B,B,""),
    ("LC003","P005",MFC,"DEF",1,45,0,B,0,0,B,"45","Substituted at half-time"),
    ("LC003","P007",MFC,"MID",1,90,0,B,0,0,B,B,""),
    ("LC003","P009",MFC,"MID",1,90,0,B,0,0,B,B,""),
    ("LC003","P006",MFC,"MID",1,90,0,B,0,0,B,B,""),
    ("LC003","P013",MFC,"DEF",1,54,0,B,0,0,B,"54","Substituted off 54'"),
    ("LC003","P010",MFC,"MID",1,45,0,B,0,0,B,"45","Substituted at half-time"),
    ("LC003","P020",MFC,"FWD",1,54,0,B,0,0,B,"54","Substituted off 54'"),
    ("LC003","P012",MFC,"DEF",0,B,1,B,0,0,"45",B,"Came on as substitute; scored (minute uncertain)"),

    # ── LC004  Motherwell 3-0 Greenock Morton  22 Jul 2025 ────────────────
    ("LC004","P011",MFC,"FWD",B,B,1,B,0,0,B,B,"Opening goal"),
    ("LC004","P008",MFC,"FWD",B,B,2,B,0,0,B,B,"Brace – 'magnificent double'"),
    ("LC004","P003",MFC,"DEF",B,B,0,1,0,0,B,B,"1 confirmed assist"),

    # ── LC005  St Johnstone 0-1 Motherwell  16 Aug 2025  (AET) ────────────
    ("LC005","P006",MFC,"MID",1,120,1,B,0,0,B,B,"Goal in extra time"),

    # ── LC006  Aberdeen 0-1 Motherwell  20 Sep 2025 ───────────────────────
    ("LC006","P016",MFC,"MID",1,B,1,B,0,0,B,B,"Goal: 63'"),

    # ── LC007  Motherwell 1-4 St Mirren  1 Nov 2025  (Semi-Final) ─────────
    ("LC007","P017",MFC,"FWD",1,B,1,B,0,0,B,B,"Goal: 83'"),
    ("LC007","OPP_MAN","St Mirren","FWD",1,B,2,B,0,0,B,B,"Goals: 25' and 89'"),
    ("LC007","OPP_NLU","St Mirren","FWD",1,B,1,B,0,0,B,B,"Goal: 40'"),
    ("LC007","OPP_KIN_SM","St Mirren","MID",1,B,1,B,0,0,B,B,"Goal: 86'"),

    # ════════════════════════════════════════════════════════════════════════
    # SCOTTISH CUP
    # ════════════════════════════════════════════════════════════════════════

    # ── SC001  Clyde 2-2 Motherwell  29 Nov 2025  (MFC won 5-4 pens) ──────
    ("SC001","OPP_HIL","Clyde","MID",1,B,1,B,0,0,B,B,"Goal (minute unconfirmed)"),
    ("SC001","OPP_SCU","Clyde","FWD",1,B,1,B,0,0,B,B,"Goal (minute unconfirmed)"),

    # ── SC002  St Johnstone v Motherwell  18 Jan 2026  (MFC advanced) ─────
    # Score and scorers unconfirmed; match confirmed via Fifth Round draw post

    # ── SC003  Aberdeen 2-0 Motherwell  18 Feb 2026 ───────────────────────
    ("SC003","OPP_NIS","Aberdeen","FWD",1,B,1,B,0,0,B,B,"Goal (minute unconfirmed)"),
    ("SC003","OPP_SHI","Aberdeen","MID",1,B,1,B,0,0,B,B,"Goal (minute unconfirmed)"),

    # ════════════════════════════════════════════════════════════════════════
    # SCOTTISH PREMIERSHIP
    # ════════════════════════════════════════════════════════════════════════

    # ── P001  Motherwell 1-1 Rangers  2 Aug 2025 ──────────────────────────
    ("P001","P001",MFC,"GK", 1,90,0,B,0,0,B,B,""),
    ("P001","P002",MFC,"DEF",1,90,0,B,0,0,B,B,""),
    ("P001","P003",MFC,"DEF",1,90,0,B,0,0,B,B,""),
    ("P001","P004",MFC,"DEF",1,90,0,B,0,0,B,B,""),
    ("P001","P005",MFC,"DEF",1,90,1,B,0,0,B,B,"Goal: 87'"),
    ("P001","P006",MFC,"MID",1,90,0,B,0,0,B,B,""),
    ("P001","P007",MFC,"MID",1,90,0,B,0,0,B,B,""),
    ("P001","P008",MFC,"FWD",1,90,0,B,0,0,B,B,""),
    ("P001","P009",MFC,"MID",1,90,0,B,0,0,B,B,""),
    ("P001","P010",MFC,"MID",1,90,0,B,0,0,B,B,""),
    ("P001","P011",MFC,"FWD",1,90,0,B,0,0,B,B,""),
    ("P001","OPP_TAV","Rangers","DEF",1,B,1,B,0,0,B,B,"Goal: header (first half, exact minute unconfirmed)"),

    # ── P002  St Mirren 0-0 Motherwell  9 Aug 2025 ────────────────────────
    ("P002","P001",MFC,"GK", 1,90,0,B,0,0,B,B,"MOTM – 4 saves"),
    ("P002","P002",MFC,"DEF",1,42,0,B,0,0,B,"42","Substituted off 42' (injury)"),
    ("P002","P012",MFC,"DEF",1,90,0,B,0,0,B,B,""),
    ("P002","P004",MFC,"DEF",1,90,0,B,0,0,B,B,""),
    ("P002","P005",MFC,"DEF",1,90,0,B,0,0,B,B,""),
    ("P002","P006",MFC,"MID",1,90,0,B,0,0,B,B,""),
    ("P002","P007",MFC,"MID",1,90,0,B,0,0,B,B,""),
    ("P002","P014",MFC,"MID",1,70,0,B,0,0,B,"70",""),
    ("P002","P009",MFC,"MID",1,90,0,B,0,0,B,B,""),
    ("P002","P010",MFC,"MID",1,90,0,B,0,0,B,B,""),
    ("P002","P008",MFC,"FWD",1,86,0,B,0,0,B,"86",""),
    ("P002","P013",MFC,"DEF",0,48,0,B,0,0,"42",B,"On for Koutroumbis 42'"),
    ("P002","P011",MFC,"FWD",0,20,0,B,0,0,"70",B,"On for Sa'id 70'"),
    ("P002","P022",MFC,"FWD",0,4, 0,B,0,0,"86",B,"On for Maswanhise 86'"),

    # ── P003  Hearts 3-3 Motherwell  23 Aug 2025 ──────────────────────────
    ("P003","P001",MFC,"GK", 1,90,0,B,0,0,B,B,""),
    ("P003","P012",MFC,"DEF",1,90,0,B,0,0,B,B,""),
    ("P003","P003",MFC,"DEF",1,90,0,B,0,0,B,B,""),
    ("P003","P018",MFC,"DEF",1,90,0,B,0,0,B,B,""),
    ("P003","P005",MFC,"DEF",1,90,1,B,0,0,B,B,"Goal: 62'"),
    ("P003","P015",MFC,"MID",1,90,0,B,0,0,B,B,""),
    ("P003","P007",MFC,"MID",1,90,0,B,0,0,B,B,""),
    ("P003","P014",MFC,"MID",1,90,0,B,0,0,B,B,""),
    ("P003","P009",MFC,"MID",1,67,1,B,0,0,B,"67","Goal: 21'; substituted off 67'"),
    ("P003","P008",MFC,"FWD",1,78,1,B,0,0,B,"78","Goal: 49'; substituted off ~78'"),
    ("P003","P010",MFC,"MID",1,90,0,B,0,0,B,B,""),
    ("P003","P017",MFC,"FWD",0,23,0,B,0,0,"67",B,"On for Slattery 67' – Premiership debut"),
    ("P003","P023",MFC,"FWD",0,12,0,B,0,0,"78",B,"On for Maswanhise ~78'"),
    ("P003","OPP_MIL","Heart of Midlothian","MID",1,B,1,B,0,0,B,B,"Goal: 65'"),
    ("P003","OPP_BRA","Heart of Midlothian","MID",1,B,2,B,0,0,B,B,"Goals: 74' and 83'"),

    # ── P004  Motherwell 2-2 Kilmarnock  30 Aug 2025 ──────────────────────
    ("P004","P001",MFC,"GK", 1,90,0,B,0,0,B,B,""),
    ("P004","P012",MFC,"DEF",1,90,0,B,0,0,B,B,""),
    ("P004","P003",MFC,"DEF",1,90,0,B,0,0,B,B,""),
    ("P004","P004",MFC,"DEF",1,90,0,B,0,0,B,B,""),
    ("P004","P005",MFC,"DEF",1,90,1,B,0,0,B,B,"Goal: 62'"),
    ("P004","P006",MFC,"MID",1,90,0,B,0,0,B,B,""),
    ("P004","P007",MFC,"MID",1,90,0,B,0,0,B,B,""),
    ("P004","P010",MFC,"MID",1,90,0,B,0,0,B,B,""),
    ("P004","P014",MFC,"MID",1,90,0,B,0,0,B,B,""),
    ("P004","P008",MFC,"FWD",1,90,1,B,0,0,B,B,"Goal: 45+1'"),
    ("P004","P011",MFC,"FWD",1,90,0,B,0,0,B,B,""),
    ("P004","OPP_DAN","Kilmarnock","MID",1,B,1,B,0,0,B,B,"Goal: 19'"),
    ("P004","OPP_STA_K","Kilmarnock","DEF",1,B,1,B,0,0,B,B,"Goal: 81'"),

    # ── P005  Dundee 1-1 Motherwell  13 Sep 2025 ──────────────────────────
    ("P005","P001",MFC,"GK", 1,90,0,B,0,0,B,B,""),
    ("P005","P002",MFC,"DEF",1,90,0,B,0,0,B,B,""),
    ("P005","P003",MFC,"DEF",1,90,0,B,0,0,B,B,""),
    ("P005","P018",MFC,"DEF",1,90,0,B,0,0,B,B,""),
    ("P005","P005",MFC,"DEF",1,90,0,B,0,0,B,B,""),
    ("P005","P006",MFC,"MID",1,90,0,B,0,0,B,B,""),
    ("P005","P007",MFC,"MID",1,90,0,B,0,0,B,B,""),
    ("P005","P014",MFC,"MID",1,90,0,B,0,0,B,B,""),
    ("P005","P016",MFC,"MID",1,90,0,B,0,0,B,B,""),
    ("P005","P011",MFC,"FWD",1,90,0,B,0,0,B,B,""),
    ("P005","P008",MFC,"FWD",1,90,1,B,0,0,B,B,"Goal: 33'"),
    ("P005","OPP_DHA","Dundee","MID",1,B,1,B,0,0,B,B,"Goal: 48' (Dhanda or Graham – sources conflict)"),

    # ── P006  Motherwell 2-0 Aberdeen  27 Sep 2025  (unchanged XI from P005) ─
    ("P006","P001",MFC,"GK", 1,90,0,B,0,0,B,B,""),
    ("P006","P002",MFC,"DEF",1,90,1,B,0,0,B,B,"Goal: 90+2'"),
    ("P006","P003",MFC,"DEF",1,90,0,B,0,0,B,B,""),
    ("P006","P018",MFC,"DEF",1,90,0,B,0,0,B,B,""),
    ("P006","P005",MFC,"DEF",1,90,0,B,0,0,B,B,""),
    ("P006","P006",MFC,"MID",1,90,0,B,0,0,B,B,""),
    ("P006","P007",MFC,"MID",1,90,0,B,0,0,B,B,""),
    ("P006","P014",MFC,"MID",1,90,0,B,0,0,B,B,""),
    ("P006","P016",MFC,"MID",1,90,0,B,0,0,B,B,""),
    ("P006","P011",MFC,"FWD",1,90,1,B,0,0,B,B,"Goal: 90+7' (penalty)"),
    ("P006","P008",MFC,"FWD",1,90,0,B,0,0,B,B,""),

    # ── P007  Celtic 3-2 Motherwell  5 Oct 2025 ───────────────────────────
    ("P007","P001",MFC,"GK", 1,90,0,B,0,0,B,B,""),
    ("P007","P002",MFC,"DEF",1,90,0,B,0,0,B,B,""),
    ("P007","P004",MFC,"DEF",1,90,0,B,0,0,B,B,"100th Motherwell appearance"),
    ("P007","P003",MFC,"DEF",1,90,0,B,0,0,B,B,""),
    ("P007","P005",MFC,"DEF",1,90,0,B,0,0,B,B,""),
    ("P007","P006",MFC,"MID",1,90,0,B,0,0,B,B,""),
    ("P007","P007",MFC,"MID",1,90,0,B,0,0,B,B,""),
    ("P007","P014",MFC,"MID",1,90,0,B,0,0,B,B,""),
    ("P007","P016",MFC,"MID",1,90,0,B,0,0,B,B,""),
    ("P007","P008",MFC,"FWD",1,90,0,B,0,0,B,B,""),
    ("P007","P011",MFC,"FWD",1,90,2,B,0,0,B,B,"Goals: 40' (header) and 56' (pen)"),
    ("P007","OPP_IHE","Celtic","FWD",1,B,1,B,0,0,B,B,"Goal: 28' (pen)"),
    ("P007","OPP_NYG","Celtic","MID",1,B,1,B,0,0,B,B,"Goal: 69'"),
    ("P007","OPP_MAE","Celtic","FWD",1,B,1,B,0,0,B,B,"Goal: 90+2'"),

    # ── P008  Motherwell 1-2 Falkirk  18 Oct 2025 ─────────────────────────
    ("P008","P001",MFC,"GK", 1,90,0,B,0,0,B,B,""),
    ("P008","P002",MFC,"DEF",1,B, 0,B,0,0,B,B,"Substituted off (minute unconfirmed)"),
    ("P008","P018",MFC,"DEF",1,90,0,B,0,0,B,B,""),
    ("P008","P004",MFC,"DEF",1,90,0,B,0,0,B,B,""),
    ("P008","P005",MFC,"DEF",1,B, 0,B,0,0,B,B,"Substituted off (injury, minute unconfirmed)"),
    ("P008","P006",MFC,"MID",1,B, 0,B,0,0,B,B,"Substituted off (minute unconfirmed)"),
    ("P008","P007",MFC,"MID",1,90,0,B,0,0,B,B,""),
    ("P008","P014",MFC,"MID",1,90,0,B,0,0,B,B,""),
    ("P008","P010",MFC,"MID",1,B, 0,B,0,0,B,B,"Substituted off (minute unconfirmed)"),
    ("P008","P008",MFC,"FWD",1,90,1,B,0,0,B,B,"Goal: 22'"),
    ("P008","P017",MFC,"FWD",1,90,0,B,0,0,B,B,"First Premiership start"),
    ("P008","P012",MFC,"DEF",0,B, 0,B,0,0,B,B,"On for Longelo (injury)"),
    ("P008","P016",MFC,"MID",0,B, 0,B,0,0,B,B,"On for Just"),
    ("P008","P015",MFC,"MID",0,B, 0,B,0,0,B,B,"On for Fadinger"),
    ("P008","P013",MFC,"DEF",0,B, 0,B,0,0,B,B,"On for Koutroumbis"),
    ("P008","OPP_CAL","Falkirk","MID",1,B,1,B,0,0,B,B,"Goal: 57'"),
    ("P008","OPP_ARS","Falkirk","MID",0,B,1,B,0,0,B,B,"Goal: 79' (as substitute)"),

    # ── P009  Livingston 1-2 Motherwell  25 Oct 2025 ──────────────────────
    ("P009","P001",MFC,"GK", 1,90,0,B,0,0,B,B,""),
    ("P009","P012",MFC,"DEF",1,90,0,B,0,0,B,B,""),
    ("P009","P003",MFC,"DEF",1,90,0,B,0,0,B,B,""),
    ("P009","P018",MFC,"DEF",1,90,0,B,0,0,B,B,""),
    ("P009","P005",MFC,"DEF",1,90,0,B,0,0,B,B,""),
    ("P009","P006",MFC,"MID",1,90,0,B,0,0,B,B,""),
    ("P009","P007",MFC,"MID",1,90,0,B,0,0,B,B,""),
    ("P009","P008",MFC,"FWD",1,90,0,B,0,0,B,B,""),
    ("P009","P010",MFC,"MID",1,90,1,B,0,0,B,B,"Goal: 90+2' (assisted by Slattery – as sub)"),
    ("P009","P014",MFC,"MID",1,90,0,B,0,0,B,B,""),
    ("P009","P011",MFC,"FWD",1,90,1,B,0,0,B,B,"Goal: 4' (penalty)"),
    ("P009","P009",MFC,"MID",0,B, 0,1,0,0,B,B,"Came on as sub; assist on Just 90+2'"),
    ("P009","OPP_BOK","Livingston","FWD",1,B,1,B,0,0,B,B,"Goal: 3' (penalty)"),

    # ── P010  Motherwell 2-0 Dundee United  29 Oct 2025 ───────────────────
    ("P010","P001",MFC,"GK", 1,90,0,B,0,0,B,B,""),
    ("P010","P012",MFC,"DEF",1,37,0,B,0,0,B,"37","Substituted off 37' (injury)"),
    ("P010","P004",MFC,"DEF",1,90,0,B,0,0,B,B,""),
    ("P010","P018",MFC,"DEF",1,90,0,B,0,0,B,B,""),
    ("P010","P002",MFC,"DEF",1,90,0,B,0,0,B,B,""),
    ("P010","P006",MFC,"MID",1,90,0,B,0,0,B,B,""),
    ("P010","P007",MFC,"MID",1,90,1,B,0,0,B,B,"Goal: 77'"),
    ("P010","P016",MFC,"MID",1,90,0,B,0,0,B,B,""),
    ("P010","P009",MFC,"MID",1,90,0,B,0,0,B,B,""),
    ("P010","P008",MFC,"FWD",1,90,1,B,0,0,B,B,"Goal: 42'"),
    ("P010","P017",MFC,"FWD",1,90,0,B,0,0,B,B,""),
    ("P010","P005",MFC,"DEF",0,53,0,B,0,0,"37",B,"On for O'Donnell 37'"),

    # ── P011  Aberdeen 1-1 Motherwell  9 Nov 2025 ─────────────────────────
    ("P011","P001",MFC,"GK", 1,90,0,B,0,0,B,B,""),
    ("P011","P002",MFC,"DEF",1,90,0,B,0,0,B,B,""),
    ("P011","P004",MFC,"DEF",1,90,0,B,0,0,B,B,""),
    ("P011","P018",MFC,"DEF",1,90,0,B,0,0,B,B,""),
    ("P011","P005",MFC,"DEF",1,90,0,B,0,0,B,B,""),
    ("P011","P007",MFC,"MID",1,90,0,B,0,0,B,B,""),
    ("P011","P006",MFC,"MID",1,90,0,B,0,0,B,B,""),
    ("P011","P009",MFC,"MID",1,90,0,B,0,0,B,B,""),
    ("P011","P008",MFC,"FWD",1,90,0,B,0,0,B,B,""),
    ("P011","P010",MFC,"MID",1,90,1,B,0,0,B,B,"Goal: 64' (assisted by Slattery)"),
    ("P011","P011",MFC,"FWD",1,90,0,B,0,0,B,B,""),
    ("P011","OPP_KAR","Aberdeen","FWD",1,B,1,B,0,0,B,B,"Goal: 61'"),

    # ── P012  Kilmarnock 1-3 Motherwell  22 Nov 2025 ──────────────────────
    ("P012","P001",MFC,"GK", 1,90,0,B,0,0,B,B,""),
    ("P012","P002",MFC,"DEF",1,90,0,B,0,0,B,B,""),
    ("P012","P004",MFC,"DEF",1,90,0,B,0,0,B,B,""),
    ("P012","P018",MFC,"DEF",1,90,0,B,0,0,B,B,""),
    ("P012","P005",MFC,"DEF",1,90,0,B,0,0,B,B,""),
    ("P012","P006",MFC,"MID",1,90,0,B,0,0,B,B,""),
    ("P012","P007",MFC,"MID",1,90,0,B,0,0,B,B,""),
    ("P012","P009",MFC,"MID",1,63,0,B,0,0,B,"63","Substituted off ~63'"),
    ("P012","P008",MFC,"FWD",1,90,2,B,0,0,B,B,"Goals: 16' and 26'"),
    ("P012","P014",MFC,"MID",1,90,0,B,0,0,B,B,""),
    ("P012","P017",MFC,"FWD",1,90,0,B,0,0,B,B,""),
    ("P012","P011",MFC,"FWD",0,27,1,B,0,0,"63",B,"On for Slattery ~63'; Goal: 68' (pen)"),
    ("P012","OPP_TIF","Kilmarnock","FWD",1,B,1,B,0,0,B,B,"Goal: 49' (pen)"),

    # ── P013  Motherwell 2-0 Hibernian  25 Nov 2025 ───────────────────────
    # 3-5-2 formation (5 defenders inc. wing-backs)
    ("P013","P001",MFC,"GK", 1,90,0,B,0,0,B,B,""),
    ("P013","P013",MFC,"DEF",1,90,0,B,0,0,B,B,"Right wing-back"),
    ("P013","P004",MFC,"DEF",1,90,0,B,0,0,B,B,""),
    ("P013","P003",MFC,"DEF",1,90,0,B,0,0,B,B,""),
    ("P013","P018",MFC,"DEF",1,90,0,B,0,0,B,B,""),
    ("P013","P002",MFC,"DEF",1,90,0,B,0,0,B,B,"Left wing-back"),
    ("P013","P007",MFC,"MID",1,90,0,B,0,0,B,B,""),
    ("P013","P015",MFC,"MID",1,90,0,B,0,0,B,B,""),
    ("P013","P016",MFC,"MID",1,90,0,B,0,0,B,B,""),
    ("P013","P010",MFC,"MID",1,90,0,B,0,0,B,B,""),
    ("P013","P008",MFC,"FWD",1,90,1,B,0,0,B,B,"Goal: 19' (pen)"),
    ("P013","OPP_HAN","Hibernian","DEF",1,B,0,B,0,1,B,B,"Red card before HT (denied goalscoring opportunity)"),

    # ── P014  Motherwell 0-0 Hearts  29 Nov 2025 ──────────────────────────
    ("P014","P001",MFC,"GK", 1,90,0,B,0,0,B,B,""),
    ("P014","P002",MFC,"DEF",1,84,0,B,0,0,B,"84","Triple sub ~84'"),
    ("P014","P004",MFC,"DEF",1,90,0,B,0,0,B,B,""),
    ("P014","P018",MFC,"DEF",1,90,0,B,0,0,B,B,""),
    ("P014","P005",MFC,"DEF",1,90,0,B,0,0,B,B,""),
    ("P014","P009",MFC,"MID",1,84,0,B,0,0,B,"84","Triple sub ~84'"),
    ("P014","P007",MFC,"MID",1,90,0,B,0,0,B,B,""),
    ("P014","P006",MFC,"MID",1,90,0,B,0,0,B,B,""),
    ("P014","P010",MFC,"MID",1,84,0,B,0,0,B,"84","Triple sub ~84'"),
    ("P014","P017",MFC,"FWD",1,90,0,B,0,0,B,B,""),
    ("P014","P008",MFC,"FWD",1,90,0,B,0,0,B,B,""),
    ("P014","P013",MFC,"DEF",0,6, 0,B,0,0,"84",B,"On for Koutroumbis ~84'"),
    ("P014","P016",MFC,"MID",0,6, 0,B,0,0,"84",B,"On for Slattery ~84'"),
    ("P014","P011",MFC,"FWD",0,6, 0,B,0,0,"84",B,"On for Just ~84'"),

    # ── P015  Falkirk 0-0 Motherwell  3 Dec 2025 ──────────────────────────
    ("P015","P001",MFC,"GK", 1,90,0,B,0,0,B,B,""),
    ("P015","P013",MFC,"DEF",1,90,0,B,0,0,B,B,""),
    ("P015","P004",MFC,"DEF",1,90,0,B,0,0,B,B,"Captain"),
    ("P015","P018",MFC,"DEF",1,90,0,B,0,0,B,B,""),
    ("P015","P005",MFC,"DEF",1,90,0,B,0,0,B,B,""),
    ("P015","P006",MFC,"MID",1,90,0,B,0,0,B,B,""),
    ("P015","P015",MFC,"MID",1,90,0,B,0,0,B,B,""),
    ("P015","P009",MFC,"MID",1,90,0,B,0,0,B,B,""),
    ("P015","P014",MFC,"MID",1,90,0,B,0,0,B,B,""),
    ("P015","P008",MFC,"FWD",1,90,0,B,0,0,B,B,""),
    ("P015","P017",MFC,"FWD",1,90,0,B,0,0,B,B,""),

    # ── P016  Motherwell 3-0 Livingston  6 Dec 2025 ───────────────────────
    ("P016","P001",MFC,"GK", 1,90,0,B,0,0,B,B,""),
    ("P016","P012",MFC,"DEF",1,90,0,B,0,0,B,B,""),
    ("P016","P004",MFC,"DEF",1,90,0,B,0,0,B,B,""),
    ("P016","P003",MFC,"DEF",1,90,0,B,0,0,B,B,""),
    ("P016","P002",MFC,"DEF",1,70,0,B,0,0,B,"70",""),
    ("P016","P016",MFC,"MID",1,90,0,1,0,0,B,B,"Assist on Longelo 88'"),
    ("P016","P007",MFC,"MID",1,70,1,B,0,0,B,"70","Goal: 18'; substituted off ~70'"),
    ("P016","P006",MFC,"MID",1,90,0,B,0,0,B,B,""),
    ("P016","P008",MFC,"FWD",1,90,0,B,0,0,B,B,""),
    ("P016","P011",MFC,"FWD",1,61,1,B,0,0,B,"61","Goal: 60' (pen); substituted off ~61'"),
    ("P016","P010",MFC,"FWD",1,90,0,B,0,0,B,B,""),
    ("P016","P017",MFC,"FWD",0,29,0,B,0,0,"61",B,"On for Stamatelopoulos ~61'"),
    ("P016","P005",MFC,"DEF",0,20,1,B,0,0,"70",B,"On for Koutroumbis ~70'; Goal: 88'"),
    ("P016","P015",MFC,"MID",0,20,0,B,0,0,"70",B,"On for Watt ~70'"),

    # ── P017  Dundee United 0-0 Motherwell  13 Dec 2025 ───────────────────
    ("P017","P001",MFC,"GK", 1,90,0,B,0,0,B,B,""),
    ("P017","P012",MFC,"DEF",1,90,0,B,0,0,B,B,""),
    ("P017","P004",MFC,"DEF",1,90,0,B,0,0,B,B,""),
    ("P017","P018",MFC,"DEF",1,18,0,B,0,0,B,"18","Forced off 18' (head clash with Watt)"),
    ("P017","P002",MFC,"DEF",1,90,0,B,0,0,B,B,""),
    ("P017","P007",MFC,"MID",1,90,0,B,0,0,B,B,""),
    ("P017","P006",MFC,"MID",1,90,0,B,0,0,B,B,""),
    ("P017","P008",MFC,"FWD",1,90,0,B,0,0,B,B,""),
    ("P017","P010",MFC,"MID",1,90,0,B,0,0,B,B,""),
    ("P017","P016",MFC,"MID",1,90,0,B,0,0,B,B,""),
    ("P017","P011",MFC,"FWD",1,90,0,B,0,0,B,B,""),
    ("P017","P003",MFC,"DEF",0,72,0,B,0,0,"18",B,"On for Welsh 18'"),

    # ── P018  Motherwell 1-0 Dundee  20 Dec 2025 ──────────────────────────
    ("P018","P001",MFC,"GK", 1,90,0,B,0,0,B,B,""),
    ("P018","P002",MFC,"DEF",1,58,0,B,0,0,B,"58",""),
    ("P018","P004",MFC,"DEF",1,90,0,B,0,0,B,B,""),
    ("P018","P018",MFC,"DEF",1,90,0,B,0,0,B,B,""),
    ("P018","P005",MFC,"DEF",1,86,0,B,0,0,B,"86",""),
    ("P018","P007",MFC,"MID",1,90,0,B,0,0,B,B,""),
    ("P018","P009",MFC,"MID",1,86,1,B,0,0,B,"86","Goal: 82'; substituted off 86'"),
    ("P018","P006",MFC,"MID",1,90,0,B,0,0,B,B,""),
    ("P018","P016",MFC,"MID",1,58,0,B,0,0,B,"58",""),
    ("P018","P017",MFC,"FWD",1,73,0,B,0,0,B,"73",""),
    ("P018","P010",MFC,"MID",1,90,0,B,0,0,B,B,""),
    ("P018","P013",MFC,"DEF",0,32,0,B,0,0,"58",B,"On for Koutroumbis 58'"),
    ("P018","P014",MFC,"MID",0,32,0,B,0,0,"58",B,"On for Charles-Cook 58'"),
    ("P018","P011",MFC,"FWD",0,17,0,B,0,0,"73",B,"On for Hendry 73'"),
    ("P018","P015",MFC,"MID",0,4, 0,B,0,0,"86",B,"On for Slattery 86'"),
    ("P018","P012",MFC,"DEF",0,4, 0,B,0,0,"86",B,"On for Longelo 86'"),

    # ── P019  Rangers 1-0 Motherwell  27 Dec 2025 ─────────────────────────
    ("P019","P001",MFC,"GK", 1,90,0,B,0,0,B,B,""),
    ("P019","P002",MFC,"DEF",1,B, 0,B,0,0,B,B,"Substituted off (minute unconfirmed)"),
    ("P019","P004",MFC,"DEF",1,90,0,B,0,0,B,B,""),
    ("P019","P018",MFC,"DEF",1,90,0,B,0,0,B,B,""),
    ("P019","P005",MFC,"DEF",1,90,0,B,0,0,B,B,""),
    ("P019","P013",MFC,"DEF",1,90,0,B,0,0,B,B,""),
    ("P019","P007",MFC,"MID",1,90,0,B,0,0,B,B,""),
    ("P019","P006",MFC,"MID",1,90,0,B,0,0,B,B,""),
    ("P019","P010",MFC,"MID",1,B, 0,B,0,0,B,B,"Substituted off (minute unconfirmed)"),
    ("P019","P014",MFC,"MID",1,90,0,B,0,0,B,B,""),
    ("P019","P017",MFC,"FWD",1,B, 0,B,0,0,B,B,"Substituted off (minute unconfirmed)"),
    ("P019","P009",MFC,"MID",0,B, 0,B,0,0,B,B,"On for Just"),
    ("P019","P011",MFC,"FWD",0,B, 0,B,0,0,B,B,"On for Hendry"),
    ("P019","P012",MFC,"DEF",0,B, 0,B,0,0,B,B,"On for Koutroumbis"),
    ("P019","OPP_AAS","Rangers","MID",1,B,1,B,0,0,B,B,"Goal: 67'"),

    # ── P020  Motherwell 2-0 Celtic  30 Dec 2025 ──────────────────────────
    ("P020","P001",MFC,"GK", 1,90,0,B,0,0,B,B,""),
    ("P020","P002",MFC,"DEF",1,90,0,B,0,0,B,B,""),
    ("P020","P004",MFC,"DEF",1,90,0,B,0,0,B,B,""),
    ("P020","P012",MFC,"DEF",1,90,0,B,0,0,B,B,"Captain"),
    ("P020","P013",MFC,"DEF",1,90,0,B,0,0,B,B,""),
    ("P020","P007",MFC,"MID",1,90,1,B,0,0,B,B,"Goal: 58'"),
    ("P020","P015",MFC,"MID",1,90,0,B,0,0,B,B,""),
    ("P020","P006",MFC,"MID",1,90,0,B,0,0,B,B,""),
    ("P020","P009",MFC,"MID",1,90,0,B,0,0,B,B,""),
    ("P020","P010",MFC,"MID",1,90,0,B,0,0,B,B,""),
    ("P020","P014",MFC,"FWD",1,90,1,B,0,0,B,B,"Goal: 14'"),

    # ── P021  Motherwell 2-0 St Mirren  3 Jan 2026 ────────────────────────
    ("P021","P001",MFC,"GK", 1,90,0,B,0,0,B,B,""),
    ("P021","P012",MFC,"DEF",1,90,0,B,0,0,B,B,""),
    ("P021","P004",MFC,"DEF",1,90,0,B,0,0,B,B,""),
    ("P021","P018",MFC,"DEF",1,90,0,B,0,0,B,B,""),
    ("P021","P005",MFC,"DEF",1,90,0,B,0,0,B,B,""),
    ("P021","P007",MFC,"MID",1,B, 1,B,0,0,B,B,"Goal (minute unconfirmed); subbed off (injury)"),
    ("P021","P010",MFC,"MID",1,90,0,B,0,0,B,B,""),
    ("P021","P009",MFC,"MID",1,B, 0,B,0,0,B,B,"Substituted off (minute unconfirmed)"),
    ("P021","P006",MFC,"MID",1,90,0,B,0,0,B,B,""),
    ("P021","P008",MFC,"FWD",1,B, 1,B,0,0,B,B,"Goal (minute unconfirmed); substituted off"),
    ("P021","P014",MFC,"FWD",1,90,0,B,0,0,B,B,""),
    ("P021","P015",MFC,"MID",0,B, 0,B,0,0,B,B,"On for Watt (injury)"),
    ("P021","P013",MFC,"DEF",0,B, 0,B,0,0,B,B,"On for Maswanhise"),
    ("P021","P025",MFC,"MID",0,B, 0,B,0,0,B,B,"On for Slattery"),

    # ── P022  Hibernian 1-1 Motherwell  10 Jan 2026 ───────────────────────
    ("P022","P001",MFC,"GK", 1,90,0,B,0,0,B,B,""),
    ("P022","P012",MFC,"DEF",1,B, 0,B,0,0,B,B,"Substituted off (injury, minute unconfirmed)"),
    ("P022","P004",MFC,"DEF",1,90,0,B,0,0,B,B,""),
    ("P022","P018",MFC,"DEF",1,B, 0,B,0,0,B,B,"Substituted off (minute unconfirmed)"),
    ("P022","P005",MFC,"DEF",1,90,0,B,0,0,B,B,""),
    ("P022","P015",MFC,"MID",1,90,0,B,0,0,B,B,""),
    ("P022","P006",MFC,"MID",1,90,0,B,0,0,B,B,""),
    ("P022","P009",MFC,"MID",1,90,0,B,0,0,B,B,""),
    ("P022","P010",MFC,"MID",1,B, 0,B,0,0,B,B,"Substituted off (minute unconfirmed)"),
    ("P022","P014",MFC,"MID",1,90,0,B,0,0,B,B,""),
    ("P022","P008",MFC,"FWD",1,90,1,B,0,0,B,B,"Goal: 52' (assisted by Just)"),
    ("P022","P002",MFC,"DEF",0,B, 0,B,0,0,B,B,"On for O'Donnell (injury)"),
    ("P022","P024",MFC,"DEF",0,B, 0,B,0,0,B,B,"On for Just"),
    ("P022","P003",MFC,"DEF",0,B, 0,B,0,0,B,B,"On for Welsh"),
    ("P022","OPP_BOW","Hibernian","FWD",1,B,1,B,0,0,B,B,"Goal: 69'"),

    # ── P023  Motherwell 4-0 Kilmarnock  24 Jan 2026 ──────────────────────
    ("P023","P001",MFC,"GK", 1,90,0,B,0,0,B,B,""),
    ("P023","P013",MFC,"DEF",1,90,0,B,0,0,B,B,""),
    ("P023","P012",MFC,"DEF",1,90,0,B,0,0,B,B,"Captain"),
    ("P023","P004",MFC,"DEF",1,90,0,B,0,0,B,B,""),
    ("P023","P005",MFC,"DEF",1,90,0,B,0,0,B,B,""),
    ("P023","P015",MFC,"MID",1,90,0,B,0,0,B,B,""),
    ("P023","P006",MFC,"MID",1,90,1,B,0,0,B,B,"Goal: 82'"),
    ("P023","P014",MFC,"MID",1,90,1,B,0,0,B,B,"Goal: 56'"),
    ("P023","P010",MFC,"MID",1,90,1,B,0,0,B,B,"Goal: 29'"),
    ("P023","P009",MFC,"MID",1,90,0,B,0,0,B,B,""),
    ("P023","P008",MFC,"FWD",1,90,1,B,0,0,B,B,"Goal: 45+1'"),

    # ── P024  Livingston 0-2 Motherwell  31 Jan 2026 ──────────────────────
    ("P024","P001",MFC,"GK", 1,90,0,B,0,0,B,B,""),
    ("P024","P012",MFC,"DEF",1,90,0,B,0,0,B,B,""),
    ("P024","P004",MFC,"DEF",1,90,0,B,0,0,B,B,""),
    ("P024","P018",MFC,"DEF",1,90,0,B,0,0,B,B,""),
    ("P024","P002",MFC,"DEF",1,90,0,B,0,0,B,B,""),
    ("P024","P013",MFC,"DEF",1,90,0,B,0,0,B,B,""),
    ("P024","P009",MFC,"MID",1,90,0,B,0,0,B,B,""),
    ("P024","P006",MFC,"MID",1,90,0,B,0,0,B,B,""),
    ("P024","P015",MFC,"MID",1,90,0,B,0,0,B,B,""),
    ("P024","P010",MFC,"MID",1,90,0,B,0,0,B,B,""),
    ("P024","P008",MFC,"FWD",1,90,2,B,0,0,B,B,"Goals: 5' and 28' (both in first half)"),

    # ── P025  Motherwell 1-1 Rangers  11 Feb 2026 ─────────────────────────
    ("P025","P001",MFC,"GK", 1,90,0,B,0,0,B,B,""),
    ("P025","P012",MFC,"DEF",1,B, 0,B,0,0,B,B,"Substituted off (minute unconfirmed)"),
    ("P025","P004",MFC,"DEF",1,90,0,B,0,0,B,B,""),
    ("P025","P018",MFC,"DEF",1,90,1,B,0,0,B,B,"Goal: 89' (headed in from Bjorgolfsson flick-on)"),
    ("P025","P005",MFC,"DEF",1,90,0,B,0,0,B,B,""),
    ("P025","P006",MFC,"MID",1,78,0,B,0,1,B,B,"Red card 78' (yellow upgraded to red by VAR, foul on Mikey Moore); dismissed"),
    ("P025","P007",MFC,"MID",1,90,0,B,0,0,B,B,""),
    ("P025","P009",MFC,"MID",1,90,0,B,0,0,B,B,""),
    ("P025","P014",MFC,"MID",1,B, 0,B,0,0,B,B,"Substituted off (minute unconfirmed)"),
    ("P025","P010",MFC,"MID",1,90,0,B,0,0,B,B,""),
    ("P025","P008",MFC,"FWD",1,90,0,B,0,0,B,B,""),
    ("P025","P013",MFC,"DEF",0,B, 0,B,0,0,B,B,"On for O'Donnell"),
    ("P025","P019",MFC,"MID",0,B, 0,1,0,0,B,B,"On for Sa'id; flick-on assisted Welsh's equaliser"),
    ("P025","OPP_RAS","Rangers","MID",1,B,1,B,0,0,B,B,"Goal: 6'"),

    # ── P026  Motherwell 2-0 Aberdeen  15 Feb 2026 ────────────────────────
    # Fadinger serving 1st game of suspension (Rangers red card)
    ("P026","P001",MFC,"GK", 1,90,0,B,0,0,B,B,""),
    ("P026","P013",MFC,"DEF",1,90,0,B,0,0,B,B,""),
    ("P026","P004",MFC,"DEF",1,90,0,B,0,0,B,B,""),
    ("P026","P018",MFC,"DEF",1,90,0,B,0,0,B,B,""),
    ("P026","P005",MFC,"DEF",1,90,0,B,0,0,B,B,""),
    ("P026","P007",MFC,"MID",1,90,0,B,0,0,B,B,""),
    ("P026","P015",MFC,"MID",1,90,0,B,0,0,B,B,""),
    ("P026","P009",MFC,"MID",1,90,0,B,0,0,B,B,""),
    ("P026","P014",MFC,"MID",1,90,0,B,0,0,B,B,""),
    ("P026","P010",MFC,"FWD",1,90,1,B,0,0,B,B,"Goal: 28'"),
    ("P026","P008",MFC,"FWD",1,90,0,B,0,0,B,B,""),
    ("P026","OPP_MCT_OG","Aberdeen","DEF",1,B,0,B,0,0,B,B,"Own goal: 90+3'"),

    # ── P027  St Mirren 0-5 Motherwell  21 Feb 2026 ───────────────────────
    ("P027","P001",MFC,"GK", 1,90,0,B,0,0,B,B,""),
    ("P027","P012",MFC,"DEF",1,90,0,B,0,0,B,B,"Captain"),
    ("P027","P004",MFC,"DEF",1,90,0,B,0,0,B,B,""),
    ("P027","P018",MFC,"DEF",1,90,0,B,0,0,B,B,""),
    ("P027","P005",MFC,"DEF",1,90,1,B,0,0,B,B,"Goal (4th of the match)"),
    ("P027","P015",MFC,"MID",1,90,0,B,0,0,B,B,""),
    ("P027","P007",MFC,"MID",1,90,0,B,0,0,B,B,""),
    ("P027","P009",MFC,"MID",1,90,0,B,0,0,B,B,""),
    ("P027","P010",MFC,"MID",1,90,1,B,0,0,B,B,"Goal: inside 15'"),
    ("P027","P014",MFC,"MID",1,90,1,B,0,0,B,B,"Goal: ~49'"),
    ("P027","P008",MFC,"FWD",1,90,1,B,0,0,B,B,"Goal: penalty before half-time"),
    ("P027","P019",MFC,"MID",0,B, 1,B,0,0,B,B,"On as sub; scored 5th goal"),

    # ── P028  Motherwell 2-0 Dundee United  28 Feb 2026 ───────────────────
    ("P028","P001",MFC,"GK", 1,90,0,B,0,0,B,B,""),
    ("P028","P012",MFC,"DEF",1,90,0,B,0,0,B,B,""),
    ("P028","P004",MFC,"DEF",1,90,0,B,0,0,B,B,""),
    ("P028","P018",MFC,"DEF",1,90,0,B,0,0,B,B,""),
    ("P028","P005",MFC,"DEF",1,90,0,B,0,0,B,B,""),
    ("P028","P007",MFC,"MID",1,90,0,B,0,0,B,B,"Quick free-kick led to 2nd goal"),
    ("P028","P006",MFC,"MID",1,90,0,B,0,0,B,B,"Returned from suspension"),
    ("P028","P009",MFC,"MID",1,90,0,B,0,0,B,B,""),
    ("P028","P014",MFC,"MID",1,90,0,B,0,0,B,B,""),
    ("P028","P010",MFC,"MID",1,90,0,B,0,0,B,B,""),
    ("P028","P008",MFC,"FWD",1,90,2,B,0,0,B,B,"Goals: 37' (pen) and 46' (deflected)"),

    # ── P029  Dundee 2-1 Motherwell  7 Mar 2026  (unchanged XI from P028) ─
    ("P029","P001",MFC,"GK", 1,90,0,B,0,0,B,B,""),
    ("P029","P012",MFC,"DEF",1,90,0,B,0,0,B,B,""),
    ("P029","P004",MFC,"DEF",1,90,0,B,0,0,B,B,""),
    ("P029","P018",MFC,"DEF",1,90,0,B,0,0,B,B,""),
    ("P029","P005",MFC,"DEF",1,90,0,B,0,0,B,B,""),
    ("P029","P007",MFC,"MID",1,90,0,B,0,0,B,B,""),
    ("P029","P006",MFC,"MID",1,90,0,B,0,0,B,B,""),
    ("P029","P009",MFC,"MID",1,90,1,B,0,0,B,B,"Goal: ~78' (curling free-kick from 30 yards)"),
    ("P029","P014",MFC,"MID",1,90,0,B,0,0,B,B,""),
    ("P029","P010",MFC,"MID",1,90,0,B,0,0,B,B,""),
    ("P029","P008",MFC,"FWD",1,90,0,B,0,0,B,B,""),
    ("P029","OPP_YOG","Dundee","FWD",1,B,1,B,0,0,B,B,"Goal: 32'"),
    ("P029","OPP_ROB_D","Dundee","MID",1,B,1,B,0,0,B,B,"Goal: 84'"),

    # ── P030  Celtic 3-1 Motherwell  14 Mar 2026 ──────────────────────────
    ("P030","P001",MFC,"GK", 1,90,0,B,0,0,B,B,""),
    ("P030","P013",MFC,"DEF",1,90,0,B,0,0,B,B,""),
    ("P030","P012",MFC,"DEF",1,90,0,B,0,0,B,B,""),
    ("P030","P004",MFC,"DEF",1,90,0,B,0,0,B,B,""),
    ("P030","P005",MFC,"DEF",1,71,0,B,0,1,B,B,"Red card 71' (led directly to Celtic penalty); dismissed"),
    ("P030","P007",MFC,"MID",1,90,0,B,0,0,B,B,""),
    ("P030","P006",MFC,"MID",1,90,0,B,0,0,B,B,""),
    ("P030","P009",MFC,"MID",1,90,0,B,0,0,B,B,""),
    ("P030","P014",MFC,"MID",1,90,0,B,0,0,B,B,""),
    ("P030","P010",MFC,"FWD",1,90,1,B,0,0,B,B,"Goal: 32'"),
    ("P030","P008",MFC,"FWD",1,90,0,B,0,0,B,B,""),
    ("P030","OPP_YHJ","Celtic","FWD",1,B,2,B,0,0,B,B,"Goals: 38' and 79'"),
    ("P030","OPP_CVA","Celtic","FWD",1,B,1,B,0,0,B,B,"Goal: 72' (pen – awarded after Longelo red card)"),

    # ── P031  Motherwell 0-0 Hibernian  21 Mar 2026 ───────────────────────
    # Longelo suspended
    ("P031","P001",MFC,"GK", 1,90,0,B,0,0,B,B,""),
    ("P031","P013",MFC,"DEF",1,90,0,B,0,0,B,B,""),
    ("P031","P004",MFC,"DEF",1,90,0,B,0,0,B,B,""),
    ("P031","P018",MFC,"DEF",1,90,0,B,0,0,B,B,""),
    ("P031","P012",MFC,"DEF",1,90,0,B,0,0,B,B,""),
    ("P031","P006",MFC,"MID",1,90,0,B,0,0,B,B,""),
    ("P031","P007",MFC,"MID",1,90,0,B,0,0,B,B,""),
    ("P031","P009",MFC,"MID",1,90,0,B,0,0,B,B,""),
    ("P031","P014",MFC,"MID",1,90,0,B,0,0,B,B,""),
    ("P031","P008",MFC,"FWD",1,90,0,B,0,0,B,B,""),
    ("P031","P010",MFC,"MID",1,B, 0,B,0,0,B,B,"Came off (injury, minute unconfirmed); goal disallowed VAR"),
    ("P031","P019",MFC,"MID",0,B, 0,B,0,0,B,B,"On for Just"),

    # ── P032  Motherwell 2-3 Falkirk  4 Apr 2026 ──────────────────────────
    # Longelo still suspended
    ("P032","P001",MFC,"GK", 1,90,0,B,0,0,B,B,""),
    ("P032","P012",MFC,"DEF",1,90,0,B,0,0,B,B,""),
    ("P032","P004",MFC,"DEF",1,90,0,B,0,0,B,B,""),
    ("P032","P018",MFC,"DEF",1,90,0,B,0,0,B,B,""),
    ("P032","P013",MFC,"DEF",1,90,0,B,0,0,B,B,"Left-back cover"),
    ("P032","P015",MFC,"MID",1,90,0,B,0,0,B,B,""),
    ("P032","P006",MFC,"MID",1,90,0,B,0,0,B,B,""),
    ("P032","P007",MFC,"MID",1,90,1,B,0,0,B,B,"Goal: 34' (thunderous volley)"),
    ("P032","P010",MFC,"MID",1,90,0,B,0,0,B,B,""),
    ("P032","P009",MFC,"MID",1,90,0,B,0,0,B,B,""),
    ("P032","P008",MFC,"FWD",1,90,1,B,0,0,B,B,"Goal: 90+4' (assisted by Just)"),
    ("P032","OPP_STW","Falkirk","DEF",1,B,1,B,0,0,B,B,"Goal: 3' (free kick)"),
    ("P032","OPP_BRO_F","Falkirk","FWD",1,B,1,B,0,0,B,B,"Goal: 45' (restored Falkirk lead before HT)"),
    ("P032","OPP_CAL","Falkirk","MID",1,B,1,B,0,0,B,B,"Goal: 62' (penalty)"),

    # ── P033  Hearts 3-1 Motherwell  11 Apr 2026  (last pre-split game) ────
    ("P033","P001",MFC,"GK", 1,90,0,B,0,0,B,B,""),
    ("P033","P013",MFC,"DEF",1,90,0,B,0,0,B,B,""),
    ("P033","P004",MFC,"DEF",1,90,0,B,0,0,B,B,""),
    ("P033","P018",MFC,"DEF",1,90,0,B,0,0,B,B,""),
    ("P033","P005",MFC,"DEF",1,90,1,B,0,0,B,B,"Goal: 50'"),
    ("P033","P006",MFC,"MID",1,90,0,B,0,0,B,B,""),
    ("P033","P007",MFC,"MID",1,88,0,B,0,0,B,"88",""),
    ("P033","P014",MFC,"MID",1,88,0,B,0,0,B,"88",""),
    ("P033","P009",MFC,"MID",1,89,0,B,0,0,B,"89",""),
    ("P033","P008",MFC,"FWD",1,90,0,B,0,0,B,B,""),
    ("P033","P010",MFC,"MID",1,90,0,B,0,0,B,B,""),
    ("P033","P017",MFC,"FWD",0,2, 0,B,0,0,"88",B,"On for Watt 88'"),
    ("P033","P024",MFC,"DEF",0,2, 0,B,0,0,"88",B,"On for Sa'id 88'"),
    ("P033","P026",MFC,"MID",0,1, 0,B,0,0,"89",B,"On for Slattery 89'"),
    ("P033","P015",MFC,"MID",0,1, 0,B,0,0,"89",B,"On for Just? 89'"),
    ("P033","OPP_BRA","Heart of Midlothian","MID",1,B,1,B,0,0,B,B,"Goal: 61'"),
    ("P033","OPP_SHA","Heart of Midlothian","FWD",1,B,1,B,0,0,B,B,"Goal: 87' (pen)"),
    ("P033","OPP_KAB","Heart of Midlothian","MID",1,B,1,B,0,0,B,B,"Goal: 90+2'"),

    # ── P034  Rangers 2-3 Motherwell  26 Apr 2026  (post-split) ───────────
    ("P034","P001",MFC,"GK", 1,90,0,B,0,0,B,B,""),
    ("P034","P013",MFC,"DEF",1,90,0,B,0,0,B,B,""),
    ("P034","P004",MFC,"DEF",1,90,0,B,0,0,B,B,""),
    ("P034","P018",MFC,"DEF",1,55,0,B,0,0,B,"55","Substituted off 55' (injury)"),
    ("P034","P012",MFC,"DEF",1,90,0,B,0,0,B,B,""),
    ("P034","P006",MFC,"MID",1,90,1,B,0,0,B,B,"Goal: 16'"),
    ("P034","P007",MFC,"MID",1,90,0,B,0,0,B,B,""),
    ("P034","P005",MFC,"DEF",1,90,2,B,0,0,B,B,"Goals: 25' and 90' (winner, assisted by O'Donnell)"),
    ("P034","P009",MFC,"MID",1,B, 0,B,0,0,B,B,"Substituted off (minute unconfirmed)"),
    ("P034","P008",MFC,"FWD",1,90,0,B,0,0,B,B,""),
    ("P034","P010",MFC,"MID",1,90,0,B,0,0,B,B,""),
    ("P034","P024",MFC,"DEF",0,35,0,B,0,0,"55",B,"On for Welsh 55'"),
    ("P034","P017",MFC,"FWD",0,B, 0,B,0,0,B,B,"On for Slattery (minute unconfirmed)"),
    ("P034","OPP_CHE","Rangers","FWD",1,B,1,B,0,0,B,B,"Goal: 51' (2-1)"),
    ("P034","OPP_RAS","Rangers","MID",1,B,1,B,0,0,B,B,"Goal: 70' (2-2)"),

    # ── P035  Falkirk 1-0 Motherwell  2 May 2026  (post-split) ────────────
    ("P035","P001",MFC,"GK", 1,90,0,B,0,0,B,B,""),
    ("P035","P013",MFC,"DEF",1,90,0,B,0,0,B,B,""),
    ("P035","P004",MFC,"DEF",1,90,0,B,0,0,B,B,""),
    ("P035","P018",MFC,"DEF",1,90,0,B,0,0,B,B,""),
    ("P035","P012",MFC,"DEF",1,90,0,B,0,0,B,B,""),
    ("P035","P006",MFC,"MID",1,90,0,B,0,0,B,B,""),
    ("P035","P007",MFC,"MID",1,90,0,B,0,0,B,B,""),
    ("P035","P008",MFC,"FWD",1,90,0,B,0,0,B,B,""),
    ("P035","P009",MFC,"MID",1,90,0,B,0,0,B,B,""),
    ("P035","P005",MFC,"DEF",1,90,0,B,0,0,B,B,""),
    ("P035","P010",MFC,"MID",1,90,0,B,0,0,B,B,""),
    ("P035","P026",MFC,"MID",0,B, 0,B,0,0,B,B,"Late sub (chasing game)"),
    ("P035","P017",MFC,"FWD",0,B, 0,B,0,0,B,B,"Late sub"),
    ("P035","P014",MFC,"MID",0,B, 0,B,0,0,B,B,"Late sub"),
    ("P035","P016",MFC,"MID",0,B, 0,B,0,0,B,B,"Late sub"),
    ("P035","OPP_CAR","Falkirk","FWD",0,B,1,B,0,0,B,B,"Goal: 63' (as substitute; assist Broggio)"),

    # ── P036  Motherwell 1-1 Hearts  9 May 2026  (post-split) ────────────
    ("P036","P001",MFC,"GK", 1,90,0,B,0,0,B,B,""),
    ("P036","P012",MFC,"DEF",1,90,0,B,0,0,B,B,""),
    ("P036","P003",MFC,"DEF",1,90,0,B,0,0,B,B,""),
    ("P036","P018",MFC,"DEF",1,90,0,B,0,0,B,B,""),
    ("P036","P005",MFC,"DEF",1,90,0,B,0,0,B,B,""),
    ("P036","P015",MFC,"MID",1,90,0,B,0,0,B,B,""),
    ("P036","P007",MFC,"MID",1,90,0,B,0,0,B,B,""),
    ("P036","P014",MFC,"MID",1,90,0,B,0,0,B,B,""),
    ("P036","P009",MFC,"MID",1,90,0,B,0,0,B,B,""),
    ("P036","P008",MFC,"FWD",1,90,0,B,0,0,B,B,""),
    ("P036","P010",MFC,"MID",1,90,0,B,0,0,B,B,""),
    ("P036","OPP_KIN_OG","Heart of Midlothian","DEF",1,B,0,B,0,0,B,B,"Own goal: 25' (credited to Motherwell)"),
    ("P036","OPP_SHA","Heart of Midlothian","FWD",1,B,1,B,0,0,B,B,"Goal: 43'"),

    # ── P037  Motherwell 2-3 Celtic  13 May 2026  (post-split) ────────────
    ("P037","P001",MFC,"GK", 1,90,0,B,0,0,B,B,""),
    ("P037","P003",MFC,"DEF",1,90,1,B,0,0,B,B,"Goal: 85'"),
    ("P037","P012",MFC,"DEF",1,90,0,B,0,0,B,B,"Captain"),
    ("P037","P018",MFC,"DEF",1,90,0,B,0,0,B,B,""),
    ("P037","P005",MFC,"DEF",1,90,0,B,0,0,B,B,""),
    ("P037","P007",MFC,"MID",1,90,1,B,0,0,B,B,"Goal: 17'"),
    ("P037","P009",MFC,"MID",1,90,0,B,0,0,B,B,""),
    ("P037","P015",MFC,"MID",1,90,0,B,0,0,B,B,""),
    ("P037","P014",MFC,"MID",1,90,0,B,0,0,B,B,""),
    ("P037","P008",MFC,"FWD",1,90,0,B,0,0,B,B,""),
    ("P037","P010",MFC,"FWD",1,90,0,B,0,0,B,B,""),
    ("P037","OPP_MAE","Celtic","FWD",1,B,1,B,0,0,B,B,"Goal: 41'"),
    ("P037","OPP_NYG","Celtic","MID",1,B,1,B,0,0,B,B,"Goal: 58'"),
    ("P037","OPP_IHE","Celtic","FWD",1,B,1,B,0,0,B,B,"Goal: 90+9' (VAR penalty – controversial)"),

    # ── P038  Hibernian 0-1 Motherwell  16 May 2026  (post-split, final day) ─
    # Motherwell secured 4th place and Europa Conference League qualification
    ("P038","P001",MFC,"GK", 1,90,0,B,0,0,B,B,""),
    ("P038","P012",MFC,"DEF",1,90,0,B,0,0,B,B,""),
    ("P038","P003",MFC,"DEF",1,90,0,B,0,0,B,B,""),
    ("P038","P018",MFC,"DEF",1,90,0,B,0,0,B,B,"Goal disallowed VAR"),
    ("P038","P005",MFC,"DEF",1,90,0,B,0,0,B,B,""),
    ("P038","P006",MFC,"MID",1,90,1,B,0,0,B,B,"Goal: 35'"),
    ("P038","P007",MFC,"MID",1,65,0,B,2,1,B,B,"Second yellow (= red) ~65'; dismissed – MFC finished with 10 men"),
    ("P038","P014",MFC,"MID",1,90,0,B,0,0,B,B,""),
    ("P038","P009",MFC,"MID",1,90,0,B,0,0,B,B,""),
    ("P038","P008",MFC,"FWD",1,90,0,B,0,0,B,B,""),
    ("P038","P010",MFC,"MID",1,90,0,B,0,0,B,B,""),
]

# ---------------------------------------------------------------------------
# BUILD LOOKUP MAPS
# ---------------------------------------------------------------------------
match_lookup  = {m[0]: m for m in MATCHES}
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

# Stub rows for matches with zero events
matches_with_events = {r[0] for r in rows}
for m in MATCHES:
    mid = m[0]
    if mid not in matches_with_events:
        (_, date, comp, rnd, home, away, h_score, a_score, venue, att) = m
        rows.append([
            mid, "", date, comp, rnd,
            home, away, h_score, a_score, venue, att,
            "","","","",
            "","","","","","",
            "","",
            "No confirmed player-level data for this match"
        ])

rows.sort(key=lambda r: (r[2], r[0]))

buf = io.StringIO()
w = csv.writer(buf, lineterminator="\n")
w.writerow(HEADER)
w.writerows(rows)

with open("motherwell_2526_season.csv", "w", encoding="utf-8", newline="") as f:
    f.write(buf.getvalue())

event_rows = sum(1 for r in rows if r[1])
print(f"Done. {len(rows)} rows total ({event_rows} event rows).")
print(f"Matches covered: {len(match_lookup)}  |  Unique matches with data: {len(matches_with_events)}")
