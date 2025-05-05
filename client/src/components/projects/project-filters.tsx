import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface ProjectFiltersProps {
  filters: {
    status: string;
    assignedTo: string;
    type: string;
    lastContacted: string;
  };
  onFilterChange: (filters: any) => void;
  teamMembers: any[];
}

export default function ProjectFilters({ filters, onFilterChange, teamMembers }: ProjectFiltersProps) {
  const handleFilterChange = (key: string, value: string) => {
    onFilterChange({
      ...filters,
      [key]: value,
    });
  };

  return (
    <div className="grid grid-cols-1 gap-4 mb-6 sm:grid-cols-2 lg:grid-cols-4">
      <div>
        <Label htmlFor="status-filter" className="block text-sm font-medium text-gray-700">
          Status
        </Label>
        <Select
          value={filters.status}
          onValueChange={(value) => handleFilterChange("status", value)}
        >
          <SelectTrigger id="status-filter" className="w-full mt-1">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="on-hold">On Hold</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="assigned-filter" className="block text-sm font-medium text-gray-700">
          Assigned To
        </Label>
        <Select
          value={filters.assignedTo}
          onValueChange={(value) => handleFilterChange("assignedTo", value)}
        >
          <SelectTrigger id="assigned-filter" className="w-full mt-1">
            <SelectValue placeholder="All Team Members" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Team Members</SelectItem>
            {teamMembers.map((member) => (
              <SelectItem key={member.id} value={member.id.toString()}>
                {member.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="type-filter" className="block text-sm font-medium text-gray-700">
          Type
        </Label>
        <Select
          value={filters.type}
          onValueChange={(value) => handleFilterChange("type", value)}
        >
          <SelectTrigger id="type-filter" className="w-full mt-1">
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="direct">Direct</SelectItem>
            <SelectItem value="affiliate">Affiliate</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="date-filter" className="block text-sm font-medium text-gray-700">
          Last Contacted
        </Label>
        <Select
          value={filters.lastContacted}
          onValueChange={(value) => handleFilterChange("lastContacted", value)}
        >
          <SelectTrigger id="date-filter" className="w-full mt-1">
            <SelectValue placeholder="All Time" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Time</SelectItem>
            <SelectItem value="today">Today</SelectItem>
            <SelectItem value="week">This Week</SelectItem>
            <SelectItem value="month">This Month</SelectItem>
            <SelectItem value="quarter">This Quarter</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
