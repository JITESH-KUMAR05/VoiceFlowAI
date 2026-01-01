import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Search } from "lucide-react";
import { AgentLayout } from "@/components/layout/AgentLayout";
import { CRMSidebar } from "@/components/crm/CRMSidebar";
import { UserCard } from "@/components/crm/UserCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export default function RealEstateUsers() {
	const [searchQuery, setSearchQuery] = useState("");
	const [activeFilter, setActiveFilter] = useState("All");
	const [users, setUsers] = useState<any[]>([]);

	useEffect(() => {
		fetch("http://localhost:8000/api/crm/leads?agent_type=real-estate")
			.then((res) => res.json())
			.then((data) => {
				const mappedUsers = data.map((lead: any) => ({
					id: lead.id,
					name: lead.name,
					email: lead.email,
					company: lead.company,
					role: "Lead",
					interestLevel:
						lead.score > 70
							? "high"
							: lead.score > 40
							? "medium"
							: "low",
					lastActive: new Date(lead.last_contact).toLocaleDateString(),
					avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${lead.name}`,
					location: "Unknown",
				}));
				setUsers(mappedUsers);
			})
			.catch((err) => console.error("Failed to fetch users", err));
	}, []);

	const filteredUsers = users.filter((user) => {
		const matchesSearch =
			(user.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
			(user.location || "").toLowerCase().includes(searchQuery.toLowerCase());
		if (activeFilter === "All") return matchesSearch;
		if (activeFilter === "High Interest")
			return matchesSearch && user.interestLevel === "high";
		if (activeFilter === "Medium")
			return matchesSearch && user.interestLevel === "medium";
		if (activeFilter === "Low") return matchesSearch && user.interestLevel === "low";
		return matchesSearch;
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
								Property Leads
							</h1>
							<p className="text-muted-foreground">
								View and manage all real estate leads
							</p>
						</motion.div>
						<motion.div
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ delay: 0.1 }}
							className="glass-card p-4 mb-6"
						>
							<div className="flex flex-col md:flex-row gap-4">
								<div className="relative flex-1">
									<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
									<Input
										placeholder="Search by name or location..."
										value={searchQuery}
										onChange={(e) => setSearchQuery(e.target.value)}
										className="pl-10 bg-muted/50 border-border"
									/>
								</div>
								<div className="flex gap-2">
									{["All", "High Interest", "Medium", "Low"].map((f) => (
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
						<div className="grid md:grid-cols-2 gap-4">
							{filteredUsers.map((user, index) => (
								<UserCard
									key={user.id}
									user={user}
									agentType="real-estate"
									index={index}
								/>
							))}
						</div>
						{filteredUsers.length === 0 && (
							<div className="glass-card p-12 text-center">
								<p className="text-muted-foreground">No leads found.</p>
							</div>
						)}
					</div>
				</div>
			</div>
		</AgentLayout>
	);
}
