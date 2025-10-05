import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { useEffect } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { apiRequest } from "@/lib/queryClient";

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

  const { data: onlineUserIds = [] } = useQuery<string[]>({
    queryKey: ["/api/presence/online-users"],
    refetchInterval: 10000, // Poll every 10 seconds
  });

  const heartbeatMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/presence/heartbeat"),
  });

  // Send heartbeat every 30 seconds
  useEffect(() => {
    if (!currentUser) return;

    // Send initial heartbeat
    heartbeatMutation.mutate();

    const interval = setInterval(() => {
      heartbeatMutation.mutate();
    }, 30000);

    return () => clearInterval(interval);
  }, [currentUser]);

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

  const isUserOnline = (userId: string) => onlineUserIds.includes(userId);

  return (
    <div className="flex items-center gap-2" data-testid="other-users-menu">
      {otherUsers.map((user) => {
        const online = isUserOnline(user.id);
        return (
          <Tooltip key={user.id}>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                className="relative h-9 w-9 rounded-full"
                onClick={() => handleUserClick(user.id)}
                data-testid={`button-user-${user.id}`}
              >
                <Avatar className={`h-9 w-9 ${online ? 'ring-2 ring-green-500' : ''}`}>
                  <AvatarFallback className="text-xs">
                    {getInitials(user)}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <div className="flex items-center gap-2">
                {online && <div className="w-2 h-2 rounded-full bg-green-500"></div>}
                <div>
                  <p className="text-sm font-medium">{user.fullName || user.username}</p>
                  {user.email && <p className="text-xs text-muted-foreground">{user.email}</p>}
                  {online && <p className="text-xs text-green-500">Online</p>}
                </div>
              </div>
            </TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );
}
