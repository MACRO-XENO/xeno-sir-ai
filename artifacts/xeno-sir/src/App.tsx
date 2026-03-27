import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/use-api-hooks";
import { Layout } from "@/components/layout";
import { Loader2 } from "lucide-react";

import Login from "@/pages/login";
import StudentChat from "@/pages/student/chat";
import StudentExam from "@/pages/student/exam";
import AdminDashboard from "@/pages/admin/dashboard";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient();

// Route Guards
function ProtectedRoute({ component: Component, role }: { component: any, role?: "admin" | "student" }) {
  const { user, isLoading, isAuthenticated } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Redirect to="/login" />;
  }

  if (role && user.role !== role) {
    return <Redirect to={user.role === "admin" ? "/admin" : "/"} />;
  }

  // Prevent student from accessing login page if already logged in
  if (window.location.pathname === "/login") {
     return <Redirect to={user.role === "admin" ? "/admin" : "/"} />;
  }

  return (
    <Layout>
      <Component />
    </Layout>
  );
}

function Router() {
  const { isAuthenticated, user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <Switch>
      <Route path="/login">
        {isAuthenticated ? <Redirect to={user?.role === "admin" ? "/admin" : "/"} /> : <Login />}
      </Route>
      
      {/* Student Routes */}
      <Route path="/">
        <ProtectedRoute component={StudentChat} role="student" />
      </Route>
      <Route path="/exam">
        <ProtectedRoute component={StudentExam} role="student" />
      </Route>

      {/* Admin Routes */}
      <Route path="/admin">
        <ProtectedRoute component={AdminDashboard} role="admin" />
      </Route>
      <Route path="/admin/lectures">
        <ProtectedRoute component={AdminDashboard} role="admin" />
      </Route>
      <Route path="/admin/students">
        <ProtectedRoute component={AdminDashboard} role="admin" />
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
