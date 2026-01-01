import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Search, Phone, Users, TrendingUp, Clock } from "lucide-react";
import { AgentLayout } from "@/components/layout/AgentLayout";
import { CRMSidebar } from "@/components/crm/CRMSidebar";
import { StatCard } from "@/components/dashboard/StatCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { agentConfigs } from "@/types/agent";

export default function RealEstateCRM() {
	const [activeFilter, setActiveFilter] = useState("All");
	const [searchQuery, setSearchQuery] = useState(""); // [FIX] Added Search State
	const [leads, setLeads] = useState<any[]>([]);
	const config = agentConfigs["real-estate"];

	// [FIX] Fetch Real Data
	useEffect(() => {
		fetch("http://localhost:8000/api/crm/leads?agent_type=real-estate")
			.then((res) => res.json())
			.then((data) => setLeads(data))
			.catch((err) => console.error("Failed to fetch leads", err));
	}, []);

	// [FIX] Filter Logic
	const filteredLeads = leads.filter((lead) => {
		const matchesSearch =
			(lead.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
			(lead.company || "").toLowerCase().includes(searchQuery.toLowerCase());

		if (!matchesSearch) return false;
		if (activeFilter === "All") return true;
		if (activeFilter === "Qualified") return lead.score > 70;
		if (activeFilter === "Contacted")
			return lead.status?.toLowerCase().includes("contacted");
		if (activeFilter === "New") return lead.status?.toLowerCase().includes("open");
		return true;
	});

	return (
		<AgentLayout agentType="real-estate">
			<div className="container mx-auto px-6 pb-12">
				<div className="flex gap-8">
					<CRMSidebar agentType="real-estate" />
					<div className="flex-1">
						<motion.div
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							className="mb-8"
						>
							<h1 className="text-4xl font-bold text-foreground mb-2">
								Real Estate CRM
							</h1>
							<p className="text-muted-foreground">
								Manage property leads, calls, and pipeline
							</p>
						</motion.div>
						{/* [FIX] Use Real Data for Stats */}
						<motion.div
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ delay: 0.1 }}
							className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8"
						>
							<StatCard
								title="Total Leads"
								value={leads.length.toString()}
								change="+10%"
								changeType="positive"
								icon={Users}
								variant="secondary"
							/>
							<StatCard
								title="High Interest"
								value={leads.filter((u) => u.score > 70).length.toString()}
								change="+12%"
								changeType="positive"
								icon={TrendingUp}
								variant="primary"
							/>
							<StatCard
								title="Total Calls"
								value={leads.length.toString()}
								change="+8%"
								changeType="positive"
								icon={Phone}
								variant="default"
							/>
							<StatCard
								title="Avg Score"
								value={(
									leads.reduce((acc, curr) => acc + curr.score, 0) /
									(leads.length || 1)
								).toFixed(0)}
								change="+2%"
								changeType="positive"
								icon={Clock}
								variant="default"
							/>
						</motion.div>

						<motion.div
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ delay: 0.2 }}
							className="glass-card p-4 mb-6"
						>
							<div className="flex flex-col md:flex-row gap-4">
								<div className="relative flex-1">
									<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
									<Input
										placeholder="Search leads..."
										className="pl-10 bg-muted/50 border-border"
										value={searchQuery} // [FIX]
										onChange={(e) => setSearchQuery(e.target.value)} // [FIX]
									/>
								</div>
								<div className="flex gap-2">
									{["All", "Qualified", "New", "Contacted"].map((f) => (
										<Button
											key={f}
											variant={
												activeFilter === f ? "default" : "ghost"
											}
											size="sm"
											onClick={() => setActiveFilter(f)}
											className={cn(
												activeFilter === f &&
												"bg-secondary text-secondary-foreground"
											)}
										>
											{f}
										</Button>
									))}
								</div>
							</div>
						</motion.div>

						<motion.div
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ delay: 0.3 }}
							className="grid md:grid-cols-2 gap-6"
						>
							{/* [FIX] Recent Leads List */}
							<div className="glass-card p-6">
								<h3 className="text-lg font-semibold text-foreground mb-4">
									Recent Leads
								</h3>
								<div className="space-y-3">
									{/* [FIX] Use filteredLeads */}
									{filteredLeads.slice(0, 5).map((user) => (
										<div
											key={user.id}
											className="flex items-center justify-between p-3 rounded-lg bg-muted/30"
										>
											<div>
												<p className="font-medium text-foreground">
													{user.name}
												</p>
												<p className="text-sm text-muted-foreground">
													{user.company}
												</p>
											</div>
											<span
												className={cn(
													"text-xs px-2 py-1 rounded-full",
													user.score > 70
														? "bg-green-500/20 text-green-600"
														: "bg-yellow-500/20 text-yellow-600"
												)}
											>
												Score: {user.score}
											</span>
										</div>
									))}
									{filteredLeads.length === 0 && (
										<p className="text-muted-foreground">
											No leads found.
										</p>
									)}
								</div>
							</div>

							{/* [FIX] Recent Calls List (Using same data for now as calls create leads) */}
							<div className="glass-card p-6">
								<h3 className="text-lg font-semibold text-foreground mb-4">
									Recent Activity
								</h3>
								<div className="space-y-3">
									{leads.slice(0, 5).map((call) => (
										<div
											key={call.id}
											className="flex items-center justify-between p-3 rounded-lg bg-muted/30"
										>
											<div>
												<p className="font-medium text-foreground">
													{call.summary
														? call.summary.substring(0, 40) + "..."
														: "Call Completed"}
												</p>
												<p className="text-sm text-muted-foreground">
													{new Date(call.last_contact).toLocaleDateString()}
												</p>
											</div>
										</div>
									))}
								</div>
							</div>
						</motion.div>
					</div>
				</div>
			</div>
		</AgentLayout>
	);
}
