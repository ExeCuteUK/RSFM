import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type User = {
  id: string;
  username: string;
  fullName?: string | null;
  email?: string | null;
  isAdmin: boolean;
};

export function OtherUsersMenu() {
  const { user: currentUser } = useAuth();
  const [, setLocation] = useLocation();

  const { data: allUsers = [] } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  if (!currentUser) {
    return null;
  }

  const otherUsers = allUsers.filter(u => u.id !== currentUser.id);

  const getInitials = (user: User) => {
    if (user.fullName) {
      return user.fullName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    }
    return user.username.slice(0, 2).toUpperCase();
  };

  const handleUserClick = (userId: string) => {
    setLocation(`/messages?userId=${userId}`);
  };

  if (otherUsers.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-2" data-testid="other-users-menu">
      {otherUsers.map((user) => (
        <Tooltip key={user.id}>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              className="relative h-9 w-9 rounded-full"
              onClick={() => handleUserClick(user.id)}
              data-testid={`button-user-${user.id}`}
            >
              <Avatar className="h-9 w-9 ring-2 ring-green-500">
                <AvatarFallback className="text-xs">
                  {getInitials(user)}
                </AvatarFallback>
              </Avatar>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
              <div>
                <p className="text-sm font-medium">{user.fullName || user.username}</p>
                {user.email && <p className="text-xs text-muted-foreground">{user.email}</p>}
                <p className="text-xs text-green-500">Online</p>
              </div>
            </div>
          </TooltipContent>
        </Tooltip>
      ))}
    </div>
  );
}
