"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Settings, Bell, Shield, Database } from "lucide-react";

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-zinc-100 flex items-center gap-2">
          <Settings className="w-6 h-6 text-amber-500" />
          Settings
        </h2>
        <p className="text-zinc-500">Configure your application preferences</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="glass border-0">
          <CardHeader>
            <CardTitle className="text-zinc-100 flex items-center gap-2">
              <Bell className="w-5 h-5 text-amber-500" />
              Notifications
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-zinc-100">Live Match Alerts</p>
                <p className="text-sm text-zinc-500">Get notified when matches go live</p>
              </div>
              <Switch />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-zinc-100">Prediction Ready</p>
                <p className="text-sm text-zinc-500">Notify when ML predictions are updated</p>
              </div>
              <Switch />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-zinc-100">High Confidence Bets</p>
                <p className="text-sm text-zinc-500">Alert for predictions with 75%+ confidence</p>
              </div>
              <Switch defaultChecked />
            </div>
          </CardContent>
        </Card>

        <Card className="glass border-0">
          <CardHeader>
            <CardTitle className="text-zinc-100 flex items-center gap-2">
              <Shield className="w-5 h-5 text-amber-500" />
              Privacy & Security
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-zinc-100">Dark Mode</p>
                <p className="text-sm text-zinc-500">Always use dark theme</p>
              </div>
              <Switch defaultChecked disabled />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-zinc-100">Auto-sync Data</p>
                <p className="text-sm text-zinc-500">Automatically fetch latest match data</p>
              </div>
              <Switch defaultChecked />
            </div>
          </CardContent>
        </Card>

        <Card className="glass border-0 md:col-span-2">
          <CardHeader>
            <CardTitle className="text-zinc-100 flex items-center gap-2">
              <Database className="w-5 h-5 text-amber-500" />
              Database Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 p-4 rounded-lg bg-[#1a1a1a]">
              <div className="w-3 h-3 rounded-full bg-green-500 live-indicator" />
              <div className="flex-1">
                <p className="font-medium text-zinc-100">Connected to Railway PostgreSQL</p>
                <p className="text-sm text-zinc-500">Last sync: Just now</p>
              </div>
              <button className="px-4 py-2 bg-amber-500 text-black font-medium rounded-lg hover:bg-amber-400 transition-colors">
                Sync Now
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
