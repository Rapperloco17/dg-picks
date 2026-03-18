-- CreateTable
CREATE TABLE "Match" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fixtureId" INTEGER NOT NULL,
    "leagueId" INTEGER NOT NULL,
    "leagueName" TEXT NOT NULL,
    "season" INTEGER NOT NULL,
    "round" TEXT,
    "date" DATETIME NOT NULL,
    "timestamp" INTEGER NOT NULL,
    "timezone" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "homeTeamId" INTEGER NOT NULL,
    "homeTeamName" TEXT NOT NULL,
    "awayTeamId" INTEGER NOT NULL,
    "awayTeamName" TEXT NOT NULL,
    "homeGoals" INTEGER,
    "awayGoals" INTEGER,
    "homeScoreHT" INTEGER,
    "awayScoreHT" INTEGER,
    "homeScoreFT" INTEGER,
    "awayScoreFT" INTEGER,
    "homeScoreET" INTEGER,
    "awayScoreET" INTEGER,
    "homeScoreP" INTEGER,
    "awayScoreP" INTEGER,
    "homeCorners" INTEGER DEFAULT 0,
    "awayCorners" INTEGER DEFAULT 0,
    "homeYellowCards" INTEGER DEFAULT 0,
    "awayYellowCards" INTEGER DEFAULT 0,
    "homeRedCards" INTEGER DEFAULT 0,
    "awayRedCards" INTEGER DEFAULT 0,
    "homePossession" REAL DEFAULT 50,
    "awayPossession" REAL DEFAULT 50,
    "homeShots" INTEGER DEFAULT 0,
    "awayShots" INTEGER DEFAULT 0,
    "homeShotsOnTarget" INTEGER DEFAULT 0,
    "awayShotsOnTarget" INTEGER DEFAULT 0,
    "rawData" TEXT NOT NULL DEFAULT '{}',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "League" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "countryCode" TEXT,
    "logo" TEXT,
    "flag" TEXT,
    "season" INTEGER NOT NULL,
    "seasonStart" DATETIME,
    "seasonEnd" DATETIME,
    "type" TEXT,
    "tier" INTEGER NOT NULL DEFAULT 3,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Team" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "country" TEXT,
    "founded" INTEGER,
    "logo" TEXT,
    "venueName" TEXT,
    "venueCity" TEXT,
    "form" TEXT,
    "played" INTEGER NOT NULL DEFAULT 0,
    "won" INTEGER NOT NULL DEFAULT 0,
    "drawn" INTEGER NOT NULL DEFAULT 0,
    "lost" INTEGER NOT NULL DEFAULT 0,
    "goalsFor" INTEGER NOT NULL DEFAULT 0,
    "goalsAgainst" INTEGER NOT NULL DEFAULT 0,
    "points" INTEGER NOT NULL DEFAULT 0,
    "avgPossession" REAL DEFAULT 50,
    "avgCornersFor" REAL DEFAULT 0,
    "avgCornersAgainst" REAL DEFAULT 0,
    "avgYellowCards" REAL DEFAULT 0,
    "avgShots" REAL DEFAULT 0,
    "avgShotsOnTarget" REAL DEFAULT 0,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Standing" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "leagueId" INTEGER NOT NULL,
    "teamId" INTEGER NOT NULL,
    "season" INTEGER NOT NULL,
    "rank" INTEGER NOT NULL,
    "played" INTEGER NOT NULL DEFAULT 0,
    "won" INTEGER NOT NULL DEFAULT 0,
    "drawn" INTEGER NOT NULL DEFAULT 0,
    "lost" INTEGER NOT NULL DEFAULT 0,
    "goalsFor" INTEGER NOT NULL DEFAULT 0,
    "goalsAgainst" INTEGER NOT NULL DEFAULT 0,
    "goalDiff" INTEGER NOT NULL DEFAULT 0,
    "points" INTEGER NOT NULL DEFAULT 0,
    "form" TEXT,
    "description" TEXT,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Standing_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "League" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Standing_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "LiveMatch" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fixtureId" INTEGER NOT NULL,
    "leagueId" INTEGER NOT NULL,
    "leagueName" TEXT NOT NULL,
    "homeTeamId" INTEGER NOT NULL,
    "homeTeamName" TEXT NOT NULL,
    "awayTeamId" INTEGER NOT NULL,
    "awayTeamName" TEXT NOT NULL,
    "homeGoals" INTEGER NOT NULL DEFAULT 0,
    "awayGoals" INTEGER NOT NULL DEFAULT 0,
    "elapsed" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL,
    "homePossession" INTEGER DEFAULT 50,
    "awayPossession" INTEGER DEFAULT 50,
    "homeShots" INTEGER DEFAULT 0,
    "awayShots" INTEGER DEFAULT 0,
    "homeShotsOnTarget" INTEGER DEFAULT 0,
    "awayShotsOnTarget" INTEGER DEFAULT 0,
    "homeCorners" INTEGER DEFAULT 0,
    "awayCorners" INTEGER DEFAULT 0,
    "homeYellowCards" INTEGER DEFAULT 0,
    "awayYellowCards" INTEGER DEFAULT 0,
    "homeRedCards" INTEGER DEFAULT 0,
    "awayRedCards" INTEGER DEFAULT 0,
    "homeOdds" REAL,
    "drawOdds" REAL,
    "awayOdds" REAL,
    "over25Odds" REAL,
    "under25Odds" REAL,
    "bttsYesOdds" REAL,
    "bttsNoOdds" REAL,
    "mlPrediction" TEXT DEFAULT '{}',
    "lastUpdated" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "ModelStats" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "version" TEXT NOT NULL,
    "trainedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "matchesCount" INTEGER NOT NULL,
    "accuracy" REAL NOT NULL,
    "rmse" REAL NOT NULL,
    "features" TEXT NOT NULL DEFAULT '{}',
    "weights" TEXT NOT NULL DEFAULT '{}'
);

-- CreateTable
CREATE TABLE "SharpBetAnalysis" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "matchId" TEXT NOT NULL,
    "fixtureId" INTEGER NOT NULL,
    "homeXg" REAL NOT NULL DEFAULT 0,
    "awayXg" REAL NOT NULL DEFAULT 0,
    "expectedTotal" REAL NOT NULL DEFAULT 0,
    "probHome" REAL NOT NULL DEFAULT 0,
    "probDraw" REAL NOT NULL DEFAULT 0,
    "probAway" REAL NOT NULL DEFAULT 0,
    "probOver15" REAL NOT NULL DEFAULT 0,
    "probOver25" REAL NOT NULL DEFAULT 0,
    "probOver35" REAL NOT NULL DEFAULT 0,
    "probBttsYes" REAL NOT NULL DEFAULT 0,
    "probBttsNo" REAL NOT NULL DEFAULT 0,
    "confidence" INTEGER NOT NULL DEFAULT 5,
    "calculatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" DATETIME NOT NULL,
    CONSTRAINT "SharpBetAnalysis_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SharpBetPick" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "analysisId" TEXT NOT NULL,
    "market" TEXT NOT NULL,
    "selection" TEXT NOT NULL,
    "odds" REAL NOT NULL,
    "bookmaker" TEXT NOT NULL DEFAULT 'average',
    "trueProbability" REAL NOT NULL DEFAULT 0,
    "impliedProbability" REAL NOT NULL DEFAULT 0,
    "edge" REAL NOT NULL DEFAULT 0,
    "edgePercentage" TEXT NOT NULL DEFAULT '0%',
    "confidence" INTEGER NOT NULL DEFAULT 5,
    "stakeRecommendation" TEXT NOT NULL DEFAULT '1%',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "result" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" DATETIME NOT NULL,
    "isSharp" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "SharpBetPick_analysisId_fkey" FOREIGN KEY ("analysisId") REFERENCES "SharpBetAnalysis" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SyncLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" DATETIME,
    "status" TEXT NOT NULL,
    "newMatches" INTEGER NOT NULL DEFAULT 0,
    "errors" TEXT
);

-- CreateIndex
CREATE UNIQUE INDEX "Match_fixtureId_key" ON "Match"("fixtureId");

-- CreateIndex
CREATE INDEX "Match_leagueId_idx" ON "Match"("leagueId");

-- CreateIndex
CREATE INDEX "Match_date_idx" ON "Match"("date");

-- CreateIndex
CREATE INDEX "Match_status_idx" ON "Match"("status");

-- CreateIndex
CREATE INDEX "Match_homeTeamId_idx" ON "Match"("homeTeamId");

-- CreateIndex
CREATE INDEX "Match_awayTeamId_idx" ON "Match"("awayTeamId");

-- CreateIndex
CREATE UNIQUE INDEX "League_id_key" ON "League"("id");

-- CreateIndex
CREATE INDEX "League_country_idx" ON "League"("country");

-- CreateIndex
CREATE INDEX "League_season_idx" ON "League"("season");

-- CreateIndex
CREATE INDEX "League_tier_idx" ON "League"("tier");

-- CreateIndex
CREATE UNIQUE INDEX "Team_id_key" ON "Team"("id");

-- CreateIndex
CREATE INDEX "Team_name_idx" ON "Team"("name");

-- CreateIndex
CREATE INDEX "Team_country_idx" ON "Team"("country");

-- CreateIndex
CREATE INDEX "Standing_leagueId_season_idx" ON "Standing"("leagueId", "season");

-- CreateIndex
CREATE INDEX "Standing_rank_idx" ON "Standing"("rank");

-- CreateIndex
CREATE UNIQUE INDEX "Standing_leagueId_teamId_season_key" ON "Standing"("leagueId", "teamId", "season");

-- CreateIndex
CREATE UNIQUE INDEX "LiveMatch_fixtureId_key" ON "LiveMatch"("fixtureId");

-- CreateIndex
CREATE INDEX "LiveMatch_leagueId_idx" ON "LiveMatch"("leagueId");

-- CreateIndex
CREATE INDEX "LiveMatch_status_idx" ON "LiveMatch"("status");

-- CreateIndex
CREATE INDEX "LiveMatch_lastUpdated_idx" ON "LiveMatch"("lastUpdated");

-- CreateIndex
CREATE UNIQUE INDEX "ModelStats_version_key" ON "ModelStats"("version");

-- CreateIndex
CREATE INDEX "ModelStats_trainedAt_idx" ON "ModelStats"("trainedAt");

-- CreateIndex
CREATE UNIQUE INDEX "SharpBetAnalysis_matchId_key" ON "SharpBetAnalysis"("matchId");

-- CreateIndex
CREATE UNIQUE INDEX "SharpBetAnalysis_fixtureId_key" ON "SharpBetAnalysis"("fixtureId");

-- CreateIndex
CREATE INDEX "SharpBetAnalysis_calculatedAt_idx" ON "SharpBetAnalysis"("calculatedAt");

-- CreateIndex
CREATE INDEX "SharpBetAnalysis_expiresAt_idx" ON "SharpBetAnalysis"("expiresAt");

-- CreateIndex
CREATE INDEX "SharpBetPick_status_edge_idx" ON "SharpBetPick"("status", "edge");

-- CreateIndex
CREATE INDEX "SharpBetPick_createdAt_idx" ON "SharpBetPick"("createdAt");

-- CreateIndex
CREATE INDEX "SyncLog_startedAt_idx" ON "SyncLog"("startedAt");
