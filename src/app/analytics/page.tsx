"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, TrendingUp, Activity, PieChart } from "lucide-react";

export default function AnalyticsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-zinc-100 flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-amber-500" />
          Analytics
        </h2>
        <p className="text-zinc-500">Detailed statistics and performance metrics</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="glass border-0">
          <CardHeader>
            <CardTitle className="text-zinc-100 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-amber-500" />
              Model Performance
            </CardTitle>
          </CardHeader>
          <CardContent className="h-64 flex items-center justify-center">
            <p className="text-zinc-500">Charts will appear when connected to database</p>
          </CardContent>
        </Card>

        <Card className="glass border-0">
          <CardHeader>
            <CardTitle className="text-zinc-100 flex items-center gap-2">
              <Activity className="w-5 h-5 text-amber-500" />
              Prediction Accuracy by League
            </CardTitle>
          </CardHeader>
          <CardContent className="h-64 flex items-center justify-center">
            <p className="text-zinc-500">Charts will appear when connected to database</p>
          </CardContent>
        </Card>

        <Card className="glass border-0">
          <CardHeader>
            <CardTitle className="text-zinc-100 flex items-center gap-2">
              <PieChart className="w-5 h-5 text-amber-500" />
              Market Distribution
            </CardTitle>
          </CardHeader>
          <CardContent className="h-64 flex items-center justify-center">
            <p className="text-zinc-500">Charts will appear when connected to database</p>
          </CardContent>
        </Card>

        <Card className="glass border-0">
          <CardHeader>
            <CardTitle className="text-zinc-100 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-amber-500" />
              ROI by Month
            </CardTitle>
          </CardHeader>
          <CardContent className="h-64 flex items-center justify-center">
            <p className="text-zinc-500">Charts will appear when connected to database</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
