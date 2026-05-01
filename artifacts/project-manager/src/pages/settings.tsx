import { useState } from "react";
import { Link } from "wouter";
import { format } from "date-fns";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  User,
  Briefcase,
  Mail,
  Calendar,
  LogOut,
  Shield,
  ShieldAlert
} from "lucide-react";
import { 
  useGetMe, getGetMeQueryKey,
  useLogout
} from "@workspace/api-client-react";
import { useAuth } from "@/hooks/use-auth";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

export default function Settings() {
  const { logout } = useAuth();
  const logoutMutation = useLogout();
  
  const { data: user, isLoading } = useGetMe({
    query: { queryKey: getGetMeQueryKey() }
  });

  const handleLogout = () => {
    logoutMutation.mutate(undefined, {
      onSettled: () => {
        logout();
        window.location.href = "/login";
      }
    });
  };

  if (isLoading) {
    return <div className="p-8">Loading...</div>;
  }

  if (!user) return null;

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-1">Manage your account and preferences.</p>
      </div>

      <div className="grid gap-8 md:grid-cols-3">
        <div className="md:col-span-1 space-y-4">
          <Card>
            <CardContent className="pt-6 flex flex-col items-center text-center">
              <Avatar className="h-24 w-24 mb-4 ring-4 ring-background">
                <AvatarFallback className="text-3xl bg-primary/10 text-primary font-medium">
                  {user.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <h2 className="text-xl font-bold">{user.name}</h2>
              <p className="text-sm text-muted-foreground mb-4">{user.email}</p>
              
              <Badge variant={user.role === "admin" ? "default" : "secondary"} className="uppercase text-xs font-semibold px-3 py-1">
                {user.role === "admin" ? (
                  <ShieldAlert className="w-3 h-3 mr-1.5" />
                ) : (
                  <User className="w-3 h-3 mr-1.5" />
                )}
                {user.role}
              </Badge>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-destructive flex items-center">
                Danger Zone
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button variant="outline" className="w-full text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive" onClick={handleLogout} disabled={logoutMutation.isPending}>
                <LogOut className="w-4 h-4 mr-2" />
                {logoutMutation.isPending ? "Logging out..." : "Log out of all devices"}
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>Personal details associated with your account.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-1">
                <div className="text-sm font-medium text-muted-foreground flex items-center">
                  <User className="w-4 h-4 mr-2" />
                  Full Name
                </div>
                <p className="text-base font-medium">{user.name}</p>
              </div>
              <Separator />
              <div className="space-y-1">
                <div className="text-sm font-medium text-muted-foreground flex items-center">
                  <Mail className="w-4 h-4 mr-2" />
                  Email Address
                </div>
                <p className="text-base font-medium">{user.email}</p>
              </div>
              <Separator />
              <div className="space-y-1">
                <div className="text-sm font-medium text-muted-foreground flex items-center">
                  <Briefcase className="w-4 h-4 mr-2" />
                  Role
                </div>
                <p className="text-base font-medium capitalize">{user.role}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {user.role === "admin" 
                    ? "You have full access to create projects and manage team members."
                    : "You can view projects you are a member of and manage your assigned tasks."}
                </p>
              </div>
              <Separator />
              <div className="space-y-1">
                <div className="text-sm font-medium text-muted-foreground flex items-center">
                  <Calendar className="w-4 h-4 mr-2" />
                  Member Since
                </div>
                <p className="text-base font-medium">
                  {format(new Date(user.createdAt), "MMMM d, yyyy")}
                </p>
              </div>
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
}
