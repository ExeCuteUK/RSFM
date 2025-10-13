import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import worldMapBg from "@assets/generated_images/Subtle_minimalist_world_map_080d0c3b.png";

export default function Login() {
  const [, setLocation] = useLocation();
  const { login, user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Check if registration is allowed
  const { data: registrationStatus } = useQuery<{ allowed: boolean }>({
    queryKey: ["/api/auth/registration-allowed"],
  });

  // Redirect if already logged in
  useEffect(() => {
    if (!authLoading && user) {
      setLocation("/");
    }
  }, [user, authLoading, setLocation]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      await login(username, password);
      toast({
        title: "Login successful",
        description: "Welcome back!",
      });
      // User state will update, triggering redirect via useEffect
    } catch (error) {
      toast({
        title: "Login failed",
        description: error instanceof Error ? error.message : "Invalid credentials",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div 
      className="flex items-center justify-center min-h-screen bg-white dark:bg-white bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: `url(${worldMapBg})` }}
    >
      <Card className="w-full max-w-md bg-white/75 dark:bg-white/75 backdrop-blur-sm border-gray-300 dark:border-gray-300 text-black dark:text-black">
        <CardHeader>
          <CardTitle className="text-black dark:text-black">Login</CardTitle>
          <CardDescription className="text-gray-600 dark:text-gray-600">Sign in to your R.S International Freight Manager account</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username" className="text-black dark:text-black">Username</Label>
              <Input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                disabled={isLoading}
                data-testid="input-username"
                className="bg-white dark:bg-white text-black dark:text-black border-gray-300 dark:border-gray-300"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-black dark:text-black">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
                data-testid="input-password"
                className="bg-white dark:bg-white text-black dark:text-black border-gray-300 dark:border-gray-300"
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading} data-testid="button-login">
              {isLoading ? "Logging in..." : "Login"}
            </Button>
            {registrationStatus?.allowed && (
              <div className="text-center text-sm text-muted-foreground">
                Don't have an account?{" "}
                <Button
                  type="button"
                  variant="link"
                  className="p-0 h-auto"
                  onClick={() => setLocation("/signup")}
                  data-testid="link-signup"
                >
                  Sign up
                </Button>
              </div>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
