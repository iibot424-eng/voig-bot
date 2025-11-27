import { Navbar } from "@/components/layout/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Users, DollarSign, Activity, ShieldAlert, 
  Send, Ban, Megaphone, RefreshCcw 
} from "lucide-react";
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts";

const data = [
  { name: "Mon", users: 4000 },
  { name: "Tue", users: 3000 },
  { name: "Wed", users: 2000 },
  { name: "Thu", users: 2780 },
  { name: "Fri", users: 1890 },
  { name: "Sat", users: 2390 },
  { name: "Sun", users: 3490 },
];

export default function Dashboard() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      
      <div className="container mx-auto px-6 pt-24 pb-12">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-display font-bold">OWNER <span className="text-primary">PANEL</span></h1>
            <p className="text-muted-foreground">Welcome back, @n777snickers777</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-sm font-mono text-green-500">BOT ONLINE</span>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[
            { title: "Total Users", value: "12,405", icon: Users, color: "text-blue-400" },
            { title: "Total Economy", value: "8.4M ⭐", icon: DollarSign, color: "text-yellow-400" },
            { title: "Commands Today", value: "45,201", icon: Activity, color: "text-purple-400" },
            { title: "Active Bans", value: "12", icon: ShieldAlert, color: "text-red-400" },
          ].map((stat) => (
            <Card key={stat.title} className="bg-white/5 border-white/10 backdrop-blur-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                  {stat.title}
                </CardTitle>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-display font-bold">{stat.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="bg-white/5 border border-white/10">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="broadcast">Broadcast</TabsTrigger>
            <TabsTrigger value="users">User Management</TabsTrigger>
            <TabsTrigger value="economy">Economy Control</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <Card className="bg-white/5 border-white/10">
                <CardHeader>
                  <CardTitle>Activity Growth</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={data}>
                        <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}`} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: "#18181b", borderColor: "#27272a" }}
                          itemStyle={{ color: "#e4e4e7" }}
                        />
                        <Bar dataKey="users" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white/5 border-white/10">
                <CardHeader>
                  <CardTitle>System Status</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>CPU Usage</span>
                      <span className="text-green-400">12%</span>
                    </div>
                    <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                      <div className="h-full w-[12%] bg-green-500" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Memory Usage</span>
                      <span className="text-yellow-400">45%</span>
                    </div>
                    <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                      <div className="h-full w-[45%] bg-yellow-500" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Database Connections</span>
                      <span className="text-blue-400">8/20</span>
                    </div>
                    <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                      <div className="h-full w-[40%] bg-blue-500" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="broadcast">
            <Card className="bg-white/5 border-white/10">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Megaphone className="w-5 h-5 text-primary" /> Global Broadcast
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-yellow-500/10 border border-yellow-500/20 p-4 rounded-lg text-sm text-yellow-200">
                  Warning: This message will be sent to all 12,405 users. Use with caution.
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Message Content</label>
                  <textarea 
                    className="w-full h-32 bg-black/50 border border-white/10 rounded-lg p-4 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                    placeholder="Type your announcement here..."
                  />
                </div>
                <div className="flex justify-end">
                  <Button className="bg-primary hover:bg-primary/80">
                    <Send className="w-4 h-4 mr-2" /> Send Broadcast
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="economy">
            <Card className="bg-white/5 border-white/10">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-yellow-400" /> Economy Management
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-4 p-4 bg-black/30 rounded-lg border border-white/5">
                    <h4 className="font-medium text-sm uppercase tracking-wide text-muted-foreground">Grant Stars</h4>
                    <div className="space-y-2">
                      <Input placeholder="User ID / Username" className="bg-black/50 border-white/10" />
                      <Input type="number" placeholder="Amount" className="bg-black/50 border-white/10" />
                      <Button className="w-full bg-green-600 hover:bg-green-500">Add Balance</Button>
                    </div>
                  </div>
                  
                  <div className="space-y-4 p-4 bg-black/30 rounded-lg border border-white/5">
                    <h4 className="font-medium text-sm uppercase tracking-wide text-muted-foreground">Reset Economy</h4>
                    <p className="text-xs text-red-400">Danger Zone: This will reset everyone's balance to 0.</p>
                    <div className="pt-4">
                      <Button variant="destructive" className="w-full">
                        <RefreshCcw className="w-4 h-4 mr-2" /> Reset All Balances
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}