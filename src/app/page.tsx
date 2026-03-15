import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Activity, Target, Calendar, Zap } from "lucide-react";

const stats = [
  {
    title: "Total Matches",
    value: "130,829",
    change: "+2,456 this week",
    icon: Calendar,
    trend: "up",
  },
  {
    title: "Model Accuracy",
    value: "44.6%",
    change: "+1.2% vs last month",
    icon: Target,
    trend: "up",
  },
  {
    title: "Live Matches",
    value: "12",
    change: "Currently playing",
    icon: Zap,
    trend: "neutral",
  },
  {
    title: "Active Leagues",
    value: "67",
    change: "From 45 countries",
    icon: Activity,
    trend: "neutral",
  },
];

const recentPredictions = [
  { match: "Man City vs Arsenal", prediction: "Over 2.5", confidence: 78, result: "Pending" },
  { match: "Real Madrid vs Barça", prediction: "BTTS Yes", confidence: 82, result: "Pending" },
  { match: "Bayern vs Dortmund", prediction: "Home Win", confidence: 65, result: "Pending" },
];

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div>
        <h2 className="text-2xl font-bold text-zinc-100">Dashboard</h2>
        <p className="text-zinc-500">Welcome back to DG Picks Analytics</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title} className="card-hover glass border-0">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-zinc-500">{stat.title}</p>
                    <p className="text-2xl font-bold text-zinc-100 mt-1">{stat.value}</p>
                    <p className="text-xs text-amber-500 mt-1">{stat.change}</p>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center">
                    <Icon className="w-6 h-6 text-amber-500" />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Two columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Predictions */}
        <Card className="glass border-0">
          <CardHeader>
            <CardTitle className="text-zinc-100 flex items-center gap-2">
              <Target className="w-5 h-5 text-amber-500" />
              Recent Predictions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentPredictions.map((pred, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-4 rounded-lg bg-[#1a1a1a] border border-[#262626]"
                >
                  <div>
                    <p className="font-medium text-zinc-100">{pred.match}</p>
                    <p className="text-sm text-zinc-500">{pred.prediction}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-amber-500">{pred.confidence}%</p>
                    <p className="text-xs text-zinc-500">{pred.result}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="glass border-0">
          <CardHeader>
            <CardTitle className="text-zinc-100 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-amber-500" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <button className="p-6 rounded-xl bg-[#1a1a1a] border border-[#262626] hover:border-amber-500/50 transition-all text-left group">
                <Zap className="w-8 h-8 text-amber-500 mb-3 group-hover:scale-110 transition-transform" />
                <p className="font-medium text-zinc-100">View Live Matches</p>
                <p className="text-sm text-zinc-500">12 matches playing now</p>
              </button>
              <button className="p-6 rounded-xl bg-[#1a1a1a] border border-[#262626] hover:border-amber-500/50 transition-all text-left group">
                <Activity className="w-8 h-8 text-amber-500 mb-3 group-hover:scale-110 transition-transform" />
                <p className="font-medium text-zinc-100">Check Leagues</p>
                <p className="text-sm text-zinc-500">67 leagues available</p>
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
