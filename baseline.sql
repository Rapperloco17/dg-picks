-- CreateTable
CREATE TABLE "Match" (
    "id" TEXT NOT NULL,
    "fixtureId" INTEGER NOT NULL,
    "leagueId" INTEGER NOT NULL,
    "leagueName" TEXT NOT NULL,
    "season" INTEGER NOT NULL,
    "round" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
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
    "homePossession" DOUBLE PRECISION DEFAULT 50,
    "awayPossession" DOUBLE PRECISION DEFAULT 50,
    "homeShots" INTEGER DEFAULT 0,
    "awayShots" INTEGER DEFAULT 0,
    "homeShotsOnTarget" INTEGER DEFAULT 0,
    "awayShotsOnTarget" INTEGER DEFAULT 0,
    "rawData" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Match_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "League" (
    "id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "countryCode" TEXT,
    "logo" TEXT,
    "flag" TEXT,
    "season" INTEGER NOT NULL,
    "seasonStart" TIMESTAMP(3),
    "seasonEnd" TIMESTAMP(3),
    "type" TEXT,
    "tier" INTEGER NOT NULL DEFAULT 3,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "League_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Team" (
    "id" INTEGER NOT NULL,
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
    "avgPossession" DOUBLE PRECISION DEFAULT 50,
    "avgCornersFor" DOUBLE PRECISION DEFAULT 0,
    "avgCornersAgainst" DOUBLE PRECISION DEFAULT 0,
    "avgYellowCards" DOUBLE PRECISION DEFAULT 0,
    "avgShots" DOUBLE PRECISION DEFAULT 0,
    "avgShotsOnTarget" DOUBLE PRECISION DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Team_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Standing" (
    "id" TEXT NOT NULL,
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
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Standing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LiveMatch" (
    "id" TEXT NOT NULL,
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
    "homeOdds" DOUBLE PRECISION,
    "drawOdds" DOUBLE PRECISION,
    "awayOdds" DOUBLE PRECISION,
    "over25Odds" DOUBLE PRECISION,
    "under25Odds" DOUBLE PRECISION,
    "bttsYesOdds" DOUBLE PRECISION,
    "bttsNoOdds" DOUBLE PRECISION,
    "mlPrediction" JSONB,
    "lastUpdated" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LiveMatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ModelStats" (
    "id" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "trainedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "matchesCount" INTEGER NOT NULL,
    "accuracy" DOUBLE PRECISION NOT NULL,
    "rmse" DOUBLE PRECISION NOT NULL,
    "features" JSONB NOT NULL,
    "weights" JSONB NOT NULL,

    CONSTRAINT "ModelStats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sharbet_analysis" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "fixtureId" INTEGER NOT NULL,
    "home_xg" DOUBLE PRECISION NOT NULL,
    "away_xg" DOUBLE PRECISION NOT NULL,
    "expected_total" DOUBLE PRECISION NOT NULL,
    "prob_home" DOUBLE PRECISION NOT NULL,
    "prob_draw" DOUBLE PRECISION NOT NULL,
    "prob_away" DOUBLE PRECISION NOT NULL,
    "prob_over_15" DOUBLE PRECISION NOT NULL,
    "prob_over_25" DOUBLE PRECISION NOT NULL,
    "prob_over_35" DOUBLE PRECISION NOT NULL,
    "prob_btts_yes" DOUBLE PRECISION NOT NULL,
    "prob_btts_no" DOUBLE PRECISION NOT NULL,
    "confidence" INTEGER NOT NULL DEFAULT 5,
    "calculated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sharbet_analysis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sharbet_picks" (
    "id" TEXT NOT NULL,
    "analysis_id" TEXT NOT NULL,
    "market" TEXT NOT NULL,
    "selection" TEXT NOT NULL,
    "odds" DOUBLE PRECISION NOT NULL,
    "bookmaker" TEXT NOT NULL DEFAULT 'average',
    "true_probability" DOUBLE PRECISION NOT NULL,
    "implied_probability" DOUBLE PRECISION NOT NULL,
    "edge" DOUBLE PRECISION NOT NULL,
    "edge_percentage" TEXT NOT NULL,
    "confidence" INTEGER NOT NULL,
    "stake_recommendation" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "result" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "is_sharp" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "sharbet_picks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SyncLog" (
    "id" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL,
    "newMatches" INTEGER NOT NULL DEFAULT 0,
    "errors" TEXT,

    CONSTRAINT "SyncLog_pkey" PRIMARY KEY ("id")
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
CREATE UNIQUE INDEX "sharbet_analysis_matchId_key" ON "sharbet_analysis"("matchId");

-- CreateIndex
CREATE UNIQUE INDEX "sharbet_analysis_fixtureId_key" ON "sharbet_analysis"("fixtureId");

-- CreateIndex
CREATE INDEX "sharbet_analysis_calculated_at_idx" ON "sharbet_analysis"("calculated_at");

-- CreateIndex
CREATE INDEX "sharbet_analysis_expires_at_idx" ON "sharbet_analysis"("expires_at");

-- CreateIndex
CREATE INDEX "sharbet_picks_status_edge_idx" ON "sharbet_picks"("status", "edge");

-- CreateIndex
CREATE INDEX "sharbet_picks_created_at_idx" ON "sharbet_picks"("created_at");

-- CreateIndex
CREATE INDEX "SyncLog_startedAt_idx" ON "SyncLog"("startedAt");

-- AddForeignKey
ALTER TABLE "Standing" ADD CONSTRAINT "Standing_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "League"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Standing" ADD CONSTRAINT "Standing_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sharbet_analysis" ADD CONSTRAINT "sharbet_analysis_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sharbet_picks" ADD CONSTRAINT "sharbet_picks_analysis_id_fkey" FOREIGN KEY ("analysis_id") REFERENCES "sharbet_analysis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

