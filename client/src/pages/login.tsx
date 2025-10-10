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
import rsSplash from "@assets/rs-splash_1760131711492.jpg";

export default function Login() {
  const [, setLocation] = useLocation();
  const { login, user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showSplash, setShowSplash] = useState(false);

  // Check if registration is allowed
  const { data: registrationStatus } = useQuery<{ allowed: boolean }>({
    queryKey: ["/api/auth/registration-allowed"],
  });

  // Redirect if already logged in (but not while showing splash)
  useEffect(() => {
    if (!authLoading && user && !showSplash) {
      setLocation("/");
    }
  }, [user, authLoading, showSplash, setLocation]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      await login(username, password);
      
      // Show splash screen
      setShowSplash(true);
      
      // Wait 3.5 seconds then navigate
      setTimeout(() => {
        toast({
          title: "Login successful",
          description: "Welcome back!",
        });
        setLocation("/");
      }, 3500);
    } catch (error) {
      toast({
        title: "Login failed",
        description: error instanceof Error ? error.message : "Invalid credentials",
        variant: "destructive",
      });
      setIsLoading(false);
      setShowSplash(false);
    }
  };

  return (
    <div 
      className="flex items-center justify-center min-h-screen bg-background bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: `url(${worldMapBg})` }}
    >
      <Card className="w-full max-w-md bg-card/25 backdrop-blur-sm border-card-border/50 relative overflow-hidden">
        {showSplash ? (
          <div className="flex items-center justify-center animate-in fade-in duration-500">
            <img 
              src={rsSplash} 
              alt="R.S International Freight Ltd" 
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          <>
            <CardHeader>
              <CardTitle>Login</CardTitle>
              <CardDescription>Sign in to your R.S International Freight Manager account</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    disabled={isLoading}
                    data-testid="input-username"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={isLoading}
                    data-testid="input-password"
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
          </>
        )}
      </Card>
    </div>
  );
}
